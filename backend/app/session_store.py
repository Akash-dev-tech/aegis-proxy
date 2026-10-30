"""Session store proxy module that delegates to the encrypted Vault.

Maintains backward compatibility with pii_engine without requiring changes to imports.
"""

from app.vault import Vault, vault

# Delegate session_store directly to the encrypted vault singleton
session_store = vault
SessionStore = Vault

__all__ = ["session_store", "SessionStore", "Vault", "vault"]
