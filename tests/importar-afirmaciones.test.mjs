// Tests del importador de Fact or Fake (tarea 73; criterios 200, 201, 214, 215, 239 y 240) en los dos idiomas (3.0, 4.21).
// Todo ocurre en carpetas temporales con una copia de data/: nunca contra entrada/ ni data/ reales.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importarAfirmaciones } from '../herramientas/importar-afirmaciones.mjs';
import { lanzar } from '../herramientas/lanzamiento.mjs';
import { LISTA_REVISION, leerAfirmacionesMensuales, unirMeses } from '../herramientas/afirmaciones.mjs';
import { IDIOMAS, desofuscar, desofuscarAfirmacion, desofuscarAclaracion, validarAfirmaciones } from '../js/diario.js';

const HOY = '2026-10-27';
const MARCA = 'ZQXMARCA';

const temporal = () => fs.mkdtempSync(path.join(os.tmpdir(), 'afirmaciones-'));
const limpiar = (r) => fs.rmSync(r, { recursive: true, force: true });

// Raíz de prueba: calendario v5 vacío y sin lanzamiento, y data/facts/ vacío. No depende de los datos reales.
function raizDePrueba() {
  const raiz = temporal();
  fs.mkdirSync(path.join(raiz, 'data', 'facts'), { recursive: true });
  fs.writeFileSync(path.join(raiz, 'data', 'calendario.json'), JSON.stringify({ version: 5, lanzamiento: null, dias: [] }, null, 2) + '\n');
  return raiz;
}

const calendario = (raiz) => JSON.parse(fs.readFileSync(path.join(raiz, 'data', 'calendario.json'), 'utf8'));
const NOMBRES = ['fireworks', 'dogs', 'people-eating', 'people-drinking', 'table-with-food', 'nightclub', 'people-fighting'];
const TEMAS_EN = ['Fireworks', 'Dogs', 'People eating', 'People drinking', 'Table with food', 'Nightclub', 'People fighting'];
const TEMAS_ES = ['Fuegos artificiales', 'Perros', 'Gente comiendo', 'Gente bebiendo', 'Mesa con comida', 'Discoteca', 'Gente peleándose'];
const nombreCarpeta = (n) => `${String(n).padStart(2, '0')}-${NOMBRES[n - 1] ?? `topic-${n}`}`;
const temaEn = (n) => TEMAS_EN[n - 1] ?? `Topic ${n}`;
const temaEs = (n) => TEMAS_ES[n - 1] ?? `Tema ${n}`;

// Bloques de un día en un idioma: `falsas` falsas (1 a 4); el largo de las falsas se puede alargar con `relleno`.
function textoDia(n, falsas = 2, relleno = '', idioma = 'en') {
  const bloques = [];
  for (let i = 1; i <= 5; i++) {
    const esFalsa = i <= falsas;
    const en = idioma === 'en';
    bloques.push(
      [
        `answer: ${esFalsa ? 'fake' : 'fact'}`,
        `claim: ${MARCA} ${en ? 'claim' : 'afirmación'} ${n}-${i}${esFalsa ? relleno : ''}.`,
        `truth: ${MARCA} ${en ? 'truth' : 'verdad'} ${n}-${i}.`,
        `details: ${MARCA} ${en ? 'detail' : 'detalle'} ${n}-${i}.`
      ].join('\n')
    );
  }
  return bloques.join('\n---\n') + '\n';
}

function ponerDias(raiz, desde, hasta, { falsas = 2, relleno = '' } = {}) {
  for (let n = desde; n <= hasta; n++) {
    const d = path.join(raiz, 'entrada', 'temas', nombreCarpeta(n));
    fs.mkdirSync(path.join(d, 'ia'), { recursive: true });
    fs.mkdirSync(path.join(d, 'real'), { recursive: true });
    fs.writeFileSync(path.join(d, 'facts.en.txt'), textoDia(n, falsas, relleno, 'en'));
    fs.writeFileSync(path.join(d, 'facts.es.txt'), textoDia(n, falsas, relleno, 'es'));
    fs.writeFileSync(path.join(d, 'tema.es.txt'), temaEs(n) + '\n');
  }
}

// Calendario de Images v5 con tantos días como pidamos (solo n y los dos temas importan al importador).
const B = 'A'.repeat(683) + '=';
function calendarioConDias(raiz, hasta, lanzamiento = null) {
  const dias = [];
  for (let n = 1; n <= hasta; n++) {
    dias.push({
      n,
      tema: { en: temaEn(n), es: temaEs(n) },
      pruebas: ['a', 'b', 'c', 'd', 'e'].map((x) => `${x}${n}`),
      clave: 'Mpb9Ycc=',
      fichas: { en: Array(5).fill(B), es: Array(5).fill(B) }
    });
  }
  fs.writeFileSync(path.join(raiz, 'data', 'calendario.json'), JSON.stringify({ version: 5, lanzamiento, dias }, null, 2) + '\n');
}

const correr = (raiz, ...argv) => importarAfirmaciones({ raiz, argv, hoyISO: HOY });
const salida = (r) => r.mensajes.join('\n');

function arbol(dir) {
  const res = new Map();
  if (!fs.existsSync(dir)) return res;
  const rec = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) rec(p);
      else res.set(path.relative(dir, p), fs.readFileSync(p));
    }
  };
  rec(dir);
  return res;
}
const igual = (a, b) => a.size === b.size && [...a].every(([k, v]) => b.has(k) && b.get(k).equals(v));

test('200 --simular y sin --revisado no escriben, muestran la lista y el destino, y no filtran contenido', () => {
  const raiz = raizDePrueba();
  try {
    ponerDias(raiz, 1, 7);
    const antes = arbol(path.join(raiz, 'data'));
    const sim = correr(raiz, '--simular');
    assert.equal(sim.codigo, 0);
    const sin = correr(raiz);
    assert.equal(sin.codigo, 1);
    assert.match(salida(sin), /con --revisado/);
    for (const r of [sim, sin]) {
      const s = salida(r);
      assert.match(s, /2000-01\.json/);
      for (const punto of LISTA_REVISION) assert.ok(s.includes(punto));
      assert.ok(!s.includes(MARCA), 'no muestra afirmaciones, aclaraciones ni detalles');
      assert.match(s, /5 afirmaciones: 2 fake, 3 fact \(en y es\)/);
      assert.match(s, /Fireworks \/ Fuegos artificiales/);
      assert.ok(LISTA_REVISION.length === 9 && s.includes('9. '), 'la lista tiene 9 puntos');
      assert.ok(!s.includes('afirmación 1-') && !s.includes('claim 1-'));
    }
    assert.ok(igual(antes, arbol(path.join(raiz, 'data'))), 'no se ha escrito nada');
    assert.ok(!fs.existsSync(path.join(raiz, 'herramientas')));
  } finally {
    limpiar(raiz);
  }
});

function comprobarDescifrado(raiz, hasta) {
  const unidos = unirMeses(leerAfirmacionesMensuales(path.join(raiz, 'data', 'facts')), { lanzamiento: null });
  assert.deepEqual(unidos.errores, []);
  assert.equal(unidos.dias.length, hasta);
  const temas = new Map(calendario(raiz).dias.map((d) => [d.n, d.tema]));
  for (const d of unidos.dias) {
    assert.deepEqual(d.tema, { en: temaEn(d.n), es: temaEs(d.n) });
    if (temas.has(d.n)) assert.deepEqual(d.tema, temas.get(d.n));
    for (const idioma of IDIOMAS) {
      const originales = fs.readFileSync(path.join(raiz, 'entrada', 'temas', nombreCarpeta(d.n), `facts.${idioma}.txt`), 'utf8').split('\n---\n');
      const palabra = idioma === 'en' ? 'claim' : 'afirmación';
      const porNumero = new Map(originales.map((b, i) => [`${MARCA} ${palabra} ${d.n}-${i + 1}.`, b]));
      for (let i = 0; i < 5; i++) {
        const claim = desofuscarAfirmacion(d.textos[idioma][i], d.clave, d.n, i, idioma);
        const ficha = desofuscarAclaracion(d.fichas[idioma][i], d.clave, d.n, i, idioma);
        const bloque = porNumero.get(claim);
        assert.ok(bloque, 'la afirmación descifrada es una de las originales de su idioma');
        assert.equal(desofuscar(d.clave, d.n, i), bloque.includes('answer: fake') ? 1 : 0);
        assert.equal(ficha.aclaracion, bloque.match(/truth: (.*)/)[1]);
        assert.deepEqual(ficha.detalles, [bloque.match(/details: (.*)/)[1]]);
        // Una sola permutación: la misma posición es la misma prueba en los dos idiomas (mismo número de bloque).
        assert.equal(claim.match(/(\d+-\d+)\.$/)[1], desofuscarAfirmacion(d.textos.en[i], d.clave, d.n, i, 'en').match(/(\d+-\d+)\.$/)[1]);
        // Semillas distintas por idioma: un bloque no se descifra con la semilla del otro.
        const otro = idioma === 'en' ? 'es' : 'en';
        assert.equal(desofuscarAfirmacion(d.textos[idioma][i], d.clave, d.n, i, otro), null);
      }
    }
    assert.notDeepEqual(d.textos.en, d.textos.es);
  }
  return unidos.dias;
}

test('201 con 40 carpetas y lanzamiento null crea 2000-01 (1 a 31) y 2000-02 (32 a 40) descifrables; la segunda vez no cambia nada', () => {
  const raiz = raizDePrueba();
  try {
    calendarioConDias(raiz, 7);
    ponerDias(raiz, 1, 40);
    const entradaAntes = arbol(path.join(raiz, 'entrada'));
    const r = correr(raiz, '--revisado');
    assert.equal(r.codigo, 0, salida(r));
    assert.ok(!salida(r).includes(MARCA));
    const dirFacts = path.join(raiz, 'data', 'facts');
    assert.deepEqual(fs.readdirSync(dirFacts).sort(), ['2000-01.json', '2000-02.json']);
    const m1 = JSON.parse(fs.readFileSync(path.join(dirFacts, '2000-01.json'), 'utf8'));
    const m2 = JSON.parse(fs.readFileSync(path.join(dirFacts, '2000-02.json'), 'utf8'));
    assert.ok(validarAfirmaciones(m1, '2000-01') && validarAfirmaciones(m2, '2000-02'));
    assert.deepEqual([m1.dias[0].n, m1.dias.at(-1).n, m2.dias[0].n, m2.dias.at(-1).n], [1, 31, 32, 40]);
    const dias = comprobarDescifrado(raiz, 40);
    // Barajado: ni todos los días tienen el mismo orden de respuestas ni las claves se repiten.
    assert.ok(new Set(dias.map((d) => d.clave)).size > 30);
    assert.ok(!fs.existsSync(path.join(raiz, 'herramientas')));
    assert.ok(igual(entradaAntes, arbol(path.join(raiz, 'entrada'))));

    const antes = arbol(dirFacts);
    const otra = correr(raiz, '--revisado');
    assert.equal(otra.codigo, 0);
    assert.match(salida(otra), /No hay afirmaciones nuevas por importar/);
    assert.ok(igual(antes, arbol(dirFacts)));
  } finally {
    limpiar(raiz);
  }
});

test('214 con 1-40 ya importados y 25 carpetas nuevas reescribe 2000-02, crea 2000-03 y deja 2000-01 idéntico', () => {
  const raiz = raizDePrueba();
  try {
    calendarioConDias(raiz, 7);
    ponerDias(raiz, 1, 40);
    assert.equal(correr(raiz, '--revisado').codigo, 0);
    const dirFacts = path.join(raiz, 'data', 'facts');
    const antes = arbol(dirFacts);
    ponerDias(raiz, 41, 65);
    const r = correr(raiz, '--revisado');
    assert.equal(r.codigo, 0, salida(r));
    const despues = arbol(dirFacts);
    assert.deepEqual([...despues.keys()].sort(), ['2000-01.json', '2000-02.json', '2000-03.json']);
    assert.ok(despues.get('2000-01.json').equals(antes.get('2000-01.json')));
    assert.ok(!despues.get('2000-02.json').equals(antes.get('2000-02.json')));
    const dias = comprobarDescifrado(raiz, 65);
    assert.equal(dias.length, 65);
    // Los días antiguos de 2000-02 conservan sus bloques.
    const viejo = JSON.parse(antes.get('2000-02.json').toString('utf8')).dias;
    const nuevo = JSON.parse(despues.get('2000-02.json').toString('utf8')).dias.slice(0, viejo.length);
    assert.deepEqual(nuevo, viejo);
  } finally {
    limpiar(raiz);
  }
});

test('215 npm run lanzamiento con los datos del 214 reparte data/facts en meses reales y --sin-fecha lo deshace', () => {
  const raiz = raizDePrueba();
  try {
    calendarioConDias(raiz, 7);
    ponerDias(raiz, 1, 65);
    assert.equal(correr(raiz, '--revisado').codigo, 0);
    const dirFacts = path.join(raiz, 'data', 'facts');
    const claro = (dias) => dias.map((d) => [d.n, d.clave, d.textos, d.fichas]);
    const base = unirMeses(leerAfirmacionesMensuales(dirFacts), { lanzamiento: null }).dias;
    const original = arbol(dirFacts);

    const r = lanzar({ raiz, argv: ['2026-12-15'], hoyISO: HOY });
    assert.equal(r.codigo, 0, r.mensajes.join('\n'));
    assert.deepEqual(fs.readdirSync(dirFacts).sort(), ['2026-12.json', '2027-01.json', '2027-02.json']);
    const nuevos = unirMeses(leerAfirmacionesMensuales(dirFacts), { lanzamiento: '2026-12-15' });
    assert.deepEqual(nuevos.errores, []);
    assert.deepEqual(claro(nuevos.dias), claro(base));
    for (const d of nuevos.dias) {
      for (const idioma of IDIOMAS) for (let i = 0; i < 5; i++) assert.ok(desofuscarAfirmacion(d.textos[idioma][i], d.clave, d.n, i, idioma) !== null);
    }

    const copia = arbol(dirFacts);
    assert.equal(lanzar({ raiz, argv: ['2026-12-15'], hoyISO: HOY }).codigo, 0);
    assert.ok(igual(copia, arbol(dirFacts)), 'repetir no cambia nada');

    assert.equal(lanzar({ raiz, argv: ['--sin-fecha'], hoyISO: HOY }).codigo, 0);
    assert.ok(igual(original, arbol(dirFacts)), '--sin-fecha vuelve al reparto 2000-*');
  } finally {
    limpiar(raiz);
  }
});

test('239 datos.txt y datos.original.txt (no UTF-8, con { source: ---) no se abren, no se muestran y no cambian', () => {
  const raiz = raizDePrueba();
  try {
    calendarioConDias(raiz, 7);
    ponerDias(raiz, 1, 3);
    // Una carpeta final con solo notas: cuenta como carpeta sin archivo (pendiente).
    const soloNotas = path.join(raiz, 'entrada', 'temas', nombreCarpeta(4));
    fs.mkdirSync(soloNotas, { recursive: true });
    fs.writeFileSync(path.join(soloNotas, 'tema.es.txt'), temaEs(4) + '\n');
    const notas = [];
    const basura = Buffer.concat([Buffer.from(`${MARCA} {x} source: http://x\n---\n`), Buffer.from([0xff, 0xfe, 0xc3, 0x28, 0x80])]);
    for (const nombre of ['datos.txt', 'datos.original.txt']) {
      for (const n of [1, 2, 3, 4]) {
        const p = path.join(raiz, 'entrada', 'temas', nombreCarpeta(n), nombre);
        fs.writeFileSync(p, basura);
        const t = new Date('2020-01-01T00:00:00Z');
        fs.utimesSync(p, t, t);
        notas.push(p);
      }
    }
    const huellas = () => notas.map((p) => [fs.readFileSync(p), fs.statSync(p).mtimeMs]);
    const antes = huellas();
    const sim = correr(raiz, '--simular');
    assert.equal(sim.codigo, 0, salida(sim));
    assert.ok(!salida(sim).includes(MARCA));
    assert.ok(!/datos/.test(salida(sim)), 'ni las nombra');
    assert.ok(!sim.mensajes.some((m) => /ERROR/.test(m)));
    const real = correr(raiz, '--revisado');
    assert.equal(real.codigo, 0, salida(real));
    assert.ok(!salida(real).includes(MARCA));
    const despues = huellas();
    notas.forEach((_, i) => {
      assert.ok(despues[i][0].equals(antes[i][0]));
      assert.equal(despues[i][1], antes[i][1]);
    });
    assert.equal(unirMeses(leerAfirmacionesMensuales(path.join(raiz, 'data', 'facts')), { lanzamiento: null }).dias.length, 3);
  } finally {
    limpiar(raiz);
  }
});

test('240 un día con falsas un 50 % más largas muestra el aviso, escribe el día y termina con código 0', () => {
  const raiz = raizDePrueba();
  try {
    calendarioConDias(raiz, 7);
    ponerDias(raiz, 1, 1, { falsas: 2, relleno: ' with a considerably longer and padded wording here' });
    const r = correr(raiz, '--revisado');
    assert.equal(r.codigo, 0, salida(r));
    assert.match(salida(r), /AVISO: día 1 \(inglés\): las afirmaciones falsas miden de media un \d+ % más/);
    assert.match(salida(r), /AVISO: día 1 \(español\): las afirmaciones falsas miden de media un \d+ % más/);
    assert.ok(fs.existsSync(path.join(raiz, 'data', 'facts', '2000-01.json')));
    assert.ok(!salida(r).includes(MARCA));
  } finally {
    limpiar(raiz);
  }
});

test('--reimportar: sin --confirmar solo muestra el plan; con --confirmar regenera claves y exige carpetas', () => {
  const raiz = raizDePrueba();
  try {
    calendarioConDias(raiz, 7);
    ponerDias(raiz, 1, 3);
    assert.equal(correr(raiz, '--reimportar').codigo, 1, 'sin nada importado no hay qué reimportar');
    assert.equal(correr(raiz, '--revisado').codigo, 0);
    const dirFacts = path.join(raiz, 'data', 'facts');
    const antes = arbol(dirFacts);

    const plan = correr(raiz, '--reimportar', '--revisado');
    assert.equal(plan.codigo, 0, salida(plan));
    assert.ok(igual(antes, arbol(dirFacts)), 'sin --confirmar no escribe');
    assert.ok(!salida(plan).includes(MARCA));

    assert.equal(correr(raiz, '--reimportar', '--confirmar').codigo, 1, 'falta --revisado');
    assert.ok(igual(antes, arbol(dirFacts)));

    const r = correr(raiz, '--reimportar', '--confirmar', '--revisado');
    assert.equal(r.codigo, 0, salida(r));
    assert.ok(!igual(antes, arbol(dirFacts)), 'claves y bloques nuevos');
    comprobarDescifrado(raiz, 3);

    fs.rmSync(path.join(raiz, 'entrada', 'temas', nombreCarpeta(2)), { recursive: true });
    const sinCarpeta = correr(raiz, '--reimportar', '--confirmar', '--revisado');
    assert.equal(sinCarpeta.codigo, 1);
    assert.match(salida(sinCarpeta), /falta la carpeta del día 02|numeración no es consecutiva/);
  } finally {
    limpiar(raiz);
  }
});

test('--reimportar se niega cuando un día ya ha llegado', () => {
  const raiz = raizDePrueba();
  try {
    calendarioConDias(raiz, 7, '2026-12-15');
    ponerDias(raiz, 1, 3);
    assert.equal(correr(raiz, '--revisado').codigo, 0);
    const antes = arbol(path.join(raiz, 'data', 'facts'));
    const tarde = importarAfirmaciones({ raiz, argv: ['--reimportar', '--confirmar', '--revisado'], hoyISO: '2026-12-16' });
    assert.equal(tarde.codigo, 1);
    assert.match(salida(tarde), /ya ha llegado/);
    assert.ok(igual(antes, arbol(path.join(raiz, 'data', 'facts'))));
    const pronto = importarAfirmaciones({ raiz, argv: ['--reimportar', '--confirmar', '--revisado'], hoyISO: '2026-12-01' });
    assert.equal(pronto.codigo, 0, salida(pronto));
  } finally {
    limpiar(raiz);
  }
});

test('con lanzamiento reparte por meses reales y no admite días que ya han llegado', () => {
  const raiz = raizDePrueba();
  try {
    calendarioConDias(raiz, 7, '2026-12-15');
    ponerDias(raiz, 1, 20);
    assert.equal(correr(raiz, '--revisado').codigo, 0);
    assert.deepEqual(fs.readdirSync(path.join(raiz, 'data', 'facts')).sort(), ['2026-12.json', '2027-01.json']);
    ponerDias(raiz, 21, 22);
    const tarde = importarAfirmaciones({ raiz, argv: ['--revisado'], hoyISO: '2027-01-10' });
    assert.equal(tarde.codigo, 1);
    assert.match(salida(tarde), /ya ha llegado/);
  } finally {
    limpiar(raiz);
  }
});

test('errores: duplicadas, UTF-8 inválido, tema distinto al de Images, hueco, argumentos y sin carpetas', () => {
  const raiz = raizDePrueba();
  try {
    calendarioConDias(raiz, 7);
    ponerDias(raiz, 1, 2);
    // Duplicada entre días del mismo lote.
    const d2 = path.join(raiz, 'entrada', 'temas', nombreCarpeta(2), 'facts.en.txt');
    const d2es = path.join(raiz, 'entrada', 'temas', nombreCarpeta(2), 'facts.es.txt');
    fs.writeFileSync(d2, textoDia(1));
    let r = correr(raiz, '--simular');
    assert.equal(r.codigo, 1);
    assert.match(salida(r), /02-dogs, bloque \d \(inglés\): la afirmación está repetida/);
    assert.ok(!/\(español\): la afirmación está repetida/.test(salida(r)), 'los repetidos se miran por idioma');
    assert.ok(!salida(r).includes(MARCA));
    fs.writeFileSync(d2, textoDia(2));

    // Solo un idioma: error, nombrando carpeta y archivo.
    const copiaEs = fs.readFileSync(d2es);
    fs.unlinkSync(d2es);
    r = correr(raiz, '--simular');
    assert.equal(r.codigo, 1);
    assert.match(salida(r), /02-dogs tiene facts\.en\.txt pero falta facts\.es\.txt\./);
    fs.writeFileSync(d2es, copiaEs);

    // Distinto answer en un mismo bloque: error por posición.
    fs.writeFileSync(d2es, textoDia(2, 3, '', 'es'));
    r = correr(raiz, '--simular');
    assert.equal(r.codigo, 1);
    assert.match(salida(r), /El bloque 3 de 02-dogs es fact en facts\.en\.txt y fake en facts\.es\.txt\./);
    assert.ok(!salida(r).includes(MARCA));
    fs.writeFileSync(d2es, textoDia(2, 2, '', 'es'));

    // Distinto número de details: solo aviso.
    fs.writeFileSync(d2es, textoDia(2, 2, '', 'es').replace(/\ndetails: .*/, ''));
    r = correr(raiz, '--simular');
    assert.equal(r.codigo, 0, salida(r));
    assert.match(salida(r), /AVISO: el bloque 1 de 02-dogs tiene 1 details en inglés y 0 en español\./);
    fs.writeFileSync(d2es, textoDia(2, 2, '', 'es'));

    // Sin tema.es.txt: error.
    const t2 = path.join(raiz, 'entrada', 'temas', nombreCarpeta(2), 'tema.es.txt');
    fs.unlinkSync(t2);
    r = correr(raiz, '--simular');
    assert.equal(r.codigo, 1);
    assert.match(salida(r), /02-dogs: falta tema\.es\.txt\./);
    fs.writeFileSync(t2, temaEs(2) + '\n');

    // UTF-8 inválido.
    fs.writeFileSync(d2, Buffer.from([0xff, 0xfe, 0x00]));
    r = correr(raiz, '--simular');
    assert.equal(r.codigo, 1);
    assert.match(salida(r), /no es UTF-8 válido/);
    fs.writeFileSync(d2, textoDia(2));

    // Hueco: carpeta sin archivo seguida de otra con archivo.
    fs.unlinkSync(d2);
    fs.unlinkSync(d2es);
    ponerDias(raiz, 3, 3);
    r = correr(raiz, '--simular');
    assert.equal(r.codigo, 1);
    assert.match(salida(r), /no puede haber huecos/);

    // Pendientes al final: aviso y código 0.
    fs.rmSync(path.join(raiz, 'entrada', 'temas', nombreCarpeta(3)), { recursive: true });
    r = correr(raiz, '--simular');
    assert.equal(r.codigo, 0);
    assert.match(salida(r), /AVISO: 02-dogs .*no tienen facts\.en\.txt ni facts\.es\.txt/);

    // Tema distinto del de Images (en inglés y en español).
    fs.renameSync(path.join(raiz, 'entrada', 'temas', nombreCarpeta(1)), path.join(raiz, 'entrada', 'temas', '01-other'));
    r = correr(raiz, '--simular');
    assert.equal(r.codigo, 1);
    assert.match(salida(r), /no coincide con el del día 1 de Images/);
    fs.renameSync(path.join(raiz, 'entrada', 'temas', '01-other'), path.join(raiz, 'entrada', 'temas', nombreCarpeta(1)));
    fs.writeFileSync(path.join(raiz, 'entrada', 'temas', nombreCarpeta(1), 'tema.es.txt'), 'Otro tema\n');
    r = correr(raiz, '--simular');
    assert.equal(r.codigo, 1);
    assert.match(salida(r), /El tema en español de 01-fireworks no coincide con el del día 1 de Images\./);

    // Argumentos.
    assert.equal(correr(raiz, '--nada').codigo, 1);
    assert.equal(correr(raiz, '--confirmar').codigo, 1);
  } finally {
    limpiar(raiz);
  }
  const vacia = raizDePrueba();
  try {
    const r = correr(vacia, '--simular');
    assert.equal(r.codigo, 0);
    assert.match(salida(r), /No hay carpetas en entrada\/temas/);
  } finally {
    limpiar(vacia);
  }
});

test('un día con una afirmación publicada repetida en un lote nuevo es un error; el importador no toca herramientas/', () => {
  const raiz = raizDePrueba();
  try {
    calendarioConDias(raiz, 7);
    ponerDias(raiz, 1, 2);
    assert.equal(correr(raiz, '--revisado').codigo, 0);
    ponerDias(raiz, 3, 3);
    fs.writeFileSync(path.join(raiz, 'entrada', 'temas', nombreCarpeta(3), 'facts.en.txt'), textoDia(1));
    fs.writeFileSync(path.join(raiz, 'entrada', 'temas', nombreCarpeta(3), 'facts.es.txt'), textoDia(1, 2, '', 'es'));
    const antes = arbol(path.join(raiz, 'data'));
    const r = correr(raiz, '--revisado');
    assert.equal(r.codigo, 1);
    assert.match(salida(r), /03-people-eating, bloque \d \(inglés\): la afirmación está repetida \(ya aparece en el día 1 ya publicado\)/);
    assert.match(salida(r), /03-people-eating, bloque \d \(español\): la afirmación está repetida \(ya aparece en el día 1 ya publicado\)/);
    assert.ok(igual(antes, arbol(path.join(raiz, 'data'))));
    assert.ok(!fs.existsSync(path.join(raiz, 'herramientas')));
  } finally {
    limpiar(raiz);
  }
});

test('4.21 --reimportar acepta archivos v1 (solo los reemplaza) y sin --reimportar un v1 detiene con su mensaje', () => {
  const raiz = raizDePrueba();
  try {
    calendarioConDias(raiz, 7);
    ponerDias(raiz, 1, 3);
    const v1 = { version: 1, mes: '2000-01', dias: [1, 2, 3].map((n) => ({ n, tema: temaEn(n), clave: 'Q7m1Xa0=', textos: Array(5).fill(B), fichas: Array(5).fill(B) })) };
    fs.writeFileSync(path.join(raiz, 'data', 'facts', '2000-01.json'), JSON.stringify(v1));
    const sin = correr(raiz, '--simular');
    assert.equal(sin.codigo, 1);
    assert.match(salida(sin), /data\/facts\/2000-01\.json es de la versión 1 \(solo inglés\): rehazlo con npm run afirmaciones -- --reimportar --confirmar --revisado\./);
    const plan = correr(raiz, '--reimportar');
    assert.equal(plan.codigo, 0, salida(plan));
    assert.match(salida(plan), /Se regenerarían 3 días/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(raiz, 'data', 'facts', '2000-01.json'), 'utf8')).version, 1, 'el plan no escribe');
    assert.equal(correr(raiz, '--reimportar', '--confirmar').codigo, 1, 'falta --revisado');
    const r = correr(raiz, '--reimportar', '--confirmar', '--revisado');
    assert.equal(r.codigo, 0, salida(r));
    assert.equal(JSON.parse(fs.readFileSync(path.join(raiz, 'data', 'facts', '2000-01.json'), 'utf8')).version, 2);
    comprobarDescifrado(raiz, 3);
  } finally {
    limpiar(raiz);
  }
});

test('4.21 los avisos de longitud se calculan por idioma y no se confunden', () => {
  const raiz = raizDePrueba();
  try {
    calendarioConDias(raiz, 7);
    ponerDias(raiz, 1, 1);
    // Solo las falsas del español se alargan.
    const largo = textoDia(1, 2, ' con una redacción bastante más larga y rellena que las demás', 'es');
    fs.writeFileSync(path.join(raiz, 'entrada', 'temas', nombreCarpeta(1), 'facts.es.txt'), largo);
    const r = correr(raiz, '--simular');
    assert.equal(r.codigo, 0, salida(r));
    assert.match(salida(r), /AVISO: día 1 \(español\): las afirmaciones falsas miden/);
    assert.doesNotMatch(salida(r), /día 1 \(inglés\)/);
    assert.ok(!salida(r).includes(MARCA));
  } finally {
    limpiar(raiz);
  }
});
