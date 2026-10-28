import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Home, History, Store } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app/AppShell";

export const Route = createFileRoute("/inquilino")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Portal del inquilino · Ahumados del Valle" },
      {
        name: "description",
        content: "Portal del inquilino: paga tu arriendo y consulta tu historial.",
      },
      { property: "og:title", content: "Portal del inquilino · Ahumados del Valle" },
      {
        property: "og:description",
        content: "Portal del inquilino: paga tu arriendo y consulta tu historial.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TenantLayout,
});

const nav: NavItem[] = [
  { to: "/inquilino", label: "Inicio", icon: Home, exact: true },
  { to: "/inquilino/pagar", label: "Pagar", icon: CreditCard },
  { to: "/inquilino/disponibles", label: "Disponibles", icon: Store },
  { to: "/inquilino/historial", label: "Historial", icon: History },
];

function TenantLayout() {
  return <AppShell role="inquilino" nav={nav} portalName="Portal del inquilino" />;
}
