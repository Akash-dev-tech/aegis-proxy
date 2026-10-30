"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Shield,
  ArrowRight,
  Lock,
  Eye,
  Server,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Cpu,
  RefreshCw,
  Terminal,
  Database,
  FileCheck,
} from "lucide-react";

export default function HomePage() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [comparisonTab, setComparisonTab] = useState<"without" | "with">("with");

  const steps = [
    {
      num: 1,
      title: "1. Zero-Trust Intercept",
      short: "Intercept",
      desc: "Incoming requests hit /v1/chat/completions or /api/v1/mask. Client role (admin vs viewer) is derived server-side from the API key; callers can only downgrade permissions, never escalate.",
      badge: "OpenAI Wire Compatible",
      code: `POST /v1/chat/completions
Authorization: Bearer aegis_live_key
X-Session-Id: sess_984a1...
{
  "messages": [{"role": "user", "content": "Process tax refund for Rahul Sharma (PAN: ABCDE1234F)"}]
}`,
    },
    {
      num: 2,
      title: "2. Multi-Vector Threat Scan",
      short: "Threat Scan",
      desc: "Dual regex and ML heuristics evaluate prompt injection (+45 pts), jailbreak (+45 pts), data exfiltration (+40 pts), and secret leaks (+50 pts). SQLi is intentionally removed to focus strictly on LLM risks.",
      badge: "Regex + ML Guards",
      code: `Threat Analysis:
- Prompt Injection: 0 pts
- Jailbreak: 0 pts
- Data Exfiltration: 0 pts
- Secret Leak: 0 pts
Threat Score: 0 / 100`,
    },
    {
      num: 3,
      title: "3. Presidio + spaCy NER Scan",
      short: "PII Detection",
      desc: "High-sensitivity (Aadhaar, PAN, UPI, API keys = +15 pts) and medium-sensitivity (Person, Phone, Email, Location = +8 pts) entities are identified with exact character offsets. PII points are capped at 40.",
      badge: "High & Medium Entities",
      code: `Entities Detected:
- PERSON: "Rahul Sharma" (indices 23..35) -> +8 pts
- IN_PAN: "ABCDE1234F" (indices 43..53) -> +15 pts
PII Points: 23 pts (Cap: 40 pts)`,
    },
    {
      num: 4,
      title: "4. Explicit Decision Formula",
      short: "Decision Engine",
      desc: "risk_score = min(100, threat_points + pii_points). If risk >= 70 or threat >= 45, request is blocked. If 0 < risk < 70, entities are masked into consistent placeholders (<PERSON_1>, <IN_PAN_1>).",
      badge: "Formula Driven",
      code: `Risk Score: 0 + 23 = 23 / 100
Threshold Check: 0 < 23 < 70 -> ACTION: MASK
Policy Applied: "replace" (Reversible Fernet HKDF Vault)
Placeholder Map:
  "Rahul Sharma" -> <PERSON_1>
  "ABCDE1234F"  -> <IN_PAN_1>`,
    },
    {
      num: 5,
      title: "5. Sanitized Upstream to Groq LPU",
      short: "Upstream LLM",
      desc: "Sanitized prompt is forwarded to Groq (llama-3.3-70b-versatile) with an uneditable server-side system hint instructing the model to strictly preserve placeholders. Upstream LLM NEVER sees plaintext PII.",
      badge: "Groq LPU (Zero Raw PII)",
      code: `[SYSTEM]: CRITICAL: Preserve placeholders <PERSON_1>, <IN_PAN_1> verbatim.
[USER]: Process tax refund for <PERSON_1> (PAN: <IN_PAN_1>)
--- Upstream Groq Response ---
[ASSISTANT]: Tax refund for <PERSON_1> (tax ID <IN_PAN_1>) is approved.`,
    },
    {
      num: 6,
      title: "6. Output Scan & Role-Based Reveal",
      short: "Output Scan & Unmask",
      desc: "Response is scanned for newly generated secrets before delivery. For Admin role, placeholders are resolved from the in-memory Fernet-HKDF vault. For Viewer role, placeholders remain masked.",
      badge: "Role-Based Restored",
      code: `Output Scan: 0 new secrets leaked.
Admin Delivery (Reversible):
  "Tax refund for Rahul Sharma (tax ID ABCDE1234F) is approved."
Viewer Delivery (Zero-Trust Masked):
  "Tax refund for <PERSON_1> (tax ID <IN_PAN_1>) is approved."`,
    },
  ];

  return (
    <div className="space-y-16 py-4 animate-in fade-in duration-300">
      {/* Hero Section */}
      <section className="relative text-center max-w-4xl mx-auto space-y-6 pt-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-400">
          <Shield className="h-3.5 w-3.5" />
          <span>Zero-Trust LLM Privacy Gateway</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
          Reversible PII Pseudonymization &{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
            Threat Firewall
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          A drop-in, OpenAI-compatible reverse proxy that strips sensitive PII, neutralizes prompt injections, forwards sanitized prompts to Groq, and safely unmasks replies for authorized admins.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/demo"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all hover:scale-[1.02]"
          >
            <Shield className="h-4 w-4" />
            <span>Try Live Demo</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/connect"
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-6 py-3 text-sm font-semibold text-slate-200 hover:border-cyan-500/40 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Terminal className="h-4 w-4 text-cyan-400" />
            <span>Connect in 2 Lines</span>
          </Link>
        </div>

        {/* Quick Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 text-left">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
            <div className="text-cyan-400 font-bold text-base">Reversible</div>
            <div className="text-xs text-slate-400 mt-0.5">HKDF + Fernet AES vault</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
            <div className="text-cyan-400 font-bold text-base">Groq Upstream</div>
            <div className="text-xs text-slate-400 mt-0.5">llama-3.3-70b-versatile</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
            <div className="text-cyan-400 font-bold text-base">Zero Raw Logs</div>
            <div className="text-xs text-slate-400 mt-0.5">Hard privacy constraints</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
            <div className="text-cyan-400 font-bold text-base">Drop-In Proxy</div>
            <div className="text-xs text-slate-400 mt-0.5">Works with OpenAI SDK</div>
          </div>
        </div>
      </section>

      {/* 6-Step Pipeline Breakdown */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            How Aegis Proxy Protects Your Pipeline
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Every request passes through an automated 6-stage defense ring before touching upstream model providers.
          </p>
        </div>

        {/* Step Selector Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {steps.map((s) => (
            <button
              key={s.num}
              onClick={() => setActiveStep(s.num)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                activeStep === s.num
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30 scale-105"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {s.short}
            </button>
          ))}
        </div>

        {/* Active Step Card */}
        {(() => {
          const current = steps.find((s) => s.num === activeStep) || steps[0];
          return (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-mono font-semibold text-cyan-400">
                    Step {current.num} of 6
                  </span>
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300">
                    {current.badge}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  {current.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {current.desc}
                </p>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setActiveStep((prev) => (prev > 1 ? prev - 1 : 6))}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                  >
                    &larr; Previous Step
                  </button>
                  <button
                    onClick={() => setActiveStep((prev) => (prev < 6 ? prev + 1 : 1))}
                    className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20"
                  >
                    Next Step &rarr;
                  </button>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 shadow-inner overflow-x-auto">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-[11px] text-slate-500">
                    <span>STAGE {current.num} EXECUTION TELEMETRY</span>
                    <span className="text-cyan-400">STATUS: VERIFIED</span>
                  </div>
                  <pre className="text-cyan-300/90 whitespace-pre leading-relaxed font-mono">
                    {current.code}
                  </pre>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* Without Aegis vs With Aegis Interactive Toggle */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Architecture Comparison
          </h2>
          <p className="text-sm text-slate-400">
            See the security difference between direct LLM calls and Aegis-shielded traffic.
          </p>

          <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900/90 p-1 mt-3">
            <button
              onClick={() => setComparisonTab("without")}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                comparisonTab === "without"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Without Aegis Proxy (Standard Direct Call)
            </button>
            <button
              onClick={() => setComparisonTab("with")}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                comparisonTab === "with"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              With Aegis Proxy (Protected Gateway)
            </button>
          </div>
        </div>

        {comparisonTab === "without" ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/10 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-lg">
              <XCircle className="h-6 w-6 shrink-0" />
              <span>Vulnerable Direct LLM Architecture</span>
            </div>
            <p className="text-sm text-slate-300">
              When client apps connect directly to cloud LLM providers, plain-text PII is logged in upstream server traces, fine-tuning caches, and public transcripts.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="rounded-xl border border-rose-900/40 bg-slate-950/70 p-4 space-y-2">
                <div className="font-semibold text-rose-300 text-sm">PII Leakage</div>
                <p className="text-xs text-slate-400">
                  Aadhaar, PAN, phone numbers, and customer names travel unencrypted to third-party model data centers.
                </p>
              </div>
              <div className="rounded-xl border border-rose-900/40 bg-slate-950/70 p-4 space-y-2">
                <div className="font-semibold text-rose-300 text-sm">Prompt Injection Risk</div>
                <p className="text-xs text-slate-400">
                  Instruction overrides, jailbreak phrases, and system extraction attacks run directly on the LLM without firewall gating.
                </p>
              </div>
              <div className="rounded-xl border border-rose-900/40 bg-slate-950/70 p-4 space-y-2">
                <div className="font-semibold text-rose-300 text-sm">No Role Segregation</div>
                <p className="text-xs text-slate-400">
                  All viewers, external contractors, and downstream consumers see identical raw sensitive outputs.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
              <CheckCircle2 className="h-6 w-6 shrink-0" />
              <span>Aegis Shielded Zero-Trust Architecture</span>
            </div>
            <p className="text-sm text-slate-300">
              Aegis acts as a zero-knowledge reverse proxy. Only sanitized tokens leave your perimeter, while plaintext values remain encrypted in isolated RAM sessions.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="rounded-xl border border-emerald-900/40 bg-slate-950/70 p-4 space-y-2">
                <div className="font-semibold text-emerald-300 text-sm">Reversible HKDF Vault</div>
                <p className="text-xs text-slate-400">
                  Plaintext is encrypted with per-session Fernet keys derived from HKDF. Memory dicts store only ciphertext blobs.
                </p>
              </div>
              <div className="rounded-xl border border-emerald-900/40 bg-slate-950/70 p-4 space-y-2">
                <div className="font-semibold text-emerald-300 text-sm">Threat Firewall</div>
                <p className="text-xs text-slate-400">
                  Attacks with risk score &ge; 70 or threat &ge; 45 are blocked immediately. Zero tokens sent upstream.
                </p>
              </div>
              <div className="rounded-xl border border-emerald-900/40 bg-slate-950/70 p-4 space-y-2">
                <div className="font-semibold text-emerald-300 text-sm">Airtight RBAC</div>
                <p className="text-xs text-slate-400">
                  Admins see restored text; viewers see safely masked placeholders. X-User-Role can only downgrade permissions.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Trust Claims & Honest Limitations */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Trust Claims & Honest Engineering Limitations
          </h2>
          <p className="text-xs text-slate-400">
            Transparency on what Aegis Proxy guarantees today and our technical trade-offs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Guaranteed Guarantees */}
          <div className="space-y-3">
            <h4 className="font-semibold text-emerald-400 flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              What Aegis Solves
            </h4>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">&bull;</span>
                <span><strong>Zero Plaintext Logging:</strong> Neither raw prompts nor vault secrets are ever written to console, disk logs, or audit tables.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">&bull;</span>
                <span><strong>Reversible Pseudonymization:</strong> Exact mapping between original entities and placeholders preserved across multi-turn dialogs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">&bull;</span>
                <span><strong>Offline Mock Fallback:</strong> If no LLM API key is configured, an intelligent deterministic mock replies while testing offline.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">&bull;</span>
                <span><strong>Fail-Closed Production Defense:</strong> Backend refuses to boot if demo hashes or default secrets are detected in production.</span>
              </li>
            </ul>
          </div>

          {/* Current Limitations */}
          <div className="space-y-3">
            <h4 className="font-semibold text-amber-400 flex items-center gap-1.5 text-sm">
              <AlertTriangle className="h-4 w-4" />
              Current Engineering Limitations
            </h4>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">&bull;</span>
                <span><strong>No Streaming (stream=true):</strong> Presidio entity scanning and output leak redaction require the complete response buffer before delivery. Requests with stream=true return 400 Bad Request.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">&bull;</span>
                <span><strong>Free-Tier Memory Ceiling:</strong> Uses spaCy <code className="text-cyan-400">en_core_web_sm</code> (~45MB) to remain strictly under Render's 512MB RAM cap. Never deploy <code className="text-amber-400">en_core_web_lg</code> on free tier.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">&bull;</span>
                <span><strong>Latency Overhead:</strong> Presidio NER analysis adds approximately 50-120ms per prompt turn depending on document length.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">&bull;</span>
                <span><strong>Single Worker Process:</strong> In-memory vault requires <code className="text-cyan-400">--workers 1</code> unless backed by distributed Redis.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="text-center space-y-4 py-6 border-t border-slate-800/80">
        <h3 className="text-xl font-bold text-white">Ready to test Aegis Proxy?</h3>
        <div className="flex justify-center gap-4">
          <Link
            href="/demo"
            className="rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
          >
            Launch Interactive Demo &rarr;
          </Link>
          <Link
            href="/connect"
            className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            View Code Integrations
          </Link>
        </div>
      </section>
    </div>
  );
}
