# Módulo: Finanzas
# Usar en conversación exclusiva de este módulo

## Lee SOLO estos archivos
- js/finanzas.js
- modules/finanzas.html

NO leas ningún otro archivo del proyecto.

## Qué hace este módulo
Motor contable del taller.
Registro de ingresos desde OTs pagadas.
Dashboard financiero con KPIs.
Gestión de cuentas por cobrar y pagar.

## Acceso restringido
Solo roles: administrador y contable
Si otro rol intenta acceder → redirigir al dashboard

## Datos que usa
APP.lsGet('finanzas')  → registros contables
APP.lsGet('ots')       → para calcular ingresos reales
APP.lsGet('config')    → configuración financiera
APP.lsGet('sesion')    → verificar rol antes de mostrar

## Estructura de un registro financiero
{
  id: timestamp,
  tipo: "ingreso|egreso",
  categoria: "mano_obra|repuesto|insumo|otro",
  ot_id: "",
  descripcion: "",
  monto: 0,
  iva: 0,
  total: 0,
  metodo_pago: "efectivo|tarjeta|transferencia",
  referencia: "",
  fecha: timestamp,
  registrado_por: ""
}

## KPIs principales del dashboard
- Ingresos del período (semana/mes/año)
- Egresos del período
- Utilidad neta
- IVA acumulado (19%)
- Ticket promedio por OT
- Ingresos por método de pago:
  Efectivo | Tarjeta | Transferencia

## Secciones del módulo

SECCIÓN 1 — Dashboard financiero:
- Selector de período: semana/mes/año
- Cards de KPIs
- Gráfico de ingresos por mes (barras)
- Tabla de últimos movimientos

SECCIÓN 2 — Cuentas por cobrar:
- OTs con pago pendiente
- Columnas: OT | Cliente | Monto | Fecha | Días pendiente
- Botón "Registrar pago" por cada fila
- Total pendiente de cobrar destacado

SECCIÓN 3 — Motor contable:
- Registro manual de ingresos/egresos
- Filtros por fecha, tipo, categoría
- Tabla completa de movimientos
- Exportar Excel (SheetJS CDN)
- Exportar PDF (jsPDF CDN)

SECCIÓN 4 — Cierre de caja:
- Resumen del día actual
- Desglose por método de pago
- Botón "Cerrar caja del día"
- Historial de cierres anteriores

## Fórmulas importantes
IVA = monto * 0.19
Total con IVA = monto * 1.19
Utilidad = ingresos - egresos
Ticket promedio = ingresos / número de OTs

## Integración con módulo OT
Cuando se registra un pago en una OT:
APP.lsGet('finanzas').push({
  tipo: "ingreso",
  ot_id: ot.id,
  monto: ot.pago.monto,
  metodo_pago: ot.pago.metodo,
  referencia: ot.pago.referencia,
  fecha: timestamp
})

## Lo que está implementado
- Motor contable básico
- Registro de cobros desde OT
- Dashboard financiero básico

## Lo que falta implementar
- Cuentas por cobrar (OTs pendientes)
- Cuentas por pagar (proveedores)
- Exportar a Excel y PDF completo
- Gráficos de tendencia mensual
- Filtros por período completos
- Cierre de caja diario
- Desglose por método de pago

## Reglas específicas de este módulo
- Solo Admin y Contable pueden acceder
- Todos los montos en CLP
- IVA siempre 19%
- Los registros contables nunca se eliminan
  solo se anulan con nota de anulación
- Exportaciones no muestran precios de costo
