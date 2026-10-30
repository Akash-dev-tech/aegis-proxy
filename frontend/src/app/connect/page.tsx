"use client";

import React, { useState, useEffect } from "react";
import {
  Terminal,
  Copy,
  Check,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileCode,
  Zap,
} from "lucide-react";

export default function ConnectPage() {
  const [activeTab, setActiveTab] = useState<"python" | "node" | "curl" | "langchain" | "http">("python");
  const [copied, setCopied] = useState(false);
  const [proxyBaseUrl, setProxyBaseUrl] = useState("http://localhost:8000/v1");

  // Dynamic base URL detection
  useEffect(() => {
    if (typeof window !== "undefined") {
      setProxyBaseUrl(`${window.location.origin}/v1`);
    }
  }, []);

  // Interactive Connection Test State
  const [testEndpoint, setTestEndpoint] = useState<"chat" | "mask" | "health" | "models">("chat");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testLatency, setTestLatency] = useState<number | null>(null);

  const snippets = {
    python: `from openai import OpenAI

# 1. Point standard OpenAI SDK to Aegis Proxy
client = OpenAI(
    base_url="${proxyBaseUrl}",       # Or your deployed Render URL
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
  baseURL: "${proxyBaseUrl}",
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
    stream: false, // Streaming rejected (400) to ensure full PII verification
  });

  console.log("Safe Assistant Reply:", completion.choices[0]?.message?.content);
}

main();`,

    curl: `# 1. Direct OpenAI-Compatible Chat Completion via Aegis Firewall
curl -X POST ${proxyBaseUrl}/chat/completions \\
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
curl -X POST ${proxyBaseUrl.replace('/v1', '')}/api/v1/mask \\
  -H "X-API-Key: YOUR_AEGIS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Call Rahul Sharma at +91 9876543210 regarding Aadhaar 2345 6789 0123",
    "policy": "replace"
  }'

# 3. Upstream LLM Health Status (Admin Key Required)
curl -X GET ${proxyBaseUrl.replace('/v1', '')}/api/v1/llm-status \\
  -H "X-API-Key: YOUR_ADMIN_KEY"`,

    langchain: `from langchain_openai import ChatOpenAI

# Drop-in replacement for LangChain ChatOpenAI
llm = ChatOpenAI(
    base_url="${proxyBaseUrl}",
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
Host: ${proxyBaseUrl.replace(/https?:\/\//, '').replace(/\/v1$/, '')}
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
      let res: Response;
      if (testEndpoint === "chat") {
        res = await fetch("/api/aegis/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content:
                  "Verify KYC for Rahul Sharma (PAN: ABCDE1234F, Aadhaar: 4123 4567 8901). Disbursing funds to rahul@oksbi.",
              },
            ],
            policy: "replace",
          }),
        });
      } else if (testEndpoint === "mask") {
        res = await fetch("/api/aegis/mask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: "Customer Rahul Sharma with PAN ABCDE1234F transferred funds to rahul@oksbi. Phone: +91 9876543210",
            policy: "replace",
          }),
        });
      } else if (testEndpoint === "models") {
        res = await fetch("/api/aegis/models");
      } else {
        res = await fetch("/api/aegis/health");
      }

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
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-3">
        <h1 className="text-base font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <Terminal className="h-4 w-4 text-zinc-400" />
          Developer Quickstart & SDK Integration
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Aegis implements the standard OpenAI wire specification. Change <code className="text-zinc-300 font-mono">base_url</code> to route requests through the threat firewall.
        </p>
      </div>

      {/* 2-Step Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-zinc-200">
            <span className="flex h-4 w-4 items-center justify-center rounded bg-zinc-800 text-[10px] text-zinc-400">1</span>
            <span>API Key & Roles</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
            Caller role is derived server-side from the API key. External clients use <code className="text-zinc-300">demo-viewer-key</code> (safe masked tokens). Internal services use <code className="text-zinc-300">demo-admin-key</code> for reversible decryption.
          </p>
          <div className="rounded border border-zinc-800/80 bg-zinc-900/60 p-2 text-[10px] text-zinc-400 space-y-0.5">
            <div><span className="text-emerald-400 font-bold">Admin:</span> demo-admin-key (Reversible unmasking)</div>
            <div><span className="text-zinc-300 font-bold">Viewer:</span> demo-viewer-key (Zero PII revealed)</div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-zinc-200">
            <span className="flex h-4 w-4 items-center justify-center rounded bg-zinc-800 text-[10px] text-zinc-400">2</span>
            <span>Configure Base URL</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
            Set client SDK <code className="text-zinc-300">base_url</code> to your Aegis proxy endpoint. Standard chat requests to <code className="text-zinc-300">/v1/chat/completions</code> are sanitized and forwarded to Groq.
          </p>
          <div className="rounded border border-zinc-800/80 bg-zinc-900/60 p-2 text-[10px] text-zinc-400 space-y-0.5">
            <div><span className="text-zinc-300 font-bold">Detected Host:</span> {proxyBaseUrl}</div>
            <div><span className="text-zinc-500 font-bold">Local URL:</span> http://localhost:8000/v1</div>
          </div>
        </div>
      </div>

      {/* Code Snippets Section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-zinc-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
              SDK Integration Snippets
            </h3>
          </div>

          {/* Language Tabs */}
          <div className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 p-0.5 font-mono text-xs">
            {(["python", "node", "curl", "langchain", "http"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveTab(lang)}
                className={`rounded px-2.5 py-0.5 text-[11px] font-medium transition-colors capitalize ${
                  activeTab === lang
                    ? "bg-zinc-800 text-zinc-100 font-semibold"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {lang === "node" ? "Node / TS" : lang}
              </button>
            ))}
          </div>
        </div>

        {/* Code Box */}
        <div className="relative rounded-lg border border-zinc-800 bg-black p-3.5 font-mono text-xs overflow-x-auto">
          <button
            onClick={handleCopy}
            className="absolute right-3 top-3 flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3 text-zinc-400" />
            )}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          <pre className="text-zinc-300 whitespace-pre leading-relaxed text-[11px]">
            {snippets[activeTab]}
          </pre>
        </div>
      </div>

      {/* Interactive Live Endpoint Tester */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-zinc-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
              Test Developer Endpoint Live
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            Verify response headers & aegis_security metadata
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center font-mono text-xs">
          <div className="md:col-span-8 flex items-center gap-2">
            <label className="text-[11px] text-zinc-500 whitespace-nowrap">Endpoint:</label>
            <select
              value={testEndpoint}
              onChange={(e) =>
                setTestEndpoint(
                  e.target.value as "chat" | "mask" | "health" | "models"
                )
              }
              className="w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none"
            >
              <option value="chat">
                POST /v1/chat/completions (Live Groq Completion + PII Guard)
              </option>
              <option value="mask">
                POST /api/v1/mask (Standalone Presidio Masking Engine)
              </option>
              <option value="health">
                GET /health (Backend Status & Vault Sessions)
              </option>
              <option value="models">
                GET /v1/models (Upstream Model Roster)
              </option>
            </select>
          </div>

          <div className="md:col-span-4 flex items-center justify-end">
            <button
              onClick={runConnectionTest}
              disabled={testStatus === "testing"}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              {testStatus === "testing" ? (
                <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
              ) : (
                <Zap className="h-3 w-3 text-zinc-400" />
              )}
              <span>Run Live Test</span>
            </button>
          </div>
        </div>

        {testStatus !== "idle" && (
          <div className="rounded-lg border border-zinc-800 bg-black p-3 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                {testStatus === "success" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : testStatus === "error" ? (
                  <XCircle className="h-3.5 w-3.5 text-rose-400" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 text-zinc-400 animate-spin" />
                )}
                <span
                  className={
                    testStatus === "success"
                      ? "text-emerald-400 font-semibold"
                      : "text-rose-400 font-semibold"
                  }
                >
                  {testStatus === "success"
                    ? "200 OK — Execution Succeeded"
                    : testStatus === "error"
                    ? "Request Failed"
                    : "Executing..."}
                </span>
              </div>
              {testLatency !== null && (
                <span className="text-zinc-500 text-[10px]">
                  Latency: {testLatency}ms
                </span>
              )}
            </div>
            <pre className="text-zinc-300 overflow-x-auto whitespace-pre max-h-56 leading-relaxed text-[11px]">
              {testResponse || "Awaiting response..."}
            </pre>
          </div>
        )}
      </div>

      {/* Custom Request Headers Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
          <FileCode className="h-4 w-4 text-zinc-400" />
          Custom Request Headers
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase">
                <th className="py-2 px-3">Header Name</th>
                <th className="py-2 px-3">Allowed Values</th>
                <th className="py-2 px-3">Behavior & Enforcement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300 text-[11px]">
              <tr>
                <td className="py-2 px-3 font-bold text-zinc-200">X-Session-Id</td>
                <td className="py-2 px-3 text-zinc-400">string (e.g. sess_abc123)</td>
                <td className="py-2 px-3 text-zinc-400 font-sans">
                  Isolates in-memory vault. Within a session, the exact same raw PII always maps to the same placeholder (<code className="text-zinc-300 font-mono">&lt;PERSON_1&gt;</code>).
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-zinc-200">X-User-Role</td>
                <td className="py-2 px-3 text-zinc-400">viewer | admin</td>
                <td className="py-2 px-3 text-zinc-400 font-sans">
                  <strong>Downgrade Only:</strong> An admin key passing <code className="text-zinc-300 font-mono">viewer</code> operates in viewer mode. A viewer key passing admin stays viewer.
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-zinc-200">X-Policy-Mode</td>
                <td className="py-2 px-3 text-zinc-400">replace | redact | hash | block</td>
                <td className="py-2 px-3 text-zinc-400 font-sans">
                  Controls strategy: <code className="text-zinc-300 font-mono">replace</code> (reversible Fernet vault), <code className="text-zinc-300 font-mono">redact</code> ([REDACTED]), <code className="text-zinc-300 font-mono">hash</code> (HMAC), or <code className="text-zinc-300 font-mono">block</code> (firewall drop).
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* HTTP Error Codes Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-zinc-400" />
          HTTP Status Codes & Firewall Error Formats
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase">
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Error Code</th>
                <th className="py-2 px-3">Trigger Condition & Mitigation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300 text-[11px]">
              <tr>
                <td className="py-2 px-3 font-bold text-emerald-400">200 OK</td>
                <td className="py-2 px-3 text-zinc-400">success</td>
                <td className="py-2 px-3 text-zinc-400 font-sans">
                  OpenAI Chat Completion format with appended <code className="text-zinc-300 font-mono">aegis_security</code> payload containing risk score, detected entities, and threat metadata.
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-amber-400">400 Bad Request</td>
                <td className="py-2 px-3 text-zinc-400">stream_unsupported</td>
                <td className="py-2 px-3 text-zinc-400 font-sans">
                  Triggered when <code className="text-zinc-300 font-mono">&quot;stream&quot;: true</code> is passed. Streaming is rejected because full-buffer PII scanning requires complete payload.
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-rose-400">403 Forbidden</td>
                <td className="py-2 px-3 text-zinc-400">content_policy_violation</td>
                <td className="py-2 px-3 text-zinc-400 font-sans">
                  Firewall dropped prompt: Threat score &ge; 40 (prompt injection, jailbreak, data exfiltration, secret leak). Zero text dispatched upstream.
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-amber-400">429 Rate Limit</td>
                <td className="py-2 px-3 text-zinc-400">rate_limit_exceeded</td>
                <td className="py-2 px-3 text-zinc-400 font-sans">
                  Client exceeded sliding-window rate limit (default: 30 req/min per key). Response includes standard <code className="text-zinc-300 font-mono">Retry-After</code> header.
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold text-rose-400">502 Bad Gateway</td>
                <td className="py-2 px-3 text-zinc-400">upstream_auth_error</td>
                <td className="py-2 px-3 text-zinc-400 font-sans">
                  Upstream Groq authentication failed or upstream returned 5xx. Sanitized error response returns without leaking server keys.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
