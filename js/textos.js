// Textos del juego. Voz de novela negra, inglés americano (en-US), tuteo al jugador (you).
// Las claves que llevan {x} son plantillas: las rellena el código que las usa.

export const TEXTOS = {
  portada: {
    titulo: 'identifAI-it',
    lema: 'Five pieces of evidence. One shot. Real or AI?',
    elige_reto: 'Choose your case file',
    reto_imagenes: 'Images',
    reto_titulares: 'Headlines',
    estado_pendiente: 'Open case',
    estado_jugado: 'Filed · {aciertos}/5',
    estado_en_curso: 'In another tab',
    estado_sin_caso: 'No case today',
    boton_ver_informe: 'View report',
    regla_titulares: 'No timer. Leave for more than a few seconds and it\'s a miss.',
    elige_modo: 'Choose your investigation mode',
    modo_investigador: 'Investigator',
    modo_normal: 'Normal',
    modo_perro: 'Bloodhound',
    desc_investigador: 'No time limit',
    desc_normal: '3 seconds to examine',
    desc_perro: '1 second to examine',
    boton_empezar: 'Start',
    etiqueta_caso: 'Case #{n}',
    tema: 'Case of the day: {tema}',
    racha: 'Streak: {racha}',
    enlace_creditos: 'Credits'
  },

  como_jugar: {
    titulo: 'How to play',
    pasos: [
      'Each day brings one case: five pieces of evidence, same for everyone.',
      'Study each image and call it: REAL or AI.',
      'Time runs out? The evidence gets sealed. Answer at your leisure.',
      'One attempt a day, whatever the mode. Choose wisely.'
    ],
    pasos_titulares: [
      'Two challenges a day, one try each. This one is Headlines.',
      'Read the headline and the lede, then call it: REAL or AI. No timer.',
      'Leave the page for more than a few seconds and it counts as a miss.',
      'After you answer, you get the source or the suspect\'s confession.'
    ]
  },

  cargando: {
    texto: 'Preparing the case evidence...'
  },

  cuenta_atras: {
    aviso: 'Steady your eyes. The first piece of evidence arrives in:'
  },

  partida: {
    caso_del_dia: 'Case of the day: {tema}',
    etiqueta_prueba: 'Evidence {i}/5',
    marcador: 'Correct: {aciertos}',
    alt_prueba: 'Evidence {i} of 5',
    boton_autentica: 'REAL',
    boton_generada: 'AI',
    sello_autentica: 'REAL',
    sello_generada: 'AI',
    quedan: '{s} s left',
    boton_siguiente: 'Next',
    boton_ver_resultado: 'See result',
    sobre_texto: 'SEALED EVIDENCE',
    sobre_anuncio: 'Observation time is up. The evidence is sealed: answer whenever you like.'
  },

  veredictos: {
    acierto: [
      'Good eye, detective. This one goes in the file.',
      'Right. The evidence didn\'t fool you.',
      'Dead on. Log it in the case file.',
      'Nailed it. Nothing gets past you.'
    ],
    fallo: [
      'Bad call. The evidence played you.',
      'Wrong. Log it in the file and keep moving.',
      'Rookie mistake. Time to check the alibi again.',
      'It wasn\'t what it seemed. Keep going.'
    ]
  },

  confesion: {
    titulo: 'The suspect\'s confession',
    leer_entera: 'Read full confession',
    no_disponible: 'The confession got lost in the paperwork. Convenient.'
  },

  ficha: {
    cerrar: 'Close'
  },

  fichas: {
    autentica: 'Real photograph',
    sin_prompt: 'The suspect refuses to confess. Make of that what you will.'
  },

  titulares: {
    etiqueta_prueba: 'Story {i}/5',
    sello_autentica: 'REAL · PUBLISHED STORY',
    sello_generada: 'AI-GENERATED · NOT A REAL STORY',
    marca: 'identifAI-it · Real or AI?',
    oculta: [
      'You were away from the file for more than a few seconds. That\'s a miss.',
      'The suspect slipped out while you were gone. More than a few seconds: miss.',
      'Too long off the case. Gone more than a few seconds means a miss.'
    ],
    aviso_oculta: 'Leaving the page for more than a few seconds counts as a miss.',
    fuente_titulo: 'The source',
    fuente_enlace: 'Read it at {medio}',
    nueva_pestana: '(opens in a new tab)',
    fuente_no_disponible: 'The source is no longer on file.',
    no_disponible: 'This clipping can\'t be read. Try reloading the page.',
    estado_prueba: 'Story {i}: {estado}'
  },

  final: {
    alt_prueba: 'Evidence {n}',
    reto: '{reto} · Case #{n}',
    boton_volver: 'Back',
    mensajes: [
      'The AI has you beat. Zero hits. The case goes cold in the archive.',
      'One hit. Too many shadows for one detective. Come back tomorrow with sharper eyes.',
      'Two hits. You fumbled through the fog. Sharpen your eye for the next case.',
      'Three hits. Good work, though the suspect still has a secret or two.',
      'Four hits. Almost clean: one piece of evidence slipped through your fingers.',
      'Five for five. Not even the AI fooled you. Case closed, file spotless.'
    ],
    aciertos: '{aciertos}/5',
    racha: 'Streak: {racha}',
    mejor_racha: 'Best streak: {racha}',
    era: 'It was: {sello}',
    cuadros_etiqueta: '{aciertos} out of 5 correct',
    estado_prueba: 'Evidence {i}: {estado}',
    estados: {
      acierto: 'correct',
      fallo: 'wrong'
    }
  },

  ya_jugado: {
    titulo: 'Case closed',
    texto: 'You\'ve already filed today\'s case. Come back tomorrow. Crime never sleeps.',
    proximo: 'Next case in {tiempo}',
    modo: 'Mode: {modo}'
  },

  sin_casos: {
    texto: 'No case today. Come back when the file has evidence.',
    sin_lanzamiento: 'The precinct opens soon. No cases on file yet.'
  },

  errores: {
    calendario: 'The case calendar wouldn\'t load. Check your connection.',
    imagenes: 'The evidence wouldn\'t load. Try again.',
    boton_reintentar: 'Retry'
  },

  avisos: {
    sin_guardar: 'This device\'s file is sealed. Today\'s attempt won\'t be recorded.',
    otra_pestana: 'This case is open in another tab. Finish the examination there.',
    previsualizacion: 'Preview of {fecha}: nothing gets saved.',
    prueba: 'Test mode · Day {n}: nothing gets saved.'
  },

  prueba: {
    etiqueta: 'Test day',
    opcion: 'Day {n}: {tema}',
    boton: 'Open this day'
  },

  compartir: {
    boton: 'Share',
    copiado: 'Copied to clipboard',
    manual: 'Copy this text:',
    plantilla: 'identifAI-it Images #{caso}\nMode: {modo}\n{aciertos}/5 {cuadros}\nStreak: {racha}\n{url}',
    plantilla_titulares: 'identifAI-it Headlines #{caso}\n{aciertos}/5 {cuadros}\nStreak: {racha}\n{url}'
  },

  creditos: {
    titulo_pagina: 'Credits · identifAI-it',
    titulo: 'Credits',
    intro: 'Free fonts and the photo sources cited below.',
    tipografias: 'Fonts',
    imagenes: 'Images',
    imagenes_intro: 'The evidence comes from these sources. The list doesn\'t say which image came from where.',
    sin_imagenes: 'No images published yet.',
    noticias: 'News',
    noticias_intro: 'Headlines adapted from the original publishers; summaries written for this game. Links go to the original stories.',
    sin_noticias: 'No news sources credited yet.',
    ficcion: 'Stories marked AI are fiction written for this game.',
    ver_licencia: 'license',
    volver: 'Back to the front page'
  }
};
