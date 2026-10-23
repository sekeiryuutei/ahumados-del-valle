import { createFileRoute } from "@tanstack/react-router";
import { SalesPage } from "@/components/operations/pos";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/galeria/ventas")({
  head: () => pageHead("Tirillas · Ventas de galería"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <SalesPage />
    </OperationsScreen>
  );
}
