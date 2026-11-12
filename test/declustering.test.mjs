/**
 * T04 (RF-6, RF-30): declustering Gardner-Knopoff adaptado.
 * Los 12 valores de la tabla de referencia se COPIARON de
 * docs/adr/ADR-010-patrones-estadisticos.md §4 (van Stiphout et al. 2012,
 * Tabla 2); no se calculan con las formulas.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { declustering, ventanaKm, ventanaDias } from "../scripts/ml/declustering.mjs";
import { catalogoSecuencia } from "./sintetico.mjs";

const TABLA_GK = [
  // [M, L km, T dias]
  [2.5, 19.5, 6],
  [3.0, 22.5, 11.5],
  [3.5, 26, 22],
  [4.0, 30, 42],
  [4.5, 35, 83],
  [5.0, 40, 155],
  [5.5, 47, 290],
  [6.0, 54, 510],
  [6.5, 61, 790],
  [7.0, 70, 915],
  [7.5, 81, 960],
  [8.0, 94.0, 985],
];

const DIA_MS = 86400000;
const HORA_MS = 3600000;
const T0 = Date.UTC(2020, 0, 1);
const KM_GRADO = 111.195;

const ev = (id, mag, tiempo, lat, lon, prof = 10) => ({ id, mag, tiempo, lat, lon, prof });
const rolDe = (res, id) => res.asignaciones.find((a) => a.id === id);

test("L(M) y T(M) coinciden con la tabla de referencia (±10 %, T en M 6,5 ±15 %)", () => {
  for (const [m, l, t] of TABLA_GK) {
    const dL = Math.abs(ventanaKm(m) / l - 1);
    assert.ok(dL <= 0.1, `L(${m}) = ${ventanaKm(m)} vs ${l} (${(dL * 100).toFixed(1)} %)`);
    const tol = m === 6.5 ? 0.15 : 0.1;
    const dT = Math.abs(ventanaDias(m) / t - 1);
    assert.ok(dT <= tol, `T(${m}) = ${ventanaDias(m)} vs ${t} (${(dT * 100).toFixed(1)} %)`);
  }
});

test("el salto en M 6,5 se conserva: la rama alta empieza en >= 6,5", () => {
  assert.ok(ventanaDias(6.5) < ventanaDias(6.4999));
});

test("secuencia sintetica: >= 95 % de replicas con el principal correcto; principal fondo con principal null", () => {
  const cat = catalogoSecuencia(1, { ventanaKm: ventanaKm(6.0), ventanaDias: ventanaDias(6.0) });
  const res = declustering(cat.eventos);
  const ok = cat.replicas.filter((r) => {
    const a = rolDe(res, r.id);
    return a.rol === "secuencia" && a.principal === "principal";
  }).length;
  assert.ok(ok / cat.replicas.length >= 0.95, `replicas bien asignadas: ${ok}/100`);
  const p = rolDe(res, "principal");
  assert.equal(p.rol, "fondo");
  assert.equal(p.principal, null);
});

test("los 50 aislados son 100 % fondo", () => {
  const cat = catalogoSecuencia(1, { ventanaKm: ventanaKm(6.0), ventanaDias: ventanaDias(6.0) });
  const res = declustering(cat.eventos);
  for (const a of cat.aislados) {
    const r = rolDe(res, a.id);
    assert.equal(r.rol, "fondo", a.id);
    assert.equal(r.principal, null, a.id);
  }
});

test("un precursor 1 h antes del principal es fondo", () => {
  const res = declustering([
    ev("pre", 4.0, T0 - HORA_MS, 10.0, -66.0),
    ev("main", 6.0, T0, 10.0, -66.0 + 1 / KM_GRADO),
  ]);
  assert.equal(rolDe(res, "pre").rol, "fondo");
  assert.equal(rolDe(res, "main").rol, "fondo");
});

test("igual magnitud, 1 dia despues y a 1 km: ninguno es secuencia", () => {
  const res = declustering([
    ev("a", 5.0, T0, 10.0, -66.0),
    ev("b", 5.0, T0 + DIA_MS, 10.0 + 1 / KM_GRADO, -66.0),
  ]);
  assert.equal(rolDe(res, "a").rol, "fondo");
  assert.equal(rolDe(res, "b").rol, "fondo");
  assert.equal(rolDe(res, "b").principal, null);
});

test("replica de replica fuera de la ventana del principal es fondo (sin encadenamiento)", () => {
  // L(6,0) ~ 53 km, L(5,0) ~ 40 km: B queda a ~75 km del principal y a 35 km de A.
  const latA = 10.0 + 40 / KM_GRADO;
  const latB = latA + 35 / KM_GRADO;
  const res = declustering([
    ev("main", 6.0, T0, 10.0, -66.0),
    ev("A", 5.0, T0 + 10 * DIA_MS, latA, -66.0),
    ev("B", 4.0, T0 + 20 * DIA_MS, latB, -66.0),
  ]);
  assert.equal(rolDe(res, "A").rol, "secuencia");
  assert.equal(rolDe(res, "A").principal, "main");
  assert.equal(rolDe(res, "B").rol, "fondo");
  assert.equal(rolDe(res, "B").principal, null);
});

test("profundidad: 70 superficial; 70,1 y 300 no_aplica", () => {
  const res = declustering([
    ev("p70", 5.0, T0, 10.0, -66.0, 70),
    ev("p70_1", 5.0, T0 + 1000, 10.5, -66.0, 70.1),
    ev("p300", 5.0, T0 + 2000, 11.0, -66.0, 300),
  ]);
  assert.equal(rolDe(res, "p70").rol, "fondo");
  assert.equal(rolDe(res, "p70_1").rol, "no_aplica");
  assert.equal(rolDe(res, "p300").rol, "no_aplica");
  assert.equal(rolDe(res, "p70_1").principal, null);
});

test("un evento intermedio no actua como principal ni como replica de uno superficial", () => {
  const res = declustering([
    ev("deep", 6.5, T0, 10.0, -66.0, 150),
    ev("sup", 4.0, T0 + DIA_MS, 10.0, -66.0, 10),
  ]);
  assert.equal(rolDe(res, "sup").rol, "fondo");
});

test("profundidad nula (o no numerica) se excluye y se cuenta; no aparece en asignaciones", () => {
  const res = declustering([
    ev("ok", 5.0, T0, 10.0, -66.0),
    ev("nula", 5.0, T0 + 1000, 10.0, -66.0, null),
    ev("nan", 5.0, T0 + 2000, 10.0, -66.0, NaN),
    ev("sinMag", null, T0 + 3000, 10.0, -66.0),
  ]);
  assert.equal(res.excluidos, 3);
  assert.deepEqual(res.asignaciones.map((a) => a.id), ["ok"]);
});

test("determinista: el orden de entrada no cambia el resultado", () => {
  const cat = catalogoSecuencia(2, { ventanaKm: ventanaKm(6.0), ventanaDias: ventanaDias(6.0) });
  const r1 = declustering(cat.eventos);
  const r2 = declustering([...cat.eventos].reverse());
  const ord = (r) => JSON.stringify([...r.asignaciones].sort((a, b) => (a.id < b.id ? -1 : 1)));
  assert.equal(ord(r1), ord(r2));
});
