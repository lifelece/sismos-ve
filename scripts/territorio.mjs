/**
 * territorio.mjs — Etiqueta cada evento con `en_venezuela` y `zona_disputada`.
 *
 * Decision de Luis en el gate de la Fase 1 (2026-10-21, "Rectangulo +
 * etiqueta"): se sigue descargando el rectangulo del USGS y cada evento dice
 * si su epicentro cae en el poligono terrestre de Venezuela (con islas) y si
 * cae en la zona en disputa de la Guayana Esequiba. Ver
 * docs/adr/ADR-003-region-rectangulo-etiqueta.md.
 *
 * Poligonos: data/limites-venezuela.geojson y data/zona-disputada.geojson,
 * copiados sin cambios de orinoco-digital (geoBoundaries ADM0 / Natural Earth,
 * dominio publico; ver LICENSE-DATA). Vienen como LineString cerrados (son
 * limites para dibujar, no areas): aqui se reconstruyen los poligonos a partir
 * de esos anillos, con su anidamiento (exterior / hueco).
 *
 * Punto en poligono por ray casting (regla par-impar), sin dependencias.
 * Coordenadas planas lon/lat: para decidir dentro/fuera no hace falta
 * geodesia, solo que el punto y el poligono esten en el mismo sistema (WGS84).
 *
 * Limites conocidos (docs/fases/FASE-1-DATOS.md):
 * - Un epicentro en el mar queda en false: el poligono es terrestre.
 * - La linea esta simplificada (~440 m, Douglas-Peucker en el origen): un
 *   evento a menos de ~0,5 km de la costa o de la frontera puede caer del
 *   otro lado. Los epicentros del USGS tienen incertidumbres de kilometros,
 *   asi que la etiqueta nunca es mas precisa que el propio dato.
 * - Un punto exactamente sobre un borde puede salir dentro o fuera.
 */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
export const RUTA_LIMITES = join(RAIZ, "data", "limites-venezuela.geojson");
export const RUTA_DISPUTA = join(RAIZ, "data", "zona-disputada.geojson");

/**
 * Ray casting par-impar: cuenta cuantas aristas cruza un rayo horizontal
 * hacia el este. La comparacion semiabierta `(yi > y) !== (yj > y)` evita
 * contar dos veces un vertice que cae justo a la altura del punto.
 * @param {[number, number]} punto [lon, lat]
 * @param {Array<[number, number]>} anillo cerrado o no (el cierre no cambia el resultado)
 */
export function puntoEnAnillo([x, y], anillo) {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i, i += 1) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      dentro = !dentro;
    }
  }
  return dentro;
}

/** Polygon de GeoJSON: dentro del anillo exterior y fuera de todos sus huecos. */
export function puntoEnPoligono(punto, [exterior, ...huecos]) {
  if (!puntoEnAnillo(punto, exterior)) return false;
  return !huecos.some((hueco) => puntoEnAnillo(punto, hueco));
}

/** Geometria Polygon o MultiPolygon de GeoJSON. */
export function puntoEnGeometria(punto, geometria) {
  if (geometria?.type === "Polygon") return puntoEnPoligono(punto, geometria.coordinates);
  if (geometria?.type === "MultiPolygon") {
    return geometria.coordinates.some((poligono) => puntoEnPoligono(punto, poligono));
  }
  throw new Error(`Se esperaba Polygon o MultiPolygon, llego ${geometria?.type}`);
}

/** Caja [lonMin, latMin, lonMax, latMax] de un anillo. */
function caja(anillo) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of anillo) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

const cajaDentro = (a, b) => a[0] >= b[0] && a[1] >= b[1] && a[2] <= b[2] && a[3] <= b[3];

function comprobarAnillo(anillo, i) {
  if (!Array.isArray(anillo) || anillo.length < 4) {
    throw new Error(`El anillo ${i} tiene menos de 4 puntos: no es un poligono.`);
  }
  const [a, b] = [anillo[0], anillo[anillo.length - 1]];
  if (a[0] !== b[0] || a[1] !== b[1]) {
    throw new Error(`El anillo ${i} no esta cerrado (primer y ultimo punto distintos).`);
  }
}

/**
 * Reconstruye las coordenadas de un MultiPolygon a partir de anillos sueltos.
 * Profundidad = cuantos anillos contienen a este. Par -> exterior (tierra);
 * impar -> hueco del exterior mas pequeno que lo contiene. Asi una isla dentro
 * de un lago dentro de un continente sale bien.
 * @param {Array<Array<[number, number]>>} anillos cerrados
 * @returns {Array<Array<Array<[number, number]>>>} coordenadas de MultiPolygon
 */
export function poligonosDesdeAnillos(anillos) {
  anillos.forEach(comprobarAnillo);
  const info = anillos.map((anillo) => ({ anillo, caja: caja(anillo), contenedores: [] }));
  for (const a of info) {
    for (const b of info) {
      if (a === b || !cajaDentro(a.caja, b.caja)) continue;
      if (puntoEnAnillo(a.anillo[0], b.anillo)) a.contenedores.push(b);
    }
  }
  const exteriores = info.filter((a) => a.contenedores.length % 2 === 0);
  const poligonos = new Map(exteriores.map((e) => [e, [e.anillo]]));
  for (const hueco of info.filter((a) => a.contenedores.length % 2 === 1)) {
    // El exterior directo es el contenedor con una profundidad menos.
    const padre = hueco.contenedores.find((c) => c.contenedores.length === hueco.contenedores.length - 1);
    poligonos.get(padre).push(hueco.anillo);
  }
  return [...poligonos.values()];
}

/**
 * Anillos (LineString cerrados) de una coleccion de limites con el `nivel`
 * pedido ("pais" en limites-venezuela, "disputa" en zona-disputada).
 */
export function anillosDePais(coleccion, nivel) {
  const anillos = (coleccion?.features ?? [])
    .filter((f) => f?.properties?.nivel === nivel && f.geometry?.type === "LineString")
    .map((f) => f.geometry.coordinates);
  if (anillos.length === 0) throw new Error(`La coleccion no trae ningun anillo de nivel "${nivel}".`);
  return anillos;
}

/** Geometria MultiPolygon con la caja precalculada para descartar rapido. */
function multipoligono(anillos) {
  const coordinates = poligonosDesdeAnillos(anillos);
  return { type: "MultiPolygon", coordinates, caja: caja(coordinates.flatMap((p) => p[0])) };
}

/**
 * @param {{ limites: object, disputa: object }} colecciones GeoJSON ya parseados
 * @returns {{ venezuela: object, disputa: object }} dos MultiPolygon
 */
export function cargarTerritorio({ limites, disputa }) {
  return {
    venezuela: multipoligono(anillosDePais(limites, "pais")),
    disputa: multipoligono(anillosDePais(disputa, "disputa")),
  };
}

/** Lee los dos GeoJSON versionados en data/ y construye el territorio. */
export async function leerTerritorio({ rutaLimites = RUTA_LIMITES, rutaDisputa = RUTA_DISPUTA } = {}) {
  const [limites, disputa] = await Promise.all(
    [rutaLimites, rutaDisputa].map(async (ruta) => JSON.parse(await readFile(ruta, "utf8")))
  );
  return cargarTerritorio({ limites, disputa });
}

function dentro(punto, geometria) {
  const [x0, y0, x1, y1] = geometria.caja;
  const [x, y] = punto;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  return puntoEnGeometria(punto, geometria);
}

/**
 * Etiquetas de un punto [lon, lat].
 *
 * Las dos fuentes trazan la frontera de facto con vertices distintos
 * (geoBoundaries simplificado a ~440 m frente a Natural Earth), asi que hay
 * franjas finas que caen en los dos poligonos. Ahi gana `zona_disputada`: un
 * evento nunca lleva las dos etiquetas en true (el validador lo exige).
 * @returns {{ en_venezuela: boolean, zona_disputada: boolean }}
 */
export function etiquetasDe(punto, territorio) {
  const zona_disputada = dentro(punto, territorio.disputa);
  return {
    en_venezuela: !zona_disputada && dentro(punto, territorio.venezuela),
    zona_disputada,
  };
}

/** Devuelve una copia del evento con las dos etiquetas. No muta la entrada. */
export function etiquetarTerritorio(feature, territorio) {
  const [lon, lat] = feature.geometry.coordinates;
  return {
    ...feature,
    properties: { ...feature.properties, ...etiquetasDe([lon, lat], territorio) },
  };
}
