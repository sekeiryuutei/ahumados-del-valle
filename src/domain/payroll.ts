import type { AttendanceRecord, BusinessSetting, Employee, OvertimeAuthorization } from "./operations";

const minute = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const numericSetting = (settings: BusinessSetting[], id: string) => {
  const value = settings.find(s => s.id === id)?.value;
  return value?.trim() && Number.isFinite(Number(value)) ? Number(value) : null;
};

/** This is an estimate from configured parameters, never a legal payroll engine. */
export function preliquidate(employee: Employee, records: AttendanceRecord[], authorizations: OvertimeAuthorization[], settings: BusinessSetting[], period: string) {
  const nightStart = settings.find(s => s.id === "night-start")?.value ?? "";
  const nightEnd = settings.find(s => s.id === "night-end")?.value ?? "";
  const holidays = (settings.find(s => s.id === "holidays")?.value ?? "").split(",").map(d => d.trim());
  const rates = { extra: numericSetting(settings, "overtime-rate"), night: numericSetting(settings, "night-rate"), sunday: numericSetting(settings, "sunday-rate") };
  const nightConfigured = /^([01]\d|2[0-3]):[0-5]\d$/.test(nightStart) && /^([01]\d|2[0-3]):[0-5]\d$/.test(nightEnd);
  let remaining = authorizations.filter(a => a.employeeId === employee.id && a.period === period).reduce((sum, a) => sum + a.hours, 0);
  const days = records.filter(r => r.employeeId === employee.id && r.date.startsWith(period)).sort((a, b) => a.date.localeCompare(b.date)).map(record => {
    const authorized = Math.min(record.overtimeHours, remaining);
    remaining -= authorized;
    let nightMinutes = 0;
    let sundayMinutes = 0;
    const start = minute(record.entry);
    const length = Math.round(record.hours * 60);
    for (let offset = 0; offset < length; offset++) {
      const clock = (start + offset) % 1440;
      if (nightConfigured && (minute(nightStart) > minute(nightEnd) ? clock >= minute(nightStart) || clock < minute(nightEnd) : clock >= minute(nightStart) && clock < minute(nightEnd))) nightMinutes++;
      const date = new Date(`${record.date}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() + Math.floor((start + offset) / 1440));
      if (date.getUTCDay() === 0 || holidays.includes(date.toISOString().slice(0, 10))) sundayMinutes++;
    }
    const base = Math.round((record.hours - record.overtimeHours) * employee.hourlyRate);
    const extraPay = rates.extra === null ? null : Math.round(authorized * employee.hourlyRate * (1 + rates.extra / 100));
    const nightPay = !nightConfigured || rates.night === null ? null : Math.round(nightMinutes / 60 * employee.hourlyRate * rates.night / 100);
    const sundayPay = rates.sunday === null ? null : Math.round(sundayMinutes / 60 * employee.hourlyRate * rates.sunday / 100);
    const total = employee.hourlyRate <= 0 || extraPay === null || nightPay === null || sundayPay === null ? null : base + extraPay + nightPay + sundayPay;
    return { date: record.date, hours: record.hours, reported: record.overtimeHours, authorized, pending: record.overtimeHours - authorized, nightHours: nightConfigured ? nightMinutes / 60 : null, sundayHours: sundayMinutes / 60, base, extraPay, nightPay, sundayPay, total };
  });
  const sum = (key: "hours" | "reported" | "authorized" | "pending" | "base") => days.reduce((total, day) => total + day[key], 0);
  const sumNullable = (key: "extraPay" | "nightPay" | "sundayPay" | "total") => days.some(day => day[key] === null) ? null : days.reduce((total, day) => total + (day[key] ?? 0), 0);
  return { days, hours: sum("hours"), reported: sum("reported"), authorized: sum("authorized"), pending: sum("pending"), base: sum("base"), extraPay: sumNullable("extraPay"), nightPay: sumNullable("nightPay"), sundayPay: sumNullable("sundayPay"), total: sumNullable("total") };
}