const TZ = "America/Bogota";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** $125.000 */
export function formatCOP(value: number): string {
  return cop.format(Math.round(value)).replace(/\s/g, "");
}

export function formatDate(iso: string): string {
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00-05:00`) : new Date(iso);
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

/** "2026-10" -> "Octubre 2026" */
export function formatPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es-CO", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 15)),
  );
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${y}`;
}

/** Fecha de hoy en Bogotá, YYYY-MM-DD */
export function todayBogota(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

export function currentPeriod(now: Date = new Date()): string {
  return todayBogota(now).slice(0, 7);
}
