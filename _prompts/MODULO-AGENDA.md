# Módulo: Agenda y Calendario
# Usar en conversación exclusiva de este módulo

## Lee SOLO estos archivos
- js/agenda.js
- modules/agenda.html

NO leas ningún otro archivo del proyecto.

## Qué hace este módulo
Muestra las OTs agendadas en formato calendario.
Vista Día / Semana / Mes estilo Google Calendar.
Sincronización con Google Calendar OAuth2.

## Datos que usa
APP.lsGet('ots')         → OTs con fecha de cita
APP.lsGet('usuarios')    → colores por mecánico
APP.lsGet('config')      → horarios del taller
APP.lsGet('config_gcal') → config Google Calendar
APP.lsGet('gcal_token')  → token OAuth2

## Horario del taller (desde config)
Bloques: ej 09:00-13:00 y 14:00-18:00
El calendario bloquea horas fuera de este rango.
Los servicios que cruzan la colación saltan
automáticamente al siguiente bloque.
Ejemplo: servicio 5h desde 09:00
→ 09:00-13:00 (4h) + 14:00-15:00 (1h) = termina 15:00

## Cálculo de duración de bloques
Cada OT ocupa altura proporcional a:
suma de horas_estimadas de sus servicios

## Colores por mecánico
Cada mecánico tiene color en:
APP.lsGet('usuarios')[n].color
Los bloques del calendario usan ese color.

## Semáforo de capacidad
Verde:    > 50% horas disponibles
Amarillo: 20% - 50% disponible
Rojo:     < 20% o taller lleno
Basado en horas de APP.lsGet('config').horarios

## Vista del calendario
- Columnas por día (Lun-Sáb)
- Filas por hora (08:00 a 20:00)
- Línea roja = hora actual
- Click en bloque → abre detalle de la OT
- Horas fuera de horario → fondo gris bloqueado
- Horas de colación → fondo gris bloqueado

## Vistas disponibles
- Día: una columna, detalle por hora
- Semana: 6 columnas (Lun-Sáb)
- Mes: grilla mensual con puntos por OT

## Google Calendar OAuth2
Scopes necesarios:
- https://www.googleapis.com/auth/calendar
- https://www.googleapis.com/auth/calendar.events

Config en APP.lsGet('config_gcal'):
{
  client_id: "",
  calendar_id: "",
  sincronizacion_activa: false,
  estado: "conectado|desconectado"
}
Token en APP.lsGet('gcal_token')

Cada OT con estado cita crea evento con:
- summary: "[Servicio] - [Patente]"
- description: "Cliente: [nombre] | Mecánico: [tecnico]"
- start: fecha/hora ISO
- end: fecha/hora + horas estimadas
- colorId: color según mecánico

## Lo que está implementado
- Calendario clickeable vinculado a OTs
- Vista básica mensual

## Lo que falta implementar
- Vista Día / Semana / Mes con navegación
- Columnas por día, filas por hora
- Línea roja de hora actual
- Color por mecánico
- Bloques de duración proporcional
- Semáforo de capacidad
- Sincronización Google Calendar OAuth2
- Respeto de horarios y colación
- Navegación anterior/siguiente período

## Reglas específicas de este módulo
- Solo mostrar OTs con fecha_cita definida
- Respetar horarios configurados en Admin
- No mostrar OTs canceladas ni archivadas
- El tiempo de colación NO cuenta como hora trabajada
