import { NextResponse } from "next/server";
import { z } from "zod";
import { env, razorpayConfigured } from "@/config/env";
import { db } from "@/lib/db";
import { verifyRazorpaySignature } from "@/lib/security/webhook";
import { recordCapturedPayment } from "@/modules/payments/payment.service";

export const runtime = "nodejs";

const payload = z.object({
  event: z.string(),
  payload: z.object({ payment: z.object({ entity: z.object({
    id: z.string(), order_id: z.string(), amount: z.number().int(),
    notes: z.object({ invoice_id: z.string().uuid(), organization_id: z.string().uuid() }),
  }) }) }),
});

export async function POST(req: Request) {
  if (!razorpayConfigured) return NextResponse.json({ error: "Razorpay is not configured" }, { status: 503 });
  const raw = await req.text();
  if (!verifyRazorpaySignature(raw, req.headers.get("x-razorpay-signature"), env.RAZORPAY_WEBHOOK_SECRET!))
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const eventId = req.headers.get("x-razorpay-event-id");
  if (!eventId) return NextResponse.json({ error: "Missing event id" }, { status: 400 });

  const parsed = payload.safeParse(JSON.parse(raw));
  if (!parsed.success) return NextResponse.json({ ok: true, ignored: true });

  const e = parsed.data.payload.payment.entity;
  if (parsed.data.event !== "payment.captured") return NextResponse.json({ ok: true, ignored: true });
  const result = await recordCapturedPayment(db, {
    eventId, paymentId: e.id, orderId: e.order_id, amountMinor: BigInt(e.amount),
    invoiceId: e.notes.invoice_id, organizationId: e.notes.organization_id,
  });
  return NextResponse.json({ ok: true, result });
}
