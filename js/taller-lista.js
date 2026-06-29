// ─── LISTA UNIFICADA DE OTs CON FILTROS POR FASE ────────────────────────────────

const FASES_OPCIONES = [
  { id: null,         label: 'Todas',       emoji: '📋' },
  { id: 'recepcion',  label: 'Recepción',   emoji: '🚶' },
  { id: 'diagnostico',label: 'Diagnóstico', emoji: '🔍' },
  { id: 'repuestos',  label: 'Repuestos',   emoji: '📦' },
  { id: 'reparacion', label: 'Reparación',  emoji: '🔨' },
  { id: 'control',    label: 'Control',     emoji: '✅' },
  { id: 'cotizacion', label: 'Cotización',  emoji: '📄' },
  { id: 'pago',       label: 'Pago',        emoji: '💳' },
  { id: 'entrega',    label: 'Entrega',     emoji: '🎉' },
  { id: 'cancelada',  label: 'Cancelada',   emoji: '❌' },
];

const FASE_COLORES = {
  'recepcion':  { label: 'RECEPCIÓN',   color: '#7c3aed', bg: '#f3e8ff', border: '#a78bfa' },
  'diagnostico':{ label: 'DIAGNÓSTICO', color: '#0891b2', bg: '#cffafe', border: '#06b6d4' },
  'repuestos':  { label: 'REPUESTOS',   color: '#ea580c', bg: '#ffedd5', border: '#f97316' },
  'reparacion': { label: 'REPARACIÓN',  color: '#be123c', bg: '#ffe4e6', border: '#f43f5e' },
  'control':    { label: 'CONTROL',     color: '#059669', bg: '#d1fae5', border: '#10b981' },
  'cotizacion': { label: 'COTIZACIÓN',  color: '#7c2d12', bg: '#fed7aa', border: '#d97706' },
  'pago':       { label: 'PAGO',        color: '#0d47a1', bg: '#dbeafe', border: '#3b82f6' },
  'entrega':    { label: 'ENTREGA',     color: '#15803d', bg: '#dcfce7', border: '#22c55e' },
  'cancelada':  { label: 'CANCELADA',   color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' },
};

let filtroFaseActivo = null;
let _filtrosLista = { desde: '', hasta: '', q: '' };

// ─── Init ──────────────────────────────────────────────────────────────────────

function iniciarListaOT() {
  renderListaOTs();
  actualizarContadoresFiltro();
}

function _getOTs() {
  return APP.lsGet('ots') || [];
}

// ─── Barra de filtros ──────────────────────────────────────────────────────────

function renderBarraFiltros() {
  const bar = document.getElementById('kanban-tabs-bar');
  if (!bar) return;

  const ots = _getOTs();
  const conteos = {};
  FASES_OPCIONES.forEach(f => { conteos[f.id] = 0; });

  ots.forEach(ot => {
    const fase = ot.fase || 'recepcion';
    if (conteos[fase] !== undefined) conteos[fase]++;
    if (conteos[null] !== undefined) conteos[null]++;
  });

  bar.innerHTML = FASES_OPCIONES.map(f => {
    const n = conteos[f.id] || 0;
    const active = f.id === filtroFaseActivo;
    return `<button class="kanban-filtro-btn"
      id="btn-filtro-${f.id || 'todas'}"
      onclick="activarFiltroOT(${f.id === null ? 'null' : \"'\" + f.id + \"'\"})"
      style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border:0.5px solid var(--border);border-radius:var(--radius);background:${active ? 'var(--fill-accent)' : 'var(--surface-1)'};color:${active ? '#fff' : 'var(--text-secondary)'};font-size:11px;font-weight:500;cursor:pointer;white-space:nowrap;transition:all .15s">
      ${f.emoji} ${f.label} <span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 4px;border-radius:9px;font-size:10px;font-weight:700;background:${active ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.12)'};color:inherit">${n}</span>
    </button>`;
  }).join('');
}

function actualizarContadoresFiltro() {
  renderBarraFiltros();
}

function activarFiltroOT(fase) {
  filtroFaseActivo = fase;
  renderBarraFiltros();
  renderListaOTs();
}

// ─── Render lista unificada ────────────────────────────────────────────────────

function renderListaOTs() {
  const lista = document.getElementById('lista-ots-unificada');
  if (!lista) return;

  const { desde, hasta, q } = _filtrosLista;
  const qLow = (q || '').toLowerCase().trim();
  const allOts = _getOTs();

  // Filtrar por búsqueda y fecha
  let ots = allOts.filter(ot => {
    if (desde || hasta) {
      const ts = ot.fecha_cita || ot.fecha_ingreso || 0;
      const d = new Date(ts);
      if (desde && d < new Date(desde + 'T00:00:00')) return false;
      if (hasta && d > new Date(hasta + 'T23:59:59')) return false;
    }

    if (qLow) {
      const haystack = [
        ot.numero,
        ot.id,
        ot.patente,
        ot.cliente_nombre,
        ot.cliente_apellido,
        ot.marca || ot.vehiculo_marca,
        ot.modelo || ot.vehiculo_modelo,
        ot.tecnico_asignado,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(qLow)) return false;
    }

    return true;
  });

  // Si hay filtro activo: mostrar primero las de esa fase, luego las demás
  if (filtroFaseActivo !== null) {
    const otsFase = ots.filter(ot => (ot.fase || 'recepcion') === filtroFaseActivo);
    const otrasOts = ots.filter(ot => (ot.fase || 'recepcion') !== filtroFaseActivo);

    if (otsFase.length === 0 && otrasOts.length === 0) {
      lista.innerHTML = `<div style="text-align:center;padding:48px 20px;color:var(--text-muted)">
        <i class="ti ti-inbox" style="font-size:32px;display:block;margin-bottom:10px;opacity:.3"></i>
        <div style="font-size:13px;font-weight:500">Sin OTs encontradas</div>
      </div>`;
      return;
    }

    let html = '';
    if (otsFase.length > 0) {
      html += `<div style="padding:8px 0;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em">── ${FASE_COLORES[filtroFaseActivo]?.label || 'Fase'} (${otsFase.length}) ──</div>`;
      html += otsFase.map(ot => _renderFilaOT(ot)).join('');
    }

    if (otrasOts.length > 0) {
      html += `<div style="padding:12px 0 8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;border-top:0.5px solid var(--border);margin-top:8px">── Otras órdenes (${otrasOts.length}) ──</div>`;
      html += otrasOts.map(ot => _renderFilaOT(ot)).join('');
    }

    lista.innerHTML = html;
  } else {
    // Sin filtro: mostrar todas
    if (ots.length === 0) {
      lista.innerHTML = `<div style="text-align:center;padding:48px 20px;color:var(--text-muted)">
        <i class="ti ti-inbox" style="font-size:32px;display:block;margin-bottom:10px;opacity:.3"></i>
        <div style="font-size:13px;font-weight:500">Sin OTs registradas</div>
      </div>`;
      return;
    }

    lista.innerHTML = ots.map(ot => _renderFilaOT(ot)).join('');
  }
}

// ─── Fila de OT ────────────────────────────────────────────────────────────────

function _renderFilaOT(ot) {
  const fase = ot.fase || 'recepcion';
  const faseInfo = FASE_COLORES[fase] || FASE_COLORES['recepcion'];

  const fecha = ot.fecha_ingreso
    ? new Date(ot.fecha_ingreso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : '—';

  const nombreCliente = [ot.cliente_nombre, ot.cliente_apellido].filter(Boolean).join(' ') || '(Sin cliente)';

  return `<div class="ot-fila-item" data-ot-id="${ot.id}"
    onclick="togglePanelOT('${ot.id}')"
    style="display:flex;align-items:center;gap:12px;padding:12px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-1);margin-bottom:8px;cursor:pointer;transition:all .15s;hover:background:var(--surface-2)">

    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary)">#${ot.numero || ot.id}</div>
        <div style="font-size:10px;padding:2px 8px;border-radius:8px;background:${faseInfo.bg};color:${faseInfo.color};border:0.5px solid ${faseInfo.border};font-weight:600">${faseInfo.label}</div>
      </div>
      <div style="font-size:12px;color:var(--text-primary);margin-bottom:2px;font-weight:500">${nombreCliente}</div>
      <div style="display:flex;gap:16px;font-size:11px;color:var(--text-muted)">
        <span>${ot.patente || '—'}</span>
        ${ot.tecnico_asignado ? `<span><i class="ti ti-user" style="font-size:10px"></i> ${ot.tecnico_asignado}</span>` : ''}
        <span>${fecha}</span>
      </div>
    </div>

    <button class="btn" onclick="event.stopPropagation(); abrirHistorialOT('${ot.id}')" style="flex-shrink:0;padding:6px 8px;font-size:11px" title="Ver historial">
      <i class="ti ti-clock"></i>
    </button>
  </div>`;
}

// ─── Filtros ───────────────────────────────────────────────────────────────────

function filtrarKanban() {
  _filtrosLista.desde = document.getElementById('kanban-desde')?.value || '';
  _filtrosLista.hasta = document.getElementById('kanban-hasta')?.value || '';
  _filtrosLista.q = document.getElementById('kanban-q')?.value || '';
  renderListaOTs();
}

// ─── Compat con código existente ───────────────────────────────────────────────

function renderKanban() {
  renderListaOTs();
}

function cambiarFaseKanban(fase) {
  activarFiltroOT(fase);
}

// ─── Auto-init cuando carga el módulo ─────────────────────────────────────────

function iniciarListaOTSiExiste() {
  if (document.getElementById('kanban-tabs-bar')) iniciarListaOT();
}

// Si el DOM ya está cargado, inicializar inmediatamente
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarListaOTSiExiste);
} else {
  // DOM ya está cargado
  iniciarListaOTSiExiste();
}
