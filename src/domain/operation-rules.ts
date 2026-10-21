import type { Payment, Product } from "./operations";

export function itemTotal(product: Pick<Product, "control">, quantity: number, price: number): number {
  return Math.round(price * quantity / (product.control === "unidad" ? 1 : 1000));
}
export function netWeight(gross: number, tare: number, boxes: number): number {
  return Math.max(0, gross - tare * boxes);
}
export function validatePayments(payments: Payment[], total: number): boolean {
  return payments.length > 0 && payments.every((p) => Number.isInteger(p.amount) && p.amount > 0) && payments.reduce((sum, p) => sum + p.amount, 0) === total;
}
export function shrinkage(initial: number, final: number): number {
  return initial > 0 ? (initial - final) / initial * 100 : 0;
}
export function stockAfterSale(available: number, requested: number): number {
  if (!Number.isInteger(requested) || requested <= 0 || requested > available) throw new Error("Cantidad superior al saldo disponible.");
  return available - requested;
}
export function reconciliationState(difference: number, loaded: number, tolerance: number): string {
  if (difference === 0) return "Correcto";
  if (difference > 0 && loaded > 0 && difference / loaded * 100 <= tolerance) return "Pérdida normal";
  return "Requiere revisión";
}