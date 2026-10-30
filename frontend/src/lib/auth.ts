import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";

export const SESSION_COOKIE_NAME = "aegis_admin_session";

const DEFAULT_ADMIN_PASSWORD = "admin";
const DEFAULT_SESSION_SECRET =
  "super-secret-session-jwt-key-change-me-at-least-32-chars-long";

const SESSION_SECRET =
  process.env.SESSION_SECRET || DEFAULT_SESSION_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
export const AEGIS_ADMIN_KEY = process.env.AEGIS_ADMIN_KEY || "demo-admin-key";
export const AEGIS_VIEWER_KEY = process.env.AEGIS_VIEWER_KEY || "demo-viewer-key";

export function validateProductionAuthConfig(): void {
  if (process.env.NODE_ENV === "production") {
    if (
      !process.env.ADMIN_PASSWORD ||
      process.env.ADMIN_PASSWORD === DEFAULT_ADMIN_PASSWORD
    ) {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: Default or missing ADMIN_PASSWORD in production environment."
      );
    }
    if (
      !process.env.SESSION_SECRET ||
      process.env.SESSION_SECRET === DEFAULT_SESSION_SECRET ||
      process.env.SESSION_SECRET.includes("change-me")
    ) {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: Default or missing SESSION_SECRET in production environment."
      );
    }
  }
}

// IP Rate Limiter for Login: 5 attempts per 5 minutes (300,000 ms)
interface LoginAttempt {
  count: number;
  resetAt: number;
}
const loginAttempts = new Map<string, LoginAttempt>();

export function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 5) {
    return false;
  }
  entry.count += 1;
  return true;
}

export function resetLoginRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

export function verifyAdminPassword(inputPassword: string): boolean {
  validateProductionAuthConfig();
  const expected = Buffer.from(ADMIN_PASSWORD, "utf-8");
  const actual = Buffer.from(inputPassword, "utf-8");
  if (expected.length !== actual.length) {
    // Constant-time dummy compare to mitigate timing attacks
    crypto.timingSafeEqual(expected, expected);
    return false;
  }
  return crypto.timingSafeEqual(expected, actual);
}

const secretKey = new TextEncoder().encode(SESSION_SECRET);

export async function createAdminSessionToken(): Promise<string> {
  validateProductionAuthConfig();
  return await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secretKey);
}

export async function verifyAdminSessionToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) return false;
    return await verifyAdminSessionToken(sessionCookie.value);
  } catch {
    return false;
  }
}

export function resolveRoleFromRequest(
  request: Request,
  rawBody?: Record<string, unknown> | null
): "admin" | "viewer" {
  const headerRole = request.headers.get("x-user-role");
  if (headerRole === "admin" || headerRole === "viewer") {
    return headerRole;
  }
  if (rawBody && typeof rawBody === "object") {
    const bRole = rawBody.role;
    if (bRole === "admin" || bRole === "viewer") {
      return bRole;
    }
  }
  try {
    const url = new URL(request.url);
    const qRole = url.searchParams.get("role") || url.searchParams.get("userRole");
    if (qRole === "admin" || qRole === "viewer") {
      return qRole;
    }
  } catch {
    // Ignore URL parse error
  }
  return "admin"; // default role for seamless demo
}

export function getAuthForRole(role: "admin" | "viewer"): {
  role: "admin" | "viewer";
  apiKey: string;
} {
  if (role === "admin") {
    return { role: "admin", apiKey: AEGIS_ADMIN_KEY };
  }
  return { role: "viewer", apiKey: AEGIS_VIEWER_KEY };
}

export async function getAuthContext(
  request?: Request,
  rawBody?: Record<string, unknown> | null
): Promise<{
  role: "admin" | "viewer";
  apiKey: string;
}> {
  if (request) {
    const role = resolveRoleFromRequest(request, rawBody);
    return getAuthForRole(role);
  }
  const isAdmin = await isAdminAuthenticated();
  if (isAdmin) {
    return { role: "admin", apiKey: AEGIS_ADMIN_KEY };
  }
  return { role: "viewer", apiKey: AEGIS_VIEWER_KEY };
}
