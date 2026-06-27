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
let _admAlertaIntervalId  = null;
let _admAlertaResumenDate = '';
let _admAlertaSentSet     = new Set();

// ===== INIT =====
function init_admin() {
  _admActualizarBotonesPeriodo();
  _admKPIs();
  _admTablaServicios();
  _admTablaMecanicos();
  _admGraficoMensual();
  _admFrecuencia();
  _admCargarConfig();
  _admCargarConfigOperativa();
  _admRenderIntegraciones();
  _admPanelServicios();
  _admRenderOperarios();
  _admRenderUpselling();
  _admCargarAlertasConfig();
  _admRenderLog();
  _admScanPostServicio();
  _admIniciarMotorAlertas();
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
  if (!win) { alert('Permite ventanas emergentes para exportar el PDF.'); return; }
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

// ===== OPERARIOS =====
function _admRenderOperarios() {
  const lista = document.getElementById('adm-operarios-lista');
  if (!lista) return;
  const ops = APP.lsGet('mp_operarios', []);
  if (!ops.length) {
    lista.innerHTML = '<div style="color:var(--text-muted);font-size:11px;padding:6px 0">Sin mecánicos configurados. Usa el botón + para agregar.</div>';
    return;
  }
  const INP = `style="font-size:11px;border:0.5px solid var(--border);border-radius:var(--radius);padding:5px 8px;background:var(--surface-0);color:var(--text-primary);"`;
  lista.innerHTML = ops.map((op, i) => {
    const color  = op.color || _ADM_COLORES_OP[i % _ADM_COLORES_OP.length];
    const activo = op.activo !== false;
    return `<div style="display:flex;gap:8px;align-items:center;padding:8px 10px;background:var(--surface-1);border-radius:var(--radius)">
      <div title="Clic para cambiar color" onclick="admCambiarColorOp('${op.id}')"
        style="width:24px;height:24px;border-radius:50%;background:${color};cursor:pointer;flex-shrink:0;border:2px solid var(--border);opacity:${activo?1:0.4};transition:opacity .15s"></div>
      <input value="${_admEsc(op.nombre)}" placeholder="Nombre del mecánico" ${INP} style="flex:1;font-size:11px;border:0.5px solid var(--border);border-radius:var(--radius);padding:5px 8px;background:var(--surface-0);color:var(--text-primary)"
        onchange="admActualizarOp('${op.id}','nombre',this.value)">
      <input value="${_admEsc(op.wz || '')}" placeholder="+569XXXXXXXX" ${INP} style="width:148px;font-size:11px;font-family:var(--font-mono);border:0.5px solid var(--border);border-radius:var(--radius);padding:5px 8px;background:var(--surface-0);color:var(--text-primary)"
        onchange="admActualizarOp('${op.id}','wz',this.value)">
      <button class="btn${activo?' bpg':''}" style="font-size:10px;padding:4px 9px;white-space:nowrap"
        onclick="admToggleOperario('${op.id}')">${activo ? '✓ Activo' : '○ Inactivo'}</button>
      <button class="btn" style="padding:4px 7px;font-size:11px;flex-shrink:0"
        onclick="admEliminarOperario('${op.id}')"><i class="ti ti-x"></i></button>
    </div>`;
  }).join('');
}

function admAgregarOperario() {
  const ops = APP.lsGet('mp_operarios', []);
  ops.push({ id:'op-'+Date.now(), nombre:'', wz:'', color:_ADM_COLORES_OP[ops.length % _ADM_COLORES_OP.length], activo:true, creado:new Date().toISOString() });
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
  ops[idx].color = _ADM_COLORES_OP[(_ADM_COLORES_OP.indexOf(ops[idx].color) + 1) % _ADM_COLORES_OP.length];
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
  if (!confirm('¿Restaurar las reglas de upselling por defecto?')) return;
  APP.lsSet('mp_upselling_rules', JSON.parse(JSON.stringify(_ADM_UPSELL_DEFAULT)));
  _admRenderUpselling();
}

// ===== ALERTAS — CONFIG =====
function _admCargarAlertasConfig() {
  const cfg = APP.lsGet('mp_alertas_config', { horaResumen:'17:50', diasPost:7 });
  const hr  = document.getElementById('alerta-hora-resumen');
  const dp  = document.getElementById('alerta-dias-post');
  if (hr) hr.value = cfg.horaResumen || '17:50';
  if (dp) dp.value = String(cfg.diasPost || 7);
}

function admGuardarAlertasConfig() {
  APP.lsSet('mp_alertas_config', {
    horaResumen: document.getElementById('alerta-hora-resumen')?.value || '17:50',
    diasPost:    parseInt(document.getElementById('alerta-dias-post')?.value) || 7,
  });
}

// ===== MOTOR DE ALERTAS =====
function _admIniciarMotorAlertas() {
  if (_admAlertaIntervalId) return;
  _admAlertaIntervalId = setInterval(_admTickAlertas, 60000);
  _admActualizarMotorStatus();
  _admTickAlertas();
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
    el.innerHTML = '⚪ Inactivo'; el.style.color = 'var(--text-muted)';
  }
}

// ===== ALERTA 1 — RESUMEN DÍA SIGUIENTE =====
function _admCheckAlertaResumen() {
  const cfg     = APP.lsGet('mp_alertas_config', { horaResumen:'17:50' });
  const ahora   = new Date();
  const horaAct = ahora.getHours().toString().padStart(2,'0') + ':' + ahora.getMinutes().toString().padStart(2,'0');
  const hoyKey  = ahora.toISOString().split('T')[0];
  if (horaAct !== (cfg.horaResumen || '17:50')) return;
  if (_admAlertaResumenDate === hoyKey) return;
  _admAlertaResumenDate = hoyKey;
  _admEnviarResumen(false);
}

function admEnviarResumenManual() { _admEnviarResumen(true); }

function _admEnviarResumen(manual) {
  const ops = APP.lsGet('mp_operarios', []).filter(o => o.activo !== false && o.nombre && o.wz);
  if (!ops.length) { _admSetStatus('Sin operarios activos con WhatsApp configurado.'); return; }

  const manana    = new Date(); manana.setDate(manana.getDate() + 1);
  const mananaKey = [manana.getFullYear(), String(manana.getMonth()+1).padStart(2,'0'), String(manana.getDate()).padStart(2,'0')].join('-');
  const label     = manana.toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long' });
  const ots       = APP.lsGet('mp_ots', []);

  let enviados = 0;
  ops.forEach((op, i) => {
    const misOTs = ots.filter(o =>
      o.tecnico === op.nombre && o.fechaCita === mananaKey &&
      !['cerrado','completado','nollego','cancelo'].includes(o.estado)
    ).sort((a, b) => (a.horaCita || '').localeCompare(b.horaCita || ''));

    if (!misOTs.length && !manual) return;

    const lineas = misOTs.length
      ? misOTs.map(o => `  ${o.horaCita || '--:--'} - ${o.servicio || 'Servicio'} | ${o.patente || '—'} | ${o.clienteNombre || '—'}`).join('\n')
      : '  (Sin citas agendadas para mañana)';
    const msg = `Hola ${op.nombre} 👋, aquí tu agenda para ${label}:\n\n${lineas}\n\nIntegral Automotriz Spa 🔧`;
    _admLogAlerta('resumen-dia', op.nombre, op.wz, msg, 'enviado');
    setTimeout(() => window.open('https://wa.me/' + op.wz.replace(/\D/g,'') + '?text=' + encodeURIComponent(msg), '_blank'), i * 900);
    enviados++;
  });

  _admSetStatus(enviados ? `✓ Resumen enviado a ${enviados} operario(s) para ${label}.` : 'Sin operarios con agenda mañana.');
  _admRenderLog();
}

// ===== ALERTA 2 — 30 MIN =====
function _admCheckAlerta30min() {
  const ahora  = new Date();
  const hoyKey = [ahora.getFullYear(), String(ahora.getMonth()+1).padStart(2,'0'), String(ahora.getDate()).padStart(2,'0')].join('-');
  const en30   = new Date(ahora.getTime() + 30 * 60000);
  const en30H  = en30.getHours().toString().padStart(2,'0') + ':' + en30.getMinutes().toString().padStart(2,'0');

  const ots = APP.lsGet('mp_ots', []).filter(o =>
    o.fechaCita === hoyKey && o.horaCita === en30H && o.tecnico &&
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

// ===== ALERTA 3 — POST-SERVICIO =====
function _admScanPostServicio() {
  const cfg  = APP.lsGet('mp_alertas_config', { diasPost:7 });
  const dias = cfg.diasPost || 7;
  const log  = APP.lsGet('mp_alertas_log', []);
  const ots  = APP.lsGet('mp_ots', []).filter(o => o.estado === 'completado' && (o.wz || o.clienteWz));
  const ahora= Date.now();
  const pend = ots.filter(ot => {
    if (log.some(l => l.otId === ot.id && l.tipo === 'post-servicio')) return false;
    return (ahora - new Date(ot.salida_ts || ot.creado).getTime()) / 86400000 >= dias;
  });
  const el = document.getElementById('alerta-post-count');
  if (el) {
    el.textContent = pend.length ? `${pend.length} seguimiento(s) pendiente(s)` : 'Sin seguimientos pendientes';
    el.style.color = pend.length ? 'var(--text-accent)' : 'var(--text-muted)';
  }
}

function admEnviarPostServicio() {
  const cfg  = APP.lsGet('mp_alertas_config', { diasPost:7 });
  const dias = cfg.diasPost || 7;
  const log  = APP.lsGet('mp_alertas_log', []);
  const ots  = APP.lsGet('mp_ots', []).filter(o => o.estado === 'completado' && (o.wz || o.clienteWz));
  const ahora= Date.now();
  let enviados = 0;

  ots.forEach((ot, i) => {
    const key = ot.id + ':post-servicio';
    if (_admAlertaSentSet.has(key)) return;
    if (log.some(l => l.otId === ot.id && l.tipo === 'post-servicio')) return;
    if ((ahora - new Date(ot.salida_ts || ot.creado).getTime()) / 86400000 < dias) return;

    _admAlertaSentSet.add(key);
    const wz  = (ot.clienteWz || ot.wz || '').replace(/\D/g,'');
    if (!wz) return;
    const n   = Math.floor((ahora - new Date(ot.salida_ts || ot.creado).getTime()) / 86400000);
    const msg = `Hola ${ot.clienteNombre || 'Cliente'} 👋, hace ${n} día${n!==1?'s':''} realizaste *${ot.servicio || 'un servicio'}* en Integral Automotriz.\n\n¿Quedaste satisfecho con el resultado? Cuéntanos 😊\n\n¡Gracias por preferirnos! 🔧\nhttps://integral-automotriz-spa.reservio.com/booking`;
    _admLogAlerta('post-servicio', ot.clienteNombre || '—', ot.wz || ot.clienteWz, msg, 'enviado', ot.id);
    setTimeout(() => window.open('https://wa.me/' + wz + '?text=' + encodeURIComponent(msg), '_blank'), i * 900);
    enviados++;
  });

  _admRenderLog();
  _admScanPostServicio();
  _admSetStatus(enviados ? `✓ ${enviados} mensaje(s) post-servicio enviados.` : 'Sin seguimientos pendientes.');
}

// ===== LOG DE ALERTAS =====
function _admLogAlerta(tipo, destinatario, telefono, mensaje, estado, otId) {
  const log = APP.lsGet('mp_alertas_log', []);
  log.unshift({ id:'al-'+Date.now(), ts:new Date().toISOString(), tipo, destinatario, telefono, mensaje, estado, ...(otId ? { otId } : {}) });
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
    const dt    = new Date(l.ts);
    const dtStr = dt.toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit'}) + ' ' + dt.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});
    return `<tr>
      <td style="font-size:10px;white-space:nowrap;color:var(--text-muted)">${dtStr}</td>
      <td style="font-size:10px;white-space:nowrap">${tipoLabel[l.tipo] || l.tipo}</td>
      <td style="font-size:11px">${_admEsc(l.destinatario || '—')}</td>
      <td style="font-size:10px;color:var(--text-muted);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_admEsc(l.mensaje||'')}">${_admEsc((l.mensaje||'').substring(0,80))}${(l.mensaje||'').length>80?'…':''}</td>
      <td><span class="st ${l.estado==='enviado'?'s-done':'s-wait'}" style="font-size:9px"><span class="dot"></span>${l.estado}</span></td>
    </tr>`;
  }).join('');
}

function admLimpiarLog() {
  if (!confirm('¿Borrar todo el historial de alertas?')) return;
  APP.lsSet('mp_alertas_log', []);
  _admRenderLog();
  _admScanPostServicio();
}

// ===== HELPERS =====
function _admSet(id, val) { const el = document.getElementById(id); if (el) el.textContent = val ?? ''; }

function _admSetStatus(msg) {
  const el = document.getElementById('alerta-status');
  if (el) el.textContent = msg;
  setTimeout(() => { const e = document.getElementById('alerta-status'); if (e && e.textContent === msg) e.textContent = ''; }, 5000);
}

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
