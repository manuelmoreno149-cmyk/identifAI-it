// Almacenamiento local con clave versionada. Ninguna función lanza.
import { sumarDias } from './diario.js';

export const CLAVE = 'identifaiit.v1';
const CLAVE_PRUEBA = 'identifaiit.prueba';

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

export function datosIniciales() {
  return {
    version: 1,
    ajustes: { modo: 'medio', vistoComoJugar: false },
    partidas: {},
    racha: 0,
    mejorRacha: 0
  };
}

function esObjeto(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

function normalizar(crudo) {
  if (!esObjeto(crudo) || crudo.version !== 1 || !esObjeto(crudo.partidas)) return datosIniciales();
  const base = datosIniciales();
  return {
    version: 1,
    ajustes: { ...base.ajustes, ...(esObjeto(crudo.ajustes) ? crudo.ajustes : {}) },
    partidas: crudo.partidas,
    racha: Number.isInteger(crudo.racha) ? crudo.racha : 0,
    mejorRacha: Number.isInteger(crudo.mejorRacha) ? crudo.mejorRacha : 0
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
    if (!esObjeto(crudo) || crudo.version !== 1 || !esObjeto(crudo.partidas)) return null;
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

export function partidaDe(datos, fechaISO) {
  return datos.partidas[fechaISO] ?? null;
}

export function conAjustes(datos, cambios) {
  return { ...datos, ajustes: { ...datos.ajustes, ...cambios } };
}

export function registrarInicio(datos, { fecha, n, modo, sesion }) {
  if (partidaDe(datos, fecha)) return datos;
  return {
    ...datos,
    partidas: {
      ...datos.partidas,
      [fecha]: { n, modo, estado: 'en_curso', resultados: '-----', aciertos: 0, sesion }
    }
  };
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

export function registrarPrueba(datos, fecha, indice, codigo, sesion) {
  const partida = partidaDe(datos, fecha);
  if (!editable(partida, sesion)) return datos;
  const resultados = partida.resultados.slice(0, indice) + codigo + partida.resultados.slice(indice + 1);
  return {
    ...datos,
    partidas: { ...datos.partidas, [fecha]: { ...partida, resultados, aciertos: contar(resultados) } }
  };
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
export function registrarFin(datos, fecha, hoyISO, sesion) {
  const partida = partidaDe(datos, fecha);
  if (!editable(partida, sesion)) return datos;
  const partidas = {
    ...datos.partidas,
    [fecha]: { ...partida, estado: 'terminada', aciertos: contar(partida.resultados) }
  };
  const racha = calcularRacha(partidas, hoyISO);
  return { ...datos, partidas, racha, mejorRacha: Math.max(datos.mejorRacha, racha) };
}

export function cerrarAbandonada(datos, fecha, hoyISO) {
  const partida = partidaDe(datos, fecha);
  if (!editable(partida)) return datos;
  const cerrada = {
    ...datos,
    partidas: { ...datos.partidas, [fecha]: { ...partida, resultados: partida.resultados.replaceAll('-', 'O') } }
  };
  return registrarFin(cerrada, fecha, hoyISO);
}
