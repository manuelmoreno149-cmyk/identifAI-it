// Almacenamiento local con clave versionada. Ninguna función lanza.
import { sumarDias, idiomaValido } from './diario.js';

export const CLAVE = 'identifaiit.v3';
export const VERSION = 3;
export const RETOS = ['imagenes', 'afirmaciones'];
const CLAVE_PRUEBA = 'identifaiit.prueba';

// Preferencia de idioma [D-154]: clave aparte, fuera de identifaiit.v3 (el idioma no entra en el progreso).
export const CLAVE_IDIOMA = 'identifaiit.idioma';

// 'en' o 'es' guardado, o null si falta, no es válido o el almacén falla. Nunca lanza.
export function leerIdioma(almacen = almacenGlobal()) {
  try {
    const valor = almacen.getItem(CLAVE_IDIOMA);
    return idiomaValido(valor) ? valor : null;
  } catch {
    return null;
  }
}

// true si lo guardó; false si el idioma no es válido o el almacén falla. Nunca lanza.
export function guardarIdioma(almacen, idioma) {
  if (!idiomaValido(idioma)) return false;
  try {
    almacen.setItem(CLAVE_IDIOMA, idioma);
    return true;
  } catch {
    return false;
  }
}

function almacenGlobal() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function respaldoGlobal() {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
}

// Almacén en memoria con la interfaz mínima de Storage (previsualización local).
export function crearAlmacenMemoria() {
  const mapa = new Map();
  return {
    getItem: (clave) => (mapa.has(clave) ? mapa.get(clave) : null),
    setItem: (clave, valor) => {
      mapa.set(clave, String(valor));
    },
    removeItem: (clave) => {
      mapa.delete(clave);
    }
  };
}

function retoInicial() {
  return { partidas: {}, racha: 0, mejorRacha: 0 };
}

export function datosIniciales() {
  return {
    version: VERSION,
    ajustes: { modo: 'normal', reto: 'imagenes' },
    retos: { imagenes: retoInicial(), afirmaciones: retoInicial() }
  };
}

function esObjeto(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function esReto(reto) {
  return RETOS.includes(reto);
}

function normalizarReto(crudo) {
  if (!esObjeto(crudo)) return retoInicial();
  return {
    partidas: esObjeto(crudo.partidas) ? crudo.partidas : {},
    racha: Number.isInteger(crudo.racha) ? crudo.racha : 0,
    mejorRacha: Number.isInteger(crudo.mejorRacha) ? crudo.mejorRacha : 0
  };
}

function normalizar(crudo) {
  if (!esObjeto(crudo) || crudo.version !== VERSION || !esObjeto(crudo.retos)) return datosIniciales();
  const base = datosIniciales();
  return {
    version: VERSION,
    ajustes: { ...base.ajustes, ...(esObjeto(crudo.ajustes) ? crudo.ajustes : {}) },
    retos: {
      imagenes: normalizarReto(crudo.retos.imagenes),
      afirmaciones: normalizarReto(crudo.retos.afirmaciones)
    }
  };
}

export function leer(almacen = almacenGlobal()) {
  let disponible = false;
  try {
    almacen.setItem(CLAVE_PRUEBA, '1');
    almacen.removeItem(CLAVE_PRUEBA);
    disponible = true;
  } catch {
    return { datos: datosIniciales(), disponible: false };
  }
  try {
    const texto = almacen.getItem(CLAVE);
    if (texto === null || texto === undefined) return { datos: datosIniciales(), disponible };
    return { datos: normalizar(JSON.parse(texto)), disponible };
  } catch {
    return { datos: datosIniciales(), disponible };
  }
}

export function guardar(datos, almacen = almacenGlobal()) {
  try {
    almacen.setItem(CLAVE, JSON.stringify(datos));
    return true;
  } catch {
    return false;
  }
}

// Lee la clave sin sondear. Devuelve los datos o null si no hay nada válido.
function leerClave(almacen) {
  try {
    const texto = almacen.getItem(CLAVE);
    if (texto === null || texto === undefined) return null;
    const crudo = JSON.parse(texto);
    if (!esObjeto(crudo) || crudo.version !== VERSION || !esObjeto(crudo.retos)) return null;
    return normalizar(crudo);
  } catch {
    return null;
  }
}

// Como leer, pero si localStorage no funciona recupera la copia de sessionStorage.
// disponible: localStorage funciona. respaldo: los datos vienen de sessionStorage.
export function leerConRespaldo(local = almacenGlobal(), sesion = respaldoGlobal()) {
  const l = leer(local);
  if (l.disponible) return { datos: l.datos, disponible: true, respaldo: false };
  const copia = leerClave(sesion);
  if (copia) return { datos: copia, disponible: false, respaldo: true };
  return { datos: l.datos, disponible: false, respaldo: false };
}

// Guarda en localStorage y deja siempre una copia en sessionStorage.
export function guardarConRespaldo(datos, local = almacenGlobal(), sesion = respaldoGlobal()) {
  const guardado = guardar(datos, local);
  const respaldo = guardar(datos, sesion);
  return { guardado, respaldo };
}

// Relee lo último guardado, aplica solo el cambio y lo guarda. Si localStorage no
// funciona, parte de los datos en memoria. Nunca lanza.
export function actualizar(cambio, enMemoria, local = almacenGlobal(), sesion = respaldoGlobal()) {
  const lectura = leer(local);
  const base = lectura.disponible ? lectura.datos : (enMemoria ?? lectura.datos);
  const nuevos = cambio(base);
  if (lectura.disponible && nuevos === base) return { datos: base, guardado: true };
  const { guardado } = guardarConRespaldo(nuevos, local, sesion);
  return { datos: nuevos, guardado };
}

export function partidaDe(datos, reto, fechaISO) {
  if (!esReto(reto)) return null;
  return datos.retos?.[reto]?.partidas?.[fechaISO] ?? null;
}

export function conAjustes(datos, cambios) {
  return { ...datos, ajustes: { ...datos.ajustes, ...cambios } };
}

// Devuelve datos con el reto sustituido por `cambios` mezclados sobre el existente.
function conReto(datos, reto, cambios) {
  return { ...datos, retos: { ...datos.retos, [reto]: { ...datos.retos[reto], ...cambios } } };
}

function conPartida(datos, reto, fecha, partida, extra = {}) {
  const r = datos.retos[reto];
  return conReto(datos, reto, { ...extra, partidas: { ...r.partidas, [fecha]: partida } });
}

export function registrarInicio(datos, reto, { fecha, n, modo, sesion }) {
  if (!esReto(reto) || partidaDe(datos, reto, fecha)) return datos;
  return conPartida(datos, reto, fecha, {
    n,
    modo: modo ?? null,
    estado: 'en_curso',
    resultados: '-----',
    aciertos: 0,
    sesion
  });
}

function contar(resultados) {
  return [...resultados].filter((c) => c === 'A').length;
}

// Una partida terminada nunca se modifica. Si se indica `sesion`, solo la pestaña
// que la empezó puede tocar una partida en curso.
function editable(partida, sesion) {
  if (!partida || partida.estado === 'terminada') return false;
  return sesion === undefined || partida.sesion === sesion;
}

export function registrarPrueba(datos, reto, fecha, indice, codigo, sesion) {
  const partida = partidaDe(datos, reto, fecha);
  if (!editable(partida, sesion)) return datos;
  const resultados = partida.resultados.slice(0, indice) + codigo + partida.resultados.slice(indice + 1);
  return conPartida(datos, reto, fecha, { ...partida, resultados, aciertos: contar(resultados) });
}

export function calcularRacha(partidas, hoyISO) {
  const terminada = (f) => partidas[f]?.estado === 'terminada';
  let dia = terminada(hoyISO) ? hoyISO : sumarDias(hoyISO, -1);
  let racha = 0;
  while (terminada(dia)) {
    racha++;
    dia = sumarDias(dia, -1);
  }
  return racha;
}

// `hoyISO` es la fecha de la partida (la de su inicio), no la del momento de acabar.
export function registrarFin(datos, reto, fecha, hoyISO, sesion) {
  const partida = partidaDe(datos, reto, fecha);
  if (!editable(partida, sesion)) return datos;
  const terminadaP = { ...partida, estado: 'terminada', aciertos: contar(partida.resultados) };
  const partidas = { ...datos.retos[reto].partidas, [fecha]: terminadaP };
  const racha = calcularRacha(partidas, hoyISO);
  return conReto(datos, reto, {
    partidas,
    racha,
    mejorRacha: Math.max(datos.retos[reto].mejorRacha, racha)
  });
}

export function cerrarAbandonada(datos, reto, fecha, hoyISO) {
  const partida = partidaDe(datos, reto, fecha);
  if (!editable(partida)) return datos;
  const cerrada = conPartida(datos, reto, fecha, {
    ...partida,
    resultados: partida.resultados.replaceAll('-', 'F')
  });
  return registrarFin(cerrada, reto, fecha, hoyISO);
}
