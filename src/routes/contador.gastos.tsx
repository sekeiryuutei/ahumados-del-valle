import { createFileRoute } from "@tanstack/react-router";
import { ExpensesPage } from "@/components/operations/dashboard";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/contador/gastos")({
  head: () => pageHead("Gastos · Contabilidad"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <ExpensesPage />
    </OperationsScreen>
  );
}
