import { createFileRoute } from '@tanstack/react-router';
import { ImportsPage } from '@/components/operations/payroll';
import { OperationsScreen } from '@/components/operations/screen';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/admin/importaciones')({ head:()=>pageHead('Importaciones'), component: Page });
function Page() { return <OperationsScreen><ImportsPage /></OperationsScreen>; }
