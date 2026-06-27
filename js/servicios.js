// ===== MÓDULO: SERVICIOS =====
// mp_servicios  → catálogo de servicios
// mp_proveedores→ lista de proveedores del taller
// mp_config     → { tarifaHora: number, ... }

let _svcEditId    = null;
let _svcRepuestos = [];
let _svcOTId      = null;
let _svcOTReps    = [];
let _svcProvEdit  = null; // id proveedor en edición

// ===== INIT =====
function init_servicios() {
  if (!APP.lsGet('mp_servicios', null)) {
    APP.lsSet('mp_servicios', [
      { id:'svc-d1', nombre:'Mantención 10.000 km',            categoria:'Mantención', horasMin:1.0, horasEst:1.5, horasMax:2.0, precioFijo:0, costoRepuestosEst:0, precioMinimoHora:0,
        repuestosSugeridos:[{nombre:'Filtro aceite',cantidad:1,unidad:'unidad'},{nombre:'Aceite 5W-30',cantidad:4,unidad:'litro'},{nombre:'Filtro aire',cantidad:1,unidad:'unidad'}], creado:new Date().toISOString() },
      { id:'svc-d2', nombre:'Cambio de frenos (eje delantero)', categoria:'Frenos',    horasMin:1.5, horasEst:2.0, horasMax:3.0, precioFijo:0, costoRepuestosEst:0, precioMinimoHora:0,
        repuestosSugeridos:[{nombre:'Pastillas de freno',cantidad:1,unidad:'juego'},{nombre:'Discos de freno',cantidad:2,unidad:'unidad'}], creado:new Date().toISOString() },
      { id:'svc-d3', nombre:'Diagnóstico scanner',              categoria:'Motor',     horasMin:0.5, horasEst:1.0, horasMax:1.5, precioFijo:0, costoRepuestosEst:0, precioMinimoHora:0,
        repuestosSugeridos:[], creado:new Date().toISOString() },
      { id:'svc-d4', nombre:'Cambio de embrague',               categoria:'Motor',     horasMin:4.0, horasEst:5.0, horasMax:7.0, precioFijo:0, costoRepuestosEst:0, precioMinimoHora:0,
        repuestosSugeridos:[{nombre:'Kit de embrague',cantidad:1,unidad:'juego'},{nombre:'Aceite de caja',cantidad:1,unidad:'litro'}], creado:new Date().toISOString() },
      { id:'svc-d5', nombre:'Alineación y balanceo',            categoria:'Suspensión',horasMin:0.5, horasEst:1.0, horasMax:1.5, precioFijo:0, costoRepuestosEst:0, precioMinimoHora:0,
        repuestosSugeridos:[], creado:new Date().toISOString() },
      { id:'svc-d6', nombre:'Revisión sistema eléctrico',       categoria:'Eléctrico', horasMin:1.0, horasEst:1.5, horasMax:2.5, precioFijo:0, costoRepuestosEst:0, precioMinimoHora:0,
        repuestosSugeridos:[{nombre:'Fusibles surtidos',cantidad:1,unidad:'juego'}], creado:new Date().toISOString() },
    ]);
  }

  _svcCargarTarifa();
  svcRender();
  svcRenderOTLista();
  svcRenderEficiencia();
  svcRenderProveedores();
  _svcPatchTallerSelect();

  const area = document.getElementById('content-area');
  if (area && !area.dataset.svcObserving) {
    area.dataset.svcObserving = '1';
    new MutationObserver(() => _svcPatchTallerSelect()).observe(area, { childList:true, subtree:true });
  }
}

// ===== CONFIG =====
function _svcGetConfig() { return APP.lsGet('mp_config', { tarifaHora:35000 }); }
function _svcSaveConfig(cfg) { APP.lsSet('mp_config', cfg); }

function _svcCargarTarifa() {
  const el = document.getElementById('svc-tarifa');
  if (el) el.value = _svcGetConfig().tarifaHora || '';
}

function svcGuardarTarifa(val) {
  const cfg = _svcGetConfig(); cfg.tarifaHora = parseFloat(val) || 0; _svcSaveConfig(cfg);
  svcCalcValor(); svcRender();
}

// ===== TABS (4: cat | ot | efic | prov) =====
function svcSetTab(tab) {
  const tabs = ['cat','ot','efic','prov'];
  tabs.forEach(t => {
    const cnt = document.getElementById('svc-tab-' + t);
    const btn = document.getElementById('svc-tab-btn-' + t);
    if (cnt) cnt.style.display = t === tab ? '' : 'none';
    if (btn) {
      btn.style.borderBottomColor = t === tab ? 'var(--fill-accent)' : 'transparent';
      btn.style.color = t === tab ? 'var(--text-accent)' : 'var(--text-secondary)';
    }
  });
  if (tab === 'ot')   svcRenderOTLista();
  if (tab === 'efic') svcRenderEficiencia();
  if (tab === 'prov') svcRenderProveedores();
}

// ===== CATÁLOGO — RENDER =====
function svcRender(filtro) {
  const lista = document.getElementById('svc-lista');
  const cnt   = document.getElementById('svc-count');
  if (!lista) return;

  const todos = APP.lsGet('mp_servicios', []);
  const q     = (filtro || '').toLowerCase().trim();
  const items = q ? todos.filter(s =>
    (s.nombre || '').toLowerCase().includes(q) || (s.categoria || '').toLowerCase().includes(q)
  ) : todos;

  if (cnt) cnt.textContent = items.length + ' servicio' + (items.length !== 1 ? 's' : '');

  if (!items.length) {
    lista.innerHTML = `<div class="card" style="text-align:center;padding:32px;color:var(--text-muted)">
      <i class="ti ti-tools" style="font-size:28px;display:block;margin-bottom:8px;opacity:.3"></i>
      ${q ? 'Sin resultados para "' + _esc(filtro) + '".' : 'No hay servicios. Crea el primero con <strong>Nuevo servicio</strong>.'}
    </div>`;
    return;
  }

  const tarifa = _svcGetConfig().tarifaHora || 0;
  const CAT_CSS = { 'Mantención':'s-wait','Frenos':'s-crit','Motor':'s-prog','Eléctrico':'s-new','Suspensión':'s-pend','Otro':'s-done' };

  lista.innerHTML = items.map(s => {
    const moValor   = tarifa && s.horasEst ? Math.round(tarifa * s.horasEst) : null;
    const precioFijo= s.precioFijo || 0;
    const mostrarP  = precioFijo > 0 ? precioFijo : moValor;
    return `<div class="card" style="margin-bottom:10px;cursor:pointer" onclick="svcEditar('${s.id}')"
      onmouseover="this.style.borderColor='var(--border-accent)'" onmouseout="this.style.borderColor=''">
      <div class="ch">
        <div>
          <div style="font-size:13px;font-weight:500;margin-bottom:5px">${_esc(s.nombre)}</div>
          <span class="st ${CAT_CSS[s.categoria] || 's-wait'}"><span class="dot"></span>${s.categoria}</span>
          ${precioFijo > 0 ? '<span class="tag" style="margin-left:4px;font-size:10px">Precio fijo</span>' : ''}
        </div>
        ${mostrarP ? `<div style="font-size:16px;font-weight:600;color:var(--text-accent)">$${mostrarP.toLocaleString('es-CL')}</div>` : ''}
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:8px;display:flex;gap:14px;flex-wrap:wrap">
        <span><i class="ti ti-clock" style="font-size:11px;vertical-align:-2px"></i> ${s.horasMin||'?'}h min · ${s.horasEst||'?'}h est · ${s.horasMax||'?'}h máx</span>
        ${s.repuestosSugeridos && s.repuestosSugeridos.length
          ? `<span><i class="ti ti-package" style="font-size:11px;vertical-align:-2px"></i> ${s.repuestosSugeridos.length} repuesto${s.repuestosSugeridos.length!==1?'s':''}</span>` : ''}
        ${s.costoRepuestosEst > 0 ? `<span><i class="ti ti-tool" style="font-size:11px;vertical-align:-2px"></i> Rep. est. $${s.costoRepuestosEst.toLocaleString('es-CL')}</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ===== FORMULARIO CREAR / EDITAR =====
function svcNuevo() {
  _svcEditId = null; _svcRepuestos = [];
  ['svc-f-nombre','svc-f-hmin','svc-f-hest','svc-f-hmax','svc-f-valor','svc-f-precio','svc-f-costo-reps','svc-f-precio-min-h'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('svc-f-cat').value = 'Mantención';
  const del = document.getElementById('svc-btn-del'); if (del) del.style.display = 'none';
  document.getElementById('svc-panel-titulo').textContent = 'Nuevo servicio';
  _svcRenderRepFila();
  document.getElementById('svc-panel').style.display = 'block';
  document.getElementById('svc-panel').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function svcEditar(id) {
  const svc = APP.lsGet('mp_servicios', []).find(s => s.id === id);
  if (!svc) return;
  _svcEditId    = id;
  _svcRepuestos = JSON.parse(JSON.stringify(svc.repuestosSugeridos || []));

  const s = (elId, val) => { const e = document.getElementById(elId); if (e) e.value = val ?? ''; };
  s('svc-f-nombre',      svc.nombre);
  s('svc-f-hmin',        svc.horasMin);
  s('svc-f-hest',        svc.horasEst);
  s('svc-f-hmax',        svc.horasMax);
  s('svc-f-precio',      svc.precioFijo        || '');
  s('svc-f-costo-reps',  svc.costoRepuestosEst || '');
  s('svc-f-precio-min-h',svc.precioMinimoHora  || '');
  document.getElementById('svc-f-cat').value = svc.categoria || 'Otro';
  svcCalcValor();
  const del = document.getElementById('svc-btn-del'); if (del) del.style.display = '';
  document.getElementById('svc-panel-titulo').textContent = 'Editar: ' + svc.nombre;
  _svcRenderRepFila();
  document.getElementById('svc-panel').style.display = 'block';
  document.getElementById('svc-panel').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function svcCerrarPanel() {
  document.getElementById('svc-panel').style.display = 'none';
  _svcEditId = null; _svcRepuestos = [];
}

function svcCalcValor() {
  const tarifa = _svcGetConfig().tarifaHora || 0;
  const hest   = parseFloat(document.getElementById('svc-f-hest')?.value) || 0;
  const el     = document.getElementById('svc-f-valor');
  if (el) el.value = (tarifa && hest) ? Math.round(tarifa * hest) : '';
}

function svcAgregarRepuestoFila() {
  _svcRepuestos.push({ nombre:'', cantidad:1, unidad:'unidad' });
  _svcRenderRepFila();
}

function svcEliminarRepFila(idx) { _svcRepuestos.splice(idx, 1); _svcRenderRepFila(); }

function svcSyncRep(idx, campo, val) {
  if (!_svcRepuestos[idx]) return;
  _svcRepuestos[idx][campo] = campo === 'cantidad' ? (parseFloat(val) || 1) : val;
}

function _svcRenderRepFila() {
  const el = document.getElementById('svc-rep-lista');
  if (!el) return;
  if (!_svcRepuestos.length) {
    el.innerHTML = `<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:8px 0">Sin repuestos sugeridos</div>`;
    return;
  }
  const UNIDADES = ['unidad','litro','kg','par','metro','juego'];
  el.innerHTML = _svcRepuestos.map((r, i) => `
    <div style="display:grid;grid-template-columns:1fr 65px 95px 30px;gap:5px;align-items:center;margin-bottom:5px">
      <input value="${_esc(r.nombre)}" placeholder="Nombre del repuesto"
        style="border:0.5px solid var(--border-strong);border-radius:var(--radius);padding:5px 7px;font-size:11px;background:var(--surface-1);color:var(--text-primary);font-family:var(--font-sans)"
        oninput="svcSyncRep(${i},'nombre',this.value)">
      <input type="number" min="0.5" step="0.5" value="${r.cantidad}"
        style="border:0.5px solid var(--border-strong);border-radius:var(--radius);padding:5px 7px;font-size:11px;background:var(--surface-1);color:var(--text-primary)"
        oninput="svcSyncRep(${i},'cantidad',this.value)">
      <select style="border:0.5px solid var(--border-strong);border-radius:var(--radius);padding:5px 7px;font-size:11px;background:var(--surface-1);color:var(--text-primary)"
        onchange="svcSyncRep(${i},'unidad',this.value)">
        ${UNIDADES.map(u => `<option${u===r.unidad?' selected':''}>${u}</option>`).join('')}
      </select>
      <button class="btn" style="padding:5px;color:var(--text-danger)" onclick="svcEliminarRepFila(${i})"><i class="ti ti-x"></i></button>
    </div>`).join('');
}

function svcGuardar() {
  const nombre = (document.getElementById('svc-f-nombre')?.value || '').trim();
  if (!nombre) { alert('Ingresa el nombre del servicio.'); return; }

  const cat          = document.getElementById('svc-f-cat')?.value || 'Otro';
  const hmin         = parseFloat(document.getElementById('svc-f-hmin')?.value) || 0;
  const hest         = parseFloat(document.getElementById('svc-f-hest')?.value) || 0;
  const hmax         = parseFloat(document.getElementById('svc-f-hmax')?.value) || 0;
  const precioFijo   = parseFloat(document.getElementById('svc-f-precio')?.value)      || 0;
  const costoRepsEst = parseFloat(document.getElementById('svc-f-costo-reps')?.value)   || 0;
  const precioMinH   = parseFloat(document.getElementById('svc-f-precio-min-h')?.value) || 0;

  const todos = APP.lsGet('mp_servicios', []);
  const base  = { nombre, categoria:cat, horasMin:hmin, horasEst:hest, horasMax:hmax, precioFijo, costoRepuestosEst:costoRepsEst, precioMinimoHora:precioMinH, repuestosSugeridos:_svcRepuestos };
  if (_svcEditId) {
    const idx = todos.findIndex(s => s.id === _svcEditId);
    if (idx >= 0) todos[idx] = { ...todos[idx], ...base };
  } else {
    todos.push({ id:'svc-'+Date.now(), ...base, creado:new Date().toISOString() });
  }
  APP.lsSet('mp_servicios', todos);
  _svcUpdateTallerSelect();
  svcRender();
  svcCerrarPanel();
}

function svcEliminar() {
  if (!_svcEditId || !confirm('¿Eliminar este servicio del catálogo?')) return;
  APP.lsSet('mp_servicios', APP.lsGet('mp_servicios', []).filter(s => s.id !== _svcEditId));
  _svcUpdateTallerSelect();
  svcRender();
  svcCerrarPanel();
}

// ===== INTEGRACIÓN CON FORMULARIO OT =====
function _svcPatchTallerSelect() {
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
  _svcMostrarSugerencias(svc, _svcGetConfig().tarifaHora || 0);
}

function _svcMostrarSugerencias(svc, tarifa) {
  let box = document.getElementById('svc-sug-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'svc-sug-box';
    const ref = document.getElementById('precot-box') || document.getElementById('c-notas');
    if (ref) ref.parentNode.insertBefore(box, ref); else return;
  }
  const precio = svc.precioFijo || (tarifa && svc.horasEst ? Math.round(tarifa * svc.horasEst) : null);
  const reps   = svc.repuestosSugeridos || [];
  box.style.cssText = 'margin-top:8px;margin-bottom:8px;padding:10px 12px;background:var(--bg-accent);border:0.5px solid var(--border-accent);border-radius:var(--radius)';
  box.innerHTML = `
    <div style="font-size:11px;font-weight:500;color:var(--text-accent);margin-bottom:5px"><i class="ti ti-tools" style="font-size:12px;vertical-align:-2px"></i> ${_esc(svc.nombre)} — del catálogo</div>
    <div style="font-size:11px;color:var(--text-accent);display:flex;gap:14px;flex-wrap:wrap">
      <span>⏱ ${svc.horasMin||'?'}h – ${svc.horasEst||'?'}h – ${svc.horasMax||'?'}h</span>
      ${precio ? `<span>💰 $${precio.toLocaleString('es-CL')} ${svc.precioFijo ? '(precio fijo)' : 'M.O.'}</span>` : ''}
      ${reps.length ? `<span>🔩 ${reps.length} repuesto${reps.length!==1?'s':''} sugerido${reps.length!==1?'s':''}</span>` : ''}
    </div>
    ${reps.length ? `<div style="margin-top:5px;font-size:10px;color:var(--text-accent);opacity:.85">${reps.map(r => _esc(r.nombre) + ' ×' + r.cantidad + ' ' + r.unidad).join(' · ')}</div>` : ''}`;
}

function _svcOcultarSugerencias() {
  const box = document.getElementById('svc-sug-box');
  if (box) box.style.display = 'none';
}

// ===== REPORTE DE EFICIENCIA =====
function svcRenderEficiencia() {
  const tbody = document.getElementById('svc-efic-tbody');
  if (!tbody) return;

  const svcs = APP.lsGet('mp_servicios', []);
  const ots  = APP.lsGet('mp_ots', []).filter(o => o.estado === 'completado');

  const rows = svcs.map(svc => {
    const ejecuciones = ots.filter(o => (o.servicio || '').trim() === svc.nombre.trim() && o.tiempoReal > 0);
    if (!ejecuciones.length) return null;

    const horasEstMin  = (svc.horasEst || 0) * 60;
    const sumReal      = ejecuciones.reduce((a, o) => a + o.tiempoReal, 0);
    const avgReal      = sumReal / ejecuciones.length;
    const eficProm     = horasEstMin > 0 ? Math.round(horasEstMin / avgReal * 100) : null;

    // Tendencia: comparar primera mitad vs segunda mitad
    const mitad = Math.floor(ejecuciones.length / 2);
    let tendencia = '—';
    if (ejecuciones.length >= 4) {
      const prim = ejecuciones.slice(0, mitad).reduce((a, o) => a + o.tiempoReal, 0) / mitad;
      const seg  = ejecuciones.slice(mitad).reduce((a, o) => a + o.tiempoReal, 0) / (ejecuciones.length - mitad);
      if (seg < prim * 0.95)       tendencia = '↑ Mejorando';
      else if (seg > prim * 1.05)  tendencia = '↓ Empeorando';
      else                          tendencia = '→ Estable';
    }

    // Últimas 5 ejecuciones (mini sparkline como texto)
    const ultimas = ejecuciones.slice(-5).map(o => {
      const ef = horasEstMin > 0 ? Math.round(horasEstMin / o.tiempoReal * 100) : null;
      return ef;
    }).filter(Boolean);

    return { svc, count: ejecuciones.length, avgReal, eficProm, tendencia, ultimas };
  }).filter(Boolean).sort((a, b) => (b.eficProm || 0) - (a.eficProm || 0));

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
      : r.tendencia.startsWith('↓') ? 'var(--text-danger)'
      : 'var(--text-muted)';
    const sparkline = r.ultimas.map(v => {
      const c = v >= 95 ? '#10b981' : v >= 75 ? '#f59e0b' : '#ef4444';
      return `<span style="display:inline-block;width:14px;height:${Math.min(20, Math.round(v/5))}px;background:${c};border-radius:1px;vertical-align:bottom;margin-right:1px" title="${v}%"></span>`;
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
    const svcVinc = svcs.filter(s => (s.proveedoresIds || []).includes(p.id));
    return `<div class="card" style="margin-bottom:10px">
      <div class="ch" style="margin-bottom:8px">
        <div>
          <div style="font-size:13px;font-weight:500">${_esc(p.nombre)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${_esc(p.rubro || '—')}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          ${p.wz ? `<a href="https://wa.me/${p.wz.replace(/\D/g,'')}" target="_blank" class="btn bpw" style="font-size:11px;padding:4px 10px">
            <i class="ti ti-brand-whatsapp"></i> WA
          </a>` : ''}
          <button class="btn" style="font-size:11px;padding:4px 9px" onclick="svcProvEditar('${p.id}')"><i class="ti ti-pencil"></i></button>
          <button class="btn" style="font-size:11px;padding:4px 7px;color:var(--text-danger)" onclick="svcProvEliminar('${p.id}')"><i class="ti ti-trash"></i></button>
        </div>
      </div>
      <!-- Servicios vinculados -->
      <div style="margin-bottom:8px">
        <div style="font-size:10px;color:var(--text-muted);font-weight:500;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px">Servicios que abastece</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">
          ${svcVinc.map(s => `<span class="tag" style="font-size:10px">${_esc(s.nombre)}</span>`).join('') || '<span style="font-size:11px;color:var(--text-muted)">Ninguno vinculado</span>'}
        </div>
        <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
          <select id="svc-prov-link-${p.id}" style="font-size:11px;border:0.5px solid var(--border);border-radius:var(--radius);padding:4px 7px;background:var(--surface-1);color:var(--text-primary)">
            <option value="">Vincular servicio…</option>
            ${svcs.filter(s => !(s.proveedoresIds || []).includes(p.id)).map(s => `<option value="${s.id}">${_esc(s.nombre)}</option>`).join('')}
          </select>
          <button class="btn" style="font-size:11px;padding:4px 9px" onclick="svcProvVincular('${p.id}')"><i class="ti ti-link"></i> Vincular</button>
        </div>
      </div>
      <!-- Botón cotizar consolidado -->
      ${svcVinc.length ? `<button class="btn bpw" style="font-size:11px;padding:5px 12px" onclick="svcProvCotizarWA('${p.id}')">
        <i class="ti ti-brand-whatsapp"></i> Cotizar todos los repuestos por WA
      </button>` : ''}
    </div>`;
  }).join('');
}

function svcProvNuevo() {
  _svcProvEdit = null;
  ['svc-prov-f-nombre','svc-prov-f-rubro','svc-prov-f-wz'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('svc-prov-panel-titulo').textContent = 'Nuevo proveedor';
  document.getElementById('svc-prov-panel').style.display = 'block';
  document.getElementById('svc-prov-panel').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function svcProvEditar(id) {
  const prov = APP.lsGet('mp_proveedores', []).find(p => p.id === id);
  if (!prov) return;
  _svcProvEdit = id;
  const s = (elId, v) => { const e = document.getElementById(elId); if (e) e.value = v || ''; };
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
  const g = id => (document.getElementById(id)?.value || '').trim();
  const nombre = g('svc-prov-f-nombre');
  if (!nombre) { alert('Ingresa el nombre del proveedor.'); return; }

  const provs = APP.lsGet('mp_proveedores', []);
  const dato  = { nombre, rubro: g('svc-prov-f-rubro'), wz: g('svc-prov-f-wz') };
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
  APP.lsSet('mp_proveedores', APP.lsGet('mp_proveedores', []).filter(p => p.id !== id));
  // Desvincular de servicios
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

function svcProvCotizarWA(provId) {
  const prov = APP.lsGet('mp_proveedores', []).find(p => p.id === provId);
  if (!prov || !prov.wz) { alert('Este proveedor no tiene WhatsApp configurado.'); return; }

  const svcs = APP.lsGet('mp_servicios', []).filter(s => (s.proveedoresIds || []).includes(provId));
  if (!svcs.length) { alert('Sin servicios vinculados a este proveedor.'); return; }

  // Recopilar todos los repuestos sugeridos de los servicios vinculados
  const items = [];
  svcs.forEach(s => {
    (s.repuestosSugeridos || []).forEach(r => {
      items.push(`• ${r.nombre} × ${r.cantidad} ${r.unidad} (${s.nombre})`);
    });
  });

  const cfg     = APP.lsGet('mp_taller_config', {});
  const taller  = cfg.nombre || 'Integral Automotriz Spa';
  const msg     = [
    'Hola ' + prov.nombre + ',',
    '',
    'Necesitamos cotización para los siguientes repuestos:',
    '',
    ...items,
    '',
    'Por favor enviar precio y disponibilidad.',
    '¡Gracias! — ' + taller,
  ].join('\n');

  const num = prov.wz.replace(/\D/g, '');
  window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(msg), '_blank');
}

// ===== TAB REPUESTOS POR OT =====
function svcRenderOTLista() {
  const lista = document.getElementById('svc-ot-lista');
  if (!lista) return;

  const ots     = APP.lsGet('mp_ots', []);
  const activas = ots.filter(o => ['agendado','en-proceso','cotizacion'].includes(o.estado));

  if (!activas.length) {
    lista.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted)">
      <i class="ti ti-clipboard-list" style="font-size:24px;display:block;margin-bottom:6px;opacity:.3"></i>
      No hay OTs activas
    </div>`;
    return;
  }

  const CSS   = { agendado:'s-wait','en-proceso':'s-prog',cotizacion:'s-crit' };
  const LABEL = { agendado:'Agendado','en-proceso':'En proceso',cotizacion:'Cotización' };

  lista.innerHTML = activas.map(o => {
    const repsN = (o.repuestosDetalle || []).length;
    const sel   = o.id === _svcOTId;
    return `<div style="padding:10px 12px;border-bottom:0.5px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:space-between;${sel?'background:var(--bg-accent)':''}"
      onclick="svcOTSeleccionar('${o.id}')"
      onmouseover="if('${o.id}'!=='${_svcOTId}')this.style.background='var(--surface-1)'"
      onmouseout="if('${o.id}'!=='${_svcOTId}')this.style.background=''">
      <div>
        <div style="font-weight:500;color:${sel?'var(--text-accent)':'var(--text-primary)'}">${o.id}</div>
        <div style="font-size:10px;color:var(--text-muted)">${_esc(o.clienteNombre||'—')} · ${_esc([o.marca,o.modelo,o.anio].filter(Boolean).join(' '))}</div>
        <div style="font-size:10px;color:var(--text-muted)">${_esc(o.servicio||'—')}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="st ${CSS[o.estado]||'s-wait'}"><span class="dot"></span>${LABEL[o.estado]||o.estado}</span>
        ${repsN ? `<span style="font-size:10px;color:var(--text-muted)">${repsN} rep.</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

function svcOTSeleccionar(otId) {
  const ot = APP.lsGet('mp_ots', []).find(o => o.id === otId);
  if (!ot) return;

  _svcOTId   = otId;
  _svcOTReps = JSON.parse(JSON.stringify(ot.repuestosDetalle || []));

  if (!_svcOTReps.length && ot.servicio) {
    const svc = APP.lsGet('mp_servicios', []).find(s => s.nombre === ot.servicio);
    if (svc?.repuestosSugeridos?.length) {
      _svcOTReps = svc.repuestosSugeridos.map(r => ({ ...r, proveedores:[] }));
    }
  }

  const info = document.getElementById('svc-ot-info');
  if (info) info.innerHTML =
    `<span class="tag">${ot.id}</span>
     <span class="tag" style="font-family:var(--font-mono)">${ot.patente||'—'}</span>
     <span style="font-size:11px">${_esc([ot.marca,ot.modelo,ot.anio].filter(Boolean).join(' '))}</span>
     <span style="font-size:11px;color:var(--text-muted)">· ${_esc(ot.clienteNombre||'—')}</span>`;

  document.getElementById('svc-ot-titulo').textContent = 'Repuestos — OT ' + ot.id;
  const ganEl = document.getElementById('svc-ot-ganancia');
  if (ganEl) ganEl.value = ot.gananciaRepuestos != null ? ot.gananciaRepuestos : 30;

  document.getElementById('svc-ot-panel').style.display = 'block';
  svcOTRenderReps();
  svcOTRecalc();
  svcOTRenderWA();
  svcRenderOTLista();
}

function svcOTAgregarFila() {
  _svcOTReps.push({ nombre:'', cantidad:1, unidad:'unidad', proveedores:[] });
  svcOTRenderReps(); svcOTRecalc();
}

function svcOTEliminarFila(idx) {
  _svcOTReps.splice(idx, 1);
  svcOTRenderReps(); svcOTRecalc(); svcOTRenderWA();
}

function svcOTSyncRep(idx, campo, val) {
  if (!_svcOTReps[idx]) return;
  _svcOTReps[idx][campo] = campo === 'cantidad' ? (parseFloat(val)||1) : val;
}

function svcOTAgregarProv(rIdx) {
  if (!_svcOTReps[rIdx]) return;
  if (!_svcOTReps[rIdx].proveedores) _svcOTReps[rIdx].proveedores = [];
  _svcOTReps[rIdx].proveedores.push({ nombre:'', wz:'', precio:0, historialPrecios:[] });
  svcOTRenderReps();
}

function svcOTEliminarProv(rIdx, pIdx) {
  if (!_svcOTReps[rIdx]) return;
  _svcOTReps[rIdx].proveedores.splice(pIdx, 1);
  svcOTRenderReps(); svcOTRenderWA();
}

function svcOTSyncProv(rIdx, pIdx, campo, val) {
  const p = _svcOTReps[rIdx]?.proveedores[pIdx];
  if (!p) return;
  if (campo === 'precio') {
    const precio = parseFloat(val) || 0;
    p.precio = precio;
    if (!p.historialPrecios) p.historialPrecios = [];
    const hoy  = new Date().toISOString().split('T')[0];
    const last = p.historialPrecios[p.historialPrecios.length - 1];
    if (!last || last.fecha !== hoy || last.precio !== precio) p.historialPrecios.push({ precio, fecha:hoy });
  } else {
    p[campo] = val;
  }
}

function svcOTEnviarWA(rIdx, pIdx) {
  const r = _svcOTReps[rIdx];
  const p = r?.proveedores[pIdx];
  if (!p || !p.wz) return;
  const ot = APP.lsGet('mp_ots', []).find(o => o.id === _svcOTId);
  if (!ot) return;
  const msg = _svcMsgWA(ot, [{ nombre:r.nombre, cantidad:r.cantidad, unidad:r.unidad }], p.nombre);
  window.open('https://wa.me/' + p.wz.replace(/\D/g,'') + '?text=' + encodeURIComponent(msg), '_blank');
}

function svcOTRenderReps() {
  const el = document.getElementById('svc-ot-repuestos-lista');
  if (!el) return;
  if (!_svcOTReps.length) {
    el.innerHTML = `<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:10px">Sin repuestos</div>`;
    return;
  }
  const UNIDADES = ['unidad','litro','kg','par','metro','juego'];
  const INP = 'border:0.5px solid var(--border-strong);border-radius:var(--radius);padding:4px 6px;font-size:11px;background:var(--surface-2);color:var(--text-primary);font-family:var(--font-sans)';

  el.innerHTML = _svcOTReps.map((r, i) => `
    <div style="background:var(--surface-1);border-radius:var(--radius);padding:10px;margin-bottom:8px;border:0.5px solid var(--border)">
      <div style="display:grid;grid-template-columns:1fr 65px 95px 30px;gap:5px;align-items:center;margin-bottom:8px">
        <input value="${_esc(r.nombre)}" placeholder="Nombre repuesto" style="${INP};width:100%"
          oninput="svcOTSyncRep(${i},'nombre',this.value);svcOTRenderWA()">
        <input type="number" min="0.5" step="0.5" value="${r.cantidad}" style="${INP};width:100%"
          oninput="svcOTSyncRep(${i},'cantidad',this.value);svcOTRecalc()">
        <select style="${INP};width:100%" onchange="svcOTSyncRep(${i},'unidad',this.value)">
          ${UNIDADES.map(u => `<option${u===r.unidad?' selected':''}>${u}</option>`).join('')}
        </select>
        <button class="btn" style="padding:5px;color:var(--text-danger)" onclick="svcOTEliminarFila(${i})"><i class="ti ti-trash"></i></button>
      </div>
      <div style="padding-left:4px">
        <div style="font-size:10px;color:var(--text-muted);font-weight:500;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Proveedores</div>
        ${(r.proveedores||[]).map((p,j) => `
          <div style="background:var(--surface-0);border-radius:var(--radius);border:0.5px solid var(--border);padding:7px 8px;margin-bottom:5px">
            <div style="display:grid;grid-template-columns:1fr 1fr 100px auto;gap:5px;align-items:center">
              <input value="${_esc(p.nombre||'')}" placeholder="Nombre proveedor" style="${INP};font-size:10px;width:100%"
                oninput="svcOTSyncProv(${i},${j},'nombre',this.value);svcOTRenderWA()">
              <input value="${_esc(p.wz||'')}" placeholder="WZ: 5691234…" style="${INP};font-size:10px;width:100%"
                oninput="svcOTSyncProv(${i},${j},'wz',this.value);svcOTRenderWA()">
              <input type="number" min="0" value="${p.precio||''}" placeholder="Precio $" style="${INP};font-size:10px;width:100%"
                oninput="svcOTSyncProv(${i},${j},'precio',this.value);svcOTRecalc()">
              <div style="display:flex;gap:3px;justify-content:flex-end">
                ${p.wz ? `<button class="btn bpw" style="padding:4px 7px;font-size:10px" onclick="svcOTEnviarWA(${i},${j})"><i class="ti ti-brand-whatsapp"></i></button>` : ''}
                <button class="btn" style="padding:4px;color:var(--text-danger)" onclick="svcOTEliminarProv(${i},${j})"><i class="ti ti-x"></i></button>
              </div>
            </div>
            ${p.historialPrecios&&p.historialPrecios.length>1
              ? `<div style="font-size:9px;color:var(--text-muted);margin-top:4px">Historial: ${p.historialPrecios.slice(-4).map(h=>'$'+Number(h.precio).toLocaleString('es-CL')+'('+h.fecha+')').join(' → ')}</div>` : ''}
          </div>`).join('')}
        <button class="btn" style="font-size:10px;padding:3px 8px;margin-top:2px" onclick="svcOTAgregarProv(${i})">
          <i class="ti ti-plus"></i> Proveedor
        </button>
      </div>
    </div>`).join('');
}

function svcOTRecalc() {
  const ganPct = parseFloat(document.getElementById('svc-ot-ganancia')?.value) || 0;
  let costoTotal = 0;
  _svcOTReps.forEach(r => {
    const conPrecio = (r.proveedores||[]).filter(p => p.precio > 0);
    if (conPrecio.length) costoTotal += Math.min(...conPrecio.map(p => p.precio)) * (r.cantidad||1);
  });
  const ganancia = Math.round(costoTotal * ganPct / 100);
  const total    = costoTotal + ganancia;
  const el = document.getElementById('svc-ot-totales');
  if (el) el.innerHTML = `
    <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px">
      <span style="color:var(--text-muted)">Costo repuestos (precio mínimo):</span><span>$${costoTotal.toLocaleString('es-CL')}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px">
      <span style="color:var(--text-muted)">Ganancia (${ganPct}%):</span><span style="color:var(--text-success)">+$${ganancia.toLocaleString('es-CL')}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:7px 0;font-size:13px;font-weight:600;border-top:0.5px solid var(--border);margin-top:4px">
      <span>Total repuestos:</span><span style="color:var(--text-accent)">$${total.toLocaleString('es-CL')}</span>
    </div>`;
}

function svcOTRenderWA() {
  const el = document.getElementById('svc-ot-wa-panel');
  if (!el || !_svcOTId) return;
  const ot = APP.lsGet('mp_ots', []).find(o => o.id === _svcOTId);
  if (!ot) return;

  const provMap = new Map();
  _svcOTReps.forEach(r => {
    (r.proveedores||[]).forEach(p => {
      if (!p.nombre && !p.wz) return;
      const key = (p.nombre||'') + '|||' + (p.wz||'');
      if (!provMap.has(key)) provMap.set(key, { nombre:p.nombre, wz:p.wz, items:[] });
      provMap.get(key).items.push({ nombre:r.nombre, cantidad:r.cantidad, unidad:r.unidad });
    });
  });

  if (!provMap.size) {
    el.innerHTML = `<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:12px">Agrega proveedores para generar mensajes WA consolidados.</div>`;
    return;
  }

  let idx = 0; let html = ''; const waData = [];
  provMap.forEach(prov => {
    const msg = _svcMsgWA(ot, prov.items, prov.nombre);
    const num = (prov.wz||'').replace(/\D/g,'');
    html += `<div style="background:var(--surface-1);border-radius:var(--radius);padding:10px;margin-bottom:8px;border:0.5px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="font-size:12px;font-weight:500">${_esc(prov.nombre||num||'Proveedor')}</div>
        ${num ? `<button class="btn bpw" style="font-size:11px;padding:4px 10px" onclick="svcWAAbrir(${idx})"><i class="ti ti-brand-whatsapp"></i> Enviar WA</button>` : ''}
      </div>
      <textarea id="svc-wa-${idx}" data-num="${_esc(num)}"
        style="width:100%;min-height:130px;font-size:10px;font-family:var(--font-mono);border:0.5px solid var(--border);border-radius:var(--radius);padding:7px;background:var(--surface-0);color:var(--text-primary);resize:vertical;box-sizing:border-box">${_esc(msg)}</textarea>
    </div>`;
    waData.push(num); idx++;
  });

  el.innerHTML = html;
  window._svcWANums = waData;
}

function svcWAAbrir(idx) {
  const ta = document.getElementById('svc-wa-' + idx);
  if (!ta) return;
  const num = ta.dataset.num;
  if (!num) return;
  window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(ta.value), '_blank');
}

function _svcMsgWA(ot, items, provNombre) {
  const vehiculo = [ot.marca, ot.modelo, ot.anio].filter(Boolean).join(' ');
  const cfg      = APP.lsGet('mp_taller_config', {});
  return [
    'Hola' + (provNombre ? ' ' + provNombre : '') + ',',
    '',
    'Necesito cotización para los siguientes repuestos:',
    '',
    '📋 OT: '        + (ot.id || '—'),
    '🚗 Vehículo: '  + (vehiculo || '—'),
    '📅 Año: '       + (ot.anio || '—'),
    '🔑 N° chasis: ' + (ot.vin  || '—'),
    '',
    'Repuestos solicitados:',
    ...items.map(r => '• ' + (r.nombre||'—') + ' × ' + (r.cantidad||1) + ' ' + (r.unidad||'unidad')),
    '',
    'Por favor enviar precio y disponibilidad. ¡Gracias!',
    '— ' + (cfg.nombre || 'Integral Automotriz Spa'),
  ].join('\n');
}

function svcOTGuardar() {
  if (!_svcOTId) return;
  const ganPct = parseFloat(document.getElementById('svc-ot-ganancia')?.value) || 0;
  const ots = APP.lsGet('mp_ots', []);
  const idx = ots.findIndex(o => o.id === _svcOTId);
  if (idx < 0) return;
  ots[idx].repuestosDetalle  = _svcOTReps;
  ots[idx].gananciaRepuestos = ganPct;
  APP.lsSet('mp_ots', ots);
  svcRenderOTLista();
  alert('✓ Repuestos guardados en ' + _svcOTId);
}

function svcOTAplicarTotal() {
  if (!_svcOTId) return;
  const ganPct = parseFloat(document.getElementById('svc-ot-ganancia')?.value) || 0;
  let costoTotal = 0;
  _svcOTReps.forEach(r => {
    const conPrecio = (r.proveedores||[]).filter(p => p.precio > 0);
    if (conPrecio.length) costoTotal += Math.min(...conPrecio.map(p => p.precio)) * (r.cantidad||1);
  });
  const totalReps = Math.round(costoTotal * (1 + ganPct / 100));
  const ots = APP.lsGet('mp_ots', []);
  const idx = ots.findIndex(o => o.id === _svcOTId);
  if (idx < 0) return;
  const valorMO = parseFloat(ots[idx].valor) || 0;
  ots[idx].repuestosDetalle  = _svcOTReps;
  ots[idx].gananciaRepuestos = ganPct;
  ots[idx].costoRepuestos    = costoTotal;
  ots[idx].totalRepuestos    = totalReps;
  ots[idx].valorTotal        = valorMO + totalReps;
  APP.lsSet('mp_ots', ots);
  svcRenderOTLista();
  alert('✓ Total actualizado en ' + _svcOTId + '\nRepuestos: $' + totalReps.toLocaleString('es-CL') + '\nTotal OT: $' + ots[idx].valorTotal.toLocaleString('es-CL'));
}

// ===== HELPERS =====
function _svcFmtH(min) {
  if (!min) return '—';
  return Math.floor(min / 60) + 'h ' + Math.round(min % 60) + 'm';
}

function _esc(str) {
  return (str == null ? '' : String(str)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
