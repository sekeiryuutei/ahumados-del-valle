import { pageHead } from '@/lib/page-head';
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, CreditCard, FileText } from "lucide-react";
import { q } from "@/hooks/use-data";
import { useSession } from "@/hooks/use-session";
import { formatCOP, formatDate, formatPeriod } from "@/lib/format";
import { errorMessage } from "@/services";
import { Button } from "@/components/ui/button";
import { ErrorBox, Loading, Panel } from "@/components/app/ui-bits";

export const Route = createFileRoute("/inquilino/")({ head: () => pageHead("Mi arriendo"), component: TenantHome });

function TenantHome() {
  const session = useSession();
  const acc = useQuery({ ...q.account(session?.user.tenantId ?? ""), enabled: !!session?.user.tenantId });
  if (acc.isLoading) return <Loading />;
  if (acc.error) return <ErrorBox message={errorMessage(acc.error)} onRetry={() => acc.refetch()} />;
  const a = acc.data;
  if (!a) return <Loading />;
  const next = a.pending[0];
  const firstName = a.tenant.name.split(" ")[0];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold md:text-3xl">Hola, {firstName}</h1>

      <Panel className={next ? "border-primary/30 bg-accent/50" : "border-success/30"}>
        {next ? (
          <>
            <p className="flex items-center gap-2 text-sm font-semibold">
              {next.overdue ? <><AlertTriangle className="size-4 text-destructive" /> <span className="text-destructive">Pago vencido</span></> : "Tu próximo pago"}
            </p>
            <p className="mt-2 font-display text-4xl font-bold tabular">{formatCOP(a.balance)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {a.pending.length === 1 ? formatPeriod(next.period) : `${a.pending.length} meses pendientes`} · vence {formatDate(next.dueDate)}
            </p>
            <Button asChild size="xl" className="mt-5 w-full sm:w-auto">
              <Link to="/inquilino/pagar"><CreditCard /> Pagar arriendo</Link>
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-10 text-success" />
            <div>
              <p className="text-lg font-bold">Estás al día</p>
              <p className="text-sm text-muted-foreground">No tienes pagos pendientes. ¡Gracias!</p>
            </div>
          </div>
        )}
      </Panel>

      {a.lease && a.property ? (
        <Panel>
          <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><FileText className="size-4" /> Mi contrato</p>
          <p className="mt-2 text-xl font-bold">{a.property.name}</p>
          <p className="text-sm text-muted-foreground">{a.property.location} · {a.property.areaM2} m²</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted-foreground">Canon mensual</dt><dd className="font-semibold tabular">{formatCOP(a.lease.monthlyRent)}</dd></div>
            <div><dt className="text-muted-foreground">Día de pago</dt><dd className="font-semibold">Cada día {a.lease.cutoffDay}</dd></div>
            <div><dt className="text-muted-foreground">Inicio</dt><dd className="font-semibold">{formatDate(a.lease.startDate)}</dd></div>
            <div><dt className="text-muted-foreground">Fin</dt><dd className="font-semibold">{formatDate(a.lease.endDate)}</dd></div>
          </dl>
        </Panel>
      ) : (
        <Panel><p className="text-muted-foreground">No tienes un contrato vigente. Comunícate con la administración.</p></Panel>
      )}
    </div>
  );
}
