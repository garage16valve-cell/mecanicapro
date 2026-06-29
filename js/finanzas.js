let _finChartInstance = null;

// ===== FINANZAS DASHBOARD (FASE 1) =====

function finSetTab(tabName) {
  document.querySelectorAll('#pg-finanzas .tab-panel').forEach(el => el.style.display = 'none');
  document.querySelectorAll('#pg-finanzas .tab-btn').forEach(el => el.classList.remove('active'));
  const panel = document.getElementById('fin-tab-' + tabName);
  const btn   = document.getElementById('fin-btn-' + tabName);
  if (panel) panel.style.display = 'block';
  if (btn) btn.classList.add('active');
  if (tabName === 'dashboard') finRenderDashboard();
}

function finCargar() {
  console.log('finanzas: usuario_sesion =', APP.lsGet('usuario_sesion'));
  finRenderDashboard();
}

function finRenderDashboard() {
  // REMOVIDO: Validación de rol deshabilitada temporalmente para debug
  // const usuario = APP.lsGet('usuario_sesion') || {};
  // if(usuario.rol !== 'Administrador') return;

  const now = new Date();
  const mesActual = now.getMonth() + 1;
  const añoActual = now.getFullYear();

  const flujo = APP.lsGet('finanzas_flujo_caja') || [];

  const ingresosMes = flujo.filter(m => {
    const f = new Date(m.fecha);
    return m.tipo === 'ingreso' && f.getMonth() + 1 === mesActual && f.getFullYear() === añoActual;
  }).reduce((sum, m) => sum + (m.monto || 0), 0);

  const egresosMes = flujo.filter(m => {
    const f = new Date(m.fecha);
    return m.tipo === 'egreso' && f.getMonth() + 1 === mesActual && f.getFullYear() === añoActual;
  }).reduce((sum, m) => sum + (m.monto || 0), 0);

  const ivaDebito  = flujo.filter(m => m.categoria === 'IVA débito fiscal' && m.tipo === 'ingreso').reduce((sum, m) => sum + (m.monto || 0), 0);
  const ivaCredito = flujo.filter(m => m.categoria === 'IVA crédito fiscal' && m.tipo === 'egreso').reduce((sum, m) => sum + (m.monto || 0), 0);
  const ivaPagar   = ivaDebito - ivaCredito;
  const margenNeto = ingresosMes - egresosMes;

  document.getElementById('fin-ingresos-mes').textContent = '$' + ingresosMes.toLocaleString('es-CL') + ' CLP';
  document.getElementById('fin-egresos-mes').textContent  = '$' + egresosMes.toLocaleString('es-CL') + ' CLP';
  document.getElementById('fin-iva-pagar').textContent    = '$' + ivaPagar.toLocaleString('es-CL') + ' CLP';

  const margenEl = document.getElementById('fin-margen-neto');
  margenEl.textContent = '$' + margenNeto.toLocaleString('es-CL') + ' CLP';
  margenEl.style.color = margenNeto < 0 ? 'var(--text-danger)' : '';

  finRenderDistribucion();
  finRenderGrafico6Meses();
}

function finRenderDistribucion() {
  const motorConfig = APP.lsGet('motor_contable_config') || { cuentas: [] };
  const now = new Date();
  const mesActual = now.getMonth() + 1;
  const añoActual = now.getFullYear();
  const flujo = APP.lsGet('finanzas_flujo_caja') || [];

  const distribDiv = document.getElementById('fin-distribucion-cuentas');
  if (!distribDiv) return;
  distribDiv.innerHTML = '';

  motorConfig.cuentas.forEach(cuenta => {
    const totalCuenta = flujo.filter(m =>
      m.categoria === cuenta.nombre &&
      m.tipo === 'ingreso' &&
      new Date(m.fecha).getMonth() + 1 === mesActual &&
      new Date(m.fecha).getFullYear() === añoActual
    ).reduce((sum, m) => sum + (m.monto || 0), 0);

    distribDiv.innerHTML +=
      '<div style="margin-bottom:12px">' +
        '<div style="font-size:12px;margin-bottom:4px;color:var(--text-muted)">' + cuenta.nombre + '</div>' +
        '<div style="background:' + (cuenta.color || '#3B82F6') + ';height:24px;border-radius:4px;padding:4px 8px;color:white;font-size:12px;display:flex;align-items:center">' +
          '$' + totalCuenta.toLocaleString('es-CL') + ' CLP' +
        '</div>' +
      '</div>';
  });
}

function finRenderGrafico6Meses() {
  const ctx = document.getElementById('fin-chart-6meses');
  if (!ctx || typeof Chart === 'undefined') return;
  const flujo = APP.lsGet('finanzas_flujo_caja') || [];
  const meses = [];
  const ingresos = [];
  const egresos  = [];

  for (let i = 5; i >= 0; i--) {
    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() - i);
    const mes = fecha.getMonth() + 1;
    const año = fecha.getFullYear();
    meses.push(fecha.toLocaleDateString('es-CL', { month: 'short' }));

    ingresos.push(
      flujo.filter(m => {
        const f = new Date(m.fecha);
        return m.tipo === 'ingreso' && f.getMonth() + 1 === mes && f.getFullYear() === año;
      }).reduce((sum, m) => sum + (m.monto || 0), 0)
    );
    egresos.push(
      flujo.filter(m => {
        const f = new Date(m.fecha);
        return m.tipo === 'egreso' && f.getMonth() + 1 === mes && f.getFullYear() === año;
      }).reduce((sum, m) => sum + (m.monto || 0), 0)
    );
  }

  if (_finChartInstance) _finChartInstance.destroy();
  _finChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: meses,
      datasets: [
        { label: 'Ingresos', data: ingresos, backgroundColor: '#10B981' },
        { label: 'Egresos',  data: egresos,  backgroundColor: '#EF4444' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

// ===== MÓDULO: FINANZAS (Motor contable, Facturación) =====
function init_finanzas() {
  renderCuentas();
  simular();
}

const COLORES = ['#378ADD','#1D9E75','#BA7517','#9B4DCA','#D85A30','#639922','#993556','#6B6A65'];
const CUENTAS_DEFAULT = [
  { nombre:'Gastos fijos estructurales', sub:'Arriendo, luz, agua, seguros', pct:43, color:COLORES[0] },
  { nombre:'Pago técnico asignado',      sub:'Comisión del mecánico',        pct:20, color:COLORES[1] },
  { nombre:'Fondo de reinversión',       sub:'Herramientas y mejoras',       pct:10, color:COLORES[2] },
  { nombre:'Utilidad líquida dueño',     sub:'Retiro directo',               pct:27, color:COLORES[3] },
];

function getCuentas() { return APP.lsGet('mp_cuentas', CUENTAS_DEFAULT); }
function saveCuentas(c) { APP.lsSet('mp_cuentas', c); }

function renderCuentas() {
  const c = document.getElementById('cuentas-container');
  if (!c) return;
  const cuentas = getCuentas();
  c.innerHTML = '';
  cuentas.forEach((cu, i) => {
    const d = document.createElement('div');
    d.className = 'cuenta-row';
    d.innerHTML = `
      <div class="cuenta-color" style="background:${cu.color}"></div>
      <div class="cuenta-name">
        <input value="${cu.nombre}" onchange="updateCuenta(${i},'nombre',this.value)" placeholder="Nombre de la cuenta">
        <div class="cuenta-sub">${cu.sub}</div>
      </div>
      <div class="cuenta-pct">
        <input type="number" min="0" max="100" value="${cu.pct}" onchange="updateCuenta(${i},'pct',parseFloat(this.value)||0)">
        <div style="text-align:right;font-size:9px;color:var(--text-muted)">%</div>
      </div>
      <button class="cuenta-del" onclick="eliminarCuenta(${i})" title="Eliminar"><i class="ti ti-trash" style="font-size:13px"></i></button>`;
    c.appendChild(d);
  });
  actualizarTotal();
  simular();
}

function updateCuenta(i, key, val) {
  const cuentas = getCuentas();
  cuentas[i][key] = val;
  saveCuentas(cuentas);
  actualizarTotal();
  simular();
}

function agregarCuenta() {
  const cuentas = getCuentas();
  cuentas.push({ nombre:'Nueva cuenta', sub:'Descripción', pct:0, color:COLORES[cuentas.length % COLORES.length] });
  saveCuentas(cuentas);
  renderCuentas();
}

function eliminarCuenta(i) {
  const cuentas = getCuentas();
  if (cuentas.length <= 1) { APP.toast.show('⚠️ Debe existir al menos una cuenta.', 'warning'); return; }
  cuentas.splice(i, 1);
  saveCuentas(cuentas);
  renderCuentas();
}

function actualizarTotal() {
  const cuentas = getCuentas();
  const total = cuentas.reduce((s, c) => s + (parseFloat(c.pct) || 0), 0);
  const bar = document.getElementById('total-bar');
  const lbl = document.getElementById('total-label');
  const msg = document.getElementById('total-msg');
  if (!bar || !lbl || !msg) return;

  lbl.textContent = 'Total: ' + Math.round(total * 10) / 10 + '%';
  const diff = Math.round((total - 100) * 10) / 10;

  if (Math.abs(total - 100) < 0.1) {
    bar.className = 'total-bar total-ok';
    msg.innerHTML = '<span style="color:var(--text-success);font-weight:500">✓ Distribución correcta</span>';
  } else if (total < 100) {
    bar.className = 'total-bar total-err';
    msg.innerHTML = `<span style="color:var(--text-danger)">Faltan ${Math.abs(diff).toFixed(1)}% por asignar</span>`;
  } else {
    bar.className = 'total-bar total-err';
    msg.innerHTML = `<span style="color:var(--text-danger)">Excedido en ${Math.abs(diff).toFixed(1)}%</span>`;
  }
}

function simular() {
  const bruto  = parseFloat(document.getElementById('sim-bruto')?.value) || 0;
  const ivaPct = parseFloat(document.getElementById('sim-iva')?.value)   || 19;
  const iva    = Math.round(bruto * ivaPct / (100 + ivaPct));
  const neto   = bruto - iva;

  const rb = document.getElementById('res-bruto'); if (rb) rb.textContent = '$' + bruto.toLocaleString('es-CL');
  const ri = document.getElementById('res-iva');   if (ri) ri.textContent = '- $' + iva.toLocaleString('es-CL');
  const rn = document.getElementById('res-neto');  if (rn) rn.textContent = '$' + neto.toLocaleString('es-CL');

  const pc = document.getElementById('preview-cuentas');
  if (!pc) return;
  pc.innerHTML = '';
  getCuentas().forEach(cu => {
    const m = Math.round(neto * cu.pct / 100);
    const d = document.createElement('div');
    d.className = 'preview-row';
    d.style.borderLeft = `3px solid ${cu.color}`;
    d.innerHTML = `<div><div style="font-size:12px;font-weight:500">${cu.nombre}</div><div style="font-size:10px;color:var(--text-muted)">${cu.pct}% del neto</div></div><div style="font-size:13px;font-weight:500">$${m.toLocaleString('es-CL')}</div>`;
    pc.appendChild(d);
  });
}

function guardarCuentas() {
  const cuentas = getCuentas();
  const total = cuentas.reduce((s, c) => s + (parseFloat(c.pct) || 0), 0);
  if (Math.abs(total - 100) > 0.1) {
    APP.toast.show('⚠️ La distribución debe sumar 100%. Actual: ' + Math.round(total * 10) / 10 + '%', 'warning');
    return;
  }
  const bar = document.getElementById('total-bar');
  if (bar) bar.innerHTML = '<span style="font-size:12px;font-weight:500;color:var(--text-success)">✓ Configuración guardada correctamente</span>';
  setTimeout(() => { actualizarTotal(); }, 2500);
}

// ═══════════════════════════════════════════════════════════════════
// LIBROS CONTABLES
// ═══════════════════════════════════════════════════════════════════

function finLibrosSetTab(tabName) {
  document.querySelectorAll('#pg-finanzas [id^="fin-libros-"]').forEach(el => el.style.display = 'none');
  document.getElementById('fin-libros-' + tabName).style.display = 'block';
  const btns = document.querySelectorAll('#pg-finanzas .tab-btn');
  btns.forEach(b => b.classList.remove('active'));
  const idx = ['compras','ventas','resumen'].indexOf(tabName);
  if (idx >= 0 && btns[idx]) btns[idx].classList.add('active');
  if (tabName === 'compras') finRenderLibroCompras();
  if (tabName === 'ventas') finRenderLibroVentas();
  if (tabName === 'resumen') finRenderResumenIVA();
}

function finRenderLibroCompras() {
  const flujo = APP.lsGet('finanzas_libro_compras') || [];
  const tabla = document.getElementById('fin-compras-tabla');
  if (!tabla) return;
  tabla.innerHTML = '';
  if (!flujo.length) { tabla.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:16px;color:var(--text-muted)">Sin facturas registradas.</td></tr>'; return; }
  flujo.forEach(factura => {
    const estadoColor = factura.estado === 'Pagado' ? 'var(--text-success)' : 'var(--text-warning)';
    tabla.innerHTML +=
      '<tr style="border-bottom:1px solid var(--border)">' +
        '<td style="padding:8px">' + factura.fecha + '</td>' +
        '<td style="padding:8px">' + factura.proveedor + '</td>' +
        '<td style="padding:8px">' + factura.rut + '</td>' +
        '<td style="padding:8px">' + factura.numero_factura + '</td>' +
        '<td style="padding:8px;text-align:right">$' + factura.neto.toLocaleString('es-CL') + ' CLP</td>' +
        '<td style="padding:8px;text-align:right">$' + factura.iva.toLocaleString('es-CL') + ' CLP</td>' +
        '<td style="padding:8px;text-align:right">$' + (factura.neto + factura.iva).toLocaleString('es-CL') + ' CLP</td>' +
        '<td style="padding:8px;text-align:center;color:' + estadoColor + '">' + factura.estado + '</td>' +
        '<td style="padding:8px;text-align:center"><button onclick="finEliminarFactura(\'compras\',\'' + factura.id + '\')" style="background:none;border:none;color:var(--text-danger);cursor:pointer;font-size:14px">✕</button></td>' +
      '</tr>';
  });
}

function finRenderLibroVentas() {
  const flujo = APP.lsGet('finanzas_flujo_caja') || [];
  const tabla = document.getElementById('fin-ventas-tabla');
  if (!tabla) return;
  tabla.innerHTML = '';
  const ventas = flujo.filter(m => m.categoria === 'IVA débito fiscal' && m.tipo === 'ingreso');
  if (!ventas.length) { tabla.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--text-muted)">Sin ventas registradas.</td></tr>'; return; }
  ventas.forEach(venta => {
    const bruto = Math.round(venta.monto / 0.19);
    const neto  = bruto - venta.monto;
    tabla.innerHTML +=
      '<tr style="border-bottom:1px solid var(--border)">' +
        '<td style="padding:8px">' + venta.fecha + '</td>' +
        '<td style="padding:8px">' + (venta.ot_id || '-') + '</td>' +
        '<td style="padding:8px">' + (venta.cliente || '-') + '</td>' +
        '<td style="padding:8px;text-align:right">$' + bruto.toLocaleString('es-CL') + ' CLP</td>' +
        '<td style="padding:8px;text-align:right">$' + venta.monto.toLocaleString('es-CL') + ' CLP</td>' +
        '<td style="padding:8px;text-align:right">$' + neto.toLocaleString('es-CL') + ' CLP</td>' +
        '<td style="padding:8px">' + (venta.metodo_pago || '-') + '</td>' +
      '</tr>';
  });
}

function finRenderResumenIVA() {
  const flujo   = APP.lsGet('finanzas_flujo_caja') || [];
  const compras = APP.lsGet('finanzas_libro_compras') || [];
  const debito  = flujo.filter(m => m.categoria === 'IVA débito fiscal').reduce((sum, m) => sum + (m.monto || 0), 0);
  const credito = compras.reduce((sum, f) => sum + (f.iva || 0), 0);
  const pagar   = debito - credito;
  document.getElementById('fin-resumen-debito').textContent  = '$' + debito.toLocaleString('es-CL') + ' CLP';
  document.getElementById('fin-resumen-credito').textContent = '$' + credito.toLocaleString('es-CL') + ' CLP';
  document.getElementById('fin-resumen-pagar').textContent   = '$' + pagar.toLocaleString('es-CL') + ' CLP';
}

function finAbrirModalFactura() {
  APP.modal.custom(
    'Agregar factura de compra',
    '<div class="fg"><label>Proveedor</label><input id="fin-modal-prov" placeholder="Nombre proveedor"></div>' +
    '<div class="fg"><label>RUT</label><input id="fin-modal-rut" placeholder="12.345.678-9"></div>' +
    '<div class="g2"><div class="fg"><label>N° Factura</label><input id="fin-modal-nfactura" placeholder="F-"></div>' +
    '<div class="fg"><label>Fecha emisión</label><input id="fin-modal-fecha" type="date"></div></div>' +
    '<div class="fg"><label>Neto CLP</label><input id="fin-modal-neto" type="number" placeholder="0" style="font-family:var(--font-mono)"></div>',
    function() {
      const proveedor = document.getElementById('fin-modal-prov')?.value?.trim();
      const rut = document.getElementById('fin-modal-rut')?.value?.trim();
      const nfactura = document.getElementById('fin-modal-nfactura')?.value?.trim();
      const fecha = document.getElementById('fin-modal-fecha')?.value;
      const neto = parseFloat(document.getElementById('fin-modal-neto')?.value) || 0;
      if (!proveedor || !rut || !nfactura || !fecha || !neto) { APP.toast.show('Completa todos los campos.', 'warning'); return; }
      const lista = APP.lsGet('finanzas_libro_compras') || [];
      lista.push({
        id: 'fc_' + Date.now(), proveedor, rut, numero_factura: nfactura, fecha,
        neto, iva: Math.round(neto * 0.19), estado: 'Pendiente'
      });
      APP.lsSet('finanzas_libro_compras', lista);
      finRenderLibroCompras();
      APP.toast.show('Factura registrada.');
    },
    'Guardar', 'Cancelar'
  );
}

function finAbrirModalMovimiento() {
  APP.modal.custom(
    'Agregar movimiento manual',
    '<div class="g2"><div class="fg"><label>Fecha</label><input id="fin-modal-mov-fecha" type="date"></div>' +
    '<div class="fg"><label>Tipo</label><select id="fin-modal-mov-tipo" style="width:100%"><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select></div></div>' +
    '<div class="fg"><label>Descripción</label><input id="fin-modal-mov-desc" placeholder="Ej: Venta repuesto motor"></div>' +
    '<div class="fg"><label>Categoría</label><input id="fin-modal-mov-cat" placeholder="Ej: IVA débito fiscal"></div>' +
    '<div class="fg"><label>Monto CLP</label><input id="fin-modal-mov-monto" type="number" placeholder="0" style="font-family:var(--font-mono)"></div>',
    function() {
      const fecha = document.getElementById('fin-modal-mov-fecha')?.value;
      const tipo = document.getElementById('fin-modal-mov-tipo')?.value;
      const desc = document.getElementById('fin-modal-mov-desc')?.value?.trim();
      const cat = document.getElementById('fin-modal-mov-cat')?.value?.trim();
      const monto = parseFloat(document.getElementById('fin-modal-mov-monto')?.value) || 0;
      if (!fecha || !desc || !cat || !monto) { APP.toast.show('Completa todos los campos.', 'warning'); return; }
      const lista = APP.lsGet('finanzas_flujo_caja') || [];
      lista.push({
        id: 'mov_' + Date.now(), fecha, tipo, descripcion: desc, categoria: cat, monto
      });
      APP.lsSet('finanzas_flujo_caja', lista);
      finRenderFlujoCaja();
      APP.toast.show('Movimiento registrado.');
    },
    'Guardar', 'Cancelar'
  );
}

function finAbrirModalFacturaProveedor() {
  APP.modal.custom(
    'Registrar factura proveedor',
    '<div class="fg"><label>Proveedor</label><input id="fin-prov-modal-prov" placeholder="Nombre proveedor"></div>' +
    '<div class="g2"><div class="fg"><label>N° Factura</label><input id="fin-prov-modal-nfactura" placeholder="F-"></div>' +
    '<div class="fg"><label>Fecha emisión</label><input id="fin-prov-modal-fecha" type="date"></div></div>' +
    '<div class="g2"><div class="fg"><label>Neto CLP</label><input id="fin-prov-modal-neto" type="number" placeholder="0" style="font-family:var(--font-mono)"></div>' +
    '<div class="fg"><label>Fecha vencimiento</label><input id="fin-prov-modal-venc" type="date"></div></div>',
    function() {
      const proveedor = document.getElementById('fin-prov-modal-prov')?.value?.trim();
      const nfactura = document.getElementById('fin-prov-modal-nfactura')?.value?.trim();
      const fecha = document.getElementById('fin-prov-modal-fecha')?.value;
      const neto = parseFloat(document.getElementById('fin-prov-modal-neto')?.value) || 0;
      const venc = document.getElementById('fin-prov-modal-venc')?.value;
      if (!proveedor || !nfactura || !fecha || !neto || !venc) { APP.toast.show('Completa todos los campos.', 'warning'); return; }
      const lista = APP.lsGet('finanzas_proveedores') || [];
      lista.push({
        id: 'prov_' + Date.now(), proveedor, numero_factura: nfactura, fecha,
        neto, iva: Math.round(neto * 0.19), fecha_vencimiento: venc, estado: 'Pendiente'
      });
      APP.lsSet('finanzas_proveedores', lista);
      finRenderProveedores();
      APP.toast.show('Factura registrada.');
    },
    'Guardar', 'Cancelar'
  );
}

function finAbrirModalGasto() {
  APP.modal.custom(
    'Agregar gasto general',
    '<div class="g2"><div class="fg"><label>Fecha</label><input id="fin-gasto-modal-fecha" type="date"></div>' +
    '<div class="fg"><label>Monto CLP</label><input id="fin-gasto-modal-monto" type="number" placeholder="0" style="font-family:var(--font-mono)"></div></div>' +
    '<div class="fg"><label>Descripción</label><input id="fin-gasto-modal-desc" placeholder="Ej: Arriendo local"></div>' +
    '<div class="g2"><div class="fg"><label>Categoría</label><input id="fin-gasto-modal-cat" placeholder="Ej: Arriendo"></div>' +
    '<div class="fg"><label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px"><input id="fin-gasto-modal-rec" type="checkbox"> Gasto recurrente</label></div></div>' +
    '<div class="fg" id="fin-gasto-frec-wrap" style="display:none"><label>Frecuencia</label><select id="fin-gasto-modal-frec" style="width:100%"><option value="mensual">Mensual</option><option value="trimestral">Trimestral</option><option value="anual">Anual</option></select></div>',
    function() {
      const fecha = document.getElementById('fin-gasto-modal-fecha')?.value;
      const monto = parseFloat(document.getElementById('fin-gasto-modal-monto')?.value) || 0;
      const desc = document.getElementById('fin-gasto-modal-desc')?.value?.trim();
      const cat = document.getElementById('fin-gasto-modal-cat')?.value?.trim();
      const rec = document.getElementById('fin-gasto-modal-rec')?.checked || false;
      const frec = rec ? (document.getElementById('fin-gasto-modal-frec')?.value || 'mensual') : '';
      if (!fecha || !monto || !desc || !cat) { APP.toast.show('Completa todos los campos.', 'warning'); return; }
      const lista = APP.lsGet('finanzas_gastos') || [];
      lista.push({ id: 'gasto_' + Date.now(), fecha, monto, descripcion: desc, categoria: cat, recurrente: rec, frecuencia: frec });
      APP.lsSet('finanzas_gastos', lista);
      finRenderGastos();
      APP.toast.show('Gasto registrado.');
    },
    'Guardar', 'Cancelar'
  );
  document.getElementById('fin-gasto-modal-rec')?.addEventListener('change', function() {
    document.getElementById('fin-gasto-frec-wrap').style.display = this.checked ? 'block' : 'none';
  });
}

// ═══════════════════════════════════════════════════════════════════
// FLUJO DE CAJA
// ═══════════════════════════════════════════════════════════════════

function finRenderFlujoCaja() {
  const flujo = APP.lsGet('finanzas_flujo_caja') || [];
  const tabla = document.getElementById('fin-flujo-tabla');
  if (!tabla) return;
  tabla.innerHTML = '';
  let totalIngresos = 0, totalEgresos = 0;
  if (!flujo.length) { tabla.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--text-muted)">Sin movimientos registrados.</td></tr>'; return; }
  flujo.forEach(mov => {
    const color = mov.tipo === 'ingreso' ? 'var(--text-success)' : 'var(--text-danger)';
    const signo = mov.tipo === 'ingreso' ? '+' : '-';
    totalIngresos += mov.tipo === 'ingreso' ? mov.monto : 0;
    totalEgresos  += mov.tipo === 'egreso' ? mov.monto : 0;
    tabla.innerHTML +=
      '<tr style="border-bottom:1px solid var(--border)">' +
        '<td style="padding:8px">' + mov.fecha + '</td>' +
        '<td style="padding:8px">' + mov.descripcion + '</td>' +
        '<td style="padding:8px">' + mov.categoria + '</td>' +
        '<td style="padding:8px;text-align:center;color:' + color + '">' + mov.tipo + '</td>' +
        '<td style="padding:8px;text-align:right;color:' + color + '">' + signo + '$' + mov.monto.toLocaleString('es-CL') + ' CLP</td>' +
        '<td style="padding:8px;text-align:center"><button onclick="finEliminarMovimiento(\'' + mov.id + '\')" style="background:none;border:none;color:var(--text-danger);cursor:pointer;font-size:14px">✕</button></td>' +
      '</tr>';
  });
  const saldo = totalIngresos - totalEgresos;
  document.getElementById('fin-flujo-ingresos').textContent = '$' + totalIngresos.toLocaleString('es-CL') + ' CLP';
  document.getElementById('fin-flujo-egresos').textContent  = '$' + totalEgresos.toLocaleString('es-CL') + ' CLP';
  const saldoEl = document.getElementById('fin-flujo-saldo');
  saldoEl.textContent = '$' + saldo.toLocaleString('es-CL') + ' CLP';
  saldoEl.style.color = saldo >= 0 ? 'var(--text-success)' : 'var(--text-danger)';
}

// ═══════════════════════════════════════════════════════════════════
// REMUNERACIONES
// ═══════════════════════════════════════════════════════════════════

function finRenderRemuneraciones() {
  const remuneraciones = APP.lsGet('finanzas_remuneraciones') || [];
  const tabla = document.getElementById('fin-renum-tabla');
  if (!tabla) return;
  tabla.innerHTML = '';
  if (!remuneraciones.length) { tabla.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--text-muted)">Sin registros de remuneraciones.</td></tr>'; return; }
  remuneraciones.forEach(reg => {
    const estadoColor = reg.estado === 'Pagado' ? 'var(--text-success)' : 'var(--text-warning)';
    tabla.innerHTML +=
      '<tr style="border-bottom:1px solid var(--border)">' +
        '<td style="padding:8px">' + reg.nombre_operario + '</td>' +
        '<td style="padding:8px">' + reg.modalidad + '</td>' +
        '<td style="padding:8px;text-align:right">$' + reg.bruto.toLocaleString('es-CL') + ' CLP</td>' +
        '<td style="padding:8px;text-align:right">$' + reg.descuentos.toLocaleString('es-CL') + ' CLP</td>' +
        '<td style="padding:8px;text-align:right">$' + reg.a_pagar.toLocaleString('es-CL') + ' CLP</td>' +
        '<td style="padding:8px;text-align:center;color:' + estadoColor + '">' + reg.estado + '</td>' +
        '<td style="padding:8px;text-align:center">' + (reg.estado === 'Pendiente' ? '<button class="btn" style="font-size:10px;padding:3px 8px" onclick="finMarcarPagadoRemuneracion(\'' + reg.id + '\')">Pagar</button>' : '-') + '</td>' +
      '</tr>';
  });
}

// ═══════════════════════════════════════════════════════════════════
// PROVEEDORES
// ═══════════════════════════════════════════════════════════════════

function finRenderProveedores() {
  const proveedores = APP.lsGet('finanzas_proveedores') || [];
  const tabla = document.getElementById('fin-prov-tabla');
  if (!tabla) return;
  tabla.innerHTML = '';
  if (!proveedores.length) { tabla.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--text-muted)">Sin proveedores registrados.</td></tr>'; return; }
  const hoy = new Date();
  proveedores.forEach(prov => {
    const vencimiento = new Date(prov.fecha_vencimiento);
    let estado = 'Pendiente', estadoColor = 'var(--text-muted)';
    if (prov.estado === 'Pagado') { estado = 'Pagado'; estadoColor = 'var(--text-success)'; }
    else if (vencimiento < hoy) { estado = 'Vencido'; estadoColor = 'var(--text-danger)'; }
    else if ((vencimiento - hoy) / (1000 * 60 * 60 * 24) <= 7) { estado = 'Por vencer'; estadoColor = 'var(--text-warning)'; }
    tabla.innerHTML +=
      '<tr style="border-bottom:1px solid var(--border)">' +
        '<td style="padding:8px">' + prov.fecha + '</td>' +
        '<td style="padding:8px">' + prov.proveedor + '</td>' +
        '<td style="padding:8px">' + prov.numero_factura + '</td>' +
        '<td style="padding:8px;text-align:right">$' + (prov.neto + prov.iva).toLocaleString('es-CL') + ' CLP</td>' +
        '<td style="padding:8px">' + prov.fecha_vencimiento + '</td>' +
        '<td style="padding:8px;text-align:center;color:' + estadoColor + '">' + estado + '</td>' +
        '<td style="padding:8px;text-align:center">' + (prov.estado !== 'Pagado' ? '<button class="btn" style="font-size:10px;padding:3px 8px" onclick="finMarcarPagadoProveedor(\'' + prov.id + '\')">Pagar</button>' : '-') + '</td>' +
      '</tr>';
  });
}

// ═══════════════════════════════════════════════════════════════════
// GASTOS
// ═══════════════════════════════════════════════════════════════════

function finRenderGastos() {
  const gastos = APP.lsGet('finanzas_gastos') || [];
  const tabla = document.getElementById('fin-gastos-tabla');
  if (!tabla) return;
  tabla.innerHTML = '';
  if (!gastos.length) { tabla.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--text-muted)">Sin gastos registrados.</td></tr>'; return; }
  gastos.forEach(gasto => {
    const recurrente = gasto.recurrente ? '✓ ' + gasto.frecuencia : '-';
    tabla.innerHTML +=
      '<tr style="border-bottom:1px solid var(--border)">' +
        '<td style="padding:8px">' + gasto.fecha + '</td>' +
        '<td style="padding:8px">' + gasto.descripcion + '</td>' +
        '<td style="padding:8px">' + gasto.categoria + '</td>' +
        '<td style="padding:8px;text-align:right">$' + gasto.monto.toLocaleString('es-CL') + ' CLP</td>' +
        '<td style="padding:8px;text-align:center">' + recurrente + '</td>' +
        '<td style="padding:8px;text-align:center"><button onclick="finEliminarGasto(\'' + gasto.id + '\')" style="background:none;border:none;color:var(--text-danger);cursor:pointer;font-size:14px">✕</button></td>' +
      '</tr>';
  });
}

// ═══════════════════════════════════════════════════════════════════
// UTILITARIAS
// ═══════════════════════════════════════════════════════════════════

function finEliminarFactura(tipo, id) {
  APP.modal.confirmar('¿Eliminar esta factura?', () => {
    let lista = APP.lsGet('finanzas_libro_compras') || [];
    lista = lista.filter(f => f.id !== id);
    APP.lsSet('finanzas_libro_compras', lista);
    finRenderLibroCompras();
  }, 'Eliminar', 'Cancelar');
}

function finEliminarMovimiento(id) {
  APP.modal.confirmar('¿Eliminar este movimiento?', () => {
    let lista = APP.lsGet('finanzas_flujo_caja') || [];
    lista = lista.filter(m => m.id !== id);
    APP.lsSet('finanzas_flujo_caja', lista);
    finRenderFlujoCaja();
  }, 'Eliminar', 'Cancelar');
}

function finEliminarGasto(id) {
  APP.modal.confirmar('¿Eliminar este gasto?', () => {
    let lista = APP.lsGet('finanzas_gastos') || [];
    lista = lista.filter(g => g.id !== id);
    APP.lsSet('finanzas_gastos', lista);
    finRenderGastos();
  }, 'Eliminar', 'Cancelar');
}

function finMarcarPagadoRemuneracion(id) {
  let lista = APP.lsGet('finanzas_remuneraciones') || [];
  const reg = lista.find(r => r.id === id);
  if (reg) {
    reg.estado = 'Pagado';
    reg.fecha_pago = new Date().toISOString().split('T')[0];
    APP.lsSet('finanzas_remuneraciones', lista);
    finRenderRemuneraciones();
  }
}

function finMarcarPagadoProveedor(id) {
  let lista = APP.lsGet('finanzas_proveedores') || [];
  const prov = lista.find(p => p.id === id);
  if (prov) {
    prov.estado = 'Pagado';
    prov.fecha_pago = new Date().toISOString().split('T')[0];
    APP.lsSet('finanzas_proveedores', lista);
    finRenderProveedores();
  }
}
