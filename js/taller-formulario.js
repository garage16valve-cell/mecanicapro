// ─── FORMULARIO NUEVA OT — REDISEÑO COMPLETO ─────────────────────────────────

// Toast global (alias)
function showToast(msg, tipo, dur) { APP.toast.show(msg, tipo || 'success', dur || 3000); }

// ─── Estado del formulario ──────────────────────────────────────────────────
let nfServicios = [];        // servicios agregados a la OT (para guardar)
let nfRepuestos = [];        // repuestos temporales del servicio actual
let nfClienteSel = null;     // { id, nombre, apellido, whatsapp, email, vehiculos[] }
let nfFotos = [];            // fotos base64

const NF_MARCAS = [
  'Acura','Alfa Romeo','Audi','BAIC','BMW','Buick','BYD','Cadillac','Changan',
  'Chery','Chevrolet','Chrysler','Citroën','Daewoo','Daihatsu','DFSK','Dodge',
  'Dongfeng','FAW','Ferrari','Fiat','Foton','Ford','GAC','Genesis','Geely','GMC',
  'Great Wall','Haval','Honda','Hyundai','Infiniti','Isuzu','JAC','Jaguar','Jeep',
  'Kia','Lamborghini','Land Rover','Lexus','Lifan','Lincoln','Maserati','Mazda',
  'Mercedes-Benz','MG','Mini','Mitsubishi','Nissan','Opel','Peugeot','Porsche',
  'RAM','Renault','Rolls-Royce','SAIC','Seat','Skoda','SsangYong','Subaru',
  'Suzuki','Tesla','Toyota','Volkswagen','Volvo','ZNA','Zotye','Otra marca'
];

const NF_UNIDADES = ['unidad','litro','kg','metro','juego'];
const NF_COMBUSTIBLE= ['','Vacío','1/4','1/2','3/4','Lleno'];
const NF_FLUIDOS  = ['Aceite motor','Líquido frenos','Líquido embrague','Refrigerante','Aceite hidráulico','Limpiaparabrisas'];
const NF_INVENTARIO=['Llanta repuesto','Kit carretera','Herramientas','Botiquín','Extintor'];
const NF_DANOS    = ['Rayado','Fogueado','Sumido','Picado','Golpeado','Sin daños'];

// ─── Abrir / Cerrar ──────────────────────────────────────────────────────────
function nfAbrirFormulario() {
  nfResetForm();
  // Ocultar listado, mostrar form
  const listado = document.getElementById('ot-listado');
  if (listado) listado.style.display = 'none';
  const overlay = document.getElementById('ot-nueva');
  overlay.style.display = 'flex';
  // No cerrar al hacer clic fuera del modal (solo con botones/X)
  overlay.onclick = function(e) {
    if (e.target === this) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  // Poblar selects
  nfPoblarSelectores();
  // Enfocar buscador de cliente
  setTimeout(() => {
    const el = document.getElementById('nf-cliente-buscar');
    if (el) el.focus();
  }, 200);
}

function nfCerrarFormulario() {
  document.getElementById('ot-nueva').style.display = 'none';
  const listado = document.getElementById('ot-listado');
  if (listado) listado.style.display = '';
  nfCerrarDropCliente();
  nfCerrarDropServicio();
}

function nfResetForm() {
  // Limpiar todos los inputs
  document.querySelectorAll('#ot-nueva input, #ot-nueva textarea, #ot-nueva select').forEach(el => {
    if (el.type === 'checkbox') el.checked = false;
    else if (el.type !== 'file') el.value = '';
  });
  // Smart selectors (Marca, Año)
  if (typeof _ssReset === 'function') {
    _ssReset('nf-marca');
    _ssReset('nf-anio');
  } else {
    const m = document.getElementById('nf-marca'); if (m) m.value = '';
    const a = document.getElementById('nf-anio'); if (a) a.value = '';
  }
  const comb = document.getElementById('nf-combustible');
  if (comb) comb.value = '';
  const tec = document.getElementById('nf-tecnico');
  if (tec) tec.value = '';
  // Resetear estado
  nfServicios = [];
  nfRepuestos = [];
  nfClienteSel = null;
  nfFotos = [];
  // Ocultar secciones condicionales
  const recepcion = document.getElementById('nf-recepcion');
  if (recepcion) recepcion.style.display = 'none';
  const citaGroup = document.getElementById('nf-cita-group');
  if (citaGroup) citaGroup.style.display = 'flex';
  const provBox = document.getElementById('nf-proveedores-box');
  if (provBox) provBox.style.display = 'none';
  const histBtn = document.getElementById('nf-historial-btn');
  if (histBtn) histBtn.style.display = 'none';
  const sugBox = document.getElementById('nf-svc-sugerencias');
  if (sugBox) sugBox.innerHTML = '';
  // Reset checkbox receptions
  document.querySelectorAll('.nf-fluido-cb, .nf-inventario-cb, .nf-dano-cb').forEach(cb => cb.checked = false);
  // Foto preview
  const prev = document.getElementById('nf-fotos-preview');
  if (prev) prev.innerHTML = '';
  nfRenderServicios();
  nfRenderRepuestos();
  nfToggleExpress();
  // Ocultar desc daños
  const dd = document.getElementById('nf-desc-danos-group');
  if (dd) dd.style.display = 'none';
}

// ─── Poblar Selectores ──────────────────────────────────────────────────────
function nfPoblarSelectores() {
  // Marca — Smart Selector con buscador (reutiliza sistema _ss de taller.js)
  if (typeof _ssInit === 'function') {
    _ssInit('nf-marca', NF_MARCAS, (val) => nfActualizarProveedores(val), { permitirNuevo: true, noSelText: '— Selecciona marca —' });
    // Año — Smart Selector
    const current = new Date().getFullYear();
    const anios = [];
    for (let y = current + 1; y >= 1970; y--) anios.push(String(y));
    _ssInit('nf-anio', anios, null, { noSelText: '— Año —' });
  }
  // Técnico
  const tecEl = document.getElementById('nf-tecnico');
  if (tecEl) {
    const usuarios = APP.lsGet('usuarios') || [];
    const mecanicos = usuarios.filter(u => u.rol === 'mecanico' || u.rol === 'administrador');
    tecEl.innerHTML = '<option value="">— Sin asignar —</option>' +
      mecanicos.map(u => `<option value="${u.id || u.nombre}">${u.nombre || ''} ${u.apellido || ''}</option>`).join('');
    if (!mecanicos.length) {
      tecEl.innerHTML += '<option value="Sin asignar">Sin asignar</option>';
    }
  }
  // Combustible
  const combEl = document.getElementById('nf-combustible');
  if (combEl) {
    combEl.innerHTML = NF_COMBUSTIBLE.map((v, i) => `<option value="${i === 0 ? '' : v}">${i === 0 ? '— Selecciona —' : v}</option>`).join('');
  }
  // Repuesto unidad
  const uEl = document.getElementById('nf-repuesto-unidad');
  if (uEl) uEl.innerHTML = NF_UNIDADES.map(u => `<option value="${u}">${u}</option>`).join('');
  nfPoblarFluidosInventario();
  nfPoblarProveedores();
}

function nfPoblarFluidosInventario() {
  // Fluidos
  const fEl = document.getElementById('nf-fluidos');
  if (fEl) fEl.innerHTML = NF_FLUIDOS.map(f => `
    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:11px">
      <input type="checkbox" class="nf-fluido-cb" value="${f}"> ${f}
    </label>`).join('');
  // Inventario
  const iEl = document.getElementById('nf-inventario');
  if (iEl) iEl.innerHTML = NF_INVENTARIO.map(i => `
    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:11px">
      <input type="checkbox" class="nf-inventario-cb" value="${i}"> ${i}
    </label>`).join('');
  // Daños
  const dEl = document.getElementById('nf-danos');
  if (dEl) dEl.innerHTML = NF_DANOS.map(d => `
    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:11px">
      <input type="checkbox" class="nf-dano-cb" value="${d}" ${d === 'Sin daños' ? 'onchange="nfToggleSinDanos(this)"' : ''}> ${d}
    </label>`).join('');
}

function nfPoblarProveedores() {
  const prov = APP.lsGet('proveedores') || [];
  window._nfProveedores = prov;
}

// ─── BLOQUE 1: BÚSQUEDA DE CLIENTE ──────────────────────────────────────────
function nfBuscarCliente(q) {
  const drop = document.getElementById('nf-cliente-drop');
  if (!drop) return;
  if (!q || q.length < 1) { nfCerrarDropCliente(); return; }
  const qLow = q.toLowerCase();
  // Buscar en clientes
  const clientes = APP.lsGet('clientes') || [];
  let matches = clientes.filter(c =>
    (c.nombre || '').toLowerCase().includes(qLow) ||
    (c.apellido || '').toLowerCase().includes(qLow) ||
    (c.whatsapp || c.wz || '').includes(q)
  ).slice(0, 6);
  // Buscar también en OTs por patente
  const ots = APP.lsGet('ots') || [];
  const otsPorPatente = ots.filter(o =>
    (o.vehiculo_patente || o.patente || '').toLowerCase() === qLow
  );
  otsPorPatente.forEach(ot => {
    const nom = ot.cliente_nombre || ot.clienteNombre || '';
    const wz = ot.cliente_wz || ot.cliente_whatsapp || ot.wz || '';
    if (nom && !matches.find(m => m.nombre === nom)) {
      matches.push({ id: ot.cliente_id || 'cli-' + Date.now(), nombre: nom, apellido: ot.cliente_apellido || '', whatsapp: wz, email: ot.cliente_email || '' });
    }
  });
  drop.style.display = 'block';
  if (!matches.length) {
    drop.innerHTML = `<div style="padding:9px 12px;font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:6px">
      <i class="ti ti-info-circle"></i> Cliente nuevo, completa los datos</div>`;
    return;
  }
  drop.innerHTML = matches.map(c => {
    const vehiculos = nfVehiculosDeCliente(c.id);
    const tieneVarios = vehiculos.length > 1;
    const txt = [c.nombre, c.apellido].filter(Boolean).join(' ') + (c.whatsapp || c.wz ? ' · ' + (c.whatsapp || c.wz) : '');
    return `<div onclick="nfSelCliente('${_nfEsc(c.id)}','${_nfEsc(c.nombre || '')}','${_nfEsc(c.apellido || '')}','${_nfEsc(c.whatsapp || c.wz || '')}','${_nfEsc(c.email || '')}',${tieneVarios ? 'true' : 'false'})"
      style="padding:8px 12px;cursor:pointer;border-bottom:0.5px solid var(--border);font-size:12px">
      <div style="font-weight:500">${txt}</div>
      ${vehiculos.length ? '<div style="font-size:10px;color:var(--text-muted)">' + vehiculos.map(v => (v.marca || '') + ' ' + (v.modelo || '') + ' - ' + (v.patente || '')).join(' · ') + '</div>' : ''}
    </div>`;
  }).join('');
}

function nfVehiculosDeCliente(clienteId) {
  const vehiculos = APP.lsGet('vehiculos') || [];
  const ots = APP.lsGet('ots') || [];
  // Buscar por cliente_id directo en vehiculos
  let vh = vehiculos.filter(v => v.cliente_id === clienteId);
  // También buscar en OTs por cliente_id
  const otsCli = ots.filter(o => (o.cliente_id || o.clienteId) === clienteId);
  otsCli.forEach(ot => {
    const pat = ot.vehiculo_patente || ot.patente || '';
    if (pat && !vh.find(v => v.patente === pat)) {
      vh.push({
        patente: pat,
        marca: ot.vehiculo_marca || ot.marca || '',
        modelo: ot.vehiculo_modelo || ot.modelo || '',
        anio: ot.vehiculo_anio || ot.anio || ''
      });
    }
  });
  return vh;
}

function nfSelCliente(id, nombre, apellido, whatsapp, email, tieneVarios) {
  nfClienteSel = { id, nombre, apellido, whatsapp, email };
  document.getElementById('nf-cliente-nombre').value = nombre;
  document.getElementById('nf-cliente-apellido').value = apellido;
  document.getElementById('nf-cliente-whatsapp').value = whatsapp;
  document.getElementById('nf-cliente-email').value = email;
  document.getElementById('nf-cliente-buscar').value = '';
  nfCerrarDropCliente();
  // Vehículos del cliente
  const vehiculos = nfVehiculosDeCliente(id);
  if (tieneVarios && vehiculos.length > 1) {
    nfMostrarSelectorVehiculo(vehiculos);
  } else if (vehiculos.length === 1) {
    nfAutocompletarVehiculo(vehiculos[0]);
  }
  showToast('✓ Cliente seleccionado: ' + nombre + ' ' + apellido);
}

function nfMostrarSelectorVehiculo(vehiculos) {
  const sel = document.getElementById('nf-vehiculo-selector');
  if (!sel) return;
  const nom = [nfClienteSel.nombre, nfClienteSel.apellido].filter(Boolean).join(' ');
  sel.style.display = 'block';
  sel.innerHTML = `
    <div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px">Cliente: <strong>${_nfEsc(nom)}</strong>. Selecciona el vehículo:</div>
    ${vehiculos.map((v, i) => `<div onclick="nfSelVehiculo(${i})"
      style="padding:7px 10px;cursor:pointer;border:0.5px solid var(--border);border-radius:var(--radius);margin-bottom:4px;font-size:12px;background:var(--surface-1)"
      onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='var(--surface-1)'">
      ${v.marca || ''} ${v.modelo || ''} ${v.anio || ''} - <strong>${v.patente || ''}</strong>
    </div>`).join('')}
    <div onclick="nfSelVehiculo(-1)"
      style="padding:7px 10px;cursor:pointer;font-size:11px;color:var(--text-accent,#2563eb);display:flex;align-items:center;gap:4px">
      <i class="ti ti-plus"></i> Ingresar vehículo nuevo
    </div>`;
  window._nfVehiculosCliente = vehiculos;
}

function nfSelVehiculo(idx) {
  const sel = document.getElementById('nf-vehiculo-selector');
  if (sel) sel.style.display = 'none';
  if (idx >= 0 && window._nfVehiculosCliente && window._nfVehiculosCliente[idx]) {
    nfAutocompletarVehiculo(window._nfVehiculosCliente[idx]);
  }
}

function nfAutocompletarVehiculo(v) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('nf-patente', v.patente || '');
  if (typeof _ssSetVal === 'function') {
    _ssSetVal('nf-marca', v.marca || '', v.marca || '');
  } else {
    set('nf-marca', v.marca || '');
  }
  set('nf-modelo', v.modelo || '');
  if (typeof _ssSetVal === 'function') {
    _ssSetVal('nf-anio', v.anio || '', v.anio || '');
  } else {
    set('nf-anio', v.anio || '');
  }
  set('nf-color', v.color || '');
  set('nf-km', v.km_entrada || v.kilometraje || '');
  set('nf-chasis', v.chasis || v.vin || '');
  set('nf-motor', v.motor || '');
  nfVerificarHistorial(v.patente || '');
  nfActualizarProveedores(v.marca || '');
  nfActualizarSugerencias(v.patente || '');
}

function nfCerrarDropCliente() {
  const drop = document.getElementById('nf-cliente-drop');
  if (drop) drop.style.display = 'none';
}

// ─── BLOQUE 2: DATOS DEL SERVICIO ───────────────────────────────────────────
function nfToggleExpress() {
  const isExpress = document.getElementById('nf-express')?.checked || false;
  const citaGroup = document.getElementById('nf-cita-group');
  if (citaGroup) citaGroup.style.display = isExpress ? 'none' : 'flex';
  const recepcion = document.getElementById('nf-recepcion');
  if (recepcion) recepcion.style.display = isExpress ? 'block' : 'none';
  // Auto-fijar fecha/hora actual al marcar Express
  if (isExpress) {
    const ahora = new Date();
    const fechaEl = document.getElementById('nf-fecha-cita');
    if (fechaEl) fechaEl.value = ahora.toISOString().slice(0, 10);
    const horaEl = document.getElementById('nf-hora-cita');
    if (horaEl) horaEl.value = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
}

// Servicio search
function nfBuscarServicio(q) {
  const drop = document.getElementById('nf-svc-drop');
  if (!drop) return;
  if (!q || q.length < 1) { nfCerrarDropServicio(); return; }
  const servicios = APP.lsGet('servicios') || [];
  const qLow = q.toLowerCase();
  const matches = servicios.filter(s => (s.nombre || '').toLowerCase().includes(qLow)).slice(0, 10);
  drop.style.display = 'block';
  if (!matches.length) {
    drop.innerHTML = '<div style="padding:9px 12px;font-size:11px;color:var(--text-muted)">Sin resultados — completa manualmente</div>';
    return;
  }
  drop.innerHTML = matches.map(s => {
    const precio = s.valor || s.precioFijo || 0;
    const horas = s.horas || s.horasEst || 0;
    return `<div onclick="nfSelServicio('${_nfEsc(s.nombre)}',${horas},${precio})"
      style="padding:8px 12px;cursor:pointer;border-bottom:0.5px solid var(--border);font-size:12px">
      <div style="font-weight:500">${_nfEsc(s.nombre)}</div>
      <div style="font-size:10px;color:var(--text-muted)">${horas ? '⏱ ' + horas + 'h' : ''}${precio ? ' | $' + Number(precio).toLocaleString('es-CL') : ''}</div>
    </div>`;
  }).join('');
}

function nfSelServicio(nombre, horas, valor) {
  document.getElementById('nf-svc-nombre').value = nombre;
  document.getElementById('nf-svc-horas').value = horas || '';
  document.getElementById('nf-svc-valor').value = valor || '';
  nfCerrarDropServicio();
  nfMostrarBotonAgregar();
  // Cargar repuestos sugeridos del catálogo
  const servicios = APP.lsGet('servicios') || [];
  const svc = servicios.find(s => (s.nombre || '').toLowerCase() === nombre.toLowerCase());
  if (svc && (svc.repuestos || svc.repuestosSugeridos)) {
    const reps = svc.repuestos || svc.repuestosSugeridos || [];
    nfRepuestos = reps.map(r => ({
      nombre: r.nombre || r.desc || '',
      cantidad: r.cantidad || 1,
      unidad: r.unidad || 'unidad'
    }));
    nfRenderRepuestos();
  }
}

function nfCerrarDropServicio() {
  const drop = document.getElementById('nf-svc-drop');
  if (drop) drop.style.display = 'none';
}

function nfMostrarBotonAgregar() {
  const nombre = (document.getElementById('nf-svc-nombre')?.value || '').trim();
  const btn = document.getElementById('nf-svc-agregar-btn');
  if (btn) btn.style.display = nombre ? 'flex' : 'none';
}

function nfAgregarServicio() {
  const nombre = (document.getElementById('nf-svc-nombre')?.value || '').trim();
  const horas = parseFloat(document.getElementById('nf-svc-horas')?.value) || 0;
  const valor = parseInt(document.getElementById('nf-svc-valor')?.value) || 0;
  if (!nombre) { showToast('Ingresa el nombre del servicio', 'warning'); return; }
  nfServicios.push({
    nombre,
    horas,
    valor,
    repuestos: nfRepuestos.map(r => ({ ...r }))
  });
  // Limpiar campos
  document.getElementById('nf-svc-nombre').value = '';
  document.getElementById('nf-svc-horas').value = '';
  document.getElementById('nf-svc-valor').value = '';
  document.getElementById('nf-svc-buscar').value = '';
  nfRepuestos = [];
  nfRenderRepuestos();
  nfRenderServicios();
  nfCerrarDropServicio();
  const btn = document.getElementById('nf-svc-agregar-btn');
  if (btn) btn.style.display = 'none';
}

function nfRenderServicios() {
  const lista = document.getElementById('nf-svc-lista');
  if (!lista) return;
  if (!nfServicios.length) {
    lista.innerHTML = '<div style="color:var(--text-muted);font-size:11px;padding:4px 0">Sin servicios agregados aún</div>';
    const tot = document.getElementById('nf-svc-totales');
    if (tot) tot.style.display = 'none';
    return;
  }
  lista.innerHTML = nfServicios.map((s, i) => {
    const repsHtml = s.repuestos && s.repuestos.length
      ? s.repuestos.map((r, ri) => `<div style="display:flex;align-items:center;gap:4px;padding:2px 0;font-size:10px;color:var(--text-muted)">
          <span style="flex:1">• ${_nfEsc(r.nombre)} (${r.cantidad} ${r.unidad})</span>
          <button onclick="nfElimRepuestoServicio(${i},${ri})" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:12px;padding:0;line-height:1">×</button>
        </div>`).join('')
      : '<div style="font-size:10px;color:var(--text-muted);padding:2px 0">Sin repuestos</div>';
    return `<div style="border:0.5px solid var(--border);border-radius:var(--radius);padding:8px 10px;background:var(--surface-1);margin-bottom:6px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-weight:600;font-size:12px;flex:1">SERVICIO ${i + 1}: ${_nfEsc(s.nombre)}</span>
        <button onclick="nfElimServicio(${i})" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:16px;padding:0">×</button>
      </div>
      <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">
        ⏱ ${s.horas}h | $${(s.valor || 0).toLocaleString('es-CL')}
      </div>
      <div style="font-size:10px;font-weight:500;color:var(--text-muted);margin-bottom:2px">Repuestos:</div>
      ${repsHtml}
    </div>`;
  }).join('');
  nfActualizarTotales();
}

function nfActualizarTotales() {
  const totalH = nfServicios.reduce((a, s) => a + (s.horas || 0), 0);
  const totalV = nfServicios.reduce((a, s) => a + (s.valor || 0), 0);
  const tot = document.getElementById('nf-svc-totales');
  if (tot) {
    tot.style.display = 'flex';
    tot.innerHTML = `<span>Total: <strong>${totalH}h</strong></span>
      <span style="font-weight:600;color:var(--text-accent,#2563eb)">Total: $${totalV.toLocaleString('es-CL')}</span>`;
  }
}

function nfElimServicio(i) { nfServicios.splice(i, 1); nfRenderServicios(); }
function nfElimRepuestoServicio(si, ri) {
  if (nfServicios[si] && nfServicios[si].repuestos) {
    nfServicios[si].repuestos.splice(ri, 1);
    nfRenderServicios();
  }
}

// ─── Repuestos del servicio actual ──────────────────────────────────────────
function nfRenderRepuestos() {
  const lista = document.getElementById('nf-repuestos-lista');
  if (!lista) return;
  if (!nfRepuestos.length) {
    lista.innerHTML = '<div style="color:var(--text-muted);font-size:10px;padding:4px 0">Sin repuestos — agrega usando el botón</div>';
    return;
  }
  lista.innerHTML = nfRepuestos.map((r, i) =>
    `<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:11px">
      <span style="flex:1">${_nfEsc(r.nombre)} (${r.cantidad} ${r.unidad})</span>
      <button onclick="nfElimRepuesto(${i})" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:14px;padding:0">×</button>
    </div>`
  ).join('');
}

function nfAgregarRepuesto() {
  const nombre = (document.getElementById('nf-repuesto-nombre')?.value || '').trim();
  const cantidad = parseFloat(document.getElementById('nf-repuesto-cantidad')?.value) || 1;
  const unidad = document.getElementById('nf-repuesto-unidad')?.value || 'unidad';
  if (!nombre) { showToast('Ingresa el nombre del repuesto', 'warning'); return; }
  nfRepuestos.push({ nombre, cantidad, unidad });
  document.getElementById('nf-repuesto-nombre').value = '';
  document.getElementById('nf-repuesto-cantidad').value = '1';
  nfRenderRepuestos();
}

function nfElimRepuesto(i) { nfRepuestos.splice(i, 1); nfRenderRepuestos(); }

// ─── Servicios sugeridos por historial ─────────────────────────────────────
function nfActualizarSugerencias(patente) {
  const sugBox = document.getElementById('nf-svc-sugerencias');
  if (!sugBox) return;
  if (!patente) { sugBox.innerHTML = ''; return; }
  const ots = APP.lsGet('ots') || [];
  const otsVehiculo = ots.filter(o => (o.vehiculo_patente || o.patente || '').toUpperCase() === patente.toUpperCase());
  if (!otsVehiculo.length) { sugBox.innerHTML = ''; return; }
  const config = APP.lsGet('config') || {};
  const reglas = (config.upselling || []).length ? config.upselling : [
    { servicio: 'Cambio aceite + filtros', tipo: 'tiempo', meses: 6 },
    { servicio: 'Mantención 10.000 km', tipo: 'km', km: 10000 },
    { servicio: 'Revisión frenos', tipo: 'tiempo', meses: 12 }
  ];
  const kmActual = parseInt(document.getElementById('nf-km')?.value) || 0;
  let sugerencias = [];
  reglas.forEach(regla => {
    const otsServicio = otsVehiculo.filter(o => {
      const servs = o.servicios || [];
      const svcNombres = servs.map(s => (s.nombre || '').toLowerCase());
      return svcNombres.some(n => n.includes(regla.servicio.toLowerCase()));
    });
    if (!otsServicio.length) return;
    const ultimo = otsServicio[otsServicio.length - 1];
    if (regla.tipo === 'tiempo' && regla.meses) {
      const fechaUlt = ultimo.fecha_ingreso || ultimo.creado || Date.now();
      const mesesPasados = (Date.now() - fechaUlt) / (30 * 24 * 60 * 60 * 1000);
      if (mesesPasados >= regla.meses) {
        sugerencias.push({ servicio: regla.servicio, tipo: 'tiempo', valor: Math.round(mesesPasados) + ' meses', ultimo: ultimo });
      }
    }
    if (regla.tipo === 'km' && regla.km && kmActual) {
      const kmUlt = parseInt(ultimo.vehiculo_km_entrada || ultimo.kilometraje?.entrada || 0);
      if (kmUlt && (kmActual - kmUlt) >= regla.km) {
        sugerencias.push({ servicio: regla.servicio, tipo: 'km', valor: (kmActual - kmUlt) + ' km', ultimo: ultimo });
      }
    }
  });
  if (!sugerencias.length) { sugBox.innerHTML = ''; return; }
  sugBox.innerHTML = `<div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:6px">🔔 Servicios sugeridos</div>
    <div style="font-size:10px;color:var(--text-muted);margin-bottom:6px">(basado en historial del vehículo)</div>
    ${sugerencias.map(s => `<div style="border:0.5px solid #d97706;border-radius:var(--radius);padding:8px 10px;margin-bottom:4px;background:#fef3c7;font-size:11px">
      <div style="font-weight:500">⚠️ ${_nfEsc(s.servicio)}</div>
      <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">${s.tipo === 'tiempo' ? 'Último: hace ' + s.valor : '⏱ ' + s.valor + ' desde último servicio'}</div>
      <button onclick="nfAgregarSugerencia('${_nfEsc(s.servicio)}')" style="font-size:10px;padding:3px 8px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-1);cursor:pointer;color:var(--text-primary)">
        + Agregar a esta OT
      </button>
    </div>`).join('')}`;
}

function nfAgregarSugerencia(servicioNombre) {
  const servicios = APP.lsGet('servicios') || [];
  const svc = servicios.find(s => (s.nombre || '').toLowerCase() === servicioNombre.toLowerCase());
  document.getElementById('nf-svc-nombre').value = servicioNombre;
  if (svc) {
    document.getElementById('nf-svc-horas').value = svc.horas || svc.horasEst || '';
    document.getElementById('nf-svc-valor').value = svc.valor || svc.precioFijo || '';
    if (svc.repuestos || svc.repuestosSugeridos) {
      const reps = svc.repuestos || svc.repuestosSugeridos || [];
      nfRepuestos = reps.map(r => ({
        nombre: r.nombre || r.desc || '',
        cantidad: r.cantidad || 1,
        unidad: r.unidad || 'unidad'
      }));
      nfRenderRepuestos();
    }
  }
  nfMostrarBotonAgregar();
  document.getElementById('nf-svc-buscar').value = servicioNombre;
}

// ─── BLOQUE 3: VEHÍCULO ────────────────────────────────────────────────────
function nfPatenteInput(pat) {
  pat = pat.toUpperCase().replace(/[^A-Z0-9]/g, '');
  document.getElementById('nf-patente').value = pat;
  nfVerificarHistorial(pat);
}

function nfVerificarHistorial(patente) {
  const btn = document.getElementById('nf-historial-btn');
  if (!btn) return;
  if (!patente || patente.length < 4) { btn.style.display = 'none'; return; }
  const ots = APP.lsGet('ots') || [];
  const tieneHist = ots.some(o => (o.vehiculo_patente || o.patente || '').toUpperCase() === patente.toUpperCase());
  btn.style.display = tieneHist ? 'inline-flex' : 'none';
  if (tieneHist) nfActualizarSugerencias(patente);
}

function nfAbrirHistorial() {
  const patente = document.getElementById('nf-patente')?.value || '';
  if (!patente) return;
  const ots = APP.lsGet('ots') || [];
  const historial = ots.filter(o => (o.vehiculo_patente || o.patente || '').toUpperCase() === patente.toUpperCase())
    .sort((a, b) => (b.fecha_ingreso || b.creado || 0) - (a.fecha_ingreso || a.creado || 0));
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center';
  const modalHtml = `<div style="background:var(--surface-2);border-radius:var(--radius);max-width:600px;width:90vw;max-height:80vh;overflow:hidden;display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:0.5px solid var(--border)">
      <h3 style="font-size:14px;margin:0">📋 Historial - ${patente}</h3>
      <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;cursor:pointer;font-size:20px;color:var(--text-muted)">×</button>
    </div>
    <div style="padding:12px 16px;overflow-y:auto;flex:1">
      ${historial.length ? historial.map(ot => {
        const fecha = new Date(ot.fecha_ingreso || ot.creado || Date.now()).toLocaleDateString('es-CL');
        const servs = ot.servicios || [];
        const servStr = servs.map(s => s.nombre).filter(Boolean).join(', ') || ot.servicio || '—';
        return `<div style="border:0.5px solid var(--border);border-radius:var(--radius);padding:10px;margin-bottom:8px;background:var(--surface-1)">
          <div style="display:flex;justify-content:space-between;font-size:12px">
            <span style="font-weight:500">📅 ${fecha}</span>
            <span style="color:var(--text-accent)">OT #${ot.id || ''}</span>
          </div>
          <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">Servicios: ${servStr}</div>
          <div style="font-size:11px;color:var(--text-secondary)">Técnico: ${ot.tecnico_nombre || ot.tecnico || '—'}</div>
          <div style="font-size:11px;color:var(--text-secondary)">Estado: ${ot.estado || '—'} · Total: $${(ot.servicios ? ot.servicios.reduce((a, s) => a + (s.valor || 0), 0) : (ot.valor || 0)).toLocaleString('es-CL')}</div>
        </div>`;
      }).join('') : '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">Este vehículo no tiene servicios anteriores</div>'}
    </div>
  </div>`;
  overlay.innerHTML = modalHtml;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function nfActualizarProveedores(marca) {
  const box = document.getElementById('nf-proveedores-box');
  if (!box) return;
  if (!marca) { box.style.display = 'none'; return; }
  const proveedores = window._nfProveedores || APP.lsGet('proveedores') || [];
  const filtrados = proveedores.filter(p => p.marcas && Array.isArray(p.marcas) && p.marcas.includes(marca));
  if (!filtrados.length) {
    box.style.display = 'block';
    box.innerHTML = `<div style="font-size:11px;font-weight:500;margin-bottom:6px">Proveedores para ${marca}</div>
      <div style="font-size:11px;color:var(--text-muted);padding:8px;background:var(--surface-1);border-radius:var(--radius)">No hay proveedores para <strong>${marca}</strong>. Agrégalos en el módulo Proveedores.</div>`;
    return;
  }
  box.style.display = 'block';
  box.innerHTML = `<div style="font-size:11px;font-weight:500;margin-bottom:6px">Proveedores para ${marca}</div>
    ${filtrados.map(p => `<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border:0.5px solid var(--border);border-radius:var(--radius);margin-bottom:4px;font-size:11px;background:var(--surface-1)">
      <span><strong>${_nfEsc(p.nombre || '')}</strong>${p.rubro ? ' - ' + p.rubro : ''}</span>
      <button onclick="nfCotizarWA('${_nfEsc(p.nombre)}','${_nfEsc(p.whatsapp || p.wzp || p.telefono || '')}')" style="font-size:10px;padding:3px 7px;border:0.5px solid #25D366;border-radius:var(--radius);background:#25D366;color:#fff;cursor:pointer">📱 Cotizar WA</button>
    </div>`).join('')}`;
}

function nfCotizarWA(nombreProv, telefono) {
  const marca = document.getElementById('nf-marca')?.value || '';
  const modelo = document.getElementById('nf-modelo')?.value || '';
  const anio = document.getElementById('nf-anio')?.value || '';
  const chasis = document.getElementById('nf-chasis')?.value || '';
  const motor = document.getElementById('nf-motor')?.value || '';
  const patente = document.getElementById('nf-patente')?.value || '';
  // Recopilar repuestos de todos los servicios agregados
  let repuestosTexto = '';
  if (nfServicios.length) {
    const todosReps = [];
    nfServicios.forEach(s => {
      if (s.repuestos && s.repuestos.length) {
        s.repuestos.forEach(r => todosReps.push(r));
      }
    });
    if (todosReps.length) {
      repuestosTexto = '\n\nRepuestos requeridos:\n' + todosReps.map(r => `- ${r.nombre} - Cant: ${r.cantidad} ${r.unidad}`).join('\n');
    }
  }
  if (!repuestosTexto) repuestosTexto = '\n\n(Pendiente de diagnóstico)';
  const mensaje = `Hola Estimad@ ${nombreProv},\nnecesito cotización de repuestos:\n\nN° OT: NUEVA\nVehículo: ${marca} ${modelo} ${anio}\nPatente: ${patente || 'No registrada'}\nN° Chasis/VIN: ${chasis || 'No registrado'}\nN° Motor: ${motor || 'No registrado'}${repuestosTexto}\n\nIntegral Automotriz\n+569 5165 5331`;
  const num = telefono.replace(/\D/g, '');
  if (num) window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(mensaje), '_blank');
  else showToast('Proveedor sin teléfono registrado', 'warning');
}

// ─── BLOQUE 6: RECEPCIÓN ACTIVA ────────────────────────────────────────────
function nfToggleSinDanos(cb) {
  const group = document.getElementById('nf-desc-danos-group');
  if (!group) return;
  if (cb && cb.checked) {
    document.querySelectorAll('.nf-dano-cb').forEach(c => { if (c !== cb) c.checked = false; });
    group.style.display = 'none';
    return;
  }
  const algunDanos = [...document.querySelectorAll('.nf-dano-cb')].some(c => c.checked && c.value !== 'Sin daños');
  group.style.display = algunDanos ? 'block' : 'none';
}

function nfAgregarFoto(input) {
  if (!input || !input.files) return;
  const maxFotos = 10;
  for (const file of input.files) {
    if (nfFotos.length >= maxFotos) break;
    const reader = new FileReader();
    reader.onload = e => {
      nfFotos.push(e.target.result);
      nfRenderFotos();
    };
    reader.readAsDataURL(file);
  }
  input.value = '';
}

function nfRenderFotos() {
  const prev = document.getElementById('nf-fotos-preview');
  if (!prev) return;
  prev.innerHTML = nfFotos.map((f, i) =>
    `<div style="position:relative;display:inline-block;width:60px;height:60px;margin:4px">
      <img src="${f}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;border:0.5px solid var(--border)">
      <button onclick="nfElimFoto(${i})" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;border:none;background:#ef4444;color:#fff;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center">×</button>
    </div>`
  ).join('');
}

function nfElimFoto(i) { nfFotos.splice(i, 1); nfRenderFotos(); }

// ─── GUARDAR OT ─────────────────────────────────────────────────────────────
function nfGuardarOT() {
  const g = id => (document.getElementById(id)?.value || '').trim();
  const c = id => document.getElementById(id)?.checked || false;

  const patente = g('nf-patente').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const clienteNombre = g('nf-cliente-nombre');
  const clienteApellido = g('nf-cliente-apellido');
  const whatsapp = g('nf-cliente-whatsapp');
  const email = g('nf-cliente-email');

  if (!clienteNombre && !patente) {
    showToast('Ingresa al menos el nombre del cliente o la patente', 'warning');
    return;
  }

  const esExpress = c('nf-express');
  const esGarantia = c('nf-garantia');
  const pruebaRuta = c('nf-prueba-ruta');

  const fechaCitaStr = g('nf-fecha-cita');
  const horaCitaStr = g('nf-hora-cita');
  const fechaTs = (esExpress || !fechaCitaStr)
    ? Date.now()
    : new Date(fechaCitaStr + 'T' + (horaCitaStr || '00:00')).getTime();

  const estado = esExpress ? 'en_proceso'
    : esGarantia ? 'cotizacion'
    : fechaCitaStr ? 'agendado'
    : 'agendado';

  const marca = g('nf-marca');
  const modelo = g('nf-modelo');
  const anio = g('nf-anio');
  const color = g('nf-color');
  const km = parseInt(g('nf-km')) || 0;
  const chasis = g('nf-chasis');
  const motor = g('nf-motor');

  const tecnico = g('nf-tecnico');
  const motivo = g('nf-motivo');
  const servicios = nfServicios.map(s => ({
    nombre: s.nombre,
    horas: s.horas || 0,
    valor: s.valor || 0,
    repuestos: (s.repuestos || []).map(r => ({ nombre: r.nombre, cantidad: r.cantidad, unidad: r.unidad }))
  }));

  // Recepción
  const fluidos = [...document.querySelectorAll('.nf-fluido-cb:checked')].map(el => el.value);
  const inventario = [...document.querySelectorAll('.nf-inventario-cb:checked')].map(el => el.value);
  const danos = [...document.querySelectorAll('.nf-dano-cb:checked')].map(el => el.value);

  // Cliente
  const clientes = APP.lsGet('clientes') || [];
  let clienteId = nfClienteSel?.id || '';
  if (!clienteId) {
    const existente = clientes.find(c =>
      (c.whatsapp || c.wz) && (c.whatsapp || c.wz) === whatsapp
    );
    if (existente) {
      clienteId = existente.id;
      if (clienteNombre) existente.nombre = clienteNombre;
      if (clienteApellido) existente.apellido = clienteApellido;
      if (whatsapp) { existente.whatsapp = whatsapp; existente.wz = whatsapp; }
      if (email) existente.email = email;
    } else {
      clienteId = 'CLI' + Date.now();
      clientes.push({
        id: clienteId,
        nombre: clienteNombre || '',
        apellido: clienteApellido || '',
        whatsapp: whatsapp || '',
        wz: whatsapp || '',
        email: email || '',
        fecha_registro: Date.now()
      });
    }
    APP.lsSet('clientes', clientes);
  } else {
    // Actualizar datos del cliente existente
    const cli = clientes.find(c => c.id === clienteId);
    if (cli) {
      if (clienteNombre) cli.nombre = clienteNombre;
      if (clienteApellido) cli.apellido = clienteApellido;
      if (whatsapp) { cli.whatsapp = whatsapp; cli.wz = whatsapp; }
      if (email) cli.email = email;
      APP.lsSet('clientes', clientes);
    }
  }

  // Vehículo
  const vehiculos = APP.lsGet('vehiculos') || [];
  let vehiculoId = '';
  if (patente) {
    const vehExist = vehiculos.find(v => v.patente === patente);
    if (vehExist) {
      vehiculoId = vehExist.id || 'VEH' + Date.now();
      vehExist.marca = marca || vehExist.marca;
      vehExist.modelo = modelo || vehExist.modelo;
      vehExist.anio = anio || vehExist.anio;
      vehExist.color = color || vehExist.color;
      vehExist.cliente_id = clienteId;
    } else {
      vehiculoId = 'VEH' + Date.now();
      vehiculos.push({
        id: vehiculoId,
        patente,
        marca, modelo, anio, color,
        chasis, motor,
        km_entrada: km,
        cliente_id: clienteId
      });
    }
    APP.lsSet('vehiculos', vehiculos);
  }

  // Generar ID OT
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ds = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const allOTs = APP.lsGet('ots') || [];
  const todayN = allOTs.filter(o => o.id && o.id.startsWith(ds)).length;
  const otId = ds + String(todayN + 1).padStart(4, '0');

  const ot = {
    id: otId,
    fase: 'recepcion',
    estado,
    es_express: esExpress,
    es_garantia: esGarantia,
    autoriza_prueba_ruta: pruebaRuta,
    fecha_ingreso: Date.now(),
    fecha_cita: fechaTs,
    cliente_nombre: clienteNombre || '',
    cliente_apellido: clienteApellido || '',
    cliente_whatsapp: whatsapp || '',
    cliente_email: email || '',
    cliente_id: clienteId,
    vehiculo_patente: patente,
    vehiculo_marca: marca,
    vehiculo_modelo: modelo,
    vehiculo_anio: anio,
    vehiculo_color: color,
    vehiculo_km_entrada: km,
    vehiculo_chasis: chasis,
    vehiculo_motor: motor,
    vehiculo_id: vehiculoId,
    tecnico_id: tecnico,
    motivo_ingreso: motivo,
    servicios: servicios,
    recepcion: {
      objetos_valor: g('nf-objetos-valor') || '',
      documentos: g('nf-documentos') || '',
      combustible: g('nf-combustible') || '',
      fluidos_ok: fluidos,
      inventario: inventario,
      danos: danos,
      descripcion_danos: g('nf-desc-danos') || '',
      fotos_ingreso: nfFotos
    },
    pago: {
      estado: 'pendiente',
      metodo: '',
      referencia: '',
      monto: 0
    },
    historial_eventos: [{
      fecha: Date.now(),
      accion: 'OT creada' + (esExpress ? ' (Express)' : ''),
      usuario: 'Sistema'
    }]
  };

  allOTs.push(ot);
  APP.lsSet('ots', allOTs);
  APP.lsSet('ultimo_ot_id', otId);

  nfCerrarFormulario();
  // Refrescar vista
  if (typeof renderKanban === 'function') renderKanban();
  else if (typeof renderListaOTs === 'function') renderListaOTs();
  showToast('✓ OT #' + otId + ' creada correctamente');
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function _nfEsc(s) { return (s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

// Exponer funciones
window.nfAbrirFormulario = nfAbrirFormulario;
window.nfCerrarFormulario = nfCerrarFormulario;
window.nfGuardarOT = nfGuardarOT;
window.nfBuscarCliente = nfBuscarCliente;
window.nfSelCliente = nfSelCliente;
window.nfSelVehiculo = nfSelVehiculo;
window.nfToggleExpress = nfToggleExpress;
window.nfBuscarServicio = nfBuscarServicio;
window.nfSelServicio = nfSelServicio;
window.nfMostrarBotonAgregar = nfMostrarBotonAgregar;
window.nfAgregarServicio = nfAgregarServicio;
window.nfAgregarRepuesto = nfAgregarRepuesto;
window.nfPatenteInput = nfPatenteInput;
window.nfAbrirHistorial = nfAbrirHistorial;
window.nfToggleSinDanos = nfToggleSinDanos;
window.nfAgregarFoto = nfAgregarFoto;
window.nfActualizarProveedores = nfActualizarProveedores;
window.nfCotizarWA = nfCotizarWA;
window.nfAgregarSugerencia = nfAgregarSugerencia;
