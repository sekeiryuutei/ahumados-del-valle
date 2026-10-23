// Base de datos simulada persistida en localStorage. Solo para la fase de frontend.
import type { Lease, Property, RentPayment, Role, SurchargeSetting, Tenant } from "@/domain/types";

export interface MockDb {
  properties: Property[];
  tenants: Tenant[];
  /** Contraseñas mock. El backend real las guardará con hash. */
  credentials: Record<string, { password: string; role: Role; refId: string; name: string; active?: boolean }>;
  leases: Lease[];
  payments: RentPayment[];
  surchargeHistory: SurchargeSetting[];
}

const KEY = "adv.mockdb.v1";

function seed(): MockDb {
  const now = new Date().toISOString();
  const properties: Property[] = [
    { id: "p1", code: "L-01", name: "Local 1 · Esquina", location: "Galería", areaM2: 24, monthlyRent: 1_200_000, status: "ocupado", description: "Local esquinero con vitrina y punto de agua." },
    { id: "p2", code: "L-02", name: "Local 2", location: "Galería", areaM2: 18, monthlyRent: 950_000, status: "ocupado", description: "Local interno con buena circulación." },
    { id: "p3", code: "L-03", name: "Local 3", location: "Galería", areaM2: 16, monthlyRent: 850_000, status: "disponible", description: "Ideal para frutas, verduras o abarrotes." },
    { id: "p4", code: "B-01", name: "Bodega 1", location: "Ahumadero", areaM2: 40, monthlyRent: 1_600_000, status: "disponible", description: "Bodega con acceso para carga y descarga." },
    { id: "p5", code: "L-04", name: "Local 4", location: "Galería", areaM2: 20, monthlyRent: 1_000_000, status: "mantenimiento", description: "En adecuación eléctrica." },
  ];
  const tenants: Tenant[] = [
    { id: "t1", name: "María Fernanda López", document: "CC 1.112.345.678", phone: "315 555 0101", email: "maria.lopez@ejemplo.co", username: "maria", active: true, createdAt: "2026-01-02T15:00:00Z" },
    { id: "t2", name: "Frutas Don Julio S.A.S.", document: "NIT 901.234.567-1", phone: "318 555 0202", email: "donjulio@ejemplo.co", username: "donjulio", active: true, createdAt: "2026-03-01T15:00:00Z" },
  ];
  const leases: Lease[] = [
    { id: "l1", tenantId: "t1", propertyId: "p1", monthlyRent: 1_200_000, cutoffDay: 5, startDate: "2026-01-01", endDate: "2026-12-31", status: "vigente" },
    { id: "l2", tenantId: "t2", propertyId: "p2", monthlyRent: 950_000, cutoffDay: 10, startDate: "2026-03-01", endDate: "2027-02-28", status: "vigente" },
  ];
  const payments: RentPayment[] = [];
  const mk = (lease: Lease, period: string, method: RentPayment["method"], surcharge = 0): RentPayment => ({
    id: `pay-${lease.id}-${period}`,
    reference: `ADV-${period.replace("-", "")}-${lease.id.toUpperCase()}`,
    leaseId: lease.id,
    tenantId: lease.tenantId,
    period,
    rentAmount: lease.monthlyRent,
    surcharge,
    total: lease.monthlyRent + surcharge,
    method,
    channel: method === "wompi" ? "nequi" : undefined,
    status: "pagado",
    createdAt: `${period}-0${Math.min(lease.cutoffDay - 1, 9)}T14:30:00Z`,
    registeredBy: method === "wompi" ? "Inquilino" : "Administrador",
    demo: true,
  });
  const firstLease = leases[0];
  const secondLease = leases[1];
  if (firstLease) ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"].forEach((p, i) =>
    payments.push(mk(firstLease, p, i % 3 === 2 ? "wompi" : "transferencia", i % 3 === 2 ? 5_000 : 0)),
  );
  if (secondLease) ["2026-03", "2026-04", "2026-05", "2026-06", "2026-07"].forEach((p) => payments.push(mk(secondLease, p, "efectivo")));

  return {
    properties,
    tenants,
    credentials: {
      admin: { password: "admin123", role: "admin", refId: "u-admin", name: "Administrador" },
      contador: { password: "contador123", role: "contador", refId: "u-contador", name: "Contador de demostración" },
      recepcion: { password: "recepcion123", role: "recepcion", refId: "u-recepcion", name: "Recepción de demostración" },
      galeria: { password: "galeria123", role: "vendedor", refId: "u-galeria", name: "Vendedor de galería" },
      ruta: { password: "ruta123", role: "ruta", refId: "u-ruta", name: "Empleado de ruta" },
      planta: { password: "planta123", role: "planta", refId: "u-planta", name: "Operario de ahumado" },
      tecnico: { password: "tecnico123", role: "superadmin", refId: "u-tecnico", name: "Administrador técnico" },
      maria: { password: "maria123", role: "inquilino", refId: "t1", name: "María Fernanda López" },
      donjulio: { password: "julio123", role: "inquilino", refId: "t2", name: "Frutas Don Julio S.A.S." },
    },
    leases,
    payments,
    surchargeHistory: [
      { amount: 5_000, effectiveFrom: "2026-01-01", reason: "Valor inicial", version: 1, updatedAt: now, updatedBy: "Administrador" },
    ],
  };
}

let cache: MockDb | null = null;

export function db(): MockDb {
  if (cache) return cache;
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as MockDb) : seed();
    const defaults = seed().credentials;
    for (const [key, value] of Object.entries(defaults)) {
      if (!cache.credentials[key]) cache.credentials[key] = value;
      else if (cache.credentials[key].active === undefined) cache.credentials[key].active = true;
    }
  } catch {
    cache = seed();
  }
  save();
  return cache;
}

export function save() {
  if (typeof window !== "undefined" && cache) window.localStorage.setItem(KEY, JSON.stringify(cache));
}

export const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
