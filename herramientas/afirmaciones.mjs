// Funciones puras y de archivo del importador de Fact or Fake (spec 4.9 a 4.13) [D-123, D-131].
// Las funciones puras no tocan el disco; solo leerAfirmacionesMensuales y escribirAfirmacionesMensuales lo hacen.
// No hay banco ni fuentes [D-131]. datos.txt y datos.original.txt nunca se abren [D-139].

import fs from 'node:fs';
import path from 'node:path';
import {
  AFIRMACION_MAX_BYTES, DETALLES_MAX, MES_PATRON, IDIOMAS, validarAfirmaciones,
  mesDeNumero, fechaDelDia, diasEntre, temaValido
} from '../js/diario.js';
import { analizarCarpeta, contienePalabraProhibida, analizarTemaEs, ARCHIVO_TEMA_ES } from './temas.mjs';

export const CAMPOS_AFIRMACION = ['answer', 'claim', 'truth', 'details'];
export const AFIRMACION_MAX = 140;
export const ACLARACION_MAX = 160;
export const DETALLE_MAX = 80;
// [4.21, D-159] Un archivo por idioma, los dos obligatorios. facts.txt ya no se usa.
export const ARCHIVOS_AFIRMACIONES = Object.freeze({ en: 'facts.en.txt', es: 'facts.es.txt' });
export const ARCHIVO_ANTIGUO = 'facts.txt';
export const NOMBRE_IDIOMA = Object.freeze({ en: 'inglés', es: 'español' });
export const UMBRAL_LONGITUD = 0.2;
export const ARCHIVO_MES = /^(\d{4}-(?:0[1-9]|1[0-2]))\.json$/;

// Lista de comprobación de 4.13 [D-136, D-137].
export const LISTA_REVISION = [
  'Ninguna afirmación falsa daña la reputación de la persona o marca de la que habla: con personas y marcas famosas solo altera una cifra o un récord (una estatura, unas ventas, una marca deportiva), sin atribuirles hechos, dichos ni conductas.',
  'Ninguna afirmación falsa trata de salud, medicina, nutrición, fármacos ni remedios.',
  'Ninguna afirmación falsa trata de seguridad (electricidad, química, conducción, primeros auxilios, animales peligrosos…) ni podría causar daño si alguien se la creyera.',
  'Ninguna afirmación falsa trata de tragedias (muertes, catástrofes, crímenes, accidentes, guerras).',
  'Ninguna afirmación falsa trata de política, elecciones, gobiernos, partidos ni conflictos.',
  'Cada `truth` es correcta, se entiende sola y corrige (o confirma) la afirmación sin ambigüedad, sin referirse a fuentes.',
  'Ninguna afirmación verdadera es engañosa por omisión; si hace falta, su `truth` la matiza.',
  'Verdaderas y falsas tienen el mismo estilo (tono, cifras, unidades, longitud). Ojo: si solo las verdaderas tratan de los temas de los puntos 2 a 5, el tema delata la respuesta. Este punto solo advierte: la norma no prohíbe verdaderas sobre esos temas.',
  'La versión en español dice lo mismo que la inglesa (misma respuesta, mismas cifras con unidades equivalentes, mismo matiz en la `truth` y los detalles) y cumple igual la norma.'
];

const RE_CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
const RE_URL = /(?:https?:\/\/|www\.)/i;
const bytes = (t) => new TextEncoder().encode(t).length;
const puntos = (t) => Array.from(t).length;

// Abreviaturas inglesas cuyo punto no cierra frase (sin el punto final, en minúsculas).
const ABREVIATURAS = new Set([
  'sgt', 'dr', 'mr', 'mrs', 'ms', 'st', 'jr', 'sr', 'vs', 'etc', 'u.s', 'u.k', 'e.g', 'i.e', 'a.m', 'p.m',
  // Abreviaturas españolas habituales: EE. UU., a. C., D. C., Sr., Sra., Dra.
  'ee', 'uu', 'a.c', 'd.c', 'sra', 'dra', 'art', 'aprox'
]);

// Cuenta finales de frase: [.!?] seguido de espacio o del final, salvo el punto de una
// abreviatura habitual (no cuenta si le sigue más texto). Los decimales (3.5) no llevan espacio tras el punto.
export function contarFrases(texto) {
  // «a. C.» y «D. C.» se juntan para tratarlas como una sola abreviatura.
  const t = String(texto ?? '').replace(/\b([aAdD])\. ([cC])\./g, '$1.$2.');
  let n = 0;
  for (const m of t.matchAll(/[.!?](?=\s|$)/g)) {
    const fin = m.index + 1;
    if (t[m.index] === '.' && fin < t.length) {
      const palabra = t.slice(0, m.index).split(/\s/).pop().replace(/^[("'“‘]+/, '').toLowerCase();
      if (ABREVIATURAS.has(palabra)) continue;
    }
    n++;
  }
  return n;
}

// [4.21] Los archivos de afirmaciones de la raíz de una carpeta. `carpeta` solo sirve para los mensajes.
// datos.txt, datos.original.txt, tema.es.txt y cualquier otro archivo se ignoran sin aviso.
export function archivosDelDia(archivos, carpeta = '') {
  const lista = Array.isArray(archivos) ? archivos : [];
  const errores = [];
  const avisos = [];
  const en = lista.includes(ARCHIVOS_AFIRMACIONES.en) ? ARCHIVOS_AFIRMACIONES.en : null;
  const es = lista.includes(ARCHIVOS_AFIRMACIONES.es) ? ARCHIVOS_AFIRMACIONES.es : null;
  const donde = carpeta ? `${carpeta} ` : 'La carpeta ';
  if (en && !es) errores.push(`${donde}tiene ${en} pero falta ${ARCHIVOS_AFIRMACIONES.es}.`);
  if (es && !en) errores.push(`${donde}tiene ${es} pero falta ${ARCHIVOS_AFIRMACIONES.en}.`);
  if (lista.includes(ARCHIVO_ANTIGUO)) {
    avisos.push(
      `${carpeta ? `${carpeta}/` : ''}${ARCHIVO_ANTIGUO} ya no se usa: el inglés va en ${ARCHIVOS_AFIRMACIONES.en} y el español en ${ARCHIVOS_AFIRMACIONES.es}.`
    );
  }
  return { en, es, errores, avisos };
}

export function normalizarParaDuplicados(texto) {
  return String(texto ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\s.,;:!?¡¿"'“”‘’…]+$/u, '')
    .trim();
}

// ---------- facts.txt (4.9) ----------

export function analizarAfirmaciones(texto, ruta, { maxBytes = AFIRMACION_MAX_BYTES } = {}) {
  const errores = [];
  const avisos = [];
  const afirmaciones = [];
  try {
    let t = typeof texto === 'string' ? texto : String(texto ?? '');
    if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
    t = t.replace(/\r\n?/g, '\n').normalize('NFC');

    const bloques = [];
    let actual = [];
    for (const linea of t.split('\n')) {
      if (linea.trim() === '---') {
        bloques.push(actual);
        actual = [];
      } else {
        actual.push(linea);
      }
    }
    bloques.push(actual);
    const llenos = bloques.map((b) => b.filter((l) => l.trim() !== '')).filter((b) => b.length > 0);

    let nFalsas = 0;
    let respuestasOk = true;
    llenos.forEach((lineas, i) => {
      const donde = `${ruta}, bloque ${i + 1}`;
      const err = [];
      const campos = new Map();
      const detalles = [];
      for (const linea of lineas) {
        const k = linea.indexOf(':');
        if (k < 0) {
          err.push(`${donde}: una línea no tiene la forma campo: valor.`);
          continue;
        }
        const campo = linea.slice(0, k).trim();
        const valor = linea.slice(k + 1).trim().replace(/[ \t]+/g, ' ');
        if (!CAMPOS_AFIRMACION.includes(campo)) {
          err.push(`${donde}: campo no previsto "${campo.slice(0, 30)}".`);
          continue;
        }
        if (campo === 'details') {
          detalles.push(valor);
          continue;
        }
        if (campos.has(campo)) {
          err.push(`${donde}: el campo ${campo} está repetido.`);
          continue;
        }
        campos.set(campo, valor);
      }
      for (const obligatorio of ['answer', 'claim', 'truth']) {
        if (!campos.has(obligatorio)) err.push(`${donde}: falta el campo ${obligatorio}.`);
      }
      if (detalles.length > DETALLES_MAX) err.push(`${donde}: tiene ${detalles.length} details y el máximo es ${DETALLES_MAX}.`);

      const respuesta = campos.get('answer');
      let tipo = null;
      if (respuesta !== undefined) {
        if (respuesta === 'fact') tipo = 'autentica';
        else if (respuesta === 'fake') tipo = 'generada';
        else err.push(`${donde}: answer debe ser fact o fake.`);
      }
      if (tipo === null) respuestasOk = false;
      if (tipo === 'generada') nFalsas++;

      const afirmacion = campos.get('claim') ?? '';
      const aclaracion = campos.get('truth') ?? '';
      const partes = [['claim', afirmacion, AFIRMACION_MAX, campos.has('claim')], ['truth', aclaracion, ACLARACION_MAX, campos.has('truth')]];
      detalles.forEach((d, j) => partes.push([`details ${j + 1}`, d, DETALLE_MAX, true]));
      for (const [nombre, valor, max, presente] of partes) {
        if (!presente) continue;
        if (valor === '') err.push(`${donde}: ${nombre} está vacío.`);
        if (RE_CONTROL.test(valor)) err.push(`${donde}: ${nombre} tiene caracteres de control.`);
        if (/[{}]/.test(valor)) err.push(`${donde}: ${nombre} no puede contener { ni }.`);
        if (RE_URL.test(valor)) err.push(`${donde}: ${nombre} no puede contener enlaces.`);
        if (puntos(valor) > max) err.push(`${donde}: ${nombre} mide ${puntos(valor)} caracteres y el máximo es ${max}.`);
      }
      if (afirmacion !== '' && bytes(afirmacion) > maxBytes) {
        err.push(`${donde}: claim pasa de ${maxBytes} bytes.`);
      }
      const unida = [aclaracion, ...detalles].join('\n');
      if (aclaracion !== '' && bytes(unida) > maxBytes) {
        err.push(`${donde}: truth y details juntos pasan de ${maxBytes} bytes.`);
      }

      const frases = contarFrases;
      if (frases(afirmacion) > 1) avisos.push(`AVISO: ${donde}: la afirmación tiene más de una frase.`);
      if (frases(aclaracion) > 1) avisos.push(`AVISO: ${donde}: la aclaración tiene más de una frase.`);
      if (afirmacion !== '' && !/[.!?]["')”’]?$/.test(afirmacion)) avisos.push(`AVISO: ${donde}: la afirmación no acaba en punto.`);

      if (err.length === 0) afirmaciones.push({ tipo, afirmacion, aclaracion, detalles });
      errores.push(...err);
    });

    if (llenos.length !== 5) {
      errores.push(`${ruta}: tiene ${llenos.length} afirmaciones y cada día necesita exactamente 5.`);
    } else if (respuestasOk && (nFalsas === 0 || nFalsas === 5)) {
      errores.push(`${ruta}: tiene ${nFalsas} afirmaciones falsas; cada día necesita entre 1 y 4.`);
    }
  } catch (e) {
    errores.push(`${ruta}: no se pudo analizar (${e.message}).`);
  }
  return { afirmaciones, errores, avisos };
}

// ---------- Emparejamiento de idiomas (4.19, 4.21) ----------

// en, es: resultados de analizarAfirmaciones. El bloque k del español es la traducción del bloque k del inglés.
// Si alguno de los dos tiene errores no se empareja (ya se informó de ellos). Nunca lanza.
export function emparejarIdiomas(en, es, carpeta = '') {
  const errores = [];
  const avisos = [];
  const pares = [];
  try {
    if ((en?.errores?.length ?? 0) > 0 || (es?.errores?.length ?? 0) > 0) return { pares, errores, avisos };
    const a = en?.afirmaciones ?? [];
    const b = es?.afirmaciones ?? [];
    if (a.length !== b.length) {
      errores.push(
        `${carpeta}: ${ARCHIVOS_AFIRMACIONES.en} tiene ${a.length} bloques y ${ARCHIVOS_AFIRMACIONES.es} tiene ${b.length}; deben ser los mismos.`
      );
      return { pares, errores, avisos };
    }
    a.forEach((x, k) => {
      const y = b[k];
      if (x.tipo !== y.tipo) {
        const nombre = (t) => (t === 'generada' ? 'fake' : 'fact');
        errores.push(
          `El bloque ${k + 1} de ${carpeta} es ${nombre(x.tipo)} en ${ARCHIVOS_AFIRMACIONES.en} y ${nombre(y.tipo)} en ${ARCHIVOS_AFIRMACIONES.es}.`
        );
        return;
      }
      if (x.detalles.length !== y.detalles.length) {
        avisos.push(
          `AVISO: el bloque ${k + 1} de ${carpeta} tiene ${x.detalles.length} details en inglés y ${y.detalles.length} en español.`
        );
      }
      pares.push({
        tipo: x.tipo,
        en: { afirmacion: x.afirmacion, aclaracion: x.aclaracion, detalles: x.detalles },
        es: { afirmacion: y.afirmacion, aclaracion: y.aclaracion, detalles: y.detalles }
      });
    });
  } catch (e) {
    errores.push(`${carpeta}: no se pudieron emparejar los idiomas (${e.message}).`);
  }
  return errores.length > 0 ? { pares: [], errores, avisos } : { pares, errores, avisos };
}

// ---------- Planificación (4.10 paso 4, 4.11) ----------

// carpetas: [{nombre, archivos: string[], temaEs?: string|null}] (archivos de la raíz; las subcarpetas no se miran;
// temaEs es el contenido leído de tema.es.txt). temasImagenes: Map n -> {en, es} del calendario v5.
export function planificarAfirmaciones({ carpetas, ultimoDia = 0, hoyISO, lanzamiento = null, reimportar = false, temasImagenes = null }) {
  const errores = [];
  const avisos = [];
  const nuevos = [];
  const omitidos = [];
  const pendientes = [];
  const ultimo = reimportar ? 0 : ultimoDia;

  const analizadas = [];
  for (const c of carpetas ?? []) {
    try {
      analizadas.push({ ...analizarCarpeta(c.nombre), c });
    } catch (e) {
      // La plantilla 00-example (número 00) se ignora sin error ni aviso.
      if (/^0+-/.test(String(c.nombre).normalize('NFC'))) continue;
      errores.push(e.message);
    }
  }
  analizadas.sort((a, b) => a.n - b.n);

  for (let i = 1; i < analizadas.length; i++) {
    const a = analizadas[i];
    const previa = analizadas[i - 1];
    if (a.n === previa.n) {
      errores.push(`Hay dos carpetas con el número ${String(a.n).padStart(2, '0')}: ${previa.c.nombre} y ${a.c.nombre}.`);
    } else if (a.n !== previa.n + 1) {
      errores.push(`La numeración no es consecutiva: tras ${previa.c.nombre} falta el día ${String(previa.n + 1).padStart(2, '0')} antes de ${a.c.nombre}.`);
    }
  }

  const hijos = analizadas.filter((a) => a.n > ultimo);
  for (const a of analizadas) if (a.n <= ultimo) omitidos.push(a.n);
  if (hijos.length > 0 && hijos[0].n !== ultimo + 1) {
    errores.push(`La primera carpeta nueva (${hijos[0].c.nombre}) debe ser la del día ${String(ultimo + 1).padStart(2, '0')}, el siguiente al último publicado.`);
  }

  // Las carpetas sin archivo solo pueden ser las últimas.
  // Con los dos archivos: tiene afirmaciones. Con ninguno: pendiente (o hueco). Con solo uno: error.
  const conArchivo = hijos.map((a) => {
    const r = archivosDelDia(a.c.archivos, a.c.nombre);
    errores.push(...r.errores);
    avisos.push(...r.avisos);
    return r.en && r.es ? { en: r.en, es: r.es } : null;
  });
  let primeraSin = conArchivo.findIndex((x) => x === null);
  if (primeraSin < 0) primeraSin = hijos.length;
  for (let i = primeraSin; i < hijos.length; i++) {
    if (conArchivo[i] !== null) {
      errores.push(`${hijos[primeraSin].c.nombre} no tiene facts.en.txt ni facts.es.txt y le sigue ${hijos[i].c.nombre}, que sí: no puede haber huecos.`);
      break;
    }
  }
  for (let i = primeraSin; i < hijos.length; i++) pendientes.push(hijos[i].n);
  if (pendientes.length > 0) {
    const resto = pendientes.length > 1 ? ' y siguientes' : '';
    avisos.push(`AVISO: ${hijos[primeraSin].c.nombre}${resto} no tienen facts.en.txt ni facts.es.txt: Fact or Fake se queda en el día ${hijos[primeraSin].n - 1}.`);
  }

  hijos.forEach((a, i) => {
    const archivos = conArchivo[i];
    if (archivos === null) return;
    const { c, n, tema } = a;
    const nom = c.nombre;
    if (!temaValido(tema)) {
      errores.push(`El tema de ${nom} ("${tema}") no es válido: debe tener entre 1 y 30 caracteres.`);
    }
    const prohibida = contienePalabraProhibida(tema);
    if (prohibida) {
      errores.push(`El tema de ${nom} ("${tema}") contiene la palabra prohibida "${prohibida}". Cambia el nombre de la carpeta.`);
    }
    // tema.es.txt es obligatorio (4.19) y debe coincidir con el publicado para ese n.
    let temaEs = null;
    if (!(a.c.archivos ?? []).includes(ARCHIVO_TEMA_ES)) {
      errores.push(`${nom}: falta ${ARCHIVO_TEMA_ES}.`);
    } else {
      const r = analizarTemaEs(a.c.temaEs ?? null, temaValido);
      if (r.error) errores.push(`${nom}/${ARCHIVO_TEMA_ES}: ${r.error}.`);
      else temaEs = r.tema;
    }
    const temaImagenes = temasImagenes && typeof temasImagenes.get === 'function' ? temasImagenes.get(n) : undefined;
    if (temaImagenes !== undefined) {
      const en = typeof temaImagenes === 'string' ? temaImagenes : temaImagenes?.en;
      if (en !== undefined && en !== tema) errores.push(`El tema de ${nom} no coincide con el del día ${n} de Images.`);
      const es = typeof temaImagenes === 'string' ? undefined : temaImagenes?.es;
      if (temaEs !== null && es !== undefined && es !== temaEs) {
        errores.push(`El tema en español de ${nom} no coincide con el del día ${n} de Images.`);
      }
    }
    let fecha = null;
    if (lanzamiento !== null && lanzamiento !== undefined) {
      fecha = fechaDelDia(lanzamiento, n);
      if (fecha !== null && diasEntre(hoyISO, fecha) < 1) {
        errores.push(`El día ${String(n).padStart(2, '0')} (${fecha}) ya ha llegado o ha pasado; no se pueden añadir días de hoy ni del pasado.`);
      }
    }
    nuevos.push({ n, fecha, tema, temaEs, carpeta: nom, archivos, mes: mesDeNumero(lanzamiento, n) });
  });

  return { nuevos, omitidos, pendientes, errores, avisos };
}

// ---------- Longitudes (4.11) ----------

const media = (xs) => (xs.length === 0 ? null : xs.reduce((s, x) => s + x, 0) / xs.length);

export function medias(afirmaciones) {
  const de = (tipo) => media(afirmaciones.filter((x) => x.tipo === tipo).map((x) => puntos(x.afirmacion)));
  return { autentica: de('autentica'), generada: de('generada') };
}

function avisoDe(donde, m) {
  const { autentica: a, generada: g } = m;
  if (a === null || g === null) return null;
  const mayor = Math.max(a, g);
  const menor = Math.min(a, g);
  if (menor <= 0 || (mayor - menor) / menor <= UMBRAL_LONGITUD) return null;
  const pct = Math.round(((mayor - menor) / menor) * 100);
  const [quien, otro] = g > a ? ['falsas', 'verdaderas'] : ['verdaderas', 'falsas'];
  return `AVISO: ${donde}${donde.startsWith('en todo') ? ',' : ':'} las afirmaciones ${quien} miden de media un ${pct} % más que las ${otro} (${Math.round(mayor)} frente a ${Math.round(menor)} caracteres).`;
}

// Devuelve solo avisos, nunca errores [D-140]. dias: [{n, afirmaciones}] donde afirmaciones es una lista (un solo idioma,
// sin etiqueta) o un objeto {en, es}: entonces el cálculo se hace por idioma y los mensajes dicen "(inglés)" o "(español)" [4.21].
export function avisosLongitud(dias) {
  const avisos = [];
  const etiquetados = dias.some((d) => !Array.isArray(d.afirmaciones));
  const idiomas = etiquetados ? IDIOMAS : [null];
  for (const idioma of idiomas) {
    const sufijo = idioma ? ` (${NOMBRE_IDIOMA[idioma]})` : '';
    const de = (d) => (idioma ? d.afirmaciones?.[idioma] ?? [] : d.afirmaciones);
    for (const d of dias) {
      const a = avisoDe(`día ${d.n}${sufijo}`, medias(de(d)));
      if (a) avisos.push(a);
    }
    const g = avisoDe(`en todo Fact or Fake${sufijo}`, medias(dias.flatMap(de)));
    if (g) avisos.push(g);
  }
  return avisos;
}

// ---------- Argumentos (4.10) ----------

export function analizarArgumentosAfirmaciones(argv) {
  const r = { simular: false, reimportar: false, confirmar: false, revisado: false, errores: [] };
  for (const a of argv) {
    if (a === '--simular') r.simular = true;
    else if (a === '--reimportar') r.reimportar = true;
    else if (a === '--confirmar') r.confirmar = true;
    else if (a === '--revisado') r.revisado = true;
    else r.errores.push(`Argumento desconocido: ${a}.`);
  }
  return r;
}

// ---------- Archivos mensuales [D-116, D-124] ----------

export function unirMeses(archivos, { lanzamiento = null, comprobarMes = true } = {}) {
  const errores = [];
  const porN = new Map();
  try {
    for (const { nombre, contenido } of archivos ?? []) {
      const ruta = `data/facts/${nombre}`;
      const m = ARCHIVO_MES.exec(nombre);
      if (!m) {
        errores.push(`${ruta}: el nombre debe ser AAAA-MM.json.`);
        continue;
      }
      const mes = m[1];
      if (contenido === null || contenido === undefined) {
        errores.push(`${ruta}: no es JSON válido.`);
        continue;
      }
      if (contenido?.version === 1) {
        errores.push(
          `${ruta} es de la versión 1 (solo inglés): rehazlo con npm run afirmaciones -- --reimportar --confirmar --revisado.`
        );
        continue;
      }
      if (!validarAfirmaciones(contenido, mes)) {
        errores.push(`${ruta}: no tiene la estructura de la versión 2 o su mes no coincide con el nombre.`);
        continue;
      }
      for (const dia of contenido.dias) {
        const previo = porN.get(dia.n);
        if (previo) {
          if (!comprobarMes && JSON.stringify(previo.dia) === JSON.stringify(dia)) continue;
          errores.push(`El día ${dia.n} de Fact or Fake está repetido en ${previo.nombre} y ${nombre}.`);
          continue;
        }
        porN.set(dia.n, { dia, nombre, mes });
        if (comprobarMes) {
          const esperado = mesDeNumero(lanzamiento, dia.n);
          if (esperado !== mes) {
            errores.push(`El día ${dia.n} de Fact or Fake está en ${nombre} y le corresponde ${esperado}.`);
          }
        }
      }
    }
    const ns = [...porN.keys()].sort((a, b) => a - b);
    for (let i = 0; i < ns.length; i++) {
      const esperado = i + 1;
      if (ns[i] !== esperado) {
        errores.push(
          i === 0
            ? `Los días de Fact or Fake deben empezar en 1 y el primero es el ${ns[0]}.`
            : `Faltan días de Fact or Fake: tras el día ${ns[i - 1]} viene el ${ns[i]}.`
        );
        break;
      }
    }
    if (errores.length === 0) return { dias: ns.map((n) => porN.get(n).dia), errores };
  } catch (e) {
    errores.push(`data/facts/: no se pudo unir (${e.message}).`);
  }
  return { dias: [], errores };
}

export function repartirPorMes(dias, lanzamiento = null) {
  const grupos = new Map();
  for (const dia of dias) {
    const mes = mesDeNumero(lanzamiento, dia.n);
    if (mes === null) throw new RangeError(`No se puede calcular el mes del día ${dia.n}.`);
    if (!grupos.has(mes)) grupos.set(mes, []);
    grupos.get(mes).push(dia);
  }
  return [...grupos.keys()].sort().map((mes) => ({ version: 2, mes, dias: grupos.get(mes) }));
}

export function leerAfirmacionesMensuales(dir) {
  if (!fs.existsSync(dir)) return [];
  const entradas = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return entradas.map((e) => {
    let contenido = null;
    if (e.isFile() && /\.json$/i.test(e.name)) {
      try {
        contenido = JSON.parse(fs.readFileSync(path.join(dir, e.name), 'utf8'));
      } catch {
        contenido = null;
      }
    }
    return { nombre: e.name, contenido };
  });
}

export function escribirAfirmacionesMensuales(dir, archivos, { borrarSobrantes = false } = {}) {
  for (const a of archivos) {
    if (typeof a?.mes !== 'string' || !MES_PATRON.test(a.mes)) throw new RangeError('Archivo mensual sin un mes válido.');
  }
  fs.mkdirSync(dir, { recursive: true });
  const escritos = [];
  const sinCambios = [];
  const borrados = [];
  for (const a of archivos) {
    const nombre = `${a.mes}.json`;
    const ruta = path.join(dir, nombre);
    const texto = JSON.stringify(a, null, 2) + '\n';
    if (fs.existsSync(ruta) && fs.readFileSync(ruta, 'utf8') === texto) {
      sinCambios.push(nombre);
    } else {
      fs.writeFileSync(ruta, texto, 'utf8');
      escritos.push(nombre);
    }
  }
  if (borrarSobrantes) {
    const conservar = new Set(archivos.map((a) => `${a.mes}.json`));
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isFile() && ARCHIVO_MES.test(e.name) && !conservar.has(e.name)) {
        fs.unlinkSync(path.join(dir, e.name));
        borrados.push(e.name);
      }
    }
  }
  return { escritos, sinCambios, borrados };
}
