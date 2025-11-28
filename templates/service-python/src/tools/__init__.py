"""
Tools
=====

Tool definitions and implementations for agents.
"""

import math
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any

import structlog

logger = structlog.get_logger()


# =============================================================================
# BASE TOOL
# =============================================================================


class Tool(ABC):
    """Base class for all tools."""

    name: str
    description: str
    parameters: dict[str, Any]

    @abstractmethod
    async def execute(self, args: dict[str, Any]) -> Any:
        """Execute the tool with given arguments."""
        pass

    def to_definition(self) -> dict[str, Any]:
        """Convert to API-compatible definition."""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.parameters,
        }


# =============================================================================
# BUILT-IN TOOLS
# =============================================================================


class CalculatorTool(Tool):
    """Perform mathematical calculations."""

    name = "calculator"
    description = "Perform mathematical calculations. Supports basic arithmetic, powers, roots, and common math functions."
    parameters = {
        "type": "object",
        "properties": {
            "expression": {
                "type": "string",
                "description": "Mathematical expression to evaluate (e.g., '2 + 2', 'sqrt(16)', 'pow(2, 8)')",
            },
        },
        "required": ["expression"],
    }

    async def execute(self, args: dict[str, Any]) -> float:
        expression = args["expression"]
        
        # Safe math context
        safe_dict = {
            "abs": abs,
            "round": round,
            "min": min,
            "max": max,
            "sum": sum,
            "pow": pow,
            "sqrt": math.sqrt,
            "sin": math.sin,
            "cos": math.cos,
            "tan": math.tan,
            "log": math.log,
            "log10": math.log10,
            "exp": math.exp,
            "pi": math.pi,
            "e": math.e,
        }
        
        try:
            result = eval(expression, {"__builtins__": {}}, safe_dict)  # noqa: S307
            return float(result)
        except Exception as e:
            raise ValueError(f"Invalid expression: {e}")


class CurrentTimeTool(Tool):
    """Get the current date and time."""

    name = "current_time"
    description = "Get the current date and time in various formats."
    parameters = {
        "type": "object",
        "properties": {
            "format": {
                "type": "string",
                "description": "Output format: 'iso', 'date', 'time', 'datetime'",
                "enum": ["iso", "date", "time", "datetime"],
            },
            "timezone": {
                "type": "string",
                "description": "Timezone (e.g., 'UTC', 'US/Eastern'). Default is UTC.",
            },
        },
        "required": [],
    }

    async def execute(self, args: dict[str, Any]) -> str:
        fmt = args.get("format", "iso")
        now = datetime.utcnow()
        
        if fmt == "iso":
            return now.isoformat() + "Z"
        elif fmt == "date":
            return now.strftime("%Y-%m-%d")
        elif fmt == "time":
            return now.strftime("%H:%M:%S")
        elif fmt == "datetime":
            return now.strftime("%Y-%m-%d %H:%M:%S UTC")
        else:
            return now.isoformat() + "Z"


class JsonParseTool(Tool):
    """Parse and extract data from JSON."""

    name = "json_parse"
    description = "Parse a JSON string and optionally extract a specific path."
    parameters = {
        "type": "object",
        "properties": {
            "json_string": {
                "type": "string",
                "description": "JSON string to parse",
            },
            "path": {
                "type": "string",
                "description": "Optional dot-notation path to extract (e.g., 'data.items[0].name')",
            },
        },
        "required": ["json_string"],
    }

    async def execute(self, args: dict[str, Any]) -> Any:
        import json

        data = json.loads(args["json_string"])
        
        path = args.get("path")
        if not path:
            return data
        
        # Navigate path
        current = data
        for part in path.replace("[", ".").replace("]", "").split("."):
            if not part:
                continue
            if isinstance(current, list):
                current = current[int(part)]
            elif isinstance(current, dict):
                current = current[part]
            else:
                raise KeyError(f"Cannot navigate to {part}")
        
        return current


# =============================================================================
# TOOL REGISTRY
# =============================================================================


# All available tools
TOOLS: dict[str, Tool] = {
    "calculator": CalculatorTool(),
    "current_time": CurrentTimeTool(),
    "json_parse": JsonParseTool(),
}


def get_tool(name: str) -> Tool | None:
    """Get a tool by name."""
    return TOOLS.get(name)


def get_tool_definitions(tool_names: list[str]) -> list[dict[str, Any]]:
    """Get tool definitions for a list of tool names."""
    definitions = []
    for name in tool_names:
        tool = TOOLS.get(name)
        if tool:
            definitions.append(tool.to_definition())
    return definitions


def list_tools() -> list[dict[str, Any]]:
    """List all available tools."""
    return [
        {
            "name": tool.name,
            "description": tool.description,
        }
        for tool in TOOLS.values()
    ]
