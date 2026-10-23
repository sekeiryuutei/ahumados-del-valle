import { createFileRoute } from '@tanstack/react-router';
import { InventoryPage } from '@/components/operations/inventory';
import { OperationsScreen } from '@/components/operations/screen';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/admin/inventario')({ head:()=>pageHead('Inventario'), component: Page });
function Page() { return <OperationsScreen><InventoryPage /></OperationsScreen>; }
