// ===== MÓDULO: SERVICIOS =====
// Catálogo → Admin > Configuración
// Este módulo gestiona: Eficiencia por servicio + Proveedores

let _svcProvEdit = null;

// ===== INIT =====
function init_servicios() {
  svcSetTab('efic');
  svcRenderEficiencia();
  svcRenderProveedores();
  _svcPatchTallerSelect();

  const area = document.getElementById('content-area');
  if (area && !area.dataset.svcObserving) {
    area.dataset.svcObserving = '1';
    new MutationObserver(() => _svcPatchTallerSelect()).observe(area, { childList:true, subtree:true });
  }
}

// ===== TABS (efic | prov) =====
function svcSetTab(tab) {
  ['efic','prov'].forEach(t => {
    const cnt = document.getElementById('svc-tab-' + t);
    const btn = document.getElementById('svc-tab-btn-' + t);
    if (cnt) cnt.style.display = t === tab ? '' : 'none';
    if (btn) {
      btn.style.borderBottomColor = t === tab ? 'var(--fill-accent)' : 'transparent';
      btn.style.color = t === tab ? 'var(--text-accent)' : 'var(--text-secondary)';
    }
  });
  if (tab === 'efic') svcRenderEficiencia();
  if (tab === 'prov') svcRenderProveedores();
}

// ===== REPORTE DE EFICIENCIA =====
function svcRenderEficiencia() {
  const tbody = document.getElementById('svc-efic-tbody');
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
      <td style="font-size:11px;font-weight:500">${_esc(r.svc.nombre)}</td>
      <td style="text-align:center">${r.count}</td>
      <td style="font-size:11px;color:var(--text-muted)">${r.svc.horasEst ? r.svc.horasEst + 'h' : '—'}</td>
      <td style="font-size:11px;color:var(--text-muted)">${_svcFmtH(r.avgReal)}</td>
      <td style="color:${cE};font-weight:600;text-align:center">${r.eficProm != null ? r.eficProm + '%' : '—'}</td>
      <td style="color:${cT};font-size:11px;white-space:nowrap">${r.tendencia} ${sparkline}</td>
    </tr>`;
  }).join('');
}

// ===== GESTIÓN DE PROVEEDORES =====
function svcRenderProveedores() {
  const lista = document.getElementById('svc-prov-lista');
  if (!lista) return;
  const provs = APP.lsGet('mp_proveedores', []);

  if (!provs.length) {
    lista.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:11px">
      <i class="ti ti-building-store" style="font-size:28px;display:block;margin-bottom:8px;opacity:.3"></i>
      Sin proveedores. Agrega el primero con el botón de arriba.
    </div>`;
    return;
  }

  const svcs = APP.lsGet('mp_servicios', []);
  lista.innerHTML = provs.map(p => {
    const svcVinc = svcs.filter(s => (s.proveedoresIds||[]).includes(p.id));
    return `<div class="card" style="margin-bottom:10px">
      <div class="ch" style="margin-bottom:8px">
        <div>
          <div style="font-size:13px;font-weight:500">${_esc(p.nombre)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${_esc(p.rubro||'—')}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          ${p.wz ? `<a href="https://wa.me/${p.wz.replace(/\D/g,'')}" target="_blank" class="btn bpw" style="font-size:11px;padding:4px 10px"><i class="ti ti-brand-whatsapp"></i> WA</a>` : ''}
          <button class="btn" style="font-size:11px;padding:4px 9px" onclick="svcProvEditar('${p.id}')"><i class="ti ti-pencil"></i></button>
          <button class="btn" style="font-size:11px;padding:4px 7px;color:var(--text-danger)" onclick="svcProvEliminar('${p.id}')"><i class="ti ti-trash"></i></button>
        </div>
      </div>
      <div style="margin-bottom:8px">
        <div style="font-size:10px;color:var(--text-muted);font-weight:500;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px">Servicios que abastece</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">
          ${svcVinc.map(s => `<span class="tag" style="font-size:10px">${_esc(s.nombre)} <span style="cursor:pointer;color:var(--text-danger)" onclick="svcProvDesvincular('${p.id}','${s.id}')">×</span></span>`).join('') || '<span style="font-size:11px;color:var(--text-muted)">Ninguno vinculado</span>'}
        </div>
        <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
          <select id="svc-prov-link-${p.id}" style="font-size:11px;border:0.5px solid var(--border);border-radius:var(--radius);padding:4px 7px;background:var(--surface-1);color:var(--text-primary)">
            <option value="">Vincular servicio…</option>
            ${svcs.filter(s => !(s.proveedoresIds||[]).includes(p.id)).map(s => `<option value="${s.id}">${_esc(s.nombre)}</option>`).join('')}
          </select>
          <button class="btn" style="font-size:11px;padding:4px 9px" onclick="svcProvVincular('${p.id}')"><i class="ti ti-link"></i> Vincular</button>
        </div>
      </div>
      ${svcVinc.length ? `<button class="btn bpw" style="font-size:11px;padding:5px 12px" onclick="svcProvCotizarWA('${p.id}')">
        <i class="ti ti-brand-whatsapp"></i> Cotizar todos los repuestos por WA
      </button>` : ''}
    </div>`;
  }).join('');
}

function svcProvNuevo() {
  _svcProvEdit = null;
  ['svc-prov-f-nombre','svc-prov-f-wz'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const r = document.getElementById('svc-prov-f-rubro'); if (r) r.value = '';
  document.getElementById('svc-prov-panel-titulo').textContent = 'Nuevo proveedor';
  document.getElementById('svc-prov-panel').style.display = 'block';
  document.getElementById('svc-prov-panel').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function svcProvEditar(id) {
  const prov = APP.lsGet('mp_proveedores', []).find(p => p.id === id);
  if (!prov) return;
  _svcProvEdit = id;
  const s = (elId, v) => { const e = document.getElementById(elId); if (e) e.value = v||''; };
  s('svc-prov-f-nombre', prov.nombre);
  s('svc-prov-f-rubro',  prov.rubro);
  s('svc-prov-f-wz',     prov.wz);
  document.getElementById('svc-prov-panel-titulo').textContent = 'Editar: ' + prov.nombre;
  document.getElementById('svc-prov-panel').style.display = 'block';
  document.getElementById('svc-prov-panel').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function svcProvCerrarPanel() {
  document.getElementById('svc-prov-panel').style.display = 'none';
  _svcProvEdit = null;
}

function svcProvGuardar() {
  const g = id => (document.getElementById(id)?.value||'').trim();
  const nombre = g('svc-prov-f-nombre');
  if (!nombre) { alert('Ingresa el nombre del proveedor.'); return; }
  const provs = APP.lsGet('mp_proveedores', []);
  const dato  = { nombre, rubro:g('svc-prov-f-rubro'), wz:g('svc-prov-f-wz') };
  if (_svcProvEdit) {
    const idx = provs.findIndex(p => p.id === _svcProvEdit);
    if (idx >= 0) provs[idx] = { ...provs[idx], ...dato };
  } else {
    provs.push({ id:'prov-'+Date.now(), ...dato, creado:new Date().toISOString() });
  }
  APP.lsSet('mp_proveedores', provs);
  svcProvCerrarPanel();
  svcRenderProveedores();
}

function svcProvEliminar(id) {
  if (!confirm('¿Eliminar este proveedor?')) return;
  APP.lsSet('mp_proveedores', APP.lsGet('mp_proveedores',[]).filter(p => p.id !== id));
  const svcs = APP.lsGet('mp_servicios', []);
  svcs.forEach(s => { if (s.proveedoresIds) s.proveedoresIds = s.proveedoresIds.filter(i => i !== id); });
  APP.lsSet('mp_servicios', svcs);
  svcRenderProveedores();
}

function svcProvVincular(provId) {
  const sel   = document.getElementById('svc-prov-link-' + provId);
  const svcId = sel?.value;
  if (!svcId) return;
  const svcs = APP.lsGet('mp_servicios', []);
  const idx  = svcs.findIndex(s => s.id === svcId);
  if (idx < 0) return;
  if (!svcs[idx].proveedoresIds) svcs[idx].proveedoresIds = [];
  if (!svcs[idx].proveedoresIds.includes(provId)) svcs[idx].proveedoresIds.push(provId);
  APP.lsSet('mp_servicios', svcs);
  svcRenderProveedores();
}

function svcProvDesvincular(provId, svcId) {
  const svcs = APP.lsGet('mp_servicios', []);
  const idx  = svcs.findIndex(s => s.id === svcId);
  if (idx >= 0 && svcs[idx].proveedoresIds) {
    svcs[idx].proveedoresIds = svcs[idx].proveedoresIds.filter(i => i !== provId);
    APP.lsSet('mp_servicios', svcs);
    svcRenderProveedores();
  }
}

function svcProvCotizarWA(provId) {
  const prov = APP.lsGet('mp_proveedores', []).find(p => p.id === provId);
  if (!prov || !prov.wz) { alert('Este proveedor no tiene WhatsApp configurado.'); return; }
  const svcs = APP.lsGet('mp_servicios', []).filter(s => (s.proveedoresIds||[]).includes(provId));
  if (!svcs.length) { alert('Sin servicios vinculados a este proveedor.'); return; }

  const items = [];
  svcs.forEach(s => {
    (s.repuestosSugeridos||[]).forEach(r => {
      items.push(`• ${r.nombre} × ${r.cantidad} ${r.unidad} (${s.nombre})`);
    });
  });
  if (!items.length) { alert('Los servicios vinculados no tienen repuestos sugeridos.'); return; }

  const cfg    = APP.lsGet('mp_taller_config', {});
  const taller = cfg.nombre || 'Integral Automotriz Spa';
  const wz     = cfg.telefono || '+569 5165 5331';
  const msg    = [
    'Hola ' + prov.nombre + ',',
    '',
    'Necesitamos cotización para los siguientes repuestos:',
    '',
    ...items,
    '',
    'Por favor enviar precio y disponibilidad.',
    '¡Gracias! — ' + taller + ' ' + wz,
  ].join('\n');

  window.open('https://wa.me/' + prov.wz.replace(/\D/g,'') + '?text=' + encodeURIComponent(msg), '_blank');
}

// ===== INTEGRACIÓN CON FORMULARIO OT (parcha el select de servicio) =====
function _svcPatchTallerSelect() {
  // El nuevo formulario OT usa datalist (n-serv-lista), no un <select> fijo.
  // Mantenemos compatibilidad con el selector legacy c-serv si existiera.
  const cServ = document.getElementById('c-serv');
  if (cServ && !cServ.dataset.svcPatched) {
    cServ.dataset.svcPatched = '1';
    _svcUpdateTallerSelect(cServ);
    cServ.addEventListener('change', _svcOnServicioChange);
  }
  const dServ = document.getElementById('det-serv');
  if (dServ && !dServ.dataset.svcPatched) {
    dServ.dataset.svcPatched = '1';
    _svcUpdateTallerSelect(dServ);
  }
  // Actualizar datalist de servicios en nueva OT
  _svcUpdateServDatalist();
}

function _svcUpdateServDatalist() {
  const dl = document.getElementById('n-serv-dl');
  if (!dl) return;
  const svcs = APP.lsGet('mp_servicios', []);
  dl.innerHTML = svcs.map(s => `<option value="${_esc(s.nombre)}">`).join('');
}

function _svcUpdateTallerSelect(el) {
  const targets = el ? [el] : [document.getElementById('c-serv'), document.getElementById('det-serv')].filter(Boolean);
  const todos   = APP.lsGet('mp_servicios', []);
  if (!todos.length) return;

  const ESTATICOS = ['Mantención 10.000 km','Cambio de embrague','Diagnóstico scanner',
    'Cambio de frenos','Alineación y balanceo','Cambio aceite + filtros','Otro'];
  const nombres = todos.map(s => s.nombre);

  targets.forEach(sel => {
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '';
    const cats = [...new Set(todos.map(s => s.categoria))];
    cats.forEach(cat => {
      const group = document.createElement('optgroup');
      group.label = cat;
      todos.filter(s => s.categoria === cat).forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.nombre; opt.textContent = s.nombre;
        group.appendChild(opt);
      });
      sel.appendChild(group);
    });
    const extras = ESTATICOS.filter(n => !nombres.includes(n));
    if (extras.length) {
      const group = document.createElement('optgroup');
      group.label = 'Otros';
      extras.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n; opt.textContent = n;
        group.appendChild(opt);
      });
      sel.appendChild(group);
    }
    if ([...sel.options].some(o => o.value === current)) sel.value = current;
  });
}

function _svcOnServicioChange() {
  const sel = document.getElementById('c-serv');
  if (!sel) return;
  const svc = APP.lsGet('mp_servicios', []).find(s => s.nombre === sel.value);
  if (!svc) { _svcOcultarSugerencias(); return; }
  _svcMostrarSugerencias(svc);
}

function _svcMostrarSugerencias(svc) {
  let box = document.getElementById('svc-sug-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'svc-sug-box';
    const ref = document.getElementById('precot-box') || document.getElementById('c-notas');
    if (ref) ref.parentNode.insertBefore(box, ref); else return;
  }
  const cfg    = APP.lsGet('mp_config', {});
  const tarifa = cfg.tarifaHora || 0;
  const precio = svc.precioFijo || (tarifa && svc.horasEst ? Math.round(tarifa * svc.horasEst) : null);
  const conIva = svc.precioConIva && precio ? Math.round(precio * 1.19) : precio;
  const reps   = svc.repuestosSugeridos || [];

  box.style.cssText = 'margin-top:8px;margin-bottom:8px;padding:10px 12px;background:var(--bg-accent);border:0.5px solid var(--border-accent);border-radius:var(--radius)';
  box.style.display = '';
  box.innerHTML = `
    <div style="font-size:11px;font-weight:500;color:var(--text-accent);margin-bottom:5px"><i class="ti ti-tools" style="font-size:12px;vertical-align:-2px"></i> ${_esc(svc.nombre)} — del catálogo</div>
    <div style="font-size:11px;color:var(--text-accent);display:flex;gap:14px;flex-wrap:wrap">
      <span>⏱ ${svc.horasEst || '?'}h est.</span>
      ${conIva ? `<span>💰 $${conIva.toLocaleString('es-CL')} ${svc.precioConIva ? '(c/IVA)' : svc.precioFijo ? '(fijo)' : 'M.O.'}</span>` : ''}
      ${reps.length ? `<span>🔩 ${reps.length} repuesto${reps.length !== 1 ? 's' : ''} sugerido${reps.length !== 1 ? 's' : ''}</span>` : ''}
    </div>
    ${reps.length ? `<div style="margin-top:5px;font-size:10px;color:var(--text-accent);opacity:.85">${reps.map(r => _esc(r.nombre) + ' ×' + r.cantidad + ' ' + r.unidad).join(' · ')}</div>` : ''}`;
}

function _svcOcultarSugerencias() {
  const box = document.getElementById('svc-sug-box');
  if (box) box.style.display = 'none';
}

// ===== HELPERS =====
function _svcFmtH(min) {
  if (!min) return '—';
  return Math.floor(min / 60) + 'h ' + Math.round(min % 60) + 'm';
}

function _esc(str) {
  return (str == null ? '' : String(str)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
