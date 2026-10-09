"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { STORE } from "@/data/order-store/config";
import { resolveDeliveryZone } from "@/lib/order-store/area";
import { hourLabel, money } from "@/lib/order-store/format";
import { sendOrder } from "@/lib/order-store/order";
import { selLabel, totals, unitPrice } from "@/lib/order-store/pricing";
import { discountForCode } from "@/lib/order-store/pricing";
import { buildSlots, deliveryPlan, fmtDay, pastCutoff } from "@/lib/order-store/schedule";
import { save, load } from "@/lib/order-store/storage";
import type { Order } from "@/lib/order-store/types";
import { Bill, Loading } from "./bits";
import { useShop } from "./ShopProvider";

type Field = "name" | "email" | "phone" | "address" | "house";

export default function CheckoutPage() {
  const { ready, inventoryFailed, retryInventory } = useShop();
  useEffect(() => { document.title = `Checkout · ${STORE.name}`; window.scrollTo(0, 0); }, []);
  if (!ready) return <Loading failed={inventoryFailed} onRetry={retryInventory} />;
  return <CheckoutForm />;
}

function CheckoutForm() {
  const shop = useShop();
  const { cart, catalog, discounts, now: shopNow, address, openAddress, customer, setCustomer,
    fulfillmentMode, toast, applyInventory, setCartNotice, clearCart, refreshInventory, checkoutOrderId, resetCheckoutOrderId } = shop;
  const router = useRouter();

  // Starts from the details saved last time.
  const [form, setForm] = useState(() => ({
    name: customer.name || "", email: customer.email || "", phone: customer.phone || "",
    house: customer.house || "", landmark: customer.landmark || "", notes: ""
  }));
  const [showNotes, setShowNotes] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const payment = "RAZORPAY" as const;
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState("");
  const [bad, setBad] = useState<Partial<Record<Field, boolean>>>({});
  const [placing, setPlacing] = useState(false);
  // Bumped when the cut-off passes mid-checkout, so dates refresh straight away.
  const [nowOverride, setNowOverride] = useState<Date | null>(null);
  const now = nowOverride && nowOverride > shopNow ? nowOverride : shopNow;
  const fieldRefs = useRef<Partial<Record<Field, HTMLDivElement | null>>>({});

  const zone = resolveDeliveryZone(address, fulfillmentMode);
  const selectedDiscount = discountForCode(appliedCode, discounts);
  const t = totals(cart, catalog.items, fulfillmentMode, zone, selectedDiscount);
  const showActualsNote = fulfillmentMode === "delivery" && zone === "actuals";
  const plan = useMemo(() => deliveryPlan(cart, catalog.items, now), [cart, catalog.items, now]);
  const days = useMemo(() => buildSlots(plan), [plan]);

  // Nothing to check out (or a cart that can't go as one order) → back to the cart.
  useEffect(() => {
    if (placing) return;
    if (!cart.length || t.belowMin || plan.error) router.replace("/orders/cart/");
  }, [placing, cart.length, t.belowMin, plan.error, router]);

  if (!cart.length || t.belowMin || plan.error) return null;

  // The chosen day/slot, kept valid as slots change (e.g. same-day slots expiring).
  const dayI = dayIdx < days.length ? dayIdx : 0;
  const day = days[dayI];
  const slotV = day && day.slots.includes(slot) ? slot : day ? day.slots[0] : "";

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: k === "phone" ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value }));
  const pick = () => openAddress();
  const v = (k: keyof typeof form) => form[k].trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const checks: Record<Field, boolean> = {
      name: v("name").length >= 2,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email")),
      phone: /^\d{10}$/.test(v("phone")),
      address: fulfillmentMode === "pickup" || !!(address && address.ok),
      house: fulfillmentMode === "pickup" || v("house").length > 0
    };
    const badNow = Object.fromEntries(Object.entries(checks).map(([k, ok]) => [k, !ok])) as Record<Field, boolean>;
    setBad(badNow);
    const firstBad = (Object.keys(checks) as Field[]).find((k) => !checks[k]);
    if (firstBad) { fieldRefs.current[firstBad]?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (!days.length) { toast("No slots available right now. Please call us to order."); return; }

    // The 6 PM cut-off (or a same-day slot) may have passed while the form was being filled.
    const chosen = days[dayI];
    const fresh = buildSlots(deliveryPlan(cart, catalog.items, new Date()));
    if (!fresh.some((d) => d.label === chosen.label && d.slots.includes(slotV))) {
      toast(`The ${hourLabel(STORE.orderCutoffHour)} cut-off has passed. Please pick a new delivery date.`);
      shop.setCustomer({ ...customer, name: v("name"), email: v("email"), phone: v("phone"), house: v("house"), landmark: v("landmark") });
      setNowOverride(new Date());
      setDayIdx(0);
      return;
    }

    const c = { name: v("name"), email: v("email"), phone: v("phone"), house: v("house"), landmark: v("landmark") };
    setCustomer(c);

    // One ID per checkout visit, so a retry after a network hiccup can't create the same order twice.
    const id = checkoutOrderId();
    const order: Order = {
      id,
      placedAt: new Date().toISOString(),
      slot: `${chosen.label}, ${slotV}`,
      payment,
      fulfillment: fulfillmentMode,
      customer: { name: c.name, email: c.email, phone: "+91" + c.phone },
      address: fulfillmentMode === "pickup"
        ? { line: STORE.pickupAddress, map: "", lat: null, lng: null }
        : { line: c.house, landmark: c.landmark, map: address!.text, lat: address!.lat, lng: address!.lng },
      items: cart.map((l) => {
        const item = catalog.items[l.id];
        return { id: item.id, name: item.name, options: selLabel(item, l.sel), qty: l.qty, price: unitPrice(item, l.sel) * l.qty };
      }),
      notes: v("notes"),
      discountCode: selectedDiscount && t.discount ? selectedDiscount.code : undefined,
      totals: { sub: t.sub, discount: t.discount, delivery: t.delivery, tax: t.tax, total: t.total }
    };

    if (payment === "RAZORPAY") {
      setPlacing(true);
      try {
        const createdResponse = await fetch("/api/razorpay/order", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lines: cart,
            receipt: id,
            fulfillment: fulfillmentMode,
            addressText: fulfillmentMode === "delivery" ? address?.text || "" : "",
            zone,
            discountCode: selectedDiscount && t.discount ? selectedDiscount.code : "",
            customer: { name: c.name, email: c.email, phone: c.phone },
          }),
        });
        const created = await createdResponse.json();
        if (!createdResponse.ok) throw new Error(created.error || "Couldn't start your payment.");
        if (created.amount !== Math.round(order.totals.total * 100)) {
          throw new Error("The menu price or stock changed. Please refresh your order before paying.");
        }

        if (!window.Razorpay) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Couldn't load the secure payment form."));
            document.body.appendChild(script);
          });
        }
        if (!window.Razorpay) throw new Error("Secure checkout is unavailable. Please try again.");

        const checkout = new window.Razorpay({
          key: created.keyId,
          amount: created.amount,
          currency: created.currency,
          name: STORE.name,
          description: `Order ${id}`,
          order_id: created.orderId,
          prefill: { name: c.name, email: c.email, contact: c.phone },
          notes: { email: c.email, phone: c.phone, name: c.name },
          modal: { ondismiss: () => setPlacing(false) },
          handler: async (result) => {
            try {
              const verified = await fetch("/api/razorpay/verify", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: result.razorpay_order_id, paymentId: result.razorpay_payment_id,
                  signature: result.razorpay_signature, amount: created.amount,
                }),
              });
              const verification = await verified.json();
              if (!verified.ok || !verification.ok) throw new Error(verification.error || "Payment couldn't be verified.");

              if (STORE.backendUrl) {
                const sheetResult = await sendOrder(order);
                if (!sheetResult.ok) throw new Error("Payment succeeded, but we couldn't record the order. Please contact us with your order ID.");
              }
              const orders = load<Record<string, Order>>("orders", {});
              orders[id] = order;
              save("orders", orders);
              clearCart();
              resetCheckoutOrderId();
              if (STORE.backendUrl) refreshInventory();
              router.push(`/orders/order/?id=${encodeURIComponent(id)}`);
            } catch (error) {
              setPlacing(false);
              toast(error instanceof Error ? error.message : "Payment confirmation is taking longer than expected.");
            }
          },
        });
        checkout.on("payment.failed", (error) => {
          setPlacing(false);
          toast(error.description || "Payment was not completed. You can try again.");
        });
        checkout.open();
      } catch (error) {
        setPlacing(false);
        toast(error instanceof Error ? error.message : "Couldn't start your payment. Please try again.");
      }
      return;
    }

    if (STORE.backendUrl) {
      setPlacing(true);
      let res = null;
      try { res = await sendOrder(order); } catch { res = null; }
      if (!res) {
        setPlacing(false);
        toast("Couldn't reach our kitchen. Please check your internet and try again.");
        return;
      }
      if (!res.ok) {
        setPlacing(false);
        if (Array.isArray(res.items)) applyInventory(res.items);
        const names = (res.problems || []).map((p) => (p.left > 0 ? `${p.name} (only ${p.left} left)` : `${p.name} (sold out)`));
        setCartNotice(names.length
          ? `Sorry, some items just ran out: ${names.join(", ")}. We've updated your cart. Please check it and place the order again.`
          : "Sorry, we couldn't place your order. Please try again.");
        router.push("/orders/cart/");
        return;
      }
    }

    setPlacing(true);
    const orders = load<Record<string, Order>>("orders", {});
    orders[id] = order;
    save("orders", orders);
    clearCart();
    resetCheckoutOrderId();
    if (STORE.backendUrl) refreshInventory(); // our own order used up stock
    router.push(`/orders/order/?id=${encodeURIComponent(id)}`);
  }

  const payLabel = placing ? "Processing…" : payment === "RAZORPAY" ? "Pay Securely" : "Place pre-order";

  return (
    <>
      <form className="page" id="checkoutForm" noValidate onSubmit={submit}>
        <div className="field coupon-field">
          <label htmlFor="discountCode">Discount code</label>
          <div className="coupon-entry"><input id="discountCode" value={discountCode} onChange={(e) => { setDiscountCode(e.target.value.toUpperCase()); setAppliedCode(""); setCouponMessage(""); }} placeholder="Enter a code" autoCapitalize="characters" /><button type="button" className="btn ghost" onClick={() => {
            if (!discountCode.trim()) { setCouponMessage("Enter a discount code first."); return; }
            const rule = discountForCode(discountCode, discounts);
            const amount = rule ? totals(cart, catalog.items, fulfillmentMode, zone, rule).discount : 0;
            if (amount) { setAppliedCode(rule!.code); setCouponMessage(`Code applied. You save ${money(amount)}.`); }
            else { setAppliedCode(""); setCouponMessage("That code is invalid, expired, or not valid for this order."); }
          }}>{appliedCode ? "Apply again" : "Apply"}</button></div>
          {couponMessage ? <p className={`coupon-message${t.discount ? " success" : ""}`} role="status">{couponMessage}</p> : null}
        </div>
        <div className="field">
          <span className="lbl">{fulfillmentMode === "pickup" ? "Pickup Date & Slot" : "Delivery Date & Slot"} <span className="req">*</span></span>
          {plan.fixed ? (
              <p className="hint thali-hint">🍱 Your Navratri thali is available for {fulfillmentMode === "pickup" ? "pickup" : "delivery"} on <b>{fmtDay(plan.fixed)}</b>. Pick a time slot.</p>
          ) : (
            <p className="hint">
              Pre-orders placed before {hourLabel(STORE.orderCutoffHour)} can be {fulfillmentMode === "pickup" ? "picked up" : "delivered"} {STORE.preorderMinDays === 1 ? "the next day" : `in ${STORE.preorderMinDays} days`}.
              {pastCutoff(now) ? ` Today's ${hourLabel(STORE.orderCutoffHour)} cut-off has passed, so the earliest date is one day later.` : ""}
            </p>
          )}
          <div className="two">
            <select id="day" aria-label="Date" value={dayI} onChange={(e) => { setDayIdx(Number(e.target.value)); setSlot(""); }}>
              {days.map((d, i) => <option key={d.label} value={i}>{d.label}</option>)}
            </select>
            <select id="slot" aria-label="Time slot" value={slotV} onChange={(e) => setSlot(e.target.value)}>
              {(day ? day.slots : []).map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className={`field${bad.name ? " bad" : ""}`} data-f="name" ref={(el) => { fieldRefs.current.name = el; }}>
          <label htmlFor="name">Name <span className="req">*</span></label>
          <input id="name" autoComplete="name" value={form.name} onChange={set("name")} required />
          <div className="err">Please enter your name</div>
        </div>
        <div className={`field${bad.email ? " bad" : ""}`} data-f="email" ref={(el) => { fieldRefs.current.email = el; }}>
          <label htmlFor="email">Email <span className="req">*</span></label>
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} required />
          <div className="err">Please enter a valid email</div>
        </div>
        <div className={`field${bad.phone ? " bad" : ""}`} data-f="phone" ref={(el) => { fieldRefs.current.phone = el; }}>
          <label htmlFor="phone">Mobile No. <span className="req">*</span></label>
          <div className="phone"><span>+91</span><input id="phone" type="tel" inputMode="numeric" minLength={10} maxLength={10} pattern="[0-9]{10}" autoComplete="tel-national" value={form.phone} onChange={set("phone")} required /></div>
          <div className="err">Please enter a valid 10-digit mobile number</div>
        </div>
        {fulfillmentMode === "pickup" ? <div className="field"><span className="lbl">Pickup location</span><div className="addr-box">{STORE.pickupAddress}</div></div> : <>
        <div className={`field${bad.address ? " bad" : ""}`} data-f="address" ref={(el) => { fieldRefs.current.address = el; }}>
          <div className="lbl-row">
            <span className="lbl">Delivering to <span className="req">*</span> <small>(as on map)</small></span>
            <button type="button" className="link-btn" id="changeAddr" onClick={pick}>CHANGE</button>
          </div>
          <div className={`addr-box${address && address.ok ? "" : " empty"}`} id="addrBox" onClick={() => { if (!address || !address.ok) pick(); }}>
            {address && address.ok ? address.text : "Tap to pick your delivery location"}
          </div>
          <div className="err">Please pick your delivery location</div>
        </div>
        <div className={`field${bad.house ? " bad" : ""}`} data-f="house" ref={(el) => { fieldRefs.current.house = el; }}>
          <label htmlFor="house">House No / Apartment <span className="req">*</span></label>
          <input id="house" autoComplete="address-line1" value={form.house} onChange={set("house")} required />
          <div className="err">Please enter your house / flat number</div>
        </div>
        <div className="field">
          <label htmlFor="landmark">Nearest Landmark <small>(optional)</small></label>
          <input id="landmark" value={form.landmark} onChange={set("landmark")} />
        </div>
        </>}
        <div className="field">
          {showNotes ? (
            <textarea id="notes" rows={3} placeholder="Message on box, sugar preference, gate code…" value={form.notes} onChange={set("notes")} autoFocus />
          ) : (
            <button type="button" className="toggle-more" id="moreBtn" onClick={() => setShowNotes(true)}>Add more instructions +</button>
          )}
        </div>
        <div className="field">
          <span className="lbl">Payment <span className="req">*</span></span>
          <div className="pay-opts">
            <label><input type="radio" name="pay" value="RAZORPAY" checked onChange={() => {}} /> Pay Online</label>
          </div>
        </div>
        <Bill t={t} fulfillment={fulfillmentMode} zone={zone} />
      </form>
      <div className="sticky-foot pay-foot">
        <div className="inner">
          {showActualsNote ? (
            <p className="delivery-actuals-note">Delivery charges are extra and on actuals to be paid by customer</p>
          ) : null}
          <div className="topay"><span>To Pay</span><span>{money(t.total)}</span></div>
          <button className="btn primary block" id="payNow" type="submit" form="checkoutForm" disabled={placing}>{payLabel}</button>
        </div>
      </div>
    </>
  );
}
