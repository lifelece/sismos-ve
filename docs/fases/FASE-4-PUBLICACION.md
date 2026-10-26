# Fase 4 — Publicacion

> **Gate de entrada:** Fases 1-3 cerradas.
> **Gate de salida:** checklist de gobernanza completo.

**Tiempo estimado:** 1 sesion · **Estado:** preparada en la rama `f4-publicacion` (2026-10-26); **esperando el STOP gate de Luis**

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

- [ ] README bilingue con capturas o GIF — README final hecho; **falta la captura/GIF (Luis, telefono real)**, hay un comentario placeholder
- [ ] Demo en vivo enlazada desde el README — **Luis**: placeholder `[URL de la demo]` hasta desplegar
- [x] `LICENSE` (MIT) presente y enlazada
- [x] `LICENSE-DATA` actualizada con la version final de la licencia de datos
      del USGS y de las teselas (si en Fase 0 quedo algo "pendiente de
      verificar", se cierra aqui)
- [x] `DISCLAIMER.md` enlazado desde el pie de cada vista (boton del pie -> dialogo -> enlace al archivo, `ENLACES.repo` fijado)
- [x] `CITATION.cff` valido (sin version/fecha/DOI hasta el primer tag)
- [x] `CONTRIBUTING.md` con plantilla de dato incorrecto
- [ ] 3 issues "good first issue" abiertos — borradores en `docs/ISSUES-GOOD-FIRST.md`; **crearlos es de Luis**
- [x] Auditoria de secretos antes del push publico (regla 12 del estandar):
      sin tokens, sin `.env` versionado, sin datos personales
- [x] Atribucion USGS visible en pie de pagina y en README
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

## Auditoria de secretos y privacidad (2026-10-26, rama f4-publicacion)

- Privacidad (reglamento): el `grep -rniE` de privacidad del reglamento multiagente (excluyendo node_modules, dist y .git) -> sin coincidencias (arbol de trabajo); en el historial (`git log --all -p` filtrado con los mismos terminos) -> 0.
- Secretos: `git grep` de patrones de claves (sk/ghp/AKIA/AIza/PRIVATE KEY/asignaciones token|secret|password) -> sin coincidencias; historial -> 0 claves; ningun `.env*`/`.pem` versionado ni en el historial; `.gitignore` cubre `.env*`.
- Regla 3: ningun `fetch` a `usgs.gov` en `src/`.

## H-13 — accesibilidad del histograma (nota del enlace de JARVIS)

Texto alternativo con resumen calculado (`resumenHistograma`: total, año con mas sismos, magnitud maxima); barras alcanzables con teclado (una parada de tabulador, flechas/Inicio/Fin) que anuncian año, cantidad, porcentaje y rango; la barra del año cima usa `tinta`. Contraste de las barras con los tokens existentes: `lo` #8b98a5 contra `shell` 6,53:1 (≥3:1); `tinta` #7fa3b5 contra `shell` 7,15:1. Bins abiertos: el histograma por año no tiene; el unico bin abierto (profundidad "más de 300 km") ya esta nombrado en la leyenda.

## Para Luis (no lo hace Claude Code)

1. Hacer publico el repo (Settings -> Danger zone) tras revisar el diff.
2. Desplegar: conectar Vercel y desplegar tu mismo; poner la URL en el README (`[URL de la demo]`).
3. Aportar captura/GIF desde el telefono real y enlazarla en el README.
4. Crear los 3 issues de `docs/ISSUES-GOOD-FIRST.md` con la etiqueta `good first issue`.
5. Tag/release y DOI solo si lo decides (entonces añadir `version`/`date-released` a `CITATION.cff`).
6. Fila del Banco de Historias en Notion.

## STOP GATE

Checklist completo, revisado por Luis. El deploy y la publicacion de issues
los ejecuta Luis.
