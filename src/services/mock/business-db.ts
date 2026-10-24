import type { BusinessSnapshot } from "@/domain/operations";
import { todayBogota } from "@/lib/format";

const KEY = "adv.business.demo.v1";
let cache: BusinessSnapshot | undefined;

const names = ["Asadero de cerdo x10", "Asadero de pollo x10", "Asadero Santarrosano", "Bofe al X mayor", "Cabano x500", "Calima gris", "Calima rojo", "Carne al X mayor", "Carne cruda", "Cerdo x10", "Cerdo x20", "Chorizo res x12 Shalom", "Chorizo res x12 Siglo XXI", "Chorizo pollo Chorival", "Chorizo pollo x10 Shoker", "Chuleta cerdo", "Chuleta pescado", "Chuleta pollo", "Costilla al X mayor", "Costilla cruda", "Costilla especial", "Jamón bloque", "Jamón verdura", "Longaniza Shalom x2,5", "Longaniza x2,5", "Picada", "Salchicha Sevilla", "Salchicha Karvalle", "Salchichón económico", "Salchichón chocolate", "Salchichón indio", "Salchichón Karvalle", "Santarrosano x10 Bogotá", "Sevilla x15", "Tocineta", "Tocineta kilo"];

function seed(): BusinessSnapshot {
  const now = new Date().toISOString();
  const date = todayBogota();
  const products = names.map((name, i) => ({
    id: `prod-${i + 1}`, name, barcode: `770${String(i + 1).padStart(6, "0")}`,
    category: name.includes("Chorizo") || name.includes("Asadero") ? "Embutidos" : name.includes("cruda") ? "Crudos" : "Ahumados",
    active: true, control: (name.includes("x10") || name.includes("x12") || name.includes("x20") || name.includes("x15") ? "unidad" : "peso") as "unidad" | "peso",
    origin: (name.includes("Costilla") || name.includes("Carne") || name.includes("Bofe") ? "producido" : "reventa") as "producido" | "reventa",
    retailPrice: 20000 + (i % 5) * 5000, wholesalePrice: 18000 + (i % 5) * 4500,
    minimum: 5000, priceGroup: `grupo-${i % 5}`, shrinkagePercent: 20, thawTolerancePercent: 2, requiresDian: false,
  }));
  const customers = [
    { id: "c1", name: "Tienda La Esquina · ejemplo", document: "DEMO-001", phone: "", wholesale: true, creditAllowed: true, creditLimit: 1000000, blocked: false, balance: 80000, baskets: 3 },
    { id: "c2", name: "Restaurante El Fogón · ejemplo", document: "DEMO-002", phone: "", wholesale: true, creditAllowed: true, creditLimit: 500000, blocked: false, balance: 0, baskets: 1 },
    { id: "c3", name: "Cliente de contado · ejemplo", document: "DEMO-003", phone: "", wholesale: false, creditAllowed: false, creditLimit: 0, blocked: false, balance: 0, baskets: 0 },
  ];
  const settings = [
    ["tare", "Operación", "Tara de caja plástica", "2000", "g", "configurado"],
    ["wholesale-min", "Ventas", "Cantidad mínima mayorista", "5000", "g", "configurado"],
    ["surplus", "Rutas", "Participación del excedente (ejemplo)", "20", "%", "configurado"],
    ["purchase-days", "Compras", "Días de consumo promedio", "30", "días", "configurado"],
    ["phone", "Tirilla", "Teléfono de contacto", "", "", "pendiente"],
    ["nequi", "Tirilla", "Línea Nequi", "", "", "pendiente"],
    ["footer", "Tirilla", "Mensaje al pie", "Gracias por tu compra", "", "configurado"],
    ["receipt-start", "Tirilla", "Consecutivo inicial", "1", "", "configurado"],
    ["reminder-days", "Arriendos", "Anticipación del recordatorio", "", "días", "pendiente"],
    ["reminder-frequency", "Arriendos", "Frecuencia de recordatorios", "", "días", "pendiente"],
    ["reminder-template", "Arriendos", "Plantilla de recordatorio", "", "", "pendiente"],
    ["dian", "Facturación", "Política DIAN", "No conectada", "", "pendiente"],
    ["discount", "Ventas", "Descuento máximo autorizado", "", "%", "pendiente"],
    ["weekly-hours", "Laboral", "Jornada semanal máxima", "", "horas", "pendiente_validar"],
    ["night-start", "Laboral", "Inicio de jornada nocturna", "", "hora", "pendiente_validar"],
    ["night-end", "Laboral", "Fin de jornada nocturna", "", "hora", "pendiente_validar"],
    ["night-rate", "Laboral", "Recargo nocturno", "", "%", "pendiente_validar"],
    ["overtime-rate", "Laboral", "Recargo de hora extra", "", "%", "pendiente_validar"],
    ["sunday-rate", "Laboral", "Recargo dominical/festivo", "", "%", "pendiente_validar"],
    ["transport", "Laboral", "Auxilio de transporte", "", "COP", "pendiente_validar"],
    ["smmlv", "Laboral", "SMMLV", "", "COP", "pendiente_validar"],
    ["holidays", "Laboral", "Festivos (fechas ISO separadas por coma)", "", "", "pendiente_validar"],
    ["location-ahumadero", "Ubicaciones", "Nombre del ahumadero", "Ahumadero", "", "configurado"],
    ["location-galeria", "Ubicaciones", "Nombre de galería", "Galería", "", "configurado"],
    ["location-ruta-1", "Ubicaciones", "Nombre de ruta", "Ruta Valle", "", "configurado"],
    ["truck", "Rutas", "Camión asignado", "Camión de demostración", "", "configurado"],
    ["stock-alert", "Inventario", "Días de alerta de vencimiento", "7", "días", "configurado"],
    ["purchase-template", "Compras", "Plantilla WhatsApp", "Pedido Ahumados del Valle", "", "configurado"],
    ["stage-skip", "Planta", "Omitir etapas con autorización", "Solo administrador con motivo", "", "configurado"],
  ].map(([id = "", category = "", label = "", value = "", unit = "", status = "pendiente"]) => ({ id, category, label, value, unit, status: status as "configurado" | "pendiente" | "pendiente_validar", updatedAt: now, updatedBy: "Datos de demostración" }));
  const balances = products.flatMap((p, i) => [
    { productId: p.id, locationId: "ahumadero" as const, quantity: p.control === "unidad" ? 40 : 50000 },
    { productId: p.id, locationId: "galeria" as const, quantity: p.control === "unidad" ? 20 : (i === 3 ? 2000 : 20000) },
    { productId: p.id, locationId: "ruta-1" as const, quantity: i === 18 ? 7000 : i === 20 ? 10000 : 0 },
  ]);
  const sale = { id: "s-demo-1", number: "#GAL-1", locationId: "galeria" as const, customerId: "c1", items: [{ productId: "prod-19", name: "Costilla al X mayor", quantity: 2000, control: "peso" as const, price: 40000, total: 80000, note: "" }], payments: [{ method: "fiado" as const, amount: 80000 }], total: 80000, status: "pagada" as const, createdAt: now, actor: "Vendedor de galería", note: "Venta de ejemplo", baskets: 0, requiresDian: false, dianStatus: "no_conectada" as const, cufe: null, syncStatus: "sincronizada" as const };
  return {
    products, customers, settings, balances,
    locations: [{ id: "ahumadero", name: "Ahumadero", active: true }, { id: "galeria", name: "Galería", active: true }, { id: "ruta-1", name: "Ruta Valle", active: true }],
    sales: [sale, { ...sale, id: "s-demo-2", number: "#RUT-1", locationId: "ruta-1", customerId: "c2", items: [{ ...sale.items[0], productId: "prod-19", name: "Costilla al X mayor", quantity: 3000, control: "peso", price: 40000, total: 120000, note: "" }], payments: [{ method: "efectivo", amount: 60000 }, { method: "nequi", amount: 60000 }], total: 120000 }],
    movements: [{ id: "mv-seed-1", productId: "prod-19", quantity: 10000, from: "ahumadero", to: "ruta-1", type: "despacho", reference: "dispatch-demo", actor: "Administrador", createdAt: now, reason: "Carga de ejemplo" }, { id: "mv-seed-2", productId: "prod-19", quantity: 3000, from: "ruta-1", to: null, type: "venta", reference: "s-demo-2", actor: "Empleado de ruta", createdAt: now, reason: "Venta de ejemplo" }, { id: "mv-seed-3", productId: "prod-21", quantity: 10000, from: "ahumadero", to: "ruta-1", type: "despacho", reference: "dispatch-demo", actor: "Administrador", createdAt: now, reason: "Carga de ejemplo" }],
    lots: [{ id: "lot-demo-1", productId: "prod-20", supplierId: "sup1", locationId: "ahumadero", stage: "crudo", initialGrams: 20000, grams: 20000, units: 0, cost: 240000, expiresAt: `${Number(date.slice(0, 4)) + 1}${date.slice(4)}`, createdAt: now, history: [{ stage: "crudo", grams: 20000, date: now, actor: "Recepción" }] }, { id: "lot-demo-2", productId: "prod-20", supplierId: "sup1", locationId: "ahumadero", stage: "ahumado", initialGrams: 20000, grams: 14000, units: 0, cost: 240000, expiresAt: date, createdAt: now, history: [{ stage: "crudo", grams: 20000, date: now, actor: "Recepción" }, { stage: "marinado", grams: 21000, date: now, actor: "Planta" }, { stage: "ahumado", grams: 14000, date: now, actor: "Planta" }] }],
    seasonings: [{ id: "cond1", alias: "Mezcla verde A", stockGrams: 8000, minimumGrams: 1000 }, { id: "cond2", alias: "Mezcla roja B", stockGrams: 3000, minimumGrams: 500 }, { id: "cond3", alias: "Mezcla ámbar C", stockGrams: 500, minimumGrams: 600 }],
    recipes: [{ id: "rec1", productId: "prod-20", lines: [{ seasoningId: "cond1", gramsPerKg: 15 }, { seasoningId: "cond2", gramsPerKg: 8 }] }],
    suppliers: [{ id: "sup1", name: "Proveedor de carnes · ejemplo", phone: "", productIds: ["prod-20", "prod-9", "prod-19"], note: "Contactos pendientes de configurar" }, { id: "sup2", name: "Proveedor de embutidos · ejemplo", phone: "", productIds: ["prod-1", "prod-12"], note: "" }],
    purchases: [{ id: "oc-demo", supplierId: "sup1", productId: "prod-20", quantity: 30000, received: 20000, status: "parcial", createdAt: now }],
    dispatches: [{ id: "dispatch-demo", name: "Ruta Valle", employee: "Empleado de ruta", vehicle: "Camión de demostración", date, status: "en_ruta", signed: true, lines: [{ productId: "prod-19", loaded: 10000, returned: 0 }, { productId: "prod-21", loaded: 10000, returned: 0 }] }],
    settlements: [], employees: [
      { id: "u-admin", name: "Administrador", username: "admin", role: "admin", hourlyRate: 0, active: true },
      { id: "u-contador", name: "Contador de demostración", username: "contador", role: "contador", hourlyRate: 0, active: true },
      { id: "u-recepcion", name: "Recepción de demostración", username: "recepcion", role: "recepcion", hourlyRate: 8000, active: true },
      { id: "u-galeria", name: "Vendedor de galería", username: "galeria", role: "vendedor", hourlyRate: 8000, active: true },
      { id: "u-ruta", name: "Empleado de ruta", username: "ruta", role: "ruta", hourlyRate: 8000, active: true },
      { id: "u-planta", name: "Operario de ahumado", username: "planta", role: "planta", hourlyRate: 8000, active: true },
    ],
    attendance: [{ id: "att1", employeeId: "u-planta", date, entry: "08:00", exit: "17:00", hours: 9, overtimeHours: 1, incident: "Hora extra pendiente de autorización" }], overtime: [], labor: [],
    versions: [], hardware: [{ id: "scale", name: "Báscula", model: "", connection: "", protocol: "", status: "Pendiente de configurar", note: "Compatibilidad pendiente de validar" }, { id: "printer", name: "Impresora", model: "", connection: "Bluetooth", protocol: "", status: "Pendiente de configurar", note: "Impresión de demostración" }, { id: "clock", name: "Reloj biométrico", model: "", connection: "CSV", protocol: "employeeId,date,entry,exit", status: "Pendiente de configurar", note: "Importación de demostración" }],
    integrations: ["Wompi", "Correo", "WhatsApp", "DIAN"].map((name) => ({ id: name.toLowerCase(), name, environment: "sandbox", status: "no_configurada", configured: false, maskedSuffix: "", lastUpdatedAt: now, lastTestAt: "" })),
    audit: [{ id: "audit-seed", module: "Producción", action: "Merma requiere revisión", entityId: "lot-demo-2", actor: "Planta", createdAt: now, reason: "Lote de ejemplo: merma por encima del 20% de referencia", before: "20,000 kg", after: "14,000 kg", technical: false }],
    closings: [], imports: [], customerMovements: [], propertyExpenses: [],
  };
}

export function businessDb(): BusinessSnapshot {
  if (cache) return cache;
  if (typeof window === "undefined") return seed();
  try { cache = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as BusinessSnapshot | null ?? seed(); }
  catch { cache = seed(); }
  const defaults = seed().settings;
  for (const value of defaults) if (!cache.settings.some(s => s.id === value.id)) cache.settings.push(value);
  const today = todayBogota();
  for (const s of cache.settings) {
    const due = cache.versions.filter(v => v.settingId === s.id && v.effectiveFrom <= today).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
    if (due && due.effectiveFrom > todayBogota(new Date(s.updatedAt))) {
      s.value = due.after; s.updatedAt = `${due.effectiveFrom}T12:00:00-05:00`; s.updatedBy = due.actor; s.status = due.after ? "configurado" : "pendiente";
      const location = cache.locations.find(l => `location-${l.id}` === s.id);
      if (location) location.name = due.after;
    }
  }
  return cache;
}
export function saveBusiness() {
  if (typeof window !== "undefined" && cache) window.localStorage.setItem(KEY, JSON.stringify(cache));
}