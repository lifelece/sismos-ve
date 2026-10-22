# ADR-003 — Region: rectangulo del USGS + etiqueta por poligono

**Fecha:** 2026-10-21 · **Estado:** Aceptada (Luis, 2026-10-21, gate de la
Fase 1: "Rectangulo + etiqueta")

## Contexto

La primera corrida de la Fase 1 mostro que solo ~35 % de los eventos del
rectangulo provisional (lat 0,5 a 13; lon -73,5 a -59,5) llevan "Venezuela" en
la etiqueta de lugar del USGS: el rectangulo incluye trozos de Colombia,
Brasil, Guyana, Trinidad y Tobago y el Caribe (ver
`docs/fases/FASE-1-DATOS.md`, "Hallazgos"). `FASE-1-DATOS.md` dejaba dos
caminos: filtrar por un poligono real o aceptar y documentar "region
ampliada".

Opciones evaluadas:

1. **Consulta FDSN por poligono.** El servicio FDSN del USGS solo acepta
   rectangulo o circulo (`minlatitude`... o `latitude`/`longitude`/
   `maxradiuskm`): no hay consulta por poligono. Habria que filtrar despues.
2. **Filtrar y descartar** lo que cae fuera del poligono. Pierde la sismicidad
   regional (la placa del Caribe no se para en la frontera) y la que ocurre en
   el mar frente a la costa venezolana.
3. **Descargar el rectangulo y etiquetar** cada evento sin descartar nada.

## Decision

Opcion 3. Se sigue descargando el rectangulo del USGS, y cada evento lleva dos
booleanos:

- `en_venezuela`: el epicentro cae dentro del poligono **terrestre** de
  Venezuela, con islas.
- `zona_disputada`: el epicentro cae dentro de la zona en disputa de la
  Guayana Esequiba, con el mismo trato neutral que orinoco-digital
  (`docs/DATA_SOURCES.md` §13 de ese proyecto): la clasificacion la pone la
  fuente (Natural Earth, `TYPE: Disputed`), no el proyecto.

Las dos son excluyentes. En las franjas finas donde las dos fuentes se solapan
por su distinta simplificacion, gana `zona_disputada`.

En la Fase 2 el mapa muestra solo Venezuela por defecto, con un interruptor
para ver la region completa.

Se mantienen, salvo objecion de Luis: M >= 3, desde 1990-01-01, y `confianza`
solo con los niveles del USGS (`reviewed` -> `alta`, cualquier otro -> `media`;
sin nivel `baja` derivado de `nst` o `gap`).

## Por que

- No se pierde ningun dato del USGS: el contrato se anade, no reemplaza
  (CLAUDE.md seccion 5).
- La etiqueta se calcula una vez, en la Action, y el navegador solo filtra un
  booleano: cero geometria en el cliente, cero dependencias.
- Poligonos ya curados y publicos en orinoco-digital (mismo autor, misma
  postura neutral sobre el Esequibo): JSON publico -> repo publico (Ley 2 de
  JARVIS, artefacto agnostico). Licencias en `LICENSE-DATA` §3.

## Consecuencias

- `data/eventos.json` gana dos campos por evento (~200 KB sin comprimir).
- El validador del CI exige las dos etiquetas y, desde el CLI, las recalcula
  contra `data/` y falla si no coinciden.
- **Limite conocido: el mar.** El poligono es terrestre: un epicentro frente a
  la costa queda en `false`. En el catalogo del 2026-10-21, 925 eventos con
  "Venezuela" en la etiqueta del USGS caen en el mar (Golfo de Paria, costa
  central y oriental). La vista "solo Venezuela" de la Fase 2 no los mostrara.
  Propuesta para Luis: una tercera etiqueta con la zona economica exclusiva
  (ver `FASE-1-DATOS.md`, "Limites conocidos").
- **Limite conocido: la simplificacion.** La linea de geoBoundaries esta
  simplificada a ~440 m; los epicentros del USGS tienen incertidumbres de
  kilometros. La etiqueta nunca es mas precisa que el propio epicentro.

## Cuando reconsiderar

- Si Luis aprueba la capa de zona economica exclusiva: se anade una etiqueta
  `en_zee` (ADR nuevo con fuente y licencia), sin tocar las dos actuales.
- Si cambian los poligonos de origen: `npm run data:etiquetar` regenera las
  etiquetas sin volver a consultar al USGS.
