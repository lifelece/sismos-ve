/**
 * Chip de frescura (ADR-005). `casos-chip-frescura.json` es copia sin cambios
 * de arsenal/specs/chip-frescura/casos.json (SHA-256 62a96149...): la spec
 * neutral exige que cada destino pase todos sus casos antes de su gate.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { frescura, textoRelativo } from "../src/frescura.js";
import { FRESCURA } from "../src/config.js";

const { escalas, casos } = JSON.parse(await readFile(new URL("./casos-chip-frescura.json", import.meta.url), "utf8"));

for (const caso of casos) {
  test(`spec chip-frescura: ${caso.id}`, () => {
    const r = frescura(caso.marca, caso.ahora, escalas[caso.escala]);
    if (caso.estado === null) {
      assert.equal(r, null);
      return;
    }
    assert.equal(r.estado, caso.estado);
    assert.equal(r.edad, caso.edad);
    assert.equal(r.unidad, escalas[caso.escala].unidad);
  });
}

test("se pasan los 13 casos de la spec", () => {
  assert.equal(casos.length, 13);
});

test("acepta Date y milisegundos ademas de texto ISO (R1)", () => {
  const escala = escalas.dias;
  const ahora = Date.parse("2026-04-02T00:00:00Z");
  assert.equal(frescura(new Date("2026-01-01T00:00:00Z"), ahora, escala).estado, "atencion");
  assert.equal(frescura(Date.parse("2026-01-01T00:00:00Z"), new Date(ahora), escala).edad, 91);
});

test("la escala de sismos-ve: dias, 2 y 7 (ADR-005)", () => {
  assert.deepEqual(FRESCURA, { unidad: "dia", umbrales: { atencion: 2, vencida: 7 } });
  // ultima_verificacion es una fecha sin hora: cuenta desde la medianoche UTC.
  const ahora = "2026-10-21T22:00:00Z";
  assert.equal(frescura("2026-10-21", ahora, FRESCURA).estado, "fresca");
  assert.equal(frescura("2026-10-19", ahora, FRESCURA).estado, "atencion");
  assert.equal(frescura("2026-10-14", ahora, FRESCURA).estado, "vencida");
});

// --- R6: texto relativo, por i18n -----------------------------------------

/** t() de prueba: devuelve la clave con sus parametros, para ver que se pidio. */
const tFalso = (clave, p) => (p ? `${clave}:${JSON.stringify(p)}` : clave);

test("texto relativo en dias: hoy, 1 dia, n dias", () => {
  const r = (edad) => textoRelativo({ estado: "fresca", edad, unidad: "dia" }, tFalso);
  assert.equal(r(0), "frescura.hoy");
  assert.equal(r(1), 'frescura.dia:{"n":1}');
  assert.equal(r(3), 'frescura.dias:{"n":3}');
});

test("texto relativo en minutos: menos de una hora y horas con minutos", () => {
  const r = (edad) => textoRelativo({ estado: "fresca", edad, unidad: "min" }, tFalso);
  assert.equal(r(12), 'frescura.min:{"n":12}');
  assert.equal(r(95), 'frescura.horasMin:{"h":1,"m":35}');
});

test("sin resultado no hay texto", () => {
  assert.equal(textoRelativo(null, tFalso), "");
});
