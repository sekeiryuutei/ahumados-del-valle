import { createFileRoute } from "@tanstack/react-router";
import { Home, ClipboardList } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app/AppShell";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/recepcion")({
  ssr: false,
  head: () => pageHead("Recepción de cajas"),
  component: Layout,
});
const nav: NavItem[] = [
  { to: "/recepcion", label: "Recibir cajas", icon: Home, exact: true },
  { to: "/recepcion/inventario", label: "Inventario", icon: ClipboardList, exact: false },
];
function Layout() {
  return <AppShell role="recepcion" nav={nav} portalName="Recepción de cajas" />;
}
