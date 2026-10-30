// Fechas, calendario, clave de respuestas y precarga de imágenes.

const DIA_MS = 86400000;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_FICHA = /^[A-Za-z0-9+/]{683}=$/;

// Idiomas del contenido [4.15 a 4.17]. El inglés no lleva sufijo en las semillas; el español lleva "|es".
export const IDIOMAS = Object.freeze(['en', 'es']);
export const IDIOMA_POR_DEFECTO = 'en';

export const LOCALES = Object.freeze({ en: 'en-US', es: 'es-ES' });

export function idiomaValido(idioma) {
  return IDIOMAS.includes(idioma);
}

// Parámetro ?lang= en minúsculas si es válido; si no, null.
export function idiomaDeUrl(search) {
  try {
    const valor = new URLSearchParams(typeof search === 'string' ? search : '').get('lang');
    if (valor === null) return null;
    const minusculas = valor.toLowerCase();
    return idiomaValido(minusculas) ? minusculas : null;
  } catch {
    return null;
  }
}

// Mira solo el primer elemento que sea una cadena: 'es' o 'es-*' da español; todo lo demás, inglés.
export function idiomaDelNavegador(lenguas) {
  if (!Array.isArray(lenguas)) return IDIOMA_POR_DEFECTO;
  const primera = lenguas.find((l) => typeof l === 'string');
  if (primera === undefined) return IDIOMA_POR_DEFECTO;
  const l = primera.toLowerCase();
  return l === 'es' || l.startsWith('es-') ? 'es' : IDIOMA_POR_DEFECTO;
}

// Orden: ?lang= > preferencia guardada > idioma del navegador.
export function elegirIdioma({ search, guardado, lenguas } = {}) {
  const deUrl = idiomaDeUrl(search);
  if (deUrl !== null) return { idioma: deUrl, origen: 'url' };
  if (idiomaValido(guardado)) return { idioma: guardado, origen: 'guardado' };
  return { idioma: idiomaDelNavegador(lenguas), origen: 'navegador' };
}

function sufijoIdioma(idioma) {
  if (!idiomaValido(idioma)) throw new TypeError(`Idioma no válido: ${String(idioma)}`);
  return idioma === 'es' ? '|es' : '';
}

export const FICHA_BLOQUE = 512;
export const FICHA_MAX_BYTES = 510;

function dos(n) {
  return String(n).padStart(2, '0');
}

function utcDe(fechaISO) {
  const [a, m, d] = fechaISO.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}

export function fechaLocal(fecha) {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

export function sumarDias(fechaISO, dias) {
  const [a, m, d] = fechaISO.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

// Hosts en los que se permite la previsualización local de un día.
export const HOSTS_LOCALES = ['localhost', '127.0.0.1', '[::1]'];

// Fecha ISO pedida con ?fecha=AAAA-MM-DD, solo en un host local; si no, null.
export function fechaPrevisualizada(search, hostname) {
  if (!HOSTS_LOCALES.includes(hostname)) return null;
  const valor = new URLSearchParams(search).get('fecha');
  if (valor === null || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  return sumarDias(valor, 0) === valor ? valor : null;
}

// Modo prueba [D-70, D-71]: activo solo con la constante abierta (true estricto) y ?prueba=1.
export function pruebaActiva(search, abiertas) {
  if (abiertas !== true) return false;
  return new URLSearchParams(search).get('prueba') === '1';
}

// Unión de los días del calendario y de todos los meses de afirmaciones [D-117].
// Solo n y los dos temas: nunca pruebas, clave, textos ni fichas.
export function diasDePrueba(calendario, meses) {
  const porN = new Map();
  const poner = (n, campo, tema) => {
    if (!porN.has(n)) porN.set(n, { n, temaImagenes: null, temaAfirmaciones: null });
    porN.get(n)[campo] = tema;
  };
  if (calendario && typeof calendario === 'object' && Array.isArray(calendario.dias)) {
    for (const d of calendario.dias) {
      if (d && Number.isInteger(d.n) && d.n >= 1) poner(d.n, 'temaImagenes', d.tema);
    }
  }
  if (Array.isArray(meses)) {
    const lanzamiento = calendario?.lanzamiento ?? null;
    const vistos = new Set();
    for (const el of meses) {
      if (!validarAfirmaciones(el, el?.mes)) continue;
      for (const d of el.dias) {
        if (vistos.has(d.n) || mesDeNumero(lanzamiento, d.n) !== el.mes) continue;
        vistos.add(d.n);
        poner(d.n, 'temaAfirmaciones', d.tema);
      }
    }
  }
  return [...porN.values()].sort((a, b) => a.n - b.n);
}

export function diaDePrueba(search, dias, nHoy) {
  if (!Array.isArray(dias) || dias.length === 0) return null;
  const valor = new URLSearchParams(search).get('dia');
  if (valor !== null && /^[1-9]\d{0,3}$/.test(valor)) {
    const pedido = dias.find((d) => d.n === Number(valor));
    if (pedido) return pedido;
  }
  return dias.find((d) => d.n === nHoy) ?? dias[0];
}

export function diasEntre(desdeISO, hastaISO) {
  return Math.round((utcDe(hastaISO) - utcDe(desdeISO)) / DIA_MS);
}

const MESES = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
};

// '2026-11-03' -> 'Nov 3, 2026' (en) o '3 nov 2026' (es). Pura y determinista: no usa el locale del navegador.
// Un idioma no válido se trata como en.
export function formatearFecha(fechaISO, idioma = IDIOMA_POR_DEFECTO) {
  if (typeof fechaISO !== 'string' || !RE_FECHA.test(fechaISO)) return String(fechaISO);
  const [a, m, d] = fechaISO.split('-').map(Number);
  if (m < 1 || m > 12) return fechaISO;
  if (idioma === 'es') return `${d} ${MESES.es[m - 1]} ${a}`;
  return `${MESES.en[m - 1]} ${d}, ${a}`;
}

// Tema de un elemento de diasDePrueba en el idioma; si los dos retos difieren, unidos por " / ".
export function temaDelDia(dia, idioma = IDIOMA_POR_DEFECTO) {
  const lang = idiomaValido(idioma) ? idioma : IDIOMA_POR_DEFECTO;
  const a = dia?.temaImagenes?.[lang];
  const b = dia?.temaAfirmaciones?.[lang];
  const sirve = (x) => typeof x === 'string' && x !== '';
  if (sirve(a) && sirve(b) && a !== b) return `${a} / ${b}`;
  if (sirve(a)) return a;
  if (sirve(b)) return b;
  return '';
}

export function numeroCaso(fechaISO, lanzamientoISO) {
  return diasEntre(lanzamientoISO, fechaISO) + 1;
}

export function msHastaMedianoche(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1) - fecha;
}

export function formatearCuentaAtras(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${dos(h)}:${dos(m)}:${dos(s)}`;
}

function mismasClaves(obj, claves) {
  const k = Object.keys(obj);
  return k.length === claves.length && claves.every((c) => k.includes(c));
}

function claveValida(clave) {
  if (typeof clave !== 'string' || clave.length !== 8) return false;
  try {
    return atob(clave).length === 5;
  } catch {
    return false;
  }
}

export function temaValido(tema) {
  if (typeof tema !== 'string') return false;
  if (tema.length < 1 || tema.length > 30) return false;
  if (tema !== tema.trim()) return false;
  if (/[\u0000-\u001f\u007f]/.test(tema)) return false;
  if (/[{}]/.test(tema)) return false;
  return tema[0] === tema[0].toLocaleUpperCase('en-US');
}

// Lanzamiento y fechas derivadas [D-95, D-96]
export const FECHA_BASE_PRUEBA = '2000-01-01';

function fechaIsoValida(x) {
  return typeof x === 'string' && RE_FECHA.test(x) && sumarDias(x, 0) === x;
}

export function numeroDelDia(fechaISO, lanzamiento) {
  if (lanzamiento === null || lanzamiento === undefined) return null;
  if (!fechaIsoValida(fechaISO) || !fechaIsoValida(lanzamiento)) return null;
  const n = numeroCaso(fechaISO, lanzamiento);
  return n < 1 ? null : n;
}

export function fechaDelDia(lanzamiento, n) {
  if (lanzamiento === null || lanzamiento === undefined) return null;
  if (!fechaIsoValida(lanzamiento) || !Number.isInteger(n)) return null;
  return sumarDias(lanzamiento, n - 1);
}

// Objeto con exactamente los idiomas en y es, cada uno validado por `valido` [4.16].
function porIdiomaValido(x, valido) {
  return esObjeto(x) && mismasClaves(x, IDIOMAS) && IDIOMAS.every((i) => valido(x[i]));
}

const cincoBloques = (lista) => Array.isArray(lista) && lista.length === 5 && lista.every((f) => typeof f === 'string' && RE_FICHA.test(f));

export function validarCalendario(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if (!mismasClaves(obj, ['version', 'lanzamiento', 'dias'])) return false;
  if (obj.version !== 5) return false;
  if (obj.lanzamiento !== null && !fechaIsoValida(obj.lanzamiento)) return false;
  if (!Array.isArray(obj.dias)) return false;
  return obj.dias.every((dia, k) => {
    if (!dia || typeof dia !== 'object' || Array.isArray(dia)) return false;
    if (!mismasClaves(dia, ['n', 'tema', 'pruebas', 'clave', 'fichas'])) return false;
    if (dia.n !== k + 1) return false;
    if (!porIdiomaValido(dia.tema, temaValido)) return false;
    if (!Array.isArray(dia.pruebas) || dia.pruebas.length !== 5) return false;
    if (!dia.pruebas.every((id) => typeof id === 'string' && id.length > 0)) return false;
    if (new Set(dia.pruebas).size !== 5) return false;
    if (!claveValida(dia.clave)) return false;
    return porIdiomaValido(dia.fichas, cincoBloques);
  });
}

function casoDe(dia, n, fecha) {
  if (!dia || dia.n !== n) return null;
  return { n: dia.n, fecha, tema: dia.tema, pruebas: dia.pruebas, clave: dia.clave, fichas: dia.fichas };
}

export function casoDelDia(calendario, fechaISO) {
  const n = numeroDelDia(fechaISO, calendario.lanzamiento);
  if (n === null) return null;
  return casoDe(calendario.dias[n - 1], n, fechaISO);
}

// Modo prueba: el día n aunque no haya lanzamiento.
export function casoDeNumero(calendario, n) {
  if (!Number.isInteger(n) || n < 1) return null;
  const fecha = fechaDelDia(calendario.lanzamiento ?? FECHA_BASE_PRUEBA, n);
  return casoDe(calendario.dias[n - 1], n, fecha);
}

export function rutaPrueba(id) {
  return `casos/${id}.webp`;
}

function mascara(n, i) {
  return (n * 37 + i * 101 + 13) % 256;
}

export function ofuscar(verdades, n, aleatorio = Math.random) {
  let texto = '';
  for (let i = 0; i < 5; i++) {
    const ruido = Math.floor(aleatorio() * 128);
    const byte = (((ruido << 1) | verdades[i]) ^ mascara(n, i)) & 0xff;
    texto += String.fromCharCode(byte);
  }
  return btoa(texto);
}

export function desofuscar(clave, n, indice) {
  return (atob(clave).charCodeAt(indice) ^ mascara(n, indice)) & 1;
}

// FNV-1a de 32 bits sobre los códigos UTF-16 de la cadena (todos ASCII).
function fnv1a32(texto) {
  let h = 0x811c9dc5;
  for (let k = 0; k < texto.length; k++) {
    h ^= texto.charCodeAt(k);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function mulberry32(semilla) {
  let a = semilla;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Flujo de bytes determinista a partir de una semilla de texto [D-103].
export function flujoBytes(semilla, largo) {
  const azar = mulberry32(fnv1a32(semilla));
  const flujo = new Uint8Array(largo);
  for (let k = 0; k < largo; k++) flujo[k] = Math.floor(azar() * 256);
  return flujo;
}

// Flujo de 512 bytes para cifrar la ficha de una prueba [D-86].
export function flujoFicha(clave, n, indice, idioma = IDIOMA_POR_DEFECTO) {
  return flujoBytes(`${clave}|${n}|${indice}${sufijoIdioma(idioma)}`, FICHA_BLOQUE);
}

// 2 bytes de longitud + contenido + relleno aleatorio, XOR con el flujo, en base64.
export function ofuscarBloque(bytes, semilla, largoBloque, aleatorio = Math.random) {
  const largo = bytes.length;
  if (largo > largoBloque - 2) {
    throw new RangeError(`El contenido ocupa ${largo} bytes (máximo ${largoBloque - 2})`);
  }
  const bloque = new Uint8Array(largoBloque);
  bloque[0] = largo >> 8;
  bloque[1] = largo & 0xff;
  bloque.set(bytes, 2);
  for (let k = 2 + largo; k < largoBloque; k++) bloque[k] = Math.floor(aleatorio() * 256);
  const flujo = flujoBytes(semilla, largoBloque);
  let binario = '';
  for (let k = 0; k < largoBloque; k++) binario += String.fromCharCode(bloque[k] ^ flujo[k]);
  return btoa(binario);
}

// Nunca lanza: devuelve null si el bloque no se puede descifrar.
export function desofuscarBloque(cadena, semilla, largoBloque) {
  try {
    if (typeof cadena !== 'string') return null;
    const total = 4 * Math.ceil(largoBloque / 3);
    const relleno = (3 - (largoBloque % 3)) % 3;
    const formato = new RegExp(`^[A-Za-z0-9+/]{${total - relleno}}={${relleno}}$`);
    if (!formato.test(cadena)) return null;
    const binario = atob(cadena);
    if (binario.length !== largoBloque) return null;
    const flujo = flujoBytes(semilla, largoBloque);
    const bloque = new Uint8Array(largoBloque);
    for (let k = 0; k < largoBloque; k++) bloque[k] = binario.charCodeAt(k) ^ flujo[k];
    const largo = (bloque[0] << 8) | bloque[1];
    if (largo > largoBloque - 2) return null;
    return bloque.slice(2, 2 + largo);
  } catch {
    return null;
  }
}

export function ofuscarFicha(texto, clave, n, indice, aleatorio = Math.random, idioma = IDIOMA_POR_DEFECTO) {
  if (typeof texto !== 'string') throw new TypeError('La ficha debe ser una cadena');
  const bytes = new TextEncoder().encode(texto);
  if (bytes.length > FICHA_MAX_BYTES) {
    throw new RangeError(`La ficha ocupa ${bytes.length} bytes (máximo ${FICHA_MAX_BYTES})`);
  }
  return ofuscarBloque(bytes, `${clave}|${n}|${indice}${sufijoIdioma(idioma)}`, FICHA_BLOQUE, aleatorio);
}

// Nunca lanza: devuelve null si la ficha no se puede descifrar.
export function desofuscarFicha(ficha, clave, n, indice, idioma = IDIOMA_POR_DEFECTO) {
  try {
    const bytes = desofuscarBloque(ficha, `${clave}|${n}|${indice}${sufijoIdioma(idioma)}`, FICHA_BLOQUE);
    if (bytes === null) return null;
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

// Afirmaciones y aclaraciones de Fact or Fake [D-124]
export const AFIRMACION_BLOQUE = 512;
export const AFIRMACION_MAX_BYTES = 510;
export const ACLARACION_BLOQUE = 512;
export const ACLARACION_MAX_BYTES = 510;
export const DETALLES_MAX = 3;

function cadenaNoVacia(x) {
  return typeof x === 'string' && x.length > 0;
}

export function ofuscarAfirmacion(texto, clave, n, indice, aleatorio = Math.random, idioma = IDIOMA_POR_DEFECTO) {
  if (!cadenaNoVacia(texto) || texto.includes('\n')) {
    throw new TypeError('La afirmación debe ser una cadena no vacía sin saltos de línea');
  }
  const bytes = new TextEncoder().encode(texto);
  if (bytes.length > AFIRMACION_MAX_BYTES) {
    throw new RangeError(`La afirmación ocupa ${bytes.length} bytes (máximo ${AFIRMACION_MAX_BYTES})`);
  }
  return ofuscarBloque(bytes, `${clave}|${n}|${indice}|afirmacion${sufijoIdioma(idioma)}`, AFIRMACION_BLOQUE, aleatorio);
}

// Nunca lanza.
export function desofuscarAfirmacion(cadena, clave, n, indice, idioma = IDIOMA_POR_DEFECTO) {
  try {
    const bytes = desofuscarBloque(cadena, `${clave}|${n}|${indice}|afirmacion${sufijoIdioma(idioma)}`, AFIRMACION_BLOQUE);
    if (bytes === null) return null;
    const texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return texto === '' || texto.includes('\n') ? null : texto;
  } catch {
    return null;
  }
}

export function ofuscarAclaracion({ aclaracion, detalles = [] } = {}, clave, n, indice, aleatorio = Math.random, idioma = IDIOMA_POR_DEFECTO) {
  if (
    !cadenaNoVacia(aclaracion) ||
    !Array.isArray(detalles) ||
    detalles.length > DETALLES_MAX ||
    ![aclaracion, ...detalles].every((t) => cadenaNoVacia(t) && !t.includes('\n'))
  ) {
    throw new TypeError(`La aclaración y hasta ${DETALLES_MAX} detalles deben ser cadenas no vacías sin saltos de línea`);
  }
  const bytes = new TextEncoder().encode([aclaracion, ...detalles].join('\n'));
  if (bytes.length > ACLARACION_MAX_BYTES) {
    throw new RangeError(`La aclaración ocupa ${bytes.length} bytes (máximo ${ACLARACION_MAX_BYTES})`);
  }
  return ofuscarBloque(bytes, `${clave}|${n}|${indice}|aclaracion${sufijoIdioma(idioma)}`, ACLARACION_BLOQUE, aleatorio);
}

// Nunca lanza.
export function desofuscarAclaracion(cadena, clave, n, indice, idioma = IDIOMA_POR_DEFECTO) {
  try {
    const bytes = desofuscarBloque(cadena, `${clave}|${n}|${indice}|aclaracion${sufijoIdioma(idioma)}`, ACLARACION_BLOQUE);
    if (bytes === null) return null;
    const partes = new TextDecoder('utf-8', { fatal: true }).decode(bytes).split('\n');
    if (partes.length > DETALLES_MAX + 1 || partes.some((p) => p === '')) return null;
    return { aclaracion: partes[0], detalles: partes.slice(1) };
  } catch {
    return null;
  }
}

// Archivos mensuales de Fact or Fake [D-116, D-117]
export const MES_PATRON = /^\d{4}-(0[1-9]|1[0-2])$/;
export const AFIRMACIONES_CARPETA = 'data/facts/';

export function mesDeFecha(fechaISO) {
  return fechaIsoValida(fechaISO) ? fechaISO.slice(0, 7) : null;
}

export function mesDeNumero(lanzamiento, n) {
  if (!Number.isInteger(n) || n < 1) return null;
  const base = lanzamiento ?? FECHA_BASE_PRUEBA;
  if (!fechaIsoValida(base)) return null;
  return mesDeFecha(fechaDelDia(base, n));
}

export function rutaAfirmaciones(mes) {
  return typeof mes === 'string' && MES_PATRON.test(mes) ? `${AFIRMACIONES_CARPETA}${mes}.json` : null;
}

export function afirmacionesVacias(mes) {
  return { version: 2, mes, dias: [] };
}


function esObjeto(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

export function validarAfirmaciones(obj, mes) {
  if (!esObjeto(obj)) return false;
  if (!mismasClaves(obj, ['version', 'mes', 'dias'])) return false;
  if (obj.version !== 2) return false;
  if (typeof obj.mes !== 'string' || !MES_PATRON.test(obj.mes)) return false;
  if (mes !== undefined && obj.mes !== mes) return false;
  if (!Array.isArray(obj.dias) || obj.dias.length < 1) return false;
  const primero = obj.dias[0]?.n;
  return obj.dias.every((dia, k) => {
    if (!esObjeto(dia)) return false;
    if (!mismasClaves(dia, ['n', 'tema', 'clave', 'textos', 'fichas'])) return false;
    if (!Number.isInteger(dia.n) || dia.n < 1 || dia.n !== primero + k) return false;
    if (!porIdiomaValido(dia.tema, temaValido) || !claveValida(dia.clave)) return false;
    return porIdiomaValido(dia.textos, cincoBloques) && porIdiomaValido(dia.fichas, cincoBloques);
  });
}

function afirmacionesDe(dia, fecha) {
  if (!dia) return null;
  return { n: dia.n, fecha, tema: dia.tema, clave: dia.clave, textos: dia.textos, fichas: dia.fichas };
}

export function afirmacionesDelDia(datos, lanzamiento, fechaISO) {
  if (!datos || !Array.isArray(datos.dias)) return null;
  const n = numeroDelDia(fechaISO, lanzamiento);
  if (n === null || datos.mes !== mesDeFecha(fechaISO)) return null;
  return afirmacionesDe(datos.dias.find((d) => d.n === n), fechaISO);
}

export function afirmacionesDeNumero(datos, lanzamiento, n) {
  if (!datos || !Array.isArray(datos.dias)) return null;
  const mes = mesDeNumero(lanzamiento, n);
  if (mes === null || datos.mes !== mes) return null;
  return afirmacionesDe(datos.dias.find((d) => d.n === n), fechaDelDia(lanzamiento ?? FECHA_BASE_PRUEBA, n));
}

export function afirmacionesDelMes(meses, mes) {
  if (typeof mes !== 'string' || !MES_PATRON.test(mes)) return null;
  if (!Array.isArray(meses)) return afirmacionesVacias(mes);
  return meses.find((m) => m && m.mes === mes) ?? afirmacionesVacias(mes);
}

// Juego normal y previsualización: solo el archivo del mes de la fecha efectiva.
export async function cargarAfirmaciones(fechaISO, pedir = fetch) {
  const mes = mesDeFecha(fechaISO);
  if (mes === null) throw new Error('Afirmaciones: fecha no válida');
  const respuesta = await pedir(rutaAfirmaciones(mes), { cache: 'no-cache' });
  if (respuesta.status === 404) return afirmacionesVacias(mes);
  if (!respuesta.ok) throw new Error(`Afirmaciones: respuesta ${respuesta.status}`);
  const obj = await respuesta.json();
  if (!validarAfirmaciones(obj, mes)) throw new Error('Afirmaciones: estructura no válida');
  return obj;
}

// Modo prueba: sondeo en serie de todos los meses existentes (4.7.2).
export async function cargarAfirmacionesPrueba(lanzamiento, pedir = fetch) {
  const meses = [];
  let siguiente = 1;
  for (;;) {
    const mes = mesDeNumero(lanzamiento, siguiente);
    if (mes === null) throw new Error('Afirmaciones: lanzamiento no válido');
    const respuesta = await pedir(rutaAfirmaciones(mes), { cache: 'no-cache' });
    if (respuesta.status === 404) break;
    if (!respuesta.ok) throw new Error(`Afirmaciones: respuesta ${respuesta.status}`);
    const obj = await respuesta.json();
    if (!validarAfirmaciones(obj, mes)) throw new Error('Afirmaciones: estructura no válida');
    if (obj.dias[0].n !== siguiente || obj.dias.some((d) => mesDeNumero(lanzamiento, d.n) !== mes)) break;
    meses.push(obj);
    siguiente = obj.dias[obj.dias.length - 1].n + 1;
    if (mesDeNumero(lanzamiento, siguiente) === mes) break;
  }
  return meses;
}

export async function cargarCalendario(url = 'data/calendario.json', pedir = fetch) {
  const respuesta = await pedir(url, { cache: 'no-cache' });
  if (!respuesta.ok) throw new Error(`Calendario: respuesta ${respuesta.status}`);
  const calendario = await respuesta.json();
  if (!validarCalendario(calendario)) throw new Error('Calendario: estructura no válida');
  return calendario;
}

export async function precargar(ids, crearImagen = () => new Image()) {
  const imagenes = ids.map((id) => {
    const img = crearImagen();
    img.decoding = 'async';
    img.src = rutaPrueba(id);
    return img;
  });
  await Promise.all(imagenes.map((img) => img.decode()));
  return imagenes;
}
