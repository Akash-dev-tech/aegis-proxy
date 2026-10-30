import uuid
from typing import List, Optional
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, Header, Response
from app.audit import audit_logger
from app.auth import AuthenticatedUser, require_admin, require_user
from app.config import settings
from app.models import AuditEntry, MaskRequest, MaskResponse, UnmaskRequest, UnmaskResponse
from app.pii_engine import pii_engine

router = APIRouter(prefix="/api/v1", tags=["shield"])


@router.post("/mask", response_model=MaskResponse)
async def mask_endpoint(
    request: MaskRequest,
    response_obj: Response,
    x_session_id: Optional[str] = Header(None, alias="X-Session-Id"),
    user: AuthenticatedUser = Depends(require_user),
) -> MaskResponse:
    effective_session_id = request.session_id or x_session_id or f"sess_{uuid.uuid4().hex[:12]}"
    response_obj.headers["X-Session-Id"] = effective_session_id

    response = pii_engine.mask_text(
        text=request.text,
        policy=request.policy,
        session_id=effective_session_id,
    )

    entity_counts = {}
    for ent in response.entities:
        entity_counts[ent.entity_type] = entity_counts.get(ent.entity_type, 0) + 1

    audit_logger.record(
        request_id=response.request_id,
        role=user.role,
        endpoint="/api/v1/mask",
        policy=response.policy_applied.value,
        risk_score=response.risk_score,
        action=response.action,
        entity_counts=entity_counts,
        placeholders=[e.placeholder for e in response.entities],
        threat_names=[t.name for t in response.threats_detected],
        output_scan_flagged=False,
    )

    return response


@router.post("/unmask", response_model=UnmaskResponse)
async def unmask_endpoint(
    request: UnmaskRequest,
    response_obj: Response,
    user: AuthenticatedUser = Depends(require_admin),
) -> UnmaskResponse:
    response_obj.headers["X-Session-Id"] = request.session_id
    result = pii_engine.unmask_text(
        masked_text=request.masked_text,
        session_id=request.session_id,
    )

    audit_logger.record(
        request_id=f"unmask_{uuid.uuid4().hex[:8]}",
        role=user.role,
        endpoint="/api/v1/unmask",
        policy="unmask",
        risk_score=0,
        action="unmask",
        entity_counts={},
        placeholders=[],
        threat_names=[],
        output_scan_flagged=False,
    )

    return result


@router.get("/audit", response_model=List[AuditEntry])
async def get_audit_logs(
    user: AuthenticatedUser = Depends(require_admin),
) -> List[AuditEntry]:
    """Retrieve ring buffer audit logs. Restricted strictly to admin role."""
    return audit_logger.get_entries()


@router.get("/llm-status")
async def get_llm_status(
    user: AuthenticatedUser = Depends(require_admin),
):
    """Retrieve upstream LLM configuration status (admin only, zero secret leakage)."""
    parsed = urlparse(settings.LLM_BASE_URL)
    base_host = parsed.netloc or parsed.path
    mode = "groq" if bool(settings.LLM_API_KEY) else "mock"
    return {
        "mode": mode,
        "model": settings.LLM_DEFAULT_MODEL,
        "base_host": base_host,
    }
