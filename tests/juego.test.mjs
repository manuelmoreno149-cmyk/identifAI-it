import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MODOS,
  MODO_POR_DEFECTO,
  VOTOS,
  corregir,
  contarAciertos,
  estadoDeCodigo,
  elegirVariante,
  mensajeFinal,
  estadoInicial,
  transicion
} from '../js/juego.js';
import { ofuscar } from '../js/diario.js';

const VERDADES = [0, 1, 1, 0, 1];
const CASO = {
  n: 3,
  fecha: '2026-11-03',
  pruebas: ['a1', 'b2', 'c3', 'd4', 'e5'],
  clave: ofuscar(VERDADES, 3, () => 0.3)
};

function congelar(o) {
  Object.freeze(o);
  for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) congelar(v);
  return o;
}

function ir(estado, ...eventos) {
  return eventos.reduce((e, ev) => transicion(e, typeof ev === 'string' ? { tipo: ev } : ev), estado);
}

function enPregunta(indice = 0, visto = true) {
  let e = estadoInicial({ modo: 'medio', vistoComoJugar: visto });
  e = ir(e, { tipo: 'CARGADO', caso: CASO, partidaHoy: null }, 'EMPEZAR');
  e = ir(e, 'PRECARGA_OK', { tipo: 'FIN_CUENTA', fecha: CASO.fecha });
  for (let i = 0; i < indice; i++) {
    e = ir(e, 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }, 'SIGUIENTE');
  }
  return e;
}

test('constantes', () => {
  assert.deepEqual(MODOS, { facil: 7000, medio: 3000, dificil: 1000 });
  assert.equal(MODO_POR_DEFECTO, 'medio');
  assert.deepEqual(VOTOS, { autentica: 0, generada: 1 });
});

test('11. transicion no muta el estado (estado y evento congelados)', () => {
  const eventos = [
    { tipo: 'CARGADO', caso: CASO, partidaHoy: null },
    { tipo: 'ELEGIR_MODO', modo: 'facil' },
    { tipo: 'EMPEZAR' },
    { tipo: 'PINTADA' },
    { tipo: 'VOTO', voto: 'generada' },
    { tipo: 'AGOTADO' },
    { tipo: 'OCULTA' },
    { tipo: 'SIGUIENTE' },
    { tipo: 'MEDIANOCHE' },
    { tipo: 'OTRA_PESTANA' }
  ];
  const estados = [estadoInicial({}), enPregunta(), ir(enPregunta(), 'PINTADA'), ir(enPregunta(), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' })];
  for (const e of estados) {
    const copia = JSON.stringify(e);
    congelar(e);
    for (const ev of eventos) {
      transicion(e, congelar({ ...ev }));
      assert.equal(JSON.stringify(e), copia);
    }
  }
});

test('12. EMPEZAR pasa por como-jugar la primera vez y no las siguientes', () => {
  let e = ir(estadoInicial({ vistoComoJugar: false }), { tipo: 'CARGADO', caso: CASO, partidaHoy: null });
  assert.equal(e.pantalla, 'portada');
  e = ir(e, 'EMPEZAR');
  assert.equal(e.pantalla, 'como-jugar');
  assert.equal(e.volverA, 'cargando');
  e = ir(e, 'ENTENDIDO');
  assert.equal(e.pantalla, 'cargando');
  assert.equal(e.vistoComoJugar, true);

  let v = ir(estadoInicial({ vistoComoJugar: true }), { tipo: 'CARGADO', caso: CASO, partidaHoy: null }, 'EMPEZAR');
  assert.equal(v.pantalla, 'cargando');

  let c = ir(estadoInicial({}), { tipo: 'CARGADO', caso: CASO, partidaHoy: null }, 'VER_COMO_JUGAR');
  assert.equal(c.pantalla, 'como-jugar');
  assert.equal(ir(c, 'ENTENDIDO').pantalla, 'portada');
});

test('13. VOTO con activo false devuelve el mismo objeto', () => {
  const e = enPregunta();
  assert.equal(e.activo, false);
  assert.equal(transicion(e, { tipo: 'VOTO', voto: 'autentica' }), e);
});

test('14. VOTO, AGOTADO y OCULTA corrigen y revelan la verdad', () => {
  for (let i = 0; i < 5; i++) {
    const base = ir(enPregunta(i), 'PINTADA');
    assert.equal(base.activo, true);
    const bien = VERDADES[i] === 1 ? 'generada' : 'autentica';
    const mal = VERDADES[i] === 1 ? 'autentica' : 'generada';
    const a = transicion(base, { tipo: 'VOTO', voto: bien });
    assert.equal(a.resultados[i], 'A');
    const f = transicion(base, { tipo: 'VOTO', voto: mal });
    assert.equal(f.resultados[i], 'F');
    const t = transicion(base, { tipo: 'AGOTADO' });
    assert.equal(t.resultados[i], 'T');
    const o = transicion(base, { tipo: 'OCULTA' });
    assert.equal(o.resultados[i], 'O');
    for (const r of [a, f, t, o]) {
      assert.equal(r.fase, 'veredicto');
      assert.equal(r.revelada, VERDADES[i]);
      assert.equal(r.activo, false);
    }
  }
});

test('OCULTA antes de PINTADA también es fallo O', () => {
  const e = transicion(enPregunta(), { tipo: 'OCULTA' });
  assert.equal(e.resultados[0], 'O');
  assert.equal(e.fase, 'veredicto');
});

test('15. segundo VOTO o AGOTADO en veredicto no cambian el estado', () => {
  const v = transicion(ir(enPregunta(), 'PINTADA'), { tipo: 'VOTO', voto: 'autentica' });
  assert.equal(transicion(v, { tipo: 'VOTO', voto: 'generada' }), v);
  assert.equal(transicion(v, { tipo: 'AGOTADO' }), v);
  assert.equal(transicion(v, { tipo: 'PINTADA' }), v);
});

test('16. SIGUIENTE avanza y en la prueba 5 lleva a resultado', () => {
  let e = ir(enPregunta(), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }, 'SIGUIENTE');
  assert.equal(e.pantalla, 'caso');
  assert.equal(e.fase, 'pregunta');
  assert.equal(e.indice, 1);
  assert.equal(e.revelada, null);
  assert.equal(e.activo, false);

  let u = ir(enPregunta(4), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }, 'SIGUIENTE');
  assert.equal(u.pantalla, 'resultado');
  assert.equal(u.resultados.length, 5);
  assert.equal(u.resultados.includes('-'), false);
});

test('17. CARGADO: partida terminada, sin casos y portada', () => {
  const terminada = { estado: 'terminada', modo: 'facil', resultados: 'AAAAA' };
  const e = ir(estadoInicial({ modo: 'dificil' }), { tipo: 'CARGADO', caso: CASO, partidaHoy: terminada });
  assert.equal(e.pantalla, 'ya-jugado');
  assert.equal(
    ir(estadoInicial({}), { tipo: 'CARGADO', caso: null, partidaHoy: null }).pantalla,
    'sin-casos'
  );
  const p = ir(estadoInicial({}), { tipo: 'CARGADO', caso: CASO, partidaHoy: null });
  assert.equal(p.pantalla, 'portada');
  assert.equal(p.n, 3);
  assert.deepEqual(p.pruebas, CASO.pruebas);
});

test('18. contarAciertos, mensajeFinal y utilidades', () => {
  assert.equal(contarAciertos('AFTOA'), 2);
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
  assert.equal(estadoDeCodigo('T'), 'tiempo');
  assert.equal(estadoDeCodigo('O'), 'oculta');
  assert.equal(estadoDeCodigo('-'), null);
  assert.equal(elegirVariante(['a', 'b', 'c'], () => 0.99), 'c');
  assert.equal(elegirVariante(['a', 'b', 'c'], () => 0), 'a');
});

test('19. OCULTA fuera de caso/pregunta no cambia nada', () => {
  const portada = ir(estadoInicial({}), { tipo: 'CARGADO', caso: CASO, partidaHoy: null });
  assert.equal(transicion(portada, { tipo: 'OCULTA' }), portada);
  const cuenta = ir(portada, 'EMPEZAR', 'ENTENDIDO', 'PRECARGA_OK');
  assert.equal(cuenta.pantalla, 'cuenta-atras');
  assert.equal(transicion(cuenta, { tipo: 'OCULTA' }), cuenta);
  const veredicto = transicion(ir(enPregunta(), 'PINTADA'), { tipo: 'VOTO', voto: 'autentica' });
  assert.equal(transicion(veredicto, { tipo: 'OCULTA' }), veredicto);
  const resultado = ir(enPregunta(4), 'PINTADA', { tipo: 'VOTO', voto: 'autentica' }, 'SIGUIENTE');
  assert.equal(transicion(resultado, { tipo: 'OCULTA' }), resultado);
});

test('errores, reintentos, otra pestaña y medianoche', () => {
  let e = ir(estadoInicial({}), 'ERROR_CALENDARIO');
  assert.equal(e.pantalla, 'error');
  assert.equal(e.error, 'calendario');
  assert.equal(ir(e, 'REINTENTAR').pantalla, 'iniciando');

  let c = ir(estadoInicial({ vistoComoJugar: true }), { tipo: 'CARGADO', caso: CASO, partidaHoy: null }, 'EMPEZAR', 'PRECARGA_ERROR');
  assert.equal(c.pantalla, 'error');
  assert.equal(c.error, 'imagenes');
  c = ir(c, 'REINTENTAR');
  assert.equal(c.pantalla, 'cargando');
  assert.equal(c.error, null);

  assert.equal(ir(enPregunta(), 'OTRA_PESTANA').pantalla, 'ya-jugado');
  const portada = ir(estadoInicial({}), { tipo: 'CARGADO', caso: CASO, partidaHoy: null });
  assert.equal(ir(portada, 'OTRA_PESTANA').pantalla, 'ya-jugado');
  assert.equal(ir(portada, 'MEDIANOCHE').pantalla, 'iniciando');
  assert.equal(ir(enPregunta(), 'MEDIANOCHE').pantalla, 'caso');
  assert.equal(ir(portada, { tipo: 'ELEGIR_MODO', modo: 'dificil' }).modo, 'dificil');
  const raro = transicion(portada, { tipo: 'NO_EXISTE' });
  assert.equal(raro, portada);
});

test('FIN_CUENTA fija la fecha y deja la prueba 1 sin activar', () => {
  const e = enPregunta();
  assert.equal(e.pantalla, 'caso');
  assert.equal(e.fase, 'pregunta');
  assert.equal(e.fecha, '2026-11-03');
  assert.equal(e.indice, 0);
  assert.equal(e.activo, false);
  assert.equal(e.resultados, '-----');
});
