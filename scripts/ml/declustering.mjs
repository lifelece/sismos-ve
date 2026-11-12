/**
 * Declustering Gardner-Knopoff ADAPTADO (spec 001, RF-6 y RF-30; plan 3.3).
 * Solo hacia adelante y sin encadenamiento: los precursores quedan como
 * "fondo" (diferencia con van Stiphout 2012 §5.1, ver ADR-010 #9).
 *
 * declustering(eventos) -> { asignaciones: [{ id, rol, principal }], excluidos }
 *  - rol: "fondo" | "secuencia" | "no_aplica"
 *  - principal: id del evento principal si rol = "secuencia"; si no, null.
 *  - excluidos: numero de eventos sin mag/lat/lon/prof numericos y finitos.
 * Cada evento: { id, mag, tiempo (ms epoch), lat, lon, prof }.
 */

import { distanciaKm } from "../../src/data.js";
import { PARAMETROS_GK as P } from "./parametros.mjs";

const DIA_MS = 86400000;

/** L(M) en km. */
export function ventanaKm(mag) {
  return 10 ** (P.kmA * mag + P.kmB);
}

/** T(M) en dias (salto en umbralMagT conservado de la fuente). */
export function ventanaDias(mag) {
  return mag >= P.umbralMagT
    ? 10 ** (P.diasAltoA * mag + P.diasAltoB)
    : 10 ** (P.diasBajoA * mag + P.diasBajoB);
}

const esNumero = (x) => typeof x === "number" && Number.isFinite(x);
const analizable = (e) =>
  esNumero(e.mag) && esNumero(e.lat) && esNumero(e.lon) && esNumero(e.prof);
const cmpCadena = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function declustering(eventos) {
  const analizables = eventos.filter(analizable);
  const excluidos = eventos.length - analizables.length;

  const rolPor = new Map();
  const superficiales = [];
  for (const e of analizables) {
    if (e.prof <= P.profMaxSuperficial) superficiales.push(e);
    else rolPor.set(e.id, { rol: "no_aplica", principal: null });
  }

  superficiales.sort(
    (a, b) => b.mag - a.mag || a.tiempo - b.tiempo || cmpCadena(a.id, b.id),
  );

  for (const principal of superficiales) {
    if (rolPor.has(principal.id)) continue;
    rolPor.set(principal.id, { rol: "fondo", principal: null });
    const L = ventanaKm(principal.mag);
    const Tms = ventanaDias(principal.mag) * DIA_MS;
    for (const e of superficiales) {
      if (rolPor.has(e.id)) continue;
      const dt = e.tiempo - principal.tiempo;
      if (!(e.mag < principal.mag) || !(dt > 0) || dt > Tms) continue;
      if (distanciaKm(principal.lat, principal.lon, e.lat, e.lon) <= L) {
        rolPor.set(e.id, { rol: "secuencia", principal: principal.id });
      }
    }
  }

  const asignaciones = analizables.map((e) => ({ id: e.id, ...rolPor.get(e.id) }));
  return { asignaciones, excluidos };
}
