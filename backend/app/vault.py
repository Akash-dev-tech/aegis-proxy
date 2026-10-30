import base64
import hashlib
import hmac
import os
import threading
import time
from typing import Dict, Optional, Tuple

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from app.config import settings

MAX_SESSIONS = 1000
MAX_ENTRIES_PER_SESSION = 500


class VaultSession:
    """Represents an isolated, encrypted session vault.

    Holds only salts, expiration timestamps, and Fernet-encrypted ciphertexts.
    No plaintext values are stored in memory structures.
    """

    def __init__(self, session_id: str, master_secret: str, ttl_seconds: int):
        self.session_id: str = session_id
        self.salt: bytes = os.urandom(16)
        self.expires_at: float = time.time() + ttl_seconds

        # HKDF-derived 32-byte Fernet key
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=self.salt,
            info=f"aegis-session-{session_id}".encode("utf-8"),
        )
        derived_key = hkdf.derive(master_secret.encode("utf-8"))
        self._fernet_key: bytes = base64.urlsafe_b64encode(derived_key)

        # placeholder -> ciphertext bytes (AES-128-CBC + HMAC-SHA256 authenticated token)
        self.placeholder_to_ciphertext: Dict[str, bytes] = {}

        # (entity_type, hmac_of_raw) -> placeholder (prevents storing plaintext raw_value for lookup)
        self.raw_hash_to_placeholder: Dict[Tuple[str, str], str] = {}

        # entity_type -> current counter for <ENTITY_1>, <ENTITY_2>
        self.entity_counters: Dict[str, int] = {}

    def get_fernet(self) -> Fernet:
        return Fernet(self._fernet_key)

    def hash_raw_value(self, raw_value: str) -> str:
        return hmac.new(
            self._fernet_key,
            raw_value.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def is_expired(self, now: Optional[float] = None) -> bool:
        current_time = now if now is not None else time.time()
        return current_time > self.expires_at


class Vault:
    """Thread-safe encrypted vault implementing the same interface as SessionStore.

    Reversible pseudonymization store using Fernet encryption with HKDF key derivation.
    """

    def __init__(
        self,
        master_secret: Optional[str] = None,
        default_ttl_seconds: Optional[int] = None,
    ):
        self.master_secret: str = master_secret or settings.MASTER_VAULT_SECRET
        self.default_ttl_seconds: int = (
            default_ttl_seconds
            if default_ttl_seconds is not None
            else settings.DEFAULT_TTL_SECONDS
        )
        self._sessions: Dict[str, VaultSession] = {}
        self._lock = threading.Lock()

    @property
    def active_sessions_count(self) -> int:
        with self._lock:
            now = time.time()
            return sum(1 for s in self._sessions.values() if not s.is_expired(now))

    def _get_or_create_session(self, session_id: str) -> VaultSession:
        now = time.time()
        session = self._sessions.get(session_id)

        if session is not None and not session.is_expired(now):
            session.expires_at = now + self.default_ttl_seconds
            return session

        # If expired or new, check max session cap
        if session is not None and session.is_expired(now):
            self._sessions.pop(session_id, None)

        if len(self._sessions) >= MAX_SESSIONS:
            # Purge expired sessions first
            self._purge_expired_locked(now)
            if len(self._sessions) >= MAX_SESSIONS:
                # Evict oldest session by expiry
                oldest_sid = min(self._sessions.keys(), key=lambda k: self._sessions[k].expires_at)
                self._sessions.pop(oldest_sid, None)

        new_session = VaultSession(
            session_id=session_id,
            master_secret=self.master_secret,
            ttl_seconds=self.default_ttl_seconds,
        )
        self._sessions[session_id] = new_session
        return new_session

    def get_or_create_placeholder(
        self, session_id: str, entity_type: str, raw_value: str
    ) -> str:
        with self._lock:
            session = self._get_or_create_session(session_id)

            raw_hash = session.hash_raw_value(raw_value)
            lookup_key = (entity_type, raw_hash)

            if lookup_key in session.raw_hash_to_placeholder:
                return session.raw_hash_to_placeholder[lookup_key]

            if len(session.placeholder_to_ciphertext) >= MAX_ENTRIES_PER_SESSION:
                raise ValueError(
                    f"Session {session_id} exceeded maximum entries limit ({MAX_ENTRIES_PER_SESSION})"
                )

            current_count = session.entity_counters.get(entity_type, 0) + 1
            session.entity_counters[entity_type] = current_count
            placeholder = f"<{entity_type}_{current_count}>"

            fernet = session.get_fernet()
            ciphertext = fernet.encrypt(raw_value.encode("utf-8"))

            session.placeholder_to_ciphertext[placeholder] = ciphertext
            session.raw_hash_to_placeholder[lookup_key] = placeholder

            return placeholder

    def resolve(self, session_id: str, placeholder: str) -> Optional[str]:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None

            now = time.time()
            if session.is_expired(now):
                # Expired entries are rejected on read
                self._sessions.pop(session_id, None)
                return None

            ciphertext = session.placeholder_to_ciphertext.get(placeholder)
            if ciphertext is None:
                return None

            session.expires_at = now + self.default_ttl_seconds
            fernet = session.get_fernet()
            try:
                plaintext_bytes = fernet.decrypt(ciphertext)
                return plaintext_bytes.decode("utf-8")
            except Exception:
                return None

    def _purge_expired_locked(self, now: float) -> int:
        expired = [sid for sid, s in self._sessions.items() if s.is_expired(now)]
        for sid in expired:
            del self._sessions[sid]
        return len(expired)

    def clear_expired(self, ttl_seconds: Optional[int] = None) -> int:
        with self._lock:
            now = time.time()
            if ttl_seconds is not None:
                # Custom TTL override for testing or manual eviction
                expired = [
                    sid
                    for sid, s in self._sessions.items()
                    if (now - (s.expires_at - self.default_ttl_seconds)) > ttl_seconds
                ]
                for sid in expired:
                    del self._sessions[sid]
                return len(expired)
            return self._purge_expired_locked(now)

    def clear_all(self) -> None:
        """Clear all active sessions unconditionally (useful for test isolation)."""
        with self._lock:
            self._sessions.clear()

    # Backward-compatibility shims for legacy test fixture cleanup
    @property
    def _raw_to_placeholder(self):
        class _ClearShim:
            def clear(inner_self):
                self.clear_all()
        return _ClearShim()

    @property
    def _placeholder_to_raw(self):
        class _ClearShim:
            def clear(inner_self):
                pass
        return _ClearShim()

    @property
    def _entity_counters(self):
        class _ClearShim:
            def clear(inner_self):
                pass
        return _ClearShim()

    @property
    def _last_accessed(self):
        class _ClearShim:
            def clear(inner_self):
                pass
        return _ClearShim()


# Global singleton vault instance
vault = Vault()
