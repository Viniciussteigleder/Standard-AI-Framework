"""
Configuration Management
========================

Type-safe configuration using Pydantic Settings.
Loads from environment variables and .env files.
"""

import logging
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # General
    app_name: str = Field(default="ai-python-service")
    version: str = Field(default="0.1.0")
    debug: bool = Field(default=False)
    port: int = Field(default=4003)

    # Logging
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(default="INFO")

    # CORS
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:4000"]
    )

    # AI Providers
    anthropic_api_key: str | None = Field(default=None)
    anthropic_model: str = Field(default="claude-3-5-sonnet-20241022")
    openai_api_key: str | None = Field(default=None)
    openai_model: str = Field(default="gpt-4-turbo-preview")
    ai_default_provider: Literal["anthropic", "openai"] = Field(default="anthropic")

    # Database
    database_url: str | None = Field(default=None)

    # Redis
    redis_url: str | None = Field(default=None)

    # Service URLs (for inter-service communication)
    api_service_url: str = Field(default="http://localhost:4000")
    agent_service_url: str = Field(default="http://localhost:4001")

    # Security
    jwt_secret: str | None = Field(default=None)
    jwt_algorithm: str = Field(default="HS256")
    jwt_expire_minutes: int = Field(default=60 * 24 * 7)  # 7 days

    # Rate Limiting
    rate_limit_enabled: bool = Field(default=True)
    rate_limit_requests: int = Field(default=100)
    rate_limit_window: int = Field(default=60)  # seconds

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    @property
    def log_level_num(self) -> int:
        """Get numeric log level."""
        return getattr(logging, self.log_level.upper())

    @property
    def has_anthropic(self) -> bool:
        """Check if Anthropic is configured."""
        return bool(self.anthropic_api_key)

    @property
    def has_openai(self) -> bool:
        """Check if OpenAI is configured."""
        return bool(self.openai_api_key)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Convenience export
settings = get_settings()
