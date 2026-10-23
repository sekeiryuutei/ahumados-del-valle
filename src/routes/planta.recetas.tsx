import { createFileRoute } from "@tanstack/react-router";
import { RecipesPage } from "@/components/operations/inventory";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/planta/recetas")({
  head: () => pageHead("Preparación · Ahumado y planta"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <RecipesPage />
    </OperationsScreen>
  );
}
