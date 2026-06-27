// ===== MÓDULO: ADMIN (Reportes, Configuración) =====

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

function init_admin() {
  _admKPIs();
  _admTablaServicios();
  _admTablaMecanicos();
  _admCargarConfig();
  _admRenderIntegraciones();
  _admPanelServicios();
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

  // OTs completadas
  const completadas    = ots.filter(o => o.estado === 'completado');
  const compMes        = completadas.filter(o => esMes(o.salida_ts || o.creado, mesAct, anioAct));
  const compPrevMes    = completadas.filter(o => esMes(o.salida_ts || o.creado, mesPrev, anioPrev));
  const diffOTs        = compMes.length - compPrevMes.length;
  _admSet('adm-kpi-ots',     completadas.length || compMes.length);
  _admSet('adm-kpi-ots-sub', (diffOTs >= 0 ? '+' : '') + diffOTs + ' vs mes anterior');

  // Ingresos (completadas con valor)
  const conValor   = completadas.filter(o => parseFloat(o.valorTotal || o.valor) > 0);
  const ingTotal   = conValor.reduce((s, o) => s + (parseFloat(o.valorTotal || o.valor) || 0), 0);
  const ingMes     = conValor.filter(o => esMes(o.salida_ts || o.creado, mesAct, anioAct))
                             .reduce((s, o) => s + (parseFloat(o.valorTotal || o.valor) || 0), 0);
  const ingPrev    = conValor.filter(o => esMes(o.salida_ts || o.creado, mesPrev, anioPrev))
                             .reduce((s, o) => s + (parseFloat(o.valorTotal || o.valor) || 0), 0);
  const pctIng     = ingPrev > 0 ? Math.round((ingMes - ingPrev) / ingPrev * 100) : 0;
  _admSet('adm-kpi-ingresos', _fmtM(ingTotal || ingMes));
  _admSet('adm-kpi-ing-sub',  pctIng !== 0 ? (pctIng > 0 ? '+' : '') + pctIng + '% vs mes anterior' : 'acumulado');

  // Clientes nuevos
  const cliMes  = clientes.filter(c => c.creado && esMes(c.creado, mesAct, anioAct));
  const cliPrev = clientes.filter(c => c.creado && esMes(c.creado, mesPrev, anioPrev));
  _admSet('adm-kpi-clientes', cliMes.length || clientes.length);
  _admSet('adm-kpi-cli-sub',  '+' + Math.max(0, cliMes.length - cliPrev.length) + ' vs mes anterior');

  // Rentabilidad/hora
  const conTiempo   = completadas.filter(o => o.tiempoReal > 0 && parseFloat(o.valorTotal || o.valor) > 0);
  const totalMin    = conTiempo.reduce((s, o) => s + o.tiempoReal, 0);
  const totalIngH   = conTiempo.reduce((s, o) => s + (parseFloat(o.valorTotal || o.valor) || 0), 0);
  const rentH       = totalMin > 0 ? Math.round(totalIngH / (totalMin / 60)) : 0;
  _admSet('adm-kpi-renth',     rentH ? _fmtM(rentH) + '/h' : '—');
  _admSet('adm-kpi-renth-sub', conTiempo.length ? conTiempo.length + ' OTs con tiempo real' : 'sin datos de tiempo aún');

  // Satisfacción (estático — sin sistema de reseñas implementado)
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

  // Agrupar por servicio
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
    const color = !r.rentH         ? 'var(--text-muted)'
      : r.rentH >= maxR * 0.85     ? 'var(--text-success)'
      : r.rentH >= maxR * 0.55     ? 'var(--text-warning)'
      : 'var(--text-danger)';
    return `<tr>
      <td>${_admEsc(r.svc)}</td>
      <td>${r.count}</td>
      <td>${_fmtM(r.ingresos)}</td>
      <td style="color:${color};font-weight:500">${r.rentH ? _fmtM(r.rentH) + '/h' : '—'}</td>
    </tr>`;
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
    if (o.estado === 'completado') {
      map[k].completadas++;
      map[k].ingresos += parseFloat(o.valorTotal || o.valor) || 0;
    }
  });

  const rows = Object.entries(map)
    .map(([tec, d]) => ({ tec, ...d }))
    .sort((a, b) => b.ingresos - a.ingresos);

  tbody.innerHTML = rows.map(r => {
    const pct = r.total > 0 ? Math.round(r.completadas / r.total * 100) : 0;
    const color = pct >= 80 ? 'var(--text-success)' : pct >= 50 ? 'var(--text-warning)' : 'var(--text-muted)';
    return `<tr>
      <td>${_admEsc(r.tec)}</td>
      <td>${r.total}</td>
      <td>${_fmtM(r.ingresos)}</td>
      <td style="color:${color};font-weight:500">${pct}%</td>
    </tr>`;
  }).join('');
}

// ===== EXPORTAR PDF =====
function admExportarPDF() {
  const ots = APP.lsGet('mp_ots', []);
  const cfg = APP.lsGet('mp_taller_config', _ADM_CFG_DEFAULT);

  const completadas = ots.filter(o => o.estado === 'completado' && parseFloat(o.valorTotal || o.valor) > 0);
  const ingTotal    = completadas.reduce((s, o) => s + (parseFloat(o.valorTotal || o.valor) || 0), 0);
  const clientes    = APP.lsGet('mp_clientes', []).length;

  // Tabla servicios
  const svcMap = {};
  completadas.forEach(o => {
    const k = o.servicio || 'Sin clasificar';
    if (!svcMap[k]) svcMap[k] = { count:0, ingresos:0, minutos:0 };
    svcMap[k].count++;
    svcMap[k].ingresos += parseFloat(o.valorTotal || o.valor) || 0;
    if (o.tiempoReal > 0) svcMap[k].minutos += o.tiempoReal;
  });
  const svcRows = Object.entries(svcMap).sort((a,b) => b[1].ingresos - a[1].ingresos);

  // Tabla mecánicos
  const mecMap = {};
  ots.forEach(o => {
    const k = o.tecnico || 'Sin asignar';
    if (!mecMap[k]) mecMap[k] = { total:0, comp:0, ing:0 };
    mecMap[k].total++;
    if (o.estado === 'completado') { mecMap[k].comp++; mecMap[k].ing += parseFloat(o.valorTotal || o.valor) || 0; }
  });
  const mecRows = Object.entries(mecMap).sort((a,b) => b[1].ing - a[1].ing);

  const fmtNum = n => n ? '$' + Math.round(n).toLocaleString('es-CL') : '—';
  const fecha  = new Date().toLocaleDateString('es-CL', { day:'numeric', month:'long', year:'numeric' });

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Reporte — ${_admEsc(cfg.nombre)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,sans-serif;font-size:12px;color:#1a1a18;padding:32px}
    h1{font-size:20px;font-weight:600;margin-bottom:4px}
    .sub{color:#888;font-size:11px;margin-bottom:24px}
    .kgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:24px}
    .kcard{background:#f3f2ec;border-radius:8px;padding:12px}
    .kl{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
    .kv{font-size:18px;font-weight:600}
    h2{font-size:13px;font-weight:600;margin:20px 0 8px;padding-bottom:4px;border-bottom:1px solid #e5e3dc}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    th{text-align:left;font-size:9px;color:#888;padding:5px 0;border-bottom:1px solid #e5e3dc;text-transform:uppercase;letter-spacing:.04em}
    td{padding:6px 0;border-bottom:0.5px solid #e5e3dc;font-size:11px}
    @media print{@page{margin:20mm}button{display:none}}
  </style></head><body>
  <h1>${_admEsc(cfg.nombre)}</h1>
  <div class="sub">Reporte generado el ${fecha} · ${_admEsc(cfg.direccion || '')}${cfg.rut ? ' · RUT ' + _admEsc(cfg.rut) : ''}</div>

  <div class="kgrid">
    <div class="kcard"><div class="kl">OTs completadas</div><div class="kv">${completadas.length}</div></div>
    <div class="kcard"><div class="kl">Ingresos totales</div><div class="kv">${_fmtM(ingTotal)}</div></div>
    <div class="kcard"><div class="kl">Total clientes</div><div class="kv">${clientes}</div></div>
    <div class="kcard"><div class="kl">Total OTs</div><div class="kv">${ots.length}</div></div>
    <div class="kcard"><div class="kl">Satisfacción</div><div class="kv">4.8 ★</div></div>
  </div>

  <h2>Servicios más rentables</h2>
  ${svcRows.length ? `<table><thead><tr><th>Servicio</th><th>OTs</th><th>Ingreso total</th><th>Rent./hora (tiempo real)</th></tr></thead><tbody>
  ${svcRows.map(([s,d]) => {
    const rh = d.minutos > 0 ? fmtNum(Math.round(d.ingresos / (d.minutos / 60))) + '/h' : '—';
    return `<tr><td>${_admEsc(s)}</td><td>${d.count}</td><td>${fmtNum(d.ingresos)}</td><td>${rh}</td></tr>`;
  }).join('')}</tbody></table>` : '<p style="color:#888;font-size:11px">Sin datos de OTs completadas.</p>'}

  <h2>Rendimiento por mecánico</h2>
  ${mecRows.length ? `<table><thead><tr><th>Mecánico</th><th>Total OTs</th><th>Completadas</th><th>Ingresos</th><th>% completadas</th></tr></thead><tbody>
  ${mecRows.map(([t,d]) => `<tr><td>${_admEsc(t)}</td><td>${d.total}</td><td>${d.comp}</td><td>${fmtNum(d.ing)}</td><td>${d.total > 0 ? Math.round(d.comp/d.total*100) : 0}%</td></tr>`).join('')}
  </tbody></table>` : '<p style="color:#888;font-size:11px">Sin datos.</p>'}
  </body></html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Permite ventanas emergentes para exportar el PDF.'); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

// ===== EXPORTAR EXCEL (CSV con BOM) =====
function admExportarExcel() {
  const ots = APP.lsGet('mp_ots', []);
  const cfg = APP.lsGet('mp_taller_config', _ADM_CFG_DEFAULT);

  // Sección KPIs
  const completadas = ots.filter(o => o.estado === 'completado');
  const ingTotal    = completadas.reduce((s, o) => s + (parseFloat(o.valorTotal || o.valor) || 0), 0);

  // Sección servicios
  const svcMap = {};
  completadas.filter(o => parseFloat(o.valorTotal || o.valor) > 0).forEach(o => {
    const k = o.servicio || 'Sin clasificar';
    if (!svcMap[k]) svcMap[k] = { count:0, ingresos:0, minutos:0 };
    svcMap[k].count++;
    svcMap[k].ingresos += parseFloat(o.valorTotal || o.valor) || 0;
    if (o.tiempoReal > 0) svcMap[k].minutos += o.tiempoReal;
  });

  // Sección mecánicos
  const mecMap = {};
  ots.forEach(o => {
    const k = o.tecnico || 'Sin asignar';
    if (!mecMap[k]) mecMap[k] = { total:0, comp:0, ing:0 };
    mecMap[k].total++;
    if (o.estado === 'completado') { mecMap[k].comp++; mecMap[k].ing += parseFloat(o.valorTotal || o.valor) || 0; }
  });

  const rows = [
    [cfg.nombre || 'MecánicaPro — Reporte'],
    ['Generado el', new Date().toLocaleDateString('es-CL')],
    [],
    ['RESUMEN'],
    ['OTs completadas', completadas.length],
    ['Ingresos totales', ingTotal],
    ['Total OTs', ots.length],
    [],
    ['SERVICIOS MÁS RENTABLES'],
    ['Servicio', 'OTs', 'Ingreso total ($)', 'Rent./hora (tiempo real $)'],
    ...Object.entries(svcMap).sort((a,b) => b[1].ingresos - a[1].ingresos).map(([s,d]) => [
      s, d.count, Math.round(d.ingresos),
      d.minutos > 0 ? Math.round(d.ingresos / (d.minutos / 60)) : '',
    ]),
    [],
    ['RENDIMIENTO POR MECÁNICO'],
    ['Mecánico', 'Total OTs', 'Completadas', 'Ingresos ($)', '% completadas'],
    ...Object.entries(mecMap).sort((a,b) => b[1].ing - a[1].ing).map(([t,d]) => [
      t, d.total, d.comp, Math.round(d.ing),
      d.total > 0 ? Math.round(d.comp / d.total * 100) + '%' : '0%',
    ]),
    [],
    ['DETALLE COMPLETO DE OTs'],
    ['OT', 'Fecha', 'Patente', 'Cliente', 'Servicio', 'Técnico', 'Valor ($)', 'Tiempo real (min)', 'Estado'],
    ...ots.map(o => [
      o.id, o.creado ? new Date(o.creado).toLocaleDateString('es-CL') : '',
      o.patente || '', o.clienteNombre || '', o.servicio || '',
      o.tecnico || '', Math.round(parseFloat(o.valorTotal || o.valor) || 0),
      o.tiempoReal || '', o.estado,
    ]),
  ];

  const csv  = rows.map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'reporte-mecanicapro-' + new Date().toISOString().split('T')[0] + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== CONFIGURACIÓN — cargar =====
function _admCargarConfig() {
  const cfg = APP.lsGet('mp_taller_config', _ADM_CFG_DEFAULT);
  const s   = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  s('cfg-nombre',    cfg.nombre);
  s('cfg-rut',       cfg.rut);
  s('cfg-direccion', cfg.direccion);
  s('cfg-telefono',  cfg.telefono);
  s('cfg-agenda',    cfg.agenda);
}

// ===== CONFIGURACIÓN — guardar =====
function admGuardarConfig() {
  const g   = id => (document.getElementById(id)?.value || '').trim();
  const cfg = {
    nombre:    g('cfg-nombre')    || _ADM_CFG_DEFAULT.nombre,
    rut:       g('cfg-rut'),
    direccion: g('cfg-direccion'),
    telefono:  g('cfg-telefono'),
    agenda:    g('cfg-agenda'),
  };
  APP.lsSet('mp_taller_config', cfg);

  const btn = document.getElementById('cfg-btn-guardar');
  if (btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="ti ti-check"></i>Guardado ✓';
    btn.disabled  = true;
    setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 2000);
  }
}

// ===== INTEGRACIONES =====
function _admRenderIntegraciones() {
  const el = document.getElementById('adm-integraciones');
  if (!el) return;

  const saved = APP.lsGet('mp_integraciones', {});

  el.innerHTML = _ADM_INTEGRACIONES.map(int => {
    const activa = saved[int.id] !== undefined ? saved[int.id] : int.activa;
    const badge  = activa
      ? `<span class="st s-done" style="cursor:pointer;user-select:none" onclick="admToggleInt('${int.id}')"><span class="dot"></span>Activa</span>`
      : `<span class="st s-wait" style="cursor:pointer;user-select:none" onclick="admToggleInt('${int.id}')"><span class="dot"></span>Pendiente</span>`;
    const waStyle = int.id === 'whatsapp' ? ';color:#25d366' : '';
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px;background:var(--surface-1);border-radius:var(--radius)">
      <div>
        <div style="font-size:12px;font-weight:500"><i class="ti ${int.icono}" style="font-size:12px${waStyle}"></i> ${int.nombre}</div>
        <div style="font-size:10px;color:var(--text-muted)">${int.desc}</div>
      </div>
      ${badge}
    </div>`;
  }).join('');
}

function admToggleInt(id) {
  const saved  = APP.lsGet('mp_integraciones', {});
  const def    = _ADM_INTEGRACIONES.find(i => i.id === id);
  const actual = saved[id] !== undefined ? saved[id] : (def?.activa ?? false);
  saved[id]    = !actual;
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
  if (lista) {
    lista.innerHTML = servicios.length
      ? servicios.map(s => `<span class="tag" style="margin:2px">${_admEsc(s.nombre)}</span>`).join('')
      : '<span style="font-size:11px;color:var(--text-muted)">Sin servicios. Ve al módulo Servicios para crear el catálogo.</span>';
  }
}

// ===== HELPERS =====
function _admSet(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '';
}

function _fmtM(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function _admEsc(str) {
  return (str == null ? '' : String(str))
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
