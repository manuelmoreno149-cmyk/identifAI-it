import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CUADROS, rellenar, cuadros, textoCompartir, urlDelJuego, compartir } from '../js/compartir.js';
import { TEXTOS } from '../js/textos.js';
import { IDIOMAS } from '../js/diario.js';

const URL_JUEGO = 'https://identifaiit.com/';

// Ejemplos literales de la sección 7 (4c-idiomas.md, 4.24).
const EJEMPLOS = {
  en: {
    imagenes:
      'identifAI-it Images #12\nMode: Bloodhound\n3/5 🟩🟩🟥🟩🟥\nStreak: 3\nhttps://identifaiit.com/',
    afirmaciones:
      'identifAI-it Fact or Fake #12\n4/5 🟥🟩🟩🟩🟩\nStreak: 5\nhttps://identifaiit.com/'
  },
  es: {
    imagenes:
      'identifAI-it Imágenes #12\nModo: Sabueso\n3/5 🟩🟩🟥🟩🟥\nRacha: 3\nhttps://identifaiit.com/',
    afirmaciones:
      'identifAI-it ¿Dato o Bulo? #12\n4/5 🟥🟩🟩🟩🟩\nRacha: 5\nhttps://identifaiit.com/'
  }
};

// Nombre del reto en la primera línea, que es lo único que puede llevar la palabra "Fake", "Dato" o "Bulo".
const NOMBRE_RETO = { en: 'Fact or Fake', es: '¿Dato o Bulo?' };

// Quita de la primera línea "identifAI-it" y el nombre del reto; devuelve lo que queda del texto.
function sinNombre(texto, idioma) {
  const [primera, ...resto] = texto.split('\n');
  return [primera.replace('identifAI-it', '').replace(NOMBRE_RETO[idioma], ''), ...resto].join('\n');
}

test('33. cuadros', () => {
  assert.equal(cuadros('AAFAF'), '🟩🟩🟥🟩🟥');
  assert.equal(cuadros('A-FAF'), '🟩🟥🟥🟩🟥');
  assert.deepEqual(CUADROS, { A: '🟩', F: '🟥' });
  assert.equal(cuadros('AAFAF').includes('⬛'), false);
});

test('34. textoCompartir de Images coincide con el ejemplo literal, en inglés y en español', () => {
  for (const idioma of IDIOMAS) {
    const T = TEXTOS[idioma];
    const texto = textoCompartir({
      plantilla: T.compartir.plantilla,
      n: 12,
      nombreModo: T.portada.modo_perro,
      resultados: 'AAFAF',
      racha: 3,
      url: URL_JUEGO
    });
    assert.equal(texto, EJEMPLOS[idioma].imagenes, idioma);
    assert.equal(texto.split('\n').length, 5);
    assert.equal(texto.includes('\r'), false);
    assert.equal(texto.includes('{'), false);
  }
});

test('177. textoCompartir de Fact or Fake coincide con el ejemplo literal, sin modo, en los dos idiomas', () => {
  for (const idioma of IDIOMAS) {
    const T = TEXTOS[idioma];
    const base = { plantilla: T.compartir.plantilla_afirmaciones, n: 12, resultados: 'FAAAA', racha: 5, url: URL_JUEGO };
    const texto = textoCompartir(base);
    assert.equal(texto, EJEMPLOS[idioma].afirmaciones, idioma);
    assert.equal(texto.split('\n').length, 4);
    assert.equal(texto.includes('Mode'), false);
    assert.equal(texto.includes('Modo'), false);
    assert.equal(texto.includes('undefined'), false);
    // un nombreModo sobrante no aparece en la plantilla sin {modo}
    assert.equal(textoCompartir({ ...base, nombreModo: T.portada.modo_normal }), EJEMPLOS[idioma].afirmaciones);
  }
});

test('35. el texto no revela nada de las pruebas, en los dos idiomas (excepción: identifAI-it y el nombre del reto en la primera línea)', () => {
  for (const idioma of IDIOMAS) {
    const T = TEXTOS[idioma];
    const casos = [
      [T.compartir.plantilla, T.portada.modo_normal],
      [T.compartir.plantilla_afirmaciones, undefined]
    ];
    for (const [plantilla, nombreModo] of casos) {
      for (const resultados of ['FAAFF', 'AAAAA', 'FFFFF']) {
        const texto = textoCompartir({ plantilla, n: 7, nombreModo, resultados, racha: 1, url: 'https://u.github.io/identifAI-it/' });
        const resto = sinNombre(texto, idioma);
        assert.equal(/\bIA\b|\bAI\b|\bREAL\b|\bFACT\b|\bDATO\b|autentica|generada|⬛/i.test(resto), false, texto);
        assert.equal(/fake|bulo|dato|falso|falsa/i.test(resto), false, texto);
        assert.equal(/k3x9q2m7ab|[a-z0-9]{10}\.webp/.test(texto), false);
      }
    }
  }
  // "Fake" / "Bulo" y "Dato" solo aparecen en la primera línea del texto de Fact or Fake.
  for (const idioma of IDIOMAS) {
    const t = textoCompartir({
      plantilla: TEXTOS[idioma].compartir.plantilla_afirmaciones, n: 7, resultados: 'FAAFF', racha: 1, url: 'https://u.github.io/identifAI-it/'
    });
    const [primera, ...resto] = t.split('\n');
    assert.equal(primera.includes(NOMBRE_RETO[idioma]), true);
    assert.equal(/fake|bulo|dato/i.test(resto.join('\n')), false);
  }
});

test('179. el texto compartido no revela afirmaciones, aclaraciones, detalles, prompts, temas ni mensajes (los dos retos y los dos idiomas)', () => {
  for (const idioma of IDIOMAS) {
    const T = TEXTOS[idioma];
    const conocidos = [
      'The Eiffel Tower grows taller in summer.', 'La torre Eiffel crece en verano.',
      'Metal expands when heated, so the tower gains a few inches.', 'El metal se dilata con el calor.',
      'Heat makes iron expand', 'a cat astronaut in watercolor, ultra detailed', 'un gato astronauta en acuarela',
      'Space cats', 'Gatos espaciales', 'Perros', 'Dogs',
      T.fichas.autentica, T.instrucciones.ejemplo, ...T.final.mensajes, ...T.final.mensajes_afirmaciones
    ];
    for (const [plantilla, nombreModo] of [
      [T.compartir.plantilla, T.portada.modo_investigador],
      [T.compartir.plantilla_afirmaciones, undefined]
    ]) {
      for (const resultados of ['AAAAA', 'FFFFF', 'FAAFA']) {
        const texto = textoCompartir({ plantilla, n: 3, nombreModo, resultados, racha: 2, url: 'https://u.github.io/identifAI-it/' });
        const resto = sinNombre(texto, idioma);
        assert.equal(/\bAI\b|\bIA\b|\bREAL\b|\bFACT\b|\bDATO\b|fake|bulo|autentica|generada|⬛/i.test(resto), false, texto);
        for (const c of conocidos) assert.equal(texto.includes(c), false, c);
        assert.equal(texto.includes('{'), false);
      }
    }
  }
});

test('el texto compartido va en el idioma activo, con el mismo número, aciertos, cuadros y racha', () => {
  const comun = { n: 9, resultados: 'AFAAF', racha: 4, url: URL_JUEGO };
  const en = textoCompartir({ ...comun, plantilla: TEXTOS.en.compartir.plantilla, nombreModo: TEXTOS.en.portada.modo_perro });
  const es = textoCompartir({ ...comun, plantilla: TEXTOS.es.compartir.plantilla, nombreModo: TEXTOS.es.portada.modo_perro });
  assert.equal(en, 'identifAI-it Images #9\nMode: Bloodhound\n3/5 🟩🟥🟩🟩🟥\nStreak: 4\n' + URL_JUEGO);
  assert.equal(es, 'identifAI-it Imágenes #9\nModo: Sabueso\n3/5 🟩🟥🟩🟩🟥\nRacha: 4\n' + URL_JUEGO);
  // Ni el tema ni ?lang= entran en el texto: la URL es la del juego sin consulta.
  for (const t of [en, es]) assert.equal(t.includes('?'), false);
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
  assert.equal(urlDelJuego({ origin: 'https://identifaiit.com', pathname: '/index.html' }), 'https://identifaiit.com/');
  assert.equal(urlDelJuego({ origin: 'https://identifaiit.com', pathname: '/', search: '?prueba=1&dia=3' }), 'https://identifaiit.com/');
  assert.equal(
    urlDelJuego({ origin: 'https://u.github.io', pathname: '/identifAI-it/index.html', search: '?prueba=1&dia=3' }),
    'https://u.github.io/identifAI-it/'
  );
});
