import { createFileRoute } from '@tanstack/react-router';
import { SalesPage } from '@/components/operations/pos';
import { OperationsScreen } from '@/components/operations/screen';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/admin/ventas')({ head:()=>pageHead('Ventas y tirillas'), component: Page });
function Page() { return <OperationsScreen><SalesPage /></OperationsScreen>; }
