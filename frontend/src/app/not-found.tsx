import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-rose-400">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-medium tracking-tight text-zinc-100">404 - Endpoint Not Found</h2>
      <p className="text-sm text-zinc-400 max-w-md">
        The requested endpoint or resource does not exist on this Aegis Proxy instance.
      </p>
      <Link
        href="/"
        className="rounded-md bg-zinc-100 px-3.5 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
      >
        Return to Home
      </Link>
    </div>
  );
}
