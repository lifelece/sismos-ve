# ADR-009 — Franja costera de 50 km y zona en disputa en la vista por defecto

**Fecha:** 2026-10-21 · **Estado:** Aceptada (Luis, 2026-10-21). Amplia
ADR-003 sin cambiar sus dos etiquetas.

## Contexto

Con ADR-003, la vista "Solo Venezuela" mostraba solo epicentros en tierra:
quedaban fuera 925 sismos con "Venezuela" en el texto del USGS que ocurren en
el mar frente a la costa, y los 6 de la zona en disputa.

## Decision

1. Tercera etiqueta excluyente, `frente_costa`: fuera de la tierra de
   Venezuela y de la zona en disputa, a **<= 50 km** de la costa venezolana.
   Se calcula en el pipeline (`scripts/territorio.mjs`), sin dependencias:
   distancia en km a las lineas de costa (islas enteras y, en tierra firme, el
   arco entre Castilletes y Punta Playa que pasa por el norte; el resto del
   anillo es frontera terrestre y no cuenta).
2. La vista por defecto muestra tierra + franja costera + zona en disputa,
   cada evento con su etiqueta ("frente a la costa", "zona en disputa"). Trato
   neutral de la zona en disputa (precedente P-4): se muestra etiquetada, nunca
   como `en_venezuela`.

## Consecuencias

- Campo `pais_vecino` (ISO alfa-3 o null), con Natural Earth admin-0 1:50m
  recortado a la caja de la consulta (`data/paises-vecinos.geojson`, 17 KB,
  dominio publico): un sismo en tierra de otro pais nunca es `frente_costa`
  ni sale en "Solo Venezuela" (arreglo tecnico del Director, 2026-10-21).
  Orden: zona en disputa > tierra de Venezuela > pais vecino > franja costera.
- Catalogo del 2026-10-21 (4358 en la region): 645 en tierra, 1077 frente a la
  costa, 6 en la zona en disputa, 1827 en paises vecinos y 803 en mar abierto.
  "Solo Venezuela" muestra 1728.
- La costa de Natural Earth 1:50m es mas gruesa que la de geoBoundaries: cerca
  de la orilla de otro pais, la etiqueta tiene la precision de esa escala.
- El ancla este queda a 19,7 km del vertice elegido (la linea esta
  simplificada): la costa atlantica junto a la linea de facto es aproximada.

## Cuando reconsiderar

- Si se incorpora una ZEE con fuente: puede sustituir a la franja (ADR nuevo).
