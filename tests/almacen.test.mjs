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
  calcularRacha,
  leerConRespaldo,
  guardarConRespaldo,
  actualizar,
  crearAlmacenMemoria
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

const F = '2026-11-01';

test('33. dos pestañas: actualizar relee y solo aplica el cambio sobre lo último guardado', () => {
  const compartido = almacenMemoria();
  const sesionA = almacenMemoria();
  // La pestaña A cargó datos antiguos en memoria.
  const memoriaA = datosIniciales();
  // La pestaña B empieza y termina la partida.
  let b = actualizar((d) => registrarInicio(d, { fecha: F, n: 1, modo: 'facil', sesion: 'B' }), datosIniciales(), compartido, almacenMemoria());
  b = actualizar((d) => registrarPrueba(d, F, 0, 'A', 'B'), b.datos, compartido, almacenMemoria());
  b = actualizar((d) => registrarFin(d, F, F, 'B'), b.datos, compartido, almacenMemoria());
  // A cambia de modo con datos viejos en memoria: no borra la partida de B.
  const a = actualizar((d) => conAjustes(d, { modo: 'dificil' }), memoriaA, compartido, sesionA);
  assert.equal(a.datos.ajustes.modo, 'dificil');
  assert.equal(partidaDe(a.datos, F).estado, 'terminada');
  assert.equal(partidaDe(leer(compartido).datos, F).modo, 'facil');
  assert.equal(leer(compartido).datos.racha, 1);
});

test('34. una partida terminada nunca se sobrescribe', () => {
  let d = registrarInicio(datosIniciales(), { fecha: F, n: 1, modo: 'medio', sesion: 'B' });
  d = registrarPrueba(d, F, 0, 'A', 'B');
  const fin = registrarFin(d, F, F, 'B');
  assert.equal(registrarFin(fin, F, F, 'B'), fin);
  assert.equal(registrarPrueba(fin, F, 1, 'A'), fin);
  assert.equal(registrarPrueba(fin, F, 1, 'A', 'B'), fin);
  assert.equal(cerrarAbandonada(fin, F, F), fin);
  assert.equal(registrarInicio(fin, { fecha: F, n: 1, modo: 'facil', sesion: 'A' }), fin);
  // Otra sesión no puede tocar una partida en curso que no es suya.
  assert.equal(registrarPrueba(d, F, 1, 'F', 'A'), d);
  assert.equal(registrarFin(d, F, F, 'A'), d);
});

test('35. registrarInicio atómico: la segunda pestaña ve la sesión de la primera', () => {
  const compartido = almacenMemoria();
  const r1 = actualizar((d) => registrarInicio(d, { fecha: F, n: 1, modo: 'medio', sesion: 'A' }), datosIniciales(), compartido, almacenMemoria());
  const r2 = actualizar((d) => registrarInicio(d, { fecha: F, n: 1, modo: 'facil', sesion: 'B' }), datosIniciales(), compartido, almacenMemoria());
  assert.equal(partidaDe(r1.datos, F).sesion, 'A');
  assert.equal(partidaDe(r2.datos, F).sesion, 'A');
  assert.equal(partidaDe(r2.datos, F).modo, 'medio');
});

test('36. la fecha de la partida manda: terminar tras medianoche cuenta para el día de inicio', () => {
  let d = registrarInicio(datosIniciales(), { fecha: '2026-11-01', n: 1, modo: 'medio', sesion: 's' });
  d = registrarFin(d, '2026-11-01', '2026-11-01', 's');
  assert.equal(d.racha, 1);
  assert.equal(partidaDe(d, '2026-11-02'), null);
});

test('37. localStorage roto: respaldo en sessionStorage y actualizar sigue funcionando', () => {
  const sesion = almacenMemoria();
  const r = actualizar((d) => conAjustes(d, { modo: 'facil' }), datosIniciales(), roto, sesion);
  assert.equal(r.guardado, false);
  assert.equal(r.datos.ajustes.modo, 'facil');
  const lectura = leerConRespaldo(roto, sesion);
  assert.equal(lectura.disponible, false);
  assert.equal(lectura.respaldo, true);
  assert.equal(lectura.datos.ajustes.modo, 'facil');
  assert.deepEqual(guardarConRespaldo(datosIniciales(), roto, sesion), { guardado: false, respaldo: true });
  // Si tampoco hay sessionStorage, se usan los datos en memoria y no lanza.
  const memoria = conAjustes(datosIniciales(), { modo: 'dificil' });
  const r2 = actualizar((d) => d, memoria, roto, roto);
  assert.equal(r2.datos, memoria);
  assert.equal(leerConRespaldo(roto, roto).respaldo, false);
});

test('105. crearAlmacenMemoria', () => {
  const g = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const g2 = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const bomba = { get: () => { throw new Error('tocado'); }, configurable: true };
  Object.defineProperty(globalThis, 'localStorage', bomba);
  Object.defineProperty(globalThis, 'sessionStorage', bomba);
  try {
    const m = crearAlmacenMemoria();
    assert.deepEqual(leer(m), { datos: datosIniciales(), disponible: true });
    const d = conAjustes(datosIniciales(), { modo: 'facil' });
    assert.equal(guardar(d, m), true);
    assert.deepEqual(leer(m).datos, d);
    assert.equal(leer(crearAlmacenMemoria()).datos.ajustes.modo, 'medio');
    assert.equal(m.getItem('inexistente'), null);
    m.setItem('x', 5);
    assert.equal(m.getItem('x'), '5');
    m.removeItem('x');
    assert.equal(m.getItem('x'), null);
    const r = actualizar((x) => conAjustes(x, { vistoComoJugar: true }), null, crearAlmacenMemoria(), crearAlmacenMemoria());
    assert.equal(r.guardado, true);
    assert.equal(r.datos.ajustes.vistoComoJugar, true);
  } finally {
    if (g) Object.defineProperty(globalThis, 'localStorage', g); else delete globalThis.localStorage;
    if (g2) Object.defineProperty(globalThis, 'sessionStorage', g2); else delete globalThis.sessionStorage;
  }
});
