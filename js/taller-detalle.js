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

let _diagOtId    = null;
let _diagMotoIdx = 0;
let _diagReps    = [];   // repuestos temporales del motivo actual
let _diagIns     = [];   // insumos temporales del motivo actual
let _diagFotos   = [];   // fotos temporales del motivo actual

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

  _diagReps  = [...(m.repuestos || [])];
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

  _diagRenderReps();
  _diagRenderIns();
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

// ---- Repuestos ----
function _diagAgregarRepuesto() {
  const nombre = document.getElementById('diag-rep-nombre')?.value.trim();
  if (!nombre) { APP.toast.show('Ingresa el nombre del repuesto', 'warning'); return; }
  _diagReps.push({
    nombre,
    referencia:    document.getElementById('diag-rep-ref')?.value.trim() || '',
    cantidad:      parseFloat(document.getElementById('diag-rep-cant')?.value) || 1,
    observaciones: document.getElementById('diag-rep-obs')?.value.trim() || '',
  });
  ['diag-rep-nombre','diag-rep-ref','diag-rep-obs'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  const c = document.getElementById('diag-rep-cant'); if (c) c.value = '1';
  _diagRenderReps();
}

function _diagEliminarRep(i) { _diagReps.splice(i, 1); _diagRenderReps(); }

function _diagRenderReps() {
  const el = document.getElementById('diag-rep-lista');
  if (!el) return;
  if (!_diagReps.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text-muted);padding:4px 0">Sin repuestos agregados</div>';
    return;
  }
  el.innerHTML = _diagReps.map((r, i) => `
    <div style="display:flex;align-items:center;gap:6px;font-size:11px;padding:5px 0;border-bottom:0.5px solid var(--border)">
      <span style="color:#16a34a;font-size:12px">✓</span>
      <span style="flex:1"><strong>${r.nombre}</strong>${r.referencia ? ' — ' + r.referencia : ''} <span style="color:var(--text-muted)">(Cant: ${r.cantidad})</span>${r.observaciones ? '<br><span style="color:var(--text-muted)">' + r.observaciones + '</span>' : ''}</span>
      <button onclick="_diagEliminarRep(${i})" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:15px;padding:0;line-height:1" title="Eliminar">🗑️</button>
    </div>`).join('');
}

// ---- Insumos ----
function _diagAgregarInsumo() {
  const nombre = document.getElementById('diag-ins-nombre')?.value.trim();
  if (!nombre) { APP.toast.show('Ingresa el nombre del insumo', 'warning'); return; }
  _diagIns.push({
    nombre,
    referencia:    document.getElementById('diag-ins-ref')?.value.trim() || '',
    cantidad:      parseFloat(document.getElementById('diag-ins-cant')?.value) || 1,
    observaciones: document.getElementById('diag-ins-obs')?.value.trim() || '',
  });
  ['diag-ins-nombre','diag-ins-ref','diag-ins-obs'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  const c = document.getElementById('diag-ins-cant'); if (c) c.value = '1';
  _diagRenderIns();
}

function _diagEliminarIns(i) { _diagIns.splice(i, 1); _diagRenderIns(); }

function _diagRenderIns() {
  const el = document.getElementById('diag-ins-lista');
  if (!el) return;
  if (!_diagIns.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text-muted);padding:4px 0">Sin insumos agregados</div>';
    return;
  }
  el.innerHTML = _diagIns.map((r, i) => `
    <div style="display:flex;align-items:center;gap:6px;font-size:11px;padding:5px 0;border-bottom:0.5px solid var(--border)">
      <span style="color:#16a34a;font-size:12px">✓</span>
      <span style="flex:1"><strong>${r.nombre}</strong>${r.referencia ? ' — ' + r.referencia : ''} <span style="color:var(--text-muted)">(Cant: ${r.cantidad})</span>${r.observaciones ? '<br><span style="color:var(--text-muted)">' + r.observaciones + '</span>' : ''}</span>
      <button onclick="_diagEliminarIns(${i})" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:15px;padding:0;line-height:1" title="Eliminar">🗑️</button>
    </div>`).join('');
}

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

  ots[idx].motivos[_diagMotoIdx] = {
    ...(ots[idx].motivos[_diagMotoIdx] || {}),
    diagnostico:          texto,
    horas_reparacion:     horas,
    valor_mano_obra:      moVal,
    impuesto:             ivaVal,
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
    _diagReps  = [];
    _diagIns   = [];
    _diagFotos = [];
    const sel = document.getElementById('diag-motivo-select');
    if (sel && pending >= 0) sel.value = pending;
    _diagCargarMotivo(pending >= 0 ? pending : _diagMotoIdx, ot);
    APP.toast.show('✅ Diagnóstico guardado — siguiente motivo seleccionado', 'success');
  }
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
