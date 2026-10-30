"use client";

import React, { useState } from "react";
import { Copy, Check, Terminal, Code2 } from "lucide-react";

export function CodeSnippets() {
  const [lang, setLang] = useState<"python" | "node" | "curl">("python");
  const [copied, setCopied] = useState(false);

  const snippets = {
    python: `from openai import OpenAI

# Point your existing OpenAI client directly to Aegis Proxy
client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="your-aegis-api-key",  # Or your production API key
    default_headers={
        "X-Session-Id": "session-prod-alpha-42",
        "X-Policy-Mode": "replace",  # replace, redact, hash, or block
    }
)

# Standard OpenAI Chat Completion call
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {
            "role": "user",
            "content": "Verify Aadhaar 4123 4567 8901 and PAN ABCDE1234F for Rahul Sharma."
        }
    ],
    stream=False  # Streaming is rejected to guarantee full PII & threat scanning
)

# Assistant response automatically handles pseudonymized tokens safely
print(response.choices[0].message.content)
print("Aegis Security Risk Score:", response.aegis_security.get("risk_score"))`,

    node: `import OpenAI from "openai";

// Configure official OpenAI SDK with Aegis Firewall endpoint
const client = new OpenAI({
  baseURL: "http://localhost:8000/v1",
  apiKey: "your-aegis-api-key",
  defaultHeaders: {
    "X-Session-Id": "session-prod-alpha-42",
    "X-Policy-Mode": "replace", // Reversible placeholder pseudonymization
  },
});

async function main() {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: "Process UPI payout to rahul@upi for amount 5000 INR."
      }
    ],
    stream: false
  });

  console.log("Safe Assistant Reply:", completion.choices[0].message.content);
}

main();`,

    curl: `# 1. Scan and pseudonymize raw prompt text
curl -X POST http://localhost:8000/api/v1/mask \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "X-Session-Id: my-session-123" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Contact Rahul Sharma at +91 9876543210 regarding PAN ABCDE1234F.",
    "policy": "replace"
  }'

# 2. OpenAI-Compatible Chat Completion via Aegis Firewall
curl -X POST http://localhost:8000/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "X-Session-Id: my-session-123" \\
  -H "X-Policy-Mode: replace" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Hello Rahul Sharma, your PAN is ABCDE1234F."}
    ],
    "stream": false
  }'

# 3. Retrieve security audit log (Admin only)
curl -X GET http://localhost:8000/api/v1/audit \\
  -H "X-API-Key: YOUR_ADMIN_KEY"`,
  };

  function handleCopy() {
    navigator.clipboard.writeText(snippets[lang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Code2 className="h-5 w-5 text-cyan-400" />
            Developer SDK & Integration Guide
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Drop-in replacement for OpenAI SDKs. Forward requests through Aegis Proxy with zero code refactoring.
          </p>
        </div>

        {/* Language Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
          <button
            onClick={() => setLang("python")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              lang === "python"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Python SDK
          </button>
          <button
            onClick={() => setLang("node")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              lang === "node"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Node.js / TS
          </button>
          <button
            onClick={() => setLang("curl")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
              lang === "curl"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            cURL CLI
          </button>
        </div>
      </div>

      {/* Code Block Container */}
      <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4">
        <button
          onClick={handleCopy}
          className="absolute right-4 top-4 flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>

        <pre className="font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed pt-2">
          {snippets[lang]}
        </pre>
      </div>
    </div>
  );
}
