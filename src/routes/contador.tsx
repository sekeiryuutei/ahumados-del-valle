import { createFileRoute } from "@tanstack/react-router";
import { Home, ClipboardList } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app/AppShell";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/contador")({
  ssr: false,
  head: () => pageHead("Contabilidad"),
  component: Layout,
});
const nav: NavItem[] = [
  { to: "/contador", label: "Resumen", icon: Home, exact: true },
  { to: "/contador/clientes", label: "Clientes", icon: ClipboardList, exact: false },
  { to: "/contador/nomina", label: "Asistencia", icon: ClipboardList, exact: false },
  { to: "/contador/gastos", label: "Gastos", icon: ClipboardList, exact: false },
  { to: "/contador/auditoria", label: "Auditoría", icon: ClipboardList, exact: false },
];
function Layout() {
  return <AppShell role="contador" nav={nav} portalName="Contabilidad" />;
}
