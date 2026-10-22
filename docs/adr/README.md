# Registro de decisiones (ADR)

Cada decision de arquitectura vive en su **propio archivo**:
`ADR-NNN-slug.md`, numerado en orden de creacion. Esto es distinto de
`orinoco-digital`, que guarda todos sus ADR en un `DECISIONS.md` unico: el
estandar del portafolio pide un archivo por decision para los proyectos
nuevos (ver `C:\dev\...\scratchpad\estandar-comun.md`, regla 2).

Si una decision cambia, se crea un ADR nuevo que **supersede** al anterior;
no se reescribe el que ya existe. El historial es el valor.

## Indice

| ADR | Titulo | Estado |
|---|---|---|
| [ADR-001](ADR-001-leaflet.md) | Leaflet como motor de mapa | Aceptado (2026-10-20) |
| [ADR-002](ADR-002-static-first.md) | Static-first: Action diaria en vez de consulta en vivo | Aceptado (2026-10-20) |
| [ADR-003](ADR-003-region-rectangulo-etiqueta.md) | Region: rectangulo del USGS + etiqueta por poligono | Aceptada (2026-10-21) |
| [ADR-004](ADR-004-tokens-instrumento-oscuro.md) | Tokens "instrumento tecnico oscuro" para el shell (trasplante JARVIS) | Propuesto (gate F2) |
| [ADR-005](ADR-005-chip-frescura.md) | Chip de frescura del catalogo (trasplante JARVIS) | Propuesto (gate F2) |
| [ADR-006](ADR-006-buscador-atajo.md) | Buscador de eventos con atajo "/" (trasplante JARVIS) | Propuesto (gate F2) |
| [ADR-007](ADR-007-carga-diferida-leaflet.md) | Carga diferida de Leaflet (trasplante JARVIS) | Propuesto (gate F2) |
| [ADR-008](ADR-008-mapa-base-vectorial.md) | Mapa base vectorial propio mientras se decide el proveedor de teselas | Propuesto, decision de Luis pendiente |

## Plantilla

Copia esto para un ADR nuevo:

```markdown
# ADR-NNN — Titulo corto de la decision

**Fecha:** AAAA-MM-DD · **Estado:** Propuesto | Aceptada | Rechazada | Supersedida

## Contexto

Que problema o pregunta obliga a decidir. Que opciones se evaluaron.

## Decision

La decision en una o dos frases.

## Por que

Las razones, con referencias externas si aplica (documentacion oficial,
politicas de uso, comparativas).

## Consecuencias

Que se gana, que se sacrifica, que queda pendiente.

## Cuando reconsiderar

Que condicion futura haria revisar esta decision.
```

## Estados

- **Propuesto** — registrado por Claude Code, pendiente de que Luis lo
  apruebe en un STOP gate.
- **Aceptada** — aprobado por Luis, vigente.
- **Rechazada** — evaluado y descartado; se deja registrado para no repetir
  la discusion.
- **Supersedida** — reemplazado por un ADR posterior, que se enlaza aqui.
