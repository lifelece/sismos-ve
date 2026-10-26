# Contribuir / Contributing

## Español

Se aceptan correcciones de datos con fuente y aportes de codigo pequeños.

### Reportar un dato incorrecto

Abre un issue con la plantilla **Reportar dato incorrecto**
(`.github/ISSUE_TEMPLATE/dato-incorrecto.yml`). Hace falta el id del evento (o
la ciudad) y un enlace a una fuente publica. Reglas de fondo:

- Los sismos vienen del USGS sin modificar. Si difieren del USGS, es un error
  nuestro; si difieren de FUNVISIS, es una diferencia entre fuentes
  (ver [DISCLAIMER.md](DISCLAIMER.md)) y no se "corrige" promediando.
- Neutralidad: hechos con fuente, sin opinion politica.
- No se inventan datos ni se añaden eventos sin fuente verificable.

### Aportar codigo

Necesitas Node 22 o superior.

```bash
npm ci
npm test        # debe quedar en verde
npm run build   # debe quedar en verde
npm run dev
```

Reglas del proyecto (detalle en [CLAUDE.md](CLAUDE.md)): sin dependencias
nuevas sin un ADR en [docs/adr/](docs/adr/); todo texto visible pasa por
`t(clave)` con `es.json` y `en.json`; la web nunca consulta al USGS en tiempo
de ejecucion; sin geolocalizacion del usuario. Un cambio, un pull request, con
su test.

### Seguridad

No subas tokens, claves ni archivos `.env`. Si encuentras una filtracion,
avisa en privado al autor en lugar de abrir un issue publico.

## English

Source-backed data corrections and small code contributions are welcome.

**Report incorrect data:** open an issue with the **Reportar dato incorrecto /
Report incorrect data** template. It needs the event id (or city) and a link to
a public source. Earthquakes come from USGS unmodified: a mismatch with USGS is
our bug; a mismatch with FUNVISIS is a source difference (see
[DISCLAIMER.md](DISCLAIMER.md)). Neutral, sourced facts only; no invented data.

**Code:** Node 22+, `npm ci`, `npm test` and `npm run build` must pass. No new
dependencies without an ADR; every visible string goes through `t(key)` with
both dictionaries; the site never queries USGS at runtime; no user
geolocation. One change per pull request, with its test.

**Security:** never commit tokens, keys or `.env` files. Report leaks privately
to the author.
