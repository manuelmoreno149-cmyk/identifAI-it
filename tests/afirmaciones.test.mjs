import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  analizarAfirmaciones, planificarAfirmaciones, medias, avisosLongitud, analizarArgumentosAfirmaciones,
  unirMeses, repartirPorMes, leerAfirmacionesMensuales, escribirAfirmacionesMensuales,
  archivosDelDia, emparejarIdiomas, normalizarParaDuplicados, contarFrases,
  LISTA_REVISION, ARCHIVO_MES, ARCHIVOS_AFIRMACIONES, CAMPOS_AFIRMACION,
  AFIRMACION_MAX, ACLARACION_MAX, DETALLE_MAX, UMBRAL_LONGITUD
} from '../herramientas/afirmaciones.mjs';

// ---------- 197 analizarAfirmaciones ----------

const fact = (i, extra = '') => `answer: fact\nclaim: Claim ${i} is true.\ntruth: Truth ${i} confirms it.\ndetails: Detail ${i}.\n${extra}`;
const fake = (i) => `answer: fake\nclaim: Claim ${i} is made up.\ntruth: Truth ${i} corrects it.`;
const lote = (bloques) => bloques.join('\n---\n');
const bueno = () => lote([fact(1), fake(2), fact(3), fact(4), fact(5)]);
const RUTA = '01-space/facts.en.txt';
const err = (texto, parte) => {
  const r = analizarAfirmaciones(texto, RUTA);
  assert.ok(r.errores.some((e) => e.includes(parte)), `${parte}: ${JSON.stringify(r.errores)}`);
  assert.ok(r.errores.every((e) => e.includes(RUTA)), 'cada error lleva la ruta');
  return r;
};
const con = (k, nuevo) => lote([fact(1), fake(2), fact(3), fact(4), fact(5)].map((b, i) => (i === k ? nuevo : b)));

test('197 analizarAfirmaciones acepta el ejemplo de 4.9 (con CRLF y BOM) y devuelve los campos', () => {
  const texto = '﻿' + bueno().replace(/\n/g, '\r\n') + '\r\n---\r\n';
  const r = analizarAfirmaciones(texto, 'x');
  assert.deepEqual(r.errores, []);
  assert.equal(r.afirmaciones.length, 5);
  assert.equal(r.afirmaciones[0].tipo, 'autentica');
  assert.equal(r.afirmaciones[0].afirmacion, 'Claim 1 is true.');
  assert.equal(r.afirmaciones[0].aclaracion, 'Truth 1 confirms it.');
  assert.deepEqual(r.afirmaciones[0].detalles, ['Detail 1.']);
  assert.equal(r.afirmaciones[1].tipo, 'generada');
  assert.deepEqual(r.afirmaciones[1].detalles, []);
  assert.deepEqual(CAMPOS_AFIRMACION, ['answer', 'claim', 'truth', 'details']);
  assert.deepEqual([AFIRMACION_MAX, ACLARACION_MAX, DETALLE_MAX], [140, 160, 80]);
});

test('197 analizarAfirmaciones: normaliza espacios y NFC; details admite 0 a 3', () => {
  const t = con(0, fact(1).replace('Claim 1', '  Café   au   lait '));
  assert.equal(analizarAfirmaciones(t, 'x').afirmaciones[0].afirmacion, 'Café au lait is true.');
  const tres = con(0, fact(1) + '\ndetails: B.\ndetails: C.');
  const r = analizarAfirmaciones(tres, 'x');
  assert.deepEqual(r.errores, []);
  assert.equal(r.afirmaciones[0].detalles.length, 3);
});

test('197 analizarAfirmaciones: un error por regla, con ruta y número de bloque', () => {
  const r = err(con(0, fact(1) + '\nlinea suelta'), 'bloque 1');
  err(con(1, fake(2) + '\nextra: x'), 'campo no previsto');
  err(con(1, fake(2) + '\nsource: https://a.example.com/x'), 'campo no previsto "source"');
  err(con(1, fake(2) + '\nclaim: otra'), 'repetido');
  err(con(1, fake(2) + '\ntruth: otra'), 'repetido');
  err(con(0, fact(1) + '\ndetails: B.\ndetails: C.\ndetails: D.'), 'tiene 4 details');
  err(con(0, 'answer: fact\ntruth: T.'), 'falta el campo claim');
  err(con(0, 'answer: fact\nclaim: C.'), 'falta el campo truth');
  err(con(0, 'claim: C.\ntruth: T.'), 'falta el campo answer');
  err(con(0, fact(1).replace('answer: fact', 'answer: true')), 'answer debe ser');
  err(con(0, fact(1).replace('Claim 1 is true.', '')), 'claim está vacío');
  err(con(0, fact(1).replace('Truth 1 confirms it.', '')), 'truth está vacío');
  err(con(0, fact(1).replace('Detail 1.', '')), 'details 1 está vacío');
  err(con(0, fact(1).replace('Claim 1', 'Cla\u0007im')), 'caracteres de control');
  err(con(0, fact(1).replace('Claim 1', 'Claim {1}')), 'no puede contener');
  err(con(0, fact(1).replace('Detail 1.', 'See https://example.com/x')), 'enlaces');
  err(con(0, fact(1).replace('Detail 1.', 'See www.example.com')), 'enlaces');
  err(con(0, fact(1).replace('Claim 1 is true.', 'x'.repeat(141))), 'máximo es 140');
  err(con(0, fact(1).replace('Truth 1 confirms it.', 'x'.repeat(161))), 'máximo es 160');
  err(con(0, fact(1).replace('Detail 1.', 'x'.repeat(81))), 'máximo es 80');
  err(con(0, fact(1).replace('Claim 1 is true.', '😀'.repeat(140))), 'claim pasa de 510 bytes');
  err(con(0, fact(1).replace('Truth 1 confirms it.', 'é'.repeat(160)) + '\ndetails: ' + 'é'.repeat(80) + '\ndetails: ' + 'é'.repeat(80)), 'juntos pasan de');
  err(lote([fact(1), fake(2), fact(3), fact(4)]), 'tiene 4 afirmaciones');
  err(lote([fact(1), fake(2), fact(3), fact(4), fact(5), fact(6)]), 'tiene 6 afirmaciones');
  err(lote([fact(1), fact(2), fact(3), fact(4), fact(5)]), '0 afirmaciones falsas');
  err(lote([fake(1), fake(2), fake(3), fake(4), fake(5)]), '5 afirmaciones falsas');
  assert.ok(r.errores.length > 0);
});

test('197 analizarAfirmaciones: avisos y nunca lanza', () => {
  const dos = con(0, 'answer: fact\nclaim: One. Two!\ntruth: A. B?\ndetails: x.');
  const r = analizarAfirmaciones(dos, 'x');
  assert.deepEqual(r.errores, []);
  assert.ok(r.avisos.some((a) => a.includes('afirmación tiene más de una frase')));
  assert.ok(r.avisos.some((a) => a.includes('aclaración tiene más de una frase')));
  const sinPunto = analizarAfirmaciones(con(0, 'answer: fact\nclaim: No final stop\ntruth: T.'), 'x');
  assert.ok(sinPunto.avisos.some((a) => a.includes('no acaba en punto')));
  assert.deepEqual(analizarAfirmaciones(bueno(), 'x').avisos, []);
  for (const raro of [undefined, null, 5, '', '---', '\u0000', {}]) {
    assert.doesNotThrow(() => analizarAfirmaciones(raro, 'x'));
  }
  assert.ok(analizarAfirmaciones('', 'x').errores.length > 0);
});

test('197 analizarAfirmaciones: los errores no muestran el texto de las afirmaciones', () => {
  const r = analizarAfirmaciones(con(0, 'answer: fact\nclaim: SECRETO-UNICO\ntruth: T.\nlinea secreta suelta'), 'x');
  assert.ok(r.errores.length > 0);
  assert.ok(!r.errores.join('\n').includes('secreta'));
  assert.ok(!r.errores.join('\n').includes('SECRETO'));
});

// ---------- elegirArchivo y normalizarParaDuplicados ----------

test('284 archivosDelDia: los dos archivos, ninguno o uno solo (error); facts.txt avisa; las notas se ignoran [D-139, D-159]', () => {
  assert.deepEqual(ARCHIVOS_AFIRMACIONES, { en: 'facts.en.txt', es: 'facts.es.txt' });
  assert.ok(Object.isFrozen(ARCHIVOS_AFIRMACIONES));
  assert.deepEqual(archivosDelDia(['facts.es.txt', 'facts.en.txt', 'tema.es.txt', 'datos.txt']), { en: 'facts.en.txt', es: 'facts.es.txt', errores: [], avisos: [] });
  assert.deepEqual(archivosDelDia(['datos.txt', 'datos.original.txt', 'tema.es.txt']), { en: null, es: null, errores: [], avisos: [] });
  assert.deepEqual(archivosDelDia([]), { en: null, es: null, errores: [], avisos: [] });
  assert.deepEqual(archivosDelDia(undefined), { en: null, es: null, errores: [], avisos: [] });
  let r = archivosDelDia(['facts.en.txt'], '02-dogs');
  assert.deepEqual([r.en, r.es], ['facts.en.txt', null]);
  assert.deepEqual(r.errores, ['02-dogs tiene facts.en.txt pero falta facts.es.txt.']);
  r = archivosDelDia(['facts.es.txt'], '02-dogs');
  assert.deepEqual(r.errores, ['02-dogs tiene facts.es.txt pero falta facts.en.txt.']);
  r = archivosDelDia(['facts.txt', 'facts.en.txt', 'facts.es.txt'], '01-fireworks');
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.avisos, ['01-fireworks/facts.txt ya no se usa: el inglés va en facts.en.txt y el español en facts.es.txt.']);
  // facts.txt solo no cuenta como archivo del día.
  assert.deepEqual(archivosDelDia(['facts.txt']).en, null);
});

const par = (tipo, nEn = 1, nEs = 1) => ({
  tipo,
  en: { afirmacion: 'Claim.', aclaracion: 'Truth.', detalles: Array(nEn).fill('Detail.') },
  es: { afirmacion: 'Afirmación.', aclaracion: 'Verdad.', detalles: Array(nEs).fill('Detalle.') }
});
const resultado = (...tipos) => ({ afirmaciones: tipos.map((t, i) => ({ tipo: t, afirmacion: `A${i}.`, aclaracion: `B${i}.`, detalles: ['d.'] })), errores: [], avisos: [] });

test('285 emparejarIdiomas: empareja por posición y avisa de distinto número de details', () => {
  const en = resultado('autentica', 'generada', 'autentica', 'autentica', 'generada');
  const es = resultado('autentica', 'generada', 'autentica', 'autentica', 'generada');
  es.afirmaciones[2].detalles = [];
  const r = emparejarIdiomas(en, es, '02-dogs');
  assert.deepEqual(r.errores, []);
  assert.equal(r.pares.length, 5);
  assert.deepEqual(r.pares[1], { tipo: 'generada', en: { afirmacion: 'A1.', aclaracion: 'B1.', detalles: ['d.'] }, es: { afirmacion: 'A1.', aclaracion: 'B1.', detalles: ['d.'] } });
  assert.deepEqual(r.avisos, ['AVISO: el bloque 3 de 02-dogs tiene 1 details en inglés y 0 en español.']);
  assert.deepEqual(par('fact').es.detalles.length, 1);
});

test('285 emparejarIdiomas: distinto número de bloques o distinto answer es error; nunca lanza', () => {
  const cinco = ['autentica', 'generada', 'autentica', 'autentica', 'generada'];
  let r = emparejarIdiomas(resultado(...cinco), resultado(...cinco.slice(0, 4)), '02-dogs');
  assert.equal(r.errores.length, 1);
  assert.match(r.errores[0], /02-dogs.*facts\.en\.txt tiene 5 bloques y facts\.es\.txt tiene 4/);
  assert.deepEqual(r.pares, []);
  const otro = [...cinco];
  otro[2] = 'generada';
  r = emparejarIdiomas(resultado(...cinco), resultado(...otro), '02-dogs');
  assert.deepEqual(r.errores, ['El bloque 3 de 02-dogs es fact en facts.en.txt y fake en facts.es.txt.']);
  assert.deepEqual(r.pares, []);
  // Si alguno de los dos ya tiene errores no se empareja ni se añaden más.
  r = emparejarIdiomas({ afirmaciones: [], errores: ['x'], avisos: [] }, resultado(...cinco), '02-dogs');
  assert.deepEqual(r, { pares: [], errores: [], avisos: [] });
  for (const raro of [undefined, null, {}, { afirmaciones: null }]) assert.doesNotThrow(() => emparejarIdiomas(raro, raro, 'x'));
});

test('normalizarParaDuplicados: NFC, minúsculas, espacios y puntuación final', () => {
  assert.equal(normalizarParaDuplicados('  The  Cat SAT.  '), 'the cat sat');
  assert.equal(normalizarParaDuplicados('Café!?'), 'café');
  assert.equal(normalizarParaDuplicados('A, b'), 'a, b');
  assert.equal(normalizarParaDuplicados('Is it true?'), normalizarParaDuplicados('is  it true'));
});

// ---------- 198 avisosLongitud ----------

const afi = (tipo, largo) => ({ tipo, afirmacion: 'a'.repeat(largo), aclaracion: 'x', detalles: [] });
const dia = (n, verdadera, falsa) => ({ n, afirmaciones: [afi('autentica', verdadera), afi('generada', falsa)] });

test('198 avisosLongitud: 60 y 81 (35 %) avisan; 40 y 48 (20 %) no', () => {
  const a = avisosLongitud([dia(3, 60, 81)]);
  assert.equal(a.length, 2); // día y global
  assert.equal(a[0], 'AVISO: día 3: las afirmaciones falsas miden de media un 35 % más que las verdaderas (81 frente a 60 caracteres).');
  assert.match(a[1], /^AVISO: en todo Fact or Fake, las afirmaciones falsas/);
  assert.deepEqual(avisosLongitud([dia(3, 40, 48)]), []);
  assert.equal(UMBRAL_LONGITUD, 0.2);
});

test('198 avisosLongitud: sentido contrario, medias y solo avisos', () => {
  const a = avisosLongitud([dia(1, 100, 50)]);
  assert.match(a[0], /las afirmaciones verdaderas miden de media un 100 % más que las falsas \(100 frente a 50 caracteres\)/);
  assert.deepEqual(avisosLongitud([]), []);
  assert.deepEqual(medias(dia(1, 40, 52).afirmaciones), { autentica: 40, generada: 52 });
  assert.deepEqual(medias([afi('autentica', 10)]), { autentica: 10, generada: null });
  assert.deepEqual(avisosLongitud([{ n: 1, afirmaciones: [afi('autentica', 10)] }]), []);
  assert.ok(avisosLongitud([dia(1, 100, 50)]).every((x) => typeof x === 'string' && x.startsWith('AVISO')));
});

test('286 avisosLongitud por idioma: cada idioma con su cálculo y sus mensajes lo dicen', () => {
  const dosIdiomas = (n, en, es) => ({ n, afirmaciones: { en, es } });
  const ok = [afi('autentica', 50), afi('generada', 52)];
  const mal = [afi('autentica', 60), afi('generada', 81)];
  // Solo el español se desvía.
  let a = avisosLongitud([dosIdiomas(3, ok, mal)]);
  assert.equal(a.length, 2);
  assert.equal(a[0], 'AVISO: día 3 (español): las afirmaciones falsas miden de media un 35 % más que las verdaderas (81 frente a 60 caracteres).');
  assert.match(a[1], /^AVISO: en todo Fact or Fake \(español\), las afirmaciones falsas/);
  // Solo el inglés.
  a = avisosLongitud([dosIdiomas(3, mal, ok)]);
  assert.match(a[0], /^AVISO: día 3 \(inglés\): /);
  // Los dos: avisos separados; sin desvío: ninguno.
  assert.equal(avisosLongitud([dosIdiomas(3, mal, mal)]).length, 4);
  assert.deepEqual(avisosLongitud([dosIdiomas(3, ok, ok)]), []);
  // No mezcla los dos idiomas en una sola media.
  assert.deepEqual(avisosLongitud([dosIdiomas(1, ok, ok), dosIdiomas(2, ok, ok)]), []);
});

test('198 avisosLongitud: aviso global aunque cada día cumpla', () => {
  assert.deepEqual(avisosLongitud([dia(1, 40, 47), dia(2, 40, 48)]), []);
  const peor = [dia(1, 40, 44), dia(2, 40, 51), dia(3, 40, 52)];
  const a = avisosLongitud(peor);
  assert.ok(a.some((x) => x.includes('en todo Fact or Fake')));
  assert.ok(a.some((x) => x.includes('día 3')));
  assert.ok(!a.some((x) => x.includes('día 1')));
});

// ---------- 199 planificarAfirmaciones ----------

const carpeta = (nombre, extra = {}) => ({ nombre, archivos: ['facts.en.txt', 'facts.es.txt', 'tema.es.txt'], temaEs: 'Tema en español', ...extra });
const base = { ultimoDia: 0, hoyISO: '2026-10-21', lanzamiento: '2026-11-01' };

test('199 planificarAfirmaciones: numeración, tema en los dos idiomas, archivos y mes', () => {
  const r = planificarAfirmaciones({
    ...base,
    carpetas: [carpeta('02-food', { temaEs: 'Comida' }), carpeta('01-space', { temaEs: 'Espacio' }), carpeta('03-dogs-of-Madrid', { temaEs: 'Perros de Madrid' })]
  });
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.nuevos.map((x) => [x.n, x.tema, x.temaEs, x.fecha, x.mes, x.archivos, x.carpeta]), [
    [1, 'Space', 'Espacio', '2026-11-01', '2026-11', { en: 'facts.en.txt', es: 'facts.es.txt' }, '01-space'],
    [2, 'Food', 'Comida', '2026-11-02', '2026-11', { en: 'facts.en.txt', es: 'facts.es.txt' }, '02-food'],
    [3, 'Dogs of Madrid', 'Perros de Madrid', '2026-11-03', '2026-11', { en: 'facts.en.txt', es: 'facts.es.txt' }, '03-dogs-of-Madrid']
  ]);
  assert.deepEqual(r.pendientes, []);
});

test('284 planificarAfirmaciones: con un solo idioma es error; facts.txt avisa; tema.es.txt obligatorio y válido', () => {
  let r = planificarAfirmaciones({ ...base, carpetas: [carpeta('02-dogs', { archivos: ['facts.en.txt', 'tema.es.txt'] })], ultimoDia: 1 });
  assert.ok(r.errores.includes('02-dogs tiene facts.en.txt pero falta facts.es.txt.'));
  r = planificarAfirmaciones({ ...base, carpetas: [carpeta('01-space', { archivos: ['facts.es.txt', 'tema.es.txt'] })] });
  assert.ok(r.errores.includes('01-space tiene facts.es.txt pero falta facts.en.txt.'));
  r = planificarAfirmaciones({ ...base, carpetas: [carpeta('01-space', { archivos: ['facts.txt', 'facts.en.txt', 'facts.es.txt', 'tema.es.txt'] })] });
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.avisos, ['01-space/facts.txt ya no se usa: el inglés va en facts.en.txt y el español en facts.es.txt.']);
  r = planificarAfirmaciones({ ...base, carpetas: [carpeta('01-space', { archivos: ['facts.en.txt', 'facts.es.txt'] })] });
  assert.deepEqual(r.errores, ['01-space: falta tema.es.txt.']);
  r = planificarAfirmaciones({ ...base, carpetas: [carpeta('01-space', { temaEs: 'Un bulo' })] });
  assert.ok(r.errores.some((e) => e.includes('01-space/tema.es.txt') && e.includes('bulo')));
  r = planificarAfirmaciones({ ...base, carpetas: [carpeta('01-space', { temaEs: null })] });
  assert.ok(r.errores.some((e) => e.includes('01-space/tema.es.txt')));
});

test('199 planificarAfirmaciones: cruce de mes y sin lanzamiento', () => {
  const carpetas = [];
  for (let i = 1; i <= 32; i++) carpetas.push(carpeta(`${String(i).padStart(2, '0')}-space`));
  const sin = planificarAfirmaciones({ carpetas, ultimoDia: 0, hoyISO: '2026-10-21', lanzamiento: null });
  assert.deepEqual(sin.errores, []);
  assert.equal(sin.nuevos[30].mes, '2000-01');
  assert.equal(sin.nuevos[31].mes, '2000-02');
  assert.equal(sin.nuevos[0].fecha, null);
  const conL = planificarAfirmaciones({ carpetas, ultimoDia: 0, hoyISO: '2026-10-21', lanzamiento: '2026-11-01' });
  assert.equal(conL.nuevos[29].mes, '2026-11');
  assert.equal(conL.nuevos[30].mes, '2026-12');
});

test('199 planificarAfirmaciones: huecos, repetidos y omitidos', () => {
  let r = planificarAfirmaciones({ ...base, carpetas: [carpeta('01-space'), carpeta('03-food')] });
  assert.ok(r.errores.some((e) => e.includes('no es consecutiva')));
  r = planificarAfirmaciones({ ...base, carpetas: [carpeta('01-space'), carpeta('01-food')] });
  assert.ok(r.errores.some((e) => e.includes('dos carpetas con el número 01')));
  r = planificarAfirmaciones({ ...base, ultimoDia: 2, carpetas: [carpeta('01-space'), carpeta('02-food'), carpeta('03-dogs')] });
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.omitidos, [1, 2]);
  assert.deepEqual(r.nuevos.map((x) => x.n), [3]);
  r = planificarAfirmaciones({ ...base, ultimoDia: 2, carpetas: [carpeta('04-dogs')] });
  assert.ok(r.errores.some((e) => e.includes('debe ser la del día 03')));
  r = planificarAfirmaciones({ ...base, ultimoDia: 2, reimportar: true, carpetas: [carpeta('01-space'), carpeta('02-food')] });
  assert.deepEqual(r.omitidos, []);
  assert.deepEqual(r.nuevos.map((x) => x.n), [1, 2]);
});

test('199 planificarAfirmaciones: carpetas sin archivo al final quedan pendientes; en medio es un hueco', () => {
  const sin = (n) => carpeta(n, { archivos: ['datos.txt', 'datos.original.txt'] });
  let r = planificarAfirmaciones({ ...base, carpetas: [carpeta('01-space'), sin('02-dogs'), sin('03-food')] });
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.nuevos.map((x) => x.n), [1]);
  assert.deepEqual(r.pendientes, [2, 3]);
  assert.ok(r.avisos.some((a) => a.includes('02-dogs y siguientes no tienen facts.en.txt ni facts.es.txt') && a.includes('día 1')));
  r = planificarAfirmaciones({ ...base, carpetas: [carpeta('01-space'), sin('02-dogs'), carpeta('03-food')] });
  assert.ok(r.errores.some((e) => e.includes('hueco')));
  r = planificarAfirmaciones({ ...base, carpetas: [sin('01-space')] });
  assert.deepEqual([r.errores, r.nuevos, r.pendientes], [[], [], [1]]);
});

test('199 planificarAfirmaciones: datos.txt, datos.original.txt, ia/ y real/ no dan errores ni avisos [D-139]', () => {
  const r = planificarAfirmaciones({ ...base, carpetas: [carpeta('01-space', { archivos: ['facts.en.txt', 'facts.es.txt', 'tema.es.txt', 'datos.txt', 'datos.original.txt', '.DS_Store', 'otro.png'], subcarpetas: ['ia', 'real'] })] });
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.avisos, []);
  assert.deepEqual(r.nuevos[0].archivos, { en: 'facts.en.txt', es: 'facts.es.txt' });
});

test('199 planificarAfirmaciones: tema igual al de Images en los dos idiomas', () => {
  const temasImagenes = new Map([[1, { en: 'Space', es: 'Tema en español' }], [2, { en: 'Cats', es: 'Tema en español' }]]);
  const r = planificarAfirmaciones({ ...base, temasImagenes, carpetas: [carpeta('01-space'), carpeta('02-dogs'), carpeta('03-food')] });
  assert.equal(r.errores.length, 1);
  assert.match(r.errores[0], /El tema de 02-dogs no coincide con el del día 2 de Images\./);
  assert.deepEqual(planificarAfirmaciones({ ...base, temasImagenes, carpetas: [carpeta('01-space')] }).errores, []);
  const es = planificarAfirmaciones({ ...base, temasImagenes, carpetas: [carpeta('01-space', { temaEs: 'Otro tema' })] });
  assert.deepEqual(es.errores, ['El tema en español de 01-space no coincide con el del día 1 de Images.']);
});

test('199 planificarAfirmaciones: tema con palabra prohibida, nombre inválido y días pasados', () => {
  let r = planificarAfirmaciones({ ...base, carpetas: [carpeta('01-real-estate')] });
  assert.ok(r.errores.some((e) => e.includes('palabra prohibida')));
  r = planificarAfirmaciones({ ...base, carpetas: [carpeta('1-space')] });
  assert.ok(r.errores.length > 0);
  r = planificarAfirmaciones({ ...base, hoyISO: '2026-11-01', carpetas: [carpeta('01-space')] });
  assert.ok(r.errores.some((e) => e.includes('ya ha llegado')));
  r = planificarAfirmaciones({ ...base, hoyISO: '2026-11-01', lanzamiento: null, carpetas: [carpeta('01-space')] });
  assert.deepEqual(r.errores, []);
});

test('199 planificarAfirmaciones ignora la plantilla 00-example sin error ni aviso', () => {
  const r = planificarAfirmaciones({ ...base, carpetas: [carpeta('00-example'), carpeta('01-space'), carpeta('02-food')] });
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.avisos, []);
  assert.deepEqual(r.nuevos.map((x) => x.n), [1, 2]);
  const sola = planificarAfirmaciones({ ...base, carpetas: [carpeta('00-example', { archivos: ['otro.txt'] })] });
  assert.deepEqual(sola, { nuevos: [], omitidos: [], pendientes: [], errores: [], avisos: [] });
});

// ---------- argumentos y lista ----------

test('analizarArgumentosAfirmaciones', () => {
  assert.deepEqual(analizarArgumentosAfirmaciones([]), { simular: false, reimportar: false, confirmar: false, revisado: false, errores: [] });
  const r = analizarArgumentosAfirmaciones(['--simular', '--reimportar', '--confirmar', '--revisado']);
  assert.deepEqual([r.simular, r.reimportar, r.confirmar, r.revisado, r.errores.length], [true, true, true, true, 0]);
  assert.equal(analizarArgumentosAfirmaciones(['--otro']).errores.length, 1);
});

test('LISTA_REVISION tiene los 8 puntos de 4.13 y el 9.º del español [D-136, D-137, D-159]', () => {
  assert.equal(LISTA_REVISION.length, 9);
  assert.equal(
    LISTA_REVISION[8],
    'La versión en español dice lo mismo que la inglesa (misma respuesta, mismas cifras con unidades equivalentes, mismo matiz en la `truth` y los detalles) y cumple igual la norma.'
  );
  assert.match(LISTA_REVISION[0], /^Ninguna afirmación falsa daña la reputación/);
  assert.match(LISTA_REVISION[1], /salud, medicina, nutrición, fármacos ni remedios\.$/);
  assert.match(LISTA_REVISION[4], /política, elecciones, gobiernos, partidos ni conflictos\.$/);
  assert.match(LISTA_REVISION[5], /^Cada `truth` es correcta, se entiende sola/);
  assert.match(LISTA_REVISION[6], /engañosa por omisión/);
  assert.match(LISTA_REVISION[7], /^Verdaderas y falsas tienen el mismo estilo/);
  assert.ok(!LISTA_REVISION.join(' ').toLowerCase().includes('fuente') || LISTA_REVISION[5].includes('sin referirse a fuentes'));
});


// ---------- 213 archivos mensuales ----------

const B = 'A'.repeat(683) + '=';
const F = B;
const temaSpace = { en: 'Space', es: 'Espacio' };
const dosIdiomasBloques = () => ({ en: Array(5).fill(B), es: Array(5).fill(B) });
const diaDatos = (n) => ({ n, tema: temaSpace, clave: 'Q7m1Xa0=', textos: dosIdiomasBloques(), fichas: dosIdiomasBloques() });
const dias = (de, hasta) => Array.from({ length: hasta - de + 1 }, (_, i) => diaDatos(de + i));
const resumen = (archivos) => archivos.map((a) => [a.mes, a.dias[0].n, a.dias.at(-1).n]);

test('213 repartirPorMes y unirMeses con lanzamiento null', () => {
  const todos = dias(1, 70);
  const archivos = repartirPorMes(todos, null);
  assert.deepEqual(resumen(archivos), [['2000-01', 1, 31], ['2000-02', 32, 60], ['2000-03', 61, 70]]);
  assert.ok(archivos.every((a) => a.version === 2));
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
  mal([{ nombre: 'afirmaciones.json', contenido: a }], 'el nombre debe ser AAAA-MM.json');
  mal([{ nombre: 'subcarpeta', contenido: null }], 'el nombre debe ser AAAA-MM.json');
  mal([{ nombre: '2000-01.json', contenido: null }], 'no es JSON válido');
  mal([{ nombre: '2000-02.json', contenido: a }], 'estructura de la versión 2');
  mal([{ nombre: '2000-01.json', contenido: { ...a, version: 3 } }], 'estructura de la versión 2');
  // Un archivo v1 (solo inglés) tiene su mensaje propio [4.21].
  const v1 = { version: 1, mes: '2000-01', dias: [{ n: 1, tema: 'Space', clave: 'Q7m1Xa0=', textos: Array(5).fill(B), fichas: Array(5).fill(B) }] };
  const rv1 = mal([{ nombre: '2000-01.json', contenido: v1 }], 'data/facts/2000-01.json es de la versión 1 (solo inglés): rehazlo con npm run afirmaciones -- --reimportar --confirmar --revisado.');
  assert.equal(rv1.errores.length, 1);
  // Dos idiomas obligatorios en cada bloque.
  mal([{ nombre: '2000-01.json', contenido: { ...a, dias: [{ ...diaDatos(1), textos: { en: Array(5).fill(B) } }] } }], 'estructura de la versión 2');
  mal([f(a), f(c)], 'Faltan días');
  mal([f(b)], 'deben empezar en 1');
  const otro = { ...a, dias: [...a.dias.slice(0, -1), { ...a.dias.at(-1), tema: { en: 'Food', es: 'Comida' } }] };
  // Mismo n (31) en dos archivos con contenido distinto.
  const solapado = { version: 2, mes: '2000-02', dias: [{ ...diaDatos(31), tema: { en: 'Food', es: 'Comida' } }, ...b.dias] };
  mal([f(a), f(solapado)], 'repetido');
  assert.ok(otro.dias.length === 31);
  mal([f({ version: 2, mes: '2000-01', dias: dias(1, 32) })], 'le corresponde 2000-02');
  // Cualquier texto de error se limita a nombrar archivo y día.
  const r = unirMeses([f({ version: 2, mes: '2000-01', dias: dias(1, 32) })], { lanzamiento: null });
  assert.match(r.errores[0], /El día 32 de Fact or Fake está en 2000-01\.json/);
});

test('213 unirMeses: comprobarMes false acepta un día repetido idéntico una vez', () => {
  const a = { version: 2, mes: '2000-01', dias: dias(1, 31) };
  const b = { version: 2, mes: '2000-02', dias: dias(31, 40) };
  const r = unirMeses([{ nombre: '2000-01.json', contenido: a }, { nombre: '2000-02.json', contenido: b }], { lanzamiento: null, comprobarMes: false });
  assert.deepEqual(r.errores, []);
  assert.equal(r.dias.length, 40);
  const c = { ...b, dias: [{ ...diaDatos(31), tema: { en: 'Food', es: 'Comida' } }, ...dias(32, 40)] };
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
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'afirmaciones-'));
  try {
    return fn(raiz);
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
}

test('213 escribirAfirmacionesMensuales y leerAfirmacionesMensuales', () => {
  temporal((raiz) => {
    const dir = path.join(raiz, 'data', 'facts');
    assert.deepEqual(leerAfirmacionesMensuales(dir), []);
    const archivos = repartirPorMes(dias(1, 70), null);
    let r = escribirAfirmacionesMensuales(dir, archivos, { borrarSobrantes: false });
    assert.deepEqual(r, { escritos: ['2000-01.json', '2000-02.json', '2000-03.json'], sinCambios: [], borrados: [] });
    const texto = fs.readFileSync(path.join(dir, '2000-01.json'), 'utf8');
    assert.equal(texto, JSON.stringify(archivos[0], null, 2) + '\n');
    assert.ok(!texto.includes('\r'));
    // Idempotente: nada cambia.
    r = escribirAfirmacionesMensuales(dir, archivos, { borrarSobrantes: true });
    assert.deepEqual(r, { escritos: [], sinCambios: ['2000-01.json', '2000-02.json', '2000-03.json'], borrados: [] });
    // Lectura: incluye de todo, JSON roto con contenido null.
    fs.writeFileSync(path.join(dir, 'roto.json'), '{no');
    fs.writeFileSync(path.join(dir, 'notas.txt'), 'x');
    fs.mkdirSync(path.join(dir, 'sub'));
    const leidos = leerAfirmacionesMensuales(dir);
    assert.deepEqual(leidos.map((x) => x.nombre), ['2000-01.json', '2000-02.json', '2000-03.json', 'notas.txt', 'roto.json', 'sub']);
    assert.deepEqual(leidos[0].contenido, archivos[0]);
    assert.equal(leidos.find((x) => x.nombre === 'roto.json').contenido, null);
    assert.equal(leidos.find((x) => x.nombre === 'sub').contenido, null);
    const u = unirMeses(leidos, { lanzamiento: null });
    assert.equal(u.errores.length, 3); // notas.txt, roto.json y sub
  });
});

test('213 escribirAfirmacionesMensuales: solo cambia lo que cambia y borra solo meses sobrantes', () => {
  temporal((raiz) => {
    const dir = path.join(raiz, 'facts');
    const archivos = repartirPorMes(dias(1, 70), null);
    escribirAfirmacionesMensuales(dir, archivos);
    fs.writeFileSync(path.join(dir, 'notas.txt'), 'x');
    const nuevos = repartirPorMes(dias(1, 75), null);
    let r = escribirAfirmacionesMensuales(dir, nuevos, { borrarSobrantes: false });
    assert.deepEqual(r.escritos, ['2000-03.json']);
    assert.deepEqual(r.sinCambios, ['2000-01.json', '2000-02.json']);
    r = escribirAfirmacionesMensuales(dir, archivos.slice(0, 2), { borrarSobrantes: true });
    assert.deepEqual(r.borrados, ['2000-03.json']);
    assert.ok(fs.existsSync(path.join(dir, 'notas.txt')));
    assert.ok(!fs.existsSync(path.join(dir, '2000-03.json')));
    assert.throws(() => escribirAfirmacionesMensuales(dir, [{ version: 2, mes: '../x', dias: [] }]), RangeError);
  });
});

test('contarFrases: abreviaturas y decimales no cierran frase', () => {
  for (const t of [
    "It ends Sgt. Pepper's Lonely Hearts Club Band.", 'Dr. Smith met Mr. Jones and Mrs. Lee.',
    'Ms. Ray and St. Louis fans.', 'Jr. and Sr. played.', 'The U.S. has 13,700 stores.', 'The U.K. and the U.S. agree.',
    'Cats vs. dogs, etc. are common.', 'Pets, e.g. dogs, i.e. animals, rest.', 'It starts at 5 a.m. and ends at 9 p.m. today.',
    'It weighs 3.5 kg and costs 2.25 dollars.', 'It is about 3.5 times larger.'
  ]) assert.equal(contarFrases(t), 1, t);
  for (const t of [
    'Fue en EE. UU. el 4 de julio.', 'Hay relieves de hacia el año 3000 a. C. que muestran combates.',
    'Lanzados en Washington D. C. el 4 de julio de 2026.', 'Pesa 2,5 kg y mide 1,11 m.', 'La Sra. Pérez y la Dra. Gil llegaron.'
  ]) assert.equal(contarFrases(t), 1, t);
  assert.equal(contarFrases('Duró 40 minutos. Fue en EE. UU. Nada más.'), 2); // «UU.» seguido de texto se trata como abreviatura
  assert.equal(contarFrases('One. Two!'), 2);
  assert.equal(contarFrases('Is it? Yes. Sure.'), 3);
  assert.equal(contarFrases('Dr. Who. Then another.'), 2);
  assert.equal(contarFrases(''), 0);
  assert.equal(contarFrases(undefined), 0);
});

test('analizarAfirmaciones: abreviaturas y decimales no disparan el aviso de varias frases', () => {
  const r = analizarAfirmaciones(con(0, 'answer: fact\nclaim: The U.S. has 3.5 million km of roads.\ntruth: Sgt. Pepper (1967) ends with a tone.\ndetails: x.'), 'x');
  assert.deepEqual(r.errores, []);
  assert.ok(!r.avisos.some((a) => a.includes('más de una frase')));
});
