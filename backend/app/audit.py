import datetime
import threading
import time
from collections import deque
from typing import Dict, List, Optional

from app.models import AuditEntry


class AuditLogger:
    """In-memory ring buffer storing the last 100 audit entries.

    Hard rule: NEVER store raw input text, prompt fragments, or PII values.
    """

    def __init__(self, capacity: int = 100):
        self._buffer: deque[AuditEntry] = deque(maxlen=capacity)
        self._lock = threading.Lock()

    def record(
        self,
        request_id: str,
        role: str,
        policy: str,
        risk_score: int,
        action: str,
        entity_counts: Dict[str, int],
        placeholders: List[str],
        threat_names: List[str],
        session_id: str = "",
        endpoint: str = "/api/v1/mask",
        output_scan_flagged: bool = False,
        timestamp: Optional[float] = None,
    ) -> AuditEntry:
        ts = timestamp if timestamp is not None else time.time()
        ts_iso = datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc).isoformat()
        entity_types = list(entity_counts.keys())
        entity_count = sum(entity_counts.values())

        entry = AuditEntry(
            request_id=request_id,
            session_id=session_id,
            timestamp=ts,
            timestamp_iso=ts_iso,
            role=role,
            endpoint=endpoint,
            policy=policy,
            risk_score=risk_score,
            action=action,
            entity_counts=entity_counts,
            entity_types=entity_types,
            entity_count=entity_count,
            placeholders=placeholders,
            threat_names=threat_names,
            threats=list(threat_names),
            output_scan_flagged=output_scan_flagged,
        )
        with self._lock:
            self._buffer.append(entry)
        return entry

    def get_entries(self) -> List[AuditEntry]:
        with self._lock:
            # Return list from newest to oldest
            return list(reversed(self._buffer))

    def clear(self) -> None:
        with self._lock:
            self._buffer.clear()


audit_logger = AuditLogger(capacity=100)
