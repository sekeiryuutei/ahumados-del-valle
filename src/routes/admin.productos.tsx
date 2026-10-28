import { createFileRoute } from "@tanstack/react-router";
import { ProductsPage } from "@/components/operations/catalog";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/admin/productos")({
  head: () => pageHead("Productos y precios"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <ProductsPage />
    </OperationsScreen>
  );
}
