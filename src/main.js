/**
 * main.js — Punto de entrada. Solo orquesta (ADR-007):
 *   1. pinta el shell y pide los datos (sin esperar a Leaflet);
 *   2. tras el primer pintado trae map.js con import() dinamico;
 *   3. lo conecta al puente, que reproduce las ordenes en espera.
 */

import "./style.css";
import { leerEventos, leerLimites } from "./api.js";
import { normalizarColeccion } from "./data.js";
import { conectarMapa, pintarBase } from "./puenteMapa.js";
import { atribucionMapa, errorMapa, fijarDatos, marcarMapa, montarUI, mostrarError, registrarAtribucion } from "./ui.js";

montarUI();

leerEventos()
  .then((json) => fijarDatos(normalizarColeccion(json)))
  .catch((e) => {
    console.error(e);
    mostrarError("datos.error");
  });

leerLimites()
  .then((base) => pintarBase(base))
  .catch((e) => console.error(e)); // sin limites el mapa sigue mostrando los eventos

// Doble requestAnimationFrame: el navegador pinta el shell antes de pedir Leaflet.
requestAnimationFrame(() =>
  requestAnimationFrame(async () => {
    try {
      const mapa = await import("./map.js");
      const atribucion = atribucionMapa();
      mapa.iniciar(document.getElementById("mapa"), { atribucion });
      registrarAtribucion(atribucion);
      conectarMapa(mapa);
      marcarMapa(true);
    } catch (e) {
      console.error(e);
      errorMapa(); // la tabla sigue funcionando con los datos ya cargados
    }
  })
);
