/**
 * Datos de prueba. El evento base es REAL, no inventado: us6000u25i tal como
 * lo devolvio el servicio FDSN del USGS el 2026-10-20
 * (https://earthquake.usgs.gov/earthquakes/eventpage/us6000u25i), dominio
 * publico. Cada funcion devuelve una copia nueva para que ningun test
 * contamine a otro.
 */

/** Feature tal como llega del USGS, sin contrato. */
export function eventoUsgs() {
  return {
    type: "Feature",
    properties: {
      mag: 4.8,
      place: "5 km NW of Cepitá, Colombia",
      time: 1791926661135,
      updated: 1791980018223,
      tz: null,
      url: "https://earthquake.usgs.gov/earthquakes/eventpage/us6000u25i",
      detail: "https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=us6000u25i&format=geojson",
      felt: 9,
      cdi: 3.6,
      mmi: null,
      alert: null,
      status: "reviewed",
      tsunami: 0,
      sig: 358,
      net: "us",
      code: "6000u25i",
      ids: ",us6000u25i,",
      sources: ",us,",
      types: ",dyfi,origin,phase-data,",
      nst: 63,
      dmin: 0.894,
      rms: 0.62,
      gap: 38,
      magType: "mb",
      type: "earthquake",
      title: "M 4.8 - 5 km NW of Cepitá, Colombia",
    },
    geometry: { type: "Point", coordinates: [-73.0065, 6.7888, 162.209] },
    id: "us6000u25i",
  };
}

/**
 * El mismo evento con el contrato de datos y las etiquetas de territorio ya
 * aplicados. Cepita esta en Colombia: fuera de Venezuela y de la zona en
 * disputa (comprobado contra los poligonos reales en territorio.test.mjs).
 */
export function eventoValido() {
  const f = eventoUsgs();
  f.properties.fuente = "USGS FDSN Event Web Service";
  f.properties.confianza = "alta";
  f.properties.ultima_verificacion = "2026-10-20";
  f.properties.en_venezuela = false;
  f.properties.zona_disputada = false;
  f.properties.frente_costa = false;
  f.properties.pais_vecino = "COL";
  return f;
}
