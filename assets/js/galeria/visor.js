export function crearVisor(obras) {
  const visor = document.getElementById("visor");
  const imagen = document.getElementById("visor-imagen");
  const escenario = document.getElementById("visor-escenario");
  const titulo = document.getElementById("visor-titulo");
  const categoria = document.getElementById("visor-categoria");
  const descripcion = document.getElementById("visor-descripcion");
  const artista = document.getElementById("visor-artista");
  const fecha = document.getElementById("visor-fecha");
  const criatura = document.getElementById("visor-criatura");
  const indice = document.getElementById("visor-indice");
  const nivelZoom = document.getElementById("nivel-zoom");
  const botonCerrar = document.getElementById("cerrar-visor");
  let indiceActual = 0;
  let zoom = 1;
  let focoAnterior = null;

  function ajustarZoom(valor) {
    zoom = Math.max(0.75, Math.min(2.5, valor));
    imagen.style.transform = `scale(${zoom})`;
    nivelZoom.textContent = `${Math.round(zoom * 100)}%`;
    escenario.classList.toggle("ampliado", zoom > 1);
  }

  function mostrarObra(nuevoIndice) {
    indiceActual = (nuevoIndice + obras.length) % obras.length;
    const obra = obras[indiceActual];
    imagen.src = new URL(obra.imagen, document.baseURI).href;
    imagen.alt = obra["texto-alternativo"];
    titulo.textContent = obra.titulo;
    categoria.textContent = obra.categoria;
    descripcion.textContent = obra.descripcion;
    artista.textContent = obra.artista;
    fecha.textContent = new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(new Date(`${obra.fecha}T12:00:00`));
    criatura.textContent = obra["criatura-relacionada"];
    indice.textContent = `${String(indiceActual + 1).padStart(2, "0")} / ${String(obras.length).padStart(2, "0")}`;
    ajustarZoom(1);
    escenario.scrollTo({ top: 0, left: 0 });
  }

  function abrir(indiceObra, elementoEnfocado) {
    focoAnterior = elementoEnfocado || document.activeElement;
    mostrarObra(indiceObra);
    visor.showModal();
    botonCerrar.focus();
  }

  function cerrar() {
    if (visor.open) visor.close();
  }

  document.getElementById("obra-anterior").addEventListener("click", () => mostrarObra(indiceActual - 1));
  document.getElementById("obra-siguiente").addEventListener("click", () => mostrarObra(indiceActual + 1));
  document.getElementById("acercar").addEventListener("click", () => ajustarZoom(zoom + 0.25));
  document.getElementById("alejar").addEventListener("click", () => ajustarZoom(zoom - 0.25));
  document.getElementById("restablecer-zoom").addEventListener("click", () => ajustarZoom(1));
  botonCerrar.addEventListener("click", cerrar);
  visor.addEventListener("close", () => {
    ajustarZoom(1);
    if (focoAnterior && focoAnterior.isConnected) focoAnterior.focus();
  });
  window.addEventListener("keydown", (evento) => {
    if (!visor.open) return;
    if (evento.key === "ArrowLeft") {
      evento.preventDefault();
      mostrarObra(indiceActual - 1);
    } else if (evento.key === "ArrowRight") {
      evento.preventDefault();
      mostrarObra(indiceActual + 1);
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      cerrar();
    }
  });

  return { abrir };
}
