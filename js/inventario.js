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
function _invCargarConfigRepuestos() {
  const cfg = APP.lsGet('rep_config', {});
  const el = document.getElementById('rep-cfg-ganancia');
  if (el) el.value = cfg.ganancia || 30;
  repCalcEjemplo();
}

function invGuardarConfigRepuestos() {
  const g = id => (document.getElementById(id)?.value || '').trim();
  const cfg = {};
  cfg.ganancia    = parseFloat(g('rep-cfg-ganancia')) || 0;
  cfg.iva_defecto = !!document.getElementById('rep-cfg-iva')?.checked;
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
  w.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.style.cssText = 'background:var(--surface-2);border:0.5px solid var(--border);border-radius:12px;overflow:hidden';

  const cols = '80px 1fr 90px 110px 60px 60px 70px 70px';
  const hdr = document.createElement('div');
  hdr.style.cssText = `padding:9px 14px;display:grid;grid-template-columns:${cols};gap:8px;font-size:9px;color:var(--text-muted);font-weight:500;text-transform:uppercase;letter-spacing:.05em;border-bottom:0.5px solid var(--border);background:var(--surface-1)`;
  hdr.innerHTML = '<span>Código</span><span>Descripción</span><span>Marca</span><span>Ubicación</span><span>Stock</span><span>Mín.</span><span>Precio</span><span>Estado</span>';
  wrap.appendChild(hdr);

  items.forEach(i => {
    const r = document.createElement('div');
    r.style.cssText = `padding:9px 14px;display:grid;grid-template-columns:${cols};gap:8px;align-items:center;font-size:11px;border-bottom:0.5px solid var(--border)`;
    r.innerHTML = `
      <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">${i.c}</span>
      <span>${i.n}</span>
      <span style="color:var(--text-secondary)">${i.m}</span>
      <span style="font-size:10px;color:var(--text-muted)">${i.ub}</span>
      <span style="font-weight:500;${i.st <= i.mn ? 'color:var(--text-danger)' : ''}">${i.st}</span>
      <span style="color:var(--text-muted)">${i.mn}</span>
      <span>${i.p}</span>
      <span class="st ${i.e}"><span class="dot"></span>${i.et}</span>`;
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
  const p = document.getElementById('ir-proveedor');
  if (p) p.value = '';
  document.getElementById('ir-stock').value = '0';
  document.getElementById('ir-min').value = '5';
  document.getElementById('ir-ganancia').value = '30';
  document.getElementById('ir-precio-compra').value = '0';
  invCargarMarcas();
  invCargarProveedoresSelect();
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
