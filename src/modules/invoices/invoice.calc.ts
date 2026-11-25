import { applyBps, lineTotal, type Minor } from "@/lib/money";

export interface InvoiceLineInput { unitPrice: Minor; qtyMilli: number }
export type Discount = { type: "percent"; bps: number } | { type: "fixed"; amount: Minor } | null;
export interface InvoiceTotals { subtotal: Minor; discount: Minor; taxable: Minor; tax: Minor; total: Minor }

export function computeInvoiceTotals(lines: InvoiceLineInput[], taxBps: number, discount: Discount): InvoiceTotals {
  const subtotal = lines.reduce<Minor>((s, l) => s + lineTotal(l.unitPrice, l.qtyMilli), 0n);
  let disc = 0n;
  if (discount?.type === "percent") disc = applyBps(subtotal, discount.bps);
  if (discount?.type === "fixed") disc = discount.amount;
  if (disc > subtotal) disc = subtotal;
  const taxable = subtotal - disc;
  const tax = applyBps(taxable, taxBps);
  return { subtotal, discount: disc, taxable, tax, total: taxable + tax };
}

export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "void";

export function deriveInvoiceStatus(
  current: InvoiceStatus, total: Minor, paid: Minor, dueDate: Date, now = new Date(),
): InvoiceStatus {
  if (current === "void" || current === "draft") return current;
  if (paid >= total && total > 0n) return "paid";
  if (paid > 0n) return dueDate < now ? "overdue" : "partially_paid";
  return dueDate < now ? "overdue" : "sent";
}
