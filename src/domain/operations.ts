import type { Role } from "./types";

export type LocationId = "ahumadero" | "galeria" | "ruta-1";
export type ProductionStage = "crudo" | "marinado" | "ahumado" | "congelado";
export type PaymentKind = "efectivo" | "nequi" | "bancolombia" | "tarjeta" | "fiado";
export type Permission = "ventas" | "inventario" | "recetas_privadas" | "nomina" | "integraciones";
export interface Location { id: LocationId; name: string; active: boolean }
export interface Product {
  id: string; name: string; category: string; barcode: string; active: boolean;
  control: "peso" | "unidad" | "mixto"; origin: "producido" | "reventa";
  retailPrice: number; wholesalePrice: number; minimum: number;
  priceGroup: string; shrinkagePercent: number; thawTolerancePercent: number; requiresDian: boolean;
}
export interface PriceRule { id: string; minimumGrams: number; priority: number }
export interface PriceGroup { id: string; name: string; productIds: string[] }
export interface Customer {
  id: string; name: string; document: string; phone: string; wholesale: boolean;
  creditAllowed: boolean; creditLimit: number; blocked: boolean; balance: number; baskets: number;
}
export interface CreditAccount { customerId: string; balance: number; limit: number }
export interface Payment { method: PaymentKind; amount: number }
export interface SaleItem { productId: string; name: string; quantity: number; control: Product["control"]; price: number; total: number; note: string }
export interface Sale {
  id: string; number: string; locationId: LocationId; customerId: string; items: SaleItem[];
  payments: Payment[]; total: number; status: "pagada" | "pausada" | "anulada";
  createdAt: string; actor: string; note: string; baskets: number; requiresDian: boolean;
  dianStatus: "no_conectada"; cufe: null; syncStatus: "pendiente" | "sincronizada" | "conflicto";
}
export type RouteSale = Sale;
export interface ReceiptCopy { saleId: string; number: string; createdAt: string }
export interface CashRegister { id: LocationId; name: string; status: "abierta" | "cerrada" }
export interface CashClosing { id: string; locationId: LocationId; expected: number; counted: number; difference: number; createdAt: string; actor: string }
export interface Lot {
  id: string; productId: string; supplierId: string; locationId: LocationId; stage: ProductionStage;
  initialGrams: number; grams: number; units: number; cost: number; expiresAt: string;
  createdAt: string; history: { stage: ProductionStage; grams: number; date: string; actor: string }[];
}
export interface InventoryBalance { productId: string; locationId: LocationId; quantity: number }
export interface InventoryMovement {
  id: string; productId: string; quantity: number; from: LocationId | null; to: LocationId | null;
  type: "recepcion" | "venta" | "traslado" | "despacho" | "devolucion" | "ajuste" | "produccion";
  reference: string; actor: string; createdAt: string; reason: string;
}
export interface Seasoning { id: string; alias: string; stockGrams: number; minimumGrams: number }
export interface Recipe { id: string; productId: string; lines: { seasoningId: string; gramsPerKg: number }[] }
export type ProductionBatch = Lot;
export interface Supplier { id: string; name: string; phone: string; productIds: string[]; note: string }
export interface PurchaseOrder { id: string; supplierId: string; productId: string; quantity: number; received: number; status: "borrador" | "enviada" | "parcial" | "recibida"; createdAt: string }
export interface Vehicle { id: string; name: string; active: boolean }
export interface Route { id: string; name: string; vehicleId: string; employeeIds: string[] }
export interface DispatchLine { productId: string; loaded: number; returned: number; grossGrams?: number; tareGrams?: number; boxes?: number }
export interface Dispatch { id: string; name: string; employee: string; vehicle: string; date: string; status: "en_ruta" | "cerrada"; lines: DispatchLine[]; signed: boolean }
export interface RouteReturn { productId: string; quantity: number }
export interface RouteSettlement { id: string; dispatchId: string; expected: number; delivered: number; difference: number; inventory: { productId: string; loaded: number; sold: number; returned: number; difference: number; state: string }[]; employeeSurplus: number; createdAt: string }
export interface AuditEvent { id: string; module: string; action: string; entityId: string; actor: string; createdAt: string; reason: string; before: string; after: string; technical: boolean }
export interface Employee { id: string; name: string; username: string; role: Role; hourlyRate: number; active: boolean }
export interface AttendanceRecord { id: string; employeeId: string; date: string; entry: string; exit: string; hours: number; overtimeHours: number; incident: string }
export interface OvertimeAuthorization { id: string; employeeId: string; period: string; hours: number; reason: string }
export interface LaborParameter { id: string; name: string; value: number | null; unit: string; effectiveFrom: string; status: "pendiente" | "validado" | "retirado"; source: string }
export interface BusinessSetting { id: string; category: string; label: string; value: string; unit: string; status: "configurado" | "pendiente" | "pendiente_validar"; updatedAt: string; updatedBy: string }
export interface ConfigurationVersion { id: string; settingId: string; before: string; after: string; reason: string; effectiveFrom: string; actor: string }
export interface HardwareDeviceConfig { id: string; name: string; model: string; connection: string; protocol: string; status: string; note: string }
export interface IntegrationSummary { id: string; name: string; environment: "sandbox" | "produccion"; status: "no_configurada" | "configurada" | "prueba_simulada" | "desactivada"; configured: boolean; maskedSuffix: string; lastUpdatedAt: string; lastTestAt: string }
export interface ImportJob { id: string; name: string; target: string; valid: number; errors: number; status: string; createdAt: string }
export interface CustomerMovement { id: string; customerId: string; type: "abono" | "canastillas" | "bloqueo"; amount: number; quantity: number; method: PaymentKind; reason: string; createdAt: string; actor: string }
export interface PropertyExpense { id: string; propertyId: string; amount: number; note: string; support: string; createdAt: string }
export interface BusinessSnapshot {
  locations: Location[]; products: Product[]; customers: Customer[]; sales: Sale[];
  balances: InventoryBalance[]; movements: InventoryMovement[]; lots: Lot[];
  seasonings: Seasoning[]; recipes: Recipe[]; suppliers: Supplier[]; purchases: PurchaseOrder[];
  dispatches: Dispatch[]; settlements: RouteSettlement[]; employees: Employee[];
  attendance: AttendanceRecord[]; overtime: OvertimeAuthorization[]; labor: LaborParameter[];
  settings: BusinessSetting[]; versions: ConfigurationVersion[]; hardware: HardwareDeviceConfig[];
  integrations: IntegrationSummary[]; audit: AuditEvent[]; closings: CashClosing[];
  imports: ImportJob[]; customerMovements: CustomerMovement[]; propertyExpenses: PropertyExpense[];
}
export interface OfflineOperation { id: string; saleId: string; localDate: string; status: "pendiente" | "sincronizando" | "sincronizada" | "conflicto"; payload: { saleId: string; locationId: LocationId; total: number } }