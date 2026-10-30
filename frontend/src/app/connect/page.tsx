"use client";

import React, { useState } from "react";
import {
  Plug,
  Terminal,
  Copy,
  Check,
  Server,
  Key,
  ShieldAlert,
  AlertTriangle,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileCode,
} from "lucide-react";

export default function ConnectPage() {
  const [activeTab, setActiveTab] = useState<"python" | "node" | "curl" | "langchain" | "http">("python");
  const [copied, setCopied] = useState(false);

  // Interactive Connection Test State
  const [testEndpoint, setTestEndpoint] = useState<"health" | "models">("health");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testLatency, setTestLatency] = useState<number | null>(null);

  const snippets = {
    python: `from openai import OpenAI

# 1. Point standard OpenAI SDK to Aegis Proxy
client = OpenAI(
    base_url="http://localhost:8000/v1",       # Or your deployed Render URL
    api_key="YOUR_AEGIS_KEY",                 # demo-admin-key or demo-viewer-key
    default_headers={
        "X-Session-Id": "sess_analytics_42",  # Keeps PII consistent across turns
        "X-Policy-Mode": "replace",           # replace, redact, hash, or block
    }
)

# 2. Standard Chat Completion Call (Groq llama-3.3-70b-versatile)
response = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[
        {"role": "user", "content": "Process payroll for Rahul Sharma (PAN: ABCDE1234F)"}
    ],
    stream=False  # Required: stream=false allows complete response PII scanning
)

# Admin role receives restored unmasked text; viewer receives safe placeholders
print("Assistant Reply:", response.choices[0].message.content)

# Access Aegis security audit telemetry
sec_meta = getattr(response, "aegis_security", {})
print("Aegis Action:", sec_meta.get("action"))
print("Risk Score:", sec_meta.get("risk_score"))`,

    node: `import OpenAI from "openai";

// 1. Initialize OpenAI client with Aegis Proxy endpoint
const client = new OpenAI({
  baseURL: "http://localhost:8000/v1",
  apiKey: process.env.AEGIS_API_KEY || "YOUR_AEGIS_KEY",
  defaultHeaders: {
    "X-Session-Id": "sess_node_production_99",
    "X-Policy-Mode": "replace",
  },
});

async function main() {
  // 2. Dispatch chat completion through Aegis firewall
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "user", content: "Transfer 5000 INR to UPI rahul@oksbi for Rahul Sharma" }
    ],
    stream: false, // Streaming is rejected (400) to ensure full PII verification
  });

  console.log("Safe Assistant Reply:", completion.choices[0]?.message?.content);
}

main();`,

    curl: `# 1. Direct OpenAI-Compatible Chat Completion via Aegis Firewall
curl -X POST http://localhost:8000/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_AEGIS_KEY" \\
  -H "Content-Type: application/json" \\
  -H "X-Session-Id: my-cli-session-123" \\
  -H "X-Policy-Mode: replace" \\
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [
      {"role": "user", "content": "Customer Priya Patel with PAN ABCDE1234F requested loan status."}
    ],
    "stream": false
  }'

# 2. Standalone PII Masking Endpoint
curl -X POST http://localhost:8000/api/v1/mask \\
  -H "X-API-Key: YOUR_AEGIS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Call Rahul Sharma at +91 9876543210 regarding Aadhaar 2345 6789 0123",
    "policy": "replace"
  }'

# 3. Upstream LLM Health Status (Admin Key Required)
curl -X GET http://localhost:8000/api/v1/llm-status \\
  -H "X-API-Key: YOUR_ADMIN_KEY"`,

    langchain: `from langchain_openai import ChatOpenAI

# Drop-in replacement for LangChain ChatOpenAI
llm = ChatOpenAI(
    base_url="http://localhost:8000/v1",
    api_key="YOUR_AEGIS_KEY",
    model="llama-3.3-70b-versatile",
    default_headers={
        "X-Session-Id": "langchain_session_1",
        "X-Policy-Mode": "replace",
    },
    streaming=False
)

# Run standard LCEL chain
response = llm.invoke("Summarize credit report for Rahul Sharma (PAN: ABCDE1234F)")
print(response.content)`,

    http: `POST /v1/chat/completions HTTP/1.1
Host: localhost:8000
Authorization: Bearer YOUR_AEGIS_KEY
Content-Type: application/json
X-Session-Id: custom-app-session-01
X-Policy-Mode: replace

{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    {
      "role": "user",
      "content": "Verify Aadhaar 2345 6789 0123 for Rahul Sharma"
    }
  ],
  "stream": false
}`,
  };

  function handleCopy() {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function runConnectionTest() {
    setTestStatus("testing");
    setTestResponse(null);
    setTestLatency(null);
    const start = performance.now();

    try {
      const url = testEndpoint === "health" ? "/api/aegis/health" : "/api/aegis/models";
      const res = await fetch(url);
      const elapsed = Math.round(performance.now() - start);
      setTestLatency(elapsed);

      const data = await res.json();
      setTestResponse(JSON.stringify(data, null, 2));

      if (res.ok) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
      }
    } catch {
      setTestStatus("error");
      setTestResponse("Connection failed: Could not reach Aegis backend service.");
    }
  }

  return (
    <div className="space-y-12 py-2 animate-in fade-in duration-300">
      {/* Header */}
      <div className="space-y-2 border-b border-slate-800/80 pb-4">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-0.5 text-xs font-semibold text-cyan-400">
          <Plug className="h-3.5 w-3.5" />
          <span>Quickstart Integration</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Connect Your App in 2 Lines
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl">
          Aegis Proxy implements the OpenAI API wire specification. Replace your client <code className="text-cyan-400">base_url</code> and pass your Aegis key to gain instant PII pseudonymization and threat protection.
        </p>
      </div>

      {/* 2-Step Setup Walkthrough */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-mono">1</span>
            <span>Choose Your API Key Role</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your role is derived server-side from your API key. External clients should use <code className="text-cyan-300">demo-viewer-key</code> to only see masked placeholders. Internal services use <code className="text-cyan-300">demo-admin-key</code> for full reversible unmasking.
          </p>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-slate-400 space-y-1">
            <div><span className="text-emerald-400">Admin Key:</span> demo-admin-key (Reversible unmasking)</div>
            <div><span className="text-cyan-400">Viewer Key:</span> demo-viewer-key (Zero PII revealed)</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-mono">2</span>
            <span>Set Proxy Base URL</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Configure your client's OpenAI SDK <code className="text-cyan-300">base_url</code> to point to your Aegis instance. All chat completions sent to <code className="text-cyan-300">/v1/chat/completions</code> are transparently sanitized and forwarded to Groq.
          </p>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-slate-400 space-y-1">
            <div><span className="text-slate-500">Localhost:</span> http://localhost:8000/v1</div>
            <div><span className="text-slate-500">Render Free Tier:</span> https://your-aegis-app.onrender.com/v1</div>
          </div>
        </div>
      </div>

      {/* Code Snippets Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">SDK Code Examples</h3>
          </div>

          {/* Language Tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800">
            {(["python", "node", "curl", "langchain", "http"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveTab(lang)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-all capitalize ${
                  activeTab === lang
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {lang === "node" ? "TypeScript / Node" : lang}
              </button>
            ))}
          </div>
        </div>

        {/* Code Box with Copy Button */}
        <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs overflow-x-auto shadow-inner">
          <button
            onClick={handleCopy}
            className="absolute right-3 top-3 flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-[11px] text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 transition-all"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copied ? "Copied" : "Copy Code"}</span>
          </button>
          <pre className="text-slate-200 whitespace-pre leading-relaxed font-mono">
            {snippets[activeTab]}
          </pre>
        </div>
      </div>

      {/* Interactive Connection Tester Widget */}
      <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">
              Test Connection & Upstream Verification
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Test backend connectivity right from your browser
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5 flex items-center gap-2">
            <label className="text-xs text-slate-400 whitespace-nowrap">Endpoint:</label>
            <select
              value={testEndpoint}
              onChange={(e) => setTestEndpoint(e.target.value as "health" | "models")}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="health">GET /health (Backend Liveness & Vault Sessions)</option>
              <option value="models">GET /v1/models (Upstream Model Roster)</option>
            </select>
          </div>

          <div className="md:col-span-7 flex items-center justify-end gap-3">
            <button
              onClick={runConnectionTest}
              disabled={testStatus === "testing"}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition-all shadow-md shadow-cyan-950"
            >
              {testStatus === "testing" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              <span>Run Live Connection Ping</span>
            </button>
          </div>
        </div>

        {testStatus !== "idle" && (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px]">
              <div className="flex items-center gap-2">
                {testStatus === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : testStatus === "error" ? (
                  <XCircle className="h-4 w-4 text-rose-400" />
                ) : (
                  <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
                )}
                <span className={testStatus === "success" ? "text-emerald-300 font-semibold" : "text-rose-300 font-semibold"}>
                  {testStatus === "success" ? "Connection Successful (200 OK)" : testStatus === "error" ? "Connection Failed" : "Testing..."}
                </span>
              </div>
              {testLatency !== null && (
                <span className="text-slate-400">Response Time: {testLatency}ms</span>
              )}
            </div>
            <pre className="text-cyan-300/90 overflow-x-auto whitespace-pre max-h-48">
              {testResponse || "Awaiting response..."}
            </pre>
          </div>
        )}
      </div>

      {/* Custom Headers Reference Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <FileCode className="h-4 w-4 text-cyan-400" />
          Custom HTTP Request Headers
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-2.5 px-3">Header Name</th>
                <th className="py-2.5 px-3">Allowed Values</th>
                <th className="py-2.5 px-3">Behavior & Enforcement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
              <tr>
                <td className="py-2.5 px-3 text-cyan-300 font-bold">X-Session-Id</td>
                <td className="py-2.5 px-3 text-slate-400">Arbitrary string (e.g. sess_abc123)</td>
                <td className="py-2.5 px-3 font-sans text-xs">
                  Groups requests into an isolated cryptographic vault. Within a session, the exact same raw PII always maps to the same placeholder (<code className="text-cyan-400">&lt;PERSON_1&gt;</code>).
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-cyan-300 font-bold">X-User-Role</td>
                <td className="py-2.5 px-3 text-slate-400">viewer | admin</td>
                <td className="py-2.5 px-3 font-sans text-xs">
                  <strong>Downgrade Only:</strong> An admin key passing <code className="text-cyan-400">viewer</code> operates in viewer mode. A viewer key passing <code className="text-rose-400">admin</code> is ignored and stays viewer.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-cyan-300 font-bold">X-Policy-Mode</td>
                <td className="py-2.5 px-3 text-slate-400">replace | redact | hash | block</td>
                <td className="py-2.5 px-3 font-sans text-xs">
                  Controls PII replacement strategy: <code className="text-cyan-400">replace</code> (reversible Fernet vault), <code className="text-cyan-400">redact</code> ([REDACTED]), <code className="text-cyan-400">hash</code> (HMAC-SHA256), or <code className="text-cyan-400">block</code> (firewall drop).
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Behavior & Error Codes Reference Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-cyan-400" />
          HTTP Status Codes & Firewall Error Formats
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-2.5 px-3">Status Code</th>
                <th className="py-2.5 px-3">Error Type</th>
                <th className="py-2.5 px-3">Trigger Condition & Mitigation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
              <tr>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">200 OK</td>
                <td className="py-2.5 px-3 text-slate-400">Success</td>
                <td className="py-2.5 px-3 font-sans text-xs">
                  OpenAI Chat Completion format with appended <code className="text-cyan-400">aegis_security</code> payload containing risk score, detected entities, and threat metadata.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-amber-400 font-bold">400 Bad Request</td>
                <td className="py-2.5 px-3 text-slate-400">stream_unsupported</td>
                <td className="py-2.5 px-3 font-sans text-xs">
                  Triggered when <code className="text-amber-300">&quot;stream&quot;: true</code> is passed. Aegis rejects streaming because full-buffer PII scanning and leak redaction require the complete payload.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-rose-400 font-bold">400 Bad Request</td>
                <td className="py-2.5 px-3 text-slate-400">content_policy_violation</td>
                <td className="py-2.5 px-3 font-sans text-xs">
                  Firewall dropped prompt: Risk score &ge; 70 or threat score &ge; 45 (e.g. prompt injection, secret leak). Zero text dispatched upstream.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-amber-400 font-bold">429 Too Many Requests</td>
                <td className="py-2.5 px-3 text-slate-400">rate_limit_exceeded</td>
                <td className="py-2.5 px-3 font-sans text-xs">
                  Client exceeded sliding-window rate limit (default: 30 requests/minute per key). Response includes standard <code className="text-cyan-400">Retry-After</code> header.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-rose-400 font-bold">502 Bad Gateway</td>
                <td className="py-2.5 px-3 text-slate-400">upstream_auth_error</td>
                <td className="py-2.5 px-3 font-sans text-xs">
                  Upstream Groq authentication failed or upstream returned 5xx. Sanitized error response returns without leaking server keys.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Warning Notice */}
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <div className="font-semibold text-rose-300">
            Mandatory Client Security Rule
          </div>
          <p className="text-slate-300 leading-relaxed">
            NEVER embed <code className="text-rose-400 font-mono">demo-admin-key</code> in client-side browser bundles, public single-page apps, or mobile packages. Public clients must only connect through server-side route handlers or hold low-privilege <code className="text-cyan-400 font-mono">demo-viewer-key</code> credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
