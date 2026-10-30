import { NextResponse } from "next/server";
import { AEGIS_VIEWER_KEY } from "@/lib/auth";
import { forwardToBackend, checkRouteRateLimit, getClientIp } from "@/lib/backend";

export async function GET(request: Request) {
  const ip = getClientIp(request);
  if (!checkRouteRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  return await forwardToBackend({
    path: "/v1/models",
    method: "GET",
    apiKey: AEGIS_VIEWER_KEY,
  });
}
