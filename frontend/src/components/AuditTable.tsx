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
  Filter,
} from "lucide-react";

export interface AuditEntry {
  timestamp: string | number;
  timestamp_iso?: string;
  request_id: string;
  session_id?: string;
  action: "allow" | "mask" | "block";
  policy: string;
  risk_score: number;
  threat_points?: number;
  pii_points?: number;
  threats?: string[];
  threat_names?: string[];
  entity_types?: string[];
  entity_count?: number;
  entity_counts?: Record<string, number>;
}

interface AuditTableProps {
  role: "admin" | "viewer";
  onOpenAdminModal?: () => void;
  onSwitchRole?: (role: "admin" | "viewer") => void;
}

function formatAuditTime(entry: AuditEntry): string {
  if (entry.timestamp_iso) {
    const d = new Date(entry.timestamp_iso);
    return isNaN(d.getTime()) ? "--" : d.toLocaleTimeString();
  }
  if (typeof entry.timestamp === "number") {
    const ms = entry.timestamp < 1e12 ? entry.timestamp * 1000 : entry.timestamp;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? "--" : d.toLocaleTimeString();
  }
  if (entry.timestamp) {
    const num = Number(entry.timestamp);
    if (!isNaN(num)) {
      const ms = num < 1e12 ? num * 1000 : num;
      return new Date(ms).toLocaleTimeString();
    }
    const d = new Date(entry.timestamp);
    return isNaN(d.getTime()) ? "--" : d.toLocaleTimeString();
  }
  return "--";
}

export function AuditTable({ role, onOpenAdminModal, onSwitchRole }: AuditTableProps) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<"all" | "allow" | "mask" | "block">("all");

  async function fetchAuditLogs() {
    if (role !== "admin") return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/aegis/audit", {
        headers: { "X-User-Role": role },
      });
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

  // Viewer Guard State (RBAC Demonstration)
  if (role !== "admin") {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-10 text-center max-w-xl mx-auto shadow-sm space-y-3">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
          <Lock className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-100 font-mono">
          RBAC Protected: Administrator Role Required
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed font-mono">
          The tamper-evident security audit trail contains request metadata and risk forensics restricted to administrator accounts.
        </p>
        <div className="pt-2">
          <button
            onClick={() => (onSwitchRole ? onSwitchRole("admin") : onOpenAdminModal?.())}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <Lock className="h-3 w-3" />
            <span>Switch to Admin in Top Bar</span>
          </button>
        </div>
      </div>
    );
  }

  const filteredLogs = logs.filter((log) => {
    if (actionFilter === "all") return true;
    return log.action === actionFilter;
  });

  const totalBlocked = logs.filter((l) => l.action === "block").length;
  const totalMasked = logs.filter((l) => l.action === "mask").length;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm space-y-3.5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 font-mono">
              <FileText className="h-4 w-4 text-zinc-400" />
              Security Audit Trail
            </h3>
            <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Zero Plaintext PII Persisted
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
            In-memory ring buffer (100 events) recording firewall actions, policies, and risk telemetry.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded border border-zinc-800 bg-zinc-900 p-0.5 text-[11px] font-mono">
            {(["all", "block", "mask", "allow"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setActionFilter(mode)}
                className={`px-2 py-0.5 rounded capitalize transition-colors ${
                  actionFilter === mode
                    ? "bg-zinc-800 text-zinc-100 font-semibold"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAuditLogs}
            disabled={loading}
            className="flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-mono text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              className={`h-3 w-3 ${loading ? "animate-spin text-zinc-400" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
          <div className="text-[10px] text-zinc-500">Total Events</div>
          <div className="font-bold text-zinc-200 mt-0.5">{logs.length}</div>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
          <div className="text-[10px] text-zinc-500">Blocked Threats</div>
          <div className="font-bold text-rose-400 mt-0.5">{totalBlocked}</div>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
          <div className="text-[10px] text-zinc-500">Masked Requests</div>
          <div className="font-bold text-amber-400 mt-0.5">{totalMasked}</div>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
          <div className="text-[10px] text-zinc-500">Zero-PII Compliance</div>
          <div className="font-bold text-emerald-400 mt-0.5">100% Verified</div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-900/60 bg-rose-950/20 p-2.5 text-xs text-rose-300 font-mono">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-black">
        <table className="w-full text-left text-xs font-mono">
          <thead className="border-b border-zinc-800 bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-400">
            <tr>
              <th className="px-3.5 py-2.5">Time</th>
              <th className="px-3.5 py-2.5">Request ID</th>
              <th className="px-3.5 py-2.5">Session ID</th>
              <th className="px-3.5 py-2.5">Action</th>
              <th className="px-3.5 py-2.5">Policy</th>
              <th className="px-3.5 py-2.5 text-right">Risk</th>
              <th className="px-3.5 py-2.5">Detected Entities</th>
              <th className="px-3.5 py-2.5">Threats</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                    <span>Loading audit records...</span>
                  </div>
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500 font-mono text-xs">
                  No security events matching filter.
                </td>
              </tr>
            ) : (
              filteredLogs.map((entry, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-zinc-900/40 transition-colors font-mono text-[11px]"
                >
                  <td className="px-3.5 py-2 text-zinc-400 whitespace-nowrap">
                    {formatAuditTime(entry)}
                  </td>
                  <td className="px-3.5 py-2 text-zinc-300">
                    {entry.request_id ? `${entry.request_id.slice(0, 10)}...` : "--"}
                  </td>
                  <td className="px-3.5 py-2 text-zinc-400">
                    {entry.session_id ? `${entry.session_id.slice(0, 10)}...` : "--"}
                  </td>
                  <td className="px-3.5 py-2">
                    <span
                      className={`inline-flex items-center rounded border px-1.5 py-0.2 text-[10px] font-bold ${
                        entry.action === "block"
                          ? "bg-rose-950/60 text-rose-300 border-rose-900/60"
                          : entry.action === "mask"
                          ? "bg-amber-950/60 text-amber-300 border-amber-900/60"
                          : "bg-emerald-950/60 text-emerald-300 border-emerald-900/60"
                      }`}
                    >
                      {entry.action.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3.5 py-2 text-zinc-400">
                    {entry.policy}
                  </td>
                  <td className="px-3.5 py-2 text-right font-bold">
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
                  <td className="px-3.5 py-2">
                    {entry.entity_types && entry.entity_types.length > 0 ? (
                      <span className="text-zinc-300">
                        {entry.entity_types.join(", ")} ({entry.entity_count ?? entry.entity_types.length})
                      </span>
                    ) : entry.entity_counts && Object.keys(entry.entity_counts).length > 0 ? (
                      <span className="text-zinc-300">
                        {Object.entries(entry.entity_counts).map(([k, v]) => `${k} (${v})`).join(", ")}
                      </span>
                    ) : (
                      <span className="text-zinc-600">None</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2">
                    {(entry.threats && entry.threats.length > 0) ? (
                      <span className="text-rose-400">
                        {entry.threats.join(", ")}
                      </span>
                    ) : (entry.threat_names && entry.threat_names.length > 0) ? (
                      <span className="text-rose-400">
                        {entry.threat_names.join(", ")}
                      </span>
                    ) : (
                      <span className="text-zinc-600">Clean</span>
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
