# MecánicaPro — Contexto del Proyecto

## Identidad del proyecto
Sistema de gestión para talleres automotrices chilenos.
Cliente: Integral Automotriz SPA, Valparaíso, Chile.
Plan futuro: SaaS mensual para otros talleres chilenos.

## URLs
- Producción: https://garage16valve-cell.github.io/mecanicapro/
- Repo: https://github.com/garage16valve-cell/mecanicapro
- Proyecto local: C:\Users\camil\Downloads\Gestion de taller\
- Agendamiento: https://integral-automotriz-spa.reservio.com/booking
- WhatsApp taller: +569 5165 5331

## Arquitectura
Aplicación HTML estática desplegada en GitHub Pages.
Sin backend por ahora — toda la lógica es client-side.
Migración futura planeada a Railway/Render con base de datos real y Flow/WebPay.

## Estructura de archivos
index.html          → archivo principal
js/main.js          → lógica principal y navegación
js/taller.js        → módulo OT
js/finanzas.js      → módulo finanzas
js/servicios.js     → módulo servicios
js/agenda.js        → módulo agenda
js/admin.js         → panel administración
modules/            → HTMLs de cada módulo
_prompts/           → prompts por módulo (no tocar)

## Reglas OBLIGATORIAS — nunca romper
1. Toda persistencia usa APP.lsGet / APP.lsSet — NUNCA localStorage directo
2. No modificar diseño visual existente salvo que se pida explícitamente
3. No tocar archivos fuera del alcance de la tarea actual
4. Al terminar cada tarea: git add → commit → push
5. Acceso a tiempos reales y reportes financieros: solo perfil Administrador
6. Cada módulo tiene su propio archivo JS y su propio HTML en modules/
7. No duplicar lógica entre módulos — reutilizar funciones existentes

## Convenciones de código
- APP.lsGet('clave') / APP.lsSet('clave', valor) para toda persistencia
- Las OTs se guardan en APP.lsGet('ots') → array de objetos
- Los clientes en APP.lsGet('clientes')
- Los servicios en APP.lsGet('servicios')
- La config del taller en APP.lsGet('config')
- Los operarios en APP.lsGet('operarios')
- Las alertas pendientes en APP.lsGet('alertas_pendientes')

## Lo que ya está implementado
- OTs con estados: Cliente llegó / No llegó / Reagendar / Canceló / Cotización
- Vista detalle/edición de OT con historial de eventos
- Base de datos local de patentes en localStorage
- Clientes creados automáticamente desde OT con deduplicación por RUT o patente
- Módulo Servicios: categorías, horas estimadas, repuestos sugeridos, WhatsApp proveedores
- Cotización desde OT con envío WhatsApp
- Cierre de OT con generador de post Instagram
- Control de tiempo y rentabilidad por servicio
- Agenda con calendario clickeable vinculada a OTs
- Finanzas: motor contable, registro de cobros, dashboard financiero
- Admin: KPIs básicos, configuración del taller, exportar PDF/Excel

## Módulos en desarrollo (orden de prioridad)
1. Admin — Configuración completa (config, operarios, upselling, integraciones)
2. OT — Edición dinámica, hora entrada/entrega, historial vehículo, upselling
3. Admin — Reportes y KPIs desde OTs reales, rendimiento mecánicos, inteligencia de negocio
4. Servicios — Precio fijo, eficiencia, gestión proveedores con WhatsApp
5. Agenda — Vista Google Calendar, semáforo capacidad, sync Google Calendar OAuth2
6. Notificaciones — Alertas WhatsApp operarios (resumen día siguiente, 30 min antes, post-servicio)

## Datos del negocio
- Taller: Integral Automotriz SPA
- Ciudad: Valparaíso, Chile
- WhatsApp: +569 5165 5331
- Integraciones futuras: Flow/WebPay, SII, Google Calendar OAuth2
- Alertas WhatsApp: via wa.me links + setTimeout/setInterval
- PDF export: jsPDF (CDN)
- Excel export: SheetJS/xlsx (CDN)
