# identifAI-it: especificación técnica, versión 2.0 · 9. Plan de tareas, riesgos y cambios fuera de docs/

Parte de la especificación 2.0 (índice en `docs/ESPECIFICACION.md`) [D-91, D-114]. Incluye los ajustes D-115 (ausencia de más de 3 s), D-116 (titulares por mes) y D-117 (el modo prueba carga todos los meses), repartidos en las tareas que ya existían; no hay tareas nuevas por ellos.

Una tarea = un commit con mensaje en español (`tipo: descripción`). Ninguna empieza hasta que sus dependencias estén revisadas, y se delegan de una en una.

## 9.1 Tareas anteriores (1 a 59)

Las tareas 1 a 43 tienen la descripción de la 1.2 (commit `225c28a`) y las 45 a 59, la de la 1.3 (commit `e9abacf`). Según el registro (commits `7323117` y `5f8a9b1`), la 1.3 está implementada y los datos reimportados. Quedan:
- la **59** (revisión de asuntos internos de la 1.3) y la **24** (correcciones), que se funden con la revisión de la 2.0 (tareas 79 y 80);
- la **44** (apagado del modo prueba), que cambia de fecha (9.3).

## 9.2 Tarea urgente: aplazamiento provisional del juego publicado [D-97]

El juego publicado (1.3) tiene `lanzamiento: "2026-11-01"`: si no se hace nada, **el 2026-11-01 se abre al público** con solo Images, aunque el usuario ha aplazado el lanzamiento. La 2.0 no estará publicada para entonces (riesgo R1). La tarea 60 no cambia con D-115, D-116 ni D-117 (no toca Headlines).

| # | Tarea | Agente | Depende de | Commit |
|---|---|---|---|---|
| 60 | **Antes del 2026-10-31**, con permiso del usuario: (1) en `data/calendario.json` (versión 3, código 1.3), cambiar `lanzamiento` a `"2099-01-01"` y las 7 `fecha` a `2099-01-01` … `2099-01-07`, y lo mismo en las `fecha` de `herramientas/banco.json` (local); (2) en `herramientas/validar.mjs`, sustituir la comprobación `lanzamiento !== '2026-11-01'` por "fecha ISO válida" y el texto "(2026-11-01)" del aviso por la fecha del calendario; (3) `npm test`, `npm run validar`; (4) con `npx serve`: sin parámetros, `sin-casos`; con `?prueba=1`, los 7 días jugables; (5) commit y publicación. Sin cambios de código del juego. La tarea 72 sustituye después `2099-01-01` por `null`. | archivero (datos y `validar.mjs`) y usuario (publicación) | permiso del usuario | `datos: aplazar el lanzamiento (provisional)` |

## 9.3 Requisitos previos y tareas del usuario

- **P3 (usuario)**: actualizar `CLAUDE.md` y `.claude/` con 9.6 y confirmar en persona la 2.0, con D-115, D-116 y D-117 (DP-36). Hasta entonces nadie implementa las tareas 61 a 81.
- **P4 (usuario)**: escribir `entrada/titulares/NN-tema/noticias.txt` (formato de 4.9) y revisar la norma de contenido (4.13). Hace falta antes de la tarea 74 con contenido (sin contenido, la 74 no publica ningún archivo de titulares).
- **P5 (usuario)**: decidir la fecha de lanzamiento (DP-37). Hace falta antes de la tarea 81.

## 9.4 Tareas de la versión 2.0 [D-94 a D-117]

Flujo habitual: inspector-jefe (esta especificación) → cronista → agente-de-campo (módulos puros) → archivero → perito-visual → agente-de-campo (`main.js`) → perito-visual (ajuste) → asuntos-internos. Razones:
- el archivero necesita las funciones de ofuscación, `validarCalendario` versión 4, `validarTitulares`, `mesDeNumero` y `cargarTitulares` de `js/diario.js`, y los textos del cronista (créditos);
- [D-116] `lanzamiento.mjs` reparte los titulares por mes, así que necesita `unirMeses`, `repartirPorMes` y las funciones de archivo de `herramientas/titulares.mjs` (tarea 69): por eso la 69 pasa antes que la 67;
- [D-117] el modo prueba descubre los meses con un sondeo encadenado (`cargarTitularesPrueba`, 4.7.2), sin índice: ninguna herramienta cambia (las tareas 67 a 76 siguen igual) y solo cambian la 63 (funciones puras y de carga), la 77 (`main.js`) y la 79 (revisión);
- el perito-visual maqueta contra el contrato de la sección 2 sin esperar a `main.js`;
- `main.js` solo se puede probar con el `index.html` nuevo, el calendario versión 4 y archivos mensuales de titulares (reales o de prueba).

**Entre la tarea 62 y la 78 el juego no funciona** (`validarCalendario` versión 4 con datos de la versión 3, o `main.js` viejo con módulos nuevos): **no publicar hasta terminar la 78**. Lo publicado será el resultado de la tarea 60.

| # | Tarea | Agente | Depende de | Commit |
|---|---|---|---|---|
| 61 | `js/textos.js` según 3.1 (2.0): `portada.*` de retos, estados y regla (con "more than a few seconds", D-115); `como_jugar.pasos_titulares` (igual); grupo `titulares` (sello de IA exacto, `oculta` con el matiz de los segundos y **`aviso_oculta` exacto**, D-115); `final.reto` y `final.boton_volver`; `sin_casos.sin_lanzamiento`; `avisos.prueba`; las dos plantillas de compartir exactas; `creditos.*` de noticias. Mostrar los textos al usuario para que los apruebe. | cronista | P3 | `feat: textos de la versión 2.0` |
| 62 | `js/diario.js`, bloques: `flujoBytes`, `ofuscarBloque`, `desofuscarBloque`; `ofuscarFicha`/`desofuscarFicha` sobre ellos; `TEXTO_*`, `ofuscarTexto`, `desofuscarTexto`, `NOTICIA_*`, `ofuscarNoticia`, `desofuscarNoticia`, `urlFuenteValida`, `medioDeUrl` + tests (167–171, con los vectores de 4.8 fijados y copiados en DECISIONES). | agente-de-campo | P3 | `feat: bloques ofuscados de titulares` |
| 63 | `js/diario.js`, calendario y titulares: `FECHA_BASE_PRUEBA`, `numeroDelDia`, `fechaDelDia`, `validarCalendario` versión 4, `casoDelDia`, `casoDeNumero`; [D-116] `MES_PATRON`, `TITULARES_CARPETA`, `mesDeFecha`, `mesDeNumero`, `rutaTitulares`, `titularesVacios`, `validarTitulares(obj, mes)`, `titularesDelDia` y `titularesDeNumero` por mes, `cargarTitulares(fecha, pedir)`; [D-117] `titularesDelMes(meses, mes)`, `cargarTitularesPrueba(lanzamiento, pedir)` (sondeo en serie de 4.7.2), `diasDePrueba(calendario, meses)` con todos los meses, `diaDePrueba` (sin `diaPedido`) + tests (8, 9, 115, 149, 150, 172, 173, 211, 212, 222, 223). Pasar todos los calendarios de ejemplo de los tests a la versión 4. | agente-de-campo | 62 | `feat: calendario versión 4 y titulares por mes` |
| 64 | `js/juego.js`: `RETOS`, `RETO_POR_DEFECTO`, `retoValido`, `retoDePrueba`, [D-115] `OCULTA_MAX_MS`, `ocultacionEsFallo`, `medirOculta`, estado 1.2 (2.0), tabla 1.3 (2.0, con `VOLVIO` y sin `OCULTA`) + `tests/juego.test.mjs` (11–19, 157–166, 206–208). | agente-de-campo | 63 | `feat: dos retos en la máquina de estados` |
| 65 | `js/almacen.js` versión 3 por reto + `tests/almacen.test.mjs` (26–32, 174–176). | agente-de-campo | 64 | `feat: almacén v3 con progreso por reto` |
| 66 | `js/compartir.js` (`nombreModo` opcional) + `tests/compartir.test.mjs` (33–37, 177, 179) y `tests/textos.test.mjs` (38–40, 180). | agente-de-campo | 61 | `test: compartir y textos de la versión 2.0` |
| 69 | `herramientas/titulares.mjs` (4.11), con [D-116] `ARCHIVO_MES`, `unirMeses`, `repartirPorMes`, `leerTitularesMensuales` y `escribirTitularesMensuales` + `tests/titulares.test.mjs` (197–199, 213; las funciones de archivo, con carpetas temporales). | archivero | 63 | `feat: análisis de noticias y archivos mensuales` |
| 67 | `herramientas/temas.mjs` (`planificar` y `comprobarReimportacion` con lanzamiento `null`, `calendarioAnteriorValido` 2–4, `analizarArgumentosLanzamiento`, `comprobarCambioLanzamiento`, `migrarCalendario`, `migrarBanco`) y `herramientas/lanzamiento.mjs` con [D-116] el reparto de `data/titulares/` por mes (4.2.1) + script en `package.json` + `tests/lanzamiento.test.mjs` y `tests/temas.test.mjs` (145, 151, 152; el 215 se prueba en la 73 con datos de prueba). | archivero | 63, 69 | `feat: fecha de lanzamiento configurable` |
| 68 | `herramientas/importar.mjs`: sin `LANZAMIENTO`, banco versión 3, calendario versión 4, mensajes de 4.4.2 (69, 92 y 100 con datos de prueba). | archivero | 67 | `feat: importar con calendario versión 4` |
| 70 | `herramientas/creditos.mjs`: `mediosDeTitulares` sobre la unión de todos los meses, sección de noticias (2.7, 4.5) + tests (203, 221). | archivero | 61, 63, 69 | `feat: créditos de noticias` |
| 71 | `herramientas/validar.mjs`: versión 4, banco versión 3, lanzamiento sin fecha fija, `PRUEBAS_ABIERTAS` (4.4.3), calendario corto por reto y titulares por mes (4.12) (66, 68, 154, 156, 202, 203, 216). Quitar `2026-11-01` de todo `herramientas/` y del comentario de `js/main.js` (este último, en la 77). | archivero | 67, 69, 70 | `feat: validar la versión 2.0` |
| 72 | Datos, con permiso del usuario: `npm run lanzamiento -- --sin-fecha` (calendario versión 4 con `lanzamiento: null`, banco versión 3; `data/titulares/` aún sin archivos), `npm run validar` y criterio 153. El commit incluye solo `data/calendario.json`. | archivero | 68, 71 | `datos: calendario versión 4 sin fecha de lanzamiento` |
| 73 | `herramientas/importar-titulares.mjs` (4.10, con escritura solo de los meses afectados) + script `titulares` en `package.json` (200, 201, 214 y 215 con datos de prueba fuera de la `entrada/` real y en una copia de `data/`). | archivero | 69, 70, 71 | `feat: importador de titulares` |
| 74 | Datos: si P4 está listo, `npm run titulares -- --simular`, revisión con el usuario de la lista de 4.13, `npm run titulares -- --revisado` (crea `data/titulares/2000-MM.json` mientras no haya lanzamiento), `npm run validar` (avisos de longitud y mezcla), criterios 204 y 220. Commit: `data/titulares/` y `creditos.html`. Sin P4, no se crea ningún archivo y la tarea queda pendiente (la 77 se prueba con datos de prueba locales, sin commit). | archivero | 73 (y P4 si hay contenido) | `datos: titulares` |
| 75 | `index.html` según 2.3 (2.0): selector de reto, `#portada-regla`, `#portada-empezar-texto`, [D-115] `#caso-aviso`, `#recorte`, `#veredicto-fuente`, botones Back, `#resultado-reto`, `#ya-jugado-reto`, `#sin-casos-texto`, ampliación de `dialog#ficha` (41, 181). | perito-visual | 61 | `feat: marcado de la versión 2.0` |
| 76 | CSS: R8 (portada con retos), R14–R18 (recorte, [D-115] `#caso-aviso` en la cabecera, veredicto de Headlines con sello de IA, resultado numerado, textos largos), bloqueo de selección en `#recorte`, `data-reto`, reduced motion. Maqueta con textos de ejemplo de 110 y 280 caracteres, con y sin el aviso. | perito-visual | 75 | `estilo: pantallas de Headlines` |
| 77 | `js/main.js` según 3.7 (2.0): [D-116] carga del calendario y del archivo de titulares del mes de la fecha efectiva en paralelo en el juego normal y la previsualización; [D-117] en modo prueba, el calendario y después todos los meses con `cargarTitularesPrueba`, selector con `diasDePrueba(calendario, meses)` y titulares del día con `titularesDelMes` (sin segunda carga); recarga en `MEDIANOCHE`; `CARGADO` con `retos`, portada (estados, Start, modos o regla, pasos), Headlines (recorte, `PINTADA`, [D-115] medida de la ausencia y `VOLVIO`, `#caso-aviso` y su anuncio, veredicto con fuente o confesión, resultado y diálogo), bloqueo de copia, Back, almacén v3 por reto, otras pestañas por reto, compartir por reto, modo prueba con `&reto=` y `avisos.prueba`. Sin tocar el valor de `PRUEBAS_ABIERTAS`. Probar 54–65, 104–113, 106, 119, 120, 155, 184–196, 209, 210, 217–219. | agente-de-campo | 64, 65, 66, 72, 74, 75 | `feat: segundo reto Headlines` |
| 78 | Ajuste visual final con el juego funcionando: 126 y 182 en todos los estados y tamaños (también la prueba 1 con `#caso-aviso`), 183, 186, 187, contraste, foco y reduced motion. | perito-visual | 76, 77 | `estilo: ajustes de la versión 2.0` |
| 79 | Revisión completa contra la sección 8 (informe BLOQUEANTE / IMPORTANTE / MENOR), con atención a 47, 136, 163, 190–192, 204 y 209 (anti-trampas), a 182 (layout), a 212–219, 222 y 223 (archivos mensuales y su carga) y a la norma de contenido. Sustituye a la 59. | asuntos-internos | 78 | — (no edita) |
| 80 | Correcciones del informe, cada una por su agente (incluye la 24). Después, publicar. | varios | 79 | según el caso |
| 81 | Con la fecha decidida (P5): `npm run lanzamiento -- AAAA-MM-DD` (reparte `data/titulares/` en los meses reales, 4.2.1), `npm run validar`, comprobar que el juego normal sigue en `sin-casos` hasta esa fecha y que `?fecha=` (local) la respeta y carga el mes correcto, y que `?prueba=1` sigue encontrando todos los meses ya repartidos (criterio 219 con los nombres reales); commit (con `data/calendario.json` y los archivos añadidos y borrados de `data/titulares/`) y publicación. | archivero y usuario | 80, P5 | `datos: fecha de lanzamiento` |
| 44 | **Antes de la fecha de lanzamiento (el día anterior como tarde):** `PRUEBAS_ABIERTAS = false` en `js/main.js` (una línea), `npm test`, `npm run validar -- --estricto`, criterios 121, 54–60 y 188–196 con `npx serve`, commit y publicación, criterio 124 en Pages. | agente-de-campo y usuario | 81 | `feat: cerrar el modo prueba para el lanzamiento` |

Orden: 60 (ya) → P3 → 61 → 62 → 63 → 64 → 65 → 66 → 69 → 67 → 68 → 70 → 71 → 72 → 73 → 74 → 75 → 76 → 77 → 78 → 79 → 80 → publicar → pruebas con amigos → P5 → 81 → 44.

Paralelismo posible (manteniendo la delegación de uno en uno): la 69 tras la 63; la 75 y la 76 tras la 61.

## 9.5 Riesgos

- **R1. Lanzamiento automático del 2026-11-01** con la 1.3 publicada. Mitigación: tarea 60 antes del 2026-10-31. A 2026-10-26, `data/calendario.json` sigue en la versión 3 con `lanzamiento: "2026-11-01"`: la tarea 60 sigue pendiente.
- **R2. Spoilers del modo prueba**: con el lanzamiento aplazado, `?prueba=1` estará abierto más tiempo y ahora enseña también las respuestas, fuentes y prompts de Headlines (D-70). Quien pruebe conocerá esos días. Desde D-117, el modo prueba descarga además todos los meses, pero no revela nada nuevo: los archivos ya eran públicos y siguen ofuscados.
- **R3. Titulares auténticos buscables**: cualquiera puede teclear el titular en un buscador (en otro dispositivo o ventana). El bloqueo de copia y la penalización por ausencia son frenos casuales, no seguridad; es una debilidad inherente al reto. Mitigación editorial: elegir titulares poco citados y redactar los de IA con el mismo estilo.
- **R4. Falsos fallos por ausencia** [D-115]: con el margen de 3 s, un vistazo a una notificación, una llamada rechazada o un bloqueo breve ya no penalizan; siguen contando como fallo las ausencias largas involuntarias (bloqueo automático de pantalla por inactividad mientras se lee, una llamada atendida). Se avisa en Cómo jugar, en `#portada-regla` y en la prueba 1 (`#caso-aviso`). Mejora posterior posible: `navigator.wakeLock` durante la pregunta (DP-41, no adoptada).
- **R5. Desinformación por capturas**: una noticia de IA en fase pregunta no lleva el sello. Mitigación: `#recorte-marca` fija en la tarjeta (DP-44) y la norma de contenido (4.13).
- **R6. Legal**: citar titulares y entradillas de terceros y enlazarlos (DP-43, resuelta con su recomendación: consultar antes del lanzamiento si hay dudas).
- **R7. Peso de los datos** [D-116, D-117]: el juego normal descarga como mucho un mes de Headlines (unos 320 KB, 4.7.3) por visita. El modo prueba descarga todos los meses publicados (unos 320 KB cada uno), lo que solo afecta a quien prueba antes del lanzamiento. El calendario de Images sigue siendo un archivo único (1,25 MB al año, creciendo); si molesta, partirlo también por meses en una versión futura (DP-26).
- **R8. Enlaces rotos**: las fuentes pueden desaparecer. Se aceptan URL de archivos web (`https://web.archive.org/...`), que cumplen `urlFuenteValida`.
- **R9. Delatores de longitud y estilo**: además de la longitud media (avisos al 25 %), el estilo (comillas tipográficas, mayúsculas de titular, cifras exactas) puede delatar a los de IA. Revisión humana.
- **R10. Migración de datos**: la tarea 72 debe hacerse antes de publicar la 2.0; publicar código 2.0 con el calendario versión 3 deja el juego en `error`.
- **R11. Portada más cargada**: el selector de reto y el modo prueba ajustan el espacio a 360 x 640; R8 da al perito un orden de compresión (lema primero).
- **R12. Ausencias cortas repetidas** [D-115]: como las ausencias no se acumulan, un jugador puede salir varias veces menos de 3 s (por ejemplo, para pegar el titular en un buscador de otra pestaña, aunque el texto no se puede copiar). Es lo pedido ("más de 3 segundos seguidos"); 3 s apenas dan para teclear y leer un resultado. Si se viera abuso, la alternativa sería acumular las ausencias de una misma noticia.
- **R13. Reparto por mes y cambio de lanzamiento** [D-116]: cambiar `lanzamiento` mueve los días de Headlines de archivo (añade y borra archivos en `data/titulares/`). Si se edita `lanzamiento` a mano, o se publica el calendario sin los archivos repartidos, Headlines queda sin casos en esos días (no muestra datos equivocados) y `validar` falla. Mitigación: solo `npm run lanzamiento`, y commit conjunto de `data/calendario.json` y `data/titulares/`.
- **R14. Modo prueba con muchos meses** [D-117] (sustituye al riesgo de selector incompleto, DP-51 resuelta): las peticiones van en serie, así que con muchos meses preparados `iniciando` tarda más en el modo prueba (una petición por mes) y descarga más datos (R7). Además, si la cadena se rompe (falta un archivo intermedio o quedó mal repartido, R13), el modo prueba no ve los meses posteriores; `validar` lo detecta antes de publicar. El 404 final que aparece en la consola del navegador es normal.

## 9.6 Cambios fuera de docs/ (los hace el usuario)

`CLAUDE.md` (no lo toca ningún agente). Siguen pendientes los de la 1.3 (lista de la 1.3, commit `e9abacf`) y D-93 (idioma), y la 2.0 añade:
- **Descripción**: "Juego web diario (estilo Wordle) con dos retos: Images (5 imágenes al día, REAL o IA) y Headlines (5 noticias al día: titular y entradilla, REAL o IA). Temática policíaca / forense oscura."
- **Reglas del juego**:
  - "5 casos al día, los mismos para todos" pasa a "Cada reto tiene 5 casos al día, los mismos para todos; la mezcla real/IA varía cada día (de 1 a 4 de IA)."
  - Los modos (Investigator, Normal 3 s, Bloodhound 1 s), el sellado y la precarga solo valen para Images.
  - "Si la pestaña se oculta durante un caso, ese caso cuenta como fallo" pasa a: "Images: ocultar la pestaña no penaliza. Headlines: si la pestaña sigue oculta más de 3 segundos seguidos antes de responder, ese caso cuenta como fallo (las ausencias más cortas no cuentan)." [D-115]
  - Añadir: "Headlines no tiene modos ni temporizador; el texto no se puede seleccionar ni copiar (freno casual). Tras responder, la noticia real enlaza a su fuente y la de IA muestra el sello AI-GENERATED · NOT A REAL STORY y su prompt."
  - "Un solo intento al día" pasa a "Un solo intento al día por reto (se pueden jugar los dos). Recargar o cambiar de modo no permite repetir."
  - "Al final: aciertos, mensaje, racha y Compartir" pasa a "…racha propia de cada reto y Compartir; el texto compartido no revela qué casos eran IA ni incluye titulares."
  - Añadir: "El lanzamiento de los dos retos es conjunto; la fecha está en data/calendario.json (`lanzamiento`, null mientras no se decida) y solo se cambia con npm run lanzamiento."
- **Stack**: "Interfaz en español de España" pasa a "Interfaz solo en inglés americano (en-US); todo lo interno, en español" (D-93).
- **Estructura**: añadir `data/titulares/AAAA-MM.json` (Headlines, ofuscado, un archivo por mes; el juego normal solo carga el del mes en curso y el modo prueba, todos) [D-116, D-117], `entrada/titulares/NN-tema/noticias.txt`, `herramientas/titulares.mjs`, `importar-titulares.mjs` y `lanzamiento.mjs`, y `docs/especificacion/4b-titulares.md`.
- **Anti-trampas**:
  - "La respuesta de un caso no existe en el DOM hasta que el jugador responde" pasa a "La respuesta, la ficha, la fuente y el prompt de un caso no existen en el DOM hasta que el jugador responde; en Headlines, solo está en el DOM la noticia actual."
  - Añadir: "Titulares, entradillas, fuentes y prompts de Headlines solo están en claro en entrada/titulares/ (en .gitignore); en data/titulares/ van ofuscados y rellenados a longitud fija."
  - Añadir la **norma de contenido** de 4.13 (texto exacto).
- **Opcional**: "Hasta el lanzamiento, ?prueba=1 abre el modo prueba (D-70, D-110)."

En `.claude/` (con permiso del usuario):
- `agents/archivero.md`: la norma de contenido (4.13, texto exacto), `npm run titulares` con `--simular` y `--revisado`, el formato de `noticias.txt`, `npm run lanzamiento` (que reparte `data/titulares/` por mes), que `data/titulares/` se commitea entero (añadidos y borrados) y que nunca muestra ni sube titulares, URL ni prompts en claro.
- `agents/cronista.md`: grupo `titulares` (con `aviso_oculta` exacto), estados de la portada, pasos de Cómo jugar por reto y las dos plantillas.
- `agents/perito-visual.md`: selector de reto, recorte con bloqueo de selección, `#caso-aviso`, sello de IA, resultado numerado.
- `agents/agente-de-campo.md`: en Headlines, la ausencia se mide al volver y solo cuenta si supera `OCULTA_MAX_MS` (evento `VOLVIO`); carga del mes de titulares (en modo prueba, todos los meses con `cargarTitularesPrueba`, D-117); almacén v3 por reto.
- `agents/asuntos-internos.md`: revisar los criterios 163, 190–192, 204, 209, 212–219, 222 y 223 y la norma de contenido.
- `commands/nuevo-lote.md`: añadir el flujo de Headlines.
