// ===== MÓDULO: AGENDA Y CALENDARIO =====

const _AG_H_INI    = 8;
const _AG_H_FIN    = 20;
const _AG_PX_H     = 64;
const _AG_PX_MIN   = _AG_PX_H / 60;
const _AG_TOTAL_PX = (_AG_H_FIN - _AG_H_INI) * _AG_PX_H;

const _AG_COLORES_PALETTE = [
  '#3b82f6','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#ec4899','#06b6d4','#84cc16',
];

const _AG_TECNICO_PALETTE = [
  '#FF6B6B','#4ECDC4','#45B7D1','#96CEB4',
  '#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F',
];

const _AG_DIAS_CORTO  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const _AG_DIAS_LARGO  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const _AG_MESES       = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

let _agVista    = 'semana';
let _agFechaRef = new Date();
let _agMesMini  = null; // { anio, mes } para mini calendario
let _agFiltroOp = '';   // ID o nombre del operario filtrado
let _agTicker   = null;
let _agDragData    = null; // datos del arrastre actual
let _agTooltipTimer = null;
let _agTooltipEl    = null;

// ===== INICIALIZACIÓN =====
function init_agenda() {
  _agFechaRef = new Date();
  const cfg = APP.lsGet('mp_agenda_cfg', {});
  _agVista = cfg.vista || 'semana';
  _agMesMini = null;
  _agFiltroOp = '';
  _agCargarFiltroOperarios();
  _agRender();
  _agGCalCargarEstado();
  if (_agTicker) clearInterval(_agTicker);
  _agTicker = setInterval(_agActualizarLineaRoja, 30000);
}

// ===== RENDER PRINCIPAL =====
function _agRender() {
  _agUpdateLabel();
  _agUpdateToolbar();
  agMiniCalendar();

  const headerDias = document.getElementById('ag-header-dias');
  const gridWrap   = document.getElementById('ag-grid-wrap');
  const mesGrid    = document.getElementById('ag-mes-grid');

  if (_agVista === 'mes') {
    if (headerDias) headerDias.style.display = 'none';
    if (gridWrap)   gridWrap.style.display   = 'none';
    if (mesGrid)    mesGrid.style.display     = 'block';
    _agRenderMes();
  } else {
    if (headerDias) headerDias.style.display = '';
    if (gridWrap)   gridWrap.style.display   = '';
    if (mesGrid)    mesGrid.style.display     = 'none';
    if (_agVista === 'dia') _agRenderDia();
    else _agRenderSemana();
    setTimeout(_agScrollAHora, 50);
  }
  _agRenderSemaforoHoy();
}

// ===== FILTRO POR OPERARIO =====
function _agCargarFiltroOperarios() {
  const sel = document.getElementById('ag-filtro-op');
  if (!sel) return;
  const ops = (APP.lsGet('usuarios', [])).filter(u =>
    u.rol === 'mecanico' || u.rol === 'técnico'
  );
  sel.innerHTML = '<option value="">Todos los operarios</option>'
    + ops.map(o => {
        const name = `${o.nombre || ''} ${o.apellido || ''}`.trim();
        const val  = o.id || name;
        return `<option value="${val}">${name}</option>`;
      }).join('');
}

function agendaFiltrarPorOperario(val) {
  _agFiltroOp = val;
  _agRender();
}

// ===== OBTENER OTS POR DÍA + FILTRO =====
function _agOtsDelDia(fecha) {
  const key = _agFechaKey(fecha);
  let ots = APP.lsGet('mp_ots', []).filter(o =>
    o.fechaCita === key && o.estado !== 'cerrado'
  );
  if (_agFiltroOp) {
    const ops = (APP.lsGet('usuarios', [])).filter(u =>
      u.rol === 'mecanico' || u.rol === 'técnico'
    );
    const op = ops.find(o => (o.id || `${o.nombre || ''} ${o.apellido || ''}`.trim()) === _agFiltroOp);
    if (op) {
      const opName = `${op.nombre || ''} ${op.apellido || ''}`.trim();
      const opId   = op.id;
      ots = ots.filter(o => o.tecnico === opName || o.tecnico === opId || o.id_tecnico_asignado === _agFiltroOp);
    } else {
      ots = ots.filter(o => o.tecnico === _agFiltroOp || o.id_tecnico_asignado === _agFiltroOp);
    }
  }
  return ots;
}

// ===== EXPORT: GET OTS POR DÍA (uso externo) =====
function agendaGetOtsPorDia(fecha, idOperario) {
  const prevFilter = _agFiltroOp;
  if (idOperario) _agFiltroOp = idOperario;
  const result = _agOtsDelDia(fecha);
  _agFiltroOp = prevFilter;
  return result;
}

// ===== HORAS TOTALES DESDE SERVICIOS =====
function agendaGetHorasServicio(servicios) {
  if (!servicios || !servicios.length) return 0;
  const svcs = APP.lsGet('mp_servicios', []);
  return servicios.reduce((sum, svcId) => {
    const svc = svcs.find(s => s.id === svcId || s.nombre === svcId);
    return sum + (svc?.horasEst ? parseFloat(svc.horasEst) : 1);
  }, 0);
}

// ===== CÁLCULO DE OCUPACIÓN =====
function agendaCalcOcupacion(fecha, idOperario) {
  const prevFilter = _agFiltroOp;
  if (idOperario) _agFiltroOp = idOperario;
  const ots = _agOtsDelDia(fecha);
  _agFiltroOp = prevFilter;
  if (!ots.length) return 0;
  const totalMin = ots.reduce((s, o) => s + _agTiempoMinutos(o), 0);
  return Math.min(100, Math.round((totalMin / 480) * 100));
}

function agendaGetColorSemaforo(pct) {
  if (pct === 0) return '#d1d5db';
  if (pct <= 50) return '#10b981';
  if (pct <= 80) return '#f59e0b';
  return '#ef4444';
}

// ===== COLOR POR ESTADO =====
function agendaGetColorEstado(estado) {
  const map = {
    'agendado':    '#3B82F6',
    'agendada':    '#3B82F6',
    'en-proceso':  '#F59E0B',
    'en_proceso':  '#F59E0B',
    'completado':  '#10B981',
    'completada':  '#10B981',
    'cancelado':   '#EF4444',
    'cancelada':   '#EF4444',
  };
  return map[estado] || '#6B7280';
}

// ===== COLOR POR TÉCNICO (borde izquierdo) =====
function agendaGetColorTecnico(nombre) {
  if (!nombre) return 'transparent';
  const colores = APP.lsGet('tecnico_colores', []);
  const existente = colores.find(c => c.nombre === nombre || c.id_tecnico === nombre);
  if (existente) return existente.color;
  const usado = colores.map(c => c.color);
  const libre = _AG_TECNICO_PALETTE.find(c => !usado.includes(c)) || _AG_TECNICO_PALETTE[colores.length % _AG_TECNICO_PALETTE.length];
  colores.push({ nombre, id_tecnico: nombre, color: libre });
  APP.lsSet('tecnico_colores', colores);
  return libre;
}

// ===== VERIFICAR SOBRECARGA TÉCNICO (>8h/día) =====
function _agTecnicoOverloaded(tecnico, fechaKey) {
  if (!tecnico) return false;
  const ots = APP.lsGet('mp_ots', []).filter(o =>
    o.fechaCita === fechaKey && (o.tecnico === tecnico) && o.estado !== 'cerrado'
  );
  const totalMin = ots.reduce((s, o) => s + _agTiempoMinutos(o), 0);
  return totalMin > 480;
}

// ===== VISTA DÍA — columnas por operario =====
function _agRenderDia() {
  const ots  = _agOtsDelDia(_agFechaRef);
  const hoy  = _agFechaKey(new Date());
  const key  = _agFechaKey(_agFechaRef);

  // Obtener operadores únicos de las OTs de este día
  const operadores = [...new Set(ots.map(o => o.tecnico).filter(Boolean))];

  // Si no hay operadores asignados, caemos a una columna genérica
  const cols = operadores.length || 1;

  const headerEl = document.getElementById('ag-header-dias');
  if (headerEl) {
    const esHoy = key === hoy;
    let hHtml = `<div style="display:flex">`;
    hHtml += `<div style="width:50px;flex-shrink:0"></div>`;
    if (operadores.length) {
      operadores.forEach(op => {
        const c = _agColorMecanico(op);
        hHtml += `<div style="flex:1;text-align:center;padding:6px 4px;font-size:10px;font-weight:500;color:${c};border-left:0.5px solid var(--border);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${op}</div>`;
      });
    } else {
      hHtml += `<div style="flex:1;text-align:center;padding:6px 4px;font-size:10px;color:var(--text-muted)">${_AG_DIAS_CORTO[_agFechaRef.getDay()]} ${_agFechaRef.getDate()}</div>`;
    }
    hHtml += `</div>`;
    headerEl.innerHTML = hHtml;
    headerEl.style.display = '';
  }

  const grid = document.getElementById('ag-grid');
  if (!grid) return;

  if (!ots.length && !operadores.length) {
    grid.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13px">Sin OTs agendadas para este día</div>`;
    return;
  }

  let html = `<div style="display:flex;height:${_AG_TOTAL_PX}px;position:relative">`;

  // Columna horas
  html += '<div style="width:50px;flex-shrink:0;position:relative;border-right:0.5px solid var(--border)">';
  for (let h = _AG_H_INI; h <= _AG_H_FIN; h++) {
    const top = (h - _AG_H_INI) * _AG_PX_H;
    html += `<div style="position:absolute;top:${top}px;left:0;right:6px;text-align:right;font-size:9px;color:var(--text-muted);transform:translateY(-50%)">${String(h).padStart(2,'0')}:00</div>`;
  }
  html += '</div>';

  if (operadores.length) {
    operadores.forEach(op => {
      const opOts = ots.filter(o => o.tecnico === op);
      const c     = _agColorMecanico(op);
      html += `<div class="ag-col-dia" data-op="${op}" style="flex:1;position:relative;border-left:0.5px solid var(--border);min-width:80px" ondrop="agendaDrop(event,'${_agFechaKey(_agFechaRef)}')" ondragover="agDragOver(event)">`;
      for (let h = _AG_H_INI; h <= _AG_H_FIN; h++) {
        const top = (h - _AG_H_INI) * _AG_PX_H;
        html += `<div style="position:absolute;top:${top}px;left:0;right:0;border-top:0.5px solid var(--border);pointer-events:none"></div>`;
        if (h < _AG_H_FIN) {
          html += `<div style="position:absolute;top:${top + _AG_PX_H / 2}px;left:0;right:0;border-top:0.5px dashed rgba(128,128,128,.15);pointer-events:none"></div>`;
        }
      }
      const agrupados = _agAgruparSolapados(opOts);
      agrupados.forEach(({ ot, col, total }) => {
        html += _agEventBlockHtml(ot, col, total, true);
      });
      if (key === _agFechaKey(new Date())) html += _agLineaRojaHtml();
      html += '</div>';
    });
  } else {
    // Sin operadores asignados — columna genérica
    html += `<div class="ag-col-dia" data-op="" style="flex:1;position:relative;border-left:0.5px solid var(--border)" ondrop="agendaDrop(event,'${_agFechaKey(_agFechaRef)}')" ondragover="agDragOver(event)">`;
    for (let h = _AG_H_INI; h <= _AG_H_FIN; h++) {
      const top = (h - _AG_H_INI) * _AG_PX_H;
      html += `<div style="position:absolute;top:${top}px;left:0;right:0;border-top:0.5px solid var(--border);pointer-events:none"></div>`;
      if (h < _AG_H_FIN) {
        html += `<div style="position:absolute;top:${top + _AG_PX_H / 2}px;left:0;right:0;border-top:0.5px dashed rgba(128,128,128,.15);pointer-events:none"></div>`;
      }
    }
    const agrupados = _agAgruparSolapados(ots);
    agrupados.forEach(({ ot, col, total }) => {
      html += _agEventBlockHtml(ot, col, total, false);
    });
    if (key === _agFechaKey(new Date())) html += _agLineaRojaHtml();
    html += '</div>';
  }

  html += '</div>';
  grid.innerHTML = html;
}

// ===== VISTA SEMANA =====
function _agRenderSemana() {
  const lunes = _agLunesDeSemana(_agFechaRef);
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

// ===== GRID HTML (compartido semana y días sin operadores) =====
function _agBuildGridHtml(columnas) {
  const hoy  = _agFechaKey(new Date());
  const nCols = columnas.length;
  let html = `<div style="display:flex;height:${_AG_TOTAL_PX}px;position:relative">`;

  // Columna horas
  html += '<div style="width:50px;flex-shrink:0;position:relative;border-right:0.5px solid var(--border)">';
  for (let h = _AG_H_INI; h <= _AG_H_FIN; h++) {
    const top = (h - _AG_H_INI) * _AG_PX_H;
    html += `<div style="position:absolute;top:${top}px;left:0;right:6px;text-align:right;font-size:9px;color:var(--text-muted);transform:translateY(-50%)">${String(h).padStart(2,'0')}:00</div>`;
  }
  html += '</div>';

  columnas.forEach(({ fecha, ots }) => {
    const key   = _agFechaKey(fecha);
    const esHoy = key === hoy;
    const colWidth = nCols > 1 ? '' : '';
    html += `<div class="ag-col-semana" data-fecha="${key}" style="flex:1;position:relative;${esHoy ? 'background:rgba(59,130,246,.03)' : ''}${nCols > 1 ? ';border-left:0.5px solid var(--border)' : ''}" ondrop="agendaDrop(event,'${key}')" ondragover="agDragOver(event)">`;

    for (let h = _AG_H_INI; h <= _AG_H_FIN; h++) {
      const top = (h - _AG_H_INI) * _AG_PX_H;
      html += `<div style="position:absolute;top:${top}px;left:0;right:0;border-top:0.5px solid var(--border);pointer-events:none"></div>`;
      if (h < _AG_H_FIN) {
        html += `<div style="position:absolute;top:${top + _AG_PX_H / 2}px;left:0;right:0;border-top:0.5px dashed rgba(128,128,128,.15);pointer-events:none"></div>`;
      }
    }

    const agrupados = _agAgruparSolapados(ots);
    agrupados.forEach(({ ot, col, total }) => {
      html += _agEventBlockHtml(ot, col, total, false);
    });

    if (esHoy) html += _agLineaRojaHtml();
    html += '</div>';
  });

  html += '</div>';
  return html;
}

// ===== BLOQUE DE EVENTO OT (drag, colores, tooltip) =====
function _agEventBlockHtml(ot, col, totalCols, anchoCompleto) {
  const hora = (ot.horaCita || '09:00').replace(/\./g, ':');
  const [hh, mm] = hora.split(':').map(Number);
  if (isNaN(hh) || isNaN(mm)) return '';
  const startMin = hh * 60 + mm - _AG_H_INI * 60;
  if (startMin < 0 || startMin > (_AG_H_FIN - _AG_H_INI) * 60) return '';
  const durMin = _agTiempoMinutos(ot);
  const top    = Math.round(startMin * _AG_PX_MIN);
  const height = Math.max(22, Math.round(durMin * _AG_PX_MIN));
  const pct    = anchoCompleto ? 1 : 1 / totalCols;
  const left   = anchoCompleto ? 2 : col * (100 / totalCols) + 0.5;
  const right  = anchoCompleto ? 2 : (totalCols - col - 1) * (100 / totalCols) + 0.5;
  const stylePos = anchoCompleto
    ? `top:${top}px;left:2px;right:2px;height:${height}px`
    : `top:${top}px;left:${left.toFixed(1)}%;right:${right.toFixed(1)}%;height:${height}px`;

  const colorEstado = agendaGetColorEstado(ot.estado);
  const colorTec    = agendaGetColorTecnico(ot.tecnico);
  const overloaded  = _agTecnicoOverloaded(ot.tecnico, ot.fechaCita);

  let extraStyle = `background:${colorEstado};border-left:4px solid ${colorTec};`;
  if (overloaded) extraStyle += 'box-shadow:0 0 0 1px #ef4444,0 1px 3px rgba(239,68,68,.3);';

  return `<div draggable="true" ondragstart="agendaDragStart(event,'${ot.id}')" ondragend="agendaDragEnd(event)"
    onclick="agAbrirOT('${ot.id}')"
    onmouseover="agendaShowTooltip(event,'${ot.id}')" onmouseout="agendaHideTooltip()"
    class="ot-block"
    style="position:absolute;${stylePos};${extraStyle}border-radius:3px;padding:2px 4px;cursor:grab;overflow:hidden;z-index:2;box-shadow:0 1px 3px rgba(0,0,0,.25)">
    <div style="font-size:9px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3">${ot.id} ${ot.clienteNombre || ''}</div>
    ${height > 32 ? `<div style="font-size:8px;color:rgba(255,255,255,.85);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ot.servicio || ''}</div>` : ''}
    ${height > 46 ? `<div style="font-size:8px;color:rgba(255,255,255,.75)">${ot.tecnico || ''}</div>` : ''}
  </div>`;
}

// ===== AGRUPAR SOLAPADOS =====
function _agAgruparSolapados(ots) {
  const eventos = ots.map(ot => {
    const hora = (ot.horaCita || '09:00').replace(/\./g, ':');
    const [hh, mm] = hora.split(':').map(Number);
    const start = (isNaN(hh) ? 9 : hh) * 60 + (isNaN(mm) ? 0 : mm);
    const dur   = _agTiempoMinutos(ot);
    return { ot, start, end: start + dur, col: 0, total: 1 };
  }).sort((a, b) => a.start - b.start);
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

// ===== HEADER DÍAS =====
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
function _agRenderMes() {
  const el = document.getElementById('ag-mes-grid');
  if (!el) return;
  const anio = _agFechaRef.getFullYear();
  const mes  = _agFechaRef.getMonth();
  const hoy  = _agFechaKey(new Date());
  const primerDia   = new Date(anio, mes, 1);
  const ultimoDia   = new Date(anio, mes + 1, 0);
  const dowPrimero  = primerDia.getDay();
  const offsetLunes = dowPrimero === 0 ? 6 : dowPrimero - 1;
  const start       = new Date(primerDia);
  start.setDate(primerDia.getDate() - offsetLunes);

  let html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);border-bottom:0.5px solid var(--border)">';
  ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].forEach(d =>
    html += `<div style="text-align:center;padding:7px 0;font-size:10px;font-weight:500;color:var(--text-muted)">${d}</div>`
  );
  html += '</div><div style="display:grid;grid-template-columns:repeat(7,1fr)">';

  // Pre-calcular ocupación para todo el mes
  const ocupMap = {};
  const cur2 = new Date(start);
  while (cur2 <= ultimoDia || cur2.getDay() !== 1) {
    const k = _agFechaKey(cur2);
    const otsDia = _agOtsDelDia(cur2);
    const totalMin = otsDia.reduce((s, o) => s + _agTiempoMinutos(o), 0);
    ocupMap[k] = { pct: otsDia.length ? Math.min(100, Math.round((totalMin / 480) * 100)) : 0, count: otsDia.length };
    cur2.setDate(cur2.getDate() + 1);
  }

  const cur = new Date(start);
  let semanas = 0;
  while ((cur <= ultimoDia || cur.getDay() !== 1) && semanas < 7) {
    const key    = _agFechaKey(cur);
    const esMes  = cur.getMonth() === mes;
    const esHoy  = key === hoy;
    const diaN   = cur.getDate();
    const oc     = ocupMap[key] || { pct: 0, count: 0 };
    const bg     = oc.count ? `${agendaGetColorSemaforo(oc.pct)}22` : 'transparent';
    const dotCol = agendaGetColorSemaforo(oc.pct);

    html += `<div onclick="agNavDia('${key}')" style="min-height:72px;border-right:0.5px solid var(--border);border-bottom:0.5px solid var(--border);padding:3px;cursor:pointer;${!esMes ? 'opacity:.3' : ''}">`;
    html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">`;
    html += `<div style="font-size:10px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:50%;${esHoy ? 'background:var(--text-accent);color:#fff;font-weight:700' : 'color:var(--text-primary)'}">${diaN}</div>`;
    if (oc.count) {
      html += `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${dotCol}"></span>`;
    }
    html += `</div>`;
    const otsDia = _agOtsDelDia(cur);
    otsDia.slice(0, 2).forEach(ot => {
      const c  = agendaGetColorEstado(ot.estado);
      const ct = agendaGetColorTecnico(ot.tecnico);
      html += `<div onmouseover="agendaShowTooltip(event,'${ot.id}')" onmouseout="agendaHideTooltip()" onclick="event.stopPropagation();agAbrirOT('${ot.id}')" style="background:${c};color:#fff;font-size:7px;border-radius:2px;padding:1px 3px;margin-bottom:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;border-left:2px solid ${ct}">${ot.horaCita || ''} ${ot.servicio || ot.id}</div>`;
    });
    if (otsDia.length > 2) html += `<div style="font-size:7px;color:var(--text-muted)">+${otsDia.length - 2}</div>`;
    html += '</div>';
    cur.setDate(cur.getDate() + 1);
    if (cur.getDay() === 1) semanas++;
  }
  html += '</div>';
  el.innerHTML = html;
}

// ===== MINI CALENDARIO (columna derecha) =====
function _agMiniRef() {
  if (!_agMesMini) _agMesMini = { anio: _agFechaRef.getFullYear(), mes: _agFechaRef.getMonth() };
  return _agMesMini;
}

function agMiniCalendar() {
  const el = document.getElementById('ag-mini-grid');
  const label = document.getElementById('ag-mini-label');
  if (!el) return;
  const ref = _agMiniRef();
  const { anio, mes } = ref;
  if (label) label.textContent = `${_AG_MESES[mes]} ${anio}`;

  const hoy = _agFechaKey(new Date());
  const primerDia   = new Date(anio, mes, 1);
  const ultimoDia   = new Date(anio, mes + 1, 0);
  const dowPrimero  = primerDia.getDay();
  const offsetLunes = dowPrimero === 0 ? 6 : dowPrimero - 1;
  const start       = new Date(primerDia);
  start.setDate(primerDia.getDate() - offsetLunes);

  // Ocupación pre-calculada
  const ocupMap = {};
  const cur2 = new Date(start);
  while (cur2 <= ultimoDia || cur2.getDay() !== 1) {
    const k = _agFechaKey(cur2);
    const otsDia = _agOtsDelDia(cur2);
    const totalMin = otsDia.reduce((s, o) => s + _agTiempoMinutos(o), 0);
    ocupMap[k] = { pct: otsDia.length ? Math.min(100, Math.round((totalMin / 480) * 100)) : 0 };
    cur2.setDate(cur2.getDate() + 1);
  }

  let html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center">';
  ['L','M','X','J','V','S','D'].forEach(d =>
    html += `<div style="font-size:9px;font-weight:500;color:var(--text-muted);padding:2px 0">${d}</div>`
  );

  const cur = new Date(start);
  let semanas = 0;
  while ((cur <= ultimoDia || cur.getDay() !== 1) && semanas < 7) {
    const key   = _agFechaKey(cur);
    const esMes = cur.getMonth() === mes;
    const esHoy = key === hoy;
    const oc    = ocupMap[key] || { pct: 0 };
    const bg    = esMes && oc.pct > 0 ? `${agendaGetColorSemaforo(oc.pct)}44` : '';
    const fontW = esHoy ? '700' : '400';

    html += `<div onclick="agNavDia('${key}')" style="cursor:pointer;padding:2px 0;border-radius:4px;${bg};font-size:10px;font-weight:${fontW};color:${!esMes ? 'var(--text-muted)' : esHoy ? 'var(--text-accent)' : 'var(--text-primary)'}">${cur.getDate()}</div>`;
    cur.setDate(cur.getDate() + 1);
    if (cur.getDay() === 1) semanas++;
  }
  html += '</div>';
  el.innerHTML = html;
}

function agMiniPrev() {
  const ref = _agMiniRef();
  ref.mes--;
  if (ref.mes < 0) { ref.mes = 11; ref.anio--; }
  agMiniCalendar();
}

function agMiniNext() {
  const ref = _agMiniRef();
  ref.mes++;
  if (ref.mes > 11) { ref.mes = 0; ref.anio++; }
  agMiniCalendar();
}

// ===== DRAG & DROP =====
function agendaDragStart(event, otId) {
  _agDragData = { id: otId };
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', otId);
  event.target.style.opacity = '0.5';
  event.target.classList.add('ag-dragging');
}

function agendaDragEnd(event) {
  event.target.style.opacity = '';
  event.target.classList.remove('ag-dragging');
}

function agDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function agendaDrop(event, fechaKey) {
  event.preventDefault();
  if (!_agDragData) return;
  const otId = _agDragData.id;
  _agDragData = null;

  const ots  = APP.lsGet('mp_ots', []);
  const ot   = ots.find(o => o.id === otId);
  if (!ot) return;

  const rect = event.currentTarget.getBoundingClientRect();
  const y    = event.clientY - rect.top;
  const totalMinsVisible = (_AG_H_FIN - _AG_H_INI) * 60;
  const minsFromTop = Math.round((y / _AG_TOTAL_PX) * totalMinsVisible);
  const hh = Math.floor(minsFromTop / 60) + _AG_H_INI;
  const mm = Math.round((minsFromTop % 60) / 15) * 15;

  if (hh < _AG_H_INI || hh >= _AG_H_FIN) {
    alert('La hora está fuera del horario laboral (' + String(_AG_H_INI).padStart(2,'0') + ':00–' + String(_AG_H_FIN).padStart(2,'0') + ':00)');
    return;
  }

  const nuevaHora = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  const nuevoInicio = hh * 60 + mm;
  const nuevoFin    = nuevoInicio + _agTiempoMinutos(ot);

  // Validar conflicto: misma fecha, mismo técnico, horario solapado, distinta OT
  const conflicto = ots.some(o => {
    if (o.id === otId || o.fechaCita !== fechaKey) return false;
    if (String(o.tecnico) !== String(ot.tecnico) && String(o.id_tecnico_asignado) !== String(ot.tecnico)) return false;
    if (o.estado === 'cerrado' || o.estado === 'cancelado' || o.estado === 'cancelada') return false;
    const [oh, om] = (o.horaCita || '09:00').split(':').map(Number);
    const oInicio = oh * 60 + om;
    const oFin    = oInicio + _agTiempoMinutos(o);
    return nuevoInicio < oFin && oInicio < nuevoFin;
  });

  if (conflicto) {
    alert('⚠ El técnico ya tiene una OT agendada en ese horario. Revisa la agenda.');
    return;
  }

  agendaOnDragOT(otId, fechaKey, nuevaHora);
  _agRender();
}

function agendaOnDragOT(otId, nuevaFecha, nuevaHora) {
  const ots = APP.lsGet('mp_ots', []);
  const idx = ots.findIndex(o => o.id === otId);
  if (idx === -1) return;
  ots[idx].fechaCita = nuevaFecha;
  ots[idx].horaCita  = nuevaHora;
  APP.lsSet('mp_ots', ots);
}

// ===== TOOLTIP =====
function agendaShowTooltip(event, id_ot) {
  agendaHideTooltip();
  _agTooltipTimer = setTimeout(() => {
    const ots = APP.lsGet('mp_ots', []);
    const ot  = ots.find(o => o.id === id_ot);
    if (!ot) return;
    const durMin = _agTiempoMinutos(ot);
    const finH   = Math.floor((durMin + (parseInt(ot.horaCita?.split(':')[0]||9)*60 + parseInt(ot.horaCita?.split(':')[1]||0))) / 60);
    const finM   = (durMin + (parseInt(ot.horaCita?.split(':')[0]||9)*60 + parseInt(ot.horaCita?.split(':')[1]||0))) % 60;
    const el = document.createElement('div');
    el.id = 'ag-tooltip';
    el.innerHTML = `<div style="font-size:11px;line-height:1.6">
      <div>🔧 <strong>${ot.clienteNombre || '—'}</strong></div>
      <div>📋 ${ot.servicio || '—'}</div>
      <div>⏱ ${durMin}min | ${ot.horaCita || '—'}-${String(finH).padStart(2,'0')}:${String(finM).padStart(2,'0')}</div>
      <div>👨‍🔧 ${ot.tecnico || '—'}</div>
    </div>`;
    el.style.cssText = 'position:fixed;z-index:9999;background:var(--surface-2);border:0.5px solid var(--border);border-radius:6px;padding:8px 12px;box-shadow:0 4px 12px rgba(0,0,0,.2);pointer-events:none;font-size:11px;max-width:260px';
    document.body.appendChild(el);
    const r = el.getBoundingClientRect();
    let l = event.clientX + 12, t = event.clientY + 12;
    if (l + r.width > window.innerWidth)  l = event.clientX - r.width - 12;
    if (t + r.height > window.innerHeight) t = event.clientY - r.height - 12;
    el.style.left = l + 'px'; el.style.top = t + 'px';
    _agTooltipEl = el;
  }, 500);
}

function agendaHideTooltip() {
  if (_agTooltipTimer) { clearTimeout(_agTooltipTimer); _agTooltipTimer = null; }
  if (_agTooltipEl) { _agTooltipEl.remove(); _agTooltipEl = null; }
}

// ===== LÍNEA ROJA =====
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
  const now  = new Date();
  const mins = now.getHours() * 60 + now.getMinutes() - _AG_H_INI * 60;
  const offset = Math.round(mins * _AG_PX_MIN);
  wrap.scrollTop = Math.max(0, offset - 120);
}

// ===== SEMÁFORO DE CAPACIDAD (hoy) =====
function _agRenderSemaforoHoy() {
  const dotEl   = document.getElementById('ag-semaforo-dot');
  const labelEl = document.getElementById('ag-semaforo-label');
  if (!dotEl || !labelEl) return;
  const hoy = new Date();
  const pct = agendaCalcOcupacion(hoy, '');
  const color = agendaGetColorSemaforo(pct);
  dotEl.style.background = color;
  labelEl.textContent = pct === 0
    ? 'Hoy: sin OTs'
    : `Hoy: ${pct}% ocupado`;
  labelEl.style.color = color;
}

// ===== HELPERS =====
function _agFechaKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
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

// ===== GOOGLE CALENDAR INTEGRATION (sin cambios) =====
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
  const todos = [...new Set(APP.lsGet('mp_ots', []).map(o => o.tecnico).filter(Boolean))];
  const idx   = todos.indexOf(tecnico);
  return String((idx % 11) + 1);
}
