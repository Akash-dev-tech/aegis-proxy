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
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-300 flex flex-col">
        <AegisProvider>
          <Header />
          <AdminLoginModal />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
            <p>
              Aegis Proxy &bull; Zero-Trust Reverse Proxy &bull; Presidio + spaCy + Fernet HKDF + Groq LPU
            </p>
          </footer>
        </AegisProvider>
      </body>
    </html>
  );
}
