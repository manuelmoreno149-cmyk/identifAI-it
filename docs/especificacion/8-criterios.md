# identifAI-it: especificación técnica, versión 1.3 · 8. Criterios de aceptación

Parte de la especificación 1.3 (índice en `docs/ESPECIFICACION.md`) [D-91]. Se conserva la numeración de la 1.2. Los criterios modificados en la 1.3 llevan **[1.3]**. Los que no cambian se resumen y siguen valiendo con el detalle de la 1.2, que está en el historial de git (commit `225c28a`). Los criterios nuevos empiezan en el 126.

## 8.1 diario.js
1. `fechaLocal(new Date(2026, 10, 1, 23, 59, 59))` → `'2026-11-01'`; con `(2026, 10, 2, 0, 0, 0)` → `'2026-11-02'`.
2. `numeroCaso('2026-11-01', '2026-11-01')` → 1; `'2026-11-02'` → 2; `'2026-10-31'` → 0; `'2027-03-28'` → 148.
3. `sumarDias('2026-12-31', 1)` → `'2027-01-01'`; `('2027-03-27', 2)` → `'2027-03-29'`.
4. `msHastaMedianoche(new Date(2026, 10, 1, 23, 59, 0))` → 60000.
5. `formatearCuentaAtras(3_661_000)` → `'01:01:01'`; con `-5` → `'00:00:00'`.
6. `ofuscar([0,1,1,0,1], 1, () => 0)` → `'Mpb9Ycc='`; `desofuscar` devuelve `0,1,1,0,1`.
7. Ida y vuelta de `ofuscar`/`desofuscar` con 200 combinaciones aleatorias.
8. [1.3] `casoDelDia` devuelve `null` antes del lanzamiento, después del último día y con una fecha que no coincide. Con un calendario de ejemplo de la versión 3, `casoDelDia(cal, '2026-11-02')` devuelve exactamente `{n, fecha, tema, pruebas, clave, fichas}` con `fichas` idéntico (`===` en cada elemento) a las del día.
9. [1.3] `validarCalendario` acepta un calendario versión 3 construido con `ofuscar` y `ofuscarFicha`, y rechaza:
   - todos los casos de la 1.2 (5 pruebas, huecos, clave, campos extra, tema);
   - `version: 2` y `version: 1`;
   - un día sin `fichas`, con 4 o 6 fichas, una ficha de 683 o 685 caracteres, con un carácter fuera de base64 o sin el `=` final, o que no es una cadena.
10. `precargar` rechaza si una imagen falla y no toca el DOM.

## 8.2 juego.js
11. `transicion` no muta el estado (`Object.freeze` profundo).
12. [1.3] `EMPEZAR` en `portada` lleva siempre a `cargando`. Los eventos `VER_COMO_JUGAR`, `ENTENDIDO` y `OCULTA`, en cualquier pantalla, devuelven el mismo objeto. `estadoInicial` no tiene `volverA` ni `vistoComoJugar`.
13. `VOTO` con `activo: false` devuelve el mismo objeto.
14. [1.3] `VOTO` correcto → `A` e incorrecto → `F`, tanto con `tapada: false` como con `tapada: true`. En los dos casos queda `fase: 'veredicto'`, `revelada` = verdad, `tapada: false`, `activo: false` y `ficha` = `desofuscarFicha(fichas[indice], …)` (la del texto cifrado en el test). Con `fichas: null`, `ficha: null`.
15. Un segundo `VOTO` o un `AGOTADO` en fase `veredicto` no cambian el estado.
16. [1.3] `SIGUIENTE` en la prueba 5 lleva a `resultado` con `ficha: null` y `revelada: null`; en las demás, a la siguiente prueba con `revelada: null`, `ficha: null`, `tapada: false` y `activo: false`.
17. `CARGADO`: con partida `terminada` en cualquier modo → `ya-jugado`; con `caso: null` → `sin-casos` con `tema: null`; con un caso → `portada` con su `tema` y [1.3] sus `fichas`, que no cambian con `FIN_CUENTA`, `VOTO` ni `SIGUIENTE`.
18. [1.3] `contarAciertos('AFFAA')` → 3. `mensajeFinal(k)` para k de 0 a 5; `mensajeFinal(6)` lanza un error. `estadoDeCodigo('A')` → `'acierto'`, `('F')` → `'fallo'`, y `'-'`, `'T'` y `'O'` → `null`.
19. [1.3] `AGOTADO`:
    - en `caso/pregunta` con `activo: true`, `tapada: false` y modo `normal` o `perro` → `tapada: true`, con la misma `fase`, `activo: true` y los mismos `resultados` e `indice`;
    - un segundo `AGOTADO` → el mismo objeto;
    - con `activo: false`, en modo `investigador` o en cualquier otra pantalla → el mismo objeto;
    - tras sellar, `VOTO` corrige con normalidad (criterio 14).

## 8.3 temporizador.js
20. Con frames simulados cada 16,7 ms y `duracionMs: 1000`, `alAgotar` se llama una vez, entre 1000 y 1017 ms.
21. Tras `detener()`, `alAgotar` no se llama nunca.
22. `fraccionRestante`, `nivelTemporizador` y `segundosRestantes`: los valores de la 1.2.
23. El módulo no contiene `setInterval` ni `setTimeout`.
24. [1.3] En el navegador, en modo `perro`, la prueba aparece sellada (`#pantalla-caso[data-tapada="si"]` y `#prueba-sobre` visible) entre 1000 y 1050 ms después de `PINTADA` (medido con `performance.now()` en `PINTADA` y en `AGOTADO`); en `normal`, entre 3000 y 3050 ms. En `investigador`, nunca.
25. Ningún voto anterior a `PINTADA` cuenta.

## 8.4 almacen.js
26. Con un almacén que lanza, `leer` → `{datos: datosIniciales(), disponible: false}` y `guardar` → `false`, sin lanzar.
27. [1.3] `CLAVE === 'identifaiit.v2'`. Un JSON corrupto o `version: 1` en `identifaiit.v2` → datos iniciales. Con un almacén que solo tiene `identifaiit.v1` (datos válidos de la 1.2), `leer` devuelve los datos iniciales y, después de `leer` y `guardar`, `identifaiit.v1` sigue intacto.
28. `registrarInicio` no modifica una partida existente de esa fecha, aunque sea de otro modo.
29. [1.3] `cerrarAbandonada` convierte `'AF---'` en `'AFFFF'`, con estado `terminada` y 1 acierto.
30. `calcularRacha`: los casos de la 1.2 (3, 3, 0, 1 y que una partida `en_curso` no cuenta).
31. `mejorRacha` nunca disminuye.
32. [1.3] Ningún dato guardado contiene la verdad, el voto, la ficha ni `tapada`. `datosIniciales()` es exactamente `{version: 2, ajustes: {modo: 'normal'}, partidas: {}, racha: 0, mejorRacha: 0}`.

## 8.5 compartir.js
33. [1.3] `CUADROS` es exactamente `{A: '🟩', F: '🟥'}`; `cuadros('AAFAF')` → `'🟩🟩🟥🟩🟥'`; `cuadros('FFFFF')` → `'🟥🟥🟥🟥🟥'`.
34. [1.3] `textoCompartir` con la plantilla de la sección 7, `n: 12`, `nombreModo: 'Perro de presa'`, `resultados: 'AAFAF'`, `racha: 3` y `url: 'https://usuario.github.io/identifAI-it/'` es estrictamente igual al ejemplo literal de la sección 7.
35. [1.3] El texto compartido no contiene "IA" como palabra suelta, ni "REAL", "autentica", "generada", ids de imagen, el tema, `⬛`, ni ningún texto de ficha (tampoco "Fotografía real"). La única excepción es "identifAI-it".
36. `compartir` devuelve `compartido`, `cancelado`, `copiado` o `manual` según el caso, y nunca lanza.
37. `urlDelJuego` quita `index.html` e ignora `search` [D-70].

## 8.6 textos.js
38. [1.3] Están exactamente las claves de 3.1:
    - `portada.modo_investigador === 'Investigador'`, `modo_normal === 'Normal'` y `modo_perro === 'Perro de presa'`, con los tres `desc_*`; **no** existen `modo_facil`, `modo_medio`, `modo_dificil`, `desc_facil`, `desc_medio`, `desc_dificil`, `boton_como_jugar`, `como_jugar.boton_entendido`, `veredictos.tiempo`, `veredictos.oculta` ni `portada.nueva_pestana`.
    - `como_jugar.pasos.length === 4`; `final.mensajes.length === 6`; `veredictos.acierto` y `veredictos.fallo` tienen 4 variantes o más.
    - `final.estados` es exactamente `{acierto: 'acierto', fallo: 'fallo'}`.
    - `confesion.titulo === 'Confesión del sospechoso'`, con `leer_entera` y `no_disponible`; `ficha.cerrar`; `partida.sobre_texto` y `partida.sobre_anuncio`.
    - `fichas.autentica === 'Fotografía real'` y `fichas.sin_prompt` no vacía y distinta.
    - Y las de la 1.2 que siguen: tema, avisos, prueba y créditos.
39. [1.3] Ninguna cadena supera los 90 caracteres, salvo `fichas.*`. Cada paso de `como_jugar.pasos` tiene 80 como máximo; `portada.modo_*`, 14; `portada.desc_*`, 26; `partida.sobre_texto`, 16; `confesion.titulo`, 30; `confesion.leer_entera` y `ficha.cerrar`, 16. Los dos `fichas.*` ocupan como mucho 510 bytes UTF-8 y no tienen espacios en los extremos. Se mantienen los límites de la 1.2 para `portada.tema`, `partida.caso_del_dia`, `avisos.previsualizacion` y `prueba.opcion`.
40. [1.3] `compartir.plantilla` es exactamente la cadena de la sección 7 (versión 1.3).

## 8.7 index.html, CSS y fuentes
41. [1.3] Existen todos los ids y atributos de la sección 2 y ningún id, clase, nombre ni valor `data-*` contiene palabras prohibidas. En particular:
    - `#caso-escena` contiene, en orden, `#prueba-marco`, `#prueba-sobre` y `#veredicto`;
    - `#veredicto` contiene `#veredicto-confesion` con su título, su texto vacío y `button[data-accion="leer-confesion"][hidden]`;
    - `details#como-jugar` (sin `open`) está después de `button[data-accion="empezar"]` y contiene `summary#como-jugar-resumen` y `#como-jugar-panel` > `ol#como-jugar-pasos`;
    - `dialog#ficha` está en `#app`, fuera de las secciones, con sus seis hijos vacíos (o con su marcador `[[…]]`) y `#ficha-img` sin `src`;
    - `#resultado-revision` está vacío, `#resultado-rachas` existe y **no** existen `#resultado-cuadros`, `#pantalla-como-jugar`, `data-accion="como-jugar"` ni `data-accion="entendido"`;
    - siguen valiendo los requisitos de la 1.2 (`#caso-cabecera`, `#portada-tema`, `span.boton-texto` con `kbd`, el `label` de `#compartir-manual`, `data-foco` con `tabindex="-1"` y `#aviso-previsualizacion`), y no está `#selector-prueba`.
42. Como mucho una `.pantalla` sin `hidden`; sin JS, el `<noscript>`.
43. [1.3] Sustituido por los criterios 126 a 128 (composición sin deslizar en todas las pantallas).
44. Contraste AA y foco visible en todos los controles (también `summary`, miniaturas y botones del diálogo).
45. [1.3] Con `prefers-reduced-motion: reduce`, sin animación del sello ni del sobre y sin sacudidas.
46. Rutas relativas; funciona bajo `/identifAI-it/`.
47. [1.3] Antes de responder, el DOM no contiene la verdad ni la ficha:
    - `#veredicto-sello`, `#veredicto-texto` y `#veredicto-confesion-texto` están vacíos y `#veredicto` no tiene `data-estado`;
    - `#ficha` está cerrado y vacío;
    - ningún atributo, `alt`, clase ni ruta de la imagen ni del sobre depende de la verdad (el sobre aparece igual en auténticas y generadas, y solo por tiempo);
    - `#resultado-revision` está vacío hasta entrar en `resultado`, y entonces las miniaturas tienen el marcado de 2.3 (`alt=""` y solo `data-prueba` y `data-estado`, que son la posición y el resultado del jugador).
48. Todas las peticiones van al mismo origen.
49. CSP de 2.4, sin violaciones en una partida completa (también al abrir y cerrar el diálogo).
50. Las fuentes cargan desde `fonts/` y hay respaldo del sistema.
51. Existen los archivos de licencia de las fuentes [D-40].
52. Enlace de créditos: `href="creditos.html"`, misma pestaña, 44 x 44 px, AA, subrayado y accesible con Tab.
53. `creditos.html` existe y vuelve a la portada sin consumir el intento.

## 8.8 main.js (pruebas manuales con `npx serve`)
54. [1.3] Se puede jugar una partida completa en cada uno de los tres modos con ratón, con teclado (R, I y Enter) y en un móvil de 360 px, en vertical y en horizontal.
55. [1.3] Recargar durante la prueba 3 lleva a `ya-jugado`, con las pruebas 3 a 5 contadas como `F`.
56. [1.3] Recargar en `portada` (con el desplegable abierto o cerrado) o en `cargando` permite jugar con normalidad.
57. [1.3] Tras terminar en modo `investigador`, recargar lleva a `ya-jugado`; no hay forma de volver a jugar ese día en ningún modo.
58. [1.3] Modo `normal`: ocultar la pestaña 1 s después de `PINTADA` durante 5 s. Al volver, la prueba está sellada (no se ve la imagen), no hay veredicto, se puede votar con clic o R/I y el resultado depende solo del voto. Ocultarla en el veredicto, el resultado o la portada no cambia nada; en la cuenta atrás, al volver se reinicia desde 3.
59. Segunda pestaña tras terminar → `ya-jugado`; dos a la vez → la segunda en llegar a `FIN_CUENTA` pasa a `ya-jugado`.
60. Con localStorage bloqueado se juega entero, con `#aviso-almacen` y sin errores en la consola.
61. Una imagen inexistente lleva a `error`; Reintentar no consume el intento.
62. Una fecha fuera del calendario lleva a `sin-casos`.
63. La cuenta atrás de `ya-jugado` llega a 0 y lleva a la portada del día siguiente, con su tema.
64. [1.3] Las 5 imágenes se piden antes de la cuenta atrás. Ninguna petición contiene la verdad ni una ficha; no se hace ninguna petición al responder ni al abrir una ficha (salvo la de la imagen ya precargada en `#ficha-img`, servida desde caché).
65. En un móvil, Compartir abre la hoja de compartir; en escritorio, copia el texto y muestra el aviso.

## 8.9 Herramientas (archivero)
66. [1.3] `npm run validar` falla en los casos de la 1.2 (imágenes, palabras prohibidas, `validarCalendario`, 0 o 5 generadas, archivos privados rastreados, URL externas, `.nojekyll`, `creditos.html`, rutas, `docs/muestras.html`, `PRUEBAS_ABIERTAS`, fuentes y licencias, y, con banco, sus coherencias) y además:
    - si el calendario es de la versión 2;
    - si una ficha no se descifra;
    - si una auténtica no lleva exactamente `fichas.autentica` o una generada la lleva;
    - si hay un `.txt` rastreado fuera de `fonts/`.
67. En un clon limpio, sin banco: aviso y código 0; con `--estricto`, código 1.
68. [1.3] Avisos sin fallar: los de la 1.2 (menos de 7 días, mezcla, peso, huérfanas, entradas sin `recorte` y `PRUEBAS_ABIERTAS` antes del lanzamiento) y "N pruebas generadas no tienen prompt (días …)", sin nombrar pruebas.
69. [1.3] `npm run importar` sin banco y con imágenes se detiene. Con el calendario provisional de D-46 se detiene con el mensaje de D-63. Con el calendario actual de la versión 2 y sin `--reimportar`, se detiene con el mensaje de 4.4.2, paso 3, y no modifica nada.
70. Importar dos veces seguidas: la segunda omite todos los días y deja todo idéntico byte a byte.
71. [1.3] `npm run importar` termina con código 1, muestra todos los errores y no modifica nada en los casos de la 1.2 y además:
    - con un `.txt` que no es UTF-8 válido;
    - con dos imágenes con el mismo nombre base en `ia/`;
    - con un prompt idéntico a `fichas.autentica` o a `fichas.sin_prompt`;
    - con `TEXTOS.fichas` inválido.
72. `npm test` pasa con Node 20 en un clon limpio.
73. Tras importar, `git status` no muestra archivos privados ni de `entrada/`.
74. `creditos.html` regenerado con las parejas del banco; `npm run creditos` sin banco y con imágenes termina con código 1.

## 8.10 creditos.html y creditos.mjs
75 a 82. Sin cambios respecto a la 1.2: estructura de 2.7, `TIPOGRAFIAS`, `escaparHtml`, `parejasCreditos`, determinismo, ids sin palabras prohibidas y legibilidad a 360 px.

## 8.11 Temas por día [D-52 a D-61]
83 a 90. Sin cambios (`temaDeCarpeta`, `contienePalabraProhibida`, `fuenteDeArchivo`, `planificar` con las 7 carpetas, `barajar`, `nuevoId`, `compararPesos` y `avisosMezcla` con los arrays exactos de D-67). [1.3] En el criterio 86, `planificar` sin `.txt` devuelve además `ficha: null` en cada imagen y un aviso por cada generada.
91. Una carpeta con 6 imágenes hace fallar `importar` y `--simular`.
92. [1.3] Con las 7 carpetas correctas (y sus `.txt`), `--simular` no escribe nada. La importación crea 35 WebP y un `data/calendario.json` **versión 3** con 7 días, cada uno con 5 fichas que descifran a "Fotografía real" en las auténticas y al prompt normalizado en las generadas; banco de 35 entradas sin fichas; `validar` pasa.
93. [1.3] Los originales y los `.txt` de `entrada/temas/` siguen sin cambios después de importar.
94. `#portada-tema` y `#caso-tema` muestran el tema, sin él en atributos.

## 8.12 Recorte y reimportación [D-65, D-66]
95 a 99 y 101 a 103. Sin cambios.
100. [1.3] Con los 7 días importados (calendario de la versión 2 **o** 3), todas las fechas posteriores a hoy y las carpetas con sus `.txt`, `--reimportar --confirmar`:
    - deja exactamente 35 WebP nuevos, sin ningún id anterior;
    - escribe un calendario **versión 3** con los mismos días, fechas, temas y número de generadas, y 5 fichas por día;
    - deja el banco con 35 entradas con `recorte` y una copia exacta en `banco.anterior.json`;
    - no modifica `lote.json` ni `entrada/`;
    - y `validar` pasa sin el aviso de entradas sin `recorte`.

## 8.13 Previsualización local [D-68]
104, 105 y 107 a 113. Sin cambios (en el 112, los criterios que deben seguir cumpliéndose son el 24, el 25, el 47 y el 136).
106. [1.3] En `http://localhost:3000/?fecha=2026-11-03`: la portada muestra "Caso nº 3" y su tema; `#aviso-previsualizacion` está visible con "Previsualización del 2026-11-03: no se guarda nada." y `#aviso-almacen` oculto; el desplegable Cómo jugar está cerrado; el modo marcado es **Normal** aunque el almacén real tenga otro, y Empezar lleva directamente a `cargando`.

## 8.14 Modo prueba [D-70, D-71]
114, 116 a 118 y 121 a 124. Sin cambios.
115. [1.3] `diasDePrueba` con un calendario de ejemplo de la versión 3 devuelve exactamente `[{n, fecha, tema}, …]`, sin `pruebas`, `clave` ni `fichas`, y no muta el calendario; con `null`, `undefined` o `{}`, devuelve `[]`.
119. [1.3] Igual que en la 1.2 (portada con selector de 7 días, aviso, navegación a `?prueba=1&dia=5`, recargar permite rejugar y los almacenes del navegador quedan intactos), y además: con el selector y el aviso visibles, la portada cabe sin deslizar en 360 x 640 y 640 x 360 (criterio 126), y la partida se juega con los modos, el sellado y las fichas de la 1.3.
120. [1.3] Anti-trampas en modo prueba: las `option` solo tienen `value` y texto. Se cumplen los criterios 24, 25, 47, 64 y 136. El texto compartido no lleva parámetros. La consola no muestra nada.

## 8.15 Argumentos y reimportación en temas.mjs [D-72]
125. Sin cambios.

## 8.16 Versión 1.3 [D-76 a D-90]

**Composición sin deslizar** [D-84] (manual, con el modo de dispositivo de las herramientas del navegador):

126. Pantallas y estados que se comprueban:
    - `portada` (desplegable cerrado; desplegable abierto; en modo prueba con selector y aviso; y con `#aviso-almacen` visible);
    - `cargando` y `cuenta-atras`;
    - `caso/pregunta` visible, `caso/pregunta` sellada y `caso/veredicto` con una confesión recortada y el botón Leer entera, todo con un tema de 30 caracteres;
    - `resultado` y `ya-jugado` (también con `avisos.otra_pestana`);
    - `sin-casos` y `error`.

    Para cada uno, a 360 x 640, 640 x 360, 1280 x 720, 390 x 844 y 768 x 1024, se cumple:
    - `document.documentElement.scrollHeight <= innerHeight` y `document.documentElement.scrollWidth <= innerWidth`;
    - en la `.pantalla` visible, `scrollHeight <= clientHeight + 1` y `scrollWidth <= clientWidth + 1`;
    - todo `button`, `a`, `input`, `select` y `summary` visible tiene su `getBoundingClientRect()` entero dentro de la ventana.
127. En `caso`, `#prueba-marco` mantiene la proporción 4:5 (ancho / alto = 0,80 ± 0,01) y mide de alto al menos 340 px a 360 x 640, 240 px a 640 x 360 y 520 px a 1280 x 720. `#prueba-sobre` ocupa la misma caja que `#prueba-marco` (± 1 px). En horizontal, la imagen está a la izquierda y los botones a la derecha.
128. Los botones de voto miden al menos 44 x 44 px y se ven sin desplazar, también con la prueba sellada. Con la página a 320 x 568 o con el texto al 200 %, ningún contenido queda recortado sin poder alcanzarse: la sección se desplaza por dentro (R13).

**Cómo jugar** [D-83]:

129. `details#como-jugar` está cerrado al cargar la página y se abre y se cierra con clic, Enter y Espacio sobre el `summary`, con foco visible; el lector lo anuncia como contraído o expandido sin `aria-expanded` manual. Al abrirlo, la página no se desplaza y Empezar sigue entero en la ventana. A 360 x 640 sin modo prueba, `#como-jugar-panel` no tiene scroll interno; en 640 x 360, si lo tiene, se alcanza con Tab y se desplaza con las flechas. Con el desplegable abierto, Empezar lleva a `cargando`; al volver a la portada (`MEDIANOCHE`), el desplegable está cerrado.
130. No existen la pantalla `como-jugar`, los eventos `VER_COMO_JUGAR` y `ENTENDIDO`, las acciones `como-jugar` y `entendido`, ni `vistoComoJugar` en el estado ni en `identifaiit.v2` (búsqueda en `js/` e `index.html`).

**Sellado, pestaña oculta y modos** [D-77, D-78, D-81, D-90]:

131. Al sellar en `normal` o `perro`:
    - `img.prueba-img` tiene `hidden` y `#prueba-sobre` no;
    - `#temporizador` no se ve;
    - `#temporizador-anuncio` contiene `partida.sobre_anuncio` (una sola vez por prueba);
    - los dos votos siguen funcionando con clic y con R/I tanto tiempo como se quiera (por ejemplo, 60 s después), y el resultado es `A` o `F` según el voto;
    - al pasar a veredicto, la imagen vuelve a verse bajo el sello.

    En todo el código no aparecen los códigos `T` ni `O` ni las claves `veredictos.tiempo` u `oculta`.
132. Modo `investigador`: `#temporizador` no se ve, `#temporizador-anuncio` queda vacío durante toda la prueba y la imagen sigue visible al menos 60 s sin sellarse; se vota con normalidad.
133. Anuncios: en `normal`, "Quedan 3 s", "Quedan 2 s" y "Quedan 1 s" y luego `sobre_anuncio`; en `perro`, solo `sobre_anuncio`.
134. Pestaña oculta antes de `PINTADA` (ocultarla en cuanto aparece la prueba, en `perro`): al volver, la imagen se pinta y se ve completa durante 1000–1050 ms antes de sellarse. Si se oculta con la imagen ya visible y vuelve pasado el tiempo, la prueba aparece ya sellada sin que se vea la imagen en ningún frame (se comprueba con la grabación de rendimiento: `temporizador.comprobar()` se ejecuta en `visibilitychange`, antes del primer pintado).
135. Con el almacén vacío, el modo marcado es `normal` y el texto de compartir dice "Modo: Normal". Elegir otro modo lo guarda en `identifaiit.v2`, y al recargar sigue marcado. Si existe `identifaiit.v1`, se ignora y queda intacto. Las tres fichas de modo caben en una fila a 360 px.

**Fichas** [D-85 a D-89]:

136. **La ficha de una prueba no existe en el DOM hasta que se responde.** En `caso/pregunta` (sellada o no), ningún nodo de texto ni atributo del documento contiene el texto descifrado de la ficha de ninguna prueba (búsqueda de un fragmento del prompt de prueba con `document.body.innerHTML.includes`), y `#ficha` está cerrado y vacío. Tras `VOTO`, solo aparece la ficha de esa prueba (recortada en `#veredicto-confesion-texto` y, si se abre, completa en `#ficha-texto`). Tras `SIGUIENTE`, desaparece. En `resultado`, el diálogo solo contiene la ficha de la miniatura abierta mientras está abierto, y queda vacío al cerrarse. En `ya-jugado` no se descifra ninguna ficha.
137. Diálogo:
    - Leer entera aparece solo si `recortarFicha(ficha).recortada`.
    - Al abrirlo (desde el veredicto o desde una miniatura), es modal, el foco va a `#ficha-cerrar`, Tab no sale del diálogo, Escape y Cerrar lo cierran y el foco vuelve al botón que lo abrió.
    - Con el diálogo abierto, R, I y Enter no despachan ningún evento del juego.
    - Un prompt de 510 bytes se lee entero (con scroll interno del diálogo si hace falta) sin que la página se desplace, a 360 x 640 y 640 x 360.
138. Resultado:
    - 5 `button.miniatura` en orden, con `data-prueba` de 1 a 5 y `data-estado`;
    - nombre accesible "Prueba N: acierto" o "Prueba N: fallo", e `img` con `alt=""`;
    - cada una con un rectángulo visible de al menos 44 x 55 px, sin solaparse con otras ni con Compartir;
    - al activarla con clic, Enter o Espacio, se abre el diálogo con la imagen (`alt="Prueba N"`), "Era: REAL" o "Era: IA", "Confesión del sospechoso" y el texto completo ("Fotografía real" en las auténticas).
139. `ofuscarFicha` y `desofuscarFicha` (tests en `tests/diario.test.mjs`):
    - **Ida y vuelta** con `''`, `'Fotografía real'`, `'ñandú 🐕 «comillas»\nsegunda línea'` y un texto de exactamente 510 bytes.
    - **Formato**: la salida cumple `/^[A-Za-z0-9+/]{683}=$/`.
    - **Relleno**: con el mismo `aleatorio`, salida idéntica; con otro `aleatorio`, distinta (relleno distinto) pero que descifra igual.
    - **Flujo**: para el mismo texto, cambiar `clave`, `n` o `indice` cambia la salida.
    - **Errores**: un texto de 511 bytes lanza `RangeError`.
    - `desofuscarFicha` devuelve `null`, sin lanzar, con: una cadena de 683 o 685 caracteres, con `!` o sin el `=` final, `null`, un bloque cuya longitud cifrada sea 511, y un bloque con bytes UTF-8 inválidos (los dos construidos en el test cifrando a mano con `flujoFicha`).
    - **`flujoFicha`**: devuelve 512 valores enteros de 0 a 255 y es determinista; se cumple el vector de regresión de 4.3.1.
140. `recortarFicha` (tests en `tests/juego.test.mjs`):
    - `('Un perro en la playa')` → `{texto: 'Un perro en la playa', recortada: false}`;
    - `('  a\n\nb  ')` → `{texto: 'a b', recortada: false}`;
    - `('x'.repeat(100))` → 89 `x` más `…` (90 puntos de código), `recortada: true`;
    - un texto de 120 caracteres con espacios se corta en un espacio, termina en `…` y no supera 90 puntos de código;
    - un texto de 100 emojis `🐕` devuelve 89 emojis enteros y `…`;
    - `(null)` → `{texto: '', recortada: false}`.
141. `MODOS` es exactamente `{investigador: null, normal: 3000, perro: 1000}` y está congelado; `MODO_POR_DEFECTO === 'normal'`; `modoValido('perro')` → `true` y `('medio')`, `('toString')` y `(undefined)` → `false`; `estadoInicial({modo: 'facil'}).modo === 'normal'`; `ELEGIR_MODO {modo: 'dificil'}` devuelve el mismo objeto. `crearTemporizador({duracionMs: null, …})` y con `Infinity`, `0` o `-1` lanzan `TypeError`.
142. Temporizador con pestaña oculta (test con reloj simulado): con `duracionMs: 1000`, si el reloj salta de 100 a 5000 ms entre dos frames, `alAgotar` se llama una vez en ese frame. `comprobar()` con `reloj() - t0 >= duracionMs` llama a `alAgotar` sin esperar frame; una segunda llamada, o un frame posterior, no lo repite. `comprobar()` antes de tiempo o tras `detener()` no hace nada.
143. `normalizarFicha` (tests en `tests/temas.test.mjs`, con `maxBytes: 510`):
    - quita el BOM, cambia `\r\n` por `\n`, convierte `\t` en espacio, recorta los extremos, reduce `'a\n\n\n\nb'` a `'a\n\nb'` y normaliza a NFC (una `ñ` descompuesta queda compuesta);
    - `'   '` → `vacia: true`;
    - un texto de 600 bytes → `truncada: true`, termina en `…` y ocupa 510 bytes o menos;
    - un texto de exactamente 510 bytes queda igual;
    - un texto de emojis no se parte a medias (el resultado es UTF-8 válido y cabe en 510 bytes);
    - nunca lanza.
144. `planificar` con fichas (tests en `tests/temas.test.mjs`):
    - una generada con `x.txt` → `ficha: 'NN-tema/ia/x.txt'`;
    - una generada sin `.txt` → `ficha: null` y un aviso que contiene su ruta;
    - un `.txt` en `real/` → aviso;
    - un `.txt` huérfano en `ia/` → aviso;
    - `X.TXT` empareja con `X.jpg`;
    - `x.jpg` y `x.png` en `ia/` → error;
    - un `.md` → error, como antes;
    - los `.txt` no cuentan para las 5 imágenes;
    - las auténticas siempre llevan `ficha: null`.
145. `calendarioAnteriorValido`: acepta un calendario de la versión 2 (el actual) y uno de la versión 3; rechaza `version: 1`, `lanzamiento: '2026-10-19'`, `null`, `{}` y un día con 4 pruebas.
146. Prompts privados: tras importar o reimportar, un fragmento distintivo de cualquier prompt de prueba **no** aparece en ningún archivo del repositorio fuera de `entrada/` (búsqueda en `casos/`, `data/`, `herramientas/`, `creditos.html`, `js/` y `docs/`), ni en `herramientas/banco.json`, ni en la salida de `importar`, de `--simular` ni de `validar`. Ningún `.txt` se copia fuera de `entrada/`.
147. `npm run validar` sobre un calendario versión 3 manipulado en el test manual: al cambiar una ficha por otra de 684 caracteres aleatorios, falla con "no se puede descifrar" o "no cuadran"; al intercambiar la ficha de una auténtica con la de una generada del mismo día, falla con "El día {n} tiene fichas que no cuadran con su clave." sin nombrar la prueba.
148. `img/ui/sobre.svg` existe, es un SVG propio sin texto, sin metadatos de editor ni referencias externas, y se ve igual en las 5 pruebas; `img/ui/icono-tiempo.svg` no existe y ningún CSS lo referencia. Los ids y valores nuevos (`prueba-sobre`, `veredicto-confesion*`, `ficha*`, `como-jugar*`, `resultado-rachas`, `ver-ficha`, `leer-confesion`, `cerrar-ficha`, `investigador`, `normal`, `perro`, `data-tapada` y `data-prueba`) no contienen palabras prohibidas.
