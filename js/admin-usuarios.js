// ===== MÓDULO: USUARIOS + LOGIN =====

(function () {

  // ── Constantes ──
  const ROLES = {
    administrador: 'Administrador',
    recepcionista:  'Recepcionista',
    mecanico:       'Mecánico',
    contable:       'Contable',
  };

  const PERMISOS = {
    administrador: ['todo'],
    recepcionista: ['dashboard', 'agenda', 'ot', 'clientes', 'servicios', 'panel-dia'],
    mecanico:      ['ots-propias'],
    contable:      ['dashboard', 'finanzas', 'contable', 'facturacion', 'reportes'],
  };

  const USUARIO_DEFAULT = {
    id:             1,
    nombre:         'Administrador',
    apellido:       '',
    rut:            '',
    whatsapp:       '',
    rol:            'administrador',
    color:          '#3B82F6',
    pin:            '0000',
    estado:         'activo',
    fecha_creacion: Date.now(),
  };

  // ── Intentos fallidos por usuario ──
  const _intentos = {};

  // ═══════════════════════════════════════════
  //  PERMISOS
  // ═══════════════════════════════════════════

  APP.puedeVer = function (seccion) {
    const sesion = APP.lsGet('sesion', null);
    if (!sesion || !sesion.rol) return false;
    const rol = sesion.rol.toLowerCase();
    if (rol === 'administrador') return true;
    const ps = PERMISOS[rol];
    return ps ? ps.includes(seccion) : false;
  };

  // ═══════════════════════════════════════════
  //  INICIALIZACIÓN
  // ═══════════════════════════════════════════

  function _ensureDefaultUser() {
    let usuarios = APP.lsGet('usuarios', null);
    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      APP.lsSet('usuarios', [USUARIO_DEFAULT]);
    }
  }

  function _normalizarRoles() {
    let usuarios = APP.lsGet('usuarios', null);
    if (!Array.isArray(usuarios)) return;
    const MAP = { 'administrador':'administrador', 'recepcionista':'recepcionista', 'mecanico':'mecanico', 'mecánico':'mecanico', 'contable':'contable', 'contador':'contable' };
    let changed = false;
    usuarios.forEach(u => {
      if (!u.rol) return;
      const norm = MAP[u.rol.toLowerCase()] || u.rol.toLowerCase();
      if (u.rol !== norm) { u.rol = norm; changed = true; }
      if (u.pin === undefined) { u.pin = '0000'; changed = true; }
    });
    if (changed) APP.lsSet('usuarios', usuarios);
  }

  function _init() {
    _ensureDefaultUser();
    _normalizarRoles();
    const sesion = APP.lsGet('sesion', null);
    if (!sesion || !sesion.usuario_id) {
      _mostrarLogin();
    } else {
      _aplicarSesion(sesion);
    }
  }

  // ═══════════════════════════════════════════
  //  PANTALLA DE LOGIN
  // ═══════════════════════════════════════════

  function _mostrarLogin() {
    // Ocultar la app principal
    const appEl = document.querySelector('.app');
    if (appEl) appEl.style.display = 'none';

    // Crear overlay si no existe
    if (document.getElementById('login-screen')) return;

    const config = APP.lsGet('config', {});
    const logoHtml = config.logo
      ? `<img src="${config.logo}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin-bottom:12px">`
      : `<div style="width:72px;height:72px;border-radius:50%;background:var(--fill-accent);display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
           <i class="ti ti-tool" style="font-size:32px;color:#fff"></i>
         </div>`;

    const screen = document.createElement('div');
    screen.id = 'login-screen';
    screen.style.cssText = 'position:fixed;inset:0;background:var(--surface-0);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;padding:24px';
    screen.innerHTML = `
      <div style="text-align:center;margin-bottom:32px">
        ${logoHtml}
        <div style="font-size:22px;font-weight:700;color:var(--text-primary)">Bienvenido a MecánicaPro</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:4px">Selecciona tu perfil para continuar</div>
      </div>
      <div id="login-users-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;max-width:640px;width:100%"></div>
      <button id="login-dev-btn" style="
        margin-top:28px;padding:8px 20px;border:1.5px dashed var(--border);border-radius:8px;
        background:transparent;color:var(--text-muted);font-size:11px;cursor:pointer;
        display:flex;align-items:center;gap:6px">
        ⚡ Entrar directamente (desarrollo)
      </button>
    `;
    document.body.appendChild(screen);
    _renderLoginUsers();
    document.getElementById('login-dev-btn')?.addEventListener('click', () => usuariosEntrarDirecto());
  }

  function _renderLoginUsers() {
    const grid = document.getElementById('login-users-grid');
    if (!grid) return;
    const usuarios = APP.lsGet('usuarios', []).filter(u => u.estado !== 'inactivo');
    grid.innerHTML = '';
    usuarios.forEach(u => {
      const inicial = (u.nombre || '?')[0].toUpperCase();
      const apellido = u.apellido ? ` ${u.apellido[0].toUpperCase()}.` : '';
      const card = document.createElement('div');
      card.style.cssText = 'background:var(--surface-1);border:1px solid var(--border);border-radius:12px;padding:20px 16px;text-align:center;cursor:pointer;transition:all .15s;user-select:none';
      card.innerHTML = `
        <div style="width:52px;height:52px;border-radius:50%;background:${u.color};
          display:flex;align-items:center;justify-content:center;margin:0 auto 10px;
          font-size:22px;font-weight:700;color:#fff">${inicial}</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${_esc(u.nombre)}${apellido}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${ROLES[u.rol] || u.rol}</div>`;
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = u.color;
        card.style.transform = 'translateY(-2px)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = '';
        card.style.transform = '';
      });
      card.addEventListener('click', () => _mostrarModalPin(u));
      grid.appendChild(card);
    });
  }

  // Expuesto globalmente para onclick inline
  window.usuariosLoginClick = function (usuarioId) {
    const usuarios = APP.lsGet('usuarios', []);
    const u = usuarios.find(x => x.id === usuarioId);
    if (!u) return;
    _mostrarModalPin(u);
  };

  function _cerrarModalPin() {
    const el = document.getElementById('pin-modal-overlay');
    if (el) el.remove();
  }

  function _mostrarModalPin(usuario) {
    const bloq = _intentos[usuario.id];
    if (bloq && bloq.hasta > Date.now()) {
      _mostrarBloqueo(usuario, bloq.hasta);
      return;
    }

    _cerrarModalPin();

    const overlay = document.createElement('div');
    overlay.id = 'pin-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:10001';
    overlay.innerHTML = `
      <div style="background:var(--surface-1);border-radius:12px;padding:0;min-width:300px;max-width:360px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.3)">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:50%;background:${usuario.color};
              display:flex;align-items:center;justify-content:center;font-size:16px;
              font-weight:700;color:#fff;flex-shrink:0">${(usuario.nombre||'?')[0].toUpperCase()}</div>
            <div>
              <div style="font-size:14px;font-weight:600">Ingresa tu PIN</div>
              <div style="font-size:11px;color:var(--text-muted)">${_esc(usuario.nombre)} — ${ROLES[usuario.rol]||usuario.rol}</div>
            </div>
          </div>
          <button onclick="_cerrarModalPinGlobal()" style="background:none;border:none;cursor:pointer;
            font-size:20px;color:var(--text-muted);padding:4px 8px;line-height:1">×</button>
        </div>
        <div style="padding:24px 20px;text-align:center">
          <div id="pin-error" style="min-height:20px;color:var(--text-danger);font-size:12px;margin-bottom:12px"></div>
          <div style="display:flex;gap:10px;justify-content:center" id="pin-inputs-wrap">
            ${[0,1,2,3].map(i => `<input id="pin-d${i}" type="password" inputmode="numeric" maxlength="1"
              autocomplete="off"
              style="width:56px;height:64px;font-size:30px;font-weight:700;text-align:center;
              border:2px solid var(--border);border-radius:8px;background:var(--surface-0);
              color:var(--text-primary);outline:none;transition:border-color .15s"
              oninput="usuariosPinInput(this,${i},'${usuario.id}')"
              onkeydown="usuariosPinKeydown(event,${i})"
              onfocus="this.style.borderColor=('${usuario.color}')"
              onblur="this.style.borderColor=''">`).join('')}
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:14px">Escribe los 4 dígitos de tu PIN</div>
        </div>
      </div>`;

    // Cerrar al hacer click fuera del modal
    overlay.addEventListener('click', e => { if (e.target === overlay) _cerrarModalPin(); });
    document.body.appendChild(overlay);
    setTimeout(() => document.getElementById('pin-d0')?.focus(), 80);
  }

  // Expuesto globalmente para el onclick inline del botón ×
  window._cerrarModalPinGlobal = _cerrarModalPin;

  window.usuariosPinInput = function (el, idx, usuarioId) {
    const val = el.value.replace(/\D/g, '');
    el.value = val ? val[0] : '';
    if (val && idx < 3) {
      document.getElementById(`pin-d${idx + 1}`)?.focus();
    }
    // Si los 4 están llenos, validar
    const pin = [0,1,2,3].map(i => document.getElementById(`pin-d${i}`)?.value || '').join('');
    if (pin.length === 4) {
      setTimeout(() => _validarPin(usuarioId, pin), 80);
    }
  };

  window.usuariosPinKeydown = function (e, idx) {
    if (e.key === 'Backspace' && !e.target.value && idx > 0) {
      const prev = document.getElementById(`pin-d${idx - 1}`);
      if (prev) { prev.value = ''; prev.focus(); }
    }
  };

  function _validarPin(usuarioId, pin) {
    const usuarios = APP.lsGet('usuarios', []);
    const u = usuarios.find(x => x.id === usuarioId);
    if (!u) return;

    if (String(u.pin) === String(pin)) {
      delete _intentos[usuarioId];
      _cerrarModalPin();
      _iniciarSesion(u);
    } else {
      // Registrar intento fallido
      if (!_intentos[usuarioId]) _intentos[usuarioId] = { count: 0, hasta: 0 };
      _intentos[usuarioId].count++;

      // Shake animation
      const wrap = document.getElementById('pin-inputs-wrap');
      if (wrap) {
        wrap.style.animation = 'none';
        wrap.offsetHeight; // reflow
        wrap.style.animation = 'pinShake .4s ease';
      }

      // Limpiar inputs
      [0,1,2,3].forEach(i => { const d = document.getElementById(`pin-d${i}`); if (d) d.value = ''; });
      setTimeout(() => document.getElementById('pin-d0')?.focus(), 50);

      const restantes = 3 - _intentos[usuarioId].count;
      const errEl = document.getElementById('pin-error');

      if (_intentos[usuarioId].count >= 3) {
        _intentos[usuarioId].hasta = Date.now() + 30000;
        _intentos[usuarioId].count = 0;
        _cerrarModalPin();
        _mostrarBloqueo(u, _intentos[usuarioId].hasta);
      } else {
        if (errEl) errEl.textContent = `PIN incorrecto. ${restantes} intento${restantes !== 1 ? 's' : ''} restante${restantes !== 1 ? 's' : ''}.`;
      }
    }
  }

  function _mostrarBloqueo(usuario, hasta) {
    const actualizar = () => {
      const el = document.getElementById('pin-bloqueo-contador');
      if (!el) return;
      const segs = Math.ceil((hasta - Date.now()) / 1000);
      if (segs <= 0) {
        const overlay = document.getElementById('login-bloqueo-overlay');
        if (overlay) overlay.remove();
        _mostrarModalPin(usuario);
        return;
      }
      el.textContent = `Intenta en ${segs}s…`;
      setTimeout(actualizar, 1000);
    };

    // Mostrar sobre la pantalla de login
    const existing = document.getElementById('login-bloqueo-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'login-bloqueo-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:10001';
    overlay.innerHTML = `
      <div style="background:var(--surface-1);border-radius:12px;padding:32px 28px;text-align:center;max-width:280px">
        <i class="ti ti-lock" style="font-size:36px;color:var(--text-danger);display:block;margin-bottom:12px"></i>
        <div style="font-size:15px;font-weight:600;margin-bottom:6px">Acceso bloqueado</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Demasiados intentos fallidos</div>
        <div id="pin-bloqueo-contador" style="font-size:16px;font-weight:700;color:var(--text-danger)"></div>
      </div>`;
    document.body.appendChild(overlay);
    actualizar();
  }

  function _iniciarSesion(usuario) {
    const sesion = {
      usuario_id:  usuario.id,
      nombre:      usuario.nombre,
      apellido:    usuario.apellido || '',
      rol:         (usuario.rol || '').toLowerCase(),
      color:       usuario.color,
      fecha_login: Date.now(),
    };
    APP.lsSet('sesion', sesion);
    _aplicarSesion(sesion);
  }

  function _aplicarSesion(sesion) {
    // Quitar pantalla de login
    const loginEl = document.getElementById('login-screen');
    if (loginEl) loginEl.remove();

    // Mostrar la app
    const appEl = document.querySelector('.app');
    if (appEl) appEl.style.display = '';

    // Actualizar sidebar footer (usuario activo)
    _actualizarHeaderUsuario(sesion);

    // Aplicar permisos al menú
    _aplicarPermisosMeniu(sesion.rol);
  }

  function _actualizarHeaderUsuario(sesion) {
    const sf = document.querySelector('.sf');
    if (!sf) return;
    const inicial = (sesion.nombre || '?')[0].toUpperCase();
    const apellido = sesion.apellido ? ` ${sesion.apellido[0].toUpperCase()}.` : '';
    const rolLabel = ROLES[sesion.rol] || sesion.rol;
    sf.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 8px">
        <div class="av" style="background:${sesion.color};color:#fff;flex-shrink:0">${inicial}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(sesion.nombre)}${apellido}</div>
          <div style="font-size:10px;color:var(--text-muted)">${rolLabel}</div>
        </div>
        <button class="btn" onclick="usuariosCerrarSesion()" title="Cerrar sesión"
          style="padding:4px 6px;font-size:11px;flex-shrink:0">
          <i class="ti ti-logout"></i>
        </button>
      </div>`;
  }

  function _aplicarPermisosMeniu(rol) {
    const rolNorm = (rol || '').toLowerCase();
    if (rolNorm === 'administrador') return; // ve todo

    // Items del menú y la sección a la que corresponden
    const menuPermisos = {
      dashboard:   ['recepcionista','contable'],
      agenda:      ['recepcionista'],
      ot:          ['recepcionista','mecanico'],
      clientes:    ['recepcionista'],
      wiki:        [],
      servicios:   ['recepcionista'],
      inventario:  [],
      proveedores: [],
      residuos:    [],
      contable:    ['contable'],
      facturacion: ['contable'],
      fidelizacion:[],
      redes:       [],
      reportes:    ['contable'],
      config:      [],
    };

    document.querySelectorAll('.ni[onclick]').forEach(ni => {
      const match = (ni.getAttribute('onclick') || '').match(/nav\('([^']+)'/);
      if (!match) return;
      const seccion = match[1];
      const permitido = menuPermisos[seccion];
      if (permitido === undefined) return;
      ni.style.display = (permitido.includes(rolNorm)) ? '' : 'none';
    });

    // Ocultar separadores de sección vacíos
    document.querySelectorAll('.ns').forEach(ns => {
      let sib = ns.nextElementSibling;
      let alguno = false;
      while (sib && !sib.classList.contains('ns')) {
        if (sib.classList.contains('ni') && sib.style.display !== 'none') alguno = true;
        sib = sib.nextElementSibling;
      }
      ns.style.display = alguno ? '' : 'none';
    });
  }

  // ─── Entrada directa (desarrollo) ───
  window.usuariosEntrarDirecto = function () {
    _ensureDefaultUser();
    const usuarios = APP.lsGet('usuarios', []);
    const u = usuarios.find(x => (x.rol || '').toLowerCase() === 'administrador') || usuarios[0];
    if (u) _iniciarSesion(u);
  };

  // ─── Cerrar sesión ───
  window.usuariosCerrarSesion = function () {
    APP.lsSet('sesion', null);
    // Restaurar menú
    document.querySelectorAll('.ni,.ns').forEach(el => el.style.display = '');
    _mostrarLogin();
  };

  // ═══════════════════════════════════════════
  //  SECCIÓN USUARIOS EN ADMIN
  // ═══════════════════════════════════════════

  window.admUsuariosRender = function () {
    const tbody = document.getElementById('adm-usu-tbody');
    if (!tbody) return;
    const usuarios = APP.lsGet('usuarios', []);
    if (!usuarios.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">Sin usuarios.</td></tr>`;
      return;
    }
    tbody.innerHTML = usuarios.map(u => {
      const inicial = (u.nombre||'?')[0].toUpperCase();
      const estadoBadge = u.estado !== 'inactivo'
        ? `<span style="background:var(--fill-success);color:#fff;padding:2px 8px;border-radius:20px;font-size:10px">Activo</span>`
        : `<span style="background:var(--border);color:var(--text-muted);padding:2px 8px;border-radius:20px;font-size:10px">Inactivo</span>`;
      return `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:28px;height:28px;border-radius:50%;background:${u.color};
              display:flex;align-items:center;justify-content:center;font-size:12px;
              font-weight:700;color:#fff;flex-shrink:0">${inicial}</div>
            <div>
              <div style="font-size:12px;font-weight:500">${_esc(u.nombre)} ${_esc(u.apellido||'')}</div>
              ${u.rut ? `<div style="font-size:10px;color:var(--text-muted)">${_esc(u.rut)}</div>` : ''}
            </div>
          </div>
        </td>
        <td><span style="font-size:11px">${ROLES[u.rol]||u.rol}</span></td>
        <td style="font-size:11px">${u.whatsapp ? _esc(u.whatsapp) : '<span style="color:var(--text-muted)">—</span>'}</td>
        <td>${estadoBadge}</td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn" onclick="admUsuarioEditar(${u.id})" style="font-size:11px;padding:3px 8px"><i class="ti ti-pencil"></i></button>
            ${u.id !== 1 ? `<button class="btn" onclick="admUsuarioEliminar(${u.id})" style="font-size:11px;padding:3px 8px;color:var(--text-danger)"><i class="ti ti-trash"></i></button>` : ''}
          </div>
        </td>
      </tr>`;
    }).join('');
  };

  window.admUsuarioNuevo = function () {
    _abrirModalUsuario(null);
  };

  window.admUsuarioEditar = function (id) {
    const u = APP.lsGet('usuarios', []).find(x => x.id === id);
    if (u) _abrirModalUsuario(u);
  };

  function _abrirModalUsuario(u) {
    const esNuevo = !u;
    APP.modal.abrir(`
      <div class="modal-header">
        <h2>${esNuevo ? 'Agregar usuario' : 'Editar usuario'}</h2>
        <button class="modal-close" onclick="APP.modal.cerrar()">×</button>
      </div>
      <div class="modal-body" style="padding:16px 20px">
        <div class="fgrid2">
          <div class="fg"><label>Nombre <span style="color:var(--text-danger)">*</span></label>
            <input id="usu-f-nombre" placeholder="Carlos" value="${_esc(u?.nombre||'')}"></div>
          <div class="fg"><label>Apellido</label>
            <input id="usu-f-apellido" placeholder="Martínez" value="${_esc(u?.apellido||'')}"></div>
        </div>
        <div class="fgrid2">
          <div class="fg"><label>RUT</label>
            <input id="usu-f-rut" placeholder="12.345.678-9" value="${_esc(u?.rut||'')}"></div>
          <div class="fg"><label>WhatsApp</label>
            <input id="usu-f-wa" placeholder="+56912345678" value="${_esc(u?.whatsapp||'')}"></div>
        </div>
        <div class="fgrid2">
          <div class="fg"><label>Rol</label>
            <select id="usu-f-rol" style="width:100%">
              ${Object.entries(ROLES).map(([k,v]) => `<option value="${k}" ${u?.rol===k?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="fg"><label>Color</label>
            <div style="display:flex;gap:6px;align-items:center;margin-top:4px">
              <input id="usu-f-color" type="color" value="${u?.color||'#3B82F6'}"
                style="width:36px;height:36px;border:none;padding:0;cursor:pointer;border-radius:4px">
              <span style="font-size:11px;color:var(--text-muted)">Color de perfil</span>
            </div>
          </div>
        </div>
        <div class="fgrid2">
          <div class="fg"><label>PIN de acceso (4 dígitos)</label>
            <input id="usu-f-pin" type="password" inputmode="numeric" maxlength="4"
              placeholder="••••" value="${u?.pin||''}" style="letter-spacing:4px;font-size:16px"></div>
          <div class="fg"><label>Confirmar PIN</label>
            <input id="usu-f-pin2" type="password" inputmode="numeric" maxlength="4"
              placeholder="••••" style="letter-spacing:4px;font-size:16px"></div>
        </div>
        <div class="fg" style="margin-top:4px">
          <label>Estado</label>
          <select id="usu-f-estado" style="width:100%;padding:8px;margin-top:4px;border:1px solid var(--border);border-radius:4px;background:var(--surface-0);color:var(--text-primary);font-size:12px">
            <option value="activo" ${u?.estado!=='inactivo'?'selected':''}>Activo</option>
            <option value="inactivo" ${u?.estado==='inactivo'?'selected':''}>Inactivo</option>
          </select>
        </div>
        <div id="usu-f-error" style="color:var(--text-danger);font-size:12px;min-height:18px;margin-top:6px"></div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="APP.modal.cerrar()">Cancelar</button>
        <button class="btn bpa" onclick="admUsuarioGuardar(${u?.id||0})">
          <i class="ti ti-device-floppy"></i> Guardar usuario
        </button>
      </div>
    `, 'mediano');
  }

  window.admUsuarioGuardar = function (id) {
    const nombre  = (document.getElementById('usu-f-nombre')?.value || '').trim();
    const apellido= (document.getElementById('usu-f-apellido')?.value || '').trim();
    const rut     = (document.getElementById('usu-f-rut')?.value || '').trim();
    const wa      = (document.getElementById('usu-f-wa')?.value || '').trim();
    const rol     = document.getElementById('usu-f-rol')?.value || 'recepcionista';
    const color   = document.getElementById('usu-f-color')?.value || '#3B82F6';
    const pin     = (document.getElementById('usu-f-pin')?.value || '').trim();
    const pin2    = (document.getElementById('usu-f-pin2')?.value || '').trim();
    const estado = document.getElementById('usu-f-estado')?.value || 'activo';
    const errEl   = document.getElementById('usu-f-error');

    const err = m => { if (errEl) errEl.textContent = m; };

    if (!nombre) return err('El nombre es obligatorio.');
    if (pin && !/^\d{4}$/.test(pin)) return err('El PIN debe ser exactamente 4 dígitos.');
    if (pin && pin !== pin2) return err('Los PINs no coinciden.');

    let usuarios = APP.lsGet('usuarios', []);

    if (id) {
      // Editar
      usuarios = usuarios.map(u => {
        if (u.id !== id) return u;
        return {
          ...u, nombre, apellido, rut, whatsapp: wa,
          rol, color, estado,
          ...(pin ? { pin } : {}),
        };
      });
    } else {
      // Nuevo
      if (!pin) return err('El PIN es obligatorio para un usuario nuevo.');
      usuarios.push({
        id:             Date.now(),
        nombre, apellido, rut,
        whatsapp:       wa,
        rol, color, pin, estado,
        fecha_creacion: Date.now(),
      });
    }

    APP.lsSet('usuarios', usuarios);
    APP.modal.cerrar();
    admUsuariosRender();
    APP.toast.show('Usuario guardado.', 'success');
  };

  window.admUsuarioEliminar = function (id) {
    APP.modal.confirmar('¿Eliminar este usuario? Esta acción no se puede deshacer.', () => {
      let usuarios = APP.lsGet('usuarios', []).filter(u => u.id !== id);
      APP.lsSet('usuarios', usuarios);
      admUsuariosRender();
      APP.toast.show('Usuario eliminado.', 'success');
    }, 'Sí, eliminar');
  };

  // ═══════════════════════════════════════════
  //  CSS ANIMACIONES
  // ═══════════════════════════════════════════

  function _inyectarCSS() {
    if (document.getElementById('usu-css')) return;
    const style = document.createElement('style');
    style.id = 'usu-css';
    style.textContent = `
      @keyframes pinShake {
        0%,100%{transform:translateX(0)}
        20%{transform:translateX(-8px)}
        40%{transform:translateX(8px)}
        60%{transform:translateX(-6px)}
        80%{transform:translateX(6px)}
      }
    `;
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ═══════════════════════════════════════════
  //  ARRANQUE
  // ═══════════════════════════════════════════

  _inyectarCSS();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
