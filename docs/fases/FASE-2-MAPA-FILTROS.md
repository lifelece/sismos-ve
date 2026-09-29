# Fase 2 — Mapa + filtros

> **Gate de entrada:** Fase 1 cerrada (10 eventos verificados contra el USGS).
> **Gate de salida:** verificado en telefono real, datos moviles, DevTools
> cerrado.

**Tiempo estimado:** 1-2 sesiones · **Estado:** pendiente, no ejecutada

## Objetivo

Implementa las funcionalidades 1 y 2 de la ficha del proyecto:

1. **Mapa con circulos por magnitud y color por profundidad** — un
   `CircleMarker` de Leaflet por evento, radio proporcional a la magnitud
   (revisar si conviene escala lineal o logaritmica: la energia liberada crece
   exponencialmente con la magnitud, un radio lineal puede exagerar la
   diferencia visual entre M4 y M7), color por profundidad (sismos
   superficiales vs. profundos se comportan distinto y eso es informacion
   sismologica real, no decorativa).
2. **Deslizador de tiempo y filtro por magnitud** — UI para acotar el rango de
   fechas visible y el umbral minimo de magnitud, sobre el `eventos.json`
   estatico ya cargado (sin red).

## Entregables

- `src/map.js` — unico modulo que importa Leaflet (regla heredada de Orinoco:
  un modulo, una responsabilidad)
- `src/config.js` — paleta de colores por profundidad, escala de radio por
  magnitud, con la fuente/criterio de cada una documentada (igual que
  Orinoco documenta `COLOR_ESTADO`/`COLOR_FLUIDO` con su porque en
  `docs/adr/` o en un ADR nuevo si la decision lo amerita)
- `src/ui.js` — deslizador de tiempo, filtro de magnitud, leyenda
- Vista de tabla como alternativa accesible al mapa (un globo/mapa es
  invisible para un lector de pantalla — mismo razonamiento que Orinoco
  ADR-006)

## Pasos para Claude Code (cuando se abra esta fase)

1. Confirmar que `data/eventos.json` de la Fase 1 sigue vigente (fecha de
   `ultima_verificacion` razonable).
2. Instalar Leaflet (unica dependencia nueva de esta fase, ya aprobada en
   ADR-001 si Luis lo cerro; si el ADR-001 sigue "Propuesto", cerrarlo antes
   de instalar nada).
3. Implementar `map.js`, `config.js`, la parte de `ui.js` de esta fase.
4. Verificar el presupuesto de JS (ver `docs/adr/ADR-001-leaflet.md`) despues
   de instalar Leaflet y Tailwind.
5. Verificar en escritorio, luego en telefono real con DevTools cerrado.
6. Detenerse para el STOP gate.

## Criterios de salida

- [ ] Mapa visible con circulos por magnitud y color por profundidad
- [ ] Deslizador de tiempo funcional
- [ ] Filtro por magnitud funcional
- [ ] Vista de tabla como alternativa
- [ ] Sin llamadas de red a `usgs.gov` desde el navegador (solo
      `data/eventos.json` local)
- [ ] Presupuesto de JS respetado o, si se excede, documentado con ADR

## STOP GATE

Verificado por Luis en telefono real, con datos moviles y DevTools cerrado.
