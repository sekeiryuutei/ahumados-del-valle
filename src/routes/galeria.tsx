import { createFileRoute } from "@tanstack/react-router";
import { Home, ClipboardList } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app/AppShell";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/galeria")({
  ssr: false,
  head: () => pageHead("Ventas de galería"),
  component: Layout,
});
const nav: NavItem[] = [
  { to: "/galeria", label: "Vender", icon: Home, exact: true },
  { to: "/galeria/clientes", label: "Clientes", icon: ClipboardList, exact: false },
  { to: "/galeria/ventas", label: "Tirillas", icon: ClipboardList, exact: false },
  { to: "/galeria/caja", label: "Caja", icon: ClipboardList, exact: false },
];
function Layout() {
  return <AppShell role="vendedor" nav={nav} portalName="Ventas de galería" />;
}
