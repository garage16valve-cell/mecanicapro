// ===== COTIZACIÓN A PROVEEDORES =====

function cotizadorGenerarMensajePorProveedor(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot || !ot.cotizacion || !ot.cotizacion.repuestos) return [];

  const config = APP.lsGet('taller_config', {});
  const proveedores = APP.lsGet('mp_proveedores', []);

  // Agrupar repuestos por proveedor
  const repuestos_por_proveedor = {};

  ot.cotizacion.repuestos.forEach(rep => {
    const proveedor_id = rep.proveedor_id || 'sin_asignar';
    if (!repuestos_por_proveedor[proveedor_id]) {
      repuestos_por_proveedor[proveedor_id] = [];
    }
    repuestos_por_proveedor[proveedor_id].push(rep);
  });

  const mensajes = [];
  for (let prov_id in repuestos_por_proveedor) {
    const repuestos = repuestos_por_proveedor[prov_id];
    const proveedor = proveedores.find(p => p.id.toString() === prov_id);

    let lista_repuestos = repuestos.map(r => `  • ${r.nombre} x${r.cantidad}`).join('\n');

    const mensaje = `Hola ${proveedor?.vendedor || 'Proveedor'},

Solicitud de cotización para reparación:

*Vehículo:*
• Marca: ${ot.marca || '—'}
• Modelo: ${ot.modelo || '—'}
• Año: ${ot.anio || '—'}
• Placa: ${ot.patente || '—'}
• Motor: ${ot.motor || '—'}
• Chasis: ${ot.chasis || '—'}
• Km: ${ot.km || '—'}

*Repuestos requeridos:*
${lista_repuestos}

*Taller:*
${config.nombre_taller || 'Taller'}
Teléfono: ${config.telefono_taller || '—'}
Dirección: ${config.direccion_taller || '—'}

*Solicitado por:*
${config.usuario_actual || 'Técnico'}

Por favor, envía tu cotización a la brevedad.

Gracias.`;

    mensajes.push({
      proveedor_id: prov_id,
      proveedor_nombre: proveedor?.nombre || 'Sin asignar',
      telefono: proveedor?.wzp || '',
      pais: proveedor?.pais || '+56',
      repuestos,
      mensaje
    });
  }

  return mensajes;
}

function cotizadorCopiarMensaje(mensaje) {
  navigator.clipboard.writeText(mensaje).then(() => {
    APP.toast.show('✅ Mensaje copiado al portapapeles', 'success');
  });
}

function cotizadorAbrirWhatsApp(proveedor_id, ot_id, mensaje) {
  const proveedores = APP.lsGet('mp_proveedores', []);
  const proveedor = proveedores.find(p => p.id.toString() === proveedor_id);

  if (!proveedor || !proveedor.wzp) {
    APP.toast.show('⚠️ Proveedor sin WhatsApp', 'warning');
    return;
  }

  const pais = (proveedor.pais || '+56').replace('+', '');
  const numero = (proveedor.wzp || '').replace(/\D/g, '');
  const url = `https://wa.me/${pais}${numero}?text=${encodeURIComponent(mensaje)}`;

  cotizadorGuardarEstadoPendiente(ot_id, proveedor_id);

  window.open(url, '_blank');
  APP.toast.show('✅ Abriendo WhatsApp...', 'success');
}

function cotizadorGuardarEstadoPendiente(ot_id, proveedor_id, repuestos_ids) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  if (!ot.cotizaciones_pendientes) ot.cotizaciones_pendientes = [];

  const solicitud = {
    id: 'cot-' + Date.now(),
    proveedor_id,
    repuestos_ids,
    estado: 'pendiente',
    fecha_solicitud: new Date().toISOString(),
    respuesta: null,
    fecha_respuesta: null
  };

  ot.cotizaciones_pendientes.push(solicitud);
  ot.historial = ot.historial || [];
  ot.historial.push({
    evento: 'Cotización solicitada a proveedor',
    descripcion: `Proveedor ${proveedor_id}`,
    fecha: new Date().toISOString()
  });

  APP.lsSet('ots', ots);
}

function cotizadorAbrirPanelProveedores(ot_id) {
  const mensajes = cotizadorGenerarMensajePorProveedor(ot_id);

  if (mensajes.length === 0) {
    APP.toast.show('⚠️ Sin repuestos de proveedores asignados', 'warning');
    return;
  }

  const html = mensajes.map(m => `
    <div style="background:var(--surface-1);border:0.5px solid var(--border);border-radius:var(--radius);padding:12px;margin-bottom:10px">
      <div style="font-size:12px;font-weight:500;margin-bottom:8px">${m.proveedor_nombre}</div>
      <div style="display:flex;gap:6px;margin-bottom:10px">
        <button class="btn" style="font-size:10px;padding:4px 8px" onclick="cotizadorCopiarMensaje(\`${m.mensaje.replace(/`/g, '\\`')}\`)"><i class="ti ti-copy"></i> Copiar</button>
        <button class="btn bpw" style="font-size:10px;padding:4px 8px" onclick="cotizadorAbrirWhatsApp('${m.proveedor_id}','${ot_id}',\`${m.mensaje.replace(/`/g, '\\`')}\`)"><i class="ti ti-brand-whatsapp"></i> WhatsApp</button>
      </div>
      <div style="font-size:10px;background:var(--surface-2);padding:8px;border-radius:var(--radius);border:0.5px solid var(--border);max-height:120px;overflow-y:auto;white-space:pre-wrap;color:var(--text-secondary)">${m.mensaje}</div>
    </div>
  `).join('');

  document.getElementById('ot-cotizacion-proveedores-panel').innerHTML = html;
}

// Exportar
window.cotizadorGenerarMensajePorProveedor = cotizadorGenerarMensajePorProveedor;
window.cotizadorCopiarMensaje = cotizadorCopiarMensaje;
window.cotizadorAbrirWhatsApp = cotizadorAbrirWhatsApp;
window.cotizadorGuardarEstadoPendiente = cotizadorGuardarEstadoPendiente;
window.cotizadorAbrirPanelProveedores = cotizadorAbrirPanelProveedores;
