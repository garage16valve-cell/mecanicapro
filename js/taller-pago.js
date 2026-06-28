// ===== MÓDULO: CIERRE DE OT, COBRO Y ENTREGA =====

let _pagoOtId    = null;
let _pagoMetodo  = null;
let _pagoTotal   = 0;
let _encuestaOtId = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function _pagoFmt(n) {
  return '$' + Math.round(n || 0).toLocaleString('es-CL');
}

function _pagoGetSesion() {
  const s = APP.lsGet('sesion', null);
  return s ? (s.nombre || s.usuario || 'Sistema') : 'Sistema';
}

function _pagoGetConfig() {
  return APP.lsGet('config', {});
}

/** Calcula totales de la OT: mano de obra + repuestos + IVA */
function _pagoCalcTotales(ot) {
  // Mano de obra desde serviciosItems o del campo legado
  const items    = (ot.serviciosItems && ot.serviciosItems.length)
    ? ot.serviciosItems
    : ot.servicio ? [{ nombre: ot.servicio, horas: 0, valor: ot.valor || 0 }] : [];
  const totalMO  = items.reduce((s, it) => s + (parseInt(it.valor) || 0), 0);

  // Diagnóstico: mano de obra desde motivos
  const motivosMO = (ot.motivos || []).reduce((s, m) => s + (parseInt(m.valor_mano_obra) || 0), 0);

  // Repuestos cotizados (módulo taller-repuestos)
  const reps = (ot.repuestos_cotizados || []);
  const totalRepSinIva = reps.reduce((s, r) => {
    const cant = Number(r.cantidad || 1);
    const vu   = Number(r.valor_unitario || r.costo || 0);
    const desc = Number(r.descuento || 0);
    return s + vu * cant * (1 - desc / 100);
  }, 0);

  // Repuestos legados (repuestosItems)
  const repsLegados = (ot.repuestosItems || []).filter(r => (r.desc || '').trim());
  const totalRepLeg  = repsLegados.reduce((s, r) => s + (parseInt(r.precio) || 0), 0);

  const totalMOFinal  = totalMO + motivosMO;
  const totalRepFinal = totalRepSinIva + totalRepLeg;
  const subtotal      = totalMOFinal + totalRepFinal;
  const iva           = Math.round(subtotal * 0.19);
  const total         = subtotal + iva;

  return { items, totalMO: totalMOFinal, totalRep: totalRepFinal, subtotal, iva, total };
}

// ── Abrir panel de pago (reemplaza la función de taller.js) ──────────────────

function abrirPanelPago() {
  if (!window._otDetalleId) return;
  _pagoOtId   = window._otDetalleId;
  _pagoMetodo = null;

  const ots = APP.lsGet('mp_ots', []);
  const ot  = ots.find(o => o.id === _pagoOtId);
  if (!ot) return;

  const dd = document.getElementById('det-estado-dd');
  if (dd) dd.style.display = 'none';

  // Reset UI métodos
  ['efectivo','tarjeta','transferencia','pendiente'].forEach(m => {
    const b = document.getElementById('det-pago-btn-' + m);
    const c = document.getElementById('det-pago-campos-' + m);
    if (b) { b.style.background = ''; b.style.color = ''; b.style.borderColor = ''; }
    if (c) c.style.display = 'none';
  });

  // Limpiar campos
  ['det-pago-boleta','det-pago-voucher','det-pago-comprobante',
   'det-pago-monto-recibido','det-pago-banco-tarjeta','det-pago-banco-transf'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const motivo = document.getElementById('det-pago-motivo'); if (motivo) motivo.value = '';
  const fecha  = document.getElementById('det-pago-fecha-comprometida'); if (fecha) fecha.value = '';
  const vuelto = document.getElementById('det-pago-vuelto-box'); if (vuelto) vuelto.style.display = 'none';
  const tipoT  = document.getElementById('det-pago-tipo-tarjeta'); if (tipoT) tipoT.value = '';

  // Calcular totales
  const { items, totalMO, totalRep, subtotal, iva, total } = _pagoCalcTotales(ot);
  _pagoTotal = total;

  // Render resumen
  const numEl = document.getElementById('det-pago-ot-num');
  if (numEl) numEl.textContent = ot.id;

  const lineasMO = items.map(it =>
    `<div style="display:flex;justify-content:space-between;padding:2px 0;color:var(--text-secondary)">
       <span>• ${_esc(it.nombre)}</span>
       <span>${it.valor ? _pagoFmt(it.valor) : '—'}</span>
     </div>`).join('');

  const sepLine = '<div style="border-top:0.5px solid var(--border);margin:8px 0"></div>';
  const resEl = document.getElementById('det-pago-resumen');
  if (resEl) resEl.innerHTML = `
    ${lineasMO}
    ${totalRep > 0 ? `<div style="display:flex;justify-content:space-between;padding:2px 0;color:var(--text-secondary)"><span>• Repuestos / insumos</span><span>${_pagoFmt(totalRep)}</span></div>` : ''}
    ${sepLine}
    <div style="display:flex;justify-content:space-between;padding:2px 0;font-size:11px;color:var(--text-muted)">
      <span>Subtotal neto</span><span>${_pagoFmt(subtotal)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:2px 0;font-size:11px;color:var(--text-muted)">
      <span>IVA (19%)</span><span>${_pagoFmt(iva)}</span>
    </div>
    ${sepLine}
    <div style="display:flex;justify-content:space-between;padding:4px 0">
      <span style="font-size:16px;font-weight:700">TOTAL A COBRAR</span>
      <span style="font-size:20px;font-weight:800;color:#16a34a">${_pagoFmt(total)}</span>
    </div>`;

  // Datos de cuenta taller para transferencia
  const cfg = _pagoGetConfig();
  const cuentaEl = document.getElementById('det-pago-datos-cuenta');
  if (cuentaEl) {
    const banco  = cfg.banco_nombre  || '—';
    const tipo   = cfg.banco_tipo    || 'Cuenta Corriente';
    const num    = cfg.banco_cuenta  || '—';
    const rut    = cfg.rut           || '—';
    const nombre = cfg.nombre_taller || cfg.nombre || 'Integral Automotriz SPA';
    cuentaEl.innerHTML = `<strong>Datos para transferencia:</strong><br>
      Banco: ${_esc(banco)}<br>
      Tipo: ${_esc(tipo)}<br>
      N° cuenta: ${_esc(num)}<br>
      RUT: ${_esc(rut)}<br>
      Nombre: ${_esc(nombre)}`;
  }

  const panel = document.getElementById('det-panel-pago');
  if (panel) { panel.style.display = 'block'; panel.scrollIntoView({ behavior:'smooth', block:'start' }); }
}

function cerrarPanelPago() {
  const panel = document.getElementById('det-panel-pago');
  if (panel) panel.style.display = 'none';
  _pagoMetodo = null;
  _pagoOtId   = null;
}

// ── Selección de método ──────────────────────────────────────────────────────

function seleccionarMetodoPago(metodo) {
  _pagoMetodo = metodo;
  const colores = {
    efectivo:      '#16a34a',
    tarjeta:       '#2563eb',
    transferencia: '#7c3aed',
    pendiente:     '#d97706',
  };
  ['efectivo','tarjeta','transferencia','pendiente'].forEach(m => {
    const b   = document.getElementById('det-pago-btn-' + m);
    const c   = document.getElementById('det-pago-campos-' + m);
    const sel = m === metodo;
    if (b) {
      b.style.background   = sel ? colores[m] : '';
      b.style.color        = sel ? '#fff'      : '';
      b.style.borderColor  = sel ? colores[m]  : '';
    }
    if (c) c.style.display = sel ? 'block' : 'none';
  });

  // Si es transferencia, poblar datos cuenta taller
  if (metodo === 'transferencia') {
    const cfg     = _pagoGetConfig();
    const cuentaEl = document.getElementById('det-pago-datos-cuenta');
    if (cuentaEl && !cuentaEl.innerHTML.trim()) {
      const banco  = cfg.banco_nombre  || '—';
      const tipo   = cfg.banco_tipo    || 'Cuenta Corriente';
      const num    = cfg.banco_cuenta  || '—';
      const rut    = cfg.rut           || '—';
      const nombre = cfg.nombre_taller || cfg.nombre || 'Integral Automotriz SPA';
      cuentaEl.innerHTML = `<strong>Datos para transferencia:</strong><br>
        Banco: ${_esc(banco)}<br>
        Tipo: ${_esc(tipo)}<br>
        N° cuenta: ${_esc(num)}<br>
        RUT: ${_esc(rut)}<br>
        Nombre: ${_esc(nombre)}`;
    }
  }
}

// ── Cálculo de vuelto (efectivo) ─────────────────────────────────────────────

function pagoCalcVuelto() {
  const montoEl  = document.getElementById('det-pago-monto-recibido');
  const vueltoEl = document.getElementById('det-pago-vuelto-box');
  if (!montoEl || !vueltoEl) return;

  const recibido = parseInt(montoEl.value) || 0;
  if (!recibido) { vueltoEl.style.display = 'none'; return; }

  const diff = recibido - _pagoTotal;
  vueltoEl.style.display = 'block';

  if (diff < 0) {
    vueltoEl.style.background = '#fee2e2';
    vueltoEl.style.color      = '#dc2626';
    vueltoEl.style.border     = '0.5px solid #dc2626';
    vueltoEl.innerHTML = `⚠️ MONTO INSUFICIENTE — Faltan ${_pagoFmt(Math.abs(diff))}`;
  } else {
    vueltoEl.style.background = '#dcfce7';
    vueltoEl.style.color      = '#16a34a';
    vueltoEl.style.border     = '0.5px solid #16a34a';
    vueltoEl.innerHTML = `✅ Vuelto: ${_pagoFmt(diff)}`;
  }
}

// ── Confirmar pago ───────────────────────────────────────────────────────────

function confirmarPago() {
  if (!_pagoMetodo) { APP.toast.show('⚠️ Selecciona un método de pago.', 'warning'); return; }

  const g = id => (document.getElementById(id)?.value || '').trim();
  const datoPago = {
    estado:         'pagado',
    metodo:         _pagoMetodo,
    monto:          _pagoTotal,
    fecha:          Date.now(),
    registrado_por: _pagoGetSesion(),
  };

  if (_pagoMetodo === 'efectivo') {
    if (!g('det-pago-boleta')) {
      APP.toast.show('⚠️ Ingresa el número de boleta.', 'warning'); return;
    }
    const recibido = parseInt(g('det-pago-monto-recibido')) || 0;
    if (recibido > 0 && recibido < _pagoTotal) {
      APP.toast.show('⚠️ El monto recibido es menor al total a cobrar.', 'warning'); return;
    }
    datoPago.referencia = g('det-pago-boleta');
    datoPago.vuelto     = recibido > 0 ? recibido - _pagoTotal : 0;

  } else if (_pagoMetodo === 'tarjeta') {
    if (!g('det-pago-voucher')) {
      APP.toast.show('⚠️ Ingresa el número de voucher.', 'warning'); return;
    }
    datoPago.referencia    = g('det-pago-voucher');
    datoPago.tipo_tarjeta  = g('det-pago-tipo-tarjeta');
    datoPago.banco_emisor  = g('det-pago-banco-tarjeta');

  } else if (_pagoMetodo === 'transferencia') {
    if (!g('det-pago-comprobante')) {
      APP.toast.show('⚠️ Ingresa el número de comprobante.', 'warning'); return;
    }
    datoPago.referencia  = g('det-pago-comprobante');
    datoPago.banco_origen = g('det-pago-banco-transf');

  } else if (_pagoMetodo === 'pendiente') {
    datoPago.estado             = 'pendiente';
    datoPago.motivo             = g('det-pago-motivo');
    datoPago.fecha_comprometida = g('det-pago-fecha-comprometida');
  }

  _aplicarPago(datoPago);
}

function _aplicarPago(datoPago) {
  const otId = _pagoOtId || window._otDetalleId;
  if (!otId) return;

  const ots = APP.lsGet('mp_ots', []);
  const idx = ots.findIndex(o => o.id === otId);
  if (idx < 0) return;
  const ot = ots[idx];

  const esPendiente = datoPago.estado === 'pendiente';

  const nuevaFase   = esPendiente ? 'entrega' : 'archivado';
  const nuevoEstado = esPendiente ? 'pago-pendiente' : 'finalizado';

  ots[idx] = {
    ...ot,
    fase:        nuevaFase,
    estado:      nuevoEstado,
    estadoCita:  nuevoEstado,
    pago:        datoPago,
    historial_eventos: [
      ...(ot.historial_eventos || ot.historial || []),
      {
        fecha:       Date.now(),
        fase:        nuevaFase,
        accion:      esPendiente ? 'pago_pendiente' : 'pago_registrado',
        usuario:     datoPago.registrado_por,
        descripcion: esPendiente
          ? `Pago dejado pendiente. ${datoPago.motivo || ''}`
          : `Pago ${datoPago.metodo} confirmado. Ref: ${datoPago.referencia || '—'}`,
      },
    ],
  };
  APP.lsSet('mp_ots', ots);

  // Sumar a finanzas si no es pendiente
  if (!esPendiente) {
    _pagoRegistrarFinanzas(ots[idx], datoPago);
  }

  cerrarPanelPago();

  if (esPendiente) {
    // Badge amarillo
    APP.toast.show('⏳ OT marcada como pago pendiente.', 'warning');
    if (typeof _actualizarBadgeDet === 'function') _actualizarBadgeDet('pago-pendiente');
    if (typeof _renderHistorialDet === 'function') _renderHistorialDet(ots[idx].historial_eventos || ots[idx].historial);
    if (typeof renderKanban === 'function') renderKanban();
  } else {
    APP.toast.show('✅ Pago registrado correctamente.', 'success');
    if (typeof _actualizarBadgeDet === 'function') _actualizarBadgeDet('finalizado');
    if (typeof _renderHistorialDet === 'function') _renderHistorialDet(ots[idx].historial_eventos || ots[idx].historial);
    if (typeof renderKanban === 'function') renderKanban();
    // Abrir encuesta
    setTimeout(() => abrirModalEncuesta(otId), 600);
  }
}

// ── Registro en finanzas ──────────────────────────────────────────────────────

function _pagoRegistrarFinanzas(ot, datoPago) {
  const finanzas = APP.lsGet('finanzas', []);
  const { total, totalMO, totalRep } = _pagoCalcTotales(ot);
  finanzas.push({
    id:         'fin_' + Date.now(),
    tipo:       'ingreso',
    concepto:   `OT #${ot.id} — ${ot.servicio || 'Servicio'}`,
    ot_id:      ot.id,
    cliente:    ot.clienteNombre || ot.cliente || '—',
    patente:    ot.patente || '—',
    metodo:     datoPago.metodo,
    referencia: datoPago.referencia || '—',
    monto:      total,
    mano_obra:  totalMO,
    repuestos:  totalRep,
    fecha:      datoPago.fecha || Date.now(),
    usuario:    datoPago.registrado_por,
  });
  APP.lsSet('finanzas', finanzas);
}

// ── Encuesta de satisfacción ──────────────────────────────────────────────────

function abrirModalEncuesta(otId) {
  _encuestaOtId = otId;
  const m = document.getElementById('modal-encuesta');
  if (m) m.style.display = 'flex';
}

function cerrarModalEncuesta() {
  const m = document.getElementById('modal-encuesta');
  if (m) m.style.display = 'none';
  _encuestaOtId = null;
}

function enviarEncuestaWA() {
  if (!_encuestaOtId) return;
  const ots    = APP.lsGet('mp_ots', []);
  const ot     = ots.find(o => o.id === _encuestaOtId);
  if (!ot) { cerrarModalEncuesta(); return; }

  const cfg    = _pagoGetConfig();
  const taller = cfg.nombre_taller || cfg.nombre || 'Integral Automotriz SPA';
  const cliente = ot.clienteNombre || ot.cliente || 'Cliente';
  const wz      = (ot.wz || ot.clienteWZ || '').replace(/\D/g, '');

  const msg = `Hola ${cliente} 😊, gracias por confiar en ${taller}. ¿Cómo calificarías nuestro servicio del 1 al 5? Tu opinión nos ayuda a mejorar 🙏`;
  const url = wz
    ? `https://wa.me/${wz.startsWith('56') ? wz : '56' + wz}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  window.open(url, '_blank');
  cerrarModalEncuesta();
}

// ── Cobros pendientes (utilidad para admin) ───────────────────────────────────

function obtenerCobrosPendientes() {
  const ots = APP.lsGet('mp_ots', []);
  return ots.filter(o => o.pago && o.pago.estado === 'pendiente');
}

function renderTablaCobrosPendientes(contenedorId) {
  const el = document.getElementById(contenedorId);
  if (!el) return;

  const pendientes = obtenerCobrosPendientes();
  if (!pendientes.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:12px">Sin cobros pendientes.</div>';
    return;
  }

  const ahora = Date.now();
  const filas = pendientes.map(ot => {
    const { total } = _pagoCalcTotales(ot);
    const fechaMs   = ot.pago.fecha_comprometida
      ? new Date(ot.pago.fecha_comprometida).getTime()
      : null;
    const diasPend  = ot.pago.fecha
      ? Math.floor((ahora - ot.pago.fecha) / 86400000)
      : '—';
    return `<tr style="border-bottom:0.5px solid var(--border);font-size:11px">
      <td style="padding:7px 8px;font-family:var(--font-mono)">${ot.id}</td>
      <td style="padding:7px 8px">${_esc(ot.clienteNombre || ot.cliente || '—')}</td>
      <td style="padding:7px 8px;text-align:right;font-weight:600;color:#d97706">${_pagoFmt(total)}</td>
      <td style="padding:7px 8px">${fechaMs ? new Date(fechaMs).toLocaleDateString('es-CL') : '—'}</td>
      <td style="padding:7px 8px;text-align:center">${diasPend}</td>
      <td style="padding:7px 8px;text-align:center">
        <button class="btn kanban-btn" style="border-color:#16a34a;color:#16a34a" onclick="abrirPagoDesdeAdmin('${ot.id}')">Registrar pago</button>
      </td>
    </tr>`;
  }).join('');

  const totalPend = pendientes.reduce((s, ot) => s + _pagoCalcTotales(ot).total, 0);

  el.innerHTML = `
    <div style="font-size:13px;font-weight:700;color:#d97706;margin-bottom:10px">
      Total pendiente: <span style="font-size:16px">${_pagoFmt(totalPend)}</span>
      <span style="font-size:11px;font-weight:400;color:var(--text-muted);margin-left:8px">(${pendientes.length} OT${pendientes.length > 1 ? 's' : ''})</span>
    </div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:var(--surface-1);font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">
            <th style="padding:7px 8px;text-align:left;border-bottom:0.5px solid var(--border)">OT</th>
            <th style="padding:7px 8px;text-align:left;border-bottom:0.5px solid var(--border)">Cliente</th>
            <th style="padding:7px 8px;text-align:right;border-bottom:0.5px solid var(--border)">Monto</th>
            <th style="padding:7px 8px;text-align:left;border-bottom:0.5px solid var(--border)">Fecha compromiso</th>
            <th style="padding:7px 8px;text-align:center;border-bottom:0.5px solid var(--border)">Días pendiente</th>
            <th style="padding:7px 8px;text-align:center;border-bottom:0.5px solid var(--border)">Acción</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
}

function abrirPagoDesdeAdmin(otId) {
  // Navegar al módulo de OT y abrir detalle con panel de pago
  window._otDetalleId = otId;
  _pagoOtId = otId;
  if (typeof irA === 'function') irA('taller');
  setTimeout(() => {
    if (typeof abrirDetalleOT === 'function') abrirDetalleOT(otId);
    setTimeout(abrirPanelPago, 400);
  }, 600);
}

// ── Escape HTML ───────────────────────────────────────────────────────────────

function _esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
