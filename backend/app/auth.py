import hashlib
from typing import Optional
from fastapi import Header, HTTPException, Request, Security, status
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from app.config import settings
from app.rate_limit import rate_limiter


class AuthenticatedUser(BaseModel):
    role: str
    key_hash: Optional[str] = None


api_key_header_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


def get_current_user(
    request: Request,
    x_api_key: Optional[str] = Security(api_key_header_scheme),
    bearer_auth: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
) -> AuthenticatedUser:
    client_ip = get_client_ip(request)

    # Throttle repeated failed auth attempts per IP address
    rate_limiter.check_ip_auth_limit(client_ip)

    raw_key: Optional[str] = None

    if x_api_key and x_api_key.strip():
        raw_key = x_api_key.strip()
    elif bearer_auth and bearer_auth.credentials and bearer_auth.credentials.strip():
        raw_key = bearer_auth.credentials.strip()

    if not raw_key:
        rate_limiter.record_auth_failure(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )

    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    bound_role = settings.API_KEY_ROLES.get(key_hash)

    if not bound_role:
        rate_limiter.record_auth_failure(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )

    # Sliding-window rate limit per authenticated API key
    rate_limiter.check_rate_limit(key_hash)

    # Role derivation with downgrade-only policy:
    # admin can be downgraded to viewer if X-User-Role: viewer is specified.
    # viewer can NEVER be upgraded to admin, even if X-User-Role: admin is specified.
    effective_role = bound_role
    if bound_role == "admin":
        if x_user_role and x_user_role.strip().lower() == "viewer":
            effective_role = "viewer"
    elif bound_role == "viewer":
        effective_role = "viewer"

    return AuthenticatedUser(role=effective_role, key_hash=key_hash)


def require_admin(
    user: AuthenticatedUser = Security(get_current_user),
) -> AuthenticatedUser:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )
    return user


def require_user(
    user: AuthenticatedUser = Security(get_current_user),
) -> AuthenticatedUser:
    return user
