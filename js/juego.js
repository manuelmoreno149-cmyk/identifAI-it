// Reglas del juego y máquina de estados (funciones puras).
import { desofuscar } from './diario.js';

export const MODOS = { facil: 7000, medio: 3000, dificil: 1000 };
export const MODO_POR_DEFECTO = 'medio';
export const VOTOS = { autentica: 0, generada: 1 };

const ESTADOS_CODIGO = { A: 'acierto', F: 'fallo', T: 'tiempo', O: 'oculta' };

export function corregir(voto, verdad) {
  return VOTOS[voto] === verdad ? 'A' : 'F';
}

export function contarAciertos(resultados) {
  return [...resultados].filter((c) => c === 'A').length;
}

export function estadoDeCodigo(codigo) {
  return ESTADOS_CODIGO[codigo] ?? null;
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

export function estadoInicial({ modo = MODO_POR_DEFECTO, vistoComoJugar = false } = {}) {
  return {
    pantalla: 'iniciando',
    fase: null,
    modo: modo in MODOS ? modo : MODO_POR_DEFECTO,
    fecha: null,
    n: null,
    pruebas: [],
    clave: null,
    indice: 0,
    resultados: '-----',
    activo: false,
    revelada: null,
    volverA: 'portada',
    vistoComoJugar: Boolean(vistoComoJugar),
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
    revelada: desofuscar(estado.clave, estado.n, estado.indice)
  };
}

export function transicion(estado, evento) {
  const { pantalla, fase } = estado;
  switch (evento.tipo) {
    case 'CARGADO': {
      if (pantalla !== 'iniciando') return estado;
      const base = { ...estado, error: null, fase: null, activo: false, revelada: null };
      if (evento.caso) {
        base.n = evento.caso.n;
        base.pruebas = evento.caso.pruebas;
        base.clave = evento.caso.clave;
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
      if (pantalla !== 'portada' || !(evento.modo in MODOS) || evento.modo === estado.modo) return estado;
      return { ...estado, modo: evento.modo };
    case 'VER_COMO_JUGAR':
      return pantalla === 'portada' ? { ...estado, pantalla: 'como-jugar', volverA: 'portada' } : estado;
    case 'EMPEZAR':
      if (pantalla !== 'portada') return estado;
      return estado.vistoComoJugar
        ? { ...estado, pantalla: 'cargando' }
        : { ...estado, pantalla: 'como-jugar', volverA: 'cargando' };
    case 'ENTENDIDO':
      return pantalla === 'como-jugar'
        ? { ...estado, pantalla: estado.volverA, vistoComoJugar: true }
        : estado;
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
        revelada: null
      };
    case 'PINTADA':
      if (pantalla !== 'caso' || fase !== 'pregunta' || estado.activo) return estado;
      return { ...estado, activo: true };
    case 'VOTO': {
      if (pantalla !== 'caso' || fase !== 'pregunta' || !estado.activo) return estado;
      if (!(evento.voto in VOTOS)) return estado;
      const verdad = desofuscar(estado.clave, estado.n, estado.indice);
      return resolverPrueba(estado, corregir(evento.voto, verdad));
    }
    case 'AGOTADO':
      return pantalla === 'caso' && fase === 'pregunta' ? resolverPrueba(estado, 'T') : estado;
    case 'OCULTA':
      return pantalla === 'caso' && fase === 'pregunta' ? resolverPrueba(estado, 'O') : estado;
    case 'SIGUIENTE':
      if (pantalla !== 'caso' || fase !== 'veredicto') return estado;
      if (estado.indice < 4) {
        return { ...estado, fase: 'pregunta', indice: estado.indice + 1, revelada: null, activo: false };
      }
      return { ...estado, pantalla: 'resultado', fase: null, revelada: null, activo: false };
    case 'OTRA_PESTANA':
      if (pantalla !== 'cuenta-atras' && pantalla !== 'caso') return estado;
      return { ...estado, pantalla: 'ya-jugado', fase: null, activo: false, revelada: null };
    case 'MEDIANOCHE':
      if (pantalla !== 'ya-jugado' && pantalla !== 'sin-casos' && pantalla !== 'portada') return estado;
      return {
        ...estado,
        pantalla: 'iniciando',
        fase: null,
        activo: false,
        revelada: null,
        indice: 0,
        resultados: '-----',
        fecha: null
      };
    default:
      return estado;
  }
}
