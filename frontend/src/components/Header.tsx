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
  Terminal,
  Activity,
  Cpu,
} from "lucide-react";
import { useAegis } from "@/context/AegisContext";
import { PolicyMode } from "@/lib/validation";

export function Header() {
  const pathname = usePathname();
  const {
    role,
    setRole,
    policy,
    sessionId,
    backendStatus,
    vaultSessions,
    setPolicy,
    rotateSession,
  } = useAegis();

  const navLinks = [
    { href: "/demo", label: "Playground", icon: Cpu },
    { href: "/admin", label: "Audit Logs", icon: Activity, lock: role !== "admin" },
    { href: "/connect", label: "API Quickstart", icon: Terminal },
    { href: "/", label: "Architecture", icon: Shield },
  ];

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        {/* Top Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 group-hover:border-zinc-700 transition-colors">
              <Shield className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-zinc-100">
                Aegis Proxy
              </span>
              <span className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.2 text-[10px] font-mono text-zinc-400">
                v1.0
              </span>
            </div>
          </Link>

          {/* Controls: Health, Vault, Session, Policy, Role */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Backend Health Dot */}
            <div
              className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-1 text-zinc-300"
              title="FastAPI Backend Health"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  backendStatus === "operational"
                    ? "bg-emerald-400"
                    : backendStatus === "checking"
                    ? "bg-zinc-400 animate-pulse"
                    : "bg-amber-400 animate-pulse"
                }`}
              />
              <span className="font-mono text-[11px] text-zinc-300">
                {backendStatus === "operational" ? "Live" : "Warming"}
              </span>
            </div>

            {/* Active Vault Sessions */}
            <div
              className="hidden md:flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-1 text-zinc-400 font-mono text-[11px]"
              title="Active in-memory cryptographic sessions"
            >
              <Server className="h-3 w-3 text-zinc-500" />
              <span>Vault:</span>
              <span className="text-zinc-200 font-semibold">{vaultSessions}</span>
            </div>

            {/* Session ID + Rotate */}
            <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-900/80 overflow-hidden text-[11px] font-mono">
              <div className="flex items-center gap-1 px-2 py-1 text-zinc-400">
                <span className="text-zinc-500">Sess:</span>
                <span className="text-zinc-300">
                  {sessionId ? `${sessionId.slice(0, 8)}...` : "--"}
                </span>
              </div>
              <button
                onClick={rotateSession}
                title="Rotate to new isolated cryptographic session"
                className="border-l border-zinc-800 px-1.5 py-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>

            {/* Policy Selector */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-1 text-[11px]">
              <Layers className="h-3 w-3 text-zinc-500" />
              <label htmlFor="policy-select" className="text-zinc-500">
                Policy:
              </label>
              <select
                id="policy-select"
                value={policy}
                onChange={(e) => setPolicy(e.target.value as PolicyMode)}
                className="bg-transparent font-mono text-zinc-200 focus:outline-none cursor-pointer text-[11px]"
              >
                <option value="replace" className="bg-zinc-900 text-zinc-200">
                  replace (Vault)
                </option>
                <option value="redact" className="bg-zinc-900 text-zinc-200">
                  redact ([REDACTED])
                </option>
                <option value="hash" className="bg-zinc-900 text-zinc-200">
                  hash (HMAC)
                </option>
                <option value="block" className="bg-zinc-900 text-zinc-200">
                  block (Firewall)
                </option>
              </select>
            </div>

            {/* Monochromatic Role Switcher */}
            <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-900/90 p-0.5">
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold transition-all ${
                  role === "admin"
                    ? "bg-zinc-800 text-emerald-400 border border-zinc-700 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Unlock className="h-3 w-3" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("viewer")}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold transition-all ${
                  role === "viewer"
                    ? "bg-zinc-800 text-zinc-200 border border-zinc-700 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Lock className="h-3 w-3" />
                <span>Viewer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dense Navigation Tabs */}
        <nav className="mt-2.5 flex items-center space-x-1 border-t border-zinc-900 pt-1.5 overflow-x-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-zinc-900 text-zinc-100 border border-zinc-700/80 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{link.label}</span>
                {link.lock && (
                  <Lock className="h-2.5 w-2.5 text-zinc-600 ml-0.5" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
