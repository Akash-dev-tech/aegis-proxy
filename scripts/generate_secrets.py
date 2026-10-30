#!/usr/bin/env python3
"""Aegis Proxy — Cryptographic Secret & API Key Generator

Generates cryptographically-secure random keys, HMAC secrets, vault encryption
master keys, and SHA-256 hashes for production deployment on Render & Vercel.

IMPORTANT: This script strictly outputs secrets to STDOUT for manual copy-pasting.
It NEVER writes secrets to any disk files or persistent storage.
"""

import hashlib
import secrets


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def main() -> None:
    # 1. API Keys (Raw tokens for clients and SHA-256 hashes for backend)
    admin_api_key = f"aegis_admin_{secrets.token_urlsafe(32)}"
    admin_key_hash = sha256_hex(admin_api_key)

    viewer_api_key = f"aegis_viewer_{secrets.token_urlsafe(32)}"
    viewer_key_hash = sha256_hex(viewer_api_key)

    # 2. Cryptographic Secrets
    hmac_secret = secrets.token_hex(32)
    master_vault_secret = secrets.token_hex(32)
    session_secret = secrets.token_hex(32)
    admin_password = secrets.token_urlsafe(18)

    print("=" * 72)
    print("      AEGIS PROXY — PRODUCTION CREDENTIALS & SECRETS GENERATOR")
    print("=" * 72)
    print("\n[!] STORE THESE SECURELY. THEY WILL NOT BE SAVED TO DISK.\n")

    print("-" * 72)
    print("1. RENDER (FastAPI Backend Environment Variables)")
    print("-" * 72)
    print(f"ENV=production")
    print(f"HMAC_SECRET={hmac_secret}")
    print(f"MASTER_VAULT_SECRET={master_vault_secret}")
    print(f"ADMIN_KEY_SHA256={admin_key_hash}")
    print(f"VIEWER_KEY_SHA256={viewer_key_hash}")
    print(f"DEFAULT_TTL_SECONDS=600")
    print(f"ALLOWED_ORIGINS=https://<your-vercel-domain>.vercel.app")
    print(f"ENABLE_ML_DETECTOR=false")

    print("\n" + "-" * 72)
    print("2. VERCEL (Next.js Frontend Environment Variables - Server Only)")
    print("-" * 72)
    print(f"AEGIS_BACKEND_URL=https://<your-render-service>.onrender.com")
    print(f"AEGIS_ADMIN_KEY={admin_api_key}")
    print(f"AEGIS_VIEWER_KEY={viewer_api_key}")
    print(f"ADMIN_PASSWORD={admin_password}")
    print(f"SESSION_SECRET={session_secret}")

    print("\n" + "-" * 72)
    print("3. RAW CLIENT API KEYS (Distribute to Authorized Integrations)")
    print("-" * 72)
    print(f"Admin API Key  : {admin_api_key}")
    print(f"                 SHA-256: {admin_key_hash}")
    print(f"Viewer API Key : {viewer_api_key}")
    print(f"                 SHA-256: {viewer_key_hash}")
    print(f"Admin Password : {admin_password}")
    print("=" * 72)


if __name__ == "__main__":
    main()
