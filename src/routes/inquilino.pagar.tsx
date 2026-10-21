import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Landmark, Loader2, Smartphone, CreditCard, XCircle, Building2 } from "lucide-react";
import type { OnlineChannel, RentPayment } from "@/domain/types";
import { onlineTotal } from "@/domain/rent";
import { q, useRefresh } from "@/hooks/use-data";
import { useSession } from "@/hooks/use-session";
import { formatCOP, formatDate, formatPeriod } from "@/lib/format";
import { errorMessage, services } from "@/services";
import { Button } from "@/components/ui/button";
import { Empty, ErrorBox, Loading, PageHeader, Panel } from "@/components/app/ui-bits";
import { DemoBadge } from "@/components/app/status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inquilino/pagar")({ component: PayPage });

const channels: { id: OnlineChannel; label: string; icon: typeof Landmark }[] = [
  { id: "pse", label: "PSE", icon: Landmark },
  { id: "nequi", label: "Nequi", icon: Smartphone },
  { id: "bancolombia", label: "Bancolombia", icon: Building2 },
  { id: "tarjeta", label: "Tarjeta", icon: CreditCard },
];

type Step = "elegir" | "confirmar" | "procesando" | "resultado";

function PayPage() {
  const session = useSession();
  const tenantId = session?.user.tenantId ?? "";
  const acc = useQuery({ ...q.account(tenantId), enabled: !!tenantId });
  const surcharge = useQuery(q.surcharge());
  const refresh = useRefresh();
  const [period, setPeriod] = useState<string | null>(null);
  const [channel, setChannel] = useState<OnlineChannel | null>(null);
  const [step, setStep] = useState<Step>("elegir");
  const [result, setResult] = useState<RentPayment | null>(null);

  if (acc.isLoading || surcharge.isLoading) return <Loading />;
  if (acc.error || surcharge.error) return <ErrorBox message={errorMessage(acc.error ?? surcharge.error)} />;
  const a = acc.data!;

  if (step === "resultado" && result) {
    const ok = result.status === "pagado";
    return (
      <Panel className="mx-auto max-w-md text-center">
        {ok ? <CheckCircle2 className="mx-auto size-16 text-success" /> : <XCircle className="mx-auto size-16 text-destructive" />}
        <h1 className="mt-4 text-2xl font-bold">{ok ? "¡Pago recibido!" : "El pago no se completó"}</h1>
        <p className="mt-2 text-muted-foreground">{ok ? `${formatPeriod(result.period)} quedó pagado.` : "No se hizo ningún cobro. Puedes intentarlo de nuevo."}</p>
        <p className="mt-4 font-display text-3xl font-bold tabular">{formatCOP(result.total)}</p>
        <p className="text-xs text-muted-foreground">Ref. {result.reference}</p>
        <div className="mt-3 flex justify-center"><DemoBadge /></div>
        <div className="mt-6 grid gap-2">
          <Button asChild size="xl"><Link to="/inquilino/historial">Ver mi historial</Link></Button>
          <Button variant="ghost" size="touch" onClick={() => { setStep("elegir"); setResult(null); setChannel(null); setPeriod(null); }}>Volver a pagos</Button>
        </div>
      </Panel>
    );
  }

  if (step === "procesando") {
    return (
      <Panel className="mx-auto max-w-md py-12 text-center">
        <Loader2 className="mx-auto size-12 animate-spin text-primary" />
        <p className="mt-4 text-lg font-bold">Procesando tu pago…</p>
        <p className="text-sm text-muted-foreground">No cierres esta pantalla.</p>
      </Panel>
    );
  }

  if (!a.pending.length) {
    return (
      <>
        <PageHeader title="Pagar arriendo" />
        <Empty title="Estás al día" text="No tienes meses pendientes por pagar." />
      </>
    );
  }

  const selected = a.pending.find((p) => p.period === period) ?? a.pending[0]!;
  const totals = onlineTotal(selected.amount, surcharge.data!.amount);

  const pay = async (simulated: "pagado" | "fallido") => {
    if (!channel) return;
    setStep("procesando");
    try {
      const started = await services.payments.startOnline({ tenantId, period: selected.period, channel });
      const final = await services.payments.resolveDemo(started.id, simulated);
      setResult(final);
      setStep("resultado");
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
      setStep("elegir");
    }
  };

  return (
    <>
      <PageHeader title="Pagar arriendo" subtitle="Paga en línea de forma segura con Wompi." />
      <div className="mx-auto max-w-xl space-y-5">
        <section>
          <h2 className="mb-2 font-semibold">1. ¿Qué mes vas a pagar?</h2>
          <div className="space-y-2">
            {a.pending.map((p) => (
              <button
                key={p.period}
                disabled={step === "confirmar"}
                onClick={() => setPeriod(p.period)}
                className={cn("flex min-h-14 w-full items-center justify-between rounded-xl border-2 bg-card px-4 py-3 text-left", selected.period === p.period ? "border-primary bg-accent" : "border-border")}
              >
                <span>
                  <span className="block font-semibold">{formatPeriod(p.period)}</span>
                  <span className={cn("text-sm", p.overdue ? "text-destructive" : "text-muted-foreground")}>{p.overdue ? "Vencido · " : ""}vence {formatDate(p.dueDate)}</span>
                </span>
                <span className="font-semibold tabular">{formatCOP(p.amount)}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-semibold">2. ¿Cómo quieres pagar?</h2>
          <div className="grid grid-cols-2 gap-2">
            {channels.map((c) => (
              <button
                key={c.id}
                disabled={step === "confirmar"}
                onClick={() => setChannel(c.id)}
                className={cn("flex h-16 items-center justify-center gap-2 rounded-xl border-2 bg-card font-semibold", channel === c.id ? "border-primary bg-accent" : "border-border")}
              >
                <c.icon className="size-5" /> {c.label}
              </button>
            ))}
          </div>
        </section>

        <Panel>
          <h2 className="font-semibold">Resumen</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Arriendo {formatPeriod(selected.period)}</dt><dd className="tabular">{formatCOP(totals.rent)}</dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>Recargo por pago en línea</dt><dd className="tabular">+ {formatCOP(totals.surcharge)}</dd></div>
            <div className="flex justify-between border-t pt-3 text-base font-bold"><dt>Total a pagar</dt><dd className="font-display text-2xl tabular">{formatCOP(totals.total)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">Si prefieres no pagar el recargo, puedes pagar en efectivo o transferencia directamente con la administración.</p>
        </Panel>

        {step === "elegir" ? (
          <Button size="xl" className="w-full" disabled={!channel} onClick={() => setStep("confirmar")}>
            {channel ? `Continuar · ${formatCOP(totals.total)}` : "Elige cómo pagar"}
          </Button>
        ) : (
          <Panel className="border-primary/40">
            <p className="font-semibold">¿Confirmas el pago de {formatCOP(totals.total)}?</p>
            <p className="text-sm text-muted-foreground">Incluye {formatCOP(totals.surcharge)} de recargo por pago en línea.</p>
            <div className="mt-2"><DemoBadge /></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button variant="outline" size="xl" onClick={() => setStep("elegir")}>Volver</Button>
              <Button variant="success" size="xl" onClick={() => pay("pagado")}>Sí, pagar</Button>
            </div>
            <button className="mt-3 w-full text-center text-xs text-muted-foreground underline" onClick={() => pay("fallido")}>
              Simular pago rechazado (demostración)
            </button>
          </Panel>
        )}
      </div>
    </>
  );
}
