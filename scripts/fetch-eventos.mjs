/**
 * fetch-eventos.mjs — Unica pieza del proyecto que habla con el USGS
 * (CLAUDE.md regla 3, ADR-002). Corre en la GitHub Action diaria.
 *
 * Uso:  npm run data:fetch
 *       node scripts/fetch-eventos.mjs
 *
 * 1. Pregunta al servicio FDSN cuantos eventos cumplen la consulta (/count) y
 *    se niega a seguir si el total alcanza el limite de 20 000 por consulta:
 *    preferimos fallar a truncar en silencio.
 * 2. Descarga el GeoJSON (/query) y envuelve cada evento con el contrato de
 *    datos (fuente, confianza, ultima_verificacion) SIN descartar ningun campo
 *    original del USGS (CLAUDE.md seccion 5).
 * 3. Etiqueta cada evento con `en_venezuela` y `zona_disputada` contra los
 *    poligonos versionados en data/ (ADR-003, scripts/territorio.mjs).
 * 4. Valida la coleccion con el mismo validador del CI y solo entonces
 *    escribe data/eventos.json (un evento por linea, para diffs legibles).
 *
 * Sin dependencias: `fetch` global de Node 20+.
 * Documentacion del servicio: https://earthquake.usgs.gov/fdsnws/event/1/
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  INICIO_CATALOGO,
  REGION,
  RUTA_EVENTOS,
  validarColeccion,
} from "./validate-eventos.mjs";
import { etiquetarTerritorio, leerTerritorio } from "./territorio.mjs";

export const SERVICIO_FDSN = "https://earthquake.usgs.gov/fdsnws/event/1";

/** Valor fijo de `fuente` (FASE-1-DATOS.md, "Contrato de datos"). */
export const FUENTE = "USGS FDSN Event Web Service";

/** Umbral de la ficha del proyecto (se mantiene en el gate F1, 2026-10-21). */
export const MAGNITUD_MINIMA = 3;

/** Procedencia de las etiquetas de territorio, para metadata (ADR-003). */
export const FUENTE_ETIQUETAS =
  "en_venezuela: geoBoundaries gbOpen VEN ADM0 (Natural Earth), dominio publico; " +
  "zona_disputada: Natural Earth ne_10m_admin_0_disputed_areas, dominio publico; " +
  "frente_costa: fuera de tierra venezolana y a <= 50 km de su costa (misma fuente).";

/** Maximo de resultados por consulta que admite el servicio FDSN del USGS. */
export const LIMITE_FDSN = 20000;

/** A partir de esta fraccion del limite, se avisa (sin fallar). */
const FRACCION_AVISO = 0.8;

const CABECERAS = { "User-Agent": "sismos-ve (panel de divulgacion open source; descarga diaria)" };

/** Fecha AAAA-MM-DD (UTC) de un instante. */
export const fechaISO = (instante) => instante.toISOString().slice(0, 10);

/**
 * URL de la consulta. `metodo` es "query" (eventos) o "count" (solo el total).
 * endtime = el instante en que corre la Action (UTC, a segundos).
 */
export function construirUrl(metodo, ahora) {
  const url = new URL(`${SERVICIO_FDSN}/${metodo}`);
  const p = url.searchParams;
  p.set("format", "geojson");
  p.set("starttime", INICIO_CATALOGO);
  p.set("endtime", ahora.toISOString().slice(0, 19));
  p.set("minmagnitude", String(MAGNITUD_MINIMA));
  p.set("minlatitude", String(REGION.latMin));
  p.set("maxlatitude", String(REGION.latMax));
  p.set("minlongitude", String(REGION.lonMin));
  p.set("maxlongitude", String(REGION.lonMax));
  if (metodo === "query") {
    p.set("orderby", "time");
    p.set("limit", String(LIMITE_FDSN));
  }
  return url;
}

/**
 * `confianza` a partir de `properties.status` del USGS.
 * El USGS documenta "reviewed" (revisado por un sismologo) y "automatic".
 * Cualquier otro valor cae en "media" (propuesta de CLAUDE.md seccion 5,
 * pendiente de que Luis decida si hace falta un nivel "baja").
 */
export function confianzaDesdeStatus(status) {
  return status === "reviewed" ? "alta" : "media";
}

/** Envuelve un evento del USGS con el contrato. No muta la entrada. */
export function aplicarContrato(feature, fechaVerificacion) {
  return {
    ...feature,
    properties: {
      ...feature.properties,
      fuente: FUENTE,
      confianza: confianzaDesdeStatus(feature.properties?.status),
      ultima_verificacion: fechaVerificacion,
    },
  };
}

/**
 * Copia de la coleccion con las etiquetas de territorio en cada evento. No
 * toca ningun otro campo; aplicarla dos veces da lo mismo (idempotente).
 */
export function etiquetarColeccion(coleccion, territorio) {
  return {
    ...coleccion,
    metadata: { ...coleccion.metadata, etiquetas: FUENTE_ETIQUETAS },
    features: coleccion.features.map((f) => etiquetarTerritorio(f, territorio)),
  };
}

/**
 * Decide si el total de /count permite descargar sin truncar.
 * Lanza si no; devuelve un aviso (o null) si se puede seguir.
 */
export function comprobarLimite(total) {
  if (!Number.isInteger(total) || total < 0) {
    throw new Error(`El servicio devolvio un total no valido: ${JSON.stringify(total)}`);
  }
  if (total === 0) {
    throw new Error("La consulta devolvio 0 eventos: probable fallo del servicio. No se sobrescribe el catalogo.");
  }
  if (total >= LIMITE_FDSN) {
    throw new Error(
      `La consulta devuelve ${total} eventos y el servicio corta en ${LIMITE_FDSN}: ` +
        "el catalogo saldria truncado. Hay que partir la consulta (por ejemplo, por decada)."
    );
  }
  if (total >= LIMITE_FDSN * FRACCION_AVISO) {
    return `AVISO: ${total} eventos, cerca del limite de ${LIMITE_FDSN} por consulta.`;
  }
  return null;
}

/** GET con reintentos y tiempo maximo. Devuelve el JSON. */
async function obtenerJson(url, { fetchImpl, intentos = 3, esperaMs = 5000 }) {
  let ultimoError;
  for (let intento = 1; intento <= intentos; intento += 1) {
    try {
      const r = await fetchImpl(url, { headers: CABECERAS, signal: AbortSignal.timeout(120_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
      return await r.json();
    } catch (e) {
      ultimoError = e;
      if (intento < intentos) await new Promise((ok) => setTimeout(ok, esperaMs * intento));
    }
  }
  throw ultimoError;
}

/**
 * Consulta el FDSN y devuelve la FeatureCollection con el contrato y las
 * etiquetas de territorio aplicados. `fetchImpl`, `ahora` y `territorio` se
 * inyectan para poder probarlo sin red.
 */
export async function descargarEventos({
  fetchImpl = fetch,
  ahora = new Date(),
  esperaMs = 5000,
  log = console.log,
  territorio = null,
} = {}) {
  const poligonos = territorio ?? (await leerTerritorio());
  const conteo = await obtenerJson(construirUrl("count", ahora), { fetchImpl, esperaMs });
  const aviso = comprobarLimite(conteo?.count);
  if (aviso) log(aviso);

  const urlConsulta = construirUrl("query", ahora);
  const usgs = await obtenerJson(urlConsulta, { fetchImpl, esperaMs });
  if (usgs?.type !== "FeatureCollection" || !Array.isArray(usgs.features)) {
    throw new Error("La respuesta del USGS no es una FeatureCollection");
  }
  if (usgs.features.length >= LIMITE_FDSN) {
    throw new Error(`La respuesta trae ${usgs.features.length} eventos: posible truncado en el limite de ${LIMITE_FDSN}.`);
  }
  if (usgs.features.length !== conteo.count) {
    // Entre /count y /query pueden entrar o salir eventos; se informa, no se oculta.
    log(`AVISO: /count dijo ${conteo.count} y /query trajo ${usgs.features.length}.`);
  }

  const fecha = fechaISO(ahora);
  const coleccion = {
    type: "FeatureCollection",
    metadata: {
      ...usgs.metadata,
      fuente: FUENTE,
      ultima_verificacion: fecha,
      atribucion: "Datos: U.S. Geological Survey (USGS), dominio publico",
    },
    ...(usgs.bbox ? { bbox: usgs.bbox } : {}),
    features: usgs.features.map((f) => aplicarContrato(f, fecha)),
  };
  return etiquetarColeccion(coleccion, poligonos);
}

/** Cambios frente al catalogo anterior, por id del USGS. */
export function resumirCambios(anterior, nueva) {
  const previos = new Map((anterior?.features ?? []).map((f) => [f.id, f]));
  const actuales = new Set();
  let nuevos = 0;
  let actualizados = 0;
  for (const f of nueva.features) {
    actuales.add(f.id);
    const previo = previos.get(f.id);
    if (!previo) nuevos += 1;
    else if (previo.properties?.updated !== f.properties?.updated) actualizados += 1;
  }
  let retirados = 0;
  for (const id of previos.keys()) if (!actuales.has(id)) retirados += 1;
  return { nuevos, actualizados, retirados };
}

/** "N en Venezuela, M en la zona en disputa, K fuera (mar o paises vecinos)". */
export function resumirEtiquetas(coleccion) {
  let ven = 0;
  let disputa = 0;
  let costa = 0;
  for (const f of coleccion.features) {
    if (f.properties.en_venezuela) ven += 1;
    if (f.properties.zona_disputada) disputa += 1;
    if (f.properties.frente_costa) costa += 1;
  }
  const fuera = coleccion.features.length - ven - disputa - costa;
  return `${ven} en Venezuela, ${costa} frente a la costa, ${disputa} en la zona en disputa, ${fuera} fuera`;
}

/** JSON valido con un evento por linea: diffs diarios legibles en Git. */
export function serializar(coleccion) {
  const { features, ...resto } = coleccion;
  const cabecera = JSON.stringify(resto, null, 2).slice(0, -2); // quita "\n}"
  const cuerpo = features.map((f) => `    ${JSON.stringify(f)}`).join(",\n");
  return `${cabecera},\n  "features": [\n${cuerpo}\n  ]\n}\n`;
}

async function leerAnterior(ruta) {
  try {
    return JSON.parse(await readFile(ruta, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const ahora = new Date();
  const territorio = await leerTerritorio();
  const coleccion = await descargarEventos({ ahora, territorio });

  const { errores } = validarColeccion(coleccion, { ahora: ahora.getTime(), territorio });
  if (errores.length > 0) {
    for (const e of errores.slice(0, 50)) console.log(`  ERROR  ${e}`);
    console.log(`${errores.length} errores de contrato: NO se escribe ${RUTA_EVENTOS}.`);
    process.exit(1);
  }

  const anterior = await leerAnterior(RUTA_EVENTOS);
  const cambios = resumirCambios(anterior, coleccion);
  await writeFile(RUTA_EVENTOS, serializar(coleccion), "utf8");

  const tiempos = coleccion.features.map((f) => f.properties.time);
  const confianzas = coleccion.features.reduce((acc, f) => {
    acc[f.properties.confianza] = (acc[f.properties.confianza] ?? 0) + 1;
    return acc;
  }, {});
  const lineas = [
    `## Catalogo de eventos del USGS (${fechaISO(ahora)})`,
    "",
    `- Consulta: ${coleccion.metadata.url}`,
    `- Eventos: ${coleccion.features.length}`,
    `- Rango (UTC): ${new Date(Math.min(...tiempos)).toISOString()} a ${new Date(Math.max(...tiempos)).toISOString()}`,
    `- Confianza: ${Object.entries(confianzas).map(([k, v]) => `${k} ${v}`).join(", ")}`,
    `- Territorio: ${resumirEtiquetas(coleccion)}`,
    `- Frente al archivo anterior: ${cambios.nuevos} nuevos, ${cambios.actualizados} revisados por el USGS, ${cambios.retirados} retirados`,
    "",
    "Validacion de contrato superada. Datos: U.S. Geological Survey (dominio publico).",
  ];
  console.log(lineas.join("\n"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    await main();
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}
