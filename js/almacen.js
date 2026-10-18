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

export function registrarPrueba(datos, fecha, indice, codigo) {
  const partida = partidaDe(datos, fecha);
  if (!partida) return datos;
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

export function registrarFin(datos, fecha, hoyISO) {
  const partida = partidaDe(datos, fecha);
  if (!partida) return datos;
  const partidas = {
    ...datos.partidas,
    [fecha]: { ...partida, estado: 'terminada', aciertos: contar(partida.resultados) }
  };
  const racha = calcularRacha(partidas, hoyISO);
  return { ...datos, partidas, racha, mejorRacha: Math.max(datos.mejorRacha, racha) };
}

export function cerrarAbandonada(datos, fecha, hoyISO) {
  const partida = partidaDe(datos, fecha);
  if (!partida) return datos;
  const cerrada = {
    ...datos,
    partidas: { ...datos.partidas, [fecha]: { ...partida, resultados: partida.resultados.replaceAll('-', 'O') } }
  };
  return registrarFin(cerrada, fecha, hoyISO);
}
