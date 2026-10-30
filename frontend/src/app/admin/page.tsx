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
  const { role, openLoginModal, sessionId } = useAegis();

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
      const res = await fetch("/api/aegis/llm-status");
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
        headers: { "Content-Type": "application/json" },
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
      <div className="py-12 animate-in fade-in duration-300">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center max-w-xl mx-auto shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-5">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Administrator Authentication Required
          </h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            The Admin Console, audit telemetry, and vault unmasking tester require verified administrator credentials. Login with your master password to unlock access.
          </p>
          <button
            onClick={openLoginModal}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-xs font-semibold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all hover:scale-105"
          >
            <Lock className="h-4 w-4" />
            <span>Unlock Administrator Console</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-2 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-cyan-400" />
            Security Administration & Audit Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Zero-knowledge telemetry, upstream Groq connectivity, and encrypted vault diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            <Unlock className="h-3.5 w-3.5 text-emerald-400" />
            Admin Role Active
          </span>
        </div>
      </div>

      {/* Upstream LLM Status Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Cpu className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">
              Upstream LLM Gateway Telemetry
            </h3>
          </div>
          <button
            onClick={fetchLLMStatus}
            disabled={llmLoading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${llmLoading ? "animate-spin text-cyan-400" : ""}`} />
            <span>Refresh Status</span>
          </button>
        </div>

        {llmError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {llmError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Operating Mode
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  llmStatus?.mode === "groq"
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-cyan-400"
                }`}
              />
              <span className="font-mono text-base font-bold text-white capitalize">
                {llmStatus?.mode || "Loading..."}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {llmStatus?.mode === "groq"
                ? "Live requests route to Groq LPU API"
                : "Deterministic mock active (offline fallback)"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Default Model
            </span>
            <div className="font-mono text-sm font-bold text-cyan-300">
              {llmStatus?.model || "llama-3.3-70b-versatile"}
            </div>
            <p className="text-[11px] text-slate-500">
              Configured via LLM_DEFAULT_MODEL
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Upstream Base Host
            </span>
            <div className="font-mono text-sm font-bold text-slate-200">
              {llmStatus?.base_host || "api.groq.com"}
            </div>
            <p className="text-[11px] text-slate-500">
              Strictly env-configured (SSRF protected)
            </p>
          </div>
        </div>
      </div>

      {/* Unmask Tester Widget */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Eye className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">
              Vault Placeholder Unmasking Diagnostic
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Tests HKDF key derivation & decryption against session vault
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Target Session ID
              </label>
              <input
                type="text"
                value={testSessionId}
                onChange={(e) => setTestSessionId(e.target.value)}
                placeholder="sess_..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Text Containing Placeholders
              </label>
              <textarea
                value={testMaskedText}
                onChange={(e) => setTestMaskedText(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleTestUnmask}
              disabled={unmaskLoading || !testMaskedText.trim()}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50 transition-colors"
            >
              {unmaskLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              <span>Decrypt & Unmask Text</span>
            </button>
          </div>

          <div className="flex flex-col space-y-2">
            <span className="text-xs font-medium text-slate-400">
              Decrypted Vault Output
            </span>
            <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 overflow-y-auto min-h-[140px]">
              {unmaskError ? (
                <span className="text-rose-400">{unmaskError}</span>
              ) : unmaskResult !== null ? (
                <span className="text-emerald-300">{unmaskResult}</span>
              ) : (
                <span className="text-slate-600">
                  Click &quot;Decrypt & Unmask Text&quot; to inspect unmasking results. Known placeholders mapped during masking will be restored; hallucinated placeholders will remain unchanged.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Security Audit Trail Table */}
      <AuditTable role="admin" onOpenAdminModal={openLoginModal} />
    </div>
  );
}
