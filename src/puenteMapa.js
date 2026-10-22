/**
 * puenteMapa.js — Puente entre la interfaz y el mapa (ADR-007).
 *
 * `ui.js` no puede importar `map.js`: eso arrastraria Leaflet al primer
 * pintado. Llama a estas funciones, que NO importan Leaflet; `main.js` trae
 * `map.js` con `import()` dinamico y lo conecta con `conectarMapa(modulo)`.
 *
 * Hasta la conexion, las ordenes esperan en cola y se reproducen en orden.
 * Las de "ultimo gana" (pintar, encuadrar) se compactan: solo cuenta la
 * ultima. Patron de orinoco-digital (ADR-022 de ese proyecto). Sin DOM ni red.
 */

/** Ordenes en las que solo importa la ultima llamada. */
const ULTIMO_GANA = new Set(["pintarBase", "pintarEventos", "encuadrar"]);

/** @type {Object<string, Function>|null} */
let mapa = null;
/** @type {Array<[string, Array<*>]>} */
let cola = [];

/** Conecta el modulo `map.js` ya iniciado y reproduce las ordenes en espera. */
export function conectarMapa(modulo) {
  mapa = modulo;
  const espera = cola;
  cola = [];
  for (const [nombre, args] of espera) mapa[nombre](...args);
}

function ordenar(nombre, args) {
  if (mapa) return mapa[nombre](...args);
  if (ULTIMO_GANA.has(nombre)) cola = cola.filter(([n]) => n !== nombre);
  cola.push([nombre, args]);
  return true;
}

/** Vacia la cola y desconecta (solo para tests). */
export function reiniciarPuente() {
  mapa = null;
  cola = [];
}

/** Ordenes en espera (solo para tests). */
export const pendientes = () => cola.length;

/** true cuando el mapa ya cargo. */
export const hayMapa = () => mapa !== null;

export const pintarBase = (...a) => ordenar("pintarBase", a);
export const pintarEventos = (...a) => ordenar("pintarEventos", a);
export const encuadrar = (...a) => ordenar("encuadrar", a);
export const seleccionar = (...a) => ordenar("seleccionar", a);
export const redimensionar = (...a) => ordenar("redimensionar", a);
export const fijarAtribucion = (...a) => ordenar("fijarAtribucion", a);
