# ADR-008 — Mapa base vectorial propio mientras se decide el proveedor de teselas

**Fecha:** 2026-10-21 · **Estado:** Propuesto — **decision de Luis pendiente**

## Contexto

ADR-001 dejo abierto el proveedor de teselas del mapa base para la Fase 2. La
recomendacion no vinculante era `tile.openstreetmap.org` cumpliendo su
politica, pero ese uso no esta aprobado: no se usa ningun servidor de teselas
de terceros sin permiso de Luis.

## Decision (provisional)

La Fase 2 se entrega **sin teselas**. El mapa base son los propios GeoJSON de
`data/` dibujados por Leaflet sobre el fondo `shell`: frontera nacional,
limites estatales y la zona en disputa (trazo discontinuo, con su leyenda), y
el rectangulo de la consulta en la vista "Region". `src/config.js` deja un
hueco `TESELAS = null`: cuando Luis elija proveedor, se rellena (URL,
atribucion, zoom maximo) y `map.js` anade la capa sin mas cambios.

## Opciones para Luis

| Opcion | Peticiones a terceros | Clave | Coste / riesgo |
|---|---|---|---|
| A. Sin teselas (esta entrega) | Ninguna | No | No hay costa detallada, rios ni ciudades en el fondo |
| B. `tile.openstreetmap.org` | Si, por visita | No | Politica de uso: no apta para mucho trafico; tema claro (para oscuro habria que filtrar por CSS) |
| C. Proveedor con estilo oscuro y capa gratuita (p. ej. CARTO, Stadia Maps, MapTiler) | Si | Segun proveedor | Terminos y limites a verificar antes de elegir |
| D. Teselas propias (raster pre-renderizado de la region) | Ninguna externa | No | Trabajo y peso extra; licencia ODbL si salen de OSM |

Recomendacion de Claude Code: **A** para el gate de la Fase 2 (cero
dependencias de servicio, cero datos del visitante enviados a terceros) y
decidir B/C con trafico real en la Fase 4, como ya proponia ADR-001.

## Consecuencias

- Ninguna peticion de red sale del dominio propio: el mapa funciona igual en
  cualquier red y no hay politica de terceros que cumplir.
- Sin fondo topografico, la orientacion depende de la frontera y los estados;
  la vista de tabla y la etiqueta de lugar del USGS cubren el resto.
- Atribucion de los limites (geoBoundaries, Natural Earth) en el control de
  atribucion del mapa, como exige `LICENSE-DATA` §3.

## Cuando reconsiderar

- Cuando Luis elija proveedor: este ADR pasa a Supersedido por uno nuevo con
  el proveedor, su licencia y su politica verificadas.
