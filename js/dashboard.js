// ===== MÓDULO: DASHBOARD =====
function init_dashboard() {
  renderCalendario();
}

function renderCalendario() {
  const g = document.getElementById('cal-g');
  if (!g) return;
  g.innerHTML = '';
  const evs = {
    25: ['09:00 María S.', '14:00 Ana R.'],
    26: ['11:00 Jorge F.'],
    28: ['09:00 Pedro M.'],
    30: ['14:00 Carmen L.'],
  };
  for (let d = 1; d <= 30; d++) {
    const el = document.createElement('div');
    el.className = 'cal-day' + (d === 26 ? ' today' : '');
    let h = `<div class="cal-num">${d}</div>`;
    if (evs[d]) evs[d].forEach((e, i) => { h += `<div class="cal-ev${i > 0 ? ' ev-g' : ''}">${e}</div>`; });
    el.innerHTML = h;
    g.appendChild(el);
  }
}
