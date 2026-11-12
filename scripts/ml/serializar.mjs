/**
 * Serializacion determinista de data/patrones.json y huella del catalogo
 * (spec 001: RF-5, RF-13; plan 3.3 "Redondeo de salida", "Serializacion", "Huella").
 * Sin marcas de reloj. Las claves salen en el orden en que las construye
 * `analizar` (el de plan 3.4).
 */

import { createHash } from "node:crypto";

/** Redondeo fijo a `d` decimales; el cero negativo se escribe 0. */
export function redondear(x, d) {
  if (x === null || x === undefined) return null;
  const f = 10 ** d;
  const r = Math.round(x * f) / f;
  return r === 0 ? 0 : r;
}

/** 2 espacios de sangria y `\n` final. */
export function serializar(objeto) {
  return `${JSON.stringify(objeto, null, 2)}\n`;
}

const cmpCadena = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * SHA-256 (hex) de los `features` en orden canonico (tiempo, luego id) sin
 * `properties.ultima_verificacion`: cambiar solo la fecha de descarga no cambia la huella.
 */
export function huellaCatalogo(coleccion) {
  const canon = [...coleccion.features]
    .sort((a, b) => a.properties.time - b.properties.time || cmpCadena(a.id, b.id))
    .map((f) => {
      const { ultima_verificacion: _omitida, ...properties } = f.properties;
      return { ...f, properties };
    });
  return createHash("sha256").update(JSON.stringify(canon)).digest("hex");
}
