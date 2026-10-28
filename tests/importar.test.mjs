// Pruebas de integración de importar.mjs sobre una raíz temporal (nunca toca entrada/, casos/ ni data/ reales).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync, symlinkSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Bytes no UTF-8 y texto con llaves, "source:" y "---": el importador nunca debe abrir ni mostrar esto.
const NO_UTF8 = Buffer.concat([Buffer.from([0xff, 0xfe, 0x7b, 0x80, 0x0a]), Buffer.from('source: x\n---\n{'), Buffer.from([0xc3, 0x28])]);
const VIEJA = new Date('2020-01-01T00:00:00Z');

function semilla(n) {
  let s = (n * 2654435761) >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

async function imagen(ruta, n) {
  const r = semilla(n + 1);
  const buf = Buffer.alloc(120 * 150 * 3);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(r() * 256);
  await sharp(buf, { raw: { width: 120, height: 150, channels: 3 } }).png().toFile(ruta);
}

async function montar({ calendario, banco, carpetas = ['01-dogs'], sinImagenes = [] }) {
  const raiz = mkdtempSync(join(tmpdir(), 'identifai-importar-'));
  cpSync(join(REPO, 'herramientas'), join(raiz, 'herramientas'), { recursive: true });
  cpSync(join(REPO, 'js'), join(raiz, 'js'), { recursive: true });
  for (const f of ['banco.json', 'banco.anterior.json', 'lote.json']) rmSync(join(raiz, 'herramientas', f), { force: true });
  symlinkSync(join(REPO, 'node_modules'), join(raiz, 'node_modules'), 'junction');
  writeFileSync(join(raiz, 'package.json'), '{"type":"module"}');
  mkdirSync(join(raiz, 'casos'));
  mkdirSync(join(raiz, 'data'));
  if (calendario) writeFileSync(join(raiz, 'data', 'calendario.json'), JSON.stringify(calendario));
  if (banco) writeFileSync(join(raiz, 'herramientas', 'banco.json'), JSON.stringify(banco));
  let k = 0;
  const notas = [];
  const poner = (d, f) => {
    writeFileSync(join(d, f), NO_UTF8);
    utimesSync(join(d, f), VIEJA, VIEJA);
    notas.push(join(d, f));
  };
  for (const nombre of carpetas) {
    const d = join(raiz, 'entrada', 'temas', nombre);
    mkdirSync(join(d, 'ia'), { recursive: true });
    mkdirSync(join(d, 'real'));
    for (let i = 0; i < 2; i++) await imagen(join(d, 'ia', `Gemini_Generated_Image_${i}.png`), k++);
    for (let i = 0; i < 3; i++) await imagen(join(d, 'real', `autor-${i}-unsplash.png`), k++);
    poner(d, 'datos.txt');
    poner(d, 'datos.original.txt');
    writeFileSync(join(d, 'facts.en.txt'), 'answer: fact\nclaim: x\n');
  }
  for (const nombre of sinImagenes) {
    const d = join(raiz, 'entrada', 'temas', nombre);
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, 'facts.en.txt'), 'answer: fact\nclaim: x\n');
    poner(d, 'datos.txt');
  }
  return { raiz, notas };
}

const correr = (raiz, ...args) =>
  spawnSync(process.execPath, [join(raiz, 'herramientas', 'importar.mjs'), ...args], { cwd: raiz, encoding: 'utf8' });

const huellas = (notas) => notas.map((n) => [readFileSync(n), statSync(n).mtimeMs]);
const intactas = (notas, antes) =>
  notas.forEach((n, i) => {
    assert.ok(readFileSync(n).equals(antes[i][0]));
    assert.equal(statSync(n).mtimeMs, antes[i][1]);
  });

test('239 importar --simular con notas no UTF-8: sin errores, sin mostrar su contenido y sin escribir nada', async () => {
  const { raiz, notas } = await montar({ sinImagenes: ['02-cats'] });
  try {
    const antes = huellas(notas);
    const r = correr(raiz, '--simular');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /sin fecha de lanzamiento/);
    assert.match(r.stdout, /02-cats y siguientes no tienen imágenes: Images se queda en el día 1\./);
    assert.doesNotMatch(r.stdout + r.stderr, /source:|datos\.|ERROR/);
    assert.equal(existsSync(join(raiz, 'data', 'calendario.json')), false);
    assert.deepEqual(readdirSync(join(raiz, 'casos')), []);
    intactas(notas, antes);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('68 importar real: calendario v4 sin fecha por día, banco v3 y notas intactas', async () => {
  const { raiz, notas } = await montar({});
  try {
    const antes = huellas(notas);
    const r = correr(raiz);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const cal = JSON.parse(readFileSync(join(raiz, 'data', 'calendario.json'), 'utf8'));
    assert.equal(cal.version, 4);
    assert.equal(cal.lanzamiento, null);
    assert.equal(cal.dias.length, 1);
    assert.deepEqual(Object.keys(cal.dias[0]), ['n', 'tema', 'pruebas', 'clave', 'fichas']);
    const banco = JSON.parse(readFileSync(join(raiz, 'herramientas', 'banco.json'), 'utf8'));
    assert.equal(banco.version, 3);
    assert.equal(banco.imagenes.length, 5);
    assert.ok(banco.imagenes.every((i) => !('fecha' in i)));
    assert.equal(readdirSync(join(raiz, 'casos')).length, 5);
    intactas(notas, antes);
    const r2 = correr(raiz);
    assert.equal(r2.status, 0, r2.stderr);
    assert.match(r2.stdout, /ya importado|No hay días nuevos/);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
});

test('69 importar: calendario v3 o banco v2 detienen con el mensaje de 4.4.2 y no modifican nada', async () => {
  const dia = { n: 1, fecha: '2099-01-01', tema: 'Dogs', pruebas: ['a', 'b', 'c', 'd', 'e'], clave: 'x', fichas: [] };
  const v3 = { version: 3, lanzamiento: '2099-01-01', dias: [dia] };
  let m = await montar({ calendario: v3, banco: { version: 3, imagenes: [] } });
  try {
    const antes = readFileSync(join(m.raiz, 'data', 'calendario.json'), 'utf8');
    const r = correr(m.raiz, '--simular');
    assert.equal(r.status, 1);
    assert.match(r.stderr, /versión 3 \(con fechas\): conviértelo con npm run lanzamiento\./);
    assert.equal(readFileSync(join(m.raiz, 'data', 'calendario.json'), 'utf8'), antes);
  } finally {
    rmSync(m.raiz, { recursive: true, force: true });
  }
  m = await montar({ banco: { version: 2, imagenes: [] } });
  try {
    const r = correr(m.raiz, '--simular');
    assert.equal(r.status, 1);
    assert.match(r.stderr, /banco\.json es de la versión 2: conviértelo con npm run lanzamiento/);
    assert.equal(existsSync(join(m.raiz, 'data', 'calendario.json')), false);
  } finally {
    rmSync(m.raiz, { recursive: true, force: true });
  }
});
