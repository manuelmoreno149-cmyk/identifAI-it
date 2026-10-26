import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEXTOS } from '../js/textos.js';

const CLAVES = {
  portada: [
    'titulo', 'lema', 'elige_modo', 'modo_investigador', 'modo_normal', 'modo_perro', 'desc_investigador',
    'desc_normal', 'desc_perro', 'boton_empezar', 'etiqueta_caso', 'tema', 'racha', 'enlace_creditos'
  ],
  como_jugar: ['titulo', 'pasos'],
  cargando: ['texto'],
  cuenta_atras: ['aviso'],
  partida: [
    'caso_del_dia', 'etiqueta_prueba', 'marcador', 'alt_prueba', 'boton_autentica', 'boton_generada', 'sello_autentica',
    'sello_generada', 'quedan', 'boton_siguiente', 'boton_ver_resultado', 'sobre_texto', 'sobre_anuncio'
  ],
  veredictos: ['acierto', 'fallo'],
  confesion: ['titulo', 'leer_entera', 'no_disponible'],
  ficha: ['cerrar'],
  fichas: ['autentica', 'sin_prompt'],
  final: [
    'alt_prueba', 'mensajes', 'aciertos', 'racha', 'mejor_racha', 'era', 'cuadros_etiqueta', 'estado_prueba', 'estados'
  ],
  ya_jugado: ['titulo', 'texto', 'proximo', 'modo'],
  sin_casos: ['texto'],
  errores: ['calendario', 'imagenes', 'boton_reintentar'],
  avisos: ['sin_guardar', 'otra_pestana', 'previsualizacion'],
  prueba: ['etiqueta', 'opcion', 'boton'],
  compartir: ['boton', 'copiado', 'manual', 'plantilla'],
  creditos: [
    'titulo_pagina', 'titulo', 'intro', 'tipografias', 'imagenes', 'imagenes_intro', 'sin_imagenes',
    'ver_licencia', 'volver'
  ]
};

function cadenas(valor, ruta = '') {
  if (typeof valor === 'string') return [[ruta, valor]];
  if (Array.isArray(valor)) return valor.flatMap((v, i) => cadenas(v, `${ruta}[${i}]`));
  return Object.entries(valor).flatMap(([k, v]) => cadenas(v, ruta ? `${ruta}.${k}` : k));
}

test('38. están todas las claves de 3.1 y los valores exactos', () => {
  assert.deepEqual(Object.keys(TEXTOS).sort(), Object.keys(CLAVES).sort());
  for (const [grupo, claves] of Object.entries(CLAVES)) {
    assert.deepEqual(Object.keys(TEXTOS[grupo]).sort(), [...claves].sort(), grupo);
  }
  assert.equal(TEXTOS.portada.enlace_creditos, 'Credits');
  assert.equal(TEXTOS.portada.modo_investigador, 'Investigator');
  assert.equal(TEXTOS.portada.modo_normal, 'Normal');
  assert.equal(TEXTOS.portada.modo_perro, 'Bloodhound');
  assert.equal(TEXTOS.portada.desc_investigador, 'No time limit');
  assert.equal(TEXTOS.portada.desc_normal, '3 seconds to examine');
  assert.equal(TEXTOS.portada.desc_perro, '1 second to examine');
  assert.equal(TEXTOS.confesion.titulo, "The suspect's confession");
  assert.equal(TEXTOS.fichas.autentica, 'Real photograph');
  assert.equal(TEXTOS.creditos.volver, 'Back to the front page');
  assert.equal(TEXTOS.creditos.titulo, 'Credits');
  assert.equal(TEXTOS.creditos.sin_imagenes, 'No images published yet.');
  assert.equal(TEXTOS.final.mensajes.length, 6);
  assert.equal(TEXTOS.como_jugar.pasos.length, 4);
  assert.equal(TEXTOS.final.estado_prueba, 'Evidence {i}: {estado}');
  assert.deepEqual(TEXTOS.final.estados, { acierto: 'correct', fallo: 'wrong' });
  assert.deepEqual(Object.keys(TEXTOS.final.estados).sort(), ['acierto', 'fallo']);
  assert.ok(TEXTOS.veredictos.acierto.length >= 4);
  assert.ok(TEXTOS.veredictos.fallo.length >= 4);
  assert.equal(TEXTOS.portada.etiqueta_caso, 'Case #{n}');
  assert.equal(TEXTOS.portada.tema, 'Case of the day: {tema}');
  assert.equal(TEXTOS.partida.caso_del_dia, 'Case of the day: {tema}');
  assert.equal(TEXTOS.final.cuadros_etiqueta, '{aciertos} out of 5 correct');
});

test('38. las claves eliminadas en la 1.3 no existen', () => {
  for (const k of ['modo_facil', 'modo_medio', 'modo_dificil', 'desc_facil', 'desc_medio', 'desc_dificil', 'boton_como_jugar', 'nueva_pestana']) {
    assert.equal(k in TEXTOS.portada, false, k);
  }
  assert.equal('boton_entendido' in TEXTOS.como_jugar, false);
  assert.equal('tiempo' in TEXTOS.veredictos, false);
  assert.equal('oculta' in TEXTOS.veredictos, false);
});

test('39. límites de longitud de 3.1', () => {
  const sueltas = (ruta) => ruta.startsWith('fichas.') || ruta.startsWith('como_jugar.pasos');
  for (const [ruta, valor] of cadenas(TEXTOS)) {
    if (!sueltas(ruta)) assert.ok([...valor].length <= 90, `${ruta} mide ${valor.length}`);
  }
  TEXTOS.como_jugar.pasos.forEach((p, i) => assert.ok([...p].length <= 80, `paso ${i}: ${p.length}`));
  const max = {
    'portada.modo_investigador': 14, 'portada.modo_normal': 14, 'portada.modo_perro': 14,
    'portada.desc_investigador': 26, 'portada.desc_normal': 26, 'portada.desc_perro': 26,
    'partida.sobre_texto': 16, 'confesion.titulo': 30, 'confesion.leer_entera': 24, 'ficha.cerrar': 16
  };
  for (const [ruta, limite] of Object.entries(max)) {
    const [g, k] = ruta.split('.');
    assert.ok([...TEXTOS[g][k]].length <= limite, `${ruta} mide ${[...TEXTOS[g][k]].length}`);
  }
  for (const k of ['autentica', 'sin_prompt']) {
    const t = TEXTOS.fichas[k];
    assert.ok(t.length > 0);
    assert.equal(t, t.trim());
    assert.ok(new TextEncoder().encode(t).length <= 510);
  }
  assert.notEqual(TEXTOS.fichas.autentica, TEXTOS.fichas.sin_prompt);
});

test('39. ningún texto menciona los modos antiguos, time-out or hidden-tab wording', () => {
  for (const [ruta, valor] of cadenas(TEXTOS)) {
    assert.equal(/time.?s up|hidden tab|\beasy\b|\bhard\b|\bmedium\b/i.test(valor.replace(TEXTOS.partida.sobre_anuncio, '')), false, ruta);
  }
});

test('40. la plantilla de compartir es exactamente la de la sección 7', () => {
  assert.equal(
    TEXTOS.compartir.plantilla,
    'identifAI-it · Case #{caso}\nMode: {modo}\n{aciertos}/5 {cuadros}\nStreak: {racha}\n{url}'
  );
});

test('avisos.previsualizacion: valor exacto, un marcador y longitud', () => {
  const t = TEXTOS.avisos.previsualizacion;
  assert.equal(t, 'Preview of {fecha}: nothing gets saved.');
  assert.deepEqual(t.match(/\{[^}]+\}/g), ['{fecha}']);
  assert.ok(t.replace('{fecha}', 'Nov 3, 2026').length <= 90);
});

test('prueba.*: valores, marcadores, longitud y palabras prohibidas', async () => {
  const { contienePalabraProhibida } = await import('../herramientas/temas.mjs');
  const t = TEXTOS.prueba;
  assert.equal(t.opcion, 'Day {n}: {tema}');
  assert.deepEqual(t.opcion.match(/\{[^}]+\}/g), ['{n}', '{tema}']);
  assert.ok(t.opcion.replace('{n}', '99').replace('{tema}', 'x'.repeat(30)).length <= 50);
  for (const k of ['etiqueta', 'opcion', 'boton']) {
    assert.ok(t[k].length <= 90);
    assert.equal(contienePalabraProhibida(t[k]), null, k);
  }
});
