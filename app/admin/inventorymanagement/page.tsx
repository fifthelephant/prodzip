import { adminConfigured, hasAdminSession } from "@/lib/admin/auth";
import InventoryManagement from "./screen";
import "./admin.css";

export const metadata = { title: "Private Inventory Manager", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function InventoryManagementPage() {
  return <InventoryManagement signedIn={await hasAdminSession()} configured={adminConfigured()} />;
}
