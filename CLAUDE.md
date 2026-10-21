# sismos-ve — Contexto para Claude Code

> Lee este archivo COMPLETO al inicio de cada sesion. Es la memoria del
> proyecto y la principal defensa contra alucinaciones.

## Que es

Panel web de actividad sismica en Venezuela con datos publicos del **Servicio
Geologico de Estados Unidos (USGS)**: mapa, linea de tiempo, estadisticas y
"sismos cerca de mi ciudad".

Proyecto personal, en solitario, tiempo parcial. Autor: Luis Carlos Vasquez.
Quick win tecnico (1 semana de alcance) que reutiliza lo aprendido en Orinoco
Digital (mapas, contrato de datos, CI) y conecta con la meta de Luis de
Ingenieria Geologica.

**Encuadre honesto:** es un panel de divulgacion con datos publicos
verificables. **NO es un sistema de alerta temprana ni de prediccion
sismica.** No debe usarse para decisiones de seguridad, evacuacion ni
respuesta a emergencias. Ver `DISCLAIMER.md`.

Este proyecto es publico y open source: **no toca nada de los negocios del
autor** (ni codigo, ni datos, ni menciones), y **nada del uso privado del
autor entra al repo** — la lista concreta de que queda fuera vive fuera de
este repositorio.

## Rol de Luis (product owner)

Define funcionalidades, valida los datos contra el sitio oficial del USGS
(https://earthquake.usgs.gov/) y aprende lo basico de sismologia (magnitud,
profundidad, fallas) para poder explicar el proyecto. Aprueba cada STOP gate
y prueba en telefono real.

## Stack (NO cambiar sin aprobacion explicita — ver ADR-001)

- **Frontend:** Vite + Vanilla JS ES6 (modulos nativos) + Tailwind CSS
- **Mapa:** Leaflet — **ligero**, decision registrada en
  `docs/adr/ADR-001-leaflet.md` (estado: Aceptado, 2026-10-20)
- **Datos:** GeoJSON del servicio FDSN de eventos del USGS
  (`https://earthquake.usgs.gov/fdsnws/event/1/query`), descargado por una
  GitHub Action **diaria** y versionado en `data/eventos.json`
- **i18n:** ES/EN desde el primer commit, sin libreria (diccionarios + `t(clave)`)
- **Deploy:** pendiente de decidir en fase de publicacion (candidato: Vercel,
  coherente con Orinoco)

**Prohibido sin aprobacion:** React, Vue, Svelte u otro framework; Cesium,
MapLibre GL JS u otro motor de mapas distinto de Leaflet (ver ADR-001);
cualquier dependencia nueva.

## Reglas especificas de este proyecto

### 1. No es un sistema de alerta temprana

Ningun texto, notificacion ni diseno de la interfaz debe sugerir que esta app
avisa de un sismo en curso o inminente. El aviso de `DISCLAIMER.md` va
enlazado desde el pie de cada vista relevante.

### 2. Atribucion al USGS obligatoria y visible

Todo dato mostrado procede del USGS. El pie de pagina y el `README.md` deben
mostrar el credito ("Datos: U.S. Geological Survey") con enlace a la fuente,
aunque el USGS no lo exige legalmente por ser dominio publico (ver
`LICENSE-DATA`). Es una decision de honestidad e integridad de fuente, no solo
legal.

### 3. La web NUNCA consulta al USGS en tiempo de ejecucion

El frontend **solo** lee `data/eventos.json`, servido como archivo estatico
desde el propio repo/CDN. La unica pieza que habla con la API FDSN del USGS es
la GitHub Action diaria (Fase 1). Esto evita exponer al usuario a la caida o
al limite de uso del servicio del USGS y mantiene la app rapida y cacheable.
Ningun modulo de `src/` debe hacer `fetch` a un dominio `usgs.gov`.

### 4. Sin geolocalizacion del usuario

La funcionalidad "cerca de mi ciudad" (func. 4 de la ficha) se resuelve con un
**selector de ciudad** de una lista curada con coordenadas conocidas, nunca con
`navigator.geolocation` ni con la IP del visitante. Cero permisos del
navegador, cero datos personales.

### 5. Contrato de datos (propuesta, a validar por Luis)

El estandar del portafolio exige que todo registro lleve `fuente`,
`confianza` y `ultima_verificacion`. Los eventos del USGS ya traen sus propios
campos de procedencia dentro de `properties`, asi que el contrato de
sismos-ve **envuelve** el evento original sin reescribirlo, mapeando:

| Campo del contrato | De donde sale | Nota |
|---|---|---|
| `fuente` | Fijo: `"USGS FDSN Event Web Service"`, mas `properties.net` y `properties.sources` del propio evento (que red/es lo reporto: `us`, `pr`, `nc`...) | El USGS agrega redes contribuyentes; conservamos cual fue |
| `confianza` | Derivado de `properties.status` del USGS: `"reviewed"` -> `alta`, `"automatic"` -> `media` | Es el campo mas cercano que el USGS publica a una senal de confianza. Queda **a verificar por Luis** si esta escala (alta/media/baja) es la correcta para sismologia — ver Fase 1 |
| `ultima_verificacion` | Fecha (ISO 8601, solo fecha) en que la GitHub Action diaria corrio y escribio `eventos.json` | Distinta de `properties.updated` del USGS (cuando el USGS revisó el evento por ultima vez): una es "cuando nosotros lo bajamos", la otra "cuando el USGS lo toco" |

Desde el gate de la Fase 1 (Luis, 2026-10-21, ADR-003) cada evento lleva
ademas dos etiquetas de territorio, calculadas en la Action contra los
poligonos versionados en `data/`:

| Campo | De donde sale | Nota |
|---|---|---|
| `en_venezuela` | Punto en poligono contra la frontera **terrestre** de Venezuela con islas (`data/limites-venezuela.geojson`, geoBoundaries ADM0) | Booleano. Un epicentro en el mar queda en `false` (limite conocido) |
| `zona_disputada` | Punto en poligono contra la zona en disputa de la Guayana Esequiba (`data/zona-disputada.geojson`, Natural Earth) | Booleano, excluyente con `en_venezuela`. Trato neutral: la clasificacion es de la fuente |

**No se descarta ningun campo original del USGS** (`mag`, `place`, `time`,
`depth`, `magType`, `url`, `title`, etc.): el contrato se anade, no reemplaza.
El validador de la Fase 1 falla si un registro no tiene los tres campos del
contrato y las dos etiquetas, ademas de magnitud y coordenadas.

Esta propuesta queda para que Luis la apruebe o la ajuste en el gate de la
Fase 0 antes de que la Fase 1 la implemente.

### 6. No inventar datos

En ninguna fase se inventan sismos, coordenadas, magnitudes ni el "sismo de
2026" mencionado en la ficha del proyecto: ese evento no se documenta con
detalle hasta que exista una fuente verificable. Si falta un dato, se usa un
placeholder visible o se pregunta en una frase.

### 7. USGS vs FUNVISIS

Los datos de este panel son del USGS (catalogo global). La red venezolana de
referencia es FUNVISIS, y sus cifras (magnitud, epicentro, profundidad) pueden
diferir de las del USGS para el mismo evento. Esto se documenta en
`DISCLAIMER.md`, no se oculta ni se promedia.

### 8. i18n desde el primer commit

Todo texto visible de la interfaz pasa por un helper `t(clave)` con
diccionarios `es.json`/`en.json`, igual que en Orinoco (ADR-005 de ese
proyecto). Nunca cadenas sueltas en la UI.

### 9. Neutralidad

Hechos con fuente, sin opinion politica. Ningun comentario sobre gestion de
emergencias del gobierno de Venezuela ni de ningun otro actor.

## Estructura prevista (se crea a partir de la Fase 1, no en la Fase 0)

```
sismos-ve/
  CLAUDE.md  README.md  DISCLAIMER.md  LICENSE  LICENSE-DATA  .gitignore
  docs/
    fases/   (guion de cada fase, este archivo describe el mapa completo)
    adr/     (una decision por archivo: ADR-001-leaflet.md, ...)
  .github/
    workflows/           # Accion diaria de descarga (Fase 1)
    ISSUE_TEMPLATE/       # Plantilla "Reportar dato incorrecto" (Fase 4)
  data/
    eventos.json          # Catalogo curado, fuente de verdad, versionado en Git
  src/
    main.js                # Punto de entrada, orquesta
    config.js               # Constantes, ciudades curadas, entorno
    map.js                   # Unico modulo que importa Leaflet
    api.js                    # Lee data/eventos.json -> siempre FeatureCollection
    data.js                    # Validacion, normalizacion, contrato de datos
    ui.js                       # DOM: linea de tiempo, filtros, estadisticas, ficha
    i18n/                       # es.json, en.json, t(clave)
  scripts/
    fetch-eventos.mjs           # Corre en la Action; consulta FDSN -> data/eventos.json
    validate-eventos.mjs         # Validador de contrato, falla el CI si falta un campo
```

Este arbol es una prevision para orientar las fases siguientes. La Fase 0 NO
crea `src/`, `data/` ni `.github/`: eso empieza en la Fase 1.

## Mapa de fases

| Fase | Que entrega | Gate |
|---|---|---|
| F0 — Setup | Repo, `CLAUDE.md`, ADR-001, gobernanza (`LICENSE*`, `DISCLAIMER.md`, `README.md`) | Estructura revisada por Luis |
| F1 — Datos | GitHub Action diaria + `data/eventos.json` + validador en CI | Comparar 10 eventos con el sitio del USGS |
| F2 — Mapa + filtros | Mapa con circulos por magnitud/profundidad; deslizador de tiempo y filtro por magnitud | Telefono real |
| F3 — Estadisticas | Histograma por año, top 10, "cerca de mi ciudad", ficha del evento | Telefono real |
| F4 — Publicacion | README bilingue final, demo, `CITATION.cff`, checklist de gobernanza | Checklist |

El guion operativo de cada fase esta en `docs/fases/`. **Una sesion de
trabajo empieza leyendo el archivo de la fase activa.**

## Riesgos conocidos

- **No es alerta temprana.** Repetido a proposito: es el riesgo de mayor
  impacto si alguien malinterpreta el proyecto.
- **USGS puede diferir de FUNVISIS** para el mismo evento venezolano.
- El rectangulo de la consulta FDSN incluye paises vecinos y mar: la vista
  por defecto filtra por `en_venezuela` (ADR-003), y los sismos en el mar
  frente a la costa quedan fuera de esa vista hasta que exista una capa de
  zona economica exclusiva (ver `docs/fases/FASE-1-DATOS.md`).

## Reglas duras heredadas del estandar del portafolio

1. Spec antes que codigo: la ficha de Notion manda hasta que un ADR diga otra
   cosa.
2. El repo manda: `CLAUDE.md` + `docs/fases/` + `docs/adr/` (un archivo por
   decision, a diferencia de Orinoco que los tiene en un solo `DECISIONS.md`).
3. STOP gate al final de cada fase. No se encadenan fases por iniciativa
   propia.
4. Nada se commitea sin que Luis revise el diff. Commits pequeños y
   frecuentes.
5. Gate en telefono real, datos moviles, DevTools cerrado, para cualquier
   interfaz web.
6. Static-first: sin backend hasta que un ADR lo justifique.
7. Contrato de datos obligatorio (ver seccion 5 arriba). Validador en CI.
8. Ninguna dependencia nueva sin ADR. Presupuesto: 150 KB comprimidos de JS
   propio (igual que Orinoco, ver `docs/adr/ADR-001-leaflet.md`).
9. i18n ES/EN desde el primer commit.
10. Python no esta instalado en la laptop: scripts en Python corren en GitHub
    Actions o Colab; lo local, en Node.
11. Tokens y claves restringidos por dominio; nunca en el bundle ni en el
    repo.
12. Auditoria de secretos antes de cada push publico.
13. Publicacion (Fase 4): README bilingue con GIF, demo en vivo, licencia MIT
    para el codigo, `CITATION.cff`, `CONTRIBUTING.md` con plantilla "Reportar
    dato incorrecto", 3 issues "good first issue".
14. Bitacora en Notion al cierre de cada sesion.
15. Neutralidad: hechos con fuente, sin opinion politica.

## Al empezar una sesion

1. Lee este archivo completo.
2. Lee el archivo de la fase activa en `docs/fases/`.
3. Confirma en una frase que fase vas a trabajar antes de escribir codigo.
4. Si la fase tiene un STOP gate pendiente de aprobacion, no avances a la
   siguiente sin que Luis lo cierre explicitamente.
