import type { Role } from "./types";

export const roleHomes = {
  admin: "/admin",
  inquilino: "/inquilino",
  contador: "/contador",
  recepcion: "/recepcion",
  vendedor: "/galeria",
  ruta: "/ruta",
  planta: "/planta",
  superadmin: "/superadmin",
} as const satisfies Record<Role, string>;

export const roleLabels: Record<Role, string> = {
  admin: "Administración",
  inquilino: "Inquilinos",
  contador: "Contabilidad",
  recepcion: "Recepción de cajas",
  vendedor: "Ventas de galería",
  ruta: "Empleados de ruta",
  planta: "Ahumado y planta",
  superadmin: "Administración técnica",
};

export const employeeRoles = [
  "admin",
  "recepcion",
  "contador",
  "ruta",
  "vendedor",
  "planta",
] as const;

export function matchesPortal(role: Role, portal: "inquilino" | "ahumadero" | Role): boolean {
  if (portal === "ahumadero") return role !== "inquilino";
  return portal === role;
}
