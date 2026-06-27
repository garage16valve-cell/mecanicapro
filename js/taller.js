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
  renderClientes();
}

// ===== MÓDULO CLIENTES (renderizado dinámico desde mp_clientes) =====
function renderClientes(filtro = '') {
  const grid = document.getElementById('clientes-grid');
  const cnt  = document.getElementById('cli-count');
  if (!grid) return;

  const ots      = APP.lsGet('mp_ots', []);
  const clientes = APP.lsGet('mp_clientes', []);

  const q = (filtro || '').toLowerCase().trim();
  const lista = q
    ? clientes.filter(c =>
        (c.nombre  || '').toLowerCase().includes(q) ||
        (c.rut     || '').toLowerCase().includes(q) ||
        (c.wz      || '').toLowerCase().includes(q) ||
        (c.patentes || []).some(p => p.toLowerCase().includes(q))
      )
    : clientes;

  if (cnt) cnt.textContent = lista.length + ' cliente' + (lista.length !== 1 ? 's' : '');

  if (lista.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:32px;font-size:12px">
      <i class="ti ti-users" style="font-size:28px;display:block;margin-bottom:8px;opacity:.3"></i>
      ${q ? 'Sin resultados para "' + filtro + '".' : 'Los clientes se crean automáticamente al generar una OT.<br><span style="font-size:11px">Ve a <strong>Órdenes de trabajo</strong> y crea una nueva OT para empezar.</span>'}
    </div>`;
    return;
  }

  grid.innerHTML = lista.map(c => {
    const initials = (c.nombre || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const otsCli   = ots.filter(o => o.clienteId === c.id);
    const patentes = (c.patentes || []);

    // Último vehículo conocido (de la última OT)
    const ultimaOT = otsCli[otsCli.length - 1];
    const vehiculo = ultimaOT
      ? [ultimaOT.marca, ultimaOT.modelo, ultimaOT.anio].filter(Boolean).join(' ')
      : null;

    const otRows = otsCli.slice(-3).reverse().map(o =>
      `<tr onclick="nav('ot',null);setTimeout(()=>abrirDetalleOT('${o.id}'),300)" style="cursor:pointer">
        <td style="color:var(--text-accent);font-weight:500">${o.id}</td>
        <td style="font-size:10px;color:var(--text-muted)">${new Date(o.creado).toLocaleDateString('es-CL')}</td>
        <td>${o.servicio || '—'}</td>
        <td>${o.valor ? '$' + Number(o.valor).toLocaleString('es-CL') : '—'}</td>
      </tr>`
    ).join('');

    return `<div class="card">
      <div class="ch">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="av" style="width:36px;height:36px;font-size:13px">${initials}</div>
          <div>
            <div style="font-size:13px;font-weight:500">${c.nombre || '—'}</div>
            <div style="font-size:11px;color:var(--text-muted)">${c.rut ? 'RUT: ' + c.rut : 'Sin RUT'}</div>
          </div>
        </div>
        <span class="st ${otsCli.length ? 's-done' : 's-wait'}"><span class="dot"></span>${otsCli.length} OT${otsCli.length !== 1 ? 's' : ''}</span>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;display:flex;gap:14px;flex-wrap:wrap">
        ${c.wz   ? `<span><i class="ti ti-brand-whatsapp" style="font-size:11px;vertical-align:-2px"></i> ${c.wz}</span>` : ''}
        ${c.mail ? `<span><i class="ti ti-mail" style="font-size:11px;vertical-align:-2px"></i> ${c.mail}</span>` : ''}
      </div>
      ${patentes.length ? `<div style="margin-bottom:8px">${patentes.map(p => `<span class="tag" style="font-family:var(--font-mono);cursor:pointer" onclick="nav('ot',null);setTimeout(()=>setPatente('${p}'),300)">${p}</span>`).join(' ')}</div>` : ''}
      ${vehiculo ? `<div style="font-size:11px;font-weight:500;color:var(--text-secondary);margin-bottom:8px">${vehiculo}${c.km ? ' · ' + Number(c.km).toLocaleString('es-CL') + ' km' : ''}</div>` : ''}
      ${otsCli.length ? `<div class="div"></div>
        <table class="tbl"><thead><tr><th>OT</th><th>Fecha</th><th>Servicio</th><th>Valor</th></tr></thead>
        <tbody>${otRows}</tbody></table>` : ''}
    </div>`;
  }).join('');
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
  agendado:   { emoji:'📅', label:'Agendado',           color:'var(--text-muted)'   },
  llego:      { emoji:'✅', label:'Cliente llegó',       color:'var(--text-success)' },
  nollego:    { emoji:'❌', label:'Cliente no llegó',    color:'var(--text-danger)'  },
  reagendar:  { emoji:'📅', label:'Reagendado',          color:'#d97706'             },
  cancelo:    { emoji:'🚫', label:'Cliente canceló',     color:'var(--text-danger)'  },
  cotizacion: { emoji:'📋', label:'Cotización',          color:'var(--text-accent)'  },
  completado: { emoji:'🏁', label:'Trabajo completado',  color:'var(--text-success)' },
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
    _crmRenderFormulario(pat);

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
    }
    const cd = document.getElementById('cliente-datos');
    if (cd) cd.style.display = 'block';
    const pb = document.getElementById('precot-box');
    if (pb) pb.style.display = 'none';
    _crmRenderFormulario(pat);
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
  if (vin) vin.value = d.vin !== '—' ? (d.vin || '') : '';
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
  const vin    = (document.getElementById('v-vin')?.value || '').trim() || '—';

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
  const vin = document.getElementById('v-vin'); if (vin) vin.value = '';
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
  const ch = document.getElementById('crm-hist-box');   if (ch) ch.style.display  = 'none';

  _setPatStatus('ok', 'Ingresa la patente para auto-completar datos del vehículo.');
  const st = document.getElementById('pat-status');
  if (st) st.style.color = 'var(--text-muted)';
}

// ===== LISTA DE OTs =====
const OT_ESTADO_CSS = {
  agendado:   's-wait',  'en-proceso': 's-prog',
  cerrado:    's-done',  cotizacion:   's-crit',
  completado: 's-done',
};
const OT_ESTADO_LABEL = {
  agendado:   'Agendado',    'en-proceso': 'En proceso',
  cerrado:    'Cerrado',     cotizacion:   'Cotización',
  completado: 'Completado',
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
  s('det-notas',  ot.notas  || '');
  s('det-valor',  ot.valor  || '');

  // Hora entrada / salida reales
  const _toTimeInput = ts => {
    if (!ts) return '';
    // Si ya es HH:MM (hora local guardada como string)
    if (/^\d{1,2}:\d{2}$/.test(ts)) return ts.padStart(5, '0');
    // Si es ISO timestamp
    try { const d = new Date(ts); return d.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}).padStart(5,'0'); } catch { return ''; }
  };
  s('det-hora-entrada', _toTimeInput(ot.entrada_ts || ot.horaEntrada || ''));
  s('det-hora-salida',  _toTimeInput(ot.salida_ts  || ot.horaSalida  || ''));

  // Repuestos dinámicos
  _detRepEditing = false;
  _detRepItems   = (ot.repuestosItems && ot.repuestosItems.length) ? ot.repuestosItems : _detRepParseTexto(ot.repuestos || '');
  _detRepRender();
  const addBtn = document.getElementById('det-rep-add-btn');
  if (addBtn) addBtn.style.display = 'none';

  // Campos readonly por defecto
  ['det-nombre','det-rut','det-wz','det-mail','det-km',
   'det-marca','det-modelo','det-anio','det-motor','det-comb','det-tipo','det-vin','det-nmotor',
   'det-fecha','det-hora','det-hora-entrada','det-hora-salida','det-notas','det-valor']
    .forEach(id => { const el = document.getElementById(id); if (el) el.setAttribute('readonly',''); });

  // Badge de estado
  _actualizarBadgeDet(ot.estadoCita || ot.estado || 'agendado');

  // Botones
  const be = document.getElementById('det-btn-editar');  if (be) { be.style.display = ''; be.innerHTML = '<i class="ti ti-edit"></i> Editar'; }
  const bg = document.getElementById('det-btn-guardar'); if (bg) bg.style.display = 'none';

  // Historial
  _renderHistorialDet(ot.historial || []);

  // Paneles módulos 5/6/7
  _actualizarPanelesDet(ot);

  // Ocultar reagendar y upsell banner (se re-calculan abajo)
  const rp = document.getElementById('det-reagendar-panel'); if (rp) rp.style.display = 'none';

  // CRM historial del vehículo
  _crmRenderDetalle(ot.patente, ot.id);

  // Upselling inteligente
  _upsellingRender(ot.patente, ot.servicio);

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
    'det-fecha','det-hora','det-hora-entrada','det-hora-salida','det-notas','det-valor'];

  campos.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (_otEditando) el.removeAttribute('readonly'); else el.setAttribute('readonly','');
  });
  const tec  = document.getElementById('det-tec');  if (tec)  tec.disabled  = !_otEditando;
  const serv = document.getElementById('det-serv'); if (serv) serv.disabled = !_otEditando;

  // Repuestos dinámicos
  _detRepEditing = _otEditando;
  _detRepRender();
  const addBtn = document.getElementById('det-rep-add-btn');
  if (addBtn) addBtn.style.display = _otEditando ? '' : 'none';

  // Auto-cálculo tiempo al editar horas
  const calcEl = document.getElementById('det-calc-tiempo');
  if (calcEl) calcEl.style.display = _otEditando ? 'block' : 'none';

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

  // Hora entrada/salida reales y cálculo automático de tiempoReal
  const horaEntrada = g('det-hora-entrada');
  const horaSalida  = g('det-hora-salida');
  let nuevaEntradaTs = ots[idx].entrada_ts;
  let nuevaSalidaTs  = ots[idx].salida_ts;
  let nuevoTiempoReal = ots[idx].tiempoReal;

  if (horaEntrada) {
    const [hh, mm] = horaEntrada.split(':').map(Number);
    const base = ots[idx].fechaCita ? new Date(ots[idx].fechaCita) : new Date();
    base.setHours(hh, mm, 0, 0);
    nuevaEntradaTs = base.toISOString();
  }
  if (horaSalida) {
    const [hh, mm] = horaSalida.split(':').map(Number);
    const base = ots[idx].fechaCita ? new Date(ots[idx].fechaCita) : new Date();
    base.setHours(hh, mm, 0, 0);
    nuevaSalidaTs = base.toISOString();
  }
  if (nuevaEntradaTs && nuevaSalidaTs) {
    nuevoTiempoReal = Math.round((new Date(nuevaSalidaTs) - new Date(nuevaEntradaTs)) / 60000);
    if (nuevoTiempoReal < 0) nuevoTiempoReal = null; // sanity check
  }

  // Repuestos dinámicos
  const repItems = _detRepItems.filter(it => it.desc);
  const repTexto = _detRepToTexto();

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
    repuestos:     repTexto,
    repuestosItems: repItems,
    entrada_ts:    nuevaEntradaTs,
    salida_ts:     nuevaSalidaTs,
    horaEntrada:   horaEntrada || ots[idx].horaEntrada,
    horaSalida:    horaSalida  || ots[idx].horaSalida,
    tiempoReal:    nuevoTiempoReal,
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

  const estadoOT = codigo === 'llego'                           ? 'en-proceso'
                 : codigo === 'nollego' || codigo === 'cancelo' ? 'cerrado'
                 : codigo === 'cotizacion'                      ? 'cotizacion'
                 : ots[idx].estado;

  if (codigo === 'llego') ots[idx].entrada_ts = ahora.toISOString();

  ots[idx].estadoCita = codigo;
  ots[idx].estado     = estadoOT;
  ots[idx].historial  = [...(ots[idx].historial || []), entrada];
  APP.lsSet('mp_ots', ots);

  _actualizarBadgeDet(codigo);
  _renderHistorialDet(ots[idx].historial);
  _actualizarPanelesDet(ots[idx]);
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
        ${e.horaSalida  ? `<div style="font-size:10px;color:var(--text-success);margin-top:2px">Hora de salida: ${e.horaSalida}${e.tiempoReal != null ? ' · Tiempo real: ' + Math.floor(e.tiempoReal/60) + 'h ' + (e.tiempoReal%60) + 'm' : ''}</div>` : ''}
      </div>
    </div>`).join('');
}

// ===== MÓDULO 5: COTIZACIÓN =====
function _generarCotizacion(ot) {
  const fecha = new Date().toLocaleDateString('es-CL');
  const vehiculo = [ot.marca, ot.modelo, ot.anio].filter(Boolean).join(' ') || '—';
  const lines = [
    '════════════════════════════════',
    '       COTIZACIÓN DE SERVICIOS',
    '   Integral Automotriz Spa — Valparaíso',
    '════════════════════════════════',
    '',
    `Fecha:    ${fecha}`,
    `OT:       ${ot.id || '—'}`,
    `Patente:  ${ot.patente || '—'}`,
    `Vehículo: ${vehiculo}`,
    `Cliente:  ${ot.clienteNombre || '—'}`,
    '',
    '──────── SERVICIOS ────────',
    `• ${ot.servicio || 'Por determinar'}${ot.valor ? ':  $' + Number(ot.valor).toLocaleString('es-CL') : ''}`,
    '',
  ];
  if (ot.repuestos && ot.repuestos.trim()) {
    lines.push('──────── REPUESTOS / MATERIALES ────────');
    ot.repuestos.split('\n').forEach(r => { if (r.trim()) lines.push('• ' + r.trim()); });
    lines.push('');
  }
  if (ot.valor) lines.push(`TOTAL ESTIMADO:  $${Number(ot.valor).toLocaleString('es-CL')}`, '');
  lines.push(
    '──────── CONDICIONES ────────',
    '• Válido por 15 días hábiles',
    '• Precios incluyen IVA',
    '• Sujeto a revisión del vehículo',
    '',
    '──────── CONTACTO ────────',
    'WhatsApp: +569 5165 5331',
    'https://integral-automotriz-spa.reservio.com/booking',
    '════════════════════════════════',
  );
  return lines.join('\n');
}

function enviarCotizacionWA() {
  const texto = document.getElementById('det-cot-texto')?.value || '';
  window.open('https://wa.me/56951655331?text=' + encodeURIComponent(texto), '_blank');
}

function copiarCotizacion() {
  const texto = document.getElementById('det-cot-texto')?.value || '';
  navigator.clipboard.writeText(texto).then(() => alert('✓ Cotización copiada al portapapeles.\nPégala en un correo o WhatsApp.'));
}

// ===== MÓDULO 6: CIERRE + INSTAGRAM =====
function completarOT() {
  if (!_otDetalleId) return;
  const ahora = new Date();
  const ots   = APP.lsGet('mp_ots', []);
  const idx   = ots.findIndex(o => o.id === _otDetalleId);
  if (idx < 0) return;
  const ot = ots[idx];

  const horaSalida = ahora.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' });
  let tiempoReal   = null;
  if (ot.entrada_ts) {
    tiempoReal = Math.round((ahora - new Date(ot.entrada_ts)) / 60000);
  }

  const entrada = {
    estado:'completado', label:'Trabajo completado', emoji:'🏁',
    ts:    ahora.toISOString(),
    hora:  horaSalida,
    fecha: ahora.toLocaleDateString('es-CL'),
    horaSalida, tiempoReal,
  };

  ots[idx] = {
    ...ot,
    estado:'completado', estadoCita:'completado',
    horaSalida, salida_ts: ahora.toISOString(), tiempoReal,
    historial: [...(ot.historial || []), entrada],
  };
  APP.lsSet('mp_ots', ots);

  _actualizarBadgeDet('completado');
  _renderHistorialDet(ots[idx].historial);
  _actualizarPanelesDet(ots[idx]);
}

function _generarPostIG(ot) {
  const marca  = ot.marca  || '[Marca]';
  const modelo = ot.modelo || '[Modelo]';
  const anio   = ot.anio   ? ot.anio : '';
  const serv   = ot.servicio || '[Servicio realizado]';
  const extras = ot.notas ? '\n- ' + ot.notas : '';
  return `Mantenimiento correctivo ${marca} ${modelo} ${anio} 🏁
🔧 Nuestros servicios incluyen:
- ${serv}${extras}
🔧 ¿Por qué elegirnos?
- 🛠️ Trabajo garantizado por profesionales
- 🚗 Expertos en vehículos diésel y bencina
- 💳 Aceptamos todos los medios de pago, ¡hasta 12 cuotas!
📍 Visítanos en Valparaíso, donde la calidad y la seguridad son nuestra prioridad.
📩 Contáctanos hoy:
- DM para consultas
- WhatsApp: +569 5165 5331 - Reservas - precios - procedimientos ⬇️⬇️
https://integral-automotriz-spa.reservio.com/booking
Confía en nosotros para mantener tu vehículo en óptimas condiciones. ¡Agenda tu cita hoy!
#MecanicaValparaiso #ValparaisoMecanica #ReparacionVehiculosValparaiso #AutosValparaiso #MantenimientoVehicularValparaiso valparaisoautos`;
}

function copiarPostIG() {
  const texto = document.getElementById('det-ig-texto')?.value || '';
  navigator.clipboard.writeText(texto).then(() => alert('✓ Texto copiado.\nPégalo directamente en Instagram.'));
}

function previsualizarFoto(input) {
  const prev = document.getElementById('det-foto-preview');
  if (!prev || !input.files || !input.files[0]) return;
  const url = URL.createObjectURL(input.files[0]);
  prev.innerHTML = `<img src="${url}" style="max-width:100%;max-height:180px;border-radius:var(--radius);margin-top:4px;object-fit:cover">`;
}

// ===== MÓDULO 7: TIEMPO Y RENTABILIDAD =====
function _promedioHistoricoServicio(servicio) {
  if (!servicio) return { promedio: 0, count: 0 };
  const ots = APP.lsGet('mp_ots', []);
  const con = ots.filter(o => o.servicio === servicio && o.tiempoReal != null && o.tiempoReal > 0);
  if (!con.length) return { promedio: 0, count: 0 };
  return { promedio: con.reduce((s, o) => s + o.tiempoReal, 0) / con.length, count: con.length };
}

function recalcularTiempo() {
  if (!_otDetalleId) return;
  const estH = parseFloat(document.getElementById('det-tiempo-est')?.value) || 0;
  const ots  = APP.lsGet('mp_ots', []);
  const idx  = ots.findIndex(o => o.id === _otDetalleId);
  if (idx >= 0) { ots[idx].tiempoEstimado = estH; APP.lsSet('mp_ots', ots); _mostrarPanelTiempo(ots[idx]); }
}

function _mostrarPanelTiempo(ot) {
  const el = document.getElementById('det-tiempo-contenido');
  if (!el) return;

  const estH       = parseFloat(document.getElementById('det-tiempo-est')?.value) || (ot.tiempoEstimado || 0);
  const estMin     = estH * 60;
  const realMin    = ot.tiempoReal;
  const valor      = parseFloat(ot.valor) || 0;
  const fmt        = m => `${Math.floor(m/60)}h ${Math.round(m%60)}m`;

  let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">';

  if (ot.entrada_ts) {
    html += `<div class="kcard"><div class="kl">Hora entrada</div><div class="kv" style="font-size:14px">${new Date(ot.entrada_ts).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}</div></div>`;
  }
  if (ot.horaSalida) {
    html += `<div class="kcard"><div class="kl">Hora salida</div><div class="kv" style="font-size:14px">${ot.horaSalida}</div></div>`;
  }
  if (realMin != null) {
    html += `<div class="kcard"><div class="kl">Tiempo real</div><div class="kv" style="font-size:14px">${fmt(realMin)}</div></div>`;
    if (estMin > 0) {
      const diff     = realMin - estMin;
      const diffColor = diff > 0 ? 'var(--text-danger)' : 'var(--text-success)';
      const diffSign  = diff > 0 ? '+' : '-';
      html += `<div class="kcard"><div class="kl">Tiempo estimado</div><div class="kv" style="font-size:14px">${fmt(estMin)}</div></div>`;
      html += `<div class="kcard"><div class="kl">Diferencia</div><div class="kv" style="font-size:14px;color:${diffColor}">${diffSign}${fmt(Math.abs(diff))}</div></div>`;
      if (valor > 0) {
        const ganLoss = Math.round(valor * Math.abs(diff) / estMin);
        html += `<div class="kcard"><div class="kl">${diff > 0 ? 'Pérdida est.' : 'Ahorro est.'}</div><div class="kv" style="font-size:14px;color:${diffColor}">${diff > 0 ? '-' : '+'}$${ganLoss.toLocaleString('es-CL')}</div></div>`;
      }
    }
    if (valor > 0 && realMin > 0) {
      const vh = Math.round(valor / (realMin / 60));
      html += `<div class="kcard"><div class="kl">Valor/hora real</div><div class="kv" style="font-size:14px">$${vh.toLocaleString('es-CL')}</div></div>`;
    }
  }
  html += '</div>';

  const { promedio, count } = _promedioHistoricoServicio(ot.servicio);
  if (count > 0) {
    html += `<div style="font-size:11px;padding:8px 0;border-top:0.5px solid var(--border);color:var(--text-muted)">
      Promedio histórico <strong>${ot.servicio}</strong>: ${fmt(promedio)} (${count} OT${count!==1?'s':''})
    </div>`;
    if (estMin > 0 && promedio > estMin * 1.1) {
      html += `<div class="al al-w" style="margin-top:8px"><i class="ti ti-alert-triangle"></i>
        <div class="al-text" style="font-size:11px">El promedio real <strong>(${fmt(promedio)})</strong> supera el estimado. Considera ajustar las horas o el precio en el módulo de Servicios.</div>
      </div>`;
    }
  }
  el.innerHTML = html;
}

// ===== REPUESTOS DINÁMICOS (lista con "+" en detalle OT) =====
let _detRepItems   = [];
let _detRepEditing = false;

function _detRepParseTexto(texto) {
  if (!texto || !texto.trim()) return [];
  return texto.split('\n').filter(l => l.trim()).map(l => {
    const m = l.match(/^(.*?)\s*\$?([\d.]+)\s*$/);
    if (m) return { desc: m[1].trim(), precio: parseInt(m[2].replace(/\./g, '')) || 0 };
    return { desc: l.trim(), precio: 0 };
  });
}

function _detRepRender() {
  const lista   = document.getElementById('det-rep-lista');
  const totalEl = document.getElementById('det-rep-total');
  if (!lista) return;

  if (!_detRepItems.length) {
    lista.innerHTML = _detRepEditing
      ? '<div style="color:var(--text-muted);font-size:10px;padding:4px 0">Sin ítems — usa Agregar.</div>'
      : '<div style="color:var(--text-muted);font-size:10px;padding:4px 0">—</div>';
    if (totalEl) totalEl.style.display = 'none';
    return;
  }

  lista.innerHTML = _detRepItems.map((it, i) => `
    <div style="display:flex;gap:4px;align-items:center">
      <input value="${_tallerEsc(it.desc)}" placeholder="Descripción" style="flex:1;font-size:11px;border:0.5px solid var(--border);border-radius:var(--radius);padding:4px 6px;background:var(--surface-1);color:var(--text-primary)" ${_detRepEditing ? '' : 'readonly'} oninput="_detRepSync(${i},'desc',this.value)">
      <input type="number" value="${it.precio || ''}" placeholder="$" style="width:80px;font-size:11px;border:0.5px solid var(--border);border-radius:var(--radius);padding:4px 6px;background:var(--surface-1);color:var(--text-primary);text-align:right" ${_detRepEditing ? '' : 'readonly'} oninput="_detRepSync(${i},'precio',this.value)">
      ${_detRepEditing ? `<button class="btn" style="padding:2px 5px;font-size:11px;flex-shrink:0" onclick="detRepElim(${i})"><i class="ti ti-x"></i></button>` : ''}
    </div>`).join('');

  const total = _detRepItems.reduce((s, it) => s + (parseInt(it.precio) || 0), 0);
  if (totalEl) {
    totalEl.style.display = total > 0 ? 'block' : 'none';
    totalEl.textContent   = 'Total repuestos: $' + total.toLocaleString('es-CL');
  }
}

function _detRepSync(i, campo, val) {
  if (_detRepItems[i]) _detRepItems[i][campo] = campo === 'precio' ? (parseInt(val) || 0) : val;
  const total   = _detRepItems.reduce((s, it) => s + (parseInt(it.precio) || 0), 0);
  const totalEl = document.getElementById('det-rep-total');
  if (totalEl) {
    totalEl.style.display = total > 0 ? 'block' : 'none';
    totalEl.textContent   = 'Total repuestos: $' + total.toLocaleString('es-CL');
  }
}

function detRepAdd() {
  _detRepItems.push({ desc: '', precio: 0 });
  _detRepRender();
}

function detRepElim(i) {
  _detRepItems.splice(i, 1);
  _detRepRender();
}

function _detRepToTexto() {
  return _detRepItems.filter(it => it.desc).map(it =>
    it.desc + (it.precio ? ' $' + Number(it.precio).toLocaleString('es-CL') : '')
  ).join('\n');
}

function detCalcTiempo() {
  const entrada = document.getElementById('det-hora-entrada')?.value;
  const salida  = document.getElementById('det-hora-salida')?.value;
  const el      = document.getElementById('det-calc-tiempo');
  if (!el) return;
  if (!entrada || !salida) { el.textContent = ''; return; }
  const [eh, em] = entrada.split(':').map(Number);
  const [sh, sm] = salida.split(':').map(Number);
  const mins = (sh * 60 + sm) - (eh * 60 + em);
  if (mins <= 0) { el.textContent = '⚠ La hora de entrega debe ser posterior a la de entrada'; el.style.color = 'var(--text-danger)'; return; }
  el.style.color = 'var(--text-success)';
  el.textContent = `⏱ Tiempo real calculado: ${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function _tallerEsc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

// ===== CRM TÉCNICO — Historial del vehículo =====
function _crmOtsPatente(patente) {
  if (!patente) return [];
  return APP.lsGet('mp_ots', [])
    .filter(o => o.patente === patente)
    .sort((a, b) => new Date(a.creado) - new Date(b.creado));
}

function _crmHtml(histOTs, currentId) {
  if (!histOTs.length) return '<div style="color:var(--text-muted);padding:8px 0;font-size:11px">Sin historial previo para esta patente.</div>';
  const fmtT = m => m != null ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : null;
  return histOTs.map(o => {
    const esCurrent = o.id === currentId;
    const t = fmtT(o.tiempoReal);
    return `<div style="padding:7px 0;border-bottom:0.5px solid var(--border);${esCurrent ? 'opacity:.4;' : ''}">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="color:var(--text-accent);font-weight:500;font-size:11px;cursor:pointer" onclick="volverListaOT();setTimeout(()=>abrirDetalleOT('${o.id}'),50)">${o.id}</span>
        <span style="font-size:10px;color:var(--text-muted)">${o.creado ? new Date(o.creado).toLocaleDateString('es-CL') : '—'}</span>
        ${esCurrent ? '<span style="font-size:9px;background:var(--surface-2);padding:1px 5px;border-radius:8px;color:var(--text-muted)">esta OT</span>' : ''}
      </div>
      <div style="font-size:11px;margin-top:2px;font-weight:500">${o.servicio || '—'}</div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:1px;display:flex;gap:10px;flex-wrap:wrap">
        ${o.tecnico ? '<span>' + o.tecnico + '</span>' : ''}
        ${t ? '<span>⏱ ' + t + '</span>' : ''}
        ${o.valor ? '<span>$' + Number(o.valor).toLocaleString('es-CL') + '</span>' : ''}
        ${o.valorTotal ? '<span>Total $' + Number(o.valorTotal).toLocaleString('es-CL') + '</span>' : ''}
      </div>
    </div>`;
  }).join('');
}

function _crmRenderFormulario(patente) {
  const box  = document.getElementById('crm-hist-box');
  const cont = document.getElementById('crm-hist-contenido');
  if (!box || !cont) return;
  const hist = _crmOtsPatente(patente);
  if (!hist.length) { box.style.display = 'none'; return; }
  cont.innerHTML = _crmHtml(hist, null);
  box.style.display = 'block';
}

function _crmRenderDetalle(patente, currentId) {
  const panel = document.getElementById('det-crm-panel');
  const cont  = document.getElementById('det-crm-contenido');
  if (!panel || !cont) return;
  const hist = _crmOtsPatente(patente);
  if (!hist.length) { panel.style.display = 'none'; return; }
  cont.innerHTML = _crmHtml(hist, currentId);
  panel.style.display = 'block';
}

// ===== UPSELLING INTELIGENTE =====
const _UPSELL_DEFAULTS = [
  { servicio: 'Cambio aceite + filtros',  meses: 6  },
  { servicio: 'Mantención 10.000 km',     meses: 12 },
  { servicio: 'Cambio de frenos',         meses: 24 },
  { servicio: 'Alineación y balanceo',    meses: 12 },
  { servicio: 'Diagnóstico scanner',      meses: 12 },
  { servicio: 'Cambio de embrague',       meses: 36 },
];

function _upsellingCheck(patente, servicioActual) {
  const reglas = APP.lsGet('mp_upselling_rules', _UPSELL_DEFAULTS);
  const hist   = _crmOtsPatente(patente).filter(o => o.estado === 'completado');
  if (!hist.length) return [];

  const ahora  = Date.now();
  return reglas.reduce((acc, regla) => {
    if (regla.servicio === servicioActual) return acc;
    const ultOT = hist.filter(o => o.servicio === regla.servicio)
      .sort((a, b) => new Date(b.creado) - new Date(a.creado))[0];
    if (!ultOT) return acc;
    const meses = (ahora - new Date(ultOT.creado)) / (1000 * 60 * 60 * 24 * 30.44);
    if (meses >= regla.meses) {
      acc.push({ servicio: regla.servicio, meses: Math.floor(meses), intervalo: regla.meses, ultimaFecha: new Date(ultOT.creado).toLocaleDateString('es-CL') });
    }
    return acc;
  }, []);
}

function _upsellingRender(patente, servicioActual) {
  const banner = document.getElementById('det-upsell-banner');
  if (!banner) return;
  const sugs = _upsellingCheck(patente, servicioActual);
  if (!sugs.length) { banner.style.display = 'none'; return; }
  const items = sugs.map(s =>
    `<div style="padding:3px 0;display:flex;gap:6px;align-items:flex-start"><i class="ti ti-bulb" style="color:#d97706;font-size:12px;margin-top:1px;flex-shrink:0"></i>
    <span><strong>${s.servicio}</strong> — hace <strong>${s.meses} meses</strong> (rec. cada ${s.intervalo} m · último: ${s.ultimaFecha})</span></div>`
  ).join('');
  banner.style.display = 'block';
  banner.innerHTML = `<div class="al al-w" style="flex-direction:column;align-items:stretch">
    <div style="font-size:11px;font-weight:600;margin-bottom:4px"><i class="ti ti-sparkles"></i> Servicios sugeridos para esta visita</div>
    <div style="font-size:11px">${items}</div>
  </div>`;
}

// ===== CONTROL PANELES SEGÚN ESTADO =====
function _actualizarPanelesDet(ot) {
  // Panel 5 — Cotización
  const pCot = document.getElementById('det-panel-cotizacion');
  if (pCot) {
    const show = ot.estado === 'cotizacion';
    pCot.style.display = show ? 'block' : 'none';
    if (show) {
      const ta = document.getElementById('det-cot-texto');
      if (ta && !ta.value) ta.value = _generarCotizacion(ot);
    }
  }

  // Panel 6 — Cierre + Instagram
  const pCierre = document.getElementById('det-panel-cierre');
  if (pCierre) {
    const show = ot.estado === 'en-proceso' || ot.estado === 'completado';
    pCierre.style.display = show ? 'block' : 'none';
    if (show) {
      const compSec = document.getElementById('det-completar-sec');
      const igSec   = document.getElementById('det-ig-sec');
      if (ot.estado === 'completado') {
        if (compSec) compSec.style.display = 'none';
        if (igSec) {
          igSec.style.display = 'block';
          const ta = document.getElementById('det-ig-texto');
          if (ta && !ta.value) ta.value = _generarPostIG(ot);
          const tr = document.getElementById('det-tiempo-resumen');
          if (tr && ot.tiempoReal != null) {
            tr.textContent = `Tiempo real: ${Math.floor(ot.tiempoReal/60)}h ${ot.tiempoReal%60}m`;
          }
        }
      } else {
        if (compSec) compSec.style.display = 'block';
        if (igSec)   igSec.style.display   = 'none';
      }
    }
  }

  // Panel 7 — Tiempo
  const pTiempo = document.getElementById('det-panel-tiempo');
  if (pTiempo) {
    const show = !!(ot.entrada_ts || ot.horaSalida);
    pTiempo.style.display = show ? 'block' : 'none';
    if (show) {
      const est = document.getElementById('det-tiempo-est');
      if (est && ot.tiempoEstimado) est.value = ot.tiempoEstimado;
      _mostrarPanelTiempo(ot);
    }
  }
}
