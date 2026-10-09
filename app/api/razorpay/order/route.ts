import { NextResponse } from "next/server";
import { STORE } from "@/data/order-store/config";
import { detectDeliveryZone } from "@/lib/order-store/area";
import { buildCatalog } from "@/lib/order-store/catalog";
import { discountForCode, totals, unitPrice } from "@/lib/order-store/pricing";
import type { CartLine, ChargeSettings, DiscountRule, InventoryRow } from "@/lib/order-store/types";
import { readCsvStore } from "@/lib/order-store/csv-store";
import { customerPayments } from "@/lib/order-store/payments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Online payment is not configured yet." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as {
    lines?: CartLine[];
    receipt?: string;
    fulfillment?: "delivery" | "pickup";
    addressText?: string;
    zone?: "gurugram" | "actuals" | "unknown";
    customer?: { name?: string; email?: string; phone?: string };
    discountCode?: string;
  } | null;
  if (!body || !Array.isArray(body.lines) || !body.lines.length || body.lines.length > 40 || !body.receipt || !/^[A-Za-z0-9_-]{1,40}$/.test(body.receipt)) {
    return NextResponse.json({ error: "Invalid order details." }, { status: 400 });
  }
  const customerEmail = typeof body.customer?.email === "string" ? body.customer.email.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return NextResponse.json({ error: "Please enter a valid email so we can send your order details." }, { status: 400 });
  }

  let inventory: InventoryRow[];
  let discounts: DiscountRule[];
  let charges: ChargeSettings;
  try {
    const store = await readCsvStore();
    if (!customerPayments(store.payments).razorpay) {
      return NextResponse.json({ error: "Online payment is not available right now." }, { status: 503 });
    }
    inventory = store.items;
    discounts = store.discounts;
    charges = store.charges;
  } catch {
    return NextResponse.json({ error: "We couldn't verify the live menu. Please try again." }, { status: 503 });
  }

  const { items } = buildCatalog(inventory);
  let subtotal = 0;
  for (const line of body.lines) {
    const item = items[line.id];
    if (!item || item.soldOut || !Number.isInteger(line.qty) || line.qty < 1 || line.qty > 50 || !Array.isArray(line.sel)) {
      return NextResponse.json({ error: "An item in your order is no longer available." }, { status: 409 });
    }
    if (typeof item.stock === "number" && line.qty > item.stock) {
      return NextResponse.json({ error: `Only ${item.stock} ${item.name} left in stock.` }, { status: 409 });
    }
    for (const [groupIndex, group] of (item.options || []).entries()) {
      const picks = line.sel[groupIndex] || [];
      if ((group.required && picks.length < 1) || picks.length > (group.max ?? 1) || picks.some((choice) => !Number.isInteger(choice) || choice < 0 || choice >= group.choices.length)) {
        return NextResponse.json({ error: `Please choose valid options for ${item.name}.` }, { status: 400 });
      }
    }
    subtotal += unitPrice(item, line.sel) * line.qty;
  }

  const fulfillment = body.fulfillment === "pickup" ? "pickup" : "delivery";
  if (fulfillment === "delivery" && subtotal < STORE.minOrder) return NextResponse.json({ error: `The minimum order is ₹${STORE.minOrder}.` }, { status: 400 });
  const zoneFromText = detectDeliveryZone(null, body.addressText || "");
  const zone = fulfillment === "delivery"
    ? (zoneFromText !== "unknown" ? zoneFromText : body.zone === "gurugram" || body.zone === "actuals" ? body.zone : "unknown")
    : "unknown";
  const discount = discountForCode(typeof body.discountCode === "string" ? body.discountCode : "", discounts);
  const priced = totals(body.lines, items, fulfillment, zone, discount, charges);
  if (body.discountCode && !priced.discount) return NextResponse.json({ error: "That discount code is invalid or no longer applies to this order." }, { status: 400 });
  const amount = Math.round(priced.total * 100);

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt: body.receipt,
      notes: {
        email: customerEmail,
        name: typeof body.customer?.name === "string" ? body.customer.name.trim() : "",
        phone: typeof body.customer?.phone === "string" ? body.customer.phone.trim() : "",
      },
    }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.id) {
    return NextResponse.json({ error: "Razorpay could not start the payment. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ orderId: result.id, keyId, amount: result.amount, currency: result.currency });
}
