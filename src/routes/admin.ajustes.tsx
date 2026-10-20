import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { q, useRefresh } from "@/hooks/use-data";
import { formatCOP, formatDate } from "@/lib/format";
import { errorMessage, services } from "@/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBox, Loading, PageHeader, Panel } from "@/components/app/ui-bits";
import { Pill } from "@/components/app/status";

export const Route = createFileRoute("/admin/ajustes")({ component: SettingsPage });

function SettingsPage() {
  const current = useQuery(q.surcharge());
  const history = useQuery(q.surchargeHistory());
  const refresh = useRefresh();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const s = await services.settings.updateSurcharge({ amount: Number(amount), reason });
      toast.success("Recargo actualizado", { description: `Nuevo valor: ${formatCOP(s.amount)}` });
      setAmount("");
      setReason("");
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Ajustes" subtitle="Valores que puedes cambiar sin ayuda técnica." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="text-lg font-bold">Recargo por pago en línea (Wompi)</h2>
          <p className="mt-1 text-sm text-muted-foreground">Se suma al canon cuando el inquilino paga en línea. Se muestra en una línea aparte antes de confirmar.</p>
          {current.isLoading ? <Loading /> : current.error ? <ErrorBox message={errorMessage(current.error)} /> : (
            <p className="mt-4 font-display text-4xl font-bold text-primary tabular">{formatCOP(current.data!.amount)}</p>
          )}
          <div className="mt-6 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="am">Nuevo valor (COP)</Label>
              <Input id="am" inputMode="numeric" className="h-12 tabular" placeholder="Ej: 5000" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs">Motivo del cambio</Label>
              <Input id="rs" className="h-12" placeholder="Ej: ajuste de comisión" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <Button size="touch" className="w-full" disabled={!amount || saving} onClick={save}>Guardar nuevo recargo</Button>
          </div>
        </Panel>
        <Panel>
          <h2 className="text-lg font-bold">Historial de cambios</h2>
          <ul className="mt-4 divide-y">
            {history.data?.map((h, i) => (
              <li key={h.version} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold tabular">{formatCOP(h.amount)} {i === 0 && <Pill tone="success" className="ml-2">Vigente</Pill>}</p>
                  <p className="text-sm text-muted-foreground">{h.reason} · {h.updatedBy}</p>
                </div>
                <p className="text-sm text-muted-foreground">v{h.version} · {formatDate(h.effectiveFrom)}</p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="lg:col-span-2">
          <h2 className="text-lg font-bold">Pasarela Wompi</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Pill tone="warning">Pendiente de configurar</Pill>
            <p className="text-sm text-muted-foreground">Por ahora los pagos en línea son de demostración. La conexión real se hará en la siguiente fase.</p>
          </div>
        </Panel>
      </div>
    </>
  );
}
