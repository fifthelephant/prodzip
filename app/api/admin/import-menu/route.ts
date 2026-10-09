import { NextResponse } from "next/server";
import { MENU } from "@/data/order-store/menu";
import { hasAdminSession, sameOrigin } from "@/lib/admin/auth";
import { withCsvStore } from "@/lib/order-store/csv-store";
import type { InventoryRow } from "@/lib/order-store/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  if (!await hasAdminSession()) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  try {
    const result = await withCsvStore((store) => {
      const existing = new Set(store.items.map((item) => item.id));
      const missing: InventoryRow[] = MENU.flatMap((category) => category.items.filter((item) => !existing.has(item.id)).map((item) => ({
        id: item.id, name: item.name, category: category.name, description: item.desc, price: item.price,
        stock: item.stock ?? null, available: !item.unavailable && !item.soldOut, published: true, badge: item.badge || "",
        image: (item.images || []).join(", "), shelf_life: item.shelfLife || "", options_json: item.options ? JSON.stringify(item.options) : "",
        emoji: item.emoji || "🍬", veg: item.veg !== false, unit: item.unit || "", delivery_date: item.deliveryDate || "",
        order_from: item.orderFrom || "", visible_until: item.visibleUntil || "", includes: (item.includes || []).join("\n"),
      })));
      store.items.push(...missing);
      return { ok: true, imported: missing.length, items: store.items, discounts: store.discounts };
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Menu import failed." }, { status: 503 });
  }
}
