"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOrdering = pathname === "/orders" || pathname.startsWith("/orders/");
  const isAdmin = pathname === "/admin/inventorymanagement" || pathname.startsWith("/admin/inventorymanagement/");

  if (isOrdering || isAdmin) return <>{children}</>;

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
