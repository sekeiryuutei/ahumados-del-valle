import { describe, expect, it } from "vitest";
import { itemTotal, netWeight, reconciliationState, stockAfterSale, validatePayments } from "./operation-rules";

describe("reglas operativas", () => {
  it("calcula COP enteros desde gramos", () => expect(itemTotal({ control: "peso" }, 1280, 25000)).toBe(32000));
  it("descuenta tara configurable por caja", () => expect(netWeight(14000, 2000, 2)).toBe(10000));
  it("exige pagos mixtos iguales al total", () => {
    expect(validatePayments([{ method: "efectivo", amount: 20000 }, { method: "nequi", amount: 12000 }], 32000)).toBe(true);
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