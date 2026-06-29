// ===== FLUJO OT COMPLETO: RECEPCIÓN → DIAGNÓSTICO → COTIZACIÓN =====

// RECEPCIÓN
function otAbrirRecepcion(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  document.getElementById('ot-recepcion-datos-vehiculo').innerHTML = `
    <div class="fgrid2">
      <div><label style="font-size:11px;color:var(--text-muted)">Marca</label><div style="font-size:13px;font-weight:500">${ot.marca || '—'}</div></div>
      <div><label style="font-size:11px;color:var(--text-muted)">Modelo</label><div style="font-size:13px;font-weight:500">${ot.modelo || '—'}</div></div>
      <div><label style="font-size:11px;color:var(--text-muted)">Año</label><div style="font-size:13px;font-weight:500">${ot.anio || '—'}</div></div>
      <div><label style="font-size:11px;color:var(--text-muted)">Patente</label><div style="font-size:13px;font-weight:500;font-family:var(--font-mono)">${ot.patente || '—'}</div></div>
    </div>
  `;

  document.getElementById('ot-recepcion-sintomas-input').value = ot.sintomas || '';
  document.getElementById('ot-recepcion-ot-id-hidden').value = ot_id;
  document.getElementById('ot-recepcion-panel').style.display = '';
}

function otGuardarSintomas(ot_id, sintomas) {
  if (!sintomas.trim()) {
    APP.toast.show('⚠️ Anotar síntomas es obligatorio', 'warning');
    return;
  }

  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  ot.sintomas = sintomas;
  ot.fase = 'diagnostico';
  ot.historial = ot.historial || [];
  ot.historial.push({
    evento: 'Síntomas anotados',
    descripcion: sintomas.substring(0, 50),
    fecha: new Date().toISOString()
  });

  APP.lsSet('ots', ots);
  otAbrirDiagnostico(ot_id);
  APP.toast.show('✅ Síntomas guardados. Ir a diagnóstico', 'success');
}

// DIAGNÓSTICO
function otAbrirDiagnostico(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  // Panel izq: síntomas read-only
  document.getElementById('ot-diagnostico-sintomas-display').innerHTML = `
    <div class="card">
      <div class="ch"><span class="ct">📋 Síntomas del cliente</span></div>
      <div style="padding:10px;background:var(--surface-1);border-radius:var(--radius);font-size:12px;line-height:1.6;color:var(--text-secondary)">${ot.sintomas || 'Sin síntomas registrados'}</div>
    </div>
  `;

  // Panel centro: input diagnóstico
  document.getElementById('ot-diagnostico-input').value = ot.diagnostico || '';

  // Panel derecha: servicios
  otCargarServicios(ot_id);

  document.getElementById('ot-diagnostico-ot-id-hidden').value = ot_id;
  document.getElementById('ot-diagnostico-panel').style.display = '';
}

function otCargarServicios(ot_id) {
  const container = document.getElementById('ot-servicios-checkboxes');
  if (!container) {
    console.error('❌ div#ot-servicios-checkboxes NO EXISTE en HTML');
    return;
  }
  console.log('✓ Container encontrado, limpiando...');
  container.innerHTML = '';

  const servicios_default = [
    {id:'serv-1',nombre:'Cambio aceite',horas:0.5},
    {id:'serv-2',nombre:'Cambio filtro',horas:0.25},
    {id:'serv-3',nombre:'Cambio de frenos',horas:1.5},
    {id:'serv-4',nombre:'Alineación',horas:1},
    {id:'serv-5',nombre:'Balanceo de ruedas',horas:0.75}
  ];

  const servicios = APP.lsGet('mp_servicios', servicios_default);
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  const servicios_seleccionados = ot.servicios_diagnostico || [];

  let html = '';
  servicios.forEach(s => {
    const checked = servicios_seleccionados.includes(s.id) ? 'checked' : '';
    html += `<label style="display:flex;align-items:center;gap:8px;padding:8px;border:0.5px solid var(--border);border-radius:var(--radius);cursor:pointer;background:var(--surface-1)"><input type="checkbox" value="${s.id}" ${checked} onchange="otSeleccionarServicio('${ot_id}','${s.id}')"><div style="flex:1"><div style="font-size:12px;font-weight:500">${s.nombre}</div><div style="font-size:10px;color:var(--text-muted)">${s.horas}h</div></div></label>`;
  });

  container.innerHTML = html;
  console.log('✓ Servicios cargados:', container.innerHTML.length, 'caracteres');
}

function otSeleccionarServicio(ot_id, servicio_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot.servicios_diagnostico) ot.servicios_diagnostico = [];

  if (ot.servicios_diagnostico.includes(servicio_id)) {
    ot.servicios_diagnostico = ot.servicios_diagnostico.filter(s => s !== servicio_id);
  } else {
    ot.servicios_diagnostico.push(servicio_id);
  }

  APP.lsSet('ots', ots);
  otCargarRepuetosSugeridos(ot_id, ot.servicios_diagnostico);
}

function otCargarRepuetosSugeridos(ot_id, servicios_ids) {
  const wiki = APP.lsGet('wiki_tecnica', {});
  const repuestos_sugeridos = [];

  // Buscar en wiki técnica repuestos relacionados
  (wiki.especificaciones || []).forEach(spec => {
    if (servicios_ids.some(id => spec.nombre.toLowerCase().includes(id.toLowerCase()))) {
      repuestos_sugeridos.push(spec);
    }
  });

  const html = repuestos_sugeridos.length
    ? repuestos_sugeridos.map(r => `
      <div style="padding:8px;background:var(--surface-1);border-radius:var(--radius);border:0.5px solid var(--border);margin-bottom:6px">
        <div style="font-size:12px;font-weight:500">${r.nombre}</div>
        <div style="font-size:10px;color:var(--text-muted)">${r.descripcion}</div>
      </div>
    `).join('')
    : '<div style="text-align:center;color:var(--text-muted);padding:10px">Sin repuestos sugeridos</div>';

  document.getElementById('ot-diagnostico-repuestos-sugeridos').innerHTML = html;
}

function otGuardarDiagnostico(ot_id, diagnostico, servicios_ids) {
  if (!diagnostico.trim()) {
    APP.toast.show('⚠️ El diagnóstico es obligatorio', 'warning');
    return;
  }

  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  ot.diagnostico = diagnostico;
  ot.servicios_diagnostico = servicios_ids || [];
  ot.fase = 'cotizacion';
  ot.historial = ot.historial || [];
  ot.historial.push({
    evento: 'Diagnóstico completado',
    descripcion: diagnostico.substring(0, 50),
    fecha: new Date().toISOString()
  });

  APP.lsSet('ots', ots);
  otAbrirCotizacion(ot_id);
  APP.toast.show('✅ Diagnóstico guardado. Armar cotización', 'success');
}

// COTIZACIÓN
function otAbrirCotizacion(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  // Panel izq: diagnóstico y servicios
  document.getElementById('ot-cotizacion-diagnostico-display').innerHTML = `
    <div class="card">
      <div class="ch"><span class="ct">🔍 Diagnóstico</span></div>
      <div style="padding:10px;background:var(--surface-1);border-radius:var(--radius);font-size:12px;line-height:1.6;color:var(--text-secondary)">${ot.diagnostico || 'Sin diagnóstico'}</div>
    </div>
  `;

  // Panel centro: tabla repuestos
  otRenderTablaCotizacion(ot_id);

  // Panel derecha: totales
  otActualizarTotales(ot_id);

  document.getElementById('ot-cotizacion-ot-id-hidden').value = ot_id;
  document.getElementById('ot-cotizacion-panel').style.display = '';
}

function otRenderTablaCotizacion(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot.cotizacion) ot.cotizacion = { repuestos: [], mano_obra: 0 };

  const tablaHTML = `
    <table style="width:100%;font-size:11px;border-collapse:collapse">
      <thead>
        <tr style="background:var(--surface-1);border-bottom:0.5px solid var(--border)">
          <th style="padding:8px;text-align:left">Descripción</th>
          <th style="padding:8px;text-align:center;width:70px">Qty</th>
          <th style="padding:8px;text-align:right;width:100px">Precio Unit.</th>
          <th style="padding:8px;text-align:right;width:100px">Subtotal</th>
          <th style="padding:8px;text-align:center;width:50px">Acción</th>
        </tr>
      </thead>
      <tbody id="ot-cotizacion-repuestos-tbody"></tbody>
    </table>
  `;

  // Renderizar en el panel detalle si existe
  const panelDetalle = document.getElementById('ot-cotizacion-tabla-repuestos');
  if (panelDetalle) {
    panelDetalle.innerHTML = tablaHTML;
  }

  // También en el panel original si existe
  const panelOriginal = document.getElementById('ot-cotizacion-panel-centro');
  if (panelOriginal) {
    const html = `
      <div class="card" style="margin-bottom:14px">
        <div class="ch"><span class="ct">🔩 Repuestos</span></div>
        <div style="margin-bottom:10px">
          ${tablaHTML}
        </div>
        <button class="btn bpa" style="width:100%;justify-content:center;font-size:11px" onclick="otAbrirModalAgregarRepuesto('${ot_id}')">
          <i class="ti ti-plus"></i> Agregar repuesto
        </button>
      </div>
      <div class="card">
        <div class="ch"><span class="ct">💼 Mano de obra</span></div>
        <div class="fgrid2" style="margin-bottom:10px">
          <div class="fg">
            <label>Horas</label>
            <input id="ot-cotizacion-horas" type="number" min="0" step="0.5" value="${ot.cotizacion.mano_obra_horas || 0}" oninput="otActualizarTotales('${ot_id}')">
          </div>
          <div class="fg">
            <label>Tarifa/hora</label>
            <input type="text" readonly value="$${APP.lsGet('taller_config', {}).tarifa_hora || 0}">
          </div>
        </div>
        <div style="font-size:12px;font-weight:500;text-align:right;padding:8px;background:var(--surface-1);border-radius:var(--radius)">
          Mano obra: $<span id="ot-cotizacion-mano-obra-valor">0</span>
        </div>
      </div>
    `;
    panelOriginal.innerHTML = html;
  }

  // Renderizar repuestos
  if (ot.cotizacion.repuestos && ot.cotizacion.repuestos.length > 0) {
    const tbody = document.getElementById('ot-cotizacion-repuestos-tbody');
    tbody.innerHTML = ot.cotizacion.repuestos.map((r, i) => `
      <tr style="border-bottom:0.5px solid var(--border)">
        <td style="padding:8px">${r.nombre || '—'}</td>
        <td style="padding:8px;text-align:center"><input type="number" min="1" value="${r.cantidad}" style="width:50px;text-align:center" oninput="otActualizarRepuesto('${ot_id}',${i},'cantidad',this.value)"></td>
        <td style="padding:8px;text-align:right"><input type="number" min="0" value="${r.precio_unitario || 0}" style="width:90px;text-align:right" oninput="otActualizarRepuesto('${ot_id}',${i},'precio',this.value)"></td>
        <td style="padding:8px;text-align:right;font-weight:500">$${((r.cantidad || 0) * (r.precio_unitario || 0)).toLocaleString('es-CL')}</td>
        <td style="padding:8px;text-align:center"><button class="btn" style="font-size:10px;padding:3px 6px;color:var(--text-danger)" onclick="otEliminarRepuesto('${ot_id}',${i})"><i class="ti ti-trash"></i></button></td>
      </tr>
    `).join('');
  }
}

function otAbrirModalAgregarRepuesto(ot_id) {
  document.getElementById('ot-modal-repuesto-ot-id').value = ot_id;
  document.getElementById('ot-modal-repuesto-nombre').value = '';
  document.getElementById('ot-modal-repuesto-cantidad').value = '1';
  document.getElementById('ot-modal-repuesto-precio').value = '';
  document.getElementById('ot-modal-repuesto').style.display = '';
}

function otCerrarModalRepuesto() {
  document.getElementById('ot-modal-repuesto').style.display = 'none';
}

function otGuardarRepuesto() {
  const ot_id = document.getElementById('ot-modal-repuesto-ot-id').value;
  const nombre = document.getElementById('ot-modal-repuesto-nombre').value.trim();
  const cantidad = parseInt(document.getElementById('ot-modal-repuesto-cantidad').value) || 1;
  const precio = parseFloat(document.getElementById('ot-modal-repuesto-precio').value) || 0;

  if (!nombre) {
    APP.toast.show('⚠️ Nombre del repuesto es obligatorio', 'warning');
    return;
  }

  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot.cotizacion) ot.cotizacion = { repuestos: [] };

  ot.cotizacion.repuestos.push({ nombre, cantidad, precio_unitario: precio });
  APP.lsSet('ots', ots);

  otCerrarModalRepuesto();
  otRenderTablaCotizacion(ot_id);
  otActualizarTotales(ot_id);
  APP.toast.show('✅ Repuesto agregado', 'success');
}

function otActualizarRepuesto(ot_id, index, campo, valor) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot.cotizacion.repuestos[index]) return;

  if (campo === 'cantidad') {
    ot.cotizacion.repuestos[index].cantidad = parseInt(valor) || 0;
  } else if (campo === 'precio') {
    ot.cotizacion.repuestos[index].precio_unitario = parseFloat(valor) || 0;
  }

  APP.lsSet('ots', ots);
  otActualizarTotales(ot_id);
}

function otEliminarRepuesto(ot_id, index) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  ot.cotizacion.repuestos.splice(index, 1);
  APP.lsSet('ots', ots);
  otRenderTablaCotizacion(ot_id);
  otActualizarTotales(ot_id);
}

function otActualizarTotales(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  const config = APP.lsGet('taller_config', {});

  if (!ot.cotizacion) ot.cotizacion = { repuestos: [] };

  // Subtotal repuestos
  const subtotal_repuestos = ot.cotizacion.repuestos.reduce((s, r) => s + ((r.cantidad || 0) * (r.precio_unitario || 0)), 0);

  // Mano de obra
  const horas = parseFloat(document.getElementById('ot-cotizacion-horas')?.value || 0) || 0;
  const tarifa_hora = config.tarifa_hora || 0;
  const mano_obra = horas * tarifa_hora;

  ot.cotizacion.mano_obra_horas = horas;
  ot.cotizacion.mano_obra = mano_obra;

  // Totales
  const subtotal = subtotal_repuestos + mano_obra;
  const iva = subtotal * 0.19;
  const total = subtotal + iva;

  // Actualizar tarifa mostrada
  const tarifaInput = document.getElementById('ot-cotizacion-tarifa');
  if (tarifaInput) tarifaInput.value = '$' + tarifa_hora.toLocaleString('es-CL');

  // Actualizar mano obra
  const manoObraVal = document.getElementById('ot-cotizacion-mano-obra-valor');
  if (manoObraVal) manoObraVal.textContent = mano_obra.toLocaleString('es-CL');

  const totalesHTML = `
    <div class="card">
      <div class="ch"><span class="ct">💰 Totales</span></div>
      <div style="display:flex;justify-content:space-between;padding:10px;border-bottom:0.5px solid var(--border);font-size:12px">
        <span>Subtotal repuestos:</span>
        <span style="font-weight:500">$${subtotal_repuestos.toLocaleString('es-CL')}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px;border-bottom:0.5px solid var(--border);font-size:12px">
        <span>Mano de obra:</span>
        <span style="font-weight:500">$${mano_obra.toLocaleString('es-CL')}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px;border-bottom:0.5px solid var(--border);font-size:12px">
        <span>Subtotal:</span>
        <span style="font-weight:500">$${subtotal.toLocaleString('es-CL')}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px;border-bottom:0.5px solid var(--border);font-size:12px;color:var(--text-secondary)">
        <span>IVA 19%:</span>
        <span style="font-weight:500">$${iva.toLocaleString('es-CL')}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px;background:var(--bg-accent);border-radius:var(--radius);font-size:13px;font-weight:600;color:var(--text-accent)">
        <span>TOTAL:</span>
        <span>$${total.toLocaleString('es-CL')}</span>
      </div>
    </div>
  `;

  // Panel detalle
  const panelDetalle = document.getElementById('ot-cotizacion-panel-totales');
  if (panelDetalle) panelDetalle.innerHTML = totalesHTML;

  // Panel original
  const panel_derecha = document.getElementById('ot-cotizacion-panel-derecha');
  if (panel_derecha) {
    panel_derecha.innerHTML = totalesHTML;
  }

  APP.lsSet('ots', ots);
}

// Exportar
// ===== NAVEGACIÓN ENTRE FASES =====
function otAbrirDetalleOT(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  // Mostrar panel detalle
  document.getElementById('ot-detalle-panel-tabs').style.display = '';
  document.getElementById('ot-detalle-ot-id-hidden').value = ot_id;

  // Mostrar tab según estado actual
  const estado = ot.estado || 'recepcion';

  if (estado === 'recepcion' || estado === 'agendado') {
    otMostrarTabRecepcion(ot_id);
  } else if (estado === 'en_diagnostico' || estado === 'diagnostico') {
    otMostrarTabDiagnostico(ot_id);
  } else if (estado === 'armar_cotizacion' || estado === 'cotizacion') {
    otMostrarTabCotizacion(ot_id);
  } else {
    otMostrarTabRecepcion(ot_id);
  }
}

function otMostrarTabRecepcion(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  document.getElementById('ot-tab-recepcion').style.display = '';
  document.getElementById('ot-tab-diagnostico').style.display = 'none';
  document.getElementById('ot-tab-cotizacion').style.display = 'none';

  // Datos cliente/vehículo
  document.getElementById('ot-recepcion-cliente').textContent = ot.cliente_nombre || '—';
  document.getElementById('ot-recepcion-vehiculo').textContent = `${ot.marca || '—'} ${ot.modelo || '—'} ${ot.anio || ''}`;
  document.getElementById('ot-recepcion-patente').textContent = ot.patente || '—';

  // Síntomas
  document.getElementById('ot-recepcion-sintomas').value = ot.sintomas || '';
  document.getElementById('ot-recepcion-ot-id').value = ot_id;

  // Highlight tab activo
  document.querySelectorAll('#ot-detalle-tabs button').forEach(btn => btn.style.borderBottomColor = 'transparent');
  document.getElementById('ot-btn-recepcion').style.borderBottomColor = 'var(--fill-accent)';
}

function otMostrarTabDiagnostico(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) {
    console.error('DEBUG: OT no encontrada', ot_id);
    return;
  }

  document.getElementById('ot-tab-recepcion').style.display = 'none';
  document.getElementById('ot-tab-diagnostico').style.display = '';
  document.getElementById('ot-tab-cotizacion').style.display = 'none';

  // Síntomas read-only
  document.getElementById('ot-diagnostico-sintomas-ro').textContent = ot.sintomas || 'Sin síntomas registrados';

  // Diagnóstico editable
  document.getElementById('ot-diagnostico-input').value = ot.diagnostico || '';
  document.getElementById('ot-diagnostico-ot-id').value = ot_id;

  console.log('DEBUG: Antes de otCargarServicios, container existe?', !!document.getElementById('ot-servicios-checkboxes'));

  // Cargar servicios
  otCargarServicios(ot_id);

  console.log('DEBUG: Después de otCargarServicios, HTML del container:', document.getElementById('ot-servicios-checkboxes')?.innerHTML);

  // Highlight tab activo
  document.querySelectorAll('#ot-detalle-tabs button').forEach(btn => btn.style.borderBottomColor = 'transparent');
  document.getElementById('ot-btn-diagnostico').style.borderBottomColor = 'var(--fill-accent)';
}

function otMostrarTabCotizacion(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  document.getElementById('ot-tab-recepcion').style.display = 'none';
  document.getElementById('ot-tab-diagnostico').style.display = 'none';
  document.getElementById('ot-tab-cotizacion').style.display = '';

  // Diagnóstico read-only
  document.getElementById('ot-cotizacion-diagnostico-ro').textContent = ot.diagnostico || 'Sin diagnóstico';

  // Cargar cotización
  otRenderTablaCotizacion(ot_id);
  otActualizarTotales(ot_id);

  document.getElementById('ot-cotizacion-ot-id').value = ot_id;

  // Highlight tab activo
  document.querySelectorAll('#ot-detalle-tabs button').forEach(btn => btn.style.borderBottomColor = 'transparent');
  document.getElementById('ot-btn-cotizacion').style.borderBottomColor = 'var(--fill-accent)';
}

function otGuardarSintomas() {
  const ot_id = document.getElementById('ot-recepcion-ot-id').value;
  const sintomas = document.getElementById('ot-recepcion-sintomas').value.trim();

  if (!sintomas) {
    APP.toast.show('⚠️ Anotar síntomas es obligatorio', 'warning');
    return;
  }

  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  ot.sintomas = sintomas;
  ot.estado = 'en_diagnostico';
  ot.fecha_modificacion = new Date().toISOString();

  APP.lsSet('ots', ots);
  otMostrarTabDiagnostico(ot_id);
  APP.toast.show('✅ Síntomas guardados. Avanzando a diagnóstico...', 'success');
}

function otGuardarDiagnosticoNuevo() {
  const ot_id = document.getElementById('ot-diagnostico-ot-id').value || '';
  const diag_input = document.getElementById('ot-diagnostico-input');
  const diagnostico = (diag_input ? diag_input.value : '').trim();

  if (!ot_id) {
    APP.toast.show('⚠️ Error: No se encontró la OT', 'error');
    return;
  }

  if (!diagnostico || diagnostico.length === 0) {
    APP.toast.show('⚠️ Anotar diagnóstico es obligatorio', 'warning');
    return;
  }

  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  // Obtener servicios seleccionados
  const servicios_seleccionados = Array.from(
    document.querySelectorAll('#ot-servicios-checkboxes input[type="checkbox"]:checked')
  ).map(cb => cb.value);

  ot.diagnostico = diagnostico;
  ot.servicios_seleccionados = servicios_seleccionados;
  ot.estado = 'armar_cotizacion';
  ot.fecha_modificacion = new Date().toISOString();

  APP.lsSet('ots', ots);
  otMostrarTabCotizacion(ot_id);
  APP.toast.show('✅ Diagnóstico guardado. Avanzando a cotización...', 'success');
}

function otVolverRecepcion(ot_id) {
  otMostrarTabRecepcion(ot_id);
}

function otVolverDiagnostico(ot_id) {
  otMostrarTabDiagnostico(ot_id);
}

function otGuardarCotizacion() {
  const ot_id = document.getElementById('ot-cotizacion-ot-id').value;
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  ot.estado = 'esperando_aprobacion';
  ot.fecha_modificacion = new Date().toISOString();

  APP.lsSet('ots', ots);
  APP.toast.show('✅ Cotización guardada', 'success');
  tallerMostrarPanelAcciones(ot_id);
}

// ===== DETALLE READ-ONLY (SEPARADO DE EDICIÓN) =====
function otAbrirParaEditar(ot_id) {
  otAbrirDetalleOT(ot_id);
}

function otCerrarDetalle() {
  const el = document.getElementById('ot-detalle-overlay');
  if (el) el.remove();
}

function otMostrarDetalle(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) {
    APP.toast.show('⚠️ OT no encontrada', 'error');
    return;
  }

  // Servicios
  const servicios_default = [
    {id:'serv-1',nombre:'Cambio aceite'},{id:'serv-2',nombre:'Cambio filtro'},
    {id:'serv-3',nombre:'Cambio de frenos'},{id:'serv-4',nombre:'Alineación'},
    {id:'serv-5',nombre:'Balanceo de ruedas'}
  ];
  const servicios = APP.lsGet('mp_servicios', servicios_default);
  const servSeleccionados = ot.servicios_diagnostico || ot.servicios_seleccionados || [];
  const servNombres = servSeleccionados.map(id => {
    const s = servicios.find(sv => sv.id === id);
    return s ? s.nombre : id;
  });

  // Repuestos
  const repuestos = ot.cotizacion?.repuestos || [];
  const subtotal_rep = repuestos.reduce((s, r) => s + ((r.cantidad||0)*(r.precio_unitario||0)), 0);
  const mano_obra = ot.cotizacion?.mano_obra || 0;
  const subtotal = subtotal_rep + mano_obra;
  const iva = subtotal * 0.19;
  const total = subtotal + iva;

  // Estado
  const estadoMap = {
    recepcion:'📝 Recepción', agendado:'📅 Agendado',
    en_diagnostico:'🔍 En diagnóstico', diagnostico:'🔍 Diagnóstico',
    armar_cotizacion:'💰 Armar cotización', cotizacion:'💰 Cotización',
    esperando_aprobacion:'⏳ Esperando aprobación',
    aprobado:'✅ Aprobado', en_reparacion:'🔧 En reparación',
    completado:'🏁 Completado', facturado:'🧾 Facturado',
    cancelado:'❌ Cancelado', reagendar:'📅 Reagendar'
  };

  const badgeColor = ot.estado === 'cancelado' ? '#dc2626' :
    ot.estado === 'completado' || ot.estado === 'facturado' ? '#16a34a' :
    ot.estado === 'esperando_aprobacion' || ot.estado === 'aprobado' ? '#ca8a04' :
    ot.estado === 'recepcion' || ot.estado === 'agendado' ? '#2563eb' : '#7c3aed';

  const html = `
    <div id="ot-detalle-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1000;overflow-y:auto;padding:20px" onclick="if(event.target===this)otCerrarDetalle()">
      <div style="background:var(--bg-primary);max-width:840px;margin:20px auto;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,0.3)">

        <!-- Header -->
        <div style="background:var(--surface-1);padding:16px 20px;border-bottom:0.5px solid var(--border);display:flex;align-items:center;justify-content:space-between;border-radius:8px 8px 0 0">
          <div>
            <div style="font-size:16px;font-weight:600;color:var(--text-primary)">OT #${ot.id} — Detalle completo</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
              ${ot.vehiculo_marca || ''} ${ot.vehiculo_modelo || ''}${ot.vehiculo_anio ? ' '+ot.vehiculo_anio : ''} ·
              ${ot.cliente_nombre || '—'}
              <span style="display:inline-block;margin-left:8px;padding:1px 8px;border-radius:8px;font-size:10px;font-weight:600;background:${badgeColor}22;color:${badgeColor};border:0.5px solid ${badgeColor}44">
                ${estadoMap[ot.estado] || ot.estado || '—'}
              </span>
            </div>
          </div>
          <button onclick="otCerrarDetalle()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-muted);line-height:1">×</button>
        </div>

        <!-- Body -->
        <div style="padding:20px;max-height:75vh;overflow-y:auto;display:flex;flex-direction:column;gap:16px">

          <!-- Cliente -->
          <div class="card">
            <div class="ch"><span class="ct">👤 Cliente</span></div>
            <div class="fgrid2">
              <div><label style="font-size:11px;color:var(--text-muted)">Nombre</label><div style="font-weight:500;font-size:13px">${ot.cliente_nombre || '—'}</div></div>
              <div><label style="font-size:11px;color:var(--text-muted)">RUT</label><div style="font-size:13px">${ot.cliente_rut || ot.rut || '—'}</div></div>
              <div><label style="font-size:11px;color:var(--text-muted)">WhatsApp</label><div style="font-size:13px">${ot.cliente_whatsapp || ot.whatsapp || '—'}</div></div>
              <div><label style="font-size:11px;color:var(--text-muted)">Email</label><div style="font-size:13px">${ot.cliente_email || ot.email || '—'}</div></div>
            </div>
          </div>

          <!-- Vehículo -->
          <div class="card">
            <div class="ch"><span class="ct">🚗 Vehículo</span></div>
            <div class="fgrid2">
              <div><label style="font-size:11px;color:var(--text-muted)">Marca</label><div style="font-weight:500">${ot.vehiculo_marca || ot.marca || '—'}</div></div>
              <div><label style="font-size:11px;color:var(--text-muted)">Modelo</label><div style="font-weight:500">${ot.vehiculo_modelo || ot.modelo || '—'}</div></div>
              <div><label style="font-size:11px;color:var(--text-muted)">Año</label><div>${ot.vehiculo_anio || ot.anio || '—'}</div></div>
              <div><label style="font-size:11px;color:var(--text-muted)">Patente</label><div style="font-family:var(--font-mono)">${ot.patente || '—'}</div></div>
              <div><label style="font-size:11px;color:var(--text-muted)">Motor</label><div>${ot.vehiculo_motor || ot.motor || '—'}</div></div>
              <div><label style="font-size:11px;color:var(--text-muted)">Chasis/VIN</label><div>${ot.vehiculo_chasis || ot.chasis || ot.vin || '—'}</div></div>
              <div><label style="font-size:11px;color:var(--text-muted)">Kilometraje</label><div>${ot.vehiculo_km_entrada || ot.km_entrada || ot.km ? (Number(ot.vehiculo_km_entrada||ot.km_entrada||ot.km||0).toLocaleString('es-CL')+' km') : '—'}</div></div>
              <div><label style="font-size:11px;color:var(--text-muted)">Color</label><div>${ot.vehiculo_color || ot.color || '—'}</div></div>
            </div>
          </div>

          ${ot.sintomas ? `
          <!-- Síntomas -->
          <div class="card">
            <div class="ch"><span class="ct">📝 Síntomas del cliente</span></div>
            <div style="padding:12px;background:var(--surface-1);border-radius:var(--radius);font-size:12px;line-height:1.6;color:var(--text-secondary)">${ot.sintomas}</div>
          </div>` : ''}

          ${ot.diagnostico ? `
          <!-- Diagnóstico -->
          <div class="card">
            <div class="ch"><span class="ct">🔍 Diagnóstico técnico</span></div>
            <div style="padding:12px;background:var(--surface-1);border-radius:var(--radius);font-size:12px;line-height:1.6;color:var(--text-secondary)">${ot.diagnostico}</div>
          </div>` : ''}

          ${servNombres.length > 0 ? `
          <!-- Servicios seleccionados -->
          <div class="card">
            <div class="ch"><span class="ct">🔧 Servicios a realizar</span></div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;padding:4px 0">
              ${servNombres.map(n => `<span style="padding:4px 12px;background:var(--surface-1);border:0.5px solid var(--border);border-radius:var(--radius);font-size:12px">${n}</span>`).join('')}
            </div>
          </div>` : ''}

          ${repuestos.length > 0 ? `
          <!-- Repuestos -->
          <div class="card">
            <div class="ch"><span class="ct">📦 Repuestos</span></div>
            <div style="overflow-x:auto">
              <table style="width:100%;border-collapse:collapse;font-size:12px">
                <thead>
                  <tr style="background:var(--surface-2);border-bottom:0.5px solid var(--border)">
                    <th style="text-align:left;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Repuesto</th>
                    <th style="text-align:center;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Cant.</th>
                    <th style="text-align:right;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Precio Unit.</th>
                    <th style="text-align:right;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${repuestos.map(r => `
                    <tr style="border-bottom:0.5px solid var(--border)">
                      <td style="padding:8px">${r.nombre || '—'}</td>
                      <td style="padding:8px;text-align:center">${r.cantidad || 0}</td>
                      <td style="padding:8px;text-align:right">$${(r.precio_unitario || 0).toLocaleString('es-CL')}</td>
                      <td style="padding:8px;text-align:right;font-weight:500">$${((r.cantidad||0)*(r.precio_unitario||0)).toLocaleString('es-CL')}</td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>` : ''}

          ${mano_obra > 0 || (ot.cotizacion?.mano_obra_horas) ? `
          <!-- Mano de obra -->
          <div class="card">
            <div class="ch"><span class="ct">💼 Mano de obra</span></div>
            <div class="fgrid2">
              <div><label style="font-size:11px;color:var(--text-muted)">Horas</label><div style="font-weight:500">${ot.cotizacion?.mano_obra_horas || '—'}</div></div>
              <div><label style="font-size:11px;color:var(--text-muted)">Valor</label><div style="font-weight:500">$${(mano_obra || 0).toLocaleString('es-CL')}</div></div>
            </div>
          </div>` : ''}

          ${subtotal > 0 ? `
          <!-- Totales -->
          <div class="card">
            <div class="ch"><span class="ct">💰 Totales</span></div>
            <div style="padding:10px 0">
              ${repuestos.length > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span>Subtotal repuestos</span><span>$${subtotal_rep.toLocaleString('es-CL')}</span></div>` : ''}
              ${mano_obra > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span>Mano de obra</span><span>$${mano_obra.toLocaleString('es-CL')}</span></div>` : ''}
              <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span>Subtotal</span><span style="font-weight:500">$${subtotal.toLocaleString('es-CL')}</span></div>
              <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:var(--text-muted)"><span>IVA 19%</span><span>$${iva.toLocaleString('es-CL')}</span></div>
              <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-size:14px;font-weight:700;border-top:0.5px solid var(--border);margin-top:4px;color:var(--text-accent)">
                <span>TOTAL</span><span>$${total.toLocaleString('es-CL')}</span>
              </div>
            </div>
          </div>` : ''}

        </div>

        <!-- Footer: estado actual + acciones -->
        <div style="padding:14px 20px;border-top:0.5px solid var(--border);background:var(--surface-1);border-radius:0 0 8px 8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;font-size:12px;color:var(--text-muted)">
            <i class="ti ti-info-circle"></i> Estado: <strong style="color:${badgeColor}">${estadoMap[ot.estado] || ot.estado || '—'}</strong>
          </div>
          ${(ot.estado === 'recepcion' || ot.estado === 'agendado') ? `
            <button class="btn bpa" onclick="otCerrarDetalle();setTimeout(()=>otAbrirParaEditar('${ot.id}'),100)" style="font-size:12px;padding:8px 20px">
              <i class="ti ti-arrow-right"></i> Ir a Diagnóstico
            </button>` : ''}
          ${(ot.estado === 'en_diagnostico' || ot.estado === 'diagnostico') ? `
            <button class="btn bpa" onclick="otCerrarDetalle();setTimeout(()=>otAbrirParaEditar('${ot.id}'),100)" style="font-size:12px;padding:8px 20px">
              <i class="ti ti-arrow-right"></i> Ir a Cotización
            </button>` : ''}
          ${(ot.estado === 'armar_cotizacion' || ot.estado === 'cotizacion' || ot.estado === 'esperando_aprobacion' || ot.estado === 'aprobado') ? `
            <button class="btn" onclick="otCerrarDetalle();setTimeout(()=>otAbrirParaEditar('${ot.id}'),100)" style="font-size:12px;padding:8px 20px">
              <i class="ti ti-edit"></i> Editar OT
            </button>` : ''}
          <button class="btn" onclick="otCerrarDetalle()" style="font-size:12px;padding:8px 16px">
            <i class="ti ti-x"></i> Cerrar
          </button>
        </div>
      </div>
    </div>
  `;

  // Remover overlay existente y agregar nuevo
  const existing = document.getElementById('ot-detalle-overlay');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstElementChild);
}

window.otAbrirRecepcion = otAbrirRecepcion;
window.otGuardarSintomas = otGuardarSintomas;
window.otAbrirDiagnostico = otAbrirDiagnostico;
window.otCargarServicios = otCargarServicios;
window.otSeleccionarServicio = otSeleccionarServicio;
window.otCargarRepuetosSugeridos = otCargarRepuetosSugeridos;
window.otGuardarDiagnostico = otGuardarDiagnostico;
window.otAbrirCotizacion = otAbrirCotizacion;
window.otRenderTablaCotizacion = otRenderTablaCotizacion;
window.otAbrirModalAgregarRepuesto = otAbrirModalAgregarRepuesto;
window.otCerrarModalRepuesto = otCerrarModalRepuesto;
window.otGuardarRepuesto = otGuardarRepuesto;
window.otActualizarRepuesto = otActualizarRepuesto;
window.otEliminarRepuesto = otEliminarRepuesto;
window.otActualizarTotales = otActualizarTotales;
window.otAbrirDetalleOT = otAbrirDetalleOT;
window.otMostrarTabRecepcion = otMostrarTabRecepcion;
window.otMostrarTabDiagnostico = otMostrarTabDiagnostico;
window.otMostrarTabCotizacion = otMostrarTabCotizacion;
window.otGuardarSintomas = otGuardarSintomas;
window.otGuardarDiagnosticoNuevo = otGuardarDiagnosticoNuevo;
window.otVolverRecepcion = otVolverRecepcion;
window.otVolverDiagnostico = otVolverDiagnostico;
window.otGuardarCotizacion = otGuardarCotizacion;
window.otAbrirParaEditar = otAbrirParaEditar;
window.otMostrarDetalle = otMostrarDetalle;
window.otCerrarDetalle = otCerrarDetalle;
