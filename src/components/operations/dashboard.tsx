import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Plus, AlertTriangle } from "lucide-react";
import { services } from "@/services";
import { q } from "@/hooks/use-data";
import { formatCOP, formatKg, todayBogota } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Stat, Empty } from "@/components/app/ui-bits";
import {
  useBusiness,
  useAction,
  SelectField,
  Field,
  NumberField,
  FormModal,
  Submit,
  Status,
  Table,
  cell,
  ExportButton,
} from "./common";

export function BusinessDashboard({ accounting = false }: { accounting?: boolean }) {
  const d = useBusiness();
  const summary = useSuspenseQuery(q.summary()).data;
  const [date, setDate] = useState(todayBogota());
  const [location, setLocation] = useState("");
  const sales = d.sales.filter(
    (s) =>
      s.status === "pagada" &&
      s.createdAt.startsWith(date) &&
      (!location || s.locationId === location),
  );
  const total = sales.reduce((sum, s) => sum + s.total, 0);
  const debt = d.customers.reduce((s, c) => s + c.balance, 0);
  const expenses = d.propertyExpenses.reduce((s, e) => s + e.amount, 0);
  const counts = new Map<string, number>();
  sales
    .flatMap((s) => s.items)
    .forEach((i) => counts.set(i.productId, (counts.get(i.productId) ?? 0) + i.total));
  return (
    <>
      <PageHeader
        title={accounting ? "Contabilidad del negocio" : "Control del negocio"}
        subtitle="Demostración · Datos locales"
      />
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Field label="Fecha">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <SelectField
          label="Ubicación"
          value={location}
          onChange={setLocation}
          options={d.locations}
        />
        <ExportButton
          name="ventas-resumen.csv"
          rows={sales.map((s) => ({
            Tirilla: s.number,
            Fecha: s.createdAt,
            Ubicacion: s.locationId,
            Total: s.total,
            Estado: s.status,
          }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ventas del día" value={formatCOP(total)} tone="success" />
        <Stat label="Cuentas por cobrar" value={formatCOP(debt)} tone="warning" />
        <Stat label="Arriendos recaudados / mes" value={formatCOP(summary.collectedThisMonth)} />
        <Stat label="Gastos de locales" value={formatCOP(expenses)} />
      </div>
      <h2 className="mb-3 mt-8 text-xl font-bold">Ingresos por origen</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {d.locations.map((l) => (
          <Stat
            key={l.id}
            label={l.name}
            value={formatCOP(
              sales.filter((s) => s.locationId === l.id).reduce((sum, s) => sum + s.total, 0),
            )}
          />
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-xl font-bold">Productos con más ventas</h2>
          <Table heads={["Producto", "Ventas COP"]}>
            {[...counts]
              .sort((a, b) => b[1] - a[1])
              .map(([id, total]) => (
                <tr key={id}>
                  <td className={cell}>{d.products.find((p) => p.id === id)?.name}</td>
                  <td className={cell}>{formatCOP(total)}</td>
                </tr>
              ))}
          </Table>
          {!counts.size && <Empty title="Sin ventas para esta fecha" />}
        </section>
        <section>
          <h2 className="mb-3 text-xl font-bold">Alertas y pendientes</h2>
          <div className="divide-y border-y">
            <p className="py-3">
              Rutas sin liquidar:{" "}
              <strong>{d.dispatches.filter((r) => r.status === "en_ruta").length}</strong>
            </p>
            <p className="py-3">
              Canastillas por devolver:{" "}
              <strong>{d.customers.reduce((s, c) => s + c.baskets, 0)}</strong>
            </p>
            <p className="py-3">
              Órdenes pendientes:{" "}
              <strong>{d.purchases.filter((o) => o.status !== "recibida").length}</strong>
            </p>
            <p className="py-3">
              Lotes vencidos / próximos:{" "}
              <strong>{d.lots.filter((l) => l.expiresAt <= todayBogota()).length}</strong>
            </p>
            <p className="py-3">
              Ventas anuladas:{" "}
              <strong>{d.sales.filter((s) => s.status === "anulada").length}</strong>
            </p>
            <p className="py-3">
              Configuración pendiente:{" "}
              <strong>{d.settings.filter((s) => s.status !== "configurado").length}</strong>
            </p>
          </div>
        </section>
      </div>
      <h2 className="mb-3 mt-8 text-xl font-bold">Clientes con deuda</h2>
      <Table heads={["Cliente", "Saldo", "Canastillas"]}>
        {d.customers
          .filter((c) => c.balance > 0)
          .map((c) => (
            <tr key={c.id}>
              <td className={cell}>{c.name}</td>
              <td className={cell}>{formatCOP(c.balance)}</td>
              <td className={cell}>{c.baskets}</td>
            </tr>
          ))}
      </Table>
      <p className="mt-6 text-sm text-muted-foreground">
        Resultado neto pendiente: faltan costos completos de compras y parámetros de nómina
        validados.
      </p>
    </>
  );
}
export function ExpensesPage() {
  const d = useBusiness();
  const properties = useSuspenseQuery(q.properties()).data;
  const { run, busy } = useAction();
  const [open, setOpen] = useState(false);
  const [property, setProperty] = useState("p1");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [support, setSupport] = useState("");
  return (
    <>
      <PageHeader
        title="Gastos por local"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus />
            Registrar gasto
          </Button>
        }
      />
      <Table heads={["Local", "Descripción", "Soporte ficticio", "Monto"]}>
        {d.propertyExpenses.map((e) => (
          <tr key={e.id}>
            <td className={cell}>{properties.find((p) => p.id === e.propertyId)?.name}</td>
            <td className={cell}>{e.note}</td>
            <td className={cell}>{e.support || "Sin soporte"}</td>
            <td className={cell}>{formatCOP(e.amount)}</td>
          </tr>
        ))}
      </Table>
      {!d.propertyExpenses.length && <Empty title="Sin gastos registrados" />}
      <FormModal title="Registrar gasto del local" open={open} onClose={() => setOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(async () => {
              await services.businessSettings.expense(property, amount, note, support);
              return true;
            });
            if (ok) setOpen(false);
          }}
        >
          <SelectField label="Local" value={property} onChange={setProperty} options={properties} />
          <NumberField label="Valor · COP" value={amount} onChange={setAmount} />
          <Field label="Descripción">
            <Input required value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Field label="Soporte · nombre del archivo (demostración)">
            <Input value={support} onChange={(e) => setSupport(e.target.value)} />
          </Field>
          <Submit busy={busy} />
        </form>
      </FormModal>
    </>
  );
}
