# identifAI-it: registro de decisiones

Cada decisión ocupa una línea. La especificación (`docs/ESPECIFICACION.md`, versión 1.1) las cita como [D-nn].

Para cambiar una decisión:
1. Añade una entrada nueva con fecha.
2. Marca la antigua como MODIFICADA o SUPERADA.
3. Pide al inspector-jefe que actualice la especificación.

## Decisiones tomadas

### 2026-10-18 · Diseño inicial

- D-01 · El prototipo actual de `index.html` (sustitución de imágenes propias, ids `bReal`/`bIA`, campo `ai` en claro) se descarta entero y se rehace según la sección 2.
- D-02 · La verdad y el voto se nombran `autentica`/`generada` (o `0`/`1`) en código, datos y marcado; "REAL" e "IA" solo aparecen como texto visible.
- D-03 · Las pantallas son `<section hidden>` y los estados van en atributos `data-*`, nunca en clases.
- D-04 · Un único estado, gestionado por la función pura `transicion(estado, evento)` de `juego.js`; efectos y DOM solo en `main.js`.
- D-05 · El veredicto es una fase de la pantalla `caso`, no una pantalla aparte.
- D-06 · Ocultar la pestaña durante la pregunta da el código `O`: cuenta como fallo y tiene veredicto propio ("oculta").
- D-07 · Ocultar la pestaña en la cuenta atrás la reinicia desde 3; en el resto de pantallas no tiene efecto.
- D-08 · El temporizador arranca en el segundo `requestAnimationFrame` tras insertar la imagen ya decodificada; los votos anteriores se ignoran.
- D-09 · `main.js` rellena los textos mediante `data-texto="grupo.clave"`; en el HTML solo hay marcadores.
- D-10 · Una sola clave de localStorage, `identifaiit.v1`, con ajustes, partidas por fecha, racha y mejor racha; nunca se guarda la verdad ni el voto.
- D-11 · Si localStorage falla, se juega en memoria con un aviso y sin otra protección anti-repetición.
- D-12 · Compartir usa `navigator.share`; si no está, el portapapeles; si tampoco, un área de texto seleccionada.
- D-13 · En el texto compartido, tiempo agotado y pestaña oculta usan el mismo cuadro `⬛`.
- D-14 · La función de ofuscación vive en `js/diario.js` y el generador de calendario la reutiliza.
- D-15 · `package.json` lleva `"type": "module"` (confirmado por el usuario).
- D-16 · La precarga empieza al pulsar Empezar, no al abrir la portada.
- D-17 · En modo difícil no se anuncia la cuenta atrás por `aria-live`; en fácil y medio se anuncia cada segundo entero.
- D-18 · Se acepta que cambiar la hora del dispositivo permita adelantar o falsear días (no hay servidor).
- D-19 · La pantalla de resultado incluye la revisión de las 5 pruebas; `ya-jugado` no la repite.

### 2026-10-18 · Respuestas del usuario a las decisiones pendientes

- D-20 · (antes DP-1) Fecha de lanzamiento: `2026-11-01`.
- D-21 · (antes DP-2, CAMBIO) `herramientas/banco.json` va en `.gitignore` y existe solo en local; el calendario sigue publicándose.
- D-22 · (antes DP-3) Se acepta que la ofuscación solo frene la inspección casual y que el calendario publique días futuros.
- D-23 · (antes DP-4) Las palabras prohibidas se comprueban por palabra completa, con `identifAI-it` como única excepción literal; los ids aleatorios, además, por subcadena.
- D-24 · (antes DP-5) Si un día no tiene caso, se muestra la pantalla "sin casos hoy"; no se reciclan días.
- D-25 · (antes DP-6) La racha cuenta los días consecutivos con partida terminada, sea cual sea la puntuación; un día sin casos la rompe.
- D-26 · (antes DP-7) El intento se gasta al terminar la cuenta atrás; si se recarga a mitad, las pruebas pendientes cuentan como `O`.
- D-27 · (antes DP-8) Tras cada veredicto se avanza a mano (Siguiente o Enter).
- D-28 · (antes DP-9) El día de lanzamiento es el Caso nº 1.
- D-29 · (antes DP-10, CAMBIO; **MODIFICADA por D-40** en cuanto a la licencia de Special Elite) Fuentes woff2 propias en `fonts/` (Oswald 600 y Special Elite 400), con licencias OFL; prohibido cualquier CDN. Las consigue el archivero.
- D-30 · (antes DP-11) Plantilla exacta del texto compartido según la sección 7.
- D-31 · (antes DP-12) El marcador "Aciertos: n" está visible durante la partida.
- D-32 · Un único intento al día para los tres modos: la partida se guarda por fecha (confirmado por el usuario).
- D-33 · Especificación cerrada como versión 1.0.

### 2026-10-18 · Consecuencias técnicas de D-21 y D-29

- D-34 · Sin `banco.json`: `generar-calendario`, `importar` y `creditos` se detienen con código 1 (salvo que `casos/` esté vacío, o con `--banco-nuevo` en `importar`); `validar` avisa, omite las comprobaciones del banco y solo falla con `--estricto`.
- D-35 · (antes DP-13; **MODIFICADA por D-39**) `importar` genera un archivo público de créditos con las fuentes y licencias agregadas, sin relación con imágenes concretas. El formato `CREDITOS.md` quedó sustituido por `creditos.html`.
- D-36 · `index.html` (y también `creditos.html`) lleva la CSP `default-src 'self'`, así que no hay estilos en línea ni URL `data:` en CSS.

### 2026-10-18 · Enlace de créditos (ajustes dentro de la versión 1.0, a petición del usuario)

- D-37 · (**MODIFICADA por D-39**) Pie `footer#portada-pie` con `a#portada-creditos`: discreto, 14 px como mínimo, contraste AA, subrayado y área táctil de 44 x 44 px. Ya no apunta a `CREDITOS.md`, ni abre en otra pestaña, ni usa el texto `portada.nueva_pestana`.
- D-38 · (**SUPERADA por D-39**) Se creaba `.nojekyll` para que Pages sirviera `CREDITOS.md` sin convertirlo, y había un `CREDITOS.md` provisional. Ya no aplica, como tampoco el riesgo de que el navegador mostrara o descargara el `.md`.
- D-39 · Los créditos pasan a ser `creditos.html` en la raíz. Es una página estática sin JS, con las mismas fuentes y CSS del juego, la CSP del juego y landmarks, y un enlace "Volver a la portada" a `index.html`. La genera `herramientas/creditos.mjs` con los textos de `TEXTOS.creditos` y escapando en HTML la fuente y la licencia. El enlace de la portada apunta a `creditos.html` y se abre en la misma pestaña. El archivero crea una versión provisional en la tarea 1. `.nojekyll` **se mantiene**: es inofensivo y garantiza que Pages publique los archivos tal cual, sin pasar por Jekyll, como corresponde a un proyecto sin build.

### 2026-10-19 · Licencia de Special Elite y revisión de resultados (versión 1.1, decisiones del usuario)

- D-40 · (modifica D-29) Special Elite se mantiene, pero su licencia es la **Apache License 2.0**, no la SIL OFL (lo confirma el paquete oficial de @fontsource). Oswald sigue con la SIL OFL 1.1. El texto completo de la licencia está en `fonts/LICENSE-special-elite.txt` (sustituye a `fonts/OFL-special-elite.txt`); `TIPOGRAFIAS`, `creditos.html` y `validar.mjs` usan esa ruta.
- D-41 · Claves nuevas de `textos.js`: `final.estado_prueba` ("Prueba {i}: {estado}") y `final.estados` (acierto, fallo, tiempo agotado, pestaña oculta). Cada `li` de `#resultado-revision` lleva miniatura, estado para lectores de pantalla y "Era: …", con el icono puesto por CSS (`li::after`). Se recogen además en 2.3 los ajustes ya hechos en `index.html`: `#caso-escena`, `label` de `#compartir-manual`, `data-foco` en párrafos, `span.boton-texto` en los votos, `#veredicto-icono` como `span` con fondo CSS y `role="img"` en `#resultado-cuadros`.
- D-42 · Especificación subida a la versión 1.1 (2026-10-19) con los ajustes D-40 y D-41.
- D-43 · (2026-10-19, ajuste menor, sin subir versión) Clave nueva `final.cuadros_etiqueta` ("{aciertos} aciertos de 5") para el `aria-label` de los cuadros, y `role="img"` en `#ya-jugado-cuadros` igual que en `#resultado-cuadros`. Se reflejan en 2.3 y 3.1.
- D-44 · Norma de versionado: los ajustes pequeños (una clave de texto, un atributo, un ajuste de marcado) se apuntan solo en este archivo y se reflejan en la especificación sin cambiar su número de versión. La versión sube únicamente cuando cambia el comportamiento del juego. Los cambios de una línea los puede hacer y anotar directamente quien los detecta, sin pasar por el inspector-jefe.

### 2026-10-19 · Preparación de la implementación de la lógica

- D-45 · (recordatorio, sin cambio de comportamiento) `docs/muestras.html` es una página de trabajo del diseño y **debe borrarse antes del lanzamiento**. `validar` y la revisión final deben comprobar que ya no existe.
- D-46 · (**TEMPORAL**) Para probar la lógica antes del primer lote real se crean datos de prueba: 5 imágenes WebP de color plano numeradas (1080 x 1350, sin metadatos, generadas por código) en `casos/` y un `data/calendario.json` provisional con los casos de hoy (2026-10-19) y mañana (2026-10-20). Ese calendario tiene `lanzamiento` 2026-10-19 (hoy es el caso 1 y mañana el 2) solo para pruebas y **no cumple D-20**; los dos días reutilizan las mismas 5 imágenes con distinto orden y clave. Ambos conjuntos de archivos se sustituyen por el primer lote real (tarea 18) y no deben publicarse.

- D-47 · (corrige la sección 7 y el criterio 34) El ejemplo literal del texto compartido pasa a `3/5 🟩🟩🟥🟩⬛`, porque `AAFAT` tiene 3 aciertos. `textoCompartir` no recibe `aciertos`: los calcula siempre contando las `A` de `resultados`.
- D-48 · (ajuste menor, D-44) `#pantalla-ya-jugado` lleva `p#ya-jugado-texto` con `data-texto="ya_jugado.texto"` justo después del `h2`, para mostrar ese texto. Lo rellena main.js con el resto de `data-texto`.
- D-49 · (ajuste menor, D-44) Clave nueva `final.alt_prueba` ("Prueba {n}") para el `alt` de las miniaturas de `#resultado-revision`; sustituye al literal que había en main.js.
- D-50 · Confirmado que `validarCalendario` solo comprueba la estructura; la comprobación de `lanzamiento === "2026-11-01"` [D-20] queda para `validar.mjs`. `sharp` está en `devDependencies` de `package.json`, no en `dependencies`.

## DECISIONES PENDIENTES

Ninguna.
