// js/ot-modal.js — Modal flotante por fase para OTs
// Campo names (consistentes en Partes 1-6):
//   ot.estadoTrabajo  → 'taller' | 'espera'
//   ot.motivoEspera   → string (id motivo del catálogo)
//   ot.detalleEspera  → string (texto libre)
//   ot.espera_desde   → ISO string (timestamp inicio espera)
(function () {
  'use strict';

  // ─── Fases ───────────────────────────────────────────────────────────────
  var FASES = ['recepcion','diagnostico','repuestos','reparacion','cotizacion','pago','entrega'];
  var FASES_LABEL = {
    recepcion:'Recepción', diagnostico:'Diagnóstico', repuestos:'Repuestos',
    reparacion:'Reparación', cotizacion:'Cotización',
    pago:'Pago', entrega:'Entrega', cancelada:'Cancelada'
  };

  // ─── Campos por fase ─────────────────────────────────────────────────────
  var CAMPOS_FASE = {
    recepcion: [
      { k:'cliente_nombre',      l:'Nombre',            t:'text'   },
      { k:'cliente_apellido',    l:'Apellido',          t:'text'   },
      { k:'cliente_rut',         l:'RUT cliente',       t:'text'   },
      { k:'cliente_whatsapp',    l:'WhatsApp',          t:'tel'    },
      { k:'vehiculo_patente',    l:'Patente',           t:'text',  upper:true },
      { k:'vehiculo_marca',      l:'Marca',             t:'text'   },
      { k:'vehiculo_modelo',     l:'Modelo',            t:'text'   },
      { k:'vehiculo_anio',       l:'Año',               t:'number' },
      { k:'vehiculo_color',      l:'Color',             t:'text'   },
      { k:'vehiculo_km_entrada', l:'Km entrada',        t:'number' },
      { k:'vehiculo_motor',      l:'N° Motor',          t:'text'   },
      { k:'motivo_ingreso',      l:'Motivo de ingreso', t:'area'   },
      { k:'sintomas',            l:'Síntomas',          t:'area'   },
    ],
    diagnostico: [
      { k:'tecnico_asignado', l:'Técnico asignado', t:'text' },
      { k:'diagnostico',      l:'Diagnóstico',      t:'area' },
      { k:'sintomas',         l:'Síntomas (ref.)',  t:'area' },
    ],
    repuestos: [
      // TODO futuro: estructurar repuestos_notas con precios (igual que cotizacion.repuestos)
      //              para poder incluirlos en el cálculo automático del monto de Pago.
      { k:'repuestos_notas', l:'Repuestos y materiales', t:'area',
        hint:'Lista libre; el detalle estructurado se gestiona en la sección Repuestos' },
      { k:'diagnostico',     l:'Diagnóstico (ref.)',      t:'area', ro:true },
    ],
    reparacion: [
      { k:'tecnico_asignado',  l:'Técnico asignado',  t:'text' },
      { k:'trabajo_realizado', l:'Trabajo realizado',  t:'area' },
      { k:'observaciones',     l:'Observaciones',      t:'area' },
    ],
    control: [
      { k:'vehiculo_km_salida', l:'Km salida',                    t:'number' },
      { k:'resultado_control',  l:'Resultado control de calidad',  t:'area'   },
    ],
    cotizacion: [
      { k:'cotizacion_nota',  l:'Notas para cotización', t:'area'   },
      { k:'cotizacion_monto', l:'Monto estimado ($)',    t:'number' },
    ],
    pago: [
      { k:'pago_metodo',     l:'Método de pago',    t:'select', opts:['Efectivo','Transferencia','Débito','Crédito','Otro'] },
      { k:'pago_monto',      l:'Monto ($)',          t:'number', hint:'Auto-calculado de mano de obra + repuestos cotizados. Puedes ajustarlo.' },
      { k:'pago_referencia', l:'N° comprobante',     t:'text'   },
    ],
    entrega: [
      { k:'vehiculo_km_salida',    l:'Km salida',             t:'number' },
      { k:'observaciones_entrega', l:'Observaciones entrega', t:'area'   },
    ],
  };

  // ─── Estado interno ───────────────────────────────────────────────────────
  var _otId       = null;
  var _vistaFase  = null;
  var _pendFase   = null;
  var _pendOps    = null;

  // ─── Render bloque estado de trabajo/espera ───────────────────────────────
  function _renderEspera(ot) {
    var enEspera = (ot.estadoTrabajo === 'espera');
    var bs = 'width:100%;padding:7px 10px;border:0.5px solid var(--border);border-radius:6px;font-size:12px;background:var(--surface-2);color:var(--text-primary);box-sizing:border-box;font-family:inherit;outline:none';
    var h = '<div style="background:var(--surface-1);border:0.5px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:14px">';
    h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:' + (enEspera ? '12' : '0') + 'px">';
    h += '<span style="font-size:12px;font-weight:600;color:var(--text-primary);flex:1">Estado del trabajo</span>';
    h += '<div style="display:flex;gap:4px">';
    h += '<button onclick="window._otm_setEspera(\'taller\')" style="padding:4px 12px;border-radius:12px;font-size:11px;font-weight:600;cursor:pointer;border:1.5px solid;transition:all .1s;' +
      (!enEspera ? 'background:#22c55e;color:#fff;border-color:#22c55e' : 'background:transparent;color:var(--text-muted);border-color:var(--border)') +
      '"><i class="ti ti-tool"></i> En taller</button>';
    h += '<button onclick="window._otm_setEspera(\'espera\')" style="padding:4px 12px;border-radius:12px;font-size:11px;font-weight:600;cursor:pointer;border:1.5px solid;transition:all .1s;' +
      (enEspera ? 'background:#f59e0b;color:#fff;border-color:#f59e0b' : 'background:transparent;color:var(--text-muted);border-color:var(--border)') +
      '"><i class="ti ti-clock-pause"></i> En espera</button>';
    h += '</div></div>';

    if (enEspera) {
      var motivos = APP.lsGet('mp_motivos_espera') || [];
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';

      // Motivo dropdown
      h += '<div><label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:4px">Motivo de espera</label>';
      h += '<select id="otm-espera-motivo" onchange="window._otm_blurEspera(\'motivoEspera\',this.value)" style="' + bs + ';cursor:pointer">';
      h += '<option value="">— Sin especificar —</option>';
      if (motivos.length) {
        motivos.forEach(function(m) {
          var id    = (typeof m === 'object') ? (m.id || m.nombre || '') : String(m);
          var label = (typeof m === 'object') ? (m.nombre || m.label || id) : String(m);
          h += '<option value="' + _esc(id) + '"' + (ot.motivoEspera === id ? ' selected' : '') + '>' + _esc(label) + '</option>';
        });
      } else if (ot.motivoEspera) {
        h += '<option value="' + _esc(ot.motivoEspera) + '" selected>' + _esc(ot.motivoEspera) + '</option>';
      }
      h += '</select></div>';

      // Desde (read-only display)
      var desde = ot.espera_desde
        ? new Date(ot.espera_desde).toLocaleString('es-CL', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})
        : '—';
      h += '<div><label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:4px">En espera desde</label>';
      h += '<div style="padding:7px 10px;border:0.5px solid var(--border);border-radius:6px;font-size:12px;color:var(--text-secondary);background:var(--surface-1)">' + _esc(desde) + '</div></div>';

      // Detalle full width
      h += '<div style="grid-column:1/-1"><label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:4px">Detalle / nota de espera</label>';
      h += '<textarea id="otm-espera-detalle" onblur="window._otm_blurEspera(\'detalleEspera\',this.value)" style="' + bs + ';resize:vertical;min-height:52px">' + _esc(String(ot.detalleEspera || '')) + '</textarea></div>';

      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  // ─── Toggle estado espera ─────────────────────────────────────────────────
  function _setEspera(estado) {
    if (!_otId) return;
    var ots = APP.lsGet('ots') || [];
    var ot = ots.find(function(o){ return o.id === _otId; });
    if (!ot || ot.estadoTrabajo === estado) return;
    ot.estadoTrabajo = estado;
    if (estado === 'espera' && !ot.espera_desde) ot.espera_desde = new Date().toISOString();
    APP.lsSet('ots', ots);
    _render();
  }

  // ─── Guardar campo de espera on blur ─────────────────────────────────────
  function _blurEspera(field, value) {
    if (!_otId) return;
    var ots = APP.lsGet('ots') || [];
    var ot = ots.find(function(o){ return o.id === _otId; });
    if (!ot) return;
    ot[field] = value;
    APP.lsSet('ots', ots);
    var elId = field === 'motivoEspera' ? 'otm-espera-motivo' : 'otm-espera-detalle';
    var el = document.getElementById(elId);
    if (el) { el.style.borderColor = '#22c55e'; setTimeout(function(){ el.style.borderColor = ''; }, 1000); }
  }

  // ─── Leer campo (incl. anidados y aliases) ────────────────────────────────
  function _get(ot, k) {
    if (k === 'pago_metodo')     return (ot.pago && ot.pago.metodo)     || '';
    if (k === 'pago_monto') {
      if (ot.pago && ot.pago.monto != null) return ot.pago.monto;
      // Auto-calcular desde fuentes estructuradas
      var _cot  = ot.cotizacion || {};
      var _mo   = (_cot.mano_obra || 0);
      var _svcs = (ot.serviciosItems || []).reduce(function(s, it) { return s + (parseInt(it.valor) || 0); }, 0);
      var _mots = (ot.motivos || []).reduce(function(s, m) { return s + (parseInt(m.valor_mano_obra) || 0); }, 0);
      var _reps = (Array.isArray(_cot.repuestos) ? _cot.repuestos : [])
                    .reduce(function(s, r) { return s + ((r.cantidad || 0) * (r.precio_unitario || 0)); }, 0);
      var _total = _mo + _svcs + _mots + _reps;
      return _total > 0 ? _total : '';
    }
    if (k === 'pago_referencia') return (ot.pago && ot.pago.referencia) || '';
    if (k === 'vehiculo_patente') return ot.vehiculo_patente || ot.patente || '';
    if (k === 'repuestos_notas') {
      if (ot.repuestos_notas) return ot.repuestos_notas;
      if (typeof ot.repuestos === 'string') return ot.repuestos;
      if (Array.isArray(ot.repuestos)) return ot.repuestos.map(function(r){ return r.nombre || String(r); }).join('\n');
      return '';
    }
    return ot[k] != null ? ot[k] : '';
  }

  // ─── Escribir campo ───────────────────────────────────────────────────────
  function _set(ot, k, v) {
    if (k === 'pago_metodo')     { if (!ot.pago) ot.pago = {}; ot.pago.metodo    = v; return; }
    if (k === 'pago_monto')      { if (!ot.pago) ot.pago = {}; ot.pago.monto     = parseFloat(v) || 0; return; }
    if (k === 'pago_referencia') { if (!ot.pago) ot.pago = {}; ot.pago.referencia = v; return; }
    if (k === 'vehiculo_patente') { ot.vehiculo_patente = v; ot.patente = v; return; }
    ot[k] = v;
  }

  // ─── Guardar campo on blur ────────────────────────────────────────────────
  function _blur(k, v) {
    if (!_otId) return;
    var ots = APP.lsGet('ots') || [];
    var ot = ots.find(function(o){ return o.id === _otId; });
    if (!ot) return;
    if (k === 'vehiculo_patente') v = (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    _set(ot, k, v);
    APP.lsSet('ots', ots);
    var el = document.getElementById('otmc-' + k);
    if (el) { el.style.borderColor = '#22c55e'; setTimeout(function(){ el.style.borderColor = ''; }, 1000); }
  }

  // ─── Escape HTML ──────────────────────────────────────────────────────────
  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ─── Render tabs de fase ──────────────────────────────────────────────────
  function _tabs(fasActual, vista) {
    var h = '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:14px;padding-bottom:12px;border-bottom:0.5px solid var(--border)">';
    FASES.forEach(function(f) {
      var activo = f === fasActual;
      var viendo = f === vista;
      var style = 'padding:4px 10px;border-radius:12px;font-size:10px;font-weight:600;cursor:pointer;border:1.5px solid;transition:all .1s;';
      if (activo && viendo) style += 'background:var(--fill-accent);color:#fff;border-color:var(--fill-accent)';
      else if (viendo)      style += 'background:var(--surface-1);color:var(--text-primary);border-color:var(--fill-accent)';
      else if (activo)      style += 'background:var(--bg-accent);color:var(--text-accent);border-color:var(--border-accent)';
      else                  style += 'background:transparent;color:var(--text-muted);border-color:var(--border)';
      h += '<button onclick="window._otm_irFase(\'' + f + '\')" style="' + style + '">' + (FASES_LABEL[f] || f) + '</button>';
    });
    // Tab especial Resumen
    var resStyle = 'padding:4px 10px;border-radius:12px;font-size:10px;font-weight:600;cursor:pointer;border:1.5px solid;transition:all .1s;';
    resStyle += (vista === 'resumen')
      ? 'background:var(--surface-1);color:var(--text-primary);border-color:var(--fill-accent)'
      : 'background:transparent;color:var(--text-muted);border-color:var(--border)';
    h += '<button onclick="window._otm_irFase(\'resumen\')" style="' + resStyle + '"><i class="ti ti-list-details" style="font-size:10px"></i> Resumen</button>';
    h += '</div>';
    return h;
  }

  // ─── Render vista resumen read-only ──────────────────────────────────────
  function _renderResumen(ot) {
    var rdSty = 'padding:6px 10px;border:0.5px solid var(--border);border-radius:6px;font-size:12px;background:var(--surface-2);color:var(--text-secondary);min-height:28px;word-break:break-word';
    var lbSty = 'font-size:10px;color:var(--text-muted);margin-bottom:3px';
    var h = '';

    FASES.forEach(function(fase) {
      var lista = CAMPOS_FASE[fase] || [];
      if (!lista.length) return;
      var tieneValor = lista.some(function(c){ return !!_get(ot, c.k); });
      if (!tieneValor) return;

      h += '<div style="margin-bottom:18px">';
      h += '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;padding-bottom:4px;border-bottom:0.5px solid var(--border)">' + (FASES_LABEL[fase] || fase) + '</div>';
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
      lista.forEach(function(c) {
        var v = _get(ot, c.k);
        if (!v && v !== 0) return;
        var fw = (c.t === 'area') ? 'grid-column:1/-1' : '';
        h += '<div style="' + fw + '"><div style="' + lbSty + '">' + _esc(c.l) + '</div>';
        h += '<div style="' + rdSty + (c.t === 'area' ? ';white-space:pre-wrap' : '') + '">' + _esc(String(v)) + '</div></div>';
      });
      h += '</div></div>';
    });

    // Estado de espera actual
    if (ot.estadoTrabajo === 'espera') {
      h += '<div style="margin-bottom:18px">';
      h += '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;padding-bottom:4px;border-bottom:0.5px solid var(--border)">Estado actual</div>';
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
      h += '<div><div style="' + lbSty + '">Estado</div><div style="padding:5px 10px;border-radius:6px;font-size:12px;font-weight:600;background:#fef3c7;color:#92400e;border:0.5px solid #f59e0b;display:inline-block"><i class="ti ti-clock-pause" style="font-size:10px"></i> En espera</div></div>';
      if (ot.motivoEspera) h += '<div><div style="' + lbSty + '">Motivo</div><div style="' + rdSty + '">' + _esc(ot.motivoEspera) + '</div></div>';
      if (ot.espera_desde) {
        var d = new Date(ot.espera_desde).toLocaleString('es-CL',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
        h += '<div><div style="' + lbSty + '">En espera desde</div><div style="' + rdSty + '">' + _esc(d) + '</div></div>';
      }
      if (ot.detalleEspera) h += '<div style="grid-column:1/-1"><div style="' + lbSty + '">Detalle</div><div style="' + rdSty + ';white-space:pre-wrap">' + _esc(ot.detalleEspera) + '</div></div>';
      h += '</div></div>';
    }

    // PDF export (cuando se implemente): excluir el bloque historial de abajo —
    //   es trazabilidad interna, no debe aparecer en el documento para el cliente.
    var hist = ot.historial || ot.historial_eventos || [];
    if (hist.length) {
      h += '<div>';
      h += '<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;padding-bottom:4px;border-bottom:0.5px solid var(--border)">Historial</div>';
      h += '<div style="display:flex;flex-direction:column;gap:4px">';
      hist.slice().reverse().forEach(function(ev) {
        var ts = ev.fecha ? new Date(ev.fecha).toLocaleString('es-CL',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
        var dot = ev.evento === 'cambio_fase' ? '#3b82f6' : (ev.evento === 'fin_espera' ? '#22c55e' : (ev.evento === 'datos_omitidos' ? '#f59e0b' : '#6b7280'));
        h += '<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;background:var(--surface-1);border:0.5px solid var(--border);border-radius:6px">';
        h += '<div style="width:8px;height:8px;border-radius:50%;background:' + dot + ';margin-top:4px;flex-shrink:0"></div>';
        h += '<div style="flex:1;min-width:0"><div style="font-size:11px;color:var(--text-primary)">' + _esc(ev.descripcion || ev.evento) + '</div>';
        if (ts) h += '<div style="font-size:10px;color:var(--text-muted);margin-top:2px">' + ts + (ev.usuario_nombre ? ' · ' + _esc(ev.usuario_nombre) : '') + '</div>';
        h += '</div></div>';
      });
      h += '</div></div>';
    }

    if (!h) h = '<p style="font-size:12px;color:var(--text-muted);text-align:center;padding:24px">Sin datos registrados aún.</p>';
    return h;
  }

  // ─── Render campos de la fase en vista ───────────────────────────────────
  function _campos(ot, fase) {
    var lista = CAMPOS_FASE[fase] || [];
    if (!lista.length) return '<p style="font-size:12px;color:var(--text-muted);padding:16px 0;text-align:center">Sin campos específicos para esta fase.</p>';
    var bs = 'width:100%;padding:8px 10px;border:0.5px solid var(--border);border-radius:6px;font-size:12px;background:var(--surface-1);color:var(--text-primary);box-sizing:border-box;font-family:inherit;outline:none;transition:border-color .3s';
    var h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
    lista.forEach(function(c) {
      var v = _get(ot, c.k);
      var id = 'otmc-' + c.k;
      var fw = (c.t === 'area') ? 'grid-column:1/-1' : '';
      h += '<div style="' + fw + '">';
      h += '<label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:4px">' + _esc(c.l);
      if (c.ro) h += ' <em style="font-size:9px;font-style:normal;opacity:.7">(solo lectura)</em>';
      h += '</label>';
      if (c.t === 'area') {
        h += '<textarea id="' + id + '"' +
          (c.ro ? ' readonly' : ' onblur="window._otm_blur(\'' + c.k + '\',this.value)"') +
          ' style="' + bs + ';resize:vertical;min-height:68px' + (c.ro ? ';opacity:.6' : '') + '">' + _esc(String(v)) + '</textarea>';
      } else if (c.t === 'select') {
        h += '<select id="' + id + '" onchange="window._otm_blur(\'' + c.k + '\',this.value)" style="' + bs + ';cursor:pointer"><option value="">— Seleccionar —</option>';
        (c.opts || []).forEach(function(op){ h += '<option value="' + _esc(op) + '"' + (v === op ? ' selected' : '') + '>' + _esc(op) + '</option>'; });
        h += '</select>';
      } else {
        h += '<input type="' + c.t + '" id="' + id + '" value="' + _esc(String(v)) + '"' +
          ' onblur="window._otm_blur(\'' + c.k + '\',this.value)"' +
          (c.upper ? ' oninput="this.value=this.value.toUpperCase()"' : '') +
          ' style="' + bs + '">';
      }
      if (c.hint) h += '<div style="font-size:10px;color:var(--text-muted);margin-top:3px">' + _esc(c.hint) + '</div>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  }

  // ─── Re-render zona de contenido ─────────────────────────────────────────
  function _render() {
    var body = document.getElementById('otm-body');
    if (!body || !_otId) return;
    var ots = APP.lsGet('ots') || [];
    var ot = ots.find(function(o){ return o.id === _otId; });
    if (!ot) return;

    var fasActual = ot.fase || 'recepcion';
    var vista = _vistaFase || fasActual;
    var iActual = FASES.indexOf(fasActual);
    var sig = iActual >= 0 && iActual < FASES.length - 1 ? FASES[iActual + 1] : null;
    var ant = iActual > 0 ? FASES[iActual - 1] : null;

    var html = _tabs(fasActual, vista);

    if (vista === 'resumen') {
      html += _renderResumen(ot);
      html += '<div style="margin-top:14px;padding-top:12px;border-top:0.5px solid var(--border);text-align:center">';
      html += '<button onclick="window._otm_irFase(\'' + fasActual + '\')" style="padding:7px 16px;border:0.5px solid var(--fill-accent);border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;background:transparent;color:var(--fill-accent)">Volver a editar</button>';
      html += '</div>';
    } else {
      html += _renderEspera(ot);

      if (vista !== fasActual) {
        html += '<div style="font-size:11px;color:var(--text-warning);background:var(--bg-warning);border:0.5px solid var(--border-warning);border-radius:6px;padding:6px 10px;margin-bottom:12px">' +
          '<i class="ti ti-eye" style="font-size:12px"></i> Viendo campos de <strong>' + (FASES_LABEL[vista] || vista) +
          '</strong> — la OT está en fase <strong>' + (FASES_LABEL[fasActual] || fasActual) + '</strong></div>';
      }

      html += _campos(ot, vista);

      html += '<div id="otm-err" style="margin-top:8px"></div>';

      // navegación de fase real
      html += '<div style="display:flex;gap:8px;margin-top:16px;padding-top:12px;border-top:0.5px solid var(--border);align-items:center">';
      if (ant) {
        html += '<button onclick="window._otm_cambiarFase(\'' + ant + '\')" style="padding:7px 14px;border:0.5px solid var(--border);border-radius:6px;cursor:pointer;font-size:12px;background:var(--surface-1);color:var(--text-secondary)">' +
          '<i class="ti ti-arrow-left"></i> ' + (FASES_LABEL[ant] || ant) + '</button>';
      }
      html += '<div style="flex:1;text-align:center;font-size:10px;color:var(--text-muted)">Fase actual: <strong>' + (FASES_LABEL[fasActual] || fasActual) + '</strong></div>';
      if (sig) {
        html += '<button onclick="window._otm_cambiarFase(\'' + sig + '\')" style="padding:7px 14px;border:none;border-radius:6px;cursor:pointer;font-size:12px;background:var(--fill-accent);color:#fff;font-weight:600">' +
          (FASES_LABEL[sig] || sig) + ' <i class="ti ti-arrow-right"></i></button>';
      }
      html += '</div>';
    }

    body.innerHTML = html;
  }

  // ─── Cambiar fase real de la OT ──────────────────────────────────────────
  function _cambiarFase(faseDestino) {
    if (!_otId) return;
    var ots = APP.lsGet('ots') || [];
    var ot = ots.find(function(o){ return o.id === _otId; });
    if (!ot) return;

    // Retroceder fase nunca requiere validación de checklist
    var iActual  = FASES.indexOf(ot.fase || 'recepcion');
    var iDestino = FASES.indexOf(faseDestino);
    if (iDestino < iActual) { _doFase(faseDestino, []); return; }

    var check = (typeof getChecklistFase === 'function')
      ? getChecklistFase(ot, faseDestino)
      : { bloqueantes:[], opcionales:[] };

    if (check.bloqueantes.length > 0) {
      _showErr('<i class="ti ti-alert-circle"></i> No es posible avanzar. Faltan: <strong>' + _esc(check.bloqueantes.join(', ')) + '</strong>',
        'var(--bg-danger)', 'var(--border-danger)', 'var(--text-danger)');
      return;
    }

    if (check.opcionales.length > 0) {
      _pendFase = faseDestino;
      _pendOps  = check.opcionales;
      _showConfirmOpc(check.opcionales);
      return;
    }

    _doFase(faseDestino, []);
  }

  function _showErr(msg, bg, border, color) {
    var d = document.getElementById('otm-err');
    if (d) d.innerHTML = '<div style="padding:8px 12px;background:' + bg + ';border:0.5px solid ' + border + ';border-radius:6px;font-size:11px;color:' + color + '">' + msg + '</div>';
  }

  function _showConfirmOpc(ops) {
    var d = document.getElementById('otm-err');
    if (!d) return;
    d.innerHTML =
      '<div style="padding:10px 12px;background:var(--bg-warning);border:0.5px solid var(--border-warning);border-radius:6px;font-size:11px;color:var(--text-warning)">' +
        '<div style="margin-bottom:8px"><i class="ti ti-alert-triangle"></i> Datos opcionales vacíos: <strong>' + _esc(ops.join(', ')) + '</strong></div>' +
        '<div style="display:flex;gap:8px">' +
          '<button onclick="document.getElementById(\'otm-err\').innerHTML=\'\'" style="padding:5px 12px;border:0.5px solid var(--border);border-radius:5px;cursor:pointer;font-size:11px;background:var(--surface-2);color:var(--text-primary)">Volver y completar</button>' +
          '<button onclick="window._otm_confirmarAvance()" style="padding:5px 12px;border:none;border-radius:5px;cursor:pointer;font-size:11px;background:var(--fill-accent);color:#fff">Avanzar de todas formas</button>' +
        '</div>' +
      '</div>';
  }

  function _confirmarAvance() {
    if (!_otId || !_pendFase) return;
    var fase = _pendFase; var ops = _pendOps || [];
    _pendFase = null; _pendOps = null;
    _doFase(fase, ops);
  }

  function _doFase(faseDestino, ops) {
    // Auto-resolver espera activa antes de avanzar de fase
    if (_otId) {
      var ots2 = APP.lsGet('ots') || [];
      var ot2  = ots2.find(function(o){ return o.id === _otId; });
      if (ot2 && ot2.estadoTrabajo === 'espera') {
        var ses2        = APP.lsGet('sesion') || {};
        var nombreU     = ses2.nombre || 'Usuario desconocido';
        var idU         = ses2.usuario_id || null;
        var ahora2      = new Date();
        var desde2      = ot2.espera_desde ? new Date(ot2.espera_desde) : ahora2;
        var durMin      = Math.round((ahora2 - desde2) / 60000);
        var durStr      = durMin < 60 ? durMin + ' min' : (Math.round(durMin / 6) / 10) + ' h';
        if (!ot2.historial) ot2.historial = ot2.historial_eventos || [];
        ot2.historial.push({
          evento:              'fin_espera',
          descripcion:         'Espera resuelta al avanzar de fase' +
                               (ot2.motivoEspera ? ' (motivo: ' + ot2.motivoEspera + ')' : '') +
                               ' — duración: ' + durStr,
          fecha:               ahora2.toISOString(),
          usuario_id:          idU,
          usuario_nombre:      nombreU,
          espera_duracion_min: durMin,
          espera_motivo:       ot2.motivoEspera || null
        });
        ot2.estadoTrabajo = 'taller';
        ot2.motivoEspera  = null;
        ot2.detalleEspera = null;
        ot2.espera_desde  = null;
        APP.lsSet('ots', ots2);
      }
    }
    if (typeof cambiarFaseOT === 'function') cambiarFaseOT(_otId, faseDestino, ops);
    _vistaFase = faseDestino;
    _render();
  }

  // ─── Navegar tab sin cambiar fase ─────────────────────────────────────────
  function _irFase(fase) {
    _vistaFase = fase;
    _render();
  }

  // ─── Abrir modal ──────────────────────────────────────────────────────────
  function abrirModalOT(otId, vistaInicial) {
    var ots = APP.lsGet('ots') || [];
    var ot = ots.find(function(o){ return o.id === otId; });
    if (!ot) { console.warn('[ot-modal] OT no encontrada:', otId); return; }

    _otId      = otId;
    _vistaFase = vistaInicial || ot.fase || 'recepcion';
    _pendFase  = null;
    _pendOps   = null;

    var prev = document.getElementById('otm-overlay');
    if (prev) prev.remove();

    var nombre  = [ot.cliente_nombre, ot.cliente_apellido].filter(Boolean).join(' ') || '(Sin nombre)';
    var patente = ot.vehiculo_patente || ot.patente || '—';

    var overlay = document.createElement('div');
    overlay.id = 'otm-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px';
    overlay.addEventListener('click', function(e){ if (e.target === overlay) cerrarModalOT(); });

    overlay.innerHTML =
      '<div style="background:var(--surface-2);border-radius:10px;width:100%;max-width:640px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.45);overflow:hidden">' +
        '<div style="padding:16px 20px;border-bottom:0.5px solid var(--border);flex-shrink:0;display:flex;align-items:center;gap:12px">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:16px;font-weight:700;color:var(--text-primary)">OT #' + _esc(ot.numero || ot.id) + '</div>' +
            '<div style="font-size:12px;color:var(--text-secondary);margin-top:2px">' + _esc(nombre) + ' · <span style="font-family:var(--font-mono)">' + _esc(patente) + '</span></div>' +
          '</div>' +
        '</div>' +
        '<div id="otm-body" style="flex:1;overflow-y:auto;padding:20px"></div>' +
        '<div style="padding:12px 20px;border-top:0.5px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:12px">' +
          '<button onclick="cerrarModalOT()" style="padding:8px 20px;border:0.5px solid var(--border);border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;background:var(--surface-1);color:var(--text-primary)">Guardar y salir</button>' +
          '<span style="font-size:10px;color:var(--text-muted)">Puedes volver a esta OT cuando quieras, tal como la dejaste</span>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    _render();
  }

  // ─── Cerrar modal ─────────────────────────────────────────────────────────
  function cerrarModalOT() {
    var o = document.getElementById('otm-overlay');
    if (o) o.remove();
    _otId = null; _vistaFase = null; _pendFase = null; _pendOps = null;
    if (typeof renderListaOTs === 'function') renderListaOTs();
  }

  // ─── Exports globales ─────────────────────────────────────────────────────
  window.abrirModalOT         = abrirModalOT;
  window.abrirModalOTResumen  = function(otId) { abrirModalOT(otId, 'resumen'); };
  window.cerrarModalOT        = cerrarModalOT;
  window._otm_blur            = _blur;
  window._otm_cambiarFase     = _cambiarFase;
  window._otm_irFase          = _irFase;
  window._otm_confirmarAvance = _confirmarAvance;
  window._otm_setEspera       = _setEspera;
  window._otm_blurEspera      = _blurEspera;

})();
