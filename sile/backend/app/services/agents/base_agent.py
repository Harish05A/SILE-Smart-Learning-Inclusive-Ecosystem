from abc import ABC
from typing import Any, Optional, Type, TypeVar
from pydantic import BaseModel

from app.core.llm import BaseLLMProvider, get_llm_provider
from app.models.agents import AgentName

T = TypeVar("T", bound=BaseModel)


class BaseAgent(ABC):
    """
    Abstract Base Class for specialized AI agents in SILE.
    Provides common LLM provider access, structured schema execution, and uniform interfaces.
    """

    def __init__(
        self,
        name: AgentName,
        system_prompt: str,
        llm_provider: Optional[BaseLLMProvider] = None,
    ):
        self.name = name
        self.system_prompt = system_prompt
        self.llm_provider = llm_provider or get_llm_provider()

    async def execute_structured(
        self,
        user_prompt: str,
        response_schema: Type[T],
        temperature: float = 0.2,
        **kwargs: Any
    ) -> T:
        """
        Execute LLM generation enforcing the specified Pydantic response schema.
        """
        return await self.llm_provider.generate_structured(
            system_prompt=self.system_prompt,
            user_prompt=user_prompt,
            response_schema=response_schema,
            temperature=temperature,
            **kwargs
        )
