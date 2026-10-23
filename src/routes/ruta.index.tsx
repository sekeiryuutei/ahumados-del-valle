import { createFileRoute } from "@tanstack/react-router";
import { RoutesPage } from "@/components/operations/routes-purchases";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/ruta/")({
  head: () => pageHead("Mi ruta · Empleados de ruta"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <RoutesPage />
    </OperationsScreen>
  );
}
