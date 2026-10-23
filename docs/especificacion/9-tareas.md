# identifAI-it: especificación técnica, versión 1.3 · 9. Plan de tareas

Parte de la especificación 1.3 (índice en `docs/ESPECIFICACION.md`) [D-91].

Una tarea = un commit con mensaje en español (`tipo: descripción`). Ninguna empieza hasta que sus dependencias estén revisadas, y se delegan de una en una.

## 9.1 Tareas anteriores (1 a 43)

Las tareas 1 a 24 (versión 1.0/1.1), 25 a 29 (temas por día, 1.2), 30 a 37 (recorte, reimportación y previsualización) y 38 a 43 (modo prueba) tienen la descripción de la versión 1.2 (historial de git, commit `225c28a`). Según el registro, están hechas salvo:
- la **23**, revisión de asuntos internos, que pasa a hacerse sobre la 1.3 en la tarea 59;
- la **24**, correcciones;
- la **44**, apagado del modo prueba.

## 9.2 Tarea 44: apagado del modo prueba (se mantiene) [D-71]

| # | Tarea | Agente | Depende de | Commit |
|---|---|---|---|---|
| 44 | **Antes del lanzamiento (2026-11-01): poner `PRUEBAS_ABIERTAS = false` en `js/main.js` (una línea), probar y publicar.** Pasos: (1) cambiar solo esa línea; (2) `npm test`; (3) `npm run validar -- --estricto`; (4) criterios 121 y 54–60 con `npx serve`; (5) commit y publicación; (6) criterio 124 en Pages. Hacerlo el 2026-10-31 como tarde. | agente-de-campo (cambio y pruebas) y usuario (publicación) | 59 y pruebas con amigos | `feat: cerrar el modo prueba para el lanzamiento` |

## 9.3 Requisito previo de la versión 1.3

- **P1 (usuario)**: actualizar `CLAUDE.md` con los cambios de 9.5 y confirmar en persona las nuevas reglas (DP-33). Hasta entonces, las reglas de `CLAUDE.md` prevalecen y nadie implementa las tareas 45 a 59.
- **P2 (usuario)**: escribir los `.txt` de prompt junto a cada imagen generada de los 7 días en `entrada/temas/NN-…/ia/` (UTF-8, mismo nombre base). Hace falta antes de la tarea 53.

## 9.4 Tareas de la versión 1.3 [D-76 a D-91]

Orden recomendado y razonamiento [D-91]:
- El reparto del usuario (cronista → agente-de-campo → archivero → perito-visual) se mantiene, con un ajuste: **la tarea del agente-de-campo se parte en dos**.
  - Primero, los **módulos puros y sus tests** (no dependen del HTML).
  - **`main.js` va después del perito-visual**, porque solo se puede probar en el navegador con el `index.html` nuevo (ids de 2.3, `details`, `dialog` y sobre) y con el calendario versión 3 del archivero.
- El archivero va después de los módulos puros porque `importar.mjs` usa `ofuscarFicha`, `FICHA_MAX_BYTES` y `validarCalendario` (versión 3) de `js/diario.js` y `TEXTOS.fichas` del cronista.
- El perito-visual maqueta contra el contrato de la sección 2 sin esperar a `main.js`, y hace un último ajuste con el juego funcionando.

**Dependencias cruzadas**:
- `js/main.js` es solo del agente-de-campo; `index.html`, CSS y SVG son solo del perito-visual.
- El único punto de encuentro es el contrato de la sección 2 (ids, `data-*`, clases `.pantalla`, `.prueba-img`, `.boton-texto` y `.miniatura`, y el marcado exacto de las miniaturas, el sobre, la confesión y el diálogo). Cualquier cambio en él pasa por el inspector-jefe y DECISIONES.
- Los tests de `textos.js` los escribe el agente-de-campo (tarea 49) contra las claves de 3.1, no contra los valores que proponga el cronista.

**Entre la tarea 46 y la 57, el juego no funciona** (el `main.js` viejo con módulos nuevos, o el calendario versión 2 con `validarCalendario` versión 3): **no publicar en GitHub Pages hasta terminar la 58**. Los amigos que estén probando seguirán viendo la versión publicada.

| # | Tarea | Agente | Depende de | Commit |
|---|---|---|---|---|
| 45 | `js/textos.js` según 3.1 (1.3): modos nuevos (nombres exactos y descripciones), `como_jugar.titulo` y 4 pasos de 80 caracteres como máximo sin "Entendido", `partida.sobre_texto` y `sobre_anuncio`, grupo `confesion` (título exacto), `ficha.cerrar`, grupo `fichas` (`autentica` exacto y `sin_prompt`), `final.estados` con solo acierto y fallo, sin `veredictos.tiempo`/`oculta` ni claves antiguas, y la plantilla de compartir de la sección 7. Mostrar al usuario los textos nuevos para que los apruebe. | cronista | P1 | `feat: textos de la versión 1.3` |
| 46 | `js/diario.js`: `FICHA_BLOQUE`, `FICHA_MAX_BYTES`, `flujoFicha`, `ofuscarFicha`, `desofuscarFicha`, `validarCalendario` versión 3 y `casoDelDia` con `fichas` (3.2, 4.3.1) + `tests/diario.test.mjs` (criterios 8, 9, 115 y 139, con el vector de regresión fijado y copiado en DECISIONES). Actualizar los calendarios de ejemplo de todos los tests a la versión 3. | agente-de-campo | P1 | `feat: fichas ofuscadas y calendario versión 3` |
| 47 | `js/juego.js`: `MODOS`, `MODO_POR_DEFECTO`, `modoValido`, estado de 1.2 (`fichas`, `tapada`, `ficha`; sin `volverA` ni `vistoComoJugar`), tabla 1.3 (`AGOTADO` sella, sin `OCULTA`, `VER_COMO_JUGAR` ni `ENTENDIDO`), `estadoDeCodigo` y `recortarFicha` + `tests/juego.test.mjs` (criterios 11–19, 140 y 141). | agente-de-campo | 46 | `feat: modos nuevos, sellado y ficha en el estado` |
| 48 | `js/temporizador.js` (`TypeError` con duración no válida y `comprobar()`) + `tests/temporizador.test.mjs` (20–23, 141 y 142). `js/almacen.js` (`identifaiit.v2`, `VERSION`, `datosIniciales` sin `vistoComoJugar`, `cerrarAbandonada` con `F`) + `tests/almacen.test.mjs` (26–32 y 105). | agente-de-campo | 46 | `feat: temporizador de reloj y almacén v2` |
| 49 | `js/compartir.js` (`CUADROS` sin `⬛`) + `tests/compartir.test.mjs` (33–37) y `tests/textos.test.mjs` (38–40). | agente-de-campo | 45 | `feat: compartir con el modo y sin tiempo agotado` |
| 50 | `herramientas/temas.mjs`: `normalizarFicha`, `calendarioAnteriorValido` y `planificar` con `.txt` (4.6) + `tests/temas.test.mjs` (86 ampliado, 143–145). | archivero | P1 | `feat: fichas en la planificación del importador` |
| 51 | `herramientas/importar.mjs`: paso 3 (versión 2 → mensaje; con `--reimportar`, `calendarioAnteriorValido`), paso 5 ter (lectura UTF-8, normalización y avisos), `ofuscarFicha` en el paso 8, calendario versión 3, plan e informe sin mostrar prompts (4.4.2, 4.4.4). Criterios 69, 71, 92 y 100 con datos de prueba fuera de `entrada/` real. | archivero | 45, 46, 50 | `feat: importar fichas y calendario versión 3` |
| 52 | `herramientas/validar.mjs`: versión 3, descifrado y coherencia de fichas, `.txt` rastreados y aviso de generadas sin prompt (4.4.3). Criterios 66, 68 y 147. | archivero | 46, 50 | `feat: validar fichas del calendario` |
| 53 | Reimportación con permiso explícito del usuario (DP-18) y **antes del 2026-11-01**: (1) comprobar que el usuario ha escrito los `.txt` (P2); (2) `npm run importar -- --reimportar` y revisar con él el plan (avisos de fichas que faltan o se recortan, marcas de Gemini [D-66]); (3) `npm run importar -- --reimportar --confirmar`; (4) `npm run validar` y revisar los avisos de peso, mezcla y prompts; (5) criterio 146; (6) recordar la copia privada de `banco.json`. El commit incluye `casos/`, `data/` y `creditos.html` (idéntico si no cambian las fuentes); **nunca** `banco.json`, `banco.anterior.json`, `lote.json` ni nada de `entrada/`. | archivero | 51, 52, P2 | `datos: calendario versión 3 con fichas` |
| 54 | `img/ui/sobre.svg` (sobre de pruebas kraft con precinto y lacre, en el estilo forense del juego, 4:5, sin texto ni metadatos) y eliminar `img/ui/icono-tiempo.svg` (criterio 148). | perito-visual | P1 | `estilo: sobre de pruebas sellado` |
| 55 | `index.html` según 2.3 (1.3): `details#como-jugar`, sin `#pantalla-como-jugar` ni botones Cómo jugar y Entendido, radios `investigador|normal|perro`, `#prueba-sobre`, `#veredicto-confesion`, `#resultado-rachas` sin `#resultado-cuadros`, y `dialog#ficha` (criterio 41). | perito-visual | 45 | `feat: marcado de la versión 1.3` |
| 56 | CSS: composición sin deslizar según 2.6 (R1–R13: `100dvh`, avisos en el flujo, unidades de contenedor para la imagen 4:5, dos columnas en horizontal en portada, caso y resultado) y componentes nuevos (fichas de modo en una fila, `details`, sobre, confesión, miniaturas con icono en `::after`, diálogo y `::backdrop`, reduced motion). Maqueta probada con el marcado de 2.3 y textos de ejemplo. | perito-visual | 54, 55 | `estilo: pantallas sin deslizar y componentes nuevos` |
| 57 | `js/main.js` según 3.7 (1.3): desplegable (pasos y cierre al empezar), modo validado, temporizador solo si `MODOS[modo] !== null`, sellado (`data-tapada`, `hidden` de la imagen y del sobre, anuncio), anuncios por modo, `visibilitychange` sin `OCULTA` y con `comprobar()`, confesión recortada y Leer entera, miniaturas, diálogo (abrir, cerrar, foco y atajos bloqueados) y `cerrarAbandonada` con `F`. Sin tocar `PRUEBAS_ABIERTAS`. Probar con `npx serve` los criterios 24, 54–65, 106, 119–123, 129–138 y repetir 104–113. | agente-de-campo | 47, 48, 49, 53, 55 | `feat: partida de la versión 1.3` |
| 58 | Ajuste visual final con el juego funcionando: medir el criterio 126 en todos los estados y tamaños (también en modo prueba y con `#aviso-almacen`), 127, 128, 137 (diálogo con un prompt de 510 bytes), 138, contraste, foco y reduced motion. | perito-visual | 56, 57 | `estilo: ajustes de la versión 1.3` |
| 59 | Revisión completa de la versión 1.3 contra la sección 8 (informe BLOQUEANTE / IMPORTANTE / MENOR), con especial atención a los criterios 47, 136 y 146 (anti-trampas de las fichas) y al 126. Sustituye a la tarea 23. Después, correcciones (tarea 24), cada una por su agente. | asuntos-internos | 58 | — (no edita) |

Orden: P1 → 45 → 46 → 47 → 48 → 49 → 50 → 51 → 52 → (P2) → 53 → 54 → 55 → 56 → 57 → 58 → 59 → 24 → publicar → pruebas con amigos → 44.

**Calendario.** Hoy es el 2026-10-23 y el lanzamiento es el 2026-11-01:
- la **53** (reimportar) tiene que estar hecha antes del 2026-11-01, porque después ningún día del calendario se puede regenerar y los 7 primeros días se quedarían sin fichas (el juego no podría cargarlos: `validarCalendario` exige la versión 3);
- la **44** cierra el plan el 2026-10-31 como tarde.

Si no da tiempo, la alternativa es aplazar el lanzamiento (cambiar D-20, decisión del usuario).

Las tareas 50, 51 y 52 pueden empezar en paralelo con la 47 en cuanto la 46 esté revisada; la 54 y la 55, en cuanto la 45 esté revisada. Se mantiene la norma de delegar de uno en uno.

## 9.5 Cambios fuera de docs/ (los hace el usuario)

En `CLAUDE.md` (no lo toca ningún agente) [D-76]:
- **Reglas del juego**:
  - "Modos: fácil 7 s, medio 3 s, difícil 1 s por imagen. Tiempo agotado = fallo." pasa a "Modos: Investigador (sin límite), Normal (3 s) y Perro de presa (1 s) de observación por imagen. Al agotarse el tiempo, la imagen se tapa con un sobre de pruebas sellado y el jugador responde sin límite: no es fallo."
  - "Si la pestaña se oculta durante un caso, ese caso cuenta como fallo." pasa a "Ocultar la pestaña no penaliza: el tiempo de observación sigue corriendo."
  - "Al final: aciertos, mensaje policíaco según aciertos (0 a 5), racha y botón Compartir." pasa a añadir "…5 miniaturas que muestran la respuesta y la ficha de cada prueba (prompt o "Fotografía real")…".
  - "El texto compartido no revela qué imágenes eran IA." pasa a "…incluye el modo y no revela qué imágenes eran IA."
  - Añadir: "Todas las pantallas caben sin desplazar (100dvh) desde 360 x 640 y 640 x 360."
- **Stack**: "Móvil primero (360 px)" pasa a "Móvil primero (360 x 640, también en horizontal), sin scroll".
- **Estructura**:
  - `index.html` pasa a "portada (con Cómo jugar desplegable), partida, resultado, ya jugado".
  - `data/calendario.json` pasa a "los 5 casos de cada día, con fichas ofuscadas (versión 3)".
  - `img/ui/` pasa a incluir `sobre.svg`.
  - `entrada/`: describir `entrada/temas/NN-tema/{ia,real}/` (sustituye a `entrada/reales/` y `entrada/ia/`), con un `.txt` de prompt junto a cada imagen de `ia/`.
  - `docs/`: `docs/ESPECIFICACION.md` y `docs/especificacion/*.md` son la fuente de verdad técnica [D-91].
- **Anti-trampas**:
  - "La respuesta de un caso no existe en el DOM hasta que el jugador responde" pasa a "La respuesta y la ficha (prompt) de un caso no existen en el DOM hasta que el jugador responde".
  - Añadir: "Los prompts (.txt) viven solo en entrada/ y nunca se publican en claro: en el calendario van ofuscados y rellenados a la misma longitud".
  - Añadir: `herramientas/lote.json` y `herramientas/banco.anterior.json` van en `.gitignore`, como `banco.json` (pendiente desde la 1.2).
- Opcional: recordar que, hasta el 2026-11-01, `?prueba=1` abre el modo prueba (D-70).

En `.claude/` (con permiso del usuario):
- `agents/perito-visual.md`: "tres fichas: Fácil 7 s, Medio 3 s, Difícil 1 s" pasa a "Investigador, Normal 3 s y Perro de presa 1 s"; añadir el layout sin scroll, el `details`, el `dialog` y el sobre.
- `agents/agente-de-campo.md`: quitar "si la pestaña se oculta durante un caso, ese caso es fallo"; poner "ocultar la pestaña no penaliza; el temporizador sigue con el reloj".
- `agents/asuntos-internos.md`: "tiempo agotado = fallo, pestaña oculta = fallo" pasa a "tiempo agotado = prueba sellada y respuesta sin límite; pestaña oculta sin efecto; ficha ausente del DOM hasta responder"; y "360 px sin scroll horizontal" pasa a "sin scroll en 360 x 640, 640 x 360 y 1280 x 720".
- `agents/cronista.md`: quitar "3 para tiempo agotado"; añadir confesión, sobre, modos y fichas.
- `agents/inspector-jefe.md`: el ejemplo "en modo difícil" pasa a "en modo perro".
- `agents/archivero.md` y `commands/nuevo-lote.md`: lo pendiente de la 1.2 (`entrada/temas/`, `lote.json`, `--reimportar --confirmar`, `creditos.html` en el commit) y, además, los `.txt` de prompt, que nunca se copian, se muestran ni se suben.
