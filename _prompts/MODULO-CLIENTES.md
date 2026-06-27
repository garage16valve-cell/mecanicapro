# Módulo: Clientes y Vehículos
# Usar en conversación exclusiva de este módulo

## Lee SOLO estos archivos
- js/clientes.js (o el archivo JS del módulo clientes)
- modules/clientes.html

NO leas ningún otro archivo del proyecto.

## Qué hace este módulo
Gestiona clientes y sus vehículos asociados.
Búsqueda, creación, edición y historial de OTs por cliente.

## Datos que usa
APP.lsGet('clientes')  → array de clientes
APP.lsGet('vehiculos') → array de vehículos
APP.lsGet('ots')       → para historial del cliente

## Estructura de un cliente
{
  id: timestamp,
  tipo: "persona|empresa",
  nombres: "",
  apellidos: "",
  rut: "",
  email: "",
  telefono: "+56",
  region: "Valparaíso",
  ciudad: "Valparaíso",
  direccion: "",
  observaciones: "",
  fecha_creacion: timestamp
}

## Estructura de un vehículo
{
  id: timestamp,
  cliente_id: "",
  tipo: "Automóvil",
  marca: "",
  modelo: "",
  anio: 2024,
  color: "",
  patente: "",
  vin: "",
  motor: "",
  combustible: "",
  fecha_registro: timestamp
}

## Vista principal
- Listado vertical (un cliente por fila)
- Cada card: avatar + nombre + RUT + patente +
  WhatsApp + badge N° OTs + flecha detalle
- Buscador: por nombre, RUT, patente o teléfono

## Vista detalle del cliente
- Datos completos del cliente
- Lista de vehículos asociados
- Historial de OTs: N° | Fecha | Servicio | Valor | Estado

## Selectores inteligentes en formulario cliente
- Región: 16 regiones de Chile
  (Valparaíso por defecto)
- Ciudad: carga según región seleccionada

## Regiones de Chile
Arica y Parinacota, Tarapacá, Antofagasta,
Atacama, Coquimbo, Valparaíso,
Metropolitana de Santiago,
Libertador General Bernardo O'Higgins,
Maule, Ñuble, Biobío, La Araucanía,
Los Ríos, Los Lagos,
Aysén del General Carlos Ibáñez del Campo,
Magallanes y Antártica Chilena

## Ciudades de Valparaíso (ejemplo)
Algarrobo, Cabildo, Calle Larga, Cartagena,
Casablanca, Catemu, Concón, El Quisco,
El Tabo, Hijuelas, Isla de Pascua,
Juan Fernández, La Calera, La Cruz,
La Ligua, Limache, Llaillay, Los Andes,
Nogales, Olmué, Panquehue, Papudo,
Petorca, Puchuncaví, Putaendo, Quillota,
Quilpué, Quintero, Rinconada, San Antonio,
San Esteban, San Felipe, Santa María,
Santo Domingo, Valparaíso, Villa Alemana,
Viña del Mar, Zapallar

## Lo que está implementado
- Listado de clientes
- Creación automática desde OT
- Deduplicación por RUT o patente
- Historial de OTs por cliente

## Lo que falta implementar
- Formulario completo con región/ciudad
- Listado vertical (actualmente en grid)
- Modal de vehículos por cliente
- Búsqueda mejorada
- Selector inteligente de región/ciudad

## Reglas específicas de este módulo
- RUT formato chileno: XX.XXX.XXX-X
- Teléfono con prefijo +56 por defecto
- Ciudad se carga según región seleccionada
- Al crear cliente desde OT no duplicar
  si ya existe mismo RUT o patente
