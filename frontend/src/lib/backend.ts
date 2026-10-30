import { NextResponse } from "next/server";

const AEGIS_BACKEND_URL =
  process.env.AEGIS_BACKEND_URL || "http://127.0.0.1:8000";

// Per-IP in-memory sliding window rate limiter for Next.js route handlers
interface IPRateLimit {
  timestamps: number[];
}
const ipLimits = new Map<string, IPRateLimit>();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_MINUTE = 60;

export function checkRouteRateLimit(ip: string): boolean {
  const now = Date.now();
  let record = ipLimits.get(ip);
  if (!record) {
    record = { timestamps: [] };
    ipLimits.set(ip, record);
  }
  // Remove entries outside the current sliding window
  record.timestamps = record.timestamps.filter((t) => now - t < WINDOW_MS);
  if (record.timestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  record.timestamps.push(now);
  return true;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "127.0.0.1";
}

interface ForwardOptions {
  path: string;
  method?: string;
  apiKey: string;
  body?: unknown;
  sessionId?: string | null;
  policy?: string | null;
  userRole?: string | null;
}

export async function forwardToBackend({
  path,
  method = "POST",
  apiKey,
  body,
  sessionId,
  policy,
  userRole,
}: ForwardOptions): Promise<NextResponse> {
  const url = `${AEGIS_BACKEND_URL}${path}`;

  const headers: Record<string, string> = {
    "X-API-Key": apiKey,
    "Content-Type": "application/json",
  };

  if (sessionId) {
    headers["X-Session-Id"] = sessionId;
  }
  if (policy) {
    headers["X-Policy-Mode"] = policy;
  }
  if (userRole) {
    headers["X-User-Role"] = userRole;
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(25000), // 25s timeout
    };

    if (body !== undefined && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json().catch(() => null);

    return NextResponse.json(data || {}, {
      status: response.status,
    });
  } catch (error: unknown) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");

    return NextResponse.json(
      {
        error: isTimeout
          ? "Backend request timed out after 25 seconds"
          : "Failed to connect to Aegis backend service",
        status: isTimeout ? 504 : 502,
      },
      { status: isTimeout ? 504 : 502 }
    );
  }
}
