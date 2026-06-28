function init_reportes() {
  repRenderEficiencia();
}

function repRenderEficiencia() {
  const tbody = document.getElementById('rep-efic-tbody');
  if (!tbody) return;

  const svcs = APP.lsGet('mp_servicios', []);
  const ots  = APP.lsGet('mp_ots', []).filter(o => o.estado === 'completado');

  const rows = svcs.map(svc => {
    const ejecs = ots.filter(o => (o.servicio||'').trim() === svc.nombre.trim() && o.tiempoReal > 0);
    if (!ejecs.length) return null;

    const horasEstMin = (svc.horasEst || 0) * 60;
    const sumReal     = ejecs.reduce((a, o) => a + o.tiempoReal, 0);
    const avgReal     = sumReal / ejecs.length;
    const eficProm    = horasEstMin > 0 ? Math.round(horasEstMin / avgReal * 100) : null;

    let tendencia = '—';
    if (ejecs.length >= 4) {
      const mitad = Math.floor(ejecs.length / 2);
      const prim  = ejecs.slice(0, mitad).reduce((a,o) => a+o.tiempoReal, 0) / mitad;
      const seg   = ejecs.slice(mitad).reduce((a,o) => a+o.tiempoReal, 0) / (ejecs.length - mitad);
      tendencia   = seg < prim * 0.95 ? '↑ Mejorando' : seg > prim * 1.05 ? '↓ Empeorando' : '→ Estable';
    }

    const ultimas = ejecs.slice(-5).map(o =>
      horasEstMin > 0 ? Math.round(horasEstMin / o.tiempoReal * 100) : null
    ).filter(Boolean);

    return { svc, count:ejecs.length, avgReal, eficProm, tendencia, ultimas };
  }).filter(Boolean).sort((a, b) => (b.eficProm||0) - (a.eficProm||0));

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;font-size:11px">Sin OTs completadas con tiempo real registrado.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const cE = !r.eficProm ? 'var(--text-muted)'
      : r.eficProm >= 95 ? 'var(--text-success)'
      : r.eficProm >= 75 ? 'var(--text-warning)'
      : 'var(--text-danger)';
    const cT = r.tendencia.startsWith('↑') ? 'var(--text-success)'
      : r.tendencia.startsWith('↓') ? 'var(--text-danger)' : 'var(--text-muted)';
    const sparkline = r.ultimas.map(v => {
      const c = v >= 95 ? '#10b981' : v >= 75 ? '#f59e0b' : '#ef4444';
      return `<span style="display:inline-block;width:13px;height:${Math.min(20,Math.round(v/5))}px;background:${c};border-radius:1px;vertical-align:bottom;margin-right:1px" title="${v}%"></span>`;
    }).join('');
    return `<tr>
      <td style="font-size:11px;font-weight:500">${_repEsc(r.svc.nombre)}</td>
      <td style="text-align:center">${r.count}</td>
      <td style="font-size:11px;color:var(--text-muted)">${r.svc.horasEst ? r.svc.horasEst + 'h' : '—'}</td>
      <td style="font-size:11px;color:var(--text-muted)">${_repFmtH(r.avgReal)}</td>
      <td style="color:${cE};font-weight:600;text-align:center">${r.eficProm != null ? r.eficProm + '%' : '—'}</td>
      <td style="color:${cT};font-size:11px;white-space:nowrap">${r.tendencia} ${sparkline}</td>
    </tr>`;
  }).join('');
}

function _repFmtH(min) {
  if (!min) return '—';
  return Math.floor(min / 60) + 'h ' + Math.round(min % 60) + 'm';
}

function _repEsc(str) {
  return (str == null ? '' : String(str)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
