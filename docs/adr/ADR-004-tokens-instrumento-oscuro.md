# ADR-004 — Tokens "instrumento tecnico oscuro" para el shell de la interfaz

**Fecha:** 2026-10-21 · **Estado:** Propuesto (se acepta en el STOP gate de la
Fase 2)

## Contexto

La Fase 2 crea la primera interfaz del proyecto. Hace falta un sistema de
color, tipografia y movimiento para el "chrome" (cabecera, panel de filtros,
tabla, pie). Ya existe uno probado en produccion para un panel de datos
geograficos sobre Venezuela con el mismo stack: el de orinoco-digital,
extraido como nucleo neutral a `arsenal/tokens/orinoco-cuenca.json`.

## Decision

El shell de sismos-ve usa los tokens de `orinoco-cuenca.json`, declarados en el
bloque `@theme` de `src/style.css` para que Tailwind genere las utilidades
(`bg-shell`, `text-hi`, `border-trazo`...). Sin fuentes web: pila del sistema
para el texto y pila monoespaciada con `tabular-nums` para cifras.

## Por que

- Panel de datos, no folleto: fondo oscuro de bajo brillo, cifras en mono
  alineadas, un solo acento de texto. Contrastes WCAG ya calculados en el
  nucleo (texto principal 16,27:1 y secundario 6,53:1 sobre `shell`).
- Cero KB de fuentes en red movil venezolana (mismo argumento que ADR-014 de
  orinoco-digital).
- Ya probado en produccion: no se reinventa (JARVIS).

## Trasplante JARVIS

- **Capacidad de origen:** Sistema de tokens "instrumento tecnico oscuro" sin
  fuentes web + clamp() + oklch() · origen Orinoco Digital (Publico).
- **Tipo:** Patron / spec reimplementado (tokens JSON aplicados como CSS).
- **Ley 1 (direccion):** publico -> publico. Permitido.
- **Ley 2 (stacks):** mismo stack (Vite + Vanilla ES6 + Tailwind 4); aun asi
  viaja el artefacto agnostico (JSON DTCG), no el CSS del origen.
- **Ley 3 (nucleo neutral):** `arsenal/tokens/orinoco-cuenca.json`. La
  armadura de sismos-ve es la paleta de DATOS (profundidad y tamaño por
  magnitud, en `src/config.js`), que no sale del nucleo.
- **Que viaja:** `shell`, `elev`, `trazo`, `hi`, `lo`, `tinta`, `tinta-baja`,
  `activo`, `alerta`, la pila mono, las duraciones y la curva `cuenca`.
  **Que no viaja:** `crudo`, `gas`, `refino` (semantica del sector energetico).
  El ambar del chip de frescura se declara como `aviso` con el mismo valor que
  el origen usaba para ese estado (en orinoco el chip pinta el aviso con
  `crudo`): se reasigna por semantica, no se reutiliza con otro significado.
  Las reglas del origen se respetan: `tinta` solo texto, `tinta-baja` solo
  lineas, ninguno de los dos pinta datos.
- **Fases y gates:** T1 = tokens en `style.css` + shell de la Fase 2, gate en
  telefono real (STOP gate de la Fase 2).

## Consecuencias

- Identidad visual compartida con orinoco-digital (mismo autor, misma familia
  de paneles). Si Luis quiere una identidad propia para sismos-ve, se cambia el
  bloque `@theme` sin tocar el HTML.
- La paleta de datos (profundidad) es propia y queda como decision estetica
  abierta para Luis (ver `docs/fases/FASE-2-MAPA-FILTROS.md`).

## Verificado

Pendiente del STOP gate de la Fase 2 (capturas previas a 390 px en la misma
fase).

## Cuando reconsiderar

- Si Luis pide una identidad visual propia para sismos-ve.
- Si el nucleo de arsenal cambia de version: se compara valor a valor.
