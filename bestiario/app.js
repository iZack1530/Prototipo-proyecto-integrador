/* Bestiario público: consulta del catálogo y calculadora reducida. */
const q = id => document.getElementById(id);
const h = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
}[c]));
const CAT = { fis: 'Físico', mag: 'Mágico', est: 'Estado' };
const FX = {
  pow: f => `Potencia ${f.m}× contra ${f.tipo}`,
  imm: f => `Inmune a ${f.tipo}`,
  res: f => `Resiste ${f.tipo} (×${f.m})`,
  cut: f => `Corta ${f.s} ${f.v}%`,
};
let catalogo = null;

/* Calcula igual que la pestaña Equilibrio, sin objetos ni estados. */
function calcDano(o) {
  const pS = S, pR = RNGs, pL = LGMODE, pA = AIX, cap = [];
  try {
    const u = mk(o.atk, { pas: '', ofe: '' }, 0),
          t = mk(o.def, { pas: '', ofe: '' }, 1);
    u.status = null;
    t.status = null;
    S = { w: '', t: [[u], [t]], a: [[0], [0]], bag: [{}, {}], over: false, n: 0 };
    AIX = null;
    LGMODE = { cap };
    const mult = o.area ? (o.m.aoe || 75) / 100 : 1;
    const d = o.m.cat === 'est' ? 0 : hit(u, t, o.m, mult, !!o.crit);
    let ty = 1;
    t.tipos.forEach(x => { ty *= gv(o.m.tipo, x); });
    return { d, ty, cap, u, t };
  } finally {
    S = pS;
    RNGs = pR;
    LGMODE = pL;
    AIX = pA;
  }
}

function nombreAtaque(id) {
  const a = A.find(x => x.id === id);
  return a ? a.nombre : id;
}

function renderCriaturas() {
  q('n-criaturas').textContent = `(${catalogo.criaturas.length})`;
  q('lista-criaturas').innerHTML = catalogo.criaturas.map(c => `
    <article class="card">
      <h3>${h(c.nombre)}</h3>
      <div><small>${h(c.especie)} · Nivel ${c.nivel}</small></div>
      <div class="chips">${c.tipos.map(t => `<span class="chip">${h(t)}</span>`).join('')}</div>
      <div class="stats">${Object.keys(c.st).map(k => `<div><small>${k.toUpperCase()}</small> <b>${c.st[k]}</b></div>`).join('')}</div>
      <div class="movs"><b>Habilidad:</b> ${h(c.hab)} — ${h(c.habd)}<br>
      <b>Ataques:</b> ${c.ataques.map(id => h(nombreAtaque(id))).join(', ')}</div>
    </article>`).join('');
}

function renderAtaques() {
  q('n-ataques').textContent = `(${catalogo.ataques.length})`;
  q('tabla-ataques').innerHTML = '<thead><tr><th>Ataque</th><th>Tipo</th><th>Categoría</th><th>Potencia</th><th>MP</th><th>Alcance</th></tr></thead><tbody>' +
    catalogo.ataques.map(a => `<tr><td>${h(a.nombre)}</td><td>${h(a.tipo)}</td><td>${h(CAT[a.cat] || a.cat)}</td><td>${a.pot}</td><td>${a.mp}</td><td>${h(a.alc)}</td></tr>`).join('') +
    '</tbody>';
}

function renderHabilidades() {
  q('n-habilidades').textContent = `(${catalogo.habilidades.length})`;
  q('tabla-habilidades').innerHTML = '<thead><tr><th>Habilidad</th><th>Efecto relevante para daño</th><th>Descripción</th></tr></thead><tbody>' +
    catalogo.habilidades.map(x => {
      const fx = (x.fx || []).map(f => FX[f.k] ? FX[f.k](f) : f.k).join('; ') || '—';
      return `<tr><td>${h(x.nombre)}</td><td>${h(fx)}</td><td>${h(x.desc)}</td></tr>`;
    }).join('') +
    '</tbody>';
}

function renderTipos() {
  const nombres = catalogo.tipos.nombres, matriz = catalogo.tipos.matriz;
  const celda = v => {
    const k = v === 0 ? 'v0' : v > 1 ? 'v2' : v < 1 ? 'v05' : '';
    return `<td class="${k}">${v}</td>`;
  };
  q('tabla-tipos').innerHTML =
    '<thead><tr><th class="rowh">Ataque \\ Defensa</th>' +
    nombres.map(t => `<th>${h(t)}</th>`).join('') + '</tr></thead><tbody>' +
    nombres.map(a => `<tr><th class="rowh">${h(a)}</th>` +
      nombres.map(d => celda(matriz[a + '>' + d] === undefined ? 1 : matriz[a + '>' + d])).join('') +
      '</tr>').join('') + '</tbody>';
}

function llenarAtaques() {
  q('c-mov').innerHTML = catalogo.ataques.map(a =>
    `<option value="${h(a.id)}">${h(a.nombre)}</option>`).join('');
}

function calcular() {
  const o = {
    atk: db.find(x => x.id === q('c-atk').value),
    def: db.find(x => x.id === q('c-def').value),
    m: A.find(x => x.id === q('c-mov').value),
    crit: false,
    area: q('c-area').checked,
  };
  if (!o.atk || !o.def || !o.m) {
    q('c-out').textContent = 'Selecciona atacante, ataque y defensor.';
    return;
  }
  const r = calcDano(o);
  const detalle = (r.cap.find(x => x.includes('Cálculo')) || '').trim();
  const golpes = r.d > 0 ? Math.ceil(r.t.maxhp / r.d) : null;
  const pct = Math.round(r.d / r.t.maxhp * 100);
  q('c-out').innerHTML = `<div class="big">${r.d}</div>
    <div class="hint">${h(o.atk.nombre)} → ${h(o.def.nombre)} con ${h(o.m.nombre)} · tipo ×${r.ty} · ${pct}% de la vida · ${golpes == null ? 'sin golpes útiles' : golpes + ' golpes'}</div>
    <div class="hint">${h(detalle) || 'Sin desglose'}</div>`;
}

function initCalc() {
  const opciones = catalogo.criaturas.map(c => `<option value="${h(c.id)}">${h(c.nombre)}</option>`).join('');
  q('c-atk').innerHTML = opciones;
  q('c-def').innerHTML = opciones;
  q('c-atk').value = 'c_tonatiuh';
  q('c-def').value = 'c_ahuizotl';
  llenarAtaques();
  q('c-mov').value = 'a_llamarada';
  ['c-atk', 'c-mov', 'c-def', 'c-area'].forEach(id => {
    q(id).addEventListener('change', calcular);
  });
  calcular();
}

function ir(nombre) {
  document.querySelectorAll('section[id^="tab-"]').forEach(s => {
    s.classList.toggle('hid', s.id !== 'tab-' + nombre);
  });
  document.querySelectorAll('#bn button').forEach(b => {
    b.classList.toggle('on', b.dataset.tab === nombre);
  });
}

q('bn').addEventListener('click', e => {
  const b = e.target.closest('button[data-tab]');
  if (b) ir(b.dataset.tab);
});

fetch('../datos/catalogo-publico.json')
  .then(r => {
    if (!r.ok) throw Error('HTTP ' + r.status);
    return r.json();
  })
  .then(c => {
    catalogo = c;
    // El catálogo publica stats resueltas; el motor necesita una base sintética
    // con la fórmula identidad para poder reutilizar mk()/hit() sin fórmulas internas.
    db = c.criaturas.map(x => ({
      ...x,
      base: { ...x.st },
      ev: { hp: 0, atk: 0, def: 0, matk: 0, mdef: 0, spd: 0 },
      f: { hp: 'B', mp: 'B', atk: 'B', def: 'B', matk: 'B', mdef: 'B', spd: 'B' },
    }));
    A = c.ataques;
    H = c.habilidades;
    M = c.tipos.matriz;
    S = { w: '', n: 1, over: false, t: [[], []], a: [[], []], bag: [{}, {}] };
    LGMODE = { cap: [] };
    AIX = null;
    renderCriaturas();
    renderAtaques();
    renderHabilidades();
    renderTipos();
    initCalc();
    const inicio = location.hash.slice(1);
    ir(['criaturas', 'ataques', 'habilidades', 'tipos', 'calculadora'].includes(inicio) ? inicio : 'criaturas');
  })
  .catch(e => {
    console.error(e);
    q('c-out').textContent = 'No se pudo cargar el catálogo público.';
  });
