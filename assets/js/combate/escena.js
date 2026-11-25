import { cargarCatalogo } from "../comunes/api.js";
import {
  crearEquipoInicial,
  exportarEquipoTexto,
  guardarEquipo,
  importarEquipoTexto,
  leerEquipos,
  normalizarEquipo
} from "../comunes/sesion.js";
import { crearElemento, crearId } from "../comunes/utilidades.js";
import { crearConexion } from "./conexion.js";
import { crearRegistro } from "./registro.js";

const porId = (id) => document.getElementById(id);
const mensajeEquipo = porId("estado-equipo");
const mensajeConexion = porId("detalle-modo");
const botonIniciar = porId("iniciar-combate");
const panelCombate = porId("panel-combate");
const botonRepetir = porId("repetir-combate");
const registro = crearRegistro(porId("registro-combate"));
const seleccionesEquipo = [porId("criatura-1"), porId("criatura-2"), porId("criatura-3")];
const etiquetasObjetos = ["Poción", "Éter", "Antídoto"];

let catalogo = null;
let equipoActual = null;
let equiposGuardados = [];
let partida = null;
let conexion = null;
let temporizador = null;
let tiempoRestante = 0;
let accionPendiente = false;
let combateTerminado = false;

function mostrarMensaje(elemento, texto, tipo = "") {
  elemento.textContent = texto;
  elemento.dataset.tipo = tipo;
}

function opcionesCriaturas() {
  for (const seleccion of seleccionesEquipo) {
    const elegido = seleccion.value;
    seleccion.replaceChildren();
    for (const criatura of catalogo.criaturas) {
      const opcion = crearElemento("option", "", `${criatura.nombre} · ${criatura.tipos.join(" / ")}`);
      opcion.value = criatura.id;
      seleccion.append(opcion);
    }
    if (catalogo.criaturas.some((criatura) => criatura.id === elegido)) seleccion.value = elegido;
  }
}

function actualizarListaEquipos(seleccionado = "") {
  const lista = porId("equipos-guardados");
  lista.replaceChildren();
  const placeholder = crearElemento("option", "", "Equipos guardados");
  placeholder.value = "";
  lista.append(placeholder);

  for (const equipo of equiposGuardados) {
    const opcion = crearElemento("option", "", equipo.nombre || "Equipo sin nombre");
    opcion.value = equipo.id || "";
    lista.append(opcion);
  }

  lista.value = seleccionado;
}

function establecerEditor(equipo) {
  equipoActual = normalizarEquipo(equipo, catalogo);
  porId("nombre-equipo").value = equipoActual.nombre;
  equipoActual.t.slice(0, 3).forEach((unidad, indice) => {
    seleccionesEquipo[indice].value = unidad.id;
  });
}

function leerEditor() {
  const ids = seleccionesEquipo.map((seleccion) => seleccion.value);
  if (ids.some((id) => !id) || new Set(ids).size !== 3) {
    throw new Error("Selecciona tres criaturas distintas para el equipo.");
  }

  const nombre = porId("nombre-equipo").value.trim() || "Equipo sin nombre";
  const unidadesGuardadas = new Map(
    (equipoActual?.t || [])
      .filter((unidad) => unidad && unidad.id)
      .map((unidad) => [unidad.id, unidad])
  );
  return normalizarEquipo({
    id: equipoActual ? equipoActual.id : crearId(),
    nombre,
    fecha: new Date().toISOString(),
    t: ids.map((id) => ({ ...(unidadesGuardadas.get(id) || {}), id }))
  }, catalogo);
}

function refrescarEquipos() {
  equiposGuardados = leerEquipos();
  actualizarListaEquipos(equipoActual ? equipoActual.id : "");
}

function actualizarEstadoConexion(estado) {
  porId("estado-conexion").dataset.modo = estado.modo;
  const nombreModo = estado.modo === "en-linea"
    ? "EN LÍNEA"
    : estado.modo === "simulado"
      ? "MODO SIMULADO"
      : estado.modo === "error"
        ? "CONEXIÓN INTERRUMPIDA"
        : "CONECTANDO";
  porId("etiqueta-modo").textContent = nombreModo;
  porId("detalle-modo").textContent = estado.mensaje;
}

function resolverParticipante(lado) {
  if (!partida) return null;
  const nombre = String(lado || "").toLocaleLowerCase("es-MX");
  return nombre === "rival" || nombre === "oponente" || nombre === "j2" ? partida.rival : partida.jugador;
}

function buscarUnidad(participante, evento) {
  if (!participante || !Array.isArray(participante.equipo)) return null;
  const id = evento.criaturaId || evento.objetivoId || evento.id;
  const nombre = evento.objetivo || evento.nombre;
  return participante.equipo.find((unidad) => (id && unidad.id === id) || (nombre && unidad.nombre === nombre)) || null;
}

function aplicarEvento(evento) {
  if (Array.isArray(evento)) {
    evento.forEach(aplicarEvento);
    return;
  }
  if (!evento || typeof evento !== "object") {
    registro.agregar({ tipo: "error", mensaje: "El servidor envió un evento no válido." });
    return;
  }

  const tipoOriginal = String(evento.tipo || evento.Tipo || "");
  const tipo = tipoOriginal.toLocaleLowerCase("es-MX") === "ko"
    ? "KO"
    : tipoOriginal.toLocaleLowerCase("es-MX");
  if (tipo === "inicio") {
    partida = {
      jugador: evento.jugador || evento.Jugador,
      rival: evento.rival || evento.Rival,
      objetos: evento.objetos || evento.Objetos || {},
      turno: 1
    };
    if (!partida.jugador || !partida.rival) {
      registro.agregar({ tipo: "error", mensaje: "El evento de inicio no contiene ambos equipos." });
      partida = null;
      return;
    }
    combateTerminado = false;
    panelCombate.hidden = false;
    botonRepetir.hidden = true;
    porId("titulo-arena").focus({ preventScroll: true });
    dibujarCombate();
  } else if (tipo === "estado" && evento.jugador && evento.rival) {
    partida = { ...partida, jugador: evento.jugador, rival: evento.rival, objetos: evento.objetos || partida.objetos };
  } else if (tipo === "turno") {
    if (partida) partida.turno = evento.numero || evento.Numero || evento.turno || partida.turno;
    accionPendiente = false;
    iniciarTemporizador(Number(evento.duracion || evento.Duracion || 30));
  } else if (tipo === "daño" || tipo === "curacion") {
    const lado = evento.lado || evento.Lado;
    const unidad = buscarUnidad(resolverParticipante(lado), evento);
    const hpActual = evento.hpActual ?? evento.HpActual;
    const hpMaximo = evento.hpMaximo ?? evento.HpMaximo;
    if (unidad && hpActual != null && Number.isFinite(Number(hpActual))) unidad.hpActual = Number(hpActual);
    if (unidad && hpMaximo != null && Number.isFinite(Number(hpMaximo))) unidad.hpMaximo = Number(hpMaximo);
  } else if (tipo === "KO") {
    const unidad = buscarUnidad(resolverParticipante(evento.lado || evento.Lado), evento);
    if (unidad) {
      unidad.ko = true;
      unidad.hpActual = 0;
    }
  } else if (tipo === "cambio") {
    const participante = resolverParticipante(evento.lado || evento.Lado);
    const posicion = Number(evento.posicion ?? evento.Posicion);
    if (participante && Number.isInteger(posicion) && participante.equipo[posicion]) {
      participante.activo = posicion;
    }
  } else if (tipo === "objeto") {
    const inventario = evento.inventario || evento.Inventario;
    if (partida && inventario) partida.objetos = inventario;
  } else if (tipo === "fin") {
    combateTerminado = true;
    accionPendiente = false;
    limpiarTemporizador();
    botonRepetir.hidden = false;
    const resultado = evento.resultado || evento.Resultado;
    porId("resultado-combate").textContent = resultado === "victoria" ? "Victoria" : "Derrota";
    porId("resultado-combate").dataset.resultado = resultado || "derrota";
  }

  registro.agregar(evento);
  dibujarCombate();
}

function dibujarUnidad(unidad, posicion, activo) {
  const tarjeta = crearElemento("article", `unidad${activo ? " unidad-activa" : ""}${unidad.ko ? " unidad-ko" : ""}`);
  const cabecera = crearElemento("div", "unidad-cabecera");
  cabecera.append(
    crearElemento("span", "unidad-numero", `0${posicion + 1}`),
    crearElemento("strong", "", unidad.nombre || "Criatura")
  );
  if (activo) cabecera.append(crearElemento("span", "unidad-sello", "EN CAMPO"));

  const tipos = crearElemento("p", "unidad-tipos", Array.isArray(unidad.tipos) ? unidad.tipos.join(" / ") : "");
  const salud = crearElemento("progress", "barra-vida");
  const maximo = Number(unidad.hpMaximo || 100);
  salud.max = maximo > 0 ? maximo : 100;
  salud.value = Math.max(0, Math.min(salud.max, Number(unidad.hpActual ?? salud.max)));
  salud.setAttribute("aria-label", `Vida de ${unidad.nombre}`);
  const cifras = crearElemento("p", "unidad-vida", `${salud.value} / ${salud.max} HP`);

  tarjeta.append(cabecera, tipos, salud, cifras);
  return tarjeta;
}

function dibujarEquipo(contenedor, participante) {
  contenedor.replaceChildren();
  if (!participante || !Array.isArray(participante.equipo)) return;
  participante.equipo.forEach((unidad, indice) => {
    contenedor.append(dibujarUnidad(unidad, indice, indice === participante.activo));
  });
}

function dibujarControles() {
  if (!partida) return;
  const activo = partida.jugador.equipo[partida.jugador.activo];
  const criatura = activo && catalogo.criaturas.find((entrada) => entrada.id === activo.id);
  const movimientos = criatura
    ? criatura.ataques.map((id) => catalogo.ataques.find((ataque) => ataque.id === id)).filter(Boolean)
    : [];
  const seleccionMovimiento = porId("movimiento-elegido");
  const valorAnterior = seleccionMovimiento.value;
  seleccionMovimiento.replaceChildren();
  movimientos.forEach((movimiento) => {
    const opcion = crearElemento("option", "", `${movimiento.nombre} · ${movimiento.tipo}`);
    opcion.value = movimiento.id;
    seleccionMovimiento.append(opcion);
  });
  if (movimientos.some((movimiento) => movimiento.id === valorAnterior)) {
    seleccionMovimiento.value = valorAnterior;
  }
  porId("ataque-actual").textContent = activo ? `Actúa ${activo.nombre}` : "Sin criatura activa";

  const seleccionCambio = porId("criatura-a-cambiar");
  seleccionCambio.replaceChildren();
  const reservas = partida.jugador.equipo
    .map((unidad, indice) => ({ unidad, indice }))
    .filter(({ unidad, indice }) => indice !== partida.jugador.activo && !unidad.ko);
  reservas.forEach(({ unidad, indice }) => {
    const opcion = crearElemento("option", "", unidad.nombre);
    opcion.value = String(indice);
    seleccionCambio.append(opcion);
  });
  porId("accion-cambiar").disabled = accionPendiente || combateTerminado || reservas.length === 0;

  const seleccionObjeto = porId("objeto-elegido");
  seleccionObjeto.replaceChildren();
  etiquetasObjetos.forEach((nombre) => {
    const cantidad = Number(partida.objetos[nombre] || 0);
    const opcion = crearElemento("option", "", `${nombre} · ${cantidad}`);
    opcion.value = nombre;
    opcion.disabled = cantidad < 1;
    seleccionObjeto.append(opcion);
  });
  const tieneObjetos = etiquetasObjetos.some((nombre) => Number(partida.objetos[nombre] || 0) > 0);
  porId("accion-objeto").disabled = accionPendiente || combateTerminado || !tieneObjetos;
  porId("accion-atacar").disabled = accionPendiente || combateTerminado || movimientos.length === 0;
  seleccionMovimiento.disabled = accionPendiente || combateTerminado || movimientos.length === 0;
  seleccionCambio.disabled = accionPendiente || combateTerminado || reservas.length === 0;
  seleccionObjeto.disabled = accionPendiente || combateTerminado || !tieneObjetos;
}

function dibujarCombate() {
  if (!partida) return;
  porId("nombre-jugador").textContent = partida.jugador.nombre || "Tu equipo";
  porId("nombre-rival").textContent = partida.rival.nombre || "Rival";
  porId("numero-turno").textContent = `TURNO ${String(partida.turno || 1).padStart(2, "0")}`;
  dibujarEquipo(porId("equipo-jugador"), partida.jugador);
  dibujarEquipo(porId("equipo-rival"), partida.rival);
  dibujarControles();
}

function limpiarTemporizador() {
  if (temporizador) clearInterval(temporizador);
  temporizador = null;
}

function pintarTiempo() {
  const minutos = Math.floor(tiempoRestante / 60).toString().padStart(2, "0");
  const segundos = (tiempoRestante % 60).toString().padStart(2, "0");
  porId("temporizador-turno").textContent = `${minutos}:${segundos}`;
}

function iniciarTemporizador(duracion) {
  limpiarTemporizador();
  tiempoRestante = Number.isFinite(duracion) && duracion > 0 ? Math.min(duracion, 120) : 30;
  pintarTiempo();
  temporizador = setInterval(() => {
    tiempoRestante -= 1;
    pintarTiempo();
    if (tiempoRestante <= 0) {
      limpiarTemporizador();
      const criatura = partida && partida.jugador.equipo[partida.jugador.activo];
      const movimiento = criatura && criatura.ataques[0];
      if (movimiento) enviarAccion({ tipo: "atacar", movimiento });
    }
  }, 1000);
}

async function enviarAccion(accion) {
  if (!conexion || accionPendiente || combateTerminado) return;
  accionPendiente = true;
  limpiarTemporizador();
  dibujarControles();

  try {
    await conexion.enviarAccion(accion);
  } catch (error) {
    accionPendiente = false;
    registro.agregar({ tipo: "error", mensaje: error.message });
    mostrarMensaje(mensajeConexion, `No se pudo procesar la acción: ${error.message}`, "error");
    dibujarControles();
  }
}

function prepararAcciones() {
  porId("accion-atacar").addEventListener("click", () => {
    const movimiento = porId("movimiento-elegido").value;
    if (movimiento) enviarAccion({ tipo: "atacar", movimiento });
  });
  porId("accion-cambiar").addEventListener("click", () => {
    const posicion = porId("criatura-a-cambiar").value;
    if (posicion !== "") enviarAccion({ tipo: "cambiar", posicion: Number(posicion) });
  });
  porId("accion-objeto").addEventListener("click", () => {
    const objeto = porId("objeto-elegido").value;
    if (objeto) enviarAccion({ tipo: "usarObjeto", objeto });
  });
}

async function iniciarCombate() {
  let equipo;
  try {
    equipo = leerEditor();
  } catch (error) {
    mostrarMensaje(mensajeEquipo, error.message, "error");
    return;
  }

  if (conexion) conexion.cerrar();
  registro.limpiar();
  partida = null;
  combateTerminado = false;
  accionPendiente = true;
  botonIniciar.disabled = true;
  botonRepetir.hidden = true;
  porId("resultado-combate").textContent = "";
  mostrarMensaje(mensajeEquipo, "Equipo listo para combatir.", "correcto");
  conexion = crearConexion({ alEvento: aplicarEvento, alEstado: actualizarEstadoConexion });
  await conexion.iniciar(equipo, catalogo);
  accionPendiente = false;
  botonIniciar.disabled = false;
  dibujarControles();
  panelCombate.scrollIntoView({ behavior: "smooth", block: "start" });
}

function prepararEditor() {
  opcionesCriaturas();
  try {
    equiposGuardados = leerEquipos();
  } catch (error) {
    equiposGuardados = [];
    mostrarMensaje(mensajeEquipo, error.message, "error");
  }

  actualizarListaEquipos();
  const equipoInicial = equiposGuardados.find((equipo) => equipo && Array.isArray(equipo.t));
  try {
    establecerEditor(equipoInicial || crearEquipoInicial(catalogo));
  } catch (error) {
    establecerEditor(crearEquipoInicial(catalogo));
    mostrarMensaje(mensajeEquipo, `No se pudo cargar el equipo guardado: ${error.message}`, "error");
  }
  actualizarListaEquipos(equipoActual ? equipoActual.id : "");

  porId("guardar-equipo").addEventListener("click", () => {
    try {
      equipoActual = guardarEquipo(leerEditor(), catalogo);
      refrescarEquipos();
      mostrarMensaje(mensajeEquipo, `«${equipoActual.nombre}» quedó guardado en este dispositivo.`, "correcto");
    } catch (error) {
      mostrarMensaje(mensajeEquipo, error.message, "error");
    }
  });

  porId("equipos-guardados").addEventListener("change", (evento) => {
    const equipo = equiposGuardados.find((entrada) => entrada.id === evento.target.value);
    if (!equipo) return;
    try {
      establecerEditor(equipo);
      mostrarMensaje(mensajeEquipo, `Equipo «${equipoActual.nombre}» cargado.`, "correcto");
    } catch (error) {
      mostrarMensaje(mensajeEquipo, error.message, "error");
    }
  });

  porId("exportar-equipo").addEventListener("click", () => {
    try {
      equipoActual = leerEditor();
      porId("texto-equipo").value = exportarEquipoTexto(equipoActual);
      mostrarMensaje(mensajeEquipo, "Texto del equipo listo para copiar o guardar.", "correcto");
    } catch (error) {
      mostrarMensaje(mensajeEquipo, error.message, "error");
    }
  });

  porId("importar-equipo").addEventListener("click", () => {
    try {
      establecerEditor(importarEquipoTexto(porId("texto-equipo").value, catalogo));
      actualizarListaEquipos(equipoActual.id);
      mostrarMensaje(mensajeEquipo, `Equipo «${equipoActual.nombre}» importado. Guárdalo para conservarlo.`, "correcto");
    } catch (error) {
      mostrarMensaje(mensajeEquipo, error.message, "error");
    }
  });

  porId("copiar-equipo").addEventListener("click", async () => {
    const texto = porId("texto-equipo").value;
    if (!texto) {
      mostrarMensaje(mensajeEquipo, "Primero exporta un equipo a texto.", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(texto);
      mostrarMensaje(mensajeEquipo, "Texto del equipo copiado.", "correcto");
    } catch {
      porId("texto-equipo").focus();
      porId("texto-equipo").select();
      mostrarMensaje(mensajeEquipo, "No se pudo copiar automáticamente; el texto quedó seleccionado.", "error");
    }
  });
}

async function iniciarAplicacion() {
  prepararAcciones();
  botonIniciar.addEventListener("click", iniciarCombate);
  botonRepetir.addEventListener("click", iniciarCombate);

  try {
    catalogo = await cargarCatalogo();
    prepararEditor();
    botonIniciar.disabled = false;
    if (mensajeEquipo.dataset.tipo !== "error") {
      mostrarMensaje(mensajeEquipo, "Elige tres criaturas o carga un equipo guardado.", "correcto");
    }
    mostrarMensaje(mensajeConexion, "Listo para conectar con /hub/combate.", "inactivo");
    porId("etiqueta-modo").textContent = "LISTO";
    porId("detalle-modo").textContent = "El servidor se comprobará al iniciar el combate.";
  } catch (error) {
    mostrarMensaje(mensajeEquipo, error.message, "error");
    mostrarMensaje(mensajeConexion, "No se puede iniciar sin el catálogo.", "error");
    porId("etiqueta-modo").textContent = "SIN CATÁLOGO";
    porId("detalle-modo").textContent = error.message;
    botonIniciar.disabled = true;
  }
}

void iniciarAplicacion();
