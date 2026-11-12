# ADR-010 — Metodo estadistico de patrones: fuentes, constantes y limites

**Fecha:** 2026-11-08 · **Estado:** Propuesto (borrador de T01; Luis resolvió las decisiones 1 a 3 el 2026-11-08, falta su aceptación formal del ADR)

> Spec 001-ml-sismos, tarea T01. Este borrador verifica cada formula y constante de `plan.md` §3.3
> **solo contra fuentes de acceso abierto**. Tres puntos quedan DIFERENTE o NO VERIFICADO, por lo
> que **T01 se detiene y se pregunta a Luis antes de T03-T05** (ver "Decisiones pendientes").
> T06 (2026-11-12) completo este ADR con `epsKm` y `minPts` calibrados (seccion "Calibracion T06").

## Contexto

La spec 001 publica `data/patrones.json` con declustering, agrupaciones y Gutenberg-Richter por zona.
Las formulas y constantes del plan §3.3 no pueden entrar al codigo sin una cita abierta. Se
consultaron exactamente estas fuentes (acceso 2026-11-08):

| Clave | Fuente | URL | Como se leyo |
|---|---|---|---|
| [VS12] | van Stiphout, Zhuang, Marsan (2012), "Seismicity declustering", CORSSA v1.0, 2 feb 2012, doi:10.5078/corssa-52382934 | http://www.corssa.org/export/sites/corssa/.galleries/articles-pdf/vanStiphout_et_al.pdf_2063069299.pdf | PDF descargado y convertido con `pdftotext`; texto leido directamente |
| [MW12] | Mignan y Woessner (2012), "Estimating the magnitude of completeness for earthquake catalogs", CORSSA v1.0, 1 abr 2012, doi:10.5078/corssa-00180805 | http://www.corssa.org/export/sites/corssa/.galleries/articles-pdf/Mignan-Woessner-2012-CORSSA-Magnitude-of-completeness.pdf_2063069299.pdf | idem |
| [FPC] | Documentacion de `clusterboot`, paquete R `fpc` 2.2-12 (CRAN) | https://search.r-project.org/CRAN/refmans/fpc/html/clusterboot.html | HTML descargado con `curl`; texto leido directamente. No se comprobo si CRAN tiene hoy una version mas nueva |
| [USGS] | USGS, "Magnitude Types" (sin fecha de actualizacion en la pagina) | https://www.usgs.gov/programs/earthquake-hazards/magnitude-types | `curl` bloqueado (919 bytes); leida con la herramienta WebFetch (resumen de un modelo pequeno), repetida dos veces con las mismas citas. Menor grado de certeza que las otras tres |

Las paginas citadas son las del PDF original (numero del encabezado de pagina).

## Decision

Se adopta el metodo del plan §3.3 **con las correcciones y reservas de la tabla siguiente**. El estado
de cada constante es CONFIRMADA / DIFERENTE / NO VERIFICADO respecto de la fuente abierta.

### 1. Constantes y formulas, una por una

| # | Pieza (plan §3.3) | Valor del plan | Estado | Cita: valor exacto tal como lo publica la fuente |
|---|---|---|---|---|
| 1 | b (MLE) | b = log10(e) / (M̄ − (Mc − ΔM/2)) | **CONFIRMADA** la formula; **NO VERIFICADA** la atribucion a Utsu (1966) | [MW12] §4, Ec. 2, p. 7: `b = log10(e) / (M̄ − (Mc − ΔM/2))`, "M̄ is the mean magnitude of the sample (with m ≥ Mc) and ΔM is the binning width of the catalog (Aki 1965)". La fuente cita solo a Aki (1965) y remite a Naylor et al. (2010) para detalles; **no menciona a Utsu (1966)**. Citar Aki (1965) |
| 2 | σ(b) | 2,30·b²·√(Σ(Mi−M̄)² / (n(n−1))) | **CONFIRMADA** (2,30 = 2,3 publicado) | [MW12] §6.3, Ec. 5, p. 18: `δb = 2.3 b² √( Σ(Mi − M̄)² / (N(N−1)) )`, atribuida a Shi y Bolt (1982). Nota de la fuente: "the second square exponent is missing in Eq. 4 of Woessner and Wiemer (2005)". Implementar con 2,3 tal cual se publica |
| 3a | Mc por maxima curvatura, bin 0,1 | bin de 0,1 con mas eventos | **CONFIRMADA** | [MW12] §6.1, p. 15: "In practice, this matches the magnitude bin with the highest frequency of events in the non-cumulative FMD." El bin de 0,1: "a bin size Δm = 0.1" (§6.3, p. 18, como ejemplo de la fuente; el codigo R de la fuente recibe `mbin` como parametro). Detalle de desempate: el codigo R de la fuente (`maxc`, §9) toma `which(...)[1]`, es decir el **bin mas bajo** entre empatados; el plan no define el empate y debe adoptar esa regla |
| 3b | Mc = MAXC **+ 0,2** | +0,2 | **NO VERIFICADO** | [MW12] no contiene ninguna correccion de +0,2 para MAXC (se buscaron "0.2", "correction", "+ 0.2"). Lo que si dice: MAXC "underestimates Mc in bulk data" (Tabla 2, p. 16) y, sobre el catalogo sintetico de Woessner y Wiemer (2005), "both the MAXC and GFT-95% approaches underestimate the true Mc by about 0.1" (§6.7, p. 25). Es decir, la fuente respalda el **sentido** de una correccion positiva y cifra el sesgo en ~0,1 en ese ensayo, pero **no el valor 0,2**. La fuente primaria del 0,2 (Woessner y Wiemer 2005) no esta entre las permitidas |
| 4 | Redondeo y ΔM = 0,1 | `Math.round(m·10 + 1e-9)/10`; ΔM = 0,1 | Decision tecnica (sin constante de fuente) | Coherente con [MW12] §9, p. 37, codigo R `fmd`: `round(mag/mbin)*mbin`. El `+1e-9` es de implementacion, no de la fuente |
| 5 | Ventana espacial GK | L(M) = 10^(0,1238·M + 0,983) km | **CONFIRMADA** | [VS12] §5.1, Ec. 1, p. 9: `d = 10^(0.1238M+0.983) [km]` ("An approximation of the windows sizes according to Gardner and Knopoff (1974)") |
| 6 | Ventana temporal GK, rama M ≥ 6,5 | T = 10^(0,032·M + 2,7389) dias | **CONFIRMADA** | [VS12] Ec. 1, p. 9: `t = 10^(0.032M+2.7389)` "if M ≥ 6.5" [days] (el umbral es **≥**, no >) |
| 7 | Ventana temporal GK, rama M < 6,5 | T = 10^(0,5409·M − 0,547) dias | **CONFIRMADA** | [VS12] Ec. 1, p. 9: `t = 10^(0.5409M−0.547)`, "else" [days] |
| 8 | Salto de T en M = 6,5 | ~931 → ~885 dias (−5 %) | Aritmetica **CONFIRMADA**; origen: ver seccion 3 | Ver seccion 3 |
| 9 | Recorrido GK: solo hacia adelante, sin encadenamiento | precursores = fondo; replica de replica = fondo | **DIFERENTE** en los precursores; compatible en el encadenamiento | [VS12] §5.1, p. 9: "Foreshocks are treated in the same way as aftershocks, i.e., if the largest earthquake occurs later in the sequence, the foreshock is treated as an aftershock. Consequently, the time-space windows are reset according to the magnitude of the largest shock in a sequence. Usually, these algorithms do not distinguish between direct and indirect aftershocks". El plan **deja los precursores como fondo**, lo que la descripcion de la fuente **no hace**. Es una adaptacion del plan, no "GK clasico" (ver Limitaciones y Decisiones) |
| 10 | J_MIN = 0,75 | 0,75 sobre el minimo de Jaccard de dos perturbaciones | Umbral **CONFIRMADO**; uso **ADAPTADO** (seccion 2) | [FPC] "Details": "Generally, a valid, stable cluster should yield a mean Jaccard similarity value of 0.75 or more." Tambien: "Below average Jaccard values of 0.6, clusters should not be trusted"; "Highly stable ... 0.85 and above"; "smaller or equal to 0.5 ... dissolved cluster"; y "All of this refers to bootstrap" |
| 11 | N_MIN = 50 | derivado de σ ≈ b/√n | Derivacion aritmetica **comprobada**; no es constante de fuente | Con la Ec. 5 de [MW12] y b ≈ 1, σ(b) ≈ b/√(N−1). Semiancho del IC 95 % ≈ 1,96/√n: n = 43 → 0,2989 (≤ 0,3); n = 42 → 0,3024 (> 0,3). Redondeo a 50 correcto. Contraste: [MW12] §6.7, pp. 25-27, dice que la incertidumbre de Mc por MAXC es fiable desde "nmin = 4", y que para GFT/EMR/MBASS hace falta "nmin ∼ 100 − 200" (Woessner y Wiemer 2005 fijaron nmin = 200); no contradice N_MIN = 50 porque aqui el metodo es MAXC y N_MIN controla la precision de b |
| 12 | Factores de sensibilidad 0,8 y 1,2; B = 1000/200; 20/3 semillas de control; IC por percentiles | — | Decision tecnica del plan, sin fuente en la lista permitida | No hay cita que verificar. Nota: [VS12] Fig. 1, p. 7, dice que variar ±10 % los parametros de ventana de GK "have only a small effect" (es otra magnitud, no valida el 0,8/1,2 de DBSCAN) |
| 13 | Familias de `magType` y uso de mb | Mw / mb / ML-Md; mb_lg y ms fuera de b | Respaldo parcial, ver seccion 5 | [USGS], ver seccion 5 |

### 2. Adaptacion de Hennig (J_MIN)

Hennig (2007) propone el umbral 0,75 para la **media** del indice de Jaccard de un cluster calculada sobre
**remuestreos bootstrap** de los datos (la documentacion de `clusterboot` lo acota: "All of this refers to
bootstrap"). Este proyecto **no hace bootstrap de los puntos**. Perturba un parametro, el radio `epsKm`
(factores 0,8 y 1,2, dos corridas), y toma el **minimo** de Jaccard entre el grupo base y su mejor equivalente
en cada corrida. Por tanto:

- El valor 0,75 se **toma prestado** de una escala de interpretacion pensada para otro esquema de remuestreo;
  **no esta validado** para perturbacion de parametros.
- Dos perturbaciones son una muestra minima; el minimo es mas estricto que una media, lo cual es conservador,
  pero la correspondencia con la escala de Hennig no es medible.
- La documentacion advierte ademas que la estabilidad no es el unico criterio de validez ("clusters obtained by
  very inflexible clustering methods may be stable but not valid"). Por eso existe el control aleatorio (RF-9).

### 3. Salto de T(M) en M = 6,5

Comprobado contra [VS12]:

- **El salto esta en la formula publicada.** La Ec. 1 (p. 9) tiene exactamente dos ramas con el corte en
  M ≥ 6,5. Evaluada: T(6,4999) = 930,7 dias y T(6,5) = 884,9 dias (−4,9 %). Las cifras del plan (~931 y ~885,
  −5 %) son correctas. **No es un artefacto del plan.**
- **La tabla publicada no muestra ese salto.** Tabla 2 de [VS12] (p. 10, valores originales de Gardner y Knopoff 1974):
  T = 510 (M 6,0), **790** (M 6,5), 915 (M 7,0): crece de forma monotona. Pero el valor de la tabla en 6,5 (790 dias)
  **difiere de ambas ramas**: la formula da 884,9 dias (+12,0 % sobre la tabla) y la rama inferior daria 930,8
  (+17,8 %). Es decir: el salto es propiedad de la **aproximacion** (la fuente la llama "An approximation"), no de
  la tabla, y la tabla en 6,5 queda ~11-15 % por debajo de la formula.
- **Consecuencia directa para T04:** su criterio "L(M) y T(M) iguales a la tabla de referencia (±10 %)" **falla en
  M = 6,5** (+12,0 %) aunque la formula este bien implementada. Ver Decisiones pendientes.

### 4. Tabla de valores de referencia independientes (Gardner-Knopoff 1974)

Copiada de [VS12] Tabla 2, "Aftershock identification windows (Gardner and Knopoff 1974)", p. 10. **No calculada**
con las formulas. Es la prueba independiente que usara T04. (Los valores de la Tabla 1 de la misma pagina, de
Knopoff y Gardner 1972, son otro conjunto y **no se usan**.)

| M | L (km) | T (dias) |
|---|---|---|
| 2,5 | 19,5 | 6 |
| 3,0 | 22,5 | 11,5 |
| 3,5 | 26 | 22 |
| 4,0 | 30 | 42 |
| 4,5 | 35 | 83 |
| 5,0 | 40 | 155 |
| 5,5 | 47 | 290 |
| 6,0 | 54 | 510 |
| 6,5 | 61 | 790 |
| 7,0 | 70 | 915 |
| 7,5 | 81 | 960 |
| 8,0 | 94,0 | 985 |

Comparacion informativa (calculada en T01 para detectar discrepancias; **no** es valor de referencia): formula del
plan frente a la tabla. L: diferencia entre −1,9 % y +1,0 % en todas las filas (dentro de ±10 %). T: dentro de ±10 %
salvo M = 6,5 (+12,0 %); el resto de la zona 4,5-5,5 queda en −7,1 % a −7,6 %, y M = 2,5 en +6,4 %.

### 5. Familias de magnitud y `magType` ([USGS], "Magnitude Types")

Citas textuales de la pagina:
- Mww: "Authoritative USGS magnitude if computed." (~5,0 y mayores).
- mb: rango "~4.0 to ~6.5"; "Only authoritative for global seismicity for which there is no Mww, Mwc, Mwb or Mwr, typically 4.0-5.5 range."; "Mb tends to saturate at about M 6.5 or larger."
- ML: rango "~2.0 to ~6.5". Md: rango "~4 or smaller". mb_Lg: rango "~3.5 to ~7.0".
- La pagina **no** da conversiones entre tipos ni dice que sean directamente comparables.

Respaldo a la decision del plan: las magnitudes de tipos distintos son escalas distintas con rangos de validez
distintos y por eso Mc y b se calculan por familia (RF-12). La pagina **no** respalda por si sola el reparto exacto
Mw / mb / ML-Md ni la regla "mb gana a ML-Md sobre Mc" (decision del plan, spec §3).

## Por que

Cada formula numerica usada en el codigo (L, T, b, σ, MAXC, umbral de Jaccard) tiene cita abierta, con tres
excepciones declaradas arriba (+0,2 de Mc; salto/valor de la tabla en 6,5; precursores). Se prefiere dejarlas
visibles a rellenarlas de memoria.

## Consecuencias

- Se gana trazabilidad: cada constante de `parametros.mjs` puede apuntar a este ADR.
- T04 dispone de una tabla de referencia independiente; necesita una decision sobre la tolerancia en M = 6,5.
- La atribucion "Utsu (1966)" del plan debe cambiarse por "Aki (1965)" (es lo que dice la fuente).
- El plan §3.3 llama "GK clasico" a un recorrido que difiere de [VS12] en los precursores: debe renombrarse
  "GK adaptado (solo hacia adelante)" si Luis mantiene esa regla.

## Limitaciones

1. **Precursores.** Con el recorrido solo-hacia-adelante, un precursor anterior al principal se cuenta como
   fondo. [VS12] §5.1 (p. 9) trata los precursores como replicas. Efecto: el fondo queda ligeramente inflado
   alrededor de grandes sismos (sesgo no cuantificado aqui).
2. **Sin encadenamiento.** Una replica de replica fuera de la ventana del principal queda como fondo; la fuente
   dice que estos algoritmos "usually do not distinguish between direct and indirect aftershocks" (p. 9).
3. **Declustering con catalogo censurado.** [VS12] §4, p. 9: los eventos fuera de la region o anteriores al periodo
   "severed" las cadenas de disparo y pueden producir "too many clusters" o dejar sismos sin clasificar. La
   region de consulta es un rectangulo (ADR-003): los bordes estan afectados.
4. **El metodo no es unico.** [VS12] p. 8: conviene probar el efecto de la eleccion del algoritmo y de los
   parametros. Aqui solo se usa una ventana y se declara.
5. **Profundidades fijadas por el USGS.** Algunos eventos traen profundidad fija (p. ej. 10 km) en lugar de una
   estimada; se usa tal cual (spec §edge cases) y la clasificacion superficial/intermedio puede ser artificial en
   esos eventos. **Sin cita en las fuentes permitidas**: la pagina [USGS] "Magnitude Types" no trata la profundidad.
   Queda como observacion del catalogo hasta que Luis autorice una fuente adicional.
6. **Completitud variable.** [MW12] §4, p. 6-7: la curvatura de la distribucion frecuencia-magnitud se debe
   habitualmente a heterogeneidades espacio-temporales de Mc ("spatiotemporal heterogeneities in Mc") ligadas a la
   evolucion de la red sismica. Un Mc unico por zona y para todo el periodo es una simplificacion; MAXC puede
   subestimar Mc en datos agregados (Tabla 2, p. 16).
7. **Mezcla de `magType`.** Escalas distintas con rangos distintos ([USGS]); mb satura "at about M 6.5 or larger".
   Se mitiga calculando por familia mayoritaria, pero la familia puede cambiar entre zonas y en el tiempo, y
   mezclar familias dentro de la misma zona queda fuera de b (RF-12). Eventos con `magType` nulo, mb_lg o ms no
   entran en Mc ni b.
8. **Tamano de muestra.** Con N_MIN = 50, el IC 95 % de b mide ~±0,3: informativo, no preciso. El IC por bootstrap
   no corrige sesgos de catalogo.
9. **Umbral de Jaccard prestado** (seccion 2).

## Decisiones de Luis (T01 parada: hay NO VERIFICADO y DIFERENTE)

**Resueltas por Luis el 2026-11-08** (opción recomendada en las tres): (1) Mc = MAXC + 0,2 se mantiene como
convención declarada sin cita abierta; (2) la tolerancia de T04 es ±10 % en todas las filas salvo ±15 % en M = 6,5,
conservando la fórmula de la fuente; (3) se mantiene "solo hacia adelante", que se nombra **GK adaptado**; los
precursores quedan como fondo. La 4 sigue como observación sin cita. El texto original de cada punto se conserva abajo.

1. **Mc = MAXC + 0,2 (NO VERIFICADO).** Recomendacion: mantenerlo como **convencion declarada sin cita abierta**
   (visible en `metadata.parametros` y en este ADR), porque la fuente respalda el sentido (sesgo ~0,1 hacia abajo),
   y el IC por bootstrap y la familia hacen visible la incertidumbre. Alternativas: (a) quitarlo y usar MAXC puro;
   (b) autorizar una fuente adicional (Woessner y Wiemer 2005) para verificarlo.
2. **Tolerancia de T04 en M = 6,5.** La tabla publicada dice 790 dias y la formula 885 (+12 %). Recomendacion:
   conservar la formula de la fuente (Ec. 1) y probar contra la tabla con ±10 % en todas las filas **salvo
   M = 6,5, con ±15 %**, documentado aqui. Alternativas: interpolar la tabla (pierde la formula citada) o suavizar
   el salto (el plan lo descarta con razon: no inventar una ventana).
3. **Precursores.** Mantener "solo hacia adelante" (el plan; recomendado, es defendible y esta escrito en
   Limitaciones, pero **es una adaptacion**, no GK clasico) o seguir a [VS12] y tratar los precursores como replicas
   (cambia el caso de T04 "un precursor 1 h antes del principal → fondo" y el RF-6).
4. **(Opcional) Profundidad fijada por el USGS:** autorizar una fuente abierta del USGS sobre ese campo, o dejar la
   limitacion como observacion sin cita.

Decisiones tecnicas ya resueltas por el ejecutor (no requieren a Luis): citar Aki (1965) en lugar de Utsu (1966);
usar 2,3 como lo publica la fuente; desempate de MAXC al bin mas bajo; N_MIN = 50 se mantiene.

## Calibracion T06 (epsKm y minPts, 2026-11-12)

Entrada: catalogo real `data/eventos.json` (4358 eventos) tras el declustering GK; a la agrupacion entran los
superficiales de fondo y todos los intermedios y profundos (RF-7). **No se calculo ni se miro b** en ningun momento.

- Regla fijada antes de ver el resultado: k = minPts = 10; `epsKm` = rodilla (maxima distancia a la cuerda entre el primer
  y el ultimo punto) de la curva ordenada de log(distancia al 10.o vecino), redondeada al km. La rodilla en escala lineal
  caia en el 92-97 % de la curva (dominada por aislados) y daba `epsKm` de 84 km superficial: se descarto por ese motivo.
- Consideracion honesta: antes de fijar k se probaron k = 6, 8 y 10. Con k = 6 el control dio 7 grupos que cumplen
  (superficial); con 8 y 10 dio 0. Se eligio 10 (el mayor probado), de modo que el control NO es independiente de la
  eleccion de k: sigue siendo un control debil.

| Clase | n entrada | minPts | rodilla (km) | epsKm congelado | Grupos reales (n / Jaccard min) | Control aleatorio, 20 semillas |
|---|---|---|---|---|---|---|
| superficial | 1426 | 10 | 71,6 | 72 | 4: 941/0,99, 377/0,85, 15/1,00, 51/0,12 (este ultimo no cumple y no se publica) | 0 grupos que cumplen |
| intermedio | 2271 | 10 | 9,2 | 9 | 2: 1427/0,98, 473/0,92 | 0 |
| profundo | 1 | 10 | no calibrable | 9 (los del intermedio) | ninguno (n < minPts) | 0 |

- Limitacion: con `epsKm` = 72 km el grupo superficial mayor (941 eventos) es una zona muy extensa; la densidad del
  catalogo superficial es baja y la agrupacion por densidad une cadenas de epicentros. Es lo que sostiene la curva; si
  resulta poco informativa, cambiar la regla exige un ADR nuevo, no un ajuste de constantes.
- Los valores viven en `PARAMETROS_AGRUPACION` (`scripts/ml/parametros.mjs`) y quedan congelados. `SEMILLA_BASE` = 1.
- Comprobacion con 20 semillas por clase (produccion), comando puntual:
  `$env:SEMILLAS_CONTROL=20; node --test test/dbscan.test.mjs`. En `npm test` corre con 3.

## Cuando reconsiderar

- Si Luis autoriza fuentes adicionales (Woessner y Wiemer 2005; Gardner y Knopoff 1974; documentacion del USGS sobre profundidad).
- Si T06 muestra que la curva de k-distancias no sostiene `epsKm`/`minPts` razonables, o el control aleatorio no da 0 grupos.
- Si el catalogo cambia de region, periodo o de proveedor.
