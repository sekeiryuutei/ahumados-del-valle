import { createFileRoute } from "@tanstack/react-router";
import { PayrollPage } from "@/components/operations/payroll";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/contador/nomina")({
  head: () => pageHead("Asistencia · Contabilidad"),
  component: Page,
});
function Page() {
  return (
    <OperationsScreen>
      <PayrollPage />
    </OperationsScreen>
  );
}
