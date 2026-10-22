/**
 * i18n — Diccionarios ES/EN y helper t(clave). Sin librerias (CLAUDE.md
 * regla 8). Mismo diseño que orinoco-digital: preferencia guardada > idioma
 * del navegador > por defecto.
 */

import es from "./es.json";
import en from "./en.json";
import { IDIOMA_POR_DEFECTO, IDIOMAS } from "../config.js";
import { interpolar } from "./interpolar.js";

const DICCIONARIOS = { es, en };
const CLAVE_ALMACENAMIENTO = "sismos.idioma";

let idiomaActual = detectarIdioma();

function detectarIdioma() {
  try {
    const guardado = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    if (guardado && IDIOMAS.includes(guardado)) return guardado;
  } catch {
    // localStorage puede lanzar en modo privado: no rompe la app.
  }
  const navegador = navigator.language?.slice(0, 2);
  return IDIOMAS.includes(navegador) ? navegador : IDIOMA_POR_DEFECTO;
}

/**
 * Traduce una clave; si falta, devuelve la clave para que el hueco se vea.
 * @param {string} clave
 * @param {Object<string, string|number>} [params] marcadores {nombre}
 */
export function t(clave, params) {
  return interpolar(DICCIONARIOS[idiomaActual]?.[clave] ?? clave, params);
}

export const idioma = () => idiomaActual;

/** Cambia el idioma, lo guarda y avisa con el evento "idioma:cambiado". */
export function cambiarIdioma(nuevo) {
  if (!IDIOMAS.includes(nuevo) || nuevo === idiomaActual) return;
  idiomaActual = nuevo;
  try {
    localStorage.setItem(CLAVE_ALMACENAMIENTO, nuevo);
  } catch {
    // Sin persistencia el idioma dura la sesion.
  }
  document.documentElement.lang = nuevo;
  window.dispatchEvent(new CustomEvent("idioma:cambiado", { detail: nuevo }));
}
