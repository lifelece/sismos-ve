# ADR-001 — Leaflet como motor de mapa

**Fecha:** 2026-09-29 · **Estado:** Aceptado (Luis, 2026-10-20)
en el STOP gate de la Fase 0

## Contexto

La ficha del proyecto (Notion, 29/09/2026) ya nombra Leaflet como motor de
mapa ("Leaflet (ligero; ADR-001)"), pero pide que la eleccion quede razonada
en un ADR frente a las alternativas, en vez de darse por sentada. Se evaluan
tres motores para un panel **2D** de sismicidad: circulos por magnitud sobre
un mapa base, deslizador de tiempo, filtros, mapa de "cerca de mi ciudad".

No es el mismo problema que resolvio Orinoco Digital: alli el terreno 3D
navegable de la Faja del Orinoco era parte del valor del producto (ADR-001 de
ese proyecto), y eso justificaba el peso de CesiumJS. Aqui la geometria es
plana: puntos con magnitud, profundidad y tiempo. Un globo 3D no añade
informacion a esa lectura y sí añade peso y complejidad.

## Opciones evaluadas

### CesiumJS (usado en Orinoco Digital)

- Motor de globo 3D con terreno topografico real. Excelente para el caso de
  Orinoco (infraestructura sobre relieve real), pero es una herramienta de
  otra categoria de problema.
- Peso verificado en la practica: el propio `docs/PERFORMANCE_BUDGET.md` de
  Orinoco registra que el primer build con Cesium completo pesa **4,19 MB de
  JS (1,13 MB comprimido)**, y que ese numero "es demasiado" incluso para un
  proyecto pensado para llevar ese peso.
- Para un panel de puntos 2D, cargar un motor de renderizado de terreno
  global es peso sin beneficio. Se descarta.

### MapLibre GL JS

- Renderizador de teselas **vectoriales** sobre WebGL, mas moderno y con
  estilos mas ricos que un mapa de teselas raster clasico. Es la opcion
  intermedia razonable si el proyecto necesitara estilos de mapa muy
  personalizados o rendimiento con miles de puntos animados.
- Requiere una fuente de teselas **vectoriales** (estilo + tiles), que
  normalmente implica un proveedor con capa gratuita limitada (p. ej.
  MapTiler, Stadia Maps) o auto-alojar el pipeline de teselas: mas piezas
  moviles que las que este proyecto necesita para una version 1.
- Es mas pesado que Leaflet y su API esta pensada para casos que sacan
  partido del renderizado vectorial (estilos dinamicos, rotacion 3D de
  camara), ninguno de los cuales pide la ficha del proyecto.
- No es descartable a futuro (ver "Cuando reconsiderar"), pero es mas de lo
  que el MVP necesita.

### Leaflet

- Libreria de mapas 2D raster/vectorial mas usada del ecosistema open source,
  con 15+ años de madurez y un caso de uso extremadamente comun que coincide
  con el de este proyecto: mapas de eventos puntuales (sismos, incidentes,
  estaciones) con `L.circleMarker`, popups y capas por filtro.
- Peso declarado por el propio proyecto: la pagina oficial
  (https://leafletjs.com/) dice literalmente *"Weighing just about 42 KB of
  JS, it has all the mapping features most developers ever need"* — sin
  precisar si esa cifra es minificada o comprimida con gzip; se toma como
  referencia de orden de magnitud, no como numero exacto verificado por
  Claude Code con una build propia (eso se mide de verdad en la Fase 2, igual
  que Orinoco midio su build real en la Fase 0 en vez de fiarse de una cifra
  de marketing).
- API simple para exactamente las cuatro funcionalidades de mapa de la
  ficha (circulos por magnitud/profundidad, deslizador de tiempo, filtro,
  ficha del evento). No hace falta aprender un lenguaje de estilos como en
  MapLibre.
- Funciona out-of-the-box con un `L.tileLayer` raster clasico, que es
  justamente el modelo de teselas de OpenStreetMap (ver seccion siguiente).

## Decision

**Leaflet**, con teselas raster. Confirma lo que ya proponia la ficha del
proyecto.

## Presupuesto de JS

El estandar del portafolio fija 150 KB comprimidos de JS **propio** (regla 8).
Leaflet es una dependencia, no JS propio, pero su peso entra igual en lo que
descarga el usuario final en red movil venezolana (mismo criterio de
`PERFORMANCE_BUDGET.md` de Orinoco). Con Leaflet en el orden de ~40 KB
(cifra de la propia libreria, a confirmar con una build real en la Fase 2) mas
Tailwind mas el JS propio del proyecto, el total deberia quedar muy por debajo
del 1,13 MB gzip que Orinoco documento como "demasiado" para Cesium. Ese es
precisamente el argumento a favor de Leaflet frente a Cesium o MapLibre para
este caso: la arquitectura entera queda dentro del presupuesto sin tener que
pelear contra el motor de mapa.

La Fase 2 debe repetir el ejercicio que hizo Orinoco en su Fase 0: medir el
build real (`npm run build`) y registrar la cifra verificada en
`docs/PERFORMANCE_BUDGET.md` de este proyecto (archivo que aun no existe;
se crea cuando arranque la Fase 2, no antes).

## Decision abierta: proveedor de teselas del mapa base

**Esto NO queda cerrado en este ADR.** Leaflet resuelve el motor; falta
decidir de donde salen las imagenes de fondo (las "teselas") que Leaflet
dibuja.

### Lo verificado sobre el servidor por defecto de OpenStreetMap

Se reviso la politica de uso oficial de los servidores de teselas de OSM
(`tile.openstreetmap.org`), en
https://operations.osmfoundation.org/policies/tiles/:

- **Atribucion obligatoria y visible:** "© OpenStreetMap contributors",
  sin poder ocultarla tras otra interfaz ni sacarla de pantalla.
- **User-Agent identificable:** un valor propio y unico por aplicacion
  (ejemplo de la propia politica: algo como
  `"MiApp/1.0 (+https://miapp.example; contacto: correo@ejemplo.org)"`), nunca
  el valor generico de una libreria ni una suplantacion de navegador.
- **Cache obligatorio:** respetar las cabeceras HTTP o cachear un minimo de 7
  dias; nunca enviar `Cache-Control: no-cache`.
- **Prohibido expresamente:** descarga masiva de teselas, funciones de "modo
  sin conexion" que precarguen zonas enteras o varios niveles de zoom, y bots
  automatizados. **Solo se permite visualizacion interactiva** donde el
  cliente pide las teselas del area visible en cada momento — que es
  exactamente el patron de uso de este proyecto.
- **Recomendaciones para produccion:** no fijar la URL de teselas en el
  codigo de forma que no se pueda cambiar, ofrecer un enlace para "reportar un
  problema del mapa", publicar un correo de contacto.
- **La propia politica recomienda no depender de `tile.openstreetmap.org`
  para uso de produccion o de volumen alto**, y sugiere alternativas:
  servicios comerciales basados en datos de OSM, teselas vectoriales
  (que llevaria de vuelta a evaluar MapLibre), o auto-alojar las teselas
  (guia en switch2osm.org).

### Por que queda abierto

`tile.openstreetmap.org` es viable para el volumen de trafico que se espera
de un proyecto de portafolio personal en sus primeras fases, y no exige
registro ni clave — por eso esta Fase 0 no crea `.env.example` (no hay
proveedor con clave todavia). Pero:

1. No hay forma de saber en la Fase 0 cuanto trafico tendra el proyecto
   cuando se publique (Fase 4) ni si "proyecto de portafolio personal" sigue
   calificando como uso aceptable bajo esa politica en ese momento.
2. Comprometerse ahora a un proveedor alternativo con capa gratuita (por
   ejemplo un estilo de CARTO, o un proveedor con clave como MapTiler/Stadia)
   añadiria una dependencia de servicio externo y potencialmente una clave que
   proteger, sin que la ficha del proyecto haya pedido esa complejidad para
   el MVP.

**Se deja como decision abierta para la Fase 2**, cuando exista trafico real
que evaluar. La recomendacion de Claude Code, no vinculante, es: arrancar con
`tile.openstreetmap.org` cumpliendo la politica al pie de la letra (User-Agent
propio, atribucion visible, cache respetado, sin precarga), y migrar a un
proveedor alternativo si el trafico crece o si la politica de uso se vuelve un
riesgo. Luis decide si prefiere resolverlo antes.

## Consecuencias

- El JS del mapa queda muy por debajo de lo que costaria Cesium o MapLibre,
  dejando margen para el resto del proyecto dentro del presupuesto de
  rendimiento.
- Se renuncia a estilos de mapa muy personalizados y a renderizado vectorial
  (irrelevante para este caso de uso).
- Queda pendiente, explicitamente, la eleccion final del proveedor de
  teselas — no es una omision, es una decision que este ADR marca a
  proposito como abierta hasta la Fase 2.

## Cuando reconsiderar

- Si una fase futura pide un mapa con miles de puntos animados en tiempo
  real, estilos vectoriales dinamicos, o vistas 3D: reevaluar MapLibre GL JS
  con un ADR nuevo.
- Si el trafico de produccion hace inviable `tile.openstreetmap.org` bajo su
  propia politica de uso: resolver la decision abierta de arriba con un ADR
  nuevo (o una seccion añadida a este, si sigue en estado Propuesto cuando
  ocurra).
