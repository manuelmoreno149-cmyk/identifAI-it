# identifAI-it: especificación técnica, versión 3.0 · 8 (segunda parte). Criterios de aceptación de la 3.0

Parte de la sección 8 (continúa `8-criterios.md`, que conserva los criterios 1–240 con el texto de la 2.1) [D-151, D-163]. Aquí están (8.29) los criterios anteriores que **cambian** en la 3.0 y (8.30–8.36) los **nuevos**, 241–290. Donde un criterio anterior y este archivo difieran, manda este.

## 8.29 Criterios anteriores que cambian [3.0]

- **8, 9**: calendario **v5**; `casoDelDia(cal, '2026-12-02')` devuelve `{n: 2, fecha, tema: {en, es}, pruebas, clave, fichas: {en, es}}`; `validarCalendario` rechaza además la versión 4.
- **12**: `EMPEZAR` en `portada` → el mismo objeto; en `instrucciones` con Images pendiente → `cargando`.
- **17**: `CARGADO` conserva `idioma`.
- **35**: se amplía con el 263 (texto en español).
- **38–40**: se comprueban en `TEXTOS.en` y `TEXTOS.es` con las claves de 3.1 (3.0): sin `como_jugar`, sin `fichas.sin_prompt`, sin las claves retiradas de `portada` y `prueba.boton`; con `instrucciones`. Los exactos ingleses no cambian; se añaden los exactos españoles de 3.1. Límites por idioma (264).
- **41**: ids y atributos de 2.3 (3.0); ninguno de la lista "desaparecen" de la 3.0; sin `#portada-retos`, `#portada-regla`, `dialog#como-jugar` ni `#selector-prueba`.
- **54**: la partida completa empieza en la tarjeta de la portada y pasa por `instrucciones`.
- **115, 172, 173, 222, 223**: con archivos `data/facts/` **v2** y temas `{en, es}`.
- **119**: modo prueba con el desplegable de tema; navegación a `?prueba=1&dia=5` (sin `&reto=`).
- **157**: sin las comprobaciones de `retoDePrueba` (retirada); el resto sigue.
- **159**: sustituido por el 251 (`ELEGIR_RETO` retirado).
- **160**: `EMPEZAR` desde `instrucciones` (desde `portada`, el mismo objeto).
- **164**: `VOLVER_PORTADA` también desde `instrucciones`.
- **165**: `OTRA_PESTANA` en `portada` sigue en `portada` (solo marca `jugado`); en `instrucciones` del mismo reto → `ya-jugado`.
- **166**: `MEDIANOCHE` también en `instrucciones`.
- **182**: se amplía con el 267 (portada nueva, `instrucciones`, español). Desaparece "con el desplegable cerrado y abierto".
- **183**: sustituido por el 265 y el 267 (no hay radios ni `#portada-modos` en la portada).
- **197–201, 213–215, 239**: con `facts.en.txt` y `facts.es.txt` emparejados, `tema.es.txt` y archivos v2.
- **203, 221**: con `creditos.html` y `creditos.es.html`.
- **224**: `planificar` exige `tema.es.txt` y admite `facts.es.txt`.
- **225, 226**: ampliados por el 253 y el 274 (teclas por idioma).
- **231, 238**: `LISTA_REVISION` tiene **9** puntos (289).
- **233, 237**: el tema y el lema son comunes a los dos retos **en cada idioma**.

## 8.30 Idiomas y datos en diario.js

241. `IDIOMAS` es exactamente `['en', 'es']` y está congelado; `IDIOMA_POR_DEFECTO === 'en'`; `idiomaValido('es')` → `true`; `('ES')`, `('es-ES')`, `('fr')`, `('')`, `(undefined)` → `false`.
242. `idiomaDeUrl`: `'?lang=es'` → `'es'`; `'?lang=EN'` → `'en'`; `'?prueba=1&lang=es&dia=3'` → `'es'`; `'?lang=es-ES'`, `'?lang='`, `'?x=1'`, `''` → `null`.
243. `idiomaDelNavegador`: `['es-ES', 'en']`, `['es']`, `['ES-419']` → `'es'`; `['en-US', 'es']`, `['eu']`, `['est']`, `[]`, `undefined`, `'es'` (no array) → `'en'`; `[42, 'es']` → `'es'` (primer elemento que es cadena).
244. `elegirIdioma`: la URL gana a lo guardado y al navegador (`origen: 'url'`); un guardado no válido (`'fr'`) se ignora; sin URL ni guardado, `origen: 'navegador'`.
245. `formatearFecha('2026-11-30', 'es')` → `'30 nov 2026'`; sin idioma o con `'fr'` → `'Nov 30, 2026'`.
246. Con la misma clave, `n` e índice, los seis flujos (ficha, afirmación y aclaración, en `en` y `es`) son distintos dos a dos; ida y vuelta en `es` con `é`, `ñ`, `¿`, `—` y exactamente 510 bytes; descifrar con el idioma equivocado no devuelve el texto original; idioma no válido → `TypeError` al ofuscar y `null` al descifrar. Los vectores de D-92 y de la tarea 83 dan lo mismo sin `idioma` y con `'en'`.
247. Vectores de `es` de 4.17 fijados en `tests/diario.test.mjs` y copiados en DECISIONES.
248. `validarCalendario` acepta un calendario v5 construido con las funciones de ofuscación y rechaza: v4; `tema` cadena; `tema` sin `es` o con una clave más; un `tema.es` no válido; `fichas` array; `fichas` sin `es`; `fichas.es` con 4 bloques o con uno de 683 caracteres.
249. `validarAfirmaciones` acepta un archivo v2 y rechaza los mismos casos que el 248 en `tema`, `textos` y `fichas`, y la versión 1. `casoDelDia` y `afirmacionesDelDia` devuelven copias de `tema`, `fichas` y `textos` (no los objetos del archivo).
250. `diasDePrueba` devuelve `temaImagenes` y `temaAfirmaciones` como `{en, es}` o `null`; `temaDelDia(dia, 'es')` da el tema español, une con " / " dos temas distintos y devuelve `''` sin ninguno.

## 8.31 juego.js

251. `ABRIR_RETO`: en `portada` con Images pendiente → `instrucciones` con `reto: 'imagenes'` y su caso copiado, `retos.*.jugado` sin cambios; con reto sin caso o no válido → el mismo objeto; con reto jugado → `ya-jugado` de ese reto; fuera de `portada` → el mismo objeto. `ELEGIR_RETO` → el mismo objeto en cualquier pantalla.
252. `CAMBIAR_IDIOMA {idioma: 'es'}` en `portada` e `instrucciones` → la misma pantalla con `idioma: 'es'` y el resto igual; con el idioma actual o `'fr'` → el mismo objeto; en `cargando`, `cuenta-atras`, `caso`, `resultado`, `ya-jugado`, `sin-casos` y `error` → el mismo objeto.
253. `TECLAS` está congelado en profundidad. `votoDeTecla`: `('afirmaciones', 'd', 'es')` y `('afirmaciones', 'D', 'es')` → `'autentica'`; `('afirmaciones', 'b', 'es')` → `'generada'`; `('afirmaciones', 'f', 'es')`, `('afirmaciones', 'k', 'es')`, `('afirmaciones', 'd', 'en')`, `('afirmaciones', 'd')` → `null`; `('imagenes', 'r', 'es')` → `'autentica'` e `('imagenes', 'i', 'es')` → `'generada'`; `('afirmaciones', 'f')` → `'autentica'`; idioma `'fr'` → `null`. `teclaDeVoto('afirmaciones', 'generada', 'es')` → `'B'`; `('afirmaciones', 'autentica', 'es')` → `'D'`; `('imagenes', 'generada', 'es')` → `'I'`.
254. En `instrucciones`: `ELEGIR_MODO {modo: 'perro'}` con Images → `modo: 'perro'`; con Fact or Fake o en `portada` → el mismo objeto. `EMPEZAR {fecha}` con Fact or Fake e `idioma: 'es'` → `caso/pregunta` con `texto` = la afirmación 0 en español de los datos de prueba bilingües.
255. `VOTO` en español: Images → `ficha` = el prompt español; Fact or Fake → `{aclaracion, detalles}` en español. `SIGUIENTE` → la afirmación siguiente en español.
256. `VOLVER_PORTADA` desde `instrucciones` → `portada` con el mismo reto. `OTRA_PESTANA` en `instrucciones`: mismo reto → `ya-jugado`; otro reto → sigue en `instrucciones` con ese reto marcado. `MEDIANOCHE` en `instrucciones` → `iniciando`. `CARGADO` conserva `idioma`.
257. `estadoInicial({idioma: 'es'}).idioma === 'es'`; con `'fr'` o sin idioma → `'en'`. `juego.js` no exporta `retoDePrueba`.
258. Recorrido puro: `portada` → `ABRIR_RETO` Fact or Fake → `CAMBIAR_IDIOMA es` → `EMPEZAR` → 5 × (`PINTADA`, `VOTO`, `SIGUIENTE`) → `resultado`; los `resultados` son idénticos a los del mismo recorrido en `en` con los mismos votos.

## 8.32 almacen.js

259. `CLAVE_IDIOMA === 'identifaiit.idioma'`. `leerIdioma`: `'es'` guardado → `'es'`; `'fr'`, ausente o almacén que lanza → `null`. `guardarIdioma(a, 'es')` → `true` y guarda la cadena `es`; `'fr'` → `false` sin escribir; almacén que lanza → `false`.
260. Ningún dato de `identifaiit.v3` contiene el idioma; `datosIniciales()` es el mismo objeto que en la 2.1; registrar una partida con el juego en español y leerla con el juego en inglés da la misma partida.

## 8.33 textos.js y compartir.js

261. `TEXTOS` tiene exactamente las claves `en` y `es`, con el mismo árbol de claves (recursivo), arrays de la misma longitud y los mismos marcadores en cada cadena; ninguna cadena vacía; valores exactos de 3.1 en los dos idiomas; `instrucciones.pasos_*` con 4 elementos; no existen `como_jugar`, `fichas.sin_prompt`, `prueba.boton` ni las claves retiradas de `portada`.
262. `textoCompartir` con `TEXTOS.es.compartir.plantilla`, `n: 12`, `nombreModo: 'Sabueso'`, `'AAFAF'`, racha 3, y con `plantilla_afirmaciones`, `'FAAAA'`, racha 5, son estrictamente iguales a los ejemplos de 4.24.
263. El texto compartido en español no contiene "IA", "REAL", "DATO" ni "BULO" como palabra suelta, ni `autentica`, `generada`, ids, tema, fichas ni contenido; "Dato" y "Bulo" solo aparecen dentro de "¿Dato o Bulo?" en la primera línea.
264. Límites de 3.1 medidos en cada idioma con su relleno (`{fecha}` española, `{modo}`, `{reto}`, `{estado}`, `{sello}` y `{voto}` del idioma).

## 8.34 index.html, CSS y fuentes

265. Existen los ids y atributos de 2.3 (3.0): dos `.selector-idioma` con botones `data-accion="idioma"`, `data-idioma` `en`/`es`, `lang`, `aria-pressed` y `aria-label` "English"/"Español"; dos `button.reto[data-accion="abrir-reto"][data-reto-boton]` con `aria-labelledby` y `aria-describedby` válidos; `#pantalla-instrucciones` con su estructura, `#instrucciones-pasos` vacío y `#instrucciones-ejemplo` con `aria-hidden="true"` y sin ningún `button`. Ningún id, clase, `data-*` ni `alt` contiene la lista ampliada de palabras prohibidas; no queda ninguna clase `dato*`.
266. Las ilustraciones de las tarjetas son solo CSS (sin `img`, sin SVG nuevo, sin `data:`), con sus sellos como texto de `TEXTOS`; con `prefers-reduced-motion: reduce`, sin animación.
267. **Sin deslizar** (método del 126, en los 5 tamaños garantizados, en `en` y en `es`): `portada` (con una tarjeta jugada y otra sin caso; en modo prueba con desplegable y aviso; con `#aviso-almacen`), `instrucciones` de cada reto, y todos los estados del 182 en español con textos máximos en español.
268. Contraste AA y foco visible en tarjetas de reto, selector de idioma, casillas de modo (también la marca de la elegida sin depender del color), "All case files", "Open the case" y el recuadro del aviso.
269. Las fuentes muestran á é í ó ú ü ñ ¿ ¡ « » — sin caer en la fuente de respaldo (o la tarea 100 avisa al usuario).

## 8.35 main.js (manual con `npx serve`)

270. Primera visita con `localStorage` vacío: navegador en `es-ES` → español; `en-GB` o `fr` → inglés; `?lang=en` con navegador en español → inglés, guardado (recargar sin parámetro sigue en inglés).
271. El selector cambia al instante todos los textos de `portada` e `instrucciones` (tema, tarjetas, estados, pie, enlace de créditos) y `<html lang>`, sin recargar ni pedir nada a la red; el foco se queda en el botón; recargar conserva el idioma; con `?lang=es` en la URL, pulsar EN deja la URL en `lang=en`.
272. Intento común: tras jugar Images en inglés, en español la tarjeta muestra el reto archivado y abre `ya-jugado`; no hay forma de volver a jugarlo ese día en ningún idioma; la racha es la misma; compartir desde `ya-jugado` en español da la plantilla española con el mismo `n`, cuadros y racha.
273. Instrucciones: la tarjeta abre las del reto con "Case #N" y el tema; "All case files" vuelve sin gastar el intento; recargar en `instrucciones` lleva a la portada con el intento intacto; el modo elegido se guarda y es el de la partida y del texto compartido; en Fact or Fake, "Open the case" gasta el intento (recargar en la afirmación 1 → archivado 0/5).
274. Partida completa en español de cada reto: REAL/IA con R e I; DATO/BULO con D y B (F y K no hacen nada en español; D y B no hacen nada en inglés); aviso de ausencia, revelación, tablón y diálogo en español; marca "identifAI-it · ¿Dato o Bulo?".
275. Antes de responder, el DOM no contiene la verdad, la ficha ni ningún texto de prueba del otro idioma (solo la afirmación actual en el idioma activo).
276. Modo prueba: desplegable de tema junto a "Case #N"; cambiarlo recarga el día elegido; las opciones están en el idioma activo; el idioma se conserva al recargar aunque el progreso esté en memoria; no hay botón "Open this day".
277. Créditos: el enlace lleva a `creditos.html` en inglés y a `creditos.es.html` en español; cada página enlaza a la otra, sin JS.
278. Medianoche con `instrucciones` abierta → portada del día siguiente en el mismo idioma.
279. Con `localStorage` bloqueado, el idioma sale del navegador (o de `?lang=`) en cada carga, el selector funciona durante la visita y `#aviso-almacen` sale como antes.
280. No aparece en ninguna pantalla un diálogo "How to play" ni un botón de ayuda.

## 8.36 Herramientas (archivero)

281. `PALABRAS_PROHIBIDAS` es exactamente la lista de 4.20; `contienePalabraProhibida`: `'cifra-valor'`, `'Datos curiosos'` y `'data-verdad'` → `null`; `'dato-valor'` → `'dato'`; `'Bulo'` → `'bulo'`; `'Falsa alarma'` → `'falsa'`.
282. `planificar`: carpeta sin `tema.es.txt` → error; `tema.es.txt` vacío, de dos líneas, no UTF-8 o con palabra prohibida → error; imagen de `ia/` sin `.txt` o sin `.en.txt` → error; `facts.es.txt` y `tema.es.txt` no dan error de archivo suelto.
283. `npm run importar` con datos de prueba (fuera de la `entrada/` real) escribe un calendario v5 cuyas fichas descifran a los prompts `.en.txt` y `.txt` normalizados y a "Real photograph" / "Fotografía real", con `tema.es` = `tema.es.txt`; con un calendario v4 sin `--reimportar`, se detiene con el mensaje de 4.20 sin tocar nada; con `--reimportar --confirmar`, escribe la v5.
284. `archivosDelDia` y `emparejarIdiomas`: solo uno de los dos archivos → error; `facts.txt` → aviso; `answer` distinto en un bloque → error que nombra carpeta y bloque; distinto número de bloques → error; distinto número de detalles → aviso; nunca lanzan.
285. `npm run afirmaciones -- --revisado` con datos de prueba escribe archivos v2 en los que, para cada día, `textos.en[i]` y `textos.es[i]` son la misma pareja tras la misma permutación y coinciden con la clave; un duplicado dentro de un idioma es error; `--simular` no muestra ningún texto en ningún idioma.
286. `npm run lanzamiento` reparte archivos v2 sin tocar su contenido y se detiene con archivos v1.
287. `validar` falla con: calendario v4; archivo de `data/facts/` v1; tema español distinto entre retos; ficha auténtica en español con "Real photograph"; una clase `dato` en `index.html`; sin `creditos.es.html`. Avisa (sin fallar) con distinto número de detalles entre idiomas.
288. `creditos.mjs` escribe `creditos.html` (`lang="en"`) y `creditos.es.html` (`lang="es"`), deterministas byte a byte, enlazadas entre sí.
289. `LISTA_REVISION` tiene exactamente 9 cadenas no vacías; la 9.ª contiene "español".
290. `npm test` pasa en un clon limpio. Ningún archivo publicado ni rastreado contiene en claro una afirmación, aclaración, detalle o prompt en ningún idioma (criterio 204 en los dos idiomas); `tema.es.txt` y `facts.es.txt` no están rastreados.
