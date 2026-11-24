#!/usr/bin/env python3
"""Extrae el audio base64 de un laboratorio/index.html monolítico.

Uso: python3 herramientas/extraer-audio.py [origen]

En cada ejecución:
- decodifica xb64, xb64c, xb64u y xsfxb64 a assets/audio/;
- reescribe el HTML con rutas a esos archivos, deja xdemo_d inline;
- elimina los bloques de audio embebidos (es idempotente).

Cuando el HTML ya está migrado no hay bloques que extraer: solo comprueba
que los MP3 existen y que las referencias a los cuatro nombres están presentes.
"""
import base64
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / "laboratorio/index.html"
AUDIO = RAIZ / "assets/audio"
DESTINOS = {
    "xb64": "musica-menu.mp3",
    "xb64c": "musica-combate.mp3",
    "xb64u": "musica-ultimo.mp3",
    "xsfxb64": "efectos.mp3",
}
BLOQUE = re.compile(r'<script type="text/plain" id="(xb64c|xb64u|xb64|xsfxb64)">([^<]*)</script>\s*\n?')
RUTAS = {
    "menu": "assets/audio/musica-menu.mp3",
    "combate": "assets/audio/musica-combate.mp3",
    "ultimo": "assets/audio/musica-ultimo.mp3",
}
# Las rutas relativas a laboratorio/ se resuelven desde el HTML con ../.
PREFIJO = "../" if ORIGEN.parent == RAIZ / "laboratorio" else ""

texto = ORIGEN.read_text(encoding="utf-8")
encontrados = {}
for id_, datos in BLOQUE.findall(texto):
    limpio = "".join(datos.split())
    encontrados[id_] = limpio
    mp3 = base64.b64decode(limpio, validate=True)
    if mp3[:3] != b"ID3":
        raise SystemExit(f"{id_}: no parece MP3")
    (AUDIO / DESTINOS[id_]).write_bytes(mp3)
    print(f"{id_} -> assets/audio/{DESTINOS[id_]} ({len(mp3)} bytes)")

if encontrados:
    texto = BLOQUE.sub("", texto)
    texto = re.sub(
        r"try\{const bin=atob\(\$\('xb64'\)\.textContent\.trim\(\)\).*?\}catch\(e\)\{\}",
        "", texto,
    )
    texto = re.sub(
        r"const IDS=\{menu:'xb64',combate:'xb64c',ultimo:'xb64u'\},URLS=\{\};",
        "const IDS=" + repr({k: PREFIJO + RUTAS[k] for k in RUTAS}) + ",URLS={};",
        texto,
    )
    texto = re.sub(
        r"const trk=k=>\{if\(URLS\[k\]\)return URLS\[k\];try\{const bin=atob\(\$\(IDS\[k\]\)\.textContent\.trim\(\)\).*?\}catch\(e\)\{return''\}\};",
        "const trk=k=>IDS[k]||'';",
        texto,
    )
    texto = re.sub(
        r"const bin=atob\(\$\('xsfxb64'\)\.textContent\.trim\(\)\),u=new Uint8Array\(bin\.length\);for\(let i=0;i<bin\.length;i\+\+\)u\[i\]=bin\.charCodeAt\(i\);ctx\.decodeAudioData\(u\.buffer,",
        "const r=await fetch(" + repr(PREFIJO + DESTINOS['xsfxb64']) + "),ab=await r.arrayBuffer();ctx.decodeAudioData(ab,",
        texto,
    )
    texto = re.sub(r"function init\(\)\{if\(ctx\)return;try\{", "async function init(){if(ctx)return;try{", texto)
    ORIGEN.write_text(texto, encoding="utf-8")

faltan = [n for n in DESTINOS.values() if not (AUDIO / n).exists()]
if faltan:
    raise SystemExit("faltan MP3: " + ", ".join(faltan))
for clave, nombre in RUTAS.items():
    if PREFIJO + nombre not in texto:
        raise SystemExit(f"{ORIGEN}: falta referencia a {nombre}")
if PREFIJO + DESTINOS["xsfxb64"] not in texto:
    raise SystemExit(f"{ORIGEN}: falta referencia a {DESTINOS['xsfxb64']}")
print(f"{ORIGEN}: {ORIGEN.stat().st_size} bytes; audio verificado")
