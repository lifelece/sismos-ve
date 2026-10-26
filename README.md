# sismos-ve

**Panel web de actividad sismica en Venezuela**, con datos publicos del
Servicio Geologico de Estados Unidos (USGS): mapa, linea de tiempo,
estadisticas y sismos cerca de una ciudad elegida.

[![Licencia codigo: MIT](https://img.shields.io/badge/codigo-MIT-blue.svg)](LICENSE)
[![Datos: USGS](https://img.shields.io/badge/datos-USGS-green.svg)](LICENSE-DATA)

> **No es un sistema de alerta temprana.** Lee [DISCLAIMER.md](DISCLAIMER.md)
> — es corto y va en serio.

**Demo / Live demo:** [URL de la demo — pendiente: la publica Luis al desplegar]

<!-- Capturas / GIF: [captura-mapa.png] [captura-estadisticas.png] — pendientes, las provee Luis desde el telefono real -->

---

## Español

### Que es

Un panel que visualiza sismos de magnitud 3+ ocurridos en Venezuela desde
1990, con datos del catalogo publico del USGS (FDSN Event Web Service),
actualizados una vez al dia mediante una GitHub Action. La web nunca consulta
al USGS en tiempo real: lee un archivo `data/eventos.json` versionado y
estatico.

### Funcionalidades

1. Mapa con circulos por magnitud, color por profundidad (sin teselas de terceros).
2. Deslizador de tiempo y filtro por magnitud; vista por defecto en Venezuela,
   con la costa (50 km) y la zona en disputa de la Guayana Esequiba
   claramente etiquetadas.
3. Histograma de sismos por año (con resumen en texto, tabla equivalente y
   barras navegables con teclado) y top 10 de mayor magnitud.
4. "Cerca de mi ciudad": radio en km desde una de las 24 capitales de
   estado; **nunca pide tu ubicacion**.
5. Ficha del evento con enlace a la pagina oficial del USGS.
6. Interfaz en español e inglés.

### Que NO es

No es alerta temprana ni prediccion, no es una fuente oficial y no esta
afiliado al USGS ni a FUNVISIS. Sus cifras pueden diferir de las de FUNVISIS.
Detalle en [DISCLAIMER.md](DISCLAIMER.md).

### Stack

Vite + JavaScript ES6 (modulos nativos) + Leaflet + Tailwind CSS. Datos:
GeoJSON del USGS, descargados por una GitHub Action diaria. Despliegue
estatico. Ver [docs/adr/](docs/adr/) para las decisiones (p. ej.
[ADR-001](docs/adr/ADR-001-leaflet.md) y [ADR-002](docs/adr/ADR-002-static-first.md)).

### Arrancar en local

Necesitas Node 22 o superior.

```bash
git clone https://github.com/lifelece/sismos-ve.git
cd sismos-ve
npm ci
npm run dev        # servidor de desarrollo
npm test           # pruebas
npm run build      # build de produccion en dist/
npm run dev:host   # para probar en el telefono por la red local
```

### Documentacion

| Archivo | Que contiene |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Reglas del proyecto, stack, mapa de fases |
| [docs/fases/](docs/fases/) | Guion operativo de cada fase |
| [docs/adr/](docs/adr/) | Decisiones de arquitectura (una por archivo) |
| [DISCLAIMER.md](DISCLAIMER.md) | Aviso: no es alerta temprana; USGS vs FUNVISIS |
| [LICENSE-DATA](LICENSE-DATA) | Regimen de cada dato y atribuciones |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Como contribuir y reportar un dato incorrecto |

### Atribuciones

- **Sismos:** U.S. Geological Survey (USGS), dominio publico, FDSN Event Web
  Service — [earthquake.usgs.gov](https://earthquake.usgs.gov/).
- **Frontera nacional:** geoBoundaries gbOpen ADM0 (origen Natural Earth),
  dominio publico. **Limites estatales:** geoBoundaries ADM1 (OCHA Venezuela /
  INE), CC BY 3.0 IGO, geometria simplificada (Runfola et al., 2020, *PLoS ONE*
  15(4): e0231866).
- **Zona en disputa y paises vecinos:** Natural Earth, dominio publico
  ("Made with Natural Earth"). La zona se reproduce con la clasificacion de la
  fuente; el proyecto no toma posicion.
- **Coordenadas de las ciudades:** Wikidata (P625), CC0 1.0.
- **Mapa base:** ninguno de terceros (sin teselas).

Detalle completo en [LICENSE-DATA](LICENSE-DATA).

### Contribuir

Se aceptan correcciones de datos con fuente y aportes pequeños. Lee
[CONTRIBUTING.md](CONTRIBUTING.md) y usa la plantilla *Reportar dato incorrecto*.

### Licencia y citacion

Codigo bajo [MIT](LICENSE). Los datos conservan su licencia de origen
([LICENSE-DATA](LICENSE-DATA)). Para citar este proyecto usa
[CITATION.cff](CITATION.cff).

---

## English

### What it is

A dashboard visualizing magnitude 3+ earthquakes in Venezuela since 1990,
using the USGS public catalog (FDSN Event Web Service), refreshed once a day
via a GitHub Action. The website never queries USGS at runtime: it reads a
versioned, static `data/eventos.json` file.

### Features

1. Map with circles sized by magnitude and colored by depth (no third-party tiles).
2. Time slider and magnitude filter; Venezuela by default, with the 50 km
   coastal strip and the disputed Guayana Esequiba zone clearly labeled.
3. Yearly histogram (with a text summary, an equivalent table and
   keyboard-navigable bars) and a top 10 by magnitude.
4. "Near my city": radius in km from one of 24 state capitals; **it never
   asks for your location**.
5. Event card linking to the official USGS event page.
6. Spanish and English UI.

### What it is not

Not an early-warning or prediction system, not an official source, and not
affiliated with USGS or FUNVISIS. Figures may differ from FUNVISIS. See
[DISCLAIMER.md](DISCLAIMER.md).

### Stack and local setup

Vite + vanilla ES6 JavaScript + Leaflet + Tailwind CSS; static deployment.
Requires Node 22+: `npm ci`, then `npm run dev`, `npm test`, `npm run build`
(see the commands above). Decisions are in [docs/adr/](docs/adr/).

### Attributions

- **Earthquakes:** U.S. Geological Survey (USGS), public domain.
- **National border:** geoBoundaries gbOpen ADM0 (Natural Earth origin), public
  domain. **State boundaries:** geoBoundaries ADM1 (OCHA Venezuela / INE),
  CC BY 3.0 IGO, simplified geometry (Runfola et al., 2020).
- **Disputed zone and neighboring countries:** Natural Earth, public domain.
  The project takes no position on the dispute.
- **City coordinates:** Wikidata (P625), CC0 1.0.
- **Base map:** no third-party tiles.

### Contributing, license and citation

Source-backed data corrections are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md).
Code under [MIT](LICENSE); data keeps its original license
([LICENSE-DATA](LICENSE-DATA)). Cite with [CITATION.cff](CITATION.cff).

---

Built in Venezuela by Luis Carlos Vasquez.
