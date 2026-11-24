# Laboratorio RPG

Herramienta de diseño y pruebas para un RPG por turnos 3v3 (criaturas, ataques, habilidades, tipos, simulador de combate, equilibrio y exportación para Unity).

Es un sitio estático sin dependencias externas ni servidor: `index.html` carga `assets/css/` (base, tema, componentes), `assets/js/laboratorio/` (motor, interfaz y módulos) y `assets/audio/`. Los datos se guardan en el `localStorage` del navegador.

## Estructura
- `assets/css/`: `base.css` (estructura), `tema.css` («Tecnología viva») y `componentes.css` (arena y ajustes).
- `assets/js/laboratorio/`: `motor.js` (datos, fórmulas, RNG y combate) y un archivo por módulo de interfaz, en orden de carga.
- `assets/audio/`: pistas MP3 (menú, combate, último turno y efectos), cargadas al primer clic.

## Publicar en GitHub Pages
1. Crea un repositorio y sube `index.html`, `assets/`, `datos_prueba.json`, `.nojekyll` y este `README.md`.
2. En **Settings → Pages**, elige *Deploy from a branch*, rama `main` y carpeta `/ (root)`.
3. Abre `https://<usuario>.github.io/<repositorio>/`.

## Datos de prueba
En la página, pestaña Reglas → **Cargar datos de prueba**, o «Importar todo» con `datos_prueba.json`.

## Notas
- Los datos viven en cada navegador: usa Ajustes → *Exportar todo* para respaldarlos o moverlos entre equipos.
- La música y los efectos arrancan tras el primer clic (restricción del navegador).
