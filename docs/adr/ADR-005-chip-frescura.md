# ADR-005 — Chip de frescura del catalogo

**Fecha:** 2026-10-21 · **Estado:** Aceptada (Luis, 2026-10-21; estetica aprobada en el gate de la
Fase 2)

## Contexto

El catalogo se refresca con una Action diaria que abre un PR; Luis lo mergea a
mano (ADR-002). Si deja de mergear, la web sigue en linea mostrando un catalogo
viejo como si fuera de hoy. Un panel de datos que no avisa de su edad es peor
que uno caido.

## Decision

El pie del panel muestra un chip con la edad de
`metadata.ultima_verificacion` de `data/eventos.json`:

| Estado | Edad (dias, exacta) | Color |
|---|---|---|
| `fresca` | <= 2 | `activo` |
| `atencion` | > 2 y <= 7 | `aviso` |
| `vencida` | > 7 | `alerta` |
| nulo | sin fecha legible | sin color de alerta |

Umbrales en `src/config.js` (`FRESCURA`), con este porque: la Action corre a
diario, asi que mas de 2 dias significa que se perdio al menos un ciclo (o un
PR sin mergear); una semana sin datos nuevos ya no es "el catalogo de hoy".
**Umbrales aceptados por Luis el 2026-10-21**; no son una cifra de la fuente.

## Trasplante JARVIS

- **Capacidad de origen:** Chip de frescura (verde / ambar 90 d / rojo 180 d)
  · origen Orinoco Digital (Publico).
- **Tipo:** Patron / spec reimplementado.
- **Ley 1 (direccion):** publico -> publico. Permitido.
- **Ley 2 (stacks):** mismo stack; viaja la spec neutral
  (`arsenal/specs/chip-frescura/SPEC.md` R1-R9) y sus casos de tabla.
- **Ley 3 (nucleo neutral):** `arsenal/specs/chip-frescura/`. `casos.json`
  se copia sin cambios a `test/casos-chip-frescura.json` (fechas ficticias,
  neutro) y `test/frescura.test.mjs` exige los 13 casos. Armadura de
  sismos-ve: unidad dias, umbrales 2/7, textos ES/EN, enlace a la
  documentacion del servicio FDSN del USGS (R9).
- **Que viaja:** la funcion pura `frescura(marca, ahora, escala)` con
  comparacion estricta sobre la edad exacta (R4), marca futura = edad 0 (R3),
  recorte a milisegundos (R7), accesibilidad (R8). **Que no viaja:** los
  umbrales de otros destinos, el codigo del origen (que compara dias enteros).
- **Fases y gates:** T1 = funcion pura + casos de tabla (gate: `npm test`);
  T2 = chip en el pie (gate: STOP gate de la Fase 2 en telefono real).

## Consecuencias

- Un catalogo sin mergear se vuelve ambar a los 2 dias y rojo a la semana: la
  propia interfaz le recuerda a Luis el PR pendiente.
- Con `ultima_verificacion` en fecha (sin hora), la edad se mide desde la
  medianoche UTC de ese dia: un dato de hoy puede mostrar "hoy" hasta 24 h.

## Verificado

`npm test` (13/13 casos de `casos.json`), salida en el reporte de la Fase 2.

## Cuando reconsiderar

- Si la Action pasa a correr cada 6 h (ADR-002, "Cuando reconsiderar"): escala
  en horas.
- Si Luis automatiza el merge del PR diario.
