"use client";

import React, { useState, useEffect } from "react";
import {
  Lock,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface AuditEntry {
  timestamp: string;
  request_id: string;
  session_id: string;
  action: "allow" | "mask" | "block";
  policy: string;
  risk_score: number;
  threat_points: number;
  pii_points: number;
  threats: string[];
  entity_types: string[];
  entity_count: number;
}

interface AuditTableProps {
  role: "admin" | "viewer";
  onOpenAdminModal: () => void;
}

export function AuditTable({ role, onOpenAdminModal }: AuditTableProps) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchAuditLogs() {
    if (role !== "admin") return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/aegis/audit");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load audit logs");
        return;
      }

      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setError("Network error fetching security audit logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (role === "admin") {
      fetchAuditLogs();
    }
  }, [role]);

  // Viewer Guard State
  if (role !== "admin") {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center max-w-2xl mx-auto shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4">
          <Lock className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-100 mb-2">
          Admin Access Required
        </h3>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Public visitors can test prompt masking in the Playground, but the
          immutable security audit log contains event metadata, risk scores, and
          threat forensics restricted strictly to verified administrators.
        </p>
        <button
          onClick={onOpenAdminModal}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-950"
        >
          <Lock className="h-4 w-4" />
          Unlock Administrator View
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" />
              Tamper-Evident Security Audit Trail
            </h3>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-medium text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Zero Plaintext PII Stored
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            In-memory ring buffer (100 events) recording firewall actions and risk telemetry.
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`}
          />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
        <table className="w-full text-left text-xs font-mono">
          <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 font-sans">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Request ID</th>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Policy</th>
              <th className="px-4 py-3 text-right">Risk Score</th>
              <th className="px-4 py-3">Entities</th>
              <th className="px-4 py-3">Threats</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    <span>Loading audit records...</span>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500 font-sans">
                  No security events recorded in the current session yet.
                </td>
              </tr>
            ) : (
              logs.map((entry, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-900/60 transition-colors font-mono"
                >
                  <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : "--"}
                  </td>
                  <td className="px-4 py-2.5 text-cyan-400">
                    {entry.request_id ? `${entry.request_id.slice(0, 8)}...` : "--"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">
                    {entry.session_id ? `${entry.session_id.slice(0, 8)}...` : "--"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold ${
                        entry.action === "block"
                          ? "bg-rose-500/10 text-rose-300 border border-rose-500/30"
                          : entry.action === "mask"
                          ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                      }`}
                    >
                      {entry.action.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">
                    {entry.policy}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold">
                    <span
                      className={
                        entry.risk_score >= 70
                          ? "text-rose-400"
                          : entry.risk_score >= 30
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }
                    >
                      {entry.risk_score}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {entry.entity_types && entry.entity_types.length > 0 ? (
                      <span className="text-cyan-300">
                        {entry.entity_types.join(", ")} ({entry.entity_count})
                      </span>
                    ) : (
                      <span className="text-slate-600">None</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {entry.threats && entry.threats.length > 0 ? (
                      <span className="text-amber-400">
                        {entry.threats.join(", ")}
                      </span>
                    ) : (
                      <span className="text-slate-600">Clean</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
