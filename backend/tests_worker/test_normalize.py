import pytest
from worker.normalize import normalize_string, normalize_strings

def test_normalize_string():
    mapping = {
        r'python': "Python",
        r'java(script)?': "JavaScript/Java",
    }
    
    assert normalize_string("python", mapping) == "Python"
    assert normalize_string("PYTHON", mapping) == "Python"
    assert normalize_string("javascript", mapping) == "JavaScript/Java"
    assert normalize_string("java", mapping) == "JavaScript/Java"
    assert normalize_string("c++", mapping) == "c++"  # No match, should strip
    assert normalize_string("  c++  ", mapping) == "c++"

def test_normalize_strings():
    mapping = {
        r'react': "React",
        r'node': "Node.js",
    }
    
    input_strings = ["reactjs", "nodejs", "python", "  react  "]
    # normalize_strings should match regex, strip, and return unique values
    result = normalize_strings(input_strings, mapping)
    
    assert "React" in result
    assert "Node.js" in result
    assert "python" in result
    assert len(result) == 3
