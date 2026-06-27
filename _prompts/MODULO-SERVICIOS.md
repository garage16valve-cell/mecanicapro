# Módulo: Servicios y Proveedores
# Usar en conversación exclusiva de este módulo

## Lee SOLO estos archivos
- js/servicios.js
- modules/servicios.html

NO leas ningún otro archivo del proyecto.

## Qué hace este módulo
Gestiona el catálogo de servicios del taller
y la lista de proveedores con sus marcas.
DOS pestañas: Catálogo | Proveedores

## Datos que usa
APP.lsGet('servicios')   → catálogo de servicios
APP.lsGet('proveedores') → lista de proveedores

## Estructura de un servicio
{
  id: timestamp,
  nombre: "",
  categoria: "",
  horas_estimadas: 1.0,
  precio_venta: 0,
  precio_iva: true,
  precio_minimo: 0,
  descripcion: "",
  repuestos_sugeridos: [
    { nombre: "", cantidad: 1, unidad: "unidad" }
  ]
}

## Estructura de un proveedor
{
  id: timestamp,
  nombre: "",
  rubro: "",
  whatsapp: "",
  marcas: ["Toyota", "Kia"]
}

## Categorías predefinidas de servicios
Mantenimiento preventivo | Frenos | Motor |
Transmisión | Suspensión | Eléctrico |
Carrocería | Diagnóstico | Aire acondicionado |
Escape | Neumáticos | Revisión técnica

## Marcas sugeridas para proveedores
Toyota, Kia, Nissan, Ford, Chevrolet,
Hyundai, Mazda, Suzuki, Mitsubishi, Honda,
Volkswagen, Renault, Peugeot, Fiat, BMW,
Mercedes-Benz, Audi, Subaru, Jeep, RAM,
Great Wall, Chery, Geely, MG, JAC

## PESTAÑA 1 — Catálogo de servicios
Vista principal al abrir el módulo.

Barra superior:
- Buscador: "Buscar servicio..."
- Filtro por categoría (selector)
- Botón "+ Nuevo servicio" → modal

Listado de servicios:
- Nombre del servicio
- Categoría (badge de color)
- Horas estimadas
- Precio de venta CLP
- Toggle IVA incluido/neto
- N° repuestos sugeridos
- Botones: ✏️ Editar | 🗑️ Eliminar

Si no hay servicios mostrar:
"No hay servicios configurados.
 Click en + Nuevo servicio para agregar."

## Modal nuevo/editar servicio
Campos:
- Nombre (obligatorio)
- Categoría (selector inteligente + agregar nueva)
- Horas estimadas (decimal, ej: 1.5)
  Nota: se usa para duración en agenda
- Precio fijo de venta (CLP)
- Toggle: ¿Precio incluye IVA?
- Precio mínimo de venta (CLP)
  Alerta si se cobra menos en la OT
- Descripción (textarea, opcional)

Sección repuestos sugeridos:
- Lista dinámica por repuesto:
  nombre | cantidad | unidad | botón ×
- Botón "+ Agregar repuesto sugerido"
- Nota: "Se cargan automáticamente al
  agregar este servicio a una OT"

Botones: [ Cancelar ] [ 💾 Guardar servicio ]

## PESTAÑA 2 — Proveedores
Barra superior:
- Botón "+ Agregar proveedor"

Listado de proveedores (cards):
- Nombre + rubro
- Chips de marcas que abastece
- WhatsApp
- Botones: 📱 WA | ✏️ Editar | 🗑️ Eliminar

Modal nuevo/editar proveedor:
- Nombre (obligatorio)
- Rubro (texto libre)
- WhatsApp (+569XXXXXXXX)
- Marcas que abastece:
  input con sugerencias + botón "+"
  marcas como chips eliminables (×)

Botón 📱 WA abre WhatsApp con:
"Hola [Proveedor], necesito cotización de
 repuestos. Integral Automotriz +569 5165 5331"

## Lo que está implementado
- Catálogo básico de servicios
- Listado de proveedores con WA
- Pestaña Repuestos por OT (ELIMINAR)

## Lo que falta implementar
- Eliminar pestaña Repuestos por OT
- Repuestos sugeridos por servicio
- Marcas como chips en proveedores
- Selector inteligente de categorías
- Modal completo de servicio
- Filtro por categoría funcionando

## Reglas específicas de este módulo
- Precio mínimo nunca visible al cliente
- Repuestos sugeridos son referenciales
  no obligatorios en la OT
- Al eliminar servicio verificar si está
  en uso en alguna OT activa y advertir
- Horas estimadas en decimal (ej: 1.5 = 1h 30min)
