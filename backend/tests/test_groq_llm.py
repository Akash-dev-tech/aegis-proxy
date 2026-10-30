import json
import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.llm_client import SYSTEM_PLACEHOLDER_PRESERVATION_HINT, llm_client
from app.main import app
from app.rate_limit import rate_limiter
from app.vault import vault

client = TestClient(app)

ADMIN_HEADERS = {"X-API-Key": "demo-admin-key"}
VIEWER_HEADERS = {"X-API-Key": "demo-viewer-key"}


@pytest.fixture(autouse=True)
def clean_state():
    rate_limiter.clear()
    vault.clear_all()
    llm_client.set_transport(None)
    orig_key = settings.LLM_API_KEY
    orig_base = settings.LLM_BASE_URL
    orig_model = settings.LLM_DEFAULT_MODEL
    yield
    llm_client.set_transport(None)
    settings.LLM_API_KEY = orig_key
    settings.LLM_BASE_URL = orig_base
    settings.LLM_DEFAULT_MODEL = orig_model


def test_mock_fallback_when_key_empty():
    settings.LLM_API_KEY = ""
    res = client.post(
        "/v1/chat/completions",
        headers=ADMIN_HEADERS,
        json={
            "messages": [{"role": "user", "content": "Hello Rahul Sharma, PAN is ABCDE1234F"}],
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["aegis_security"]["llm_mode"] == "mock"
    assert "Rahul Sharma" in data["choices"][0]["message"]["content"]


def test_groq_base_url_and_hint_injection():
    """Verify Groq URL is targeted, hint is injected in the HTTP request, and original caller messages stay untouched."""
    settings.LLM_API_KEY = "gsk_test_mock_secret_key_12345"
    captured_requests = []

    def mock_handler(request: httpx.Request) -> httpx.Response:
        captured_requests.append(request)
        req_body = json.loads(request.read().decode())
        messages = req_body.get("messages", [])

        # Verify preservation hint is first message
        assert messages[0]["role"] == "system"
        assert "CRITICAL INSTRUCTION" in messages[0]["content"]
        assert "<PERSON_1>" in messages[0]["content"]

        # Echo assistant reply preserving placeholder
        reply_content = "Received request for <PERSON_1>. Verified compliant."
        return httpx.Response(
            200,
            json={
                "id": "chatcmpl-groq-test",
                "object": "chat.completion",
                "created": 1700000000,
                "model": "llama-3.3-70b-versatile",
                "choices": [
                    {
                        "index": 0,
                        "message": {"role": "assistant", "content": reply_content},
                        "finish_reason": "stop",
                    }
                ],
                "usage": {"prompt_tokens": 15, "completion_tokens": 10, "total_tokens": 25},
            },
        )

    llm_client.set_transport(httpx.MockTransport(mock_handler))

    user_messages = [{"role": "user", "content": "Process payroll for Rahul Sharma"}]
    res = client.post(
        "/v1/chat/completions",
        headers=ADMIN_HEADERS,
        json={"messages": user_messages},
    )

    assert res.status_code == 200
    data = res.json()
    assert data["aegis_security"]["llm_mode"] == "groq"
    assert "Rahul Sharma" in data["choices"][0]["message"]["content"]

    # Verify exact Groq base URL and path were invoked
    assert len(captured_requests) == 1
    assert str(captured_requests[0].url) == "https://api.groq.com/openai/v1/chat/completions"
    assert captured_requests[0].headers["authorization"] == "Bearer gsk_test_mock_secret_key_12345"

    # Verify original user_messages list was untouched
    assert len(user_messages) == 1
    assert user_messages[0]["role"] == "user"


def test_groq_429_mapped_with_retry_after():
    settings.LLM_API_KEY = "gsk_test_mock_secret_key_12345"

    def mock_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            429,
            headers={"Retry-After": "12"},
            json={"error": {"message": "Rate limit exceeded on Groq LPU cluster"}},
        )

    llm_client.set_transport(httpx.MockTransport(mock_handler))

    res = client.post(
        "/v1/chat/completions",
        headers=ADMIN_HEADERS,
        json={"messages": [{"role": "user", "content": "Hello world"}]},
    )

    assert res.status_code == 429
    assert res.headers.get("Retry-After") == "12"
    data = res.json()
    assert "error" in data
    assert "rate limit exceeded" in data["error"]["message"].lower()


def test_groq_401_mapped_to_502_without_leaking_key():
    settings.LLM_API_KEY = "gsk_super_secret_groq_key_99999"

    def mock_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            401,
            json={"error": {"message": "Invalid API Key provided"}},
        )

    llm_client.set_transport(httpx.MockTransport(mock_handler))

    res = client.post(
        "/v1/chat/completions",
        headers=ADMIN_HEADERS,
        json={"messages": [{"role": "user", "content": "Hello world"}]},
    )

    assert res.status_code == 502
    data = res.json()
    assert "error" in data
    assert "upstream authentication failed" in data["error"]["message"].lower()

    # Crucial security assertion: API key must NEVER be leaked in response body
    raw_response_text = res.text
    assert "gsk_super_secret_groq_key_99999" not in raw_response_text
    assert "gsk_" not in raw_response_text


def test_llm_status_endpoint():
    # 1. Admin accessing llm-status with empty key (mock mode)
    settings.LLM_API_KEY = ""
    res = client.get("/api/v1/llm-status", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["mode"] == "mock"
    assert data["model"] == "llama-3.3-70b-versatile"
    assert data["base_host"] == "api.groq.com"
    assert "key" not in str(data).lower()

    # 2. Admin accessing llm-status with key configured (groq mode)
    settings.LLM_API_KEY = "gsk_test_key"
    res2 = client.get("/api/v1/llm-status", headers=ADMIN_HEADERS)
    assert res2.status_code == 200
    assert res2.json()["mode"] == "groq"
    assert "gsk_" not in str(res2.json())

    # 3. Viewer accessing llm-status gets 403 Forbidden
    res_viewer = client.get("/api/v1/llm-status", headers=VIEWER_HEADERS)
    assert res_viewer.status_code == 403
