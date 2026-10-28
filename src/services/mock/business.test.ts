import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Services } from "../contracts";
import type { SalesInput } from "../operation-contracts";
let services: Services;
beforeEach(async () => {
  vi.resetModules();
  window.localStorage.clear();
  services = (await import("../index")).services;
  await services.auth.login("ahumadero", "admin", "admin123");
});
const input = (overrides: Partial<SalesInput> = {}): SalesInput => ({
  locationId: "galeria",
  customerId: "c3",
  items: [{ productId: "prod-19", quantity: 1000, note: "" }],
  payments: [{ method: "efectivo", amount: 35000 }],
  baskets: 0,
  note: "Prueba",
  requiresDian: false,
  offline: false,
  ...overrides,
});

describe("recorridos operativos de demostración", () => {
  it("venta por peso con pago mixto conserva total y tirilla", async () => {
    const s = await services.sales.create(
      input({
        payments: [
          { method: "efectivo", amount: 20000 },
          { method: "nequi", amount: 15000 },
        ],
      }),
    );
    expect(s.total).toBe(35000);
    expect(s.items[0]?.quantity).toBe(1000);
    expect((await services.sales.list()).find((x) => x.id === s.id)?.payments).toHaveLength(2);
  });
  it("fiado y abono actualizan saldo sin sobreabonar", async () => {
    const s = await services.sales.create(
      input({ customerId: "c2", payments: [{ method: "fiado", amount: 31500 }] }),
    );
    expect(s.total).toBe(31500);
    await services.customers.pay(
      "c2",
      [
        { method: "efectivo", amount: 10000 },
        { method: "nequi", amount: 5000 },
      ],
      "Abono",
    );
    expect((await services.business.snapshot()).customers.find((c) => c.id === "c2")?.balance).toBe(
      16500,
    );
    await expect(
      services.customers.pay("c2", [{ method: "efectivo", amount: 16501 }], "Error"),
    ).rejects.toThrow();
  });
  it("suspender no consume stock; retomar cobra una sola vez", async () => {
    const before = (await services.business.snapshot()).balances.find(
      (b) => b.productId === "prod-19" && b.locationId === "galeria",
    )?.quantity;
    const draft = await services.sales.pause(input());
    expect(
      (await services.business.snapshot()).balances.find(
        (b) => b.productId === "prod-19" && b.locationId === "galeria",
      )?.quantity,
    ).toBe(before);
    const sale = await services.sales.create(input({ draftId: draft.id }));
    expect(sale.number).toBe(draft.number);
    await expect(services.sales.create(input({ draftId: draft.id }))).rejects.toThrow();
  });
  it("cierre guarda diferencia de efectivo", async () => {
    await services.sales.create(input());
    await services.cashRegisters.close("galeria", 34000);
    expect((await services.business.snapshot()).closings[0]?.difference).toBe(-1000);
  });
  it("recepción descuenta tara y producción registra merma", async () => {
    const lot = await services.inventory.receive({
      productId: "prod-20",
      supplierId: "sup1",
      grossGrams: 14000,
      tareGrams: 2000,
      boxes: 2,
      units: 0,
      cost: 120000,
      expiresAt: "2099-01-01",
      destination: "proceso",
    });
    expect(lot.grams).toBe(10000);
    await services.production.advance(lot.id, "marinado", 10000, "");
    await services.production.advance(lot.id, "ahumado", 6000, "Revisar");
    expect(
      (await services.audit.list()).some(
        (a) => a.entityId === lot.id && a.action === "Merma requiere revisión",
      ),
    ).toBe(true);
  });
  it("venta offline reduce saldo y sincroniza sin duplicar", async () => {
    const s = await services.sales.create(input({ locationId: "ruta-1", offline: true }));
    expect(s.syncStatus).toBe("pendiente");
    expect(
      (await services.business.snapshot()).balances.find(
        (b) => b.productId === "prod-19" && b.locationId === "ruta-1",
      )?.quantity,
    ).toBe(6000);
    await services.routes.synchronize();
    await services.routes.synchronize();
    expect((await services.sales.list("ruta-1")).filter((x) => x.id === s.id)).toHaveLength(1);
  });
  it("ventas offline simultáneas no pueden sobrepasar carga", async () => {
    const results = await Promise.allSettled([
      services.sales.create(
        input({
          locationId: "ruta-1",
          items: [{ productId: "prod-19", quantity: 4000, note: "" }],
          payments: [{ method: "efectivo", amount: 140000 }],
          offline: true,
        }),
      ),
      services.sales.create(
        input({
          locationId: "ruta-1",
          items: [{ productId: "prod-19", quantity: 4000, note: "" }],
          payments: [{ method: "efectivo", amount: 140000 }],
          offline: true,
        }),
      ),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
  it("devolución física y faltante se conservan en auditoría", async () => {
    await services.routes.settle(
      "dispatch-demo",
      [
        { productId: "prod-19", quantity: 7000 },
        { productId: "prod-21", quantity: 10000 },
      ],
      59000,
      "Faltante 1000: responsable de ruta, pendiente revisión",
    );
    const d = await services.business.snapshot();
    expect(d.settlements[0]?.difference).toBe(-1000);
    expect(d.settlements[0]?.inventory[0]?.difference).toBe(0);
    expect(d.audit.some((a) => a.action === "Faltante requiere revisión")).toBe(true);
  });
  it("orden admite recepción parcial", async () => {
    const order = await services.purchases.create("sup1", "prod-20", 20000);
    await services.purchases.send(order.id);
    await services.inventory.receive({
      productId: "prod-20",
      supplierId: "sup1",
      grossGrams: 12000,
      tareGrams: 2000,
      boxes: 1,
      units: 0,
      cost: 0,
      expiresAt: "2099-01-01",
      destination: "proceso",
      purchaseId: order.id,
    });
    expect(
      (await services.business.snapshot()).purchases.find((o) => o.id === order.id)?.status,
    ).toBe("parcial");
  });
  it("planta solo ve alias y no revela privados", async () => {
    await services.auth.login("ahumadero", "planta", "planta123");
    await expect(services.recipes.reveal("cond1")).rejects.toThrow();
    expect((await services.business.snapshot()).seasonings[0]?.alias).toBe("Mezcla verde A");
  });
  it("consumo de receta descuenta stock una sola vez", async () => {
    await services.recipes.consume("lot-demo-1");
    expect(
      (await services.business.snapshot()).seasonings.find((s) => s.id === "cond1")?.stockGrams,
    ).toBe(7700);
    await expect(services.recipes.consume("lot-demo-1")).rejects.toThrow();
  });
  it("contador no autoriza horas extras", async () => {
    await services.auth.login("ahumadero", "contador", "contador123");
    await expect(services.payroll.authorize("u-planta", "2026-10", 1, "Extra")).rejects.toThrow();
  });
  it("cambio de tolerancia propaga valor y auditoría", async () => {
    const p = (await services.business.snapshot()).products.find((p) => p.id === "prod-19");
    if (!p) throw new Error("Producto ausente");
    await services.products.save({ ...p, thawTolerancePercent: 3 });
    expect(
      (await services.business.snapshot()).products.find((row) => row.id === p.id)
        ?.thawTolerancePercent,
    ).toBe(3);
  });
  it("integraciones devuelven solo máscara y superadmin no ve ventas", async () => {
    await services.auth.login("ahumadero", "tecnico", "tecnico123");
    await services.integrations.save("wompi", "sandbox", true);
    await services.integrations.test("wompi");
    const integration = (await services.integrations.list())[0];
    expect(integration?.maskedSuffix).toBe("DEMO");
    expect(integration?.status).toBe("prueba_simulada");
    expect((await services.business.snapshot()).sales).toEqual([]);
    expect(JSON.stringify(integration)).not.toContain("secret");
  });
  it("inquilino no consulta a otro; Wompi suma 5000", async () => {
    await services.auth.login("inquilino", "maria", "maria123");
    await expect(services.tenants.getAccount("t2")).rejects.toThrow();
    const acc = await services.tenants.getAccount("t1");
    const period = acc.pending[0]?.period;
    if (!period) throw new Error("Mes ausente");
    const pay = await services.payments.startOnline({ tenantId: "t1", period, channel: "nequi" });
    expect(pay.surcharge).toBe(5000);
    expect(pay.total).toBe(1205000);
    await services.payments.resolveDemo(pay.id, "pagado");
    expect(
      (await services.payments.list({ tenantId: "t1" })).find((p) => p.id === pay.id)?.status,
    ).toBe("pagado");
  });
  it("empleado desactivado no puede ingresar", async () => {
    await services.users.setActive("u-ruta", false);
    await services.auth.logout();
    await expect(services.auth.login("ahumadero", "ruta", "ruta123")).rejects.toThrow();
  });
  it("liquidación rechaza productos ajenos y duplicados", async () => {
    await expect(
      services.routes.settle(
        "dispatch-demo",
        [
          { productId: "prod-19", quantity: 7000 },
          { productId: "extra", quantity: 0 },
        ],
        60000,
        "",
      ),
    ).rejects.toThrow();
    await expect(
      services.routes.settle(
        "dispatch-demo",
        [
          { productId: "prod-19", quantity: 7000 },
          { productId: "prod-19", quantity: 7000 },
        ],
        60000,
        "",
      ),
    ).rejects.toThrow();
  });
  it("pérdida normal queda auditada sin cobro de efectivo", async () => {
    await services.routes.settle(
      "dispatch-demo",
      [
        { productId: "prod-19", quantity: 6900 },
        { productId: "prod-21", quantity: 10000 },
      ],
      60000,
      "",
    );
    const snap = await services.business.snapshot();
    expect(snap.settlements[0]?.difference).toBe(0);
    expect(snap.settlements[0]?.inventory[0]?.state).toBe("Pérdida normal");
    expect(
      snap.movements.some(
        (m) => m.reference === "dispatch-demo" && m.type === "ajuste" && m.quantity === 100,
      ),
    ).toBe(true);
    expect(
      snap.balances.find((b) => b.productId === "prod-19" && b.locationId === "ruta-1")?.quantity,
    ).toBe(0);
  });
  it("despacho exige firma y cantidades netas verificadas", async () => {
    await services.routes.settle(
      "dispatch-demo",
      [
        { productId: "prod-19", quantity: 7000 },
        { productId: "prod-21", quantity: 10000 },
      ],
      60000,
      "",
    );
    const dispatch = {
      name: "Ruta",
      employee: "Empleado de ruta",
      vehicle: "Demo",
      date: "2026-10-23",
      signed: true,
      lines: [
        {
          productId: "prod-19",
          loaded: 10000,
          returned: 0,
          grossGrams: 14000,
          tareGrams: 2000,
          boxes: 2,
        },
      ],
    };
    await expect(services.routes.dispatch({ ...dispatch, signed: false })).rejects.toThrow();
    await expect(
      services.routes.dispatch({
        ...dispatch,
        lines: [{ ...dispatch.lines[0], productId: "prod-19", loaded: 12000, returned: 0 }],
      }),
    ).rejects.toThrow();
    await services.routes.dispatch(dispatch);
    expect((await services.business.snapshot()).dispatches[0]?.lines[0]?.loaded).toBe(10000);
  });
  it("ruta no recibe porcentaje ni participación interna", async () => {
    await services.routes.settle(
      "dispatch-demo",
      [
        { productId: "prod-19", quantity: 7000 },
        { productId: "prod-21", quantity: 10000 },
      ],
      61000,
      "Excedente revisado",
    );
    await services.auth.login("ahumadero", "ruta", "ruta123");
    const snap = await services.business.snapshot();
    expect(snap.settings.some((s) => s.id === "surplus")).toBe(false);
    expect(snap.settlements[0]?.employeeSurplus).toBe(0);
  });
  it("inquilino solo consulta locales disponibles; técnico no consulta arriendos", async () => {
    await services.auth.login("inquilino", "maria", "maria123");
    expect((await services.properties.list()).map((p) => p.id)).toEqual(["p3", "p4"]);
    await services.auth.login("ahumadero", "tecnico", "tecnico123");
    await expect(services.properties.list()).rejects.toThrow();
    await expect(services.tenants.list()).rejects.toThrow();
  });
  it("planta no omite etapas de producción", async () => {
    await services.auth.login("ahumadero", "planta", "planta123");
    await expect(
      services.production.advance("lot-demo-1", "congelado", 20000, "Salto"),
    ).rejects.toThrow();
  });
  it("cierre nuevo solo incluye movimientos posteriores al cierre anterior", async () => {
    await services.sales.create(input());
    await services.cashRegisters.close("galeria", 35000);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await services.sales.create(input());
    await services.cashRegisters.close("galeria", 35000);
    expect((await services.business.snapshot()).closings[0]?.expected).toBe(35000);
  });
  it("configuración propaga nombre y conserva versión", async () => {
    await services.businessSettings.update(
      "location-galeria",
      "Galería nueva",
      "Cambio solicitado",
      "2026-01-01",
    );
    const snap = await services.business.snapshot();
    expect(snap.locations.find((l) => l.id === "galeria")?.name).toBe("Galería nueva");
    expect(snap.versions[0]?.before).toBe("Galería");
    await expect(
      services.businessSettings.update("tare", "2.5", "Fracción", "2026-01-01"),
    ).rejects.toThrow();
  });
  it("recordatorios respetan configuración y conservan envío simulado", async () => {
    await expect(services.reminders.preview()).rejects.toThrow();
    await services.businessSettings.update("reminder-days", "3", "Prueba", "2026-01-01");
    await services.businessSettings.update("reminder-frequency", "2", "Prueba", "2026-01-01");
    await services.businessSettings.update(
      "reminder-template",
      "Hola {nombre}, arriendo {periodo}",
      "Prueba",
      "2026-01-01",
    );
    const row = (await services.reminders.preview()).find((r) => r.eligible);
    if (!row) throw new Error("Aviso ausente");
    await services.reminders.simulate(row.tenantId, "correo");
    expect(
      (await services.reminders.preview()).find((r) => r.tenantId === row.tenantId)?.eligible,
    ).toBe(false);
    expect(
      (await services.audit.list()).some(
        (a) => a.module === "Recordatorios" && a.entityId === row.tenantId,
      ),
    ).toBe(true);
  });
  it("asistencia y autorización fraccionada se guardan sin duplicar días", async () => {
    const record = {
      employeeId: "u-planta",
      date: "2026-10-21",
      entry: "08:00",
      exit: "17:00",
      hours: 9,
      overtimeHours: 1,
      incident: "Pendiente",
    };
    await services.payroll.import([record], "asistencia.csv", 0);
    await services.payroll.import([record], "asistencia.csv", 0);
    await services.payroll.authorize("u-planta", "2026-10", 0.5, "Media hora");
    const snap = await services.business.snapshot();
    expect(
      snap.attendance.filter((a) => a.employeeId === "u-planta" && a.date === "2026-10-21"),
    ).toHaveLength(1);
    expect(snap.overtime[0]?.hours).toBe(0.5);
  });
  it("intercambio del mismo precio liquida sin pérdida ni cargo", async () => {
    const snap = await services.business.snapshot();
    const first = snap.products.find((p) => p.id === "prod-19");
    const second = snap.products.find((p) => p.id === "prod-21");
    if (!first || !second) throw new Error("Producto ausente");
    await services.products.save({
      ...second,
      priceGroup: first.priceGroup,
      retailPrice: first.retailPrice,
      wholesalePrice: first.wholesalePrice,
    });
    await services.routes.settle(
      "dispatch-demo",
      [
        { productId: "prod-19", quantity: 6000 },
        { productId: "prod-21", quantity: 11000 },
      ],
      60000,
      "Intercambio verificado",
    );
    const result = await services.business.snapshot();
    expect(result.settlements[0]?.inventory.map((i) => i.state)).toEqual([
      "Intercambio de producto",
      "Intercambio de producto",
    ]);
    expect(result.settlements[0]?.difference).toBe(0);
    expect(
      result.balances
        .filter((b) => b.locationId === "ruta-1" && ["prod-19", "prod-21"].includes(b.productId))
        .map((b) => b.quantity),
    ).toEqual([0, 0]);
  });
  it("oficios operativos no reciben asistencia ni pagos de otros módulos", async () => {
    await services.auth.login("ahumadero", "planta", "planta123");
    const plant = await services.business.snapshot();
    expect(plant.sales).toEqual([]);
    expect(plant.customers).toEqual([]);
    expect(plant.overtime).toEqual([]);
    await services.auth.login("ahumadero", "ruta", "ruta123");
    const route = await services.business.snapshot();
    expect(route.versions.some((v) => v.settingId === "surplus")).toBe(false);
    expect(route.propertyExpenses).toEqual([]);
  });
});
