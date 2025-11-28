"""
Agent Routes
============
"""

from fastapi import APIRouter, HTTPException

from src.agents import DEFAULT_AGENTS, get_agent, list_agents
from src.models import AgentInfo, ApiResponse
from src.tools import list_tools

router = APIRouter()


@router.get("", response_model=ApiResponse)
async def get_agents() -> ApiResponse:
    """List all available agents."""
    return ApiResponse(
        success=True,
        data=list_agents(),
    )


@router.get("/{agent_id}", response_model=ApiResponse)
async def get_agent_info(agent_id: str) -> ApiResponse:
    """Get details about a specific agent."""
    config = DEFAULT_AGENTS.get(agent_id)
    if not config:
        raise HTTPException(
            status_code=404,
            detail=f"Agent not found: {agent_id}",
        )

    return ApiResponse(
        success=True,
        data=AgentInfo(
            id=config.id,
            name=config.name,
            description=config.description,
            tools=config.tools,
        ).model_dump(),
    )


@router.get("/{agent_id}/tools", response_model=ApiResponse)
async def get_agent_tools(agent_id: str) -> ApiResponse:
    """Get tools available to a specific agent."""
    agent = get_agent(agent_id)
    if not agent:
        raise HTTPException(
            status_code=404,
            detail=f"Agent not found: {agent_id}",
        )

    return ApiResponse(
        success=True,
        data={
            "agent_id": agent_id,
            "tools": agent.tool_definitions,
        },
    )


@router.get("/tools/all", response_model=ApiResponse)
async def get_all_tools() -> ApiResponse:
    """List all available tools."""
    return ApiResponse(
        success=True,
        data=list_tools(),
    )
