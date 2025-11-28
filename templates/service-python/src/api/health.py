"""
Health Check Routes
===================
"""

import time

from fastapi import APIRouter

from src.config import settings
from src.models import HealthStatus

router = APIRouter()

# Track startup time
_start_time = time.time()


@router.get("/health")
async def health_check() -> HealthStatus:
    """Basic health check."""
    return HealthStatus(
        status="ok",
        version=settings.version,
        uptime_seconds=time.time() - _start_time,
    )


@router.get("/health/live")
async def liveness() -> dict:
    """Kubernetes liveness probe."""
    return {"status": "ok"}


@router.get("/health/ready")
async def readiness() -> dict:
    """Kubernetes readiness probe."""
    checks = {}
    is_ready = True

    # Check AI provider
    if settings.has_anthropic or settings.has_openai:
        checks["ai_provider"] = {"status": "ok"}
    else:
        checks["ai_provider"] = {"status": "warning", "message": "No AI provider configured"}

    # Check database (if configured)
    if settings.database_url:
        # TODO: Add actual database health check
        checks["database"] = {"status": "ok"}

    return {
        "status": "ok" if is_ready else "degraded",
        "checks": checks,
    }


@router.get("/health/detailed")
async def detailed_health() -> HealthStatus:
    """Detailed health status with all checks."""
    checks = {}

    # AI Providers
    checks["anthropic"] = {
        "configured": settings.has_anthropic,
        "model": settings.anthropic_model if settings.has_anthropic else None,
    }
    checks["openai"] = {
        "configured": settings.has_openai,
        "model": settings.openai_model if settings.has_openai else None,
    }

    # Database
    checks["database"] = {
        "configured": bool(settings.database_url),
    }

    # Redis
    checks["redis"] = {
        "configured": bool(settings.redis_url),
    }

    return HealthStatus(
        status="ok",
        version=settings.version,
        uptime_seconds=time.time() - _start_time,
        checks=checks,
    )
