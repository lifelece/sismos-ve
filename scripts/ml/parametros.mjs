/**
 * Constantes del analisis (spec 001, plan 3.3). Cada valor con su fuente en
 * docs/adr/ADR-010-patrones-estadisticos.md. T03 solo aporta las de
 * Gutenberg-Richter; T04 y T05 anaden las suyas.
 */

export const PARAMETROS_GR = Object.freeze({
  /** Ancho de bin de magnitud (ADR-010 #4). */
  dM: 0.1,
  /**
   * Correccion sobre el bin de maxima curvatura: Mc = MAXC + 0,2.
   * CONVENCION DECLARADA SIN CITA ABIERTA (decision de Luis, 2026-11-08;
   * ADR-010 #3b): Mignan y Woessner (2012) no la contienen. Se publica en
   * metadata.parametros.
   */
  correccionMc: 0.2,
  /** Minimo de eventos >= Mc de la familia mayoritaria (derivado, plan 3.3). */
  nMin: 50,
  /** Remuestras del bootstrap en produccion (200 en npm test). */
  B: 1000,
  /** Fraccion maxima de remuestras descartables antes de RF-31. */
  maxDescarte: 0.05,
  /** Remuestras con menos eventos >= su Mc que esto se descartan. */
  minEventosRemuestra: 2,
});

/** B reducido para npm test (RNF-5). */
export const B_PRUEBAS = 200;

/**
 * Ventanas Gardner-Knopoff (T04; plan 3.3, ADR-010 #5-#7). Fuente: van
 * Stiphout et al. (2012) Ec. 1. El salto de T en M = 6,5 se conserva tal
 * cual lo publica la fuente (la Tabla 2 publicada no lo tiene; ADR-010).
 */
export const PARAMETROS_GK = Object.freeze({
  /** L(M) = 10^(kmA*M + kmB) km. */
  kmA: 0.1238,
  kmB: 0.983,
  /** Umbral de la rama alta de T(M): M >= 6,5 (la fuente usa >=). */
  umbralMagT: 6.5,
  /** T(M) = 10^(diasAltoA*M + diasAltoB) dias si M >= umbralMagT. */
  diasAltoA: 0.032,
  diasAltoB: 2.7389,
  /** T(M) = 10^(diasBajoA*M + diasBajoB) dias si M < umbralMagT. */
  diasBajoA: 0.5409,
  diasBajoB: -0.547,
  /** Profundidad maxima (km, inclusive) de un evento superficial (RF-6). */
  profMaxSuperficial: 70,
});

/**
 * Sensibilidad del agrupamiento (T05; plan 3.3, ADR-010 #10 y #12). Aqui NO
 * van epsKm ni minPts de produccion: los fija T06 con el catalogo real.
 * J_MIN es una ADAPTACION de Hennig (2007): su 0,75 es para la media de
 * Jaccard bajo bootstrap; aqui se aplica al MINIMO sobre dos perturbaciones
 * del radio (ADR-010 §2). Factores 0,8 y 1,2: decision tecnica del plan.
 */
export const PARAMETROS_DBSCAN = Object.freeze({
  factores: Object.freeze([0.8, 1.2]),
  jMin: 0.75,
});

/** Semilla base entera del analisis (plan 3.3 "Semillas"); la usa T07. */
export const SEMILLA_BASE = 1;

/**
 * epsKm y minPts de produccion por clase de profundidad (T06, ADR-010 §T06).
 * Calibrados UNA vez el 2026-11-12 con la curva de k-distancias (k = minPts = 10)
 * del catalogo real tras el declustering, SIN calcular ni mirar b. Regla fijada
 * antes de ver el resultado: eps = rodilla (maxima distancia a la cuerda) de la
 * curva log(k-dist) ordenada, redondeada al km. Superficial: n = 1426, rodilla
 * 71,6 -> 72. Intermedio: n = 2271, rodilla 9,2 -> 9. Profundo: n = 1, no es
 * calibrable; reutiliza los del intermedio (con n < minPts nunca forma grupos).
 * Congelados: cambiarlos exige un ADR nuevo.
 */
export const PARAMETROS_AGRUPACION = Object.freeze({
  superficial: Object.freeze({ epsKm: 72, minPts: 10 }),
  intermedio: Object.freeze({ epsKm: 9, minPts: 10 }),
  profundo: Object.freeze({ epsKm: 9, minPts: 10 }),
});
