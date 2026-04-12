
class DiscardException(Exception):
    """Base exception for discard-related errors."""
    pass

class RecordNotFoundError(DiscardException):
    pass

class RecordAlreadyExistsError(DiscardException):
    pass