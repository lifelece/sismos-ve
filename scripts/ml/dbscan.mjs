/**
 * DBSCAN espacial con distancia haversine, estabilidad por Jaccard y control
 * aleatorio (spec 001, RF-7, RF-8, RF-9; plan 3.2-3.3).
 *
 * - dbscan(puntos, { epsKm, minPts }) -> { etiquetas: Int32Array (-1 = ruido), k }
 *   Vecindad por rejilla de celdas de lado >= epsKm. minPts cuenta el propio
 *   punto (convencion de Ester et al. 1996 y scikit-learn). Un punto de borde
 *   queda en el primer grupo que lo alcanza: el resultado de este nivel
 *   depende del orden de la entrada; `agrupar` lo fija ordenando por id.
 * - dbscanFuerzaBruta: mismo algoritmo con vecindad O(n^2); sirve de oraculo.
 * - sensibilidad(puntos, base, { epsKm, minPts, factores }) -> [{ grupo, jaccardMin }]
 *   Para cada grupo base y cada factor f, se vuelve a correr DBSCAN con
 *   epsKm*f; el "mejor equivalente" es el grupo perturbado de MAXIMO Jaccard
 *   con el base (0 si no hay solapamiento). jaccardMin = minimo sobre factores.
 *   ES UNA ADAPTACION de Hennig (2007): su umbral 0,75 es para la MEDIA de
 *   Jaccard sobre remuestreos bootstrap (fpc::clusterboot), no para la
 *   perturbacion de un parametro; aqui no hay bootstrap de puntos (ADR-010 §2).
 * - agrupar(entradas, params) -> { k, grupos: [{ ids, n, jaccardMin, cumple }] }
 *   cumple = jaccardMin >= jMin (RF-8: los que no cumplen no se publican).
 * - agruparPorClase(entradas, paramsPorClase): una corrida independiente por
 *   clase de profundidad (RF-7); las clases nunca se mezclan.
 * - controlAleatorio: ruido uniforme en area con la misma n; DEBIL (spec 3,
 *   ADR-010): solo detecta que el metodo no inventa grupos en ruido uniforme
 *   (sin estructura espacial real ni la sismicidad no uniforme). Que pase no
 *   prueba que los grupos reales sean fisicos.
 *
 * epsKm y minPts son parametros: los valores de produccion se calibran en
 * T06 y no viven aqui.
 */

import { distanciaKm } from "../../src/data.js";
import { REGION_CONSULTA } from "../../src/config.js";
import { PARAMETROS_DBSCAN } from "./parametros.mjs";
import { crearAzar, semillaDe } from "./azar.mjs";

const KM_POR_GRADO_MIN = 111.0; // < 111,195 real: celdas algo mayores, nunca menores
const RAD = Math.PI / 180;
const cmpCadena = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Vecindad (indices a distancia <= epsKm, incluido el propio punto) por rejilla. */
function vecindadPorRejilla(puntos, epsKm) {
  let latAbsMax = 0;
  for (const p of puntos) latAbsMax = Math.max(latAbsMax, Math.abs(p.lat));
  const cosMin = Math.cos(Math.min(latAbsMax, 89) * RAD);
  const celdaLat = epsKm / KM_POR_GRADO_MIN;
  const celdaLon = (epsKm / (KM_POR_GRADO_MIN * cosMin)) * 1.01; // margen por curvatura
  const clave = (cx, cy) => cx * 1000003 + cy;
  const celdas = new Map();
  const coords = puntos.map((p) => [Math.floor((p.lon + 180) / celdaLon), Math.floor((p.lat + 90) / celdaLat)]);
  coords.forEach(([cx, cy], i) => {
    const k = clave(cx, cy);
    const lista = celdas.get(k);
    if (lista) lista.push(i);
    else celdas.set(k, [i]);
  });
  return (i) => {
    const [cx, cy] = coords[i];
    const p = puntos[i];
    const vecinos = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const lista = celdas.get(clave(cx + dx, cy + dy));
        if (!lista) continue;
        for (const j of lista) {
          if (distanciaKm(p.lat, p.lon, puntos[j].lat, puntos[j].lon) <= epsKm) vecinos.push(j);
        }
      }
    }
    return vecinos;
  };
}

function vecindadFuerzaBruta(puntos, epsKm) {
  return (i) => {
    const p = puntos[i];
    const vecinos = [];
    for (let j = 0; j < puntos.length; j++) {
      if (distanciaKm(p.lat, p.lon, puntos[j].lat, puntos[j].lon) <= epsKm) vecinos.push(j);
    }
    return vecinos;
  };
}

function nucleoDbscan(n, vecinosDe, minPts) {
  const NO_VISTO = -2;
  const etiquetas = new Int32Array(n).fill(NO_VISTO);
  let k = 0;
  for (let i = 0; i < n; i++) {
    if (etiquetas[i] !== NO_VISTO) continue;
    const vecinos = vecinosDe(i);
    if (vecinos.length < minPts) {
      etiquetas[i] = -1;
      continue;
    }
    etiquetas[i] = k;
    const cola = vecinos;
    for (let q = 0; q < cola.length; q++) {
      const j = cola[q];
      if (etiquetas[j] === -1) etiquetas[j] = k; // ruido -> borde
      if (etiquetas[j] !== NO_VISTO) continue;
      etiquetas[j] = k;
      const vj = vecinosDe(j);
      if (vj.length >= minPts) for (const m of vj) cola.push(m);
    }
    k++;
  }
  return { etiquetas, k };
}

function validar({ epsKm, minPts }) {
  if (!(epsKm > 0) || !Number.isInteger(minPts) || minPts < 1) {
    throw new Error("dbscan: epsKm debe ser > 0 y minPts un entero >= 1");
  }
}

export function dbscan(puntos, { epsKm, minPts }) {
  validar({ epsKm, minPts });
  if (puntos.length === 0) return { etiquetas: new Int32Array(0), k: 0 };
  return nucleoDbscan(puntos.length, vecindadPorRejilla(puntos, epsKm), minPts);
}

export function dbscanFuerzaBruta(puntos, { epsKm, minPts }) {
  validar({ epsKm, minPts });
  return nucleoDbscan(puntos.length, vecindadFuerzaBruta(puntos, epsKm), minPts);
}

export function sensibilidad(puntos, base, { epsKm, minPts, factores = PARAMETROS_DBSCAN.factores }) {
  const tamBase = new Array(base.k).fill(0);
  for (const e of base.etiquetas) if (e >= 0) tamBase[e]++;
  const jaccardMin = new Array(base.k).fill(Infinity);
  for (const f of factores) {
    const pert = dbscan(puntos, { epsKm: epsKm * f, minPts });
    const tamPert = new Array(pert.k).fill(0);
    for (const e of pert.etiquetas) if (e >= 0) tamPert[e]++;
    // solape[g] = Map(etiqueta perturbada -> |interseccion|)
    const solape = Array.from({ length: base.k }, () => new Map());
    for (let i = 0; i < puntos.length; i++) {
      const g = base.etiquetas[i];
      const h = pert.etiquetas[i];
      if (g < 0 || h < 0) continue;
      solape[g].set(h, (solape[g].get(h) ?? 0) + 1);
    }
    for (let g = 0; g < base.k; g++) {
      let mejor = 0;
      for (const [h, inter] of solape[g]) {
        mejor = Math.max(mejor, inter / (tamBase[g] + tamPert[h] - inter));
      }
      jaccardMin[g] = Math.min(jaccardMin[g], mejor);
    }
  }
  return jaccardMin.map((j, grupo) => ({ grupo, jaccardMin: j }));
}

/** entradas: [{ id, lat, lon }]. Ordena por id para que el resultado no dependa del orden de entrada. */
export function agrupar(entradas, params) {
  const { epsKm, minPts } = params;
  const factores = params.factores ?? PARAMETROS_DBSCAN.factores;
  const jMin = params.jMin ?? PARAMETROS_DBSCAN.jMin;
  validar({ epsKm, minPts });
  const puntos = [...entradas].sort((a, b) => cmpCadena(a.id, b.id));
  const base = dbscan(puntos, { epsKm, minPts });
  if (base.k === 0) return { k: 0, grupos: [] };
  const sens = sensibilidad(puntos, base, { epsKm, minPts, factores });
  const ids = Array.from({ length: base.k }, () => []);
  puntos.forEach((p, i) => {
    if (base.etiquetas[i] >= 0) ids[base.etiquetas[i]].push(p.id);
  });
  const grupos = ids.map((lista, g) => ({
    ids: lista,
    n: lista.length,
    jaccardMin: sens[g].jaccardMin,
    cumple: sens[g].jaccardMin >= jMin,
  }));
  return { k: base.k, grupos };
}

/** entradas: [{ id, lat, lon, clase }]; paramsPorClase: { [clase]: { epsKm, minPts } }. */
export function agruparPorClase(entradas, paramsPorClase) {
  const porClase = {};
  for (const clase of Object.keys(paramsPorClase)) porClase[clase] = [];
  for (const e of entradas) {
    if (!(e.clase in porClase)) throw new Error(`agruparPorClase: clase sin parametros: ${e.clase}`);
    porClase[e.clase].push(e);
  }
  const salida = {};
  for (const [clase, lista] of Object.entries(porClase)) {
    salida[clase] = { n: lista.length, ...agrupar(lista, paramsPorClase[clase]) };
  }
  return salida;
}

/**
 * Control aleatorio de una clase: `semillas` corridas con n puntos uniformes en
 * area dentro de `caja` (plan 3.3). Semilla por clave `control|<clase>|<i>`.
 * Devuelve cuantos grupos CUMPLEN el criterio de sensibilidad (RF-9: debe ser 0).
 */
export function controlAleatorio(n, params, { semillaBase, clase, semillas, caja = REGION_CONSULTA }) {
  const sMin = Math.sin(caja.latMin * RAD);
  const sMax = Math.sin(caja.latMax * RAD);
  const porSemilla = [];
  for (let i = 0; i < semillas; i++) {
    const azar = crearAzar(semillaDe(semillaBase, `control|${clase}|${i}`));
    const entradas = Array.from({ length: n }, (_, j) => {
      const lon = caja.lonMin + azar.siguiente() * (caja.lonMax - caja.lonMin);
      const lat = Math.asin(sMin + azar.siguiente() * (sMax - sMin)) / RAD;
      return { id: `u${j}`, lat, lon };
    });
    porSemilla.push(agrupar(entradas, params).grupos.filter((g) => g.cumple).length);
  }
  return { gruposQueCumplen: porSemilla.reduce((a, b) => a + b, 0), porSemilla };
}
