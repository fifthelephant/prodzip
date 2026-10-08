import { NextResponse } from "next/server";
import { STORE } from "@/data/order-store/config";
import { buildCatalog } from "@/lib/order-store/catalog";
import { unitPrice } from "@/lib/order-store/pricing";
import type { CartLine, InventoryRow } from "@/lib/order-store/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Online payment is not configured yet." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { lines?: CartLine[]; receipt?: string } | null;
  if (!body || !Array.isArray(body.lines) || !body.lines.length || body.lines.length > 40 || !body.receipt || !/^[A-Za-z0-9_-]{1,40}$/.test(body.receipt)) {
    return NextResponse.json({ error: "Invalid order details." }, { status: 400 });
  }

  let inventory: InventoryRow[] | null = null;
  if (STORE.backendUrl) {
    const url = new URL(STORE.backendUrl);
    url.searchParams.set("payment-check", Date.now().toString());
    const sheetResponse = await fetch(url, { cache: "no-store" }).catch(() => null);
    const sheet = await sheetResponse?.json().catch(() => null);
    if (!sheetResponse?.ok || !sheet?.ok || !Array.isArray(sheet.items)) {
      return NextResponse.json({ error: "We couldn't verify the live menu. Please try again." }, { status: 503 });
    }
    inventory = sheet.items;
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

  if (subtotal < STORE.minOrder) return NextResponse.json({ error: `The minimum order is ₹${STORE.minOrder}.` }, { status: 400 });
  const delivery = STORE.freeDeliveryAbove && subtotal >= STORE.freeDeliveryAbove ? 0 : STORE.deliveryFee;
  const amount = Math.round((subtotal + delivery + Math.round(subtotal * STORE.taxRate)) * 100);

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount, currency: "INR", receipt: body.receipt }),
    cache: "no-store",
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.id) {
    return NextResponse.json({ error: "Razorpay could not start the payment. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ orderId: result.id, keyId, amount: result.amount, currency: result.currency });
}
