import type { Metadata } from "next";
import "./globals.css";
import { AegisProvider } from "@/context/AegisContext";
import { Header } from "@/components/Header";
import { AdminLoginModal } from "@/components/AdminLoginModal";

export const metadata: Metadata = {
  title: "Aegis Proxy — Reversible PII Pseudonymization & Threat Firewall",
  description:
    "Zero-trust reverse proxy for LLMs featuring reversible cryptographic pseudonymization, prompt injection defense, and airtight RBAC.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-zinc-800 selection:text-zinc-100 flex flex-col font-sans">
        <AegisProvider>
          <Header />
          <AdminLoginModal />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-5">
            {children}
          </main>
          <footer className="border-t border-zinc-900 bg-zinc-950 py-4 text-center text-[11px] text-zinc-500 font-mono">
            <span>AEGIS PROXY v1.0 &bull; IN-MEMORY ENCRYPTED VAULT (AES-128-CBC + HKDF) &bull; GROQ LPU FIREWALL</span>
          </footer>
        </AegisProvider>
      </body>
    </html>
  );
}
