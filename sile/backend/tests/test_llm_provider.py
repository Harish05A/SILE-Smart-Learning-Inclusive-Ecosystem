import pytest
import httpx
from typing import List, Optional
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.llm import (
    BaseLLMProvider,
    MockLLMProvider,
    GeminiProvider,
    get_llm_provider,
    LLMConfigurationException,
    LLMProviderException,
    LLMValidationException,
    LLMTimeoutException,
)


class SampleRecommendationSchema(BaseModel):
    title: str = Field(description="Title of recommendation")
    difficulty: str = Field(description="Difficulty level")
    confidence_score: float = Field(ge=0.0, le=1.0)
    tags: List[str] = Field(default_factory=list)
    notes: Optional[str] = None


class NestedItemSchema(BaseModel):
    item_id: str
    score: int


class ComplexSchema(BaseModel):
    learner_id: str
    items: List[NestedItemSchema]
    is_active: bool


@pytest.mark.asyncio
async def test_mock_provider_structured_generation():
    """Test that MockLLMProvider generates valid structured Pydantic objects offline."""
    provider = MockLLMProvider()

    result = await provider.generate_structured(
        system_prompt="You are an adaptive curriculum specialist.",
        user_prompt="Recommend next topic for learner with 45% mastery in fractions.",
        response_schema=SampleRecommendationSchema,
        temperature=0.3
    )

    assert isinstance(result, SampleRecommendationSchema)
    assert isinstance(result.title, str)
    assert isinstance(result.difficulty, str)
    assert 0.0 <= result.confidence_score <= 1.0
    assert isinstance(result.tags, list)
    assert len(provider.call_history) == 1
    assert provider.call_history[0]["response_schema"] == "SampleRecommendationSchema"


@pytest.mark.asyncio
async def test_mock_provider_complex_nested_schema():
    """Test that MockLLMProvider handles complex nested models."""
    provider = MockLLMProvider()

    result = await provider.generate_structured(
        system_prompt="System instructions",
        user_prompt="Analyze student progress",
        response_schema=ComplexSchema
    )

    assert isinstance(result, ComplexSchema)
    assert isinstance(result.learner_id, str)
    assert isinstance(result.items, list)
    assert len(result.items) > 0
    assert isinstance(result.items[0], NestedItemSchema)
    assert isinstance(result.items[0].score, int)
    assert isinstance(result.is_active, bool)


@pytest.mark.asyncio
async def test_mock_provider_preset_responses():
    """Test that MockLLMProvider returns preset responses when provided."""
    provider = MockLLMProvider()
    preset = SampleRecommendationSchema(
        title="Algebra Foundations",
        difficulty="beginner",
        confidence_score=0.95,
        tags=["math", "intro"]
    )
    provider.set_mock_response("SampleRecommendationSchema", preset)

    result = await provider.generate_structured(
        system_prompt="Test system",
        user_prompt="Test user",
        response_schema=SampleRecommendationSchema
    )

    assert result.title == "Algebra Foundations"
    assert result.difficulty == "beginner"
    assert result.confidence_score == 0.95
    assert result.tags == ["math", "intro"]


@pytest.mark.asyncio
async def test_mock_provider_invalid_preset_raises_validation_exception():
    """Test that an invalid preset dictionary triggers LLMValidationException."""
    provider = MockLLMProvider()
    # confidence_score violates ge=0.0, le=1.0 or wrong type
    provider.set_mock_response("SampleRecommendationSchema", {"title": "Test", "confidence_score": 5.0})

    with pytest.raises(LLMValidationException) as exc_info:
        await provider.generate_structured(
            system_prompt="Test",
            user_prompt="Test",
            response_schema=SampleRecommendationSchema
        )
    assert "validation" in str(exc_info.value).lower()


def test_factory_default_provider():
    """Test that get_llm_provider returns MockLLMProvider by default."""
    provider = get_llm_provider()
    assert isinstance(provider, MockLLMProvider)
    assert isinstance(provider, BaseLLMProvider)


def test_factory_explicit_mock():
    """Test explicit selection of mock provider."""
    provider = get_llm_provider(provider_name="mock")
    assert isinstance(provider, MockLLMProvider)


def test_factory_gemini_with_key():
    """Test factory creates GeminiProvider when key is provided."""
    provider = get_llm_provider(
        provider_name="gemini",
        api_key="test_fake_api_key",
        model="gemini-1.5-pro"
    )
    assert isinstance(provider, GeminiProvider)
    assert provider.api_key == "test_fake_api_key"
    assert provider.model == "gemini-1.5-pro"


def test_factory_missing_gemini_key():
    """Test factory raises LLMConfigurationException when Gemini API key is missing."""
    original_key = settings.GEMINI_API_KEY
    try:
        settings.GEMINI_API_KEY = None
        with pytest.raises(LLMConfigurationException) as exc_info:
            get_llm_provider(provider_name="gemini")
        assert "gemini api key is required" in str(exc_info.value).lower()
    finally:
        settings.GEMINI_API_KEY = original_key


def test_factory_invalid_provider():
    """Test factory raises LLMConfigurationException for unsupported providers."""
    with pytest.raises(LLMConfigurationException) as exc_info:
        get_llm_provider(provider_name="openai")
    assert "unsupported llm provider" in str(exc_info.value).lower()

    with pytest.raises(LLMConfigurationException) as exc_info:
        get_llm_provider(provider_name="anthropic")
    assert "unsupported llm provider" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_gemini_provider_successful_generation():
    """Test GeminiProvider handles successful structured JSON generation with HTTP client mock."""
    mock_response_json = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": (
                                '```json\n'
                                '{\n'
                                '  "title": "Fractions Mastery",\n'
                                '  "difficulty": "developing",\n'
                                '  "confidence_score": 0.88,\n'
                                '  "tags": ["math", "fractions"],\n'
                                '  "notes": "Good progress"\n'
                                '}\n'
                                '```'
                            )
                        }
                    ]
                },
                "finishReason": "STOP"
            }
        ]
    }

    transport = httpx.MockTransport(
        lambda request: httpx.Response(200, json=mock_response_json)
    )
    async with httpx.AsyncClient(transport=transport) as client:
        provider = GeminiProvider(
            api_key="test_api_key",
            model="gemini-1.5-flash",
            http_client=client
        )

        result = await provider.generate_structured(
            system_prompt="Test system prompt",
            user_prompt="Test user prompt",
            response_schema=SampleRecommendationSchema
        )

        assert isinstance(result, SampleRecommendationSchema)
        assert result.title == "Fractions Mastery"
        assert result.difficulty == "developing"
        assert result.confidence_score == 0.88
        assert result.tags == ["math", "fractions"]
        assert result.notes == "Good progress"


@pytest.mark.asyncio
async def test_gemini_provider_http_error():
    """Test GeminiProvider raises LLMProviderException on HTTP 403/500 error."""
    transport = httpx.MockTransport(
        lambda request: httpx.Response(403, text="Forbidden: Invalid API key")
    )
    async with httpx.AsyncClient(transport=transport) as client:
        provider = GeminiProvider(
            api_key="invalid_key",
            http_client=client
        )

        with pytest.raises(LLMProviderException) as exc_info:
            await provider.generate_structured(
                system_prompt="System",
                user_prompt="User",
                response_schema=SampleRecommendationSchema
            )
        assert "403" in str(exc_info.value)


@pytest.mark.asyncio
async def test_gemini_provider_timeout():
    """Test GeminiProvider raises LLMTimeoutException on timeout."""
    def timeout_handler(request):
        raise httpx.TimeoutException("Read timeout")

    transport = httpx.MockTransport(timeout_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        provider = GeminiProvider(
            api_key="test_key",
            timeout=5.0,
            http_client=client
        )

        with pytest.raises(LLMTimeoutException):
            await provider.generate_structured(
                system_prompt="System",
                user_prompt="User",
                response_schema=SampleRecommendationSchema
            )


@pytest.mark.asyncio
async def test_gemini_provider_malformed_json_response():
    """Test GeminiProvider raises LLMValidationException on unparseable JSON."""
    mock_response_json = {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": "Not a valid JSON document at all!"}]
                },
                "finishReason": "STOP"
            }
        ]
    }

    transport = httpx.MockTransport(
        lambda request: httpx.Response(200, json=mock_response_json)
    )
    async with httpx.AsyncClient(transport=transport) as client:
        provider = GeminiProvider(
            api_key="test_key",
            http_client=client
        )

        with pytest.raises(LLMValidationException) as exc_info:
            await provider.generate_structured(
                system_prompt="System",
                user_prompt="User",
                response_schema=SampleRecommendationSchema
            )
        assert "json" in str(exc_info.value).lower()


@pytest.mark.asyncio
async def test_gemini_provider_schema_validation_failure():
    """Test GeminiProvider raises LLMValidationException when JSON does not match Pydantic schema."""
    # confidence_score is 1.5 which violates le=1.0, title is missing
    mock_response_json = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": '{"confidence_score": 1.5, "tags": "invalid_tags_type"}'
                        }
                    ]
                },
                "finishReason": "STOP"
            }
        ]
    }

    transport = httpx.MockTransport(
        lambda request: httpx.Response(200, json=mock_response_json)
    )
    async with httpx.AsyncClient(transport=transport) as client:
        provider = GeminiProvider(
            api_key="test_key",
            http_client=client
        )

        with pytest.raises(LLMValidationException) as exc_info:
            await provider.generate_structured(
                system_prompt="System",
                user_prompt="User",
                response_schema=SampleRecommendationSchema
            )
        assert "schema validation" in str(exc_info.value).lower()
