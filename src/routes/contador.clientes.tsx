import { createFileRoute } from "@tanstack/react-router";
import { CustomersPage } from "@/components/operations/catalog";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/contador/clientes")({
  head: () => pageHead("Clientes · Contabilidad"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <CustomersPage />
    </OperationsScreen>
  );
}
