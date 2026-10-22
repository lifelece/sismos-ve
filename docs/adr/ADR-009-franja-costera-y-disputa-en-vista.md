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

- Catalogo del 2026-10-21: 645 en tierra, 1095 frente a la costa, 6 en la zona
  en disputa, 2612 fuera (4358 en la region).
- **Limite conocido:** sin poligonos de otros paises, la franja no distingue el
  mar de la tierra vecina a menos de 50 km: de los 1095, 225 llevan "Trinidad"
  en el texto del USGS, 8 "Colombia", 6 "Windward Islands" y 2 "Guyana". La
  etiqueta dice "a 50 km o menos de la costa", no "en el mar".
- El ancla este queda a 19,7 km del vertice elegido (la linea esta
  simplificada): la costa atlantica junto a la linea de facto es aproximada.

## Cuando reconsiderar

- Si se incorporan poligonos de los paises vecinos o una ZEE con fuente: la
  franja pasa a excluir su tierra o se sustituye por la ZEE (ADR nuevo).
