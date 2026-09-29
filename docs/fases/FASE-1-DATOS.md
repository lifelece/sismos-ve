# Fase 1 — Datos

> **Gate de entrada:** Fase 0 cerrada y aprobada por Luis.
> **Gate de salida:** comparar 10 eventos de `data/eventos.json` con el sitio
> oficial del USGS (https://earthquake.usgs.gov/earthquakes/map/) y que
> coincidan.

**Tiempo estimado:** 1-2 sesiones · **Estado:** pendiente, no ejecutada

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

## Plantilla de la consulta FDSN — bounding box A VERIFICAR POR LUIS

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

- [ ] Bounding box y parametros de la consulta confirmados por Luis (ya no
      "a verificar")
- [ ] `data/eventos.json` generado por la Action, no escrito a mano
- [ ] Contrato de datos completo en el 100% de los registros
- [ ] Validador en CI, verificado con un dato malo de prueba (falla) y con el
      dato real (pasa)
- [ ] 10 eventos comparados uno a uno contra el sitio del USGS

## STOP GATE

Comparar 10 eventos con el sitio oficial del USGS. Si algo no coincide
(magnitud, ubicacion, fecha), no se cierra la fase: se investiga si es un
problema de zona horaria, de redondeo, o de la consulta antes de seguir.
