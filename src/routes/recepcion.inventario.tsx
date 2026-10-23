import { createFileRoute } from "@tanstack/react-router";
import { InventoryPage } from "@/components/operations/inventory";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/recepcion/inventario")({
  head: () => pageHead("Inventario · Recepción de cajas"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <InventoryPage />
    </OperationsScreen>
  );
}
