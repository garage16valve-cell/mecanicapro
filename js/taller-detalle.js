// ===== MÓDULO: APROBACIÓN DIGITAL DE INGRESO =====

let _aprobOtId = null;

// Parcha abrirDetalleOT para mostrar el badge de aprobación al abrir cualquier OT
(function _setupAprobPatch() {
  const orig = window.abrirDetalleOT;
  if (!orig) { setTimeout(_setupAprobPatch, 80); return; }
  window.abrirDetalleOT = function(id) {
    orig(id);
    setTimeout(() => {
      const ots = APP.lsGet('mp_ots', []);
      const ot  = ots.find(o => o.id === id);
      if (ot) _detAprobBadgeRender(ot);
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
