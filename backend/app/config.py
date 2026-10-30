import os
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_HMAC_SECRET = "super-secret-hmac-key-change-me"
DEFAULT_MASTER_VAULT_SECRET = "super-secret-vault-key-change-me"
DEMO_ADMIN_HASH = "ac5bb3526d3be432ba19fb1fc0712d350c160bd2169cd24401c9fcaeaac2d860"
DEMO_VIEWER_HASH = "428d2ac3da6ce4eb5cc58762a03af655a5d836bdecd00b0305afc7b2aa81adfd"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    HMAC_SECRET: str = DEFAULT_HMAC_SECRET
    MASTER_VAULT_SECRET: str = DEFAULT_MASTER_VAULT_SECRET
    DEFAULT_TTL_SECONDS: int = 600
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    ENABLE_ML_DETECTOR: bool = False

    # LLM upstream settings (SSRF protection: only loaded from env)
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = "https://api.groq.com/openai/v1"
    LLM_DEFAULT_MODEL: str = "llama-3.3-70b-versatile"

    # Rate limiting configuration
    RATE_LIMIT_PER_MINUTE: int = 30
    AUTH_FAILURE_RATE_LIMIT_PER_MINUTE: int = 10

    ENV: str = "development"
    ADMIN_KEY_SHA256: str = ""
    VIEWER_KEY_SHA256: str = ""

    # Pre-calculated SHA-256 hashes for demo API keys:
    # "demo-admin-key" -> ac5bb3526d3be432ba19fb1fc0712d350c160bd2169cd24401c9fcaeaac2d860
    # "demo-viewer-key" -> 428d2ac3da6ce4eb5cc58762a03af655a5d836bdecd00b0305afc7b2aa81adfd
    API_KEY_ROLES: dict[str, str] = Field(
        default_factory=lambda: {
            DEMO_ADMIN_HASH: "admin",
            DEMO_VIEWER_HASH: "viewer",
        }
    )

    def model_post_init(self, __context) -> None:
        if self.ADMIN_KEY_SHA256:
            self.API_KEY_ROLES.pop(DEMO_ADMIN_HASH, None)
            self.API_KEY_ROLES[self.ADMIN_KEY_SHA256.strip().lower()] = "admin"
        if self.VIEWER_KEY_SHA256:
            self.API_KEY_ROLES.pop(DEMO_VIEWER_HASH, None)
            self.API_KEY_ROLES[self.VIEWER_KEY_SHA256.strip().lower()] = "viewer"

    def validate_production_readiness(self) -> None:
        """Enforces that production environments refuse to start with default secrets or demo key hashes."""
        if self.ENV.lower() == "production":
            violations = []
            if self.HMAC_SECRET == DEFAULT_HMAC_SECRET:
                violations.append("Default HMAC_SECRET is strictly forbidden in production.")
            if self.MASTER_VAULT_SECRET == DEFAULT_MASTER_VAULT_SECRET:
                violations.append("Default MASTER_VAULT_SECRET is strictly forbidden in production.")
            if DEMO_ADMIN_HASH in self.API_KEY_ROLES:
                violations.append("Demo admin key hash is active; configure ADMIN_KEY_SHA256 in production.")
            if DEMO_VIEWER_HASH in self.API_KEY_ROLES:
                violations.append("Demo viewer key hash is active; configure VIEWER_KEY_SHA256 in production.")

            if violations:
                error_msg = (
                    "CRITICAL SECURITY CONFIGURATION ERROR:\n"
                    "Backend startup refused because production mode requires secure credentials:\n"
                    + "\n".join(f"  - {v}" for v in violations)
                )
                raise RuntimeError(error_msg)

    @property
    def cors_origins(self) -> List[str]:
        if not self.ALLOWED_ORIGINS:
            return ["http://localhost:3000"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
