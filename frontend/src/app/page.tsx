"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Shield,
  ArrowRight,
  Terminal,
  Cpu,
  Layers,
  Lock,
  CheckCircle2,
  XCircle,
  Activity,
  Server,
  FileCode,
} from "lucide-react";

export default function HomePage() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [comparisonTab, setComparisonTab] = useState<"without" | "with">("with");

  const steps = [
    {
      num: 1,
      title: "1. Zero-Trust Intercept",
      short: "1. Intercept",
      desc: "Incoming requests hit /v1/chat/completions or /api/v1/mask. Client role (admin vs viewer) is derived server-side from the API key; callers can only downgrade permissions, never escalate.",
      badge: "OpenAI Wire Compatible",
      code: `POST /v1/chat/completions HTTP/1.1
Authorization: Bearer aegis_live_key
X-Session-Id: sess_984a1...
{
  "messages": [{"role": "user", "content": "Process tax refund for Rahul Sharma (PAN: ABCDE1234F)"}]
}`,
    },
    {
      num: 2,
      title: "2. Multi-Vector Threat Scan",
      short: "2. Threat Scan",
      desc: "High-speed regex and heuristic scanners evaluate prompt injection (+45 pts), jailbreak (+45 pts), data exfiltration (+50 pts), and secret leaks (+75 pts). SQLi is intentionally removed to focus strictly on LLM risks.",
      badge: "Injection & Secret Guards",
      code: `Threat Analysis:
- Prompt Injection: 0 pts
- Jailbreak: 0 pts
- Data Exfiltration: 0 pts
- Secret Leak: 0 pts
Total Threat Score: 0 pts`,
    },
    {
      num: 3,
      title: "3. Presidio + spaCy NER Scan",
      short: "3. PII Detection",
      desc: "High-sensitivity (Aadhaar, PAN, UPI, API keys = +15 pts) and medium-sensitivity (Person, Phone, Email = +8 pts) entities are identified with exact character offsets. PII points are strictly capped at 40.",
      badge: "Exact Offset Mapping",
      code: `Entities Detected:
- PERSON: "Rahul Sharma" (indices 23..35) -> +8 pts
- IN_PAN: "ABCDE1234F" (indices 43..53) -> +15 pts
PII Points: 23 pts (Cap: 40 pts)`,
    },
    {
      num: 4,
      title: "4. Explicit Decision Formula",
      short: "4. Decision Engine",
      desc: "risk_score = min(100, threat_points + pii_points). If threat_points >= 40, request is blocked. If threat_points == 0 and entities exist, request is masked into consistent placeholders (<PERSON_1>, <IN_PAN_1>).",
      badge: "Formula Driven",
      code: `Risk Score: 0 + 23 = 23 / 100
Decision Rule: 0 < 23 < 70 (threats == 0) -> ACTION: MASK
Policy Applied: "replace" (Reversible Fernet HKDF Vault)
Placeholder Map:
  "Rahul Sharma" -> <PERSON_1>
  "ABCDE1234F"  -> <IN_PAN_1>`,
    },
    {
      num: 5,
      title: "5. Sanitized Upstream to Groq LPU",
      short: "5. Upstream Groq",
      desc: "Sanitized prompt is forwarded to Groq (llama-3.3-70b-versatile) with an uneditable server-side system hint instructing the model to strictly preserve placeholders. Upstream LLM NEVER sees plaintext PII.",
      badge: "Zero Plaintext PII to LLM",
      code: `[SYSTEM]: CRITICAL: Preserve placeholders <PERSON_1>, <IN_PAN_1> verbatim.
[USER]: Process tax refund for <PERSON_1> (PAN: <IN_PAN_1>)
--- Upstream Groq Response ---
[ASSISTANT]: Tax refund for <PERSON_1> (tax ID <IN_PAN_1>) is approved.`,
    },
    {
      num: 6,
      title: "6. Output Scan & Role-Based Reveal",
      short: "6. Role Delivery",
      desc: "Response is scanned for newly generated secrets before delivery. For Admin role, placeholders are resolved from the in-memory Fernet-HKDF vault. For Viewer role, placeholders remain safely masked.",
      badge: "Role-Based Delivery",
      code: `Output Guard: 0 new secrets leaked.
Admin Delivery (Reversible):
  "Tax refund for Rahul Sharma (tax ID ABCDE1234F) is approved."
Viewer Delivery (Zero-Trust Masked):
  "Tax refund for <PERSON_1> (tax ID <IN_PAN_1>) is approved."`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Console Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
              ARCHITECTURE & CORE SPECS
            </span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-zinc-100 mt-1">
            Aegis Proxy — Architecture & Threat Defense Engine
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Drop-in OpenAI-compatible security gateway with reversible PII pseudonymization, injection firewalling, and RBAC.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/demo"
            className="flex items-center gap-1.5 rounded-md bg-zinc-100 text-zinc-950 px-3 py-1.5 text-xs font-semibold hover:bg-white transition-colors"
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>Open Playground</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/connect"
            className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <Terminal className="h-3.5 w-3.5 text-zinc-400" />
            <span>API Quickstart</span>
          </Link>
        </div>
      </div>

      {/* 4-Box Technical Spec Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-1">
          <span className="text-[10px] uppercase text-zinc-500 font-semibold">
            Upstream LLM Provider
          </span>
          <div className="font-bold text-zinc-200">Groq LPU</div>
          <p className="text-[10px] text-zinc-500">llama-3.3-70b-versatile</p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-1">
          <span className="text-[10px] uppercase text-zinc-500 font-semibold">
            Vault Cryptography
          </span>
          <div className="font-bold text-zinc-200">AES-128-CBC + HKDF</div>
          <p className="text-[10px] text-zinc-500">In-memory RAM sessions</p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-1">
          <span className="text-[10px] uppercase text-zinc-500 font-semibold">
            NER & Entity Engine
          </span>
          <div className="font-bold text-zinc-200">Presidio + spaCy</div>
          <p className="text-[10px] text-zinc-500">en_core_web_sm lightweight</p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-1">
          <span className="text-[10px] uppercase text-zinc-500 font-semibold">
            Hard Privacy Rule
          </span>
          <div className="font-bold text-emerald-400">Zero Plaintext Logs</div>
          <p className="text-[10px] text-zinc-500">No prompt text persisted</p>
        </div>
      </div>

      {/* 6-Stage Pipeline Specification Inspector */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-zinc-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
              6-Stage Pipeline Specification
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            Select a stage to view execution code & telemetry
          </span>
        </div>

        {/* Step Selector Pills */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          {steps.map((s) => (
            <button
              key={s.num}
              onClick={() => setActiveStep(s.num)}
              className={`rounded px-2.5 py-1 text-[11px] transition-colors border ${
                activeStep === s.num
                  ? "border-zinc-700 bg-zinc-800 text-zinc-100 font-semibold"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {s.short}
            </button>
          ))}
        </div>

        {/* Active Stage Details */}
        {(() => {
          const current = steps.find((s) => s.num === activeStep) || steps[0];
          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pt-1 font-mono text-xs">
              <div className="lg:col-span-5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
                    STAGE {current.num} OF 6
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {current.badge}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-zinc-100">
                  {current.title}
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  {current.desc}
                </p>

                <div className="flex items-center gap-2 pt-1 text-[11px]">
                  <button
                    onClick={() => setActiveStep((prev) => (prev > 1 ? prev - 1 : 6))}
                    className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-400 hover:text-zinc-200"
                  >
                    &larr; Prev
                  </button>
                  <button
                    onClick={() => setActiveStep((prev) => (prev < 6 ? prev + 1 : 1))}
                    className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-200 hover:bg-zinc-800"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="rounded-lg border border-zinc-800 bg-black p-3 font-mono text-xs text-zinc-300 overflow-x-auto">
                  <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-zinc-800 text-[10px] text-zinc-500">
                    <span>TELEMETRY STAGE {current.num}</span>
                    <span className="text-emerald-400">SPEC COMPLIANT</span>
                  </div>
                  <pre className="text-zinc-300 whitespace-pre leading-relaxed text-[11px]">
                    {current.code}
                  </pre>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Architecture Comparison: Direct LLM vs Aegis Zero-Trust */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-zinc-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Architecture Comparison Matrix
            </h3>
          </div>

          <div className="flex items-center rounded border border-zinc-800 bg-zinc-900 p-0.5 text-[11px]">
            <button
              onClick={() => setComparisonTab("with")}
              className={`px-2 py-0.5 rounded transition-colors ${
                comparisonTab === "with"
                  ? "bg-zinc-800 text-zinc-100 font-semibold"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              With Aegis Proxy (Zero-Trust)
            </button>
            <button
              onClick={() => setComparisonTab("without")}
              className={`px-2 py-0.5 rounded transition-colors ${
                comparisonTab === "without"
                  ? "bg-zinc-800 text-rose-400 font-semibold"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Without Aegis (Direct LLM)
            </button>
          </div>
        </div>

        {comparisonTab === "with" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 space-y-1">
              <div className="font-bold text-zinc-200 flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Reversible HKDF Vault</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                Plaintext encrypted with session keys. RAM stores only ciphertext; upstream sees only placeholders.
              </p>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 space-y-1">
              <div className="font-bold text-zinc-200 flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Prompt Injection Firewall</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                Instruction overrides, jailbreak phrases, and secret dumps are dropped at perimeter (zero tokens sent).
              </p>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 space-y-1">
              <div className="font-bold text-zinc-200 flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Enforced Server-Side RBAC</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                Admins see decrypted text; viewers see safe pseudonyms. Role derived server-side from API key.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="rounded border border-rose-900/40 bg-rose-950/10 p-3 space-y-1">
              <div className="font-bold text-rose-300 flex items-center gap-1.5 text-xs">
                <XCircle className="h-3.5 w-3.5 text-rose-400" />
                <span>Plaintext PII Exfiltration</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                Aadhaar, PAN, and credentials travel in plaintext to third-party model servers and telemetry logs.
              </p>
            </div>
            <div className="rounded border border-rose-900/40 bg-rose-950/10 p-3 space-y-1">
              <div className="font-bold text-rose-300 flex items-center gap-1.5 text-xs">
                <XCircle className="h-3.5 w-3.5 text-rose-400" />
                <span>Unmitigated Jailbreaks</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                DAN overrides, persona manipulation, and data exfiltration execute directly against the model.
              </p>
            </div>
            <div className="rounded border border-rose-900/40 bg-rose-950/10 p-3 space-y-1">
              <div className="font-bold text-rose-300 flex items-center gap-1.5 text-xs">
                <XCircle className="h-3.5 w-3.5 text-rose-400" />
                <span>Zero Role Segregation</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                All consumers, contractors, and downstream apps receive identical raw sensitive PII in responses.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Engineering Constraints & Rationale */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2 font-mono text-xs">
        <h4 className="font-bold uppercase tracking-wider text-zinc-300 text-[11px]">
          Engineering Constraints & Architecture Decisions
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-zinc-400 font-sans pt-1">
          <div>
            <strong className="text-zinc-200 font-mono">Single Worker Process:</strong> Run with <code className="text-zinc-300 font-mono">--workers 1</code> so in-memory encrypted vault and audit ring buffer stay consistent across requests.
          </div>
          <div>
            <strong className="text-zinc-200 font-mono">Stream Rejection:</strong> <code className="text-zinc-300 font-mono">stream=true</code> returns 400 Bad Request because full-buffer analysis is required for PII redaction.
          </div>
          <div>
            <strong className="text-zinc-200 font-mono">spaCy Memory Limit:</strong> Strict use of <code className="text-zinc-300 font-mono">en_core_web_sm</code> keeps total memory footprint under Render&apos;s 512MB RAM boundary.
          </div>
        </div>
      </div>
    </div>
  );
}
