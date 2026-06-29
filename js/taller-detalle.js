// ===== MÓDULO: APROBACIÓN DIGITAL DE INGRESO =====

let _aprobOtId = null;

// Parcha abrirDetalleOT para mostrar el badge de aprobación y el panel de diagnóstico
(function _setupAprobPatch() {
  const orig = window.abrirDetalleOT;
  if (!orig) { setTimeout(_setupAprobPatch, 80); return; }
  window.abrirDetalleOT = function(id) {
    orig(id);
    setTimeout(() => {
      const ots = APP.lsGet('mp_ots', []);
      const ot  = ots.find(o => o.id === id);
      if (ot) {
        _detAprobBadgeRender(ot);
        _detDiagPanelRender(ot);
      }
    }, 0);
  };
})();

// ---- Badge de estado de aprobación en la cabecera del detalle ----
function _detAprobBadgeRender(ot) {
  const el = document.getElementById('det-aprobacion-badge');
  if (!el) return;
  const ap = ot.aprobacion_ingreso;
  if (!ap || !ap.estado) { el.style.display = 'none'; return; }

  const cfg = {
    esperando: { txt: '⏳ Esperando aprobación', bg: '#fef3c7',            col: '#d97706',             brd: '#d97706'             },
    aprobado:  { txt: ap.metodo === 'verbal' ? '✅ Aprobado verbalmente' : '✅ Aprobado digitalmente',
                 bg: 'var(--bg-success)',      col: 'var(--text-success)', brd: 'var(--text-success)' },
    rechazado: { txt: '❌ Aprobación rechazada', bg: '#fee2e2',            col: 'var(--text-danger)',  brd: 'var(--text-danger)'  },
  }[ap.estado];

  if (!cfg) { el.style.display = 'none'; return; }
  el.style.display     = '';
  el.textContent       = cfg.txt;
  el.style.background  = cfg.bg;
  el.style.color       = cfg.col;
  el.style.borderColor = cfg.brd;
}

// ---- Abrir modal de selección de método ----
function mostrarModalAprobacionIngreso() {
  if (!window._otDetalleId) return;
  const dd = document.getElementById('det-estado-dd');
  if (dd) dd.style.display = 'none';
  _aprobOtId = window._otDetalleId;
  const m = document.getElementById('modal-aprobacion-metodo');
  if (m) m.style.display = 'flex';
}

function cerrarModalAprobMetodo() {
  const m = document.getElementById('modal-aprobacion-metodo');
  if (m) m.style.display = 'none';
  _aprobOtId = null;
}

// ---- OPCIÓN 1: Aprobación vía WhatsApp ----
function aprobacionViaWhatsApp() {
  if (!_aprobOtId) return;
  const ots = APP.lsGet('mp_ots', []);
  const ot  = ots.find(o => o.id === _aprobOtId);
  if (!ot) return;

  // Generar URL de la página de aprobación
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const base = isLocal
    ? window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'modules/aprobacion.html'
    : 'https://garage16valve-cell.github.io/mecanicapro/modules/aprobacion.html';
  const link = base + '?ot=' + encodeURIComponent(ot.id);

  const cliente  = ot.clienteNombre || 'Cliente';
  const vehiculo = [ot.marca, ot.modelo].filter(Boolean).join(' ') || 'su vehículo';
  const pat      = ot.patente ? ' placa ' + ot.patente : '';
  const msg      = `Hola ${cliente} 👋, Integral Automotriz te solicita revisar y aprobar el ingreso de tu ${vehiculo}${pat}. Solo toma 2 minutos: ${link} 🔧`;

  // Guardar estado "esperando"
  const idx = ots.findIndex(o => o.id === _aprobOtId);
  if (idx >= 0) {
    const ahora = new Date();
    ots[idx].aprobacion_ingreso = {
      ...(ots[idx].aprobacion_ingreso || {}),
      metodo:      'whatsapp',
      estado:      'esperando',
      link,
      fecha_envio: ahora.toISOString(),
    };
    ots[idx].historial = [...(ots[idx].historial || []), {
      estado: 'aprobacion_solicitada',
      label:  'Aprobación de ingreso solicitada por WhatsApp',
      emoji:  '📱',
      ts:     ahora.toISOString(),
      hora:   ahora.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' }),
      fecha:  ahora.toLocaleDateString('es-CL'),
    }];
    APP.lsSet('mp_ots', ots);
  }

  // Abrir WhatsApp Web
  const wzNum = (ot.wz || '').replace(/\D/g, '');
  window.open(
    wzNum
      ? `https://wa.me/${wzNum}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`,
    '_blank'
  );

  const id = _aprobOtId;
  cerrarModalAprobMetodo();
  abrirDetalleOT(id);
  APP.toast.show('📱 Solicitud de aprobación enviada por WhatsApp', 'success');
}

// ---- OPCIÓN 2: Aprobación verbal ----
function mostrarModalAprobVerbal() {
  cerrarModalAprobMetodo();
  const m = document.getElementById('modal-aprobacion-verbal');
  if (m) m.style.display = 'flex';
}

function cerrarModalAprobVerbal() {
  const m = document.getElementById('modal-aprobacion-verbal');
  if (m) m.style.display = 'none';
}

function confirmarAprobacionVerbal() {
  if (!_aprobOtId) return;
  const ots = APP.lsGet('mp_ots', []);
  const idx = ots.findIndex(o => o.id === _aprobOtId);
  if (idx < 0) return;

  const ahora = new Date();
  ots[idx].aprobacion_ingreso = {
    metodo:                    'verbal',
    firma:                     '',
    fecha:                     ahora.toISOString(),
    aprobado_por:              ots[idx].clienteNombre || 'Cliente',
    terminos_aceptados:        true,
    datos_personales_aceptados: true,
    estado:                    'aprobado',
  };
  ots[idx].fase = 'diagnostico';
  ots[idx].historial = [...(ots[idx].historial || []), {
    estado:  'aprobado_verbal',
    label:   'Aprobación verbal confirmada — OT avanza a Diagnóstico',
    emoji:   '✅',
    ts:      ahora.toISOString(),
    hora:    ahora.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' }),
    fecha:   ahora.toLocaleDateString('es-CL'),
    detalle: 'El cliente aprobó verbalmente el ingreso del vehículo al taller.',
  }];
  APP.lsSet('mp_ots', ots);

  const id = _aprobOtId;
  cerrarModalAprobVerbal();
  _aprobOtId = null;
  abrirDetalleOT(id);
  APP.toast.show('✅ Aprobación verbal confirmada — OT avanza a Diagnóstico', 'success');
}

// ===== MÓDULO: DIAGNÓSTICO TÉCNICO =====

let _diagOtId       = null;
let _diagMotoIdx    = 0;
let _diagReps       = [];   // repuestos temporales del motivo actual (agregados desde servicios)
let _diagIns        = [];   // insumos temporales del motivo actual (deprecated)
let _diagFotos      = [];   // fotos temporales del motivo actual
let _diagServicios  = [];   // servicios agregados en el motivo actual

// ---- Panel en detalle OT que aparece cuando fase === 'diagnostico' ----
function _detDiagPanelRender(ot) {
  const panel = document.getElementById('det-panel-diagnostico');
  if (!panel) return;
  if (ot.fase !== 'diagnostico') { panel.style.display = 'none'; return; }

  const sesion  = APP.lsGet('mp_sesion') || {};
  const rol     = (sesion.rol || '').toLowerCase();
  const canDiag = !rol || rol === 'mecanico' || rol === 'administrador' || rol === 'admin';

  panel.style.display = '';

  const motivos      = ot.motivos || [];
  const diagnosticados = motivos.filter(m => m.diagnosticado).length;
  const total        = motivos.length;

  const progEl = document.getElementById('det-diag-progreso');
  if (progEl) progEl.textContent = `${diagnosticados} / ${total} motivo(s) diagnosticado(s)`;

  const btnEl = document.getElementById('det-diag-btn');
  if (btnEl) btnEl.style.display = canDiag ? '' : 'none';
}

// ---- Abrir modal diagnóstico ----
function abrirModalDiagnostico() {
  const dd = document.getElementById('det-estado-dd');
  if (dd) dd.style.display = 'none';

  if (!window._otDetalleId) return;
  const ots = APP.lsGet('mp_ots', []);
  const ot  = ots.find(o => o.id === window._otDetalleId);
  if (!ot) return;

  if (ot.fase !== 'diagnostico') {
    APP.toast.show('La OT debe estar en fase Diagnóstico', 'warning');
    return;
  }
  if (!ot.motivos || !ot.motivos.length) {
    APP.toast.show('La OT no tiene motivos de ingreso registrados', 'warning');
    return;
  }

  const sesion = APP.lsGet('mp_sesion') || {};
  const rol    = (sesion.rol || '').toLowerCase();
  if (rol === 'recepcion') {
    APP.toast.show('Solo mecánicos y administradores pueden realizar diagnósticos', 'error');
    return;
  }

  _diagOtId    = window._otDetalleId;
  _diagMotoIdx = 0;
  _diagReps    = [];
  _diagIns     = [];
  _diagFotos   = [];

  _diagRenderModal(ot);
  const m = document.getElementById('modal-diagnostico');
  if (m) m.style.display = 'flex';
}

function cerrarModalDiagnostico() {
  const m = document.getElementById('modal-diagnostico');
  if (m) m.style.display = 'none';
  _diagOtId = null;
}

// ---- Poblar encabezado + select de motivos ----
function _diagRenderModal(ot) {
  const fIngreso = ot.fecha_ingreso
    ? new Date(ot.fecha_ingreso).toLocaleDateString('es-CL')
    : (ot.fechaCita ? new Date(ot.fechaCita).toLocaleDateString('es-CL') : '—');

  _setText('diag-ot-num',        ot.id || '—');
  _setText('diag-cliente',       ot.clienteNombre || '—');
  _setText('diag-vehiculo',      [ot.marca, ot.modelo, ot.anio].filter(Boolean).join(' ') || '—');
  _setText('diag-patente',       ot.patente || '—');
  _setText('diag-fecha-ingreso', fIngreso);

  // Ocultar precios si es mecánico
  const sesion    = APP.lsGet('mp_sesion') || {};
  const esMec     = (sesion.rol || '').toLowerCase() === 'mecanico';
  const grpMoGrp  = document.getElementById('diag-mano-obra-grupo');
  const grpIva    = document.getElementById('diag-iva-grupo');
  if (grpMoGrp)  grpMoGrp.style.display  = esMec ? 'none' : '';
  if (grpIva)    grpIva.style.display    = esMec ? 'none' : '';

  _diagPopularSelect(ot);

  // Ir al primer motivo pendiente
  const firstPending = ot.motivos.findIndex(m => !m.diagnosticado);
  _diagMotoIdx = firstPending >= 0 ? firstPending : 0;
  const sel = document.getElementById('diag-motivo-select');
  if (sel) sel.value = _diagMotoIdx;

  _diagCargarMotivo(_diagMotoIdx, ot);
}

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _diagPopularSelect(ot) {
  const sel = document.getElementById('diag-motivo-select');
  if (!sel) return;
  sel.innerHTML = ot.motivos.map((m, i) => {
    const tick = m.diagnosticado ? ' ✓' : '';
    return `<option value="${i}">${i + 1}. ${m.descripcion || 'Motivo ' + (i + 1)}${tick}</option>`;
  }).join('');
}

// ---- Cargar datos de un motivo en el formulario ----
function _diagCargarMotivo(idx, ot) {
  _diagMotoIdx = idx;
  const m = (ot.motivos || [])[idx] || {};

  _diagServicios = [...(m.servicios || [])];
  if (m.servicios) {
    _diagReps = _diagServicios.flatMap(s => s.repuestos || []);
  } else {
    _diagReps = [...(m.repuestos || [])];
  }
  _diagIns   = [...(m.insumos   || [])];
  _diagFotos = [...(m.evidencia_diagnostico || [])];

  const txtEl = document.getElementById('diag-diagnostico-text');
  if (txtEl) txtEl.value = m.diagnostico || '';

  const hrsEl = document.getElementById('diag-horas');
  if (hrsEl) hrsEl.value = m.horas_reparacion || '';

  const sesion = APP.lsGet('mp_sesion') || {};
  if ((sesion.rol || '').toLowerCase() !== 'mecanico') {
    const moEl = document.getElementById('diag-mano-obra');
    if (moEl) moEl.value = m.valor_mano_obra || '';
    const ivaEl = document.getElementById('diag-iva-sel');
    if (ivaEl) ivaEl.value = m.impuesto === 19 ? '19' : '0';
    _diagCalcIva();
  }

  _diagRenderServicios();
  _diagRenderFotos();

  const badge = document.getElementById('diag-motivo-badge');
  if (badge) {
    if (m.diagnosticado) {
      badge.textContent        = '✓ DIAGNOSTICADO';
      badge.style.color        = '#16a34a';
      badge.style.borderColor  = '#16a34a';
      badge.style.background   = '#dcfce7';
    } else {
      badge.textContent        = 'PENDIENTE';
      badge.style.color        = '#d97706';
      badge.style.borderColor  = '#d97706';
      badge.style.background   = '#fef3c7';
    }
  }

  _diagActualizarBotones(ot);
}

// Cambio de select de motivo
function diagCambiarMotivo() {
  const sel = document.getElementById('diag-motivo-select');
  if (!sel || !_diagOtId) return;
  const ots = APP.lsGet('mp_ots', []);
  const ot  = ots.find(o => o.id === _diagOtId);
  if (!ot) return;
  _diagReps  = [];
  _diagIns   = [];
  _diagFotos = [];
  _diagCargarMotivo(parseInt(sel.value, 10), ot);
}

// ---- Cálculo IVA ----
function _diagCalcIva() {
  const mo  = parseFloat(document.getElementById('diag-mano-obra')?.value) || 0;
  const iva = document.getElementById('diag-iva-sel')?.value === '19' ? 0.19 : 0;
  const el  = document.getElementById('diag-valor-con-iva');
  if (el) el.value = mo ? Math.round(mo * (1 + iva)) : '';
}

// ---- Servicios ----
function _diagBuscarServicio(texto) {
  const dropdown = document.getElementById('diag-svc-sugerencias');
  if (!dropdown) return;
  if (!texto || texto.length < 1) {
    dropdown.style.display = 'none';
    document.getElementById('diag-svc-info').style.display = 'none';
    return;
  }
  const t = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const servicios = APP.lsGet('mp_servicios', []);
  const filtrados = servicios.filter(s =>
    (s.nombre||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(t)
  );
  if (filtrados.length > 0) {
    dropdown.innerHTML = filtrados.map(s =>
      `<div onclick="_diagSeleccionarServicio('${s.id}')" style="cursor:pointer;padding:8px 10px;font-size:12px;border-bottom:0.5px solid var(--border)"
         onmouseover="this.style.background='var(--surface-1)'" onmouseout="this.style.background=''">
        <span style="font-weight:500">${s.nombre}</span>
        <span style="color:var(--text-muted);font-size:10px;margin-left:8px">${(s.horas||s.horasEst||s.horas_estimadas||0)}h · $${(s.valor||s.precioFijo||s.precio_venta||0).toLocaleString('es-CL')}</span>
      </div>`
    ).join('');
    dropdown.style.display = 'block';
  } else {
    dropdown.style.display = 'none';
    document.getElementById('diag-svc-info').style.display = 'block';
    document.getElementById('diag-svc-nombre').value = texto;
    document.getElementById('diag-svc-horas').value = '0';
    document.getElementById('diag-svc-valor').value = '0';
    document.getElementById('diag-svc-seleccionado-id').value = '';
    document.getElementById('diag-svc-repuestos').innerHTML = 'No encontrado en catálogo. Completa los datos y usa "Guardar servicio" para crearlo.';
    document.getElementById('diag-btn-agregar-svc').style.display = 'none';
    document.getElementById('diag-btn-guardar-svc').style.display = '';
  }
}

function _diagSeleccionarServicio(id) {
  const servicios = APP.lsGet('mp_servicios', []);
  const servicio = servicios.find(s => s.id === id);
  if (!servicio) return;
  document.getElementById('diag-svc-nombre').value = servicio.nombre;
  document.getElementById('diag-svc-horas').value = servicio.horas || servicio.horasEst || servicio.horas_estimadas || 0;
  document.getElementById('diag-svc-valor').value = servicio.valor || servicio.precioFijo || servicio.precio_venta || 0;
  document.getElementById('diag-svc-seleccionado-id').value = id;
  document.getElementById('diag-svc-info').style.display = 'block';
  const dropdown = document.getElementById('diag-svc-sugerencias');
  if (dropdown) dropdown.style.display = 'none';
  const reps = servicio.repuestos || servicio.repuestosSugeridos || [];
  const repsEl = document.getElementById('diag-svc-repuestos');
  if (repsEl) {
    if (reps.length) {
      repsEl.innerHTML = '<div style="font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Repuestos sugeridos</div>' +
        reps.map(r => {
          const inv = typeof _findRepuestoEnInventario === 'function' ? _findRepuestoEnInventario(r.nombre || r.desc || '') : null;
          const badge = inv && inv.stock > 0
            ? `<span style="margin-left:6px;font-size:9px;padding:1px 5px;border-radius:6px;background:#05966915;color:#059669;border:0.5px solid #05966930">✓ En inventario (stock: ${inv.stock})</span>`
            : `<span style="margin-left:6px;font-size:9px;padding:1px 5px;border-radius:6px;background:#d9770615;color:#d97706;border:0.5px solid #d9770630">Cotizar</span>`;
          return `<div style="font-size:10px;padding:2px 0;color:var(--text-secondary)">• ${r.nombre}${r.cantidad ? ' (x' + r.cantidad + ')' : ''}${r.precio || r.precio_unitario ? ' — $' + ((r.precio||r.precio_unitario||0)).toLocaleString('es-CL') : ''}${r.proveedor ? ' — ' + r.proveedor : ''}${badge}</div>`;
        }).join('');
    } else {
      repsEl.innerHTML = '<div style="font-size:11px;color:var(--text-muted)">Sin repuestos sugeridos</div>';
    }
  }
  document.getElementById('diag-btn-agregar-svc').style.display = '';
  document.getElementById('diag-btn-guardar-svc').style.display = 'none';
}

function _diagAgregarServicio() {
  const nombre = document.getElementById('diag-svc-nombre').value.trim();
  const horas  = parseFloat(document.getElementById('diag-svc-horas').value) || 0;
  const valor  = parseInt(document.getElementById('diag-svc-valor').value) || 0;
  const svcId  = document.getElementById('diag-svc-seleccionado-id').value;
  if (!nombre) { APP.toast.show('El nombre del servicio es obligatorio', 'warning'); return; }
  const servicios = APP.lsGet('mp_servicios', []);
  const servicio  = servicios.find(s => s.id === svcId);
  const repuestos = servicio ? JSON.parse(JSON.stringify(servicio.repuestos || servicio.repuestosSugeridos || [])) : [];
  _diagServicios.push({ id: svcId || ('manual-'+Date.now()), nombre, horas, valor, repuestos });
  _diagReps = _diagServicios.flatMap(s => s.repuestos || []);
  _diagRenderServicios();
  _diagLimpiarInfoServicio();
  APP.toast.show('✅ ' + nombre + ' agregado', 'success');
}

function _diagEliminarServicio(idx) {
  _diagServicios.splice(idx, 1);
  _diagReps = _diagServicios.flatMap(s => s.repuestos || []);
  _diagRenderServicios();
}

function _diagGuardarServicioCatalogo() {
  const nombre = document.getElementById('diag-svc-nombre').value.trim();
  const horas  = parseFloat(document.getElementById('diag-svc-horas').value) || 0;
  const valor  = parseInt(document.getElementById('diag-svc-valor').value) || 0;
  if (!nombre) { APP.toast.show('El nombre del servicio es obligatorio', 'warning'); return; }
  const servicios = APP.lsGet('mp_servicios', []);
  const nuevo = { id:'svc-'+Date.now(), nombre, horas_estimadas:horas, horasEst:horas, precio_venta:valor, precioFijo:valor, repuestos:[], repuestosSugeridos:[], categoria:'Otro', creado:new Date().toISOString() };
  servicios.push(nuevo);
  APP.lsSet('mp_servicios', servicios);
  APP.toast.show('💾 ' + nombre + ' guardado en catálogo', 'success');
  _diagSeleccionarServicio(nuevo.id);
}

function _diagRenderServicios() {
  const el = document.getElementById('diag-servicios-lista');
  const totalEl = document.getElementById('diag-servicios-total');
  const subVal  = document.getElementById('diag-subtotal-valor');
  if (!el) return;
  if (!_diagServicios.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text-muted);padding:4px 0">Sin servicios agregados</div>';
    if (totalEl) totalEl.style.display = 'none';
    return;
  }
  let subtotal = 0;
  el.innerHTML = _diagServicios.map((s, i) => {
    subtotal += s.valor || 0;
    const reps = s.repuestos && s.repuestos.length ? s.repuestos.map(r => r.nombre).join(', ') : '';
    return `<div style="display:flex;align-items:center;gap:6px;font-size:11px;padding:6px 0;border-bottom:0.5px solid var(--border)">
      <i class="ti ti-tool" style="color:#2563eb;font-size:14px"></i>
      <span style="flex:1">
        <strong>${s.nombre}</strong>
        ${s.horas ? ' <span style="color:var(--text-muted)">(' + s.horas + 'h)</span>' : ''}
        <span style="color:var(--text-accent)"> ${'$' + (s.valor||0).toLocaleString('es-CL')}</span>
        ${reps ? '<br><span style="color:var(--text-muted);font-size:10px">🔩 ' + reps + '</span>' : ''}
      </span>
      <button onclick="_diagEliminarServicio(${i})" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:15px;padding:0;line-height:1" title="Eliminar">🗑️</button>
    </div>`;
  }).join('');
  if (totalEl && subVal) {
    totalEl.style.display = '';
    subVal.textContent = '$' + subtotal.toLocaleString('es-CL');
  }
}

function _diagLimpiarInfoServicio() {
  const info = document.getElementById('diag-svc-info');
  if (info) info.style.display = 'none';
  const buscar = document.getElementById('diag-svc-buscar');
  if (buscar) buscar.value = '';
  ['diag-svc-nombre','diag-svc-horas','diag-svc-valor'].forEach(id => {
    const e = document.getElementById(id); if (e) e.value = '';
  });
  const h = document.getElementById('diag-svc-horas'); if (h) h.value = '0';
  const v = document.getElementById('diag-svc-valor'); if (v) v.value = '0';
  const sel = document.getElementById('diag-svc-seleccionado-id'); if (sel) sel.value = '';
  const agg = document.getElementById('diag-btn-agregar-svc'); if (agg) agg.style.display = 'none';
  const grd = document.getElementById('diag-btn-guardar-svc'); if (grd) grd.style.display = 'none';
}

// ---- Fotos ----

// ---- Fotos ----
function _diagManejarFotos(input) {
  const restantes = 10 - _diagFotos.length;
  if (restantes <= 0) { APP.toast.show('Máximo 10 fotos por motivo', 'warning'); input.value = ''; return; }
  Array.from(input.files).slice(0, restantes).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => { _diagFotos.push(e.target.result); _diagRenderFotos(); };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function _diagEliminarFoto(i) { _diagFotos.splice(i, 1); _diagRenderFotos(); }

function _diagRenderFotos() {
  const el = document.getElementById('diag-fotos-preview');
  if (!el) return;
  el.innerHTML = _diagFotos.map((src, i) => `
    <div style="position:relative;display:inline-block;margin:4px">
      <img src="${src}" style="width:72px;height:72px;object-fit:cover;border-radius:6px;border:0.5px solid var(--border)">
      <button onclick="_diagEliminarFoto(${i})" style="position:absolute;top:-6px;right:-6px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;line-height:1">×</button>
    </div>`).join('');
}

// ---- Nueva falla ----
function _diagAgregarNuevaFalla() {
  if (!_diagOtId) return;
  const desc = prompt('Describe la nueva falla encontrada:');
  if (!desc || !desc.trim()) return;

  const ots = APP.lsGet('mp_ots', []);
  const idx = ots.findIndex(o => o.id === _diagOtId);
  if (idx < 0) return;

  ots[idx].motivos = [...(ots[idx].motivos || []), {
    descripcion:          desc.trim(),
    diagnostico:          '',
    horas_reparacion:     0,
    valor_mano_obra:      0,
    impuesto:             0,
    repuestos:            [],
    insumos:              [],
    evidencia_diagnostico:[],
    diagnosticado:        false,
    nueva_falla:          true,
  }];
  APP.lsSet('mp_ots', ots);

  _diagReps  = [];
  _diagIns   = [];
  _diagFotos = [];

  const ot = ots[idx];
  _diagPopularSelect(ot);
  _diagMotoIdx = ot.motivos.length - 1;
  const sel = document.getElementById('diag-motivo-select');
  if (sel) sel.value = _diagMotoIdx;
  _diagCargarMotivo(_diagMotoIdx, ot);

  APP.toast.show('Nueva falla agregada', 'success');
}

// ---- Controlar visibilidad de botones footer ----
function _diagActualizarBotones(ot) {
  const todos    = (ot.motivos || []).every(m => m.diagnosticado);
  const btnGuard = document.getElementById('diag-btn-guardar');
  const btnFin   = document.getElementById('diag-btn-finalizar');
  if (btnGuard) btnGuard.style.display = todos ? 'none' : '';
  if (btnFin)   btnFin.style.display   = todos ? ''     : 'none';
}

// ---- Guardar diagnóstico del motivo actual ----
function _diagGuardar() {
  if (!_diagOtId) return;
  const texto = document.getElementById('diag-diagnostico-text')?.value.trim();
  if (!texto) { APP.toast.show('El diagnóstico es obligatorio', 'warning'); return; }

  const ots = APP.lsGet('mp_ots', []);
  const idx = ots.findIndex(o => o.id === _diagOtId);
  if (idx < 0) return;

  const sesion  = APP.lsGet('mp_sesion') || {};
  const esMec   = (sesion.rol || '').toLowerCase() === 'mecanico';
  const horas   = parseFloat(document.getElementById('diag-horas')?.value) || 0;
  const moVal   = esMec ? (ots[idx].motivos[_diagMotoIdx]?.valor_mano_obra || 0)
                        : (parseFloat(document.getElementById('diag-mano-obra')?.value) || 0);
  const ivaVal  = !esMec && document.getElementById('diag-iva-sel')?.value === '19' ? 19 : 0;

  _diagReps = _diagServicios.flatMap(s => s.repuestos || []);
  ots[idx].motivos[_diagMotoIdx] = {
    ...(ots[idx].motivos[_diagMotoIdx] || {}),
    diagnostico:          texto,
    horas_reparacion:     horas,
    valor_mano_obra:      moVal,
    impuesto:             ivaVal,
    servicios:            [..._diagServicios],
    repuestos:            [..._diagReps],
    insumos:              [..._diagIns],
    evidencia_diagnostico:[..._diagFotos],
    diagnosticado:        true,
  };
  APP.lsSet('mp_ots', ots);

  const ot   = ots[idx];
  const todos = ot.motivos.every(m => m.diagnosticado);

  _diagPopularSelect(ot);

  if (todos) {
    APP.toast.show('✅ Todos los motivos diagnosticados — puedes finalizar', 'success');
    _diagCargarMotivo(_diagMotoIdx, ot);
  } else {
    // Pasar al siguiente pendiente
    const next = ot.motivos.findIndex((m, i) => i > _diagMotoIdx && !m.diagnosticado);
    const pending = next >= 0 ? next : ot.motivos.findIndex(m => !m.diagnosticado);
  _diagReps       = [];
  _diagIns        = [];
  _diagFotos      = [];
  _diagServicios  = [];
    const sel = document.getElementById('diag-motivo-select');
    if (sel && pending >= 0) sel.value = pending;
    _diagCargarMotivo(pending >= 0 ? pending : _diagMotoIdx, ot);
    APP.toast.show('✅ Diagnóstico guardado — siguiente motivo seleccionado', 'success');
  }
}

// ===== MÓDULO: CONTROL DE CALIDAD =====

let _ccOtId  = null;
let _ccFotos = [];

// Extender patch de abrirDetalleOT para panel de control
(function _setupControlPatch() {
  const orig = window.abrirDetalleOT;
  if (!orig) { setTimeout(_setupControlPatch, 80); return; }
  window.abrirDetalleOT = function(id) {
    orig(id);
    setTimeout(() => {
      const ots = APP.lsGet('mp_ots', []);
      const ot  = ots.find(o => o.id === id);
      if (ot) _detControlPanelRender(ot);
    }, 0);
  };
})();

function _detControlPanelRender(ot) {
  const panel = document.getElementById('det-panel-control');
  if (!panel) return;
  const show = ot.fase === 'reparacion' || ot.fase === 'control';
  if (!show) { panel.style.display = 'none'; return; }
  panel.style.display = '';

  const titleEl = document.getElementById('det-control-fase-title');
  const descEl  = document.getElementById('det-control-fase-desc');
  const btnEl   = document.getElementById('det-control-btn');

  if (ot.fase === 'reparacion') {
    if (titleEl) titleEl.textContent = '🔧 Fase: Reparación';
    if (descEl)  descEl.textContent  = 'La reparación está en proceso. Cuando esté lista, avanza a Control de Calidad para verificar el trabajo antes de entregar al cliente.';
    if (btnEl) {
      btnEl.textContent = '✅ AVANZAR A CONTROL DE CALIDAD';
      btnEl.onclick     = mostrarModalEvidenciaReparacion;
    }
  } else {
    if (titleEl) titleEl.textContent = '🔍 Fase: Control de Calidad';
    if (descEl)  descEl.textContent  = 'El vehículo está pendiente del control de calidad. Realiza el checklist antes de entregar al cliente.';
    if (btnEl) {
      btnEl.textContent = '🔍 REALIZAR CONTROL DE CALIDAD';
      btnEl.onclick     = abrirModalControlCalidad;
    }
  }
}

// ---- Modal evidencia de reparación ----
function mostrarModalEvidenciaReparacion() {
  if (!window._otDetalleId) return;
  _ccOtId  = window._otDetalleId;
  _ccFotos = [];
  _ccRenderFotosEvidencia();
  const panel = document.getElementById('cc-ev-upload-panel');
  if (panel) panel.style.display = 'none';
  const m = document.getElementById('modal-evidencia-reparacion');
  if (m) m.style.display = 'flex';
}

function cerrarModalEvidenciaRep() {
  const m = document.getElementById('modal-evidencia-reparacion');
  if (m) m.style.display = 'none';
}

function _ccRenderFotosEvidencia() {
  const el = document.getElementById('cc-ev-fotos-preview');
  if (!el) return;
  if (!_ccFotos.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:10px">Sin fotos agregadas aún</div>';
    return;
  }
  el.innerHTML = _ccFotos.map((src, i) => `
    <div style="position:relative;display:inline-block;margin:4px">
      <img src="${src}" style="width:72px;height:72px;object-fit:cover;border-radius:6px;border:0.5px solid var(--border)">
      <button onclick="_ccEliminarFotoEv(${i})" style="position:absolute;top:-6px;right:-6px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:12px;cursor:pointer;line-height:1">×</button>
    </div>`).join('');
}

function _ccEliminarFotoEv(i) { _ccFotos.splice(i, 1); _ccRenderFotosEvidencia(); }

function _ccManejarFotosEv(input) {
  const restantes = 10 - _ccFotos.length;
  if (restantes <= 0) { APP.toast.show('Máximo 10 fotos', 'warning'); input.value = ''; return; }
  Array.from(input.files).slice(0, restantes).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => { _ccFotos.push(e.target.result); _ccRenderFotosEvidencia(); };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function ccMostrarUploadEvidencia() {
  const panel = document.getElementById('cc-ev-upload-panel');
  if (panel) panel.style.display = '';
  const btn = document.getElementById('cc-ev-btn-continuar');
  if (btn) btn.style.display = '';
}

function ccIncluirEvidencia() {
  if (_ccFotos.length) {
    const ots = APP.lsGet('mp_ots', []);
    const idx = ots.findIndex(o => o.id === _ccOtId);
    if (idx >= 0) {
      ots[idx].evidencia_reparacion = [..._ccFotos];
      APP.lsSet('mp_ots', ots);
    }
  }
  cerrarModalEvidenciaRep();
  abrirModalControlCalidad();
}

function ccAvanzarSinEvidencia() {
  cerrarModalEvidenciaRep();
  abrirModalControlCalidad();
}

// ---- Modal principal de control de calidad ----
function abrirModalControlCalidad() {
  if (!_ccOtId) _ccOtId = window._otDetalleId;
  if (!_ccOtId) return;

  const ots = APP.lsGet('mp_ots', []);
  const idx = ots.findIndex(o => o.id === _ccOtId);
  if (idx < 0) return;

  if (ots[idx].fase === 'reparacion') {
    const ahora = new Date();
    ots[idx].fase = 'control';
    ots[idx].historial = [...(ots[idx].historial || []), {
      estado:  'control_iniciado',
      label:   'Control de calidad iniciado',
      emoji:   '🔍',
      ts:      ahora.toISOString(),
      hora:    ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      fecha:   ahora.toLocaleDateString('es-CL'),
    }];
    APP.lsSet('mp_ots', ots);
  }

  const ot = ots[idx];
  _ccPopularResumen(ot);

  // Limpiar checklist
  document.querySelectorAll('#modal-control-calidad input[type="checkbox"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('#modal-control-calidad input[type="radio"]').forEach(r => r.checked = false);
  const obs = document.getElementById('cc-observaciones');
  if (obs) obs.value = '';
  const corr = document.getElementById('cc-servicios-adicionales');
  if (corr) corr.value = '';
  const corrBox = document.getElementById('cc-correccion-box');
  if (corrBox) corrBox.style.display = 'none';

  const kmEl = document.getElementById('cc-km-salida');
  if (kmEl) kmEl.value = ot.kilometraje?.entrada || '';

  const m = document.getElementById('modal-control-calidad');
  if (m) m.style.display = 'flex';
}

function cerrarModalControlCalidad() {
  const m = document.getElementById('modal-control-calidad');
  if (m) m.style.display = 'none';
  const id = _ccOtId;
  _ccOtId = null;
  if (id) abrirDetalleOT(id);
}

function _ccPopularResumen(ot) {
  const motivos = ot.motivos || [];

  const diagEl = document.getElementById('cc-resumen-diagnostico');
  if (diagEl) {
    diagEl.innerHTML = motivos.length
      ? motivos.map((m, i) => `
          <div style="margin-bottom:6px;padding:6px 8px;background:var(--surface-1);border-radius:var(--radius);border-left:3px solid #2563eb">
            <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">${m.descripcion || 'Motivo ' + (i + 1)}</div>
            <div style="font-size:11px;margin-top:3px">${m.diagnostico || '—'}</div>
          </div>`).join('')
      : '<div style="font-size:11px;color:var(--text-muted)">Sin diagnóstico registrado</div>';
  }

  const procEl = document.getElementById('cc-resumen-procedimientos');
  if (procEl) {
    const procs = motivos.filter(m => m.diagnostico).map(m => m.descripcion || '—');
    procEl.innerHTML = procs.length
      ? procs.map(p => `<div style="font-size:11px;padding:2px 0">• ${p}</div>`).join('')
      : '<div style="font-size:11px;color:var(--text-muted)">—</div>';
  }

  const moEl = document.getElementById('cc-resumen-mano-obra');
  if (moEl) {
    const totalHrs = motivos.reduce((s, m) => s + (parseFloat(m.horas_reparacion) || 0), 0);
    moEl.textContent = totalHrs ? `${totalHrs} hrs` : '—';
  }

  const repsEl = document.getElementById('cc-resumen-repuestos');
  if (repsEl) {
    const reps = motivos.flatMap(m => m.repuestos || []);
    repsEl.innerHTML = reps.length
      ? reps.map(r => `<div style="font-size:11px;padding:2px 0">• ${r.nombre} <span style="color:var(--text-muted)">(x${r.cantidad || 1})</span></div>`).join('')
      : '<div style="font-size:11px;color:var(--text-muted)">Sin repuestos</div>';
  }

  const insEl = document.getElementById('cc-resumen-insumos');
  if (insEl) {
    const ins = motivos.flatMap(m => m.insumos || []);
    insEl.innerHTML = ins.length
      ? ins.map(r => `<div style="font-size:11px;padding:2px 0">• ${r.nombre} <span style="color:var(--text-muted)">(x${r.cantidad || 1})</span></div>`).join('')
      : '<div style="font-size:11px;color:var(--text-muted)">Sin insumos</div>';
  }
}

function ccToggleAprobacion(val) {
  const corrBox = document.getElementById('cc-correccion-box');
  if (corrBox) corrBox.style.display = val === 'no' ? '' : 'none';
}

function _ccGetChecked(name) {
  return Array.from(document.querySelectorAll(`#modal-control-calidad input[name="${name}"]:checked`))
    .map(cb => cb.value);
}

function ccGuardarControl() {
  if (!_ccOtId) return;

  const aprobadoEl = document.querySelector('#modal-control-calidad input[name="cc-aprobacion"]:checked');
  if (!aprobadoEl) {
    APP.toast.show('Debes indicar si aprueba o no el control de calidad', 'warning');
    return;
  }
  const aprobado = aprobadoEl.value === 'si';

  if (!aprobado) {
    const corr = document.getElementById('cc-correccion')?.value.trim();
    if (!corr) { APP.toast.show('Indica qué requiere corrección', 'warning'); return; }
  }

  const ots = APP.lsGet('mp_ots', []);
  const idx = ots.findIndex(o => o.id === _ccOtId);
  if (idx < 0) return;

  const sesion  = APP.lsGet('mp_sesion') || {};
  const usuario = sesion.nombre || 'Técnico';
  const ahora   = new Date();
  const kmSalida = parseInt(document.getElementById('cc-km-salida')?.value) || 0;

  ots[idx].control_calidad = {
    kilometraje_salida: kmSalida,
    resolucion_averia:  _ccGetChecked('cc-resolucion'),
    estado_entrega:     _ccGetChecked('cc-estado-entrega'),
    fluidos_salida:     _ccGetChecked('cc-fluidos'),
    inventario_salida:  _ccGetChecked('cc-inventario'),
    observaciones:      document.getElementById('cc-observaciones')?.value.trim() || '',
    aprobado,
    aprobado_por:       usuario,
    fecha:              ahora.getTime(),
  };

  if (kmSalida) {
    if (!ots[idx].kilometraje) ots[idx].kilometraje = {};
    ots[idx].kilometraje.salida = kmSalida;
  }

  const id = _ccOtId;

  if (aprobado) {
    ots[idx].fase = 'entrega';
    ots[idx].historial = [...(ots[idx].historial || []), {
      estado:  'control_aprobado',
      label:   `Control de calidad aprobado por ${usuario}`,
      emoji:   '✅',
      ts:      ahora.toISOString(),
      hora:    ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      fecha:   ahora.toLocaleDateString('es-CL'),
      detalle: 'Control de calidad completado. OT avanza a Entrega.',
    }];
    APP.lsSet('mp_ots', ots);
    _ccOtId = null;
    const m = document.getElementById('modal-control-calidad');
    if (m) m.style.display = 'none';
    setTimeout(() => _ccMostrarModalNotificacion(id), 150);
    APP.toast.show('✅ Control aprobado — OT avanza a Entrega', 'success');
  } else {
    const correccion = document.getElementById('cc-correccion')?.value.trim() || '';
    ots[idx].fase = 'reparacion';
    ots[idx].historial = [...(ots[idx].historial || []), {
      estado:  'control_rechazado',
      label:   `Control rechazado por ${usuario} — requiere corrección`,
      emoji:   '❌',
      ts:      ahora.toISOString(),
      hora:    ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      fecha:   ahora.toLocaleDateString('es-CL'),
      detalle: correccion,
    }];
    APP.lsSet('mp_ots', ots);
    _ccOtId = null;
    const m = document.getElementById('modal-control-calidad');
    if (m) m.style.display = 'none';
    abrirDetalleOT(id);
    APP.toast.show('⚠️ Control no aprobado — OT vuelve a Reparación', 'warning');
  }
}

// ---- Modal notificación post-control ----
let _ccNotifOtId = null;

function _ccMostrarModalNotificacion(otId) {
  _ccNotifOtId = otId;
  const m = document.getElementById('modal-control-notificacion');
  if (m) m.style.display = 'flex';
}

function cerrarModalControlNotif() {
  const m = document.getElementById('modal-control-notificacion');
  if (m) m.style.display = 'none';
  const id = _ccNotifOtId;
  _ccNotifOtId = null;
  if (id) abrirDetalleOT(id);
}

function ccNotificarClienteWA() {
  if (!_ccNotifOtId) return;
  const ots    = APP.lsGet('mp_ots', []);
  const ot     = ots.find(o => o.id === _ccNotifOtId);
  if (!ot) return;

  const config  = APP.lsGet('mp_config') || {};
  const taller  = config.nombre || 'el taller';
  const cliente = ot.clienteNombre || 'Cliente';
  const veh     = [ot.marca, ot.modelo].filter(Boolean).join(' ') || 'vehículo';
  const pat     = ot.patente ? ` placa ${ot.patente}` : '';
  const msg     = `Hola ${cliente} 🎉, tu ${veh}${pat} está listo para retirar en ${taller}. ¡Te esperamos! 🚗✅`;

  const wzNum = (ot.wz || '').replace(/\D/g, '');
  window.open(
    wzNum
      ? `https://wa.me/${wzNum}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`,
    '_blank'
  );
  APP.toast.show('📱 Notificación enviada por WhatsApp', 'success');
  cerrarModalControlNotif();
}

function ccAvanzarSinNotificar() {
  cerrarModalControlNotif();
}

// ===== MÓDULO: PLANTILLAS WHATSAPP EN OT =====

const _WA_PLANTILLAS_DEFAULT = {
  confirmar_cita: `Hola [Cliente] 👋\nTe confirmamos tu cita en [Taller]:\n📅 [Fecha] a las [Hora]\n🚗 [Marca] [Modelo]\n¡Te esperamos! 🔧`,
  vehiculo_recibido: `Hola [Cliente] 👋\nRecibimos tu [Marca] [Modelo]\nplaca [Patente] en [Taller].\nYa estamos trabajando en él ✅\nTe avisaremos cuando tengamos novedades.`,
  cotizacion_lista: `Hola [Cliente] 🔧\nLa cotización de tu [Marca] [Modelo]\nestá lista. Total: $[Monto]\nRevisa y aprueba aquí: [Link]\n¡Cualquier duda estamos disponibles!`,
  vehiculo_listo: `Hola [Cliente] 🎉\nTu [Marca] [Modelo] placa [Patente]\nestá listo para retirar en [Taller].\n¡Te esperamos cuando puedas! 🚗✨`,
  recordatorio_pago: `Hola [Cliente] 👋\nTe recordamos que tienes un pago\npendiente de $[Monto] por [Servicio]\nen [Taller].\nPor favor contáctanos para coordinarlo.`,
  encuesta: `Hola [Cliente] 😊\nGracias por confiar en [Taller].\n¿Cómo calificarías nuestro servicio?\n1⭐ 2⭐ 3⭐ 4⭐ 5⭐\nTu opinión nos ayuda a mejorar 🙏`,
};

const _WA_PLANTILLAS_LABELS = {
  confirmar_cita:    '📅 Confirmar cita',
  vehiculo_recibido: '🔧 Vehículo recibido',
  cotizacion_lista:  '💰 Cotización lista',
  vehiculo_listo:    '✅ Vehículo listo',
  recordatorio_pago: '⏳ Recordatorio pago',
  encuesta:          '😊 Encuesta',
};

let _waOtId         = null;
let _waPlantillaKey = null;

function _waGetPlantillas() {
  const config = APP.lsGet('mp_config') || {};
  const guardadas = config.plantillas_whatsapp || {};
  const resultado = {};
  Object.keys(_WA_PLANTILLAS_DEFAULT).forEach(k => {
    resultado[k] = guardadas[k] || _WA_PLANTILLAS_DEFAULT[k];
  });
  return resultado;
}

function _waReemplazarVariables(texto, ot) {
  const config = APP.lsGet('mp_config') || {};
  const taller  = config.nombre || 'el taller';
  const link    = config.link_agendamiento || window.location.origin;
  const fecha   = ot.fechaCita
    ? new Date(ot.fechaCita).toLocaleDateString('es-CL')
    : '—';
  const hora    = ot.horaCita || '—';
  const monto   = (() => {
    const pagos = ot.pagos || [];
    if (pagos.length) {
      const total = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
      return total.toLocaleString('es-CL');
    }
    return (parseFloat(ot.valorTotal || ot.valor || 0) || 0).toLocaleString('es-CL');
  })();
  const servicio = (ot.servicios || []).map(s => s.nombre || s).filter(Boolean).join(', ') || '—';

  return texto
    .replace(/\[Cliente\]/g,  ot.clienteNombre || 'Cliente')
    .replace(/\[Patente\]/g,  ot.patente || '—')
    .replace(/\[Marca\]/g,    ot.marca   || '—')
    .replace(/\[Modelo\]/g,   ot.modelo  || '—')
    .replace(/\[Fecha\]/g,    fecha)
    .replace(/\[Hora\]/g,     hora)
    .replace(/\[Monto\]/g,    monto)
    .replace(/\[Servicio\]/g, servicio)
    .replace(/\[Taller\]/g,   taller)
    .replace(/\[Link\]/g,     link);
}

function abrirModalWA() {
  if (!window._otDetalleId) return;
  _waOtId         = window._otDetalleId;
  _waPlantillaKey = null;

  const ots = APP.lsGet('mp_ots', []);
  const ot  = ots.find(o => o.id === _waOtId);
  if (!ot) return;

  const sub = document.getElementById('modal-wa-subtitulo');
  if (sub) {
    const nombre = ot.clienteNombre || 'Cliente';
    const wz     = ot.wz ? ` (${ot.wz})` : '';
    sub.textContent = `${nombre}${wz}`;
  }

  waVolverPlantillas();
  _waRenderHistorial(ot);

  const m = document.getElementById('modal-wa-plantillas');
  if (m) m.style.display = 'flex';
}

function cerrarModalWA() {
  const m = document.getElementById('modal-wa-plantillas');
  if (m) m.style.display = 'none';
  _waOtId         = null;
  _waPlantillaKey = null;
}

function waVolverPlantillas() {
  const grid   = document.getElementById('wa-plantillas-grid');
  const editor = document.getElementById('wa-editor-area');
  if (grid)   grid.style.display   = 'grid';
  if (editor) editor.style.display = 'none';
}

function waSeleccionarPlantilla(key) {
  if (!_waOtId) return;
  _waPlantillaKey = key;

  const ots = APP.lsGet('mp_ots', []);
  const ot  = ots.find(o => o.id === _waOtId);
  if (!ot) return;

  const plantillas = _waGetPlantillas();
  const texto      = _waReemplazarVariables(plantillas[key] || '', ot);

  const label = document.getElementById('wa-plantilla-label');
  if (label) label.textContent = _WA_PLANTILLAS_LABELS[key] || key;

  const textarea = document.getElementById('wa-texto');
  if (textarea) textarea.value = texto;

  const grid   = document.getElementById('wa-plantillas-grid');
  const editor = document.getElementById('wa-editor-area');
  if (grid)   grid.style.display   = 'none';
  if (editor) editor.style.display = 'block';
}

function waEnviar() {
  if (!_waOtId || !_waPlantillaKey) return;
  const ots = APP.lsGet('mp_ots', []);
  const idx = ots.findIndex(o => o.id === _waOtId);
  if (idx < 0) return;
  const ot  = ots[idx];

  const texto = document.getElementById('wa-texto')?.value.trim();
  if (!texto) { APP.toast.show('El mensaje no puede estar vacío', 'warning'); return; }

  const wzNum = (ot.wz || '').replace(/\D/g, '');
  window.open(
    wzNum
      ? `https://wa.me/${wzNum}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`,
    '_blank'
  );

  const ahora = new Date();
  ots[idx].whatsapp_enviados = [...(ots[idx].whatsapp_enviados || []), {
    tipo:     _waPlantillaKey,
    label:    _WA_PLANTILLAS_LABELS[_waPlantillaKey] || _waPlantillaKey,
    texto,
    ts:       ahora.toISOString(),
    hora:     ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    fecha:    ahora.toLocaleDateString('es-CL'),
  }];
  APP.lsSet('mp_ots', ots);

  _waRenderHistorial(ots[idx]);
  waVolverPlantillas();
  APP.toast.show('✓ Abriendo WhatsApp…', 'success');
}

function _waRenderHistorial(ot) {
  const el = document.getElementById('wa-historial-lista');
  if (!el) return;
  const enviados = (ot.whatsapp_enviados || []).slice().reverse();
  if (!enviados.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:4px 0">Sin mensajes enviados</div>';
    return;
  }
  el.innerHTML = enviados.map(e => `
    <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:0.5px solid var(--border)">
      <span style="font-size:16px;line-height:1.2">📱</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:500;font-size:11px">${_admEscWA(e.label)}</div>
        <div style="font-size:10px;color:var(--text-muted)">${e.fecha} ${e.hora}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;white-space:pre-wrap;word-break:break-word;max-height:48px;overflow:hidden">${_admEscWA(e.texto)}</div>
      </div>
    </div>`).join('');
}

function _admEscWA(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ---- Finalizar: avanzar OT a fase repuestos ----
function _diagFinalizar() {
  if (!_diagOtId) return;
  const ots = APP.lsGet('mp_ots', []);
  const idx = ots.findIndex(o => o.id === _diagOtId);
  if (idx < 0) return;

  const sesion  = APP.lsGet('mp_sesion') || {};
  const usuario = sesion.nombre || 'Técnico';
  const ahora   = new Date();

  ots[idx].fase = 'repuestos';
  ots[idx].historial = [...(ots[idx].historial || []), {
    estado:  'diagnostico_completado',
    label:   `Diagnóstico completado por ${usuario}`,
    emoji:   '🔬',
    ts:      ahora.toISOString(),
    hora:    ahora.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' }),
    fecha:   ahora.toLocaleDateString('es-CL'),
    detalle: `${ots[idx].motivos.length} motivo(s) diagnosticado(s). OT avanza a Repuestos.`,
  }];
  APP.lsSet('mp_ots', ots);

  const id = _diagOtId;
  cerrarModalDiagnostico();
  abrirDetalleOT(id);
  APP.toast.show('🔬 Diagnóstico finalizado — OT avanza a Repuestos', 'success');
}
