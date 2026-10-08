import { STORE } from "@/data/order-store/config";
import type { Address, DeliveryZone, FulfillmentMode } from "./types";

const AREAS = STORE.deliveryAreas.map((a) => a.toLowerCase());
const ADMIN_PARTS = ["state", "state_district", "county", "city", "town", "city_district", "municipality"];
const GURUGRAM = ["gurugram", "gurgaon"];
const ACTUALS = ["new delhi", "delhi", "greater noida", "noida", "gautam buddha nagar", "faridabad", "ghaziabad"];

/**
 * Is this place inside the delivery area? Uses the administrative parts of an
 * OpenStreetMap address (state / district / city), not street names, so a
 * "Delhi Road" in another city doesn't count. Without a structured address
 * (typed by hand), looks for an area name in the text.
 */
export function inServiceArea(addr: Record<string, string> | null, text = ""): boolean {
  if (addr) {
    const parts = ADMIN_PARTS.map((k) => (addr[k] || "").toLowerCase()).filter(Boolean);
    return parts.some((p) => AREAS.some((a) => p === a || p.includes(a)));
  }
  const t = text.toLowerCase();
  return AREAS.some((a) => new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t));
}

/** Rough Delhi NCR box, used only when the address lookup itself fails. */
export function inServiceBox(lat: number, lng: number): boolean {
  const b = STORE.serviceBox;
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}

function addressHaystack(addr: Record<string, string> | null, text = ""): string {
  const parts = addr ? ADMIN_PARTS.map((k) => addr[k] || "") : [];
  return [...parts, text].join(" ").toLowerCase();
}

/** Gurugram is a flat ₹150 fee; Delhi, Noida, Faridabad and Ghaziabad are billed on actuals. */
export function detectDeliveryZone(addr: Record<string, string> | null, text = ""): DeliveryZone {
  const haystack = addressHaystack(addr, text);
  if (GURUGRAM.some((name) => haystack.includes(name))) return "gurugram";
  if (ACTUALS.some((name) => haystack.includes(name))) return "actuals";
  return "unknown";
}

export function resolveDeliveryZone(address: Address | null | undefined, fulfillment: FulfillmentMode): DeliveryZone {
  if (fulfillment === "pickup" || !address?.ok) return "unknown";
  return address.zone || detectDeliveryZone(null, address.text);
}
