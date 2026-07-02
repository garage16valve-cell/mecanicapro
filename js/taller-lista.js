// === LISTA UNIFICADA DE OTs CON FILTROS POR FASE ===

var FASES_OPCIONES = [
  { id: null,         label: 'Todas',       emoji: '📋' },
  { id: 'recepcion',  label: 'Recepción',   emoji: '🚶' },
  { id: 'diagnostico',label: 'Diagnóstico', emoji: '🔍' },
  { id: 'repuestos',  label: 'Repuestos',   emoji: '📦' },
  { id: 'reparacion', label: 'Reparación',  emoji: '🔨' },
  { id: 'cotizacion', label: 'Cotización',  emoji: '📄' },
  { id: 'pago',       label: 'Pago',        emoji: '💳' },
  { id: 'entrega',    label: 'Entrega',     emoji: '🎉' }
  // 'cancelada' no aparece como pestaña — el estado existe pero no es parte del flujo activo
];

var FASE_COLORES = {
  'recepcion':  { label: 'RECEPCIÓN',   color: '#7c3aed', bg: '#f3e8ff', border: '#a78bfa' },
  'diagnostico':{ label: 'DIAGNÓSTICO', color: '#0891b2', bg: '#cffafe', border: '#06b6d4' },
  'repuestos':  { label: 'REPUESTOS',   color: '#ea580c', bg: '#ffedd5', border: '#f97316' },
  'reparacion': { label: 'REPARACIÓN',  color: '#be123c', bg: '#ffe4e6', border: '#f43f5e' },
  'cotizacion': { label: 'COTIZACIÓN',  color: '#7c2d12', bg: '#fed7aa', border: '#d97706' },
  'pago':       { label: 'PAGO',        color: '#0d47a1', bg: '#dbeafe', border: '#3b82f6' },
  'entrega':    { label: 'ENTREGA',     color: '#15803d', bg: '#dcfce7', border: '#22c55e' },
  'cancelada':  { label: 'CANCELADA',   color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' }
};

var filtroFaseActivo = null;
var _filtrosLista = { desde: '', hasta: '', q: '' };

// Migración: OTs que quedaron en fase 'control' pasan a 'cotizacion'
function _migrarFaseControl() {
  var ots = APP.lsGet('ots') || [];
  var modificadas = 0;
  ots.forEach(function(ot) {
    if (ot.fase === 'control') {
      ot.fase = 'cotizacion';
      if (!ot.historial) ot.historial = ot.historial_eventos || [];
      ot.historial.push({ evento: 'migracion_fase', descripcion: 'Fase "control" eliminada del flujo — migrada automáticamente a Cotización', fecha: new Date().toISOString() });
      modificadas++;
    }
  });
  if (modificadas > 0) APP.lsSet('ots', ots);
}

// Init
function iniciarListaOT() {
  _migrarFaseControl();
  renderListaOTs();
  actualizarContadoresFiltro();
}

function _getOTs() {
  return APP.lsGet('ots') || [];
}

// Barra de filtros
function renderBarraFiltros() {
  var bar = document.getElementById('kanban-tabs-bar');
  if (!bar) return;

  var ots = _getOTs();
  var conteos = {};
  FASES_OPCIONES.forEach(function(f) { conteos[f.id] = 0; });

  ots.forEach(function(ot) {
    var fase = ot.fase || 'recepcion';
    if (conteos[fase] !== undefined) conteos[fase]++;
    if (conteos[null] !== undefined) conteos[null]++;
  });

  var html = '';
  FASES_OPCIONES.forEach(function(f) {
    var n = conteos[f.id] || 0;
    var active = f.id === filtroFaseActivo;
    var onclickVal = f.id === null ? 'null' : "'" + f.id + "'";
    html += '<button class="kanban-filtro-btn"' +
      ' id="btn-filtro-' + (f.id || 'todas') + '"' +
      ' onclick="activarFiltroOT(' + onclickVal + ')"' +
      ' style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border:0.5px solid var(--border);border-radius:var(--radius);background:' + (active ? 'var(--fill-accent)' : 'var(--surface-1)') + ';color:' + (active ? '#fff' : 'var(--text-secondary)') + ';font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .15s">' +
      f.emoji + ' ' + f.label + ' <span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 4px;border-radius:9px;font-size:10px;font-weight:700;background:' + (active ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.12)') + ';color:inherit">' + n + '</span>' +
      '</button>';
  });
  bar.innerHTML = html;
}

function actualizarContadoresFiltro() {
  renderBarraFiltros();
}

function activarFiltroOT(fase) {
  filtroFaseActivo = fase;
  renderBarraFiltros();
  renderListaOTs();
}

// Render lista unificada
function renderListaOTs() {
  var lista = document.getElementById('lista-ots-unificada');
  if (!lista) return;

  var desde = _filtrosLista.desde;
  var hasta = _filtrosLista.hasta;
  var q = _filtrosLista.q;
  var qLow = (q || '').toLowerCase().trim();
  var allOts = _getOTs();

  var ots = allOts.filter(function(ot) {
    if (desde || hasta) {
      var ts = ot.fecha_cita || ot.fecha_ingreso || 0;
      var d = new Date(ts);
      if (desde && d < new Date(desde + 'T00:00:00')) return false;
      if (hasta && d > new Date(hasta + 'T23:59:59')) return false;
    }
    if (qLow) {
      var haystack = [
        ot.numero, ot.id, ot.patente, ot.cliente_nombre, ot.cliente_apellido,
        ot.marca || ot.vehiculo_marca, ot.modelo || ot.vehiculo_modelo, ot.tecnico_asignado
      ].filter(Boolean).join(' ').toLowerCase();
      if (haystack.indexOf(qLow) < 0) return false;
    }
    return true;
  });

  if (filtroFaseActivo !== null) {
    var otsFase = ots.filter(function(ot) { return (ot.fase || 'recepcion') === filtroFaseActivo; });
    var otrasOts = ots.filter(function(ot) { return (ot.fase || 'recepcion') !== filtroFaseActivo; });

    if (otsFase.length === 0 && otrasOts.length === 0) {
      lista.innerHTML = '<div style="text-align:center;padding:48px 20px;color:var(--text-muted)">' +
        '<i class="ti ti-inbox" style="font-size:32px;display:block;margin-bottom:10px;opacity:.3"></i>' +
        '<div style="font-size:13px;font-weight:500">Sin OTs encontradas</div></div>';
      return;
    }

    var html = '';
    if (otsFase.length > 0) {
      var faseLabel = FASE_COLORES[filtroFaseActivo] ? FASE_COLORES[filtroFaseActivo].label : 'Fase';
      html += '<div style="padding:8px 0;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em">-- ' + faseLabel + ' (' + otsFase.length + ') --</div>';
      otsFase.forEach(function(ot) { html += _renderFilaOT(ot); });
    }
    if (otrasOts.length > 0) {
      html += '<div style="padding:12px 0 8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;border-top:0.5px solid var(--border);margin-top:8px">-- Otras ordenes (' + otrasOts.length + ') --</div>';
      otrasOts.forEach(function(ot) { html += _renderFilaOT(ot); });
    }
    lista.innerHTML = html;
  } else {
    if (ots.length === 0) {
      lista.innerHTML = '<div style="text-align:center;padding:48px 20px;color:var(--text-muted)">' +
        '<i class="ti ti-inbox" style="font-size:32px;display:block;margin-bottom:10px;opacity:.3"></i>' +
        '<div style="font-size:13px;font-weight:500">Sin OTs registradas</div></div>';
      return;
    }
    var allHtml = '';
    ots.forEach(function(ot) { allHtml += _renderFilaOT(ot); });
    lista.innerHTML = allHtml;
  }
}

// Fila de OT
function _renderFilaOT(ot) {
  var fase = ot.fase || 'recepcion';
  var faseInfo = FASE_COLORES[fase] || FASE_COLORES['recepcion'];
  var esperaBadge = (ot.estadoTrabajo === 'espera')
    ? '<div style="font-size:10px;padding:2px 8px;border-radius:8px;background:#fef3c7;color:#92400e;border:0.5px solid #f59e0b;font-weight:600"><i class="ti ti-clock-pause" style="font-size:9px"></i> En espera</div>'
    : '';

  var fecha = ot.fecha_ingreso
    ? new Date(ot.fecha_ingreso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : '--';

  var nombreCliente = [ot.cliente_nombre, ot.cliente_apellido].filter(Boolean).join(' ') || '(Sin cliente)';
  var tecnicoHtml = ot.tecnico_asignado ? '<span><i class="ti ti-user" style="font-size:10px"></i> ' + ot.tecnico_asignado + '</span>' : '';

  return '<div class="ot-fila-item" data-ot-id="' + ot.id + '"' +
    ' onclick="togglePanelOT(\'' + ot.id + '\')"' +
    ' style="display:flex;align-items:center;gap:12px;padding:12px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-1);margin-bottom:8px;cursor:pointer;transition:all .15s">' +
    '<div style="flex:1;min-width:0">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
        '<div style="font-size:13px;font-weight:600;color:var(--text-primary)">#' + (ot.numero || ot.id) + '</div>' +
        '<div style="font-size:10px;padding:2px 8px;border-radius:8px;background:' + faseInfo.bg + ';color:' + faseInfo.color + ';border:0.5px solid ' + faseInfo.border + ';font-weight:600">' + faseInfo.label + '</div>' +
        esperaBadge +
      '</div>' +
      '<div style="font-size:12px;color:var(--text-primary);margin-bottom:2px;font-weight:500">' + nombreCliente + '</div>' +
      '<div style="display:flex;gap:16px;font-size:11px;color:var(--text-muted)">' +
        '<span>' + (ot.patente || '--') + '</span>' +
        tecnicoHtml +
        '<span>' + fecha + '</span>' +
      '</div>' +
    '</div>' +
    '<button class="btn" onclick="event.stopPropagation(); abrirModalOTResumen(\'' + ot.id + '\')" style="flex-shrink:0;padding:6px 8px;font-size:11px" title="Ver resumen completo OT">' +
      '<i class="ti ti-list-details"></i>' +
    '</button>' +
    '<button class="btn" onclick="event.stopPropagation(); abrirHistorialOT(\'' + ot.id + '\')" style="flex-shrink:0;padding:6px 8px;font-size:11px" title="Ver historial de eventos">' +
      '<i class="ti ti-clock"></i>' +
    '</button>' +
  '</div>';
}

// Filtros
function filtrarKanban() {
  var desdeEl = document.getElementById('kanban-desde');
  var hastaEl = document.getElementById('kanban-hasta');
  var qEl = document.getElementById('kanban-q');
  _filtrosLista.desde = desdeEl ? desdeEl.value : '';
  _filtrosLista.hasta = hastaEl ? hastaEl.value : '';
  _filtrosLista.q = qEl ? qEl.value : '';
  renderListaOTs();
}

// Compat con codigo existente
function renderKanban() {
  renderListaOTs();
}

function cambiarFaseKanban(fase) {
  activarFiltroOT(fase);
}

// Auto-init
function iniciarListaOTSiExiste() {
  if (document.getElementById('kanban-tabs-bar')) iniciarListaOT();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarListaOTSiExiste);
} else {
  iniciarListaOTSiExiste();
}
