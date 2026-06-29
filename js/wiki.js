// ===== WIKI TÉCNICA COLABORATIVA =====

const WIKI_MARCAS = ['Toyota', 'Hyundai', 'Chevrolet', 'Kia', 'Nissan', 'Ford', 'Volkswagen', 'Peugeot', 'Honda', 'Mazda'];

const WIKI_MODELOS_POR_MARCA = {
  'Toyota': ['Corolla', 'Camry', 'RAV4', 'Fortuner', 'Hilux', 'Yaris', 'Etios'],
  'Hyundai': ['Elantra', 'Accent', 'Santa Fe', 'Tucson', 'Creta', 'Venue'],
  'Chevrolet': ['Cruze', 'Spark', 'Beat', 'Aveo', 'Captiva', 'Equinox'],
  'Kia': ['Cerato', 'Picanto', 'Sorento', 'Sportage', 'Seltos', 'Forte'],
  'Nissan': ['Sentra', 'March', 'Qashqai', 'X-Trail', 'Almera'],
  'Ford': ['Focus', 'Fiesta', 'Fusion', 'EcoSport', 'Ecosport', 'Ranger'],
  'Volkswagen': ['Jetta', 'Passat', 'Polo', 'Golf', 'Tiguan', 'Virtus'],
  'Peugeot': ['308', '3008', '2008', '5008', 'Partner'],
  'Honda': ['Civic', 'Accord', 'CR-V', 'Fit', 'City'],
  'Mazda': ['3', '6', 'CX-5', 'CX-3', 'CX-9']
};

function wikiCargarMarcas() {
  return WIKI_MARCAS;
}

function wikiCargarModelos(marca) {
  return WIKI_MODELOS_POR_MARCA[marca] || [];
}

function wikiCargarAños() {
  const años = [];
  const actual = new Date().getFullYear();
  for (let y = 2015; y <= actual; y++) {
    años.push(y);
  }
  return años.reverse();
}

function wikiCargarContenido(tipo = 'herramientas') {
  const wiki = APP.lsGet('wiki_tecnica', {});
  return wiki[tipo] || [];
}

function wikiSetTab(tabName) {
  ['herramientas', 'especificaciones', 'torques', 'tecnica'].forEach(tab => {
    const cnt = document.getElementById('wiki-tab-' + tab);
    const btn = document.getElementById('wiki-btn-' + tab);
    if (cnt) cnt.style.display = tab === tabName ? '' : 'none';
    if (btn) {
      btn.style.borderBottomColor = tab === tabName ? 'var(--fill-accent)' : 'transparent';
      btn.style.color = tab === tabName ? 'var(--text-accent)' : 'var(--text-secondary)';
    }
  });
  wikiRenderTabla(tabName);
}

function wikiAbrirModalAgregar(tipo) {
  document.getElementById('wiki-modal-tipo-hidden').value = tipo;
  document.getElementById('wiki-modal-titulo').textContent = 'Agregar ' + tipo.slice(0, -1);

  // Limpiar campos
  document.getElementById('wiki-modal-nombre').value = '';
  document.getElementById('wiki-modal-marca').value = '';
  document.getElementById('wiki-modal-modelo').value = '';
  document.getElementById('wiki-modal-año').value = '';
  document.getElementById('wiki-modal-descripcion').value = '';
  document.getElementById('wiki-modal-valor').value = '';

  document.getElementById('wiki-modal-agregar').style.display = '';
}

function wikiCerrarModalAgregar() {
  document.getElementById('wiki-modal-agregar').style.display = 'none';
}

function wikiGuardarAgregar() {
  const tipo = document.getElementById('wiki-modal-tipo-hidden').value;
  const nombre = document.getElementById('wiki-modal-nombre').value.trim();
  const marca = document.getElementById('wiki-modal-marca').value;
  const modelo = document.getElementById('wiki-modal-modelo').value;
  const año = document.getElementById('wiki-modal-año').value;
  const descripcion = document.getElementById('wiki-modal-descripcion').value.trim();
  const valor = document.getElementById('wiki-modal-valor').value;

  if (!nombre) {
    APP.toast.show('⚠️ El nombre es obligatorio', 'warning');
    return;
  }

  const wiki = APP.lsGet('wiki_tecnica', {});
  if (!wiki[tipo]) wiki[tipo] = [];

  const item = {
    id: 'wiki-' + tipo + '-' + Date.now(),
    nombre,
    marca: marca || '',
    modelo: modelo || '',
    año: año || '',
    descripcion,
    valor,
    calificacion: 0,
    votos: [],
    comentarios: [],
    creado: new Date().toISOString(),
    autor: 'Sistema'
  };

  wiki[tipo].push(item);
  APP.lsSet('wiki_tecnica', wiki);

  wikiCerrarModalAgregar();
  wikiRenderTabla(tipo);
  APP.toast.show('✅ ' + nombre + ' agregado a wiki', 'success');
}

function wikiAbrirModalCalificar(id) {
  document.getElementById('wiki-modal-calif-id-hidden').value = id;
  document.getElementById('wiki-modal-calif-calificacion').value = '5';
  document.getElementById('wiki-modal-calif-motivo').value = '';
  document.getElementById('wiki-modal-calif-comentario').value = '';
  document.getElementById('wiki-modal-calif').style.display = '';
}

function wikiCerrarModalCalificar() {
  document.getElementById('wiki-modal-calif').style.display = 'none';
}

function wikiGuardarCalificacion() {
  const id = document.getElementById('wiki-modal-calif-id-hidden').value;
  const calificacion = parseInt(document.getElementById('wiki-modal-calif-calificacion').value);
  const motivo = document.getElementById('wiki-modal-calif-motivo').value.trim();
  const comentario = document.getElementById('wiki-modal-calif-comentario').value.trim();

  const wiki = APP.lsGet('wiki_tecnica', {});
  let item = null;
  let tipo = null;

  for (let t in wiki) {
    item = wiki[t].find(i => i.id === id);
    if (item) {
      tipo = t;
      break;
    }
  }

  if (!item) {
    APP.toast.show('⚠️ Item no encontrado', 'warning');
    return;
  }

  const voto = {
    calificacion,
    motivo,
    comentario,
    fecha: new Date().toISOString(),
    usuario: 'Técnico'
  };

  if (!item.votos) item.votos = [];
  item.votos.push(voto);

  // Calcular promedio
  const suma = item.votos.reduce((s, v) => s + v.calificacion, 0);
  item.calificacion = Math.round((suma / item.votos.length) * 10) / 10;

  APP.lsSet('wiki_tecnica', wiki);
  wikiCerrarModalCalificar();
  wikiRenderTabla(tipo);
  APP.toast.show('✅ Calificación guardada', 'success');
}

function wikiRenderTabla(tipo) {
  const items = wikiCargarContenido(tipo);
  const container = document.getElementById('wiki-tabla-' + tipo);
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Sin información registrada</div>';
    return;
  }

  const cols = tipo === 'herramientas' ? '150px 1fr 100px 100px 80px' : '120px 1fr 100px 80px';
  const html = `
    <div style="background:var(--surface-2);border:0.5px solid var(--border);border-radius:var(--radius);overflow:hidden">
      <div style="display:grid;grid-template-columns:${cols};gap:8px;padding:10px 14px;font-size:10px;color:var(--text-muted);font-weight:500;text-transform:uppercase;background:var(--surface-1);border-bottom:0.5px solid var(--border)">
        ${tipo === 'herramientas' ? '<span>Herramienta</span>' : '<span>Especificación</span>'}
        <span>Descripción</span>
        <span style="text-align:center">Cal.</span>
        <span style="text-align:center">Votos</span>
        <span style="text-align:center">Acciones</span>
      </div>
      ${items.map(item => `
        <div style="display:grid;grid-template-columns:${cols};gap:8px;padding:10px 14px;align-items:center;font-size:11px;border-bottom:0.5px solid var(--border)">
          <span style="font-weight:500">${item.nombre}</span>
          <span style="color:var(--text-secondary)">${item.descripcion || '—'}</span>
          <span style="text-align:center;font-weight:500">${item.calificacion || '—'}</span>
          <span style="text-align:center;color:var(--text-muted)">${(item.votos || []).length}</span>
          <div style="display:flex;gap:4px;justify-content:center">
            <button class="btn" style="font-size:10px;padding:3px 6px" onclick="wikiAbrirModalCalificar('${item.id}')"><i class="ti ti-star"></i></button>
            <button class="btn" style="font-size:10px;padding:3px 6px;color:var(--text-danger)" onclick="wikiEliminar('${item.id}','${tipo}')"><i class="ti ti-trash"></i></button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  container.innerHTML = html;
}

function wikiEliminar(id, tipo) {
  if (!confirm('¿Eliminar este item de la wiki?')) return;
  const wiki = APP.lsGet('wiki_tecnica', {});
  wiki[tipo] = wiki[tipo].filter(i => i.id !== id);
  APP.lsSet('wiki_tecnica', wiki);
  wikiRenderTabla(tipo);
  APP.toast.show('✅ Item eliminado', 'success');
}

// Inicialización: crear datos de ejemplo si no existen
function wikiInicializar() {
  const wiki = APP.lsGet('wiki_tecnica', null);
  if (wiki === null) {
    const wikiDefault = {
      herramientas: [
        {id:'wiki-h-1',nombre:'Llave dinamométrica',descripcion:'0-100 Nm, precision ±4%',calificacion:5,votos:[],comentarios:[],creado:new Date().toISOString(),autor:'Sistema'},
        {id:'wiki-h-2',nombre:'Escáner OBD2',descripcion:'Diagnóstico códigos error',calificacion:5,votos:[],comentarios:[],creado:new Date().toISOString(),autor:'Sistema'}
      ],
      especificaciones: [
        {id:'wiki-e-1',nombre:'Corolla Sincronía motor',descripcion:'1.8L 2ZR-FE, 140 hp @ 6400 rpm',marca:'Toyota',modelo:'Corolla',año:2020,calificacion:5,votos:[],comentarios:[],creado:new Date().toISOString(),autor:'Sistema'}
      ],
      torques: [
        {id:'wiki-t-1',nombre:'Cabeza cilindros Corolla',descripcion:'Secuencia: 1-3-5 / 2-4-6',valor:'80 Nm',calificacion:5,votos:[],comentarios:[],creado:new Date().toISOString(),autor:'Sistema'}
      ],
      tecnica: [
        {id:'wiki-tc-1',nombre:'Cambio correa distribución',descripcion:'Reemplazo cada 100.000 km',marca:'Toyota',modelo:'Corolla',año:2020,calificacion:4.5,votos:[],comentarios:[],creado:new Date().toISOString(),autor:'Sistema'}
      ]
    };
    APP.lsSet('wiki_tecnica', wikiDefault);
  }
}

// Exportar al window
window.wikiCargarMarcas = wikiCargarMarcas;
window.wikiCargarModelos = wikiCargarModelos;
window.wikiCargarAños = wikiCargarAños;
window.wikiCargarContenido = wikiCargarContenido;
window.wikiSetTab = wikiSetTab;
window.wikiAbrirModalAgregar = wikiAbrirModalAgregar;
window.wikiCerrarModalAgregar = wikiCerrarModalAgregar;
window.wikiGuardarAgregar = wikiGuardarAgregar;
window.wikiAbrirModalCalificar = wikiAbrirModalCalificar;
window.wikiCerrarModalCalificar = wikiCerrarModalCalificar;
window.wikiGuardarCalificacion = wikiGuardarCalificacion;
window.wikiRenderTabla = wikiRenderTabla;
window.wikiEliminar = wikiEliminar;
window.wikiInicializar = wikiInicializar;
