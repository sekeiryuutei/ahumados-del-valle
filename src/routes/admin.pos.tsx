import { createFileRoute } from '@tanstack/react-router';
import { PosPage } from '@/components/operations/pos';
import { OperationsScreen } from '@/components/operations/screen';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/admin/pos')({ head:()=>pageHead('Punto de venta'), component: Page });
function Page() { return <OperationsScreen><PosPage location="ahumadero"/></OperationsScreen>; }
