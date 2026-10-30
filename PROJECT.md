# PROJECT: Aegis Proxy — Reversible PII Pseudonymization & Threat Firewall

## 1. Stack & Deployment Constraints

- **Backend:** Python 3.10+, FastAPI, Microsoft Presidio (`presidio-analyzer`, `presidio-anonymizer`), spaCy (`en_core_web_sm` ONLY to stay under Render's 512MB RAM limit; never `en_core_web_lg`), `cryptography` (Fernet AES-128-CBC + HKDF).
- **Process Model:** Run `uvicorn app.main:app --workers 1` (single worker) so in-memory encrypted vault and audit logs stay consistent across requests.
- **Frontend:** Next.js 15 (App Router), Tailwind CSS, hosted on Vercel. Uses a low-privilege `viewer` demo key or server-side route handlers—frontend NEVER holds an `admin` key.
- **CORS:** Restrict CORS strictly to environment-configured origins (`ALLOWED_ORIGINS`).
- **Installed Antigravity Skills:** Always apply `.agent/skills/` (`fastapi-pro`, `async-python-patterns`, `security-auditor`, `api-design-principles`, `unit-testing-test-generate`, `nextjs-app-router-patterns`).

## 2. Core Architectural Rules (Mandatory)

1. **Server-Side Role Derivation (No Privilege Escalation):**
   - Role is derived from the API key server-side (`admin` or `viewer`).
   - The optional `X-User-Role` header can ONLY downgrade permissions (e.g., `admin` key passing `X-User-Role: viewer` becomes `viewer`; a `viewer` key passing `X-User-Role: admin` stays `viewer`, never upgrades).
2. **Placeholder Escaping & Safe Unmasking:**
   - Detect/escape placeholder-shaped text in user input matching `<([A-Z0-9_]+_\d+)>` into `[[ESCAPED_\1]]` before PII analysis so users cannot inject fake placeholders to extract vault secrets.
   - During unmasking, leave unknown or hallucinated placeholders (e.g. `<PERSON_99>`) untouched. Restore `[[ESCAPED_...]]` back to `<...>`.
3. **Session Consistency (`X-Session-Id`):**
   - Proxy endpoints accept `X-Session-Id` header (or `session_id` in payload).
   - Within the same session, the exact same raw PII value MUST always map to the exact same placeholder (e.g., `"Rahul Sharma"` always maps to `<PERSON_1>` across multiple occurrences or turns). Different sessions are independent.
4. **Streaming Rejection (`stream=true`):**
   - `POST /v1/chat/completions` with `"stream": true` returns a clear HTTP `400 Bad Request` explaining that full-response PII scanning requires `"stream": false`. (Documented in README).
5. **HMAC-SHA256 Hash Policy:**
   - Policy modes: `replace` (reversible placeholder), `redact` (`[REDACTED_<TYPE>]`), `hash` (HMAC-SHA256 using server secret `HMAC_SECRET`, formatted as `<HASH_{TYPE}_{12_hex}>`), `block` (return action `block`, no PII in response).
6. **Threat Categories & Explicit Risk Score Formula (SQLi Removed):**
   - SQLi is removed from the threat list.
   - Threat categories:
     - `prompt_injection` (Instruction Override): +45 points
     - `jailbreak` (DAN / Persona Bypass): +45 points
     - `data_exfiltration` (System Prompt / Secret Extraction): +40 points
     - `secret_leak` (API Keys, Bearer tokens, AWS/OpenAI keys): +50 points
     - `ml_injection_detector` (Phase 3 ML-based prompt-injection detector on top of regex rules; probability >= 0.70): +50 points
   - PII Points:
     - High-sensitivity entity (`IN_AADHAAR`, `IN_PAN`, `API_KEY`, `CREDIT_CARD`, `IN_UPI`): +15 points each
     - Medium-sensitivity entity (`PERSON`, `EMAIL_ADDRESS`, `IN_PHONE`, `PHONE_NUMBER`, `LOCATION`): +8 points each
     - Total `pii_points` capped at 40 (`min(40, sum_pii_points)`).
   - Formula: `risk_score = min(100, threat_points + pii_points)`
   - Action Decision:
     - `block`: if `risk_score >= 70` OR `threat_points >= 45` OR (`policy == "block"` and `risk_score > 0`)
     - `mask`: if `0 < risk_score < 70` and `entities` detected
     - `allow`: if `risk_score == 0`
7. **Hard Security & Privacy Rules (Zero Plaintext Logging):**
   - Hard rules: NEVER log raw prompts, PII, vault values, or API keys.
   - `/api/v1/audit` is strictly `admin`-only (`viewer` returns `403 Forbidden`).
   - Custom validation exception handlers ensure invalid request bodies containing PII are never reflected in logs or error responses.
8. **Upstream LLM Integration (Groq Default):**
   - Default upstream provider is Groq (`LLM_BASE_URL="https://api.groq.com/openai/v1"`, `LLM_DEFAULT_MODEL="llama-3.3-70b-versatile"`).
   - If `LLM_API_KEY` is empty, deterministic mock fallback is used (`aegis_security.llm_mode="mock"`).
   - System placeholder preservation hint injected server-side without mutating caller messages.
   - Groq 429 maps to 429 with `Retry-After`; 401/403 maps to 502 Bad Gateway without leaking keys.
   - Admin-only `GET /api/v1/llm-status` returns `{mode, model, base_host}` with zero secrets.
