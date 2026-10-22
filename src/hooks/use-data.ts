import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { services } from "@/services";

export const q = {
  business: () => queryOptions({ queryKey: ["business"], queryFn: () => services.business.snapshot() }),
  summary: () => queryOptions({ queryKey: ["summary"], queryFn: () => services.dashboard.rentalSummary() }),
  tenants: () => queryOptions({ queryKey: ["tenants"], queryFn: () => services.tenants.list() }),
  account: (id: string) => queryOptions({ queryKey: ["account", id], queryFn: () => services.tenants.getAccount(id) }),
  properties: (status?: "disponible") =>
    queryOptions({ queryKey: ["properties", status ?? "all"], queryFn: () => services.properties.list(status ? { status } : undefined) }),
  payments: (tenantId?: string) =>
    queryOptions({ queryKey: ["payments", tenantId ?? "all"], queryFn: () => services.payments.list(tenantId ? { tenantId } : undefined) }),
  surcharge: () => queryOptions({ queryKey: ["surcharge"], queryFn: () => services.settings.getSurcharge() }),
  surchargeHistory: () => queryOptions({ queryKey: ["surcharge", "history"], queryFn: () => services.settings.getSurchargeHistory() }),
};

/** Tras cualquier cambio, refresca todo lo visible. */
export function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}
