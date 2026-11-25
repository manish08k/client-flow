import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { can, assertCan, ForbiddenError } from "@/lib/permissions";
import { verifyRazorpaySignature } from "@/lib/security/webhook";

describe("permissions", () => {
  it("owner can manage billing, member cannot", () => {
    expect(can("owner", "billing:manage")).toBe(true);
    expect(can("member", "billing:manage")).toBe(false);
  });
  it("client only has portal access", () => {
    expect(can("client", "portal:access")).toBe(true);
    expect(can("client", "invoices:read")).toBe(false);
  });
  it("revoke wins over grant", () => {
    expect(can("manager", "invoices:write", { revoke: ["invoices:write"], grant: ["invoices:write"] })).toBe(false);
    expect(can("member", "reports:read", { grant: ["reports:read"] })).toBe(true);
  });
  it("assertCan throws", () => expect(() => assertCan("client", "crm:read")).toThrow(ForbiddenError));
});

describe("webhook signature", () => {
  const body = '{"a":1}', secret = "s3cret";
  const sig = createHmac("sha256", secret).update(body).digest("hex");
  it("accepts valid", () => expect(verifyRazorpaySignature(body, sig, secret)).toBe(true));
  it("rejects tampered/missing", () => {
    expect(verifyRazorpaySignature(body + " ", sig, secret)).toBe(false);
    expect(verifyRazorpaySignature(body, null, secret)).toBe(false);
  });
});
