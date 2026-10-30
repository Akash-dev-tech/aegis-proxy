import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-300">
        {children}
      </body>
    </html>
  );
}
