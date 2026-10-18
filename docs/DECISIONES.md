# identifAI-it: registro de decisiones

Cada decisión ocupa una línea. La especificación (`docs/ESPECIFICACION.md`, versión 1.0) las cita como [D-nn]. Para cambiar una decisión: añadir una entrada nueva con fecha, pedir al inspector-jefe que actualice la especificación y subir su versión.

## Decisiones tomadas

### 2026-10-18: diseño inicial

- D-01 · El prototipo actual de `index.html` (sustitución de imágenes propias, ids `bReal`/`bIA`, campo `ai` en claro) se descarta entero y se rehace según la sección 2.
- D-02 · Verdad y voto se nombran `autentica`/`generada` (o `0`/`1`) en código, datos y marcado; "REAL" e "IA" solo aparecen como texto visible.
- D-03 · Las pantallas son `<section hidden>` y los estados van en atributos `data-*`, nunca en clases.
- D-04 · Estado único gestionado por la función pura `transicion(estado, evento)` de `juego.js`; efectos y DOM solo en `main.js`.
- D-05 · El veredicto es una fase de la pantalla `caso`, no una pantalla aparte, para que el sello caiga sobre la imagen.
- D-06 · Ocultar la pestaña durante la pregunta da el código `O`: cuenta como fallo y tiene veredicto propio ("oculta").
- D-07 · Ocultar la pestaña en la cuenta atrás la reinicia desde 3; en el resto de pantallas no tiene efecto.
- D-08 · El temporizador arranca en el segundo `requestAnimationFrame` tras insertar la imagen ya decodificada; los votos anteriores se ignoran.
- D-09 · `main.js` rellena los textos mediante `data-texto="grupo.clave"`; el HTML solo lleva marcadores `[[grupo.clave]]`.
- D-10 · Una sola clave de localStorage (`identifaiit.v1`) con ajustes, partidas por fecha, racha y mejor racha; nunca se guarda la verdad ni el voto.
- D-11 · Si localStorage falla, se juega en memoria con un aviso y sin más mecanismo anti-repetición (no hay servidor).
- D-12 · Compartir usa `navigator.share`; si no está, el portapapeles; si tampoco, un área de texto seleccionada.
- D-13 · Tiempo agotado y pestaña oculta comparten el cuadro `⬛` en el texto compartido.
- D-14 · La función de ofuscación vive en `js/diario.js` y la reutiliza el generador de calendario (una sola implementación).
- D-15 · `package.json` lleva `"type": "module"` para que `node --test` importe `js/*.js` sin build (confirmado por el usuario).
- D-16 · La precarga empieza al pulsar Empezar (pantalla `cargando`), no al abrir la portada.
- D-17 · En modo difícil no se anuncia la cuenta atrás por `aria-live`; en fácil y medio se anuncia cada segundo entero.
- D-18 · Se acepta que cambiar la hora del dispositivo permita adelantar o falsear días, porque no hay servidor.
- D-19 · La pantalla de resultado incluye la revisión de las 5 pruebas con su respuesta; `ya-jugado` no la repite.

### 2026-10-18: respuestas del usuario a las decisiones pendientes

- D-20 · (antes DP-1) Fecha de lanzamiento: `2026-11-01`. Aprobada.
- D-21 · (antes DP-2, CAMBIO) `herramientas/banco.json` va en `.gitignore` y queda solo en local; el calendario se sigue publicando. Las herramientas avisan con claridad si falta el banco.
- D-22 · (antes DP-3) Aceptado que la ofuscación XOR + base64 solo frena la inspección casual y que el calendario publica días futuros.
- D-23 · (antes DP-4) Las palabras prohibidas se comprueban por palabra completa, con `identifAI-it` como única excepción literal; los ids aleatorios, además, por subcadena. Aprobada.
- D-24 · (antes DP-5) Si un día no tiene caso, se muestra la pantalla "sin casos hoy" y no se reciclan días. Aprobada.
- D-25 · (antes DP-6) Racha = días consecutivos con la partida terminada, sea cual sea la puntuación; un día sin casos también la rompe. Aprobada.
- D-26 · (antes DP-7) El intento se gasta al terminar la cuenta atrás; al recargar a mitad, las pruebas sin responder cuentan como fallo (`O`). Aprobada.
- D-27 · (antes DP-8) Tras cada veredicto se avanza a mano (Siguiente o Enter). Aprobada.
- D-28 · (antes DP-9) El día de lanzamiento es el Caso nº 1. Aprobada.
- D-29 · (antes DP-10, CAMBIO) Fuentes woff2 alojadas en `fonts/` (Oswald 600 y Special Elite 400) con `@font-face` y fuentes del sistema de respaldo; licencias OFL 1.1 en `fonts/OFL-*.txt`. Prohibido cualquier CDN. Las consigue el archivero.
- D-30 · (antes DP-11) La plantilla exacta del texto compartido es la de la sección 7. Aprobada.
- D-31 · (antes DP-12) El marcador "Aciertos: n" se ve durante la partida. Aprobada.
- D-32 · Un único intento al día para los tres modos: la partida se guarda por fecha, no por modo (confirmado por el usuario).
- D-33 · Especificación cerrada como versión 1.0.

### 2026-10-18: consecuencias técnicas de D-21 y D-29

- D-34 · Si falta `banco.json`: `generar-calendario` se detiene con código 1; `importar` también se detiene, salvo que `casos/` esté vacío o se use `--banco-nuevo`; `validar` avisa y omite lo que depende del banco, y solo falla con `--estricto`. Además, `validar` comprueba que `banco.json` no esté rastreado por git.
- D-35 · (antes DP-13, aprobada por el usuario) `importar` genera `CREDITOS.md` en la raíz, publicado, con las fuentes y licencias agregadas y sin relacionarlas con imágenes concretas. Formato en la sección 4.5.
- D-36 · `index.html` lleva la CSP `default-src 'self'` para que el navegador bloquee cualquier recurso externo; por eso no hay estilos en línea en el HTML ni URL `data:` en CSS.

### 2026-10-18: enlace de créditos (ajuste dentro de la versión 1.0, pedido por el usuario)

- D-37 · La portada lleva el pie `footer#portada-pie` con `a#portada-creditos`, `href="CREDITOS.md"` (relativo, sin barra inicial). Abre en otra pestaña con `target="_blank" rel="noopener"` para no perder la portada y por si el navegador muestra o descarga el `.md` como texto; un texto `.solo-lectores` lo anuncia. Estilo discreto: 14 px como mínimo, contraste AA, subrayado y área táctil de 44 x 44 px. Textos: `portada.enlace_creditos` ("Créditos") y `portada.nueva_pestana`.
- D-38 · El archivero crea en la tarea 1 un `.nojekyll` vacío y un `CREDITOS.md` inicial ("Todavía no hay imágenes publicadas."). Con `.nojekyll`, GitHub Pages sirve el `.md` tal cual sin convertirlo a HTML; sin él, la conversión de Jekyll podría dejar el enlace en 404. Así el enlace funciona antes del primer lote, y `validar` comprueba que ambos archivos existan.

## DECISIONES PENDIENTES

Ninguna.
