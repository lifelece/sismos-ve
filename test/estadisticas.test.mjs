/**
 * Fase 3: distancia (haversine), histograma por año, top 10, "cerca de mi
 * ciudad" y enlace a la ficha del USGS. Funciones puras de src/data.js, mas la
 * lista curada CIUDADES de src/config.js. Se prueban con eventos construidos a
 * mano (casos de borde) y con el data/eventos.json versionado.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  cercaDeCiudad,
  distanciaKm,
  enlaceUsgs,
  histogramaPorAnio,
  resumenHistograma,
  normalizarColeccion,
  topPorMagnitud,
} from "../src/data.js";
import { CIUDADES, CIUDADES_FUENTE, RADIO_CERCA, TOP_N, VENEZUELA_CAJA } from "../src/config.js";

const catalogo = normalizarColeccion(JSON.parse(await readFile(new URL("../data/eventos.json", import.meta.url), "utf8")));
const ciudad = (id) => CIUDADES.find((c) => c.id === id);

const ev = (id, mag, anio, lat = 10, lon = -67, extra = {}) => ({
  id,
  mag,
  anio,
  lat,
  lon,
  tiempo: Date.UTC(anio, 5, 1),
  url: `https://earthquake.usgs.gov/earthquakes/eventpage/${id}`,
  ...extra,
});

// --- distancia -------------------------------------------------------------------

test("distanciaKm: mismo punto = 0 y es simetrica", () => {
  assert.equal(distanciaKm(10.5, -66.9, 10.5, -66.9), 0);
  assert.equal(distanciaKm(10.5, -66.9, 8.6, -70.2), distanciaKm(8.6, -70.2, 10.5, -66.9));
});

test("distanciaKm: un grado de meridiano son ~111,2 km y un grado de ecuador tambien", () => {
  assert.ok(Math.abs(distanciaKm(0, 0, 1, 0) - 111.195) < 0.05);
  assert.ok(Math.abs(distanciaKm(0, 0, 0, 1) - 111.195) < 0.05);
});

test("distanciaKm: Caracas-Maracaibo ronda 520 km en linea recta", () => {
  const d = distanciaKm(ciudad("caracas").lat, ciudad("caracas").lon, ciudad("maracaibo").lat, ciudad("maracaibo").lon);
  assert.ok(d > 500 && d < 540, `d = ${d}`);
});

test("distanciaKm: cruza el antimeridiano sin romperse", () => {
  const d = distanciaKm(0, 179.5, 0, -179.5);
  assert.ok(Math.abs(d - 111.195) < 0.05);
});

// --- histograma ---------------------------------------------------------------------

test("histogramaPorAnio cuenta por año y rellena con 0 los años sin sismos", () => {
  const h = histogramaPorAnio([ev("a", 4, 2000), ev("b", 5, 2000), ev("c", 3, 2003)], 1999, 2004);
  assert.deepEqual(h, [
    { anio: 1999, n: 0 },
    { anio: 2000, n: 2 },
    { anio: 2001, n: 0 },
    { anio: 2002, n: 0 },
    { anio: 2003, n: 1 },
    { anio: 2004, n: 0 },
  ]);
});

test("histogramaPorAnio ignora eventos fuera del rango y tolera lista vacia", () => {
  assert.deepEqual(histogramaPorAnio([ev("a", 4, 1990)], 2000, 2001), [
    { anio: 2000, n: 0 },
    { anio: 2001, n: 0 },
  ]);
  assert.deepEqual(histogramaPorAnio([], 2005, 2005), [{ anio: 2005, n: 0 }]);
});

test("histogramaPorAnio: la suma de las barras es el total de eventos del catalogo", () => {
  const h = histogramaPorAnio(catalogo.eventos, catalogo.anioMin, catalogo.anioMax);
  assert.equal(h.reduce((s, b) => s + b.n, 0), catalogo.eventos.length);
  assert.equal(h.length, catalogo.anioMax - catalogo.anioMin + 1);
});

// --- top 10 ---------------------------------------------------------------------------

test("topPorMagnitud ordena por magnitud, desempata por mas reciente y corta en n", () => {
  const lista = [ev("a", 5.0, 2001), ev("b", 6.1, 1995), ev("c", 5.0, 2010), ev("d", 4.0, 2020)];
  assert.deepEqual(topPorMagnitud(lista, 3).map((e) => e.id), ["b", "c", "a"]);
});

test("topPorMagnitud no muta la entrada y devuelve menos de n si hay menos", () => {
  const lista = [ev("a", 3, 2001), ev("b", 4, 2002)];
  const copia = [...lista];
  assert.equal(topPorMagnitud(lista, 10).length, 2);
  assert.deepEqual(lista, copia);
});

test("topPorMagnitud sobre el catalogo real: TOP_N = 10, descendente, y el primero es el maximo", () => {
  assert.equal(TOP_N, 10);
  const top = topPorMagnitud(catalogo.eventos, TOP_N);
  assert.equal(top.length, 10);
  assert.equal(top[0].mag, Math.max(...catalogo.eventos.map((e) => e.mag)));
  for (let i = 1; i < top.length; i++) assert.ok(top[i - 1].mag >= top[i].mag);
});

// --- cerca de mi ciudad -----------------------------------------------------------------

test("cercaDeCiudad filtra por radio (inclusivo), devuelve km y ordena del mas reciente al mas antiguo", () => {
  const c = { lat: 10, lon: -67 };
  const cerca = ev("cerca", 4, 2010, 10.1, -67); // ~11 km
  const reciente = ev("reciente", 4, 2020, 10, -67.2); // ~22 km
  const lejos = ev("lejos", 4, 2015, 12, -67); // ~222 km
  const r = cercaDeCiudad([cerca, lejos, reciente], c, 30);
  assert.deepEqual(r.map((x) => x.evento.id), ["reciente", "cerca"]);
  assert.ok(r[0].km > 21 && r[0].km < 23);
  const exacto = distanciaKm(10, -67, 10.1, -67);
  assert.equal(cercaDeCiudad([cerca], c, exacto).length, 1);
  assert.equal(cercaDeCiudad([cerca], c, exacto - 0.001).length, 0);
});

test("cercaDeCiudad con radio 0 o lista vacia no falla", () => {
  assert.deepEqual(cercaDeCiudad([], { lat: 0, lon: 0 }, 50), []);
  assert.deepEqual(cercaDeCiudad([ev("a", 4, 2000, 5, 5)], { lat: 0, lon: 0 }, 0), []);
});

test("cercaDeCiudad sobre el catalogo real: el radio solo agranda el resultado", () => {
  const c = ciudad("merida");
  const a = cercaDeCiudad(catalogo.eventos, c, 50).length;
  const b = cercaDeCiudad(catalogo.eventos, c, 150).length;
  assert.ok(b >= a);
  assert.ok(b > 0, "Merida esta sobre la falla de Bocono: debe haber sismos a 150 km");
});

test("RADIO_CERCA es coherente: min <= defecto <= max y el defecto cae en un paso", () => {
  assert.ok(RADIO_CERCA.min <= RADIO_CERCA.defecto && RADIO_CERCA.defecto <= RADIO_CERCA.max);
  assert.equal((RADIO_CERCA.defecto - RADIO_CERCA.min) % RADIO_CERCA.paso, 0);
});

// --- lista curada de ciudades --------------------------------------------------------------

test("CIUDADES: 23 capitales de estado + Caracas, sin repetidos, sin Guayana Esequiba", () => {
  assert.equal(CIUDADES.length, 24);
  assert.equal(new Set(CIUDADES.map((c) => c.id)).size, 24);
  assert.equal(new Set(CIUDADES.map((c) => c.qid)).size, 24);
  assert.equal(new Set(CIUDADES.map((c) => c.estado)).size, 24);
  assert.ok(CIUDADES.some((c) => c.id === "caracas"));
  assert.ok(!CIUDADES.some((c) => /esequiba/i.test(`${c.nombre} ${c.estado}`)));
});

test("CIUDADES: cada una trae QID de Wikidata, 4 decimales y cae dentro de Venezuela", () => {
  for (const c of CIUDADES) {
    assert.match(c.qid, /^Q\d+$/, c.id);
    for (const v of [c.lat, c.lon]) assert.equal(Math.round(v * 1e4) / 1e4, v, `${c.id}: mas de 4 decimales`);
    assert.ok(c.lat >= VENEZUELA_CAJA.latMin && c.lat <= VENEZUELA_CAJA.latMax, `${c.id} lat`);
    assert.ok(c.lon >= VENEZUELA_CAJA.lonMin && c.lon <= VENEZUELA_CAJA.lonMax, `${c.id} lon`);
  }
});

test("CIUDADES_FUENTE nombra Wikidata y su licencia CC0", () => {
  assert.match(CIUDADES_FUENTE.nombre, /Wikidata/);
  assert.match(CIUDADES_FUENTE.licencia, /CC0/);
  assert.match(CIUDADES_FUENTE.url, /^https:\/\/www\.wikidata\.org\//);
});

// --- ficha del evento: enlace al USGS ----------------------------------------------------------

test("enlaceUsgs acepta solo https en earthquake.usgs.gov y devuelve null en cualquier otro caso", () => {
  const ok = "https://earthquake.usgs.gov/earthquakes/eventpage/us6000u25i";
  assert.equal(enlaceUsgs({ url: ok }), ok);
  assert.equal(enlaceUsgs({ url: null }), null);
  assert.equal(enlaceUsgs({}), null);
  assert.equal(enlaceUsgs({ url: "javascript:alert(1)" }), null);
  assert.equal(enlaceUsgs({ url: "http://earthquake.usgs.gov/x" }), null);
  assert.equal(enlaceUsgs({ url: "https://earthquake.usgs.gov.evil.example/x" }), null);
  assert.equal(enlaceUsgs({ url: "no es una url" }), null);
});

test("el catalogo real: todos los eventos (recientes, viejos, revisados, automaticos) enlazan a su pagina del USGS", () => {
  const confianzas = new Set();
  for (const e of catalogo.eventos) {
    confianzas.add(e.confianza);
    assert.equal(enlaceUsgs(e), `https://earthquake.usgs.gov/earthquakes/eventpage/${e.id}`, e.id);
  }
  assert.ok(confianzas.has("alta"), "debe haber eventos revisados");
  const anios = catalogo.eventos.map((e) => e.anio);
  assert.ok(Math.min(...anios) <= 1991 && Math.max(...anios) >= 2026, "cubre eventos viejos y recientes");
});

// --- regla 4: sin geolocalizacion -------------------------------------------------------------

test("ningun modulo de src/ usa la geolocalizacion del navegador (CLAUDE.md regla 4)", async () => {
  const { readdir } = await import("node:fs/promises");
  const dir = new URL("../src/", import.meta.url);
  const archivos = (await readdir(dir, { recursive: true })).filter((f) => f.endsWith(".js"));
  for (const a of archivos) {
    const texto = await readFile(new URL(a, dir), "utf8");
    // Se quitan los comentarios: pueden nombrar la regla sin violarla.
    const codigo = texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    assert.doesNotMatch(codigo, /geolocation|getCurrentPosition|watchPosition/, a);
  }
});

// --- H-13: resumen calculado del histograma (texto alternativo) -----------------------

test("resumenHistograma: total, año con más sismos, magnitud máxima y porcentaje por barra", () => {
  const eventos = [ev("a", 4, 2000), ev("b", 6.2, 2000), ev("c", 3, 2001), ev("d", 5, 2001), ev("e", 3.5, 2001), ev("f", 3, 2003)];
  const barras = histogramaPorAnio(eventos, 2000, 2003);
  const r = resumenHistograma(barras, eventos);
  assert.equal(r.total, 6);
  assert.deepEqual(r.cima, { anio: 2001, n: 3 });
  assert.equal(r.magMax, 6.2);
  assert.deepEqual(r.porcentajes, [(2 / 6) * 100, 50, 0, (1 / 6) * 100]);
  assert.ok(Math.abs(r.porcentajes.reduce((a, b) => a + b, 0) - 100) < 1e-9);
});

test("resumenHistograma: empate de cima = año más antiguo; sin eventos no divide por cero", () => {
  const dos = [ev("a", 4, 2000), ev("b", 4, 2002)];
  assert.equal(resumenHistograma(histogramaPorAnio(dos, 2000, 2002), dos).cima.anio, 2000);
  const vacio = resumenHistograma(histogramaPorAnio([], 2000, 2001), []);
  assert.equal(vacio.total, 0);
  assert.equal(vacio.magMax, null);
  assert.deepEqual(vacio.porcentajes, [0, 0]);
});
