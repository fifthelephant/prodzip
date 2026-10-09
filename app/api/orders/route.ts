import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { STORE } from "@/data/order-store/config";
import { detectDeliveryZone } from "@/lib/order-store/area";
import { buildCatalog } from "@/lib/order-store/catalog";
import { discountForCode, totals, unitPrice } from "@/lib/order-store/pricing";
import { readCsvStore, withCsvStore } from "@/lib/order-store/csv-store";
import { customerPayments } from "@/lib/order-store/payments";
import type { CartLine, Order } from "@/lib/order-store/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validPaymentProof(proof: string | undefined, orderId: string, amount: number): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  if (!proof || !secret) return false;
  const [payload, supplied, extra] = proof.split(".");
  if (!payload || !supplied || extra) return false;
  const expected = createHmac("sha256", secret).update(`csv-order-confirmation:${payload}`).digest();
  const actual = Buffer.from(supplied, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { orderId?: string; amount?: number; exp?: number };
    return data.orderId === orderId && data.amount === amount && typeof data.exp === "number" && data.exp > Date.now();
  } catch { return false; }
}

export async function GET() {
  try {
    const store = await readCsvStore();
    return NextResponse.json({ ok: true, items: store.items, discounts: store.discounts, payments: customerPayments(store.payments), charges: store.charges }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Menu data is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const envelope = await request.json().catch(() => null) as { order?: Order; paymentProof?: string } | null;
  const body = envelope?.order || null;
  if (!body || typeof body.id !== "string" || !/^MK[A-Za-z0-9_-]{4,60}$/.test(body.id) || !Array.isArray(body.items) || !body.items.length || body.items.length > 40) {
    return NextResponse.json({ ok: false, error: "Invalid order details." }, { status: 400 });
  }
  if (body.payment !== "COD" && body.payment !== "RAZORPAY") return NextResponse.json({ ok: false, error: "Invalid payment method." }, { status: 400 });
  try {
    const result = await withCsvStore((store) => {
      const existing = store.orders.find((order) => order.id === body.id);
      if (existing) return { ok: true, duplicate: true, items: store.items, discounts: store.discounts };
      const { items } = buildCatalog(store.items);
      const lines: CartLine[] = [];
      const requestedQuantities = new Map<string, number>();
      for (const line of body.items) {
        const item = items[line.id];
        const qty = Number(line.qty);
        if (!item || item.soldOut || !Number.isInteger(qty) || qty < 1 || qty > 50) {
          return { ok: false, error: "An item in your order is no longer available.", items: store.items };
        }
        const labels = (line.options || "").split(",").map((value) => value.trim()).filter(Boolean);
        const selection = (item.options || []).map((group) => group.choices.flatMap((choice, index) => labels.includes(choice.label) ? [index] : []));
        if ((item.options || []).some((group, index) => group.required && !selection[index]?.length)) {
          return { ok: false, error: `Please choose valid options for ${item.name}.`, items: store.items };
        }
        const expectedLineTotal = unitPrice(item, selection) * qty;
        if (Number(line.price) !== expectedLineTotal) return { ok: false, error: `The price for ${item.name} changed. Please review your cart.`, items: store.items };
        const requested = (requestedQuantities.get(item.id) || 0) + qty;
        requestedQuantities.set(item.id, requested);
        if (typeof item.stock === "number" && requested > item.stock) {
          return { ok: false, error: `Only ${item.stock} ${item.name} left in stock.`, items: store.items, problems: [{ id: item.id, name: item.name, left: item.stock }] };
        }
        lines.push({ id: item.id, qty, key: item.id, sel: selection });
      }
      const fulfillment = body.fulfillment === "pickup" ? "pickup" : "delivery";
      const addressText = [body.address?.line, body.address?.landmark, body.address?.map].filter(Boolean).join(", ");
      const zone = fulfillment === "delivery" ? detectDeliveryZone(null, addressText) : "unknown";
      const discount = discountForCode(body.discountCode || "", store.discounts);
      const pricing = totals(lines, items, fulfillment, zone, discount, store.charges);
      if (discount && pricing.discount <= 0) return { ok: false, error: "That discount code is invalid or no longer applies to this order.", items: store.items };
      if (body.discountCode && !discount) return { ok: false, error: "That discount code is invalid or no longer applies to this order.", items: store.items };
      if (pricing.belowMin) return { ok: false, error: `The minimum order is ₹${STORE.minOrder}.`, items: store.items };
      const supplied = body.totals;
      if (!supplied || supplied.sub !== pricing.sub || supplied.discount !== pricing.discount || supplied.tax !== pricing.tax || supplied.packaging !== pricing.packaging || supplied.total !== pricing.total) {
        return { ok: false, error: "Your order total changed. Please review checkout and try again.", items: store.items };
      }
      if (body.payment === "COD" && !store.payments.cod) {
        return { ok: false, error: "Cash on delivery is not available right now.", items: store.items };
      }
      if (body.payment === "RAZORPAY" && !validPaymentProof(envelope?.paymentProof, body.id, Math.round(pricing.total * 100))) {
        return { ok: false, error: "We could not confirm your online payment. Please contact us before placing the order again.", items: store.items };
      }
      for (const [id, quantity] of requestedQuantities) {
        const row = store.items.find((item) => item.id === id);
        if (row && typeof row.stock === "number") row.stock = Math.max(0, row.stock - quantity);
      }
      if (discount) discount.uses = (discount.uses || 0) + 1;
      store.orders.push({
        ...body,
        placedAt: new Date().toISOString(),
        status: "received",
        items: body.items.map((line) => ({ ...line, name: items[line.id].name })),
        totals: { ...pricing },
      });
      return { ok: true, items: store.items, discounts: store.discounts };
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 409, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Could not record your order." }, { status: 503 });
  }
}
