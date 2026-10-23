import { createFileRoute } from "@tanstack/react-router";
import { Home, ClipboardList } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app/AppShell";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/superadmin")({
  ssr: false,
  head: () => pageHead("Administración técnica"),
  component: Layout,
});
const nav: NavItem[] = [
  { to: "/superadmin", label: "Integraciones", icon: Home, exact: true },
  { to: "/superadmin/auditoria", label: "Auditoría", icon: ClipboardList, exact: false },
];
function Layout() {
  return <AppShell role="superadmin" nav={nav} portalName="Administración técnica" />;
}
