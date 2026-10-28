import type { TenantAccount } from "./types";
export interface ReminderCandidate {
  tenantId: string;
  tenantName: string;
  period: string;
  dueDate: string;
  amount: number;
  message: string;
  eligible: boolean;
  status: string;
}
export function reminderCandidate(
  account: TenantAccount,
  today: string,
  anticipation: number,
  frequency: number,
  template: string,
  lastSent?: string,
): ReminderCandidate | null {
  const pending = account.pending[0];
  if (!pending || !account.tenant.active) return null;
  const days =
    (Date.parse(`${pending.dueDate}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000;
  const due = days <= anticipation;
  const cooling = lastSent
    ? (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${lastSent}T12:00:00Z`)) / 86400000 <
      frequency
    : false;
  const values: Record<string, string> = {
    nombre: account.tenant.name,
    periodo: pending.period,
    vencimiento: pending.dueDate,
    monto: String(pending.amount),
    local: account.property?.name ?? "",
  };
  return {
    tenantId: account.tenant.id,
    tenantName: account.tenant.name,
    period: pending.period,
    dueDate: pending.dueDate,
    amount: pending.amount,
    message: template.replace(
      /\{(nombre|periodo|vencimiento|monto|local)\}/g,
      (_, key: string) => values[key] ?? "",
    ),
    eligible: due && !cooling,
    status: cooling
      ? "Frecuencia en espera"
      : due
        ? "Listo para simulación"
        : "Fuera de anticipación",
  };
}
