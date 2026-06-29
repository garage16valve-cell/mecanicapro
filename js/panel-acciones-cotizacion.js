// ===== PANEL ACCIONES: GUARDAR/IMPRIMIR/ENVIAR =====

function tallerDescargarPDFCotizacion(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  const doc = tallerGenerarPDFCotizacion(ot_id);
  if (!doc) return;

  const nombre_archivo = `COT-${ot_id}-${ot.marca}_${ot.modelo}_${ot.anio}.pdf`;
  doc.save(nombre_archivo);

  ot.cotizacion = ot.cotizacion || {};
  ot.cotizacion.descargada = true;
  ot.cotizacion.fecha_descarga = new Date().toISOString();
  ot.historial = ot.historial || [];
  ot.historial.push({
    evento: 'Cotización descargada',
    descripcion: nombre_archivo,
    fecha: new Date().toISOString()
  });

  APP.lsSet('ots', ots);
  APP.toast.show('✅ Cotización descargada', 'success');
}

function tallerImprimirCotizacion(ot_id) {
  const doc = tallerGenerarPDFCotizacion(ot_id);
  if (!doc) return;

  // Obtener blob y abrirlo en nueva ventana para imprimir
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const ventana = window.open(url);

  ventana.addEventListener('load', () => {
    ventana.print();
  });

  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (ot) {
    ot.cotizacion = ot.cotizacion || {};
    ot.cotizacion.impresa = true;
    ot.cotizacion.fecha_impresion = new Date().toISOString();
    ot.historial = ot.historial || [];
    ot.historial.push({
      evento: 'Cotización impresa',
      descripcion: 'Usuario imprimió la cotización',
      fecha: new Date().toISOString()
    });
    APP.lsSet('ots', ots);
  }

  APP.toast.show('✅ Abriendo vista previa de impresión', 'success');
}

function tallerEnviarCotizacion(ot_id, metodo) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  if (metodo === 'whatsapp') {
    tallerEnviarCotizacionWhatsApp(ot_id);
  } else if (metodo === 'email') {
    tallerEnviarCotizacionEmail(ot_id);
  }
}

function tallerEnviarCotizacionWhatsApp(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot || !ot.cliente_whatsapp) {
    APP.toast.show('⚠️ Cliente sin teléfono WhatsApp', 'warning');
    return;
  }

  const mensaje = `Hola ${ot.cliente_nombre || 'Cliente'},\n\nAdjunto encontrarás la cotización para la reparación de tu ${ot.marca} ${ot.modelo} ${ot.anio}.\n\nPor favor, confirma si deseas proceder.\n\n¡Gracias!`;

  const numero = ot.cliente_whatsapp.replace(/\D/g, '');
  const url = `https://wa.me/56${numero}?text=${encodeURIComponent(mensaje)}`;

  // Registrar envío
  ot.cotizacion = ot.cotizacion || {};
  ot.cotizacion.enviada_whatsapp = true;
  ot.cotizacion.fecha_envio_whatsapp = new Date().toISOString();
  ot.historial = ot.historial || [];
  ot.historial.push({
    evento: 'Cotización enviada por WhatsApp',
    descripcion: 'A: ' + ot.cliente_nombre,
    fecha: new Date().toISOString()
  });
  APP.lsSet('ots', ots);

  window.open(url, '_blank');
  APP.toast.show('✅ Abriendo WhatsApp', 'success');
}

function tallerEnviarCotizacionEmail(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot || !ot.cliente_email) {
    APP.toast.show('⚠️ Cliente sin email registrado', 'warning');
    return;
  }

  const asunto = encodeURIComponent(`Cotización - ${ot.marca} ${ot.modelo} ${ot.anio}`);
  const cuerpo = encodeURIComponent(`Estimado ${ot.cliente_nombre || 'Cliente'},\n\nAdjunto encontrarás la cotización para tu vehículo.\n\n¡Gracias!`);

  const url = `mailto:${ot.cliente_email}?subject=${asunto}&body=${cuerpo}`;

  // Registrar envío
  ot.cotizacion = ot.cotizacion || {};
  ot.cotizacion.enviada_email = true;
  ot.cotizacion.fecha_envio_email = new Date().toISOString();
  ot.historial = ot.historial || [];
  ot.historial.push({
    evento: 'Cotización enviada por email',
    descripcion: 'A: ' + ot.cliente_email,
    fecha: new Date().toISOString()
  });
  APP.lsSet('ots', ots);

  window.location.href = url;
  APP.toast.show('✅ Abriendo cliente de email', 'success');
}

function tallerMostrarPanelAcciones(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  if (!ot) return;

  const html = `
    <div class="card" style="border-color:#16a34a">
      <div class="ch">
        <span class="ct" style="color:#16a34a">📋 Panel Acciones — Cotización</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn bpa" style="justify-content:center;padding:12px;width:100%" onclick="tallerDescargarPDFCotizacion('${ot_id}')">
          <i class="ti ti-download"></i> 💾 Descargar PDF
        </button>
        <button class="btn" style="justify-content:center;padding:12px;width:100%;border-color:#f59e0b;color:#f59e0b" onclick="tallerImprimirCotizacion('${ot_id}')">
          <i class="ti ti-printer"></i> 🖨️ Imprimir
        </button>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button class="btn bpw" style="justify-content:center;padding:12px" onclick="tallerEnviarCotizacion('${ot_id}','whatsapp')">
            <i class="ti ti-brand-whatsapp"></i> WhatsApp
          </button>
          <button class="btn" style="justify-content:center;padding:12px;border-color:#3b82f6;color:#3b82f6" onclick="tallerEnviarCotizacion('${ot_id}','email')">
            <i class="ti ti-mail"></i> Email
          </button>
        </div>
      </div>
    </div>
  `;

  const panel = document.getElementById('ot-panel-acciones-cotizacion');
  if (panel) {
    panel.innerHTML = html;
    panel.style.display = '';
  }
}

// Exportar
window.tallerDescargarPDFCotizacion = tallerDescargarPDFCotizacion;
window.tallerImprimirCotizacion = tallerImprimirCotizacion;
window.tallerEnviarCotizacion = tallerEnviarCotizacion;
window.tallerEnviarCotizacionWhatsApp = tallerEnviarCotizacionWhatsApp;
window.tallerEnviarCotizacionEmail = tallerEnviarCotizacionEmail;
window.tallerMostrarPanelAcciones = tallerMostrarPanelAcciones;
