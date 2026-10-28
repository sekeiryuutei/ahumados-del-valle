import { pendingPeriods } from "@/domain/rent";
import { matchesPortal } from "@/domain/portals";
import type { RentPayment, Session, TenantAccount } from "@/domain/types";
import { currentPeriod, todayBogota } from "@/lib/format";
import { ServiceError, type RentalServices } from "../contracts";
import { db, delay, save, uid } from "./db";

const SESSION_KEY = "adv.session.v1";
const listeners = new Set<() => void>();
let sessionCache: Session | null | undefined;

function readSession(): Session | null {
  if (sessionCache !== undefined) return sessionCache;
  if (typeof window === "undefined") return null;
  try {
    sessionCache = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? "null");
  } catch {
    sessionCache = null;
  }
  return sessionCache ?? null;
}

function writeSession(s: Session | null) {
  sessionCache = s;
  if (s) window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else window.localStorage.removeItem(SESSION_KEY);
  listeners.forEach((l) => l());
}

function account(tenantId: string): TenantAccount {
  const d = db();
  const tenant = d.tenants.find((t) => t.id === tenantId);
  if (!tenant) throw new ServiceError("no_encontrado", "No encontramos este inquilino.");
  const lease = d.leases.find((l) => l.tenantId === tenantId && l.status === "vigente") ?? null;
  const property = lease ? (d.properties.find((p) => p.id === lease.propertyId) ?? null) : null;
  const pending = lease ? pendingPeriods(lease, d.payments, todayBogota()) : [];
  return { tenant, lease, property, pending, balance: pending.reduce((s, p) => s + p.amount, 0) };
}

function currentSurcharge() {
  const h = db().surchargeHistory;
  const current = h[h.length - 1];
  if (!current) throw new ServiceError("no_encontrado", "Configura el recargo de pagos.");
  return current;
}

function actorName() {
  return readSession()?.user.name ?? "Sistema";
}

function rentalAccess(tenantId?: string) {
  const user = readSession()?.user;
  if (user?.role === "admin" || user?.role === "contador") return;
  if (tenantId && user?.role === "inquilino" && user.tenantId === tenantId) return;
  throw new ServiceError("validacion", "Tu usuario no tiene acceso a estos datos.");
}
function rentalAdmin() {
  if (readSession()?.user.role !== "admin")
    throw new ServiceError("validacion", "Solo la administración puede hacer este cambio.");
}

export const mockServices: RentalServices = {
  auth: {
    async login(portal, username, password) {
      await delay(400);
      const key = username.trim().toLowerCase();
      const cred = db().credentials[key];
      if (
        !cred ||
        cred.active === false ||
        cred.password !== password ||
        !matchesPortal(cred.role, portal)
      ) {
        throw new ServiceError(
          "credenciales",
          "Usuario o clave incorrectos. Revisa e intenta de nuevo.",
        );
      }
      if (cred.role === "inquilino") {
        const t = db().tenants.find((x) => x.id === cred.refId);
        if (!t?.active)
          throw new ServiceError(
            "credenciales",
            "Tu acceso está desactivado. Comunícate con la administración.",
          );
      }
      const session: Session = {
        user: {
          id: cred.refId,
          name: cred.name,
          username: key,
          role: cred.role,
          tenantId: cred.role === "inquilino" ? cred.refId : undefined,
        },
        startedAt: new Date().toISOString(),
      };
      writeSession(session);
      return session;
    },
    async logout() {
      writeSession(null);
    },
    getSession: readSession,
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  },

  properties: {
    async list(filter) {
      const role = readSession()?.user.role;
      if (role !== "admin" && role !== "contador" && role !== "inquilino")
        throw new ServiceError("validacion", "Tu cargo no tiene acceso a los locales.");
      await delay();
      const tenant = readSession()?.user.role === "inquilino";
      return structuredClone(
        db().properties.filter((p) =>
          tenant ? p.status === "disponible" : !filter?.status || p.status === filter.status,
        ),
      );
    },
    async create(input) {
      rentalAdmin();
      await delay();
      const d = db();
      if (d.properties.some((p) => p.code.toLowerCase() === input.code.toLowerCase()))
        throw new ServiceError("conflicto", `Ya existe un local con el código ${input.code}.`);
      const p = { id: uid("p"), ...input };
      d.properties.push(p);
      save();
      return p;
    },
    async update(id, input) {
      rentalAdmin();
      await delay();
      const p = db().properties.find((x) => x.id === id);
      if (!p) throw new ServiceError("no_encontrado", "No encontramos este local.");
      Object.assign(p, input);
      save();
      return p;
    },
  },

  tenants: {
    async list() {
      rentalAccess();
      await delay();
      return db().tenants.map((t) => account(t.id));
    },
    async getAccount(id) {
      rentalAccess(id);
      await delay();
      return account(id);
    },
    async create(input) {
      rentalAdmin();
      await delay(400);
      const d = db();
      const username = input.username.trim().toLowerCase();
      if (d.credentials[username])
        throw new ServiceError("conflicto", "Ese usuario ya está en uso. Elige otro.");
      const property = d.properties.find((p) => p.id === input.propertyId);
      if (!property || property.status !== "disponible")
        throw new ServiceError("validacion", "El local elegido ya no está disponible.");
      const tenant = {
        id: uid("t"),
        name: input.name.trim(),
        document: input.document.trim(),
        phone: input.phone.trim(),
        email: input.email.trim(),
        username,
        active: true,
        createdAt: new Date().toISOString(),
      };
      d.tenants.push(tenant);
      d.credentials[username] = {
        password: input.password,
        role: "inquilino",
        refId: tenant.id,
        name: tenant.name,
      };
      d.leases.push({
        id: uid("l"),
        tenantId: tenant.id,
        propertyId: property.id,
        monthlyRent: input.monthlyRent,
        cutoffDay: input.cutoffDay,
        startDate: input.startDate,
        endDate: input.endDate,
        status: "vigente",
      });
      property.status = "ocupado";
      save();
      return tenant;
    },
    async setActive(id, active) {
      rentalAdmin();
      await delay();
      const t = db().tenants.find((x) => x.id === id);
      if (!t) throw new ServiceError("no_encontrado", "No encontramos este inquilino.");
      t.active = active;
      save();
      return t;
    },
    async resetPassword(id, password) {
      rentalAdmin();
      await delay();
      const d = db();
      const t = d.tenants.find((x) => x.id === id);
      if (!t) throw new ServiceError("no_encontrado", "No encontramos este inquilino.");
      const c = d.credentials[t.username];
      if (c) c.password = password;
      save();
    },
  },

  leases: {
    async end(leaseId) {
      rentalAdmin();
      await delay();
      const d = db();
      const l = d.leases.find((x) => x.id === leaseId);
      if (!l) throw new ServiceError("no_encontrado", "No encontramos este contrato.");
      l.status = "finalizado";
      const p = d.properties.find((x) => x.id === l.propertyId);
      if (p) p.status = "disponible";
      save();
      return l;
    },
  },

  payments: {
    async list(filter) {
      rentalAccess(filter?.tenantId);
      await delay();
      return db()
        .payments.filter((p) => !filter?.tenantId || p.tenantId === filter.tenantId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async registerManual(input) {
      rentalAdmin();
      await delay(350);
      const acc = account(input.tenantId);
      if (!acc.lease)
        throw new ServiceError("validacion", "Este inquilino no tiene contrato vigente.");
      if (!acc.pending.some((p) => p.period === input.period))
        throw new ServiceError("conflicto", "Ese mes ya está pagado.");
      const pay: RentPayment = {
        id: uid("pay"),
        reference: `ADV-${input.period.replace("-", "")}-${uid("").slice(1, 6).toUpperCase()}`,
        leaseId: acc.lease.id,
        tenantId: input.tenantId,
        period: input.period,
        rentAmount: acc.lease.monthlyRent,
        surcharge: 0,
        total: acc.lease.monthlyRent,
        method: input.method,
        status: "pagado",
        createdAt: new Date().toISOString(),
        registeredBy: actorName(),
        demo: true,
        note: input.note,
      };
      db().payments.push(pay);
      save();
      return pay;
    },
    async startOnline(input) {
      rentalAccess(input.tenantId);
      await delay(500);
      const acc = account(input.tenantId);
      if (!acc.lease) throw new ServiceError("validacion", "No tienes un contrato vigente.");
      if (!acc.pending.some((p) => p.period === input.period))
        throw new ServiceError("conflicto", "Ese mes ya está pagado o en proceso.");
      const surcharge = currentSurcharge().amount;
      const pay: RentPayment = {
        id: uid("pay"),
        reference: `WMP-${input.period.replace("-", "")}-${uid("").slice(1, 7).toUpperCase()}`,
        leaseId: acc.lease.id,
        tenantId: input.tenantId,
        period: input.period,
        rentAmount: acc.lease.monthlyRent,
        surcharge,
        total: acc.lease.monthlyRent + surcharge,
        method: "wompi",
        channel: input.channel,
        status: "en_proceso",
        createdAt: new Date().toISOString(),
        registeredBy: "Inquilino",
        demo: true,
      };
      db().payments.push(pay);
      save();
      return pay;
    },
    async resolveDemo(id, result) {
      await delay(1200);
      const p = db().payments.find((x) => x.id === id);
      if (!p) throw new ServiceError("no_encontrado", "No encontramos este pago.");
      rentalAccess(p.tenantId);
      if (p.status !== "en_proceso")
        throw new ServiceError("conflicto", "Este pago ya tiene un resultado.");
      p.status = result;
      save();
      return p;
    },
  },

  settings: {
    async getSurcharge() {
      await delay(150);
      return currentSurcharge();
    },
    async getSurchargeHistory() {
      await delay(150);
      return [...db().surchargeHistory].reverse();
    },
    async updateSurcharge({ amount, reason }) {
      rentalAdmin();
      await delay();
      if (!Number.isInteger(amount) || amount < 0)
        throw new ServiceError(
          "validacion",
          "El recargo debe ser un valor en pesos sin decimales.",
        );
      const d = db();
      const next = {
        amount,
        reason: reason.trim() || "Sin motivo",
        effectiveFrom: todayBogota(),
        version: currentSurcharge().version + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: actorName(),
      };
      d.surchargeHistory.push(next);
      save();
      return next;
    },
  },

  dashboard: {
    async rentalSummary() {
      rentalAccess();
      await delay();
      const d = db();
      const period = currentPeriod();
      const accounts = d.tenants.map((t) => account(t.id));
      const active = d.leases.filter((l) => l.status === "vigente");
      return {
        totalProperties: d.properties.length,
        occupied: d.properties.filter((p) => p.status === "ocupado").length,
        available: d.properties.filter((p) => p.status === "disponible").length,
        maintenance: d.properties.filter((p) => p.status === "mantenimiento").length,
        expectedThisMonth: active.reduce((s, l) => s + l.monthlyRent, 0),
        collectedThisMonth: d.payments
          .filter((p) => p.period === period && p.status === "pagado")
          .reduce((s, p) => s + p.rentAmount, 0),
        pendingTenants: accounts.filter((a) => a.pending.length > 0).length,
        totalDebt: accounts.reduce((s, a) => s + a.balance, 0),
      };
    },
  },
};
