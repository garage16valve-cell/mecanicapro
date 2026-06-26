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

  // --- Intentar API real via proxies CORS ---
  // Cada entrada: [proxyUrl, fn para extraer texto del response]
  const PROXIES = [
    // corsproxy.io: responde con el HTML directo
    [
      'https://corsproxy.io/?' + encodeURIComponent('https://www.patentechile.com/patente/' + pat),
      async r => r.ok ? await r.text() : null,
    ],
    [
      'https://corsproxy.io/?' + encodeURIComponent('https://www.patentechile.com/' + pat),
      async r => r.ok ? await r.text() : null,
    ],
    // allorigins: responde con { contents: "..." }
    [
      'https://api.allorigins.win/get?url=' + encodeURIComponent('https://www.patentechile.com/patente/' + pat),
      async r => { if (!r.ok) return null; const j = await r.json(); return j.contents || null; },
    ],
    [
      'https://api.allorigins.win/get?url=' + encodeURIComponent('https://www.patentechile.com/' + pat),
      async r => { if (!r.ok) return null; const j = await r.json(); return j.contents || null; },
    ],
  ];

  for (const [proxyUrl, extractor] of PROXIES) {
    if (datos) break;
    try {
      console.log('[patente] consultando →', proxyUrl);
      const ctrl  = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 9000);
      const resp  = await fetch(proxyUrl, { signal: ctrl.signal });
      clearTimeout(timer);

      console.log('[patente] respuesta HTTP:', resp.status, resp.ok ? 'OK' : 'ERROR');

      const html = await extractor(resp);
      console.log('[patente] contenido recibido: ' + (html ? html.length + ' chars' : 'null/vacío'));
      if (html && html.length >= 200) {
        console.log('[patente] primeros 2000 chars:\n', html.slice(0, 2000));

        // Buscar campos clave en el HTML crudo
        const docDbg = new DOMParser().parseFromString(html, 'text/html');
        const keywords = ['marca','modelo','año','ano','chasis','vin','motor'];
        console.log('[patente] === búsqueda de campos en el DOM ===');

        // Todas las celdas td/th que contengan las palabras clave
        docDbg.querySelectorAll('td, th').forEach(el => {
          const t = el.textContent.trim().toLowerCase();
          if (keywords.some(k => t.includes(k))) {
            const next = el.nextElementSibling;
            console.log('[patente] td/th encontrado:', JSON.stringify(el.textContent.trim()), '→ siguiente celda:', JSON.stringify(next ? next.textContent.trim() : '(ninguna)'));
          }
        });

        // Spans y divs con esas palabras
        docDbg.querySelectorAll('span, div, p, label, li').forEach(el => {
          const t = el.textContent.trim().toLowerCase();
          if (keywords.some(k => t.startsWith(k)) && el.textContent.trim().length < 120) {
            console.log('[patente] span/div:', JSON.stringify(el.tagName), JSON.stringify(el.className), '→', JSON.stringify(el.textContent.trim()));
          }
        });

        // Clases que suenan a resultado
        ['.result','.results','.datos','.data','.vehicle','.vehiculo','.info','.car-info',
         '.patente-result','.patente-datos','.ficha','.detalle','.plate-info']
          .forEach(sel => {
            const found = docDbg.querySelector(sel);
            if (found) console.log('[patente] selector', sel, '→', JSON.stringify(found.textContent.trim().slice(0, 300)));
          });
      }

      if (!html || html.length < 200) { console.log('[patente] descartado (muy corto o vacío)'); continue; }

      datos = _parsearPatente(html, pat);
      console.log('[patente] resultado del parser:', datos);
      if (datos) fuenteDatos = 'API';

    } catch (e) {
      console.warn('[patente] CATCH —', e.name, e.message, '| URL:', proxyUrl);
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
    if (pi) {
      pi.style.borderColor = 'var(--border-danger)';
      pi.style.background  = 'var(--bg-danger)';
    }
    _setPatStatus('error',
      'Patente <strong>' + pat + '</strong> no encontrada en el registro. ' +
      'Ingresa los datos manualmente o usa una <a href="#" onclick="event.preventDefault();document.getElementById(\'vehiculo-datos\').style.display=\'block\'" style="color:var(--text-accent)">patente demo</a>.'
    );

    const vd = document.getElementById('vehiculo-datos');
    const cd = document.getElementById('cliente-datos');
    if (vd) vd.style.display = 'none';
    if (cd) cd.style.display = 'block';
  }
}

// Extrae datos del HTML devuelto por patentechile.com
function _parsearPatente(html, pat) {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // ── Estrategia 1: buscar en elementos con data-label o th/td de tabla ──
    const tbl = {};
    doc.querySelectorAll('tr').forEach(r => {
      const celdas = r.querySelectorAll('td, th');
      if (celdas.length >= 2) {
        const k = celdas[0].textContent.trim().toLowerCase();
        const v = celdas[1].textContent.trim();
        if (!v) return;
        if (/marca/.test(k))                         tbl.marca  = tbl.marca  || v;
        if (/modelo/.test(k))                        tbl.modelo = tbl.modelo || v;
        if (/a[ñn]o/.test(k))                        tbl.anio   = tbl.anio   || v;
        if (/motor/.test(k) && !/n[°º]/.test(k))    tbl.motor  = tbl.motor  || v;
        if (/combust/.test(k))                       tbl.comb   = tbl.comb   || v;
        if (/tipo/.test(k))                          tbl.tipo   = tbl.tipo   || v;
        if (/vin|chasis/.test(k))                    tbl.vin    = tbl.vin    || v;
        if (/n[°º\.]\s*motor|nro\s*motor/.test(k))  tbl.nmotor = tbl.nmotor || v;
      }
    });

    // ── Estrategia 2: dl/dt-dd ──
    doc.querySelectorAll('dl').forEach(dl => {
      const dts = dl.querySelectorAll('dt');
      const dds = dl.querySelectorAll('dd');
      dts.forEach((dt, i) => {
        const k = dt.textContent.trim().toLowerCase();
        const v = (dds[i] || dds[i - 1] || {}).textContent?.trim() || '';
        if (!v) return;
        if (/marca/.test(k))                         tbl.marca  = tbl.marca  || v;
        if (/modelo/.test(k))                        tbl.modelo = tbl.modelo || v;
        if (/a[ñn]o/.test(k))                        tbl.anio   = tbl.anio   || v;
        if (/motor/.test(k) && !/n[°º]/.test(k))    tbl.motor  = tbl.motor  || v;
        if (/combust/.test(k))                       tbl.comb   = tbl.comb   || v;
        if (/tipo/.test(k))                          tbl.tipo   = tbl.tipo   || v;
        if (/vin|chasis/.test(k))                    tbl.vin    = tbl.vin    || v;
        if (/n[°º\.]\s*motor|nro\s*motor/.test(k))  tbl.nmotor = tbl.nmotor || v;
      });
    });

    // ── Estrategia 3: regex sobre texto plano ──
    const txt = doc.body ? (doc.body.innerText || doc.body.textContent || '') : '';
    const rx = (re) => {
      const m = txt.match(re);
      return (m && m[1] && m[1].trim().length > 1) ? m[1].trim() : null;
    };
    const marca  = tbl.marca  || rx(/marca\s*[:\-]\s*([A-Za-záéíóúÁÉÍÓÚ\w\s\-]{2,30}?)(?:\n|modelo|año)/i);
    const modelo = tbl.modelo || rx(/modelo\s*[:\-]\s*([^\n]{2,40}?)(?:\n|año|motor)/i);
    const anio   = tbl.anio   || rx(/a[ñn]o\s*[:\-]\s*(\d{4})/i);
    const motor  = tbl.motor  || rx(/motor\s*[:\-]\s*([^\n]{2,50}?)(?:\n|combust|tipo)/i);
    const comb   = tbl.comb   || rx(/combust[ible]*\s*[:\-]\s*([^\n]{2,30}?)(?:\n|tipo|vin)/i);
    const tipo   = tbl.tipo   || rx(/tipo\s*[:\-]\s*([^\n]{2,30}?)(?:\n|vin|n[°º])/i);
    const vin    = tbl.vin    || rx(/vin\s*[:\-]\s*([A-HJ-NPR-Z0-9]{17})/i);
    const nmotor = tbl.nmotor || rx(/n[°º\.]\s*[Mm]otor\s*[:\-]\s*([^\n]{2,40}?)(?:\n|$)/i);

    // Solo retornar si hay al menos marca o modelo
    if (!marca && !modelo) return null;

    // Verificar que la patente consultada aparece en el HTML (validación extra)
    if (pat && !html.toUpperCase().includes(pat.toUpperCase())) return null;

    return {
      marca:  marca  || '—',
      modelo: modelo || '—',
      anio:   anio   || '—',
      motor:  motor  || '—',
      comb:   comb   || '—',
      tipo:   tipo   || '—',
      vin:    vin    || '—',
      nmotor: nmotor || '—',
    };
  } catch (e) {
    console.warn('[patente] error al parsear HTML:', e);
    return null;
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
