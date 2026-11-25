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

## Solución C# (Integrante 3)

Junto al sitio estático convive la solución .NET del proyecto. El **Núcleo** es la única fuente de verdad de las reglas de combate: lo usan el servidor y, como DLL `netstandard2.1`, el cliente de Unity.

```text
├─ HorizonMythos.sln
├─ src/
│  ├─ HorizonMythos.Nucleo/       # netstandard2.1, sin ASP.NET ni Unity
│  ├─ HorizonMythos.Servidor/     # ASP.NET Core (.NET 10) — esqueleto, lo completa I4
│  └─ HorizonMythos.Simulador/    # consola de simulación por lotes
├─ pruebas/
│  ├─ HorizonMythos.Nucleo.Pruebas/   # xUnit con casos_prueba.json
│  └─ HorizonMythos.Servidor.Pruebas/ # xUnit (esqueleto, lo completa I4)
└─ .github/workflows/integracion.yml
```

Convenciones: nombres en español, un commit por funcionalidad, ramas `iN/<tema>` integradas por Pull Request, y `main` siempre compilando. El Núcleo no referencia ASP.NET Core, Unity ni paquetes NuGet.

### Contrato Núcleo ↔ Servidor ↔ Cliente

- `Batalla.Crear(catalogo, equipoA, equipoB, formato, semilla)`
- `Batalla.ResolverTurno(accionA, accionB) → IReadOnlyList<EventoCombate>`
- Acciones: `atacar`, `cambiar`, `usarObjeto`. Eventos: `daño`, `estado`, `clima`, `KO`, `fin`.
- Hub SignalR del servidor: `/hub/combate`.

### Cómo verificar

```bash
dotnet restore
dotnet build --no-restore
dotnet test --no-build
```

Simulación masiva:

```bash
dotnet run --project src/HorizonMythos.Simulador -- --combates 3000
```

Las pruebas de paridad consumen `pruebas/HorizonMythos.Nucleo.Pruebas/casos_prueba.json`, generado por el Laboratorio (`herramientas/generar-casos.mjs`) a partir de `datos_prueba.json` v5. El orden de los grupos es RNG, estadísticas, costes, daño, efectos y repeticiones.
