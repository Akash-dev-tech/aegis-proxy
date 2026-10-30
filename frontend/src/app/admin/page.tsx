"use client";

import React, { useState, useEffect } from "react";
import {
  Lock,
  Unlock,
  Activity,
  Server,
  Cpu,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Terminal,
  Shield,
} from "lucide-react";
import { useAegis } from "@/context/AegisContext";
import { AuditTable } from "@/components/AuditTable";

interface LLMStatusData {
  mode: string;
  model: string;
  base_host: string;
}

export default function AdminPage() {
  const { role, setRole, sessionId, openLoginModal } = useAegis();

  // Upstream LLM Status State
  const [llmStatus, setLlmStatus] = useState<LLMStatusData | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);

  // Unmask Tester State
  const [testMaskedText, setTestMaskedText] = useState(
    "Verified loan account for <PERSON_1> (Tax ID: <IN_PAN_1>)."
  );
  const [testSessionId, setTestSessionId] = useState("");
  const [unmaskResult, setUnmaskResult] = useState<string | null>(null);
  const [unmaskLoading, setUnmaskLoading] = useState(false);
  const [unmaskError, setUnmaskError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId && !testSessionId) {
      setTestSessionId(sessionId);
    }
  }, [sessionId, testSessionId]);

  async function fetchLLMStatus() {
    if (role !== "admin") return;
    setLlmLoading(true);
    setLlmError(null);

    try {
      const res = await fetch("/api/aegis/llm-status", {
        headers: { "X-User-Role": role },
      });
      const data = await res.json();
      if (!res.ok) {
        setLlmError(data.error || "Failed to query LLM status");
        return;
      }
      setLlmStatus(data);
    } catch {
      setLlmError("Network error querying upstream LLM status");
    } finally {
      setLlmLoading(false);
    }
  }

  useEffect(() => {
    if (role === "admin") {
      fetchLLMStatus();
    }
  }, [role]);

  async function handleTestUnmask() {
    if (!testMaskedText.trim()) return;
    setUnmaskLoading(true);
    setUnmaskError(null);
    setUnmaskResult(null);

    try {
      const res = await fetch("/api/aegis/unmask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": role,
        },
        body: JSON.stringify({
          masked_text: testMaskedText,
          session_id: testSessionId || sessionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setUnmaskError(data.error || "Unmasking failed");
        return;
      }
      setUnmaskResult(data.unmasked_text);
    } catch {
      setUnmaskError("Network error contacting unmask endpoint");
    } finally {
      setUnmaskLoading(false);
    }
  }

  if (role !== "admin") {
    return (
      <div className="py-12">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center max-w-md mx-auto space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-semibold text-zinc-100 font-mono">
            Administrator Authentication Required
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed font-mono">
            The security administration console, audit telemetry, and vault unmasking tools require admin privileges.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setRole("admin")}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <Unlock className="h-3.5 w-3.5" />
              <span>Switch to Admin in Top Bar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <h1 className="text-base font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Activity className="h-4 w-4 text-zinc-400" />
            Security Administration & Audit Console
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Audit logging ring buffer, upstream Groq connectivity, and encrypted vault diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-emerald-400">
            <Unlock className="h-3 w-3" />
            Admin Role Active
          </span>
        </div>
      </div>

      {/* Upstream LLM Status Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-zinc-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
              Upstream LLM Gateway Telemetry
            </h3>
          </div>
          <button
            onClick={fetchLLMStatus}
            disabled={llmLoading}
            className="flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] font-mono text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${llmLoading ? "animate-spin text-zinc-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {llmError && (
          <div className="rounded border border-rose-900/60 bg-rose-950/20 p-2 text-xs text-rose-300 font-mono">
            {llmError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 space-y-1">
            <span className="text-[10px] uppercase text-zinc-500 font-semibold">
              Operating Mode
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  llmStatus?.mode === "groq"
                    ? "bg-emerald-400"
                    : "bg-zinc-400"
                }`}
              />
              <span className="font-bold text-zinc-100 capitalize">
                {llmStatus?.mode || "Loading..."}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">
              {llmStatus?.mode === "groq"
                ? "Live requests route to Groq LPU API"
                : "Deterministic mock active (offline fallback)"}
            </p>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 space-y-1">
            <span className="text-[10px] uppercase text-zinc-500 font-semibold">
              Configured Model
            </span>
            <div className="font-bold text-zinc-200 text-xs">
              {llmStatus?.model || "llama-3.3-70b-versatile"}
            </div>
            <p className="text-[10px] text-zinc-500">
              LLM_DEFAULT_MODEL in backend config
            </p>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3 space-y-1">
            <span className="text-[10px] uppercase text-zinc-500 font-semibold">
              Upstream Base Host
            </span>
            <div className="font-bold text-zinc-200 text-xs">
              {llmStatus?.base_host || "api.groq.com"}
            </div>
            <p className="text-[10px] text-zinc-500">
              Strictly env-configured (SSRF protected)
            </p>
          </div>
        </div>
      </div>

      {/* Main Audit Table */}
      <AuditTable
        role={role}
        onOpenAdminModal={openLoginModal}
        onSwitchRole={setRole}
      />

      {/* Diagnostic Vault Unmasking Widget */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2.5">
          <Eye className="h-4 w-4 text-zinc-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 font-mono">
            Vault Placeholder Unmasking Diagnostic
          </h3>
        </div>

        <p className="text-xs text-zinc-400 font-mono leading-relaxed">
          Test manual restoration of pseudonymized tokens (<code className="text-zinc-300">&lt;PERSON_1&gt;</code>) using in-memory HKDF+Fernet AES keys for the active session.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end font-mono text-xs">
          <div className="md:col-span-8 space-y-1">
            <label className="text-[11px] text-zinc-400">Masked Text String</label>
            <input
              type="text"
              value={testMaskedText}
              onChange={(e) => setTestMaskedText(e.target.value)}
              className="w-full rounded border border-zinc-800 bg-zinc-900 p-2 text-xs text-zinc-200 focus:border-zinc-600 focus:outline-none"
            />
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <button
              onClick={handleTestUnmask}
              disabled={unmaskLoading || !testMaskedText.trim()}
              className="w-full flex items-center justify-center gap-1.5 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              {unmaskLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
              <span>Decrypt Placeholders</span>
            </button>
          </div>
        </div>

        {unmaskError && (
          <div className="rounded border border-rose-900/60 bg-rose-950/20 p-2 text-xs text-rose-300 font-mono">
            {unmaskError}
          </div>
        )}

        {unmaskResult && (
          <div className="rounded border border-zinc-800 bg-black p-3 font-mono text-xs text-zinc-200 space-y-1">
            <div className="text-[10px] text-emerald-400 font-bold">DECRYPTED TEXT (AES-128-CBC RESTORED):</div>
            <div>{unmaskResult}</div>
          </div>
        )}
      </div>
    </div>
  );
}
