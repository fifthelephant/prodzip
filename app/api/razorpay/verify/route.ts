import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return NextResponse.json({ error: "Online payment is not configured yet." }, { status: 503 });

  const body = await request.json().catch(() => null) as {
    orderId?: string; paymentId?: string; signature?: string; amount?: number;
  } | null;
  if (!body?.orderId || !body.paymentId || !body.signature || !Number.isSafeInteger(body.amount)) {
    return NextResponse.json({ error: "Payment details are incomplete." }, { status: 400 });
  }

  const expected = createHmac("sha256", keySecret).update(`${body.orderId}|${body.paymentId}`).digest();
  const supplied = Buffer.from(body.signature, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }

  const auth = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
  const [orderResponse, paymentResponse] = await Promise.all([
    fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(body.orderId)}`, { headers: { Authorization: auth }, cache: "no-store" }),
    fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(body.paymentId)}`, { headers: { Authorization: auth }, cache: "no-store" }),
  ]);
  if (!orderResponse.ok || !paymentResponse.ok) return NextResponse.json({ error: "Could not confirm this payment." }, { status: 502 });

  const [order, payment] = await Promise.all([orderResponse.json(), paymentResponse.json()]);
  if (order.id !== body.orderId || order.amount !== body.amount || payment.order_id !== order.id || payment.amount !== order.amount || payment.status !== "captured") {
    return NextResponse.json({ error: "The payment amount or status could not be confirmed." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
