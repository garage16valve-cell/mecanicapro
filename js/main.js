// ===== CONFIGURACIÓN DE MÓDULOS =====
const MODULE_MAP = {
  dashboard: 'dashboard',
  agenda:    'dashboard',
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
  reportes:  'admin',
  config:    'admin',
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
  reportes:    'Reportes',
  config:      'Configuración',
};

// Módulos ya cargados (HTML + JS inicializados)
const loadedModules = new Set();
let currentPage = 'dashboard';

// ===== CARGA DINÁMICA DE SCRIPTS =====
function loadScript(src) {
  return new Promise((resolve, reject) => {
    // Evitar cargar el mismo script dos veces
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => { console.warn(`No se pudo cargar: ${src}`); resolve(); };
    document.head.appendChild(s);
  });
}

// ===== NAVEGACIÓN PRINCIPAL =====
async function nav(page, el) {
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

  const contentArea = document.getElementById('content-area');

  // ── Cargar módulo por primera vez ──
  if (!loadedModules.has(moduleName)) {
    // Mostrar indicador de carga
    let loadingEl = document.getElementById(`loading-${moduleName}`);
    if (!loadingEl) {
      loadingEl = document.createElement('div');
      loadingEl.id = `loading-${moduleName}`;
      loadingEl.className = 'module-loading module-wrap active';
      loadingEl.innerHTML = '<span class="spin"></span> Cargando módulo…';
      contentArea.appendChild(loadingEl);
    }

    try {
      // Cargar HTML del módulo
      const res = await fetch(`modules/${moduleName}.html`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      // Reemplazar loader con contenido real
      const wrapper = document.createElement('div');
      wrapper.id = `module-${moduleName}`;
      wrapper.className = 'module-wrap';
      wrapper.innerHTML = html;
      contentArea.replaceChild(wrapper, loadingEl);

      // Cargar JS del módulo
      await loadScript(`js/${moduleName}.js`);

      // Llamar al inicializador del módulo si existe
      const initFn = window[`init_${moduleName}`];
      if (typeof initFn === 'function') initFn();

      loadedModules.add(moduleName);
    } catch (err) {
      console.error(`Error cargando módulo "${moduleName}":`, err);
      const errEl = document.getElementById(`loading-${moduleName}`);
      if (errEl) errEl.innerHTML = `<span style="color:var(--text-danger)"><i class="ti ti-alert-circle"></i> Error al cargar el módulo.</span>`;
      return;
    }
  }

  // ── Mostrar/ocultar módulos ──
  document.querySelectorAll('.module-wrap').forEach(m => m.classList.remove('active'));
  const activeModule = document.getElementById(`module-${moduleName}`);
  if (activeModule) activeModule.classList.add('active');

  // ── Mostrar la página correcta dentro del módulo ──
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
};

// ===== INICIO =====
// Cargar el dashboard al abrir la app
nav('dashboard', document.querySelector('.ni.active'));
