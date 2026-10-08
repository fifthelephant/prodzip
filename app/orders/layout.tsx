import "leaflet/dist/leaflet.css";
import "./globals.css";
import AddressDialog from "@/components/orders/AddressDialog";
import { Drawer, Toast, TopBar } from "@/components/orders/Chrome";
import { ShopProvider } from "@/components/orders/ShopProvider";

export default function OrdersLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="ordering-app">
      <ShopProvider>
        <TopBar />
        <main id="view" tabIndex={-1}>{children}</main>
        <Drawer />
        <AddressDialog />
        <Toast />
      </ShopProvider>
    </div>
  );
}
