/**
 * Interpolacion de marcadores {nombre} en un texto. Pura: sin DOM ni estado.
 * Un marcador sin valor queda visible, igual que una clave sin traducir, para
 * que el hueco se vea (mismo criterio que orinoco-digital).
 */

/**
 * @param {string} texto
 * @param {Object<string, string|number>} [params]
 */
export function interpolar(texto, params) {
  if (!params) return texto;
  return texto.replace(/\{(\w+)\}/g, (marcador, nombre) => {
    const valor = Object.hasOwn(params, nombre) ? params[nombre] : undefined;
    return valor === undefined || valor === null ? marcador : String(valor);
  });
}
