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

  currentPage = page;
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

// ===== INICIO =====
nav('dashboard', document.querySelector('.ni.active'));
APP.modoTaller.init();
