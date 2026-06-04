import re
from typing import List, Dict, Tuple
from difflib import SequenceMatcher

from src.models.lookups import Technology
from src.services.lookups_service import LookupsService


class TechMatch:
    """Represents a matched technology with confidence score"""
    def __init__(self, technology: Technology, confidence: float):
        self.technology = technology
        self.confidence = confidence

    def __repr__(self) -> str:
        return f"TechMatch({self.technology.name}, {self.confidence:.2%})"


class TechExtractorService:
    # Confidence thresholds
    EXACT_MATCH_CONFIDENCE = 1.0
    FUZZY_MATCH_THRESHOLD = 0.85
    MIN_CONFIDENCE = 0.85

    def __init__(self, lookups_service: LookupsService):
        self.lookups_service = lookups_service
        self._tech_cache: Dict[str, Technology] = {}
        self._tech_names_lower: List[str] = []

    async def _ensure_tech_cache(self) -> None:
        """Lazy load all technologies from database"""
        if not self._tech_cache:
            technologies = await self.lookups_service.get_all(Technology)
            # Build cache: normalized_name -> Technology
            for tech in technologies:
                normalized_name = tech.name.lower().strip()
                self._tech_cache[normalized_name] = tech
                self._tech_names_lower.append(normalized_name)

    def _extract_words_from_text(self, text: str) -> List[str]:
        """
        Extract candidate technology words from CV text.
        Returns list of words (lowercase) that could be technologies.
        """
        # Convert to lowercase and remove extra whitespace
        text_lower = text.lower()
        
        # Split by non-alphanumeric characters, keeping dots for versions (e.g., "3.10")
        # Pattern: sequence of alphanumeric, dots, dashes, underscores
        words = re.findall(r'[a-z0-9._\-\+]+', text_lower)
        
        # Filter out overly short words (< 2 chars) and numeric-only
        candidates = [
            word for word in words 
            if len(word) >= 2 and not word.isdigit()
        ]
        
        return candidates

    def _exact_match(self, candidate_word: str) -> Tuple[Technology, float] | None:
        """
        Try exact case-insensitive match against known technologies.
        Returns (Technology, confidence) or None.
        """
        normalized = candidate_word.lower().strip()
        
        if normalized in self._tech_cache:
            return self._tech_cache[normalized], self.EXACT_MATCH_CONFIDENCE
        
        return None

    def _fuzzy_match(self, candidate_word: str) -> Tuple[Technology, float] | None:
        """
        Try fuzzy matching using sequence matching (Levenshtein-like).
        Returns best match above threshold, or None.
        """
        candidate_lower = candidate_word.lower().strip()
        best_match: Tuple[Technology, float] | None = None
        best_ratio = 0.0

        for tech_name_lower in self._tech_names_lower:
            # Calculate similarity ratio
            ratio = SequenceMatcher(None, candidate_lower, tech_name_lower).ratio()
            
            if ratio > best_ratio:
                best_ratio = ratio
                best_match = (self._tech_cache[tech_name_lower], ratio)

        # Return only if above fuzzy threshold
        if best_match and best_ratio >= self.FUZZY_MATCH_THRESHOLD:
            return best_match

        return None

    def _match_word(self, candidate_word: str) -> TechMatch | None:
        """
        Try to match a word to a technology.
        First tries exact match, then fuzzy match.
        Returns TechMatch if found and above MIN_CONFIDENCE threshold, else None.
        """
        # Try exact match first
        exact_result = self._exact_match(candidate_word)
        if exact_result:
            tech, confidence = exact_result
            return TechMatch(tech, confidence)

        # Try fuzzy match
        fuzzy_result = self._fuzzy_match(candidate_word)
        if fuzzy_result:
            tech, confidence = fuzzy_result
            if confidence >= self.MIN_CONFIDENCE:
                return TechMatch(tech, confidence)

        return None

    async def extract_technologies(self, cv_text: str) -> List[Technology]:
        """
        Extract technologies from CV text.
        
        Returns list of unique Technology objects found in CV text,
        filtered by confidence threshold (>= 85%).
        
        Duplicates are removed (by technology.id).
        """
        # Ensure cache is populated
        await self._ensure_tech_cache()

        # Extract candidate words from CV
        candidates = self._extract_words_from_text(cv_text)

        # Match each candidate
        matched_techs_dict: Dict[str, Technology] = {}  # Use dict to deduplicate by tech.id
        
        for candidate in candidates:
            match = self._match_word(candidate)
            if match:
                # Store by tech.id to avoid duplicates
                matched_techs_dict[str(match.technology.id)] = match.technology

        # Return as list in any order (duplicates already removed by dict)
        return list(matched_techs_dict.values())

    