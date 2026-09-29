# Fase 3 — Estadisticas

> **Gate de entrada:** Fase 2 cerrada.
> **Gate de salida:** verificado en telefono real, datos moviles, DevTools
> cerrado.

**Tiempo estimado:** 1-2 sesiones · **Estado:** pendiente, no ejecutada

## Objetivo

Implementa las funcionalidades 3, 4 y 5 de la ficha del proyecto:

3. **Histograma por año y top 10 de mayor magnitud** — sobre el mismo
   `eventos.json`, sin red.
4. **"Cerca de mi ciudad"** — radio en km desde una ciudad elegida por el
   usuario en un selector, **sin pedir ubicacion** (regla 4 de `CLAUDE.md`:
   nunca `navigator.geolocation`). Requiere una lista curada de ciudades
   venezolanas con coordenadas conocidas y su propia fuente (candidato:
   capitales de estado; Luis decide el alcance de la lista).
5. **Ficha del evento** con enlace a la pagina oficial del evento en el USGS
   (`properties.url` que ya trae cada feature del GeoJSON original — no hay
   que construirlo a mano).

## Entregables

- `src/config.js` — lista curada de ciudades (`CIUDADES`), con fuente de las
  coordenadas documentada
- `src/data.js` — calculo de distancia (formula haversine, sin dependencia:
  es una funcion pura de unas pocas lineas), agregaciones para el histograma
  y el top 10
- `src/ui.js` — histograma, top 10, selector de ciudad + radio, ficha del
  evento con el enlace al USGS

## Pasos para Claude Code (cuando se abra esta fase)

1. Confirmar con Luis el alcance de la lista de ciudades (¿23 capitales de
   estado? ¿mas?) y la fuente de sus coordenadas.
2. Implementar el calculo de distancia y las agregaciones en `data.js`
   (mantenerlo sin dependencias: sin red, sin DOM, igual que Orinoco).
3. Implementar la UI de las tres funcionalidades.
4. Verificar que la ficha del evento enlaza correctamente al USGS para varios
   casos (evento reciente, evento viejo, evento revisado vs. automatico).
5. Verificar en escritorio, luego en telefono real con DevTools cerrado.
6. Detenerse para el STOP gate.

## Criterios de salida

- [ ] Histograma por año funcional
- [ ] Top 10 de mayor magnitud funcional
- [ ] "Cerca de mi ciudad" funcional, sin pedir permisos de ubicacion
- [ ] Ficha del evento con enlace correcto a la pagina oficial del USGS
- [ ] Lista de ciudades con fuente documentada

## STOP GATE

Verificado por Luis en telefono real, con datos moviles y DevTools cerrado.
