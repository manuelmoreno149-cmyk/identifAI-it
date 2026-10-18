import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CUADROS, rellenar, cuadros, textoCompartir, urlDelJuego, compartir } from '../js/compartir.js';
import { TEXTOS } from '../js/textos.js';

const EJEMPLO =
  'identifAI-it · Caso nº 12 · Difícil\n3/5 🟩🟩🟥🟩⬛\nRacha: 3\nhttps://usuario.github.io/identifAI-it/';

test('33. cuadros', () => {
  assert.equal(cuadros('AAFAT'), '🟩🟩🟥🟩⬛');
  assert.equal(cuadros('AOFAT'), '🟩⬛🟥🟩⬛');
  assert.deepEqual(CUADROS, { A: '🟩', F: '🟥', T: '⬛', O: '⬛' });
});

test('34. textoCompartir coincide con el ejemplo literal', () => {
  const texto = textoCompartir({
    plantilla: TEXTOS.compartir.plantilla,
    n: 12,
    nombreModo: 'Difícil',
    resultados: 'AAFAT',
    racha: 3,
    url: 'https://usuario.github.io/identifAI-it/'
  });
  assert.equal(texto, EJEMPLO);
  assert.equal(texto.split('\n').length, 4);
  assert.equal(texto.includes('\r'), false);
});

test('35. el texto no revela nada de las pruebas', () => {
  const texto = textoCompartir({
    plantilla: TEXTOS.compartir.plantilla,
    n: 7,
    nombreModo: 'Medio',
    resultados: 'FAAFO',
    racha: 1,
    url: 'https://u.github.io/identifAI-it/'
  });
  const sinNombre = texto.replaceAll('identifAI-it', '');
  assert.equal(/\bIA\b|\bREAL\b|autentica|generada/i.test(sinNombre), false);
  assert.equal(/k3x9q2m7ab|[a-z0-9]{10}\.webp/.test(texto), false);
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
});
