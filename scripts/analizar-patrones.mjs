/**
 * Analisis de patrones del catalogo (spec 001; plan 3.2-3.4). CLI:
 *   npm run data:patrones   ->  data/eventos.json -> data/patrones.json
 *
 * `analizar` es puro: declustering GK -> DBSCAN por clase con sensibilidad ->
 * control aleatorio (RF-9) -> Gutenberg-Richter por zona. Sin red (RF-4), sin
 * reloj, sin Math.random: mismo catalogo + mismos parametros + misma semilla =
 * mismo objeto (RF-5). Describe el catalogo PASADO; no estima nada futuro (RF-1).
 */

import { readFileSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { normalizarEvento, claseProfundidad, territorioDe, enVistaVenezuela, distanciaKm } from "../src/data.js";
import { REGION_CONSULTA } from "../src/config.js";
import { declustering } from "./ml/declustering.mjs";
import { agruparPorClase, controlAleatorio } from "./ml/dbscan.mjs";
import { ajustarGR } from "./ml/gutenberg-richter.mjs";
import { crearAzar, semillaDe } from "./ml/azar.mjs";
import { redondear, huellaCatalogo, serializar } from "./ml/serializar.mjs";
import {
  PARAMETROS_GR,
  PARAMETROS_GK,
  PARAMETROS_DBSCAN,
  PARAMETROS_AGRUPACION,
  SEMILLA_BASE,
} from "./ml/parametros.mjs";

export const FUENTE_DERIVADA = "Cálculo de sismos-ve sobre USGS FDSN Event Web Service";
export const CONFIANZA_DERIVADA = "media";
export const SEMILLAS_CONTROL_PRODUCCION = 20;
const LETRA = { superficial: "S", intermedio: "I", profundo: "P" };
const ORDEN_CLASES = ["superficial", "intermedio", "profundo"];
const cmpCadena = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const RAD = Math.PI / 180;
const R_TIERRA = 6371.0088;

const fechaIso = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Distancia (km) al borde de REGION_CONSULTA: paralelos exactos, meridianos en perpendicular. */
function distanciaAlBorde(lat, lon) {
  const r = REGION_CONSULTA;
  const aMeridiano = (lonBorde) =>
    R_TIERRA * Math.asin(Math.min(1, Math.abs(Math.cos(lat * RAD) * Math.sin((lon - lonBorde) * RAD))));
  return Math.min(
    distanciaKm(lat, lon, r.latMin, lon),
    distanciaKm(lat, lon, r.latMax, lon),
    aMeridiano(r.lonMin),
    aMeridiano(r.lonMax),
  );
}

function lugarFrecuente(eventos) {
  const cuenta = new Map();
  for (const e of eventos) {
    const lugar = (e.lugar ?? "").replace(/^\d+(?:\.\d+)? km [A-Z]+ of /, "").trim();
    if (!lugar) continue;
    cuenta.set(lugar, (cuenta.get(lugar) ?? 0) + 1);
  }
  let mejor = null;
  let max = 0;
  for (const [lugar, c] of cuenta) {
    if (c > max || (c === max && cmpCadena(lugar, mejor) < 0)) {
      mejor = lugar;
      max = c;
    }
  }
  return mejor;
}

/**
 * @param {object} coleccion FeatureCollection de data/eventos.json
 * @param {object} [opciones] B, semillasControl, semillaBase, agrupacion ({clase: {epsKm, minPts}}), gr
 */
export function analizar(coleccion, opciones = {}) {
  const semillaBase = opciones.semillaBase ?? SEMILLA_BASE;
  const semillasControl = opciones.semillasControl ?? SEMILLAS_CONTROL_PRODUCCION;
  const agrupacion = opciones.agrupacion ?? PARAMETROS_AGRUPACION;
  const gr = { ...PARAMETROS_GR, ...(opciones.gr ?? {}) };
  if (opciones.B !== undefined) gr.B = opciones.B;

  // Orden canonico (plan 3.1): tiempo ascendente, luego id.
  const eventos = coleccion.features
    .map((f) => ({ ...normalizarEvento(f), magType: f.properties.magType ?? null, status: f.properties.status }))
    .sort((a, b) => a.tiempo - b.tiempo || cmpCadena(a.id, b.id));
  const nAutomatic = eventos.filter((e) => e.status !== "reviewed").length;

  const { asignaciones, excluidos } = declustering(eventos);
  const rolDe = new Map(asignaciones.map((a) => [a.id, a]));
  const porId = new Map(eventos.map((e) => [e.id, e]));
  const analizables = eventos.filter((e) => rolDe.has(e.id));

  // Entrada a la agrupacion (RF-7): fondo superficial + todo intermedio/profundo.
  const entradas = [];
  for (const e of analizables) {
    if (rolDe.get(e.id).rol === "secuencia") continue;
    entradas.push({ id: e.id, lat: e.lat, lon: e.lon, clase: claseProfundidad(e.prof).clave });
  }
  const nPorClase = Object.fromEntries(ORDEN_CLASES.map((c) => [c, entradas.filter((x) => x.clase === c).length]));
  const resultado = agruparPorClase(entradas, agrupacion);

  // Control aleatorio (RF-9): un grupo que cumpla en ruido uniforme aborta sin salida.
  let gruposMax = 0;
  for (const clase of ORDEN_CLASES) {
    if (nPorClase[clase] === 0) continue;
    const c = controlAleatorio(nPorClase[clase], agrupacion[clase], { semillaBase, clase, semillas: semillasControl });
    if (c.gruposQueCumplen > 0) {
      throw new Error(
        `Control aleatorio fallido en la clase ${clase}: ${c.gruposQueCumplen} grupo(s) en ruido uniforme (RF-9). Parametros demasiado permisivos.`,
      );
    }
    gruposMax = Math.max(gruposMax, ...c.porSemilla);
  }

  // Zonas = grupos que cumplen la sensibilidad (RF-8) + secuencias de sus principales (RF-24).
  const zonaDeEvento = new Map(); // id -> indice en `crudas`
  const crudas = [];
  for (const clase of ORDEN_CLASES) {
    for (const g of resultado[clase]?.grupos ?? []) {
      if (!g.cumple) continue;
      const idx = crudas.length;
      crudas.push({ clase, ids: [...g.ids], jaccardMin: g.jaccardMin });
      for (const id of g.ids) zonaDeEvento.set(id, idx);
    }
  }
  for (const e of analizables) {
    const a = rolDe.get(e.id);
    if (a.rol === "secuencia" && zonaDeEvento.has(a.principal)) {
      const idx = zonaDeEvento.get(a.principal);
      zonaDeEvento.set(e.id, idx);
      crudas[idx].ids.push(e.id);
    }
  }

  const zonas = crudas.map((z) => {
    const evs = z.ids.map((id) => porId.get(id));
    const n = evs.length;
    const lat = evs.reduce((s, e) => s + e.lat, 0) / n;
    const lon = evs.reduce((s, e) => s + e.lon, 0) / n;
    const idMenor = z.ids.reduce((m, id) => (cmpCadena(id, m) < 0 ? id : m));
    const epsKm = agrupacion[z.clase].epsKm;
    const cuenta = (rol) => evs.filter((e) => rolDe.get(e.id).rol === rol).length;
    const terr = { venezuela: 0, costa: 0, disputa: 0, fuera: 0 };
    for (const e of evs) terr[territorioDe(e)]++;
    const tiempos = evs.map((e) => e.tiempo);
    const ajuste = ajustarGR(evs, gr, crearAzar(semillaDe(semillaBase, `gr|${z.clase}|${idMenor}`)));
    const conIc = ajuste.mcIc95 !== null;
    return {
      lon,
      lat,
      idMenor,
      clase: z.clase,
      salida: {
        id: null,
        clase_profundidad: z.clase,
        n_eventos: n,
        n_fondo: cuenta("fondo"),
        n_secuencia: cuenta("secuencia"),
        n_no_aplica: cuenta("no_aplica"),
        n_en_vista_venezuela: evs.filter(enVistaVenezuela).length,
        centro: { lat: redondear(lat, 4), lon: redondear(lon, 4) },
        caja: [
          redondear(Math.min(...evs.map((e) => e.lon)), 4),
          redondear(Math.min(...evs.map((e) => e.lat)), 4),
          redondear(Math.max(...evs.map((e) => e.lon)), 4),
          redondear(Math.max(...evs.map((e) => e.lat)), 4),
        ],
        en_borde: evs.some((e) => distanciaAlBorde(e.lat, e.lon) < epsKm),
        lugar_usgs_frecuente: lugarFrecuente(evs),
        periodo: { desde: fechaIso(Math.min(...tiempos)), hasta: fechaIso(Math.max(...tiempos)) },
        territorio: terr,
        sensibilidad: { jaccard_min: redondear(z.jaccardMin, 3) },
        gutenberg_richter: {
          publicado: ajuste.publicado,
          motivo: ajuste.motivo,
          familia: ajuste.familia,
          n_sobre_mc: ajuste.n,
          mc: conIc ? redondear(ajuste.mc, 1) : null,
          mc_ic95: conIc ? ajuste.mcIc95.map((x) => redondear(x, 1)) : null,
          b: ajuste.publicado ? redondear(ajuste.b, 3) : null,
          b_ic95: ajuste.publicado ? ajuste.bIc95.map((x) => redondear(x, 3)) : null,
          b_sigma_shi_bolt: ajuste.publicado ? redondear(ajuste.sigma, 3) : null,
        },
        fuente: FUENTE_DERIVADA,
        confianza: CONFIANZA_DERIVADA,
        ultima_verificacion: coleccion.metadata.ultima_verificacion,
      },
    };
  });

  // RF-3: oeste -> este; empate latitud de norte a sur; luego id de evento menor.
  zonas.sort((a, b) => a.lon - b.lon || b.lat - a.lat || cmpCadena(a.idMenor, b.idMenor));
  const contador = { superficial: 0, intermedio: 0, profundo: 0 };
  for (const z of zonas) {
    contador[z.clase]++;
    z.salida.id = `${LETRA[z.clase]}${String(contador[z.clase]).padStart(2, "0")}`;
  }

  const conteoRol = { fondo: 0, secuencia: 0, no_aplica: 0 };
  for (const a of asignaciones) conteoRol[a.rol]++;

  return {
    metadata: {
      fuente: FUENTE_DERIVADA,
      ultima_verificacion: coleccion.metadata.ultima_verificacion,
      atribucion: "Datos: U.S. Geological Survey (USGS), dominio publico",
      catalogo_n: coleccion.features.length,
      catalogo_sha256: huellaCatalogo(coleccion),
      metodo: {
        version: "1",
        declustering: "gardner-knopoff-1974",
        agrupacion: "dbscan-haversine",
        gr: "aki-1965-mle+bootstrap-percentil",
      },
      parametros: {
        gutenberg_richter: { ...gr },
        gardner_knopoff: { ...PARAMETROS_GK },
        sensibilidad: { factores: [...PARAMETROS_DBSCAN.factores], j_min: PARAMETROS_DBSCAN.jMin },
        agrupacion: Object.fromEntries(ORDEN_CLASES.map((c) => [c, { ...agrupacion[c] }])),
      },
      semilla_base: semillaBase,
      filtro_confianza: "ninguno",
      n_automatic: nAutomatic,
      excluidos,
      control_aleatorio: { semillas_por_clase: semillasControl, grupos_max: gruposMax },
      resumen: { ...conteoRol, sin_zona: analizables.filter((e) => !zonaDeEvento.has(e.id)).length },
    },
    zonas: zonas.map((z) => z.salida),
  };
}

/**
 * Lee `entrada`, analiza y escribe `salida` de forma atomica (temporal + rename).
 * Si el analisis falla, no toca `salida`, borra el temporal y propaga el error.
 * (La validacion previa al reemplazo, RF-26, la anade T08.)
 */
export function ejecutar({ entrada, salida, opciones = {} }) {
  const coleccion = JSON.parse(readFileSync(entrada, "utf8"));
  const tmp = `${salida}.tmp`;
  try {
    const texto = serializar(analizar(coleccion, opciones));
    writeFileSync(tmp, texto);
    renameSync(tmp, salida);
    return texto;
  } catch (err) {
    rmSync(tmp, { force: true });
    throw err;
  }
}

const esCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (esCli) {
  const raiz = fileURLToPath(new URL("..", import.meta.url));
  const t0 = Date.now();
  try {
    const texto = ejecutar({ entrada: `${raiz}data/eventos.json`, salida: `${raiz}data/patrones.json` });
    const p = JSON.parse(texto);
    console.log(
      `data/patrones.json: ${p.zonas.length} zonas, ${Buffer.byteLength(texto)} bytes, ${((Date.now() - t0) / 1000).toFixed(1)} s`,
    );
  } catch (err) {
    console.error(`analizar-patrones: ${err.message}`);
    process.exit(1);
  }
}
