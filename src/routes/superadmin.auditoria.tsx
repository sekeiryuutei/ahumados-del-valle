import { createFileRoute } from "@tanstack/react-router";
import { AuditPage } from "@/components/operations/settings";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/superadmin/auditoria")({
  head: () => pageHead("Auditoría · Administración técnica"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <AuditPage technical />
    </OperationsScreen>
  );
}
