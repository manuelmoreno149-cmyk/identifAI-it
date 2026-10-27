import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analizarCarpeta, temaDeCarpeta, contienePalabraProhibida, fuenteDeArchivo, planificar,
  barajar, nuevoId, distanciaHamming, compararPesos, avisosMezcla, analizarPesos,
  POSICIONES_RECORTE, analizarLote, analizarArgumentos, comprobarReimportacion, mensajeReimportacion,
  analizarPruebasAbiertas, normalizarFicha, calendarioAnteriorValido,
  analizarArgumentosLanzamiento, comprobarCambioLanzamiento, migrarCalendario, migrarBanco
} from '../herramientas/temas.mjs';

const nombres = ['01-fireworks', '02-dogs', '03-people-eating', '04-people-drinking', '05-table-with-food', '06-nightclub', '07-people-fighting'];
const carpeta = (nombre, ia = 2, real = 3) => ({
  nombre, subcarpetas: ['ia', 'real'], sueltos: [],
  ia: Array.from({ length: ia }, (_, i) => `Gemini_Generated_Image_${i}.jpg`),
  real: Array.from({ length: real }, (_, i) => `autor-${i}-unsplash.jpg`)
});
const carpetas = () => nombres.map((n, i) => carpeta(n, (i % 4) + 1, 4 - (i % 4)));
const base = { ultimoDia: 0, hoyISO: '2026-10-21', lanzamiento: '2026-11-01' };

test('83 temaDeCarpeta y analizarCarpeta', () => {
  assert.equal(temaDeCarpeta('01-fireworks'), 'Fireworks');
  assert.equal(temaDeCarpeta('02-dogs'), 'Dogs');
  assert.equal(temaDeCarpeta('05-table-with-food'), 'Table with food');
  assert.equal(temaDeCarpeta('08-dogs-of-Madrid'), 'Dogs of Madrid');
  assert.deepEqual(analizarCarpeta('07-people-fighting'), { n: 7, tema: 'People fighting' });
  for (const mal of ['2-perros', '00-perros', '02_perros', '02-dogs-', '02--perros', '02-', 'perros']) {
    assert.throws(() => analizarCarpeta(mal), mal);
  }
});

test('84 contienePalabraProhibida', () => {
  for (const ok of ['Gente peleando', 'Fotos reales', 'Tiarras', 'Aire libre', 'identifAI-it']) assert.equal(contienePalabraProhibida(ok), null, ok);
  assert.equal(contienePalabraProhibida('Real Madrid'), 'real');
  assert.equal(contienePalabraProhibida('Arte IA'), 'ia');
  assert.equal(contienePalabraProhibida('fakeNews'), 'fake');
  assert.equal(contienePalabraProhibida('Retrato-AI'), 'ai');
});

test('85 fuenteDeArchivo', () => {
  assert.deepEqual(fuenteDeArchivo('Gemini_Generated_Image_lwfc7alwfc7alwfc.jpg', 'generada'), { fuente: 'Own creation (Gemini)', licencia: 'Gemini Terms of Use' });
  assert.equal(fuenteDeArchivo('ChatGPT Image 21 oct 2026.png', 'generada').fuente, 'Own creation (ChatGPT)');
  assert.equal(fuenteDeArchivo('ray-hennessy-gdTxVSAE5sk-unsplash.jpg', 'autentica').fuente, 'Unsplash');
  assert.equal(fuenteDeArchivo('pexels-ana-123.jpg', 'autentica').fuente, 'Pexels');
  assert.throws(() => fuenteDeArchivo('foto.jpg', 'autentica'));
  assert.throws(() => fuenteDeArchivo('x-unsplash.jpg', 'generada'));
  assert.throws(() => fuenteDeArchivo('Gemini_Generated_Image_x.jpg', 'autentica'));
});

test('86 planificar: caso correcto y calendario ya importado', () => {
  const r = planificar({ ...base, carpetas: carpetas() });
  assert.deepEqual(r.errores, []);
  assert.equal(r.nuevos.length, 7);
  assert.deepEqual(r.nuevos.map((d) => d.n), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(r.nuevos[0].fecha, '2026-11-01');
  assert.equal(r.nuevos[6].fecha, '2026-11-07');
  assert.equal(r.nuevos[1].tema, 'Dogs');
  assert.ok(r.nuevos.every((d) => d.imagenes.length === 5));
  const o = planificar({ ...base, ultimoDia: 7, carpetas: carpetas() });
  assert.deepEqual(o.omitidos, [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(o.nuevos.length, 0);
  assert.deepEqual(o.errores, []);
});

test('86 planificar: errores sin lanzar', () => {
  const con = (i, nueva) => { const c = carpetas(); c[i] = nueva; return planificar({ ...base, carpetas: c }); };
  let r = con(5, carpeta('06-nightclub', 3, 3));
  assert.ok(r.errores.some((e) => e.includes('06-nightclub') && e.includes('6 imágenes')));
  r = con(2, carpeta('03-people-eating', 5, 0));
  assert.ok(r.errores.some((e) => e.includes('03-people-eating') && e.includes('entre 1 y 4')));
  r = con(2, carpeta('03-people-eating', 0, 5));
  assert.ok(r.errores.some((e) => e.includes('entre 1 y 4')));
  r = con(1, { ...carpeta('02-dogs'), subcarpetas: ['ia'], real: [] });
  assert.ok(r.errores.length > 0);
  const hueco = carpetas().filter((c) => !c.nombre.startsWith('02'));
  assert.ok(planificar({ ...base, carpetas: hueco }).errores.some((e) => /consecutiva/.test(e)));
  const rep = [...carpetas(), carpeta('03-otra')];
  assert.ok(planificar({ ...base, carpetas: rep }).errores.some((e) => /dos carpetas/.test(e)));
  const salto = carpetas().slice(0, 2).concat([carpeta('05-mesa')]);
  assert.ok(planificar({ ...base, ultimoDia: 3, carpetas: salto }).errores.length > 0);
  r = con(0, carpeta('01-arte-ia'));
  assert.ok(r.errores.some((e) => e.includes('"ia"')));
  r = planificar({ ...base, hoyISO: '2026-11-03', carpetas: carpetas() });
  assert.ok(r.errores.some((e) => /ya ha llegado/.test(e)));
});

test('87 barajar', () => {
  const l = [1, 2, 3, 4, 5];
  const sec = () => { let i = 0; const v = [0.1, 0.9, 0.4, 0.7]; return () => v[i++ % v.length]; };
  const a = barajar(l, sec());
  assert.deepEqual([...a].sort(), l);
  assert.deepEqual(l, [1, 2, 3, 4, 5]);
  assert.deepEqual(barajar(l, sec()), a);
});

test('88 nuevoId', () => {
  const usados = new Set(['aaaaaaaaaa']);
  for (let i = 0; i < 10000; i++) {
    const id = nuevoId(Math.random, usados);
    assert.match(id, /^[a-z0-9]{10}$/);
    assert.ok(!/ia|ai|real|fake/.test(id));
    assert.ok(!usados.has(id));
  }
});

test('89 compararPesos', () => {
  assert.equal(compararPesos([100, 100], [130, 130]).aviso, true);
  assert.equal(compararPesos([100], [125]).aviso, false);
  assert.equal(compararPesos([125], [100]).aviso, false);
  assert.equal(compararPesos([], [100]), null);
});

test('90 avisosMezcla devuelve los arrays exactos de D-67', () => {
  assert.deepEqual(avisosMezcla([4, 2, 2, 1, 3, 3, 1]), []);
  assert.deepEqual(avisosMezcla([2, 2, 2, 1]), [
    'AVISO: 65 % de las pruebas son auténticas (13 de 20); más del 60 % de un mismo tipo.',
    'AVISO: 3 días seguidos (del 1 al 3) con 2 generadas cada uno; el reparto se vuelve predecible.'
  ]);
  assert.deepEqual(avisosMezcla([4, 4, 3, 4]), ['AVISO: 75 % de las pruebas son generadas (15 de 20); más del 60 % de un mismo tipo.']);
  assert.deepEqual(avisosMezcla([]), []);
});

test('distanciaHamming', () => {
  assert.equal(distanciaHamming('0000000000000000', '0000000000000000'), 0);
  assert.equal(distanciaHamming('f000000000000000', '0000000000000001'), 5);
});

test('analizarPesos detecta días afectados', () => {
  const desof = (clave, n, i) => (i === 0 ? 1 : 0);
  const dias = [{ n: 1, pruebas: ['a', 'b'], clave: 'x' }, { n: 2, pruebas: ['c', 'd'], clave: 'x' }];
  const r = analizarPesos({ dias, tamanos: { a: 200, b: 100, c: 100, d: 100 }, desofuscar: desof });
  assert.deepEqual(r.diasAfectados, [1]);
  assert.equal(r.global.aviso, true);
});

test('95 POSICIONES_RECORTE', () => {
  assert.deepEqual(POSICIONES_RECORTE, { izquierda: 'left', centro: 'centre', derecha: 'right', arriba: 'top', abajo: 'bottom' });
});

const rutas = ['04-people-drinking/real/a.jpg', '04-people-drinking/ia/b.png'];
const lim = { recortes: {}, errores: [], avisos: [] };

test('96 analizarLote: sin lote, vacío y valores válidos', () => {
  assert.deepEqual(analizarLote(null, rutas), lim);
  assert.deepEqual(analizarLote(undefined, rutas), lim);
  assert.deepEqual(analizarLote({}, rutas), lim);
  for (const v of Object.keys(POSICIONES_RECORTE)) {
    assert.deepEqual(analizarLote({ [rutas[0]]: v }, rutas), { recortes: { [rutas[0]]: v }, errores: [], avisos: [] });
  }
});

test('96 analizarLote: claves y valores no válidos', () => {
  for (const clave of ['04-people-drinking/real/x.jpg', '04-people-drinking\real\a.jpg', 'entrada/temas/04-people-drinking/real/a.jpg', '04-people-drinking/REAL/a.jpg']) {
    const r = analizarLote({ [clave]: 'izquierda' }, rutas);
    assert.equal(r.errores.length, 1, clave);
    assert.ok(r.errores[0].includes(clave));
    assert.deepEqual(r.recortes, {});
  }
  for (const v of ['Izquierda', 'left', 'atencion', '', 3, null]) {
    const r = analizarLote({ [rutas[0]]: v }, rutas);
    assert.equal(r.errores.length, 1, String(v));
    assert.ok(r.errores[0].includes(rutas[0]) && r.errores[0].includes('izquierda, centro, derecha, arriba o abajo'));
    assert.deepEqual(r.recortes, {});
  }
  for (const malo of [[], 'izquierda', 3, true]) {
    assert.deepEqual(analizarLote(malo, rutas), {
      recortes: {}, errores: ['herramientas/lote.json debe ser un objeto JSON con rutas como claves.'], avisos: []
    });
  }
});

test('96 analizarLote: omitidas, NFC, varios errores y sin mutar', () => {
  const r = analizarLote({ '01-perros/ia/z.jpg': 'arriba' }, rutas, ['01-perros/ia/z.jpg']);
  assert.equal(r.errores.length, 0);
  assert.equal(r.avisos.length, 1);
  assert.ok(r.avisos[0].includes('01-perros/ia/z.jpg') && r.avisos[0].includes('--reimportar'));
  assert.deepEqual(r.recortes, {});
  const nfc = ['09-años/real/a.jpg'];
  const nfd = '09-años/real/a.jpg'.normalize('NFD');
  assert.notEqual(nfd, nfc[0]);
  assert.deepEqual(analizarLote({ [nfd]: 'centro' }, nfc).recortes, { [nfc[0]]: 'centro' });
  const lote = { [rutas[0]]: 'mal', 'no/existe.jpg': 'abajo', [rutas[1]]: 'derecha' };
  const copia = structuredClone(lote);
  const listas = structuredClone(rutas);
  const m = analizarLote(lote, rutas);
  assert.equal(m.errores.length, 2);
  assert.deepEqual(m.recortes, { [rutas[1]]: 'derecha' });
  assert.deepEqual(lote, copia);
  assert.deepEqual(rutas, listas);
});

test('analizarArgumentos', () => {
  assert.deepEqual(analizarArgumentos([]).errores, []);
  const ok = analizarArgumentos(['--reimportar', '--confirmar', '--simular']);
  assert.deepEqual([ok.reimportar, ok.confirmar, ok.simular, ok.errores.length], [true, true, true, 0]);
  assert.deepEqual(analizarArgumentos(['--confirmar']).errores, ['--confirmar solo vale junto a --reimportar.']);
  assert.equal(analizarArgumentos(['--reimportar', '--banco-nuevo']).errores.length, 1);
  assert.match(analizarArgumentos(['--raro']).errores[0], /desconocido: --raro/);
});

const diasCal = (desde = 1) => Array.from({ length: 7 }, (_, i) => ({ n: i + 1, fecha: `2026-11-0${i + 1}` })).slice(desde - 1);

test('comprobarReimportacion', () => {
  const base = { calendario: { dias: diasCal() }, nombresCarpetas: nombres, hoyISO: '2026-10-22' };
  assert.deepEqual(comprobarReimportacion(base), []);
  assert.deepEqual(comprobarReimportacion({ ...base, calendario: { dias: [] } }), ['No hay nada que reimportar; usa npm run importar.']);
  assert.deepEqual(comprobarReimportacion({ ...base, calendario: undefined }), ['No hay nada que reimportar; usa npm run importar.']);
  assert.match(comprobarReimportacion({ ...base, hoyISO: '2026-11-01' })[0], /^El día 01 \(2026-11-01\) ya ha llegado o ha pasado: después del lanzamiento/);
  assert.deepEqual(comprobarReimportacion({ ...base, nombresCarpetas: nombres.filter((n) => !n.startsWith('03')) }), [
    'Para reimportar falta la carpeta del día 03 en entrada/temas/.'
  ]);
  assert.deepEqual(comprobarReimportacion({ ...base, nombresCarpetas: [...nombres, '08-nueva'] }), []);
});

test('mensajeReimportacion', () => {
  assert.equal(
    mensajeReimportacion({ dias: diasCal(), borradas: 35 }),
    'Se regenerarían 7 días (2026-11-01 a 2026-11-07) y se borrarían 35 imágenes antiguas de casos/. Para hacerlo: npm run importar -- --reimportar --confirmar'
  );
});

test('97 el recorte manual conserva la mitad pedida', async () => {
  const { default: sharp } = await import('sharp');
  const mitad = (c) => ({ create: { width: 500, height: 500, channels: 3, background: c } });
  const negro = await sharp(mitad({ r: 0, g: 0, b: 0 })).png().toBuffer();
  const blanco = await sharp(mitad({ r: 255, g: 255, b: 255 })).png().toBuffer();
  const origen = await sharp({ create: { width: 1000, height: 500, channels: 3, background: { r: 128, g: 128, b: 128 } } })
    .composite([{ input: negro, left: 0, top: 0 }, { input: blanco, left: 500, top: 0 }])
    .png()
    .toBuffer();
  const media = async (recorte) => {
    const { data } = await sharp(origen).resize(80, 100, { fit: 'cover', position: POSICIONES_RECORTE[recorte] }).greyscale().raw().toBuffer({ resolveWithObject: true });
    return data.reduce((s, x) => s + x, 0) / data.length;
  };
  assert.ok((await media('izquierda')) < 10);
  assert.ok((await media('derecha')) > 245);
});

test('118. analizarPruebasAbiertas', () => {
  assert.equal(analizarPruebasAbiertas("import x from './x.js';\nconst PRUEBAS_ABIERTAS = true; // D-71\n"), true);
  assert.equal(analizarPruebasAbiertas("import x from './x.js';\nconst PRUEBAS_ABIERTAS = false; // D-71\n"), false);
  for (const t of [
    '', 'const PRUEBAS_ABIERTAS=true;', '  const PRUEBAS_ABIERTAS = true;', 'let PRUEBAS_ABIERTAS = true;',
    'export const PRUEBAS_ABIERTAS = true;', '// const PRUEBAS_ABIERTAS = true;',
    'const PRUEBAS_ABIERTAS = true;\nconst PRUEBAS_ABIERTAS = false;'
  ]) assert.equal(analizarPruebasAbiertas(t), null, t);
});

// ---------- Fichas [1.3] ----------

const bytes = (t) => new TextEncoder().encode(t).length;

test('143 normalizarFicha: limpieza', () => {
  assert.equal(normalizarFicha('﻿hola\r\nmundo\r!', 510).texto, 'hola\nmundo\n!');
  assert.equal(normalizarFicha('a\tb', 510).texto, 'a b');
  assert.equal(normalizarFicha('  \n hola  \n ', 510).texto, 'hola');
  assert.equal(normalizarFicha('a\n\n\n\nb', 510).texto, 'a\n\nb');
  assert.equal(normalizarFicha('mañana', 510).texto, 'mañana');
  assert.equal(normalizarFicha('a\u0000b\u007fc', 510).texto, 'a b c');
  const v = normalizarFicha('   \n\t ', 510);
  assert.equal(v.vacia, true);
  assert.equal(v.texto, '');
  assert.equal(normalizarFicha('hola', 510).vacia, false);
  assert.equal(normalizarFicha('hola', 510).truncada, false);
});

test('143 normalizarFicha: recorte a maxBytes', () => {
  const largo = normalizarFicha('x'.repeat(600), 510);
  assert.equal(largo.truncada, true);
  assert.equal(largo.bytesOriginales, 600);
  assert.ok(largo.texto.endsWith('…'));
  assert.ok(bytes(largo.texto) <= 510);
  const justo = 'y'.repeat(510);
  assert.deepEqual(normalizarFicha(justo, 510), { texto: justo, vacia: false, truncada: false, bytesOriginales: 510 });
  const emojis = normalizarFicha('😀'.repeat(200), 510);
  assert.equal(emojis.truncada, true);
  assert.ok(bytes(emojis.texto) <= 510);
  assert.doesNotThrow(() => new TextDecoder('utf-8', { fatal: true }).decode(new TextEncoder().encode(emojis.texto)));
  assert.ok(!emojis.texto.includes('�'));
  const espacios = normalizarFicha('a'.repeat(505) + '      zzzzzzzz', 510);
  assert.ok(!/ …$/.test(espacios.texto));
  for (const raro of [undefined, null, 5, {}]) assert.doesNotThrow(() => normalizarFicha(raro, 510));
});

test('144 planificar con fichas', () => {
  const conIa = (ia, real = ['a-unsplash.jpg', 'b-unsplash.jpg', 'c-unsplash.jpg', 'd-unsplash.jpg']) => {
    const c = carpetas();
    c[0] = { nombre: '01-fireworks', subcarpetas: ['ia', 'real'], sueltos: [], ia, real: real.slice(0, 5 - ia.filter((f) => !/\.txt$/i.test(f)).length) };
    return planificar({ ...base, carpetas: c });
  };
  let r = conIa(['Gemini_x.jpg', 'Gemini_x.txt']);
  assert.deepEqual(r.errores, []);
  const g = r.nuevos[0].imagenes.find((i) => i.tipo === 'generada');
  assert.equal(g.ficha, '01-fireworks/ia/Gemini_x.txt');
  assert.equal(g.sinIngles, true);
  assert.ok(r.avisos.some((a) => a.includes('Gemini_x.jpg') && a.includes('falta la versión en inglés')));
  assert.ok(r.nuevos[0].imagenes.filter((i) => i.tipo === 'autentica').every((i) => i.ficha === null));
  assert.equal(r.nuevos[0].imagenes.length, 5);

  r = conIa(['Gemini_x.jpg']);
  assert.deepEqual(r.errores, []);
  assert.equal(r.nuevos[0].imagenes.find((i) => i.tipo === 'generada').ficha, null);
  assert.ok(r.avisos.some((a) => a.includes('01-fireworks/ia/Gemini_x.jpg') && a.includes('Gemini_x.en.txt')));

  r = conIa(['Gemini_x.jpg', 'Gemini_x.txt', 'Gemini_y.txt']);
  assert.deepEqual(r.errores, []);
  assert.ok(r.avisos.some((a) => a.includes('Gemini_y.txt')));

  r = conIa(['Gemini_x.jpg', 'Gemini_x.txt', 'Gemini_x.png']);
  assert.ok(r.errores.some((e) => e.includes('mismo nombre base')));

  r = conIa(['Gemini_X.TXT', 'Gemini_X.jpg']);
  assert.deepEqual(r.errores, []);
  assert.equal(r.nuevos[0].imagenes.find((i) => i.tipo === 'generada').ficha, '01-fireworks/ia/Gemini_X.TXT');

  r = conIa(['Gemini_x.jpg', 'notas.md']);
  assert.ok(r.errores.some((e) => e.includes('notas.md')));

  const c = carpetas();
  c[0] = { nombre: '01-fireworks', subcarpetas: ['ia', 'real'], sueltos: [], ia: ['Gemini_x.jpg', 'Gemini_x.txt'], real: ['a-unsplash.jpg', 'b-unsplash.jpg', 'c-unsplash.jpg', 'd-unsplash.jpg', 'notas.txt'] };
  r = planificar({ ...base, carpetas: c });
  assert.deepEqual(r.errores, []);
  assert.ok(r.avisos.some((a) => a.includes('real/notas.txt')));
  assert.ok(r.nuevos[0].imagenes.every((i) => !/\.txt$/.test(i.ruta)));
});

test('146 planificar con fichas en inglés (.en.txt)', () => {
  const conIa = (ia) => {
    const c = carpetas();
    c[0] = { nombre: '01-fireworks', subcarpetas: ['ia', 'real'], sueltos: [], ia, real: ['a-unsplash.jpg', 'b-unsplash.jpg', 'c-unsplash.jpg', 'd-unsplash.jpg'].slice(0, 5 - ia.filter((f) => !/\.txt$/i.test(f)).length) };
    return planificar({ ...base, carpetas: c });
  };
  const avisos01 = (r) => r.avisos.filter((a) => a.startsWith('01-fireworks'));
  // La inglesa tiene prioridad y no genera avisos.
  let r = conIa(['Gemini_x.jpg', 'Gemini_x.txt', 'Gemini_x.en.txt']);
  assert.deepEqual(r.errores, []);
  assert.deepEqual(avisos01(r), []);
  let g = r.nuevos[0].imagenes.find((i) => i.tipo === 'generada');
  assert.equal(g.ficha, '01-fireworks/ia/Gemini_x.en.txt');
  assert.equal(g.sinIngles, false);
  // X.en.txt no cuenta como imagen ni como ficha huérfana.
  assert.equal(r.nuevos[0].imagenes.length, 5);
  // Solo inglesa: vale, sin aviso.
  r = conIa(['Gemini_x.jpg', 'Gemini_x.en.txt']);
  assert.deepEqual(r.errores, []);
  assert.deepEqual(avisos01(r), []);
  assert.equal(r.nuevos[0].imagenes.find((i) => i.tipo === 'generada').ficha, '01-fireworks/ia/Gemini_x.en.txt');
  // Inglesa huérfana: aviso.
  r = conIa(['Gemini_x.jpg', 'Gemini_x.txt', 'Gemini_x.en.txt', 'Gemini_y.en.txt']);
  assert.deepEqual(r.errores, []);
  assert.ok(r.avisos.some((a) => a.includes('Gemini_y.en.txt') && a.includes('no tiene imagen')));
  // Sin ninguna: aviso de falta total.
  r = conIa(['Gemini_x.jpg']);
  assert.equal(r.nuevos[0].imagenes.find((i) => i.tipo === 'generada').ficha, null);
});

test('145 calendarioAnteriorValido', () => {
  const dia = (n) => ({ n, fecha: `2026-11-0${n}`, pruebas: ['a', 'b', 'c', 'd', 'e'] });
  const dia4 = (n) => ({ n, pruebas: ['a', 'b', 'c', 'd', 'e'] });
  const cal = (version) => ({ version, lanzamiento: '2026-11-01', dias: [dia(1), dia(2)] });
  const cal4 = (lanzamiento) => ({ version: 4, lanzamiento, dias: [dia4(1), dia4(2)] });
  assert.equal(calendarioAnteriorValido(cal(2)), true);
  assert.equal(calendarioAnteriorValido(cal(3)), true);
  assert.equal(calendarioAnteriorValido({ version: 3, lanzamiento: '2026-11-01', dias: [] }), true);
  assert.equal(calendarioAnteriorValido(cal4(null)), true);
  assert.equal(calendarioAnteriorValido(cal4('2026-12-15')), true);
  assert.equal(calendarioAnteriorValido(cal4('2026-02-30')), false);
  assert.equal(calendarioAnteriorValido({ ...cal(3), lanzamiento: null }), false); // null solo en la 4
  assert.equal(calendarioAnteriorValido({ ...cal(3), lanzamiento: '2099-01-01' }), true); // ya no hay fecha fija
  assert.equal(calendarioAnteriorValido(cal(1)), false);
  assert.equal(calendarioAnteriorValido({ ...cal(5) }), false);
  assert.equal(calendarioAnteriorValido(null), false);
  assert.equal(calendarioAnteriorValido({}), false);
  assert.equal(calendarioAnteriorValido([]), false);
  assert.equal(calendarioAnteriorValido({ ...cal(2), dias: [{ ...dia(1), pruebas: ['a', 'b', 'c', 'd'] }] }), false);
  assert.equal(calendarioAnteriorValido({ ...cal4(null), dias: [{ ...dia4(1), pruebas: ['a', 'b', 'c', 'd'] }] }), false);
  assert.equal(calendarioAnteriorValido({ ...cal(2), dias: [{ ...dia(0) }] }), false);
  assert.equal(calendarioAnteriorValido({ ...cal(3), dias: [{ n: 1, pruebas: dia(1).pruebas }] }), false); // la 3 exige fecha
});

test('planificar con lanzamiento null: fechas null y sin comprobar el pasado', () => {
  const r = planificar({ ultimoDia: 0, hoyISO: '2030-01-01', lanzamiento: null, carpetas: carpetas() });
  assert.deepEqual(r.errores, []);
  assert.equal(r.nuevos.length, 7);
  assert.ok(r.nuevos.every((d) => d.fecha === null));
  // Con fecha pasada sí falla.
  const p = planificar({ ultimoDia: 0, hoyISO: '2030-01-01', lanzamiento: '2026-11-01', carpetas: carpetas() });
  assert.ok(p.errores.some((e) => /ya ha llegado/.test(e)));
});

test('comprobarReimportacion con lanzamiento null o derivado de la fecha', () => {
  const dias4 = Array.from({ length: 7 }, (_, i) => ({ n: i + 1 }));
  const b = { nombresCarpetas: nombres, hoyISO: '2030-01-01' };
  assert.deepEqual(comprobarReimportacion({ ...b, calendario: { lanzamiento: null, dias: dias4 } }), []);
  assert.deepEqual(comprobarReimportacion({ ...b, calendario: { lanzamiento: '2031-01-01', dias: dias4 } }), []);
  const e = comprobarReimportacion({ ...b, calendario: { lanzamiento: '2029-12-30', dias: dias4 } });
  assert.match(e[0], /^El día 01 \(2029-12-30\) ya ha llegado/);
});

test('151 analizarArgumentosLanzamiento', () => {
  assert.deepEqual(analizarArgumentosLanzamiento([]), { accion: 'mostrar', fecha: null, errores: [] });
  assert.deepEqual(analizarArgumentosLanzamiento(['2026-12-01']), { accion: 'fijar', fecha: '2026-12-01', errores: [] });
  assert.deepEqual(analizarArgumentosLanzamiento(['--sin-fecha']), { accion: 'quitar', fecha: null, errores: [] });
  assert.equal(analizarArgumentosLanzamiento(['x']).errores.length, 1);
  assert.equal(analizarArgumentosLanzamiento(['2026-02-30']).errores.length, 1);
  assert.equal(analizarArgumentosLanzamiento(['2026-12-01', '--sin-fecha']).errores.length, 1);
});

test('151 comprobarCambioLanzamiento', () => {
  const hoyISO = '2026-10-26';
  assert.deepEqual(comprobarCambioLanzamiento({ actual: null, nuevo: '2026-10-27', hoyISO }), []);
  assert.equal(comprobarCambioLanzamiento({ actual: null, nuevo: '2026-10-26', hoyISO }).length, 1);
  assert.equal(comprobarCambioLanzamiento({ actual: null, nuevo: '2026-10-01', hoyISO }).length, 1);
  assert.equal(comprobarCambioLanzamiento({ actual: null, nuevo: '2026-13-01', hoyISO }).length, 1);
  assert.match(comprobarCambioLanzamiento({ actual: '2026-10-26', nuevo: '2026-12-01', hoyISO })[0], /^El juego se lanzó el 2026-10-26: cambiar la fecha renumeraría/);
  assert.equal(comprobarCambioLanzamiento({ actual: '2026-10-01', nuevo: null, hoyISO }).length, 1);
  assert.deepEqual(comprobarCambioLanzamiento({ actual: '2026-11-01', nuevo: '2026-12-01', hoyISO }), []);
  assert.deepEqual(comprobarCambioLanzamiento({ actual: '2026-11-01', nuevo: null, hoyISO }), []);
  assert.deepEqual(comprobarCambioLanzamiento({ actual: null, nuevo: null, hoyISO }), []);
});

test('152 migrarCalendario y migrarBanco', () => {
  const dia = (n) => ({ n, fecha: `2099-01-0${n}`, tema: `Tema ${n}`, pruebas: ['a', 'b', 'c', 'd', 'e'], clave: 'Mpb9Ycc=', fichas: ['f1', 'f2', 'f3', 'f4', 'f5'] });
  const v3 = { version: 3, lanzamiento: '2099-01-01', dias: [dia(1), dia(2)] };
  const copia = JSON.parse(JSON.stringify(v3));
  const { calendario, errores } = migrarCalendario(v3);
  assert.deepEqual(errores, []);
  assert.deepEqual(v3, copia); // no muta
  assert.equal(calendario.version, 4);
  assert.equal(calendario.lanzamiento, '2099-01-01');
  assert.deepEqual(calendario.dias.map((d) => Object.keys(d)), [['n', 'tema', 'pruebas', 'clave', 'fichas'], ['n', 'tema', 'pruebas', 'clave', 'fichas']]);
  calendario.dias.forEach((d, i) => {
    const { fecha, ...resto } = v3.dias[i];
    assert.deepEqual(d, resto);
  });
  assert.deepEqual(migrarCalendario(calendario), { calendario, errores: [] }); // idempotente
  const mala = { ...v3, dias: [dia(1), { ...dia(2), fecha: '2099-01-09' }] };
  assert.equal(migrarCalendario(mala).errores.length, 1);
  assert.equal(migrarCalendario({ ...v3, version: 2 }).errores.length, 1);
  assert.equal(migrarCalendario(null).errores.length, 1);
  assert.equal(migrarCalendario({ ...v3, lanzamiento: null }).errores.length, 1);

  const b2 = { version: 2, imagenes: [{ id: 'abc', tipo: 'autentica', dia: 1, fecha: '2099-01-01', dhash: '00' }] };
  const copiaB = JSON.parse(JSON.stringify(b2));
  const mb = migrarBanco(b2);
  assert.deepEqual(mb.errores, []);
  assert.deepEqual(b2, copiaB);
  assert.deepEqual(mb.banco, { version: 3, imagenes: [{ id: 'abc', tipo: 'autentica', dia: 1, dhash: '00' }] });
  assert.deepEqual(migrarBanco(mb.banco), { banco: mb.banco, errores: [] });
  assert.equal(migrarBanco({ version: 1, imagenes: [] }).errores.length, 1);
  assert.equal(migrarBanco(null).errores.length, 1);
});

// ---------- 224 planificar: archivos ignorados y carpetas sin imágenes [D-139] ----------

const sinImgs = (nombre, sueltos = ['facts.txt']) => ({ nombre, subcarpetas: [], sueltos, ia: [], real: [] });

test('224 planificar: facts.txt, facts.en.txt, datos.txt y datos.original.txt se ignoran sin errores ni avisos', () => {
  const c = { ...carpeta('01-fireworks'), sueltos: ['facts.txt', 'facts.en.txt', 'datos.txt', 'datos.original.txt'] };
  const r = planificar({ ...base, carpetas: [c] });
  assert.deepEqual(r.errores, []);
  // Los únicos avisos posibles son los de «sin ficha» de las generadas; ninguno menciona los archivos ignorados.
  assert.ok(r.avisos.every((x) => /no tiene ficha/.test(x) && !/facts|datos/.test(x)));
  assert.deepEqual(r.pendientes, []);
  assert.equal(r.nuevos.length, 1);
});

test('224 planificar: otros archivos sueltos siguen siendo error', () => {
  for (const nombre of ['Datos.txt', 'notas.txt', 'FACTS.TXT']) {
    const r = planificar({ ...base, carpetas: [{ ...carpeta('01-fireworks'), sueltos: ['datos.txt', nombre] }] });
    assert.ok(r.errores.some((e) => e.includes('no admitidos') && e.includes(nombre)), nombre);
  }
});

test('224 planificar: carpetas finales sin imágenes quedan pendientes con aviso', () => {
  let r = planificar({ ...base, carpetas: [carpeta('01-dogs'), carpeta('02-cats'), sinImgs('03-birds'), sinImgs('04-fish', ['datos.txt', 'datos.original.txt'])] });
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.nuevos.map((d) => d.n), [1, 2]);
  assert.deepEqual(r.pendientes, [3, 4]);
  assert.ok(r.avisos.includes('03-birds y siguientes no tienen imágenes: Images se queda en el día 2.'));
  r = planificar({ ...base, carpetas: [sinImgs('01-dogs')] });
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.pendientes, [1]);
  assert.equal(r.nuevos.length, 0);
});

test('224 planificar: carpeta sin imágenes seguida de otra con imágenes es un hueco; con solo ia/ es error', () => {
  let r = planificar({ ...base, carpetas: [carpeta('01-dogs'), sinImgs('02-cats'), carpeta('03-birds')] });
  assert.ok(r.errores.some((e) => e.includes('02-cats') && /hueco/.test(e)));
  assert.deepEqual(r.pendientes, []);
  r = planificar({ ...base, carpetas: [{ ...carpeta('01-dogs'), subcarpetas: ['ia'], real: [] }] });
  assert.ok(r.errores.length > 0);
  r = planificar({ ...base, carpetas: [sinImgs('01-dogs', ['facts.txt', 'notas.txt'])] });
  assert.ok(r.errores.some((e) => e.includes('notas.txt')));
});

test('92 planificar: sin lanzamiento (null) los días no tienen fecha ni error de fecha', () => {
  const r = planificar({ ...base, lanzamiento: null, hoyISO: '2099-01-01', carpetas: carpetas() });
  assert.deepEqual(r.errores, []);
  assert.ok(r.nuevos.every((d) => d.fecha === null));
});
