import { NextResponse } from "next/server";
import {
  checkLoginRateLimit,
  createAdminSessionToken,
  resetLoginRateLimit,
  SESSION_COOKIE_NAME,
  verifyAdminPassword,
} from "@/lib/auth";
import { getClientIp } from "@/lib/backend";
import { adminLoginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (!checkLoginRateLimit(ip)) {
    return NextResponse.json(
      {
        error: "Too many login attempts. Please wait 5 minutes before trying again.",
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = adminLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid login credentials format" },
        { status: 400 }
      );
    }

    const isValid = verifyAdminPassword(parsed.data.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid administrator password" },
        { status: 401 }
      );
    }

    resetLoginRateLimit(ip);
    const token = await createAdminSessionToken();

    const response = NextResponse.json({
      success: true,
      role: "admin",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 2 * 60 * 60, // 2 hours
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred during authentication" },
      { status: 500 }
    );
  }
}
