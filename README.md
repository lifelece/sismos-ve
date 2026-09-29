# sismos-ve

**Panel web de actividad sismica en Venezuela**, con datos publicos del
Servicio Geologico de Estados Unidos (USGS): mapa, linea de tiempo,
estadisticas y sismos cerca de una ciudad elegida.

[![Licencia codigo: MIT](https://img.shields.io/badge/codigo-MIT-blue.svg)](LICENSE)
[![Datos: USGS](https://img.shields.io/badge/datos-USGS-green.svg)](LICENSE-DATA)

> **No es un sistema de alerta temprana.** Lee [DISCLAIMER.md](DISCLAIMER.md)
> — es corto y va en serio.

---

## Español

### Que es

Un panel que visualiza sismos de magnitud 3+ ocurridos en Venezuela desde
1990, con datos del catalogo publico del USGS (FDSN Event Web Service),
actualizados una vez al dia mediante una GitHub Action. La web nunca consulta
al USGS en tiempo real: lee un archivo `data/eventos.json` versionado y
estatico.

### Funcionalidades (hoja de ruta)

1. Mapa con circulos por magnitud, color por profundidad.
2. Deslizador de tiempo y filtro por magnitud.
3. Histograma por año y top 10 de mayor magnitud.
4. "Cerca de mi ciudad": radio en km desde una ciudad elegida (sin pedir
   ubicacion al usuario).
5. Ficha del evento con enlace a la pagina oficial del USGS.

### Estado

**Fase 0 — setup.** Repositorio, reglas de trabajo y gobernanza creados.
Pendiente el STOP gate de esta fase. Ver [CLAUDE.md](CLAUDE.md) y
[docs/fases/](docs/fases/) para la hoja de ruta completa.

### Stack

Vite + JavaScript ES6 (modulos nativos) + Leaflet + Tailwind CSS. Datos:
GeoJSON del USGS, descargados por una GitHub Action diaria. i18n ES/EN. Ver
[docs/adr/ADR-001-leaflet.md](docs/adr/ADR-001-leaflet.md) para la eleccion
del motor de mapa.

### Documentacion

| Archivo | Que contiene |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Reglas del proyecto, stack, mapa de fases |
| [docs/fases/](docs/fases/) | Guion operativo de cada fase |
| [docs/adr/](docs/adr/) | Decisiones de arquitectura (una por archivo) |
| [DISCLAIMER.md](DISCLAIMER.md) | Aviso: no es alerta temprana; USGS vs FUNVISIS |
| [LICENSE-DATA](LICENSE-DATA) | Regimen de los datos del USGS y de las teselas del mapa |

### Contribuir

Este proyecto todavia no acepta contribuciones externas: la guia
`CONTRIBUTING.md` y las plantillas de reporte llegan en la Fase 4
(Publicacion).

### Licencia

Codigo bajo [MIT](LICENSE). Los datos siguen el regimen descrito en
[LICENSE-DATA](LICENSE-DATA): el catalogo del USGS es dominio publico, con
atribucion aplicada por decision propia del proyecto.

---

## English

### What it is

A dashboard visualizing magnitude 3+ earthquakes in Venezuela since 1990,
using the USGS public catalog (FDSN Event Web Service), refreshed once a day
via a GitHub Action. The website never queries USGS at runtime: it reads a
versioned, static `data/eventos.json` file.

### Planned features

1. Map with circles sized by magnitude, colored by depth.
2. Time slider and magnitude filter.
3. Yearly histogram and top-10 largest earthquakes.
4. "Near my city": radius in km from a chosen city (never requests the
   user's location).
5. Event detail card linking to the official USGS event page.

### Status

**Phase 0 — setup.** Repository, working rules, and governance files
created. This phase's STOP gate is pending approval. See
[CLAUDE.md](CLAUDE.md) and [docs/fases/](docs/fases/) for the full roadmap.

### Stack

Vite + vanilla ES6 JavaScript + Leaflet + Tailwind CSS. Data: USGS GeoJSON,
fetched by a daily GitHub Action. ES/EN i18n. See
[docs/adr/ADR-001-leaflet.md](docs/adr/ADR-001-leaflet.md) for the map
engine decision.

### Contributing

This project does not accept external contributions yet: `CONTRIBUTING.md`
and the report templates arrive in Phase 4 (Publication).

### License

Code under [MIT](LICENSE). Data follows the regime described in
[LICENSE-DATA](LICENSE-DATA): the USGS catalog is public domain, with
attribution applied as the project's own editorial choice.

---

Built in Venezuela by Luis Carlos Vasquez.
