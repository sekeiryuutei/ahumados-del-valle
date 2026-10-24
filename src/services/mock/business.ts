import type { BusinessServices, SalesInput } from "../operation-contracts";
import type { Role } from "@/domain/types";
import type {
  BusinessSnapshot,
  LocationId,
  Sale,
  ProductionStage,
  Payment,
} from "@/domain/operations";
import {
  itemTotal,
  netWeight,
  reconcileRoute,
  shrinkage,
  validatePayments,
} from "@/domain/operation-rules";
import { ServiceError } from "../contracts";
import { mockServices } from "./index";
import { businessDb, saveBusiness } from "./business-db";
import { db, save, uid, delay } from "./db";
import { listQueue, putQueue } from "./offline-db";
import { todayBogota } from "@/lib/format";
import { reminderService } from "./reminders";
import { isIsoDate } from "@/domain/dates";

const now = () => new Date().toISOString();
function actor() {
  return mockServices.auth.getSession()?.user.name ?? "Demostración";
}
function allow(...roles: Role[]) {
  const role = mockServices.auth.getSession()?.user.role;
  if (!role || !roles.includes(role))
    throw new ServiceError("validacion", "Tu cargo no tiene acceso a esta acción.");
}
function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ServiceError("validacion", message);
}
function positive(value: number) {
  return Number.isInteger(value) && value > 0;
}
function audit(
  module: string,
  action: string,
  entityId: string,
  reason = "",
  before = "",
  after = "",
  technical = false,
) {
  businessDb().audit.unshift({
    id: uid("audit"),
    module,
    action,
    entityId,
    actor: actor(),
    createdAt: now(),
    reason,
    before,
    after,
    technical,
  });
}
function commit() {
  saveBusiness();
}
function setting(id: string, fallback = 0) {
  return Number(businessDb().settings.find((s) => s.id === id)?.value || fallback);
}
function balance(productId: string, locationId: LocationId) {
  const d = businessDb();
  let row = d.balances.find((b) => b.productId === productId && b.locationId === locationId);
  if (!row) {
    row = { productId, locationId, quantity: 0 };
    d.balances.push(row);
  }
  return row;
}
function move(
  productId: string,
  quantity: number,
  from: LocationId | null,
  to: LocationId | null,
  type: BusinessSnapshot["movements"][number]["type"],
  reference: string,
  reason: string,
) {
  if (from) {
    const stock = balance(productId, from);
    check(stock.quantity >= quantity, "Cantidad superior al inventario disponible.");
    stock.quantity -= quantity;
  }
  if (to) balance(productId, to).quantity += quantity;
  businessDb().movements.unshift({
    id: uid("mv"),
    productId,
    quantity,
    from,
    to,
    type,
    reference,
    reason,
    actor: actor(),
    createdAt: now(),
  });
}
function saleAccess(locationId: LocationId) {
  allow("admin", "vendedor", "ruta");
  const role = mockServices.auth.getSession()?.user.role;
  check(
    role === "admin" ||
      (role === "vendedor" && locationId === "galeria") ||
      (role === "ruta" && locationId === "ruta-1"),
    "Esta caja no está asignada a tu cargo.",
  );
}
let saleLock: Promise<unknown> = Promise.resolve();
function createSale(input: SalesInput, paused: boolean): Promise<Sale> {
  const next = saleLock.then(() => commitSale(input, paused));
  saleLock = next.catch(() => undefined);
  return next;
}
async function commitSale(input: SalesInput, paused: boolean): Promise<Sale> {
  saleAccess(input.locationId);
  const d = businessDb();
  const customer = d.customers.find((c) => c.id === input.customerId);
  check(customer && !customer.blocked, "Selecciona un cliente activo.");
  check(input.items.length > 0, "Agrega productos a la venta.");
  if (input.draftId)
    check(
      d.sales.some((s) => s.id === input.draftId && s.status === "pausada"),
      "Esta venta ya fue cobrada.",
    );
  const totals = new Map<string, number>();
  const items = input.items.map((line) => {
    const p = d.products.find((p) => p.id === line.productId && p.active);
    check(p && positive(line.quantity), "Revisa producto y cantidad.");
    totals.set(p.id, (totals.get(p.id) ?? 0) + line.quantity);
    const price =
      customer.wholesale ||
      (p.control !== "unidad" && line.quantity >= setting("wholesale-min", 5000))
        ? p.wholesalePrice
        : p.retailPrice;
    return {
      productId: p.id,
      name: p.name,
      quantity: line.quantity,
      control: p.control,
      price,
      total: itemTotal(p, line.quantity, price),
      note: line.note,
    };
  });
  const total = items.reduce((sum, line) => sum + line.total, 0);
  if (!paused) {
    for (const [id, qty] of totals)
      check(
        balance(id, input.locationId).quantity >= qty,
        "No puedes vender más de lo disponible, incluso sin conexión.",
      );
    check(validatePayments(input.payments, total), "La suma de los pagos debe ser igual al total.");
    const credit = input.payments
      .filter((p) => p.method === "fiado")
      .reduce((s, p) => s + p.amount, 0);
    check(
      !credit ||
        (customer.creditAllowed &&
          !customer.blocked &&
          customer.balance + credit <= customer.creditLimit),
      "Este cliente no tiene cupo de crédito suficiente.",
    );
  }
  check(
    Number.isInteger(input.baskets) && input.baskets >= 0,
    "Las canastillas deben ser un número entero positivo.",
  );
  const id = input.draftId ?? uid("sale");
  const next = Math.max(setting("receipt-start", 1) - 1, ...d.sales.filter(s => s.locationId === input.locationId).map(s => Number(s.number.split("-").at(-1)) || 0)) + 1;
  const draft = d.sales.find(s => s.id === input.draftId);
  const sale: Sale = {
    id,
    number: draft?.number ?? `#${input.locationId === "galeria" ? "GAL" : input.locationId === "ruta-1" ? "RUT" : "AHU"}-${next}`,
    locationId: input.locationId,
    customerId: customer.id,
    items,
    payments: paused ? [] : input.payments,
    total,
    status: paused ? "pausada" : "pagada",
    createdAt: now(),
    actor: actor(),
    note: input.note,
    baskets: input.baskets,
    requiresDian:
      input.requiresDian ||
      items.some((i) => d.products.find((p) => p.id === i.productId)?.requiresDian),
    dianStatus: "no_conectada",
    cufe: null,
    syncStatus: input.offline ? "pendiente" : "sincronizada",
  };
  // Reserve durable queue first; the sale and stock commit synchronously afterwards.
  if (!paused && input.offline)
    await putQueue({
      id: `op-${id}`,
      saleId: id,
      localDate: now(),
      status: "pendiente",
      payload: { saleId: id, locationId: input.locationId, total },
    });
  if (!paused) {
    for (const [pid, qty] of totals)
      move(pid, qty, input.locationId, null, "venta", id, "Venta de demostración");
    customer.balance += input.payments
      .filter((p) => p.method === "fiado")
      .reduce((s, p) => s + p.amount, 0);
    customer.baskets += input.baskets;
  }
  const previous = d.sales.findIndex((s) => s.id === id);
  if (previous >= 0) d.sales.splice(previous, 1);
  d.sales.unshift(sale);
  audit(
    "Ventas",
    paused ? "Venta suspendida" : "Venta registrada",
    id,
    input.note,
    "",
    String(total),
  );
  commit();
  return structuredClone(sale);
}

export const businessServices: BusinessServices = {
  reminders: reminderService,
  business: {
    async snapshot() {
      allow("admin", "contador", "recepcion", "vendedor", "ruta", "planta", "superadmin");
      await delay(80);
      const out = structuredClone(businessDb());
      const role = mockServices.auth.getSession()?.user.role;
      if (role !== "admin") out.settings = out.settings.filter((s) => s.id !== "surplus");
      if (role === "superadmin") {
        const empty = structuredClone(out);
        for (const key of Object.keys(empty) as (keyof BusinessSnapshot)[])
          if (!["integrations", "audit", "hardware", "imports"].includes(key))
            Object.assign(empty, { [key]: [] });
        empty.audit = empty.audit.filter((a) => a.technical);
        return empty;
      }
      out.integrations = [];
      out.audit = out.audit.filter((a) => !a.technical);
      if (role === "ruta") {
        out.sales = out.sales.filter((s) => s.locationId === "ruta-1");
        out.balances = out.balances.filter((b) => b.locationId === "ruta-1");
        out.closings = [];
        out.lots = [];
        out.recipes = [];
        out.seasonings = [];
        out.attendance = [];
        out.employees = [];
        out.settlements = out.settlements.map(s => ({ ...s, employeeSurplus: 0 }));
        out.purchases = [];
        out.audit = out.audit.filter((a) => ["Rutas", "Ventas"].includes(a.module));
      }
      if (role === "vendedor") {
        out.sales = out.sales.filter((s) => s.locationId === "galeria");
        out.balances = out.balances.filter((b) => b.locationId === "galeria");
        out.lots = [];
        out.recipes = [];
        out.seasonings = [];
        out.attendance = [];
        out.employees = [];
        out.settlements = [];
      }
      return out;
    },
  },
  users: {
    async create(input) {
      allow("admin");
      check(
        input.name.trim() &&
          input.username.trim() &&
          input.password.length >= 6 &&
          input.role !== "superadmin" &&
          input.role !== "inquilino",
        "Completa nombre, usuario y una clave de 6 caracteres.",
      );
      const key = input.username.trim().toLowerCase();
      check(!db().credentials[key], "Ese usuario ya existe.");
      const id = uid("employee");
      db().credentials[key] = {
        role: input.role,
        password: input.password,
        refId: id,
        name: input.name,
      };
      businessDb().employees.push({ name: input.name, role: input.role, hourlyRate: input.hourlyRate, id, username: key, active: true });
      save();
      audit("Usuarios", "Empleado creado", id);
      commit();
    },
    async setActive(id, active) {
      allow("admin");
      const row = businessDb().employees.find((e) => e.id === id);
      check(row && row.role !== "admin", "No puedes desactivar la administración.");
      row.active = active;
      const credential = db().credentials[row.username];
      if (credential) credential.active = active;
      save();
      audit("Usuarios", active ? "Activado" : "Desactivado", id);
      commit();
    },
  },
  products: {
    async save(input) {
      allow("admin");
      check(
        input.name.trim() &&
          input.retailPrice >= 0 &&
          input.wholesalePrice >= 0 &&
          Number.isInteger(input.retailPrice) &&
          Number.isInteger(input.wholesalePrice) &&
          input.thawTolerancePercent >= 0 &&
          input.thawTolerancePercent <= 100 &&
          input.shrinkagePercent >= 0 &&
          input.shrinkagePercent <= 100,
        "Revisa los precios enteros y porcentajes (0–100).",
      );
      const existing = businessDb().products.find((p) => p.id === input.id);
      const before = existing ? JSON.stringify(existing) : "";
      if (existing) Object.assign(existing, input);
      else businessDb().products.push({ ...input, id: uid("prod") });
      audit(
        "Productos",
        "Producto guardado",
        input.id,
        "Edición de producto",
        before,
        JSON.stringify(input),
      );
      commit();
    },
    async deactivate(id, reason) {
      allow("admin");
      check(reason.trim(), "Escribe el motivo.");
      const p = businessDb().products.find((p) => p.id === id);
      check(p, "Producto no encontrado.");
      p.active = !p.active;
      audit("Productos", p.active ? "Activado" : "Desactivado", id, reason);
      commit();
    },
  },
  customers: {
    async save(input) {
      allow("admin", "vendedor", "ruta");
      check(
        input.name.trim() && Number.isInteger(input.creditLimit) && input.creditLimit >= 0,
        "Revisa nombre y cupo.",
      );
      const existing = businessDb().customers.find((c) => c.id === input.id);
      if (existing)
        Object.assign(existing, { ...input, balance: existing.balance, baskets: existing.baskets });
      else businessDb().customers.push({ ...input, id: uid("c"), balance: 0, baskets: 0 });
      audit("Clientes", "Cliente guardado", input.id);
      commit();
    },
    async pay(id, payments, reason) {
      allow("admin", "vendedor", "ruta", "contador");
      const c = businessDb().customers.find((c) => c.id === id);
      const total = payments.reduce((s, p) => s + p.amount, 0);
      check(
        c &&
          positive(total) &&
          total <= c.balance &&
          validatePayments(payments, total) &&
          payments.every((p) => p.method !== "fiado"),
        "El abono debe ser positivo y no superar la deuda.",
      );
      const before = c.balance;
      c.balance -= total;
      businessDb().customerMovements.unshift({
        id: uid("ab"),
        customerId: id,
        type: "abono",
        amount: total,
        quantity: 0,
        method: payments[0]?.method ?? "efectivo",
        reason,
        createdAt: now(),
        actor: actor(),
      });
      audit("Clientes", "Abono recibido", id, reason, String(before), String(c.balance));
      commit();
    },
    async baskets(id, quantity, reason) {
      allow("admin", "vendedor", "ruta");
      const c = businessDb().customers.find((c) => c.id === id);
      check(
        c &&
          Number.isInteger(quantity) &&
          quantity !== 0 &&
          c.baskets + quantity >= 0 &&
          reason.trim(),
        "Revisa canastillas y motivo.",
      );
      c.baskets += quantity;
      businessDb().customerMovements.unshift({
        id: uid("basket"),
        customerId: id,
        type: "canastillas",
        amount: 0,
        quantity,
        method: "efectivo",
        reason,
        createdAt: now(),
        actor: actor(),
      });
      audit("Clientes", "Movimiento de canastillas", id, reason, "", String(quantity));
      commit();
    },
    async block(id, blocked, reason) {
      allow("admin");
      check(reason.trim(), "El bloqueo requiere motivo.");
      const c = businessDb().customers.find((c) => c.id === id);
      check(c, "Cliente no encontrado.");
      c.blocked = blocked;
      audit("Clientes", blocked ? "Cliente bloqueado" : "Cliente habilitado", id, reason);
      commit();
    },
  },
  sales: {
    create: (input) => createSale(input, false),
    pause: (input) => createSale(input, true),
    async list(locationId) {
      allow("admin", "contador", "vendedor", "ruta");
      const snap = await businessServices.business.snapshot();
      return snap.sales.filter((s) => !locationId || s.locationId === locationId);
    },
    async cancel(id, reason) {
      allow("admin", "vendedor", "ruta");
      check(reason.trim(), "La anulación requiere motivo.");
      const d = businessDb();
      const s = d.sales.find((s) => s.id === id);
      check(s && s.status !== "anulada", "Venta no disponible.");
      saleAccess(s.locationId);
      if (s.status === "pagada") {
        s.items.forEach((i) =>
          move(i.productId, i.quantity, null, s.locationId, "devolucion", id, reason),
        );
        const c = d.customers.find((c) => c.id === s.customerId);
        if (c) {
          c.balance = Math.max(
            0,
            c.balance -
              s.payments.filter((p) => p.method === "fiado").reduce((sum, p) => sum + p.amount, 0),
          );
          c.baskets = Math.max(0, c.baskets - s.baskets);
        }
      }
      s.status = "anulada";
      audit("Ventas", "Venta anulada", id, reason, String(s.total), "0");
      commit();
    },
  },
  cashRegisters: {
    async close(locationId, counted) {
      saleAccess(locationId);
      check(Number.isInteger(counted) && counted >= 0, "Revisa el efectivo contado.");
      const d = businessDb();
      const last = d.closings.find((c) => c.locationId === locationId)?.createdAt ?? "";
      const expected = d.sales
        .filter((s) => s.locationId === locationId && s.status === "pagada" && s.createdAt > last)
        .flatMap((s) => s.payments)
        .filter((p) => p.method === "efectivo")
        .reduce((s, p) => s + p.amount, 0);
      const closing = {
        id: uid("close"),
        locationId,
        expected,
        counted,
        difference: counted - expected,
        actor: actor(),
        createdAt: now(),
      };
      d.closings.unshift(closing);
      audit(
        "Caja",
        "Cierre de caja",
        closing.id,
        "Conteo físico",
        String(expected),
        String(counted),
      );
      commit();
    },
  },
  inventory: {
    async receive(input) {
      allow("admin", "recepcion", "planta");
      const d = businessDb();
      const p = d.products.find((p) => p.id === input.productId);
      check(
        p && d.suppliers.some((s) => s.id === input.supplierId),
        "Selecciona producto y proveedor.",
      );
      const grams = netWeight(input.grossGrams, input.tareGrams, input.boxes);
      check(
        p.control === "unidad" ? positive(input.units) : positive(grams),
        "El peso neto o las unidades deben ser positivos.",
      );
      check(
        input.cost >= 0 && Number.isInteger(input.cost) && input.expiresAt >= todayBogota(),
        "Revisa costo y vencimiento.",
      );
      const order = input.purchaseId
        ? d.purchases.find((o) => o.id === input.purchaseId)
        : undefined;
      if (input.purchaseId)
        check(
          order &&
            order.productId === p.id &&
            order.supplierId === input.supplierId &&
            order.received + (p.control === "unidad" ? input.units : grams) <= order.quantity,
          "La recepción supera o no coincide con la orden.",
        );
      const lot = {
        id: uid("lot"),
        productId: p.id,
        supplierId: input.supplierId,
        locationId: "ahumadero" as const,
        stage: input.destination === "congelado" ? ("congelado" as const) : ("crudo" as const),
        initialGrams: grams,
        grams,
        units: input.units,
        cost: input.cost,
        expiresAt: input.expiresAt,
        createdAt: now(),
        history: [
          {
            stage: input.destination === "congelado" ? ("congelado" as const) : ("crudo" as const),
            grams,
            date: now(),
            actor: actor(),
          },
        ],
      };
      d.lots.unshift(lot);
      if (input.destination === "congelado")
        move(
          p.id,
          p.control === "unidad" ? input.units : grams,
          null,
          "ahumadero",
          "recepcion",
          lot.id,
          "Recepción a congelado",
        );
      else
        d.movements.unshift({
          id: uid("mv"),
          productId: p.id,
          quantity: grams,
          from: null,
          to: "ahumadero",
          type: "recepcion",
          reference: lot.id,
          actor: actor(),
          createdAt: now(),
          reason: "Recepción a proceso: no disponible para venta",
        });
      if (order) {
        order.received += p.control === "unidad" ? input.units : grams;
        order.status = order.received === order.quantity ? "recibida" : "parcial";
      }
      audit("Inventario", "Recepción", lot.id);
      commit();
      return lot;
    },
    async adjust(productId, locationId, quantity, reason) {
      allow("admin");
      check(
        Number.isInteger(quantity) && quantity !== 0 && reason.trim(),
        "Ajuste entero y motivo obligatorios.",
      );
      const b = balance(productId, locationId);
      check(b.quantity + quantity >= 0, "El inventario no puede quedar negativo.");
      const before = b.quantity;
      move(
        productId,
        Math.abs(quantity),
        quantity < 0 ? locationId : null,
        quantity > 0 ? locationId : null,
        "ajuste",
        uid("adj"),
        reason,
      );
      audit("Inventario", "Ajuste físico", productId, reason, String(before), String(b.quantity));
      commit();
    },
    async transfer(productId, quantity, from, to, reason) {
      allow("admin", "recepcion");
      check(
        positive(quantity) && from !== to && reason.trim(),
        "Revisa cantidad, ubicaciones y motivo.",
      );
      move(productId, quantity, from, to, "traslado", uid("tr"), reason);
      audit("Inventario", "Traslado", productId, reason);
      commit();
    },
  },
  production: {
    async advance(lotId, stage, grams, reason) {
      allow("admin", "planta");
      const d = businessDb();
      const lot = d.lots.find((l) => l.id === lotId);
      check(lot && lot.stage !== "congelado" && positive(grams), "Lote o peso no disponible.");
      const stages: ProductionStage[] = ["crudo", "marinado", "ahumado", "congelado"];
      const current = stages.indexOf(lot.stage);
      const next = stages.indexOf(stage);
      check(
        next > current &&
          (next === current + 1 ||
            (mockServices.auth.getSession()?.user.role === "admin" && reason.trim())),
        "Sigue la siguiente etapa; omitir requiere administrador y motivo.",
      );
      const before = lot.grams;
      lot.stage = stage;
      lot.grams = grams;
      lot.history.push({ stage, grams, date: now(), actor: actor() });
      const p = d.products.find((p) => p.id === lot.productId);
      const observed = shrinkage(lot.initialGrams, grams);
      audit(
        "Producción",
        observed > (p?.shrinkagePercent ?? 0) ? "Merma requiere revisión" : "Etapa completada",
        lot.id,
        reason,
        String(before),
        String(grams),
      );
      d.movements.unshift({
        id: uid("mv"),
        productId: lot.productId,
        quantity: grams,
        from: "ahumadero",
        to: "ahumadero",
        type: "produccion",
        reference: lotId,
        actor: actor(),
        createdAt: now(),
        reason: `${stage}: ${before} → ${grams} g`,
      });
      if (stage === "congelado") balance(lot.productId, "ahumadero").quantity += grams;
      commit();
    },
  },
  recipes: {
    async save(productId, lines) {
      allow("admin");
      check(
        lines.length &&
          lines.every(
            (l) =>
              positive(l.gramsPerKg) && businessDb().seasonings.some((s) => s.id === l.seasoningId),
          ),
        "Revisa ingredientes y cantidades.",
      );
      const existing = businessDb().recipes.find((r) => r.productId === productId);
      if (existing) existing.lines = lines;
      else businessDb().recipes.push({ id: uid("recipe"), productId, lines });
      audit("Recetas", "Receta actualizada", productId);
      commit();
    },
    async reveal(id) {
      allow("admin");
      check(
        businessDb().seasonings.some((s) => s.id === id),
        "Condimento no encontrado.",
      );
      audit("Recetas", "Nombre privado consultado", id, "Permiso explícito de administración");
      commit();
      return (
        (
          {
            cond1: "Condimento privado ficticio A",
            cond2: "Condimento privado ficticio B",
            cond3: "Condimento privado ficticio C",
          } as Record<string, string>
        )[id] ?? "Nombre pendiente de configurar"
      );
    },
    async consume(lotId) {
      allow("admin", "planta");
      const d = businessDb();
      const lot = d.lots.find((l) => l.id === lotId);
      check(
        lot && !d.audit.some((a) => a.action === "Condimentos consumidos" && a.entityId === lotId),
        "El consumo ya fue confirmado o el lote no existe.",
      );
      const recipe = d.recipes.find((r) => r.productId === lot.productId);
      check(recipe, "Configura una receta para este producto.");
      const required = recipe.lines.map((l) => ({
        row: d.seasonings.find((s) => s.id === l.seasoningId),
        grams: Math.ceil((l.gramsPerKg * lot.grams) / 1000),
      }));
      check(
        required.every((r) => r.row && r.row.stockGrams >= r.grams),
        "Condimentos insuficientes.",
      );
      required.forEach((r) => {
        if (r.row) r.row.stockGrams -= r.grams;
      });
      audit("Recetas", "Condimentos consumidos", lotId);
      commit();
    },
  },
  suppliers: {
    async save(input) {
      allow("admin");
      check(input.name.trim(), "Escribe el proveedor.");
      const s = businessDb().suppliers.find((s) => s.id === input.id);
      if (s) Object.assign(s, input);
      else businessDb().suppliers.push({ ...input, id: uid("sup") });
      audit("Compras", "Proveedor guardado", input.id);
      commit();
    },
  },
  purchases: {
    async create(supplierId, productId, quantity) {
      allow("admin");
      check(
        positive(quantity) &&
          businessDb().suppliers.some((s) => s.id === supplierId) &&
          businessDb().products.some((p) => p.id === productId),
        "Revisa proveedor, producto y cantidad.",
      );
      const order = {
        id: uid("oc"),
        supplierId,
        productId,
        quantity,
        received: 0,
        status: "borrador" as const,
        createdAt: now(),
      };
      businessDb().purchases.unshift(order);
      audit("Compras", "Orden creada", order.id);
      commit();
      return order;
    },
    async send(id) {
      allow("admin");
      const order = businessDb().purchases.find((o) => o.id === id);
      check(order && order.status === "borrador", "Orden no disponible.");
      order.status = "enviada";
      audit("Compras", "Orden marcada enviada", id);
      commit();
    },
    async suggestions() {
      allow("admin");
      const d = businessDb();
      const days = setting("purchase-days", 30);
      const cutoff = Date.now() - days * 86400000;
      return d.products
        .map((p) => {
          const consumed = d.sales
            .filter((s) => s.status === "pagada" && new Date(s.createdAt).getTime() >= cutoff)
            .flatMap((s) => s.items)
            .filter((i) => i.productId === p.id)
            .reduce((s, i) => s + i.quantity, 0);
          const average = consumed / Math.max(1, days);
          const stock = d.balances
            .filter((b) => b.productId === p.id && b.locationId !== "ruta-1")
            .reduce((s, b) => s + b.quantity, 0);
          return {
            productId: p.id,
            quantity: Math.max(
              0,
              Math.ceil(
                (p.minimum + average * days) / Math.max(0.01, 1 - p.shrinkagePercent / 100) - stock,
              ),
            ),
            average,
            supplierId: d.suppliers.find((s) => s.productIds.includes(p.id))?.id ?? "",
          };
        })
        .filter((s) => s.quantity > 0);
    },
  },
  routes: {
    async dispatch(input) {
      allow("admin");
      check(
        input.lines.length &&
          input.signed &&
          !businessDb().dispatches.some((d) => d.status === "en_ruta"),
        "Confirma la aceptación y cierra la ruta activa antes de despachar.",
      );
      check(new Set(input.lines.map(l => l.productId)).size === input.lines.length, "Cada producto debe aparecer una sola vez en la carga.");
      for (const line of input.lines)
        check(
          businessDb().products.some(p => p.id === line.productId && p.active) && positive(line.loaded) && balance(line.productId, "ahumadero").quantity >= line.loaded && (line.grossGrams === undefined || line.loaded === netWeight(line.grossGrams, line.tareGrams ?? 0, line.boxes ?? 0)),
          "Carga superior al inventario.",
        );
      const dispatch = { ...input, dispatchedAt: now(), id: uid("dispatch"), status: "en_ruta" as const };
      input.lines.forEach((l) =>
        move(
          l.productId,
          l.loaded,
          "ahumadero",
          "ruta-1",
          "despacho",
          dispatch.id,
          "Carga verificada",
        ),
      );
      businessDb().dispatches.unshift(dispatch);
      audit("Rutas", "Despacho confirmado", dispatch.id);
      commit();
    },
    async settle(dispatchId, returns, delivered, reason) {
      allow("admin", "ruta");
      const d = businessDb();
      const dispatch = d.dispatches.find((x) => x.id === dispatchId);
      check(
        dispatch && dispatch.status === "en_ruta" && Number.isInteger(delivered) && delivered >= 0,
        "Revisa ruta y dinero entregado.",
      );
      check(returns.length === dispatch.lines.length && new Set(returns.map(r => r.productId)).size === returns.length && returns.every(r => dispatch.lines.some(l => l.productId === r.productId)), "Devuelve cada producto de la carga una sola vez, sin productos ajenos.");
      const { inventory, expected, routeSales } = reconcileRoute(dispatch, d.sales, d.products, returns);
      check(
        !routeSales.some((s) => s.syncStatus === "pendiente"),
        "Sincroniza las ventas pendientes antes de liquidar.",
      );
      check(inventory.every(row => Number.isInteger(row.returned) && row.returned >= 0 && row.returned <= row.loaded), "Revisa devoluciones físicas.");
      const difference = delivered - expected;
      check(
        (difference === 0 && inventory.every((i) => i.state !== "Requiere revisión")) ||
          reason.trim(),
        "Las diferencias requieren motivo y revisión; no generan cobro automático.",
      );
      for (const row of inventory) {
        const remaining = balance(row.productId, "ruta-1").quantity;
        if (row.difference) {
          const adjustment = row.returned - remaining;
          balance(row.productId, "ruta-1").quantity = row.returned;
          d.movements.unshift({ id: uid("mv"), productId: row.productId, quantity: Math.abs(adjustment), from: adjustment < 0 ? "ruta-1" : null, to: adjustment > 0 ? "ruta-1" : null, type: "ajuste", reference: dispatchId, reason: `${row.state}: ${reason || "Pérdida dentro de tolerancia"}`, actor: actor(), createdAt: now() });
          audit("Rutas", row.state, dispatchId, reason, String(remaining), String(row.returned));
        }
        if (row.returned)
          move(
            row.productId,
            row.returned,
            "ruta-1",
            "ahumadero",
            "devolucion",
            dispatchId,
            reason || "Devolución física",
          );
      }
      const settlement = {
        id: uid("settlement"),
        dispatchId,
        expected,
        delivered,
        difference,
        inventory,
        employeeSurplus: Math.round((Math.max(0, difference) * setting("surplus", 20)) / 100),
        createdAt: now(),
      };
      d.settlements.unshift(settlement);
      dispatch.status = "cerrada";
      dispatch.lines.forEach((l) => {
        l.returned = returns.find((r) => r.productId === l.productId)?.quantity ?? 0;
      });
      audit(
        "Rutas",
        difference < 0 ? "Faltante requiere revisión" : "Liquidación confirmada",
        dispatchId,
        reason,
        String(expected),
        String(delivered),
      );
      commit();
    },
    async queue() {
      allow("admin", "ruta");
      return listQueue();
    },
    async synchronize() {
      allow("admin", "ruta");
      check(
        typeof navigator === "undefined" || navigator.onLine,
        "Sin conexión: conserva la cola local.",
      );
      for (const op of await listQueue()) {
        if (op.status === "sincronizada") continue;
        await putQueue({ ...op, status: "sincronizando" });
        await delay(100);
        const sale = businessDb().sales.find((s) => s.id === op.saleId);
        if (sale) {
          sale.syncStatus = "sincronizada";
          await putQueue({ ...op, status: "sincronizada" });
        } else await putQueue({ ...op, status: "conflicto" });
      }
      audit("Rutas", "Sincronización simulada", "queue");
      commit();
    },
  },
  payroll: {
    async import(records, name, errors) {
      allow("admin", "contador");
      check(
        records.length &&
          records.every(
            (r) =>
              businessDb().employees.some((e) => e.id === r.employeeId) &&
              isIsoDate(r.date) &&
              /^([01]\d|2[0-3]):[0-5]\d$/.test(r.entry) &&
              /^([01]\d|2[0-3]):[0-5]\d$/.test(r.exit) &&
              r.hours > 0 && r.hours < 24 &&
              Number.isFinite(r.overtimeHours) && r.overtimeHours >= 0 && r.overtimeHours <= r.hours,
          ),
        "Revisa empleados y horarios.",
      );
      for (const r of records)
        if (
          !businessDb().attendance.some((a) => a.employeeId === r.employeeId && a.date === r.date)
        )
          businessDb().attendance.push({ ...r, id: uid("att") });
      businessDb().imports.unshift({
        id: uid("import"),
        name,
        target: "Asistencia",
        valid: records.length,
        errors,
        status: errors ? "Importado con errores" : "Importado",
        createdAt: now(),
      });
      audit("Nómina", "Asistencia importada", name);
      commit();
    },
    async authorize(employeeId, period, hours, reason) {
      allow("admin");
      check(
        Number.isFinite(hours) && hours > 0 && /^\d{4}-(0[1-9]|1[0-2])$/.test(period) && reason.trim() && businessDb().employees.some((e) => e.id === employeeId),
        "Revisa empleado, horas y motivo.",
      );
      businessDb().overtime.push({ id: uid("extra"), employeeId, period, hours, reason });
      audit("Nómina", "Horas extras autorizadas", employeeId, reason);
      commit();
    },
  },
  businessSettings: {
    async update(id, value, reason, effectiveFrom) {
      allow("admin");
      const s = businessDb().settings.find((s) => s.id === id);
      check(s && reason.trim() && isIsoDate(effectiveFrom), "Configuración, fecha válida y motivo obligatorios.");
      if (
        s.unit === "COP" ||
        s.unit === "g" ||
        s.unit === "días" ||
        s.unit === "%" ||
        s.unit === "horas"
      )
        check(
          value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0),
          "Usa un valor numérico no negativo.",
        );
      if (["COP", "g", "días"].includes(s.unit)) check(value === "" || Number.isInteger(Number(value)), "Pesos, gramos y días deben ser enteros.");
      if (s.unit === "%") check(value === "" || Number(value) <= 100, "El porcentaje no puede superar 100.");
      if (s.unit === "hora") check(value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value), "Escribe la hora en formato HH:MM.");
      businessDb().versions.unshift({
        id: uid("v"),
        settingId: id,
        before: s.value,
        after: value,
        reason,
        effectiveFrom,
        actor: actor(),
      });
      audit("Configuración", "Parámetro actualizado", id, reason, s.value, value);
      if (effectiveFrom <= todayBogota()) {
        s.value = value;
        s.status = value ? "configurado" : "pendiente";
        s.updatedAt = now();
        s.updatedBy = actor();
        if (id.startsWith("location-")) {
          const loc = businessDb().locations.find((l) => `location-${l.id}` === id);
          if (loc) loc.name = value;
        }
      }
      commit();
    },
    async expense(propertyId, amount, note, support) {
      allow("admin", "contador");
      check(
        positive(amount) && note.trim() && db().properties.some((p) => p.id === propertyId),
        "Revisa local, monto y descripción.",
      );
      businessDb().propertyExpenses.unshift({
        id: uid("expense"),
        propertyId,
        amount,
        note,
        support,
        createdAt: now(),
      });
      audit("Arriendos", "Gasto registrado", propertyId, note, "", String(amount));
      commit();
    },
  },
  hardware: {
    async save(device) {
      allow("admin", "superadmin");
      check(device.name.trim(), "Escribe el dispositivo.");
      const existing = businessDb().hardware.find((h) => h.id === device.id);
      if (existing) Object.assign(existing, device);
      audit("Hardware", "Configuración guardada", device.id, "", "", "", true);
      commit();
    },
    async test(id) {
      allow("admin", "superadmin");
      const device = businessDb().hardware.find((h) => h.id === id);
      check(
        device && device.model && device.protocol,
        "Configura modelo y protocolo; no se asume compatibilidad.",
      );
      device.status = "Prueba simulada · adaptador pendiente";
      audit("Hardware", "Prueba simulada", id, "", "", "", true);
      commit();
    },
  },
  integrations: {
    async list() {
      allow("superadmin");
      return structuredClone(businessDb().integrations);
    },
    async save(id, environment, replace) {
      allow("superadmin");
      const row = businessDb().integrations.find((i) => i.id === id);
      check(row, "Integración no encontrada.");
      row.environment = environment;
      if (replace) {
        row.configured = true;
        row.maskedSuffix = "DEMO";
      }
      row.status = row.configured ? "configurada" : "no_configurada";
      row.lastUpdatedAt = now();
      audit(
        "Integraciones",
        "Configuración ficticia guardada",
        id,
        environment,
        "",
        row.maskedSuffix,
        true,
      );
      commit();
    },
    async test(id) {
      allow("superadmin");
      const row = businessDb().integrations.find((i) => i.id === id);
      check(row?.configured, "Agrega una credencial ficticia para la prueba.");
      row.status = "prueba_simulada";
      row.lastTestAt = now();
      audit("Integraciones", "Prueba simulada sin conexión real", id, "", "", "", true);
      commit();
    },
    async disable(id, reason) {
      allow("superadmin");
      check(reason.trim(), "Escribe el motivo.");
      const row = businessDb().integrations.find((i) => i.id === id);
      check(row, "Integración no encontrada.");
      row.status = "desactivada";
      audit("Integraciones", "Desactivada", id, reason, "", "", true);
      commit();
    },
  },
  audit: {
    async list(technical = false) {
      allow(...(technical ? (["superadmin"] as Role[]) : (["admin", "contador"] as Role[])));
      return structuredClone(businessDb().audit.filter((a) => a.technical === technical));
    },
  },
  imports: {
    async record(name, target, valid, errors, rows = []) {
      allow("admin");
      check(valid > 0, "No hay filas válidas.");
      if (target === "Clientes")
        for (const row of rows)
          await businessServices.customers.save({
            id: "",
            name: row["name"] ?? "",
            document: row["document"] ?? "",
            phone: row["phone"] ?? "",
            wholesale: false,
            creditAllowed: false,
            creditLimit: 0,
            blocked: false,
            balance: 0,
            baskets: 0,
          });
      if (target === "Productos")
        for (const row of rows)
          await businessServices.products.save({
            id: "",
            name: row["name"] ?? "",
            category: "Importados",
            barcode: row["barcode"] ?? "",
            active: true,
            control: "peso",
            origin: "reventa",
            retailPrice: Number(row["retailPrice"]),
            wholesalePrice: Number(row["wholesalePrice"] ?? row["retailPrice"]),
            minimum: 0,
            priceGroup: "",
            shrinkagePercent: 0,
            thawTolerancePercent: 0,
            requiresDian: false,
          });
      businessDb().imports.unshift({
        id: uid("im"),
        name,
        target,
        valid,
        errors,
        status: errors ? "Importado con errores" : "Importado",
        createdAt: now(),
      });
      audit("Migración", "Importación confirmada", name);
      commit();
    },
  },
};
