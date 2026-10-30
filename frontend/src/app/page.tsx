"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { Playground } from "@/components/Playground";
import { AuditTable } from "@/components/AuditTable";
import { CodeSnippets } from "@/components/CodeSnippets";
import { AdminLoginModal } from "@/components/AdminLoginModal";
import { PolicyMode } from "@/lib/validation";

function generateSessionId(): string {
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

export default function Home() {
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [policy, setPolicy] = useState<PolicyMode>("replace");
  const [sessionId, setSessionId] = useState<string>("");
  const [backendStatus, setBackendStatus] = useState<
    "operational" | "degraded" | "offline" | "checking"
  >("checking");
  const [vaultSessions, setVaultSessions] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"playground" | "audit" | "snippets">(
    "playground"
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Initialize session ID on client side
  useEffect(() => {
    setSessionId(generateSessionId());
  }, []);

  // Poll backend health status
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/aegis/health");
      const data = await res.json();
      if (res.ok && data.status === "ok") {
        setBackendStatus("operational");
        setVaultSessions(data.vault_active_sessions ?? 0);
      } else {
        setBackendStatus("degraded");
      }
    } catch {
      setBackendStatus("offline");
    }
  }, []);

  // Check initial admin cookie auth status
  const checkAdminAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/aegis/admin-status");
      const data = await res.json();
      if (data.role === "admin") {
        setRole("admin");
      } else {
        setRole("viewer");
      }
    } catch {
      setRole("viewer");
    }
  }, []);

  useEffect(() => {
    checkHealth();
    checkAdminAuth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth, checkAdminAuth]);

  async function handleLogout() {
    try {
      await fetch("/api/aegis/admin-logout", { method: "POST" });
      setRole("viewer");
    } catch {
      setRole("viewer");
    }
  }

  function handleNewSession() {
    setSessionId(generateSessionId());
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      <Header
        role={role}
        policy={policy}
        sessionId={sessionId}
        backendStatus={backendStatus}
        vaultSessions={vaultSessions}
        onOpenAdminModal={() => setIsModalOpen(true)}
        onLogout={handleLogout}
        onPolicyChange={setPolicy}
        onNewSession={handleNewSession}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "playground" && (
          <Playground
            role={role}
            policy={policy}
            sessionId={sessionId}
            backendReady={backendStatus === "operational"}
            onOpenAdminModal={() => setIsModalOpen(true)}
          />
        )}

        {activeTab === "audit" && (
          <AuditTable
            role={role}
            onOpenAdminModal={() => setIsModalOpen(true)}
          />
        )}

        {activeTab === "snippets" && <CodeSnippets />}
      </main>

      <AdminLoginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setRole("admin");
          checkHealth();
        }}
      />

      {/* Cyber Security Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span>Aegis Proxy Firewall &bull; Zero-Trust PII Protection</span>
          </div>
          <div className="font-mono text-[11px] text-slate-600">
            HKDF-SHA256 &bull; Fernet AES-128-CBC &bull; Presidio NER &bull; Single-Worker In-Memory Vault
          </div>
        </div>
      </footer>
    </div>
  );
}
