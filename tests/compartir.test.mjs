import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CUADROS, rellenar, cuadros, textoCompartir, urlDelJuego, compartir } from '../js/compartir.js';
import { TEXTOS } from '../js/textos.js';

const EJEMPLO_AFIRMACIONES =
  'identifAI-it Fact or Fake #12\n4/5 🟥🟩🟩🟩🟩\nStreak: 5\nhttps://usuario.github.io/identifAI-it/';
const EJEMPLO =
  'identifAI-it Images #12\nMode: Bloodhound\n3/5 🟩🟩🟥🟩🟥\nStreak: 3\nhttps://usuario.github.io/identifAI-it/';

test('33. cuadros', () => {
  assert.equal(cuadros('AAFAF'), '🟩🟩🟥🟩🟥');
  assert.equal(cuadros('A-FAF'), '🟩🟥🟥🟩🟥');
  assert.deepEqual(CUADROS, { A: '🟩', F: '🟥' });
  assert.equal(cuadros('AAFAF').includes('⬛'), false);
});

test('34. textoCompartir coincide con el ejemplo literal', () => {
  const texto = textoCompartir({
    plantilla: TEXTOS.compartir.plantilla,
    n: 12,
    nombreModo: 'Bloodhound',
    resultados: 'AAFAF',
    racha: 3,
    url: 'https://usuario.github.io/identifAI-it/'
  });
  assert.equal(texto, EJEMPLO);
  assert.equal(texto.split('\n').length, 5);
  assert.equal(texto.includes('\r'), false);
});

test('35. el texto no revela nada de las pruebas (excepciones: identifAI-it y "Fact or Fake" en la primera línea)', () => {
  const casos = [
    [TEXTOS.compartir.plantilla, 'Normal'],
    [TEXTOS.compartir.plantilla_afirmaciones, undefined]
  ];
  for (const [plantilla, nombreModo] of casos) {
    const texto = textoCompartir({
      plantilla, n: 7, nombreModo, resultados: 'FAAFF', racha: 1, url: 'https://u.github.io/identifAI-it/'
    });
    const [primera, ...resto] = texto.split('\n');
    const sinNombre = [primera.replace('identifAI-it', '').replace('Fact or Fake', ''), ...resto].join('\n');
    assert.equal(/IA|AI|REAL|FACT|autentica|generada|⬛/i.test(sinNombre), false, texto);
    assert.equal(/fake/i.test(sinNombre), false, texto);
    assert.equal(/k3x9q2m7ab|[a-z0-9]{10}\.webp/.test(texto), false);
  }
  // "Fake" solo aparece en la primera línea del texto de Fact or Fake
  const t = textoCompartir({
    plantilla: TEXTOS.compartir.plantilla_afirmaciones, n: 7, resultados: 'FAAFF', racha: 1, url: 'https://u.github.io/identifAI-it/'
  });
  assert.equal(t.split('\n')[0].includes('Fact or Fake'), true);
  assert.equal(t.split('\n').slice(1).join('\n').includes('Fake'), false);
});

test('177. textoCompartir de Fact or Fake coincide con el ejemplo literal, sin modo', () => {
  const texto = textoCompartir({
    plantilla: TEXTOS.compartir.plantilla_afirmaciones,
    n: 12,
    resultados: 'FAAAA',
    racha: 5,
    url: 'https://usuario.github.io/identifAI-it/'
  });
  assert.equal(texto, EJEMPLO_AFIRMACIONES);
  assert.equal(texto.split('\n').length, 4);
  assert.equal(texto.includes('Mode'), false);
  assert.equal(texto.includes('undefined'), false);
  // un nombreModo sobrante no aparece en la plantilla sin {modo}
  assert.equal(
    textoCompartir({ plantilla: TEXTOS.compartir.plantilla_afirmaciones, n: 12, nombreModo: 'Normal', resultados: 'FAAAA', racha: 5, url: 'https://usuario.github.io/identifAI-it/' }),
    EJEMPLO_AFIRMACIONES
  );
});

test('179. el texto compartido no revela afirmaciones, aclaraciones, detalles, prompts, temas ni mensajes (los dos retos)', () => {
  const conocidos = [
    'The Eiffel Tower grows taller in summer.', 'Metal expands when heated, so the tower gains a few inches.',
    'Heat makes iron expand', 'a cat astronaut in watercolor, ultra detailed', 'Space cats',
    TEXTOS.fichas.autentica, TEXTOS.fichas.sin_prompt, ...TEXTOS.final.mensajes, ...TEXTOS.final.mensajes_afirmaciones
  ];
  for (const [plantilla, nombreModo] of [
    [TEXTOS.compartir.plantilla, 'Investigator'],
    [TEXTOS.compartir.plantilla_afirmaciones, undefined]
  ]) {
    for (const resultados of ['AAAAA', 'FFFFF', 'FAAFA']) {
      const texto = textoCompartir({ plantilla, n: 3, nombreModo, resultados, racha: 2, url: 'https://u.github.io/identifAI-it/' });
      const [primera, ...resto] = texto.split('\n');
      const sinNombre = [primera.replace('identifAI-it', '').replace('Fact or Fake', ''), ...resto].join('\n');
      assert.equal(/AI|IA|REAL|FACT|fake|autentica|generada|⬛/i.test(sinNombre), false, texto);
      for (const c of conocidos) assert.equal(texto.includes(c), false, c);
      assert.equal(texto.includes('{'), false);
    }
  }
});

test('rellenar deja los marcadores sin valor', () => {
  assert.equal(rellenar('a {x} b {y}', { x: 1 }), 'a 1 b {y}');
  assert.equal(rellenar('{n}', { n: 0 }), '0');
});

test('36. compartir', async () => {
  const abortar = () => {
    const e = new Error('cancelado');
    e.name = 'AbortError';
    return Promise.reject(e);
  };
  assert.equal(await compartir('t', { share: async () => {} }), 'compartido');
  assert.equal(await compartir('t', { share: abortar }), 'cancelado');
  let copiado = null;
  assert.equal(
    await compartir('hola', { clipboard: { writeText: async (t) => void (copiado = t) } }),
    'copiado'
  );
  assert.equal(copiado, 'hola');
  assert.equal(await compartir('t', {}), 'manual');
  assert.equal(await compartir('t', undefined), 'manual');
  // share falla con otro error: se prueba el portapapeles
  assert.equal(
    await compartir('t', {
      share: () => Promise.reject(new Error('x')),
      clipboard: { writeText: async () => {} }
    }),
    'copiado'
  );
  // portapapeles que falla: manual
  assert.equal(
    await compartir('t', {
      clipboard: {
        writeText: () => Promise.reject(new Error('x'))
      }
    }),
    'manual'
  );
  // share que lanza síncronamente
  assert.equal(
    await compartir('t', {
      share: () => {
        throw new Error('x');
      }
    }),
    'manual'
  );
});

test('37. urlDelJuego', () => {
  assert.equal(
    urlDelJuego({ origin: 'https://u.github.io', pathname: '/identifAI-it/index.html' }),
    'https://u.github.io/identifAI-it/'
  );
  assert.equal(
    urlDelJuego({ origin: 'https://u.github.io', pathname: '/identifAI-it/' }),
    'https://u.github.io/identifAI-it/'
  );
  assert.equal(urlDelJuego({ origin: 'http://localhost:3000', pathname: '/' }), 'http://localhost:3000/');
  assert.equal(
    urlDelJuego({ origin: 'https://u.github.io', pathname: '/identifAI-it/index.html', search: '?prueba=1&dia=3' }),
    'https://u.github.io/identifAI-it/'
  );
});
