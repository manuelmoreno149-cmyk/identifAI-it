import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  crearTemporizador,
  esperarPintado,
  fraccionRestante,
  nivelTemporizador,
  segundosRestantes
} from '../js/temporizador.js';

// Reloj y frames simulados.
function simulador(pasoMs = 16.7) {
  let ahora = 1000;
  let pendiente = null;
  let siguienteId = 1;
  return {
    reloj: () => ahora,
    pedirFrame: (f) => {
      pendiente = { f, id: siguienteId++ };
      return pendiente.id;
    },
    cancelarFrame: (id) => {
      if (pendiente && pendiente.id === id) pendiente = null;
    },
    avanzar(ms = pasoMs) {
      ahora += ms;
    },
    // Entrega el frame pendiente (si lo hay) tras avanzar el reloj.
    frame() {
      this.avanzar();
      if (!pendiente) return false;
      const { f } = pendiente;
      pendiente = null;
      f();
      return true;
    },
    hayPendiente: () => pendiente !== null
  };
}

test('20. alAgotar se llama una sola vez en el primer frame con transcurrido >= duracion', () => {
  const sim = simulador();
  let agotado = 0;
  let momento = null;
  const t = crearTemporizador({
    duracionMs: 1000,
    alAgotar: () => {
      agotado++;
      momento = sim.reloj() - 1000;
    },
    reloj: sim.reloj,
    pedirFrame: sim.pedirFrame,
    cancelarFrame: sim.cancelarFrame
  });
  t.iniciar();
  assert.equal(t.activo(), true);
  for (let i = 0; i < 200; i++) sim.frame();
  assert.equal(agotado, 1);
  assert.ok(momento >= 1000 && momento <= 1017, `transcurrido ${momento}`);
  assert.equal(t.activo(), false);
});

test('alTick recibe restante y fraccion decrecientes', () => {
  const sim = simulador(100);
  const ticks = [];
  const t = crearTemporizador({
    duracionMs: 500,
    alTick: (r, f) => ticks.push([r, f]),
    reloj: sim.reloj,
    pedirFrame: sim.pedirFrame,
    cancelarFrame: sim.cancelarFrame
  });
  t.iniciar();
  for (let i = 0; i < 10; i++) sim.frame();
  assert.ok(ticks.length >= 4);
  assert.ok(ticks[0][0] < 500 && ticks[0][1] < 1);
  assert.deepEqual(ticks.at(-1), [0, 0]);
});

test('21. tras detener() nunca se llama a alAgotar', () => {
  const sim = simulador();
  let agotado = 0;
  const t = crearTemporizador({
    duracionMs: 1000,
    alAgotar: () => agotado++,
    reloj: sim.reloj,
    pedirFrame: sim.pedirFrame,
    cancelarFrame: sim.cancelarFrame
  });
  t.iniciar();
  for (let i = 0; i < 10; i++) sim.frame();
  const ms = t.detener();
  assert.ok(ms > 100 && ms < 200);
  assert.equal(t.activo(), false);
  assert.equal(sim.hayPendiente(), false);
  for (let i = 0; i < 200; i++) sim.frame();
  assert.equal(agotado, 0);
  assert.equal(t.detener(), ms);
});

test('22. funciones puras', () => {
  assert.equal(fraccionRestante(1500, 3000), 0.5);
  assert.equal(fraccionRestante(4000, 3000), 0);
  assert.equal(fraccionRestante(-10, 3000), 1);
  assert.equal(nivelTemporizador(0.3), 'critico');
  assert.equal(nivelTemporizador(0.31), 'normal');
  assert.equal(segundosRestantes(2001), 3);
  assert.equal(segundosRestantes(-5), 0);
});

test('23. el módulo no contiene setInterval ni setTimeout', () => {
  const fuente = readFileSync(new URL('../js/temporizador.js', import.meta.url), 'utf8');
  assert.equal(/setInterval|setTimeout/.test(fuente), false);
});

test('esperarPintado resuelve en el segundo frame', async () => {
  const frames = [];
  const pedir = (f) => frames.push(f);
  let resuelto = false;
  const p = esperarPintado(pedir).then(() => {
    resuelto = true;
  });
  assert.equal(frames.length, 1);
  frames.shift()();
  await Promise.resolve();
  assert.equal(resuelto, false);
  assert.equal(frames.length, 1);
  frames.shift()();
  await p;
  assert.equal(resuelto, true);
});
