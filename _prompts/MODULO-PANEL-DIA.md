# Módulo: Panel del Día
# Usar en conversación exclusiva de este módulo

## Lee SOLO este archivo
- modules/panel-dia.html

NO leas ningún otro archivo del proyecto.

## Qué hace este módulo
Pantalla de estado del día en tiempo real.
Se abre en nueva pestaña del navegador.
Diseñada para verse en una pantalla secundaria.
Auto-refresh cada 5 minutos.
Sin menú ni navegación de la app principal.

## Cómo se accede
Botón "📺 Panel del día" en el header principal
→ window.open('modules/panel-dia.html', '_blank')

## IMPORTANTE — Cómo leer los datos
Este archivo es independiente de la app principal.
NO tiene acceso a APP.lsGet directamente.
Debe leer localStorage con el prefijo exacto
que usa la app principal.

Antes de escribir código verificar el prefijo
leyendo las primeras líneas de js/main.js
para confirmar cómo se guardan las claves.

Ejemplo de lectura directa:
const datos = JSON.parse(
  localStorage.getItem('mecanicapro_ots') || '[]'
)

## Estructura del archivo
Es un HTML completo independiente con:
- Su propio CSS interno (no usa styles.css)
- Su propio JS interno (no usa main.js)
- Fondo oscuro (#0d1117)
- Texto blanco, fuente grande
- Sin dependencias externas

## Contenido del panel

HEADER:
- Nombre del taller (desde localStorage config)
- Texto: "Panel del día"
- Fecha actual formato: "Sábado 27 Junio 2026"
- Reloj en tiempo real (HH:MM:SS)
- Contador regresivo: "↺ Actualiza en 4:32"
- Botón "↺ Actualizar ahora"

4 KPIs GRANDES (fila de tarjetas):

┌──────────────┐
│      🟡      │
│  CITAS HOY   │
│      4       │  ← número 48px
│ Próx: 15:00  │
└──────────────┘

┌──────────────┐
│      🟢      │
│  EN TALLER   │
│      3       │
└──────────────┘

┌──────────────┐
│      🔴      │
│ SIN REPUESTO │
│      1       │
└──────────────┘

┌──────────────┐
│      🔵      │
│    LISTOS    │
│  PARA RETIRAR│
│      1       │
└──────────────┘

LISTA OTs DEL DÍA (máximo 10):
Filtra OTs con fecha_cita = hoy
Ordena por hora de cita ascendente

Cada fila:
┌──────────────────────────────────────────┐
│ 🟢 │ 09:00 │ KJJL13    │ Carlos M.      │
│    │       │ Toyota Corolla 2022         │
│    │ EN PROCESO │ Cambio frenos │ ⏱️ 2h │
└──────────────────────────────────────────┘

Colores de fondo por estado:
🟡 rgba(234,179,8,0.1)   → AGENDADO
🟢 rgba(34,197,94,0.1)   → EN PROCESO
🔴 rgba(239,68,68,0.1)   → SIN REPUESTO
🔵 rgba(59,130,246,0.1)  → LISTO
⏳ rgba(249,115,22,0.1)  → PAGO PENDIENTE

SECCIÓN ALERTAS (solo si hay items):
Fondo: rgba(239,68,68,0.15)
Borde: 1px solid rgba(239,68,68,0.3)
Título: "⚠️ Requieren atención"

Tipos de alerta:
🔴 "[Patente] — Sin repuesto hace X horas"
⏰ "[Patente] — Cliente no llegó
    (cita 09:00, han pasado X min)"
💰 "[Patente] — Pago pendiente desde [fecha]"

## Lógica de cálculo de KPIs

CITAS HOY:
ots.filter(ot =>
  esFechaHoy(ot.fecha_cita) &&
  ot.fase === 'recepcion'
).length

EN TALLER:
ots.filter(ot =>
  ['diagnostico','repuestos','aprobacion',
   'reparacion','control'].includes(ot.fase)
).length

SIN REPUESTO:
ots.filter(ot =>
  ot.estado === 'sin_repuesto'
).length

LISTOS PARA RETIRAR:
ots.filter(ot =>
  ot.fase === 'entrega'
).length

## Auto-refresh
Reloj: setInterval cada 1000ms
Contador regresivo: setInterval cada 1000ms
Auto-refresh datos: setInterval cada 300000ms
Al hacer refresh: re-leer localStorage y re-renderizar

## Diseño CSS interno

body {
  background: #0d1117;
  color: #e6edf3;
  font-family: system-ui, sans-serif;
  padding: 16px;
  margin: 0;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin: 20px 0;
}

.kpi-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
}

.kpi-numero {
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
  margin: 12px 0;
}

.ot-lista {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ot-fila {
  display: grid;
  grid-template-columns: 40px 80px 1fr 1fr;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #30363d;
  font-size: 15px;
}

.alerta-box {
  margin-top: 20px;
  padding: 16px;
  border-radius: 8px;
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3);
}

@media (max-width: 768px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .ot-fila {
    grid-template-columns: 40px 1fr;
    font-size: 14px;
  }
}

## Lo que está implementado
- Nada, es archivo nuevo a crear

## Lo que falta implementar
- Todo el archivo desde cero
- Header con reloj en tiempo real
- 4 KPIs con cálculo desde localStorage
- Lista de OTs del día con colores
- Sección de alertas condicional
- Auto-refresh cada 5 minutos
- Contador regresivo visible
- Diseño responsivo para tablet

## Reglas específicas de este módulo
- CSS propio, no depende de styles.css
- JS propio, no depende de main.js
- Lee localStorage directamente
- Sin navegación de la app principal
- Optimizado para pantalla secundaria
- Texto grande legible desde lejos
