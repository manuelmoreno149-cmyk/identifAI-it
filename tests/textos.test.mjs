import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEXTOS } from '../js/textos.js';

const CLAVES = {
  portada: [
    'titulo', 'lema', 'elige_modo', 'modo_facil', 'modo_medio', 'modo_dificil', 'desc_facil', 'desc_medio',
    'desc_dificil', 'boton_empezar', 'boton_como_jugar', 'etiqueta_caso', 'racha', 'enlace_creditos'
  ],
  como_jugar: ['titulo', 'pasos', 'boton_entendido'],
  cargando: ['texto'],
  cuenta_atras: ['aviso'],
  partida: [
    'etiqueta_prueba', 'marcador', 'alt_prueba', 'boton_autentica', 'boton_generada', 'sello_autentica',
    'sello_generada', 'quedan', 'boton_siguiente', 'boton_ver_resultado'
  ],
  veredictos: ['acierto', 'fallo', 'tiempo', 'oculta'],
  final: [
    'alt_prueba', 'mensajes', 'aciertos', 'racha', 'mejor_racha', 'era', 'cuadros_etiqueta', 'estado_prueba', 'estados'
  ],
  ya_jugado: ['titulo', 'texto', 'proximo', 'modo'],
  sin_casos: ['texto'],
  errores: ['calendario', 'imagenes', 'boton_reintentar'],
  avisos: ['sin_guardar', 'otra_pestana'],
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
    for (const clave of claves) assert.ok(clave in TEXTOS[grupo], `falta ${grupo}.${clave}`);
  }
  assert.equal(TEXTOS.portada.enlace_creditos, 'Créditos');
  assert.equal('nueva_pestana' in TEXTOS.portada, false);
  assert.equal(TEXTOS.creditos.volver, 'Volver a la portada');
  assert.equal(TEXTOS.creditos.titulo, 'Créditos');
  assert.equal(TEXTOS.creditos.sin_imagenes, 'Todavía no hay imágenes publicadas.');
  assert.equal(TEXTOS.final.mensajes.length, 6);
  assert.equal(TEXTOS.como_jugar.pasos.length, 4);
  assert.equal(TEXTOS.final.estado_prueba, 'Prueba {i}: {estado}');
  assert.deepEqual(TEXTOS.final.estados, {
    acierto: 'acierto',
    fallo: 'fallo',
    tiempo: 'tiempo agotado',
    oculta: 'pestaña oculta'
  });
  assert.ok(TEXTOS.veredictos.acierto.length >= 4);
  assert.ok(TEXTOS.veredictos.fallo.length >= 4);
  assert.ok(TEXTOS.veredictos.tiempo.length >= 3);
  assert.ok(TEXTOS.veredictos.oculta.length >= 2);
  assert.equal(TEXTOS.portada.etiqueta_caso, 'Caso nº {n}');
  assert.equal(TEXTOS.final.cuadros_etiqueta, '{aciertos} aciertos de 5');
});

test('39. ninguna cadena supera 90 caracteres (salvo los pasos de cómo jugar)', () => {
  for (const [ruta, valor] of cadenas(TEXTOS)) {
    if (ruta.startsWith('como_jugar.pasos')) continue;
    assert.ok(valor.length <= 90, `${ruta} mide ${valor.length}`);
  }
});

test('40. la plantilla de compartir es exactamente la de la sección 7', () => {
  assert.equal(
    TEXTOS.compartir.plantilla,
    'identifAI-it · Caso nº {caso} · {modo}\n{aciertos}/5 {cuadros}\nRacha: {racha}\n{url}'
  );
});
