import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TIPOGRAFIAS, escaparHtml, parejasCreditos, generarCreditosHtml, creditosParaBanco } from '../herramientas/creditos.mjs';
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

test('77 tipografías y sin imágenes', () => {
  assert.deepEqual(TIPOGRAFIAS, [
    { familia: 'Oswald', licencia: 'SIL Open Font License 1.1', archivo: 'fonts/OFL-oswald.txt' },
    { familia: 'Special Elite', licencia: 'Apache License 2.0', archivo: 'fonts/LICENSE-special-elite.txt' }
  ]);
  const html = creditosParaBanco({ version: 2, imagenes: [] });
  assert.ok(html.includes(`<li>Oswald · SIL Open Font License 1.1 (<a href="fonts/OFL-oswald.txt">${TEXTOS.creditos.ver_licencia}</a>)</li>`));
  assert.ok(html.includes(`<li>Special Elite · Apache License 2.0 (<a href="fonts/LICENSE-special-elite.txt">${TEXTOS.creditos.ver_licencia}</a>)</li>`));
  assert.ok(!html.includes('OFL-special-elite'));
  assert.ok(html.includes(`<p>${TEXTOS.creditos.sin_imagenes}</p>`));
  assert.ok(!html.includes('creditos-lista'));
});

test('78 escaparHtml', () => {
  assert.equal(escaparHtml('<b>Fotos & "Co"</b> \'x\''), '&lt;b&gt;Fotos &amp; &quot;Co&quot;&lt;/b&gt; &#39;x&#39;');
  const html = generarCreditosHtml({ textos: TEXTOS, tipografias: TIPOGRAFIAS, parejas: [{ fuente: '<b>Fotos & "Co"</b>', licencia: 'x' }] });
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

test('81 ids sin palabras prohibidas', () => {
  const html = creditosParaBanco(banco);
  for (const id of ['creditos', 'creditos-tipografias', 'creditos-imagenes', 'creditos-lista', 'creditos-pie', 'creditos-volver']) {
    assert.ok(html.includes(`id="${id}"`), id);
    assert.equal(contienePalabraProhibida(id), null);
  }
  assert.ok(!html.includes('k3x9q2m7ab'));
});
