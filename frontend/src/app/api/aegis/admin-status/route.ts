import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  const isAdmin = await isAdminAuthenticated();
  return NextResponse.json({
    role: isAdmin ? "admin" : "viewer",
  });
}
