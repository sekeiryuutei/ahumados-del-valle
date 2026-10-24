import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Truck, RefreshCw, Plus, Send, Check } from "lucide-react";
import { services } from "@/services";
import { useSession } from "@/hooks/use-session";
import { netWeight, reconcileRoute } from "@/domain/operation-rules";
import type { DispatchLine } from "@/domain/operations";
import { formatCOP, formatKg, todayBogota } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Empty, Stat } from "@/components/app/ui-bits";
import {
  useBusiness,
  useAction,
  Field,
  SelectField,
  NumberField,
  Submit,
  FormModal,
  Status,
  Table,
  cell,
} from "./common";

export function RoutesPage() {
  const d = useBusiness();
  const session = useSession();
  const { run, busy } = useAction();
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [product, setProduct] = useState("prod-19");
  const [quantity, setQuantity] = useState(10000);
  const [gross, setGross] = useState(14000);
  const [boxes, setBoxes] = useState(2);
  const [date, setDate] = useState(todayBogota());
  const [employee, setEmployee] = useState("Empleado de ruta");
  const [signed, setSigned] = useState(false);
  const [lines, setLines] = useState<DispatchLine[]>([]);
  const [settle, setSettle] = useState("");
  const [returns, setReturns] = useState<Record<string, number>>({});
  const [cash, setCash] = useState(0);
  const [reason, setReason] = useState("");
  const queue = useQuery({ queryKey: ["route-queue"], queryFn: () => services.routes.queue() });
  const active = d.dispatches.find((x) => x.id === settle);
  const selectedProduct = d.products.find(p => p.id === product);
  const tare = Number(d.settings.find(s => s.id === "tare")?.value || 0);
  const net = selectedProduct?.control === "unidad" ? quantity : netWeight(gross, tare, boxes);
  const preview = active ? reconcileRoute(active, d.sales, d.products, Object.entries(returns).map(([productId, quantity]) => ({ productId, quantity }))) : null;
  const quantityLabel = (id: string, value: number) => d.products.find(p => p.id === id)?.control === "unidad" ? `${value} und` : formatKg(value);
  return (
    <>
      <PageHeader
        title="Empleados de ruta"
        subtitle="Conductor y vendedor · mismo cargo"
        action={
          session?.user.role === "admin" ? (
            <Button onClick={() => setDispatchOpen(true)}>
              <Truck />
              Preparar despacho
            </Button>
          ) : undefined
        }
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-y py-4">
        <div>
          <strong>Cola local de ventas</strong>
          <p className="text-sm text-muted-foreground">
            {queue.data?.filter((q) => q.status !== "sincronizada").length ?? 0} por sincronizar ·{" "}
            {queue.data?.filter((q) => q.status === "sincronizada").length ?? 0} confirmadas en
            simulación
          </p>
        </div>
        <Button
          size="xl"
          disabled={busy}
          onClick={async () => {
            await run(() => services.routes.synchronize(), "Sincronización simulada completada");
            await queue.refetch();
          }}
        >
          <RefreshCw />
          Sincronizar · demo
        </Button>
      </div>
      {queue.data
        ?.filter((q) => q.status !== "sincronizada")
        .map((q) => (
          <p className="mb-2 text-sm" key={q.id}>
            {q.id} · <Status warning>{q.status}</Status>
          </p>
        ))}
      <div className="grid gap-4 md:grid-cols-2">
        {d.dispatches.map((dispatch) => (
          <article key={dispatch.id} className="rounded-lg border bg-card p-5">
            <div className="flex justify-between gap-3">
              <h2 className="text-xl font-bold">{dispatch.name}</h2>
              <Status warning={dispatch.status === "en_ruta"}>
                {dispatch.status === "en_ruta" ? "En ruta" : "Cerrada"}
              </Status>
            </div>
            <p className="my-3 text-sm text-muted-foreground">
              {dispatch.date} · {dispatch.employee}
              <br />
              {dispatch.vehicle} · {dispatch.signed ? "Carga aceptada" : "Aceptación pendiente"}
            </p>
            {dispatch.lines.map((l) => {
              const p = d.products.find((p) => p.id === l.productId);
              return (
                <p className="flex justify-between gap-2 border-b py-2 text-sm" key={l.productId}>
                  <span>{p?.name}</span>
                  <strong>
                    {p?.control === "unidad" ? `${l.loaded} und` : formatKg(l.loaded)}
                  </strong>
                </p>
              );
            })}
            {dispatch.status === "en_ruta" && (
              <Button
                className="mt-4 w-full"
                size="xl"
                onClick={() => {
                  setSettle(dispatch.id);
                  setReturns(
                    Object.fromEntries(
                      dispatch.lines.map((l) => [
                        l.productId,
                        d.balances.find(
                          (b) => b.productId === l.productId && b.locationId === "ruta-1",
                        )?.quantity ?? 0,
                      ]),
                    ),
                  );
                  setCash(reconcileRoute(dispatch, d.sales, d.products, []).expected);
                }}
              >
                <Check />
                Devolución y liquidación
              </Button>
            )}
          </article>
        ))}
      </div>
      <h2 className="mb-3 mt-8 text-xl font-bold">Liquidaciones</h2>
      {!d.settlements.length && <Empty title="Sin liquidaciones registradas" />}
      {d.settlements.map((s) => (
        <section className="mb-6 border-y py-5" key={s.id}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Efectivo esperado" value={formatCOP(s.expected)} />
            <Stat label="Efectivo entregado" value={formatCOP(s.delivered)} />
            <Stat
              label="Diferencia de dinero"
              value={formatCOP(s.difference)}
              tone={s.difference < 0 ? "warning" : "success"}
            />
            {session?.user.role === "admin" && <Stat label="Participación del empleado" value={formatCOP(s.employeeSurplus)} />}
          </div>
          <h3 className="my-4 font-bold">1. Inventario físico</h3>
          <Table
            heads={["Producto", "Carga", "Vendido", "Devuelto físico", "Diferencia", "Estado"]}
          >
            {s.inventory.map((i) => (
              <tr key={i.productId}>
                <td className={cell}>{d.products.find((p) => p.id === i.productId)?.name}</td>
                <td className={cell}>{quantityLabel(i.productId, i.loaded)}</td>
                <td className={cell}>{quantityLabel(i.productId, i.sold)}</td>
                <td className={cell}>{quantityLabel(i.productId, i.returned)}</td>
                <td className={cell}>{quantityLabel(i.productId, i.difference)}</td>
                <td className={cell}>
                  <Status warning={i.state === "Requiere revisión"}>{i.state}</Status>
                </td>
              </tr>
            ))}
          </Table>
          <h3 className="mt-4 font-bold">2. Dinero entregado: {formatCOP(s.difference)} de diferencia</h3>
          <h3 className="mt-4 font-bold">3. Descongelamiento y revisión</h3>
          {s.inventory.filter(i => i.difference !== 0).map(i => <p key={i.productId} className="py-2 text-sm">{d.products.find(p => p.id === i.productId)?.name}: {quantityLabel(i.productId, i.difference)} · {i.state}</p>)}
          <p className="mt-2 text-xs text-muted-foreground">
            Diferencias físicas en gramos/unidades · Las pérdidas normales no generan cobro
            automático.
          </p>
        </section>
      ))}
      <FormModal
        title="Preparar despacho"
        open={dispatchOpen}
        onClose={() => setDispatchOpen(false)}
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(async () => {
              await services.routes.dispatch({
                name: d.settings.find((s) => s.id === "location-ruta-1")?.value || "Ruta Valle",
                employee,
                vehicle: d.settings.find((s) => s.id === "truck")?.value || "Pendiente",
                date,
                lines,
                signed,
              });
              return true;
            });
            if (ok) setDispatchOpen(false);
          }}
        >
          <Field label="Fecha">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <SelectField
            label="Empleado de ruta asignado"
            value={employee}
            onChange={setEmployee}
            options={d.employees
              .filter((e) => e.role === "ruta" && e.active)
              .map((e) => ({ id: e.name, name: e.name }))}
          />
          <SelectField
            label="Producto"
            value={product}
            onChange={setProduct}
            options={d.products}
          />
          {selectedProduct?.control === "unidad" ? <NumberField label="Unidades de carga" value={quantity} onChange={setQuantity} /> : <><NumberField label="Peso bruto de carga · g" value={gross} onChange={setGross} /><NumberField label="Cajas de carga" value={boxes} onChange={setBoxes} /><p className="border-y py-3">Tara: {formatKg(tare)} por caja · <strong>Neto: {formatKg(net)}</strong></p></>}
          <Button
            type="button"
            variant="outline"
            disabled={net <= 0 || lines.some(l => l.productId === product)}
            onClick={() => setLines([...lines, { productId: product, loaded: net, returned: 0, ...(selectedProduct?.control === "unidad" ? {} : { grossGrams: gross, tareGrams: tare, boxes }) }])}
          >
            <Plus />
            Agregar carga
          </Button>
          {lines.map((l, i) => (
            <div className="flex justify-between text-sm" key={i}>
              {d.products.find((p) => p.id === l.productId)?.name} · {quantityLabel(l.productId, l.loaded)}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLines(lines.filter((_, j) => j !== i))}
              >
                Quitar
              </Button>
            </div>
          ))}
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} />
            Empleado verifica y acepta carga · firma visual
          </label>
          <Submit busy={busy}>Confirmar despacho</Submit>
        </form>
      </FormModal>
      <FormModal
        title="Devolución física y liquidación"
        open={!!settle}
        onClose={() => setSettle("")}
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(async () => {
              await services.routes.settle(
                settle,
                Object.entries(returns).map(([productId, quantity]) => ({ productId, quantity })),
                cash,
                reason,
              );
              return true;
            });
            if (ok) setSettle("");
          }}
        >
          <h3 className="font-bold">1. Inventario: carga − ventas − devolución</h3>
          {preview?.inventory.map(i => <div key={i.productId} className="border-b py-2 text-sm"><strong>{d.products.find(p => p.id === i.productId)?.name}</strong><p>{quantityLabel(i.productId, i.loaded)} − {quantityLabel(i.productId, i.sold)} − {quantityLabel(i.productId, i.returned)} = {quantityLabel(i.productId, i.difference)}</p></div>)}
          {active?.lines.map((l) => (
            <NumberField
              key={l.productId}
              label={`${d.products.find((p) => p.id === l.productId)?.name} · devolución física g/und`}
              value={returns[l.productId] ?? 0}
              onChange={(v) => setReturns({ ...returns, [l.productId]: v })}
            />
          ))}
          <h3 className="font-bold">2. Dinero: ventas por medio de pago</h3>
          <p>Efectivo esperado: {formatCOP(preview?.expected ?? 0)}</p>
          {(["nequi", "bancolombia", "tarjeta", "fiado"] as const).map(method => <p key={method} className="text-sm capitalize">{method}: {formatCOP(preview?.routeSales.flatMap(s => s.payments).filter(p => p.method === method).reduce((sum, p) => sum + p.amount, 0) ?? 0)}</p>)}
          <NumberField label="Efectivo entregado · COP" value={cash} onChange={setCash} />
          <p>Diferencia de dinero: <strong>{formatCOP(cash - (preview?.expected ?? 0))}</strong></p>
          <h3 className="font-bold">3. Descongelamiento y diferencias físicas</h3>
          {preview?.inventory.map(i => <p key={i.productId} className="text-sm">{d.products.find(p => p.id === i.productId)?.name}: <Status warning={i.state === "Requiere revisión"}>{i.state}</Status></p>)}
          <p className="text-xs text-muted-foreground">Tolerancia del producto aplicada. No se descuenta dinero automáticamente por pérdidas normales.</p>
          <Field label="Motivo de diferencias y responsable">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Submit busy={busy}>Confirmar liquidación</Submit>
        </form>
      </FormModal>
    </>
  );
}

export function PurchasesPage() {
  const d = useBusiness();
  const { run, busy } = useAction();
  const [open, setOpen] = useState(false);
  const [supplier, setSupplier] = useState("sup1");
  const [product, setProduct] = useState("prod-20");
  const [quantity, setQuantity] = useState(10000);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const suggestions = useQuery({
    queryKey: ["purchase-suggestions", d.versions.length, d.sales.length],
    queryFn: () => services.purchases.suggestions(),
  });
  return (
    <>
      <PageHeader
        title="Compras y proveedores"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSupplierOpen(true)}>
              <Plus />
              Proveedor
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus />
              Orden
            </Button>
          </div>
        }
      />
      <h2 className="mb-3 text-xl font-bold">Sugerencias de compra</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Consumo promedio de {d.settings.find((s) => s.id === "purchase-days")?.value} días · mínimo
        y merma configurados
      </p>
      {!suggestions.data?.length ? (
        <Empty title="Inventario suficiente según configuración" />
      ) : (
        <Table
          heads={["Producto", "Promedio diario", "Cantidad sugerida", "Ingredientes", "Acción"]}
        >
          {suggestions.data.map((s) => (
            <tr key={s.productId}>
              <td className={cell}>{d.products.find((p) => p.id === s.productId)?.name}</td>
              <td className={cell}>{Math.round(s.average)} g/und</td>
              <td className={cell}>{s.quantity} g/und</td>
              <td className={cell}>
                {d.recipes
                  .find((r) => r.productId === s.productId)
                  ?.lines.map(
                    (l) =>
                      `${d.seasonings.find((x) => x.id === l.seasoningId)?.alias}: ${Math.ceil((l.gramsPerKg * s.quantity) / 1000)} g`,
                  )
                  .join(", ") || "No aplica"}
              </td>
              <td className={cell}>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSupplier(s.supplierId);
                    setProduct(s.productId);
                    setQuantity(s.quantity);
                    setOpen(true);
                  }}
                >
                  Crear orden
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <h2 className="mb-3 mt-8 text-xl font-bold">Órdenes</h2>
      <Table heads={["Orden", "Proveedor / producto", "Pedido / recibido", "Estado", "Acciones"]}>
        {d.purchases.map((o) => (
          <tr key={o.id}>
            <td className={cell}>{o.id}</td>
            <td className={cell}>
              {d.suppliers.find((s) => s.id === o.supplierId)?.name}
              <p className="text-xs">{d.products.find((p) => p.id === o.productId)?.name}</p>
            </td>
            <td className={cell}>
              {o.quantity} / {o.received} g/und
            </td>
            <td className={cell}>
              <Status warning={o.status !== "recibida"}>{o.status}</Status>
            </td>
            <td className={cell}>
              <div className="flex flex-wrap gap-2">
                {o.status === "borrador" && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      run(() => services.purchases.send(o.id), "Orden marcada enviada")
                    }
                  >
                    Marcar enviada
                  </Button>
                )}
                <Button
                  variant="ghost"
                  title="Preparar mensaje WhatsApp"
                  onClick={() =>
                    setMessage(
                      `${d.settings.find((s) => s.id === "purchase-template")?.value || "Pedido"}\nOrden: ${o.id}\n${d.products.find((p) => p.id === o.productId)?.name}: ${o.quantity} g/und`,
                    )
                  }
                >
                  <Send />
                  Mensaje
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
      <h2 className="mb-3 mt-8 text-xl font-bold">Proveedores</h2>
      <Table heads={["Nombre", "Teléfono", "Observación"]}>
        {d.suppliers.map((s) => (
          <tr key={s.id}>
            <td className={cell}>{s.name}</td>
            <td className={cell}>{s.phone || "Pendiente de configurar"}</td>
            <td className={cell}>{s.note}</td>
          </tr>
        ))}
      </Table>
      <FormModal title="Nueva orden de compra" open={open} onClose={() => setOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(
              () => services.purchases.create(supplier, product, quantity),
              "Orden creada",
            );
            if (ok) setOpen(false);
          }}
        >
          <SelectField
            label="Proveedor"
            value={supplier}
            onChange={setSupplier}
            options={d.suppliers}
          />
          <SelectField
            label="Producto"
            value={product}
            onChange={setProduct}
            options={d.products}
          />
          <NumberField label="Cantidad · g/und" value={quantity} onChange={setQuantity} />
          <Submit busy={busy} />
        </form>
      </FormModal>
      <FormModal title="Nuevo proveedor" open={supplierOpen} onClose={() => setSupplierOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(async () => {
              await services.suppliers.save({ id: "", name, phone, note, productIds: [product] });
              return true;
            });
            if (ok) setSupplierOpen(false);
          }}
        >
          <Field label="Nombre">
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Teléfono">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <SelectField
            label="Producto suministrado"
            value={product}
            onChange={setProduct}
            options={d.products}
          />
          <Field label="Observación">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Submit busy={busy} />
        </form>
      </FormModal>
      <FormModal title="Mensaje de pedido" open={!!message} onClose={() => setMessage("")}>
        <pre className="whitespace-pre-wrap text-sm">{message}</pre>
        <Button asChild size="xl">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Send />
            Abrir WhatsApp
          </a>
        </Button>
      </FormModal>
    </>
  );
}
