# identifAI-it: especificación técnica, versión 2.1 · 8. Criterios de aceptación

Parte de la especificación 2.1 (índice en `docs/ESPECIFICACION.md`) [D-120]. Se conserva la numeración. Los criterios modificados en la 1.3 llevan **[1.3]**, los de la 2.0 **[2.0]** y los que cambian con Fact or Fake **[2.1]**; los que no cambian se resumen (detalle de la 1.2 en git, commit `225c28a`). Los textos de interfaz citados son referencias: el valor es el de `js/textos.js` [D-93]. Criterios de la 2.0: 149–223; nuevos de la 2.1: 224–240 (228 a 230 **retirados** por D-131; 236 y 237 añadidos por D-134; 238 a 240 añadidos por D-136 a D-140). Donde un criterio de la 2.0 decía Headlines/`titulares`, ahora dice Fact or Fake/`afirmaciones`, con las funciones renombradas de 3.2.

## 8.1 diario.js
1. `fechaLocal(new Date(2026, 10, 1, 23, 59, 59))` → `'2026-11-01'`; con `(2026, 10, 2, 0, 0, 0)` → `'2026-11-02'`.
2. `numeroCaso('2026-11-01', '2026-11-01')` → 1; `'2026-11-02'` → 2; `'2026-10-31'` → 0; `'2027-03-28'` → 148.
3. `sumarDias('2026-12-31', 1)` → `'2027-01-01'`; `('2027-03-27', 2)` → `'2027-03-29'`.
4. `msHastaMedianoche(new Date(2026, 10, 1, 23, 59, 0))` → 60000.
5. `formatearCuentaAtras(3_661_000)` → `'01:01:01'`; con `-5` → `'00:00:00'`.
6. `ofuscar([0,1,1,0,1], 1, () => 0)` → `'Mpb9Ycc='`; `desofuscar` devuelve `0,1,1,0,1`.
7. Ida y vuelta de `ofuscar`/`desofuscar` con 200 combinaciones aleatorias.
8. [2.0] `casoDelDia` con un calendario versión 4 y `lanzamiento: '2026-12-01'`: `null` antes del lanzamiento y después del último día; `casoDelDia(cal, '2026-12-02')` devuelve exactamente `{n: 2, fecha: '2026-12-02', tema, pruebas, clave, fichas}`. Con `lanzamiento: null`, `null` para cualquier fecha.
9. [2.0] `validarCalendario` acepta un calendario versión 4 (con `lanzamiento` `null` y con fecha) y rechaza: `version` 1, 2 y 3; un día con `fecha`; `lanzamiento` `''`, `'2026-13-01'`, `20261201` o ausente.
10. `precargar` rechaza si una imagen falla y no toca el DOM.

## 8.2 juego.js
11. `transicion` no muta el estado (`Object.freeze` profundo, también `retos`).
12. [2.0, D-115] `EMPEZAR` en `portada` con `imagenes` pendiente lleva a `cargando`. `VER_COMO_JUGAR`, `ENTENDIDO` y `OCULTA` devuelven el mismo objeto. `VOLVIO {ocultoMs: 60000, indice}` en Images devuelve el mismo objeto en cualquier pantalla.
13. `VOTO` con `activo: false` devuelve el mismo objeto.
14. [1.3] `VOTO` en Images: `A`/`F`, `fase: 'veredicto'`, `revelada`, `tapada: false`, `activo: false`, `ficha` = `desofuscarFicha(...)`; con `fichas: null`, `ficha: null`.
15. Un segundo `VOTO`, un `AGOTADO` o un `VOLVIO` en `veredicto` no cambian el estado.
16. [1.3] `SIGUIENTE` en Images: como en la 1.3.
17. [2.0] `CARGADO`: con los dos casos `null` → `sin-casos`; con un caso → `portada` con su `tema` y sus `fichas` copiados. Con un reto jugado, `portada` con `retos[reto].jugado: true`.
18. [1.3] `contarAciertos`, `mensajeFinal` y `estadoDeCodigo`: como en la 1.3. (La elección del conjunto de mensajes por reto, en el 236.)
19. [1.3] `AGOTADO` en Images: como en la 1.3. [2.1] En Fact or Fake, siempre el mismo objeto.

## 8.3 temporizador.js
20 a 25. Sin cambios (24 y 25, solo Images).

## 8.4 almacen.js
26. Con un almacén que lanza, `leer` → `{datos: datosIniciales(), disponible: false}` y `guardar` → `false`.
27. [2.0] `CLAVE === 'identifaiit.v3'`. JSON corrupto o `version: 2` → datos iniciales. `identifaiit.v2` y `.v1` quedan intactas.
28. [2.0] `registrarInicio` no modifica una partida existente de esa fecha y ese reto.
29. [2.1] `cerrarAbandonada(datos, 'afirmaciones', …)` convierte `'AF---'` en `'AFFFF'`, `terminada`, 1 acierto, solo en ese reto.
30. `calcularRacha`: los casos de la 1.2.
31. `mejorRacha` nunca disminuye (en cada reto).
32. [2.1] Ningún dato guardado contiene la verdad, el voto, la ficha, la afirmación, `tapada`, `motivo`, el mensaje final ni instantes o duraciones de ausencia. `datosIniciales()` es exactamente el objeto de 3.5 (con `retos.afirmaciones` y sin `retos.titulares`).

## 8.5 compartir.js
33. [1.3] `CUADROS` y `cuadros`: como en la 1.3.
34. [2.0] `textoCompartir` con `compartir.plantilla`, `n: 12`, `nombreModo: 'Bloodhound'`, `resultados: 'AAFAF'`, `racha: 3` y la URL de ejemplo es estrictamente igual al ejemplo de Images de la sección 7.
35. [2.1] El texto compartido (de los dos retos) no contiene "AI" ni "IA" como palabra suelta, "REAL", "FACT", `autentica`, `generada`, ids de imagen, el tema, `⬛`, ningún texto de ficha, ningún mensaje final ni ninguna afirmación, aclaración, detalle o prompt de prueba. Excepciones únicas: "identifAI-it" y el nombre del reto "Fact or Fake" en la primera línea (la palabra "Fake" no aparece en ninguna otra parte).
36. `compartir` devuelve `compartido`, `cancelado`, `copiado` o `manual` y nunca lanza.
37. `urlDelJuego` quita `index.html` e ignora `search`.

## 8.6 textos.js
38. [2.1] Están exactamente las claves de 3.1 (sin el grupo `titulares` ni las claves retiradas), con: `portada.reto_imagenes === 'Images'`, `portada.reto_afirmaciones === 'Fact or Fake'`, `portada.lema === 'Two cases a day. Spot the fake.'` [D-133], `afirmaciones.boton_autentica === 'FACT'`, `afirmaciones.boton_generada === 'FAKE'`, `afirmaciones.sello_autentica === 'FACT'`, `afirmaciones.sello_generada === 'FAKE'`, `afirmaciones.marca === 'identifAI-it · Fact or Fake?'`, `afirmaciones.aviso_oculta === 'Leaving the page for more than a few seconds counts as a miss.'`, `creditos.afirmaciones_texto === 'Claims are written for this game from public sources. The fakes are invented and always debunked after you answer.'` [D-132], `como_jugar.pasos.length === 4`, `como_jugar.pasos_afirmaciones.length === 4`, `afirmaciones.oculta.length >= 2`, `final.mensajes.length === 6` y `final.mensajes_afirmaciones` **igual, elemento a elemento y en orden, a los 6 valores exactos de 3.1** [D-138] (además: distintas de las de `final.mensajes`, y ninguna contiene "AI", "image", "photo" ni "picture" como palabra, sin distinguir mayúsculas) [D-134], y las de la 1.3.
39. [2.1] Límites de 3.1, medidos con `[...s].length` sobre el texto **rellenado** con la constante de relleno de 3.1 (sin `{medio}`); un marcador sin valor de relleno hace fallar el test; excepciones: `fichas.*` (510 bytes), `como_jugar.pasos` y `pasos_afirmaciones` (80), las dos plantillas (no se miden; las comprueba el 40) y `creditos.afirmaciones_texto` (120). Cada `final.mensajes_afirmaciones` entra en el límite general de 90.
40. [2.1] `compartir.plantilla` y `compartir.plantilla_afirmaciones` son exactamente las cadenas de la sección 7.

## 8.7 index.html, CSS y fuentes
41. [2.1] Existen todos los ids y atributos de la sección 2 y ninguno contiene palabras prohibidas. Además: `#caso-escena` contiene, en orden, `#prueba-marco`, `#prueba-sobre`, `#afirmacion` y `#veredicto`; `#afirmacion` tiene `hidden` y `#afirmacion-texto` vacío; `#caso-aviso` es el último hijo de `#caso-cabecera`, con `hidden` y `data-texto="afirmaciones.aviso_oculta"`; `#veredicto-aclaracion` tiene `hidden` y sus hijos vacíos; los votos tienen `#voto-autentica-texto`, `#voto-generada-texto` y sus `kbd`; `#portada-retos` tiene los radios `imagenes` y `afirmaciones`; `#portada-regla` tiene `hidden`; `dialog#ficha` tiene sus hijos vacíos y `#ficha-afirmacion` y `#ficha-aclaracion` con `hidden`; no está `#selector-prueba`; no existe ningún id de la lista "desaparecen" de 2.3; ningún `a` de la página tiene `href` externo.
42. Como mucho una `.pantalla` sin `hidden`; sin JS, el `<noscript>`.
43. [1.3] Sustituido por los criterios 126 a 128 y 182.
44. Contraste AA y foco visible en todos los controles (también fichas de reto y botones numerados), y contraste AA de `#caso-aviso` y de los sellos FACT y FAKE.
45. [2.1] Con `prefers-reduced-motion: reduce`, sin animación de sellos (de los dos retos), sobre ni sacudidas.
46. Rutas relativas; funciona en la raíz de `https://identifaiit.com/` y bajo una subcarpeta como `/identifAI-it/` (también `data/facts/{mes}.json`).
47. [2.1] Antes de responder, el DOM no contiene la verdad ni la ficha (1.3) y, en Fact or Fake: `#veredicto` sin `data-estado` ni `data-verdad`, `#veredicto-aclaracion` oculto y vacío, y ningún atributo depende de la verdad.
48. Todas las peticiones van al mismo origen.
49. [2.1] CSP de 2.4 sin violaciones en una partida completa de cada reto.
50 a 53. Sin cambios.

## 8.8 main.js (manual con `npx serve`)
54. [1.3] Partida completa de Images en los tres modos (ratón, teclado con R e I, móvil en vertical y horizontal).
55. [2.0] Recargar durante la prueba 3 de Images lleva a la portada con Images "Filed · n/5" y las pruebas 3 a 5 en `F`.
56. [1.3] Recargar en `portada` o en `cargando` permite jugar con normalidad.
57. [2.1] Tras terminar Images en `investigador`, no hay forma de volver a jugarlo ese día; Fact or Fake sigue disponible.
58. [1.3] Pestaña oculta en Images: sin penalización, dure lo que dure.
59. [2.1] Dos pestañas: como en la 1.3, **por reto** (jugar Fact or Fake en una no afecta a Images en otra).
60 a 65. Sin cambios.

## 8.9 Herramientas (archivero)
66. [2.1] `npm run validar` falla en los casos de la 1.3 (la versión 3 del calendario con su propio mensaje) y en los de 4.4.3 y 4.12.
67. En un clon limpio, sin bancos: avisos y código 0; con `--estricto`, código 1.
68. [2.1] Avisos sin fallar: los de la 1.3 (por reto en el de calendario corto) y los de 4.4.3 y 4.12.
69. [2.0] `npm run importar` sin banco y con imágenes se detiene. Con un calendario de la versión 3 o un banco de la versión 2, se detiene con los mensajes de 4.4.2 y no modifica nada.
70 a 74. Sin cambios (banco versión 3, calendario versión 4).

## 8.10 a 8.12
75 a 103. Sin cambios, salvo: [2.0] en el 92 y el 100, calendario **versión 4** y banco **versión 3**; [2.1] en el 86 (planificación), además, el criterio 224.

## 8.13 Previsualización local [D-68]
104 a 113. Sin cambios, salvo: el 106 se prueba con un `lanzamiento` de ejemplo; con `null`, `?fecha=` lleva a `sin-casos`. Con `?fecha=` de otro mes, solo se pide el archivo de `data/facts/` de ese mes.

## 8.14 Modo prueba
114, 116 a 118 y 121 a 124. Sin cambios.
115. [2.1] `diasDePrueba(cal, meses)`: con `lanzamiento: null`, un calendario con los días 1 a 35 y `meses` = `[2000-01 (días 1–31), 2000-02 (32–40)]`, devuelve exactamente `[{n, temaImagenes, temaAfirmaciones}]` para los días 1 a 40, con `temaImagenes: null` en los 36 a 40; nunca `pruebas`, `clave`, `textos` ni `fichas`; no muta. Con `null`, `undefined`, `{}`, `[]` o `[afirmacionesVacias('2000-01')]`, solo los días del calendario. Se ignoran un elemento que no pasa `validarAfirmaciones` y los días de un elemento que no son de su mes.
119. [2.1] Portada en modo prueba con selector y aviso, los dos retos y la navegación a `?prueba=1&dia=5&reto=afirmaciones`; cabe sin deslizar (criterio 182).
120. [2.0] Anti-trampas en modo prueba: `option` solo con `value` y texto; se cumplen los criterios 47, 64, 136 y 191.

## 8.15
125. Sin cambios.

## 8.16 Versión 1.3 [D-76 a D-90]
126 a 148. Siguen valiendo para Images, con estos cambios [2.0]: 126 se amplía con los estados del criterio 182; 135, almacén `identifaiit.v3`; 145, `calendarioAnteriorValido` acepta 2, 3 y 4.

## 8.17 Lanzamiento y calendario versión 4 [D-95 a D-97]
149. `numeroDelDia('2026-11-30', '2026-12-01')` → `null`; `('2026-12-01', '2026-12-01')` → 1; `(x, null)` → `null`. `fechaDelDia(null, 3)` → `null`; `('2026-12-01', 3)` → `'2026-12-03'`.
150. `casoDeNumero(cal, 2)` devuelve el día 2 con `lanzamiento: null` (`fecha: '2000-01-02'`) y con fecha; con `n` 0 o mayor que el último, `null`.
151. `comprobarCambioLanzamiento` y `analizarArgumentosLanzamiento`: como en la 2.0.
152. `migrarCalendario` (3 → 4) y `migrarBanco` (2 → 3): como en la 2.0.
153. [2.1] `npm run lanzamiento -- --sin-fecha` sobre los datos actuales deja `data/calendario.json` versión 4 con `lanzamiento: null` y `banco.json` versión 3; `git diff` de `data/calendario.json` solo muestra la versión, el lanzamiento y las líneas `fecha` eliminadas; `casos/` no cambia y `data/facts/` tampoco; `npm run validar` pasa.
154. `validar` con `lanzamiento: null` y `PRUEBAS_ABIERTAS = true` → aviso y código 0; con `--estricto` → 1; con un lanzamiento de ayer y `true` → error; con uno futuro y `true` → aviso que cita la fecha. Ningún archivo de `js/` ni `herramientas/` contiene `2026-11-01`.
155. Con `lanzamiento: null`, el juego normal muestra `sin-casos` con `sin_casos.sin_lanzamiento`; con `?prueba=1`, se juegan los dos retos.
156. Aviso de calendario corto por reto: con `lanzamiento: null` cuenta todos los días; con fecha, solo los de hoy en adelante.

## 8.18 Dos retos en juego.js [D-98 a D-101, D-121]
157. [2.1] `RETOS` es exactamente `['imagenes', 'afirmaciones']` y está congelado; `RETO_POR_DEFECTO === 'imagenes'`; `retoValido('afirmaciones')` → `true` y `('titulares')`, `('datos')`, `('toString')` y `(undefined)` → `false`; `estadoInicial({reto: 'x'}).reto === 'imagenes'`; `retoDePrueba('?reto=afirmaciones')` → `'afirmaciones'` y `('?reto=titulares')` → `null`.
158. [2.1] `CARGADO` con `reto: 'afirmaciones'` y Fact or Fake sin caso pero Images con caso → `portada` con `reto: 'imagenes'`. Con los dos casos → el reto pedido, con sus campos copiados (`textos` y `pruebas: null`).
159. `ELEGIR_RETO` en portada copia `n`, `tema`, `pruebas`, `textos`, `clave` y `fichas` del reto; con un reto inválido o fuera de `portada` → el mismo objeto.
160. [2.1] `EMPEZAR`: con el reto sin caso → el mismo objeto; con el reto jugado → `ya-jugado`; Fact or Fake pendiente con `{fecha: '2026-12-01'}` → `caso/pregunta`, `indice: 0`, `activo: false`, `fecha`, `resultados: '-----'` y `texto` = la afirmación de la prueba 0 (la del test, una cadena).
161. [2.1, D-115] `VOLVIO` en Fact or Fake, `caso/pregunta` con `activo: true` e `indice` igual: con `ocultoMs: 3001` (y `Infinity`) → `veredicto`, `resultados[indice] === 'F'`, `revelada`, `ficha` = `{aclaracion, detalles}` descifrada, `motivo: 'oculta'`, `activo: false`. Con `ocultoMs` 3000, 1500, 0, `-1`, `NaN`, `'5000'` o ausente → el mismo objeto. Con 5000 pero `activo: false`, otro `indice`, en `veredicto`, `resultado` o `portada` → el mismo objeto.
162. [2.1] `VOTO` en Fact or Fake → `ficha` `{aclaracion, detalles}` (la del test, con 0 y con 3 detalles) y `motivo: null`. `SIGUIENTE` → `texto` de la prueba siguiente, `ficha`, `revelada` y `motivo` a `null`. En la prueba 5 → `resultado`, `texto: null`, `retos.afirmaciones.jugado: true` y `retos.imagenes` sin cambios.
163. [2.1] En ningún estado alcanzable de Fact or Fake hay más de una afirmación descifrada: `texto` es la de `indice` o `null`.
164. `VOLVER_PORTADA` desde `resultado` y `ya-jugado` → `portada` con el mismo reto y `fase`, `texto`, `ficha` y `revelada` a `null`; desde otras pantallas → el mismo objeto.
165. [2.1] `OTRA_PESTANA {reto: 'afirmaciones'}`: en `portada` con `reto: 'imagenes'` → sigue en `portada` con `retos.afirmaciones.jugado: true`; en `caso` de Fact or Fake → `ya-jugado`; en `caso` de Images → sigue en `caso`; con un reto inválido → el mismo objeto.
166. `MEDIANOCHE` en `portada`, `ya-jugado` o `sin-casos` → `iniciando`; en `caso` → el mismo objeto.

## 8.19 Ofuscación de Fact or Fake en diario.js [D-124]
167. Tras la refactorización, `flujoFicha('Mpb9Ycc=', 1, 0)` y `ofuscarFicha('Fotografía real', 'Mpb9Ycc=', 1, 0, () => 0)` siguen dando el vector de D-92, y `flujoFicha(c, n, i)` es igual a `flujoBytes(\`${c}|${n}|${i}\`, 512)`.
168. [2.1] `ofuscarAfirmacion`/`desofuscarAfirmacion`: ida y vuelta con ASCII, con `’`, `—`, `é` y emojis, y con exactamente 510 bytes; salida de 684 caracteres con `/^[A-Za-z0-9+/]{683}=$/`; texto con `\n`, vacío o no cadena → `TypeError`; 511 bytes → `RangeError`. `desofuscarAfirmacion` devuelve `null` sin lanzar con otra longitud, `!`, `null`, un bloque vacío, con `\n` o con UTF-8 inválido (construidos con `flujoBytes`). Con la misma clave, `n` e índice, los flujos de afirmación, aclaración y ficha de imagen son distintos dos a dos.
169. [2.1] `ofuscarAclaracion`/`desofuscarAclaracion`: ida y vuelta con 0, 1 y 3 detalles y con exactamente 510 bytes; salida de 684 caracteres, igual de larga con 0 que con 3 detalles; 511 bytes → `RangeError`; 4 detalles, un detalle vacío, una aclaración con `\n` o `detalles` que no es un array → `TypeError`. `desofuscarAclaracion` → `null` con 5 partes, con una parte vacía (por ejemplo, `'a\n\nb'`), con contenido vacío y con UTF-8 inválido.
170. [2.1] Vectores de regresión de 4.8 fijados en `tests/diario.test.mjs` y copiados en DECISIONES (sustituyen a los de D-119).
171. [2.1] `js/diario.js` no exporta `ofuscarTexto`, `desofuscarTexto`, `ofuscarNoticia`, `desofuscarNoticia`, `urlFuenteValida`, `medioDeUrl`, `TEXTO_*`, `NOTICIA_*` ni ninguna función `*Titulares*`. Búsqueda con `grep -ri titulares` en `js/`, `herramientas/` y `tests/`: las únicas apariciones permitidas son la comprobación de `validar.mjs` que rechaza `data/titulares/` (4.12) y los tests de rechazo (`retoValido('titulares')`, `retoDePrueba('?reto=titulares')`, el reto `'titulares'` del criterio 174 y el `ajustes.reto` del 176).
172. [2.1] `validarAfirmaciones(obj, mes)` acepta un archivo mensual versión 1 construido con las funciones de ofuscación (`mes: '2000-02'`, días 32 a 34), con y sin el parámetro `mes`; rechaza: `version: 2`, sin `mes`, `mes: '2026-13'`, `mes` distinto del parámetro, `dias: []`, un campo extra (en el objeto o en un día, por ejemplo `fuentes`), `lanzamiento`, `n` no consecutivos, `n: 0`, 4 o 6 `textos` o `fichas`, longitudes de 683 y 685 en `textos` o en `fichas`, una ficha de 1368 (formato de la 2.0), un tema inválido y una clave inválida.
173. [2.1] Con `lanzamiento: '2026-12-15'` y un archivo `mes: '2027-01'` con los días 18 a 48: `afirmacionesDelDia(d, l, '2027-01-01')` → el día 18 con `fecha: '2027-01-01'`; `(d, l, '2026-12-31')` → `null`; `(d, null, '2027-01-01')` → `null`. Con `lanzamiento: null` y el archivo `2000-02` (días 32 a 60): `afirmacionesDeNumero(d, null, 32)` → el día 32 con `fecha: '2000-02-01'`; `(d, null, 31)` y `(d, null, 61)` → `null`; `(afirmacionesVacias('2000-02'), null, 32)` → `null`.

## 8.20 Almacén versión 3 [D-109, D-121]
174. [2.1] `registrarInicio`, `registrarPrueba`, `registrarFin` y `cerrarAbandonada` con `reto: 'afirmaciones'` no modifican `retos.imagenes`, y al revés; con `reto: 'x'` o `'titulares'` devuelven `datos` sin cambios y no lanzan.
175. [2.1] Rachas independientes: Images jugado 3 días seguidos y Fact or Fake solo el último → `racha` 3 y 1.
176. `leer` con `ajustes.reto: 'x'` o `'titulares'`, o `ajustes.modo: 'medio'` escritos a mano: main.js usa `imagenes` y `normal` (prueba manual).

## 8.21 Compartir y textos de Fact or Fake [D-128]
177. [2.1] `textoCompartir` con `compartir.plantilla_afirmaciones`, `n: 12`, `resultados: 'FAAAA'`, `racha: 5` y la URL de ejemplo es estrictamente igual al ejemplo de Fact or Fake de la sección 7 (4 líneas, sin "Mode").
178. Compartir desde `ya-jugado` de cada reto usa su plantilla, su partida y su racha.
179. [2.1] El criterio 35 se cumple con un texto de prueba construido con afirmaciones, aclaraciones y detalles conocidos.
180. [2.1] `como_jugar.pasos_afirmaciones`, `portada.regla_afirmaciones` y `afirmaciones.oculta` dicen que salir de la página **más de unos segundos** antes de responder es fallo; ningún texto de Images lo dice de Images.

## 8.22 Marcado, composición y bloqueo de copia [D-102, D-126]
181. [2.1] Ids, clases y valores nuevos o cambiados (`portada-retos`, `reto-imagenes`, `reto-afirmaciones`, `reto-*-estado`, `portada-regla`, `portada-empezar-texto`, `caso-aviso`, `afirmacion`, `afirmacion-texto`, `afirmacion-marca`, `veredicto-aclaracion*`, `veredicto-detalles`, `voto-*-texto`, `voto-*-tecla`, `ficha-afirmacion`, `ficha-aclaracion*`, `ficha-detalles`, `resultado-reto`, `ya-jugado-reto`, `sin-casos-texto`, `miniatura-numero`, `volver-portada`, `imagenes`, `afirmaciones`, `data-reto`, `data-verdad`, `creditos-afirmaciones`) y las rutas `data/facts/AAAA-MM.json` no contienen palabras prohibidas (`npm run validar`).
182. [2.1] **Sin deslizar** (método del criterio 126, en 360 x 640, 640 x 360, 1280 x 720, 390 x 844 y 768 x 1024):
    - `portada` con Images elegido y con Fact or Fake elegido; con el desplegable cerrado y abierto, en modo prueba con selector y aviso, y con `#aviso-almacen`;
    - `caso` de Fact or Fake en `pregunta` con una afirmación de 140 caracteres (texto de prueba en inglés con palabras largas) y con una de 30, **en la prueba 1 (con `#caso-aviso`)** y en la prueba 2;
    - `caso/veredicto` de Fact or Fake FACT y FAKE con aclaración de 160 y 3 detalles de 80, y con aclaración corta y 0 detalles, y el veredicto por ausencia; en todos los tamaños, también 640 x 360, se comprueba que la afirmación sigue visible en el veredicto (R16, D-148);
    - `resultado` (con el mensaje más largo de `final.mensajes_afirmaciones`) y `ya-jugado` de Fact or Fake (también con `avisos.otra_pestana`), y `sin-casos` con `sin_lanzamiento`.
183. [2.1] Las dos fichas de reto están en una fila, miden al menos 44 px de alto, muestran el nombre en una línea ("Fact or Fake" incluido) y el estado entero; con Fact or Fake elegido, `#portada-modos` tiene `hidden` y no se alcanza con Tab, y `#portada-regla` es visible.
184. [2.1] Bloqueo de copia en `#afirmacion`: doble clic, triple clic, arrastrar y pulsación larga no seleccionan texto; Ctrl+C y el menú contextual sobre la tarjeta no copian. Fuera de `#afirmacion` el menú contextual funciona.
185. [2.1] Lectores de pantalla (NVDA y VoiceOver en iOS): al entrar en cada prueba se lee la afirmación con la navegación normal (la tarjeta se anuncia con "Claim N/5"); `#afirmacion-marca` no se lee; en la prueba 1 se anuncia una vez el aviso de ausencia; en el veredicto se leen sello, pie, aclaración y detalles (como lista).
186. [2.1] Resultado de Fact or Fake: 5 `button.miniatura` numerados en una fila, de al menos 44 x 44 px, con nombre accesible "Claim N: correct|wrong"; al activarlos se abre el diálogo con la afirmación completa, "It was: FACT|FAKE", la aclaración y los detalles, sin título de confesión.
187. [2.1] En el veredicto y el diálogo, los sellos dicen exactamente "FACT" y "FAKE", tienen contraste AA, son distintos entre sí sin depender del color (texto), y la afirmación sigue visible y legible (R16, D-148).

## 8.23 main.js con Fact or Fake (manual con `npx serve`)
188. [2.1] Partida completa de Fact or Fake con ratón, con teclado (F, K y Enter) y en un móvil de 360 px en vertical y horizontal; no pasa por `cargando` ni `cuenta-atras` y no hay temporizador.
189. [2.1] El intento se gasta al pulsar Start: recargar en la afirmación 1 lleva a la portada con Fact or Fake "Filed · 0/5" y el mismo día no se puede repetir.
190. [2.1, D-115] **Pestaña oculta** en Fact or Fake, con una afirmación en pregunta ya pintada: 1 a 2 s y volver → sigue en pregunta, los votos (botones, F y K) funcionan y no se guarda nada; 5 s o más → veredicto con `data-estado="fallo"`, `afirmaciones.oculta`, sello, aclaración y detalles, y foco en Next; código guardado `F`; ocultarla en el veredicto, el resultado, la portada, `ya-jugado` o antes del pintado no cambia nada. En Images, el criterio 58 sigue igual.
191. [2.1] **Antes de responder**, en Fact or Fake: `document.body.innerHTML` contiene la afirmación actual, pero no las otras afirmaciones del día, ni la aclaración, ni ningún detalle, ni la verdad (búsqueda de fragmentos conocidos de los datos de prueba); `#veredicto` no tiene `data-estado` ni `data-verdad`. Después de `SIGUIENTE` desaparecen la afirmación y la aclaración anteriores.
192. [2.1] Al responder no hay ninguna petición de red. En Fact or Fake no hay ningún enlace (`a`) en `#pantalla-caso`, `#pantalla-resultado` ni `dialog#ficha`. Con una aclaración manipulada en los datos de prueba (cadena aleatoria de 684 caracteres), el veredicto muestra `afirmaciones.aclaracion_no_disponible` sin romper la partida.
193. [2.1] Los dos retos el mismo día, en los dos órdenes: la portada muestra el estado correcto de cada uno tras cada partida y tras recargar; Back vuelve a la portada; rachas, `ya-jugado`, mensajes finales y textos de compartir son de su reto; el tema y el lema de la portada son los mismos con los dos retos.
194. [2.1] Dos pestañas: con Fact or Fake en curso en una, la otra muestra Fact or Fake "In another tab" y puede jugar Images.
195. Medianoche: en `ya-jugado` de cualquier reto, al llegar a 0 la cuenta atrás lleva a la portada del día siguiente.
196. Con `localStorage` bloqueado, los dos retos se juegan enteros con `#aviso-almacen`.

## 8.24 Importador y datos de Fact or Fake (archivero) [D-123, D-127, D-131]
197. [2.1] `analizarAfirmaciones` (tests en `tests/afirmaciones.test.mjs`) da un error, con ruta y número de bloque, en cada caso de 4.11 (un test por regla; entre ellos, un bloque con una línea `source:` → "campo no previsto"), acepta el ejemplo de 4.9 (con CRLF y BOM, con 0, 1 y 3 `details`) y nunca lanza; cada elemento devuelto tiene exactamente las claves `tipo`, `afirmacion`, `aclaracion` y `detalles`.
198. [2.1] `avisosLongitud`: afirmaciones verdaderas de media 60 y falsas de 75 (25 %) → un aviso; 60 y 70 (16,7 %) → ninguno; aviso por día y global, en el sentido correcto ("las falsas miden más" o "las verdaderas miden más"). `UMBRAL_LONGITUD === 0.2` [D-140].
199. [2.1] `planificarAfirmaciones`: numeración, huecos, carpeta sin archivo al final (pendiente con aviso) y en medio (error), `facts.en.txt` preferido a `facts.txt`, tema con palabra prohibida, tema distinto del de Images para el mismo `n`, y días pasados con lanzamiento; cada nuevo lleva `archivo` y `mes`; ignora `ia/`, `real/`, `datos.txt`, `datos.original.txt` y cualquier otro archivo, sin errores ni avisos por ellos (una carpeta con solo `datos.txt` y `datos.original.txt` cuenta como carpeta sin archivo de afirmaciones) [D-139].
200. [2.1] `npm run afirmaciones -- --simular` y `npm run afirmaciones` sin `--revisado` no escriben nada y muestran la lista de revisión y el archivo mensual de destino de cada día; ninguna salida contiene una afirmación, aclaración ni detalle de los datos de prueba.
201. [2.1] Con 40 carpetas de prueba correctas (fuera de la `entrada/` real, en una copia de `data/`) y `lanzamiento: null`, `npm run afirmaciones -- --revisado` crea `data/facts/2000-01.json` (días 1–31) y `2000-02.json` (32–40), que pasan `validarAfirmaciones` y `unirMeses`, cuyos bloques descifran a los textos originales (normalizados) con el orden barajado y cuya clave cuadra con los `answer` de cada carpeta; no crea ni modifica nada en `herramientas/`; una segunda ejecución omite todos los días y deja todo idéntico byte a byte; `entrada/` no cambia.
202. [2.1] `validar` sobre `data/facts/` manipulado: un bloque cambiado por otra cadena aleatoria de la misma longitud → "no se puede descifrar"; afirmaciones repetidas (también entre dos meses) → error; tema distinto del de Images → error.
203. [2.1] `creditos.html` incluye `#creditos-afirmaciones` con `creditos.afirmaciones` y `creditos.afirmaciones_texto` (el valor exacto de 3.1), y no incluye `#creditos-noticias`, `#creditos-medios` ni ninguna fuente; regenerarlo no depende de `data/facts/`.
204. [2.1] Ningún archivo publicado ni rastreado contiene en claro una afirmación, aclaración o detalle de Fact or Fake (búsqueda de fragmentos en `data/` —incluidos todos los `data/facts/*.json`—, `js/`, `creditos.html`, `herramientas/`, `docs/` y `tests/` reales); `git status` y `git ls-files` no muestran nada de `entrada/` (tampoco `datos.txt` ni `datos.original.txt`).
205. [2.1] `npm test` pasa con Node 20 en un clon limpio, sin `entrada/`, sin bancos, sin `data/facts/` y sin depender de la fecha actual ni del lanzamiento real.

## 8.25 Ausencia de más de 3 s en Fact or Fake [D-115]
206. `OCULTA_MAX_MS === 3000`. `ocultacionEsFallo`: `3001` y `Infinity` → `true`; `3000`, `2999`, `0`, `-5`, `NaN`, `'5000'`, `null` y `undefined` → `false`.
207. `medirOculta`: los casos de la 2.0 (sin cambios).
208. [2.1] Recorrido completo en `tests/juego.test.mjs` con Fact or Fake: prueba 2 pintada, `VOLVIO {ocultoMs: 2000, indice: 1}` → mismo objeto; `VOTO` → veredicto normal (`motivo: null`); `SIGUIENTE`, `PINTADA`, `VOLVIO {ocultoMs: 3500, indice: 2}` → `F` con `motivo: 'oculta'`; un segundo `VOLVIO` en ese veredicto → mismo objeto.
209. [2.1] Manual (Chrome de escritorio y un móvil): bloquear la pantalla 2 s → sin efecto; 10 s → `F` al volver; cuatro ausencias seguidas de unos 2 s → sin efecto; ocultar más de 3 s y cerrar sin volver → al reabrir, Fact or Fake "Filed" con esa afirmación y las siguientes en `F`; en la pestaña oculta, ninguna petición ni temporizador del juego.
210. [2.1] Aviso: `#caso-aviso` visible solo en la pregunta de la prueba 1 de Fact or Fake, con el texto exacto de `afirmaciones.aviso_oculta`; `hidden` en el resto; el anuncio suena una vez por partida.

## 8.26 Archivos por mes [D-116, D-117, D-124]
211. [2.1] `mesDeFecha` y `mesDeNumero`: los casos de la 2.0. `rutaAfirmaciones('2026-12')` → `'data/facts/2026-12.json'`; `('2026-1')` y `('../x')` → `null`. `js/diario.js` no exporta `diaPedido`.
212. [2.1] `cargarAfirmaciones('2026-12-15', pedir)` con un `pedir` falso: pide una sola vez exactamente `'data/facts/2026-12.json'` con `{cache: 'no-cache'}`; con 404 → `afirmacionesVacias('2026-12')`; con 500, error de red, JSON inválido, `mes: '2026-11'` o estructura inválida → rechaza; con `'2026-13-01'` → rechaza sin llamar a `pedir`.
213. [2.1] `unirMeses` y `repartirPorMes` (`tests/afirmaciones.test.mjs`): los casos de la 2.0 con nombres de `data/facts/` (70 días sin lanzamiento → `2000-01`, `2000-02`, `2000-03`; con `'2026-12-15'` → `2026-12`, `2027-01`, `2027-02`; errores de nombre, JSON, hueco, repetido y mes; repetido idéntico aceptado con `comprobarMes: false`).
214. [2.1] `npm run afirmaciones` con días ya importados 1–40 y 25 carpetas nuevas (41–65): reescribe `2000-02.json`, crea `2000-03.json` y deja `2000-01.json` idéntico byte a byte; no borra nada.
215. [2.1] `npm run lanzamiento -- 2026-12-15` con los datos del 214: crea `2026-12.json`, `2027-01.json` y `2027-02.json` en `data/facts/`, borra los `2000-*.json`, y cada día descifra igual que antes; `npm run validar` pasa; repetir no cambia nada; `--sin-fecha` vuelve al reparto `2000-*` idéntico.
216. [2.1] `validar` falla con: `data/titulares/` o `data/titulares.json` presentes; otra entrada en `data/facts/` (por ejemplo `2026-12.json.bak`); `mes` distinto del nombre; un día en un mes que no le corresponde; hueco o repetido entre meses. Con `data/facts/` vacía o inexistente pasa, con el aviso de calendario corto de Fact or Fake.
217. [2.1] Manual, juego normal sin `?prueba=1` (con un lanzamiento de prueba en local): **una sola** petición a `data/facts/` (la del mes de hoy); sin archivo de ese mes, Fact or Fake muestra "No case today" sin pantalla de error; con el archivo corrupto, `error`.
218. [2.1] Manual, cambio de mes: a medianoche del último día de un mes con la portada abierta se pide el archivo del mes nuevo; una partida de Fact or Fake empezada a las 23:59 se termina con sus afirmaciones.
219. [2.1] Manual, modo prueba con `lanzamiento: null` y `2000-01` (1–31), `2000-02` (32–60) y `2000-03` (61–65): tres peticiones en serie a `data/facts/`, sin 404; sin `2000-03`, tres peticiones y la última es un 404 que no lleva a `error`; con `2000-02` parcial y sin `2000-03`, solo dos. El selector lista todos los días; Open this day del día 35 recarga y Fact or Fake del día 35 se juega.
220. [2.1] Peso: ningún archivo mensual generado con 31 días de prueba supera 240 KB.
221. [2.1] `creditos.html` no cambia al importar afirmaciones ni al repartir los meses.

## 8.27 Modo prueba con todos los meses [D-117]
222. [2.1] `cargarAfirmacionesPrueba(lanzamiento, pedir)`: los casos de la 2.0 con rutas `data/facts/` (dos meses sin tercera petición; 404 final; 404 en la primera → `[]`; 500, red, JSON o estructura inválidos → rechaza; hueco o mes equivocado → corta la cadena; lanzamiento `'2026-12-15'`; `'2026-13-01'` rechaza sin pedir; peticiones en serie).
223. [2.1] `afirmacionesDelMes(meses, '2000-02')` devuelve el mismo objeto (`===`); con un mes que no está, `null` o `{}`, un objeto igual a `afirmacionesVacias('2000-02')`; con `'2000-13'`, `null`. `afirmacionesDeNumero(afirmacionesDelMes(meses, mesDeNumero(null, 35)), null, 35)` → el día 35 con `fecha: '2000-02-04'`.

## 8.28 Novedades de la 2.1 [D-120 a D-140]
224. [2.1] `planificar` de imágenes (`temas.mjs`): una carpeta con `ia/`, `real/`, `facts.txt`, `facts.en.txt`, `datos.txt` y `datos.original.txt` pasa (los cuatro archivos se ignoran, sin errores ni avisos) [D-139]; con otro archivo suelto (por ejemplo `Datos.txt` o `notas.txt`), error; una carpeta final con solo `facts.txt` (o solo `datos.txt` y `datos.original.txt`) queda en `pendientes` con un aviso; una carpeta con solo `facts.txt` seguida de otra con imágenes → error de hueco; una carpeta con solo `ia/` → error.
225. [2.1] `TECLAS` y `votoDeTecla`: `('imagenes', 'r')` y `('imagenes', 'R')` → `'autentica'`; `('imagenes', 'i')` → `'generada'`; `('afirmaciones', 'f')` y `('afirmaciones', 'F')` → `'autentica'`; `('afirmaciones', 'k')` → `'generada'`; `('imagenes', 'f')`, `('afirmaciones', 'r')`, `('afirmaciones', 'i')`, `('x', 'f')`, `('afirmaciones', 'fk')`, `('afirmaciones', '')` y `('afirmaciones', null)` → `null`. `teclaDeVoto('afirmaciones', 'generada')` → `'K'`; `teclaDeVoto('imagenes', 'autentica')` → `'R'`; reto o voto inválido → `null`. `TECLAS` está congelado (también por dentro).
226. [2.1] Manual: en Fact or Fake, R e I no hacen nada; en Images, F y K no hacen nada; Ctrl+F abre la búsqueda del navegador y Ctrl+K no vota; los botones muestran FACT/F y FAKE/K en Fact or Fake y REAL/R y AI/I en Images, y `aria-keyshortcuts` cambia con el reto.
227. [2.1] La marca `#afirmacion-marca` muestra "identifAI-it · Fact or Fake?" en las dos fases de las 5 pruebas, también en una captura a 360 x 640 y a 640 x 360.
228. **Retirado** [D-131] (validaba el banco de fuentes, que ya no existe).
229. **Retirado** [D-131] (importador sin banco: no aplica).
230. **Retirado** [D-131] (`.gitignore` no lleva `herramientas/banco-afirmaciones.json`).
231. [2.1, D-131, D-136, D-137] La lista de revisión que muestra el importador es exactamente `LISTA_REVISION` (4.13, **8 puntos**, ninguno menciona fuentes salvo el 6 para prohibir que la `truth` las cite) y `CLAUDE.md` y `.claude/agents/archivero.md` contienen el texto exacto de la norma de 4.13 ("Nada falso sobre salud, seguridad, tragedias ni política. Las afirmaciones falsas pueden alterar cifras o récords de personas y marcas famosas si no dañan su reputación. …"), sin la frase de la fuente privada ni la prohibición general sobre personas reales (revisión manual).
232. [2.1] Vectores: con la misma clave, `n` e índice, `ofuscarAfirmacion` y `ofuscarAclaracion` con `() => 0` dan bloques distintos aunque el contenido sea idéntico (semillas con sufijo distinto).
233. [2.1] Tema común: en la portada, el tema del día es el mismo con Images y con Fact or Fake elegidos; en el selector del modo prueba, cada día muestra un solo tema.
234. [2.1] `ficha` de Fact or Fake con 0 detalles: el veredicto y el diálogo no muestran ninguna lista vacía (el `ul` tiene `hidden`) y los lectores de pantalla no anuncian una lista vacía.
235. [2.1] `index.html`, `creditos.html`, `js/`, `css/` y `data/` no contienen `titulares`, `Headlines`, `AI-GENERATED`, `NOT A REAL STORY` ni `noticias`; no existen `herramientas/titulares.mjs`, `herramientas/importar-titulares.mjs`, `tests/titulares.test.mjs`, `data/titulares/` ni `docs/especificacion/4b-titulares.md`; `package.json` no tiene el script `titulares`. [D-131] Tampoco existen `herramientas/banco-afirmaciones.json` ni las exportaciones `FUENTE_MAX`, `BANCO_AFIRMACIONES_VERSION` y `validarBancoAfirmaciones`, y `.gitignore` no menciona `banco-afirmaciones`.
236. [2.1, D-134] `mensajesDelReto` (`tests/juego.test.mjs`), con un `final` de prueba `{mensajes: A, mensajes_afirmaciones: B}`: `('imagenes', final)` → `A` (el mismo array, `===`); `('afirmaciones', final)` → `B`; `('titulares', final)`, `('x', final)`, `(undefined, final)`, `('imagenes', null)` y `('afirmaciones', undefined)` → `null`, sin lanzar. Con los textos reales, `mensajeFinal(k, mensajesDelReto('afirmaciones', TEXTOS.final)) === TEXTOS.final.mensajes_afirmaciones[k]` y con `'imagenes'`, `=== TEXTOS.final.mensajes[k]`, para `k` de 0 a 5.
237. [2.1, D-134] Manual (`npx serve`): al terminar Fact or Fake con 0, 3 y 5 aciertos, `#resultado-mensaje` muestra `final.mensajes_afirmaciones[0|3|5]`; al terminar Images, `final.mensajes[aciertos]`; jugar los dos retos el mismo día nunca muestra en uno el mensaje del otro; la portada muestra siempre el lema "Two cases a day. Spot the fake." con los dos retos.
238. [2.1, D-136, D-137] `LISTA_REVISION` (`tests/afirmaciones.test.mjs`): es un array de exactamente 8 cadenas no vacías; la primera habla de reputación y de personas y marcas (contiene "reputación" y "marca"); la sexta habla de la `truth` (contiene "truth"); ninguna contiene "personas reales" ni "source"; la octava contiene "R15".
239. [2.1, D-139] Notas del usuario: con carpetas de prueba (fuera de la `entrada/` real) que contienen, además de sus archivos válidos, un `datos.txt` y un `datos.original.txt` con bytes no UTF-8 y texto con `{`, `source:` y `---`, `npm run importar -- --simular` y `npm run afirmaciones -- --simular` terminan sin errores ni avisos sobre ellos, ninguna salida muestra su contenido, y los dos archivos quedan idénticos byte a byte (y con la misma fecha de modificación) tras una importación real.
240. [2.1, D-140] Longitud: con un día de prueba cuyas falsas miden de media un 50 % más que las verdaderas, `npm run afirmaciones -- --revisado` muestra el aviso, escribe el día y termina con código 0; `npm run validar` sobre ese resultado muestra el aviso y termina con código 0, también con `--estricto` si no hay otro motivo de fallo.
