/**
 * Buscador de eventos (ADR-006): funcion pura sobre un indice en memoria.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buscar, crearIndice, normalizarTexto } from "../src/buscar.js";
import { normalizarColeccion } from "../src/data.js";

const catalogo = JSON.parse(await readFile(new URL("../data/eventos.json", import.meta.url), "utf8"));
const indice = crearIndice(normalizarColeccion(catalogo).eventos);

test("normalizarTexto quita tildes y mayusculas", () => {
  assert.equal(normalizarTexto("Carúpano, CUMANÁ, Güiria"), "carupano, cumana, guiria");
});

test("menos de 2 caracteres no busca", () => {
  assert.deepEqual(buscar(indice, ""), []);
  assert.deepEqual(buscar(indice, " c "), []);
});

test("busca por lugar sin tildes y ordena por magnitud", () => {
  const r = buscar(indice, "carupano");
  assert.ok(r.length > 0 && r.length <= 8);
  assert.equal(r[0].id, "us1000gez7", "el M7.3 de 2018 es el mayor cerca de Carupano");
  for (let i = 1; i < r.length; i += 1) assert.ok(r[i - 1].mag >= r[i].mag, `orden en ${i}`);
  assert.ok(r.every((e) => normalizarTexto(e.lugar).includes("carupano")));
});

test("todas las palabras, en cualquier orden", () => {
  const r = buscar(indice, "venezuela catia");
  assert.ok(r.length > 0);
  assert.ok(r.every((e) => /catia/i.test(e.lugar) && /venezuela/i.test(e.lugar)));
  assert.equal(r[0].id, "us6000t7zp");
});

test("busca por id del USGS y por año", () => {
  assert.deepEqual(buscar(indice, "us6000t7zp").map((e) => e.id), ["us6000t7zp"]);
  const anio = buscar(indice, "1997 carupano");
  assert.ok(anio.length > 0);
  assert.ok(anio.every((e) => e.anio === 1997));
  assert.equal(anio[0].id, "usp00084m2");
});

test("tope de resultados configurable y sin resultados si nada coincide", () => {
  assert.equal(buscar(indice, "venezuela", 3).length, 3);
  assert.deepEqual(buscar(indice, "zzzz no existe"), []);
});
