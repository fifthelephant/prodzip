import { NextResponse } from "next/server";
import { hasAdminSession, sameOrigin } from "@/lib/admin/auth";
import { readCsvStore, saveImageData, withCsvStore } from "@/lib/order-store/csv-store";
import type { DiscountRule, InventoryRow } from "@/lib/order-store/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!await hasAdminSession()) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  try { return NextResponse.json(await readCsvStore(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load inventory." }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  if (!await hasAdminSession()) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 5_000_000) return NextResponse.json({ error: "The upload is too large. Choose an image under 3 MB." }, { status: 413 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.operation !== "string") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if (!["save-item", "delete-item", "save-discount", "delete-discount", "upload-image"].includes(body.operation)) return NextResponse.json({ error: "Unsupported inventory action." }, { status: 400 });
  try {
    if (body.operation === "upload-image") {
      if (typeof body.name !== "string" || typeof body.data !== "string") throw new Error("Choose an image file.");
      return NextResponse.json({ ok: true, url: await saveImageData(body.name, body.data) });
    }
    const result = await withCsvStore((store) => {
      if (body.operation === "save-item") {
        const item = body.item as InventoryRow | undefined;
        if (!item || typeof item.id !== "string" || !/^[a-z0-9][a-z0-9_-]{1,79}$/i.test(item.id) || !item.name?.trim()) throw new Error("Enter a valid item name and ID.");
        const stockValue = item.stock;
        const priceValue = Number(item.price);
        const normalized: InventoryRow = {
          ...item, id: item.id.trim(), name: item.name.trim(),
          price: item.price == null ? null : Number.isFinite(priceValue) ? Math.max(0, priceValue) : 0,
          stock: stockValue == null ? null : Math.max(0, Number(stockValue)),
        };
        const index = store.items.findIndex((row) => row.id === normalized.id);
        if (index < 0) store.items.push(normalized); else store.items[index] = normalized;
      } else if (body.operation === "delete-item") {
        store.items = store.items.filter((item) => item.id !== body.id);
      } else if (body.operation === "save-discount") {
        const discount = body.discount as DiscountRule | undefined;
        if (!discount || typeof discount.code !== "string" || !/^[A-Z0-9_-]{2,40}$/i.test(discount.code)) throw new Error("Enter a valid discount code.");
        const normalized = { ...discount, code: discount.code.toUpperCase().trim(), value: Math.max(0, Number(discount.value)), uses: Math.max(0, Number(discount.uses || 0)) };
        const index = store.discounts.findIndex((rule) => rule.code.toUpperCase() === normalized.code);
        if (index < 0) store.discounts.push(normalized); else store.discounts[index] = normalized;
      } else if (body.operation === "delete-discount") {
        store.discounts = store.discounts.filter((rule) => rule.code.toUpperCase() !== String(body.code || "").toUpperCase());
      }
      return { ok: true, items: store.items, discounts: store.discounts };
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save changes." }, { status: 503 }); }
}
