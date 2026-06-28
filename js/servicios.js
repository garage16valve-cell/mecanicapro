// ===== MÓDULO: SERVICIOS =====
// Catálogo → Admin > Configuración
// Este módulo gestiona: Eficiencia por servicio + Proveedores

let _svcProvEdit  = null;
let _svcProvMarcas = [];

// ===== INIT =====
function init_servicios() {
  svcSetTab('prov');
  svcRenderProveedores();
  _svcPatchTallerSelect();

  const area = document.getElementById('content-area');
  if (area && !area.dataset.svcObserving) {
    area.dataset.svcObserving = '1';
    new MutationObserver(() => _svcPatchTallerSelect()).observe(area, { childList:true, subtree:true });
  }
}

// ===== TABS (prov | conf) =====
function svcSetTab(tab) {
  ['prov','conf'].forEach(t => {
    const cnt = document.getElementById('svc-tab-' + t);
    const btn = document.getElementById('svc-tab-btn-' + t);
    if (cnt) cnt.style.display = t === tab ? '' : 'none';
    if (btn) {
      btn.style.borderBottomColor = t === tab ? 'var(--fill-accent)' : 'transparent';
      btn.style.color = t === tab ? 'var(--text-accent)' : 'var(--text-secondary)';
    }
  });
  if (tab === 'prov') svcRenderProveedores();
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

  const CHIP_COLORS = [
    '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'
  ];
  function chipColor(marca) {
    let h = 0;
    for (let i = 0; i < marca.length; i++) h = (h * 31 + marca.charCodeAt(i)) & 0xfffffff;
    return CHIP_COLORS[h % CHIP_COLORS.length];
  }

  lista.innerHTML = provs.map(p => {
    const marcas = p.marcas || [];
    const marcasChips = marcas.length
      ? marcas.map(m => `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:500;color:#fff;background:${chipColor(m)}">${_esc(m)}</span>`).join('')
      : '<span style="font-size:11px;color:var(--text-muted)">Sin marcas</span>';

    const waHref = p.wz
      ? (() => {
          const cfg    = APP.lsGet('mp_taller_config', {});
          const taller = cfg.nombre || 'Integral Automotriz';
          const wz     = cfg.telefono || '+569 5165 5331';
          const marcasStr = marcas.length ? marcas.join(', ') : 'vehículos varios';
          const msg = `Hola ${p.nombre}, necesito cotización de repuestos para ${marcasStr} — ${taller} ${wz}`;
          return `https://wa.me/${p.wz.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`;
        })()
      : null;

    return `<div class="card" style="margin-bottom:10px">
      <div class="ch" style="margin-bottom:8px">
        <div>
          <div style="font-size:13px;font-weight:500">${_esc(p.nombre)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${_esc(p.rubro||'—')}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          ${waHref ? `<a href="${waHref}" target="_blank" class="btn bpw" style="font-size:11px;padding:4px 10px"><i class="ti ti-brand-whatsapp"></i> WA</a>` : ''}
          <button class="btn" style="font-size:11px;padding:4px 9px" onclick="svcProvEditar('${p.id}')"><i class="ti ti-pencil"></i></button>
          <button class="btn" style="font-size:11px;padding:4px 7px;color:var(--text-danger)" onclick="svcProvEliminar('${p.id}')"><i class="ti ti-trash"></i></button>
        </div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--text-muted);font-weight:500;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Marcas que abastece</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">${marcasChips}</div>
      </div>
    </div>`;
  }).join('');
}

// ===== FORMULARIO PROVEEDOR =====
function svcProvNuevo() {
  _svcProvEdit  = null;
  _svcProvMarcas = [];
  ['svc-prov-f-nombre','svc-prov-f-wz','svc-prov-f-marca-input'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const r = document.getElementById('svc-prov-f-rubro'); if (r) r.value = '';
  document.getElementById('svc-prov-panel-titulo').textContent = 'Nuevo proveedor';
  _svcProvRenderMarcas();
  document.getElementById('svc-prov-panel').style.display = 'block';
  document.getElementById('svc-prov-panel').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function svcProvEditar(id) {
  const prov = APP.lsGet('mp_proveedores', []).find(p => p.id === id);
  if (!prov) return;
  _svcProvEdit  = id;
  _svcProvMarcas = [...(prov.marcas || [])];
  const s = (elId, v) => { const e = document.getElementById(elId); if (e) e.value = v||''; };
  s('svc-prov-f-nombre', prov.nombre);
  s('svc-prov-f-rubro',  prov.rubro);
  s('svc-prov-f-wz',     prov.wz);
  const mi = document.getElementById('svc-prov-f-marca-input'); if (mi) mi.value = '';
  document.getElementById('svc-prov-panel-titulo').textContent = 'Editar: ' + prov.nombre;
  _svcProvRenderMarcas();
  document.getElementById('svc-prov-panel').style.display = 'block';
  document.getElementById('svc-prov-panel').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function svcProvCerrarPanel() {
  document.getElementById('svc-prov-panel').style.display = 'none';
  _svcProvEdit   = null;
  _svcProvMarcas = [];
}

function svcProvGuardar() {
  const g = id => (document.getElementById(id)?.value||'').trim();
  const nombre = g('svc-prov-f-nombre');
  if (!nombre) { APP.toast.show('⚠️ Ingresa el nombre del proveedor.', 'warning'); return; }
  if (!_svcProvMarcas.length) { APP.toast.show('⚠️ Agrega al menos una marca que abastece el proveedor.', 'warning'); return; }
  const provs = APP.lsGet('mp_proveedores', []);
  const dato  = { nombre, rubro:g('svc-prov-f-rubro'), wz:g('svc-prov-f-wz'), marcas:[..._svcProvMarcas] };
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
  APP.modal.confirmar('¿Eliminar este proveedor? Esta acción no se puede deshacer.', () => {
    APP.lsSet('mp_proveedores', APP.lsGet('mp_proveedores',[]).filter(p => p.id !== id));
    svcRenderProveedores();
  }, 'Eliminar', 'Cancelar');
}

// ===== CHIPS DE MARCAS =====
function svcProvMarcaAdd() {
  const input = document.getElementById('svc-prov-f-marca-input');
  const val   = (input?.value || '').trim();
  if (!val) return;
  if (_svcProvMarcas.map(m => m.toLowerCase()).includes(val.toLowerCase())) {
    if (input) input.value = '';
    return;
  }
  _svcProvMarcas.push(val);
  if (input) input.value = '';
  _svcProvRenderMarcas();
}

function svcProvMarcaElim(idx) {
  _svcProvMarcas.splice(idx, 1);
  _svcProvRenderMarcas();
}

function _svcProvRenderMarcas() {
  const el = document.getElementById('svc-prov-f-marcas-lista');
  if (!el) return;
  if (!_svcProvMarcas.length) {
    el.innerHTML = '<span style="font-size:10px;color:var(--text-muted)">Sin marcas agregadas</span>';
    return;
  }
  el.innerHTML = _svcProvMarcas.map((m, i) =>
    `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px 3px 10px;background:var(--bg-accent);border:0.5px solid var(--border-accent);border-radius:10px;font-size:11px;color:var(--text-accent)">
      ${_esc(m)}
      <span style="cursor:pointer;font-size:13px;line-height:1;color:var(--text-accent);opacity:.7" onclick="svcProvMarcaElim(${i})">×</span>
    </span>`
  ).join('');
}

// ===== INTEGRACIÓN CON FORMULARIO OT (parcha el select de servicio) =====
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
