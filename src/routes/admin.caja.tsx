import { createFileRoute } from '@tanstack/react-router';
import { CashPage } from '@/components/operations/pos';
import { OperationsScreen } from '@/components/operations/screen';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/admin/caja')({ head:()=>pageHead('Cierre de caja'), component: Page });
function Page() { return <OperationsScreen><CashPage location="ahumadero"/></OperationsScreen>; }
