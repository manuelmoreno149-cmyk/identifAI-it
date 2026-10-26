# identifAI-it: especificación técnica, versión 2.0 · 8. Criterios de aceptación

Parte de la especificación 2.0 (índice en `docs/ESPECIFICACION.md`) [D-91, D-114]. Se conserva la numeración. Los criterios modificados en la 1.3 llevan **[1.3]** y los de la 2.0, **[2.0]**; los que cambian por los ajustes del 2026-10-26 llevan además **[D-115]** o **[D-116]**. Los que no cambian se resumen (detalle de la 1.2 en git, commit `225c28a`). Los textos de interfaz citados en español son referencias: el valor es el de `js/textos.js` [D-93]. Los criterios nuevos de la 2.0 van del 149 al 205, y los de D-115 y D-116, del 206 al 221.

## 8.1 diario.js
1. `fechaLocal(new Date(2026, 10, 1, 23, 59, 59))` → `'2026-11-01'`; con `(2026, 10, 2, 0, 0, 0)` → `'2026-11-02'`.
2. `numeroCaso('2026-11-01', '2026-11-01')` → 1; `'2026-11-02'` → 2; `'2026-10-31'` → 0; `'2027-03-28'` → 148. (Las fechas son ejemplos de test, no el lanzamiento.)
3. `sumarDias('2026-12-31', 1)` → `'2027-01-01'`; `('2027-03-27', 2)` → `'2027-03-29'`.
4. `msHastaMedianoche(new Date(2026, 10, 1, 23, 59, 0))` → 60000.
5. `formatearCuentaAtras(3_661_000)` → `'01:01:01'`; con `-5` → `'00:00:00'`.
6. `ofuscar([0,1,1,0,1], 1, () => 0)` → `'Mpb9Ycc='`; `desofuscar` devuelve `0,1,1,0,1`.
7. Ida y vuelta de `ofuscar`/`desofuscar` con 200 combinaciones aleatorias.
8. [2.0] `casoDelDia` con un calendario de ejemplo **versión 4** y `lanzamiento: '2026-12-01'`: `null` antes del lanzamiento y después del último día; `casoDelDia(cal, '2026-12-02')` devuelve exactamente `{n: 2, fecha: '2026-12-02', tema, pruebas, clave, fichas}` con `fichas` idéntico (`===`). Con `lanzamiento: null`, `null` para cualquier fecha.
9. [2.0] `validarCalendario` acepta un calendario versión 4 (con `lanzamiento` `null` y con fecha) construido con `ofuscar` y `ofuscarFicha`, y rechaza: los casos de la 1.2 y la 1.3; `version` 1, 2 y 3; un día con `fecha`; `lanzamiento` `''`, `'2026-13-01'`, `20261201` o ausente.
10. `precargar` rechaza si una imagen falla y no toca el DOM.

## 8.2 juego.js
11. `transicion` no muta el estado (`Object.freeze` profundo, también `retos`).
12. [2.0, D-115] `EMPEZAR` en `portada` con el reto `imagenes` pendiente lleva a `cargando`. `VER_COMO_JUGAR`, `ENTENDIDO` y `OCULTA` (evento retirado) devuelven el mismo objeto en cualquier pantalla y reto. `VOLVIO {ocultoMs: 60000, indice}` en Images devuelve el mismo objeto en cualquier pantalla (también en `caso/pregunta` con `activo: true`).
13. `VOTO` con `activo: false` devuelve el mismo objeto.
14. [1.3] `VOTO` en Images: `A`/`F`, con `tapada` falso o verdadero, `fase: 'veredicto'`, `revelada`, `tapada: false`, `activo: false`, `ficha` = `desofuscarFicha(...)`; con `fichas: null`, `ficha: null`.
15. Un segundo `VOTO`, un `AGOTADO` o un `VOLVIO` en `veredicto` no cambian el estado.
16. [1.3] `SIGUIENTE` en Images: como en la 1.3.
17. [2.0] `CARGADO`: con los dos casos `null` → `sin-casos`; con un caso → `portada` con su `tema` y sus `fichas` copiados, que no cambian con `FIN_CUENTA`, `VOTO` ni `SIGUIENTE`. Con un reto jugado, `CARGADO` lleva a `portada` (no a `ya-jugado`) con `retos[reto].jugado: true`.
18. [1.3] `contarAciertos`, `mensajeFinal` y `estadoDeCodigo`: como en la 1.3.
19. [1.3] `AGOTADO` en Images: como en la 1.3. [2.0] En Headlines, siempre el mismo objeto.

## 8.3 temporizador.js
20 a 25. Sin cambios (24 y 25, solo Images).

## 8.4 almacen.js
26. Con un almacén que lanza, `leer` → `{datos: datosIniciales(), disponible: false}` y `guardar` → `false`.
27. [2.0] `CLAVE === 'identifaiit.v3'`. JSON corrupto o `version: 2` en `identifaiit.v3` → datos iniciales. Con un almacén que solo tiene `identifaiit.v2` (y `identifaiit.v1`), `leer` devuelve los datos iniciales y, tras `leer` y `guardar`, esas claves siguen intactas.
28. [2.0] `registrarInicio` no modifica una partida existente de esa fecha y ese reto, aunque sea de otro modo.
29. [2.0] `cerrarAbandonada(datos, reto, …)` convierte `'AF---'` en `'AFFFF'`, `terminada`, 1 acierto, solo en ese reto.
30. `calcularRacha`: los casos de la 1.2.
31. `mejorRacha` nunca disminuye (en cada reto).
32. [2.0, D-115] Ningún dato guardado contiene la verdad, el voto, la ficha, el texto de una noticia, `tapada`, `motivo` ni instantes o duraciones de ausencia. `datosIniciales()` es exactamente el objeto de 3.5.

## 8.5 compartir.js
33. [1.3] `CUADROS` y `cuadros`: como en la 1.3.
34. [2.0] `textoCompartir` con `compartir.plantilla`, `n: 12`, `nombreModo: 'Bloodhound'`, `resultados: 'AAFAF'`, `racha: 3` y la URL de ejemplo es estrictamente igual al ejemplo de Images de la sección 7.
35. [2.0] El texto compartido (de los dos retos) no contiene "AI" ni "IA" como palabra suelta, "REAL", `autentica`, `generada`, ids de imagen, el tema, `⬛`, ningún texto de ficha ni ningún titular, entradilla, dominio o prompt de prueba. Única excepción: "identifAI-it".
36. `compartir` devuelve `compartido`, `cancelado`, `copiado` o `manual` y nunca lanza.
37. `urlDelJuego` quita `index.html` e ignora `search`.

## 8.6 textos.js
38. [2.0, D-115] Están exactamente las claves de 3.1, con: `portada.reto_imagenes === 'Images'`, `portada.reto_titulares === 'Headlines'`, `titulares.sello_generada === 'AI-GENERATED · NOT A REAL STORY'`, `titulares.aviso_oculta === 'Leaving the page for more than a few seconds counts as a miss.'`, `como_jugar.pasos.length === 4`, `como_jugar.pasos_titulares.length === 4`, `titulares.oculta.length >= 2`, y las de la 1.3 (`final.mensajes` 6, `veredictos` ≥ 4, `final.estados`, `confesion`, `fichas`, modos).
39. [2.0] Límites de 3.1 (1.3 y 2.0).
40. [2.0] `compartir.plantilla` y `compartir.plantilla_titulares` son exactamente las cadenas de la sección 7.

## 8.7 index.html, CSS y fuentes
41. [2.0, D-115] Existen todos los ids y atributos de la sección 2 (1.3 y 2.0) y ninguno contiene palabras prohibidas. Además: `#caso-escena` contiene, en orden, `#prueba-marco`, `#prueba-sobre`, `#recorte` y `#veredicto`; `#recorte` tiene `hidden` y su titular y entradilla están vacíos; `#caso-aviso` es el último hijo de `#caso-cabecera`, con `hidden` y `data-texto="titulares.aviso_oculta"`; `#veredicto-fuente` tiene `hidden` y ningún `a` de la página tiene `href` externo; `#portada-retos` tiene los dos radios `reto`; `#portada-regla` tiene `hidden`; `dialog#ficha` tiene sus hijos vacíos y los de fuente con `hidden`; no está `#selector-prueba`.
42. Como mucho una `.pantalla` sin `hidden`; sin JS, el `<noscript>`.
43. [1.3] Sustituido por los criterios 126 a 128 y 182.
44. Contraste AA y foco visible en todos los controles (también fichas de reto, botones numerados y enlaces de fuente), y contraste AA de `#caso-aviso`.
45. [2.0] Con `prefers-reduced-motion: reduce`, sin animación de sellos (de los dos retos), sobre ni sacudidas.
46. Rutas relativas; funciona bajo `/identifAI-it/` (también `data/titulares/{mes}.json`).
47. [2.0] Antes de responder, el DOM no contiene la verdad ni la ficha (1.3) y, en Headlines: `#veredicto` sin `data-estado` ni `data-verdad`, `#veredicto-fuente` oculto y sin `href`, y ningún atributo depende de la verdad.
48. Todas las peticiones van al mismo origen.
49. [2.0] CSP de 2.4 sin violaciones en una partida completa de cada reto, también al abrir un enlace de fuente.
50 a 53. Sin cambios.

## 8.8 main.js (manual con `npx serve`)
54. [1.3] Partida completa de Images en los tres modos (ratón, teclado, móvil en vertical y horizontal).
55. [2.0] Recargar durante la prueba 3 de Images lleva a la portada con Images "Filed · n/5" y las pruebas 3 a 5 en `F`; View report lleva a `ya-jugado`.
56. [1.3] Recargar en `portada` o en `cargando` permite jugar con normalidad.
57. [2.0] Tras terminar Images en `investigador`, no hay forma de volver a jugarlo ese día en ningún modo; Headlines sigue disponible.
58. [1.3] Pestaña oculta en Images: como en la 1.3 (sin penalización, dure lo que dure).
59. [2.0] Segunda pestaña o dos a la vez: como en la 1.3, **por reto** (jugar Headlines en una pestaña no afecta a Images en otra).
60 a 65. Sin cambios (62: una fecha fuera del calendario lleva a `sin-casos` si ningún reto tiene caso; 63: la cuenta atrás de `ya-jugado` lleva a la portada del día siguiente).

## 8.9 Herramientas (archivero)
66. [2.0] `npm run validar` falla en los casos de la 1.3 (salvo la versión 3, que ahora es error con su propio mensaje) y en los de 4.4.3 y 4.12.
67. En un clon limpio, sin banco: aviso y código 0; con `--estricto`, código 1.
68. [2.0] Avisos sin fallar: los de la 1.3 (por reto en el de calendario corto) y los de 4.4.3 y 4.12.
69. [2.0] `npm run importar` sin banco y con imágenes se detiene. Con un calendario de la versión 3 o un banco de la versión 2, se detiene con los mensajes de 4.4.2 y no modifica nada.
70 a 74. Sin cambios (el banco que se escribe es la versión 3 y el calendario, la 4).

## 8.10 a 8.12
75 a 103. Sin cambios, salvo: [2.0] en el 92 y el 100, el calendario resultante es la **versión 4** (sin `fecha`, con el `lanzamiento` que hubiera) y el banco, la **versión 3**.

## 8.13 Previsualización local [D-68]
104 a 113. Sin cambios, salvo: [2.0] el 106 se prueba con un calendario con `lanzamiento` de ejemplo; con `lanzamiento: null`, `?fecha=` lleva a `sin-casos`. [D-116] Con `?fecha=` de otro mes, solo se pide el archivo de titulares de ese mes.

## 8.14 Modo prueba
114, 116 a 118 y 121 a 124. Sin cambios.
115. [2.0, D-116] `diasDePrueba(cal, tit)` (con `tit` = un archivo mensual) devuelve exactamente `[{n, temaImagenes, temaTitulares}]` ordenado por `n`, con la unión de los días del calendario y del archivo y `null` en el tema que falte; nunca `pruebas`, `clave`, `textos` ni `fichas`; no muta; con `null`, `undefined`, `{}` o `titularesVacios(mes)` como `tit`, solo los días del calendario (y `[]` si tampoco hay calendario).
119. [2.0] Portada en modo prueba con selector y aviso (`avisos.prueba`), los dos retos y la navegación a `?prueba=1&dia=5&reto=titulares`; cabe sin deslizar (criterio 182).
120. [2.0] Anti-trampas en modo prueba: `option` solo con `value` y texto; se cumplen los criterios 47, 64, 136 y 191.

## 8.15
125. Sin cambios.

## 8.16 Versión 1.3 [D-76 a D-90]
126 a 148. Siguen valiendo para Images, con estos cambios [2.0]:
- 126: la lista de estados se amplía con los del criterio 182.
- 135: el almacén es `identifaiit.v3` (`ajustes.modo`); `identifaiit.v2` se ignora y queda intacto.
- 145: `calendarioAnteriorValido` acepta las versiones 2, 3 y 4 (la 4 con `lanzamiento: null` y con fecha) y rechaza la 1, `null`, `{}` y un día con 4 pruebas.

## 8.17 Lanzamiento y calendario versión 4 [D-95 a D-97]
149. `numeroDelDia('2026-11-30', '2026-12-01')` → `null`; `('2026-12-01', '2026-12-01')` → 1; `(x, null)` → `null`. `fechaDelDia(null, 3)` → `null`; `('2026-12-01', 3)` → `'2026-12-03'`.
150. `casoDeNumero(cal, 2)` devuelve el día 2 con `lanzamiento: null` (con `fecha: '2000-01-02'`) y con fecha (`fechaDelDia(lanzamiento, 2)`); con `n` 0 o mayor que el último, `null`.
151. `comprobarCambioLanzamiento`: fecha nueva igual a hoy o anterior → error; actual ya llegado → error; actual futuro y nuevo futuro → sin errores; `nuevo: null` con actual futuro → sin errores. `analizarArgumentosLanzamiento`: `[]` → `mostrar`; `['2026-12-01']` → `fijar`; `['--sin-fecha']` → `quitar`; `['x']` y dos argumentos → error.
152. `migrarCalendario` sobre el calendario actual (versión 3): devuelve la versión 4 sin `fecha` y con `n`, `tema`, `pruebas`, `clave` y `fichas` idénticos; un día cuya `fecha` no cuadra → error; aplicado a su propia salida, la devuelve igual. `migrarBanco` versión 2 → 3 sin `fecha`.
153. [D-116] `npm run lanzamiento -- --sin-fecha` sobre los datos actuales deja `data/calendario.json` versión 4 con `lanzamiento: null` y `banco.json` versión 3; `git diff` de `data/calendario.json` solo muestra la versión, el lanzamiento y las líneas `fecha` eliminadas; `casos/` no cambia y `data/titulares/` tampoco (si no tiene archivos, sigue sin tenerlos; si los tiene ya repartidos sin fecha, quedan idénticos); `npm run validar` pasa.
154. `validar` con `lanzamiento: null` y `PRUEBAS_ABIERTAS = true` → aviso y código 0; con `--estricto` → 1; con un lanzamiento de ayer y `true` → error; con uno futuro y `true` → aviso que cita la fecha. Ningún archivo de `js/` ni `herramientas/` contiene `2026-11-01` (búsqueda con `grep`).
155. Con `lanzamiento: null`, el juego normal muestra `sin-casos` con `sin_casos.sin_lanzamiento`; con `?prueba=1`, se juegan los dos retos.
156. Aviso de calendario corto por reto: con `lanzamiento: null` cuenta todos los días; con fecha, solo los de hoy en adelante.

## 8.18 Dos retos en juego.js [D-98 a D-101]
157. `RETOS` es exactamente `['imagenes', 'titulares']` y está congelado; `RETO_POR_DEFECTO === 'imagenes'`; `retoValido('titulares')` → `true` y `('noticias')`, `('toString')` y `(undefined)` → `false`; `estadoInicial({reto: 'x'}).reto === 'imagenes'`; `retoDePrueba('?reto=titulares')` → `'titulares'` y `('?reto=x')` → `null`.
158. `CARGADO` con `reto: 'titulares'` y Headlines sin caso pero Images con caso → `portada` con `reto: 'imagenes'`. Con los dos casos → el reto pedido, con sus campos copiados (`textos` en Headlines y `pruebas: null`).
159. `ELEGIR_RETO` en portada copia `n`, `tema`, `pruebas`, `textos`, `clave` y `fichas` del reto; con un reto inválido, el mismo, o fuera de `portada` → el mismo objeto.
160. `EMPEZAR`: con el reto sin caso → el mismo objeto; con el reto jugado → `ya-jugado`; Headlines pendiente con `{fecha: '2026-12-01'}` → `caso/pregunta`, `indice: 0`, `activo: false`, `fecha`, `resultados: '-----'` y `texto` = el titular y la entradilla de la prueba 0 (los del test).
161. [D-115] `VOLVIO` en Headlines, `caso/pregunta` con `activo: true` e `indice` igual al del estado: con `ocultoMs: 3001` (y con `Infinity`) → `veredicto`, `resultados[indice] === 'F'`, `revelada` = verdad, `ficha` descifrada, `motivo: 'oculta'`, `activo: false`. Con `ocultoMs` 3000, 1500, 0, `-1`, `NaN`, `'5000'` o ausente → el mismo objeto (sigue en pregunta con `activo: true`). Con `ocultoMs: 5000` pero `activo: false`, otro `indice`, en `veredicto`, en `resultado` o en `portada` → el mismo objeto.
162. `VOTO` en Headlines → `ficha` `{tipo, texto}` (la del test) y `motivo: null`. `SIGUIENTE` → `texto` de la prueba siguiente, `ficha`, `revelada` y `motivo` a `null`. En la prueba 5 → `resultado`, `texto: null`, `retos.titulares.jugado: true` y `retos.imagenes` sin cambios.
163. En ningún estado alcanzable de Headlines hay más de una noticia descifrada: `texto` es la de `indice` o `null` (test que recorre una partida completa y compara).
164. `VOLVER_PORTADA` desde `resultado` y `ya-jugado` → `portada` con el mismo reto, `fase: null`, `texto`, `ficha` y `revelada` a `null`; desde otras pantallas → el mismo objeto.
165. `OTRA_PESTANA {reto: 'titulares'}`: en `portada` con `reto: 'imagenes'` → sigue en `portada` con `retos.titulares.jugado: true`; en `caso` de Headlines → `ya-jugado`; en `caso` de Images → sigue en `caso` con `retos.titulares.jugado: true`; con un reto inválido → el mismo objeto.
166. `MEDIANOCHE` en `portada`, `ya-jugado` o `sin-casos` → `iniciando`; en `caso` de cualquier reto → el mismo objeto.

## 8.19 Ofuscación de Headlines en diario.js [D-103]
167. Tras la refactorización, `flujoFicha('Mpb9Ycc=', 1, 0)` y `ofuscarFicha('Fotografía real', 'Mpb9Ycc=', 1, 0, () => 0)` siguen dando el vector de D-92, y `flujoFicha(c, n, i)` es igual a `flujoBytes(\`${c}|${n}|${i}\`, 512)`.
168. `ofuscarTexto`/`desofuscarTexto`: ida y vuelta con titulares y entradillas ASCII, con `’`, `—`, `é` y emojis, y con exactamente 510 bytes; salida de 684 caracteres con `/^[A-Za-z0-9+/]{683}=$/`; titular con `\n`, titular vacío o entradilla no cadena → `TypeError`; 511 bytes → `RangeError`. `desofuscarTexto` devuelve `null` sin lanzar con: otra longitud, `!`, `null`, un bloque sin `\n`, con titular vacío y con UTF-8 inválido (construidos con `flujoBytes`). Con la misma clave, `n` e índice, el flujo del texto es distinto del de la ficha de imagen.
169. `ofuscarNoticia`/`desofuscarNoticia`: ida y vuelta con `fuente` y con `prompt`, y con un texto de exactamente 1021 bytes; salida `/^[A-Za-z0-9+/]{1366}==$/` (1368 caracteres) igual de larga para una URL de 20 bytes y un prompt de 1000; 1022 bytes → `RangeError`; tipo `'otro'` o texto vacío → `TypeError`. `desofuscarNoticia` → `null` con byte de tipo 2, contenido vacío, longitud 1023 y UTF-8 inválido.
170. Vectores de regresión de 4.8 fijados en `tests/diario.test.mjs` y copiados en DECISIONES.
171. `urlFuenteValida`: `true` con `'https://example.com/a?b=1'`; `false` con `'http://example.com/'`, `'javascript:alert(1)'`, `'https://user:pw@example.com/'`, `'/relativa'`, `'https://192.168.1.1/'`, `'https://localhost/'`, `'HTTPS://Example.com/'` (no normalizada), una de 1022 bytes, `null` y `42`. `medioDeUrl('https://www.apnews.com/x')` → `'apnews.com'`; `medioDeUrl('x')` → `null`.
172. [D-116] `validarTitulares(obj, mes)` acepta un archivo mensual versión 1 construido con las funciones de ofuscación (`mes: '2000-02'`, días 32 a 34), con y sin el parámetro `mes`; rechaza: `version: 2`, sin `mes`, `mes: '2026-13'`, `mes` distinto del parámetro, `dias: []`, un campo extra (en el objeto o en un día), `lanzamiento`, `n` no consecutivos dentro del archivo, `n: 0`, 4 o 6 `textos` o `fichas`, longitudes de 683/685 y 1367/1369, un tema inválido y una clave inválida.
173. [D-116] Con `lanzamiento: '2026-12-15'` y un archivo `mes: '2027-01'` con los días 18 a 48: `titularesDelDia(tit, l, '2027-01-01')` → el día 18 con `fecha: '2027-01-01'`; `titularesDelDia(tit, l, '2026-12-31')` → `null` (otro mes); `titularesDelDia(tit, null, '2027-01-01')` → `null`. Con `lanzamiento: null` y el archivo `2000-02` (días 32 a 60): `titularesDeNumero(tit, null, 32)` → el día 32 con `fecha: '2000-02-01'`; `(tit, null, 31)` y `(tit, null, 61)` → `null`; `(titularesVacios('2000-02'), null, 32)` → `null`.

## 8.20 Almacén versión 3 [D-109]
174. `registrarInicio`, `registrarPrueba`, `registrarFin` y `cerrarAbandonada` con `reto: 'titulares'` no modifican `retos.imagenes`, y al revés; con `reto: 'x'` devuelven `datos` sin cambios y no lanzan.
175. Rachas independientes: Images jugado 3 días seguidos y Headlines solo el último → `racha` 3 y 1.
176. `leer` con `ajustes.reto: 'x'` o `ajustes.modo: 'medio'` escritos a mano: main.js usa `imagenes` y `normal` (prueba manual) y los tests de `leer` devuelven los datos tal cual (la validación es de main.js).

## 8.21 Compartir y textos de Headlines [D-112, D-113]
177. `textoCompartir` con `compartir.plantilla_titulares`, `n: 12`, `resultados: 'FAAAA'`, `racha: 5` y la URL de ejemplo es estrictamente igual al ejemplo de Headlines de la sección 7 (4 líneas, sin "Mode").
178. Compartir desde `ya-jugado` de cada reto usa su plantilla, su partida y su racha.
179. El criterio 35 se cumple con un texto de prueba construido con titulares, entradillas, dominios y prompts conocidos.
180. [D-115] `como_jugar.pasos_titulares`, `portada.regla_titulares` y `titulares.oculta` dicen que salir de la página **más de unos segundos** antes de responder es fallo (ninguno dice que cualquier salida lo sea); ningún texto de Images lo dice de Images.

## 8.22 Marcado, composición y bloqueo de copia [D-102, D-105]
181. [D-115] Ids, clases y valores nuevos (`portada-retos`, `reto-imagenes`, `reto-titulares`, `reto-*-estado`, `portada-regla`, `portada-empezar-texto`, `caso-aviso`, `recorte*`, `veredicto-fuente*`, `ficha-recorte`, `ficha-titular`, `ficha-entradilla`, `ficha-fuente*`, `resultado-reto`, `ya-jugado-reto`, `sin-casos-texto`, `miniatura-numero`, `volver-portada`, `imagenes`, `titulares`, `data-reto`, `data-verdad`, `creditos-noticias`, `creditos-medios`, `creditos-ficcion`) y las rutas `data/titulares/AAAA-MM.json` no contienen palabras prohibidas (`npm run validar`).
182. [D-115] **Sin deslizar** (método del criterio 126, en 360 x 640, 640 x 360, 1280 x 720, 390 x 844 y 768 x 1024):
    - `portada` con Images elegido y con Headlines elegido; cada una con el desplegable cerrado y abierto, en modo prueba con selector y aviso, y con `#aviso-almacen`;
    - `caso` de Headlines en `pregunta` con un titular de 110 caracteres y una entradilla de 280 (texto de prueba en inglés con palabras largas), y con uno de 20 y 40, **en la prueba 1 (con `#caso-aviso` visible)** y en la prueba 2 (sin él);
    - `caso/veredicto` de Headlines auténtica (con el enlace de fuente) y generada (con sello, confesión recortada y Read full confession), y el veredicto por ausencia;
    - `resultado` y `ya-jugado` de Headlines (también con `avisos.otra_pestana`), y `sin-casos` con `sin_lanzamiento`.
183. Las dos fichas de reto están en una fila, miden al menos 44 px de alto, muestran el nombre en una línea y el estado entero; con Headlines elegido, `#portada-modos` tiene `hidden` y no se alcanza con Tab, y `#portada-regla` es visible.
184. Bloqueo de copia en `#recorte`: doble clic, triple clic, arrastrar y pulsación larga (móvil) no seleccionan texto; Ctrl+C y el menú contextual sobre el recorte no copian; arrastrar el texto no hace nada. Fuera de `#recorte` (portada, diálogo del resultado) el menú contextual funciona.
185. Lectores de pantalla (NVDA con Firefox o Chrome, y VoiceOver en iOS): al entrar en cada noticia se puede leer el titular (como encabezado) y la entradilla con la navegación normal; `#recorte-marca` no se lee; [D-115] en la prueba 1 se anuncia una vez el aviso de ausencia.
186. Resultado de Headlines: 5 `button.miniatura` numerados en una fila, de al menos 44 x 44 px, sin solaparse, con nombre accesible "Story N: correct|wrong"; al activarlos se abre el diálogo con titular y entradilla completos, "It was: …", y la fuente (auténtica) o la confesión (generada).
187. En el veredicto y el diálogo, el sello de IA dice exactamente "AI-GENERATED · NOT A REAL STORY", tiene contraste AA y se distingue sin color (texto); el titular sigue legible debajo.

## 8.23 main.js con Headlines (manual con `npx serve`)
188. Partida completa de Headlines con ratón, con teclado (R, I y Enter) y en un móvil de 360 px en vertical y horizontal; no pasa por `cargando` ni `cuenta-atras` y no hay temporizador ni anuncios de tiempo.
189. El intento se gasta al pulsar Start: recargar en la noticia 1 lleva a la portada con Headlines "Filed · 0/5" (todas `F`) y el mismo día no se puede repetir.
190. [D-115] **Pestaña oculta** en Headlines, con una noticia en pregunta ya pintada (cambiar de pestaña, minimizar, bloquear la pantalla del móvil):
    - durante 1 a 2 s y volver → la noticia sigue en pregunta, los votos (botones, R e I) funcionan, no se ha guardado nada y no se ve ningún aviso nuevo;
    - durante 5 s o más y volver → esa noticia está en veredicto con `data-estado="fallo"`, el texto de `titulares.oculta`, la respuesta y su fuente o confesión, y el foco en Next; el código guardado es `F`;
    - ocultarla en el veredicto, en el resultado, en la portada, en `ya-jugado` o antes de que se pinte la noticia no cambia nada, dure lo que dure.
    En Images, el criterio 58 sigue igual.
191. **Antes de responder**, en Headlines: `document.body.innerHTML` contiene el titular y la entradilla de la noticia actual, pero no los de ninguna otra noticia del día, ni la URL de la fuente, ni su dominio, ni el prompt, ni la verdad (búsqueda de fragmentos conocidos de los datos de prueba); `#veredicto` no tiene `data-estado` ni `data-verdad`. Después de `SIGUIENTE` desaparece el texto anterior.
192. Al responder no hay ninguna petición de red. El enlace de la fuente solo aparece en auténticas, tiene `target="_blank"`, `rel="noopener noreferrer"` y `href` `https`; al abrirlo, la pestaña nueva tiene `window.opener === null` y la petición no lleva `Referer`; el juego no cambia de estado. Con una fuente manipulada a `http://…` en los datos de prueba, no hay enlace y se ve `titulares.fuente_no_disponible`.
193. Los dos retos el mismo día: jugar Images y después Headlines (y al revés); la portada muestra el estado correcto de cada uno tras cada partida y tras recargar; Back vuelve a la portada; rachas, `ya-jugado` y textos de compartir son de su reto.
194. Dos pestañas: con Headlines en curso en una, la otra muestra Headlines "Open in another tab" y puede jugar Images.
195. Medianoche: en `ya-jugado` de cualquier reto, al llegar a 0 la cuenta atrás lleva a la portada del día siguiente.
196. Con `localStorage` bloqueado, los dos retos se juegan enteros con `#aviso-almacen`.

## 8.24 Importador y datos de Headlines (archivero) [D-106 a D-108, D-111]
197. `analizarNoticias` (tests en `tests/titulares.test.mjs`) da un error, con ruta y número de bloque, en cada caso de 4.11 (un test por regla), acepta el ejemplo de 4.9 (con CRLF y BOM) y nunca lanza.
198. `avisosLongitud`: titulares reales de media 40 y de IA 52 (30 %) → un aviso; 40 y 48 (20 %) → ninguno; lo mismo con entradillas; aviso por día y global.
199. `planificarTitulares`: numeración, huecos, carpeta sin `noticias.txt`, un archivo extra, tema con palabra prohibida y días pasados con lanzamiento, como en el criterio 86 de imágenes; [D-116] cada nuevo lleva su `mes`.
200. `npm run titulares -- --simular` y `npm run titulares` sin `--revisado` no escriben nada y muestran la lista de revisión y el archivo mensual de destino de cada día; ninguna salida del importador contiene un titular, una entradilla, una URL ni un prompt de los datos de prueba.
201. [D-116] Con 40 carpetas de prueba correctas (fuera de la `entrada/` real) y `lanzamiento: null`, `npm run titulares -- --revisado` crea `data/titulares/2000-01.json` (días 1–31) y `2000-02.json` (32–40), versión 1, que pasan `validarTitulares` y `unirMeses`, cuyos bloques descifran a los textos, URL y prompts originales (normalizados), con el orden barajado; una segunda ejecución omite todos los días y deja los dos archivos idénticos byte a byte; `entrada/titulares/` no cambia.
202. `validar` sobre `data/titulares/` manipulado: cambiar un texto o una ficha por otra cadena aleatoria de la misma longitud → "no se puede descifrar"; intercambiar la ficha de una auténtica con la de una generada del mismo día → "El día {n} de Headlines tiene fichas que no cuadran con su clave."; una fuente `http` → error; titulares repetidos (también entre dos meses) → error.
203. `creditos.html` incluye `#creditos-noticias` con los dominios de las fuentes de los datos de **todos los meses**, sin repetir y en orden alfabético, sin enlaces, y `#creditos-ficcion`; sin noticias, `creditos.sin_noticias`; `validar` falla si la lista no coincide.
204. Ningún archivo publicado ni rastreado contiene en claro un titular, una entradilla, una URL de fuente ni un prompt de Headlines (búsqueda de fragmentos en `data/` —incluidos todos los `data/titulares/*.json`—, `js/`, `creditos.html`, `herramientas/`, `docs/` y `tests/` reales); `git status` no muestra nada de `entrada/titulares/`.
205. `npm test` pasa con Node 20 en un clon limpio, sin `entrada/`, sin banco, sin `data/titulares/` y sin depender de la fecha actual ni del lanzamiento real.

## 8.25 Ausencia de más de 3 s en Headlines [D-115]
206. `OCULTA_MAX_MS === 3000`. `ocultacionEsFallo`: `3001` y `Infinity` → `true`; `3000`, `2999`, `0`, `-5`, `NaN`, `'5000'`, `null` y `undefined` → `false`.
207. `medirOculta`: `({perf: 1000, fecha: 50000}, {perf: 2500, fecha: 51500})` → 1500; `performance.now()` detenido durante una suspensión, `({perf: 1000, fecha: 0}, {perf: 1200, fecha: 10000})` → 10000; reloj del sistema atrasado, `({perf: 0, fecha: 10000}, {perf: 4000, fecha: 0})` → 4000; con `perf` `NaN` en uno de los dos, solo cuenta `fecha`; con argumentos ausentes, 0; nunca negativo y nunca lanza.
208. Recorrido completo en `tests/juego.test.mjs`: Headlines, prueba 2 pintada, `VOLVIO {ocultoMs: 2000, indice: 1}` → mismo objeto; después `VOTO` → veredicto normal (`motivo: null`); `SIGUIENTE`, `PINTADA`, `VOLVIO {ocultoMs: 3500, indice: 2}` → `F` con `motivo: 'oculta'`; un segundo `VOLVIO` en ese veredicto → mismo objeto.
209. Manual (`npx serve`, Chrome de escritorio y un móvil Android o iOS): bloquear la pantalla 2 s y desbloquear → sin efecto; bloquearla 10 s → `F` al volver; cuatro ausencias seguidas de unos 2 s en la misma noticia → sin efecto (no se acumulan, R12); ocultar la pestaña más de 3 s y cerrarla sin volver → al reabrir, la portada muestra Headlines "Filed" con esa noticia y las siguientes en `F`; en la pestaña oculta, ninguna petición ni temporizador del juego.
210. Aviso: `#caso-aviso` es visible solo en la pregunta de la prueba 1 de Headlines, con el texto exacto de `titulares.aviso_oculta`; tiene `hidden` en el veredicto de la prueba 1, en las pruebas 2 a 5, en Images y en el resto de pantallas; el anuncio por `#temporizador-anuncio` suena una vez por partida.

## 8.26 Titulares por mes [D-116]
211. `mesDeFecha('2026-12-15')` → `'2026-12'`; `('2026-02-30')`, `('x')` y `(null)` → `null`. `mesDeNumero(null, 1)` y `(null, 31)` → `'2000-01'`; `(null, 32)` y `(null, 60)` → `'2000-02'`; `(null, 61)` → `'2000-03'`; `('2026-12-15', 17)` → `'2026-12'`; `('2026-12-15', 18)` → `'2027-01'`; `('2026-12-15', 49)` → `'2027-02'`; `n` `0`, `1.5` y `'3'`, o lanzamiento `'2026-13-01'` → `null`. `rutaTitulares('2026-12')` → `'data/titulares/2026-12.json'`; `('2026-1')` y `('../x')` → `null`. `diaPedido('?dia=32')` → 32; `('?dia=032')`, `('?dia=-1')`, `('?dia=1.5')` y `('')` → `null`.
212. `cargarTitulares('2026-12-15', pedir)` con un `pedir` falso: pide una sola vez exactamente `'data/titulares/2026-12.json'` con `{cache: 'no-cache'}`; con 404 → `titularesVacios('2026-12')`; con 500, error de red, JSON inválido, `mes: '2026-11'` o estructura inválida → rechaza; con `'2026-13-01'` → rechaza sin llamar a `pedir`.
213. `unirMeses` y `repartirPorMes` (`tests/titulares.test.mjs`): 70 días con `lanzamiento: null` → tres archivos `2000-01` (1–31), `2000-02` (32–60) y `2000-03` (61–70); `unirMeses` de esos tres → los 70 días sin errores; ida y vuelta idéntica; con lanzamiento `'2026-12-15'`, `repartirPorMes` → `2026-12` (1–17), `2027-01` (18–48), `2027-02` (49–70). Errores: nombre `2026-12.JSON`, `titulares.json` o una subcarpeta; JSON `null`; hueco entre dos archivos; `n` repetido con contenido distinto; con `comprobarMes`, el día 32 en `2000-01.json`. Con `comprobarMes: false`, un día repetido idéntico se acepta una vez.
214. `npm run titulares` con días ya importados 1–40 (`2000-01.json` y `2000-02.json`) y 25 carpetas nuevas (41–65): reescribe `2000-02.json` (completa hasta el 60), crea `2000-03.json` (61–65) y deja `2000-01.json` idéntico byte a byte (`git diff` vacío en ese archivo); no borra nada.
215. `npm run lanzamiento -- 2026-12-15` (fecha futura de prueba) con los datos del 214: crea `2026-12.json` (1–17), `2027-01.json` (18–48) y `2027-02.json` (49–65), borra los `2000-*.json`, y cada día descifra igual que antes (mismos bloques); `npm run validar` pasa; repetir la orden no cambia nada; `--sin-fecha` vuelve al reparto `2000-*` idéntico al original. Simulando una interrupción (dejar un `2000-01.json` antiguo junto a los nuevos), volver a ejecutar la orden lo deja bien.
216. `validar` falla con: `data/titulares.json` presente; un archivo `2026-12.json.bak` u otra entrada en `data/titulares/`; `mes` distinto del nombre; un día en el archivo de un mes que no le corresponde con el `lanzamiento` del calendario (por ejemplo, tras cambiar `lanzamiento` a mano); hueco o repetido entre meses. Con `data/titulares/` vacía o inexistente pasa, con el aviso de calendario corto de Headlines.
217. Manual, juego normal (con un lanzamiento de prueba en local): la pestaña de red muestra **una sola** petición a `data/titulares/` (la del mes de hoy); sin archivo de ese mes, Headlines muestra "No case today" y no hay pantalla de error; con el archivo corrupto, pantalla `error`.
218. Manual, cambio de mes: con el reloj del sistema a las 23:59 del último día de un mes y la portada abierta, al pasar la medianoche se pide el archivo del mes nuevo y la portada muestra el caso del día 1; una partida de Headlines empezada a las 23:59 se termina con sus noticias.
219. Manual, modo prueba con días en dos meses (`2000-01` y `2000-02`): sin `?dia=`, se carga solo el mes del día que corresponda (`nHoy`, o el día 1); el selector lista todos los días de Images y, de Headlines, los del mes cargado; elegir el día 35 y Open this day recarga y pide solo `2000-02.json`, y Headlines del día 35 se juega; `?dia=999` (inexistente) cae al día de `diaDePrueba` y, si es de otro mes, hace como mucho una segunda petición.
220. Peso: ningún archivo mensual generado con 31 días de prueba supera 340 KB.
221. `creditos.html` no cambia al repartir los meses de otra forma (mismos días en otros archivos).
