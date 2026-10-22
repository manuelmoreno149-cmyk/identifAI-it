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
  casoDelDia,
  rutaPrueba,
  ofuscar,
  desofuscar,
  cargarCalendario,
  precargar,
  HOSTS_LOCALES,
  fechaPrevisualizada,
  pruebaActiva,
  diasDePrueba,
  diaDePrueba
} from '../js/diario.js';

const clave = ofuscar([0, 1, 1, 0, 1], 1, () => 0);

function diaValido(n, fecha) {
  return { n, fecha, tema: 'Perros', pruebas: ['a1', 'b2', 'c3', 'd4', 'e5'], clave };
}

function calendarioValido() {
  return {
    version: 2,
    lanzamiento: '2026-11-01',
    dias: [diaValido(1, '2026-11-01'), diaValido(2, '2026-11-02')]
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
  const roto = calendarioValido();
  roto.dias[1].fecha = '2026-11-09';
  assert.equal(casoDelDia(roto, '2026-11-02'), null);
  const caso = casoDelDia(cal, '2026-11-02');
  assert.equal(caso.n, 2);
  assert.equal(caso.fecha, '2026-11-02');
  assert.equal(caso.clave, clave);
  assert.equal(caso.tema, 'Perros');
  assert.equal(caso.pruebas.length, 5);
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

  c = calendarioValido();
  c.version = 1;
  assert.equal(validarCalendario(c), false);

  c = calendarioValido();
  delete c.dias[0].tema;
  assert.equal(validarCalendario(c), false);

  for (const malo of ['', 'A'.repeat(31), ' Perros', 'Perros ', 'Per'+String.fromCharCode(10)+'ros', 'Per{ros', 'Per}ros', 'perros', 5]) {
    c = calendarioValido();
    c.dias[1].tema = malo;
    assert.equal(validarCalendario(c), false, String(malo));
  }
});

test('temaValido', () => {
  assert.equal(temaValido('Mesa con comida'), true);
  assert.equal(temaValido('Árboles'), true);
  assert.equal(temaValido('A'.repeat(30)), true);
  assert.equal(temaValido('A'.repeat(31)), false);
  assert.equal(temaValido(''), false);
  assert.equal(temaValido('perros'), false);
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

test('116. diasDePrueba devuelve solo n, fecha y tema', () => {
  const cal = calendarioValido();
  cal.dias[0].tema = 'Fuegos artificiales';
  cal.dias[1].tema = 'Perros';
  congelar(cal);
  const r = diasDePrueba(cal);
  assert.deepStrictEqual(r, [
    { n: 1, fecha: '2026-11-01', tema: 'Fuegos artificiales' },
    { n: 2, fecha: '2026-11-02', tema: 'Perros' }
  ]);
  for (const d of r) assert.ok(!('pruebas' in d) && !('clave' in d));
  assert.notEqual(r[0], cal.dias[0]);
  assert.deepStrictEqual(diasDePrueba(null), []);
  assert.deepStrictEqual(diasDePrueba(undefined), []);
  assert.deepStrictEqual(diasDePrueba({}), []);
});

test('117. diaDePrueba', () => {
  const dias = Array.from({ length: 7 }, (_, i) => ({ n: i + 1, fecha: `2026-11-0${i + 1}`, tema: 'T' }));
  assert.equal(diaDePrueba('?prueba=1&dia=3', dias, '2026-10-22'), dias[2]);
  for (const q of ['?prueba=1', '?prueba=1&dia=0', '?prueba=1&dia=08', '?prueba=1&dia=x', '?prueba=1&dia=9', '?prueba=1&dia=']) {
    assert.equal(diaDePrueba(q, dias, '2026-10-22'), dias[0], q);
  }
  assert.equal(diaDePrueba('?prueba=1', dias, '2026-11-04'), dias[3]);
  assert.equal(diaDePrueba('?prueba=1&dia=2', dias, '2026-11-04'), dias[1]);
  assert.equal(diaDePrueba('?prueba=1&dia=99', dias, '2026-11-04'), dias[3]);
  assert.equal(diaDePrueba('?prueba=1&dia=1', [], '2026-10-22'), null);
});
