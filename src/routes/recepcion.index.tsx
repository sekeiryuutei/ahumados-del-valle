import { createFileRoute } from "@tanstack/react-router";
import { ReceivingPage } from "@/components/operations/inventory";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/recepcion/")({
  head: () => pageHead("Recibir cajas · Recepción de cajas"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <ReceivingPage />
    </OperationsScreen>
  );
}
