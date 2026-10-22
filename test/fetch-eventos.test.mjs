/**
 * Mapeo FDSN -> contrato de datos (scripts/fetch-eventos.mjs), sin red:
 * `fetch` se inyecta con respuestas simuladas.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FUENTE,
  LIMITE_FDSN,
  aplicarContrato,
  comprobarLimite,
  confianzaDesdeStatus,
  construirUrl,
  descargarEventos,
  etiquetarColeccion,
  resumirCambios,
  serializar,
} from "../scripts/fetch-eventos.mjs";
import { validarColeccion } from "../scripts/validate-eventos.mjs";
import { leerTerritorio } from "../scripts/territorio.mjs";
import { eventoUsgs } from "./fixtures.mjs";

const AHORA = new Date("2026-10-20T06:17:42.123Z");

// --- Consulta ---------------------------------------------------------------

test("la URL de /query lleva los parametros de la plantilla de FASE-1-DATOS.md", () => {
  const url = construirUrl("query", AHORA);
  assert.equal(url.origin + url.pathname, "https://earthquake.usgs.gov/fdsnws/event/1/query");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    format: "geojson",
    starttime: "1990-01-01",
    endtime: "2026-10-20T06:17:42",
    minmagnitude: "3",
    minlatitude: "0.5",
    maxlatitude: "13",
    minlongitude: "-73.5",
    maxlongitude: "-59.5",
    orderby: "time",
    limit: String(LIMITE_FDSN),
  });
});

test("la URL de /count usa el mismo filtro, sin orden ni limite", () => {
  const url = construirUrl("count", AHORA);
  assert.match(url.pathname, /\/count$/);
  assert.equal(url.searchParams.get("orderby"), null);
  assert.equal(url.searchParams.get("limit"), null);
  assert.equal(url.searchParams.get("minlatitude"), "0.5");
});

// --- Contrato ---------------------------------------------------------------

test("status reviewed -> confianza alta; automatic u otro -> media", () => {
  assert.equal(confianzaDesdeStatus("reviewed"), "alta");
  assert.equal(confianzaDesdeStatus("automatic"), "media");
  assert.equal(confianzaDesdeStatus(undefined), "media");
});

test("aplicarContrato anade fuente, confianza y ultima_verificacion", () => {
  const f = aplicarContrato(eventoUsgs(), "2026-10-20");
  assert.equal(f.properties.fuente, FUENTE);
  assert.equal(f.properties.fuente, "USGS FDSN Event Web Service");
  assert.equal(f.properties.confianza, "alta");
  assert.equal(f.properties.ultima_verificacion, "2026-10-20");
});

test("aplicarContrato no descarta ni altera ningun campo original del USGS", () => {
  const original = eventoUsgs();
  const f = aplicarContrato(original, "2026-10-20");
  for (const [clave, valor] of Object.entries(original.properties)) {
    assert.deepEqual(f.properties[clave], valor, clave);
  }
  assert.equal(f.id, original.id);
  assert.deepEqual(f.geometry, original.geometry);
  assert.equal(f.type, "Feature");
});

test("aplicarContrato no muta el evento de entrada", () => {
  const original = eventoUsgs();
  aplicarContrato(original, "2026-10-20");
  assert.deepEqual(original, eventoUsgs());
});

test("un evento automatico queda con confianza media", () => {
  const usgs = eventoUsgs();
  usgs.properties.status = "automatic";
  assert.equal(aplicarContrato(usgs, "2026-10-20").properties.confianza, "media");
});

// --- Limite de 20 000 -------------------------------------------------------

test("comprobarLimite falla al llegar al limite o con 0 eventos, avisa cerca", () => {
  assert.equal(comprobarLimite(4358), null);
  assert.match(comprobarLimite(16000), /cerca del limite/);
  assert.throws(() => comprobarLimite(LIMITE_FDSN), /truncado/);
  assert.throws(() => comprobarLimite(0), /0 eventos/);
  assert.throws(() => comprobarLimite(undefined), /no valido/);
});

// --- Descarga completa con fetch simulado ----------------------------------

function fetchSimulado(respuestas) {
  const llamadas = [];
  const impl = async (url) => {
    llamadas.push(String(url));
    const metodo = new URL(url).pathname.split("/").pop();
    const r = respuestas[metodo];
    if (typeof r === "number") return { ok: false, status: r, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => structuredClone(r) };
  };
  return { impl, llamadas };
}

const respuestaQuery = (features) => ({
  type: "FeatureCollection",
  metadata: { generated: 1, url: "https://earthquake.usgs.gov/fdsnws/event/1/query?simulada", count: features.length },
  bbox: [-73.0065, 6.7888, 162.209, -73.0065, 6.7888, 162.209],
  features,
});

test("descargarEventos devuelve una coleccion que pasa el validador", async () => {
  const { impl, llamadas } = fetchSimulado({ count: { count: 1, maxAllowed: 20000 }, query: respuestaQuery([eventoUsgs()]) });
  const c = await descargarEventos({ fetchImpl: impl, ahora: AHORA, log: () => {} });
  assert.equal(llamadas.length, 2);
  assert.match(llamadas[0], /\/count\?/);
  assert.match(llamadas[1], /\/query\?/);
  assert.equal(c.metadata.ultima_verificacion, "2026-10-20");
  assert.equal(c.metadata.fuente, FUENTE);
  assert.equal(c.features[0].properties.confianza, "alta");
  assert.equal(c.features[0].properties.en_venezuela, false, "Cepita esta en Colombia");
  assert.equal(c.features[0].properties.zona_disputada, false);
  assert.match(c.metadata.etiquetas, /geoBoundaries/);
  const territorio = await leerTerritorio();
  assert.deepEqual(validarColeccion(c, { ahora: AHORA.getTime(), territorio }).errores, []);
});

test("etiquetarColeccion solo anade las etiquetas: el resto queda identico", async () => {
  const territorio = await leerTerritorio();
  const caracas = eventoUsgs();
  caracas.id = "caracas-prueba";
  caracas.geometry.coordinates = [-66.9036, 10.4806, 5];
  const entrada = { type: "FeatureCollection", metadata: { url: "x" }, features: [eventoUsgs(), caracas] };
  const copia = structuredClone(entrada);
  const salida = etiquetarColeccion(entrada, territorio);
  assert.deepEqual(entrada, copia, "no muta la entrada");
  assert.deepEqual(salida.features.map((f) => f.properties.en_venezuela), [false, true]);
  for (const [i, f] of salida.features.entries()) {
    const { en_venezuela, zona_disputada, frente_costa, pais_vecino, ...resto } = f.properties;
    assert.deepEqual(resto, copia.features[i].properties);
    assert.deepEqual(f.geometry, copia.features[i].geometry);
  }
  assert.equal(salida.metadata.url, "x");
  assert.deepEqual(etiquetarColeccion(salida, territorio), salida, "idempotente");
});

test("descargarEventos no sigue si /count alcanza el limite (no trunca en silencio)", async () => {
  const { impl, llamadas } = fetchSimulado({ count: { count: LIMITE_FDSN }, query: respuestaQuery([]) });
  await assert.rejects(descargarEventos({ fetchImpl: impl, ahora: AHORA, log: () => {} }), /truncado/);
  assert.equal(llamadas.length, 1, "no debe descargar /query");
});

test("descargarEventos reintenta y al final propaga un error HTTP", async () => {
  const { impl, llamadas } = fetchSimulado({ count: 503 });
  await assert.rejects(descargarEventos({ fetchImpl: impl, ahora: AHORA, esperaMs: 0, log: () => {} }), /HTTP 503/);
  assert.equal(llamadas.length, 3);
});

test("descargarEventos rechaza una respuesta que no es FeatureCollection", async () => {
  const { impl } = fetchSimulado({ count: { count: 1 }, query: { type: "Feature" } });
  await assert.rejects(descargarEventos({ fetchImpl: impl, ahora: AHORA, log: () => {} }), /no es una FeatureCollection/);
});

test("descargarEventos informa si /count y /query no coinciden", async () => {
  const avisos = [];
  const { impl } = fetchSimulado({ count: { count: 2 }, query: respuestaQuery([eventoUsgs()]) });
  await descargarEventos({ fetchImpl: impl, ahora: AHORA, log: (m) => avisos.push(m) });
  assert.match(avisos.join(), /\/count dijo 2 y \/query trajo 1/);
});

// --- Escritura y resumen ----------------------------------------------------

test("serializar produce JSON valido, identico al objeto, un evento por linea", () => {
  const otro = eventoUsgs();
  otro.id = "otro";
  const c = { type: "FeatureCollection", metadata: { a: 1 }, features: [aplicarContrato(eventoUsgs(), "2026-10-20"), otro] };
  const texto = serializar(c);
  assert.deepEqual(JSON.parse(texto), c);
  const lineasDeEventos = texto.split("\n").filter((l) => l.trimStart().startsWith('{"type":"Feature"'));
  assert.equal(lineasDeEventos.length, 2);
  assert.ok(texto.endsWith("\n"));
});

test("resumirCambios cuenta nuevos, revisados por el USGS y retirados", () => {
  const a = eventoUsgs();
  const b = { ...eventoUsgs(), id: "b" };
  const anterior = { features: [a, b] };
  const aRevisado = { ...a, properties: { ...a.properties, updated: a.properties.updated + 1 } };
  const c = { ...eventoUsgs(), id: "c" };
  assert.deepEqual(resumirCambios(anterior, { features: [aRevisado, c] }), { nuevos: 1, actualizados: 1, retirados: 1 });
  assert.deepEqual(resumirCambios(null, { features: [a] }), { nuevos: 1, actualizados: 0, retirados: 0 });
});

// --- Re-etiquetado sin red (scripts/etiquetar-eventos.mjs) ------------------

test("el CLI de re-etiquetado reescribe el archivo con las etiquetas y valida", async () => {
  const { mkdtemp, readFile, rm, writeFile } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { spawnSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const script = fileURLToPath(new URL("../scripts/etiquetar-eventos.mjs", import.meta.url));
  const dir = await mkdtemp(join(tmpdir(), "sismos-etiquetar-"));
  try {
    const caracas = aplicarContrato(eventoUsgs(), "2026-10-20");
    caracas.id = "caracas-prueba";
    caracas.geometry.coordinates = [-66.9036, 10.4806, 5];
    const entrada = { type: "FeatureCollection", metadata: {}, features: [aplicarContrato(eventoUsgs(), "2026-10-20"), caracas] };
    const ruta = join(dir, "eventos.json");
    await writeFile(ruta, serializar(entrada));
    const r = spawnSync(process.execPath, [script, ruta], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /1 en Venezuela, 0 frente a la costa, 0 en la zona en disputa, 1 en paises vecinos, 0 en mar abierto/);
    const salida = JSON.parse(await readFile(ruta, "utf8"));
    assert.deepEqual(salida.features.map((f) => f.properties.en_venezuela), [false, true]);
    assert.equal(salida.features[0].properties.ultima_verificacion, "2026-10-20", "no cambia la fecha de verificacion");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
