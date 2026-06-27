# Módulo: Documentos Imprimibles
# Usar en conversación exclusiva de este módulo

## Lee SOLO este archivo
- modules/documento-imprimible.html

NO leas ningún otro archivo del proyecto.

## Qué hace este módulo
Genera documentos profesionales para imprimir
o descargar como PDF:
- Cotización
- Orden de Trabajo
- Orden de Ingreso
- Boleta de Servicio

## Cómo se accede
Desde el detalle de una OT, botones:
→ window.open(
    'modules/documento-imprimible.html
    ?tipo=cotizacion&ot=ID_OT',
    '_blank'
  )

Tipos válidos en el parámetro ?tipo=:
- cotizacion
- orden-trabajo
- orden-ingreso
- boleta

## IMPORTANTE — Cómo leer los datos
Este archivo es independiente de la app.
Lee directamente desde localStorage.
Verificar prefijo exacto en js/main.js.

Ejemplo:
const ots = JSON.parse(
  localStorage.getItem('mecanicapro_ots') || '[]'
)
const config = JSON.parse(
  localStorage.getItem('mecanicapro_config') || '{}'
)
const otId = new URLSearchParams(
  window.location.search
).get('ot')
const ot = ots.find(o => o.id === otId)

## Estructura del documento A4

ENCABEZADO (siempre presente):
┌─────────────────────────────────────────┐
│ [LOGO]  Integral Automotriz SPA         │
│         RUT: 76.123.456-7               │
│         Giro: Servicios automotrices    │
│         Av. Argentina 1234, Valparaíso  │
│         Tel: +56 9 5165 5331            │
│         Email: contacto@taller.cl       │
├─────────────────────────────────────────┤
│ ████ COTIZACIÓN ████    #202906200001   │
│ Fecha emisión: 27/06/2026               │
│ Válida hasta: 12/07/2026 (15 días)      │
├─────────────────────────────────────────┤
│ DATOS CLIENTE    │ DATOS VEHÍCULO       │
│ Nombre: ...      │ Marca: Toyota        │
│ RUT: ...         │ Modelo: Corolla      │
│ Tel: ...         │ Año: 2022            │
│ Email: ...       │ Patente: KJJL13      │
│                  │ Km entrada: 45.230   │
├─────────────────────────────────────────┤
│ DESCRIPCIÓN DEL TRABAJO                 │
│ Motivo: Cambio aceite y filtro          │
│ Diagnóstico: Aceite degradado...        │
├─────────────────────────────────────────┤
│ N° │ TIPO        │ DESCRIPCIÓN │ CANT   │
│    │             │             │ P.UNIT │
│    │             │             │ TOTAL  │
├────┼─────────────┼─────────────┼────────┤
│  1 │ Mano de obra│ Cambio ace. │   1    │
│    │             │             │$15.000 │
│    │             │             │$15.000 │
├────┼─────────────┼─────────────┼────────┤
│  2 │ Repuesto    │ Aceite 5W30 │   4L   │
│    │             │             │ $4.500 │
│    │             │             │$18.000 │
├─────────────────────────────────────────┤
│                    SUBTOTAL:   $33.000  │
│                    DESCUENTO:      $0   │
│               BASE IMPONIBLE:  $33.000  │
│                   IVA (19%):    $6.270  │
│         ┌──────────────────────────┐   │
│         │    TOTAL: $39.270        │   │
│         └──────────────────────────┘   │
├─────────────────────────────────────────┤
│ CONDICIONES                             │
│ • Garantía: 30 días mano de obra        │
│ • Válida 15 días desde emisión          │
│ • [términos de config]                  │
├─────────────────────────────────────────┤
│ AUTORIZACIÓN                            │
│ Firma: _____________________            │
│ Nombre: ____________________            │
│ RUT: _______________________            │
│ Fecha: _____________________            │
├─────────────────────────────────────────┤
│ Gracias por preferirnos.                │
│ Integral Automotriz SPA                 │
│ [nota_pie de config]                    │
└─────────────────────────────────────────┘

## Variantes por tipo de documento

COTIZACIÓN:
- Título: "COTIZACIÓN"
- Badge: "Válida por 15 días"
- Estado: PENDIENTE / APROBADA / RECHAZADA
- Muestra precios de venta (NUNCA costo)
- Sección firma del cliente al final

ORDEN DE TRABAJO:
- Título: "ORDEN DE TRABAJO"
- Estado actual de la OT
- Historial completo de fases
- Motivos de ingreso + diagnóstico
- Trabajos realizados
- Firma de entrega del cliente

ORDEN DE INGRESO:
- Título: "ORDEN DE INGRESO"
- Estado del vehículo al entrar:
  * Fluidos verificados con ✓
  * Inventario con ✓
  * Daños con descripción
- Galería fotos de ingreso (grilla 3 columnas)
- Firma del cliente de conformidad
- Autorización prueba de ruta: Sí/No

BOLETA DE SERVICIO:
- Título: "BOLETA DE SERVICIO"
- Solo trabajos realizados y cobrados
- Método de pago registrado
- N° de referencia (voucher/boleta/comprobante)
- TOTAL PAGADO destacado en verde
- Fecha y hora exacta del pago

## Botones de la página (no se imprimen)
.no-imprimir:
- "🖨️ Imprimir" → window.print()
- "⬇️ Descargar PDF" → genera con jsPDF
- "← Volver" → window.close()

## CSS de impresión

@media print {
  .no-imprimir { display: none !important; }
  body { margin: 0; padding: 0; }
  * { -webkit-print-color-adjust: exact !important; }
  .documento-a4 { box-shadow: none !important; }
}

.documento-a4 {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 15mm 15mm 20mm 15mm;
  background: white;
  color: #1a1a1a;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11pt;
  line-height: 1.4;
  box-shadow: 0 0 20px rgba(0,0,0,0.1);
}

.doc-tabla {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 10pt;
}

.doc-tabla th {
  background: #f3f4f6;
  padding: 8px;
  text-align: left;
  border: 1px solid #d1d5db;
  font-weight: 600;
}

.doc-tabla td {
  padding: 8px;
  border: 1px solid #d1d5db;
  vertical-align: top;
}

.doc-total {
  background: #1e40af;
  color: white;
  padding: 12px 16px;
  text-align: right;
  font-size: 14pt;
  font-weight: 700;
  border-radius: 6px;
  margin-top: 8px;
}

.doc-firma-box {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 16px;
  margin-top: 16px;
}

.doc-firma-linea {
  border-bottom: 1px solid #1a1a1a;
  margin: 24px 0 4px 0;
  width: 200px;
}

.doc-pie {
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid #d1d5db;
  font-size: 9pt;
  color: #6b7280;
  text-align: center;
}

.badge-tipo {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 9pt;
  font-weight: 600;
}

.badge-mano-obra { background:#dbeafe; color:#1e40af; }
.badge-repuesto  { background:#dcfce7; color:#166534; }
.badge-insumo    { background:#fef9c3; color:#854d0e; }

## Descarga PDF con jsPDF
CDN:
https://cdnjs.cloudflare.com/ajax/libs/
jspdf/2.5.1/jspdf.umd.min.js

Nombre del archivo descargado:
[tipo]-[N°OT]-[DDMMYYYY].pdf
Ejemplos:
cotizacion-202906200001-27062026.pdf
boleta-202906200001-27062026.pdf

## Reglas de contenido — NUNCA mostrar
- Precios de costo de repuestos
- % de ganancia del taller
- Datos internos del sistema
- Navegación de la app
- Botones de interfaz (usar .no-imprimir)
- PIN de usuarios
- Datos de configuración interna

## Reglas de contenido — SIEMPRE mostrar
- Logo del taller (desde config.logo)
- Nombre + RUT + Giro del taller
- Dirección y contacto del taller
- N° de documento
- Fecha de emisión
- Datos completos del cliente
- Datos completos del vehículo
- Desglose detallado de servicios
- Subtotal + IVA + Total
- Pie de página con nota del taller

## Lo que está implementado
- Nada, es archivo nuevo a crear

## Lo que falta implementar
- Todo el archivo desde cero
- Los 4 tipos de documentos
- CSS profesional para impresión A4
- Descarga PDF con jsPDF
- Logo desde base64 en config
- Galería de fotos en orden de ingreso
- Responsive para vista en pantalla
  (antes de imprimir)

## Reglas específicas de este módulo
- Archivo HTML completamente independiente
- CSS y JS propios dentro del archivo
- Lee localStorage directamente
- Sin dependencias de la app principal
- Al imprimir: solo el documento A4
- Márgenes de impresión: 15mm todos los lados
