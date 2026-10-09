import { MENU } from "@/data/order-store/menu";
import ItemPage from "@/components/orders/ItemPage";

// One page per menu item, built ahead of time (static export).
// Items added through inventory (with no built-in detail route) use the
// generic item page instead.
export const dynamicParams = false;

export function generateStaticParams() {
  return MENU.flatMap((c) => c.items.map((i) => ({ id: i.id })));
}

export default async function Page({ params }: PageProps<"/orders/item/[id]">) {
  const { id } = await params;
  return <ItemPage id={id} />;
}
