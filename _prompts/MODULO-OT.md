# Módulo: Órdenes de Trabajo (OT)
# Usar en conversación exclusiva de este módulo

## Lee SOLO estos archivos
- js/taller-lista.js
- js/taller-formulario.js
- js/taller-detalle.js
- js/taller-servicios.js
- js/taller-repuestos.js
- js/taller-pago.js
- modules/taller.html

NO leas ningún otro archivo del proyecto.

## Qué hace este módulo
Gestiona el ciclo completo de una Orden de Trabajo:
creación, edición, avance por fases, cobro y cierre.

## Fases de la OT (flujo Kanban)
RECEPCIÓN → DIAGNÓSTICO → REPUESTOS →
APROBACIÓN → REPARACIÓN → CONTROL →
ENTREGA → ARCHIVADO

## Semáforo de estados
🟡 AGENDADO       → Cita futura
🟢 EN PROCESO     → En reparación
🔴 SIN REPUESTO   → Esperando repuesto
🔵 LISTO          → Listo para retirar
⏳ PAGO PENDIENTE → Sin cobrar
✅ FINALIZADO     → Pagado y entregado
❌ CANCELADO      → Cancelado

## Datos que usa
APP.lsGet('ots')       → array de OTs
APP.lsGet('clientes')  → para selector de cliente
APP.lsGet('vehiculos') → para selector de vehículo
APP.lsGet('servicios') → para selector de servicio
APP.lsGet('usuarios')  → para selector de técnico
APP.lsGet('config')    → para % ganancia e IVA

## Estructura de una OT
{
  id: "202906200001",
  fase: "recepcion|diagnostico|repuestos|
         aprobacion|reparacion|control|
         entrega|archivado",
  tipo: "express|avanzada",
  es_garantia: false,
  autoriza_prueba_ruta: true,
  requiere_diagnostico: true,
  fecha_ingreso: timestamp,
  fecha_cita: timestamp,
  cliente_id: "",
  vehiculo_id: "",
  tecnico_id: "",
  kilometraje: { entrada: 0, salida: 0, unidad: "km" },
  nivel_combustible: "1/2",
  motivos: [{
    descripcion: "",
    servicio_id: "",
    tecnico_id: "",
    procedimiento: "diagnostico|mantenimiento|reparacion",
    estado_aprobacion: "pendiente|aprobado|rechazado",
    diagnostico: "",
    horas_reparacion: 0,
    valor_mano_obra: 0,
    impuesto: 0,
    repuestos: [],
    insumos: [],
    evidencia_diagnostico: []
  }],
  recepcion: {
    objetos_valor: "",
    documentos: "",
    combustible: "",
    fluidos_ok: [],
    inventario: [],
    danos: [],
    descripcion_danos: "",
    observaciones: "",
    fotos_ingreso: []
  },
  aprobacion_ingreso: {
    metodo: "whatsapp|verbal",
    firma: "",
    fecha: timestamp,
    aprobado_por: "",
    terminos_aceptados: true
  },
  repuestos_cotizados: [{
    tipo: "mano_obra|repuesto|insumo",
    item: "",
    referencia: "",
    costo: 0,
    rentabilidad: 0,
    valor_unitario: 0,
    descuento: 0,
    impuesto: 0,
    cantidad: 1,
    estado_aprobacion: "pendiente|aprobado"
  }],
  control_calidad: {
    kilometraje_salida: 0,
    resolucion_averia: [],
    estado_entrega: [],
    fluidos_salida: [],
    observaciones: "",
    aprobado: false,
    fecha: timestamp
  },
  pago: {
    estado: "pendiente|pagado",
    metodo: "efectivo|tarjeta|transferencia|pendiente",
    referencia: "",
    monto: 0,
    vuelto: 0,
    fecha: timestamp,
    registrado_por: ""
  },
  evidencia_reparacion: [],
  firma_aprobacion_presupuesto: {
    imagen: "",
    fecha: timestamp
  },
  whatsapp_enviados: [],
  historial_eventos: [{
    fecha: timestamp,
    fase: "",
    accion: "",
    usuario: "",
    descripcion: ""
  }]
}

## Modo rápido (5 campos obligatorios)
1. Patente + botón Consultar
2. Cliente (selector inteligente)
3. WhatsApp del cliente
4. Servicio (selector inteligente)
5. Técnico (selector inteligente)

## Lo que está implementado
- Listado de OTs con filtros
- Nueva OT modo rápido y completo
- Vista detalle con historial
- Cambio de estados
- Servicios múltiples por OT
- Repuestos con cálculo de ganancia
- Panel de pago (efectivo/tarjeta/transferencia/pendiente)

## Lo que falta implementar
- Tablero Kanban con pestañas por fase
- Recepción activa completa (checklist vehículo)
- Aprobación digital con firma canvas
- Diagnóstico técnico por motivo
- Cotización con aprobación del cliente
- Control de calidad con checklist
- Evidencia fotográfica en cada fase
- Plantillas WhatsApp integradas

## Reglas específicas de este módulo
- Número OT formato: YYYYMMDDXXXX
- Mecánico NO ve precios de costo
- Precio venta = costo / (1 - margen/100)
- IVA = 19%
- Fotos guardadas como base64
