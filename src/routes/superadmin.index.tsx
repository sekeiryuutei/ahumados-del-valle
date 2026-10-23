import { createFileRoute } from "@tanstack/react-router";
import { IntegrationsPage } from "@/components/operations/settings";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/superadmin/")({
  head: () => pageHead("Integraciones · Administración técnica"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <IntegrationsPage />
    </OperationsScreen>
  );
}
