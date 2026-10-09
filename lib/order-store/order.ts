import { STORE } from "@/data/order-store/config";
import { money } from "./format";
import type { DiscountRule, InventoryRow, Order } from "./types";

/** The WhatsApp message sent to the shop for an order. */
export function whatsappText(o: Order): string {
  const lines = [
    `*New pre-order ${o.id}* — ${STORE.name}`,
    `${o.fulfillment === "pickup" ? "Pickup" : "Delivery"} on ${o.slot}`,
    "",
    ...o.items.map((i) => `• ${i.qty} × ${i.name}${i.options ? ` (${i.options})` : ""} — ${money(i.price)}`),
    "",
    `Sub total: ${money(o.totals.sub)}`,
    o.totals.discount ? `Discount${o.discountCode ? ` (${o.discountCode})` : ""}: −${money(o.totals.discount)}` : "",
    `Delivery: ${o.fulfillment === "pickup" ? "Not applicable" : o.totals.delivery ? money(o.totals.delivery) : "On actuals"}`,
    `GST: ${money(o.totals.tax)}`,
    `*To pay: ${money(o.totals.total)}* (${o.payment === "RAZORPAY" ? "Razorpay · paid online" : o.payment === "UPI" ? "UPI" : `Cash/UPI on ${o.fulfillment === "pickup" ? "pickup" : "delivery"}`})`,
    "",
    `Name: ${o.customer.name}`,
    `Phone: ${o.customer.phone}`,
    `Email: ${o.customer.email}`,
    `${o.fulfillment === "pickup" ? "Pickup location" : "Address"}: ${o.address.line}${o.address.map ? `, ${o.address.map}` : ""}`
  ];
  if (o.address.landmark) lines.push(`Landmark: ${o.address.landmark}`);
  if (o.address.lat != null) lines.push(`Map: https://maps.google.com/?q=${o.address.lat},${o.address.lng}`);
  if (o.notes) lines.push(`Notes: ${o.notes}`);
  return lines.filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
}

export const whatsappLink = (o: Order) => `https://wa.me/${STORE.whatsappNumber}?text=${encodeURIComponent(whatsappText(o))}`;

export const upiLink = (o: Order) =>
  `upi://pay?pa=${encodeURIComponent(STORE.upiId)}&pn=${encodeURIComponent(STORE.name)}&am=${o.totals.total}&cu=INR&tn=${encodeURIComponent("Order " + o.id)}`;

export const newOrderId = (now = new Date()) =>
  "MK" + now.toISOString().slice(2, 10).replace(/-/g, "") + Math.floor(1000 + Math.random() * 9000);

// ---------------------------------------------------------------------------
// Local server CSV backend. The browser never reads or writes the CSV directly.
// ---------------------------------------------------------------------------

export interface BackendResult {
  ok: boolean;
  error?: string;
  duplicate?: boolean;
  problems?: { id: string; name: string; left: number }[];
  items?: InventoryRow[];
}

/** Submit the order to the server, which checks and reduces CSV stock. */
export async function sendOrder(order: Order, paymentProof?: string): Promise<BackendResult> {
  const r = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order, paymentProof }) });
  return r.json();
}

export async function fetchInventory(): Promise<{ items: InventoryRow[]; discounts: DiscountRule[] }> {
  const r = await fetch("/api/orders", { cache: "no-store" });
  const j = await r.json();
  if (!j.ok || !Array.isArray(j.items)) throw new Error("bad inventory");
  return { items: j.items, discounts: Array.isArray(j.discounts) ? j.discounts : [] };
}
