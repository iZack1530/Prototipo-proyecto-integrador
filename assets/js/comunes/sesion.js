import { crearId, guardarJsonLocalStorage, leerJsonLocalStorage } from "./utilidades.js";

export const CLAVE_EQUIPOS = "rpg_equipos_v1";

const espacioVacio = () => ({ id: "", nm: "", pas: "", ofe: "", mv: [] });

function equipoValido(equipo) {
  return equipo && typeof equipo === "object" && Array.isArray(equipo.t);
}

export function leerEquipos() {
  const equipos = leerJsonLocalStorage(CLAVE_EQUIPOS, []);

  if (!Array.isArray(equipos) || equipos.some((equipo) => !equipoValido(equipo))) {
    throw new Error("La lista guardada de equipos tiene un formato no válido.");
  }

  return equipos;
}

export function normalizarEquipo(equipo, catalogo) {
  if (!equipoValido(equipo)) {
    throw new Error("El texto debe contener un equipo con una lista de criaturas.");
  }

  const seleccionadas = equipo.t.filter((unidad) => unidad && unidad.id);
  const ids = seleccionadas.slice(0, 3).map((unidad) => String(unidad.id));

  if (ids.length !== 3 || new Set(ids).size !== 3) {
    throw new Error("Un equipo debe incluir tres criaturas distintas.");
  }

  const unidades = seleccionadas.slice(0, 3).map((unidad, indice) => {
    const id = ids[indice];
    const criatura = catalogo.criaturas.find((entrada) => entrada.id === id);
    if (!criatura) throw new Error(`La criatura ${id} no existe en el catálogo.`);
    return {
      id: criatura.id,
      nm: criatura.nombre,
      pas: String(unidad.pas || ""),
      ofe: String(unidad.ofe || ""),
      mv: Array.isArray(unidad.mv) ? [...unidad.mv] : [...criatura.ataques]
    };
  });

  return {
    id: typeof equipo.id === "string" && equipo.id ? equipo.id : crearId(),
    nombre: String(equipo.nombre || "Equipo sin nombre").trim().slice(0, 40) || "Equipo sin nombre",
    fecha: typeof equipo.fecha === "string" ? equipo.fecha : new Date().toISOString(),
    t: [...unidades, espacioVacio(), espacioVacio(), espacioVacio()]
  };
}

export function crearEquipoInicial(catalogo) {
  if (!catalogo || !Array.isArray(catalogo.criaturas) || catalogo.criaturas.length < 3) {
    throw new Error("El catálogo necesita al menos tres criaturas para formar un equipo.");
  }

  return normalizarEquipo({
    nombre: "Centinelas de Auralia",
    t: catalogo.criaturas.slice(0, 3).map((criatura) => ({ id: criatura.id }))
  }, catalogo);
}

export function importarEquipoTexto(texto, catalogo) {
  let equipo;

  try {
    equipo = JSON.parse(texto);
  } catch {
    throw new Error("El texto del equipo no contiene JSON válido.");
  }

  return normalizarEquipo(equipo, catalogo);
}

export function exportarEquipoTexto(equipo) {
  return JSON.stringify(equipo, null, 2);
}

export function guardarEquipo(equipo, catalogo) {
  const normalizado = normalizarEquipo(equipo, catalogo);
  const equipos = leerEquipos();
  const indice = equipos.findIndex((guardado) => guardado.id === normalizado.id);

  if (indice < 0) {
    equipos.unshift(normalizado);
  } else {
    equipos[indice] = normalizado;
  }

  guardarJsonLocalStorage(CLAVE_EQUIPOS, equipos);
  return normalizado;
}
