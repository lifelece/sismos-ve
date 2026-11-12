/**
 * scripts/ml/azar.mjs: unica fuente de azar del analisis (RNF-6).
 * mulberry32 y FNV-1a se implementan de memoria; este test los contrasta
 * con lo que se pueda comprobar.
 *
 * Vectores FNV-1a 32 bits ("", "a", "foobar"): los de la suite publica de
 * Landon Curt Noll (isthe.com/chongo/tech/comp/fnv). NO se pudieron
 * re-descargar en esta sesion: estan anotados de memoria y son
 * "no verificados contra la fuente" hasta que el revisor los coteje.
 *
 * mulberry32: NO VERIFICADO contra un vector publico (su autor, Tommy
 * Ettinger, publica el codigo, no una tabla de salidas). Aqui solo se
 * comprueban propiedades (determinismo, rango, media, independencia
 * entre semillas) y se fija la primera salida de la semilla 1 como
 * regresion propia, que NO es una verificacion externa.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { semillaDe, fnv1a32, crearAzar } from "../scripts/ml/azar.mjs";

test("FNV-1a 32 bits: vectores publicos", () => {
  assert.equal(fnv1a32(""), 0x811c9dc5);
  assert.equal(fnv1a32("a"), 0xe40c292c);
  assert.equal(fnv1a32("foobar"), 0xbf9cf968);
});

test("misma semilla -> mismos 10 000 valores", () => {
  const a = crearAzar(12345);
  const b = crearAzar(12345);
  for (let i = 0; i < 10000; i++) assert.equal(a.siguiente(), b.siguiente());
});

test("semillas distintas -> secuencias distintas", () => {
  const a = crearAzar(1);
  const b = crearAzar(2);
  const xs = Array.from({ length: 20 }, () => a.siguiente());
  const ys = Array.from({ length: 20 }, () => b.siguiente());
  assert.notDeepEqual(xs, ys);
});

test("mulberry32: valores en [0, 1) y media de 10 000 uniformes en [0,49; 0,51]", () => {
  const r = crearAzar(7);
  let suma = 0;
  for (let i = 0; i < 10000; i++) {
    const u = r.siguiente();
    assert.ok(u >= 0 && u < 1);
    suma += u;
  }
  const media = suma / 10000;
  assert.ok(media >= 0.49 && media <= 0.51, `media ${media}`);
});

test("mulberry32: regresion propia de la semilla 1 (no es vector externo)", () => {
  const r = crearAzar(1);
  assert.equal(r.siguiente(), 0.6270739405881613);
});

test("semillaDe: determinista, uint32 y sensible a la clave y a la base", () => {
  const base = 20260101;
  assert.equal(semillaDe(base, "a"), semillaDe(base, "a"));
  assert.notEqual(semillaDe(base, "a"), semillaDe(base, "b"));
  assert.notEqual(semillaDe(base, "a"), semillaDe(base + 1, "a"));
  const s = semillaDe(base, "gr|mb|us001");
  assert.ok(Number.isInteger(s) && s >= 0 && s <= 0xffffffff);
  assert.equal(semillaDe(base, "a"), fnv1a32(`${base}|a`));
});

test("entero(max) en [0, max) y remuestrear conserva el tamano sin tocar la entrada", () => {
  const r = crearAzar(3);
  for (let i = 0; i < 1000; i++) {
    const k = r.entero(5);
    assert.ok(Number.isInteger(k) && k >= 0 && k < 5);
  }
  const xs = [1, 2, 3, 4, 5, 6];
  const copia = [...xs];
  const m = r.remuestrear(xs);
  assert.equal(m.length, xs.length);
  assert.ok(m.every((v) => xs.includes(v)));
  assert.deepEqual(xs, copia);
});

test("catalogos sinteticos: tamanos de §3.7 y determinismo por semilla", async () => {
  const s = await import("./sintetico.mjs");
  const gr = s.catalogoGR(1);
  assert.equal(gr.length, 1000);
  assert.ok(gr.every((e) => e.mag >= 3.0 && e.magType === "mb"));
  assert.deepEqual(gr, s.catalogoGR(1));
  assert.notDeepEqual(gr, s.catalogoGR(2));
  assert.equal(s.catalogoAgrupaciones(1).length, 750);
  const sec = s.catalogoSecuencia(1, { ventanaKm: 100, ventanaDias: 500 });
  assert.equal(sec.replicas.length, 100);
  assert.equal(sec.aislados.length, 50);
  assert.deepEqual(sec, s.catalogoSecuencia(1, { ventanaKm: 100, ventanaDias: 500 }));
});
