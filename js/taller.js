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
  renderListaOTs();
  renderClientes();
  _ssInitTodos();
  // ESC cierra modales de OT y también los dropdowns abiertos
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (_ssCloseAll()) return; // si cerró algún dropdown, no propagar
      const nueva = document.getElementById('ot-nueva');
      if (nueva && nueva.style.display === 'flex') { cerrarFormNuevaOT(); return; }
      const det = document.getElementById('ot-detalle');
      if (det && det.style.display === 'flex') { volverListaOT(); }
    }
  });
  // Cerrar dropdowns al hacer click fuera
  document.addEventListener('click', e => {
    if (!e.target.closest('.ss') && !e.target.closest('.ss-drop')) _ssCloseAll();
  });
}

// ===========================
// SMART SELECTOR (SS) SYSTEM
// ===========================

// ---- Datos ----
const _SS_TIPOS = ['Automóvil','Camioneta','SUV','Furgón','Bus','Camión','Moto','Bicicleta','Bici/Moto Eléctrica','Autobus','Campero','Autohormigonera','Barredora','Brazo Articulado','Brazo Excavador','Cargador Frontal'];
const _SS_MARCAS = ['Abarth','Alfa Romeo','Audi','BRP','CHANA','Chery','Chevrolet','Citroën','Daewoo','Fiat','Ford','Geely','Great Wall','Honda','Hyundai','JAC','Jeep','Kia','Lifan','Mazda','Mercedes-Benz','MG','Mini','Mitsubishi','Nissan','Peugeot','RAM','Renault','Seat','Skoda','Subaru','Suzuki','Toyota','Volkswagen','Volvo','ZNA'];
const _SS_ANIOS = Array.from({length:38}, (_,i) => String(2027-i)); // 2027 → 1990
const _SS_REGIONES = [
  {val:'arica-parinacota', label:'Arica y Parinacota'},
  {val:'tarapaca',         label:'Tarapacá'},
  {val:'antofagasta',      label:'Antofagasta'},
  {val:'atacama',          label:'Atacama'},
  {val:'coquimbo',         label:'Coquimbo'},
  {val:'valparaiso',       label:'Valparaíso'},
  {val:'metropolitana',    label:'Metropolitana de Santiago'},
  {val:'ohiggins',         label:"O'Higgins"},
  {val:'maule',            label:'Maule'},
  {val:'nuble',            label:'Ñuble'},
  {val:'biobio',           label:'Biobío'},
  {val:'araucania',        label:'La Araucanía'},
  {val:'los-rios',         label:'Los Ríos'},
  {val:'los-lagos',        label:'Los Lagos'},
  {val:'aysen',            label:'Aysén'},
  {val:'magallanes',       label:'Magallanes y Antártica'},
];
const _SS_CIUDADES = {
  'arica-parinacota': ['Arica','Putre','General Lagos'],
  'tarapaca':    ['Iquique','Alto Hospicio','Pozo Almonte','Pica'],
  'antofagasta': ['Antofagasta','Calama','Tocopilla','Mejillones','Taltal'],
  'atacama':     ['Copiapó','Vallenar','Chañaral','Caldera','Freirina'],
  'coquimbo':    ['La Serena','Coquimbo','Ovalle','Illapel','Los Vilos','Combarbalá'],
  'valparaiso':  ['Valparaíso','Viña del Mar','Concón','Quilpué','Villa Alemana','San Antonio','Quillota','La Calera','Los Andes','San Felipe','Casablanca','Cartagena','El Quisco','El Tabo','Algarrobo','Santo Domingo','Limache','Olmué','La Ligua','Papudo','Zapallar','Petorca','Cabildo','La Cruz','Hijuelas','Nogales','Rinconada','Putaendo','Santa María','San Esteban','Isla de Pascua'],
  'metropolitana':['Santiago','Providencia','Las Condes','Ñuñoa','Maipú','Pudahuel','Quilicura','Recoleta','Independencia','San Bernardo','La Florida','Puente Alto','Vitacura','La Reina','Peñalolén','Lo Barnechea','Renca','Cerrillos','Cerro Navia','Conchalí','El Bosque','Estación Central','Huechuraba','La Cisterna','La Granja','La Pintana','Lo Espejo','Macul','Padre Hurtado'],
  'ohiggins':    ['Rancagua','San Fernando','Pichilemu','Rengo','Machalí'],
  'maule':       ['Talca','Curicó','Linares','Constitución','Cauquenes','San Javier'],
  'nuble':       ['Chillán','Chillán Viejo','San Carlos','Bulnes','Yungay'],
  'biobio':      ['Concepción','Talcahuano','Los Ángeles','San Pedro de la Paz','Coronel'],
  'araucania':   ['Temuco','Villarrica','Pucón','Angol','Victoria','Nueva Imperial','Lautaro'],
  'los-rios':    ['Valdivia','La Unión','Río Bueno','Panguipulli'],
  'los-lagos':   ['Puerto Montt','Osorno','Castro','Ancud','Puerto Varas'],
  'aysen':       ['Coyhaique','Puerto Aysén','Chile Chico','Cochrane'],
  'magallanes':  ['Punta Arenas','Puerto Natales','Puerto Williams','Porvenir'],
};

// ---- Estado global ----
const _SS = {};

// ---- Core ----
function _ssInit(id, opciones, onChange, opts = {}) {
  _SS[id] = { opciones: opciones.slice(), onChange, opts, val: '', label: '' };
}

function _ssTrig(id) {
  const trig = document.getElementById('ss-' + id + '-trig');
  const drop = document.getElementById('ss-' + id + '-drop');
  if (!drop || !_SS[id]) return;
  const isOpen = drop.style.display !== 'none';
  _ssCloseAll();
  if (isOpen) return;
  // Posicionar como fixed para escapar del overflow del modal
  if (trig) {
    const r = trig.getBoundingClientRect();
    drop.style.position = 'fixed';
    drop.style.top   = (r.bottom + 3) + 'px';
    drop.style.left  = r.left + 'px';
    drop.style.width = r.width + 'px';
    drop.style.right = 'auto';
  }
  _ssRenderList(id, '');
  drop.style.display = 'flex';
  if (trig) trig.classList.add('open');
  const q = document.getElementById('ss-' + id + '-q');
  if (q) { q.value = ''; setTimeout(() => q.focus(), 30); }
}

function _ssCloseAll() {
  let alguno = false;
  document.querySelectorAll('.ss-drop').forEach(d => { if (d.style.display !== 'none') { d.style.display = 'none'; alguno = true; } });
  document.querySelectorAll('.ss-trig').forEach(t => t.classList.remove('open'));
  return alguno;
}

function _ssQ(id) {
  const q = document.getElementById('ss-' + id + '-q');
  _ssRenderList(id, q ? q.value : '');
}

function _ssRenderList(id, filtro) {
  const state = _SS[id];
  const list  = document.getElementById('ss-' + id + '-list');
  if (!state || !list) return;
  const q = filtro.toLowerCase().trim();
  const items = q
    ? state.opciones.filter(o => (typeof o === 'string' ? o : (o.label || o.val || '')).toLowerCase().includes(q))
    : state.opciones;

  let html = items.map(o => {
    const val   = typeof o === 'string' ? o : (o.val   || o.label);
    const label = typeof o === 'string' ? o : (o.label || o.val);
    const meta  = typeof o === 'object' && o.meta ? `<span class="ss-meta">${_tallerEsc(o.meta)}</span>` : '';
    return `<div class="ss-item" tabindex="0"
      onclick="_ssSelect('${id}','${_escSS(val)}','${_escSS(label)}')"
      onkeydown="if(event.key==='Enter')_ssSelect('${id}','${_escSS(val)}','${_escSS(label)}')"
    >${_tallerEsc(label)}${meta}</div>`;
  }).join('');

  if (!html) {
    if (state.opts.permitirNuevo && q) {
      html = `<div class="ss-item ss-new" onclick="_ssAgregar('${id}','${_escSS(filtro)}')">＋ Agregar &ldquo;${_tallerEsc(filtro)}&rdquo;</div>`;
    } else {
      html = '<div class="ss-item ss-empty">Sin resultados</div>';
    }
  } else if (state.opts.permitirNuevo && q) {
    const exacto = items.find(o => (typeof o === 'string' ? o : (o.label || o.val)).toLowerCase() === q);
    if (!exacto) html += `<div class="ss-item ss-new" onclick="_ssAgregar('${id}','${_escSS(filtro)}')">＋ Agregar &ldquo;${_tallerEsc(filtro)}&rdquo;</div>`;
  }
  list.innerHTML = html;
}

function _escSS(s) { return (s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }

function _ssSelect(id, val, label) {
  const state = _SS[id];
  if (!state) return;
  state.val   = val;
  state.label = label;
  const valEl = document.getElementById('ss-' + id + '-val');
  if (valEl) { valEl.textContent = label; valEl.classList.remove('ss-placeholder'); }
  const inp = document.getElementById(id);
  if (inp) inp.value = val;
  _ssCloseAll();
  if (state.onChange) state.onChange(val, label);
}

function _ssAgregar(id, val) {
  const t = (val || '').trim();
  if (!t || !_SS[id]) return;
  const existe = _SS[id].opciones.find(o => (typeof o === 'string' ? o : (o.label||o.val)).toLowerCase() === t.toLowerCase());
  if (!existe) _SS[id].opciones.push(t);
  _ssSelect(id, t, t);
}

function _ssSetVal(id, val, label) {
  const state = _SS[id];
  if (!state) return;
  state.val   = val   || '';
  state.label = label || val || '';
  const placeholder = state.opts.noSelText || '— Selecciona —';
  const valEl = document.getElementById('ss-' + id + '-val');
  if (valEl) {
    valEl.textContent = state.label || placeholder;
    valEl.classList.toggle('ss-placeholder', !state.label);
  }
  const inp = document.getElementById(id);
  if (inp) inp.value = val || '';
}

function _ssGetVal(id) { return (_SS[id] || {}).val || ''; }

function _ssReset(id) {
  const state = _SS[id];
  if (!state) return;
  const placeholder = state.opts.noSelText || '— Selecciona —';
  state.val = ''; state.label = '';
  const valEl = document.getElementById('ss-' + id + '-val');
  if (valEl) { valEl.textContent = placeholder; valEl.classList.add('ss-placeholder'); }
  const inp = document.getElementById(id);
  if (inp) inp.value = '';
}

// ---- Obtener opciones de técnicos desde mp_operarios ----
function _ssTecOps() {
  const ops  = APP.lsGet('mp_operarios', []);
  const lista = [{ val: '', label: 'Sin asignar' }];
  ops.filter(o => o.activo !== false).forEach(o => lista.push({ val: o.nombre || o.id, label: o.nombre || o.id }));
  // Fallback si no hay operarios configurados
  if (!ops.length) ['Pedro Ramírez','Javier Muñoz','Luis González','Roberto Araya'].forEach(n => lista.push({ val: n, label: n }));
  return lista;
}

// ---- Inicializar todos los SS de la OT ----
function _ssInitTodos() {
  _ssInit('n-tipo',   _SS_TIPOS.slice(), null, { permitirNuevo: true, noSelText: '— Tipo de vehículo —' });
  _ssInit('n-marca',  _SS_MARCAS.slice(), null, { permitirNuevo: true, noSelText: '— Selecciona marca —' });
  _ssInit('n-anio',   _SS_ANIOS.slice(),  null, { noSelText: '— Año —' });
  _ssInit('n-tec',    _ssTecOps(),        null, { noSelText: 'Sin asignar' });
  _ssInit('n-region', _SS_REGIONES.slice(), (val) => {
    // Actualizar ciudades cuando cambia la región
    const ciudades = _SS_CIUDADES[val] || [];
    if (_SS['n-ciudad']) _SS['n-ciudad'].opciones = ciudades.slice();
    _ssReset('n-ciudad');
  }, { noSelText: '— Región —' });
  _ssInit('n-ciudad', (_SS_CIUDADES['valparaiso'] || []).slice(), null, { permitirNuevo: true, noSelText: '— Ciudad —' });
  _ssInit('n-cli', [], null, { noSelText: 'Buscar por nombre / RUT / WhatsApp…' });
  // Pre-seleccionar Valparaíso
  setTimeout(() => _ssSelect('n-region', 'valparaiso', 'Valparaíso'), 0);
}

// ---- Búsqueda de cliente en nueva OT ----
function _ssCliFilter() {
  const q    = (document.getElementById('ss-n-cli-q')?.value || '').toLowerCase().trim();
  const list = document.getElementById('ss-n-cli-list');
  if (!list) return;
  if (!q) { list.innerHTML = '<div class="ss-item ss-empty">Escribe para buscar…</div>'; return; }
  const clientes = APP.lsGet('mp_clientes', []);
  const matches  = clientes.filter(c =>
    (c.nombre || '').toLowerCase().includes(q) ||
    (c.rut    || '').toLowerCase().includes(q) ||
    (c.wz     || '').toLowerCase().includes(q)
  ).slice(0, 8);
  if (!matches.length) {
    list.innerHTML = '<div class="ss-item ss-empty">Sin resultados — completa los datos manualmente</div>';
    return;
  }
  list.innerHTML = matches.map(c => {
    const pat = (c.patentes || []).join(', ');
    return `<div class="ss-item" style="flex-direction:column;align-items:flex-start;gap:2px" onclick="_ssCliSelect('${_escSS(c.id)}')">
      <span style="font-weight:500">${_tallerEsc(c.nombre||'—')}</span>
      <span class="ss-meta" style="margin-left:0;font-size:10px">${[c.rut?'RUT '+c.rut:'', c.wz||'', pat].filter(Boolean).join(' · ')}</span>
    </div>`;
  }).join('');
}

function _ssCliSelect(cliId) {
  const c = (APP.lsGet('mp_clientes', [])).find(cl => cl.id === cliId);
  if (!c) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  set('n-nombre', c.nombre); set('n-rut', c.rut);
  set('n-wz', c.wz);        set('n-mail', c.mail);
  if (c.region) _ssSetVal('n-region', c.region, (_SS_REGIONES.find(r => r.val === c.region) || {}).label || c.region);
  if (c.ciudad) _ssSetVal('n-ciudad', c.ciudad, c.ciudad);
  const valEl = document.getElementById('ss-n-cli-val');
  if (valEl) { valEl.textContent = c.nombre || '—'; valEl.classList.remove('ss-placeholder'); }
  _ssCloseAll();
}

// ---- Dropdown inline para servicios en nueva OT ----
function _ssServInput(i, val) {
  if (_nOTServsItems[i] !== undefined) _nOTServsItems[i].nombre = val;
  const drop  = document.getElementById('n-svc-d-' + i);
  const listEl = document.getElementById('n-svc-dl-' + i);
  if (!drop || !listEl) return;
  const q    = (val || '').toLowerCase().trim();
  const svcs = APP.lsGet('mp_servicios', []);
  if (!svcs.length || !q) { drop.style.display = 'none'; return; }
  const matches = svcs.filter(s => (s.nombre || '').toLowerCase().includes(q)).slice(0, 10);
  if (!matches.length) { drop.style.display = 'none'; return; }
  // Posicionar como fixed
  const inp = document.getElementById('n-svc-i-' + i);
  if (inp) {
    const r = inp.getBoundingClientRect();
    drop.style.position = 'fixed';
    drop.style.top   = (r.bottom + 2) + 'px';
    drop.style.left  = r.left + 'px';
    drop.style.width = r.width + 'px';
    drop.style.right = 'auto';
  }
  listEl.innerHTML = matches.map(s => {
    const precio = s.precioFijo ? '$' + Number(s.precioFijo).toLocaleString('es-CL') : '';
    const horas  = s.horasEst   ? s.horasEst + 'h' : '';
    const meta   = [horas, precio].filter(Boolean).join(' · ');
    return `<div class="ss-item" style="justify-content:space-between"
      onmousedown="_ssServPick(${i},'${_escSS(s.nombre)}')">
      <span>${_tallerEsc(s.nombre)}</span>
      ${meta ? `<span class="ss-meta">${meta}</span>` : ''}
    </div>`;
  }).join('');
  drop.style.display = 'flex';
}

function _ssServPick(i, nombre) {
  const inp = document.getElementById('n-svc-i-' + i);
  if (inp) inp.value = nombre;
  const drop = document.getElementById('n-svc-d-' + i);
  if (drop) drop.style.display = 'none';
  _nOTServSync(i, nombre);
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
  abrirFormNuevaOT();
  const i = document.getElementById('n-patente');
  if (i) { i.value = pat; consultarPatenteNueva(); }
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

// ===== NUEVA OT: overlay form state =====
let _nOTServsItems = [];
let _nOTRepsItems  = [];

function abrirFormNuevaOT() {
  _resetFormNuevaOT();
  const listado = document.getElementById('ot-listado');
  if (listado) listado.style.display = 'none';
  const el = document.getElementById('ot-nueva');
  if (el) { el.style.display = 'flex'; }
}

function cerrarFormNuevaOT() {
  const el = document.getElementById('ot-nueva');
  if (el) el.style.display = 'none';
  const listado = document.getElementById('ot-listado');
  if (listado) listado.style.display = '';
  window.scrollTo(0, 0);
}

function _resetFormNuevaOT() {
  ['n-patente','n-modelo','n-color','n-km',
   'n-nombre','n-rut','n-wz','n-mail',
   'n-fecha','n-hora','n-hora-entrada','n-hora-salida','n-notas',
   'n-marca','n-anio','n-tipo','n-tec','n-region','n-ciudad'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  // Resetear displays de smart selectors
  ['n-tipo','n-marca','n-anio','n-cli'].forEach(_ssReset);
  // Técnico: refrescar desde mp_operarios y resetear
  if (_SS['n-tec']) _SS['n-tec'].opciones = _ssTecOps();
  _ssReset('n-tec');
  // Región default: Valparaíso
  if (_SS['n-ciudad']) _SS['n-ciudad'].opciones = (_SS_CIUDADES['valparaiso'] || []).slice();
  _ssSelect('n-region', 'valparaiso', 'Valparaíso');
  _ssReset('n-ciudad');
  const est = document.getElementById('n-estado');
  if (est) est.value = 'agendado';
  const st = document.getElementById('n-pat-status');
  if (st) st.textContent = '';
  const ch = document.getElementById('crm-hist-box');
  if (ch) ch.style.display = 'none';
  _nOTServsItems = [{ nombre: '', horas: 0, valor: 0 }];
  _nOTRepsItems  = [];
  _nOTServRender();
  _nOTRepRender();
}

// --- servicios en nueva OT ---
function _nOTServRender() {
  const lista = document.getElementById('n-serv-lista');
  if (!lista) return;
  const svcs = APP.lsGet('mp_servicios', []);
  if (!svcs.length && !_nOTServsItems.length) {
    lista.innerHTML = '<div style="font-size:10px;color:var(--text-muted);padding:4px 0">No hay servicios configurados. Ve a <strong>Admin &rsaquo; Configuración</strong> para agregarlos.</div>';
    return;
  }
  lista.innerHTML = _nOTServsItems.map((item, i) => `
    <div style="border:0.5px solid var(--border);border-radius:var(--radius);padding:8px;background:var(--surface-1);margin-bottom:6px">
      <div style="display:flex;gap:4px;align-items:center;margin-bottom:6px">
        <div style="position:relative;flex:1">
          <input id="n-svc-i-${i}" value="${_tallerEsc(item.nombre)}" placeholder="Buscar servicio del catálogo…"
            style="width:100%;box-sizing:border-box;font-size:11px;border:0.5px solid var(--border);border-radius:var(--radius);padding:5px 8px;background:var(--surface-0);color:var(--text-primary)"
            oninput="_ssServInput(${i},this.value)"
            onfocus="_ssServInput(${i},this.value)"
            onblur="setTimeout(()=>{const d=document.getElementById('n-svc-d-${i}');if(d)d.style.display='none'},180)"
            onchange="_nOTServSync(${i},this.value)">
          <div id="n-svc-d-${i}" class="ss-drop" style="display:none">
            <div class="ss-list" id="n-svc-dl-${i}"></div>
          </div>
        </div>
        <button class="btn" style="padding:2px 5px;font-size:11px;flex-shrink:0" onclick="nOTServElim(${i})"><i class="ti ti-x"></i></button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;font-size:11px">
        <span style="color:var(--text-muted)">⏱ <span id="n-svc-h-${i}">${item.horas ? item.horas + 'h' : '—'}</span></span>
        <span style="flex:1"></span>
        <label style="color:var(--text-secondary);white-space:nowrap">Valor $</label>
        <input type="number" id="n-svc-v-${i}" value="${item.valor || ''}" placeholder="0"
          style="width:90px;font-size:11px;border:0.5px solid var(--border);border-radius:var(--radius);padding:3px 6px;background:var(--surface-0);color:var(--text-primary);text-align:right"
          oninput="_nOTValorSync(${i},this.value)">
      </div>
    </div>`).join('') || '<div style="color:var(--text-muted);font-size:10px;padding:4px 0">Sin servicios — usa el botón +.</div>';
  _nOTRecalcTotal();
}

function _nOTServSync(i, val) {
  if (_nOTServsItems[i]) _nOTServsItems[i].nombre = val;

  const catalogo = APP.lsGet('mp_servicios', []);
  if (!catalogo.length) return;
  const svc = catalogo.find(s => s.nombre.trim().toLowerCase() === val.trim().toLowerCase());
  if (!svc) return;

  // Autocompletar horas estimadas
  if (svc.horasEst && _nOTServsItems[i]) {
    _nOTServsItems[i].horas = svc.horasEst;
    const hEl = document.getElementById('n-svc-h-' + i);
    if (hEl) hEl.textContent = svc.horasEst + 'h';
  }

  // Autocompletar precio fijo del catálogo
  const precio = svc.precioFijo || 0;
  const precioFinal = (svc.precioConIva && precio) ? Math.round(precio * 1.19) : precio;
  if (precioFinal && _nOTServsItems[i]) {
    _nOTServsItems[i].valor = precioFinal;
    const vEl = document.getElementById('n-svc-v-' + i);
    if (vEl) vEl.value = precioFinal;
    _nOTRecalcTotal();
  }

  // Autocompletar repuestos sugeridos
  if (!svc.repuestosSugeridos || !svc.repuestosSugeridos.length) return;
  const existentes = _nOTRepsItems.map(r => (r.desc || '').trim().toLowerCase());
  let agregados = 0;
  svc.repuestosSugeridos.forEach(rep => {
    const nombre = (rep.nombre || '').trim();
    if (!nombre || existentes.includes(nombre.toLowerCase())) return;
    _nOTRepsItems.push({ desc: nombre + (rep.cantidad && rep.cantidad !== 1 ? ' x' + rep.cantidad : ''), precio: 0 });
    agregados++;
  });
  if (agregados > 0) _nOTRepRender();
}

function nOTServAdd() {
  _nOTServsItems.push({ nombre: '', horas: 0, valor: 0 });
  _nOTServRender();
}

function _nOTValorSync(i, val) {
  if (_nOTServsItems[i]) _nOTServsItems[i].valor = parseInt(val) || 0;
  _nOTRecalcTotal();
}

function _nOTRecalcTotal() {
  const total = _nOTServsItems.reduce((s, it) => s + (parseInt(it.valor) || 0), 0);
  const el = document.getElementById('n-valor-total');
  if (!el) return;
  if (total > 0) {
    el.textContent = 'Total M.O.: $' + total.toLocaleString('es-CL');
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

function nOTServElim(i) {
  _nOTServsItems.splice(i, 1);
  _nOTServRender();
}

// --- repuestos en nueva OT ---
function _nOTRepRender() {
  const lista = document.getElementById('n-rep-lista');
  if (!lista) return;
  lista.innerHTML = _nOTRepsItems.map((item, i) => `
    <div style="display:flex;gap:4px;align-items:center">
      <input value="${_tallerEsc(item.desc)}" placeholder="Descripción"
        style="flex:1;font-size:11px;border:0.5px solid var(--border);border-radius:var(--radius);padding:4px 7px;background:var(--surface-1);color:var(--text-primary)"
        oninput="_nOTRepSync(${i},'desc',this.value)">
      <input type="number" value="${item.precio || ''}" placeholder="$"
        style="width:80px;font-size:11px;border:0.5px solid var(--border);border-radius:var(--radius);padding:4px 7px;background:var(--surface-1);color:var(--text-primary);text-align:right"
        oninput="_nOTRepSync(${i},'precio',this.value)">
      <button class="btn" style="padding:2px 5px;font-size:11px;flex-shrink:0" onclick="nOTRepElim(${i})"><i class="ti ti-x"></i></button>
    </div>`).join('') || '<div style="color:var(--text-muted);font-size:10px;padding:4px 0">Sin repuestos.</div>';
}

function _nOTRepSync(i, campo, val) {
  if (_nOTRepsItems[i]) _nOTRepsItems[i][campo] = campo === 'precio' ? (parseInt(val) || 0) : val;
}

function nOTRepAdd() {
  _nOTRepsItems.push({ desc: '', precio: 0 });
  _nOTRepRender();
}

function nOTRepElim(i) {
  _nOTRepsItems.splice(i, 1);
  _nOTRepRender();
}

// --- consultar patente desde nueva OT (no bloqueante) ---
function consultarPatenteNueva() {
  const pat = (document.getElementById('n-patente')?.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const st  = document.getElementById('n-pat-status');
  if (!pat) { if (st) st.textContent = ''; return; }

  const datos = _patGet(pat);
  if (datos) {
    const set = (id, v) => { const el = document.getElementById(id); if (el && !el.value) el.value = v || ''; };
    set('n-modelo', datos.modelo);
    // SS fields: usar _ssSetVal solo si aún no hay valor seleccionado
    if (datos.marca && !_ssGetVal('n-marca')) _ssSetVal('n-marca', datos.marca, datos.marca);
    if (datos.anio  && !_ssGetVal('n-anio'))  _ssSetVal('n-anio',  datos.anio,  datos.anio);
    if (datos.tipo  && !_ssGetVal('n-tipo'))  _ssSetVal('n-tipo',  datos.tipo,  datos.tipo);
    if (st) { st.style.color = 'var(--text-success)'; st.textContent = '✓ Vehículo encontrado — datos auto-completados.'; }
    _checkClienteExistenteNueva(pat);
  } else {
    if (st) { st.style.color = 'var(--text-muted)'; st.textContent = 'Patente no encontrada — rellena los datos manualmente.'; }
  }
  _crmRenderFormulario(pat);
}

function _checkClienteExistenteNueva(pat) {
  const clientes = APP.lsGet('mp_clientes', []);
  const cli = clientes.find(c => Array.isArray(c.patentes) && c.patentes.includes(pat));
  if (!cli) return;
  const fill = (id, val) => { const el = document.getElementById(id); if (el && !el.value) el.value = val || ''; };
  fill('n-nombre', cli.nombre);
  fill('n-rut',    cli.rut);
  fill('n-wz',     cli.wz);
  fill('n-mail',   cli.mail);
}

// ===== CREAR OT =====
function crearOT() {
  const g = id => (document.getElementById(id)?.value || '').trim();

  const pat    = g('n-patente').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const nombre = g('n-nombre');

  if (!pat && !nombre) {
    APP.toast.show('⚠️ Ingresa al menos la patente o el nombre del cliente.', 'warning');
    return;
  }

  const marca  = g('n-marca');
  const modelo = g('n-modelo');
  const anio   = g('n-anio');
  const tipo   = g('n-tipo');
  const color  = g('n-color');
  const km     = g('n-km');
  const rut    = g('n-rut');
  const wz     = g('n-wz');
  const mail   = g('n-mail');
  const region = g('n-region');
  const ciudad = g('n-ciudad');
  const tecnico     = g('n-tec')    || '';
  const estadoSel   = document.getElementById('n-estado')?.value || 'agendado';
  const fecha       = g('n-fecha');
  const hora        = g('n-hora');
  const horaEntrada = g('n-hora-entrada');
  const horaSalida  = g('n-hora-salida');
  const notas       = g('n-notas');

  // Build service string from items list
  const servsItems  = _nOTServsItems.filter(s => (s.nombre || '').trim());
  const servicioStr = servsItems.map(s => s.nombre).join(' · ');
  const valorTotal  = servsItems.reduce((s, it) => s + (parseInt(it.valor) || 0), 0);

  // Build repuestos
  const repsItems   = _nOTRepsItems.filter(r => (r.desc || '').trim());
  const repuestosStr = repsItems.map(r => r.desc + (r.precio ? ' $' + Number(r.precio).toLocaleString('es-CL') : '')).join('\n');

  // Save vehicle to local DB
  if (pat && marca) {
    _patSave(pat, { marca, modelo, anio, tipo, motor: '', comb: '', vin: '—', nmotor: '' });
  }

  // Dedup client by RUT or patente
  const clientes = APP.lsGet('mp_clientes', []);
  let cli = clientes.find(c =>
    (rut && c.rut === rut) ||
    (pat && Array.isArray(c.patentes) && c.patentes.includes(pat))
  );
  if (!cli) {
    cli = { id: 'cli-' + Date.now(), nombre, rut, wz, mail, km, region, ciudad, patentes: pat ? [pat] : [], otIds: [], creado: new Date().toISOString() };
    clientes.push(cli);
  } else {
    if (nombre) cli.nombre = nombre;
    if (rut)    cli.rut    = rut;
    if (wz)     cli.wz     = wz;
    if (mail)   cli.mail   = mail;
    if (region) cli.region = region;
    if (ciudad) cli.ciudad = ciudad;
    if (pat && !cli.patentes.includes(pat)) cli.patentes.push(pat);
  }

  // Estado OT
  const estado = estadoSel === 'en-proceso' ? 'en-proceso'
               : estadoSel === 'cotizacion' ? 'cotizacion'
               : 'agendado';

  // Historial inicial
  const ahora = new Date();
  const historial = [{
    estado: 'creado', label: 'OT creada', emoji: '📋',
    ts:    ahora.toISOString(),
    hora:  ahora.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' }),
    fecha: ahora.toLocaleDateString('es-CL'),
  }];
  if (estadoSel === 'en-proceso') {
    historial.push({ estado: 'llego', label: 'Cliente llegó', emoji: '✅',
      ts: ahora.toISOString(),
      hora: ahora.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' }),
      fecha: ahora.toLocaleDateString('es-CL'),
      horaEntrada: horaEntrada || ahora.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' }),
    });
  }

  // Tiempos reales si se ingresaron horas
  let entrada_ts = null, tiempoReal = null;
  if (horaEntrada) {
    const [hh, mm] = horaEntrada.split(':').map(Number);
    const base = fecha ? new Date(fecha + 'T00:00') : new Date();
    base.setHours(hh, mm, 0, 0);
    entrada_ts = base.toISOString();
  }
  if (horaEntrada && horaSalida) {
    const [eh, em] = horaEntrada.split(':').map(Number);
    const [sh, sm] = horaSalida.split(':').map(Number);
    const diff = (sh * 60 + sm) - (eh * 60 + em);
    if (diff > 0) tiempoReal = diff;
  }

  // Crear OT
  const ots = APP.lsGet('mp_ots', []);
  const num = Math.max(41, ...ots.map(o => o.num || 0)) + 1;
  const id  = '#' + String(num).padStart(4, '0');
  const ot  = {
    id, num, patente: pat, marca, modelo, anio, tipo, color, motor: '', comb: '', vin: '—', nmotor: '',
    clienteId: cli.id, clienteNombre: nombre || cli.nombre, rut, wz, mail, km, region, ciudad,
    tecnico, servicio: servicioStr, serviciosItems: servsItems,
    valor: valorTotal || 0,
    notas, fechaCita: fecha, horaCita: hora,
    estadoCita: estadoSel, historial, estado,
    creado: ahora.toISOString(),
    repuestos: repuestosStr, repuestosItems: repsItems,
    entrada_ts, horaEntrada, horaSalida, tiempoReal,
  };

  ots.push(ot);
  cli.otIds = [...(cli.otIds || []), id];
  APP.lsSet('mp_ots', ots);
  APP.lsSet('mp_clientes', clientes);

  cerrarFormNuevaOT();
  renderListaOTs();
  APP.toast.show('✓ OT ' + id + ' creada correctamente', 'success');
  abrirDetalleOT(id);
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

function renderListaOTs(filtro) {
  const tbody = document.getElementById('ots-tbody');
  const cnt   = document.getElementById('ots-count');
  if (!tbody) return;

  let ots = APP.lsGet('mp_ots', []);
  const q = (filtro || '').toLowerCase().trim();
  if (q) {
    ots = ots.filter(o =>
      (o.id            || '').toLowerCase().includes(q) ||
      (o.patente       || '').toLowerCase().includes(q) ||
      (o.clienteNombre || '').toLowerCase().includes(q) ||
      (o.servicio      || '').toLowerCase().includes(q) ||
      (o.tecnico       || '').toLowerCase().includes(q)
    );
  }

  if (cnt) cnt.textContent = ots.length + ' orden' + (ots.length !== 1 ? 'es' : '');

  if (ots.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:28px;font-size:11px">${q ? 'Sin resultados para "' + filtro + '".' : 'No hay órdenes de trabajo. Crea la primera con "+ Nueva OT".'}</td></tr>`;
    return;
  }

  tbody.innerHTML = [...ots].reverse().map(o => {
    const css   = OT_ESTADO_CSS[o.estado]   || 's-wait';
    const label = OT_ESTADO_LABEL[o.estado] || o.estado;
    const cita  = o.fechaCita || '—';
    const serv  = (o.servicio || '—').substring(0, 40) + (o.servicio && o.servicio.length > 40 ? '…' : '');
    return `<tr style="cursor:pointer" onclick="abrirDetalleOT('${o.id}')" onmouseover="this.style.background='var(--surface-1)'" onmouseout="this.style.background=''">
      <td style="color:var(--text-accent);font-weight:500;white-space:nowrap">${o.id}</td>
      <td style="font-family:var(--font-mono);font-size:10px;white-space:nowrap">${o.patente || '—'}</td>
      <td>${o.clienteNombre || '—'}</td>
      <td style="font-size:11px;color:var(--text-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${serv}</td>
      <td style="font-size:11px;white-space:nowrap">${cita}</td>
      <td style="font-size:11px">${o.tecnico || '—'}</td>
      <td><span class="st ${css}"><span class="dot"></span>${label}</span></td>
    </tr>`;
  }).join('');
}

// ===== VISTA DETALLE OT =====
let _otDetalleId  = null;
let _otEditando   = false;

function _renderDetServicios(ot) {
  const el = document.getElementById('det-serv-lista');
  if (!el) return;
  const items = (ot.serviciosItems && ot.serviciosItems.length)
    ? ot.serviciosItems
    : (ot.servicios && ot.servicios.length)
      ? ot.servicios
      : ot.servicio ? [{ nombre: ot.servicio, horas: ot.tiempoEstimado || 0, valor: ot.valor || 0 }] : [];
  if (!items.length) { el.innerHTML = '<div style="color:var(--text-muted);font-size:11px;padding:4px 0">—</div>'; return; }
  const totalMO = items.reduce((s, it) => s + (parseInt(it.valor) || 0), 0);
  el.innerHTML = items.map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:0.5px solid var(--border)">
      <span style="font-size:11px;font-weight:500">${_tallerEsc(s.nombre)}</span>
      <div style="display:flex;gap:12px;align-items:center">
        ${s.horas ? `<span style="font-size:10px;color:var(--text-muted)">⏱ ${s.horas}h</span>` : ''}
        ${s.valor ? `<span style="font-size:11px;color:var(--text-accent)">$${Number(s.valor).toLocaleString('es-CL')}</span>` : ''}
      </div>
    </div>`).join('') +
    (totalMO > 0 && items.length > 1
      ? `<div style="font-size:11px;font-weight:600;color:var(--text-accent);text-align:right;padding-top:5px">Total M.O.: $${totalMO.toLocaleString('es-CL')}</div>`
      : '');
}

function abrirDetalleOT(id) {
  // Buscar en ots (nuevo store) y mp_ots (store legacy)
  const otsNew = APP.lsGet('ots', []);
  const otsOld = APP.lsGet('mp_ots', []);
  const ot = otsNew.find(o => o.id === id) || otsOld.find(o => o.id === id);
  if (!ot) return;

  _otDetalleId = id;
  _otEditando  = false;

  // Helper: leer campo con fallback a nombre antiguo
  const _v = (nuevo, antiguo) => ot[nuevo] ?? ot[antiguo] ?? '';

  // Rellenar campos
  const s = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ''; };
  document.getElementById('det-titulo').textContent = 'OT ' + ot.id + ' — ' + _v('vehiculo_patente','patente') + ' · ' + _v('vehiculo_marca','marca') + ' ' + _v('vehiculo_modelo','modelo') + ' ' + _v('vehiculo_anio','anio');
  s('det-nombre', _v('cliente_nombre','clienteNombre')); s('det-rut', _v('rut','rut'));
  s('det-wz',     _v('cliente_whatsapp','wz'));          s('det-mail', _v('cliente_email','mail'));
  s('det-km',     _v('vehiculo_km_entrada','km'));
  const tec = document.getElementById('det-tec');
  if (tec) { tec.value = _v('tecnico_id','tecnico') || tec.options[0]?.value || ''; tec.disabled = true; }

  s('det-marca',  _v('vehiculo_marca','marca'));  s('det-modelo', _v('vehiculo_modelo','modelo'));
  s('det-anio',   _v('vehiculo_anio','anio'));     s('det-motor',  _v('vehiculo_motor','motor'));
  s('det-comb',   ot.comb || '');                  s('det-tipo',   ot.tipo || '');
  s('det-vin',    _v('vehiculo_chasis','vin'));    s('det-nmotor', ot.nmotor || '');

  s('det-fecha', _v('fecha_cita','fechaCita'));
  // Extraer hora de fecha_cita si es timestamp
  const fc = ot.fecha_cita || ot.fechaCita;
  const horaStr = ot.horaCita || (fc && !isNaN(new Date(fc)) ? new Date(fc).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}) : '');
  s('det-hora',  horaStr);
  _renderDetServicios(ot);
  s('det-notas',  _v('motivo_ingreso','notas'));
  // Valor total desde servicios si no está en root
  const totalValor = ot.valor || (ot.servicios ? ot.servicios.reduce((a, sv) => a + (sv.valor || 0), 0) : 0);
  s('det-valor',  totalValor || '');

  // Hora entrada / salida reales
  const _toTimeInput = ts => {
    if (!ts) return '';
    if (/^\d{1,2}:\d{2}$/.test(ts)) return ts.padStart(5, '0');
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
  _renderHistorialDet(ot.historial_eventos || ot.historial || []);

  // Paneles módulos 5/6/7
  _actualizarPanelesDet(ot);

  // Ocultar reagendar y upsell banner (se re-calculan abajo)
  const rp = document.getElementById('det-reagendar-panel'); if (rp) rp.style.display = 'none';

  // CRM historial del vehículo
  _crmRenderDetalle(_v('vehiculo_patente','patente'), ot.id);

  // Upselling inteligente
  _upsellingRender(_v('vehiculo_patente','patente'), ot.servicio || (ot.servicios && ot.servicios[0] ? ot.servicios[0].nombre : ''));

  // Mostrar detalle, ocultar listado
  const listado = document.getElementById('ot-listado');
  if (listado) listado.style.display = 'none';
  document.getElementById('ot-detalle').style.display = 'flex';
}

function volverListaOT() {
  _otDetalleId = null;
  _otEditando  = false;
  document.getElementById('ot-detalle').style.display = 'none';
  const listado = document.getElementById('ot-listado');
  if (listado) listado.style.display = '';
  window.scrollTo(0, 0);
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
    servicio:      ots[idx].servicio,
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
  APP.toast.show('✓ Cambios guardados', 'success');
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
  // Normalizar cada entrada: nuevo formato {accion, fecha:timestamp, usuario} → display
  const norm = historial.map(e => {
    if (e.accion && typeof e.fecha === 'number') {
      const d = new Date(e.fecha);
      return {
        emoji: '📋',
        label: e.accion,
        fecha: d.toLocaleDateString('es-CL'),
        hora: d.toLocaleTimeString('es-CL', {hour:'2-digit',minute:'2-digit'}),
        detalle: e.usuario ? 'Por ' + e.usuario : ''
      };
    }
    return e;
  });
  el.innerHTML = [...norm].reverse().map((e, i) => `
    <div style="display:flex;gap:10px;padding:8px 0;${i < norm.length - 1 ? 'border-bottom:0.5px solid var(--border)' : ''}">
      <div style="font-size:16px;flex-shrink:0;width:24px;text-align:center">${e.emoji || '📋'}</div>
      <div style="flex:1">
        <div style="font-weight:500;font-size:12px">${e.label || e.estado || e.accion || ''}</div>
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
  const _v = (n, a) => ot[n] ?? ot[a] ?? '';
  const vehiculo = [_v('vehiculo_marca','marca'), _v('vehiculo_modelo','modelo'), _v('vehiculo_anio','anio')].filter(Boolean).join(' ') || '—';
  const lines = [
    '════════════════════════════════',
    '       COTIZACIÓN DE SERVICIOS',
    '   Integral Automotriz Spa — Valparaíso',
    '════════════════════════════════',
    '',
    `Fecha:    ${fecha}`,
    `OT:       ${ot.id || '—'}`,
    `Patente:  ${_v('vehiculo_patente','patente') || '—'}`,
    `Vehículo: ${vehiculo}`,
    `Cliente:  ${_v('cliente_nombre','clienteNombre') || '—'}`,
    '',
    '──────── SERVICIOS ────────',
    (() => {
      const svNombre = (ot.servicios && ot.servicios[0] ? ot.servicios[0].nombre : ot.servicio) || 'Por determinar';
      const svValor = ot.valor || (ot.servicios ? ot.servicios.reduce((a, sv) => a + (sv.valor || 0), 0) : 0);
      return `• ${svNombre}${svValor ? ':  $' + Number(svValor).toLocaleString('es-CL') : ''}`;
    })(),
    '',
  ];
  // Repuestos desde servicios o texto libre
  let repuestosStr = '';
  if (ot.servicios && ot.servicios.length) {
    repuestosStr = ot.servicios.flatMap(sv => (sv.repuestos || []).map(r => `${r.nombre} — Cant: ${r.cantidad} ${r.unidad || ''}`)).join('\n');
  }
  const repText = repuestosStr || ot.repuestos || '';
  if (repText.trim()) {
    lines.push('──────── REPUESTOS / MATERIALES ────────');
    repText.split('\n').forEach(r => { if (r.trim()) lines.push('• ' + r.trim()); });
    lines.push('');
  }
  const totalValor = ot.valor || (ot.servicios ? ot.servicios.reduce((a, sv) => a + (sv.valor || 0), 0) : 0);
  if (totalValor) lines.push(`TOTAL ESTIMADO:  $${Number(totalValor).toLocaleString('es-CL')}`, '');
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
  navigator.clipboard.writeText(texto).then(() => APP.toast.show('✓ Cotización copiada al portapapeles', 'success'));
}

// ===== MÓDULO 6: CIERRE + INSTAGRAM =====
function completarOT() {
  abrirPanelPago();
}

// ===== PANEL DE PAGO =====
// _pagoMetodo declarado en taller-pago.js (evitar re-declaración let)

function abrirPanelPago() {
  if (!_otDetalleId) return;
  const ots = APP.lsGet('mp_ots', []);
  const ot  = ots.find(o => o.id === _otDetalleId);
  if (!ot) return;

  // Cerrar dropdown estado si está abierto
  const dd = document.getElementById('det-estado-dd');
  if (dd) dd.style.display = 'none';

  _pagoMetodo = null;

  // Reset UI
  ['efectivo','tarjeta','transferencia','pendiente'].forEach(m => {
    const c = document.getElementById('det-pago-campos-' + m); if (c) c.style.display = 'none';
    const b = document.getElementById('det-pago-btn-' + m);   if (b) b.style.background = '';
  });
  ['det-pago-boleta','det-pago-voucher','det-pago-comprobante'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const motivo = document.getElementById('det-pago-motivo'); if (motivo) motivo.value = '';

  // Calcular totales
  const items    = (ot.serviciosItems && ot.serviciosItems.length)
    ? ot.serviciosItems
    : ot.servicio ? [{ nombre: ot.servicio, horas: 0, valor: ot.valor || 0 }] : [];
  const totalMO  = items.reduce((s, it) => s + (parseInt(it.valor) || 0), 0);
  const reps     = (ot.repuestosItems || []).filter(r => (r.desc || '').trim());
  const totalRep = reps.reduce((s, r) => s + (parseInt(r.precio) || 0), 0);
  const totalFin = totalMO + totalRep;

  // Resumen
  const lineas = items.map(s =>
    `<div style="display:flex;justify-content:space-between;padding:2px 0">
       <span>• ${_tallerEsc(s.nombre)}</span>
       <span>${s.valor ? '$' + Number(s.valor).toLocaleString('es-CL') : '—'}</span>
     </div>`).join('');
  const repLine = totalRep > 0
    ? `<div style="display:flex;justify-content:space-between;padding:2px 0"><span>• Repuestos / materiales</span><span>$${totalRep.toLocaleString('es-CL')}</span></div>`
    : '';
  const sep   = '<div style="border-top:0.5px solid var(--border);margin:8px 0"></div>';
  const total = `<div style="display:flex;justify-content:space-between;font-weight:600;font-size:14px">
    <span>TOTAL A COBRAR</span><span style="color:var(--text-accent)">$${totalFin.toLocaleString('es-CL')}</span></div>`;

  const numEl = document.getElementById('det-pago-ot-num');
  if (numEl) numEl.textContent = ot.id;
  const resEl = document.getElementById('det-pago-resumen');
  if (resEl) resEl.innerHTML = lineas + repLine + sep + total;

  const panel = document.getElementById('det-panel-pago');
  if (panel) { panel.style.display = 'block'; panel.scrollIntoView({ behavior:'smooth', block:'start' }); }
}

function seleccionarMetodoPago(metodo) {
  _pagoMetodo = metodo;
  ['efectivo','tarjeta','transferencia','pendiente'].forEach(m => {
    const b = document.getElementById('det-pago-btn-' + m);
    const c = document.getElementById('det-pago-campos-' + m);
    const activo = m === metodo;
    if (b) b.style.background = activo ? 'var(--bg-accent)' : '';
    if (c) c.style.display    = activo ? 'block' : 'none';
  });
}

function confirmarPago() {
  if (!_pagoMetodo) { APP.toast.show('⚠️ Selecciona un método de pago.', 'warning'); return; }
  const g = id => (document.getElementById(id)?.value || '').trim();
  const datoPago = { metodo: _pagoMetodo };

  if (_pagoMetodo === 'efectivo') {
    if (!g('det-pago-boleta')) { APP.toast.show('⚠️ Ingresa el número de boleta.', 'warning'); return; }
    datoPago.boleta = g('det-pago-boleta');
  } else if (_pagoMetodo === 'tarjeta') {
    if (!g('det-pago-voucher')) { APP.toast.show('⚠️ Ingresa el número de voucher.', 'warning'); return; }
    datoPago.voucher     = g('det-pago-voucher');
    datoPago.tipoTarjeta = g('det-pago-tipo-tarjeta');
  } else if (_pagoMetodo === 'transferencia') {
    if (!g('det-pago-comprobante')) { APP.toast.show('⚠️ Ingresa el número de comprobante.', 'warning'); return; }
    datoPago.comprobante = g('det-pago-comprobante');
  } else if (_pagoMetodo === 'pendiente') {
    datoPago.motivo = g('det-pago-motivo');
  }

  cerrarPanelPago();
  _finalizarOT(datoPago);
}

function cerrarPanelPago() {
  const panel = document.getElementById('det-panel-pago');
  if (panel) panel.style.display = 'none';
  _pagoMetodo = null;
}

function _finalizarOT(datoPago) {
  if (!_otDetalleId) return;
  const ahora = new Date();
  const ots   = APP.lsGet('mp_ots', []);
  const idx   = ots.findIndex(o => o.id === _otDetalleId);
  if (idx < 0) return;
  const ot = ots[idx];

  const horaSalida = ahora.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' });
  let tiempoReal   = null;
  if (ot.entrada_ts) tiempoReal = Math.round((ahora - new Date(ot.entrada_ts)) / 60000);

  const metodoLabel = { efectivo:'💵 Efectivo', tarjeta:'💳 Tarjeta', transferencia:'📲 Transferencia', pendiente:'⏳ Pendiente de pago' };
  const entrada = {
    estado:'completado', label:'Trabajo completado', emoji:'🏁',
    ts:    ahora.toISOString(),
    hora:  horaSalida,
    fecha: ahora.toLocaleDateString('es-CL'),
    horaSalida, tiempoReal,
    detalle: datoPago ? (metodoLabel[datoPago.metodo] || datoPago.metodo) : null,
  };

  ots[idx] = {
    ...ot,
    estado:'completado', estadoCita:'completado',
    horaSalida, salida_ts: ahora.toISOString(), tiempoReal,
    pago: datoPago,
    historial: [...(ot.historial || []), entrada],
  };
  APP.lsSet('mp_ots', ots);

  _actualizarBadgeDet('completado');
  _renderHistorialDet(ots[idx].historial);
  _actualizarPanelesDet(ots[idx]);
}

function _generarPostIG(ot) {
  const _v = (n, a) => ot[n] ?? ot[a] ?? '';
  const marca  = _v('vehiculo_marca','marca') || '[Marca]';
  const modelo = _v('vehiculo_modelo','modelo') || '[Modelo]';
  const anio   = _v('vehiculo_anio','anio') || '';
  const serv   = (ot.servicios && ot.servicios[0] ? ot.servicios[0].nombre : ot.servicio) || '[Servicio realizado]';
  const extras = _v('motivo_ingreso','notas') ? '\n- ' + _v('motivo_ingreso','notas') : '';
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
  navigator.clipboard.writeText(texto).then(() => APP.toast.show('✓ Texto copiado — pégalo en Instagram', 'success'));
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
  const pPago = document.getElementById('det-panel-pago');
  if (pPago) pPago.style.display = 'none';
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
