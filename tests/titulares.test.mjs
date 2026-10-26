import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  analizarNoticias, planificarTitulares, medias, avisosLongitud, analizarArgumentosTitulares,
  unirMeses, repartirPorMes, leerTitularesMensuales, escribirTitularesMensuales,
  LISTA_REVISION, ARCHIVO_MES, CAMPOS_NOTICIA, TITULAR_MAX, ENTRADILLA_MAX, UMBRAL_LONGITUD
} from '../herramientas/titulares.mjs';

// ---------- 197 analizarNoticias ----------

const real = (i, extra = '') => `type: real\nheadline: Headline ${i}\nlede: Lede ${i}. Second sentence.\nsource: https://www.example-news.com/story/${i}\n${extra}`;
const ia = (i) => `type: ai\nheadline: Made up ${i}\nlede: Invented ${i}.\nprompt: Write a made up story ${i}.`;
const lote = (bloques) => bloques.join('\n---\n');
const bueno = () => lote([real(1), ia(2), real(3), real(4), real(5)]);
const err = (texto, parte) => {
  const r = analizarNoticias(texto, '01-space/noticias.txt');
  assert.ok(r.errores.some((e) => e.includes(parte)), `${parte}: ${JSON.stringify(r.errores)}`);
  assert.ok(r.errores.every((e) => e.includes('01-space/noticias.txt')), 'cada error lleva la ruta');
  return r;
};

test('197 analizarNoticias acepta el ejemplo de 4.9 (con CRLF y BOM) y devuelve los campos', () => {
  const texto = '﻿' + bueno().replace(/\n/g, '\r\n') + '\r\n---\r\n';
  const r = analizarNoticias(texto, 'x');
  assert.deepEqual(r.errores, []);
  assert.equal(r.noticias.length, 5);
  assert.equal(r.noticias[0].tipo, 'autentica');
  assert.equal(r.noticias[0].fuente, 'https://www.example-news.com/story/1');
  assert.equal(r.noticias[1].tipo, 'generada');
  assert.equal(r.noticias[1].prompt, 'Write a made up story 2.');
  assert.equal(r.noticias[1].promptRecortado, false);
  assert.ok(CAMPOS_NOTICIA.includes('lede'));
  assert.equal(TITULAR_MAX, 110);
  assert.equal(ENTRADILLA_MAX, 280);
});

test('197 analizarNoticias: normaliza espacios y NFC', () => {
  const t = lote([real(1), ia(2), real(3), real(4), real(5)]).replace('Headline 1', '  Café   au   lait ');
  const r = analizarNoticias(t, 'x');
  assert.equal(r.noticias[0].titular, 'Café au lait');
});

test('197 analizarNoticias: un error por regla, con ruta y número de bloque', () => {
  const con = (k, nuevo) => lote([real(1), ia(2), real(3), real(4), real(5)].map((b, i) => (i === k ? nuevo : b)));
  let r = err(con(0, real(1) + '\nlinea suelta'), 'bloque 1');
  err(con(1, ia(2) + '\nextra: x'), 'campo no previsto');
  err(con(1, ia(2) + '\nheadline: otra'), 'repetido');
  err(con(0, 'type: real\nheadline: H\nsource: https://a.example.com/x'), 'falta el campo lede');
  err(con(0, 'type: real\nlede: L\nsource: https://a.example.com/x'), 'falta el campo headline');
  err(con(0, 'headline: H\nlede: L\nsource: https://a.example.com/x'), 'falta el campo type');
  err(con(0, real(1).replace('type: real', 'type: fake')), 'type debe ser');
  err(con(0, real(1).replace(/source: .*/, '')), 'falta el campo source');
  err(con(1, ia(2).replace(/prompt: .*/, '')), 'falta el campo prompt');
  err(con(1, ia(2) + '\nsource: https://a.example.com/x'), 'no lleva source');
  err(con(0, real(1) + '\nprompt: algo'), 'no lleva prompt');
  err(con(0, real(1).replace(/source: .*/, 'source: http://a.example.com/x')), 'source no es una URL https');
  err(con(0, real(1).replace(/source: .*/, 'source: https://user:pw@a.example.com/x')), 'source no es una URL https');
  err(con(0, real(1).replace(/source: .*/, 'source: https://a.example.com/' + 'x'.repeat(1100))), 'source no es una URL https');
  err(con(0, real(1).replace('Headline 1', '')), 'headline está vacío');
  err(con(0, real(1).replace('Lede 1. Second sentence.', '')), 'lede está vacío');
  err(con(0, real(1).replace('Headline 1', 'Head\u0007line')), 'caracteres de control');
  err(con(0, real(1).replace('Lede 1.', 'Lede {1}.')), 'no puede contener');
  err(con(0, real(1).replace('Headline 1', 'x'.repeat(111))), 'máximo es 110');
  err(con(0, real(1).replace('Lede 1. Second sentence.', 'x'.repeat(281))), 'máximo es 280');
  err(con(1, ia(2).replace(/prompt: .*/, 'prompt:   ')), 'prompt está vacío');
  err(con(0, real(1).replace('Headline 1', 'é'.repeat(100)).replace('Lede 1. Second sentence.', 'é'.repeat(200))), 'bytes');
  err(lote([real(1), ia(2), real(3), real(4)]), 'tiene 4 noticias');
  err(lote([real(1), ia(2), real(3), real(4), real(5), real(6)]), 'tiene 6 noticias');
  err(lote([real(1), real(2), real(3), real(4), real(5)]), '0 noticias de IA');
  err(lote([ia(1), ia(2), ia(3), ia(4), ia(5)]), '5 noticias de IA');
  assert.ok(r.errores.length > 0);
});

test('197 analizarNoticias: avisos de prompt recortado y de entradilla larga; nunca lanza', () => {
  const largo = lote([real(1), ia(2).replace(/prompt: .*/, 'prompt: ' + 'palabra '.repeat(200)), real(3), real(4), real(5)]);
  const r = analizarNoticias(largo, 'x');
  assert.deepEqual(r.errores, []);
  assert.equal(r.noticias[1].promptRecortado, true);
  assert.ok(r.avisos.some((a) => a.includes('recortado')));
  const frases = lote([real(1).replace('Second sentence.', 'Two. Three! Four?'), ia(2), real(3), real(4), real(5)]);
  assert.ok(analizarNoticias(frases, 'x').avisos.some((a) => a.includes('más de 2 frases')));
  for (const raro of [undefined, null, 5, '', '---', '\u0000', {}]) {
    assert.doesNotThrow(() => analizarNoticias(raro, 'x'));
  }
  assert.ok(analizarNoticias('', 'x').errores.length > 0);
});

// ---------- 198 avisosLongitud ----------

const noticia = (tipo, titular, entradilla) => ({ tipo, titular, entradilla });
const dia = (n, tr, tg, er, eg) => ({
  n,
  noticias: [noticia('autentica', 'a'.repeat(tr), 'e'.repeat(er)), noticia('generada', 'a'.repeat(tg), 'e'.repeat(eg))]
});

test('198 avisosLongitud: titulares de 40 y 52 (30 %) avisan; 40 y 48 (20 %) no', () => {
  const a = avisosLongitud([dia(3, 40, 52, 100, 100)]);
  assert.equal(a.length, 2); // día y global
  assert.match(a[0], /^AVISO: día 3: los titulares de IA miden de media un 30 % más que los reales \(52 frente a 40 caracteres\)\.$/);
  assert.match(a[1], /^AVISO: en todo Headlines, los titulares de IA/);
  assert.deepEqual(avisosLongitud([dia(3, 40, 48, 100, 100)]), []);
  assert.equal(UMBRAL_LONGITUD, 0.25);
});

test('198 avisosLongitud: entradillas, sentido contrario y medias', () => {
  const a = avisosLongitud([dia(1, 40, 40, 200, 100)]);
  assert.equal(a.length, 2);
  assert.match(a[0], /las entradillas reales miden de media un 100 % más que las de IA \(200 frente a 100 caracteres\)/);
  assert.deepEqual(avisosLongitud([dia(1, 40, 40, 100, 120)]), []);
  assert.deepEqual(avisosLongitud([]), []);
  const m = medias(dia(1, 40, 52, 10, 20).noticias);
  assert.deepEqual(m, { titular: { autentica: 40, generada: 52 }, entradilla: { autentica: 10, generada: 20 } });
});

test('198 avisosLongitud: aviso global aunque cada día cumpla', () => {
  const dias = [dia(1, 40, 45, 100, 100), dia(2, 40, 49, 100, 100)];
  // Días: 12,5 % y 22,5 %; global: 40 frente a 47 = 17,5 %. Sin avisos.
  assert.deepEqual(avisosLongitud(dias), []);
  const peor = [dia(1, 40, 49, 100, 100), dia(2, 40, 51, 100, 100), dia(3, 40, 52, 100, 100)];
  const a = avisosLongitud(peor);
  assert.ok(a.some((x) => x.includes('en todo Headlines')));
  assert.ok(a.some((x) => x.includes('día 3')));
  assert.ok(!a.some((x) => x.includes('día 1')));
});

// ---------- 199 planificarTitulares ----------

const carpeta = (nombre, extra = {}) => ({ nombre, archivos: ['noticias.txt'], subcarpetas: [], ...extra });
const base = { ultimoDia: 0, hoyISO: '2026-10-21', lanzamiento: '2026-11-01' };

test('199 planificarTitulares: numeración, tema y mes', () => {
  const r = planificarTitulares({ ...base, carpetas: [carpeta('02-food'), carpeta('01-space'), carpeta('03-dogs-of-Madrid')] });
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.nuevos.map((x) => [x.n, x.tema, x.fecha, x.mes]), [
    [1, 'Space', '2026-11-01', '2026-11'],
    [2, 'Food', '2026-11-02', '2026-11'],
    [3, 'Dogs of Madrid', '2026-11-03', '2026-11']
  ]);
});

test('199 planificarTitulares: cruce de mes y sin lanzamiento', () => {
  const carpetas = [];
  for (let i = 1; i <= 32; i++) carpetas.push(carpeta(`${String(i).padStart(2, '0')}-space`));
  const sin = planificarTitulares({ carpetas, ultimoDia: 0, hoyISO: '2026-10-21', lanzamiento: null });
  assert.deepEqual(sin.errores, []);
  assert.equal(sin.nuevos[30].mes, '2000-01');
  assert.equal(sin.nuevos[31].mes, '2000-02');
  assert.equal(sin.nuevos[0].fecha, null);
  const con = planificarTitulares({ carpetas, ultimoDia: 0, hoyISO: '2026-10-21', lanzamiento: '2026-11-01' });
  assert.equal(con.nuevos[29].mes, '2026-11');
  assert.equal(con.nuevos[30].mes, '2026-12');
});

test('199 planificarTitulares: huecos, repetidos y omitidos', () => {
  let r = planificarTitulares({ ...base, carpetas: [carpeta('01-space'), carpeta('03-food')] });
  assert.ok(r.errores.some((e) => e.includes('no es consecutiva')));
  r = planificarTitulares({ ...base, carpetas: [carpeta('01-space'), carpeta('01-food')] });
  assert.ok(r.errores.some((e) => e.includes('dos carpetas con el número 01')));
  r = planificarTitulares({ ...base, ultimoDia: 2, carpetas: [carpeta('01-space'), carpeta('02-food'), carpeta('03-dogs')] });
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.omitidos, [1, 2]);
  assert.deepEqual(r.nuevos.map((x) => x.n), [3]);
  r = planificarTitulares({ ...base, ultimoDia: 2, carpetas: [carpeta('04-dogs')] });
  assert.ok(r.errores.some((e) => e.includes('debe ser la del día 03')));
  r = planificarTitulares({ ...base, ultimoDia: 2, reimportar: true, carpetas: [carpeta('01-space'), carpeta('02-food')] });
  assert.deepEqual(r.omitidos, []);
  assert.deepEqual(r.nuevos.map((x) => x.n), [1, 2]);
});

test('199 planificarTitulares: contenido de la carpeta', () => {
  let r = planificarTitulares({ ...base, carpetas: [carpeta('01-space', { archivos: [] })] });
  assert.ok(r.errores.some((e) => e.includes('debe contener noticias.txt')));
  r = planificarTitulares({ ...base, carpetas: [carpeta('01-space', { archivos: ['noticias.txt', 'extra.txt'] })] });
  assert.ok(r.errores.some((e) => e.includes('extra.txt')));
  r = planificarTitulares({ ...base, carpetas: [carpeta('01-space', { subcarpetas: ['ia'] })] });
  assert.ok(r.errores.some((e) => e.includes('no admitidos')));
  r = planificarTitulares({ ...base, carpetas: [carpeta('01-space', { archivos: ['noticias.txt', '.DS_Store', 'Thumbs.db', 'desktop.ini'] })] });
  assert.deepEqual(r.errores, []);
});

test('199 planificarTitulares: tema con palabra prohibida, nombre inválido y días pasados', () => {
  let r = planificarTitulares({ ...base, carpetas: [carpeta('01-real-estate')] });
  assert.ok(r.errores.some((e) => e.includes('palabra prohibida')));
  r = planificarTitulares({ ...base, carpetas: [carpeta('1-space')] });
  assert.ok(r.errores.length > 0);
  r = planificarTitulares({ ...base, hoyISO: '2026-11-01', carpetas: [carpeta('01-space')] });
  assert.ok(r.errores.some((e) => e.includes('ya ha llegado')));
  r = planificarTitulares({ ...base, hoyISO: '2026-11-01', lanzamiento: null, carpetas: [carpeta('01-space')] });
  assert.deepEqual(r.errores, []);
});

test('199 planificarTitulares ignora la plantilla 00-example sin error ni aviso', () => {
  const r = planificarTitulares({ ...base, carpetas: [carpeta('00-example'), carpeta('01-space'), carpeta('02-food')] });
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.avisos, []);
  assert.deepEqual(r.omitidos, []);
  assert.deepEqual(r.nuevos.map((x) => x.n), [1, 2]);
  const sola = planificarTitulares({ ...base, carpetas: [carpeta('00-example', { archivos: ['otro.txt'] })] });
  assert.deepEqual(sola, { nuevos: [], omitidos: [], errores: [], avisos: [] });
  const rei = planificarTitulares({ ...base, reimportar: true, carpetas: [carpeta('00-example'), carpeta('01-space')] });
  assert.deepEqual(rei.errores, []);
});

// ---------- argumentos y lista ----------

test('analizarArgumentosTitulares y LISTA_REVISION', () => {
  assert.deepEqual(analizarArgumentosTitulares([]), { simular: false, reimportar: false, confirmar: false, revisado: false, errores: [] });
  const r = analizarArgumentosTitulares(['--simular', '--reimportar', '--confirmar', '--revisado']);
  assert.deepEqual([r.simular, r.reimportar, r.confirmar, r.revisado, r.errores.length], [true, true, true, true, 0]);
  assert.equal(analizarArgumentosTitulares(['--otro']).errores.length, 1);
  assert.ok(LISTA_REVISION.length >= 6);
});

// ---------- 213 archivos mensuales ----------

const B = 'A'.repeat(683) + '=';
const F = 'A'.repeat(1366) + '==';
const diaDatos = (n) => ({ n, tema: 'Space', clave: 'Q7m1Xa0=', textos: Array(5).fill(B), fichas: Array(5).fill(F) });
const dias = (de, hasta) => Array.from({ length: hasta - de + 1 }, (_, i) => diaDatos(de + i));
const resumen = (archivos) => archivos.map((a) => [a.mes, a.dias[0].n, a.dias.at(-1).n]);

test('213 repartirPorMes y unirMeses con lanzamiento null', () => {
  const todos = dias(1, 70);
  const archivos = repartirPorMes(todos, null);
  assert.deepEqual(resumen(archivos), [['2000-01', 1, 31], ['2000-02', 32, 60], ['2000-03', 61, 70]]);
  assert.ok(archivos.every((a) => a.version === 1));
  assert.equal(todos.length, 70);
  const u = unirMeses(archivos.map((a) => ({ nombre: `${a.mes}.json`, contenido: a })), { lanzamiento: null });
  assert.deepEqual(u.errores, []);
  assert.equal(u.dias.length, 70);
  assert.deepEqual(repartirPorMes(u.dias, null), archivos);
  assert.deepEqual(repartirPorMes([], null), []);
});

test('213 repartirPorMes con lanzamiento 2026-12-15', () => {
  const archivos = repartirPorMes(dias(1, 70), '2026-12-15');
  assert.deepEqual(resumen(archivos), [['2026-12', 1, 17], ['2027-01', 18, 48], ['2027-02', 49, 70]]);
  const u = unirMeses(archivos.map((a) => ({ nombre: `${a.mes}.json`, contenido: a })), { lanzamiento: '2026-12-15' });
  assert.deepEqual(u.errores, []);
  assert.equal(u.dias.length, 70);
});

test('213 unirMeses: errores', () => {
  const [a, b, c] = repartirPorMes(dias(1, 70), null);
  const f = (x) => ({ nombre: `${x.mes}.json`, contenido: x });
  const mal = (archivos, parte, opciones = { lanzamiento: null }) => {
    const r = unirMeses(archivos, opciones);
    assert.ok(r.errores.some((e) => e.includes(parte)), `${parte}: ${JSON.stringify(r.errores)}`);
    assert.deepEqual(r.dias, []);
    return r;
  };
  mal([{ nombre: '2026-12.JSON', contenido: a }], 'el nombre debe ser AAAA-MM.json');
  mal([{ nombre: 'titulares.json', contenido: a }], 'el nombre debe ser AAAA-MM.json');
  mal([{ nombre: 'subcarpeta', contenido: null }], 'el nombre debe ser AAAA-MM.json');
  mal([{ nombre: '2000-01.json', contenido: null }], 'no es JSON válido');
  mal([{ nombre: '2000-02.json', contenido: a }], 'estructura de la versión 1');
  mal([{ nombre: '2000-01.json', contenido: { ...a, version: 2 } }], 'estructura de la versión 1');
  mal([f(a), f(c)], 'Faltan días');
  mal([f(b)], 'deben empezar en 1');
  const otro = { ...a, dias: [...a.dias.slice(0, -1), { ...a.dias.at(-1), tema: 'Food' }] };
  // Mismo n (31) en dos archivos con contenido distinto.
  const solapado = { version: 1, mes: '2000-02', dias: [{ ...diaDatos(31), tema: 'Food' }, ...b.dias] };
  mal([f(a), f(solapado)], 'repetido');
  assert.ok(otro.dias.length === 31);
  mal([f({ version: 1, mes: '2000-01', dias: dias(1, 32) })], 'le corresponde 2000-02');
  // Cualquier texto de error se limita a nombrar archivo y día.
  const r = unirMeses([f({ version: 1, mes: '2000-01', dias: dias(1, 32) })], { lanzamiento: null });
  assert.match(r.errores[0], /El día 32 de Headlines está en 2000-01\.json/);
});

test('213 unirMeses: comprobarMes false acepta un día repetido idéntico una vez', () => {
  const a = { version: 1, mes: '2000-01', dias: dias(1, 31) };
  const b = { version: 1, mes: '2000-02', dias: dias(31, 40) };
  const r = unirMeses([{ nombre: '2000-01.json', contenido: a }, { nombre: '2000-02.json', contenido: b }], { lanzamiento: null, comprobarMes: false });
  assert.deepEqual(r.errores, []);
  assert.equal(r.dias.length, 40);
  const c = { ...b, dias: [{ ...diaDatos(31), tema: 'Food' }, ...dias(32, 40)] };
  const mal = unirMeses([{ nombre: '2000-01.json', contenido: a }, { nombre: '2000-02.json', contenido: c }], { lanzamiento: null, comprobarMes: false });
  assert.ok(mal.errores.length > 0);
});

test('213 unirMeses: sin archivos y entradas raras no lanzan', () => {
  assert.deepEqual(unirMeses([], { lanzamiento: null }), { dias: [], errores: [] });
  assert.doesNotThrow(() => unirMeses(undefined, {}));
  assert.doesNotThrow(() => unirMeses([null], { lanzamiento: null }));
  assert.ok(ARCHIVO_MES.test('2026-12.json'));
  assert.ok(!ARCHIVO_MES.test('2026-13.json'));
});

// ---------- 213 funciones de archivo (carpetas temporales del SO) ----------

function temporal(fn) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'titulares-'));
  try {
    return fn(raiz);
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
}

test('213 escribirTitularesMensuales y leerTitularesMensuales', () => {
  temporal((raiz) => {
    const dir = path.join(raiz, 'data', 'titulares');
    assert.deepEqual(leerTitularesMensuales(dir), []);
    const archivos = repartirPorMes(dias(1, 70), null);
    let r = escribirTitularesMensuales(dir, archivos, { borrarSobrantes: false });
    assert.deepEqual(r, { escritos: ['2000-01.json', '2000-02.json', '2000-03.json'], sinCambios: [], borrados: [] });
    const texto = fs.readFileSync(path.join(dir, '2000-01.json'), 'utf8');
    assert.equal(texto, JSON.stringify(archivos[0], null, 2) + '\n');
    assert.ok(!texto.includes('\r'));
    // Idempotente: nada cambia.
    r = escribirTitularesMensuales(dir, archivos, { borrarSobrantes: true });
    assert.deepEqual(r, { escritos: [], sinCambios: ['2000-01.json', '2000-02.json', '2000-03.json'], borrados: [] });
    // Lectura: incluye de todo, JSON roto con contenido null.
    fs.writeFileSync(path.join(dir, 'roto.json'), '{no');
    fs.writeFileSync(path.join(dir, 'notas.txt'), 'x');
    fs.mkdirSync(path.join(dir, 'sub'));
    const leidos = leerTitularesMensuales(dir);
    assert.deepEqual(leidos.map((x) => x.nombre), ['2000-01.json', '2000-02.json', '2000-03.json', 'notas.txt', 'roto.json', 'sub']);
    assert.deepEqual(leidos[0].contenido, archivos[0]);
    assert.equal(leidos.find((x) => x.nombre === 'roto.json').contenido, null);
    assert.equal(leidos.find((x) => x.nombre === 'sub').contenido, null);
    const u = unirMeses(leidos, { lanzamiento: null });
    assert.equal(u.errores.length, 3); // notas.txt, roto.json y sub
  });
});

test('213 escribirTitularesMensuales: solo cambia lo que cambia y borra solo meses sobrantes', () => {
  temporal((raiz) => {
    const dir = path.join(raiz, 'titulares');
    const archivos = repartirPorMes(dias(1, 70), null);
    escribirTitularesMensuales(dir, archivos);
    fs.writeFileSync(path.join(dir, 'notas.txt'), 'x');
    const nuevos = repartirPorMes(dias(1, 75), null);
    let r = escribirTitularesMensuales(dir, nuevos, { borrarSobrantes: false });
    assert.deepEqual(r.escritos, ['2000-03.json']);
    assert.deepEqual(r.sinCambios, ['2000-01.json', '2000-02.json']);
    r = escribirTitularesMensuales(dir, archivos.slice(0, 2), { borrarSobrantes: true });
    assert.deepEqual(r.borrados, ['2000-03.json']);
    assert.ok(fs.existsSync(path.join(dir, 'notas.txt')));
    assert.ok(!fs.existsSync(path.join(dir, '2000-03.json')));
    assert.throws(() => escribirTitularesMensuales(dir, [{ version: 1, mes: '../x', dias: [] }]), RangeError);
  });
});
