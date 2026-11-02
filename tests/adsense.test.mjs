// Preparación de AdSense (spec 13, criterios 387 a 396): configuración, cabecera, ads.txt, aviso legal y pie.
// Todo en memoria o en carpetas temporales; nunca se escribe en el repositorio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TEXTOS } from '../js/textos.js';
import { IDIOMAS } from '../js/diario.js';
import {
  CSP,
  RE_EDITOR,
  SUBCADENAS_GOOGLE,
  PAGINAS,
  analizarAdsense,
  leerAdsense,
  metaAdsense,
  contenidoAdsTxt,
  huecosSinRellenar,
  avisoLegalPublicable,
  paginasPublicadas,
  analizarContenido,
  comprobarSitio,
  escribirSitio,
  generarSitio,
  leerEntradas,
  pieRaiz,
  ruta
} from '../herramientas/paginas.mjs';
import { generarCreditosHtml } from '../herramientas/creditos.mjs';

const REPO = path.resolve(import.meta.dirname, '..');
const EDITOR = 'ca-pub-1234567890123456';
const AHORA = Date.parse('2026-11-09T12:00:00Z');
const ENTRADAS = leerEntradas(REPO);
const sitio = (extra = {}) => generarSitio({ entradas: { ...ENTRADAS, adsense: { editor: null }, ...extra }, ahoraMs: AHORA });
const paginasHtml = (mapa) => [...mapa].filter(([r]) => r.endsWith('.html'));
const sinHuecos = (t) => t.replace(/\[[A-ZÁÉÍÓÚÜÑ][^\]\n]*\]/g, 'X');
const CONTENIDO_SIN_HUECOS = {
  ...ENTRADAS.contenido,
  en: { ...ENTRADAS.contenido.en, aviso_legal: sinHuecos(ENTRADAS.contenido.en.aviso_legal) },
  es: { ...ENTRADAS.contenido.es, aviso_legal: sinHuecos(ENTRADAS.contenido.es.aviso_legal) }
};

function existentesBase() {
  const r = [];
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(path.join(REPO, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) recorrer(rel);
      else r.push(rel);
    }
  };
  for (const d of ['css', 'js', 'img', 'fonts', 'data', 'casos']) recorrer(d);
  return [...r, 'en/credits/index.html', 'es/creditos/index.html'];
}

test('387 analizarAdsense: válidos e inválidos, nunca lanza', () => {
  assert.deepEqual(analizarAdsense('{"version":1,"editor":null}'), { editor: null, errores: [] });
  assert.deepEqual(analizarAdsense(`{"version":1,"editor":"${EDITOR}"}`), { editor: EDITOR, errores: [] });
  for (const malo of [
    '{"version":1,"editor":"pub-1234567890123456"}',
    '{"version":1,"editor":"ca-pub-123"}',
    '{"version":1,"editor":"ca-pub-12345678901234567"}',
    '{"version":1,"editor":"CA-PUB-1234567890123456"}',
    '{"version":1,"editor":1234}',
    '{"version":1,"editor":""}',
    '{"version":1}',
    '{"version":1,"editor":null,"otro":1}',
    `{"version":2,"editor":"${EDITOR}"}`,
    '{no es json',
    '[]',
    'null',
    undefined
  ]) {
    const r = analizarAdsense(malo);
    assert.equal(r.editor, null, String(malo));
    assert.ok(r.errores.length > 0, String(malo));
  }
  assert.ok(RE_EDITOR.test(EDITOR));
  // El archivo del repositorio es válido: null o un código de editor con el formato correcto.
  const real = leerAdsense(REPO);
  assert.deepEqual(real.errores, []);
  assert.ok(real.editor === null || RE_EDITOR.test(real.editor));
  const vacio = fs.mkdtempSync(path.join(os.tmpdir(), 'adsense-'));
  try {
    assert.deepEqual(leerAdsense(vacio), { editor: null, errores: ['Falta herramientas/adsense.json.'] });
  } finally {
    fs.rmSync(vacio, { recursive: true, force: true });
  }
});

test('metaAdsense y contenidoAdsTxt', () => {
  assert.equal(metaAdsense(null), '');
  assert.equal(metaAdsense('basura'), '');
  assert.equal(metaAdsense(EDITOR), `<meta name="google-adsense-account" content="${EDITOR}">`);
  assert.equal(contenidoAdsTxt(null), null);
  assert.equal(contenidoAdsTxt(EDITOR), 'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
});

test('388 sin editor no se emite nada de AdSense y el aviso legal no se genera', () => {
  const mapa = sitio();
  assert.ok(!mapa.has('ads.txt'));
  const todo = [...mapa.values()].join('\n').toLowerCase();
  for (const s of ['google-adsense-account', ...SUBCADENAS_GOOGLE, 'aviso-legal', 'legal-notice', 'data-consentimiento']) assert.ok(!todo.includes(s), s);
  assert.ok(![...mapa.keys()].some((r) => /aviso-legal|legal-notice/.test(r)));
  // Solo el botón oculto del juego lleva el texto de pie.consentimiento.
  for (const [r, h] of paginasHtml(mapa)) {
    for (const idioma of IDIOMAS) {
      assert.equal(h.includes(`>${TEXTOS[idioma].pie.consentimiento}<`), r === `${idioma}/index.html`, `${r} ${idioma}`);
    }
  }
});

test('389 con editor: una metaetiqueta en el head de cada página, en su sitio, y ads.txt exacto', () => {
  const base = sitio();
  const mapa = sitio({ adsense: { editor: EDITOR } });
  const meta = metaAdsense(EDITOR);
  assert.equal(mapa.get('ads.txt'), 'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n');
  assert.equal(mapa.get('robots.txt'), base.get('robots.txt'));
  assert.equal(mapa.get('sitemap.xml'), base.get('sitemap.xml'));
  const paginas = paginasHtml(mapa);
  assert.ok(paginas.length > 40);
  for (const [r, h] of paginas) {
    assert.equal(h.split(meta).length - 1, 1, r);
    const head = h.slice(h.indexOf('<head>'), h.indexOf('</head>'));
    assert.ok(head.includes(meta), r);
    assert.ok(!/<script[^>]*\ssrc="https?:/i.test(h), r);
    for (const s of SUBCADENAS_GOOGLE) assert.ok(!h.toLowerCase().includes(s), `${r} ${s}`);
    assert.equal(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(h)?.[1], CSP, r);
    // Quitada la línea, la página es la de siempre.
    assert.equal(h.replace(`${meta}\n`, ''), base.get(r), r);
    if (r === '404.html') assert.ok(h.includes(`<meta name="robots" content="noindex">\n${meta}\n`), r);
    else if (/^creditos(\.es)?\.html$/.test(r)) assert.ok(h.includes(`</title>\n${meta}\n<link rel="canonical"`), r);
    else assert.ok(/<meta name="description" content="[^\n]*">\n(<meta name="robots" content="noindex">\n)?<meta name="google-adsense-account" content="ca-pub-1234567890123456">\n<link rel="canonical"/.test(h), r);
  }
  assert.deepEqual(comprobarSitio(mapa, existentesBase(), {}), []);
});

test('390 ida y vuelta null -> editor -> null; escribirSitio borra ads.txt y solo lo permitido', () => {
  const a = sitio();
  const b = sitio({ adsense: { editor: EDITOR } });
  const c = sitio({ adsense: { editor: null } });
  assert.deepEqual([...c], [...a]);
  assert.notDeepEqual([...b], [...a]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adsense-escribir-'));
  try {
    escribirSitio(b, dir);
    assert.equal(fs.readFileSync(path.join(dir, 'ads.txt'), 'utf8'), b.get('ads.txt'));
    for (const [d, contenido] of [['es/aviso-legal/index.html', 'x'], ['en/legal-notice/index.html', 'x'], ['otro.txt', 'se queda'], ['es/propia/index.html', 'se queda']]) {
      fs.mkdirSync(path.dirname(path.join(dir, d)), { recursive: true });
      fs.writeFileSync(path.join(dir, d), contenido);
    }
    const r = escribirSitio(a, dir);
    assert.ok(!fs.existsSync(path.join(dir, 'ads.txt')));
    assert.ok(!fs.existsSync(path.join(dir, 'es/aviso-legal')) && !fs.existsSync(path.join(dir, 'en/legal-notice')));
    assert.ok(fs.existsSync(path.join(dir, 'otro.txt')) && fs.existsSync(path.join(dir, 'es/propia/index.html')));
    assert.deepEqual(r.borradas.sort(), ['ads.txt', 'en/legal-notice/', 'es/aviso-legal/']);
    // Simular no borra nada.
    escribirSitio(b, dir);
    escribirSitio(a, dir, { simular: true });
    assert.ok(fs.existsSync(path.join(dir, 'ads.txt')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('391 créditos: metaetiqueta solo con editor, en su posición, sin script', () => {
  const parejas = [{ fuente: 'Fuente', licencia: 'CC0' }];
  for (const idioma of IDIOMAS) {
    const sin = generarCreditosHtml({ parejas, idioma });
    const con = generarCreditosHtml({ parejas, idioma, editor: EDITOR });
    assert.ok(!sin.includes('google-adsense-account'));
    assert.equal(con.split(metaAdsense(EDITOR)).length - 1, 1);
    assert.ok(/<meta name="description" content="[^\n]*">\n<meta name="google-adsense-account" content="ca-pub-1234567890123456">\n<link rel="canonical"/.test(con));
    assert.equal(con.replace(`${metaAdsense(EDITOR)}\n`, ''), sin);
    assert.ok(!/<script/i.test(sin) && !/<script/i.test(con));
  }
});

test('392 huecosSinRellenar', () => {
  assert.deepEqual(huecosSinRellenar(ENTRADAS.contenido.es.aviso_legal), ['[FECHA]', '[NOMBRE Y APELLIDOS]', '[NIF]', '[DOMICILIO]']);
  for (const x of ['[[pie.sobre]]', '["en", "es"]', '[1]', '[nota]', '', null, undefined, 42]) assert.deepEqual(huecosSinRellenar(x), [], String(x));
  assert.deepEqual(huecosSinRellenar('[COMPLETAR AL ACTIVAR LOS ANUNCIOS: PROVEEDOR]'), ['[COMPLETAR AL ACTIVAR LOS ANUNCIOS: PROVEEDOR]']);
  assert.deepEqual(huecosSinRellenar('[NIF] y [NIF]'), ['[NIF]']);
  // Los mismos marcadores en inglés (una sola búsqueda).
  assert.deepEqual(huecosSinRellenar(ENTRADAS.contenido.en.aviso_legal).sort(), ['[DOMICILIO]', '[FECHA]', '[NIF]', '[NOMBRE Y APELLIDOS]']);
});

test('393 avisoLegalPublicable y paginasPublicadas', () => {
  const c = (en, es) => ({ en: en === null ? {} : { aviso_legal: en }, es: es === null ? {} : { aviso_legal: es } });
  assert.equal(avisoLegalPublicable({ anunciosActivos: false, contenido: c('ok', 'ok') }), false);
  assert.equal(avisoLegalPublicable({ anunciosActivos: true, contenido: c('ok', 'Hay [NIF]') }), false);
  assert.equal(avisoLegalPublicable({ anunciosActivos: true, contenido: c('Hay [NIF]', 'ok') }), false);
  assert.equal(avisoLegalPublicable({ anunciosActivos: true, contenido: c(null, 'ok') }), false);
  assert.equal(avisoLegalPublicable({ anunciosActivos: null, contenido: c('ok', 'ok') }), false);
  assert.equal(avisoLegalPublicable({ anunciosActivos: true, contenido: c('ok', 'ok') }), true);
  assert.equal(avisoLegalPublicable(), false);
  assert.deepEqual([...paginasPublicadas(false)], [...PAGINAS]);
  assert.deepEqual(paginasPublicadas(true), [...PAGINAS, 'aviso_legal']);
});

const enlacesDelPie = (h) => [...(/<footer[\s\S]*?<\/footer>/.exec(h)?.[0] ?? '').matchAll(/<li><a href="([^"]*)"[^>]*>([^<]*)<\/a><\/li>/g)];

test('394 el aviso legal solo existe con anuncios activos y sin huecos', () => {
  for (const extra of [{ anunciosActivos: false }, { anunciosActivos: true }, { anunciosActivos: false, contenido: CONTENIDO_SIN_HUECOS }]) {
    const mapa = sitio(extra);
    assert.ok(![...mapa.keys()].some((r) => /aviso-legal|legal-notice/.test(r)));
    assert.ok(!todoTexto(mapa).includes('legal-notice') && !todoTexto(mapa).includes('aviso-legal'));
    // Con anuncios activos el pie lleva además el enlace de consentimiento.
    assert.equal(enlacesDelPie(mapa.get('es/privacidad/index.html')).length, 11 + (extra.anunciosActivos ? 1 : 0));
  }
  const mapa = sitio({ anunciosActivos: true, contenido: CONTENIDO_SIN_HUECOS });
  const es = mapa.get('es/aviso-legal/index.html');
  const en = mapa.get('en/legal-notice/index.html');
  assert.ok(es.includes('<html lang="es">') && es.includes('<h1>Aviso legal</h1>'));
  assert.ok(en.includes('<html lang="en">') && en.includes('<h1>Legal notice</h1>'));
  for (const h of [es, en]) {
    assert.ok(h.includes('hreflang="en" href="https://identifaiit.com/en/legal-notice/"'));
    assert.ok(h.includes('hreflang="es" href="https://identifaiit.com/es/aviso-legal/"'));
  }
  let pies = 0;
  for (const [r, h] of paginasHtml(mapa)) {
    if (!/^(en|es)\//.test(r) || r.endsWith('/index.html') === false || /^(en|es)\/index\.html$/.test(r)) continue;
    const idioma = r.slice(0, 2);
    const lis = enlacesDelPie(h);
    // 11 páginas, aviso legal y, con anuncios activos, el consentimiento al final.
    assert.equal(lis.length, 13, r);
    assert.equal(lis[11][2], TEXTOS[idioma].pie.aviso_legal, r);
    assert.equal(lis[12][2], TEXTOS[idioma].pie.consentimiento, r);
    assert.ok(h.includes('data-consentimiento="">'), r);
    pies++;
  }
  assert.ok(pies > 20);
  const raiz = mapa.get('index.html');
  assert.ok(raiz.includes('en/legal-notice/') && raiz.includes('es/aviso-legal/'));
  const sm = mapa.get('sitemap.xml');
  for (const idioma of IDIOMAS) {
    const contacto = sm.indexOf(`/${ruta(idioma, 'contacto')}`);
    const aviso = sm.indexOf(`/${ruta(idioma, 'aviso_legal')}`);
    assert.ok(contacto > 0 && aviso > contacto, idioma);
    const juego = mapa.get(`${idioma}/index.html`);
    assert.ok(!juego.includes('legal-notice') && !juego.includes('aviso-legal'));
  }
  assert.deepEqual(comprobarSitio(mapa, existentesBase(), {}), []);
});

function todoTexto(mapa) {
  return [...mapa.values()].join('\n');
}

test('395 analizarContenido acepta aviso legal, privacidad y cookies en los dos idiomas', () => {
  for (const idioma of IDIOMAS) {
    for (const clave of ['aviso_legal', 'privacidad', 'cookies']) {
      assert.deepEqual(analizarContenido(ENTRADAS.contenido[idioma][clave], `${idioma}/${clave}.html`).errores, [], `${idioma}/${clave}`);
    }
  }
});

test('396 pie de la raíz: las seis líneas de siempre y, solo si toca, aviso legal y consentimiento', () => {
  const base = pieRaiz().split('\n');
  assert.equal(base.length, 6);
  assert.ok(!base.join('').includes('data-consentimiento'));
  assert.equal(base[0], `      <li><a href="en/privacy/" hreflang="en" lang="en">${TEXTOS.en.pie.privacidad}</a></li>`);
  assert.equal(base[5], `      <li><a href="es/contacto/" hreflang="es" lang="es">${TEXTOS.es.pie.contacto}</a></li>`);
  const activo = pieRaiz({ editor: null, anunciosActivos: true, publicable: true }).split('\n');
  assert.equal(activo.length, 10);
  assert.ok(activo[3].includes('en/legal-notice/') && activo[4].includes('data-consentimiento=""'));
  assert.ok(activo[4].includes(`href="${ruta('en', 'cookies')}"`) && activo[4].includes(TEXTOS.en.pie.consentimiento));
  assert.ok(activo[8].includes('es/aviso-legal/') && activo[9].includes(`href="${ruta('es', 'cookies')}"`) && activo[9].includes(TEXTOS.es.pie.consentimiento));
  const raiz = sitio().get('index.html');
  assert.equal(raiz.split('<li>').length - 1, 6);
});

test('407 el aviso legal conserva sus cuatro marcadores y ANUNCIOS_ACTIVOS sigue en false', () => {
  for (const idioma of IDIOMAS) {
    for (const m of ['[NOMBRE Y APELLIDOS]', '[NIF]', '[DOMICILIO]', '[FECHA]']) assert.ok(ENTRADAS.contenido[idioma].aviso_legal.includes(m), `${idioma} ${m}`);
  }
  assert.ok(/^const ANUNCIOS_ACTIVOS = false;/m.test(fs.readFileSync(path.join(REPO, 'js/main.js'), 'utf8')));
});
