"""
Pydantic Models
===============

Request/Response models for the API.
These mirror the TypeScript types in @framework/core.
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# =============================================================================
# ENUMS
# =============================================================================


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


class AIProvider(str, Enum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"


# =============================================================================
# MESSAGE MODELS
# =============================================================================


class ToolCall(BaseModel):
    """A tool call made by the assistant."""
    
    id: str
    name: str
    arguments: dict[str, Any]


class Message(BaseModel):
    """A single message in a conversation."""
    
    role: MessageRole
    content: str
    name: str | None = None
    tool_call_id: str | None = None
    tool_calls: list[ToolCall] | None = None
    metadata: dict[str, Any] | None = None


class MessageMetadata(BaseModel):
    """Metadata about a message."""
    
    timestamp: datetime | None = None
    model: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    latency_ms: int | None = None


# =============================================================================
# CHAT MODELS
# =============================================================================


class ChatRequest(BaseModel):
    """Request to send a chat message."""
    
    message: str = Field(..., min_length=1, max_length=32000)
    agent_id: str = Field(default="assistant")
    conversation_id: str | None = None
    context: dict[str, Any] | None = None
    stream: bool = False


class ChatResponse(BaseModel):
    """Response from a chat request."""
    
    conversation_id: str
    message: Message
    tool_results: list[dict[str, Any]] | None = None


# =============================================================================
# AGENT MODELS
# =============================================================================


class AgentConfig(BaseModel):
    """Configuration for an AI agent."""
    
    id: str
    name: str
    description: str | None = None
    system_prompt: str
    provider: AIProvider = AIProvider.ANTHROPIC
    model: str = "claude-3-5-sonnet-20241022"
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int | None = None
    tools: list[str] = Field(default_factory=list)


class AgentInfo(BaseModel):
    """Public information about an agent."""
    
    id: str
    name: str
    description: str | None
    tools: list[str]
    is_active: bool = True


# =============================================================================
# TOOL MODELS
# =============================================================================


class ToolDefinition(BaseModel):
    """Definition of a tool that agents can use."""
    
    name: str
    description: str
    parameters: dict[str, Any]  # JSON Schema


class ToolResult(BaseModel):
    """Result from executing a tool."""
    
    tool_call_id: str
    result: Any
    error: str | None = None


# =============================================================================
# API RESPONSE MODELS
# =============================================================================


class ApiError(BaseModel):
    """Error details."""
    
    code: str
    message: str
    details: dict[str, Any] | None = None


class ApiResponse(BaseModel):
    """Standard API response wrapper."""
    
    success: bool
    data: Any | None = None
    error: ApiError | None = None
    meta: dict[str, Any] | None = None


# =============================================================================
# HEALTH MODELS
# =============================================================================


class HealthStatus(BaseModel):
    """Service health status."""
    
    status: str = "ok"
    version: str
    uptime_seconds: float
    checks: dict[str, dict[str, Any]] = Field(default_factory=dict)
