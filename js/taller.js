// ===== MÓDULO: TALLER (OT, Clientes, Wiki) =====
function init_taller() {
  // Sin inicialización al cargar; el formulario se activa con la patente
}

// ===== BASE DE DATOS DE PATENTES (demo / fallback) =====
const DB_PAT = {
  'ABCD12': { marca:'Toyota',     modelo:'Corolla',   anio:'2022', motor:'1.8L Hybrid 2ZR-FXE', comb:'Híbrido',  tipo:'Sedán',     vin:'JTDL9RFU4N3088412', nmotor:'2ZR-FXE-K3820541' },
  'KGSJK9': { marca:'Kia',        modelo:'Sportage',  anio:'2023', motor:'2.0L GDI MPI G4KD',   comb:'Bencina',  tipo:'SUV',       vin:'KNAPM815XN7394820', nmotor:'G4KD-N1052038'    },
  'GHJK45': { marca:'Volkswagen', modelo:'Golf',      anio:'2021', motor:'1.4L TSI CZEA',        comb:'Bencina',  tipo:'Hatchback', vin:'WVWZZZ1KZMW123456', nmotor:'CZEA-B2019301'    },
  'MNOP78': { marca:'Ford',       modelo:'F-150',     anio:'2020', motor:'3.5L EcoBoost V6',     comb:'Bencina',  tipo:'Pick-up',   vin:'1FTFW1ET1LFA12345', nmotor:'35EB-C1082930'    },
  'BCDF34': { marca:'Honda',      modelo:'Civic',     anio:'2021', motor:'1.5L VTEC Turbo L15B7',comb:'Bencina',  tipo:'Sedán',     vin:'2HGFC2F59MH552143', nmotor:'L15B7-0183920'    },
};

// Pre-cotizaciones por marca
const PRECOTS = {
  Toyota:     { items:'Filtro aceite $4.500 · Aceite 5W-30 4L $24.800 · Filtro aire $12.000 · M.obra $35.000', total:'$76.300', h:'Dado 17mm · Torquímetro 25 Nm · Embudo' },
  Kia:        { items:'Filtro aceite $5.200 · Aceite 5W-40 4L $26.000 · Filtro aire $14.500 · M.obra $35.000', total:'$80.700', h:'Dado 17mm · Llave Torx T30' },
  Volkswagen: { items:'Filtro aceite $7.800 · Aceite 5W-40 4L $29.000 · Filtro aire $16.000 · M.obra $40.000', total:'$92.800', h:'Torx T45 · Dado 21mm · Removedor filtro' },
  Ford:       { items:'Filtro aceite $6.500 · Aceite 5W-20 5L $31.000 · Filtro aire $13.000 · M.obra $38.000', total:'$88.500', h:'Dado 15mm · Torquímetro · Extractor' },
  Honda:      { items:'Filtro aceite $5.800 · Aceite 0W-20 4L $28.000 · Filtro aire $13.500 · M.obra $35.000', total:'$82.300', h:'Dado 17mm · Torquímetro 25 Nm' },
};

// ===== CONSULTA DE PATENTE =====
function setPatente(pat) {
  const i = document.getElementById('pat-in');
  if (i) { i.value = pat; consultarPatente(pat); }
}

async function consultarPatente(val) {
  const pat = (typeof val === 'string' ? val : '')
    .toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (pat.length < 4) {
    _setPatStatus('error', 'Ingresa al menos 4 caracteres.');
    return;
  }

  const pi = document.getElementById('pat-in');
  if (pi) {
    pi.style.borderColor = 'var(--border-warning)';
    pi.style.background  = 'var(--bg-warning)';
  }
  _setPatStatus('loading', 'Consultando registro… <span class="spin" style="display:inline-block;width:10px;height:10px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite;vertical-align:-2px"></span>');

  let datos = null;
  let fuenteDatos = '';

  // --- APIs en orden de preferencia ---
  const APIS = [
    {
      url: 'https://api.vehiculos.cl/patente/' + pat,
      map: d => ({
        marca:  d.marca  || d.brand                           || '—',
        modelo: d.modelo || d.model                          || '—',
        anio:   String(d.anio || d.año || d.year             || '—'),
        motor:  d.motor  || d.engine                         || '—',
        comb:   d.combustible || d.fuel                      || '—',
        tipo:   d.tipo   || d.type || d.carroceria           || '—',
        vin:    d.vin    || d.chasis || d.chassis            || '—',
        nmotor: d.nmotor || d.numero_motor || d.motor_number || '—',
      }),
    },
    {
      url: 'https://rut.buscador.cl/api/vehiculo?patente=' + pat,
      map: d => ({
        marca:  d.marca  || d.brand                           || '—',
        modelo: d.modelo || d.model                          || '—',
        anio:   String(d.anio || d.año || d.year             || '—'),
        motor:  d.motor  || d.engine                         || '—',
        comb:   d.combustible || d.fuel                      || '—',
        tipo:   d.tipo   || d.type || d.carroceria           || '—',
        vin:    d.vin    || d.chasis || d.chassis            || '—',
        nmotor: d.nmotor || d.numero_motor || d.motor_number || '—',
      }),
    },
  ];

  for (const api of APIS) {
    if (datos) break;
    try {
      console.log('[patente] consultando →', api.url);
      const ctrl  = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const resp  = await fetch(api.url, { signal: ctrl.signal });
      clearTimeout(timer);
      console.log('[patente] HTTP', resp.status, api.url);
      if (!resp.ok) continue;

      const json = await resp.json();
      console.log('[patente] JSON:', json);

      // Acepta { data: {...} } o la raíz directa
      const d = json.data || json;
      if (d && (d.marca || d.brand || d.make || d.modelo || d.model)) {
        datos = api.map(d);
        fuenteDatos = 'API';
        console.log('[patente] datos mapeados:', datos);
      }
    } catch (e) {
      console.warn('[patente] CATCH', api.url, '—', e.name, e.message);
    }
  }

  // --- Fallback a datos demo ---
  if (!datos && DB_PAT[pat]) {
    datos = DB_PAT[pat];
    fuenteDatos = 'demo';
  }

  // --- Mostrar resultado ---
  if (datos) {
    if (pi) {
      pi.style.borderColor = 'var(--fill-success)';
      pi.style.background  = 'var(--bg-success)';
    }
    const fuente = fuenteDatos === 'demo'
      ? ' <span style="font-size:9px;opacity:.6">(datos demo)</span>'
      : '';
    _setPatStatus('ok', `Vehículo encontrado — <strong>${pat}</strong>${fuente}`);
    _llenarVehiculo(datos);

    const vd = document.getElementById('vehiculo-datos');
    const cd = document.getElementById('cliente-datos');
    if (vd) vd.style.display = 'block';
    if (cd) cd.style.display = 'block';

    _mostrarPreCot(datos);
    _checkClienteExistente(pat);
  } else {
    // --- Ambas APIs fallaron: mostrar formulario manual ---
    if (pi) {
      pi.style.borderColor = 'var(--border-warning)';
      pi.style.background  = 'var(--surface-1)';
    }
    _setPatStatus('error',
      'No se encontraron datos para <strong>' + pat + '</strong>. ' +
      'Ingresa los datos del vehículo manualmente.'
    );

    // Mostrar sección de vehículo con campos desbloqueados para edición manual
    const vd = document.getElementById('vehiculo-datos');
    const cd = document.getElementById('cliente-datos');
    if (vd) {
      vd.style.display = 'block';
      // Desbloquear todos los campos del vehículo para ingreso manual
      vd.querySelectorAll('input[readonly]').forEach(el => el.removeAttribute('readonly'));
    }
    if (cd) cd.style.display = 'block';
  }
}


function _setPatStatus(type, msg) {
  const st = document.getElementById('pat-status');
  if (!st) return;
  const icons = {
    loading: '',
    ok:    '<i class="ti ti-circle-check" style="font-size:12px;vertical-align:-2px;margin-right:3px"></i>',
    error: '<i class="ti ti-alert-circle"  style="font-size:12px;vertical-align:-2px;margin-right:3px"></i>',
  };
  const colors = { loading:'var(--text-muted)', ok:'var(--text-success)', error:'var(--text-danger)' };
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

  // Sugerir proveedor con esa marca desde localStorage
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
  const km     =  document.getElementById('c-km')?.value      || '';
  const tecnico=  document.getElementById('c-tec')?.value     || '';
  const serv   =  document.getElementById('c-serv')?.value    || '';
  const notas  =  document.getElementById('c-notas')?.value   || '';
  const marca  =  document.getElementById('v-marca')?.value   || '';
  const modelo =  document.getElementById('v-modelo')?.value  || '';
  const anio   =  document.getElementById('v-anio')?.value    || '';
  const vin    =  document.getElementById('v-vin')?.textContent || '—';

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
    if (rut) cli.rut = rut;
    if (wz)  cli.wz  = wz;
    if (mail) cli.mail = mail;
    if (pat && !cli.patentes.includes(pat)) cli.patentes.push(pat);
  }

  // Crear OT
  const ots = APP.lsGet('mp_ots', []);
  const num = Math.max(41, ...ots.map(o => o.num || 0)) + 1;
  const id  = '#' + String(num).padStart(4, '0');
  const ot  = {
    id, num, patente: pat, marca, modelo, anio, vin,
    clienteId: cli.id, clienteNombre: nombre, rut, wz, mail, km,
    tecnico, servicio: serv, notas,
    estado: 'agendado',
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
  ['c-nombre','c-rut','c-wz','c-mail','c-notas'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const km = document.getElementById('c-km'); if (km) km.value = '';
  ['v-marca','v-modelo','v-anio','v-motor','v-comb','v-tipo','v-nmotor'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const vin = document.getElementById('v-vin'); if (vin) vin.textContent = '—';
  const pi  = document.getElementById('pat-in');
  if (pi) { pi.value = ''; pi.style.borderColor = ''; pi.style.background = ''; }

  const vd = document.getElementById('vehiculo-datos'); if (vd) vd.style.display = 'none';
  const cd = document.getElementById('cliente-datos');  if (cd) cd.style.display  = 'none';
  const pb = document.getElementById('precot-box');     if (pb) pb.style.display  = 'none';

  _setPatStatus('loading', 'Ingresa la patente para auto-completar datos del vehículo.');
  const st = document.getElementById('pat-status');
  if (st) st.style.color = 'var(--text-muted)';
}
