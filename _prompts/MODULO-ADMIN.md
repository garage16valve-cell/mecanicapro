# Módulo: Administración
# Usar en conversación exclusiva de este módulo

## Lee SOLO estos archivos
- js/admin-kpis.js
- js/admin-config.js
- js/admin-usuarios.js
- js/admin-reportes.js
- modules/admin.html

NO leas ningún otro archivo del proyecto.

## Qué hace este módulo
Panel de administración con 4 secciones:
1. KPIs y Dashboard
2. Configuración del taller
3. Usuarios y roles
4. Reportes avanzados

## Acceso
Solo rol administrador ve todo.
Contable ve solo Reportes.
Otros roles no acceden a este módulo.

## Datos que usa
APP.lsGet('ots')      → para KPIs y reportes
APP.lsGet('usuarios') → gestión de usuarios
APP.lsGet('config')   → configuración del taller
APP.lsGet('sesion')   → verificar rol

## SECCIÓN 1 — KPIs Dashboard
Calculados desde OTs reales:
- OTs completadas (semana/mes/año)
- Ingresos totales CLP del período
- Clientes nuevos del período
- Rentabilidad/hora = ingresos ÷ horas reales
- Satisfacción promedio (encuestas)
- Semáforo de capacidad:
  Verde > 50% | Amarillo 20-50% | Rojo < 20%

Tabla servicios más rentables:
Servicio | OTs | Horas est. | Horas reales |
Eficiencia % | Ingreso total | Rent/hora

Tabla rendimiento por mecánico:
Mecánico | OTs | Tiempo real | Eficiencia % |
Ingresos | Rent/hora

## SECCIÓN 2 — Configuración del taller
APP.lsGet('config'):
{
  logo: base64,
  nombre: "Integral Automotriz SPA",
  rut: "",
  giro: "",
  direccion: "",
  telefono: "+56951655331",
  email: "",
  web: "",
  link_agendamiento: "",
  precio_minimo_hora: 0,
  ganancia_repuestos: 30,
  iva_por_defecto: true,
  horarios: [
    { desde: "09:00", hasta: "13:00" },
    { desde: "14:00", hasta: "18:00" }
  ],
  dias_laborales: [
    "lunes","martes","miercoles",
    "jueves","viernes","sabado"
  ],
  terminos: "",
  garantia: "",
  nota_pie: "",
  plantillas_whatsapp: {
    confirmar_cita: "",
    vehiculo_recibido: "",
    cotizacion_lista: "",
    vehiculo_listo: "",
    recordatorio_pago: "",
    encuesta: ""
  },
  upselling: [
    { servicio: "Cambio aceite", meses: 6 },
    { servicio: "Mantención 10.000 km", meses: 12 }
  ]
}

Campos del formulario de configuración:
- Upload logo (PNG/JPG, preview circular)
- Nombre del taller (obligatorio)
- RUT formato XX.XXX.XXX-X
- Giro/Razón social
- Dirección
- Teléfono/WhatsApp
- Email
- Sitio web
- Link agendamiento online
- Precio mínimo hora mano de obra (CLP)
- % Ganancia sobre repuestos (solo Admin)
- Toggle IVA por defecto
- Bloques horarios (múltiples, con + y ×)
- Días laborales (checkboxes)
- Términos y condiciones (textarea)
- Texto garantía (textarea)
- Nota al pie documentos (textarea)
- Plantillas WhatsApp (6 textareas editables)
- Reglas de upselling (tabla: servicio + meses)

## SECCIÓN 3 — Usuarios y roles
APP.lsGet('usuarios'):
[{
  id: timestamp,
  nombre: "",
  apellido: "",
  rut: "",
  whatsapp: "",
  rol: "administrador|recepcionista|mecanico|contable",
  color: "#3B82F6",
  pin: "1234",
  activo: true,
  fecha_creacion: timestamp
}]

Pantalla de login:
- Cards de usuarios activos
- Click en usuario → modal PIN (4 dígitos)
- 3 intentos fallidos → bloqueo 30 segundos
- Al entrar → guardar en APP.lsGet('sesion')

APP.lsGet('sesion'):
{
  usuario_id: "",
  nombre: "",
  rol: "",
  color: "",
  fecha_login: timestamp
}

Permisos por rol:
ADMINISTRADOR → ve todo sin restricciones
RECEPCIONISTA → OTs, Clientes, Agenda, Panel día
MECÁNICO → solo sus OTs, sin precios de costo
CONTABLE → solo Finanzas y Reportes

Función APP.puedeVer(seccion):
Retorna true/false según rol activo
Aplicar en menú lateral y en campos sensibles

## SECCIÓN 4 — Reportes avanzados
- Tabla servicios más rentables
- Tabla rendimiento por mecánico
- Gráfico barras: carga mensual
- Análisis marcas/modelos frecuentes
- Reporte stock sugerido repuestos
- Exportar PDF: jsPDF CDN
- Exportar Excel: SheetJS CDN

Nombre archivos exportados:
reporte-[tipo]-[DDMMYYYY].pdf
reporte-[tipo]-[DDMMYYYY].xlsx

## Lo que está implementado
- KPIs básicos
- Configuración básica del taller
- Exportar PDF/Excel básico
- Operarios con color de calendario
- Reglas de upselling básicas
- Integraciones con toggles

## Lo que falta implementar
- KPIs calculados desde OTs reales
- Upload y guardado de logo
- Sistema login con PIN por usuario
- Pantalla de selección de usuario
- Reportes avanzados con gráficos
- Semáforo de capacidad en dashboard
- Plantillas WhatsApp editables
- Términos y condiciones editables
- Google Calendar OAuth2 config
- Instagram API config

## Reglas específicas de este módulo
- % ganancia NUNCA visible al cliente
- Precios de costo NUNCA en documentos
- Logo guardado como base64 en config
- PIN guardado como string de 4 dígitos
- Al cambiar rol de usuario cerrar sesión
- Usuario por defecto si no hay ninguno:
  nombre: Administrador, pin: 0000
