"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_PAYMENTS, type DiscountRule, type InventoryRow, type Order, type PaymentSettings } from "@/lib/order-store/types";
import { asset, money } from "@/lib/order-store/format";

type ItemForm = InventoryRow & { stock: number | null; published: boolean; options_json: string; image: string };
type DiscountForm = DiscountRule & { active: boolean };
type AdminTab = "items" | "discounts" | "orders" | "payments";
const blankItem = (): ItemForm => ({ id: "", name: "", category: "", description: "", price: 0, stock: null, available: true, published: false, badge: "", image: "", shelf_life: "", options_json: "", emoji: "🍽️", veg: true, unit: "", delivery_date: "", order_from: "", visible_until: "", includes: "" });
const blankDiscount = (): DiscountForm => ({ code: "", type: "percent", value: 10, minimum_subtotal: 0, active: true, starts_at: "", ends_at: "", item_ids: "", category_ids: "", max_uses: null, uses: 0 });

function imageUrl(value: string) {
  return asset(value);
}

function splitImages(value: string) {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

function orderTypeLabel(mode: string) {
  return mode === "pickup" ? "Pickup / takeaway" : "Home delivery";
}

function formatReceived(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Just now";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function orderAddress(order: Order) {
  return [order.address?.line, order.address?.landmark, order.address?.map].map((part) => part?.trim()).filter(Boolean).join(", ") || "Address not provided";
}

function paymentLabel(order: Order) {
  if (order.payment === "RAZORPAY") return "Paid online with Razorpay";
  if (order.payment === "COD") return order.fulfillment === "pickup" ? "Cash on pickup" : "Cash on delivery";
  return "Cash on receipt";
}

function InventoryPhoto({ src, emoji }: { src: string; emoji: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className="admin-item-placeholder">{emoji}</span>;
  return <img src={imageUrl(src)} alt="" onError={() => setFailed(true)} />;
}

export default function InventoryManagement({ signedIn, configured }: { signedIn: boolean; configured: boolean }) {
  const [authenticated, setAuthenticated] = useState(signedIn);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<PaymentSettings>(DEFAULT_PAYMENTS);
  const [razorpayConfigured, setRazorpayConfigured] = useState(false);
  const [item, setItem] = useState<ItemForm | null>(null);
  const [discount, setDiscount] = useState<DiscountForm | null>(null);
  const [tab, setTab] = useState<AdminTab>("items");
  const [orderQuery, setOrderQuery] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) { setBusy(true); setError(""); }
    try {
      const r = await fetch("/api/admin", { cache: "no-store" });
      const data = await r.json();
      if (r.status === 401) { setAuthenticated(false); return; }
      if (!r.ok) throw new Error(data.error || "Could not load your inventory.");
      setItems(data.items || []); setDiscounts(data.discounts || []); setOrders(Array.isArray(data.orders) ? data.orders : []);
      if (data.payments && typeof data.payments === "object") setPayments({ razorpay: data.payments.razorpay === true, cod: data.payments.cod !== false });
      if (typeof data.razorpayConfigured === "boolean") setRazorpayConfigured(data.razorpayConfigured);
    } catch (e) { if (!quiet) setError(e instanceof Error ? e.message : "Could not load inventory."); }
    finally { if (!quiet) setBusy(false); }
  }, []);

  useEffect(() => { if (authenticated) load(); }, [authenticated, load]);
  useEffect(() => {
    if (!authenticated) return;
    const timer = window.setInterval(() => { if (!document.hidden) load(true); }, 15000);
    return () => window.clearInterval(timer);
  }, [authenticated, load]);

  async function login(e: FormEvent) {
    e.preventDefault(); setBusy(true); setLoginError("");
    try {
      const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not sign in.");
      setAuthenticated(true); setPassword("");
    } catch (e) { setLoginError(e instanceof Error ? e.message : "Could not sign in."); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false); setItems([]); setDiscounts([]); setOrders([]); setItem(null); setDiscount(null);
  }

  async function mutate(operation: string, value: Record<string, unknown>) {
    setBusy(true); setError(""); setMessage("");
    try {
      const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation, ...value }) });
      const data = await r.json();
      if (r.status === 401) { setAuthenticated(false); throw new Error("Please sign in again."); }
      if (!r.ok) throw new Error(data.error || "Could not save changes.");
      if (Array.isArray(data.items)) setItems(data.items);
      if (Array.isArray(data.discounts)) setDiscounts(data.discounts);
      if (data.payments && typeof data.payments === "object") setPayments({ razorpay: data.payments.razorpay === true, cod: data.payments.cod !== false });
      setItem(null); setDiscount(null); setMessage(operation === "save-payments" ? "Payment methods updated." : "Saved to the local CSV store.");
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save changes."); return false; }
    finally { setBusy(false); }
  }

  async function uploadImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file || !item) return;
    if (!file.type.startsWith("image/")) { setError("Choose an image file."); return; }
    setBusy(true); setError("");
    try {
      const imageData = await resizeImage(file);
      const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: "upload-image", name: file.name.replace(/\.[^.]+$/, ".webp"), mimeType: "image/webp", data: imageData }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Image upload failed.");
      const urls = [data.url, ...splitImages(item.image || "").filter((url) => url !== data.url)];
      setItem({ ...item, image: urls.join(", ") });
      setMessage("Photo uploaded and set as the menu image. Save the item so customers see it.");
    } catch (e) { setError(e instanceof Error ? e.message : "Image upload failed."); }
    finally { setBusy(false); }
  }

  async function importOriginalMenu() {
    const confirmed = window.confirm("Restore any missing items from the starter menu into the local CSV store? Existing CSV rows will stay as they are.");
    if (!confirmed) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const r = await fetch("/api/admin/import-menu", { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Menu import failed.");
      setItems(data.items || []); setDiscounts(data.discounts || []);
      setMessage(`Restored ${data.imported || 0} missing menu items to the CSV store.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Menu import failed."); }
    finally { setBusy(false); }
  }

  const filtered = useMemo(() => items.filter((x) => `${x.name} ${x.category} ${x.id}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const visibleOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    return [...orders].sort((a, b) => (b.placedAt || "").localeCompare(a.placedAt || "")).filter((order) => {
      if (!q) return true;
      const haystack = [order.id, order.customer?.name, order.customer?.phone, order.customer?.email, orderTypeLabel(order.fulfillment), orderAddress(order), order.slot, ...(order.items || []).flatMap((line) => [line.name, line.options])].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [orders, orderQuery]);
  const titles: Record<AdminTab, string> = { items: "Menu & inventory", discounts: "Discount engine", orders: "Orders received", payments: "Payment methods" };
  function setPaymentFlag(key: keyof PaymentSettings, enabled: boolean) {
    const next = { ...payments, [key]: enabled };
    if (!next.cod && !(next.razorpay && razorpayConfigured)) { setError("Keep cash on delivery on until Razorpay keys are on the server and Razorpay is switched on."); setMessage(""); return; }
    if (!next.razorpay && !next.cod) { setError("Keep at least one payment method available."); setMessage(""); return; }
    mutate("save-payments", { payments: next });
  }
  const razorpayLive = payments.razorpay && razorpayConfigured;

  if (!authenticated) return <div className="admin-shell login-shell"><div className="login-card"><div className="admin-mark">MK</div><p className="admin-kicker">MARWADI KHANA · PRIVATE</p><h1>Inventory management</h1><p className="admin-muted">Sign in to manage your menu, stock, photos and offers.</p>
    {!configured ? <div className="admin-alert">The admin login is not configured on the server. Add the required private environment variables, then restart the site.</div> : null}
    <form onSubmit={login} className="admin-form"><label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>{loginError ? <p className="admin-error">{loginError}</p> : null}<button className="admin-button primary" disabled={busy || !configured}>{busy ? "Signing in…" : "Sign in securely"}</button></form>
    <p className="login-foot">This portal is private and does not appear in the customer navigation.</p></div></div>;

  return <div className="admin-shell">
    <aside className="admin-sidebar"><a className="admin-brand" href="/">MK<span>MARWADI KHANA</span></a><p className="admin-side-label">MANAGE</p><button className={tab === "items" ? "active" : ""} onClick={() => { setTab("items"); setItem(null); setDiscount(null); }}>▦ <span>Menu & inventory</span></button><button className={tab === "orders" ? "active" : ""} onClick={() => { setTab("orders"); setItem(null); setDiscount(null); }}>🧾 <span>Orders received</span></button><button className={tab === "discounts" ? "active" : ""} onClick={() => { setTab("discounts"); setItem(null); setDiscount(null); }}>％ <span>Discount engine</span></button><button className={tab === "payments" ? "active" : ""} onClick={() => { setTab("payments"); setItem(null); setDiscount(null); }}>₹ <span>Payments</span></button><div className="admin-side-bottom"><span className="admin-online-dot" /> Local CSV store<button onClick={logout}>Sign out</button></div></aside>
    <main className="admin-main"><header className="admin-top"><div><p className="admin-kicker">STORE CONTROL</p><h1>{titles[tab]}</h1></div><div className="admin-top-actions"><button className="admin-button quiet" onClick={() => load()} disabled={busy}>↻ Refresh</button>{tab === "items" ? <button className="admin-button primary" onClick={() => setItem(blankItem())}>＋ Add menu item</button> : null}{tab === "discounts" ? <button className="admin-button primary" onClick={() => setDiscount(blankDiscount())}>＋ Create discount</button> : null}</div></header>
      <div className="admin-summary"><div><span>Menu items</span><b>{items.length}</b><small>{items.filter((x) => x.published !== false).length} published to store</small></div><div><span>Low stock</span><b>{items.filter((x) => x.stock != null && Number(x.stock) <= 10).length}</b><small>10 units or fewer</small></div><div><span>Orders received</span><b>{orders.length}</b><small>Newest orders appear below</small></div><div><span>Active offers</span><b>{discounts.filter((x) => x.active).length}</b><small>Codes available at checkout</small></div></div>
      {error ? <div className="admin-alert" role="alert">{error}</div> : null}{message ? <div className="admin-success" role="status">{message}</div> : null}
      {tab === "payments" ? <section className="admin-panel"><div className="admin-panel-head"><div><h2>Payment methods</h2><p>Turn Razorpay and cash on delivery on or off. Customers only see the methods that are on.</p></div></div><div className="payment-list">
        <article className="pay-switch"><div><h3>Cash on delivery</h3><p>Customers pay in cash when the order is delivered, or when they pick it up.</p><span className={`admin-pill ${payments.cod ? "on" : "draft"}`}>{payments.cod ? "On at checkout" : "Off"}</span></div><label className="switch"><input type="checkbox" checked={payments.cod} disabled={busy} onChange={(e) => setPaymentFlag("cod", e.target.checked)} /><span /></label></article>
        <article className="pay-switch"><div><h3>Razorpay</h3><p>Customers pay online by card, UPI or netbanking before the order is confirmed.</p><span className={`admin-pill ${razorpayLive ? "on" : "draft"}`}>{razorpayLive ? "On at checkout" : payments.razorpay ? "On, waiting for keys" : "Off"}</span>{payments.razorpay && !razorpayConfigured ? <p className="pay-key-note">Add <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code> to the server environment, then restart the site. Until then, customers will not see Razorpay.</p> : <p className="pay-key-note">{razorpayConfigured ? "The Razorpay keys are on the server. Turning this on shows Pay online at checkout." : "Keys are not on the server yet. Cash on delivery stays available without them."}</p>}</div><label className="switch"><input type="checkbox" checked={payments.razorpay} disabled={busy} onChange={(e) => setPaymentFlag("razorpay", e.target.checked)} /><span /></label></article>
      </div></section> : tab === "orders" ? <section className="admin-panel"><div className="admin-panel-head"><div><h2>Orders received</h2><p>Every placed order shows here with its type, phone, address and item details.</p></div><input className="admin-search" placeholder="Search orders, phone or items" value={orderQuery} onChange={(e) => setOrderQuery(e.target.value)} /></div>
        {visibleOrders.length ? <div className="order-list">{visibleOrders.map((order) => <article className="order-card" key={order.id}><div className="order-card-top"><div><p className="admin-kicker">Order received</p><h3>{order.id}</h3><small>{formatReceived(order.placedAt)}</small></div><span className="admin-pill on">Order received</span></div><dl className="order-meta"><div><dt>Type</dt><dd>{orderTypeLabel(order.fulfillment)}</dd></div><div><dt>Phone</dt><dd>{order.customer?.phone ? <a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a> : "Not provided"}</dd></div><div><dt>Customer</dt><dd>{order.customer?.name || "Not provided"}{order.customer?.email ? <small>{order.customer.email}</small> : null}</dd></div><div><dt>Slot</dt><dd>{order.slot || "Not chosen"}</dd></div><div className="wide"><dt>{order.fulfillment === "pickup" ? "Pickup address" : "Delivery address"}</dt><dd>{orderAddress(order)}</dd></div></dl><h4>Item details</h4><ul className="order-items">{(order.items || []).map((line, index) => <li key={`${order.id}-${line.id}-${index}`}><span>{line.qty} × {line.name}{line.options ? <small>{line.options}</small> : null}</span><b>{money(line.price)}</b></li>)}</ul><p className="order-total"><span>{paymentLabel(order)}{order.discountCode ? ` · ${order.discountCode}` : ""}{order.notes ? ` · Note: ${order.notes}` : ""}</span><b>{money(order.totals?.total || 0)}</b></p></article>)}</div> : <div className="admin-empty">{orders.length ? "No orders match that search." : "No orders received yet. A new order will appear here as soon as it is placed."}</div>}
      </section> : tab === "items" ? <section className="admin-panel"><div className="admin-panel-head"><div><h2>Store menu</h2><p>Publish, draft, update stock and manage your menu photos.</p><button className="admin-text-button import-menu-button" onClick={importOriginalMenu} disabled={busy}>Restore missing items from starter menu</button></div><input className="admin-search" placeholder="Search items or categories" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        {busy && !items.length ? <div className="admin-empty">Loading your CSV inventory…</div> : filtered.length ? <div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>ITEM</th><th>CATEGORY</th><th>PRICE</th><th>STOCK</th><th>STATUS</th><th /></tr></thead><tbody>{filtered.map((x) => <tr key={x.id}><td><div className="admin-item-cell"><InventoryPhoto src={splitImages(x.image || "")[0] || ""} emoji={x.emoji || "🍽️"} /><div><strong>{x.name}</strong><small>{x.id}</small></div></div></td><td>{x.category}</td><td>₹{Number(x.price || 0).toLocaleString("en-IN")}</td><td>{x.stock == null ? "Unlimited" : x.stock}</td><td><span className={`admin-pill ${x.published === false ? "draft" : x.available === false || x.stock === 0 ? "off" : "on"}`}>{x.published === false ? "Draft" : x.available === false || x.stock === 0 ? "Unavailable" : "Live"}</span></td><td><button className="admin-text-button" onClick={() => setItem({ ...blankItem(), ...x, stock: x.stock ?? null, options_json: x.options_json || "" })}>Edit</button></td></tr>)}</tbody></table></div> : <div className="admin-empty">No menu items yet. Add your first item to start building a custom menu.</div>}
      </section> : <section className="admin-panel"><div className="admin-panel-head"><div><h2>Discount codes</h2><p>Create percentage or fixed-value promotions with date, minimum spend and product limits.</p></div></div>{discounts.length ? <div className="discount-grid">{discounts.map((d) => <article className="discount-card" key={d.code}><div className="discount-card-top"><span className="discount-symbol">％</span><span className={`admin-pill ${d.active ? "on" : "draft"}`}>{d.active ? "Active" : "Paused"}</span></div><h3>{d.code}</h3><p>{d.type === "percent" ? `${d.value}% off` : `₹${d.value} off`}{d.minimum_subtotal ? ` · min. ₹${d.minimum_subtotal}` : ""}</p><small>{d.uses || 0}{d.max_uses ? ` / ${d.max_uses}` : ""} redemptions</small><div className="discount-card-actions"><button className="admin-text-button" onClick={() => setDiscount({ ...blankDiscount(), ...d })}>Edit</button><button className="admin-text-button danger" onClick={() => { if (window.confirm(`Delete discount ${d.code}?`)) mutate("delete-discount", { code: d.code }); }}>Delete</button></div></article>)}</div> : <div className="admin-empty">No discount codes created yet.</div>}</section>}
    </main>
    {item ? <div className="admin-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setItem(null); }}><section className="admin-editor" role="dialog" aria-modal="true" aria-labelledby="item-editor-title"><div className="editor-head"><div><p className="admin-kicker">CATALOGUE EDITOR</p><h2 id="item-editor-title">{item.name ? "Edit menu item" : "New menu item"}</h2></div><button className="editor-close" onClick={() => setItem(null)} aria-label="Close">×</button></div><div className="editor-body"><div className="editor-grid">
      <label>Item ID<input value={item.id} disabled={items.some((x) => x.id === item.id)} onChange={(e) => setItem({ ...item, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="navratri-thali-day-1" /></label><label>Item name<input value={item.name || ""} onChange={(e) => setItem({ ...item, name: e.target.value })} /></label><label>Category<input value={item.category || ""} onChange={(e) => setItem({ ...item, category: e.target.value })} placeholder="Navratri Thalis" /></label><label>Price (₹)<input type="number" min="0" value={item.price ?? 0} onChange={(e) => setItem({ ...item, price: Number(e.target.value) })} /></label><label>Stock units<input type="number" min="0" value={item.stock ?? ""} placeholder="Blank = unlimited" onChange={(e) => setItem({ ...item, stock: e.target.value === "" ? null : Number(e.target.value) })} /></label><label>Badge<input value={item.badge || ""} onChange={(e) => setItem({ ...item, badge: e.target.value })} placeholder="POPULAR, NEW…" /></label><label className="wide">Description<textarea rows={2} value={item.description || ""} onChange={(e) => setItem({ ...item, description: e.target.value })} /></label>
      <label className="wide">Menu photos<div className="image-row"><input value={item.image || ""} onChange={(e) => setItem({ ...item, image: e.target.value })} placeholder="Image URLs separated by commas" /><label className="upload-button">{busy ? "Uploading…" : "Upload photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={busy} /></label></div><small>The first photo is the one customers see on the menu. Uploaded photos are saved on this server.</small><div className="editor-image-preview">{splitImages(item.image || "").map((url, i) => <figure key={`${url}-${i}`}><img src={imageUrl(url)} alt={`Menu photo ${i + 1}`} onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />{i === 0 ? <span>Menu</span> : null}<button type="button" aria-label={`Remove photo ${i + 1}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setItem({ ...item, image: splitImages(item.image || "").filter((_, index) => index !== i).join(", ") }); }}>×</button></figure>)}</div></label>
      <label>Availability<select value={item.available === false ? "off" : "on"} onChange={(e) => setItem({ ...item, available: e.target.value === "on" })}><option value="on">Available to order</option><option value="off">Temporarily unavailable</option></select></label><label>Storefront status<select value={item.published === false ? "draft" : "live"} onChange={(e) => setItem({ ...item, published: e.target.value === "live" })}><option value="draft">Draft · hidden from customers</option><option value="live">Published</option></select></label>
      <label>Delivery date (Navratri / special)<input type="date" value={item.delivery_date || ""} onChange={(e) => setItem({ ...item, delivery_date: e.target.value })} /></label><label>Order opens on<input type="date" value={item.order_from || ""} onChange={(e) => setItem({ ...item, order_from: e.target.value })} /></label><label>Hide after date<input type="date" value={item.visible_until || ""} onChange={(e) => setItem({ ...item, visible_until: e.target.value })} /></label><label>Unit label<input value={item.unit || ""} onChange={(e) => setItem({ ...item, unit: e.target.value })} placeholder="kg, box, plate" /></label><label>Shelf life<input value={item.shelf_life || ""} onChange={(e) => setItem({ ...item, shelf_life: e.target.value })} placeholder="7 days" /></label><label>Food type<select value={item.veg === false ? "nonveg" : "veg"} onChange={(e) => setItem({ ...item, veg: e.target.value === "veg" })}><option value="veg">Vegetarian</option><option value="nonveg">Non-vegetarian</option></select></label><label>Menu icon<input value={item.emoji || ""} onChange={(e) => setItem({ ...item, emoji: e.target.value })} placeholder="🍽️" /></label>
      <label className="wide">What&apos;s included<textarea rows={2} value={item.includes || ""} onChange={(e) => setItem({ ...item, includes: e.target.value })} placeholder="One item per line" /></label><label className="wide">Sizes and add-ons (JSON)<textarea className="code-input" rows={6} value={item.options_json || ""} onChange={(e) => setItem({ ...item, options_json: e.target.value })} placeholder={'[{"name":"Choose size","required":true,"choices":[{"label":"500 g","factor":0.5},{"label":"1 kg","factor":1}]}]'} /><small>Leave blank for a single price. JSON lets you define size choices and add-ons without editing the website code.</small></label>
      </div></div><div className="editor-footer"><button className="admin-button quiet" onClick={() => setItem(null)}>Cancel</button>{items.some((x) => x.id === item.id) ? <button className="admin-button danger-fill" onClick={() => { if (window.confirm(`Delete ${item.name || item.id} from the menu?`)) mutate("delete-item", { id: item.id }); }}>Delete item</button> : null}<button className="admin-button primary" disabled={busy} onClick={() => mutate("save-item", { item })}>{busy ? "Saving…" : item.published ? "Save & publish" : "Save draft"}</button></div></section></div> : null}
    {discount ? <div className="admin-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setDiscount(null); }}><section className="admin-editor small-editor" role="dialog" aria-modal="true" aria-labelledby="discount-editor-title"><div className="editor-head"><div><p className="admin-kicker">PROMOTION RULE</p><h2 id="discount-editor-title">{discount.code ? "Edit discount" : "New discount"}</h2></div><button className="editor-close" onClick={() => setDiscount(null)} aria-label="Close">×</button></div><div className="editor-body"><div className="editor-grid"><label>Promo code<input value={discount.code} onChange={(e) => setDiscount({ ...discount, code: e.target.value.toUpperCase().replace(/\s/g, "") })} placeholder="FESTIVE10" /></label><label>Discount type<select value={discount.type} onChange={(e) => setDiscount({ ...discount, type: e.target.value as "percent" | "fixed" })}><option value="percent">Percentage off</option><option value="fixed">Fixed amount off</option></select></label><label>Value {discount.type === "percent" ? "(%)" : "(₹)"}<input type="number" min="1" value={discount.value} onChange={(e) => setDiscount({ ...discount, value: Number(e.target.value) })} /></label><label>Minimum order (₹)<input type="number" min="0" value={discount.minimum_subtotal || 0} onChange={(e) => setDiscount({ ...discount, minimum_subtotal: Number(e.target.value) })} /></label><label>Starts on<input type="date" value={discount.starts_at || ""} onChange={(e) => setDiscount({ ...discount, starts_at: e.target.value })} /></label><label>Ends on<input type="date" value={discount.ends_at || ""} onChange={(e) => setDiscount({ ...discount, ends_at: e.target.value })} /></label><label>Maximum uses<input type="number" min="1" value={discount.max_uses ?? ""} placeholder="No limit" onChange={(e) => setDiscount({ ...discount, max_uses: e.target.value ? Number(e.target.value) : null })} /></label><label>Status<select value={discount.active ? "active" : "paused"} onChange={(e) => setDiscount({ ...discount, active: e.target.value === "active" })}><option value="active">Active</option><option value="paused">Paused</option></select></label><label className="wide">Limit to item IDs<input value={discount.item_ids || ""} onChange={(e) => setDiscount({ ...discount, item_ids: e.target.value })} placeholder="kaju-katli, navratri-thali-day-1 · blank means all items" /></label><label className="wide">Limit to categories<input value={discount.category_ids || ""} onChange={(e) => setDiscount({ ...discount, category_ids: e.target.value })} placeholder="mithai, navratri-thalis · blank means all categories" /></label></div></div><div className="editor-footer"><button className="admin-button quiet" onClick={() => setDiscount(null)}>Cancel</button><button className="admin-button primary" disabled={busy} onClick={() => mutate("save-discount", { discount })}>{busy ? "Saving…" : "Save discount"}</button></div></section></div> : null}
  </div>;
}

async function resizeImage(file: File): Promise<string> {
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image in this browser.");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((x) => x ? resolve(x) : reject(new Error("Could not compress the image.")), "image/webp", 0.82));
  if (blob.size > 2_500_000) throw new Error("This image is still too large. Choose a smaller photo.");
  const data = await blob.arrayBuffer();
  let binary = "";
  for (const byte of new Uint8Array(data)) binary += String.fromCharCode(byte);
  return btoa(binary);
}
