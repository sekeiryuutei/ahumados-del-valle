import type { Role } from "@/domain/types";
import type { ReminderCandidate } from "@/domain/reminders";
import type {
  AttendanceRecord,
  BusinessSnapshot,
  Customer,
  Dispatch,
  HardwareDeviceConfig,
  IntegrationSummary,
  LocationId,
  Lot,
  OfflineOperation,
  Payment,
  Product,
  ProductionStage,
  PurchaseOrder,
  Sale,
  Seasoning,
  Supplier,
} from "@/domain/operations";

export interface SalesInput {
  locationId: LocationId;
  customerId: string;
  items: { productId: string; quantity: number; note: string }[];
  payments: Payment[];
  baskets: number;
  note: string;
  requiresDian: boolean;
  offline: boolean;
  draftId?: string | undefined;
}
export interface UserService {
  create(input: {
    name: string;
    username: string;
    password: string;
    role: Role;
    hourlyRate: number;
  }): Promise<void>;
  setActive(id: string, active: boolean): Promise<void>;
}
export interface ProductService {
  save(input: Product): Promise<void>;
  deactivate(id: string, reason: string): Promise<void>;
}
export interface CustomerService {
  save(input: Customer): Promise<void>;
  pay(id: string, payments: Payment[], reason: string): Promise<void>;
  baskets(id: string, quantity: number, reason: string): Promise<void>;
  block(id: string, blocked: boolean, reason: string): Promise<void>;
}
export interface SalesService {
  create(input: SalesInput): Promise<Sale>;
  pause(input: SalesInput): Promise<Sale>;
  cancel(id: string, reason: string): Promise<void>;
  list(locationId?: LocationId): Promise<Sale[]>;
}
export interface CashRegisterService {
  close(locationId: LocationId, counted: number): Promise<void>;
}
export interface InventoryService {
  receive(input: {
    productId: string;
    supplierId: string;
    grossGrams: number;
    tareGrams: number;
    boxes: number;
    units: number;
    cost: number;
    expiresAt: string;
    destination: "proceso" | "congelado";
    purchaseId?: string | undefined;
  }): Promise<Lot>;
  adjust(
    productId: string,
    locationId: LocationId,
    quantity: number,
    reason: string,
  ): Promise<void>;
  transfer(
    productId: string,
    quantity: number,
    from: LocationId,
    to: LocationId,
    reason: string,
  ): Promise<void>;
}
export interface ProductionService {
  advance(lotId: string, stage: ProductionStage, grams: number, reason: string): Promise<void>;
}
export interface RecipeService {
  save(productId: string, lines: { seasoningId: string; gramsPerKg: number }[]): Promise<void>;
  reveal(seasoningId: string): Promise<string>;
  consume(lotId: string): Promise<void>;
}
export interface SupplierService {
  save(input: Supplier): Promise<void>;
}
export interface PurchaseService {
  create(supplierId: string, productId: string, quantity: number): Promise<PurchaseOrder>;
  send(id: string): Promise<void>;
  suggestions(): Promise<
    { productId: string; quantity: number; average: number; supplierId: string }[]
  >;
}
export interface RouteService {
  dispatch(input: Omit<Dispatch, "id" | "status">): Promise<void>;
  settle(
    dispatchId: string,
    returns: { productId: string; quantity: number }[],
    delivered: number,
    reason: string,
  ): Promise<void>;
  queue(): Promise<OfflineOperation[]>;
  synchronize(): Promise<void>;
}
export interface PayrollService {
  import(records: Omit<AttendanceRecord, "id">[], name: string, errors: number): Promise<void>;
  authorize(employeeId: string, period: string, hours: number, reason: string): Promise<void>;
}
export interface BusinessSettingsService {
  update(id: string, value: string, reason: string, effectiveFrom: string): Promise<void>;
  expense(propertyId: string, amount: number, note: string, support: string): Promise<void>;
}
export interface HardwareConfigService {
  save(device: HardwareDeviceConfig): Promise<void>;
  test(id: string): Promise<void>;
}
export interface IntegrationAdminService {
  list(): Promise<IntegrationSummary[]>;
  save(
    id: string,
    environment: IntegrationSummary["environment"],
    replaceFictitiousCredential: boolean,
  ): Promise<void>;
  test(id: string): Promise<void>;
  disable(id: string, reason: string): Promise<void>;
}
export interface AuditService {
  list(technical?: boolean): Promise<BusinessSnapshot["audit"]>;
}
export interface ImportService {
  record(
    name: string,
    target: string,
    valid: number,
    errors: number,
    rows?: Record<string, string>[],
  ): Promise<void>;
}
export interface BusinessServices {
  reminders: {
    preview(): Promise<ReminderCandidate[]>;
    simulate(tenantId: string, channel: "correo" | "whatsapp"): Promise<void>;
  };
  business: { snapshot(): Promise<BusinessSnapshot> };
  users: UserService;
  products: ProductService;
  customers: CustomerService;
  sales: SalesService;
  cashRegisters: CashRegisterService;
  inventory: InventoryService;
  production: ProductionService;
  recipes: RecipeService;
  suppliers: SupplierService;
  purchases: PurchaseService;
  routes: RouteService;
  payroll: PayrollService;
  businessSettings: BusinessSettingsService;
  hardware: HardwareConfigService;
  integrations: IntegrationAdminService;
  audit: AuditService;
  imports: ImportService;
}
