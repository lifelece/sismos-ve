/**
 * config.js — Constantes de la interfaz, cada una con su porque.
 *
 * Sin `import.meta.env` ni imports de Vite: los tests de Node lo importan tal
 * cual (npm test corre sin `npm install`).
 */

export const IDIOMAS = ["es", "en"];
export const IDIOMA_POR_DEFECTO = "es";

/**
 * Rectangulo de la consulta FDSN. Copia de `REGION` en
 * scripts/validate-eventos.mjs (que usa node:fs y no puede ir al navegador);
 * test/data.test.mjs comprueba que son iguales.
 */
export const REGION_CONSULTA = Object.freeze({ latMin: 0.5, latMax: 13.0, lonMin: -73.5, lonMax: -59.5 });

/**
 * Caja envolvente del poligono terrestre de Venezuela con islas
 * (data/limites-venezuela.geojson, nivel "pais"): encuadre de la vista
 * "Venezuela". test/data.test.mjs comprueba que coincide con los datos.
 */
export const VENEZUELA_CAJA = Object.freeze({ latMin: 0.6493, latMax: 12.1989, lonMin: -73.3911, lonMax: -59.8156 });

/** Primer año del catalogo (INICIO_CATALOGO de la Fase 1). */
export const ANIO_INICIO = 1990;

/** Magnitud minima de la consulta (MAGNITUD_MINIMA de la Fase 1). */
export const MAGNITUD_MINIMA = 3;

/**
 * Color por profundidad del hipocentro.
 *
 * Clases: la division estandar de la sismologia entre sismos superficiales
 * (0-70 km), intermedios (70-300 km) y profundos (>300 km), la misma del
 * glosario del USGS. No es decorativo: en el catalogo, los superficiales son
 * los de las fallas de Bocono, San Sebastian y El Pilar; los intermedios, el
 * "nido de Bucaramanga" bajo Cepita (Colombia), a ~150-165 km.
 *
 * Colores: tres de la paleta Okabe-Ito (Okabe y Ito, 2008, "Color Universal
 * Design"), pensada para daltonismo, ordenados por luminancia (amarillo ->
 * celeste -> azul): mas profundo = mas oscuro, legible tambien en gris.
 * Propios de sismos-ve (no salen de los tokens del shell, ADR-004).
 * DECISION ESTETICA ABIERTA PARA LUIS (FASE-2-MAPA-FILTROS.md).
 */
export const PROFUNDIDAD = Object.freeze([
  Object.freeze({ clave: "superficial", hasta: 70, color: "#f0e442" }),
  Object.freeze({ clave: "intermedio", hasta: 300, color: "#56b4e9" }),
  Object.freeze({ clave: "profundo", hasta: Infinity, color: "#0072b2" }),
]);

/**
 * Radio del circulo por magnitud: r = base * 10^(factor * (M - magRef)), en px.
 *
 * Por que no lineal: con r proporcional a M, un M7 se veria solo 2,3 veces un
 * M3, cuando la amplitud medida es 10 000 veces mayor. Por que no por energia
 * (10^1,5M): un M7 seria un millon de veces un M3 y taparia el mapa. Con
 * factor 0,2 el area crece x2,5 por grado de magnitud: M3 = 3 px, M5 = 7,5 px,
 * M7 = 19 px, M7,5 = 24 px. Acotado para que un M9 hipotetico no tape el pais.
 */
export const RADIO = Object.freeze({ base: 3, factor: 0.2, magRef: 3, min: 3, max: 30 });

/**
 * Chip de frescura (ADR-005, spec arsenal/specs/chip-frescura). Edad de
 * metadata.ultima_verificacion en dias: la Action corre a diario, asi que >2
 * dias es que se perdio al menos un ciclo (o un PR sin mergear) y >7 dias ya
 * no es "el catalogo de hoy". Propuesta para Luis.
 */
export const FRESCURA = Object.freeze({ unidad: "dia", umbrales: Object.freeze({ atencion: 2, vencida: 7 }) });

/**
 * Vista inicial del mapa: solo Venezuela (decision de Luis en el gate de la
 * Fase 1, ADR-003). "region" muestra todo el rectangulo de la consulta.
 */
export const VISTA_INICIAL = "venezuela";
export const VISTAS = ["venezuela", "region"];

/**
 * Teselas del mapa base: NINGUNA mientras Luis no elija proveedor (ADR-008).
 * Cuando lo haga: { url, atribucion, zoomMax } y map.js anade la capa.
 */
export const TESELAS = null;

/** Zoom permitido del mapa (sin teselas no tiene sentido acercarse mas). */
export const MAPA = Object.freeze({ zoomMin: 4, zoomMax: 11 });

/** Filas de la vista de tabla que se pintan de cada vez. */
export const TABLA_PAGINA = 100;

/** Resultados del buscador (ADR-006). */
export const MAX_RESULTADOS = 8;

/**
 * Enlaces externos (solo enlaces que abre la persona, nunca fetch).
 * `repo` es null hasta que exista el remoto en GitHub: sin el, el aviso
 * completo se resume en la propia interfaz.
 */
export const ENLACES = Object.freeze({
  usgs: "https://earthquake.usgs.gov/",
  fdsn: "https://earthquake.usgs.gov/fdsnws/event/1/",
  repo: null,
});
