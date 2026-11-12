# Aviso importante / Important Notice

## Español

### Que es este proyecto

sismos-ve es un panel **educativo y de divulgacion**, construido por una
persona a partir de **datos publicos** del Servicio Geologico de Estados
Unidos (USGS). Muestra actividad sismica en Venezuela: mapa, linea de tiempo,
estadisticas y sismos cerca de una ciudad elegida.

### Que NO es

- **No es un sistema de alerta temprana.** No detecta sismos en curso, no
  envia avisos, no predice sismos futuros y no debe usarse para decisiones de
  seguridad, evacuacion ni respuesta a una emergencia. Si sientes un sismo,
  sigue los protocolos oficiales de tu localidad, no esta pagina.
- **No es una fuente oficial.** No esta afiliado al Servicio Geologico de
  Estados Unidos (USGS), a FUNVISIS, ni a ninguna institucion del gobierno de
  Venezuela o de Estados Unidos.
- **No es asesoria de ingenieria ni de seguridad.**

### Sobre la fuente de los datos: USGS vs. FUNVISIS

Todos los datos sismicos de este panel provienen del catalogo del **Servicio
Geologico de Estados Unidos (USGS)**, un catalogo global. La red de referencia
para sismologia en Venezuela es la **Fundacion Venezolana de Investigaciones
Sismologicas (FUNVISIS)**.

El USGS y FUNVISIS pueden reportar **magnitud, epicentro o profundidad
distintos** para el mismo evento: son redes independientes, con estaciones,
metodos y tiempos de revision propios. Este panel muestra unicamente la
version del USGS y no la promedia ni la corrige contra otras fuentes. Si
necesitas el dato oficial venezolano, consulta directamente a FUNVISIS.

### Sobre la exactitud de los datos

Los datos se actualizan una vez al dia desde el servicio publico del USGS y
pueden tener eventos revisados o corregidos con posterioridad por el propio
USGS. Cada evento indica su fuente, un nivel de confianza y la fecha en que
este proyecto lo verifico por ultima vez.

**Si detectas un error, abre un issue.** Las correcciones con fuente se
revisan y se aplican.

### Sobre la seccion "Patrones" (estadistica del catalogo pasado)

> PROPUESTA de texto: pendiente de aprobacion de Luis en el PR.

La seccion "Patrones" del panel de estadisticas es una **descripcion
estadistica del catalogo pasado** (1990 hasta la fecha del catalogo). **No
predice sismos**: no estima cuando, donde ni de que tamano ocurrira ninguno, y
no senala zonas como mas o menos peligrosas. Sus zonas son agrupaciones de
epicentros ya registrados y el valor b (la proporcion entre sismos pequenos y
grandes) se calcula con su intervalo de confianza del 95 %, su magnitud de
completitud, el tipo de magnitud y el numero de eventos. Las cifras dependen
del metodo y de sus parametros (ver `docs/adr/ADR-010-patrones-estadisticos.md`),
la completitud del catalogo cambio en 36 anos y una zona puede continuar fuera
del area consultada. Los filtros de anos y magnitud no cambian estas cifras.

### Neutralidad

Este proyecto describe la actividad sismica con datos y fuentes. **No toma
posicion politica** sobre la gestion de emergencias de ningun gobierno ni
institucion.

### Licencias

- **Codigo:** MIT. Ver [LICENSE](LICENSE).
- **Datos:** ver [LICENSE-DATA](LICENSE-DATA) para el regimen del catalogo del
  USGS y de las teselas del mapa base.

### Contacto

Errores, correcciones y sugerencias: via issues en el repositorio de GitHub.

---

## English

### What this project is

sismos-ve is an **educational, informational dashboard**, built by one person
from **public data** published by the U.S. Geological Survey (USGS). It shows
seismic activity in Venezuela: a map, a timeline, statistics, and earthquakes
near a chosen city.

### What it is NOT

- **This is not an early-warning system.** It does not detect earthquakes as
  they happen, does not send alerts, does not predict future earthquakes, and
  must not be used for safety, evacuation, or emergency-response decisions.
  If you feel an earthquake, follow your local official protocols, not this
  page.
- **This is not an official source.** It is not affiliated with the U.S.
  Geological Survey (USGS), with FUNVISIS, or with any government institution
  of Venezuela or the United States.
- **This is not engineering or safety advice.**

### About the data source: USGS vs. FUNVISIS

All seismic data on this dashboard comes from the **U.S. Geological Survey
(USGS)** catalog, a global catalog. The reference network for seismology in
Venezuela is the **Fundacion Venezolana de Investigaciones Sismologicas
(FUNVISIS)**.

USGS and FUNVISIS may report **different magnitude, epicenter, or depth**
values for the same event: they are independent networks with their own
stations, methods, and review timelines. This dashboard shows only the USGS
version and does not average or correct it against other sources. If you need
the official Venezuelan reading of an event, consult FUNVISIS directly.

### About data accuracy

Data is refreshed once a day from the USGS public service and may include
events later revised or corrected by USGS itself. Every event shows its
source, a confidence level, and the date this project last verified it.

**If you find an error, please open an issue.** Corrections backed by a
source are reviewed and applied.

### About the "Patterns" section (statistics of the past catalog)

> PROPOSED text: pending Luis's approval in the PR.

The "Patterns" section of the statistics panel is a **statistical description
of the past catalog** (1990 up to the catalog date). It **does not predict
earthquakes**: it does not estimate when, where or how large any earthquake
will be, and it does not mark zones as more or less dangerous. Its zones are
groupings of epicenters already recorded, and the b value (the ratio of small
to large earthquakes) is computed with its 95 % confidence interval, its
magnitude of completeness, the magnitude type and the number of events. The
figures depend on the method and its parameters (see
`docs/adr/ADR-010-patrones-estadisticos.md`), catalog completeness changed
over 36 years, and a zone may continue beyond the queried area. The year and
magnitude filters do not change these figures.

### Neutrality

This project describes seismic activity with data and sources. **It takes no
political position** on emergency management by any government or
institution.

### Licenses

- **Code:** MIT. See [LICENSE](LICENSE).
- **Data:** see [LICENSE-DATA](LICENSE-DATA) for the regime of the USGS
  catalog and of the base map tiles.

### Contact

Errors, corrections, and suggestions: via issues on the GitHub repository.
