import { pageHead } from '@/lib/page-head';
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/hooks/use-data";
import { useSession } from "@/hooks/use-session";
import { errorMessage } from "@/services";
import { Empty, ErrorBox, Loading, PageHeader } from "@/components/app/ui-bits";
import { PaymentList } from "@/components/app/PaymentList";

export const Route = createFileRoute("/inquilino/historial")({ head: () => pageHead("Mi historial de pagos"), component: History });

function History() {
  const session = useSession();
  const tenantId = session?.user.tenantId ?? "";
  const list = useQuery({ ...q.payments(tenantId), enabled: !!tenantId });
  return (
    <>
      <PageHeader title="Mi historial" subtitle="Todos tus pagos de arriendo." />
      {list.isLoading ? <Loading /> : list.error ? <ErrorBox message={errorMessage(list.error)} onRetry={() => list.refetch()} /> : (list.data ?? []).length === 0 ? (
        <Empty title="Aún no tienes pagos" />
      ) : (
        <PaymentList payments={(list.data ?? [])} />
      )}
    </>
  );
}
