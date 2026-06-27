// ===== MÓDULO: ADMIN (Reportes, Configuración, Operarios, Alertas) =====

const _ADM_CFG_DEFAULT = {
  nombre:    'Integral Automotriz Spa',
  rut:       '76.543.210-8',
  direccion: 'Valparaíso, Chile',
  telefono:  '+56 9 5165 5331',
  agenda:    'https://integral-automotriz-spa.reservio.com/booking',
};

const _ADM_INTEGRACIONES = [
  { id:'patentes', nombre:'API Patentes Chile',              icono:'ti-car',            desc:'Auto-relleno de datos vehiculares',     activa:true  },
  { id:'whatsapp', nombre:'Wati / WhatsApp API',             icono:'ti-brand-whatsapp', desc:'Mensajes automáticos de fidelización',  activa:true  },
  { id:'sii',      nombre:'Haulmer / SII',                   icono:'ti-receipt',        desc:'Boletas y facturas electrónicas',       activa:true  },
  { id:'residuos', nombre:'Geolocalización MINSAL residuos', icono:'ti-map-pin',        desc:'Empresas autorizadas de retiro',        activa:false },
];

// ===== Colores de operarios =====
const _ADM_COLORES_OP = [
  '#ef4444','#f59e0b','#10b981','#3b82f6',
  '#8b5cf6','#f97316','#14b8a6','#ec4899',
];

// ===== Motor de alertas — estado de sesión =====
let _admAlertaIntervalId  = null;
let _admAlertaResumenDate = ''; // YYYY-MM-DD del último resumen enviado esta sesión
let _admAlertaSentSet     = new Set(); // 'otId:tipo' para evitar duplicados en sesión

// ===== INIT =====
function init_admin() {
  _admKPIs();
  _admTablaServicios();
  _admTablaMecanicos();
  _admCargarConfig();
  _admRenderIntegraciones();
  _admPanelServicios();
  _admRenderOperarios();
  _admCargarAlertasConfig();
  _admRenderLog();
  _admScanPostServicio();
  _admIniciarMotorAlertas();
}

// ===== KPIs =====
function _admKPIs() {
  const ots      = APP.lsGet('mp_ots', []);
  const clientes = APP.lsGet('mp_clientes', []);
  const ahora    = new Date();
  const mesAct   = ahora.getMonth();
  const anioAct  = ahora.getFullYear();
  const mesPrev  = mesAct === 0 ? 11 : mesAct - 1;
  const anioPrev = mesAct === 0 ? anioAct - 1 : anioAct;

  const esMes = (d, m, a) => { const f = new Date(d); return f.getMonth() === m && f.getFullYear() === a; };

  const completadas    = ots.filter(o => o.estado === 'completado');
  const compMes        = completadas.filter(o => esMes(o.salida_ts || o.creado, mesAct, anioAct));
  const compPrevMes    = completadas.filter(o => esMes(o.salida_ts || o.creado, mesPrev, anioPrev));
  const diffOTs        = compMes.length - compPrevMes.length;
  _admSet('adm-kpi-ots',     completadas.length || compMes.length);
  _admSet('adm-kpi-ots-sub', (diffOTs >= 0 ? '+' : '') + diffOTs + ' vs mes anterior');

  const conValor   = completadas.filter(o => parseFloat(o.valorTotal || o.valor) > 0);
  const ingTotal   = conValor.reduce((s, o) => s + (parseFloat(o.valorTotal || o.valor) || 0), 0);
  const ingMes     = conValor.filter(o => esMes(o.salida_ts || o.creado, mesAct, anioAct))
                             .reduce((s, o) => s + (parseFloat(o.valorTotal || o.valor) || 0), 0);
  const ingPrev    = conValor.filter(o => esMes(o.salida_ts || o.creado, mesPrev, anioPrev))
                             .reduce((s, o) => s + (parseFloat(o.valorTotal || o.valor) || 0), 0);
  const pctIng     = ingPrev > 0 ? Math.round((ingMes - ingPrev) / ingPrev * 100) : 0;
  _admSet('adm-kpi-ingresos', _fmtM(ingTotal || ingMes));
  _admSet('adm-kpi-ing-sub',  pctIng !== 0 ? (pctIng > 0 ? '+' : '') + pctIng + '% vs mes anterior' : 'acumulado');

  const cliMes  = clientes.filter(c => c.creado && esMes(c.creado, mesAct, anioAct));
  const cliPrev = clientes.filter(c => c.creado && esMes(c.creado, mesPrev, anioPrev));
  _admSet('adm-kpi-clientes', cliMes.length || clientes.length);
  _admSet('adm-kpi-cli-sub',  '+' + Math.max(0, cliMes.length - cliPrev.length) + ' vs mes anterior');

  const conTiempo = completadas.filter(o => o.tiempoReal > 0 && parseFloat(o.valorTotal || o.valor) > 0);
  const totalMin  = conTiempo.reduce((s, o) => s + o.tiempoReal, 0);
  const totalIngH = conTiempo.reduce((s, o) => s + (parseFloat(o.valorTotal || o.valor) || 0), 0);
  const rentH     = totalMin > 0 ? Math.round(totalIngH / (totalMin / 60)) : 0;
  _admSet('adm-kpi-renth',     rentH ? _fmtM(rentH) + '/h' : '—');
  _admSet('adm-kpi-renth-sub', conTiempo.length ? conTiempo.length + ' OTs con tiempo real' : 'sin datos de tiempo aún');

  _admSet('adm-kpi-sat',     '4.8 ★');
  _admSet('adm-kpi-sat-sub', completadas.length + ' OTs completadas');
}

// ===== SERVICIOS MÁS RENTABLES =====
function _admTablaServicios() {
  const tbody = document.getElementById('adm-tbody-svc');
  if (!tbody) return;
  const ots = APP.lsGet('mp_ots', []).filter(o => o.estado === 'completado' && parseFloat(o.valorTotal || o.valor) > 0);
  if (!ots.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px;font-size:11px">Aún no hay OTs completadas con valor registrado.</td></tr>';
    return;
  }
  const map = {};
  ots.forEach(o => {
    const k = o.servicio || 'Sin clasificar';
    if (!map[k]) map[k] = { count:0, ingresos:0, minutos:0 };
    map[k].count++;
    map[k].ingresos += parseFloat(o.valorTotal || o.valor) || 0;
    if (o.tiempoReal > 0) map[k].minutos += o.tiempoReal;
  });
  const rows = Object.entries(map)
    .map(([svc, d]) => ({ svc, ...d, rentH: d.minutos > 0 ? Math.round(d.ingresos / (d.minutos / 60)) : null }))
    .sort((a, b) => (b.rentH || 0) - (a.rentH || 0));
  const maxR = Math.max(...rows.map(r => r.rentH || 0), 1);
  tbody.innerHTML = rows.map(r => {
    const color = !r.rentH ? 'var(--text-muted)'
      : r.rentH >= maxR * 0.85 ? 'var(--text-success)'
      : r.rentH >= maxR * 0.55 ? 'var(--text-warning)'
      : 'var(--text-danger)';
    return `<tr><td>${_admEsc(r.svc)}</td><td>${r.count}</td><td>${_fmtM(r.ingresos)}</td><td style="color:${color};font-weight:500">${r.rentH ? _fmtM(r.rentH) + '/h' : '—'}</td></tr>`;
  }).join('');
}

// ===== RENDIMIENTO POR MECÁNICO =====
function _admTablaMecanicos() {
  const tbody = document.getElementById('adm-tbody-mec');
  if (!tbody) return;
  const ots = APP.lsGet('mp_ots', []);
  if (!ots.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px;font-size:11px">Sin órdenes de trabajo registradas.</td></tr>';
    return;
  }
  const map = {};
  ots.forEach(o => {
    const k = o.tecnico || 'Sin asignar';
    if (!map[k]) map[k] = { total:0, completadas:0, ingresos:0 };
    map[k].total++;
    if (o.estado === 'completado') { map[k].completadas++; map[k].ingresos += parseFloat(o.valorTotal || o.valor) || 0; }
  });
  const rows = Object.entries(map).map(([tec, d]) => ({ tec, ...d })).sort((a, b) => b.ingresos - a.ingresos);
  tbody.innerHTML = rows.map(r => {
    const pct   = r.total > 0 ? Math.round(r.completadas / r.total * 100) : 0;
    const color = pct >= 80 ? 'var(--text-success)' : pct >= 50 ? 'var(--text-warning)' : 'var(--text-muted)';
    return `<tr><td>${_admEsc(r.tec)}</td><td>${r.total}</td><td>${_fmtM(r.ingresos)}</td><td style="color:${color};font-weight:500">${pct}%</td></tr>`;
  }).join('');
}

// ===== EXPORTAR PDF =====
function admExportarPDF() {
  const ots = APP.lsGet('mp_ots', []);
  const cfg = APP.lsGet('mp_taller_config', _ADM_CFG_DEFAULT);
  const completadas = ots.filter(o => o.estado === 'completado' && parseFloat(o.valorTotal || o.valor) > 0);
  const ingTotal    = completadas.reduce((s, o) => s + (parseFloat(o.valorTotal || o.valor) || 0), 0);
  const clientes    = APP.lsGet('mp_clientes', []).length;
  const svcMap = {};
  completadas.forEach(o => {
    const k = o.servicio || 'Sin clasificar';
    if (!svcMap[k]) svcMap[k] = { count:0, ingresos:0, minutos:0 };
    svcMap[k].count++; svcMap[k].ingresos += parseFloat(o.valorTotal || o.valor) || 0;
    if (o.tiempoReal > 0) svcMap[k].minutos += o.tiempoReal;
  });
  const svcRows = Object.entries(svcMap).sort((a,b) => b[1].ingresos - a[1].ingresos);
  const mecMap = {};
  ots.forEach(o => {
    const k = o.tecnico || 'Sin asignar';
    if (!mecMap[k]) mecMap[k] = { total:0, comp:0, ing:0 };
    mecMap[k].total++;
    if (o.estado === 'completado') { mecMap[k].comp++; mecMap[k].ing += parseFloat(o.valorTotal || o.valor) || 0; }
  });
  const mecRows = Object.entries(mecMap).sort((a,b) => b[1].ing - a[1].ing);
  const fmtNum  = n => n ? '$' + Math.round(n).toLocaleString('es-CL') : '—';
  const fecha   = new Date().toLocaleDateString('es-CL', { day:'numeric', month:'long', year:'numeric' });
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte — ${_admEsc(cfg.nombre)}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,-apple-system,sans-serif;font-size:12px;color:#1a1a18;padding:32px}
  h1{font-size:20px;font-weight:600;margin-bottom:4px}.sub{color:#888;font-size:11px;margin-bottom:24px}
  .kgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:24px}.kcard{background:#f3f2ec;border-radius:8px;padding:12px}
  .kl{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}.kv{font-size:18px;font-weight:600}
  h2{font-size:13px;font-weight:600;margin:20px 0 8px;padding-bottom:4px;border-bottom:1px solid #e5e3dc}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}th{text-align:left;font-size:9px;color:#888;padding:5px 0;border-bottom:1px solid #e5e3dc;text-transform:uppercase;letter-spacing:.04em}
  td{padding:6px 0;border-bottom:0.5px solid #e5e3dc;font-size:11px}@media print{@page{margin:20mm}button{display:none}}</style></head><body>
  <h1>${_admEsc(cfg.nombre)}</h1><div class="sub">Reporte generado el ${fecha} · ${_admEsc(cfg.direccion || '')}${cfg.rut ? ' · RUT ' + _admEsc(cfg.rut) : ''}</div>
  <div class="kgrid"><div class="kcard"><div class="kl">OTs completadas</div><div class="kv">${completadas.length}</div></div>
  <div class="kcard"><div class="kl">Ingresos totales</div><div class="kv">${_fmtM(ingTotal)}</div></div>
  <div class="kcard"><div class="kl">Total clientes</div><div class="kv">${clientes}</div></div>
  <div class="kcard"><div class="kl">Total OTs</div><div class="kv">${ots.length}</div></div>
  <div class="kcard"><div class="kl">Satisfacción</div><div class="kv">4.8 ★</div></div></div>
  <h2>Servicios más rentables</h2>
  ${svcRows.length ? `<table><thead><tr><th>Servicio</th><th>OTs</th><th>Ingreso total</th><th>Rent./hora</th></tr></thead><tbody>
  ${svcRows.map(([s,d]) => { const rh = d.minutos > 0 ? fmtNum(Math.round(d.ingresos/(d.minutos/60)))+'/h' : '—'; return `<tr><td>${_admEsc(s)}</td><td>${d.count}</td><td>${fmtNum(d.ingresos)}</td><td>${rh}</td></tr>`; }).join('')}</tbody></table>` : '<p style="color:#888;font-size:11px">Sin datos.</p>'}
  <h2>Rendimiento por mecánico</h2>
  ${mecRows.length ? `<table><thead><tr><th>Mecánico</th><th>Total OTs</th><th>Completadas</th><th>Ingresos</th><th>%</th></tr></thead><tbody>
  ${mecRows.map(([t,d]) => `<tr><td>${_admEsc(t)}</td><td>${d.total}</td><td>${d.comp}</td><td>${fmtNum(d.ing)}</td><td>${d.total > 0 ? Math.round(d.comp/d.total*100) : 0}%</td></tr>`).join('')}</tbody></table>` : '<p style="color:#888;font-size:11px">Sin datos.</p>'}
  </body></html>`;
  const win = window.open('', '_blank');
  if (!win) { alert('Permite ventanas emergentes para exportar el PDF.'); return; }
  win.document.write(html); win.document.close();
  setTimeout(() => win.print(), 600);
}

// ===== EXPORTAR EXCEL =====
function admExportarExcel() {
  const ots = APP.lsGet('mp_ots', []);
  const cfg = APP.lsGet('mp_taller_config', _ADM_CFG_DEFAULT);
  const completadas = ots.filter(o => o.estado === 'completado');
  const ingTotal    = completadas.reduce((s, o) => s + (parseFloat(o.valorTotal || o.valor) || 0), 0);
  const svcMap = {}; const mecMap = {};
  completadas.filter(o => parseFloat(o.valorTotal || o.valor) > 0).forEach(o => {
    const k = o.servicio || 'Sin clasificar';
    if (!svcMap[k]) svcMap[k] = { count:0, ingresos:0, minutos:0 };
    svcMap[k].count++; svcMap[k].ingresos += parseFloat(o.valorTotal || o.valor) || 0;
    if (o.tiempoReal > 0) svcMap[k].minutos += o.tiempoReal;
  });
  ots.forEach(o => {
    const k = o.tecnico || 'Sin asignar';
    if (!mecMap[k]) mecMap[k] = { total:0, comp:0, ing:0 };
    mecMap[k].total++;
    if (o.estado === 'completado') { mecMap[k].comp++; mecMap[k].ing += parseFloat(o.valorTotal || o.valor) || 0; }
  });
  const rows = [
    [cfg.nombre || 'MecánicaPro — Reporte'], ['Generado el', new Date().toLocaleDateString('es-CL')], [],
    ['RESUMEN'], ['OTs completadas', completadas.length], ['Ingresos totales', ingTotal], ['Total OTs', ots.length], [],
    ['SERVICIOS MÁS RENTABLES'], ['Servicio','OTs','Ingreso total ($)','Rent./hora ($)'],
    ...Object.entries(svcMap).sort((a,b)=>b[1].ingresos-a[1].ingresos).map(([s,d])=>[s,d.count,Math.round(d.ingresos),d.minutos>0?Math.round(d.ingresos/(d.minutos/60)):'']), [],
    ['RENDIMIENTO POR MECÁNICO'], ['Mecánico','Total OTs','Completadas','Ingresos ($)','%'],
    ...Object.entries(mecMap).sort((a,b)=>b[1].ing-a[1].ing).map(([t,d])=>[t,d.total,d.comp,Math.round(d.ing),d.total>0?Math.round(d.comp/d.total*100)+'%':'0%']), [],
    ['DETALLE OTs'], ['OT','Fecha','Patente','Cliente','Servicio','Técnico','Valor ($)','Tiempo (min)','Estado'],
    ...ots.map(o=>[o.id,o.creado?new Date(o.creado).toLocaleDateString('es-CL'):'',o.patente||'',o.clienteNombre||'',o.servicio||'',o.tecnico||'',Math.round(parseFloat(o.valorTotal||o.valor)||0),o.tiempoReal||'',o.estado]),
  ];
  const csv  = rows.map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'reporte-mecanicapro-' + new Date().toISOString().split('T')[0] + '.csv' });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== CONFIGURACIÓN — cargar / guardar =====
function _admCargarConfig() {
  const cfg = APP.lsGet('mp_taller_config', _ADM_CFG_DEFAULT);
  const s   = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  s('cfg-nombre', cfg.nombre); s('cfg-rut', cfg.rut); s('cfg-direccion', cfg.direccion);
  s('cfg-telefono', cfg.telefono); s('cfg-agenda', cfg.agenda);
}

function admGuardarConfig() {
  const g   = id => (document.getElementById(id)?.value || '').trim();
  const cfg = { nombre: g('cfg-nombre') || _ADM_CFG_DEFAULT.nombre, rut: g('cfg-rut'), direccion: g('cfg-direccion'), telefono: g('cfg-telefono'), agenda: g('cfg-agenda') };
  APP.lsSet('mp_taller_config', cfg);
  const btn = document.getElementById('cfg-btn-guardar');
  if (btn) { const o = btn.innerHTML; btn.innerHTML = '<i class="ti ti-check"></i>Guardado ✓'; btn.disabled = true; setTimeout(() => { btn.innerHTML = o; btn.disabled = false; }, 2000); }
}

// ===== INTEGRACIONES =====
function _admRenderIntegraciones() {
  const el = document.getElementById('adm-integraciones');
  if (!el) return;
  const saved = APP.lsGet('mp_integraciones', {});
  el.innerHTML = _ADM_INTEGRACIONES.map(int => {
    const activa = saved[int.id] !== undefined ? saved[int.id] : int.activa;
    const badge  = activa
      ? `<span class="st s-done" style="cursor:pointer" onclick="admToggleInt('${int.id}')"><span class="dot"></span>Activa</span>`
      : `<span class="st s-wait" style="cursor:pointer" onclick="admToggleInt('${int.id}')"><span class="dot"></span>Pendiente</span>`;
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px;background:var(--surface-1);border-radius:var(--radius)">
      <div>
        <div style="font-size:12px;font-weight:500"><i class="ti ${int.icono}" style="font-size:12px${int.id==='whatsapp'?';color:#25d366':''}"></i> ${int.nombre}</div>
        <div style="font-size:10px;color:var(--text-muted)">${int.desc}</div>
      </div>${badge}</div>`;
  }).join('');
}

function admToggleInt(id) {
  const saved = APP.lsGet('mp_integraciones', {});
  const def   = _ADM_INTEGRACIONES.find(i => i.id === id);
  saved[id]   = !(saved[id] !== undefined ? saved[id] : (def?.activa ?? false));
  APP.lsSet('mp_integraciones', saved);
  _admRenderIntegraciones();
}

// ===== PANEL SERVICIOS EN CONFIG =====
function _admPanelServicios() {
  const servicios = APP.lsGet('mp_servicios', []);
  const cfg       = APP.lsGet('mp_config', { tarifaHora: 35000 });
  _admSet('adm-svc-count',  servicios.length);
  _admSet('adm-svc-tarifa', cfg.tarifaHora ? '$' + Number(cfg.tarifaHora).toLocaleString('es-CL') + '/h' : '—');
  _admSet('adm-svc-cats',   new Set(servicios.map(s => s.categoria)).size || '—');
  const lista = document.getElementById('adm-svc-lista');
  if (lista) lista.innerHTML = servicios.length
    ? servicios.map(s => `<span class="tag" style="margin:2px">${_admEsc(s.nombre)}</span>`).join('')
    : '<span style="font-size:11px;color:var(--text-muted)">Sin servicios. Ve al módulo Servicios para crear el catálogo.</span>';
}

// ===== OPERARIOS =====
function _admRenderOperarios() {
  const lista = document.getElementById('adm-operarios-lista');
  if (!lista) return;
  const ops = APP.lsGet('mp_operarios', []);
  if (!ops.length) {
    lista.innerHTML = '<div style="color:var(--text-muted);font-size:11px;padding:6px 0">Sin mecánicos configurados. Usa el botón + para agregar.</div>';
    return;
  }
  const inpStyle = extra => `style="font-size:11px;border:0.5px solid var(--border);border-radius:var(--radius);padding:5px 8px;background:var(--surface-0);color:var(--text-primary);${extra}"`;
  lista.innerHTML = ops.map((op, i) => {
    const color  = op.color || _ADM_COLORES_OP[i % _ADM_COLORES_OP.length];
    const activo = op.activo !== false;
    return `<div style="display:flex;gap:8px;align-items:center;padding:8px 10px;background:var(--surface-1);border-radius:var(--radius)">
      <div title="Clic para cambiar color" onclick="admCambiarColorOp('${op.id}')"
        style="width:24px;height:24px;border-radius:50%;background:${color};cursor:pointer;flex-shrink:0;border:2px solid var(--border);opacity:${activo ? 1 : 0.4};transition:opacity .15s"></div>
      <input value="${_admEsc(op.nombre)}" placeholder="Nombre del mecánico" ${inpStyle('flex:1')}
        onchange="admActualizarOp('${op.id}','nombre',this.value)">
      <input value="${_admEsc(op.wz || '')}" placeholder="+569XXXXXXXX" ${inpStyle('width:148px;font-family:var(--font-mono)')}
        onchange="admActualizarOp('${op.id}','wz',this.value)">
      <button class="btn${activo ? ' bpg' : ''}" style="font-size:10px;padding:4px 9px;white-space:nowrap"
        onclick="admToggleOperario('${op.id}')">${activo ? '✓ Activo' : '○ Inactivo'}</button>
      <button class="btn" style="padding:4px 7px;font-size:11px;flex-shrink:0"
        onclick="admEliminarOperario('${op.id}')"><i class="ti ti-x"></i></button>
    </div>`;
  }).join('');
}

function admAgregarOperario() {
  const ops = APP.lsGet('mp_operarios', []);
  ops.push({ id: 'op-' + Date.now(), nombre: '', wz: '', color: _ADM_COLORES_OP[ops.length % _ADM_COLORES_OP.length], activo: true, creado: new Date().toISOString() });
  APP.lsSet('mp_operarios', ops);
  _admRenderOperarios();
}

function admActualizarOp(id, campo, val) {
  const ops = APP.lsGet('mp_operarios', []);
  const idx = ops.findIndex(o => o.id === id);
  if (idx < 0) return;
  ops[idx][campo] = val.trim();
  APP.lsSet('mp_operarios', ops);
  if (campo === 'nombre' || campo === 'color') _admSyncColoresCalendario(ops);
}

function admCambiarColorOp(id) {
  const ops = APP.lsGet('mp_operarios', []);
  const idx = ops.findIndex(o => o.id === id);
  if (idx < 0) return;
  const ci = _ADM_COLORES_OP.indexOf(ops[idx].color);
  ops[idx].color = _ADM_COLORES_OP[(ci + 1) % _ADM_COLORES_OP.length];
  APP.lsSet('mp_operarios', ops);
  _admRenderOperarios();
  _admSyncColoresCalendario(ops);
}

function admToggleOperario(id) {
  const ops = APP.lsGet('mp_operarios', []);
  const idx = ops.findIndex(o => o.id === id);
  if (idx < 0) return;
  ops[idx].activo = !(ops[idx].activo !== false);
  APP.lsSet('mp_operarios', ops);
  _admRenderOperarios();
}

function admEliminarOperario(id) {
  if (!confirm('¿Eliminar este operario?')) return;
  APP.lsSet('mp_operarios', APP.lsGet('mp_operarios', []).filter(o => o.id !== id));
  _admRenderOperarios();
}

function _admSyncColoresCalendario(ops) {
  const cfg = APP.lsGet('mp_taller_config', {});
  cfg.mecanicosColores = {};
  ops.forEach(op => { if (op.nombre && op.color) cfg.mecanicosColores[op.nombre] = op.color; });
  APP.lsSet('mp_taller_config', cfg);
}

// ===== ALERTAS — CONFIG =====
function _admCargarAlertasConfig() {
  const cfg = APP.lsGet('mp_alertas_config', { horaResumen: '17:50', diasPost: 7 });
  const hr = document.getElementById('alerta-hora-resumen');
  const dp = document.getElementById('alerta-dias-post');
  if (hr) hr.value = cfg.horaResumen || '17:50';
  if (dp) dp.value = String(cfg.diasPost || 7);
}

function admGuardarAlertasConfig() {
  APP.lsSet('mp_alertas_config', {
    horaResumen: document.getElementById('alerta-hora-resumen')?.value || '17:50',
    diasPost:    parseInt(document.getElementById('alerta-dias-post')?.value) || 7,
  });
}

// ===== MOTOR DE ALERTAS — setInterval cada minuto =====
function _admIniciarMotorAlertas() {
  if (_admAlertaIntervalId) return;
  _admAlertaIntervalId = setInterval(_admTickAlertas, 60000);
  _admActualizarMotorStatus();
  _admTickAlertas(); // check inmediato
}

function _admTickAlertas() {
  _admCheckAlertaResumen();
  _admCheckAlerta30min();
}

function _admActualizarMotorStatus() {
  const el = document.getElementById('alerta-motor-status');
  if (!el) return;
  if (_admAlertaIntervalId) {
    el.innerHTML = '🟢 Activo — revisando alertas cada minuto (Aviso 30 min + Resumen diario).';
    el.style.color = 'var(--text-success)';
  } else {
    el.innerHTML = '⚪ Inactivo';
    el.style.color = 'var(--text-muted)';
  }
}

// ===== ALERTA 1 — RESUMEN DÍA SIGUIENTE =====
function _admCheckAlertaResumen() {
  const cfg    = APP.lsGet('mp_alertas_config', { horaResumen: '17:50' });
  const ahora  = new Date();
  const horaAct = ahora.getHours().toString().padStart(2,'0') + ':' + ahora.getMinutes().toString().padStart(2,'0');
  const hoyKey  = ahora.toISOString().split('T')[0];
  if (horaAct !== (cfg.horaResumen || '17:50')) return;
  if (_admAlertaResumenDate === hoyKey) return;
  _admAlertaResumenDate = hoyKey;
  _admEnviarResumen(false);
}

function admEnviarResumenManual() {
  _admEnviarResumen(true);
}

function _admEnviarResumen(manual) {
  const ops = APP.lsGet('mp_operarios', []).filter(o => o.activo !== false && o.nombre && o.wz);
  if (!ops.length) { _admSetStatus('Sin operarios activos con WhatsApp configurado.'); return; }

  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const mananaKey   = [manana.getFullYear(), String(manana.getMonth()+1).padStart(2,'0'), String(manana.getDate()).padStart(2,'0')].join('-');
  const mananaLabel = manana.toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long' });
  const ots         = APP.lsGet('mp_ots', []);

  let enviados = 0;
  ops.forEach((op, i) => {
    const misOTs = ots.filter(o =>
      o.tecnico === op.nombre &&
      o.fechaCita === mananaKey &&
      !['cerrado','completado','nollego','cancelo'].includes(o.estado)
    ).sort((a, b) => (a.horaCita || '').localeCompare(b.horaCita || ''));

    if (!misOTs.length && !manual) return;

    const lineas = misOTs.length
      ? misOTs.map(o => `  ${o.horaCita || '--:--'} - ${o.servicio || 'Servicio'} | ${o.patente || '—'} | ${o.clienteNombre || '—'}`).join('\n')
      : '  (Sin citas agendadas para mañana)';

    const msg = `Hola ${op.nombre} 👋, aquí tu agenda para ${mananaLabel}:\n\n${lineas}\n\nIntegral Automotriz Spa 🔧`;
    _admLogAlerta('resumen-dia', op.nombre, op.wz, msg, 'enviado');
    setTimeout(() => window.open('https://wa.me/' + op.wz.replace(/\D/g,'') + '?text=' + encodeURIComponent(msg), '_blank'), i * 900);
    enviados++;
  });

  _admSetStatus(enviados
    ? `✓ Resumen enviado a ${enviados} operario(s) para ${mananaLabel}.`
    : 'Sin operarios con WhatsApp o sin OTs mañana.');
  _admRenderLog();
}

// ===== ALERTA 2 — 30 MINUTOS ANTES DEL CLIENTE =====
function _admCheckAlerta30min() {
  const ahora  = new Date();
  const hoyKey = [ahora.getFullYear(), String(ahora.getMonth()+1).padStart(2,'0'), String(ahora.getDate()).padStart(2,'0')].join('-');
  const en30   = new Date(ahora.getTime() + 30 * 60000);
  const en30H  = en30.getHours().toString().padStart(2,'0') + ':' + en30.getMinutes().toString().padStart(2,'0');

  const ots = APP.lsGet('mp_ots', []).filter(o =>
    o.fechaCita === hoyKey &&
    o.horaCita  === en30H &&
    o.tecnico   &&
    !['cerrado','completado','nollego','cancelo'].includes(o.estado)
  );
  if (!ots.length) return;

  const ops = APP.lsGet('mp_operarios', []);
  ots.forEach(ot => {
    const key = ot.id + ':30min';
    if (_admAlertaSentSet.has(key)) return;
    _admAlertaSentSet.add(key);
    const op = ops.find(o => o.nombre === ot.tecnico && o.activo !== false && o.wz);
    if (!op) return;
    const msg = `⏰ En 30 min llega *${ot.clienteNombre || 'un cliente'}* con *${ot.patente || '—'}* para *${ot.servicio || 'servicio'}*. ¡Prepárate! 🔧`;
    _admLogAlerta('aviso-30min', op.nombre, op.wz, msg, 'enviado');
    window.open('https://wa.me/' + op.wz.replace(/\D/g,'') + '?text=' + encodeURIComponent(msg), '_blank');
    _admRenderLog();
  });
}

// ===== ALERTA 3 — POST-SERVICIO (Control de Garantía) =====
function _admScanPostServicio() {
  // Sólo cuenta pendientes y muestra el badge. No abre WA automáticamente.
  const cfg     = APP.lsGet('mp_alertas_config', { diasPost: 7 });
  const dias    = cfg.diasPost || 7;
  const log     = APP.lsGet('mp_alertas_log', []);
  const ots     = APP.lsGet('mp_ots', []).filter(o => o.estado === 'completado' && o.wz);
  const ahora   = Date.now();
  const pendientes = ots.filter(ot => {
    if (log.some(l => l.otId === ot.id && l.tipo === 'post-servicio')) return false;
    return (ahora - new Date(ot.salida_ts || ot.creado).getTime()) / 86400000 >= dias;
  });
  const el = document.getElementById('alerta-post-count');
  if (el) {
    el.textContent = pendientes.length
      ? `${pendientes.length} seguimiento(s) pendiente(s)`
      : 'Sin seguimientos pendientes';
    el.style.color = pendientes.length ? 'var(--text-accent)' : 'var(--text-muted)';
  }
}

function admEnviarPostServicio() {
  const cfg   = APP.lsGet('mp_alertas_config', { diasPost: 7 });
  const dias  = cfg.diasPost || 7;
  const log   = APP.lsGet('mp_alertas_log', []);
  const ots   = APP.lsGet('mp_ots', []).filter(o => o.estado === 'completado' && o.wz);
  const ahora = Date.now();
  let enviados = 0;

  ots.forEach((ot, i) => {
    const key = ot.id + ':post-servicio';
    if (_admAlertaSentSet.has(key)) return;
    if (log.some(l => l.otId === ot.id && l.tipo === 'post-servicio')) return;
    const diffDias = (ahora - new Date(ot.salida_ts || ot.creado).getTime()) / 86400000;
    if (diffDias < dias) return;

    _admAlertaSentSet.add(key);
    const n   = Math.floor(diffDias);
    const msg = `Hola ${ot.clienteNombre || 'Cliente'} 👋, hace ${n} día${n !== 1 ? 's' : ''} realizaste *${ot.servicio || 'un servicio'}* en Integral Automotriz.\n\n¿Quedaste satisfecho con el resultado? Cuéntanos 😊\n\n¡Gracias por preferirnos! 🔧\nhttps://integral-automotriz-spa.reservio.com/booking`;
    _admLogAlerta('post-servicio', ot.clienteNombre || '—', ot.wz, msg, 'enviado', ot.id);
    setTimeout(() => window.open('https://wa.me/' + ot.wz.replace(/\D/g,'') + '?text=' + encodeURIComponent(msg), '_blank'), i * 900);
    enviados++;
  });

  _admRenderLog();
  _admScanPostServicio();
  _admSetStatus(enviados
    ? `✓ ${enviados} mensaje(s) post-servicio enviados.`
    : 'Sin seguimientos pendientes (todos ya enviados o sin datos).');
}

// ===== LOG DE ALERTAS =====
function _admLogAlerta(tipo, destinatario, telefono, mensaje, estado, otId) {
  const log = APP.lsGet('mp_alertas_log', []);
  log.unshift({ id: 'al-' + Date.now(), ts: new Date().toISOString(), tipo, destinatario, telefono, mensaje, estado, ...(otId ? { otId } : {}) });
  if (log.length > 200) log.length = 200;
  APP.lsSet('mp_alertas_log', log);
}

function _admRenderLog() {
  const tbody = document.getElementById('adm-alertas-log-tbody');
  if (!tbody) return;
  const log = APP.lsGet('mp_alertas_log', []);
  if (!log.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:16px;font-size:11px">Sin alertas registradas aún.</td></tr>';
    return;
  }
  const tipoLabel = { 'resumen-dia':'📅 Resumen diario', 'aviso-30min':'⏰ Aviso 30 min', 'post-servicio':'⭐ Post-servicio' };
  tbody.innerHTML = log.slice(0, 60).map(l => {
    const dt = new Date(l.ts);
    const dtStr = dt.toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit'}) + ' ' + dt.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});
    return `<tr>
      <td style="font-size:10px;white-space:nowrap;color:var(--text-muted)">${dtStr}</td>
      <td style="font-size:10px;white-space:nowrap">${tipoLabel[l.tipo] || l.tipo}</td>
      <td style="font-size:11px">${_admEsc(l.destinatario || '—')}</td>
      <td style="font-size:10px;color:var(--text-muted);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_admEsc(l.mensaje || '')}">${_admEsc((l.mensaje || '').substring(0, 80))}${(l.mensaje || '').length > 80 ? '…' : ''}</td>
      <td><span class="st ${l.estado === 'enviado' ? 's-done' : 's-wait'}" style="font-size:9px"><span class="dot"></span>${l.estado}</span></td>
    </tr>`;
  }).join('');
}

function admLimpiarLog() {
  if (!confirm('¿Borrar todo el historial de alertas?')) return;
  APP.lsSet('mp_alertas_log', []);
  _admRenderLog();
  _admScanPostServicio();
}

function _admSetStatus(msg) {
  const el = document.getElementById('alerta-status');
  if (el) el.textContent = msg;
  setTimeout(() => { const e = document.getElementById('alerta-status'); if (e && e.textContent === msg) e.textContent = ''; }, 5000);
}

// ===== HELPERS =====
function _admSet(id, val) { const el = document.getElementById(id); if (el) el.textContent = val ?? ''; }

function _fmtM(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function _admEsc(str) {
  return (str == null ? '' : String(str)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
