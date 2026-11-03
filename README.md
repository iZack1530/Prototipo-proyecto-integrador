# Laboratorio RPG

Herramienta de diseño y pruebas para un RPG por turnos 3v3 (criaturas, ataques, habilidades, tipos, simulador de combate, equilibrio y exportación para Unity).

Es una sola página estática: `index.html` (sin dependencias externas ni servidor). Los datos se guardan en el `localStorage` del navegador.

## Publicar en GitHub Pages
1. Crea un repositorio y sube `index.html`, `.nojekyll` y este `README.md`.
2. En **Settings → Pages**, elige *Deploy from a branch*, rama `main` y carpeta `/ (root)`.
3. Abre `https://<usuario>.github.io/<repositorio>/`.

## Datos de prueba
En la página, pestaña Reglas → **Cargar datos de prueba**, o «Importar todo» con `datos_prueba.json`.

## Notas
- Los datos viven en cada navegador: usa Ajustes → *Exportar todo* para respaldarlos o moverlos entre equipos.
- La música y los efectos arrancan tras el primer clic (restricción del navegador).
