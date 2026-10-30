"use client";

import React from "react";
import { Playground } from "@/components/Playground";
import { useAegis } from "@/context/AegisContext";
import { Shield } from "lucide-react";

export default function DemoPage() {
  const {
    role,
    policy,
    sessionId,
    backendStatus,
    openLoginModal,
    setPolicy,
    toggleRole,
  } = useAegis();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <h1 className="text-base font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Shield className="h-4 w-4 text-zinc-400" />
            Proxy Playground & Execution Telemetry
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Test real-time PII pseudonymization, threat gating, and 4-hop live proxy trace.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500 font-mono">Effective Role:</span>
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-mono font-semibold uppercase border ${
              role === "admin"
                ? "bg-zinc-900 text-emerald-400 border-zinc-700"
                : "bg-zinc-900 text-zinc-300 border-zinc-800"
            }`}
          >
            {role}
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">
            (Switch in top bar)
          </span>
        </div>
      </div>

      <Playground
        role={role}
        policy={policy}
        sessionId={sessionId}
        backendReady={backendStatus === "operational"}
        onOpenAdminModal={openLoginModal}
        onPolicyChange={setPolicy}
        onRoleToggle={toggleRole}
      />
    </div>
  );
}
