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
      {
        property: "og:description",
        content: "Panel del administrador: locales, inquilinos y pagos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLayout,
});

const nav: NavItem[] = [
  { to: "/admin", label: "Inicio", icon: LayoutDashboard, exact: true },
  { to: "/admin/pos", label: "Vender", icon: Receipt },
  { to: "/admin/ventas", label: "Ventas", icon: Receipt },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/productos", label: "Productos", icon: Building },
  { to: "/admin/recepcion", label: "Recepción", icon: Building },
  { to: "/admin/inventario", label: "Inventario", icon: Building },
  { to: "/admin/planta", label: "Planta", icon: Building },
  { to: "/admin/recetas", label: "Recetas", icon: Settings },
  { to: "/admin/compras", label: "Compras", icon: Receipt },
  { to: "/admin/rutas", label: "Rutas", icon: Users },
  { to: "/admin/empleados", label: "Empleados", icon: Users },
  { to: "/admin/nomina", label: "Asistencia", icon: Users },
  { to: "/admin/gastos", label: "Gastos", icon: Receipt },
  { to: "/admin/caja", label: "Caja", icon: Receipt },
  { to: "/admin/configuracion", label: "Configuración", icon: Settings },
  { to: "/admin/auditoria", label: "Auditoría", icon: Receipt },
  { to: "/admin/importaciones", label: "Importaciones", icon: Building },
  { to: "/admin/inquilinos", label: "Inquilinos", icon: Users },
  { to: "/admin/locales", label: "Locales", icon: Building },
  { to: "/admin/pagos", label: "Pagos", icon: Receipt },
  { to: "/admin/recordatorios", label: "Recordatorios", icon: Receipt },
  { to: "/admin/ajustes", label: "Ajustes", icon: Settings },
];

function AdminLayout() {
  return <AppShell role="admin" nav={nav} portalName="Administración" />;
}
