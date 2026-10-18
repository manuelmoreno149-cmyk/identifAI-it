# identifAI-it

Juego web diario (estilo Wordle): cada día se muestran 5 imágenes, de una en una, y el jugador decide si cada una es REAL o IA antes de que se acabe el tiempo. Temática policíaca / forense oscura: el jugador es un detective que examina pruebas.

## Reglas del juego (no cambiar sin permiso del usuario)
- 5 casos al día, los mismos para todos los jugadores. La mezcla real/IA varía cada día (de 1 a 4 de IA).
- Modos: fácil 7 s, medio 3 s, difícil 1 s por imagen. Tiempo agotado = fallo.
- Las 5 imágenes se precargan antes de empezar. El temporizador arranca solo cuando la imagen está decodificada y pintada.
- Si la pestaña se oculta durante un caso, ese caso cuenta como fallo.
- Un solo intento al día. Recargar o cambiar de modo no permite repetir. El día cambia a medianoche, hora local.
- Al final: aciertos, mensaje policíaco según aciertos (0 a 5), racha y botón Compartir.
- El texto compartido no revela qué imágenes eran IA.

## Stack y restricciones
- HTML + CSS + JavaScript puro con módulos ES. Sin frameworks, sin build, sin dependencias en el navegador.
- Se publica en GitHub Pages bajo /identifAI-it/: usar siempre rutas relativas.
- Node (20 o superior) solo para herramientas/ y tests/. Única dependencia permitida: sharp.
- Móvil primero (360 px). Accesible: teclado (R = real, I = IA), contraste AA, aria-live para el temporizador, prefers-reduced-motion.
- Interfaz en español de España.

## Estructura
- index.html: todas las pantallas (portada, cómo jugar, partida, resultado, ya jugado).
- css/: variables.css (tokens), base.css, componentes.css.
- js/: main.js, juego.js, temporizador.js, diario.js, almacen.js, compartir.js, textos.js.
- img/ui/: SVG propios de la interfaz.
- casos/: imágenes del juego, nombres aleatorios.
- data/calendario.json: los 5 casos de cada día.
- fonts/: fuentes woff2 alojadas en el repo (con @font-face y fuentes del sistema de respaldo). Nada de CDN de Google ni de terceros.
- herramientas/: scripts del banco de imágenes y banco.json (solo local, en .gitignore: no se publica).
- entrada/reales/ y entrada/ia/: imágenes nuevas por importar (en .gitignore).
- tests/: node --test.
- docs/ESPECIFICACION.md (fuente de verdad técnica) y docs/DECISIONES.md.

## Anti-trampas (obligatorio)
- Nunca "real", "ia", "ai", "fake" ni la respuesta en nombres de archivo, rutas, alt, clases, ids ni atributos data-*.
- Imágenes publicadas sin metadatos (EXIF, XMP, C2PA), todas en WebP, 1080 x 1350, misma calidad.
- La respuesta de un caso no existe en el DOM hasta que el jugador responde.
- herramientas/banco.json (con tipo y fuente de cada imagen) nunca se sube a GitHub: va en .gitignore y vive solo en local.

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
