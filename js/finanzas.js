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
  finRenderDashboard();
}

function finRenderDashboard() {
  if (APP.lsGet('usuario_rol') !== 'Administrador') {
    document.getElementById('fin-tab-dashboard').innerHTML = '<p style="padding:24px;color:var(--text-danger);font-size:13px">⛔ Acceso denegado. Solo usuarios con perfil Administrador pueden ver este panel.</p>';
    return;
  }

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
