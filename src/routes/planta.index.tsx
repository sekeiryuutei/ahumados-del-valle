import { createFileRoute } from "@tanstack/react-router";
import { ProductionPage } from "@/components/operations/inventory";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/planta/")({
  head: () => pageHead("Ahumado · Ahumado y planta"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <ProductionPage />
    </OperationsScreen>
  );
}
