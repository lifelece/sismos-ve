/**
 * T08 (RF-1, RF-22, RF-33): validador de data/patrones.json. Parte de un
 * resultado sintetico valido (analizar con B = 200) y lo rompe de una en una.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validarPatrones } from "../scripts/validate-patrones.mjs";
import { analizar } from "../scripts/analizar-patrones.mjs";
import { catalogoAgrupaciones, catalogoGR } from "./sintetico.mjs";

const DIA_MS = 86400000;
const OPC = {
  B: 200,
  semillasControl: 3,
  agrupacion: {
    superficial: { epsKm: 15, minPts: 10 },
    intermedio: { epsKm: 15, minPts: 10 },
    profundo: { epsKm: 15, minPts: 10 },
  },
};

function catalogo() {
  const pts = catalogoAgrupaciones(1);
  const mags = catalogoGR(7, { n: pts.length });
  const features = pts.map((p, i) => ({
    type: "Feature",
    properties: {
      mag: mags[i].mag, place: "10 km N of Lugar Uno, Venezuela", time: Date.UTC(2000, 0, 1) + i * 400 * DIA_MS,
      magType: "mb", status: "reviewed", confianza: "alta", ultima_verificacion: "2026-11-11",
      en_venezuela: true, zona_disputada: false, frente_costa: false, pais_vecino: null,
    },
    geometry: { type: "Point", coordinates: [p.lon, p.lat, 10] },
    id: p.id,
  }));
  return { type: "FeatureCollection", metadata: { ultima_verificacion: "2026-11-11" }, features };
}

const COL = catalogo();
const valido = () => structuredClone(analizar(COL, OPC));
/** Primera zona con b publicado. */
const conB = (p) => p.zonas.find((z) => z.gutenberg_richter.publicado);

test("base: el resultado de analizar valida sin errores ni avisos", () => {
  const p = valido();
  assert.ok(conB(p), "la base de prueba necesita una zona con b publicado");
  const { errores, avisos } = validarPatrones(p, COL);
  assert.deepEqual(errores, []);
  assert.deepEqual(avisos, []);
});

test("clave extra (tasa_anual) -> error (RF-1, RF-22)", () => {
  const p = valido();
  p.zonas[0].tasa_anual = 3;
  assert.match(validarPatrones(p, COL).errores.join("\n"), /tasa_anual/);
  const q = valido();
  q.metadata.probabilidad = 0.1;
  assert.match(validarPatrones(q, COL).errores.join("\n"), /probabilidad/);
});

test("b publicado sin IC -> error", () => {
  const p = valido();
  conB(p).gutenberg_richter.b_ic95 = null;
  assert.match(validarPatrones(p, COL).errores.join("\n"), /sin IC 95/);
});

test("IC con lo > hi -> error", () => {
  const p = valido();
  const g = conB(p).gutenberg_richter;
  g.b_ic95 = [g.b_ic95[1] + 1, g.b_ic95[0]];
  assert.match(validarPatrones(p, COL).errores.join("\n"), /limite inferior mayor/);
});

test("IC no finito -> error", () => {
  const p = valido();
  conB(p).gutenberg_richter.b_ic95 = [null, 2];
  assert.match(validarPatrones(p, COL).errores.join("\n"), /finitos/);
  const q = valido();
  conB(q).gutenberg_richter.mc_ic95 = [3, "x"];
  assert.ok(validarPatrones(q, COL).errores.length > 0);
});

test("b fuera de su IC -> error", () => {
  const p = valido();
  const g = conB(p).gutenberg_richter;
  g.b = g.b_ic95[1] + 0.5;
  assert.match(validarPatrones(p, COL).errores.join("\n"), /fuera de su IC/);
});

test("Mc publicado sin IC -> error (RF-10)", () => {
  const p = valido();
  conB(p).gutenberg_richter.mc_ic95 = null;
  assert.match(validarPatrones(p, COL).errores.join("\n"), /Mc publicado sin IC/);
});

test("zona sin confianza -> error (RF-14)", () => {
  const p = valido();
  delete p.zonas[0].confianza;
  assert.match(validarPatrones(p, COL).errores.join("\n"), /confianza/);
});

test("suma de RF-23 que no cuadra -> error", () => {
  const p = valido();
  p.zonas[0].n_fondo += 1;
  assert.match(validarPatrones(p, COL).errores.join("\n"), /RF-23/);
});

test("SHA-256, catalogo_n o ultima_verificacion distintos -> aviso sin error (RF-33)", () => {
  for (const [campo, valor, texto] of [
    ["catalogo_sha256", "0".repeat(64), /catalogo_sha256/],
    ["catalogo_n", 1, /catalogo_n/],
    ["ultima_verificacion", "2020-01-01", /ultima_verificacion/],
  ]) {
    const p = valido();
    p.metadata[campo] = valor;
    const { errores, avisos } = validarPatrones(p, COL);
    assert.deepEqual(errores, [], campo);
    assert.match(avisos.join("\n"), /patrones desactualizados/, campo);
    assert.match(avisos.join("\n"), texto, campo);
  }
});

test("el archivo real data/patrones.json pasa sin errores contra data/eventos.json", () => {
  const real = JSON.parse(readFileSync(new URL("../data/patrones.json", import.meta.url), "utf8"));
  const eventos = JSON.parse(readFileSync(new URL("../data/eventos.json", import.meta.url), "utf8"));
  const { errores } = validarPatrones(real, eventos);
  assert.deepEqual(errores, []);
});
