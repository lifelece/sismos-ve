/**
 * scripts/territorio.mjs etiqueta cada evento con `en_venezuela` y
 * `zona_disputada` (gate de la Fase 1, decision de Luis del 2026-10-21:
 * "Rectangulo + etiqueta"). Dos bloques:
 *
 *   1. Geometria sintetica: ray casting con huecos, MultiPolygon, anidamiento
 *      de anillos y el caso clasico del rayo que pasa por un vertice.
 *   2. Casos borde con los poligonos REALES de data/ (copiados de
 *      orinoco-digital): costa, isla, Guayana Esequiba, Colombia, Trinidad,
 *      Brasil. Los puntos son lugares conocidos o eventos reales del USGS,
 *      lejos (>= 3 km) de la linea simplificada para no depender de los
 *      ~440 m de tolerancia de Douglas-Peucker.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  anillosDePais,
  distanciaKm,
  cargarTerritorio,
  etiquetarTerritorio,
  leerTerritorio,
  poligonosDesdeAnillos,
  puntoEnAnillo,
  puntoEnGeometria,
  puntoEnPoligono,
} from "../scripts/territorio.mjs";
import { eventoUsgs } from "./fixtures.mjs";

// --- 1. Geometria sintetica ---------------------------------------------------

const cuadrado = (x0, y0, x1, y1) => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
  [x0, y0],
];

test("puntoEnAnillo: dentro y fuera de un cuadrado", () => {
  const a = cuadrado(0, 0, 10, 10);
  assert.equal(puntoEnAnillo([5, 5], a), true);
  assert.equal(puntoEnAnillo([15, 5], a), false);
  assert.equal(puntoEnAnillo([-1, 5], a), false);
  assert.equal(puntoEnAnillo([5, 11], a), false);
});

test("puntoEnAnillo: no depende del sentido de giro del anillo", () => {
  const horario = cuadrado(0, 0, 10, 10).reverse();
  assert.equal(puntoEnAnillo([5, 5], horario), true);
  assert.equal(puntoEnAnillo([15, 5], horario), false);
});

test("puntoEnAnillo: el rayo que pasa justo por un vertice no cuenta doble", () => {
  // Rombo con vertices a la altura y = 5: un rayo horizontal desde (2, 5)
  // toca el vertice (10, 5). Una implementacion ingenua lo cuenta dos veces.
  const rombo = [
    [0, 5],
    [5, 0],
    [10, 5],
    [5, 10],
    [0, 5],
  ];
  assert.equal(puntoEnAnillo([2, 5], rombo), true);
  assert.equal(puntoEnAnillo([-2, 5], rombo), false);
  assert.equal(puntoEnAnillo([12, 5], rombo), false);
});

test("puntoEnAnillo: poligono concavo (la muesca de una U queda fuera)", () => {
  const u = [
    [0, 0],
    [10, 0],
    [10, 10],
    [7, 10],
    [7, 3],
    [3, 3],
    [3, 10],
    [0, 10],
    [0, 0],
  ];
  assert.equal(puntoEnAnillo([5, 6], u), false); // en la muesca
  assert.equal(puntoEnAnillo([1, 6], u), true); // brazo izquierdo
  assert.equal(puntoEnAnillo([5, 1], u), true); // base
});

test("puntoEnPoligono: un hueco excluye su interior", () => {
  const poligono = [cuadrado(0, 0, 10, 10), cuadrado(2, 2, 8, 8)];
  assert.equal(puntoEnPoligono([5, 5], poligono), false);
  assert.equal(puntoEnPoligono([1, 1], poligono), true);
  assert.equal(puntoEnPoligono([11, 1], poligono), false);
});

test("puntoEnGeometria: Polygon y MultiPolygon", () => {
  const poly = { type: "Polygon", coordinates: [cuadrado(0, 0, 10, 10)] };
  const multi = {
    type: "MultiPolygon",
    coordinates: [[cuadrado(0, 0, 10, 10)], [cuadrado(20, 0, 30, 10), cuadrado(24, 4, 26, 6)]],
  };
  assert.equal(puntoEnGeometria([5, 5], poly), true);
  assert.equal(puntoEnGeometria([25, 5], poly), false);
  assert.equal(puntoEnGeometria([5, 5], multi), true);
  assert.equal(puntoEnGeometria([22, 5], multi), true);
  assert.equal(puntoEnGeometria([25, 5], multi), false, "hueco del segundo poligono");
  assert.equal(puntoEnGeometria([15, 5], multi), false, "entre los dos poligonos");
  assert.throws(() => puntoEnGeometria([0, 0], { type: "Point", coordinates: [0, 0] }), /Polygon/);
});

test("poligonosDesdeAnillos: anidamiento par = exterior, impar = hueco", () => {
  // Isla (profundidad 2) dentro de un lago (1) dentro de un continente (0),
  // mas una isla suelta (0). Se pasan desordenados.
  const continente = cuadrado(0, 0, 100, 100);
  const lago = cuadrado(20, 20, 80, 80);
  const islaEnLago = cuadrado(40, 40, 60, 60);
  const islaSuelta = cuadrado(200, 0, 210, 10);
  const multi = {
    type: "MultiPolygon",
    coordinates: poligonosDesdeAnillos([islaEnLago, islaSuelta, lago, continente]),
  };
  assert.equal(multi.coordinates.length, 3);
  assert.equal(puntoEnGeometria([10, 10], multi), true, "continente");
  assert.equal(puntoEnGeometria([30, 30], multi), false, "lago");
  assert.equal(puntoEnGeometria([50, 50], multi), true, "isla en el lago");
  assert.equal(puntoEnGeometria([205, 5], multi), true, "isla suelta");
  assert.equal(puntoEnGeometria([150, 5], multi), false, "mar");
});

test("poligonosDesdeAnillos rechaza un anillo sin cerrar o con menos de 4 puntos", () => {
  assert.throws(() => poligonosDesdeAnillos([[[0, 0], [1, 0], [1, 1], [0, 1]]]), /cerrad/);
  assert.throws(() => poligonosDesdeAnillos([[[0, 0], [1, 0], [0, 0]]]), /4 puntos/);
});

test("anillosDePais toma solo los LineString del nivel pedido", () => {
  const coleccion = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { nivel: "pais" }, geometry: { type: "LineString", coordinates: cuadrado(0, 0, 1, 1) } },
      { type: "Feature", properties: { nivel: "estado" }, geometry: { type: "LineString", coordinates: cuadrado(0, 0, 2, 2) } },
    ],
  };
  assert.equal(anillosDePais(coleccion, "pais").length, 1);
  assert.throws(() => anillosDePais(coleccion, "disputa"), /ningun anillo/);
});

test("etiquetarTerritorio anade las dos etiquetas sin mutar ni descartar campos", () => {
  const territorio = cargarTerritorio({
    limites: {
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: { nivel: "pais" }, geometry: { type: "LineString", coordinates: cuadrado(-80, 0, -60, 20) } }],
    },
    disputa: {
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: { nivel: "disputa" }, geometry: { type: "LineString", coordinates: cuadrado(-59, 0, -50, 20) } }],
    },
  });
  const original = eventoUsgs(); // Cepita: [-73.0065, 6.7888], sin etiquetas
  const copia = structuredClone(original);
  const f = etiquetarTerritorio(original, territorio);
  assert.deepEqual(original, copia, "no muta la entrada");
  assert.equal(f.properties.en_venezuela, true);
  assert.equal(f.properties.zona_disputada, false);
  for (const [k, v] of Object.entries(copia.properties)) assert.deepEqual(f.properties[k], v, k);
  assert.deepEqual(f.geometry, copia.geometry);
});

// --- 2. Casos borde con los poligonos reales ---------------------------------

const real = await leerTerritorio();

/** [lon, lat] -> { en_venezuela, zona_disputada } con los poligonos reales. */
function etiquetas(lon, lat) {
  const f = { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [lon, lat, 10] } };
  const { en_venezuela, zona_disputada, frente_costa } = etiquetarTerritorio(f, real).properties;
  return { en_venezuela, zona_disputada, frente_costa };
}

const VEN = { en_venezuela: true, zona_disputada: false, frente_costa: false };
const FUERA = { en_venezuela: false, zona_disputada: false, frente_costa: false };
const DISPUTA = { en_venezuela: false, zona_disputada: true, frente_costa: false };
const COSTA = { en_venezuela: false, zona_disputada: false, frente_costa: true };

test("los poligonos reales se cargan: Venezuela con islas y una zona en disputa", () => {
  assert.equal(real.venezuela.type, "MultiPolygon");
  assert.ok(real.venezuela.coordinates.length >= 15, `poligonos: ${real.venezuela.coordinates.length}`);
  assert.equal(real.disputa.type, "MultiPolygon");
  assert.equal(real.disputa.coordinates.length, 1);
});

test("tierra firme: Caracas y San Cristobal", () => {
  assert.deepEqual(etiquetas(-66.9036, 10.4806), VEN, "Caracas");
  assert.deepEqual(etiquetas(-72.225, 7.7669), VEN, "San Cristobal");
});

test("costa: tierra a un lado, mar al otro (el mar cercano es frente_costa)", () => {
  assert.deepEqual(etiquetas(-66.9, 10.55), VEN, "cerro El Avila, sobre La Guaira");
  assert.deepEqual(etiquetas(-66.9, 10.66), COSTA, "mar Caribe frente a La Guaira");
  assert.deepEqual(etiquetas(-68.01, 10.44), VEN, "Puerto Cabello, tierra");
  assert.deepEqual(etiquetas(-68.01, 10.56), COSTA, "Puerto Cabello, mar");
});

test("franja costera de 50 km: dentro y fuera", () => {
  assert.deepEqual(etiquetas(-66.9, 10.95), COSTA, "~35 km al norte de La Guaira");
  assert.deepEqual(etiquetas(-66.9, 11.3), FUERA, "~70 km al norte de La Guaira");
  assert.deepEqual(etiquetas(-66.0, 12.9), FUERA, "~120 km al norte de La Orchila");
});

test("la frontera terrestre no es costa: Colombia y Brasil cerca de la linea quedan fuera", () => {
  assert.deepEqual(etiquetas(-72.5078, 7.8939), FUERA, "Cucuta, a ~5 km de la frontera");
  assert.deepEqual(etiquetas(-60.67, 2.82), FUERA, "Boa Vista");
});

test("limite conocido: tierra de otro pais cerca de la costa cuenta como frente_costa", () => {
  assert.deepEqual(etiquetas(-61.51, 10.66), COSTA, "Puerto Espana, Trinidad (~40 km de Paria)");
});

test("distanciaKm: medio grado al norte de una linea en lat 10 son ~55 km", () => {
  const d = distanciaKm([-66, 10.5], [[[-67, 10], [-65, 10]]]);
  assert.ok(Math.abs(d - 55.66) < 0.5, `${d}`);
});

test("lineasDeCosta: el arco de tierra firme pasa por el norte y las islas van enteras", () => {
  const lineas = real.costa.lineas;
  assert.equal(lineas.length, real.venezuela.coordinates.length);
  assert.ok(lineas[0].some(([, y]) => y > 12.19), "incluye Paraguana");
  assert.ok(!lineas[0].some(([, y]) => y < 7), "no incluye la frontera sur");
});

test("islas: Margarita y La Tortuga cuentan; el mar entre islas no", () => {
  assert.deepEqual(etiquetas(-63.86, 11.03), VEN, "La Asuncion, Margarita");
  assert.deepEqual(etiquetas(-65.32, 10.93), VEN, "La Tortuga");
  assert.deepEqual(etiquetas(-64.5, 10.75), COSTA, "mar entre Araya y Margarita");
});

test("Guayana Esequiba: zona_disputada true y en_venezuela false", () => {
  assert.deepEqual(etiquetas(-60.0, 6.5), DISPUTA, "interior de la zona en disputa");
  assert.deepEqual(etiquetas(-59.4, 5.5), DISPUTA, "sur de la zona en disputa");
  assert.deepEqual(etiquetas(-58.155, 6.8013), FUERA, "Georgetown, al este del rio Esequibo");
});

test("Colombia, Trinidad y Brasil quedan fuera", () => {
  assert.deepEqual(etiquetas(-73.0065, 6.7888), FUERA, "evento real us6000u25i, Cepita");
  assert.deepEqual(etiquetas(-72.5078, 7.8939), FUERA, "Cucuta");
  assert.deepEqual(etiquetas(-60.67, 2.82), FUERA, "Boa Vista, Brasil");
  assert.deepEqual(etiquetas(-61.11, 4.6), VEN, "Santa Elena de Uairen, al otro lado");
});

test("eventos reales del cotejo del gate", () => {
  assert.deepEqual(etiquetas(-68.5564, 10.3713), VEN, "us6000t7zc, 20 km E of San Felipe");
  assert.deepEqual(etiquetas(-63.486, 10.598), VEN, "usp00084m2, 26 km WSW of Carupano");
  assert.deepEqual(etiquetas(-62.9019, 10.7731), COSTA, "us1000gez7, 40 km ENE of Carupano (en el mar)");
  assert.deepEqual(etiquetas(-60.892, 11.112), FUERA, "usp000810j, Tobago");
});

test("en las franjas de solape de las dos fuentes gana zona_disputada", () => {
  // geoBoundaries (simplificado a ~440 m) y Natural Earth trazan la frontera
  // de facto con vertices distintos: quedan franjas finas que caen en los dos
  // poligonos. Ahi la etiqueta es la de zona en disputa, nunca las dos.
  assert.deepEqual(etiquetas(-61.15, 6.3), DISPUTA, "franja de solape real (muestreo a 0,01 grados)");
});

test("ningun punto real lleva a la vez en_venezuela y zona_disputada", () => {
  // Muestreo de toda la frontera de facto a 0,02 grados (~2 km).
  for (let lat = 4.0; lat <= 8.6; lat += 0.02) {
    for (let lon = -61.6; lon <= -59.6; lon += 0.02) {
      const e = etiquetas(lon, lat);
      assert.ok(Object.values(e).filter(Boolean).length <= 1, `doble etiqueta en ${lon.toFixed(2)}, ${lat.toFixed(2)}`);
    }
  }
});
