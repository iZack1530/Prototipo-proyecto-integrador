#!/usr/bin/env node
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directorioHerramientas = path.dirname(fileURLToPath(import.meta.url));
const raizProyecto = path.resolve(directorioHerramientas, "..");
const anchos = [480, 960, 1920];
const formatosAdmitidos = new Set([".avif", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"]);
const argumentos = process.argv.slice(2);

function mostrarAyuda() {
  console.log([
    "Uso: node herramientas/optimizar-imagenes.mjs [directorio-entrada] [directorio-salida]",
    "",
    "Lee imágenes de galeria/originales/ y genera versiones WebP de hasta 480, 960 y 1920 px",
    "en ../galeria-optimizada/ (fuera del repositorio). Las imágenes pequeñas no se amplían.",
    "Requiere sharp disponible en el proyecto: npm install --no-save --package-lock=false sharp",
  ].join("\n"));
}

if (argumentos.includes("--ayuda") || argumentos.includes("--help")) {
  mostrarAyuda();
} else {
  let sharp;
  try {
    const moduloSharp = await import("sharp");
    sharp = moduloSharp.default;
  } catch (error) {
    throw new Error("Falta la dependencia sharp. Instálala con `npm install --no-save --package-lock=false sharp` para ejecutar la optimización.", { cause: error });
  }

  const directorioEntrada = argumentos[0]
    ? path.resolve(process.cwd(), argumentos[0])
    : path.join(raizProyecto, "galeria", "originales");
  const directorioSalida = argumentos[1]
    ? path.resolve(process.cwd(), argumentos[1])
    : path.resolve(raizProyecto, "..", "galeria-optimizada");
  const entradas = await readdir(directorioEntrada, { withFileTypes: true });
  const imagenes = entradas
    .filter((entrada) => entrada.isFile() && formatosAdmitidos.has(path.extname(entrada.name).toLowerCase()))
    .map((entrada) => entrada.name);

  if (imagenes.length === 0) {
    throw new Error(`No se encontraron imágenes compatibles en ${directorioEntrada}.`);
  }

  await mkdir(directorioSalida, { recursive: true });
  let errores = 0;

  for (const nombre of imagenes) {
    const origen = path.join(directorioEntrada, nombre);
    const nombreBase = path.basename(nombre, path.extname(nombre));

    for (const ancho of anchos) {
      const destino = path.join(directorioSalida, `${nombreBase}-${ancho}.webp`);
      try {
        await sharp(origen)
          .rotate()
          .resize({ width: ancho, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82, effort: 5 })
          .toFile(destino);
        console.log(`Optimizada: ${path.relative(raizProyecto, destino)}`);
      } catch (error) {
        errores += 1;
        console.error(`No se pudo optimizar ${origen} a ${ancho}px: ${error.message}`);
      }
    }
  }

  if (errores > 0) {
    process.exitCode = 1;
    console.error(`La optimización terminó con ${errores} error(es).`);
  }
}
