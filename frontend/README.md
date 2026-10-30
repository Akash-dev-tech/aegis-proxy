# Aegis Proxy — Next.js 15 Frontend Dashboard

A high-performance cyber-security dashboard for **Aegis Proxy**, providing real-time reversible PII pseudonymization, prompt injection defense, and security audit telemetry.

## Security Architecture

1. **Airtight Server-Side RBAC (Zero Secrets Leaked to Browser):**
   - The browser never receives or stores `AEGIS_ADMIN_KEY` or `ADMIN_PASSWORD`.
   - Public visitors operate under the low-privilege `AEGIS_VIEWER_KEY` server-side.
   - Admin elevation requires constant-time verification against `ADMIN_PASSWORD` at `/api/aegis/admin-login` (rate-limited to 5 attempts / 5 mins per IP).
   - Upon verification, an `httpOnly`, `SameSite=Strict`, `Secure` JWT cookie (`aegis_admin_session`) signed with `SESSION_SECRET` is issued.
   - Reversible unmasking (`/api/aegis/unmask`) and audit log retrieval (`/api/aegis/audit`) strictly require this cookie, returning HTTP 403 Forbidden to unauthenticated viewers.

2. **Zero Plaintext PII Persistence:**
   - Raw user prompts and decrypted PII are never persisted in browser storage (`localStorage`, `sessionStorage`, or cookies).
   - All state is ephemeral in React component memory.

3. **Production Hardened Headers:**
   - Strict `Content-Security-Policy` (CSP).
   - `X-Frame-Options: DENY`.
   - `X-Content-Type-Options: nosniff`.
   - `Referrer-Policy: no-referrer`.
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.

---

## Dashboard Features

### Tab 1: Shield Playground
- **5 Evaluation Presets:**
  - *Indian KYC & UPI:* Aadhaar (Verhoeff checksum), PAN, Phone (+91), and UPI VPA identifiers.
  - *Developer API Key Leak:* OpenAI `sk-proj-*` and AWS access key patterns.
  - *Prompt Injection Attack:* Instruction override and secret exfiltration payloads.
  - *Clean text (allowed):* Benign input with zero risk score.
  - *Multi-turn conversation:* Demonstrates session consistency (`X-Session-Id`).
- **Two-Pane Layout:**
  - Left: Raw prompt textarea with live character counter (up to 20,000 chars) and action buttons.
  - Right: Masked output with color-coded placeholder badges (`<PERSON_1>`, `<IN_PAN_1>`, etc.), risk score meter (0-100), explainability cards detailing detection rationale, and reversible unmasking.
- **3-Stage X-Ray Proxy Pipeline View:**
  - Stage 1: Inbound Raw Prompt
  - Stage 2: Pseudonymized Prompt dispatched to Upstream LLM
  - Stage 3: LLM Response safely processed

### Tab 2: Security Audit Trail
- **Viewer Role:** Displays sleek RBAC 403 guard banner preventing unauthorized access to audit telemetry.
- **Admin Role:** Real-time data table connected to the FastAPI in-memory 100-event ring buffer with the "Zero Plaintext PII Stored" assurance badge.

### Tab 3: Developer SDK & Integration
- Interactive copy-ready code snippets for **Python** (`openai` SDK with custom `base_url`), **Node.js/TypeScript**, and **cURL**.

---

## Local Development & Testing

### 1. Environment Setup
Create `frontend/.env.local` (never committed):
```bash
AEGIS_BACKEND_URL="http://127.0.0.1:8000"
AEGIS_ADMIN_KEY="demo-admin-key"
AEGIS_VIEWER_KEY="demo-viewer-key"
ADMIN_PASSWORD="admin"
SESSION_SECRET="super-secret-session-jwt-key-change-me-at-least-32-chars-long"
```

### 2. Start Servers
```bash
# Terminal 1: FastAPI Backend (single worker for in-memory vault consistency)
uvicorn app.main:app --workers 1 --port 8000

# Terminal 2: Next.js Frontend
cd frontend
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Frontend Tests
```bash
cd frontend
npm test
```
Runs 13 Vitest unit tests covering Zod schemas, constant-time password auth, JWT tokens, IP rate limiting, and placeholder highlighting.
