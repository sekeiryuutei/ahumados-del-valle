import { createFileRoute } from '@tanstack/react-router';
import { RecipesPage } from '@/components/operations/inventory';
import { OperationsScreen } from '@/components/operations/screen';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/admin/recetas')({ head:()=>pageHead('Recetas'), component: Page });
function Page() { return <OperationsScreen><RecipesPage /></OperationsScreen>; }
