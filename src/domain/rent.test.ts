import { describe, expect, it } from "vitest";
import { onlineTotal, pendingPeriods } from "./rent";
import type { Lease, RentPayment } from "./types";

const lease: Lease = {
  id: "l1",
  tenantId: "t1",
  propertyId: "p1",
  monthlyRent: 1_200_000,
  cutoffDay: 5,
  startDate: "2026-08-01",
  endDate: "2027-07-31",
  status: "vigente",
};

const paid = (period: string): RentPayment => ({
  id: period,
  reference: period,
  leaseId: "l1",
  tenantId: "t1",
  period,
  rentAmount: 1_200_000,
  surcharge: 0,
  total: 1_200_000,
  method: "efectivo",
  status: "pagado",
  createdAt: "2026-08-01T00:00:00Z",
  registeredBy: "admin",
  demo: true,
});

describe("arriendos", () => {
  it("pago con Wompi suma recargo de $5.000 al canon", () => {
    expect(onlineTotal(1_200_000, 5_000).total).toBe(1_205_000);
  });

  it("periodos pagados no aparecen como pendientes", () => {
    const pending = pendingPeriods(lease, [paid("2026-08")], "2026-10-20");
    expect(pending.map((p) => p.period)).toEqual(["2026-09", "2026-10"]);
  });

  it("periodo vencido después del día de corte", () => {
    const pending = pendingPeriods(lease, [paid("2026-08"), paid("2026-09")], "2026-10-20");
    expect(pending[0].overdue).toBe(true);
  });
});
