import { NextResponse } from "next/server";
import { AEGIS_ADMIN_KEY, isAdminAuthenticated } from "@/lib/auth";
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

  const isAdmin = await isAdminAuthenticated();
  if (!isAdmin) {
    return NextResponse.json(
      {
        error:
          "Admin role required to view security audit logs. Public viewer cannot access audit history.",
      },
      { status: 403 }
    );
  }

  return await forwardToBackend({
    path: "/api/v1/audit",
    method: "GET",
    apiKey: AEGIS_ADMIN_KEY,
  });
}
