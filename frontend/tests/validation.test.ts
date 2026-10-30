import { describe, it, expect } from "vitest";
import {
  maskRequestSchema,
  unmaskRequestSchema,
  chatRequestSchema,
  adminLoginSchema,
} from "../src/lib/validation";

describe("Frontend Zod Validation", () => {
  it("validates valid mask request", () => {
    const valid = {
      text: "Hello Rahul Sharma, your PAN is ABCDE1234F",
      policy: "replace",
      session_id: "sess_test_123",
    };
    const res = maskRequestSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it("rejects empty text in mask request", () => {
    const res = maskRequestSchema.safeParse({ text: "", policy: "replace" });
    expect(res.success).toBe(false);
  });

  it("rejects text exceeding 20,000 chars in mask request", () => {
    const hugeText = "a".repeat(20001);
    const res = maskRequestSchema.safeParse({ text: hugeText, policy: "replace" });
    expect(res.success).toBe(false);
  });

  it("validates unmask request requires session_id", () => {
    const missingSid = { masked_text: "Hello <PERSON_1>" };
    const res = unmaskRequestSchema.safeParse(missingSid);
    expect(res.success).toBe(false);

    const valid = { masked_text: "Hello <PERSON_1>", session_id: "sess_valid_42" };
    expect(unmaskRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("validates chat request messages structure", () => {
    const valid = {
      messages: [{ role: "user", content: "Hello AI" }],
      session_id: "sess_42",
      policy: "replace",
    };
    expect(chatRequestSchema.safeParse(valid).success).toBe(true);

    const emptyMessages = { messages: [] };
    expect(chatRequestSchema.safeParse(emptyMessages).success).toBe(false);
  });

  it("validates admin login password schema", () => {
    expect(adminLoginSchema.safeParse({ password: "admin" }).success).toBe(true);
    expect(adminLoginSchema.safeParse({ password: "" }).success).toBe(false);
  });
});
