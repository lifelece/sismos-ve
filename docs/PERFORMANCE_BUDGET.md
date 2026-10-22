# Presupuesto de rendimiento

Lo pide ADR-001: medir el build real en vez de fiarse de la cifra de marketing
de Leaflet. Presupuesto del portafolio: **150 KB comprimidos de JS propio**
(regla 8 de `CLAUDE.md`).

## Build de la Fase 2 (2026-10-21, `npm run build`, Vite 7.3.7)

| Pieza | Sin comprimir | gzip | Cuando se descarga |
|---|---|---|---|
| JS propio: `index` (shell, filtros, buscador, chip) | 34,4 KB | 11,7 KB | Primer pintado |
| JS propio: `map` (unico modulo con Leaflet) | 2,5 KB | 1,3 KB | Tras el primer pintado (ADR-007) |
| `precarga` (ayudante de `import()` de Vite) | 1,1 KB | 0,7 KB | Primer pintado |
| **Total JS propio** | **38,0 KB** | **13,6 KB** | **9 % del presupuesto** |
| Leaflet 1.9.4 (chunk propio) | 145,7 KB | 41,6 KB | Tras el primer pintado |
| CSS del shell (Tailwind + tokens) | 18,4 KB | 4,7 KB | Primer pintado |
| CSS de Leaflet | 15,6 KB | 6,5 KB | Con el chunk del mapa |

Leaflet medido: **41,6 KB gzip**, coherente con los "about 42 KB" que declara
su web.

## Datos (no son JS, pero los descarga el visitante)

| Archivo | Sin comprimir | gzip | brotli |
|---|---|---|---|
| `data/eventos.json` (4358 eventos) | 3,5 MB (3,7 MB con las etiquetas) | ~322 KB | ~218 KB (medido antes de las etiquetas) |
| `data/limites-venezuela.geojson` | 237 KB | 65 KB | 39 KB |
| `data/zona-disputada.geojson` | 16 KB | 6 KB | 4 KB |

El catalogo es lo que mas pesa, y crece cada dia. Propuesta (no aplicada,
cambia el formato de lo que se sirve): generar en el build una vista compacta
solo con los campos que usa la interfaz. Ver "Cuando reconsiderar" de ADR-002.

## Medicion previa a 390 px (preview local, sin limitar red ni CPU)

`arsenal/scripts/captura-cdp.mjs` contra `vite preview`: FCP 344 ms, 10
peticiones, todas a `localhost` (ninguna a `usgs.gov` ni a terceros), sin
desplazamiento horizontal (`scrollWidth` = 390). No representa red movil: la
cifra que vale es la del telefono de Luis y, tras publicar, PageSpeed movil.
