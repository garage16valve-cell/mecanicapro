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

// DIAGNÓSTICO (standalone panel, legacy)
function otAbrirDiagnostico(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  document.getElementById('ot-diagnostico-sintomas-display').innerHTML = `
    <div class="card">
      <div class="ch"><span class="ct">📋 Síntomas del cliente</span></div>
      <div style="padding:10px;background:var(--surface-1);border-radius:var(--radius);font-size:12px;line-height:1.6;color:var(--text-secondary)">${ot.sintomas || 'Sin síntomas registrados'}</div>
    </div>
  `;

  const panelInput = document.getElementById('ot-diagnostico-input-panel') || document.getElementById('ot-diagnostico-input');
  if (panelInput) panelInput.value = ot.diagnostico || '';

  document.getElementById('ot-diagnostico-ot-id-hidden').value = ot_id;
  document.getElementById('ot-diagnostico-panel').style.display = '';
  // Inicializar multi-service
  otDiagServicios = ot.servicios || [];
  otDiagRepuestos = [];
  otDiagRenderServicios('_panel');
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
  document.getElementById('ot-cotizacion-diagnostico-display').innerHTML = `
    <div class="card">
      <div class="ch"><span class="ct">🔍 Diagnóstico</span></div>
      <div style="padding:10px;background:var(--surface-1);border-radius:var(--radius);font-size:12px;line-height:1.6;color:var(--text-secondary)">${ot.diagnostico || 'Sin diagnóstico'}</div>
    </div>
  `;
  const tbody = document.getElementById('ot-cotizacion-tbody-panel');
  if (tbody && ot.cotizacion && ot.cotizacion.repuestos) {
    tbody.innerHTML = ot.cotizacion.repuestos.map((r, i) => `<tr>
      <td style="padding:6px"><input type="text" value="${r.nombre||''}" class="ot-cot-rep-nombre" style="width:100%;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;box-sizing:border-box"></td>
      <td style="padding:6px;text-align:center"><input type="number" min="1" value="${r.cantidad||1}" class="ot-cot-rep-cant" style="width:50px;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;text-align:center;box-sizing:border-box" oninput="otRecalcularCotizacionPanel()"></td>
      <td style="padding:6px;text-align:right"><input type="number" min="0" value="${r.precio_unitario||0}" class="ot-cot-rep-precio" style="width:90px;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;text-align:right;box-sizing:border-box" oninput="otRecalcularCotizacionPanel()"></td>
      <td style="padding:6px;text-align:right;font-weight:500" class="ot-cot-rep-sub">$${((r.cantidad||0)*(r.precio_unitario||0)).toLocaleString('es-CL')}</td>
      <td style="padding:6px;text-align:center"><button onclick="this.closest('tr').remove();otRecalcularCotizacionPanel()" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:14px;padding:4px"><i class="ti ti-trash"></i></button></td>
    </tr>`).join('');
  }
  document.getElementById('ot-cotizacion-horas-panel').value = ot.cotizacion?.mano_obra_horas || 0;
  document.getElementById('ot-cotizacion-ot-id-hidden').value = ot_id;
  document.getElementById('ot-cotizacion-panel').style.display = '';
  otRecalcularCotizacionPanel();
  if (ot.cotizacion_pdf_generado) {
    const preview = document.getElementById('ot-cotizacion-preview-panel');
    if (preview) preview.style.display = 'block';
    const iframe = document.getElementById('ot-cotizacion-pdf-iframe-panel');
    if (iframe && ot.cotizacion_pdf_datauri) iframe.src = ot.cotizacion_pdf_datauri;
  }
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

  // Inicializar multi-service desde OT existente
  otDiagServicios = ot.servicios || [];
  otDiagRepuestos = [];
  otDiagRenderServicios('_tab');

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
  document.getElementById('ot-cotizacion-diagnostico-ro').textContent = ot.diagnostico || 'Sin diagnóstico';
  const tbody = document.getElementById('ot-cotizacion-tbody');
  if (tbody && ot.cotizacion && ot.cotizacion.repuestos) {
    tbody.innerHTML = ot.cotizacion.repuestos.map((r, i) => `<tr>
      <td style="padding:6px"><input type="text" value="${r.nombre||''}" class="ot-cot-rep-nombre" style="width:100%;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;box-sizing:border-box"></td>
      <td style="padding:6px;text-align:center"><input type="number" min="1" value="${r.cantidad||1}" class="ot-cot-rep-cant" style="width:50px;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;text-align:center;box-sizing:border-box" oninput="otRecalcularCotizacionTab()"></td>
      <td style="padding:6px;text-align:right"><input type="number" min="0" value="${r.precio_unitario||0}" class="ot-cot-rep-precio" style="width:90px;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;text-align:right;box-sizing:border-box" oninput="otRecalcularCotizacionTab()"></td>
      <td style="padding:6px;text-align:right;font-weight:500" class="ot-cot-rep-sub">$${((r.cantidad||0)*(r.precio_unitario||0)).toLocaleString('es-CL')}</td>
      <td style="padding:6px;text-align:center"><button onclick="this.closest('tr').remove();otRecalcularCotizacionTab()" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:14px;padding:4px"><i class="ti ti-trash"></i></button></td>
    </tr>`).join('');
  }
  document.getElementById('ot-cotizacion-horas').value = ot.cotizacion?.mano_obra_horas || 0;
  document.getElementById('ot-cotizacion-ot-id').value = ot_id;
  otRecalcularCotizacionTab();
  if (ot.cotizacion_pdf_generado) {
    const btn = document.getElementById('ot-btn-generar-pdf-cot');
    if (btn) btn.style.display = 'none';
    const preview = document.getElementById('ot-cotizacion-preview');
    if (preview) preview.style.display = 'block';
    const iframe = document.getElementById('ot-cotizacion-pdf-iframe');
    if (iframe && ot.cotizacion_pdf_datauri) iframe.src = ot.cotizacion_pdf_datauri;
  }

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

// ===== SISTEMA FLUJO 8 ESTADOS =====

function _otCerrarPanelFase() {
  const el = document.getElementById('ot-panel-fase-overlay');
  if (el) el.remove();
}

function _otAvanzarAFase(ot_id, sigFase, sigLabel) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  ot.fase = sigFase;
  ot.historial_eventos = ot.historial_eventos || [];
  ot.historial_eventos.push({ fecha: Date.now(), fase: sigFase, accion: `Avanzó a ${sigLabel}`, usuario: 'Sistema', descripcion: '' });
  ot.fecha_modificacion = new Date().toISOString();
  APP.lsSet('ots', ots);
  _otCerrarPanelFase();
  if (typeof renderKanban === 'function') renderKanban();
  APP.toast.show(`✅ OT #${ot_id} avanzó a ${sigLabel}`, 'success');
}

function _otOverlay(contenido) {
  _otCerrarPanelFase();
  const d = document.createElement('div');
  d.innerHTML = `<div id="ot-panel-fase-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1050;overflow-y:auto;padding:20px" onclick="if(event.target===this)_otCerrarPanelFase()"><div style="background:var(--bg-primary);max-width:800px;margin:20px auto;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,0.3)">${contenido}</div></div>`;
  document.body.appendChild(d.firstElementChild);
}

function _otBtnCerrar() {
  return `<button onclick="_otCerrarPanelFase()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--text-muted);line-height:1">×</button>`;
}

function _otHeader(ot, titulo) {
  return `<div style="background:var(--surface-1);padding:16px 20px;border-bottom:0.5px solid var(--border);display:flex;align-items:center;justify-content:space-between;border-radius:8px 8px 0 0"><div><div style="font-size:16px;font-weight:600;color:var(--text-primary)">${titulo} — OT #${ot.id}</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px">${ot.vehiculo_marca||''} ${ot.vehiculo_modelo||''} · ${ot.cliente_nombre||'—'} · ${ot.patente||'—'}</div></div>${_otBtnCerrar()}</div>`;
}

function _otFooter(buttons) {
  return `<div style="padding:14px 20px;border-top:0.5px solid var(--border);background:var(--surface-1);border-radius:0 0 8px 8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end">${buttons}</div>`;
}

function _otBody(html) {
  return `<div style="padding:20px;max-height:70vh;overflow-y:auto;display:flex;flex-direction:column;gap:16px">${html}</div>`;
}

function _otCard(titulo, contenido) {
  return `<div class="card"><div class="ch"><span class="ct">${titulo}</span></div>${contenido}</div>`;
}

function _otReadonly(label, valor) {
  return `<div><label style="font-size:11px;color:var(--text-muted)">${label}</label><div style="font-size:13px;font-weight:500">${valor||'—'}</div></div>`;
}

function _otGrid2(items) {
  return `<div class="fgrid2">${items.join('')}</div>`;
}

// ===== DISPATCHER =====
function otAvanzarFase(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  const fase = ot.fase || 'recepcion';
  const cmd = { recepcion: 'otAbrirPanelRecepcion', diagnostico: 'otAbrirPanelDiagnostico', repuestos: 'otAbrirPanelRepuestos', aprobacion: 'otAbrirPanelAprobacion', reparacion: 'otAbrirPanelReparacion', control: 'otAbrirPanelControl', entrega: 'otAbrirPanelEntrega' }[fase];
  if (cmd && typeof window[cmd] === 'function') window[cmd](ot_id);
  else APP.toast.show('⚠️ No hay panel disponible para esta fase', 'warning');
}

// ===== PANEL 1: RECEPCIÓN =====
function otAbrirPanelRecepcion(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  _otOverlay(`
    ${_otHeader(ot, '🚶 Recepción — Anotar síntomas')}
    ${_otBody(`
      ${_otCard('📋 Datos del vehículo', _otGrid2([
        _otReadonly('Marca', ot.vehiculo_marca||ot.marca),
        _otReadonly('Modelo', ot.vehiculo_modelo||ot.modelo),
        _otReadonly('Año', ot.vehiculo_anio||ot.anio),
        _otReadonly('Patente', ot.patente),
        _otReadonly('Motor', ot.vehiculo_motor||ot.motor),
        _otReadonly('Chasis', ot.vehiculo_chasis||ot.chasis||ot.vin),
        _otReadonly('Kilometraje', ot.vehiculo_km_entrada||ot.km_entrada?Number(ot.vehiculo_km_entrada||ot.km_entrada).toLocaleString('es-CL')+' km':null),
        _otReadonly('Cliente', ot.cliente_nombre),
      ]))}
      <div class="card">
        <div class="ch"><span class="ct">📝 Síntomas del cliente</span></div>
        <div class="fg">
          <label>¿Qué síntomas tiene el vehículo? <span style="color:#ef4444">*</span></label>
          <textarea id="ot-panel-sintomas" placeholder="Ej: Ruido al frenar, vibración en el volante..." style="min-height:120px">${ot.sintomas||''}</textarea>
        </div>
      </div>
    `)}
    ${_otFooter(`
      <button class="btn" onclick="_otCerrarPanelFase()" style="font-size:12px">Cancelar</button>
      <button class="btn bpa" onclick="otGuardarPanelRecepcion('${ot_id}')" style="font-size:12px"><i class="ti ti-device-floppy"></i> Guardar y avanzar a Diagnóstico</button>
    `)}
  `);
}

function otGuardarPanelRecepcion(ot_id) {
  const sintomas = document.getElementById('ot-panel-sintomas')?.value?.trim();
  if (!sintomas) { APP.toast.show('⚠️ Anotar síntomas es obligatorio', 'warning'); return; }
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  ot.sintomas = sintomas;
  ot.estado = 'diagnostico';
  ot.fecha_modificacion = new Date().toISOString();
  _otAvanzarAFase(ot_id, 'diagnostico', 'Diagnóstico');
}

// ===== PANEL 2: DIAGNÓSTICO =====
function otAbrirPanelDiagnostico(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  const sf = '-overlay';

  _otOverlay(`
    <style>
      .ot-sug-item:hover{background:var(--surface-2)}
      .ot-sug-item{cursor:pointer;padding:8px 12px;font-size:12px;border-bottom:0.5px solid var(--border);transition:background 0.1s}
      .ot-sug-item:last-child{border-bottom:none}
    </style>
    ${_otHeader(ot, '🔍 Diagnóstico — Anotar diagnóstico y asignar servicios')}
    ${_otBody(`
      ${_otCard('📋 Síntomas registrados', `<div style="padding:10px;background:var(--surface-1);border-radius:var(--radius);font-size:12px;line-height:1.6;color:var(--text-secondary)">${ot.sintomas||'Sin síntomas'}</div>`)}
      <div class="card">
        <div class="ch"><span class="ct">🔍 Diagnóstico técnico</span></div>
        <div class="fg">
          <label>¿Cuál es el diagnóstico? <span style="color:#ef4444">*</span></label>
          <textarea id="ot-panel-diagnostico" placeholder="Describe el problema técnico encontrado..." style="min-height:120px">${ot.diagnostico||''}</textarea>
        </div>
      </div>
      <div class="card">
        <div class="ch"><span class="ct">🔧 Buscar servicio</span></div>
        <div class="fg" style="position:relative">
          <label>Escribe el nombre del servicio</label>
          <input id="ot-buscador-servicios${sf}" type="text" placeholder="Ej: Cambio de frenos, Alineación…" autocomplete="off" oninput="otBuscadorServicios(this.value,'${sf}')" onblur="setTimeout(()=>{const d=document.getElementById('ot-sugerencias-servicios${sf}');if(d)d.style.display='none'},200)" style="width:100%;padding:10px 12px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:12px;box-sizing:border-box">
          <div id="ot-sugerencias-servicios${sf}" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--surface-1);border:0.5px solid var(--border);border-radius:0 0 var(--radius) var(--radius);z-index:100;max-height:200px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.15)"></div>
        </div>
      </div>
      <div id="ot-panel-datos-servicio${sf}" style="display:none" class="card">
        <div class="ch"><span class="ct">📋 Datos del servicio</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div class="fg">
            <label>Nombre del servicio</label>
            <input id="ot-servicio-nombre${sf}" type="text" style="width:100%;padding:8px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:12px;box-sizing:border-box">
          </div>
          <div class="fg">
            <label>Horas estimadas</label>
            <input id="ot-servicio-horas${sf}" type="number" step="0.5" min="0" value="0" style="width:100%;padding:8px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:12px;box-sizing:border-box">
          </div>
          <div class="fg">
            <label>Valor CLP</label>
            <input id="ot-servicio-valor${sf}" type="number" min="0" value="0" style="width:100%;padding:8px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:12px;box-sizing:border-box">
          </div>
        </div>
        <input type="hidden" id="ot-servicio-seleccionado-id${sf}">
      </div>
      <div class="card">
        <div class="ch"><span class="ct">📦 Repuestos</span></div>
        <div id="ot-panel-repuestos-container${sf}" style="overflow-x:auto;margin-bottom:10px">
          <table style="width:100%;border-collapse:collapse;font-size:11px;min-width:500px">
            <thead>
              <tr style="background:var(--surface-2);border-bottom:0.5px solid var(--border)">
                <th style="text-align:left;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Repuesto</th>
                <th style="text-align:center;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Cantidad</th>
                <th style="text-align:right;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Precio</th>
                <th style="text-align:left;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Proveedor</th>
                <th style="text-align:center;padding:8px;width:40px"></th>
              </tr>
            </thead>
            <tbody id="ot-panel-repuestos-tbody${sf}">
              <tr id="ot-panel-repuestos-vacio${sf}">
                <td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);font-size:11px">Selecciona un servicio para ver repuestos sugeridos</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button class="btn bpa" onclick="otAgregarRepuestoManual('${sf}')" style="width:100%;justify-content:center;font-size:11px"><i class="ti ti-plus"></i> Agregar repuesto manual</button>
      </div>
    `)}
    ${_otFooter(`
      <button class="btn" onclick="_otCerrarPanelFase()" style="font-size:12px">Cancelar</button>
      <button class="btn bpa" onclick="otGuardarYAvanzarRepuestos('${sf}','${ot_id}')" style="font-size:12px"><i class="ti ti-device-floppy"></i> Guardar y avanzar a Repuestos</button>
    `)}
  `);
}

// ===== PANEL 2b: Guardar diagnóstico (tab) =====
function otGuardarPanelDiagnostico(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  const diagnostico = document.getElementById('ot-diagnostico-input')?.value?.trim();
  if (!diagnostico) { APP.toast.show('⚠️ Anotar diagnóstico es obligatorio', 'warning'); return; }
  ot.diagnostico = diagnostico;
  ot.estado = 'repuestos';
  ot.fecha_modificacion = new Date().toISOString();
  APP.lsSet('ots', ots);
  _otAvanzarAFase(ot_id, 'repuestos', 'Repuestos');
}

// ===== BÚSQUEDA Y SELECCIÓN DE SERVICIOS =====
function otBuscadorServicios(texto, suffix = '') {
  const dropdown = document.getElementById('ot-sugerencias-servicios' + suffix);
  if (!dropdown) return;
  if (!texto || texto.length < 1) { dropdown.style.display = 'none'; return; }
  const t = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const servDefault = [{id:'serv-1',nombre:'Cambio aceite',horas:0.5,precio_venta:25000},{id:'serv-2',nombre:'Cambio filtro',horas:0.25,precio_venta:12000},{id:'serv-3',nombre:'Cambio de frenos',horas:1.5,precio_venta:45000},{id:'serv-4',nombre:'Alineación',horas:1,precio_venta:22000},{id:'serv-5',nombre:'Balanceo de ruedas',horas:0.75,precio_venta:18000}];
  const servicios = APP.lsGet('mp_servicios', servDefault);
  const filtrados = servicios.filter(s => s.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(t));
  if (filtrados.length === 0) { dropdown.style.display = 'none'; return; }
  dropdown.innerHTML = filtrados.map(s => `<div class="ot-sug-item" onclick="otRellenarServicioSeleccionado('${s.id}','${suffix}')">${s.nombre} <span style="color:var(--text-muted);font-size:10px">${s.horas_estimadas||s.horas||0}h · $${(s.precio_venta||0).toLocaleString('es-CL')}</span></div>`).join('');
  dropdown.style.display = 'block';
}

function otRellenarServicioSeleccionado(servicio_id, suffix = '') {
  const servDefault = [{id:'serv-1',nombre:'Cambio aceite',horas:0.5,precio_venta:25000,repuestos:[]},{id:'serv-2',nombre:'Cambio filtro',horas:0.25,precio_venta:12000,repuestos:[]},{id:'serv-3',nombre:'Cambio de frenos',horas:1.5,precio_venta:45000,repuestos:[{nombre:'Pastillas freno',cantidad:1,precio:15000,proveedor:'Bosch'},{nombre:'Discos freno',cantidad:2,precio:25000,proveedor:'Bosch'}]},{id:'serv-4',nombre:'Alineación',horas:1,precio_venta:22000,repuestos:[]},{id:'serv-5',nombre:'Balanceo de ruedas',horas:0.75,precio_venta:18000,repuestos:[]}];
  const servicios = APP.lsGet('mp_servicios', servDefault);
  const servicio = servicios.find(s => s.id === servicio_id);
  if (!servicio) return;
  const sf = suffix;
  document.getElementById('ot-servicio-nombre' + sf).value = servicio.nombre;
  document.getElementById('ot-servicio-horas' + sf).value = servicio.horas_estimadas || servicio.horas || 0;
  document.getElementById('ot-servicio-valor' + sf).value = servicio.precio_venta || 0;
  document.getElementById('ot-servicio-seleccionado-id' + sf).value = servicio_id;
  document.getElementById('ot-panel-datos-servicio' + sf).style.display = 'block';
  const dropdown = document.getElementById('ot-sugerencias-servicios' + sf);
  if (dropdown) dropdown.style.display = 'none';
  const repuestos = servicio.repuestos || [];
  if (repuestos.length > 0) {
    otCargarRepuestosTabla(repuestos, sf);
  } else {
    otCargarRepuestosSugeridos(servicio_id, sf);
  }
  otGuardarServicioAuto(sf);
}

function otGuardarServicioAuto(suffix = '') {
  const sf = suffix;
  const nombre = document.getElementById('ot-servicio-nombre' + sf)?.value?.trim();
  const horas = parseFloat(document.getElementById('ot-servicio-horas' + sf)?.value) || 0;
  const valor = parseInt(document.getElementById('ot-servicio-valor' + sf)?.value) || 0;
  const otId = document.getElementById('ot-diagnostico-ot-id' + sf)?.value || document.getElementById('ot-diagnostico-ot-id-hidden')?.value;
  if (!otId || !nombre) return;
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === otId);
  if (!ot) return;
  ot.servicio_temporal = { nombre, horas, valor };
  APP.lsSet('ots', ots);
  const servicios = APP.lsGet('mp_servicios', []);
  const match = servicios.find(s => s.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  if (match) {
    document.getElementById('ot-servicio-seleccionado-id' + sf).value = match.id;
    otCargarRepuestosTabla([], sf);
    otCargarRepuestosSugeridos(match.id, sf);
  }
}

function otCargarRepuestosSugeridos(servicio_id, suffix = '') {
  const sf = suffix;
  const wiki = APP.lsGet('wiki_tecnica', {});
  const repuestosDB = APP.lsGet('repuestos', []);
  const proveedores = APP.lsGet('proveedores', []);
  const config = APP.lsGet('taller_config', {});
  const defProvId = config.proveedor_predeterminado || '';
  const sugeridos = [];
  (wiki.especificaciones || []).forEach(spec => {
    if (spec.tipo === 'repuestos' && spec.servicio_relacionado === servicio_id) {
      const repDB = repuestosDB.find(r => r.nombre?.toLowerCase() === (spec.nombre || '').toLowerCase());
      const provId = repDB?.proveedor_id || defProvId;
      const prov = proveedores.find(p => p.id === provId);
      sugeridos.push({
        nombre: spec.nombre || '—',
        cantidad: 1,
        precio: repDB?.precio_venta || 0,
        proveedor: prov?.nombre || '—'
      });
    }
  });
  if (sugeridos.length > 0) {
    otCargarRepuestosTabla(sugeridos, sf);
  } else {
    const repuestosBase = APP.lsGet('repuestos', []);
    const servicio = (APP.lsGet('mp_servicios', [])).find(s => s.id === servicio_id);
    const servNombre = servicio?.nombre || '';
    const filtrados = repuestosBase.filter(r => servNombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes((r.categoria || '').toLowerCase()));
    if (filtrados.length > 0) {
      otCargarRepuestosTabla(filtrados.slice(0, 5).map(r => {
        const prov = proveedores.find(p => p.id === (r.proveedor_id || defProvId));
        return { nombre: r.nombre, cantidad: 1, precio: r.precio_venta || 0, proveedor: prov?.nombre || '—' };
      }), sf);
    } else {
      otCargarRepuestosTabla([], sf);
    }
  }
}

function otCargarRepuestosTabla(repuestos, suffix = '') {
  const sf = suffix;
  const tbody = document.getElementById('ot-panel-repuestos-tbody' + sf);
  const vacio = document.getElementById('ot-panel-repuestos-vacio' + sf);
  if (!tbody) return;
  if (!repuestos || repuestos.length === 0) {
    if (vacio) vacio.style.display = '';
    tbody.innerHTML = vacio ? vacio.outerHTML : '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);font-size:11px">Sin repuestos</td></tr>';
    return;
  }
  if (vacio) vacio.style.display = 'none';
  tbody.innerHTML = repuestos.map((r, i) => `
    <tr style="border-bottom:0.5px solid var(--border)">
      <td style="padding:6px"><input type="text" value="${r.nombre||''}" placeholder="Nombre repuesto" id="ot-rep-nombre${sf}-${i}" style="width:100%;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;box-sizing:border-box"></td>
      <td style="padding:6px;text-align:center"><input type="number" min="1" value="${r.cantidad||1}" id="ot-rep-cant${sf}-${i}" style="width:60px;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;text-align:center;box-sizing:border-box"></td>
      <td style="padding:6px;text-align:right"><input type="number" min="0" value="${r.precio||r.precio_unitario||0}" id="ot-rep-precio${sf}-${i}" style="width:100px;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;text-align:right;box-sizing:border-box"></td>
      <td style="padding:6px"><input type="text" value="${r.proveedor||''}" placeholder="Proveedor" id="ot-rep-prov${sf}-${i}" style="width:100%;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;box-sizing:border-box"></td>
      <td style="padding:6px;text-align:center"><button onclick="otEliminarFilaRepuesto(${i},'${sf}')" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:14px;padding:4px"><i class="ti ti-trash"></i></button></td>
    </tr>
  `).join('');
}

function otAgregarRepuestoManual(suffix = '') {
  const sf = suffix;
  const tbody = document.getElementById('ot-panel-repuestos-tbody' + sf);
  if (!tbody) return;
  const vacio = document.getElementById('ot-panel-repuestos-vacio' + sf);
  if (vacio) vacio.style.display = 'none';
  const filas = tbody.querySelectorAll('tr').length;
  const tr = document.createElement('tr');
  tr.style.borderBottom = '0.5px solid var(--border)';
  tr.innerHTML = `
    <td style="padding:6px"><input type="text" placeholder="Nombre repuesto" id="ot-rep-nombre${sf}-${filas}" style="width:100%;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;box-sizing:border-box"></td>
    <td style="padding:6px;text-align:center"><input type="number" min="1" value="1" id="ot-rep-cant${sf}-${filas}" style="width:60px;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;text-align:center;box-sizing:border-box"></td>
    <td style="padding:6px;text-align:right"><input type="number" min="0" value="0" id="ot-rep-precio${sf}-${filas}" style="width:100px;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;text-align:right;box-sizing:border-box"></td>
    <td style="padding:6px"><input type="text" placeholder="Proveedor" id="ot-rep-prov${sf}-${filas}" style="width:100%;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;box-sizing:border-box"></td>
    <td style="padding:6px;text-align:center"><button onclick="otEliminarFilaRepuesto(${filas},'${sf}')" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:14px;padding:4px"><i class="ti ti-trash"></i></button></td>
  `;
  tbody.appendChild(tr);
}

function otEliminarFilaRepuesto(index, suffix = '') {
  const sf = suffix;
  const tbody = document.getElementById('ot-panel-repuestos-tbody' + sf);
  if (!tbody) return;
  const filas = tbody.querySelectorAll('tr');
  if (filas.length <= 1) {
    const vacio = document.getElementById('ot-panel-repuestos-vacio' + sf);
    if (vacio) vacio.style.display = '';
    tbody.innerHTML = vacio ? vacio.outerHTML : '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);font-size:11px">Sin repuestos</td></tr>';
    return;
  }
  const fila = filas[index];
  if (fila) fila.remove();
}

function otGuardarYAvanzarRepuestos(suffix = '', ot_id_param = '') {
  const sf = suffix;
  const diagnosticoEl = document.getElementById('ot-diagnostico-input' + sf) || document.getElementById('ot-panel-diagnostico') || document.getElementById('ot-diagnostico-input');
  const diagnostico = diagnosticoEl ? diagnosticoEl.value?.trim() : '';
  if (!diagnostico) { APP.toast.show('⚠️ Anotar diagnóstico es obligatorio', 'warning'); return; }
  const servicioId = document.getElementById('ot-servicio-seleccionado-id' + sf)?.value;
  if (!servicioId) { APP.toast.show('⚠️ Selecciona un servicio primero', 'warning'); return; }
  const servicioNombre = document.getElementById('ot-servicio-nombre' + sf)?.value?.trim();
  if (!servicioNombre) { APP.toast.show('⚠️ El nombre del servicio es obligatorio', 'warning'); return; }
  const horas = parseFloat(document.getElementById('ot-servicio-horas' + sf)?.value) || 0;
  const valor = parseInt(document.getElementById('ot-servicio-valor' + sf)?.value) || 0;
  const tbody = document.getElementById('ot-panel-repuestos-tbody' + sf);
  const repuestosGuardar = [];
  if (tbody) {
    const filas = tbody.querySelectorAll('tr');
    filas.forEach((tr, i) => {
      const nombre = document.getElementById('ot-rep-nombre' + sf + '-' + i)?.value?.trim();
      if (!nombre) return;
      const cantidad = parseInt(document.getElementById('ot-rep-cant' + sf + '-' + i)?.value) || 1;
      const precio = parseInt(document.getElementById('ot-rep-precio' + sf + '-' + i)?.value) || 0;
      const proveedor = document.getElementById('ot-rep-prov' + sf + '-' + i)?.value?.trim() || '';
      repuestosGuardar.push({ nombre, cantidad, precio_unitario: precio, proveedor });
    });
  }
  const ots = APP.lsGet('ots', []);
  const id = ot_id_param || document.getElementById('ot-diagnostico-ot-id' + sf)?.value;
  const ot = ots.find(o => o.id === id);
  if (!ot) { APP.toast.show('⚠️ OT no encontrada', 'error'); return; }
  ot.diagnostico = diagnostico;
  ot.servicio_seleccionado = { id: servicioId, nombre: servicioNombre, horas, valor };
  ot.servicios_diagnostico = [servicioId];
  ot.servicios_seleccionados = [servicioId];
  if (!ot.cotizacion) ot.cotizacion = { repuestos: [], mano_obra: 0 };
  ot.cotizacion.repuestos = repuestosGuardar;
  ot.cotizacion.mano_obra = valor;
  ot.cotizacion.mano_obra_horas = horas;
  ot.estado = 'repuestos';
  ot.fecha_modificacion = new Date().toISOString();
  APP.lsSet('ots', ots);
  if (typeof _otAvanzarAFase === 'function') {
    _otAvanzarAFase(ot.id, 'repuestos', 'Repuestos');
  }
}

// ===== PANEL 3: REPUESTOS =====
function otAbrirPanelRepuestos(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  if (!ot.cotizacion) ot.cotizacion = { repuestos: [], mano_obra: 0, mano_obra_horas: 0 };

  const config = APP.lsGet('taller_config', {});
  const tarifa = config.tarifa_hora || 0;
  const repuestos = ot.cotizacion.repuestos || [];

  const repHtml = repuestos.length > 0
    ? `<table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:var(--surface-2);border-bottom:0.5px solid var(--border)">
          <th style="text-align:left;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Repuesto</th>
          <th style="text-align:center;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Cant.</th>
          <th style="text-align:right;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Precio</th>
          <th style="text-align:right;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Subtotal</th>
          <th style="text-align:center;padding:8px;width:40px"></th>
        </tr></thead>
        <tbody>
          ${repuestos.map((r,i) => `
            <tr style="border-bottom:0.5px solid var(--border)">
              <td style="padding:6px"><input class="ot-rep-nombre" value="${r.nombre||''}" style="width:100%;padding:4px 6px;border:0.5px solid var(--border);border-radius:4px;background:var(--surface-1);color:var(--text-primary)"></td>
              <td style="padding:6px;text-align:center"><input class="ot-rep-cant" type="number" min="1" value="${r.cantidad||1}" style="width:50px;text-align:center;padding:4px;border:0.5px solid var(--border);border-radius:4px;background:var(--surface-1);color:var(--text-primary)"></td>
              <td style="padding:6px;text-align:right"><input class="ot-rep-precio" type="number" min="0" value="${r.precio_unitario||0}" style="width:90px;text-align:right;padding:4px;border:0.5px solid var(--border);border-radius:4px;background:var(--surface-1);color:var(--text-primary)"></td>
              <td style="padding:6px;text-align:right;font-weight:500" class="ot-rep-subtotal">$${((r.cantidad||0)*(r.precio_unitario||0)).toLocaleString('es-CL')}</td>
              <td style="padding:6px;text-align:center"><button class="btn" style="font-size:10px;padding:2px 6px;color:var(--text-danger)" onclick="this.closest('tr').remove();otRecalcularPanelRepuestos()"><i class="ti ti-trash"></i></button></td>
            </tr>`).join('')}
        </tbody>
      </table>`
    : '<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:12px">Sin repuestos agregados. Usa el botón "+ Agregar repuesto"</div>';

  const pdfGen = ot.cotizacion_pdf_generado;
  const previewDisplay = pdfGen ? 'block' : 'none';
  const genBtnDisplay = pdfGen ? 'none' : '';

  _otOverlay(`
    ${_otHeader(ot, '🔧 Repuestos — Editar repuestos, mano de obra y generar cotización')}
    ${_otBody(`
      ${_otCard('🔍 Diagnóstico', `<div style="padding:10px;background:var(--surface-1);border-radius:var(--radius);font-size:12px;line-height:1.6;color:var(--text-secondary)">${ot.diagnostico||'Sin diagnóstico'}</div>`)}
      <div class="card">
        <div class="ch"><span class="ct">📦 Repuestos <span style="font-weight:400;font-size:10px;color:var(--text-muted)">— Edita los valores directamente</span></span></div>
        <div id="ot-panel-repuestos-tabla" style="overflow-x:auto;margin-bottom:10px">${repHtml}</div>
        <button class="btn bpa" style="width:100%;justify-content:center;font-size:11px" onclick="otPanelAgregarFilaRepuesto()"><i class="ti ti-plus"></i> Agregar repuesto manual</button>
      </div>
      <div class="card">
        <div class="ch"><span class="ct">💼 Mano de obra</span></div>
        <div class="fgrid2">
          <div class="fg"><label>Horas</label><input id="ot-panel-horas" type="number" min="0" step="0.5" value="${ot.cotizacion.mano_obra_horas||0}" oninput="otRecalcularPanelRepuestos()" style="padding:8px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-1);color:var(--text-primary)"></div>
          <div class="fg"><label>Tarifa/hora</label><input type="text" readonly value="$${tarifa.toLocaleString('es-CL')}" style="padding:8px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-muted)"></div>
        </div>
      </div>
      <div id="ot-panel-totales" style="background:var(--surface-1);padding:16px;border-radius:var(--radius);border:0.5px solid var(--border)">
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span>Subtotal repuestos</span><span id="ot-panel-subtotal-rep">$0</span></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span>Mano de obra</span><span id="ot-panel-mano-obra">$0</span></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span>Subtotal</span><span id="ot-panel-subtotal" style="font-weight:500">$0</span></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:var(--text-muted)"><span>IVA 19%</span><span id="ot-panel-iva">$0</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-size:14px;font-weight:700;border-top:0.5px solid var(--border);margin-top:4px;color:var(--text-accent)"><span>TOTAL</span><span id="ot-panel-total">$0</span></div>
      </div>
      <button id="ot-btn-generar-pdf-overlay" onclick="otGenerarCotizacionPDF('${ot_id}')" style="display:${genBtnDisplay};width:100%;padding:12px;background:var(--bg-primary);color:white;border:none;border-radius:var(--radius);cursor:pointer;font-size:12px;font-weight:600;margin-bottom:16px;box-shadow:0 2px 4px rgba(0,0,0,0.1)"><i class="ti ti-file-pdf"></i> Generar cotización PDF</button>
      <div id="ot-panel-preview-pdf" style="display:${previewDisplay};background:var(--surface-1);padding:14px;border-radius:var(--radius);margin-bottom:16px;border:0.5px solid var(--border)">
        <label style="font-weight:500;font-size:11px;color:var(--text-muted);display:block;margin-bottom:10px">Vista previa de cotización</label>
        <div style="margin-bottom:12px;border:0.5px solid var(--border);border-radius:var(--radius);overflow:hidden">
          <iframe id="ot-panel-pdf-iframe" style="width:100%;height:360px;border:none;background:white"></iframe>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button onclick="otDescargarPDFCotizacion('${ot_id}')" style="flex:1;padding:10px;background:#059669;color:white;border:none;border-radius:var(--radius);cursor:pointer;font-size:11px;font-weight:500;min-width:120px"><i class="ti ti-download"></i> Guardar PDF</button>
          <button onclick="otImprimirCotizacion('${ot_id}')" style="flex:1;padding:10px;background:#2563eb;color:white;border:none;border-radius:var(--radius);cursor:pointer;font-size:11px;font-weight:500;min-width:120px"><i class="ti ti-printer"></i> Imprimir</button>
          <button onclick="otEnviarCotizacionWhatsApp('${ot_id}')" style="flex:1;padding:10px;background:#25D366;color:white;border:none;border-radius:var(--radius);cursor:pointer;font-size:11px;font-weight:500;min-width:120px"><i class="ti ti-brand-whatsapp"></i> Enviar por WhatsApp</button>
        </div>
      </div>
    `)}
    ${_otFooter(`
      <button class="btn" onclick="_otCerrarPanelFase()" style="font-size:12px">Cancelar</button>
      <button class="btn bpa" onclick="otGuardarPanelRepuestos('${ot_id}')" style="font-size:12px"><i class="ti ti-check"></i> Guardar y avanzar a Aprobación</button>
    `)}
  `);
  otRecalcularPanelRepuestos();
  if (pdfGen) {
    setTimeout(() => otMostrarPreviewPDF(ot_id, 'ot-panel-pdf-iframe'), 300);
  }
}

function otMostrarPreviewPDF(ot_id, iframeId) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot || !ot.cotizacion_pdf_datauri) return;
  const iframe = document.getElementById(iframeId);
  if (iframe) iframe.src = ot.cotizacion_pdf_datauri;
}

function otGuardarRepuestosData(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  if (!ot.cotizacion) ot.cotizacion = { repuestos: [] };
  const filas = document.querySelectorAll('#ot-panel-repuestos-tabla table tbody tr') || [];
  const repuestos = [];
  filas.forEach(tr => {
    const nombre = tr.querySelector('.ot-rep-nombre')?.value?.trim();
    if (!nombre) return;
    const cantidad = parseInt(tr.querySelector('.ot-rep-cant')?.value) || 1;
    const precio_unitario = parseFloat(tr.querySelector('.ot-rep-precio')?.value) || 0;
    repuestos.push({ nombre, cantidad, precio_unitario });
  });
  const horas = parseFloat(document.getElementById('ot-panel-horas')?.value) || 0;
  const config = APP.lsGet('taller_config', {});
  const tarifa = config.tarifa_hora || 0;
  ot.cotizacion.repuestos = repuestos;
  ot.cotizacion.mano_obra_horas = horas;
  ot.cotizacion.mano_obra = horas * tarifa;
  ot.fecha_modificacion = new Date().toISOString();
  APP.lsSet('ots', ots);
  return ot;
}

function otGuardarPanelRepuestos(ot_id) {
  otGuardarRepuestosData(ot_id);
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  ot.fase = 'aprobacion';
  ot.estado = 'aprobacion';
  ot.historial_eventos = ot.historial_eventos || [];
  ot.historial_eventos.push({ fecha: Date.now(), fase: 'aprobacion', accion: 'Avanzó a Aprobación', usuario: 'Sistema', descripcion: '' });
  ot.fecha_modificacion = new Date().toISOString();
  APP.lsSet('ots', ots);
  _otCerrarPanelFase();
  if (typeof renderKanban === 'function') renderKanban();
  APP.toast.show('✅ OT avanzó a Aprobación', 'success');
  otAbrirPanelAprobacion(ot_id);
}

function otGenerarCotizacionPDF(ot_id) {
  otGuardarRepuestosData(ot_id);
  if (typeof tallerGenerarPDFCotizacion !== 'function') {
    APP.toast.show('⚠️ Generador PDF no disponible', 'error');
    return;
  }
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  const doc = tallerGenerarPDFCotizacion(ot_id);
  if (!doc) return;
  const datauri = doc.output('datauristring');
  ot.cotizacion_pdf_datauri = datauri;
  ot.cotizacion_pdf_generado = true;
  ot.fecha_cotizacion = new Date().toISOString();
  APP.lsSet('ots', ots);
  const btnGen = document.getElementById('ot-btn-generar-pdf-overlay');
  if (btnGen) btnGen.style.display = 'none';
  const preview = document.getElementById('ot-panel-preview-pdf');
  if (preview) {
    preview.style.display = 'block';
    const iframe = document.getElementById('ot-panel-pdf-iframe');
    if (iframe) iframe.src = datauri;
  }
  const preview2 = document.getElementById('ot-cotizacion-preview');
  if (preview2) {
    preview2.style.display = 'block';
    const iframe2 = document.getElementById('ot-cotizacion-pdf-iframe');
    if (iframe2) iframe2.src = datauri;
  }
  const preview3 = document.getElementById('ot-cotizacion-preview-panel');
  if (preview3) {
    preview3.style.display = 'block';
    const iframe3 = document.getElementById('ot-cotizacion-pdf-iframe-panel');
    if (iframe3) iframe3.src = datauri;
  }
  const btnGenTab = document.getElementById('ot-btn-generar-pdf-tab');
  if (btnGenTab) btnGenTab.style.display = 'none';
  const btnGenCot = document.getElementById('ot-btn-generar-pdf-cot');
  if (btnGenCot) btnGenCot.style.display = 'none';
  APP.toast.show('✅ Cotización PDF generada correctamente', 'success');
}

function otDescargarPDFCotizacion(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  if (typeof tallerGenerarPDFCotizacion !== 'function') {
    APP.toast.show('⚠️ Generador PDF no disponible', 'error');
    return;
  }
  const doc = tallerGenerarPDFCotizacion(ot_id);
  if (!doc) return;
  const marca = (ot.vehiculo_marca || ot.marca || '').replace(/\s+/g, '');
  const modelo = (ot.vehiculo_modelo || ot.modelo || '').replace(/\s+/g, '');
  const filename = `COT-${ot.id}-2026_${marca}${modelo}.pdf`;
  doc.save(filename);
  ot.cotizacion_descargada = true;
  APP.lsSet('ots', ots);
  APP.toast.show('✅ PDF descargado', 'success');
}

function otImprimirCotizacion(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  if (typeof tallerGenerarPDFCotizacion !== 'function') {
    APP.toast.show('⚠️ Generador PDF no disponible', 'error');
    return;
  }
  const doc = tallerGenerarPDFCotizacion(ot_id);
  if (!doc) return;
  const datauri = doc.output('datauristring');
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(`<html><head><title>Cotización #${ot.id}</title><style>body{margin:0;height:100vh}</style></head><body><iframe src="${datauri}" style="width:100%;height:100%;border:none"></iframe><script>setTimeout(()=>{window.print()},800)</script></body></html>`);
    win.document.close();
  }
  ot.cotizacion_impresa = true;
  APP.lsSet('ots', ots);
}

function otEnviarCotizacionWhatsApp(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  const config = APP.lsGet('taller_config', {});
  const datosLegales = config.datos_legales || {};
  const nombreEmpresa = datosLegales.nombre_legal || 'Nuestro taller';
  const repuestos = ot.cotizacion?.repuestos || [];
  const subRep = repuestos.reduce((s, r) => s + ((r.cantidad||0)*(r.precio_unitario||0)), 0);
  const manoObra = ot.cotizacion?.mano_obra || 0;
  const subtotal = subRep + manoObra;
  const iva = subtotal * 0.19;
  const total = subtotal + iva;
  const marca = ot.vehiculo_marca || ot.marca || '';
  const modelo = ot.vehiculo_modelo || ot.modelo || '';
  const mensaje = `Hola ${ot.cliente_nombre || 'cliente'},\n\nTe adjunto cotización de reparación de tu ${marca} ${modelo}:\n\n*RESUMEN:*\n- Repuestos: $${subRep.toLocaleString('es-CL')}\n- Mano de obra: $${manoObra.toLocaleString('es-CL')}\n- *TOTAL: $${total.toLocaleString('es-CL')} (IVA incluido)*\n\nVálida por 7 días.\n\n${nombreEmpresa}`;
  const telefono = ot.cliente_whatsapp || ot.telefono || '';
  if (telefono) {
    const url = `https://wa.me/${telefono.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
    ot.cotizacion_enviada_whatsapp = true;
    ot.fecha_envio_cotizacion = new Date().toISOString();
    APP.lsSet('ots', ots);
    APP.toast.show('✅ Cotización enviada por WhatsApp', 'success');
  } else {
    APP.toast.show('⚠️ Cliente sin teléfono registrado', 'warning');
  }
}

function otAvanzarAAprobacion(ot_id) {
  otGuardarRepuestosData(ot_id);
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  if (!ot.cotizacion_pdf_generado) {
    APP.toast.show('⚠️ Genera la cotización PDF antes de avanzar', 'warning');
    return;
  }
  ot.estado = 'aprobacion';
  ot.fecha_modificacion = new Date().toISOString();
  APP.lsSet('ots', ots);
  _otAvanzarAFase(ot_id, 'aprobacion', 'Aprobación');
}

function otAgregarFilaRepuestoTab() {
  const tbody = document.getElementById('ot-repuestos-tbody');
  if (!tbody) return;
  const i = tbody.querySelectorAll('tr').length;
  const tr = document.createElement('tr');
  tr.innerHTML = `<td style="padding:6px"><input type="text" placeholder="Nombre repuesto" id="ot-tab-rep-nombre-${i}" style="width:100%;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;box-sizing:border-box"></td><td style="padding:6px;text-align:center"><input type="number" min="1" value="1" id="ot-tab-rep-cant-${i}" style="width:60px;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;text-align:center;box-sizing:border-box" oninput="otRecalcularRepuestoTab()"></td><td style="padding:6px;text-align:right"><input type="number" min="0" value="0" id="ot-tab-rep-precio-${i}" style="width:100px;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;text-align:right;box-sizing:border-box" oninput="otRecalcularRepuestoTab()"></td><td style="padding:6px;text-align:right;font-weight:500" id="ot-tab-rep-sub-${i}">$0</td><td style="padding:6px;text-align:center"><button onclick="this.closest('tr').remove();otRecalcularRepuestoTab()" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:14px;padding:4px"><i class="ti ti-trash"></i></button></td>`;
  tbody.appendChild(tr);
}
function otRecalcularRepuestoTab() {
  const tbody = document.getElementById('ot-repuestos-tbody');
  if (!tbody) return;
  let subRep = 0;
  tbody.querySelectorAll('tr').forEach((tr, i) => {
    const cant = parseFloat(document.getElementById(`ot-tab-rep-cant-${i}`)?.value) || 0;
    const precio = parseFloat(document.getElementById(`ot-tab-rep-precio-${i}`)?.value) || 0;
    const sub = cant * precio;
    subRep += sub;
    const el = document.getElementById(`ot-tab-rep-sub-${i}`);
    if (el) el.textContent = '$' + sub.toLocaleString('es-CL');
  });
  const horas = parseFloat(document.getElementById('ot-repuestos-horas')?.value) || 0;
  const config = APP.lsGet('taller_config', {});
  const tarifa = config.tarifa_hora || 0;
  const manoObra = horas * tarifa;
  const subtotal = subRep + manoObra;
  const iva = subtotal * 0.19;
  const total = subtotal + iva;
  const g = id => document.getElementById(id);
  if (g('ot-rep-subtotal-rep')) g('ot-rep-subtotal-rep').textContent = '$' + subRep.toLocaleString('es-CL');
  if (g('ot-rep-mano-obra')) g('ot-rep-mano-obra').textContent = '$' + manoObra.toLocaleString('es-CL');
  if (g('ot-rep-subtotal')) g('ot-rep-subtotal').textContent = '$' + subtotal.toLocaleString('es-CL');
  if (g('ot-rep-iva')) g('ot-rep-iva').textContent = '$' + iva.toLocaleString('es-CL');
  if (g('ot-rep-total')) g('ot-rep-total').textContent = '$' + total.toLocaleString('es-CL');
}
function otAgregarFilaRepuestoTabCot(suffix) {
  const tbody = document.getElementById('ot-cotizacion-tbody' + (suffix||''));
  if (!tbody) return;
  const i = tbody.querySelectorAll('tr').length;
  const tr = document.createElement('tr');
  tr.innerHTML = `<td style="padding:6px"><input type="text" placeholder="Nombre" class="ot-cot-rep-nombre" style="width:100%;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;box-sizing:border-box"></td><td style="padding:6px;text-align:center"><input type="number" min="1" value="1" class="ot-cot-rep-cant" style="width:50px;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;text-align:center;box-sizing:border-box" oninput="otRecalcularCotizacionTab${suffix ? 'Panel' : ''}()"></td><td style="padding:6px;text-align:right"><input type="number" min="0" value="0" class="ot-cot-rep-precio" style="width:90px;padding:6px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-2);color:var(--text-primary);font-size:11px;text-align:right;box-sizing:border-box" oninput="otRecalcularCotizacionTab${suffix ? 'Panel' : ''}()"></td><td style="padding:6px;text-align:right;font-weight:500" class="ot-cot-rep-sub">$0</td><td style="padding:6px;text-align:center"><button onclick="this.closest('tr').remove();otRecalcularCotizacionTab${suffix ? 'Panel' : ''}()" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:14px;padding:4px"><i class="ti ti-trash"></i></button></td>`;
  tbody.appendChild(tr);
}
function otRecalcularCotizacionTab() {
  const tbody = document.getElementById('ot-cotizacion-tbody');
  if (!tbody) return;
  let subRep = 0;
  tbody.querySelectorAll('tr').forEach(tr => {
    const cant = parseFloat(tr.querySelector('.ot-cot-rep-cant')?.value) || 0;
    const precio = parseFloat(tr.querySelector('.ot-cot-rep-precio')?.value) || 0;
    const sub = cant * precio;
    subRep += sub;
    const el = tr.querySelector('.ot-cot-rep-sub');
    if (el) el.textContent = '$' + sub.toLocaleString('es-CL');
  });
  const horas = parseFloat(document.getElementById('ot-cotizacion-horas')?.value) || 0;
  const config = APP.lsGet('taller_config', {});
  const tarifa = config.tarifa_hora || 0;
  document.getElementById('ot-cotizacion-tarifa').value = '$' + tarifa.toLocaleString('es-CL');
  const manoObra = horas * tarifa;
  const subtotal = subRep + manoObra;
  const iva = subtotal * 0.19;
  const total = subtotal + iva;
  const g = id => document.getElementById(id);
  if (g('ot-cot-subtotal-rep')) g('ot-cot-subtotal-rep').textContent = '$' + subRep.toLocaleString('es-CL');
  if (g('ot-cot-mano-obra')) g('ot-cot-mano-obra').textContent = '$' + manoObra.toLocaleString('es-CL');
  if (g('ot-cot-subtotal')) g('ot-cot-subtotal').textContent = '$' + subtotal.toLocaleString('es-CL');
  if (g('ot-cot-iva')) g('ot-cot-iva').textContent = '$' + iva.toLocaleString('es-CL');
  if (g('ot-cot-total')) g('ot-cot-total').textContent = '$' + total.toLocaleString('es-CL');
}
function otRecalcularCotizacionPanel() {
  const tbody = document.getElementById('ot-cotizacion-tbody-panel');
  if (!tbody) return;
  let subRep = 0;
  tbody.querySelectorAll('tr').forEach(tr => {
    const cant = parseFloat(tr.querySelector('.ot-cot-rep-cant')?.value) || 0;
    const precio = parseFloat(tr.querySelector('.ot-cot-rep-precio')?.value) || 0;
    subRep += cant * precio;
  });
  const horas = parseFloat(document.getElementById('ot-cotizacion-horas-panel')?.value) || 0;
  const config = APP.lsGet('taller_config', {});
  const tarifa = config.tarifa_hora || 0;
  const manoObra = horas * tarifa;
  const subtotal = subRep + manoObra;
  const iva = subtotal * 0.19;
  const total = subtotal + iva;
  const g = id => document.getElementById(id);
  if (g('ot-cot-p-subtotal-rep')) g('ot-cot-p-subtotal-rep').textContent = '$' + subRep.toLocaleString('es-CL');
  if (g('ot-cot-p-mano-obra')) g('ot-cot-p-mano-obra').textContent = '$' + manoObra.toLocaleString('es-CL');
  if (g('ot-cot-p-subtotal')) g('ot-cot-p-subtotal').textContent = '$' + subtotal.toLocaleString('es-CL');
  if (g('ot-cot-p-iva')) g('ot-cot-p-iva').textContent = '$' + iva.toLocaleString('es-CL');
  if (g('ot-cot-p-total')) g('ot-cot-p-total').textContent = '$' + total.toLocaleString('es-CL');
}

// ===== PANEL 4: APROBACIÓN =====
function otAbrirPanelAprobacion(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  if (!ot.cotizacion) ot.cotizacion = { repuestos: [], mano_obra: 0 };

  const repuestos = ot.cotizacion.repuestos || [];
  const subRep = repuestos.reduce((s, r) => s + ((r.cantidad||0)*(r.precio_unitario||0)), 0);
  const manoObra = ot.cotizacion.mano_obra || 0;
  const subtotal = subRep + manoObra;
  const iva = subtotal * 0.19;
  const total = subtotal + iva;

  const repHtml = repuestos.length > 0
    ? `<table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:var(--surface-2);border-bottom:0.5px solid var(--border)">
          <th style="text-align:left;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Repuesto</th>
          <th style="text-align:center;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Cant.</th>
          <th style="text-align:right;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Precio</th>
          <th style="text-align:right;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Subtotal</th>
        </tr></thead>
        <tbody>${repuestos.map(r => `<tr style="border-bottom:0.5px solid var(--border)"><td style="padding:8px">${r.nombre||'—'}</td><td style="padding:8px;text-align:center">${r.cantidad||0}</td><td style="padding:8px;text-align:right">$${(r.precio_unitario||0).toLocaleString('es-CL')}</td><td style="padding:8px;text-align:right;font-weight:500">$${((r.cantidad||0)*(r.precio_unitario||0)).toLocaleString('es-CL')}</td></tr>`).join('')}</tbody>
      </table>`
    : '<div style="text-align:center;color:var(--text-muted);padding:10px">Sin repuestos</div>';

  _otOverlay(`
    ${_otHeader(ot, '✓ Aprobación — Esperando respuesta del cliente')}
    ${_otBody(`
      ${_otCard('🔍 Diagnóstico', `<div style="padding:10px;background:var(--surface-1);border-radius:var(--radius);font-size:12px;line-height:1.6;color:var(--text-secondary)">${ot.diagnostico||'Sin diagnóstico'}</div>`)}
      ${_otCard('📦 Repuestos', `<div style="overflow-x:auto">${repHtml}</div>`)}
      ${manoObra > 0 ? _otCard('💼 Mano de obra', `<div style="padding:8px;font-size:13px;font-weight:500">${ot.cotizacion.mano_obra_horas||0}h — $${manoObra.toLocaleString('es-CL')}</div>`) : ''}
      <div style="background:var(--surface-1);padding:16px;border-radius:var(--radius);border:0.5px solid var(--border)">
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span>Subtotal</span><span style="font-weight:500">$${subtotal.toLocaleString('es-CL')}</span></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:var(--text-muted)"><span>IVA 19%</span><span>$${iva.toLocaleString('es-CL')}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-size:14px;font-weight:700;border-top:0.5px solid var(--border);margin-top:4px;color:var(--text-accent)"><span>TOTAL</span><span>$${total.toLocaleString('es-CL')}</span></div>
      </div>
      <div style="background:#fef9c3;border:0.5px solid #d97706;border-radius:var(--radius);padding:14px;text-align:center;font-size:12px;color:#92400e">
        <i class="ti ti-clock"></i> Esperando aprobación del cliente<br>
        <span style="font-size:11px;opacity:.8">Cotización enviada — pendiente de respuesta</span>
      </div>
    `)}
    ${_otFooter(`
      <button class="btn" style="color:#dc2626;border-color:#fca5a5" onclick="otRechazarAprobacion('${ot_id}')" style="font-size:12px"><i class="ti ti-x"></i> Rechazado</button>
      <button class="btn bpa" onclick="otAprobarCotizacion('${ot_id}')" style="font-size:12px"><i class="ti ti-check"></i> ✓ Aprobado por cliente</button>
    `)}
  `);
}

function otAprobarCotizacion(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  ot.aprobacion_cliente = true;
  ot.fecha_aprobacion = new Date().toISOString();
  ot.estado = 'reparacion';
  _otAvanzarAFase(ot_id, 'reparacion', 'Reparación');
}

function otRechazarAprobacion(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  ot.aprobacion_cliente = false;
  ot.estado = 'repuestos';
  APP.lsSet('ots', ots);
  _otCerrarPanelFase();
  if (typeof renderKanban === 'function') renderKanban();
  APP.toast.show('⏪ Cotización rechazada — vuelve a Repuestos para re-editar', 'warning');
  setTimeout(() => otAbrirPanelRepuestos(ot_id), 300);
}

// ===== PANEL 5: REPARACIÓN =====
function otAbrirPanelReparacion(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  const servDefault = [
    {id:'serv-1',nombre:'Cambio aceite',horas:0.5},{id:'serv-2',nombre:'Cambio filtro',horas:0.25},
    {id:'serv-3',nombre:'Cambio de frenos',horas:1.5},{id:'serv-4',nombre:'Alineación',horas:1},
    {id:'serv-5',nombre:'Balanceo de ruedas',horas:0.75}
  ];
  const servicios = APP.lsGet('mp_servicios', servDefault);
  const servIds = ot.servicios_diagnostico || ot.servicios_seleccionados || [];
  const servNombres = servIds.map(id => { const s = servicios.find(sv => sv.id === id); return s ? s.nombre : id; });

  _otOverlay(`
    ${_otHeader(ot, '🔨 Reparación — Seguimiento de trabajo')}
    ${_otBody(`
      ${_otCard('🔍 Diagnóstico', `<div style="padding:10px;background:var(--surface-1);border-radius:var(--radius);font-size:12px;line-height:1.6;color:var(--text-secondary)">${ot.diagnostico||'Sin diagnóstico'}</div>`)}
      ${servNombres.length > 0 ? _otCard('🔧 Servicios', `<div style="display:flex;flex-wrap:wrap;gap:6px">${servNombres.map(n => `<span style="padding:4px 10px;background:var(--surface-1);border:0.5px solid var(--border);border-radius:var(--radius);font-size:12px">${n}</span>`).join('')}</div>`) : ''}
      <div class="card">
        <div class="ch"><span class="ct">📝 Anotaciones durante reparación</span></div>
        <div class="fg">
          <label>Notas del mecánico</label>
          <textarea id="ot-panel-notas-reparacion" placeholder="Registra observaciones, dificultades, hallazgos..." style="min-height:120px">${ot.notas_reparacion||''}</textarea>
        </div>
      </div>
      <div style="background:var(--surface-1);padding:16px;border-radius:var(--radius);border:0.5px solid var(--border)">
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
          <button class="btn" onclick="otPanelIniciarReparacion('${ot_id}')" style="font-size:12px;padding:10px 24px;background:#065f46;color:white;border:none;border-radius:var(--radius)"><i class="ti ti-player-play"></i> Iniciar reparación</button>
          <button class="btn" onclick="otPanelPausarReparacion('${ot_id}')" style="font-size:12px;padding:10px 24px;border-color:#d97706;color:#92400e"><i class="ti ti-player-pause"></i> Pausar reparación</button>
          <button class="btn bpa" onclick="otFinalizarReparacion('${ot_id}')" style="font-size:12px;padding:10px 24px"><i class="ti ti-player-stop"></i> Finalizar y pasar a Control</button>
        </div>
      </div>
    `)}
    ${_otFooter(`<button class="btn" onclick="_otCerrarPanelFase()" style="font-size:12px">Cerrar</button>`)}
  `);
}

function otPanelIniciarReparacion(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  ot.inicio_reparacion = new Date().toISOString();
  ot.estado_reparacion = 'en_curso';
  APP.lsSet('ots', ots);
  APP.toast.show('🔨 Reparación iniciada', 'success');
}

function otPanelPausarReparacion(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  ot.estado_reparacion = 'pausada';
  APP.lsSet('ots', ots);
  APP.toast.show('⏸️ Reparación pausada', 'info');
}

function otFinalizarReparacion(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  const notas = document.getElementById('ot-panel-notas-reparacion')?.value?.trim();
  ot.notas_reparacion = notas || '';
  ot.fin_reparacion = new Date().toISOString();
  ot.estado_reparacion = 'finalizada';
  ot.estado = 'control';
  _otAvanzarAFase(ot_id, 'control', 'Control');
}

// ===== PANEL 6: CONTROL =====
function otAbrirPanelControl(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  _otOverlay(`
    ${_otHeader(ot, '🛡️ Control de calidad — Revisión final')}
    ${_otBody(`
      ${_otCard('🔍 Diagnóstico', `<div style="padding:10px;background:var(--surface-1);border-radius:var(--radius);font-size:12px;line-height:1.6;color:var(--text-secondary)">${ot.diagnostico||'Sin diagnóstico'}</div>`)}
      ${ot.notas_reparacion ? _otCard('📝 Notas de reparación', `<div style="padding:10px;background:var(--surface-1);border-radius:var(--radius);font-size:12px;line-height:1.6;color:var(--text-secondary)">${ot.notas_reparacion}</div>`) : ''}
      <div class="card">
        <div class="ch"><span class="ct">✅ Control de calidad</span></div>
        <div class="fg">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
            <input type="checkbox" id="ot-panel-control-aprobado" ${ot.control_aprobado ? 'checked' : ''}>
            ✓ Trabajo revisado y aprobado
          </label>
        </div>
        <div class="fg">
          <label>Notas de control</label>
          <textarea id="ot-panel-notas-control" placeholder="Observaciones del control de calidad..." style="min-height:100px">${ot.notas_control||''}</textarea>
        </div>
      </div>
    `)}
    ${_otFooter(`
      <button class="btn" onclick="_otCerrarPanelFase()" style="font-size:12px">Cancelar</button>
      <button class="btn bpa" onclick="otGuardarPanelControl('${ot_id}')" style="font-size:12px"><i class="ti ti-device-floppy"></i> Guardar y avanzar a Entrega</button>
    `)}
  `);
}

function otGuardarPanelControl(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  ot.control_aprobado = document.getElementById('ot-panel-control-aprobado')?.checked || false;
  ot.notas_control = document.getElementById('ot-panel-notas-control')?.value?.trim() || '';
  ot.estado = 'entrega';
  _otAvanzarAFase(ot_id, 'entrega', 'Entrega');
}

// ===== PANEL 7: ENTREGA =====
function otAbrirPanelEntrega(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  const repuestos = ot.cotizacion?.repuestos || [];
  const subRep = repuestos.reduce((s, r) => s + ((r.cantidad||0)*(r.precio_unitario||0)), 0);
  const manoObra = ot.cotizacion?.mano_obra || 0;
  const subtotal = subRep + manoObra;
  const iva = subtotal * 0.19;
  const total = subtotal + iva;

  _otOverlay(`
    ${_otHeader(ot, '📦 Entrega — Generar boleta y confirmar entrega')}
    ${_otBody(`
      ${_otCard('📋 Resumen del trabajo', _otGrid2([
        _otReadonly('Cliente', ot.cliente_nombre),
        _otReadonly('Vehículo', `${ot.vehiculo_marca||''} ${ot.vehiculo_modelo||''} ${ot.vehiculo_anio||''}`),
        _otReadonly('Patente', ot.patente),
        _otReadonly('Diagnóstico', ot.diagnostico),
        _otReadonly('Total cotizado', '$'+total.toLocaleString('es-CL')),
      ]))}
      <div class="card">
        <div class="ch"><span class="ct">💰 Totales</span></div>
        <div style="padding:12px 0">
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span>Subtotal repuestos</span><span>$${subRep.toLocaleString('es-CL')}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span>Mano de obra</span><span>$${manoObra.toLocaleString('es-CL')}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span>Subtotal</span><span style="font-weight:500">$${subtotal.toLocaleString('es-CL')}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:var(--text-muted)"><span>IVA 19%</span><span>$${iva.toLocaleString('es-CL')}</span></div>
          <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-size:14px;font-weight:700;border-top:0.5px solid var(--border);margin-top:4px;color:var(--text-accent)"><span>TOTAL</span><span>$${total.toLocaleString('es-CL')}</span></div>
        </div>
      </div>
      <div class="card">
        <div class="ch"><span class="ct">📄 Documentos</span></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn" onclick="otImprimirCotizacion('${ot_id}')" style="font-size:12px"><i class="ti ti-printer"></i> Imprimir boleta</button>
          <button class="btn" onclick="otDescargarPDF('${ot_id}')" style="font-size:12px"><i class="ti ti-file-pdf"></i> Descargar PDF</button>
          <button class="btn" onclick="otEnviarWhatsApp('${ot_id}')" style="font-size:12px;color:#25D366;border-color:#25D366"><i class="ti ti-brand-whatsapp"></i> Enviar por WhatsApp</button>
          <button class="btn" onclick="otFacturarOT('${ot_id}')" style="font-size:12px"><i class="ti ti-receipt"></i> Facturar</button>
        </div>
      </div>
      <div class="card">
        <div class="ch"><span class="ct">✅ Confirmar entrega</span></div>
        <div class="fg">
          <label>Método de pago</label>
          <select id="ot-panel-metodo-pago" style="width:100%;padding:8px;border:0.5px solid var(--border);border-radius:var(--radius);background:var(--surface-1);color:var(--text-primary)">
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia bancaria</option>
            <option value="tarjeta">Tarjeta débito/crédito</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>
        <div class="fg">
          <label>Notas de entrega</label>
          <textarea id="ot-panel-notas-entrega" placeholder="Observaciones finales..." style="min-height:80px"></textarea>
        </div>
      </div>
    `)}
    ${_otFooter(`
      <button class="btn" onclick="_otCerrarPanelFase()" style="font-size:12px">Cerrar</button>
      <button class="btn bpa" onclick="otConfirmarEntrega('${ot_id}')" style="font-size:12px"><i class="ti ti-check"></i> Confirmar entrega y Archivar</button>
    `)}
  `);
}

function otFacturarOT(ot_id) {
  APP.toast.show('🧾 Abriendo módulo de facturación...', 'info');
  if (typeof nav === 'function') nav('facturacion');
  _otCerrarPanelFase();
}

function otConfirmarEntrega(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  const metodo = document.getElementById('ot-panel-metodo-pago')?.value || 'efectivo';
  const notas = document.getElementById('ot-panel-notas-entrega')?.value?.trim() || '';
  ot.metodo_pago = metodo;
  ot.notas_entrega = notas;
  ot.fecha_entrega = new Date().toISOString();
  ot.estado = 'archivado';
  APP.lsSet('ots', ots);
  _otAvanzarAFase(ot_id, 'archivado', 'Archivado');
}

// ===== MULTI-SERVICE DIAGNÓSTICO (tab/panel) =====
let otDiagServicios = [];
let otDiagRepuestos = [];

function otDiagBuscarServicio(q, suffix) {
  const sf = suffix || '_tab';
  const drop = document.getElementById('ot-diag-sugerencias' + sf);
  if (!drop) return;
  if (!q || q.length < 1) { if (drop) drop.style.display = 'none'; return; }
  const servicios = APP.lsGet('mp_servicios') || [];
  const qLow = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const matches = servicios.filter(s => (s.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(qLow)).slice(0, 10);
  drop.style.display = 'block';
  if (!matches.length) {
    drop.innerHTML = '<div style="padding:9px 12px;font-size:11px;color:var(--text-muted)">Sin resultados — completa manualmente</div>';
    return;
  }
  drop.innerHTML = matches.map(s => {
    const horas = s.horasEst != null ? s.horasEst : (s.horas || s.horas_estimadas || 0);
    const precio = s.precioFijo != null ? s.precioFijo : (s.valor || s.precio_venta || s.precioMinVenta || 0);
    return `<div onclick="otDiagSelServicio('${_nfEsc(s.nombre)}',${horas},${precio},'${sf}')"
      style="padding:8px 12px;cursor:pointer;border-bottom:0.5px solid var(--border);font-size:12px">
      <div style="font-weight:500">${_nfEsc(s.nombre)}</div>
      <div style="font-size:10px;color:var(--text-muted)">${horas ? '⏱ ' + horas + 'h' : ''}${precio ? ' | $' + Number(precio).toLocaleString('es-CL') : ''}</div>
    </div>`;
  }).join('');
}

function otDiagSelServicio(nombre, horas, valor, suffix) {
  const sf = suffix || '_tab';
  document.getElementById('ot-diag-servicio-nombre' + sf).value = nombre;
  document.getElementById('ot-diag-servicio-horas' + sf).value = horas != null ? horas : '';
  document.getElementById('ot-diag-servicio-valor' + sf).value = valor != null ? valor : '';
  const drop = document.getElementById('ot-diag-sugerencias' + sf);
  if (drop) drop.style.display = 'none';
  document.getElementById('ot-diag-datos-servicio' + sf).style.display = 'block';
  const servicios = APP.lsGet('mp_servicios') || [];
  const svc = servicios.find(s => (s.nombre || '').toLowerCase() === nombre.toLowerCase());
  if (svc && (svc.repuestosSugeridos || svc.repuestos)) {
    const reps = svc.repuestosSugeridos || svc.repuestos || [];
    otDiagRepuestos = reps.map(r => ({
      nombre: r.nombre || r.desc || '',
      cantidad: r.cantidad || 1,
      unidad: r.unidad || 'unidad'
    }));
  } else {
    otDiagRepuestos = [];
  }
  otDiagRenderRepuestos(sf);
  const btn = document.getElementById('ot-diag-agregar-btn' + sf);
  if (btn) btn.style.display = 'flex';
}

function otDiagAgregarRepuesto(suffix) {
  const sf = suffix || '_tab';
  const nombre = (document.getElementById('ot-diag-repuesto-nombre' + sf)?.value || '').trim();
  const cantidad = parseFloat(document.getElementById('ot-diag-repuesto-cantidad' + sf)?.value) || 1;
  const unidad = document.getElementById('ot-diag-repuesto-unidad' + sf)?.value || 'unidad';
  if (!nombre) { APP.toast.show('Ingresa el nombre del repuesto', 'warning'); return; }
  otDiagRepuestos.push({ nombre, cantidad, unidad });
  document.getElementById('ot-diag-repuesto-nombre' + sf).value = '';
  document.getElementById('ot-diag-repuesto-cantidad' + sf).value = '1';
  otDiagRenderRepuestos(sf);
}

function otDiagRenderRepuestos(suffix) {
  const sf = suffix || '_tab';
  const lista = document.getElementById('ot-diag-repuestos-lista' + sf);
  if (!lista) return;
  if (!otDiagRepuestos.length) {
    lista.innerHTML = '<div style="color:var(--text-muted);font-size:10px;padding:4px 0">Sin repuestos — agrega usando el botón</div>';
    return;
  }
  lista.innerHTML = otDiagRepuestos.map((r, i) => {
    const inv = typeof _findRepuestoEnInventario === 'function' ? _findRepuestoEnInventario(r.nombre) : null;
    const badge = inv && inv.stock > 0
      ? `<span style="margin-left:6px;font-size:9px;padding:1px 5px;border-radius:6px;background:#05966915;color:#059669;border:0.5px solid #05966930">✓ En inventario (stock: ${inv.stock})</span>`
      : `<span style="margin-left:6px;font-size:9px;padding:1px 5px;border-radius:6px;background:#d9770615;color:#d97706;border:0.5px solid #d9770630">Cotizar</span>`;
    return `<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:11px">
      <span style="flex:1">${_nfEsc(r.nombre)} (${r.cantidad} ${r.unidad}) ${badge}</span>
      <button onclick="otDiagElimRepuesto(${i},'${sf}')" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:14px;padding:0">×</button>
    </div>`;
  }).join('');
}

function otDiagElimRepuesto(i, suffix) { otDiagRepuestos.splice(i, 1); otDiagRenderRepuestos(suffix || '_tab'); }

function otDiagAgregarServicio(suffix) {
  const sf = suffix || '_tab';
  const nombre = (document.getElementById('ot-diag-servicio-nombre' + sf)?.value || '').trim();
  const horas = parseFloat(document.getElementById('ot-diag-servicio-horas' + sf)?.value) || 0;
  const valor = parseInt(document.getElementById('ot-diag-servicio-valor' + sf)?.value) || 0;
  if (!nombre) { APP.toast.show('Ingresa el nombre del servicio', 'warning'); return; }
  otDiagServicios.push({ nombre, horas, valor, repuestos: otDiagRepuestos.map(r => ({ ...r })) });
  document.getElementById('ot-diag-servicio-nombre' + sf).value = '';
  document.getElementById('ot-diag-servicio-horas' + sf).value = '';
  document.getElementById('ot-diag-servicio-valor' + sf).value = '';
  document.getElementById('ot-diag-buscar' + sf).value = '';
  otDiagRepuestos = [];
  otDiagRenderRepuestos(sf);
  otDiagRenderServicios(sf);
  document.getElementById('ot-diag-datos-servicio' + sf).style.display = 'none';
  const btn = document.getElementById('ot-diag-agregar-btn' + sf);
  if (btn) btn.style.display = 'none';
}

function otDiagRenderServicios(suffix) {
  const sf = suffix || '_tab';
  const lista = document.getElementById('ot-diag-servicios-lista' + sf);
  if (!lista) return;
  if (!otDiagServicios.length) {
    lista.innerHTML = '<div style="color:var(--text-muted);font-size:11px;padding:4px 0">Sin servicios agregados aún</div>';
    const tot = document.getElementById('ot-diag-totales' + sf);
    if (tot) tot.style.display = 'none';
    return;
  }
  lista.innerHTML = otDiagServicios.map((s, i) => {
    const repsHtml = s.repuestos && s.repuestos.length
      ? s.repuestos.map((r, ri) => {
          const inv = typeof _findRepuestoEnInventario === 'function' ? _findRepuestoEnInventario(r.nombre) : null;
          const badge = inv && inv.stock > 0
            ? `<span style="margin-left:4px;font-size:8px;padding:0 4px;border-radius:4px;background:#05966915;color:#059669;border:0.5px solid #05966930">✓ stock:${inv.stock}</span>`
            : `<span style="margin-left:4px;font-size:8px;padding:0 4px;border-radius:4px;background:#d9770615;color:#d97706;border:0.5px solid #d9770630">Cotizar</span>`;
          return `<div style="display:flex;align-items:center;gap:4px;padding:2px 0;font-size:10px;color:var(--text-muted)">
          <span style="flex:1">• ${_nfEsc(r.nombre)} (${r.cantidad} ${r.unidad})${badge}</span>
          <button onclick="otDiagElimRepuestoServicio(${i},${ri},'${sf}')" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:12px;padding:0;line-height:1">×</button>
        </div>`;
        }).join('')
      : '<div style="font-size:10px;color:var(--text-muted);padding:2px 0">Sin repuestos</div>';
    return `<div style="border:0.5px solid var(--border);border-radius:var(--radius);padding:8px 10px;background:var(--surface-1);margin-bottom:6px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-weight:600;font-size:12px;flex:1">SERVICIO ${i + 1}: ${_nfEsc(s.nombre)}</span>
        <button onclick="otDiagElimServicio(${i},'${sf}')" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:16px;padding:0">×</button>
      </div>
      <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">
        ⏱ ${s.horas}h | $${(s.valor || 0).toLocaleString('es-CL')}
      </div>
      <div style="font-size:10px;font-weight:500;color:var(--text-muted);margin-bottom:2px">Repuestos:</div>
      ${repsHtml}
    </div>`;
  }).join('');
  otDiagActualizarTotales(sf);
}

function otDiagActualizarTotales(suffix) {
  const sf = suffix || '_tab';
  const totalH = otDiagServicios.reduce((a, s) => a + (s.horas || 0), 0);
  const totalV = otDiagServicios.reduce((a, s) => a + (s.valor || 0), 0);
  const tot = document.getElementById('ot-diag-totales' + sf);
  if (tot) {
    tot.style.display = 'flex';
    tot.innerHTML = `<span>Total: <strong>${totalH}h</strong></span>
      <span style="font-weight:600;color:var(--text-accent,#2563eb)">Total: $${totalV.toLocaleString('es-CL')}</span>`;
  }
}

function otDiagElimServicio(i, suffix) { otDiagServicios.splice(i, 1); otDiagRenderServicios(suffix || '_tab'); }

function otDiagElimRepuestoServicio(si, ri, suffix) {
  if (otDiagServicios[si] && otDiagServicios[si].repuestos) {
    otDiagServicios[si].repuestos.splice(ri, 1);
    otDiagRenderServicios(suffix || '_tab');
  }
}

function otDiagGuardarCatalogo(suffix) {
  const sf = suffix || '_tab';
  const nombre = (document.getElementById('ot-diag-servicio-nombre' + sf)?.value || '').trim();
  const horas = parseFloat(document.getElementById('ot-diag-servicio-horas' + sf)?.value) || 0;
  const valor = parseInt(document.getElementById('ot-diag-servicio-valor' + sf)?.value) || 0;
  if (!nombre) { APP.toast.show('Ingresa el nombre del servicio', 'warning'); return; }
  const servicios = APP.lsGet('mp_servicios') || [];
  if (servicios.find(s => (s.nombre || '').toLowerCase() === nombre.toLowerCase())) {
    APP.toast.show('⚠️ El servicio ya existe en el catálogo', 'warning');
    return;
  }
  servicios.push({
    id: 'SVC' + Date.now(),
    nombre,
    horasEst: horas,
    precioFijo: valor,
    repuestosSugeridos: otDiagRepuestos.map(r => ({ ...r }))
  });
  APP.lsSet('mp_servicios', servicios);
  APP.toast.show('✅ Servicio guardado en catálogo', 'success');
}

function otDiagGuardarYAvanzar(suffix) {
  const sf = suffix || '_tab';
  const isTab = sf === '_tab';
  const otId = document.getElementById(isTab ? 'ot-diagnostico-ot-id' : 'ot-diagnostico-ot-id-hidden')?.value;
  const diagnostico = document.getElementById(isTab ? 'ot-diagnostico-input' : 'ot-diagnostico-input-panel')?.value?.trim();
  if (!diagnostico) { APP.toast.show('⚠️ Anotar diagnóstico es obligatorio', 'warning'); return; }
  if (!otDiagServicios.length) { APP.toast.show('⚠️ Agrega al menos un servicio', 'warning'); return; }
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === otId);
  if (!ot) { APP.toast.show('⚠️ OT no encontrada', 'error'); return; }

  ot.diagnostico = diagnostico;
  const serviciosGuardar = otDiagServicios.map(s => ({
    nombre: s.nombre,
    horas: s.horas || 0,
    valor: s.valor || 0,
    repuestos: (s.repuestos || []).map(r => ({ nombre: r.nombre, cantidad: r.cantidad, unidad: r.unidad }))
  }));
  const todosRepuestos = [];
  let totalHoras = 0;
  serviciosGuardar.forEach(s => {
    totalHoras += s.horas || 0;
    (s.repuestos || []).forEach(r => {
      todosRepuestos.push({ nombre: r.nombre, cantidad: r.cantidad || 1, precio_unitario: 0, proveedor: '' });
    });
  });
  if (!ot.cotizacion) ot.cotizacion = { repuestos: [], mano_obra: 0 };
  ot.servicios = serviciosGuardar;
  ot.servicios_diagnostico = serviciosGuardar.map(s => s.nombre);
  ot.servicios_seleccionados = serviciosGuardar.map(s => s.nombre);
  ot.cotizacion.repuestos = todosRepuestos;
  ot.cotizacion.mano_obra = serviciosGuardar.reduce((a, s) => a + (s.valor || 0), 0);
  ot.cotizacion.mano_obra_horas = totalHoras;
  ot.estado = 'repuestos';
  ot.fecha_modificacion = new Date().toISOString();
  APP.lsSet('ots', ots);
  otDiagServicios = [];
  otDiagRepuestos = [];
  if (typeof _otAvanzarAFase === 'function') _otAvanzarAFase(ot.id, 'repuestos', 'Repuestos');
}

function otDiagCargarOT(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;
  otDiagServicios = ot.servicios || [];
  otDiagRepuestos = [];
  otDiagRenderServicios('_tab');
}

// ===== WINDOW EXPORTS =====
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
window.otAvanzarFase = otAvanzarFase;
window.otAbrirPanelRecepcion = otAbrirPanelRecepcion;
window.otGuardarPanelRecepcion = otGuardarPanelRecepcion;
window.otAbrirPanelDiagnostico = otAbrirPanelDiagnostico;
window.otGuardarPanelDiagnostico = otGuardarPanelDiagnostico;
window.otBuscadorServicios = otBuscadorServicios;
window.otRellenarServicioSeleccionado = otRellenarServicioSeleccionado;
window.otCargarRepuestosTabla = otCargarRepuestosTabla;
window.otAgregarRepuestoManual = otAgregarRepuestoManual;
window.otEliminarFilaRepuesto = otEliminarFilaRepuesto;
window.otGuardarYAvanzarRepuestos = otGuardarYAvanzarRepuestos;
window.otAbrirPanelRepuestos = otAbrirPanelRepuestos;
window.otMostrarPreviewPDF = otMostrarPreviewPDF;
window.otGuardarRepuestosData = otGuardarRepuestosData;
window.otGenerarCotizacionPDF = otGenerarCotizacionPDF;
window.otDescargarPDFCotizacion = otDescargarPDFCotizacion;
window.otImprimirCotizacion = otImprimirCotizacion;
window.otEnviarCotizacionWhatsApp = otEnviarCotizacionWhatsApp;
window.otAvanzarAAprobacion = otAvanzarAAprobacion;
window.otAgregarFilaRepuestoTab = otAgregarFilaRepuestoTab;
window.otRecalcularRepuestoTab = otRecalcularRepuestoTab;
window.otAgregarFilaRepuestoTabCot = otAgregarFilaRepuestoTabCot;
window.otRecalcularCotizacionTab = otRecalcularCotizacionTab;
window.otRecalcularCotizacionPanel = otRecalcularCotizacionPanel;
window.otGuardarServicioAuto = otGuardarServicioAuto;
window.otCargarRepuestosSugeridos = otCargarRepuestosSugeridos;
function otRecalcularPanelRepuestos() {
  const tabla = document.querySelector('#ot-panel-repuestos-tabla table tbody');
  if (!tabla) return;
  let subRep = 0;
  tabla.querySelectorAll('tr').forEach(tr => {
    const cant = parseFloat(tr.querySelector('.ot-rep-cant')?.value) || 0;
    const precio = parseFloat(tr.querySelector('.ot-rep-precio')?.value) || 0;
    const sub = cant * precio;
    subRep += sub;
    const el = tr.querySelector('.ot-rep-subtotal');
    if (el) el.textContent = '$' + sub.toLocaleString('es-CL');
  });
  const horas = parseFloat(document.getElementById('ot-panel-horas')?.value) || 0;
  const config = APP.lsGet('taller_config', {});
  const tarifa = config.tarifa_hora || 0;
  const manoObra = horas * tarifa;
  const subtotal = subRep + manoObra;
  const iva = subtotal * 0.19;
  const total = subtotal + iva;
  const g = id => document.getElementById(id);
  if (g('ot-panel-subtotal-rep')) g('ot-panel-subtotal-rep').textContent = '$' + subRep.toLocaleString('es-CL');
  if (g('ot-panel-mano-obra')) g('ot-panel-mano-obra').textContent = '$' + manoObra.toLocaleString('es-CL');
  if (g('ot-panel-subtotal')) g('ot-panel-subtotal').textContent = '$' + subtotal.toLocaleString('es-CL');
  if (g('ot-panel-iva')) g('ot-panel-iva').textContent = '$' + iva.toLocaleString('es-CL');
  if (g('ot-panel-total')) g('ot-panel-total').textContent = '$' + total.toLocaleString('es-CL');
}
function otPanelAgregarFilaRepuesto() {
  const cont = document.getElementById('ot-panel-repuestos-tabla');
  if (!cont) return;
  let tbody = cont.querySelector('table tbody');
  if (!tbody) {
    cont.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:var(--surface-2);border-bottom:0.5px solid var(--border)">
        <th style="text-align:left;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Repuesto</th>
        <th style="text-align:center;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Cant.</th>
        <th style="text-align:right;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Precio</th>
        <th style="text-align:right;padding:8px;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Subtotal</th>
        <th style="text-align:center;padding:8px;width:40px"></th>
      </tr></thead><tbody></tbody></table>`;
    tbody = cont.querySelector('table tbody');
  }
  const tr = document.createElement('tr');
  tr.style.borderBottom = '0.5px solid var(--border)';
  tr.innerHTML = `<td style="padding:6px"><input class="ot-rep-nombre" value="" style="width:100%;padding:4px 6px;border:0.5px solid var(--border);border-radius:4px;background:var(--surface-1);color:var(--text-primary)"></td>
    <td style="padding:6px;text-align:center"><input class="ot-rep-cant" type="number" min="1" value="1" style="width:50px;text-align:center;padding:4px;border:0.5px solid var(--border);border-radius:4px;background:var(--surface-1);color:var(--text-primary)"></td>
    <td style="padding:6px;text-align:right"><input class="ot-rep-precio" type="number" min="0" value="0" style="width:90px;text-align:right;padding:4px;border:0.5px solid var(--border);border-radius:4px;background:var(--surface-1);color:var(--text-primary)"></td>
    <td style="padding:6px;text-align:right;font-weight:500" class="ot-rep-subtotal">$0</td>
    <td style="padding:6px;text-align:center"><button class="btn" style="font-size:10px;padding:2px 6px;color:var(--text-danger)" onclick="this.closest('tr').remove();otRecalcularPanelRepuestos()"><i class="ti ti-trash"></i></button></td>`;
  tbody.appendChild(tr);
  otRecalcularPanelRepuestos();
}
window.otRecalcularPanelRepuestos = otRecalcularPanelRepuestos;
window.otPanelAgregarFilaRepuesto = otPanelAgregarFilaRepuesto;
window.otGuardarPanelRepuestos = otGuardarPanelRepuestos;
window.otAbrirPanelAprobacion = otAbrirPanelAprobacion;
window.otAprobarCotizacion = otAprobarCotizacion;
window.otRechazarAprobacion = otRechazarAprobacion;
window.otAbrirPanelReparacion = otAbrirPanelReparacion;
window.otPanelIniciarReparacion = otPanelIniciarReparacion;
window.otPanelPausarReparacion = otPanelPausarReparacion;
window.otFinalizarReparacion = otFinalizarReparacion;
window.otAbrirPanelControl = otAbrirPanelControl;
window.otGuardarPanelControl = otGuardarPanelControl;
window.otAbrirPanelEntrega = otAbrirPanelEntrega;
window.otFacturarOT = otFacturarOT;
window.otConfirmarEntrega = otConfirmarEntrega;
window._otCerrarPanelFase = _otCerrarPanelFase;
window._otAvanzarAFase = _otAvanzarAFase;
window.otDiagBuscarServicio = otDiagBuscarServicio;
window.otDiagSelServicio = otDiagSelServicio;
window.otDiagAgregarRepuesto = otDiagAgregarRepuesto;
window.otDiagAgregarServicio = otDiagAgregarServicio;
window.otDiagElimRepuesto = otDiagElimRepuesto;
window.otDiagElimServicio = otDiagElimServicio;
window.otDiagElimRepuestoServicio = otDiagElimRepuestoServicio;
window.otDiagGuardarCatalogo = otDiagGuardarCatalogo;
window.otDiagGuardarYAvanzar = otDiagGuardarYAvanzar;
window.otDiagCargarOT = otDiagCargarOT;
