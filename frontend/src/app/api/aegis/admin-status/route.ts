import { NextResponse } from "next/server";
import { resolveRoleFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const role = resolveRoleFromRequest(request);
  return NextResponse.json({
    role,
  });
}
