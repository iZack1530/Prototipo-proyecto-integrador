export function crearId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function leerJsonLocalStorage(clave, valorInicial) {
  let texto;

  try {
    texto = localStorage.getItem(clave);
  } catch {
    throw new Error(`No se pudo leer el almacenamiento local (${clave}).`);
  }

  if (texto === null) return valorInicial;

  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(`Los datos guardados en ${clave} no son JSON válido.`);
  }
}

export function guardarJsonLocalStorage(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    throw new Error(`No se pudieron guardar los datos en ${clave}.`);
  }
}

export function crearElemento(etiqueta, clase, texto) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}
