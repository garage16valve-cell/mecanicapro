// ─── KANBAN DE OTs ────────────────────────────────────────────────────────────

const KANBAN_FASES = [
  { id: 'recepcion',   label: 'RECEPCIÓN',   emoji: '🚶' },
  { id: 'diagnostico', label: 'DIAGNÓSTICO', emoji: '👁️' },
  { id: 'repuestos',   label: 'REPUESTOS',   emoji: '🔧' },
  { id: 'aprobacion',  label: 'APROBACIÓN',  emoji: '✓'  },
  { id: 'reparacion',  label: 'REPARACIÓN',  emoji: '🔨' },
  { id: 'control',     label: 'CONTROL',     emoji: '🛡️' },
  { id: 'entrega',     label: 'ENTREGA',     emoji: '📦' },
  { id: 'archivado',   label: 'ARCHIVADOS',  emoji: '🗂️' },
];

const SEMAFORO_MAP = {
  'agendado':       { label: 'AGENDADO',       color: '#92400e', bg: '#fef3c7', border: '#d97706' },
  'en-proceso':     { label: 'EN PROCESO',     color: '#065f46', bg: '#d1fae5', border: '#10b981' },
  'sin-repuesto':   { label: 'SIN REPUESTO',   color: '#991b1b', bg: '#fee2e2', border: '#ef4444' },
  'listo':          { label: 'LISTO',           color: '#1e3a8a', bg: '#dbeafe', border: '#3b82f6' },
  'pago-pendiente': { label: 'PAGO PENDIENTE', color: '#9a3412', bg: '#ffedd5', border: '#f97316' },
  'finalizado':     { label: 'FINALIZADO',     color: '#14532d', bg: '#dcfce7', border: '#22c55e' },
  'cancelado':      { label: 'CANCELADO',      color: '#374151', bg: '#f3f4f6', border: '#9ca3af' },
  'cotizacion':     { label: 'COTIZACIÓN',     color: '#4c1d95', bg: '#ede9fe', border: '#8b5cf6' },
};

let _kanbanFase = 'recepcion';
let _kanbanFiltros = { desde: '', hasta: '', q: '' };

// ─── Init ──────────────────────────────────────────────────────────────────────

function iniciarKanban() {
  _renderKanbanTabs();
  renderKanban();
}

function _getOTs() {
  return APP.lsGet('ots') || [];
}

function _contarPorFase(ots) {
  const c = {};
  KANBAN_FASES.forEach(f => { c[f.id] = 0; });
  ots.forEach(ot => {
    const f = ot.fase || 'recepcion';
    if (c[f] !== undefined) c[f]++;
  });
  return c;
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────

function _renderKanbanTabs() {
  const bar = document.getElementById('kanban-tabs-bar');
  if (!bar) return;
  const counts = _contarPorFase(_getOTs());
  bar.innerHTML = KANBAN_FASES.map(f => {
    const n = counts[f.id] || 0;
    const active = f.id === _kanbanFase;
    return `<button class="kanban-tab${active ? ' kanban-tab-active' : ''}"
      onclick="cambiarFaseKanban('${f.id}')">
      ${f.emoji} ${f.label}
      <span class="kanban-tab-count">${n}</span>
    </button>`;
  }).join('');
}

function cambiarFaseKanban(fase) {
  _kanbanFase = fase;
  _renderKanbanTabs();
  _renderKanbanLista();
}

// ─── Render lista ──────────────────────────────────────────────────────────────

function renderKanban() {
  _renderKanbanTabs();
  _renderKanbanLista();
}

function _renderKanbanLista() {
  const lista = document.getElementById('kanban-lista');
  if (!lista) return;

  const { desde, hasta, q } = _kanbanFiltros;
  const qLow = (q || '').toLowerCase().trim();

  const ots = _getOTs().filter(ot => {
    if ((ot.fase || 'recepcion') !== _kanbanFase) return false;

    if (desde || hasta) {
      const ts = ot.fecha_cita || ot.fecha_ingreso || 0;
      const d  = new Date(ts);
      if (desde && d < new Date(desde + 'T00:00:00')) return false;
      if (hasta && d > new Date(hasta + 'T23:59:59')) return false;
    }

    if (qLow) {
      const motDesc = (ot.motivos || []).map(m => m.descripcion || m.servicio_nombre || '').join(' ');
      const haystack = [
        ot.id, ot.patente, ot.cliente_nombre,
        ot.vehiculo_marca, ot.vehiculo_modelo, ot.vehiculo_anio,
        ot.tecnico_nombre, motDesc,
      ].join(' ').toLowerCase();
      if (!haystack.includes(qLow)) return false;
    }

    return true;
  });

  // Sort: newer first
  ots.sort((a, b) => (b.fecha_ingreso || 0) - (a.fecha_ingreso || 0));

  if (!ots.length) {
    const faseLabel = KANBAN_FASES.find(f => f.id === _kanbanFase)?.label || _kanbanFase;
    lista.innerHTML = `<div style="text-align:center;padding:48px 20px;color:var(--text-muted)">
      <i class="ti ti-inbox" style="font-size:32px;display:block;margin-bottom:10px;opacity:.3"></i>
      <div style="font-size:13px;font-weight:500">Sin OTs en ${faseLabel}</div>
      <div style="font-size:11px;margin-top:4px">Las OTs aparecerán aquí al avanzar a esta fase</div>
    </div>`;
    return;
  }

  lista.innerHTML = ots.map(ot => _renderOTCard(ot)).join('');
}

// ─── Card HTML ─────────────────────────────────────────────────────────────────

function _renderOTCard(ot) {
  const sem = SEMAFORO_MAP[ot.estado || 'agendado'] || SEMAFORO_MAP['agendado'];
  const faseIdx = KANBAN_FASES.findIndex(f => f.id === (ot.fase || 'recepcion'));
  const puedeRetro  = faseIdx > 0;
  const puedeAvanzo = faseIdx < KANBAN_FASES.length - 1;

  const ts    = ot.fecha_cita || ot.fecha_ingreso;
  const fecha = ts ? new Date(ts).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  const hora  = ts ? new Date(ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '';

  const veh = [ot.vehiculo_marca, ot.vehiculo_modelo, ot.vehiculo_anio, ot.patente ? `[${ot.patente}]` : '']
    .filter(Boolean).join(' ');

  const motivosList = (ot.motivos || [])
    .map(m => m.descripcion || m.servicio_nombre)
    .filter(Boolean)
    .slice(0, 3);
  const motivosStr = motivosList.join(' · ') + (((ot.motivos || []).length > 3) ? ' …' : '');

  const hist    = ot.historial_eventos || [];
  const lastEvt = hist.length ? hist[hist.length - 1] : null;
  const lastStr = lastEvt ? (lastEvt.accion || lastEvt.descripcion || '') : '';

  const noFactBadge = ot.facturada
    ? ''
    : `<span style="font-size:9px;padding:2px 7px;border-radius:10px;background:#fef9c3;color:#92400e;border:0.5px solid #d97706;font-weight:600">No Facturada</span>`;

  return `<div class="kanban-card" id="kcard-${ot.id}">
  <div class="kanban-card-top">
    <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
      <span style="font-size:12px;font-weight:700;color:var(--text-primary)">#${ot.id}</span>
      ${noFactBadge}
      <span style="font-size:10px;padding:2px 9px;border-radius:10px;font-weight:700;
        border:0.5px solid ${sem.border};color:${sem.color};background:${sem.bg}">
        ${sem.label}
      </span>
      <span style="font-size:10px;color:var(--text-muted);margin-left:auto;white-space:nowrap">
        ${fecha}${hora ? ' · ' + hora : ''}
      </span>
    </div>
  </div>

  <div class="kanban-card-body">
    <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start">
      <div style="flex:1;min-width:180px">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:1px">
          ${ot.cliente_nombre || '<span style="color:var(--text-muted)">(Sin cliente)</span>'}
        </div>
        <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">
          ${veh || '<span style="color:var(--text-muted)">(Sin vehículo)</span>'}
        </div>
        ${motivosStr ? `<div style="font-size:11px;color:var(--text-muted);line-height:1.4">${motivosStr}</div>` : ''}
      </div>
      <div style="text-align:right;font-size:11px;color:var(--text-muted);flex-shrink:0">
        ${ot.tecnico_nombre ? `<div><i class="ti ti-user" style="font-size:10px"></i> ${ot.tecnico_nombre}</div>` : ''}
        ${lastStr ? `<div style="margin-top:3px;font-size:10px;font-style:italic">${lastStr}</div>` : ''}
      </div>
    </div>
  </div>

  <div class="kanban-card-actions">
    <button class="btn kanban-btn" title="Retroceder fase"
      ${puedeRetro ? '' : 'disabled'}
      onclick="retrocederOT('${ot.id}')">
      <i class="ti ti-arrow-left"></i> Retroceder
    </button>
    <button class="btn kanban-btn" title="Editar OT - Abrir panel con tabs"
      onclick="otAbrirDetalleOT('${ot.id}')">
      <i class="ti ti-edit"></i> Editar
    </button>
    <button class="btn kanban-btn bpa" title="Ver detalle"
      onclick="abrirDetalleOT('${ot.id}')">
      <i class="ti ti-list-details"></i> Detalle
    </button>
    <button class="btn kanban-btn" title="WhatsApp cliente"
      onclick="vistaClienteOT('${ot.id}')" style="color:#25D366;border-color:#25D366">
      <i class="ti ti-brand-whatsapp"></i>
    </button>
    <button class="btn kanban-btn" title="Eliminar OT"
      onclick="eliminarOT('${ot.id}')"
      style="color:#dc2626;border-color:#fca5a5">
      <i class="ti ti-trash"></i>
    </button>
    <button class="btn kanban-btn" title="Avanzar fase"
      ${puedeAvanzo ? '' : 'disabled'}
      onclick="avanzarOT('${ot.id}')"
      style="margin-left:auto">
      Avanzar <i class="ti ti-arrow-right"></i>
    </button>
  </div>
</div>`;
}

// ─── Filtros ───────────────────────────────────────────────────────────────────

function filtrarKanban() {
  _kanbanFiltros.desde = document.getElementById('kanban-desde')?.value || '';
  _kanbanFiltros.hasta = document.getElementById('kanban-hasta')?.value || '';
  _kanbanFiltros.q     = document.getElementById('kanban-q')?.value    || '';
  _renderKanbanLista();
}

// ─── Avanzar / Retroceder ──────────────────────────────────────────────────────

function avanzarOT(id) {
  const ots = _getOTs();
  const ot  = ots.find(o => o.id === id);
  if (!ot) return;
  const idx = KANBAN_FASES.findIndex(f => f.id === (ot.fase || 'recepcion'));
  if (idx >= KANBAN_FASES.length - 1) return;
  const nuevaFase = KANBAN_FASES[idx + 1];
  ot.fase = nuevaFase.id;
  _logEvento(ot, `Avanzó a ${nuevaFase.label}`);
  APP.lsSet('ots', ots);
  renderKanban();
  showToast(`OT #${id} avanzó a ${nuevaFase.label}`);
}

function retrocederOT(id) {
  const ots = _getOTs();
  const ot  = ots.find(o => o.id === id);
  if (!ot) return;
  const idx = KANBAN_FASES.findIndex(f => f.id === (ot.fase || 'recepcion'));
  if (idx <= 0) return;
  const nuevaFase = KANBAN_FASES[idx - 1];
  ot.fase = nuevaFase.id;
  _logEvento(ot, `Retrocedió a ${nuevaFase.label}`);
  APP.lsSet('ots', ots);
  renderKanban();
  showToast(`OT #${id} retrocedió a ${nuevaFase.label}`);
}

function _logEvento(ot, accion) {
  ot.historial_eventos = ot.historial_eventos || [];
  ot.historial_eventos.push({
    fecha: Date.now(),
    fase: ot.fase,
    accion,
    usuario: 'Sistema',
    descripcion: '',
  });
}

// ─── Eliminar ──────────────────────────────────────────────────────────────────

function eliminarOT(id) {
  if (!confirm(`¿Eliminar OT #${id}?\nEsta acción no se puede deshacer.`)) return;
  APP.lsSet('ots', _getOTs().filter(o => o.id !== id));
  renderKanban();
  showToast('OT eliminada');
  if (typeof updateAllBadges === 'function') updateAllBadges();
}

// ─── Editar / Vista cliente ────────────────────────────────────────────────────

function editarOTKanban(id) {
  if (typeof abrirDetalleOT === 'function') {
    abrirDetalleOT(id);
    setTimeout(() => {
      if (typeof toggleEditarOT === 'function') toggleEditarOT();
    }, 80);
  }
}

function vistaClienteOT(id) {
  const ot = _getOTs().find(o => o.id === id);
  if (!ot) return;
  const wz = ot.cliente_wz || ot.cliente_whatsapp || '';
  const msg = encodeURIComponent(
    `Hola ${ot.cliente_nombre || ''}, le informamos que su vehículo ` +
    `${[ot.vehiculo_marca, ot.vehiculo_modelo, ot.patente].filter(Boolean).join(' ')} ` +
    `(OT #${ot.id}) está siendo atendido. Cualquier novedad le avisamos.`
  );
  if (wz) {
    window.open(`https://wa.me/${wz.replace(/\D/g, '')}?text=${msg}`, '_blank');
  } else {
    showToast('Este cliente no tiene WhatsApp registrado');
  }
}

// ─── Compat con código existente ───────────────────────────────────────────────

function renderListaOTs(q) {
  _kanbanFiltros.q = q || '';
  renderKanban();
}

// ─── Auto-init cuando carga el módulo ─────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('kanban-tabs-bar')) iniciarKanban();
});
