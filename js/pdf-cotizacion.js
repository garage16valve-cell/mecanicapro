// ===== GENERADOR PDF COTIZACIÓN =====

function tallerGenerarPDFCotizacion(ot_id) {
  const ots = APP.lsGet('ots', []);
  const ot = ots.find(o => o.id === ot_id);
  const config = APP.lsGet('taller_config', {});
  const datosLegales = config.datos_legales || {};

  const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
  if (!ot || typeof jsPDF !== 'function') {
    APP.toast.show('⚠️ Error: OT no encontrada o librería PDF no cargada', 'error');
    return null;
  }

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 10;

    // Encabezado
    doc.setFontSize(10);
    doc.text('COTIZACIÓN DE SERVICIO', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;

    // Datos legales
    doc.setFontSize(8);
    doc.text(datosLegales.nombre_legal || 'Taller', 12, yPos);
    yPos += 4;
    doc.text('RUT: ' + (datosLegales.rut || '—'), 12, yPos);
    yPos += 4;
    doc.text('Dirección: ' + (datosLegales.direccion || '—'), 12, yPos);
    yPos += 4;
    doc.text('Comuna: ' + (datosLegales.comuna || '—'), 12, yPos);
    yPos += 4;
    doc.text('Teléfono: ' + (datosLegales.telefono || '—') + ' | Email: ' + (datosLegales.email || '—'), 12, yPos);
    yPos += 8;

    // Separador
    doc.setDrawColor(200);
    doc.line(12, yPos, pageWidth - 12, yPos);
    yPos += 4;

    // N° cotización y fecha
    doc.setFontSize(9);
    doc.text('N° Cotización: ' + (ot.id || '—'), 12, yPos);
    yPos += 4;
    doc.text('Fecha: ' + (new Date().toLocaleDateString('es-CL')) + ' | Validez: 7 días', 12, yPos);
    yPos += 6;

    // Datos cliente
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('DATOS DEL CLIENTE', 12, yPos);
    yPos += 4;
    doc.setFont(undefined, 'normal');
    doc.text('Nombre: ' + (ot.cliente_nombre || '—'), 12, yPos);
    yPos += 3;
    doc.text('RUT: ' + (ot.cliente_rut || '—'), 12, yPos);
    yPos += 3;
    doc.text('Teléfono: ' + (ot.cliente_whatsapp || '—'), 12, yPos);
    yPos += 3;
    doc.text('Email: ' + (ot.cliente_email || '—'), 12, yPos);
    yPos += 6;

    // Datos vehículo
    doc.setFont(undefined, 'bold');
    doc.text('DATOS DEL VEHÍCULO', 12, yPos);
    yPos += 4;
    doc.setFont(undefined, 'normal');
    doc.text('Marca: ' + (ot.marca || '—') + ' | Modelo: ' + (ot.modelo || '—') + ' | Año: ' + (ot.anio || '—'), 12, yPos);
    yPos += 4;
    doc.text('Placa: ' + (ot.patente || '—') + ' | Motor: ' + (ot.motor || '—') + ' | Chasis: ' + (ot.chasis || '—'), 12, yPos);
    yPos += 4;
    doc.text('Km: ' + (ot.km || '—'), 12, yPos);
    yPos += 6;

    // Diagnóstico
    doc.setFont(undefined, 'bold');
    doc.text('DIAGNÓSTICO', 12, yPos);
    yPos += 4;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    const diagnostico_lines = doc.splitTextToSize(ot.diagnostico || 'Sin diagnóstico', pageWidth - 24);
    doc.text(diagnostico_lines, 12, yPos);
    yPos += (diagnostico_lines.length * 3) + 4;

    // Tabla de servicios/repuestos
    if (ot.cotizacion && ot.cotizacion.repuestos && ot.cotizacion.repuestos.length > 0) {
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);
      doc.text('DETALLE DE SERVICIOS Y REPUESTOS', 12, yPos);
      yPos += 5;

      // Encabezado tabla
      doc.setFont(undefined, 'bold');
      doc.setFillColor(240, 240, 240);
      const col_desc = 12;
      const col_qty = pageWidth - 60;
      const col_precio = pageWidth - 40;
      const col_subtotal = pageWidth - 12;

      doc.text('Descripción', col_desc, yPos);
      doc.text('Qty', col_qty, yPos, { align: 'center' });
      doc.text('Precio Unit.', col_precio, yPos, { align: 'right' });
      doc.text('Subtotal', col_subtotal, yPos, { align: 'right' });
      yPos += 4;

      // Datos tabla
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7);
      ot.cotizacion.repuestos.forEach(rep => {
        const subtotal = (rep.cantidad || 0) * (rep.precio_unitario || 0);
        doc.text(rep.nombre || '—', col_desc, yPos);
        doc.text((rep.cantidad || 0).toString(), col_qty, yPos, { align: 'center' });
        doc.text('$' + (rep.precio_unitario || 0).toLocaleString('es-CL'), col_precio, yPos, { align: 'right' });
        doc.text('$' + subtotal.toLocaleString('es-CL'), col_subtotal, yPos, { align: 'right' });
        yPos += 3;

        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 10;
        }
      });

      yPos += 2;
      doc.setDrawColor(200);
      doc.line(12, yPos, pageWidth - 12, yPos);
      yPos += 4;
    }

    // Cálculos
    const subtotal_repuestos = ot.cotizacion?.repuestos?.reduce((s, r) => s + ((r.cantidad || 0) * (r.precio_unitario || 0)), 0) || 0;
    const mano_obra = ot.cotizacion?.mano_obra || 0;
    const subtotal = subtotal_repuestos + mano_obra;
    const iva = subtotal * 0.19;
    const total = subtotal + iva;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.text('Subtotal:', pageWidth - 50, yPos, { align: 'left' });
    doc.text('$' + subtotal.toLocaleString('es-CL'), pageWidth - 12, yPos, { align: 'right' });
    yPos += 4;

    doc.text('IVA 19%:', pageWidth - 50, yPos, { align: 'left' });
    doc.text('$' + iva.toLocaleString('es-CL'), pageWidth - 12, yPos, { align: 'right' });
    yPos += 5;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 102, 204);
    doc.text('TOTAL:', pageWidth - 50, yPos, { align: 'left' });
    doc.text('$' + total.toLocaleString('es-CL'), pageWidth - 12, yPos, { align: 'right' });
    yPos += 8;

    // Pie de página
    doc.setTextColor(0);
    doc.setFont(undefined, 'italic');
    doc.setFontSize(7);
    doc.text('Esta cotización es válida por 7 días. Incluye IVA 19%. Términos de pago a negociar.', 12, pageHeight - 10);

    return doc;
  } catch (error) {
    console.error('Error generando PDF:', error);
    APP.toast.show('⚠️ Error generando PDF: ' + error.message, 'error');
    return null;
  }
}

// Exportar
window.tallerGenerarPDFCotizacion = tallerGenerarPDFCotizacion;
