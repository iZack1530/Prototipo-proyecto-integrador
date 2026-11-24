// Genera datos/catalogo-publico.json a partir de datos_prueba.json.
// Usa el motor real para resolver las stats finales; no publica fórmulas,
// esfuerzo, bases ni reglas internas de equilibrio.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..');
const rutaMotor = path.join(raiz, 'assets/js/laboratorio/motor.js');
const rutaDatos = path.join(raiz, 'datos_prueba.json');
const rutaSalida = path.join(raiz, 'datos/catalogo-publico.json');

// DOM mínimo: el motor solo necesita completar f2load() al cargarse.
function elemento() {
  const e = {
    innerHTML: '', textContent: '', value: '', checked: false, style: {},
    dataset: new Proxy({}, { get: (t, p) => (p in t ? t[p] : '0'), set: (t, p, v) => (t[p] = v, true) }),
    options: [], children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(x) { return x; }, append() {}, remove() {}, insertBefore(x) { return x; },
    addEventListener() {}, removeEventListener() {}, setAttribute() {},
    getAttribute() { return null; }, querySelector: () => elemento(),
    querySelectorAll: () => [], focus() {}, click() {}, closest() { return null; },
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

const contexto = vm.createContext({
  document: {
    documentElement: elemento(), body: elemento(), head: elemento(),
    getElementById: () => elemento(), querySelector: () => elemento(),
    querySelectorAll: () => [], createElement: () => elemento(),
    addEventListener() {}, removeEventListener() {},
  },
  console,
  localStorage: {
    getItem: () => null, setItem() {}, removeItem() {},
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
evaluar('db=__datos.criaturas;A=__datos.ataques;H=__datos.habilidades;');

const idsAtaques = new Set(datos.ataques.map(a => a.id));
const matriz = evaluar('M');
const nombresTipos = evaluar('TIPOS.map(t=>t[0])');
const FX_DANO = new Set(['pow', 'imm', 'res', 'cut']);

const criaturas = datos.criaturas.map(c => {
  contexto.__c = c;
  const st = evaluar('mk(__c,{pas:"",ofe:""},0).st');
  return {
    id: c.id,
    nombre: c.nombre,
    especie: c.especie,
    tipos: c.tipos.slice(),
    nivel: c.nivel,
    hab: c.hab,
    habId: c.habId,
    habd: c.habd,
    st,
    ataques: (c.atk || []).filter(id => idsAtaques.has(id)),
  };
});

const ataques = datos.ataques.map(a => ({
  id: a.id,
  nombre: a.nombre,
  desc: a.desc || '',
  tipo: a.tipo,
  cat: a.cat,
  pot: a.pot,
  mp: a.mp,
  alc: a.alc,
  aoe: a.aoe,
}));

const habilidades = datos.habilidades.map(h => ({
  id: h.id,
  nombre: h.nombre,
  desc: h.desc || '',
  fx: (h.fx || []).filter(f => FX_DANO.has(f.k)).map(f => ({ ...f })),
}));

const salida = {
  esquema: 1,
  origen: { archivo: 'datos_prueba.json', version: datos.version },
  tipos: { nombres: nombresTipos, matriz },
  criaturas,
  ataques,
  habilidades,
};

fs.mkdirSync(path.dirname(rutaSalida), { recursive: true });
fs.writeFileSync(rutaSalida, JSON.stringify(salida, null, 2) + '\n');
console.log(
  `catálogo: ${criaturas.length} criaturas, ${ataques.length} ataques, ` +
  `${habilidades.length} habilidades, ${nombresTipos.length} tipos`
);
