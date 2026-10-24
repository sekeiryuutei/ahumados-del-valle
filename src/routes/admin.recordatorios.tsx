import { createFileRoute } from "@tanstack/react-router";
import { RemindersPage } from "@/components/operations/reminders";
import { OperationsScreen } from "@/components/operations/screen";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/admin/recordatorios")({ head: () => pageHead("Recordatorios de arriendo"), component: Page });
function Page() { return <OperationsScreen><RemindersPage /></OperationsScreen>; }