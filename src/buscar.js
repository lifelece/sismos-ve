/**
 * buscar.js — Buscador de eventos (ADR-006). Puro: sin DOM ni red.
 *
 * Patron trasplantado de orinoco-digital (todas las palabras en cualquier
 * orden, sin tildes, tope de resultados), reimplementado para eventos: se
 * busca en el texto de lugar del USGS, el id y el año.
 */

import { MAX_RESULTADOS } from "./config.js";

/** Minusculas y sin marcas diacriticas: "Carúpano" -> "carupano". */
export function normalizarTexto(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * @param {Array<import("./data.js").Evento>} eventos
 * @returns {Array<{ evento: import("./data.js").Evento, texto: string }>}
 */
export function crearIndice(eventos) {
  return eventos.map((evento) => ({
    evento,
    texto: normalizarTexto(`${evento.lugar} ${evento.id} ${evento.anio}`),
  }));
}

/**
 * Eventos cuyo texto contiene todas las palabras de la consulta, de mayor a
 * menor magnitud (y del mas reciente al mas antiguo si empatan).
 * @returns {Array<import("./data.js").Evento>}
 */
export function buscar(indice, consulta, max = MAX_RESULTADOS) {
  const q = normalizarTexto(consulta).trim();
  if (q.length < 2) return [];
  const palabras = q.split(/\s+/);
  return indice
    .filter((e) => palabras.every((p) => e.texto.includes(p)))
    .map((e) => e.evento)
    .sort((a, b) => b.mag - a.mag || b.tiempo - a.tiempo)
    .slice(0, max);
}
