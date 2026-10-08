import { Suspense } from "react";
import OrderPage from "@/components/orders/OrderPage";

export default function Page() {
  // The order ID comes from ?id=…, which is only known in the browser.
  return (
    <Suspense fallback={null}>
      <OrderPage />
    </Suspense>
  );
}
