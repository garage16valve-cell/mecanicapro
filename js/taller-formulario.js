// ─── FORMULARIO NUEVA OT ──────────────────────────────────────────────────────

let _otModoCompleto = false;
let _otMotivos      = [];
let _otServicios    = [];

// ─── Abrir / Cerrar ────────────────────────────────────────────────────────────

function abrirFormNuevaOT() {
  _otModoCompleto = false;
  _otMotivos      = [];
  _otServicios    = [];
  _resetFormNuevaOT();
  _poblarSelectores();
  document.getElementById('ot-nueva').style.display        = 'flex';
  document.getElementById('ot-completo-mode').style.display = 'none';
  document.getElementById('ot-nueva-modal').style.maxWidth  = '560px';
  const btn = document.getElementById('btn-mas-detalles');
  if (btn) btn.textContent = '+ Agregar más detalles ▼';
  renderMotivosOT();
  renderServiciosOT();
}

function cerrarFormNuevaOT() {
  document.getElementById('ot-nueva').style.display = 'none';
  _cerrarDropCliente();
}

function _resetFormNuevaOT() {
  const ids = [
    'nq-patente','nq-wz','nq-cliente-buscar',
    'nq-cliente-nuevo-nombre','nq-cliente-nuevo-wz',
    'nc-patente','nc-marca','nc-modelo','nc-anio',
    'nc-color','nc-motor','nc-km',
    'nc-motivo-desc','nc-svc-nombre','nc-svc-horas','nc-svc-valor',
    'nc-objetos-valor','nc-documentos','nc-desc-danos',
  ];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  // Hidden fields
  document.getElementById('nq-cliente').value = '';

  // Chip y nuevo cliente
  _ocultarChipCliente();
  const nuevoBox = document.getElementById('nq-cliente-nuevo-box');
  if (nuevoBox) nuevoBox.style.display = 'none';

  // Checkboxes
  document.querySelectorAll('.nc-fluido, .nc-inventario, .nc-dano').forEach(cb => { cb.checked = false; });

  // Status patente
  const st = document.getElementById('nq-pat-status');
  if (st) st.innerHTML = '';

  // Motivos/servicios
  _otMotivos   = [];
  _otServicios = [];
}

// ─── Poblar selects ────────────────────────────────────────────────────────────

function _poblarSelectores() {
  const usuarios  = APP.lsGet('usuarios') || APP.lsGet('operarios') || [];
  const servicios = APP.lsGet('servicios') || [];

  // Quick mode
  _poblarSelect('nq-tecnico', usuarios,  u => ({ v: u.id || u.nombre, t: u.nombre }), '— Sin asignar —');
  _poblarSelect('nq-servicio', servicios, s => ({ v: s.id || s.nombre, t: s.nombre }), '— Selecciona servicio —');

  // Full mode
  _poblarSelect('nc-tecnico', usuarios,  u => ({ v: u.id || u.nombre, t: u.nombre }), 'Sin asignar');
  _poblarSelect('nc-asesor',  usuarios,  u => ({ v: u.id || u.nombre, t: u.nombre }), 'Sin asignar');
  _poblarSelect('nc-motivo-svc', servicios, s => ({ v: s.id || s.nombre, t: s.nombre }), '— Opcional —');
}

function _poblarSelect(id, arr, fn, placeholder) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<option value="">${placeholder}</option>` +
    arr.map(item => { const o = fn(item); return `<option value="${o.v}">${o.t}</option>`; }).join('');
}

// ─── Consultar patente ─────────────────────────────────────────────────────────

function consultarPatenteModal() {
  const pat    = (document.getElementById('nq-patente')?.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const status = document.getElementById('nq-pat-status');
  if (!pat) { if (status) status.innerHTML = '<span style="color:#dc2626">Ingresa una patente</span>'; return; }

  const vehiculos = APP.lsGet('vehiculos') || [];
  const veh = vehiculos.find(v => (v.patente || '').toUpperCase() === pat);
  const ots = APP.lsGet('ots') || [];
  const histN = ots.filter(o => (o.patente || '').toUpperCase() === pat).length;

  let html = '';
  if (veh) {
    html += `<span style="color:var(--text-success,#16a34a)">✓ ${[veh.marca, veh.modelo, veh.anio].filter(Boolean).join(' ')}</span>`;
    // Auto-fill modo completo
    if (document.getElementById('nc-patente')) document.getElementById('nc-patente').value = pat;
    if (document.getElementById('nc-marca')  && veh.marca)  document.getElementById('nc-marca').value  = veh.marca;
    if (document.getElementById('nc-modelo') && veh.modelo) document.getElementById('nc-modelo').value = veh.modelo;
    if (document.getElementById('nc-anio')   && veh.anio)   document.getElementById('nc-anio').value   = veh.anio;
  } else {
    html += `<span style="color:var(--text-muted)">Sin historial para ${pat}</span>`;
    if (document.getElementById('nc-patente')) document.getElementById('nc-patente').value = pat;
  }
  if (histN) html += ` &nbsp;<span style="color:var(--text-secondary);font-size:9px">${histN} OT(s) previa(s)</span>`;
  if (status) status.innerHTML = html;
}

// ─── Búsqueda de cliente (quick mode) ─────────────────────────────────────────

function _nqBuscarCliente(q) {
  const drop = document.getElementById('nq-cliente-drop');
  if (!drop) return;
  if (!q || q.length < 1) { _cerrarDropCliente(); return; }

  const clientes = APP.lsGet('clientes') || [];
  const qLow = q.toLowerCase();
  const matches = clientes.filter(c =>
    (c.nombre || '').toLowerCase().includes(qLow) ||
    (c.wz || '').includes(q) ||
    (c.rut || '').includes(q)
  ).slice(0, 8);

  drop.style.display = 'block';

  if (!matches.length) {
    drop.innerHTML = `<div onclick="_nqCrearClienteNuevo()" style="padding:9px 12px;cursor:pointer;font-size:12px;color:var(--text-accent,#2563eb);display:flex;align-items:center;gap:6px">
      <i class="ti ti-plus" style="font-size:11px"></i> Crear cliente "<strong>${q}</strong>"
    </div>`;
    return;
  }

  drop.innerHTML = matches.map(c => `
    <div onclick="_nqSelCliente('${c.id}','${_esc(c.nombre)}','${_esc(c.wz || '')}')"
      style="padding:8px 12px;cursor:pointer;border-bottom:0.5px solid var(--border);font-size:12px">
      <div style="font-weight:500">${c.nombre}</div>
      ${c.wz ? `<div style="font-size:10px;color:var(--text-muted)">${c.wz}</div>` : ''}
    </div>`).join('') +
    `<div onclick="_nqCrearClienteNuevo()" style="padding:8px 12px;cursor:pointer;font-size:11px;color:var(--text-accent,#2563eb)">
      <i class="ti ti-plus" style="font-size:10px"></i> Nuevo cliente…
    </div>`;
}

function _esc(s) { return (s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

function _nqSelCliente(id, nombre, wz) {
  document.getElementById('nq-cliente').value = id;
  document.getElementById('nq-cliente-chip-nom').textContent = nombre;
  document.getElementById('nq-cliente-buscar').value = '';
  _cerrarDropCliente();
  _mostrarChipCliente();
  if (wz && document.getElementById('nq-wz') && !document.getElementById('nq-wz').value) {
    document.getElementById('nq-wz').value = wz;
  }
  const nuevoBox = document.getElementById('nq-cliente-nuevo-box');
  if (nuevoBox) nuevoBox.style.display = 'none';
}

function _nqCrearClienteNuevo() {
  _cerrarDropCliente();
  const nuevoBox = document.getElementById('nq-cliente-nuevo-box');
  if (nuevoBox) nuevoBox.style.display = 'block';
  document.getElementById('nq-cliente-nuevo-nombre')?.focus();
}

function _nqNuevoCliente() {
  const nuevoBox = document.getElementById('nq-cliente-nuevo-box');
  if (!nuevoBox) return;
  nuevoBox.style.display = nuevoBox.style.display === 'none' ? 'block' : 'none';
}

function _nqLimpiarCliente() {
  document.getElementById('nq-cliente').value = '';
  _ocultarChipCliente();
  document.getElementById('nq-cliente-nuevo-box').style.display = 'none';
  document.getElementById('nq-wz').value = '';
}

function _mostrarChipCliente() {
  const chip = document.getElementById('nq-cliente-chip');
  if (chip) { chip.style.display = 'flex'; }
}
function _ocultarChipCliente() {
  const chip = document.getElementById('nq-cliente-chip');
  if (chip) { chip.style.display = 'none'; }
  if (document.getElementById('nq-cliente-chip-nom')) document.getElementById('nq-cliente-chip-nom').textContent = '';
}
function _cerrarDropCliente() {
  const drop = document.getElementById('nq-cliente-drop');
  if (drop) drop.style.display = 'none';
}

// Cerrar dropdown al hacer click fuera
document.addEventListener('click', e => {
  if (!e.target.closest('#nq-cliente-buscar') && !e.target.closest('#nq-cliente-drop')) {
    _cerrarDropCliente();
  }
});

// ─── Toggle modo completo ──────────────────────────────────────────────────────

function toggleModoCompleto() {
  _otModoCompleto = !_otModoCompleto;
  const completo = document.getElementById('ot-completo-mode');
  const modal    = document.getElementById('ot-nueva-modal');
  const btn      = document.getElementById('btn-mas-detalles');
  if (_otModoCompleto) {
    completo.style.display = 'block';
    if (modal) modal.style.maxWidth = '900px';
    if (btn) btn.textContent = '− Ocultar detalles ▲';
    _poblarSelectores();
    renderMotivosOT();
    renderServiciosOT();
  } else {
    completo.style.display = 'none';
    if (modal) modal.style.maxWidth = '560px';
    if (btn) btn.textContent = '+ Agregar más detalles ▼';
  }
}

// ─── Acordeón recepción ────────────────────────────────────────────────────────

function _toggleRecepcionAcordeon() {
  const body    = document.getElementById('nc-recepcion-body');
  const chevron = document.getElementById('nc-recep-chevron');
  if (!body) return;
  const open = body.style.display !== 'none';
  body.style.display    = open ? 'none' : 'block';
  if (chevron) chevron.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
}

// ─── Motivos ───────────────────────────────────────────────────────────────────

function agregarMotivoOT() {
  const desc  = (document.getElementById('nc-motivo-desc')?.value || '').trim();
  const tipo  = document.querySelector('input[name="nc-motivo-tipo"]:checked')?.value || 'reparacion';
  const svcEl = document.getElementById('nc-motivo-svc');
  const svcId = svcEl?.value || '';
  const svcNom = svcEl?.options[svcEl.selectedIndex]?.text || '';

  if (!desc && !svcId) { showToast('Describe el motivo o selecciona un servicio'); return; }

  _otMotivos.push({
    descripcion: desc,
    servicio_id: svcId,
    servicio_nombre: svcNom !== '— Opcional —' ? svcNom : '',
    procedimiento: tipo,
    estado_aprobacion: 'pendiente',
  });

  if (document.getElementById('nc-motivo-desc')) document.getElementById('nc-motivo-desc').value = '';
  renderMotivosOT();
}

function renderMotivosOT() {
  const list = document.getElementById('nc-motivos-lista');
  if (!list) return;
  if (!_otMotivos.length) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:11px;padding:4px 0">Sin motivos agregados</div>';
    return;
  }
  const colores = { diagnostico: '#7c3aed', mantenimiento: '#2563eb', reparacion: '#059669' };
  list.innerHTML = _otMotivos.map((m, i) => {
    const c = colores[m.procedimiento] || '#6b7280';
    const txt = m.descripcion || m.servicio_nombre || '(sin descripción)';
    return `<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;
      background:var(--surface-1);border-radius:var(--radius);margin-bottom:4px;font-size:11px">
      <span style="padding:1px 7px;border-radius:8px;background:${c}22;color:${c};font-size:10px;font-weight:700;white-space:nowrap">
        ${m.procedimiento}
      </span>
      <span style="flex:1;line-height:1.3">${txt}</span>
      <button onclick="_elimMotivoOT(${i})"
        style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:16px;padding:0 2px;line-height:1">×</button>
    </div>`;
  }).join('');
}

function _elimMotivoOT(i) { _otMotivos.splice(i, 1); renderMotivosOT(); }

// ─── Servicios (modo completo) ─────────────────────────────────────────────────

function agregarServicioOTCompleto() {
  const nombre = (document.getElementById('nc-svc-nombre')?.value || '').trim();
  const horas  = parseFloat(document.getElementById('nc-svc-horas')?.value) || 0;
  const valor  = parseInt(document.getElementById('nc-svc-valor')?.value)   || 0;
  if (!nombre) { showToast('Ingresa el nombre del servicio'); return; }
  _otServicios.push({ nombre, horas, valor });
  if (document.getElementById('nc-svc-nombre')) document.getElementById('nc-svc-nombre').value = '';
  if (document.getElementById('nc-svc-horas'))  document.getElementById('nc-svc-horas').value  = '';
  if (document.getElementById('nc-svc-valor'))  document.getElementById('nc-svc-valor').value  = '';
  renderServiciosOT();
}

function renderServiciosOT() {
  const list = document.getElementById('nc-svc-lista');
  if (!list) return;
  if (!_otServicios.length) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:11px;padding:4px 0">Sin servicios agregados</div>';
    const tot = document.getElementById('nc-svc-totales');
    if (tot) tot.style.display = 'none';
    return;
  }
  list.innerHTML = _otServicios.map((s, i) => `
    <div style="display:flex;align-items:center;gap:8px;padding:5px 8px;
      background:var(--surface-1);border-radius:var(--radius);margin-bottom:3px;font-size:11px">
      <span style="flex:1;font-weight:500">${s.nombre}</span>
      <span style="color:var(--text-muted);white-space:nowrap">${s.horas}h</span>
      <span style="color:var(--text-accent,#2563eb);font-weight:700;white-space:nowrap">
        $${s.valor.toLocaleString('es-CL')}
      </span>
      <button onclick="_elimSvcOT(${i})"
        style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:16px;padding:0 2px;line-height:1">×</button>
    </div>`).join('');

  const totalH = _otServicios.reduce((a, s) => a + s.horas, 0);
  const totalV = _otServicios.reduce((a, s) => a + s.valor, 0);
  const tot = document.getElementById('nc-svc-totales');
  if (tot) {
    tot.style.display = 'flex';
    tot.innerHTML = `<span>Total horas: <strong>${totalH}</strong></span>
      <span>Total: <strong style="color:var(--text-accent,#2563eb)">$${totalV.toLocaleString('es-CL')}</strong></span>`;
  }
}

function _elimSvcOT(i) { _otServicios.splice(i, 1); renderServiciosOT(); }

// ─── CREAR OT ──────────────────────────────────────────────────────────────────

// Exponer en window para acceso desde HTML inline
window.abrirFormNuevaOT  = abrirFormNuevaOT;
window.cerrarFormNuevaOT = cerrarFormNuevaOT;
window.crearOT           = crearOT;

// Ocultar el botón "Nueva OT" dentro del panel cuando el módulo cargue
// (el header ya tiene ese botón, no debe aparecer duplicado)
new MutationObserver(() => {
  document.querySelectorAll('#ot-listado .btn.bpa').forEach(btn => {
    if ((btn.textContent || '').trim().includes('Nueva OT')) btn.style.display = 'none';
  });
}).observe(document.body, { childList: true, subtree: true });

function crearOT() {
  // ── Datos mínimos (quick mode)
  const patente = (document.getElementById('nq-patente')?.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!patente) { showToast('Ingresa la patente'); return; }

  // Cliente
  let clienteId  = document.getElementById('nq-cliente')?.value || '';
  let clienteNom = document.getElementById('nq-cliente-chip-nom')?.textContent?.trim() || '';
  let clienteWz  = document.getElementById('nq-wz')?.value?.trim() || '';

  // ¿Nuevo cliente?
  const nuevoNom = (document.getElementById('nq-cliente-nuevo-nombre')?.value || '').trim();
  const nuevoWz  = (document.getElementById('nq-cliente-nuevo-wz')?.value || '').trim();

  if (!clienteId && nuevoNom) {
    const clientes = APP.lsGet('clientes') || [];
    const cli = { id: 'CLI' + Date.now(), nombre: nuevoNom, wz: nuevoWz || clienteWz, patentes: [patente], fecha_registro: Date.now() };
    clientes.push(cli);
    APP.lsSet('clientes', clientes);
    clienteId  = cli.id;
    clienteNom = nuevoNom;
    if (!clienteWz) clienteWz = nuevoWz;
  }

  if (!clienteNom && !clienteId) { showToast('Selecciona o ingresa un cliente'); return; }

  // Servicio y técnico (quick)
  const svcEl  = document.getElementById('nq-servicio');
  const tecEl  = document.getElementById('nq-tecnico');
  const svcNom = svcEl?.options[svcEl.selectedIndex]?.text || '';
  const svcId  = svcEl?.value || '';
  const tecNom = tecEl?.options[tecEl.selectedIndex]?.text || '';
  const tecId  = tecEl?.value || '';

  // ── Número de OT
  const now    = new Date();
  const pad    = n => String(n).padStart(2, '0');
  const ds     = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const allOTs = APP.lsGet('ots') || [];
  const todayN = allOTs.filter(o => o.id && o.id.startsWith(ds)).length;
  const otId   = ds + String(todayN + 1).padStart(4, '0');

  // ── Motivos
  const motivos = [..._otMotivos];
  if ((svcId || svcNom) && svcNom !== '— Selecciona servicio —') {
    if (!motivos.some(m => m.servicio_id === svcId)) {
      motivos.push({ descripcion: svcNom, servicio_id: svcId, servicio_nombre: svcNom, procedimiento: 'reparacion', estado_aprobacion: 'pendiente' });
    }
  }

  // ── Datos modo completo
  const fechaCita = document.getElementById('nc-fecha-cita')?.value || '';
  const horaCita  = document.getElementById('nc-hora-cita')?.value  || '';
  const fechaTs   = fechaCita
    ? new Date(fechaCita + (horaCita ? 'T' + horaCita : 'T00:00')).getTime()
    : Date.now();

  const estadoInicial = document.getElementById('nc-estado-inicial')?.value || 'agendado';
  const tipo          = document.getElementById('nc-tipo-express')?.checked ? 'express' : 'avanzada';

  const fluidos    = [...document.querySelectorAll('.nc-fluido:checked')].map(el => el.value);
  const inventario = [...document.querySelectorAll('.nc-inventario:checked')].map(el => el.value);
  const danos      = [...document.querySelectorAll('.nc-dano:checked')].map(el => el.value);

  const ot = {
    id:   otId,
    fase: 'recepcion',
    tipo,
    es_garantia:         document.getElementById('nc-es-garantia')?.checked  || false,
    autoriza_prueba_ruta: document.getElementById('nc-autoriza-ruta')?.checked || false,
    requiere_diagnostico: document.getElementById('nc-req-diagnostico')?.checked || false,
    fecha_ingreso: Date.now(),
    fecha_cita:    fechaTs,
    estado:        estadoInicial,
    facturada:     false,

    patente,
    cliente_id:    clienteId,
    cliente_nombre: clienteNom || nuevoNom,
    cliente_wz:    clienteWz,

    vehiculo_marca:  document.getElementById('nc-marca')?.value  || '',
    vehiculo_modelo: document.getElementById('nc-modelo')?.value || '',
    vehiculo_anio:   document.getElementById('nc-anio')?.value   || '',
    vehiculo_color:  document.getElementById('nc-color')?.value  || '',
    vehiculo_motor:  document.getElementById('nc-motor')?.value  || '',

    tecnico_id:    tecId  || document.getElementById('nc-tecnico')?.value  || '',
    tecnico_nombre: tecNom || '',
    asesor_id:     document.getElementById('nc-asesor')?.value || '',

    kilometraje: {
      entrada: parseInt(document.getElementById('nc-km')?.value || '0') || 0,
      salida: 0,
      unidad: 'km',
    },
    nivel_combustible: document.getElementById('nc-nivel-comb')?.value || '',

    motivos,
    servicios: [..._otServicios],

    recepcion: {
      objetos_valor:    document.getElementById('nc-objetos-valor')?.value || '',
      documentos:       document.getElementById('nc-documentos')?.value    || '',
      combustible:      document.getElementById('nc-nivel-comb')?.value    || '',
      fluidos_ok:       fluidos,
      inventario,
      danos,
      descripcion_danos: document.getElementById('nc-desc-danos')?.value  || '',
      observaciones: '',
      fotos_ingreso: [],
    },

    repuestos_cotizados: [],
    pago: { estado: 'pendiente', metodo: 'pendiente', referencia: '', monto: 0, vuelto: 0 },
    historial_eventos: [{
      fecha: Date.now(),
      fase: 'recepcion',
      accion: 'OT creada',
      usuario: 'Sistema',
      descripcion: `Patente: ${patente} | Cliente: ${clienteNom || nuevoNom}`,
    }],
  };

  allOTs.push(ot);
  APP.lsSet('ots', allOTs);
  cerrarFormNuevaOT();
  if (typeof renderKanban === 'function') renderKanban();
  showToast(`✓ OT #${otId} creada correctamente`);
}
