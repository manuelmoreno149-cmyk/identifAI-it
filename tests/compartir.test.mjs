import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CUADROS, rellenar, cuadros, textoCompartir, urlDelJuego, compartir } from '../js/compartir.js';
import { TEXTOS } from '../js/textos.js';

const EJEMPLO =
  'identifAI-it · Case #12\nMode: Bloodhound\n3/5 🟩🟩🟥🟩🟥\nStreak: 3\nhttps://usuario.github.io/identifAI-it/';

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

test('35. el texto no revela nada de las pruebas', () => {
  const texto = textoCompartir({
    plantilla: TEXTOS.compartir.plantilla,
    n: 7,
    nombreModo: 'Normal',
    resultados: 'FAAFF',
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
  assert.equal(
    urlDelJuego({ origin: 'https://u.github.io', pathname: '/identifAI-it/index.html', search: '?prueba=1&dia=3' }),
    'https://u.github.io/identifAI-it/'
  );
});
