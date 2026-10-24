import { describe, expect, it } from "vitest";
import type { AttendanceRecord, BusinessSetting, Employee } from "./operations";
import { preliquidate } from "./payroll";
const employee: Employee = { id: "e1", name: "Ejemplo", username: "demo", role: "planta", hourlyRate: 8000, active: true };
const records: AttendanceRecord[] = [{ id: "a1", employeeId: "e1", date: "2026-10-25", entry: "20:00", exit: "00:00", hours: 4, overtimeHours: 1, incident: "" }];
const setting = (id: string, value: string): BusinessSetting => ({ id, value, category: "Laboral", label: id, unit: "", status: "configurado", updatedAt: "2026-10-01", updatedBy: "demo" });
const settings = [setting("night-start", "21:00"), setting("night-end", "06:00"), setting("night-rate", "35"), setting("overtime-rate", "25"), setting("sunday-rate", "75")];
describe("preliquidación de demostración", () => {
  it("no inventa recargos ni total cuando faltan parámetros", () => {
    const result = preliquidate(employee, records, [], [], "2026-10");
    expect(result.total).toBeNull(); expect(result.nightPay).toBeNull(); expect(result.base).toBe(24000); expect(result.pending).toBe(1);
  });
  it("aplica parámetros configurados y solo extras autorizadas", () => {
    const result = preliquidate(employee, records, [{ id: "o1", employeeId: "e1", period: "2026-10", hours: 0.5, reason: "Ejemplo" }], settings, "2026-10");
    expect(result.authorized).toBe(0.5); expect(result.extraPay).toBe(5000); expect(result.nightPay).toBe(8400); expect(result.sundayPay).toBe(24000); expect(result.total).toBe(61400);
  });
});