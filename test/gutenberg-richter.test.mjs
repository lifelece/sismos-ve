/**
 * T03: Gutenberg-Richter (familias, Mc, b, sigma, bootstrap, N_MIN, RF-31).
 * Los valores de b y sigma de los casos pequenos estan calculados a mano en
 * este archivo (no con la funcion probada). Todo el azar sale de azar.mjs.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { crearAzar, semillaDe } from "../scripts/ml/azar.mjs";
import { catalogoGR } from "./sintetico.mjs";
import {
  familiaDe,
  redondearMag,
  estimarMc,
  estimarB,
  bootstrapGR,
  elegirFamilia,
  validarIntervalo,
  ajustarGR,
} from "../scripts/ml/gutenberg-richter.mjs";
import { PARAMETROS_GR } from "../scripts/ml/parametros.mjs";

const DM = 0.1;

/** Eventos {id, mag, magType} a partir de conteos por magnitud: {"3.0": 50, ...}. */
function desdeConteos(conteos, magType, prefijo = "e") {
  const eventos = [];
  for (const [mag, c] of Object.entries(conteos)) {
    for (let i = 0; i < c; i++) eventos.push({ id: `${prefijo}${mag}-${i}`, mag: Number(mag), magType });
  }
  return eventos;
}

test("constantes de T03 en parametros.mjs", () => {
  assert.equal(PARAMETROS_GR.nMin, 50);
  assert.equal(PARAMETROS_GR.dM, 0.1);
  assert.equal(PARAMETROS_GR.correccionMc, 0.2); // convencion declarada sin cita abierta (ADR-010)
  assert.equal(PARAMETROS_GR.B, 1000);
  assert.equal(PARAMETROS_GR.maxDescarte, 0.05);
});

test("familiaDe: agrupacion de magType (spec 3), sin distinguir mayusculas", () => {
  for (const t of ["mww", "mwr", "mwc", "mwb", "mw", "MWW"]) assert.equal(familiaDe(t), "Mw", t);
  assert.equal(familiaDe("mb"), "mb");
  assert.equal(familiaDe("MB"), "mb");
  for (const t of ["ml", "md", "ML"]) assert.equal(familiaDe(t), "ML-Md", t);
  for (const t of ["mb_lg", "ms", "mwx", "", null, undefined]) assert.equal(familiaDe(t), null, String(t));
});

test("redondearMag: Math.round(m*10 + 1e-9)/10", () => {
  assert.equal(redondearMag(3.04), 3.0);
  assert.equal(redondearMag(3.05), 3.1);
  assert.equal(redondearMag(3.15), 3.2);
  assert.equal(redondearMag(4.949999999), 4.9);
});

test("estimarB: b y sigma contra valores calculados a mano", () => {
  // Magnitudes 3.0, 3.0, 3.5, 4.0 con Mc = 3.0 y dM = 0,1:
  //   media = 13,5/4 = 3,375; media - (Mc - dM/2) = 3,375 - 2,95 = 0,425
  //   b = 0,4342944819 / 0,425 = 1,0218694
  //   suma (Mi - media)^2 = 2*0,140625 + 0,015625 + 0,390625 = 0,6875; n(n-1) = 12
  //   sigma = 2,30 * b^2 * sqrt(0,6875/12) = 2,30 * 1,044209 * 0,239357 = 0,57487
  const r = estimarB([3.0, 3.0, 3.5, 4.0], 3.0, DM);
  assert.equal(r.n, 4);
  assert.ok(Math.abs(r.b - 1.0218694) < 1e-6, `b=${r.b}`);
  assert.ok(Math.abs(r.sigma - 0.57487) < 1e-4, `sigma=${r.sigma}`);
});

test("estimarB: solo cuenta eventos >= Mc", () => {
  const r = estimarB([2.0, 2.5, 3.0, 3.0, 3.5, 4.0], 3.0, DM);
  assert.equal(r.n, 4);
  assert.ok(Math.abs(r.b - 1.0218694) < 1e-6);
});

test("estimarMc: maxima curvatura + 0,2, desempate al bin mas bajo", () => {
  // Pico en 3,1 (90) -> Mc = 3,1 + 0,2 = 3,3
  const mags = desdeConteos({ "2.8": 10, "2.9": 25, "3.0": 40, "3.1": 90, "3.2": 70, "3.3": 55, "3.4": 30 }, "mb").map((e) => e.mag);
  assert.equal(estimarMc(mags, { dM: DM, correccion: 0.2 }), 3.3);
  // Empate 3,0 y 3,1 (30 y 30) -> el bin mas bajo: 3,0 + 0,2 = 3,2
  const empate = desdeConteos({ "2.9": 10, "3.0": 30, "3.1": 30, "3.2": 5 }, "mb").map((e) => e.mag);
  assert.equal(estimarMc(empate, { dM: DM, correccion: 0.2 }), 3.2);
  // Sin correccion devuelve el bin del pico
  assert.equal(estimarMc(mags, { dM: DM, correccion: 0 }), 3.1);
  // Redondeo antes de agrupar: 3,04 y 3,06 caen en bins distintos (3,0 y 3,1)
  assert.equal(estimarMc([3.04, 3.04, 3.04, 3.06], { dM: DM, correccion: 0 }), 3.0);
});

test("Mc recuperado en catalogo G-R con incompletitud conocida", () => {
  // G-R b=1 desde 2,0; completo desde 3,0; por debajo, la deteccion cae como
  // 10^(2(M-3)) (p. ej. 1 % a M 2,0). El pico de la FMD no acumulada queda en 3,0
  // -> Mc = 3,0 + 0,2 = 3,2 (convencion +0,2).
  const azar = crearAzar(semillaDe(1, "mc-incompleto"));
  const mags = catalogoGR(77, { b: 1.0, n: 100000, mmin: 2.0 })
    .map((e) => e.mag)
    .filter((m) => m >= 3.0 || azar.siguiente() < 10 ** (2 * (m - 3.0)));
  assert.equal(estimarMc(mags, { dM: DM, correccion: 0.2 }), 3.2);
});

test("b recuperado de un G-R sintetico (b=1, n=1000) y sesgo medio pequeno", () => {
  let suma = 0;
  const semillas = 100;
  for (let s = 1; s <= semillas; s++) {
    const mags = catalogoGR(s, { b: 1.0, n: 1000, mmin: 3.0 }).map((e) => e.mag);
    const mc = estimarMc(mags, { dM: DM, correccion: 0.2 });
    const { b, n } = estimarB(mags, mc, DM);
    assert.ok(n > 400, `n=${n}`);
    assert.ok(Math.abs(b - 1.0) < 0.2, `semilla ${s}: b=${b}`); // ~5 sigma con n~630 (sigma ~ 0,04)
    suma += b;
  }
  assert.ok(Math.abs(suma / semillas - 1.0) < 0.03, `b medio=${suma / semillas}`);
});

test("bootstrap reproducible: misma semilla, mismo IC; otra semilla, otro IC", () => {
  const mags = catalogoGR(5, { b: 1.0, n: 500 }).map((e) => e.mag);
  const run = (clave) => bootstrapGR(mags, { B: 200, azar: crearAzar(semillaDe(1, clave)), dM: DM, correccion: 0.2 });
  const a = run("gr|S|z1");
  const b = run("gr|S|z1");
  assert.deepEqual(a, b);
  const c = run("gr|S|z2");
  assert.notDeepEqual(a.bIc95, c.bIc95);
  assert.ok(a.bIc95[0] < a.bIc95[1]);
});

test("IC 95 % de b contiene 1,0 en >= 90 de 100 semillas (b=1, Mmin=3, n=1000, B=200)", () => {
  let dentro = 0;
  for (let s = 1; s <= 100; s++) {
    const mags = catalogoGR(s, { b: 1.0, n: 1000, mmin: 3.0 }).map((e) => e.mag);
    const { bIc95 } = bootstrapGR(mags, { B: 200, azar: crearAzar(semillaDe(1, `cob|${s}`)), dM: DM, correccion: 0.2 });
    if (bIc95[0] <= 1.0 && 1.0 <= bIc95[1]) dentro++;
  }
  assert.ok(dentro >= 90, `cobertura ${dentro}/100`);
});

test("N_MIN: familia con 49 eventos >= Mc -> muestra_insuficiente; con 50 se publica", () => {
  const azar = () => crearAzar(semillaDe(1, "nmin"));
  const con49 = desdeConteos({ "3.0": 60, "3.2": 20, "3.3": 15, "3.4": 14 }, "mb");
  const r49 = ajustarGR(con49, PARAMETROS_GR, azar());
  assert.equal(r49.publicado, false);
  assert.equal(r49.motivo, "muestra_insuficiente");
  assert.equal(r49.n, 49);
  assert.equal(r49.b, null);
  const con50 = desdeConteos({ "3.0": 60, "3.2": 20, "3.3": 15, "3.4": 15 }, "mb");
  const r50 = ajustarGR(con50, { ...PARAMETROS_GR, B: 50 }, azar());
  assert.equal(r50.n, 50);
  assert.notEqual(r50.motivo, "muestra_insuficiente");
});

test("zona sin ningun evento con familia -> muestra_insuficiente", () => {
  const eventos = [...desdeConteos({ "4.0": 100 }, "mb_lg"), ...desdeConteos({ "4.0": 100 }, null)];
  const r = ajustarGR(eventos, PARAMETROS_GR, crearAzar(1));
  assert.equal(r.publicado, false);
  assert.equal(r.motivo, "muestra_insuficiente");
  assert.equal(r.familia, null);
});

test("familia mayoritaria: mb 60 / ML-Md 40 sobre Mc -> mb", () => {
  const mb = desdeConteos({ "3.0": 50, "3.2": 30, "3.3": 20, "3.4": 10 }, "mb", "a");
  const ml = [
    ...desdeConteos({ "3.0": 50, "3.2": 10, "3.3": 6, "3.4": 4 }, "ml", "b"),
    ...desdeConteos({ "3.2": 10, "3.3": 6, "3.4": 4 }, "md", "c"),
  ];
  const f = elegirFamilia([...mb, ...ml], PARAMETROS_GR);
  assert.equal(f.familia, "mb");
  assert.equal(f.n, 60);
  assert.equal(f.mc, 3.2);
});

test("familia mayoritaria: se cuenta sobre el propio Mc, no el total", () => {
  // ML-Md tiene 310 eventos pero solo 10 sobre su Mc; mb tiene 50 y 30 sobre el suyo.
  const ml = desdeConteos({ "3.0": 300, "3.2": 10 }, "ml", "a");
  const mb = desdeConteos({ "3.0": 20, "3.2": 15, "3.3": 15 }, "mb", "b");
  const f = elegirFamilia([...ml, ...mb], PARAMETROS_GR);
  assert.equal(f.familia, "mb");
  assert.equal(f.n, 30);
});

test("familia mayoritaria: empate Mw > mb > ML-Md", () => {
  const mw = desdeConteos({ "3.0": 60, "3.2": 25, "3.3": 25 }, "mww", "a");
  const mb = desdeConteos({ "3.0": 60, "3.2": 25, "3.3": 25 }, "mb", "b");
  const ml = desdeConteos({ "3.0": 60, "3.2": 25, "3.3": 25 }, "ml", "c");
  assert.equal(elegirFamilia([...mw, ...mb, ...ml], PARAMETROS_GR).familia, "Mw");
  assert.equal(elegirFamilia([...mb, ...ml], PARAMETROS_GR).familia, "mb");
  assert.equal(elegirFamilia([...ml], PARAMETROS_GR).familia, "ML-Md");
});

test("magType nulo, mb_lg y ms no entran en Mc ni en b", () => {
  const base = desdeConteos({ "3.0": 60, "3.2": 25, "3.3": 25 }, "mb", "a");
  const ruido = [
    ...desdeConteos({ "5.0": 500 }, "mb_lg", "x"),
    ...desdeConteos({ "5.0": 500 }, "ms", "y"),
    ...desdeConteos({ "5.0": 500 }, null, "z"),
  ];
  assert.deepEqual(elegirFamilia([...base, ...ruido], PARAMETROS_GR), elegirFamilia(base, PARAMETROS_GR));
});

test("RF-31: IC artificial que no contiene b -> intervalo_inconsistente", () => {
  const p = PARAMETROS_GR;
  assert.equal(validarIntervalo({ b: 1.0, bIc95: [1.2, 1.4], fraccionDescartadas: 0 }, p), "intervalo_inconsistente");
  assert.equal(validarIntervalo({ b: 1.0, bIc95: [0.9, 1.1], fraccionDescartadas: 0 }, p), null);
  assert.equal(validarIntervalo({ b: 1.0, bIc95: [0.9, 1.1], fraccionDescartadas: 0.05 }, p), null); // 5 % exacto no excede
  assert.equal(validarIntervalo({ b: 1.0, bIc95: [0.9, 1.1], fraccionDescartadas: 0.051 }, p), "intervalo_inconsistente");
  assert.equal(validarIntervalo({ b: 1.0, bIc95: null, fraccionDescartadas: 1 }, p), "intervalo_inconsistente");
  assert.equal(validarIntervalo({ b: 1.0, bIc95: [NaN, 1.1], fraccionDescartadas: 0 }, p), "intervalo_inconsistente");
});

test("RF-31: caso construido con > 5 % de remuestras con < 2 eventos sobre su Mc", () => {
  // 9 eventos: seis en 3,0 (pico) y tres en 3,5-3,7 (n = 3 >= nMin de prueba).
  // Una remuestra de 9 trae < 2 eventos >= 3,2 con probabilidad ~14 % (> 5 %).
  const eventos = [...desdeConteos({ "3.0": 6 }, "mb", "a"), ...desdeConteos({ "3.5": 1, "3.6": 1, "3.7": 1 }, "mb", "b")];
  const p = { ...PARAMETROS_GR, nMin: 3, B: 200 };
  const r = ajustarGR(eventos, p, crearAzar(semillaDe(1, "rf31")));
  assert.equal(r.publicado, false);
  assert.equal(r.motivo, "intervalo_inconsistente");
  assert.equal(r.b, null);
  assert.equal(r.n, 3);
});

test("catalogo sano publicado: b, sigma, IC con b dentro, familia y Mc", () => {
  const eventos = catalogoGR(3, { b: 1.0, n: 1000 });
  const r = ajustarGR(eventos, { ...PARAMETROS_GR, B: 200 }, crearAzar(semillaDe(1, "sano")));
  assert.equal(r.publicado, true);
  assert.equal(r.motivo, null);
  assert.equal(r.familia, "mb");
  // Con Mmin = 3,0 el bin 3,0 solo recibe [3,0; 3,05): el pico es 3,1 -> Mc = 3,3.
  assert.equal(r.mc, 3.3);
  assert.ok(r.bIc95[0] <= r.b && r.b <= r.bIc95[1]);
  assert.ok(r.sigma > 0 && r.sigma < 0.1);
  assert.equal(r.mcIc95.length, 2);
});
