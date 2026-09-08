from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Type, TypeVar
from pydantic import BaseModel
from app.core.exceptions import SileException

T = TypeVar("T", bound=BaseModel)


class LLMException(SileException):
    """Base exception for all LLM-related errors."""
    def __init__(self, message: str, status_code: int = 500, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status_code, details=details)


class LLMConfigurationException(LLMException):
    """Raised when LLM configuration is missing or invalid."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=500, details=details)


class LLMProviderException(LLMException):
    """Raised when an external LLM API fails or returns an error."""
    def __init__(self, message: str, status_code: int = 502, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status_code, details=details)


class LLMValidationException(LLMException):
    """Raised when LLM output does not match expected Pydantic schema."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=422, details=details)


class LLMTimeoutException(LLMException):
    """Raised when an LLM provider request times out."""
    def __init__(self, message: str = "LLM request timed out", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=504, details=details)


class BaseLLMProvider(ABC):
    """
    Abstract Base Class for provider-agnostic LLM interactions in SILE.
    Ensures all interactions are structured and validated against Pydantic models.
    """

    @abstractmethod
    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_schema: Type[T],
        temperature: float = 0.2,
        **kwargs: Any
    ) -> T:
        """
        Generate structured output adhering to the provided Pydantic response schema.

        :param system_prompt: System instructions specifying role, behavior, and output format.
        :param user_prompt: User/context prompt containing the actual query or data.
        :param response_schema: Expected Pydantic model class for the output.
        :param temperature: Generation randomness (0.0 to 1.0).
        :param kwargs: Additional provider-specific kwargs.
        :return: Validated instance of response_schema (T).
        """
        pass
