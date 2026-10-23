import { createFileRoute } from '@tanstack/react-router';
import { EmployeesPage } from '@/components/operations/catalog';
import { OperationsScreen } from '@/components/operations/screen';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/admin/empleados')({ head:()=>pageHead('Empleados'), component: Page });
function Page() { return <OperationsScreen><EmployeesPage /></OperationsScreen>; }
