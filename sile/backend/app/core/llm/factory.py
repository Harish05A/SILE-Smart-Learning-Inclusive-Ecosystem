from typing import Any, Optional
from app.core.config import settings
from app.core.llm.base import BaseLLMProvider, LLMConfigurationException
from app.core.llm.mock_provider import MockLLMProvider
from app.core.llm.gemini_provider import GeminiProvider


def get_llm_provider(
    provider_name: Optional[str] = None,
    **kwargs: Any
) -> BaseLLMProvider:
    """
    Factory function to retrieve the configured LLM provider instance.

    :param provider_name: Explicit provider name ('mock' or 'gemini').
                          If None, reads from settings.LLM_PROVIDER (defaults to 'mock').
    :param kwargs: Additional kwargs passed to the provider constructor.
    :return: An instance of BaseLLMProvider.
    :raises LLMConfigurationException: If provider is unknown or required configs are missing.
    """
    selected_provider = (provider_name or settings.LLM_PROVIDER or "mock").strip().lower()

    if selected_provider == "mock":
        return MockLLMProvider(**kwargs)

    elif selected_provider == "gemini":
        api_key = kwargs.pop("api_key", None) or settings.GEMINI_API_KEY
        model = kwargs.pop("model", None) or settings.GEMINI_MODEL
        if not api_key:
            raise LLMConfigurationException(
                "Gemini API key is required when LLM_PROVIDER is 'gemini'. "
                "Please configure GEMINI_API_KEY in your environment or settings."
            )
        return GeminiProvider(api_key=api_key, model=model, **kwargs)

    else:
        raise LLMConfigurationException(
            f"Unsupported LLM provider: '{selected_provider}'. "
            f"Supported providers are: 'mock', 'gemini'."
        )
