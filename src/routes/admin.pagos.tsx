import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { q } from "@/hooks/use-data";
import { errorMessage } from "@/services";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Empty, ErrorBox, Loading, PageHeader } from "@/components/app/ui-bits";
import { PaymentList } from "@/components/app/PaymentList";
import { DemoBadge } from "@/components/app/status";

export const Route = createFileRoute("/admin/pagos")({
  head: () => pageHead("Pagos de arriendo"),
  component: PaymentsPage,
});

function PaymentsPage() {
  const [tenant, setTenant] = useState("all");
  const tenants = useQuery(q.tenants());
  const payments = useQuery(q.payments(tenant === "all" ? undefined : tenant));
  const names = Object.fromEntries((tenants.data ?? []).map((a) => [a.tenant.id, a.tenant.name]));

  return (
    <>
      <PageHeader
        title="Pagos recibidos"
        subtitle="Historial de todos los pagos de arriendo."
        action={
          <Select value={tenant} onValueChange={setTenant}>
            <SelectTrigger className="h-12 w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los inquilinos</SelectItem>
              {tenants.data?.map((a) => (
                <SelectItem key={a.tenant.id} value={a.tenant.id}>
                  {a.tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <div className="mb-4">
        <DemoBadge />
      </div>
      {payments.isLoading ? (
        <Loading />
      ) : payments.error ? (
        <ErrorBox message={errorMessage(payments.error)} onRetry={() => payments.refetch()} />
      ) : (payments.data ?? []).length === 0 ? (
        <Empty title="Sin pagos" text="Aquí aparecerán los pagos registrados." />
      ) : (
        <PaymentList payments={payments.data ?? []} names={names} />
      )}
    </>
  );
}
