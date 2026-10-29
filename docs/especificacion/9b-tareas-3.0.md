# identifAI-it: especificación técnica, versión 3.0 · 9 (segunda parte). Plan de tareas, riesgos y cambios fuera de docs/ de la 3.0

Parte de la sección 9 (continúa `9-tareas.md`, que conserva el plan de la 2.1) [D-151, D-163]. Una tarea = un commit con mensaje en español (`tipo: descripción`). Se delegan de una en una y ninguna empieza hasta que sus dependencias estén revisadas. **No se publica nada entre la tarea 89 y la 104** (el calendario v5 y los archivos v2 rompen el juego de la rama hasta que todo está hecho).

## 9.7 Relación con el plan de la 2.1

- La **78** se cierra en lo que no cambia (caso, revelación, resultado); su comprobación pendiente en navegador (126, 182, contraste, foco, reduced motion) pasa a la **102**, ya con la portada nueva, `instrucciones` y los dos idiomas.
- La **79** y la **80** (revisión y correcciones) se funden con la **103** y la **104**.
- La **88** (conversión de `datos.txt`) se amplía: cada día nuevo lleva `facts.en.txt`, `facts.es.txt` y `tema.es.txt` (4.19).
- Siguen al final, sin cambios de contenido: **81** (fecha de lanzamiento, P5) y **44** (cerrar el modo prueba).

## 9.8 Requisito previo nuevo

- **P7 (usuario o agente principal) [DP-64]**: actualizar `CLAUDE.md` con el texto de 9.10 y `.claude/agents/cronista.md` (escribe en inglés **y** español), `.claude/agents/archivero.md` (entrada bilingüe, `tema.es.txt`, punto 9 de la lista) y `.claude/agents/perito-visual.md` (portada, `instrucciones`, palabras prohibidas ampliadas), y confirmar en persona la 3.0. Hace falta antes de la fase 3 (lo primero que cambia lo que ve el jugador). La fase 2 no cambia nada visible y puede empezar antes.

## 9.9 Tareas de la 3.0, por fases

| # | Fase | Tarea | Agente | Depende de | Commit |
|---|---|---|---|---|---|
| 89 | 2 · Lógica pura | `js/diario.js` según 3.2 (3.0): `IDIOMAS`, `IDIOMA_POR_DEFECTO`, `LOCALES`, `idiomaValido`, `idiomaDeUrl`, `idiomaDelNavegador`, `elegirIdioma`, `formatearFecha` con idioma, semillas por idioma (4.17) en fichas, afirmaciones y aclaraciones, `validarCalendario` v5, `validarAfirmaciones` v2, `afirmacionesVacias` v2, `casoDelDia`/`casoDeNumero`/`afirmacionesDel*` bilingües, `diasDePrueba` y `temaDelDia` + tests (8, 9, 115, 172, 173, 222, 223, 241–250) y vectores de `es` copiados en DECISIONES. | agente-de-campo | spec 3.0 | `feat: idiomas y datos bilingües en diario` |
| 90 | 2 · Lógica pura | `js/juego.js` y `js/almacen.js` según 3.3 y 3.5: `TECLAS` por idioma, `votoDeTecla`/`teclaDeVoto` con idioma, `estado.idioma`, `ABRIR_RETO`, `CAMBIAR_IDIOMA`, pantalla `instrucciones` en la tabla de 1.3, retirar `ELEGIR_RETO` y `retoDePrueba`; `CLAVE_IDIOMA`, `leerIdioma`, `guardarIdioma` + tests (12, 17, 157, 160, 164–166, 225, 251–260). | agente-de-campo | 89 | `feat: instrucciones e idioma en la máquina de estados` |
| P7 | 3 · Textos | `CLAUDE.md` y `.claude/` (9.8, 9.10). | usuario | — | `docs: CLAUDE.md con portada nueva y dos idiomas` |
| 91 | 3 · Textos | `js/textos.js` a `TEXTOS = {en, es}` según 3.1 (3.0): claves nuevas y retiradas en `en`, árbol `es` completo con los exactos y las propuestas; mostrar al usuario los textos nuevos de los dos idiomas para que los apruebe (los aprobados que pasen a exactos se anotan en DECISIONES). | cronista | P7 | `feat: textos en inglés y español` |
| 92 | 3 · Textos | `tests/textos.test.mjs` y `tests/compartir.test.mjs`: árbol paralelo, exactos, límites por idioma con su relleno, plantillas españolas (38–40, 261–264). | agente-de-campo | 91 | `test: textos y compartir en dos idiomas` |
| 93 | 4 · Datos | `herramientas/temas.mjs` (palabras prohibidas ampliadas, `planificar` con `tema.es.txt` y prompts obligatorios) e `importar.mjs` (calendario v5, fichas `en`/`es`, mensaje de v4, `--reimportar` desde v4) + tests (224, 281–283). | archivero | 89, 91 | `feat: importar imágenes en dos idiomas` |
| 94 | 4 · Datos | `herramientas/afirmaciones.mjs`, `importar-afirmaciones.mjs` y `lanzamiento.mjs` según 4.21 (`archivosDelDia`, `emparejarIdiomas`, archivos v2, `LISTA_REVISION` de 9 puntos, avisos de longitud por idioma) + tests (197–201, 213–215, 284–286, 289). | archivero | 93 | `feat: afirmaciones en dos idiomas` |
| 95 | 4 · Datos | `herramientas/creditos.mjs`: `creditos.html` y `creditos.es.html` (2.7, 4.23) + tests (203, 221, 288). | archivero | 91 | `feat: créditos en dos idiomas` |
| 96 | 4 · Datos | `herramientas/validar.mjs` según 4.22 + tests (287). | archivero | 93, 94, 95 | `feat: validar la versión 3.0` |
| 97 | 4 · Datos | Entrada de los días 1 a 7 (sin commit): `tema.es.txt`; comprobar que cada imagen de `ia/` tiene `.txt` y `.en.txt` (señalar al usuario las que falten, sin inventar prompts); `facts.es.txt` traducido de `facts.en.txt` (o desde `datos.original.txt` si está en español) con las convenciones de 4.19; señalar al usuario todo lo dudoso; `--simular` de los dos importadores. | archivero | 94 (y revisión del usuario) | — (`entrada/` no se sube) |
| 98 | 4 · Datos | Con permiso del usuario: (si quiere, antes, sustituir las fotos de D-150) `npm run importar -- --reimportar --confirmar`, `npm run afirmaciones -- --reimportar --confirmar --revisado` (tras revisar con el usuario la lista de 9 puntos en los dos idiomas), `npm run validar`, criterios 204 y 290. Commit: `casos/`, `data/`, `creditos.html` y `creditos.es.html`. | archivero y usuario | 96, 97 | `datos: casos de los días 1 a 7 en dos idiomas` |
| 99 | 5 · Interfaz | `index.html` según 2.3 (3.0): portada nueva, selector de idioma, `#pantalla-instrucciones`, retirar `dialog#como-jugar` y lo retirado, `.cifra*`, `noscript` bilingüe (41, 265). | perito-visual | 91 | `feat: marcado de la portada nueva e instrucciones` |
| 100 | 5 · Interfaz | CSS: tarjetas con ilustraciones CSS, carpeta de cartón con dos páginas (una en móvil), casillas con aspa roja, recuadro de aviso, selector, R8, R19, R20, reduced motion; comprobar los glifos españoles de las fuentes (266, 268, 269). | perito-visual | 99 | `estilo: portada nueva, instrucciones y español` |
| 101 | 5 · Interfaz | `js/main.js` según 3.7 (3.0): idioma (arranque, selector, `replaceState`, repintado), `ABRIR_RETO`, `instrucciones`, `CAMBIAR_IDIOMA`, teclas por idioma, desplegable de prueba, enlace de créditos, compartir por idioma; retirar Cómo jugar y `&reto=` (54–60, 188–196, 270–280). | agente-de-campo | 90, 92, 98, 100 | `feat: portada nueva, instrucciones y dos idiomas` |
| 102 | 5 · Interfaz | Ajuste visual con el juego funcionando: 126, 182 y 267 en los 5 tamaños y los dos idiomas, contraste, foco, reduced motion (incluye lo pendiente de la 78). | perito-visual | 101 | `estilo: ajustes de la versión 3.0` |
| 103 | 6 · Revisión | Revisión completa contra la sección 8 (1–290), con atención a anti-trampas en los dos idiomas (47, 191, 204, 263, 265, 275, 281, 290), al intento común (272, 273), a la composición (267) y a restos de Cómo jugar, `ELEGIR_RETO`, `&reto=` y `.dato`. Sustituye a la 79. | asuntos-internos | 102 | — (no edita) |
| 104 | 6 · Revisión | Correcciones del informe, cada una por su agente (incluye la 80 y la 24). Después, publicar. | varios | 103 | según el caso |

Orden: 89 → 90 → P7 → 91 → 92 → 93 → 94 → 95 → 96 → 97 → 98 → 99 → 100 → 101 → 102 → 103 → 104 → publicar → P5 → 81 → 44.

## 9.11 Riesgos nuevos

- **R19. Peso doble** [D-158, DP-66]: cada mes de `data/facts/` pasa de unos 220 KB a unos 430 KB y el calendario crece unos 6,8 KB por día (unos 2,5 MB al año). Mitigación: 304 con `no-cache` y `ETag`; si pesa demasiado, archivos por idioma o calendario por meses en una versión futura (DP-26).
- **R20. Textos españoles más largos**: el español ocupa un 15–25 % más; portada, instrucciones y revelación pueden no caber. Mitigación: R20, límites iguales que obligan a acortar (DP-71) y comprobación en los dos idiomas (267).
- **R21. Desfase entre idiomas**: una traducción podría cambiar el sentido (una FACT en inglés dudosa en español, una cifra mal convertida). Mitigación: emparejamiento por `answer` (error), punto 9 de la lista de revisión y revisión del usuario en los dos idiomas antes de `--revisado`.
- **R22. Desplegable de día que navega al cambiar** [DP-68]: con el teclado, las flechas sobre el `select` cerrado recargan la página en cada pulsación en algunos navegadores. Aceptado porque el modo prueba es temporal.
- **R23. Instrucciones densas en móvil**: briefing, pasos, modos o normas con ejemplo y botón en 360 x 640 sin deslizar. Mitigación: R19 con orden de compresión; reserva R13.
- **R24. Preferencia de idioma fuera del almacén**: si `localStorage` falla, el jugador vuelve al idioma del navegador en cada carga (aceptado; no afecta al intento).

## 9.10 Cambios fuera de docs/ (los hace el usuario, requisito P7)

Texto propuesto para `CLAUDE.md` (sustituye a las líneas citadas; lo demás no cambia):

1. Línea de Images en "Reglas del juego": **"- Images (en español, Imágenes): modos Investigator (Investigador, sin límite, sin temporizador), Normal (3 s por imagen) y Bloodhound (Sabueso, 1 s por imagen). …"** (el resto de la línea igual).
2. Línea de Fact or Fake: **"- Fact or Fake (en español, ¿Dato o Bulo?): sin modos ni temporizador. Cada caso muestra una afirmación de una frase y los botones FACT y FAKE (teclas F y K); en español, DATO y BULO (teclas D y B); el jugador responde cuando quiera. … al empezar se avisa ("Leaving the page for more than a few seconds counts as a miss." o su versión en español). … La tarjeta lleva siempre la marca "identifAI-it · Fact or Fake?" ("identifAI-it · ¿Dato o Bulo?" en español)."**
3. Línea "Tras responder…": **"Images: el prompt en el idioma del jugador en las de IA, "Real photograph" ("Fotografía real") en las reales."**
4. Línea "Un solo intento al día por reto…": **"Recargar, cambiar de modo o cambiar de idioma no permite repetir: el intento, la racha y el progreso son comunes a los dos idiomas."**
5. Línea nueva tras la anterior: **"- Portada: logo, lema y selector de idioma EN | ES; "Case #N" con el tema; dos tarjetas (Images y Fact or Fake) que abren las instrucciones del reto, donde se elige el modo (Images) y se empieza con "Open the case". Ver las instrucciones no gasta el intento."**
6. Línea del texto compartido: **"- El texto compartido de cada reto ("identifAI-it Images #N" / "identifAI-it Imágenes #N" con el modo, "identifAI-it Fact or Fake #N" / "identifAI-it ¿Dato o Bulo? #N" sin modo), en el idioma del jugador, no revela…"**
7. Línea de accesibilidad: **"teclado (Images: R = real, I = IA, en los dos idiomas; Fact or Fake: F = fact, K = fake en inglés, D = dato, B = bulo en español)"**.
8. Línea del idioma: **"- Interfaz en inglés americano (en-US) y español de España (es-ES), con selector EN | ES. La primera vez se elige por el idioma del navegador (español si empieza por "es"; si no, inglés); después se recuerda en localStorage, y ?lang=es o ?lang=en lo fuerza. El idioma cambia todo lo que ve el jugador: textos, <html lang>, aria-labels, alt, temas, afirmaciones, verdades, detalles, prompts, créditos, texto compartido y fechas. Lo interno (spec, decisiones, comentarios, mensajes de los scripts y commits) se queda en español."**
9. Estructura, `index.html`: **"todas las pantallas (portada con elección de reto y selector de idioma, instrucciones de cada reto, partida, resultado, ya jugado)."** Y añadir **"creditos.html y creditos.es.html"** donde se citen los créditos.
10. Estructura, `data/calendario.json`: **"los 5 casos de Images de cada día y su tema en los dos idiomas (con las fichas ofuscadas en inglés y en español). Los de Fact or Fake van en un archivo por mes, data/facts/AAAA-MM.json (afirmaciones y aclaraciones ofuscadas en los dos idiomas), …"**
11. Estructura, `entrada/temas/…`: **"Junto a cada imagen de ia/ van un .txt con su prompt en español y un .en.txt con el prompt en inglés, los dos obligatorios. En la raíz de cada carpeta, tema.es.txt con el tema en español (una línea)."**
12. Estructura, afirmaciones: **"- entrada/temas/NN-tema/facts.en.txt y facts.es.txt (obligatorios los dos): las 5 afirmaciones del día en inglés y en español, en el mismo orden y con el mismo answer en cada bloque, con los campos answer (fact|fake), claim, truth y details. Cifras con unidades: en inglés, métrico con imperial entre paréntesis; en español, solo métrico. … el archivero convierte datos.txt en facts.en.txt y facts.es.txt."** (facts.txt deja de usarse.)
13. Anti-trampas, primera línea: **"- Nunca "real", "ia", "ai", "fake", "dato", "bulo", "falso", "falsa", "verdadero" ni "verdadera" ni la respuesta en nombres de archivo, rutas, alt, clases, ids ni atributos data-*. …"**
14. Anti-trampas, línea del DOM: **"… van ofuscados y con la misma longitud, en los dos idiomas."**
15. Agentes: **"- cronista: textos en js/textos.js, en inglés y en español."**
