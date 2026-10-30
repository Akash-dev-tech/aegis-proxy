import { NextResponse } from "next/server";

const AEGIS_BACKEND_URL =
  process.env.AEGIS_BACKEND_URL || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const response = await fetch(`${AEGIS_BACKEND_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "degraded",
          message: "Backend returned non-200 status",
          vault_active_sessions: 0,
        },
        { status: 503 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      {
        status: "offline",
        message: "Backend waking up... (connecting to FastAPI)",
        vault_active_sessions: 0,
      },
      { status: 503 }
    );
  }
}
