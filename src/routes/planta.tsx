import { createFileRoute } from "@tanstack/react-router";
import { Home, ClipboardList } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app/AppShell";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/planta")({
  ssr: false,
  head: () => pageHead("Ahumado y planta"),
  component: Layout,
});
const nav: NavItem[] = [
  { to: "/planta", label: "Ahumado", icon: Home, exact: true },
  { to: "/planta/recetas", label: "Preparación", icon: ClipboardList, exact: false },
];
function Layout() {
  return <AppShell role="planta" nav={nav} portalName="Ahumado y planta" />;
}
