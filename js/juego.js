// Reglas del juego y máquina de estados (funciones puras).
import { desofuscar, desofuscarFicha } from './diario.js';

// Milisegundos de observación por prueba; null = sin límite [D-81].
export const MODOS = Object.freeze({ investigador: null, normal: 3000, perro: 1000 });
export const MODO_POR_DEFECTO = 'normal';
export const VOTOS = { autentica: 0, generada: 1 };

const ESTADOS_CODIGO = { A: 'acierto', F: 'fallo' };

export function modoValido(modo) {
  return typeof modo === 'string' && Object.hasOwn(MODOS, modo);
}

export function corregir(voto, verdad) {
  return VOTOS[voto] === verdad ? 'A' : 'F';
}

export function contarAciertos(resultados) {
  return [...resultados].filter((c) => c === 'A').length;
}

export function estadoDeCodigo(codigo) {
  return typeof codigo === 'string' && Object.hasOwn(ESTADOS_CODIGO, codigo) ? ESTADOS_CODIGO[codigo] : null;
}

export function elegirVariante(lista, aleatorio = Math.random) {
  return lista[Math.floor(aleatorio() * lista.length)];
}

export function mensajeFinal(aciertos, mensajes) {
  if (!Number.isInteger(aciertos) || aciertos < 0 || aciertos > 5) {
    throw new RangeError(`Aciertos fuera de rango: ${aciertos}`);
  }
  return mensajes[aciertos];
}

// Recorta la confesión mostrada en el veredicto sin partir puntos de código [D-88].
export function recortarFicha(texto, max = 90) {
  if (typeof texto !== 'string') return { texto: '', recortada: false };
  const limpio = texto.replace(/\s+/gu, ' ').trim();
  const puntos = [...limpio];
  if (puntos.length <= max) return { texto: limpio, recortada: false };
  let corte = puntos.slice(0, max - 1);
  const ultimoEspacio = corte.lastIndexOf(' ');
  if (ultimoEspacio > 0) corte = corte.slice(0, ultimoEspacio);
  return { texto: corte.join('').trimEnd() + '…', recortada: true };
}

export function estadoInicial({ modo } = {}) {
  return {
    pantalla: 'iniciando',
    fase: null,
    modo: modoValido(modo) ? modo : MODO_POR_DEFECTO,
    fecha: null,
    n: null,
    tema: null,
    pruebas: [],
    clave: null,
    fichas: null,
    indice: 0,
    resultados: '-----',
    activo: false,
    tapada: false,
    revelada: null,
    ficha: null,
    error: null
  };
}

function ponerCodigo(resultados, indice, codigo) {
  return resultados.slice(0, indice) + codigo + resultados.slice(indice + 1);
}

function resolverPrueba(estado, codigo) {
  return {
    ...estado,
    fase: 'veredicto',
    resultados: ponerCodigo(estado.resultados, estado.indice, codigo),
    activo: false,
    tapada: false,
    revelada: desofuscar(estado.clave, estado.n, estado.indice),
    ficha: Array.isArray(estado.fichas)
      ? desofuscarFicha(estado.fichas[estado.indice], estado.clave, estado.n, estado.indice)
      : null
  };
}

export function transicion(estado, evento) {
  const { pantalla, fase } = estado;
  switch (evento.tipo) {
    case 'CARGADO': {
      if (pantalla !== 'iniciando') return estado;
      const base = { ...estado, error: null, fase: null, activo: false, tapada: false, revelada: null, ficha: null };
      if (evento.caso) {
        base.n = evento.caso.n;
        base.tema = evento.caso.tema;
        base.pruebas = evento.caso.pruebas;
        base.clave = evento.caso.clave;
        base.fichas = evento.caso.fichas ?? null;
      }
      if (evento.partidaHoy && evento.partidaHoy.estado === 'terminada') {
        return { ...base, pantalla: 'ya-jugado' };
      }
      if (!evento.caso) return { ...base, pantalla: 'sin-casos' };
      return { ...base, pantalla: 'portada', resultados: '-----', indice: 0 };
    }
    case 'ERROR_CALENDARIO':
      return pantalla === 'iniciando' ? { ...estado, pantalla: 'error', error: 'calendario' } : estado;
    case 'ELEGIR_MODO':
      if (pantalla !== 'portada' || !modoValido(evento.modo) || evento.modo === estado.modo) return estado;
      return { ...estado, modo: evento.modo };
    case 'EMPEZAR':
      return pantalla === 'portada' ? { ...estado, pantalla: 'cargando' } : estado;
    case 'PRECARGA_OK':
      return pantalla === 'cargando' ? { ...estado, pantalla: 'cuenta-atras' } : estado;
    case 'PRECARGA_ERROR':
      return pantalla === 'cargando' ? { ...estado, pantalla: 'error', error: 'imagenes' } : estado;
    case 'REINTENTAR':
      if (pantalla !== 'error') return estado;
      if (estado.error === 'imagenes') return { ...estado, pantalla: 'cargando', error: null };
      if (estado.error === 'calendario') return { ...estado, pantalla: 'iniciando', error: null };
      return estado;
    case 'FIN_CUENTA':
      if (pantalla !== 'cuenta-atras') return estado;
      return {
        ...estado,
        pantalla: 'caso',
        fase: 'pregunta',
        fecha: evento.fecha,
        indice: 0,
        resultados: '-----',
        activo: false,
        tapada: false,
        revelada: null,
        ficha: null
      };
    case 'PINTADA':
      if (pantalla !== 'caso' || fase !== 'pregunta' || estado.activo) return estado;
      return { ...estado, activo: true };
    case 'VOTO': {
      if (pantalla !== 'caso' || fase !== 'pregunta' || !estado.activo) return estado;
      if (typeof evento.voto !== 'string' || !Object.hasOwn(VOTOS, evento.voto)) return estado;
      const verdad = desofuscar(estado.clave, estado.n, estado.indice);
      return resolverPrueba(estado, corregir(evento.voto, verdad));
    }
    case 'AGOTADO':
      // Sella la prueba: no cambia de fase, no corrige y no descifra nada [D-77].
      if (pantalla !== 'caso' || fase !== 'pregunta' || !estado.activo || estado.tapada) return estado;
      if (MODOS[estado.modo] === null) return estado;
      return { ...estado, tapada: true };
    case 'SIGUIENTE':
      if (pantalla !== 'caso' || fase !== 'veredicto') return estado;
      if (estado.indice < 4) {
        return {
          ...estado,
          fase: 'pregunta',
          indice: estado.indice + 1,
          revelada: null,
          ficha: null,
          activo: false,
          tapada: false
        };
      }
      return { ...estado, pantalla: 'resultado', fase: null, revelada: null, ficha: null, activo: false, tapada: false };
    case 'OTRA_PESTANA':
      if (!['cuenta-atras', 'caso', 'portada'].includes(pantalla)) return estado;
      return { ...estado, pantalla: 'ya-jugado', fase: null, activo: false, tapada: false, revelada: null, ficha: null };
    case 'MEDIANOCHE':
      if (pantalla !== 'ya-jugado' && pantalla !== 'sin-casos' && pantalla !== 'portada') return estado;
      return {
        ...estado,
        pantalla: 'iniciando',
        fase: null,
        activo: false,
        tapada: false,
        revelada: null,
        ficha: null,
        indice: 0,
        resultados: '-----',
        fecha: null
      };
    default:
      return estado;
  }
}
