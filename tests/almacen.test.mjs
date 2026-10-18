import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAVE,
  datosIniciales,
  leer,
  guardar,
  partidaDe,
  conAjustes,
  registrarInicio,
  registrarPrueba,
  registrarFin,
  cerrarAbandonada,
  calcularRacha
} from '../js/almacen.js';

function almacenMemoria(inicial = {}) {
  const m = new Map(Object.entries(inicial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    _m: m
  };
}

const roto = {
  getItem() {
    throw new Error('bloqueado');
  },
  setItem() {
    throw new Error('bloqueado');
  },
  removeItem() {
    throw new Error('bloqueado');
  }
};

function terminada(extra = {}) {
  return { n: 1, modo: 'medio', estado: 'terminada', resultados: 'AAAAA', aciertos: 5, sesion: 'x', ...extra };
}

test('26. almacén que lanza: leer y guardar no lanzan', () => {
  assert.deepEqual(leer(roto), { datos: datosIniciales(), disponible: false });
  assert.equal(guardar(datosIniciales(), roto), false);
  assert.deepEqual(leer({}), { datos: datosIniciales(), disponible: false });
});

test('leer y guardar con un almacén que funciona', () => {
  const a = almacenMemoria();
  assert.deepEqual(leer(a), { datos: datosIniciales(), disponible: true });
  assert.equal(a.getItem('identifaiit.prueba'), null);
  const datos = conAjustes(datosIniciales(), { modo: 'dificil', vistoComoJugar: true });
  assert.equal(guardar(datos, a), true);
  assert.equal(CLAVE, 'identifaiit.v1');
  assert.deepEqual(leer(a).datos, datos);
});

test('27. JSON corrupto o versión 2 dan datos iniciales', () => {
  assert.deepEqual(leer(almacenMemoria({ [CLAVE]: '{no es json' })), {
    datos: datosIniciales(),
    disponible: true
  });
  const v2 = JSON.stringify({ ...datosIniciales(), version: 2 });
  assert.deepEqual(leer(almacenMemoria({ [CLAVE]: v2 })).datos, datosIniciales());
  assert.deepEqual(leer(almacenMemoria({ [CLAVE]: '[1,2]' })).datos, datosIniciales());
});

test('28. registrarInicio no modifica una fecha ya jugada, aunque sea otro modo', () => {
  let d = registrarInicio(datosIniciales(), { fecha: '2026-11-01', n: 1, modo: 'facil', sesion: 's1' });
  assert.deepEqual(partidaDe(d, '2026-11-01'), {
    n: 1,
    modo: 'facil',
    estado: 'en_curso',
    resultados: '-----',
    aciertos: 0,
    sesion: 's1'
  });
  const d2 = registrarInicio(d, { fecha: '2026-11-01', n: 1, modo: 'dificil', sesion: 's2' });
  assert.equal(d2, d);
  assert.equal(partidaDe(d2, '2026-11-01').modo, 'facil');
  assert.equal(partidaDe(d, '2026-11-02'), null);
});

test('registrarPrueba y registrarFin no mutan y actualizan aciertos', () => {
  const d0 = registrarInicio(datosIniciales(), { fecha: '2026-11-01', n: 1, modo: 'medio', sesion: 's' });
  const copia = JSON.stringify(d0);
  let d = registrarPrueba(d0, '2026-11-01', 0, 'A');
  d = registrarPrueba(d, '2026-11-01', 1, 'F');
  d = registrarPrueba(d, '2026-11-01', 2, 'A');
  assert.equal(JSON.stringify(d0), copia);
  assert.equal(partidaDe(d, '2026-11-01').resultados, 'AFA--');
  assert.equal(partidaDe(d, '2026-11-01').aciertos, 2);
  const fin = registrarFin(d, '2026-11-01', '2026-11-01');
  assert.equal(partidaDe(fin, '2026-11-01').estado, 'terminada');
  assert.equal(fin.racha, 1);
  assert.equal(fin.mejorRacha, 1);
});

test('29. cerrarAbandonada convierte AF--- en AFOOO terminada con 1 acierto', () => {
  let d = registrarInicio(datosIniciales(), { fecha: '2026-11-01', n: 1, modo: 'medio', sesion: 's' });
  d = registrarPrueba(registrarPrueba(d, '2026-11-01', 0, 'A'), '2026-11-01', 1, 'F');
  const c = cerrarAbandonada(d, '2026-11-01', '2026-11-01');
  const p = partidaDe(c, '2026-11-01');
  assert.equal(p.resultados, 'AFOOO');
  assert.equal(p.estado, 'terminada');
  assert.equal(p.aciertos, 1);
});

test('30. calcularRacha', () => {
  const tres = { '2026-11-01': terminada(), '2026-11-02': terminada(), '2026-11-03': terminada() };
  assert.equal(calcularRacha(tres, '2026-11-03'), 3);
  assert.equal(calcularRacha(tres, '2026-11-04'), 3);
  assert.equal(calcularRacha(tres, '2026-11-05'), 0);
  const salto = { '2026-11-01': terminada(), '2026-11-03': terminada() };
  assert.equal(calcularRacha(salto, '2026-11-03'), 1);
  const curso = { '2026-11-01': terminada(), '2026-11-02': terminada({ estado: 'en_curso' }) };
  assert.equal(calcularRacha(curso, '2026-11-02'), 1);
  assert.equal(calcularRacha(curso, '2026-11-03'), 0);
  assert.equal(calcularRacha({}, '2026-11-03'), 0);
  const cambioMes = { '2026-12-31': terminada(), '2027-01-01': terminada() };
  assert.equal(calcularRacha(cambioMes, '2027-01-01'), 2);
});

test('31. mejorRacha nunca disminuye', () => {
  let d = { ...datosIniciales(), mejorRacha: 5, racha: 5 };
  d = registrarInicio(d, { fecha: '2026-11-10', n: 10, modo: 'medio', sesion: 's' });
  d = registrarFin(d, '2026-11-10', '2026-11-10');
  assert.equal(d.racha, 1);
  assert.equal(d.mejorRacha, 5);
});

test('32. lo guardado no contiene la verdad ni el voto', () => {
  let d = registrarInicio(datosIniciales(), { fecha: '2026-11-01', n: 1, modo: 'medio', sesion: 's' });
  d = registrarPrueba(d, '2026-11-01', 0, 'A');
  d = registrarFin(d, '2026-11-01', '2026-11-01');
  const texto = JSON.stringify(d);
  assert.equal(/autentica|generada|voto|verdad|clave/i.test(texto), false);
  assert.deepEqual(Object.keys(partidaDe(d, '2026-11-01')).sort(), [
    'aciertos',
    'estado',
    'modo',
    'n',
    'resultados',
    'sesion'
  ]);
});
