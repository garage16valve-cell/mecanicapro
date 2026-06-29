// ===== CONFIGURACIÓN DE MÓDULOS =====
const MODULE_MAP = {
  dashboard: 'dashboard',
  agenda:    'agenda',
  ot:        'taller',
  clientes:  'taller',
  wiki:      'taller',
  servicios: 'servicios',
  inventario:'inventario',
  proveedores:'inventario',
  residuos:  'inventario',
  finanzas:  'finanzas',
  contable:  'finanzas',
  facturacion:'finanzas',
  fidelizacion:'marketing',
  redes:     'marketing',
  wzp:       'marketing',
  reportes:  'admin',
  config:    'admin',
  usuarios:  'admin',
};

const TITLES = {
  dashboard:   'Dashboard',
  agenda:      'Agenda de citas',
  ot:          'Órdenes de trabajo',
  clientes:    'Clientes y vehículos',
  wiki:        'Wiki técnica colaborativa',
  servicios:   'Catálogo de servicios',
  inventario:  'Inventario de repuestos',
  proveedores: 'Proveedores',
  residuos:    'Residuos ecológicos',
  finanzas:    'Finanzas',
  contable:    'Motor contable',
  facturacion: 'Facturación',
  fidelizacion:'Fidelización automática',
  redes:       'Redes sociales',
  wzp:         'WhatsApp Marketing',
  reportes:    'Reportes',
  config:      'Configuración',
  usuarios:    'Usuarios y roles',
};

// Módulos ya inicializados
const loadedModules = new Set();
let currentPage = 'dashboard';

// ===== NAVEGACIÓN PRINCIPAL (sin fetch — módulos embebidos en index.html) =====
function nav(page, el) {
  if (!page) return;

  // Actualizar sidebar
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  if (el) {
    el.classList.add('active');
  } else {
    document.querySelectorAll('.ni').forEach(n => {
      if ((n.getAttribute('onclick') || '').includes(`'${page}'`)) n.classList.add('active');
    });
  }

  // Actualizar título topbar
  document.getElementById('ptitle').textContent = TITLES[page] || page;

  const moduleName = MODULE_MAP[page];
  if (!moduleName) return;

  // Llamar al init del módulo la primera vez
  if (!loadedModules.has(moduleName)) {
    const initFn = window[`init_${moduleName}`];
    if (typeof initFn === 'function') initFn();
    loadedModules.add(moduleName);
  }

  // Mostrar/ocultar módulos
  document.querySelectorAll('#content-area > .module-wrap').forEach(m => m.classList.remove('active'));
  const activeModule = document.getElementById(`module-${moduleName}`);
  if (activeModule) activeModule.classList.add('active');

  // Mostrar la página correcta dentro del módulo
  if (activeModule) {
    activeModule.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = activeModule.querySelector(`#pg-${page}`);
    if (targetPage) targetPage.classList.add('active');
  }
  // Admin tabs switching
  if (moduleName === 'admin' && typeof admSetTab === 'function') {
    admSetTab(page === 'reportes' ? 'reportes' : page === 'config' ? 'config' : page === 'usuarios' ? 'usuarios' : 'reportes');
  }

  currentPage = page;

  // Renderizar páginas específicas al navegar dentro de un módulo ya inicializado
  if (page === 'clientes') {
    if (typeof renderClientes === 'function') renderClientes();
    if (typeof renderVehiculos === 'function') renderVehiculos();
  }
  if (page === 'reportes' && typeof adminRenderReportes === 'function') adminRenderReportes();
  if (page === 'finanzas' && typeof finCargar === 'function') finCargar();

  if (typeof updateAllBadges === 'function') updateAllBadges();
}

// ===== DATOS COMPARTIDOS (disponibles para todos los módulos) =====
// Se leen desde localStorage al iniciar; cada módulo puede actualizarlos.
window.APP = {
  lsGet(key, def = []) {
    try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; }
  },
  lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error('localStorage error:', e); }
  },

  // ── Toast notifications ──
  toast: {
    show(mensaje, tipo = 'success', duracion = 3000) {
      let container = document.querySelector('.toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
      }
      const t = document.createElement('div');
      t.className = 'toast ' + tipo;
      t.textContent = mensaje;
      container.appendChild(t);
      if (duracion > 0) {
        setTimeout(() => {
          t.style.opacity = '0';
          t.style.transition = 'opacity 0.3s';
          setTimeout(() => t.remove(), 300);
        }, duracion);
      }
    }
  },

  // ── Estado de carga en botones ──
  btnCargando(btn, texto) {
    btn.disabled = true;
    btn.dataset.original = btn.innerHTML;
    btn.innerHTML = '⏳ ' + (texto || 'Guardando...');
  },
  btnListo(btn) {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.original || btn.innerHTML;
  },

  // ── Formateo de mensajes amigables ──
  msg: {
    eliminar(entidad = 'este registro') {
      return `¿Estás seguro que quieres eliminar ${entidad}? Esta acción no se puede deshacer.`;
    },
    error(detalle = '') {
      return 'Hubo un problema' + (detalle ? ': ' + detalle : '') + '. Intenta de nuevo.';
    },
    sinDatos() { return 'Sin datos'; },
  },

  // ── Autoguardado de formularios ──
  borrador: {
    _interval: null,
    iniciar(clave, fnDatos, elStatus) {
      this.detener();
      this._interval = setInterval(() => {
        const datos = fnDatos();
        if (!datos) return;
        APP.lsSet(clave, { datos, ts: Date.now() });
        if (elStatus) {
          const hora = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
          elStatus.textContent = '✓ Borrador guardado ' + hora;
        }
      }, 120000);
    },
    detener() {
      if (this._interval) { clearInterval(this._interval); this._interval = null; }
    },
    verificar(clave, onRecuperar) {
      const b = APP.lsGet(clave, null);
      if (!b || !b.datos) return;
      const fecha = new Date(b.ts).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      APP.toast.show(`Hay un borrador sin guardar del ${fecha}`, 'warning', 0);
      // Mostrar opción de recuperar via modal
      setTimeout(() => {
        const t = document.querySelector('.toast.warning');
        if (!t) return;
        const btn = document.createElement('button');
        btn.className = 'btn bpa';
        btn.style.cssText = 'margin-left:10px;min-height:28px;padding:4px 10px;font-size:11px;';
        btn.textContent = 'Recuperar';
        btn.onclick = () => { onRecuperar(b.datos); t.remove(); };
        t.appendChild(btn);
        t.style.pointerEvents = 'auto';
      }, 100);
    },
    limpiar(clave) {
      APP.lsSet(clave, null);
    },
  },

  // ── Modo Taller ──
  modoTaller: {
    get activo() {
      const cfg = APP.lsGet('config', {});
      return !!cfg.modo_taller;
    },
    activar() {
      const cfg = APP.lsGet('config', {});
      cfg.modo_taller = true;
      APP.lsSet('config', cfg);
      document.body.classList.add('modo-taller');
      const btn = document.getElementById('btn-modo-taller');
      if (btn) { btn.classList.add('activo'); btn.innerHTML = '🔧 Modo Taller: ON'; }
    },
    desactivar() {
      const cfg = APP.lsGet('config', {});
      cfg.modo_taller = false;
      APP.lsSet('config', cfg);
      document.body.classList.remove('modo-taller');
      const btn = document.getElementById('btn-modo-taller');
      if (btn) { btn.classList.remove('activo'); btn.innerHTML = '🔧 Modo Taller'; }
    },
    toggle() {
      this.activo ? this.desactivar() : this.activar();
    },
    init() {
      // Activar en móvil automáticamente
      const esMobil = window.innerWidth <= 768;
      if (esMobil || this.activo) this.activar();
    },
  },

  // ── Logo del Taller ──
  getLogoTaller() {
    try { return localStorage.getItem('config_logo_taller'); } catch { return null; }
  },

  // ── Modales dinámicos (confirmaciones) ──
  modal: {
    abrir(htmlContenido, tamaño = 'mediano') {
      this.cerrar();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'app-modal-overlay';
      const cls = tamaño === 'grande' ? 'modal-grande' : (tamaño === 'pequeño' || tamaño === 'pequeno') ? 'modal-peq' : 'modal-mediano';
      overlay.innerHTML = `<div class="${cls}">${htmlContenido}</div>`;
      overlay.addEventListener('click', e => { if (e.target === overlay) this.cerrar(); });
      document.body.appendChild(overlay);
      const escFn = e => { if (e.key === 'Escape') { this.cerrar(); document.removeEventListener('keydown', escFn); } };
      document.addEventListener('keydown', escFn);
      return overlay;
    },
    cerrar() {
      const el = document.getElementById('app-modal-overlay');
      if (el) el.remove();
    },
    custom(titulo, contenidoHtml, onGuardar, textoGuardar = 'Guardar', textoCancelar = 'Cancelar') {
      const html = `
        <div class="modal-header">
          <h2>${titulo}</h2>
          <button class="modal-close" onclick="APP.modal.cerrar()">×</button>
        </div>
        <div class="modal-body" style="padding:20px">${contenidoHtml}</div>
        <div class="modal-footer">
          <button class="btn" onclick="APP.modal.cerrar()">${textoCancelar}</button>
          <button class="btn bpa" id="app-modal-ok-btn">${textoGuardar}</button>
        </div>`;
      this.abrir(html, 'mediano');
      document.getElementById('app-modal-ok-btn').addEventListener('click', () => {
        onGuardar();
      });
    },
    confirmar(mensaje, onSi, textoSi = 'Sí, confirmar', textoNo = 'Cancelar') {
      const html = `
        <div class="modal-header">
          <h2>¿Confirmar acción?</h2>
          <button class="modal-close" onclick="APP.modal.cerrar()">×</button>
        </div>
        <div class="modal-body" style="padding:20px 20px 8px;font-size:13px;color:var(--text-primary)">${mensaje}</div>
        <div class="modal-footer">
          <button class="btn" onclick="APP.modal.cerrar()">${textoNo}</button>
          <button class="btn bpa" id="app-modal-ok-btn">${textoSi}</button>
        </div>`;
      this.abrir(html, 'pequeño');
      document.getElementById('app-modal-ok-btn').addEventListener('click', () => {
        this.cerrar();
        onSi();
      });
    }
  },
};

// ═══════════════════════════════════════════════════════════════════
// DATOS DE EJEMPLO — Inicialización completa
// ═══════════════════════════════════════════════════════════════════

function initExampleData() {
  // SOLO si la app está vacía (primera vez)

  // Usuarios/Operarios
  if (!APP.lsGet('usuarios') || APP.lsGet('usuarios').length === 0) {
    APP.lsSet('usuarios', [
      { id: 'op_001', nombre: 'Camilo', apellido: 'Yañez', rut: '18.915.883-0', whatsapp: '+56951655331', rol: 'mecanico', formacion: { nivel: 'profesional', especialidad: 'Mecánica automotriz', institucion: 'Universidad Técnica', año_egreso: 2015, titulo_validado: true }, experiencia: { años: 8, especialidades: 'Motor, frenos, suspensión' } },
      { id: 'op_002', nombre: 'Cecilia', apellido: 'Puente', rut: '15.123.456-8', whatsapp: '+56923145698', rol: 'mecanico', formacion: { nivel: 'tecnico', especialidad: 'Electricidad automotriz', institucion: 'INACAP', año_egreso: 2018 }, experiencia: { años: 5, especialidades: 'Sistemas eléctricos, diagnóstico' } },
      { id: 'admin_001', nombre: 'Admin', apellido: 'Sistema', rut: '00.000.000-0', whatsapp: '+56951234567', rol: 'Administrador' }
    ]);
  }

  // Clientes
  if (!APP.lsGet('clientes') || APP.lsGet('clientes').length === 0) {
    APP.lsSet('clientes', [
      { id: 'cli_001', nombre: 'Juan', apellido: 'Pérez García', rut: '12.345.678-9', whatsapp: '+56912345678', email: 'juan.perez@example.com', direccion: 'Av. Brasil 2543, Valparaíso', ciudad: 'Valparaíso' },
      { id: 'cli_002', nombre: 'Carlos', apellido: 'López Rodríguez', rut: '13.456.789-0', whatsapp: '+56923456789', email: 'carlos.lopez@example.com', direccion: 'Paseo Gervasoni 567, Viña del Mar', ciudad: 'Viña del Mar' },
      { id: 'cli_003', nombre: 'María', apellido: 'Sánchez Martínez', rut: '14.567.890-1', whatsapp: '+56934567890', email: '', direccion: 'Calle Cochrane 123, Quilpué', ciudad: 'Quilpué' }
    ]);
  }

  // Vehículos
  if (!APP.lsGet('vehiculos') || APP.lsGet('vehiculos').length === 0) {
    APP.lsSet('vehiculos', [
      { id: 'veh_001', patente: 'JKLL13', marca: 'Nissan', modelo: 'Versa', año: 2016, color: 'Blanco', cliente_id: 'cli_001', cliente_nombre: 'Juan Pérez', km: 150000, motor: 'asdsfdasfvsxcs', chasis: 'asdsdfsdfsdasdsdas' },
      { id: 'veh_002', patente: 'XYZW98', marca: 'Toyota', modelo: 'Corolla', año: 2018, color: 'Gris', cliente_id: 'cli_002', cliente_nombre: 'Carlos López', km: 85000, motor: 'asdasd123', chasis: 'asdasd456' },
      { id: 'veh_003', patente: 'QWER45', marca: 'Hyundai', modelo: 'i30', año: 2019, color: 'Rojo', cliente_id: 'cli_003', cliente_nombre: 'María Sánchez', km: 62000, motor: 'hyundai789', chasis: 'hyundai012' }
    ]);
  }

  // Categorías de servicios
  if (!APP.lsGet('svc_categorias') || APP.lsGet('svc_categorias').length === 0) {
    APP.lsSet('svc_categorias', [
      { id: 'cat_001', nombre: 'Frenos', color_hex: '#FF6B6B' },
      { id: 'cat_002', nombre: 'Motor', color_hex: '#4ECDC4' },
      { id: 'cat_003', nombre: 'Suspensión', color_hex: '#45B7D1' },
      { id: 'cat_004', nombre: 'Eléctrico', color_hex: '#FFA07A' },
      { id: 'cat_005', nombre: 'Mantenimiento', color_hex: '#98D8C8' }
    ]);
  }

  // Servicios
  if (!APP.lsGet('servicios') || APP.lsGet('servicios').length === 0) {
    APP.lsSet('servicios', [
      { id: 'svc_001', nombre: 'Cambio de pastillas de freno delanteras', categoria: 'Frenos', precio_venta: 50000, precio_costo: 25000, horas_estimadas: 1.5, margen: 30 },
      { id: 'svc_002', nombre: 'Alineación y balanceo', categoria: 'Suspensión', precio_venta: 80000, precio_costo: 40000, horas_estimadas: 2, margen: 30 },
      { id: 'svc_003', nombre: 'Cambio de aceite y filtro', categoria: 'Mantenimiento', precio_venta: 35000, precio_costo: 15000, horas_estimadas: 1, margen: 40 },
      { id: 'svc_004', nombre: 'Diagnóstico de motor', categoria: 'Motor', precio_venta: 45000, precio_costo: 20000, horas_estimadas: 1.5, margen: 35 },
      { id: 'svc_005', nombre: 'Reparación de alternador', categoria: 'Eléctrico', precio_venta: 120000, precio_costo: 60000, horas_estimadas: 2.5, margen: 30 }
    ]);
  }

  // Repuestos
  if (!APP.lsGet('repuestos') || APP.lsGet('repuestos').length === 0) {
    APP.lsSet('repuestos', [
      { id: 'rep_001', codigo: 'FREN-001', nombre: 'Juego de pastillas de freno delanteras', marca: 'Bosch', categoria: 'Frenos', precio_compra: 25000, precio_venta: 40000, stock: 15, stock_minimo: 5, margen: 25, ubicacion: 'Estante A1' },
      { id: 'rep_002', codigo: 'FILT-001', nombre: 'Filtro de aceite motor', marca: 'Mobil', categoria: 'Mantenimiento', precio_compra: 8000, precio_venta: 12000, stock: 50, stock_minimo: 20, margen: 30, ubicacion: 'Estante B2' },
      { id: 'rep_003', codigo: 'COMB-001', nombre: 'Bomba de combustible', marca: 'Delphi', categoria: 'Motor', precio_compra: 75000, precio_venta: 120000, stock: 3, stock_minimo: 2, margen: 35, ubicacion: 'Estante C3' },
      { id: 'rep_004', codigo: 'AMORT-001', nombre: 'Amortiguador trasero', marca: 'KYB', categoria: 'Suspensión', precio_compra: 45000, precio_venta: 70000, stock: 2, stock_minimo: 3, margen: 25, ubicacion: 'Estante D1' }
    ]);
  }

  // Proveedores
  if (!APP.lsGet('proveedores') || APP.lsGet('proveedores').length === 0) {
    APP.lsSet('proveedores', [
      { id: 'prov_001', nombre: 'Repuestos Chile Ltda', rut: '76.543.210-8', whatsapp: '+56912765432', email: 'ventas@repuestoschile.cl', especialidad: 'Repuestos y servicios', marcas: ['Toyota', 'Nissan', 'Hyundai'], notas: 'Descuento en compras mayores a $500.000' },
      { id: 'prov_002', nombre: 'AutoPartes SUR', rut: '78.901.234-5', whatsapp: '+56923456789', email: 'info@autopartessur.cl', especialidad: 'Frenos y suspensión', marcas: ['Bosch', 'KYB', 'Monroe'], notas: 'Entrega rápida' },
      { id: 'prov_003', nombre: 'BREMBO Chile', rut: '80.123.456-7', whatsapp: '+56934567890', email: 'contacto@brembo.cl', especialidad: 'Sistemas de frenado', marcas: ['BREMBO'], notas: 'Proveedor oficial' }
    ]);
  }

  // OTs (Órdenes de Trabajo)
  if (!APP.lsGet('ots') || APP.lsGet('ots').length === 0) {
    APP.lsSet('ots', [
      {
        id: 'OT-001', numero: '20260628001', fecha_creacion: '2026-06-28', fecha_cita: '2026-06-28', hora_cita: '09:00',
        cliente_nombre: 'Juan', cliente_apellido: 'Pérez', cliente_rut: '12.345.678-9', cliente_whatsapp: '+56912345678',
        patente: 'JKLL13', marca: 'Nissan', modelo: 'Versa', año: 2016, color: 'Blanco', km_entrada: 150000, motor: 'asdsfdasfvsxcs', chasis: 'asdsdfsdfsdasdsdas',
        motivo_ingreso: 'Ruido en las ruedas delanteras al frenar', id_tecnico_asignado: 'op_001', tecnico_nombre: 'Camilo Yañez',
        servicios: [{ id: 'svc_001', nombre: 'Cambio de pastillas de freno delanteras', categoria: 'Frenos', precio_venta: 50000, horas: 1.5, mano_obra: 50000 }],
        repuestos: [{ id: 'rep_001', nombre: 'Juego de pastillas de freno', cantidad: 1, precio_unitario: 40000, subtotal: 40000 }],
        estado: 'en_proceso', subtotal_servicios: 50000, subtotal_repuestos: 40000, total_sin_iva: 90000, iva: 17100, total_con_iva: 107100
      },
      {
        id: 'OT-002', numero: '20260627002', fecha_creacion: '2026-06-27', fecha_cita: '2026-06-27', hora_cita: '14:00',
        cliente_nombre: 'Carlos', cliente_apellido: 'López', cliente_rut: '13.456.789-0', cliente_whatsapp: '+56923456789',
        patente: 'XYZW98', marca: 'Toyota', modelo: 'Corolla', año: 2018, color: 'Gris', km_entrada: 85000, motor: 'asdasd123', chasis: 'asdasd456',
        motivo_ingreso: 'Cambio de aceite y revisión general', id_tecnico_asignado: 'op_002', tecnico_nombre: 'Cecilia Puente',
        servicios: [{ id: 'svc_003', nombre: 'Cambio de aceite y filtro', categoria: 'Mantenimiento', precio_venta: 35000, horas: 1, mano_obra: 35000 }],
        repuestos: [{ id: 'rep_002', nombre: 'Filtro de aceite motor', cantidad: 1, precio_unitario: 12000, subtotal: 12000 }],
        estado: 'completada', subtotal_servicios: 35000, subtotal_repuestos: 12000, total_sin_iva: 47000, iva: 8930, total_con_iva: 55930,
        fecha_cierre: '2026-06-27', hora_cierre: '15:30', metodo_pago: 'Transferencia'
      }
    ]);
  }

  // Finanzas - Flujo de caja
  if (!APP.lsGet('finanzas_flujo_caja') || APP.lsGet('finanzas_flujo_caja').length === 0) {
    APP.lsSet('finanzas_flujo_caja', [
      { id: 'mov_001', fecha: '2026-06-27', descripcion: 'Utilidad líquida dueño — OT #002', categoria: 'Utilidad líquida dueño', tipo: 'ingreso', monto: 35000, ot_id: 'OT-002' },
      { id: 'mov_002', fecha: '2026-06-27', descripcion: 'IVA cobrado — OT #002', categoria: 'IVA débito fiscal', tipo: 'ingreso', monto: 8930, ot_id: 'OT-002' },
      { id: 'mov_003', fecha: '2026-06-05', descripcion: 'Arriendo oficina junio', categoria: 'Arriendo', tipo: 'egreso', monto: 800000 }
    ]);
  }

  // Finanzas - Libro de compras
  if (!APP.lsGet('finanzas_libro_compras') || APP.lsGet('finanzas_libro_compras').length === 0) {
    APP.lsSet('finanzas_libro_compras', [
      { id: 'comp_001', fecha: '2026-06-20', proveedor: 'Repuestos Chile Ltda', rut: '76.543.210-8', numero_factura: 'FAC-001234', neto: 500000, iva: 95000, estado: 'Pagado' }
    ]);
  }

  // Finanzas - Notas de crédito
  if (!APP.lsGet('finanzas_notas_credito') || APP.lsGet('finanzas_notas_credito').length === 0) {
    APP.lsSet('finanzas_notas_credito', [
      { id: 'nota_001', fecha: '2026-06-12', numero_nota: 'NC-001', entidad: 'Repuestos Chile Ltda', documento_referencia: 'FAC-001234', neto: 100000, iva: 19000, tipo: 'Compra' },
      { id: 'nota_002', fecha: '2026-06-15', numero_nota: 'NC-002', entidad: 'Juan Pérez', documento_referencia: 'OT-001', neto: 50000, iva: 9500, tipo: 'Venta' }
    ]);
  }

  // Finanzas - Remuneraciones
  if (!APP.lsGet('finanzas_remuneraciones') || APP.lsGet('finanzas_remuneraciones').length === 0) {
    APP.lsSet('finanzas_remuneraciones', [
      { id: 'renum_001', id_operario: 'op_001', nombre_operario: 'Camilo Yañez', modalidad: 'Contrato', bruto: 1500000, descuentos: 225000, a_pagar: 1275000, estado: 'Pendiente', mes: 6, año: 2026 }
    ]);
  }

  // Finanzas - Proveedores (cuentas por pagar)
  if (!APP.lsGet('finanzas_proveedores') || APP.lsGet('finanzas_proveedores').length === 0) {
    APP.lsSet('finanzas_proveedores', [
      { id: 'prov_cxp_001', fecha: '2026-06-10', proveedor: 'AutoPartes SUR', rut: '78.901.234-5', numero_factura: 'FAC-5678', neto: 350000, iva: 66500, fecha_vencimiento: '2026-07-10', estado: 'Pendiente' }
    ]);
  }

  // Motor contable config
  if (!APP.lsGet('motor_contable_config')) {
    APP.lsSet('motor_contable_config', {
      cuentas: [
        { nombre: 'Gastos fijos', descripcion: 'Arriendo, luz, agua, etc.', porcentaje: 30, color: '#FF6B6B' },
        { nombre: 'Técnico asignado', descripcion: 'Comisión del mecánico', porcentaje: 35, color: '#4ECDC4' },
        { nombre: 'Fondo reinversión', descripcion: 'Herramientas y mejoras', porcentaje: 15, color: '#45B7D1' },
        { nombre: 'Utilidad líquida dueño', descripcion: 'Retiro directo', porcentaje: 20, color: '#FFD93D' }
      ]
    });
  }

  // Datos del taller
  if (!APP.lsGet('taller_config')) {
    APP.lsSet('taller_config', {
      nombre_fantasia: 'Garage 16 Valve',
      rut: '76.123.456-7',
      telefono: '+56951234567',
      direccion: 'Avenida Brasil 2543, Valparaíso',
      ciudad: 'Valparaíso',
      region: 'Valparaíso',
      link_agenda: 'https://integral-automotriz-spa.reservio.com/booking',
      logo_base64: '',
      hora_inicio: '09:00',
      hora_fin: '18:00',
      descanso_inicio: '13:00',
      descanso_fin: '14:00',
      capacidad_maxima: 8,
      precio_minimo_hora: 25000
    });
  }

  // Sincronizar datos nuevos → legacy keys (compatibilidad)
  if (APP.lsGet('ots') && APP.lsGet('ots').length && (!APP.lsGet('mp_ots') || !APP.lsGet('mp_ots').length)) {
    APP.lsSet('mp_ots', APP.lsGet('ots'));
  }
  if (APP.lsGet('clientes') && APP.lsGet('clientes').length && (!APP.lsGet('mp_clientes') || !APP.lsGet('mp_clientes').length)) {
    APP.lsSet('mp_clientes', APP.lsGet('clientes'));
  }
  if (APP.lsGet('repuestos') && APP.lsGet('repuestos').length && (!APP.lsGet('mp_inventario') || !APP.lsGet('mp_inventario').length)) {
    const inv = APP.lsGet('repuestos').map(r => ({
      c: r.codigo || '', n: r.nombre, m: r.marca || '', ub: r.ubicacion || '',
      st: r.stock, mn: r.stock_minimo || 5, p: '$' + (r.precio_venta || 0).toLocaleString('es-CL'),
      e: r.stock < (r.stock_minimo || 5) ? 's-crit' : 's-done', et: r.stock < (r.stock_minimo || 5) ? 'Crítico' : 'OK'
    }));
    APP.lsSet('mp_inventario', inv);
  }
  if (APP.lsGet('proveedores') && APP.lsGet('proveedores').length && (!APP.lsGet('mp_proveedores') || !APP.lsGet('mp_proveedores').length)) {
    APP.lsSet('mp_proveedores', APP.lsGet('proveedores'));
  }

  // Sincronizar taller_config → mp_taller_config (compatibilidad)
  const tc = APP.lsGet('taller_config');
  if (tc) {
    const mtc = APP.lsGet('mp_taller_config', {});
    const sync = {
      ...mtc,
      nombre: mtc.nombre || tc.nombre_fantasia,
      rut: mtc.rut || tc.rut,
      direccion: mtc.direccion || tc.direccion,
      telefono: mtc.telefono || tc.telefono,
      agenda: mtc.agenda || tc.link_agenda,
      horaInicio: mtc.horaInicio || tc.hora_inicio || '09:00',
      horaFin: mtc.horaFin || tc.hora_fin || '18:00',
      capHorasDia: mtc.capHorasDia || tc.capacidad_maxima || 8,
      precioMinHora: mtc.precioMinHora || tc.precio_minimo_hora || 0,
      horaDescansoInicio: mtc.horaDescansoInicio || tc.descanso_inicio || '13:00',
      horaDescansoFin: mtc.horaDescansoFin || tc.descanso_fin || '14:00'
    };
    APP.lsSet('mp_taller_config', sync);
  }

  console.log('✅ Datos de ejemplo inicializados correctamente');
}

// ═══════════════════════════════════════════════════════════════════
// SISTEMA DE BADGES DINÁMICOS
// ═══════════════════════════════════════════════════════════════════

function updateAllBadges() {
  updateBadgeAgenda();
  updateBadgeOT();
  updateBadgeRepuestos();
  updateBadgeClientes();
}

function updateBadgeAgenda() {
  const ots = APP.lsGet('ots') || [];
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const dentro7dias = new Date(hoy); dentro7dias.setDate(dentro7dias.getDate() + 7);
  const badge = document.getElementById('badge-agenda');
  if (!badge) return;
  const count = ots.filter(ot => {
    if (!ot.fecha_cita) return false;
    const f = new Date(ot.fecha_cita);
    return f >= hoy && f <= dentro7dias;
  }).length;
  if (count > 0) { badge.textContent = count; badge.style.display = 'inline-block'; }
  else { badge.style.display = 'none'; }
}

function updateBadgeOT() {
  const ots = APP.lsGet('ots') || [];
  const badge = document.getElementById('badge-ot');
  if (!badge) return;
  const count = ots.filter(ot => ot.estado === 'en_proceso').length;
  if (count > 0) { badge.textContent = count; badge.style.display = 'inline-block'; }
  else { badge.style.display = 'none'; }
}

function updateBadgeRepuestos() {
  const repuestos = APP.lsGet('repuestos') || [];
  const badge = document.getElementById('badge-repuestos');
  if (!badge) return;
  const count = repuestos.filter(rep => rep.stock < (rep.stock_minimo || 5)).length;
  if (count > 0) { badge.textContent = count; badge.style.display = 'inline-block'; }
  else { badge.style.display = 'none'; }
}

function updateBadgeClientes() {
  const clientes = APP.lsGet('clientes') || [];
  const vehiculos = APP.lsGet('vehiculos') || [];
  const ots = APP.lsGet('ots') || [];
  const badge = document.getElementById('badge-clientes');
  if (!badge) return;
  const sinContacto = clientes.filter(c => !c.whatsapp && !c.email).length;
  const sinOTs = vehiculos.filter(v => !ots.some(ot => ot.id_vehiculo === v.id || ot.patente === v.patente)).length;
  const total = sinContacto + sinOTs;
  if (total > 0) { badge.textContent = total; badge.style.display = 'inline-block'; }
  else { badge.style.display = 'none'; }
}

// ═══════════════════════════════════════════════════════════════════
// MIGRACIÓN: operarios → usuarios (una única fuente)
// ═══════════════════════════════════════════════════════════════════

function migrateOperariosToUsuarios() {
  const usuarios = APP.lsGet('usuarios') || [];
  const operarios = APP.lsGet('operarios') || [];
  const mp_operarios = APP.lsGet('mp_operarios') || [];

  // Si ya hay usuarios, asumir migrado
  if (Array.isArray(usuarios) && usuarios.length > 0) return;

  const todos = [];

  // Migrar desde 'operarios'
  operarios.forEach(op => {
    todos.push({
      id: op.id || 'op_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      nombre: op.nombre || '',
      apellido: op.apellido || '',
      rut: op.rut || '',
      whatsapp: op.whatsapp || op.wz || '',
      email: op.email || '',
      rol: op.rol || 'mecanico',
      estado: op.activo === false ? 'inactivo' : 'activo',
      formacion: op.formacion || {},
      experiencia: op.experiencia || {},
      certificaciones: op.certificaciones || [],
      documentos: op.documentos || {},
      fecha_creacion: op.fecha_creacion || new Date().toISOString().split('T')[0],
    });
  });

  // Migrar desde 'mp_operarios'
  mp_operarios.forEach(op => {
    if (todos.some(t => t.nombre === op.nombre && t.whatsapp === (op.whatsapp || op.wz))) return;
    todos.push({
      id: 'op_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      nombre: op.nombre || '',
      apellido: op.apellido || op.ape || '',
      rut: op.rut || '',
      whatsapp: op.whatsapp || op.wz || '',
      email: op.email || '',
      rol: 'mecanico',
      estado: op.activo === false ? 'inactivo' : 'activo',
      formacion: {},
      experiencia: {},
      certificaciones: [],
      documentos: {},
      fecha_creacion: new Date().toISOString().split('T')[0],
    });
  });

  if (todos.length > 0) {
    APP.lsSet('usuarios', todos);
    console.log('✅ Migración: ' + todos.length + ' operarios → usuarios');
  }
}

// ===== INICIO =====
migrateOperariosToUsuarios();
initExampleData();
nav('dashboard', document.querySelector('.ni.active'));
APP.modoTaller.init();
updateAllBadges();
if (typeof tallerActualizarHeader === 'function') tallerActualizarHeader();
