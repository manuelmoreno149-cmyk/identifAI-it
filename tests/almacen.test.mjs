import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAVE,
  VERSION,
  datosIniciales,
  leer,
  guardar,
  partidaDe as partidaDe_r,
  conAjustes,
  registrarInicio as registrarInicio_r,
  registrarPrueba as registrarPrueba_r,
  registrarFin as registrarFin_r,
  cerrarAbandonada as cerrarAbandonada_r,
  calcularRacha,
  leerConRespaldo,
  guardarConRespaldo,
  actualizar,
  crearAlmacenMemoria
} from '../js/almacen.js';

// Atajos sobre el reto de Images; los tests de v3 usan las funciones con reto explícito.
const registrarInicio = (d, ...a) => registrarInicio_r(d, 'imagenes', ...a);
const registrarPrueba = (d, ...a) => registrarPrueba_r(d, 'imagenes', ...a);
const registrarFin = (d, ...a) => registrarFin_r(d, 'imagenes', ...a);
const cerrarAbandonada = (d, ...a) => cerrarAbandonada_r(d, 'imagenes', ...a);
const partidaDe = (d, ...a) => partidaDe_r(d, 'imagenes', ...a);
const racha = (d, reto = 'imagenes') => d.retos[reto].racha;
const mejor = (d, reto = 'imagenes') => d.retos[reto].mejorRacha;

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
  return { n: 1, modo: 'normal', estado: 'terminada', resultados: 'AAAAA', aciertos: 5, sesion: 'x', ...extra };
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
  const datos = conAjustes(datosIniciales(), { modo: 'perro' });
  assert.equal(guardar(datos, a), true);
  assert.equal(CLAVE, 'identifaiit.v3');
  assert.equal(VERSION, 3);
  assert.deepEqual(leer(a).datos, datos);
});

test('datosIniciales: versión 3, modo normal, reto imagenes y un bloque por reto', () => {
  assert.deepEqual(datosIniciales(), {
    version: 3,
    ajustes: { modo: 'normal', reto: 'imagenes' },
    retos: {
      imagenes: { partidas: {}, racha: 0, mejorRacha: 0 },
      afirmaciones: { partidas: {}, racha: 0, mejorRacha: 0 }
    }
  });
});

test('27. JSON corrupto o versión distinta dan datos iniciales; v1 no se lee ni se toca', () => {
  assert.deepEqual(leer(almacenMemoria({ [CLAVE]: '{no es json' })), {
    datos: datosIniciales(),
    disponible: true
  });
  const v2 = JSON.stringify({ version: 2, ajustes: { modo: 'perro' }, partidas: {}, racha: 4, mejorRacha: 4 });
  assert.deepEqual(leer(almacenMemoria({ [CLAVE]: v2 })).datos, datosIniciales());
  const v2sola = almacenMemoria({ 'identifaiit.v2': v2, 'identifaiit.v1': '{"a":1}' });
  assert.deepEqual(leer(v2sola).datos, datosIniciales());
  guardar(datosIniciales(), v2sola);
  assert.equal(v2sola.getItem('identifaiit.v2'), v2);
  assert.equal(v2sola.getItem('identifaiit.v1'), '{"a":1}');
  const v1 = JSON.stringify({ version: 1, ajustes: { modo: 'perro' }, partidas: {}, racha: 9, mejorRacha: 9 });
  const viejo = almacenMemoria({ 'identifaiit.v1': v1 });
  assert.deepEqual(leer(viejo).datos, datosIniciales());
  assert.equal(viejo.getItem('identifaiit.v1'), v1);
  assert.equal(viejo.getItem('identifaiit.v3'), null);
  assert.deepEqual(leer(almacenMemoria({ [CLAVE]: v1 })).datos, datosIniciales());
  assert.deepEqual(leer(almacenMemoria({ [CLAVE]: '[1,2]' })).datos, datosIniciales());
});

test('28. registrarInicio no modifica una fecha ya jugada, aunque sea otro modo', () => {
  let d = registrarInicio(datosIniciales(), { fecha: '2026-11-01', n: 1, modo: 'investigador', sesion: 's1' });
  assert.deepEqual(partidaDe(d, '2026-11-01'), {
    n: 1,
    modo: 'investigador',
    estado: 'en_curso',
    resultados: '-----',
    aciertos: 0,
    sesion: 's1'
  });
  const d2 = registrarInicio(d, { fecha: '2026-11-01', n: 1, modo: 'perro', sesion: 's2' });
  assert.equal(d2, d);
  assert.equal(partidaDe(d2, '2026-11-01').modo, 'investigador');
  assert.equal(partidaDe(d, '2026-11-02'), null);
});

test('registrarPrueba y registrarFin no mutan y actualizan aciertos', () => {
  const d0 = registrarInicio(datosIniciales(), { fecha: '2026-11-01', n: 1, modo: 'normal', sesion: 's' });
  const copia = JSON.stringify(d0);
  let d = registrarPrueba(d0, '2026-11-01', 0, 'A');
  d = registrarPrueba(d, '2026-11-01', 1, 'F');
  d = registrarPrueba(d, '2026-11-01', 2, 'A');
  assert.equal(JSON.stringify(d0), copia);
  assert.equal(partidaDe(d, '2026-11-01').resultados, 'AFA--');
  assert.equal(partidaDe(d, '2026-11-01').aciertos, 2);
  const fin = registrarFin(d, '2026-11-01', '2026-11-01');
  assert.equal(partidaDe(fin, '2026-11-01').estado, 'terminada');
  assert.equal(racha(fin), 1);
  assert.equal(mejor(fin), 1);
});

test('29. cerrarAbandonada convierte AF--- en AFFFF terminada con 1 acierto', () => {
  let d = registrarInicio(datosIniciales(), { fecha: '2026-11-01', n: 1, modo: 'normal', sesion: 's' });
  d = registrarPrueba(registrarPrueba(d, '2026-11-01', 0, 'A'), '2026-11-01', 1, 'F');
  const c = cerrarAbandonada(d, '2026-11-01', '2026-11-01');
  const p = partidaDe(c, '2026-11-01');
  assert.equal(p.resultados, 'AFFFF');
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
  let d = datosIniciales();
  d.retos.imagenes.mejorRacha = 5;
  d.retos.imagenes.racha = 5;
  d = registrarInicio(d, { fecha: '2026-11-10', n: 10, modo: 'normal', sesion: 's' });
  d = registrarFin(d, '2026-11-10', '2026-11-10');
  assert.equal(racha(d), 1);
  assert.equal(mejor(d), 5);
});

test('32. lo guardado no contiene la verdad ni el voto', () => {
  let d = registrarInicio(datosIniciales(), { fecha: '2026-11-01', n: 1, modo: 'normal', sesion: 's' });
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
  let b = actualizar((d) => registrarInicio(d, { fecha: F, n: 1, modo: 'investigador', sesion: 'B' }), datosIniciales(), compartido, almacenMemoria());
  b = actualizar((d) => registrarPrueba(d, F, 0, 'A', 'B'), b.datos, compartido, almacenMemoria());
  b = actualizar((d) => registrarFin(d, F, F, 'B'), b.datos, compartido, almacenMemoria());
  // A cambia de modo con datos viejos en memoria: no borra la partida de B.
  const a = actualizar((d) => conAjustes(d, { modo: 'perro' }), memoriaA, compartido, sesionA);
  assert.equal(a.datos.ajustes.modo, 'perro');
  assert.equal(partidaDe(a.datos, F).estado, 'terminada');
  assert.equal(partidaDe(leer(compartido).datos, F).modo, 'investigador');
  assert.equal(leer(compartido).datos.retos.imagenes.racha, 1);
});

test('34. una partida terminada nunca se sobrescribe', () => {
  let d = registrarInicio(datosIniciales(), { fecha: F, n: 1, modo: 'normal', sesion: 'B' });
  d = registrarPrueba(d, F, 0, 'A', 'B');
  const fin = registrarFin(d, F, F, 'B');
  assert.equal(registrarFin(fin, F, F, 'B'), fin);
  assert.equal(registrarPrueba(fin, F, 1, 'A'), fin);
  assert.equal(registrarPrueba(fin, F, 1, 'A', 'B'), fin);
  assert.equal(cerrarAbandonada(fin, F, F), fin);
  assert.equal(registrarInicio(fin, { fecha: F, n: 1, modo: 'investigador', sesion: 'A' }), fin);
  // Otra sesión no puede tocar una partida en curso que no es suya.
  assert.equal(registrarPrueba(d, F, 1, 'F', 'A'), d);
  assert.equal(registrarFin(d, F, F, 'A'), d);
});

test('35. registrarInicio atómico: la segunda pestaña ve la sesión de la primera', () => {
  const compartido = almacenMemoria();
  const r1 = actualizar((d) => registrarInicio(d, { fecha: F, n: 1, modo: 'normal', sesion: 'A' }), datosIniciales(), compartido, almacenMemoria());
  const r2 = actualizar((d) => registrarInicio(d, { fecha: F, n: 1, modo: 'investigador', sesion: 'B' }), datosIniciales(), compartido, almacenMemoria());
  assert.equal(partidaDe(r1.datos, F).sesion, 'A');
  assert.equal(partidaDe(r2.datos, F).sesion, 'A');
  assert.equal(partidaDe(r2.datos, F).modo, 'normal');
});

test('36. la fecha de la partida manda: terminar tras medianoche cuenta para el día de inicio', () => {
  let d = registrarInicio(datosIniciales(), { fecha: '2026-11-01', n: 1, modo: 'normal', sesion: 's' });
  d = registrarFin(d, '2026-11-01', '2026-11-01', 's');
  assert.equal(racha(d), 1);
  assert.equal(partidaDe(d, '2026-11-02'), null);
});

test('37. localStorage roto: respaldo en sessionStorage y actualizar sigue funcionando', () => {
  const sesion = almacenMemoria();
  const r = actualizar((d) => conAjustes(d, { modo: 'investigador' }), datosIniciales(), roto, sesion);
  assert.equal(r.guardado, false);
  assert.equal(r.datos.ajustes.modo, 'investigador');
  const lectura = leerConRespaldo(roto, sesion);
  assert.equal(lectura.disponible, false);
  assert.equal(lectura.respaldo, true);
  assert.equal(lectura.datos.ajustes.modo, 'investigador');
  assert.deepEqual(guardarConRespaldo(datosIniciales(), roto, sesion), { guardado: false, respaldo: true });
  // Si tampoco hay sessionStorage, se usan los datos en memoria y no lanza.
  const memoria = conAjustes(datosIniciales(), { modo: 'perro' });
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
    const d = conAjustes(datosIniciales(), { modo: 'investigador' });
    assert.equal(guardar(d, m), true);
    assert.deepEqual(leer(m).datos, d);
    assert.equal(leer(crearAlmacenMemoria()).datos.ajustes.modo, 'normal');
    assert.equal(m.getItem('inexistente'), null);
    m.setItem('x', 5);
    assert.equal(m.getItem('x'), '5');
    m.removeItem('x');
    assert.equal(m.getItem('x'), null);
    const r = actualizar((x) => conAjustes(x, { modo: 'perro' }), null, crearAlmacenMemoria(), crearAlmacenMemoria());
    assert.equal(r.guardado, true);
    assert.equal(r.datos.ajustes.modo, 'perro');
  } finally {
    if (g) Object.defineProperty(globalThis, 'localStorage', g); else delete globalThis.localStorage;
    if (g2) Object.defineProperty(globalThis, 'sessionStorage', g2); else delete globalThis.sessionStorage;
  }
});

const T = 'afirmaciones';
const IM = 'imagenes';
const ini = { fecha: F, n: 1, modo: null, sesion: 's' };

test('31b. mejorRacha de Fact or Fake nunca disminuye', () => {
  let d = datosIniciales();
  d.retos.afirmaciones.mejorRacha = 4;
  d = registrarInicio_r(d, T, ini);
  d = registrarFin_r(d, T, F, F);
  assert.equal(racha(d, T), 1);
  assert.equal(mejor(d, T), 4);
});

test('174. cada reto toca solo el suyo; un reto inválido no cambia nada ni lanza', () => {
  const base = datosIniciales();
  const imgAntes = JSON.stringify(base.retos.imagenes);
  let d = registrarInicio_r(base, T, ini);
  d = registrarPrueba_r(d, T, F, 0, 'A', 's');
  d = registrarFin_r(d, T, F, F, 's');
  assert.equal(JSON.stringify(d.retos.imagenes), imgAntes);
  assert.equal(partidaDe_r(d, T, F).modo, null);
  assert.equal(partidaDe_r(d, IM, F), null);
  const titAntes = JSON.stringify(d.retos.afirmaciones);
  let e = registrarInicio_r(d, IM, { ...ini, modo: 'normal' });
  e = registrarPrueba_r(e, IM, F, 0, 'F', 's');
  e = cerrarAbandonada_r(e, IM, F, F);
  assert.equal(JSON.stringify(e.retos.afirmaciones), titAntes);
  assert.equal(partidaDe_r(e, IM, F).resultados, 'FFFFF');
  for (const x of ['x', undefined, null, '__proto__']) {
    assert.equal(registrarInicio_r(d, x, ini), d);
    assert.equal(registrarPrueba_r(d, x, F, 0, 'A'), d);
    assert.equal(registrarFin_r(d, x, F, F), d);
    assert.equal(cerrarAbandonada_r(d, x, F, F), d);
    assert.equal(partidaDe_r(d, x, F), null);
  }
});

test('29b. cerrarAbandonada en Fact or Fake: AF--- pasa a AFFFF solo en su reto', () => {
  let d = registrarInicio_r(datosIniciales(), T, ini);
  d = registrarPrueba_r(registrarPrueba_r(d, T, F, 0, 'A'), T, F, 1, 'F');
  const c = cerrarAbandonada_r(d, T, F, F);
  const p = partidaDe_r(c, T, F);
  assert.deepEqual([p.resultados, p.estado, p.aciertos], ['AFFFF', 'terminada', 1]);
  assert.deepEqual(c.retos.imagenes, datosIniciales().retos.imagenes);
});

test('175. rachas independientes por reto', () => {
  let d = datosIniciales();
  for (const f of ['2026-11-01', '2026-11-02', '2026-11-03']) {
    d = registrarInicio_r(d, IM, { fecha: f, n: 1, modo: 'normal', sesion: 's' });
    d = registrarFin_r(d, IM, f, f, 's');
  }
  d = registrarInicio_r(d, T, { fecha: '2026-11-03', n: 1, modo: null, sesion: 's' });
  d = registrarFin_r(d, T, '2026-11-03', '2026-11-03', 's');
  assert.equal(racha(d, IM), 3);
  assert.equal(racha(d, T), 1);
  assert.equal(mejor(d, IM), 3);
  assert.equal(mejor(d, T), 1);
});

test('176. leer devuelve tal cual ajustes no válidos escritos a mano y rellena lo que falta', () => {
  const a = almacenMemoria({
    [CLAVE]: JSON.stringify({ version: 3, ajustes: { modo: 'medio', reto: 'x' }, retos: { afirmaciones: { racha: 2 } } })
  });
  const { datos } = leer(a);
  assert.equal(datos.ajustes.modo, 'medio');
  assert.equal(datos.ajustes.reto, 'x');
  assert.deepEqual(datos.retos.imagenes, { partidas: {}, racha: 0, mejorRacha: 0 });
  assert.deepEqual(datos.retos.afirmaciones, { partidas: {}, racha: 2, mejorRacha: 0 });
  assert.deepEqual(conAjustes(datosIniciales(), { reto: 'afirmaciones' }).ajustes, { modo: 'normal', reto: 'afirmaciones' });
});

test('32b. lo guardado de Fact or Fake tampoco contiene datos prohibidos', () => {
  let d = registrarInicio_r(datosIniciales(), T, ini);
  d = registrarPrueba_r(d, T, F, 0, 'A', 's');
  d = registrarFin_r(d, T, F, F, 's');
  assert.deepEqual(Object.keys(partidaDe_r(d, T, F)).sort(), ['aciertos', 'estado', 'modo', 'n', 'resultados', 'sesion']);
  assert.equal(/tapada|motivo|voto|verdad|ficha|texto|ausencia/i.test(JSON.stringify(d)), false);
});
