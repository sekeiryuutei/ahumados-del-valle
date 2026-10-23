import { createFileRoute } from '@tanstack/react-router';
import { PurchasesPage } from '@/components/operations/routes-purchases';
import { OperationsScreen } from '@/components/operations/screen';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/admin/compras')({ head:()=>pageHead('Compras'), component: Page });
function Page() { return <OperationsScreen><PurchasesPage /></OperationsScreen>; }
