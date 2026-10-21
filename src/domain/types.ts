// Tipos de dominio. Sin dependencias de React ni de la interfaz.
// Dinero: enteros COP. Fechas: ISO (YYYY-MM-DD o ISO completo).

export type Role = "superadmin" | "admin" | "vendedor" | "ruta" | "planta" | "inquilino";

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  /** Solo para inquilinos: su id de inquilino */
  tenantId?: string | undefined;
}

export interface Session {
  user: User;
  startedAt: string;
}

export type PropertyStatus = "disponible" | "ocupado" | "mantenimiento";

export interface Property {
  id: string;
  code: string;
  name: string;
  location: string;
  areaM2: number;
  monthlyRent: number;
  status: PropertyStatus;
  description: string;
}

export interface Tenant {
  id: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  username: string;
  active: boolean;
  createdAt: string;
}

export type LeaseStatus = "vigente" | "finalizado";

export interface Lease {
  id: string;
  tenantId: string;
  propertyId: string;
  monthlyRent: number;
  /** Día del mes en que vence el pago (1-28) */
  cutoffDay: number;
  startDate: string;
  endDate: string;
  status: LeaseStatus;
}

export type PaymentStatus = "pendiente" | "en_proceso" | "pagado" | "fallido" | "reembolsado";
export type PaymentMethod = "efectivo" | "transferencia" | "wompi";
export type OnlineChannel = "pse" | "nequi" | "bancolombia" | "tarjeta";

export interface RentPayment {
  id: string;
  reference: string;
  leaseId: string;
  tenantId: string;
  /** Periodo pagado, formato YYYY-MM */
  period: string;
  rentAmount: number;
  surcharge: number;
  total: number;
  method: PaymentMethod;
  channel?: OnlineChannel | undefined;
  status: PaymentStatus;
  createdAt: string;
  registeredBy: string;
  /** true mientras el pago provenga de la simulación */
  demo: boolean;
  note?: string | undefined;
}

export interface SurchargeSetting {
  amount: number;
  effectiveFrom: string;
  reason: string;
  version: number;
  updatedAt: string;
  updatedBy: string;
}

export interface PendingPeriod {
  period: string;
  dueDate: string;
  amount: number;
  overdue: boolean;
}

export interface TenantAccount {
  tenant: Tenant;
  lease: Lease | null;
  property: Property | null;
  pending: PendingPeriod[];
  balance: number;
}

export interface RentalSummary {
  totalProperties: number;
  occupied: number;
  available: number;
  maintenance: number;
  expectedThisMonth: number;
  collectedThisMonth: number;
  pendingTenants: number;
  totalDebt: number;
}
