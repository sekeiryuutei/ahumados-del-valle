import { createFileRoute } from "@tanstack/react-router";
import { PosPage } from "@/components/operations/pos";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/ruta/vender")({
  head: () => pageHead("Vender · Empleados de ruta"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <PosPage location="ruta-1" />
    </OperationsScreen>
  );
}
