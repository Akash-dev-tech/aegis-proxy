import { describe, it, expect } from "vitest";

describe("Placeholder Parsing & Highlight Matching", () => {
  const placeholderRegex =
    /(<[A-Z0-9_]+_\d+>|<HASH_[A-Z0-9_]+_[a-f0-9]+>|\[REDACTED_[A-Z0-9_]+\])/g;

  it("identifies standard reversible placeholders", () => {
    const text = "Hello <PERSON_1>, your PAN is <IN_PAN_1>.";
    const matches = text.match(placeholderRegex);
    expect(matches).toEqual(["<PERSON_1>", "<IN_PAN_1>"]);
  });

  it("identifies redacted placeholder tokens", () => {
    const text = "Transferred from [REDACTED_IN_UPI] with confidence.";
    const matches = text.match(placeholderRegex);
    expect(matches).toEqual(["[REDACTED_IN_UPI]"]);
  });

  it("identifies HMAC-SHA256 hashed placeholder tokens", () => {
    const text = "User hash is <HASH_EMAIL_ADDRESS_a1b2c3d4e5f6>.";
    const matches = text.match(placeholderRegex);
    expect(matches).toEqual(["<HASH_EMAIL_ADDRESS_a1b2c3d4e5f6>"]);
  });

  it("leaves clean text without placeholder matches", () => {
    const text = "No placeholders present in this clean input string.";
    const matches = text.match(placeholderRegex);
    expect(matches).toBeNull();
  });
});
