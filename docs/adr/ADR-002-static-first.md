# ADR-002 — Static-first: Action diaria en vez de consulta en vivo al USGS

**Fecha:** 2026-09-29 · **Estado:** Aceptado (Luis, 2026-10-20)
en el STOP gate de la Fase 0

## Contexto

La ficha del proyecto ya describe la arquitectura como "static-first": una
GitHub Action diaria descarga los eventos del USGS a `data/eventos.json`, y la
web nunca consulta al USGS en cada visita. Este ADR deja razonada esa
decision, en vez de darla por sentada, siguiendo el mismo patron que
`orinoco-digital` uso en su ADR-003 para justificar por que Supabase dejo de
ser obligatorio.

La alternativa obvia seria que el propio navegador del visitante llamara
directamente a `https://earthquake.usgs.gov/fdsnws/event/1/query` cada vez
que abre la pagina.

## Decision

El `data/eventos.json` versionado en Git, generado por una GitHub Action que
corre una vez al dia, es la **fuente de verdad** que sirve la web. El
navegador del usuario final **nunca** llama al dominio `usgs.gov`.

## Por que

- **La sismicidad no cambia minuto a minuto para el uso de este panel.** Un
  refresco diario es mas que suficiente para un panel de divulgacion con
  datos historicos desde 1990; no es un sistema de alerta temprana (ver
  `DISCLAIMER.md` y `CLAUDE.md` regla 1) que necesitaria datos en vivo.
- **Protege al servicio del USGS y a la app por igual.** Si la pagina se
  vuelve popular, mil visitas siguen siendo una sola consulta diaria al
  USGS (la de la Action) en vez de mil consultas simultaneas de navegadores
  distintos. Ademas evita que un corte o una limitacion de tasa del lado del
  USGS tumbe la experiencia de quien visita la web.
- **Rendimiento en red movil venezolana.** Un archivo JSON estatico cacheado
  por el CDN es mucho mas rapido y predecible que depender de la latencia y
  disponibilidad de una API externa en cada carga.
- **El contrato de datos necesita un momento fijo de escritura.** El campo
  `ultima_verificacion` del contrato (ver `CLAUDE.md` seccion 5) tiene sentido
  precisamente porque existe un instante discreto —la corrida diaria de la
  Action— en el que los datos se congelan y se versionan. Con consulta en
  vivo, ese campo no tendria un valor estable que guardar.
- **Mismo patron que Orinoco.** `orinoco-digital` (ADR-003) ya establecio que
  el GeoJSON versionado en Git como fuente de verdad estatica resuelve de un
  golpe persistencia, limites de free tier y rendimiento. Este proyecto hereda
  el mismo razonamiento con una fuente distinta (USGS en vez de GEM/OSM) y con
  el matiz de que aqui los datos si cambian con el tiempo (nuevos sismos cada
  dia), de ahi la Action diaria en vez de una descarga unica.

## Consecuencias

- Los datos pueden tener hasta ~24 horas de desfase frente al catalogo en
  vivo del USGS. Aceptable para un panel de divulgacion, inaceptable para
  cualquier uso de alerta — por eso `DISCLAIMER.md` lo deja explicito.
- Un evento importante ocurrido despues de la ultima corrida de la Action no
  aparecera hasta el dia siguiente. Si esto resulta ser un problema real una
  vez publicado el proyecto, se puede subir la frecuencia del cron (p. ej.
  cada 6 horas) sin cambiar la arquitectura — solo el intervalo.
- Requiere que el validador de la Fase 1 corra en cada Action, para que un
  dato malformado del USGS no rompa `eventos.json` en produccion.

## Cuando reconsiderar

- Si el proyecto evoluciona hacia un caso de uso que si necesite frescura
  cercana al tiempo real (fuera del alcance actual, que explicitamente no es
  alerta temprana).
- Si `data/eventos.json` crece lo suficiente para volverse un problema de
  peso (mismo criterio que Orinoco fijo en su ADR-010 para decidir si hace
  falta un backend): en ese momento, evaluar particionar por año o por
  region en vez de abandonar static-first.
