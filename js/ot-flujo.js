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
  const servicios = APP.lsGet('mp_servicios', [
    {id:'serv-1',nombre:'Cambio aceite',horas:0.5,categorias:['Motor','Mantención']},
    {id:'serv-2',nombre:'Cambio filtro',horas:0.25,categorias:['Motor','Mantención']},
    {id:'serv-3',nombre:'Cambio de frenos',horas:1.5,categorias:['Frenos']},
    {id:'serv-4',nombre:'Alineación',horas:1,categorias:['Suspensión']},
    {id:'serv-5',nombre:'Balanceo de ruedas',horas:0.75,categorias:['Suspensión']}
  ]);

  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  const servicios_seleccionados = ot.servicios_diagnostico || [];

  const html = servicios.map(s => `
    <label style="display:flex;align-items:center;gap:8px;padding:8px;border:0.5px solid var(--border);border-radius:var(--radius);cursor:pointer;background:var(--surface-1)">
      <input type="checkbox" ${servicios_seleccionados.includes(s.id) ? 'checked' : ''} onchange="otSeleccionarServicio('${ot_id}','${s.id}')">
      <div style="flex:1">
        <div style="font-size:12px;font-weight:500">${s.nombre}</div>
        <div style="font-size:10px;color:var(--text-muted)">${s.horas}h estimadas</div>
      </div>
    </label>
  `).join('');

  document.getElementById('ot-diagnostico-servicios-lista').innerHTML = html;
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

  const html = `
    <div class="card" style="margin-bottom:14px">
      <div class="ch"><span class="ct">🔩 Repuestos</span></div>
      <div style="margin-bottom:10px">
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

  document.getElementById('ot-cotizacion-panel-centro').innerHTML = html;

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

  document.getElementById('ot-cotizacion-mano-obra-valor').textContent = mano_obra.toLocaleString('es-CL');

  const panel_derecha = document.getElementById('ot-cotizacion-panel-derecha');
  if (panel_derecha) {
    panel_derecha.innerHTML = `
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
  }

  APP.lsSet('ots', ots);
}

// Exportar
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
