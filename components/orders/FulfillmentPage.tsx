"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { STORE } from "@/data/order-store/config";
import type { FulfillmentMode } from "@/lib/order-store/types";
import { useShop } from "./ShopProvider";

const modes: { id: FulfillmentMode; icon: string; title: string; copy: string; action: string }[] = [
  { id: "delivery", icon: "🛵", title: "Home delivery", copy: "Choose for Delivery Across Delhi NCR", action: "Order for delivery" },
  { id: "pickup", icon: "🥡", title: "Pickup / takeaway", copy: `Place your order ahead and collect it from ${STORE.pickupAddress}.`, action: "Order for pickup" },
];

export default function FulfillmentPage() {
  const { setFulfillmentMode, openAddress } = useShop();
  const router = useRouter();
  useEffect(() => { document.title = `Choose how to order · ${STORE.name}`; }, []);

  function choose(mode: FulfillmentMode) {
    setFulfillmentMode(mode);
    if (mode === "delivery") {
      openAddress(() => router.push("/orders/"));
      return;
    }
    router.push("/orders/");
  }

  return <section className="page fulfillment-page">
    <p className="fulfillment-kicker">A little something, made for you</p>
    <h1>How would you like your order?</h1>
    <p className="fulfillment-intro">Choose how to enjoy Marwadi Khana. You can review your menu and order details next.</p>
    <div className="fulfillment-options">
      {modes.map((mode) => <article className="fulfillment-card" key={mode.id}>
        <span className="fulfillment-icon" aria-hidden="true">{mode.icon}</span>
        <h2>{mode.title}</h2>
        <p>{mode.copy}</p>
        <button className="btn primary block" onClick={() => choose(mode.id)}>{mode.action} <span aria-hidden="true">→</span></button>
      </article>)}
    </div>
    <a className="fulfillment-back" href="/">← Back to Home</a>
  </section>;
}
