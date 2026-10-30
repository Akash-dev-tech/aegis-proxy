"use client";

import React, { useState } from "react";
import { Lock, X, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminLoginModal({
  isOpen,
  onClose,
  onSuccess,
}: AdminLoginModalProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/aegis/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed");
        return;
      }

      setPassword("");
      onSuccess();
      onClose();
    } catch {
      setError("Network error: Could not reach authentication service");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">
              Admin Authentication
            </h3>
            <p className="text-xs text-slate-400">
              Unlock reversible unmasking and audit telemetry
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs text-rose-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              Master Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter administrator password..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
              required
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Default demo credential: <code className="text-cyan-400 font-mono">admin</code>
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              HttpOnly Secure Cookie
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !password}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-50 transition-all shadow-md shadow-cyan-900/30"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Authenticate
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
