/**
 * Gate de arquitectura (ADR-007, CLAUDE.md regla 3): se comprueba que pasa
 * con el src/ real y que TUMBA cada violacion en un src/ de prueba.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verificarModulos } from "../scripts/verificar-modulos.mjs";

test("el src/ real cumple las reglas de modulos", () => {
  assert.deepEqual(verificarModulos(), []);
});

/** Crea un src/ temporal con los archivos dados y devuelve sus errores. */
async function erroresCon(archivos) {
  const dir = await mkdtemp(join(tmpdir(), "sismos-modulos-"));
  try {
    const base = {
      "main.js": 'import "./ui.js";\nconst m = await import("./map.js");\n',
      "map.js": 'import L from "leaflet";\nimport "leaflet/dist/leaflet.css";\n',
      "api.js": 'export const leer = (u) => fetch(u);\n',
      "ui.js": 'import { seleccionar } from "./puenteMapa.js";\n',
    };
    for (const [nombre, contenido] of Object.entries({ ...base, ...archivos })) {
      const ruta = join(dir, nombre);
      await mkdir(join(ruta, ".."), { recursive: true });
      await writeFile(ruta, contenido);
    }
    return verificarModulos(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("un src/ correcto de prueba no da errores", async () => {
  assert.deepEqual(await erroresCon({}), []);
});

test("leaflet importado fuera de map.js", async () => {
  const e = await erroresCon({ "ui.js": 'import L from "leaflet";\n' });
  assert.match(e.join("\n"), /ui\.js.*leaflet/);
});

test("ui.js importando map.js (estatico o dinamico)", async () => {
  assert.match((await erroresCon({ "ui.js": 'import { x } from "./map.js";\n' })).join("\n"), /ui\.js.*map\.js/);
  assert.match((await erroresCon({ "ui.js": 'const m = await import("./map.js");\n' })).join("\n"), /ui\.js.*map\.js/);
});

test("main.js importando map.js de forma estatica", async () => {
  const e = await erroresCon({ "main.js": 'import { iniciar } from "./map.js";\n' });
  assert.match(e.join("\n"), /main\.js.*estatic/);
});

test("fetch fuera de api.js", async () => {
  const e = await erroresCon({ "ui.js": "fetch('/data/x.json');\n" });
  assert.match(e.join("\n"), /ui\.js.*fetch/);
});

test("cualquier referencia a una API de usgs.gov para pedir datos", async () => {
  const e = await erroresCon({ "api.js": 'export const leer = () => fetch("https://earthquake.usgs.gov/fdsnws/event/1/query");\n' });
  assert.match(e.join("\n"), /api\.js.*usgs/);
});
