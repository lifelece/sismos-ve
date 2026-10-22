# ADR-007 — Carga diferida de Leaflet (shell y datos primero, `map.js` por `import()`)

**Fecha:** 2026-10-21 · **Estado:** Propuesto (se acepta en el STOP gate de la
Fase 2)

## Contexto

En red movil venezolana, lo que el visitante necesita primero es el shell
(cabecera, filtros, aviso de que no es alerta temprana) y la descarga del
catalogo, que es lo que mas pesa (~220 KB con brotli). Leaflet (JS + CSS) no
hace falta para pintar nada de eso.

## Decision

1. `src/main.js` pinta el shell y pide los datos sin esperar a Leaflet; trae
   `src/map.js` con `import("./map.js")` tras el primer pintado (doble
   `requestAnimationFrame`).
2. `src/ui.js` no importa `map.js`: habla con el mapa por `src/puenteMapa.js`,
   que no importa Leaflet, guarda en cola las ordenes que llegan antes de que
   el mapa exista y las reproduce al conectarse. Las ordenes de "ultimo gana"
   (`pintarEventos`, `encuadrar`) se compactan en la cola.
3. Leaflet va en su propio chunk (`manualChunks`) junto con su CSS.
4. Si `import("./map.js")` falla, el error se ve en la interfaz y la vista de
   tabla sigue funcionando con los datos ya cargados.
5. Gate de arquitectura automatico (`scripts/verificar-modulos.mjs`, dentro de
   `npm test`): solo `map.js` importa `leaflet`; `ui.js` no importa `map.js`;
   `main.js` solo lo importa con `import()` dinamico; solo `api.js` hace
   `fetch`, y nunca a `usgs.gov` (CLAUDE.md regla 3).

## Trasplante JARVIS

- **Capacidad de origen:** Carga diferida de un motor pesado: shell primero,
  import() dinamico, puente con cola y gate contra el import estatico · origen
  Orinoco Digital (Publico, ADR-022 de ese proyecto).
- **Tipo:** Codigo directo adaptado (mismo stack).
- **Ley 1 (direccion):** publico -> publico. Permitido.
- **Ley 2 (stacks):** mismo stack (Vite + Vanilla ES6). Permitido.
- **Ley 3 (nucleo neutral):** **pendiente.** La ficha tiene 2 destinos y no
  hay nucleo en arsenal; se propone al Director extraer
  `arsenal/specs/carga-diferida/` (puente con cola + reglas del gate) con
  `src/puenteMapa.js` y `scripts/verificar-modulos.mjs` de este repo como
  segunda implementacion.
- **Que viaja:** el puente con cola, el doble `requestAnimationFrame`, el
  chunk propio y el gate de imports. **Que no viaja:** lo especifico de
  Cesium (assets estaticos, controlador de render). Se anade la compactacion
  de ordenes "ultimo gana" (mejora candidata a devolver al origen).
- **Fases y gates:** T1 = esta fase (gate: `npm test` con el gate de modulos +
  `npm run build` con el chunk separado + STOP gate en telefono real).

## Consecuencias

- El beneficio es menor que en orinoco (Leaflet pesa ~40 KB frente a ~1,1 MB de
  Cesium), pero el patron cuesta poco y deja el primer pintado sin depender
  de ninguna libreria.
- Un evento elegido en el buscador antes de que llegue el mapa queda en cola.

## Verificado

Cifras del build en `docs/PERFORMANCE_BUDGET.md`; gate pendiente.

## Cuando reconsiderar

- Si se cambia de motor de mapa (ADR-001) o el mapa deja de ser la primera
  pantalla.
