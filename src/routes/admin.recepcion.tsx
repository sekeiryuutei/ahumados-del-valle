import { createFileRoute } from "@tanstack/react-router";
import { ReceivingPage } from "@/components/operations/inventory";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/admin/recepcion")({
  head: () => pageHead("Recepción"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <ReceivingPage />
    </OperationsScreen>
  );
}
