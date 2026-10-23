# identifAI-it

Juego web diario (estilo Wordle): cada día se muestran 5 imágenes, de una en una, y el jugador decide si cada una es REAL o IA. Temática policíaca / forense oscura: el jugador es un detective que examina pruebas.

## Reglas del juego (no cambiar sin permiso del usuario)
- 5 casos al día, los mismos para todos los jugadores. Cada día tiene un tema ("Caso del día: Perros") y sus 5 imágenes las elige el usuario. La mezcla real/IA la decide el usuario en cada día, de 1 a 4 de IA.
- Modos: Investigador (sin límite, sin temporizador), Normal (3 s por imagen) y Perro de presa (1 s por imagen). Al acabarse el tiempo la imagen se tapa con un sobre de pruebas sellado y el jugador responde sin límite: ya no es fallo.
- Las 5 imágenes se precargan antes de empezar. El temporizador arranca solo cuando la imagen está decodificada y pintada.
- Ocultar la pestaña no penaliza: el temporizador sigue corriendo.
- Un solo intento al día, igual para los tres modos. Recargar o cambiar de modo no permite repetir. El día cambia a medianoche, hora local.
- Cada prueba tiene una ficha (el prompt en las de IA, "Fotografía real" en las reales) que solo se muestra tras responder.
- Al final, resultado compacto: aciertos, mensaje policíaco según aciertos (0 a 5), 5 miniaturas que abren su ficha, racha y botón Compartir.
- Todas las pantallas caben en la ventana sin scroll (desde 360x640 y 640x360).
- El texto compartido incluye el modo y no revela qué imágenes eran IA.

## Stack y restricciones
- HTML + CSS + JavaScript puro con módulos ES. Sin frameworks, sin build, sin dependencias en el navegador.
- Se publica en GitHub Pages bajo /identifAI-it/: usar siempre rutas relativas.
- Node (20 o superior) solo para herramientas/ y tests/. Única dependencia permitida: sharp.
- Móvil primero (360 px). Accesible: teclado (R = real, I = IA), contraste AA, aria-live para el temporizador y el sobre, prefers-reduced-motion.
- Interfaz en español de España.

## Estructura
- index.html: todas las pantallas (portada con Cómo jugar desplegable, partida, resultado, ya jugado).
- css/: variables.css (tokens), base.css, componentes.css.
- js/: main.js, juego.js, temporizador.js, diario.js, almacen.js, compartir.js, textos.js.
- img/ui/: SVG propios de la interfaz.
- casos/: imágenes del juego, nombres aleatorios.
- data/calendario.json: los 5 casos de cada día y su tema (versión 3, con las fichas ofuscadas).
- fonts/: fuentes woff2 alojadas en el repo (con @font-face y fuentes del sistema de respaldo). Nada de CDN de Google ni de terceros.
- herramientas/: importar.mjs (genera también el calendario), validar.mjs, creditos.mjs y temas.mjs. banco.json, banco.anterior.json y lote.json (recortes manuales) son solo locales, en .gitignore: no se publican.
- entrada/temas/NN-nombre-del-tema/{ia,real}/: imágenes originales por importar, una carpeta por día (en .gitignore). Junto a cada imagen de ia/ va un .txt con su prompt. Ya no se usan entrada/reales/ ni entrada/ia/.
- tests/: node --test.
- docs/ESPECIFICACION.md y docs/especificacion/ (fuente de verdad técnica) y docs/DECISIONES.md.

## Anti-trampas (obligatorio)
- Nunca "real", "ia", "ai", "fake" ni la respuesta en nombres de archivo, rutas, alt, clases, ids ni atributos data-*.
- Imágenes publicadas sin metadatos (EXIF, XMP, C2PA), todas en WebP, 1080 x 1350, misma calidad.
- La respuesta y la ficha de un caso no existen en el DOM hasta que el jugador responde. Los prompts nunca se publican en claro.
- herramientas/banco.json (con tipo y fuente de cada imagen), herramientas/banco.anterior.json y herramientas/lote.json (sus rutas contienen ia/ y real/) nunca se suben a GitHub: van en .gitignore y viven solo en local.

## Forma de trabajar
- Lee docs/ESPECIFICACION.md antes de tocar código. Si algo no está ahí, pregunta o regístralo en docs/DECISIONES.md.
- Tareas pequeñas. Un commit por tarea, mensaje en español: "tipo: descripción" (feat, fix, estilo, datos, docs, test).
- Antes de dar algo por terminado: npm test, npm run validar y probar el juego con npx serve.
- No borres archivos de entrada/ ni de casos/ sin permiso.

## Agentes disponibles
- inspector-jefe: arquitectura y especificación (solo docs/).
- perito-visual: HTML, CSS y SVG de la interfaz.
- cronista: textos en js/textos.js.
- agente-de-campo: lógica JavaScript y tests.
- archivero: banco de imágenes, calendario y validación.
- asuntos-internos: revisión de calidad y trampas, no edita.
Delega en ellos de uno en uno y revisa su trabajo antes de seguir.
