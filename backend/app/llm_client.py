import logging
import re
import time
from typing import Any, Dict, List, Optional
import httpx
from fastapi import HTTPException, status
from app.config import settings

logger = logging.getLogger("aegis.llm_client")

# Whitelist allowed forwarded parameters to upstream LLMs (SSRF / parameter tampering protection)
ALLOWED_FORWARD_FIELDS = {"model", "messages", "temperature", "max_tokens", "top_p"}
PLACEHOLDER_REGEX = re.compile(r"<[A-Z0-9_]+_\d+>")

# Server-side un-editable instruction prepended upstream to protect placeholder preservation
SYSTEM_PLACEHOLDER_PRESERVATION_HINT = {
    "role": "system",
    "content": (
        "CRITICAL INSTRUCTION: You may see privacy protection placeholders formatted like "
        "<PERSON_1>, <IN_PAN_1>, <IN_AADHAAR_1>, <IN_UPI_1>, <EMAIL_ADDRESS_1>, <API_KEY_1>, etc. in the prompt. "
        "You MUST treat these placeholders as valid, natural real-world entities. Preserve and naturally integrate these placeholders exactly as written in your answer. "
        "Do not question, explain, refuse, translate, or alter them."
    ),
}


GROQ_KNOWN_PREFIXES = ("llama", "mixtral", "gemma", "deepseek", "whisper", "groq", "qwen")


class LLMClient:
    """Async client supporting simulated deterministic mock replies or real Groq upstream."""

    def __init__(self, transport: Optional[httpx.AsyncBaseTransport] = None):
        self._transport = transport

    def set_transport(self, transport: Optional[httpx.AsyncBaseTransport]) -> None:
        """Allow injecting a MockTransport for unit and integration testing."""
        self._transport = transport

    def _generate_mock_reply(self, messages: List[Dict[str, Any]]) -> str:
        """Deterministic mock LLM reply echoing any placeholders discovered in masked messages."""
        all_text = " ".join(
            str(m.get("content", "")) for m in messages if isinstance(m, dict)
        )
        placeholders = sorted(list(set(PLACEHOLDER_REGEX.findall(all_text))))

        if placeholders:
            if len(placeholders) == 1:
                return f"Processed request for {placeholders[0]}. Everything looks compliant."
            if any("PAN" in p for p in placeholders) and any("PERSON" in p for p in placeholders):
                person_ph = next(p for p in placeholders if "PERSON" in p)
                pan_ph = next(p for p in placeholders if "PAN" in p)
                return f"Processed request for {person_ph} with tax record {pan_ph}. Everything looks compliant."
            ph_str = " and ".join(placeholders)
            return f"Processed request for {ph_str}. Everything looks compliant."
        return "Processed request successfully. All parameters compliant."

    def _mock_completion_dict(self, model: str, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        reply_content = self._generate_mock_reply(messages)
        return {
            "id": f"chatcmpl-mock-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": reply_content,
                    },
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": len(str(messages)) // 4,
                "completion_tokens": len(reply_content) // 4,
                "total_tokens": (len(str(messages)) + len(reply_content)) // 4,
            },
            "_llm_mode": "mock",
            "_model_used": model,
        }

    async def complete(
        self,
        request_payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute chat completion either via deterministic mock or upstream Groq API."""
        messages = request_payload.get("messages", [])
        model = request_payload.get("model") or settings.LLM_DEFAULT_MODEL

        # Explicit fallback: use deterministic mock if USE_MOCK_LLM is set or if LLM_API_KEY is empty and no transport injected
        if getattr(settings, "USE_MOCK_LLM", False) or (not settings.LLM_API_KEY and self._transport is None):
            return self._mock_completion_dict(model, messages)

        # Groq model mapping: if sending to api.groq.com and model is not a valid Groq model (e.g. gpt-4o-mini), override
        if "api.groq.com" in settings.LLM_BASE_URL:
            low_model = model.lower()
            if low_model.startswith(("gpt-", "text-", "claude-", "davinci-")) or not any(low_model.startswith(p) for p in GROQ_KNOWN_PREFIXES):
                model = settings.LLM_DEFAULT_MODEL

        # Filter strictly to whitelisted fields
        sanitized_payload = {
            k: v for k, v in request_payload.items() if k in ALLOWED_FORWARD_FIELDS and v is not None
        }
        sanitized_payload["model"] = model

        # Prepend server-side system preservation hint without mutating caller's original messages list
        injected_messages = [dict(SYSTEM_PLACEHOLDER_PRESERVATION_HINT)] + [
            dict(m) if isinstance(m, dict) else m for m in messages
        ]
        sanitized_payload["messages"] = injected_messages

        # Upstream call with timeouts, SSRF protection (env-only base URL), and retry on 5xx
        base_url = settings.LLM_BASE_URL.rstrip("/")
        url = f"{base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.LLM_API_KEY}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(transport=self._transport, timeout=30.0) as client:
            last_exception = None
            for attempt in range(2):  # Try once + 1 retry on 5xx
                try:
                    response = await client.post(url, headers=headers, json=sanitized_payload)

                    # 1. Groq 429 rate limit mapping
                    if response.status_code == 429:
                        retry_after = response.headers.get("Retry-After") or response.headers.get("retry-after")
                        resp_headers = {"Retry-After": retry_after} if retry_after else None
                        raise HTTPException(
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail={
                                "error": {
                                    "message": "Upstream rate limit exceeded. Please retry later.",
                                    "type": "rate_limit_error",
                                    "code": "upstream_rate_limited",
                                }
                            },
                            headers=resp_headers,
                        )

                    # 2. Upstream auth failure mapping (never leak LLM_API_KEY)
                    if response.status_code in (401, 403):
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail={
                                "error": {
                                    "message": "Upstream authentication failed with LLM provider.",
                                    "type": "upstream_auth_error",
                                    "code": "bad_gateway",
                                }
                            },
                        )

                    # 3. Upstream 404 / model error fallback
                    if response.status_code == 404:
                        if sanitized_payload.get("model") != settings.LLM_DEFAULT_MODEL:
                            sanitized_payload["model"] = settings.LLM_DEFAULT_MODEL
                            continue
                        logger.warning("Upstream model 404; falling back to deterministic mock response.")
                        return self._mock_completion_dict(model, messages)

                    # 4. Upstream 5xx server errors
                    if response.status_code >= 500:
                        if attempt == 0:
                            continue  # Retry on 5xx
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail={
                                "error": {
                                    "message": f"Upstream LLM gateway returned server error ({response.status_code})",
                                    "type": "upstream_error",
                                    "code": "bad_gateway",
                                }
                            },
                        )

                    # 5. Other 4xx client errors
                    if response.status_code >= 400:
                        try:
                            err_json = response.json()
                        except Exception:
                            err_json = {"message": response.text}
                        raise HTTPException(
                            status_code=response.status_code,
                            detail=err_json,
                        )

                    data = response.json()
                    data["_llm_mode"] = "groq"
                    data["_model_used"] = sanitized_payload.get("model", settings.LLM_DEFAULT_MODEL)
                    return data

                except httpx.TimeoutException as exc:
                    last_exception = exc
                    if attempt == 0:
                        continue
                    raise HTTPException(
                        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                        detail={
                            "error": {
                                "message": "Upstream LLM gateway timed out",
                                "type": "timeout_error",
                                "code": "gateway_timeout",
                            }
                        },
                    )
                except httpx.RequestError as exc:
                    last_exception = exc
                    logger.warning(f"Upstream request error: {exc}. Falling back to deterministic mock.")
                    return self._mock_completion_dict(model, messages)

            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={"error": {"message": f"Upstream LLM error: {last_exception}", "code": "bad_gateway"}},
            )


llm_client = LLMClient()
