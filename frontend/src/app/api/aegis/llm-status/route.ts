import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { forwardToBackend, checkRouteRateLimit, getClientIp } from "@/lib/backend";

export async function GET(request: Request) {
  const ip = getClientIp(request);
  if (!checkRouteRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const auth = await getAuthContext(request);

  return await forwardToBackend({
    path: "/api/v1/llm-status",
    method: "GET",
    apiKey: auth.apiKey,
    userRole: auth.role,
  });
}
