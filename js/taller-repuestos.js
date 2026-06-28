// ===== MÓDULO: COTIZACIÓN Y APROBACIÓN DE PRESUPUESTO =====

let _repOtId = null;   // OT activa en modal Lista de Repuestos
let _cotOtId = null;   // OT activa en modal Generar Cotización
let _repPestana = 'precios'; // 'info' | 'precios'

// ── Helpers ──────────────────────────────────────────────────────────────────

function _repGetOT(id) {
  const ots = APP.lsGet('mp_ots', []);
  return ots.find(o => o.id === (id || _repOtId)) || null;
}

function _repGetRol() {
  const ses = APP.lsGet('sesion', null);
  return ses ? (ses.rol || 'administrador') : 'administrador';
}

function _esMecanico() {
  return _repGetRol() === 'mecanico';
}

function _repFmt(n) {
  return '$' + Math.round(n || 0).toLocaleString('es-CL');
}

function _repCalcItem(it) {
  const costo      = Number(it.costo || 0);
  const rent       = Number(it.rentabilidad || 0);
  const cant       = Number(it.cantidad || 1);
  const desc       = Number(it.descuento || 0);   // % descuento
  const imp        = Number(it.impuesto || 0);    // % IVA

  const vu         = rent >= 100 ? costo : costo / (1 - rent / 100);
  const subtotal   = vu * cant;
  const base_neta  = subtotal * (1 - desc / 100);
  const iva        = base_neta * imp / 100;
  const total      = base_neta + iva;

  return { valor_unitario: vu, subtotal, base_neta, iva, total };
}

// ── Persistir items en OT ────────────────────────────────────────────────────

function _repSaveItems(items, otId) {
  const ots = APP.lsGet('mp_ots', []);
  const idx = ots.findIndex(o => o.id === (otId || _repOtId));
  if (idx < 0) return;
  ots[idx].repuestos_cotizados = items;
  APP.lsSet('mp_ots', ots);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL 1: LISTA DE REPUESTOS
// ═══════════════════════════════════════════════════════════════════════════════

function abrirModalRepuestos(otId) {
  _repOtId    = otId;
  _repPestana = 'precios';
  const m = document.getElementById('modal-repuestos');
  if (!m) return;
  m.style.display = 'flex';
  _repRenderInfo();
  _repRenderTabla();
  _repActivarPestana('precios');
}

function cerrarModalRepuestos() {
  const m = document.getElementById('modal-repuestos');
  if (m) m.style.display = 'none';
  _repOtId = null;
}

function _repActivarPestana(tab) {
  _repPestana = tab;
  ['info','precios'].forEach(t => {
    const btn = document.getElementById('rep-tab-' + t);
    const pnl = document.getElementById('rep-panel-' + t);
    if (btn) btn.classList.toggle('kanban-tab-active', t === tab);
    if (pnl) pnl.style.display = t === tab ? '' : 'none';
  });
}

function _repRenderInfo() {
  const ot = _repGetOT();
  const el = document.getElementById('rep-info-body');
  if (!el || !ot) return;
  const fecha = ot.creado ? new Date(ot.creado).toLocaleDateString('es-CL') : '—';
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px">
      <div><span style="color:var(--text-muted);font-size:10px">OT N°</span><div style="font-weight:600">${ot.id || '—'}</div></div>
      <div><span style="color:var(--text-muted);font-size:10px">Fecha</span><div>${fecha}</div></div>
      <div><span style="color:var(--text-muted);font-size:10px">Cliente</span><div style="font-weight:600">${ot.clienteNombre || '—'}</div></div>
      <div><span style="color:var(--text-muted);font-size:10px">WhatsApp</span><div>${ot.wz || '—'}</div></div>
      <div><span style="color:var(--text-muted);font-size:10px">Vehículo</span><div>${[ot.marca,ot.modelo].filter(Boolean).join(' ') || '—'}</div></div>
      <div><span style="color:var(--text-muted);font-size:10px">Patente</span><div style="font-family:var(--font-mono);letter-spacing:.06em;font-weight:700">${ot.patente || '—'}</div></div>
      <div><span style="color:var(--text-muted);font-size:10px">Técnico</span><div>${ot.tecnico || '—'}</div></div>
      <div><span style="color:var(--text-muted);font-size:10px">Fase</span><div>${(ot.fase || '').toUpperCase()}</div></div>
    </div>
    ${(ot.motivos || []).length ? `
      <div style="margin-top:12px;padding-top:12px;border-top:0.5px solid var(--border)">
        <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:7px">Motivos de ingreso</div>
        ${ot.motivos.map(m => `<div style="font-size:12px;padding:5px 0;border-bottom:0.5px solid var(--border)">• ${m.descripcion || m.servicio_id || '—'}</div>`).join('')}
      </div>` : ''}`;
}

function _repRenderTabla() {
  const ot      = _repGetOT();
  const items   = (ot && ot.repuestos_cotizados) || [];
  const esMec   = _esMecanico();
  const el      = document.getElementById('rep-tabla-body');
  if (!el) return;

  if (!items.length) {
    el.innerHTML = `<tr><td colspan="13" style="text-align:center;color:var(--text-muted);padding:20px;font-size:12px">Sin ítems. Usa "+ Agregar ítem" abajo.</td></tr>`;
    return;
  }

  el.innerHTML = items.map((it, i) => {
    const c = _repCalcItem(it);
    const badge = it.tipo === 'insumo'
      ? `<span style="background:#fef3c7;color:#d97706;border:0.5px solid #d97706;border-radius:4px;padding:1px 6px;font-size:10px;font-weight:600">Insumo</span>`
      : `<span style="background:#dcfce7;color:#16a34a;border:0.5px solid #16a34a;border-radius:4px;padding:1px 6px;font-size:10px;font-weight:600">Repuesto</span>`;

    const costoCell = esMec
      ? `<td style="text-align:center;color:var(--text-muted)">—</td><td style="text-align:center;color:var(--text-muted)">—</td>`
      : `<td><input type="number" value="${it.costo||0}" min="0" step="100"
            style="width:80px;font-size:11px;border:0.5px solid var(--border);border-radius:4px;padding:3px 5px;background:var(--surface-1);color:var(--text-primary)"
            onchange="_repEditarCampo(${i},'costo',this.value)"></td>
         <td><input type="number" value="${it.rentabilidad||0}" min="0" max="99" step="1"
            style="width:60px;font-size:11px;border:0.5px solid var(--border);border-radius:4px;padding:3px 5px;background:var(--surface-1);color:var(--text-primary)"
            onchange="_repEditarCampo(${i},'rentabilidad',this.value)"></td>`;

    return `<tr style="font-size:11px">
      <td style="color:var(--text-muted)">${i+1}</td>
      <td>${badge}</td>
      <td><input value="${_esc(it.item||'')}" style="width:110px;font-size:11px;border:0.5px solid var(--border);border-radius:4px;padding:3px 5px;background:var(--surface-1);color:var(--text-primary)"
            onchange="_repEditarCampo(${i},'item',this.value)"></td>
      <td><input value="${_esc(it.referencia||'')}" style="width:80px;font-size:11px;border:0.5px solid var(--border);border-radius:4px;padding:3px 5px;background:var(--surface-1);color:var(--text-primary)"
            onchange="_repEditarCampo(${i},'referencia',this.value)"></td>
      ${costoCell}
      <td style="font-weight:600;white-space:nowrap">${_repFmt(c.valor_unitario)}</td>
      <td><input type="number" value="${it.descuento||0}" min="0" max="100" step="1"
            style="width:50px;font-size:11px;border:0.5px solid var(--border);border-radius:4px;padding:3px 5px;background:var(--surface-1);color:var(--text-primary)"
            onchange="_repEditarCampo(${i},'descuento',this.value)"></td>
      <td>
        <select style="font-size:11px;border:0.5px solid var(--border);border-radius:4px;padding:3px 5px;background:var(--surface-1);color:var(--text-primary)"
                onchange="_repEditarCampo(${i},'impuesto',this.value)">
          <option value="0" ${!it.impuesto?'selected':''}>0%</option>
          <option value="19" ${it.impuesto==19?'selected':''}>19%</option>
        </select>
      </td>
      <td style="white-space:nowrap">${_repFmt(c.subtotal)}</td>
      <td><input type="number" value="${it.cantidad||1}" min="1" step="1"
            style="width:55px;font-size:11px;border:0.5px solid var(--border);border-radius:4px;padding:3px 5px;background:var(--surface-1);color:var(--text-primary)"
            onchange="_repEditarCampo(${i},'cantidad',this.value)"></td>
      <td style="font-weight:700;white-space:nowrap;color:var(--text-accent)">${_repFmt(c.total)}</td>
      <td>
        <button onclick="_repEliminarItem(${i})" style="background:none;border:none;cursor:pointer;color:var(--text-danger);font-size:14px;padding:2px">🗑</button>
      </td>
    </tr>`;
  }).join('');

  _repRenderTotales();
}

function _repRenderTotales() {
  const ot    = _repGetOT();
  const items = (ot && ot.repuestos_cotizados) || [];
  const el    = document.getElementById('rep-totales');
  if (!el) return;

  let subtotal = 0, descTotal = 0, baseTotal = 0, ivaTotal = 0, total = 0;
  items.forEach(it => {
    const c = _repCalcItem(it);
    subtotal  += c.subtotal;
    descTotal += c.subtotal - c.base_neta;
    baseTotal += c.base_neta;
    ivaTotal  += c.iva;
    total     += c.total;
  });

  el.innerHTML = `
    <div style="display:flex;justify-content:flex-end;gap:24px;font-size:12px;padding:8px 0;border-top:0.5px solid var(--border)">
      <span>Subtotal: <strong>${_repFmt(subtotal)}</strong></span>
      <span>Desc.: <strong style="color:#d97706">${_repFmt(descTotal)}</strong></span>
      <span>Base: <strong>${_repFmt(baseTotal)}</strong></span>
      <span>IVA: <strong>${_repFmt(ivaTotal)}</strong></span>
      <span style="font-size:13px;font-weight:700;color:var(--text-accent)">TOTAL: ${_repFmt(total)}</span>
    </div>`;
}

function _repEditarCampo(idx, campo, valor) {
  const ot    = _repGetOT();
  const items = (ot && [...(ot.repuestos_cotizados || [])]) || [];
  if (!items[idx]) return;
  items[idx][campo] = ['costo','rentabilidad','descuento','impuesto','cantidad'].includes(campo)
    ? Number(valor) : valor;
  _repSaveItems(items);
  _repRenderTabla();
}

function _repEliminarItem(idx) {
  const ot    = _repGetOT();
  const items = [...(ot && ot.repuestos_cotizados || [])];
  items.splice(idx, 1);
  _repSaveItems(items);
  _repRenderTabla();
}

// ── Formulario agregar ítem ───────────────────────────────────────────────────

function _repAgregarItemForm() {
  const nombre  = (document.getElementById('rep-add-nombre')?.value || '').trim();
  const ref     = (document.getElementById('rep-add-ref')?.value || '').trim();
  const base    = Number(document.getElementById('rep-add-base')?.value || 0);
  const ivaVal  = Number(document.getElementById('rep-add-iva')?.value || 0);
  const precio  = Number(document.getElementById('rep-add-precio')?.value || 0);
  const cant    = Number(document.getElementById('rep-add-cant')?.value || 1);
  const tipo    = document.getElementById('rep-add-tipo')?.value || 'repuesto';

  if (!nombre) { APP.toast?.show('Ingresa el nombre del ítem', 'error'); return; }

  // Calcular costo y margen desde precio de venta si se ingresó
  const vu       = precio || base * (1 + ivaVal / 100);
  const costo    = base || (precio / 1.19) || precio;
  const rent     = costo > 0 ? Math.max(0, (1 - costo / (vu || costo)) * 100) : 0;

  const ot    = _repGetOT();
  const items = [...(ot && ot.repuestos_cotizados || [])];
  items.push({
    tipo,
    item:          nombre,
    referencia:    ref,
    costo:         costo,
    rentabilidad:  Math.round(rent * 100) / 100,
    valor_unitario: vu,
    descuento:     0,
    impuesto:      ivaVal,
    cantidad:      cant,
    estado_aprobacion: 'pendiente',
  });
  _repSaveItems(items);

  // Limpiar form
  ['rep-add-nombre','rep-add-ref','rep-add-base','rep-add-precio'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const cantEl = document.getElementById('rep-add-cant');
  if (cantEl) cantEl.value = 1;

  _repRenderTabla();
  APP.toast?.show('Ítem agregado', 'success');
}

// ── Guardar borrador ──────────────────────────────────────────────────────────

function repGuardarCambios() {
  const ot = _repGetOT();
  if (!ot) return;
  // Ya se auto-guarda en cada edición; solo registramos evento
  const ots = APP.lsGet('mp_ots', []);
  const idx = ots.findIndex(o => o.id === _repOtId);
  if (idx >= 0) {
    const ahora = new Date();
    ots[idx].historial = [...(ots[idx].historial || []), {
      estado: 'cotizacion_guardada',
      label:  'Lista de repuestos guardada',
      emoji:  '💾',
      ts:     ahora.toISOString(),
      hora:   ahora.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' }),
      fecha:  ahora.toLocaleDateString('es-CL'),
    }];
    APP.lsSet('mp_ots', ots);
  }
  APP.toast?.show('Cambios guardados', 'success');
}

// ── Finalizar lista → abrir modal cotización ──────────────────────────────────

function repFinalizarYEnviar() {
  const ot    = _repGetOT();
  const items = ot && ot.repuestos_cotizados;
  if (!items || !items.length) {
    APP.toast?.show('Agrega al menos un ítem antes de continuar', 'error');
    return;
  }
  cerrarModalRepuestos();
  abrirModalCotizacion(_repOtId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL 2: GENERAR COTIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

let _cotDescGlobal = 0; // % descuento global

function abrirModalCotizacion(otId) {
  _cotOtId     = otId;
  _cotDescGlobal = 0;
  const m = document.getElementById('modal-cotizacion');
  if (!m) return;
  m.style.display = 'flex';
  const dgEl = document.getElementById('cot-desc-global');
  if (dgEl) dgEl.value = 0;
  _cotRenderTabla();
  _cotRenderResumen();
}

function cerrarModalCotizacion() {
  const m = document.getElementById('modal-cotizacion');
  if (m) m.style.display = 'none';
  _cotOtId = null;
}

function _cotGetOT() {
  const ots = APP.lsGet('mp_ots', []);
  return ots.find(o => o.id === _cotOtId) || null;
}

function _cotRenderTabla() {
  const ot    = _cotGetOT();
  const items = (ot && ot.repuestos_cotizados) || [];
  const el    = document.getElementById('cot-tabla-body');
  if (!el) return;

  if (!items.length) {
    el.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:20px;font-size:12px">Sin ítems en la cotización</td></tr>`;
    return;
  }

  el.innerHTML = items.map((it, i) => {
    const c    = _repCalcItem(it);
    const aprobado = it.estado_aprobacion === 'aprobado';
    const badge = aprobado
      ? `<span style="background:#dcfce7;color:#16a34a;border:0.5px solid #16a34a;border-radius:10px;padding:2px 8px;font-size:10px;font-weight:700">APROBADO</span>`
      : `<span style="background:#fee2e2;color:#dc2626;border:0.5px solid #dc2626;border-radius:10px;padding:2px 8px;font-size:10px;font-weight:700">PENDIENTE</span>`;
    const tipoBadge = it.tipo === 'insumo'
      ? `<span style="background:#fef3c7;color:#d97706;border:0.5px solid #d97706;border-radius:4px;padding:1px 5px;font-size:10px">Insumo</span>`
      : `<span style="background:#dcfce7;color:#16a34a;border:0.5px solid #16a34a;border-radius:4px;padding:1px 5px;font-size:10px">Repuesto</span>`;

    // Aplicar descuento global adicional
    const dgFactor = (1 - _cotDescGlobal / 100);
    const totalFinal = c.total * dgFactor;

    return `<tr style="font-size:11px;${aprobado ? 'background:rgba(22,163,74,.04)' : ''}">
      <td>${i+1}</td>
      <td>${tipoBadge}</td>
      <td style="font-weight:500">${_esc(it.item || '—')}</td>
      <td style="color:var(--text-muted)">${_esc(it.referencia || '—')}</td>
      <td style="text-align:right">${_repFmt(c.valor_unitario)}</td>
      <td style="text-align:center">${it.cantidad || 1}</td>
      <td style="text-align:right">${_repFmt(c.subtotal * dgFactor)}</td>
      <td style="font-weight:700;text-align:right;color:var(--text-accent)">${_repFmt(totalFinal)}</td>
      <td style="text-align:center">
        ${badge}
        <button onclick="_cotToggleItem(${i})" style="display:block;margin:4px auto 0;font-size:10px;padding:2px 6px;background:none;border:0.5px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text-secondary)">
          ${aprobado ? 'Quitar' : '✓ Aprobar'}
        </button>
      </td>
    </tr>`;
  }).join('');
}

function _cotToggleItem(idx) {
  const ot    = _cotGetOT();
  const items = [...(ot && ot.repuestos_cotizados || [])];
  if (!items[idx]) return;
  items[idx].estado_aprobacion = items[idx].estado_aprobacion === 'aprobado' ? 'pendiente' : 'aprobado';
  _repSaveItems(items, _cotOtId);
  _cotRenderTabla();
  _cotRenderResumen();
}

function _cotAprobarTodo() {
  const ot    = _cotGetOT();
  const items = [...(ot && ot.repuestos_cotizados || [])];
  items.forEach(it => { it.estado_aprobacion = 'aprobado'; });
  _repSaveItems(items, _cotOtId);
  _cotRenderTabla();
  _cotRenderResumen();
  APP.toast?.show('Todos los ítems aprobados', 'success');
}

function _cotActualizarDescGlobal(val) {
  _cotDescGlobal = Math.max(0, Math.min(100, Number(val) || 0));
  _cotRenderTabla();
  _cotRenderResumen();
}

function _cotRenderResumen() {
  const ot    = _cotGetOT();
  const items = (ot && ot.repuestos_cotizados) || [];
  const dg    = _cotDescGlobal;
  const dgFactor = 1 - dg / 100;

  const calc = (filtrar) => {
    const lista = filtrar ? items.filter(i => i.estado_aprobacion === 'aprobado') : items;
    let subtotal = 0, desc = 0, base = 0, iva = 0, total = 0;
    lista.forEach(it => {
      const c = _repCalcItem(it);
      const sub_dg  = c.subtotal * dgFactor;
      const base_dg = c.base_neta * dgFactor;
      const iva_dg  = c.iva * dgFactor;
      const tot_dg  = c.total * dgFactor;
      subtotal += c.subtotal;
      desc     += c.subtotal - base_dg;
      base     += base_dg;
      iva      += iva_dg;
      total    += tot_dg;
      // Para subtotal mostramos sin descuento del ítem aún
    });
    // Recalcular correctamente
    subtotal = 0; desc = 0; base = 0; iva = 0; total = 0;
    lista.forEach(it => {
      const c = _repCalcItem(it);
      subtotal += c.subtotal;
      const baseConDg = c.base_neta * dgFactor;
      const descMonto = c.subtotal - baseConDg;
      const ivaCalc   = baseConDg * (Number(it.impuesto || 0) / 100);
      const totCalc   = baseConDg + ivaCalc;
      desc  += descMonto;
      base  += baseConDg;
      iva   += ivaCalc;
      total += totCalc;
    });
    return { subtotal, desc, base, iva, total };
  };

  const tot = calc(false);
  const apr = calc(true);

  const el = document.getElementById('cot-resumen');
  if (!el) return;

  const row = (label, vCot, vApr, bold) => `
    <tr style="${bold ? 'font-weight:700;font-size:13px' : 'font-size:12px'}">
      <td style="padding:6px 0;color:var(--text-muted)">${label}</td>
      <td style="text-align:right;padding:6px 8px;${bold?'color:var(--text-accent)':''}">${_repFmt(vCot)}</td>
      <td style="text-align:right;padding:6px 0;${bold?'color:#16a34a':''}">${_repFmt(vApr)}</td>
    </tr>`;

  el.innerHTML = `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">
          <th style="padding:6px 0;text-align:left"></th>
          <th style="padding:6px 8px;text-align:right">Cotizado</th>
          <th style="padding:6px 0;text-align:right">Aprobado</th>
        </tr>
      </thead>
      <tbody>
        <tr><td colspan="3" style="height:1px;background:var(--border)"></td></tr>
        ${row('Subtotal',       tot.subtotal, apr.subtotal)}
        ${row('Descuentos',     tot.desc,     apr.desc)}
        ${row('Base imponible', tot.base,     apr.base)}
        ${row('IVA (19%)',      tot.iva,      apr.iva)}
        <tr><td colspan="3" style="height:1px;background:var(--border)"></td></tr>
        ${row('TOTAL',          tot.total,    apr.total, true)}
      </tbody>
    </table>`;
}

// ── Guardar cotización ────────────────────────────────────────────────────────

function cotGuardar() {
  const ot  = _cotGetOT();
  if (!ot) return;
  const ots = APP.lsGet('mp_ots', []);
  const idx = ots.findIndex(o => o.id === _cotOtId);
  if (idx < 0) return;
  const ahora = new Date();
  ots[idx].cotizacion_descuento_global = _cotDescGlobal;
  ots[idx].historial = [...(ots[idx].historial || []), {
    estado: 'cotizacion_guardada',
    label:  'Cotización guardada',
    emoji:  '💾',
    ts:     ahora.toISOString(),
    hora:   ahora.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' }),
    fecha:  ahora.toLocaleDateString('es-CL'),
  }];
  APP.lsSet('mp_ots', ots);
  APP.toast?.show('Cotización guardada', 'success');
}

// ── Avanzar sin enviar ────────────────────────────────────────────────────────

function cotAvanzarSinEnviar() {
  const ot  = _cotGetOT();
  if (!ot) return;
  _cotAvanzarFase();
  cerrarModalCotizacion();
  APP.toast?.show('OT avanzada a APROBACIÓN', 'success');
}

function _cotAvanzarFase() {
  const ots = APP.lsGet('mp_ots', []);
  const idx = ots.findIndex(o => o.id === _cotOtId);
  if (idx < 0) return;
  const ahora = new Date();
  ots[idx].fase = 'aprobacion';
  ots[idx].cotizacion_descuento_global = _cotDescGlobal;
  ots[idx].historial = [...(ots[idx].historial || []), {
    estado: 'avanzado_a_aprobacion',
    label:  'Cotización lista — OT avanza a Aprobación',
    emoji:  '📋',
    ts:     ahora.toISOString(),
    hora:   ahora.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' }),
    fecha:  ahora.toLocaleDateString('es-CL'),
  }];
  APP.lsSet('mp_ots', ots);
}

// ── Finalizar y enviar por WhatsApp ──────────────────────────────────────────

function cotFinalizarYEnviar() {
  const ot = _cotGetOT();
  if (!ot) return;

  _cotAvanzarFase();

  // Calcular total
  const items = ot.repuestos_cotizados || [];
  const dgFactor = 1 - _cotDescGlobal / 100;
  let total = 0;
  items.forEach(it => { total += _repCalcItem(it).total * dgFactor; });

  // Generar link de aprobación de presupuesto
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const base = isLocal
    ? window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'modules/aprobacion.html'
    : 'https://garage16valve-cell.github.io/mecanicapro/modules/aprobacion.html';
  const link = base + '?ot=' + encodeURIComponent(ot.id) + '&tipo=presupuesto';

  const cliente  = ot.clienteNombre || 'Cliente';
  const vehiculo = [ot.marca, ot.modelo].filter(Boolean).join(' ') || 'su vehículo';
  const pat      = ot.patente ? ' placa ' + ot.patente : '';
  const msg      = `Hola ${cliente} 🔧, la cotización de tu ${vehiculo}${pat} está lista.\nTotal: ${_repFmt(total)}\nRevisa y aprueba aquí: ${link}`;

  const wzNum = (ot.wz || '').replace(/\D/g, '');
  window.open(
    wzNum
      ? `https://wa.me/${wzNum}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`,
    '_blank'
  );

  // Registrar envío
  const ots = APP.lsGet('mp_ots', []);
  const idx = ots.findIndex(o => o.id === _cotOtId);
  if (idx >= 0) {
    ots[idx].whatsapp_enviados = [...(ots[idx].whatsapp_enviados || []), {
      tipo: 'cotizacion',
      fecha: new Date().toISOString(),
      link,
    }];
    APP.lsSet('mp_ots', ots);
  }

  cerrarModalCotizacion();
  APP.toast?.show('📱 Cotización enviada por WhatsApp', 'success');
}

// ── Escape helper ─────────────────────────────────────────────────────────────

function _esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Patch: registrar botón en el detalle OT ──────────────────────────────────

(function _setupRepuestosPatch() {
  const orig = window.abrirDetalleOT;
  if (!orig) { setTimeout(_setupRepuestosPatch, 80); return; }
  window.abrirDetalleOT = function(id) {
    orig(id);
    setTimeout(() => {
      const ot = (APP.lsGet('mp_ots', [])).find(o => o.id === id);
      if (ot) _repPanelRender(ot);
    }, 0);
  };
})();

function _repPanelRender(ot) {
  const panel = document.getElementById('det-panel-repuestos');
  if (!panel) return;
  const fases = ['repuestos', 'aprobacion', 'reparacion', 'control', 'entrega', 'archivado'];
  if (!fases.includes(ot.fase)) { panel.style.display = 'none'; return; }
  panel.style.display = '';
  const items = ot.repuestos_cotizados || [];
  const total = items.reduce((s, it) => s + _repCalcItem(it).total, 0);
  document.getElementById('rep-panel-count').textContent = items.length + ' ítem' + (items.length !== 1 ? 's' : '');
  document.getElementById('rep-panel-total').textContent = _repFmt(total);
}
