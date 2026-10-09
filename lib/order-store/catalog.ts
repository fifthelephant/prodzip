import { MENU } from "@/data/order-store/menu";
import { slug } from "./format";
import type { Category, InventoryRow, MenuItem } from "./types";

/** Items with a pre-built page at /item/<id>/ (everything in data/menu.ts). */
const STATIC_ITEM_IDS = new Set(MENU.flatMap((c) => c.items.map((i) => i.id)));

/** Link to an item page. Items without a built-in page use /item/?id=… */
export const itemHref = (id: string) =>
  STATIC_ITEM_IDS.has(id) ? `/orders/item/${id}/` : `/orders/item/?id=${encodeURIComponent(id)}`;

export interface Catalog {
  categories: Category[];
  items: Record<string, MenuItem>;
}

/**
 * Build the menu from the CSV inventory rows. The starter menu supplies
 * defaults for original item details; CSV values control published items,
 * names, categories, prices, availability, and stock.
 */
export function buildCatalog(inventory: InventoryRow[] | null): Catalog {
  const base: Record<string, MenuItem> = {};
  MENU.forEach((c) => c.items.forEach((i) => { base[i.id] = { ...i, category: c.id }; }));

  let cats: Category[];
  if (!inventory) {
    cats = MENU.map((c) => ({ ...c, items: c.items.map((i) => ({ ...base[i.id] })) }));
  } else {
    cats = MENU.map((c) => ({ id: c.id, name: c.name, subtitle: c.subtitle, items: [] }));
    inventory.forEach((row) => {
      if (row.published === false) return;
      const b: Partial<MenuItem> = base[row.id] || {};
      const catName = row.category || cats.find((c) => c.id === b.category)?.name || "More";
      let cat = cats.find((c) => c.name.toLowerCase() === catName.toLowerCase() || c.id === catName.toLowerCase());
      if (!cat) {
        cat = { id: slug(catName) || "more", name: catName, items: [] };
        cats.push(cat);
      }
      let options = b.options;
      if (row.options_json) {
        try {
          const parsed = JSON.parse(row.options_json);
          if (Array.isArray(parsed)) options = parsed;
        } catch { /* A malformed optional field falls back to the built-in choices. */ }
      }
      cat.items.push({
        ...b,
        id: row.id,
        name: row.name || b.name || row.id,
        desc: row.description || b.desc || "",
        price: typeof row.price === "number" ? row.price : b.price ?? null,
        badge: row.badge || b.badge || "",
        shelfLife: row.shelf_life || b.shelfLife || "",
        // The Sheet's image column can hold one link or several, separated by commas.
        images: row.image ? row.image.split(",").map((part) => part.trim()).filter(Boolean) : b.images,
        emoji: row.emoji || b.emoji || "🍬",
        veg: typeof row.veg === "boolean" ? row.veg : b.veg,
        options,
        unit: row.unit || b.unit,
        deliveryDate: row.delivery_date || b.deliveryDate,
        orderFrom: row.order_from || b.orderFrom,
        visibleUntil: row.visible_until || b.visibleUntil,
        includes: row.includes ? row.includes.split(/\r?\n|\s*\|\s*/).map((x) => x.trim()).filter(Boolean) : b.includes,
        stock: typeof row.stock === "number" ? row.stock : null,
        soldOut: row.available === false || row.stock === 0,
        unavailable: row.available === false,
        category: cat.id
      });
    });
  }
  const categories = cats.filter((c) => c.items.length);
  const items: Record<string, MenuItem> = {};
  categories.forEach((c) => c.items.forEach((i) => { items[i.id] = i; }));
  return { categories, items };
}
