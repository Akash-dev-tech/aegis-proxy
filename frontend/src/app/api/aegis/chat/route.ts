import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import {
  checkRouteRateLimit,
  forwardToBackend,
  getClientIp,
} from "@/lib/backend";
import { chatRequestSchema } from "@/lib/validation";

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

    if (rawBody?.stream === true) {
      return NextResponse.json(
        {
          error: {
            message:
              "Streaming ('stream: true') is disabled on Aegis Proxy to enforce full-response threat scanning and PII verification.",
            type: "invalid_request_error",
            code: "streaming_not_supported",
          },
        },
        { status: 400 }
      );
    }

    const parsed = chatRequestSchema.safeParse(rawBody);
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
      path: "/v1/chat/completions",
      method: "POST",
      apiKey: auth.apiKey,
      body: parsed.data,
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
