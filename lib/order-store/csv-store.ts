import { mkdir, readFile, rename, stat, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { MENU } from "@/data/order-store/menu";
import { DEFAULT_CHARGES, DEFAULT_PAYMENTS, ORDER_STATUSES, type ChargeSettings, type DiscountRule, type InventoryRow, type Order, type OrderStatus, type PaymentSettings } from "@/lib/order-store/types";

export interface CsvStore {
  items: InventoryRow[];
  discounts: DiscountRule[];
  orders: Order[];
  payments: PaymentSettings;
  charges: ChargeSettings;
}

const seedDirectory = path.join(process.cwd(), "data");
const dataDirectory = process.env.MK_DATA_DIR?.trim() ? path.resolve(process.env.MK_DATA_DIR.trim()) : seedDirectory;
const inventoryPath = path.join(dataDirectory, "inventory.csv");
const discountsPath = path.join(dataDirectory, "discounts.csv");
const ordersPath = path.join(dataDirectory, "orders.csv");
const paymentsPath = path.join(dataDirectory, "payment-settings.csv");
const lockPath = path.join(dataDirectory, ".csv-store.lock");

const INVENTORY_COLUMNS: (keyof InventoryRow)[] = [
  "id", "name", "category", "description", "price", "stock", "available", "published", "badge", "image",
  "shelf_life", "options_json", "emoji", "veg", "unit", "delivery_date", "order_from", "visible_until", "includes",
];
const DISCOUNT_COLUMNS: (keyof DiscountRule)[] = [
  "code", "type", "value", "minimum_subtotal", "active", "starts_at", "ends_at", "item_ids", "category_ids", "max_uses", "uses",
];
const ORDER_COLUMNS: (keyof Order)[] = ["id", "placedAt", "slot", "payment", "fulfillment", "customer", "address", "items", "notes", "discountCode", "status", "totals"];
const SETTINGS_COLUMNS = ["razorpay", "cod", "packaging_percent", "packaging_max"] as const;

function csvCell(value: unknown): string {
  const text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv<T extends object>(rows: T[], columns: (keyof T)[]): string {
  return [columns.map(csvCell).join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\r\n") + "\r\n";
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell.length === 0) quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  const [header = [], ...values] = rows;
  return values.filter((value) => value.some(Boolean)).map((value) => Object.fromEntries(header.map((key, i) => [key, value[i] ?? ""])));
}

const parseNumber = (value: string): number | null => value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;
const parseBoolean = (value: string, fallback = false) => value === "" ? fallback : value.toLowerCase() === "true" || value === "1";

function inventoryFromCsv(text: string): InventoryRow[] {
  return parseCsv(text).map((r) => ({
    id: r.id, name: r.name, category: r.category, description: r.description, price: parseNumber(r.price), stock: parseNumber(r.stock),
    available: parseBoolean(r.available, true), published: parseBoolean(r.published, true), badge: r.badge, image: r.image,
    shelf_life: r.shelf_life, options_json: r.options_json, emoji: r.emoji, veg: parseBoolean(r.veg, true), unit: r.unit,
    delivery_date: r.delivery_date, order_from: r.order_from, visible_until: r.visible_until, includes: r.includes,
  }));
}

function discountsFromCsv(text: string): DiscountRule[] {
  return parseCsv(text).map((r) => ({
    code: r.code, type: r.type === "fixed" ? "fixed" : "percent", value: Number(r.value || 0),
    minimum_subtotal: Number(r.minimum_subtotal || 0), active: parseBoolean(r.active), starts_at: r.starts_at, ends_at: r.ends_at,
    item_ids: r.item_ids, category_ids: r.category_ids, max_uses: parseNumber(r.max_uses), uses: Number(r.uses || 0),
  }));
}

function parseJson<T>(value: string, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function settingsFromCsv(text: string): { payments: PaymentSettings; charges: ChargeSettings } {
  const [row] = parseCsv(text);
  if (!row) return { payments: { ...DEFAULT_PAYMENTS }, charges: { ...DEFAULT_CHARGES } };
  const percent = Number(row.packaging_percent);
  const max = Number(row.packaging_max);
  return {
    payments: { razorpay: parseBoolean(row.razorpay), cod: row.cod === "" ? true : parseBoolean(row.cod) },
    charges: {
      packagingPercent: row.packaging_percent == null || row.packaging_percent === "" || !Number.isFinite(percent) ? DEFAULT_CHARGES.packagingPercent : percent,
      packagingMax: row.packaging_max == null || row.packaging_max === "" || !Number.isFinite(max) ? DEFAULT_CHARGES.packagingMax : max,
    },
  };
}

function settingsRow(payments: PaymentSettings, charges: ChargeSettings) {
  return { razorpay: payments.razorpay, cod: payments.cod, packaging_percent: charges.packagingPercent, packaging_max: charges.packagingMax };
}

function readOrderStatus(value: string): OrderStatus {
  return ORDER_STATUSES.find((status) => status === value) || "received";
}

function ordersFromCsv(text: string): Order[] {
  return parseCsv(text).map((r) => ({
    id: r.id, placedAt: r.placedAt, slot: r.slot, payment: r.payment as Order["payment"], fulfillment: r.fulfillment === "pickup" ? "pickup" : "delivery",
    customer: parseJson(r.customer, { name: "", email: "", phone: "" }), address: parseJson(r.address, { line: "", map: "", lat: null, lng: null }),
    items: parseJson(r.items, []), notes: r.notes, discountCode: r.discountCode, status: readOrderStatus(r.status), totals: parseJson(r.totals, { sub: 0, discount: 0, delivery: 0, tax: 0, packaging: 0, total: 0 }),
  }));
}

function starterInventory(): InventoryRow[] {
  return MENU.flatMap((category) => category.items.map((item) => ({
    id: item.id, name: item.name, category: category.name, description: item.desc, price: item.price,
    stock: item.stock ?? null, available: !item.unavailable && !item.soldOut, published: true, badge: item.badge || "",
    image: (item.images || []).join(", "), shelf_life: item.shelfLife || "", options_json: item.options ? JSON.stringify(item.options) : "",
    emoji: item.emoji || "🍬", veg: item.veg !== false, unit: item.unit || "", delivery_date: item.deliveryDate || "",
    order_from: item.orderFrom || "", visible_until: item.visibleUntil || "", includes: (item.includes || []).join("\n"),
  })));
}

async function writeAtomic(file: string, content: string) {
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temp, content, "utf8");
  await rename(temp, file);
}

async function ensureFiles() {
  await mkdir(dataDirectory, { recursive: true });
  try { await stat(inventoryPath); } catch {
    const seedFile = path.join(seedDirectory, "starter-inventory.csv");
    try { await writeFile(inventoryPath, await readFile(seedFile)); }
    catch { await writeAtomic(inventoryPath, toCsv(starterInventory(), INVENTORY_COLUMNS)); }
  }
  try { await stat(discountsPath); } catch {
    try { await writeFile(discountsPath, await readFile(path.join(seedDirectory, "starter-discounts.csv"))); }
    catch { await writeAtomic(discountsPath, toCsv([], DISCOUNT_COLUMNS)); }
  }
  try { await stat(ordersPath); } catch {
    try { await writeFile(ordersPath, await readFile(path.join(seedDirectory, "starter-orders.csv"))); }
    catch { await writeAtomic(ordersPath, toCsv([], ORDER_COLUMNS)); }
  }
  try { await stat(paymentsPath); } catch {
    await writeAtomic(paymentsPath, toCsv([settingsRow(DEFAULT_PAYMENTS, DEFAULT_CHARGES)], [...SETTINGS_COLUMNS]));
  }
}

async function readUnlocked(): Promise<CsvStore> {
  await ensureFiles();
  const [inventoryCsv, discountsCsv, ordersCsv, paymentsCsv] = await Promise.all([
    readFile(inventoryPath, "utf8"), readFile(discountsPath, "utf8"), readFile(ordersPath, "utf8"), readFile(paymentsPath, "utf8"),
  ]);
  const settings = settingsFromCsv(paymentsCsv);
  return { items: inventoryFromCsv(inventoryCsv), discounts: discountsFromCsv(discountsCsv), orders: ordersFromCsv(ordersCsv), payments: settings.payments, charges: settings.charges };
}

async function acquireLock() {
  await mkdir(dataDirectory, { recursive: true });
  const deadline = Date.now() + 15_000;
  while (true) {
    try { await mkdir(lockPath); return; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      try { if (Date.now() - (await stat(lockPath)).mtimeMs > 60_000) { await rm(lockPath, { recursive: true, force: true }); continue; } } catch { continue; }
      if (Date.now() >= deadline) throw new Error("The menu data is busy. Please retry in a moment.");
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  }
}

export async function withCsvStore<T>(work: (store: CsvStore) => Promise<T> | T): Promise<T> {
  await acquireLock();
  try {
    const store = await readUnlocked();
    const result = await work(store);
    await Promise.all([
      writeAtomic(inventoryPath, toCsv(store.items, INVENTORY_COLUMNS)),
      writeAtomic(discountsPath, toCsv(store.discounts, DISCOUNT_COLUMNS)),
      writeAtomic(ordersPath, toCsv(store.orders, ORDER_COLUMNS)),
      writeAtomic(paymentsPath, toCsv([settingsRow(store.payments, store.charges)], [...SETTINGS_COLUMNS])),
    ]);
    return result;
  } finally { await rm(lockPath, { recursive: true, force: true }); }
}

export async function readCsvStore(): Promise<CsvStore> {
  await acquireLock();
  try { return await readUnlocked(); }
  finally { await rm(lockPath, { recursive: true, force: true }); }
}

function imagePayload(data: string, mimeType?: string) {
  const dataUrl = /^data:(image\/(?:webp|png|jpe?g));base64,([A-Za-z0-9+/=\r\n]+)$/i.exec(data.trim());
  const mime = (dataUrl?.[1] || mimeType || "image/webp").toLowerCase();
  const payload = (dataUrl?.[2] || data).replace(/\s/g, "");
  const extension = mime === "image/png" ? "png" : mime === "image/jpeg" || mime === "image/jpg" ? "jpg" : mime === "image/webp" ? "webp" : "";
  if (!extension || !payload || !/^[A-Za-z0-9+/=]+$/.test(payload)) throw new Error("Choose a valid image file.");
  const bytes = Buffer.from(payload, "base64");
  if (!bytes.byteLength || bytes.byteLength > 3_000_000) throw new Error("Choose an image under 3 MB.");
  const signatureOk = extension === "png"
    ? bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    : extension === "jpg"
      ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (!signatureOk) throw new Error("Choose a valid image file.");
  return { bytes, extension };
}

export function saveImageData(name: string, data: string, mimeType?: string): Promise<string> {
  return (async () => {
    const { bytes, extension } = imagePayload(data, mimeType);
    const safeBase = path.basename(name, path.extname(name)).replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "menu-image";
    const filename = `${safeBase}-${randomUUID()}.${extension}`;
    const directory = process.env.MK_UPLOAD_DIR?.trim() ? path.resolve(process.env.MK_UPLOAD_DIR.trim()) : path.join(process.cwd(), "public", "uploads", "menu");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), bytes, { flag: "wx" });
    return `/menu-image/${filename}`;
  })();
}

export async function writeStoreRows(store: CsvStore) {
  await ensureFiles();
  await Promise.all([
    writeAtomic(inventoryPath, toCsv(store.items, INVENTORY_COLUMNS)),
    writeAtomic(discountsPath, toCsv(store.discounts, DISCOUNT_COLUMNS)),
    writeAtomic(ordersPath, toCsv(store.orders, ORDER_COLUMNS)),
    writeAtomic(paymentsPath, toCsv([settingsRow(store.payments, store.charges)], [...SETTINGS_COLUMNS])),
  ]);
}
