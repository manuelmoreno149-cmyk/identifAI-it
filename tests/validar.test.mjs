import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { validar } from '../herramientas/validar.mjs';
import { creditosParaBanco, ARCHIVOS_CREDITOS } from '../herramientas/creditos.mjs';
import { repartirPorMes } from '../herramientas/afirmaciones.mjs';
import { FUENTES } from '../herramientas/temas.mjs';
import { TEXTOS } from '../js/textos.js';
import { IDIOMAS, ofuscar, ofuscarFicha, ofuscarAfirmacion, ofuscarAclaracion, ofuscarBloque, sumarDias } from '../js/diario.js';

// Todas las pruebas usan raíces temporales del SO; nunca el repositorio real.
const HOY = '2026-10-27';
const CERO = () => 0;
const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'">`;
const json = (o) => JSON.stringify(o, null, 2) + '\n';
const MAIN = (v) => `// js\nconst PRUEBAS_ABIERTAS = ${v}; // modo prueba\n`;

// Ids sin 'a' ni 'i' para que no contengan ia/ai/real/fake.
const ALFA = 'bcdefghjklmnopqrstuvwxyz0123456789';
const idDe = (n, i) => Array.from({ length: 10 }, (_, k) => ALFA[(n * 7 + i * 13 + k * 5 + n * k) % ALFA.length]).join('');

const WEBP = await sharp({ create: { width: 1080, height: 1350, channels: 3, background: '#445566' } }).webp({ quality: 80 }).toBuffer();

// Un tema suelto (cadena) vale para los dos idiomas con un sufijo en el español; un objeto se usa tal cual.
const temaDe = (x, n) => (x === undefined ? { en: `Topic ${n}`, es: `Tema ${n}` } : typeof x === 'string' ? { en: x, es: `${x} (es)` } : x);

function diaImagenes(n, { tema, gen = [1, 0, 0, 1, 0] } = {}) {
  const clave = ofuscar(gen, n, CERO);
  const texto = (g, i, idioma) => (g ? `Generated prompt ${n}-${i} (${idioma})` : TEXTOS[idioma].fichas.autentica);
  return {
    n,
    tema: temaDe(tema, n),
    pruebas: gen.map((_, i) => idDe(n, i)),
    clave,
    fichas: Object.fromEntries(IDIOMAS.map((idioma) => [idioma, gen.map((g, i) => ofuscarFicha(texto(g, i, idioma), clave, n, i, CERO, idioma))]))
  };
}

function diaFacts(n, { tema, fakes = [1, 0, 0, 1, 0], claim = (i) => `Claim ${n} number ${i} says something.`, truth = (i) => `Truth ${n} number ${i}.` } = {}) {
  const clave = ofuscar(fakes, n, CERO);
  const es = (t) => `${t} ES`;
  return {
    n,
    tema: temaDe(tema, n),
    clave,
    textos: {
      en: fakes.map((_, i) => ofuscarAfirmacion(claim(i), clave, n, i, CERO, 'en')),
      es: fakes.map((_, i) => ofuscarAfirmacion(es(claim(i)), clave, n, i, CERO, 'es'))
    },
    fichas: {
      en: fakes.map((_, i) => ofuscarAclaracion({ aclaracion: truth(i), detalles: ['A detail.'] }, clave, n, i, CERO, 'en')),
      es: fakes.map((_, i) => ofuscarAclaracion({ aclaracion: es(truth(i)), detalles: ['Un detalle.'] }, clave, n, i, CERO, 'es'))
    }
  };
}

// Un archivo mensual por entrada: [{mes, dias:[...]}].
const mesFacts = (mes, dias) => ({ version: 2, mes, dias });

/**
 * Crea una raíz de proyecto mínima y válida y ejecuta fn({raiz, ruta, ejecutar}).
 * opciones: lanzamiento, nImagenes, nFacts, main, calendario, facts (archivos mensuales), banco, extra(raiz)
 */
async function proyecto(fn, o = {}) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'validar-'));
  try {
    const ruta = (...p) => path.join(raiz, ...p);
    const escribe = (rel, texto) => {
      fs.mkdirSync(path.dirname(ruta(rel)), { recursive: true });
      fs.writeFileSync(ruta(rel), texto);
    };
    const lanzamiento = o.lanzamiento ?? null;
    const imagenes = Array.from({ length: o.nImagenes ?? 2 }, (_, k) => diaImagenes(k + 1, o.imagenes?.(k + 1)));
    const calendario = o.calendario ?? { version: 5, lanzamiento, dias: imagenes };
    escribe('data/calendario.json', json(calendario));
    for (const d of calendario.dias ?? []) for (const id of d.pruebas ?? []) escribe(`casos/${id}.webp`, WEBP);
    const nFacts = o.nFacts ?? 2;
    const diasFacts = Array.from({ length: nFacts }, (_, k) => diaFacts(k + 1, o.dia?.(k + 1)));
    const facts = o.facts ?? repartirPorMes(diasFacts, lanzamiento);
    for (const f of facts) escribe(`data/facts/${f.mes}.json`, json(f));
    escribe('js/main.js', o.main ?? MAIN('false'));
    escribe('.nojekyll', '');
    escribe('.gitignore', 'entrada/\nherramientas/banco.json\nherramientas/banco.anterior.json\nherramientas/lote.json\n');
    escribe('index.html', `<!doctype html>\n<html lang="en"><head>${CSP}</head><body></body></html>\n`);
    for (const f of ['variables', 'base', 'componentes']) escribe(`css/${f}.css`, '');
    escribe('fonts/OFL-oswald.txt', 'licencia');
    escribe('fonts/LICENSE-special-elite.txt', 'licencia');
    for (const idioma of IDIOMAS) escribe(ARCHIVOS_CREDITOS[idioma], creditosParaBanco(o.banco ?? { version: 3, imagenes: [] }, idioma));
    if (o.banco) escribe('herramientas/banco.json', json(o.banco));
    o.extra?.({ raiz, ruta, escribe });
    return await fn({
      raiz,
      ruta,
      escribe,
      ejecutar: (extra = {}) => validar({ raiz, hoyISO: HOY, git: false, ...extra })
    });
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
}

const hay = (lista, re) => lista.some((x) => re.test(x));

test('proyecto mínimo válido sin lanzamiento: código 0, avisos de calendario corto y modo prueba cerrado', async () => {
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.deepEqual(r.errores, []);
    assert.equal(r.codigo, 0);
    assert.ok(hay(r.avisos, /^Images tiene menos de 7 días/));
    assert.ok(hay(r.avisos, /^Fact or Fake tiene menos de 7 días/));
    assert.ok(hay(r.avisos, /banco\.json no encontrado/));
  });
});

test('67 sin bancos: avisos y código 0; con --estricto, código 1', async () => {
  await proyecto(async (p) => {
    assert.equal((await p.ejecutar()).codigo, 0);
    const e = await p.ejecutar({ estricto: true });
    assert.equal(e.codigo, 1);
    assert.deepEqual(e.errores, ['herramientas/banco.json no encontrado (modo --estricto).']);
  });
});

test('66 calendario: versión 3 y 2 con su mensaje, otras versiones y lanzamiento inválido', async () => {
  const cal = (version, extra = {}) => ({ version, lanzamiento: null, dias: [], ...extra });
  await proyecto(async (p) => {
    assert.ok(hay((await p.ejecutar()).errores, /es de la versión 3: conviértelo con npm run lanzamiento\./));
  }, { calendario: cal(3) });
  await proyecto(async (p) => {
    assert.ok(hay((await p.ejecutar()).errores, /es de la versión 2 \(sin fichas\)/));
  }, { calendario: cal(2) });
  await proyecto(async (p) => {
    assert.ok(hay((await p.ejecutar()).errores, /version debe ser 5 \(es 7\)/));
  }, { calendario: cal(7) });
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(r.errores.includes('data/calendario.json es de la versión 4: rehazlo con npm run importar -- --reimportar --confirmar.'));
    assert.equal(r.codigo, 1);
  }, { calendario: cal(4) });
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.equal(r.codigo, 1);
    assert.ok(hay(r.errores, /lanzamiento debe ser null o una fecha ISO válida/));
  }, { calendario: cal(5, { lanzamiento: '2026-02-31' }) });
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /estructura de la versión 5/));
  }, { calendario: { ...cal(5), dias: [{ ...diaImagenes(1), fecha: '2099-01-01' }] } });
  // Un tema o unas fichas en un solo idioma no cumplen la estructura.
  await proyecto(async (p) => {
    assert.ok(hay((await p.ejecutar()).errores, /estructura de la versión 5/));
  }, { calendario: { ...cal(5), dias: [{ ...diaImagenes(1), tema: 'Solo inglés' }] } });
  await proyecto(async (p) => {
    assert.ok(hay((await p.ejecutar()).errores, /estructura de la versión 5/));
  }, { calendario: { ...cal(5), dias: [{ ...diaImagenes(1), fichas: { en: diaImagenes(1).fichas.en } }] } });
});

test('calendario sin archivo: error claro', async () => {
  await proyecto(async (p) => {
    fs.rmSync(p.ruta('data', 'calendario.json'));
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /No existe data\/calendario\.json/));
  });
});

test('Images: una generada mal contada, ids repetidos y tema con palabra prohibida son errores', async () => {
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /Día 1: tiene 0 generadas/));
    assert.ok(hay(r.errores, /Día 2: tiene 5 generadas/));
  }, { imagenes: (n) => ({ gen: n === 1 ? [0, 0, 0, 0, 0] : [1, 1, 1, 1, 1] }) });
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /Día 1: el tema en inglés contiene la palabra prohibida "real"/));
    assert.ok(!r.errores.some((e) => e.includes('Real life')), 'no repite el tema');
  }, { imagenes: (n) => (n === 1 ? { tema: 'Real life' } : {}), nFacts: 0 });
  // Palabras españolas prohibidas en el tema en español.
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /Día 1: el tema en español contiene la palabra prohibida "bulo"/));
    assert.ok(!hay(r.errores, /el tema en inglés/));
  }, { imagenes: (n) => (n === 1 ? { tema: { en: 'Hoaxes', es: 'Un bulo' } } : {}), nFacts: 0 });
});

test('imagen ausente, de otro tamaño o con metadatos', async () => {
  await proyecto(async (p) => {
    const cal = JSON.parse(fs.readFileSync(p.ruta('data', 'calendario.json'), 'utf8'));
    const [a, b, c] = cal.dias[0].pruebas;
    fs.rmSync(p.ruta('casos', `${a}.webp`));
    fs.writeFileSync(p.ruta('casos', `${b}.webp`), await sharp({ create: { width: 100, height: 100, channels: 3, background: '#000' } }).webp().toBuffer());
    fs.writeFileSync(p.ruta('casos', `${c}.webp`), await sharp(WEBP).withMetadata({ exif: { IFD0: { Copyright: 'x' } } }).webp().toBuffer());
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, new RegExp(`falta casos/${a}\\.webp`)));
    assert.ok(hay(r.errores, new RegExp(`${b}\\.webp mide 100 x 100`)));
    assert.ok(hay(r.errores, new RegExp(`${c}\\.webp conserva metadatos`)));
  });
});

test('154 PRUEBAS_ABIERTAS: sin lanzamiento, aviso; con --estricto, error', async () => {
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.equal(r.codigo, 0);
    assert.ok(hay(r.avisos, /PRUEBAS_ABIERTAS = true.*\(aún sin fecha\)/));
    const e = await p.ejecutar({ estricto: true });
    assert.equal(e.codigo, 1);
    assert.ok(hay(e.errores, /El modo prueba sigue abierto/));
  }, { main: MAIN('true') });
});

test('154 PRUEBAS_ABIERTAS: lanzamiento de ayer o de hoy es error; futuro es aviso que cita la fecha', async () => {
  for (const f of [sumarDias(HOY, -1), HOY]) {
    await proyecto(async (p) => {
      const r = await p.ejecutar();
      assert.equal(r.codigo, 1);
      assert.ok(hay(r.errores, /El modo prueba sigue abierto/));
    }, { main: MAIN('true'), lanzamiento: f });
  }
  const futuro = sumarDias(HOY, 30);
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.equal(r.codigo, 0);
    assert.ok(hay(r.avisos, new RegExp(`PRUEBAS_ABIERTAS = true.*\\(${futuro}\\)`)));
  }, { main: MAIN('true'), lanzamiento: futuro });
});

test('PRUEBAS_ABIERTAS: declaración ausente o repetida es error', async () => {
  for (const main of ['// nada\n', `${MAIN('true')}${MAIN('false')}`]) {
    await proyecto(async (p) => {
      assert.ok(hay((await p.ejecutar()).errores, /debe declarar una sola vez const PRUEBAS_ABIERTAS/));
    }, { main });
  }
});

test('154 ningún archivo de js/ ni herramientas/ contiene la fecha fija antigua', async () => {
  const vieja = ['2026', '11', '01'].join('-');
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, new RegExp(`js/main\\.js: contiene la fecha fija ${vieja}`)));
    assert.ok(hay(r.errores, new RegExp(`herramientas/x\\.mjs: contiene la fecha fija`)));
  }, {
    main: `${MAIN('false')}// ${vieja}\n`,
    extra: ({ escribe }) => escribe('herramientas/x.mjs', `export const F = '${vieja}';\n`)
  });
  // El propio código de herramientas/ del repositorio no la contiene.
  const raizReal = path.resolve(import.meta.dirname, '..');
  for (const f of fs.readdirSync(path.join(raizReal, 'herramientas')).filter((x) => /\.m?js$/.test(x))) {
    assert.ok(!fs.readFileSync(path.join(raizReal, 'herramientas', f), 'utf8').includes(vieja), `herramientas/${f}`);
  }
});

test('156 calendario corto por reto: sin fecha cuenta todos los días; con fecha, solo desde hoy', async () => {
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(!hay(r.avisos, /^Images tiene menos de 7/), 'Images tiene 12 días');
    assert.ok(hay(r.avisos, /^Fact or Fake tiene menos de 7 días de calendario \(2\) y aún no hay fecha/));
  }, { nImagenes: 12, nFacts: 2 });
  await proyecto(async (p) => {
    // lanzamiento hace 9 días: los días 10 a 12 son de hoy en adelante (3).
    const r = await p.ejecutar();
    assert.ok(hay(r.avisos, /^Quedan menos de 7 días de calendario de Images a partir de hoy \(3\)/));
  }, { nImagenes: 12, nFacts: 0, lanzamiento: sumarDias(HOY, -9) });
});

test('aviso si los retos tienen distinto número de días', async () => {
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(r.avisos.includes('Fact or Fake tiene 1 día e Images 3: los días 2 y 3 solo tendrán Images.'), r.avisos.join('\n'));
  }, { nImagenes: 3, nFacts: 1 });
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(r.avisos.includes('Images tiene 1 día y Fact or Fake 2: el día 2 solo tendrá Fact or Fake.'), r.avisos.join('\n'));
  }, { nImagenes: 1, nFacts: 2 });
});

test('Fact or Fake: sin carpeta data/facts o vacía pasa con aviso de calendario corto', async () => {
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.equal(r.codigo, 0);
    assert.ok(hay(r.avisos, /^Fact or Fake tiene menos de 7 días/));
  }, { nFacts: 0 });
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.equal(r.codigo, 0);
  }, { nFacts: 0, extra: ({ ruta }) => fs.mkdirSync(ruta('data', 'facts'), { recursive: true }) });
});

test('216 data/titulares/ o data/titulares.json presentes, y otras entradas en data/facts/, son errores', async () => {
  await proyecto(async (p) => {
    assert.ok(hay((await p.ejecutar()).errores, /Headlines ya no existe: borra data\/titulares\//));
  }, { extra: ({ ruta }) => fs.mkdirSync(ruta('data', 'titulares'), { recursive: true }) });
  await proyecto(async (p) => {
    assert.ok(hay((await p.ejecutar()).errores, /Headlines ya no existe/));
  }, { extra: ({ escribe }) => escribe('data/titulares.json', '{}') });
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /2000-01\.json\.bak: el nombre debe ser AAAA-MM\.json/));
  }, { extra: ({ escribe }) => escribe('data/facts/2000-01.json.bak', '{}') });
});

test('216 mes distinto del nombre, día en mes equivocado y huecos entre meses son errores', async () => {
  const dias = [diaFacts(1), diaFacts(2)];
  await proyecto(async (p) => {
    assert.ok(hay((await p.ejecutar()).errores, /2000-01\.json: no tiene la estructura de la versión 2 o su mes no coincide/));
  }, { nFacts: 0, extra: ({ escribe }) => escribe('data/facts/2000-01.json', json(mesFacts('2000-02', dias))) });
  await proyecto(async (p) => {
    // lanzamiento 2099-01-31: el día 2 corresponde a 2099-02 pero está en 2099-01.
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /El día 2 de Fact or Fake está en 2099-01\.json y le corresponde 2099-02/));
  }, { lanzamiento: '2099-01-31', facts: [mesFacts('2099-01', dias)] });
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /Faltan días de Fact or Fake: tras el día 1 viene el 3/));
  }, { lanzamiento: '2099-01-31', facts: [mesFacts('2099-01', [diaFacts(1)]), mesFacts('2099-02', [diaFacts(3)])] });
});

test('202 un bloque cambiado por otra cadena de la misma longitud no se descifra', async () => {
  const d = diaFacts(1);
  const roto = { ...d, textos: { en: [...d.textos.en], es: [...d.textos.es] }, fichas: { en: [...d.fichas.en], es: [...d.fichas.es] } };
  roto.textos.en[2] = 'B'.repeat(683) + '=';
  roto.fichas.es[4] = ofuscarBloque(new Uint8Array([0xff, 0xfe, 0x0a, 0x0a]), 'otra|semilla', 512, CERO);
  // Un bloque español cifrado con la semilla del inglés tampoco se descifra (semillas por idioma).
  roto.textos.es[0] = d.textos.en[0];
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.equal(r.codigo, 1);
    assert.ok(hay(r.errores, /La afirmación 3 del día 1 de Fact or Fake \(inglés\) no se puede descifrar\./));
    assert.ok(hay(r.errores, /La aclaración 5 del día 1 de Fact or Fake \(español\) no se puede descifrar\./));
    assert.ok(hay(r.errores, /La afirmación 1 del día 1 de Fact or Fake \(español\) no se puede descifrar\./));
    assert.ok(!hay(r.errores, /La afirmación 3 del día 1 de Fact or Fake \(español\)/));
  }, { facts: [mesFacts('2000-01', [roto, diaFacts(2)])] });
});

test('202 afirmaciones repetidas, también entre dos meses, son errores que no muestran el texto', async () => {
  const igual = (i) => `Same claim for every day ${i}.`;
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /Afirmación repetida en Fact or Fake \(inglés\): la 1 del día 2 es igual a la 1 del día 1\./));
    assert.ok(hay(r.errores, /Afirmación repetida en Fact or Fake \(español\): la 1 del día 2 es igual a la 1 del día 1\./));
    assert.ok(!r.errores.some((e) => e.includes('Same claim')));
  }, { dia: () => ({ claim: igual }) });
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /la 3 del día 2 es igual a la 3 del día 1/));
    assert.equal(r.errores.filter((e) => /repetida/.test(e)).length, 10, 'cinco por idioma');
  }, {
    lanzamiento: '2099-01-31',
    facts: [mesFacts('2099-01', [diaFacts(1, { claim: igual })]), mesFacts('2099-02', [diaFacts(2, { claim: igual })])]
  });
  // Mayúsculas, espacios y punto final no evitan el repetido.
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    // El punto final cae antes del sufijo del español, así que solo el inglés se detecta como repetido.
    assert.equal(r.errores.filter((e) => /repetida/.test(e)).length, 5);
  }, { dia: (n) => ({ claim: (i) => (n === 1 ? `The sun is big ${i}.` : `  the  SUN is big ${i}`) }) });
  // Los repetidos se miran por idioma: solo el español de dos días coincide, y solo se avisa del español.
  const e1 = diaFacts(1);
  const e2 = diaFacts(2);
  e2.textos.es[0] = ofuscarAfirmacion('Claim 1 number 0 says something. ES', e2.clave, 2, 0, CERO, 'es');
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /Afirmación repetida en Fact or Fake \(español\): la 1 del día 2 es igual a la 1 del día 1\./));
    assert.ok(!hay(r.errores, /repetida en Fact or Fake \(inglés\)/));
  }, { facts: [mesFacts('2000-01', [e1, e2])] });
});

test('202 tema de Fact or Fake distinto del de Images, o con palabra prohibida, es error', async () => {
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(r.errores.includes('El tema en inglés del día 2 no coincide entre Images y Fact or Fake.'));
    assert.ok(r.errores.includes('El tema en español del día 2 no coincide entre Images y Fact or Fake.'));
    assert.equal(r.errores.filter((e) => /no coincide entre Images/.test(e)).length, 2);
  }, { dia: (n) => (n === 2 ? { tema: 'Otro' } : {}) });
  // Solo el español difiere.
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.deepEqual(r.errores, ['El tema en español del día 2 no coincide entre Images y Fact or Fake.']);
  }, { dia: (n) => (n === 2 ? { tema: { en: 'Topic 2', es: 'Otro tema' } } : {}) });
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /Día 1 de Fact or Fake: el tema en inglés contiene la palabra prohibida "fake"/));
  }, { dia: (n) => (n === 1 ? { tema: 'Fake news' } : {}), imagenes: (n) => (n === 1 ? { tema: 'Fake news' } : {}) });
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /Día 1 de Fact or Fake: el tema en español contiene la palabra prohibida "dato"/));
  }, { dia: (n) => (n === 1 ? { tema: { en: 'Facts', es: 'El dato' } } : {}), imagenes: (n) => (n === 1 ? { tema: { en: 'Facts', es: 'El dato' } } : {}) });
  // Palabra completa: "Airplanes", "Reality" y "Facts" no son palabras prohibidas.
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.deepEqual(r.errores, []);
  }, { dia: () => ({ tema: 'Airplanes' }), imagenes: () => ({ tema: 'Airplanes' }) });
});

test('Fact or Fake: clave con 0 o 5 falsas es error', async () => {
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /Día 1 de Fact or Fake: tiene 0 falsas; debe tener entre 1 y 4\./));
    assert.ok(hay(r.errores, /Día 2 de Fact or Fake: tiene 5 falsas; debe tener entre 1 y 4\./));
  }, { dia: (n) => ({ fakes: n === 1 ? [0, 0, 0, 0, 0] : [1, 1, 1, 1, 1] }) });
});

test('Fact or Fake: afirmación de más de 140 caracteres y aclaración o detalle fuera de límite son errores', async () => {
  const larga = (i) => `L${i} ` + 'x'.repeat(145);
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /La afirmación 1 del día 1 de Fact or Fake \(inglés\) supera 140 caracteres/));
    assert.ok(hay(r.errores, /La aclaración 1 del día 1 de Fact or Fake \(inglés\) supera 160 caracteres/));
    assert.ok(!r.errores.some((e) => e.includes('xxxx')));
  }, { dia: (n) => (n === 1 ? { claim: larga, truth: (i) => `T${i} ` + 'y'.repeat(170) } : {}) });
  const d = diaFacts(1);
  d.fichas.es[0] = ofuscarAclaracion({ aclaracion: 'Verdad.', detalles: ['d'.repeat(85)] }, d.clave, 1, 0, CERO, 'es');
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /La aclaración 1 del día 1 de Fact or Fake \(español\) tiene un detalle de más de 80 caracteres/));
  }, { facts: [mesFacts('2000-01', [d, diaFacts(2)])] });
});

test('240 longitudes: aviso, nunca error, tampoco con --estricto', async () => {
  const dia = (n) => {
    const fakes = [1, 0, 0, 1, 0];
    return {
      fakes,
      claim: (i) => (fakes[i] ? `Fake ${n}${i} ` + 'w'.repeat(60) + ' ends here.' : `Fact ${n}${i} ` + 'w'.repeat(30) + ' ends here.'),
      truth: (i) => `Truth ${n} number ${i}.`
    };
  };
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.equal(r.codigo, 0);
    assert.ok(hay(r.avisos, /^día 1 \(inglés\): las afirmaciones falsas miden de media un \d+ % más que las verdaderas/));
    assert.ok(hay(r.avisos, /^día 1 \(español\): las afirmaciones falsas miden de media un \d+ % más que las verdaderas/));
    assert.ok(hay(r.avisos, /^en todo Fact or Fake \(inglés\), las afirmaciones falsas/));
    assert.ok(hay(r.avisos, /^en todo Fact or Fake \(español\), las afirmaciones falsas/));
    const e = await p.ejecutar({ estricto: true });
    assert.ok(!e.errores.some((x) => /miden de media/.test(x)));
    assert.deepEqual(e.errores, ['herramientas/banco.json no encontrado (modo --estricto).']);
  }, { dia });
});

test('mezcla desequilibrada de Fact or Fake: aviso con "falsas" y "verdaderas"', async () => {
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.avisos, /^Fact or Fake: 3 días seguidos \(del 1 al 3\) con 4 falsas cada uno/));
    assert.ok(hay(r.avisos, /^Fact or Fake: \d+ % de las pruebas son falsas/));
    assert.ok(!r.avisos.some((a) => /^Fact or Fake:.*generadas/.test(a)));
  }, { nImagenes: 3, nFacts: 3, dia: () => ({ fakes: [1, 1, 1, 1, 0] }) });
});

test('ningún mensaje de validar muestra afirmaciones, aclaraciones ni detalles', async () => {
  await proyecto(async (p) => {
    const r = await p.ejecutar({ estricto: true });
    const todo = [...r.errores, ...r.avisos, ...r.informe].join('\n');
    assert.ok(!/Claim \d number|Truth \d number|A detail/.test(todo));
  }, { dia: () => ({ fakes: [0, 0, 0, 0, 0] }), main: MAIN('true') });
});

test('validar no lee entrada/: un entrada/ ilegible o con datos.txt no cambia el resultado', async () => {
  await proyecto(async (p) => {
    const antes = await p.ejecutar();
    p.escribe('entrada/temas/01-tema-1/datos.txt', 'cualquier cosa \u0000 libre');
    p.escribe('entrada/temas/01-tema-1/datos.original.txt', 'otra');
    p.escribe('entrada/temas/01-tema-1/facts.en.txt', 'answer: nada');
    const despues = await p.ejecutar();
    assert.deepEqual(despues.errores, antes.errores);
    assert.deepEqual(despues.avisos, antes.avisos);
    assert.ok(fs.existsSync(p.ruta('entrada/temas/01-tema-1/datos.txt')));
  });
});

test('banco: versión 2 con su mensaje, versión 3 válida pasa y sin comprobar fecha', async () => {
  const banco3 = (dias) => ({
    version: 3,
    imagenes: dias.flatMap((d) =>
      d.pruebas.map((id, i) => {
        const gen = i === 0 || i === 3;
        const f = FUENTES.find((x) => x.tipo === (gen ? 'generada' : 'autentica'));
        return {
          id, tipo: gen ? 'generada' : 'autentica', dia: d.n, tema: d.tema.en, fuente: f.fuente, licencia: f.licencia,
          original: `x/${id}`, dhash: (BigInt(d.n * 5 + i) * 0x9e3779b97f4a7c15n % (1n << 64n)).toString(16).padStart(16, '0'),
          recorte: 'atencion', alta: '2026-10-01'
        };
      })
    )
  });
  const base = [diaImagenes(1), diaImagenes(2)];
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.deepEqual(r.errores, []);
    assert.equal(r.codigo, 0);
    assert.equal((await p.ejecutar({ estricto: true })).codigo, 0);
  }, { banco: banco3(base) });
  await proyecto(async (p) => {
    assert.ok(hay((await p.ejecutar()).errores, /banco\.json es de la versión 2: conviértelo con npm run lanzamiento\./));
  }, { banco: { version: 2, imagenes: [] } });
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /Banco: el día 1 tiene 4 imágenes; debe tener 5\./));
  }, { banco: (() => { const b = banco3(base); b.imagenes.shift(); return b; })() });
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /Banco: .* es "autentica" pero la clave del día 1 dice "generada"/));
  }, { banco: (() => { const b = banco3(base); b.imagenes[0].tipo = 'autentica'; return b; })() });
});

test('publicado: nombres con palabras prohibidas en lo publicado', async () => {
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /data\/facts\/fake\.json: el nombre de archivo contiene "fake"/) || hay(r.errores, /fake/));
    assert.ok(hay(r.errores, /index\.html: id="real-id" contiene la palabra prohibida "real"/));
  }, {
    extra: ({ escribe }) => {
      escribe('data/facts/fake.json', '{}');
      escribe('index.html', `<!doctype html>\n<html lang="en"><head>${CSP}</head><body><div id="real-id"></div></body></html>\n`);
    }
  });
});

test('git: banco.json rastreado, entrada/ rastreada o .txt rastreado son errores', async () => {
  await proyecto(async (p) => {
    const git = (...a) => execFileSync('git', a, { cwd: p.raiz, stdio: 'pipe' });
    git('init', '-q');
    p.escribe('herramientas/banco.json', '{}');
    p.escribe('entrada/uno.jpg', 'x');
    p.escribe('notas.txt', 'x');
    git('add', '-f', 'herramientas/banco.json', 'entrada/uno.jpg', 'notas.txt');
    const r = await p.ejecutar({ git: true });
    assert.ok(hay(r.errores, /herramientas\/banco\.json está rastreado por git/));
    assert.ok(hay(r.errores, /Hay archivos de entrada\/ rastreados por git/));
    assert.ok(hay(r.errores, /archivo\(s\) \.txt rastreados por git/));
  });
});

test('.gitignore sin los archivos privados es error', async () => {
  await proyecto(async (p) => {
    p.escribe('.gitignore', 'entrada/\n');
    const r = await p.ejecutar();
    for (const f of ['banco.json', 'banco.anterior.json', 'lote.json']) {
      assert.ok(hay(r.errores, new RegExp(`\\.gitignore no incluye herramientas/${f.replace('.', '\\.')}`)));
    }
  });
});

test('aviso (no error) si una imagen pesa más de 1,5 veces la mediana de su día', async () => {
  const pesada = await sharp({ create: { width: 1080, height: 1350, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 60 } } })
    .webp({ quality: 95 })
    .toBuffer();
  assert.ok(pesada.length > 1.5 * WEBP.length);
  await proyecto(
    async (p) => {
      const r = await p.ejecutar();
      assert.deepEqual(r.errores, []);
      assert.equal(r.codigo, 0);
      const avisos = r.avisos.filter((a) => /más de 1,5 veces la mediana/.test(a));
      assert.equal(avisos.length, 1);
      assert.match(avisos[0], /^Día 1: /);
      assert.ok(r.avisos.some((a) => /^Día 1: el peso medio .* difiere/.test(a)));
    },
    { extra: ({ escribe }) => escribe(`casos/${idDe(1, 0)}.webp`, pesada) }
  );
});

test('sin imágenes desproporcionadas no hay avisos de peso por imagen ni por día', async () => {
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(!hay(r.avisos, /mediana de su día/));
    assert.ok(!hay(r.avisos, /el peso medio de las imágenes de un tipo difiere/));
  });
});

test('287 fichas de Images en cada idioma: las auténticas son exactamente la del idioma y las generadas no son ninguna', async () => {
  const cambiar = (dia, idioma, i, texto) => ({
    ...dia,
    fichas: { ...dia.fichas, [idioma]: dia.fichas[idioma].map((f, k) => (k === i ? ofuscarFicha(texto, dia.clave, dia.n, i, CERO, idioma) : f)) }
  });
  const cal = (dias) => ({ version: 5, lanzamiento: null, dias });
  const d1 = diaImagenes(1); // generadas: 0 y 3; auténticas: 1, 2 y 4
  // Una auténtica con la ficha del otro idioma, y una generada con la ficha auténtica del otro idioma.
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(r.errores.includes('El día 1 tiene fichas (español) que no cuadran con su clave.'), r.errores.join('\n'));
    assert.ok(!hay(r.errores, /\(inglés\)/));
  }, { calendario: cal([cambiar(d1, 'es', 1, TEXTOS.en.fichas.autentica), diaImagenes(2)]) });
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(r.errores.includes('El día 1 tiene fichas (inglés) que no cuadran con su clave.'), r.errores.join('\n'));
  }, { calendario: cal([cambiar(d1, 'en', 0, TEXTOS.es.fichas.autentica), diaImagenes(2)]) });
  // Una generada con la ficha de «Real photograph» en su propio idioma.
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(r.errores.includes('El día 1 tiene fichas (inglés) que no cuadran con su clave.'));
  }, { calendario: cal([cambiar(d1, 'en', 3, TEXTOS.en.fichas.autentica), diaImagenes(2)]) });
  // Una ficha que no se descifra con su semilla (la del otro idioma): solo nombra día, número e idioma.
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    const mala = { ...d1, fichas: { ...d1.fichas, es: [d1.fichas.en[0], ...d1.fichas.es.slice(1)] } };
    assert.ok(mala.fichas.es[0] === d1.fichas.en[0]);
    assert.ok(r.errores.includes('La ficha 1 del día 1 (español) no se puede descifrar.'), r.errores.join('\n'));
    assert.ok(!r.errores.some((e) => e.includes('Generated prompt')));
  }, { calendario: cal([{ ...d1, fichas: { ...d1.fichas, es: [d1.fichas.en[0], ...d1.fichas.es.slice(1)] } }, diaImagenes(2)]) });
});

test('287 creditos.html (lang en) y creditos.es.html (lang es) existen y se comprueban por separado', async () => {
  await proyecto(async (p) => {
    fs.rmSync(p.ruta('creditos.es.html'));
    assert.ok(hay((await p.ejecutar()).errores, /Falta creditos\.es\.html en la raíz\./));
  });
  await proyecto(async (p) => {
    const h = fs.readFileSync(p.ruta('creditos.es.html'), 'utf8').replace('<html lang="es">', '<html lang="en">');
    fs.writeFileSync(p.ruta('creditos.es.html'), h);
    assert.ok(hay((await p.ejecutar()).errores, /creditos\.es\.html: falta <html lang="es">\./));
  });
  await proyecto(async (p) => {
    const h = fs.readFileSync(p.ruta('creditos.html'), 'utf8').replace('<html lang="en">', '<html lang="es">');
    fs.writeFileSync(p.ruta('creditos.html'), h);
    assert.ok(hay((await p.ejecutar()).errores, /creditos\.html: falta <html lang="en">\./));
  });
  // Con banco, cada página debe ser exactamente la que generaría creditos.mjs en su idioma.
  const banco = { version: 3, imagenes: [] };
  await proyecto(async (p) => {
    p.escribe('creditos.es.html', creditosParaBanco(banco, 'en'));
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /creditos\.es\.html: falta <html lang="es">/));
  });
});

test('4.22 index.html y los créditos: palabras españolas prohibidas y clases dato* son errores', async () => {
  const pagina = (cuerpo) => `<!doctype html>\n<html lang="en"><head>${CSP}</head><body>${cuerpo}</body></html>\n`;
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(hay(r.errores, /index\.html: class="dato-valor" contiene la palabra prohibida "dato"/));
    assert.ok(hay(r.errores, /index\.html: class="dato-valor" contiene una clase que empieza por dato\./));
    assert.ok(hay(r.errores, /index\.html: id="bulo-uno" contiene la palabra prohibida "bulo"/));
    assert.ok(hay(r.errores, /index\.html: data-x="falso" contiene la palabra prohibida "falso"/));
    assert.ok(hay(r.errores, /index\.html: alt="verdadera foto" contiene la palabra prohibida "verdadera"/));
  }, {
    extra: ({ escribe }) => escribe('index.html', pagina('<p class="dato-valor" id="bulo-uno" data-x="falso"></p><img alt="verdadera foto" src="creditos.html">'))
  });
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.deepEqual(r.errores, []);
  }, { extra: ({ escribe }) => escribe('index.html', pagina('<p class="tabla-fuentes" id="bulos"></p>')) });
  await proyecto(async (p) => {
    const h = fs.readFileSync(p.ruta('creditos.es.html'), 'utf8').replace('id="creditos"', 'id="creditos-dato"');
    fs.writeFileSync(p.ruta('creditos.es.html'), h);
    assert.ok(hay((await p.ejecutar()).errores, /creditos\.es\.html: id="creditos-dato" contiene la palabra prohibida "dato"/));
  });
});

test('4.22 distinto número de detalles entre idiomas es aviso; todo lo demás sigue igual', async () => {
  const d = diaFacts(1);
  d.fichas.es[2] = ofuscarAclaracion({ aclaracion: 'Verdad.', detalles: [] }, d.clave, 1, 2, CERO, 'es');
  await proyecto(async (p) => {
    const r = await p.ejecutar({ estricto: true });
    assert.ok(r.avisos.includes('La prueba 3 del día 1 de Fact or Fake tiene distinto número de detalles en inglés y en español.'));
    assert.ok(!hay(r.errores, /detalles/));
  }, { facts: [mesFacts('2000-01', [d, diaFacts(2)])] });
});

test('4.22 archivos de Fact or Fake de la versión 1 son un error con el mensaje de rehacerlos', async () => {
  await proyecto(async (p) => {
    const r = await p.ejecutar();
    assert.ok(r.errores.includes('data/facts/2000-01.json es de la versión 1 (solo inglés): rehazlo con npm run afirmaciones -- --reimportar --confirmar --revisado.'), r.errores.join('\n'));
    assert.equal(r.codigo, 1);
  }, { facts: [{ version: 1, mes: '2000-01', dias: [{ ...diaFacts(1), tema: 'Topic 1', textos: diaFacts(1).textos.en, fichas: diaFacts(1).fichas.en }] }] });
});
