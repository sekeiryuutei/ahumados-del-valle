import type { AttendanceRecord } from "./operations";
import { isIsoDate } from "./dates";
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const separator = text.split(/\r?\n/)[0]?.includes(";") ? ";" : ",";
  const cells: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === separator && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some((v) => v)) cells.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("CSV con comillas sin cerrar.");
  row.push(cell.trim());
  if (row.some((v) => v)) cells.push(row);
  const headers = (cells.shift() ?? []).map((h) => h.replace(/^\uFEFF/, ""));
  if (!headers.length || new Set(headers).size !== headers.length)
    throw new Error("Encabezados vacíos o repetidos.");
  return {
    headers,
    rows: cells.map((line) => Object.fromEntries(headers.map((h, i) => [h, line[i] ?? ""]))),
  };
}
export function attendanceRows(parsed: ReturnType<typeof parseCsv>, employeeIds: string[]) {
  if (["employeeId", "date", "entry", "exit"].some((k) => !parsed.headers.includes(k)))
    throw new Error("Columnas requeridas: employeeId, date, entry, exit");
  const valid: Omit<AttendanceRecord, "id">[] = [];
  const errors: string[] = [];
  parsed.rows.forEach((row, i) => {
    const time = (v: string | undefined) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v ?? "");
    const minutes = (v: string) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3));
    if (
      !employeeIds.includes(row["employeeId"] ?? "") ||
      !isIsoDate(row["date"] ?? "") ||
      !time(row["entry"]) ||
      !time(row["exit"])
    ) {
      errors.push(`Fila ${i + 2}: empleado, fecha u horario inválido`);
      return;
    }
    const entry = row["entry"] ?? "";
    const exit = row["exit"] ?? "";
    const hours = ((minutes(exit) - minutes(entry) + 1440) % 1440) / 60;
    const overtimeHours = Number(row["overtimeHours"] || 0);
    if (
      hours <= 0 ||
      !Number.isFinite(overtimeHours) ||
      overtimeHours < 0 ||
      overtimeHours > hours
    ) {
      errors.push(`Fila ${i + 2}: extras superiores a horas trabajadas`);
      return;
    }
    valid.push({
      employeeId: row["employeeId"] ?? "",
      date: row["date"] ?? "",
      entry,
      exit,
      hours,
      overtimeHours,
      incident: overtimeHours ? "Extras pendientes de autorización" : "",
    });
  });
  return { valid, errors };
}
