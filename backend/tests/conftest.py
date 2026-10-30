import pytest
from app.config import settings
from app.rate_limit import rate_limiter
from app.vault import vault
from app.audit import audit_logger
from app.llm_client import llm_client


@pytest.fixture(autouse=True)
def isolate_unit_tests():
    orig_key = settings.LLM_API_KEY
    orig_base = settings.LLM_BASE_URL
    orig_model = settings.LLM_DEFAULT_MODEL

    # Default to deterministic mock and standard Groq default model for offline test isolation
    settings.LLM_API_KEY = ""
    settings.LLM_DEFAULT_MODEL = "llama-3.3-70b-versatile"
    rate_limiter.clear()
    vault.clear_all()
    audit_logger.clear()
    llm_client.set_transport(None)

    yield

    llm_client.set_transport(None)
    settings.LLM_API_KEY = orig_key
    settings.LLM_BASE_URL = orig_base
    settings.LLM_DEFAULT_MODEL = orig_model
