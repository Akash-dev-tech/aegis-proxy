# Aegis Proxy — Pitch Deck Outline & Defense Q&A

Executive overview, architecture pitch outline, and rigorous defense Q&A for judges and technical evaluators.

---

## Slide Outline

### Slide 1: The Problem — The Enterprise LLM Privacy & Security Blindspot
- **Context:** Enterprises want to leverage frontier LLMs (OpenAI, Anthropic, Gemini, Groq), but cannot expose sensitive customer PII or confidential secrets.
- **Regulations:** India's DPDP Act, GDPR, and HIPAA impose steep penalties for personal data leaks to third-party model providers.
- **The Threat:** Attackers weaponize Prompt Injections, Jailbreaks (DAN), and Secret Exfiltration payloads against LLM-powered applications.
- **The Gap:** Existing solutions either permanently redact data (ruining context) or introduce heavy, complex gateway infrastructure.

### Slide 2: The Solution — Aegis Proxy
- **Zero-Trust Reverse Proxy:** Drop-in gateway for any OpenAI-compatible client.
- **Reversible Cryptographic Pseudonymization:** Raw PII is replaced with consistent placeholders (`<PERSON_1>`, `<IN_PAN_1>`), securely stored in an encrypted vault, and restored on demand.
- **Integrated Threat Firewall:** Proactive defense detecting prompt injections, jailbreaks, data exfiltration, and secrets before prompts ever reach the LLM.
- **Airtight RBAC:** Zero admin keys in client browsers. Public users mask; only verified admins can unmask or view audit logs.

### Slide 3: Architecture & Security Pipeline
```
[User / App] 
     │ (Raw Prompt: "Rahul Sharma, PAN: ABCDE1234F")
     ▼
[Aegis Next.js 15 Frontend / Server Proxy]
     │ (Attaches Viewer Key or Verified Admin Cookie)
     ▼
[FastAPI Security Engine]
     ├── 1. Placeholder Escaper: Detects and escapes injected fake tags <PERSON_1> -> [[ESCAPED_...]]
     ├── 2. Threat Scanner: Regex rules + optional lazy ML for injection, jailbreak, exfil (+45/40 pts)
     ├── 3. Presidio NER + Verhoeff Recognizers: Aadhaar, PAN, UPI, Phone, Email, Keys
     ├── 4. Composite Risk Scorer: threat_points + pii_points (Capped at 100)
     │       ├── >= 70: BLOCK (Zero bytes sent to LLM, prompt dropped)
     │       └── < 70 : MASK (Reversible pseudonymization)
     ├── 5. Encrypted Vault: HKDF key derivation + Fernet AES-128-CBC with 16-byte random salt
     └── 6. Output Scanner: Secondary defense ensuring LLM output contains zero raw PII leaks
```

### Slide 4: 3-Minute Live Demo Flow
- **Demo 1:** Indian KYC & UPI recognition (Aadhaar with Verhoeff checksum validation).
- **Demo 2:** Reversible unmasking locked behind admin role guard.
- **Demo 3:** Prompt injection attack blocked cold by the firewall (Risk Score 85/100).
- **Demo 4:** 3-stage X-Ray view demonstrating zero PII transmitted to the LLM.
- **Demo 5:** Tamper-evident audit trail with "Zero Plaintext PII Stored" assurance.

### Slide 5: Trust, Security & Compliance
- **Zero Plaintext at Rest:** Prompts, secrets, and PII are never persisted in logs or database tables.
- **Fernet AES-128-CBC + HKDF:** Master vault secret never encrypts data directly; unique 32-byte key derived per session.
- **Anti-Tampering:** Server-side role derivation; `X-User-Role` can only downgrade permissions, never escalate.
- **Resource Constraints:** spaCy `en_core_web_sm` exclusively; verified to run in <200MB on Render's 512MB free tier.

### Slide 6: Honest Limitations
- **Single-Worker Process Model:** In-memory vault requires `workers=1` to maintain session consistency across requests on free-tier instances.
- **Streaming Disabled:** Streaming (`stream=true`) returns HTTP 400 because full-response threat analysis and PII scanning requires complete output buffers.
- **Heuristic Threat Rules:** Core regex rules catch established injection signatures; edge-case novel linguistic injections require activating the optional ML detector.
- **Cold Starts:** Free-tier instances on Render spin down after inactivity, incurring an initial ~30s wake-up delay.

### Slide 7: Future Roadmap
- Distributed encrypted vault backed by Redis with envelope encryption (AWS KMS / HashiCorp Vault).
- Webhook alert integrations for security incident response (Slack, PagerDuty, Datadog).
- Expanded multi-lingual NER models for 12 Indian regional languages (Tamil, Hindi, Bengali, Telugu).

---

## Likely Judge Questions & Rigorous Defense

### Q1: "How does Aegis prevent users from extracting vault secrets by typing fake `<PERSON_1>` placeholders in their prompts?"
> **Answer:** Aegis implements **Placeholder Escaping & Safe Unmasking**. Prior to running the Presidio analyzer, Aegis scans input text for any placeholder-shaped tokens matching `<([A-Z0-9_]+_\d+)>` and converts them into escaped tokens `[[ESCAPED_\1]]`. During unmasking, any placeholder not found in that session's vault is left strictly untouched as literal text, and `[[ESCAPED_...]]` tokens are safely reverted back to `<...>`. An attacker typing `<PERSON_1>` can never trigger a decryption lookup for someone else's PII.

### Q2: "Why does Aegis use an in-memory vault instead of Redis or Postgres, and how does it scale?"
> **Answer:** For a zero-trust threat firewall deployed on edge infrastructure or constrained environments, an in-memory encrypted vault guarantees that **no sensitive PII ever touches persistent disk or third-party databases**. To scale horizontally in enterprise deployments, the `Vault` interface (`get_or_create_placeholder`, `resolve`, `clear_expired`) is designed as an abstracted interface that can seamlessly swap from the local HKDF+Fernet in-memory store to an encrypted Redis cluster or HashiCorp Vault with zero changes to the `pii_engine` or `proxy`.

### Q3: "Why is streaming (`stream=true`) disabled in chat completions?"
> **Answer:** Streaming chunk-by-chunk tokens directly from an upstream LLM makes bidirectional PII pseudonymization and threat firewalling mathematically incomplete. A threat payload (e.g. prompt injection confirmation or exfiltrated API key) could be split across arbitrary token boundaries, evading chunk-level inspection. Aegis prioritizes complete privacy and firewall guarantees by enforcing full-response scanning and returns a clear HTTP 400 Bad Request with an explanation.

### Q4: "How does Aegis guarantee it won't exceed Render's 512MB RAM cap?"
> **Answer:** Aegis strictly uses spaCy's lightweight `en_core_web_sm` model (~12MB) rather than large transformer models like `en_core_web_lg` (~500MB). Memory benchmarks show baseline startup consumes **~135MB RSS**, growing to **~148MB RSS** after 50 intense masking requests, leaving **>360MB (70% headroom)** on Render's 512MB free tier. Additionally, vault sessions are capped at 1,000 sessions with 500 entries per session and automatic background TTL evictions every 60 seconds.

### Q5: "What prevents a malicious client from forging admin permissions via headers?"
> **Answer:** Permissions are derived strictly server-side from the SHA-256 hash of the presented API key. The `X-User-Role` header is governed by a **downgrade-only policy**: an admin key passing `X-User-Role: viewer` is downgraded for testing low-privilege scenarios, but a viewer key passing `X-User-Role: admin` is rejected and remains a viewer. In the frontend, the browser never receives or sends admin API keys; all admin operations require an `httpOnly`, `SameSite=Strict`, `Secure` signed JWT cookie verified server-side.
