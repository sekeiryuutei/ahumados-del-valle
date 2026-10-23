import { createFileRoute } from '@tanstack/react-router';
import { PayrollPage } from '@/components/operations/payroll';
import { OperationsScreen } from '@/components/operations/screen';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/admin/nomina')({ head:()=>pageHead('Asistencia y preliquidación'), component: Page });
function Page() { return <OperationsScreen><PayrollPage /></OperationsScreen>; }
