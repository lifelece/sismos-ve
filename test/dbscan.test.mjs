/**
 * T05 (RF-7, RF-8): DBSCAN haversine, estabilidad por Jaccard y control
 * aleatorio. Parametros del test (epsKm 15, minPts 10) independientes de los
 * de produccion (se calibran en T06). El control corre con 3 semillas; la
 * comprobacion con 20 (produccion) se hace puntualmente:
 *   $env:SEMILLAS_CONTROL=20; node --test test/dbscan.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  dbscan,
  dbscanFuerzaBruta,
  sensibilidad,
  agrupar,
  agruparPorClase,
  controlAleatorio,
} from "../scripts/ml/dbscan.mjs";
import { PARAMETROS_DBSCAN, PARAMETROS_AGRUPACION, SEMILLA_BASE } from "../scripts/ml/parametros.mjs";
import { declustering } from "../scripts/ml/declustering.mjs";
import { normalizarEvento, claseProfundidad } from "../src/data.js";
import { crearAzar } from "../scripts/ml/azar.mjs";
import { catalogoAgrupaciones, EPS_KM_TEST, MINPTS_TEST } from "./sintetico.mjs";

const P = { epsKm: EPS_KM_TEST, minPts: MINPTS_TEST };
const SEMILLAS_CONTROL = Number(process.env.SEMILLAS_CONTROL ?? 3);
const KM_GRADO = 111.195;

function conIds(puntos) {
  return puntos.map((p, i) => ({ id: p.id ?? `p${i}`, lat: p.lat, lon: p.lon }));
}

test("parametros: factores 0,8 y 1,2 y J_MIN 0,75; sin valores de produccion", () => {
  assert.deepEqual([...PARAMETROS_DBSCAN.factores], [0.8, 1.2]);
  assert.equal(PARAMETROS_DBSCAN.jMin, 0.75);
  assert.equal("epsKm" in PARAMETROS_DBSCAN, false);
  assert.equal("minPts" in PARAMETROS_DBSCAN, false);
});

test("agrupaciones de 3.7: exactamente 3 grupos que cumplen, cada uno con >= 90 % de su nube", () => {
  const puntos = catalogoAgrupaciones(1);
  const r = agrupar(conIds(puntos), P);
  const cumplen = r.grupos.filter((g) => g.cumple);
  assert.equal(cumplen.length, 3);
  const nubePorId = new Map(puntos.map((p) => [p.id, p.nube]));
  const usados = new Set();
  for (let nube = 0; nube < 3; nube++) {
    let mejor = null;
    let mejorN = -1;
    for (const g of cumplen) {
      const n = g.ids.filter((id) => nubePorId.get(id) === nube).length;
      if (n > mejorN) {
        mejorN = n;
        mejor = g;
      }
    }
    assert.ok(mejorN / 150 >= 0.9, `nube ${nube}: ${mejorN}/150`);
    assert.ok(!usados.has(mejor), "dos nubes en el mismo grupo");
    usados.add(mejor);
    assert.ok(mejor.jaccardMin >= PARAMETROS_DBSCAN.jMin);
  }
});

test("un grupo inestable se descarta (cadena que se rompe con el radio x0,8)", () => {
  // 30 puntos en un meridiano separados 0,9*eps: con eps forman un grupo
  // (minPts 2 cuenta el propio punto); con 0,8*eps todo es ruido.
  const eps = 10;
  const paso = (0.9 * eps) / KM_GRADO;
  const cadena = Array.from({ length: 30 }, (_, i) => ({ id: `c${i}`, lat: 5 + i * paso, lon: -66 }));
  const r = agrupar(cadena, { epsKm: eps, minPts: 2 });
  assert.equal(r.k, 1, "con el radio base hay un grupo");
  assert.equal(r.grupos[0].cumple, false);
  assert.ok(r.grupos[0].jaccardMin < PARAMETROS_DBSCAN.jMin);
});

test("sensibilidad: 'mejor equivalente' = maximo Jaccard en la corrida perturbada", () => {
  // Bloque de 8 puntos pegados + 2 puntos a ~11 km (fuera de eps = 10, dentro
  // de 1,2*eps = 12; con minPts 3 son borde). x0,8: grupo de 8 (J = 1).
  // x1,2: grupo de 10 (J = 8/10). Minimo = 0,8.
  const eps = 10;
  const dg = 1 / KM_GRADO;
  const pts = [];
  for (let i = 0; i < 8; i++) pts.push({ id: `a${i}`, lat: 5 + i * 0.01 * dg, lon: -66 });
  pts.push({ id: "b0", lat: 5 + 0.07 * dg + 11 * dg, lon: -66 });
  pts.push({ id: "b1", lat: 5 + 0.07 * dg + 11 * dg + 0.01 * dg, lon: -66 });
  const base = dbscan(pts, { epsKm: eps, minPts: 3 });
  assert.equal(base.k, 1);
  assert.equal(base.etiquetas.filter((e) => e === 0).length, 8);
  const [s] = sensibilidad(pts, base, { epsKm: eps, minPts: 3, factores: [0.8, 1.2] });
  assert.equal(s.grupo, 0);
  assert.ok(Math.abs(s.jaccardMin - 0.8) < 1e-9, `jaccardMin = ${s.jaccardMin}`);
});

test("barajar la entrada da los mismos grupos", () => {
  const puntos = conIds(catalogoAgrupaciones(1));
  const a = agrupar(puntos, P);
  const azar = crearAzar(7);
  const barajada = [...puntos];
  for (let i = barajada.length - 1; i > 0; i--) {
    const j = azar.entero(i + 1);
    [barajada[i], barajada[j]] = [barajada[j], barajada[i]];
  }
  assert.deepEqual(agrupar(barajada, P), a);
});

test("mismo punto superficial e intermedio -> grupos distintos; clase vacia no rompe", () => {
  const entradas = [];
  for (let i = 0; i < 12; i++) {
    entradas.push({ id: `s${i}`, lat: 8 + i * 1e-4, lon: -66, clase: "superficial" });
    entradas.push({ id: `i${i}`, lat: 8 + i * 1e-4, lon: -66, clase: "intermedio" });
  }
  const params = { superficial: P, intermedio: P, profundo: P };
  const r = agruparPorClase(entradas, params);
  assert.equal(r.superficial.grupos.length, 1);
  assert.equal(r.intermedio.grupos.length, 1);
  assert.equal(r.superficial.grupos[0].ids.length, 12);
  assert.ok(r.superficial.grupos[0].ids.every((id) => id.startsWith("s")));
  assert.ok(r.intermedio.grupos[0].ids.every((id) => id.startsWith("i")));
  assert.deepEqual(r.profundo.grupos, []);
  assert.equal(r.profundo.k, 0);
  assert.equal(dbscan([], P).k, 0);
  assert.equal(agrupar([], P).grupos.length, 0);
  assert.equal(agrupar([{ id: "x", lat: 8, lon: -66 }], P).grupos.length, 0);
  assert.throws(() => agruparPorClase([{ id: "z", lat: 8, lon: -66, clase: "otra" }], params));
});

test("rejilla = fuerza bruta en 500 puntos (tres radios)", () => {
  const azar = crearAzar(11);
  const pts = [];
  for (let i = 0; i < 500; i++) {
    const densa = i % 2 === 0;
    pts.push({
      lat: densa ? 5 + azar.siguiente() * 1.5 : 0.5 + azar.siguiente() * 12.5,
      lon: densa ? -68 + azar.siguiente() * 1.5 : -73.5 + azar.siguiente() * 14,
    });
  }
  for (const par of [{ epsKm: 15, minPts: 4 }, { epsKm: 40, minPts: 6 }, { epsKm: 5, minPts: 2 }]) {
    const g = dbscan(pts, par);
    const f = dbscanFuerzaBruta(pts, par);
    assert.equal(g.k, f.k);
    assert.deepEqual([...g.etiquetas], [...f.etiquetas]);
  }
});

test("determinismo: misma entrada y semilla -> mismo resultado", () => {
  const puntos = conIds(catalogoAgrupaciones(1));
  assert.deepEqual(agrupar(puntos, P), agrupar(puntos, P));
  const op = { semillaBase: 1, clase: "superficial", semillas: 2 };
  assert.deepEqual(controlAleatorio(500, P, op), controlAleatorio(500, P, op));
});

test("control aleatorio (DEBIL): ruido uniforme con la n real por clase -> 0 grupos", () => {
  const json = JSON.parse(readFileSync(new URL("../data/eventos.json", import.meta.url), "utf8"));
  const eventos = json.features.map(normalizarEvento);
  const { asignaciones } = declustering(eventos);
  const rol = new Map(asignaciones.map((a) => [a.id, a.rol]));
  const n = { superficial: 0, intermedio: 0, profundo: 0 };
  for (const e of eventos) {
    const r = rol.get(e.id);
    if (r === undefined || r === "secuencia") continue;
    n[claseProfundidad(e.prof).clave]++;
  }
  assert.ok(n.superficial > 1000, `n superficial = ${n.superficial}`);
  for (const [clase, nClase] of Object.entries(n)) {
    if (nClase === 0) continue;
    const c = controlAleatorio(nClase, P, { semillaBase: 1, clase, semillas: SEMILLAS_CONTROL });
    assert.equal(c.gruposQueCumplen, 0, `clase ${clase} (n=${nClase})`);
  }
});

test("T06: control aleatorio con los parametros CONGELADOS de produccion -> 0 grupos por clase", () => {
  const json = JSON.parse(readFileSync(new URL("../data/eventos.json", import.meta.url), "utf8"));
  const eventos = json.features.map(normalizarEvento);
  const { asignaciones } = declustering(eventos);
  const rol = new Map(asignaciones.map((a) => [a.id, a.rol]));
  const n = { superficial: 0, intermedio: 0, profundo: 0 };
  for (const e of eventos) {
    const r = rol.get(e.id);
    if (r === undefined || r === "secuencia") continue;
    n[claseProfundidad(e.prof).clave]++;
  }
  for (const [clase, nClase] of Object.entries(n)) {
    const p = PARAMETROS_AGRUPACION[clase];
    assert.ok(p && p.epsKm > 0 && p.minPts >= 1, `faltan parametros de ${clase}`);
    const c = controlAleatorio(nClase, p, { semillaBase: SEMILLA_BASE, clase, semillas: SEMILLAS_CONTROL });
    assert.equal(c.gruposQueCumplen, 0, `clase ${clase} (n=${nClase}, eps=${p.epsKm}, minPts=${p.minPts})`);
  }
});
