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
  _admActualizarBotonesPeriodo();
  _admKPIs();
  _admTablaServicios();
  _admTablaMecanicos();
  _admGraficoMensual();
  _admFrecuencia();
  repRenderEficiencia();
  _admCargarConfig();
  _admCargarConfigOperativa();
  _admCargarConfigRepuestos();
  _admRenderIntegraciones();
  _admPanelServicios();
  _admCatRender();
  _admRenderUpselling();

  if (typeof admUsuariosRender === 'function') admUsuariosRender();
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
}

function admGuardarConfig() {
  const g   = id => (document.getElementById(id)?.value || '').trim();
  const old = APP.lsGet('mp_taller_config', {});
  const cfg = { ...old, nombre: g('cfg-nombre') || _ADM_CFG_DEFAULT.nombre, rut: g('cfg-rut'), direccion: g('cfg-direccion'), telefono: g('cfg-telefono'), agenda: g('cfg-agenda') };
  APP.lsSet('mp_taller_config', cfg);
  const btn = document.getElementById('cfg-btn-guardar');
  if (btn) { const o = btn.innerHTML; btn.innerHTML = '<i class="ti ti-check"></i>Guardado ✓'; btn.disabled = true; setTimeout(() => { btn.innerHTML = o; btn.disabled = false; }, 2000); }
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

// ===== UPSELLING =====
const _ADM_UPSELL_DEFAULT = [
  { servicio:'Cambio aceite + filtros',    meses:6  },
  { servicio:'Mantención 10.000 km',       meses:12 },
  { servicio:'Cambio de frenos',           meses:24 },
  { servicio:'Alineación y balanceo',      meses:12 },
  { servicio:'Diagnóstico scanner',        meses:12 },
  { servicio:'Cambio de embrague',         meses:36 },
];

function _admRenderUpselling() {
  const lista = document.getElementById('adm-upsell-lista');
  if (!lista) return;
  const rs   = APP.lsGet('mp_upselling_rules', _ADM_UPSELL_DEFAULT);
  const svcs = APP.lsGet('mp_servicios', []);
  const dlId = 'upsell-svc-dl';

  lista.innerHTML = `<datalist id="${dlId}">${svcs.map(s => `<option value="${_admEsc(s.nombre)}">`).join('')}</datalist>`
    + (rs.length ? rs.map((r, i) => `
    <div style="display:flex;gap:6px;align-items:center;padding:7px 0;border-bottom:0.5px solid var(--border)">
      <i class="ti ti-sparkles" style="font-size:12px;color:var(--text-accent);flex-shrink:0"></i>
      <input list="${dlId}" value="${_admEsc(r.servicio)}" placeholder="Nombre del servicio…"
        style="flex:1;font-size:11px;border:0.5px solid var(--border);border-radius:var(--radius);padding:4px 8px;background:var(--surface-1);color:var(--text-primary)"
        onchange="admUpsellSync(${i},'servicio',this.value)">
      <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">cada</span>
      <input type="number" min="1" max="120" value="${r.meses || 12}"
        style="width:58px;font-size:11px;border:0.5px solid var(--border);border-radius:var(--radius);padding:4px 8px;background:var(--surface-1);color:var(--text-primary);text-align:center"
        onchange="admUpsellSync(${i},'meses',this.value)">
      <span style="font-size:11px;color:var(--text-muted)">meses</span>
      <button class="btn" style="padding:3px 7px;font-size:12px;color:var(--text-danger)" onclick="admUpsellElim(${i})"><i class="ti ti-x"></i></button>
    </div>`).join('')
    : '<div style="font-size:11px;color:var(--text-muted);padding:8px 0">Sin reglas. Usa el botón Agregar.</div>');
}

function admUpsellSync(i, campo, val) {
  const rs = APP.lsGet('mp_upselling_rules', _ADM_UPSELL_DEFAULT);
  if (rs[i]) { rs[i][campo] = campo === 'meses' ? (parseInt(val) || 1) : val; APP.lsSet('mp_upselling_rules', rs); }
}

function admUpsellAgregar() {
  const rs = APP.lsGet('mp_upselling_rules', _ADM_UPSELL_DEFAULT);
  rs.push({ servicio:'', meses:12 });
  APP.lsSet('mp_upselling_rules', rs);
  _admRenderUpselling();
}

function admUpsellElim(i) {
  const rs = APP.lsGet('mp_upselling_rules', _ADM_UPSELL_DEFAULT);
  rs.splice(i, 1);
  APP.lsSet('mp_upselling_rules', rs);
  _admRenderUpselling();
}

function admUpsellReset() {
  APP.modal.confirmar('¿Restaurar las reglas de upselling por defecto? Se perderán los cambios manuales.', () => {
    APP.lsSet('mp_upselling_rules', JSON.parse(JSON.stringify(_ADM_UPSELL_DEFAULT)));
    _admRenderUpselling();
  }, 'Restaurar', 'Cancelar');
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
