import { NextResponse } from "next/server";
import { isAdminAuthenticated, AEGIS_ADMIN_KEY } from "@/lib/auth";
import { forwardToBackend, checkRouteRateLimit, getClientIp } from "@/lib/backend";

export async function GET(request: Request) {
  const ip = getClientIp(request);
  if (!checkRouteRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return NextResponse.json(
      { error: "Admin role required to inspect LLM status" },
      { status: 403 }
    );
  }

  return await forwardToBackend({
    path: "/api/v1/llm-status",
    method: "GET",
    apiKey: AEGIS_ADMIN_KEY,
  });
}
