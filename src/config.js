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
  repo: "https://github.com/lifelece/sismos-ve",
});

/** Filas del top por magnitud (Fase 3, ficha del proyecto: "top 10"). */
export const TOP_N = 10;

/**
 * "Cerca de mi ciudad" (Fase 3): radio en km desde la ciudad elegida. Rango
 * pensado para Venezuela: 10 km es "la propia ciudad", 300 km cubre una region
 * sismica entera (p. ej. los Andes desde Merida). Defecto 100 km. Propuesta.
 */
export const RADIO_CERCA = Object.freeze({ min: 10, max: 300, paso: 10, defecto: 100 });

/** Eventos listados bajo "Cerca de mi ciudad" (el total se cuenta aparte). */
export const CERCA_LISTA = 10;

/**
 * Procedencia de las coordenadas de CIUDADES (CLAUDE.md regla 4, FASE-3).
 * Wikidata es CC0: se puede copiar y redistribuir sin atribucion; se cita por
 * honestidad de fuente, igual que el USGS.
 */
export const CIUDADES_FUENTE = Object.freeze({
  nombre: "Wikidata",
  licencia: "CC0 1.0",
  url: "https://www.wikidata.org/",
  propiedad: "P625 (coordinate location) del item de la capital",
  consulta: "2026-10-26",
});

/**
 * Ciudades del selector "Cerca de mi ciudad": las 23 capitales de estado mas
 * Caracas (Distrito Capital), decision de Luis del 2026-10-26. NO incluye la
 * Guayana Esequiba (zona en disputa, trato aparte: regla neutralidad).
 *
 * Fuente: Wikidata (CC0), propiedad P625 del item `qid`; consulta unica el
 * 2026-10-26 por SPARQL (capitales P36 de los estados de Venezuela) y
 * Special:EntityData. lat/lon redondeados a 4 decimales (~11 m, de sobra para
 * radios de km). Trujillo y San Fernando de Apure traen dos coordenadas en
 * Wikidata (difieren < 1 km): se tomo la primera. Para verificar una fila:
 * https://www.wikidata.org/wiki/<qid>. El nombre en pantalla es el del item,
 * no se traduce (nombres propios).
 */
export const CIUDADES = Object.freeze(
  [
    { id: "barcelona", nombre: "Barcelona", estado: "Anzoátegui", lat: 10.1333, lon: -64.6833, qid: "Q391221" },
    { id: "barinas", nombre: "Barinas", estado: "Barinas", lat: 8.6333, lon: -70.2167, qid: "Q695623" },
    { id: "barquisimeto", nombre: "Barquisimeto", estado: "Lara", lat: 10.0678, lon: -69.3467, qid: "Q4709" },
    { id: "caracas", nombre: "Caracas", estado: "Distrito Capital", lat: 10.5061, lon: -66.9144, qid: "Q1533" },
    { id: "ciudad-bolivar", nombre: "Ciudad Bolívar", estado: "Bolívar", lat: 8.1029, lon: -63.547, qid: "Q26906" },
    { id: "coro", nombre: "Coro", estado: "Falcón", lat: 11.395, lon: -69.6816, qid: "Q1134454" },
    { id: "cumana", nombre: "Cumaná", estado: "Sucre", lat: 10.45, lon: -64.1667, qid: "Q319476" },
    { id: "guanare", nombre: "Guanare", estado: "Portuguesa", lat: 9.0436, lon: -69.7489, qid: "Q733005" },
    { id: "la-asuncion", nombre: "La Asunción", estado: "Nueva Esparta", lat: 11.0333, lon: -63.8628, qid: "Q860689" },
    { id: "la-guaira", nombre: "La Guaira", estado: "La Guaira", lat: 10.6, lon: -66.9331, qid: "Q873405" },
    { id: "los-teques", nombre: "Los Teques", estado: "Miranda", lat: 10.3411, lon: -67.0406, qid: "Q695631" },
    { id: "maracaibo", nombre: "Maracaibo", estado: "Zulia", lat: 10.6333, lon: -71.6333, qid: "Q171632" },
    { id: "maracay", nombre: "Maracay", estado: "Aragua", lat: 10.2469, lon: -67.5958, qid: "Q333928" },
    { id: "maturin", nombre: "Maturín", estado: "Monagas", lat: 9.7423, lon: -63.1889, qid: "Q842779" },
    { id: "merida", nombre: "Mérida", estado: "Mérida", lat: 8.5702, lon: -71.1802, qid: "Q23551" },
    { id: "puerto-ayacucho", nombre: "Puerto Ayacucho", estado: "Amazonas", lat: 5.6631, lon: -67.6264, qid: "Q372920" },
    { id: "san-carlos", nombre: "San Carlos", estado: "Cojedes", lat: 9.65, lon: -68.5833, qid: "Q995718" },
    { id: "san-cristobal", nombre: "San Cristóbal", estado: "Táchira", lat: 7.7682, lon: -72.2322, qid: "Q820235" },
    { id: "san-felipe", nombre: "San Felipe", estado: "Yaracuy", lat: 10.3353, lon: -68.7458, qid: "Q965754" },
    { id: "san-fernando-de-apure", nombre: "San Fernando de Apure", estado: "Apure", lat: 7.8878, lon: -67.4724, qid: "Q990764" },
    { id: "san-juan-de-los-morros", nombre: "San Juan de los Morros", estado: "Guárico", lat: 9.8864, lon: -67.3448, qid: "Q999117" },
    { id: "trujillo", nombre: "Trujillo", estado: "Trujillo", lat: 9.3658, lon: -70.4369, qid: "Q1020535" },
    { id: "tucupita", nombre: "Tucupita", estado: "Delta Amacuro", lat: 9.0575, lon: -62.0452, qid: "Q179007" },
    { id: "valencia", nombre: "Valencia", estado: "Carabobo", lat: 10.1667, lon: -68.0, qid: "Q54880" },
  ].map((c) => Object.freeze(c))
);

/** Ciudad preseleccionada en "Cerca de mi ciudad" (la capital; no es geolocalizacion). */
export const CIUDAD_POR_DEFECTO = "caracas";
