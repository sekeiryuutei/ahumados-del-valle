import { Link, Navigate, Outlet, useNavigate, type LinkProps } from "@tanstack/react-router";
import { LogOut, ShieldAlert, type LucideIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Role } from "@/domain/types";
import { useSession } from "@/hooks/use-session";
import { services } from "@/services";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loading } from "./ui-bits";

export interface NavItem {
  to: LinkProps["to"];
  label: string;
  icon: LucideIcon;
  exact?: boolean | undefined;
}

const homeFor: Record<Role, string> = {
  admin: "/admin",
  inquilino: "/inquilino",
  superadmin: "/",
  vendedor: "/",
  ruta: "/",
  planta: "/",
};

export function AppShell({ role, nav, portalName }: { role: Role; nav: NavItem[]; portalName: string }) {
  const session = useSession();
  const [mounted, setMounted] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  useEffect(() => setMounted(true), []);

  if (!mounted) return <Loading />;
  if (!session) return <Navigate to="/" replace />;
  if (session.user.role !== role) return <Restricted home={homeFor[session.user.role]} />;

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await services.auth.logout();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen md:flex">
      {/* Escritorio: barra lateral compacta */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground md:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <img src="/icon-192.png" alt="" width={40} height={40} className="size-10 rounded-xl" />
          <div>
            <p className="font-display text-base font-bold leading-tight text-sidebar-accent-foreground">Ahumados del Valle</p>
            <p className="text-xs opacity-70">{portalName}</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: !!item.exact }}
              className="flex h-12 items-center gap-3 rounded-xl px-3 font-medium transition-colors hover:bg-sidebar-accent data-[status=active]:bg-sidebar-primary data-[status=active]:text-sidebar-primary-foreground"
            >
              <item.icon className="size-5" /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="rounded-xl bg-sidebar-accent p-3">
          <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">{session.user.name}</p>
          <p className="text-xs opacity-70">@{session.user.username}</p>
          <button onClick={() => setConfirmOut(true)} className="mt-3 flex items-center gap-2 text-sm font-medium opacity-80 hover:opacity-100">
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Móvil: barra superior */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <img src="/icon-192.png" alt="" width={32} height={32} className="size-8 rounded-lg" />
          <div className="leading-tight">
            <p className="font-display text-sm font-bold">Ahumados del Valle</p>
            <p className="text-xs text-muted-foreground">{session.user.name}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label="Cerrar sesión" onClick={() => setConfirmOut(true)}>
          <LogOut className="size-5" />
        </Button>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-8">
        <Outlet />
      </main>

      {/* Móvil: navegación inferior con pocas opciones */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 grid border-t bg-card md:hidden" style={{ gridTemplateColumns: `repeat(${nav.length}, 1fr)` }}>
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: !!item.exact }}
            className="flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground data-[status=active]:text-primary"
          >
            <item.icon className="size-6" />
            {item.label}
          </Link>
        ))}
      </nav>

      <AlertDialog open={confirmOut} onOpenChange={setConfirmOut}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
            <AlertDialogDescription>Tendrás que ingresar tu usuario y clave de nuevo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Seguir aquí</AlertDialogCancel>
            <AlertDialogAction className="h-12" onClick={signOut}>Cerrar sesión</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Restricted({ home }: { home: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <ShieldAlert className="mx-auto size-12 text-warning" />
        <h1 className="mt-4 text-2xl font-bold">Acceso restringido</h1>
        <p className="mt-2 text-muted-foreground">Esta sección no está disponible para tu usuario.</p>
        <Button asChild size="xl" className="mt-6 w-full">
          <a href={home}>Volver a mi panel</a>
        </Button>
      </div>
    </div>
  );
}
