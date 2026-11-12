/**
 * Catalogos sinteticos fijos (plan §3.7). Todo el azar sale de
 * scripts/ml/azar.mjs: sin generador no sembrado (RNF-6). Solo datos de prueba:
 * ninguna lectura de data/eventos.json.
 */

import { crearAzar } from "../scripts/ml/azar.mjs";
import { REGION_CONSULTA } from "../src/config.js";

const KM_POR_GRADO = 111.195;
const RAD = Math.PI / 180;
const DIA_MS = 86400000;
const T0_MS = Date.UTC(2020, 0, 1);

export function distanciaKm(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * RAD;
  const dLon = (lon2 - lon1) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(h));
}

/** Punto a `km` de (lat, lon) en el rumbo `rumbo` (radianes); plano local. */
function desplazar(lat, lon, km, rumbo) {
  return {
    lat: lat + (km * Math.cos(rumbo)) / KM_POR_GRADO,
    lon: lon + (km * Math.sin(rumbo)) / (KM_POR_GRADO * Math.cos(lat * RAD)),
  };
}

/** Uniforme en area sobre una caja lat/lon: lon uniforme, lat = asin(uniforme en senos). */
export function puntoUniformeEnArea(azar, caja = REGION_CONSULTA) {
  const lon = caja.lonMin + azar.siguiente() * (caja.lonMax - caja.lonMin);
  const sMin = Math.sin(caja.latMin * RAD);
  const sMax = Math.sin(caja.latMax * RAD);
  const lat = Math.asin(sMin + azar.siguiente() * (sMax - sMin)) / RAD;
  return { lat, lon };
}

export function puntosUniformes(semilla, n, caja = REGION_CONSULTA) {
  const azar = crearAzar(semilla);
  return Array.from({ length: n }, () => puntoUniformeEnArea(azar, caja));
}

function normal(azar) {
  const u = 1 - azar.siguiente(); // (0, 1]
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * azar.siguiente());
}

/** G-R: M = 3,0 - log10(U)/b, redondeada a 0,1; familia mb. */
export function catalogoGR(semilla, { b = 1.0, n = 1000, mmin = 3.0 } = {}) {
  const azar = crearAzar(semilla);
  return Array.from({ length: n }, (_, i) => {
    const u = 1 - azar.siguiente(); // (0, 1]: evita log10(0)
    const mag = Math.round((mmin - Math.log10(u) / b) * 10) / 10;
    return { id: `gr${i}`, mag, magType: "mb" };
  });
}

export const CENTROS_NUBES = Object.freeze([
  { lat: 10.0, lon: -69.0 },
  { lat: 8.0, lon: -64.0 },
  { lat: 6.8, lon: -73.0 },
]);

/**
 * 3 nubes gaussianas (sigma 10 km, 150 puntos) + 300 de ruido uniforme en area.
 * Cada punto lleva `nube` (0-2) o -1 si es ruido. Parametros de DBSCAN del
 * test: epsKm 15, minPts 10 (independientes de los de produccion).
 */
export function catalogoAgrupaciones(semilla = 1) {
  const azar = crearAzar(semilla);
  const puntos = [];
  CENTROS_NUBES.forEach((c, nube) => {
    for (let i = 0; i < 150; i++) {
      const dx = normal(azar) * 10;
      const dy = normal(azar) * 10;
      const lat = c.lat + dy / KM_POR_GRADO;
      const lon = c.lon + dx / (KM_POR_GRADO * Math.cos(c.lat * RAD));
      puntos.push({ id: `n${nube}-${i}`, lat, lon, nube });
    }
  });
  for (let i = 0; i < 300; i++) {
    const p = puntoUniformeEnArea(azar);
    puntos.push({ id: `r${i}`, lat: p.lat, lon: p.lon, nube: -1 });
  }
  return puntos;
}

export const EPS_KM_TEST = 15;
export const MINPTS_TEST = 10;

/**
 * Secuencia: principal M 6,0 en (10,0; -66,0); 100 replicas a <= 0,5*L km y
 * entre 1 dia y 0,5*T dias despues, M 3,0-5,0; 50 aislados M 4,0 a > 2L km
 * del principal y separados > 2T dias entre si y del principal.
 * `ventanaKm` = L(6,0) y `ventanaDias` = T(6,0) los pone el llamador (salen
 * de parametros.mjs en T04); aqui no se fijan.
 * `tiempo` en ms epoch; profundidad 10 km (superficial).
 */
export function catalogoSecuencia(semilla, { ventanaKm, ventanaDias }) {
  if (!(ventanaKm > 0) || !(ventanaDias > 0)) {
    throw new Error("catalogoSecuencia: ventanaKm y ventanaDias deben ser > 0");
  }
  const azar = crearAzar(semilla);
  const principal = { id: "principal", lat: 10.0, lon: -66.0, mag: 6.0, tiempo: T0_MS, prof: 10, rol: "principal" };
  const replicas = Array.from({ length: 100 }, (_, i) => {
    const km = Math.sqrt(azar.siguiente()) * 0.5 * ventanaKm;
    const p = desplazar(principal.lat, principal.lon, km, azar.siguiente() * 2 * Math.PI);
    const dias = 1 + azar.siguiente() * (0.5 * ventanaDias - 1);
    const mag = Math.round((3.0 + azar.siguiente() * 2.0) * 10) / 10;
    return { id: `replica${i}`, lat: p.lat, lon: p.lon, mag, tiempo: T0_MS + dias * DIA_MS, prof: 10, rol: "replica" };
  });
  const aislados = [];
  for (let k = 0; k < 50; k++) {
    let p;
    do {
      p = puntoUniformeEnArea(azar);
    } while (distanciaKm(principal.lat, principal.lon, p.lat, p.lon) <= 2 * ventanaKm);
    const dias = 2.5 * ventanaDias * (k + 1);
    aislados.push({ id: `aislado${k}`, lat: p.lat, lon: p.lon, mag: 4.0, tiempo: T0_MS + dias * DIA_MS, prof: 10, rol: "aislado" });
  }
  return { principal, replicas, aislados, eventos: [principal, ...replicas, ...aislados] };
}
