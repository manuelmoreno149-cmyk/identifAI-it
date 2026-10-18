// Textos del juego. Voz de novela negra, español de España, tuteo al jugador.
// Las claves que llevan {x} son plantillas: las rellena el código que las usa.

export const TEXTOS = {
  portada: {
    titulo: 'identifAI-it',
    lema: 'Cinco pruebas, un solo intento: ¿auténtica o generada?',
    elige_modo: 'Elige tu modo de investigación',
    modo_facil: 'Fácil',
    modo_medio: 'Medio',
    modo_dificil: 'Difícil',
    desc_facil: '7 s por prueba. Tiempo de sobra para examinar la escena.',
    desc_medio: '3 s por prueba. Lo justo para no dudar demasiado.',
    desc_dificil: '1 s por prueba. Solo para ojos de forense.',
    boton_empezar: 'Empezar',
    boton_como_jugar: 'Cómo jugar',
    etiqueta_caso: 'Caso nº {n}',
    racha: 'Racha: {racha}',
    enlace_creditos: 'Créditos'
  },

  como_jugar: {
    titulo: 'Cómo jugar',
    pasos: [
      'Cada día hay un caso con cinco pruebas, las mismas para todos los detectives.',
      'Examina cada imagen y decide si es REAL o si la ha generado una IA.',
      'Tienes un tiempo límite por prueba. Si se agota, cuenta como fallo.',
      'Solo hay un intento al día, sea cual sea el modo. Elige bien.'
    ],
    boton_entendido: 'Entendido'
  },

  cargando: {
    texto: 'Preparando las pruebas del caso...'
  },

  cuenta_atras: {
    aviso: 'Prepara la mirada. La primera prueba llega en:'
  },

  partida: {
    etiqueta_prueba: 'Prueba {i}/5',
    marcador: 'Aciertos: {aciertos}',
    alt_prueba: 'Prueba {i} de 5',
    boton_autentica: 'REAL',
    boton_generada: 'IA',
    sello_autentica: 'REAL',
    sello_generada: 'IA',
    quedan: 'Quedan {s} s',
    boton_siguiente: 'Siguiente',
    boton_ver_resultado: 'Ver resultado'
  },

  veredictos: {
    acierto: [
      'Buen ojo, detective. Esta prueba queda bien archivada.',
      'Eso es. La prueba no pudo engañarte.',
      'Certero. Anótalo en el expediente.',
      'Lo has clavado. Nada se escapa a tu mirada.'
    ],
    fallo: [
      'Mal dato. La prueba te ha engañado.',
      'Te has equivocado. Anótalo en el expediente.',
      'Error de detective. Toca revisar la coartada.',
      'La prueba no era lo que parecía. Sigue adelante.'
    ],
    tiempo: [
      'Se acabó el tiempo. El sospechoso se ha escapado.',
      'Tarde. La prueba ya no espera a nadie.',
      'El reloj ha ganado esta vez.'
    ],
    oculta: [
      'Has dejado la escena sin vigilancia. Cuenta como fallo.',
      'Te has ido sin mirar. La prueba queda archivada como fallo.',
      'Pestaña oculta: el caso no perdona las distracciones.'
    ]
  },

  final: {
    mensajes: [
      'La IA te tiene dominado. Ningún acierto. El caso queda archivado sin pruebas a tu favor.',
      'Un solo acierto. Demasiadas sombras para un detective. Mañana, con la vista afinada.',
      'Dos aciertos. Te moviste a tientas en la niebla. Afila la mirada para el próximo caso.',
      'Tres aciertos. Buen trabajo, aunque el sospechoso todavía guarda algún secreto.',
      'Cuatro aciertos. Casi perfecto: una sola prueba se te escapó entre los dedos.',
      'Cinco de cinco. Ni la IA te engaña. Caso cerrado y expediente impecable.'
    ],
    aciertos: '{aciertos}/5',
    racha: 'Racha: {racha}',
    mejor_racha: 'Mejor racha: {racha}',
    era: 'Era: {sello}',
    cuadros_etiqueta: '{aciertos} aciertos de 5',
    estado_prueba: 'Prueba {i}: {estado}',
    estados: {
      acierto: 'acierto',
      fallo: 'fallo',
      tiempo: 'tiempo agotado',
      oculta: 'pestaña oculta'
    }
  },

  ya_jugado: {
    titulo: 'Caso archivado',
    texto: 'Hoy ya has cerrado tu expediente. Vuelve mañana, el crimen no descansa.',
    proximo: 'Próximo caso en {tiempo}',
    modo: 'Modo: {modo}'
  },

  sin_casos: {
    texto: 'No hay caso para hoy. Vuelve cuando el expediente tenga pruebas.'
  },

  errores: {
    calendario: 'No se pudo cargar el calendario de casos. Revisa tu conexión.',
    imagenes: 'No se pudieron preparar las pruebas. Inténtalo de nuevo.',
    boton_reintentar: 'Reintentar'
  },

  avisos: {
    sin_guardar: 'Este navegador no guarda datos. Tu intento de hoy no se recordará al recargar.'
  },

  compartir: {
    boton: 'Compartir',
    copiado: 'Copiado al portapapeles',
    manual: 'Copia este texto:',
    plantilla: 'identifAI-it · Caso nº {caso} · {modo}\n{aciertos}/5 {cuadros}\nRacha: {racha}\n{url}'
  },

  creditos: {
    titulo_pagina: 'Créditos · identifAI-it',
    titulo: 'Créditos',
    intro: 'Tipografías libres y fotografías de las fuentes que se citan abajo.',
    tipografias: 'Tipografías',
    imagenes: 'Imágenes',
    imagenes_intro: 'Las pruebas proceden de estas fuentes. La lista no indica qué imagen viene de cada una.',
    sin_imagenes: 'Todavía no hay imágenes publicadas.',
    ver_licencia: 'licencia',
    volver: 'Volver a la portada'
  }
};
