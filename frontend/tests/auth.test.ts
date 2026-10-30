import { describe, it, expect, beforeEach } from "vitest";
import {
  verifyAdminPassword,
  createAdminSessionToken,
  verifyAdminSessionToken,
  checkLoginRateLimit,
  resetLoginRateLimit,
} from "../src/lib/auth";

describe("Frontend Auth & Security", () => {
  beforeEach(() => {
    resetLoginRateLimit("192.168.1.1");
  });

  it("verifies admin password in constant time correctly", () => {
    expect(verifyAdminPassword("admin")).toBe(true);
    expect(verifyAdminPassword("wrong-password")).toBe(false);
    expect(verifyAdminPassword("")).toBe(false);
  });

  it("signs and verifies admin JWT session token", async () => {
    const token = await createAdminSessionToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);

    const isValid = await verifyAdminSessionToken(token);
    expect(isValid).toBe(true);

    const isInvalid = await verifyAdminSessionToken("corrupted.jwt.token");
    expect(isInvalid).toBe(false);
  });

  it("enforces login rate limiting per IP", () => {
    const ip = "192.168.1.1";
    // 5 attempts allowed
    for (let i = 0; i < 5; i++) {
      expect(checkLoginRateLimit(ip)).toBe(true);
    }
    // 6th attempt blocked
    expect(checkLoginRateLimit(ip)).toBe(false);

    // Reset allows again
    resetLoginRateLimit(ip);
    expect(checkLoginRateLimit(ip)).toBe(true);
  });
});
