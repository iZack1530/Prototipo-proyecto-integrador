# Laboratorio RPG

Herramienta de diseño y pruebas para un RPG por turnos 3v3 (criaturas, ataques, habilidades, tipos, simulador de combate, equilibrio y exportación para Unity).

La raíz es solo una portada. La aplicación vive en **`laboratorio/`** y el bestiario público en **`bestiario/`**.

## Estructura

- `index.html`: portada con el enlace a `/laboratorio/`.
- `laboratorio/`: aplicación principal (`index.html` y `pruebas/casos_prueba.json`).
- `bestiario/`: consulta pública del catálogo y calculadora de daño.
- `archivo/Laboratorio_RPG_v9.html`: documento histórico original, conservado solo como referencia.
- `assets/css/laboratorio/`: estilos de la aplicación.
- `assets/js/laboratorio/`: núcleo y módulos ES del Laboratorio.
- `assets/audio/`: pistas MP3 (menú, combate, último turno y efectos).
- `datos/` y `herramientas/`: catálogo público y generadores de datos/vectores de paridad.
- `datos_prueba.json`: datos de ejemplo para cargar desde la pestaña Reglas.
- `.nojekyll`: necesario para publicar el sitio en GitHub Pages.

`laboratorio-rpg-pages.zip` es un respaldo local y está excluido del repositorio mediante `.gitignore`.

## Probar en local

El sitio es estático, pero los módulos ES requieren servirse por HTTP (no `file://`):

```sh
python3 -m http.server 8000
```

Abre `http://localhost:8000/` para la portada, `http://localhost:8000/laboratorio/` para la aplicación y `http://localhost:8000/bestiario/` para el bestiario.

## Publicar en GitHub Pages

1. Sube el repositorio con `.nojekyll` en la raíz.
2. En **Settings → Pages**, elige *Deploy from a branch*, rama `main` y carpeta `/ (root)`.
3. Abre `https://<usuario>.github.io/<repositorio>/laboratorio/`.

## Datos

Los datos se guardan en el `localStorage` del navegador. Usa la pestaña Reglas → **Cargar datos de prueba** o **Importar todo** con `datos_prueba.json`. En Ajustes puedes exportarlos para respaldarlos o moverlos entre equipos. La música y los efectos arrancan tras el primer clic.
