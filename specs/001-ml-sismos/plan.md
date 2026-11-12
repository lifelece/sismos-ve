# Plan 001 — Patrones estadísticos del catálogo

> Spec: `specs/001-ml-sismos/spec.md` (BORRADOR v2, 2026-11-08) · Gate del contrato cerrado (`CLAUDE.md:94`); campos derivados aprobados por Luis el 2026-11-08

## 1. Enfoque

Todo el cálculo corre **fuera del navegador**, en Node, el runtime del proyecto (`package.json:8-10` exige Node ≥22; `npm test` = `node --test`, `package.json:16`; Python no está en la laptop, regla dura 10). Un script lee `data/eventos.json`, aplica tres pasos y escribe `data/patrones.json`, versionado como el catálogo y servido como estático (ADR-002, regla 3). El navegador solo lo lee y lo pinta.

1. **Declustering de Gardner-Knopoff** (ventanas espacio-temporales según la magnitud), solo superficiales.
2. **DBSCAN con distancia haversine**, por clase de profundidad, con **análisis de sensibilidad** (Jaccard con el radio ×0,8 y ×1,2) y **control aleatorio** por clase (control débil, spec §3).
3. **Gutenberg-Richter por zona**: Mc por máxima curvatura + corrección, b por máxima verosimilitud (Aki 1965), σ de Shi-Bolt e IC 95 % por bootstrap de percentiles con semilla, todo con la familia de magnitud mayoritaria.

Por qué no en el navegador: sería O(n²) en el teléfono en cada carga y, si siguiera a los filtros, invitaría a buscar patrones a la carta. Con parámetros congelados y archivo versionado, cada cifra es revisable en el PR diario.

Sin librerías: JS puro, reutilizando `distanciaKm` (haversine, radio medio IUGG, `src/data.js:144-154`) y `claseProfundidad` (`src/data.js:76-78`). Context7 no estaba disponible: las alternativas con librería (`density-clustering` de npm, `sklearn.cluster.DBSCAN(metric="haversine")`, `sklearn.cluster.HDBSCAN`) quedan **no verificadas** y no se proponen.

## 2. Archivos

Rutas verificadas con Glob el 2026-11-08 en `C:\dev\sismos-ve` (rama `main`).

| Ruta | Crear / Cambiar | Para qué |
|---|---|---|
| `scripts/ml/azar.mjs` | Crear | Generador con semilla (mulberry32, 32 bits) y derivación de semillas por clave (FNV-1a 32 bits). Única fuente de azar. Ambos algoritmos citados de memoria: **no verificados**; T02 los contrasta con su descripción pública y con vectores de prueba. |
| `scripts/ml/parametros.mjs` | Crear | Constantes congeladas con su porqué y su cita (estilo de `src/config.js`). |
| `scripts/ml/declustering.mjs` | Crear | Gardner-Knopoff. |
| `scripts/ml/dbscan.mjs` | Crear | DBSCAN haversine con rejilla, Jaccard, sensibilidad. |
| `scripts/ml/gutenberg-richter.mjs` | Crear | Familias, Mc, b, σ, bootstrap. |
| `scripts/ml/serializar.mjs` | Crear | Redondeo fijo y JSON con orden de claves fijo. |
| `scripts/analizar-patrones.mjs` | Crear | CLI `data/eventos.json` → `data/patrones.json`; control aleatorio. Mecanismo de RF-26: escribe a `data/patrones.json.tmp`, llama a `validarPatrones` sobre ese temporal y, solo sin errores, lo renombra sobre `data/patrones.json` (`fs.rename`); si algo falla, borra el temporal, no toca el archivo y sale con código ≠ 0. |
| `scripts/validate-patrones.mjs` | Crear | Validador: errores (RF-22) y avisos (RF-33); CLI y función exportada. Usa `node:crypto` para la huella. |
| `data/patrones.json` | Crear (generado) | Resultado versionado (§3.4). |
| `test/sintetico.mjs` | Crear | Catálogos sintéticos (§3.7). |
| `test/azar.test.mjs`, `test/gutenberg-richter.test.mjs`, `test/declustering.test.mjs`, `test/dbscan.test.mjs`, `test/patrones.test.mjs`, `test/validate-patrones.test.mjs`, `test/patrones-ui.test.mjs` | Crear | Ver §4. |
| `src/patrones.js` | Crear | Lógica pura de la interfaz (sin DOM, sin `fetch`, sin Leaflet). |
| `src/api.js` | Cambiar | `leerPatrones()` con `import ... from "../data/patrones.json?url"` (patrón de `src/api.js:10-21`). |
| `src/ui.js` | Cambiar | Bloque "Patrones" dentro del panel de estadísticas, tras `pintarStats()` (`src/ui.js:544`). |
| `src/main.js` | Cambiar | Cargar patrones tras el catálogo, sin bloquear el primer pintado. |
| `src/i18n/es.json`, `src/i18n/en.json` | Cambiar | Claves `patrones.*`. |
| `package.json` | Cambiar | Scripts `data:patrones`, `data:validate-patrones`, `medir:js` (sin dependencias). |
| `scripts/medir-js.mjs` | Crear (T09, antes de tocar la interfaz) | Mide el JS propio gzip de `dist/` con `node:zlib`; guarda la línea base y sale con código 1 si se supera RNF-4. |
| `.github/workflows/fetch-eventos.yml` | Cambiar | Tras validar el catálogo (l.48-49): analizar + validar patrones con `continue-on-error`; anotar el resultado en el cuerpo del PR (RF-26). |
| `.github/workflows/validar-datos.yml` | Cambiar | Validar `data/patrones.json` (junto a l.42) y añadirlo a `paths` (l.14, l.21). |
| `docs/adr/ADR-010-patrones-estadisticos.md`, `docs/adr/README.md` | Crear / Cambiar | Decisión, constantes con cita, limitaciones. |
| `DISCLAIMER.md` | Cambiar | Párrafo ES/EN sobre la sección de patrones. |
| `CLAUDE.md` | Cambiar | Árbol de estructura y una línea en §5 sobre datos derivados. |
| `docs/PERFORMANCE_BUDGET.md` | Cambiar | Medición tras el build. |

No se tocan `src/map.js` ni `scripts/verificar-modulos.mjs`; `src/patrones.js` cumple sus reglas (`scripts/verificar-modulos.mjs:7-15`).

## 3. Contratos y datos

### 3.1 Entrada
`data/eventos.json`: 4358 features; `magType` mb 2552, mww/mwr/mwc/mwb/mw 373, ml/md 1426, otros ~7 (Grep, 2026-11-08). 100 % `status: reviewed` (`docs/fases/FASE-1-DATOS.md:193`): el análisis **no** filtra por `confianza` y registra `n_automatic`. Lectura con `normalizarEvento` (`src/data.js:30`). Orden canónico antes de todo paso: `tiempo` ascendente, luego `id` (comparación de cadenas por código).

### 3.2 Firmas (forma, no código)
- `semillaDe(base: number, clave: string) → uint32` (FNV-1a de `${base}|${clave}`); `crearAzar(semilla) → { siguiente(): [0,1), entero(max), remuestrear(array) }`.
- `familiaDe(magType: string|null) → "Mw"|"mb"|"ML-Md"|null` (spec §3).
- `declusterGK(eventos, parametros) → Map<id, { rol: "fondo"|"secuencia"|"no_aplica", principal: id|null }>`.
- `dbscan(puntos, { epsKm, minPts }) → { etiquetas: Int32Array (−1 = ruido), k }`, vecindad por rejilla de celdas de lado ≥ `epsKm`.
- `sensibilidad(puntos, base, { epsKm, minPts, factores: [0.8, 1.2] }) → Array<{ grupo, jaccardMin }>`.
- `estimarMc(mags, { dM, correccion }) → number`; `estimarB(mags, mc, dM) → { b, sigma, n }`.
- `bootstrapGR(mags, { B, azar, dM, correccion }) → { mcIc95, bIc95, descartadas }`.
- `elegirFamilia(eventosZona, parametros) → { familia, mc, n } | null`.
- `analizar(coleccion, parametros) → objetoPatrones` (puro); `serializar(objeto) → string`.
- `validarPatrones(patrones, coleccion) → { errores: string[], avisos: string[] }`.
- En `src/patrones.js`: `zonasVisibles(patrones, vista)`, `coincideConCatalogo(patrones, { n, verificacion })` (compara `catalogo_n` y `ultima_verificacion`, **sin** SHA-256 en el navegador), `formatoNumero(x, decimales, idioma)`, `formatoB(zona, idioma)`.

### 3.3 Método, fórmulas y constantes
Las fórmulas y constantes citadas se verifican en T01 **solo contra fuentes de acceso abierto** (artículos CORSSA: van Stiphout et al. 2012 "Seismicity declustering" y Mignan y Woessner 2012 "Estimating the magnitude of completeness"; la página "Magnitude Types" del USGS; la documentación de `clusterboot` del paquete R `fpc` en CRAN para los umbrales de Jaccard). Si una queda sin verificar, T01 para y se pregunta a Luis.

| Pieza | Decisión | Fuente (a verificar en T01) |
|---|---|---|
| b (MLE) | b = log10(e) / (M̄ − (Mc − ΔM/2)) | Aki (1965), [MW12] Ec. 2; la atribución a Utsu (1966) no está en la fuente abierta y se retira (T01) |
| σ(b) | 2,30·b²·√(Σ(Mi − M̄)² / (n(n−1))), se publica como dato auxiliar | Shi y Bolt (1982) |
| Mc | bin de 0,1 con más eventos (máxima curvatura) + 0,2. **El +0,2 es una convención declarada sin cita abierta** (decisión de Luis, 2026-11-08): se muestra en `metadata.parametros` y en el ADR-010 | Máxima curvatura: Mignan y Woessner (2012) §6.1. El +0,2 (Woessner y Wiemer 2005) no está verificado con fuente abierta |
| Redondeo de magnitudes | `Math.round(m·10 + 1e-9) / 10` antes de agrupar en bins; ΔM = 0,1 | decisión técnica |
| Ventana espacial GK | L(M) = 10^(0,1238·M + 0,983) km, distancia epicentral (`distanciaKm`) | van Stiphout et al. (2012) |
| Ventana temporal GK | T(M) = 10^(0,032·M + 2,7389) días si M ≥ 6,5; si no, 10^(0,5409·M − 0,547) días | ídem |
| Salto en M = 6,5 | **Se conserva tal cual lo publica la fuente** (con estas constantes, T pasa de ~931 a ~885 días, un −5 %); no se suaviza, para no inventar una ventana; se documenta en ADR-010. La tabla publicada ([VS12] Tabla 2) da 790 días en M6,5 y no tiene salto: la fórmula queda un 12 % por encima en esa fila, por eso T04 usa ±15 % en M6,5 | decisión técnica |
| Recorrido GK | Eventos superficiales ordenados por magnitud descendente (empate: `tiempo` ascendente, luego `id`). Al llegar a un evento: si ya tiene rol, se salta; si no, **recibe "fondo" en ese momento** y es principal. Se marcan como "secuencia" (con `principal` = su id) los eventos sin rol con magnitud **estrictamente menor** que la del principal, tiempo **estrictamente posterior**, Δt ≤ T(M) y distancia ≤ L(M). **Sin encadenamiento** (un evento de secuencia nunca abre ventana) y **solo hacia adelante** (los precursores quedan como fondo). | **GK adaptado** (decisión de Luis, 2026-11-08): van Stiphout 2012 §5.1 trata los precursores como réplicas; aquí quedan como fondo. Limitación escrita en ADR-010 |
| J_MIN | 0,75 con el mínimo de Jaccard sobre las dos perturbaciones del radio. **Es una adaptación**: Hennig (2007) lo propone para la media de Jaccard sobre remuestreos bootstrap, no sobre perturbación de parámetros; ADR-010 lo dice así | Hennig (2007), vía doc de `fpc::clusterboot` |
| N_MIN | 50 | derivado: σ ≈ b/√n, b ≈ 1 → semiancho del IC 95 % ≈ 1,96/√n; ≤ 0,3 exige n ≥ 43; se redondea a 50 |
| Estimación puntual | b y Mc sobre la muestra completa de la familia mayoritaria | — |
| IC 95 % | Bootstrap de percentiles: B remuestras con reemplazo de las magnitudes de la familia; en cada una se re-estima Mc y luego b; se descartan las remuestras con < 2 eventos ≥ su Mc (si > 5 %: RF-31). Con los valores ordenados v[0..B'−1]: lo = v[⌊0,025·B'⌋], hi = v[⌈0,975·B'⌉ − 1]. El IC de Mc, igual con los Mc de las remuestras | decisión técnica |
| B | 1000 en producción; 200 en `npm test` | RNF-2 / RNF-5 |
| epsKm, minPts por clase | Se calibran **una vez** en T06 con la curva de k-distancias (k = minPts) del catálogo real, sin mirar b; se congelan en `parametros.mjs` | decisión técnica, ADR-010 |
| Control aleatorio | Por clase: n = puntos que entran a la agrupación de esa clase; lon uniforme en [lonMin, lonMax] y lat = asin(uniforme en [sin latMin, sin latMax]) (uniforme en área) dentro de `REGION_CONSULTA`; 20 semillas por clase en producción, 3 en `npm test` | control débil (spec §3) |
| Semillas | `SEMILLA_BASE` entera en `parametros.mjs`. Claves: bootstrap `gr|<clase>|<id menor de la zona>`; control `control|<clase>|<i>`. El id menor (comparación de cadenas) no depende del orden de los códigos | decisión técnica |
| Redondeo de salida | lat/lon y caja 4 decimales; b, IC de b, σ y Jaccard 3; Mc y su IC 1; −0 se escribe 0 | decisión técnica |
| Serialización | Claves en el orden de §3.4, 2 espacios de sangría, `\n` final, sin marcas de reloj | RF-5 |
| Códigos de zona | Letra de clase (S, I, P) + 2 dígitos según el orden de RF-3 dentro de la clase. Deterministas para un catálogo dado; **no** se garantiza que se mantengan entre catálogos (fuera de alcance) | decisión técnica |
| Huella | SHA-256 (`node:crypto`) de los `features` en orden canónico, sin `ultima_verificacion`; solo en Node | decisión del coordinador |

### 3.4 Salida `data/patrones.json`
```
{
  "metadata": {
    "fuente": "Cálculo de sismos-ve sobre USGS FDSN Event Web Service",
    "ultima_verificacion": "<metadata.ultima_verificacion de eventos.json>",
    "atribucion": "Datos: U.S. Geological Survey (USGS), dominio publico",
    "catalogo_n": 4358, "catalogo_sha256": "<hex>",
    "metodo": { "version": "1", "declustering": "gardner-knopoff-1974", "agrupacion": "dbscan-haversine", "gr": "aki-utsu-mle+bootstrap-percentil" },
    "parametros": { ...constantes de 3.3 }, "semilla_base": <n>,
    "filtro_confianza": "ninguno", "n_automatic": n,
    "excluidos": n,
    "control_aleatorio": { "semillas_por_clase": 20, "grupos_max": 0 },
    "resumen": { "fondo": n, "secuencia": n, "no_aplica": n, "sin_zona": n }
  },
  "zonas": [ {
    "id": "S01", "clase_profundidad": "superficial",
    "n_eventos": n, "n_fondo": n, "n_secuencia": n, "n_no_aplica": n, "n_en_vista_venezuela": n,
    "centro": { "lat": x, "lon": y }, "caja": [lonMin, latMin, lonMax, latMax], "en_borde": bool,
    "lugar_usgs_frecuente": "<properties.place sin el prefijo 'N km DIR of '; empate: el primero en orden alfabético>",
    "periodo": { "desde": "AAAA-MM-DD", "hasta": "AAAA-MM-DD" },
    "territorio": { "venezuela": n, "costa": n, "disputa": n, "fuera": n },
    "sensibilidad": { "jaccard_min": x },
    "gutenberg_richter": { "publicado": bool, "motivo": null | "muestra_insuficiente" | "intervalo_inconsistente",
      "familia": "Mw"|"mb"|"ML-Md"|null, "n_sobre_mc": n, "mc": x|null, "mc_ic95": [lo, hi]|null,
      "b": x|null, "b_ic95": [lo, hi]|null, "b_sigma_shi_bolt": x|null },
    "fuente": "Cálculo de sismos-ve sobre USGS FDSN Event Web Service",
    "confianza": "media",
    "ultima_verificacion": "<la del catálogo>"
  } ]
}
```
- `centro` = media de lat y media de lon de los eventos de la zona (válido: ninguna zona cruza el antimeridiano dentro de `REGION_CONSULTA`).
- `n_en_vista_venezuela` cuenta `enVistaVenezuela` (`src/data.js:97`); RF-18 compara `2·n_en_vista_venezuela ≥ n_eventos` (enteros, sin redondeo).
- `territorio` con `territorioDe` (`src/data.js:87`).
- Esquema cerrado: el validador rechaza cualquier clave extra (RF-1, RF-22).

### 3.5 Contrato de datos
El gate del contrato está cerrado (`CLAUDE.md:94`, Luis, 2026-10-21, ADR-003). Los tres campos derivados (`fuente`, `confianza` "media" fija, `ultima_verificacion` del catálogo) los aprobó Luis el 2026-11-08. Si Luis cambia la escala `alta/media/baja` más adelante, solo cambia la constante de `confianza` derivada.

### 3.6 Presentación
- Bloque "Patrones" en el panel de estadísticas. Orden de RF-3 (oeste → este). Sin escala de color; tokens del panel (ADR-004).
- Arriba: texto fijo de RF-15 (clave `patrones.noPrediccion`) y nota de RF-17; en "Solo Venezuela", nota de RF-27.
- Tarjeta por zona: código, centro, lugar USGS, `n_eventos` (fondo / secuencia / no aplica), periodo, aviso de borde (RF-32) y la línea "b = 0,98 (IC 95 %: 0,85–1,12) · Mc 4,3 (IC 95 %: 4,1–4,5) · mb · n = 212" (forma, no dato). Sin b (RF-34): "Valor b: muestra insuficiente (n = 31 < 50)" o "Valor b: intervalo inconsistente".
- "Solo Venezuela" sin zonas visibles (RF-35): mensaje en lugar de tarjetas.
- Decimales: coma en `es`, punto en `en` (RF-28), con `formatoNumero`.
- **Lista prohibida (RF-2), coincidencia por raíz.** Sobre los valores de las claves `patrones.*` de `es.json` y `en.json`, excepto `patrones.noPrediccion`: (1) se pasa a minúsculas y se quitan tildes (NFD + eliminar marcas combinantes); (2) se parte en palabras por todo carácter que no sea letra o dígito Unicode (`/[^\p{L}\p{N}]+/u`); (3) una palabra **salta** si empieza por alguna raíz, salvo que empiece por una excepción. Así una raíz cubre todos sus derivados (plural, género, conjugación).
  - Raíces ES: `riesg`, `peligr`, `amenaz`, `alert`, `predic`, `predec`, `pronostic`, `probab`, `inminent`, `venider`, `pront`, `proxim`, `futur`, `esperad`, `estable`, `inestable`, `segur`, `activ`, `propens`, `tendenc`, `recurren`.
  - Raíces EN: `risk`, `hazard`, `danger`, `threat`, `alert`, `predict`, `forecast`, `probab`, `likel`, `imminent`, `soon`, `next`, `upcoming`, `futur`, `expect`, `stable`, `unstable`, `safe`, `activ`, `prone`, `trend`, `recurren`.
  - Excepciones (prefijos permitidos): `likelihood` ("maximum likelihood"), `establec` ("establecer", que empieza por `estable`).
  - Consecuencias de redacción: la interfaz dice "sismicidad"/"seismicity", nunca "actividad"/"activity"; el concepto interno "estable" se llama "sensibilidad" y no aparece en la interfaz.
  - Raíz ES adicional `predij` (pretérito irregular: "predijo").
  - Test (`test/patrones-ui.test.mjs`), un ejemplo positivo por raíz que **debe saltar**: ES `riesgos`, `peligrosa`, `amenazas`, `alertas`, `predicción`, `predecimos`, `predijo`, `pronosticar`, `probabilidad`, `inminentes`, `venideros`, `pronto`, `próximas`, `futura`, `esperadas`, `estables`, `inestable`, `seguridad`, `activa`, `propensa`, `tendencia`, `recurrencia`; EN `risky`, `hazards`, `dangerous`, `threats`, `alerts`, `predicted`, `forecasting`, `probably`, `likely`, `imminent`, `soon`, `next`, `upcoming`, `future`, `expected`, `stable`, `unstable`, `safety`, `active`, `prone`, `trends`, `recurrent`. Falsos positivos conocidos que **no deben saltar**: `Mw`, `mb`, `ML-Md`, `media`, `magnitud`, `sismicidad`, `seismicity`, `secuencia`, `superficial`, `Cepitá`, `según`, `likelihood`, `establecer`, `nexus`, `sample`.

### 3.7 Catálogos sintéticos (fijos)
- **G-R**: magnitudes M = 3,0 − log10(U)/b con b = 1,0, n = 1000, U del generador; redondeadas a 0,1; familia mb; semillas 1-100.
- **Agrupaciones**: 3 nubes gaussianas de σ = 10 km y 150 puntos cada una, centros en (10,0; −69,0), (8,0; −64,0) y (6,8; −73,0); 300 puntos de ruido uniforme en área en `REGION_CONSULTA`; semilla 1; parámetros del test `epsKm` = 15, `minPts` = 10 (independientes de los de producción).
- **Secuencia**: principal M 6,0 en (10,0; −66,0); 100 réplicas a ≤ 0,5·L(6,0) km y entre 1 día y 0,5·T(6,0) días después, magnitudes 3,0-5,0; 50 eventos aislados M 4,0 a > 2·L(6,0) y > 2·T(6,0) entre sí y del principal.
- **Uniforme**: n por clase igual al del catálogo real de entrada a la agrupación (valor leído en el test, no fijado a mano).

## 4. Trazabilidad

| RF | Dónde se implementa | Cómo se prueba |
|---|---|---|
| RF-1 | Esquema cerrado de §3.4 | `test/validate-patrones.test.mjs`: una clave extra (`tasa_anual`) → error |
| RF-2 | `src/i18n/*.json` | `test/patrones-ui.test.mjs` (lista de §3.6) |
| RF-3 | `analizar` + `src/ui.js` | `test/patrones.test.mjs` (orden por longitud) y `test/patrones-ui.test.mjs` |
| RF-4 | `scripts/analizar-patrones.mjs` | `test/patrones.test.mjs`: sin `fetch` en `scripts/ml/` ni en el CLI (lectura del texto) |
| RF-5 | `analizar` + `serializar` | `test/patrones.test.mjs` (sintético, dos corridas → `Buffer.equals`); T07: SHA-256 de `data/patrones.json` igual tras dos corridas reales consecutivas |
| RF-6, RF-30 | `declustering.mjs`, `analizar` | `test/declustering.test.mjs`, `test/patrones.test.mjs` |
| RF-7, RF-8 | `dbscan.mjs` | `test/dbscan.test.mjs` |
| RF-9 | control en `analizar-patrones.mjs` | `test/patrones.test.mjs` con parámetros permisivos → error, sin archivo |
| RF-10, RF-11, RF-12, RF-25, RF-31 | `gutenberg-richter.mjs` | `test/gutenberg-richter.test.mjs` |
| RF-13, RF-14, RF-23, RF-24, RF-29 | `analizar` | `test/patrones.test.mjs` |
| RF-26 | temporal → `validarPatrones` → `rename` en el CLI; `continue-on-error` en `fetch-eventos.yml` solo para no bloquear `eventos.json` | `test/patrones.test.mjs` (análisis que falla y resultado que no valida → SHA-256 del archivo anterior sin cambios y sin `.tmp`) + revisión del YAML |
| RF-15, RF-16, RF-17, RF-19, RF-27, RF-32 | `src/ui.js`, `src/patrones.js`, i18n | `test/patrones-ui.test.mjs` (formato de b siempre con IC, Mc, familia y n) + teléfono de Luis |
| RF-18 | `zonasVisibles` | `test/patrones-ui.test.mjs` (49 %, 50 %, 51 %) |
| RF-20 | `coincideConCatalogo` + `src/ui.js` | `test/patrones-ui.test.mjs` + `vite preview` sin el archivo |
| RF-21 | i18n | `test/i18n.test.mjs` existente (paridad ES/EN) |
| RF-28 | `formatoNumero` | `test/patrones-ui.test.mjs`: 0,98 en `es`, 0.98 en `en` |
| RF-34 | `formatoB` + i18n | `test/patrones-ui.test.mjs`: los dos motivos → su texto, sin cifra de b |
| RF-35 | `zonasVisibles` + `src/ui.js` | `test/patrones-ui.test.mjs`: vista "venezuela" sin zonas → lista vacía y clave del mensaje |
| RF-22, RF-33 | `validate-patrones.mjs` | `test/validate-patrones.test.mjs` |

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| **Falsos patrones** | Sensibilidad Jaccard ≥ 0,75; control aleatorio por clase con 0 grupos (RF-9), declarado débil; parámetros congelados en T06 sin mirar b |
| Lectura como peligrosidad | RF-1/2/3; texto fijo; sin valor a ni periodos de retorno; orden geográfico; DISCLAIMER |
| **Mezcla de tipos de magnitud** | Familias y mayoritaria por n ≥ Mc (RF-12); sin conversiones |
| **Completitud variable en 36 años** | Mc con IC; limitación en ADR-010 y en el texto; tendencias fuera de alcance |
| Muestra pequeña | N_MIN = 50; "muestra insuficiente" visible |
| IC bootstrap bimodal | Estimador fijado; RF-31 retira b si el IC no contiene la estimación |
| GK pensado para corteza superficial; sin precursores | Solo superficiales; limitaciones en ADR-010 |
| Constantes citadas de memoria | T01 con fuentes abiertas; si falta una, para y pregunta a Luis |
| Orden de entrada y empates | Orden canónico (§3.1); test de invariancia al barajar |
| Falla del análisis en la Action | Archivo anterior intacto (RF-26); la interfaz oculta cifras al no coincidir (RF-20); el validador solo avisa (RF-33) |
| Tiempo del análisis | Rejilla en DBSCAN; B = 1000 solo en producción; medido en T07 (RNF-2) |
| Conflicto con la rama `f4-publicacion` (`docs/fases/FASE-4-PUBLICACION.md:6`) | T09-T11 arrancan desde `main` tras el merge de F4 |
| El evento de 2026 de la ficha (regla 6) | Solo agregados por zona |

## 6. Decisiones tomadas en el plan

- Cálculo offline en Node; archivo estático versionado (ADR-002, regla 3). Reversible: sí.
- Sin dependencias; JS puro con `distanciaKm` y `claseProfundidad`. Reversible: sí.
- DBSCAN solo espacial por clase; HDBSCAN y ST-DBSCAN descartados. Reversible: sí.
- GK solo superficiales, sin encadenamiento, solo hacia adelante, salto en 6,5 conservado. Reversible: sí.
- b y Mc con todos los eventos de la zona de la familia mayoritaria (el declustering retira sobre todo eventos pequeños y sesgaría b). Reversible: sí.
- IC por bootstrap de percentiles; RF-31 en vez de exigir siempre contención. Reversible: sí.
- N_MIN = 50 por la derivación de §3.3. Reversible: sí.
- Sin filtro por `confianza`, declarado. Reversible: sí.
- Ejecución en la Action diaria, en el mismo PR de `datos-diario`, sin bloquear el catálogo. Reversible: sí.
- Generador reimplementado en el proyecto: la ficha 44 de Arsenal (`C:\dev\arsenal\INVENTARIO.md:73`) es de un negocio privado; por la ley 1 de JARVIS solo viaja la idea. Reversible: sí.
- Sin `MEMORY.md` en el proyecto: decisiones en ADR-010 y bitácora de Notion (regla dura 14).
