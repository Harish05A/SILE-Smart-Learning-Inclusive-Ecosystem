from typing import Any, Dict, Optional


class SileException(Exception):
    """Base exception for all SILE domain errors."""
    def __init__(self, message: str, status_code: int = 400, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class EntityNotFoundException(SileException):
    def __init__(self, entity_name: str, identifier: Any):
        super().__init__(
            message=f"{entity_name} with identifier '{identifier}' not found.",
            status_code=404
        )


ResourceNotFoundException = EntityNotFoundException


class AuthenticationFailedException(SileException):
    def __init__(self, message: str = "Invalid email or password"):
        super().__init__(message=message, status_code=401)


class ForbiddenOperationException(SileException):
    def __init__(self, message: str = "You do not have permission to perform this action"):
        super().__init__(message=message, status_code=403)


class ConflictException(SileException):
    def __init__(self, message: str):
        super().__init__(message=message, status_code=409)


class ValidationException(SileException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=422, details=details)
