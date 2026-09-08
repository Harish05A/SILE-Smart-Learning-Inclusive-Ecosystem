import enum
import typing
from datetime import datetime, date
from uuid import UUID
from typing import Any, Dict, List, Optional, Type, TypeVar, Union, get_args, get_origin
from pydantic import BaseModel, ValidationError
from pydantic_core import PydanticUndefined

from app.core.llm.base import BaseLLMProvider, LLMValidationException

T = TypeVar("T", bound=BaseModel)


class MockLLMProvider(BaseLLMProvider):
    """
    Offline, deterministic Mock LLM Provider.
    Generates valid mock responses conforming to any requested Pydantic response schema
    without requiring internet access or API credentials.
    """

    def __init__(self, preset_responses: Optional[Dict[str, Any]] = None):
        """
        :param preset_responses: Optional mapping of schema names or query substrings
                                 to predefined dictionary responses or Pydantic models.
        """
        self.preset_responses = preset_responses or {}
        self.call_history: List[Dict[str, Any]] = []

    def set_mock_response(self, key: str, response: Union[Dict[str, Any], BaseModel]) -> None:
        """Set a preset mock response keyed by schema name or prompt keyword."""
        self.preset_responses[key] = response

    def clear_history(self) -> None:
        """Clear recorded LLM invocations."""
        self.call_history.clear()

    async def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_schema: Type[T],
        temperature: float = 0.2,
        **kwargs: Any
    ) -> T:
        """
        Synthesize or return preset structured mock output adhering to response_schema.
        """
        # Record invocation for verification in testing
        self.call_history.append({
            "system_prompt": system_prompt,
            "user_prompt": user_prompt,
            "response_schema": response_schema.__name__,
            "temperature": temperature,
            "kwargs": kwargs
        })

        schema_name = response_schema.__name__

        # 1. Check if a preset mock exists for this schema or prompt
        preset = self.preset_responses.get(schema_name)
        if preset is None:
            # Check prompt substring matches
            for key, val in self.preset_responses.items():
                if key in user_prompt or key in system_prompt:
                    preset = val
                    break

        if preset is not None:
            try:
                if isinstance(preset, response_schema):
                    return preset
                elif isinstance(preset, dict):
                    return response_schema.model_validate(preset)
                elif isinstance(preset, BaseModel):
                    return response_schema.model_validate(preset.model_dump())
                else:
                    return response_schema.model_validate(preset)
            except ValidationError as e:
                raise LLMValidationException(
                    f"Preset mock data validation failed for schema {schema_name}",
                    details={"validation_errors": e.errors()}
                )

        # 2. Automatically generate synthetic data conforming to response_schema
        try:
            synthetic_data = self._generate_synthetic_dict(response_schema)
            return response_schema.model_validate(synthetic_data)
        except ValidationError as e:
            raise LLMValidationException(
                f"Generated mock data failed validation for schema {schema_name}",
                details={"validation_errors": e.errors()}
            )

    def _generate_synthetic_dict(self, model_class: Type[BaseModel]) -> Dict[str, Any]:
        """Recursively inspect model fields and generate valid placeholder data."""
        data = {}
        for field_name, field_info in model_class.model_fields.items():
            # If a default value is present and valid, we can consider using it
            if field_info.default is not PydanticUndefined and field_info.default is not None:
                data[field_name] = field_info.default
                continue
            elif field_info.default_factory is not None:
                data[field_name] = field_info.default_factory()
                continue

            annotation = field_info.annotation
            data[field_name] = self._synthesize_value_for_type(annotation, field_name)

        return data

    def _synthesize_value_for_type(self, annotation: Any, field_name: str) -> Any:
        """Generate a realistic mock value based on the field type annotation."""
        if annotation is None:
            return None

        origin = get_origin(annotation)
        args = get_args(annotation)

        # Handle Optional / Union
        if origin is Union:
            # Pick the first non-None type
            non_none_args = [arg for arg in args if arg is not type(None)]
            if non_none_args:
                return self._synthesize_value_for_type(non_none_args[0], field_name)
            return None

        # Handle List / Sequence / Set
        if origin in (list, List, set, typing.Sequence):
            item_type = args[0] if args else str
            return [self._synthesize_value_for_type(item_type, field_name)]

        # Handle Dict / Mapping
        if origin in (dict, Dict, typing.Mapping):
            val_type = args[1] if len(args) > 1 else str
            return {"sample_key": self._synthesize_value_for_type(val_type, "sample_key")}

        # Handle nested BaseModel
        if isinstance(annotation, type) and issubclass(annotation, BaseModel):
            return self._generate_synthetic_dict(annotation)

        # Handle Enums
        if isinstance(annotation, type) and issubclass(annotation, enum.Enum):
            enum_members = list(annotation)
            return enum_members[0].value if enum_members else ""

        # Handle primitive types
        if annotation is str:
            readable_name = field_name.replace("_", " ").title()
            return f"Mock {readable_name}"
        elif annotation is int:
            return 1
        elif annotation is float:
            return 0.85
        elif annotation is bool:
            return True
        elif annotation is datetime:
            return datetime.utcnow()
        elif annotation is date:
            return date.today()
        elif annotation is UUID:
            return "11111111-1111-1111-1111-111111111111"
        elif annotation is Any:
            return f"Mock {field_name}"

        return f"Mock {field_name}"
