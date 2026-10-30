import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fechaLocal,
  sumarDias,
  diasEntre,
  numeroCaso,
  msHastaMedianoche,
  formatearCuentaAtras,
  validarCalendario,
  temaValido,
  formatearFecha,
  casoDelDia,
  rutaPrueba,
  ofuscar,
  desofuscar,
  FICHA_BLOQUE,
  FICHA_MAX_BYTES,
  flujoBytes,
  ofuscarBloque,
  desofuscarBloque,
  AFIRMACION_BLOQUE,
  AFIRMACION_MAX_BYTES,
  ACLARACION_BLOQUE,
  ACLARACION_MAX_BYTES,
  DETALLES_MAX,
  ofuscarAfirmacion,
  desofuscarAfirmacion,
  ofuscarAclaracion,
  desofuscarAclaracion,
  flujoFicha,
  ofuscarFicha,
  desofuscarFicha,
  cargarCalendario,
  precargar,
  HOSTS_LOCALES,
  fechaPrevisualizada,
  pruebaActiva,
  diasDePrueba,
  diaDePrueba,
  FECHA_BASE_PRUEBA,
  numeroDelDia,
  fechaDelDia,
  casoDeNumero,
  MES_PATRON,
  AFIRMACIONES_CARPETA,
  mesDeFecha,
  mesDeNumero,
  rutaAfirmaciones,
  afirmacionesVacias,
  validarAfirmaciones,
  afirmacionesDelDia,
  afirmacionesDeNumero,
  afirmacionesDelMes,
  cargarAfirmaciones,
  cargarAfirmacionesPrueba
} from '../js/diario.js';

import * as diario from '../js/diario.js';

const clave = ofuscar([0, 1, 1, 0, 1], 1, () => 0);

function fichasDe(n) {
  return {
    en: [0, 1, 2, 3, 4].map((i) => ofuscarFicha(i % 2 ? `Prompt ${i}` : 'Real photograph', clave, n, i, () => 0.5, 'en')),
    es: [0, 1, 2, 3, 4].map((i) => ofuscarFicha(i % 2 ? `Prompt ${i}` : 'Fotografía real', clave, n, i, () => 0.5, 'es'))
  };
}

const TEMA = { en: 'Dogs', es: 'Perros' };

function diaValido(n) {
  return { n, tema: { ...TEMA }, pruebas: ['a1', 'b2', 'c3', 'd4', 'e5'], clave, fichas: fichasDe(n) };
}

function calendarioValido(lanzamiento = '2026-11-01') {
  return {
    version: 5,
    lanzamiento,
    dias: [diaValido(1), diaValido(2)]
  };
}

test('1. fechaLocal usa la hora local y cambia a medianoche', () => {
  assert.equal(fechaLocal(new Date(2026, 10, 1, 23, 59, 59)), '2026-11-01');
  assert.equal(fechaLocal(new Date(2026, 10, 2, 0, 0, 0)), '2026-11-02');
});

test('2. numeroCaso', () => {
  assert.equal(numeroCaso('2026-11-01', '2026-11-01'), 1);
  assert.equal(numeroCaso('2026-11-02', '2026-11-01'), 2);
  assert.equal(numeroCaso('2026-10-31', '2026-11-01'), 0);
  assert.equal(numeroCaso('2027-03-28', '2026-11-01'), 148);
});

test('3. sumarDias y diasEntre', () => {
  assert.equal(sumarDias('2026-12-31', 1), '2027-01-01');
  assert.equal(sumarDias('2027-03-27', 2), '2027-03-29');
  assert.equal(sumarDias('2026-11-01', -1), '2026-10-31');
  assert.equal(diasEntre('2026-11-01', '2026-10-30'), -2);
});

test('4. msHastaMedianoche', () => {
  assert.equal(msHastaMedianoche(new Date(2026, 10, 1, 23, 59, 0)), 60000);
});

test('5. formatearCuentaAtras', () => {
  assert.equal(formatearCuentaAtras(3_661_000), '01:01:01');
  assert.equal(formatearCuentaAtras(-5), '00:00:00');
  assert.equal(formatearCuentaAtras(1), '00:00:01');
});

test('6. ofuscar y desofuscar: vector de prueba', () => {
  assert.equal(clave, 'Mpb9Ycc=');
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => desofuscar('Mpb9Ycc=', 1, i)), [0, 1, 1, 0, 1]);
});

test('7. ida y vuelta con 200 combinaciones aleatorias', () => {
  for (let k = 0; k < 200; k++) {
    const v = Array.from({ length: 5 }, () => (Math.random() < 0.5 ? 0 : 1));
    const n = 1 + Math.floor(Math.random() * 1000);
    const c = ofuscar(v, n);
    assert.equal(c.length, 8);
    for (let i = 0; i < 5; i++) assert.equal(desofuscar(c, n, i), v[i]);
  }
});

test('8. casoDelDia devuelve null fuera de calendario o con fecha distinta', () => {
  const cal = calendarioValido();
  assert.equal(casoDelDia(cal, '2026-10-31'), null);
  assert.equal(casoDelDia(cal, '2026-11-03'), null);
  assert.equal(casoDelDia(calendarioValido(null), '2026-11-02'), null);
  assert.equal(casoDelDia(calendarioValido(null), '2000-01-02'), null);
  const caso = casoDelDia(cal, '2026-11-02');
  assert.equal(caso.n, 2);
  assert.equal(caso.fecha, '2026-11-02');
  assert.equal(caso.clave, clave);
  assert.deepEqual(caso.tema, TEMA);
  assert.equal(caso.pruebas.length, 5);
  assert.deepEqual(Object.keys(caso).sort(), ['clave', 'fecha', 'fichas', 'n', 'pruebas', 'tema']);
  assert.ok(caso.fichas === cal.dias[1].fichas);
  assert.equal(desofuscarFicha(caso.fichas.en[0], clave, 2, 0), 'Real photograph');
  assert.equal(desofuscarFicha(caso.fichas.es[0], clave, 2, 0, 'es'), 'Fotografía real');
  assert.equal(desofuscarFicha(caso.fichas.es[0], clave, 2, 0, 'en'), null, 'semilla por idioma');
});

test('9. validarCalendario', () => {
  assert.equal(validarCalendario(calendarioValido()), true);

  let c = calendarioValido();
  c.dias[0].pruebas = ['a', 'b', 'c', 'd'];
  assert.equal(validarCalendario(c), false);

  c = calendarioValido();
  c.dias[0].pruebas = ['a', 'b', 'c', 'd', 'e', 'f'];
  assert.equal(validarCalendario(c), false);

  c = calendarioValido();
  c.dias[1].n = 3;
  assert.equal(validarCalendario(c), false);

  c = calendarioValido();
  c.dias[0].clave = 'AAAA';
  assert.equal(validarCalendario(c), false);

  c = calendarioValido();
  c.dias[0].clave = '$$$$$$$$';
  assert.equal(validarCalendario(c), false);

  c = calendarioValido();
  c.dias[0].tipo = 'x';
  assert.equal(validarCalendario(c), false);

  c = calendarioValido();
  c.extra = 1;
  assert.equal(validarCalendario(c), false);

  c = calendarioValido();
  c.dias[0].pruebas = ['a', 'a', 'c', 'd', 'e'];
  assert.equal(validarCalendario(c), false);

  assert.equal(validarCalendario(null), false);

  for (const v of [1, 2, 3, 4, 6]) {
    c = calendarioValido();
    c.version = v;
    assert.equal(validarCalendario(c), false, `version ${v}`);
  }

  assert.equal(validarCalendario(calendarioValido(null)), true);

  c = calendarioValido();
  c.dias[0].fecha = '2026-11-01';
  assert.equal(validarCalendario(c), false);

  for (const l of ['', '2026-13-01', '2026-02-30', 20261201, undefined]) {
    c = calendarioValido();
    c.lanzamiento = l;
    assert.equal(validarCalendario(c), false, String(l));
  }
  c = calendarioValido();
  delete c.lanzamiento;
  assert.equal(validarCalendario(c), false);

  c = calendarioValido();
  delete c.dias[0].fichas;
  assert.equal(validarCalendario(c), false);

  for (const cambio of [
    (f) => f.slice(0, 4),
    (f) => [...f, f[0]],
    (f) => [f[0].slice(0, 683) + '=', ...f.slice(1)].map((x, i) => (i === 0 ? x.slice(0, 683) : x)),
    (f) => [f[0].slice(0, 683) + 'A=', ...f.slice(1)],
    (f) => [f[0].slice(0, 10) + '!' + f[0].slice(11), ...f.slice(1)],
    (f) => [f[0].slice(0, 683) + 'A', ...f.slice(1)],
    (f) => [7, ...f.slice(1)],
    () => 'no es un array'
  ]) {
    for (const idioma of ['en', 'es']) {
      c = calendarioValido();
      c.dias[0].fichas[idioma] = cambio(c.dias[0].fichas[idioma]);
      assert.equal(validarCalendario(c), false, idioma);
    }
  }

  c = calendarioValido();
  delete c.dias[0].tema;
  assert.equal(validarCalendario(c), false);

  for (const malo of ['', 'A'.repeat(31), ' Perros', 'Perros ', 'Per'+String.fromCharCode(10)+'ros', 'Per{ros', 'Per}ros', 'perros', 5]) {
    for (const idioma of ['en', 'es']) {
      c = calendarioValido();
      c.dias[1].tema[idioma] = malo;
      assert.equal(validarCalendario(c), false, `${idioma}: ${String(malo)}`);
    }
  }

  // v5: tema y fichas en los dos idiomas, y nada más.
  c = calendarioValido();
  c.version = 4;
  assert.equal(validarCalendario(c), false);
  for (const tema of ['Perros', { en: 'Dogs' }, { es: 'Perros' }, { en: 'Dogs', es: 'Perros', fr: 'Chiens' }]) {
    c = calendarioValido();
    c.dias[0].tema = tema;
    assert.equal(validarCalendario(c), false, JSON.stringify(tema));
  }
  c = calendarioValido();
  c.dias[0].fichas = c.dias[0].fichas.en;
  assert.equal(validarCalendario(c), false);
  c = calendarioValido();
  delete c.dias[0].fichas.es;
  assert.equal(validarCalendario(c), false);
  c = calendarioValido();
  c.dias[0].fichas.es.pop();
  assert.equal(validarCalendario(c), false);
  c = calendarioValido();
  c.dias[0].fichas.fr = c.dias[0].fichas.en;
  assert.equal(validarCalendario(c), false);
});

test('temaValido', () => {
  assert.equal(temaValido('Table with food'), true);
  assert.equal(temaValido('Éclair'), true);
  assert.equal(temaValido('A'.repeat(30)), true);
  assert.equal(temaValido('A'.repeat(31)), false);
  assert.equal(temaValido(''), false);
  assert.equal(temaValido('dogs'), false);
  assert.equal(temaValido(null), false);
});

test('rutaPrueba es relativa', () => {
  assert.equal(rutaPrueba('abc'), 'casos/abc.webp');
});

test('cargarCalendario: ok, respuesta no ok y estructura inválida', async () => {
  const cal = calendarioValido();
  let llamada;
  const pedirOk = async (url, opciones) => {
    llamada = { url, opciones };
    return { ok: true, json: async () => cal };
  };
  assert.deepEqual(await cargarCalendario('data/calendario.json', pedirOk), cal);
  assert.equal(llamada.url, 'data/calendario.json');
  assert.equal(llamada.opciones.cache, 'no-cache');
  await assert.rejects(cargarCalendario('x', async () => ({ ok: false, status: 404 })));
  await assert.rejects(cargarCalendario('x', async () => ({ ok: true, json: async () => ({}) })));
  await assert.rejects(
    cargarCalendario('x', async () => ({
      ok: true,
      json: async () => {
        throw new Error('no es JSON');
      }
    }))
  );
});

test('10. precargar: rechaza si una imagen falla y resuelve con 5 decodificadas', async () => {
  const ids = ['a1', 'b2', 'c3', 'd4', 'e5'];
  const creadas = [];
  const fabrica = (fallar) => () => {
    const img = {
      decodificada: false,
      decode() {
        if (this.src === `casos/${fallar}.webp`) return Promise.reject(new Error('fallo'));
        return new Promise((r) =>
          setImmediate(() => {
            this.decodificada = true;
            r();
          })
        );
      }
    };
    creadas.push(img);
    return img;
  };
  await assert.rejects(precargar(ids, fabrica('c3')));
  creadas.length = 0;
  const imgs = await precargar(ids, fabrica(null));
  assert.equal(imgs.length, 5);
  assert.ok(imgs.every((i) => i.decodificada && i.decoding === 'async'));
  assert.deepEqual(imgs.map((i) => i.src), ids.map(rutaPrueba));
});

test('104. fechaPrevisualizada', () => {
  for (const h of ['localhost', '127.0.0.1', '[::1]']) {
    assert.equal(fechaPrevisualizada('?fecha=2026-11-03', h), '2026-11-03');
  }
  assert.equal(fechaPrevisualizada('fecha=2026-11-03', 'localhost'), '2026-11-03');
  assert.equal(fechaPrevisualizada('?modo=x&fecha=2026-11-03', 'localhost'), '2026-11-03');
  assert.equal(fechaPrevisualizada('?fecha=2026-11-03&fecha=2026-11-04', 'localhost'), '2026-11-03');
  assert.equal(fechaPrevisualizada('?fecha=2028-02-29', 'localhost'), '2028-02-29');
  assert.equal(fechaPrevisualizada('?fecha=2025-01-01', 'localhost'), '2025-01-01');
  for (const h of ['usuario.github.io', '192.168.1.10', '0.0.0.0', '::1', 'LOCALHOST', 'localhost.', 'mi-localhost.com', '']) {
    assert.equal(fechaPrevisualizada('?fecha=2026-11-03', h), null, h);
  }
  const malas = ['', '?', '?fecha=', '?fecha=2026-02-30', '?fecha=2027-02-29', '?fecha=2026-13-01', '?fecha=2026-00-10',
    '?fecha=2026-11-3', '?fecha=26-11-03', '?fecha=2026/11/03', '?fecha=2026-11-03x', '?fecha=%202026-11-03',
    '?fecha=2026-11-03T00:00', '?Fecha=2026-11-03'];
  for (const q of malas) assert.equal(fechaPrevisualizada(q, 'localhost'), null, q);
  assert.deepEqual(HOSTS_LOCALES, ['localhost', '127.0.0.1', '[::1]']);
});

test('115. pruebaActiva', () => {
  for (const s of ['?prueba=1', 'prueba=1', '?dia=3&prueba=1', '?prueba=1&prueba=0']) {
    assert.equal(pruebaActiva(s, true), true, s);
  }
  for (const a of [false, 1, 'true', undefined]) assert.equal(pruebaActiva('?prueba=1', a), false);
  for (const s of ['', '?', '?prueba=', '?prueba=0', '?prueba=true', '?prueba=01', '?prueba=%201', '?Prueba=1', '?prueba=0&prueba=1']) {
    assert.equal(pruebaActiva(s, true), false, s);
  }
});

function congelar(o) {
  Object.values(o).forEach((v) => typeof v === 'object' && v !== null && congelar(v));
  return Object.freeze(o);
}

// Archivo mensual de ejemplo: días n0..n1 del mes indicado (temas T{n}).
function mesDeEjemplo(mes, n0, n1) {
  const dias = [];
  for (let n = n0; n <= n1; n++) {
    const textos = Object.fromEntries(['en', 'es'].map((l) => [l, [0, 1, 2, 3, 4].map((i) => ofuscarAfirmacion(`Claim ${i}.`, clave, n, i, () => 0.5, l))]));
    const fichas = Object.fromEntries(
      ['en', 'es'].map((l) => [l, [0, 1, 2, 3, 4].map((i) => ofuscarAclaracion({ aclaracion: 'Truth.', detalles: ['One.', 'Two.', 'Three.'].slice(0, i % 4) }, clave, n, i, () => 0.5, l))])
    );
    dias.push({ n, tema: { en: `Topic${n}`, es: `Tema${n}` }, clave, textos, fichas });
  }
  return { version: 2, mes, dias };
}

function calendarioDe(n, lanzamiento = null) {
  return { version: 5, lanzamiento, dias: Array.from({ length: n }, (_, k) => diaValido(k + 1)) };
}

test('115. diasDePrueba: unión de calendario y todos los meses, solo n y temas', () => {
  const cal = calendarioDe(35);
  const meses = [mesDeEjemplo('2000-01', 1, 31), mesDeEjemplo('2000-02', 32, 40)];
  congelar(cal);
  congelar(meses);
  const r = diasDePrueba(cal, meses);
  assert.equal(r.length, 40);
  r.forEach((d, k) => {
    assert.deepStrictEqual(Object.keys(d), ['n', 'temaImagenes', 'temaAfirmaciones']);
    assert.equal(d.n, k + 1);
    assert.deepEqual(d.temaImagenes, k < 35 ? TEMA : null);
    assert.deepEqual(d.temaAfirmaciones, { en: `Topic${k + 1}`, es: `Tema${k + 1}` });
  });
  const soloCal = diasDePrueba(cal, null);
  assert.equal(soloCal.length, 35);
  assert.ok(soloCal.every((d) => d.temaAfirmaciones === null && d.temaImagenes.es === 'Perros'));
  for (const m of [undefined, {}, [], [afirmacionesVacias('2000-01')]]) {
    assert.deepStrictEqual(diasDePrueba(cal, m), soloCal);
    assert.deepStrictEqual(diasDePrueba(null, m), []);
  }
  assert.deepStrictEqual(diasDePrueba(null, undefined), []);
  assert.deepStrictEqual(diasDePrueba({}, null), []);
  // elemento inválido y días que no son de su mes
  const roto = mesDeEjemplo('2000-01', 1, 3);
  roto.extra = 1;
  assert.deepStrictEqual(diasDePrueba(calendarioDe(0), [roto]), []);
  const cruzado = mesDeEjemplo('2000-01', 32, 33);
  assert.deepStrictEqual(diasDePrueba(calendarioDe(0), [cruzado]), []);
  assert.deepStrictEqual(diasDePrueba(calendarioDe(0), [mesDeEjemplo('2000-01', 30, 32)]).map((d) => d.n), [30, 31]);
  // con lanzamiento real
  const l = diasDePrueba(calendarioDe(0, '2026-12-15'), [mesDeEjemplo('2026-12', 1, 17), mesDeEjemplo('2027-01', 18, 20)]);
  assert.deepStrictEqual(l.map((d) => d.n), Array.from({ length: 20 }, (_, k) => k + 1));
});

test('117. diaDePrueba', () => {
  const dias = Array.from({ length: 7 }, (_, i) => ({ n: i + 1, temaImagenes: 'T', temaAfirmaciones: null }));
  assert.equal(diaDePrueba('?prueba=1&dia=3', dias, null), dias[2]);
  for (const q of ['?prueba=1', '?prueba=1&dia=0', '?prueba=1&dia=08', '?prueba=1&dia=x', '?prueba=1&dia=9', '?prueba=1&dia=']) {
    assert.equal(diaDePrueba(q, dias, null), dias[0], q);
    assert.equal(diaDePrueba(q, dias, 99), dias[0], q);
  }
  assert.equal(diaDePrueba('?prueba=1', dias, 4), dias[3]);
  assert.equal(diaDePrueba('?prueba=1&dia=2', dias, 4), dias[1]);
  assert.equal(diaDePrueba('?prueba=1&dia=99', dias, 4), dias[3]);
  assert.equal(diaDePrueba('?prueba=1&dia=1', [], null), null);
  assert.equal(diaDePrueba('?prueba=1', null, 1), null);
});

test('149. numeroDelDia y fechaDelDia', () => {
  assert.equal(numeroDelDia('2026-11-30', '2026-12-01'), null);
  assert.equal(numeroDelDia('2026-12-01', '2026-12-01'), 1);
  assert.equal(numeroDelDia('2026-12-03', '2026-12-01'), 3);
  assert.equal(numeroDelDia('2026-12-01', null), null);
  assert.equal(fechaDelDia(null, 3), null);
  assert.equal(fechaDelDia('2026-12-01', 3), '2026-12-03');
  assert.equal(FECHA_BASE_PRUEBA, '2000-01-01');
});

test('150. casoDeNumero', () => {
  const sin = calendarioValido(null);
  const c = casoDeNumero(sin, 2);
  assert.equal(c.n, 2);
  assert.equal(c.fecha, '2000-01-02');
  assert.deepEqual(Object.keys(c).sort(), ['clave', 'fecha', 'fichas', 'n', 'pruebas', 'tema']);
  const con = calendarioValido('2026-12-01');
  assert.equal(casoDeNumero(con, 2).fecha, fechaDelDia('2026-12-01', 2));
  assert.ok(casoDeNumero(con, 2).fichas === con.dias[1].fichas);
  for (const n of [0, 3, -1, 1.5, '1']) assert.equal(casoDeNumero(con, n), null, String(n));
});

test('211. mesDeFecha, mesDeNumero y rutaAfirmaciones', () => {
  assert.equal(mesDeFecha('2026-12-15'), '2026-12');
  for (const x of ['2026-02-30', 'x', null, undefined]) assert.equal(mesDeFecha(x), null);
  assert.equal(mesDeNumero(null, 1), '2000-01');
  assert.equal(mesDeNumero(null, 31), '2000-01');
  assert.equal(mesDeNumero(null, 32), '2000-02');
  assert.equal(mesDeNumero(null, 60), '2000-02');
  assert.equal(mesDeNumero(null, 61), '2000-03');
  assert.equal(mesDeNumero('2026-12-15', 17), '2026-12');
  assert.equal(mesDeNumero('2026-12-15', 18), '2027-01');
  assert.equal(mesDeNumero('2026-12-15', 49), '2027-02');
  for (const n of [0, 1.5, '3']) assert.equal(mesDeNumero(null, n), null);
  assert.equal(mesDeNumero('2026-13-01', 1), null);
  assert.equal(rutaAfirmaciones('2026-12'), 'data/facts/2026-12.json');
  assert.equal(rutaAfirmaciones('2026-1'), null);
  assert.equal(rutaAfirmaciones('../x'), null);
  assert.equal(AFIRMACIONES_CARPETA, 'data/facts/');
  assert.ok(MES_PATRON.test('2026-12') && !MES_PATRON.test('2026-13'));
  assert.equal(diario.diaPedido, undefined);
});

test('172. validarAfirmaciones', () => {
  const ok = () => mesDeEjemplo('2000-02', 32, 34);
  assert.equal(validarAfirmaciones(ok(), '2000-02'), true);
  assert.equal(validarAfirmaciones(ok()), true);
  const malos = [
    (o) => { o.version = 1; },
    (o) => { o.version = 3; },
    (o) => { delete o.mes; },
    (o) => { o.mes = '2026-13'; },
    (o) => { o.dias = []; },
    (o) => { o.extra = 1; },
    (o) => { o.lanzamiento = '2026-12-01'; },
    (o) => { o.dias[1].extra = 1; },
    (o) => { o.dias[1].n = 40; },
    (o) => { o.dias[0].n = 0; },
    (o) => { o.dias[0].textos.en.pop(); },
    (o) => { o.dias[0].textos.es.push(o.dias[0].textos.es[0]); },
    (o) => { o.dias[0].fichas.es.pop(); },
    (o) => { o.dias[0].fichas.en.push(o.dias[0].fichas.en[0]); },
    (o) => { o.dias[0].textos.en[0] = o.dias[0].textos.en[0].slice(0, 682) + '='; },
    (o) => { o.dias[0].textos.es[0] = o.dias[0].textos.es[0].slice(0, 683) + 'A='; },
    (o) => { o.dias[0].fichas.en[0] = o.dias[0].fichas.en[0].slice(0, 682) + '='; },
    (o) => { o.dias[0].fichas.es[0] = o.dias[0].fichas.es[0].slice(0, 683) + 'A='; },
    (o) => { o.dias[0].textos = o.dias[0].textos.en; },
    (o) => { delete o.dias[0].fichas.es; },
    (o) => { o.dias[0].textos.fr = o.dias[0].textos.en; },
    (o) => { o.dias[0].tema = 'Perros'; },
    (o) => { o.dias[0].tema = { en: 'perros', es: 'Perros' }; },
    (o) => { o.dias[0].tema = { en: 'Dogs', es: 'perros' }; },
    (o) => { o.dias[0].clave = 'AAAA'; }
  ];
  malos.forEach((mal, k) => {
    const o = ok();
    mal(o);
    assert.equal(validarAfirmaciones(o, '2000-02'), false, `caso ${k}`);
  });
  assert.equal(validarAfirmaciones(ok(), '2000-03'), false);
  assert.equal(validarAfirmaciones(null, '2000-02'), false);
  assert.equal(validarAfirmaciones([], '2000-02'), false);
});

test('173. afirmacionesDelDia y afirmacionesDeNumero', () => {
  const l = '2026-12-15';
  const tit = mesDeEjemplo('2027-01', 18, 48);
  const d = afirmacionesDelDia(tit, l, '2027-01-01');
  assert.equal(d.n, 18);
  assert.equal(d.fecha, '2027-01-01');
  assert.deepEqual(Object.keys(d).sort(), ['clave', 'fecha', 'fichas', 'n', 'tema', 'textos']);
  assert.ok(d.textos === tit.dias[0].textos);
  assert.equal(afirmacionesDelDia(tit, l, '2026-12-31'), null);
  assert.equal(afirmacionesDelDia(tit, null, '2027-01-01'), null);
  assert.equal(afirmacionesDelDia(null, l, '2027-01-01'), null);
  const feb = mesDeEjemplo('2000-02', 32, 60);
  const e = afirmacionesDeNumero(feb, null, 32);
  assert.equal(e.n, 32);
  assert.equal(e.fecha, '2000-02-01');
  assert.equal(afirmacionesDeNumero(feb, null, 31), null);
  assert.equal(afirmacionesDeNumero(feb, null, 61), null);
  assert.equal(afirmacionesDeNumero(afirmacionesVacias('2000-02'), null, 32), null);
  assert.equal(afirmacionesDeNumero(null, null, 32), null);
});

function respuesta(status, cuerpo) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (cuerpo instanceof Error) throw cuerpo;
      return cuerpo;
    }
  };
}

function pedirDe(archivos, rutas = [], opciones = []) {
  return async (url, op) => {
    rutas.push(url);
    opciones.push(op);
    const a = archivos[url];
    if (a instanceof Error) throw a;
    return a === undefined ? respuesta(404) : respuesta(200, a);
  };
}

test('212. cargarAfirmaciones', async () => {
  const mes = mesDeEjemplo('2026-12', 1, 17);
  const rutas = [];
  const ops = [];
  const r = await cargarAfirmaciones('2026-12-15', pedirDe({ 'data/facts/2026-12.json': mes }, rutas, ops));
  assert.equal(r, mes);
  assert.deepEqual(rutas, ['data/facts/2026-12.json']);
  assert.deepEqual(ops, [{ cache: 'no-cache' }]);
  assert.deepEqual(await cargarAfirmaciones('2026-12-15', pedirDe({})), afirmacionesVacias('2026-12'));
  const ruta = 'data/facts/2026-12.json';
  await assert.rejects(cargarAfirmaciones('2026-12-15', async () => respuesta(500)));
  await assert.rejects(cargarAfirmaciones('2026-12-15', pedirDe({ [ruta]: new Error('red') })));
  await assert.rejects(cargarAfirmaciones('2026-12-15', async () => respuesta(200, new Error('json'))));
  await assert.rejects(cargarAfirmaciones('2026-12-15', pedirDe({ [ruta]: mesDeEjemplo('2026-11', 1, 3) })));
  await assert.rejects(cargarAfirmaciones('2026-12-15', pedirDe({ [ruta]: { version: 1 } })));
  let llamadas = 0;
  await assert.rejects(cargarAfirmaciones('2026-13-01', async () => { llamadas++; return respuesta(404); }));
  assert.equal(llamadas, 0);
});

test('222. cargarAfirmacionesPrueba', async () => {
  const ene = mesDeEjemplo('2000-01', 1, 31);
  const feb40 = mesDeEjemplo('2000-02', 32, 40);
  const feb60 = mesDeEjemplo('2000-02', 32, 60);
  const A = 'data/facts/2000-01.json';
  const B = 'data/facts/2000-02.json';
  const C = 'data/facts/2000-03.json';

  let rutas = [];
  let ops = [];
  let r = await cargarAfirmacionesPrueba(null, pedirDe({ [A]: ene, [B]: feb40 }, rutas, ops));
  assert.deepEqual(rutas, [A, B]);
  assert.deepEqual(ops, [{ cache: 'no-cache' }, { cache: 'no-cache' }]);
  assert.deepEqual(r, [ene, feb40]);

  rutas = [];
  r = await cargarAfirmacionesPrueba(null, pedirDe({ [A]: ene, [B]: feb60 }, rutas));
  assert.deepEqual(rutas, [A, B, C]);
  assert.equal(r.length, 2);

  rutas = [];
  assert.deepEqual(await cargarAfirmacionesPrueba(null, pedirDe({}, rutas)), []);
  assert.deepEqual(rutas, [A]);

  await assert.rejects(cargarAfirmacionesPrueba(null, async (u) => (u === A ? respuesta(200, ene) : respuesta(500))));
  await assert.rejects(cargarAfirmacionesPrueba(null, pedirDe({ [A]: ene, [B]: new Error('red') })));
  await assert.rejects(cargarAfirmacionesPrueba(null, async (u) => (u === A ? respuesta(200, ene) : respuesta(200, new Error('json')))));
  await assert.rejects(cargarAfirmacionesPrueba(null, pedirDe({ [A]: ene, [B]: { version: 1 } })));

  assert.deepEqual(await cargarAfirmacionesPrueba(null, pedirDe({ [A]: ene, [B]: mesDeEjemplo('2000-02', 33, 40) })), [ene]);
  rutas = [];
  assert.deepEqual(await cargarAfirmacionesPrueba(null, pedirDe({ [A]: mesDeEjemplo('2000-01', 1, 32) }, rutas)), []);
  assert.deepEqual(rutas, [A]);

  const dic = mesDeEjemplo('2026-12', 1, 17);
  const ene27 = mesDeEjemplo('2027-01', 18, 20);
  rutas = [];
  r = await cargarAfirmacionesPrueba('2026-12-15', pedirDe({ 'data/facts/2026-12.json': dic, 'data/facts/2027-01.json': ene27 }, rutas));
  assert.deepEqual(rutas, ['data/facts/2026-12.json', 'data/facts/2027-01.json']);
  assert.equal(r.length, 2);

  let llamadas = 0;
  await assert.rejects(cargarAfirmacionesPrueba('2026-13-01', async () => { llamadas++; return respuesta(404); }));
  assert.equal(llamadas, 0);

  // en serie: la segunda petición no empieza hasta que termina la primera
  let activas = 0;
  let maxActivas = 0;
  const lento = async (url) => {
    activas++;
    maxActivas = Math.max(maxActivas, activas);
    await new Promise((res) => setTimeout(res, 15));
    activas--;
    return url === A ? respuesta(200, ene) : url === B ? respuesta(200, feb40) : respuesta(404);
  };
  assert.equal((await cargarAfirmacionesPrueba(null, lento)).length, 2);
  assert.equal(maxActivas, 1);
});

test('223. afirmacionesDelMes', () => {
  const ene = mesDeEjemplo('2000-01', 1, 31);
  const feb = mesDeEjemplo('2000-02', 32, 60);
  const meses = [ene, feb];
  assert.ok(afirmacionesDelMes(meses, '2000-02') === feb);
  assert.deepEqual(afirmacionesDelMes(meses, '2000-03'), afirmacionesVacias('2000-03'));
  assert.deepEqual(afirmacionesDelMes(null, '2000-02'), afirmacionesVacias('2000-02'));
  assert.deepEqual(afirmacionesDelMes({}, '2000-02'), afirmacionesVacias('2000-02'));
  assert.equal(afirmacionesDelMes(meses, '2000-13'), null);
  const mes35 = afirmacionesDeNumero(afirmacionesDelMes(meses, mesDeNumero(null, 35)), null, 35);
  assert.equal(mes35.n, 35);
  assert.equal(mes35.fecha, '2000-02-04');
});

const CL = 'Mpb9Ycc=';

test('139. flujoFicha: 512 bytes deterministas y vector de regresión', () => {
  const f = flujoFicha(CL, 1, 0);
  assert.equal(f.length, FICHA_BLOQUE);
  assert.equal(FICHA_BLOQUE, 512);
  assert.equal(FICHA_MAX_BYTES, 510);
  assert.ok([...f].every((b) => Number.isInteger(b) && b >= 0 && b <= 255));
  assert.deepEqual([...flujoFicha(CL, 1, 0)], [...f]);
  // Vector de regresión (4.3.1): cambiarlo invalida el calendario publicado.
  assert.deepEqual([...f.slice(0, 8)], [140, 64, 54, 92, 177, 170, 222, 108]);
  assert.equal(
    ofuscarFicha('Real photograph', CL, 1, 0, () => 0),
    'jE9kOdDG/hxQlPK/5kFXug0CQJS2kY4Y8dkbgLBUUi1lyBB4U2ipzadweUOy+9giNc0e7LD1iSKfgLCHBcvemRFsOA2UtuVnVo7HYR9s/UeIt0TEEA08yCFQIC/o0FHwd5Z/VZsnLU1ytDF1WdtpO4+GqrNepMNz8yCJbtDSZQxMZ4OLXn+UwFLdtB7VsrSdGo6h8gbsG9sd/w8zY/6jP08HHd2N2ZCgIlFkQK8bIvCH3Q5FzcJkLJ4WYnL0j649Uc9VyZJzwB2oHL87rt60S/ibb3w/3OijhBHpJOpSC6Q4dr2yEVAZZOpln5PTnOlgEtxHVKmfSzQj/EuNlaSU/Qh+UL+h6GxX0EGEIGpc2F0WB9tnGpMRpTvLDP1mEvXk6czBidSa+01cuPCZdKmD2UunzLqKv+R5X4+k7knAhUyOaEEbGxYejkflSSidsswIATzr8vu52snzKNsWzkaOS/pfQS1TFGO9Bmwuhj4crIWU1CXMbx+uOuyx2l5pKgNo6uPG8sl9D3knqUzUNpmoXBsUV7Hax+3jUmPSvnrxqdd7ainaPefeOMU/JxJ+RWA7BcLTVujr+WWDpEA5PWlya+uceovdLGanddCUOXiI75psE8XcwAvlOFn25J/elFCuBrh2H2DL1ZTjOzCHBjekCdM9jqeyzlIKp5UufR0XTaU='
  );
});

test('139. ofuscarFicha y desofuscarFicha: ida y vuelta, formato y relleno', () => {
  const textos = ['', 'Real photograph', 'ñandú 🐕 «comillas»\nsegunda línea', 'é'.repeat(255)];
  assert.equal(new TextEncoder().encode(textos[3]).length, 510);
  for (const t of textos) {
    const f = ofuscarFicha(t, CL, 4, 2);
    assert.match(f, /^[A-Za-z0-9+/]{683}=$/);
    assert.equal(desofuscarFicha(f, CL, 4, 2), t);
  }
  const a = ofuscarFicha('hola', CL, 1, 0, () => 0.1);
  assert.equal(ofuscarFicha('hola', CL, 1, 0, () => 0.1), a);
  const b = ofuscarFicha('hola', CL, 1, 0, () => 0.9);
  assert.notEqual(a, b);
  assert.equal(desofuscarFicha(b, CL, 1, 0), 'hola');
  // el flujo depende de clave, n e indice
  const base = ofuscarFicha('hola', CL, 1, 0, () => 0);
  assert.notEqual(ofuscarFicha('hola', 'Ax7Pq1E=', 1, 0, () => 0), base);
  assert.notEqual(ofuscarFicha('hola', CL, 2, 0, () => 0), base);
  assert.notEqual(ofuscarFicha('hola', CL, 1, 1, () => 0), base);
  // con otro flujo no descifra el mismo texto
  assert.notEqual(desofuscarFicha(base, CL, 1, 1), 'hola');
});

test('139. ofuscarFicha: errores', () => {
  assert.throws(() => ofuscarFicha('a'.repeat(511), CL, 1, 0), RangeError);
  assert.throws(() => ofuscarFicha('é'.repeat(256), CL, 1, 0), RangeError);
  assert.throws(() => ofuscarFicha(null, CL, 1, 0), TypeError);
  assert.throws(() => ofuscarFicha(5, CL, 1, 0), TypeError);
});

test('139. desofuscarFicha devuelve null sin lanzar', () => {
  const ok = ofuscarFicha('hola', CL, 1, 0, () => 0);
  for (const malo of [ok.slice(0, 683), ok + 'A', ok.slice(0, 10) + '!' + ok.slice(11), ok.slice(0, 683) + 'A', null, undefined, 5, {}]) {
    assert.equal(desofuscarFicha(malo, CL, 1, 0), null);
  }
  const cifrar = (bloque) => {
    const flujo = flujoFicha(CL, 1, 0);
    return btoa(String.fromCharCode(...bloque.map((b, k) => b ^ flujo[k])));
  };
  const largo511 = new Uint8Array(512);
  largo511[0] = 1;
  largo511[1] = 255;
  assert.equal(desofuscarFicha(cifrar(largo511), CL, 1, 0), null);
  const invalido = new Uint8Array(512);
  invalido[1] = 2;
  invalido[2] = 0xc3;
  invalido[3] = 0x28;
  assert.equal(desofuscarFicha(cifrar(invalido), CL, 1, 0), null);
  const vacio = new Uint8Array(512);
  assert.equal(desofuscarFicha(cifrar(vacio), CL, 1, 0), '');
});

test('el calendario de ejemplo no contiene textos de fichas en claro', () => {
  const texto = JSON.stringify(calendarioValido());
  assert.equal(/photograph|Prompt/i.test(texto), false);
  assert.ok(calendarioValido().dias.every((d) => ['en', 'es'].every((l) => d.fichas[l].every((f) => f.length === 684))));
});

test('formatearFecha: inglés americano, determinista', () => {
  assert.equal(formatearFecha('2026-11-03'), 'Nov 3, 2026');
  assert.equal(formatearFecha('2026-01-31'), 'Jan 31, 2026');
  assert.equal(formatearFecha('2026-12-09'), 'Dec 9, 2026');
  assert.equal(formatearFecha('2026-13-01'), '2026-13-01');
  assert.equal(formatearFecha('basura'), 'basura');
});

const cifrarBloque = (bloque, semilla) => {
  const flujo = flujoBytes(semilla, bloque.length);
  return btoa(String.fromCharCode(...bloque.map((b, k) => b ^ flujo[k])));
};
const bloqueDe = (largoBloque, ...bytes) => {
  const b = new Uint8Array(largoBloque);
  b.set(bytes);
  return b;
};

test('167. flujoFicha es flujoBytes con la semilla de la ficha y ofuscarFicha sigue dando el vector de D-92', () => {
  assert.deepEqual([...flujoFicha(CL, 1, 0)], [...flujoBytes(`${CL}|1|0`, 512)]);
  assert.deepEqual([...flujoFicha(CL, 7, 3)], [...flujoBytes(`${CL}|7|3`, 512)]);
  assert.equal(flujoBytes('x', 1024).length, 1024);
  assert.deepEqual([...flujoBytes('x', 16)], [...flujoBytes('x', 1024).slice(0, 16)]);
  assert.deepEqual([...flujoBytes(`${CL}|1|0`, 8)], [140, 64, 54, 92, 177, 170, 222, 108]);
  const bytes = new TextEncoder().encode('Real photograph');
  assert.equal(ofuscarBloque(bytes, `${CL}|1|0`, 512, () => 0), ofuscarFicha('Real photograph', CL, 1, 0, () => 0));
  assert.deepEqual([...desofuscarBloque(ofuscarBloque(bytes, 's', 512), 's', 512)], [...bytes]);
  assert.deepEqual([...desofuscarBloque(ofuscarBloque(bytes, 's', 1024), 's', 1024)], [...bytes]);
  assert.throws(() => ofuscarBloque(new Uint8Array(511), 's', 512), RangeError);
  assert.equal(ofuscarBloque(new Uint8Array(510), 's', 512).length, 684);
  assert.equal(ofuscarBloque(new Uint8Array(1022), 's', 1024).length, 1368);
  for (const malo of [null, 5, '', 'A'.repeat(684), 'A'.repeat(683) + '=', '!'.repeat(683) + '=']) {
    assert.equal(desofuscarBloque(malo, 's', 1024), null);
  }
  assert.equal(desofuscarBloque(ofuscarBloque(bytes, 's', 512), 's', 1024), null);
  assert.equal(desofuscarBloque(cifrarBloque(bloqueDe(512, 1, 255), 's'), 's', 512), null);
});

// Vectores de regresión de Fact or Fake (4.8), con aleatorio = () => 0:
//   ofuscarAfirmacion('Test claim.', 'Mpb9Ycc=', 1, 0, () => 0)
//     = jJUSnRT/oxx8vuB2fffgulbHNx6sQmwbEiv25lgZtrBxNN3e+cbp3CbFytsyWntZ5wE5SL4oT3FEra9UPZj6SLkOjUOtQRf5BDjI7flJLYj86KRuuR1w3+7nOGpEh+nK6lOz+oid3C+27ChHG4mi3s1fcti33FSKJfe/qkG3UZb9Lwkc7LCK6EipJCvOnQ7In2qbZAqmHTAGcjoevO4u0slulGAykOyqs3b4gHBAFZz7s69ZTdt/+WeA+DM2cn6qbr4YOIvK+4SbmAWcFJm0v3a19rRxHH38BhCaCa7uXNAJlOL5ytyqwZL8gGxQTBroMcVhQJ/oG1yZ1BvD+qDBg+K+X8l5IL6jrj2mW51sRpYuY/3BKHd3gPlDILmDt1fIIl7K33oL5CNqKD9N/4cSNohL0CJ17VeimJ6Pz4jSVS7Y4lARyeO7b/LvQg6xqRF83Z6CKm4ZhjvWzVgHoit0EcLotLra63eYVfEZc1EOYO7GmnCS3kOmBTMKN4odVXhxiDp3nD6oDidevx10VZt916cgcrKlP1dbV/ysL9O8R8smnogVJk6IX9Z1IGvhah6nFRR98RDxITAmgI03NrIHO64CHb5/XaHNXovDn97sove2I0MArXRS4JcYdTlGJAbJ+feZDbw8ksqoLAPjNldT0o8G0bEqW7IFxAFXUxFUtwM=
//   ofuscarAclaracion({aclaracion: 'Test truth.', detalles: ['One.', 'Two.']}, 'Mpb9Ycc=', 1, 0, () => 0)
//     = 5r3RasQkU5PxSD+QV5XV8rSpPG/aVoXJdpPNeSQwzh22Dad9F86JJYfY1oOfSwgXqrhUBawYheMZ6qpESQzznEMVbTBcjJluUYJBE7q0kub/pKcr6p0bhC23VLyOmRmLbOg6BnsZ6VuB/ZrOC/+tk1FwRVIRn8UgmC6vc7FDR4640rsxfYvQIpYJVwmiTDtPzap5Z/C/CbnkVFgTvso8qOZ3i8TBfh05qnRwFJG6YUThkOdov/rGViONPE+6CcTcofxKPWMt6aDwyCBaQhewdjJx92MiH7etbqaEbWBmaaYPbo07B1uDgJpILOumpckJ6aBDPgfVXIMxjVig9rB5clrXAiAPpq9Nue+o0D0yfcNycFmhkjDBgIMLVegSBJSaPOz1C6VLmdL9M6yMYdRXoTZYy66/09W+ySEZWiI2vyerlhQ23CQpZMxhkCHrf7vcrIS9I+8oHZYYPKmCU929ALOUPHTYGyy7jqM2zGAEz51m2Yk3M3wvsXunAd0hNd15m323i9CrzXVnfPH82t5ttbWPd9khFWr+9Cm9AQIbU4P7K1w3h4EAzyzwXRznxoaMxdCJ7j6JaJWoohkwF/xPvOh640XSbtpDHI3DjMvvqJs1zMG80o95NWTIpzKbPrhYo/Gv4IgOuUCD8QjciXZBG1iZskgki3pB6CVh8IpD4t4=
// Cambiarlos invalida los archivos data/facts/ publicados.
const VEC_AFIRMACION = 'jJUSnRT/oxx8vuB2fffgulbHNx6sQmwbEiv25lgZtrBxNN3e+cbp3CbFytsyWntZ5wE5SL4oT3FEra9UPZj6SLkOjUOtQRf5BDjI7flJLYj86KRuuR1w3+7nOGpEh+nK6lOz+oid3C+27ChHG4mi3s1fcti33FSKJfe/qkG3UZb9Lwkc7LCK6EipJCvOnQ7In2qbZAqmHTAGcjoevO4u0slulGAykOyqs3b4gHBAFZz7s69ZTdt/+WeA+DM2cn6qbr4YOIvK+4SbmAWcFJm0v3a19rRxHH38BhCaCa7uXNAJlOL5ytyqwZL8gGxQTBroMcVhQJ/oG1yZ1BvD+qDBg+K+X8l5IL6jrj2mW51sRpYuY/3BKHd3gPlDILmDt1fIIl7K33oL5CNqKD9N/4cSNohL0CJ17VeimJ6Pz4jSVS7Y4lARyeO7b/LvQg6xqRF83Z6CKm4ZhjvWzVgHoit0EcLotLra63eYVfEZc1EOYO7GmnCS3kOmBTMKN4odVXhxiDp3nD6oDidevx10VZt916cgcrKlP1dbV/ysL9O8R8smnogVJk6IX9Z1IGvhah6nFRR98RDxITAmgI03NrIHO64CHb5/XaHNXovDn97sove2I0MArXRS4JcYdTlGJAbJ+feZDbw8ksqoLAPjNldT0o8G0bEqW7IFxAFXUxFUtwM=';
const VEC_ACLARACION = '5r3RasQkU5PxSD+QV5XV8rSpPG/aVoXJdpPNeSQwzh22Dad9F86JJYfY1oOfSwgXqrhUBawYheMZ6qpESQzznEMVbTBcjJluUYJBE7q0kub/pKcr6p0bhC23VLyOmRmLbOg6BnsZ6VuB/ZrOC/+tk1FwRVIRn8UgmC6vc7FDR4640rsxfYvQIpYJVwmiTDtPzap5Z/C/CbnkVFgTvso8qOZ3i8TBfh05qnRwFJG6YUThkOdov/rGViONPE+6CcTcofxKPWMt6aDwyCBaQhewdjJx92MiH7etbqaEbWBmaaYPbo07B1uDgJpILOumpckJ6aBDPgfVXIMxjVig9rB5clrXAiAPpq9Nue+o0D0yfcNycFmhkjDBgIMLVegSBJSaPOz1C6VLmdL9M6yMYdRXoTZYy66/09W+ySEZWiI2vyerlhQ23CQpZMxhkCHrf7vcrIS9I+8oHZYYPKmCU929ALOUPHTYGyy7jqM2zGAEz51m2Yk3M3wvsXunAd0hNd15m323i9CrzXVnfPH82t5ttbWPd9khFWr+9Cm9AQIbU4P7K1w3h4EAzyzwXRznxoaMxdCJ7j6JaJWoohkwF/xPvOh640XSbtpDHI3DjMvvqJs1zMG80o95NWTIpzKbPrhYo/Gv4IgOuUCD8QjciXZBG1iZskgki3pB6CVh8IpD4t4=';

test('168. ofuscarAfirmacion y desofuscarAfirmacion', () => {
  assert.equal(AFIRMACION_BLOQUE, 512);
  assert.equal(AFIRMACION_MAX_BYTES, 510);
  for (const t of ['Octopuses have three hearts.', 'ñandú 🐕 «comillas»', 'é'.repeat(255), 'a']) {
    const c = ofuscarAfirmacion(t, CL, 4, 2);
    assert.match(c, /^[A-Za-z0-9+/]{683}=$/);
    assert.equal(desofuscarAfirmacion(c, CL, 4, 2), t);
  }
  assert.equal(desofuscarAfirmacion(ofuscarAfirmacion('a'.repeat(510), CL, 1, 0), CL, 1, 0), 'a'.repeat(510));
  assert.throws(() => ofuscarAfirmacion('a'.repeat(511), CL, 1, 0), RangeError);
  assert.throws(() => ofuscarAfirmacion('é'.repeat(256), CL, 1, 0), RangeError);
  assert.throws(() => ofuscarAfirmacion('', CL, 1, 0), TypeError);
  assert.throws(() => ofuscarAfirmacion('a\nb', CL, 1, 0), TypeError);
  assert.throws(() => ofuscarAfirmacion(5, CL, 1, 0), TypeError);
  assert.throws(() => ofuscarAfirmacion(null, CL, 1, 0), TypeError);
  const ok = ofuscarAfirmacion('hola', CL, 1, 0, () => 0);
  for (const malo of [ok.slice(0, 683), ok + 'A', ok.slice(0, 10) + '!' + ok.slice(11), null, undefined, 5, {}]) {
    assert.equal(desofuscarAfirmacion(malo, CL, 1, 0), null);
  }
  const semilla = `${CL}|1|0|afirmacion`;
  const texto = (s) => bloqueDe(512, 0, s.length, ...new TextEncoder().encode(s));
  assert.equal(desofuscarAfirmacion(cifrarBloque(bloqueDe(512), semilla), CL, 1, 0), null);
  assert.equal(desofuscarAfirmacion(cifrarBloque(texto('a\nb'), semilla), CL, 1, 0), null);
  assert.equal(desofuscarAfirmacion(cifrarBloque(bloqueDe(512, 1, 255), semilla), CL, 1, 0), null);
  assert.equal(desofuscarAfirmacion(cifrarBloque(bloqueDe(512, 0, 2, 0xc3, 0x28), semilla), CL, 1, 0), null);
  assert.equal(desofuscarAfirmacion(cifrarBloque(texto('ok'), semilla), CL, 1, 0), 'ok');
  // semilla propia: no se descifra como ficha de imagen ni como aclaración
  assert.notEqual(desofuscarFicha(ok, CL, 1, 0), 'hola');
  assert.equal(desofuscarAclaracion(ok, CL, 1, 0) === null || desofuscarAclaracion(ok, CL, 1, 0).aclaracion !== 'hola', true);
});

test('169. ofuscarAclaracion y desofuscarAclaracion', () => {
  assert.equal(ACLARACION_BLOQUE, 512);
  assert.equal(ACLARACION_MAX_BYTES, 510);
  assert.equal(DETALLES_MAX, 3);
  const casos = [
    { aclaracion: 'Truth.', detalles: [] },
    { aclaracion: 'Truth.', detalles: ['One.'] },
    { aclaracion: 'ñandú 🐕', detalles: ['Uno.', 'Dos «x».'] },
    { aclaracion: 'Truth.', detalles: ['One.', 'Two.', 'Three.'] }
  ];
  for (const caso of casos) {
    const c = ofuscarAclaracion(caso, CL, 4, 2);
    assert.match(c, /^[A-Za-z0-9+/]{683}=$/);
    assert.deepEqual(desofuscarAclaracion(c, CL, 4, 2), caso);
  }
  // detalles por defecto: []
  assert.deepEqual(desofuscarAclaracion(ofuscarAclaracion({ aclaracion: 'T.' }, CL, 1, 0), CL, 1, 0), { aclaracion: 'T.', detalles: [] });
  // misma longitud con 0 y con 3 detalles
  assert.equal(ofuscarAclaracion(casos[0], CL, 1, 0).length, ofuscarAclaracion(casos[3], CL, 1, 0).length);
  // límite de 510 bytes
  const justo = { aclaracion: 'a'.repeat(300), detalles: ['b'.repeat(209)] };
  assert.equal(new TextEncoder().encode([justo.aclaracion, ...justo.detalles].join('\n')).length, 510);
  assert.deepEqual(desofuscarAclaracion(ofuscarAclaracion(justo, CL, 1, 0), CL, 1, 0), justo);
  assert.throws(() => ofuscarAclaracion({ aclaracion: 'a'.repeat(300), detalles: ['b'.repeat(210)] }, CL, 1, 0), RangeError);
  assert.throws(() => ofuscarAclaracion({ aclaracion: 'Truth.', detalles: ['a', 'b', 'c', 'd'] }, CL, 1, 0), TypeError);
  assert.throws(() => ofuscarAclaracion({ aclaracion: '', detalles: [] }, CL, 1, 0), TypeError);
  assert.throws(() => ofuscarAclaracion({ aclaracion: 'a\nb' }, CL, 1, 0), TypeError);
  assert.throws(() => ofuscarAclaracion({ aclaracion: 'a', detalles: [''] }, CL, 1, 0), TypeError);
  assert.throws(() => ofuscarAclaracion({ aclaracion: 'a', detalles: ['x\ny'] }, CL, 1, 0), TypeError);
  assert.throws(() => ofuscarAclaracion({ aclaracion: 'a', detalles: 'x' }, CL, 1, 0), TypeError);
  assert.throws(() => ofuscarAclaracion({ aclaracion: 5 }, CL, 1, 0), TypeError);
  assert.throws(() => ofuscarAclaracion(undefined, CL, 1, 0), TypeError);
  // descifrado: nunca lanza
  const ok = ofuscarAclaracion(casos[1], CL, 1, 0, () => 0);
  for (const malo of [ok.slice(0, 683), ok + 'A', ok.slice(0, 10) + '!' + ok.slice(11), null, undefined, 5, {}]) {
    assert.equal(desofuscarAclaracion(malo, CL, 1, 0), null);
  }
  const semilla = `${CL}|1|0|aclaracion`;
  const cuerpo = (s) => bloqueDe(512, 0, s.length, ...[...s].map((ch) => ch.charCodeAt(0)));
  assert.equal(desofuscarAclaracion(cifrarBloque(bloqueDe(512), semilla), CL, 1, 0), null);
  assert.equal(desofuscarAclaracion(cifrarBloque(cuerpo('\nb'), semilla), CL, 1, 0), null);
  assert.equal(desofuscarAclaracion(cifrarBloque(cuerpo('a\n'), semilla), CL, 1, 0), null);
  assert.equal(desofuscarAclaracion(cifrarBloque(cuerpo('a\n\nb'), semilla), CL, 1, 0), null);
  assert.equal(desofuscarAclaracion(cifrarBloque(cuerpo('a\nb\nc\nd\ne'), semilla), CL, 1, 0), null);
  assert.deepEqual(desofuscarAclaracion(cifrarBloque(cuerpo('a\nb\nc\nd'), semilla), CL, 1, 0), { aclaracion: 'a', detalles: ['b', 'c', 'd'] });
  assert.equal(desofuscarAclaracion(cifrarBloque(bloqueDe(512, 1, 255), semilla), CL, 1, 0), null);
  assert.equal(desofuscarAclaracion(cifrarBloque(bloqueDe(512, 0, 2, 0xc3, 0x28), semilla), CL, 1, 0), null);
  // semilla propia: no es la de la afirmación
  assert.equal(desofuscarAfirmacion(ok, CL, 1, 0) === null || desofuscarAfirmacion(ok, CL, 1, 0) !== 'Truth.', true);
});

test('170. vectores de regresión de afirmación y aclaración (4.8)', () => {
  assert.equal(ofuscarAfirmacion('Test claim.', CL, 1, 0, () => 0), VEC_AFIRMACION);
  assert.equal(
    ofuscarAclaracion({ aclaracion: 'Test truth.', detalles: ['One.', 'Two.'] }, CL, 1, 0, () => 0),
    VEC_ACLARACION
  );
  assert.equal(desofuscarAfirmacion(VEC_AFIRMACION, CL, 1, 0), 'Test claim.');
  assert.deepEqual(desofuscarAclaracion(VEC_ACLARACION, CL, 1, 0), { aclaracion: 'Test truth.', detalles: ['One.', 'Two.'] });
});

test('232. el módulo ya no exporta Headlines y el archivo de ejemplo no lleva textos en claro', () => {
  for (const viejo of ['TEXTO_BLOQUE', 'TEXTO_MAX_BYTES', 'NOTICIA_BLOQUE', 'NOTICIA_MAX_BYTES', 'ofuscarTexto', 'desofuscarTexto',
    'ofuscarNoticia', 'desofuscarNoticia', 'urlFuenteValida', 'medioDeUrl', 'TITULARES_CARPETA', 'rutaTitulares', 'titularesVacios',
    'validarTitulares', 'titularesDelDia', 'titularesDeNumero', 'titularesDelMes', 'cargarTitulares', 'cargarTitularesPrueba']) {
    assert.equal(diario[viejo], undefined, viejo);
  }
  const texto = JSON.stringify(mesDeEjemplo('2000-01', 1, 3));
  assert.equal(/claim|truth|one\.|two\./i.test(texto), false);
  for (const l of ['en', 'es']) {
    assert.ok(mesDeEjemplo('2000-01', 1, 1).dias[0].textos[l].every((t) => t.length === 684));
    assert.ok(mesDeEjemplo('2000-01', 1, 1).dias[0].fichas[l].every((t) => t.length === 684));
  }
});


test('4.17 semillas por idioma: el español lleva el sufijo |es y no comparte flujo con el inglés', () => {
  const alea = () => 0;
  const k = 'Mpb9Ycc=';
  // Mismo texto en los dos idiomas: bloques distintos (si compartieran flujo, el XOR de los dos daría el XOR de los textos).
  assert.notEqual(ofuscarFicha('Igual', k, 1, 0, alea, 'en'), ofuscarFicha('Igual', k, 1, 0, alea, 'es'));
  assert.equal(ofuscarFicha('Igual', k, 1, 0, alea), ofuscarFicha('Igual', k, 1, 0, alea, 'en'), 'el inglés es el idioma por defecto');
  assert.equal(desofuscarFicha(ofuscarFicha('Fotografía real', k, 1, 0, alea, 'es'), k, 1, 0, 'es'), 'Fotografía real');
  assert.equal(desofuscarFicha(ofuscarFicha('Fotografía real', k, 1, 0, alea, 'es'), k, 1, 0, 'en'), null);
  assert.equal(desofuscarAfirmacion(ofuscarAfirmacion('Afirmación de prueba.', k, 1, 0, alea, 'es'), k, 1, 0, 'es'), 'Afirmación de prueba.');
  assert.equal(desofuscarAfirmacion(ofuscarAfirmacion('Afirmación de prueba.', k, 1, 0, alea, 'es'), k, 1, 0), null);
  const ac = { aclaracion: 'Verdad de prueba.', detalles: ['Uno.', 'Dos.'] };
  assert.deepEqual(desofuscarAclaracion(ofuscarAclaracion(ac, k, 1, 0, alea, 'es'), k, 1, 0, 'es'), ac);
  assert.equal(desofuscarAclaracion(ofuscarAclaracion(ac, k, 1, 0, alea, 'es'), k, 1, 0, 'en'), null);
  // Las tres semillas del español coinciden con 4.17.
  assert.deepEqual(flujoFicha(k, 1, 0, 'es'), flujoBytes(`${k}|1|0|es`, 512));
  assert.deepEqual(flujoFicha(k, 1, 0), flujoBytes(`${k}|1|0`, 512));
  assert.throws(() => ofuscarFicha('x', k, 1, 0, alea, 'fr'), TypeError);
  assert.equal(desofuscarFicha(ofuscarFicha('x', k, 1, 0, alea), k, 1, 0, 'fr'), null, 'desofuscar nunca lanza');
  assert.deepEqual(afirmacionesVacias('2000-01'), { version: 2, mes: '2000-01', dias: [] });
});


// ---- Idiomas [3.0, D-154, D-156] ----

import {
  IDIOMAS,
  IDIOMA_POR_DEFECTO,
  LOCALES,
  idiomaValido,
  idiomaDeUrl,
  idiomaDelNavegador,
  elegirIdioma,
  temaDelDia
} from '../js/diario.js';

test('idiomas: constantes y idiomaValido', () => {
  assert.deepEqual([...IDIOMAS], ['en', 'es']);
  assert.equal(Object.isFrozen(IDIOMAS), true);
  assert.equal(IDIOMA_POR_DEFECTO, 'en');
  assert.deepEqual({ ...LOCALES }, { en: 'en-US', es: 'es-ES' });
  assert.equal(Object.isFrozen(LOCALES), true);
  assert.equal(idiomaValido('en'), true);
  assert.equal(idiomaValido('es'), true);
  for (const malo of ['ES', 'fr', 'es-ES', '', undefined, null, 5, ['es']]) assert.equal(idiomaValido(malo), false, String(malo));
});

test('idiomaDeUrl: ?lang= en minúsculas o null', () => {
  assert.equal(idiomaDeUrl('?lang=es'), 'es');
  assert.equal(idiomaDeUrl('?lang=en'), 'en');
  assert.equal(idiomaDeUrl('?prueba=1&lang=ES&dia=2'), 'es');
  for (const malo of ['?lang=es-ES', '?lang=fr', '?lang=', '', '?idioma=es', undefined, null]) {
    assert.equal(idiomaDeUrl(malo), null, String(malo));
  }
});

test('idiomaDelNavegador: solo mira el primero que sea cadena; es y es-* dan español', () => {
  assert.equal(idiomaDelNavegador(['es']), 'es');
  assert.equal(idiomaDelNavegador(['es-ES']), 'es');
  assert.equal(idiomaDelNavegador(['ES-mx', 'en']), 'es');
  assert.equal(idiomaDelNavegador(['en-US', 'es']), 'en');
  assert.equal(idiomaDelNavegador(['fr', 'es']), 'en');
  assert.equal(idiomaDelNavegador(['esperanto']), 'en');
  assert.equal(idiomaDelNavegador([5, 'es']), 'es');
  for (const raro of [[], undefined, null, 'es', {}, [null]]) assert.equal(idiomaDelNavegador(raro), 'en', String(raro));
});

test('elegirIdioma: ?lang= > guardado > navegador', () => {
  const lenguas = ['es-ES'];
  assert.deepEqual(elegirIdioma({ search: '?lang=en', guardado: 'es', lenguas }), { idioma: 'en', origen: 'url' });
  assert.deepEqual(elegirIdioma({ search: '', guardado: 'en', lenguas }), { idioma: 'en', origen: 'guardado' });
  assert.deepEqual(elegirIdioma({ search: '?lang=fr', guardado: 'es', lenguas: ['en'] }), { idioma: 'es', origen: 'guardado' });
  assert.deepEqual(elegirIdioma({ search: '', guardado: null, lenguas }), { idioma: 'es', origen: 'navegador' });
  assert.deepEqual(elegirIdioma({ search: '', guardado: 'xx', lenguas: ['de'] }), { idioma: 'en', origen: 'navegador' });
  assert.deepEqual(elegirIdioma(), { idioma: 'en', origen: 'navegador' });
});

test('formatearFecha con idioma', () => {
  assert.equal(formatearFecha('2026-11-30', 'en'), 'Nov 30, 2026');
  assert.equal(formatearFecha('2026-11-30', 'es'), '30 nov 2026');
  assert.equal(formatearFecha('2026-01-03', 'es'), '3 ene 2026');
  assert.equal(formatearFecha('2026-12-09', 'es'), '9 dic 2026');
  assert.equal(formatearFecha('2026-11-03', 'fr'), 'Nov 3, 2026', 'idioma no válido: inglés');
  assert.equal(formatearFecha('2026-13-01', 'es'), '2026-13-01');
  assert.equal(formatearFecha('basura', 'es'), 'basura');
});

test('temaDelDia: tema del día de prueba en el idioma', () => {
  const t = (en, es) => ({ en, es });
  assert.equal(temaDelDia({ n: 1, temaImagenes: t('Dogs', 'Perros'), temaAfirmaciones: t('Dogs', 'Perros') }, 'es'), 'Perros');
  assert.equal(temaDelDia({ n: 1, temaImagenes: t('Dogs', 'Perros'), temaAfirmaciones: t('Cats', 'Gatos') }, 'en'), 'Dogs / Cats');
  assert.equal(temaDelDia({ n: 1, temaImagenes: t('Dogs', 'Perros'), temaAfirmaciones: t('Cats', 'Gatos') }, 'es'), 'Perros / Gatos');
  assert.equal(temaDelDia({ n: 2, temaImagenes: null, temaAfirmaciones: t('Cats', 'Gatos') }, 'es'), 'Gatos');
  assert.equal(temaDelDia({ n: 2, temaImagenes: t('Dogs', 'Perros'), temaAfirmaciones: null }, 'en'), 'Dogs');
  assert.equal(temaDelDia({ n: 3, temaImagenes: null, temaAfirmaciones: null }, 'en'), '');
  assert.equal(temaDelDia({ n: 1, temaImagenes: t('Dogs', 'Perros'), temaAfirmaciones: null }, 'fr'), 'Dogs');
  assert.equal(temaDelDia(null, 'en'), '');
});

test('vectores fijos en español (4.17), con aleatorio () => 0', () => {
  const alea = () => 0;
  const k = 'Mpb9Ycc=';
  const ficha = "xuUPVchZPp73SkDMWcd3I4FezNuo6PPX6FnE8A4bpwm7L9xm2DfjYIDU5AehDjBievuD9v0It+IyG2dyeGN9v7qdHPmRjF4GRZxSgU2LLPAgn/KWKYHtVBLLkBWGZ7SslxgH0el5C9gOsiCPuknq+F3b+PP/w1a2mldiFMrRyadEeTve2a+WrDKI2NYADMXXrxC5XsO4L9tVCiJ3RwAj959SWD0VmJm1jO0uNEr/Ka7ZMc4t1tbnxw1PlYl/LLpXdkZYD/JGkwg/pxeU8L7VwaluLzQKfdwoo77rUGHHRg69dkjKP96CEoLnQi6PRBHb5kr05lq83brzyQ0fQWDHf6Mox32Kx7E6Og851AHhG9VzHq7ZOOM1kxpPHc0ZHiN2ucgvaC0Y39s2VqUguZFw6CvujgXUYNyt0/EwrontUBC/NIBXnI1KCEhRJaK/BHPEA7oVznUmmtK0eDyFJu6oPd3uTv7l5ao8isx2q1WaQfY4O5lZ9vvIYoXy8lh5Y2ppzkHeSdudVgNpG3PF/wpj6dyNJa6lue+/o7D1QU2MSADrcMeGWGNItXjs/Dnc/c8PsFjvQ9/n2ZLH4MC0mOqY0Ou/Fjr2l2fTmMMBadswkgsg0Lkw7q0DbIuFWWSg5lZx7FN87sB4hfDhchh9M2+tBY0kmfqYWVHEQo4gpYhU1xs=";
  const afirmacion = "b3nIUjGv4flgVVGh8sB/H0ZAQ011C38AeDZOC5lOjo4oo0G7yMwTohTFDz4ibG2dK3+bAzvbocg0m41quGLCC7nsMbqfEM7PxYh0VqUD5LiYZtmAIfxHUSn131EKKT8vQvWIHqkIBSif4esWkRXZGh/fx2CEjWphZ5YcZv4sXL5maBIbuw27etZvg/v1v6XZHFs/p4EoTnPmfyMqyo+KbxCcjVMXXKIiMJ68oweV/Mg3AIHiDf4tDb187uXm89SlA33si6uzRdVZr9jNbn+LYVB1geb7+8dOoo1jHGamPyxTtNmMLaIgD0h2pQl5WpL2/h5NeADUIMy4GZI21jBXSTh9NbU70f/lQFSU6x6Pf3OTitujolgTV0ex1Pg86qre967yRp5XerSv0Jm0zvE7V7swtzml813186K2VGhH78s8sTE8HV1UlzRG8FAQKArCc5+cRBAXALO3LcNfcLphua6yu1xAcQq+gSr7NSU2XltuWNvSo+PKFpNuXEYhUzwUdXbkC9a0/FgOtRDUPaOU8s/ofuXDhAgZznWDsOVd793t1L+1J3nO0kTzA0ZCvHrrrVppsby6D0B6IAlor/P8GYYOyST6ee2HSTsPvJ/O2qxVsjkMtf4HC7pLwx69xMl4rKjl2xVyNn6nAQUjXSn83S4exoR+jfKhkFi3WgM3OAM=";
  const aclaracion = "n60tC/SBc+Cbe9r7aXXIjebJBR2nXuC4FkoFoR6N/lWsMScFO7rSKxykmKmX7XncH2z+eM95T6oMmnX+ywsPkTv47Mp5/O64xxDxoen8Y2AwE4tmwn3Sye0uhIzJ8gW+leMOWRYJUTzb+ZylwZC+7wNhV007ytRoe/tU5Zb8CryJvPOM9W8U4Vy8aIrdw8oI2Cd9JwNfXt3VXJxSeEbc6ZZEpos+yRpGklGaTehdDk/PefMNltMnYgTCh9M2kjGAvDAuYLfgoGeKVhl0qQwQKclZtCwHgKOtkcBvIwCDthwLB3vw2QW0py3BhUa8Ejb4l71SVk4ax9RitugEjXvNyDcloeZb2IrLGX9KcMcJ4MS1TxEEwU2Am4/D0rrzM4XNYQLvmem2Cong9TEqF06g1abkXsUvaWr6AkJazoYHaqeTaJth3tcMbKE547rpp0bTWMq8KEs1mUATWVmFFi28ghsPWUWxpXW+KKi9nsT2+e4xfbTYAl3RI4J6gCv1aIZxbY6H1jFjKlcBP6yXxvPXB1dsiSjmPKe5jSlPfmQlLTCKuKCedEP81/HXkowMsCY+7ACC5C1B8uoP/rz62jY9ryt/rGITUR3bqCuni/gIahsYvUXF2ox/SmqRXOKxMUxCKMUfbvznrveOGVW2OtXExK2zMWpKZfUnBJ7ZSPngxhE=";
  assert.equal(ofuscarFicha('Fotografía real', k, 1, 0, alea, 'es'), ficha);
  assert.equal(ofuscarAfirmacion('Afirmación de prueba.', k, 1, 0, alea, 'es'), afirmacion);
  assert.equal(
    ofuscarAclaracion({ aclaracion: 'Verdad de prueba.', detalles: ['Uno.', 'Dos.'] }, k, 1, 0, alea, 'es'),
    aclaracion
  );
  assert.equal(desofuscarFicha(ficha, k, 1, 0, 'es'), 'Fotografía real');
  assert.equal(desofuscarAfirmacion(afirmacion, k, 1, 0, 'es'), 'Afirmación de prueba.');
  assert.deepEqual(desofuscarAclaracion(aclaracion, k, 1, 0, 'es'), { aclaracion: 'Verdad de prueba.', detalles: ['Uno.', 'Dos.'] });
  for (const bloque of [ficha, afirmacion, aclaracion]) assert.equal(bloque.length, 684);
});
