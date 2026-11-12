/**
 * Validador de data/patrones.json (spec 001: RF-1, RF-22, RF-33).
 *
 *   node scripts/validate-patrones.mjs [ruta]   (npm run data:validate-patrones)
 *
 * ERRORES (fallan el validador): esquema cerrado (clave de mas o de menos),
 * parametro estimado publicado sin IC 95 %, IC con lo > hi o no finito, b fuera
 * de su IC, zona sin los campos de RF-14, suma de RF-23 que no cuadra.
 * AVISOS (no fallan): huella SHA-256, catalogo_n o ultima_verificacion distintos
 * del catalogo versionado ("patrones desactualizados", RF-33).
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { huellaCatalogo } from "./ml/serializar.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
export const RUTA_PATRONES = join(RAIZ, "data", "patrones.json");
const RUTA_EVENTOS = join(RAIZ, "data", "eventos.json");

const FUENTE_DERIVADA = "Cálculo de sismos-ve sobre USGS FDSN Event Web Service";
const MOTIVOS = ["muestra_insuficiente", "intervalo_inconsistente"];
const FAMILIAS = ["Mw", "mb", "ML-Md"];
const CLASES = ["superficial", "intermedio", "profundo"];

const CLAVES = {
  raiz: ["metadata", "zonas"],
  metadata: [
    "fuente", "ultima_verificacion", "atribucion", "catalogo_n", "catalogo_sha256", "metodo", "parametros",
    "semilla_base", "filtro_confianza", "n_automatic", "excluidos", "control_aleatorio", "resumen",
  ],
  metodo: ["version", "declustering", "agrupacion", "gr"],
  parametros: ["gutenberg_richter", "gardner_knopoff", "sensibilidad", "agrupacion"],
  control: ["semillas_por_clase", "grupos_max"],
  resumen: ["fondo", "secuencia", "no_aplica", "sin_zona"],
  zona: [
    "id", "clase_profundidad", "n_eventos", "n_fondo", "n_secuencia", "n_no_aplica", "n_en_vista_venezuela",
    "centro", "caja", "en_borde", "lugar_usgs_frecuente", "periodo", "territorio", "sensibilidad",
    "gutenberg_richter", "fuente", "confianza", "ultima_verificacion",
  ],
  centro: ["lat", "lon"],
  periodo: ["desde", "hasta"],
  territorio: ["venezuela", "costa", "disputa", "fuera"],
  sensibilidad: ["jaccard_min"],
  gr: ["publicado", "motivo", "familia", "n_sobre_mc", "mc", "mc_ic95", "b", "b_ic95", "b_sigma_shi_bolt"],
};

const esObjeto = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const esNum = (x) => typeof x === "number" && Number.isFinite(x);
const esEntero = (x) => Number.isInteger(x) && x >= 0;

function claves(obj, esperadas, ruta, errores) {
  if (!esObjeto(obj)) {
    errores.push(`${ruta}: debe ser un objeto`);
    return false;
  }
  for (const k of Object.keys(obj)) if (!esperadas.includes(k)) errores.push(`${ruta}: clave fuera del esquema "${k}"`);
  for (const k of esperadas) if (!(k in obj)) errores.push(`${ruta}: falta la clave "${k}"`);
  return true;
}

function intervalo(ic, ruta, errores) {
  if (!Array.isArray(ic) || ic.length !== 2 || !ic.every(esNum)) {
    errores.push(`${ruta}: IC 95 % debe ser [lo, hi] finitos`);
    return false;
  }
  if (ic[0] > ic[1]) {
    errores.push(`${ruta}: IC con limite inferior mayor que el superior (${ic[0]} > ${ic[1]})`);
    return false;
  }
  return true;
}

function validarZona(z, i, errores) {
  const r = `zonas[${i}]${esObjeto(z) && z.id ? ` (${z.id})` : ""}`;
  if (!claves(z, CLAVES.zona, r, errores)) return;
  claves(z.centro, CLAVES.centro, `${r}.centro`, errores);
  claves(z.periodo, CLAVES.periodo, `${r}.periodo`, errores);
  claves(z.territorio, CLAVES.territorio, `${r}.territorio`, errores);
  claves(z.sensibilidad, CLAVES.sensibilidad, `${r}.sensibilidad`, errores);
  if (!CLASES.includes(z.clase_profundidad)) errores.push(`${r}: clase_profundidad invalida`);
  // RF-14: campos de procedencia
  if (z.fuente !== FUENTE_DERIVADA) errores.push(`${r}: falta fuente (RF-14)`);
  if (z.confianza !== "media") errores.push(`${r}: falta confianza "media" (RF-14)`);
  if (typeof z.ultima_verificacion !== "string" || !z.ultima_verificacion) errores.push(`${r}: falta ultima_verificacion (RF-14)`);
  // RF-23
  for (const k of ["n_eventos", "n_fondo", "n_secuencia", "n_no_aplica", "n_en_vista_venezuela"]) {
    if (!esEntero(z[k])) errores.push(`${r}.${k}: entero >= 0 requerido`);
  }
  if (z.n_fondo + z.n_secuencia + z.n_no_aplica !== z.n_eventos) {
    errores.push(`${r}: n_fondo + n_secuencia + n_no_aplica (${z.n_fondo + z.n_secuencia + z.n_no_aplica}) != n_eventos (${z.n_eventos}) (RF-23)`);
  }
  if (esObjeto(z.territorio)) {
    const suma = CLAVES.territorio.reduce((s, k) => s + (z.territorio[k] ?? 0), 0);
    if (suma !== z.n_eventos) errores.push(`${r}: la suma de territorio (${suma}) != n_eventos (${z.n_eventos})`);
  }
  if (typeof z.en_borde !== "boolean") errores.push(`${r}.en_borde: booleano requerido`);
  // Gutenberg-Richter (RF-10, RF-22)
  const g = z.gutenberg_richter;
  const rg = `${r}.gutenberg_richter`;
  if (!claves(g, CLAVES.gr, rg, errores)) return;
  if (typeof g.publicado !== "boolean") {
    errores.push(`${rg}.publicado: booleano requerido`);
    return;
  }
  if (g.familia !== null && !FAMILIAS.includes(g.familia)) errores.push(`${rg}.familia invalida`);
  if (!esEntero(g.n_sobre_mc)) errores.push(`${rg}.n_sobre_mc: entero >= 0 requerido`);
  if (g.mc !== null) {
    if (!esNum(g.mc)) errores.push(`${rg}.mc: debe ser finito`);
    if (g.mc_ic95 === null) errores.push(`${rg}: Mc publicado sin IC 95 % (RF-10)`);
  }
  if (g.mc_ic95 !== null) intervalo(g.mc_ic95, `${rg}.mc_ic95`, errores);
  if (g.publicado) {
    if (g.motivo !== null) errores.push(`${rg}: publicado con motivo`);
    if (!esNum(g.b)) errores.push(`${rg}.b: publicado debe ser finito`);
    if (g.b_ic95 === null) errores.push(`${rg}: b publicado sin IC 95 % (RF-10, RF-22)`);
    else if (intervalo(g.b_ic95, `${rg}.b_ic95`, errores) && esNum(g.b) && (g.b < g.b_ic95[0] || g.b > g.b_ic95[1])) {
      errores.push(`${rg}: b (${g.b}) fuera de su IC 95 % [${g.b_ic95}] (RF-22)`);
    }
    if (g.mc === null) errores.push(`${rg}: b publicado sin Mc`);
    if (g.familia === null) errores.push(`${rg}: b publicado sin familia`);
    if (!esNum(g.b_sigma_shi_bolt)) errores.push(`${rg}.b_sigma_shi_bolt: finito requerido`);
  } else {
    if (!MOTIVOS.includes(g.motivo)) errores.push(`${rg}: motivo invalido "${g.motivo}"`);
    for (const k of ["b", "b_ic95", "b_sigma_shi_bolt"]) if (g[k] !== null) errores.push(`${rg}: ${k} debe ser null sin publicar`);
  }
}

/** @returns {{ errores: string[], avisos: string[] }} */
export function validarPatrones(patrones, coleccion = null) {
  const errores = [];
  const avisos = [];
  if (!claves(patrones, CLAVES.raiz, "raiz", errores)) return { errores, avisos };
  const m = patrones.metadata;
  if (claves(m, CLAVES.metadata, "metadata", errores)) {
    claves(m.metodo, CLAVES.metodo, "metadata.metodo", errores);
    claves(m.parametros, CLAVES.parametros, "metadata.parametros", errores);
    claves(m.control_aleatorio, CLAVES.control, "metadata.control_aleatorio", errores);
    claves(m.resumen, CLAVES.resumen, "metadata.resumen", errores);
    if (m.filtro_confianza !== "ninguno") errores.push('metadata.filtro_confianza: debe ser "ninguno"');
    if (esObjeto(m.control_aleatorio) && m.control_aleatorio.grupos_max !== 0) {
      errores.push("metadata.control_aleatorio.grupos_max debe ser 0 (RF-9)");
    }
  }
  if (!Array.isArray(patrones.zonas)) errores.push("zonas: debe ser una lista");
  else patrones.zonas.forEach((z, i) => validarZona(z, i, errores));

  // RF-33: avisos contra el catalogo versionado
  if (coleccion && esObjeto(m)) {
    if (m.catalogo_n !== coleccion.features.length) {
      avisos.push(`patrones desactualizados: catalogo_n ${m.catalogo_n} != ${coleccion.features.length}`);
    }
    const ver = coleccion.metadata?.ultima_verificacion;
    if (m.ultima_verificacion !== ver) {
      avisos.push(`patrones desactualizados: ultima_verificacion ${m.ultima_verificacion} != ${ver}`);
    }
    const huella = huellaCatalogo(coleccion);
    if (m.catalogo_sha256 !== huella) {
      avisos.push(`patrones desactualizados: catalogo_sha256 ${String(m.catalogo_sha256).slice(0, 12)}... != ${huella.slice(0, 12)}...`);
    }
  }
  return { errores, avisos };
}

function main() {
  const ruta = process.argv[2] ? resolve(process.argv[2]) : RUTA_PATRONES;
  console.log(`Validando ${ruta}`);
  let patrones;
  let coleccion = null;
  try {
    patrones = JSON.parse(readFileSync(ruta, "utf8"));
  } catch (e) {
    console.log(`  ERROR  no se pudo leer o parsear: ${e.message}`);
    process.exit(1);
  }
  try {
    coleccion = JSON.parse(readFileSync(RUTA_EVENTOS, "utf8"));
  } catch (e) {
    console.log(`  AVISO  sin catalogo para comparar: ${e.message}`);
  }
  const { errores, avisos } = validarPatrones(patrones, coleccion);
  for (const a of avisos) console.log(`  AVISO  ${a}`);
  for (const e of errores) console.log(`  ERROR  ${e}`);
  console.log(`${patrones.zonas?.length ?? 0} zonas, ${errores.length} errores, ${avisos.length} avisos.`);
  if (errores.length > 0) {
    console.log("Hay errores. Estos patrones NO deben publicarse.");
    process.exit(1);
  }
  console.log("Validacion superada.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
