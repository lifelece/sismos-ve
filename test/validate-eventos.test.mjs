/**
 * scripts/validate-eventos.mjs es la ultima barrera antes de publicar
 * data/eventos.json. Se comprueba que deja pasar los datos reales y que TUMBA
 * cada tipo de dato malo: un validador que nunca falla no protege nada.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { esFechaISO, validarColeccion, validarEvento } from "../scripts/validate-eventos.mjs";
import { eventoValido } from "./fixtures.mjs";

const SCRIPT = fileURLToPath(new URL("../scripts/validate-eventos.mjs", import.meta.url));

function validarCli(ruta) {
  const args = ruta ? [SCRIPT, ruta] : [SCRIPT];
  return spawnSync(process.execPath, args, { encoding: "utf8" });
}

/** Ejecuta el CLI sobre un archivo temporal con el contenido dado. */
async function conArchivo(contenido, prueba) {
  const dir = await mkdtemp(join(tmpdir(), "sismos-validador-"));
  try {
    const ruta = join(dir, "eventos.json");
    await writeFile(ruta, contenido);
    await prueba(validarCli(ruta));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const coleccion = (features) => ({ type: "FeatureCollection", features });

/** Evento valido con properties y/o coordenadas cambiadas. */
function evento({ props = {}, coordenadas, geometria } = {}) {
  const base = eventoValido();
  base.properties = { ...base.properties, ...props };
  for (const [k, v] of Object.entries(props)) if (v === undefined) delete base.properties[k];
  if (coordenadas) base.geometry = { type: "Point", coordinates: coordenadas };
  if (geometria !== undefined) base.geometry = geometria;
  return base;
}

const erroresDe = (feature) => validarEvento(feature, { ahora: Date.parse("2026-10-20T12:00:00Z") });

// --- Casos validos ---------------------------------------------------------

test("el data/eventos.json versionado pasa el validador", () => {
  const r = validarCli();
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, / 0 errores\./);
});

test("un evento con contrato completo no tiene errores", () => {
  assert.deepEqual(erroresDe(evento()), []);
});

test("acepta los tres niveles de confianza de la escala", () => {
  for (const confianza of ["alta", "media", "baja"]) {
    assert.deepEqual(erroresDe(evento({ props: { confianza } })), [], confianza);
  }
});

test("un archivo valido sale con codigo 0", async () => {
  await conArchivo(JSON.stringify(coleccion([evento()])), (r) => {
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /1 eventos, 0 errores/);
  });
});

// --- Contrato de procedencia -----------------------------------------------

test("falta fuente o esta en blanco", () => {
  assert.match(erroresDe(evento({ props: { fuente: undefined } })).join(), /SIN FUENTE/);
  assert.match(erroresDe(evento({ props: { fuente: "   " } })).join(), /SIN FUENTE/);
});

test("falta confianza o no es del vocabulario", () => {
  assert.match(erroresDe(evento({ props: { confianza: undefined } })).join(), /sin confianza/);
  assert.match(erroresDe(evento({ props: { confianza: "reviewed" } })).join(), /confianza invalida/);
});

test("falta ultima_verificacion o no es una fecha ISO real", () => {
  assert.match(erroresDe(evento({ props: { ultima_verificacion: undefined } })).join(), /sin ultima_verificacion/);
  assert.match(erroresDe(evento({ props: { ultima_verificacion: "20/10/2026" } })).join(), /no es una fecha ISO/);
  assert.match(erroresDe(evento({ props: { ultima_verificacion: "2026-02-30" } })).join(), /no es una fecha ISO/);
});

test("esFechaISO solo acepta AAAA-MM-DD existentes", () => {
  assert.equal(esFechaISO("2024-02-29"), true);
  assert.equal(esFechaISO("2025-02-29"), false);
  assert.equal(esFechaISO("2026-10-20T00:00:00Z"), false);
  assert.equal(esFechaISO(20261020), false);
});

// --- Magnitud, hora y geometria --------------------------------------------

test("falta magnitud numerica", () => {
  assert.match(erroresDe(evento({ props: { mag: undefined } })).join(), /sin magnitud/);
  assert.match(erroresDe(evento({ props: { mag: "4.8" } })).join(), /sin magnitud/);
});

test("hora fuera de la ventana del catalogo (antes de 1990 o en el futuro)", () => {
  const antes = Date.parse("1989-12-31T23:59:59Z");
  const futuro = Date.parse("2026-10-25T00:00:00Z");
  assert.match(erroresDe(evento({ props: { time: antes } })).join(), /fuera de la ventana/);
  assert.match(erroresDe(evento({ props: { time: futuro } })).join(), /fuera de la ventana/);
  assert.match(erroresDe(evento({ props: { time: undefined } })).join(), /sin hora/);
});

test("la geometria debe ser un Point [lon, lat, profundidad_km]", () => {
  const poligono = { type: "Polygon", coordinates: [[[-66, 10], [-65, 10], [-65, 11], [-66, 10]]] };
  assert.match(erroresDe(evento({ geometria: poligono })).join(), /no es un Point/);
  assert.match(erroresDe(evento({ geometria: null })).join(), /no es un Point/);
  assert.match(erroresDe(evento({ coordenadas: [-66.9, 10.5] })).join(), /profundidad_km/);
  assert.match(erroresDe(evento({ coordenadas: [-66.9, 10.5, null] })).join(), /profundidad_km/);
});

test("coordenadas fuera de la region tumban el registro", () => {
  // Latitud al norte del rectangulo, longitud al oeste, y lat/lon cruzadas.
  assert.match(erroresDe(evento({ coordenadas: [-66.9, 13.5, 10] })).join(), /fuera de la region/);
  assert.match(erroresDe(evento({ coordenadas: [-74.2, 8, 10] })).join(), /fuera de la region/);
  assert.match(erroresDe(evento({ coordenadas: [10.5, -66.9, 10] })).join(), /fuera de la region/);
});

test("el borde del rectangulo cuenta como dentro", () => {
  assert.deepEqual(erroresDe(evento({ coordenadas: [-73.5, 0.5, 10] })), []);
  assert.deepEqual(erroresDe(evento({ coordenadas: [-59.5, 13.0, 10] })), []);
});

// --- Estructura del archivo -------------------------------------------------

test("la coleccion debe ser una FeatureCollection con features en array", () => {
  assert.match(validarColeccion({ type: "Feature" }).errores.join(), /FeatureCollection/);
  assert.match(validarColeccion({ type: "FeatureCollection", features: {} }).errores.join(), /no es un array/);
  assert.match(validarColeccion(null).errores.join(), /FeatureCollection/);
});

test("los errores de cada registro llevan el id del USGS", () => {
  const malo = evento({ props: { fuente: undefined } });
  const { total, errores } = validarColeccion(coleccion([evento(), malo]));
  assert.equal(total, 2);
  assert.equal(errores.length, 1);
  assert.match(errores[0], /^us6000u25i: SIN FUENTE/);
});

test("un registro sin contrato hace salir al CLI con codigo 1", async () => {
  await conArchivo(JSON.stringify(coleccion([evento({ props: { confianza: undefined } })])), (r) => {
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /NO deben publicarse/);
  });
});

test("un registro fuera de la region hace salir al CLI con codigo 1", async () => {
  await conArchivo(JSON.stringify(coleccion([evento({ coordenadas: [-80, 8, 10] })])), (r) => {
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /fuera de la region/);
  });
});

test("un JSON roto hace salir al CLI con codigo 1", async () => {
  await conArchivo('{"type": "FeatureCollection", "features": [', (r) => {
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /JSON invalido/);
  });
});

test("un archivo inexistente hace salir al CLI con codigo 1", () => {
  const r = validarCli(join(tmpdir(), "sismos-no-existe", "eventos.json"));
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /no se pudo leer/);
});
