import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEXTOS } from '../js/textos.js';
import { IDIOMAS } from '../js/diario.js';

const CLAVES = {
  portada: [
    'titulo', 'lema', 'idioma', 'abrir', 'pie', 'sello_ilustracion', 'etiqueta_caso', 'elige_reto',
    'reto_imagenes', 'reto_afirmaciones', 'estado_pendiente', 'estado_jugado', 'estado_en_curso', 'estado_sin_caso',
    'modo_investigador', 'modo_normal', 'modo_perro', 'desc_investigador', 'desc_normal', 'desc_perro',
    'expediente_imagenes', 'expediente_afirmaciones', 'desc_reto_imagenes', 'desc_reto_afirmaciones'
  ],
  instrucciones: [
    'volver', 'membrete', 'frase_imagenes', 'frase_afirmaciones', 'pasos_imagenes', 'pasos_afirmaciones', 'firma',
    'metodo', 'reglas', 'ejemplo_etiqueta', 'ejemplo', 'boton_empezar', 'aviso_titulo', 'pestana_imagenes', 'pestana_afirmaciones'
  ],
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
  fichas: ['autentica'],
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
  prueba: ['etiqueta', 'opcion'],
  compartir: ['boton', 'copiado', 'manual', 'plantilla', 'plantilla_afirmaciones'],
  creditos: [
    'titulo_pagina', 'titulo', 'intro', 'tipografias', 'imagenes', 'imagenes_intro', 'sin_imagenes',
    'afirmaciones', 'afirmaciones_texto', 'ver_licencia', 'volver', 'otro_idioma'
  ],
  pie: [
    'etiqueta', 'sobre', 'como_jugar', 'metodo', 'guia_imagenes', 'guia_desinformacion', 'archivo', 'preguntas',
    'creditos', 'privacidad', 'cookies', 'contacto', 'corto_sobre', 'corto_como_jugar', 'corto_archivo',
    'corto_privacidad', 'corto_creditos'
  ],
  raiz: ['lema', 'jugar'],
  paginas: ['saltar', 'jugar'],
  seo: [
    'titulo_raiz', 'descripcion_raiz', 'titulo_juego', 'descripcion_juego', 'titulo_archivo', 'descripcion_archivo',
    'titulo_dia', 'descripcion_dia', 'og_alt'
  ],
  archivo: [
    'titulo_dia', 'alt_prueba', 'vacio', 'sin_reto', 'anterior', 'siguiente', 'indice', 'jugar_hoy',
    'ejemplos_titulo', 'ver_dia', 'meses', 'fecha', 'mes'
  ],
  anuncios: ['etiqueta'],
  no_encontrada: ['titulo', 'texto', 'enlace'],
  noscript: ['aviso']
};

// Claves que se retiraron en la 3.0 (no deben existir en ningún idioma).
const RETIRADAS = {
  portada: [
    'boton_empezar', 'boton_ver_informe', 'regla_afirmaciones', 'elige_modo', 'tema', 'racha', 'empezar_imagenes',
    'empezar_afirmaciones', 'informe_imagenes', 'informe_afirmaciones', 'tiempo_investigador', 'tiempo_normal', 'tiempo_perro'
  ],
  fichas: ['sin_prompt'],
  prueba: ['boton']
};

function cadenas(valor, ruta = '') {
  if (typeof valor === 'string') return [[ruta, valor]];
  if (Array.isArray(valor)) return valor.flatMap((v, i) => cadenas(v, `${ruta}[${i}]`));
  return Object.entries(valor).flatMap(([k, v]) => cadenas(v, ruta ? `${ruta}.${k}` : k));
}

// Esqueleto de un árbol: claves, longitud de los arrays y marcadores {x} de cada cadena.
function esqueleto(valor) {
  if (typeof valor === 'string') return (valor.match(/\{\w+\}/g) ?? []).sort();
  if (Array.isArray(valor)) return valor.map(esqueleto);
  return Object.fromEntries(Object.keys(valor).sort().map((k) => [k, esqueleto(valor[k])]));
}

// Valores de relleno de 3.1 (D-118), por idioma.
const masLargo = (lista) => lista.reduce((m, c) => ([...c].length > [...m].length ? c : m));
function rellenoDe(idioma) {
  const T = TEXTOS[idioma];
  return {
    aciertos: '5',
    i: '5',
    n: '999',
    caso: '999',
    racha: '999',
    s: '9',
    tiempo: '00:00:00',
    tema: 'x'.repeat(30),
    fecha: idioma === 'es' ? '30 nov 2026' : 'Nov 30, 2026',
    d: '30',
    mes: idioma === 'es' ? 'septiembre' : 'September',
    a: '2026',
    modo: masLargo(['modo_investigador', 'modo_normal', 'modo_perro'].map((k) => T.portada[k])),
    reto: masLargo(['reto_imagenes', 'reto_afirmaciones'].map((k) => T.portada[k])),
    estado: masLargo(Object.values(T.final.estados)),
    sello: masLargo([T.partida.sello_autentica, T.partida.sello_generada, T.afirmaciones.sello_autentica, T.afirmaciones.sello_generada]),
    voto: masLargo([T.partida.voto_autentica, T.partida.voto_generada, T.afirmaciones.voto_autentica, T.afirmaciones.voto_generada])
  };
}

function rellena(idioma, ruta, valor) {
  const relleno = rellenoDe(idioma);
  return valor.replace(/\{(\w+)\}/g, (marca, k) => {
    assert.ok(Object.hasOwn(relleno, k), `${idioma}.${ruta}: marcador ${marca} sin valor de relleno`);
    return relleno[k];
  });
}

const esPlantillaCompartir = (ruta) => ruta.startsWith('compartir.plantilla');

const rellenadas = (idioma) =>
  cadenas(TEXTOS[idioma]).map(([ruta, valor]) => [ruta, esPlantillaCompartir(ruta) ? valor : rellena(idioma, ruta, valor)]);

const medida = (idioma, ruta) => {
  const par = rellenadas(idioma).find(([r]) => r === ruta);
  assert.ok(par, `no existe ${idioma}.${ruta}`);
  return [...par[1]].length;
};

test('38. TEXTOS tiene exactamente los idiomas en y es', () => {
  assert.deepEqual(Object.keys(TEXTOS).sort(), [...IDIOMAS].sort());
});

test('38. están todas las claves de 3.1 en los dos idiomas y no quedan las retiradas', () => {
  for (const idioma of IDIOMAS) {
    const T = TEXTOS[idioma];
    assert.deepEqual(Object.keys(T).sort(), Object.keys(CLAVES).sort(), idioma);
    for (const [grupo, claves] of Object.entries(CLAVES)) {
      assert.deepEqual(Object.keys(T[grupo]).sort(), [...claves].sort(), `${idioma}.${grupo}`);
    }
    for (const [grupo, claves] of Object.entries(RETIRADAS)) {
      for (const k of claves) assert.equal(k in T[grupo], false, `${idioma}.${grupo}.${k}`);
    }
    assert.equal('como_jugar' in T, false, `${idioma}.como_jugar`);
  }
});

test('38. los dos árboles son paralelos: mismas claves, mismos arrays y mismos marcadores', () => {
  assert.deepEqual(esqueleto(TEXTOS.es), esqueleto(TEXTOS.en));
  // Todas las cadenas son no vacías y sin espacios sobrantes en los extremos.
  for (const idioma of IDIOMAS) {
    for (const [ruta, valor] of cadenas(TEXTOS[idioma])) {
      assert.ok(valor.length > 0, `${idioma}.${ruta} vacío`);
      assert.equal(valor, valor.trim(), `${idioma}.${ruta} con espacios en los extremos`);
    }
  }
});

test('38. valores exactos en inglés', () => {
  const T = TEXTOS.en;
  assert.equal(T.portada.abrir, 'Open file');
  assert.equal(T.portada.pie, 'New cases every day at midnight.');
  assert.equal(T.portada.elige_reto, 'Choose your case file');
  assert.equal(T.portada.lema, 'Two cases a day. Spot the fake.');
  assert.equal('enlace_creditos' in T.portada, false);
  assert.equal(T.portada.reto_imagenes, 'Images');
  assert.equal(T.portada.reto_afirmaciones, 'Fact or Fake');
  assert.equal(T.portada.estado_en_curso, 'In another tab');
  assert.equal(T.portada.modo_investigador, 'Investigator');
  assert.equal(T.portada.modo_normal, 'Normal');
  assert.equal(T.portada.modo_perro, 'Bloodhound');
  assert.equal(T.portada.desc_investigador, 'No time limit');
  assert.equal(T.portada.desc_normal, '3 seconds to examine');
  assert.equal(T.portada.desc_perro, '1 second to examine');
  assert.equal(T.portada.etiqueta_caso, 'Case #{n}');
  assert.equal(T.instrucciones.volver, 'All case files');
  assert.equal(T.instrucciones.membrete, 'Briefing · Case #{n} · {tema}');
  assert.equal(T.instrucciones.firma, 'One try per day. — The Chief');
  assert.equal(T.instrucciones.metodo, 'METHOD OF INVESTIGATION');
  assert.equal(T.instrucciones.reglas, 'HOUSE RULES');
  assert.equal(T.instrucciones.boton_empezar, 'Open the case');
  assert.equal(T.confesion.titulo, "The suspect's confession");
  assert.equal(T.fichas.autentica, 'Real photograph');
  assert.equal(T.partida.boton_autentica, 'REAL');
  assert.equal(T.partida.boton_generada, 'AI');
  assert.equal(T.afirmaciones.boton_autentica, 'FACT');
  assert.equal(T.afirmaciones.boton_generada, 'FAKE');
  assert.equal(T.afirmaciones.sello_autentica, 'FACT');
  assert.equal(T.afirmaciones.sello_generada, 'FAKE');
  assert.equal(T.afirmaciones.marca, 'identifAI-it · Fact or Fake?');
  assert.equal(T.afirmaciones.aviso_oculta, 'Leaving the page for more than a few seconds counts as a miss.');
  assert.ok(Array.isArray(T.afirmaciones.oculta) && T.afirmaciones.oculta.length >= 2);
  assert.equal(
    T.creditos.afirmaciones_texto,
    'Claims are written for this game from public sources. The fakes are invented and always debunked after you answer.'
  );
  assert.equal(T.creditos.afirmaciones, 'Fact or Fake');
  assert.equal(T.creditos.otro_idioma, 'Español');
  assert.equal(T.creditos.volver, 'Back to the front page');
  assert.equal(T.sin_casos.sin_lanzamiento, 'The precinct opens soon. No cases on file yet.');
  assert.equal(T.final.reto, '{reto} · Case #{n}');
  assert.equal(T.avisos.prueba, 'Test mode · Day {n}: nothing gets saved.');
  assert.equal(T.avisos.previsualizacion, 'Preview of {fecha}: nothing gets saved.');
  assert.equal(T.final.mensajes.length, 6);
  assert.equal(T.final.mensajes_afirmaciones.length, 6);
  assert.equal(T.instrucciones.pasos_imagenes.length, 4);
  assert.equal(T.instrucciones.pasos_afirmaciones.length, 4);
  assert.deepEqual(T.final.estados, { acierto: 'correct', fallo: 'wrong' });
  assert.equal(T.partida.caso_del_dia, 'Case of the day: {tema}');
  assert.equal(T.final.cuadros_etiqueta, '{aciertos} out of 5 correct');
  assert.equal(T.compartir.boton, 'Share result');
  assert.equal(T.resultado.sello_cerrado, 'CASE CLOSED');
  assert.equal(T.prueba.opcion, 'Day {n}: {tema}');
});

test('38. valores exactos en español', () => {
  const T = TEXTOS.es;
  assert.equal(T.portada.reto_imagenes, 'Imágenes');
  assert.equal(T.portada.reto_afirmaciones, '¿Dato o Bulo?');
  assert.equal(T.partida.boton_autentica, 'REAL');
  assert.equal(T.partida.boton_generada, 'IA');
  assert.equal(T.partida.sello_autentica, 'REAL');
  assert.equal(T.partida.sello_generada, 'IA');
  assert.equal(T.afirmaciones.boton_autentica, 'DATO');
  assert.equal(T.afirmaciones.boton_generada, 'BULO');
  assert.equal(T.afirmaciones.sello_autentica, 'DATO');
  assert.equal(T.afirmaciones.sello_generada, 'BULO');
  assert.equal(T.portada.modo_investigador, 'Investigador');
  assert.equal(T.portada.modo_normal, 'Normal');
  assert.equal(T.portada.modo_perro, 'Sabueso');
  assert.equal(T.afirmaciones.marca, 'identifAI-it · ¿Dato o Bulo?');
  assert.equal(T.fichas.autentica, 'Fotografía real');
  assert.equal(T.creditos.otro_idioma, 'English');
  assert.equal(T.final.mensajes.length, 6);
  assert.equal(T.final.mensajes_afirmaciones.length, 6);
  assert.equal(T.instrucciones.pasos_imagenes.length, 4);
  assert.equal(T.instrucciones.pasos_afirmaciones.length, 4);
  assert.ok(T.veredictos.acierto.length >= 4 && T.veredictos.fallo.length >= 4);
});

test('38. el inglés y el español no se mezclan en lo que ve el jugador', () => {
  // Las etiquetas de cada idioma son distintas (salvo nombres que coinciden en los dos: Normal, REAL, el título).
  const iguales = new Set(['portada.titulo', 'portada.modo_normal', 'partida.boton_autentica', 'partida.sello_autentica',
    'partida.voto_autentica', 'final.aciertos', 'partida.voto_autentica', 'pie.cookies', 'seo.titulo_raiz', 'seo.descripcion_raiz']);
  for (const [ruta, valor] of cadenas(TEXTOS.en)) {
    const otra = cadenas(TEXTOS.es).find(([r]) => r === ruta)[1];
    if (valor === otra) assert.ok(iguales.has(ruta) || /^[^a-z]*$/.test(valor), `${ruta} idéntica en en y es: ${valor}`);
  }
});

test('39. límites de longitud de 3.1, medidos con el texto rellenado, en cada idioma', () => {
  const max = {
    'portada.modo_investigador': 14, 'portada.modo_normal': 14, 'portada.modo_perro': 14,
    'portada.desc_investigador': 26, 'portada.desc_normal': 26, 'portada.desc_perro': 26,
    'partida.sobre_texto': 16, 'confesion.titulo': 30, 'confesion.leer_entera': 24, 'ficha.cerrar': 16,
    'prueba.opcion': 50,
    'portada.reto_imagenes': 14, 'portada.reto_afirmaciones': 14,
    'portada.abrir': 24, 'portada.pie': 48, 'portada.idioma': 20,
    'portada.estado_pendiente': 18, 'portada.estado_jugado': 18, 'portada.estado_en_curso': 18, 'portada.estado_sin_caso': 18,
    'instrucciones.volver': 24, 'instrucciones.membrete': 70, 'instrucciones.frase_imagenes': 70,
    'instrucciones.frase_afirmaciones': 70, 'instrucciones.firma': 40, 'instrucciones.metodo': 30,
    'instrucciones.reglas': 30, 'instrucciones.boton_empezar': 20, 'instrucciones.ejemplo': 80,
    'instrucciones.aviso_titulo': 30, 'instrucciones.ejemplo_etiqueta': 30,
    'instrucciones.pestana_imagenes': 30, 'instrucciones.pestana_afirmaciones': 30,
    'final.boton_volver': 16, 'afirmaciones.etiqueta_prueba': 16,
    'afirmaciones.boton_autentica': 12, 'afirmaciones.boton_generada': 12,
    'afirmaciones.sello_autentica': 12, 'afirmaciones.sello_generada': 12,
    'afirmaciones.marca': 40, 'avisos.prueba': 70, 'afirmaciones.aviso_oculta': 70
  };
  for (const idioma of IDIOMAS) {
    for (const [ruta, valor] of rellenadas(idioma)) {
      if (ruta.startsWith('fichas.') || esPlantillaCompartir(ruta)) continue;
      const largo = [...valor].length;
      if (ruta.startsWith('instrucciones.pasos_')) assert.ok(largo <= 80, `${idioma}.${ruta} mide ${largo}`);
      else if (ruta === 'creditos.afirmaciones_texto' || ruta === 'noscript.aviso') assert.ok(largo <= 120, `${idioma}.${ruta} mide ${largo}`);
      else if (/^seo\.titulo_/.test(ruta)) assert.ok(largo <= 60, `${idioma}.${ruta} mide ${largo}`);
      else if (/^seo\.descripcion_/.test(ruta)) assert.ok(largo >= 70 && largo <= 155, `${idioma}.${ruta} mide ${largo}`);
      else if (ruta === 'instrucciones.ejemplo') assert.ok(largo <= 80, `${idioma}.${ruta} mide ${largo}`);
      else assert.ok(largo <= 90, `${idioma}.${ruta} mide ${largo}`);
    }
    for (const [ruta, limite] of Object.entries(max)) {
      assert.ok(medida(idioma, ruta) <= limite, `${idioma}.${ruta} mide ${medida(idioma, ruta)} (máx. ${limite})`);
    }
    TEXTOS[idioma].afirmaciones.oculta.forEach((t, i) => assert.ok([...t].length <= 90, `${idioma}.oculta[${i}]`));
    // Las fichas fijas caben en un bloque de ficha (510 bytes) y no tienen espacios sobrantes.
    const autentica = TEXTOS[idioma].fichas.autentica;
    assert.ok(autentica.length > 0);
    assert.equal(autentica, autentica.trim());
    assert.ok(new TextEncoder().encode(autentica).length <= 510);
  }
  assert.equal(medida('en', 'portada.estado_jugado'), [...'Filed · 5/5'].length);
  assert.equal(medida('es', 'portada.estado_jugado'), [...'Archivado · 5/5'].length);
  assert.notEqual(TEXTOS.en.fichas.autentica, TEXTOS.es.fichas.autentica);
});

test('39. un marcador sin valor de relleno hace fallar el test, y el relleno no deja marcadores', () => {
  assert.throws(() => rellena('en', 'x.y', 'hola {desconocido}'), /en\.x\.y: marcador \{desconocido\} sin valor/);
  for (const idioma of IDIOMAS) {
    for (const [ruta, valor] of rellenadas(idioma)) {
      if (!esPlantillaCompartir(ruta)) assert.equal(/\{\w+\}/.test(valor), false, `${idioma}.${ruta}`);
    }
  }
  assert.equal(rellena('en', 'x', TEXTOS.en.avisos.prueba), 'Test mode · Day 999: nothing gets saved.');
  assert.equal(rellena('es', 'x', TEXTOS.es.avisos.previsualizacion).includes('30 nov 2026'), true);
});

test('39. ningún texto inglés menciona los modos antiguos ni los de otro tiempo', () => {
  for (const [ruta, valor] of cadenas(TEXTOS.en)) {
    assert.equal(/time.?s up|hidden tab|\beasy\b|\bhard\b|\bmedium\b/i.test(valor.replace(TEXTOS.en.partida.sobre_anuncio, '')), false, ruta);
  }
});

test('40. las plantillas de compartir son exactamente las de la sección 7, por idioma', () => {
  assert.equal(
    TEXTOS.en.compartir.plantilla,
    'identifAI-it Images #{caso}\nMode: {modo}\n{aciertos}/5 {cuadros}\nStreak: {racha}\n{url}'
  );
  assert.equal(
    TEXTOS.en.compartir.plantilla_afirmaciones,
    'identifAI-it Fact or Fake #{caso}\n{aciertos}/5 {cuadros}\nStreak: {racha}\n{url}'
  );
  assert.equal(
    TEXTOS.es.compartir.plantilla,
    'identifAI-it Imágenes #{caso}\nModo: {modo}\n{aciertos}/5 {cuadros}\nRacha: {racha}\n{url}'
  );
  assert.equal(
    TEXTOS.es.compartir.plantilla_afirmaciones,
    'identifAI-it ¿Dato o Bulo? #{caso}\n{aciertos}/5 {cuadros}\nRacha: {racha}\n{url}'
  );
});

test('180. el aviso de salir de Fact or Fake va en aviso_oculta (no en los pasos); Images no habla de salir de la página', () => {
  const frases = { en: /more than a few seconds/i, es: /más de unos segundos/i };
  const salir = { en: /\b(leave|leaving|away|tab|page)\b/i, es: /\b(salir|saliste|fuera|pestaña|página)\b/i };
  for (const idioma of IDIOMAS) {
    const T = TEXTOS[idioma];
    // El aviso se muestra en la página derecha (aviso_oculta); los pasos no lo repiten.
    assert.equal(T.instrucciones.pasos_afirmaciones.some((t) => frases[idioma].test(t)), false, `${idioma} pasos repite el aviso`);
    for (const t of T.afirmaciones.oculta) assert.ok(frases[idioma].test(t), t);
    assert.ok(frases[idioma].test(T.afirmaciones.aviso_oculta), `${idioma} aviso`);
    const images = [
      ...T.instrucciones.pasos_imagenes, T.portada.desc_investigador, T.portada.desc_normal,
      T.portada.desc_perro, T.partida.sobre_anuncio
    ];
    for (const t of images) assert.equal(salir[idioma].test(t), false, t);
  }
});

test('180. los pasos no repiten lo de la firma ni los modos (van a la página derecha)', () => {
  const repite = { en: /\b(a day|one try|attempt|investigator|normal|bloodhound|modes?)\b/i, es: /\b(al día|intento|investigador|sabueso|normal|modos?)\b/i };
  for (const idioma of IDIOMAS) {
    for (const k of ['pasos_imagenes', 'pasos_afirmaciones']) {
      TEXTOS[idioma].instrucciones[k].forEach((t) => assert.equal(repite[idioma].test(t), false, `${idioma}.${k}: ${t}`));
    }
  }
});

test('180. instrucciones: valores exactos (en y es) y teclas de cada idioma en los pasos', () => {
  const en = TEXTOS.en.instrucciones;
  const es = TEXTOS.es.instrucciones;
  assert.equal(en.frase_afirmaciones, 'A true fact or a clever lie?');
  assert.equal(es.frase_afirmaciones, '¿Una verdad o una mentira ingeniosa?');
  assert.deepEqual(en.pasos_afirmaciones, [
    'Five claims about the day\'s theme, one at a time.',
    'Make your call on each: FACT or FAKE (keys F and K).',
    'No timer: take your time.',
    'Once you answer, you uncover the truth.'
  ]);
  assert.deepEqual(es.pasos_afirmaciones, [
    'Cinco afirmaciones sobre el tema del día, una a una.',
    'Decide en cada una: DATO o BULO (teclas D y B).',
    'Sin cronómetro: tómate tu tiempo.',
    'Al responder, descubres la verdad.'
  ]);
  assert.match(en.pasos_imagenes[1], /\(R\).*\(I\)/);
  assert.match(es.pasos_imagenes[1], /\(R\).*\(I\)/);
  assert.equal(en.aviso_titulo, 'Stay on the case');
  assert.equal(es.aviso_titulo, 'No te muevas del caso');
  assert.equal(en.ejemplo_etiqueta, 'EXHIBIT FOR TRAINING PURPOSES');
  assert.equal(es.ejemplo_etiqueta, 'PRUEBA DE ENTRENAMIENTO');
  assert.equal(en.pestana_imagenes, 'Case file 01 · Images');
  assert.equal(es.pestana_imagenes, 'Expediente 01 · Imágenes');
  assert.equal(en.pestana_afirmaciones, 'Case file 02 · Fact or Fake');
  assert.equal(es.pestana_afirmaciones, 'Expediente 02 · ¿Dato o Bulo?');
});

test('final.mensajes_afirmaciones no habla de IA, imágenes ni fotos, y difiere de los de Images (los dos idiomas)', () => {
  const prohibido = { en: /\b(AI|images?|photos?|pictures?)\b/i, es: /\b(IA|im[aá]genes?|fotos?|fotograf[ií]as?)\b/i };
  for (const idioma of IDIOMAS) {
    TEXTOS[idioma].final.mensajes_afirmaciones.forEach((m, i) => {
      assert.notEqual(m, TEXTOS[idioma].final.mensajes[i]);
      assert.equal(prohibido[idioma].test(m), false, `${idioma}[${i}]: ${m}`);
    });
  }
});

test('"IA" solo aparece como palabra suelta en los sitios permitidos del español', () => {
  const permitidas = [
    /^partida\./, /^portada\.sello_ilustracion$/, /^revelacion\.resumen_generada$/, /^confesion\./,
    /^final\.mensajes\[/, /^portada\.desc_reto_imagenes$/, /^instrucciones\.(frase|pasos)_imagenes/, /^pie\.guia_imagenes$/, /^raiz\.lema$/, /^seo\./
  ];
  for (const [ruta, valor] of cadenas(TEXTOS.es)) {
    if (/\bIA\b/.test(valor)) assert.ok(permitidas.some((re) => re.test(ruta)), `${ruta}: ${valor}`);
  }
});

test('palabras prohibidas: las claves de texto no son rutas ni ids, pero los textos de portada no llevan la respuesta', () => {
  // El tema de ejemplo de las instrucciones no es ninguna afirmación del juego: es una frase de muestra fija.
  for (const idioma of IDIOMAS) {
    const ejemplo = TEXTOS[idioma].instrucciones.ejemplo;
    assert.ok(ejemplo.endsWith('.'), `${idioma}: el ejemplo es una frase`);
    assert.equal(ejemplo.includes('\n'), false);
  }
});

test('avisos.previsualizacion: un marcador y longitud en los dos idiomas', () => {
  for (const idioma of IDIOMAS) {
    const t = TEXTOS[idioma].avisos.previsualizacion;
    assert.deepEqual(t.match(/\{[^}]+\}/g), ['{fecha}']);
    assert.ok(rellena(idioma, 'avisos.previsualizacion', t).length <= 90);
  }
});

test('prueba.*: marcadores, longitud y palabras prohibidas (los dos idiomas)', async () => {
  const { contienePalabraProhibida } = await import('../herramientas/temas.mjs');
  for (const idioma of IDIOMAS) {
    const t = TEXTOS[idioma].prueba;
    assert.deepEqual(t.opcion.match(/\{[^}]+\}/g), ['{n}', '{tema}']);
    assert.ok(t.opcion.replace('{n}', '99').replace('{tema}', 'x'.repeat(30)).length <= 50);
    for (const k of ['etiqueta', 'opcion']) {
      assert.ok(t[k].length <= 90);
      assert.equal(contienePalabraProhibida(t[k]), null, `${idioma}.${k}`);
    }
  }
});
