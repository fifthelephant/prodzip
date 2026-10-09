import { STORE } from "@/data/order-store/config";
import { money } from "./format";
import type { CartLine, DeliveryZone, DiscountRule, FulfillmentMode, MenuItem, Totals } from "./types";

/**
 * A choice can scale the base price (factor: 0.5 = half a kg) and/or add a
 * fixed amount (price: +50 for gift wrap). Scaling keeps sizes right when
 * the per-kg price changes in the Sheet.
 */
export function unitPrice(item: MenuItem, sel: number[][]): number {
  let factor = 1;
  let extra = 0;
  (item.options || []).forEach((g, gi) =>
    (sel[gi] || []).forEach((ci) => {
      const c = g.choices[ci];
      if (!c) return;
      if (typeof c.factor === "number") factor *= c.factor;
      extra += c.price || 0;
    })
  );
  return Math.round((item.price ?? 0) * factor) + extra;
}

/** Cheapest way to buy the item (smallest size), used by the price filter. */
export function minPrice(item: MenuItem): number {
  let p = item.price ?? 0;
  (item.options || [])
    .filter((g) => g.required)
    .forEach((g) => {
      p = Math.min(...g.choices.map((c) => Math.round(p * (typeof c.factor === "number" ? c.factor : 1)) + (c.price || 0)));
    });
  return p;
}

/** Price shown next to a size choice (scaled) or add-on (+/- amount). */
export function choicePrice(item: MenuItem, c: { price?: number; factor?: number }): number {
  return Math.round((item.price ?? 0) * (c.factor ?? 1)) + (c.price || 0);
}

/** "Box of 8 laddus", "500 g, Festive gift wrap" — and "1 kg" for per-kg items without a size choice. */
export function selLabel(item: MenuItem, sel: number[][]): string {
  const parts: string[] = [];
  (item.options || []).forEach((g, gi) => (sel[gi] || []).forEach((ci) => g.choices[ci] && parts.push(g.choices[ci].label)));
  if (!parts.length && item.unit === "kg") parts.push("1 kg");
  return parts.join(", ");
}

export const lineKey = (id: string, sel: number[][]) => id + "|" + JSON.stringify(sel);

export function totals(
  cart: CartLine[],
  items: Record<string, MenuItem>,
  fulfillment: FulfillmentMode = "delivery",
  zone: DeliveryZone = "unknown",
  discount?: DiscountRule,
): Totals {
  const sub = cart.reduce((a, l) => (items[l.id] ? a + unitPrice(items[l.id], l.sel) * l.qty : a), 0);
  const discountAmount = discountValue(discount, cart, items, sub);
  const delivery = fulfillment === "delivery" && sub > 0 && zone === "gurugram" ? STORE.deliveryFee : 0;
  const tax = Math.round((sub - discountAmount) * STORE.taxRate);
  return { sub, discount: discountAmount, delivery, tax, total: sub - discountAmount + delivery + tax, belowMin: fulfillment === "delivery" && sub < STORE.minOrder };
}

export function discountValue(rule: DiscountRule | undefined, cart: CartLine[], items: Record<string, MenuItem>, subtotal: number): number {
  if (!rule || !rule.active || subtotal < (rule.minimum_subtotal || 0) || (rule.max_uses != null && (rule.uses || 0) >= rule.max_uses)) return 0;
  const today = new Date().toISOString().slice(0, 10);
  if ((rule.starts_at && today < rule.starts_at.slice(0, 10)) || (rule.ends_at && today > rule.ends_at.slice(0, 10))) return 0;
  const itemIds = (rule.item_ids || "").split(/[\s,|]+/).filter(Boolean);
  const categoryIds = (rule.category_ids || "").split(/[\s,|]+/).filter(Boolean).map((x) => x.toLowerCase());
  const scopedSubtotal = cart.reduce((sum, line) => {
    const item = items[line.id];
    if (!item) return sum;
    if (itemIds.length && !itemIds.includes(item.id)) return sum;
    if (categoryIds.length && !categoryIds.includes((item.category || "").toLowerCase())) return sum;
    return sum + unitPrice(item, line.sel) * line.qty;
  }, 0);
  if (scopedSubtotal <= 0) return 0;
  const amount = rule.type === "percent" ? Math.round(scopedSubtotal * rule.value / 100) : Math.round(rule.value);
  return Math.max(0, Math.min(scopedSubtotal, amount));
}

export function discountForCode(code: string, rules: DiscountRule[]): DiscountRule | undefined {
  const normalized = code.trim().toUpperCase();
  return normalized ? rules.find((rule) => rule.code.toUpperCase() === normalized) : undefined;
}

export function deliveryDisplay(t: Totals, fulfillment: FulfillmentMode, zone: DeliveryZone): string {
  if (fulfillment === "pickup") return "Not applicable";
  if (zone === "gurugram") return money(t.delivery);
  if (zone === "actuals") return "On actuals";
  return "As per location";
}
