// ===== MÓDULO: SERVICIOS =====
// Catálogo de servicios — reutiliza funciones de admin.js

// ===== ESTADO INTERNO =====
let _svcCategorias = [];

// ===== INIT =====
function init_servicios() {
  _svcCategorias = APP.lsGet('svc_categorias', []);
  if (typeof _admCatRender === 'function') _admCatRender();
}

// ===== TAB PRINCIPAL =====
function svcSetTab(tab) {
  const cat  = document.getElementById('svc-tab-catalogo');
  const cfg  = document.getElementById('svc-tab-config');
  const bCat = document.getElementById('svc-tab-btn-cat');
  const bCfg = document.getElementById('svc-tab-btn-config');
  if (!cat || !cfg) return;
  if (tab === 'config') {
    cat.style.display = 'none'; cfg.style.display = '';
    bCat.style.borderBottomColor = 'transparent'; bCat.style.color = 'var(--text-secondary)';
    bCfg.style.borderBottomColor = 'var(--fill-accent)'; bCfg.style.color = 'var(--text-accent)';
    svcCatRender();
  } else {
    cat.style.display = ''; cfg.style.display = 'none';
    bCat.style.borderBottomColor = 'var(--fill-accent)'; bCat.style.color = 'var(--text-accent)';
    bCfg.style.borderBottomColor = 'transparent'; bCfg.style.color = 'var(--text-secondary)';
  }
}

// ===== SUB-TAB =====
function svcSetSubTab(tab) {
  const sCat  = document.getElementById('svc-subtab-cat');
  const sPerm = document.getElementById('svc-subtab-perm');
  const sOp   = document.getElementById('svc-subtab-op');
  const bCat  = document.getElementById('svc-subtab-btn-cat');
  const bPerm = document.getElementById('svc-subtab-btn-perm');
  const bOp   = document.getElementById('svc-subtab-btn-op');
  [sCat, sPerm, sOp].forEach(e => { if (e) e.style.display = 'none'; });
  [bCat, bPerm, bOp].forEach(e => {
    if (e) { e.style.borderBottomColor = 'transparent'; e.style.color = 'var(--text-secondary)'; }
  });
  if (tab === 'perm') {
    if (sPerm) sPerm.style.display = '';
    if (bPerm) { bPerm.style.borderBottomColor = 'var(--fill-accent)'; bPerm.style.color = 'var(--text-accent)'; }
    svcLoadOperarios();
    const sel = document.getElementById('svc-perm-operario');
    if (sel && sel.options.length > 1) {
      sel.selectedIndex = 1;
      svcPermCargar(sel.value);
    } else {
      svcPermCargar('');
    }
  } else if (tab === 'op') {
    if (sOp) sOp.style.display = '';
    if (bOp) { bOp.style.borderBottomColor = 'var(--fill-accent)'; bOp.style.color = 'var(--text-accent)'; }
    svcOpRender();
  } else if (tab === 'upselling') {
    const sUp = document.getElementById('svc-subtab-upselling');
    const bUp = document.getElementById('svc-subtab-btn-upsell');
    if (sUp) sUp.style.display = '';
    if (bUp) { bUp.style.borderBottomColor = 'var(--fill-accent)'; bUp.style.color = 'var(--text-accent)'; }
    _svcRenderUpselling();
  } else {
    if (sCat) sCat.style.display = '';
    if (bCat) { bCat.style.borderBottomColor = 'var(--fill-accent)'; bCat.style.color = 'var(--text-accent)'; }
    svcCatRender();
  }
}

// ===== CATEGORÍAS DE SERVICIOS =====
function svcCatRender() {
  const el  = document.getElementById('svc-cat-tabla');
  const btn = document.getElementById('svc-cat-guardar');
  if (!el) return;
  if (!_svcCategorias.length) {
    el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:11px"><i class="ti ti-tags" style="font-size:26px;display:block;margin-bottom:6px;opacity:.3"></i>Sin categorías. Usa <strong>+ Agregar categoría</strong> para crear la primera.</div>';
    if (btn) btn.style.display = 'none';
    return;
  }
  el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr>
      <th style="text-align:left;padding:6px 8px;border-bottom:0.5px solid var(--border);font-size:10px;color:var(--text-muted);font-weight:500">Nombre</th>
      <th style="text-align:left;padding:6px 8px;border-bottom:0.5px solid var(--border);font-size:10px;color:var(--text-muted);font-weight:500">Color</th>
      <th style="text-align:center;padding:6px 8px;border-bottom:0.5px solid var(--border);font-size:10px;color:var(--text-muted);font-weight:500;width:40px"></th>
    </tr></thead>
    <tbody>${_svcCategorias.map((c, i) => `<tr>
      <td style="padding:4px 8px;border-bottom:0.5px solid var(--border-light)">
        <input id="svc-cat-n-${i}" value="${_esc(c.nombre)}" placeholder="Nombre de la categoría" style="width:100%;font-size:12px;border:0.5px solid var(--border);border-radius:4px;padding:4px 6px;background:var(--surface-1);color:var(--text-primary)">
      </td>
      <td style="padding:4px 8px;border-bottom:0.5px solid var(--border-light)">
        <input id="svc-cat-c-${i}" type="color" value="${c.color_hex || '#3b82f6'}" style="width:40px;height:30px;border:0.5px solid var(--border);border-radius:4px;padding:2px;cursor:pointer">
      </td>
      <td style="padding:4px 8px;border-bottom:0.5px solid var(--border-light);text-align:center">
        <button onclick="svcCatEliminar(${i})" style="background:none;border:none;cursor:pointer;color:var(--text-danger);font-size:16px;padding:4px;line-height:1" title="Eliminar categoría">×</button>
      </td>
    </tr>`).join('')}</tbody>
  </table>`;
  if (btn) btn.style.display = '';
}

function svcCatAgregar() {
  _svcCategorias.push({ id: 'cat-' + Date.now(), nombre: '', color_hex: '#3b82f6' });
  svcCatRender();
}

function svcCatEliminar(idx) {
  APP.modal.confirmar('¿Eliminar esta categoría?', () => {
    _svcCategorias.splice(idx, 1);
    svcCatRender();
  }, 'Eliminar', 'Cancelar');
}

function svcCatGuardar() {
  const cats  = _svcCategorias;
  const errors = [];
  cats.forEach((c, i) => {
    const nombre = (document.getElementById('svc-cat-n-' + i)?.value || '').trim();
    const color  = document.getElementById('svc-cat-c-' + i)?.value || '#3b82f6';
    if (!nombre) errors.push('Fila ' + (i + 1) + ': el nombre es obligatorio');
    c.nombre    = nombre;
    c.color_hex = color;
  });
  if (errors.length) { APP.toast.show('⚠️ ' + errors.join('. '), 'warning'); return; }
  APP.lsSet('svc_categorias', cats);
  APP.toast.show('Categorías guardadas');
}

// ===== PERMISOS POR OPERARIO =====
function svcLoadOperarios() {
  const sel = document.getElementById('svc-perm-operario');
  if (!sel) return;
  const usuarios = APP.lsGet('usuarios', []);
  const ops = usuarios.filter(u => u.rol === 'mecanico' || u.rol === 'técnico');
  sel.innerHTML = '<option value="">— Selecciona un operario —</option>' +
    ops.map(u => '<option value="' + _esc(u.id) + '">' + _esc(u.nombre || '') + ' ' + _esc(u.apellido || '') + '</option>').join('');
}

function svcPermCargar(idOperario) {
  const wrap = document.getElementById('svc-perm-cat-wrap');
  const lista = document.getElementById('svc-perm-cat-lista');
  const info  = document.getElementById('svc-perm-info');
  if (!idOperario) {
    wrap.style.display = 'none'; info.style.display = 'none';
    return;
  }
  const categorias = APP.lsGet('svc_categorias', []);
  const permisos   = APP.lsGet('operarios_servicios', []);
  const operPerms  = permisos.filter(p => String(p.id_operario) === String(idOperario)).map(p => p.id_cat);

  wrap.style.display = 'block';
  if (!operPerms.length) {
    info.style.display = 'block';
    info.innerHTML = '<i class="ti ti-checkbox"></i> Sin restricciones — este operario puede hacer todas las categorías. Marca categorías para restringir.';
  } else {
    info.style.display = 'none';
  }

  if (!categorias.length) {
    lista.innerHTML = '<div style="font-size:11px;color:var(--text-muted);padding:8px 0"><i class="ti ti-tags"></i> No hay categorías definidas. Ve a la pestaña Categorías para crear una.</div>';
    return;
  }

  lista.innerHTML = categorias.map(c => {
    const checked = operPerms.includes(c.id);
    return '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 0;border-bottom:0.5px solid var(--border-light);font-size:12px">' +
      '<span style="width:10px;height:10px;border-radius:2px;background:' + (c.color_hex || '#3b82f6') + ';display:inline-block"></span>' +
      '<input type="checkbox" id="perm-cat-' + _esc(c.id) + '" value="' + _esc(c.id) + '" ' + (checked ? 'checked' : '') +
      ' onchange="svcUpdatePermiso(\'' + _esc(idOperario) + '\',\'' + _esc(c.id) + '\',this.checked)"> ' +
      _esc(c.nombre) + '</label>';
  }).join('');
}

function svcUpdatePermiso(idOp, idCat, permitido) {
  let permisos = APP.lsGet('operarios_servicios', []);
  if (permitido) {
    permisos.push({ id_operario: idOp, id_cat: idCat });
  } else {
    permisos = permisos.filter(p => !(String(p.id_operario) === String(idOp) && String(p.id_cat) === String(idCat)));
  }
  APP.lsSet('operarios_servicios', permisos);
  svcPermCargar(idOp);
}

function svcGetPermitidosPara(idOperario) {
  if (!idOperario) return APP.lsGet('mp_servicios', []);
  const permisos   = APP.lsGet('operarios_servicios', []);
  const operPerms  = permisos.filter(p => String(p.id_operario) === String(idOperario)).map(p => p.id_cat);
  if (!operPerms.length) return APP.lsGet('mp_servicios', []);
  const categorias = APP.lsGet('svc_categorias', []);
  const catsAfect = categorias.filter(c => operPerms.includes(c.id)).map(c => c.nombre);
  return APP.lsGet('mp_servicios', []).filter(s => catsAfect.includes(s.categoria));
}

// ===== OPERARIOS CRUD =====
let _svcOpEditId = null;
let _svcOpCerts  = [];
let _svcCertEditIdx = null;

function svcOpRender() {
  const el = document.getElementById('svc-op-lista');
  if (!el) return;
  const usuarios = APP.lsGet('usuarios', []);
  const ops = usuarios.filter(u => u.rol === 'mecanico' || u.rol === 'técnico');
  if (!ops.length) {
    el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:11px"><i class="ti ti-tool" style="font-size:26px;display:block;margin-bottom:6px;opacity:.3"></i>Sin operarios registrados. Usa <strong>+ Nuevo operario</strong> para agregar.</div>';
    return;
  }
  el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr>
      <th style="text-align:left;padding:6px 8px;border-bottom:0.5px solid var(--border);font-size:10px;color:var(--text-muted);font-weight:500">Nombre</th>
      <th style="text-align:left;padding:6px 8px;border-bottom:0.5px solid var(--border);font-size:10px;color:var(--text-muted);font-weight:500">Apellido</th>
      <th style="text-align:left;padding:6px 8px;border-bottom:0.5px solid var(--border);font-size:10px;color:var(--text-muted);font-weight:500">RUT</th>
      <th style="text-align:left;padding:6px 8px;border-bottom:0.5px solid var(--border);font-size:10px;color:var(--text-muted);font-weight:500">WhatsApp</th>
      <th style="text-align:left;padding:6px 8px;border-bottom:0.5px solid var(--border);font-size:10px;color:var(--text-muted);font-weight:500">Nivel</th>
      <th style="text-align:center;padding:6px 8px;border-bottom:0.5px solid var(--border);font-size:10px;color:var(--text-muted);font-weight:500;width:80px">Acción</th>
    </tr></thead>
    <tbody>${ops.map((u, i) => {
      const nivelLabel = { sin_estudios:'—', tecnico:'Técnico', profesional:'Profesional', especialista:'Especialista' };
      return `<tr>
        <td style="padding:4px 8px;border-bottom:0.5px solid var(--border-light)">${_esc(u.nombre || '')}</td>
        <td style="padding:4px 8px;border-bottom:0.5px solid var(--border-light)">${_esc(u.apellido || '')}</td>
        <td style="padding:4px 8px;border-bottom:0.5px solid var(--border-light);font-family:var(--font-mono);font-size:11px">${_esc(u.rut || '—')}</td>
        <td style="padding:4px 8px;border-bottom:0.5px solid var(--border-light)">${_esc(u.whatsapp || u.wz || '—')}</td>
        <td style="padding:4px 8px;border-bottom:0.5px solid var(--border-light);font-size:11px">${nivelLabel[u.formacion?.nivel] || '—'}</td>
        <td style="padding:4px 8px;border-bottom:0.5px solid var(--border-light);text-align:center">
          <button onclick="svcOpEditar('${_esc(u.id)}')" style="background:none;border:none;cursor:pointer;color:var(--text-accent);font-size:13px;padding:2px 6px" title="Editar">✎</button>
          <button onclick="svcOpEliminar('${_esc(u.id)}')" style="background:none;border:none;cursor:pointer;color:var(--text-danger);font-size:13px;padding:2px 6px" title="Eliminar">×</button>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

function _svcOpLimpiarForm() {
  const ids = ['svc-op-f-nombre','svc-op-f-apellido','svc-op-f-rut','svc-op-f-wz',
    'svc-op-f-carrera','svc-op-f-institucion','svc-op-f-ano-egreso','svc-op-f-exp-anos','svc-op-f-exp-desc'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const sel = document.getElementById('svc-op-f-nivel');
  if (sel) sel.value = 'sin_estudios';
  const chk = document.getElementById('svc-op-f-titulo-val');
  if (chk) chk.checked = false;
  svcOpToggleFormacion();
  _svcOpCerts = [];
  _svcCertEditIdx = null;
  svcCertCerrarPanel();
  svcCertRender();
  const tPrev = document.getElementById('svc-op-doc-titulo-preview');
  if (tPrev) tPrev.innerHTML = '';
  const cPrev = document.getElementById('svc-op-doc-cv-preview');
  if (cPrev) cPrev.innerHTML = '';
  const tFile = document.getElementById('svc-op-f-doc-titulo');
  if (tFile) tFile.value = '';
  const cFile = document.getElementById('svc-op-f-doc-cv');
  if (cFile) cFile.value = '';
}

function svcOpNuevo() {
  _svcOpEditId = null;
  _svcOpLimpiarForm();
  const t = document.getElementById('svc-op-titulo');
  if (t) t.textContent = 'Nuevo operario';
  const m = document.getElementById('svc-op-modal');
  if (m) m.style.display = '';
}

function svcOpEditar(id) {
  const usuarios = APP.lsGet('usuarios', []);
  const u = usuarios.find(x => String(x.id) === String(id));
  if (!u) return;
  _svcOpEditId = id;
  _svcOpLimpiarForm();
  const s = (elId, v) => { const el = document.getElementById(elId); if (el) el.value = v || ''; };
  const c = (elId, v) => { const el = document.getElementById(elId); if (el) el.checked = !!v; };
  s('svc-op-f-nombre',   u.nombre);
  s('svc-op-f-apellido', u.apellido);
  s('svc-op-f-rut',      u.rut);
  s('svc-op-f-wz',       u.whatsapp || u.wz || '');

  const f = u.formacion || {};
  const niv = document.getElementById('svc-op-f-nivel');
  if (niv) niv.value = f.nivel || 'sin_estudios';
  svcOpToggleFormacion();
  s('svc-op-f-carrera',     f.especialidad);
  s('svc-op-f-institucion', f.institucion);
  s('svc-op-f-ano-egreso',  f.año_egreso);
  c('svc-op-f-titulo-val',  f.titulo_validado);

  _svcOpCerts = (u.certificaciones || []).map(c => ({ ...c }));
  svcCertRender();

  s('svc-op-f-exp-anos', u.experiencia?.años);
  s('svc-op-f-exp-desc', u.experiencia?.especialidades);

  const docs = u.documentos || {};
  if (docs.titulo_base64) {
    const tp = document.getElementById('svc-op-doc-titulo-preview');
    if (tp) tp.innerHTML = _svcOpDocPreviewHtml(docs.titulo_base64, 'titulo');
  }
  if (docs.cv_base64) {
    const cp = document.getElementById('svc-op-doc-cv-preview');
    if (cp) cp.innerHTML = _svcOpDocPreviewHtml(docs.cv_base64, 'cv');
  }

  const t = document.getElementById('svc-op-titulo');
  if (t) t.textContent = 'Editar: ' + (u.nombre || '') + ' ' + (u.apellido || '');
  const m = document.getElementById('svc-op-modal');
  if (m) m.style.display = '';
}

function svcOpGuardar() {
  const g = id => (document.getElementById(id)?.value || '').trim();
  const nombre   = g('svc-op-f-nombre');
  const apellido = g('svc-op-f-apellido');
  if (!nombre && !apellido) { APP.toast.show('⚠️ Ingresa al menos el nombre.', 'warning'); return; }

  const anoAct = new Date().getFullYear();
  const anoEg = parseInt(g('svc-op-f-ano-egreso'));
  if (anoEg > anoAct) { APP.toast.show('⚠️ Año de egreso no puede ser mayor a ' + anoAct, 'warning'); return; }

  const formacion = {
    nivel: document.getElementById('svc-op-f-nivel')?.value || 'sin_estudios',
    especialidad: g('svc-op-f-carrera'),
    institucion: g('svc-op-f-institucion'),
    año_egreso: anoEg || null,
    titulo_validado: document.getElementById('svc-op-f-titulo-val')?.checked || false,
  };

  _svcOpCerts.forEach(c => {
    if (c.año_vencimiento && c.año_obtencion && c.año_vencimiento < c.año_obtencion) {
      APP.toast.show('⚠️ En ' + c.nombre + ' el año de vencimiento es anterior al de obtención.', 'warning');
      return;
    }
  });

  let usuarios = APP.lsGet('usuarios', []);
  const dato = {
    nombre, apellido, rut: g('svc-op-f-rut'), wz: g('svc-op-f-wz'), rol: 'mecanico',
    formacion,
    certificaciones: _svcOpCerts,
    experiencia: {
      años: parseInt(g('svc-op-f-exp-anos')) || 0,
      especialidades: g('svc-op-f-exp-desc'),
    },
  };

  const docTitulo = document.getElementById('svc-op-doc-titulo-preview')?.dataset?.base64;
  const docCv     = document.getElementById('svc-op-doc-cv-preview')?.dataset?.base64;
  dato.documentos = {};
  if (docTitulo) dato.documentos.titulo_base64 = docTitulo;
  if (docCv)     dato.documentos.cv_base64 = docCv;

  if (_svcOpEditId) {
    const idx = usuarios.findIndex(x => String(x.id) === String(_svcOpEditId));
    if (idx >= 0) { usuarios[idx] = { ...usuarios[idx], ...dato, whatsapp: dato.wz, wz: dato.wz }; }
  } else {
    dato.id = 'op-' + Date.now();
    dato.creado = new Date().toISOString();
    dato.whatsapp = dato.wz;
    usuarios.push(dato);
  }
  APP.lsSet('usuarios', usuarios);
  svcOpCerrar();
  svcOpRender();
  APP.toast.show('Operario guardado');
}

function svcOpEliminar(id) {
  APP.modal.confirmar('¿Eliminar este operario?', () => {
    APP.lsSet('usuarios', APP.lsGet('usuarios', []).filter(u => String(u.id) !== String(id)));
    svcOpRender();
  }, 'Eliminar', 'Cancelar');
}

function svcOpCerrar() {
  const m = document.getElementById('svc-op-modal');
  if (m) m.style.display = 'none';
  _svcOpEditId = null;
  _svcOpCerts = [];
  svcCertCerrarPanel();
}

// ===== FORMACIÓN TOGGLE =====
function svcOpToggleFormacion() {
  const nivel = document.getElementById('svc-op-f-nivel')?.value;
  const det   = document.getElementById('svc-op-formacion-detalle');
  const chk   = document.getElementById('svc-op-f-titulo-val');
  if (!det) return;
  if (nivel === 'profesional' || nivel === 'especialista') {
    det.style.display = '';
    document.getElementById('svc-op-lbl-carrera')?.textContent === 'Carrera/Especialidad';
    document.getElementById('svc-op-lbl-institucion')?.textContent === 'Universidad/Instituto';
    if (chk) chk.parentElement.style.display = '';
  } else if (nivel === 'tecnico') {
    det.style.display = '';
    document.getElementById('svc-op-lbl-carrera')?.textContent === 'Especialidad técnica';
    document.getElementById('svc-op-lbl-institucion')?.textContent === 'Instituto técnico';
    if (chk) chk.parentElement.style.display = 'none';
  } else {
    det.style.display = 'none';
  }
}

// ===== CERTIFICACIONES =====
function svcCertRender() {
  const el = document.getElementById('svc-op-cert-tabla');
  if (!el) return;
  if (!_svcOpCerts.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text-muted);padding:8px 0">Sin certificaciones registradas.</div>';
    return;
  }
  el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:11px">
    <thead><tr>
      <th style="text-align:left;padding:4px 6px;border-bottom:0.5px solid var(--border);font-size:10px;color:var(--text-muted);font-weight:500">Certificación</th>
      <th style="text-align:left;padding:4px 6px;border-bottom:0.5px solid var(--border);font-size:10px;color:var(--text-muted);font-weight:500">Institución</th>
      <th style="text-align:center;padding:4px 6px;border-bottom:0.5px solid var(--border);font-size:10px;color:var(--text-muted);font-weight:500">Año</th>
      <th style="text-align:center;padding:4px 6px;border-bottom:0.5px solid var(--border);font-size:10px;color:var(--text-muted);font-weight:500">Vigencia</th>
      <th style="text-align:center;padding:4px 6px;border-bottom:0.5px solid var(--border);font-size:10px;color:var(--text-muted);font-weight:500;width:70px">Acción</th>
    </tr></thead>
    <tbody>${_svcOpCerts.map((c, i) => `<tr>
      <td style="padding:4px 6px;border-bottom:0.5px solid var(--border-light)">${_esc(c.nombre)}</td>
      <td style="padding:4px 6px;border-bottom:0.5px solid var(--border-light)">${_esc(c.institucion || '—')}</td>
      <td style="padding:4px 6px;border-bottom:0.5px solid var(--border-light);text-align:center">${c.año_obtencion || '—'}</td>
      <td style="padding:4px 6px;border-bottom:0.5px solid var(--border-light);text-align:center">${c.vigente ? '<span class="st s-done" style="font-size:9px"><span class="dot"></span>Vigente</span>' : c.año_vencimiento || '—'}</td>
      <td style="padding:4px 6px;border-bottom:0.5px solid var(--border-light);text-align:center">
        <button onclick="svcCertEditar(${i})" style="background:none;border:none;cursor:pointer;color:var(--text-accent);font-size:12px;padding:2px 5px" title="Editar">✎</button>
        <button onclick="svcCertEliminar(${i})" style="background:none;border:none;cursor:pointer;color:var(--text-danger);font-size:12px;padding:2px 5px" title="Eliminar">×</button>
      </td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function svcCertAbrirModal() {
  _svcCertEditIdx = null;
  document.getElementById('svc-cert-panel-titulo').textContent = 'Nueva certificación';
  ['svc-cert-f-nombre','svc-cert-f-institucion','svc-cert-f-ano-obt','svc-cert-f-ano-venc'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const chk = document.getElementById('svc-cert-f-vigente');
  if (chk) chk.checked = false;
  const p = document.getElementById('svc-cert-panel');
  if (p) p.style.display = '';
}

function svcCertEditar(idx) {
  const c = _svcOpCerts[idx];
  if (!c) return;
  _svcCertEditIdx = idx;
  document.getElementById('svc-cert-panel-titulo').textContent = 'Editar certificación';
  const s = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  const ck = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };
  s('svc-cert-f-nombre',       c.nombre);
  s('svc-cert-f-institucion',  c.institucion);
  s('svc-cert-f-ano-obt',      c.año_obtencion);
  s('svc-cert-f-ano-venc',     c.año_vencimiento);
  ck('svc-cert-f-vigente',     c.vigente);
  const p = document.getElementById('svc-cert-panel');
  if (p) p.style.display = '';
}

function svcCertGuardar() {
  const g = id => (document.getElementById(id)?.value || '').trim();
  const nombre = g('svc-cert-f-nombre');
  if (!nombre) { APP.toast.show('⚠️ Ingresa el nombre de la certificación.', 'warning'); return; }
  const anoObt = parseInt(g('svc-cert-f-ano-obt'));
  const anoVenc = parseInt(g('svc-cert-f-ano-venc'));
  const dato = {
    id: 'cert-' + Date.now(),
    nombre,
    institucion: g('svc-cert-f-institucion'),
    año_obtencion: anoObt || null,
    año_vencimiento: anoVenc || null,
    vigente: document.getElementById('svc-cert-f-vigente')?.checked || false,
  };
  if (dato.año_vencimiento && dato.año_obtencion && dato.año_vencimiento < dato.año_obtencion) {
    APP.toast.show('⚠️ Año vencimiento no puede ser anterior a año obtención.', 'warning'); return;
  }
  if (_svcCertEditIdx !== null) {
    _svcOpCerts[_svcCertEditIdx] = { ..._svcOpCerts[_svcCertEditIdx], ...dato, id: _svcOpCerts[_svcCertEditIdx].id };
  } else {
    _svcOpCerts.push(dato);
  }
  svcCertCerrarPanel();
  svcCertRender();
}

function svcCertEliminar(idx) {
  if (!confirm('¿Eliminar esta certificación?')) return;
  _svcOpCerts.splice(idx, 1);
  svcCertRender();
}

function svcCertCerrarPanel() {
  const p = document.getElementById('svc-cert-panel');
  if (p) p.style.display = 'none';
  _svcCertEditIdx = null;
}

// ===== DOCUMENTOS =====
function _svcOpDocPreviewHtml(base64, tipo) {
  const isImg = base64.startsWith('data:image/');
  if (isImg) {
    return '<div style="display:flex;align-items:center;gap:8px;margin-top:4px">' +
      '<img src="' + base64 + '" style="max-width:80px;max-height:60px;border-radius:4px;border:0.5px solid var(--border)">' +
      '<button class="btn" onclick="svcOpDocEliminar(\'' + tipo + '\')" style="font-size:10px;padding:2px 6px;color:var(--text-danger)">× Eliminar</button></div>';
  }
  return '<div style="display:flex;align-items:center;gap:8px;margin-top:4px;font-size:11px;color:var(--text-muted)">' +
    '<i class="ti ti-file-text" style="font-size:18px"></i> PDF cargado' +
    '<button class="btn" onclick="svcOpDocEliminar(\'' + tipo + '\')" style="font-size:10px;padding:2px 6px;color:var(--text-danger)">× Eliminar</button></div>';
}

function svcOpDocPreview(input, previewId) {
  const preview = document.getElementById(previewId);
  if (!preview) return;
  const file = input.files && input.files[0];
  if (!file) { preview.innerHTML = ''; return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    preview.dataset.base64 = base64;
    const tipo = previewId.includes('titulo') ? 'titulo' : 'cv';
    preview.innerHTML = _svcOpDocPreviewHtml(base64, tipo);
  };
  reader.readAsDataURL(file);
}

function svcOpDocEliminar(tipo) {
  const preview = document.getElementById(tipo === 'titulo' ? 'svc-op-doc-titulo-preview' : 'svc-op-doc-cv-preview');
  if (preview) { preview.innerHTML = ''; delete preview.dataset.base64; }
  const input = document.getElementById(tipo === 'titulo' ? 'svc-op-f-doc-titulo' : 'svc-op-f-doc-cv');
  if (input) input.value = '';
}

// ===== GESTIÓN DE PROVEEDORES =====
function svcRenderProveedores() {
  const lista = document.getElementById('svc-prov-lista');
  if (!lista) return;
  const provs = APP.lsGet('mp_proveedores', []);

  const cnt = document.getElementById('svc-prov-count');
  if (cnt) cnt.textContent = provs.length + ' proveedor' + (provs.length !== 1 ? 'es' : '');

  if (!provs.length) {
    lista.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:11px">
      <i class="ti ti-building-store" style="font-size:28px;display:block;margin-bottom:8px;opacity:.3"></i>
      Sin proveedores registrados.
    </div>`;
    return;
  }

  const CHIP_COLORS = [
    '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'
  ];
  function chipColor(marca) {
    let h = 0;
    for (let i = 0; i < marca.length; i++) h = (h * 31 + marca.charCodeAt(i)) & 0xfffffff;
    return CHIP_COLORS[h % CHIP_COLORS.length];
  }

  lista.innerHTML = provs.map(p => {
    const marcas = p.marcas || [];
    const marcasChips = marcas.length
      ? marcas.map(m => `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:500;color:#fff;background:${chipColor(m)}">${_esc(m)}</span>`).join('')
      : '<span style="font-size:11px;color:var(--text-muted)">Sin marcas</span>';

    const waHref = p.wz
      ? (() => {
          const cfg    = APP.lsGet('mp_taller_config', {});
          const taller = cfg.nombre || 'Integral Automotriz';
          const wz     = cfg.telefono || '+569 5165 5331';
          const marcasStr = marcas.length ? marcas.join(', ') : 'vehículos varios';
          const msg = `Hola ${p.nombre}, necesito cotización de repuestos para ${marcasStr} — ${taller} ${wz}`;
          return `https://wa.me/${p.wz.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`;
        })()
      : null;

    return `<div class="card" style="margin-bottom:10px">
      <div class="ch" style="margin-bottom:8px">
        <div>
          <div style="font-size:13px;font-weight:500">${_esc(p.nombre)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${_esc(p.rubro||'—')}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          ${waHref ? `<a href="${waHref}" target="_blank" class="btn bpw" style="font-size:11px;padding:4px 10px"><i class="ti ti-brand-whatsapp"></i> WA</a>` : ''}
        </div>
      </div>
      <div>
        <div style="font-size:10px;color:var(--text-muted);font-weight:500;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">Marcas que abastece</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">${marcasChips}</div>
      </div>
    </div>`;
  }).join('');
}

// ===== FORMULARIO PROVEEDOR =====
function svcProvNuevo() {
  _svcProvEdit  = null;
  _svcProvMarcas = [];
  ['svc-prov-f-nombre','svc-prov-f-wz','svc-prov-f-marca-input'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const r = document.getElementById('svc-prov-f-rubro'); if (r) r.value = '';
  document.getElementById('svc-prov-panel-titulo').textContent = 'Nuevo proveedor';
  _svcProvRenderMarcas();
  document.getElementById('svc-prov-panel').style.display = 'block';
  document.getElementById('svc-prov-panel').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function svcProvEditar(id) {
  const prov = APP.lsGet('mp_proveedores', []).find(p => p.id === id);
  if (!prov) return;
  _svcProvEdit  = id;
  _svcProvMarcas = [...(prov.marcas || [])];
  const s = (elId, v) => { const e = document.getElementById(elId); if (e) e.value = v||''; };
  s('svc-prov-f-nombre', prov.nombre);
  s('svc-prov-f-rubro',  prov.rubro);
  s('svc-prov-f-wz',     prov.wz);
  const mi = document.getElementById('svc-prov-f-marca-input'); if (mi) mi.value = '';
  document.getElementById('svc-prov-panel-titulo').textContent = 'Editar: ' + prov.nombre;
  _svcProvRenderMarcas();
  document.getElementById('svc-prov-panel').style.display = 'block';
  document.getElementById('svc-prov-panel').scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function svcProvCerrarPanel() {
  document.getElementById('svc-prov-panel').style.display = 'none';
  _svcProvEdit   = null;
  _svcProvMarcas = [];
}

function svcProvGuardar() {
  const g = id => (document.getElementById(id)?.value||'').trim();
  const nombre = g('svc-prov-f-nombre');
  if (!nombre) { APP.toast.show('⚠️ Ingresa el nombre del proveedor.', 'warning'); return; }
  if (!_svcProvMarcas.length) { APP.toast.show('⚠️ Agrega al menos una marca que abastece el proveedor.', 'warning'); return; }
  const provs = APP.lsGet('mp_proveedores', []);
  const dato  = { nombre, rubro:g('svc-prov-f-rubro'), wz:g('svc-prov-f-wz'), marcas:[..._svcProvMarcas] };
  if (_svcProvEdit) {
    const idx = provs.findIndex(p => p.id === _svcProvEdit);
    if (idx >= 0) provs[idx] = { ...provs[idx], ...dato };
  } else {
    provs.push({ id:'prov-'+Date.now(), ...dato, creado:new Date().toISOString() });
  }
  APP.lsSet('mp_proveedores', provs);
  svcProvCerrarPanel();
  svcRenderProveedores();
}

function svcProvEliminar(id) {
  APP.modal.confirmar('¿Eliminar este proveedor? Esta acción no se puede deshacer.', () => {
    APP.lsSet('mp_proveedores', APP.lsGet('mp_proveedores',[]).filter(p => p.id !== id));
    svcRenderProveedores();
  }, 'Eliminar', 'Cancelar');
}

// ===== CHIPS DE MARCAS =====
function svcProvMarcaAdd() {
  const input = document.getElementById('svc-prov-f-marca-input');
  const val   = (input?.value || '').trim();
  if (!val) return;
  if (_svcProvMarcas.map(m => m.toLowerCase()).includes(val.toLowerCase())) {
    if (input) input.value = '';
    return;
  }
  _svcProvMarcas.push(val);
  if (input) input.value = '';
  _svcProvRenderMarcas();
}

function svcProvMarcaElim(idx) {
  _svcProvMarcas.splice(idx, 1);
  _svcProvRenderMarcas();
}

function _svcProvRenderMarcas() {
  const el = document.getElementById('svc-prov-f-marcas-lista');
  if (!el) return;
  if (!_svcProvMarcas.length) {
    el.innerHTML = '<span style="font-size:10px;color:var(--text-muted)">Sin marcas agregadas</span>';
    return;
  }
  el.innerHTML = _svcProvMarcas.map((m, i) =>
    `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px 3px 10px;background:var(--bg-accent);border:0.5px solid var(--border-accent);border-radius:10px;font-size:11px;color:var(--text-accent)">
      ${_esc(m)}
      <span style="cursor:pointer;font-size:13px;line-height:1;color:var(--text-accent);opacity:.7" onclick="svcProvMarcaElim(${i})">×</span>
    </span>`
  ).join('');
}

// ===== INTEGRACIÓN CON FORMULARIO OT (parcha el select de servicio) =====
function _svcPatchTallerSelect() {
  const cServ = document.getElementById('c-serv');
  if (cServ && !cServ.dataset.svcPatched) {
    cServ.dataset.svcPatched = '1';
    _svcUpdateTallerSelect(cServ);
    cServ.addEventListener('change', _svcOnServicioChange);
  }
  const dServ = document.getElementById('det-serv');
  if (dServ && !dServ.dataset.svcPatched) {
    dServ.dataset.svcPatched = '1';
    _svcUpdateTallerSelect(dServ);
  }
  _svcUpdateServDatalist();
}

function _svcUpdateServDatalist() {
  const dl = document.getElementById('n-serv-dl');
  if (!dl) return;
  const svcs = APP.lsGet('mp_servicios', []);
  dl.innerHTML = svcs.map(s => `<option value="${_esc(s.nombre)}">`).join('');
}

function _svcUpdateTallerSelect(el) {
  const targets = el ? [el] : [document.getElementById('c-serv'), document.getElementById('det-serv')].filter(Boolean);
  const todos   = APP.lsGet('mp_servicios', []);
  if (!todos.length) return;

  const ESTATICOS = ['Mantención 10.000 km','Cambio de embrague','Diagnóstico scanner',
    'Cambio de frenos','Alineación y balanceo','Cambio aceite + filtros','Otro'];
  const nombres = todos.map(s => s.nombre);

  targets.forEach(sel => {
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '';
    const cats = [...new Set(todos.map(s => s.categoria))];
    cats.forEach(cat => {
      const group = document.createElement('optgroup');
      group.label = cat;
      todos.filter(s => s.categoria === cat).forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.nombre; opt.textContent = s.nombre;
        group.appendChild(opt);
      });
      sel.appendChild(group);
    });
    const extras = ESTATICOS.filter(n => !nombres.includes(n));
    if (extras.length) {
      const group = document.createElement('optgroup');
      group.label = 'Otros';
      extras.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n; opt.textContent = n;
        group.appendChild(opt);
      });
      sel.appendChild(group);
    }
    if ([...sel.options].some(o => o.value === current)) sel.value = current;
  });
}

function _svcOnServicioChange() {
  const sel = document.getElementById('c-serv');
  if (!sel) return;
  const svc = APP.lsGet('mp_servicios', []).find(s => s.nombre === sel.value);
  if (!svc) { _svcOcultarSugerencias(); return; }
  _svcMostrarSugerencias(svc);
}

function _svcMostrarSugerencias(svc) {
  let box = document.getElementById('svc-sug-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'svc-sug-box';
    const ref = document.getElementById('precot-box') || document.getElementById('c-notas');
    if (ref) ref.parentNode.insertBefore(box, ref); else return;
  }
  const cfg    = APP.lsGet('mp_config', {});
  const tarifa = cfg.tarifaHora || 0;
  const precio = svc.precioFijo || (tarifa && svc.horasEst ? Math.round(tarifa * svc.horasEst) : null);
  const conIva = svc.precioConIva && precio ? Math.round(precio * 1.19) : precio;
  const reps   = svc.repuestosSugeridos || [];

  box.style.cssText = 'margin-top:8px;margin-bottom:8px;padding:10px 12px;background:var(--bg-accent);border:0.5px solid var(--border-accent);border-radius:var(--radius)';
  box.style.display = '';
  box.innerHTML = `
    <div style="font-size:11px;font-weight:500;color:var(--text-accent);margin-bottom:5px"><i class="ti ti-tools" style="font-size:12px;vertical-align:-2px"></i> ${_esc(svc.nombre)} — del catálogo</div>
    <div style="font-size:11px;color:var(--text-accent);display:flex;gap:14px;flex-wrap:wrap">
      <span>⏱ ${svc.horasEst || '?'}h est.</span>
      ${conIva ? `<span>💰 $${conIva.toLocaleString('es-CL')} ${svc.precioConIva ? '(c/IVA)' : svc.precioFijo ? '(fijo)' : 'M.O.'}</span>` : ''}
      ${reps.length ? `<span>🔩 ${reps.length} repuesto${reps.length !== 1 ? 's' : ''} sugerido${reps.length !== 1 ? 's' : ''}</span>` : ''}
    </div>
    ${reps.length ? `<div style="margin-top:5px;font-size:10px;color:var(--text-accent);opacity:.85">${reps.map(r => _esc(r.nombre) + ' ×' + r.cantidad + ' ' + r.unidad).join(' · ')}</div>` : ''}`;
}

function _svcOcultarSugerencias() {
  const box = document.getElementById('svc-sug-box');
  if (box) box.style.display = 'none';
}

// ===== UPSELLING =====
const _SVC_UPSELL_DEFAULT = [
  { servicio:'Cambio aceite + filtros',    meses:6  },
  { servicio:'Mantención 10.000 km',       meses:12 },
  { servicio:'Cambio de frenos',           meses:24 },
  { servicio:'Alineación y balanceo',      meses:12 },
  { servicio:'Diagnóstico scanner',        meses:12 },
  { servicio:'Cambio de embrague',         meses:36 },
];

function _svcRenderUpselling() {
  const lista = document.getElementById('svc-upsell-lista');
  if (!lista) return;
  const rs   = APP.lsGet('mp_upselling_rules', _SVC_UPSELL_DEFAULT);
  const svcs = APP.lsGet('mp_servicios', []);
  const dlId = 'svc-upsell-svc-dl';

  lista.innerHTML = `<datalist id="${dlId}">${svcs.map(s => `<option value="${_esc(s.nombre)}">`).join('')}</datalist>`
    + (rs.length ? rs.map((r, i) => `
    <div style="display:flex;gap:6px;align-items:center;padding:7px 0;border-bottom:0.5px solid var(--border)">
      <i class="ti ti-sparkles" style="font-size:12px;color:var(--text-accent);flex-shrink:0"></i>
      <input list="${dlId}" value="${_esc(r.servicio)}" placeholder="Nombre del servicio…"
        style="flex:1;font-size:11px;border:0.5px solid var(--border);border-radius:var(--radius);padding:4px 8px;background:var(--surface-1);color:var(--text-primary)"
        onchange="svcUpsellSync(${i},'servicio',this.value)">
      <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">cada</span>
      <input type="number" min="1" max="120" value="${r.meses || 12}"
        style="width:58px;font-size:11px;border:0.5px solid var(--border);border-radius:var(--radius);padding:4px 8px;background:var(--surface-1);color:var(--text-primary);text-align:center"
        onchange="svcUpsellSync(${i},'meses',this.value)">
      <span style="font-size:11px;color:var(--text-muted)">meses</span>
      <button class="btn" style="padding:3px 7px;font-size:12px;color:var(--text-danger)" onclick="svcUpsellElim(${i})"><i class="ti ti-x"></i></button>
    </div>`).join('')
    : '<div style="font-size:11px;color:var(--text-muted);padding:8px 0">Sin reglas. Usa el botón Agregar.</div>');
}

function svcUpsellSync(i, campo, val) {
  const rs = APP.lsGet('mp_upselling_rules', _SVC_UPSELL_DEFAULT);
  if (rs[i]) { rs[i][campo] = campo === 'meses' ? (parseInt(val) || 1) : val; APP.lsSet('mp_upselling_rules', rs); }
}

function svcUpsellAgregar() {
  const rs = APP.lsGet('mp_upselling_rules', _SVC_UPSELL_DEFAULT);
  rs.push({ servicio:'', meses:12 });
  APP.lsSet('mp_upselling_rules', rs);
  _svcRenderUpselling();
}

function svcUpsellElim(i) {
  const rs = APP.lsGet('mp_upselling_rules', _SVC_UPSELL_DEFAULT);
  rs.splice(i, 1);
  APP.lsSet('mp_upselling_rules', rs);
  _svcRenderUpselling();
}

function svcUpsellReset() {
  APP.modal.confirmar('¿Restaurar las reglas de upselling por defecto? Se perderán los cambios manuales.', () => {
    APP.lsSet('mp_upselling_rules', JSON.parse(JSON.stringify(_SVC_UPSELL_DEFAULT)));
    _svcRenderUpselling();
  }, 'Restaurar', 'Cancelar');
}

// ===== HELPERS =====
function _svcFmtH(min) {
  if (!min) return '—';
  return Math.floor(min / 60) + 'h ' + Math.round(min % 60) + 'm';
}

function _esc(str) {
  return (str == null ? '' : String(str)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
