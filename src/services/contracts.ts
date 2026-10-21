// Contratos públicos de servicios. Las pantallas solo dependen de estas interfaces.
import type {
  Lease,
  OnlineChannel,
  Property,
  PropertyStatus,
  RentPayment,
  RentalSummary,
  Role,
  Session,
  SurchargeSetting,
  Tenant,
  TenantAccount,
} from "@/domain/types";
import type { BusinessServices } from "./operation-contracts";

export class ServiceError extends Error {
  constructor(
    public code: "credenciales" | "no_encontrado" | "validacion" | "conflicto" | "desconocido",
    public userMessage: string,
  ) {
    super(userMessage);
  }
}

export type Portal = Role | "ahumadero";

export interface AuthService {
  login(portal: Portal, username: string, password: string): Promise<Session>;
  logout(): Promise<void>;
  getSession(): Session | null;
  subscribe(cb: () => void): () => void;
}

export interface PropertyInput {
  code: string;
  name: string;
  location: string;
  areaM2: number;
  monthlyRent: number;
  status: PropertyStatus;
  description: string;
}

export interface PropertyService {
  list(filter?: { status?: PropertyStatus }): Promise<Property[]>;
  create(input: PropertyInput): Promise<Property>;
  update(id: string, input: Partial<PropertyInput>): Promise<Property>;
}

export interface NewTenantInput {
  name: string;
  document: string;
  phone: string;
  email: string;
  username: string;
  password: string;
  propertyId: string;
  monthlyRent: number;
  cutoffDay: number;
  startDate: string;
  endDate: string;
}

export interface TenantService {
  list(): Promise<TenantAccount[]>;
  getAccount(tenantId: string): Promise<TenantAccount>;
  create(input: NewTenantInput): Promise<Tenant>;
  setActive(tenantId: string, active: boolean): Promise<Tenant>;
  resetPassword(tenantId: string, password: string): Promise<void>;
}

export interface LeaseService {
  end(leaseId: string): Promise<Lease>;
}

export interface PaymentService {
  list(filter?: { tenantId?: string }): Promise<RentPayment[]>;
  registerManual(input: {
    tenantId: string;
    period: string;
    method: "efectivo" | "transferencia";
    note?: string | undefined;
  }): Promise<RentPayment>;
  /** Inicia un pago en línea (demostración). Queda "en_proceso". */
  startOnline(input: {
    tenantId: string;
    period: string;
    channel: OnlineChannel;
  }): Promise<RentPayment>;
  /** Resultado simulado de la pasarela. */
  resolveDemo(paymentId: string, result: "pagado" | "fallido"): Promise<RentPayment>;
}

export interface SettingsService {
  getSurcharge(): Promise<SurchargeSetting>;
  getSurchargeHistory(): Promise<SurchargeSetting[]>;
  updateSurcharge(input: { amount: number; reason: string }): Promise<SurchargeSetting>;
}

export interface DashboardService {
  rentalSummary(): Promise<RentalSummary>;
}

export interface RentalServices {
  auth: AuthService;
  properties: PropertyService;
  tenants: TenantService;
  leases: LeaseService;
  payments: PaymentService;
  settings: SettingsService;
  dashboard: DashboardService;
}

export interface Services extends RentalServices, BusinessServices {}
