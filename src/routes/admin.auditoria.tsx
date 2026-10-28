import { createFileRoute } from "@tanstack/react-router";
import { AuditPage } from "@/components/operations/settings";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/admin/auditoria")({
  head: () => pageHead("Auditoría"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <AuditPage />
    </OperationsScreen>
  );
}
