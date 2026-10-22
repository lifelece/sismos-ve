/**
 * ui.js — DOM de la Fase 2: cabecera con buscador, panel de filtros y leyenda,
 * vista de tabla, pie con atribucion, frescura y aviso.
 *
 * No importa map.js ni pide nada a la red (scripts/verificar-modulos.mjs): habla con el
 * mapa por puenteMapa.js y recibe los datos de main.js. Todo texto visible
 * pasa por t() (CLAUDE.md regla 8).
 */

import { cambiarIdioma, idioma, t } from "./i18n/index.js";
import * as puente from "./puenteMapa.js";
import {
  ampliarFiltroPara,
  claseProfundidad,
  fechaUTC,
  filtrarEventos,
  filtroInicial,
  radioPorMagnitud,
  territorioDe,
} from "./data.js";
import { buscar, crearIndice } from "./buscar.js";
import { frescura, textoRelativo } from "./frescura.js";
import { ENLACES, FRESCURA, MAGNITUD_MINIMA, PROFUNDIDAD, TABLA_PAGINA } from "./config.js";

const estado = {
  /** @type {ReturnType<typeof import("./data.js").normalizarColeccion>|null} */
  coleccion: null,
  /** @type {import("./data.js").Filtro|null} */
  filtro: null,
  visibles: [],
  indice: [],
  modo: "mapa",
  filas: TABLA_PAGINA,
  panelAbierto: false,
  error: null,
  mapaListo: false,
  resultados: [],
  activo: -1,
};

const $ = (id) => document.getElementById(id);

/** Escapa texto para meterlo en HTML (los datos del USGS incluidos). */
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const fmtMag = (m) =>
  new Intl.NumberFormat(idioma(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(m);
const fmtEntero = (n) => new Intl.NumberFormat(idioma()).format(n);
const fmtKm = (km) => new Intl.NumberFormat(idioma(), { maximumFractionDigits: 1 }).format(km);

/** Hora en Caracas con la base de zonas del navegador (incluye UTC-4:30 de 2007-2016). */
function horaCaracas(ms) {
  return new Intl.DateTimeFormat(idioma(), {
    timeZone: "America/Caracas",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(ms);
}

// --- Montaje -------------------------------------------------------------------

/** Pinta (o repinta al cambiar de idioma) todo lo que no es el mapa. */
export function montarUI() {
  document.documentElement.lang = idioma();
  document.title = t("app.tituloPagina");
  $("mapa").setAttribute("aria-label", t("mapa.aria"));
  $("cabecera").innerHTML = htmlCabecera();
  $("panel").innerHTML = htmlPanel();
  $("aviso").innerHTML = htmlAviso();
  pintarCargaMapa();
  pintarTabla();
  conectar();
  pintarResumen();
}

/** Recibe el catalogo ya normalizado (main.js). */
export function fijarDatos(coleccion) {
  estado.coleccion = coleccion;
  estado.filtro = filtroInicial(coleccion);
  estado.indice = crearIndice(coleccion.eventos);
  estado.error = null;
  $("panel").innerHTML = htmlPanel();
  conectarPanel();
  aplicar({ encuadrar: true });
}

/** Muestra un error de carga sin romper el resto de la interfaz. */
export function mostrarError(clave, detalle = "") {
  estado.error = { clave, detalle };
  pintarResumen();
}

/** El mapa ya esta conectado (o fallo su descarga). */
export function marcarMapa(listo) {
  estado.mapaListo = listo;
  pintarCargaMapa();
}

/** Atribucion del mapa en el idioma activo. */
export function atribucionMapa() {
  return t("mapa.atribucion");
}

// --- Filtros -----------------------------------------------------------------

let pendiente = 0;
/** Agrupa los cambios de un deslizador en un solo repintado por fotograma. */
function aplicarPronto() {
  cancelAnimationFrame(pendiente);
  pendiente = requestAnimationFrame(() => aplicar());
}

function aplicar({ encuadrar = false } = {}) {
  if (!estado.coleccion) return;
  estado.visibles = filtrarEventos(estado.coleccion.eventos, estado.filtro);
  estado.filas = TABLA_PAGINA;
  puente.pintarEventos(estado.visibles, { htmlVentana });
  if (encuadrar) puente.encuadrar(estado.filtro.vista);
  pintarResumen();
  if (estado.modo === "tabla") pintarTabla();
}

function fijarFiltro(cambios, opciones) {
  estado.filtro = { ...estado.filtro, ...cambios };
  sincronizarControles();
  aplicar(opciones);
}

/** Refleja estado.filtro en los controles (tras restablecer o ampliar). */
function sincronizarControles() {
  const f = estado.filtro;
  if (!f || !$("f-desde")) return;
  $("f-desde").value = f.desde;
  $("f-hasta").value = f.hasta;
  $("f-mag").value = f.magMin;
  for (const r of document.querySelectorAll('input[name="vista"]')) r.checked = r.value === f.vista;
  pintarSalidas();
}

function pintarSalidas() {
  const f = estado.filtro;
  $("s-desde").textContent = f.desde;
  $("s-hasta").textContent = f.hasta;
  $("s-mag").textContent = `M ≥ ${fmtMag(f.magMin)}`;
  $("nota-vista").textContent = t(f.vista === "region" ? "filtros.notaRegion" : "filtros.notaVenezuela");
}

// --- HTML ----------------------------------------------------------------------

function htmlCabecera() {
  const otro = idioma() === "es" ? "en" : "es";
  return `
    <div class="flex items-center gap-2 px-3 py-2 sm:gap-4 sm:px-4">
      <h1 class="shrink-0 font-mono text-[0.8125rem] font-bold tracking-[0.08em] text-hi uppercase">
        ${esc(t("app.titulo"))}
        <span class="ml-2 font-sans font-normal tracking-normal text-lo normal-case max-md:hidden">${esc(t("app.subtitulo"))}</span>
      </h1>
      <div class="relative min-w-0 flex-1">
        <label for="busqueda" class="sr-only">${esc(t("buscar.etiqueta"))}</label>
        <input id="busqueda" type="search" autocomplete="off" spellcheck="false"
          role="combobox" aria-expanded="false" aria-controls="resultados" aria-autocomplete="list"
          placeholder="${esc(t("buscar.placeholder"))}"
          class="h-10 w-full rounded-md border border-trazo bg-shell px-3 pr-8 text-[0.9375rem] text-hi placeholder:text-lo
                 focus:border-tinta focus:outline-none sm:h-9 sm:text-[0.8125rem]" />
        <kbd class="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-trazo px-1.5
                    font-mono text-[0.6875rem] text-lo max-sm:hidden" aria-hidden="true">/</kbd>
        <ul id="resultados" role="listbox" aria-label="${esc(t("buscar.resultados"))}" hidden
          class="absolute inset-x-0 top-full z-[1200] mt-1 max-h-[60dvh] overflow-y-auto rounded-md border border-trazo
                 bg-elev py-1 shadow-xl shadow-black/40"></ul>
      </div>
      <button id="idioma" type="button" lang="${otro}"
        class="h-10 shrink-0 rounded-md border border-trazo px-2.5 font-mono text-[0.75rem] text-lo hover:text-hi sm:h-9"
        aria-label="${esc(t("idioma.cambiar"))}">${otro.toUpperCase()}</button>
    </div>`;
}

function htmlPanel() {
  const c = estado.coleccion;
  const f = estado.filtro;
  const abierto = estado.panelAbierto;
  const segmento = (modo) => `
    <button type="button" data-modo="${modo}" aria-pressed="${estado.modo === modo}"
      class="h-9 px-3 text-[0.8125rem] ${estado.modo === modo ? "bg-trazo text-hi" : "text-lo hover:text-hi"}">
      ${esc(t(`modo.${modo}`))}</button>`;

  const controles = !c
    ? `<p class="px-4 py-3 text-[0.8125rem] text-lo">${esc(t("datos.cargando"))}</p>`
    : `
      <fieldset class="mt-3 px-4">
        <legend class="${ETIQUETA}">${esc(t("filtros.vista"))}</legend>
        <div class="mt-2 grid grid-cols-2 gap-2">
          ${["venezuela", "region"]
            .map(
              (v) => `
            <label class="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-trazo px-3 text-[0.8125rem]
                          has-[:checked]:border-tinta has-[:checked]:text-hi text-lo">
              <input type="radio" name="vista" value="${v}" ${f.vista === v ? "checked" : ""} class="accent-[var(--color-tinta)]" />
              ${esc(t(`filtros.vista.${v}`))}
            </label>`
            )
            .join("")}
        </div>
        <p id="nota-vista" class="mt-2 text-[0.75rem] leading-snug text-lo"></p>
      </fieldset>

      <fieldset class="mt-4 px-4">
        <legend class="${ETIQUETA}">${esc(t("filtros.tiempo"))}</legend>
        ${htmlDeslizador("f-desde", "s-desde", t("filtros.desde"), c.anioMin, c.anioMax, 1, f.desde)}
        ${htmlDeslizador("f-hasta", "s-hasta", t("filtros.hasta"), c.anioMin, c.anioMax, 1, f.hasta)}
      </fieldset>

      <fieldset class="mt-4 px-4">
        <legend class="${ETIQUETA}">${esc(t("filtros.magnitud"))}</legend>
        ${htmlDeslizador("f-mag", "s-mag", t("filtros.magMin"), MAGNITUD_MINIMA, Math.floor(c.magMax * 10) / 10, 0.1, f.magMin)}
      </fieldset>

      <div class="px-4 pt-3">
        <button id="restablecer" type="button"
          class="h-9 rounded-md border border-trazo px-3 text-[0.8125rem] text-lo hover:text-hi">${esc(t("filtros.restablecer"))}</button>
      </div>

      ${htmlLeyenda()}`;

  return `
    <div class="flex h-full flex-col">
      <div class="flex items-center gap-2 px-3 py-2 sm:px-4 sm:pt-3">
        <p id="resumen" class="min-w-0 flex-1 text-[0.8125rem] text-lo" aria-live="polite"></p>
        <div class="flex shrink-0 overflow-hidden rounded-md border border-trazo" role="group" aria-label="${esc(t("modo.etiqueta"))}">
          ${segmento("mapa")}${segmento("tabla")}
        </div>
        <button id="alternar-panel" type="button" aria-expanded="${abierto}" aria-controls="controles"
          class="h-9 shrink-0 rounded-md border border-trazo px-3 text-[0.8125rem] text-lo hover:text-hi sm:hidden">
          ${esc(t(abierto ? "panel.cerrar" : "panel.abrir"))}</button>
      </div>
      <div id="controles" class="${abierto ? "" : "max-sm:hidden"} max-h-[52dvh] overflow-y-auto border-t border-trazo pb-4
                                  sm:max-h-none sm:flex-1">
        ${controles}
      </div>
      ${htmlPie()}
    </div>`;
}

const ETIQUETA = "font-mono text-[0.6875rem] tracking-[0.08em] text-lo uppercase";

function htmlDeslizador(id, idSalida, etiqueta, min, max, paso, valor) {
  return `
    <div class="mt-2">
      <div class="flex items-baseline justify-between text-[0.8125rem]">
        <label for="${id}" class="text-lo">${esc(etiqueta)}</label>
        <output id="${idSalida}" for="${id}" class="font-mono text-hi tabular-nums"></output>
      </div>
      <input id="${id}" type="range" min="${min}" max="${max}" step="${paso}" value="${valor}"
        class="mt-1 h-8 w-full cursor-pointer accent-[var(--color-tinta)]" />
    </div>`;
}

function htmlLeyenda() {
  const circulo = (m) => {
    const r = radioPorMagnitud(m);
    return `<span class="inline-flex items-center gap-1.5">
      <svg width="${2 * r + 2}" height="${2 * r + 2}" aria-hidden="true">
        <circle cx="${r + 1}" cy="${r + 1}" r="${r}" fill="none" stroke="#8b98a5" stroke-width="1" />
      </svg><span class="font-mono tabular-nums">M${m}</span></span>`;
  };
  return `
    <section class="px-4 pt-5" aria-labelledby="titulo-leyenda">
      <h2 id="titulo-leyenda" class="${ETIQUETA}">${esc(t("leyenda.titulo"))}</h2>
      <p class="mt-2 text-[0.75rem] text-lo">${esc(t("leyenda.tamano"))}</p>
      <div class="mt-1 flex items-end gap-4 text-[0.75rem] text-hi">${[3, 5, 7].map(circulo).join("")}</div>
      <p class="mt-3 text-[0.75rem] text-lo">${esc(t("leyenda.color"))}</p>
      <ul class="mt-1 space-y-1 text-[0.75rem] text-hi">
        ${PROFUNDIDAD.map(
          (c) => `<li class="flex items-center gap-2">
            <span class="h-3 w-3 shrink-0 rounded-full" style="background:${c.color}" aria-hidden="true"></span>
            ${esc(t(`profundidad.${c.clave}`))}</li>`
        ).join("")}
      </ul>
      <p class="mt-3 text-[0.75rem] text-lo">${esc(t("leyenda.limites"))}</p>
      <ul class="mt-1 space-y-1 text-[0.75rem] text-hi">
        <li class="flex items-center gap-2"><svg width="22" height="6" aria-hidden="true"><line x1="0" y1="3" x2="22" y2="3" stroke="#8b98a5" stroke-width="1.5"/></svg>${esc(t("leyenda.frontera"))}</li>
        <li class="flex items-center gap-2"><svg width="22" height="6" aria-hidden="true"><line x1="0" y1="3" x2="22" y2="3" stroke="#8b98a5" stroke-width="1.5" stroke-dasharray="5 4"/></svg>${esc(t("leyenda.disputa"))}</li>
        <li class="flex items-center gap-2"><svg width="22" height="6" aria-hidden="true"><line x1="0" y1="3" x2="22" y2="3" stroke="#3a5266" stroke-width="1.5" stroke-dasharray="2 4"/></svg>${esc(t("leyenda.region"))}</li>
      </ul>
    </section>`;
}

/** Chip de frescura (ADR-005; spec arsenal R8: nunca solo color). */
function htmlChip() {
  const marca = estado.coleccion?.verificacion ?? null;
  const r = frescura(marca, Date.now(), FRESCURA);
  if (!r) return "";
  const color = { fresca: "bg-activo", atencion: "bg-aviso", vencida: "bg-alerta" }[r.estado];
  const relativo = textoRelativo(r, t);
  const completo = t("frescura.chip", { t: relativo });
  return `<a href="${ENLACES.fdsn}" target="_blank" rel="noopener noreferrer"
      aria-label="${esc(`${completo}. ${t(`frescura.estado.${r.estado}`)} (${marca})`)}"
      title="${esc(`${t("frescura.etiqueta")} ${marca}`)}"
      class="inline-flex items-center gap-1.5 hover:text-hi">
      <span class="h-1.5 w-1.5 shrink-0 rounded-full ${color}" aria-hidden="true"></span>
      <span class="max-sm:hidden">${esc(completo)}</span><span class="sm:hidden">${esc(relativo)}</span></a>`;
}

function htmlPie() {
  return `
    <footer class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-trazo px-3 py-2 text-[0.6875rem] text-lo sm:px-4">
      <a href="${ENLACES.usgs}" target="_blank" rel="noopener noreferrer" class="hover:text-hi">${esc(t("pie.datos"))}</a>
      <span id="chip">${htmlChip()}</span>
      <button id="abrir-aviso" type="button" class="text-tinta underline-offset-2 hover:underline">${esc(t("pie.aviso"))}</button>
    </footer>`;
}

function htmlAviso() {
  const completo = ENLACES.repo
    ? `<p><a class="text-tinta underline" href="${ENLACES.repo}/blob/main/DISCLAIMER.md" target="_blank" rel="noopener">${esc(t("aviso.completo"))}</a></p>`
    : "";
  return `
    <form method="dialog" class="space-y-3 p-5 text-[0.875rem] leading-relaxed text-hi">
      <h2 id="aviso-titulo" class="text-[1.125rem] font-bold">${esc(t("aviso.titulo"))}</h2>
      <p>${esc(t("aviso.noAlerta"))}</p>
      <p class="text-lo">${esc(t("aviso.funvisis"))}</p>
      <p class="text-lo">${esc(t("aviso.desfase"))}</p>
      <p class="text-lo">${esc(t("aviso.territorio"))}</p>
      ${completo}
      <div class="pt-2 text-right">
        <button class="h-10 rounded-md border border-trazo px-4 text-[0.8125rem] hover:border-tinta">${esc(t("aviso.cerrar"))}</button>
      </div>
    </form>`;
}

/** Ventana del evento en el mapa (la ficha completa llega en la Fase 3). */
function htmlVentana(e) {
  const territorio = territorioDe(e);
  const fila = (k, v) => `<div class="contents"><dt class="text-lo">${esc(k)}</dt><dd class="text-hi">${v}</dd></div>`;
  return `
    <div class="ventana">
      <p class="font-mono text-[1.25rem] font-bold text-hi tabular-nums">M ${fmtMag(e.mag)}
        <span class="text-[0.75rem] font-normal text-lo">${esc(e.magTipo ?? "")}</span></p>
      <p class="mt-0.5 text-[0.8125rem] text-hi">${esc(e.lugar)}</p>
      <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[0.75rem]">
        ${fila(t("evento.fecha"), `<span class="font-mono tabular-nums">${esc(fechaUTC(e.tiempo))}</span>`)}
        ${fila(t("evento.caracas"), esc(horaCaracas(e.tiempo)))}
        ${fila(t("evento.profundidad"), `${esc(fmtKm(e.prof))} km · ${esc(t(`profundidad.${claseProfundidad(e.prof).clave}.corta`))}`)}
        ${fila(t("evento.territorio"), esc(t(`territorio.${territorio}`)))}
        ${fila(t("evento.confianza"), esc(t(`confianza.${e.confianza}`)))}
      </dl>
      ${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer" class="mt-2 inline-block text-[0.75rem] text-tinta underline">${esc(t("evento.usgs"))}</a>` : ""}
    </div>`;
}

// --- Resumen, carga y tabla ------------------------------------------------------

function pintarResumen() {
  const nodo = $("resumen");
  if (!nodo) return;
  if (estado.error) {
    nodo.innerHTML = `<span class="text-alerta">${esc(t(estado.error.clave))}</span>`;
    return;
  }
  if (!estado.coleccion) {
    nodo.innerHTML = `<span class="relative block h-1 w-24 overflow-hidden rounded bg-trazo" role="progressbar"
        aria-label="${esc(t("datos.cargando"))}"><span class="absolute inset-y-0 w-1/3 animate-indeterminada bg-tinta"></span></span>`;
    return;
  }
  const f = estado.filtro;
  nodo.innerHTML = `<b class="font-mono text-hi tabular-nums">${fmtEntero(estado.visibles.length)}</b>
    ${esc(t("resumen.sismos", { n: estado.visibles.length }))}<span class="max-sm:hidden"> · <span class="font-mono tabular-nums">${f.desde}–${f.hasta}</span>
    · <span class="font-mono tabular-nums">M ≥ ${fmtMag(f.magMin)}</span></span>`;
  pintarSalidas();
}

function pintarCargaMapa() {
  const nodo = $("carga-mapa");
  if (!nodo) return;
  nodo.hidden = estado.mapaListo === true;
  nodo.textContent = estado.mapaListo === false && estado.errorMapa ? t("mapa.error") : t("mapa.cargando");
}

/** El mapa no pudo descargarse: se avisa y la tabla sigue disponible. */
export function errorMapa() {
  estado.errorMapa = true;
  estado.mapaListo = false;
  pintarCargaMapa();
}

function pintarTabla() {
  const nodo = $("tabla");
  if (!nodo) return;
  nodo.hidden = estado.modo !== "tabla";
  if (estado.modo !== "tabla" || !estado.coleccion) return;
  const filas = estado.visibles.slice(0, estado.filas);
  const resto = estado.visibles.length - filas.length;
  nodo.innerHTML = `
    <table class="w-full border-collapse text-left text-[0.8125rem]">
      <caption class="px-3 py-2 text-left text-[0.75rem] text-lo">
        ${esc(t("tabla.caption", { n: fmtEntero(filas.length), total: fmtEntero(estado.visibles.length) }))}</caption>
      <thead class="sticky top-0 bg-elev ${ETIQUETA}">
        <tr>
          <th scope="col" class="px-3 py-2 font-normal">${esc(t("tabla.fecha"))}</th>
          <th scope="col" class="px-2 py-2 text-right font-normal">M</th>
          <th scope="col" class="px-2 py-2 text-right font-normal">${esc(t("tabla.prof"))}</th>
          <th scope="col" class="px-3 py-2 font-normal">${esc(t("tabla.lugar"))}</th>
        </tr>
      </thead>
      <tbody>
        ${filas
          .map(
            (e) => `
          <tr class="border-t border-trazo align-top">
            <td class="px-3 py-2 font-mono whitespace-nowrap text-lo tabular-nums">${esc(fechaUTC(e.tiempo).slice(0, 10))}</td>
            <td class="px-2 py-2 text-right font-mono text-hi tabular-nums">${fmtMag(e.mag)}</td>
            <td class="px-2 py-2 text-right font-mono text-lo tabular-nums">
              <span class="mr-1 inline-block h-2 w-2 rounded-full" style="background:${claseProfundidad(e.prof).color}" aria-hidden="true"></span>${esc(fmtKm(e.prof))}</td>
            <td class="px-3 py-2 text-hi">${esc(e.lugar)}
              <span class="block text-[0.6875rem] text-lo">${esc(t(`territorio.${territorioDe(e)}`))}</span>
              <button type="button" data-ver="${esc(e.id)}" class="mt-1 min-h-8 text-[0.75rem] text-tinta underline-offset-2 hover:underline">
                ${esc(t("tabla.verEnMapa"))}</button></td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
    ${
      resto > 0
        ? `<div class="p-3"><button id="mas-filas" type="button"
            class="h-10 rounded-md border border-trazo px-4 text-[0.8125rem] text-lo hover:text-hi">
            ${esc(t("tabla.mas", { n: fmtEntero(Math.min(TABLA_PAGINA, resto)) }))}</button></div>`
        : ""
    }`;
}

function fijarModo(modo) {
  if (estado.modo === modo) return;
  estado.modo = modo;
  for (const b of document.querySelectorAll("[data-modo]")) {
    const activo = b.dataset.modo === modo;
    b.setAttribute("aria-pressed", String(activo));
    b.classList.toggle("bg-trazo", activo);
    b.classList.toggle("text-hi", activo);
    b.classList.toggle("text-lo", !activo);
  }
  pintarTabla();
  if (modo === "mapa") puente.redimensionar();
}

function alternarPanel(abrir = !estado.panelAbierto) {
  estado.panelAbierto = abrir;
  $("controles")?.classList.toggle("max-sm:hidden", !abrir);
  const boton = $("alternar-panel");
  if (boton) {
    boton.setAttribute("aria-expanded", String(abrir));
    boton.textContent = t(abrir ? "panel.cerrar" : "panel.abrir");
  }
  // En movil el panel ocupa sitio en la rejilla: el mapa cambia de alto.
  puente.redimensionar();
}

// --- Buscador (ADR-006) ----------------------------------------------------------

function pintarResultados() {
  const entrada = $("busqueda");
  const lista = $("resultados");
  if (!entrada || !lista) return;
  const abierta = document.activeElement === entrada && entrada.value.trim().length >= 2 && !!estado.coleccion;
  lista.hidden = !abierta;
  entrada.setAttribute("aria-expanded", String(abierta));
  if (!abierta) {
    entrada.removeAttribute("aria-activedescendant");
    lista.innerHTML = "";
    return;
  }
  if (!estado.resultados.length) {
    lista.innerHTML = `<li role="presentation" class="px-3 py-2.5 text-[0.8125rem] text-lo">${esc(t("buscar.sinResultados"))}</li>`;
    entrada.removeAttribute("aria-activedescendant");
    return;
  }
  lista.innerHTML = estado.resultados
    .map(
      (e, i) => `
      <li id="resultado-${i}" role="option" aria-selected="${i === estado.activo}" data-i="${i}"
        class="flex min-h-11 cursor-pointer items-center gap-2.5 px-3 sm:min-h-9 ${i === estado.activo ? "bg-white/10" : "hover:bg-white/5"}">
        <span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background:${claseProfundidad(e.prof).color}" aria-hidden="true"></span>
        <span class="w-9 shrink-0 font-mono text-[0.8125rem] text-hi tabular-nums">${fmtMag(e.mag)}</span>
        <span class="line-clamp-2 min-w-0 flex-1 text-[0.8125rem] leading-snug text-hi">${esc(e.lugar)}</span>
        <span class="shrink-0 font-mono text-[0.6875rem] text-lo tabular-nums">${e.anio}</span>
      </li>`
    )
    .join("");
  if (estado.activo >= 0) entrada.setAttribute("aria-activedescendant", `resultado-${estado.activo}`);
}

function consultar() {
  estado.resultados = buscar(estado.indice, $("busqueda").value);
  estado.activo = estado.resultados.length ? 0 : -1;
  pintarResultados();
}

/** Lleva al evento: amplia filtros si hace falta, vuelve al mapa y lo abre. */
function irAEvento(evento) {
  const entrada = $("busqueda");
  if (entrada) {
    entrada.value = "";
    entrada.blur();
  }
  estado.resultados = [];
  estado.activo = -1;
  pintarResultados();
  const nuevo = ampliarFiltroPara(estado.filtro, evento);
  if (nuevo !== estado.filtro) fijarFiltro(nuevo, { encuadrar: nuevo.vista !== estado.filtro.vista });
  fijarModo("mapa");
  puente.seleccionar(evento.id);
}

// --- Eventos del DOM -----------------------------------------------------------------

function conectar() {
  $("idioma").addEventListener("click", (ev) => cambiarIdioma(ev.currentTarget.getAttribute("lang")));

  const entrada = $("busqueda");
  const lista = $("resultados");
  entrada.addEventListener("input", consultar);
  entrada.addEventListener("focus", consultar);
  // Tocar un resultado quita el foco del campo antes del click: el cierre espera.
  entrada.addEventListener("blur", () => setTimeout(pintarResultados, 150));
  entrada.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      if (!estado.resultados.length) return;
      ev.preventDefault();
      const paso = ev.key === "ArrowDown" ? 1 : -1;
      estado.activo = (estado.activo + paso + estado.resultados.length) % estado.resultados.length;
      pintarResultados();
      $(`resultado-${estado.activo}`)?.scrollIntoView({ block: "nearest" });
    } else if (ev.key === "Enter") {
      const elegido = estado.resultados[estado.activo];
      if (!elegido) return;
      ev.preventDefault();
      irAEvento(elegido);
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      if (entrada.value) {
        entrada.value = "";
        consultar();
      } else entrada.blur();
    }
  });
  lista.addEventListener("mousedown", (ev) => ev.preventDefault());
  lista.addEventListener("click", (ev) => {
    const opcion = ev.target.closest("[data-i]");
    if (opcion) irAEvento(estado.resultados[Number(opcion.dataset.i)]);
  });

  $("tabla").addEventListener("click", (ev) => {
    const ver = ev.target.closest("[data-ver]");
    if (ver) {
      const e = estado.visibles.find((x) => x.id === ver.dataset.ver);
      if (e) irAEvento(e);
      return;
    }
    if (ev.target.closest("#mas-filas")) {
      estado.filas += TABLA_PAGINA;
      pintarTabla();
    }
  });

  conectarPanel();
}

function conectarPanel() {
  for (const b of document.querySelectorAll("[data-modo]")) {
    b.addEventListener("click", () => fijarModo(b.dataset.modo));
  }
  $("alternar-panel")?.addEventListener("click", () => alternarPanel());
  $("abrir-aviso")?.addEventListener("click", () => $("aviso").showModal());
  if (!estado.coleccion) return;

  for (const r of document.querySelectorAll('input[name="vista"]')) {
    r.addEventListener("change", () => fijarFiltro({ vista: r.value }, { encuadrar: true }));
  }
  $("f-desde").addEventListener("input", (ev) => {
    const desde = Number(ev.target.value);
    estado.filtro = { ...estado.filtro, desde, hasta: Math.max(desde, estado.filtro.hasta) };
    $("f-hasta").value = estado.filtro.hasta;
    pintarSalidas();
    aplicarPronto();
  });
  $("f-hasta").addEventListener("input", (ev) => {
    const hasta = Number(ev.target.value);
    estado.filtro = { ...estado.filtro, hasta, desde: Math.min(hasta, estado.filtro.desde) };
    $("f-desde").value = estado.filtro.desde;
    pintarSalidas();
    aplicarPronto();
  });
  $("f-mag").addEventListener("input", (ev) => {
    estado.filtro = { ...estado.filtro, magMin: Number(ev.target.value) };
    pintarSalidas();
    aplicarPronto();
  });
  $("restablecer").addEventListener("click", () => {
    const inicial = filtroInicial(estado.coleccion);
    fijarFiltro(inicial, { encuadrar: true });
  });
  sincronizarControles();
}

// --- Teclado global ------------------------------------------------------------------

/** `/` enfoca el buscador; `Esc` cierra el panel movil (el dialogo se cierra solo). */
document.addEventListener("keydown", (ev) => {
  const objetivo = ev.target;
  const escribiendo =
    objetivo instanceof HTMLElement &&
    (objetivo.isContentEditable || objetivo.matches("textarea, select, input:not([type=checkbox]):not([type=radio]):not([type=range])"));
  if (ev.key === "/" && !escribiendo && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
    const entrada = $("busqueda");
    if (!entrada) return;
    ev.preventDefault();
    entrada.focus();
    return;
  }
  if (ev.key === "Escape" && !escribiendo && estado.panelAbierto && !$("aviso").open) alternarPanel(false);
});

window.addEventListener("idioma:cambiado", () => {
  const anterior = atribucionMapaPrevia;
  montarUI();
  if (estado.coleccion) aplicar();
  atribucionMapaPrevia = atribucionMapa();
  puente.fijarAtribucion(anterior, atribucionMapaPrevia);
});

/** Ultima atribucion entregada al mapa (para poder sustituirla). */
let atribucionMapaPrevia = "";
export function registrarAtribucion(texto) {
  atribucionMapaPrevia = texto;
}
