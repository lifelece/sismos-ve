/**
 * frescura.js — Edad de un dato y su estado (ADR-005).
 *
 * Implementacion de la spec neutral arsenal/specs/chip-frescura (R1-R7);
 * test/frescura.test.mjs pasa sus 13 casos de tabla. Pura: no lee el reloj
 * ni la red; `ahora` lo pasa quien llama.
 */

/** Milisegundos por unidad de escala. */
export const MS_POR_UNIDAD = Object.freeze({ min: 60_000, h: 3_600_000, dia: 86_400_000 });

/**
 * Lee una marca de tiempo: Date, milisegundos o texto ISO 8601. Con mas de 3
 * decimales de segundo (microsegundos de Postgres) recorta a milisegundos
 * para que cualquier navegador la acepte (R7). Devuelve NaN si no se puede.
 */
function leerInstante(valor) {
  if (valor instanceof Date) return valor.getTime();
  if (typeof valor === "number") return valor;
  if (typeof valor !== "string" || !valor.trim()) return Number.NaN;
  return Date.parse(valor.trim().replace(/(\.\d{3})\d+/, "$1"));
}

/**
 * @param {Date|number|string|null} marca cuando se actualizo el dato
 * @param {Date|number|string} ahora el instante de referencia
 * @param {{ unidad: "min"|"h"|"dia", umbrales: { atencion: number, vencida: number } }} escala
 * @returns {{ estado: "fresca"|"atencion"|"vencida", edad: number, unidad: string } | null}
 */
export function frescura(marca, ahora, escala) {
  const t = leerInstante(marca);
  const n = leerInstante(ahora);
  if (Number.isNaN(t) || Number.isNaN(n)) return null; // R2
  const ms = MS_POR_UNIDAD[escala.unidad];
  if (!ms) throw new Error(`Unidad de frescura desconocida: ${escala.unidad}`);

  const edadExacta = Math.max(0, n - t) / ms; // R3: marca futura = edad 0
  const { atencion, vencida } = escala.umbrales;
  // R4: comparacion estricta sobre la edad exacta.
  const estado = edadExacta > vencida ? "vencida" : edadExacta > atencion ? "atencion" : "fresca";
  return { estado, edad: Math.floor(edadExacta), unidad: escala.unidad };
}

/**
 * Texto relativo legible (R6), por i18n: "hoy", "hace 3 dias",
 * "hace 12 min", "hace 1 h 35 min".
 * @param {ReturnType<typeof frescura>} resultado
 * @param {(clave: string, params?: object) => string} t
 */
export function textoRelativo(resultado, t) {
  if (!resultado) return "";
  const { edad, unidad } = resultado;
  if (unidad === "dia") {
    if (edad === 0) return t("frescura.hoy");
    return t(edad === 1 ? "frescura.dia" : "frescura.dias", { n: edad });
  }
  const minutos = unidad === "h" ? edad * 60 : edad;
  if (minutos < 60) return t("frescura.min", { n: minutos });
  return t("frescura.horasMin", { h: Math.floor(minutos / 60), m: minutos % 60 });
}
