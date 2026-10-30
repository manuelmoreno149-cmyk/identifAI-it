import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TIPOGRAFIAS, ARCHIVOS_CREDITOS, escaparHtml, parejasCreditos, generarCreditosHtml, creditosParaBanco, escribirCreditos } from '../herramientas/creditos.mjs';
import { TEXTOS } from '../js/textos.js';
import { contienePalabraProhibida } from '../herramientas/temas.mjs';

const banco = {
  version: 2,
  imagenes: [
    { id: 'k3x9q2m7ab', tipo: 'generada', fuente: 'Own creation (Gemini)', licencia: 'Gemini Terms of Use' },
    { id: 'p0w8e4r1tz', tipo: 'autentica', fuente: 'Unsplash', licencia: 'Unsplash License' },
    { id: 'zzzzzzzzzz', tipo: 'autentica', fuente: 'Unsplash', licencia: 'Unsplash License' }
  ]
};

const T = TEXTOS.en;
const TES = TEXTOS.es;

test('77 tipografías y sin imágenes', () => {
  assert.deepEqual(TIPOGRAFIAS, [
    { familia: 'Oswald', licencia: 'SIL Open Font License 1.1', archivo: 'fonts/OFL-oswald.txt' },
    { familia: 'Special Elite', licencia: 'Apache License 2.0', archivo: 'fonts/LICENSE-special-elite.txt' }
  ]);
  const html = creditosParaBanco({ version: 2, imagenes: [] });
  assert.ok(html.includes(`<li>Oswald · SIL Open Font License 1.1 (<a href="../../fonts/OFL-oswald.txt">${T.creditos.ver_licencia}</a>)</li>`));
  assert.ok(html.includes(`<li>Special Elite · Apache License 2.0 (<a href="../../fonts/LICENSE-special-elite.txt">${T.creditos.ver_licencia}</a>)</li>`));
  assert.ok(!html.includes('OFL-special-elite'));
  assert.ok(html.includes(`<p>${T.creditos.sin_imagenes}</p>`));
  assert.ok(!html.includes('creditos-lista'));
  const es = creditosParaBanco({ version: 2, imagenes: [] }, 'es');
  assert.ok(es.includes(`(<a href="../../fonts/OFL-oswald.txt">${TES.creditos.ver_licencia}</a>)</li>`));
  assert.ok(es.includes(`<p>${TES.creditos.sin_imagenes}</p>`));
});

test('78 escaparHtml', () => {
  assert.equal(escaparHtml('<b>Fotos & "Co"</b> \'x\''), '&lt;b&gt;Fotos &amp; &quot;Co&quot;&lt;/b&gt; &#39;x&#39;');
  const html = generarCreditosHtml({ idioma: 'en', parejas: [{ fuente: '<b>Fotos & "Co"</b>', licencia: 'x' }] });
  assert.ok(!html.includes('<b>'));
  assert.ok(html.includes('<li>&lt;b&gt;Fotos &amp; &quot;Co&quot;&lt;/b&gt; · x</li>'));
});

test('79 parejasCreditos', () => {
  assert.deepEqual(parejasCreditos(banco), [
    { fuente: 'Own creation (Gemini)', licencia: 'Gemini Terms of Use' },
    { fuente: 'Unsplash', licencia: 'Unsplash License' }
  ]);
  const html = creditosParaBanco(banco);
  assert.ok(html.includes('<li>Own creation (Gemini) · Gemini Terms of Use</li>\n      <li>Unsplash · Unsplash License</li>'));
});

test('80 determinista, LF y un salto final', () => {
  const a = creditosParaBanco(banco);
  assert.equal(a, creditosParaBanco(banco));
  assert.ok(a.endsWith('</html>\n') && !a.endsWith('\n\n'));
  assert.ok(!a.includes('\r'));
});

test('203 sección fija de afirmaciones, sin medios ni fuentes', () => {
  const html = creditosParaBanco(banco);
  assert.ok(html.includes(
    `  <section id="creditos-afirmaciones">\n    <h2>${T.creditos.afirmaciones}</h2>\n    <p>${T.creditos.afirmaciones_texto}</p>\n  </section>\n  </div>\n</main>`
  ));
  assert.equal(T.creditos.afirmaciones_texto, 'Claims are written for this game from public sources. The fakes are invented and always debunked after you answer.');
  assert.ok(html.includes(`<p>${T.creditos.intro}</p>`));
  for (const id of ['creditos-noticias', 'creditos-medios', 'creditos-ficcion']) assert.ok(!html.includes(id), id);
  // La sección es la misma con banco vacío o lleno y no depende de data/facts/.
  const vacio = creditosParaBanco({ version: 2, imagenes: [] });
  assert.ok(vacio.includes('id="creditos-afirmaciones"'));
});

test('81 ids sin palabras prohibidas', () => {
  const html = creditosParaBanco(banco);
  for (const id of ['contenido', 'creditos-tipografias', 'creditos-imagenes', 'creditos-lista']) {
    assert.ok(html.includes(`id="${id}"`), id);
    assert.equal(contienePalabraProhibida(id), null);
  }
  assert.ok(!html.includes('k3x9q2m7ab'));
});

test('288 dos páginas: lang, textos de su idioma, enlace a la otra y mismas fuentes sin traducir', () => {
  assert.deepEqual(ARCHIVOS_CREDITOS, { en: 'en/credits/index.html', es: 'es/creditos/index.html' });
  const en = creditosParaBanco(banco, 'en');
  const es = creditosParaBanco(banco, 'es');
  assert.equal(en, creditosParaBanco(banco), 'el inglés es el idioma por defecto');
  assert.ok(en.startsWith('<!doctype html>\n<html lang="en">'));
  assert.ok(es.startsWith('<!doctype html>\n<html lang="es">'));
  for (const [html, t, otro] of [[en, T, ['../../es/creditos/', 'es', 'Español']], [es, TES, ['../../en/credits/', 'en', 'English']]]) {
    assert.ok(html.includes(`<title>${t.creditos.titulo} · identifAI-it</title>`));
    assert.ok(html.includes('data-pagina="creditos"'));
    assert.ok(html.includes(`<h1>${t.creditos.titulo}</h1>`));
    assert.ok(html.includes(`<p>${t.creditos.intro}</p>`));
    assert.ok(html.includes('<a class="pagina-logo" href="../">'));
    assert.ok(html.includes(`<a class="pagina-idioma" href="${otro[0]}" hreflang="${otro[1]}" lang="${otro[1]}">${otro[2]}</a>`));
    // Fuentes y licencias son nombres propios: no se traducen.
    assert.ok(html.includes('<li>Own creation (Gemini) · Gemini Terms of Use</li>\n      <li>Unsplash · Unsplash License</li>'));
    assert.ok(!html.includes('\r') && html.endsWith('</html>\n') && !html.endsWith('\n\n'));
  }
  assert.notEqual(en, es);
  assert.throws(() => generarCreditosHtml({ idioma: 'fr', parejas: [] }), TypeError);
  assert.equal(creditosParaBanco(banco, 'es'), creditosParaBanco(banco, 'es'), 'determinista');
  for (const html of [en, es]) {
    assert.ok(!html.includes('k3x9q2m7ab'));
    for (const id of ['contenido', 'creditos-tipografias', 'creditos-imagenes', 'creditos-lista', 'creditos-afirmaciones']) {
      assert.equal(contienePalabraProhibida(id), null, id);
    }
  }
  // Los textos españoles no cuelan palabras que delaten la respuesta en la página (salvo el nombre del reto, que es un título).
  assert.equal(contienePalabraProhibida(es.replace(/<footer[\s\S]*<\/footer>/, '').replace(TES.creditos.afirmaciones, '').replace(TES.creditos.afirmaciones_texto, '').replace(/<[^>]*>/g, ' ')), null);
});

test('288 escribirCreditos escribe las dos páginas en en/credits/ y es/creditos/ de la raíz indicada', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'creditos-'));
  try {
    escribirCreditos({ banco, raiz });
    assert.deepEqual(fs.readdirSync(raiz).sort(), ['en', 'es']);
    assert.equal(fs.readFileSync(path.join(raiz, 'en', 'credits', 'index.html'), 'utf8'), creditosParaBanco(banco, 'en'));
    assert.equal(fs.readFileSync(path.join(raiz, 'es', 'creditos', 'index.html'), 'utf8'), creditosParaBanco(banco, 'es'));
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});
