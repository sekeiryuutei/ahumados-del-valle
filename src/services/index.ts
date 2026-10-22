// Fábrica de servicios. Para conectar el backend real, reemplaza la implementación
// aquí (p. ej. httpServices) sin tocar las pantallas.
import type { Services } from "./contracts";
import { mockServices } from "./mock";
import { businessServices } from "./mock/business";

export const services: Services = { ...mockServices, ...businessServices };
export { ServiceError } from "./contracts";
export type * from "./contracts";

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "userMessage" in e) return String((e as { userMessage: string }).userMessage);
  return "Algo no salió bien. Intenta de nuevo en un momento.";
}
