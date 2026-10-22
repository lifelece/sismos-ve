/**
 * src/data.js: normalizacion del catalogo, filtros de la Fase 2 y codificacion
 * visual (radio por magnitud, clase por profundidad). Funciones puras: sin
 * DOM, sin red. Se prueban con el evento real de fixtures.mjs y con el
 * data/eventos.json versionado.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ampliarFiltroPara,
  claseProfundidad,
  fechaUTC,
  filtrarEventos,
  filtroInicial,
  normalizarColeccion,
  normalizarEvento,
  radioPorMagnitud,
  territorioDe,
} from "../src/data.js";
import { PROFUNDIDAD, RADIO, REGION_CONSULTA, VENEZUELA_CAJA } from "../src/config.js";
import { leerTerritorio } from "../scripts/territorio.mjs";
import { REGION } from "../scripts/validate-eventos.mjs";
import { eventoValido } from "./fixtures.mjs";

const catalogo = JSON.parse(await readFile(new URL("../data/eventos.json", import.meta.url), "utf8"));

test("normalizarEvento conserva lo que la interfaz necesita, con nombres propios", () => {
  const e = normalizarEvento(eventoValido());
  assert.deepEqual(e, {
    id: "us6000u25i",
    mag: 4.8,
    magTipo: "mb",
    lugar: "5 km NW of Cepitá, Colombia",
    tiempo: 1791926661135,
    anio: 2026,
    prof: 162.209,
    lat: 6.7888,
    lon: -73.0065,
    url: "https://earthquake.usgs.gov/earthquakes/eventpage/us6000u25i",
    confianza: "alta",
    enVenezuela: false,
    zonaDisputada: false,
  });
});

test("normalizarColeccion: catalogo real, del mas reciente al mas antiguo", () => {
  const c = normalizarColeccion(catalogo);
  assert.equal(c.eventos.length, catalogo.features.length);
  assert.equal(c.verificacion, catalogo.metadata.ultima_verificacion);
  assert.equal(c.anioMin, 1990);
  assert.ok(c.anioMax >= 2026);
  assert.ok(c.magMax >= 7.5);
  for (let i = 1; i < c.eventos.length; i += 1) {
    assert.ok(c.eventos[i - 1].tiempo >= c.eventos[i].tiempo, `orden en ${i}`);
  }
});

test("normalizarColeccion rechaza lo que no es una FeatureCollection", () => {
  assert.throws(() => normalizarColeccion({ type: "Feature" }), /FeatureCollection/);
});

test("la region de la interfaz es la misma que la de la consulta", () => {
  assert.deepEqual({ ...REGION_CONSULTA }, { ...REGION });
});

test("la caja de la vista Venezuela es la del poligono terrestre", async () => {
  const [lonMin, latMin, lonMax, latMax] = (await leerTerritorio()).venezuela.caja;
  assert.deepEqual({ ...VENEZUELA_CAJA }, { latMin, latMax, lonMin, lonMax });
});

test("clase de profundidad: 0-70 superficial, 70-300 intermedio, >300 profundo", () => {
  assert.equal(claseProfundidad(0).clave, "superficial");
  assert.equal(claseProfundidad(70).clave, "superficial");
  assert.equal(claseProfundidad(70.1).clave, "intermedio");
  assert.equal(claseProfundidad(300).clave, "intermedio");
  assert.equal(claseProfundidad(436.5).clave, "profundo");
  assert.equal(claseProfundidad(-1.2).clave, "superficial", "el USGS publica profundidades negativas (sobre el nivel del mar)");
  assert.equal(PROFUNDIDAD.length, 3);
  for (const c of PROFUNDIDAD) assert.match(c.color, /^#[0-9a-f]{6}$/i);
});

test("radio por magnitud: crece con la magnitud, comprimido y acotado", () => {
  assert.equal(radioPorMagnitud(3), RADIO.min);
  const r = [3, 4, 5, 6, 7, 7.5].map(radioPorMagnitud);
  for (let i = 1; i < r.length; i += 1) assert.ok(r[i] > r[i - 1], `monotono en ${i}`);
  // Ni lineal (M7 seria solo 2,3x M3) ni por energia (M7 = 1e6 x M3): ~6x.
  assert.ok(r[4] / r[0] > 5 && r[4] / r[0] < 7, `M7/M3 = ${(r[4] / r[0]).toFixed(2)}`);
  assert.ok(radioPorMagnitud(9.5) <= RADIO.max);
  assert.equal(radioPorMagnitud(2), RADIO.min, "por debajo de M3 no encoge");
});

test("territorioDe: venezuela, disputa o fuera", () => {
  const e = normalizarEvento(eventoValido());
  assert.equal(territorioDe(e), "fuera");
  assert.equal(territorioDe({ ...e, enVenezuela: true }), "venezuela");
  assert.equal(territorioDe({ ...e, zonaDisputada: true }), "disputa");
});

test("filtroInicial: vista Venezuela, todo el rango de años, M minima del catalogo", () => {
  const c = normalizarColeccion(catalogo);
  assert.deepEqual(filtroInicial(c), { vista: "venezuela", desde: 1990, hasta: c.anioMax, magMin: 3 });
});

test("filtrarEventos: vista Venezuela = solo en_venezuela (decision de Luis)", () => {
  const c = normalizarColeccion(catalogo);
  const f = filtroInicial(c);
  const ven = filtrarEventos(c.eventos, f);
  assert.equal(ven.length, catalogo.features.filter((x) => x.properties.en_venezuela).length);
  assert.ok(ven.every((e) => e.enVenezuela));
  const region = filtrarEventos(c.eventos, { ...f, vista: "region" });
  assert.equal(region.length, c.eventos.length);
});

test("filtrarEventos: años inclusivos y magnitud minima inclusiva", () => {
  const base = normalizarEvento(eventoValido());
  const eventos = [
    { ...base, id: "a", anio: 1997, mag: 7.0, enVenezuela: true },
    { ...base, id: "b", anio: 2018, mag: 7.3, enVenezuela: true },
    { ...base, id: "c", anio: 2018, mag: 4.0, enVenezuela: true },
    { ...base, id: "d", anio: 2026, mag: 7.5, enVenezuela: false },
  ];
  const ids = (f) => filtrarEventos(eventos, f).map((e) => e.id);
  assert.deepEqual(ids({ vista: "venezuela", desde: 1997, hasta: 2018, magMin: 3 }), ["a", "b", "c"]);
  assert.deepEqual(ids({ vista: "venezuela", desde: 1998, hasta: 2018, magMin: 7.3 }), ["b"]);
  assert.deepEqual(ids({ vista: "region", desde: 2026, hasta: 2026, magMin: 7.5 }), ["d"]);
});

test("ampliarFiltroPara: amplia lo justo para que un evento oculto se vea", () => {
  const e = { ...normalizarEvento(eventoValido()), anio: 2014, mag: 5.1, enVenezuela: false };
  const f = { vista: "venezuela", desde: 2020, hasta: 2026, magMin: 6 };
  const g = ampliarFiltroPara(f, e);
  assert.deepEqual(g, { vista: "region", desde: 2014, hasta: 2026, magMin: 5.1 });
  assert.deepEqual(filtrarEventos([e], g).map((x) => x.id), [e.id]);
  // Si ya se ve, no cambia nada.
  assert.equal(ampliarFiltroPara(g, e), g);
});

test("fechaUTC: AAAA-MM-DD HH:MM UTC, sin depender de la zona del equipo", () => {
  assert.equal(fechaUTC(Date.parse("2026-06-24T22:05:04.123Z")), "2026-06-24 22:05 UTC");
  assert.equal(fechaUTC(Date.parse("1990-01-01T00:00:00Z")), "1990-01-01 00:00 UTC");
});
