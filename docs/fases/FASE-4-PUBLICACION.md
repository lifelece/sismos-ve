# Fase 4 — Publicacion

> **Gate de entrada:** Fases 1-3 cerradas.
> **Gate de salida:** checklist de gobernanza completo.

**Tiempo estimado:** 1 sesion · **Estado:** pendiente, no ejecutada

## Objetivo

Dejar el proyecto listo para compartirse publicamente: documentacion,
citacion, demo en vivo y las plantillas minimas de gobernanza open source que
el estandar del portafolio exige (regla 13).

## Entregables

- `README.md` bilingue **final** (el de la Fase 0 es minimo; aqui se amplia
  con capturas/GIF, arranque local, demo en vivo)
- `CITATION.cff` (sin `version`/`date-released`/DOI hasta que exista un tag;
  mismo criterio que Orinoco ADR-015 — no se inventan datos de version antes
  de que existan)
- `CONTRIBUTING.md` con la plantilla "Reportar dato incorrecto"
  (`.github/ISSUE_TEMPLATE/dato-incorrecto.yml`, igual patron que Orinoco)
- 3 issues marcados "good first issue"
- Demo desplegada (deploy lo corre Luis, no Claude Code — regla dura del
  estandar)
- Checklist final de gobernanza (ver abajo)

## Checklist de gobernanza (borrador, se confirma en esta fase)

- [ ] README bilingue con capturas o GIF
- [ ] Demo en vivo enlazada desde el README
- [ ] `LICENSE` (MIT) presente y enlazada
- [ ] `LICENSE-DATA` actualizada con la version final de la licencia de datos
      del USGS y de las teselas (si en Fase 0 quedo algo "pendiente de
      verificar", se cierra aqui)
- [ ] `DISCLAIMER.md` enlazado desde el pie de cada vista
- [ ] `CITATION.cff` valido
- [ ] `CONTRIBUTING.md` con plantilla de dato incorrecto
- [ ] 3 issues "good first issue" abiertos
- [ ] Auditoria de secretos antes del push publico (regla 12 del estandar):
      sin tokens, sin `.env` versionado, sin datos personales
- [ ] Atribucion USGS visible en pie de pagina y en README
- [ ] Fila registrada en el Banco de Historias de Notion (regla de cierre del
      estandar: "logros si, procesos internos del negocio no")

## Pasos para Claude Code (cuando se abra esta fase)

1. Revisar que las Fases 1-3 esten realmente cerradas (STOP gates marcados).
2. Ampliar el README con capturas/GIF (las provee Luis o se generan en la
   verificacion de telefono real de fases anteriores).
3. Escribir `CITATION.cff`, `CONTRIBUTING.md` y la plantilla de issue.
4. Redactar 3 issues "good first issue" (no crearlos en GitHub: eso es accion
   de Luis salvo que el estandar de la sesion diga lo contrario).
5. Correr la auditoria de secretos.
6. Preparar (no ejecutar) el comando de deploy para que lo corra Luis.
7. Detenerse para el checklist final.

## STOP GATE

Checklist completo, revisado por Luis. El deploy y la publicacion de issues
los ejecuta Luis.
