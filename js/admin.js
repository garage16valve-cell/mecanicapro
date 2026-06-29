// ===== MÓDULO: ADMIN =====

const _ADM_CFG_DEFAULT = {
  nombre:    'Integral Automotriz Spa',
  rut:       '76.543.210-8',
  direccion: 'Valparaíso, Chile',
  telefono:  '+56 9 5165 5331',
  agenda:    'https://integral-automotriz-spa.reservio.com/booking',
};

const _ADM_COLORES_OP = [
  '#ef4444','#f59e0b','#10b981','#3b82f6',
  '#8b5cf6','#f97316','#14b8a6','#ec4899',
];

let _admPeriodo           = 'mes';


// ===== CATÁLOGO DE SERVICIOS (embebido en Admin) =====
let _admCatEditId = null;
let _admCatReps   = [];

function _admCatRender(filtro) {
  const lista = document.getElementById('adm-cat-lista');
  const cnt   = document.getElementById('adm-cat-count');
  if (!lista) return;
  const todos = APP.lsGet('mp_servicios', []);
  const q     = (filtro || '').toLowerCase().trim();
  const items = q ? todos.filter(s =>
    (s.nombre||'').toLowerCase().includes(q) || (s.categoria||'').toLowerCase().includes(q)
  ) : todos;
  if (cnt) cnt.textContent = items.length + ' servicio' + (items.length !== 1 ? 's' : '');
  if (!items.length) {
    lista.innerHTML = `<div style="text-align:center;padding:28px;color:var(--text-muted)">
      <i class="ti ti-tools" style="font-size:26px;display:block;margin-bottom:8px;opacity:.3"></i>
      ${q ? 'Sin resultados para "' + _admEsc(filtro) + '".' : 'Sin servicios. Usa <strong>+ Nuevo</strong> para crear el primero.'}
    </div>`;
    return;
  }
  const CAT_CSS = { 'Mantención':'s-wait','Frenos':'s-crit','Motor':'s-prog','Eléctrico':'s-new','Suspensión':'s-pend','Otro':'s-done' };
  lista.innerHTML = items.map(s => {
    const precio = s.precioFijo || 0;
    const precioMuestra = s.precioConIva && precio ? Math.round(precio * 1.19) : precio;
    const minVenta = s.precioMinVenta || 0;
    return `<div class="card" style="cursor:pointer;margin-bottom:8px" onclick="admCatEditar('${s.id}')"
      onmouseover="this.style.borderColor='var(--border-accent)'" onmouseout="this.style.borderColor=''">
      <div class="ch">
        <div>
          <div style="font-weight:500;font-size:12px;margin-bottom:4px">${_admEsc(s.nombre)}</div>
          <span class="st ${CAT_CSS[s.categoria]||'s-wait'}"><span class="dot"></span>${_admEsc(s.categoria||'Otro')}</span>
          ${s.precioConIva ? '<span class="tag" style="font-size:9px;margin-left:4px">c/IVA</span>' : ''}
        </div>
        <div style="text-align:right">
          ${precioMuestra ? `<div style="font-size:15px;font-weight:600;color:var(--text-accent)">$${precioMuestra.toLocaleString('es-CL')}</div>` : ''}
          ${s.horasEst ? `<div style="font-size:10px;color:var(--text-muted)">${s.horasEst}h est.</div>` : ''}
        </div>
      </div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:6px;display:flex;gap:12px;flex-wrap:wrap">
        ${minVenta ? `<span><i class="ti ti-alert-circle" style="font-size:10px;vertical-align:-1px"></i> Mín. $${minVenta.toLocaleString('es-CL')}</span>` : ''}
        ${s.repuestosSugeridos?.length ? `<span><i class="ti ti-package" style="font-size:10px;vertical-align:-1px"></i> ${s.repuestosSugeridos.length} rep. sug.</span>` : ''}
        ${s.proveedoresIds?.length ? `<span><i class="ti ti-building-store" style="font-size:10px;vertical-align:-1px"></i> ${s.proveedoresIds.length} prov.</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

function admCatNuevo() {
  _admCatEditId = null; _admCatReps = [];
  ['adm-cat-f-nombre','adm-cat-f-hest','adm-cat-f-precio','adm-cat-f-precio-min'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const cat = document.getElementById('adm-cat-f-cat'); if (cat) cat.value = 'Mantención';
  const iva = document.getElementById('adm-cat-f-iva');
  if (iva) iva.checked = !!APP.lsGet('mp_config',{}).iva_por_defecto;
  const del = document.getElementById('adm-cat-btn-del'); if (del) del.style.display = 'none';
  document.getElementById('adm-cat-titulo').textContent = 'Nuevo servicio';
  _admCatRenderReps();
  document.getElementById('adm-cat-panel').style.display = 'block';
  document.getElementById('adm-cat-panel').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function admCatEditar(id) {
  const svc = APP.lsGet('mp_servicios', []).find(s => s.id === id);
  if (!svc) return;
  _admCatEditId = id;
  _admCatReps   = JSON.parse(JSON.stringify(svc.repuestosSugeridos || []));
  const s = (elId, v) => { const e = document.getElementById(elId); if (e) e.value = v ?? ''; };
  s('adm-cat-f-nombre',    svc.nombre);
  s('adm-cat-f-hest',      svc.horasEst   || '');
  s('adm-cat-f-precio',    svc.precioFijo || '');
  s('adm-cat-f-precio-min',svc.precioMinVenta || '');
  const cat = document.getElementById('adm-cat-f-cat'); if (cat) cat.value = svc.categoria || 'Otro';
  const iva = document.getElementById('adm-cat-f-iva'); if (iva) iva.checked = !!svc.precioConIva;
  const del = document.getElementById('adm-cat-btn-del'); if (del) del.style.display = '';
  document.getElementById('adm-cat-titulo').textContent = 'Editar: ' + svc.nombre;
  _admCatRenderReps();
  document.getElementById('adm-cat-panel').style.display = 'block';
  document.getElementById('adm-cat-panel').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function admCatCerrarPanel() {
  document.getElementById('adm-cat-panel').style.display = 'none';
  _admCatEditId = null; _admCatReps = [];
}

function admCatGuardar() {
  const g = id => (document.getElementById(id)?.value || '').trim();
  const nombre = g('adm-cat-f-nombre');
  if (!nombre) { APP.toast.show('⚠️ Ingresa el nombre del servicio.', 'warning'); return; }
  const dato = {
    nombre,
    categoria:     document.getElementById('adm-cat-f-cat')?.value || 'Otro',
    horasEst:      parseFloat(g('adm-cat-f-hest'))    || 0,
    precioFijo:    parseFloat(g('adm-cat-f-precio'))   || 0,
    precioMinVenta:parseFloat(g('adm-cat-f-precio-min'))|| 0,
    precioConIva:  !!document.getElementById('adm-cat-f-iva')?.checked,
    repuestosSugeridos: _admCatReps,
  };
  const todos = APP.lsGet('mp_servicios', []);
  if (_admCatEditId) {
    const idx = todos.findIndex(s => s.id === _admCatEditId);
    if (idx >= 0) todos[idx] = { ...todos[idx], ...dato };
  } else {
    todos.push({ id:'svc-'+Date.now(), horasMin:0, horasMax:0, ...dato, creado:new Date().toISOString() });
  }
  APP.lsSet('mp_servicios', todos);
  _admCatRender(); admCatCerrarPanel(); _admPanelServicios();
}

function admCatEliminar() {
  if (!_admCatEditId) return;
  APP.modal.confirmar('¿Eliminar este servicio del catálogo? Esta acción no se puede deshacer.', () => {
    APP.lsSet('mp_servicios', APP.lsGet('mp_servicios',[]).filter(s => s.id !== _admCatEditId));
    _admCatRender(); admCatCerrarPanel(); _admPanelServicios();
  }, 'Eliminar', 'Cancelar');
}

function admCatAgregarRep() {
  _admCatReps.push({ nombre:'', cantidad:1, unidad:'unidad' });
  _admCatRenderReps();
}
function admCatEliminarRep(i) { _admCatReps.splice(i, 1); _admCatRenderReps(); }
function admCatSyncRep(i, campo, val) {
  if (_admCatReps[i]) _admCatReps[i][campo] = campo === 'cantidad' ? (parseFloat(val)||1) : val;
}
function _admCatRenderReps() {
  const el = document.getElementById('adm-cat-rep-lista');
  if (!el) return;
  if (!_admCatReps.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text-muted);padding:8px 0;text-align:center">Sin repuestos sugeridos</div>';
    return;
  }
  const UNIDADES = ['unidad','litro','kg','par','metro','juego'];
  const ST = 'border:0.5px solid var(--border);border-radius:var(--radius);padding:4px 7px;font-size:11px;background:var(--surface-1);color:var(--text-primary)';
  el.innerHTML = _admCatReps.map((r, i) => `
    <div style="display:grid;grid-template-columns:1fr 60px 90px 28px;gap:5px;align-items:center;margin-bottom:5px">
      <input value="${_admEsc(r.nombre)}" placeholder="Nombre repuesto" style="${ST}"
        oninput="admCatSyncRep(${i},'nombre',this.value)">
      <input type="number" min="0.5" step="0.5" value="${r.cantidad}" style="${ST}"
        oninput="admCatSyncRep(${i},'cantidad',this.value)">
      <select style="${ST}" onchange="admCatSyncRep(${i},'unidad',this.value)">
        ${UNIDADES.map(u => `<option${u===r.unidad?' selected':''}>${u}</option>`).join('')}
      </select>
      <button class="btn" style="padding:4px;color:var(--text-danger)" onclick="admCatEliminarRep(${i})"><i class="ti ti-x"></i></button>
    </div>`).join('');
}

// ===== CONFIG REPUESTOS =====
function _admCargarConfigRepuestos() {
  const cfg = APP.lsGet('mp_config', {});
  const s   = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
  s('cfg-ganancia',      cfg.ganancia_repuestos || 30);
  s('cfg-precio-min-mo', cfg.precio_minimo_hora || '');
  const iva = document.getElementById('cfg-iva-defecto');
  if (iva) iva.checked = !!cfg.iva_por_defecto;
}

function admGuardarConfigRepuestos() {
  const g   = id => (document.getElementById(id)?.value || '').trim();
  const cfg = APP.lsGet('mp_config', {});
  cfg.ganancia_repuestos = parseFloat(g('cfg-ganancia'))      || 0;
  cfg.precio_minimo_hora = parseFloat(g('cfg-precio-min-mo')) || 0;
  cfg.iva_por_defecto    = !!document.getElementById('cfg-iva-defecto')?.checked;
  APP.lsSet('mp_config', cfg);
  // Sincronizar precio_minimo_hora también a mp_taller_config para KPIs
  const tcfg = APP.lsGet('mp_taller_config', {});
  tcfg.precioMinHora = cfg.precio_minimo_hora;
  APP.lsSet('mp_taller_config', tcfg);
  const btn = document.getElementById('cfg-rep-btn');
  if (btn) { const o=btn.innerHTML; btn.innerHTML='<i class="ti ti-check"></i> Guardado'; btn.disabled=true; setTimeout(()=>{btn.innerHTML=o;btn.disabled=false;},2000); }
}

// ===== INIT =====
function init_admin() {
  admSetTab('reportes');
}

// ===== PESTAÑAS =====
function admSetTab(tab) {
  const reportesPage = document.getElementById('pg-reportes');
  const tabUsuarios = document.getElementById('adm-tab-usuarios');
  const tabConfig = document.getElementById('adm-tab-config');
  if (reportesPage) reportesPage.style.display = tab === 'reportes' ? '' : 'none';
  if (tabUsuarios) tabUsuarios.style.display = tab === 'usuarios' ? '' : 'none';
  if (tabConfig) tabConfig.style.display = tab === 'config' ? '' : 'none';
  if (tab === 'usuarios' && typeof adminRenderUsuarios === 'function') adminRenderUsuarios();
  if (tab === 'config' && typeof tallerCargarDatos === 'function') tallerCargarDatos();
  if (tab === 'reportes') {
    if (typeof _admKPIs === 'function') _admKPIs();
    if (typeof _admGraficoMensual === 'function') _admGraficoMensual();
    if (typeof _admTablaServicios === 'function') _admTablaServicios();
    if (typeof _admTablaMecanicos === 'function') _admTablaMecanicos();
    if (typeof _admFrecuencia === 'function') _admFrecuencia();
  }
}

// ===== USUARIOS =====
function adminRenderUsuarios(buscar) {
  const tbody = document.getElementById('admin-usuarios-tabla');
  if (!tbody) return;
  const usuarios = APP.lsGet('usuarios', []);
  const filtro = (buscar || '').toLowerCase().trim();
  const filtrados = filtro ? usuarios.filter(u =>
    (u.nombre || '').toLowerCase().includes(filtro) ||
    (u.apellido || '').toLowerCase().includes(filtro) ||
    (u.rut || '').toLowerCase().includes(filtro) ||
    (u.rol || '').toLowerCase().includes(filtro)
  ) : usuarios;
  if (!filtrados.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">' + (filtro ? 'Sin resultados' : 'Sin usuarios registrados') + '</td></tr>';
    return;
  }
  const ROLES = { Administrador:'Administrador', Recepcionista:'Recepcionista', mecanico:'Mecánico', Contador:'Contador' };
  tbody.innerHTML = filtrados.map(u => {
    const iniciales = ((u.nombre || '?')[0] + (u.apellido || '')[0]).toUpperCase() || '?';
    const esActivo = u.estado !== 'inactivo';
    return '<tr style="border-bottom:0.5px solid var(--border)">' +
      '<td style="padding:8px">' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<div style="width:28px;height:28px;border-radius:50%;background:' + (u.color || '#6b7280') + ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">' + iniciales[0] + '</div>' +
          '<span style="font-weight:500">' + _admEsc(u.nombre) + '</span>' +
        '</div></td>' +
      '<td style="padding:8px">' + _admEsc(u.apellido || '') + '</td>' +
      '<td style="padding:8px;color:var(--text-muted)">' + _admEsc(u.rut || '—') + '</td>' +
      '<td style="padding:8px">' + _admEsc(u.whatsapp || '—') + '</td>' +
      '<td style="padding:8px"><span class="tag">' + _admEsc(ROLES[u.rol] || u.rol) + '</span></td>' +
      '<td style="padding:8px;text-align:center">' +
        (esActivo
          ? '<span style="background:#16a34a;color:#fff;padding:2px 8px;border-radius:20px;font-size:10px">Activo</span>'
          : '<span style="background:#6b7280;color:#fff;padding:2px 8px;border-radius:20px;font-size:10px">Inactivo</span>') +
      '</td>' +
      '<td style="padding:8px;text-align:center">' +
        '<button class="btn" onclick="adminEditarUsuario(\'' + u.id + '\')" style="font-size:10px;padding:3px 7px"><i class="ti ti-pencil"></i></button>' +
        (u.id !== 1 ? ' <button class="btn" onclick="adminEliminarUsuario(\'' + u.id + '\')" style="font-size:10px;padding:3px 7px;color:#dc2626"><i class="ti ti-trash"></i></button>' : '') +
      '</td></tr>';
  }).join('');
}

// Contexto: true si viene de Admin (Usuarios y roles), false si viene de Servicios (Operarios)
var _svcAdminContext = false;

function adminNuevoUsuario() {
  _svcOpEditId = null;
  _svcAdminContext = true;
  _svcOpLimpiarForm();
  _svcOpCerts = [];
  const rg = document.getElementById('svc-op-rol-group');
  if (rg) rg.style.display = 'block';
  const sel = document.getElementById('svc-op-f-rol');
  if (sel) sel.value = 'mecanico';
  const t = document.getElementById('svc-op-titulo');
  if (t) t.textContent = 'Nuevo Usuario';
  const m = document.getElementById('svc-op-modal');
  if (m) m.style.display = '';
}

function adminEditarUsuario(id) {
  _svcAdminContext = true;
  svcOpEditar(id);
  const rg = document.getElementById('svc-op-rol-group');
  if (rg) rg.style.display = 'block';
  const u = APP.lsGet('usuarios', []).find(x => String(x.id) === String(id));
  const sel = document.getElementById('svc-op-f-rol');
  if (sel) sel.value = u?.rol || 'mecanico';
  const t = document.getElementById('svc-op-titulo');
  if (t) t.textContent = 'Editar Usuario: ' + (u?.nombre || '') + ' ' + (u?.apellido || '');
}

function adminGuardarUsuario() {
  svcOpGuardar();
}

function adminEliminarUsuario(id) {
  APP.modal.confirmar('¿Eliminar este usuario? Esta acción no se puede deshacer.', () => {
    APP.lsSet('usuarios', APP.lsGet('usuarios', []).filter(u => String(u.id) !== String(id)));
    adminRenderUsuarios(document.getElementById('adm-usuarios-buscar')?.value);
    APP.toast.show('Usuario eliminado.', 'success');
  }, 'Eliminar', 'Cancelar');
}

function adminCerrarModalUsuario() {
  svcOpCerrar();
  _svcAdminContext = false;
}

// ===== PERÍODO =====
function admSetPeriodo(p) {
  _admPeriodo = p;
  _admActualizarBotonesPeriodo();
  _admKPIs();
  _admTablaServicios();
  _admTablaMecanicos();
}

function _admActualizarBotonesPeriodo() {
  const ids = { semana:'adm-per-sem', mes:'adm-per-mes', 'año':'adm-per-ano' };
  Object.entries(ids).forEach(([k, id]) => {
    const b = document.getElementById(id);
    if (!b) return;
    const on = _admPeriodo === k;
    b.style.background = on ? 'var(--fill-accent)' : '';
    b.style.color      = on ? '#fff' : '';
    b.style.fontWeight = on ? '600' : '';
  });
  const lbl = document.getElementById('adm-periodo-label');
  if (!lbl) return;
  const ahora = new Date();
  const txts  = {
    semana: 'Esta semana',
    mes:    ahora.toLocaleDateString('es-CL', { month:'long', year:'numeric' }),
    'año':  String(ahora.getFullYear()),
  };
  lbl.textContent = '— ' + (txts[_admPeriodo] || '');
}

function _admFiltrarPorPeriodo(items, campoFecha) {
  const ahora = new Date();
  return items.filter(o => {
    const raw = o[campoFecha] || o.salida_ts || o.creado;
    if (!raw) return false;
    const f = new Date(raw);
    if (_admPeriodo === 'semana') {
      const dow = ahora.getDay() || 7;
      const lun = new Date(ahora); lun.setDate(ahora.getDate() - dow + 1); lun.setHours(0,0,0,0);
      return f >= lun;
    }
    if (_admPeriodo === 'mes') {
      return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
    }
    return f.getFullYear() === ahora.getFullYear();
  });
}

// ===== KPIs =====
function _admKPIs() {
  const todasComp = APP.lsGet('mp_ots', []).filter(o => o.estado === 'completado');
  const ots       = _admFiltrarPorPeriodo(todasComp, 'salida_ts');
  const clientes  = APP.lsGet('mp_clientes', []);
  const cliPer    = _admFiltrarPorPeriodo(clientes, 'creado');

  const ingTotal  = ots.reduce((s, o) => s + (parseFloat(o.valorTotal || o.valor) || 0), 0);
  const conTiempo = ots.filter(o => o.tiempoReal > 0);
  const minTotal  = conTiempo.reduce((s, o) => s + o.tiempoReal, 0);
  const ingTiempo = conTiempo.reduce((s, o) => s + (parseFloat(o.valorTotal || o.valor) || 0), 0);
  const rentH     = minTotal > 0 ? Math.round(ingTiempo / (minTotal / 60)) : 0;
  const minH      = APP.lsGet('mp_taller_config', {}).precioMinHora || 0;

  _admSet('adm-kpi-ots',       ots.length);
  _admSet('adm-kpi-ots-sub',   todasComp.length + ' total histórico');
  _admSet('adm-kpi-ingresos',  _fmtM(ingTotal));
  _admSet('adm-kpi-ing-sub',   (minTotal / 60).toFixed(1) + ' h facturadas');
  _admSet('adm-kpi-clientes',  cliPer.length);
  _admSet('adm-kpi-cli-sub',   clientes.length + ' total base');
  _admSet('adm-kpi-renth',     rentH ? _fmtM(rentH) + '/h' : '—');
  _admSet('adm-kpi-renth-sub', minH ? 'Mín. ' + _fmtM(minH) + '/h' : conTiempo.length + ' OTs con tiempo real');
  _admSet('adm-kpi-sat',       '4.8 ★');
  _admSet('adm-kpi-sat-sub',   ots.length + ' OTs en período');
}

// ===== TABLA SERVICIOS (7 cols) =====
function _admTablaServicios() {
  const tbody = document.getElementById('adm-tbody-svc');
  if (!tbody) return;
  const todasComp = APP.lsGet('mp_ots', []).filter(o => o.estado === 'completado');
  const ots       = _admFiltrarPorPeriodo(todasComp, 'salida_ts');
  if (!ots.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:20px;font-size:11px">Sin OTs completadas en el período.</td></tr>';
    return;
  }

  const map = {};
  ots.forEach(o => {
    const k = (o.servicio || 'Sin clasificar').trim();
    if (!map[k]) map[k] = { count:0, ingresos:0, sumReal:0, cntReal:0, sumEst:0, cntEst:0 };
    map[k].count++;
    map[k].ingresos += parseFloat(o.valorTotal || o.valor) || 0;
    if (o.tiempoReal    > 0) { map[k].sumReal += o.tiempoReal;            map[k].cntReal++; }
    if (o.tiempoEstimado> 0) { map[k].sumEst  += o.tiempoEstimado * 60;  map[k].cntEst++;  }
  });

  const minH = APP.lsGet('mp_taller_config', {}).precioMinHora || 0;
  const rows = Object.entries(map).map(([svc, d]) => {
    const avgReal = d.cntReal > 0 ? d.sumReal / d.cntReal : null;
    const avgEst  = d.cntEst  > 0 ? d.sumEst  / d.cntEst  : null;
    const efic    = avgEst && avgReal ? Math.round(avgEst / avgReal * 100) : null;
    const rentH   = avgReal ? Math.round(d.ingresos / (d.sumReal / 60)) : null;
    return { svc, ...d, avgReal, avgEst, efic, rentH };
  }).sort((a, b) => (b.rentH || 0) - (a.rentH || 0));

  tbody.innerHTML = rows.map(r => {
    const cE = !r.efic ? 'var(--text-muted)'
      : r.efic >= 95 ? 'var(--text-success)'
      : r.efic >= 75 ? 'var(--text-warning)'
      : 'var(--text-danger)';
    const cR = !r.rentH ? 'var(--text-muted)'
      : (minH && r.rentH < minH) ? 'var(--text-danger)'
      : 'var(--text-success)';
    const alerta = minH && r.rentH && r.rentH < minH
      ? ' <i class="ti ti-alert-triangle" style="color:var(--text-warning);font-size:10px" title="Bajo mínimo/hora"></i>' : '';
    return `<tr>
      <td style="font-size:11px">${_admEsc(r.svc)}${alerta}</td>
      <td style="text-align:center">${r.count}</td>
      <td style="font-size:11px;color:var(--text-muted)">${r.avgEst  ? _admFmtH(r.avgEst)  : '—'}</td>
      <td style="font-size:11px;color:var(--text-muted)">${r.avgReal ? _admFmtH(r.avgReal) : '—'}</td>
      <td style="color:${cE};font-weight:500;text-align:center">${r.efic != null ? r.efic + '%' : '—'}</td>
      <td style="font-size:11px">${_fmtM(r.ingresos)}</td>
      <td style="color:${cR};font-weight:600;font-size:11px">${r.rentH ? _fmtM(r.rentH) + '/h' : '—'}</td>
    </tr>`;
  }).join('');
}

// ===== TABLA MECÁNICOS (5 cols) =====
function _admTablaMecanicos() {
  const tbody = document.getElementById('adm-tbody-mec');
  if (!tbody) return;
  const todasComp = APP.lsGet('mp_ots', []).filter(o => o.estado === 'completado');
  const ots       = _admFiltrarPorPeriodo(todasComp, 'salida_ts');
  if (!ots.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;font-size:11px">Sin datos en el período.</td></tr>';
    return;
  }

  const map = {};
  ots.forEach(o => {
    const k = (o.tecnico || 'Sin asignar').trim();
    if (!map[k]) map[k] = { count:0, ingresos:0, sumReal:0, sumEst:0 };
    map[k].count++;
    map[k].ingresos += parseFloat(o.valorTotal || o.valor) || 0;
    if (o.tiempoReal    > 0) map[k].sumReal += o.tiempoReal;
    if (o.tiempoEstimado> 0) map[k].sumEst  += o.tiempoEstimado * 60;
  });

  const rows = Object.entries(map).map(([tec, d]) => {
    const efic = (d.sumEst > 0 && d.sumReal > 0) ? Math.round(d.sumEst / d.sumReal * 100) : null;
    return { tec, ...d, efic };
  }).sort((a, b) => b.count - a.count);

  tbody.innerHTML = rows.map(r => {
    const cE = !r.efic ? 'var(--text-muted)'
      : r.efic >= 95 ? 'var(--text-success)'
      : r.efic >= 75 ? 'var(--text-warning)'
      : 'var(--text-danger)';
    return `<tr>
      <td style="font-size:12px;font-weight:500">${_admEsc(r.tec)}</td>
      <td style="text-align:center">${r.count}</td>
      <td style="font-size:11px;color:var(--text-muted)">${r.sumReal ? _admFmtH(r.sumReal) : '—'}</td>
      <td style="color:${cE};font-weight:500;text-align:center">${r.efic != null ? r.efic + '%' : '—'}</td>
      <td style="font-size:11px">${_fmtM(r.ingresos)}</td>
    </tr>`;
  }).join('');
}

// ===== EFICIENCIA POR SERVICIO =====
function repRenderEficiencia() {
  const tbody = document.getElementById('rep-efic-tbody');
  if (!tbody) return;
  const ots = APP.lsGet('mp_ots', []).filter(o => o.estado === 'completado');
  if (!ots.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;font-size:11px">Sin OTs completadas.</td></tr>';
    return;
  }
  const map = {};
  ots.forEach(o => {
    const k = (o.servicio || 'Sin clasificar').trim();
    if (!map[k]) map[k] = { total: 0, sumEst: 0, cntEst: 0, sumReal: 0, cntReal: 0, efics: [] };
    const real = o.tiempoReal || 0;
    const est  = (o.tiempoEstimado || 0) * 60;
    const efic = est > 0 && real > 0 ? Math.round(est / real * 100) : null;
    map[k].total++;
    map[k].efics.push(efic);
    if (real > 0) { map[k].sumReal += real; map[k].cntReal++; }
    if (est  > 0) { map[k].sumEst  += est;  map[k].cntEst++;  }
  });
  const rows = Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  tbody.innerHTML = rows.map(([svc, d]) => {
    const avgReal = d.cntReal > 0 ? d.sumReal / d.cntReal : null;
    const avgEst  = d.cntEst  > 0 ? d.sumEst  / d.cntEst  : null;
    const efic    = avgEst && avgReal ? Math.round(avgEst / avgReal * 100) : null;
    const cE = efic == null ? 'var(--text-muted)'
      : efic >= 95 ? 'var(--text-success)'
      : efic >= 75 ? 'var(--text-warning)'
      : 'var(--text-danger)';
    const ultimas = d.efics.filter(e => e != null).slice(-5);
    const spark = ultimas.map(e => {
      const c = e >= 95 ? '#10b981' : e >= 75 ? '#f59e0b' : '#ef4444';
      return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c};margin-right:2px" title="${e}%"></span>`;
    }).join('');
    return `<tr>
      <td style="font-size:11px">${_admEsc(svc)}</td>
      <td style="text-align:center">${d.total}</td>
      <td style="font-size:11px;color:var(--text-muted)">${avgEst  ? _admFmtH(avgEst)  : '—'}</td>
      <td style="font-size:11px;color:var(--text-muted)">${avgReal ? _admFmtH(avgReal) : '—'}</td>
      <td style="color:${cE};font-weight:600;text-align:center">${efic != null ? efic + '%' : '—'}</td>
      <td>${spark || '<span style="color:var(--text-muted);font-size:10px">sin datos</span>'}</td>
    </tr>`;
  }).join('');
}

// ===== GRÁFICO MENSUAL (SVG) =====
function _admGraficoMensual() {
  const el = document.getElementById('adm-grafico-svg');
  if (!el) return;
  const ots   = APP.lsGet('mp_ots', []);
  const ahora = new Date();

  const meses = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    meses.push({ label: d.toLocaleDateString('es-CL', { month:'short' }), y: d.getFullYear(), m: d.getMonth(), ots: 0, horas: 0 });
  }
  ots.filter(o => o.estado === 'completado').forEach(o => {
    const d = new Date(o.salida_ts || o.creado || 0);
    const slot = meses.find(s => s.y === d.getFullYear() && s.m === d.getMonth());
    if (!slot) return;
    slot.ots++;
    if (o.tiempoReal > 0) slot.horas += o.tiempoReal / 60;
  });

  const maxO = Math.max(...meses.map(m => m.ots), 1);
  const maxH = Math.max(...meses.map(m => m.horas), 1);
  const W = 680, H = 160, padL = 28, padB = 28, padT = 14;
  const cW = W - padL - 8, cH = H - padB - padT;
  const bW = cW / 12;

  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">`;

  for (let i = 0; i <= 4; i++) {
    const y   = padT + cH - cH * i / 4;
    const val = Math.round(maxO * i / 4);
    s += `<text x="${padL - 4}" y="${y + 3}" text-anchor="end" font-size="9" fill="var(--text-muted)">${val}</text>`;
    s += `<line x1="${padL}" y1="${y}" x2="${W - 6}" y2="${y}" stroke="var(--border)" stroke-width="0.5"/>`;
  }

  meses.forEach((ms, i) => {
    const x  = padL + i * bW;
    const gp = bW * 0.14;
    const bw = bW - gp * 2;
    const hH = ms.horas > 0 ? Math.round(ms.horas / maxH * cH * 0.6) : 0;
    const oH = ms.ots   > 0 ? Math.round(ms.ots   / maxO * cH)       : 0;
    const isCurr = ms.y === ahora.getFullYear() && ms.m === ahora.getMonth();

    if (hH > 0) s += `<rect x="${x + gp}" y="${padT + cH - hH}" width="${bw}" height="${hH}" fill="var(--fill-accent)" opacity="0.18" rx="2"/>`;
    if (oH > 0) {
      s += `<rect x="${x + gp + bw * 0.12}" y="${padT + cH - oH}" width="${bw * 0.76}" height="${oH}" fill="var(--fill-accent)" opacity="${isCurr ? '1' : '0.6'}" rx="2"/>`;
      if (oH > 12) s += `<text x="${x + bW / 2}" y="${padT + cH - oH - 3}" text-anchor="middle" font-size="9" fill="var(--fill-accent)" font-weight="600">${ms.ots}</text>`;
    }
    s += `<text x="${x + bW / 2}" y="${H - 7}" text-anchor="middle" font-size="9" fill="var(--text-muted)">${ms.label}</text>`;
  });

  s += '</svg>';
  el.innerHTML = s;
}

// ===== ANÁLISIS DE FRECUENCIA =====
function _admFrecuencia() {
  const ots = APP.lsGet('mp_ots', []);

  // Marcas / modelos
  const marcas = {};
  ots.forEach(o => {
    if (!o.marca) return;
    if (!marcas[o.marca]) marcas[o.marca] = { count: 0, modelos: {}, servicios: {} };
    marcas[o.marca].count++;
    if (o.modelo) marcas[o.marca].modelos[o.modelo] = (marcas[o.marca].modelos[o.modelo] || 0) + 1;
    if (o.servicio) marcas[o.marca].servicios[o.servicio] = (marcas[o.marca].servicios[o.servicio] || 0) + 1;
  });
  const tbody1 = document.getElementById('adm-frecuencia-tbody');
  if (tbody1) {
    const top = Object.entries(marcas).sort((a, b) => b[1].count - a[1].count).slice(0, 10);
    tbody1.innerHTML = top.length ? top.map(([marca, d]) => {
      const topMod = Object.entries(d.modelos).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
      const topSvc = Object.entries(d.servicios).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
      return `<tr>
        <td style="font-weight:500">${_admEsc(marca)}</td>
        <td style="text-align:center">${d.count}</td>
        <td style="font-size:11px;color:var(--text-muted)">${_admEsc(topMod)}</td>
        <td style="font-size:10px;color:var(--text-muted);max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_admEsc(topSvc)}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;font-size:11px">Sin datos aún.</td></tr>';
  }

  // Stock sugerido (repuestos de alta rotación)
  const reps = {};
  ots.forEach(o => {
    (o.repuestosItems || o.repuestosDetalle || []).forEach(r => {
      const t = (r.nombre || r.desc || '').trim();
      if (t) reps[t] = (reps[t] || 0) + 1;
    });
    if (typeof o.repuestos === 'string') {
      o.repuestos.split('\n').forEach(l => { const t = l.trim(); if (t) reps[t] = (reps[t] || 0) + 1; });
    }
  });
  const tbody2 = document.getElementById('adm-stock-tbody');
  if (tbody2) {
    const topR = Object.entries(reps).sort((a, b) => b[1] - a[1]).slice(0, 10);
    tbody2.innerHTML = topR.length ? topR.map(([nombre, count]) => {
      const alta = count >= 3;
      return `<tr>
        <td style="font-size:11px">${_admEsc(nombre)}</td>
        <td style="text-align:center;font-weight:600">${count}</td>
        <td>${alta
          ? '<span class="st s-crit"><span class="dot"></span>Pre-comprar</span>'
          : '<span class="st s-wait"><span class="dot"></span>Normal</span>'}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:16px;font-size:11px">Sin repuestos en OTs.</td></tr>';
  }
}

// ===== EXPORTAR PDF =====
function admExportarPDF() {
  const ots  = APP.lsGet('mp_ots', []);
  const cfg  = APP.lsGet('mp_taller_config', _ADM_CFG_DEFAULT);
  const comp = _admFiltrarPorPeriodo(ots.filter(o => o.estado === 'completado'), 'salida_ts');
  const ing  = comp.reduce((s, o) => s + (parseFloat(o.valorTotal || o.valor) || 0), 0);
  const fecha = new Date().toLocaleDateString('es-CL', { day:'numeric', month:'long', year:'numeric' });
  const periodoLabel = { semana:'Semanal', mes:'Mensual', 'año':'Anual' }[_admPeriodo] || '';

  const svcMap = {};
  comp.forEach(o => {
    const k = (o.servicio || 'Sin clasificar').trim();
    if (!svcMap[k]) svcMap[k] = { count:0, ing:0, sumReal:0, cntReal:0, sumEst:0, cntEst:0 };
    svcMap[k].count++;
    svcMap[k].ing += parseFloat(o.valorTotal || o.valor) || 0;
    if (o.tiempoReal     > 0) { svcMap[k].sumReal += o.tiempoReal;           svcMap[k].cntReal++; }
    if (o.tiempoEstimado > 0) { svcMap[k].sumEst  += o.tiempoEstimado * 60; svcMap[k].cntEst++;  }
  });
  const svcRows = Object.entries(svcMap).sort((a, b) => b[1].ing - a[1].ing);

  const mecMap = {};
  ots.filter(o => o.estado === 'completado').forEach(o => {
    const k = (o.tecnico || 'Sin asignar').trim();
    if (!mecMap[k]) mecMap[k] = { count:0, ing:0, sumReal:0, sumEst:0 };
    mecMap[k].count++;
    mecMap[k].ing += parseFloat(o.valorTotal || o.valor) || 0;
    if (o.tiempoReal     > 0) mecMap[k].sumReal += o.tiempoReal;
    if (o.tiempoEstimado > 0) mecMap[k].sumEst  += o.tiempoEstimado * 60;
  });
  const mecRows = Object.entries(mecMap).sort((a, b) => b[1].ing - a[1].ing);

  const fmtN = n => n ? '$' + Math.round(n).toLocaleString('es-CL') : '—';
  const fmtHH = m => m ? Math.floor(m/60) + 'h ' + Math.round(m % 60) + 'm' : '—';
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Reporte ${periodoLabel} — ${_admEsc(cfg.nombre)}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;font-size:12px;color:#1a1a18;padding:28px}
  h1{font-size:19px;font-weight:700;margin-bottom:3px}.sub{color:#888;font-size:11px;margin-bottom:22px}
  .kg{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:22px}
  .kc{background:#f3f2ec;border-radius:8px;padding:10px}.kl{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px}.kv{font-size:17px;font-weight:700}
  h2{font-size:12px;font-weight:600;margin:18px 0 7px;border-bottom:1px solid #e5e3dc;padding-bottom:3px}
  table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11px}
  th{text-align:left;font-size:9px;color:#888;padding:4px 0;border-bottom:1px solid #e5e3dc;text-transform:uppercase;letter-spacing:.04em}
  td{padding:5px 0;border-bottom:0.5px solid #f0ede4}
  @media print{@page{margin:18mm}}</style></head><body>
  <h1>${_admEsc(cfg.nombre)}</h1>
  <div class="sub">Reporte ${periodoLabel} · Generado el ${fecha}${cfg.rut ? ' · RUT ' + _admEsc(cfg.rut) : ''}${cfg.direccion ? ' · ' + _admEsc(cfg.direccion) : ''}</div>
  <div class="kg">
    <div class="kc"><div class="kl">OTs período</div><div class="kv">${comp.length}</div></div>
    <div class="kc"><div class="kl">Ingresos período</div><div class="kv">${fmtN(ing)}</div></div>
    <div class="kc"><div class="kl">Clientes total</div><div class="kv">${APP.lsGet('mp_clientes',[]).length}</div></div>
    <div class="kc"><div class="kl">Total OTs hist.</div><div class="kv">${ots.length}</div></div>
    <div class="kc"><div class="kl">Satisfacción</div><div class="kv">4.8 ★</div></div>
  </div>
  <h2>Servicios más rentables</h2>
  ${svcRows.length ? `<table><thead><tr><th>Servicio</th><th>OTs</th><th>T.est prom.</th><th>T.real prom.</th><th>Efic.</th><th>Ingresos</th><th>Rent./hora</th></tr></thead><tbody>
  ${svcRows.map(([k, d]) => {
    const avgR = d.cntReal > 0 ? d.sumReal / d.cntReal : null;
    const avgE = d.cntEst  > 0 ? d.sumEst  / d.cntEst  : null;
    const efic = avgE && avgR ? Math.round(avgE / avgR * 100) + '%' : '—';
    const rh   = avgR ? fmtN(Math.round(d.ing / (d.sumReal / 60))) + '/h' : '—';
    return `<tr><td>${_admEsc(k)}</td><td>${d.count}</td><td>${fmtHH(avgE)}</td><td>${fmtHH(avgR)}</td><td>${efic}</td><td>${fmtN(d.ing)}</td><td>${rh}</td></tr>`;
  }).join('')}</tbody></table>` : '<p style="color:#888;font-size:11px">Sin datos.</p>'}
  <h2>Rendimiento por mecánico</h2>
  ${mecRows.length ? `<table><thead><tr><th>Mecánico</th><th>OTs</th><th>T.real total</th><th>Eficiencia</th><th>Ingresos</th></tr></thead><tbody>
  ${mecRows.map(([t, d]) => {
    const efic = (d.sumEst > 0 && d.sumReal > 0) ? Math.round(d.sumEst / d.sumReal * 100) + '%' : '—';
    return `<tr><td>${_admEsc(t)}</td><td>${d.count}</td><td>${fmtHH(d.sumReal)}</td><td>${efic}</td><td>${fmtN(d.ing)}</td></tr>`;
  }).join('')}</tbody></table>` : '<p style="color:#888;font-size:11px">Sin datos.</p>'}
  </body></html>`;

  const win = window.open('', '_blank');
  if (!win) { APP.toast.show('⚠️ Permite ventanas emergentes para exportar el PDF.', 'warning'); return; }
  win.document.write(html); win.document.close();
  setTimeout(() => win.print(), 600);
}

// ===== EXPORTAR EXCEL (CSV) =====
function admExportarExcel() {
  const ots     = APP.lsGet('mp_ots', []);
  const cfg     = APP.lsGet('mp_taller_config', _ADM_CFG_DEFAULT);
  const comp    = _admFiltrarPorPeriodo(ots.filter(o => o.estado === 'completado'), 'salida_ts');
  const periodoLabel = { semana:'Semanal', mes:'Mensual', 'año':'Anual' }[_admPeriodo] || '';

  const rows = [
    [cfg.nombre || 'MecánicaPro'], ['Reporte ' + periodoLabel, new Date().toLocaleDateString('es-CL')], [],
    ['OTs período', comp.length], ['Ingresos', comp.reduce((s,o)=>s+(parseFloat(o.valorTotal||o.valor)||0),0)], [],
    ['DETALLE OTs'], ['OT','Fecha','Patente','Cliente','Servicio','Técnico','Valor($)','Horas real','Estado'],
    ...comp.map(o => [
      o.id, o.fechaCita || o.creado?.slice(0,10), o.patente||'', o.clienteNombre||'',
      o.servicio||'', o.tecnico||'',
      Math.round(parseFloat(o.valorTotal||o.valor)||0),
      o.tiempoReal ? (o.tiempoReal/60).toFixed(2) : '', o.estado,
    ]),
  ];

  const csv  = rows.map(r => r.map(c => '"' + String(c ?? '').replace(/"/g,'""') + '"').join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'reporte-' + _admPeriodo + '-' + new Date().toISOString().slice(0,10) + '.csv' });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== CONFIGURACIÓN TALLER =====
function _admCargarConfig() {
  const cfg = APP.lsGet('mp_taller_config', _ADM_CFG_DEFAULT);
  const s   = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  s('cfg-nombre', cfg.nombre); s('cfg-rut', cfg.rut); s('cfg-direccion', cfg.direccion);
  s('cfg-telefono', cfg.telefono); s('cfg-agenda', cfg.agenda);
  _admCargarLogoPreview();
}

function admGuardarConfig() {
  const g   = id => (document.getElementById(id)?.value || '').trim();
  const old = APP.lsGet('mp_taller_config', {});
  const cfg = { ...old, nombre: g('cfg-nombre') || _ADM_CFG_DEFAULT.nombre, rut: g('cfg-rut'), direccion: g('cfg-direccion'), telefono: g('cfg-telefono'), agenda: g('cfg-agenda') };
  APP.lsSet('mp_taller_config', cfg);
  const btn = document.getElementById('cfg-btn-guardar');
  if (btn) { const o = btn.innerHTML; btn.innerHTML = '<i class="ti ti-check"></i>Guardado ✓'; btn.disabled = true; setTimeout(() => { btn.innerHTML = o; btn.disabled = false; }, 2000); }
}

// ===== LOGO DEL TALLER =====
function _admCargarLogoPreview() {
  const preview = document.getElementById('cfg-logo-preview');
  const btnDel  = document.getElementById('cfg-logo-eliminar');
  if (!preview) return;
  const logo = APP.getLogoTaller();
  if (logo) {
    preview.innerHTML = '<img src="' + logo + '" style="max-width:120px;max-height:60px;object-fit:contain">';
    if (btnDel) btnDel.style.display = '';
  } else {
    preview.innerHTML = 'Sin logo';
    if (btnDel) btnDel.style.display = 'none';
  }
}

function admCargarLogo(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 1048576) { APP.toast.show('⚠️ La imagen supera 1MB. Elige un archivo más pequeño.', 'warning'); input.value = ''; return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    try { localStorage.setItem('config_logo_taller', e.target.result); } catch (e) { console.error('Error guardando logo:', e); }
    _admCargarLogoPreview();
    APP.toast.show('Logo cargado. Guarda los datos del taller para confirmar.', 'success');
  };
  reader.readAsDataURL(file);
}

function admEliminarLogo() {
  try { localStorage.removeItem('config_logo_taller'); } catch (e) { console.error(e); }
  _admCargarLogoPreview();
}

// ═══════════════════════════════════════════════════════════════════
// DATOS DEL TALLER — formulario completo + config operativa
// ═══════════════════════════════════════════════════════════════════

// ===== CASCADA PAÍS-REGIÓN-CIUDAD-COMUNA =====
// ──────────────────────────────────────────────
// DATOS COMPLETOS DE UBICACIONES (Chile, Argentina, Perú)
// Estructura: UBICACIONES[pais][region][ciudad] = [comunas]
// ──────────────────────────────────────────────
const UBICACIONES = {
  // ═══════════════════════════════════════════════
  // CHILE — 16 regiones
  // ═══════════════════════════════════════════════
  Chile: {
    'Arica y Parinacota': {
      Arica: ['Arica', 'San Miguel de Azapa', 'San Pedro de Atacama', 'Cerro Sombrero', 'Chacalluta', 'Linderos'],
      Putre: ['Putre', 'Belén', 'Socoroma', 'Guallatiri', 'Pachama', 'Ticnámar', 'Copaquilla']
    },
    Tarapacá: {
      Iquique: ['Iquique', 'Alto Hospicio', 'Pica', 'La Tirana', 'Matilla', 'Chanavayita'],
      'Pozo Almonte': ['Pozo Almonte', 'La Tirana', 'Mamiña'],
      Huara: ['Huara', 'Pisagua', 'Tarapacá', 'Pachica'],
      Camiña: ['Camiña', 'Nama', 'Moquilla'],
      Colchane: ['Colchane', 'Cariquima', 'Enquelga']
    },
    Antofagasta: {
      Antofagasta: ['Antofagasta', 'Mejillones', 'Baquedano', 'Sierra Gorda', 'Caleta El Cobre', 'La Negra', 'Coloso', 'Caleta Loa'],
      Calama: ['Calama', 'San Pedro de Atacama', 'Chiu Chiu', 'Lasana', 'Ayquina', 'Turi', 'Río Grande', 'Socaire', 'Toconao', 'Talabre', 'El Tatio'],
      Tocopilla: ['Tocopilla', 'María Elena', 'El Toco', 'La Caleta', 'Barriles'],
      Taltal: ['Taltal', 'Paposo', 'La Chimba', 'Cifuncho']
    },
    Atacama: {
      Copiapó: ['Copiapó', 'Caldera', 'Tierra Amarilla', 'Piedra Colgada', 'Paipote', 'San Fernando Viejo', 'Bahía Inglesa', 'Puerto Viejo', 'Puerto Flamenco', 'Puerto del Morro'],
      Vallenar: ['Vallenar', 'Huasco', 'Freirina', 'Alto del Carmen', 'San Félix', 'El Transito', 'La Higuerita', 'Canto del Agua', 'Domeyko', 'Maitencillo'],
      Chañaral: ['Chañaral', 'El Salado', 'Barquito', 'Flamenco', 'Pan de Azúcar'],
      'Diego de Almagro': ['Diego de Almagro', 'El Inca', 'Potrerillos', 'Llanta', 'Las Ánimas']
    },
    Coquimbo: {
      'La Serena': ['La Serena', 'Altovalsol', 'Algarrobito', 'Islón', 'La Florida', 'Lambert', 'Las Rojas'],
      Coquimbo: ['Coquimbo', 'El Llano', 'Las Tacas', 'Los Hornos', 'Playa Changa', 'Tongoy', 'Guanaqueros', 'La Herradura', 'Peñuelas'],
      Ovalle: ['Ovalle', 'Monte Patria', 'Punitaqui', 'Combarbalá', 'Sotaquí', 'Barraza', 'Chañaral Alto', 'Peña Blanca', 'El Mauro', 'Río Hurtado'],
      Illapel: ['Illapel', 'Salamanca', 'Los Vilos', 'Canela', 'Huentelauquén', 'Pichidangui', 'Limahuida', 'San Agustín'],
      Vicuña: ['Vicuña', 'Paihuano', 'Perallillo', 'La Campana', 'Andacollo', 'La Calera', 'Elqui', 'Horcón'],
      'Los Vilos': ['Los Vilos', 'Quilimarí', 'Tilama', 'Cavilolén', 'Choapa']
    },
    Valparaíso: {
      Valparaíso: ['Valparaíso', 'Concón', 'Casablanca', 'Juan Fernández', 'Playa Ancha', 'Cerro Barón', 'Cerro Alegre', 'Cerro Concepción', 'Cerro Bellavista', 'Puerto', 'Almendral', 'Viña del Mar (parte)', 'Laguna Verde', 'Quintil', 'El Faro', 'Bosques de Montemar', 'Reñaca Alto', 'El Salto', 'Curauma', 'Peñablanca'],
      'Viña del Mar': ['Viña del Mar', 'Reñaca', 'Santa Inés', 'Agua Santa', 'Tranque Sur', 'El Viñedo Alto', 'Chorrillos', 'Espejo', 'Valle Alegre', 'Gómez Carreño'],
      Quilpué: ['Quilpué', 'El Belloto', 'Los Pinos', 'Villa Alemana (parte)'],
      'Villa Alemana': ['Villa Alemana', 'Peñablanca', 'Los Pinos'],
      'San Antonio': ['San Antonio', 'Cartagena', 'El Quisco', 'El Tabo', 'Algarrobo', 'Santo Domingo', 'Llo-Lleo', 'Llolleo', 'San Juan', 'Barrancas', 'Tejas Verdes', 'Rocas de Santo Domingo'],
      'San Felipe': ['San Felipe', 'Putaendo', 'Santa María', 'Panquehue', 'Llay-Llay', 'Catemu', 'Curimón', 'San José', 'Rinconada de Silva', 'Unión Campesina'],
      'Los Andes': ['Los Andes', 'San Esteban', 'Calle Larga', 'Rinconada', 'Río Colorado', 'Vilcuya', 'Portillo', 'Juncal'],
      Quillota: ['Quillota', 'La Cruz', 'Limache', 'Olmué', 'San Pedro', 'Boco', 'Valle Hermoso', 'El Retiro', 'Los Laureles', 'Las Palmas'],
      'La Ligua': ['La Ligua', 'Cabildo', 'Papudo', 'Zapallar', 'Petorca', 'Pichicuy', 'Los Molles', 'Ventanas', 'Pullally', 'Cachagua', 'Maitencillo (Puchuncaví)'],
      'Isla de Pascua': ['Hanga Roa', 'Hanga Piko', 'Mataveri'],
      Marga Marga: ['Limache', 'Olmué'],
      Puchuncaví: ['Puchuncaví', 'La Greda', 'Laguna Verde', 'El Rincón', 'Campiche', 'Pucalán'],
      'Nuevo Imperial': ['La Estrella', 'Litueche', 'Marchihue', 'Navidad', 'Pichilemu']
    },
    Metropolitana: {
      Santiago: ['Santiago Centro', 'Estación Central', 'Independencia', 'Recoleta', 'Providencia', 'Las Condes', 'Vitacura', 'Lo Barnechea', 'Ñuñoa', 'La Reina', 'Macul', 'Peñalolén', 'La Florida', 'San Joaquín', 'San Miguel', 'Pedro Aguirre Cerda', 'Lo Espejo', 'El Bosque', 'La Cisterna', 'San Ramón', 'La Granja', 'Cerro Navia', 'Lo Prado', 'Quinta Normal', 'Renca', 'Conchalí', 'Huechuraba', 'Quilicura', 'Pudahuel', 'Cerrillos', 'Maipú', 'Padre Hurtado', 'Puente Alto', 'Pirque', 'San José de Maipo', 'Colina', 'Lampa', 'Tiltil'],
      'San Bernardo': ['San Bernardo', 'Buin', 'Paine', 'Calera de Tango', 'El Monte', 'Isla de Maipo', 'Los Cerrillos', 'Nos', 'San José de Maipo', 'Puente Alto (parte)'],
      Talagante: ['Talagante', 'Peñaflor', 'El Monte', 'Isla de Maipo', 'Monte Tiro', 'Malloco', 'Lo Chacón'],
      Melipilla: ['Melipilla', 'Alhué', 'María Pinto', 'San Pedro', 'Curacaví', 'Pomaire', 'Calcuya', 'Bollenar', 'La Capilla'],
      Colina: ['Colina', 'Lampa', 'Tiltil', 'Chicureo', 'El Colorado', 'San José de Lampa'],
      Pirque: ['Pirque', 'San José de Maipo', 'Las Vertientes', 'El Principal', 'La Obra']
    },
    "Libertador General Bernardo O'Higgins": {
      Rancagua: ['Rancagua', 'Graneros', 'Machalí', 'Requínoa', 'Olivar', 'Doñihue', 'Coinco', 'Coltauco', 'Las Cabras', 'Peumo', 'Pichidegua', 'San Vicente de Tagua Tagua', 'Quinta de Tilcoco', 'Rengo', 'Malloa', 'Mostazal', 'Codegua', 'Chépica'],
      'San Fernando': ['San Fernando', 'Chimbarongo', 'Nancagua', 'Placilla', 'Pumanque', 'Lolol', 'Santa Cruz', 'Palmilla', 'Peralillo', 'Marchigüe', 'Navidad', 'Litueche', 'La Estrella', 'Pichilemu'],
      Rengo: ['Rengo', 'Requínoa', 'Malloa', 'Quinta de Tilcoco', 'San Vicente de Tagua Tagua', 'Pichidegua'],
      Mostazal: ['Mostazal', 'Codegua', 'Graneros'],
      Lolol: ['Lolol', 'Santa Cruz', 'Pumanque', 'Nancagua']
    },
    Maule: {
      Talca: ['Talca', 'San Clemente', 'Pelarco', 'Pencahue', 'Maule', 'San Rafael', 'Curepto', 'Constitución', 'Empedrado', 'Molina', 'Sagrada Familia', 'Río Claro', 'Lontué', 'Duao', 'Putú', 'Iloca'],
      Curicó: ['Curicó', 'Teno', 'Romeral', 'Rauco', 'Vichuquén', 'Hualañé', 'Licantén', 'Molina', 'Sagrada Familia', 'Los Niches', 'Upeo', 'La Huerta del Maule', 'Patacón', 'Llico', 'Boca de Maule'],
      Linares: ['Linares', 'San Javier', 'Villa Alegre', 'Yerbas Buenas', 'Colbún', 'Longaví', 'Parral', 'Retiro', 'Copihue', 'Peñaflor', 'Los Robles'],
      Cauquenes: ['Cauquenes', 'Chanco', 'Pelluhue', 'Curanipe', 'Las Cardas', 'Quella', 'Bullenar'],
      Constitución: ['Constitución', 'Putú', 'Iloca', 'Duao', 'Quivolgo', 'Rancura', 'Potrero Grande'],
      Parral: ['Parral', 'Retiro', 'Longaví', 'Copihue', 'Cauquenes (parte)']
    },
    Ñuble: {
      Chillán: ['Chillán', 'Chillán Viejo', 'Quillón', 'Bulnes', 'San Ignacio', 'El Carmen', 'Pemuco', 'Yungay', 'Cobquecura', 'Ránquil', 'Quirihue', 'Ninhue', 'Portezuelo', 'Coihueco', 'Pinto', 'San Fabián', 'Ñiquén', 'San Carlos'],
      'San Carlos': ['San Carlos', 'San Fabián', 'Cobquecura', 'Quirihue', 'Ninhue', 'Ránquil', 'Portezuelo'],
      Coihueco: ['Coihueco', 'Pinto', 'San Ignacio'],
      Yungay: ['Yungay', 'Pemuco', 'El Carmen']
    },
    Biobío: {
      Concepción: ['Concepción', 'Talcahuano', 'Hualpén', 'Chiguayante', 'San Pedro de la Paz', 'Coronel', 'Lota', 'Penco', 'Tomé', 'Hualqui', 'Santa Juana', 'Florida', 'Florida', 'El Arenal', 'Andalién', 'Tumbes', 'Lirquén'],
      'Los Ángeles': ['Los Ángeles', 'Quilleco', 'Antuco', 'Tucapel', 'Alto Biobío', 'Santa Bárbara', 'Quilaco', 'Mulchén', 'Negrete', 'Nacimiento', 'San Rosendo', 'Yumbel', 'Cabrero', 'Laja'],
      'Lebu': ['Lebu', 'Curanilahue', 'Arauco', 'Cañete', 'Contulmo', 'Tirúa', 'Los Álamos', 'Laraquete', 'Carampangue'],
      Cañete: ['Cañete', 'Contulmo', 'Tirúa'],
      Arauco: ['Arauco', 'Curanilahue', 'Lebu', 'Los Álamos'],
      'San Pedro de la Paz': ['San Pedro de la Paz', 'Lomas Coloradas', 'Miches', 'Candelaria', 'Santa Margarita'],
      Chiguayante: ['Chiguayante', 'Manquimávida', 'El Manzano', 'Valle Noble', 'Enrique Arenas', 'Tucapel Bajo']
    },
    'La Araucanía': {
      Temuco: ['Temuco', 'Padre Las Casas', 'Vilcún', 'Freire', 'Nueva Imperial', 'Carahue', 'Cholchol', 'Saavedra', 'Teodoro Schmidt', 'Pitrufquén', 'Loncoche', 'Toltén', 'Gorbea', 'Cunco', 'Melipeuco'],
      Villarrica: ['Villarrica', 'Pucón', 'Licán Ray', 'Coñaripe', 'Curarrehue', 'Caburgua', 'Palguín Bajo', 'Lago Llanquihue (parte)'],
      Angol: ['Angol', 'Collipulli', 'Ercilla', 'Victoria', 'Lautaro', 'Curacautín', 'Lonquimay', 'Traiguén', 'Los Sauces', 'Purén', 'Renaico', 'Perquenco', 'Galvarino'],
      Victoria: ['Victoria', 'Curacautín', 'Lonquimay', 'Selva Oscura', 'Malalcahuello'],
      Lautaro: ['Lautaro', 'Perquenco', 'Galvarino'],
      'Padre Las Casas': ['Padre Las Casas', 'Carhue', 'Huichahue', 'Quepe', 'Maquegua', 'Molco', 'Nielol']
    },
    'Los Ríos': {
      Valdivia: ['Valdivia', 'Corral', 'Máfil', 'Los Lagos', 'Paillaco', 'Lanco', 'Panguipulli', 'Niebla', 'Isla Teja', 'Las Ánimas', 'Torreones', 'Cayumapu', 'Collico', 'Pelchuquín', 'Punucapa'],
      'La Unión': ['La Unión', 'Río Bueno', 'Llanquihue (parte)', 'Trumao', 'El Llolly', 'San Javier de Transandino'],
      Panguipulli: ['Panguipulli', 'Coñaripe', 'Licán Ray', 'Choshuenco', 'Neltume', 'Puerto Fuy', 'Pirihueico', 'Carranco'],
      'Río Bueno': ['Río Bueno', 'Lago Ranco', 'Futrono', 'El Llolly'],
      Lanco: ['Lanco', 'Máfil', 'Los Lagos']
    },
    'Los Lagos': {
      'Puerto Montt': ['Puerto Montt', 'Puerto Varas', 'Llanquihue', 'Frutillar', 'Fresia', 'Calbuco', 'Los Muermos', 'Maullín', 'Cochamó', 'Ralún', 'Las Cascadas', 'Puelo', 'Lago Chapo', 'Alerce', 'Tenglo', 'Metri'],
      Osorno: ['Osorno', 'Purranque', 'Río Negro', 'San Pablo', 'San Juan de la Costa', 'Puyehue', 'Entre Lagos', 'Rupanco', 'Bahía Mansa', 'Pucatrihue', 'Caleta Cóndor'],
      Castro: ['Castro', 'Ancud', 'Quellón', 'Dalcahue', 'Puqueldón', 'Curaco de Vélez', 'Quinchao', 'Achao', 'Chonchi', 'Hualaihué', 'Chaitén', 'Futaleufú', 'Palena', 'Chepu', 'Llicaldad', 'Putemún', 'Nercón', 'Rilán'],
      Ancud: ['Ancud', 'Quemchi', 'Dalcahue', 'Manao', 'Cucao', 'Caulín', 'Pugueñón', 'Coquiao', 'Linao', 'Ahoni', 'Huicha', 'Chacao', 'Lepué'],
      'Puerto Varas': ['Puerto Varas', 'Frutillar', 'Llanquihue', 'Cochamó', 'Ensenada', 'Petrohué', 'Río Pescado'],
      Calbuco: ['Calbuco', 'Maullín', 'Los Muermos', 'Pargua', 'Carelmapu', 'Río Chico'],
      Chiloé: ['Castro', 'Ancud', 'Quellón', 'Dalcahue', 'Chonchi', 'Quemchi', 'Quinchao', 'Puqueldón', 'Curaco de Vélez', 'Hualaihué', 'Chaitén', 'Futaleufú', 'Palena'],
      Chaitén: ['Chaitén', 'Futaleufú', 'Palena', 'Ayacara', 'Puerto Carmen', 'El Amarillo'],
      'Hualaihué': ['Hualaihué', 'Aulen', 'Pichicolo', 'Hornopirén', 'Caleta Gonzalo', 'El Bolsón', 'Lago Cabrera', 'Chauchil']
    },
    'Aysén del General Carlos Ibáñez del Campo': {
      Coyhaique: ['Coyhaique', 'Puerto Aysén', 'Lago Verde', 'Villa Mañihuales', 'El Blanco', 'Villa Tapera', 'El Correl', 'El Barco', 'Valle Simpson'],
      'Puerto Aysén': ['Puerto Aysén', 'Aysén', 'Villa Mañihuales', 'Puerto Chacabuco', 'Río Blanco', 'Puyuhuapi', 'La Tapera', 'Isla Huemules', 'Faro Raper'],
      'Chile Chico': ['Chile Chico', 'Los Antiguos (vecino Argentina)', 'Puerto Cristal', 'Balmaceda', 'El Chacay', 'Río Hunco', 'Bahía Jara', 'Valle Chacabuco', 'Lago Buenos Aires', 'Río Ibáñez'],
      Cochrane: ['Cochrane', 'Tortel', 'Villa O\'Higgins', 'Puerto Yungay', 'Río Baker', 'Río Bravo', 'Bahía Murta', 'El Ranchillo'],
      'Villa O\'Higgins': ['Villa O\'Higgins', 'Puerto Yungay', 'El Pascua', 'Monte Aguilera', 'Bahía Bahamondes']
    },
    'Magallanes y de la Antártica Chilena': {
      'Punta Arenas': ['Punta Arenas', 'Puerto Natales', 'Río Verde', 'Porvenir', 'Cabo de Hornos', 'Puerto Williams', 'Cerro Sombrero', 'Timaukel', 'Pampa Guanaco', 'Laguna Blanca', 'San Gregorio', 'Peckett', 'Cameron'],
      'Puerto Natales': ['Puerto Natales', 'Torres del Paine', 'Cerro Castillo', 'Río Baguales', 'Estancia Cerro Negro', 'Villa Tehuelches'],
      Porvenir: ['Porvenir', 'Cameron', 'Río Grande', 'Pampa Baja'],
      'Puerto Williams': ['Puerto Williams', 'Bahía Puerto', 'Península Dumas', 'Isla Navarino', 'Río Grande (Tierra del Fuego)']
    }
  },

  // ═══════════════════════════════════════════════
  // ARGENTINA — 23 provincias + CABA
  // ═══════════════════════════════════════════════
  Argentina: {
    'Buenos Aires (Provincia)': {
      'La Plata': ['La Plata', 'Berisso', 'Ensenada', 'City Bell', 'Villa Elisa', 'Gonnet', 'Tolosa', 'Los Hornos', 'Ringuelet', 'Manuel B. Gonnet', 'José Hernández', 'El Pato', 'Olmos', 'Arana', 'Etcheverry'],
      'Mar del Plata': ['Mar del Plata', 'Batán', 'Sierra de los Padres', 'El Coyunco', 'Colinas de Peralta Ramos', 'La Florida', 'Parque Palermo', 'Las Heras (parte)'],
      Bahía Blanca: ['Bahía Blanca', 'Ingeniero White', 'General Cerri', 'Cabildo', 'Puerto Belgrano', 'Punta Alta', 'Villa del Mar'],
      'Lanús': ['Lanús', 'Remedios de Escalada', 'Valentín Alsina', 'Monte Chingolo', 'Villa de los Industriales', 'Gerli', 'Piñeyro'],
      'Lomas de Zamora': ['Lomas de Zamora', 'Banfield', 'Temperley', 'Llavallol', 'Turdera', 'San José', 'Villa Centenario', 'Fiorito'],
      'Quilmes': ['Quilmes', 'Bernal', 'Ezpeleta', 'Villa La Florida', 'San Francisco Solano', 'Don Bosco', 'Ranelagh'],
      'San Isidro': ['San Isidro', 'Martínez', 'Acassuso', 'Béccar', 'Boulogne Sur Mer', 'Villa Adelina', 'Vicente López', 'Olivos'],
      'Morón': ['Morón', 'Castelar', 'Haedo', 'El Palomar', 'Villa Sarmiento', 'Ramos Mejía', 'Ciudad Jardín Lomas del Palomar'],
      'Tandil': ['Tandil', 'Gardey', 'María Ignacia', 'Vela', 'De la Canal', 'Azucena', 'Fulton'],
      'La Matanza': ['San Justo', 'Ramos Mejía', 'Ciudad Evita', 'Isidro Casanova', 'Laferrere', 'González Catán', 'Villa Luzuriaga', 'Tapiales', 'Aldo Bonzi', 'Madero'],
      'Pilar': ['Pilar', 'Manuel Alberti', 'Del Viso', 'Presidente Derqui', 'Villa Rosa', 'Fátima', 'La Lonja', 'Laguna de Lobos', 'El Haras'],
      'General Sarmiento': ['José C. Paz', 'San Miguel', 'Malvinas Argentinas', 'Los Polvorines', 'Grand Bourg', 'Tortuguitas'],
      'Tres de Febrero': ['Caseros', 'Ciudad Jardín', 'El Libertador', 'Martín Coronado', 'Pablo Podestá', 'Remedios de Escalada', 'Saavedra', 'Villa Bosch']
    },
    'CABA': {
      'Buenos Aires Centro': ['San Nicolás', 'Montserrat', 'Balvanera', 'Recoleta', 'Retiro', 'Puerto Madero'],
      'Belgrano': ['Belgrano', 'Núñez', 'Coghlan', 'Saavedra', 'Colegiales'],
      'Palermo': ['Palermo', 'Las Cañitas', 'Bosques de Palermo', 'Barrio Parque', 'Palermo Viejo', 'Palermo Chico', 'Palermo Hollywood', 'Palermo Soho'],
      'Almagro': ['Almagro', 'Boedo', 'Caballito', 'Flores', 'San Cristóbal', 'Villa Santa Rita', 'Floresta', 'Villa General Mitre', 'Villa Crespo'],
      'La Boca': ['La Boca', 'Barracas', 'Constitución', 'Parque Patricios', 'Nueva Pompeya'],
      'Mataderos': ['Mataderos', 'Liniers', 'Villa Luro', 'Vélez Sársfield', 'Monte Castro', 'Villa Real', 'Villa Devoto', 'Versalles'],
      'Villa Urquiza': ['Villa Urquiza', 'Villa Pueyrredón', 'Belgrano R', 'Parque Chas', 'Villa Ortúzar', 'La Paternal', 'Chacarita', 'Agronomía']
    },
    Córdoba: {
      'Córdoba Capital': ['Centro', 'Nueva Córdoba', 'Cerro de las Rosas', 'Alta Córdoba', 'Güemes', 'General Paz', 'San Vicente', 'Rancagua', 'Cofico', 'Observatorio', 'Jardín Espinosa', 'Urca', 'Los Boulevares', 'Villa Allende Parque', 'Argüello', 'La Calera'],
      'Río Cuarto': ['Río Cuarto', 'Las Higueras', 'Elena', 'Coronel Moldes', 'Alpa Corral', 'Achiras', 'Carnerillo'],
      'Villa María': ['Villa María', 'Villa Nueva', 'Tío Pujio', 'Costa Bonita', 'La Playosa', 'Arroyito'],
      'San Francisco': ['San Francisco', 'Frontera', 'Plaza Clucellas', 'Devoto', 'Bella Italia', 'Colonia Marina', 'Toscano', 'El Tío'],
      'Carlos Paz': ['Villa Carlos Paz', 'Morteros', 'Cosquín', 'La Falda', 'Capilla del Monte', 'Cruz del Eje', 'Mina Clavero', 'Alta Gracia', 'Río Tercero', 'Embalse', 'Santa Rosa de Calamuchita', 'Villa General Belgrano'],
      'Río Tercero': ['Río Tercero', 'Almafuerte', 'Berrotarán', 'Corralito', 'Dalmacio Vélez Sarsfield', 'General Fotheringham', 'Las Perdices', 'Tancacha', 'Villa Ascasubi']
    },
    'Santa Fe': {
      Rosario: ['Rosario', 'Villa Gobernador Gálvez', 'Granadero Baigorria', 'Pérez', 'San Lorenzo', 'Roldán', 'Funes', 'Arroyo Seco', 'Capitán Bermúdez', 'Fray Luis Beltrán', 'Puerto General San Martín', 'Timbúes', 'Soldini', 'Zavalla'],
      'Santa Fe Capital': ['Santa Fe', 'Santo Tomé', 'San José del Rincón', 'Recreo', 'Monte Vera', 'Candioti', 'Laguna Paiva', 'Nelson', 'Llambi Campbell'],
      Rafaela: ['Rafaela', 'Sunchales', 'Esperanza', 'San Carlos Centro', 'Santa Clara de Saguier', 'San Vicente', 'Ataliva', 'Lehmann', 'Moisés Ville', 'Gálvez', 'San Jerónimo Norte'],
      'Venado Tuerto': ['Venado Tuerto', 'Firmat', 'Cañada de Gómez', 'Villa Constitución', 'Casilda', 'Sanford', 'Melincué', 'Murphy', 'Wheelwright', 'Elortondo', 'Chovet'],
      Reconquista: ['Reconquista', 'Avellaneda', 'Malería', 'Villa Ocampo', 'Las Toscas', 'San Javier', 'Romang', 'Tostado', 'Vera', 'Calchaquí']
    },
    Mendoza: {
      Mendoza: ['Ciudad de Mendoza', 'Godoy Cruz', 'Guaymallén', 'Las Heras', 'Maipú', 'Luján de Cuyo', 'San Martín', 'Rivadavia', 'Junín', 'La Paz', 'General Alvear', 'San Rafael', 'Tunuyán', 'Tupungato'],
      'San Rafael': ['San Rafael', 'General Alvear', 'Malargüe', 'Monte Comán', 'La Llave', 'Cuadro Nacional', 'Tierra del Fuego', 'Villa Atuel', 'Real del Padre', 'La Chimba'],
      'San Martín': ['San Martín', 'Junín', 'Rivadavia', 'La Colonia'],
      Luján: ['Luján de Cuyo', 'Agrelo', 'Perdriel', 'Uspallata', 'Cacheuta', 'Potrerillos', 'Las Heras (parte)'],
      'Valle de Uco': ['Tunuyán', 'Tupungato', 'San Carlos', 'Vista Flores', 'Los Chacales']
    },
    Tucumán: {
      'San Miguel de Tucumán': ['San Miguel de Tucumán', 'Yerba Buena', 'Tafí Viejo', 'Banda del Río Salí', 'Alderetes', 'El Manantial', 'Las Talitas', 'Los Pocitos', 'San Pablo', 'Villa Muñecas', 'Villa Luján', 'Villa Mariano Moreno'],
      'Concepción': ['Concepción', 'Aguilares', 'Juan Bautista Alberdi', 'Monte Bello', 'Alto Verde'],
      'Tafí del Valle': ['Tafí del Valle', 'El Mollar', 'Amaicha del Valle', 'Colalao del Valle', 'El Desmonte'],
      'Lules': ['Lules', 'Famaillá', 'Bella Vista', 'Los Ralos', 'El Timbó']
    },
    Salta: {
      'Salta Capital': ['Salta', 'Vaqueros', 'La Caldera', 'Cerrillos', 'Rosario de Lerma', 'Campo Quijano', 'Chicoana', 'El Carril', 'La Merced'],
      'San Ramón de la Nueva Orán': ['Orán', 'Embarcación', 'Tartagal', 'Aguas Blancas', 'Pichanal', 'Hipólito Yrigoyen', 'Colonia Santa Rosa', 'Urundel', 'Tabacal', 'Isla de Cañas'],
      'Cafayate': ['Cafayate', 'San Carlos', 'Anastacio', 'El Pucará', 'Tolombón', 'La Viña'],
      'General Güemes': ['General Güemes', 'Las Lajitas', 'Joaquín V. González', 'Nueva Esperanza', 'Lumbera', 'El Quebrachal', 'Apolinario Saravia']
    },
    'Entre Ríos': {
      Paraná: ['Paraná', 'Oro Verde', 'San Benito', 'Colonia Avellaneda', 'Crespo', 'Viale', 'Tabossi', 'Seguí', 'Hasenkamp', 'Piedras Blancas'],
      Concordia: ['Concordia', 'Federación', 'Villa Adela', 'La Criolla', 'Colonia Yeruá', 'Calabacilla', 'Puerto Yeruá'],
      Gualeguaychú: ['Gualeguaychú', 'Irazusta', 'Aldea San Juan', 'Enrique Carbó', 'Larroque', 'Pueblo General Belgrano', 'Victoria', 'Ibicuy'],
      'Colón': ['Colón', 'San José', 'Uruguay', 'Villa Elisa', 'Liebig', 'Pueblo Cazes']
    },
    Corrientes: {
      'Corrientes Capital': ['Corrientes', 'Riachuelo', 'Santa Ana de los Guácaras', 'San Cosme', 'San Cayetano', 'El Sombrero', 'Herlitzka', 'Ombú'],
      'Goya': ['Goya', 'Esquina', 'Carlos Pellegrini', 'Lavalle', 'Valentín (parte)', 'Colonia Carolina'],
      'Paso de los Libres': ['Paso de los Libres', 'Bompland', 'La Cruz', 'Yapeyú', 'Alvear', 'San Martín'],
      'Mercedes': ['Mercedes', 'Curuzú Cuatiá', 'Monte Caseros', 'Mocoretá', 'Labougle', 'Pueblo Libertador'],
      'Santo Tomé': ['Santo Tomé', 'Virasoro', 'Garaví', 'Apeadero', 'Tres Cerros']
    },
    Chaco: {
      'Resistencia': ['Resistencia', 'Barranqueras', 'Fontana', 'Puerto Vilelas', 'Villa Ángela', 'La Leonesa', 'Margarita Belén', 'Colonia Benítez', 'Basail', 'Makallé'],
      'Sáenz Peña': ['Presidencia Roque Sáenz Peña', 'Avia Terai', 'Campo Largo', 'Coronel Du Graty', 'La Escondida', 'La Verde', 'Mesón de Fierro', 'Napalpí', 'Tres Isletas'],
      'Villa Ángela': ['Villa Ángela', 'Santa Sylvina', 'Charata', 'Las Breñas', 'General Pinedo', 'Hermoso Campo', 'Itín', 'La Clotilde', 'Pampa del Infierno'],
      'Capitán Solari': ['Capitán Solari', 'Taco Pozo', 'Almirante Brown', 'El Sauzalito', 'Misión Nueva Pompeya', 'Wichí']
    },
    Misiones: {
      Posadas: ['Posadas', 'Garupá', 'Candelaria', 'Santa Ana', 'Fachinal', 'Cerro Corá', 'Jardín América', 'Oberá', 'San Ignacio', 'Loreto'],
      Oberá: ['Oberá', 'Campo Grande', 'Campo Viera', 'Panambí', 'Colonia Aurora', 'Almafuerte', 'Los Helechos', 'Caá Yarí'],
      'Puerto Iguazú': ['Puerto Iguazú', 'Wanda', 'Cataratas del Iguazú', 'Esperanza', 'Libertad', 'Puerto Libertad'],
      'San Pedro': ['San Pedro', 'Pozo Azul', 'Santa Rosa', 'San Vicente', 'El Soberbio', 'Dos Arroyos', 'Fracrán']
    },
    Neuquén: {
      'Neuquén Capital': ['Neuquén', 'Plottier', 'Cipolletti (parte)', 'Centenario', 'Senillosa', 'Vista Alegre', 'El Chocón'],
      'San Martín de los Andes': ['San Martín de los Andes', 'Junín de los Andes', 'Aluminé', 'Villa La Angostura', 'Villa Traful'],
      'Zapala': ['Zapala', 'Mariano Moreno', 'Las Lajas', 'Cutral Có', 'Plaza Huincul', 'Aluminé', 'Loncopué', 'Paso Aguerre'],
      'Chos Malal': ['Chos Malal', 'Andacollo', 'Buta Ranquil', 'El Huecú', 'Villa Curí Leuvén', 'Paso de San Ignacio']
    },
    'Río Negro': {
      'San Carlos de Bariloche': ['San Carlos de Bariloche', 'Villa La Angostura (parte)', 'Dina Huapi', 'El Bolsón', 'El Manso', 'Mallín Ahogado', 'Colonia Suiza', 'Puerto Blest'],
      'General Roca': ['General Roca', 'Cipolletti', 'Allen', 'Villa Regina', 'Cervantes', 'Contralmirante Cordero', 'Stefenelli', 'Ceferino Namuncurá', 'Las Perlas'],
      'Viedma': ['Viedma', 'Carmen de Patagones', 'San Javier', 'El Cóndor', 'El Juncal', 'Guardia Mitre', 'Pozo Salado', 'La Lobería', 'San Antonio Oeste'],
      'El Bolsón': ['El Bolsón', 'Lago Puelo', 'Epuyén', 'Cholila', 'El Hoyo', 'Parque Nacional Los Alerces']
    },
    'San Juan': {
      'San Juan Capital': ['San Juan', 'Rawson', 'Rivadavia', 'Santa Lucía', 'Chimbas', 'Pocito', 'Capital (Nueve de Julio)', 'San Martín'],
      'Calingasta': ['Calingasta', 'Barreal', 'Tamberías', 'Paso del Paramillo'],
      'Jáchal': ['San José de Jáchal', 'Niquivil', 'Tamberías', 'Paso de Otarola', 'Huaco'],
      'Valle Fértil': ['Villa San Agustín', 'Astica', 'Baldecito', 'Los Médanos'],
      'Iglesia': ['Iglesia', 'Las Flores', 'Pismanta', 'Angualasto', 'Tudcum']
    },
    'San Luis': {
      'San Luis Capital': ['San Luis', 'Juana Koslay', 'La Punta', 'El Volcán', 'Aviador Origone', 'Alto Pelado', 'Balde de Escudero', 'Las Chacras', 'Villa de la Quebrada', 'San Gerónimo'],
      'Villa Mercedes': ['Villa Mercedes', 'Justo Daract', 'Unión', 'Tilisarao', 'Concarán', 'Nueva Galia', 'Anchorena', 'La Toma', 'Nogolí', 'Quines'],
      'Merlo': ['Merlo', 'Papagayos', 'Corte Viejo', 'Villa de Praga', 'Los Molles', 'Paso del Rey', 'Villa Larca', 'Cortaderas', 'El Trapiche']
    },
    'La Rioja': {
      'La Rioja Capital': ['La Rioja', 'Anillaco', 'Chuquis', 'Montalvo', 'Sanagasta', 'Villa Unión', 'Olta'],
      'Chilecito': ['Chilecito', 'Los Sarmientos', 'Sañogasta', 'Malligasta', 'La Puntilla', 'San Miguel'],
      'Famatina': ['Famatina', 'Pituil', 'Plaza Vieja', 'Campanas'],
      'Aimogasta': ['Aimogasta', 'Macha', 'Salicas', 'Villa Mazán', 'La Falda']
    },
    'Santiago del Estero': {
      'Santiago del Estero Capital': ['Santiago del Estero', 'La Banda', 'Termas de Río Hondo', 'Beltrán', 'Clodomira', 'Macro', 'Lugones', 'Villa Zanjón', 'Arraga', 'Añatuya'],
      'La Banda': ['La Banda', 'Termas de Río Hondo', 'Villa Río Hondo', 'Los Núñez', 'Abra Grande', 'Tramo 20'],
      'Termas de Río Hondo': ['Termas de Río Hondo', 'Villa Río Hondo', 'Chauchillas', 'Los Encantos'],
      'Añatuya': ['Añatuya', 'Tintina', 'Sumampa', 'Estación Arraga', 'Herrera', 'Las Tijeras', 'Suncho Corral', 'Quimilí']
    },
    "Santa Cruz": {
      'Río Gallegos': ['Río Gallegos', 'Puerto Santa Cruz', 'Piedrabuena', 'Gobernador Gregores', 'El Chaltén', 'Comandante Luis Piedrabuena', 'Cañadón Seco'],
      'Caleta Olivia': ['Caleta Olivia', 'Pico Truncado', 'Puerto Deseado', 'Las Heras', 'Koluel Kayke', 'Los Antiguos', 'Perito Moreno', 'Gobernador Gregores'],
      El Calafate: ['El Calafate', 'Río Turbio', 'Puerto Natales (vecino Chile)', 'El Chaltén', 'Lago Argentino', 'Cerro Fitz Roy'],
      'Puerto San Julián': ['Puerto San Julián', 'Cabo Blanco', 'Gobernador Gregores', 'Estancia La Argentina']
    },
    'Tierra del Fuego': {
      'Río Grande': ['Río Grande', 'Tolhuin', 'San Sebastián', 'Cabo San Pablo', 'Estancia Viamonte', 'Almanza'],
      Ushuaia: ['Ushuaia', 'Puerto Williams (vecino Chile)', 'Tolhuin', 'Río Pipo', 'Cerro Alarkén', 'Lago Escondido', 'Lago Fagnano']
    },
    'La Pampa': {
      'Santa Rosa': ['Santa Rosa', 'Toay', 'Anguil', 'Caleufú', 'Colonia Barón', 'Coronel Hilario Lagos', 'Alpachiri', 'General Pico', 'Intendente Alvear', 'Realicó'],
      'General Pico': ['General Pico', 'Intendente Alvear', 'Realicó', 'Colonia Barón', 'Quemú Quemú', 'Dorila', 'Trenel', 'Falucho'],
      'General Acha': ['General Acha', 'Chacharramendi', 'La Gloria', 'Limay Mahuida', 'Utracán', 'Victorica'],
      'Victorica': ['Victorica', 'Telén', 'La Humada', 'Medanos', 'Chical Co']
    },
    Chubut: {
      Comodoro Rivadavia: ['Comodoro Rivadavia', 'Rada Tilly', 'Sarmiento', 'Río Mayo', 'José de San Martín', 'Alto Río Senguer', 'Km 5', 'Km 11', 'Km 8', 'Caleta Córdova', 'General Mosconi', 'Campamento Central'],
      'Puerto Madryn': ['Puerto Madryn', 'Trelew', 'Rawson', 'Gaiman', 'Dolavon', 'Puerto Pirámides', '28 de Julio', 'Boca de Zanja'],
      Esquel: ['Esquel', 'Trevelin', 'Corcovado', 'Tecka', 'Lago Rosario', 'Los Cipreses', 'Parque Nacional Los Alerces'],
      Trelew: ['Trelew', 'Rawson', 'Gaiman', 'Dolavon', 'Puerto Madryn (parte)', '28 de Julio', 'Boca de Zanja']
    },
    'Formosa': {
      'Formosa Capital': ['Formosa', 'Clorinda', 'Puerto Pilcomayo', 'Riacho He-Hé', 'Lanteri', 'Gran Guardia', 'Mariano Boedo', 'San Hilario', 'Herradura'],
      'Clorinda': ['Clorinda', 'Puerto Pilcomayo', 'Riacho He-Hé', 'Siete Palmas', 'Laguna Blanca', 'Palo Santo'],
      'Las Lomitas': ['Las Lomitas', 'Ingeniero Juárez', 'Ibarreta', 'Estanislao del Campo', 'General Mosconi', 'Pozo del Tigre', 'El Pato', 'Laguna Yema']
    },
    'Jujuy': {
      'San Salvador de Jujuy': ['San Salvador de Jujuy', 'Palpalá', 'Perico', 'Monterrico', 'San Antonio', 'Reyes', 'Yala', 'La Almona', 'Alto Comedero'],
      'La Quiaca': ['La Quiaca', 'Abra Pampa', 'Puesto del Marqués', 'Yavi', 'Siberia', 'Catua'],
      'Humahuaca': ['Humahuaca', 'Tilcara', 'Purmamarca', 'Maimará', 'Uquía', 'Tumbaya', 'Purchena'],
      'Libertador General San Martín': ['Libertador General San Martín', 'Caimancito', 'Yuto', 'El Piquete', 'Piedras Negras', 'Villa Maior']
    },
    Catamarca: {
      'San Fernando del Valle de Catamarca': ['San Fernando del Valle', 'El Rodeo', 'Huillapima', 'Capayán', 'Valle Viejo', 'Chumbicha', 'Mutquín', 'Pomán', 'Miraflores', 'Bañado'],
      'Santa María': ['Santa María', 'San José', 'Famatanca', 'La Loma', 'El Desmonte', 'Caspinchango'],
      'Belén': ['Belén', 'Puerta de San José', 'Londres', 'La Ciénaga', 'Farallón Negro'],
      'Tinogasta': ['Tinogasta', 'Fiambalá', 'La Puntilla', 'El Eje', 'Costa de Reyes', 'La Calera'],
      'Andalgalá': ['Andalgalá', 'Aconquija', 'El Potrero', 'La Aguada']
    }
  },

  // ═══════════════════════════════════════════════
  // PERÚ — 24 departamentos
  // ═══════════════════════════════════════════════
  Perú: {
    Lima: {
      'Lima Metropolitana': ['Miraflores', 'San Isidro', 'Barranco', 'San Borja', 'La Molina', 'Santiago de Surco', 'Jesús María', 'Pueblo Libre', 'San Miguel', 'Magdalena del Mar', 'Lince', 'San Juan de Miraflores', 'Villa María del Triunfo', 'Villa El Salvador', 'San Juan de Lurigancho', 'Comas', 'Los Olivos', 'Puente Piedra', 'Carabayllo', 'Lurín', 'Pachacámac', 'Cieneguilla', 'Chorrillos', 'Rímac', 'El Agustino', 'Ate', 'Santa Anita', 'Lurigancho', 'Independencia', 'San Martín de Porres', 'Callao', 'Bellavista', 'Carmen de la Legua', 'La Perla', 'La Punta', 'Ventanilla', 'Mi Perú'],
      'Lima Provincias': ['Canta', 'Huarochirí', 'Huaral', 'Cañete', 'Barranca', 'Oyón', 'Yauyos', 'Cajatambo', 'Canta', 'Santa Cruz de Flores', 'Mala', 'Chilca', 'Asia']
    },
    Callao: {
      Callao: ['Callao', 'Bellavista', 'Carmen de la Legua', 'La Perla', 'La Punta', 'Ventanilla', 'Mi Perú', 'Bocanegra', 'Chacarita', 'Puerto del Callao']
    },
    Arequipa: {
      'Arequipa Centro': ['Arequipa', 'Cayma', 'Cerro Colorado', 'Yanahuara', 'Sachaca', 'Tiabaya', 'José Luis Bustamante y Rivero', 'Mariano Melgar', 'Miraflores', 'Paucarpata', 'Sabandía', 'Socabaya', 'Characato', 'Uchumayo', 'Huachipa'],
      'Caylloma': ['Caylloma', 'Chivay', 'Maca', 'Coporaque', 'Ichupampa', 'Lari', 'Madrigal', 'Sibayo', 'Tuti', 'Yanque'],
      'Caravelí': ['Caravelí', 'Acarí', 'Atico', 'Bella Unión', 'Cháparra', 'Huanuhuanu', 'Jaquí', 'Lomas', 'Quicacha'],
      'Islay': ['Islay', 'Mollendo', 'Mejía', 'Punta de Bombón', 'Cocachacra', 'Deán Valdivia']
    },
    Cusco: {
      'Cusco Centro': ['Cusco', 'San Jerónimo', 'San Sebastián', 'Santiago', 'Wanchaq', 'Wimpyllay', 'Poroy', 'Ccorca', 'Saylla', 'Oropesa', 'Lucre', 'Pisac', 'Urubamba', 'Ollantaytambo', 'Yucay', 'Chinchero', 'Maras', 'Moray', 'Calca', 'Lares'],
      'Urubamba': ['Urubamba', 'Ollantaytambo', 'Yucay', 'Chinchero', 'Maras', 'Moray', 'Huayllabamba', 'Machu Picchu Pueblo'],
      La Convención: ['Quillabamba', 'Santa Ana', 'Echarati', 'Huayopata', 'Maranura', 'Occobamba', 'Vilcabamba', 'Kimbiri', 'Pichari'],
      'Espinar': ['Espinar', 'Yauri', 'Coporaque', 'Condoroma', 'Pallpata', 'Pichigua', 'Suyckutambo'],
      'Canchis': ['Sicuani', 'San Pablo', 'San Pedro', 'Tinta', 'Checacupe', 'Combapata', 'Marangani', 'Langui', 'Layo'],
      'Anta': ['Anta', 'Huarocondo', 'Limatambo', 'Mollepata', 'Pucyura', 'Zurite', 'Cachimayo', 'Chinchaypujio']
    },
    Piura: {
      'Piura Centro': ['Piura', 'Castilla', 'Catacaos', 'Veintiséis de Octubre', 'La Unión', 'El Tallán', 'Cura Mori', 'Tambogrande', 'Las Lomas', 'Chulucanas', 'Morropón', 'Salitral', 'Buenos Aires', 'La Matanza'],
      'Sullana': ['Sullana', 'Marcavelica', 'Querecotillo', 'Bellavista', 'Ignacio Escudero', 'Lancones', 'Miguel Checa'],
      'Talara': ['Talara', 'Pariñas', 'El Alto', 'La Brea', 'Lobitos', 'Los Órganos', 'Máncora', 'El Ñuro', 'Vichayal'],
      'Paita': ['Paita', 'Amotape', 'Colán', 'La Huaca', 'Tamarindo', 'Vichayal', 'Yacila'],
      'Sechura': ['Sechura', 'Bellavista de la Unión', 'Bernal', 'Cristo Nos Valga', 'Rinconada Llicuar', 'Vice']
    },
    'La Libertad': {
      Trujillo: ['Trujillo', 'Víctor Larco Herrera', 'Huanchaco', 'La Esperanza', 'El Porvenir', 'Florencia de Mora', 'Moche', 'Salaverry', 'Laredo', 'Simbal', 'Poroto'],
      'San Pedro de Lloc': ['San Pedro de Lloc', 'Pacasmayo', 'Guadalupe', 'Jequetepeque', 'Pueblo Nuevo', 'Chepén', 'Pacanga', 'Chocope', 'Paiján', 'Rázuri'],
      'Huamachuco': ['Huamachuco', 'Santiago de Chuco', 'Quiruvilca', 'Marcabal', 'Sanagorán', 'Sarín', 'Cochabamba', 'Curgos', 'Mollebamba'],
      'Cajabamba': ['Cajabamba', 'Cachachi', 'Condebamba', 'Sitacocha'],
      'Bolívar': ['Bolívar', 'Bambamarca', 'Condormarca', 'Longotea', 'Ucuncha']
    },
    Cajamarca: {
      'Cajamarca Centro': ['Cajamarca', 'Baños del Inca', 'Cheta', 'Llacanora', 'Matara', 'Namora', 'San Juan', 'Jesús', 'Cachachi', 'Asunción', 'Magdalena', 'San Marcos', 'Celendín', 'Hualgayoc', 'Bambamarca', 'San Miguel', 'San Pablo', 'Contumazá'],
      'Chota': ['Chota', 'Anguía', 'Chalamarca', 'Cochabamba', 'Conchán', 'Huambos', 'Lajas', 'Llama', 'Miracosta', 'Paccha', 'Pión', 'Querocoto', 'San Juan de Licupis', 'Tacabamba', 'Tocmoche'],
      'Jaén': ['Jaén', 'Bellavista', 'Chontali', 'Colasay', 'Huabal', 'Las Pirias', 'Pomahuaca', 'Pucará', 'Sallique', 'San Felipe', 'San José del Alto', 'Santa Rosa'],
      'Cutervo': ['Cutervo', 'Callayuc', 'Choros', 'Cujillo', 'La Ramada', 'Pimpingos', 'Querocoto', 'San Andrés de Cutervo', 'San Juan de Cutervo', 'San Luis de Lucma', 'Santa Cruz', 'Santo Domingo de la Capilla', 'Socota', 'Toribio Casanova'],
      'Santa Cruz': ['Santa Cruz', 'Catache', 'La Florida', 'Ninabamba', 'Pulán', 'Saucepampa', 'Sexi', 'Uticyacu', 'Yauyucán']
    },
    Junín: {
      Huancayo: ['Huancayo', 'El Tambo', 'Chilca', 'Pilcomayo', 'San Agustín', 'Sicaya', 'Chupaca', 'Concepción', 'Orcotuna', 'Sapallanga', 'Huayucachi', 'Viques', 'Cajas', 'Chambará', 'Ahuac', 'Colca', 'Pucará', 'Marcavalle'],
      'Tarma': ['Tarma', 'Acobamba', 'Huaricolca', 'Huasahuasi', 'La Unión', 'Palca', 'Palcamayo', 'San Pedro de Cajas', 'Tapo', 'Yauli'],
      'La Merced': ['La Merced', 'Chanchamayo', 'Perené', 'Pichanaqui', 'San Luis de Shuaro', 'San Ramón', 'Vitoc', 'Río Seco'],
      'Jauja': ['Jauja', 'Acolla', 'Apata', 'Ataura', 'Canchayllo', 'Curicaca', 'El Mantaro', 'Huamalí', 'Huancaní', 'Leonor Ordóñez', 'Llocllapampa', 'Marco', 'Masma', 'Masma Chicche', 'Molinos', 'Monobamba', 'Muqui', 'Muquiyauyo', 'Paca', 'Paccha', 'Pancán', 'Parco', 'Pomacancha', 'Ricrán', 'San Lorenzo', 'San Pedro de Chunán', 'Sausa', 'Sincos', 'Tunanmarca', 'Yauli', 'Yauyos'],
      'Satipo': ['Satipo', 'Coviriali', 'Llaylla', 'Mazamari', 'Pampa Hermosa', 'Pangoa', 'Río Negro', 'Río Tambo', 'San Martín de Pangoa', 'San Miguel de Eneñas']
    },
    Lambayeque: {
      Chiclayo: ['Chiclayo', 'La Victoria', 'Lambayeque', 'José Leonardo Ortiz', 'Pimentel', 'San José', 'Monsefú', 'Reque', 'Santa Rosa', 'Eten', 'Pueblo Nuevo'],
      'Ferreñafe': ['Ferreñafe', 'Cañaris', 'Incahuasi', 'Manuel Antonio Mesones Muro', 'Pitipo', 'Pueblo Nuevo'],
      'Lambayeque': ['Lambayeque', 'Chóchope', 'Íllimo', 'Jayanca', 'Mochumí', 'Mórrope', 'Motupe', 'Olmos', 'Pacora', 'Salas', 'San José', 'Túcume']
    },
    Puno: {
      'Puno Centro': ['Puno', 'Ácora', 'Amantaní', 'Atuncolla', 'Capachica', 'Chucuito', 'Coata', 'Huata', 'Mañazo', 'Paucarcolla', 'Pichacani', 'Platería', 'San Antonio', 'Tiquillaca', 'Vilque'],
      'Juliaca': ['Juliaca', 'Caracoto', 'Cabanillas', 'Lampa', 'Cabana', 'Cabanilla', 'Achaya', 'Caminaca', 'Calapuja', 'Nicasio', 'Taraco', 'Juliaca Centro'],
      'Azángaro': ['Azángaro', 'Achaya', 'Arapa', 'Asillo', 'Caminaca', 'Chupa', 'José Domingo Choquehuanca', 'Muñani', 'Potoni', 'Samán', 'San Antón', 'San José', 'San Juan de Salinas', 'Santiago de Pupuja', 'Tirapata'],
      'Ilave': ['Ilave', 'Juli', 'Pomata', 'Yunguyo', 'Desaguadero', 'Huacullani', 'Kelluyo', 'Pisacoma', 'Santa Rosa', 'Conduriri', 'Ácora (parte)'],
      'Putina': ['Putina', 'Ananea', 'Pedro Vilca Apaza', 'Quilcapuncu', 'Sina', 'Cuyocuyo', 'Tiquillaca'],
      'Sandia': ['Sandia', 'Cuyocuyo', 'Limbani', 'Patambuco', 'Phara', 'Quiaca', 'San Juan del Oro', 'Yanahuaya', 'Alto Inambari', 'San Pedro de Putina Punco'],
      'Lago Titicaca': ['Puno', 'Juliaca', 'Ilave', 'Yunguyo', 'Capachica', 'Amantaní', 'Taquile', 'Chucuito', 'Juli', 'Pomata', 'Zepita']
    },
    Áncash: {
      Huaraz: ['Huaraz', 'Carhuaz', 'Casma', 'Huarmey', 'Chacas', 'San Luis', 'Recuay', 'Aija', 'Antonio Raymondi', 'La Merced', 'Cátac', 'Mancos', 'Yungay', 'Caraz', 'Cabana', 'Huaylas', 'Corongo', 'Pomabamba', 'Mariscal Luzuriaga'],
      Chimbote: ['Chimbote', 'Nuevo Chimbote', 'Coishco', 'Santa', 'Macate', 'Cáceres del Perú', 'Moro', 'Nepeña', 'Samaco', 'San Jacinto'],
      'Santa': ['Santa', 'Chimbote (parte)', 'Moro', 'Nepeña', 'Cáceres del Perú', 'Macate', 'Samaco'],
      'Huari': ['Huari', 'Anra', 'Cajay', 'Chavín de Huántar', 'Huacachi', 'Huachis', 'Huántar', 'Masín', 'Paucas', 'Ponto', 'Rahuapampa', 'Rapayan', 'San Marcos', 'San Pedro de Chaná', 'Uco']
    },
    Ica: {
      'Ica Centro': ['Ica', 'Subtanjalla', 'Tate', 'Los Aquijes', 'Pueblo Nuevo', 'La Tinguiña', 'Parcona', 'Yauca del Rosario', 'San José de los Molinos', 'San Juan Bautista', 'Pachacútec', 'Ocucaje'],
      'Chincha': ['Chincha Alta', 'Alto Larán', 'Chavín', 'Chincha Baja', 'El Carmen', 'Grocio Prado', 'Pueblo Nuevo', 'San Juan de Yanac', 'San Pedro de Huacarpana', 'Sunampe', 'Tambo de Mora'],
      'Pisco': ['Pisco', 'San Andrés', 'San Clemente', 'Tupac Amaru Inca', 'Paracas', 'Huáncano', 'Humay', 'Independencia', 'Villacuri'],
      'Nazca': ['Nazca', 'Changuillo', 'El Ingenio', 'Marcona', 'Vista Alegre', 'Bella Esperanza', 'San Javier']
    },
    Huánuco: {
      'Huánuco Centro': ['Huánuco', 'Amarilis', 'Churubamba', 'Margos', 'Pillco Marca', 'Quisqui', 'San Francisco de Cayrán', 'San Pedro de Chaulán', 'Santa María del Valle', 'Yarumayo'],
      'Tingo María': ['Tingo María', 'Castillo Grande', 'Pumahuasi', 'Rupa Rupa', 'Santo Domingo de Anda', 'Mariano Dámaso Beraún', 'José Crespo y Castillo', 'Luyando', 'Hermilio Valdizán'],
      'Cerro de Pasco': ['Cerro de Pasco (parte)', 'Chaupimarca', 'Huayllay', 'Ninacaca', 'Pallanchacra', 'Paucartambo', 'San Francisco de Asís de Yarusyacán', 'Simón Bolívar', 'Ticlacayán', 'Tinyahuarco', 'Vicco', 'Yanacocha'],
      'Huamalíes': ['Llata', 'Arancay', 'Chavín de Pariarca', 'Jacas Grande', 'Jircán', 'Miraflores', 'Monzón', 'Punchao', 'Puños', 'Singa', 'Tantamayo'],
      'Leoncio Prado': ['Tingo María (parte)', 'Castillo Grande', 'José Crespo y Castillo', 'Luyando', 'Mariano Dámaso Beraún', 'Pucayacu', 'Rupa Rupa', 'Santo Domingo de Anda']
    },
    'San Martín': {
      'Moyobamba': ['Moyobamba', 'Calzada', 'Habana', 'Jepelacio', 'Soritor', 'Yantalo', 'Pósic', 'San Martín de Alao'],
      Tarapoto: ['Tarapoto', 'Morales', 'La Banda de Shilcayo', 'Cacatachi', 'Pilluana', 'San Antonio', 'San Hilarión', 'Shapaja', 'Juan Guerra', 'Saposoa'],
      'Juanjuí': ['Juanjuí', 'Campanilla', 'Huicungo', 'Pachiza', 'Pajarillo', 'Sisa', 'Sacanche', 'Tocache', 'Uchiza', 'Pólvora', 'Shunte'],
      'Lamas': ['Lamas', 'Alberto Leveau', 'Caynarachi', 'Cuñumbuqui', 'Pinto Recodo', 'Rumisapa', 'San Roque de Cumbaza', 'Shanao', 'Tabalosos', 'Zapatero'],
      'Tocache': ['Tocache', 'Nuevo Progreso', 'Pólvora', 'Shunte', 'Uchiza']
    },
    Ayacucho: {
      'Ayacucho Centro': ['Ayacucho', 'San Juan Bautista', 'Carmen Alto', 'Los Olivos', 'Jesús Nazareno', 'Chacolla', 'Huanta', 'La Mar', 'Luricocha', 'Santillana', 'Sivia', 'Anco'],
      'Huanta': ['Huanta', 'Luricocha', 'Santillana', 'Sivia', 'Ayahuanco', 'Huamanguilla', 'Iguain', 'Llochegua', 'Uchuraccay'],
      'La Mar': ['La Mar', 'Anco', 'Ayna', 'Chilcas', 'Chungui', 'Luis Carranza', 'Samugari', 'San Miguel', 'Santa Rosa', 'Tambo'],
      'Lucanas': ['Lucanas', 'Aucara', 'Cabana', 'Carmen Salcedo', 'Chaviña', 'Chipao', 'Huac-Huas', 'Laramate', 'Leoncio Prado', 'Llauta', 'Lucanas', 'Ocaña', 'Otoca', 'Puquio', 'San Pedro', 'San Cristóbal', 'San Juan', 'San Pedro de Palco', 'Sancos', 'Santa Ana de Huaycahuacho', 'Santa Lucía'],
      'Parinacochas': ['Coracora', 'Chumpi', 'Coronel Castañeda', 'Pacapausa', 'Pullo', 'Puyusca', 'San Francisco de Ravacayco', 'Upahuacho']
    },
    Ucayali: {
      'Pucallpa': ['Pucallpa', 'Yarinacocha', 'Callería', 'Manantay', 'Campo Verde', 'Nueva Requena', 'Aguaytía', 'Curimaná', 'Irazola', 'Padre Abad', 'San Alejandro', 'Nuevo Mariscal'],
      'Aguaytía': ['Aguaytía', 'Padre Abad', 'Irazola', 'Curimaná', 'San Alejandro', 'Nuevo Mariscal'],
      'Atalaya': ['Atalaya', 'Raymondi', 'Sepahua', 'Tahuanía', 'Yurúa']
    },
    Tacna: {
      'Tacna Centro': ['Tacna', 'Alto de la Alianza', 'Ciudad Nueva', 'Pocollay', 'Calana', 'Sama', 'Pachía', 'Palca', 'Ite', 'La Yarada-Los Palos'],
      'Tarata': ['Tarata', 'Héroes Albarracín', 'Estique', 'Estique-Pampa', 'Sitajara', 'Susapaya', 'Tarucachi', 'Ticaco'],
      'Jorge Basadre': ['Locumba', 'Ite', 'Ilabaya'],
      'Candarave': ['Candarave', 'Cairani', 'Camilaca', 'Curibaya', 'Huanuara', 'Quilahuani']
    },
    Pasco: {
      'Cerro de Pasco': ['Cerro de Pasco', 'Chaupimarca', 'Huayllay', 'Ninacaca', 'Pallanchacra', 'Paucartambo', 'San Francisco de Asís de Yarusyacán', 'Simón Bolívar', 'Ticlacayán', 'Tinyahuarco', 'Vicco', 'Yanacocha'],
      'Oxapampa': ['Oxapampa', 'Chontabamba', 'Huancabamba', 'Palcazú', 'Pozuzo', 'Puerto Bermúdez', 'Villa Rica', 'Constitución']
    },
    Moquegua: {
      'Moquegua Centro': ['Moquegua', 'Samegua', 'Ilo', 'Pacocha', 'El Algarrobal', 'Torata', 'Carumas', 'Cuchumbaya', 'San Cristóbal', 'Ichupampa'],
      'Ilo': ['Ilo', 'Pacocha', 'El Algarrobal', 'La Pampa', 'Caleta de Ilo', 'Yarada'],
      'Mariscal Nieto': ['Moquegua', 'Carumas', 'Cuchumbaya', 'San Cristóbal', 'Samegua', 'Torata']
    },
    Amazonas: {
      Chachapoyas: ['Chachapoyas', 'Asunción', 'Balsas', 'Cheto', 'Chiliquín', 'Chuquibamba', 'Granada', 'Huancas', 'La Jalca', 'Leimebamba', 'Levanto', 'Magdalena', 'Mariscal Castilla', 'Molinopampa', 'Montevideo', 'Olleros', 'Quinjalca', 'San Francisco de Daguas', 'San Isidro de Maino', 'Soloco', 'Sonche'],
      'Bagua': ['Bagua', 'Aramango', 'Copallín', 'El Parco', 'Imaza', 'La Peca'],
      'Luya': ['Luya', 'Camporredondo', 'Cocabamba', 'Colcamar', 'Conila', 'Inguilpata', 'Lámud', 'Longuita', 'Lonya Chico', 'Luya Viejo', 'María', 'Ocalli', 'Ocumal', 'Pisuquía', 'Providencia', 'San Cristóbal', 'San Francisco de Yeso', 'San Jerónimo', 'San Juan de Lopecancha', 'Santa Catalina', 'Santo Tomás', 'Tingo', 'Trita'],
      'Rodríguez de Mendoza': ['Rodríguez de Mendoza', 'Chirimoto', 'Cochamal', 'Huambo', 'Limabamba', 'Longar', 'Mariscal Benavides', 'Milpuc', 'Omia', 'San Nicolás', 'Santa Rosa', 'Totora', 'Vista Alegre'],
      'Condorcanqui': ['Santa María de Nieva', 'El Cenepa', 'Río Santiago']
    },
    Huancavelica: {
      'Huancavelica Centro': ['Huancavelica', 'Acobambilla', 'Acoria', 'Conayca', 'Cuenca', 'Huachocolpa', 'Huayllahuara', 'Izcuchaca', 'Laria', 'Manta', 'Mariscal Cáceres', 'Moya', 'Nuevo Occoro', 'Palca', 'Pilchaca', 'Vilca', 'Yauli', 'Ascensión', 'Yanaccollpa'],
      'Angaraes': ['Angaraes', 'Anchonga', 'Callanmarca', 'Ccochaccasa', 'Chincho', 'Congalla', 'Huanca-Huanca', 'Huayllay Grande', 'Julcamarca', 'Lircay', 'San Antonio de Antaparco', 'Santo Tomás de Pata', 'Secclla'],
      'Castrovirreyna': ['Castrovirreyna', 'Arma', 'Aurahuá', 'Capillas', 'Chupamarca', 'Cocas', 'Huachos', 'Huamatambo', 'Mollepampa', 'San Juan', 'Santa Ana', 'Tantara', 'Ticrapo'],
      'Tayacaja': ['Pampas', 'Acostambo', 'Acraquia', 'Ahuaycha', 'Colcabamba', 'Daniel Hernández', 'Huachocolpa (parte)', 'Huaribamba', 'Ñahuimpuquio', 'Pazos', 'Quishuar', 'Salcabamba', 'Salcahuasi', 'San Marcos de Rocchac', 'Surcubamba', 'Tintay Puncu', 'Quichuas', 'Santiago de Tuna']
    },
    Apurímac: {
      Abancay: ['Abancay', 'Circa', 'Curahuasi', 'Huanipaca', 'Lambrama', 'Pichirhua', 'San Pedro de Cachora', 'Tamburco', 'Chacoche'],
      Andahuaylas: ['Andahuaylas', 'Andarapa', 'Chiara', 'Huancarama', 'Huancaray', 'Huayana', 'José María Arguedas', 'Kaquiabamba', 'Kishuara', 'Pacobamba', 'Pacucha', 'Pampachiri', 'Pomacocha', 'San Antonio de Cachi', 'San Jerónimo', 'San Miguel de Chaccrampa', 'Santa María de Chicmo', 'Talavera', 'Tumay Huaraca', 'Turpo'],
      'Antabamba': ['Antabamba', 'El Oro', 'Huaquirca', 'Juan Espinoza Medrano', 'Oropesa', 'Pachaconas', 'Sabaino'],
      'Chincheros': ['Chincheros', 'Anco-Huallo', 'Cocharcas', 'Huaccana', 'Los Chankas', 'Ongoy', 'Ocobamba', 'Ranracancha', 'Rocchacc', 'Uranmarca', 'Uripa'],
      'Grau': ['Grau', 'Chuquibambilla', 'Curpahuasi', 'Gamarra', 'Huayllati', 'Mamara', 'Micaela Bastidas', 'Pataypampa', 'Progreso', 'San Antonio', 'Santa Rosa', 'Turpay', 'Vilcabamba', 'Virundo']
    },
    'Madre de Dios': {
      'Puerto Maldonado': ['Puerto Maldonado', 'Tambopata', 'Laberinto', 'Las Piedras', 'Tahuamanu', 'Iñapari', 'Iberia', 'Mavila', 'Alto Tambopata', 'Bajo Tambopata'],
      'Tahuamanu': ['Tahuamanu', 'Iñapari', 'Iberia', 'Mavila'],
      'Manu': ['Manu', 'Fitzcarrald', 'Madre de Dios', 'Huepetuhe', 'Mazuko']
    },
    Tumbes: {
      'Tumbes Centro': ['Tumbes', 'Corrales', 'La Cruz', 'Pampas de Hospital', 'San Jacinto', 'San Juan de la Virgen', 'Nuevo Tumbes', 'Andrés Araujo'],
      'Zarumilla': ['Zarumilla', 'Aguas Verdes', 'Papayal', 'Matapalo'],
      'Contralmirante Villar': ['Zorritos', 'Casitas', 'Canoas de Punta Sal', 'Cancas']
    },
    Loreto: {
      Iquitos: ['Iquitos', 'San Juan Bautista', 'Belén', 'Punchana', 'Indiana', 'Mazán', 'Napo', 'Putumayo', 'Torres Causana', 'Alto Nanay', 'Fernando Lores', 'Las Amazonas'],
      'Yurimaguas': ['Yurimaguas', 'Alto Amazonas', 'Balsapuerto', 'Jeberos', 'Lagunas', 'Teniente César López Rojas', 'Yurimaguas Centro'],
      'Contamana': ['Contamana', 'Inahuaya', 'Padre Márquez', 'Pampa Hermosa', 'Sarayacu', 'Vargas Guerra', 'Ucayali (parte)'],
      'Nauta': ['Nauta', 'Parinari', 'Tigre', 'Trompeteros', 'Urarinas']
    }
  }
};

// ──────────────────────────────────────────────
// FUNCIONES DE CASCADA GEOGRÁFICA
// ──────────────────────────────────────────────

/**
 * Carga el selector de regiones según el país seleccionado.
 * Usa size dinámico para mostrar múltiples opciones visibles.
 */
function cargarRegiones() {
  const pais = document.getElementById('taller-pais')?.value || '';
  const selRegion = document.getElementById('taller-region');
  const selCiudad = document.getElementById('taller-ciudad');
  const selComuna = document.getElementById('taller-comuna');
  if (!selRegion) return;
  selRegion.innerHTML = '<option value="">— Seleccionar región —</option>';
  selCiudad.innerHTML = '<option value="">— Seleccionar ciudad —</option>';
  selComuna.innerHTML = '<option value="">— Seleccionar comuna —</option>';
  if (!pais || !UBICACIONES[pais]) { selRegion.size = 1; return; }
  const regiones = Object.keys(UBICACIONES[pais]);
  regiones.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r; opt.textContent = r;
    selRegion.appendChild(opt);
  });
  selRegion.size = Math.min(regiones.length + 1, 15);
}

/**
 * Carga el selector de ciudades según la región seleccionada.
 */
function cargarCiudades() {
  const pais = document.getElementById('taller-pais')?.value || '';
  const region = document.getElementById('taller-region')?.value || '';
  const selCiudad = document.getElementById('taller-ciudad');
  const selComuna = document.getElementById('taller-comuna');
  if (!selCiudad) return;
  selCiudad.innerHTML = '<option value="">— Seleccionar ciudad —</option>';
  selComuna.innerHTML = '<option value="">— Seleccionar comuna —</option>';
  if (!pais || !region || !UBICACIONES[pais] || !UBICACIONES[pais][region]) { selCiudad.size = 1; return; }
  const ciudades = Object.keys(UBICACIONES[pais][region]);
  ciudades.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    selCiudad.appendChild(opt);
  });
  selCiudad.size = Math.min(ciudades.length + 1, 15);
}

/**
 * Carga el selector de comunas según la ciudad seleccionada.
 */
function cargarComunas() {
  const pais = document.getElementById('taller-pais')?.value || '';
  const region = document.getElementById('taller-region')?.value || '';
  const ciudad = document.getElementById('taller-ciudad')?.value || '';
  const selComuna = document.getElementById('taller-comuna');
  if (!selComuna) return;
  selComuna.innerHTML = '<option value="">— Seleccionar comuna —</option>';
  if (!pais || !region || !ciudad || !UBICACIONES[pais] || !UBICACIONES[pais][region] || !UBICACIONES[pais][region][ciudad]) { selComuna.size = 1; return; }
  const comunas = UBICACIONES[pais][region][ciudad];
  comunas.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    selComuna.appendChild(opt);
  });
  selComuna.size = Math.min(comunas.length + 1, 15);
}

function actualizarHeaderNombreFantasia() {
  const val = document.getElementById('taller-nombre-fantasia')?.value || 'MecánicaPro';
  const nomEl = document.getElementById('sidebar-taller-nombre');
  if (nomEl) nomEl.textContent = val || 'MecánicaPro';
}

function tallerCargarDatos() {
  const config = APP.lsGet('taller_config') || {};
  const s = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
  s('taller-nombre-fantasia', config.nombre_fantasia);
  s('taller-nombre-empresa', config.nombre_empresa);
  s('taller-rut', config.rut);
  s('taller-pais', config.pais || '');
  // Cargar cascada si hay país
  if (config.pais) {
    cargarRegiones();
    s('taller-region', config.region || '');
    if (config.region) {
      cargarCiudades();
      s('taller-ciudad', config.ciudad || '');
      if (config.ciudad) {
        cargarComunas();
        s('taller-comuna', config.comuna || '');
      }
    }
  }
  s('taller-telefono', config.telefono);
  s('taller-email', config.email || '');
  s('taller-link-agenda', config.link_agenda || '');
  s('taller-hora-inicio', config.hora_inicio || '09:00');
  s('taller-hora-fin', config.hora_fin || '18:00');
  s('taller-capacidad-maxima', config.capacidad_maxima ?? 8);
  s('taller-precio-minimo-hora', config.precio_minimo_hora ?? '');
  s('taller-descanso-inicio', config.descanso_inicio || '13:00');
  s('taller-descanso-fin', config.descanso_fin || '14:00');

  if (config.logo_base64) {
    const img = document.getElementById('taller-logo-img');
    const txt = document.getElementById('taller-logo-text');
    if (img) { img.src = config.logo_base64; img.style.display = 'block'; }
    if (txt) txt.style.display = 'none';
  }
}

function tallerCargarLogo() {
  const file = document.getElementById('taller-logo-upload')?.files?.[0];
  if (!file) return;
  if (file.size > 500000) { APP.toast.show('⚠️ Archivo muy grande (máximo 500KB).', 'warning'); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    const img = document.getElementById('taller-logo-img');
    const txt = document.getElementById('taller-logo-text');
    if (img) { img.src = base64; img.style.display = 'block'; }
    if (txt) txt.style.display = 'none';
    const config = APP.lsGet('taller_config') || {};
    config.logo_base64 = base64;
    APP.lsSet('taller_config', config);
    tallerActualizarHeader();
    APP.toast.show('Logo cargado.');
  };
  reader.readAsDataURL(file);
}

function tallerEliminarLogo() {
  const img = document.getElementById('taller-logo-img');
  const txt = document.getElementById('taller-logo-text');
  const up  = document.getElementById('taller-logo-upload');
  if (img) { img.src = ''; img.style.display = 'none'; }
  if (txt) txt.style.display = 'block';
  if (up) up.value = '';
  const config = APP.lsGet('taller_config') || {};
  config.logo_base64 = '';
  APP.lsSet('taller_config', config);
  tallerActualizarHeader();
  APP.toast.show('Logo eliminado.');
}

function tallerGuardarDatos() {
  const g = id => (document.getElementById(id)?.value || '').trim();
  const config = APP.lsGet('taller_config') || {};
  config.nombre_fantasia = g('taller-nombre-fantasia');
  config.nombre_empresa = g('taller-nombre-empresa');
  config.rut = g('taller-rut');
  config.pais = g('taller-pais');
  config.region = g('taller-region');
  config.ciudad = g('taller-ciudad');
  config.comuna = g('taller-comuna');
  config.telefono = g('taller-telefono');
  config.email = g('taller-email');
  config.link_agenda = g('taller-link-agenda');
  config.hora_inicio = g('taller-hora-inicio') || '09:00';
  config.hora_fin = g('taller-hora-fin') || '18:00';
  config.capacidad_maxima = parseFloat(g('taller-capacidad-maxima')) || 8;
  config.precio_minimo_hora = parseFloat(g('taller-precio-minimo-hora')) || 0;
  config.descanso_inicio = g('taller-descanso-inicio') || '13:00';
  config.descanso_fin = g('taller-descanso-fin') || '14:00';
  APP.lsSet('taller_config', config);

  // Sincronizar a mp_taller_config (compatibilidad)
  const mtc = APP.lsGet('mp_taller_config', {});
  APP.lsSet('mp_taller_config', {
    ...mtc,
    nombre: config.nombre_fantasia,
    razonSocial: config.nombre_empresa,
    rut: config.rut,
    pais: config.pais,
    region: config.region,
    ciudad: config.ciudad,
    comuna: config.comuna,
    direccion: config.ciudad + ', ' + config.region + ', ' + config.pais,
    telefono: config.telefono,
    email: config.email,
    agenda: config.link_agenda,
    horaInicio: config.hora_inicio,
    horaFin: config.hora_fin,
    capHorasDia: config.capacidad_maxima,
    precioMinHora: config.precio_minimo_hora,
    horaDescansoInicio: config.descanso_inicio,
    horaDescansoFin: config.descanso_fin
  });

  tallerActualizarHeader();
  APP.toast.show('✅ Datos del taller guardados');
}

function tallerActualizarHeader() {
  const config = APP.lsGet('taller_config') || {};
  const logoEl = document.getElementById('sidebar-logo-img');
  const defEl  = document.getElementById('sidebar-logo-default');
  const nomEl  = document.getElementById('sidebar-taller-nombre');
  const subEl  = document.getElementById('sidebar-taller-sub');

  if (config.logo_base64 && logoEl) {
    logoEl.src = config.logo_base64;
    logoEl.style.display = 'block';
    if (defEl) defEl.style.display = 'none';
  } else {
    if (logoEl) logoEl.style.display = 'none';
    if (defEl) defEl.style.display = 'flex';
  }
  if (nomEl) nomEl.textContent = config.nombre_fantasia || 'MecánicaPro';
  if (subEl) subEl.textContent = config.nombre_empresa || (config.ciudad ? config.ciudad + ', ' + config.pais : 'Taller Valparaíso');
}

// ===== CONFIGURACIÓN OPERATIVA =====
function _admCargarConfigOperativa() {
  const cfg = APP.lsGet('mp_taller_config', {});
  const s   = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
  s('cfg-op-inicio',     cfg.horaInicio    || '08:00');
  s('cfg-op-fin',        cfg.horaFin       || '18:00');
  s('cfg-op-cap',        cfg.capHorasDia   || 8);
  s('cfg-op-precio-min', cfg.precioMinHora || '');
}

function admGuardarConfigOperativa() {
  const g   = id => (document.getElementById(id)?.value || '').trim();
  const cfg = APP.lsGet('mp_taller_config', {});
  cfg.horaInicio    = g('cfg-op-inicio')     || '08:00';
  cfg.horaFin       = g('cfg-op-fin')        || '18:00';
  cfg.capHorasDia   = parseFloat(g('cfg-op-cap'))       || 8;
  cfg.precioMinHora = parseFloat(g('cfg-op-precio-min'))|| 0;
  APP.lsSet('mp_taller_config', cfg);
}

// ===== INTEGRACIONES =====
function _admRenderIntegraciones() {
  const el = document.getElementById('adm-integraciones');
  if (!el) return;
  const cfg  = APP.lsGet('mp_taller_config', {});
  const integ = [
    { key:'gcalActivo',  label:'Google Calendar',   icon:'ti-calendar',         desc: cfg.gcalCalId ? 'Cal: ' + cfg.gcalCalId : 'Sin configurar', fn:'admToggleGCal'  },
    { key:'wabizActivo', label:'WhatsApp Business',  icon:'ti-brand-whatsapp',   desc: cfg.telefono  || 'Sin número',                              fn:'admToggleWaBiz' },
    { key:'flowActivo',  label:'Flow / WebPay',      icon:'ti-credit-card',      desc:'Pagos en línea (migración futura)',                          fn:'admToggleFlow'  },
    { key:'siiActivo',   label:'SII / Haulmer',      icon:'ti-receipt',          desc:'Boletas y facturas electrónicas',                           fn:'admToggleSii'   },
  ];
  el.innerHTML = integ.map(i => {
    const on = !!cfg[i.key];
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px;background:var(--surface-1);border-radius:var(--radius)">
      <div>
        <div style="font-size:12px;font-weight:500"><i class="ti ${i.icon}" style="font-size:12px${i.icon==='ti-brand-whatsapp'?';color:#25d366':''}"></i> ${i.label}</div>
        <div style="font-size:10px;color:var(--text-muted)">${_admEsc(i.desc)}</div>
      </div>
      <span class="st ${on?'s-done':'s-wait'}" style="cursor:pointer" onclick="${i.fn}(${!on})">
        <span class="dot"></span>${on ? 'Activa' : 'Pendiente'}
      </span>
    </div>`;
  }).join('');
}

function admToggleGCal(on) {
  const c = APP.lsGet('mp_taller_config', {}); c.gcalActivo = !!on; APP.lsSet('mp_taller_config', c);
  const d = document.getElementById('adm-gcal-det'); if (d) d.style.display = on ? 'block' : 'none';
  _admRenderIntegraciones();
}
function admToggleWaBiz(on) { const c=APP.lsGet('mp_taller_config',{}); c.wabizActivo=!!on; APP.lsSet('mp_taller_config',c); _admRenderIntegraciones(); }
function admToggleFlow(on)  { const c=APP.lsGet('mp_taller_config',{}); c.flowActivo =!!on; APP.lsSet('mp_taller_config',c); _admRenderIntegraciones(); }
function admToggleSii(on)   { const c=APP.lsGet('mp_taller_config',{}); c.siiActivo  =!!on; APP.lsSet('mp_taller_config',c); _admRenderIntegraciones(); }

function admGuardarGCalConfig() {
  const g = id => (document.getElementById(id)?.value || '').trim();
  const c = APP.lsGet('mp_taller_config', {});
  c.gcalClientId = g('cfg-gcal-clientid');
  c.gcalCalId    = g('cfg-gcal-calid');
  APP.lsSet('mp_taller_config', c);
}

// ===== PANEL SERVICIOS =====
function _admPanelServicios() {
  const svcs = APP.lsGet('mp_servicios', []);
  const cfg  = APP.lsGet('mp_config', { tarifaHora: 35000 });
  _admSet('adm-svc-count',  svcs.length);
  _admSet('adm-svc-tarifa', cfg.tarifaHora ? '$' + Number(cfg.tarifaHora).toLocaleString('es-CL') + '/h' : '—');
  _admSet('adm-svc-cats',   new Set(svcs.map(s => s.categoria)).size || '—');
  const lista = document.getElementById('adm-svc-lista');
  if (lista) lista.innerHTML = svcs.length
    ? svcs.map(s => `<span class="tag" style="margin:2px">${_admEsc(s.nombre)}</span>`).join('')
    : '<span style="font-size:11px;color:var(--text-muted)">Sin servicios. Ve al módulo Servicios para crear el catálogo.</span>';
}
// ===== HELPERS =====
function _admSet(id, val) { const el = document.getElementById(id); if (el) el.textContent = val ?? ''; }

function _admFmtH(min) {
  if (!min) return '—';
  return Math.floor(min / 60) + 'h ' + Math.round(min % 60) + 'm';
}

function _fmtM(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function _admEsc(str) {
  return (str == null ? '' : String(str)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ═══════════════════════════════════════════════════════════════════
// REPORTES — Renderizado desde datos reales
// ═══════════════════════════════════════════════════════════════════

function adminRenderReportes() {
  const ots = APP.lsGet('ots') || [];
  const clientes = APP.lsGet('clientes') || [];
  const flujo = APP.lsGet('finanzas_flujo_caja') || [];

  const totalOts = ots.length;
  const otsCompletadas = ots.filter(o => o.estado === 'completada' || o.estado === 'completado').length;
  const ingresos = flujo.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + (m.monto || 0), 0);
  const totalClientes = clientes.length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('adm-kpi-ots', totalOts);
  set('adm-kpi-ots-sub', otsCompletadas + ' completadas');
  set('adm-kpi-ingresos', '$' + ingresos.toLocaleString('es-CL'));
  set('adm-kpi-clientes', totalClientes);

  // También intentar usar el motor existente con datos legacy
  if (typeof _admKPIs === 'function') _admKPIs();
}


