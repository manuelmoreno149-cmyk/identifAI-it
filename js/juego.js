// Reglas del juego y máquina de estados (funciones puras).
import {
  desofuscar,
  desofuscarFicha,
  desofuscarAfirmacion,
  desofuscarAclaracion,
  idiomaValido,
  IDIOMA_POR_DEFECTO
} from './diario.js';

// Milisegundos de observación por prueba; null = sin límite [D-81].
export const MODOS = Object.freeze({ investigador: null, normal: 3000, perro: 1000 });
export const MODO_POR_DEFECTO = 'normal';
export const VOTOS = { autentica: 0, generada: 1 };

// Retos [D-98].
export const RETOS = Object.freeze(['imagenes', 'afirmaciones']);
export const RETO_POR_DEFECTO = 'imagenes';

// Teclas de voto por idioma y reto [D-122, D-156]. Congelada en profundidad.
export const TECLAS = Object.freeze({
  en: Object.freeze({
    imagenes: Object.freeze({ r: 'autentica', i: 'generada' }),
    afirmaciones: Object.freeze({ f: 'autentica', k: 'generada' })
  }),
  es: Object.freeze({
    imagenes: Object.freeze({ r: 'autentica', i: 'generada' }),
    afirmaciones: Object.freeze({ d: 'autentica', b: 'generada' })
  })
});

// Umbral de una ausencia en Fact or Fake [D-115].
export const OCULTA_MAX_MS = 3000;

const ESTADOS_CODIGO = { A: 'acierto', F: 'fallo' };

export function modoValido(modo) {
  return typeof modo === 'string' && Object.hasOwn(MODOS, modo);
}

export function retoValido(reto) {
  return typeof reto === 'string' && RETOS.includes(reto);
}

// Voto de una tecla en el reto y el idioma, o null [D-122, D-156].
export function votoDeTecla(reto, tecla, idioma = IDIOMA_POR_DEFECTO) {
  if (!idiomaValido(idioma) || !retoValido(reto) || typeof tecla !== 'string' || tecla.length !== 1) return null;
  const minuscula = tecla.toLowerCase();
  const tabla = TECLAS[idioma][reto];
  return Object.hasOwn(tabla, minuscula) ? tabla[minuscula] : null;
}

// Tecla en mayúscula de un voto en el reto y el idioma, o null.
export function teclaDeVoto(reto, voto, idioma = IDIOMA_POR_DEFECTO) {
  if (!idiomaValido(idioma) || !retoValido(reto) || typeof voto !== 'string') return null;
  const par = Object.entries(TECLAS[idioma][reto]).find(([, v]) => v === voto);
  return par ? par[0].toUpperCase() : null;
}

// Conjunto de mensajes finales del reto [D-134].
export function mensajesDelReto(reto, final) {
  if (!retoValido(reto) || final === null || typeof final !== 'object' || Array.isArray(final)) return null;
  return reto === 'afirmaciones' ? final.mensajes_afirmaciones : final.mensajes;
}

export function ocultacionEsFallo(ocultoMs) {
  return typeof ocultoMs === 'number' && ocultoMs > OCULTA_MAX_MS;
}

function intervalo(fin, inicio) {
  if (typeof fin !== 'number' || typeof inicio !== 'number') return 0;
  const d = fin - inicio;
  return Number.isFinite(d) ? d : 0;
}

// inicio y fin: {perf, fecha}. Nunca lanza y nunca es negativo [D-115].
export function medirOculta(inicio, fin) {
  try {
    return Math.max(0, intervalo(fin?.perf, inicio?.perf), intervalo(fin?.fecha, inicio?.fecha));
  } catch {
    return 0;
  }
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

// Voto que dijo el jugador (0 = autentica/fact, 1 = generada/fake) a partir de la verdad y el código A/F.
// Un fallo (incluida la ausencia) es el voto contrario a la verdad. Sin dato válido: null.
export function votoDicho(verdad, codigo) {
  if (verdad !== 0 && verdad !== 1) return null;
  const estado = estadoDeCodigo(codigo);
  if (estado === 'acierto') return verdad;
  if (estado === 'fallo') return 1 - verdad;
  return null;
}

// Etiqueta de la pantalla de resultado: partes unidas con " · ", saltando las vacías.
export function etiquetaResultado(partes) {
  return partes.filter((p) => typeof p === 'string' && p.trim() !== '').join(' · ');
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

export function estadoInicial({ modo, reto, idioma } = {}) {
  return {
    pantalla: 'iniciando',
    fase: null,
    reto: retoValido(reto) ? reto : RETO_POR_DEFECTO,
    modo: modoValido(modo) ? modo : MODO_POR_DEFECTO,
    idioma: idiomaValido(idioma) ? idioma : IDIOMA_POR_DEFECTO,
    retos: {
      imagenes: { caso: null, jugado: false },
      afirmaciones: { caso: null, jugado: false }
    },
    fecha: null,
    n: null,
    tema: null,
    pruebas: [],
    textos: null,
    clave: null,
    fichas: null,
    indice: 0,
    resultados: '-----',
    activo: false,
    tapada: false,
    texto: null,
    revelada: null,
    ficha: null,
    motivo: null,
    error: null
  };
}

// Copia del caso del reto elegido (CARGADO, ABRIR_RETO, VOLVER_PORTADA). tema, textos y fichas son {en, es}.
function copiarCaso(retos, reto) {
  const caso = retos[reto].caso;
  const imagenes = reto === 'imagenes';
  if (!caso) {
    return { n: null, tema: null, pruebas: imagenes ? [] : null, textos: null, clave: null, fichas: null };
  }
  return {
    n: caso.n,
    tema: caso.tema,
    pruebas: imagenes ? caso.pruebas : null,
    textos: imagenes ? null : (caso.textos ?? null),
    clave: caso.clave,
    fichas: caso.fichas ?? null
  };
}

function normalizarRetos(retos) {
  const uno = (r) => ({ caso: r?.caso ?? null, jugado: r?.jugado === true });
  return { imagenes: uno(retos?.imagenes), afirmaciones: uno(retos?.afirmaciones) };
}

const LIMPIO = { fase: null, activo: false, tapada: false, texto: null, revelada: null, ficha: null, motivo: null };

function ponerCodigo(resultados, indice, codigo) {
  return resultados.slice(0, indice) + codigo + resultados.slice(indice + 1);
}

// Afirmación del índice en el idioma del estado; null si falta el idioma o el bloque (nunca lanza).
function textoDe(estado, indice) {
  const bloque = estado.textos?.[estado.idioma]?.[indice];
  return desofuscarAfirmacion(bloque, estado.clave, estado.n, indice, estado.idioma);
}

function resolverPrueba(estado, codigo, motivo = null) {
  const i = estado.indice;
  const bloque = estado.fichas?.[estado.idioma]?.[i];
  const ficha =
    estado.reto === 'afirmaciones'
      ? desofuscarAclaracion(bloque, estado.clave, estado.n, i, estado.idioma)
      : desofuscarFicha(bloque, estado.clave, estado.n, i, estado.idioma);
  return {
    ...estado,
    fase: 'veredicto',
    resultados: ponerCodigo(estado.resultados, i, codigo),
    activo: false,
    tapada: false,
    revelada: desofuscar(estado.clave, estado.n, i),
    ficha,
    motivo
  };
}

export function transicion(estado, evento) {
  const { pantalla, fase } = estado;
  switch (evento?.tipo) {
    case 'CARGADO': {
      if (pantalla !== 'iniciando') return estado;
      const retos = normalizarRetos(evento.retos);
      const base = { ...estado, ...LIMPIO, retos, error: null };
      if (!retos.imagenes.caso && !retos.afirmaciones.caso) {
        return { ...base, ...copiarCaso(retos, estado.reto), pantalla: 'sin-casos' };
      }
      let reto = retoValido(evento.reto) ? evento.reto : estado.reto;
      if (!retos[reto].caso) reto = reto === 'imagenes' ? 'afirmaciones' : 'imagenes';
      return { ...base, ...copiarCaso(retos, reto), reto, pantalla: 'portada', resultados: '-----', indice: 0 };
    }
    case 'ERROR_CALENDARIO':
      return pantalla === 'iniciando' ? { ...estado, pantalla: 'error', error: 'calendario' } : estado;
    case 'ABRIR_RETO': {
      // Portada -> instrucciones (o ya-jugado si el intento está gastado). No gasta el intento [D-153].
      if (pantalla !== 'portada' || !retoValido(evento.reto) || !estado.retos[evento.reto].caso) return estado;
      const base = { ...estado, ...LIMPIO, ...copiarCaso(estado.retos, evento.reto), reto: evento.reto, fecha: null };
      if (estado.retos[evento.reto].jugado) return { ...base, pantalla: 'ya-jugado' };
      return { ...base, pantalla: 'instrucciones', indice: 0, resultados: '-----' };
    }
    case 'CAMBIAR_IDIOMA':
      if ((pantalla !== 'portada' && pantalla !== 'instrucciones') || !idiomaValido(evento.idioma)) return estado;
      return evento.idioma === estado.idioma ? estado : { ...estado, idioma: evento.idioma };
    case 'ELEGIR_MODO':
      if (pantalla !== 'instrucciones' || estado.reto !== 'imagenes') return estado;
      if (!modoValido(evento.modo) || evento.modo === estado.modo) return estado;
      return { ...estado, modo: evento.modo };
    case 'EMPEZAR': {
      if (pantalla !== 'instrucciones') return estado;
      const { caso, jugado } = estado.retos[estado.reto];
      if (!caso) return estado;
      if (jugado) return { ...estado, ...LIMPIO, pantalla: 'ya-jugado' };
      if (estado.reto === 'imagenes') return { ...estado, pantalla: 'cargando' };
      // Fact or Fake: sin modos ni cuenta atrás; main.js guarda la partida en_curso antes de pintar [D-100].
      return {
        ...estado,
        ...LIMPIO,
        pantalla: 'caso',
        fase: 'pregunta',
        fecha: evento.fecha ?? null,
        indice: 0,
        resultados: '-----',
        texto: textoDe(estado, 0)
      };
    }
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
        ...LIMPIO,
        pantalla: 'caso',
        fase: 'pregunta',
        fecha: evento.fecha,
        indice: 0,
        resultados: '-----'
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
      // Solo Images. Sella la prueba: no cambia de fase, no corrige y no descifra nada [D-77].
      if (estado.reto !== 'imagenes') return estado;
      if (pantalla !== 'caso' || fase !== 'pregunta' || !estado.activo || estado.tapada) return estado;
      if (MODOS[estado.modo] === null) return estado;
      return { ...estado, tapada: true };
    case 'VOLVIO':
      // Solo Fact or Fake: una ausencia de más de OCULTA_MAX_MS es fallo [D-101, D-115].
      if (estado.reto !== 'afirmaciones' || pantalla !== 'caso' || fase !== 'pregunta' || !estado.activo) return estado;
      if (evento.indice !== estado.indice || !ocultacionEsFallo(evento.ocultoMs)) return estado;
      return resolverPrueba(estado, 'F', 'oculta');
    case 'SIGUIENTE':
      if (pantalla !== 'caso' || fase !== 'veredicto') return estado;
      if (estado.indice < 4) {
        const indice = estado.indice + 1;
        return {
          ...estado,
          fase: 'pregunta',
          indice,
          revelada: null,
          ficha: null,
          motivo: null,
          activo: false,
          tapada: false,
          texto: estado.reto === 'afirmaciones' ? textoDe(estado, indice) : null
        };
      }
      return {
        ...estado,
        ...LIMPIO,
        pantalla: 'resultado',
        retos: { ...estado.retos, [estado.reto]: { ...estado.retos[estado.reto], jugado: true } }
      };
    case 'VOLVER_PORTADA':
      if (pantalla !== 'instrucciones' && pantalla !== 'resultado' && pantalla !== 'ya-jugado') return estado;
      return {
        ...estado,
        ...LIMPIO,
        ...copiarCaso(estado.retos, estado.reto),
        pantalla: 'portada',
        fecha: null,
        indice: 0,
        resultados: '-----'
      };
    case 'OTRA_PESTANA': {
      if (['iniciando', 'error', 'sin-casos'].includes(pantalla) || !retoValido(evento.reto)) return estado;
      const retos = estado.retos[evento.reto].jugado
        ? estado.retos
        : { ...estado.retos, [evento.reto]: { ...estado.retos[evento.reto], jugado: true } };
      if (evento.reto === estado.reto && ['instrucciones', 'cuenta-atras', 'caso'].includes(pantalla)) {
        return { ...estado, ...LIMPIO, retos, pantalla: 'ya-jugado' };
      }
      return retos === estado.retos ? estado : { ...estado, retos };
    }
    case 'MEDIANOCHE':
      if (!['portada', 'instrucciones', 'ya-jugado', 'sin-casos'].includes(pantalla)) return estado;
      return { ...estado, ...LIMPIO, pantalla: 'iniciando', indice: 0, resultados: '-----', fecha: null };
    default:
      return estado;
  }
}
