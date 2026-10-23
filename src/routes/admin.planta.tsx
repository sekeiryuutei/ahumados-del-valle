import { createFileRoute } from '@tanstack/react-router';
import { ProductionPage } from '@/components/operations/inventory';
import { OperationsScreen } from '@/components/operations/screen';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/admin/planta')({ head:()=>pageHead('Producción'), component: Page });
function Page() { return <OperationsScreen><ProductionPage /></OperationsScreen>; }
