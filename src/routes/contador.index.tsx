import { createFileRoute } from "@tanstack/react-router";
import { BusinessDashboard } from "@/components/operations/dashboard";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/contador/")({
  head: () => pageHead("Resumen · Contabilidad"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <BusinessDashboard accounting />
    </OperationsScreen>
  );
}
