/**
 * T09 (RF-3, RF-16, RF-18, RF-20, RF-28, RF-34, RF-35) y T10 (RF-2, lista
 * prohibida): logica pura de src/patrones.js y textos i18n de la seccion.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatoNumero, formatoB, zonasVisibles, coincideConCatalogo, ordenarZonas, nMinDe } from "../src/patrones.js";
import { interpolar } from "../src/i18n/interpolar.js";
const leer = (f) => JSON.parse(readFileSync(new URL(`../src/i18n/${f}`, import.meta.url), "utf8"));
const DIC = { es: leer("es.json"), en: leer("en.json") };

const tDe = (idioma) => (clave, params) => interpolar(DIC[idioma][clave] ?? clave, params);

const gr = (extra = {}) => ({
  publicado: true, motivo: null, familia: "mb", n_sobre_mc: 212, mc: 4.3, mc_ic95: [4.1, 4.5],
  b: 0.98, b_ic95: [0.85, 1.12], b_sigma_shi_bolt: 0.07, ...extra,
});
const zona = (id, lon, lat, nVista, n, g = gr()) => ({
  id, centro: { lat, lon }, n_eventos: n, n_en_vista_venezuela: nVista, gutenberg_richter: g,
});

test("formatoNumero: coma en es, punto en en (RF-28)", () => {
  assert.equal(formatoNumero(0.98, 2, "es"), "0,98");
  assert.equal(formatoNumero(0.98, 2, "en"), "0.98");
  assert.equal(formatoNumero(4, 1, "es"), "4,0");
});

test("formatoB publicado: b con IC 95 %, Mc con IC, familia y n juntos (RF-16)", () => {
  assert.equal(
    formatoB(zona("S01", -69, 10, 1, 1), "es", tDe("es"), 50),
    "b = 0,98 (IC 95 %: 0,85–1,12) · Mc 4,3 (IC 95 %: 4,1–4,5) · mb · n = 212",
  );
  assert.equal(
    formatoB(zona("S01", -69, 10, 1, 1), "en", tDe("en"), 50),
    "b = 0.98 (95 % CI: 0.85–1.12) · Mc 4.3 (95 % CI: 4.1–4.5) · mb · n = 212",
  );
});

test("formatoB no publicado: el motivo, sin cifra de b (RF-34)", () => {
  const ins = zona("S02", -69, 10, 1, 1, gr({ publicado: false, motivo: "muestra_insuficiente", n_sobre_mc: 31, b: null, b_ic95: null, mc: null, mc_ic95: null }));
  assert.equal(formatoB(ins, "es", tDe("es"), 50), "Valor b: muestra insuficiente (n = 31 < 50)");
  assert.equal(formatoB(ins, "en", tDe("en"), 50), "b value: insufficient sample (n = 31 < 50)");
  const inc = zona("S03", -69, 10, 1, 1, gr({ publicado: false, motivo: "intervalo_inconsistente", b: null, b_ic95: null }));
  assert.equal(formatoB(inc, "es", tDe("es"), 50), "Valor b: intervalo inconsistente");
  assert.equal(formatoB(inc, "en", tDe("en"), 50), "b value: inconsistent interval");
  for (const z of [ins, inc]) assert.doesNotMatch(formatoB(z, "es", tDe("es"), 50), /0,98|b =/);
});

test("zonasVisibles: 49 % oculta, 50 % y 51 % muestran en 'venezuela' (RF-18)", () => {
  const p = { zonas: [zona("A", -70, 10, 49, 100), zona("B", -69, 10, 50, 100), zona("C", -68, 10, 51, 100)] };
  assert.deepEqual(zonasVisibles(p, "venezuela").map((z) => z.id), ["B", "C"]);
  assert.deepEqual(zonasVisibles(p, "region").map((z) => z.id), ["A", "B", "C"]);
});

test("vista 'venezuela' sin zonas que cumplan -> lista vacia y existe el mensaje de RF-35", () => {
  const p = { zonas: [zona("A", -70, 10, 0, 100)] };
  assert.deepEqual(zonasVisibles(p, "venezuela"), []);
  for (const idioma of ["es", "en"]) assert.ok(DIC[idioma]["patrones.sinZonas"]);
});

test("orden oeste -> este; empate de longitud: norte primero (RF-3)", () => {
  const zs = [zona("C", -64, 8, 1, 1), zona("A", -73, 6, 1, 1), zona("D", -69, 9, 1, 1), zona("B", -69, 11, 1, 1)];
  assert.deepEqual(ordenarZonas(zs).map((z) => z.id), ["A", "B", "D", "C"]);
  assert.deepEqual(zonasVisibles({ zonas: zs }, "region").map((z) => z.id), ["A", "B", "D", "C"]);
});

test("coincideConCatalogo: falso si cambia catalogo_n o ultima_verificacion o falta (RF-20)", () => {
  const p = { metadata: { catalogo_n: 4358, ultima_verificacion: "2026-11-11" } };
  assert.equal(coincideConCatalogo(p, { n: 4358, verificacion: "2026-11-11" }), true);
  assert.equal(coincideConCatalogo(p, { n: 4359, verificacion: "2026-11-11" }), false);
  assert.equal(coincideConCatalogo(p, { n: 4358, verificacion: "2026-11-12" }), false);
  assert.equal(coincideConCatalogo(null, { n: 1, verificacion: "x" }), false);
});

test("nMinDe lee N_MIN del archivo real", () => {
  const real = JSON.parse(readFileSync(new URL("../data/patrones.json", import.meta.url), "utf8"));
  assert.equal(nMinDe(real), 50);
});

// --- T10: lista prohibida (RF-2, plan 3.6) ------------------------------------------
const RAICES = {
  es: ["riesg", "peligr", "amenaz", "alert", "predic", "predec", "predij", "pronostic", "probab", "inminent", "venider", "pront", "proxim", "futur", "esperad", "estable", "inestable", "segur", "activ", "propens", "tendenc", "recurren"],
  en: ["risk", "hazard", "danger", "threat", "alert", "predict", "forecast", "probab", "likel", "imminent", "soon", "next", "upcoming", "futur", "expect", "stable", "unstable", "safe", "activ", "prone", "trend", "recurren"],
};
const EXCEPCIONES = ["likelihood", "establec"];
const palabras = (texto) =>
  texto.toLowerCase().normalize("NFD").replace(/\p{M}+/gu, "").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const saltan = (texto) => {
  const todas = [...RAICES.es, ...RAICES.en];
  return palabras(texto).filter((w) => todas.some((r) => w.startsWith(r)) && !EXCEPCIONES.some((e) => w.startsWith(e)));
};

test("lista prohibida: un positivo por raiz salta; los falsos positivos conocidos no", () => {
  const positivos = [
    "riesgos", "peligrosa", "amenazas", "alertas", "predicción", "predecimos", "predijo", "pronosticar", "probabilidad", "inminentes", "venideros", "pronto", "próximas", "futura", "esperadas", "estables", "inestable", "seguridad", "activa", "propensa", "tendencia", "recurrencia",
    "risky", "hazards", "dangerous", "threats", "alerts", "predicted", "forecasting", "probably", "likely", "imminent", "soon", "next", "upcoming", "future", "expected", "stable", "unstable", "safety", "active", "prone", "trends", "recurrent",
  ];
  for (const w of positivos) assert.equal(saltan(w).length, 1, w);
  for (const w of ["Mw", "mb", "ML-Md", "media", "magnitud", "sismicidad", "seismicity", "secuencia", "superficial", "Cepitá", "según", "likelihood", "establecer", "nexus", "sample"]) {
    assert.deepEqual(saltan(w), [], w);
  }
});

test("claves patrones.* de es y en: 0 coincidencias salvo patrones.noPrediccion (RF-2)", () => {
  for (const idioma of ["es", "en"]) {
    const claves = Object.keys(DIC[idioma]).filter((k) => k.startsWith("patrones."));
    assert.ok(claves.length >= 15, `faltan claves patrones.* en ${idioma}`);
    for (const k of claves.filter((c) => c !== "patrones.noPrediccion")) {
      assert.deepEqual(saltan(DIC[idioma][k]), [], `${idioma}.${k}`);
    }
  }
});

test("textos obligatorios: no prediccion (RF-15), notas (RF-17, RF-27) y mensajes (RF-20, RF-35)", () => {
  for (const idioma of ["es", "en"]) {
    for (const k of ["noPrediccion", "nota", "notaVenezuela", "noDisponible", "sinZonas", "borde"]) {
      assert.ok(DIC[idioma][`patrones.${k}`], `${idioma}.patrones.${k}`);
    }
  }
  assert.match(DIC.es["patrones.noPrediccion"], /No predice sismos/);
  assert.match(DIC.en["patrones.noPrediccion"], /does not predict earthquakes/);
});
