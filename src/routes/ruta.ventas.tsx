import { createFileRoute } from "@tanstack/react-router";
import { SalesPage } from "@/components/operations/pos";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/ruta/ventas")({
  head: () => pageHead("Tirillas · Empleados de ruta"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <SalesPage location="ruta-1" />
    </OperationsScreen>
  );
}
