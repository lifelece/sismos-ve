/**
 * i18n (CLAUDE.md regla 8): los dos diccionarios tienen las mismas claves, y
 * toda clave literal que la interfaz pide con t("...") existe.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { interpolar } from "../src/i18n/interpolar.js";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const es = JSON.parse(await readFile(join(SRC, "i18n", "es.json"), "utf8"));
const en = JSON.parse(await readFile(join(SRC, "i18n", "en.json"), "utf8"));

test("es.json y en.json tienen las mismas claves", () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
});

test("ningun texto vacio", () => {
  for (const [idioma, dic] of Object.entries({ es, en })) {
    for (const [k, v] of Object.entries(dic)) assert.ok(typeof v === "string" && v.trim(), `${idioma}.${k}`);
  }
});

test("toda clave literal usada en src/ existe en los diccionarios", async () => {
  const archivos = (await readdir(SRC, { recursive: true })).filter((f) => f.endsWith(".js"));
  const faltan = [];
  for (const archivo of archivos) {
    const texto = await readFile(join(SRC, archivo), "utf8");
    for (const [, clave] of texto.matchAll(/\bt\(\s*"([\w.]+)"/g)) {
      if (!(clave in es)) faltan.push(`${archivo}: ${clave}`);
    }
  }
  assert.deepEqual(faltan, []);
});

test("interpolar sustituye {marcadores} y deja visibles los que faltan", () => {
  assert.equal(interpolar("hace {n} dias", { n: 3 }), "hace 3 dias");
  assert.equal(interpolar("hace {n} dias", {}), "hace {n} dias");
  assert.equal(interpolar("sin params"), "sin params");
});
