import { NextResponse } from "next/server";
import { MENU } from "@/data/order-store/menu";
import { hasAdminSession, sameOrigin } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  if (!await hasAdminSession()) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.SHEET_URL || "";
  const token = process.env.SHEETS_ADMIN_TOKEN || "";
  if (!url || !token) return NextResponse.json({ error: "Google Sheets admin integration is not configured on the server." }, { status: 503 });
  const items = MENU.flatMap((category) => category.items.map((item) => ({
    id: item.id, name: item.name, category: category.name, description: item.desc, price: item.price ?? 0,
    stock: 0, available: true, published: true, badge: item.badge || "", image: (item.images || []).join(", "),
    shelf_life: item.shelfLife || "", options_json: item.options ? JSON.stringify(item.options) : "",
    emoji: item.emoji || "🍬", veg: item.veg !== false, unit: item.unit || "",
    delivery_date: item.deliveryDate || "", order_from: item.orderFrom || "", visible_until: item.visibleUntil || "",
    includes: (item.includes || []).join("\n"),
  })));
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "admin", operation: "import-items", token, items }), cache: "no-store" });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) throw new Error(result?.error || "The Sheet could not import the menu.");
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Menu import failed." }, { status: 503 });
  }
}
