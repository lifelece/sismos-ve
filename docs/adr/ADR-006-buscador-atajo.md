# ADR-006 — Buscador de eventos con atajo "/"

**Fecha:** 2026-10-21 · **Estado:** Aceptada (Luis, 2026-10-21; estetica aprobada en el gate de la
Fase 2)

## Contexto

Con miles de eventos en el catalogo, la pregunta mas comun no es "que hay en
este rectangulo" sino "y el de Carupano de 2018?". Filtrar por fecha y
magnitud hasta dar con uno es lento, sobre todo en movil.

## Decision

Un campo de busqueda en la cabecera que encuentra eventos por el texto de
lugar del USGS (sin distinguir tildes ni mayusculas), por id del USGS
(`us6000t7zp`) o por año, con todas las palabras en cualquier orden. Hasta 8
resultados, ordenados por magnitud. Teclado: `/` enfoca el campo (si no se
esta escribiendo en otro), flechas recorren, `Enter` elige, `Esc` limpia o
cierra. Elegir un resultado lleva el mapa al evento y abre su ventana; si el
evento estaba fuera de los filtros, los filtros se amplian lo justo para que
se vea (volar a un punto invisible parece un fallo del buscador).

La busqueda es una funcion pura (`src/buscar.js`, con tests); el DOM vive en
`src/ui.js`.

## Trasplante JARVIS

- **Capacidad de origen:** Buscador con atajo / + ficha lateral (escritorio) y
  hoja inferior (movil) · origen Orinoco Digital (Publico).
- **Tipo:** Codigo directo adaptado (mismo stack), reimplementado para
  eventos en vez de activos.
- **Ley 1 (direccion):** publico -> publico. Permitido.
- **Ley 2 (stacks):** mismo stack (Vite + Vanilla ES6). Permitido.
- **Ley 3 (nucleo neutral):** **pendiente.** La ficha sirve a 3 destinos y aun
  no tiene nucleo en arsenal. Este repo no puede escribir en arsenal (fuera del
  alcance de la tarea): se propone al Director extraer
  `arsenal/specs/buscador-atajo/` (requisitos del teclado, normalizacion,
  orden, casos de tabla) usando `src/buscar.js` y sus tests como segunda
  implementacion.
- **Que viaja:** normalizacion sin tildes, "todas las palabras en cualquier
  orden", tope de 8, el patron ARIA combobox/listbox, el manejo de teclado y
  "si el destino esta oculto, hacerlo visible". **Que no viaja:** el indice de
  activos energeticos y el agrupado de ductos por nombre.
- **Fases y gates:** T1 = buscador + ventana del evento en el mapa (Fase 2,
  STOP gate en telefono real). T2 = ficha lateral / hoja inferior, que es la
  "ficha del evento" de la Fase 3 (gate de la Fase 3).

## Consecuencias

- El texto de lugar del USGS esta en ingles ("40 km ENE of Carupano,
  Venezuela"): se busca por nombres de ciudad, que son iguales en los dos
  idiomas.
- El indice se arma una vez al cargar (~4 400 entradas); buscar es filtrar
  un array en memoria, sin red.

## Verificado

`npm test` (tests de `src/buscar.js`) y capturas a 390 px; gate pendiente.

## Cuando reconsiderar

- Si el catalogo crece a decenas de miles de eventos: indice por prefijos.
