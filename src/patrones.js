/**
 * patrones.js — Logica pura de la seccion "Patrones" (spec 001, RF-3, RF-16,
 * RF-18, RF-20, RF-28, RF-34, RF-35). Sin DOM, sin fetch, sin Leaflet: lo que
 * se pinta lo decide aqui y se prueba en Node. NO calcula nada del catalogo
 * (RF-20): solo da formato y filtra lo que ya trae data/patrones.json.
 */

/** N_MIN del analisis (plan 3.3); el archivo lo trae en metadata.parametros. */
export const nMinDe = (patrones) => patrones?.metadata?.parametros?.gutenberg_richter?.nMin ?? null;

/** Numero con `decimales` y coma en `es`, punto en `en` (RF-28). */
export function formatoNumero(x, decimales, idioma) {
  const texto = Number(x).toFixed(decimales);
  return idioma === "es" ? texto.replace(".", ",") : texto;
}

/** Orden de RF-3: longitud del centro de oeste a este; empate, latitud de norte a sur; luego id. */
export function ordenarZonas(zonas) {
  return [...zonas].sort(
    (a, b) => a.centro.lon - b.centro.lon || b.centro.lat - a.centro.lat || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/**
 * RF-18 / RF-35: en la vista "venezuela" solo las zonas con >= 50 % de sus
 * eventos en la vista (enteros, sin redondeo: exactamente 50 % se muestra);
 * en "region", todas. Siempre de oeste a este.
 */
export function zonasVisibles(patrones, vista) {
  const zonas = ordenarZonas(patrones?.zonas ?? []);
  if (vista !== "venezuela") return zonas;
  return zonas.filter((z) => 2 * z.n_en_vista_venezuela >= z.n_eventos);
}

/** RF-20: el archivo solo vale si corresponde al catalogo cargado. */
export function coincideConCatalogo(patrones, { n, verificacion }) {
  const m = patrones?.metadata;
  return Boolean(m) && m.catalogo_n === n && m.ultima_verificacion === verificacion;
}

/**
 * Linea de la tarjeta (RF-16, RF-34). `t` es el traductor (clave, params) -> texto.
 * Publicado: b con su IC 95 %, Mc con IC, familia y n, siempre juntos.
 * No publicado: el motivo en el idioma activo, sin ninguna cifra de b.
 */
export function formatoB(zona, idioma, t, nMin) {
  const g = zona.gutenberg_richter;
  if (!g.publicado) {
    if (g.motivo === "muestra_insuficiente") return t("patrones.bInsuficiente", { n: g.n_sobre_mc, nMin });
    return t("patrones.bInconsistente");
  }
  const f = (x, d) => formatoNumero(x, d, idioma);
  return t("patrones.b", {
    b: f(g.b, 2),
    bLo: f(g.b_ic95[0], 2),
    bHi: f(g.b_ic95[1], 2),
    mc: f(g.mc, 1),
    mcLo: f(g.mc_ic95[0], 1),
    mcHi: f(g.mc_ic95[1], 1),
    familia: g.familia,
    n: g.n_sobre_mc,
  });
}
