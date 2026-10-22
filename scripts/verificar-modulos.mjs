#!/usr/bin/env node
/**
 * verificar-modulos.mjs — Gate de arquitectura sin dependencias (ADR-007).
 *
 * Reglas que un import de mas rompe sin que nadie lo note leyendo:
 *
 *   1. Solo `map.js` importa `leaflet` (CLAUDE.md, estructura: "Unico modulo
 *      que importa Leaflet").
 *   2. `ui.js` (y cualquier `ui/**`) no importa `map.js`: habla con el mapa por
 *      `puenteMapa.js`. Un import arrastraria Leaflet al primer pintado.
 *   3. `main.js` importa `map.js` solo con `import()` dinamico.
 *   4. Solo `api.js` hace `fetch`.
 *   5. Nada pide datos a `usgs.gov` (CLAUDE.md regla 3): ningun `fetch` hacia
 *      ese dominio y ninguna URL de `usgs.gov` en `api.js`. Los enlaces que
 *      abre la persona (ficha publica del evento) si se permiten.
 *
 * Patron trasplantado de orinoco-digital (scripts/verificar-modulos.mjs de ese
 * proyecto). No es un parser: expresiones regulares sobre el texto, que bastan
 * para cinco reglas de dependencia. Uso: `node scripts/verificar-modulos.mjs`
 * (tambien corre dentro de `npm test`, en test/modulos.test.mjs).
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/** import ... from "leaflet[/...]", import "leaflet/...", import("leaflet"). */
const RE_LEAFLET = /\bimport\b[^;\n]*["']leaflet(?:\/[^"']*)?["']/;
/** Cualquier import (estatico o dinamico) de map.js. */
const RE_MAP = /\bimport\b[^;\n]*["'][^"']*\bmap(?:\.js)?["']/;
/** Import ESTATICO de map.js: `import ... from "./map.js"` o `import "./map.js"`. */
const RE_MAP_ESTATICO = /(?:^|[;\n])\s*(?:import|export)\b(?:[^;"'()]*?\bfrom\s*)?["'][^"']*\bmap(?:\.js)?["']/m;
const RE_FETCH = /\bfetch\s*\(/;
const RE_FETCH_USGS = /\bfetch\s*\([^)]*usgs\.gov/;

function archivosJs(dir, base = dir) {
  const salida = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) salida.push(...archivosJs(ruta, base));
    else if (entrada.name.endsWith(".js")) salida.push(ruta.slice(base.length + 1).replaceAll("\\", "/"));
  }
  return salida;
}

/**
 * @param {string} [raiz] carpeta src/ a revisar
 * @returns {string[]} errores (vacio = todo bien)
 */
export function verificarModulos(raiz = SRC) {
  const errores = [];
  for (const archivo of archivosJs(raiz)) {
    const texto = readFileSync(join(raiz, archivo), "utf8");
    const esUi = archivo === "ui.js" || archivo.startsWith("ui/");

    if (archivo !== "map.js" && RE_LEAFLET.test(texto)) {
      errores.push(`${archivo}: importa leaflet (solo map.js puede)`);
    }
    if (esUi && RE_MAP.test(texto)) {
      errores.push(`${archivo}: importa map.js (usa puenteMapa.js)`);
    }
    if (archivo === "main.js" && RE_MAP_ESTATICO.test(texto)) {
      errores.push(`${archivo}: importa map.js de forma estatica (debe ser import() dinamico, ADR-007)`);
    }
    if (archivo !== "api.js" && RE_FETCH.test(texto)) {
      errores.push(`${archivo}: hace fetch (solo api.js puede)`);
    }
    if (RE_FETCH_USGS.test(texto) || (archivo === "api.js" && texto.includes("usgs.gov"))) {
      errores.push(`${archivo}: pide datos a usgs.gov (CLAUDE.md regla 3: solo data/eventos.json)`);
    }
  }
  return errores;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const errores = verificarModulos();
  for (const e of errores) console.log(`  ERROR  ${e}`);
  console.log(errores.length ? `${errores.length} violaciones de modulos.` : "Modulos: reglas cumplidas.");
  process.exit(errores.length ? 1 : 0);
}
