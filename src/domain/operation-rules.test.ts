import { describe, expect, it } from "vitest";
import {
  itemTotal,
  netWeight,
  reconcileRoute,
  reconciliationState,
  stockAfterSale,
  validatePayments,
} from "./operation-rules";
import type { Dispatch, Product, Sale } from "./operations";

describe("reglas operativas", () => {
  it("calcula COP enteros desde gramos", () =>
    expect(itemTotal({ control: "peso" }, 1280, 25000)).toBe(32000));
  it("descuenta tara configurable por caja", () => expect(netWeight(14000, 2000, 2)).toBe(10000));
  it("exige pagos mixtos iguales al total", () => {
    expect(
      validatePayments(
        [
          { method: "efectivo", amount: 20000 },
          { method: "nequi", amount: 12000 },
        ],
        32000,
      ),
    ).toBe(true);
    expect(validatePayments([{ method: "efectivo", amount: 31000 }], 32000)).toBe(false);
  });
  it("no vende más de lo cargado incluyendo ventas locales", () => {
    expect(stockAfterSale(5000, 4000)).toBe(1000);
    expect(() => stockAfterSale(1000, 1001)).toThrow();
  });
  it("merma dentro de tolerancia no genera cargo", () => {
    expect(reconciliationState(100, 10000, 2)).toBe("Pérdida normal");
    expect(reconciliationState(500, 10000, 2)).toBe("Requiere revisión");
  });
});

const product: Product = {
  id: "p1",
  name: "Costilla",
  category: "Ahumados",
  barcode: "",
  active: true,
  control: "peso",
  origin: "producido",
  retailPrice: 35000,
  wholesalePrice: 31500,
  minimum: 0,
  priceGroup: "costilla",
  shrinkagePercent: 20,
  thawTolerancePercent: 2,
  requiresDian: false,
};
const dispatch: Dispatch = {
  id: "d1",
  name: "Ruta",
  employee: "Demo",
  vehicle: "Demo",
  date: "2026-10-23",
  status: "en_ruta",
  signed: true,
  lines: [{ productId: "p1", loaded: 10000, returned: 0 }],
};
const sale = (createdAt: string): Sale => ({
  id: createdAt,
  number: "RUT-1",
  locationId: "ruta-1",
  customerId: "c1",
  items: [
    {
      productId: "p1",
      name: "Costilla",
      quantity: 1000,
      control: "peso",
      price: 35000,
      total: 35000,
      note: "",
    },
  ],
  payments: [{ method: "efectivo", amount: 35000 }],
  total: 35000,
  status: "pagada",
  createdAt,
  actor: "Demo",
  note: "",
  baskets: 0,
  requiresDian: false,
  dianStatus: "no_conectada",
  cufe: null,
  syncStatus: "sincronizada",
});
describe("conciliación de ruta", () => {
  it("usa el día de Bogotá en el cambio de día UTC", () => {
    const result = reconcileRoute(
      dispatch,
      [sale("2026-10-23T04:59:00Z"), sale("2026-10-23T05:00:00Z")],
      [product],
      [{ productId: "p1", quantity: 9000 }],
    );
    expect(result.expected).toBe(35000);
    expect(result.inventory[0]?.sold).toBe(1000);
    expect(result.inventory[0]?.difference).toBe(0);
  });
  it("no cuenta ventas anteriores a otro despacho del mismo día", () => {
    const result = reconcileRoute(
      { ...dispatch, dispatchedAt: "2026-10-23T15:00:00Z" },
      [sale("2026-10-23T14:00:00Z"), sale("2026-10-23T16:00:00Z")],
      [product],
      [{ productId: "p1", quantity: 9000 }],
    );
    expect(result.routeSales).toHaveLength(1);
    expect(result.expected).toBe(35000);
  });
  it("solo permite intercambios entre productos del mismo precio", () => {
    const second = { ...product, id: "p2" };
    const input = {
      ...dispatch,
      lines: [...dispatch.lines, { productId: "p2", loaded: 10000, returned: 0 }],
    };
    const returned = [
      { productId: "p1", quantity: 8000 },
      { productId: "p2", quantity: 11000 },
    ];
    expect(
      reconcileRoute(
        input,
        [sale("2026-10-23T12:00:00Z")],
        [product, second],
        returned,
      ).inventory.map((r) => r.state),
    ).toEqual(["Intercambio de producto", "Intercambio de producto"]);
    expect(
      reconcileRoute(
        input,
        [sale("2026-10-23T12:00:00Z")],
        [product, { ...second, retailPrice: 40000 }],
        returned,
      ).inventory[0]?.state,
    ).toBe("Requiere revisión");
  });
});
