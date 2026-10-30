"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  Lock,
  Unlock,
  RefreshCw,
  Server,
  Layers,
  Sparkles,
  Plug,
  FileText,
  Activity,
} from "lucide-react";
import { useAegis } from "@/context/AegisContext";
import { PolicyMode } from "@/lib/validation";

export function Header() {
  const pathname = usePathname();
  const {
    role,
    policy,
    sessionId,
    backendStatus,
    vaultSessions,
    setPolicy,
    openLoginModal,
    handleLogout,
    rotateSession,
  } = useAegis();

  const navLinks = [
    { href: "/", label: "How it Works", icon: Sparkles },
    { href: "/demo", label: "Live Demo", icon: Shield },
    { href: "/connect", label: "Connect", icon: Plug },
    { href: "/admin", label: "Admin", icon: Activity, lock: role !== "admin" },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Product Title */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 group-hover:scale-105 group-hover:border-cyan-400/50 transition-all glow-shield">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  Aegis <span className="text-cyan-400">Proxy</span>
                </h1>
                <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-mono font-medium text-cyan-400">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Reversible PII Pseudonymization & Threat Firewall
              </p>
            </div>
          </Link>

          {/* Status & Session Control Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            {/* Backend Health Badge */}
            <div
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-medium transition-colors ${
                backendStatus === "operational"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : backendStatus === "checking"
                  ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }`}
              title="FastAPI Backend Health"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  backendStatus === "operational"
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-amber-400 animate-ping"
                }`}
              />
              <span>
                {backendStatus === "operational"
                  ? "Backend: Live"
                  : backendStatus === "checking"
                  ? "Checking..."
                  : "Backend waking up..."}
              </span>
            </div>

            {/* Active Vault Sessions */}
            <div
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-slate-300"
              title="Encrypted in-memory HKDF+Fernet active sessions"
            >
              <Server className="h-3.5 w-3.5 text-cyan-400" />
              <span>Vault Sessions:</span>
              <span className="font-mono font-semibold text-cyan-300">
                {vaultSessions}
              </span>
            </div>

            {/* Session ID Badge + Rotate */}
            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/90 overflow-hidden">
              <div className="flex items-center gap-1 px-2.5 py-1.5 text-slate-300">
                <span className="text-slate-400">Session:</span>
                <span className="font-mono text-cyan-300">
                  {sessionId ? `${sessionId.slice(0, 10)}...` : "init..."}
                </span>
              </div>
              <button
                onClick={rotateSession}
                title="Rotate to new cryptographically-isolated session ID"
                className="border-l border-slate-800 px-2 py-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>

            {/* Policy Selector */}
            <div className="hidden sm:flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <label htmlFor="policy-select" className="text-slate-400 mr-1">
                Policy:
              </label>
              <select
                id="policy-select"
                value={policy}
                onChange={(e) => setPolicy(e.target.value as PolicyMode)}
                className="bg-transparent font-mono text-cyan-300 focus:outline-none cursor-pointer text-xs"
              >
                <option value="replace" className="bg-slate-900 text-slate-200">
                  replace (Reversible)
                </option>
                <option value="redact" className="bg-slate-900 text-slate-200">
                  redact ([REDACTED])
                </option>
                <option value="hash" className="bg-slate-900 text-slate-200">
                  hash (HMAC-SHA256)
                </option>
                <option value="block" className="bg-slate-900 text-slate-200">
                  block (Firewall)
                </option>
              </select>
            </div>

            {/* Role Switcher */}
            {role === "admin" ? (
              <div className="flex items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                <Unlock className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                <span className="font-semibold mr-2">Admin</span>
                <button
                  onClick={handleLogout}
                  className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={openLoginModal}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 font-medium text-slate-300 hover:border-cyan-500/50 hover:bg-slate-800 hover:text-cyan-300 transition-all"
              >
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>Viewer</span>
                <span className="rounded bg-slate-700 px-1 text-[10px] text-slate-400">
                  Unlock
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="mt-4 flex items-center space-x-1 border-t border-slate-800/60 pt-2 overflow-x-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-950 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {link.label}
                {link.lock && (
                  <Lock className="h-3 w-3 text-slate-500 ml-0.5" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
