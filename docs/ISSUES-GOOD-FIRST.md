# Borradores de issues "good first issue"

> Redactados en la Fase 4 para que Luis los cree en GitHub con la etiqueta
> `good first issue` cuando el repo sea publico. Claude Code no los crea.
> Cada uno es pequeño, acotado y verificable con `npm test`.

## 1. Añadir tests de teclado al histograma por año

**Contexto:** las barras (`src/ui.js`, `moverEnHistograma`) se recorren con
flechas, Inicio y Fin. Hoy solo la logica de `resumenHistograma` tiene test.
**Tarea:** extraer el calculo del indice destino a una funcion pura y probarla
en `test/` (bordes: primera y ultima barra, tecla desconocida).
**Hecho cuando:** `npm test` pasa con los casos nuevos y el comportamiento no cambia.

## 2. Revisar la traduccion al inglés de la interfaz

**Contexto:** `src/i18n/en.json` es la traduccion de `es.json`.
**Tarea:** leer la interfaz en inglés y proponer correcciones de redaccion
(sin cambiar claves ni añadir cadenas).
**Hecho cuando:** el PR solo toca valores de `en.json` y `npm test` pasa (el test
de i18n comprueba que ambos diccionarios tienen las mismas claves).

## 3. Documentar como verificar un sismo contra el USGS

**Contexto:** el gate de la Fase 1 comparo 10 eventos con el sitio del USGS.
**Tarea:** escribir `docs/VERIFICAR-UN-EVENTO.md` (ES/EN) con los pasos para
tomar un id de la ficha, abrir su pagina del USGS y comparar magnitud, hora UTC
y profundidad con `data/eventos.json`.
**Hecho cuando:** el documento existe, usa un id real del archivo y esta
enlazado desde el README.
