/**
 * T07 (RF-3, RF-4, RF-5, RF-9, RF-13, RF-14, RF-23, RF-24, RF-29, RF-30):
 * orquestador `analizar`, serializacion y CLI. Solo catalogos sinteticos,
 * B = 200 y control con 3 semillas (RNF-5): nunca el catalogo real.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analizar, ejecutar } from "../scripts/analizar-patrones.mjs";
import { serializar } from "../scripts/ml/serializar.mjs";
import { crearAzar } from "../scripts/ml/azar.mjs";
import { catalogoAgrupaciones, catalogoGR, CENTROS_NUBES } from "./sintetico.mjs";

const DIA_MS = 86400000;
const T0 = Date.UTC(2000, 0, 1);
const OPC = {
  B: 200,
  semillasControl: 3,
  agrupacion: {
    superficial: { epsKm: 15, minPts: 10 },
    intermedio: { epsKm: 15, minPts: 10 },
    profundo: { epsKm: 15, minPts: 10 },
  },
};
const KM_GRADO = 111.195;

function feature({ id, lat, lon, prof = 10, mag, tiempo, magType = "mb", place = "10 km N of Lugar Uno, Venezuela", venezuela = true }) {
  return {
    type: "Feature",
    properties: {
      mag, place, time: tiempo, magType, status: "reviewed", fuente: "USGS FDSN Event Web Service",
      confianza: "alta", ultima_verificacion: "2026-11-11",
      en_venezuela: venezuela, zona_disputada: false, frente_costa: false, pais_vecino: null,
    },
    geometry: { type: "Point", coordinates: [lon, lat, prof] },
    id,
  };
}

function coleccion(features) {
  return { type: "FeatureCollection", metadata: { ultima_verificacion: "2026-11-11" }, features };
}

/** 3 nubes + ruido; tiempos espaciados 400 dias (sin secuencias) y magnitudes G-R. */
function base({ prof = 10 } = {}) {
  const pts = catalogoAgrupaciones(1);
  const mags = catalogoGR(7, { n: pts.length, mmin: 3.0 });
  return pts.map((p, i) =>
    feature({ id: p.id, lat: p.lat, lon: p.lon, prof, mag: mags[i].mag, tiempo: T0 + i * 400 * DIA_MS }),
  );
}

const total = (p, campo) => p.zonas.reduce((s, z) => s + z[campo], 0);

test("determinismo: dos corridas -> bytes identicos (RF-5)", () => {
  const c = coleccion(base());
  const a = Buffer.from(serializar(analizar(c, OPC)));
  const b = Buffer.from(serializar(analizar(c, OPC)));
  assert.ok(a.equals(b));
  // el orden de entrada tampoco importa
  const barajado = coleccion([...c.features].reverse());
  assert.ok(a.equals(Buffer.from(serializar(analizar(barajado, OPC)))));
});

test("zonas de oeste a este, ids por clase y sumas coherentes (RF-3, RF-23)", () => {
  const p = analizar(coleccion(base()), OPC);
  assert.equal(p.zonas.length, 3);
  const lons = p.zonas.map((z) => z.centro.lon);
  assert.deepEqual(lons, [...lons].sort((x, y) => x - y));
  assert.ok(lons[0] < -72 && lons[2] > -65);
  assert.deepEqual(p.zonas.map((z) => z.id), ["S01", "S02", "S03"]);
  for (const z of p.zonas) {
    assert.equal(z.n_fondo + z.n_secuencia + z.n_no_aplica, z.n_eventos);
    assert.equal(z.clase_profundidad, "superficial");
  }
  const r = p.metadata.resumen;
  assert.equal(p.metadata.catalogo_n - p.metadata.excluidos, r.fondo + r.secuencia + r.no_aplica);
  assert.equal(total(p, "n_eventos") + r.sin_zona, r.fondo + r.secuencia + r.no_aplica);
});

test("campos de RF-14 y metadata de RF-13 con sus valores literales", () => {
  const p = analizar(coleccion(base()), OPC);
  for (const z of p.zonas) {
    assert.equal(z.fuente, "Cálculo de sismos-ve sobre USGS FDSN Event Web Service");
    assert.equal(z.confianza, "media");
    assert.equal(z.ultima_verificacion, "2026-11-11");
  }
  const m = p.metadata;
  assert.equal(m.filtro_confianza, "ninguno");
  assert.equal(m.n_automatic, 0);
  assert.equal(m.excluidos, 0);
  assert.equal(m.catalogo_n, 750);
  assert.match(m.catalogo_sha256, /^[0-9a-f]{64}$/);
  assert.equal(m.ultima_verificacion, "2026-11-11");
  assert.equal(m.metodo.version, "1");
  assert.deepEqual(m.control_aleatorio, { semillas_por_clase: 3, grupos_max: 0 });
  assert.deepEqual(Object.keys(m.resumen), ["fondo", "secuencia", "no_aplica", "sin_zona"]);
  assert.ok(Number.isInteger(m.semilla_base));
  assert.ok(m.parametros.agrupacion.superficial.epsKm > 0);
});

test("eventos no analizables se excluyen y se cuentan; status distinto de reviewed -> n_automatic (RF-13, RF-30)", () => {
  const fs = base();
  fs.push(feature({ id: "sinmag", lat: 9, lon: -68, mag: null, tiempo: T0 }));
  const auto = feature({ id: "auto", lat: 9.5, lon: -68, mag: 4, tiempo: T0 + 5 * DIA_MS });
  auto.properties.status = "automatic";
  fs.push(auto);
  const p = analizar(coleccion(fs), OPC);
  assert.equal(p.metadata.excluidos, 1);
  assert.equal(p.metadata.n_automatic, 1);
  assert.equal(p.metadata.catalogo_n, 752);
});

test("secuencia de un principal fuera de toda zona -> sin_zona; la de un principal en zona suma a esa zona (RF-24)", () => {
  const sinExtra = analizar(coleccion(base()), OPC);
  const fs = base();
  const tFin = T0 + 1000 * 400 * DIA_MS;
  // principal aislado (3,0; -61,0) M 6,0 con 20 replicas a <= 8 km, M 3,5
  fs.push(feature({ id: "z-aislado", lat: 3.0, lon: -61.0, mag: 6.0, tiempo: tFin }));
  const azar = crearAzar(5);
  for (let i = 0; i < 20; i++) {
    fs.push(feature({
      id: `z-ra${i}`, lat: 3.0 + (azar.siguiente() - 0.5) * 0.1, lon: -61.0 + (azar.siguiente() - 0.5) * 0.1,
      mag: 3.5, tiempo: tFin + (1 + i) * DIA_MS,
    }));
  }
  const conAislado = analizar(coleccion(fs), OPC);
  assert.equal(total(conAislado, "n_secuencia"), total(sinExtra, "n_secuencia"));
  assert.equal(conAislado.metadata.resumen.secuencia, sinExtra.metadata.resumen.secuencia + 20);
  assert.equal(conAislado.metadata.resumen.sin_zona, sinExtra.metadata.resumen.sin_zona + 21);

  // principal M 6,0 en el centro de la nube 1 (en zona) con 20 replicas
  const c = CENTROS_NUBES[1];
  fs.push(feature({ id: "z-central", lat: c.lat, lon: c.lon, mag: 6.0, tiempo: tFin + 2000 * DIA_MS }));
  for (let i = 0; i < 20; i++) {
    fs.push(feature({
      id: `z-rb${i}`, lat: c.lat + (azar.siguiente() - 0.5) * 0.1, lon: c.lon + (azar.siguiente() - 0.5) * 0.1,
      mag: 3.5, tiempo: tFin + 2000 * DIA_MS + (1 + i) * DIA_MS,
    }));
  }
  const conZona = analizar(coleccion(fs), OPC);
  assert.equal(total(conZona, "n_secuencia"), total(sinExtra, "n_secuencia") + 20);
  const zona = conZona.zonas.find((z) => Math.abs(z.centro.lon - c.lon) < 1);
  assert.equal(zona.n_secuencia, 20);
  assert.equal(zona.n_eventos, sinExtra.zonas.find((z) => Math.abs(z.centro.lon - c.lon) < 1).n_eventos + 21);
});

test("zona a menos de epsKm del borde de la region -> en_borde (RF-29)", () => {
  const fs = base();
  const azar = crearAzar(11);
  for (let i = 0; i < 60; i++) {
    // nube compacta pegada al borde sur (lat 0,5): centro en lat 0,55
    fs.push(feature({
      id: `b${i}`, lat: 0.55 + (azar.siguiente() - 0.5) * 0.06, lon: -66.0 + (azar.siguiente() - 0.5) * 0.06,
      mag: 3.5, tiempo: T0 + (900 + i) * 400 * DIA_MS,
    }));
  }
  const p = analizar(coleccion(fs), OPC);
  const borde = p.zonas.filter((z) => z.en_borde);
  assert.equal(borde.length, 1);
  assert.ok(borde[0].centro.lat < 1);
  assert.equal(p.zonas.filter((z) => !z.en_borde).length, 3);
});

test("clase intermedia: zona con todos los eventos 'no aplica' (RF-6, RF-7)", () => {
  const p = analizar(coleccion(base({ prof: 150 })), OPC);
  assert.ok(p.zonas.length >= 3);
  for (const z of p.zonas) {
    assert.equal(z.clase_profundidad, "intermedio");
    assert.match(z.id, /^I\d\d$/);
    assert.equal(z.n_no_aplica, z.n_eventos);
    assert.equal(z.n_fondo, 0);
  }
});

test("gutenberg_richter por zona: publicado con IC, o motivo sin cifra de b", () => {
  const p = analizar(coleccion(base()), OPC);
  for (const z of p.zonas) {
    const g = z.gutenberg_richter;
    if (g.publicado) {
      assert.equal(g.motivo, null);
      assert.ok(g.b_ic95[0] <= g.b && g.b <= g.b_ic95[1]);
      assert.ok(g.mc_ic95 && Number.isFinite(g.mc));
      assert.equal(g.familia, "mb");
    } else {
      assert.ok(["muestra_insuficiente", "intervalo_inconsistente"].includes(g.motivo));
      assert.equal(g.b, null);
      assert.equal(g.b_ic95, null);
    }
  }
});

test("parametros permisivos -> el control aleatorio falla y NO hay archivo (RF-9)", () => {
  const dir = mkdtempSync(join(tmpdir(), "patrones-"));
  try {
    const entrada = join(dir, "eventos.json");
    const salida = join(dir, "patrones.json");
    writeFileSync(entrada, JSON.stringify(coleccion(base())));
    const permisivos = { ...OPC, agrupacion: { ...OPC.agrupacion, superficial: { epsKm: 400, minPts: 3 } } };
    assert.throws(() => analizar(coleccion(base()), permisivos), /RF-9/);
    assert.throws(() => ejecutar({ entrada, salida, opciones: permisivos }), /RF-9/);
    assert.equal(existsSync(salida), false);
    assert.equal(existsSync(`${salida}.tmp`), false);
    // con parametros sanos el CLI escribe y el contenido coincide con serializar(analizar)
    ejecutar({ entrada, salida, opciones: OPC });
    assert.equal(readFileSync(salida, "utf8"), serializar(analizar(coleccion(base()), OPC)));
    assert.equal(existsSync(`${salida}.tmp`), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("sin fetch ni Math.random en scripts/ml/ ni en el CLI (RF-4, RNF-6)", () => {
  const archivos = [
    new URL("../scripts/analizar-patrones.mjs", import.meta.url),
    ...readdirSync(new URL("../scripts/ml/", import.meta.url)).map((f) => new URL(`../scripts/ml/${f}`, import.meta.url)),
  ];
  for (const url of archivos) {
    const texto = readFileSync(url, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    assert.doesNotMatch(texto, /\bfetch\s*\(|https?:\/\/|XMLHttpRequest|node:https?|Math\.random/, url.pathname);
  }
});

test("RF-26: analisis o validacion que fallan dejan intacto el archivo anterior y sin .tmp", () => {
  const dir = mkdtempSync(join(tmpdir(), "patrones-"));
  try {
    const entrada = join(dir, "eventos.json");
    const salida = join(dir, "patrones.json");
    writeFileSync(entrada, JSON.stringify(coleccion(base())));
    ejecutar({ entrada, salida, opciones: OPC });
    const antes = createHash("sha256").update(readFileSync(salida)).digest("hex");
    // 1) el resultado no valida
    assert.throws(
      () => ejecutar({ entrada, salida, opciones: { ...OPC, semillaBase: 99 }, validar: () => ({ errores: ["roto"], avisos: [] }) }),
      /RF-26/,
    );
    // 2) el analisis falla (control aleatorio)
    const permisivos = { ...OPC, agrupacion: { ...OPC.agrupacion, superficial: { epsKm: 400, minPts: 3 } } };
    assert.throws(() => ejecutar({ entrada, salida, opciones: permisivos }), /RF-9/);
    assert.equal(createHash("sha256").update(readFileSync(salida)).digest("hex"), antes);
    assert.equal(existsSync(`${salida}.tmp`), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
