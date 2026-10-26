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
  TEXTO_BLOQUE,
  TEXTO_MAX_BYTES,
  NOTICIA_BLOQUE,
  NOTICIA_MAX_BYTES,
  ofuscarTexto,
  desofuscarTexto,
  ofuscarNoticia,
  desofuscarNoticia,
  urlFuenteValida,
  medioDeUrl,
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
  TITULARES_CARPETA,
  mesDeFecha,
  mesDeNumero,
  rutaTitulares,
  titularesVacios,
  validarTitulares,
  titularesDelDia,
  titularesDeNumero,
  titularesDelMes,
  cargarTitulares,
  cargarTitularesPrueba
} from '../js/diario.js';

import * as diario from '../js/diario.js';

const clave = ofuscar([0, 1, 1, 0, 1], 1, () => 0);

function fichasDe(n) {
  return [0, 1, 2, 3, 4].map((i) => ofuscarFicha(i % 2 ? `Prompt ${i}` : 'Real photograph', clave, n, i, () => 0.5));
}

function diaValido(n) {
  return { n, tema: 'Perros', pruebas: ['a1', 'b2', 'c3', 'd4', 'e5'], clave, fichas: fichasDe(n) };
}

function calendarioValido(lanzamiento = '2026-11-01') {
  return {
    version: 4,
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

  for (const v of [1, 2, 3, 5]) {
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

// Archivo mensual de ejemplo: días n0..n1 del mes indicado (temas T{n}).
function mesDeEjemplo(mes, n0, n1) {
  const dias = [];
  for (let n = n0; n <= n1; n++) {
    const textos = [0, 1, 2, 3, 4].map((i) => ofuscarTexto({ titular: `Headline ${i}`, entradilla: 'Lede.' }, clave, n, i, () => 0.5));
    const fichas = [0, 1, 2, 3, 4].map((i) => ofuscarNoticia({ tipo: i % 2 ? 'prompt' : 'fuente', texto: i % 2 ? 'Prompt' : 'https://example.com/story' }, clave, n, i, () => 0.5));
    dias.push({ n, tema: `Tema${n}`, clave, textos, fichas });
  }
  return { version: 1, mes, dias };
}

function calendarioDe(n, lanzamiento = null) {
  return { version: 4, lanzamiento, dias: Array.from({ length: n }, (_, k) => diaValido(k + 1)) };
}

test('115. diasDePrueba: unión de calendario y todos los meses, solo n y temas', () => {
  const cal = calendarioDe(35);
  const meses = [mesDeEjemplo('2000-01', 1, 31), mesDeEjemplo('2000-02', 32, 40)];
  congelar(cal);
  congelar(meses);
  const r = diasDePrueba(cal, meses);
  assert.equal(r.length, 40);
  r.forEach((d, k) => {
    assert.deepStrictEqual(Object.keys(d), ['n', 'temaImagenes', 'temaTitulares']);
    assert.equal(d.n, k + 1);
    assert.equal(d.temaImagenes, k < 35 ? 'Perros' : null);
    assert.equal(d.temaTitulares, `Tema${k + 1}`);
  });
  const soloCal = diasDePrueba(cal, null);
  assert.equal(soloCal.length, 35);
  assert.ok(soloCal.every((d) => d.temaTitulares === null && d.temaImagenes === 'Perros'));
  for (const m of [undefined, {}, [], [titularesVacios('2000-01')]]) {
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
  const dias = Array.from({ length: 7 }, (_, i) => ({ n: i + 1, temaImagenes: 'T', temaTitulares: null }));
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
  assert.ok(casoDeNumero(con, 2).fichas[0] === con.dias[1].fichas[0]);
  for (const n of [0, 3, -1, 1.5, '1']) assert.equal(casoDeNumero(con, n), null, String(n));
});

test('211. mesDeFecha, mesDeNumero y rutaTitulares', () => {
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
  assert.equal(rutaTitulares('2026-12'), 'data/titulares/2026-12.json');
  assert.equal(rutaTitulares('2026-1'), null);
  assert.equal(rutaTitulares('../x'), null);
  assert.equal(TITULARES_CARPETA, 'data/titulares/');
  assert.ok(MES_PATRON.test('2026-12') && !MES_PATRON.test('2026-13'));
  assert.equal(diario.diaPedido, undefined);
});

test('172. validarTitulares', () => {
  const ok = () => mesDeEjemplo('2000-02', 32, 34);
  assert.equal(validarTitulares(ok(), '2000-02'), true);
  assert.equal(validarTitulares(ok()), true);
  const malos = [
    (o) => { o.version = 2; },
    (o) => { delete o.mes; },
    (o) => { o.mes = '2026-13'; },
    (o) => { o.dias = []; },
    (o) => { o.extra = 1; },
    (o) => { o.lanzamiento = '2026-12-01'; },
    (o) => { o.dias[1].extra = 1; },
    (o) => { o.dias[1].n = 40; },
    (o) => { o.dias[0].n = 0; },
    (o) => { o.dias[0].textos.pop(); },
    (o) => { o.dias[0].textos.push(o.dias[0].textos[0]); },
    (o) => { o.dias[0].fichas.pop(); },
    (o) => { o.dias[0].fichas.push(o.dias[0].fichas[0]); },
    (o) => { o.dias[0].textos[0] = o.dias[0].textos[0].slice(0, 682) + '='; },
    (o) => { o.dias[0].textos[0] = o.dias[0].textos[0].slice(0, 683) + 'A='; },
    (o) => { o.dias[0].fichas[0] = o.dias[0].fichas[0].slice(0, 1365) + '=='; },
    (o) => { o.dias[0].fichas[0] = o.dias[0].fichas[0].slice(0, 1366) + 'A=='; },
    (o) => { o.dias[0].tema = 'perros'; },
    (o) => { o.dias[0].clave = 'AAAA'; }
  ];
  malos.forEach((mal, k) => {
    const o = ok();
    mal(o);
    assert.equal(validarTitulares(o, '2000-02'), false, `caso ${k}`);
  });
  assert.equal(validarTitulares(ok(), '2000-03'), false);
  assert.equal(validarTitulares(null, '2000-02'), false);
  assert.equal(validarTitulares([], '2000-02'), false);
});

test('173. titularesDelDia y titularesDeNumero', () => {
  const l = '2026-12-15';
  const tit = mesDeEjemplo('2027-01', 18, 48);
  const d = titularesDelDia(tit, l, '2027-01-01');
  assert.equal(d.n, 18);
  assert.equal(d.fecha, '2027-01-01');
  assert.deepEqual(Object.keys(d).sort(), ['clave', 'fecha', 'fichas', 'n', 'tema', 'textos']);
  assert.ok(d.textos === tit.dias[0].textos);
  assert.equal(titularesDelDia(tit, l, '2026-12-31'), null);
  assert.equal(titularesDelDia(tit, null, '2027-01-01'), null);
  assert.equal(titularesDelDia(null, l, '2027-01-01'), null);
  const feb = mesDeEjemplo('2000-02', 32, 60);
  const e = titularesDeNumero(feb, null, 32);
  assert.equal(e.n, 32);
  assert.equal(e.fecha, '2000-02-01');
  assert.equal(titularesDeNumero(feb, null, 31), null);
  assert.equal(titularesDeNumero(feb, null, 61), null);
  assert.equal(titularesDeNumero(titularesVacios('2000-02'), null, 32), null);
  assert.equal(titularesDeNumero(null, null, 32), null);
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

test('212. cargarTitulares', async () => {
  const mes = mesDeEjemplo('2026-12', 1, 17);
  const rutas = [];
  const ops = [];
  const r = await cargarTitulares('2026-12-15', pedirDe({ 'data/titulares/2026-12.json': mes }, rutas, ops));
  assert.equal(r, mes);
  assert.deepEqual(rutas, ['data/titulares/2026-12.json']);
  assert.deepEqual(ops, [{ cache: 'no-cache' }]);
  assert.deepEqual(await cargarTitulares('2026-12-15', pedirDe({})), titularesVacios('2026-12'));
  const ruta = 'data/titulares/2026-12.json';
  await assert.rejects(cargarTitulares('2026-12-15', async () => respuesta(500)));
  await assert.rejects(cargarTitulares('2026-12-15', pedirDe({ [ruta]: new Error('red') })));
  await assert.rejects(cargarTitulares('2026-12-15', async () => respuesta(200, new Error('json'))));
  await assert.rejects(cargarTitulares('2026-12-15', pedirDe({ [ruta]: mesDeEjemplo('2026-11', 1, 3) })));
  await assert.rejects(cargarTitulares('2026-12-15', pedirDe({ [ruta]: { version: 1 } })));
  let llamadas = 0;
  await assert.rejects(cargarTitulares('2026-13-01', async () => { llamadas++; return respuesta(404); }));
  assert.equal(llamadas, 0);
});

test('222. cargarTitularesPrueba', async () => {
  const ene = mesDeEjemplo('2000-01', 1, 31);
  const feb40 = mesDeEjemplo('2000-02', 32, 40);
  const feb60 = mesDeEjemplo('2000-02', 32, 60);
  const A = 'data/titulares/2000-01.json';
  const B = 'data/titulares/2000-02.json';
  const C = 'data/titulares/2000-03.json';

  let rutas = [];
  let ops = [];
  let r = await cargarTitularesPrueba(null, pedirDe({ [A]: ene, [B]: feb40 }, rutas, ops));
  assert.deepEqual(rutas, [A, B]);
  assert.deepEqual(ops, [{ cache: 'no-cache' }, { cache: 'no-cache' }]);
  assert.deepEqual(r, [ene, feb40]);

  rutas = [];
  r = await cargarTitularesPrueba(null, pedirDe({ [A]: ene, [B]: feb60 }, rutas));
  assert.deepEqual(rutas, [A, B, C]);
  assert.equal(r.length, 2);

  rutas = [];
  assert.deepEqual(await cargarTitularesPrueba(null, pedirDe({}, rutas)), []);
  assert.deepEqual(rutas, [A]);

  await assert.rejects(cargarTitularesPrueba(null, async (u) => (u === A ? respuesta(200, ene) : respuesta(500))));
  await assert.rejects(cargarTitularesPrueba(null, pedirDe({ [A]: ene, [B]: new Error('red') })));
  await assert.rejects(cargarTitularesPrueba(null, async (u) => (u === A ? respuesta(200, ene) : respuesta(200, new Error('json')))));
  await assert.rejects(cargarTitularesPrueba(null, pedirDe({ [A]: ene, [B]: { version: 1 } })));

  assert.deepEqual(await cargarTitularesPrueba(null, pedirDe({ [A]: ene, [B]: mesDeEjemplo('2000-02', 33, 40) })), [ene]);
  rutas = [];
  assert.deepEqual(await cargarTitularesPrueba(null, pedirDe({ [A]: mesDeEjemplo('2000-01', 1, 32) }, rutas)), []);
  assert.deepEqual(rutas, [A]);

  const dic = mesDeEjemplo('2026-12', 1, 17);
  const ene27 = mesDeEjemplo('2027-01', 18, 20);
  rutas = [];
  r = await cargarTitularesPrueba('2026-12-15', pedirDe({ 'data/titulares/2026-12.json': dic, 'data/titulares/2027-01.json': ene27 }, rutas));
  assert.deepEqual(rutas, ['data/titulares/2026-12.json', 'data/titulares/2027-01.json']);
  assert.equal(r.length, 2);

  let llamadas = 0;
  await assert.rejects(cargarTitularesPrueba('2026-13-01', async () => { llamadas++; return respuesta(404); }));
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
  assert.equal((await cargarTitularesPrueba(null, lento)).length, 2);
  assert.equal(maxActivas, 1);
});

test('223. titularesDelMes', () => {
  const ene = mesDeEjemplo('2000-01', 1, 31);
  const feb = mesDeEjemplo('2000-02', 32, 60);
  const meses = [ene, feb];
  assert.ok(titularesDelMes(meses, '2000-02') === feb);
  assert.deepEqual(titularesDelMes(meses, '2000-03'), titularesVacios('2000-03'));
  assert.deepEqual(titularesDelMes(null, '2000-02'), titularesVacios('2000-02'));
  assert.deepEqual(titularesDelMes({}, '2000-02'), titularesVacios('2000-02'));
  assert.equal(titularesDelMes(meses, '2000-13'), null);
  const mes35 = titularesDeNumero(titularesDelMes(meses, mesDeNumero(null, 35)), null, 35);
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
  assert.ok(calendarioValido().dias.every((d) => d.fichas.every((f) => f.length === 684)));
});

test('formatearFecha: inglés americano, determinista', () => {
  assert.equal(formatearFecha('2026-11-03'), 'Nov 3, 2026');
  assert.equal(formatearFecha('2026-01-31'), 'Jan 31, 2026');
  assert.equal(formatearFecha('2026-12-09'), 'Dec 9, 2026');
  assert.equal(formatearFecha('2026-13-01'), '2026-13-01');
  assert.equal(formatearFecha('basura'), 'basura');
});

const VEC_TEXTO = '33U5OfM7LppifDdq0nnQSxAoroypcnnrzBoHKRwS7AzSj/iiz8msx5zwE+fuUFzLmw1ro7NeNpidp+zmPopfe41Xj15Y+nRxqAHLbjZmGhI52L4/BpMvuk31AyEH//01qwl8x/CBkdPpuOXbl5MQazTL6VsdyCkMmwn7gc+Mo6NfWPB5qwkVDHJmIwGZE4yJdK4i0X0cyC4Q9443RqkMCRi1vwEu6YOE3T5V/Xu3g5dHZnzRVHz+wZBqYPjyf7N0qt9dI0dFveHKXRNqSVKOTH+4q/C6l00scsRJTwz4Q3bnPt7DDCw31lDQLjOVnjnlORBSiQDY+K3cfplfNUzq2Tc1VOa6fPXp+XIEvZs8DkXxodeDDiKI54OjzM+6XT5BNzAnP3YrZP/2z1u/dZ8Ejg+Z8W6khLRk/mcCZLm8Qe/BrRDAymbaREhZAA0r63F3SwPK+eacCU0vPkP8NATDdwJQTwMvu4mMFiOtJaZzwZcoecMs/MRab+ExH85Ew6RlzNJuOr660QOSErMQZEnO4OXM6+JOqeiIl/8yTHdoUxZOOsvncC8FiQR98MAEvantMVAquCXAncnhw6Ul0ltcfGo0Bzqz5NKlLb4yXRlXt9/r6yYbAXSXXAklBTFpPMKjDaCgWLavw96edkvEwXgHoEa5hg/9ih8JuV9GCJ8U4WY=';
const VEC_NOTICIA = 'Cxp56vxKI+0QdAALjipcdh9k61SkxYitF4irQPdO+BC6V7I4THEqi+cFCwTVQUpy9L9P7bCnZD37U3RDdAdUgZpWI5lDMTlgmJqXuqzp1q4GUxlJ7Aub4wxz2nWEeaXUlr1TpSXd0IvdZAcSonKeAY8w1p0NVtRcRmUJjNgYCzGssV3hJiN1aWMlAAUnQqWnKvPEntbEmIpOTCMO3HyFfUh+4nbxrfL8zBZUTO4P4I9Tr8oUvuRotYMdDHkt/Rdy7GxHdYt20HDdeYlY3Rv27ART91MD9C5DMbgoSR+3U5n7+hXq3At/nAnuhHww9ltK6ki7Po/sdx8YRw4GNd/618UKAb0UBpeak6nQFjNQHvI+YmMAgmw4ENAbAx49Wss8sF3HZvN6P99gEN/kYx85+I4fMDF/tdL0kbTR5qwzF55mAkO8dCVZ4S8wU2D/u3fp/hc6A4juqXfbkIWf2AazIaG2k5BSpBrZn65TCtnRnGAjLCWf/O8lxlpEihgqU8MrcxCtJrgEO6QpqBQ0WuGjQWZznUHJ88uDNSl2MK/3Vl76S+AWITw76SkEuAECoH0oKUDrjc/rICt/oC2X2JZ9Q93aECe28nQ71jNapO3q2SCkBgG54k2chYuBJHi3UQc0bK+F4ZfgQNuDEQiD3TYm9DpGKBZZfUxF/17vRgYVGKlZktBAzgzYzw79qvhujvBdDgo9evRx2SvhG8YKlZioHkv+MoXPC1Giwp/6tASeRpc7ztEVtAVQoR39m2FUImb9C4iOyFderpljCCxkPpdeVaZgEVSZn6noB1PWlissHi3eHXzyTx7KDD56qiZUUWLre1M04s7WJaY6fOpwemUXQt0W0QDEuCNHX0Ch7kyOjD8lSWglT6WROc6hyO40KAwNpsKIvaVy6jqB1eQMgIhSZ9Qr2d2VXDoEfYpwik+rkhFZzB02Jm+ruLqrmj4wgrMBkSh8LjY9lTUu0MqStyvV0s2KEHhTfOccQjSFAqqIIr07ZaZ8S71mQ7NRdbkzTc2DpgdiyB8oEaRZNSYnismYHxH8enf1/kESb33yrgqaztNgRAAdsLwg8zZc1sOSFQVaJHfXy8lZxZGkwR/xUimjsFg1hK+NM0/6Vw/cjDVQ5KMa84Rbx3HE7rRmWdsnTooy0ovxWzzXcq6hGyhj21qvL1jhYotZ9EZ6HoXorwSmg8zBBspeNeQ1UcCoPRjFN9dOO8d49Y4hLnJe9Y8OrAHxSoM1QT63TE57Bwxh05AudLcSYVdz3nUJhHJGRqRFwmNvv8kwHpv5s34hGLse+CRn2RU1iBeYKkOF6Lm8ezCtCYW752B58bcoSPm2SjpeBByD8pLCf4uNLK1pUT7w3kgG1w==';

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

test('168. ofuscarTexto y desofuscarTexto', () => {
  const casos = [
    ['Test headline', 'Test lede.'],
    ['Council’s plan — a café “deal”', 'Résumé of the story 🐕🎉.'],
    ['Titular', 'Línea uno\nlínea dos'],
    ['H', 'é'.repeat(253) + 'e']
  ];
  assert.equal(TEXTO_BLOQUE, 512);
  assert.equal(TEXTO_MAX_BYTES, 510);
  for (const [titular, entradilla] of casos) {
    const c = ofuscarTexto({ titular, entradilla }, CL, 4, 2);
    assert.match(c, /^[A-Za-z0-9+/]{683}=$/);
    assert.deepEqual(desofuscarTexto(c, CL, 4, 2), { titular, entradilla });
  }
  const justo = { titular: 'A', entradilla: 'b'.repeat(508) };
  assert.equal(new TextEncoder().encode(`${justo.titular}\n${justo.entradilla}`).length, 510);
  assert.deepEqual(desofuscarTexto(ofuscarTexto(justo, CL, 1, 0), CL, 1, 0), justo);
  assert.throws(() => ofuscarTexto({ titular: 'A', entradilla: 'b'.repeat(509) }, CL, 1, 0), RangeError);
  assert.throws(() => ofuscarTexto({ titular: 'a\nb', entradilla: 'c' }, CL, 1, 0), TypeError);
  assert.throws(() => ofuscarTexto({ titular: '', entradilla: 'c' }, CL, 1, 0), TypeError);
  assert.throws(() => ofuscarTexto({ titular: 'a', entradilla: 5 }, CL, 1, 0), TypeError);
  assert.throws(() => ofuscarTexto({ titular: 'a', entradilla: '' }, CL, 1, 0), TypeError);
  const ok = ofuscarTexto({ titular: 'a', entradilla: 'b' }, CL, 1, 0, () => 0);
  for (const malo of [ok.slice(0, 683), ok + 'A', ok.slice(0, 10) + '!' + ok.slice(11), null, undefined, 5, {}]) {
    assert.equal(desofuscarTexto(malo, CL, 1, 0), null);
  }
  const semilla = `${CL}|1|0|texto`;
  const enc = new TextEncoder();
  const bloqueTexto = (texto) => bloqueDe(512, 0, enc.encode(texto).length, ...enc.encode(texto));
  assert.equal(desofuscarTexto(cifrarBloque(bloqueTexto('sin salto'), semilla), CL, 1, 0), null);
  assert.equal(desofuscarTexto(cifrarBloque(bloqueTexto('\nentradilla'), semilla), CL, 1, 0), null);
  assert.equal(desofuscarTexto(cifrarBloque(bloqueTexto('titular\n'), semilla), CL, 1, 0), null);
  assert.equal(desofuscarTexto(cifrarBloque(bloqueDe(512, 0, 4, 0xc3, 0x28, 0x0a, 0x61), semilla), CL, 1, 0), null);
  assert.deepEqual(desofuscarTexto(cifrarBloque(bloqueTexto('a\nb\nc'), semilla), CL, 1, 0), { titular: 'a', entradilla: 'b\nc' });
  // el flujo del texto no es el de la ficha de imagen
  assert.notDeepEqual([...flujoBytes(semilla, 512)], [...flujoFicha(CL, 1, 0)]);
  assert.notEqual(desofuscarFicha(ofuscarTexto({ titular: 'a', entradilla: 'b' }, CL, 1, 0), CL, 1, 0), 'a\nb');
});

test('169. ofuscarNoticia y desofuscarNoticia', () => {
  assert.equal(NOTICIA_BLOQUE, 1024);
  assert.equal(NOTICIA_MAX_BYTES, 1021);
  const casos = [
    { tipo: 'fuente', texto: 'https://example.com/story' },
    { tipo: 'prompt', texto: 'Write a short “plausible” headline — with é and 🐈.' },
    { tipo: 'prompt', texto: 'p'.repeat(1000) },
    { tipo: 'fuente', texto: 'u'.repeat(1021) }
  ];
  for (const caso of casos) {
    const c = ofuscarNoticia(caso, CL, 4, 2);
    assert.match(c, /^[A-Za-z0-9+/]{1366}==$/);
    assert.equal(c.length, 1368);
    assert.deepEqual(desofuscarNoticia(c, CL, 4, 2), caso);
  }
  assert.equal(ofuscarNoticia(casos[0], CL, 1, 0).length, ofuscarNoticia(casos[2], CL, 1, 0).length);
  assert.throws(() => ofuscarNoticia({ tipo: 'fuente', texto: 'u'.repeat(1022) }, CL, 1, 0), RangeError);
  assert.throws(() => ofuscarNoticia({ tipo: 'otro', texto: 'x' }, CL, 1, 0), TypeError);
  assert.throws(() => ofuscarNoticia({ tipo: 'fuente', texto: '' }, CL, 1, 0), TypeError);
  assert.throws(() => ofuscarNoticia({ tipo: 'fuente', texto: 5 }, CL, 1, 0), TypeError);
  const ok = ofuscarNoticia(casos[0], CL, 1, 0, () => 0);
  for (const malo of [ok.slice(0, 1367), ok + 'A', null, undefined, 5, {}]) {
    assert.equal(desofuscarNoticia(malo, CL, 1, 0), null);
  }
  const semilla = `${CL}|1|0|noticia`;
  const cuerpo = (...bytes) => cifrarBloque(bloqueDe(1024, 0, bytes.length, ...bytes), semilla);
  assert.equal(desofuscarNoticia(cuerpo(2, 0x61), CL, 1, 0), null);
  assert.equal(desofuscarNoticia(cifrarBloque(bloqueDe(1024), semilla), CL, 1, 0), null);
  assert.equal(desofuscarNoticia(cuerpo(0), CL, 1, 0), null);
  assert.equal(desofuscarNoticia(cifrarBloque(bloqueDe(1024, 0x03, 0xff), semilla), CL, 1, 0), null);
  assert.equal(desofuscarNoticia(cuerpo(1, 0xc3, 0x28), CL, 1, 0), null);
  assert.deepEqual(desofuscarNoticia(cuerpo(1, 0x61), CL, 1, 0), { tipo: 'prompt', texto: 'a' });
  // el flujo de la noticia no es el del texto ni el de la ficha de imagen
  assert.notDeepEqual([...flujoBytes(semilla, 512)], [...flujoBytes(`${CL}|1|0|texto`, 512)]);
});

test('170. vectores de regresión de Headlines (4.8)', () => {
  assert.equal(ofuscarTexto({ titular: 'Test headline', entradilla: 'Test lede.' }, CL, 1, 0, () => 0), VEC_TEXTO);
  assert.equal(ofuscarNoticia({ tipo: 'fuente', texto: 'https://example.com/story' }, CL, 1, 0, () => 0), VEC_NOTICIA);
  assert.deepEqual(desofuscarTexto(VEC_TEXTO, CL, 1, 0), { titular: 'Test headline', entradilla: 'Test lede.' });
  assert.deepEqual(desofuscarNoticia(VEC_NOTICIA, CL, 1, 0), { tipo: 'fuente', texto: 'https://example.com/story' });
});

test('171. urlFuenteValida y medioDeUrl', () => {
  assert.equal(urlFuenteValida('https://example.com/a?b=1'), true);
  assert.equal(urlFuenteValida('https://example.com/' + 'p'.repeat(1021 - 'https://example.com/'.length)), true);
  const invalidas = [
    'http://example.com/',
    'javascript:alert(1)',
    'https://user:pw@example.com/',
    'https://user@example.com/',
    '/relativa',
    'https://192.168.1.1/',
    'https://[::1]/',
    'https://localhost/',
    'HTTPS://Example.com/',
    'https://example.com',
    'https://example.com/' + 'p'.repeat(1022 - 'https://example.com/'.length),
    '',
    null,
    undefined,
    42
  ];
  for (const x of invalidas) assert.equal(urlFuenteValida(x), false, String(x));
  assert.equal(medioDeUrl('https://www.apnews.com/x'), 'apnews.com');
  assert.equal(medioDeUrl('https://news.example.co.uk/x'), 'news.example.co.uk');
  assert.equal(medioDeUrl('https://wwwx.com/x'), 'wwwx.com');
  assert.equal(medioDeUrl('x'), null);
  assert.equal(medioDeUrl(null), null);
});
