"use client";

import React from "react";
import { Playground } from "@/components/Playground";
import { useAegis } from "@/context/AegisContext";
import { Shield, Sparkles } from "lucide-react";

export default function DemoPage() {
  const {
    role,
    policy,
    sessionId,
    backendStatus,
    openLoginModal,
    setPolicy,
  } = useAegis();

  return (
    <div className="space-y-6 py-2 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-cyan-400" />
            Interactive Aegis Firewall & Masking Demo
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Test Indian KYC PII detection, reversible unmasking, prompt injection gating, and live Groq LLM proxying.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-300 flex items-center gap-2">
            <span className="text-slate-500">Active Role:</span>
            <span
              className={`font-semibold font-mono ${
                role === "admin" ? "text-emerald-400" : "text-cyan-400"
              }`}
            >
              {role.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <Playground
        role={role}
        policy={policy}
        sessionId={sessionId}
        backendReady={backendStatus === "operational"}
        onOpenAdminModal={openLoginModal}
        onPolicyChange={setPolicy}
      />
    </div>
  );
}
