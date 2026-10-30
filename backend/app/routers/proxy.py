import time
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse

from app.audit import audit_logger
from app.auth import AuthenticatedUser, require_user
from app.config import settings
from app.llm_client import llm_client
from app.models import (
    AegisSecurityMetadata,
    ChatCompletionChoice,
    ChatCompletionMessage,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionUsage,
    DetectedEntity,
    ModelItem,
    ModelListResponse,
    PolicyMode,
    ThreatMatch,
)
from app.pii_engine import pii_engine
from app.threat_scanner import threat_scanner

router = APIRouter(tags=["proxy"])


@router.post("/v1/chat/completions", response_model=ChatCompletionResponse)
async def chat_completions(
    request: ChatCompletionRequest,
    raw_request: Request,
    response: Response,
    x_session_id: Optional[str] = Header(None, alias="X-Session-Id"),
    x_policy_mode: Optional[str] = Header(None, alias="X-Policy-Mode"),
    user: AuthenticatedUser = Depends(require_user),
):
    request_id = f"req_{uuid.uuid4().hex[:12]}"
    session_id = x_session_id or f"sess_{uuid.uuid4().hex[:12]}"
    response.headers["X-Session-Id"] = session_id

    # 1. Reject streaming with 400 Bad Request
    if request.stream:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": {
                    "message": "Streaming is disabled on Aegis Proxy to enforce full-response PII pseudonymization and threat firewall scanning. Please set stream=false.",
                    "type": "invalid_request_error",
                    "code": "stream_unsupported",
                }
            },
        )

    # Determine policy mode: header > default replace
    policy = PolicyMode.replace
    if x_policy_mode:
        try:
            policy = PolicyMode(x_policy_mode.lower())
        except ValueError:
            policy = PolicyMode.replace

    # 2. Mask all message roles (system, user, assistant, tool) under one shared session
    masked_messages: List[Dict[str, Any]] = []
    all_entities: List[DetectedEntity] = []
    all_threats: List[ThreatMatch] = []
    highest_risk_score = 0
    total_threat_points = 0
    total_pii_points = 0
    any_blocked = False
    last_user_prompt_masked = ""

    for msg in request.messages:
        content_str = ""
        if isinstance(msg.content, str):
            content_str = msg.content
        elif isinstance(msg.content, list):
            # Extract text parts from multi-part content
            text_parts = [
                part.get("text", "")
                for part in msg.content
                if isinstance(part, dict) and part.get("type") == "text"
            ]
            content_str = " ".join(text_parts)
        else:
            content_str = str(msg.content or "")

        mask_res = pii_engine.mask_text(
            text=content_str,
            policy=policy,
            session_id=session_id,
        )

        all_entities.extend(mask_res.entities)
        all_threats.extend(mask_res.threats_detected)
        if mask_res.risk_score > highest_risk_score:
            highest_risk_score = mask_res.risk_score
        total_threat_points = max(total_threat_points, mask_res.threat_points)
        total_pii_points = max(total_pii_points, mask_res.pii_points)
        if mask_res.action == "block":
            any_blocked = True

        masked_content = mask_res.masked_text
        if msg.role == "user":
            last_user_prompt_masked = masked_content

        masked_messages.append({"role": msg.role, "content": masked_content})

    # Overall block decision: if action == block or threat_points >= 40 or policy == block with positive risk
    is_blocked = (
        any_blocked
        or total_threat_points >= 40
        or (policy == PolicyMode.block and (all_entities or all_threats))
    )

    if is_blocked:
        # Record audit log before rejecting
        entity_counts: Dict[str, int] = {}
        for ent in all_entities:
            entity_counts[ent.entity_type] = entity_counts.get(ent.entity_type, 0) + 1

        audit_logger.record(
            request_id=request_id,
            session_id=session_id,
            role=user.role,
            endpoint="/v1/chat/completions",
            policy=policy.value,
            risk_score=highest_risk_score,
            action="block",
            entity_counts=entity_counts,
            placeholders=[e.placeholder for e in all_entities],
            threat_names=[t.name for t in all_threats],
            output_scan_flagged=False,
        )

        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error": {
                    "message": "Request blocked by Aegis Security Firewall.",
                    "type": "security_violation",
                    "code": "aegis_firewall_blocked",
                    "request_id": request_id,
                    "threats": [t.name for t in all_threats],
                }
            },
        )

    # 3. Call LLM with masked messages
    llm_payload = {
        "model": request.model,
        "messages": masked_messages,
        "temperature": request.temperature,
        "max_tokens": request.max_tokens,
        "top_p": request.top_p,
    }

    raw_completion = await llm_client.complete(llm_payload)

    # Extract assistant reply content
    choices_data = raw_completion.get("choices", [])
    raw_reply_text = ""
    if choices_data:
        raw_reply_text = choices_data[0].get("message", {}).get("content", "")

    # 4. ORDER OF OPERATIONS: Output scanning runs on the masked LLM reply FIRST
    # Escape vault placeholders so they are not detected as new PII
    escaped_reply, map_offset, _ = pii_engine._escape_input_text(raw_reply_text)

    # Scan escaped reply for newly generated raw PII or secrets
    output_scan_passed = True
    output_scan_findings: List[str] = []

    # Run Presidio analysis on escaped reply
    raw_output_results = pii_engine.analyzer.analyze(
        text=escaped_reply,
        language="en",
        entities=pii_engine.ALLOWED_ENTITIES if hasattr(pii_engine, "ALLOWED_ENTITIES") else [
            "PERSON", "EMAIL_ADDRESS", "CREDIT_CARD", "IBAN_CODE", "IP_ADDRESS",
            "IN_PAN", "IN_AADHAAR", "IN_PHONE", "IN_UPI", "API_KEY"
        ],
        score_threshold=0.5,
    )

    if raw_output_results:
        output_scan_passed = False
        output_scan_findings = list(set(r.entity_type for r in raw_output_results))

    # Also scan for secrets via threat scanner
    output_threats, _ = threat_scanner.scan(raw_reply_text)
    if any(t.category == "secret_leak" for t in output_threats):
        output_scan_passed = False
        if "API_KEY" not in output_scan_findings:
            output_scan_findings.append("API_KEY")

    # Redact any newly discovered raw PII spans in the LLM reply
    scanned_reply = raw_reply_text
    if raw_output_results:
        # Map offsets and redact
        spans_to_redact = []
        for r in raw_output_results:
            orig_s = map_offset(r.start)
            orig_e = map_offset(r.end)
            if orig_e > orig_s:
                clean_t = r.entity_type[3:] if r.entity_type.startswith("IN_") else r.entity_type
                spans_to_redact.append((orig_s, orig_e, f"[REDACTED_{clean_t}]"))

        # Sort descending by start
        spans_to_redact.sort(key=lambda item: item[0], reverse=True)
        for s, e, red_str in spans_to_redact:
            scanned_reply = scanned_reply[:s] + red_str + scanned_reply[e:]

    # 5. Role-based unmasking: ONLY after output scan
    restored_for_role: Optional[str] = None
    final_reply = scanned_reply

    if user.role == "admin" and policy == PolicyMode.replace:
        unmask_res = pii_engine.unmask_text(scanned_reply, session_id)
        final_reply = unmask_res.unmasked_text
        restored_for_role = "admin"
    else:
        # Viewer role or non-replace policy leaves placeholders masked
        restored_for_role = None

    # 6. Audit logging
    entity_counts = {}
    for ent in all_entities:
        entity_counts[ent.entity_type] = entity_counts.get(ent.entity_type, 0) + 1

    audit_logger.record(
        request_id=request_id,
        session_id=session_id,
        role=user.role,
        endpoint="/v1/chat/completions",
        policy=policy.value,
        risk_score=highest_risk_score,
        action="mask" if all_entities else "allow",
        entity_counts=entity_counts,
        placeholders=[e.placeholder for e in all_entities],
        threat_names=[t.name for t in all_threats],
        output_scan_flagged=not output_scan_passed,
    )

    # 7. Construct OpenAI response with Aegis security metadata
    llm_mode = raw_completion.get("_llm_mode", "mock" if not settings.LLM_API_KEY else "groq")
    model_used = raw_completion.get("_model_used", raw_completion.get("model", request.model or settings.LLM_DEFAULT_MODEL))
    is_live_groq = (llm_mode == "groq")

    security_meta = AegisSecurityMetadata(
        request_id=request_id,
        session_id=session_id,
        action="mask" if all_entities else "allow",
        policy_applied=policy.value,
        risk_score=highest_risk_score,
        threat_points=total_threat_points,
        pii_points=total_pii_points,
        prompt_sent_to_llm=last_user_prompt_masked,
        raw_llm_output=raw_reply_text,
        llm_mode=llm_mode,
        model_used=model_used,
        is_live_groq=is_live_groq,
        output_scan_passed=output_scan_passed,
        output_scan_findings=output_scan_findings,
        restored_for_role=restored_for_role,
        entities=all_entities,
        threats_detected=all_threats,
    )

    return ChatCompletionResponse(
        id=raw_completion.get("id", f"chatcmpl-{request_id}"),
        object="chat.completion",
        created=raw_completion.get("created", int(time.time())),
        model=model_used,
        choices=[
            ChatCompletionChoice(
                index=0,
                message=ChatCompletionMessage(
                    role="assistant",
                    content=final_reply,
                ),
                finish_reason="stop",
            )
        ],
        usage=ChatCompletionUsage(
            prompt_tokens=raw_completion.get("usage", {}).get("prompt_tokens", 0),
            completion_tokens=raw_completion.get("usage", {}).get("completion_tokens", 0),
            total_tokens=raw_completion.get("usage", {}).get("total_tokens", 0),
        ),
        aegis_security=security_meta,
    )


@router.get("/v1/models", response_model=ModelListResponse)
async def list_models(user: AuthenticatedUser = Depends(require_user)):
    """OpenAI-compatible models list endpoint."""
    return ModelListResponse(
        object="list",
        data=[
            ModelItem(id="llama-3.3-70b-versatile", object="model", owned_by="groq"),
            ModelItem(id="llama-3.1-8b-instant", object="model", owned_by="groq"),
        ],
    )
