# Ahumados del Valle

Frontend funcional de demostración. Inquilinos y ahumadero tienen entradas separadas; cada oficio abre su propio panel. Conductor y vendedor de ruta comparten **Empleados de ruta**.

## Ejecución local

Requiere Bun. Desde la carpeta del proyecto:

```sh
bun install
bun run dev
bun run test
```

En Lovable la vista previa se actualiza automáticamente; no requiere iniciar otro servidor.

## Perfiles de prueba

Estas claves son públicas, ficticias y exclusivas de la demostración. El botón «Usar usuario de prueba» completa el perfil elegido.

| Cargo | Usuario | Clave demo | Panel |
| --- | --- | --- | --- |
| Administración | admin | admin123 | /admin |
| Contador | contador | contador123 | /contador |
| Recepción de cajas | recepcion | recepcion123 | /recepcion |
| Vendedor de galería | galeria | galeria123 | /galeria |
| Empleados de ruta | ruta | ruta123 | /ruta |
| Operario de ahumado | planta | planta123 | /planta |
| Administración técnica | tecnico | tecnico123 | /superadmin |
| Inquilina | maria | maria123 | /inquilino |
| Segundo inquilino | donjulio | julio123 | /inquilino |

La administración crea empleados e inquilinos adicionales. El inquilino solo consulta su contrato/saldo, paga y ve historial y espacios disponibles. El técnico no obtiene acceso al negocio por ser superadministrador.

## Módulos y recorridos

- Ventas por gramos o unidades, tara, pagos mixtos, fiados/abonos, canastillas, ventas suspendidas, tirillas, anulación auditada y caja.
- Despacho pesado con aceptación, stock de ruta, cola persistente, sincronización simulada, devoluciones y conciliación separada de inventario, efectivo y descongelamiento. Intercambios requieren grupo, control y precios coincidentes. Faltantes exigen motivo; pérdidas normales no generan cargo automático.
- Recepción, lotes/vencimientos, traslados, ajustes, etapas de planta, merma, recetas por alias y consultas privadas auditadas.
- Compras sugeridas, órdenes parciales, proveedores y texto de WhatsApp preparado; abrir WhatsApp no equivale a un envío automatizado.
- Configuración con vigencia e historial, auditoría con detalle completo, importaciones CSV, asistencia por empleado/día y preliquidación estimada.
- Arriendos, locales, contratos, pagos simulados Wompi con recargo inicial de **$5.000 COP**, gastos y recordatorios simulados configurables.
- Configuración técnica de credencial ficticia DEMO enmascarada y pruebas mock, sin secretos reales ni conexiones externas.

Se probaron los recorridos principales desde la interfaz y hay pruebas automatizadas de reglas, servicios, importaciones, cargos, arriendos y PWA. Dinero entero COP; peso en gramos enteros y presentación kg a tres decimales; calendario de Bogotá.

## Persistencia y límites

Los datos de prueba se guardan en el navegador con localStorage; la cola de ventas de ruta usa IndexedDB. No se comparten entre equipos y no hay autenticación ni autorización reales. No ingresar datos personales ni claves reales. Los valores de ejemplo no son políticas comerciales ni laborales aprobadas.

La preliquidación **no es nómina oficial**. Parámetros faltantes o extras sin autorizar dejan el total pendiente; cifras y recargos deben ser validados por el contador. No hay cobros reales Wompi, DIAN/CUFE, correo, API WhatsApp, báscula, impresora ni biométrico conectados. La impresión solo confirma una simulación.

## PWA y conexión

El manifiesto e iconos permiten instalar desde el navegador compatible en el sitio publicado. El worker de producción se genera con vite-plugin-pwa; no se registra en desarrollo, vista previa ni iframe y se puede desactivar con `?sw=off`. HTML visitado usa NetworkFirst; archivos de la app se almacenan en caché. La venta de ruta ya abierta funciona sin red y conserva cola/saldo local.

**Pendiente externo:** verificar la apertura en frío sin conexión desde la app instalada en un sitio publicado; la vista previa deshabilita deliberadamente el worker. No afirmar esta comprobación como realizada. Las páginas nunca visitadas pueden requerir una primera apertura con conexión.

## Estructura y futuro proveedor real

```text
src/domain/                 Tipos y reglas puras, sin React
src/services/contracts.ts   Contratos de arriendos y autenticación
src/services/operation-contracts.ts  Contratos operativos
src/services/index.ts       Única fábrica consumida por UI
src/services/mock/          Datos ficticios y cola local
src/components/operations/  Pantallas operativas compartidas
src/components/app/         AppShell y elementos comunes
src/routes/                 Árboles por cargo y metadatos
src/lib/format.ts           Formato COP/kg/fechas
```

Para una fase real autorizada, crear un proveedor HTTP que implemente `Services` y sustituir en la fábrica la composición mock por ese proveedor. Mantener validaciones de dominio, IDs, errores y resultados tipados; las pantallas no importan mocks. Autorización por usuario/cargo, secretos, idempotencia, transacciones y auditoría deben verificarse en servidor, nunca confiar en AppShell o localStorage. Esta fase no incluye activar ese proveedor.
