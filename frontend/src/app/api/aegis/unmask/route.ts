import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
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

    const auth = await getAuthContext(request, rawBody);

    return await forwardToBackend({
      path: "/api/v1/unmask",
      method: "POST",
      apiKey: auth.apiKey,
      body: {
        masked_text: parsed.data.masked_text,
        session_id: parsed.data.session_id,
      },
      sessionId: parsed.data.session_id,
      userRole: auth.role,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 }
    );
  }
}
