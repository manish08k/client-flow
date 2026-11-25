import { eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { invoices, payments, paymentEvents } from "@/lib/db/schema";
import { deriveInvoiceStatus } from "@/modules/invoices/invoice.calc";

export interface CapturedPayment {
  eventId: string; paymentId: string; orderId: string; amountMinor: bigint; invoiceId: string; organizationId: string;
}

/** Idempotent: a replayed webhook event is a no-op. Runs in one transaction. */
export async function recordCapturedPayment(db: Db, p: CapturedPayment): Promise<"processed" | "duplicate"> {
  return db.transaction(async (tx) => {
    const inserted = await tx.insert(paymentEvents)
      .values({ provider: "razorpay", providerEventId: p.eventId, type: "payment.captured", payload: { ...p, amountMinor: p.amountMinor.toString() } })
      .onConflictDoNothing().returning({ id: paymentEvents.id });
    if (inserted.length === 0) return "duplicate";

    await tx.insert(payments).values({
      organizationId: p.organizationId, invoiceId: p.invoiceId, providerPaymentId: p.paymentId,
      providerOrderId: p.orderId, amountMinor: p.amountMinor, status: "captured",
    }).onConflictDoNothing();

    const [inv] = await tx.update(invoices)
      .set({ paidMinor: sql`${invoices.paidMinor} + ${p.amountMinor}`, updatedAt: new Date() })
      .where(sql`${invoices.id} = ${p.invoiceId} AND ${invoices.organizationId} = ${p.organizationId}`).returning();
    if (inv) {
      await tx.update(invoices)
        .set({ status: deriveInvoiceStatus(inv.status, inv.totalMinor, inv.paidMinor, inv.dueDate) })
        .where(eq(invoices.id, inv.id));
    }
    await tx.update(paymentEvents).set({ processedAt: new Date() }).where(eq(paymentEvents.providerEventId, p.eventId));
    return "processed";
  });
}
