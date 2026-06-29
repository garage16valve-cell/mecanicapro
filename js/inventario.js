// ===== MÓDULO: INVENTARIO (Repuestos, Proveedores, Residuos) =====
function init_inventario() {
  invSetTab('inv');
  renderInventario();
  renderMarcasSelector();
  renderProveedores();
  _invCargarConfigRepuestos();
}

// ===== TABS (inv | config) =====
function invSetTab(tab) {
  ['inv','config'].forEach(t => {
    const cnt = document.getElementById('inv-tab-' + t);
    const btn = document.getElementById('inv-tab-btn-' + t);
    if (cnt) cnt.style.display = t === tab ? '' : 'none';
    if (btn) {
      btn.style.borderBottomColor = t === tab ? 'var(--fill-accent)' : 'transparent';
      btn.style.color = t === tab ? 'var(--text-accent)' : 'var(--text-secondary)';
    }
  });
}

// ===== CONFIG REPUESTOS =====
const REP_CAT_DEFAULT = ['Motor', 'Frenos', 'Suspensión', 'Eléctrica', 'Exterior', 'Interior', 'Transmisión', 'Refrigeración', 'Escape', 'Carrocería'];

function _invCargarConfigRepuestos() {
  const cfg = APP.lsGet('rep_config', {});
  const el = document.getElementById('rep-cfg-ganancia');
  if (el) el.value = cfg.ganancia || 30;
  document.getElementById('rep-cfg-stock-min').value = cfg.stock_minimo_alerta || 5;
  document.getElementById('rep-cfg-prov-default').value = cfg.proveedor_predeterminado || '';
  document.getElementById('rep-cfg-iva').checked = cfg.iva_defecto || false;
  document.getElementById('rep-cfg-iva-auto').checked = cfg.iva_automatico || false;
  document.getElementById('rep-cfg-dias-devol').value = cfg.dias_devolucion || 30;
  document.getElementById('rep-cfg-pct-reembolso').value = cfg.porcentaje_reembolso || 100;
  document.getElementById('rep-cfg-caducidad-activo').checked = cfg.control_caducidad_activo || false;
  document.getElementById('rep-cfg-caducidad-detalle').style.display = cfg.control_caducidad_activo ? '' : 'none';
  document.getElementById('rep-cfg-dias-alerta-venc').value = cfg.dias_alerta_vencimiento || 30;
  invRenderCategorias(cfg.categorias || REP_CAT_DEFAULT);
  invCargarProveedoresSelect();
  repCalcEjemplo();
}

function invGuardarConfigRepuestos() {
  const g = id => (document.getElementById(id)?.value || '').trim();
  const cfg = {
    ganancia: parseFloat(g('rep-cfg-ganancia')) || 0,
    stock_minimo_alerta: parseInt(g('rep-cfg-stock-min')) || 5,
    proveedor_predeterminado: document.getElementById('rep-cfg-prov-default')?.value || '',
    iva_defecto: !!document.getElementById('rep-cfg-iva')?.checked,
    iva_automatico: !!document.getElementById('rep-cfg-iva-auto')?.checked,
    dias_devolucion: parseInt(g('rep-cfg-dias-devol')) || 30,
    porcentaje_reembolso: parseInt(g('rep-cfg-pct-reembolso')) || 100,
    control_caducidad_activo: !!document.getElementById('rep-cfg-caducidad-activo')?.checked,
    dias_alerta_vencimiento: parseInt(g('rep-cfg-dias-alerta-venc')) || 30,
    categorias: _repCategoriasActuales || REP_CAT_DEFAULT
  };
  APP.lsSet('rep_config', cfg);
  APP.toast.show('Configuración guardada', 'success');
}

function repCalcEjemplo() {
  const ganancia = parseFloat(document.getElementById('rep-cfg-ganancia')?.value) || 0;
  const precio   = 10000;
  const sinIva   = Math.round(precio * (1 + ganancia / 100));
  const el       = document.getElementById('rep-calc-ejemplo');
  if (el) el.textContent = '$' + sinIva.toLocaleString('es-CL') + ' CLP (sin IVA)';
  const chk = document.getElementById('rep-cfg-iva');
  const ivaEl = document.getElementById('rep-calc-iva');
  if (chk && ivaEl) {
    if (chk.checked) {
      ivaEl.style.display = '';
      ivaEl.textContent = '$' + Math.round(sinIva * 1.19).toLocaleString('es-CL') + ' CLP (c/IVA 19%)';
    } else {
      ivaEl.style.display = 'none';
    }
  }
}

// Handler para checkbox caducidad
function invToggleCaducidad() {
  const chk = document.getElementById('rep-cfg-caducidad-activo');
  const detalle = document.getElementById('rep-cfg-caducidad-detalle');
  if (chk && detalle) {
    detalle.style.display = chk.checked ? '' : 'none';
  }
}

let _repCategoriasActuales = [...REP_CAT_DEFAULT];

function invRenderCategorias(cats) {
  _repCategoriasActuales = [...cats];
  const c = document.getElementById('rep-cfg-cat-list');
  if (!c) return;
  c.innerHTML = _repCategoriasActuales.map(cat => `
    <span class="data-pill" style="display:inline-flex;align-items:center;gap:4px;background:var(--bg-accent);color:var(--text-accent);padding:4px 8px;border-radius:20px;font-size:10px">
      ${cat}
      <button type="button" onclick="invEliminarCategoria('${cat}')" style="background:none;border:none;color:inherit;cursor:pointer;padding:0;font-size:11px;line-height:1">×</button>
    </span>
  `).join('');
}

function invAgregarCategoria() {
  const input = document.getElementById('rep-cfg-cat-new');
  const v = (input?.value || '').trim();
  if (!v) return;
  if (_repCategoriasActuales.includes(v)) { APP.toast.show('⚠️ Categoría ya existe', 'warning'); return; }
  _repCategoriasActuales.push(v);
  input.value = '';
  invRenderCategorias(_repCategoriasActuales);
  APP.toast.show('Categoría agregada', 'success');
}

function invEliminarCategoria(cat) {
  if (!confirm('¿Eliminar categoría "' + cat + '"?')) return;
  _repCategoriasActuales = _repCategoriasActuales.filter(c => c !== cat);
  invRenderCategorias(_repCategoriasActuales);
  APP.toast.show('Categoría eliminada', 'success');
}

function invResetearConfig() {
  if (!confirm('¿Restaurar TODA la configuración a valores por defecto?')) return;
  const cfg = {
    ganancia: 30,
    stock_minimo_alerta: 5,
    proveedor_predeterminado: '',
    iva_defecto: false,
    iva_automatico: false,
    dias_devolucion: 30,
    porcentaje_reembolso: 100,
    control_caducidad_activo: false,
    dias_alerta_vencimiento: 30,
    categorias: [...REP_CAT_DEFAULT]
  };
  APP.lsSet('rep_config', cfg);
  _invCargarConfigRepuestos();
  APP.toast.show('Configuración restaurada', 'success');
}

// ===== INVENTARIO DE REPUESTOS =====
const INV_DEFAULT = [
  { c:'FIL-5W30', n:'Filtro aceite 5W-30',       m:'Bosch',  ub:'Estante A, Fila 1', st:2,  mn:5,  p:'$4.500',  e:'s-crit', et:'Crítico' },
  { c:'PAS-DEL',  n:'Pastillas freno delantero',  m:'Brembo', ub:'Estante B, Fila 3', st:4,  mn:6,  p:'$28.000', e:'s-prog', et:'Bajo'    },
  { c:'ACE-5W40', n:'Aceite motor 5W-40 1L',      m:'Mobil 1',ub:'Estante A, Fila 2', st:24, mn:10, p:'$6.200',  e:'s-done', et:'OK'      },
  { c:'FIL-AIR',  n:'Filtro de aire universal',   m:'Mann',   ub:'Estante C, Fila 1', st:8,  mn:4,  p:'$12.000', e:'s-done', et:'OK'      },
  { c:'COR-SER',  n:'Correa distribución',        m:'Gates',  ub:'Estante D, Fila 2', st:2,  mn:3,  p:'$45.000', e:'s-crit', et:'Crítico' },
];

function renderInventario() {
  const w = document.getElementById('inv-wrapper');
  if (!w) return;
  const items = APP.lsGet('mp_inventario', INV_DEFAULT);
  const cfg = APP.lsGet('rep_config', {});
  const stockMinAlerta = cfg.stock_minimo_alerta || 5;
  w.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.style.cssText = 'background:var(--surface-2);border:0.5px solid var(--border);border-radius:12px;overflow:hidden';

  const cols = '80px 1fr 90px 110px 60px 60px 70px 90px';
  const hdr = document.createElement('div');
  hdr.style.cssText = `padding:9px 14px;display:grid;grid-template-columns:${cols};gap:8px;font-size:9px;color:var(--text-muted);font-weight:500;text-transform:uppercase;letter-spacing:.05em;border-bottom:0.5px solid var(--border);background:var(--surface-1)`;
  hdr.innerHTML = '<span>Código</span><span>Descripción</span><span>Marca</span><span>Ubicación</span><span>Stock</span><span>Mín.</span><span>Precio</span><span>Estado</span>';
  wrap.appendChild(hdr);

  items.forEach(i => {
    const r = document.createElement('div');
    r.style.cssText = `padding:9px 14px;display:grid;grid-template-columns:${cols};gap:8px;align-items:center;font-size:11px;border-bottom:0.5px solid var(--border)`;
    const stockBajo = i.st < stockMinAlerta;
    const stockDisplay = stockBajo
      ? `<span style="display:flex;align-items:center;gap:4px;font-weight:700;color:var(--text-danger)"><i class="ti ti-alert-triangle" style="font-size:10px"></i>${i.st}</span>`
      : `<span style="font-weight:500;${i.st <= i.mn ? 'color:var(--text-danger)' : ''}">${i.st}</span>`;
    r.innerHTML = `
      <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">${i.c}</span>
      <span>${i.n}</span>
      <span style="color:var(--text-secondary)">${i.m}</span>
      <span style="font-size:10px;color:var(--text-muted)">${i.ub}</span>
      ${stockDisplay}
      <span style="color:var(--text-muted)">${i.mn}</span>
      <span>${i.p}</span>
      <span class="st ${i.e}"><span class="dot"></span>${stockBajo ? 'Stock bajo' : i.et}</span>`;
    wrap.appendChild(r);
  });

  w.appendChild(wrap);
}

// ===== PROVEEDORES =====
const MARCAS_BASE = ['Toyota','Hyundai','Kia','Chevrolet','Suzuki','Nissan','Honda','Ford','Volkswagen','Mazda','Mitsubishi','Subaru','JAC','Chery','BYD','Mercedes-Benz','BMW','Renault','Peugeot','Fiat'];
const PROV_DEFAULT = [
  { id:1, nombre:'Repuestos Chile Ltda.', vendedor:'Carlos Vega',  pais:'+56', wzp:'9 4521 3322', email:'cvega@repuestochile.cl', web:'https://repuestochile.cl', cat:'Filtros y lubricantes', marcas:['Toyota','Hyundai','Kia','Nissan'],           notas:'Despacho 24h, descuento 8% sobre $500k' },
  { id:2, nombre:'AutoPartes SUR',        vendedor:'Ana Torres',   pais:'+56', wzp:'9 8821 4400', email:'atorres@autopartessur.cl',web:'',                         cat:'Motor y distribución',   marcas:['Chevrolet','Ford','Jeep'],                  notas:'Pago a 30 días' },
  { id:3, nombre:'BREMBO Chile',          vendedor:'Roberto Díaz', pais:'+56', wzp:'9 6633 2211', email:'rdiaz@brembo.cl',        web:'',                         cat:'Frenos y embragues',     marcas:['BMW','Mercedes-Benz','Volkswagen'],          notas:'Solo originales, mínimo $200k' },
];

let marcasSeleccionadas = [];
let editandoProvId = null;

function renderMarcasSelector() {
  const c = document.getElementById('marcas-selector');
  if (!c) return;
  const proveedores = APP.lsGet('mp_proveedores', PROV_DEFAULT);
  const todas = [...MARCAS_BASE, ...proveedores.flatMap(p => p.marcas || [])].filter((v, i, a) => a.indexOf(v) === i).sort();
  c.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:2px">' +
    todas.map(m => `<span class="marca-chip${marcasSeleccionadas.includes(m) ? ' sel' : ''}" onclick="toggleMarca('${m}')">${m}</span>`).join('') +
    '</div>';
  renderMarcasSel();
}

function toggleMarca(m) {
  marcasSeleccionadas.includes(m)
    ? marcasSeleccionadas = marcasSeleccionadas.filter(x => x !== m)
    : marcasSeleccionadas.push(m);
  renderMarcasSelector();
}

function renderMarcasSel() {
  const c = document.getElementById('marcas-seleccionadas');
  if (!c) return;
  c.innerHTML = marcasSeleccionadas.length
    ? marcasSeleccionadas.map(m => `<span class="data-pill"><i class="ti ti-check" style="font-size:9px"></i>${m}</span>`).join('')
    : '<span style="font-size:11px;color:var(--text-muted)">Ninguna seleccionada</span>';
}

function agregarMarcaCustom() {
  const i = document.getElementById('marca-custom');
  const v = (i?.value || '').trim();
  if (!v) return;
  if (!marcasSeleccionadas.includes(v)) marcasSeleccionadas.push(v);
  if (i) i.value = '';
  renderMarcasSelector();
}

function guardarProveedor() {
  const nombre = (document.getElementById('pf-nombre')?.value || '').trim();
  if (!nombre) { alert('Ingresa el nombre del proveedor.'); return; }

  const p = {
    id: editandoProvId || Date.now(),
    nombre,
    vendedor: document.getElementById('pf-vendedor')?.value.trim() || '',
    pais:     document.getElementById('pf-pais')?.value || '+56',
    wzp:      document.getElementById('pf-wzp')?.value.trim() || '',
    email:    document.getElementById('pf-email')?.value.trim() || '',
    web:      document.getElementById('pf-web')?.value.trim() || '',
    cat:      document.getElementById('pf-cat')?.value || '',
    marcas:   [...marcasSeleccionadas],
    notas:    document.getElementById('pf-notas')?.value.trim() || '',
  };

  const proveedores = APP.lsGet('mp_proveedores', PROV_DEFAULT);
  if (editandoProvId) {
    const idx = proveedores.findIndex(x => x.id === editandoProvId);
    if (idx >= 0) proveedores[idx] = p;
  } else {
    proveedores.push(p);
  }
  APP.lsSet('mp_proveedores', proveedores);
  limpiarForm();
  cerrarModalProveedor();
  renderProveedores();
}

function limpiarForm() {
  ['pf-nombre','pf-vendedor','pf-wzp','pf-email','pf-web','pf-notas'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const cat = document.getElementById('pf-cat'); if (cat) cat.value = '';
  const pais = document.getElementById('pf-pais'); if (pais) pais.value = '+56';
  marcasSeleccionadas = [];
  editandoProvId = null;
  renderMarcasSelector();
}

function editarProv(id) {
  const proveedores = APP.lsGet('mp_proveedores', PROV_DEFAULT);
  const p = proveedores.find(x => x.id === id);
  if (!p) return;
  editandoProvId = id;
  const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ''; };
  set('pf-nombre', p.nombre); set('pf-vendedor', p.vendedor);
  set('pf-pais', p.pais || '+56'); set('pf-wzp', p.wzp);
  set('pf-email', p.email); set('pf-web', p.web);
  set('pf-cat', p.cat); set('pf-notas', p.notas);
  marcasSeleccionadas = [...(p.marcas || [])];
  const t = document.getElementById('prov-modal-title'); if (t) t.textContent = 'Editar: ' + p.nombre;
  renderMarcasSelector();
  abrirModalProveedor();
}

function eliminarProv(id) {
  if (!confirm('¿Eliminar este proveedor?')) return;
  const proveedores = APP.lsGet('mp_proveedores', PROV_DEFAULT).filter(p => p.id !== id);
  APP.lsSet('mp_proveedores', proveedores);
  renderProveedores();
}

function abrirWzProv() {
  const pais = document.getElementById('pf-pais')?.value || '+56';
  const num  = (document.getElementById('pf-wzp')?.value || '').replace(/\D/g, '');
  if (!num) { alert('Ingresa un número WhatsApp.'); return; }
  window.open('https://wa.me/' + pais.replace('+', '') + num, '_blank');
}

function abrirWzCard(pais, wzp) {
  window.open('https://wa.me/' + (pais || '+56').replace('+', '') + (wzp || '').replace(/\D/g, ''), '_blank');
}

function abrirModalProveedor() {
  limpiarForm();
  const t = document.getElementById('prov-modal-title');
  if (t) t.textContent = 'Agregar proveedor';
  const m = document.getElementById('prov-modal');
  if (m) m.style.display = '';
}

function cerrarModalProveedor() {
  const m = document.getElementById('prov-modal');
  if (m) m.style.display = 'none';
}

function filtrarProveedores(v) { renderProveedores(v); }

function renderProveedores(filtro = '') {
  const proveedores = APP.lsGet('mp_proveedores', PROV_DEFAULT);
  const lista = filtro
    ? proveedores.filter(p => p.nombre.toLowerCase().includes(filtro.toLowerCase()) || (p.marcas || []).some(m => m.toLowerCase().includes(filtro.toLowerCase())) || (p.wzp || '').includes(filtro))
    : proveedores;

  const cnt = document.getElementById('prov-count');
  if (cnt) cnt.textContent = lista.length + ' proveedor' + (lista.length !== 1 ? 'es' : '');

  const c = document.getElementById('prov-list');
  if (!c) return;
  c.innerHTML = '';

  lista.forEach(p => {
    const d = document.createElement('div');
    d.className = 'prov-card';
    d.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
        <div>
          <div style="font-size:13px;font-weight:500">${p.nombre}</div>
          <div style="font-size:11px;color:var(--text-muted)">${p.vendedor || '—'} · ${p.cat || '—'}</div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn" style="font-size:10px;padding:3px 7px" onclick="compartirProveedor(${p.id})" title="Compartir proveedor"><i class="ti ti-share"></i></button>
          <button class="btn" style="font-size:10px;padding:3px 7px" onclick="editarProv(${p.id})"><i class="ti ti-edit"></i></button>
          <button class="btn" style="font-size:10px;padding:3px 7px;color:var(--text-danger)" onclick="eliminarProv(${p.id})"><i class="ti ti-trash"></i></button>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">
        ${p.wzp ? `<button class="btn bpw" style="font-size:10px;padding:3px 9px" onclick="abrirWzCard('${p.pais}','${p.wzp}')"><i class="ti ti-brand-whatsapp"></i>${p.pais} ${p.wzp}</button>` : ''}
        ${p.email ? `<span style="font-size:11px;color:var(--text-muted)"><i class="ti ti-mail" style="font-size:11px;vertical-align:-2px"></i> ${p.email}</span>` : ''}
      </div>
      <div>${(p.marcas || []).length ? p.marcas.map(m => `<span class="data-pill">${m}</span>`).join('') : '<span style="font-size:11px;color:var(--text-muted)">Sin marcas asignadas</span>'}</div>
      ${p.notas ? `<div style="margin-top:7px;font-size:11px;color:var(--text-muted);background:var(--surface-0);border-radius:var(--radius);padding:6px 8px">${p.notas}</div>` : ''}`;
    c.appendChild(d);
  });
  renderProvStats(proveedores);
}

function compartirProveedor(id) {
  const proveedores = APP.lsGet('mp_proveedores', PROV_DEFAULT);
  const p = proveedores.find(x => x.id === id);
  if (!p) return;
  const texto = `🔧 ${p.nombre}
📦 Rubro: ${p.cat || '—'}
📱 WhatsApp: ${p.pais || '+56'} ${p.wzp || '—'}
🚗 Marcas: ${(p.marcas || []).join(', ') || '—'}${p.notas ? `\n📝 ${p.notas}` : ''}`;
  if (navigator.share) {
    navigator.share({ title: 'Proveedor: ' + p.nombre, text: texto }).catch(() => {});
  } else {
    navigator.clipboard.writeText(texto).then(() => APP.toast.show('¡Copiado al portapapeles!', 'success'));
  }
}

function renderProvStats(proveedores) {
  const el = document.getElementById('prov-stats');
  if (!el) return;

  const total = proveedores.length;
  const marcasUnicas = [...new Set(proveedores.flatMap(p => p.marcas || []))];
  const sinWz = proveedores.filter(p => !p.wzp).length;

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div style="background:var(--surface-0);border-radius:var(--radius);padding:10px;text-align:center">
        <div style="font-size:20px;font-weight:700;color:var(--text-accent)">${total}</div>
        <div style="font-size:10px;color:var(--text-muted)">Total proveedores</div>
      </div>
      <div style="background:var(--surface-0);border-radius:var(--radius);padding:10px;text-align:center">
        <div style="font-size:20px;font-weight:700;color:var(--text-success)">${marcasUnicas.length}</div>
        <div style="font-size:10px;color:var(--text-muted)">Marcas cubiertas</div>
      </div>
    </div>
    ${sinWz ? `
      <div style="background:var(--surface-0);border-radius:var(--radius);padding:10px;text-align:center">
        <div style="font-size:20px;font-weight:700;color:var(--text-danger)">${sinWz}</div>
        <div style="font-size:10px;color:var(--text-muted)">Sin WhatsApp</div>
      </div>` : ''}`;
}

window.abrirModalProveedor = abrirModalProveedor;
window.cerrarModalProveedor = cerrarModalProveedor;
window.compartirProveedor = compartirProveedor;
window.invNuevoRepuesto = invNuevoRepuesto;
window.invEditarRepuesto = invEditarRepuesto;
window.invCerrarModalRepuesto = invCerrarModalRepuesto;
window.invGuardarRepuesto = invGuardarRepuesto;
window.invRegistrarEntrada = invRegistrarEntrada;
window.invCerrarModalEntrada = invCerrarModalEntrada;
window.invGuardarEntrada = invGuardarEntrada;

// ===== REPUESTOS: NUEVO Y ENTRADA =====
let _editandoRepuestoId = null;

function invNuevoRepuesto() {
  _editandoRepuestoId = null;
  ['ir-codigo','ir-nombre','ir-ubicacion','ir-stock','ir-min','ir-precio-compra','ir-ganancia','ir-notas'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const s = document.getElementById('ir-marca');
  if (s) s.value = '';
  const cfg = APP.lsGet('rep_config', {});
  document.getElementById('ir-stock').value = '0';
  document.getElementById('ir-min').value = String(cfg.stock_minimo_alerta || 5);
  document.getElementById('ir-ganancia').value = String(cfg.ganancia || 30);
  document.getElementById('ir-precio-compra').value = '0';
  invCargarMarcas();
  invCargarProveedoresSelect();
  const selProv = document.getElementById('ir-proveedor');
  if (selProv) selProv.value = cfg.proveedor_predeterminado || '';
  document.getElementById('inv-repuesto-title').textContent = 'Nuevo repuesto';
  document.getElementById('inv-modal-repuesto').style.display = '';
}

function invEditarRepuesto(id) {
  const items = APP.lsGet('mp_inventario', []);
  const item = items.find(x => x.c === id);
  if (!item) return;
  _editandoRepuestoId = id;
  const s = (elId, v) => { const el = document.getElementById(elId); if (el) el.value = v || ''; };
  s('ir-codigo', item.c);
  s('ir-nombre', item.n);
  s('ir-ubicacion', item.ub);
  s('ir-stock', item.st);
  s('ir-min', item.mn);
  s('ir-precio-compra', (item.p || '').replace(/[^\d]/g, ''));
  const cfg = APP.lsGet('rep_config', {});
  s('ir-ganancia', cfg.ganancia || 30);
  s('ir-notas', item.notas || '');
  const selMarca = document.getElementById('ir-marca');
  if (selMarca) selMarca.value = item.m || '';
  const selProv = document.getElementById('ir-proveedor');
  if (selProv) selProv.value = item.prov_id || '';
  invCargarMarcas();
  invCargarProveedoresSelect();
  document.getElementById('inv-repuesto-title').textContent = 'Editar: ' + item.n;
  document.getElementById('inv-modal-repuesto').style.display = '';
}

function invCerrarModalRepuesto() {
  document.getElementById('inv-modal-repuesto').style.display = 'none';
  _editandoRepuestoId = null;
}

function invCargarMarcas() {
  const s = document.getElementById('ir-marca');
  if (!s) return;
  const proveedores = APP.lsGet('mp_proveedores', PROV_DEFAULT);
  const MARCAS_BASE = ['Toyota','Hyundai','Kia','Chevrolet','Suzuki','Nissan','Honda','Ford','Volkswagen','Mazda','Mitsubishi','Subaru','JAC','Chery','BYD','Mercedes-Benz','BMW','Renault','Peugeot','Fiat'];
  const todas = [...MARCAS_BASE, ...proveedores.flatMap(p => p.marcas || [])].filter((v, i, a) => a.indexOf(v) === i).sort();
  s.innerHTML = '<option value="">Seleccionar…</option>' + todas.map(m => `<option value="${m}">${m}</option>`).join('');
}

function invCargarProveedoresSelect() {
  ['ir-proveedor','ie-proveedor'].forEach(id => {
    const s = document.getElementById(id);
    if (!s) return;
    const proveedores = APP.lsGet('mp_proveedores', PROV_DEFAULT);
    s.innerHTML = '<option value="">Sin proveedor</option>' + proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
  });
}

function invGuardarRepuesto() {
  const g = id => (document.getElementById(id)?.value || '').trim();
  const codigo = g('ir-codigo');
  const nombre = g('ir-nombre');
  if (!codigo || !nombre) { APP.toast.show('⚠️ Código y nombre son obligatorios.', 'warning'); return; }

  const items = APP.lsGet('mp_inventario', []);
  const cfg = APP.lsGet('rep_config', {});
  const ganancia = cfg.ganancia || parseFloat(g('ir-ganancia')) || 0;
  const precioCompra = parseFloat(g('ir-precio-compra')) || 0;
  const precioVenta = precioCompra > 0 ? Math.round(precioCompra * (1 + ganancia / 100)) : 0;

  const dato = {
    c: codigo,
    n: nombre,
    m: document.getElementById('ir-marca')?.value || '',
    ub: g('ir-ubicacion'),
    st: parseInt(g('ir-stock')) || 0,
    mn: parseInt(g('ir-min')) || 5,
    p: precioVenta ? '$' + precioVenta.toLocaleString('es-CL') : '—',
    e: 's-done',
    et: 'OK',
    prov_id: document.getElementById('ir-proveedor')?.value || '',
    notas: g('ir-notas')
  };

  if (_editandoRepuestoId) {
    const idx = items.findIndex(x => x.c === _editandoRepuestoId);
    if (idx >= 0) items[idx] = { ...items[idx], ...dato, c: dato.c };
  } else {
    if (items.some(x => x.c === codigo)) { APP.toast.show('⚠️ El código ya existe.', 'warning'); return; }
    items.push(dato);
  }
  APP.lsSet('mp_inventario', items);
  invCerrarModalRepuesto();
  renderInventario();
  APP.toast.show('Repuesto guardado.', 'success');
}

function invRegistrarEntrada() {
  _editandoRepuestoId = null;
  const s1 = document.getElementById('ie-cantidad'); if (s1) s1.value = '1';
  const s2 = document.getElementById('ie-factura'); if (s2) s2.value = '';
  const s3 = document.getElementById('ie-obs'); if (s3) s3.value = '';
  const s4 = document.getElementById('ie-fecha'); if (s4) s4.value = new Date().toISOString().split('T')[0];
  invCargarRepuestosSelect();
  invCargarProveedoresSelect();
  document.getElementById('inv-modal-entrada').style.display = '';
}

function invCargarRepuestosSelect() {
  const s = document.getElementById('ie-repuesto');
  if (!s) return;
  const items = APP.lsGet('mp_inventario', []);
  s.innerHTML = '<option value="">Seleccionar repuesto…</option>' + items.map(i => `<option value="${i.c}">${i.c} — ${i.n}</option>`).join('');
}

function invCerrarModalEntrada() {
  document.getElementById('inv-modal-entrada').style.display = 'none';
}

function invGuardarEntrada() {
  const g = id => (document.getElementById(id)?.value || '').trim();
  const codigo = document.getElementById('ie-repuesto')?.value;
  const cantidad = parseInt(g('ie-cantidad')) || 0;
  if (!codigo || cantidad <= 0) { APP.toast.show('⚠️ Selecciona repuesto y cantidad.', 'warning'); return; }

  const items = APP.lsGet('mp_inventario', []);
  const idx = items.findIndex(x => x.c === codigo);
  if (idx < 0) { APP.toast.show('⚠️ Repuesto no encontrado.', 'warning'); return; }

  items[idx].st = (items[idx].st || 0) + cantidad;
  APP.lsSet('mp_inventario', items);

  // Registrar movimiento en historial
  const mov = {
    tipo: 'entrada',
    codigo,
    cantidad,
    fecha: g('ie-fecha'),
    factura: g('ie-factura'),
    proveedor: document.getElementById('ie-proveedor')?.value || '',
    obs: g('ie-obs'),
    creado: new Date().toISOString()
  };
  const historial = APP.lsGet('inv_historial', []);
  historial.unshift(mov);
  APP.lsSet('inv_historial', historial);

  invCerrarModalEntrada();
  renderInventario();
  APP.toast.show('Entrada registrada.', 'success');
}

window.invAgregarCategoria = invAgregarCategoria;
window.invEliminarCategoria = invEliminarCategoria;
window.invResetearConfig = invResetearConfig;

// ===== RESIDUOS ECOLÓGICOS =====
function resNuevoRegistro() {
  document.getElementById('res-tipo').value = '';
  document.getElementById('res-fecha').value = new Date().toISOString().split('T')[0];
  document.getElementById('res-cantidad').value = '';
  document.getElementById('res-estado').value = 'programado';
  document.getElementById('res-empresa').value = '';
  document.getElementById('res-modal-nuevo').style.display = '';
}

function resCerrarModalNuevo() {
  document.getElementById('res-modal-nuevo').style.display = 'none';
}

function resGuardarRegistro() {
  const tipo = document.getElementById('res-tipo')?.value;
  const fecha = document.getElementById('res-fecha')?.value;
  const cantidad = document.getElementById('res-cantidad')?.value;
  const estado = document.getElementById('res-estado')?.value;
  const empresa = document.getElementById('res-empresa')?.value;

  if (!tipo || !fecha || !cantidad || !estado) {
    APP.toast.show('⚠️ Completa todos los campos obligatorios', 'warning');
    return;
  }

  const registro = {
    id: 'res-' + Date.now(),
    tipo,
    fecha,
    cantidad,
    estado,
    empresa: empresa || 'SIN ASIGNAR',
    creado: new Date().toISOString()
  };

  const residuos = APP.lsGet('residuos_ecologicos', []);
  residuos.unshift(registro);
  APP.lsSet('residuos_ecologicos', residuos);

  resCerrarModalNuevo();
  resCargarRegistros();
  APP.toast.show('Registro guardado correctamente', 'success');
}

function resCargarRegistros() {
  const residuos = APP.lsGet('residuos_ecologicos', []);
  const container = document.querySelector('#pg-residuos .card');
  if (!container) return;

  const ecoBarHTML = residuos.map(r => {
    const iconos = {
      'Aceite quemado': '<i class="ti ti-droplet" style="font-size:14px;color:var(--text-warning)"></i>',
      'Baterías': '<i class="ti ti-battery" style="font-size:14px;color:var(--text-danger)"></i>',
      'Filtros': '<i class="ti ti-components" style="font-size:14px;color:var(--text-accent)"></i>',
      'Otros': '<i class="ti ti-package" style="font-size:14px;color:var(--text-info)"></i>'
    };
    const colores = {
      'Aceite quemado': 'var(--bg-warning)',
      'Baterías': 'var(--bg-danger)',
      'Filtros': 'var(--bg-accent)',
      'Otros': 'var(--bg-info)'
    };
    const icono = iconos[r.tipo] || '<i class="ti ti-package" style="font-size:14px;color:var(--text-info)"></i>';
    const color = colores[r.tipo] || 'var(--bg-info)';
    const estadoClass = r.estado === 'programado' ? 's-prog' : r.estado === 'retirado' ? 's-done' : 's-crit';
    const estadoLabel = r.estado === 'programado' ? 'Programado' : r.estado === 'retirado' ? 'Retirado' : 'Sin contrato';
    const docHtml = r.documento
      ? `<button class="btn" style="font-size:10px;padding:3px 6px" title="${r.documento.nombre}" onclick="resVerArchivo('${r.id}')"><i class="ti ti-paperclip"></i> ${r.documento.nombre.substring(0,15)}</button>`
      : '<span style="color:var(--text-muted)">—</span>';

    return `
      <div class="eco-bar" style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <div style="display:flex;align-items:center;flex:1">
          <div style="width:28px;height:28px;border-radius:6px;background:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${icono}
          </div>
          <div style="flex:1;margin-left:8px">
            <div style="font-size:12px;font-weight:500">${r.tipo}</div>
            <div style="font-size:10px;color:var(--text-muted)">${r.cantidad} · ${r.fecha} · ${r.empresa}</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <div style="text-align:right">${docHtml}</div>
          <span class="st ${estadoClass}"><span class="dot"></span>${estadoLabel}</span>
          ${r.documento ? `<button class="btn" style="font-size:10px;padding:3px 6px" onclick="resEnviarWhatsApp('${r.id}')"><i class="ti ti-brand-whatsapp"></i></button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  const cbtn = container.querySelector('.ch .btn');
  const ecoBars = container.querySelectorAll('.eco-bar');
  ecoBars.forEach(el => el.remove());

  const insertAfter = cbtn?.parentElement;
  if (insertAfter && ecoBarHTML) {
    insertAfter.insertAdjacentHTML('afterend', ecoBarHTML);
  }
}

function resPDF(certId) {
  const pdfs = APP.lsGet('residuos_pdfs', {});
  if (pdfs[certId] && pdfs[certId].base64) {
    const byteCharacters = atob(pdfs[certId].base64);
    const byteArray = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } else {
    APP.toast.show('⚠️ PDF no disponible para descarga', 'warning');
  }
}

window.resNuevoRegistro = resNuevoRegistro;
window.resCerrarModalNuevo = resCerrarModalNuevo;
window.resGuardarRegistro = resGuardarRegistro;
window.resCargarRegistros = resCargarRegistros;
window.resPDF = resPDF;

// ===== UPLOAD DE ARCHIVOS =====
let _resArchivoSeleccionado = null;

function resVerificarArchivo(input) {
  const archivo = input.files[0];
  const preview = document.getElementById('res-archivo-preview');

  if (!archivo) {
    preview.innerHTML = '';
    _resArchivoSeleccionado = null;
    return;
  }

  // Verificar tamaño (5MB)
  if (archivo.size > 5 * 1024 * 1024) {
    APP.toast.show('⚠️ Archivo muy grande (máx 5MB)', 'warning');
    preview.innerHTML = '<span style="color:var(--text-danger)">❌ Archivo muy grande</span>';
    _resArchivoSeleccionado = null;
    input.value = '';
    return;
  }

  // Verificar tipo
  const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!tiposPermitidos.includes(archivo.type)) {
    APP.toast.show('⚠️ Tipo de archivo no permitido', 'warning');
    preview.innerHTML = '<span style="color:var(--text-danger)">❌ Tipo no permitido</span>';
    _resArchivoSeleccionado = null;
    input.value = '';
    return;
  }

  // Leer archivo y convertir a base64
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result.split(',')[1];
    const tipo = archivo.type.includes('pdf') ? 'pdf' : archivo.type.includes('image') ? 'imagen' : 'documento';

    _resArchivoSeleccionado = {
      nombre: archivo.name,
      base64: base64,
      tipo: tipo,
      tamaño: archivo.size,
      tamaño_mb: (archivo.size / (1024 * 1024)).toFixed(2)
    };

    preview.innerHTML = `✅ <strong>${archivo.name}</strong> (${_resArchivoSeleccionado.tamaño_mb} MB)`;
  };
  reader.readAsDataURL(archivo);
}

function resGuardarRegistroAnterior() {
  const tipo = document.getElementById('res-tipo')?.value;
  const fecha = document.getElementById('res-fecha')?.value;
  const cantidad = document.getElementById('res-cantidad')?.value;
  const estado = document.getElementById('res-estado')?.value;
  const empresa = document.getElementById('res-empresa')?.value;

  if (!tipo || !fecha || !cantidad || !estado) {
    APP.toast.show('⚠️ Completa todos los campos obligatorios', 'warning');
    return;
  }

  const registro = {
    id: 'res-' + Date.now(),
    tipo,
    fecha,
    cantidad,
    estado,
    empresa: empresa || 'SIN ASIGNAR',
    creado: new Date().toISOString()
  };

  // Agregar documento si existe
  if (_resArchivoSeleccionado) {
    registro.documento = {
      base64: _resArchivoSeleccionado.base64,
      nombre: _resArchivoSeleccionado.nombre,
      tipo: _resArchivoSeleccionado.tipo,
      tamaño: _resArchivoSeleccionado.tamaño,
      fecha_carga: new Date().toISOString()
    };
  }

  const residuos = APP.lsGet('residuos_ecologicos', []);
  residuos.unshift(registro);
  APP.lsSet('residuos_ecologicos', residuos);

  resCerrarModalNuevo();
  resCargarRegistros();
  _resArchivoSeleccionado = null;
  document.getElementById('res-archivo').value = '';
  document.getElementById('res-archivo-preview').innerHTML = '';
  APP.toast.show('✅ Registro guardado correctamente', 'success');
}

function resDescargarArchivo(res_id) {
  const residuos = APP.lsGet('residuos_ecologicos', []);
  const registro = residuos.find(r => r.id === res_id);

  if (!registro || !registro.documento) {
    APP.toast.show('⚠️ Sin documento adjunto', 'warning');
    return;
  }

  const doc = registro.documento;
  const byteCharacters = atob(doc.base64);
  const byteArray = new Uint8Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }

  const blob = new Blob([byteArray], { type: doc.tipo === 'pdf' ? 'application/pdf' : 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = doc.nombre;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function resVerArchivo(res_id) {
  const residuos = APP.lsGet('residuos_ecologicos', []);
  const registro = residuos.find(r => r.id === res_id);

  if (!registro || !registro.documento) {
    APP.toast.show('⚠️ Sin documento adjunto', 'warning');
    return;
  }

  const doc = registro.documento;

  if (doc.tipo === 'imagen') {
    const byteCharacters = atob(doc.base64);
    const byteArray = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } else {
    resDescargarArchivo(res_id);
  }
}

function resEnviarWhatsApp(res_id) {
  const residuos = APP.lsGet('residuos_ecologicos', []);
  const registro = residuos.find(r => r.id === res_id);

  if (!registro) return;

  const mensaje = `📄 *Documento de Residuo*\n\nTipo: ${registro.tipo}\nFecha: ${registro.fecha}\nCantidad: ${registro.cantidad}\nEmpresa: ${registro.empresa}`;

  const numero = prompt('Ingresa número WhatsApp (sin +56):');
  if (!numero) return;

  const url = `https://wa.me/56${numero}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');

  if (registro.documento) {
    APP.toast.show('💡 Nota: Para enviar el archivo adjunto, descárgalo primero e intégralo manualmente en WhatsApp', 'info');
  }
}

// Reemplazar la función resGuardarRegistro original
window.resGuardarRegistro = resGuardarRegistroAnterior;
window.resVerificarArchivo = resVerificarArchivo;
window.resDescargarArchivo = resDescargarArchivo;
window.resVerArchivo = resVerArchivo;
window.resEnviarWhatsApp = resEnviarWhatsApp;
