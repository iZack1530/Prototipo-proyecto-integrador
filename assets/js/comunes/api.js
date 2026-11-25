const SEPARADOR_SIGNALR = "\u001e";

export async function cargarCatalogo(ruta = "../datos/catalogo-publico.json") {
  let respuesta;

  try {
    respuesta = await fetch(ruta);
  } catch {
    throw new Error("No se pudo cargar el catálogo de criaturas.");
  }

  if (!respuesta.ok) {
    throw new Error(`El catálogo respondió con HTTP ${respuesta.status}.`);
  }

  const catalogo = await respuesta.json();
  if (!Array.isArray(catalogo.criaturas) || !Array.isArray(catalogo.ataques)) {
    throw new Error("El catálogo no contiene criaturas y ataques válidos.");
  }

  return catalogo;
}

export function debeIntentarHub() {
  if (window.MYTHOS_HUB_URL) return true;
  const host = window.location.hostname.toLocaleLowerCase("es-MX");
  // Los hosts estáticos conocidos usan el simulador sin generar peticiones fallidas.
  return host !== "localhost" &&
    host !== "127.0.0.1" &&
    host !== "::1" &&
    !host.endsWith(".github.io");
}

function crearUrlHub() {
  const url = new URL(window.MYTHOS_HUB_URL || "/hub/combate", window.location.href);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/`;
  return url;
}

function crearUrlNegociacion(urlHub) {
  const url = new URL(urlHub);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/negotiate`;
  url.searchParams.set("negotiateVersion", "1");
  return url;
}

async function negociarSignalR(url) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 1800);
  let respuesta;

  try {
    respuesta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: controlador.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("El servidor SignalR agotó el tiempo de respuesta.");
    }
    throw new Error("No se pudo contactar al servidor SignalR.");
  } finally {
    clearTimeout(temporizador);
  }

  if (!respuesta.ok) {
    throw new Error(`El servidor SignalR respondió con HTTP ${respuesta.status}.`);
  }

  let negociacion;
  try {
    negociacion = await respuesta.json();
  } catch {
    throw new Error("El servidor SignalR devolvió una negociación no válida.");
  }

  if (!negociacion.connectionToken && !negociacion.connectionId) {
    throw new Error("El servidor SignalR no entregó un identificador de conexión.");
  }

  const aceptaWebSocket = (negociacion.availableTransports || []).some((transporte) =>
    transporte.transport === "WebSockets" &&
    (transporte.transferFormats || []).includes("Text")
  );
  if (!aceptaWebSocket) {
    throw new Error("El servidor SignalR no ofrece transporte WebSocket de texto.");
  }

  return negociacion;
}

export async function conectarHubCombate({ alMensaje, alCerrar }) {
  const urlHub = crearUrlHub();
  const negociacion = await negociarSignalR(crearUrlNegociacion(urlHub));
  const urlWebSocket = new URL(negociacion.url || urlHub);
  urlWebSocket.protocol = urlWebSocket.protocol === "https:" ? "wss:" : "ws:";
  urlWebSocket.searchParams.set("id", negociacion.connectionToken || negociacion.connectionId);

  return new Promise((resolver, rechazar) => {
    const pendientes = new Map();
    let siguienteId = 0;
    let buffer = "";
    let confirmada = false;
    let cerrada = false;
    let temporizador;
    const socket = new WebSocket(urlWebSocket);

    const limpiarTemporizador = () => {
      if (temporizador) clearTimeout(temporizador);
      temporizador = null;
    };

    const rechazarPendientes = (error) => {
      pendientes.forEach(({ rechazar: rechazarPromesa, temporizador: reloj }) => {
        clearTimeout(reloj);
        rechazarPromesa(error);
      });
      pendientes.clear();
    };

    const enviarMarco = (mensaje) => {
      if (socket.readyState !== WebSocket.OPEN) {
        throw new Error("La conexión SignalR ya no está disponible.");
      }
      socket.send(`${JSON.stringify(mensaje)}${SEPARADOR_SIGNALR}`);
    };

    const procesarMarco = (marco) => {
      if (!marco) return;

      let mensaje;
      try {
        mensaje = JSON.parse(marco);
      } catch {
        throw new Error("SignalR envió un mensaje JSON no válido.");
      }

      if (!confirmada) {
        if (mensaje.error) throw new Error(`SignalR rechazó el protocolo: ${mensaje.error}`);
        confirmada = true;
        limpiarTemporizador();
        resolver({
          invocar(objetivo, argumentos) {
            const invocationId = String(++siguienteId);
            return new Promise((resolverInvocacion, rechazarInvocacion) => {
              const reloj = setTimeout(() => {
                pendientes.delete(invocationId);
                rechazarInvocacion(new Error(`SignalR no respondió a ${objetivo}.`));
              }, 7000);
              pendientes.set(invocationId, {
                resolver: resolverInvocacion,
                rechazar: rechazarInvocacion,
                temporizador: reloj
              });

              try {
                enviarMarco({ type: 1, invocationId, target: objetivo, arguments: argumentos });
              } catch (error) {
                clearTimeout(reloj);
                pendientes.delete(invocationId);
                rechazarInvocacion(error);
              }
            });
          },
          cerrar() {
            if (cerrada) return;
            cerrada = true;
            rechazarPendientes(new Error("La conexión SignalR se cerró."));
            socket.close(1000, "Cliente cerrado");
          }
        });
        return;
      }

      if (mensaje.type === 1) {
        alMensaje({ metodo: mensaje.target, argumentos: mensaje.arguments || [] });
      } else if (mensaje.type === 3 && mensaje.invocationId) {
        const pendiente = pendientes.get(mensaje.invocationId);
        if (!pendiente) return;
        clearTimeout(pendiente.temporizador);
        pendientes.delete(mensaje.invocationId);
        if (mensaje.error) pendiente.rechazar(new Error(mensaje.error));
        else pendiente.resolver(mensaje.result);
      } else if (mensaje.type === 6) {
        enviarMarco({ type: 6 });
      } else if (mensaje.type === 7) {
        const error = new Error(mensaje.error || "SignalR cerró la conexión.");
        rechazarPendientes(error);
        alCerrar(error);
      }
    };

    temporizador = setTimeout(() => {
      const error = new Error("SignalR no completó la conexión a tiempo.");
      if (!confirmada) rechazar(error);
      socket.close();
    }, 3500);

    socket.onopen = () => {
      try {
        socket.send(`${JSON.stringify({ protocol: "json", version: 1 })}${SEPARADOR_SIGNALR}`);
      } catch {
        rechazar(new Error("No se pudo iniciar el protocolo SignalR."));
      }
    };

    socket.onmessage = (evento) => {
      if (typeof evento.data !== "string") {
        if (!confirmada) rechazar(new Error("SignalR envió un formato de mensaje no admitido."));
        return;
      }

      buffer += evento.data;
      const marcos = buffer.split(SEPARADOR_SIGNALR);
      buffer = marcos.pop();

      try {
        marcos.forEach(procesarMarco);
      } catch (error) {
        if (!confirmada) rechazar(error);
        else alCerrar(error);
        socket.close();
      }
    };

    socket.onerror = () => {
      if (!confirmada) rechazar(new Error("No se pudo abrir el transporte WebSocket SignalR."));
    };

    socket.onclose = () => {
      limpiarTemporizador();
      const error = new Error("La conexión SignalR se interrumpió.");
      rechazarPendientes(error);
      if (confirmada && !cerrada) alCerrar(error);
      if (!confirmada) rechazar(error);
    };
  });
}
