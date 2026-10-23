import { useState } from "react";
import { Plus, Pencil, Wallet, Package, Ban, Eye, Users } from "lucide-react";
import { services } from "@/services";
import { useSession } from "@/hooks/use-session";
import { formatCOP, formatDateTime } from "@/lib/format";
import type { Product, Customer } from "@/domain/operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Empty } from "@/components/app/ui-bits";
import {
  useBusiness,
  useAction,
  Field,
  NumberField,
  SelectField,
  FormModal,
  Submit,
  Status,
  Table,
  cell,
  ConfirmReason,
} from "./common";

export function ProductsPage() {
  const d = useBusiness();
  const { run, busy } = useAction();
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<Product | null>(null);
  const [toggle, setToggle] = useState("");
  const newProduct: Product = {
    id: "",
    name: "",
    category: "Ahumados",
    barcode: "",
    active: true,
    control: "peso",
    origin: "producido",
    retailPrice: 0,
    wholesalePrice: 0,
    minimum: 0,
    priceGroup: "",
    shrinkagePercent: 0,
    thawTolerancePercent: 0,
    requiresDian: false,
  };
  const update = (key: keyof Product, value: unknown) => {
    if (edit) setEdit({ ...edit, [key]: value });
  };
  return (
    <>
      <PageHeader
        title="Productos y precios"
        subtitle={`${d.products.length} referencias · Valores de ejemplo`}
        action={
          <Button onClick={() => setEdit(newProduct)}>
            <Plus />
            Nuevo producto
          </Button>
        }
      />
      <Input
        aria-label="Buscar productos"
        placeholder="Nombre, categoría o código"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-md"
      />
      <Table heads={["Producto", "Control", "Precio / mayorista", "Mínimo", "Estado", "Acciones"]}>
        {d.products
          .filter((p) =>
            `${p.name} ${p.category} ${p.barcode}`.toLowerCase().includes(search.toLowerCase()),
          )
          .map((p) => (
            <tr key={p.id}>
              <td className={cell}>
                <strong>{p.name}</strong>
                <p className="text-xs text-muted-foreground">
                  {p.category} · {p.origin} · {p.barcode}
                </p>
              </td>
              <td className={cell}>{p.control}</td>
              <td className={cell}>
                {formatCOP(p.retailPrice)}
                <p className="text-xs">{formatCOP(p.wholesalePrice)}</p>
              </td>
              <td className={cell}>
                {p.minimum} {p.control === "unidad" ? "und" : "g"}
              </td>
              <td className={cell}>
                <Status warning={!p.active}>{p.active ? "Activo" : "Inactivo"}</Status>
              </td>
              <td className={cell}>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Editar producto"
                  aria-label={`Editar ${p.name}`}
                  onClick={() => setEdit({ ...p })}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Cambiar estado"
                  aria-label={`Estado ${p.name}`}
                  onClick={() => setToggle(p.id)}
                >
                  <Ban />
                </Button>
              </td>
            </tr>
          ))}
      </Table>
      <FormModal
        title={edit?.id ? "Editar producto" : "Nuevo producto"}
        open={!!edit}
        onClose={() => setEdit(null)}
      >
        {edit && (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await run(async () => {
                await services.products.save(edit);
                return true;
              });
              if (ok) setEdit(null);
            }}
          >
            <Field label="Nombre">
              <Input required value={edit.name} onChange={(e) => update("name", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoría">
                <Input value={edit.category} onChange={(e) => update("category", e.target.value)} />
              </Field>
              <Field label="Código de barras">
                <Input value={edit.barcode} onChange={(e) => update("barcode", e.target.value)} />
              </Field>
              <SelectField
                label="Control"
                value={edit.control}
                onChange={(v) => update("control", v)}
                options={["peso", "unidad", "mixto"].map((v) => ({ id: v, name: v }))}
              />
              <SelectField
                label="Origen"
                value={edit.origin}
                onChange={(v) => update("origin", v)}
                options={["producido", "reventa"].map((v) => ({ id: v, name: v }))}
              />
              <NumberField
                label="Precio al detal · COP"
                value={edit.retailPrice}
                onChange={(v) => update("retailPrice", v)}
              />
              <NumberField
                label="Precio mayorista · COP"
                value={edit.wholesalePrice}
                onChange={(v) => update("wholesalePrice", v)}
              />
              <NumberField
                label="Inventario mínimo · g/und"
                value={edit.minimum}
                onChange={(v) => update("minimum", v)}
              />
              <Field label="Grupo de precio de ruta">
                <Input
                  value={edit.priceGroup}
                  onChange={(e) => update("priceGroup", e.target.value)}
                />
              </Field>
              <NumberField
                label="Merma de referencia · %"
                value={edit.shrinkagePercent}
                onChange={(v) => update("shrinkagePercent", v)}
                step={0.1}
              />
              <NumberField
                label="Tolerancia descongelado · %"
                value={edit.thawTolerancePercent}
                onChange={(v) => update("thawTolerancePercent", v)}
                step={0.1}
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={edit.requiresDian}
                onChange={(e) => update("requiresDian", e.target.checked)}
              />
              Requiere DIAN · No conectada
            </label>
            <Submit busy={busy}>Guardar producto</Submit>
          </form>
        )}
      </FormModal>
      <ConfirmReason
        title="Cambiar estado del producto"
        open={!!toggle}
        onClose={() => setToggle("")}
        onConfirm={(r) => services.products.deactivate(toggle, r)}
      />
    </>
  );
}

export function CustomersPage() {
  const d = useBusiness();
  const session = useSession();
  const { run, busy } = useAction();
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<Customer | null>(null);
  const [account, setAccount] = useState("");
  const [action, setAction] = useState<"abono" | "canastillas">("abono");
  const [amount, setAmount] = useState(0);
  const [second, setSecond] = useState(0);
  const [method, setMethod] = useState("efectivo");
  const [reason, setReason] = useState("");
  const [blocked, setBlocked] = useState<Customer | null>(null);
  const [history, setHistory] = useState("");
  const fresh: Customer = {
    id: "",
    name: "",
    document: "",
    phone: "",
    wholesale: false,
    creditAllowed: false,
    creditLimit: 0,
    blocked: false,
    balance: 0,
    baskets: 0,
  };
  const c = d.customers.find((c) => c.id === account);
  const update = (key: keyof Customer, value: unknown) => {
    if (edit) setEdit({ ...edit, [key]: value });
  };
  return (
    <>
      <PageHeader
        title="Clientes, fiados y canastillas"
        action={
          <Button onClick={() => setEdit(fresh)}>
            <Plus />
            Nuevo cliente
          </Button>
        }
      />
      <Input
        aria-label="Buscar clientes"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Nombre o documento"
        className="mb-4 max-w-md"
      />
      <Table heads={["Cliente", "Saldo / cupo", "Canastillas", "Estado", "Acciones"]}>
        {d.customers
          .filter((c) => `${c.name} ${c.document}`.toLowerCase().includes(search.toLowerCase()))
          .map((c) => (
            <tr key={c.id}>
              <td className={cell}>
                <strong>{c.name}</strong>
                <p className="text-xs text-muted-foreground">
                  {c.document} · {c.wholesale ? "Mayorista" : "Detal"}
                </p>
              </td>
              <td className={cell}>
                <p className="font-semibold">{formatCOP(c.balance)}</p>
                <span className="text-xs">Cupo: {formatCOP(c.creditLimit)}</span>
              </td>
              <td className={cell}>{c.baskets}</td>
              <td className={cell}>
                <Status warning={c.blocked}>{c.blocked ? "Bloqueado" : "Activo"}</Status>
              </td>
              <td className={cell}>
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Editar"
                    aria-label={`Editar ${c.name}`}
                    onClick={() => setEdit({ ...c })}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Registrar abono"
                    aria-label={`Abono ${c.name}`}
                    onClick={() => {
                      setAccount(c.id);
                      setAction("abono");
                      setAmount(c.balance);
                      setSecond(0);
                    }}
                  >
                    <Wallet />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Canastillas"
                    aria-label={`Canastillas ${c.name}`}
                    onClick={() => {
                      setAccount(c.id);
                      setAction("canastillas");
                      setAmount(-1);
                    }}
                  >
                    <Package />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Historial"
                    aria-label={`Historial ${c.name}`}
                    onClick={() => setHistory(c.id)}
                  >
                    <Eye />
                  </Button>
                  {session?.user.role === "admin" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Bloquear / habilitar"
                      aria-label={`Bloqueo ${c.name}`}
                      onClick={() => setBlocked(c)}
                    >
                      <Ban />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
      </Table>
      <FormModal title="Datos del cliente" open={!!edit} onClose={() => setEdit(null)}>
        {edit && (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await run(async () => {
                await services.customers.save(edit);
                return true;
              });
              if (ok) setEdit(null);
            }}
          >
            <Field label="Nombre">
              <Input required value={edit.name} onChange={(e) => update("name", e.target.value)} />
            </Field>
            <Field label="Documento">
              <Input value={edit.document} onChange={(e) => update("document", e.target.value)} />
            </Field>
            <Field label="Teléfono">
              <Input value={edit.phone} onChange={(e) => update("phone", e.target.value)} />
            </Field>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={edit.wholesale}
                onChange={(e) => update("wholesale", e.target.checked)}
              />
              Cliente mayorista
            </label>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={edit.creditAllowed}
                onChange={(e) => update("creditAllowed", e.target.checked)}
              />
              Permitir fiado
            </label>
            <NumberField
              label="Cupo de crédito · COP"
              value={edit.creditLimit}
              onChange={(v) => update("creditLimit", v)}
            />
            <Submit busy={busy}>Guardar cliente</Submit>
          </form>
        )}
      </FormModal>
      <FormModal
        title={action === "abono" ? "Registrar abono" : "Movimiento de canastillas"}
        open={!!account}
        onClose={() => setAccount("")}
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(
              async () => {
                if (action === "abono")
                  await services.customers.pay(
                    account,
                    [
                      {
                        method: method as "efectivo" | "nequi" | "bancolombia" | "tarjeta",
                        amount,
                      },
                      ...(second > 0 ? [{ method: "nequi" as const, amount: second }] : []),
                    ],
                    reason,
                  );
                else await services.customers.baskets(account, amount, reason);
                return true;
              },
              action === "abono"
                ? "Abono registrado; saldo actualizado"
                : "Canastillas actualizadas",
            );
            if (ok) setAccount("");
          }}
        >
          <p className="font-semibold">{c?.name}</p>
          <p>
            Saldo: {formatCOP(c?.balance ?? 0)} · Canastillas: {c?.baskets}
          </p>
          <NumberField
            label={
              action === "abono" ? "Valor del abono · COP" : "Cantidad (+ entrega / − devolución)"
            }
            value={amount}
            onChange={setAmount}
          />
          {action === "abono" && (
            <>
              <SelectField
                label="Medio de pago"
                value={method}
                onChange={setMethod}
                options={["efectivo", "nequi", "bancolombia", "tarjeta"].map((m) => ({
                  id: m,
                  name: m,
                }))}
              />
              <NumberField
                label="Segundo medio Nequi · COP (opcional)"
                value={second}
                onChange={setSecond}
              />
              <p>Saldo después: {formatCOP((c?.balance ?? 0) - amount - second)}</p>
            </>
          )}
          <Field label="Motivo / observación">
            <Input required value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Submit busy={busy} />
        </form>
      </FormModal>
      <FormModal title="Historial del cliente" open={!!history} onClose={() => setHistory("")}>
        <div className="space-y-3">
          {d.sales
            .filter((s) => s.customerId === history)
            .map((s) => (
              <p className="border-b pb-2" key={s.id}>
                {s.number} · {s.status} · {formatCOP(s.total)}
                <span className="block text-xs">{formatDateTime(s.createdAt)}</span>
              </p>
            ))}
          {d.customerMovements
            .filter((m) => m.customerId === history)
            .map((m) => (
              <p key={m.id}>
                {m.type} · {m.type === "abono" ? formatCOP(m.amount) : m.quantity} · {m.reason}
                <span className="block text-xs">
                  {m.actor} · {formatDateTime(m.createdAt)}
                </span>
              </p>
            ))}
        </div>
      </FormModal>
      <ConfirmReason
        title={blocked?.blocked ? "Habilitar cliente" : "Bloquear cliente"}
        open={!!blocked}
        onClose={() => setBlocked(null)}
        onConfirm={(r) =>
          blocked ? services.customers.block(blocked.id, !blocked.blocked, r) : Promise.resolve()
        }
      />
    </>
  );
}

export function EmployeesPage() {
  const d = useBusiness();
  const { run, busy } = useAction();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("recepcion");
  const [rate, setRate] = useState(0);
  return (
    <>
      <PageHeader
        title="Empleados y accesos"
        action={
          <Button onClick={() => setOpen(true)}>
            <Users />
            Registrar empleado
          </Button>
        }
      />
      <Table heads={["Empleado", "Usuario", "Cargo", "Estado", "Acción"]}>
        {d.employees.map((e) => (
          <tr key={e.id}>
            <td className={cell}>{e.name}</td>
            <td className={cell}>@{e.username}</td>
            <td className={cell}>{e.role === "ruta" ? "Empleados de ruta" : e.role}</td>
            <td className={cell}>
              <Status warning={!e.active}>{e.active ? "Activo" : "Inactivo"}</Status>
            </td>
            <td className={cell}>
              {e.role !== "admin" && (
                <Button
                  variant="outline"
                  onClick={() => run(() => services.users.setActive(e.id, !e.active))}
                >
                  {e.active ? "Desactivar" : "Activar"}
                </Button>
              )}
            </td>
          </tr>
        ))}
      </Table>
      <FormModal title="Registrar empleado" open={open} onClose={() => setOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(async () => {
              await services.users.create({
                name,
                username,
                password,
                role: role as "recepcion" | "planta" | "ruta" | "vendedor" | "contador",
                hourlyRate: rate,
              });
              return true;
            });
            if (ok) {
              setOpen(false);
              setPassword("");
            }
          }}
        >
          <Field label="Nombre">
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Usuario">
            <Input required value={username} onChange={(e) => setUsername(e.target.value)} />
          </Field>
          <Field label="Clave de demostración">
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <SelectField
            label="Cargo"
            value={role}
            onChange={setRole}
            options={[
              { id: "recepcion", name: "Recepción de cajas" },
              { id: "contador", name: "Contabilidad" },
              { id: "ruta", name: "Empleados de ruta" },
              { id: "vendedor", name: "Vendedor de galería" },
              { id: "planta", name: "Ahumado y planta" },
            ]}
          />
          <NumberField label="Valor de hora base · COP (ejemplo)" value={rate} onChange={setRate} />
          <Submit busy={busy}>Crear acceso</Submit>
        </form>
      </FormModal>
    </>
  );
}
