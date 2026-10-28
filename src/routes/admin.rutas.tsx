import { createFileRoute } from "@tanstack/react-router";
import { RoutesPage } from "@/components/operations/routes-purchases";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/admin/rutas")({
  head: () => pageHead("Rutas"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <RoutesPage />
    </OperationsScreen>
  );
}
