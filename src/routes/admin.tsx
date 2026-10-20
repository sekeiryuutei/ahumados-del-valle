import { createFileRoute } from "@tanstack/react-router";
import { Building, LayoutDashboard, Receipt, Settings, Users } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app/AppShell";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Administración · Ahumados del Valle" },
      { name: "description", content: "Panel del administrador: locales, inquilinos y pagos." },
      { property: "og:title", content: "Administración · Ahumados del Valle" },
      { property: "og:description", content: "Panel del administrador: locales, inquilinos y pagos." },
    ],
  }),
  component: AdminLayout,
});

const nav: NavItem[] = [
  { to: "/admin", label: "Inicio", icon: LayoutDashboard, exact: true },
  { to: "/admin/inquilinos", label: "Inquilinos", icon: Users },
  { to: "/admin/locales", label: "Locales", icon: Building },
  { to: "/admin/pagos", label: "Pagos", icon: Receipt },
  { to: "/admin/ajustes", label: "Ajustes", icon: Settings },
];

function AdminLayout() {
  return <AppShell role="admin" nav={nav} portalName="Administración" />;
}
