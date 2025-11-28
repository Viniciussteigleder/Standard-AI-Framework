"""
Chat Routes
===========
"""

import uuid

import structlog
from fastapi import APIRouter, HTTPException

from src.agents import get_agent
from src.models import ApiResponse, ChatRequest, ChatResponse, Message, MessageRole

router = APIRouter()
logger = structlog.get_logger()


@router.post("", response_model=ApiResponse)
async def chat(request: ChatRequest) -> ApiResponse:
    """
    Send a message to an AI agent.
    
    The agent will process the message, potentially calling tools,
    and return a response.
    """
    # Get agent
    agent = get_agent(request.agent_id)
    if not agent:
        raise HTTPException(
            status_code=404,
            detail=f"Agent not found: {request.agent_id}",
        )

    # Build messages
    messages = [
        Message(role=MessageRole.USER, content=request.message)
    ]

    # Get response
    try:
        response_message, tool_results = await agent.chat(messages)
        
        # Generate conversation ID if not provided
        conversation_id = request.conversation_id or str(uuid.uuid4())

        return ApiResponse(
            success=True,
            data=ChatResponse(
                conversation_id=conversation_id,
                message=response_message,
                tool_results=[tr.model_dump() for tr in tool_results] if tool_results else None,
            ).model_dump(),
        )

    except Exception as e:
        logger.exception("Chat failed", agent_id=request.agent_id)
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )
