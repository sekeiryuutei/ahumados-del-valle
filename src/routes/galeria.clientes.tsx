import { createFileRoute } from "@tanstack/react-router";
import { CustomersPage } from "@/components/operations/catalog";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/galeria/clientes")({
  head: () => pageHead("Clientes · Ventas de galería"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <CustomersPage />
    </OperationsScreen>
  );
}
