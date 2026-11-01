import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  urlDeIdioma,
  destinoRaiz,
  decidirLangEnPagina,
  debeNoIndexar,
  desdeRaiz,
  cargarAfirmaciones,
  cargarAfirmacionesPrueba,
  precargar
} from '../js/diario.js';
import { urlDelJuego } from '../js/compartir.js';

test('291. urlDeIdioma', () => {
  assert.equal(urlDeIdioma('https://identifaiit.com/en/', 'es'), 'https://identifaiit.com/es/');
  assert.equal(
    urlDeIdioma('https://identifaiit.com/en/index.html?prueba=1&lang=es&dia=3#x', 'es'),
    'https://identifaiit.com/es/?prueba=1&dia=3#x'
  );
  assert.equal(urlDeIdioma('https://identifaiit.com/es/?lang=es', 'es'), 'https://identifaiit.com/es/');
  assert.equal(urlDeIdioma('https://u.github.io/identifAI-it/en/', 'es'), 'https://u.github.io/identifAI-it/es/');
  assert.equal(urlDeIdioma('https://identifaiit.com/en/en/', 'es'), 'https://identifaiit.com/en/es/');
  assert.equal(urlDeIdioma('http://localhost:3000/sub/es/index.html', 'en'), 'http://localhost:3000/sub/en/');
  for (const [href, idioma] of [
    ['https://identifaiit.com/', 'es'],
    ['https://identifaiit.com/en/about/', 'es'],
    ['https://identifaiit.com/es/como-detectar-un-bulo/', 'en'],
    ['https://identifaiit.com/en', 'es'],
    ['no es url', 'es'],
    ['https://identifaiit.com/en/', 'fr'],
    [null, 'es'],
    [42, 'en'],
    ['https://identifaiit.com/en/', undefined]
  ]) {
    assert.equal(urlDeIdioma(href, idioma), null, `${href} -> ${idioma}`);
  }
});

test('292. destinoRaiz', () => {
  assert.equal(destinoRaiz({ search: '', hash: '', guardado: null, lenguas: ['es-MX'] }), 'es/');
  assert.equal(destinoRaiz({ search: '', hash: '', guardado: null, lenguas: ['fr'] }), 'en/');
  assert.equal(destinoRaiz({ search: '', hash: '', guardado: 'es', lenguas: ['en-US'] }), 'es/');
  assert.equal(destinoRaiz({ search: '', hash: '', guardado: 'en', lenguas: ['es-ES'] }), 'en/');
  assert.equal(
    destinoRaiz({ search: '?prueba=1&lang=en', hash: '', guardado: 'es', lenguas: ['es'] }),
    'en/?prueba=1&lang=en'
  );
  assert.equal(destinoRaiz({ search: '?prueba=1&dia=3', hash: '#x', guardado: null, lenguas: ['es'] }), 'es/?prueba=1&dia=3#x');
  assert.equal(destinoRaiz({ search: '?lang=fr', hash: '', guardado: null, lenguas: ['es'] }), 'es/?lang=fr');
  for (const g of [null, 'es', 'en']) assert.ok(!destinoRaiz({ search: '', hash: '', guardado: g, lenguas: [] }).startsWith('/'));
  assert.equal(destinoRaiz(), 'en/');
});

test('296. decidirLangEnPagina: manda la dirección', () => {
  const d = (idiomaPagina, search, href) => decidirLangEnPagina({ idiomaPagina, search, href });
  assert.deepEqual(d('es', '?lang=en&prueba=1', 'https://x.com/es/?lang=en&prueba=1'), {
    accion: 'redirigir',
    guardar: 'en',
    url: 'https://x.com/en/?prueba=1'
  });
  assert.deepEqual(d('en', '?lang=en', 'https://x.com/en/?lang=en'), { accion: 'quitar', guardar: 'en', url: 'https://x.com/en/' });
  assert.deepEqual(d('en', '?lang=fr', 'https://x.com/en/?lang=fr'), { accion: 'ninguna', guardar: null, url: null });
  assert.deepEqual(d('en', '', 'https://x.com/en/'), { accion: 'ninguna', guardar: null, url: null });
  assert.equal(d('es', '?lang=EN', 'https://x.com/es/?lang=EN').accion, 'redirigir');
  // dirección rara: no se puede reescribir, pero la preferencia se guarda
  assert.deepEqual(d('en', '?lang=es', 'https://x.com/otra/?lang=es'), { accion: 'ninguna', guardar: 'es', url: null });
  assert.equal(decidirLangEnPagina().accion, 'ninguna');
});

test('298. debeNoIndexar', () => {
  assert.equal(debeNoIndexar({ modoPrueba: true, previsualizacion: false, pantalla: 'portada' }), true);
  assert.equal(debeNoIndexar({ modoPrueba: false, previsualizacion: true, pantalla: 'portada' }), true);
  assert.equal(debeNoIndexar({ modoPrueba: false, previsualizacion: false, pantalla: 'sin-casos' }), true);
  assert.equal(debeNoIndexar({ modoPrueba: false, previsualizacion: false, pantalla: 'portada' }), false);
  assert.equal(debeNoIndexar({ modoPrueba: false, previsualizacion: false, pantalla: 'caso' }), false);
  assert.equal(debeNoIndexar(), false);
});

test('RAIZ: desdeRaiz y los cargadores resuelven desde la raíz y no cambian sin ella', async () => {
  const raiz = new URL('../', 'https://identifaiit.com/js/main.js');
  assert.equal(desdeRaiz('data/calendario.json', raiz), 'https://identifaiit.com/data/calendario.json');
  assert.equal(
    desdeRaiz('casos/a.webp', new URL('../', 'https://u.github.io/identifAI-it/js/main.js')),
    'https://u.github.io/identifAI-it/casos/a.webp'
  );
  assert.equal(desdeRaiz('casos/a.webp', null), 'casos/a.webp');
  assert.equal(desdeRaiz('casos/a.webp'), 'casos/a.webp');

  const pedidas = [];
  const pedir = async (url) => {
    pedidas.push(url);
    return { ok: false, status: 404 };
  };
  await cargarAfirmaciones('2026-12-15', pedir, raiz);
  assert.deepEqual(pedidas, ['https://identifaiit.com/data/facts/2026-12.json']);
  pedidas.length = 0;
  await cargarAfirmacionesPrueba('2026-12-01', pedir, raiz);
  assert.deepEqual(pedidas, ['https://identifaiit.com/data/facts/2026-12.json']);
  pedidas.length = 0;
  await cargarAfirmaciones('2026-12-15', pedir);
  assert.deepEqual(pedidas, ['data/facts/2026-12.json']);

  const srcs = [];
  const fabrica = () => ({
    decode: async () => {},
    set src(v) {
      srcs.push(v);
    }
  });
  await precargar(['aaa', 'bbb'], fabrica, raiz);
  assert.deepEqual(srcs, ['https://identifaiit.com/casos/aaa.webp', 'https://identifaiit.com/casos/bbb.webp']);
});

test('301. el texto compartido usa la URL del idioma, sin ?lang= ni ?prueba=', () => {
  const u = (origin, pathname) => urlDelJuego({ origin, pathname, search: '?lang=es&prueba=1', hash: '' });
  assert.equal(u('https://identifaiit.com', '/es/'), 'https://identifaiit.com/es/');
  assert.equal(u('https://identifaiit.com', '/en/index.html'), 'https://identifaiit.com/en/');
  assert.equal(u('http://localhost:3000', '/sub/es/'), 'http://localhost:3000/sub/es/');
});

test('main.js y raiz.js: contrato de la fase 5 (10.4.4, 10.13, 10.1.1)', () => {
  const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  assert.equal((main.match(/const ANUNCIOS_ACTIVOS = false;/g) ?? []).length, 1);
  assert.match(main, /const RAIZ = new URL\('\.\.\/', import\.meta\.url\);/);
  assert.doesNotMatch(main, /creditos\.html|creditos\.es\.html|enlace_creditos|elegirIdioma|setInterval|<base/);
  // main.js no toca los huecos de anuncio mientras ANUNCIOS_ACTIVOS sea false
  assert.doesNotMatch(main, /anuncio-portada|anuncio-resultado|\.anuncio\b/);
  const raiz = readFileSync(new URL('../js/raiz.js', import.meta.url), 'utf8');
  assert.match(raiz, /location\.replace\(/);
  assert.doesNotMatch(raiz, /guardarIdioma|setItem/);
  for (const f of readdirSync(new URL('../js/', import.meta.url))) {
    const src = readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
    for (const d of ['how-to-spot-ai-images', 'how-to-spot-fake-news', 'como-saber-si-una-imagen-es-ia', 'como-detectar-un-bulo']) {
      assert.equal(src.includes(d), false, `${f} contiene ${d}`);
    }
  }
});
