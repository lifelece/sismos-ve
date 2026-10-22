/**
 * Puente con cola entre la interfaz y el mapa (ADR-007).
 */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as puente from "../src/puenteMapa.js";

beforeEach(() => puente.reiniciarPuente());

function mapaFalso() {
  const llamadas = [];
  const registrar = (nombre) => (...args) => {
    llamadas.push([nombre, ...args]);
    return true;
  };
  return {
    llamadas,
    modulo: {
      pintarBase: registrar("pintarBase"),
      pintarEventos: registrar("pintarEventos"),
      encuadrar: registrar("encuadrar"),
      seleccionar: registrar("seleccionar"),
      redimensionar: registrar("redimensionar"),
    },
  };
}

test("antes de conectar, las ordenes esperan en cola", () => {
  puente.encuadrar("venezuela");
  puente.seleccionar("us1");
  assert.equal(puente.pendientes(), 2);
  assert.equal(puente.hayMapa(), false);
});

test("al conectar se reproducen en orden y la cola queda vacia", () => {
  const { llamadas, modulo } = mapaFalso();
  puente.pintarBase({ a: 1 });
  puente.pintarEventos([1, 2]);
  puente.seleccionar("us1");
  puente.conectarMapa(modulo);
  assert.deepEqual(llamadas, [["pintarBase", { a: 1 }], ["pintarEventos", [1, 2]], ["seleccionar", "us1"]]);
  assert.equal(puente.pendientes(), 0);
  assert.equal(puente.hayMapa(), true);
});

test("las ordenes de 'ultimo gana' se compactan en la cola", () => {
  const { llamadas, modulo } = mapaFalso();
  puente.pintarEventos([1]);
  puente.encuadrar("region");
  puente.pintarEventos([1, 2]);
  puente.encuadrar("venezuela");
  puente.pintarEventos([1, 2, 3]);
  assert.equal(puente.pendientes(), 2);
  puente.conectarMapa(modulo);
  assert.deepEqual(llamadas, [["encuadrar", "venezuela"], ["pintarEventos", [1, 2, 3]]]);
});

test("seleccionar no se compacta: cada eleccion cuenta", () => {
  puente.seleccionar("a");
  puente.seleccionar("b");
  assert.equal(puente.pendientes(), 2);
});

test("conectado, las ordenes se ejecutan al momento", () => {
  const { llamadas, modulo } = mapaFalso();
  puente.conectarMapa(modulo);
  puente.redimensionar();
  assert.deepEqual(llamadas, [["redimensionar"]]);
  assert.equal(puente.pendientes(), 0);
});
