import { createFileRoute } from "@tanstack/react-router";
import { Home, ClipboardList } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app/AppShell";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/ruta")({
  ssr: false,
  head: () => pageHead("Empleados de ruta"),
  component: Layout,
});
const nav: NavItem[] = [
  { to: "/ruta", label: "Mi ruta", icon: Home, exact: true },
  { to: "/ruta/vender", label: "Vender", icon: ClipboardList, exact: false },
  { to: "/ruta/clientes", label: "Clientes", icon: ClipboardList, exact: false },
  { to: "/ruta/ventas", label: "Tirillas", icon: ClipboardList, exact: false },
];
function Layout() {
  return <AppShell role="ruta" nav={nav} portalName="Empleados de ruta" />;
}
