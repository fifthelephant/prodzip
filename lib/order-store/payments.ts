import type { PaymentSettings } from "./types";

/** True only when both Razorpay values are present in the server environment. */
export function razorpayKeysConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
}

/** What customers can actually choose. Razorpay stays hidden until the keys exist. */
export function customerPayments(settings: PaymentSettings): PaymentSettings {
  return { razorpay: settings.razorpay && razorpayKeysConfigured(), cod: settings.cod };
}
