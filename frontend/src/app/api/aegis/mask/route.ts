import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import {
  checkRouteRateLimit,
  forwardToBackend,
  getClientIp,
} from "@/lib/backend";
import { maskRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRouteRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  try {
    const rawBody = await request.json();
    const parsed = maskRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.format(),
        },
        { status: 422 }
      );
    }

    const auth = await getAuthContext();
    const requestedRole = rawBody?.role || request.headers.get("x-user-role");

    return await forwardToBackend({
      path: "/api/v1/mask",
      method: "POST",
      apiKey: auth.apiKey,
      body: {
        text: parsed.data.text,
        policy: parsed.data.policy,
        session_id: parsed.data.session_id,
      },
      sessionId: parsed.data.session_id,
      policy: parsed.data.policy,
      userRole: requestedRole,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 }
    );
  }
}
