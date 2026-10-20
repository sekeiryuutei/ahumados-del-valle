import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Building2, Eye, EyeOff, KeyRound, Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage, services, type Portal } from "@/services";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import heroImg from "@/assets/smokehouse.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ingresar · Ahumados del Valle" },
      { name: "description", content: "Portal de administración e inquilinos de Ahumados del Valle." },
      { property: "og:title", content: "Ingresar · Ahumados del Valle" },
      { property: "og:description", content: "Portal de administración e inquilinos de Ahumados del Valle." },
    ],
  }),
  component: LoginPage,
});

const portals: { id: Portal; label: string; hint: string; icon: typeof Store }[] = [
  { id: "inquilino", label: "Soy inquilino", hint: "Paga tu arriendo y consulta tu historial", icon: Store },
  { id: "admin", label: "Administración", hint: "Control del negocio", icon: Building2 },
];

function LoginPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [portal, setPortal] = useState<Portal>("inquilino");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: session.user.role === "admin" ? "/admin" : "/inquilino", replace: true });
  }, [session, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError("Escribe tu usuario y tu clave.");
      return;
    }
    setLoading(true);
    try {
      await services.auth.login(portal, username, password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    if (portal === "admin") {
      setUsername("admin");
      setPassword("admin123");
    } else {
      setUsername("maria");
      setPassword("maria123");
    }
    setError(null);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-charcoal lg:block">
        <img src={heroImg} alt="Ahumadero con carnes colgadas" className="absolute inset-0 size-full object-cover opacity-70" width={1024} height={1344} />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/30 to-transparent" />
        <div className="absolute bottom-0 p-12 text-charcoal-foreground">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Desde el Valle</p>
          <h2 className="mt-3 max-w-md text-4xl font-bold leading-tight">Tu negocio, claro y en orden.</h2>
          <p className="mt-3 max-w-sm opacity-80">Arriendos, pagos e inquilinos en un solo lugar, desde el celular o el computador.</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <img src="/icon-192.png" alt="" width={48} height={48} className="size-12 rounded-xl" />
            <div>
              <h1 className="text-2xl font-bold">Ahumados del Valle</h1>
              <p className="text-sm text-muted-foreground">Elige tu portal e ingresa</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3" role="tablist">
            {portals.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={portal === p.id}
                onClick={() => {
                  setPortal(p.id);
                  setError(null);
                }}
                className={cn(
                  "rounded-2xl border-2 bg-card p-4 text-left transition-colors",
                  portal === p.id ? "border-primary bg-accent" : "border-border hover:border-primary/40",
                )}
              >
                <p.icon className={cn("size-6", portal === p.id ? "text-primary" : "text-muted-foreground")} />
                <p className="mt-2 font-semibold">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.hint}</p>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="user">Usuario</Label>
              <Input id="user" autoComplete="username" autoCapitalize="none" className="h-12 text-base" placeholder={portal === "admin" ? "Ej: admin" : "El que te dio la administración"} value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pass">Clave</Label>
              <div className="relative">
                <Input id="pass" type={show ? "text" : "password"} autoComplete="current-password" className="h-12 pr-12 text-base" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" aria-label={show ? "Ocultar clave" : "Mostrar clave"} onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground">
                  {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>
            {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" size="xl" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <KeyRound />}
              {portal === "admin" ? "Entrar a administración" : "Entrar a mi portal"}
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-dashed p-3 text-center text-sm text-muted-foreground">
            Versión de demostración.{" "}
            <button onClick={fillDemo} className="font-semibold text-primary underline">Usar usuario de prueba</button>
          </div>
        </div>
      </div>
    </div>
  );
}
