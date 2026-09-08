import json
import re
from typing import Any, Dict, Optional, Type, TypeVar
import httpx
from pydantic import BaseModel, ValidationError

from app.core.llm.base import (
    BaseLLMProvider,
    LLMConfigurationException,
    LLMProviderException,
    LLMTimeoutException,
    LLMValidationException,
)

T = TypeVar("T", bound=BaseModel)


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini Provider for structured LLM generation.
    Communicates with the Google Generative Language API via async HTTP requests
    and enforces Pydantic schema validation on all outputs.
    """

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gemini-1.5-flash",
        timeout: float = 30.0,
        http_client: Optional[httpx.AsyncClient] = None
    ):
        self.api_key = api_key
        self.model = model or "gemini-1.5-flash"
        self.timeout = timeout
        self._http_client = http_client

        if not self.api_key:
            raise LLMConfigurationException(
                "Gemini API key is missing. Please set GEMINI_API_KEY in your environment variables or config."
            )

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_schema: Type[T],
        temperature: float = 0.2,
        **kwargs: Any
    ) -> T:
        """
        Generate structured output from Gemini validated against the provided Pydantic model.
        """
        if not self.api_key:
            raise LLMConfigurationException("Gemini API key is not configured.")

        # Prepare JSON schema instruction
        json_schema = json.dumps(response_schema.model_json_schema(), indent=2)
        system_instruction = (
            f"{system_prompt}\n\n"
            f"You MUST respond ONLY with valid JSON conforming to the following JSON schema:\n"
            f"```json\n{json_schema}\n```\n"
            f"Do NOT include markdown formatting outside the JSON object or any other explanation."
        )

        request_body: Dict[str, Any] = {
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}]
                }
            ],
            "generationConfig": {
                "temperature": temperature,
                "responseMimeType": "application/json"
            }
        }

        endpoint = f"{self.BASE_URL}/{self.model}:generateContent"
        params = {"key": self.api_key}

        # Make async HTTP call
        client = self._http_client or httpx.AsyncClient(timeout=self.timeout)
        try:
            response = await client.post(endpoint, params=params, json=request_body)
            response.raise_for_status()
            response_json = response.json()
        except httpx.TimeoutException as e:
            raise LLMTimeoutException(
                f"Gemini API request timed out after {self.timeout}s: {str(e)}",
                details={"timeout": self.timeout, "model": self.model}
            )
        except httpx.HTTPStatusError as e:
            raise LLMProviderException(
                f"Gemini API returned error {e.response.status_code}: {e.response.text}",
                status_code=e.response.status_code,
                details={"response_body": e.response.text}
            )
        except httpx.RequestError as e:
            raise LLMProviderException(
                f"Failed to communicate with Gemini API: {str(e)}",
                details={"error": str(e)}
            )
        finally:
            if self._http_client is None:
                await client.aclose()

        # Extract text content from Gemini response
        raw_text = self._extract_text_from_response(response_json)
        
        # Parse and clean JSON
        parsed_json = self._parse_json(raw_text)

        # Validate with Pydantic schema
        try:
            return response_schema.model_validate(parsed_json)
        except ValidationError as e:
            raise LLMValidationException(
                f"Gemini output failed schema validation for {response_schema.__name__}: {str(e)}",
                details={"validation_errors": e.errors(), "raw_response": raw_text}
            )

    def _extract_text_from_response(self, response_json: Dict[str, Any]) -> str:
        """Extract candidate text content from the Gemini response structure."""
        candidates = response_json.get("candidates", [])
        if not candidates:
            raise LLMProviderException(
                "Gemini API returned an empty candidate list",
                details={"raw_response": response_json}
            )

        candidate = candidates[0]
        finish_reason = candidate.get("finishReason")
        if finish_reason and finish_reason not in ("STOP", None):
            raise LLMProviderException(
                f"Gemini generation stopped unexpectedly with reason: {finish_reason}",
                details={"finish_reason": finish_reason, "candidate": candidate}
            )

        content = candidate.get("content", {})
        parts = content.get("parts", [])
        if not parts:
            raise LLMProviderException(
                "Gemini candidate contains no content parts",
                details={"candidate": candidate}
            )

        return parts[0].get("text", "").strip()

    def _parse_json(self, raw_text: str) -> Any:
        """Extract and parse JSON from the model response text, removing markdown code fences if present."""
        if not raw_text:
            raise LLMValidationException("Received empty text response from Gemini")

        # Strip markdown code blocks if wrapped
        text = raw_text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
            text = re.sub(r"\s*```$", "", text)
            text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Fallback: attempt to find the outer-most JSON object or array
            match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except json.JSONDecodeError as e:
                    raise LLMValidationException(
                        f"Failed to parse JSON substring from Gemini response: {str(e)}",
                        details={"raw_text": raw_text}
                    )
            raise LLMValidationException(
                "Could not extract valid JSON from Gemini response",
                details={"raw_text": raw_text}
            )
