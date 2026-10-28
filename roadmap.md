# Ahumados del Valle — Roadmap

## Hecho (frontend, datos de demostración)

- [x] Diseño móvil/tablet/escritorio, manifiesto e iconos para instalación
- [x] Ingreso separado: administración e inquilinos (usuario y clave)
- [x] Admin: resumen, inquilinos (crear con acceso + contrato), locales, pagos, ajustes de recargo
- [x] Inquilino: contrato y saldo, pagar con Wompi (+ recargo $5.000), locales disponibles, historial

- [x] Portales separados por oficio; conductor y vendedor comparten Empleados de ruta
- [x] Ventas por peso/unidad, pagos mixtos, fiados/abonos, suspensión, tirillas y caja
- [x] Clientes, empleados, inventario, recepción, planta, recetas y compras
- [x] Configuración versionada, auditoría, importaciones e integraciones ficticias

## Verificación final

- [x] Despacho pesado y liquidación de inventario, dinero y descongelamiento; intercambio y faltante auditado
- [x] Venta sin red en pantalla abierta y cola IndexedDB sin duplicados; guard de PWA en previews
- [x] Asistencia/preliquidación sin parámetros legales inventados; recordatorios simulados
- [x] Pruebas de todos los cargos, pagos, ventas, persistencia, móvil/tablet/escritorio y modo oscuro
- [x] README con perfiles, módulos, ejecución y sustitución del proveedor mock
- [x] Apertura sin conexión en el sitio publicado: worker activo y recarga sin red muestra el selector de portales (probado en navegador automatizado; falta en teléfono real)

## Fuera de esta fase

- Backend compartido, autorización real, Wompi/DIAN reales, notificaciones y hardware físico: requieren una fase posterior autorizada.
