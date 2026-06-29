// ===== MÓDULO: MARKETING (Fidelización, Redes Sociales, WhatsApp) =====

// ===== TABS =====
function mktSetTab(name, btn) {
  document.querySelectorAll('#module-marketing .page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#module-marketing .tabs .tab').forEach(t => t.classList.remove('active'));
  const page = document.getElementById('pg-' + name);
  if (page) page.classList.add('active');
  if (btn) btn.classList.add('active');
}

// ===== WHATSAPP — PLANTILLAS =====

const _MKT_PLANTILLAS_DEFAULT = {
  confirmar_cita:    `Hola [Cliente] 👋\nTe confirmamos tu cita en [Taller]:\n📅 [Fecha] a las [Hora]\n🚗 [Marca] [Modelo]\n¡Te esperamos! 🔧`,
  vehiculo_recibido: `Hola [Cliente] 👋\nRecibimos tu [Marca] [Modelo]\nplaca [Patente] en [Taller].\nYa estamos trabajando en él ✅\nTe avisaremos cuando tengamos novedades.`,
  cotizacion_lista:  `Hola [Cliente] 🔧\nLa cotización de tu [Marca] [Modelo]\nestá lista. Total: $[Monto]\nRevisa y aprueba aquí: [Link]\n¡Cualquier duda estamos disponibles!`,
  vehiculo_listo:    `Hola [Cliente] 🎉\nTu [Marca] [Modelo] placa [Patente]\nestá listo para retirar en [Taller].\n¡Te esperamos cuando puedas! 🚗✨`,
  recordatorio_pago: `Hola [Cliente] 👋\nTe recordamos que tienes un pago\npendiente de $[Monto] por [Servicio]\nen [Taller].\nPor favor contáctanos para coordinarlo.`,
  encuesta:          `Hola [Cliente] 😊\nGracias por confiar en [Taller].\n¿Cómo calificarías nuestro servicio?\n1⭐ 2⭐ 3⭐ 4⭐ 5⭐\nTu opinión nos ayuda a mejorar 🙏`,
};

const _MKT_PLANTILLAS_META = [
  { key: 'confirmar_cita',    label: '📅 Confirmar cita' },
  { key: 'vehiculo_recibido', label: '🔧 Vehículo recibido' },
  { key: 'cotizacion_lista',  label: '💰 Cotización lista' },
  { key: 'vehiculo_listo',    label: '✅ Vehículo listo' },
  { key: 'recordatorio_pago', label: '⏳ Recordatorio pago' },
  { key: 'encuesta',          label: '😊 Encuesta' },
];

const _MKT_VARIABLES = [
  '[Cliente]','[Patente]','[Marca]','[Modelo]',
  '[Fecha]','[Hora]','[Monto]','[Servicio]','[Taller]','[Link]',
];

function mktRenderPlantillas() {
  const wrap = document.getElementById('acfg-plantillas-wrap');
  if (!wrap) return;
  const config    = APP.lsGet('mp_config') || {};
  const guardadas = config.plantillas_whatsapp || {};
  const chips = _MKT_VARIABLES.map(v =>
    `<button class="tag" onclick="mktInsertarVariable('${v}')" title="Insertar ${v}"
      style="cursor:pointer;font-size:10px;padding:3px 8px;margin:2px;font-family:var(--font-mono)">${v}</button>`
  ).join('');
  wrap.innerHTML = `
    <div style="margin-bottom:12px">
      <div style="font-size:11px;font-weight:500;margin-bottom:6px">Variables disponibles <span style="font-size:10px;color:var(--text-muted)">(click para insertar en la plantilla activa)</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:2px">${chips}</div>
    </div>
    ${_MKT_PLANTILLAS_META.map(({ key, label }) => {
      const texto = guardadas[key] || _MKT_PLANTILLAS_DEFAULT[key];
      return `
      <div class="card" style="margin-bottom:10px">
        <div class="ch" style="margin-bottom:8px">
          <span class="ct" style="font-size:12px">${label}</span>
          <button class="btn" onclick="mktRestablecerPlantilla('${key}')" style="font-size:10px">↺ Restablecer</button>
        </div>
        <textarea id="acfg-ta-${key}" rows="5"
          style="width:100%;font-size:12px;line-height:1.55;resize:vertical"
          onfocus="mktSetActiva('${key}')">${_mktEsc(texto)}</textarea>
      </div>`;
    }).join('')}
    <button class="btn bpa" onclick="mktGuardarPlantillas()" style="width:100%;justify-content:center;margin-top:4px">
      <i class="ti ti-device-floppy"></i> 💾 Guardar plantillas
    </button>
  `;
}

let _mktKeyActiva = null;

function mktSetActiva(key) { _mktKeyActiva = key; }

function mktInsertarVariable(variable) {
  const key = _mktKeyActiva || _MKT_PLANTILLAS_META[0].key;
  const ta  = document.getElementById('acfg-ta-' + key);
  if (!ta) return;
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  ta.value = ta.value.slice(0, start) + variable + ta.value.slice(end);
  ta.selectionStart = ta.selectionEnd = start + variable.length;
  ta.focus();
}

function mktRestablecerPlantilla(key) {
  const ta = document.getElementById('acfg-ta-' + key);
  if (!ta) return;
  if (!confirm('¿Restablecer esta plantilla al texto original?')) return;
  ta.value = _MKT_PLANTILLAS_DEFAULT[key] || '';
  APP.toast.show('Plantilla restablecida', 'success');
}

function mktGuardarPlantillas() {
  const config = APP.lsGet('mp_config') || {};
  const plantillas = {};
  _MKT_PLANTILLAS_META.forEach(({ key }) => {
    const ta = document.getElementById('acfg-ta-' + key);
    plantillas[key] = ta ? ta.value : (_MKT_PLANTILLAS_DEFAULT[key] || '');
  });
  config.plantillas_whatsapp = plantillas;
  APP.lsSet('mp_config', config);
  APP.toast.show('✅ Plantillas guardadas', 'success');
}

function _mktEsc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ===== WHATSAPP — NOTIFICACIONES / MOTOR ALERTAS =====

let _mktAlertaIntervalId  = null;
let _mktAlertaResumenDate = '';
let _mktAlertaSentSet     = new Set();

function mktCargarAlertasConfig() {
  const cfg = APP.lsGet('mp_alertas_config', { horaResumen:'17:50', diasPost:7 });
  const hr  = document.getElementById('alerta-hora-resumen');
  const dp  = document.getElementById('alerta-dias-post');
  if (hr) hr.value = cfg.horaResumen || '17:50';
  if (dp) dp.value = String(cfg.diasPost || 7);
}

function mktGuardarAlertasConfig() {
  APP.lsSet('mp_alertas_config', {
    horaResumen: document.getElementById('alerta-hora-resumen')?.value || '17:50',
    diasPost:    parseInt(document.getElementById('alerta-dias-post')?.value) || 7,
  });
}

function mktIniciarMotorAlertas() {
  if (_mktAlertaIntervalId) return;
  _mktAlertaIntervalId = setInterval(mktTickAlertas, 60000);
  mktActualizarMotorStatus();
  mktTickAlertas();
}

function mktTickAlertas() {
  mktCheckAlertaResumen();
  mktCheckAlerta30min();
}

function mktActualizarMotorStatus() {
  const el = document.getElementById('alerta-motor-status');
  if (!el) return;
  if (_mktAlertaIntervalId) {
    el.innerHTML = '🟢 Activo — revisando alertas cada minuto (Aviso 30 min + Resumen diario).';
    el.style.color = 'var(--text-success)';
  } else {
    el.innerHTML = '⚪ Inactivo'; el.style.color = 'var(--text-muted)';
  }
}

function mktCheckAlertaResumen() {
  const cfg     = APP.lsGet('mp_alertas_config', { horaResumen:'17:50' });
  const ahora   = new Date();
  const horaAct = ahora.getHours().toString().padStart(2,'0') + ':' + ahora.getMinutes().toString().padStart(2,'0');
  const hoyKey  = ahora.toISOString().split('T')[0];
  if (horaAct !== (cfg.horaResumen || '17:50')) return;
  if (_mktAlertaResumenDate === hoyKey) return;
  _mktAlertaResumenDate = hoyKey;
  mktEnviarResumen(false);
}

function mktEnviarResumenManual() { mktEnviarResumen(true); }

function mktEnviarResumen(manual) {
  const ops = APP.lsGet('mp_operarios', []).filter(o => o.activo !== false && o.nombre && o.wz);
  if (!ops.length) { mktSetStatus('Sin operarios activos con WhatsApp configurado.'); return; }
  const manana    = new Date(); manana.setDate(manana.getDate() + 1);
  const mananaKey = [manana.getFullYear(), String(manana.getMonth()+1).padStart(2,'0'), String(manana.getDate()).padStart(2,'0')].join('-');
  const label     = manana.toLocaleDateString('es-CL', { weekday:'long', day:'numeric', month:'long' });
  const ots       = APP.lsGet('mp_ots', []);
  let enviados = 0;
  ops.forEach((op, i) => {
    const misOTs = ots.filter(o =>
      o.tecnico === op.nombre && o.fechaCita === mananaKey &&
      !['cerrado','completado','nollego','cancelo'].includes(o.estado)
    ).sort((a, b) => (a.horaCita || '').localeCompare(b.horaCita || ''));
    if (!misOTs.length && !manual) return;
    const lineas = misOTs.length
      ? misOTs.map(o => `  ${o.horaCita || '--:--'} - ${o.servicio || 'Servicio'} | ${o.patente || '—'} | ${o.clienteNombre || '—'}`).join('\n')
      : '  (Sin citas agendadas para mañana)';
    const msg = `Hola ${op.nombre} 👋, aquí tu agenda para ${label}:\n\n${lineas}\n\nIntegral Automotriz Spa 🔧`;
    mktLogAlerta('resumen-dia', op.nombre, op.wz, msg, 'enviado');
    setTimeout(() => window.open('https://wa.me/' + op.wz.replace(/\D/g,'') + '?text=' + encodeURIComponent(msg), '_blank'), i * 900);
    enviados++;
  });
  mktSetStatus(enviados ? '✓ Resumen enviado a ' + enviados + ' operario(s) para ' + label + '.' : 'Sin operarios con agenda mañana.');
  mktRenderLog();
}

function mktCheckAlerta30min() {
  const ahora  = new Date();
  const hoyKey = [ahora.getFullYear(), String(ahora.getMonth()+1).padStart(2,'0'), String(ahora.getDate()).padStart(2,'0')].join('-');
  const en30   = new Date(ahora.getTime() + 30 * 60000);
  const en30H  = en30.getHours().toString().padStart(2,'0') + ':' + en30.getMinutes().toString().padStart(2,'0');
  const ots = APP.lsGet('mp_ots', []).filter(o =>
    o.fechaCita === hoyKey && o.horaCita === en30H && o.tecnico &&
    !['cerrado','completado','nollego','cancelo'].includes(o.estado)
  );
  if (!ots.length) return;
  const ops = APP.lsGet('mp_operarios', []);
  ots.forEach(ot => {
    const key = ot.id + ':30min';
    if (_mktAlertaSentSet.has(key)) return;
    _mktAlertaSentSet.add(key);
    const op = ops.find(o => o.nombre === ot.tecnico && o.activo !== false && o.wz);
    if (!op) return;
    const msg = '⏰ En 30 min llega *' + (ot.clienteNombre || 'un cliente') + '* con *' + (ot.patente || '—') + '* para *' + (ot.servicio || 'servicio') + '*. ¡Prepárate! 🔧';
    mktLogAlerta('aviso-30min', op.nombre, op.wz, msg, 'enviado');
    window.open('https://wa.me/' + op.wz.replace(/\D/g,'') + '?text=' + encodeURIComponent(msg), '_blank');
    mktRenderLog();
  });
}

function mktScanPostServicio() {
  const cfg  = APP.lsGet('mp_alertas_config', { diasPost:7 });
  const dias = cfg.diasPost || 7;
  const log  = APP.lsGet('mp_alertas_log', []);
  const ots  = APP.lsGet('mp_ots', []).filter(o => o.estado === 'completado' && (o.wz || o.clienteWz));
  const ahora= Date.now();
  const pend = ots.filter(ot => {
    if (log.some(l => l.otId === ot.id && l.tipo === 'post-servicio')) return false;
    return (ahora - new Date(ot.salida_ts || ot.creado).getTime()) / 86400000 >= dias;
  });
  const el = document.getElementById('alerta-post-count');
  if (el) {
    el.textContent = pend.length ? pend.length + ' seguimiento(s) pendiente(s)' : 'Sin seguimientos pendientes';
    el.style.color = pend.length ? 'var(--text-accent)' : 'var(--text-muted)';
  }
}

function mktEnviarPostServicio() {
  const cfg  = APP.lsGet('mp_alertas_config', { diasPost:7 });
  const dias = cfg.diasPost || 7;
  const log  = APP.lsGet('mp_alertas_log', []);
  const ots  = APP.lsGet('mp_ots', []).filter(o => o.estado === 'completado' && (o.wz || o.clienteWz));
  const ahora= Date.now();
  let enviados = 0;
  ots.forEach((ot, i) => {
    const key = ot.id + ':post-servicio';
    if (_mktAlertaSentSet.has(key)) return;
    if (log.some(l => l.otId === ot.id && l.tipo === 'post-servicio')) return;
    if ((ahora - new Date(ot.salida_ts || ot.creado).getTime()) / 86400000 < dias) return;
    _mktAlertaSentSet.add(key);
    const wz  = (ot.clienteWz || ot.wz || '').replace(/\D/g,'');
    if (!wz) return;
    const n   = Math.floor((ahora - new Date(ot.salida_ts || ot.creado).getTime()) / 86400000);
    const msg = 'Hola ' + (ot.clienteNombre || 'Cliente') + ' 👋, hace ' + n + ' día' + (n!==1?'s':'') + ' realizaste *' + (ot.servicio || 'un servicio') + '* en Integral Automotriz.\n\n¿Quedaste satisfecho con el resultado? Cuéntanos 😊\n\n¡Gracias por preferirnos! 🔧\nhttps://integral-automotriz-spa.reservio.com/booking';
    mktLogAlerta('post-servicio', ot.clienteNombre || '—', ot.wz || ot.clienteWz, msg, 'enviado', ot.id);
    setTimeout(() => window.open('https://wa.me/' + wz + '?text=' + encodeURIComponent(msg), '_blank'), i * 900);
    enviados++;
  });
  mktRenderLog();
  mktScanPostServicio();
  mktSetStatus(enviados ? '✓ ' + enviados + ' mensaje(s) post-servicio enviados.' : 'Sin seguimientos pendientes.');
}

function mktLogAlerta(tipo, destinatario, telefono, mensaje, estado, otId) {
  const log = APP.lsGet('mp_alertas_log', []);
  log.unshift({ id: 'al-' + Date.now(), ts: new Date().toISOString(), tipo, destinatario, telefono, mensaje, estado, ...(otId ? { otId } : {}) });
  if (log.length > 200) log.length = 200;
  APP.lsSet('mp_alertas_log', log);
}

function mktRenderLog() {
  const tbody = document.getElementById('adm-alertas-log-tbody');
  if (!tbody) return;
  const log = APP.lsGet('mp_alertas_log', []);
  if (!log.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:16px;font-size:11px">Sin alertas registradas aún.</td></tr>';
    return;
  }
  const tipoLabel = { 'resumen-dia':'📅 Resumen diario', 'aviso-30min':'⏰ Aviso 30 min', 'post-servicio':'⭐ Post-servicio' };
  tbody.innerHTML = log.slice(0, 60).map(l => {
    const dt    = new Date(l.ts);
    const dtStr = dt.toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit'}) + ' ' + dt.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});
    return '<tr>'
      + '<td style="font-size:10px;white-space:nowrap;color:var(--text-muted)">' + dtStr + '</td>'
      + '<td style="font-size:10px;white-space:nowrap">' + (tipoLabel[l.tipo] || l.tipo) + '</td>'
      + '<td style="font-size:11px">' + _mktEsc(l.destinatario || '—') + '</td>'
      + '<td style="font-size:10px;color:var(--text-muted);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + _mktEsc(l.mensaje||'') + '">' + _mktEsc((l.mensaje||'').substring(0,80)) + ((l.mensaje||'').length>80?'…':'') + '</td>'
      + '<td><span class="st ' + (l.estado==='enviado'?'s-done':'s-wait') + '" style="font-size:9px"><span class="dot"></span>' + l.estado + '</span></td>'
      + '</tr>';
  }).join('');
}

function mktLimpiarLog() {
  APP.modal.confirmar('¿Borrar todo el historial de alertas?', () => {
    APP.lsSet('mp_alertas_log', []);
    mktRenderLog();
    mktScanPostServicio();
  }, 'Borrar historial', 'Cancelar');
}

function mktSetStatus(msg) {
  const el = document.getElementById('alerta-status');
  if (el) el.textContent = msg;
  setTimeout(() => { const e = document.getElementById('alerta-status'); if (e && e.textContent === msg) e.textContent = ''; }, 5000);
}

// ===== INIT =====
function init_marketing() {
  mktRenderPlantillas();
  mktCargarAlertasConfig();
  mktScanPostServicio();
  mktIniciarMotorAlertas();
}

// Polyfill in case old code calls acfgRenderPlantillas
window.acfgRenderPlantillas = window.acfgRenderPlantillas || mktRenderPlantillas;