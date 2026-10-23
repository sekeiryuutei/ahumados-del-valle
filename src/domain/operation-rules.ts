import type { Dispatch, Payment, Product, RouteReturn, Sale } from "./operations";

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

/** One reconciliation for both the preview and the committed settlement. */
export function reconcileRoute(dispatch: Dispatch, sales: Sale[], products: Product[], returns: RouteReturn[]) {
  const routeSales = sales.filter(s => s.locationId === "ruta-1" && s.status === "pagada" && new Date(s.createdAt).toLocaleDateString("en-CA", { timeZone: "America/Bogota" }) >= dispatch.date);
  const inventory = dispatch.lines.map(line => {
    const product = products.find(p => p.id === line.productId);
    const sold = routeSales.flatMap(s => s.items).filter(i => i.productId === line.productId).reduce((sum, i) => sum + i.quantity, 0);
    const returned = returns.find(r => r.productId === line.productId)?.quantity ?? 0;
    const difference = line.loaded - sold - returned;
    return { productId: line.productId, loaded: line.loaded, sold, returned, difference, state: reconciliationState(difference, line.loaded, product?.thawTolerancePercent ?? 0) };
  });
  for (const row of inventory) {
    const product = products.find(p => p.id === row.productId);
    const peers = inventory.filter(r => {
      const other = products.find(p => p.id === r.productId);
      return product?.priceGroup && other?.priceGroup === product.priceGroup && other.control === product.control && other.retailPrice === product.retailPrice && other.wholesalePrice === product.wholesalePrice;
    });
    if (row.difference !== 0 && peers.length > 1 && peers.reduce((sum, r) => sum + r.difference, 0) === 0) row.state = "Intercambio de producto";
  }
  const expected = routeSales.flatMap(s => s.payments).filter(p => p.method === "efectivo").reduce((sum, p) => sum + p.amount, 0);
  return { inventory, expected, routeSales };
}