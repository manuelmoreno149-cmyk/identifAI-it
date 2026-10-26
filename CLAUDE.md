# identifAI-it

Juego web diario (estilo Wordle) con dos retos: Images (cada día se muestran 5 imágenes, de una en una) y Headlines (cada día se muestran 5 noticias). En ambos, el jugador decide si cada caso es REAL o AI. Temática policíaca / forense oscura: el jugador es un detective que examina pruebas.

## Reglas del juego (no cambiar sin permiso del usuario)
- Dos retos, que el jugador elige en la portada: Images y Headlines. Cada reto tiene sus 5 casos al día (los mismos para todos los jugadores), su intento diario, su racha y su texto de compartir. Se puede jugar a los dos el mismo día. Los dos se lanzan juntos en una fecha que decide el usuario (configurable con `npm run lanzamiento`, todavía sin fijar) y el modo prueba (`?prueba=1`) sigue abierto hasta entonces.
- Cada día tiene un tema ("Case of the day: Dogs") y sus 5 casos los elige el usuario. La mezcla real/IA la decide el usuario en cada día, de 1 a 4 de IA.
- Images: modos Investigator (sin límite, sin temporizador), Normal (3 s por imagen) y Bloodhound (1 s por imagen). Al acabarse el tiempo la imagen se tapa con un sobre de pruebas sellado y el jugador responde sin límite: no es fallo. Las 5 imágenes se precargan antes de empezar y el temporizador arranca solo cuando la imagen está decodificada y pintada. Ocultar la pestaña no penaliza: el temporizador sigue corriendo.
- Headlines: sin modos ni temporizador. Cada caso muestra un titular y una entradilla de 1 o 2 frases, sin medio ni fecha, y el jugador responde cuando quiera. Ocultar la pestaña antes de responder cuenta como fallo de ese caso solo si dura más de 3 segundos seguidos; al empezar se avisa ("Leaving the page for more than a few seconds counts as a miss."). El texto no se puede seleccionar ni copiar (freno casual).
- Tras responder, cada caso muestra su ficha. Images: el prompt en inglés en las de IA, "Real photograph" en las reales. Headlines: enlace a la fuente original si es real; si es IA, un sello muy visible "AI-GENERATED · NOT A REAL STORY" y su prompt como confesión.
- Un solo intento al día por reto (en Images, igual para los tres modos). Recargar o cambiar de modo no permite repetir. El día cambia a medianoche, hora local.
- Al final, resultado compacto: aciertos, mensaje policíaco según aciertos (0 a 5), 5 miniaturas o fichas numeradas que abren su ficha, racha del reto y botón Compartir.
- Todas las pantallas caben en la ventana sin scroll (desde 360x640 y 640x360).
- El texto compartido de cada reto ("identifAI-it Images #N" con el modo, "identifAI-it Headlines #N" sin modo) no revela qué casos eran IA y nunca incluye titulares.

## Stack y restricciones
- HTML + CSS + JavaScript puro con módulos ES. Sin frameworks, sin build, sin dependencias en el navegador.
- Se publica en GitHub Pages bajo /identifAI-it/: usar siempre rutas relativas.
- Node (20 o superior) solo para herramientas/ y tests/. Única dependencia permitida: sharp.
- Móvil primero (360 px). Accesible: teclado (R = real, I = IA), contraste AA, aria-live para el temporizador y el sobre, prefers-reduced-motion.
- Interfaz solo en inglés americano (en-US): todo lo que ve el jugador, incluidos <html lang="en">, title, aria-labels, alt, créditos, texto compartido y fechas. Lo interno (spec, decisiones, comentarios, mensajes de los scripts y commits) se queda en español.

## Estructura
- index.html: todas las pantallas (portada con elección de reto y Cómo jugar desplegable, partida, resultado, ya jugado).
- css/: variables.css (tokens), base.css, componentes.css.
- js/: main.js, juego.js, temporizador.js, diario.js, almacen.js, compartir.js, textos.js.
- img/ui/: SVG propios de la interfaz.
- casos/: imágenes del juego, nombres aleatorios.
- data/calendario.json: los 5 casos de Images de cada día y su tema (con las fichas ofuscadas). Los de Headlines van en un archivo por mes, data/titulares/AAAA-MM.json, y el juego solo carga el del mes en curso. Detalle y versiones en la spec.
- fonts/: fuentes woff2 alojadas en el repo (con @font-face y fuentes del sistema de respaldo). Nada de CDN de Google ni de terceros.
- herramientas/: importar.mjs (genera también el calendario de Images), validar.mjs, creditos.mjs y temas.mjs; el importador de Headlines y la fecha de lanzamiento tienen sus propios scripts (ver spec). banco.json, banco.anterior.json y lote.json (recortes manuales) son solo locales, en .gitignore: no se publican.
- entrada/temas/NN-nombre-del-tema/{ia,real}/: imágenes originales por importar, una carpeta por día (en .gitignore). Junto a cada imagen de ia/ va un .txt con su prompt en español y un .en.txt con el prompt en inglés (el que se usa). Las carpetas de tema están en inglés (01-fireworks, 02-dogs...). Ya no se usan entrada/reales/ ni entrada/ia/.
- entrada/titulares/NN-tema/noticias.txt: noticias por importar (en .gitignore), bloques separados por "---" con los campos type (real|ai), headline, lede, source (solo real) y prompt (solo ai).
- tests/: node --test.
- docs/ESPECIFICACION.md y docs/especificacion/ (fuente de verdad técnica) y docs/DECISIONES.md.

## Anti-trampas (obligatorio)
- Nunca "real", "ia", "ai", "fake" ni la respuesta en nombres de archivo, rutas, alt, clases, ids ni atributos data-*.
- Imágenes publicadas sin metadatos (EXIF, XMP, C2PA), todas en WebP, 1080 x 1350, misma calidad.
- Norma de contenido de Headlines: las noticias generadas por IA son ficción y no pueden nombrar personas, empresas ni instituciones reales (ni atribuir sucesos graves inventados a lugares reales). El importador no puede comprobarlo: antes de cada importación, una persona revisa cada noticia de IA con la lista de comprobación y lo certifica con `--revisado`.
- La respuesta, la ficha, la fuente y el prompt de un caso no existen en el DOM hasta que el jugador responde. Solo la noticia actual está en el DOM. Los prompts y las noticias nunca se publican en claro: las respuestas, fuentes y prompts van ofuscados y con la misma longitud.
- herramientas/banco.json (con tipo y fuente de cada imagen), herramientas/banco.anterior.json y herramientas/lote.json (sus rutas contienen ia/ y real/) nunca se suben a GitHub: van en .gitignore y viven solo en local. Tampoco entrada/.

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
- archivero: banco de imágenes, noticias, calendario y validación.
- asuntos-internos: revisión de calidad y trampas, no edita.
Delega en ellos de uno en uno y revisa su trabajo antes de seguir.
