/**
 * map.js — UNICO modulo que importa Leaflet (scripts/verificar-modulos.mjs).
 *
 * Llega por `import()` dinamico desde main.js tras el primer pintado y se
 * conecta a la interfaz por puenteMapa.js (ADR-007). No sabe de idiomas ni de
 * filtros: recibe eventos ya filtrados y el HTML de cada ventana.
 *
 * Mapa base: los GeoJSON de data/ sobre el fondo del shell, sin teselas de
 * terceros (ADR-008). Circulos en canvas: miles de puntos sin crear un nodo
 * SVG por evento.
 */

import {
  canvas,
  circleMarker,
  geoJSON,
  latLngBounds,
  layerGroup,
  map as crearMapa,
  rectangle,
  tileLayer,
} from "leaflet/dist/leaflet-src.esm.js";
import "leaflet/dist/leaflet.css";
import { MAPA, REGION_CONSULTA, TESELAS, VENEZUELA_CAJA } from "./config.js";
import { claseProfundidad, radioPorMagnitud } from "./data.js";

/** Colores del mapa base: tokens del shell (ADR-004), nunca colores de datos. */
const BASE = {
  pais: { color: "#8b98a5", weight: 1.1, opacity: 0.9 }, // lo
  estado: { color: "#3a5266", weight: 0.6, opacity: 0.9 }, // tinta-baja: solo lineas
  disputa: { color: "#8b98a5", weight: 1.2, opacity: 0.9, dashArray: "6 5" },
  region: { color: "#3a5266", weight: 1, opacity: 1, dashArray: "2 6", fill: false },
};

const SHELL = "#0b0f14";

const aCaja = ({ latMin, latMax, lonMin, lonMax }) => latLngBounds([latMin, lonMin], [latMax, lonMax]);
const CAJAS = { venezuela: aCaja(VENEZUELA_CAJA), region: aCaja(REGION_CONSULTA) };

let mapa = null;
let renderizador = null;
let grupoEventos = null;
let rectanguloRegion = null;
/** @type {Map<string, {marcador: object, evento: object}>} */
const marcadores = new Map();
let htmlVentana = () => "";
let vistaActual = "venezuela";

/**
 * Crea el mapa en `contenedor`. Lo llama main.js una sola vez, antes de
 * conectarMapa().
 * @param {HTMLElement} contenedor
 * @param {{ atribucion: string }} opciones
 */
export function iniciar(contenedor, { atribucion }) {
  const limite = aCaja({
    latMin: REGION_CONSULTA.latMin - 4,
    latMax: REGION_CONSULTA.latMax + 4,
    lonMin: REGION_CONSULTA.lonMin - 4,
    lonMax: REGION_CONSULTA.lonMax + 4,
  });
  renderizador = canvas({ padding: 0.5 });
  mapa = crearMapa(contenedor, {
    renderer: renderizador,
    preferCanvas: true,
    minZoom: MAPA.zoomMin,
    maxZoom: MAPA.zoomMax,
    maxBounds: limite,
    maxBoundsViscosity: 0.8,
    zoomSnap: 0.25,
    zoomControl: true,
  });
  mapa.zoomControl.setPosition("topright");
  mapa.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
  mapa.attributionControl.addAttribution(atribucion);
  if (TESELAS) {
    tileLayer(TESELAS.url, { attribution: TESELAS.atribucion, maxZoom: TESELAS.zoomMax }).addTo(mapa);
  }
  grupoEventos = layerGroup().addTo(mapa);
  rectanguloRegion = rectangle(CAJAS.region, { ...BASE.region, interactive: false });
  mapa.fitBounds(CAJAS.venezuela, { padding: [8, 8] });
  return true;
}

/** Cambia el texto de atribucion (al cambiar de idioma). */
export function fijarAtribucion(anterior, nueva) {
  mapa.attributionControl.removeAttribution(anterior);
  mapa.attributionControl.addAttribution(nueva);
}

/** Frontera, estados y zona en disputa (no interactivos), bajo los eventos. */
export function pintarBase({ limites, disputa }) {
  const estilo = (f) => BASE[f.properties?.nivel] ?? BASE.estado;
  const capa = layerGroup([
    geoJSON(limites, { style: estilo, interactive: false, renderer: renderizador }),
    geoJSON(disputa, { style: () => BASE.disputa, interactive: false, renderer: renderizador }),
  ]);
  capa.addTo(mapa);
  // Los eventos siempre encima de las lineas.
  grupoEventos.remove();
  grupoEventos.addTo(mapa);
  return true;
}

function marcadorDe(evento) {
  const previo = marcadores.get(evento.id);
  if (previo) return previo.marcador;
  const marcador = circleMarker([evento.lat, evento.lon], {
    renderer: renderizador,
    radius: radioPorMagnitud(evento.mag),
    fillColor: claseProfundidad(evento.prof).color,
    fillOpacity: 0.72,
    color: SHELL,
    weight: 0.6,
    opacity: 0.9,
    bubblingMouseEvents: false,
  });
  // La ventana se construye al abrirla: con miles de eventos no se arma HTML
  // que nadie va a ver.
  marcador.bindPopup(() => htmlVentana(evento), { maxWidth: 280, autoPanPadding: [16, 72] });
  marcadores.set(evento.id, { marcador, evento });
  return marcador;
}

/**
 * Sustituye los eventos dibujados. De menor a mayor magnitud: el canvas pinta
 * en orden, asi los grandes quedan encima y se pueden tocar.
 * @param {Array<object>} eventos ya filtrados
 * @param {{ htmlVentana: (evento: object) => string }} opciones
 */
export function pintarEventos(eventos, opciones) {
  htmlVentana = opciones.htmlVentana;
  grupoEventos.clearLayers();
  const orden = [...eventos].sort((a, b) => a.mag - b.mag);
  for (const e of orden) grupoEventos.addLayer(marcadorDe(e));
  return true;
}

/** Encuadra Venezuela o la region completa (con su rectangulo discontinuo). */
export function encuadrar(vista) {
  vistaActual = vista;
  if (vista === "region") rectanguloRegion.addTo(mapa);
  else rectanguloRegion.remove();
  mapa.fitBounds(CAJAS[vista] ?? CAJAS.venezuela, { padding: [8, 8] });
  return true;
}

/** Lleva el mapa a un evento y abre su ventana. */
export function seleccionar(id) {
  const m = marcadores.get(id);
  if (!m || !grupoEventos.hasLayer(m.marcador)) return false;
  const destino = [m.evento.lat, m.evento.lon];
  const zoom = Math.max(mapa.getZoom(), 7);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    mapa.setView(destino, zoom, { animate: false });
    m.marcador.openPopup();
    return true;
  }
  mapa.once("moveend", () => m.marcador.openPopup());
  mapa.flyTo(destino, zoom, { duration: 0.8 });
  return true;
}

/** Recalcula el tamaño (al volver de la tabla o girar el telefono). */
export function redimensionar() {
  mapa.invalidateSize();
  return vistaActual;
}
