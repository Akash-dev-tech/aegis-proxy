import threading
import time
from collections import defaultdict, deque
from typing import Dict, Optional
from fastapi import HTTPException, Request, status
from app.config import settings


class SlidingWindowRateLimiter:
    """Thread-safe sliding-window rate limiter for API keys and IP auth failure throttling."""

    def __init__(self):
        # key_hash -> deque of timestamps
        self._key_windows: Dict[str, deque] = defaultdict(deque)
        # ip_address -> deque of failed auth timestamps
        self._ip_auth_failures: Dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def check_rate_limit(self, key_id: str, max_requests: Optional[int] = None) -> None:
        """Check if an API key has exceeded its sliding-window request limit."""
        limit = max_requests if max_requests is not None else settings.RATE_LIMIT_PER_MINUTE
        now = time.time()
        window_duration = 60.0

        with self._lock:
            timestamps = self._key_windows[key_id]

            # Prune timestamps older than 60 seconds
            while timestamps and now - timestamps[0] > window_duration:
                timestamps.popleft()

            if len(timestamps) >= limit:
                oldest = timestamps[0]
                retry_after = max(1, int(oldest + window_duration - now))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "error": {
                            "message": "Rate limit exceeded. Please try again later.",
                            "type": "rate_limit_error",
                            "code": "rate_limit_exceeded",
                        }
                    },
                    headers={"Retry-After": str(retry_after)},
                )

            timestamps.append(now)

    def check_ip_auth_limit(self, client_ip: str) -> None:
        """Check if a client IP has had too many failed authentication attempts."""
        limit = settings.AUTH_FAILURE_RATE_LIMIT_PER_MINUTE
        now = time.time()
        window_duration = 60.0

        with self._lock:
            timestamps = self._ip_auth_failures[client_ip]

            while timestamps and now - timestamps[0] > window_duration:
                timestamps.popleft()

            if len(timestamps) >= limit:
                oldest = timestamps[0]
                retry_after = max(1, int(oldest + window_duration - now))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "error": {
                            "message": "Too many failed authentication attempts. Please try again later.",
                            "type": "rate_limit_error",
                            "code": "ip_auth_throttled",
                        }
                    },
                    headers={"Retry-After": str(retry_after)},
                )

    def record_auth_failure(self, client_ip: str) -> None:
        """Record an authentication failure for the given client IP."""
        now = time.time()
        with self._lock:
            self._ip_auth_failures[client_ip].append(now)

    def clear(self) -> None:
        """Clear all rate limiting state (used in test teardown)."""
        with self._lock:
            self._key_windows.clear()
            self._ip_auth_failures.clear()


rate_limiter = SlidingWindowRateLimiter()
