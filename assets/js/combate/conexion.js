import { conectarHubCombate, debeIntentarHub } from "../comunes/api.js";

const VIDA_DE_MUESTRA = 100;
const RESPUESTAS_DE_MUESTRA = [
  { cantidad: 12, hpActual: 88 },
  { cantidad: 14, hpActual: 74 },
  { cantidad: 15, hpActual: 59 },
  { cantidad: 16, hpActual: 43 },
  { cantidad: 17, hpActual: 26 },
  { cantidad: 18, hpActual: 8 },
  { cantidad: 8, hpActual: 0 },
  { cantidad: 100, hpActual: 0 },
  { cantidad: 100, hpActual: 0 }
];

function crearUnidad(criatura) {
  return {
    id: criatura.id,
    nombre: criatura.nombre,
    tipos: criatura.tipos,
    ataques: criatura.ataques,
    hpActual: VIDA_DE_MUESTRA,
    hpMaximo: VIDA_DE_MUESTRA,
    ko: false
  };
}

function extraerEventos(mensaje, emitir) {
  if (Array.isArray(mensaje)) {
    mensaje.forEach((evento) => extraerEventos(evento, emitir));
    return;
  }

  if (!mensaje || typeof mensaje !== "object") return;
  const eventos = mensaje.eventos || mensaje.Eventos;
  if (Array.isArray(eventos)) {
    eventos.forEach((evento) => extraerEventos(evento, emitir));
    return;
  }

  emitir(mensaje);
}

function crearServidorSimulado(equipo, catalogo, emitir) {
  const idsPropios = new Set(equipo.t.slice(0, 3).map((unidad) => unidad.id));
  const unidadesJugador = equipo.t.slice(0, 3).map((unidad) => {
    const criatura = catalogo.criaturas.find((entrada) => entrada.id === unidad.id);
    if (!criatura) throw new Error(`La criatura ${unidad.id} ya no está en el catálogo.`);
    return crearUnidad(criatura);
  });
  const criaturasRival = catalogo.criaturas.filter((criatura) => !idsPropios.has(criatura.id)).slice(0, 3);

  if (unidadesJugador.length !== 3 || criaturasRival.length !== 3) {
    throw new Error("El combate de muestra necesita dos equipos de tres criaturas.");
  }

  const estado = {
    turno: 0,
    terminado: false,
    jugador: { nombre: equipo.nombre, equipo: unidadesJugador, activo: 0 },
    rival: { nombre: "Rival de prueba", equipo: criaturasRival.map(crearUnidad), activo: 0 },
    objetos: { "Poción": 2, "Éter": 1, "Antídoto": 1 }
  };

  const enviar = (evento) => emitir(evento);
  const unidadActiva = (lado) => lado.equipo[lado.activo];
  const primerDisponible = (lado) => lado.equipo.findIndex((unidad) => !unidad.ko);

  function finalizar(resultado, mensaje) {
    estado.terminado = true;
    enviar({ tipo: "fin", resultado, mensaje, turno: estado.turno });
  }

  function iniciar() {
    enviar({
      tipo: "inicio",
      modo: "simulado",
      jugador: estado.jugador,
      rival: estado.rival,
      objetos: { ...estado.objetos },
      mensaje: "Combate de muestra: los eventos son respuestas simuladas, no cálculos del cliente."
    });
    enviar({ tipo: "turno", numero: 1, duracion: 30 });
  }

  function responderAccion(accion) {
    if (estado.terminado) throw new Error("El combate ya terminó.");
    if (!accion || !["atacar", "cambiar", "usarObjeto"].includes(accion.tipo)) {
      throw new Error("La acción debe ser atacar, cambiar o usarObjeto.");
    }

    const actor = unidadActiva(estado.jugador);
    enviar({
      tipo: "accion",
      accion: accion.tipo,
      mensaje: `${estado.jugador.nombre} envía la acción «${accion.tipo}».`
    });

    if (accion.tipo === "atacar") {
      const criatura = catalogo.criaturas.find((entrada) => entrada.id === actor.id);
      const ataque = catalogo.ataques.find((entrada) =>
        entrada.id === accion.movimiento && criatura.ataques.includes(entrada.id)
      );
      if (!ataque) throw new Error("El movimiento no pertenece a la criatura activa.");

      const objetivo = unidadActiva(estado.rival);
      enviar({
        tipo: "daño",
        lado: "rival",
        atacante: actor.nombre,
        objetivoId: objetivo.id,
        objetivo: objetivo.nombre,
        cantidad: VIDA_DE_MUESTRA,
        hpActual: 0,
        hpMaximo: VIDA_DE_MUESTRA
      });
      objetivo.hpActual = 0;
      objetivo.ko = true;
      enviar({ tipo: "KO", lado: "rival", criaturaId: objetivo.id, objetivo: objetivo.nombre });

      const siguienteRival = primerDisponible(estado.rival);
      if (siguienteRival < 0) {
        finalizar("victoria", "El equipo rival se quedó sin criaturas. ¡Victoria!");
        return;
      }
      estado.rival.activo = siguienteRival;
      enviar({
        tipo: "cambio",
        lado: "rival",
        posicion: siguienteRival,
        nombre: estado.rival.equipo[siguienteRival].nombre
      });
    } else if (accion.tipo === "cambiar") {
      const posicion = Number(accion.posicion);
      const nuevaUnidad = estado.jugador.equipo[posicion];
      if (!Number.isInteger(posicion) || !nuevaUnidad || nuevaUnidad.ko || posicion === estado.jugador.activo) {
        throw new Error("No se puede cambiar a esa criatura.");
      }
      estado.jugador.activo = posicion;
      enviar({
        tipo: "cambio",
        lado: "jugador",
        posicion,
        nombre: nuevaUnidad.nombre,
        mensaje: `${estado.jugador.nombre} cambia a ${nuevaUnidad.nombre}.`
      });
    } else {
      const objeto = String(accion.objeto || "");
      if (!Object.hasOwn(estado.objetos, objeto) || estado.objetos[objeto] < 1) {
        throw new Error("Ese objeto no está disponible.");
      }

      estado.objetos[objeto] -= 1;
      enviar({
        tipo: "objeto",
        lado: "jugador",
        objeto,
        nombre: objeto,
        inventario: { ...estado.objetos },
        objetivoId: actor.id,
        objetivo: actor.nombre,
        mensaje: `${actor.nombre} usa ${objeto}. El evento de recuperación es de muestra.`
      });
      if (objeto === "Poción") {
        actor.hpActual = VIDA_DE_MUESTRA;
        enviar({
          tipo: "curacion",
          lado: "jugador",
          objetivoId: actor.id,
          objetivo: actor.nombre,
          cantidad: 25,
          hpActual: actor.hpActual,
          hpMaximo: VIDA_DE_MUESTRA
        });
      }
    }

    const respuesta = RESPUESTAS_DE_MUESTRA[Math.min(estado.turno, RESPUESTAS_DE_MUESTRA.length - 1)];
    const objetivoJugador = unidadActiva(estado.jugador);
    const atacanteRival = unidadActiva(estado.rival);
    objetivoJugador.hpActual = respuesta.hpActual;
    enviar({
      tipo: "daño",
      lado: "jugador",
      atacante: atacanteRival.nombre,
      objetivoId: objetivoJugador.id,
      objetivo: objetivoJugador.nombre,
      cantidad: respuesta.cantidad,
      hpActual: respuesta.hpActual,
      hpMaximo: VIDA_DE_MUESTRA,
      mensaje: `${atacanteRival.nombre} responde con un evento de daño de muestra.`
    });
    estado.turno += 1;

    if (respuesta.hpActual === 0) {
      objetivoJugador.ko = true;
      enviar({ tipo: "KO", lado: "jugador", criaturaId: objetivoJugador.id, objetivo: objetivoJugador.nombre });
      const siguienteJugador = primerDisponible(estado.jugador);
      if (siguienteJugador < 0) {
        finalizar("derrota", "El equipo de prueba se quedó sin criaturas.");
        return;
      }
      estado.jugador.activo = siguienteJugador;
      enviar({
        tipo: "cambio",
        lado: "jugador",
        posicion: siguienteJugador,
        nombre: estado.jugador.equipo[siguienteJugador].nombre
      });
    }

    if (estado.turno >= RESPUESTAS_DE_MUESTRA.length) {
      finalizar("derrota", "El combate de muestra llegó al límite de turnos.");
      return;
    }

    enviar({ tipo: "turno", numero: estado.turno + 1, duracion: 30 });
  }

  return { iniciar, responderAccion };
}

export function crearConexion({ alEvento, alEstado }) {
  let clienteHub = null;
  let simulador = null;
  let modo = "inactivo";

  function informarEstado(estado) {
    if (typeof alEstado === "function") alEstado(estado);
  }

  function recibirMensajeHub({ metodo, argumentos }) {
    const nombre = String(metodo || "").toLocaleLowerCase("es-MX");
    if (!nombre.includes("evento") && !nombre.includes("combate")) return;
    extraerEventos(argumentos, alEvento);
  }

  async function iniciar(equipo, catalogo) {
    if (clienteHub) clienteHub.cerrar();
    simulador = null;
    modo = "conectando";
    informarEstado({ modo, mensaje: "Conectando a /hub/combate…" });

    if (!debeIntentarHub()) {
      iniciarSimulacion(equipo, catalogo, "Servidor SignalR no configurado en este entorno.");
      return;
    }

    try {
      clienteHub = await conectarHubCombate({
        alMensaje: recibirMensajeHub,
        alCerrar: (error) => {
          if (modo === "en-linea") {
            modo = "error";
            informarEstado({ modo, mensaje: `Conexión interrumpida: ${error.message}` });
          }
        }
      });
      await clienteHub.invocar("IniciarCombate", [equipo]);
      modo = "en-linea";
      informarEstado({ modo, mensaje: "Conectado a /hub/combate." });
    } catch (error) {
      iniciarSimulacion(equipo, catalogo, `El servidor no respondió (${error.message}).`);
    }
  }

  function iniciarSimulacion(equipo, catalogo, motivo) {
    if (clienteHub) clienteHub.cerrar();
    clienteHub = null;
    modo = "simulado";
    informarEstado({ modo, mensaje: `${motivo} Se inició el modo simulado.` });
    simulador = crearServidorSimulado(equipo, catalogo, alEvento);
    simulador.iniciar();
  }

  async function enviarAccion(accion) {
    if (modo === "simulado" && simulador) {
      simulador.responderAccion(accion);
      return;
    }
    if (modo !== "en-linea" || !clienteHub) {
      throw new Error("No hay una conexión de combate activa.");
    }

    try {
      await clienteHub.invocar("EnviarAccion", [accion]);
    } catch (error) {
      modo = "error";
      informarEstado({ modo, mensaje: `No se pudo enviar la acción: ${error.message}` });
      throw error;
    }
  }

  function cerrar() {
    if (clienteHub) clienteHub.cerrar();
    clienteHub = null;
    simulador = null;
    modo = "inactivo";
  }

  return { iniciar, enviarAccion, cerrar };
}
