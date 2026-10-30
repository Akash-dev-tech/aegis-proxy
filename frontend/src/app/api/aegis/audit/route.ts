import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import {
  checkRouteRateLimit,
  forwardToBackend,
  getClientIp,
} from "@/lib/backend";

export async function GET(request: Request) {
  const ip = getClientIp(request);
  if (!checkRouteRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  const auth = await getAuthContext(request);

  return await forwardToBackend({
    path: "/api/v1/audit",
    method: "GET",
    apiKey: auth.apiKey,
    userRole: auth.role,
  });
}
