#!/usr/bin/env node
/**
 * medir-js.mjs — Mide el JS PROPIO (gzip) de dist/ y comprueba RNF-4 (spec 001):
 * <= LINEA_BASE + 5 KB y <= 150 KB en total. El chunk de Leaflet es una
 * dependencia (ADR-001) y no cuenta como JS propio. Sin dependencias: node:zlib.
 *
 *   npm run build && npm run medir:js     (sale con codigo 1 si se supera)
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

/** JS propio gzip (bytes) del build de `main` antes de la spec 001 (T09, 2026-11-12). */
export const LINEA_BASE_BYTES = 18252;
export const MARGEN_BYTES = 5 * 1024;
export const TOPE_BYTES = 150 * 1024;

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "assets");

export function medir(dir = ASSETS) {
  const piezas = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".js")) continue;
    const buf = readFileSync(join(dir, f));
    piezas.push({ archivo: f, bytes: buf.length, gzip: gzipSync(buf, { level: 9 }).length, esLeaflet: f.startsWith("leaflet") });
  }
  const propio = piezas.filter((p) => !p.esLeaflet);
  return { piezas, propioGzip: propio.reduce((s, p) => s + p.gzip, 0), propioBytes: propio.reduce((s, p) => s + p.bytes, 0) };
}

export function evaluar(propioGzip, base = LINEA_BASE_BYTES) {
  const errores = [];
  if (propioGzip > base + MARGEN_BYTES) errores.push(`JS propio ${propioGzip} B > linea base ${base} B + 5 KB`);
  if (propioGzip > TOPE_BYTES) errores.push(`JS propio ${propioGzip} B > 150 KB`);
  return errores;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  let r;
  try {
    r = medir();
  } catch {
    console.error("medir-js: no hay dist/assets; corre `npm run build` primero.");
    process.exit(1);
  }
  for (const p of r.piezas) console.log(`${p.archivo}: ${p.bytes} B, gzip ${p.gzip} B${p.esLeaflet ? " (Leaflet, no cuenta)" : ""}`);
  console.log(`JS propio: ${r.propioBytes} B, gzip ${r.propioGzip} B (linea base ${LINEA_BASE_BYTES} B, margen +${MARGEN_BYTES} B, tope ${TOPE_BYTES} B)`);
  const errores = evaluar(r.propioGzip);
  for (const e of errores) console.error(`ERROR ${e}`);
  process.exit(errores.length ? 1 : 0);
}
