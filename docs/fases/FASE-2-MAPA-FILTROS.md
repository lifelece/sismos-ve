# Fase 2 — Mapa + filtros

> **Gate de entrada:** Fase 1 cerrada (10 eventos verificados contra el USGS).
> **Gate de salida:** verificado en telefono real, datos moviles, DevTools
> cerrado.

**Tiempo estimado:** 1-2 sesiones · **Estado:** implementada en la rama
`f2-mapa` (2026-10-21); **esperando el STOP gate de Luis** en telefono real

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

- [x] Mapa visible con circulos por magnitud y color por profundidad
- [x] Deslizador de tiempo funcional (desde / hasta, por año)
- [x] Filtro por magnitud funcional
- [x] Vista de tabla como alternativa
- [x] Sin llamadas de red a `usgs.gov` desde el navegador: gate automatico
      en `npm test` y captura CDP con todas las peticiones a `localhost`
- [x] Presupuesto de JS respetado: 13,6 KB gzip de JS propio
      (`docs/PERFORMANCE_BUDGET.md`)
- [ ] Verificado por Luis en telefono real (STOP gate)

## STOP GATE

Verificado por Luis en telefono real, con datos moviles y DevTools cerrado.

## Implementacion (2026-10-21, Claude Code)

- **Stack:** Vite 7 + Tailwind 4 (stack de `CLAUDE.md`) y Leaflet 1.9.4
  (ADR-001), unicas dependencias. `npm test` sigue corriendo sin
  `npm install` (los modulos probados no importan Leaflet ni Vite).
- **Modulos:** `map.js` (unico con Leaflet, por `import()`), `puenteMapa.js`
  (cola), `ui.js` (DOM), `data.js`, `buscar.js`, `frescura.js` (puros, con
  tests), `api.js` (unico `fetch`, solo `data/`), `config.js`. Gate de
  imports en `scripts/verificar-modulos.mjs`.
- **Radio por magnitud:** `r = 3 px x 10^(0,2 (M - 3))`, acotado a 3-30 px. Ni
  lineal ni por energia; el porque esta en `src/config.js` (`RADIO`).
- **Color por profundidad:** clases 0-70 / 70-300 / >300 km (glosario del
  USGS) con tres colores Okabe-Ito ordenados por luminancia (`PROFUNDIDAD`).
- **Vista por defecto:** solo `en_venezuela` (ADR-003); interruptor "Region"
  para todo el rectangulo, que se dibuja discontinuo. Nota visible del limite
  del mar.
- **Mapa base:** sin teselas, con los GeoJSON de `data/` (ADR-008).
- **Trasplantes JARVIS:** tokens (ADR-004), chip de frescura (ADR-005, 13/13
  casos de la spec), buscador con `/` (ADR-006), carga diferida (ADR-007).
- **Tabla:** 100 filas por tanda, "Ver en el mapa" en cada fila.
- **Ventana del evento:** minima (magnitud, lugar, fecha UTC y de Caracas,
  profundidad, territorio, confianza, enlace al USGS). La ficha completa es de
  la Fase 3.

## Decisiones abiertas para Luis

1. **Proveedor de teselas** (ADR-008): sin teselas (entregado), OSM, o un
   proveedor con estilo oscuro.
2. **Paleta de profundidad** (amarillo / celeste / azul Okabe-Ito) y estilo de
   la zona en disputa (gris discontinuo): esteticas.
3. **Eventos de la zona en disputa en la vista "Solo Venezuela":** hoy no
   salen (lectura literal de "solo Venezuela"); salen en "Region" con su
   etiqueta. Alternativa: mostrarlos tambien en la vista por defecto,
   etiquetados.
4. **Sismos en el mar** (925 con "Venezuela" en el texto del USGS no salen en
   la vista por defecto): capa ZEE o franja costera (`FASE-1-DATOS.md`).
5. **Umbrales del chip de frescura:** 2 y 7 dias (ADR-005).
6. **Aceptar o no** los ADR 004-008 (Propuestos).
7. **URL del repositorio** para enlazar el `DISCLAIMER.md` completo (hoy el
   aviso se resume en un dialogo; `ENLACES.repo = null`).
