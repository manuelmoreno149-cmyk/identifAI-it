import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lanzar } from '../herramientas/lanzamiento.mjs';

// Todas las pruebas usan carpetas temporales del SO; nunca los datos reales.
const HOY = '2026-10-26';
const B = 'A'.repeat(683) + '=';
const F = 'A'.repeat(1366) + '==';
const diaImg = (n, fecha) => ({
  n, ...(fecha ? { fecha } : {}), tema: `Tema ${n}`, pruebas: [1, 2, 3, 4, 5].map((i) => `id${n}x${i}aaaa`.slice(0, 10)),
  clave: 'Mpb9Ycc=', fichas: Array(5).fill(B)
});
const diaTit = (n) => ({ n, tema: 'Space', clave: 'Q7m1Xa0=', textos: Array(5).fill(B), fichas: Array(5).fill(F) });
const mesTit = (mes, de, hasta) => ({ version: 1, mes, dias: Array.from({ length: hasta - de + 1 }, (_, i) => diaTit(de + i)) });
const json = (o) => JSON.stringify(o, null, 2) + '\n';

function proyecto(fn, { calendario, banco, titulares = [] } = {}) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'lanzamiento-'));
  try {
    fs.mkdirSync(path.join(raiz, 'data', 'titulares'), { recursive: true });
    fs.mkdirSync(path.join(raiz, 'herramientas'), { recursive: true });
    if (calendario) fs.writeFileSync(path.join(raiz, 'data', 'calendario.json'), json(calendario));
    if (banco) fs.writeFileSync(path.join(raiz, 'herramientas', 'banco.json'), json(banco));
    for (const t of titulares) fs.writeFileSync(path.join(raiz, 'data', 'titulares', `${t.mes}.json`), json(t));
    const ruta = (...p) => path.join(raiz, ...p);
    const lee = (...p) => JSON.parse(fs.readFileSync(ruta(...p), 'utf8'));
    const lista = () => fs.readdirSync(ruta('data', 'titulares')).sort();
    return fn({ raiz, ruta, lee, lista, ejecutar: (...argv) => lanzar({ raiz, argv, hoyISO: HOY }) });
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
}

const cal3 = () => ({ version: 3, lanzamiento: '2099-01-01', dias: [1, 2, 3].map((n) => diaImg(n, `2099-01-0${n}`)) });
const cal4 = (lanzamiento = null) => ({ version: 4, lanzamiento, dias: [1, 2, 3].map((n) => diaImg(n)) });
const banco2 = () => ({ version: 2, imagenes: [{ id: 'abcdefghij', dia: 1, fecha: '2099-01-01', tipo: 'autentica' }] });
const snap = (r) => JSON.stringify(r.lista().map((n) => [n, fs.readFileSync(r.ruta('data', 'titulares', n), 'utf8')]));

test('145 sin argumentos: muestra y no escribe', () => {
  proyecto((p) => {
    const antes = fs.readFileSync(p.ruta('data', 'calendario.json'), 'utf8');
    const r = p.ejecutar();
    assert.equal(r.codigo, 0);
    assert.match(r.mensajes.join('\n'), /Lanzamiento: 2099-01-01/);
    assert.match(r.mensajes.join('\n'), /Images: 3 días \(último día: 2099-01-03\)/);
    assert.match(r.mensajes.join('\n'), /Headlines: 31 días en 1 archivos mensuales/);
    assert.equal(fs.readFileSync(p.ruta('data', 'calendario.json'), 'utf8'), antes);
  }, { calendario: cal3(), titulares: [mesTit('2000-01', 1, 31)] });
});

test('151 argumentos y fechas inválidas no escriben nada', () => {
  proyecto((p) => {
    const antes = fs.readFileSync(p.ruta('data', 'calendario.json'), 'utf8');
    for (const args of [['x'], ['2026-12-01', '2026-12-02'], ['2026-10-26'], ['2026-10-01'], ['2026-13-01']]) {
      assert.equal(p.ejecutar(...args).codigo, 1, args.join(' '));
    }
    assert.equal(fs.readFileSync(p.ruta('data', 'calendario.json'), 'utf8'), antes);
  }, { calendario: cal4('2027-01-01') });
});

test('151 con el lanzamiento ya llegado no se puede cambiar', () => {
  proyecto((p) => {
    const r = p.ejecutar('2027-05-01');
    assert.equal(r.codigo, 1);
    assert.match(r.mensajes.join('\n'), /El juego se lanzó el 2026-10-26/);
    assert.equal(p.lee('data', 'calendario.json').lanzamiento, '2026-10-26');
    assert.equal(p.ejecutar('--sin-fecha').codigo, 1);
  }, { calendario: cal4('2026-10-26') });
});

test('152 migra calendario 3 a 4 y banco 2 a 3 al fijar la fecha', () => {
  proyecto((p) => {
    const r = p.ejecutar('2099-01-01');
    assert.equal(r.codigo, 0, r.mensajes.join('\n'));
    const c = p.lee('data', 'calendario.json');
    assert.equal(c.version, 4);
    assert.equal(c.lanzamiento, '2099-01-01');
    assert.ok(c.dias.every((d) => !('fecha' in d)));
    const b = p.lee('herramientas', 'banco.json');
    assert.equal(b.version, 3);
    assert.ok(b.imagenes.every((i) => !('fecha' in i)));
    // Idempotente: repetir no cambia nada.
    const antes = [fs.readFileSync(p.ruta('data', 'calendario.json'), 'utf8'), fs.readFileSync(p.ruta('herramientas', 'banco.json'), 'utf8')];
    assert.equal(p.ejecutar('2099-01-01').codigo, 0);
    assert.deepEqual(
      [fs.readFileSync(p.ruta('data', 'calendario.json'), 'utf8'), fs.readFileSync(p.ruta('herramientas', 'banco.json'), 'utf8')],
      antes
    );
  }, { calendario: cal3(), banco: banco2() });
});

test('152 una fecha que no cuadra detiene la migración sin escribir', () => {
  const mala = cal3();
  mala.dias[1].fecha = '2099-02-02';
  proyecto((p) => {
    const antes = fs.readFileSync(p.ruta('data', 'calendario.json'), 'utf8');
    assert.equal(p.ejecutar('2099-03-01').codigo, 1);
    assert.equal(fs.readFileSync(p.ruta('data', 'calendario.json'), 'utf8'), antes);
    assert.equal(p.lee('herramientas', 'banco.json').version, 2);
  }, { calendario: mala, banco: banco2() });
});

test('sin banco migra el calendario y avisa', () => {
  proyecto((p) => {
    const r = p.ejecutar('--sin-fecha');
    assert.equal(r.codigo, 0);
    assert.match(r.mensajes.join('\n'), /no hay herramientas\/banco\.json/);
    assert.equal(p.lee('data', 'calendario.json').lanzamiento, null);
    assert.ok(!fs.existsSync(p.ruta('herramientas', 'banco.json')));
  }, { calendario: cal3() });
});

test('D-116 reparte los titulares por mes, es idempotente y reversible', () => {
  proyecto((p) => {
    const original = snap(p);
    let r = p.ejecutar('2026-12-15');
    assert.equal(r.codigo, 0, r.mensajes.join('\n'));
    assert.deepEqual(p.lista(), ['2026-12.json', '2027-01.json', '2027-02.json']);
    const rango = (f) => { const d = p.lee('data', 'titulares', f).dias; return [d[0].n, d.at(-1).n]; };
    assert.deepEqual([rango('2026-12.json'), rango('2027-01.json'), rango('2027-02.json')], [[1, 17], [18, 48], [49, 65]]);
    // El contenido de cada día no cambia.
    assert.deepEqual(p.lee('data', 'titulares', '2027-01.json').dias[0], diaTit(18));
    const repartido = snap(p);
    assert.match(r.mensajes.join('\n'), /Incluye data\/titulares\//);
    assert.equal(p.ejecutar('2026-12-15').codigo, 0);
    assert.equal(snap(p), repartido);
    assert.equal(p.ejecutar('--sin-fecha').codigo, 0);
    assert.equal(snap(p), original);
    assert.equal(p.lee('data', 'calendario.json').lanzamiento, null);
  }, { calendario: cal4(null), titulares: [mesTit('2000-01', 1, 31), mesTit('2000-02', 32, 60), mesTit('2000-03', 61, 65)] });
});

test('D-116 se recupera de una ejecución interrumpida', () => {
  proyecto((p) => {
    // Quedó un 2000-01.json antiguo junto a los nuevos (mismos días repetidos con contenido idéntico).
    const r = p.ejecutar('2026-12-15');
    assert.equal(r.codigo, 0, r.mensajes.join('\n'));
    assert.deepEqual(p.lista(), ['2026-12.json', '2027-01.json', '2027-02.json']);
  }, {
    calendario: cal4(null),
    titulares: [mesTit('2000-01', 1, 17), mesTit('2026-12', 1, 17), mesTit('2027-01', 18, 48), mesTit('2000-02', 18, 48), mesTit('2027-02', 49, 65)]
  });
});

test('D-116 titulares inválidos detienen la herramienta sin escribir', () => {
  const dos = [mesTit('2000-01', 1, 31), { ...mesTit('2000-02', 32, 40), dias: mesTit('2000-02', 32, 40).dias.map((d) => ({ ...d, tema: '' })) }];
  proyecto((p) => {
    const antes = snap(p);
    assert.equal(p.ejecutar('2026-12-15').codigo, 1);
    assert.equal(snap(p), antes);
    assert.equal(p.lee('data', 'calendario.json').lanzamiento, null);
  }, { calendario: cal4(null), titulares: dos });
  // Huecos entre archivos.
  proyecto((p) => {
    assert.equal(p.ejecutar('2026-12-15').codigo, 1);
    assert.deepEqual(p.lista(), ['2000-01.json', '2000-03.json']);
  }, { calendario: cal4(null), titulares: [mesTit('2000-01', 1, 31), mesTit('2000-03', 61, 65)] });
});

test('sin archivos de titulares no crea ni borra nada', () => {
  proyecto((p) => {
    assert.equal(p.ejecutar('2026-12-15').codigo, 0);
    assert.deepEqual(p.lista(), []);
    assert.equal(p.lee('data', 'calendario.json').lanzamiento, '2026-12-15');
  }, { calendario: cal4(null) });
});
