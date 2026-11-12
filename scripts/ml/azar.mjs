/**
 * Unica fuente de azar del analisis (RNF-6): sin generador no sembrado.
 * - fnv1a32: hash FNV-1a de 32 bits sobre los bytes UTF-8 de la cadena.
 * - semillaDe(base, clave): semilla uint32 estable derivada de una clave.
 * - crearAzar(semilla): generador mulberry32 (Tommy Ettinger, dominio publico).
 */

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIMO = 0x01000193;

export function fnv1a32(texto) {
  let h = FNV_OFFSET;
  for (const byte of new TextEncoder().encode(texto)) {
    h ^= byte;
    h = Math.imul(h, FNV_PRIMO) >>> 0;
  }
  return h >>> 0;
}

export function semillaDe(base, clave) {
  return fnv1a32(`${base}|${clave}`);
}

export function crearAzar(semilla) {
  let a = semilla >>> 0;
  function siguiente() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function entero(max) {
    return Math.floor(siguiente() * max);
  }
  function remuestrear(array) {
    const n = array.length;
    const salida = new Array(n);
    for (let i = 0; i < n; i++) salida[i] = array[entero(n)];
    return salida;
  }
  return { siguiente, entero, remuestrear };
}
