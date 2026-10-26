// Funciones puras y de archivo del importador de Headlines (spec 4.9 a 4.13) [D-106, D-107, D-116].
// Las funciones puras no tocan el disco; solo leerTitularesMensuales y escribirTitularesMensuales lo hacen.

import fs from 'node:fs';
import path from 'node:path';
import {
  TEXTO_MAX_BYTES, NOTICIA_MAX_BYTES, MES_PATRON, urlFuenteValida, validarTitulares,
  mesDeNumero, fechaDelDia, diasEntre, temaValido
} from '../js/diario.js';
import { analizarCarpeta, contienePalabraProhibida, normalizarFicha } from './temas.mjs';

export const CAMPOS_NOTICIA = ['type', 'headline', 'lede', 'source', 'prompt'];
export const TITULAR_MAX = 110;
export const ENTRADILLA_MAX = 280;
export const UMBRAL_LONGITUD = 0.25;
export const ARCHIVO_MES = /^(\d{4}-(?:0[1-9]|1[0-2]))\.json$/;

// Lista de comprobación de 4.13 (más el añadido de DP-49).
export const LISTA_REVISION = [
  'Ninguna noticia de IA nombra a una persona real (tampoco por su cargo único: "the current Pope").',
  'Ninguna noticia de IA nombra una empresa, marca, producto, medio u organización real.',
  'Ninguna noticia de IA nombra una institución real (gobiernos, ministerios, partidos, universidades, hospitales, equipos, cuerpos de policía).',
  'Los prompts tampoco contienen nombres reales.',
  'Las noticias auténticas tienen su URL https original, el titular adaptado del medio sin cambiar su sentido y una entradilla resumida con palabras propias (no copiada) que no cambia el sentido de la noticia.',
  'Ninguna noticia (auténtica o de IA) revela el medio ni la fecha en el texto.',
  'Ninguna noticia de IA atribuye sucesos graves inventados (muertes, catástrofes, delitos, salud pública) a lugares reales.'
];

const NOMBRE_NOTICIAS = 'noticias.txt';
const RE_CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
const bytes = (t) => new TextEncoder().encode(t).length;
const puntos = (t) => Array.from(t).length;

// ---------- noticias.txt (4.9) ----------

export function analizarNoticias(texto, ruta, { textoMaxBytes = TEXTO_MAX_BYTES, fichaMaxBytes = NOTICIA_MAX_BYTES, urlValida = urlFuenteValida } = {}) {
  const errores = [];
  const avisos = [];
  const noticias = [];
  try {
    let t = typeof texto === 'string' ? texto : String(texto ?? '');
    if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
    t = t.replace(/\r\n?/g, '\n').normalize('NFC');

    // Bloques separados por '---'.
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

    let nIa = 0;
    let tiposOk = true;
    llenos.forEach((lineas, i) => {
      const donde = `${ruta}, bloque ${i + 1}`;
      const err = [];
      const campos = new Map();
      for (const linea of lineas) {
        const k = linea.indexOf(':');
        if (k < 0) {
          err.push(`${donde}: la línea "${linea.trim().slice(0, 30)}" no tiene la forma campo: valor.`);
          continue;
        }
        const campo = linea.slice(0, k).trim();
        const valor = linea.slice(k + 1).trim().replace(/[ \t]+/g, ' ');
        if (!CAMPOS_NOTICIA.includes(campo)) {
          err.push(`${donde}: campo no previsto "${campo.slice(0, 30)}".`);
          continue;
        }
        if (campos.has(campo)) {
          err.push(`${donde}: el campo ${campo} está repetido.`);
          continue;
        }
        campos.set(campo, valor);
      }
      for (const obligatorio of ['type', 'headline', 'lede']) {
        if (!campos.has(obligatorio)) err.push(`${donde}: falta el campo ${obligatorio}.`);
      }
      const tipoTexto = campos.get('type');
      let tipo = null;
      if (tipoTexto !== undefined) {
        if (tipoTexto === 'real') tipo = 'autentica';
        else if (tipoTexto === 'ai') tipo = 'generada';
        else err.push(`${donde}: type debe ser real o ai.`);
      }
      if (tipo === null) tiposOk = false;
      if (tipo === 'generada') nIa++;
      if (tipo === 'autentica') {
        if (!campos.has('source')) err.push(`${donde}: falta el campo source.`);
        if (campos.has('prompt')) err.push(`${donde}: una noticia real no lleva prompt.`);
      }
      if (tipo === 'generada') {
        if (!campos.has('prompt')) err.push(`${donde}: falta el campo prompt.`);
        if (campos.has('source')) err.push(`${donde}: una noticia ai no lleva source.`);
      }

      const titular = campos.get('headline') ?? '';
      const entradilla = campos.get('lede') ?? '';
      for (const [nombre, valor, max] of [['headline', titular, TITULAR_MAX], ['lede', entradilla, ENTRADILLA_MAX]]) {
        if (!campos.has(nombre)) continue;
        if (valor === '') err.push(`${donde}: ${nombre} está vacío.`);
        if (RE_CONTROL.test(valor)) err.push(`${donde}: ${nombre} tiene caracteres de control.`);
        if (/[{}]/.test(valor)) err.push(`${donde}: ${nombre} no puede contener { ni }.`);
        if (puntos(valor) > max) err.push(`${donde}: ${nombre} mide ${puntos(valor)} caracteres y el máximo es ${max}.`);
      }
      if (titular !== '' && entradilla !== '' && bytes(`${titular}\n${entradilla}`) > textoMaxBytes) {
        err.push(`${donde}: titular y entradilla juntos pasan de ${textoMaxBytes} bytes.`);
      }

      let fuente = null;
      if (tipo === 'autentica' && campos.has('source')) {
        try {
          fuente = new URL(campos.get('source')).href;
        } catch {
          fuente = null;
        }
        if (fuente === null || !urlValida(fuente)) {
          err.push(`${donde}: source no es una URL https válida (sin credenciales, de ${NOTICIA_MAX_BYTES} bytes como máximo; acórtala o usa la URL canónica).`);
          fuente = null;
        }
      }

      let prompt = null;
      let promptRecortado = false;
      if (tipo === 'generada' && campos.has('prompt')) {
        const f = normalizarFicha(campos.get('prompt'), fichaMaxBytes);
        if (f.vacia) {
          err.push(`${donde}: el prompt está vacío.`);
        } else {
          prompt = f.texto;
          promptRecortado = f.truncada;
          if (f.truncada) avisos.push(`AVISO: ${donde}: el prompt pasaba de ${fichaMaxBytes} bytes y se ha recortado.`);
        }
      }

      if (tipo === 'autentica' || tipo === 'generada') {
        const frases = (entradilla.match(/[.!?](?=\s|$)/g) ?? []).length;
        if (frases > 2) avisos.push(`AVISO: ${donde}: la entradilla tiene más de 2 frases.`);
      }

      if (err.length === 0) noticias.push({ tipo, titular, entradilla, fuente, prompt, promptRecortado });
      errores.push(...err);
    });

    if (llenos.length !== 5) {
      errores.push(`${ruta}: tiene ${llenos.length} noticias y cada día necesita exactamente 5.`);
    } else if (tiposOk && (nIa === 0 || nIa === 5)) {
      errores.push(`${ruta}: tiene ${nIa} noticias de IA; cada día necesita entre 1 y 4.`);
    }
  } catch (e) {
    errores.push(`${ruta}: no se pudo analizar (${e.message}).`);
  }
  return { noticias, errores, avisos };
}

// ---------- Planificación (4.11) ----------

const IGNORADOS = (n) => n.startsWith('.') || n === 'Thumbs.db' || n === 'desktop.ini';

// carpetas: [{nombre, archivos: string[], subcarpetas: string[]}]
export function planificarTitulares({ carpetas, ultimoDia = 0, hoyISO, lanzamiento = null, reimportar = false }) {
  const errores = [];
  const avisos = [];
  const nuevos = [];
  const omitidos = [];
  const ultimo = reimportar ? 0 : ultimoDia;

  const analizadas = [];
  for (const c of carpetas ?? []) {
    try {
      analizadas.push({ ...analizarCarpeta(c.nombre), c });
    } catch (e) {
      // La plantilla 00-example (número 00) se ignora sin error ni aviso: la numeración empieza en 01.
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

  for (const a of hijos) {
    const { c, n, tema } = a;
    const nom = c.nombre;
    const archivos = (c.archivos ?? []).filter((x) => !IGNORADOS(x));
    const subs = (c.subcarpetas ?? []).filter((x) => !IGNORADOS(x));
    if (!archivos.includes(NOMBRE_NOTICIAS)) {
      errores.push(`${nom} debe contener ${NOMBRE_NOTICIAS}.`);
    }
    const sobrantes = [...archivos.filter((x) => x !== NOMBRE_NOTICIAS), ...subs];
    if (sobrantes.length > 0) {
      errores.push(`${nom} contiene archivos o carpetas no admitidos: ${sobrantes.join(', ')}.`);
    }
    if (!temaValido(tema)) {
      errores.push(`El tema de ${nom} ("${tema}") no es válido: debe tener entre 1 y 30 caracteres.`);
    }
    const prohibida = contienePalabraProhibida(tema);
    if (prohibida) {
      errores.push(`El tema de ${nom} ("${tema}") contiene la palabra prohibida "${prohibida}". Cambia el nombre de la carpeta.`);
    }
    let fecha = null;
    if (lanzamiento !== null && lanzamiento !== undefined) {
      fecha = fechaDelDia(lanzamiento, n);
      if (fecha !== null && diasEntre(hoyISO, fecha) < 1) {
        errores.push(`El día ${String(n).padStart(2, '0')} (${fecha}) ya ha llegado o ha pasado; no se pueden añadir días de hoy ni del pasado.`);
      }
    }
    nuevos.push({ n, fecha, tema, carpeta: nom, mes: mesDeNumero(lanzamiento, n) });
  }

  return { nuevos, omitidos, errores, avisos };
}

// ---------- Longitudes (4.11) ----------

const media = (xs) => (xs.length === 0 ? null : xs.reduce((s, x) => s + x, 0) / xs.length);

export function medias(noticias) {
  const de = (tipo, campo) => media(noticias.filter((x) => x.tipo === tipo).map((x) => puntos(x[campo])));
  return {
    titular: { autentica: de('autentica', 'titular'), generada: de('generada', 'titular') },
    entradilla: { autentica: de('autentica', 'entradilla'), generada: de('generada', 'entradilla') }
  };
}

function avisoDe(donde, nombre, m) {
  const { autentica: a, generada: g } = m;
  if (a === null || g === null) return null;
  const mayor = Math.max(a, g);
  const menor = Math.min(a, g);
  if (menor <= 0 || (mayor - menor) / menor <= UMBRAL_LONGITUD) return null;
  const pct = Math.round(((mayor - menor) / menor) * 100);
  const art = nombre === 'titulares' ? 'los' : 'las';
  const [quien, otro] = g > a ? ['de IA', 'reales'] : ['reales', 'de IA'];
  return `AVISO: ${donde}${donde.startsWith("en todo") ? "," : ":"} ${art} ${nombre} ${quien} miden de media un ${pct} % más que ${art} ${otro} (${Math.round(mayor)} frente a ${Math.round(menor)} caracteres).`;
}

export function avisosLongitud(dias) {
  const avisos = [];
  const comprobar = (donde, noticias) => {
    const m = medias(noticias);
    for (const [nombre, clave] of [['titulares', 'titular'], ['entradillas', 'entradilla']]) {
      const a = avisoDe(donde, nombre, m[clave]);
      if (a) avisos.push(a);
    }
  };
  for (const d of dias) comprobar(`día ${d.n}`, d.noticias);
  comprobar('en todo Headlines', dias.flatMap((d) => d.noticias));
  return avisos;
}

// ---------- Argumentos (4.10) ----------

export function analizarArgumentosTitulares(argv) {
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

// ---------- Archivos mensuales [D-116] ----------

export function unirMeses(archivos, { lanzamiento = null, comprobarMes = true } = {}) {
  const errores = [];
  const porN = new Map();
  try {
    for (const { nombre, contenido } of archivos ?? []) {
      const ruta = `data/titulares/${nombre}`;
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
      if (!validarTitulares(contenido, mes)) {
        errores.push(`${ruta}: no tiene la estructura de la versión 1 o su mes no coincide con el nombre.`);
        continue;
      }
      for (const dia of contenido.dias) {
        const previo = porN.get(dia.n);
        if (previo) {
          if (!comprobarMes && JSON.stringify(previo.dia) === JSON.stringify(dia)) continue;
          errores.push(`El día ${dia.n} de Headlines está repetido en ${previo.nombre} y ${nombre}.`);
          continue;
        }
        porN.set(dia.n, { dia, nombre, mes });
        if (comprobarMes) {
          const esperado = mesDeNumero(lanzamiento, dia.n);
          if (esperado !== mes) {
            errores.push(`El día ${dia.n} de Headlines está en ${nombre} y le corresponde ${esperado}.`);
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
            ? `Los días de Headlines deben empezar en 1 y el primero es el ${ns[0]}.`
            : `Faltan días de Headlines: tras el día ${ns[i - 1]} viene el ${ns[i]}.`
        );
        break;
      }
    }
    if (errores.length === 0) return { dias: ns.map((n) => porN.get(n).dia), errores };
  } catch (e) {
    errores.push(`data/titulares/: no se pudo unir (${e.message}).`);
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
  return [...grupos.keys()].sort().map((mes) => ({ version: 1, mes, dias: grupos.get(mes) }));
}

export function leerTitularesMensuales(dir) {
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

export function escribirTitularesMensuales(dir, archivos, { borrarSobrantes = false } = {}) {
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
