import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, UserPlus } from "lucide-react";
import { q } from "@/hooks/use-data";
import { formatCOP, formatPeriod, currentPeriod } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Empty, ErrorBox, Loading, PageHeader, Panel, Stat } from "@/components/app/ui-bits";
import { DemoBadge, Pill } from "@/components/app/status";
import { errorMessage } from "@/services";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

function AdminHome() {
  const summary = useQuery(q.summary());
  const tenants = useQuery(q.tenants());

  if (summary.isLoading || tenants.isLoading) return <Loading />;
  if (summary.error || tenants.error)
    return <ErrorBox message={errorMessage(summary.error ?? tenants.error)} onRetry={() => { summary.refetch(); tenants.refetch(); }} />;

  const s = summary.data!;
  const debtors = tenants.data!.filter((a) => a.pending.length > 0).sort((a, b) => b.balance - a.balance);

  return (
    <>
      <PageHeader
        title="Resumen de arriendos"
        subtitle={formatPeriod(currentPeriod())}
        action={
          <Button asChild size="touch">
            <Link to="/admin/inquilinos" search={{ nuevo: true }}><UserPlus /> Registrar inquilino</Link>
          </Button>
        }
      />
      <div className="mb-3"><DemoBadge /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Recaudado este mes" value={formatCOP(s.collectedThisMonth)} hint={`de ${formatCOP(s.expectedThisMonth)} esperados`} tone="success" />
        <Stat label="Saldo por cobrar" value={formatCOP(s.totalDebt)} hint={`${s.pendingTenants} inquilino(s) con pendientes`} tone="warning" />
        <Stat label="Locales ocupados" value={`${s.occupied} / ${s.totalProperties}`} />
        <Stat label="Disponibles" value={String(s.available)} hint={s.maintenance ? `${s.maintenance} en mantenimiento` : undefined} tone="primary" />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Pendientes de pago</h2>
      {debtors.length === 0 ? (
        <Empty title="Todos al día" text="Ningún inquilino tiene meses pendientes." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {debtors.map((a) => (
            <Panel key={a.tenant.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{a.tenant.name}</p>
                <p className="text-sm text-muted-foreground">{a.property?.name} · {a.pending.length} mes(es)</p>
                {a.pending.some((p) => p.overdue) && <Pill tone="danger" icon={AlertTriangle} className="mt-2">Vencido</Pill>}
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold tabular">{formatCOP(a.balance)}</p>
                <Link to="/admin/inquilinos" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">Gestionar <ArrowRight className="size-4" /></Link>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
