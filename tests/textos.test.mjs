import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEXTOS } from '../js/textos.js';

const CLAVES = {
  portada: [
    'titulo', 'lema', 'elige_reto', 'reto_imagenes', 'reto_afirmaciones', 'estado_pendiente', 'estado_jugado',
    'estado_en_curso', 'estado_sin_caso', 'boton_ver_informe', 'regla_afirmaciones', 'elige_modo',
    'modo_investigador', 'modo_normal', 'modo_perro', 'desc_investigador', 'desc_normal', 'desc_perro',
    'boton_empezar', 'etiqueta_caso', 'tema', 'racha', 'enlace_creditos',
    'expediente_imagenes', 'expediente_afirmaciones', 'desc_reto_imagenes', 'desc_reto_afirmaciones',
    'empezar_imagenes', 'empezar_afirmaciones', 'informe_imagenes', 'informe_afirmaciones',
    'tiempo_investigador', 'tiempo_normal', 'tiempo_perro'
  ],
  como_jugar: ['titulo', 'pasos', 'pasos_afirmaciones'],
  cargando: ['texto'],
  cuenta_atras: ['aviso'],
  partida: [
    'caso_del_dia', 'marca', 'etiqueta_prueba', 'marcador', 'alt_prueba', 'boton_autentica', 'boton_generada', 'sello_autentica',
    'sello_generada', 'quedan', 'boton_siguiente', 'boton_ver_resultado', 'sobre_texto', 'sobre_anuncio',
    'modo_etiqueta', 'voto_autentica', 'voto_generada'
  ],
  afirmaciones: [
    'etiqueta_prueba', 'boton_autentica', 'boton_generada', 'sello_autentica', 'sello_generada', 'marca', 'oculta',
    'aviso_oculta', 'no_disponible', 'aclaracion_no_disponible', 'estado_prueba',
    'voto_autentica', 'voto_generada', 'boton_siguiente'
  ],
  revelacion: [
    'titulo_afirmacion', 'titulo_imagenes', 'titulo_afirmaciones', 'resumen_autentica', 'resumen_generada',
    'etiqueta_prueba', 'banda_acierto', 'banda_fallo', 'banda_oculta'
  ],
  veredictos: ['acierto', 'fallo'],
  confesion: ['titulo', 'nota', 'leer_entera', 'no_disponible'],
  ficha: ['cerrar'],
  fichas: ['autentica', 'sin_prompt'],
  final: [
    'alt_prueba', 'reto', 'boton_volver', 'mensajes', 'mensajes_afirmaciones', 'aciertos', 'racha', 'mejor_racha', 'era', 'cuadros_etiqueta',
    'estado_prueba', 'estados'
  ],
  resultado: [
    'sello_cerrado', 'nota_imagenes', 'nota_afirmaciones', 'etiqueta_racha', 'etiqueta_mejor_racha',
    'siguiente_caso', 'nuevo_caso', 'boton_nuevo_caso', 'dijiste'
  ],
  ya_jugado: ['titulo', 'texto', 'proximo', 'modo'],
  sin_casos: ['texto', 'sin_lanzamiento'],
  errores: ['calendario', 'imagenes', 'boton_reintentar'],
  avisos: ['sin_guardar', 'otra_pestana', 'previsualizacion', 'prueba'],
  prueba: ['etiqueta', 'opcion', 'boton'],
  compartir: ['boton', 'copiado', 'manual', 'plantilla', 'plantilla_afirmaciones'],
  creditos: [
    'titulo_pagina', 'titulo', 'intro', 'tipografias', 'imagenes', 'imagenes_intro', 'sin_imagenes',
    'afirmaciones', 'afirmaciones_texto', 'ver_licencia', 'volver'
  ]
};

function cadenas(valor, ruta = '') {
  if (typeof valor === 'string') return [[ruta, valor]];
  if (Array.isArray(valor)) return valor.flatMap((v, i) => cadenas(v, `${ruta}[${i}]`));
  return Object.entries(valor).flatMap(([k, v]) => cadenas(v, ruta ? `${ruta}.${k}` : k));
}

// Valores de relleno de 3.1 (D-118): el valor típico más largo de cada marcador.
const masLargo = (lista) => lista.reduce((m, c) => ([...c].length > [...m].length ? c : m));
const RELLENO = {
  aciertos: '5',
  voto: 'Fake',
  i: '5',
  n: '999',
  caso: '999',
  racha: '999',
  s: '9',
  tiempo: '00:00:00',
  tema: 'x'.repeat(30),
  fecha: 'Nov 30, 2026',
  modo: masLargo(['modo_investigador', 'modo_normal', 'modo_perro'].map((k) => TEXTOS.portada[k])),
  reto: masLargo(['reto_imagenes', 'reto_afirmaciones'].map((k) => TEXTOS.portada[k])),
  estado: masLargo(Object.values(TEXTOS.final.estados)),
  sello: masLargo([
    TEXTOS.partida.sello_autentica,
    TEXTOS.partida.sello_generada,
    TEXTOS.afirmaciones.sello_autentica,
    TEXTOS.afirmaciones.sello_generada
  ])
};

function rellena(ruta, valor) {
  return valor.replace(/\{(\w+)\}/g, (marca, k) => {
    assert.ok(Object.hasOwn(RELLENO, k), `${ruta}: marcador ${marca} sin valor de relleno`);
    return RELLENO[k];
  });
}

const esPlantillaCompartir = (ruta) => ruta.startsWith('compartir.plantilla');

const rellenadas = () =>
  cadenas(TEXTOS).map(([ruta, valor]) => [ruta, esPlantillaCompartir(ruta) ? valor : rellena(ruta, valor)]);

const medida = (ruta) => {
  const par = rellenadas().find(([r]) => r === ruta);
  assert.ok(par, `no existe ${ruta}`);
  return [...par[1]].length;
};

test('38. están todas las claves de 3.1 y los valores exactos', () => {
  assert.deepEqual(Object.keys(TEXTOS).sort(), Object.keys(CLAVES).sort());
  for (const [grupo, claves] of Object.entries(CLAVES)) {
    assert.deepEqual(Object.keys(TEXTOS[grupo]).sort(), [...claves].sort(), grupo);
  }
  assert.equal(TEXTOS.portada.enlace_creditos, 'Credits');
  assert.equal(TEXTOS.portada.reto_imagenes, 'Images');
  assert.equal(TEXTOS.portada.reto_afirmaciones, 'Fact or Fake');
  assert.equal(TEXTOS.portada.lema, 'Two cases a day. Spot the fake.');
  assert.equal(TEXTOS.portada.estado_en_curso, 'In another tab');
  assert.equal(TEXTOS.portada.regla_afirmaciones, "No timer. Leave for more than a few seconds and it's a miss.");
  assert.equal(TEXTOS.portada.modo_investigador, 'Investigator');
  assert.equal(TEXTOS.portada.modo_normal, 'Normal');
  assert.equal(TEXTOS.portada.modo_perro, 'Bloodhound');
  assert.equal(TEXTOS.portada.desc_investigador, 'No time limit');
  assert.equal(TEXTOS.portada.desc_normal, '3 seconds to examine');
  assert.equal(TEXTOS.portada.desc_perro, '1 second to examine');
  assert.equal(TEXTOS.confesion.titulo, "The suspect's confession");
  assert.equal(TEXTOS.fichas.autentica, 'Real photograph');
  assert.equal(TEXTOS.afirmaciones.boton_autentica, 'FACT');
  assert.equal(TEXTOS.afirmaciones.boton_generada, 'FAKE');
  assert.equal(TEXTOS.afirmaciones.sello_autentica, 'FACT');
  assert.equal(TEXTOS.afirmaciones.sello_generada, 'FAKE');
  assert.equal(TEXTOS.afirmaciones.marca, 'identifAI-it · Fact or Fake?');
  assert.equal(TEXTOS.afirmaciones.aviso_oculta, 'Leaving the page for more than a few seconds counts as a miss.');
  assert.ok(Array.isArray(TEXTOS.afirmaciones.oculta) && TEXTOS.afirmaciones.oculta.length >= 2);
  assert.equal(
    TEXTOS.creditos.afirmaciones_texto,
    'Claims are written for this game from public sources. The fakes are invented and always debunked after you answer.'
  );
  assert.equal(TEXTOS.creditos.afirmaciones, 'Fact or Fake');
  assert.equal(TEXTOS.sin_casos.sin_lanzamiento, 'The precinct opens soon. No cases on file yet.');
  assert.equal(TEXTOS.final.reto, '{reto} · Case #{n}');
  assert.equal(TEXTOS.avisos.prueba, 'Test mode · Day {n}: nothing gets saved.');
  assert.equal(TEXTOS.creditos.volver, 'Back to the front page');
  assert.equal(TEXTOS.creditos.titulo, 'Credits');
  assert.equal(TEXTOS.creditos.sin_imagenes, 'No images published yet.');
  assert.equal(TEXTOS.final.mensajes.length, 6);
  assert.equal(TEXTOS.como_jugar.pasos.length, 4);
  assert.equal(TEXTOS.como_jugar.pasos_afirmaciones.length, 4);
  assert.deepEqual(TEXTOS.final.mensajes_afirmaciones, [
    'The paperwork beat you. Not one call survived. The file goes in the drawer, face down.',
    'One call held up. The other lies were sharper than you. Check the sources.',
    'Two right calls. A fake in a good suit got past you. Check the source before you sign.',
    'Three right calls. Solid instincts, but two lies still slipped past your desk.',
    "Four right calls. One lie got away. Read every claim like a suspect's alibi.",
    'Every fact confirmed, every fake exposed. No loose ends in this file.'
  ]);
  TEXTOS.final.mensajes_afirmaciones.forEach((m, i) => {
    assert.notEqual(m, TEXTOS.final.mensajes[i]);
    assert.equal(/(AI|images?|photos?|pictures?)/i.test(m), false, m);
  });
  assert.equal(TEXTOS.final.estado_prueba, 'Evidence {i}: {estado}');
  assert.deepEqual(TEXTOS.final.estados, { acierto: 'correct', fallo: 'wrong' });
  assert.ok(TEXTOS.veredictos.acierto.length >= 4);
  assert.ok(TEXTOS.veredictos.fallo.length >= 4);
  assert.equal(TEXTOS.portada.etiqueta_caso, 'Case #{n}');
  assert.equal(TEXTOS.portada.tema, 'Case of the day: {tema}');
  assert.equal(TEXTOS.partida.caso_del_dia, 'Case of the day: {tema}');
  assert.equal(TEXTOS.final.cuadros_etiqueta, '{aciertos} out of 5 correct');
  assert.equal(TEXTOS.compartir.boton, 'Share result');
  assert.equal(TEXTOS.resultado.sello_cerrado, 'CASE CLOSED');
  assert.equal(TEXTOS.resultado.nota_imagenes, 'Tap a photo to see its file');
  assert.equal(TEXTOS.resultado.nota_afirmaciones, 'Tap a claim to read the truth again');
  assert.equal(TEXTOS.resultado.etiqueta_racha, 'Streak');
  assert.equal(TEXTOS.resultado.etiqueta_mejor_racha, 'Best streak');
  assert.equal(TEXTOS.resultado.siguiente_caso, 'Next case in');
  assert.equal(TEXTOS.resultado.nuevo_caso, 'New case available');
  assert.equal(TEXTOS.resultado.boton_nuevo_caso, 'Play');
  assert.equal(TEXTOS.resultado.dijiste, 'You said {voto}');
});

test('38. las claves eliminadas en la 1.3 no existen', () => {
  for (const k of ['modo_facil', 'modo_medio', 'modo_dificil', 'desc_facil', 'desc_medio', 'desc_dificil', 'boton_como_jugar', 'nueva_pestana']) {
    assert.equal(k in TEXTOS.portada, false, k);
  }
  assert.equal('boton_entendido' in TEXTOS.como_jugar, false);
  assert.equal('tiempo' in TEXTOS.veredictos, false);
  assert.equal('oculta' in TEXTOS.veredictos, false);
});

test('39. límites de longitud de 3.1, medidos con el texto rellenado', () => {
  for (const [ruta, valor] of rellenadas()) {
    if (ruta.startsWith('fichas.') || esPlantillaCompartir(ruta)) continue;
    const largo = [...valor].length;
    if (ruta.startsWith('como_jugar.pasos')) assert.ok(largo <= 80, `${ruta} mide ${largo}`);
    else if (ruta === 'creditos.afirmaciones_texto') {
      assert.equal(largo, 114); // la spec dice 113, pero el texto exacto mide 114
      assert.ok(largo <= 120);
    } else assert.ok(largo <= 90, `${ruta} mide ${largo}`);
  }
  const max = {
    'portada.modo_investigador': 14, 'portada.modo_normal': 14, 'portada.modo_perro': 14,
    'portada.desc_investigador': 26, 'portada.desc_normal': 26, 'portada.desc_perro': 26,
    'partida.sobre_texto': 16, 'confesion.titulo': 30, 'confesion.leer_entera': 24, 'ficha.cerrar': 16,
    'prueba.opcion': 50,
    'portada.reto_imagenes': 12, 'portada.reto_afirmaciones': 12,
    'portada.estado_pendiente': 18, 'portada.estado_jugado': 18, 'portada.estado_en_curso': 18,
    'portada.estado_sin_caso': 18, 'portada.regla_afirmaciones': 70, 'portada.boton_ver_informe': 16,
    'final.boton_volver': 16, 'afirmaciones.etiqueta_prueba': 16,
    'afirmaciones.boton_autentica': 12, 'afirmaciones.boton_generada': 12,
    'afirmaciones.sello_autentica': 12, 'afirmaciones.sello_generada': 12,
    'afirmaciones.marca': 40, 'avisos.prueba': 70
  };
  for (const [ruta, limite] of Object.entries(max)) {
    assert.ok(medida(ruta) <= limite, `${ruta} mide ${medida(ruta)} (máx. ${limite})`);
  }
  TEXTOS.afirmaciones.oculta.forEach((t, i) => assert.ok([...t].length <= 90, `oculta[${i}]`));
  assert.equal(medida('portada.estado_jugado'), [...'Filed · 5/5'].length);
  assert.equal(rellena('x', TEXTOS.avisos.prueba), 'Test mode · Day 999: nothing gets saved.');
  for (const k of ['autentica', 'sin_prompt']) {
    const t = TEXTOS.fichas[k];
    assert.ok(t.length > 0);
    assert.equal(t, t.trim());
    assert.ok(new TextEncoder().encode(t).length <= 510);
  }
  assert.notEqual(TEXTOS.fichas.autentica, TEXTOS.fichas.sin_prompt);
});

test('39. un marcador sin valor de relleno hace fallar el test', () => {
  assert.throws(() => rellena('x.y', 'hola {desconocido}'), /x\.y: marcador \{desconocido\} sin valor/);
  // el relleno no deja ningún marcador en ninguna cadena medida
  for (const [ruta, valor] of rellenadas()) {
    if (!esPlantillaCompartir(ruta)) assert.equal(/\{\w+\}/.test(valor), false, ruta);
  }
});

test('39. ningún texto menciona los modos antiguos, time-out or hidden-tab wording', () => {
  for (const [ruta, valor] of cadenas(TEXTOS)) {
    assert.equal(/time.?s up|hidden tab|\beasy\b|\bhard\b|\bmedium\b/i.test(valor.replace(TEXTOS.partida.sobre_anuncio, '')), false, ruta);
  }
});

test('40. las plantillas de compartir son exactamente las de la sección 7', () => {
  assert.equal(
    TEXTOS.compartir.plantilla,
    'identifAI-it Images #{caso}\nMode: {modo}\n{aciertos}/5 {cuadros}\nStreak: {racha}\n{url}'
  );
  assert.equal(
    TEXTOS.compartir.plantilla_afirmaciones,
    'identifAI-it Fact or Fake #{caso}\n{aciertos}/5 {cuadros}\nStreak: {racha}\n{url}'
  );
});

test('180. Fact or Fake dice "more than a few seconds"; Images no habla de salir de la página', () => {
  const frase = /more than a few seconds/i;
  assert.ok(TEXTOS.como_jugar.pasos_afirmaciones.some((t) => frase.test(t)));
  assert.ok(frase.test(TEXTOS.portada.regla_afirmaciones));
  for (const t of TEXTOS.afirmaciones.oculta) assert.ok(frase.test(t), t);
  assert.ok(frase.test(TEXTOS.afirmaciones.aviso_oculta));
  const images = [
    ...TEXTOS.como_jugar.pasos, TEXTOS.portada.desc_investigador, TEXTOS.portada.desc_normal,
    TEXTOS.portada.desc_perro, TEXTOS.partida.sobre_anuncio
  ];
  for (const t of images) assert.equal(/\b(leave|leaving|away|tab|page)\b/i.test(t), false, t);
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
