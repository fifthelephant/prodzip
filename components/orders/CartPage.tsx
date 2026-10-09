"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { STORE } from "@/data/order-store/config";
import { money } from "@/lib/order-store/format";
import { resolveDeliveryZone } from "@/lib/order-store/area";
import { selLabel, totals, unitPrice } from "@/lib/order-store/pricing";
import { deliveryPlan, fmtDay } from "@/lib/order-store/schedule";
import { Bill, Loading, VegMark } from "./bits";
import { useShop } from "./ShopProvider";

export default function CartPage() {
  const { ready, inventoryFailed, retryInventory, cart, catalog, charges, now, cartNotice, roomFor, setQty, address, openAddress, fulfillmentMode } = useShop();
  const router = useRouter();
  useEffect(() => { document.title = `Your Order · ${STORE.name}`; }, []);

  if (!ready) return <Loading failed={inventoryFailed} onRetry={retryInventory} />;

  // A one-time message, e.g. "some items just ran out" (cleared when leaving the cart).
  const notice = cartNotice ? <p className="notice" role="alert">{cartNotice}</p> : null;
  const lines = cart.filter((l) => catalog.items[l.id]);

  if (!lines.length) {
    return (
      <div className="page">
        <h1>Your Order</h1>
        {notice}
        <p className="empty">🪔<br /><br />Your cart is empty.<br />Add some mithai to get started.</p>
        <Link className="btn primary block" href="/orders/">Browse menu</Link>
      </div>
    );
  }

  const zone = resolveDeliveryZone(address, fulfillmentMode);
  const t = totals(cart, catalog.items, fulfillmentMode, zone, undefined, charges);
  const plan = deliveryPlan(cart, catalog.items, now);

  const proceed = () => {
    if (fulfillmentMode === "pickup") router.push("/orders/checkout/");
    else if (!address || !address.ok) openAddress(() => router.push("/orders/checkout/"));
    else router.push("/orders/checkout/");
  };

  return (
    <>
      <div className="page">
        <h1>Your Order</h1>
        <p className="sub">Pre-order from {STORE.name} · {fulfillmentMode === "pickup" ? "pickup / takeaway" : `home delivery in ${STORE.city}`}</p>
        {notice}
        {lines.map((l) => {
          const item = catalog.items[l.id];
          const opt = selLabel(item, l.sel);
          return (
            <div className="line" key={l.key}>
              <div>
                <div className="nm"><VegMark item={item} inline /> {item.name}</div>
                {opt ? <div className="opt">{opt}</div> : null}
              </div>
              <div className="stepper">
                <button data-key={l.key} data-d="-1" aria-label="Remove one" onClick={() => setQty(l.key, l.qty - 1)}>−</button>
                <span>{l.qty}</span>
                <button data-key={l.key} data-d="1" aria-label="Add one" disabled={roomFor(l.id) <= 0} onClick={() => setQty(l.key, l.qty + 1)}>+</button>
              </div>
              <div className="amt">{money(unitPrice(item, l.sel) * l.qty)}</div>
            </div>
          );
        })}
        <p><Link href="/orders/" className="link-btn">+ ADD MORE ITEMS</Link></p>
        <Bill t={t} fulfillment={fulfillmentMode} zone={zone} />
        {fulfillmentMode === "delivery" && t.belowMin ? <p className="note">Minimum order for delivery is {money(STORE.minOrder)}.</p> : null}
        {plan.error ? (
          <p className="notice" role="alert">{plan.error}</p>
        ) : plan.fixed ? (
          <p className="note thali-note">🍱 This order will be delivered on <b>{fmtDay(plan.fixed)}</b>, your thali&apos;s day.</p>
        ) : null}
      </div>
      <div className="sticky-foot pay-foot">
        <div className="inner">
          <div className="topay"><span>To Pay</span><span>{money(t.total)}</span></div>
          <button className="btn primary block" id="proceed" disabled={t.belowMin || !!plan.error} onClick={proceed}>Proceed</button>
        </div>
      </div>
    </>
  );
}
