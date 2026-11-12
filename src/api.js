/**
 * api.js — Unico modulo que hace `fetch` (scripts/verificar-modulos.mjs).
 *
 * Solo lee archivos estaticos del propio sitio, versionados en data/: el
 * navegador NUNCA consulta al USGS (CLAUDE.md regla 3, ADR-002). Vite los
 * publica con un hash en el nombre (`?url`), asi que cada catalogo nuevo
 * invalida la cache sin configurar nada.
 */

import urlEventos from "../data/eventos.json?url";
import urlLimites from "../data/limites-venezuela.geojson?url";
import urlDisputa from "../data/zona-disputada.geojson?url";
import urlPatrones from "../data/patrones.json?url";

async function leerJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} al leer ${url}`);
  return r.json();
}

/** Catalogo de eventos (FeatureCollection con el contrato de la Fase 1). */
export const leerEventos = () => leerJson(urlEventos);

/** Limites para el mapa base: frontera, estados y zona en disputa (ADR-008). */
export async function leerLimites() {
  const [limites, disputa] = await Promise.all([leerJson(urlLimites), leerJson(urlDisputa)]);
  return { limites, disputa };
}

/**
 * Patrones estadisticos del catalogo pasado (spec 001, RF-20). Si falta o no se
 * puede leer devuelve null: la seccion se oculta, nada se calcula aqui.
 */
export async function leerPatrones() {
  try {
    return await leerJson(urlPatrones);
  } catch {
    return null;
  }
}
