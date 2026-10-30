import { NextResponse } from "next/server";
import { AEGIS_ADMIN_KEY, isAdminAuthenticated } from "@/lib/auth";
import {
  checkRouteRateLimit,
  forwardToBackend,
  getClientIp,
} from "@/lib/backend";
import { unmaskRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
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
          "Admin role required to perform reversible unmasking operations.",
      },
      { status: 403 }
    );
  }

  try {
    const rawBody = await request.json();
    const parsed = unmaskRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.format(),
        },
        { status: 422 }
      );
    }

    return await forwardToBackend({
      path: "/api/v1/unmask",
      method: "POST",
      apiKey: AEGIS_ADMIN_KEY,
      body: {
        masked_text: parsed.data.masked_text,
        session_id: parsed.data.session_id,
      },
      sessionId: parsed.data.session_id,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 }
    );
  }
}
