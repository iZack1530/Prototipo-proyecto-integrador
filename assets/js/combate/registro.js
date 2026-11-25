import { crearElemento } from "../comunes/utilidades.js";

function describirEvento(evento) {
  if (evento.mensaje || evento.Mensaje) return String(evento.mensaje || evento.Mensaje);

  const tipo = String(evento.tipo || evento.Tipo || "").toLocaleLowerCase("es-MX");
  const cantidad = evento.cantidad ?? evento.Cantidad;
  const atacante = evento.atacante || evento.Atacante || "El combate";
  const objetivo = evento.objetivo || evento.Objetivo || "";

  if (tipo === "inicio") return "El combate ha comenzado.";
  if (tipo === "turno") return `Turno ${evento.numero || evento.Numero || evento.turno || 1}: elige una acción.`;
  if (tipo === "accion") return "Acción recibida por el servidor.";
  if (tipo === "daño") return `${atacante} causa ${cantidad ?? "?"} HP de daño${objetivo ? ` a ${objetivo}` : ""}.`;
  if (tipo === "curacion") return `${objetivo || "La criatura"} recupera ${cantidad ?? "?"} HP.`;
  if (tipo === "estado") return evento.estado || evento.Estado || "El combate registra un cambio de estado.";
  if (tipo === "clima") return `El clima cambia a ${evento.nombre || evento.Nombre || "un nuevo estado"}.`;
  if (tipo === "cambio") return `${evento.nombre || evento.Nombre || "Una criatura"} entra al campo.`;
  if (tipo === "objeto") return `${evento.nombre || evento.Nombre || evento.objeto || "Objeto"}: uso registrado.`;
  if (tipo === "ko") return `${objetivo || "Una criatura"} queda fuera de combate.`;
  if (tipo === "fin") return evento.resultado === "victoria" ? "¡Victoria! El combate ha terminado." : "El combate ha terminado en derrota.";
  if (tipo === "error") return evento.mensaje || "No se pudo completar la acción.";
  return tipo ? `Evento recibido: ${tipo}.` : "El servidor envió un evento sin tipo.";
}

export function crearRegistro(contenedor) {
  function agregar(evento) {
    const tipo = String(evento.tipo || evento.Tipo || "evento")
      .toLocaleLowerCase("es-MX")
      .replace(/[^a-z0-9-]/g, "-");
    const entrada = crearElemento("li", `registro-evento registro-${tipo}`, describirEvento(evento));
    contenedor.append(entrada);

    while (contenedor.children.length > 80) {
      contenedor.firstElementChild.remove();
    }
    contenedor.scrollTop = contenedor.scrollHeight;
  }

  function limpiar() {
    contenedor.replaceChildren();
  }

  return { agregar, limpiar };
}
