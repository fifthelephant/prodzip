// Dates, delivery slots, the 6 PM cut-off and fixed-day items (Navratri thalis).
// Everything takes `now` so it can be tested with any date.

import { STORE } from "@/data/order-store/config";
import type { CartLine, MenuItem } from "./types";

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const parseDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();
export const fmtDay = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
export const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
export const sameDayEarliest = (now: Date) => new Date(now.getTime() + STORE.sameDayPrepHours * 3600000);
export const pastCutoff = (now: Date) => now.getHours() >= STORE.orderCutoffHour;

export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Delivery slots on one day; slots starting before `earliest` are left out. */
export function slotsBetween(day: Date, openHour: number, closeHour: number, slotHours: number, earliest?: Date | null): string[] {
  const hm = (d: Date) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`;
  const ap = (d: Date) => (d.getHours() < 12 ? "AM" : "PM");
  const range = (a: Date, b: Date) =>
    ap(a) === ap(b) ? `${hm(a)} – ${hm(b)} ${ap(b)}` : `${hm(a)} ${ap(a)} – ${hm(b)} ${ap(b)}`;
  const out: string[] = [];
  for (let h = openHour; h + slotHours <= closeHour + 1e-9; h += slotHours) {
    const start = new Date(day);
    start.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
    if (earliest && start < earliest) continue;
    out.push(range(start, new Date(start.getTime() + slotHours * 3600000)));
  }
  return out;
}

/** Delivery slots on one day, e.g. "10:00 – 11:30 AM"; slots starting before `earliest` are left out. */
export function slotsOn(day: Date, earliest?: Date | null): string[] {
  return slotsBetween(day, STORE.openHour, STORE.closeHour, STORE.slotHours, earliest);
}

/** Open orders: hourly slots from 7:00–8:00 AM through 8:00–9:00 PM. */
export function openOrderSlots(day: Date, earliest?: Date | null): string[] {
  return slotsBetween(day, 7, 21, 1, earliest);
}

/** Earliest and latest calendar dates for an order that has no fixed thali day. */
export function calendarRange(now: Date): { min: Date; max: Date } {
  const today = startOfDay(now);
  const minDays = STORE.preorderMinDays + (pastCutoff(now) ? 1 : 0);
  return { min: addDays(today, minDays), max: addDays(today, 60) };
}

export type WindowStatus = "upcoming" | "open" | "closed";
export interface OrderWindow { deliver: Date; opens: Date; status: WindowStatus }

/**
 * For an item delivered on one fixed day: "upcoming" before its window opens,
 * "open" from thaliOrderDaysBefore days before (or orderFrom) until its last
 * same-day slot is too close, then "closed".
 */
export function orderWindow(item: MenuItem, now: Date): OrderWindow | null {
  if (!item.deliveryDate) return null;
  const deliver = parseDay(item.deliveryDate);
  const opens = item.orderFrom ? parseDay(item.orderFrom) : addDays(deliver, -STORE.thaliOrderDaysBefore);
  const today = startOfDay(now);
  let status: WindowStatus;
  if (today < opens) status = "upcoming";
  else if (today < deliver) status = "open";
  else if (sameDay(today, deliver) && slotsOn(deliver, sameDayEarliest(now)).length) status = "open";
  else status = "closed";
  return { deliver, opens, status };
}

export const hasPrice = (item: MenuItem) => typeof item.price === "number";
/** Seasonal items (the thalis) leave the menu after their visibleUntil date. */
export const isRetired = (item: MenuItem, now: Date) => !!item.visibleUntil && startOfDay(now) > parseDay(item.visibleUntil);
export const orderable = (item: MenuItem | undefined, now: Date): boolean =>
  !!item && !isRetired(item, now) && !item.soldOut && hasPrice(item) &&
  (!item.deliveryDate || orderWindow(item, now)!.status === "open");

const soldOutLabel = (item: MenuItem) => (item.unavailable ? "NOT AVAILABLE" : "SOLD OUT");

/** Why an item can't be ordered right now ("" if it can). Short for buttons, long for messages. */
export function blockedLabel(item: MenuItem, now: Date, long = false): string {
  if (!hasPrice(item)) return long ? "Price coming soon" : "COMING SOON";
  if (item.soldOut) return long ? (item.unavailable ? "Not available right now" : "Sold out") : soldOutLabel(item);
  const w = orderWindow(item, now);
  if (w && w.status === "upcoming") return long ? `Orders open on ${fmtDay(w.opens)}` : `OPENS ${fmtDate(w.opens).toUpperCase()}`;
  if (w && w.status === "closed") return long ? "Ordering has closed for this day" : "CLOSED";
  return "";
}

export interface DeliveryPlan {
  days: Date[];
  /** Set when the cart holds a thali: its delivery day. Other items go out that same day. */
  fixed?: Date;
  /** No thali in the cart: the customer picks any date from the calendar. */
  calendar?: boolean;
  /** Same-day thali orders: slots must start after this. */
  earliest?: Date | null;
  /** Why this cart can't be checked out as one order. */
  error?: string;
}

/**
 * Which days can this cart be delivered on? A Navratri thali fixes the day for
 * the whole order, including halwa and any other items. Without a thali, the
 * customer picks a date from the calendar.
 */
export function deliveryPlan(cart: CartLine[], items: Record<string, MenuItem>, now: Date): DeliveryPlan {
  const lines = cart.map((l) => items[l.id]).filter(Boolean);
  const fixed = [...new Set(lines.map((i) => i.deliveryDate).filter(Boolean))] as string[];
  if (fixed.length > 1) {
    return {
      days: [],
      error: "Each Navratri thali is delivered on its own day, so thalis for different days need separate orders. Please keep one day's thali in your cart."
    };
  }
  if (fixed.length === 1) {
    const day = parseDay(fixed[0]);
    return { days: [day], fixed: day, earliest: sameDay(day, now) ? sameDayEarliest(now) : null };
  }
  return { days: [], calendar: true };
}

export interface SlotDay { label: string; slots: string[] }

export function buildSlots(plan: DeliveryPlan): SlotDay[] {
  return plan.days
    .map((day) => ({ label: fmtDay(day), slots: slotsOn(day, plan.earliest) }))
    .filter((d) => d.slots.length);
}
