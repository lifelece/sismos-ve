# Fase 0 — Setup

> **Gate de entrada:** ninguno.
> **Gate de salida:** estructura de gobernanza revisada y aprobada por Luis.

**Tiempo estimado:** una sesion · **Estado:** en curso, pendiente del gate

## Objetivo

Dejar el repo `sismos-ve` con las reglas de trabajo, el mapa de fases y la
gobernanza minima (licencias, aviso legal, ADR de la decision de mapa) **antes
de escribir una sola linea de codigo de la aplicacion**. A diferencia de la
Fase 0 de Orinoco, aqui no se instala Vite ni Leaflet todavia: eso arranca en
la Fase 1, junto con los primeros datos reales.

## Entregables

- [x] `git init -b main` (sin commit — lo hace Luis tras revisar el diff)
- [x] `CLAUDE.md` — reglas del proyecto, stack, estructura prevista, mapa de
      fases, propuesta de contrato de datos
- [x] `docs/fases/README.md` + un guion por fase (`FASE-0-SETUP.md` a
      `FASE-4-PUBLICACION.md`)
- [x] `docs/adr/README.md` (indice + plantilla) y
      `docs/adr/ADR-001-leaflet.md` (estado: Propuesto)
- [x] `LICENSE` (MIT, © 2026 Luis Carlos Vasquez)
- [x] `LICENSE-DATA` (regimen de los datos del USGS y de las teselas del mapa
      base)
- [x] `DISCLAIMER.md` bilingue ES/EN
- [x] `README.md` minimo bilingue ES/EN
- [x] `.gitignore`
- [ ] `package.json` sin dependencias — opcional, ver mas abajo

## Pasos que siguio Claude Code

1. Leer el estandar comun del portafolio y usar `orinoco-digital` como
   plantilla de forma (sin modificarlo).
2. Crear el repo local vacio, sin remoto y sin commit.
3. Escribir `CLAUDE.md` adaptando las 15 reglas comunes mas las reglas
   especificas de este dominio: no es alerta temprana, atribucion USGS
   obligatoria, la web nunca llama al USGS en runtime, sin geolocalizacion del
   usuario, y la propuesta de como el contrato `fuente`/`confianza`/
   `ultima_verificacion` envuelve los campos que el USGS ya trae en cada
   evento.
4. Escribir los cinco guiones de fase. F1 a F4 quedan listos para sesiones
   futuras — **no se ejecutan en esta sesion.** En F1, la consulta FDSN queda
   como plantilla con el bounding box marcado "a verificar por Luis": no se
   cierra ese dato sin que el autor lo confirme contra el sitio del USGS.
5. Escribir `docs/adr/README.md` (indice y plantilla) y
   `docs/adr/ADR-001-leaflet.md`, evaluando Leaflet frente a CesiumJS y
   MapLibre GL JS para un panel 2D, con presupuesto de JS y la cuestion del
   proveedor de teselas (politica de uso de los servidores de OpenStreetMap,
   atribucion y alternativas) dejada como **decision abierta** dentro del
   mismo ADR.
6. Escribir `LICENSE` (MIT) y `LICENSE-DATA`, verificando via WebFetch lo que
   se pudo verificar de la politica de datos del USGS y de teselas de OSM, y
   marcando como pendiente lo que no se pudo verificar en vez de afirmarlo.
7. Escribir `DISCLAIMER.md` bilingue: no es un sistema de alerta temprana;
   USGS puede diferir de FUNVISIS.
8. Escribir `README.md` minimo bilingue.
9. Escribir `.gitignore`. No crear `.env.example`: en Fase 0 no hay ningun
   proveedor de teselas que exija clave (el candidato por defecto, teselas de
   OSM, no la exige; queda como decision abierta en el ADR-001).
10. No instalar dependencias, no crear `src/`, no crear `.github/`: eso
    empieza en la Fase 1. `package.json` es opcional en esta fase y, si se
    crea, va sin dependencias.
11. Detenerse. No pasar a la Fase 1.

## Criterios de salida

- [x] El repo existe en `C:\dev\sismos-ve`, inicializado con `git init -b main`,
      sin ningun commit.
- [x] `CLAUDE.md` cubre reglas, stack, estructura prevista y mapa de fases.
- [x] `docs/fases/` tiene los cinco guiones (F0 a F4).
- [x] `docs/adr/` tiene el indice y `ADR-001-leaflet.md` en estado Propuesto.
- [x] `LICENSE` y `LICENSE-DATA` existen y distinguen codigo (MIT) de datos
      (USGS + teselas).
- [x] `DISCLAIMER.md` y `README.md` existen y son bilingues.
- [x] No existe `src/`, `data/` ni `.github/`: esos se crean en la Fase 1.
- [x] No se instalo ninguna dependencia.
- [x] No se hizo `git commit` ni `git push`.

## STOP GATE

> **Pendiente de aprobacion por Luis.** Claude Code se detiene aqui.

Antes de aprobar, Luis revisa:

1. El arbol de archivos creado (lo reporta Claude Code al cerrar la sesion).
2. Las decisiones tomadas por Claude Code por su cuenta (listadas en el mismo
   reporte): quedan marcadas explicitamente para que Luis las apruebe o las
   corrija, no se asumen como cerradas.
3. Las preguntas abiertas, en particular:
   - El bounding box y el rango de fechas/magnitud exactos de la consulta
     FDSN (Fase 1).
   - La eleccion del proveedor de teselas del mapa base (ADR-001, decision
     abierta).
   - Si la escala `alta`/`media` para `confianza` (derivada de
     `properties.status` del USGS) es la correcta, o si hace falta un tercer
     valor `baja` y de donde saldria.
4. El diff completo (`git status`, `git diff` no aplica aun porque no hay
   commits previos — todo esta sin trackear).

Cuando Luis apruebe, el commit lo hace el mismo Luis (regla 4 del estandar:
nada se commitea sin que el revise el diff primero). El mensaje sugerido y los
comandos de PowerShell quedan en el reporte de cierre de esta sesion.

Al aprobar, la Fase 1 puede arrancar en una sesion nueva leyendo
`FASE-1-DATOS.md`.
