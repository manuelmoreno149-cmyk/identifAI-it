import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MODOS,
  MODO_POR_DEFECTO,
  VOTOS,
  modoValido,
  corregir,
  contarAciertos,
  estadoDeCodigo,
  votoDicho,
  etiquetaResultado,
  elegirVariante,
  mensajeFinal,
  recortarFicha,
  estadoInicial,
  transicion,
  RETOS,
  RETO_POR_DEFECTO,
  retoValido,
  OCULTA_MAX_MS,
  ocultacionEsFallo,
  medirOculta,
  TECLAS,
  votoDeTecla,
  teclaDeVoto,
  mensajesDelReto
} from '../js/juego.js';
import { ofuscar, ofuscarFicha, ofuscarAfirmacion, ofuscarAclaracion } from '../js/diario.js';

const VERDADES = [0, 1, 1, 0, 1];
const CLAVE = ofuscar(VERDADES, 3, () => 0.3);
const TEXTOS_FICHA = {
  en: ['Real photograph', 'An astronaut dog', 'A cat in the fog', 'Real photograph', 'ñandú 🐕'],
  es: ['Fotografía real', 'Un perro astronauta', 'Un gato en la niebla', 'Fotografía real', 'ñandú 🐶']
};
const FICHAS = Object.fromEntries(
  ['en', 'es'].map((l) => [l, TEXTOS_FICHA[l].map((t, i) => ofuscarFicha(t, CLAVE, 3, i, () => 0.25, l))])
);
const CASO = {
  n: 3,
  fecha: '2026-11-03',
  tema: { en: 'Dogs', es: 'Perros' },
  pruebas: ['a1', 'b2', 'c3', 'd4', 'e5'],
  clave: CLAVE,
  fichas: FICHAS
};

// Fact or Fake
const VERDADES_T = [1, 0, 0, 1, 0];
const CLAVE_T = ofuscar(VERDADES_T, 7, () => 0.6);
const TEXTOS_T = {
  en: [0, 1, 2, 3, 4].map((i) => 'Claim ' + i),
  es: [0, 1, 2, 3, 4].map((i) => 'Afirmación ñ ' + i)
};
const ACLARACION = (l, i) => ({
  aclaracion: (l === 'es' ? 'Verdad ' : 'Truth ') + i,
  detalles: i % 2 === 0 ? [(l === 'es' ? 'Detalle ñ ' : 'Detail ') + i, 'Otro ' + i] : []
});
const FICHAS_T = Object.fromEntries(
  ['en', 'es'].map((l) => [l, [0, 1, 2, 3, 4].map((i) => ofuscarAclaracion(ACLARACION(l, i), CLAVE_T, 7, i, () => 0.4, l))])
);
const CASO_T = {
  n: 7,
  fecha: '2026-12-07',
  tema: { en: 'Markets', es: 'Mercados' },
  clave: CLAVE_T,
  textos: Object.fromEntries(
    ['en', 'es'].map((l) => [l, TEXTOS_T[l].map((t, i) => ofuscarAfirmacion(t, CLAVE_T, 7, i, () => 0.2, l))])
  ),
  fichas: FICHAS_T
};

function cargado(caso = CASO, { afirmaciones = CASO_T, reto, jugados = {} } = {}) {
  return {
    tipo: 'CARGADO',
    reto,
    retos: {
      imagenes: { caso, jugado: jugados.imagenes === true },
      afirmaciones: { caso: afirmaciones, jugado: jugados.afirmaciones === true }
    }
  };
}

const abrir = (reto) => ({ tipo: 'ABRIR_RETO', reto });

// Portada con los dos casos cargados.
function portada(opciones = {}, carga = {}) {
  return ir(estadoInicial(opciones), cargado(CASO, carga));
}

function enInstrucciones(reto = 'imagenes', opciones = {}) {
  return ir(portada(opciones), abrir(reto));
}

function enAfirmaciones(indice = 0, idioma = 'en') {
  let e = ir(enInstrucciones('afirmaciones', { idioma }), { tipo: 'EMPEZAR', fecha: CASO_T.fecha });
  for (let i = 0; i < indice; i++) e = ir(e, 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }, 'SIGUIENTE');
  return e;
}

function congelar(o) {
  Object.freeze(o);
  for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) congelar(v);
  return o;
}

function ir(estado, ...eventos) {
  return eventos.reduce((e, ev) => transicion(e, typeof ev === 'string' ? { tipo: ev } : ev), estado);
}

function enPregunta(indice = 0, modo = 'normal', caso = CASO, idioma = 'en') {
  let e = estadoInicial({ modo, idioma });
  e = ir(e, cargado(caso), abrir('imagenes'), 'EMPEZAR');
  e = ir(e, 'PRECARGA_OK', { tipo: 'FIN_CUENTA', fecha: CASO.fecha });
  for (let i = 0; i < indice; i++) {
    e = ir(e, 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }, 'SIGUIENTE');
  }
  return e;
}

test('141. constantes y modos', () => {
  assert.deepEqual(MODOS, { investigador: null, normal: 3000, perro: 1000 });
  assert.equal(Object.isFrozen(MODOS), true);
  assert.equal(MODO_POR_DEFECTO, 'normal');
  assert.deepEqual(VOTOS, { autentica: 0, generada: 1 });
  assert.equal(modoValido('perro'), true);
  assert.equal(modoValido('investigador'), true);
  for (const malo of ['medio', 'facil', 'dificil', 'toString', '__proto__', undefined, null, 3]) {
    assert.equal(modoValido(malo), false, String(malo));
  }
  assert.equal(estadoInicial({ modo: 'facil' }).modo, 'normal');
  assert.equal(estadoInicial({}).modo, 'normal');
  assert.equal(estadoInicial().modo, 'normal');
  assert.equal(estadoInicial({ modo: 'perro' }).modo, 'perro');
  // El modo se elige solo en instrucciones de Images.
  const ins = enInstrucciones();
  assert.equal(transicion(ins, { tipo: 'ELEGIR_MODO', modo: 'dificil' }), ins);
  assert.equal(transicion(ins, { tipo: 'ELEGIR_MODO', modo: 'toString' }), ins);
  assert.equal(transicion(ins, { tipo: 'ELEGIR_MODO', modo: 'normal' }), ins, 'el mismo modo no cambia nada');
  assert.equal(ir(ins, { tipo: 'ELEGIR_MODO', modo: 'investigador' }).modo, 'investigador');
  assert.equal(ir(ins, { tipo: 'ELEGIR_MODO', modo: 'investigador' }).pantalla, 'instrucciones');
  const p = portada();
  assert.equal(transicion(p, { tipo: 'ELEGIR_MODO', modo: 'perro' }), p, 'no en portada');
  const insAfirm = enInstrucciones('afirmaciones');
  assert.equal(transicion(insAfirm, { tipo: 'ELEGIR_MODO', modo: 'perro' }), insAfirm, 'no en Fact or Fake');
  const caso = enPregunta();
  assert.equal(transicion(caso, { tipo: 'ELEGIR_MODO', modo: 'perro' }), caso);
});

test('estado inicial: campos de la 1.3 y el idioma', () => {
  const e = estadoInicial({});
  assert.equal(e.pantalla, 'iniciando');
  assert.equal(e.tema, null);
  assert.equal(e.fichas, null);
  assert.equal(e.tapada, false);
  assert.equal(e.ficha, null);
  assert.equal(e.idioma, 'en');
  assert.equal('volverA' in e, false);
  assert.equal('vistoComoJugar' in e, false);
  assert.equal(estadoInicial({ idioma: 'es' }).idioma, 'es');
  for (const malo of ['fr', 'ES', undefined, null, 5]) assert.equal(estadoInicial({ idioma: malo }).idioma, 'en', String(malo));
});

test('11. transicion no muta el estado (estado y evento congelados)', () => {
  const eventos = [
    cargado(),
    { tipo: 'ELEGIR_MODO', modo: 'perro' },
    { tipo: 'EMPEZAR' },
    { tipo: 'PINTADA' },
    { tipo: 'VOTO', voto: 'generada' },
    { tipo: 'AGOTADO' },
    { tipo: 'OCULTA' },
    { tipo: 'SIGUIENTE' },
    { tipo: 'MEDIANOCHE' },
    { tipo: 'OTRA_PESTANA', reto: 'imagenes' },
    { tipo: 'ABRIR_RETO', reto: 'afirmaciones' },
    { tipo: 'CAMBIAR_IDIOMA', idioma: 'es' },
    { tipo: 'ELEGIR_RETO', reto: 'afirmaciones' },
    { tipo: 'VOLVER_PORTADA' },
    { tipo: 'VOLVIO', ocultoMs: 9000, indice: 0 }
  ];
  const estados = [
    estadoInicial({}),
    portada(),
    enInstrucciones(),
    enInstrucciones('afirmaciones'),
    enPregunta(),
    ir(enPregunta(), 'PINTADA'),
    ir(enPregunta(), 'PINTADA', 'AGOTADO'),
    ir(enPregunta(), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }),
    enAfirmaciones(),
    ir(enAfirmaciones(), 'PINTADA'),
    ir(enAfirmaciones(), 'PINTADA', { tipo: 'VOTO', voto: 'generada' })
  ];
  for (const e of estados) {
    const copia = JSON.stringify(e);
    congelar(e);
    for (const ev of eventos) {
      transicion(e, congelar({ ...ev }));
      assert.equal(JSON.stringify(e), copia);
    }
  }
});

test('12. EMPEZAR solo existe en instrucciones; nunca desde la portada', () => {
  const p = portada();
  assert.equal(p.pantalla, 'portada');
  assert.equal(transicion(p, { tipo: 'EMPEZAR', fecha: '2026-11-03' }), p);
  assert.equal(transicion(p, { tipo: 'VER_COMO_JUGAR' }), p);
  assert.equal(transicion(p, { tipo: 'ENTENDIDO' }), p);
  assert.equal(ir(enInstrucciones(), 'EMPEZAR').pantalla, 'cargando');
  const cargando = ir(enInstrucciones(), 'EMPEZAR');
  assert.equal(transicion(cargando, { tipo: 'EMPEZAR' }), cargando);
});

test('13. VOTO con activo false devuelve el mismo objeto', () => {
  const e = enPregunta();
  assert.equal(e.activo, false);
  assert.equal(transicion(e, { tipo: 'VOTO', voto: 'autentica' }), e);
});

test('14. VOTO corrige, revela la verdad y descifra la ficha, con tapada o sin ella', () => {
  for (let i = 0; i < 5; i++) {
    const base = ir(enPregunta(i), 'PINTADA');
    assert.equal(base.activo, true);
    const bien = VERDADES[i] === 1 ? 'generada' : 'autentica';
    const mal = VERDADES[i] === 1 ? 'autentica' : 'generada';
    for (const tapada of [false, true]) {
      const origen = tapada ? transicion(base, { tipo: 'AGOTADO' }) : base;
      assert.equal(origen.tapada, tapada);
      const a = transicion(origen, { tipo: 'VOTO', voto: bien });
      const f = transicion(origen, { tipo: 'VOTO', voto: mal });
      assert.equal(a.resultados[i], 'A');
      assert.equal(f.resultados[i], 'F');
      for (const r of [a, f]) {
        assert.equal(r.fase, 'veredicto');
        assert.equal(r.revelada, VERDADES[i]);
        assert.equal(r.activo, false);
        assert.equal(r.tapada, false);
        assert.equal(r.ficha, TEXTOS_FICHA.en[i]);
      }
    }
  }
});

test('14. VOTO con fichas null deja ficha null; con ficha corrupta también', () => {
  const sin = ir(enPregunta(0, 'normal', { ...CASO, fichas: undefined }), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' });
  assert.equal(sin.fichas, null);
  assert.equal(sin.ficha, null);
  assert.equal(sin.fase, 'veredicto');
  const rota = ir(enPregunta(0, 'normal', { ...CASO, fichas: ['x', 'x', 'x', 'x', 'x'] }), 'PINTADA', {
    tipo: 'VOTO',
    voto: 'autentica'
  });
  assert.equal(rota.ficha, null);
  assert.equal(rota.fase, 'veredicto');
});

test('19. AGOTADO sella la prueba sin cambiar de fase ni corregir', () => {
  for (const modo of ['normal', 'perro']) {
    const base = ir(enPregunta(2, modo), 'PINTADA');
    const s = transicion(base, { tipo: 'AGOTADO' });
    assert.equal(s.tapada, true);
    assert.equal(s.fase, 'pregunta');
    assert.equal(s.activo, true);
    assert.equal(s.resultados, base.resultados);
    assert.equal(s.indice, base.indice);
    assert.equal(s.revelada, null);
    assert.equal(s.ficha, null);
    assert.equal(transicion(s, { tipo: 'AGOTADO' }), s);
  }
  // sin pintar
  const sinPintar = enPregunta();
  assert.equal(transicion(sinPintar, { tipo: 'AGOTADO' }), sinPintar);
  // investigador
  const inv = ir(enPregunta(0, 'investigador'), 'PINTADA');
  assert.equal(transicion(inv, { tipo: 'AGOTADO' }), inv);
  // otras pantallas
  const portada = ir(estadoInicial({}), cargado());
  assert.equal(transicion(portada, { tipo: 'AGOTADO' }), portada);
  const veredicto = ir(enPregunta(), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' });
  assert.equal(transicion(veredicto, { tipo: 'AGOTADO' }), veredicto);
  // tras sellar, el voto corrige normalmente
  const sellada = ir(enPregunta(), 'PINTADA', 'AGOTADO', { tipo: 'VOTO', voto: 'autentica' });
  assert.equal(sellada.resultados[0], 'A');
});

test('OCULTA no tiene efecto en ningún estado', () => {
  const estados = [
    estadoInicial({}),
    ir(estadoInicial({}), cargado()),
    enPregunta(),
    ir(enPregunta(), 'PINTADA'),
    ir(enPregunta(), 'PINTADA', 'AGOTADO'),
    ir(enPregunta(), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }),
    ir(enPregunta(4), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }, 'SIGUIENTE')
  ];
  for (const e of estados) assert.equal(transicion(e, { tipo: 'OCULTA' }), e);
});

test('15. un segundo VOTO o un AGOTADO en veredicto no cambian el estado', () => {
  const v = transicion(ir(enPregunta(), 'PINTADA'), { tipo: 'VOTO', voto: 'autentica' });
  assert.equal(transicion(v, { tipo: 'VOTO', voto: 'generada' }), v);
  assert.equal(transicion(v, { tipo: 'AGOTADO' }), v);
  assert.equal(transicion(v, { tipo: 'PINTADA' }), v);
});

test('16. SIGUIENTE avanza y en la prueba 5 lleva a resultado', () => {
  const e = ir(enPregunta(), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }, 'SIGUIENTE');
  assert.equal(e.pantalla, 'caso');
  assert.equal(e.fase, 'pregunta');
  assert.equal(e.indice, 1);
  assert.equal(e.revelada, null);
  assert.equal(e.ficha, null);
  assert.equal(e.activo, false);
  assert.equal(e.tapada, false);

  const sellado = ir(enPregunta(), 'PINTADA', 'AGOTADO', { tipo: 'VOTO', voto: 'autentica' }, 'SIGUIENTE');
  assert.equal(sellado.tapada, false);

  const u = ir(enPregunta(4), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }, 'SIGUIENTE');
  assert.equal(u.pantalla, 'resultado');
  assert.equal(u.fase, null);
  assert.equal(u.revelada, null);
  assert.equal(u.ficha, null);
  assert.equal(u.resultados.length, 5);
  assert.equal(u.resultados.includes('-'), false);
});

test('17. CARGADO: partida terminada, sin casos y portada con fichas', () => {
  for (const modo of ['investigador', 'normal', 'perro']) {
    const e = ir(estadoInicial({ modo }), cargado(CASO, { reto: 'imagenes', jugados: { imagenes: true } }));
    assert.equal(e.pantalla, 'portada');
    assert.equal(e.retos.imagenes.jugado, true);
    assert.equal(ir(e, abrir('imagenes')).pantalla, 'ya-jugado');
  }
  const sin = ir(estadoInicial({}), cargado(null, { afirmaciones: null }));
  assert.equal(sin.pantalla, 'sin-casos');
  assert.equal(sin.tema, null);
  const p = ir(estadoInicial({}), cargado());
  assert.equal(p.pantalla, 'portada');
  assert.equal(p.n, 3);
  assert.deepEqual(p.tema, { en: 'Dogs', es: 'Perros' });
  assert.deepEqual(p.pruebas, CASO.pruebas);
  assert.deepEqual(p.fichas, FICHAS);
  const jugada = enPregunta(2);
  assert.deepEqual(jugada.fichas, FICHAS);
  assert.deepEqual(ir(jugada, 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }, 'SIGUIENTE').fichas, FICHAS);
});

test('18. contarAciertos, mensajeFinal y utilidades', () => {
  assert.equal(contarAciertos('AFFAA'), 3);
  assert.equal(contarAciertos('-----'), 0);
  const mensajes = ['m0', 'm1', 'm2', 'm3', 'm4', 'm5'];
  for (let k = 0; k <= 5; k++) assert.equal(mensajeFinal(k, mensajes), mensajes[k]);
  assert.throws(() => mensajeFinal(6, mensajes));
  assert.throws(() => mensajeFinal(-1, mensajes));
  assert.equal(corregir('autentica', 0), 'A');
  assert.equal(corregir('generada', 0), 'F');
  assert.equal(corregir('generada', 1), 'A');
  assert.equal(estadoDeCodigo('A'), 'acierto');
  assert.equal(estadoDeCodigo('F'), 'fallo');
  for (const c of ['-', 'T', 'O', 'toString', undefined, null]) assert.equal(estadoDeCodigo(c), null, String(c));
  assert.equal(elegirVariante(['a', 'b', 'c'], () => 0.99), 'c');
  assert.equal(elegirVariante(['a', 'b', 'c'], () => 0), 'a');
});

test('errores, reintentos, otra pestaña y medianoche', () => {
  const e = ir(estadoInicial({}), 'ERROR_CALENDARIO');
  assert.equal(e.pantalla, 'error');
  assert.equal(e.error, 'calendario');
  assert.equal(ir(e, 'REINTENTAR').pantalla, 'iniciando');

  let c = ir(estadoInicial({}), cargado(), abrir('imagenes'), 'EMPEZAR', 'PRECARGA_ERROR');
  assert.equal(c.pantalla, 'error');
  assert.equal(c.error, 'imagenes');
  c = ir(c, 'REINTENTAR');
  assert.equal(c.pantalla, 'cargando');
  assert.equal(c.error, null);

  const sellada = ir(enPregunta(), 'PINTADA', 'AGOTADO', { tipo: 'OTRA_PESTANA', reto: 'imagenes' });
  assert.equal(sellada.pantalla, 'ya-jugado');
  assert.equal(sellada.tapada, false);
  assert.equal(sellada.ficha, null);
  const p = portada();
  // En portada, otra pestaña solo marca el reto como jugado (la tarjeta muestra el estado nuevo).
  const marcada = ir(p, { tipo: 'OTRA_PESTANA', reto: 'imagenes' });
  assert.equal(marcada.pantalla, 'portada');
  assert.equal(marcada.retos.imagenes.jugado, true);
  assert.equal(ir(enInstrucciones(), { tipo: 'OTRA_PESTANA', reto: 'imagenes' }).pantalla, 'ya-jugado');
  assert.equal(ir(p, 'MEDIANOCHE').pantalla, 'iniciando');
  assert.equal(ir(enPregunta(), 'MEDIANOCHE').pantalla, 'caso');
  assert.equal(transicion(p, { tipo: 'NO_EXISTE' }), p);
});

test('FIN_CUENTA fija la fecha y deja la prueba 1 sin activar ni tapar', () => {
  const e = enPregunta();
  assert.equal(e.pantalla, 'caso');
  assert.equal(e.fase, 'pregunta');
  assert.equal(e.fecha, '2026-11-03');
  assert.equal(e.indice, 0);
  assert.equal(e.activo, false);
  assert.equal(e.tapada, false);
  assert.equal(e.resultados, '-----');
});

test('140. recortarFicha', () => {
  assert.deepEqual(recortarFicha('Un perro en la playa'), { texto: 'Un perro en la playa', recortada: false });
  assert.deepEqual(recortarFicha('  a\n\nb  '), { texto: 'a b', recortada: false });

  const x = recortarFicha('x'.repeat(100));
  assert.equal(x.texto, 'x'.repeat(89) + '…');
  assert.equal([...x.texto].length, 90);
  assert.equal(x.recortada, true);

  const largo = recortarFicha('palabra '.repeat(15));
  assert.equal(largo.recortada, true);
  assert.ok(largo.texto.endsWith('…'));
  assert.ok([...largo.texto].length <= 90);
  assert.equal(largo.texto.endsWith(' …'), false);
  assert.equal(largo.texto, 'palabra '.repeat(10) + 'palabra…');

  const emojis = recortarFicha('🐕'.repeat(100));
  assert.equal(emojis.texto, '🐕'.repeat(89) + '…');
  assert.equal(emojis.recortada, true);

  assert.deepEqual(recortarFicha(null), { texto: '', recortada: false });
  assert.deepEqual(recortarFicha(undefined), { texto: '', recortada: false });
  assert.deepEqual(recortarFicha(5), { texto: '', recortada: false });

  const exacto = recortarFicha('y'.repeat(90));
  assert.equal(exacto.recortada, false);
  assert.equal(recortarFicha('y'.repeat(91)).recortada, true);
  assert.equal(recortarFicha('abcdefghij klmnopqrst', 10).texto, 'abcdefghij'.slice(0, 9) + '…');
});

// ---- Dos retos [D-98 a D-101, D-115] ----

const VOTO_BIEN = (i) => (VERDADES_T[i] === 1 ? 'generada' : 'autentica');

test('157. RETOS, retoValido y estadoInicial con reto', () => {
  assert.deepEqual([...RETOS], ['imagenes', 'afirmaciones']);
  assert.equal(Object.isFrozen(RETOS), true);
  assert.equal(RETO_POR_DEFECTO, 'imagenes');
  assert.equal(retoValido('afirmaciones'), true);
  assert.equal(retoValido('imagenes'), true);
  for (const malo of ['otro', 'toString', '__proto__', undefined, null, 1]) assert.equal(retoValido(malo), false);
  assert.equal(estadoInicial({ reto: 'x' }).reto, 'imagenes');
  assert.equal(estadoInicial({ reto: 'afirmaciones' }).reto, 'afirmaciones');
  const e = estadoInicial({});
  assert.equal(e.textos, null);
  assert.equal(e.texto, null);
  assert.equal(e.motivo, null);
  assert.deepEqual(e.retos, { imagenes: { caso: null, jugado: false }, afirmaciones: { caso: null, jugado: false } });
});

test('158. CARGADO elige reto y copia el caso', () => {
  const soloImagenes = ir(estadoInicial({}), cargado(CASO, { afirmaciones: null, reto: 'afirmaciones' }));
  assert.equal(soloImagenes.pantalla, 'portada');
  assert.equal(soloImagenes.reto, 'imagenes');
  const soloAfirmaciones = ir(estadoInicial({}), cargado(null, { reto: 'imagenes' }));
  assert.equal(soloAfirmaciones.reto, 'afirmaciones');
  assert.equal(soloAfirmaciones.pruebas, null);
  const ambos = ir(estadoInicial({}), cargado(CASO, { reto: 'afirmaciones' }));
  assert.equal(ambos.reto, 'afirmaciones');
  assert.equal(ambos.n, 7);
  assert.deepEqual(ambos.tema, { en: 'Markets', es: 'Mercados' });
  assert.equal(ambos.pruebas, null);
  assert.deepEqual(ambos.textos, CASO_T.textos);
  assert.deepEqual(ambos.fichas, FICHAS_T);
  // CARGADO conserva el idioma
  assert.equal(ir(estadoInicial({ idioma: 'es' }), cargado(CASO, { reto: 'afirmaciones' })).idioma, 'es');
  assert.equal(ambos.clave, CLAVE_T);
  const defecto = ir(estadoInicial({}), cargado(CASO));
  assert.equal(defecto.reto, 'imagenes');
  assert.equal(defecto.textos, null);
  assert.deepEqual(defecto.pruebas, CASO.pruebas);
  const nada = ir(estadoInicial({}), cargado(null, { afirmaciones: null }));
  assert.equal(nada.pantalla, 'sin-casos');
  const jugado = ir(estadoInicial({}), cargado(CASO, { reto: 'afirmaciones', jugados: { afirmaciones: true } }));
  assert.equal(jugado.pantalla, 'portada');
  assert.equal(jugado.retos.afirmaciones.jugado, true);
  assert.equal(jugado.retos.imagenes.jugado, false);
});

test('159. ABRIR_RETO lleva a instrucciones con el caso del reto, sin gastar el intento', () => {
  const p = portada();
  const t = transicion(p, abrir('afirmaciones'));
  assert.equal(t.pantalla, 'instrucciones');
  assert.equal(t.reto, 'afirmaciones');
  assert.equal(t.n, 7);
  assert.deepEqual(t.tema, { en: 'Markets', es: 'Mercados' });
  assert.equal(t.pruebas, null);
  assert.deepEqual(t.textos, CASO_T.textos);
  assert.deepEqual(t.fichas, FICHAS_T);
  assert.equal(t.clave, CLAVE_T);
  for (const k of ['fase', 'fecha', 'texto', 'revelada', 'ficha', 'motivo']) assert.equal(t[k], null, k);
  assert.equal(t.activo, false);
  assert.equal(t.retos.afirmaciones.jugado, false, 'ver las instrucciones no gasta el intento');
  const im = transicion(p, abrir('imagenes'));
  assert.equal(im.pantalla, 'instrucciones');
  assert.deepEqual(im.pruebas, CASO.pruebas);
  assert.equal(im.textos, null);
  assert.equal(im.n, 3);
  // reto no válido, evento fuera de portada
  assert.equal(transicion(p, abrir('otro')), p);
  assert.equal(transicion(p, abrir(undefined)), p);
  assert.equal(transicion(p, { tipo: 'ABRIR_RETO' }), p);
  assert.equal(transicion(t, abrir('imagenes')), t, 'solo desde portada');
  const caso = enPregunta();
  assert.equal(transicion(caso, abrir('afirmaciones')), caso);
  // reto sin caso: la tarjeta está disabled
  const sinAfirm = ir(estadoInicial({}), cargado(CASO, { afirmaciones: null }));
  assert.equal(transicion(sinAfirm, abrir('afirmaciones')), sinAfirm);
  // reto jugado: va directo a ya-jugado con su caso
  const jugado = portada({}, { jugados: { afirmaciones: true } });
  const yj = transicion(jugado, abrir('afirmaciones'));
  assert.equal(yj.pantalla, 'ya-jugado');
  assert.equal(yj.reto, 'afirmaciones');
  assert.equal(yj.n, 7);
  // ELEGIR_RETO ya no existe
  assert.equal(transicion(p, { tipo: 'ELEGIR_RETO', reto: 'afirmaciones' }), p);
});

test('CAMBIAR_IDIOMA: solo en portada e instrucciones, solo idiomas válidos y distintos', () => {
  const p = portada();
  const es = transicion(p, { tipo: 'CAMBIAR_IDIOMA', idioma: 'es' });
  assert.equal(es.idioma, 'es');
  assert.equal(es.pantalla, 'portada');
  assert.deepEqual({ ...es, idioma: 'en' }, p, 'solo cambia el idioma');
  assert.equal(transicion(p, { tipo: 'CAMBIAR_IDIOMA', idioma: 'en' }), p);
  for (const malo of ['fr', 'ES', '', undefined, null, 3]) {
    assert.equal(transicion(p, { tipo: 'CAMBIAR_IDIOMA', idioma: malo }), p, String(malo));
  }
  const ins = enInstrucciones('afirmaciones');
  const insEs = transicion(ins, { tipo: 'CAMBIAR_IDIOMA', idioma: 'es' });
  assert.equal(insEs.idioma, 'es');
  assert.equal(insEs.pantalla, 'instrucciones');
  assert.equal(insEs.reto, 'afirmaciones');
  // Fuera de portada e instrucciones no se puede cambiar.
  const fuera = [
    estadoInicial({}),
    enPregunta(),
    ir(enPregunta(), 'PINTADA'),
    enAfirmaciones(),
    ir(enAfirmaciones(), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }),
    ir(enAfirmaciones(4), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }, 'SIGUIENTE'),
    ir(enInstrucciones(), 'EMPEZAR'),
    ir(enInstrucciones(), 'EMPEZAR', 'PRECARGA_OK'),
    ir(portada({}, { jugados: { imagenes: true } }), abrir('imagenes')),
    ir(estadoInicial({}), cargado(null, { afirmaciones: null })),
    ir(estadoInicial({}), 'ERROR_CALENDARIO')
  ];
  for (const e of fuera) assert.equal(transicion(e, { tipo: 'CAMBIAR_IDIOMA', idioma: 'es' }), e, e.pantalla);
});

test('el idioma elegido se conserva en todo el recorrido y decide qué texto se descifra', () => {
  let e = ir(enInstrucciones('afirmaciones'), { tipo: 'CAMBIAR_IDIOMA', idioma: 'es' });
  e = ir(e, { tipo: 'EMPEZAR', fecha: CASO_T.fecha });
  assert.equal(e.idioma, 'es');
  assert.equal(e.texto, TEXTOS_T.es[0]);
  e = ir(e, 'PINTADA', { tipo: 'VOTO', voto: 'autentica' });
  assert.deepEqual(e.ficha, ACLARACION('es', 0));
  e = ir(e, 'SIGUIENTE');
  assert.equal(e.texto, TEXTOS_T.es[1]);
  assert.equal(e.idioma, 'es');
  // La verdad es la misma en los dos idiomas.
  const en = ir(enAfirmaciones(0, 'en'), 'PINTADA', { tipo: 'VOTO', voto: 'generada' });
  const es = ir(enAfirmaciones(0, 'es'), 'PINTADA', { tipo: 'VOTO', voto: 'generada' });
  assert.equal(en.revelada, es.revelada);
  assert.equal(en.resultados, es.resultados);
  assert.deepEqual(en.ficha, ACLARACION('en', 0));
  assert.deepEqual(es.ficha, ACLARACION('es', 0));
  assert.equal(en.idioma, 'en');
  // Images: la ficha sale del idioma del estado.
  for (let i = 0; i < 5; i++) {
    for (const l of ['en', 'es']) {
      const v = ir(enPregunta(i, 'normal', CASO, l), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' });
      assert.equal(v.ficha, TEXTOS_FICHA[l][i], l + i);
    }
  }
  // Con un idioma sin datos (corruptos), ficha y texto son null y no lanza.
  const sinEs = { ...CASO_T, textos: { en: CASO_T.textos.en }, fichas: { en: CASO_T.fichas.en } };
  const roto = ir(
    estadoInicial({ idioma: 'es' }),
    cargado(CASO, { afirmaciones: sinEs, reto: 'afirmaciones' }),
    abrir('afirmaciones'),
    { tipo: 'EMPEZAR', fecha: 'x' }
  );
  assert.equal(roto.texto, null);
  const rotoVoto = ir(roto, 'PINTADA', { tipo: 'VOTO', voto: 'autentica' });
  assert.equal(rotoVoto.ficha, null);
  assert.equal(rotoVoto.fase, 'veredicto');
});

test('intento común a los dos idiomas: cambiar de idioma no deja volver a jugar', () => {
  for (const idioma of ['en', 'es']) {
    const p = portada({ idioma }, { jugados: { imagenes: true, afirmaciones: true } });
    assert.equal(transicion(p, abrir('imagenes')).pantalla, 'ya-jugado');
    assert.equal(transicion(p, abrir('afirmaciones')).pantalla, 'ya-jugado');
    const cambiado = transicion(p, { tipo: 'CAMBIAR_IDIOMA', idioma: idioma === 'en' ? 'es' : 'en' });
    assert.equal(cambiado.retos.imagenes.jugado, true);
    assert.equal(transicion(cambiado, abrir('imagenes')).pantalla, 'ya-jugado');
  }
  // Tras terminar una partida en español, cambiar a inglés en la portada la sigue dando por jugada.
  const fin = ir(enAfirmaciones(4, 'es'), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }, 'SIGUIENTE', 'VOLVER_PORTADA');
  assert.equal(fin.pantalla, 'portada');
  assert.equal(fin.retos.afirmaciones.jugado, true);
  const enIngles = ir(fin, { tipo: 'CAMBIAR_IDIOMA', idioma: 'en' });
  assert.equal(enIngles.retos.afirmaciones.jugado, true);
  assert.equal(transicion(enIngles, abrir('afirmaciones')).pantalla, 'ya-jugado');
  // Carrera con otra pestaña estando en instrucciones -> ya-jugado.
  const carrera = ir(enInstrucciones('afirmaciones'), { tipo: 'OTRA_PESTANA', reto: 'afirmaciones' });
  assert.equal(carrera.pantalla, 'ya-jugado');
});

test('160. EMPEZAR por reto', () => {
  const p = enInstrucciones('afirmaciones');
  const e = transicion(p, { tipo: 'EMPEZAR', fecha: '2026-12-01' });
  assert.equal(e.pantalla, 'caso');
  assert.equal(e.fase, 'pregunta');
  assert.equal(e.indice, 0);
  assert.equal(e.activo, false);
  assert.equal(e.fecha, '2026-12-01');
  assert.equal(e.resultados, '-----');
  assert.equal(e.motivo, null);
  assert.equal(e.texto, TEXTOS_T.en[0]);
  assert.equal(e.tapada, false);
  const jugado = ir(portada({}, { jugados: { afirmaciones: true } }), abrir('afirmaciones'));
  assert.equal(jugado.pantalla, 'ya-jugado');
  assert.equal(transicion(jugado, { tipo: 'EMPEZAR', fecha: 'x' }), jugado);
  // Carrera: el reto pasa a jugado estando en instrucciones y se pulsa Empezar.
  const medio = { ...p, retos: { ...p.retos, afirmaciones: { ...p.retos.afirmaciones, jugado: true } } };
  assert.equal(transicion(medio, { tipo: 'EMPEZAR', fecha: 'x' }).pantalla, 'ya-jugado');
  assert.equal(ir(enInstrucciones(), 'EMPEZAR').pantalla, 'cargando');
  const tit = ir(e, 'PINTADA');
  assert.equal(transicion(tit, { tipo: 'AGOTADO' }), tit);
  assert.equal(transicion(p, { tipo: 'PRECARGA_OK' }), p);
});

test('161. VOLVIO en Fact or Fake: más de 3000 ms es fallo', () => {
  for (const ocultoMs of [3001, Infinity]) {
    for (let i = 0; i < 5; i++) {
      const base = ir(enAfirmaciones(i), 'PINTADA');
      const v = transicion(base, { tipo: 'VOLVIO', ocultoMs, indice: i });
      assert.equal(v.fase, 'veredicto');
      assert.equal(v.resultados[i], 'F');
      assert.equal(v.revelada, VERDADES_T[i]);
      assert.deepEqual(v.ficha, ACLARACION('en', i));
      assert.equal(v.motivo, 'oculta');
      assert.equal(v.activo, false);
    }
  }
  const base = ir(enAfirmaciones(1), 'PINTADA');
  for (const ocultoMs of [3000, 1500, 0, -1, NaN, '5000', undefined, null]) {
    assert.equal(transicion(base, { tipo: 'VOLVIO', ocultoMs, indice: 1 }), base, String(ocultoMs));
  }
  assert.equal(transicion(base, { tipo: 'VOLVIO', indice: 1 }), base);
  const sinPintar = enAfirmaciones(1);
  assert.equal(transicion(sinPintar, { tipo: 'VOLVIO', ocultoMs: 5000, indice: 1 }), sinPintar);
  assert.equal(transicion(base, { tipo: 'VOLVIO', ocultoMs: 5000, indice: 2 }), base);
  const veredicto = ir(base, { tipo: 'VOTO', voto: 'autentica' });
  assert.equal(transicion(veredicto, { tipo: 'VOLVIO', ocultoMs: 5000, indice: 1 }), veredicto);
  const portada = ir(estadoInicial({}), cargado(CASO, { reto: 'afirmaciones' }));
  assert.equal(transicion(portada, { tipo: 'VOLVIO', ocultoMs: 5000, indice: 0 }), portada);
  const resultado = ir(enAfirmaciones(4), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }, 'SIGUIENTE');
  assert.equal(resultado.pantalla, 'resultado');
  assert.equal(transicion(resultado, { tipo: 'VOLVIO', ocultoMs: 5000, indice: 4 }), resultado);
  const img = ir(enPregunta(), 'PINTADA');
  assert.equal(transicion(img, { tipo: 'VOLVIO', ocultoMs: 60000, indice: 0 }), img);
  const portadaImg = ir(estadoInicial({}), cargado(CASO));
  assert.equal(transicion(portadaImg, { tipo: 'VOLVIO', ocultoMs: 60000, indice: 0 }), portadaImg);
});

test('162. VOTO y SIGUIENTE en Fact or Fake', () => {
  const v = ir(enAfirmaciones(), 'PINTADA', { tipo: 'VOTO', voto: 'generada' });
  assert.equal(v.resultados[0], 'A');
  assert.deepEqual(v.ficha, ACLARACION('en', 0));
  assert.equal(v.motivo, null);
  const s = ir(v, 'SIGUIENTE');
  assert.equal(s.texto, TEXTOS_T.en[1]);
  assert.equal(s.ficha, null);
  assert.equal(s.revelada, null);
  assert.equal(s.motivo, null);
  assert.equal(s.indice, 1);
  const fin = ir(enAfirmaciones(4), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }, 'SIGUIENTE');
  assert.equal(fin.pantalla, 'resultado');
  assert.equal(fin.texto, null);
  assert.equal(fin.retos.afirmaciones.jugado, true);
  assert.equal(fin.retos.imagenes.jugado, false);
});

test('163. nunca hay más de una afirmación descifrada', () => {
  let e = enAfirmaciones();
  for (let i = 0; i < 5; i++) {
    assert.equal(e.texto, TEXTOS_T.en[i]);
    assert.equal(e.indice, i);
    e = ir(e, 'PINTADA');
    assert.equal(e.texto, TEXTOS_T.en[i]);
    e = ir(e, { tipo: 'VOTO', voto: VOTO_BIEN(i) });
    assert.equal(e.resultados[i], 'A');
    assert.equal(e.texto, TEXTOS_T.en[i]);
    e = ir(e, 'SIGUIENTE');
  }
  assert.equal(e.pantalla, 'resultado');
  assert.equal(e.texto, null);
  assert.equal(e.ficha, null);
  assert.equal(e.resultados, 'AAAAA');
});

test('164. VOLVER_PORTADA desde instrucciones, resultado y ya-jugado', () => {
  const resultado = ir(enAfirmaciones(4), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }, 'SIGUIENTE');
  const p = transicion(resultado, { tipo: 'VOLVER_PORTADA' });
  assert.equal(p.pantalla, 'portada');
  assert.equal(p.reto, 'afirmaciones');
  for (const k of ['fase', 'texto', 'ficha', 'revelada', 'motivo', 'fecha']) assert.equal(p[k], null, k);
  assert.equal(p.indice, 0);
  assert.equal(p.resultados, '-----');
  assert.equal(p.retos.afirmaciones.jugado, true);
  assert.deepEqual(p.textos, CASO_T.textos);
  assert.equal(transicion(p, abrir('afirmaciones')).pantalla, 'ya-jugado');
  const yj = ir(portada({}, { jugados: { imagenes: true } }), abrir('imagenes'));
  assert.equal(yj.pantalla, 'ya-jugado');
  const p2 = transicion(yj, { tipo: 'VOLVER_PORTADA' });
  assert.equal(p2.pantalla, 'portada');
  assert.equal(p2.reto, 'imagenes');
  assert.deepEqual(p2.pruebas, CASO.pruebas);
  // Desde instrucciones: vuelve a la portada con el mismo reto y sin gastar nada.
  const ins = enInstrucciones('afirmaciones');
  const dePortada = transicion(ins, { tipo: 'VOLVER_PORTADA' });
  assert.equal(dePortada.pantalla, 'portada');
  assert.equal(dePortada.reto, 'afirmaciones');
  assert.equal(dePortada.retos.afirmaciones.jugado, false);
  // El idioma se conserva.
  assert.equal(transicion(ir(ins, { tipo: 'CAMBIAR_IDIOMA', idioma: 'es' }), { tipo: 'VOLVER_PORTADA' }).idioma, 'es');
  for (const e of [estadoInicial({}), enPregunta(), enAfirmaciones(), ir(enAfirmaciones(), 'PINTADA')]) {
    assert.equal(transicion(e, { tipo: 'VOLVER_PORTADA' }), e);
  }
  const base = portada();
  assert.equal(transicion(base, { tipo: 'VOLVER_PORTADA' }), base);
});

test('165. OTRA_PESTANA por reto', () => {
  const portada = ir(estadoInicial({}), cargado(CASO));
  const a = transicion(portada, { tipo: 'OTRA_PESTANA', reto: 'afirmaciones' });
  assert.equal(a.pantalla, 'portada');
  assert.equal(a.retos.afirmaciones.jugado, true);
  assert.equal(a.retos.imagenes.jugado, false);
  const b = transicion(ir(enAfirmaciones(), 'PINTADA'), { tipo: 'OTRA_PESTANA', reto: 'afirmaciones' });
  assert.equal(b.pantalla, 'ya-jugado');
  assert.equal(b.retos.afirmaciones.jugado, true);
  assert.equal(b.texto, null);
  const c = transicion(enPregunta(), { tipo: 'OTRA_PESTANA', reto: 'afirmaciones' });
  assert.equal(c.pantalla, 'caso');
  assert.equal(c.retos.afirmaciones.jugado, true);
  assert.equal(transicion(portada, { tipo: 'OTRA_PESTANA', reto: 'otro' }), portada);
  assert.equal(transicion(portada, { tipo: 'OTRA_PESTANA' }), portada);
  const ini = estadoInicial({});
  assert.equal(transicion(ini, { tipo: 'OTRA_PESTANA', reto: 'imagenes' }), ini);
});

test('166. MEDIANOCHE solo en portada, ya-jugado y sin-casos', () => {
  const portada = ir(estadoInicial({}), cargado(CASO, { reto: 'afirmaciones' }));
  assert.equal(transicion(portada, { tipo: 'MEDIANOCHE' }).pantalla, 'iniciando');
  const yj = ir(estadoInicial({}), cargado(CASO, { jugados: { imagenes: true } }), 'EMPEZAR');
  assert.equal(transicion(yj, { tipo: 'MEDIANOCHE' }).pantalla, 'iniciando');
  const sin = ir(estadoInicial({}), cargado(null, { afirmaciones: null }));
  assert.equal(transicion(sin, { tipo: 'MEDIANOCHE' }).pantalla, 'iniciando');
  for (const e of [enPregunta(), enAfirmaciones(), ir(enAfirmaciones(), 'PINTADA')]) {
    assert.equal(transicion(e, { tipo: 'MEDIANOCHE' }), e);
  }
});

test('206. OCULTA_MAX_MS y ocultacionEsFallo', () => {
  assert.equal(OCULTA_MAX_MS, 3000);
  for (const x of [3001, Infinity]) assert.equal(ocultacionEsFallo(x), true, String(x));
  for (const x of [3000, 2999, 0, -5, NaN, '5000', null, undefined, -Infinity]) {
    assert.equal(ocultacionEsFallo(x), false, String(x));
  }
});

test('207. medirOculta', () => {
  assert.equal(medirOculta({ perf: 1000, fecha: 50000 }, { perf: 2500, fecha: 51500 }), 1500);
  assert.equal(medirOculta({ perf: 1000, fecha: 0 }, { perf: 1200, fecha: 10000 }), 10000);
  assert.equal(medirOculta({ perf: 0, fecha: 10000 }, { perf: 4000, fecha: 0 }), 4000);
  assert.equal(medirOculta({ perf: NaN, fecha: 0 }, { perf: 100, fecha: 2500 }), 2500);
  assert.equal(medirOculta({ perf: 0, fecha: 0 }, { perf: 100, fecha: NaN }), 100);
  assert.equal(medirOculta(), 0);
  assert.equal(medirOculta(null, null), 0);
  assert.equal(medirOculta({ perf: 5, fecha: 5 }, { perf: 1, fecha: 1 }), 0);
  assert.equal(medirOculta({}, {}), 0);
  assert.equal(medirOculta({ perf: '1', fecha: 1 }, { perf: 9, fecha: 'x' }), 0);
});

test('208. recorrido con ausencias en Fact or Fake', () => {
  let e = ir(enAfirmaciones(1), 'PINTADA');
  assert.equal(transicion(e, { tipo: 'VOLVIO', ocultoMs: 2000, indice: 1 }), e);
  e = ir(e, { tipo: 'VOTO', voto: VOTO_BIEN(1) });
  assert.equal(e.motivo, null);
  assert.equal(e.resultados[1], 'A');
  e = ir(e, 'SIGUIENTE', 'PINTADA');
  e = transicion(e, { tipo: 'VOLVIO', ocultoMs: 3500, indice: 2 });
  assert.equal(e.resultados[2], 'F');
  assert.equal(e.motivo, 'oculta');
  assert.equal(e.fase, 'veredicto');
  assert.equal(transicion(e, { tipo: 'VOLVIO', ocultoMs: 3500, indice: 2 }), e);
  assert.equal(ir(e, 'SIGUIENTE').motivo, null);
});

test('OCULTA (evento retirado) no tiene efecto, tampoco en Fact or Fake', () => {
  for (const e of [enAfirmaciones(), ir(enAfirmaciones(), 'PINTADA')]) assert.equal(transicion(e, { tipo: 'OCULTA' }), e);
});

test('TECLAS, votoDeTecla y teclaDeVoto por idioma [D-122, D-156]', () => {
  assert.deepEqual(TECLAS, {
    en: { imagenes: { r: 'autentica', i: 'generada' }, afirmaciones: { f: 'autentica', k: 'generada' } },
    es: { imagenes: { r: 'autentica', i: 'generada' }, afirmaciones: { d: 'autentica', b: 'generada' } }
  });
  assert.equal(Object.isFrozen(TECLAS), true);
  for (const idioma of ['en', 'es']) {
    assert.equal(Object.isFrozen(TECLAS[idioma]), true);
    assert.equal(Object.isFrozen(TECLAS[idioma].imagenes), true);
    assert.equal(Object.isFrozen(TECLAS[idioma].afirmaciones), true);
  }
  // Images: R e I en los dos idiomas, y por defecto en inglés.
  for (const idioma of ['en', 'es']) {
    assert.equal(votoDeTecla('imagenes', 'r', idioma), 'autentica');
    assert.equal(votoDeTecla('imagenes', 'I', idioma), 'generada');
    assert.equal(teclaDeVoto('imagenes', 'autentica', idioma), 'R');
    assert.equal(teclaDeVoto('imagenes', 'generada', idioma), 'I');
  }
  assert.equal(votoDeTecla('imagenes', 'r'), 'autentica');
  // Fact or Fake: F y K en inglés; D y B en español.
  assert.equal(votoDeTecla('afirmaciones', 'f', 'en'), 'autentica');
  assert.equal(votoDeTecla('afirmaciones', 'K', 'en'), 'generada');
  assert.equal(votoDeTecla('afirmaciones', 'd', 'es'), 'autentica');
  assert.equal(votoDeTecla('afirmaciones', 'B', 'es'), 'generada');
  assert.equal(votoDeTecla('afirmaciones', 'f'), 'autentica', 'inglés por defecto');
  assert.equal(teclaDeVoto('afirmaciones', 'autentica', 'en'), 'F');
  assert.equal(teclaDeVoto('afirmaciones', 'generada', 'en'), 'K');
  assert.equal(teclaDeVoto('afirmaciones', 'autentica', 'es'), 'D');
  assert.equal(teclaDeVoto('afirmaciones', 'generada', 'es'), 'B');
  assert.equal(teclaDeVoto('afirmaciones', 'generada'), 'K');
  // Las teclas del otro idioma y del otro reto no valen.
  for (const [reto, tecla, idioma] of [
    ['afirmaciones', 'f', 'es'], ['afirmaciones', 'k', 'es'], ['afirmaciones', 'd', 'en'], ['afirmaciones', 'b', 'en'],
    ['imagenes', 'f', 'en'], ['imagenes', 'k', 'en'], ['imagenes', 'd', 'es'], ['imagenes', 'b', 'es'],
    ['afirmaciones', 'r', 'en'], ['afirmaciones', 'i', 'es']
  ]) {
    assert.equal(votoDeTecla(reto, tecla, idioma), null, reto + tecla + idioma);
  }
  for (const t of ['Enter', '', 'rr', undefined, null, 5, 'constructor']) assert.equal(votoDeTecla('imagenes', t), null, String(t));
  for (const r of ['x', undefined, null, 'toString', '__proto__']) assert.equal(votoDeTecla(r, 'r'), null, String(r));
  for (const idioma of ['fr', 'ES', null, 'toString', '__proto__', 5]) {
    assert.equal(votoDeTecla('imagenes', 'r', idioma), null, String(idioma));
    assert.equal(teclaDeVoto('imagenes', 'autentica', idioma), null, String(idioma));
  }
  for (const t of ['constructor', 'toString', '__proto__']) assert.equal(votoDeTecla('imagenes', t, 'es'), null);
  for (const [r, v] of [['x', 'autentica'], ['imagenes', 'otro'], ['imagenes', undefined], ['imagenes', 3]]) {
    assert.equal(teclaDeVoto(r, v), null);
  }
});

test('mensajesDelReto [D-134]', () => {
  const final = { mensajes: ['a'], mensajes_afirmaciones: ['b'] };
  assert.equal(mensajesDelReto('imagenes', final), final.mensajes);
  assert.equal(mensajesDelReto('afirmaciones', final), final.mensajes_afirmaciones);
  for (const r of ['x', undefined, null, 'toString']) assert.equal(mensajesDelReto(r, final), null);
  for (const f of [null, undefined, 'x', 5, []]) assert.equal(mensajesDelReto('imagenes', f), null);
});


test('votoDicho: acierto = la verdad, fallo (o ausencia) = la contraria', () => {
  assert.equal(votoDicho(0, 'A'), 0);
  assert.equal(votoDicho(1, 'A'), 1);
  assert.equal(votoDicho(0, 'F'), 1);
  assert.equal(votoDicho(1, 'F'), 0);
  assert.equal(votoDicho(1, '-'), null);
  assert.equal(votoDicho(undefined, 'A'), null);
  assert.equal(votoDicho(2, 'A'), null);
});

test('etiquetaResultado: une con " · " y salta partes vacías', () => {
  assert.equal(etiquetaResultado(['Images', 'Case #7', 'Dogs', 'Normal']), 'Images · Case #7 · Dogs · Normal');
  assert.equal(etiquetaResultado(['Fact or Fake', 'Case #7', '', null]), 'Fact or Fake · Case #7');
  assert.equal(etiquetaResultado(['Images', undefined, '  ', 'Normal']), 'Images · Normal');
  assert.equal(etiquetaResultado([]), '');
});

import * as juegoModulo from '../js/juego.js';

test('retoDePrueba se retira en la 3.0 y ELEGIR_RETO ya no existe', () => {
  assert.equal(juegoModulo.retoDePrueba, undefined);
  const p = portada();
  assert.equal(transicion(p, { tipo: 'ELEGIR_RETO', reto: 'afirmaciones' }), p);
});

test('anti-trampas: ni el estado de instrucciones ni el de portada llevan la verdad ni textos descifrados', () => {
  for (const reto of ['imagenes', 'afirmaciones']) {
    const e = enInstrucciones(reto);
    assert.equal(e.revelada, null);
    assert.equal(e.ficha, null);
    assert.equal(e.texto, null);
  }
  assert.equal(portada().texto, null);
  // El texto descifrado de la afirmación solo existe en caso/pregunta y veredicto de Fact or Fake.
  const fin = ir(enAfirmaciones(4), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }, 'SIGUIENTE');
  assert.equal(fin.texto, null);
  assert.equal(fin.ficha, null);
});
