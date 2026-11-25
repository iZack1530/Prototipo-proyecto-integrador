import { crearVisor } from "./visor.js";

const contenedorObras = document.getElementById("galeria-obras");
const contadorObras = document.getElementById("contador-obras");
const estadoGaleria = document.getElementById("estado-galeria");
const filtrosCategoria = document.getElementById("filtros-categoria");
const filtrosEtiqueta = document.getElementById("filtros-etiqueta");
let obras = [];
let categoriaActiva = "todas";
let etiquetaActiva = "todas";
let visor;

function validarObras(datos) {
  const campos = ["id", "titulo", "categoria", "etiquetas", "artista", "fecha", "descripcion", "criatura-relacionada", "imagen", "texto-alternativo"];
  if (!Array.isArray(datos) || datos.length === 0) {
    throw new Error("El archivo de obras no contiene piezas válidas.");
  }

  for (const [indice, obra] of datos.entries()) {
    if (!obra || campos.some((campo) => !(campo in obra))) {
      throw new Error(`La ficha ${indice + 1} no incluye todos los campos requeridos.`);
    }
    if (!Array.isArray(obra.etiquetas) || obra.etiquetas.length === 0) {
      throw new Error(`La ficha ${indice + 1} necesita al menos una etiqueta.`);
    }
  }

  return datos;
}

function crearElemento(etiqueta, clase, texto) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto) elemento.textContent = texto;
  return elemento;
}

function crearFicha(obra, indice) {
  const articulo = crearElemento("article", "tarjeta-obra");
  const boton = crearElemento("button", "abrir-obra");
  const marco = crearElemento("span", "obra-imagen-marco");
  const imagen = crearElemento("img", "obra-imagen");
  const numero = crearElemento("span", "obra-numero", String(indice + 1).padStart(2, "0"));
  const indicacion = crearElemento("span", "obra-flecha", "↗");
  const pie = crearElemento("span", "obra-pie");
  const categoria = crearElemento("span", "obra-categoria", obra.categoria);
  const titulo = crearElemento("span", "obra-titulo", obra.titulo);
  const descripcion = crearElemento("span", "obra-descripcion", obra.descripcion);
  const metadatos = crearElemento("span", "obra-metadatos");
  const artista = crearElemento("span", "", obra.artista);
  const fecha = crearElemento("span", "", new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(`${obra.fecha}T12:00:00`)));
  const relacionada = crearElemento("span", "obra-relacionada");
  const etiquetaRelacion = crearElemento("span", "", "Criatura relacionada: ");
  const nombreRelacion = crearElemento("strong", "", obra["criatura-relacionada"]);

  boton.type = "button";
  boton.setAttribute("aria-label", `Abrir ficha: ${obra.titulo}`);
  boton.dataset.indice = String(indice);
  imagen.src = new URL(obra.imagen, document.baseURI).href;
  imagen.alt = obra["texto-alternativo"];
  imagen.loading = "lazy";
  imagen.decoding = "async";
  marco.append(numero, imagen, indicacion);
  metadatos.append(artista, fecha);
  relacionada.append(etiquetaRelacion, nombreRelacion);
  pie.append(categoria, titulo, descripcion, metadatos, relacionada);
  boton.append(marco, pie);
  articulo.append(boton);
  return articulo;
}

function obrasVisibles() {
  return obras
    .map((obra, indice) => ({ obra, indice }))
    .filter(({ obra }) => (categoriaActiva === "todas" || obra.categoria === categoriaActiva)
      && (etiquetaActiva === "todas" || obra.etiquetas.includes(etiquetaActiva)));
}

function renderizarObras() {
  const visibles = obrasVisibles();
  const fragmento = document.createDocumentFragment();
  contenedorObras.replaceChildren();

  if (visibles.length === 0) {
    const vacio = crearElemento("p", "vacio-galeria", "No hay obras con esta combinación de filtros.");
    contenedorObras.append(vacio);
  } else {
    for (const { obra, indice } of visibles) {
      fragmento.append(crearFicha(obra, indice));
    }
    contenedorObras.append(fragmento);
  }

  contadorObras.textContent = `${String(visibles.length).padStart(2, "0")} ${visibles.length === 1 ? "obra" : "obras"}`;
  estadoGaleria.textContent = visibles.length ? "" : "Prueba otra categoría o etiqueta.";
}

function renderizarEtiquetas() {
  const etiquetas = [...new Set(obras.flatMap((obra) => obra.etiquetas))].sort((a, b) => a.localeCompare(b, "es"));
  const fragmento = document.createDocumentFragment();
  const todas = crearElemento("button", "etiqueta-boton activa", "Todas");
  todas.type = "button";
  todas.dataset.etiqueta = "todas";
  todas.setAttribute("aria-pressed", "true");
  fragmento.append(todas);

  for (const etiqueta of etiquetas) {
    const boton = crearElemento("button", "etiqueta-boton", etiqueta.replaceAll("-", " "));
    boton.type = "button";
    boton.dataset.etiqueta = etiqueta;
    boton.setAttribute("aria-pressed", "false");
    fragmento.append(boton);
  }

  filtrosEtiqueta.replaceChildren(fragmento);
}

function activarFiltros() {
  filtrosCategoria.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-categoria]");
    if (!boton) return;
    categoriaActiva = boton.dataset.categoria;
    filtrosCategoria.querySelectorAll("[data-categoria]").forEach((opcion) => {
      const activa = opcion === boton;
      opcion.classList.toggle("activo", activa);
      opcion.setAttribute("aria-pressed", String(activa));
    });
    renderizarObras();
  });

  filtrosEtiqueta.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-etiqueta]");
    if (!boton) return;
    etiquetaActiva = boton.dataset.etiqueta;
    filtrosEtiqueta.querySelectorAll("[data-etiqueta]").forEach((opcion) => {
      const activa = opcion === boton;
      opcion.classList.toggle("activa", activa);
      opcion.setAttribute("aria-pressed", String(activa));
    });
    renderizarObras();
  });

  contenedorObras.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-indice]");
    if (boton) visor.abrir(Number(boton.dataset.indice), boton);
  });
}

async function iniciarGaleria() {
  estadoGaleria.textContent = "Cargando el archivo…";
  try {
    const respuesta = await fetch("./obras.json");
    if (!respuesta.ok) {
      throw new Error(`No se pudo leer obras.json (HTTP ${respuesta.status}).`);
    }
    obras = validarObras(await respuesta.json());
    visor = crearVisor(obras);
    renderizarEtiquetas();
    activarFiltros();
    renderizarObras();
  } catch (error) {
    console.error("Error al cargar la galería:", error);
    contadorObras.textContent = "Archivo no disponible";
    estadoGaleria.classList.add("error");
    estadoGaleria.textContent = `No se pudo cargar la galería. ${error.message}`;
  }
}

iniciarGaleria();
