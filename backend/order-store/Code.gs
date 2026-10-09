/**
 * Marwadi Khana: inventory and order backend (Google Apps Script).
 *
 * This script lives inside your Google Sheet. It does two things:
 *   GET  → sends the "Inventory" tab to the website, so the site shows
 *          exactly the items, prices and stock you have in the Sheet.
 *   POST → receives an order from the website, checks there is enough stock,
 *          reduces the stock and adds the order to the "Orders" tab.
 *
 * Setup steps are in backend/SETUP.md.
 */

const INVENTORY_TAB = "Inventory";
const ORDERS_TAB = "Orders";
const INVENTORY_HEADERS = ["id", "name", "category", "description", "price", "stock", "available", "badge", "image", "shelf_life", "options_json", "emoji", "veg", "unit", "delivery_date", "order_from", "visible_until", "includes", "published"];
const DISCOUNTS_TAB = "Discounts";
const DISCOUNT_HEADERS = ["code", "type", "value", "minimum_subtotal", "active", "starts_at", "ends_at", "item_ids", "category_ids", "max_uses", "uses"];
const ORDER_HEADERS = [
  "Placed at", "Order ID", "Status", "Delivery slot", "Name", "Phone", "Email",
  "Address", "Landmark", "Map link", "Items", "Item total", "Delivery", "Tax", "To pay", "Payment", "Notes", "Fulfillment", "Discount code", "Discount"
];
const MAX_QTY_PER_ITEM = 50; // refuse obviously bogus orders

// ---------------------------------------------------------------------------
// Website → Sheet
// ---------------------------------------------------------------------------

function doGet() {
  const inv = readInventory_();
  return json_({ ok: true, items: inv.items, discounts: readDiscounts_(), updatedAt: new Date().toISOString() });
}

function doPost(e) {
  let order;
  try {
    order = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: "Bad request" });
  }
  if (order && order.action === "admin") return adminRequest_(order);
  if (!order || !order.id || !Array.isArray(order.items) || !order.items.length) {
    return json_({ ok: false, error: "Bad request" });
  }

  // One order at a time, so two customers can't buy the last box together.
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const inv = readInventory_();

    // Ignore a repeated submit of the same order (e.g. a double tap).
    if (orderExists_(order.id)) return json_({ ok: true, duplicate: true });
    if (!discountAvailable_(order.discountCode)) return json_({ ok: false, error: "discount" });

    // Add up quantities per item (the same item can appear in several sizes).
    const need = {};
    order.items.forEach(function (line) {
      const qty = Math.floor(Number(line.qty));
      if (!line.id || !(qty > 0)) throw new Error("Bad line");
      need[line.id] = (need[line.id] || 0) + qty;
    });

    const problems = [];
    Object.keys(need).forEach(function (id) {
      const item = inv.byId[id];
      if (!item || !item.available) {
        problems.push({ id: id, name: item ? item.name : id, left: 0 });
      } else if (need[id] > MAX_QTY_PER_ITEM) {
        problems.push({ id: id, name: item.name, left: Math.min(MAX_QTY_PER_ITEM, item.stock == null ? MAX_QTY_PER_ITEM : item.stock) });
      } else if (item.stock != null && need[id] > item.stock) {
        problems.push({ id: id, name: item.name, left: item.stock });
      }
    });
    if (problems.length) {
      return json_({ ok: false, error: "stock", problems: problems, items: inv.items });
    }

    // Reduce stock (blank stock = unlimited, left untouched).
    Object.keys(need).forEach(function (id) {
      const item = inv.byId[id];
      if (item.stock != null) inv.sheet.getRange(item.row, inv.col.stock + 1).setValue(item.stock - need[id]);
    });

    appendOrder_(order);
    consumeDiscount_(order.discountCode);
    emailCustomer_(order);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: "Bad request" });
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Sheet helpers
// ---------------------------------------------------------------------------

function readInventory_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(INVENTORY_TAB);
  if (!sheet) throw new Error('No "' + INVENTORY_TAB + '" tab. Run setup first.');
  ensureHeaders_(sheet, INVENTORY_HEADERS);
  const values = sheet.getDataRange().getValues();
  const head = values.shift().map(function (h) { return String(h).trim().toLowerCase(); });
  const col = {};
  INVENTORY_HEADERS.forEach(function (h) { col[h] = head.indexOf(h); });

  const items = [];
  const byId = {};
  values.forEach(function (r, i) {
    const id = String(cell_(r, col.id)).trim();
    if (!id) return;
    const stockRaw = cell_(r, col.stock);
    const stock = stockRaw === "" || stockRaw == null ? null : Math.max(0, Math.floor(Number(stockRaw)) || 0);
    const priceRaw = cell_(r, col.price);
    const item = {
      id: id,
      name: String(cell_(r, col.name)).trim(),
      category: String(cell_(r, col.category)).trim(),
      description: String(cell_(r, col.description)).trim(),
      price: priceRaw === "" || priceRaw == null || isNaN(Number(priceRaw)) ? null : Number(priceRaw),
      stock: stock,
      available: isYes_(cell_(r, col.available)),
      badge: String(cell_(r, col.badge)).trim(),
      image: String(cell_(r, col.image)).trim(),
      shelf_life: String(cell_(r, col.shelf_life)).trim(),
      options_json: String(cell_(r, col.options_json)).trim(),
      emoji: String(cell_(r, col.emoji)).trim(),
      veg: isYes_(cell_(r, col.veg)),
      unit: String(cell_(r, col.unit)).trim(),
      delivery_date: String(cell_(r, col.delivery_date)).trim(),
      order_from: String(cell_(r, col.order_from)).trim(),
      visible_until: String(cell_(r, col.visible_until)).trim(),
      includes: String(cell_(r, col.includes)).trim(),
      published: isYes_(cell_(r, col.published))
    };
    items.push(item);
    byId[id] = Object.assign({ row: i + 2 }, item);
  });
  return { sheet: sheet, col: col, items: items, byId: byId };
}

function cell_(row, idx) {
  return idx < 0 ? "" : row[idx];
}

function ensureHeaders_(sheet, headers) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
  if (!existing.some(String)) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return headers.slice();
  }
  headers.forEach(function (header) {
    if (existing.indexOf(header) === -1) {
      existing.push(header);
      sheet.getRange(1, existing.length).setValue(header);
    }
  });
  return existing;
}

function readDiscounts_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(DISCOUNTS_TAB);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const headers = ensureHeaders_(sheet, DISCOUNT_HEADERS).map(function (h) { return String(h).trim().toLowerCase(); });
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return rows.map(function (r) {
    const get = function (key) { const i = headers.indexOf(key); return i < 0 ? "" : r[i]; };
    const code = String(get("code")).trim().toUpperCase();
    if (!code) return null;
    return {
      code: code,
      type: String(get("type")).trim().toLowerCase(),
      value: Number(get("value")) || 0,
      minimum_subtotal: Number(get("minimum_subtotal")) || 0,
      active: isYes_(get("active")),
      starts_at: String(get("starts_at") || "").trim(),
      ends_at: String(get("ends_at") || "").trim(),
      item_ids: String(get("item_ids") || "").trim(),
      category_ids: String(get("category_ids") || "").trim(),
      max_uses: get("max_uses") === "" ? null : Number(get("max_uses")) || 0,
      uses: Number(get("uses")) || 0
    };
  }).filter(Boolean);
}

function adminRequest_(body) {
  const expected = PropertiesService.getScriptProperties().getProperty("SHEETS_ADMIN_TOKEN") || "";
  if (!expected || !body.token || String(body.token) !== expected) return json_({ ok: false, error: "Admin integration is not authorized." });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const op = String(body.operation || "");
    if (op === "list") return json_({ ok: true, items: readInventory_().items, discounts: readDiscounts_() });
    if (op === "import-items") return importItems_(body.items);
    if (op === "save-item") return saveItem_(body.item || {});
    if (op === "delete-item") return deleteItem_(body.id);
    if (op === "save-discount") return saveDiscount_(body.discount || {});
    if (op === "delete-discount") return deleteDiscount_(body.code);
    if (op === "upload-image") return uploadImage_(body);
    return json_({ ok: false, error: "Unknown admin operation." });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || "Admin request failed.") });
  } finally {
    lock.releaseLock();
  }
}

function importItems_(items) {
  if (!Array.isArray(items) || items.length > 250) throw new Error("Invalid menu import.");
  let added = 0;
  items.forEach(function (item) {
    const id = String(item && item.id || "").trim().toLowerCase();
    if (id && !readInventory_().byId[id]) {
      saveItem_(item);
      added++;
    }
  });
  return json_({ ok: true, imported: added, items: readInventory_().items, discounts: readDiscounts_() });
}

function saveItem_(item) {
  const id = String(item.id || "").trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error("Item ID must use lowercase letters, numbers, and hyphens.");
  const name = String(item.name || "").trim();
  const category = String(item.category || "").trim();
  const price = Number(item.price);
  const stockText = item.stock == null ? "" : String(item.stock).trim();
  if (!name || !category || !isFinite(price) || price < 0) throw new Error("Name, category and a valid price are required.");
  if (stockText && (!/^\d+$/.test(stockText) || Number(stockText) < 0)) throw new Error("Stock must be a whole number or blank for unlimited.");
  let options = String(item.options_json || "").trim();
  if (options) { JSON.parse(options); }
  const sheet = SpreadsheetApp.getActive().getSheetByName(INVENTORY_TAB);
  if (!sheet) throw new Error("Inventory tab is missing. Run setup first.");
  const headers = ensureHeaders_(sheet, INVENTORY_HEADERS);
  const lookup = headers.map(function (h) { return String(h).trim().toLowerCase(); });
  const existing = readInventory_().byId[id];
  const values = {
    id: id, name: name, category: category, description: String(item.description || ""), price: price,
    stock: stockText, available: item.available === false ? false : true, badge: String(item.badge || ""),
    image: String(item.image || ""), shelf_life: String(item.shelf_life || ""), options_json: options,
    emoji: String(item.emoji || "🍬"), veg: item.veg === false ? false : true, unit: String(item.unit || ""),
    delivery_date: String(item.delivery_date || ""), order_from: String(item.order_from || ""),
    visible_until: String(item.visible_until || ""), includes: String(item.includes || ""),
    published: item.published === false ? false : true
  };
  const row = lookup.map(function (h) { return Object.prototype.hasOwnProperty.call(values, h) ? values[h] : ""; });
  if (existing) sheet.getRange(existing.row, 1, 1, headers.length).setValues([row]);
  else sheet.appendRow(row);
  return json_({ ok: true, items: readInventory_().items, discounts: readDiscounts_() });
}

function deleteItem_(idValue) {
  const id = String(idValue || "").trim();
  const item = readInventory_().byId[id];
  if (!item) throw new Error("Item not found.");
  SpreadsheetApp.getActive().getSheetByName(INVENTORY_TAB).deleteRow(item.row);
  return json_({ ok: true, items: readInventory_().items, discounts: readDiscounts_() });
}

function saveDiscount_(discount) {
  const code = String(discount.code || "").trim().toUpperCase();
  const type = String(discount.type || "").toLowerCase();
  const value = Number(discount.value);
  const minimum = Number(discount.minimum_subtotal || 0);
  if (!/^[A-Z0-9_-]{3,24}$/.test(code) || !["percent", "fixed"].includes(type) || !isFinite(value) || value <= 0 || (type === "percent" && value > 100) || minimum < 0) {
    throw new Error("Enter a valid code, discount type and value.");
  }
  let sheet = SpreadsheetApp.getActive().getSheetByName(DISCOUNTS_TAB);
  if (!sheet) sheet = SpreadsheetApp.getActive().insertSheet(DISCOUNTS_TAB);
  const headers = ensureHeaders_(sheet, DISCOUNT_HEADERS);
  const lookup = headers.map(function (h) { return String(h).trim().toLowerCase(); });
  const lastRow = sheet.getLastRow();
  let target = 0;
  let uses = 0;
  if (lastRow > 1) {
    const rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    rows.forEach(function (row, i) {
      const codeIndex = lookup.indexOf("code");
      if (String(row[codeIndex] || "").trim().toUpperCase() === code) {
        target = i + 2;
        const usesIndex = lookup.indexOf("uses");
        uses = usesIndex < 0 ? 0 : Number(row[usesIndex]) || 0;
      }
    });
  }
  const values = {
    code: code, type: type, value: value, minimum_subtotal: minimum, active: discount.active !== false,
    starts_at: String(discount.starts_at || ""), ends_at: String(discount.ends_at || ""),
    item_ids: String(discount.item_ids || ""), category_ids: String(discount.category_ids || ""),
    max_uses: discount.max_uses == null || discount.max_uses === "" ? "" : Number(discount.max_uses), uses: uses
  };
  const row = lookup.map(function (h) { return Object.prototype.hasOwnProperty.call(values, h) ? values[h] : ""; });
  if (target) sheet.getRange(target, 1, 1, headers.length).setValues([row]); else sheet.appendRow(row);
  return json_({ ok: true, items: readInventory_().items, discounts: readDiscounts_() });
}

function deleteDiscount_(codeValue) {
  const code = String(codeValue || "").trim().toUpperCase();
  const sheet = SpreadsheetApp.getActive().getSheetByName(DISCOUNTS_TAB);
  if (!sheet || sheet.getLastRow() < 2) throw new Error("Discount not found.");
  const headers = ensureHeaders_(sheet, DISCOUNT_HEADERS).map(function (h) { return String(h).trim().toLowerCase(); });
  const index = headers.indexOf("code");
  const values = sheet.getRange(2, index + 1, sheet.getLastRow() - 1, 1).getValues();
  const offset = values.findIndex(function (r) { return String(r[0]).trim().toUpperCase() === code; });
  if (offset < 0) throw new Error("Discount not found.");
  sheet.deleteRow(offset + 2);
  return json_({ ok: true, items: readInventory_().items, discounts: readDiscounts_() });
}

function uploadImage_(body) {
  const mime = String(body.mimeType || "");
  const encoded = String(body.data || "");
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime) || !encoded || encoded.length > 3800000) throw new Error("Choose a JPG, PNG or WebP image under 2.5 MB.");
  const bytes = Utilities.base64Decode(encoded);
  const blob = Utilities.newBlob(bytes, mime, String(body.name || "menu-image").slice(0, 100));
  const folderId = PropertiesService.getScriptProperties().getProperty("INVENTORY_IMAGE_FOLDER_ID");
  const file = folderId ? DriveApp.getFolderById(folderId).createFile(blob) : DriveApp.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return json_({ ok: true, url: "https://drive.google.com/uc?export=view&id=" + file.getId() });
}

// Blank counts as "yes" so new rows show up unless you untick them.
function isYes_(v) {
  if (v === "" || v == null) return true;
  if (v === true || v === false) return v;
  return !/^(no|n|false|0|off)$/i.test(String(v).trim());
}

function orderExists_(id) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(ORDERS_TAB);
  if (!sheet || sheet.getLastRow() < 2) return false;
  const ids = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
  return ids.some(function (r) { return String(r[0]) === String(id); });
}

function appendOrder_(o) {
  let sheet = SpreadsheetApp.getActive().getSheetByName(ORDERS_TAB);
  if (!sheet) {
    sheet = SpreadsheetApp.getActive().insertSheet(ORDERS_TAB);
    sheet.appendRow(ORDER_HEADERS);
    sheet.setFrozenRows(1);
  } else {
    // Existing Orders tabs predate the pickup / takeaway choice. Add the new
    // column at the end so existing data and manually added columns stay put.
    const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    if (headers.indexOf("Fulfillment") === -1) {
      sheet.getRange(1, headers.length + 1).setValue("Fulfillment");
    }
  }
  const c = o.customer || {};
  const a = o.address || {};
  const t = o.totals || {};
  const items = o.items.map(function (i) {
    return i.qty + " × " + i.name + (i.options ? " (" + i.options + ")" : "");
  }).join("\n");
  const row = [
    new Date(),
    safe_(o.id), "New", safe_(o.slot), safe_(c.name), safe_(c.phone), safe_(c.email),
    safe_([a.line, a.map].filter(String).join(", ")), safe_(a.landmark),
    a.lat != null ? "https://maps.google.com/?q=" + Number(a.lat) + "," + Number(a.lng) : "",
    safe_(items), num_(t.sub), num_(t.delivery), num_(t.tax), num_(t.total), safe_(o.payment), safe_(o.notes)
  ];
  const headers = ensureHeaders_(sheet, ORDER_HEADERS);
  row[headers.indexOf("Fulfillment")] = safe_(o.fulfillment || "delivery");
  row[headers.indexOf("Discount code")] = safe_(o.discountCode || "");
  row[headers.indexOf("Discount")] = num_(t.discount);
  sheet.appendRow(row);
}

function discountAvailable_(codeValue) {
  const code = String(codeValue || "").trim().toUpperCase();
  if (!code) return true;
  const discount = readDiscounts_().filter(function (d) { return d.code === code && d.active; })[0];
  return !!discount && (discount.max_uses == null || discount.uses < discount.max_uses);
}

function consumeDiscount_(codeValue) {
  const code = String(codeValue || "").trim().toUpperCase();
  if (!code) return;
  const sheet = SpreadsheetApp.getActive().getSheetByName(DISCOUNTS_TAB);
  if (!sheet || sheet.getLastRow() < 2) return;
  const headers = ensureHeaders_(sheet, DISCOUNT_HEADERS).map(function (h) { return String(h).trim().toLowerCase(); });
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const ci = headers.indexOf("code"), ui = headers.indexOf("uses");
  rows.forEach(function (row, i) {
    if (String(row[ci] || "").trim().toUpperCase() === code) sheet.getRange(i + 2, ui + 1).setValue((Number(row[ui]) || 0) + 1);
  });
}

// Customer text must never be treated as a spreadsheet formula.
function safe_(v) {
  const s = String(v == null ? "" : v).slice(0, 2000);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}
function num_(v) {
  const n = Number(v);
  return isFinite(n) ? n : "";
}

function emailCustomer_(o) {
  const email = o.customer && String(o.customer.email || "").trim();
  if (!email || email.indexOf("@") < 1) return;
  const t = o.totals || {};
  const items = (o.items || []).map(function (i) {
    return i.qty + " × " + i.name + (i.options ? " (" + i.options + ")" : "");
  }).join("\n");
  const delivery = o.fulfillment === "pickup" ? "Not applicable" : (t.delivery ? "₹" + t.delivery : "On actuals");
  try {
    MailApp.sendEmail({
      to: email.slice(0, 200),
      subject: "Marwadi Khana order " + safe_(o.id),
      body: [
        "Thank you for your order with Marwadi Khana.",
        "",
        "Order ID: " + o.id,
        (o.fulfillment === "pickup" ? "Pickup" : "Delivery") + ": " + o.slot,
        "",
        items,
        "",
        "Item total: ₹" + t.sub,
        t.discount ? "Discount" + (o.discountCode ? " (" + o.discountCode + ")" : "") + ": -₹" + t.discount : "",
        "Delivery: " + delivery,
        "GST: ₹" + t.tax,
        "To pay: ₹" + t.total,
        "",
        "We will contact you on " + ((o.customer && o.customer.phone) || "your mobile") + " for updates."
      ].join("\n")
    });
  } catch (err) {
    // Recording the order matters more than the confirmation email.
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// One-time setup: run this once from the Apps Script editor (▶ Run → setup).
// It adds the tabs, headers, tick boxes and low-stock colours. Safe to re-run.
// ---------------------------------------------------------------------------

function setup() {
  const ss = SpreadsheetApp.getActive();
  let inv = ss.getSheetByName(INVENTORY_TAB);
  if (!inv) {
    // If you imported inventory-template.csv into the first tab, just rename it.
    const first = ss.getSheets()[0];
    if (first && String(first.getRange(1, 1).getValue()).trim().toLowerCase() === "id") {
      inv = first.setName(INVENTORY_TAB);
    } else {
      inv = ss.insertSheet(INVENTORY_TAB);
    }
  }
  ensureHeaders_(inv, INVENTORY_HEADERS);
  inv.setFrozenRows(1);
  inv.getRange(1, 1, 1, inv.getLastColumn()).setFontWeight("bold").setBackground("#7b1626").setFontColor("#ffffff");

  // Only rows that already have items get tick boxes, so a row you add later
  // with "available" left blank still counts as available.
  const rows = Math.max(inv.getLastRow() - 1, 1);
  const head = inv.getRange(1, 1, 1, inv.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); });
  const availCol = head.indexOf("available") + 1;
  const stockCol = head.indexOf("stock") + 1;

  if (availCol > 0) {
    const range = inv.getRange(2, availCol, rows, 1);
    // Turn "TRUE"/"FALSE"/"Yes"/"No"/blank into real tick boxes.
    const ids = inv.getRange(2, 1, rows, 1).getValues();
    const vals = range.getValues().map(function (r, i) {
      return [ids[i][0] === "" ? false : isYes_(r[0])];
    });
    range.setValues(vals);
    range.insertCheckboxes();
  }
  if (stockCol > 0) {
    const stockRange = inv.getRange(2, stockCol, rows, 1);
    const letter = columnLetter_(stockCol);
    const rules = inv.getConditionalFormatRules().filter(function (r) {
      return !r.getRanges().some(function (g) { return g.getColumn() === stockCol; });
    });
    rules.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied("=AND($A2<>\"\",ISNUMBER(" + letter + "2)," + letter + "2<=0)")
        .setBackground("#f4c7c3").setFontColor("#a50e0e").setRanges([stockRange]).build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied("=AND($A2<>\"\",ISNUMBER(" + letter + "2)," + letter + "2<=10)")
        .setBackground("#fce8b2").setRanges([stockRange]).build()
    );
    inv.setConditionalFormatRules(rules);
  }
  inv.autoResizeColumns(1, inv.getLastColumn());

  let discounts = ss.getSheetByName(DISCOUNTS_TAB);
  if (!discounts) discounts = ss.insertSheet(DISCOUNTS_TAB);
  ensureHeaders_(discounts, DISCOUNT_HEADERS);
  discounts.setFrozenRows(1);
  discounts.getRange(1, 1, 1, discounts.getLastColumn()).setFontWeight("bold").setBackground("#7b1626").setFontColor("#ffffff");

  let orders = ss.getSheetByName(ORDERS_TAB);
  if (!orders) {
    orders = ss.insertSheet(ORDERS_TAB);
    orders.appendRow(ORDER_HEADERS);
  }
  orders.setFrozenRows(1);
  orders.getRange(1, 1, 1, ORDER_HEADERS.length).setFontWeight("bold").setBackground("#7b1626").setFontColor("#ffffff");
}

// Run once manually in Apps Script to grant the Drive permission needed for
// photo uploads from the private inventory portal.
function authorizeDrive() {
  DriveApp.getRootFolder().getName();
}

function columnLetter_(n) {
  let s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
