/**
 * validate-eventos.mjs — Ultima barrera antes de publicar data/eventos.json.
 *
 * Uso:  npm run data:validate
 *       node scripts/validate-eventos.mjs [ruta]   (por defecto data/eventos.json)
 *
 * Sale con codigo 1 si el archivo no es JSON valido, si no es una
 * FeatureCollection, o si algun registro:
 *   - no trae el contrato de procedencia (fuente, confianza,
 *     ultima_verificacion) — CLAUDE.md seccion 5;
 *   - no trae `mag` numerica o su geometria no es un Point
 *     [lon, lat, profundidad_km];
 *   - cae fuera de la region de la consulta o de la ventana temporal del
 *     catalogo;
 *   - no trae las etiquetas de territorio `en_venezuela`, `zona_disputada` y
 *     `frente_costa` (booleanos, como mucho una en true) o, desde el CLI, si no coinciden con
 *     los poligonos de data/ (ADR-003).
 *
 * Sin dependencias: solo modulos nativos de Node. El contrato es el nucleo
 * neutral de arsenal (schemas/procedencia.schema.json) con la armadura
 * "confianza-escala" (alta/media/baja), la misma de orinoco-digital;
 * reimplementado aqui, no copiado.
 */

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { etiquetasDe, leerTerritorio } from "./territorio.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
export const RUTA_EVENTOS = join(RAIZ, "data", "eventos.json");

/**
 * Region de la consulta FDSN (rectangulo, grados decimales WGS84): un
 * rectangulo generoso alrededor de Venezuela que incluye trozos de los paises
 * vecinos y del Caribe. Confirmado por Luis en el gate de la Fase 1
 * (2026-10-21, "Rectangulo + etiqueta"): se descarga el rectangulo y cada
 * evento lleva `en_venezuela` / `zona_disputada` (ADR-003).
 * scripts/fetch-eventos.mjs construye la consulta con estos mismos valores:
 * una sola fuente de verdad para la consulta y para la validacion.
 */
export const REGION = Object.freeze({
  latMin: 0.5,
  latMax: 13.0,
  lonMin: -73.5,
  lonMax: -59.5,
});

/** Inicio del catalogo (ficha del proyecto; se mantiene en el gate F1). */
export const INICIO_CATALOGO = "1990-01-01";

/** Vocabulario cerrado de `confianza` (armadura "confianza-escala"). */
export const CONFIANZAS = Object.freeze(["alta", "media", "baja"]);

/** Etiquetas de territorio obligatorias (booleanos, ADR-003). */
export const ETIQUETAS = Object.freeze(["en_venezuela", "zona_disputada", "frente_costa"]);

/** Holgura para relojes desfasados: un evento no puede venir del futuro. */
const HOLGURA_FUTURO_MS = 24 * 60 * 60 * 1000;

/** AAAA-MM-DD y ademas una fecha que exista en el calendario. */
export function esFechaISO(valor) {
  if (typeof valor !== "string") return false;
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

const esNumero = (v) => typeof v === "number" && Number.isFinite(v);

/**
 * Errores de un registro (lista vacia = registro valido).
 * Con `territorio` (de territorio.mjs) se recalculan las etiquetas contra los
 * poligonos y se exige que coincidan: verifica la propiedad, no solo el tipo.
 */
export function validarEvento(feature, { ahora = Date.now(), territorio = null } = {}) {
  const errores = [];

  if (!feature || typeof feature !== "object" || feature.type !== "Feature") {
    return ["no es un Feature de GeoJSON"];
  }

  const p = feature.properties;
  if (!p || typeof p !== "object") {
    return ["sin properties"];
  }

  // Contrato de procedencia.
  if (typeof p.fuente !== "string" || !/\S/.test(p.fuente)) {
    errores.push("SIN FUENTE — no puede publicarse");
  }
  if (p.confianza === undefined || p.confianza === null || p.confianza === "") {
    errores.push("sin confianza");
  } else if (!CONFIANZAS.includes(p.confianza)) {
    errores.push(`confianza invalida "${p.confianza}" (se espera ${CONFIANZAS.join("/")})`);
  }
  if (p.ultima_verificacion === undefined || p.ultima_verificacion === null || p.ultima_verificacion === "") {
    errores.push("sin ultima_verificacion");
  } else if (!esFechaISO(p.ultima_verificacion)) {
    errores.push(`ultima_verificacion no es una fecha ISO 8601 AAAA-MM-DD (${p.ultima_verificacion})`);
  }

  // Magnitud.
  if (!esNumero(p.mag)) {
    errores.push(`sin magnitud numerica (mag = ${JSON.stringify(p.mag)})`);
  }

  // Ventana temporal.
  if (!esNumero(p.time)) {
    errores.push(`sin hora numerica (time = ${JSON.stringify(p.time)})`);
  } else {
    const inicio = Date.parse(`${INICIO_CATALOGO}T00:00:00Z`);
    if (p.time < inicio || p.time > ahora + HOLGURA_FUTURO_MS) {
      errores.push(`hora fuera de la ventana del catalogo (${new Date(p.time).toISOString()})`);
    }
  }

  // Etiquetas de territorio (ADR-003).
  let etiquetasBien = true;
  for (const clave of ETIQUETAS) {
    if (p[clave] === undefined || p[clave] === null) {
      errores.push(`sin ${clave}`);
      etiquetasBien = false;
    } else if (typeof p[clave] !== "boolean") {
      errores.push(`${clave} no es booleano (${JSON.stringify(p[clave])})`);
      etiquetasBien = false;
    }
  }
  if (ETIQUETAS.filter((clave) => p[clave] === true).length > 1) {
    errores.push(`lleva mas de una etiqueta de territorio en true (${ETIQUETAS.join(", ")} son excluyentes)`);
    etiquetasBien = false;
  }

  // Geometria: Point [lon, lat, profundidad_km].
  const g = feature.geometry;
  if (!g || g.type !== "Point" || !Array.isArray(g.coordinates)) {
    errores.push("la geometria no es un Point");
  } else if (g.coordinates.length < 3 || !g.coordinates.slice(0, 3).every(esNumero)) {
    errores.push(`coordenadas no son [lon, lat, profundidad_km] numericas (${JSON.stringify(g.coordinates)})`);
  } else {
    const [lon, lat] = g.coordinates;
    if (lat < REGION.latMin || lat > REGION.latMax || lon < REGION.lonMin || lon > REGION.lonMax) {
      errores.push(`fuera de la region de la consulta (lat ${lat}, lon ${lon})`);
    }
    if (territorio && etiquetasBien) {
      const esperadas = etiquetasDe([lon, lat], territorio);
      for (const clave of ETIQUETAS) {
        if (p[clave] !== esperadas[clave]) {
          errores.push(`${clave} = ${p[clave]} no coincide con el poligono de data/ (deberia ser ${esperadas[clave]})`);
        }
      }
    }
  }

  return errores;
}

/**
 * Valida una coleccion ya parseada.
 * @returns {{ total: number, errores: string[] }}
 */
export function validarColeccion(json, opciones = {}) {
  if (!json || typeof json !== "object" || json.type !== "FeatureCollection") {
    return { total: 0, errores: [`type es ${JSON.stringify(json?.type)}, se esperaba "FeatureCollection"`] };
  }
  if (!Array.isArray(json.features)) {
    return { total: 0, errores: ['"features" no es un array'] };
  }

  const errores = [];
  json.features.forEach((feature, i) => {
    const id = feature?.id ?? feature?.properties?.code ?? `#${i}`;
    for (const e of validarEvento(feature, opciones)) errores.push(`${id}: ${e}`);
  });
  return { total: json.features.length, errores };
}

/** Lee, parsea y valida un archivo. Nunca lanza: todo fallo es un error. */
export async function validarArchivo(ruta, opciones = {}) {
  let texto;
  try {
    texto = await readFile(ruta, "utf8");
  } catch (e) {
    return { total: 0, errores: [`no se pudo leer ${ruta}: ${e.code ?? e.message}`] };
  }
  let json;
  try {
    json = JSON.parse(texto);
  } catch (e) {
    return { total: 0, errores: [`JSON invalido: ${e.message}`] };
  }
  return validarColeccion(json, opciones);
}

async function main() {
  const ruta = process.argv[2] ? resolve(process.argv[2]) : RUTA_EVENTOS;
  console.log(`Validando ${ruta}`);
  let territorio;
  try {
    territorio = await leerTerritorio();
  } catch (e) {
    console.log(`  ERROR  no se pudieron leer los poligonos de data/: ${e.message}`);
    process.exit(1);
  }
  const { total, errores } = await validarArchivo(ruta, { territorio });
  for (const e of errores) console.log(`  ERROR  ${e}`);
  console.log(`${total} eventos, ${errores.length} errores.`);
  if (errores.length > 0) {
    console.log("Hay errores. Estos datos NO deben publicarse.");
    process.exit(1);
  }
  console.log("Validacion superada.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
