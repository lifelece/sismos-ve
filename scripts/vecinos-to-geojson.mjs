/**
 * vecinos-to-geojson.mjs — Genera data/paises-vecinos.geojson (ADR-009).
 *
 * Uso (una vez, a mano; el archivo de entrada se descarga aparte):
 *   node scripts/vecinos-to-geojson.mjs <ne_50m_admin_0_countries.geojson>
 *
 * Toma Natural Earth admin-0 a escala 1:50m (dominio publico), quita
 * Venezuela y recorta cada pais a la caja de la consulta FDSN (REGION), para
 * que el archivo pese poco. Sirve para que un sismo en tierra de otro pais no
 * cuente como "frente a la costa" de Venezuela. Sin dependencias.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { REGION } from "./validate-eventos.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
export const RUTA_VECINOS = join(RAIZ, "data", "paises-vecinos.geojson");

export const FUENTE_VECINOS =
  "Natural Earth 1:50m Admin 0 - Countries (natural-earth-vector, commit 9380cca, 2022-05-13), dominio publico. " +
  "Recortado a la caja de la consulta FDSN por scripts/vecinos-to-geojson.mjs.";

const redondear = (v) => Math.round(v * 1e4) / 1e4;

/**
 * Sutherland-Hodgman contra un rectangulo [x0, y0, x1, y1]. Devuelve el anillo
 * recortado y cerrado, o null si queda vacio. Puede dejar aristas sobre el
 * borde de la caja: no importan para decidir si un punto esta dentro.
 */
export function recortarAnillo(anillo, [x0, y0, x1, y1]) {
  const bordes = [
    { dentro: ([x]) => x >= x0, corte: (a, b) => cruce(a, b, 0, x0) },
    { dentro: ([x]) => x <= x1, corte: (a, b) => cruce(a, b, 0, x1) },
    { dentro: ([, y]) => y >= y0, corte: (a, b) => cruce(a, b, 1, y0) },
    { dentro: ([, y]) => y <= y1, corte: (a, b) => cruce(a, b, 1, y1) },
  ];
  let puntos = anillo.slice(0, -1);
  for (const { dentro, corte } of bordes) {
    if (puntos.length === 0) break;
    const salida = [];
    for (let i = 0; i < puntos.length; i += 1) {
      const actual = puntos[i];
      const previo = puntos[(i + puntos.length - 1) % puntos.length];
      if (dentro(actual)) {
        if (!dentro(previo)) salida.push(corte(previo, actual));
        salida.push(actual);
      } else if (dentro(previo)) {
        salida.push(corte(previo, actual));
      }
    }
    puntos = salida;
  }
  if (puntos.length < 3) return null;
  const cerrado = puntos.map(([x, y]) => [redondear(x), redondear(y)]);
  cerrado.push([...cerrado[0]]);
  return cerrado;
}

function cruce(a, b, eje, valor) {
  const t = (valor - a[eje]) / (b[eje] - a[eje]);
  const p = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  p[eje] = valor;
  return p;
}

/** Polygon o MultiPolygon recortado; null si no queda nada dentro de la caja. */
export function recortarGeometria(geometria, caja) {
  const poligonos = geometria.type === "Polygon" ? [geometria.coordinates] : geometria.coordinates;
  const salida = [];
  for (const [exterior, ...huecos] of poligonos) {
    const e = recortarAnillo(exterior, caja);
    if (!e) continue;
    salida.push([e, ...huecos.map((h) => recortarAnillo(h, caja)).filter(Boolean)]);
  }
  return salida.length ? { type: "MultiPolygon", coordinates: salida } : null;
}

/** Codigo ISO 3166-1 alfa-3; Natural Earth pone -99 en algunos (Francia). */
export const isoDe = (p) => (p.ISO_A3 && p.ISO_A3 !== "-99" ? p.ISO_A3 : p.ADM0_A3);

export function vecinosDesde(naturalEarth) {
  const caja = [REGION.lonMin, REGION.latMin, REGION.lonMax, REGION.latMax];
  const features = [];
  for (const f of naturalEarth.features) {
    const iso = isoDe(f.properties);
    if (iso === "VEN") continue;
    const geometry = recortarGeometria(f.geometry, caja);
    if (!geometry) continue;
    features.push({ type: "Feature", properties: { iso, nombre: f.properties.NAME, fuente: FUENTE_VECINOS }, geometry });
  }
  return { type: "FeatureCollection", features: features.sort((a, b) => a.properties.iso.localeCompare(b.properties.iso)) };
}

async function main() {
  const entrada = process.argv[2];
  if (!entrada) throw new Error("Falta la ruta de ne_50m_admin_0_countries.geojson");
  const coleccion = vecinosDesde(JSON.parse(await readFile(resolve(entrada), "utf8")));
  const texto = `{"type":"FeatureCollection","features":[\n${coleccion.features.map((f) => JSON.stringify(f)).join(",\n")}\n]}\n`;
  await writeFile(RUTA_VECINOS, texto, "utf8");
  console.log(`${RUTA_VECINOS}: ${coleccion.features.map((f) => f.properties.iso).join(", ")} (${texto.length} bytes)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    await main();
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}
