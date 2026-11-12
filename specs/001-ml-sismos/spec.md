# Spec 001 — Patrones estadísticos del catálogo (ML no supervisado y estadístico)

> Estado: BORRADOR v2 (2026-11-08, tras la vuelta 1 de QA) · Autor de la petición: Luis
> Constitución: el proyecto no tiene `docs/constitution.md`; manda `CLAUDE.md` (reglas 1-9 y reglas duras 1-15)
> Relacionado: ADR-002 (static-first), ADR-003/ADR-009 (etiquetas de territorio), contrato de datos `CLAUDE.md` §5 (gate cerrado por Luis el 2026-10-21, `CLAUDE.md:94`), ADR-010 (nuevo, lo escribe el plan)
> Numeración: los RF-1 a RF-22 conservan su número de la v1 (algunos reescritos); los nuevos empiezan en RF-23. Ningún número se reutiliza.

## 1. Contexto

Petición literal de Luis: "evaluar agregarles aprendizaje automático o machine learning de alguna forma dependiendo del tipo de proyecto, puedes usar regresión o aprendizaje no supervisado o el supervisado".

sismos-ve es un panel de divulgación con 4358 eventos M>=3 del USGS (1990-01-01 a 2026-10-13, `docs/fases/FASE-1-DATOS.md:191`) y **no es un sistema de alerta ni de predicción** (`CLAUDE.md:17-20`, regla 1). Eso descarta cualquier modelo que estime cuándo, dónde o de qué tamaño será un sismo. Lo que encaja es describir el catálogo pasado con métodos estándar de la sismología estadística, cada estimación con su incertidumbre:

| Técnica | Veredicto | Por qué |
|---|---|---|
| Declustering (separar secuencias de la sismicidad de fondo) | **Se incluye**, solo en superficiales | Paso previo estándar: sin él, la agrupación espacial encuentra secuencias puntuales en vez de zonas. |
| Agrupación espacial por densidad con distancia sobre la esfera (DBSCAN haversine) | **Se incluye**, solo espacial y por clase de profundidad | Agrupa epicentros sin etiquetas previas. Por clase para que el nido de sismos intermedios bajo Cepitá (Colombia, ~150-165 km, `src/config.js:37-38`) no se mezcle con los superficiales. La variante espacio-temporal se descarta: el tiempo ya lo cubre el declustering. |
| HDBSCAN | **Se descarta** | Sin librerías permitidas (regla dura 8) ni Python local (regla dura 10); implementarlo desde cero es mucho más riesgo que DBSCAN con análisis de sensibilidad, para ~4400 puntos. |
| Regresión de Gutenberg-Richter (valor b por zona, con IC) | **Se incluye** | Es la "regresión" con sentido físico: el modelo log-lineal log10 N = a − b·M, estimado por máxima verosimilitud (no por mínimos cuadrados sobre conteos acumulados, que no son independientes). Describe la proporción de sismos pequeños frente a grandes en el pasado. |
| Regresión de la tasa anual | **Se descarta** | La completitud cambia con la red sismológica en 36 años: la tendencia mediría la red, no la Tierra. |
| Aprendizaje supervisado | **Se descarta** | No hay etiquetas verificables; las variables objetivo plausibles (magnitud u ocurrencia de sismos venideros) son predicción, prohibida. |

## 2. Historias de usuario

- HU-1. Como visitante, quiero ver dónde se han concentrado los epicentros del catálogo entre 1990 y la fecha del catálogo, para entender la distribución registrada.
- HU-2. Como visitante, quiero saber cuántos sismos de cada zona forman parte de secuencias, para no confundir una secuencia puntual con sismicidad de fondo.
- HU-3. Como estudiante de geología (Luis), quiero el valor b de cada zona con su IC 95 %, su Mc, su tipo de magnitud y su tamaño de muestra, para poder explicarlo con honestidad.
- HU-4. Como mantenedor, quiero que el análisis sea reproducible y se pruebe con catálogos sintéticos de respuesta conocida, para confiar en que no inventa patrones.

## 3. Definiciones

- **Catálogo de entrada**: `data/eventos.json` tal cual lo deja la Fase 1 (contrato y etiquetas incluidos).
- **Evento analizable**: evento con magnitud, latitud, longitud y profundidad numéricas y finitas. Los demás se excluyen y se cuentan (RF-30).
- **Clase de profundidad**: la de `claseProfundidad` (`src/data.js:76-78`, límites de `src/config.js:46-50`): superficial si prof ≤ 70 km (incluidas las negativas, sobre el nivel del mar), intermedio si 70 < prof ≤ 300, profundo si prof > 300. Exactamente 70 es superficial y exactamente 300 es intermedio. Las profundidades fijadas por el USGS (p. ej. 10 km) se usan tal cual.
- **Principal**: evento superficial que, al recorrerlos por magnitud descendente (orden del plan §3.3), todavía no tiene rol; recibe "fondo" en ese momento y abre su ventana de declustering.
- **Evento de secuencia**: evento superficial sin rol, de magnitud **estrictamente menor** que la del principal y tiempo **estrictamente posterior**, que cae dentro de su ventana espacial y temporal, según el método fijado en el plan. Dos eventos de igual magnitud nunca son secuencia uno del otro. Es una clasificación del algoritmo, no un hecho físico comprobado.
- **Fondo**: evento superficial que no es de secuencia. Todo principal es de fondo.
- **No aplica**: rol de todo evento intermedio o profundo (no se les aplica declustering).
- **Zona**: grupo de epicentros de una misma clase de profundidad devuelto por la agrupación por densidad que supera el criterio de sensibilidad, más los eventos de secuencia que hereda de sus principales (RF-24).
- **Criterio de sensibilidad**: la zona conserva un índice de Jaccard ≥ J_MIN con su mejor equivalente en cada una de las dos corridas con el radio de vecindad multiplicado por 0,8 y por 1,2. "Mejor equivalente" = el grupo de la corrida perturbada, de la misma clase, con mayor Jaccard (sobre conjuntos de `id`). J_MIN y su cita, en el plan.
- **Familia de magnitud**: agrupación de `magType` del USGS (comparación sin distinguir mayúsculas): **Mw** = mww, mwr, mwc, mwb, mw; **mb** = mb; **ML-Md** = ml, md. Cualquier otro valor (incluidos mb_lg, ms) o `magType` nulo no pertenece a ninguna familia: el evento cuenta en la zona pero no entra en Mc ni en b.
- **Familia mayoritaria de una zona**: la familia con más eventos de magnitud ≥ su propio Mc (Mc calculado primero por familia). Empate: Mw, luego mb, luego ML-Md.
- **Valor b**: pendiente de Gutenberg-Richter estimada por máxima verosimilitud con los eventos de la familia mayoritaria con magnitud ≥ Mc.
- **Mc (magnitud de completitud)**: magnitud a partir de la cual se asume que el catálogo de la zona registra todos los eventos de esa familia.
- **Parámetro estimado**: Mc y b. Los conteos son exactos y no llevan intervalo.
- **IC 95 %**: intervalo bootstrap de percentiles con semilla, con el estimador e índices fijados en el plan §3.3.
- **Control aleatorio**: catálogos sintéticos con, por clase de profundidad, el mismo número de puntos que entran a la agrupación de esa clase, repartidos uniformemente en área dentro de `REGION_CONSULTA` (`src/config.js:16`). Es un **control débil**: solo detecta parámetros tan permisivos que agrupan ruido uniforme; no prueba que una zona real tenga significado físico.
- **Zona en el borde**: zona con algún evento a menos de `epsKm` de su clase del borde de `REGION_CONSULTA`.
- **Archivo de patrones**: `data/patrones.json`, derivado y versionado.

## 4. Requisitos funcionales (EARS)

**Requisitos negativos (encuadre)**

- RF-1. EL SISTEMA NO DEBE calcular, mostrar ni almacenar ninguna estimación de la fecha, el lugar, la magnitud, la tasa o la probabilidad de un sismo que aún no ha ocurrido.
- RF-2. EL SISTEMA NO DEBE mostrar en la sección de patrones ninguna palabra que empiece por una raíz de la lista prohibida del plan §3.6 (ES y EN, coincidencia por raíz al inicio de cada palabra, con las excepciones listadas allí), salvo dentro del texto fijo de negación de RF-15.
- RF-3. EL SISTEMA DEBE ordenar las zonas, en el archivo y en la interfaz, de oeste a este por la longitud de su centro (empate: latitud de norte a sur; luego el `id` de evento menor), y NO DEBE ordenarlas ni colorearlas por su valor b ni por su número de eventos.

**Cálculo (fuera del navegador)**

- RF-4. CUANDO se ejecuta el análisis sobre un catálogo de entrada, EL SISTEMA DEBE producir el archivo de patrones sin consultar ningún servicio externo.
- RF-5. CUANDO se ejecuta el análisis dos veces sobre el mismo catálogo de entrada con los mismos parámetros y la misma semilla base, EL SISTEMA DEBE producir dos archivos de patrones idénticos byte a byte.
- RF-6. CUANDO se ejecuta el análisis, EL SISTEMA DEBE asignar a cada evento analizable exactamente un rol: fondo o secuencia si es superficial, no aplica si es intermedio o profundo.
- RF-7. CUANDO se ejecuta el análisis, EL SISTEMA DEBE agrupar por separado en cada clase de profundidad, usando como entrada los eventos de fondo (superficiales) y todos los eventos analizables (intermedios y profundos).
- RF-8. SI un grupo no cumple el criterio de sensibilidad, ENTONCES EL SISTEMA DEBE excluirlo del archivo de patrones.
- RF-9. SI el control aleatorio de una clase produce al menos un grupo que cumple el criterio de sensibilidad, ENTONCES EL SISTEMA DEBE terminar con error sin escribir el archivo de patrones.
- RF-10. EL SISTEMA DEBE acompañar cada parámetro estimado publicado (Mc y b) de su IC 95 % y del número de eventos usados.
- RF-11. SI la familia mayoritaria de una zona tiene menos de N_MIN eventos con magnitud ≥ Mc, ENTONCES EL SISTEMA DEBE publicar la zona sin valor b y con el motivo "muestra_insuficiente". N_MIN lo fija el plan con su derivación.
- RF-12. EL SISTEMA DEBE calcular Mc y b de cada zona solo con eventos de su familia mayoritaria e indicar la familia.
- RF-13. EL SISTEMA DEBE registrar en el archivo de patrones el método, la versión del método, los parámetros, la semilla base, el número de eventos del catálogo (`catalogo_n`), la `ultima_verificacion` del catálogo, la huella SHA-256 del catálogo, `filtro_confianza` ("ninguno"), `n_automatic` (eventos con `status` distinto de "reviewed"), `excluidos` (RF-30), el resultado del control aleatorio (`control_aleatorio`: semillas por clase y número máximo de grupos encontrados) y el `resumen` de roles (fondo, secuencia, no aplica, sin zona).
- RF-14. EL SISTEMA DEBE incluir en cada zona `fuente` = "Cálculo de sismos-ve sobre USGS FDSN Event Web Service", `confianza` = "media" y `ultima_verificacion` = la del catálogo de entrada.
- RF-23. EL SISTEMA DEBE publicar en cada zona `n_fondo`, `n_secuencia` y `n_no_aplica`, cuya suma es `n_eventos`.
- RF-24. EL SISTEMA DEBE asignar cada evento de secuencia a la zona de su principal; SI el principal no pertenece a ninguna zona, ENTONCES el evento de secuencia tampoco.
- RF-25. EL SISTEMA DEBE calcular Mc y b con todos los eventos de la zona de la familia mayoritaria, sean de fondo, de secuencia o no aplica.
- RF-29. SI una zona está en el borde, ENTONCES EL SISTEMA DEBE marcarla con `en_borde: true`.
- RF-30. SI un evento no es analizable, ENTONCES EL SISTEMA DEBE excluirlo del análisis y sumarlo en `metadata.excluidos`.
- RF-31. SI el IC 95 % de b no contiene la estimación puntual de b, o más del 5 % de las remuestras no tienen al menos 2 eventos sobre su Mc, ENTONCES EL SISTEMA DEBE publicar la zona sin valor b y con el motivo "intervalo_inconsistente".
- RF-26. CUANDO el análisis termina, EL SISTEMA DEBE validar el resultado (RF-22) antes de reemplazar el archivo de patrones; SI el análisis o esa validación fallan, ENTONCES EL SISTEMA DEBE dejar sin cambios el archivo de patrones anterior, continuar con la publicación del catálogo y escribir el motivo en el cuerpo del PR diario.

**Presentación (navegador)**

- RF-15. CUANDO la sección de patrones se muestra, EL SISTEMA DEBE mostrar, antes de cualquier cifra, un texto fijo que diga que es una descripción estadística del catálogo pasado, que no predice sismos y que depende del método, con un enlace a `DISCLAIMER.md`.
- RF-16. CUANDO la sección muestra un valor b, EL SISTEMA DEBE mostrar en la misma tarjeta su IC 95 %, su Mc con IC, la familia de magnitud y el número de eventos usados.
- RF-17. EL SISTEMA DEBE indicar en la sección que sus cifras no cambian con los filtros de años y magnitud, y que la vista ("Solo Venezuela" o "Región") solo cambia qué zonas se muestran (RF-18), no sus cifras.
- RF-34. CUANDO una zona tiene `publicado: false`, EL SISTEMA DEBE mostrar en su tarjeta, en lugar de b y su IC, el texto "Valor b: muestra insuficiente (n = <n_sobre_mc> < <N_MIN>)" si el motivo es "muestra_insuficiente", o "Valor b: intervalo inconsistente" si el motivo es "intervalo_inconsistente", en el idioma activo.
- RF-35. MIENTRAS la vista activa es "Solo Venezuela" y ninguna zona cumple el criterio de RF-18, EL SISTEMA DEBE mostrar un mensaje que diga que ninguna zona tiene al menos la mitad de sus eventos en esta vista y que la vista "Región" muestra todas.
- RF-18. MIENTRAS la vista activa es "Solo Venezuela", EL SISTEMA DEBE mostrar únicamente las zonas con al menos el 50 % de sus eventos en esa vista, contando como "en la vista" los que cumplen `enVistaVenezuela` (`src/data.js:97`: tierra, franja costera y zona en disputa). Exactamente el 50 % se muestra.
- RF-27. MIENTRAS la vista activa es "Solo Venezuela", EL SISTEMA DEBE indicar que las cifras de cada zona se calcularon con todos sus eventos, incluidos los que caen fuera de la vista.
- RF-19. EL SISTEMA DEBE nombrar cada zona con un código neutro, las coordenadas de su centro y el texto de lugar del USGS más frecuente entre sus eventos, sin nombres asignados por el proyecto.
- RF-28. EL SISTEMA DEBE mostrar los números decimales con coma en español y con punto en inglés.
- RF-32. CUANDO una zona tiene `en_borde: true`, EL SISTEMA DEBE indicar en su tarjeta que puede continuar fuera del área consultada.
- RF-20. SI el archivo de patrones falta, no se puede leer, o su `catalogo_n` o su `ultima_verificacion` no coinciden con los del catálogo cargado, ENTONCES EL SISTEMA DEBE ocultar las cifras de la sección y mostrar un mensaje de no disponible, sin calcular nada en el navegador.
- RF-21. EL SISTEMA DEBE mostrar todo texto de la sección en español e inglés a través de `t(clave)`.

**Validación (Node, CI)**

- RF-22. SI el archivo de patrones tiene una clave fuera del esquema del plan, un parámetro estimado publicado sin IC 95 %, un IC con límite inferior mayor que el superior o no finito, un valor b publicado fuera de su IC, una zona sin los campos de RF-14 o una suma de RF-23 que no cuadra, ENTONCES EL SISTEMA DEBE hacer fallar el validador.
- RF-33. SI la huella SHA-256, `catalogo_n` o `ultima_verificacion` del archivo de patrones no coinciden con el catálogo versionado, ENTONCES EL SISTEMA DEBE emitir un aviso de "patrones desactualizados" sin hacer fallar el validador.

## 5. Requisitos no funcionales

- RNF-1. Sin dependencias nuevas (regla dura 8): Node ≥22 y JavaScript del navegador ya presentes.
- RNF-2. El análisis completo con parámetros de producción sobre el catálogo real, control aleatorio incluido, termina en ≤ 120 s, medido en la laptop de Luis en T07 y en la primera corrida de la Action.
- RNF-5. El conjunto completo de `npm test` (tests existentes y nuevos) tarda ≤ 30 s en la laptop de Luis. Los tests nuevos no ejecutan el análisis completo de producción sobre el catálogo real: usan catálogos sintéticos y los parámetros reducidos del plan §3.3. Es el único presupuesto de tiempo de tests que bloquea; los tiempos por archivo de `tasks.md` son orientativos.
- RNF-3. El archivo de patrones pesa ≤ 50 KB sin comprimir.
- RNF-4. El JS propio añadido pesa ≤ 5 KB gzip y el total de JS propio sigue ≤ 150 KB gzip (`docs/PERFORMANCE_BUDGET.md`), con la comprobación pasa/falla de T11.
- RNF-6. Toda aleatoriedad sale de un generador con semilla derivada de una clave estable (plan §3.3); nunca de `Math.random`.
- RNF-7. Neutralidad (regla 9): ningún texto de la sección atribuye zonas a países ni opina; el territorio se expresa con las etiquetas existentes y el texto de lugar del USGS.
- RNF-8. Legible a 390 px de ancho sin desplazamiento horizontal.

## 6. Casos límite

| Caso | Comportamiento esperado | RF |
|---|---|---|
| Ningún grupo cumple el criterio de sensibilidad | Archivo válido con `zonas: []`; la sección dice que el método no encontró zonas | RF-8, RF-20 |
| Zona con mb, mww, ml y md mezclados | Mc por familia; b solo con la familia mayoritaria si alcanza N_MIN; si no, "muestra_insuficiente" | RF-11, RF-12 |
| `magType` nulo, mb_lg o ms | Cuenta en `n_eventos`; no entra en Mc ni en b | RF-12 |
| Zona dominada por una secuencia | La zona solo existe si la sostienen eventos de fondo; la secuencia suma en `n_secuencia` | RF-7, RF-23, RF-24 |
| Principal fuera de toda zona | Sus eventos de secuencia tampoco pertenecen a ninguna zona | RF-24 |
| Eventos intermedios del nido de Cepitá | Zona de clase intermedia; todos con rol "no aplica" | RF-6, RF-7 |
| Profundidad exactamente 70 / 300 | Superficial / intermedio | RF-6 |
| Profundidad negativa | Superficial | RF-6 |
| Profundidad o magnitud nula o no numérica | Excluido y contado en `metadata.excluidos` | RF-30 |
| Profundidad fijada por el USGS (10 km) | Se usa tal cual; limitación escrita en ADR-010 | RF-6 |
| Zona que toca el borde de `REGION_CONSULTA` | `en_borde: true` y aviso en la tarjeta | RF-29, RF-32 |
| Zona con exactamente 50 % en la vista Venezuela | Se muestra en "Solo Venezuela" | RF-18 |
| Vista "Solo Venezuela" | Aviso de que b y Mc usan también eventos de fuera de la vista | RF-27 |
| "Solo Venezuela" con 0 zonas que cumplan el 50 % | Mensaje de RF-35, sin tarjetas | RF-35 |
| Zona sin b publicado | Texto del motivo en lugar de b | RF-34 |
| Dos eventos superficiales de igual magnitud cercanos | Ninguno es secuencia del otro; el primero procesado es principal y fondo | RF-6 |
| Eventos `status: automatic` (hoy 0) | Entran igual (no se filtra por `confianza`); se cuentan en `metadata.n_automatic` | RF-13 |
| IC de b bimodal o que no contiene b | "intervalo_inconsistente", sin b | RF-31 |
| Dos eventos con la misma hora y lugar | Resultado determinista (orden por `time` y luego `id`) | RF-5 |
| Falla el análisis o el control aleatorio en la Action | Se conserva el archivo anterior; el catálogo se publica; la interfaz oculta cifras porque no coincide | RF-26, RF-20 |
| Archivo de patrones de un catálogo anterior | Interfaz sin cifras (RF-20); validador avisa sin fallar (RF-33) | RF-20, RF-33 |
| Teléfono a 390 px | Tarjetas apiladas; IC en la misma tarjeta que b | RF-16, RNF-8 |
| Idioma EN | Mismo contenido; punto decimal | RF-21, RF-28 |
| Evento de 2026 de la ficha del proyecto | Ningún evento concreto se narra ni se destaca (regla 6) | RF-19 |

## 7. Fuera de alcance

- Cualquier predicción, pronóstico, mapa de peligrosidad, tasa o probabilidad de ocurrencia (RF-1).
- Aprendizaje supervisado.
- HDBSCAN, ST-DBSCAN y otros algoritmos de agrupación.
- Regresión de tendencias temporales de la tasa de sismos.
- Valor a de Gutenberg-Richter, tasas de recurrencia y periodos de retorno.
- Mapas de b continuos (rejilla) y variaciones temporales de b.
- Capa de zonas en el mapa y rol de secuencia en la ficha de cada evento (posible spec 002).
- Publicar el rol de cada evento en el archivo de patrones (RNF-3).
- Cálculo en el navegador, cálculo dependiente de los filtros y comprobación de la huella SHA-256 en el navegador.
- Homogeneización o conversión entre tipos de magnitud.
- Continuidad de los códigos de zona entre versiones del catálogo.
- Comparación con FUNVISIS (regla 7).
- Python, notebooks o Colab.

## 8. Criterios de aceptación

- [ ] G-R sintético (b = 1,0, Mmin = 3,0, n = 1000, semillas 1-100, B = 200): el IC 95 % contiene 1,0 en ≥ 90 de 100 semillas.
- [ ] 3 agrupaciones sintéticas + ruido uniforme (parámetros del plan §3.7): exactamente 3 zonas y cada una con ≥ 90 % de los puntos de su agrupación real.
- [ ] Control aleatorio con los parámetros de producción: 0 grupos que cumplan el criterio en 20 semillas por clase.
- [ ] Secuencia sintética inyectada: ≥ 95 % de las réplicas con rol "secuencia" y el principal correcto; eventos aislados 100 % de fondo.
- [ ] Ventanas de declustering iguales a los valores de referencia independientes de T01 (tolerancia ±10 %, salvo ±15 % en M = 6,5, donde la tabla publicada no tiene el salto de la fórmula; ADR-010).
- [ ] Dos corridas consecutivas de producción sobre `data/eventos.json` real dan el mismo SHA-256 de `data/patrones.json`.
- [ ] Ningún b sin IC, Mc, familia y n en el archivo ni en la interfaz.
- [ ] Ninguna palabra con raíz prohibida en las claves `patrones.*` de ES y EN, salvo el texto de negación; el test detecta un ejemplo por raíz y no salta con los falsos positivos conocidos del plan §3.6.
- [ ] `npm test`, `npm run verificar:modulos` y el validador en verde.
- [ ] Luis lo verifica en teléfono real, datos móviles, DevTools cerrado.

## 9. Dudas abiertas (máximo 5)

Ninguna abierta. Resueltas por Luis el 2026-11-08: (1) bloque "Patrones" en el panel de estadísticas, sin capa en el mapa; (2) contrato derivado de RF-14; (3) criterio del 50 % de RF-18; (4) valor b publicado en la interfaz con IC, familia, n y texto fijo. El gate del contrato está cerrado (`CLAUDE.md:94`).
