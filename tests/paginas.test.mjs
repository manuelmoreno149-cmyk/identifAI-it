// Pruebas del generador de páginas (spec 10, criterios 303-318, 322, 331, 332 y 336). Con datos de prueba ofuscados con diario.js;
// las plantillas y los contenidos son los del repositorio. Nada se escribe en el repositorio: todo va a carpetas temporales.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { TEXTOS, RUTAS } from '../js/textos.js';
import { IDIOMAS, ofuscar, ofuscarFicha, ofuscarAfirmacion, ofuscarAclaracion, desofuscar, desofuscarFicha, desofuscarAfirmacion, desofuscarAclaracion } from '../js/diario.js';
import {
  DOMINIO,
  CORREO,
  CSP,
  RUTAS_GUIAS,
  DIRECCIONES_EXCEPTUADAS,
  SUBCADENAS_GUIAS,
  PAGINAS,
  ROBOTS,
  rutasDe,
  rutaExceptuada,
  palabraProhibidaEnRuta,
  ruta,
  prefijo,
  relativa,
  ultimoDiaArchivable,
  diasArchivables,
  datosDelDia,
  analizarContenido,
  generarSitio,
  generarNoEncontrada,
  generarRedireccion,
  comprobarSitio,
  comprobarListaBlanca,
  existentesDeDisco,
  leerEntradas,
  analizarArgumentosPaginas,
  salidaPermitida,
  escribirSitio,
  ejecutar
} from '../herramientas/paginas.mjs';

const REPO = path.resolve(import.meta.dirname, '..');
const CERO = () => 0;
const ENTRADAS_REPO = leerEntradas(REPO);
const LANZAMIENTO = '2026-12-01';
const TEMAS = [
  ['Alpha', 'Alfa'],
  ['Bravo', 'Bravo uno'],
  ['Charlie', 'Carlos'],
  ['Delta', 'Delta dos'],
  ['Echo', 'Eco'],
  ['Foxtrot', 'Fox tres'],
  ['Golf', 'Golfo']
];
const idDe = (n, i) => `c${n}x${i}0q${n}${i}`.slice(0, 10).padEnd(10, 'z');
const GEN = [1, 0, 0, 1, 0];

function diaImagenes(n, gen = GEN) {
  const clave = ofuscar(gen, n, CERO);
  const texto = (g, i, idioma) => (g ? `SECRETOPROMPT-${idioma}-${n}-${i}` : TEXTOS[idioma].fichas.autentica);
  return {
    n,
    tema: { en: TEMAS[n - 1][0], es: TEMAS[n - 1][1] },
    pruebas: gen.map((_, i) => idDe(n, i)),
    clave,
    fichas: Object.fromEntries(IDIOMAS.map((idioma) => [idioma, gen.map((g, i) => ofuscarFicha(texto(g, i, idioma), clave, n, i, CERO, idioma))]))
  };
}

function diaFacts(n, fakes = [0, 1, 0, 0, 1]) {
  const clave = ofuscar(fakes, n, CERO);
  const claim = (i, idioma) => `SECRETOCLAIM-${idioma}-${n}-${i} dice algo.`;
  const verdad = (i, idioma) => `SECRETOTRUTH-${idioma}-${n}-${i}`;
  return {
    n,
    tema: { en: TEMAS[n - 1][0], es: TEMAS[n - 1][1] },
    clave,
    textos: Object.fromEntries(IDIOMAS.map((idioma) => [idioma, fakes.map((_, i) => ofuscarAfirmacion(claim(i, idioma), clave, n, i, CERO, idioma))])),
    fichas: Object.fromEntries(
      IDIOMAS.map((idioma) => [
        idioma,
        fakes.map((_, i) => ofuscarAclaracion({ aclaracion: verdad(i, idioma), detalles: i === 0 ? [] : [`SECRETODETAIL-${idioma}-${n}-${i}`] }, clave, n, i, CERO, idioma))
      ])
    )
  };
}

function entradas({ lanzamiento = LANZAMIENTO, nDias = 7, soloImagenes = [], soloFacts = [], genPorDia = {} } = {}) {
  const dias = Array.from({ length: nDias }, (_, k) => k + 1);
  return {
    ...ENTRADAS_REPO,
    calendario: { version: 5, lanzamiento, dias: dias.filter((n) => !soloFacts.includes(n)).map((n) => diaImagenes(n, genPorDia[n])) },
    meses: [{ version: 2, mes: '2026-12', dias: dias.filter((n) => !soloImagenes.includes(n)).map((n) => diaFacts(n)) }]
  };
}

const ms = (iso) => Date.parse(iso);
const html = (mapa, r) => mapa.get(r);
const todo = (mapa) => [...mapa.values()].join('\n');

// ---------- 331 y rutas ----------

test('331 DIRECCIONES_EXCEPTUADAS, RUTAS_GUIAS y rutasDe: exactas y congeladas', () => {
  assert.deepEqual([...DIRECCIONES_EXCEPTUADAS], [
    'en/how-to-spot-ai-images/',
    'en/how-to-spot-fake-news/',
    'es/como-saber-si-una-imagen-es-ia/',
    'es/como-detectar-un-bulo/'
  ]);
  assert.ok(Object.isFrozen(DIRECCIONES_EXCEPTUADAS) && Object.isFrozen(RUTAS_GUIAS) && Object.isFrozen(RUTAS_GUIAS.en) && Object.isFrozen(RUTAS_GUIAS.es));
  assert.deepEqual(Object.keys(RUTAS_GUIAS), ['en', 'es']);
  assert.deepEqual(Object.keys(RUTAS_GUIAS.es), ['guia_imagenes', 'guia_desinformacion']);
  assert.deepEqual(IDIOMAS.flatMap((i) => [`${i}/${RUTAS_GUIAS[i].guia_imagenes}`, `${i}/${RUTAS_GUIAS[i].guia_desinformacion}`]), [...DIRECCIONES_EXCEPTUADAS]);
  assert.deepEqual(Object.keys(rutasDe('es')), [...Object.keys(RUTAS.es), 'guia_imagenes', 'guia_desinformacion']);
  assert.equal(rutasDe('en').guia_desinformacion, 'how-to-spot-fake-news/');
  assert.deepEqual([...PAGINAS], ['sobre', 'como_jugar', 'metodo', 'guia_imagenes', 'guia_desinformacion', 'archivo', 'preguntas', 'creditos', 'privacidad', 'cookies', 'contacto']);
  for (const d of DIRECCIONES_EXCEPTUADAS) {
    assert.equal(rutaExceptuada(d), true, d);
    assert.equal(rutaExceptuada(`${d}index.html`), true, d);
  }
  for (const x of [
    'es/como-detectar-un-bulo', '/es/como-detectar-un-bulo/', 'es/como-detectar-un-bulo/otra/', 'es/como-detectar-un-bulo/foto.webp',
    'en/como-detectar-un-bulo/', 'ES/como-detectar-un-bulo/', 'es/guia-ia/', 'casos/ia.webp', 'data/bulo.json', 'es/', '', null, 42, undefined, {}
  ]) {
    assert.equal(rutaExceptuada(x), false, String(x));
  }
  assert.equal(palabraProhibidaEnRuta('es/como-jugar/'), false);
  assert.equal(palabraProhibidaEnRuta('es/como-detectar-un-bulo/index.html'), false);
  assert.equal(palabraProhibidaEnRuta('es/bulos-de-hoy/'), false);
  assert.equal(palabraProhibidaEnRuta('es/archivo/caso-3/ia/'), true);
  assert.equal(palabraProhibidaEnRuta('es/como-detectar-un-bulo/extra.html'), true);
  assert.equal(palabraProhibidaEnRuta(null), false);
});

test('331 comprobarListaBlanca: una quinta dirección, una cambiada o un valor de RUTAS prohibido son errores', () => {
  assert.deepEqual(comprobarListaBlanca(), []);
  assert.ok(comprobarListaBlanca({ direcciones: [...DIRECCIONES_EXCEPTUADAS, 'es/guia-ia/'] }).length > 0);
  assert.ok(comprobarListaBlanca({ direcciones: ['en/how-to-spot-ai-images/', 'en/how-to-spot-fake-news/', 'es/guia-ia/', 'es/como-detectar-un-bulo/'] }).length > 0);
  assert.ok(comprobarListaBlanca({ direcciones: [...DIRECCIONES_EXCEPTUADAS].reverse() }).length > 0);
  const malas = { ...RUTAS, es: { ...RUTAS.es, sobre: 'guia-ia/' } };
  assert.match(comprobarListaBlanca({ rutas: malas }).join('\n'), /RUTAS\.es\.sobre.*"ia"/);
  const guias = { ...RUTAS_GUIAS, es: { ...RUTAS_GUIAS.es, guia_desinformacion: 'otra/' } };
  assert.match(comprobarListaBlanca({ guias }).join('\n'), /no coincide con RUTAS_GUIAS/);
});

test('ruta, prefijo y relativa', () => {
  assert.equal(ruta('es', 'archivo_dia', 12), 'es/archivo/caso-12/');
  assert.equal(ruta('en', 'archivo_dia', 12), 'en/archive/case-12/');
  assert.equal(ruta('en', 'juego'), 'en/');
  assert.equal(ruta('es', 'guia_desinformacion'), 'es/como-detectar-un-bulo/');
  assert.throws(() => ruta('es', 'noexiste'), RangeError);
  assert.throws(() => ruta('es', 'archivo_dia'), RangeError);
  assert.equal(prefijo(0), '');
  assert.equal(prefijo(3), '../../../');
  assert.equal(relativa('es/como-jugar/', 'es/archivo/'), '../archivo/');
  assert.equal(relativa('es/', 'es/sobre-el-juego/'), 'sobre-el-juego/');
  assert.equal(relativa('es/archivo/caso-12/', 'es/'), '../../');
  assert.equal(relativa('es/', 'es/'), './');
  assert.equal(relativa('', 'en/'), 'en/');
  assert.equal(relativa('es/', 'en/'), '../en/');
});

// ---------- 312, 313, 314 ----------

test('312 ultimoDiaArchivable: el día D se archiva cuando ha terminado en UTC-12', () => {
  for (const [ahora, esperado] of [
    ['2026-12-02T11:59:59Z', '2026-11-30'],
    ['2026-12-02T12:00:00Z', '2026-12-01'],
    ['2026-12-31T23:59:59Z', '2026-12-30'],
    ['2027-01-01T12:00:00Z', '2026-12-31'],
    ['2026-12-02T12:15:00Z', '2026-12-01']
  ]) {
    assert.equal(ultimoDiaArchivable(ms(ahora)), esperado, ahora);
  }
});

test('312 y 303 el resultado no depende de TZ ni de la hora local', () => {
  const script = `
    import { leerEntradas, generarSitio, ultimoDiaArchivable } from ${JSON.stringify(new URL('../herramientas/paginas.mjs', import.meta.url).href)};
    import { createHash } from 'node:crypto';
    const m = generarSitio({ entradas: leerEntradas(${JSON.stringify(REPO)}), ahoraMs: Date.parse('2026-12-02T12:15:00Z') });
    const h = createHash('sha256');
    for (const [r, c] of m) h.update(r + c);
    console.log(ultimoDiaArchivable(Date.parse('2026-12-02T12:15:00Z')), h.digest('hex'));`;
  const salidas = ['Pacific/Kiritimati', 'Pacific/Pago_Pago', 'Europe/Madrid'].map((TZ) => {
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ }, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim();
  });
  assert.equal(new Set(salidas).size, 1, salidas.join(' | '));
  assert.ok(salidas[0].startsWith('2026-12-01 '));
});

test('303 determinista: mismas entradas y mismo ahora, mismo Map; LF, sin BOM, sin fecha de generación', () => {
  const e = entradas();
  const a = generarSitio({ entradas: e, ahoraMs: ms('2026-12-04T12:00:00Z') });
  const b = generarSitio({ entradas: e, ahoraMs: ms('2026-12-04T12:00:00Z') });
  assert.deepEqual([...a.keys()], [...b.keys()]);
  for (const [r, c] of a) {
    assert.equal(c, b.get(r), r);
    assert.ok(!c.includes('\r') && !c.startsWith('﻿'), r);
    assert.ok(c.endsWith('\n') && !c.endsWith('\n\n'), r);
  }
  const todoElTexto = todo(a);
  assert.ok(!/generated (at|on)|generado el|\d{4}-\d{2}-\d{2}T\d{2}:/i.test(todoElTexto));
});

test('313 sin lanzamiento: sin páginas de día, índice vacío con noindex, fuera del sitemap y {{ejemplos}} desaparece', () => {
  const mapa = generarSitio({ entradas: entradas({ lanzamiento: null }), ahoraMs: ms('2030-01-01T00:00:00Z') });
  assert.deepEqual(diasArchivables({ calendario: { lanzamiento: null, dias: [{ n: 1 }] }, meses: [], ahoraMs: ms('2030-01-01T00:00:00Z') }), []);
  assert.ok(![...mapa.keys()].some((r) => /case-\d|caso-\d/.test(r)));
  for (const [idioma, r] of [['en', 'en/archive/index.html'], ['es', 'es/archivo/index.html']]) {
    assert.ok(html(mapa, r).includes('<meta name="robots" content="noindex">'), r);
    assert.ok(html(mapa, r).includes(`<p class="archivo-vacio">${TEXTOS[idioma].archivo.vacio}</p>`), r);
  }
  const sitemap = html(mapa, 'sitemap.xml');
  assert.ok(!sitemap.includes('/archive/') && !sitemap.includes('/archivo/'));
  for (const r of ['en/how-to-spot-ai-images/index.html', 'es/como-saber-si-una-imagen-es-ia/index.html']) {
    assert.ok(!html(mapa, r).includes('archivo-ejemplos'), r);
    assert.ok(!html(mapa, r).includes('{{'), r);
    assert.ok(!/<(section|ul|p)>\s*<\/(section|ul|p)>/.test(html(mapa, r)), r);
  }
});

test('314 solo se archivan los días terminados en todo el mundo; nada de los demás aparece ni se descifra', () => {
  const e = entradas();
  const llamadas = [];
  const espia = (nombre, f) => (...args) => {
    llamadas.push([nombre, args[nombre === 'bit' ? 1 : 2]]);
    return f(...args);
  };
  const desofuscadores = {
    bit: espia('bit', desofuscar),
    ficha: espia('ficha', desofuscarFicha),
    afirmacion: espia('afirmacion', desofuscarAfirmacion),
    aclaracion: espia('aclaracion', desofuscarAclaracion)
  };
  const dias = (iso) => diasArchivables({ calendario: e.calendario, meses: e.meses, ahoraMs: ms(iso) }).map((d) => d.n);
  assert.deepEqual(dias('2026-12-04T11:00:00Z'), [1, 2]);
  assert.deepEqual(dias('2026-12-04T12:00:00Z'), [1, 2, 3]);
  const mapa = generarSitio({ entradas: e, ahoraMs: ms('2026-12-04T11:00:00Z'), desofuscadores });
  assert.deepEqual([...new Set(llamadas.map((l) => l[1]))].sort(), [1, 2]);
  const dias2 = [...mapa.keys()].filter((r) => /case-\d+\/index|caso-\d+\/index/.test(r));
  assert.deepEqual(dias2.sort(), ['en/archive/case-1/index.html', 'en/archive/case-2/index.html', 'es/archivo/caso-1/index.html', 'es/archivo/caso-2/index.html']);
  const texto = todo(mapa);
  for (let n = 3; n <= 7; n++) {
    for (const prohibido of [TEMAS[n - 1][0], TEMAS[n - 1][1], `-${n}-`, ...diaImagenes(n).pruebas]) {
      assert.ok(!texto.includes(prohibido), `aparece "${prohibido}" del día ${n}`);
    }
  }
  assert.ok(texto.includes('SECRETOPROMPT-en-2-0') && texto.includes('SECRETOCLAIM-es-1-1'));
  const m3 = generarSitio({ entradas: e, ahoraMs: ms('2026-12-04T12:00:00Z') });
  assert.ok(m3.has('en/archive/case-3/index.html'));
  // limiteN: validar no falla porque hoy ya toque archivar un día que la Action aún no ha añadido.
  const m1 = generarSitio({ entradas: e, ahoraMs: ms('2026-12-04T12:00:00Z'), limiteN: 1 });
  assert.ok(m1.has('en/archive/case-1/index.html') && !m1.has('en/archive/case-2/index.html'));
});

// ---------- 315 a 318 ----------

const AHORA_DIAS = ms('2026-12-05T12:00:00Z'); // archivados 1 a 4

test('315 página de un día con los dos retos: imágenes, sellos, prompts, afirmaciones y verdades', () => {
  const e = entradas();
  const mapa = generarSitio({ entradas: e, ahoraMs: AHORA_DIAS });
  for (const idioma of IDIOMAS) {
    const T = TEXTOS[idioma];
    const pagina = html(mapa, `${ruta(idioma, 'archivo_dia', 2)}index.html`);
    const dia = diaImagenes(2);
    assert.ok(pagina.includes(`<h1>${T.archivo.titulo_dia.replace('{n}', '2').replace('{tema}', dia.tema[idioma])}</h1>`));
    assert.ok(pagina.includes('<time datetime="2026-12-02">'));
    const imgs = [...pagina.matchAll(/<img src="([^"]*)" alt="([^"]*)" width="1080" height="1350"([^>]*)>/g)];
    assert.equal(imgs.length, 5);
    imgs.forEach((m, i) => {
      assert.equal(m[1], `../../../casos/${idDe(2, i)}.webp`);
      assert.equal(m[2], T.archivo.alt_prueba.replace('{i}', String(i + 1)).replace('{n}', '2'));
      assert.equal(m[3], i === 0 ? '' : ' loading="lazy" decoding="async"');
    });
    assert.equal((pagina.match(new RegExp(`<p class="archivo-sello">${T.partida.sello_generada}</p>`, 'g')) ?? []).length, 2);
    assert.equal((pagina.match(new RegExp(`<p class="archivo-sello">${T.partida.sello_autentica}</p>`, 'g')) ?? []).length, 3);
    assert.equal((pagina.match(new RegExp(`<p class="archivo-confesion">${T.fichas.autentica}</p>`, 'g')) ?? []).length, 3);
    assert.ok(pagina.includes(`<blockquote><p>SECRETOPROMPT-${idioma}-2-0</p></blockquote>`));
    assert.ok(pagina.includes(`<blockquote><p>SECRETOPROMPT-${idioma}-2-3</p></blockquote>`));
    const abre = idioma === 'es' ? '«' : '“';
    const afirmaciones = [...pagina.matchAll(/<p class="archivo-afirmacion"><strong class="archivo-sello">([^<]*)<\/strong> (.*?)<\/p>/g)];
    assert.equal(afirmaciones.length, 5);
    afirmaciones.forEach((m, i) => {
      assert.equal(m[1], [1, 4].includes(i) ? T.afirmaciones.sello_generada : T.afirmaciones.sello_autentica);
      assert.ok(m[2].startsWith(`${abre}SECRETOCLAIM-${idioma}-2-${i}`));
    });
    assert.equal((pagina.match(/<p class="archivo-aclaracion">/g) ?? []).length, 5);
    assert.ok(pagina.includes(`<p class="archivo-aclaracion">SECRETOTRUTH-${idioma}-2-3</p>`));
    assert.equal((pagina.match(/<ul class="archivo-detalles">/g) ?? []).length, 4); // la primera no tiene detalles
    assert.ok(!pagina.includes('data-verdad'));
    // Los sellos de cada reto no se distinguen por clase ni atributos.
    assert.ok(!/<(p|strong) class="archivo-sello"[^>]*\s(data|aria)-/.test(pagina));
  }
});

test('316 navegación del día, enlace al índice y al juego; un día con un solo reto muestra archivo.sin_reto', () => {
  const e = entradas({ soloImagenes: [2], soloFacts: [3] });
  const mapa = generarSitio({ entradas: e, ahoraMs: AHORA_DIAS });
  const T = TEXTOS.en;
  const primero = html(mapa, 'en/archive/case-1/index.html');
  const medio = html(mapa, 'en/archive/case-2/index.html');
  const ultimo = html(mapa, 'en/archive/case-4/index.html');
  assert.ok(!primero.includes(T.archivo.anterior) && primero.includes(`<a href="../case-2/">${T.archivo.siguiente}</a>`));
  assert.ok(medio.includes(`<a href="../case-1/">${T.archivo.anterior}</a>`) && medio.includes(`<a href="../case-3/">${T.archivo.siguiente}</a>`));
  assert.ok(ultimo.includes(T.archivo.anterior) && !ultimo.includes(T.archivo.siguiente));
  for (const p of [primero, medio, ultimo]) {
    assert.ok(p.includes(`<a href="../">${T.archivo.indice}</a>`));
    assert.ok(p.includes(`<a href="../../">${T.archivo.jugar_hoy.replace("'", '&#39;')}</a>`));
  }
  // Día 2: solo Images (sin Fact or Fake). Día 3: solo Fact or Fake.
  assert.ok(medio.includes(T.archivo.sin_reto.replace('{reto}', T.portada.reto_afirmaciones)));
  assert.ok(!medio.includes('archivo-afirmacion'));
  const dia3 = html(mapa, 'es/archivo/caso-3/index.html');
  assert.ok(dia3.includes(TEXTOS.es.archivo.sin_reto.replace('{reto}', TEXTOS.es.portada.reto_imagenes)));
  assert.ok(!dia3.includes('<img'));
});

test('317 índice: días por mes del más reciente al más antiguo, con nombres de mes de TEXTOS', () => {
  const e = entradas({ lanzamiento: '2026-11-29' });
  const mapa = generarSitio({ entradas: e, ahoraMs: ms('2026-12-04T12:00:00Z') }); // archivados: 29 nov a 2 dic (n 1 a 4)
  const en = html(mapa, 'en/archive/index.html');
  const es = html(mapa, 'es/archivo/index.html');
  assert.ok(en.indexOf('<h2 class="archivo-mes">December 2026</h2>') < en.indexOf('<h2 class="archivo-mes">November 2026</h2>'));
  assert.ok(es.indexOf('<h2 class="archivo-mes">diciembre de 2026</h2>') < es.indexOf('<h2 class="archivo-mes">noviembre de 2026</h2>'));
  assert.ok(en.includes('<li><a href="case-4/">Case #4 · Delta</a> <time datetime="2026-12-02">December 2, 2026</time></li>'));
  assert.ok(es.includes('<li><a href="caso-1/">Caso n.º 1 · Alfa</a> <time datetime="2026-11-29">29 de noviembre de 2026</time></li>'));
  assert.ok(en.indexOf('case-4/') < en.indexOf('case-3/') && en.indexOf('case-2/') < en.indexOf('case-1/'));
  assert.ok(!en.includes('noindex') && !en.includes('archivo-vacio'));
});

test('318 guía de imágenes: como máximo 3 ejemplos, solo generadas, de días archivados, con sello, prompt y enlace', () => {
  const e = entradas();
  const mapa = generarSitio({ entradas: e, ahoraMs: ms('2026-12-06T12:00:00Z') }); // archivados 1 a 5
  for (const idioma of IDIOMAS) {
    const guia = html(mapa, `${ruta(idioma, 'guia_imagenes')}index.html`);
    const bloque = /<section class="archivo-ejemplos">[\s\S]*?<\/section>/.exec(guia)?.[0];
    assert.ok(bloque, idioma);
    assert.equal((bloque.match(/<img /g) ?? []).length, 3);
    const prompts = [...bloque.matchAll(/SECRETOPROMPT-(\w+)-(\d)-(\d)/g)];
    assert.deepEqual(prompts.map((m) => m[2]), ['5', '4', '3']);
    for (const m of prompts) assert.ok(m[1] === idioma && ['0', '3'].includes(m[3]));
    assert.equal((bloque.match(new RegExp(`<p class="archivo-sello">${TEXTOS[idioma].partida.sello_generada}</p>`, 'g')) ?? []).length, 3);
    assert.ok(bloque.includes(`href="../${idioma === 'en' ? 'archive/case-5' : 'archivo/caso-5'}/"`));
    assert.ok(!bloque.includes(TEXTOS[idioma].partida.sello_autentica + '<'));
  }
});

// ---------- 304 a 311 ----------

const unico = (lista, nombre) => assert.equal(new Set(lista).size, lista.length, `${nombre} repetido`);

test('304 y 305 metadatos de cada página: lang, title y description propios, canonical, hreflang recíproco, Open Graph y JSON-LD', () => {
  const mapa = generarSitio({ entradas: entradas(), ahoraMs: AHORA_DIAS });
  const paginas = [...mapa.keys()].filter((r) => r.endsWith('.html') && r !== '404.html' && !/^creditos/.test(r));
  const titulos = [];
  const descripciones = [];
  for (const r of paginas) {
    const h = html(mapa, r);
    const idioma = r === 'index.html' ? 'en' : r.slice(0, 2);
    assert.ok(h.includes(`<html lang="${idioma}">`), r);
    titulos.push(/<title>(.*?)<\/title>/.exec(h)[1]);
    descripciones.push(/<meta name="description" content="(.*?)">/.exec(h)[1]);
    const canonical = /<link rel="canonical" href="(.*?)">/.exec(h)[1];
    assert.equal(canonical, DOMINIO + r.replace(/index\.html$/, ''), r);
    assert.ok(h.includes(`<meta property="og:url" content="${canonical}">`));
    const hl = Object.fromEntries([...h.matchAll(/<link rel="alternate" hreflang="([\w-]+)" href="(.*?)">/g)].map((m) => [m[1], m[2]]));
    assert.deepEqual(Object.keys(hl), ['en', 'es', 'x-default'], r);
    // Reciprocidad: la pareja apunta de vuelta.
    for (const lang of ['en', 'es']) {
      const pareja = mapa.get(hl[lang].slice(DOMINIO.length) + 'index.html');
      assert.ok(pareja, `${r}: la pareja ${hl[lang]} existe`);
      const hlPareja = Object.fromEntries([...pareja.matchAll(/<link rel="alternate" hreflang="([\w-]+)" href="(.*?)">/g)].map((m) => [m[1], m[2]]));
      assert.deepEqual(hlPareja, hl, r);
    }
    if (r === 'index.html' || r === 'en/index.html' || r === 'es/index.html') assert.equal(hl['x-default'], DOMINIO, r);
    else assert.equal(hl['x-default'], hl.en, r);
    assert.ok(h.includes(`<meta property="og:image" content="${DOMINIO}img/og/portada-${idioma}.png">`), r);
    assert.ok(h.includes('<meta property="og:image:width" content="1200">') && h.includes('<meta property="og:image:height" content="630">'));
    assert.ok(h.includes(`<meta property="og:locale" content="${idioma === 'es' ? 'es_ES' : 'en_US'}">`));
    assert.ok(h.includes('<meta name="twitter:card" content="summary_large_image">'));
    assert.ok(h.includes('<link rel="icon" href='));
    assert.ok(h.includes(`<meta http-equiv="Content-Security-Policy" content="${CSP}">`));
    const ld = [...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const esGuia = DIRECCIONES_EXCEPTUADAS.includes(r.replace(/index\.html$/, ''));
    const esJuegoORaiz = ['index.html', 'en/index.html', 'es/index.html'].includes(r);
    if (esGuia) {
      assert.equal(ld.length, 1, r);
      assert.equal(ld[0]['@type'], 'Article');
      assert.equal(ld[0].headline, /<h1>(.*?)<\/h1>/.exec(h)[1].replace(/&amp;/g, '&'));
      assert.deepEqual([ld[0].datePublished, ld[0].dateModified], [/^publicado: (.*)$/m, /^modificado: (.*)$/m].map((re) => re.exec(fs.readFileSync(path.join(REPO, 'herramientas/contenido', idioma, r.includes('imagen') || r.includes('images') ? 'guia_imagenes.html' : 'guia_desinformacion.html'), 'utf8'))[1]));
      assert.equal(ld[0].mainEntityOfPage, canonical);
      assert.ok(h.includes('<meta property="og:type" content="article">'));
    } else if (esJuegoORaiz) {
      assert.equal(ld.length, 1, r);
      assert.equal(ld[0]['@type'], 'WebSite');
      assert.deepEqual(ld[0].inLanguage, r === 'index.html' ? ['en', 'es'] : idioma);
    } else {
      assert.equal(ld.length, 0, r);
    }
  }
  // Cada título y descripción es propio dentro de su idioma (el título de Cookies es igual en inglés y en español).
  for (const idioma of ['en', 'es']) {
    const de = (lista) => lista.filter((_, i) => (paginas[i] === 'index.html' ? 'en' : paginas[i].slice(0, 2)) === idioma);
    unico(de(titulos), `title ${idioma}`);
    unico(de(descripciones), `description ${idioma}`);
  }
  assert.ok(mapa.has('en/how-to-spot-ai-images/index.html') && mapa.has('es/como-detectar-un-bulo/index.html'));
  const g = html(mapa, 'es/como-saber-si-una-imagen-es-ia/index.html');
  assert.ok(g.includes('<link rel="alternate" hreflang="en" href="https://identifaiit.com/en/how-to-spot-ai-images/">'));
});

test('306 y 307 el sitio generado pasa comprobarSitio; enlaces rotos, rutas con / y marcadores sin sustituir son errores', () => {
  const mapa = generarSitio({ entradas: entradas(), ahoraMs: AHORA_DIAS });
  const ids = entradas().calendario.dias.flatMap((d) => d.pruebas).map((id) => `casos/${id}.webp`);
  const existentes = [...existentesDeDisco(REPO), ...ids, 'en/credits/index.html', 'es/creditos/index.html'];
  const pendientes = ['css/paginas.css', 'img/ui/icono.svg', 'img/og/portada-en.png', 'img/og/portada-es.png', 'js/raiz.js'];
  assert.deepEqual(comprobarSitio(mapa, existentes, { pendientes }), []);
  const con = (r, f) => new Map([...mapa, [r, f(html(mapa, r))]]);
  const errores = (m) => comprobarSitio(m, existentes, { pendientes }).join('\n');
  assert.match(errores(con('es/como-jugar/index.html', (h) => h.replace('href="../archivo/"', 'href="../noexiste/"'))), /noexiste.*no existe/);
  assert.match(errores(con('es/como-jugar/index.html', (h) => h.replace('href="../archivo/"', 'href="/es/archivo/"'))), /empieza por \//);
  assert.match(errores(con('es/como-jugar/index.html', (h) => h.replace('href="../archivo/"', 'href="../archivo"'))), /no acaba en \//);
  assert.match(errores(con('es/como-jugar/index.html', (h) => h.replace('href="../archivo/"', 'href="{{enlace:archivo}}"'))), /marcadores sin sustituir/);
  assert.match(errores(con('es/como-jugar/index.html', (h) => h.replace('href="../archivo/"', `href="${DOMINIO}es/archivo/"`))), /URL absoluta del dominio/);
  assert.match(errores(con('es/como-jugar/index.html', (h) => h.replace('</body>', '<p>{{dominio}}</p></body>'))), /marcadores sin sustituir/);
  assert.match(errores(con('es/como-jugar/index.html', (h) => h.replace('</body>', '<a href="http://x.org/">x</a></body>'))), /esquema|origen/);
  assert.match(errores(con('es/como-jugar/index.html', (h) => h.replace('</body>', '<a href="https://x.org/">x</a></body>'))), /necesita rel="noopener"/);
  assert.match(errores(con('es/como-jugar/index.html', (h) => h.replace('content="default-src', 'content="img-src'))), /CSP/);
  assert.match(errores(con('es/como-jugar/index.html', (h) => h.replace('</body>', '<p onclick="x()">a</p></body>'))), /manejador/);
});

test('307 ningún id, clase, data-* ni alt lleva palabras prohibidas (tampoco en las guías); data-verdad solo en el juego', () => {
  const mapa = generarSitio({ entradas: entradas(), ahoraMs: AHORA_DIAS });
  const existentes = [...existentesDeDisco(REPO), ...entradas().calendario.dias.flatMap((d) => d.pruebas).map((id) => `casos/${id}.webp`), 'en/credits/index.html', 'es/creditos/index.html'];
  const pendientes = ['css/paginas.css', 'img/ui/icono.svg', 'img/og/portada-en.png', 'img/og/portada-es.png', 'js/raiz.js'];
  const con = (r, de, a) => new Map([...mapa, [r, html(mapa, r).replace(de, a)]]);
  const errores = (m) => comprobarSitio(m, existentes, { pendientes }).join('\n');
  assert.match(errores(con('es/como-jugar/index.html', '<p>', '<p class="dato">')), /class="dato" contiene la palabra prohibida "dato"/);
  assert.match(errores(con('es/como-detectar-un-bulo/index.html', '<p>', '<p><img alt="falsa" src="../../img/ui/icono.svg">')), /alt="falsa" contiene la palabra prohibida "falsa"/);
  assert.match(errores(con('en/about/index.html', '<p>', '<p data-verdad="x">')), /data-verdad solo puede estar en el juego/);
  assert.match(errores(con('en/about/index.html', '<p>', '<p data-fake-id="x">')), /data-fake-id contiene "fake"/);
  // Las rutas: ningún segmento con palabras prohibidas salvo las cuatro exactas.
  const rotas = new Map([...mapa, ['es/guia-ia/index.html', html(mapa, 'es/sobre-el-juego/index.html')]]);
  assert.match(errores(rotas), /es\/guia-ia\/index\.html: la ruta lleva una palabra prohibida/);
  const extra = new Map([...mapa, ['es/como-detectar-un-bulo/extra.html', '']]);
  assert.match(errores(extra), /extra\.html: la ruta lleva una palabra prohibida/);
  assert.match(errores(con('es/como-jugar/index.html', 'href="../archivo/"', 'href="../how-to-spot-ai-images/"')), /how-to-spot-ai-images.*no existe/);
});

test('332 las guías no están en el juego: dirección de una guía en en/index.html o es/index.html es error', () => {
  const mapa = generarSitio({ entradas: entradas(), ahoraMs: AHORA_DIAS });
  for (const s of SUBCADENAS_GUIAS) {
    for (const r of ['en/index.html', 'es/index.html']) {
      assert.ok(!html(mapa, r).includes(s), `${r} contiene ${s}`);
      const m = new Map([...mapa, [r, html(mapa, r).replace('</body>', `<!-- ${s} --></body>`)]]);
      assert.match(comprobarSitio(m, existentesDeDisco(REPO), { pendientes: ['css/paginas.css', 'img/ui/icono.svg', 'img/og/portada-en.png', 'img/og/portada-es.png', 'js/raiz.js'] }).join('\n'), /el juego contiene la dirección de una guía/);
    }
  }
  assert.throws(() => generarSitio({ entradas: { ...entradas(), plantillas: { ...ENTRADAS_REPO.plantillas, juego: ENTRADAS_REPO.plantillas.juego.replace('{{enlace:archivo}}', '{{enlace:guia_imagenes}}') } }, ahoraMs: AHORA_DIAS }), /guías/);
});

test('308 analizarContenido: acepta una cabecera completa y da error (sin lanzar) en cada caso del criterio', () => {
  const desc = 'D'.repeat(80);
  const base = (extra = '', cuerpo = '<p>Hola <a href="{{enlace:juego}}">juego</a>.</p>', tipo = 'pagina') =>
    `<!--\ntitulo: Un título\ndescripcion: ${desc}\nh1: Uno\ntipo: ${tipo}\n${extra}-->\n${cuerpo}\n`;
  const ok = analizarContenido(base(), 'herramientas/contenido/es/sobre.html');
  assert.deepEqual(ok.errores, []);
  assert.equal(ok.meta.titulo, 'Un título');
  assert.deepEqual(analizarContenido(base('publicado: 2026-11-15\nmodificado: 2026-11-15\n', '<h2>x</h2><ul><li>a</li></ul>', 'articulo'), 'g.html').errores, []);
  const mal = (texto, re) => {
    const r = analizarContenido(texto, 'x.html');
    assert.match(r.errores.join('\n'), re, texto.slice(0, 80));
  };
  mal(base().replace('h1: Uno\n', ''), /falta el campo h1/);
  mal(base('extra: 1\n'), /sobra el campo extra/);
  mal(base().replace('tipo: pagina', 'tipo: otro'), /tipo desconocido/);
  mal(base('', '<script>x</script>'), /etiqueta no permitida: <script>/);
  mal(base('', '<p style="x">a</p>'), /atributo no permitido en <p>: style/);
  mal(base('', '<p onclick="x()">a</p>'), /atributo no permitido en <p>: onclick/);
  mal(base('', '<p id="a">a</p>'), /atributo no permitido en <p>: id/);
  mal(base('', '<img src="a.png">'), /etiqueta no permitida: <img>/);
  mal(base('', '<p><a href="http://a.org">a</a></p>'), /enlace no permitido/);
  mal(base('', '<p><a href="https://a.org">a</a></p>'), /necesita rel="noopener"/);
  mal(base('', '<p><a href="{{enlace:noexiste}}">a</a></p>'), /\{\{enlace:noexiste\}\} no existe/);
  mal(base().replace('Un título', 'T'.repeat(46)), /el título con el sufijo mide 61/);
  mal(base().replace(desc, 'D'.repeat(69)), /descripción mide 69/);
  mal(base().replace(desc, 'D'.repeat(156)), /descripción mide 156/);
  mal('sin cabecera', /falta la cabecera/);
  assert.deepEqual(analizarContenido(base().replace('Un título', 'T'.repeat(45)), 'x.html').errores, []);
  assert.doesNotThrow(() => analizarContenido(null));
  assert.doesNotThrow(() => analizarContenido(undefined, 5));
  // Los contenidos del repositorio son todos válidos.
  for (const idioma of IDIOMAS) {
    for (const [clave, texto] of Object.entries(ENTRADAS_REPO.contenido[idioma])) {
      assert.deepEqual(analizarContenido(texto, `herramientas/contenido/${idioma}/${clave}.html`).errores, [], `${idioma}/${clave}`);
    }
  }
});

test('309 pie y cabecera: las 11 páginas en su idioma, aria-current en la actual, guías en sus direcciones, sin aviso legal', () => {
  const mapa = generarSitio({ entradas: entradas(), ahoraMs: AHORA_DIAS });
  for (const idioma of IDIOMAS) {
    for (const clave of PAGINAS.filter((c) => c !== 'creditos')) {
      const r = `${ruta(idioma, clave)}index.html`;
      const h = html(mapa, r);
      const nav = /<nav aria-label="([^"]*)">([\s\S]*?)<\/nav>/.exec(h);
      assert.equal(nav[1], TEXTOS[idioma].pie.etiqueta);
      const enlaces = [...nav[2].matchAll(/<li><a href="([^"]*)"( aria-current="page")?>([^<]*)<\/a><\/li>/g)];
      assert.deepEqual(enlaces.map((m) => m[3]), PAGINAS.map((c) => TEXTOS[idioma].pie[c]), r);
      assert.deepEqual(enlaces.filter((m) => m[2]).map((m) => m[3]), [TEXTOS[idioma].pie[clave]], r);
      const carpeta = ruta(idioma, clave);
      PAGINAS.forEach((c, i) => assert.equal(enlaces[i][1], relativa(carpeta, ruta(idioma, c))));
      const otro = idioma === 'en' ? 'es' : 'en';
      assert.ok(h.includes(`<a class="pagina-logo" href="${relativa(carpeta, ruta(idioma, 'juego'))}">`));
      assert.ok(h.includes(`<a class="pagina-idioma" href="${relativa(carpeta, ruta(otro, clave))}" hreflang="${otro}" lang="${otro}">${otro === 'en' ? 'English' : 'Español'}</a>`));
      assert.ok(h.includes(`<a href="mailto:${CORREO}">${CORREO}</a>`));
    }
  }
  assert.ok(![...mapa.keys()].some((r) => /aviso-legal|legal-notice/.test(r)));
  assert.ok(!todo(mapa).match(/aviso-legal|legal-notice/));
});

test('310 robots.txt y sitemap.xml exactos, en orden, sin redirecciones, 404 ni páginas noindex', () => {
  assert.equal(ROBOTS, 'User-agent: *\nDisallow: /docs/\nDisallow: /herramientas/\nDisallow: /tests/\n\nSitemap: https://identifaiit.com/sitemap.xml\n');
  const mapa = generarSitio({ entradas: entradas(), ahoraMs: AHORA_DIAS });
  assert.equal(html(mapa, 'robots.txt'), ROBOTS);
  const s = html(mapa, 'sitemap.xml');
  assert.ok(s.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'));
  assert.ok(!/lastmod|changefreq|priority/.test(s));
  const locs = [...s.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  const esperado = [''];
  for (const idioma of IDIOMAS) esperado.push(ruta(idioma, 'juego'), ...PAGINAS.map((c) => ruta(idioma, c)));
  for (const n of [1, 2, 3, 4]) esperado.push(ruta('en', 'archivo_dia', n), ruta('es', 'archivo_dia', n));
  assert.deepEqual(locs, esperado.map((r) => DOMINIO + r));
  assert.ok(locs.includes('https://identifaiit.com/es/como-saber-si-una-imagen-es-ia/'));
  assert.ok(!locs.some((l) => /creditos\.|404|aviso/.test(l)));
  assert.equal(new Set(locs).size, locs.length);
});

test('311 creditos.html y creditos.es.html redirigen a sus nuevas direcciones', () => {
  const mapa = generarSitio({ entradas: entradas(), ahoraMs: AHORA_DIAS });
  assert.ok(html(mapa, 'creditos.html').includes('<meta http-equiv="refresh" content="0; url=en/credits/">'));
  assert.ok(html(mapa, 'creditos.es.html').includes('<meta http-equiv="refresh" content="0; url=es/creditos/">'));
  assert.ok(html(mapa, 'creditos.html').includes('<link rel="canonical" href="https://identifaiit.com/en/credits/">'));
  assert.ok(html(mapa, 'creditos.es.html').includes('<link rel="canonical" href="https://identifaiit.com/es/creditos/">'));
  assert.ok(html(mapa, 'creditos.es.html').includes('<p><a href="es/creditos/">Créditos</a></p>'));
  assert.ok(html(mapa, 'creditos.html').includes('data-pagina="redireccion"'));
  assert.equal(generarRedireccion('en'), html(mapa, 'creditos.html'));
  assert.ok(!html(mapa, 'creditos.html').includes('noindex'));
});

// ---------- 336 ----------

test('336 404.html: bilingüe, sin JS, URL absolutas, noindex y fuera del sitemap', () => {
  const mapa = generarSitio({ entradas: entradas(), ahoraMs: AHORA_DIAS });
  const h = html(mapa, '404.html');
  assert.equal(h, generarNoEncontrada({ plantillas: ENTRADAS_REPO.plantillas }));
  assert.ok(h.startsWith('<!doctype html>\n<html lang="en">'));
  assert.ok(h.includes('data-pagina="no-encontrada"') && h.includes('lang="es"'));
  const te = TEXTOS.en.no_encontrada;
  const ts = TEXTOS.es.no_encontrada;
  assert.ok(h.includes(`<title>${te.titulo} · ${ts.titulo} · identifAI-it</title>`));
  assert.equal((h.match(/<h1>/g) ?? []).length, 1);
  assert.ok(h.includes(`<h1><span lang="en">${te.titulo}</span> · <span lang="es">${ts.titulo}</span></h1>`));
  for (const t of [te.texto.replace("'", '&#39;'), ts.texto, te.enlace, ts.enlace]) assert.ok(h.includes(t), t);
  assert.ok(h.includes('<meta name="robots" content="noindex">'));
  assert.ok(h.includes(`<meta http-equiv="Content-Security-Policy" content="${CSP}">`));
  assert.ok(!/canonical|hreflang="(en|es|x-default)" href|og:|ld\+json|name="description"|<script/.test(h));
  const urls = [...h.matchAll(/(?:href|src)="([^"]*)"/g)].map((m) => m[1]);
  assert.ok(urls.length === 7 && urls.every((u) => u.startsWith(DOMINIO)));
  assert.ok(urls.includes(`${DOMINIO}en/`) && urls.includes(`${DOMINIO}es/`) && urls.includes(DOMINIO));
  assert.ok(!/\{\{|\[\[/.test(h));
  assert.ok(!html(mapa, 'sitemap.xml').includes('404'));
  const existentes = [...existentesDeDisco(REPO), ...entradas().calendario.dias.flatMap((d) => d.pruebas).map((id) => `casos/${id}.webp`), 'en/credits/index.html', 'es/creditos/index.html'];
  const pendientes = ['css/paginas.css', 'img/ui/icono.svg', 'img/og/portada-en.png', 'img/og/portada-es.png', 'js/raiz.js'];
  assert.deepEqual(comprobarSitio(mapa, existentes, { pendientes }), []);
  const con = (f) => new Map([...mapa, ['404.html', f(h)]]);
  const err = (m) => comprobarSitio(m, existentes, { pendientes }).join('\n');
  assert.match(err(con((x) => x.replace(`href="${DOMINIO}en/"`, 'href="../en/"'))), /debe empezar por https:\/\/identifaiit\.com\//);
  assert.match(err(con((x) => x.replace('<meta name="robots" content="noindex">', ''))), /404 debe llevar noindex/);
  assert.match(err(con((x) => x.replace('</head>', '<script src="x.js"></script></head>'))), /no puede llevar <script>/);
  assert.match(err(con((x) => x.replace('</head>', '<link rel="canonical" href="https://identifaiit.com/">\n</head>'))), /canonical|hreflang/);
  assert.match(err(con((x) => x.replace('Back to the game', '{{dominio}}'))), /marcadores sin sustituir/);
});

// ---------- CLI (312, 322 y la regla de --ahora/--salida) ----------

function raizPrueba(e) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'paginas-'));
  for (const d of ['herramientas/plantillas', 'herramientas/contenido', 'css', 'js', 'img']) fs.cpSync(path.join(REPO, d), path.join(raiz, d), { recursive: true });
  fs.mkdirSync(path.join(raiz, 'data/facts'), { recursive: true });
  fs.writeFileSync(path.join(raiz, 'data/calendario.json'), JSON.stringify(e.calendario));
  for (const m of e.meses) fs.writeFileSync(path.join(raiz, `data/facts/${m.mes}.json`), JSON.stringify(m));
  fs.mkdirSync(path.join(raiz, 'casos'));
  for (const d of e.calendario.dias) for (const id of d.pruebas) fs.writeFileSync(path.join(raiz, 'casos', `${id}.webp`), 'x');
  for (const r of ['en/credits/index.html', 'es/creditos/index.html']) {
    fs.mkdirSync(path.dirname(path.join(raiz, r)), { recursive: true });
    fs.writeFileSync(path.join(raiz, r), '<!doctype html>\n');
  }
  return raiz;
}

const salida = () => {
  const lineas = [];
  const errores = [];
  return { lineas, errores, log: (l) => lineas.push(l), error: (l) => errores.push(l) };
};

test('analizarArgumentosPaginas y salidaPermitida: --ahora exige --salida, y --salida no puede estar en el repositorio salvo capturas/', () => {
  assert.deepEqual(analizarArgumentosPaginas(['--simular']), { simular: true, ultimo: false, ahora: null, salida: null, errores: [] });
  assert.match(analizarArgumentosPaginas(['--ahora=2027-01-10T13:00:00Z']).errores.join(), /--ahora exige --salida/);
  assert.equal(analizarArgumentosPaginas(['--ahora=2027-01-10T13:00:00Z', '--salida=x']).ahora, ms('2027-01-10T13:00:00Z'));
  assert.match(analizarArgumentosPaginas(['--ahora=basura', '--salida=x']).errores.join(), /no es una fecha/);
  assert.match(analizarArgumentosPaginas(['--otra']).errores.join(), /Argumento desconocido/);
  assert.equal(salidaPermitida(path.join(REPO, 'en'), REPO), false);
  assert.equal(salidaPermitida(REPO, REPO), false);
  assert.equal(salidaPermitida(path.join(REPO, 'capturas'), REPO), false);
  assert.equal(salidaPermitida(path.join(REPO, 'capturas', 'paginas'), REPO), true);
  assert.equal(salidaPermitida(path.join(os.tmpdir(), 'x'), REPO), true);
  const s = salida();
  assert.equal(ejecutar(['--ahora=2027-01-10T13:00:00Z'], { raiz: REPO, log: s.log, error: s.error }), 1);
  assert.equal(ejecutar(['--salida=' + path.join(REPO, 'en')], { raiz: REPO, log: s.log, error: s.error }), 1);
  assert.match(s.errores.join(), /dentro del repositorio/);
});

test('322 --ultimo imprime el último caso archivado (0 sin archivo) y no escribe nada', () => {
  const sinLanzamiento = raizPrueba(entradas({ lanzamiento: null }));
  const con = raizPrueba(entradas());
  try {
    let s = salida();
    assert.equal(ejecutar(['--ultimo'], { raiz: sinLanzamiento, ahoraMs: ms('2030-01-01T00:00:00Z'), log: s.log, error: s.error }), 0);
    assert.deepEqual(s.lineas, ['0']);
    s = salida();
    assert.equal(ejecutar(['--ultimo'], { raiz: con, ahoraMs: ms('2026-12-05T12:00:00Z'), log: s.log, error: s.error }), 0);
    assert.deepEqual(s.lineas, ['4']);
    for (const raiz of [sinLanzamiento, con]) {
      assert.ok(!fs.existsSync(path.join(raiz, 'index.html')) && !fs.existsSync(path.join(raiz, 'sitemap.xml')));
    }
  } finally {
    fs.rmSync(sinLanzamiento, { recursive: true, force: true });
    fs.rmSync(con, { recursive: true, force: true });
  }
});

test('ejecutar escribe el sitio, es idempotente, informa y borra los días sobrantes solo dentro del archivo', () => {
  const raiz = raizPrueba(entradas());
  try {
    let s = salida();
    assert.equal(ejecutar([], { raiz, ahoraMs: ms('2026-12-05T12:00:00Z'), log: s.log, error: s.error }), 0, s.errores.join('\n'));
    assert.match(s.lineas.at(-1), /^\d+ páginas escritas, 0 sin cambios, 4 días archivados \(hasta el caso n\.º 4\)\.$/);
    assert.ok(fs.existsSync(path.join(raiz, 'es/archivo/caso-4/index.html')));
    // Segunda ejecución: nada cambia.
    s = salida();
    assert.equal(ejecutar([], { raiz, ahoraMs: ms('2026-12-05T12:00:00Z'), log: s.log, error: s.error }), 0);
    assert.match(s.lineas.at(-1), /^0 páginas escritas, \d+ sin cambios, 4 días archivados/);
    // --simular no escribe ni borra.
    fs.mkdirSync(path.join(raiz, 'es/archivo/caso-9'), { recursive: true });
    fs.writeFileSync(path.join(raiz, 'es/archivo/caso-9/index.html'), 'sobra');
    fs.writeFileSync(path.join(raiz, 'es/archivo/otra.txt'), 'se queda');
    s = salida();
    assert.equal(ejecutar(['--simular'], { raiz, ahoraMs: ms('2026-12-05T12:00:00Z'), log: s.log, error: s.error }), 0);
    assert.ok(fs.existsSync(path.join(raiz, 'es/archivo/caso-9/index.html')));
    assert.ok(s.lineas.some((l) => l.includes('borraría es/archivo/caso-9/')));
    // Con menos días archivables, se borran los que ya no corresponden (y solo las carpetas de día).
    s = salida();
    assert.equal(ejecutar([], { raiz, ahoraMs: ms('2026-12-03T12:00:00Z'), log: s.log, error: s.error }), 0);
    assert.ok(!fs.existsSync(path.join(raiz, 'es/archivo/caso-9')) && !fs.existsSync(path.join(raiz, 'es/archivo/caso-4')));
    assert.ok(fs.existsSync(path.join(raiz, 'es/archivo/caso-2/index.html')) && fs.existsSync(path.join(raiz, 'es/archivo/otra.txt')));
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

test('--ahora con --salida escribe un archivo de prueba fuera del repositorio sin tocar el repositorio ni la raíz', () => {
  const raiz = raizPrueba(entradas());
  const destino = fs.mkdtempSync(path.join(os.tmpdir(), 'paginas-salida-'));
  try {
    const s = salida();
    assert.equal(ejecutar([`--ahora=2026-12-04T12:00:00Z`, `--salida=${destino}`], { raiz, log: s.log, error: s.error }), 0, s.errores.join('\n'));
    assert.ok(fs.existsSync(path.join(destino, 'es/archivo/caso-3/index.html')));
    assert.ok(!fs.existsSync(path.join(destino, 'es/archivo/caso-4/index.html')));
    assert.ok(!fs.existsSync(path.join(raiz, 'index.html')));
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
    fs.rmSync(destino, { recursive: true, force: true });
  }
});

test('escribirSitio trata CRLF y LF como iguales', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paginas-crlf-'));
  try {
    fs.writeFileSync(path.join(dir, 'robots.txt'), ROBOTS.replace(/\n/g, '\r\n'));
    const r = escribirSitio(new Map([['robots.txt', ROBOTS]]), dir);
    assert.deepEqual([r.escritas, r.sinCambios], [[], ['robots.txt']]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------- 320 ----------

test('320 la Action del archivo cumple la spec (revisión del archivo)', () => {
  const y = fs.readFileSync(path.join(REPO, '.github/workflows/archivo.yml'), 'utf8');
  assert.equal((y.match(/cron:/g) ?? []).length, 1);
  assert.match(y, /- cron: '15 12 \* \* \*'/);
  assert.match(y, /^on:\n  schedule:\n[\s\S]*\n  workflow_dispatch:\n/m);
  assert.match(y, /^permissions: \{\}$/m);
  assert.equal((y.match(/contents: write/g) ?? []).length, 1);
  assert.match(y, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(y, /concurrency:\n  group: archivo\n  cancel-in-progress: false/);
  assert.match(y, /node-version: 20/);
  for (const paso of ['npm ci', 'npm run paginas', 'npm run validar', 'git add -- en es sitemap.xml', 'git push']) assert.ok(y.includes(paso), paso);
  assert.ok(y.indexOf('npm run paginas') < y.indexOf('npm run validar') && y.indexOf('npm run validar') < y.indexOf('git push'));
  assert.ok(y.includes('Cambios inesperados fuera de en/, es/ y sitemap.xml') && y.includes('exit 1'));
  assert.ok(y.includes('if git diff --cached --quiet; then echo "Sin cambios"; exit 0; fi'));
  assert.ok(y.includes('datos: archivo de casos hasta el n.º $(node herramientas/paginas.mjs --ultimo)'));
  assert.ok(!/secrets\.|token|npm test|--estricto/i.test(y));
});

test('paquete: script paginas sin dependencias nuevas', () => {
  const p = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  assert.equal(p.scripts.paginas, 'node herramientas/paginas.mjs');
  assert.deepEqual(Object.keys(p.dependencies ?? {}).concat(Object.keys(p.devDependencies ?? {})), ['sharp']);
});

test('datosDelDia descifra el día pedido y falla (sin datos a medias) si algo no se puede descifrar', () => {
  const e = entradas();
  const d = datosDelDia({ calendario: e.calendario, meses: e.meses, n: 2 });
  assert.deepEqual(d.tema, { en: 'Bravo', es: 'Bravo uno' });
  assert.equal(d.fecha, '2026-12-02');
  assert.deepEqual(d.imagenes.map((p) => p.verdad), ['generada', 'autentica', 'autentica', 'generada', 'autentica']);
  assert.equal(d.imagenes[0].ficha.es, 'SECRETOPROMPT-es-2-0');
  assert.deepEqual(d.afirmaciones.map((a) => a.verdad), ['autentica', 'generada', 'autentica', 'autentica', 'generada']);
  assert.equal(d.afirmaciones[1].aclaracion.en.detalles[0], 'SECRETODETAIL-en-2-1');
  const roto = { ...e.calendario, dias: e.calendario.dias.map((x) => (x.n === 2 ? { ...x, fichas: { ...x.fichas, es: x.fichas.en } } : x)) };
  assert.throws(() => datosDelDia({ calendario: roto, meses: e.meses, n: 2 }), /No se puede descifrar/);
  const hash = createHash('sha256').update(JSON.stringify(d)).digest('hex');
  assert.equal(hash, createHash('sha256').update(JSON.stringify(datosDelDia({ calendario: e.calendario, meses: e.meses, n: 2 }))).digest('hex'));
});

test('avisosMeta: título de más de 60 o descripción fuera de 70-155 es un aviso, no un error; la 404 no cuenta', async () => {
  const { avisosMeta } = await import('../herramientas/paginas.mjs');
  const pagina = (t, d) => `<html><head><title>${t}</title><meta name="description" content="${d}"></head></html>`;
  const m = new Map([
    ['ok/index.html', pagina('T'.repeat(60), 'D'.repeat(70))],
    ['titulo/index.html', pagina('T'.repeat(61), 'D'.repeat(100))],
    ['corta/index.html', pagina('T', 'D'.repeat(69))],
    ['larga/index.html', pagina('T', 'D'.repeat(156))],
    ['404.html', pagina('T'.repeat(90), 'x')]
  ]);
  const a = avisosMeta(m);
  assert.equal(a.length, 3);
  assert.match(a[0], /titulo\/index\.html: el título mide 61/);
  assert.match(a[1], /corta\/index\.html: la descripción mide 69/);
  assert.match(a[2], /larga\/index\.html: la descripción mide 156/);
});
