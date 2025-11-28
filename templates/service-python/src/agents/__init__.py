"""
AI Agents
=========

Agent implementation with multi-provider support.
"""

from abc import ABC, abstractmethod
from typing import Any

import structlog
from anthropic import Anthropic
from openai import OpenAI

from src.config import settings
from src.models import AgentConfig, Message, MessageRole, ToolCall, ToolResult
from src.tools import get_tool, get_tool_definitions

logger = structlog.get_logger()


# =============================================================================
# AI PROVIDER ABSTRACTION
# =============================================================================


class AIProvider(ABC):
    """Abstract base class for AI providers."""

    @abstractmethod
    async def complete(
        self,
        messages: list[Message],
        system_prompt: str,
        tools: list[dict[str, Any]] | None = None,
        **kwargs: Any,
    ) -> Message:
        """Generate a completion."""
        pass


class AnthropicProvider(AIProvider):
    """Anthropic Claude provider."""

    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.client = Anthropic(api_key=api_key or settings.anthropic_api_key)
        self.model = model or settings.anthropic_model

    async def complete(
        self,
        messages: list[Message],
        system_prompt: str,
        tools: list[dict[str, Any]] | None = None,
        **kwargs: Any,
    ) -> Message:
        # Convert messages to Anthropic format
        anthropic_messages = [
            {"role": msg.role.value, "content": msg.content}
            for msg in messages
            if msg.role in (MessageRole.USER, MessageRole.ASSISTANT)
        ]

        # Build request
        request_kwargs: dict[str, Any] = {
            "model": self.model,
            "max_tokens": kwargs.get("max_tokens", 4096),
            "system": system_prompt,
            "messages": anthropic_messages,
        }

        if tools:
            request_kwargs["tools"] = tools

        if "temperature" in kwargs:
            request_kwargs["temperature"] = kwargs["temperature"]

        # Make request
        response = self.client.messages.create(**request_kwargs)

        # Parse response
        content = ""
        tool_calls = []

        for block in response.content:
            if block.type == "text":
                content = block.text
            elif block.type == "tool_use":
                tool_calls.append(
                    ToolCall(
                        id=block.id,
                        name=block.name,
                        arguments=block.input,  # type: ignore
                    )
                )

        return Message(
            role=MessageRole.ASSISTANT,
            content=content,
            tool_calls=tool_calls if tool_calls else None,
            metadata={
                "model": self.model,
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            },
        )


class OpenAIProvider(AIProvider):
    """OpenAI GPT provider."""

    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.client = OpenAI(api_key=api_key or settings.openai_api_key)
        self.model = model or settings.openai_model

    async def complete(
        self,
        messages: list[Message],
        system_prompt: str,
        tools: list[dict[str, Any]] | None = None,
        **kwargs: Any,
    ) -> Message:
        # Convert messages to OpenAI format
        openai_messages = [{"role": "system", "content": system_prompt}]
        openai_messages.extend(
            {"role": msg.role.value, "content": msg.content} for msg in messages
        )

        # Build request
        request_kwargs: dict[str, Any] = {
            "model": self.model,
            "messages": openai_messages,
        }

        if tools:
            request_kwargs["tools"] = [
                {"type": "function", "function": tool} for tool in tools
            ]

        if "temperature" in kwargs:
            request_kwargs["temperature"] = kwargs["temperature"]

        if "max_tokens" in kwargs:
            request_kwargs["max_tokens"] = kwargs["max_tokens"]

        # Make request
        response = self.client.chat.completions.create(**request_kwargs)
        choice = response.choices[0]

        # Parse tool calls
        tool_calls = None
        if choice.message.tool_calls:
            tool_calls = [
                ToolCall(
                    id=tc.id,
                    name=tc.function.name,
                    arguments=eval(tc.function.arguments),  # noqa: S307
                )
                for tc in choice.message.tool_calls
            ]

        return Message(
            role=MessageRole.ASSISTANT,
            content=choice.message.content or "",
            tool_calls=tool_calls,
            metadata={
                "model": self.model,
                "input_tokens": response.usage.prompt_tokens if response.usage else None,
                "output_tokens": response.usage.completion_tokens if response.usage else None,
            },
        )


# =============================================================================
# AGENT CLASS
# =============================================================================


class Agent:
    """AI Agent with tool execution capabilities."""

    def __init__(self, config: AgentConfig):
        self.config = config
        self.provider = self._create_provider()
        self.tool_definitions = get_tool_definitions(config.tools)

    def _create_provider(self) -> AIProvider:
        """Create the appropriate AI provider."""
        if self.config.provider.value == "anthropic":
            return AnthropicProvider(model=self.config.model)
        elif self.config.provider.value == "openai":
            return OpenAIProvider(model=self.config.model)
        else:
            raise ValueError(f"Unknown provider: {self.config.provider}")

    async def chat(
        self,
        messages: list[Message],
        max_iterations: int = 10,
    ) -> tuple[Message, list[ToolResult]]:
        """
        Process a conversation with tool execution loop.
        
        Returns the final assistant message and all tool results.
        """
        tool_results: list[ToolResult] = []
        current_messages = list(messages)
        iterations = 0

        while iterations < max_iterations:
            iterations += 1

            # Get completion
            logger.info(
                "Generating completion",
                agent_id=self.config.id,
                iteration=iterations,
            )

            response = await self.provider.complete(
                messages=current_messages,
                system_prompt=self.config.system_prompt,
                tools=self.tool_definitions if self.config.tools else None,
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens,
            )

            # If no tool calls, we're done
            if not response.tool_calls:
                logger.info(
                    "Completion finished",
                    agent_id=self.config.id,
                    iterations=iterations,
                )
                return response, tool_results

            # Execute tool calls
            current_messages.append(response)

            for tool_call in response.tool_calls:
                logger.info(
                    "Executing tool",
                    tool=tool_call.name,
                    agent_id=self.config.id,
                )

                result = await self._execute_tool(tool_call)
                tool_results.append(result)

                # Add tool result to messages
                current_messages.append(
                    Message(
                        role=MessageRole.TOOL,
                        content=str(result.result) if result.result else result.error or "",
                        tool_call_id=tool_call.id,
                    )
                )

        # Max iterations reached
        logger.warning(
            "Max iterations reached",
            agent_id=self.config.id,
            max_iterations=max_iterations,
        )
        return Message(
            role=MessageRole.ASSISTANT,
            content="I've reached the maximum number of steps. Please try again with a simpler request.",
        ), tool_results

    async def _execute_tool(self, tool_call: ToolCall) -> ToolResult:
        """Execute a single tool call."""
        try:
            tool = get_tool(tool_call.name)
            if not tool:
                return ToolResult(
                    tool_call_id=tool_call.id,
                    result=None,
                    error=f"Tool not found: {tool_call.name}",
                )

            result = await tool.execute(tool_call.arguments)
            return ToolResult(
                tool_call_id=tool_call.id,
                result=result,
            )

        except Exception as e:
            logger.exception("Tool execution failed", tool=tool_call.name)
            return ToolResult(
                tool_call_id=tool_call.id,
                result=None,
                error=str(e),
            )


# =============================================================================
# AGENT REGISTRY
# =============================================================================


# Pre-configured agents
DEFAULT_AGENTS: dict[str, AgentConfig] = {
    "assistant": AgentConfig(
        id="assistant",
        name="General Assistant",
        description="A helpful AI assistant",
        system_prompt="""You are a helpful AI assistant. You are friendly, concise, and accurate.
You help users with a variety of tasks including answering questions, writing, analysis, and more.
When you don't know something, you say so honestly.""",
        tools=["calculator", "current_time"],
    ),
    "coder": AgentConfig(
        id="coder",
        name="Code Assistant",
        description="Specialized in coding tasks",
        system_prompt="""You are an expert software engineer. You write clean, maintainable code.
You follow best practices and explain your reasoning. You consider edge cases and error handling.""",
        temperature=0.2,
        tools=[],
    ),
}


def get_agent(agent_id: str) -> Agent | None:
    """Get an agent by ID."""
    config = DEFAULT_AGENTS.get(agent_id)
    if not config:
        return None
    return Agent(config)


def list_agents() -> list[dict[str, Any]]:
    """List all available agents."""
    return [
        {
            "id": config.id,
            "name": config.name,
            "description": config.description,
            "tools": config.tools,
        }
        for config in DEFAULT_AGENTS.values()
    ]
