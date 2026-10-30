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


class LLMClient:
    """Async client supporting simulated deterministic mock replies or real OpenAI-compatible upstream."""

    def __init__(self, transport: Optional[httpx.AsyncBaseTransport] = None):
        self._transport = transport

    def set_transport(self, transport: Optional[httpx.AsyncBaseTransport]) -> None:
        """Allow injecting a MockTransport for unit and integration testing."""
        self._transport = transport

    def _generate_mock_reply(self, messages: List[Dict[str, Any]]) -> str:
        """Deterministic mock LLM reply echoing any placeholders discovered in masked messages."""
        # Find all placeholders in the messages text
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

    async def complete(
        self,
        request_payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute chat completion either via mock or upstream API."""
        messages = request_payload.get("messages", [])
        model = request_payload.get("model") or settings.LLM_DEFAULT_MODEL

        # If no LLM_API_KEY is configured and no mock transport is injected, use deterministic mock
        if not settings.LLM_API_KEY and self._transport is None:
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
            }

        # Filter strictly to whitelisted fields
        sanitized_payload = {
            k: v for k, v in request_payload.items() if k in ALLOWED_FORWARD_FIELDS and v is not None
        }
        sanitized_payload["model"] = model

        # Upstream call with timeouts, SSRF protection (env-only base URL), and 1 retry on 5xx
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
                    if response.status_code >= 400:
                        try:
                            err_json = response.json()
                        except Exception:
                            err_json = {"message": response.text}
                        raise HTTPException(
                            status_code=response.status_code,
                            detail=err_json,
                        )
                    return response.json()
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
                    if attempt == 0:
                        continue
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail={
                            "error": {
                                "message": "Failed to connect to upstream LLM gateway",
                                "type": "connection_error",
                                "code": "bad_gateway",
                            }
                        },
                    )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={"error": {"message": f"Upstream LLM error: {last_exception}", "code": "bad_gateway"}},
            )


llm_client = LLMClient()
