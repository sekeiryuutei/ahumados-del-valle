import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, Phone, Power, Receipt, UserPlus, FileX } from "lucide-react";
import { z } from "zod";
import type { TenantAccount } from "@/domain/types";
import { q, useRefresh } from "@/hooks/use-data";
import { formatCOP, formatDate, formatPeriod, todayBogota } from "@/lib/format";
import { errorMessage, services } from "@/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Empty, ErrorBox, Loading, PageHeader, Panel } from "@/components/app/ui-bits";
import { Pill } from "@/components/app/status";

export const Route = createFileRoute("/admin/inquilinos")({
  validateSearch: z.object({ nuevo: z.boolean().optional() }),
  component: TenantsPage,
});

function TenantsPage() {
  const { nuevo } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const tenants = useQuery(q.tenants());
  const [payFor, setPayFor] = useState<TenantAccount | null>(null);
  const [passFor, setPassFor] = useState<TenantAccount | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "toggle" | "end"; acc: TenantAccount } | null>(null);
  const refresh = useRefresh();
  const setNew = (open: boolean) => navigate({ search: open ? { nuevo: true } : {}, replace: true });

  const runConfirm = async () => {
    if (!confirm) return;
    try {
      if (confirm.kind === "toggle") {
        await services.tenants.setActive(confirm.acc.tenant.id, !confirm.acc.tenant.active);
        toast.success(confirm.acc.tenant.active ? "Acceso desactivado" : "Acceso activado");
      } else if (confirm.acc.lease) {
        await services.leases.end(confirm.acc.lease.id);
        toast.success("Contrato finalizado. El local quedó disponible.");
      }
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
    setConfirm(null);
  };

  return (
    <>
      <PageHeader
        title="Inquilinos"
        subtitle="Registra inquilinos y entrégales su usuario y clave."
        action={<Button size="touch" onClick={() => setNew(true)}><UserPlus /> Nuevo inquilino</Button>}
      />
      {tenants.isLoading ? <Loading /> : tenants.error ? <ErrorBox message={errorMessage(tenants.error)} onRetry={() => tenants.refetch()} /> : tenants.data!.length === 0 ? (
        <Empty title="Aún no hay inquilinos" action={<Button onClick={() => setNew(true)}>Registrar el primero</Button>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {tenants.data!.map((a) => (
            <Panel key={a.tenant.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{a.tenant.name}</p>
                  <p className="text-sm text-muted-foreground">{a.tenant.document} · usuario <b>@{a.tenant.username}</b></p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><Phone className="size-3.5" />{a.tenant.phone}</p>
                </div>
                {a.tenant.active ? <Pill tone="success">Activo</Pill> : <Pill tone="neutral">Sin acceso</Pill>}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted p-3 text-sm">
                <div><p className="text-muted-foreground">Local</p><p className="font-semibold">{a.property?.name ?? "Sin contrato"}</p></div>
                <div><p className="text-muted-foreground">Canon</p><p className="font-semibold tabular">{a.lease ? formatCOP(a.lease.monthlyRent) : "—"}</p></div>
                <div><p className="text-muted-foreground">Corte</p><p className="font-semibold">{a.lease ? `Día ${a.lease.cutoffDay}` : "—"}</p></div>
                <div><p className="text-muted-foreground">Saldo</p><p className={a.balance ? "font-semibold text-destructive tabular" : "font-semibold text-success"}>{a.balance ? formatCOP(a.balance) : "Al día"}</p></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="touch" disabled={!a.pending.length} onClick={() => setPayFor(a)}><Receipt /> Registrar pago</Button>
                <Button size="touch" variant="outline" onClick={() => setPassFor(a)}><KeyRound /> Clave</Button>
                <Button size="touch" variant="ghost" onClick={() => setConfirm({ kind: "toggle", acc: a })}><Power /> {a.tenant.active ? "Quitar acceso" : "Dar acceso"}</Button>
                {a.lease && <Button size="touch" variant="ghost" className="text-destructive" onClick={() => setConfirm({ kind: "end", acc: a })}><FileX /> Finalizar contrato</Button>}
              </div>
            </Panel>
          ))}
        </div>
      )}

      <NewTenantDialog open={!!nuevo} onOpenChange={setNew} />
      <ManualPaymentDialog acc={payFor} onClose={() => setPayFor(null)} />
      <PasswordDialog acc={passFor} onClose={() => setPassFor(null)} />

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "end" ? "¿Finalizar contrato?" : confirm?.acc.tenant.active ? "¿Quitar acceso?" : "¿Dar acceso?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "end"
                ? `El contrato de ${confirm.acc.tenant.name} terminará y ${confirm.acc.property?.name} quedará disponible. El historial se conserva.`
                : confirm?.acc.tenant.active
                  ? `${confirm?.acc.tenant.name} no podrá ingresar a su portal.`
                  : `${confirm?.acc.tenant.name} podrá ingresar de nuevo con su usuario y clave.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="h-12" onClick={runConfirm}>Sí, confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const tenantSchema = z.object({
  name: z.string().trim().min(3, "Escribe el nombre completo o razón social"),
  document: z.string().trim().min(5, "Escribe la cédula o NIT"),
  phone: z.string().trim().min(7, "Escribe un celular válido"),
  email: z.string().trim().email("Correo no válido").or(z.literal("")),
  username: z.string().trim().min(3, "Mínimo 3 letras").regex(/^[a-zA-Z0-9._-]+$/, "Solo letras, números, punto o guion"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  propertyId: z.string().min(1, "Elige un local"),
  monthlyRent: z.number().int().positive("Escribe el valor del canon"),
  cutoffDay: z.number().int().min(1, "Entre 1 y 28").max(28, "Entre 1 y 28"),
  startDate: z.string().min(10, "Elige la fecha"),
  endDate: z.string().min(10, "Elige la fecha"),
}).refine((v) => v.endDate > v.startDate, { path: ["endDate"], message: "Debe ser después del inicio" });

type Errors = Partial<Record<string, string>>;

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function NewTenantDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const props = useQuery({ ...q.properties("disponible"), enabled: open });
  const refresh = useRefresh();
  const today = todayBogota();
  const empty = { name: "", document: "", phone: "", email: "", username: "", password: "", propertyId: "", monthlyRent: "", cutoffDay: "5", startDate: today, endDate: `${Number(today.slice(0, 4)) + 1}${today.slice(4)}` };
  const [f, setF] = useState(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = tenantSchema.safeParse({ ...f, monthlyRent: Number(f.monthlyRent.replace(/\D/g, "")), cutoffDay: Number(f.cutoffDay) });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await services.tenants.create(parsed.data);
      toast.success(`${parsed.data.name} registrado`, { description: `Usuario: ${parsed.data.username.toLowerCase()} · entrégale su clave.` });
      setF(empty);
      refresh();
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo inquilino</DialogTitle>
          <DialogDescription>Crea sus datos, su acceso y su contrato en un solo paso.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-6" noValidate>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Datos</legend>
            <Field id="n" label="Nombre o razón social" error={errors.name}><Input id="n" className="h-11" value={f.name} onChange={set("name")} /></Field>
            <Field id="d" label="Cédula o NIT" error={errors.document} hint="Ej: CC 1.112.345.678"><Input id="d" className="h-11" value={f.document} onChange={set("document")} /></Field>
            <Field id="ph" label="Celular" error={errors.phone} hint="Ej: 315 555 0101"><Input id="ph" inputMode="tel" className="h-11" value={f.phone} onChange={set("phone")} /></Field>
            <Field id="em" label="Correo (opcional)" error={errors.email}><Input id="em" type="email" className="h-11" value={f.email} onChange={set("email")} /></Field>
          </fieldset>
          <fieldset className="grid gap-4 rounded-xl bg-accent/60 p-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-bold uppercase tracking-wide text-accent-foreground">Acceso al portal</legend>
            <Field id="u" label="Usuario" error={errors.username} hint="Con este nombre ingresará"><Input id="u" autoCapitalize="none" className="h-11" value={f.username} onChange={set("username")} /></Field>
            <Field id="pw" label="Clave" error={errors.password} hint="Mínimo 6 caracteres"><Input id="pw" className="h-11" value={f.password} onChange={set("password")} /></Field>
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Contrato</legend>
            <Field id="pr" label="Local" error={errors.propertyId}>
              <Select
                value={f.propertyId}
                onValueChange={(v) => {
                  const p = props.data?.find((x) => x.id === v);
                  setF((s) => ({ ...s, propertyId: v, monthlyRent: p ? String(p.monthlyRent) : s.monthlyRent }));
                }}
              >
                <SelectTrigger id="pr" className="h-11"><SelectValue placeholder={props.isLoading ? "Cargando…" : "Elige un local disponible"} /></SelectTrigger>
                <SelectContent>
                  {props.data?.length === 0 && <div className="p-3 text-sm text-muted-foreground">No hay locales disponibles</div>}
                  {props.data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} · {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field id="mr" label="Canon mensual (COP)" error={errors.monthlyRent} hint={f.monthlyRent ? formatCOP(Number(f.monthlyRent.replace(/\D/g, ""))) : "Sin decimales"}>
              <Input id="mr" inputMode="numeric" className="h-11 tabular" value={f.monthlyRent} onChange={(e) => setF((s) => ({ ...s, monthlyRent: e.target.value.replace(/\D/g, "") }))} />
            </Field>
            <Field id="cd" label="Día de pago" error={errors.cutoffDay} hint="Entre 1 y 28"><Input id="cd" type="number" min={1} max={28} className="h-11" value={f.cutoffDay} onChange={set("cutoffDay")} /></Field>
            <div />
            <Field id="sd" label="Inicio" error={errors.startDate}><Input id="sd" type="date" className="h-11" value={f.startDate} onChange={set("startDate")} /></Field>
            <Field id="ed" label="Fin" error={errors.endDate}><Input id="ed" type="date" className="h-11" value={f.endDate} onChange={set("endDate")} /></Field>
          </fieldset>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="touch" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" size="touch" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Guardar inquilino</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ManualPaymentDialog({ acc, onClose }: { acc: TenantAccount | null; onClose: () => void }) {
  const [period, setPeriod] = useState("");
  const [method, setMethod] = useState<"efectivo" | "transferencia">("efectivo");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const refresh = useRefresh();
  const selected = period || acc?.pending[0]?.period || "";

  const save = async () => {
    if (!acc) return;
    setSaving(true);
    try {
      const p = await services.payments.registerManual({ tenantId: acc.tenant.id, period: selected, method, note: note || undefined });
      toast.success("Pago registrado", { description: `${formatPeriod(p.period)} · ${formatCOP(p.total)}` });
      refresh();
      setPeriod("");
      setNote("");
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!acc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>{acc?.tenant.name} · {acc?.property?.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field id="per" label="Mes que paga">
            <Select value={selected} onValueChange={setPeriod}>
              <SelectTrigger id="per" className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {acc?.pending.map((p) => <SelectItem key={p.period} value={p.period}>{formatPeriod(p.period)} · vence {formatDate(p.dueDate)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            {(["efectivo", "transferencia"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMethod(m)} className={`h-12 rounded-xl border-2 font-semibold capitalize ${method === m ? "border-primary bg-accent" : "border-border"}`}>{m}</button>
            ))}
          </div>
          <Field id="nt" label="Nota (opcional)"><Input id="nt" className="h-11" placeholder="Ej: recibido por Juan" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <div className="flex items-center justify-between rounded-xl bg-muted p-4">
            <span className="font-medium">Total</span>
            <span className="font-display text-2xl font-bold tabular">{acc?.lease ? formatCOP(acc.lease.monthlyRent) : "—"}</span>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="touch" onClick={onClose}>Cancelar</Button>
          <Button variant="success" size="touch" disabled={saving || !selected} onClick={save}>{saving && <Loader2 className="animate-spin" />} Confirmar pago</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({ acc, onClose }: { acc: TenantAccount | null; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const save = async () => {
    if (!acc) return;
    if (pw.length < 6) return setErr("Mínimo 6 caracteres");
    try {
      await services.tenants.resetPassword(acc.tenant.id, pw);
      toast.success("Clave actualizada", { description: `Entrégale la nueva clave a ${acc.tenant.name}.` });
      setPw("");
      setErr("");
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  return (
    <Dialog open={!!acc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva clave</DialogTitle>
          <DialogDescription>Para @{acc?.tenant.username}</DialogDescription>
        </DialogHeader>
        <Field id="np" label="Clave nueva" error={err}><Input id="np" className="h-12" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="touch" onClick={onClose}>Cancelar</Button>
          <Button size="touch" onClick={save}>Guardar clave</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
