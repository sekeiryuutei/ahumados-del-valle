import { useState } from "react";
import { Plus, Pause, Play, Trash2, Receipt, Printer, ShoppingBag, Search } from "lucide-react";
import { toast } from "sonner";
import { services } from "@/services";
import { useSession } from "@/hooks/use-session";
import { formatCOP, formatKg, formatDateTime } from "@/lib/format";
import { itemTotal, netWeight } from "@/domain/operation-rules";
import type { LocationId, Payment, PaymentKind, Sale } from "@/domain/operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Empty, Stat } from "@/components/app/ui-bits";
import {
  useBusiness,
  useAction,
  SelectField,
  NumberField,
  Field,
  FormModal,
  Submit,
  Status,
  Table,
  cell,
  ConfirmReason,
} from "./common";

const methods = ["efectivo", "nequi", "bancolombia", "tarjeta", "fiado"] as const;
export function ReceiptView({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const d = useBusiness();
  const customer = d.customers.find((c) => c.id === sale.customerId);
  return (
    <FormModal title={`Tirilla ${sale.number}`} open onClose={onClose}>
      <div id="receipt" className="space-y-3 border-y py-5 font-mono text-sm">
        <h2 className="text-center text-xl font-bold">Ahumados del Valle</h2>
        <p className="text-center">
          {sale.number} · {d.locations.find((l) => l.id === sale.locationId)?.name}
        </p>
        <p>
          {formatDateTime(sale.createdAt)}
          <br />
          {sale.actor}
          <br />
          {customer?.name}
        </p>
        {sale.items.map((i, n) => (
          <div className="border-b pb-2" key={n}>
            <p>{i.name}</p>
            <p className="flex justify-between">
              <span>
                {i.control === "unidad" ? `${i.quantity} und` : formatKg(i.quantity)} ×{" "}
                {formatCOP(i.price)}
              </span>
              <strong>{formatCOP(i.total)}</strong>
            </p>
          </div>
        ))}
        <p className="flex justify-between text-xl font-bold">
          <span>Total</span>
          {formatCOP(sale.total)}
        </p>
        {sale.payments.map((p, i) => (
          <p key={i} className="flex justify-between">
            <span className="capitalize">{p.method}</span>
            {formatCOP(p.amount)}
          </p>
        ))}
        <p>
          {d.settings.find((s) => s.id === "phone")?.value || "Teléfono pendiente de configurar"}
        </p>
        <p>{d.settings.find((s) => s.id === "footer")?.value}</p>
        <p className="text-center text-muted-foreground">
          Demostración · Tirilla interna
          <br />
          DIAN: No conectada
        </p>
      </div>
      <Button
        size="xl"
        onClick={() => {
          toast.success("Impresión simulada: copia digital conservada en ventas.");
        }}
      >
        <Printer />
        Imprimir · simulación
      </Button>
    </FormModal>
  );
}

export function PosPage({ location: initial = "galeria" }: { location?: LocationId }) {
  const d = useBusiness();
  const session = useSession();
  const { run, busy } = useAction();
  const [location, setLocation] = useState<LocationId>(initial);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [customerId, setCustomer] = useState("c3");
  const [items, setItems] = useState<{ productId: string; quantity: number; note: string }[]>([]);
  const [chosen, setChosen] = useState("");
  const [gross, setGross] = useState(1000);
  const [boxes, setBoxes] = useState(0);
  const [units, setUnits] = useState(1);
  const [payments, setPayments] = useState<Payment[]>([{ method: "efectivo", amount: 0 }]);
  const [baskets, setBaskets] = useState(0);
  const [note, setNote] = useState("");
  const [dian, setDian] = useState(false);
  const [offline, setOffline] = useState(false);
  const [draftId, setDraft] = useState<string | undefined>();
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const p = d.products.find((p) => p.id === chosen);
  const c = d.customers.find((c) => c.id === customerId);
  const tare = Number(d.settings.find((s) => s.id === "tare")?.value || 2000);
  const net = netWeight(gross, tare, boxes);
  const total = items.reduce((sum, line) => {
    const product = d.products.find((p) => p.id === line.productId);
    if (!product) return sum;
    const price =
      c?.wholesale ||
      (product.control !== "unidad" &&
        line.quantity >= Number(d.settings.find((s) => s.id === "wholesale-min")?.value || 5000))
        ? product.wholesalePrice
        : product.retailPrice;
    return sum + itemTotal(product, line.quantity, price);
  }, 0);
  const available = (pid: string) =>
    d.balances.find((b) => b.productId === pid && b.locationId === location)?.quantity ?? 0;
  const reset = () => {
    setItems([]);
    setDraft(undefined);
    setNote("");
    setBaskets(0);
    setPayOpen(false);
  };
  const input = () => ({
    locationId: location,
    customerId,
    items,
    payments,
    baskets,
    note,
    requiresDian: dian,
    offline: location === "ruta-1" && (offline || !navigator.onLine),
    draftId,
  });
  const filtered = d.products.filter(
    (p) =>
      p.active &&
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      (!category || p.category === category) &&
      (location !== "ruta-1" || available(p.id) > 0),
  );
  return (
    <>
      <PageHeader
        title={location === "ruta-1" ? "Venta en ruta" : "Punto de venta"}
        subtitle={d.locations.find((l) => l.id === location)?.name}
        action={<Status>Precios de ejemplo · COP</Status>}
      />
      {session?.user.role === "admin" && (
        <div className="mb-4 max-w-xs">
          <SelectField
            label="Caja / ubicación"
            value={location}
            onChange={(v) => {
              if (items.length) {
                toast.error("Suspende o termina la venta antes de cambiar caja.");
                return;
              }
              setLocation(v as LocationId);
            }}
            options={d.locations}
          />
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section>
          <div className="mb-4 flex gap-2">
            <Input
              aria-label="Buscar producto o código"
              placeholder="Producto o código de barras"
              className="h-12"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const product = d.products.find((p) => p.barcode === search);
                  if (product) {
                    setChosen(product.id);
                    setSearch("");
                  }
                }
              }}
            />
            <Search className="mt-3 size-5 text-muted-foreground" />
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {["", ...new Set(d.products.map((p) => p.category))].map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? "default" : "outline"}
                onClick={() => setCategory(cat)}
              >
                {cat || "Todos"}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {filtered.map((product) => (
              <Button
                key={product.id}
                variant="outline"
                onClick={() => {
                  setChosen(product.id);
                  setGross(1000);
                  setBoxes(0);
                  setUnits(1);
                }}
                className="h-auto min-h-32 flex-col items-start justify-between whitespace-normal p-4 text-left"
              >
                <ShoppingBag className="text-primary" />
                <span className="font-semibold">{product.name}</span>
                <span className="text-primary">
                  {formatCOP(product.retailPrice)} / {product.control === "unidad" ? "und" : "kg"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Saldo:{" "}
                  {product.control === "unidad"
                    ? `${available(product.id)} und`
                    : formatKg(available(product.id))}
                </span>
              </Button>
            ))}
          </div>
          {!filtered.length && <Empty title="Sin productos disponibles" />}
        </section>
        <section className="min-w-0 border-l pl-0 xl:pl-6">
          <SelectField
            label="Cliente"
            value={customerId}
            onChange={setCustomer}
            options={d.customers.filter((c) => !c.blocked)}
          />
          <p className="my-2 text-xs text-muted-foreground">
            Cupo: {formatCOP(Math.max(0, (c?.creditLimit ?? 0) - (c?.balance ?? 0)))} ·{" "}
            {c?.wholesale ? "Mayorista" : "Precio de contado"}
          </p>
          <h2 className="my-4 text-lg font-bold">
            Venta actual {draftId && <Status>Suspendida</Status>}
          </h2>
          {items.length === 0 ? (
            <Empty title="Venta vacía" />
          ) : (
            items.map((i, n) => {
              const product = d.products.find((p) => p.id === i.productId);
              return (
                <div key={n} className="mb-3 border-b pb-3">
                  <p className="font-semibold">{product?.name}</p>
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label={`Cantidad ${product?.name}`}
                      className="mt-1 w-28"
                      type="number"
                      min="1"
                      value={i.quantity}
                      onChange={(e) =>
                        setItems(
                          items.map((line, j) =>
                            j === n ? { ...line, quantity: Number(e.target.value) } : line,
                          ),
                        )
                      }
                    />
                    <span className="text-xs">{product?.control === "unidad" ? "und" : "g"}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar ${product?.name}`}
                      title="Quitar producto"
                      onClick={() => setItems(items.filter((_, j) => j !== n))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
          <p className="my-5 flex flex-wrap items-center justify-between gap-2 text-2xl font-bold">
            <span>Total</span>
            {formatCOP(total)}
          </p>
          <div className="flex flex-col gap-3">
            <Button
              size="xl"
              disabled={!items.length || busy}
              onClick={() => {
                setPayments([{ method: "efectivo", amount: total }]);
                setPayOpen(true);
              }}
            >
              <Receipt />
              Cobrar
            </Button>
            <Button
              variant="outline"
              size="xl"
              disabled={!items.length || busy}
              onClick={async () => {
                const result = await run(() => services.sales.pause(input()), "Venta suspendida");
                if (result) reset();
              }}
            >
              <Pause />
              Suspender
            </Button>
          </div>
          <h3 className="mb-2 mt-8 font-bold">Ventas suspendidas</h3>
          {d.sales
            .filter((s) => s.locationId === location && s.status === "pausada")
            .map((s) => (
              <Button
                className="mb-2 h-14 w-full justify-between"
                variant="secondary"
                key={s.id}
                onClick={() => {
                  if (items.length) {
                    toast.error("Suspende la venta actual primero.");
                    return;
                  }
                  setItems(
                    s.items.map((i) => ({
                      productId: i.productId,
                      quantity: i.quantity,
                      note: i.note,
                    })),
                  );
                  setCustomer(s.customerId);
                  setDraft(s.id);
                  setNote(s.note);
                }}
              >
                <Play />
                {s.number}
                <span>{formatCOP(s.total)}</span>
              </Button>
            ))}
        </section>
      </div>
      <FormModal title={p?.name ?? "Producto"} open={!!p} onClose={() => setChosen("")}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!p) return;
            const qty = p.control === "unidad" ? units : net;
            if (qty <= 0) {
              toast.error("La cantidad neta debe ser positiva.");
              return;
            }
            setItems([...items, { productId: p.id, quantity: qty, note: "" }]);
            setChosen("");
          }}
        >
          {p?.control === "unidad" ? (
            <NumberField label="Unidades" value={units} onChange={setUnits} />
          ) : (
            <>
              <NumberField
                label="Peso bruto · gramos (báscula simulada)"
                value={gross}
                onChange={setGross}
              />
              <NumberField
                label={`Cajas · tara ${formatKg(tare)} por caja`}
                value={boxes}
                onChange={setBoxes}
              />
              <p className="text-2xl font-bold">Neto: {formatKg(net)}</p>
            </>
          )}
          <Button size="xl" type="submit" className="w-full">
            <Plus />
            Agregar
          </Button>
        </form>
      </FormModal>
      <FormModal title="Confirmar cobro" open={payOpen} onClose={() => setPayOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await run(
              () => services.sales.create(input()),
              "Venta guardada · tirilla disponible",
            );
            if (result) {
              setReceipt(result as Sale);
              reset();
            }
          }}
        >
          <p className="text-3xl font-bold">{formatCOP(total)}</p>
          {payments.map((payment, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <SelectField
                label={`Medio ${i + 1}`}
                value={payment.method}
                onChange={(v) =>
                  setPayments(
                    payments.map((p, j) => (j === i ? { ...p, method: v as PaymentKind } : p)),
                  )
                }
                options={methods.map((m) => ({ id: m, name: m }))}
              />
              <NumberField
                label={`Valor ${i + 1} · COP`}
                value={payment.amount}
                onChange={(v) =>
                  setPayments(payments.map((p, j) => (j === i ? { ...p, amount: v } : p)))
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setPayments([
                ...payments,
                {
                  method: "nequi",
                  amount: Math.max(0, total - payments.reduce((s, p) => s + p.amount, 0)),
                },
              ])
            }
          >
            <Plus />
            Otro medio
          </Button>
          <p className="text-sm">
            Diferencia: {formatCOP(total - payments.reduce((s, p) => s + p.amount, 0))}
          </p>
          <NumberField label="Canastillas prestadas" value={baskets} onChange={setBaskets} />
          <Field label="Observaciones">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={dian} onChange={(e) => setDian(e.target.checked)} />
            Requiere DIAN · No conectada
          </label>
          {location === "ruta-1" && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={offline}
                onChange={(e) => setOffline(e.target.checked)}
              />
              Sin conexión (simulada) · Guardar en cola local
            </label>
          )}
          <Submit busy={busy}>Confirmar venta</Submit>
        </form>
      </FormModal>
      {receipt && <ReceiptView sale={receipt} onClose={() => setReceipt(null)} />}
    </>
  );
}

export function SalesPage({ location }: { location?: LocationId }) {
  const d = useBusiness();
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [cancel, setCancel] = useState("");
  const [query, setQuery] = useState("");
  const sales = d.sales.filter(
    (s) =>
      (!location || s.locationId === location) &&
      s.number.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader title="Ventas y tirillas" />
      <Input
        aria-label="Buscar venta"
        placeholder="Número de tirilla"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 max-w-sm"
      />
      <Table heads={["Tirilla", "Cliente", "Total", "Estado", "Acciones"]}>
        {sales.map((s) => (
          <tr key={s.id}>
            <td className={cell}>
              {s.number}
              <p className="text-xs text-muted-foreground">{formatDateTime(s.createdAt)}</p>
            </td>
            <td className={cell}>{d.customers.find((c) => c.id === s.customerId)?.name}</td>
            <td className={cell}>{formatCOP(s.total)}</td>
            <td className={cell}>
              <Status warning={s.status !== "pagada"}>{s.status}</Status>
              <p className="text-xs">{s.syncStatus}</p>
            </td>
            <td className={cell}>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Ver ${s.number}`}
                title="Ver tirilla"
                onClick={() => setReceipt(s)}
              >
                <Receipt />
              </Button>
              {s.status !== "anulada" && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Anular ${s.number}`}
                  title="Anular con motivo"
                  onClick={() => setCancel(s.id)}
                >
                  <Trash2 />
                </Button>
              )}
            </td>
          </tr>
        ))}
      </Table>
      {!sales.length && <Empty title="Sin ventas" />}
      {receipt && <ReceiptView sale={receipt} onClose={() => setReceipt(null)} />}
      <ConfirmReason
        title="Anular venta"
        open={!!cancel}
        onClose={() => setCancel("")}
        onConfirm={(reason) => services.sales.cancel(cancel, reason)}
      />
    </>
  );
}
export function CashPage({ location = "galeria" }: { location?: LocationId }) {
  const d = useBusiness();
  const { run, busy } = useAction();
  const [counted, setCounted] = useState(0);
  const lastClose = d.closings.find(c => c.locationId === location)?.createdAt ?? "";
  const sales = d.sales.filter((s) => s.locationId === location && s.status === "pagada" && s.createdAt > lastClose);
  const totals = methods.map((m) => ({
    method: m,
    total: sales
      .flatMap((s) => s.payments)
      .filter((p) => p.method === m)
      .reduce((sum, p) => sum + p.amount, 0),
  }));
  return (
    <>
      <PageHeader
        title="Cierre de caja"
        subtitle={d.locations.find((l) => l.id === location)?.name}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {totals.map((p) => (
          <Stat key={p.method} label={p.method} value={formatCOP(p.total)} />
        ))}
      </div>
      <form
        className="mb-8 max-w-md space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await run(
            () => services.cashRegisters.close(location, counted),
            "Cierre guardado con su diferencia",
          );
        }}
      >
        <NumberField label="Efectivo contado · COP" value={counted} onChange={setCounted} />
        <Submit busy={busy}>Confirmar cierre</Submit>
      </form>
      <Table heads={["Fecha", "Esperado", "Contado", "Diferencia"]}>
        {d.closings
          .filter((c) => c.locationId === location)
          .map((c) => (
            <tr key={c.id}>
              <td className={cell}>{formatDateTime(c.createdAt)}</td>
              <td className={cell}>{formatCOP(c.expected)}</td>
              <td className={cell}>{formatCOP(c.counted)}</td>
              <td className={cell}>
                <Status warning={c.difference !== 0}>{formatCOP(c.difference)}</Status>
              </td>
            </tr>
          ))}
      </Table>
    </>
  );
}
