// main-selectores.js — Selectores inteligentes reutilizables para MecánicaPro

// ─── Datos predefinidos ────────────────────────────────────────────────────
APP.datos = {

  tiposVehiculo: [
    "Automóvil","Camioneta","SUV","Furgón",
    "Bus","Camión","Moto","Bicicleta",
    "Bici/Moto Eléctrica","Autobus","Campero",
    "Autohormigonera","Barredora",
    "Brazo Articulado","Cargador Frontal"
  ],

  marcasVehiculo: [
    "Abarth","Alfa Romeo","Audi","BRP","CHANA",
    "Chery","Chevrolet","Citroën","Daewoo","Fiat",
    "Ford","Geely","Great Wall","Honda","Hyundai",
    "JAC","Jeep","Kia","Lifan","Mazda",
    "Mercedes-Benz","MG","Mini","Mitsubishi",
    "Nissan","Peugeot","RAM","Renault","Seat",
    "Skoda","Subaru","Suzuki","Toyota",
    "Volkswagen","Volvo","ZNA"
  ],

  aniosVehiculo: (function() {
    const anios = [];
    const actual = new Date().getFullYear();
    for (let a = actual; a >= 1970; a--) anios.push(String(a));
    return anios;
  })(),

  combustibles: [
    "Gasolina","Diésel","Gas (GLP)","Gas (GNC)",
    "Híbrido","Eléctrico","Hidrógeno"
  ],

  transmisiones: [
    "Manual","Automática","CVT","Semiautomática","Doble embrague"
  ],

  nivelesCarburante: [
    "Vacío","1/8","1/4","3/8","1/2","5/8","3/4","7/8","Lleno"
  ],

  procedimientos: [
    "Diagnóstico","Mantenimiento","Reparación"
  ],

  metodosAprobacion: [
    "WhatsApp","Verbal","Email","Presencial"
  ],

  metodosPago: [
    "Efectivo","Tarjeta débito","Tarjeta crédito",
    "Transferencia","Pendiente"
  ]
};

// ─── Función principal ────────────────────────────────────────────────────
APP.crearSelector = function(config) {
  /*
  config = {
    contenedor     : elemento DOM donde insertar,
    placeholder    : texto por defecto,
    opciones       : [{valor, etiqueta, extra}],
    conBuscador    : true/false,
    permitirNuevo  : true/false,
    textoNuevo     : "+ Agregar nuevo",
    valorActual    : valor pre-seleccionado,
    onSeleccionar  : function(valor, etiqueta),
    onNuevo        : function(texto)
  }
  */

  const placeholder = config.placeholder || 'Seleccionar...';
  const textoNuevo  = config.textoNuevo  || '+ Agregar nuevo';
  let   valorSel    = config.valorActual || null;
  let   etiquetaSel = '';

  // Etiqueta inicial si hay valor preseleccionado
  if (valorSel && config.opciones) {
    const op = config.opciones.find(o => String(o.valor) === String(valorSel));
    if (op) etiquetaSel = op.etiqueta;
  }

  // Estructura HTML
  const wrap = document.createElement('div');
  wrap.className = 'smart-select';

  const trigger = document.createElement('div');
  trigger.className = 'smart-select-input';
  trigger.setAttribute('tabindex', '0');
  trigger.innerHTML = `
    <span class="ss-label">${etiquetaSel || placeholder}</span>
    <span style="font-size:10px;color:var(--text-secondary)">▼</span>
  `;

  const dropdown = document.createElement('div');
  dropdown.className = 'smart-select-dropdown';
  dropdown.style.display = 'none';

  // Buscador
  let searchInput = null;
  if (config.conBuscador) {
    const searchWrap = document.createElement('div');
    searchWrap.className = 'smart-select-search';
    searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Buscar...';
    searchInput.autocomplete = 'off';
    searchWrap.appendChild(searchInput);
    dropdown.appendChild(searchWrap);
  }

  // Lista de opciones
  const list = document.createElement('div');
  list.className = 'smart-select-options';
  dropdown.appendChild(list);

  // Botón "Agregar nuevo"
  let btnNuevo = null;
  if (config.permitirNuevo) {
    btnNuevo = document.createElement('div');
    btnNuevo.className = 'smart-select-add';
    btnNuevo.textContent = textoNuevo;
    dropdown.appendChild(btnNuevo);
  }

  wrap.appendChild(trigger);
  wrap.appendChild(dropdown);
  config.contenedor.appendChild(wrap);

  // ── Renderizar opciones ───────────────────────────────────────
  function renderOpciones(filtro) {
    list.innerHTML = '';
    const ops = (config.opciones || []).filter(o => {
      if (!filtro) return true;
      const f = filtro.toLowerCase();
      return (o.etiqueta || '').toLowerCase().includes(f) ||
             (o.extra    || '').toLowerCase().includes(f);
    });

    if (!ops.length) {
      const empty = document.createElement('div');
      empty.className = 'smart-select-empty';
      empty.textContent = filtro ? 'Sin resultados' : 'Sin opciones';
      list.appendChild(empty);
      return;
    }

    ops.forEach(op => {
      const item = document.createElement('div');
      item.className = 'smart-select-option' +
        (String(op.valor) === String(valorSel) ? ' selected' : '');
      item.dataset.valor = op.valor;

      let html = `<span>${op.etiqueta}</span>`;
      if (op.extra) html += `<span style="margin-left:auto;font-size:11px;color:var(--text-secondary)">${op.extra}</span>`;
      item.innerHTML = html;

      item.addEventListener('click', () => seleccionar(op.valor, op.etiqueta));
      list.appendChild(item);
    });
  }

  // ── Abrir / cerrar ────────────────────────────────────────────
  let abierto = false;

  function abrir() {
    if (abierto) return;
    abierto = true;
    dropdown.style.display = 'flex';
    trigger.classList.add('open');
    renderOpciones(searchInput ? searchInput.value : '');
    if (searchInput) {
      searchInput.value = '';
      setTimeout(() => searchInput.focus(), 50);
    }
    // Cerrar al click fuera
    setTimeout(() => document.addEventListener('click', clickFuera), 0);
  }

  function cerrar() {
    if (!abierto) return;
    abierto = false;
    dropdown.style.display = 'none';
    trigger.classList.remove('open');
    document.removeEventListener('click', clickFuera);
  }

  function clickFuera(e) {
    if (!wrap.contains(e.target)) cerrar();
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    abierto ? cerrar() : abrir();
  });

  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abierto ? cerrar() : abrir(); }
    if (e.key === 'Escape') cerrar();
    if (e.key === 'ArrowDown') { e.preventDefault(); abrir(); moverFoco(1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); abrir(); moverFoco(-1); }
  });

  // ── Teclado en buscador ───────────────────────────────────────
  if (searchInput) {
    searchInput.addEventListener('input', () => renderOpciones(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cerrar();
      if (e.key === 'ArrowDown') { e.preventDefault(); moverFoco(1); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); moverFoco(-1); }
      if (e.key === 'Enter') {
        const focusado = list.querySelector('.smart-select-option:focus');
        if (focusado) focusado.click();
        else if (config.permitirNuevo && searchInput.value.trim()) {
          crearNuevo(searchInput.value.trim());
        }
      }
    });
  }

  // ── Navegación con flechas ───────────────────────────────────
  function moverFoco(dir) {
    const items = [...list.querySelectorAll('.smart-select-option')];
    if (!items.length) return;
    const actual = items.indexOf(document.activeElement);
    let siguiente = actual + dir;
    if (siguiente < 0) siguiente = items.length - 1;
    if (siguiente >= items.length) siguiente = 0;
    items[siguiente].setAttribute('tabindex', '0');
    items[siguiente].focus();
    items.forEach((it, i) => { if (i !== siguiente) it.removeAttribute('tabindex'); });
  }

  // ── Seleccionar ───────────────────────────────────────────────
  function seleccionar(valor, etiqueta) {
    valorSel    = valor;
    etiquetaSel = etiqueta;
    trigger.querySelector('.ss-label').textContent = etiqueta;
    cerrar();
    if (typeof config.onSeleccionar === 'function') {
      config.onSeleccionar(valor, etiqueta);
    }
  }

  // ── Crear nuevo ───────────────────────────────────────────────
  function crearNuevo(texto) {
    cerrar();
    if (typeof config.onNuevo === 'function') config.onNuevo(texto);
  }

  if (btnNuevo) {
    btnNuevo.addEventListener('click', () => {
      const texto = searchInput ? searchInput.value.trim() : '';
      crearNuevo(texto);
    });
  }

  // ── API pública ───────────────────────────────────────────────
  return {
    getValor()          { return valorSel; },
    getEtiqueta()       { return etiquetaSel; },
    setValor(v, e)      { seleccionar(v, e || v); },
    setOpciones(ops)    { config.opciones = ops; if (abierto) renderOpciones(searchInput ? searchInput.value : ''); },
    reset()             { valorSel = null; etiquetaSel = ''; trigger.querySelector('.ss-label').textContent = placeholder; },
    destroy()           { cerrar(); wrap.remove(); }
  };
};

// ─── Helper: construir opciones desde lista de strings ─────────────────────
APP.opcionesDesdeArray = function(arr) {
  return arr.map(s => ({ valor: s, etiqueta: s }));
};

// ─── Helper: construir opciones desde objetos con id/nombre ───────────────
APP.opcionesDesdeObjetos = function(arr, campoValor, campoEtiqueta, campoExtra) {
  return (arr || []).map(o => ({
    valor:   o[campoValor],
    etiqueta: o[campoEtiqueta] || o[campoValor],
    extra:   campoExtra ? o[campoExtra] : undefined
  }));
};
