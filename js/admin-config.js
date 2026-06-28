// ===== MÓDULO: ADMIN — CONFIGURACIÓN DE PLANTILLAS WHATSAPP =====

const _ACFG_PLANTILLAS_DEFAULT = {
  confirmar_cita:    `Hola [Cliente] 👋\nTe confirmamos tu cita en [Taller]:\n📅 [Fecha] a las [Hora]\n🚗 [Marca] [Modelo]\n¡Te esperamos! 🔧`,
  vehiculo_recibido: `Hola [Cliente] 👋\nRecibimos tu [Marca] [Modelo]\nplaca [Patente] en [Taller].\nYa estamos trabajando en él ✅\nTe avisaremos cuando tengamos novedades.`,
  cotizacion_lista:  `Hola [Cliente] 🔧\nLa cotización de tu [Marca] [Modelo]\nestá lista. Total: $[Monto]\nRevisa y aprueba aquí: [Link]\n¡Cualquier duda estamos disponibles!`,
  vehiculo_listo:    `Hola [Cliente] 🎉\nTu [Marca] [Modelo] placa [Patente]\nestá listo para retirar en [Taller].\n¡Te esperamos cuando puedas! 🚗✨`,
  recordatorio_pago: `Hola [Cliente] 👋\nTe recordamos que tienes un pago\npendiente de $[Monto] por [Servicio]\nen [Taller].\nPor favor contáctanos para coordinarlo.`,
  encuesta:          `Hola [Cliente] 😊\nGracias por confiar en [Taller].\n¿Cómo calificarías nuestro servicio?\n1⭐ 2⭐ 3⭐ 4⭐ 5⭐\nTu opinión nos ayuda a mejorar 🙏`,
};

const _ACFG_PLANTILLAS_META = [
  { key: 'confirmar_cita',    label: '📅 Confirmar cita' },
  { key: 'vehiculo_recibido', label: '🔧 Vehículo recibido' },
  { key: 'cotizacion_lista',  label: '💰 Cotización lista' },
  { key: 'vehiculo_listo',    label: '✅ Vehículo listo' },
  { key: 'recordatorio_pago', label: '⏳ Recordatorio pago' },
  { key: 'encuesta',          label: '😊 Encuesta' },
];

const _ACFG_VARIABLES = [
  '[Cliente]','[Patente]','[Marca]','[Modelo]',
  '[Fecha]','[Hora]','[Monto]','[Servicio]','[Taller]','[Link]',
];

// ---- Renderizar sección de plantillas ----
function acfgRenderPlantillas() {
  const wrap = document.getElementById('acfg-plantillas-wrap');
  if (!wrap) return;

  const config    = APP.lsGet('mp_config') || {};
  const guardadas = config.plantillas_whatsapp || {};

  const chips = _ACFG_VARIABLES.map(v =>
    `<button class="tag" onclick="acfgInsertarVariable('${v}')" title="Insertar ${v}"
      style="cursor:pointer;font-size:10px;padding:3px 8px;margin:2px;font-family:var(--font-mono)">${v}</button>`
  ).join('');

  wrap.innerHTML = `
    <div style="margin-bottom:12px">
      <div style="font-size:11px;font-weight:500;margin-bottom:6px">Variables disponibles <span style="font-size:10px;color:var(--text-muted)">(click para insertar en la plantilla activa)</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:2px">${chips}</div>
    </div>
    ${_ACFG_PLANTILLAS_META.map(({ key, label }) => {
      const texto = guardadas[key] || _ACFG_PLANTILLAS_DEFAULT[key];
      return `
      <div class="card" style="margin-bottom:10px">
        <div class="ch" style="margin-bottom:8px">
          <span class="ct" style="font-size:12px">${label}</span>
          <button class="btn" onclick="acfgRestablecerPlantilla('${key}')" style="font-size:10px">↺ Restablecer</button>
        </div>
        <textarea id="acfg-ta-${key}" rows="5"
          style="width:100%;font-size:12px;line-height:1.55;resize:vertical"
          onfocus="acfgSetActiva('${key}')">${_escHtml(texto)}</textarea>
      </div>`;
    }).join('')}
    <button class="btn bpa" onclick="acfgGuardarPlantillas()" style="width:100%;justify-content:center;margin-top:4px">
      <i class="ti ti-device-floppy"></i> 💾 Guardar plantillas
    </button>
  `;
}

let _acfgKeyActiva = null;

function acfgSetActiva(key) {
  _acfgKeyActiva = key;
}

function acfgInsertarVariable(variable) {
  const key = _acfgKeyActiva || _ACFG_PLANTILLAS_META[0].key;
  const ta  = document.getElementById(`acfg-ta-${key}`);
  if (!ta) return;
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  const val   = ta.value;
  ta.value = val.slice(0, start) + variable + val.slice(end);
  ta.selectionStart = ta.selectionEnd = start + variable.length;
  ta.focus();
}

function acfgRestablecerPlantilla(key) {
  const ta = document.getElementById(`acfg-ta-${key}`);
  if (!ta) return;
  if (!confirm('¿Restablecer esta plantilla al texto original?')) return;
  ta.value = _ACFG_PLANTILLAS_DEFAULT[key] || '';
  APP.toast.show('Plantilla restablecida', 'success');
}

function acfgGuardarPlantillas() {
  const config = APP.lsGet('mp_config') || {};
  const plantillas = {};
  _ACFG_PLANTILLAS_META.forEach(({ key }) => {
    const ta = document.getElementById(`acfg-ta-${key}`);
    plantillas[key] = ta ? ta.value : (_ACFG_PLANTILLAS_DEFAULT[key] || '');
  });
  config.plantillas_whatsapp = plantillas;
  APP.lsSet('mp_config', config);
  APP.toast.show('✅ Plantillas guardadas', 'success');
}

function _escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ---- Auto-inicializar: parchea init_admin para renderizar plantillas al cargar Admin ----
(function _setupAcfgPatch() {
  function _tryPatch() {
    if (typeof window.init_admin === 'function') {
      const orig = window.init_admin;
      window.init_admin = function() {
        orig.apply(this, arguments);
        acfgRenderPlantillas();
      };
    } else {
      setTimeout(_tryPatch, 100);
    }
  }
  _tryPatch();
})();
