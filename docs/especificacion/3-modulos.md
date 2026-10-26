# identifAI-it: especificación técnica, versión 2.0 · 3. Módulos JS

Parte de la especificación 2.0 (índice en `docs/ESPECIFICACION.md`) [D-91, D-114]. Los cambios de la 2.0 van marcados con **[2.0]**; lo no marcado sigue como en la 1.3. Los ajustes D-115 (ausencia de más de 3 s), D-116 (titulares por mes), D-117 (el modo prueba carga todos los meses) y D-118 (textos aprobados de la tarea 61 y medida de los límites) ya están incorporados.

## 3. Módulos JS

Módulos ES sin dependencias. Las funciones **puras** no tocan el DOM, `window`, `localStorage`, `Date.now()`, `performance.now()` ni `Math.random()` (salvo como valor por defecto de un `aleatorio` inyectable) y se prueban con `node --test`. `TextEncoder`, `TextDecoder`, `btoa`, `atob`, `URL` y `URLSearchParams` son globales en el navegador y en Node 20.

Grafo de importaciones, sin ciclos:
- `main.js` importa todos. `almacen.js` y `juego.js` importan `diario.js`. `compartir.js`, `temporizador.js`, `diario.js` y `textos.js` no importan nada.
- Herramientas:
  - `temas.mjs` no importa nada.
  - [2.0] `titulares.mjs` importa `./temas.mjs` (palabras prohibidas, carpetas, `normalizarFicha`, `avisosMezcla`), [D-116] `../js/diario.js` (`validarTitulares`, `mesDeNumero`, `MES_PATRON`) y, solo para `leerTitularesMensuales` y `escribirTitularesMensuales`, `node:fs` y `node:path`; los límites de bytes le llegan por parámetro.
  - `creditos.mjs` importa `../js/textos.js`, [2.0] `../js/diario.js` (`desofuscar`, `desofuscarNoticia`, `medioDeUrl`, `urlFuenteValida`) y [D-116] `./titulares.mjs` (`leerTitularesMensuales`, `unirMeses`).
  - `importar.mjs` como en la 1.3 (sin la constante `LANZAMIENTO`) [D-95].
  - [2.0] `importar-titulares.mjs` importa `../js/diario.js` (`ofuscar`, `ofuscarTexto`, `ofuscarNoticia`, `desofuscar`, `desofuscarTexto`, `TEXTO_MAX_BYTES`, `NOTICIA_MAX_BYTES`, `urlFuenteValida`, `validarTitulares`, `validarCalendario`, `fechaDelDia`, `mesDeNumero`), `./temas.mjs`, `./titulares.mjs` y `./creditos.mjs`.
  - [2.0] `lanzamiento.mjs` importa `../js/diario.js`, `./temas.mjs` y [D-116] `./titulares.mjs` (lectura, unión, reparto y escritura de los archivos mensuales).
  - `validar.mjs` importa además `./titulares.mjs` y lee todos los archivos de `data/titulares/`.
  - [D-117] Ninguna herramienta escribe un índice de meses: el modo prueba los descubre con `cargarTitularesPrueba` (4.7.2).

### 3.1 js/textos.js (cronista)

`export const TEXTOS = {...}`, en inglés americano [D-93]. Claves vigentes de la 1.3 más las de la 2.0 [D-113]. [D-118] Los valores entre comillas de esta tabla son los **aprobados por el usuario** (tarea 61) y coinciden con `js/textos.js`; la fuente del valor sigue siendo `js/textos.js`, y los marcados como exactos en las reglas no se cambian sin permiso.

| Grupo | Claves |
|---|---|
| `portada` | Las de la 1.3 y [2.0] `elige_reto` ("Choose your case file"); `reto_imagenes` (**"Images"**, exacto) y `reto_titulares` (**"Headlines"**, exacto); `estado_pendiente` ("Open case"), `estado_jugado` ("Filed · {aciertos}/5"), [D-118] `estado_en_curso` (**"In another tab"**), `estado_sin_caso` ("No case today"); `boton_ver_informe` ("View report"); [D-118] `regla_titulares` (**"No timer. Leave for more than a few seconds and it's a miss."**: sin temporizador, y salir de la página **más de unos segundos** antes de responder es fallo) [D-115]. |
| `como_jugar` | `titulo`, `pasos` (Images, exactamente 4) y [2.0] `pasos_titulares` (exactamente 4: dos retos al día con un intento cada uno; leer titular y entradilla y decidir REAL o AI sin prisa; **salir de la página más de unos segundos antes de responder cuenta como fallo** (un vistazo breve, no) [D-115]; tras responder, la fuente o la confesión). Valores: "Two challenges a day, one try each. This one is Headlines.", "Read the headline and the lede, then call it: REAL or AI. No timer.", "Leave the page for more than a few seconds and it counts as a miss.", "After you answer, you get the source or the suspect's confession." |
| `cargando`, `cuenta_atras` | Sin cambios. |
| `partida` | Sin cambios. Headlines reutiliza `caso_del_dia`, `marcador`, `boton_autentica`, `boton_generada`, `boton_siguiente` y `boton_ver_resultado`. |
| `titulares` | [2.0] `etiqueta_prueba` ("Story {i}/5"), `sello_autentica` ("REAL · PUBLISHED STORY"), `sello_generada` (**"AI-GENERATED · NOT A REAL STORY"**, exacto, U+00B7), `marca` (marca fija del recorte, "identifAI-it · Real or AI?"), `oculta` (array de 2 o más: fallo por haber salido de la página más de unos segundos [D-115]; valores: "You were away from the file for more than a few seconds. That's a miss.", "The suspect slipped out while you were gone. More than a few seconds: miss.", "Too long off the case. Gone more than a few seconds means a miss."), **`aviso_oculta`** (**"Leaving the page for more than a few seconds counts as a miss."**, exacto) [D-115], `fuente_titulo` ("The source"), `fuente_enlace` ("Read it at {medio}"), `nueva_pestana` ("(opens in a new tab)"), `fuente_no_disponible` ("The source is no longer on file."), [D-118] `no_disponible` (si un recorte no se descifra: **"This clipping can't be read. Try reloading the page."**) y `estado_prueba` ("Story {i}: {estado}"). |
| `veredictos` | Sin cambios (`acierto`, `fallo`). |
| `confesion`, `ficha`, `fichas` | Sin cambios (Headlines reutiliza `confesion.*` y `ficha.cerrar`; `fichas.*` solo es de Images). |
| `final` | Los de la 1.3 y [2.0] `reto` ("{reto} · Case #{n}") y `boton_volver` ("Back"). `mensajes` sirve para los dos retos. |
| `ya_jugado` | Sin cambios (`modo` solo en Images). |
| `sin_casos` | `texto` y [2.0] `sin_lanzamiento` (todavía no hay fecha de apertura: "The precinct opens soon. No cases on file yet."). |
| `errores` | Sin cambios. |
| `avisos` | Los de la 1.3 y [2.0] `prueba` ("Test mode · Day {n}: nothing gets saved."). |
| `prueba` | Sin cambios (`opcion` "Day {n}: {tema}", con `{tema}` = los temas conocidos del día unidos por " / "). |
| `compartir` | `boton`, `copiado`, `manual`, `plantilla` (Images) y [2.0] `plantilla_titulares`, exactamente las de la sección 7 [D-112] (las de `js/textos.js` ya coinciden). |
| `creditos` | Los de la 1.3 y [2.0] `noticias` ("News"), [D-118] `noticias_intro` (**"Headlines adapted from the original publishers; summaries written for this game. Links go to the original stories."**, exacto: los titulares auténticos se adaptan del original y las entradillas las escribe el usuario con sus palabras, 4.14), `sin_noticias` ("No news sources credited yet.") y `ficcion` ("Stories marked AI are fiction written for this game.") [D-111]. |

Reglas [2.0] (además de las de la 1.3):
- [D-118] **Cómo se mide**: en caracteres (puntos de código, `[...s].length`) y, si la clave tiene marcadores `{x}`, sobre el texto **ya rellenado** con los valores de relleno de la tabla siguiente (el valor típico más largo posible), nunca sobre la plantilla. Los tests (`tests/textos.test.mjs`) definen una constante con exactamente estos valores; un marcador que no esté en la tabla hace fallar el test (hay que añadirlo aquí antes).

  | Marcador | Valor de relleno |
  |---|---|
  | `{aciertos}`, `{i}` | `'5'` |
  | `{n}`, `{caso}`, `{racha}` | `'999'` (3 dígitos) |
  | `{s}` | `'9'` |
  | `{tiempo}` | `'00:00:00'` |
  | `{medio}` | un dominio de 30 caracteres (`'abcdefghijklmnopqrstuvwxyz.com'`) |
  | `{tema}` | 30 caracteres (`'x'.repeat(30)`) |
  | `{fecha}` | `'Nov 30, 2026'` (salida más larga de `formatearFecha`) |
  | `{modo}` | el más largo de `portada.modo_*` |
  | `{reto}` | el más largo de `portada.reto_*` |
  | `{estado}` | el más largo de `final.estados.*` |
  | `{sello}` | el más largo de `partida.sello_*` y `titulares.sello_*` |

- **Límite general** (1.3, explicitado por D-118): toda cadena de `TEXTOS`, rellenada, mide **90** como máximo. Excepciones explícitas: `fichas.*` (510 bytes UTF-8, 1.3); `como_jugar.pasos` y `como_jugar.pasos_titulares` (80 cada uno); `compartir.plantilla` y `compartir.plantilla_titulares` (multilínea y exactas, sección 7; no se miden); [D-118] `creditos.noticias_intro` (exacta, 114 caracteres; límite 120).
- Límites de la 1.3 que siguen: `portada.modo_*` 14; `portada.desc_*` 26; `partida.sobre_texto` 16; `confesion.titulo` 30; `confesion.leer_entera` 24; `ficha.cerrar` 16; `prueba.opcion` 50.
- Límites de la 2.0 (rellenados): `portada.reto_*` 12 caracteres; `portada.estado_*` 18; `portada.regla_titulares` 70; `portada.boton_ver_informe` y `final.boton_volver` 16; `titulares.etiqueta_prueba` 16; `titulares.sello_autentica` 32; `titulares.marca` 40; `titulares.fuente_enlace` 54 (equivale a los 24 de antes sin contar `{medio}`); cada `titulares.oculta` 90; `titulares.aviso_oculta` es exacto (62 caracteres); `avisos.prueba` 70.
- Valores exactos que el cronista no puede cambiar por su cuenta: `portada.reto_imagenes`, `portada.reto_titulares`, `titulares.sello_generada`, **`titulares.aviso_oculta`** [D-115], `compartir.plantilla`, `compartir.plantilla_titulares`, [D-118] `creditos.noticias_intro`, además de los de la 1.3.
- Los textos de Headlines que hablan de salir de la página dicen "more than a few seconds" (o equivalente), nunca que cualquier salida es fallo, y no hace falta que citen la cifra de 3 s [D-115].
- Ningún texto de Headlines nombra un medio, una persona o una institución.

### 3.2 js/diario.js (agente-de-campo)

Siguen, sin cambios, `fechaLocal`, `sumarDias`, `diasEntre`, `formatearFecha`, `numeroCaso`, `msHastaMedianoche`, `formatearCuentaAtras`, `temaValido`, `rutaPrueba`, `ofuscar`, `desofuscar`, `HOSTS_LOCALES`, `fechaPrevisualizada`, `pruebaActiva`, `FICHA_BLOQUE`, `FICHA_MAX_BYTES`, `flujoFicha`, `ofuscarFicha`, `desofuscarFicha` (misma salida: el vector de D-92 sigue valiendo), `cargarCalendario` y `precargar`.

**Lanzamiento y calendario** [2.0, D-95, D-96]:

| Función | Tipo | Parámetros → retorno | Notas |
|---|---|---|---|
| `FECHA_BASE_PRUEBA` | constante | | `'2000-01-01'`: base de fechas ficticias del modo prueba sin lanzamiento [D-110] y de los nombres de los archivos mensuales de titulares sin lanzamiento [D-116]. |
| `numeroDelDia(fechaISO, lanzamiento)` | pura | → `number \| null` | `null` si `lanzamiento` es `null` o la fecha es anterior; si no, `numeroCaso(fechaISO, lanzamiento)`. |
| `fechaDelDia(lanzamiento, n)` | pura | → `string \| null` | `null` si `lanzamiento` es `null`; si no, `sumarDias(lanzamiento, n - 1)`. |
| `validarCalendario(obj)` | pura | → `boolean` | **Versión 4**: claves exactas `version`, `lanzamiento`, `dias`; `version === 4`; `lanzamiento` es `null` o una fecha ISO válida (`sumarDias(x, 0) === x`); cada día con claves exactas `n`, `tema`, `pruebas`, `clave`, `fichas` (**sin `fecha`**), `n === k + 1` y el resto como en la 1.3. Rechaza las versiones 1, 2 y 3. |
| `casoDelDia(calendario, fechaISO)` | pura | → `{n, fecha, tema, pruebas, clave, fichas}` o `null` | `n = numeroDelDia(fechaISO, calendario.lanzamiento)`; `null` si `n` es `null` o no hay día `n`. `fecha` = `fechaISO`. |
| `casoDeNumero(calendario, n)` | pura | → mismo objeto o `null` | Para el modo prueba: el día `n` aunque no haya lanzamiento, con `fecha = fechaDelDia(calendario.lanzamiento ?? FECHA_BASE_PRUEBA, n)`. |
| `cargarCalendario(url, pedir)` | async | | Igual, con `validarCalendario` versión 4. |

**Bloques ofuscados genéricos** [2.0, D-103] (algoritmo en 4.8):

| Función | Tipo | Parámetros → retorno | Notas |
|---|---|---|---|
| `flujoBytes(semilla, largo)` | pura | `string, number` → `Uint8Array(largo)` | `mulberry32(fnv1a32(semilla))`, `floor(azar() * 256)`. `flujoFicha(clave, n, i)` es `flujoBytes(\`${clave}\|${n}\|${i}\`, 512)`. |
| `ofuscarBloque(bytes, semilla, largoBloque, aleatorio = Math.random)` | pura | `Uint8Array, string, number` → base64 | 2 bytes de longitud + contenido + relleno, XOR con el flujo. `RangeError` si `bytes.length > largoBloque - 2`. |
| `desofuscarBloque(cadena, semilla, largoBloque)` | pura, nunca lanza | → `Uint8Array \| null` | `null` si la cadena no tiene exactamente `4 * ceil(largoBloque / 3)` caracteres base64 válidos con el relleno `=` correcto, si `atob` falla o si la longitud descifrada supera `largoBloque - 2`. |

`ofuscarFicha` y `desofuscarFicha` pasan a implementarse sobre estas dos funciones, sin cambiar su salida (criterio 167).

**Headlines** [2.0, D-103, D-104]:

| Función | Tipo | Parámetros → retorno | Notas |
|---|---|---|---|
| `TEXTO_BLOQUE`, `TEXTO_MAX_BYTES` | constantes | | `512` y `510`. |
| `ofuscarTexto({titular, entradilla}, clave, n, indice, aleatorio)` | pura | → 684 caracteres | Contenido UTF-8 de `titular + '\n' + entradilla`, semilla `` `${clave}|${n}|${indice}|texto` ``. `TypeError` si alguno no es una cadena no vacía o si `titular` contiene `\n`; `RangeError` si pasa de 510 bytes. |
| `desofuscarTexto(cadena, clave, n, indice)` | pura, nunca lanza | → `{titular, entradilla} \| null` | `null` si el bloque no se descifra, no es UTF-8 válido, no contiene `\n` o alguna parte queda vacía. Se parte por el **primer** `\n`. |
| `NOTICIA_BLOQUE`, `NOTICIA_MAX_BYTES` | constantes | | `1024` y `1021` (1024 − 2 de longitud − 1 de tipo) [DP-39]. |
| `ofuscarNoticia({tipo, texto}, clave, n, indice, aleatorio)` | pura | → 1368 caracteres | `tipo` `'fuente'` (byte 0) o `'prompt'` (byte 1); contenido = byte de tipo + UTF-8 de `texto`; semilla `` `${clave}|${n}|${indice}|noticia` ``. `TypeError` con un tipo desconocido o un texto vacío o que no sea cadena; `RangeError` si `texto` pasa de 1021 bytes. |
| `desofuscarNoticia(cadena, clave, n, indice)` | pura, nunca lanza | → `{tipo, texto} \| null` | `null` si no se descifra, si el contenido está vacío, si el byte de tipo no es 0 ni 1, si el texto es vacío o no es UTF-8 válido. |
| `urlFuenteValida(url)` | pura | → `boolean` | `true` si es una cadena de 1021 bytes UTF-8 como máximo, `new URL(url)` no lanza, `protocol === 'https:'`, sin usuario ni contraseña, con un `hostname` que contiene un punto y no es una IP, y `new URL(url).href === url` (forma normalizada, la que guarda el importador). |
| `medioDeUrl(url)` | pura | → `string \| null` | `hostname` sin un `www.` inicial, o `null` si la URL no es válida. |

**Archivos mensuales de Headlines** [D-116, D-117] (formato y reglas en 4.7; carga en 4.7.2):

| Función | Tipo | Parámetros → retorno | Notas |
|---|---|---|---|
| `MES_PATRON` | constante | | `/^\d{4}-(0[1-9]\|1[0-2])$/`. |
| `TITULARES_CARPETA` | constante | | `'data/titulares/'` (relativa, sin `/` inicial). |
| `mesDeFecha(fechaISO)` | pura | → `'AAAA-MM' \| null` | Los 7 primeros caracteres si `fechaISO` es una fecha ISO válida (`sumarDias(x, 0) === x`); si no, `null`. |
| `mesDeNumero(lanzamiento, n)` | pura | → `'AAAA-MM' \| null` | `mesDeFecha(fechaDelDia(lanzamiento ?? FECHA_BASE_PRUEBA, n))`; `null` si `n` no es un entero ≥ 1 o si `lanzamiento` no es `null` ni una fecha ISO válida. Es la **única** regla que asigna un día a un archivo, en el juego y en las herramientas. |
| `rutaTitulares(mes)` | pura | → `string \| null` | `` `data/titulares/${mes}.json` `` si `MES_PATRON` lo acepta; si no, `null`. |
| `titularesVacios(mes)` | pura | → `{version: 1, mes, dias: []}` | Lo que devuelve `cargarTitulares` cuando el mes no tiene archivo. Nunca se escribe en disco. |
| `validarTitulares(obj, mes)` | pura | → `boolean` | Estructura de 4.7: claves exactas `version` (=== 1), `mes` y `dias`; `MES_PATRON.test(obj.mes)`; si se pasa `mes`, `obj.mes === mes`; `dias` con **al menos 1** día; cada día con claves exactas `n`, `tema`, `clave`, `textos`, `fichas`; `n` entero ≥ 1 y consecutivo dentro del archivo (`dias[k].n === dias[0].n + k`); `temaValido`; clave de 5 bytes; `textos`: 5 cadenas `/^[A-Za-z0-9+/]{683}=$/`; `fichas`: 5 cadenas `/^[A-Za-z0-9+/]{1366}==$/`. No descifra nada ni comprueba que cada `n` sea de ese mes (eso lo hacen `titularesDelDia`, `titularesDeNumero`, `cargarTitularesPrueba`, `diasDePrueba` y `validar`). |
| `titularesDelDia(titulares, lanzamiento, fechaISO)` | pura | → `{n, fecha, tema, clave, textos, fichas} \| null` | `n = numeroDelDia(fechaISO, lanzamiento)`; `null` si `titulares` es `null`, si `n` es `null`, si `titulares.mes !== mesDeFecha(fechaISO)` o si no hay día `n` en `titulares.dias` (se busca por `n`, no por posición). `fecha` = `fechaISO`. |
| `titularesDeNumero(titulares, lanzamiento, n)` | pura | → mismo objeto o `null` | Para el modo prueba: el día `n` si `titulares.mes === mesDeNumero(lanzamiento, n)` y existe; `fecha = fechaDelDia(lanzamiento ?? FECHA_BASE_PRUEBA, n)`. Un `n` de otro mes → `null`. main.js le pasa el archivo del mes del día con `titularesDelMes` [D-117]. |
| [D-117] `titularesDelMes(meses, mes)` | pura | → archivo mensual \| `null` | El elemento de `meses` (lista de `cargarTitularesPrueba`) con `.mes === mes`, el mismo objeto (`===`); si no hay ninguno o `meses` no es un array, `titularesVacios(mes)`; `null` si `MES_PATRON` no acepta `mes`. No valida ni muta. |
| `cargarTitulares(fechaISO, pedir = fetch)` | async | → objeto de titulares | Juego normal y previsualización. `mes = mesDeFecha(fechaISO)` (si es `null`, rechaza sin pedir nada); pide **solo** `rutaTitulares(mes)` con `{cache: 'no-cache'}`. Respuesta 404 → `titularesVacios(mes)`. Otra respuesta no 2xx, error de red, JSON inválido o `!validarTitulares(obj, mes)` → rechaza (`ERROR_CALENDARIO`). |
| [D-117] `cargarTitularesPrueba(lanzamiento, pedir = fetch)` | async | → `[archivo mensual]` ordenado por `mes` (puede ser `[]`) | Solo modo prueba: descubre y carga **todos** los meses con el sondeo encadenado de 4.7.2, **en serie** (cada petición empieza cuando la anterior ha terminado). `mes = mesDeNumero(lanzamiento, siguiente)`, empezando por `siguiente = 1` (si es `null`, rechaza sin pedir nada); pide `rutaTitulares(mes)` con `{cache: 'no-cache'}`. 404 → fin. Otra no 2xx, error de red, JSON inválido o `!validarTitulares(obj, mes)` → rechaza (`ERROR_CALENDARIO`). Si `obj.dias[0].n !== siguiente` o algún día tiene `mesDeNumero(lanzamiento, d.n) !== mes` → fin sin añadirlo. Si no, lo añade y `siguiente = último n + 1`; si `mesDeNumero(lanzamiento, siguiente) === mes`, fin sin pedir más. Nunca pide dos veces el mismo archivo. |

**Modo prueba** [2.0, D-110, D-116, D-117]:

| Función | Tipo | Notas |
|---|---|---|
| `diasDePrueba(calendario, meses)` | pura | [D-117] `meses` es la **lista de todos los meses** (salida de `cargarTitularesPrueba`). → `[{n, temaImagenes, temaTitulares}]`, ordenado por `n`, con la unión de los `n` del calendario y de todos los meses (`null` en el tema del reto que no tenga ese día). De `meses` solo se usan los elementos que pasan `validarTitulares(el, el.mes)`, y de ellos solo los días con `mesDeNumero(calendario?.lanzamiento ?? null, n) === el.mes` (si un `n` aparece en dos elementos, cuenta el primero). Si `meses` no es un array, solo el calendario. Nunca copia `pruebas`, `clave`, `textos` ni `fichas`; no muta. Con datos ausentes o inválidos, los trata como sin días. |
| `diaDePrueba(search, dias, nHoy)` | pura | → el día de `?dia=n` si existe; si no, el de `nHoy` si existe; si no, el primero; `null` si no hay días. `nHoy` puede ser `null`. |

(`diaPedido`, que D-116 añadía para elegir qué mes cargar, desaparece con D-117: ya no hace falta y no se implementa.)

### 3.3 js/juego.js (agente-de-campo)

Siguen `MODOS`, `MODO_POR_DEFECTO`, `modoValido`, `VOTOS`, `corregir`, `contarAciertos`, `estadoDeCodigo`, `elegirVariante`, `mensajeFinal` y `recortarFicha`. Cambios [2.0]:

| Exportación | Tipo | Descripción |
|---|---|---|
| `RETOS` | constante | `Object.freeze(['imagenes', 'titulares'])` [D-98]. |
| `RETO_POR_DEFECTO` | constante | `'imagenes'`. |
| `retoValido(reto)` | pura | `true` solo para los valores de `RETOS`. |
| `retoDePrueba(search)` | pura | El valor de `?reto=` si es válido; si no, `null` [D-110]. |
| `OCULTA_MAX_MS` | constante | `3000` [D-115]. Umbral de una ausencia en Headlines. |
| `ocultacionEsFallo(ocultoMs)` | pura | `true` solo si `typeof ocultoMs === 'number'` y `ocultoMs > OCULTA_MAX_MS` (estrictamente mayor: 3000 no es fallo; `Infinity` sí; `NaN`, negativos, cadenas y `undefined`, no) [D-115]. |
| `medirOculta(inicio, fin)` | pura | `inicio` y `fin` son `{perf, fecha}` (valores de `performance.now()` y `Date.now()` que toma main.js). → `Math.max(0, dPerf, dFecha)`, donde `dPerf = fin.perf - inicio.perf` y `dFecha = fin.fecha - inicio.fecha`; un intervalo con algún valor no finito se ignora (cuenta como 0). Nunca lanza; con argumentos ausentes devuelve 0 [D-115]. |
| `estadoInicial({modo, reto})` | pura | Estado de 1.2 con `pantalla: 'iniciando'`, `reto` validado (o `RETO_POR_DEFECTO`), `modo` validado, `retos` con los dos casos `null` y `jugado: false`, y `textos`, `texto` y `motivo` a `null`. |
| `transicion(estado, evento)` | pura | Tabla 1.3. Eventos: `CARGADO {retos, reto}`, `ERROR_CALENDARIO`, `ELEGIR_RETO {reto}`, `ELEGIR_MODO {modo}`, `EMPEZAR {fecha}`, `PRECARGA_OK`, `PRECARGA_ERROR`, `REINTENTAR`, `FIN_CUENTA {fecha}`, `PINTADA`, `VOTO {voto}`, `AGOTADO`, **`VOLVIO {ocultoMs, indice}`** [D-115], `SIGUIENTE`, `VOLVER_PORTADA`, `OTRA_PESTANA {reto}`, `MEDIANOCHE`. **Ya no existe `OCULTA`** (si llega, es un evento no listado: el mismo objeto). Nunca muta: devuelve uno nuevo o el mismo objeto. |

Detalles:
- `VOTO` y `VOLVIO` (cuando es fallo) en Headlines: `revelada = desofuscar(clave, n, indice)` y `ficha = desofuscarNoticia(fichas[indice], clave, n, indice)`. En Images, `VOTO` como en la 1.3.
- `EMPEZAR` (Headlines) y `SIGUIENTE` (Headlines) calculan `texto = desofuscarTexto(textos[indice], clave, n, indice)`.
- `VOLVIO` devuelve el mismo objeto en Images, fuera de `caso/pregunta`, con `activo === false`, con `evento.indice !== estado.indice` o si `!ocultacionEsFallo(evento.ocultoMs)` (convive con D-78) [D-101, D-115].
- La decisión del umbral vive en `transicion` (pura y probada); main.js solo mide.
- `CARGADO` recibe `retos` ya preparado por main.js: `{imagenes: {caso, jugado}, titulares: {caso, jugado}}`.

### 3.4 js/temporizador.js

Sin cambios. Headlines solo usa `esperarPintado` (para `PINTADA`); no crea temporizadores (tampoco para la ausencia: se mide al volver, D-115).

### 3.5 js/almacen.js (agente-de-campo) [2.0, D-109]

| Función | Tipo | Descripción |
|---|---|---|
| `CLAVE`, `VERSION` | constantes | `'identifaiit.v3'` y `3`. |
| `datosIniciales()` | pura | `{version: 3, ajustes: {modo: 'normal', reto: 'imagenes'}, retos: {imagenes: {partidas: {}, racha: 0, mejorRacha: 0}, titulares: {partidas: {}, racha: 0, mejorRacha: 0}}}`. |
| `leer(almacen)` | efecto, nunca lanza | Lee **solo** `identifaiit.v3`; JSON inválido, `version !== 3` o estructura incompleta → datos iniciales (rellenando lo que falte). No lee, no migra y no borra `identifaiit.v2` ni `identifaiit.v1`. |
| `guardar`, `leerConRespaldo`, `guardarConRespaldo`, `actualizar`, `crearAlmacenMemoria` | | Sin cambios de firma (usan `CLAVE`). |
| `conAjustes(datos, cambios)` | pura | Mezcla `{modo?, reto?}` en `ajustes`. |
| `partidaDe(datos, reto, fecha)` | pura | → partida o `null`. |
| `registrarInicio(datos, reto, {fecha, n, modo, sesion})` | pura | Como en la 1.3, dentro de `retos[reto].partidas`. En Headlines, `modo: null`. |
| `registrarPrueba(datos, reto, fecha, indice, codigo, sesion)` | pura | |
| `registrarFin(datos, reto, fecha, hoyISO, sesion)` | pura | Recalcula `racha` y `mejorRacha` **de ese reto**. |
| `cerrarAbandonada(datos, reto, fecha, hoyISO)` | pura | Pendientes → `F` y `registrarFin`. |
| `calcularRacha(partidas, hoyISO)` | pura | Sin cambios; se llama con las partidas de un reto [D-25, D-99]. |

- Con un `reto` que no es `imagenes` ni `titulares`, las funciones devuelven `datos` sin cambios y `partidaDe` devuelve `null`; nunca lanzan.
- Nunca se guardan la verdad, el voto, la ficha, el texto, `tapada`, `motivo`, el tema ni los instantes o duraciones de una ausencia [D-115]. main.js valida `ajustes.modo` con `modoValido` y `ajustes.reto` con `retoValido`.

### 3.6 js/compartir.js

Sin cambios de funciones. `textoCompartir({plantilla, n, nombreModo, resultados, racha, url})`: `nombreModo` es opcional (la plantilla de Headlines no tiene `{modo}`).

### 3.7 js/main.js (agente-de-campo)

Lo de la 1.3, con estos cambios [2.0]:

1. **Arranque**: decidir previsualización y modo prueba; `leer()`; `estadoInicial({modo, reto})` con `ajustes` validados (en modo prueba, `reto = retoDePrueba(location.search) ?? RETO_POR_DEFECTO`); rellenar textos; marcar los radios de modo y de reto; registrar los oyentes de bloqueo de copia en `#recorte`; cargar los datos [D-116, D-117]:
   - **Juego normal y previsualización**: en paralelo, `cargarCalendario()` y `cargarTitulares(hoy)` (con `hoy` = la fecha efectiva). Solo se pide el archivo del mes de `hoy`.
   - **Modo prueba** [D-117]: primero `cargarCalendario()` (hace falta `lanzamiento`); después `meses = await cargarTitularesPrueba(lanzamiento)`, que carga en serie todos los meses existentes. No hay ninguna otra carga de titulares: `dias = diasDePrueba(calendario, meses)`, `dia = diaDePrueba(location.search, dias, nHoy)` con `nHoy = numeroDelDia(fechaLocal(new Date()), lanzamiento)`, y el archivo del día es `titularesDelMes(meses, mesDeNumero(lanzamiento, dia.n))`.
   - Si falla cualquier carga, `ERROR_CALENDARIO` (un 404 no es fallo, 4.7.2).
2. **Caso de cada reto**: en el juego normal, `casoDelDia(calendario, hoy)` y `titularesDelDia(titulares, calendario.lanzamiento, hoy)`; en modo prueba, `casoDeNumero(calendario, n)` y `titularesDeNumero(titularesDelMes(meses, mesDeNumero(lanzamiento, n)), lanzamiento, n)` con el `n` elegido. Para cada reto con partida de hoy `en_curso`, `cerrarAbandonada`. `jugado` = hay partida `terminada`. Despachar `CARGADO {retos, reto}`.
3. **`render`**: `data-reto` en `#app`; portada (estados de los retos, tema, modos o regla, racha del reto, texto y `disabled` de Start, pasos de Cómo jugar del reto); en `caso`, según reto: imagen y sobre, o `#recorte` (texto de `estado.texto`) y `#caso-aviso` (visible solo en la pregunta de la prueba 1 de Headlines, 2.3) [D-115]; veredicto de 2.3 (sello, `data-verdad`, texto de `titulares.oculta` si `motivo === 'oculta'`, fuente o confesión); resultado (miniaturas o botones numerados, `#resultado-reto`); ya jugado (`#ya-jugado-reto`, modo oculto en Headlines); `#sin-casos-texto`.
4. **Efectos**:
   - `ELEGIR_RETO` → `conAjustes({reto})` y guardar.
   - `EMPEZAR` en Headlines (al pasar a `caso`) → `sesion`, `registrarInicio(datos, 'titulares', {fecha, n, modo: null, sesion})` y guardar **antes** de pintar la primera noticia; comprobar la `sesion` como en D-51.
   - Cada prueba de Headlines: rellenar `#recorte`, `await esperarPintado()` y, si sigue en la misma prueba y en `pregunta`, `PINTADA`. Sin temporizador. Tras `PINTADA` de la prueba 1, el anuncio de `titulares.aviso_oculta` en `#temporizador-anuncio` (2.3); se vacía en `SIGUIENTE`.
   - Tras cada veredicto (por `VOTO` o por `VOLVIO`) y al terminar, `registrarPrueba` y `registrarFin` con `estado.reto`.
   - `VOLVER_PORTADA` → recalcular los estados de la portada desde el almacén.
   - `MEDIANOCHE` → `iniciando` y repetir el punto 1 completo (calendario y archivo de titulares del mes de la nueva fecha) [D-116]. En modo prueba y previsualización no llega (fecha fija, D-68).
5. **Entrada**: delegación como en la 1.3, más `change` en `input[name=reto]` → `ELEGIR_RETO` y `volver-portada` → `VOLVER_PORTADA`. R, I y Enter igual en los dos retos.
6. **`visibilitychange`** [D-115]:
   - Variable de módulo `ausencia = null` (`{perf, fecha, indice}`), nunca guardada.
   - **Al ocultarse** (`document.visibilityState === 'hidden'`): si `estado.reto === 'titulares'`, `pantalla === 'caso'`, `fase === 'pregunta'` y `activo`, `ausencia = {perf: performance.now(), fecha: Date.now(), indice: estado.indice}`. No se despacha nada ni se guarda nada. En Images, nada (D-78).
   - **Al volver** (`'visible'`): si hay `ausencia`, `ocultoMs = medirOculta(ausencia, {perf: performance.now(), fecha: Date.now()})`, `ausencia = null` y despachar `VOLVIO {ocultoMs, indice}`; si la transición da veredicto, sus efectos guardan la `F` y el foco va a Next. Después, como en la 1.3 (temporizador de Images, cuenta atrás, `MEDIANOCHE`, relecturas de D-51).
   - `ausencia` se borra también en cualquier render que salga de `caso/pregunta` (voto, `OTRA_PESTANA`), para que una medida antigua nunca se aplique a otra prueba (además, `VOLVIO` compara `indice`).
   - No se usa `setTimeout`, `blur`, `pagehide` ni `freeze` para la ausencia.
7. **Otras pestañas** [D-51]: en el evento `storage` y al volver, comparar las partidas de hoy de **cada reto** con las conocidas y despachar `OTRA_PESTANA {reto}` por cada reto que otra pestaña haya empezado o terminado.
8. **Compartir**: plantilla según `estado.reto` (`compartir.plantilla` con `nombreModo`, o `compartir.plantilla_titulares`), con la partida y la racha del reto mostrado.
9. **Previsualización** [D-68]: sin cambios. Con `lanzamiento: null` lleva a `sin-casos`. Carga solo el mes de la fecha de `?fecha=`.
10. **Modo prueba** [D-70, D-110, D-117]: `PRUEBAS_ABIERTAS` sin cambios (una línea, sin fecha en el comentario: "poner false antes del lanzamiento"). Selector creado tras `#portada-caso` con `diasDePrueba(calendario, meses)` (todos los meses) y `diaDePrueba(location.search, dias, nHoy)`; fecha efectiva `fechaDelDia(lanzamiento ?? FECHA_BASE_PRUEBA, n)`; aviso `avisos.prueba` con `{n}`; `abrir-prueba` navega a `?prueba=1&dia={n}&reto={estado.reto}` (la recarga vuelve a cargar el calendario y todos los meses). Almacenes en memoria; nunca se toca ninguna clave `identifaiit.*` del navegador.
11. **Ficha** [D-88, D-104]: `abrirFicha(i, {conImagen})` como en la 1.3 en Images; en Headlines rellena el diálogo según 2.3 (desde `resultado` descifra en ese momento `desofuscarTexto` y `desofuscarNoticia`, sin guardarlos). El enlace solo recibe `href` si `urlFuenteValida`.
12. **Enlaces a la fuente**: main.js no intercepta su clic; no hace ninguna petición al responder ni al abrir un enlace. Abrir el enlace oculta la pestaña del juego, pero en el veredicto ya no hay ausencia que medir.
