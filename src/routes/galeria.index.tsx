import { createFileRoute } from "@tanstack/react-router";
import { PosPage } from "@/components/operations/pos";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/galeria/")({
  head: () => pageHead("Vender · Ventas de galería"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <PosPage />
    </OperationsScreen>
  );
}
