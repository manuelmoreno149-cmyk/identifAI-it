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
  elegirVariante,
  mensajeFinal,
  recortarFicha,
  estadoInicial,
  transicion
} from '../js/juego.js';
import { ofuscar, ofuscarFicha } from '../js/diario.js';

const VERDADES = [0, 1, 1, 0, 1];
const CLAVE = ofuscar(VERDADES, 3, () => 0.3);
const TEXTOS_FICHA = ['Real photograph', 'An astronaut dog', 'A cat in the fog', 'Real photograph', 'ñandú 🐕'];
const FICHAS = TEXTOS_FICHA.map((t, i) => ofuscarFicha(t, CLAVE, 3, i, () => 0.25));
const CASO = {
  n: 3,
  fecha: '2026-11-03',
  tema: 'Gente comiendo',
  pruebas: ['a1', 'b2', 'c3', 'd4', 'e5'],
  clave: CLAVE,
  fichas: FICHAS
};

function congelar(o) {
  Object.freeze(o);
  for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) congelar(v);
  return o;
}

function ir(estado, ...eventos) {
  return eventos.reduce((e, ev) => transicion(e, typeof ev === 'string' ? { tipo: ev } : ev), estado);
}

function enPregunta(indice = 0, modo = 'normal', caso = CASO) {
  let e = estadoInicial({ modo });
  e = ir(e, { tipo: 'CARGADO', caso, partidaHoy: null }, 'EMPEZAR');
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
  const portada = ir(estadoInicial({}), { tipo: 'CARGADO', caso: CASO, partidaHoy: null });
  assert.equal(transicion(portada, { tipo: 'ELEGIR_MODO', modo: 'dificil' }), portada);
  assert.equal(transicion(portada, { tipo: 'ELEGIR_MODO', modo: 'toString' }), portada);
  assert.equal(ir(portada, { tipo: 'ELEGIR_MODO', modo: 'investigador' }).modo, 'investigador');
});

test('estado inicial: campos de la 1.3', () => {
  const e = estadoInicial({});
  assert.equal(e.pantalla, 'iniciando');
  assert.equal(e.tema, null);
  assert.equal(e.fichas, null);
  assert.equal(e.tapada, false);
  assert.equal(e.ficha, null);
  assert.equal('volverA' in e, false);
  assert.equal('vistoComoJugar' in e, false);
});

test('11. transicion no muta el estado (estado y evento congelados)', () => {
  const eventos = [
    { tipo: 'CARGADO', caso: CASO, partidaHoy: null },
    { tipo: 'ELEGIR_MODO', modo: 'perro' },
    { tipo: 'EMPEZAR' },
    { tipo: 'PINTADA' },
    { tipo: 'VOTO', voto: 'generada' },
    { tipo: 'AGOTADO' },
    { tipo: 'OCULTA' },
    { tipo: 'SIGUIENTE' },
    { tipo: 'MEDIANOCHE' },
    { tipo: 'OTRA_PESTANA' }
  ];
  const estados = [
    estadoInicial({}),
    enPregunta(),
    ir(enPregunta(), 'PINTADA'),
    ir(enPregunta(), 'PINTADA', 'AGOTADO'),
    ir(enPregunta(), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' })
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

test('12. EMPEZAR lleva siempre a cargando y no existen VER_COMO_JUGAR ni ENTENDIDO', () => {
  const portada = ir(estadoInicial({}), { tipo: 'CARGADO', caso: CASO, partidaHoy: null });
  assert.equal(portada.pantalla, 'portada');
  assert.equal(ir(portada, 'EMPEZAR').pantalla, 'cargando');
  assert.equal(transicion(portada, { tipo: 'VER_COMO_JUGAR' }), portada);
  assert.equal(transicion(portada, { tipo: 'ENTENDIDO' }), portada);
  const cargando = ir(portada, 'EMPEZAR');
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
        assert.equal(r.ficha, TEXTOS_FICHA[i]);
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
  const portada = ir(estadoInicial({}), { tipo: 'CARGADO', caso: CASO, partidaHoy: null });
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
    ir(estadoInicial({}), { tipo: 'CARGADO', caso: CASO, partidaHoy: null }),
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
    const terminada = { estado: 'terminada', modo, resultados: 'AAAAA' };
    const e = ir(estadoInicial({ modo: 'perro' }), { tipo: 'CARGADO', caso: CASO, partidaHoy: terminada });
    assert.equal(e.pantalla, 'ya-jugado');
  }
  const sin = ir(estadoInicial({}), { tipo: 'CARGADO', caso: null, partidaHoy: null });
  assert.equal(sin.pantalla, 'sin-casos');
  assert.equal(sin.tema, null);
  const p = ir(estadoInicial({}), { tipo: 'CARGADO', caso: CASO, partidaHoy: null });
  assert.equal(p.pantalla, 'portada');
  assert.equal(p.n, 3);
  assert.equal(p.tema, 'Gente comiendo');
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

  let c = ir(estadoInicial({}), { tipo: 'CARGADO', caso: CASO, partidaHoy: null }, 'EMPEZAR', 'PRECARGA_ERROR');
  assert.equal(c.pantalla, 'error');
  assert.equal(c.error, 'imagenes');
  c = ir(c, 'REINTENTAR');
  assert.equal(c.pantalla, 'cargando');
  assert.equal(c.error, null);

  const sellada = ir(enPregunta(), 'PINTADA', 'AGOTADO', 'OTRA_PESTANA');
  assert.equal(sellada.pantalla, 'ya-jugado');
  assert.equal(sellada.tapada, false);
  assert.equal(sellada.ficha, null);
  const portada = ir(estadoInicial({}), { tipo: 'CARGADO', caso: CASO, partidaHoy: null });
  assert.equal(ir(portada, 'OTRA_PESTANA').pantalla, 'ya-jugado');
  assert.equal(ir(portada, 'MEDIANOCHE').pantalla, 'iniciando');
  assert.equal(ir(enPregunta(), 'MEDIANOCHE').pantalla, 'caso');
  assert.equal(ir(portada, { tipo: 'ELEGIR_MODO', modo: 'perro' }).modo, 'perro');
  assert.equal(transicion(portada, { tipo: 'NO_EXISTE' }), portada);
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
