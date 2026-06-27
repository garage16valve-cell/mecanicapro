// ===== MÓDULO: TALLER (OT, Clientes, Wiki) =====
function init_taller() {
  // Sembrar datos demo en localStorage si la BD de patentes está vacía
  const db = APP.lsGet('mp_patentes', null);
  if (!db) {
    APP.lsSet('mp_patentes', {
      'ABCD12': { marca:'Toyota',     modelo:'Corolla',   anio:'2022', motor:'1.8L Hybrid 2ZR-FXE', comb:'Híbrido',  tipo:'Sedán',     vin:'JTDL9RFU4N3088412', nmotor:'2ZR-FXE-K3820541' },
      'KGSJK9': { marca:'Kia',        modelo:'Sportage',  anio:'2023', motor:'2.0L GDI MPI G4KD',   comb:'Bencina',  tipo:'SUV',       vin:'KNAPM815XN7394820', nmotor:'G4KD-N1052038'    },
      'GHJK45': { marca:'Volkswagen', modelo:'Golf',      anio:'2021', motor:'1.4L TSI CZEA',        comb:'Bencina',  tipo:'Hatchback', vin:'WVWZZZ1KZMW123456', nmotor:'CZEA-B2019301'    },
      'MNOP78': { marca:'Ford',       modelo:'F-150',     anio:'2020', motor:'3.5L EcoBoost V6',     comb:'Bencina',  tipo:'Pick-up',   vin:'1FTFW1ET1LFA12345', nmotor:'35EB-C1082930'    },
      'BCDF34': { marca:'Honda',      modelo:'Civic',     anio:'2021', motor:'1.5L VTEC Turbo L15B7',comb:'Bencina',  tipo:'Sedán',     vin:'2HGFC2F59MH552143', nmotor:'L15B7-0183920'    },
    });
  }
  // El pg-ot necesita position:relative para que el overlay absoluto funcione
  const pgOt = document.getElementById('pg-ot');
  if (pgOt) pgOt.style.position = 'relative';
  renderListaOTs();
}

// Pre-cotizaciones por marca
const PRECOTS = {
  Toyota:     { items:'Filtro aceite $4.500 · Aceite 5W-30 4L $24.800 · Filtro aire $12.000 · M.obra $35.000', total:'$76.300', h:'Dado 17mm · Torquímetro 25 Nm · Embudo' },
  Kia:        { items:'Filtro aceite $5.200 · Aceite 5W-40 4L $26.000 · Filtro aire $14.500 · M.obra $35.000', total:'$80.700', h:'Dado 17mm · Llave Torx T30' },
  Volkswagen: { items:'Filtro aceite $7.800 · Aceite 5W-40 4L $29.000 · Filtro aire $16.000 · M.obra $40.000', total:'$92.800', h:'Torx T45 · Dado 21mm · Removedor filtro' },
  Ford:       { items:'Filtro aceite $6.500 · Aceite 5W-20 5L $31.000 · Filtro aire $13.000 · M.obra $38.000', total:'$88.500', h:'Dado 15mm · Torquímetro · Extractor' },
  Honda:      { items:'Filtro aceite $5.800 · Aceite 0W-20 4L $28.000 · Filtro aire $13.500 · M.obra $35.000', total:'$82.300', h:'Dado 17mm · Torquímetro 25 Nm' },
};

// ===== BD LOCAL DE PATENTES =====
function _patGet(pat) {
  const db = APP.lsGet('mp_patentes', {});
  return db[pat] || null;
}

function _patSave(pat, datos) {
  if (!pat || !datos) return;
  const db = APP.lsGet('mp_patentes', {});
  db[pat] = {
    marca:  datos.marca  || '—',
    modelo: datos.modelo || '—',
    anio:   datos.anio   || '—',
    motor:  datos.motor  || '—',
    comb:   datos.comb   || '—',
    tipo:   datos.tipo   || '—',
    vin:    datos.vin    || '—',
    nmotor: datos.nmotor || '—',
  };
  APP.lsSet('mp_patentes', db);
}

// ===== ESTADO DE CITA =====
const ESTADOS = {
  agendado:   { emoji:'📅', label:'Agendado',        color:'var(--text-muted)' },
  llego:      { emoji:'✅', label:'Cliente llegó',    color:'var(--text-success)' },
  nollego:    { emoji:'❌', label:'Cliente no llegó', color:'var(--text-danger)' },
  reagendar:  { emoji:'📅', label:'Reagendado',       color:'#d97706' },
  cancelo:    { emoji:'🚫', label:'Cliente canceló',  color:'var(--text-danger)' },
  cotizacion: { emoji:'📋', label:'Cotización',       color:'var(--text-accent)' },
};

let _estadoActual = 'agendado';
let _historialTemp = []; // entradas antes de crear la OT

function toggleEstadoDropdown() {
  const dd = document.getElementById('estado-dropdown');
  if (!dd) return;
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  // Cerrar al hacer click fuera
  if (dd.style.display === 'block') {
    setTimeout(() => {
      const cerrar = e => { if (!dd.contains(e.target)) { dd.style.display = 'none'; document.removeEventListener('click', cerrar); } };
      document.addEventListener('click', cerrar);
    }, 0);
  }
}

function seleccionarEstado(codigo) {
  const dd = document.getElementById('estado-dropdown');
  if (dd) dd.style.display = 'none';

  const est = ESTADOS[codigo];
  if (!est) return;

  _estadoActual = codigo;

  // Actualizar badge
  const badge = document.getElementById('estado-cita-badge');
  if (badge) {
    badge.textContent = est.emoji + ' ' + est.label;
    badge.style.color = est.color;
    badge.style.borderColor = est.color;
  }

  // Mostrar/ocultar panel de reagenda
  const rp = document.getElementById('reagendar-panel');
  if (rp) rp.style.display = codigo === 'reagendar' ? 'block' : 'none';

  // Registrar en historial temporal
  const ahora = new Date();
  const entrada = {
    estado: codigo,
    label: est.label,
    emoji: est.emoji,
    ts: ahora.toISOString(),
    hora: ahora.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' }),
    fecha: ahora.toLocaleDateString('es-CL'),
  };

  // Si es llegó, registrar hora de entrada exacta
  if (codigo === 'llego') entrada.horaEntrada = entrada.hora;

  _historialTemp.push(entrada);
  _renderHistorialTemp();

  // Acciones especiales
  if (codigo === 'llego') {
    _setPatStatus('ok', `✅ Cliente llegó — entrada registrada a las ${entrada.hora}`);
  } else if (codigo === 'nollego') {
    _setPatStatus('error', '❌ Inasistencia registrada a las ' + entrada.hora);
  } else if (codigo === 'cancelo') {
    _setPatStatus('error', '🚫 Cancelación registrada a las ' + entrada.hora);
  } else if (codigo === 'cotizacion') {
    _setPatStatus('ok', '📋 Modo cotización activado');
  }
}

function _renderHistorialTemp() {
  const wrap = document.getElementById('historial-estados');
  const lista = document.getElementById('historial-lista');
  if (!wrap || !lista) return;
  if (_historialTemp.length === 0) { wrap.style.display = 'none'; return; }

  wrap.style.display = 'block';
  lista.innerHTML = _historialTemp.map(e =>
    `<div style="display:flex;gap:8px;align-items:flex-start;padding:4px 0;border-bottom:0.5px solid var(--border)">
      <span style="font-size:13px">${e.emoji}</span>
      <div style="flex:1">
        <span style="font-weight:500">${e.label}</span>
        <span style="color:var(--text-muted);margin-left:6px;font-size:10px">${e.fecha} ${e.hora}</span>
        ${e.motivo ? `<div style="font-size:10px;color:var(--text-muted)">${e.motivo}</div>` : ''}
      </div>
    </div>`
  ).join('');
}

// ===== CONSULTA DE PATENTE =====
function setPatente(pat) {
  const i = document.getElementById('pat-in');
  if (i) { i.value = pat; consultarPatente(pat); }
}

function consultarPatente(val) {
  const pat = (typeof val === 'string' ? val : '')
    .toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (pat.length < 4) {
    _setPatStatus('error', 'Ingresa al menos 4 caracteres.');
    return;
  }

  const pi = document.getElementById('pat-in');

  // 1. Buscar en BD local (localStorage)
  const datos = _patGet(pat);

  if (datos) {
    // ── Encontrado en BD local: mostrar al instante ──
    if (pi) { pi.style.borderColor = 'var(--fill-success)'; pi.style.background = 'var(--bg-success)'; }
    _setPatStatus('ok', `Vehículo encontrado — <strong>${pat}</strong> <span style="font-size:9px;opacity:.6">(base local)</span>`);
    _llenarVehiculo(datos);
    // Desbloquear campos para permitir correcciones
    const vd = document.getElementById('vehiculo-datos');
    if (vd) {
      vd.style.display = 'block';
      vd.querySelectorAll('input[readonly]').forEach(el => el.removeAttribute('readonly'));
    }
    const cd = document.getElementById('cliente-datos');
    if (cd) cd.style.display = 'block';
    _mostrarPreCot(datos);
    _checkClienteExistente(pat);

  } else {
    // 2. No encontrado: mostrar formulario manual
    if (pi) { pi.style.borderColor = 'var(--border-warning)'; pi.style.background = 'var(--surface-1)'; }
    _setPatStatus('warn',
      `Patente <strong>${pat}</strong> no está en la base local. ` +
      `Ingresa los datos del vehículo — quedarán guardados para la próxima vez.`
    );

    // Mostrar sección vehículo con campos vacíos y desbloqueados
    const vd = document.getElementById('vehiculo-datos');
    if (vd) {
      vd.style.display = 'block';
      vd.querySelectorAll('input').forEach(el => { el.removeAttribute('readonly'); el.value = ''; });
      const vinEl = vd.querySelector('#v-vin'); if (vinEl) vinEl.textContent = '—';
    }
    const cd = document.getElementById('cliente-datos');
    if (cd) cd.style.display = 'block';
    const pb = document.getElementById('precot-box');
    if (pb) pb.style.display = 'none';
  }
}

function _setPatStatus(type, msg) {
  const st = document.getElementById('pat-status');
  if (!st) return;
  const icons = {
    ok:   '<i class="ti ti-circle-check" style="font-size:12px;vertical-align:-2px;margin-right:3px"></i>',
    warn: '<i class="ti ti-info-circle"  style="font-size:12px;vertical-align:-2px;margin-right:3px"></i>',
    error:'<i class="ti ti-alert-circle" style="font-size:12px;vertical-align:-2px;margin-right:3px"></i>',
  };
  const colors = { ok:'var(--text-success)', warn:'var(--text-warning, #d97706)', error:'var(--text-danger)' };
  st.style.color = colors[type] || 'var(--text-muted)';
  st.innerHTML   = (icons[type] || '') + msg;
}

function _llenarVehiculo(d) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('v-marca',  d.marca);
  set('v-modelo', d.modelo);
  set('v-anio',   d.anio);
  set('v-motor',  d.motor);
  set('v-comb',   d.comb);
  set('v-tipo',   d.tipo);
  set('v-nmotor', d.nmotor);
  const vin = document.getElementById('v-vin');
  if (vin) vin.textContent = d.vin || '—';
}

function _mostrarPreCot(d) {
  const pc = PRECOTS[d.marca] || {
    items: 'Filtro aceite $4.500 · Aceite $22.000 · M.obra $35.000',
    total: '$61.500',
    h:     'Dado 17mm',
  };
  const pt = document.getElementById('precot-text');
  if (pt) pt.innerHTML = `<strong>Pre-cotización (${d.marca} ${d.modelo}):</strong> ${pc.items}. <strong>Total est.: ${pc.total}</strong>`;

  const wt = document.getElementById('wiki-text');
  if (wt) wt.innerHTML = `<strong>Wiki técnica:</strong> Herramientas sugeridas para ${d.marca} ${d.modelo}: ${pc.h}`;

  const proveedores = APP.lsGet('mp_proveedores', [
    { nombre:'Repuestos Chile Ltda.', vendedor:'Carlos Vega',  pais:'+56', wzp:'9 4521 3322', marcas:['Toyota','Hyundai','Kia','Nissan'] },
    { nombre:'AutoPartes SUR',        vendedor:'Ana Torres',   pais:'+56', wzp:'9 8821 4400', marcas:['Chevrolet','Ford','Jeep'] },
    { nombre:'BREMBO Chile',          vendedor:'Roberto Díaz', pais:'+56', wzp:'9 6633 2211', marcas:['BMW','Mercedes-Benz','Volkswagen'] },
  ]);
  const pSug = proveedores.find(p => Array.isArray(p.marcas) && p.marcas.includes(d.marca));
  const ps  = document.getElementById('prov-sug');
  const pst = document.getElementById('prov-sug-text');
  if (pSug && ps && pst) {
    const num = (pSug.pais || '+56').replace('+', '') + (pSug.wzp || '').replace(/\D/g, '');
    pst.innerHTML = `<strong>Proveedor para ${d.marca}:</strong> ${pSug.nombre} · ${pSug.vendedor} · <button class="btn bpw" style="font-size:10px;padding:2px 7px;margin-left:4px" onclick="window.open('https://wa.me/${num}','_blank')"><i class="ti ti-brand-whatsapp"></i>WhatsApp</button>`;
    ps.style.display = 'flex';
  } else if (ps) {
    ps.style.display = 'none';
  }

  const pb = document.getElementById('precot-box');
  if (pb) pb.style.display = 'block';
}

function _checkClienteExistente(pat) {
  const clientes = APP.lsGet('mp_clientes', []);
  const cli = clientes.find(c => Array.isArray(c.patentes) && c.patentes.includes(pat));
  if (!cli) return;
  const fill = (id, val) => { const el = document.getElementById(id); if (el && !el.value) el.value = val || ''; };
  fill('c-nombre', cli.nombre);
  fill('c-rut',    cli.rut);
  fill('c-wz',     cli.wz);
  fill('c-mail',   cli.mail);
  _setPatStatus('ok', `Vehículo encontrado — cliente existente: <strong>${cli.nombre}</strong>`);
}

// ===== CREAR OT =====
function crearOT() {
  const nombre = (document.getElementById('c-nombre')?.value || '').trim();
  if (!nombre) { alert('Ingresa el nombre del cliente.'); return; }

  const pat    = (document.getElementById('pat-in')?.value    || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const rut    = (document.getElementById('c-rut')?.value     || '').trim();
  const wz     = (document.getElementById('c-wz')?.value      || '').trim();
  const mail   = (document.getElementById('c-mail')?.value    || '').trim();
  const km     =  document.getElementById('c-km')?.value        || '';
  const tecnico=  document.getElementById('c-tec')?.value       || '';
  const serv   =  document.getElementById('c-serv')?.value      || '';
  const notas  =  document.getElementById('c-notas')?.value     || '';
  const fecha  =  document.getElementById('c-fecha')?.value     || '';
  const hora   =  document.getElementById('c-hora')?.value      || '';

  // Si hay reagenda pendiente, capturar nueva fecha/hora y motivo
  if (_estadoActual === 'reagendar') {
    const fNueva = document.getElementById('c-fecha-nueva')?.value || '';
    const hNueva = document.getElementById('c-hora-nueva')?.value  || '';
    const motivo = document.getElementById('c-reagendar-motivo')?.value || '';
    const last = _historialTemp[_historialTemp.length - 1];
    if (last && last.estado === 'reagendar') {
      last.nuevaFecha = fNueva;
      last.nuevaHora  = hNueva;
      last.motivo     = motivo;
    }
  }

  // Primera entrada del historial: creación de la OT
  const ahora = new Date();
  const entradaCreacion = {
    estado: 'creado',
    label:  'OT creada',
    emoji:  '📋',
    ts:     ahora.toISOString(),
    hora:   ahora.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' }),
    fecha:  ahora.toLocaleDateString('es-CL'),
  };
  const historial = [entradaCreacion, ..._historialTemp];
  const marca  = (document.getElementById('v-marca')?.value   || '').trim();
  const modelo = (document.getElementById('v-modelo')?.value  || '').trim();
  const anio   = (document.getElementById('v-anio')?.value    || '').trim();
  const motor  = (document.getElementById('v-motor')?.value   || '').trim();
  const comb   = (document.getElementById('v-comb')?.value    || '').trim();
  const tipo   = (document.getElementById('v-tipo')?.value    || '').trim();
  const nmotor = (document.getElementById('v-nmotor')?.value  || '').trim();
  const vin    =  document.getElementById('v-vin')?.textContent?.trim() || '—';

  // Guardar datos del vehículo en BD local de patentes
  if (pat && marca) {
    _patSave(pat, { marca, modelo, anio, motor, comb, tipo, vin, nmotor });
  }

  // Auto-crear o actualizar cliente (dedup por RUT o patente)
  const clientes = APP.lsGet('mp_clientes', []);
  let cli = clientes.find(c =>
    (rut && c.rut === rut) ||
    (pat && Array.isArray(c.patentes) && c.patentes.includes(pat))
  );
  if (!cli) {
    cli = {
      id: 'cli-' + Date.now(), nombre, rut, wz, mail, km,
      patentes: pat ? [pat] : [],
      otIds: [],
      creado: new Date().toISOString(),
    };
    clientes.push(cli);
  } else {
    cli.nombre = nombre;
    if (rut)  cli.rut  = rut;
    if (wz)   cli.wz   = wz;
    if (mail) cli.mail = mail;
    if (pat && !cli.patentes.includes(pat)) cli.patentes.push(pat);
  }

  // Crear OT
  const ots = APP.lsGet('mp_ots', []);
  const num = Math.max(41, ...ots.map(o => o.num || 0)) + 1;
  const id  = '#' + String(num).padStart(4, '0');
  const ot  = {
    id, num, patente: pat, marca, modelo, anio, motor, comb, tipo, vin, nmotor,
    clienteId: cli.id, clienteNombre: nombre, rut, wz, mail, km,
    tecnico, servicio: serv, notas,
    fechaCita: fecha, horaCita: hora,
    estadoCita: _estadoActual,
    historial,
    estado: _estadoActual === 'llego' ? 'en-proceso'
          : _estadoActual === 'nollego' || _estadoActual === 'cancelo' ? 'cerrado'
          : _estadoActual === 'cotizacion' ? 'cotizacion'
          : 'agendado',
    creado: new Date().toISOString(),
  };
  ots.push(ot);
  cli.otIds = [...(cli.otIds || []), id];

  APP.lsSet('mp_ots', ots);
  APP.lsSet('mp_clientes', clientes);

  alert(`✓ OT ${id} creada\nVehículo: ${marca} ${modelo} ${anio}\nCliente: ${nombre}\nTécnico: ${tecnico}`);
  _resetFormOT();
}

function _resetFormOT() {
  ['c-nombre','c-rut','c-wz','c-mail','c-notas',
   'c-fecha','c-hora','c-fecha-nueva','c-hora-nueva','c-reagendar-motivo'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const km = document.getElementById('c-km'); if (km) km.value = '';
  ['v-marca','v-modelo','v-anio','v-motor','v-comb','v-tipo','v-nmotor'].forEach(id => {
    const el = document.getElementById(id); if (el) { el.value = ''; el.setAttribute('readonly', ''); }
  });
  const vin = document.getElementById('v-vin'); if (vin) vin.textContent = '—';
  const pi  = document.getElementById('pat-in');
  if (pi) { pi.value = ''; pi.style.borderColor = ''; pi.style.background = ''; }

  // Reset estado de cita
  _estadoActual  = 'agendado';
  _historialTemp = [];
  const badge = document.getElementById('estado-cita-badge');
  if (badge) { badge.textContent = '📅 Agendado'; badge.style.color = ''; badge.style.borderColor = ''; }
  const rp = document.getElementById('reagendar-panel');    if (rp) rp.style.display = 'none';
  const hs = document.getElementById('historial-estados');  if (hs) hs.style.display = 'none';
  const hl = document.getElementById('historial-lista');    if (hl) hl.innerHTML = '';

  const vd = document.getElementById('vehiculo-datos'); if (vd) vd.style.display = 'none';
  const cd = document.getElementById('cliente-datos');  if (cd) cd.style.display  = 'none';
  const pb = document.getElementById('precot-box');     if (pb) pb.style.display  = 'none';

  _setPatStatus('ok', 'Ingresa la patente para auto-completar datos del vehículo.');
  const st = document.getElementById('pat-status');
  if (st) st.style.color = 'var(--text-muted)';
}

// ===== LISTA DE OTs =====
const OT_ESTADO_CSS = {
  agendado:   's-wait',  'en-proceso': 's-prog',
  cerrado:    's-done',  cotizacion:   's-crit',
};
const OT_ESTADO_LABEL = {
  agendado:   'Agendado',    'en-proceso': 'En proceso',
  cerrado:    'Cerrado',     cotizacion:   'Cotización',
};

function renderListaOTs() {
  const tbody = document.getElementById('ots-tbody');
  const cnt   = document.getElementById('ots-count');
  if (!tbody) return;

  const ots = APP.lsGet('mp_ots', []);
  if (cnt) cnt.textContent = ots.length + ' orden' + (ots.length !== 1 ? 'es' : '');

  if (ots.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;font-size:11px">No hay órdenes de trabajo. Crea la primera usando el formulario.</td></tr>';
    return;
  }

  tbody.innerHTML = [...ots].reverse().map(o => {
    const css   = OT_ESTADO_CSS[o.estado]   || 's-wait';
    const label = OT_ESTADO_LABEL[o.estado] || o.estado;
    const cita  = o.fechaCita ? o.fechaCita + (o.horaCita ? ' ' + o.horaCita : '') : '—';
    return `<tr style="cursor:pointer" onclick="abrirDetalleOT('${o.id}')" onmouseover="this.style.background='var(--surface-1)'" onmouseout="this.style.background=''">
      <td style="color:var(--text-accent);font-weight:500">${o.id}</td>
      <td style="font-family:var(--font-mono);font-size:10px">${o.patente || '—'}</td>
      <td>${o.clienteNombre || '—'}</td>
      <td style="font-size:10px;color:var(--text-muted)">${cita}</td>
      <td><span class="st ${css}"><span class="dot"></span>${label}</span></td>
    </tr>`;
  }).join('');
}

// ===== VISTA DETALLE OT =====
let _otDetalleId  = null;
let _otEditando   = false;

function abrirDetalleOT(id) {
  const ots = APP.lsGet('mp_ots', []);
  const ot  = ots.find(o => o.id === id);
  if (!ot) return;

  _otDetalleId = id;
  _otEditando  = false;

  // Rellenar campos
  const s = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ''; };
  document.getElementById('det-titulo').textContent = 'OT ' + ot.id + ' — ' + (ot.patente || '') + ' · ' + (ot.marca || '') + ' ' + (ot.modelo || '') + ' ' + (ot.anio || '');
  s('det-nombre', ot.clienteNombre); s('det-rut',  ot.rut);
  s('det-wz',     ot.wz);           s('det-mail', ot.mail);
  s('det-km',     ot.km);
  const tec = document.getElementById('det-tec');
  if (tec) { tec.value = ot.tecnico || tec.options[0]?.value || ''; tec.disabled = true; }

  s('det-marca',  ot.marca);  s('det-modelo', ot.modelo);
  s('det-anio',   ot.anio);   s('det-motor',  ot.motor);
  s('det-comb',   ot.comb);   s('det-tipo',   ot.tipo);
  s('det-vin',    ot.vin);    s('det-nmotor', ot.nmotor);

  s('det-fecha', ot.fechaCita || '');
  s('det-hora',  ot.horaCita  || '');
  const serv = document.getElementById('det-serv');
  if (serv) { serv.value = ot.servicio || serv.options[0]?.value || ''; serv.disabled = true; }
  s('det-notas',     ot.notas     || '');
  s('det-valor',     ot.valor     || '');
  s('det-repuestos', ot.repuestos || '');

  // Campos readonly por defecto
  ['det-nombre','det-rut','det-wz','det-mail','det-km',
   'det-marca','det-modelo','det-anio','det-motor','det-comb','det-tipo','det-vin','det-nmotor',
   'det-fecha','det-hora','det-notas','det-valor','det-repuestos']
    .forEach(id => { const el = document.getElementById(id); if (el) el.setAttribute('readonly',''); });

  // Badge de estado
  _actualizarBadgeDet(ot.estadoCita || ot.estado || 'agendado');

  // Botones
  const be = document.getElementById('det-btn-editar');  if (be) { be.style.display = ''; be.innerHTML = '<i class="ti ti-edit"></i> Editar'; }
  const bg = document.getElementById('det-btn-guardar'); if (bg) bg.style.display = 'none';

  // Historial
  _renderHistorialDet(ot.historial || []);

  // Ocultar reagendar
  const rp = document.getElementById('det-reagendar-panel'); if (rp) rp.style.display = 'none';

  // Mostrar overlay
  document.getElementById('ot-detalle').style.display = 'block';
  document.getElementById('ot-detalle').scrollTop = 0;
}

function volverListaOT() {
  _otDetalleId = null;
  _otEditando  = false;
  document.getElementById('ot-detalle').style.display = 'none';
  renderListaOTs();
}

function _actualizarBadgeDet(codigo) {
  const est = ESTADOS[codigo] || ESTADOS['agendado'];
  const badge = document.getElementById('det-estado-badge');
  if (badge) {
    badge.textContent  = est.emoji + ' ' + est.label;
    badge.style.color  = est.color;
    badge.style.borderColor = est.color;
  }
}

function toggleEditarOT() {
  _otEditando = !_otEditando;
  const campos = ['det-nombre','det-rut','det-wz','det-mail','det-km',
    'det-marca','det-modelo','det-anio','det-motor','det-comb','det-tipo','det-vin','det-nmotor',
    'det-fecha','det-hora','det-notas','det-valor','det-repuestos'];

  campos.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (_otEditando) el.removeAttribute('readonly'); else el.setAttribute('readonly','');
  });
  const tec  = document.getElementById('det-tec');  if (tec)  tec.disabled  = !_otEditando;
  const serv = document.getElementById('det-serv'); if (serv) serv.disabled = !_otEditando;

  const be = document.getElementById('det-btn-editar');
  const bg = document.getElementById('det-btn-guardar');
  if (be) be.innerHTML = _otEditando ? '<i class="ti ti-x"></i> Cancelar' : '<i class="ti ti-edit"></i> Editar';
  if (bg) bg.style.display = _otEditando ? '' : 'none';
}

function guardarCambiosOT() {
  if (!_otDetalleId) return;
  const ots = APP.lsGet('mp_ots', []);
  const idx = ots.findIndex(o => o.id === _otDetalleId);
  if (idx < 0) return;

  const g = id => (document.getElementById(id)?.value || '').trim();
  const tec  = document.getElementById('det-tec');
  const serv = document.getElementById('det-serv');

  // Registrar cambios en historial
  const ahora = new Date();
  const entrada = {
    estado: 'editado', label: 'OT modificada', emoji: '✏️',
    ts:    ahora.toISOString(),
    hora:  ahora.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' }),
    fecha: ahora.toLocaleDateString('es-CL'),
    detalle: `Cliente: ${g('det-nombre')} · Vehículo: ${g('det-marca')} ${g('det-modelo')}`,
  };

  ots[idx] = {
    ...ots[idx],
    clienteNombre: g('det-nombre'), rut:  g('det-rut'),
    wz:            g('det-wz'),     mail: g('det-mail'),
    km:            g('det-km'),     tecnico: tec?.value  || ots[idx].tecnico,
    marca:         g('det-marca'),  modelo:  g('det-modelo'),
    anio:          g('det-anio'),   motor:   g('det-motor'),
    comb:          g('det-comb'),   tipo:    g('det-tipo'),
    vin:           g('det-vin'),    nmotor:  g('det-nmotor'),
    fechaCita:     g('det-fecha'),  horaCita: g('det-hora'),
    servicio:      serv?.value || ots[idx].servicio,
    notas:         g('det-notas'),
    valor:         g('det-valor'),
    repuestos:     g('det-repuestos'),
    historial: [...(ots[idx].historial || []), entrada],
  };

  APP.lsSet('mp_ots', ots);
  _otEditando = false;
  abrirDetalleOT(_otDetalleId); // refresca la vista
}

// --- Dropdown estado en detalle ---
function toggleEstadoDropdownDet() {
  const dd = document.getElementById('det-estado-dd');
  if (!dd) return;
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  if (dd.style.display === 'block') {
    setTimeout(() => {
      const cerrar = e => { if (!dd.contains(e.target)) { dd.style.display = 'none'; document.removeEventListener('click', cerrar); } };
      document.addEventListener('click', cerrar);
    }, 0);
  }
}

function cambiarEstadoOTDet(codigo) {
  const dd = document.getElementById('det-estado-dd');
  if (dd) dd.style.display = 'none';

  if (codigo === 'reagendar') {
    const rp = document.getElementById('det-reagendar-panel');
    if (rp) { rp.style.display = 'block'; rp.scrollIntoView({ behavior:'smooth', block:'nearest' }); }
    return;
  }
  _aplicarEstadoOTDet(codigo);
}

function confirmarReagendaDet() {
  const fNueva = document.getElementById('det-fecha-nueva')?.value || '';
  const hNueva = document.getElementById('det-hora-nueva')?.value  || '';
  const motivo = document.getElementById('det-reagendar-motivo')?.value || '';
  const rp = document.getElementById('det-reagendar-panel'); if (rp) rp.style.display = 'none';

  _aplicarEstadoOTDet('reagendar', { nuevaFecha: fNueva, nuevaHora: hNueva, motivo });

  // Actualizar fechaCita/horaCita si se ingresaron
  if (fNueva && _otDetalleId) {
    const ots = APP.lsGet('mp_ots', []);
    const idx = ots.findIndex(o => o.id === _otDetalleId);
    if (idx >= 0) {
      if (fNueva) ots[idx].fechaCita = fNueva;
      if (hNueva) ots[idx].horaCita  = hNueva;
      APP.lsSet('mp_ots', ots);
    }
  }
  // Limpiar campos
  ['det-fecha-nueva','det-hora-nueva','det-reagendar-motivo'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
}

function _aplicarEstadoOTDet(codigo, extra = {}) {
  if (!_otDetalleId) return;
  const est   = ESTADOS[codigo] || ESTADOS['agendado'];
  const ahora = new Date();
  const entrada = {
    estado: codigo, label: est.label, emoji: est.emoji,
    ts:    ahora.toISOString(),
    hora:  ahora.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' }),
    fecha: ahora.toLocaleDateString('es-CL'),
    ...extra,
  };
  if (codigo === 'llego') entrada.horaEntrada = entrada.hora;

  const ots = APP.lsGet('mp_ots', []);
  const idx = ots.findIndex(o => o.id === _otDetalleId);
  if (idx < 0) return;

  const estadoOT = codigo === 'llego'      ? 'en-proceso'
                 : codigo === 'nollego' || codigo === 'cancelo' ? 'cerrado'
                 : codigo === 'cotizacion' ? 'cotizacion'
                 : ots[idx].estado;

  ots[idx].estadoCita = codigo;
  ots[idx].estado     = estadoOT;
  ots[idx].historial  = [...(ots[idx].historial || []), entrada];
  APP.lsSet('mp_ots', ots);

  _actualizarBadgeDet(codigo);
  _renderHistorialDet(ots[idx].historial);
}

function _renderHistorialDet(historial) {
  const el = document.getElementById('det-historial');
  if (!el) return;
  if (!historial || historial.length === 0) {
    el.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:16px">Sin eventos registrados</div>';
    return;
  }
  el.innerHTML = [...historial].reverse().map((e, i) => `
    <div style="display:flex;gap:10px;padding:8px 0;${i < historial.length - 1 ? 'border-bottom:0.5px solid var(--border)' : ''}">
      <div style="font-size:16px;flex-shrink:0;width:24px;text-align:center">${e.emoji || '📋'}</div>
      <div style="flex:1">
        <div style="font-weight:500;font-size:12px">${e.label || e.estado}</div>
        <div style="font-size:10px;color:var(--text-muted)">${e.fecha || ''} ${e.hora || ''}</div>
        ${e.detalle    ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">${e.detalle}</div>` : ''}
        ${e.motivo     ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">Motivo: ${e.motivo}</div>` : ''}
        ${e.nuevaFecha ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">Nueva cita: ${e.nuevaFecha}${e.nuevaHora ? ' ' + e.nuevaHora : ''}</div>` : ''}
        ${e.horaEntrada ? `<div style="font-size:10px;color:var(--text-success);margin-top:2px">Hora de entrada: ${e.horaEntrada}</div>` : ''}
      </div>
    </div>`).join('');
}
