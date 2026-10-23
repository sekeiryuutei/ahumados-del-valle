import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/components/operations/settings';
import { OperationsScreen } from '@/components/operations/screen';
import { pageHead } from '@/lib/page-head';
export const Route = createFileRoute('/admin/configuracion')({ head:()=>pageHead('Configuración'), component: Page });
function Page() { return <OperationsScreen><SettingsPage /></OperationsScreen>; }
