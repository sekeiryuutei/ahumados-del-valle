import { describe, expect, it } from "vitest";
import type { TenantAccount } from "./types";
import { reminderCandidate } from "./reminders";
const account: TenantAccount = {
  tenant: {
    id: "t1",
    name: "María",
    document: "demo",
    phone: "",
    email: "",
    username: "maria",
    active: true,
    createdAt: "2026-01-01",
  },
  lease: null,
  property: null,
  balance: 1200000,
  pending: [{ period: "2026-10", amount: 1200000, dueDate: "2026-10-05", overdue: false }],
};
describe("recordatorios configurables", () => {
  it("respeta anticipación y sustituye los datos de la cuenta", () => {
    expect(reminderCandidate(account, "2026-10-01", 3, 2, "Hola {nombre}: {monto}")?.eligible).toBe(
      false,
    );
    expect(reminderCandidate(account, "2026-10-02", 3, 2, "Hola {nombre}: {monto}")?.message).toBe(
      "Hola María: 1200000",
    );
  });
  it("evita repetir el aviso antes de la frecuencia configurada", () => {
    expect(reminderCandidate(account, "2026-10-04", 3, 2, "Aviso", "2026-10-03")?.eligible).toBe(
      false,
    );
    expect(reminderCandidate(account, "2026-10-05", 3, 2, "Aviso", "2026-10-03")?.eligible).toBe(
      true,
    );
  });
});
