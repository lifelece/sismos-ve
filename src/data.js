/**
 * data.js — Catalogo normalizado y filtros de la Fase 2. Puro: sin DOM ni red.
 *
 * La interfaz trabaja con un registro plano por evento (nombres propios del
 * proyecto) en vez de navegar el GeoJSON del USGS en cada filtro.
 */

import { ANIO_INICIO, MAGNITUD_MINIMA, PROFUNDIDAD, RADIO, VISTA_INICIAL } from "./config.js";

/**
 * @typedef {Object} Evento
 * @property {string} id         id del USGS (us6000t7zp)
 * @property {number} mag
 * @property {string|null} magTipo
 * @property {string} lugar      texto de lugar del USGS, tal cual (en ingles)
 * @property {number} tiempo     ms desde 1970, UTC
 * @property {number} anio       año UTC
 * @property {number} prof       profundidad en km
 * @property {number} lat
 * @property {number} lon
 * @property {string|null} url   ficha publica del USGS
 * @property {string} confianza  alta | media
 * @property {boolean} enVenezuela
 * @property {boolean} zonaDisputada
 */

/** @returns {Evento} */
export function normalizarEvento(feature) {
  const p = feature.properties;
  const [lon, lat, prof] = feature.geometry.coordinates;
  return {
    id: feature.id,
    mag: p.mag,
    magTipo: p.magType ?? null,
    lugar: p.place ?? "",
    tiempo: p.time,
    anio: new Date(p.time).getUTCFullYear(),
    prof,
    lat,
    lon,
    url: p.url ?? null,
    confianza: p.confianza,
    enVenezuela: p.en_venezuela === true,
    zonaDisputada: p.zona_disputada === true,
  };
}

/**
 * @returns {{ eventos: Evento[], verificacion: string|null, anioMin: number, anioMax: number, magMax: number }}
 */
export function normalizarColeccion(json) {
  if (json?.type !== "FeatureCollection" || !Array.isArray(json.features)) {
    throw new Error("El catalogo no es una FeatureCollection");
  }
  const eventos = json.features.map(normalizarEvento).sort((a, b) => b.tiempo - a.tiempo);
  let anioMax = ANIO_INICIO;
  let magMax = MAGNITUD_MINIMA;
  for (const e of eventos) {
    if (e.anio > anioMax) anioMax = e.anio;
    if (e.mag > magMax) magMax = e.mag;
  }
  return {
    eventos,
    verificacion: json.metadata?.ultima_verificacion ?? null,
    anioMin: ANIO_INICIO,
    anioMax,
    magMax,
  };
}

/** Clase de profundidad (config.js PROFUNDIDAD). Negativa = sobre el nivel del mar. */
export function claseProfundidad(km) {
  return PROFUNDIDAD.find((c) => km <= c.hasta) ?? PROFUNDIDAD[PROFUNDIDAD.length - 1];
}

/** Radio en px por magnitud (config.js RADIO). */
export function radioPorMagnitud(mag) {
  const r = RADIO.base * 10 ** (RADIO.factor * (mag - RADIO.magRef));
  return Math.min(RADIO.max, Math.max(RADIO.min, r));
}

/** "venezuela" | "disputa" | "fuera" (mar o paises vecinos). */
export function territorioDe(evento) {
  if (evento.zonaDisputada) return "disputa";
  return evento.enVenezuela ? "venezuela" : "fuera";
}

/**
 * @typedef {{ vista: "venezuela"|"region", desde: number, hasta: number, magMin: number }} Filtro
 */

/** @returns {Filtro} */
export function filtroInicial(coleccion) {
  return { vista: VISTA_INICIAL, desde: coleccion.anioMin, hasta: coleccion.anioMax, magMin: MAGNITUD_MINIMA };
}

/** Eventos visibles con un filtro. Años y magnitud, inclusivos. */
export function filtrarEventos(eventos, filtro) {
  const { vista, desde, hasta, magMin } = filtro;
  return eventos.filter(
    (e) => (vista === "region" || e.enVenezuela) && e.anio >= desde && e.anio <= hasta && e.mag >= magMin
  );
}

/**
 * Filtro ampliado lo justo para que `evento` se vea (buscador, ADR-006). Si ya
 * se ve, devuelve el mismo objeto.
 * @returns {Filtro}
 */
export function ampliarFiltroPara(filtro, evento) {
  if (filtrarEventos([evento], filtro).length === 1) return filtro;
  return {
    vista: filtro.vista === "region" || evento.enVenezuela ? filtro.vista : "region",
    desde: Math.min(filtro.desde, evento.anio),
    hasta: Math.max(filtro.hasta, evento.anio),
    magMin: Math.min(filtro.magMin, Math.floor(evento.mag * 10 + 1e-9) / 10),
  };
}

const dosDigitos = (n) => String(n).padStart(2, "0");

/** "2026-06-24 22:05 UTC", independiente de la zona horaria del equipo. */
export function fechaUTC(ms) {
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}-${dosDigitos(d.getUTCMonth() + 1)}-${dosDigitos(d.getUTCDate())} ` +
    `${dosDigitos(d.getUTCHours())}:${dosDigitos(d.getUTCMinutes())} UTC`
  );
}
