# Fases

Cada archivo es el guion operativo de una fase: objetivo, entregables, pasos
para Claude Code, criterios de salida y STOP gate.

**Una sesion de trabajo empieza leyendo el archivo de la fase activa.**

| Fase | Archivo | Estado |
|---|---|---|
| 0 — Setup | [FASE-0-SETUP.md](FASE-0-SETUP.md) | Cerrada (Luis, 2026-10-20) |
| 1 — Datos | [FASE-1-DATOS.md](FASE-1-DATOS.md) | Cerrada (Luis) |
| 2 — Mapa + filtros | [FASE-2-MAPA-FILTROS.md](FASE-2-MAPA-FILTROS.md) | Cerrada (Luis; PR #1 mergeado 2026-10-22) |
| 3 — Estadisticas | [FASE-3-ESTADISTICAS.md](FASE-3-ESTADISTICAS.md) | Cerrada (Luis, PR #3, 2026-10-26) |
| 4 — Publicacion | [FASE-4-PUBLICACION.md](FASE-4-PUBLICACION.md) | **En revision** — rama `f4-publicacion`, esperando el STOP gate |

## La regla del STOP gate

Al terminar una fase, **para**. No encadenes la siguiente por inercia.

El gate existe para forzar la verificacion (en el sitio del USGS, o en
telefono real segun la fase) y para que las decisiones se tomen con la cabeza
fria, no en medio del impulso de seguir codeando.

## Diferencia con Orinoco Digital

Este proyecto hereda el estandar de Orinoco (mismo formato de fase, mismo
`docs/adr/`), pero con dos diferencias deliberadas:

1. **Licencia de codigo MIT**, no Apache-2.0 (lo pide la ficha del proyecto y
   el estandar del portafolio para proyectos nuevos).
2. **Los ADR viven uno por archivo** en `docs/adr/ADR-NNN-slug.md`, no en un
   `DECISIONS.md` unico como en Orinoco.
