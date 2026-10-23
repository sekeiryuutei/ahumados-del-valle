import { createFileRoute } from "@tanstack/react-router";
import { CashPage } from "@/components/operations/pos";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/galeria/caja")({
  head: () => pageHead("Caja · Ventas de galería"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <CashPage />
    </OperationsScreen>
  );
}
