// Fechas, calendario, clave de respuestas y precarga de imágenes.

const DIA_MS = 86400000;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_FICHA = /^[A-Za-z0-9+/]{683}=$/;

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

// Solo n, fecha y tema de cada día: nunca pruebas ni clave.
export function diasDePrueba(calendario) {
  if (!calendario || !Array.isArray(calendario.dias)) return [];
  return calendario.dias.map((d) => ({ n: d.n, fecha: d.fecha, tema: d.tema }));
}

export function diaDePrueba(search, dias, hoyISO) {
  if (!Array.isArray(dias) || dias.length === 0) return null;
  const valor = new URLSearchParams(search).get('dia');
  if (valor !== null && /^[1-9]\d{0,3}$/.test(valor)) {
    const pedido = dias.find((d) => d.n === Number(valor));
    if (pedido) return pedido;
  }
  return dias.find((d) => d.fecha === hoyISO) ?? dias[0];
}

export function diasEntre(desdeISO, hastaISO) {
  return Math.round((utcDe(hastaISO) - utcDe(desdeISO)) / DIA_MS);
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
  return tema[0] === tema[0].toLocaleUpperCase('es');
}

export function validarCalendario(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if (!mismasClaves(obj, ['version', 'lanzamiento', 'dias'])) return false;
  if (obj.version !== 3) return false;
  if (typeof obj.lanzamiento !== 'string' || !RE_FECHA.test(obj.lanzamiento)) return false;
  if (!Array.isArray(obj.dias)) return false;
  return obj.dias.every((dia, k) => {
    if (!dia || typeof dia !== 'object' || Array.isArray(dia)) return false;
    if (!mismasClaves(dia, ['n', 'fecha', 'tema', 'pruebas', 'clave', 'fichas'])) return false;
    if (dia.n !== k + 1) return false;
    if (typeof dia.fecha !== 'string' || !RE_FECHA.test(dia.fecha)) return false;
    if (!temaValido(dia.tema)) return false;
    if (!Array.isArray(dia.pruebas) || dia.pruebas.length !== 5) return false;
    if (!dia.pruebas.every((id) => typeof id === 'string' && id.length > 0)) return false;
    if (new Set(dia.pruebas).size !== 5) return false;
    if (!claveValida(dia.clave)) return false;
    return (
      Array.isArray(dia.fichas) &&
      dia.fichas.length === 5 &&
      dia.fichas.every((f) => typeof f === 'string' && RE_FICHA.test(f))
    );
  });
}

export function casoDelDia(calendario, fechaISO) {
  const n = numeroCaso(fechaISO, calendario.lanzamiento);
  if (n < 1) return null;
  const dia = calendario.dias[n - 1];
  if (!dia || dia.n !== n || dia.fecha !== fechaISO) return null;
  return { n: dia.n, fecha: dia.fecha, tema: dia.tema, pruebas: dia.pruebas, clave: dia.clave, fichas: dia.fichas };
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

// Flujo de 512 bytes, determinista, para cifrar la ficha de una prueba [D-86].
export function flujoFicha(clave, n, indice) {
  const azar = mulberry32(fnv1a32(`${clave}|${n}|${indice}`));
  const flujo = new Uint8Array(FICHA_BLOQUE);
  for (let k = 0; k < FICHA_BLOQUE; k++) flujo[k] = Math.floor(azar() * 256);
  return flujo;
}

export function ofuscarFicha(texto, clave, n, indice, aleatorio = Math.random) {
  if (typeof texto !== 'string') throw new TypeError('La ficha debe ser una cadena');
  const bytes = new TextEncoder().encode(texto);
  const largo = bytes.length;
  if (largo > FICHA_MAX_BYTES) {
    throw new RangeError(`La ficha ocupa ${largo} bytes (máximo ${FICHA_MAX_BYTES})`);
  }
  const bloque = new Uint8Array(FICHA_BLOQUE);
  bloque[0] = largo >> 8;
  bloque[1] = largo & 0xff;
  bloque.set(bytes, 2);
  for (let k = 2 + largo; k < FICHA_BLOQUE; k++) bloque[k] = Math.floor(aleatorio() * 256);
  const flujo = flujoFicha(clave, n, indice);
  let binario = '';
  for (let k = 0; k < FICHA_BLOQUE; k++) binario += String.fromCharCode(bloque[k] ^ flujo[k]);
  return btoa(binario);
}

// Nunca lanza: devuelve null si la ficha no se puede descifrar.
export function desofuscarFicha(ficha, clave, n, indice) {
  try {
    if (typeof ficha !== 'string' || !RE_FICHA.test(ficha)) return null;
    const binario = atob(ficha);
    if (binario.length !== FICHA_BLOQUE) return null;
    const flujo = flujoFicha(clave, n, indice);
    const bloque = new Uint8Array(FICHA_BLOQUE);
    for (let k = 0; k < FICHA_BLOQUE; k++) bloque[k] = binario.charCodeAt(k) ^ flujo[k];
    const largo = (bloque[0] << 8) | bloque[1];
    if (largo > FICHA_MAX_BYTES) return null;
    return new TextDecoder('utf-8', { fatal: true }).decode(bloque.subarray(2, 2 + largo));
  } catch {
    return null;
  }
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
