import { createFileRoute } from "@tanstack/react-router";
import { BusinessDashboard } from "@/components/operations/dashboard";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/admin/")({
  head: () => pageHead("Control del negocio"),
  component: AdminHome,
});
function AdminHome() {
  return (
    <OperationsScreen>
      <BusinessDashboard />
    </OperationsScreen>
  );
}
