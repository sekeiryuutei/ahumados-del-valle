import { createFileRoute } from '@tanstack/react-router';
import { ExpensesPage } from '@/components/operations/dashboard';
import { OperationsScreen } from '@/components/operations/screen';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/admin/gastos')({ head:()=>pageHead('Gastos de locales'), component: Page });
function Page() { return <OperationsScreen><ExpensesPage /></OperationsScreen>; }
