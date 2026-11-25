import { crearRegistro } from "../assets/js/combate/registro.js";

const porId = (id) => document.getElementById(id);
const mensajeCarga = porId("estado-carga");
const visor = porId("visor-repeticion");
const registro = crearRegistro(porId("registro-combate"));
const accionesLista = porId("lista-acciones");
const urlParametros = new URLSearchParams(window.location.search);
const identificador = (urlParametros.get("id") || "").trim();

let repeticion = null;
let eventos = [];
let estadoInicial = null;
let estadoActual = null;
let indiceEvento = -1;
let temporizador = null;
let reproduciendo = false;

function mostrarMensaje(texto, tipo = "") {
  mensajeCarga.textContent = texto;
  mensajeCarga.dataset.tipo = tipo;
}

function clonar(valor) {
  return JSON.parse(JSON.stringify(valor));
}

function tipoEvento(evento) {
  return String(evento.tipo || evento.Tipo || "").toLocaleLowerCase("es-MX");
}

function normalizarUnidad(unidad) {
  if (typeof unidad === "string") {
    return { id: unidad, nombre: unidad, tipos: [], hpActual: null, hpMaximo: null, ko: false };
  }

  const hpMaximo = Number(unidad.hpMaximo ?? unidad.maxHp ?? unidad.maxHP ?? unidad.maxhp ?? 0);
  const hpActualEntrada = unidad.hpActual ?? unidad.hp ?? hpMaximo;
  return {
    ...unidad,
    id: String(unidad.id || unidad.cid || ""),
    nombre: String(unidad.nombre || unidad.nm || unidad.id || "Criatura"),
    tipos: Array.isArray(unidad.tipos) ? unidad.tipos : [],
    hpActual: hpActualEntrada === null || !Number.isFinite(Number(hpActualEntrada)) ? null : Number(hpActualEntrada),
    hpMaximo: Number.isFinite(hpMaximo) && hpMaximo > 0 ? hpMaximo : null,
    ko: Boolean(unidad.ko)
  };
}

function normalizarParticipante(entrada, indice, datos) {
  const nombres = datos.nombres || datos.Nombres || [];
  const fuente = entrada || {};
  const unidades = Array.isArray(fuente)
    ? fuente
    : fuente.equipo || fuente.criaturas || fuente.unidades || fuente.t || [];
  return {
    nombre: String(fuente.nombre || fuente.Nombre || nombres[indice] || `Equipo ${indice + 1}`),
    activo: Number(fuente.activo ?? fuente.Activo ?? 0),
    equipo: unidades.filter(Boolean).map(normalizarUnidad)
  };
}

function obtenerEquipos(datos, eventoInicio) {
  const equiposEntrada = datos.equipos || datos.Equipos || [];
  const jugadorEntrada = eventoInicio?.jugador || eventoInicio?.Jugador || datos.equipoA || datos.EquipoA || equiposEntrada[0];
  const rivalEntrada = eventoInicio?.rival || eventoInicio?.Rival || datos.equipoB || datos.EquipoB || equiposEntrada[1];
  const jugador = normalizarParticipante(jugadorEntrada, 0, datos);
  const rival = normalizarParticipante(rivalEntrada, 1, datos);

  if (jugador.equipo.length === 0 || rival.equipo.length === 0) {
    throw new Error("El registro no incluye los dos equipos necesarios para reproducir la repetición.");
  }

  return { jugador, rival };
}

function aplanarEventos(entrada, destino = [], turno = null) {
  if (Array.isArray(entrada)) {
    entrada.forEach((elemento) => aplanarEventos(elemento, destino, turno));
    return destino;
  }
  if (typeof entrada === "string") {
    destino.push({ tipo: "mensaje", mensaje: entrada, turno });
    return destino;
  }
  if (!entrada || typeof entrada !== "object") return destino;

  if (Array.isArray(entrada.eventos)) {
    entrada.eventos.forEach((evento) => aplanarEventos(evento, destino, entrada.numero || entrada.n || entrada.turno || turno));
  } else if (Array.isArray(entrada.Eventos)) {
    entrada.Eventos.forEach((evento) => aplanarEventos(evento, destino, entrada.Numero || entrada.Turno || turno));
  } else {
    destino.push({ ...entrada, turno: entrada.turno || entrada.n || turno });
  }
  return destino;
}

function aplanarAcciones(entrada, destino = []) {
  if (Array.isArray(entrada)) {
    entrada.forEach((elemento) => aplanarAcciones(elemento, destino));
  } else if (entrada && typeof entrada === "object") {
    destino.push(entrada);
  }
  return destino;
}

function normalizarRegistro(datos, id) {
  if (!datos || typeof datos !== "object") {
    throw new Error("La respuesta del servidor no contiene un registro válido.");
  }

  const eventosEntrada = datos.eventos || datos.Eventos || datos.turnos || datos.Turnos || [];
  let listaEventos = aplanarEventos(eventosEntrada);
  const acciones = aplanarAcciones(datos.acciones || datos.Acciones || []);
  if (listaEventos.length === 0) {
    throw new Error("El registro no contiene eventos resueltos para reproducir.");
  }

  const inicio = listaEventos.find((evento) => tipoEvento(evento) === "inicio");
  const equipos = obtenerEquipos(datos, inicio);
  if (!inicio) {
    listaEventos = [{ tipo: "inicio", ...equipos, mensaje: "Estado inicial del encuentro." }, ...listaEventos];
  }

  return {
    id: String(datos.id || datos.Id || id),
    nombre: String(datos.nombre || datos.Nombre || `Repetición ${id}`),
    semilla: String(datos.semilla || datos.Semilla || "No especificada"),
    formato: String(datos.formato || datos.Formato || "No especificado"),
    equipos,
    acciones,
    eventos: listaEventos
  };
}

async function cargarEjemplo() {
  let respuesta;
  try {
    respuesta = await fetch("./ejemplo-repeticion.json");
  } catch {
    throw new Error("No se pudo cargar el archivo local de ejemplo.");
  }
  if (!respuesta.ok) throw new Error(`El ejemplo local respondió con HTTP ${respuesta.status}.`);
  try {
    return await respuesta.json();
  } catch {
    throw new Error("El archivo local de ejemplo no contiene JSON válido.");
  }
}

async function consultarApi(id) {
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), 2500);
  let respuesta;

  try {
    respuesta = await fetch(`/api/repeticiones/${encodeURIComponent(id)}`, {
      headers: { Accept: "application/json" },
      signal: controlador.signal
    });
  } catch {
    return { datos: await cargarEjemplo(), respaldo: true };
  } finally {
    clearTimeout(limite);
  }

  const tipoContenido = respuesta.headers.get("content-type") || "";
  if (respuesta.status === 404 && !tipoContenido.includes("json")) {
    return { datos: await cargarEjemplo(), respaldo: true };
  }
  if (respuesta.status >= 500) {
    return { datos: await cargarEjemplo(), respaldo: true };
  }
  if (respuesta.status === 404) {
    throw new Error(`No se encontró una repetición con el ID «${id}».`);
  }
  if (!respuesta.ok) {
    throw new Error(`La API de repeticiones respondió con HTTP ${respuesta.status}.`);
  }

  let datos;
  try {
    datos = await respuesta.json();
  } catch {
    throw new Error("La API devolvió una respuesta que no es JSON válido.");
  }
  if ((datos.id || datos.Id) && String(datos.id || datos.Id) !== id) {
    throw new Error("El ID del registro recibido no coincide con el solicitado.");
  }
  return { datos, respaldo: false };
}

function prepararListaAcciones() {
  accionesLista.replaceChildren();
  repeticion.acciones.forEach((accion, indice) => {
    const lado = accion.lado === "rival" ? "Rival" : "Jugador";
    const tipo = accion.tipo || accion.t || "acción";
    const detalle = accion.movimiento || accion.objeto || accion.actor || accion.nombre || "";
    const elemento = document.createElement("li");
    elemento.textContent = `${accion.turno ? `Turno ${accion.turno} · ` : ""}${lado}: ${tipo}${detalle ? ` · ${detalle}` : ""}`;
    accionesLista.append(elemento);
  });
}

function dibujarUnidad(unidad, posicion, activa) {
  const tarjeta = document.createElement("article");
  tarjeta.className = `unidad${activa ? " unidad-activa" : ""}${unidad.ko ? " unidad-ko" : ""}`;

  const cabecera = document.createElement("div");
  cabecera.className = "unidad-cabecera";
  const numero = document.createElement("span");
  numero.className = "unidad-numero";
  numero.textContent = String(posicion + 1).padStart(2, "0");
  const nombre = document.createElement("strong");
  nombre.textContent = unidad.nombre || "Criatura";
  cabecera.append(numero, nombre);
  if (activa) {
    const sello = document.createElement("span");
    sello.className = "unidad-sello";
    sello.textContent = "EN CAMPO";
    cabecera.append(sello);
  }

  const tipos = document.createElement("p");
  tipos.className = "unidad-tipos";
  tipos.textContent = unidad.tipos.join(" / ");
  tarjeta.append(cabecera, tipos);

  if (Number.isFinite(unidad.hpMaximo) && unidad.hpMaximo > 0 && Number.isFinite(unidad.hpActual)) {
    const barra = document.createElement("progress");
    barra.className = "barra-vida";
    barra.max = unidad.hpMaximo;
    barra.value = Math.max(0, Math.min(unidad.hpMaximo, unidad.hpActual));
    barra.setAttribute("aria-label", `Vida de ${unidad.nombre}`);
    const vida = document.createElement("p");
    vida.className = "unidad-vida";
    vida.textContent = `${barra.value} / ${barra.max} HP`;
    tarjeta.append(barra, vida);
  }

  return tarjeta;
}

function dibujarEquipos() {
  if (!estadoActual) return;
  porId("nombre-jugador").textContent = estadoActual.jugador.nombre;
  porId("nombre-rival").textContent = estadoActual.rival.nombre;
  for (const [lado, id] of [["jugador", "equipo-jugador"], ["rival", "equipo-rival"]]) {
    const lista = porId(id);
    lista.replaceChildren();
    const participante = estadoActual[lado];
    participante.equipo.forEach((unidad, indice) => {
      lista.append(dibujarUnidad(unidad, indice, indice === participante.activo));
    });
  }
}

function buscarUnidad(participante, evento) {
  const id = evento.criaturaId || evento.objetivoId || evento.id;
  const nombre = evento.objetivo || evento.nombre;
  return participante.equipo.find((unidad) =>
    (id && unidad.id === id) || (nombre && unidad.nombre === nombre)
  );
}

function aplicarEvento(evento) {
  const tipo = tipoEvento(evento);
  if (tipo === "inicio") {
    const jugador = evento.jugador || evento.Jugador;
    const rival = evento.rival || evento.Rival;
    if (jugador && rival) {
      estadoActual = {
        jugador: normalizarParticipante(jugador, 0, repeticion),
        rival: normalizarParticipante(rival, 1, repeticion)
      };
    }
  } else if (tipo === "daño" || tipo === "curacion") {
    const lado = String(evento.lado || evento.Lado || "").toLocaleLowerCase("es-MX");
    const participante = lado === "rival" || lado === "oponente" || lado === "j2"
      ? estadoActual.rival
      : estadoActual.jugador;
    const unidad = buscarUnidad(participante, evento);
    const hpActual = evento.hpActual ?? evento.HpActual;
    if (unidad && hpActual != null && Number.isFinite(Number(hpActual))) {
      unidad.hpActual = Number(hpActual);
    }
  } else if (tipo === "ko") {
    const lado = String(evento.lado || evento.Lado || "").toLocaleLowerCase("es-MX");
    const participante = lado === "rival" || lado === "oponente" || lado === "j2"
      ? estadoActual.rival
      : estadoActual.jugador;
    const unidad = buscarUnidad(participante, evento);
    if (unidad) {
      unidad.ko = true;
      unidad.hpActual = 0;
    }
  } else if (tipo === "cambio") {
    const lado = String(evento.lado || evento.Lado || "").toLocaleLowerCase("es-MX");
    const participante = lado === "rival" || lado === "oponente" || lado === "j2"
      ? estadoActual.rival
      : estadoActual.jugador;
    const posicion = Number(evento.posicion ?? evento.Posicion);
    if (Number.isInteger(posicion) && participante.equipo[posicion]) participante.activo = posicion;
  }
  dibujarEquipos();
}

function actualizarProgreso() {
  porId("progreso-repeticion").max = eventos.length || 1;
  porId("progreso-repeticion").value = Math.max(0, indiceEvento + 1);
  porId("contador-evento").textContent = `${Math.max(0, indiceEvento + 1)} / ${eventos.length}`;
}

function actualizarControles() {
  const listo = eventos.length > 0;
  porId("reproducir").disabled = !listo || reproduciendo || indiceEvento >= eventos.length - 1;
  porId("pausar").disabled = !reproduciendo;
  porId("siguiente-evento").disabled = !listo || reproduciendo || indiceEvento >= eventos.length - 1;
  porId("reiniciar").disabled = !listo;
  porId("velocidad-reproduccion").disabled = !listo;
}

function detenerReproduccion() {
  reproduciendo = false;
  if (temporizador) clearTimeout(temporizador);
  temporizador = null;
  actualizarControles();
}

function avanzarEvento() {
  if (indiceEvento >= eventos.length - 1) {
    detenerReproduccion();
    porId("estado-reproduccion").textContent = "Reproducción completada.";
    return;
  }

  indiceEvento += 1;
  const evento = eventos[indiceEvento];
  aplicarEvento(evento);
  registro.agregar(evento);
  const mensaje = evento.mensaje || evento.Mensaje || evento.tipo || evento.Tipo || "Evento recibido";
  porId("texto-evento-actual").textContent = String(mensaje);
  actualizarProgreso();

  if (tipoEvento(evento) === "fin" || indiceEvento >= eventos.length - 1) {
    detenerReproduccion();
    porId("estado-reproduccion").textContent = "Reproducción completada.";
    return;
  }

  if (reproduciendo) {
    const velocidad = Number(porId("velocidad-reproduccion").value) || 1;
    temporizador = setTimeout(avanzarEvento, 1000 / velocidad);
  }
  actualizarControles();
}

function reproducir() {
  if (indiceEvento >= eventos.length - 1 || eventos.length === 0) return;
  reproduciendo = true;
  porId("estado-reproduccion").textContent = "Reproduciendo…";
  actualizarControles();
  if (indiceEvento < 0) {
    avanzarEvento();
    return;
  }
  const velocidad = Number(porId("velocidad-reproduccion").value) || 1;
  temporizador = setTimeout(avanzarEvento, 1000 / velocidad);
}

function reiniciar() {
  detenerReproduccion();
  indiceEvento = -1;
  estadoActual = clonar(estadoInicial);
  registro.limpiar();
  dibujarEquipos();
  porId("texto-evento-actual").textContent = "Pulsa reproducir o avanza un evento.";
  porId("estado-reproduccion").textContent = "Repetición reiniciada.";
  actualizarProgreso();
  actualizarControles();
}

function instalarControles() {
  porId("reproducir").addEventListener("click", reproducir);
  porId("pausar").addEventListener("click", () => {
    detenerReproduccion();
    porId("estado-reproduccion").textContent = "Reproducción pausada.";
  });
  porId("siguiente-evento").addEventListener("click", avanzarEvento);
  porId("reiniciar").addEventListener("click", reiniciar);
  porId("velocidad-reproduccion").addEventListener("change", () => {
    if (reproduciendo) {
      if (temporizador) clearTimeout(temporizador);
      const velocidad = Number(porId("velocidad-reproduccion").value) || 1;
      temporizador = setTimeout(avanzarEvento, 1000 / velocidad);
    }
  });
}

function mostrarRepeticion(datos, id) {
  repeticion = normalizarRegistro(datos, id);
  eventos = repeticion.eventos;
  estadoInicial = clonar(repeticion.equipos);
  estadoActual = clonar(estadoInicial);
  indiceEvento = -1;

  porId("nombre-repeticion").textContent = repeticion.nombre;
  porId("id-repeticion").textContent = `ID · ${repeticion.id}`;
  porId("semilla-repeticion").textContent = repeticion.semilla;
  porId("formato-repeticion").textContent = repeticion.formato;
  porId("cantidad-acciones").textContent = String(repeticion.acciones.length);
  porId("cantidad-eventos").textContent = String(eventos.length);
  prepararListaAcciones();
  dibujarEquipos();
  actualizarProgreso();
  actualizarControles();
  visor.hidden = false;
  porId("estado-reproduccion").textContent = "Lista para reproducir.";
}

async function iniciar() {
  instalarControles();
  if (!identificador) {
    mostrarMensaje("Falta el ID de repetición. Prueba con ?id=abc123.", "error");
    return;
  }
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(identificador)) {
    mostrarMensaje("El ID de repetición no es válido. Usa letras, números, guiones o guiones bajos.", "error");
    return;
  }

  try {
    let datos;
    let respaldo = false;
    if (identificador === "abc123") {
      datos = await cargarEjemplo();
      respaldo = true;
    } else {
      const resultado = await consultarApi(identificador);
      datos = resultado.datos;
      respaldo = resultado.respaldo;
    }

    mostrarRepeticion(datos, identificador);
    mostrarMensaje(
      respaldo ? `Servidor no disponible o ID de ejemplo: se muestra la repetición local «${datos.nombre}».` : "Repetición cargada desde el servidor.",
      respaldo ? "aviso" : "correcto"
    );
  } catch (error) {
    mostrarMensaje(error.message || "No se pudo cargar la repetición.", "error");
  }
}

window.addEventListener("pagehide", detenerReproduccion);
void iniciar();
