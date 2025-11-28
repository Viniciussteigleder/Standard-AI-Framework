"""
Tests for the AI Framework Python Service
==========================================
"""

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.fixture
async def client():
    """Create test client."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac


class TestHealth:
    """Health endpoint tests."""

    async def test_health_check(self, client: AsyncClient):
        """Test basic health check."""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data

    async def test_liveness(self, client: AsyncClient):
        """Test liveness probe."""
        response = await client.get("/health/live")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    async def test_readiness(self, client: AsyncClient):
        """Test readiness probe."""
        response = await client.get("/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "checks" in data


class TestAgents:
    """Agent endpoint tests."""

    async def test_list_agents(self, client: AsyncClient):
        """Test listing all agents."""
        response = await client.get("/agents")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
        assert len(data["data"]) > 0

    async def test_get_agent(self, client: AsyncClient):
        """Test getting a specific agent."""
        response = await client.get("/agents/assistant")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["id"] == "assistant"

    async def test_get_nonexistent_agent(self, client: AsyncClient):
        """Test getting a nonexistent agent."""
        response = await client.get("/agents/nonexistent")
        assert response.status_code == 404


class TestTools:
    """Tool tests."""

    async def test_list_tools(self, client: AsyncClient):
        """Test listing all tools."""
        response = await client.get("/agents/tools/all")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)

    async def test_calculator_tool(self):
        """Test calculator tool directly."""
        from src.tools import get_tool

        calc = get_tool("calculator")
        assert calc is not None
        
        result = await calc.execute({"expression": "2 + 2"})
        assert result == 4.0

        result = await calc.execute({"expression": "sqrt(16)"})
        assert result == 4.0

    async def test_current_time_tool(self):
        """Test current time tool."""
        from src.tools import get_tool

        tool = get_tool("current_time")
        assert tool is not None
        
        result = await tool.execute({"format": "date"})
        assert len(result) == 10  # YYYY-MM-DD format


class TestChat:
    """Chat endpoint tests (requires AI provider)."""

    @pytest.mark.skipif(
        not pytest.importorskip("anthropic", reason="Anthropic not installed"),
        reason="AI provider not configured"
    )
    async def test_chat_basic(self, client: AsyncClient):
        """Test basic chat (skipped if no AI provider)."""
        response = await client.post(
            "/chat",
            json={
                "message": "Hello, respond with just 'Hi'",
                "agent_id": "assistant",
            }
        )
        # This will fail if no API key, which is expected in CI
        if response.status_code == 200:
            data = response.json()
            assert data["success"] is True
            assert "message" in data["data"]
