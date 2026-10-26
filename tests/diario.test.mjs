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
  flujoFicha,
  ofuscarFicha,
  desofuscarFicha,
  cargarCalendario,
  precargar,
  HOSTS_LOCALES,
  fechaPrevisualizada,
  pruebaActiva,
  diasDePrueba,
  diaDePrueba
} from '../js/diario.js';

const clave = ofuscar([0, 1, 1, 0, 1], 1, () => 0);

function fichasDe(n) {
  return [0, 1, 2, 3, 4].map((i) => ofuscarFicha(i % 2 ? `Prompt ${i}` : 'Real photograph', clave, n, i, () => 0.5));
}

function diaValido(n, fecha) {
  return { n, fecha, tema: 'Perros', pruebas: ['a1', 'b2', 'c3', 'd4', 'e5'], clave, fichas: fichasDe(n) };
}

function calendarioValido() {
  return {
    version: 3,
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
  assert.deepEqual(Object.keys(caso).sort(), ['clave', 'fecha', 'fichas', 'n', 'pruebas', 'tema']);
  caso.fichas.forEach((f, i) => assert.ok(f === cal.dias[1].fichas[i]));
  assert.equal(desofuscarFicha(caso.fichas[0], clave, 2, 0), 'Real photograph');
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

  for (const v of [1, 2, 4]) {
    c = calendarioValido();
    c.version = v;
    assert.equal(validarCalendario(c), false, `version ${v}`);
  }

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
    c = calendarioValido();
    c.dias[0].fichas = cambio(c.dias[0].fichas);
    assert.equal(validarCalendario(c), false);
  }

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
  assert.ok(calendarioValido().dias.every((d) => d.fichas.every((f) => f.length === 684)));
});

test('formatearFecha: inglés americano, determinista', () => {
  assert.equal(formatearFecha('2026-11-03'), 'Nov 3, 2026');
  assert.equal(formatearFecha('2026-01-31'), 'Jan 31, 2026');
  assert.equal(formatearFecha('2026-12-09'), 'Dec 9, 2026');
  assert.equal(formatearFecha('2026-13-01'), '2026-13-01');
  assert.equal(formatearFecha('basura'), 'basura');
});
