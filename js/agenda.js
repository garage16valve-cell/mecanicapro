// ===== MÓDULO: AGENDA Y CALENDARIO =====

const _AG_H_INI    = 8;               // 08:00
const _AG_H_FIN    = 20;              // 20:00
const _AG_PX_H     = 64;              // px por hora
const _AG_PX_MIN   = _AG_PX_H / 60;  // px por minuto
const _AG_TOTAL_PX = (_AG_H_FIN - _AG_H_INI) * _AG_PX_H; // 768px

const _AG_COLORES_PALETTE = [
  '#3b82f6','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#ec4899','#06b6d4','#84cc16',
];

const _AG_DIAS_CORTO  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const _AG_DIAS_LARGO  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const _AG_MESES       = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

let _agVista    = 'semana';
let _agFechaRef = new Date();
let _agTicker   = null;

// ===== INICIALIZACIÓN =====
function init_agenda() {
  _agFechaRef = new Date();
  const cfg = APP.lsGet('mp_agenda_cfg', {});
  _agVista = cfg.vista || 'semana';
  _agRender();
  _agGCalCargarEstado();
  if (_agTicker) clearInterval(_agTicker);
  _agTicker = setInterval(_agActualizarLineaRoja, 30000);
}

// ===== RENDER PRINCIPAL =====
function _agRender() {
  _agUpdateLabel();
  _agUpdateToolbar();

  const headerDias = document.getElementById('ag-header-dias');
  const gridWrap   = document.getElementById('ag-grid-wrap');
  const mesGrid    = document.getElementById('ag-mes-grid');

  if (_agVista === 'mes') {
    if (headerDias) headerDias.style.display = 'none';
    if (gridWrap)   gridWrap.style.display   = 'none';
    if (mesGrid)    mesGrid.style.display     = 'block';
    _agRenderMes(_agFechaRef);
  } else {
    if (headerDias) headerDias.style.display = '';
    if (gridWrap)   gridWrap.style.display   = '';
    if (mesGrid)    mesGrid.style.display     = 'none';
    if (_agVista === 'dia') _agRenderDia(_agFechaRef);
    else _agRenderSemana(_agFechaRef);
    setTimeout(_agScrollAHora, 50);
  }
  _agRenderSemaforo();
}

// ===== VISTA DÍA =====
function _agRenderDia(fecha) {
  _agRenderHeaderDias([fecha]);
  const grid = document.getElementById('ag-grid');
  if (!grid) return;
  const ots = _agOtsDelDia(fecha);
  grid.innerHTML = _agBuildGridHtml([{ fecha, ots }]);
}

// ===== VISTA SEMANA =====
function _agRenderSemana(fechaRef) {
  const lunes = _agLunesDeSemana(fechaRef);
  const columnas = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    columnas.push({ fecha: d, ots: _agOtsDelDia(d) });
  }
  _agRenderHeaderDias(columnas.map(c => c.fecha));
  const grid = document.getElementById('ag-grid');
  if (!grid) return;
  grid.innerHTML = _agBuildGridHtml(columnas);
}

// ===== GRID HTML (día/semana compartido) =====
function _agBuildGridHtml(columnas) {
  const hoy  = _agFechaKey(new Date());
  const nCols = columnas.length;
  let html = `<div style="display:flex;height:${_AG_TOTAL_PX}px;position:relative">`;

  // Columna de etiquetas de hora
  html += '<div style="width:50px;flex-shrink:0;position:relative;border-right:0.5px solid var(--border)">';
  for (let h = _AG_H_INI; h <= _AG_H_FIN; h++) {
    const top = (h - _AG_H_INI) * _AG_PX_H;
    html += `<div style="position:absolute;top:${top}px;left:0;right:6px;text-align:right;font-size:9px;color:var(--text-muted);transform:translateY(-50%)">${String(h).padStart(2,'0')}:00</div>`;
  }
  html += '</div>';

  // Columnas de días
  columnas.forEach(({ fecha, ots }) => {
    const key   = _agFechaKey(fecha);
    const esHoy = key === hoy;
    html += `<div style="flex:1;position:relative;${esHoy ? 'background:rgba(59,130,246,.03)' : ''}${nCols > 1 ? ';border-left:0.5px solid var(--border)' : ''}">`;

    // Líneas de hora
    for (let h = _AG_H_INI; h <= _AG_H_FIN; h++) {
      const top = (h - _AG_H_INI) * _AG_PX_H;
      html += `<div style="position:absolute;top:${top}px;left:0;right:0;border-top:0.5px solid var(--border);pointer-events:none"></div>`;
      if (h < _AG_H_FIN) {
        html += `<div style="position:absolute;top:${top + _AG_PX_H / 2}px;left:0;right:0;border-top:0.5px dashed rgba(128,128,128,.15);pointer-events:none"></div>`;
      }
    }

    // Eventos OT
    const agrupados = _agAgruparSolapados(ots);
    agrupados.forEach(({ ot, col, total }) => {
      html += _agEventBlockHtml(ot, col, total, nCols === 1);
    });

    // Línea roja (hora actual)
    if (esHoy) html += _agLineaRojaHtml();

    html += '</div>';
  });

  html += '</div>';
  return html;
}

// ===== BLOQUE DE EVENTO OT =====
function _agEventBlockHtml(ot, col, totalCols, ancho) {
  const hora = (ot.horaCita || '09:00').replace(/\./g, ':');
  const [hh, mm] = hora.split(':').map(Number);
  if (isNaN(hh) || isNaN(mm)) return '';
  const startMin  = hh * 60 + mm - _AG_H_INI * 60;
  if (startMin < 0 || startMin > (_AG_H_FIN - _AG_H_INI) * 60) return '';

  const durMin = _agTiempoMinutos(ot);
  const top    = Math.round(startMin * _AG_PX_MIN);
  const height = Math.max(22, Math.round(durMin * _AG_PX_MIN));
  const color  = _agColorMecanico(ot.tecnico);

  const pct    = ancho ? 1 : 1 / totalCols;
  const left   = ancho ? 2 : col * (100 / totalCols) + 0.5;
  const right  = ancho ? 2 : (totalCols - col - 1) * (100 / totalCols) + 0.5;

  const stylePos = ancho
    ? `top:${top}px;left:2px;right:2px;height:${height}px`
    : `top:${top}px;left:${left.toFixed(1)}%;right:${right.toFixed(1)}%;height:${height}px`;

  return `<div onclick="agAbrirOT('${ot.id}')" title="${ot.id} · ${ot.servicio || ''} · ${ot.clienteNombre || ''}"
    style="position:absolute;${stylePos};background:${color};border-radius:3px;padding:2px 4px;cursor:pointer;overflow:hidden;z-index:2;box-shadow:0 1px 3px rgba(0,0,0,.25)">
    <div style="font-size:9px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3">${ot.id} ${ot.clienteNombre || ''}</div>
    ${height > 32 ? `<div style="font-size:8px;color:rgba(255,255,255,.85);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ot.servicio || ''}</div>` : ''}
    ${height > 46 ? `<div style="font-size:8px;color:rgba(255,255,255,.75)">${ot.tecnico || ''}</div>` : ''}
  </div>`;
}

// ===== AGRUPAR EVENTOS SOLAPADOS =====
function _agAgruparSolapados(ots) {
  // Assign column to overlapping events
  const eventos = ots.map(ot => {
    const hora = (ot.horaCita || '09:00').replace(/\./g, ':');
    const [hh, mm] = hora.split(':').map(Number);
    const start = (isNaN(hh) ? 9 : hh) * 60 + (isNaN(mm) ? 0 : mm);
    const dur   = _agTiempoMinutos(ot);
    return { ot, start, end: start + dur, col: 0, total: 1 };
  }).sort((a, b) => a.start - b.start);

  // Simple column assignment
  const cols = [];
  eventos.forEach(ev => {
    let c = 0;
    while (cols[c] && cols[c] > ev.start) c++;
    ev.col = c;
    cols[c] = ev.end;
  });

  const maxCol = Math.max(0, ...eventos.map(e => e.col)) + 1;
  eventos.forEach(ev => { ev.total = maxCol; });
  return eventos;
}

// ===== HEADER DÍAS (fila de fechas arriba del grid) =====
function _agRenderHeaderDias(fechas) {
  const el = document.getElementById('ag-header-dias');
  if (!el) return;
  const hoy   = _agFechaKey(new Date());
  const cols  = '50px ' + fechas.map(() => '1fr').join(' ');
  el.innerHTML = `<div style="display:grid;grid-template-columns:${cols}">
    <div style="width:50px"></div>
    ${fechas.map(d => {
      const key  = _agFechaKey(d);
      const esH  = key === hoy;
      return `<div style="text-align:center;padding:8px 4px;font-size:11px;${esH ? 'color:var(--text-accent);font-weight:600' : 'color:var(--text-muted)'}">
        <div style="font-size:10px">${_AG_DIAS_CORTO[d.getDay()]}</div>
        <div style="font-size:16px;font-weight:${esH ? '700':'400'};line-height:1.4;width:28px;margin:0 auto;border-radius:50%;${esH ? 'background:var(--text-accent);color:#fff' : ''}">${d.getDate()}</div>
      </div>`;
    }).join('')}
  </div>`;
}

// ===== VISTA MES =====
function _agRenderMes(fechaRef) {
  const el = document.getElementById('ag-mes-grid');
  if (!el) return;

  const anio = fechaRef.getFullYear();
  const mes  = fechaRef.getMonth();
  const hoy  = _agFechaKey(new Date());

  const primerDia   = new Date(anio, mes, 1);
  const ultimoDia   = new Date(anio, mes + 1, 0);
  const dowPrimero  = primerDia.getDay();
  const offsetLunes = dowPrimero === 0 ? 6 : dowPrimero - 1;
  const start       = new Date(primerDia);
  start.setDate(primerDia.getDate() - offsetLunes);

  let html = '';
  // Cabecera días
  html += `<div style="display:grid;grid-template-columns:repeat(7,1fr);border-bottom:0.5px solid var(--border)">`;
  ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].forEach(d =>
    html += `<div style="text-align:center;padding:7px 0;font-size:10px;font-weight:500;color:var(--text-muted)">${d}</div>`
  );
  html += '</div>';

  html += `<div style="display:grid;grid-template-columns:repeat(7,1fr)">`;
  const cur = new Date(start);
  let semanas = 0;
  while ((cur <= ultimoDia || cur.getDay() !== 1) && semanas < 7) {
    const key    = _agFechaKey(cur);
    const esMes  = cur.getMonth() === mes;
    const esHoy  = key === hoy;
    const otsDia = _agOtsDelDia(cur);
    const diaN   = cur.getDate();

    html += `<div onclick="agNavDia('${key}')" style="min-height:80px;border-right:0.5px solid var(--border);border-bottom:0.5px solid var(--border);padding:4px;cursor:pointer;${!esMes ? 'opacity:.3' : ''}">`;
    html += `<div style="font-size:11px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:50%;margin-bottom:2px;${esHoy ? 'background:var(--text-accent);color:#fff;font-weight:700' : 'color:var(--text-primary)'}">${diaN}</div>`;
    otsDia.slice(0, 3).forEach(ot => {
      const c = _agColorMecanico(ot.tecnico);
      html += `<div onclick="event.stopPropagation();agAbrirOT('${ot.id}')" style="background:${c};color:#fff;font-size:8px;border-radius:3px;padding:1px 4px;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer">${ot.horaCita ? ot.horaCita + ' ' : ''}${ot.servicio || ot.id}</div>`;
    });
    if (otsDia.length > 3) html += `<div style="font-size:8px;color:var(--text-muted)">+${otsDia.length - 3} más</div>`;
    html += '</div>';

    cur.setDate(cur.getDate() + 1);
    if (cur.getDay() === 1) semanas++;
  }
  html += '</div>';
  el.innerHTML = html;
}

// ===== LÍNEA ROJA (hora actual) =====
function _agLineaRojaHtml() {
  const now  = new Date();
  const mins = now.getHours() * 60 + now.getMinutes() - _AG_H_INI * 60;
  if (mins < 0 || mins > (_AG_H_FIN - _AG_H_INI) * 60) return '';
  const top = Math.round(mins * _AG_PX_MIN);
  return `<div class="ag-linea-roja" style="position:absolute;top:${top}px;left:0;right:0;height:2px;background:#ef4444;z-index:10;pointer-events:none">
    <div style="position:absolute;left:-4px;top:-4px;width:8px;height:8px;border-radius:50%;background:#ef4444"></div>
  </div>`;
}

function _agActualizarLineaRoja() {
  if (_agVista === 'mes') return;
  const now  = new Date();
  const mins = now.getHours() * 60 + now.getMinutes() - _AG_H_INI * 60;
  const top  = Math.round(mins * _AG_PX_MIN);
  document.querySelectorAll('.ag-linea-roja').forEach(el => {
    if (mins >= 0 && mins <= (_AG_H_FIN - _AG_H_INI) * 60) {
      el.style.top = top + 'px';
    }
  });
}

function _agScrollAHora() {
  const wrap = document.getElementById('ag-grid-wrap');
  if (!wrap) return;
  const now    = new Date();
  const mins   = now.getHours() * 60 + now.getMinutes() - _AG_H_INI * 60;
  const offset = Math.round(mins * _AG_PX_MIN);
  wrap.scrollTop = Math.max(0, offset - 120);
}

// ===== SEMÁFORO DE CAPACIDAD =====
function _agRenderSemaforo() {
  const dotEl   = document.getElementById('ag-semaforo-dot');
  const labelEl = document.getElementById('ag-semaforo-label');
  if (!dotEl || !labelEl) return;

  const refDia = _agVista === 'dia' ? _agFechaRef : new Date();
  const ots    = _agOtsDelDia(refDia);
  const cfg    = APP.lsGet('mp_taller_config', {});
  const maxH   = parseFloat(cfg.horasMaxDia || 8);
  const maxMin = maxH * 60;
  const usadoMin = ots.reduce((s, o) => s + _agTiempoMinutos(o), 0);
  const pctLibre = maxMin > 0 ? 1 - usadoMin / maxMin : 1;

  let color, texto;
  if (pctLibre > 0.5)      { color = '#10b981'; texto = `${Math.round(pctLibre*100)}% libre`; }
  else if (pctLibre > 0.2) { color = '#f59e0b'; texto = `${Math.round(pctLibre*100)}% libre`; }
  else                     { color = '#ef4444'; texto = pctLibre <= 0 ? 'Lleno' : `${Math.round(pctLibre*100)}% libre`; }

  dotEl.style.background = color;
  labelEl.textContent    = texto;
  labelEl.style.color    = color;
}

// ===== HELPERS =====
function _agFechaKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

function _agOtsDelDia(fecha) {
  const key = _agFechaKey(fecha);
  return APP.lsGet('mp_ots', []).filter(o =>
    o.fechaCita === key && o.estado !== 'cerrado'
  );
}

function _agTiempoMinutos(ot) {
  if (ot.tiempoEstimado) return Math.max(30, Math.round(parseFloat(ot.tiempoEstimado) * 60));
  const svcs = APP.lsGet('mp_servicios', []);
  const svc  = svcs.find(s => s.nombre === ot.servicio);
  if (svc?.horasEst) return Math.max(30, Math.round(parseFloat(svc.horasEst) * 60));
  return 60;
}

function _agColorMecanico(nombre) {
  if (!nombre) return '#6b7280';
  const cfg = APP.lsGet('mp_taller_config', {});
  const map = cfg.mecanicosColores || {};
  if (map[nombre]) return map[nombre];
  // Auto-asignar desde paleta según posición en lista de mecánicos
  const todos = [...new Set(APP.lsGet('mp_ots', []).map(o => o.tecnico).filter(Boolean))];
  const idx   = todos.indexOf(nombre);
  return _AG_COLORES_PALETTE[idx >= 0 ? idx % _AG_COLORES_PALETTE.length : 0];
}

function _agLunesDeSemana(fecha) {
  const d   = new Date(fecha);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

// ===== TOOLBAR =====
function _agUpdateLabel() {
  const el = document.getElementById('ag-fecha-label');
  if (!el) return;
  if (_agVista === 'dia') {
    el.textContent = `${_AG_DIAS_LARGO[_agFechaRef.getDay()]} ${_agFechaRef.getDate()} de ${_AG_MESES[_agFechaRef.getMonth()]} ${_agFechaRef.getFullYear()}`;
  } else if (_agVista === 'semana') {
    const lunes   = _agLunesDeSemana(_agFechaRef);
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
    el.textContent = `${lunes.getDate()} – ${domingo.getDate()} de ${_AG_MESES[domingo.getMonth()]} ${domingo.getFullYear()}`;
  } else {
    el.textContent = `${_AG_MESES[_agFechaRef.getMonth()]} ${_agFechaRef.getFullYear()}`;
  }
}

function _agUpdateToolbar() {
  ['dia','semana','mes'].forEach(v => {
    const btn = document.getElementById(`ag-btn-${v}`);
    if (!btn) return;
    btn.style.background = v === _agVista ? 'var(--text-accent)' : '';
    btn.style.color      = v === _agVista ? '#fff' : '';
    btn.style.fontWeight = v === _agVista ? '600' : '';
  });
}

// ===== NAVEGACIÓN =====
function agNavPrev() {
  if (_agVista === 'dia')    _agFechaRef.setDate(_agFechaRef.getDate() - 1);
  else if (_agVista === 'semana') _agFechaRef.setDate(_agFechaRef.getDate() - 7);
  else _agFechaRef.setMonth(_agFechaRef.getMonth() - 1);
  _agRender();
}

function agNavNext() {
  if (_agVista === 'dia')    _agFechaRef.setDate(_agFechaRef.getDate() + 1);
  else if (_agVista === 'semana') _agFechaRef.setDate(_agFechaRef.getDate() + 7);
  else _agFechaRef.setMonth(_agFechaRef.getMonth() + 1);
  _agRender();
}

function agNavHoy() {
  _agFechaRef = new Date();
  _agRender();
}

function agNavDia(key) {
  _agFechaRef = new Date(key + 'T12:00:00');
  _agVista    = 'dia';
  _agRender();
}

function agSetVista(v) {
  _agVista = v;
  const cfg = APP.lsGet('mp_agenda_cfg', {});
  cfg.vista = v;
  APP.lsSet('mp_agenda_cfg', cfg);
  _agRender();
}

function agAbrirOT(id) {
  nav('ot', null);
  setTimeout(() => { if (typeof abrirDetalleOT === 'function') abrirDetalleOT(id); }, 400);
}

// ===== GOOGLE CALENDAR INTEGRACIÓN =====
const _AG_GCAL_SCOPE     = 'https://www.googleapis.com/auth/calendar';
const _AG_GCAL_DISCOVERY = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

function agToggleGCalPanel() {
  const panel = document.getElementById('ag-gcal-panel');
  if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function _agGCalCargarEstado() {
  const ints = APP.lsGet('mp_integraciones', []);
  const gcal = ints.find(i => i.id === 'gcal') || {};

  const clientIdEl = document.getElementById('ag-gcal-clientid');
  const calIdEl    = document.getElementById('ag-gcal-calid');
  const autoEl     = document.getElementById('ag-gcal-auto');

  if (clientIdEl) clientIdEl.value = gcal.clientId    || '';
  if (calIdEl)    calIdEl.value    = gcal.calendarId  || '';
  if (autoEl)     autoEl.checked   = !!(gcal.autoSync);

  _agGCalUpdateUI(!!(gcal.connected));
}

function _agGCalUpdateUI(connected) {
  const statusEl      = document.getElementById('ag-gcal-status-text');
  const connectBtn    = document.getElementById('ag-gcal-connect-btn');
  const disconnectBtn = document.getElementById('ag-gcal-disconnect-btn');
  const syncBtn       = document.getElementById('ag-gcal-sync-btn');

  if (connected) {
    if (statusEl) { statusEl.innerHTML = '✅ <strong>Conectado</strong> — sincronización activa'; statusEl.style.color = 'var(--text-success)'; }
    if (connectBtn)    connectBtn.style.display    = 'none';
    if (disconnectBtn) disconnectBtn.style.display = '';
    if (syncBtn)       syncBtn.style.display       = '';
  } else {
    if (statusEl) { statusEl.innerHTML = '⚪ Desconectado — ingresa tu Client ID y conecta'; statusEl.style.color = 'var(--text-muted)'; }
    if (connectBtn)    connectBtn.style.display    = '';
    if (disconnectBtn) disconnectBtn.style.display = 'none';
    if (syncBtn)       syncBtn.style.display       = 'none';
  }
}

function agGCalGuardar() {
  const clientId = document.getElementById('ag-gcal-clientid')?.value || '';
  const calId    = document.getElementById('ag-gcal-calid')?.value    || '';
  const autoSync = document.getElementById('ag-gcal-auto')?.checked   || false;

  const ints = APP.lsGet('mp_integraciones', []);
  let gcal = ints.find(i => i.id === 'gcal');
  if (!gcal) { gcal = { id:'gcal', nombre:'Google Calendar', icono:'ti-brand-google' }; ints.push(gcal); }
  gcal.clientId    = clientId;
  gcal.calendarId  = calId;
  gcal.autoSync    = autoSync;
  APP.lsSet('mp_integraciones', ints);
}

function agConectarGCal() {
  agGCalGuardar();
  const ints     = APP.lsGet('mp_integraciones', []);
  const gcal     = ints.find(i => i.id === 'gcal') || {};
  const clientId = gcal.clientId || '';

  if (!clientId) {
    alert('Ingresa tu Google Client ID primero.\n\nPasos:\n1. Ir a console.cloud.google.com\n2. Crear proyecto → APIs → Biblioteca → Google Calendar API → Habilitar\n3. Credenciales → Crear credencial → ID de cliente OAuth 2.0\n4. Pegar el Client ID aquí');
    return;
  }

  // Cargar Google API Script
  if (!document.getElementById('ag-gapi-script')) {
    const statusEl = document.getElementById('ag-gcal-status-text');
    if (statusEl) statusEl.textContent = '⏳ Cargando Google API…';
    const s = document.createElement('script');
    s.id  = 'ag-gapi-script';
    s.src = 'https://apis.google.com/js/api.js';
    s.onload  = () => _agGCalInit(clientId, gcal.calendarId || 'primary');
    s.onerror = () => alert('Error al cargar Google API. Verifica tu conexión a internet.');
    document.head.appendChild(s);
  } else if (window.gapi) {
    _agGCalInit(clientId, gcal.calendarId || 'primary');
  }
}

function _agGCalInit(clientId, calendarId) {
  if (!window.gapi) { alert('Google API no disponible.'); return; }
  gapi.load('client:auth2', () => {
    gapi.client.init({
      clientId,
      discoveryDocs: [_AG_GCAL_DISCOVERY],
      scope: _AG_GCAL_SCOPE,
    }).then(() => {
      const auth = gapi.auth2.getAuthInstance();
      if (auth.isSignedIn.get()) {
        _agGCalOnConnected();
      } else {
        auth.signIn().then(_agGCalOnConnected, err => {
          alert('Error al conectar con Google:\n' + (err.error || JSON.stringify(err)));
        });
      }
    }).catch(err => {
      alert('Error al inicializar Google Calendar API:\n' + JSON.stringify(err));
    });
  });
}

function _agGCalOnConnected() {
  const ints = APP.lsGet('mp_integraciones', []);
  let gcal = ints.find(i => i.id === 'gcal');
  if (!gcal) { gcal = { id:'gcal' }; ints.push(gcal); }
  gcal.connected = true;
  APP.lsSet('mp_integraciones', ints);
  _agGCalUpdateUI(true);
  alert('✅ Conectado a Google Calendar correctamente.');
}

function agDesconectarGCal() {
  try { if (window.gapi?.auth2) gapi.auth2.getAuthInstance()?.signOut(); } catch (e) { /* ok */ }
  const ints = APP.lsGet('mp_integraciones', []);
  const gcal = ints.find(i => i.id === 'gcal');
  if (gcal) gcal.connected = false;
  APP.lsSet('mp_integraciones', ints);
  _agGCalUpdateUI(false);
}

function agSincronizarOTs() {
  if (!window.gapi?.client?.calendar) {
    alert('No conectado a Google Calendar. Usa el botón "Conectar con Google" primero.');
    return;
  }
  const ints  = APP.lsGet('mp_integraciones', []);
  const gcal  = ints.find(i => i.id === 'gcal') || {};
  const calId = gcal.calendarId || 'primary';

  const ots = APP.lsGet('mp_ots', []).filter(o =>
    o.fechaCita && (o.estado === 'agendado' || o.estado === 'en-proceso' || o.estado === 'cotizacion')
  );

  if (!ots.length) { alert('No hay OTs agendadas para sincronizar.'); return; }

  const btn = document.getElementById('ag-gcal-sync-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sincronizando…'; }

  let synced = 0, errores = 0;
  const promises = ots.map(ot => {
    const hora    = (ot.horaCita || '09:00');
    const durMins = _agTiempoMinutos(ot);
    const startDT = `${ot.fechaCita}T${hora}:00`;
    const endDate = new Date(`${ot.fechaCita}T${hora}:00`);
    endDate.setMinutes(endDate.getMinutes() + durMins);
    const endDT = `${ot.fechaCita}T${String(endDate.getHours()).padStart(2,'0')}:${String(endDate.getMinutes()).padStart(2,'0')}:00`;

    return gapi.client.calendar.events.insert({
      calendarId: calId,
      resource: {
        summary:     `OT ${ot.id} — ${ot.servicio || 'Servicio'}`,
        description: `Cliente: ${ot.clienteNombre || '—'}\nPatente: ${ot.patente || '—'}\nTécnico: ${ot.tecnico || '—'}\nNotas: ${ot.notas || '—'}`,
        start: { dateTime: startDT, timeZone: 'America/Santiago' },
        end:   { dateTime: endDT,   timeZone: 'America/Santiago' },
        colorId: _agGCalColorId(ot.tecnico),
      },
    }).then(() => synced++).catch(() => errores++);
  });

  Promise.allSettled(promises).then(() => {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-refresh"></i> Sincronizar OTs ahora'; }
    alert(`✅ Sincronización completada.\n${synced} OTs enviadas a Google Calendar.${errores ? '\n⚠ ' + errores + ' errores.' : ''}`);
  });
}

function _agGCalColorId(tecnico) {
  // Google Calendar color IDs 1-11
  const todos = [...new Set(APP.lsGet('mp_ots', []).map(o => o.tecnico).filter(Boolean))];
  const idx   = todos.indexOf(tecnico);
  return String((idx % 11) + 1);
}
