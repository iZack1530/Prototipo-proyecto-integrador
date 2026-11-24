// Genera laboratorio/pruebas/casos_prueba.json con vectores del motor JS.
// Sin dependencias: carga motor.js en vm con un DOM mínimo y datos_prueba.json.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..');
const rutaMotor = path.join(raiz, 'assets/js/laboratorio/motor.js');
const rutaDatos = path.join(raiz, 'datos_prueba.json');
const rutaSalida = path.join(raiz, 'laboratorio/pruebas/casos_prueba.json');

const red = (v, d = 10) => Number(Number(v).toFixed(d));

// --- DOM mínimo: solo para que el motor termine su inicialización ---
function elemento() {
  const e = {
    innerHTML: '', textContent: '', value: '', checked: false, scrollTop: 0,
    style: {},
    dataset: new Proxy({}, { get: (t, p) => (p in t ? t[p] : '0'), set: (t, p, v) => (t[p] = v, true) }),
    options: [], children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(x) { return x; }, append() {}, remove() {}, insertBefore(x) { return x; },
    addEventListener() {}, removeEventListener() {}, setAttribute() {},
    getAttribute() { return null; }, querySelector: () => elemento(),
    querySelectorAll: () => new Array(8).fill(0).map(() => elemento()),
    focus() {}, click() {}, closest() { return null; },
  };
  return new Proxy(e, {
    get(t, p) {
      if (p in t) return t[p];
      if (['parentNode', 'nextElementSibling', 'previousElementSibling', 'firstChild',
        'lastChild', 'nextSibling', 'offsetParent'].includes(p)) return elemento();
      return () => {};
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}
const almacen = new Map();
const contexto = vm.createContext({
  document: {
    documentElement: elemento(), body: elemento(), head: elemento(),
    getElementById: () => elemento(), querySelector: () => elemento(),
    querySelectorAll: () => new Array(8).fill(0).map(() => elemento()),
    createElement: () => elemento(), addEventListener() {}, removeEventListener() {},
  },
  console,
  localStorage: {
    getItem: k => (almacen.has(k) ? almacen.get(k) : null),
    setItem: (k, v) => almacen.set(k, String(v)),
    removeItem: k => almacen.delete(k),
  },
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  performance: { now: () => 0 }, scrollTo() {}, scrollBy() {},
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  requestAnimationFrame: () => 0,
  location: { href: '', hash: '', search: '', reload() {} },
  navigator: { userAgent: '' },
  URL: { createObjectURL: () => '', revokeObjectURL() {} },
  Blob: class {}, Image: class {}, Audio: class {},
});
contexto.window = contexto;
contexto.self = contexto;
vm.runInContext(fs.readFileSync(rutaMotor, 'utf8'), contexto, { filename: 'motor.js' });

const evaluar = codigo => vm.runInContext(codigo, contexto);
const datos = JSON.parse(fs.readFileSync(rutaDatos, 'utf8'));
contexto.__datos = datos;
evaluar('db=__datos.criaturas;A=__datos.ataques;H=__datos.habilidades;arena=()=>{};');
const j = valor => JSON.stringify(valor);

// --- RNG: semilla «paridad» a 10 decimales ---
const semilla = 'paridad';
const rngValores = evaluar(`seedRng(${j(semilla)});[rng(),rng(),rng()]`).map(v => red(v));
const grupoRng = {
  orden: 'rng',
  casos: [{ semilla, decimales: 10, valores: rngValores }],
};

// --- Estadísticas: evaluador de fórmulas del motor para las 12 criaturas ---
const grupoEstadisticas = {
  orden: 'estadisticas',
  casos: datos.criaturas.map(c => {
    const esperado = evaluar(`(()=>{const c=db.find(x=>x.id===${j(c.id)}),o={};
      STATS.forEach(s=>{const E=s.k==='mp'?0:(c.ev[s.k]||0),v=calc(c.f[s.k],c.base[s.k],c.nivel,E);
      o[s.k]=Math.max(1,Math.round(isNaN(v)?1:v))});return o})()`);
    return {
      id: c.id, nombre: c.nombre, nivel: c.nivel,
      base: c.base, ev: c.ev, formulas: c.f, esperado,
    };
  }),
};

// --- Costes: STAB (−10 %, mínimo 1) frente a tipo neutro ---
const conAtaques = datos.ataques.filter(a => a.mp > 0 && a.tipo !== 'Neutro');
const grupoCostes = {
  orden: 'costes',
  casos: conAtaques.slice(0, 10).map(a => {
    const calculado = evaluar(`(()=>{const u=mk(db[0],{pas:'',ofe:''},0),m=A.find(x=>x.id===${j(a.id)});
      return{con:cost(u,m),sin:cost(Object.assign({},u,{tipos:['Neutro']}),m)}})()`);
    return {
      id: a.id, ataque: a.nombre, tipo: a.tipo, mp: a.mp,
      usuario: datos.criaturas[0].id, esperado: calculado,
    };
  }),
};

// --- Daño: hit() del motor con semilla fija, tabla de tipos por defecto ---
const pares = [
  [0, 1, 0, false, 1], [0, 2, 0, false, 0.75], [1, 0, 0, false, 1],
  [2, 3, 0, true, 1], [3, 4, 0, false, 1], [4, 5, 0, false, 0.75],
];
const grupoDano = {
  orden: 'dano',
  casos: pares.map(([ia, id, im, critico, multiplicador]) => {
    const at = datos.criaturas[ia], def = datos.criaturas[id];
    const ataques = at.atk.map(x => datos.ataques.find(a => a.id === x)).filter(Boolean);
    const m = ataques[im % ataques.length] || datos.ataques[0];
    const semillaCaso = `dano:${ia}:${id}:${m.id}`;
    const res = evaluar(`(()=>{
      const u=mk(db[${ia}],{pas:'',ofe:''},0),t=mk(db[${id}],{pas:'',ofe:''},1);
      S={n:1,w:'',over:false,tl:[],calcs:[],names:['Atacante','Defensor'],
         t:[null,null],a:[[0],[0]],bag:[{},{}]};
      S.t[0]=[u];S.t[1]=[t];LGMODE=null;seedRng(${j(semillaCaso)});
      const d=hit(u,t,A.find(x=>x.id===${j(m.id)}),${multiplicador},${critico});
      const c=S.calcs[0]||{};return{d,datos:c};})()`);
    const calculo = {};
    for (const [k, v] of Object.entries(res.datos)) calculo[k] = typeof v === 'number' ? red(v) : v;
    return {
      semilla: semillaCaso, atacante: at.id, defensor: def.id, ataque: m.id,
      multiplicador, critico, danio: res.d, calculo,
    };
  }),
};

// --- Efectos: un caso por cada tipo de efecto con probabilidad 100 % ---
const clasesEfecto = ['boost', 'lifesteal', 'mpsteal', 'status', 'trap', 'recoil'];
const grupoEfectos = {
  orden: 'efectos',
  casos: clasesEfecto.map(clase => {
    const ataque = datos.ataques.find(a => a.fx.some(f => f.k === clase && f.p === 100));
    const semillaCaso = `efecto:${clase}`;
    const res = evaluar(`(()=>{
      const u=mk(db[0],{pas:'',ofe:''},0),t=mk(db[1],{pas:'',ofe:''},1);
      u.hp=Math.floor(u.maxhp*.6);t.hp=Math.floor(t.maxhp*.8);t._real=100;
      S={n:1,w:'',over:false,tl:[],calcs:[],names:['Atacante','Defensor'],
         t:[null,null],a:[[0],[0]],bag:[{},{}]};S.t[0]=[u];S.t[1]=[t];
      LGMODE={cap:[]};seedRng(${j(semillaCaso)});
      const m=A.find(x=>x.id===${j(ataque.id)});fx(u,m,[t],100,0,'1:0');
      const estado=e=>({hp:e.hp,mp:e.mp,status:e.status,trap:e.trap,bo:e.bo,guards:e.guards||[]});
      return{logs:LGMODE.cap.slice(),u:estado(u),t:estado(t)};})()`);
    return {
      semilla: semillaCaso, ataque: ataque.id, efecto: clase,
      eventos: res.logs, resultado: { atacante: res.u, defensor: res.t },
    };
  }),
};

// --- Repeticiones: semilla + acciones + eventos, reproducidos por turn4() ---
const equipos = [[0, 1], [3, 4]].map(par => par.map(i => datos.criaturas[i].id));
const semillaRep = 'repeticion-v5';
const acciones = [];
for (let turno = 0; turno < 3; turno++) {
  acciones.push([0, 1].map(s => [0, 1].map(pos => {
    if (turno === 0 && s === 1 && pos === 1) return { t: 'pr' };
    const atacante = datos.criaturas.find(c => c.id === equipos[s][pos]);
    return { t: 'atk', m: atacante.atk[turno % atacante.atk.length], tg: `${1 - s}:0` };
  })));
}
contexto.__acciones = acciones;
contexto.__equipos = equipos;
evaluar(`AIX=(s,pos)=>{const u=S.t[s][S.a[s][pos]],p=__acciones[S.n-1][s][pos];
  if(p.t==='atk'){const m=u.mv.find(x=>x.id===p.m)||u.mv[0];
    return{t:'atk',m:m?m.id:'',tg:p.tg,it:'',ia:'',sw:'',pv:''}}
  return{t:p.t,m:'',tg:'0:0',it:'',ia:'',sw:'',pv:''}};`);
const repeticion = evaluar(`(()=>{
  seedRng(${j(semillaRep)});LGMODE={cap:[]};AIX=AIX;
  S={n:0,over:false,busy:false,w:'',seed:${j(semillaRep)},tl:[],rec:{},calcs:[],
     names:['Equipo A','Equipo B'],t:[[],[]],a:[[0,1],[0,1]],
     bag:[{Poción:3,'Éter':2,Antídoto:2},{Poción:3,'Éter':2,Antídoto:2}]};
  for(let i=0;i<2;i++)for(let s=0;s<2;s++)S.t[s].push(mk(db.find(c=>c.id===__equipos[s][i]),{pas:'',ofe:''},s));
  const turnos=[];
  for(let k=0;k<${acciones.length};k++){
    if(S.over)break;LGMODE.cap.length=0;turn4();
    turnos.push({n:S.n,eventos:LGMODE.cap.slice(),estado:snap()});
  }
  return{turnos,acciones:S.rec,final:{over:!!S.over,n:S.n}};})()`);
const grupoRepeticiones = {
  orden: 'repeticiones',
  casos: [{
    semilla: semillaRep, equipos, acciones,
    turnos: repeticion.turnos, final: repeticion.final,
  }],
};

const salida = {
  esquema: 1,
  origen: { datos: 'datos_prueba.json', motor: 'assets/js/laboratorio/motor.js', version: datos.version },
  grupos: [grupoRng, grupoEstadisticas, grupoCostes, grupoDano, grupoEfectos, grupoRepeticiones],
};
fs.mkdirSync(path.dirname(rutaSalida), { recursive: true });
fs.writeFileSync(rutaSalida, JSON.stringify(salida, null, 2) + '\n');
console.log(`${path.relative(raiz, rutaSalida)}: ${salida.grupos.length} grupos, ` +
  salida.grupos.map(g => `${g.orden}=${g.casos.length}`).join(' '));
