/**
 * etiquetar-eventos.mjs — Vuelve a etiquetar un catalogo ya descargado, SIN red.
 *
 * Uso:  npm run data:etiquetar
 *       node scripts/etiquetar-eventos.mjs [ruta]   (por defecto data/eventos.json)
 *
 * Anade o recalcula `en_venezuela` y `zona_disputada` (ADR-003) con los
 * poligonos de data/, valida el resultado con el validador del CI y solo
 * entonces reescribe el archivo. No toca ningun otro campo: ni
 * `ultima_verificacion` (no se ha vuelto a consultar al USGS) ni los datos del
 * USGS. Sirve para regenerar el catalogo cuando cambian los poligonos sin
 * pedir otra vez 35 años de eventos al servicio FDSN.
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { etiquetarColeccion, resumirEtiquetas, serializar } from "./fetch-eventos.mjs";
import { leerTerritorio } from "./territorio.mjs";
import { RUTA_EVENTOS, validarColeccion } from "./validate-eventos.mjs";

async function main() {
  const ruta = process.argv[2] ? resolve(process.argv[2]) : RUTA_EVENTOS;
  const anterior = JSON.parse(await readFile(ruta, "utf8"));
  const territorio = await leerTerritorio();
  const coleccion = etiquetarColeccion(anterior, territorio);

  const { total, errores } = validarColeccion(coleccion, { territorio });
  if (errores.length > 0) {
    for (const e of errores.slice(0, 50)) console.log(`  ERROR  ${e}`);
    console.log(`${errores.length} errores: NO se escribe ${ruta}.`);
    process.exit(1);
  }
  await writeFile(ruta, serializar(coleccion), "utf8");
  console.log(`${ruta}: ${total} eventos etiquetados. ${resumirEtiquetas(coleccion)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    await main();
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    process.exit(1);
  }
}
