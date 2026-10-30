"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { PolicyMode } from "@/lib/validation";

interface AegisContextType {
  role: "admin" | "viewer";
  policy: PolicyMode;
  sessionId: string;
  backendStatus: "operational" | "degraded" | "offline" | "checking";
  vaultSessions: number;
  isLoginModalOpen: boolean;
  setPolicy: (p: PolicyMode) => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  handleLogout: () => Promise<void>;
  rotateSession: () => void;
  checkHealth: () => Promise<void>;
  checkAdminAuth: () => Promise<void>;
}

const AegisContext = createContext<AegisContextType | undefined>(undefined);

function generateSessionId(): string {
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

export function AegisProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [policy, setPolicy] = useState<PolicyMode>("replace");
  const [sessionId, setSessionId] = useState<string>("");
  const [backendStatus, setBackendStatus] = useState<
    "operational" | "degraded" | "offline" | "checking"
  >("checking");
  const [vaultSessions, setVaultSessions] = useState<number>(0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    setSessionId(generateSessionId());
  }, []);

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

  function rotateSession() {
    setSessionId(generateSessionId());
  }

  return (
    <AegisContext.Provider
      value={{
        role,
        policy,
        sessionId,
        backendStatus,
        vaultSessions,
        isLoginModalOpen,
        setPolicy,
        openLoginModal: () => setIsLoginModalOpen(true),
        closeLoginModal: () => setIsLoginModalOpen(false),
        handleLogout,
        rotateSession,
        checkHealth,
        checkAdminAuth,
      }}
    >
      {children}
    </AegisContext.Provider>
  );
}

export function useAegis() {
  const ctx = useContext(AegisContext);
  if (!ctx) {
    throw new Error("useAegis must be used within an AegisProvider");
  }
  return ctx;
}
