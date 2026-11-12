/**
 * Gutenberg-Richter por zona (spec 001: RF-10, RF-11, RF-12, RF-25, RF-31).
 * Formulas en docs/adr/ADR-010 y plan 3.3:
 *  - b (MLE, Aki 1965): log10(e) / (M_media - (Mc - dM/2))
 *  - sigma (Shi y Bolt 1982): 2,30 * b^2 * sqrt(sum (Mi - M_media)^2 / (n (n-1)))
 *  - Mc: bin con mas eventos (maxima curvatura; empate: el mas bajo) + correccion
 *  - IC 95 %: bootstrap de percentiles que re-estima Mc en cada remuestra
 * Funciones puras; todo el azar llega por `azar` (de azar.mjs).
 */

import { PARAMETROS_GR } from "./parametros.mjs";

const LOG10_E = Math.log10(Math.E);
const ORDEN_FAMILIAS = ["Mw", "mb", "ML-Md"]; // orden de desempate (spec 3)
const FAMILIA_DE_TIPO = new Map([
  ["mww", "Mw"], ["mwr", "Mw"], ["mwc", "Mw"], ["mwb", "Mw"], ["mw", "Mw"],
  ["mb", "mb"],
  ["ml", "ML-Md"], ["md", "ML-Md"],
]);

/** Familia de magnitud de un magType del USGS; null si no pertenece a ninguna (mb_lg, ms, nulo). */
export function familiaDe(magType) {
  if (typeof magType !== "string") return null;
  return FAMILIA_DE_TIPO.get(magType.toLowerCase()) ?? null;
}

export function redondearMag(m) {
  return Math.round(m * 10 + 1e-9) / 10;
}

const aIndice = (m, dM) => Math.round(m / dM + 1e-9);
const deIndice = (i, dM) => Math.round(i * dM * 1e6) / 1e6;

/** Indice del bin de maxima curvatura (empate: el mas bajo) sobre indices de bin. */
function binMaxCurvatura(indices) {
  const cuenta = new Map();
  for (const i of indices) cuenta.set(i, (cuenta.get(i) ?? 0) + 1);
  let mejor = null;
  let max = -1;
  for (const [i, c] of cuenta) {
    if (c > max || (c === max && i < mejor)) {
      mejor = i;
      max = c;
    }
  }
  return mejor;
}

function indicesDe(mags, dM) {
  return mags.map((m) => aIndice(redondearMag(m), dM));
}

/** Mc = bin de maxima curvatura + correccion; null si no hay magnitudes. */
export function estimarMc(mags, { dM = PARAMETROS_GR.dM, correccion = PARAMETROS_GR.correccionMc } = {}) {
  if (mags.length === 0) return null;
  const pico = binMaxCurvatura(indicesDe(mags, dM));
  return deIndice(pico + Math.round(correccion / dM), dM);
}

/** b, sigma y n con los eventos >= Mc. n < 2 -> b y sigma NaN. */
export function estimarB(mags, mc, dM = PARAMETROS_GR.dM) {
  const iMc = aIndice(mc, dM);
  const sobre = [];
  for (const m of mags) {
    const i = aIndice(redondearMag(m), dM);
    if (i >= iMc) sobre.push(i * dM);
  }
  const n = sobre.length;
  if (n < 2) return { b: NaN, sigma: NaN, n };
  const media = sobre.reduce((a, x) => a + x, 0) / n;
  const b = LOG10_E / (media - (iMc * dM - dM / 2));
  const ss = sobre.reduce((a, x) => a + (x - media) ** 2, 0);
  const sigma = 2.3 * b * b * Math.sqrt(ss / (n * (n - 1)));
  return { b, sigma, n };
}

function percentiles95(valores) {
  const v = Float64Array.from(valores).sort();
  const n = v.length;
  return [v[Math.floor(0.025 * n)], v[Math.ceil(0.975 * n) - 1]];
}

/**
 * IC 95 % por bootstrap de percentiles. `mags` = magnitudes de la familia.
 * Descarta remuestras con < minEventos eventos >= su Mc.
 */
export function bootstrapGR(
  mags,
  { B = PARAMETROS_GR.B, azar, dM = PARAMETROS_GR.dM, correccion = PARAMETROS_GR.correccionMc, minEventos = PARAMETROS_GR.minEventosRemuestra },
) {
  const indices = indicesDe(mags, dM);
  const salto = Math.round(correccion / dM);
  const n = indices.length;
  const bs = [];
  const mcs = [];
  let descartadas = 0;
  const remuestra = new Array(n);
  for (let k = 0; k < B; k++) {
    for (let i = 0; i < n; i++) remuestra[i] = indices[azar.entero(n)];
    const iMc = binMaxCurvatura(remuestra) + salto;
    let cont = 0;
    let suma = 0;
    for (let i = 0; i < n; i++) {
      if (remuestra[i] >= iMc) {
        cont++;
        suma += remuestra[i];
      }
    }
    if (cont < minEventos) {
      descartadas++;
      continue;
    }
    const media = (suma / cont) * dM;
    bs.push(LOG10_E / (media - (iMc * dM - dM / 2)));
    mcs.push(deIndice(iMc, dM));
  }
  const validas = bs.length;
  return {
    bIc95: validas > 0 ? percentiles95(bs) : null,
    mcIc95: validas > 0 ? percentiles95(mcs) : null,
    descartadas,
    fraccionDescartadas: B > 0 ? descartadas / B : 1,
  };
}

/**
 * Familia mayoritaria: la de mas eventos >= su propio Mc (Mc primero por familia).
 * Empate: Mw, mb, ML-Md. null si ningun evento tiene familia.
 */
export function elegirFamilia(eventosZona, parametros = PARAMETROS_GR) {
  const porFamilia = new Map();
  for (const e of eventosZona) {
    const f = familiaDe(e.magType);
    if (!f) continue;
    if (!porFamilia.has(f)) porFamilia.set(f, []);
    porFamilia.get(f).push(e.mag);
  }
  let elegida = null;
  for (const familia of ORDEN_FAMILIAS) {
    const mags = porFamilia.get(familia);
    if (!mags) continue;
    const mc = estimarMc(mags, { dM: parametros.dM, correccion: parametros.correccionMc });
    const { n } = estimarB(mags, mc, parametros.dM);
    if (!elegida || n > elegida.n) elegida = { familia, mc, n };
  }
  return elegida;
}

/** RF-31: motivo si el intervalo es inconsistente; null si es coherente. */
export function validarIntervalo({ b, bIc95, fraccionDescartadas }, parametros = PARAMETROS_GR) {
  if (fraccionDescartadas > parametros.maxDescarte) return "intervalo_inconsistente";
  if (!bIc95 || !bIc95.every(Number.isFinite) || !Number.isFinite(b)) return "intervalo_inconsistente";
  if (b < bIc95[0] || b > bIc95[1]) return "intervalo_inconsistente";
  return null;
}

/**
 * G-R de una zona: familia mayoritaria, N_MIN (RF-11), b, sigma, IC (RF-10) y
 * RF-31. Usa todos los eventos de la familia (RF-25), sin mirar su rol.
 */
export function ajustarGR(eventosZona, parametros = PARAMETROS_GR, azar) {
  const base = { publicado: false, motivo: null, familia: null, mc: null, mcIc95: null, n: 0, b: null, bIc95: null, sigma: null };
  const f = elegirFamilia(eventosZona, parametros);
  if (!f) return { ...base, motivo: "muestra_insuficiente" };
  const mags = eventosZona.filter((e) => familiaDe(e.magType) === f.familia).map((e) => e.mag);
  const parcial = { ...base, familia: f.familia, mc: f.mc, n: f.n };
  if (f.n < parametros.nMin) return { ...parcial, motivo: "muestra_insuficiente" };
  const { b, sigma } = estimarB(mags, f.mc, parametros.dM);
  const ic = bootstrapGR(mags, {
    B: parametros.B,
    azar,
    dM: parametros.dM,
    correccion: parametros.correccionMc,
    minEventos: parametros.minEventosRemuestra,
  });
  const motivo = validarIntervalo({ b, bIc95: ic.bIc95, fraccionDescartadas: ic.fraccionDescartadas }, parametros);
  if (motivo) return { ...parcial, motivo, mcIc95: ic.mcIc95 };
  return { ...parcial, publicado: true, b, sigma, bIc95: ic.bIc95, mcIc95: ic.mcIc95 };
}
