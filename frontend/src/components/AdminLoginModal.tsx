"use client";

import React, { useState } from "react";
import { Lock, X, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import { useAegis } from "@/context/AegisContext";

interface AdminLoginModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function AdminLoginModal(props: AdminLoginModalProps) {
  const aegis = useAegis();
  const isOpen = props.isOpen !== undefined ? props.isOpen : aegis.isLoginModalOpen;
  const onClose = props.onClose || aegis.closeLoginModal;
  const onSuccess = props.onSuccess || aegis.checkAdminAuth;

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
      await onSuccess();
      onClose();
    } catch {
      setError("Network error: Could not reach authentication service");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-3.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 font-mono">
              Admin Authentication
            </h3>
            <p className="text-[11px] text-zinc-500 font-mono">
              Master password required
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded border border-rose-900/60 bg-rose-950/20 px-2.5 py-1.5 text-xs text-rose-300 font-mono">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 font-mono text-xs">
          <div>
            <label
              htmlFor="admin-password"
              className="block text-[11px] text-zinc-400 mb-1"
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter master password..."
              className="w-full rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
              required
            />
            <p className="mt-1 text-[10px] text-zinc-500">
              Demo master password: <code className="text-zinc-300">admin</code>
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-100 text-zinc-950 px-3 py-1.5 text-xs font-semibold hover:bg-white disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              <span>{loading ? "Verifying..." : "Unlock Admin"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
