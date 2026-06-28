// ===== MÓDULO: INVENTARIO (Repuestos, Proveedores, Residuos) =====
function init_inventario() {
  renderInventario();
  renderMarcasSelector();
  renderProveedores();
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
  renderProveedoresStats(proveedores);
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

function renderProveedoresStats(proveedores) {
  const el = document.getElementById('prov-estadisticas');
  if (!el) return;

  const total = proveedores.length;
  const conWz = proveedores.filter(p => p.wzp).length;
  const porCat = {};
  const porMarca = {};
  proveedores.forEach(p => {
    if (p.cat) porCat[p.cat] = (porCat[p.cat] || 0) + 1;
    (p.marcas || []).forEach(m => { porMarca[m] = (porMarca[m] || 0) + 1; });
  });
  const topCat = Object.entries(porCat).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const topMarca = Object.entries(porMarca).sort((a, b) => b[1] - a[1]).slice(0, 6);

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div style="background:var(--surface-0);border-radius:var(--radius);padding:10px;text-align:center">
        <div style="font-size:20px;font-weight:700;color:var(--text-accent)">${total}</div>
        <div style="font-size:10px;color:var(--text-muted)">Total</div>
      </div>
      <div style="background:var(--surface-0);border-radius:var(--radius);padding:10px;text-align:center">
        <div style="font-size:20px;font-weight:700;color:var(--text-success)">${conWz}</div>
        <div style="font-size:10px;color:var(--text-muted)">Con WhatsApp</div>
      </div>
    </div>
    ${topCat.length ? `
      <div style="font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:5px">Por categoría</div>
      <div style="display:flex;flex-direction:column;gap:3px;margin-bottom:12px">
        ${topCat.map(([cat, n]) => `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 6px;background:var(--surface-0);border-radius:var(--radius)"><span>${cat}</span><span style="font-weight:500">${n}</span></div>`).join('')}
      </div>` : ''}
    ${topMarca.length ? `
      <div style="font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:5px">Marcas más abastecidas</div>
      <div style="display:flex;flex-direction:column;gap:3px">
        ${topMarca.map(([m, n]) => `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 6px;background:var(--surface-0);border-radius:var(--radius)"><span>${m}</span><span style="font-weight:500">${n}</span></div>`).join('')}
      </div>` : ''}`;
}

window.abrirModalProveedor = abrirModalProveedor;
window.cerrarModalProveedor = cerrarModalProveedor;
window.compartirProveedor = compartirProveedor;
