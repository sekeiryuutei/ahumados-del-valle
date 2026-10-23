import { pageHead } from '@/lib/page-head';
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import type { Property, PropertyStatus } from "@/domain/types";
import { q, useRefresh } from "@/hooks/use-data";
import { formatCOP } from "@/lib/format";
import { errorMessage, services } from "@/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, ErrorBox, Loading, PageHeader, Panel } from "@/components/app/ui-bits";
import { PropertyBadge } from "@/components/app/status";

export const Route = createFileRoute("/admin/locales")({ head: () => pageHead("Locales y bodegas"), component: PropertiesPage });

function PropertiesPage() {
  const list = useQuery(q.properties());
  const [editing, setEditing] = useState<Property | "new" | null>(null);

  return (
    <>
      <PageHeader title="Locales y bodegas" subtitle="Los disponibles los ven tus inquilinos." action={<Button size="touch" onClick={() => setEditing("new")}><Plus /> Nuevo local</Button>} />
      {list.isLoading ? <Loading /> : list.error ? <ErrorBox message={errorMessage(list.error)} onRetry={() => list.refetch()} /> : (list.data ?? []).length === 0 ? (
        <Empty title="Sin locales" action={<Button onClick={() => setEditing("new")}>Crear local</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(list.data ?? []).map((p) => (
            <Panel key={p.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-primary">{p.code}</p>
                  <p className="text-lg font-bold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{p.location} · {p.areaM2} m²</p>
                </div>
                <PropertyBadge status={p.status} />
              </div>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{p.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <p className="font-display text-xl font-bold tabular">{formatCOP(p.monthlyRent)}<span className="text-sm font-normal text-muted-foreground"> /mes</span></p>
                <Button variant="outline" size="touch" onClick={() => setEditing(p)}><Pencil /> Editar</Button>
              </div>
            </Panel>
          ))}
        </div>
      )}
      <PropertyDialog value={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function PropertyDialog({ value, onClose }: { value: Property | "new" | null; onClose: () => void }) {
  const isNew = value === "new";
  const base = value && value !== "new" ? value : null;
  const key = base?.id ?? (isNew ? "new" : "none");
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>{value && <PropertyForm key={key} base={base} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}

function PropertyForm({ base, onClose }: { base: Property | null; onClose: () => void }) {
  const refresh = useRefresh();
  const [f, setF] = useState({
    code: base?.code ?? "",
    name: base?.name ?? "",
    location: base?.location ?? "Galería",
    areaM2: String(base?.areaM2 ?? ""),
    monthlyRent: String(base?.monthlyRent ?? ""),
    status: (base?.status ?? "disponible") as PropertyStatus,
    description: base?.description ?? "",
  });
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async () => {
    const rent = Number(f.monthlyRent);
    if (!f.code.trim() || !f.name.trim() || !rent) return setErr("Completa código, nombre y canon.");
    const input = { ...f, code: f.code.trim().toUpperCase(), areaM2: Number(f.areaM2) || 0, monthlyRent: rent };
    try {
      if (base) await services.properties.update(base.id, input);
      else await services.properties.create(input);
      toast.success(base ? "Local actualizado" : "Local creado");
      refresh();
      onClose();
    } catch (e) {
      setErr(errorMessage(e));
    }
  };

  return (
    <>
      <DialogHeader><DialogTitle>{base ? `Editar ${base.code}` : "Nuevo local"}</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="c">Código</Label><Input id="c" className="h-11" placeholder="Ej: L-05" value={f.code} onChange={set("code")} /></div>
        <div className="space-y-1.5"><Label htmlFor="nm">Nombre</Label><Input id="nm" className="h-11" value={f.name} onChange={set("name")} /></div>
        <div className="space-y-1.5"><Label htmlFor="lo">Ubicación</Label><Input id="lo" className="h-11" value={f.location} onChange={set("location")} /></div>
        <div className="space-y-1.5"><Label htmlFor="ar">Área (m²)</Label><Input id="ar" inputMode="numeric" className="h-11" value={f.areaM2} onChange={(e) => setF((s) => ({ ...s, areaM2: e.target.value.replace(/\D/g, "") }))} /></div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="rn">Canon mensual (COP)</Label>
          <Input id="rn" inputMode="numeric" className="h-11 tabular" value={f.monthlyRent} onChange={(e) => setF((s) => ({ ...s, monthlyRent: e.target.value.replace(/\D/g, "") }))} />
          {f.monthlyRent && <p className="text-xs text-muted-foreground">{formatCOP(Number(f.monthlyRent))}</p>}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Estado</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["disponible", "ocupado", "mantenimiento"] as const).map((s) => (
              <button key={s} type="button" disabled={s === "ocupado" && base?.status !== "ocupado"} onClick={() => setF((x) => ({ ...x, status: s }))} className={`h-11 rounded-xl border-2 text-sm font-semibold capitalize disabled:opacity-40 ${f.status === s ? "border-primary bg-accent" : "border-border"}`}>{s}</button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Un local queda “ocupado” al registrar un inquilino.</p>
        </div>
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ds">Descripción</Label><Textarea id="ds" value={f.description} onChange={set("description")} /></div>
      </div>
      {err && <p className="text-sm font-medium text-destructive">{err}</p>}
      <DialogFooter className="gap-2">
        <Button variant="outline" size="touch" onClick={onClose}>Cancelar</Button>
        <Button size="touch" onClick={save}>Guardar</Button>
      </DialogFooter>
    </>
  );
}
