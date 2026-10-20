import type { Lease, PendingPeriod, RentPayment } from "./types";

/** Lista de periodos YYYY-MM desde start hasta end (inclusive). */
export function periodsBetween(start: string, end: string): string[] {
  const out: string[] = [];
  let y = Number(start.slice(0, 4));
  let m = Number(start.slice(5, 7));
  const ey = Number(end.slice(0, 4));
  const em = Number(end.slice(5, 7));
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/**
 * Periodos sin pagar de un contrato hasta el periodo actual.
 * Un periodo está cubierto si tiene un pago en estado "pagado" o "en_proceso".
 */
export function pendingPeriods(
  lease: Lease,
  payments: RentPayment[],
  today: string,
): PendingPeriod[] {
  const lastPeriod = today.slice(0, 7) < lease.endDate.slice(0, 7) ? today : lease.endDate;
  const covered = new Set(
    payments
      .filter((p) => p.leaseId === lease.id && (p.status === "pagado" || p.status === "en_proceso"))
      .map((p) => p.period),
  );
  return periodsBetween(lease.startDate, lastPeriod)
    .filter((p) => !covered.has(p))
    .map((period) => {
      const dueDate = `${period}-${String(lease.cutoffDay).padStart(2, "0")}`;
      return { period, dueDate, amount: lease.monthlyRent, overdue: dueDate < today };
    });
}

/** Total de un pago en línea: canon + recargo, en línea separada. */
export function onlineTotal(rent: number, surcharge: number) {
  return { rent, surcharge, total: rent + surcharge };
}
