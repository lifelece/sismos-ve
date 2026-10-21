# Fase 1 — Datos

> **Gate de entrada:** Fase 0 cerrada y aprobada por Luis.
> **Gate de salida:** comparar 10 eventos de `data/eventos.json` con el sitio
> oficial del USGS (https://earthquake.usgs.gov/earthquakes/map/) y que
> coincidan.

**Tiempo estimado:** 1-2 sesiones · **Estado:** **cerrada** (gate de Luis,
2026-10-21: "Rectangulo + etiqueta"; ver "Cierre del gate" al final). Rama
`f1-datos`.

## Objetivo

Una GitHub Action diaria que consulta el servicio FDSN de eventos del USGS,
guarda un `data/eventos.json` versionado en Git, y un validador en CI que
falla si entra un registro sin el contrato de datos (`fuente`, `confianza`,
`ultima_verificacion`) o fuera de los limites geograficos/temporales
esperados. La web **nunca** llama al USGS en tiempo de ejecucion (regla 3 de
`CLAUDE.md`): esta fase es la unica pieza que habla con la API.

## Entregables

- `.github/workflows/fetch-eventos.yml` — corre diario (`schedule: cron`) y en
  `workflow_dispatch` manual
- `scripts/fetch-eventos.mjs` — consulta FDSN, aplica el contrato de datos,
  escribe `data/eventos.json`
- `scripts/validate-eventos.mjs` — validador de CI: falla con codigo 1 si
  falta `fuente`/`confianza`/`ultima_verificacion`, si una coordenada cae
  fuera del bounding box esperado, o si el JSON esta roto
- `.github/workflows/validar-datos.yml` — corre el validador en cada push/PR
  que toque `data/`
- `data/eventos.json` — el catalogo curado (se genera al correr la Action;
  no se escribe a mano)

## Plantilla de la consulta FDSN — confirmada en el gate (2026-10-21)

> **Cerrado.** Luis confirmo el rectangulo con etiqueta por poligono, M>=3 y
> desde 1990 (ver "Cierre del gate" y ADR-003). El texto de abajo se conserva
> como historial de la decision.

**Esta plantilla no esta cerrada.** El bounding box de abajo es un punto de
partida geometrico (un rectangulo generoso alrededor del territorio
continental de Venezuela) y **no** ha sido confirmado por Luis contra el sitio
del USGS ni contra una fuente cartografica oficial. No se debe tratar como
dato final.

```
GET https://earthquake.usgs.gov/fdsnws/event/1/query
    ?format=geojson
    &starttime=1990-01-01
    &endtime=<hoy, la pone la Action>
    &minmagnitude=3
    &minlatitude=0.5      # [A VERIFICAR POR LUIS]
    &maxlatitude=13.0     # [A VERIFICAR POR LUIS]
    &minlongitude=-73.5   # [A VERIFICAR POR LUIS]
    &maxlongitude=-59.5   # [A VERIFICAR POR LUIS]
    &orderby=time
```

Puntos que Luis tiene que decidir o confirmar antes de que esta consulta se
use en produccion:

1. **El rectangulo.** El de arriba cubre de sobra el territorio continental,
   pero:
   - No se verifico si conviene incluir toda la Zona Economica Exclusiva y las
     dependencias federales (islas), donde tambien hay sismicidad registrada.
   - Un bounding box rectangular sobre Venezuela incluye trozos de Colombia,
     Brasil, Guyana y el Caribe. Hay que decidir si eso se **filtra despues**
     por un poligono real (mas preciso, mas trabajo) o si se **acepta y se
     documenta** como "region", igual que Orinoco documento su bounding box de
     la Faja con fuente y metodo (ver `orinoco-digital` ADR relacionado). La
     recomendacion de Claude Code es la segunda opcion para el MVP, con el
     dato marcado como "region ampliada, no territorio exacto" en la UI — pero
     es Luis quien decide.
   - La disputa de la Guayana Esequiba (ya documentada como zona en disputa en
     Orinoco Digital) puede requerir el mismo tratamiento neutral aqui si cae
     sismicidad dentro de esa zona.
2. **`minmagnitude=3`** viene de la ficha del proyecto tal cual. Confirmar que
   sigue siendo el umbral que Luis quiere: mas bajo trae mucho mas ruido
   (microsismos), mas alto puede dejar fuera eventos sentidos localmente.
3. **`starttime=1990-01-01`** viene de la ficha. El catalogo del USGS tiene
   cobertura mas completa y mas fiable cuanto mas reciente es el evento;
   eventos viejos pueden tener menos precision o menos revision. Esto es
   relevante para el campo `confianza` (ver `CLAUDE.md` seccion 5) y para
   como se presenta la incertidumbre en la Fase 3.
4. **Limite de resultados.** El servicio FDSN limita a 20 000 resultados por
   consulta (parametro `limit`, rango 1-20000). Con `minmagnitude=3` desde
   1990 en una region del tamaño de Venezuela es improbable llegar a ese
   techo, pero el script de descarga debe comprobar el conteo real (parametro
   `count` con `format=text`, o revisar `metadata.count` en la respuesta
   GeoJSON) y avisar si se acerca al limite, en vez de truncar en silencio.

## Contrato de datos — implementacion

`scripts/fetch-eventos.mjs` envuelve cada `feature` del GeoJSON del USGS sin
descartar ninguno de sus campos originales, añadiendo:

```js
// Propuesta de CLAUDE.md seccion 5, a confirmar en esta fase
feature.properties.fuente = "USGS FDSN Event Web Service";
feature.properties.confianza = feature.properties.status === "reviewed"
  ? "alta"
  : "media"; // status === "automatic" -> ver nota abajo
feature.properties.ultima_verificacion = fechaDeHoyISO(); // cuando corrio la Action
```

**Nota abierta:** el USGS solo documenta dos valores de `status`
(`"reviewed"` y `"automatic"`). Si Luis quiere un tercer nivel `baja`, hay que
decidir de que campo del USGS saldria (candidatos: `nst` bajo — pocas
estaciones — o `gap` alto — mal cubierto azimutalmente). Queda para decidir en
esta fase, no en la Fase 0.

`scripts/validate-eventos.mjs` falla el build si:

- Falta `fuente`, `confianza` o `ultima_verificacion` en cualquier registro.
- Falta `mag` o la geometria no es un `Point` con `[lon, lat, profundidad_km]`.
- Una coordenada cae fuera del bounding box verificado (una vez Luis lo
  confirme).
- El archivo no es JSON valido o no es una `FeatureCollection`.

## Pasos para Claude Code (cuando se abra esta fase)

1. Confirmar con Luis los cuatro puntos "A VERIFICAR" de arriba antes de
   escribir el bounding box final en el codigo.
2. Escribir `scripts/fetch-eventos.mjs` en Node nativo (sin dependencias:
   `fetch` global de Node 20+, sin librerias de red).
3. Escribir `scripts/validate-eventos.mjs`, tambien sin dependencias.
4. Escribir los dos workflows de GitHub Actions.
5. Correr el fetch una vez localmente (o via `workflow_dispatch`) para generar
   la primera version de `data/eventos.json`.
6. Comparar a mano 10 eventos del archivo contra
   https://earthquake.usgs.gov/earthquakes/map/ (magnitud, lugar, fecha,
   profundidad).
7. Detenerse para el STOP gate.

## Criterios de salida

- [x] Bounding box y parametros de la consulta confirmados por Luis
      (2026-10-21: rectangulo + etiqueta `en_venezuela`/`zona_disputada`,
      M>=3, desde 1990, confianza solo con los niveles del USGS)
- [ ] `data/eventos.json` generado por la Action, no escrito a mano — hoy lo
      genero `scripts/fetch-eventos.mjs` en una corrida local real; falta la
      primera corrida de la Action cuando el repo tenga remoto
- [x] Contrato de datos completo en el 100% de los registros (4358/4358,
      `node scripts/validate-eventos.mjs` → 0 errores), etiquetas de
      territorio incluidas y recalculadas contra los poligonos
- [ ] Validador en CI, verificado con un dato malo de prueba (falla) y con el
      dato real (pasa) — verificado en local y en `npm test` (34 tests);
      falta verlo en GitHub Actions cuando exista el remoto
- [x] 10 eventos comparados uno a uno contra el sitio del USGS — comparados
      por Claude Code contra el feed de cada ficha (10/10 coinciden); Luis
      cerro el gate sin repetirlo (puede hacerlo con la tabla de abajo)

## STOP GATE

Comparar 10 eventos con el sitio oficial del USGS. Si algo no coincide
(magnitud, ubicacion, fecha), no se cierra la fase: se investiga si es un
problema de zona horaria, de redondeo, o de la consulta antes de seguir.

## Implementacion (2026-10-20, Claude Code)

Decisiones tecnicas tomadas al implementar, revisables en el gate:

- `fuente` = texto fijo `"USGS FDSN Event Web Service"`, literal de este
  guion. La red y las fuentes contribuyentes quedan en `properties.net` y
  `properties.sources` del propio evento, intactas (CLAUDE.md seccion 5).
- `confianza`: `status: "reviewed"` -> `alta`; cualquier otro valor ->
  `media`. El vocabulario `alta/media/baja` es la armadura "confianza-escala"
  del contrato de procedencia que ya usa orinoco-digital.
- `ultima_verificacion` = fecha **UTC** de la corrida (las Actions corren en
  UTC). La primera corrida fue el 20/10 a las 21:12 hora de Venezuela, que ya
  era 2026-10-21 en UTC: por eso los registros dicen `2026-10-21`.
- Una sola fuente de verdad para la region: `REGION` e `INICIO_CATALOGO` viven
  en `scripts/validate-eventos.mjs`, y `fetch-eventos.mjs` construye la
  consulta con esos mismos valores.
- Antes de descargar se pregunta a `/count`: si el total llega a 20 000 el
  script falla en vez de truncar; desde 16 000 avisa. Con 0 eventos tambien
  falla, para no sobrescribir el catalogo con una respuesta vacia.
- `endtime` = instante de la corrida (UTC, a segundos), no medianoche.
- `data/eventos.json` lleva un evento por linea: JSON valido y diffs legibles.
- La Action diaria **no escribe en `main`**: abre o actualiza un PR desde la
  rama `datos-diario` (mismo patron que `datos-semanal` de orinoco-digital).
  Como `ultima_verificacion` cambia en cada corrida, el PR diario toca todas
  las lineas; su cuerpo resume nuevos / revisados por el USGS / retirados para
  que la revision no dependa de leer el diff entero.
- `engines` sube a Node >=22 (Node 20 ya esta fuera de soporte) porque
  `npm test` usa el glob nativo de `node --test`.

Hallazgos de la primera corrida, utiles para cerrar los puntos "A VERIFICAR":

- **4358 eventos** M>=3 entre 1990-01-01T18:03:19Z y 2026-10-13T21:24:21Z;
  21 % del limite de 20 000 por consulta.
- **100 % `status: reviewed`**, asi que hoy todos salen `confianza: alta`. Un
  nivel `baja` solo tendria sentido derivandolo de otro campo (`nst`, `gap`),
  como dice la nota abierta del contrato.
- 100 % `type: earthquake`, todos de la red `us`.
- Reparto por la etiqueta de lugar del USGS: Colombia 1796, Venezuela 1489
  (+34 "near the coast of Venezuela", +5 "Colombia-Venezuela border region"),
  Trinidad and Tobago 756 (+7 "Trinidad"), Grenada 153, northern Colombia 33,
  Barbados 30, Saint Vincent and the Grenadines 25, Windward Islands 12,
  Guyana 10, otros 8. **Solo ~35 % del rectangulo es Venezuela**, y 631
  eventos estan junto a Cepita (Colombia). Esto pesa en el punto 1: filtrar
  por poligono o documentar "region ampliada". Los 10 de "Guyana" son los
  candidatos a revisar con el criterio neutral de la Guayana Esequiba.
- Peso del archivo: 3,5 MB sin comprimir. Relevante para la Fase 2 (red
  movil) y para "Cuando reconsiderar" de ADR-002.

## Verificacion del gate

**Seleccion (reproducible):** los 5 eventos de mayor magnitud mas 5
equiespaciados en el orden del archivo (posiciones 0, n/4, n/2, 3n/4 y n-1,
con n = 4358; el archivo va del mas reciente al mas antiguo).

**Comparacion de Claude Code (2026-10-20):** cada evento contra
`https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/<id>.geojson`, el
feed que carga la ficha publica. Igualdad exacta en magnitud, hora (al
milisegundo), latitud, longitud y profundidad, y mismo `updated`: **10/10
coinciden.**

**Como repetirlo (Luis):** abrir cada enlace y comparar con la fila. La hora
de la tabla es UTC; si la ficha muestra hora local, Venezuela es UTC-4 (por
ejemplo, 22:05 UTC = 18:05 en Caracas). La ficha redondea: 3 decimales en las
coordenadas y 1 en la profundidad.

| # | Ficha del USGS | Lugar (texto del USGS) | M (tipo) | Hora UTC | Lat, Lon | Prof. km | Claude Code | Luis |
|---|---|---|---|---|---|---|---|---|
| 1 | [us6000t7zp](https://earthquake.usgs.gov/earthquakes/eventpage/us6000t7zp) | 20 km W of Catia La Mar, Venezuela | 7.5 (mww) | 2026-06-24 22:05:04 | 10.5955, -67.2205 | 10 | Coincide | [ ] |
| 2 | [us1000gez7](https://earthquake.usgs.gov/earthquakes/eventpage/us1000gez7) | 40 km ENE of Carúpano, Venezuela | 7.3 (mww) | 2018-08-21 21:31:47 | 10.7731, -62.9019 | 146.82 | Coincide | [ ] |
| 3 | [us6000t7zc](https://earthquake.usgs.gov/earthquakes/eventpage/us6000t7zc) | 20 km E of San Felipe, Venezuela | 7.2 (mww) | 2026-06-24 22:04:31 | 10.3713, -68.5564 | 10 | Coincide | [ ] |
| 4 | [usp00084m2](https://earthquake.usgs.gov/earthquakes/eventpage/usp00084m2) | 26 km WSW of Carúpano, Venezuela | 7.0 (mwc) | 1997-07-09 19:24:13 | 10.598, -63.486 | 19.9 | Coincide | [ ] |
| 5 | [usp000810j](https://earthquake.usgs.gov/earthquakes/eventpage/usp000810j) | 18 km WSW of Scarborough, Trinidad and Tobago | 6.7 (mwb) | 1997-04-22 09:31:23 | 11.112, -60.892 | 5 | Coincide | [ ] |
| 6 | [us6000u25i](https://earthquake.usgs.gov/earthquakes/eventpage/us6000u25i) | 5 km NW of Cepitá, Colombia | 4.8 (mb) | 2026-10-13 21:24:21 | 6.7888, -73.0065 | 162.209 | Coincide | [ ] |
| 7 | [usb000szzw](https://earthquake.usgs.gov/earthquakes/eventpage/usb000szzw) | 2 km E of Cepitá, Colombia | 5.1 (mwr) | 2014-11-25 20:20:16 | 6.7588, -72.949 | 165.91 | Coincide | [ ] |
| 8 | [usp000ecng](https://earthquake.usgs.gov/earthquakes/eventpage/usp000ecng) | 19 km NW of Quíbor, Venezuela | 4.1 (md) | 2006-03-21 18:34:23 | 10.06, -69.74 | 0.1 | Coincide | [ ] |
| 9 | [usp000814n](https://earthquake.usgs.gov/earthquakes/eventpage/usp000814n) | 15 km W of Scarborough, Trinidad and Tobago | 4.9 (mb) | 1997-04-23 22:25:01 | 11.156, -60.872 | 5 | Coincide | [ ] |
| 10 | [usp00043tv](https://earthquake.usgs.gov/earthquakes/eventpage/usp00043tv) | 8 km NNW of Cepitá, Colombia | 5.3 (mb) | 1990-01-01 18:03:19 | 6.83, -72.995 | 157.8 | Coincide | [ ] |

Filas 1-5: mayor magnitud. Filas 6-10: equiespaciadas (6 es el evento mas
reciente del archivo y 10 el mas antiguo). Que 5 de los 10 caigan fuera de
Venezuela no es un error de la consulta: es el reparto real del rectangulo
provisional (ver hallazgos arriba).

## Cierre del gate (2026-10-21)

**Decision de Luis: "Rectangulo + etiqueta"** (ADR-003, aceptada). Se sigue
descargando el rectangulo y cada evento lleva `en_venezuela` y
`zona_disputada`. En la Fase 2 el mapa muestra solo Venezuela por defecto,
con un interruptor para ver la region. Se mantienen M>=3, desde 1990, y
`confianza` solo con los niveles del USGS (sin `baja`) salvo objecion de
Luis.

### Implementacion (Claude Code)

- Poligonos: `data/limites-venezuela.geojson` y `data/zona-disputada.geojson`,
  copias sin cambios de orinoco-digital (`public/data/`, `main` en
  `aa108df`). Fuente, licencia, atribucion y SHA-256 en `LICENSE-DATA` §3.
  Vienen como LineString cerrados (limites para dibujar):
  `scripts/territorio.mjs` reconstruye los poligonos por anidamiento de
  anillos (profundidad par = tierra, impar = hueco). Venezuela sale como
  MultiPolygon de 23 poligonos (tierra firme, islas del Caribe y del delta),
  sin huecos.
- Punto en poligono por ray casting par-impar, sin dependencias, con huecos
  y MultiPolygon; caja envolvente para descartar rapido.
- Las etiquetas se calculan en `fetch-eventos.mjs` (Action diaria) y, sin
  red, con `npm run data:etiquetar` (`scripts/etiquetar-eventos.mjs`), que
  no toca `ultima_verificacion` ni ningun dato del USGS.
- `data/eventos.json` se regenero con ese paso, sin volver a consultar al
  USGS. `metadata.etiquetas` cita la procedencia de los poligonos.
- Validador: exige las dos etiquetas como booleanos, nunca las dos en true;
  desde el CLI (y en el CI) las recalcula contra `data/` y falla si alguna
  no coincide.
- Solape: las dos fuentes trazan la frontera de facto con vertices distintos y
  dejan franjas finas en los dos poligonos (24 puntos de una malla de 0,01
  grados sobre toda la frontera). Ahi gana `zona_disputada`.
- Tests (`test/territorio.test.mjs`): geometria sintetica (huecos,
  MultiPolygon, U concava, rayo por un vertice, anidamiento isla-lago-
  continente) y casos borde con los poligonos reales: costa (El Avila / mar
  frente a La Guaira, Puerto Cabello), islas (Margarita, La Tortuga, mar entre
  Araya y Margarita), Esequibo, Georgetown, Colombia (Cepita, Cucuta), Trinidad,
  Brasil, Santa Elena de Uairen y eventos reales del cotejo.

### Resultado sobre el catalogo del 2026-10-21

| Etiqueta | Eventos |
|---|---|
| `en_venezuela: true` | 645 |
| `zona_disputada: true` | 6 (todos "km SSE of Lethem, Guyana", al oeste del rio Esequibo) |
| Ninguna de las dos (mar o paises vecinos) | 3707 |
| Total | 4358 |

### Limites conocidos

1. **El mar queda en `false`.** El poligono es terrestre. De los 1528 eventos
   con "Venezuela" en la etiqueta de lugar del USGS, **925 caen en el mar**
   (Golfo de Paria, costa central y oriental, frente a Guiria, Carupano o La
   Guaira). La vista "solo Venezuela" de la Fase 2 no los mostrara: es el
   limite mas visible de esta decision.
2. **Simplificacion de ~440 m** en la linea de geoBoundaries. Un epicentro a
   menos de ~0,5 km de la costa o la frontera puede caer del otro lado; los
   epicentros del USGS tienen incertidumbres de kilometros, asi que la
   etiqueta nunca es mas precisa que el dato.
3. **La frontera es la de facto.** geoBoundaries traza el limite oriental en
   la linea administrada por Guyana; por eso la zona en disputa va en etiqueta
   propia y nunca se cuenta como `en_venezuela`. Mismo trato que
   orinoco-digital: la clasificacion la pone Natural Earth.
4. Un punto exactamente sobre un borde puede salir dentro o fuera.

### Propuesta para Luis: capa de zona economica exclusiva (ZEE)

Para que los sismos del mar venezolano no desaparezcan de la vista por
defecto. Dos opciones, a decidir por Luis (no implementadas):

- **A. ZEE oficial**: una tercera etiqueta `en_zee` con los limites
  maritimos de Marine Regions (Flanders Marine Institute, "Maritime
  Boundaries / World EEZ"). Licencia y version **a verificar** antes de
  usarla. Ojo: varias fronteras maritimas de Venezuela no estan acordadas
  (Golfo de Venezuela con Colombia, la fachada del Esequibo con Guyana), asi
  que necesitaria el mismo trato neutral que la zona en disputa.
- **B. Franja costera** sin datos nuevos: "a menos de N km de la costa
  venezolana", calculada con el mismo poligono. Mas simple y sin licencias,
  pero no es un limite juridico y habria que decir N.

Recomendacion de Claude Code: B para la Fase 2-3 (cero dependencias, cero
licencias nuevas) y A solo si el proyecto necesita hablar de jurisdiccion.
