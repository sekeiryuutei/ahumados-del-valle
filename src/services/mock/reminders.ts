import { reminderCandidate, type ReminderCandidate } from "@/domain/reminders";
import { todayBogota } from "@/lib/format";
import { ServiceError } from "../contracts";
import { mockServices } from "./index";
import { businessDb, saveBusiness } from "./business-db";
import { uid } from "./db";
function requireAdmin() {
  if (mockServices.auth.getSession()?.user.role !== "admin")
    throw new ServiceError("validacion", "Solo la administración prepara los recordatorios.");
}
async function preview(): Promise<ReminderCandidate[]> {
  requireAdmin();
  const d = businessDb();
  const value = (id: string) => d.settings.find((s) => s.id === id)?.value ?? "";
  if (!value("reminder-days") || !value("reminder-frequency") || !value("reminder-template"))
    throw new ServiceError(
      "validacion",
      "Configura anticipación, frecuencia y plantilla de recordatorio.",
    );
  const accounts = await mockServices.tenants.list();
  return accounts.flatMap((account) => {
    const last = d.audit.find(
      (a) => a.module === "Recordatorios" && a.entityId === account.tenant.id,
    );
    const candidate = reminderCandidate(
      account,
      todayBogota(),
      Number(value("reminder-days")),
      Number(value("reminder-frequency")),
      value("reminder-template"),
      last ? todayBogota(new Date(last.createdAt)) : undefined,
    );
    return candidate ? [candidate] : [];
  });
}
export const reminderService = {
  preview,
  async simulate(tenantId: string, channel: "correo" | "whatsapp") {
    requireAdmin();
    const row = (await preview()).find((r) => r.tenantId === tenantId);
    if (!row?.eligible)
      throw new ServiceError(
        "validacion",
        "Este aviso no corresponde todavía según la frecuencia y anticipación.",
      );
    businessDb().audit.unshift({
      id: uid("reminder"),
      module: "Recordatorios",
      action: `Envío simulado · ${channel}`,
      entityId: tenantId,
      reason: row.message,
      before: "",
      after: row.period,
      actor: mockServices.auth.getSession()?.user.name ?? "Administrador",
      createdAt: new Date().toISOString(),
      technical: false,
    });
    saveBusiness();
  },
};
