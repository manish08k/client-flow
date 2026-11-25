import { describe, it, expect } from "vitest";
import { toMinor, fromMinor, lineTotal, applyBps } from "@/lib/money";
import { computeInvoiceTotals, deriveInvoiceStatus } from "@/modules/invoices/invoice.calc";

describe("money", () => {
  it("parses and formats without float drift", () => {
    expect(toMinor("0.10") + toMinor("0.20")).toBe(toMinor("0.30"));
    expect(fromMinor(toMinor("1234.5"))).toBe("1234.50");
  });
  it("rejects bad input", () => expect(() => toMinor("1.234")).toThrow());
  it("rounds half up", () => {
    expect(lineTotal(toMinor("0.05"), 500)).toBe(3n);
    expect(applyBps(toMinor("100.00"), 1800)).toBe(toMinor("18.00"));
  });
});

describe("invoice totals", () => {
  const lines = [{ unitPrice: toMinor("1000.00"), qtyMilli: 2000 }, { unitPrice: toMinor("500.00"), qtyMilli: 1000 }];
  it("computes subtotal, discount, GST", () => {
    const t = computeInvoiceTotals(lines, 1800, { type: "percent", bps: 1000 });
    expect(t.subtotal).toBe(toMinor("2500.00"));
    expect(t.discount).toBe(toMinor("250.00"));
    expect(t.tax).toBe(toMinor("405.00"));
    expect(t.total).toBe(toMinor("2655.00"));
  });
  it("caps fixed discount at subtotal", () => {
    expect(computeInvoiceTotals(lines, 0, { type: "fixed", amount: toMinor("999999") }).total).toBe(0n);
  });
});

describe("invoice status", () => {
  const due = new Date("2026-01-01"), total = toMinor("100");
  it("paid", () => expect(deriveInvoiceStatus("sent", total, total, due)).toBe("paid"));
  it("overdue", () => expect(deriveInvoiceStatus("sent", total, 0n, due, new Date("2026-02-01"))).toBe("overdue"));
  it("partial", () => expect(deriveInvoiceStatus("sent", total, 1n, new Date("2027-01-01"), new Date("2026-02-01"))).toBe("partially_paid"));
  it("draft stays draft", () => expect(deriveInvoiceStatus("draft", total, total, due)).toBe("draft"));
});
