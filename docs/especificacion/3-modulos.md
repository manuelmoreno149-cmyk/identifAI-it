# identifAI-it: especificación técnica, versión 3.0 · 3. Módulos JS

Parte de la especificación 3.0 (índice en `docs/ESPECIFICACION.md`) [D-151]. Los cambios de la 3.0 (portada nueva, `instrucciones` y dos idiomas) van marcados con **[3.0]**; lo marcado [2.1] o [2.0] sigue vigente. Qué hay que adaptar del código actual está en `9-tareas.md` (9.7).

## 3. Módulos JS

Módulos ES sin dependencias. Las funciones **puras** no tocan el DOM, `window`, `navigator`, `location`, `localStorage`, `Date.now()`, `performance.now()` ni `Math.random()` (salvo como valor por defecto de un `aleatorio` inyectable) y se prueban con `node --test`. `TextEncoder`, `TextDecoder`, `btoa`, `atob` y `URLSearchParams` son globales en el navegador y en Node 20.

Grafo de importaciones, sin ciclos:
- `main.js` importa todos. `almacen.js` y `juego.js` importan `diario.js`. `compartir.js`, `temporizador.js`, `diario.js` y `textos.js` no importan nada.
- Herramientas: como en la 2.1 (`temas.mjs` no importa nada; `afirmaciones.mjs` importa `temas.mjs` y `diario.js`; `importar.mjs`, `importar-afirmaciones.mjs`, `lanzamiento.mjs`, `creditos.mjs` y `validar.mjs`, sus módulos). [3.0] `importar.mjs`, `validar.mjs` y `creditos.mjs` leen `TEXTOS.en` y `TEXTOS.es` de `js/textos.js`; las funciones de idioma (`IDIOMAS`, `idiomaValido`) vienen de `js/diario.js`.

### 3.1 js/textos.js (cronista)

[3.0, D-155] `export const TEXTOS = { en: {...}, es: {...} }`: **dos árboles con exactamente las mismas claves** (mismos grupos, mismas claves, mismos arrays con la misma longitud y los mismos marcadores `{x}` en cada plantilla). `en` en inglés americano, tono de novela negra [D-93]; `es` en español de España, mismo tono, tuteo. Todo consumidor usa `TEXTOS[idioma]`.

Los valores marcados **exactos** no se cambian sin permiso; el resto son propuestas del cronista que aprueba el usuario (tarea 91).

**Claves que cambian en la 3.0** (las demás siguen como en la 2.1, ahora dentro de `TEXTOS.en`, y con su traducción en `TEXTOS.es`):

| Grupo | Claves |
|---|---|
| `portada` | **Nuevas**: `abrir` (**"Open file" + icono de flecha**, exacto), `pie` (**"New cases every day at midnight."**, exacto), `sello_ilustracion` ("AI?"), `idioma` (nombre accesible del grupo del selector: "Language"). **Siguen**: `titulo`, `lema` (exacto en inglés, D-133), `elige_reto` (**"Choose your case file"**, exacto), `reto_imagenes` (**"Images"**), `reto_afirmaciones` (**"Fact or Fake"**), `estado_*`, `modo_*`, `desc_*` (descripción del modo en la casilla), `etiqueta_caso`, `enlace_creditos`, `expediente_*`, `desc_reto_*` (la frase de la tarjeta). **Retiradas**: `boton_empezar`, `boton_ver_informe`, `regla_afirmaciones`, `elige_modo`, `tema`, `racha`, `empezar_*`, `informe_*`, `tiempo_*`. |
| `instrucciones` | **[3.0] Grupo nuevo**: `volver` (**"All case files"**, exacto), `membrete` (**"Briefing · Case #{n} · {tema}"**, exacto; mayúsculas por CSS), `frase_imagenes`, `frase_afirmaciones` (una frase), `pasos_imagenes` y `pasos_afirmaciones` (exactamente 4 cada uno, estilo informe a máquina, 80 caracteres como máximo; en Fact or Fake uno de ellos dice que salir de la página más de unos segundos es fallo), `firma` (**"One try per day. — The Chief"**, exacto, con raya U+2014), `metodo` (**"METHOD OF INVESTIGATION"**, exacto), `reglas` (**"HOUSE RULES"**, exacto), `ejemplo_etiqueta` ("Example"), `ejemplo` (afirmación inventada de muestra, una frase de 100 caracteres como máximo, que no sea ninguna afirmación de los datos y cumpla la norma de contenido), `boton_empezar` (**"Open the case"**, exacto). |
| `como_jugar` | **[3.0] Retirado entero** (`titulo`, `pasos`, `pasos_afirmaciones`): los pasos pasan a `instrucciones.pasos_*`. |
| `prueba` | `etiqueta` (nombre accesible del desplegable, "Test day") y `opcion` (texto de cada día, con `{n}` y `{tema}` disponibles; propuesta: "{tema}"). **Retirada**: `boton`. |
| `fichas` | `autentica` (**"Real photograph"** / **"Fotografía real"**, exactos: los usan el importador y `validar`). **Retirada**: `sin_prompt` (los prompts son obligatorios, D-157). |
| `afirmaciones`, `partida`, `revelacion`, `veredictos`, `confesion`, `ficha`, `final`, `resultado`, `ya_jugado`, `sin_casos`, `errores`, `avisos`, `compartir`, `creditos`, `cargando`, `cuenta_atras` | Sin cambios de claves. `creditos` añade **`otro_idioma`** (texto del enlace a la otra página de créditos: "Español" en `en`, "English" en `es`) [D-161]. |

**Valores exactos en español** [D-155] (los decidió el usuario o se derivan sin margen de los exactos ingleses):

| Clave | `en` | `es` |
|---|---|---|
| `portada.reto_imagenes` | Images | **Imágenes** |
| `portada.reto_afirmaciones` | Fact or Fake | **¿Dato o Bulo?** |
| `partida.boton_autentica` / `boton_generada` / `sello_*` | REAL / AI | **REAL / IA** |
| `afirmaciones.boton_autentica` / `boton_generada` / `sello_*` | FACT / FAKE | **DATO / BULO** |
| `portada.modo_investigador` / `modo_normal` / `modo_perro` | Investigator / Normal / Bloodhound | **Investigador / Normal / Sabueso** |
| `afirmaciones.marca` | identifAI-it · Fact or Fake? | **identifAI-it · ¿Dato o Bulo?** |
| `fichas.autentica` | Real photograph | **Fotografía real** |
| `compartir.plantilla` | (sección 7) | (4c-idiomas.md, 4.24) |
| `compartir.plantilla_afirmaciones` | (sección 7) | (4c-idiomas.md, 4.24) |
| `creditos.otro_idioma` | Español | **English** |

**Propuestas en español** (las fija el cronista y las aprueba el usuario): el lema (p. ej. "Dos casos al día. Caza el bulo."), `portada.abrir` ("Abrir expediente →"), `portada.pie` ("Casos nuevos cada día a medianoche."), `portada.elige_reto` ("Elige tu expediente"), `portada.sello_ilustracion` ("¿IA?"), `portada.etiqueta_caso` ("Caso n.º {n}"), `instrucciones.volver` ("Todos los expedientes"), `instrucciones.membrete` ("Informe · Caso n.º {n} · {tema}"), `instrucciones.firma` ("Un intento al día. — El Jefe"), `instrucciones.metodo` ("MÉTODO DE INVESTIGACIÓN"), `instrucciones.reglas` ("NORMAS DE LA CASA"), `instrucciones.boton_empezar` ("Abrir el caso"), `afirmaciones.aviso_oculta` ("Salir de la página más de unos segundos cuenta como fallo."), `partida.marca` ("identifAI-it · ¿Real o IA?"), los 6 + 6 mensajes finales, `creditos.afirmaciones_texto` y el resto. Una vez aprobados, el lema, el aviso de ausencia, `creditos.afirmaciones_texto` y los mensajes finales en español pasan a ser exactos (se anotan en DECISIONES como ajuste menor).

Reglas:
- [D-118] **Cómo se mide**: `[...s].length` sobre el texto **ya rellenado**, por idioma, con los valores de relleno de cada idioma:

  | Marcador | Valor de relleno |
  |---|---|
  | `{aciertos}`, `{i}` | `'5'` |
  | `{n}`, `{caso}`, `{racha}` | `'999'` |
  | `{s}` | `'9'` |
  | `{tiempo}` | `'00:00:00'` |
  | `{tema}` | 30 caracteres |
  | `{fecha}` | `'Nov 30, 2026'` (`en`), `'30 nov 2026'` (`es`) |
  | `{modo}`, `{reto}`, `{estado}`, `{sello}`, `{voto}` | el más largo de su grupo **en ese idioma** |

- **Límite general**: 90 en los dos idiomas. Excepciones de la 2.1 (`fichas.*` 510 bytes, plantillas de compartir, `creditos.afirmaciones_texto` 120) y [3.0] `instrucciones.pasos_*` (80 cada uno), `instrucciones.ejemplo` (100), `creditos.afirmaciones_texto` (120 también en español).
- Límites particulares de la 2.1 en los dos idiomas, con estos cambios [3.0]: `portada.reto_*` **14** (antes 12, por "¿Dato o Bulo?", 13); `portada.abrir` 24; `portada.pie` 48; `portada.idioma` 20; `instrucciones.volver` 24; `instrucciones.membrete` 70; `instrucciones.frase_*` 70; `instrucciones.firma` 40; `instrucciones.metodo` y `instrucciones.reglas` 30; `instrucciones.boton_empezar` 20; `prueba.opcion` 50. `afirmaciones.aviso_oculta` en español: 70.
- Los textos de Fact or Fake que hablan de salir de la página dicen "more than a few seconds" / "más de unos segundos", nunca que cualquier salida es fallo [D-115].
- `final.mensajes_afirmaciones` (los dos idiomas) no habla de IA, imágenes ni fotos [D-134].
- Ningún texto de `es` contiene "IA" como palabra suelta salvo `partida.boton_generada`, `partida.sello_generada`, `partida.voto_generada`, `portada.sello_ilustracion`, `revelacion.resumen_generada`, `partida.marca`, `confesion.*` y los mensajes de Images (como en inglés con "AI").

### 3.2 js/diario.js (agente-de-campo)

Siguen, sin cambios, `fechaLocal`, `sumarDias`, `diasEntre`, `numeroCaso`, `msHastaMedianoche`, `formatearCuentaAtras`, `temaValido`, `rutaPrueba`, `ofuscar`, `desofuscar`, `HOSTS_LOCALES`, `fechaPrevisualizada`, `pruebaActiva`, `FICHA_BLOQUE`, `FICHA_MAX_BYTES`, `cargarCalendario`, `precargar`, `FECHA_BASE_PRUEBA`, `numeroDelDia`, `fechaDelDia`, `flujoBytes`, `ofuscarBloque`, `desofuscarBloque`, `MES_PATRON`, `mesDeFecha`, `mesDeNumero`, `diaDePrueba`, `AFIRMACION_*`, `ACLARACION_*`, `DETALLES_MAX`, `AFIRMACIONES_CARPETA`, `rutaAfirmaciones`, `afirmacionesDelMes`, `cargarAfirmaciones`, `cargarAfirmacionesPrueba`.

**Idiomas** [3.0, D-154]:

| Función | Tipo | Parámetros → retorno | Notas |
|---|---|---|---|
| `IDIOMAS` | constante | | `Object.freeze(['en', 'es'])`. |
| `IDIOMA_POR_DEFECTO` | constante | | `'en'`. |
| `LOCALES` | constante | | `Object.freeze({en: 'en-US', es: 'es-ES'})`. |
| `idiomaValido(x)` | pura | → `boolean` | `IDIOMAS.includes(x)` (solo cadenas exactas en minúsculas). |
| `idiomaDeUrl(search)` | pura | `string` → `'en' \| 'es' \| null` | Parámetro `lang` de `URLSearchParams(search)`, en minúsculas; `null` si falta o no es válido (`'ES'` → `'es'`; `'es-ES'`, `'fr'`, `''` → `null`). |
| `idiomaDelNavegador(lenguas)` | pura | `string[] \| undefined` → `'en' \| 'es'` | Mira **solo el primer** elemento que sea una cadena: `'es'` si, en minúsculas, es `'es'` o empieza por `'es-'`; en cualquier otro caso (también lista vacía o no array), `'en'`. |
| `elegirIdioma({search, guardado, lenguas})` | pura | → `{idioma, origen}` | Orden: `idiomaDeUrl(search)` (`origen: 'url'`), si no `guardado` válido (`'guardado'`), si no `idiomaDelNavegador(lenguas)` (`'navegador'`). |
| `formatearFecha(fechaISO, idioma = 'en')` | pura | → `string` | [3.0] Con `LOCALES[idioma]` (`'Nov 30, 2026'` / `'30 nov 2026'`); idioma no válido → `en`. |

**Semillas por idioma** [3.0, D-157, D-158] (detalle en 4c-idiomas.md, 4.17). Todas las funciones de ficha, afirmación y aclaración reciben `idioma` como **último** parámetro, con valor por defecto `'en'`, para que las llamadas y vectores de la 2.1 sigan valiendo:

| Función | Firma 3.0 | Semilla |
|---|---|---|
| `flujoFicha` | `(clave, n, indice, idioma = 'en')` | `en`: `` `${clave}|${n}|${indice}` `` (sin cambios); `es`: `` `${clave}|${n}|${indice}|es` `` |
| `ofuscarFicha` | `(texto, clave, n, indice, aleatorio = Math.random, idioma = 'en')` | la de `flujoFicha` |
| `desofuscarFicha` | `(cadena, clave, n, indice, idioma = 'en')` | la de `flujoFicha` |
| `ofuscarAfirmacion` | `(texto, clave, n, indice, aleatorio = Math.random, idioma = 'en')` | `…|afirmacion` y, en `es`, `…|afirmacion|es` |
| `desofuscarAfirmacion` | `(cadena, clave, n, indice, idioma = 'en')` | igual |
| `ofuscarAclaracion` | `({aclaracion, detalles}, clave, n, indice, aleatorio = Math.random, idioma = 'en')` | `…|aclaracion` y, en `es`, `…|aclaracion|es` |
| `desofuscarAclaracion` | `(cadena, clave, n, indice, idioma = 'en')` | igual |

Con un `idioma` no válido, las de ofuscar lanzan `TypeError` y las de desofuscar devuelven `null` (nunca lanzan).

**Calendario versión 5 y archivos mensuales versión 2** [3.0, D-157, D-158] (formatos en 4c-idiomas.md):

| Función | Cambio |
|---|---|
| `validarCalendario(obj)` | Solo acepta `version: 5`. Cada día con claves exactas `n`, `tema`, `pruebas`, `clave`, `fichas`; `tema` = objeto con claves exactas `en` y `es`, las dos `temaValido`; `fichas` = objeto con claves exactas `en` y `es`, cada una 5 cadenas `/^[A-Za-z0-9+/]{683}=$/`. Lo demás, como la v4. |
| `casoDelDia(calendario, fechaISO)`, `casoDeNumero(calendario, n)` | Devuelven `{n, fecha, tema: {en, es}, pruebas, clave, fichas: {en, es}}` (copias; nunca el objeto del calendario). |
| `afirmacionesVacias(mes)` | `{version: 2, mes, dias: []}`. |
| `validarAfirmaciones(obj, mes)` | Solo `version: 2`. Día con claves exactas `n`, `tema`, `clave`, `textos`, `fichas`; `tema` como en el calendario; `textos` y `fichas` = objetos `{en, es}` con 5 bloques de 684 caracteres cada uno. |
| `afirmacionesDelDia(datos, lanzamiento, fechaISO)`, `afirmacionesDeNumero(datos, lanzamiento, n)` | Devuelven `{n, fecha, tema: {en, es}, clave, textos: {en, es}, fichas: {en, es}}`. |
| `diasDePrueba(calendario, meses)` | `[{n, temaImagenes, temaAfirmaciones}]` con cada tema `{en, es}` o `null`. |
| `temaDelDia(dia, idioma)` | **Nueva**, pura: el tema de un elemento de `diasDePrueba` en `idioma` (`temaImagenes[idioma]`; si los dos existen y difieren, unidos por " / "; si solo hay uno, ese; si ninguno, `''`). La usa main.js para las opciones del desplegable. |

### 3.3 js/juego.js (agente-de-campo)

Siguen `MODOS`, `MODO_POR_DEFECTO`, `modoValido`, `VOTOS`, `corregir`, `contarAciertos`, `estadoDeCodigo`, `elegirVariante`, `mensajeFinal`, `recortarFicha`, `RETOS`, `RETO_POR_DEFECTO`, `retoValido`, `OCULTA_MAX_MS`, `ocultacionEsFallo`, `medirOculta`, `mensajesDelReto`, `votoDicho`, `etiquetaResultado`. **[3.0] Se retira `retoDePrueba`** (el modo prueba ya no usa `&reto=`, D-152). Cambios:

| Exportación | Tipo | Descripción |
|---|---|---|
| `TECLAS` | constante | [3.0, D-156] Congelada en profundidad: `{en: {imagenes: {r: 'autentica', i: 'generada'}, afirmaciones: {f: 'autentica', k: 'generada'}}, es: {imagenes: {r: 'autentica', i: 'generada'}, afirmaciones: {d: 'autentica', b: 'generada'}}}`. |
| `votoDeTecla(reto, tecla, idioma = 'en')` | pura | [3.0] `TECLAS[idioma][reto][tecla.toLowerCase()]`, o `null` si el idioma o el reto no son válidos, `tecla` no es una cadena de un carácter o no está en la tabla. main.js no la llama con Ctrl, Alt o Meta. |
| `teclaDeVoto(reto, voto, idioma = 'en')` | pura | [3.0] La tecla en mayúscula (`'R'`, `'I'`, `'F'`, `'K'`, `'D'`, `'B'`); `null` si no hay. |
| `estadoInicial({modo, reto, idioma})` | pura | [3.0] Añade `idioma` (validado; por defecto `'en'`). |
| `transicion(estado, evento)` | pura | [3.0] Tabla de 1.3: eventos nuevos `ABRIR_RETO {reto}` y `CAMBIAR_IDIOMA {idioma}`; `ELEGIR_MODO` y `EMPEZAR` solo en `instrucciones`; `VOLVER_PORTADA` también desde `instrucciones`; `OTRA_PESTANA` y `MEDIANOCHE` con `instrucciones`; `ELEGIR_RETO` retirado (devuelve el mismo objeto). |

Detalles [3.0]:
- `VOTO` y `VOLVIO` (fallo): Images `ficha = desofuscarFicha(fichas[idioma][indice], clave, n, indice, idioma)`; Fact or Fake `ficha = desofuscarAclaracion(fichas[idioma][indice], clave, n, indice, idioma)`. `revelada = desofuscar(clave, n, indice)` (común a los dos idiomas).
- `EMPEZAR` y `SIGUIENTE` en Fact or Fake: `texto = desofuscarAfirmacion(textos[idioma][indice], clave, n, indice, idioma)`.
- Si `fichas` o `textos` no tienen el idioma (datos corruptos que pasaran la validación), `ficha`/`texto` = `null` (main.js muestra `no_disponible`); nunca lanza.
- `CARGADO` conserva `estado.idioma`. `ABRIR_RETO` copia el caso como hacía `ELEGIR_RETO` (`n`, `tema`, `pruebas`, `textos`, `clave`, `fichas`).

### 3.4 js/temporizador.js

Sin cambios.

### 3.5 js/almacen.js (agente-de-campo)

Como en la 2.1 (`identifaiit.v3`, por reto, sin cambios de forma ni de versión) [D-109, D-154]. El idioma **no** va en `identifaiit.v3`: ni en `ajustes` ni en las partidas. [3.0] Preferencia de idioma en una clave aparte:

| Función | Tipo | Descripción |
|---|---|---|
| `CLAVE_IDIOMA` | constante | `'identifaiit.idioma'`. Valor: la cadena `en` o `es`, sin JSON. |
| `leerIdioma(almacen)` | efecto, nunca lanza | `almacen.getItem(CLAVE_IDIOMA)` si es `idiomaValido`; si no, si falta o si lanza, `null`. |
| `guardarIdioma(almacen, idioma)` | efecto, nunca lanza | Si `idiomaValido(idioma)`, `setItem` y `true`; si no es válido o lanza, `false` sin escribir. |

- main.js usa **siempre** `localStorage` real para esta clave, también en previsualización y modo prueba (es una preferencia, no progreso); si falla, el idioma vive solo en memoria y no se muestra ningún aviso por ello.
- `datosIniciales`, `leer`, `guardar`, `registrar*`, `cerrarAbandonada` y `calcularRacha` no cambian. `ajustes.reto` se sigue guardando (en `ABRIR_RETO`) y `ajustes.modo` (en `ELEGIR_MODO`).

### 3.6 js/compartir.js

Sin cambios de funciones. main.js pasa `plantilla` y `nombreModo` de `TEXTOS[idioma]` (4c-idiomas.md, 4.24). `urlDelJuego` sigue quitando `search` (el texto compartido nunca lleva `?lang=`).

### 3.7 js/main.js (agente-de-campo)

Lo de la 2.1 (cargas, ausencia, otras pestañas, previsualización, ficha, compartir, resultado), con estos cambios [3.0]:

1. **Arranque**: decidir previsualización y modo prueba; `{idioma, origen} = elegirIdioma({search: location.search, guardado: leerIdioma(localStorage), lenguas: navigator.languages ?? [navigator.language]})`; si `origen === 'url'`, `guardarIdioma(localStorage, idioma)` (DP-70); `document.documentElement.lang = idioma`; `leer()`; `estadoInicial({modo, reto, idioma})`; rellenar `[data-texto]` y `[data-texto-aria]`; registrar los oyentes de bloqueo de copia; cargar los datos como en la 2.1. El repintado inicial ocurre antes de quitar `hidden` a la primera pantalla, para que nunca se vean textos del otro idioma.
2. **Caso de cada reto**: como en la 2.1 con las funciones de 3.2 (tema y bloques `{en, es}`); `CARGADO {retos, reto: ajustes.reto}`.
3. **`render`**: `data-reto` en `#app`; `aria-pressed` del selector; portada (tarjetas con su estado y `disabled`, `#portada-caso`, `#portada-tema` o el desplegable de prueba, `href` de `#portada-creditos`); `instrucciones` (membrete, pasos, `hidden` de `#instrucciones-modos` / `#instrucciones-reglas`, radio del modo); `caso` (textos y teclas con `teclaDeVoto(reto, voto, idioma)`); resultado, `ya-jugado` y `sin-casos` en el idioma activo. Todos los textos de `TEXTOS[estado.idioma]`.
4. **Efectos**:
   - `ABRIR_RETO` → `conAjustes({reto})` y guardar.
   - `ELEGIR_MODO` → `conAjustes({modo})` y guardar.
   - `CAMBIAR_IDIOMA` → `guardarIdioma(localStorage, idioma)`, `document.documentElement.lang`, `history.replaceState` si la URL lleva `lang` (con el nuevo valor), repintar `[data-texto]`/`[data-texto-aria]` y la pantalla. No toca el almacén de progreso ni las partidas.
   - `EMPEZAR` en Fact or Fake: como en la 2.1 (intento gastado antes de pintar la primera afirmación).
   - `MEDIANOCHE` → `iniciando` y repetir el punto 1 con el idioma actual (sin volver a elegirlo).
5. **Entrada**: delegación de clics por `data-accion`: `abrir-reto` → `ABRIR_RETO {reto: data-reto-boton}`; `idioma` → `CAMBIAR_IDIOMA {idioma: data-idioma}`; `volver-portada` → `VOLVER_PORTADA` (y `MEDIANOCHE` si cambió el día, D-145); `empezar` → `EMPEZAR {fecha}`; `change` en `input[name=modo]` → `ELEGIR_MODO`; en modo prueba, `change` en `#selector-prueba-dia` → `location.assign('?prueba=1&dia=' + n)`. Teclado en `caso/pregunta`: `votoDeTecla(estado.reto, evento.key, estado.idioma)`. Desaparecen los manejadores de `abrir-ayuda`, `cerrar-ayuda`, `abrir-prueba`, `input[name=reto]` y `dialog#como-jugar`.
6. **`visibilitychange`**, **otras pestañas**, **ficha** y **previsualización**: como en la 2.1, con `instrucciones` en la lista de pantallas donde se relee el almacén al volver y en el evento `storage`.
7. **Compartir**: `textoCompartir({plantilla: TEXTOS[idioma].compartir.plantilla | plantilla_afirmaciones, n, nombreModo: TEXTOS[idioma].portada.modo_{modo}, resultados, racha, url})`.
8. **Modo prueba**: sin `&reto=`; el desplegable de 2.3 sustituye a `#selector-prueba`; `diasDePrueba` + `temaDelDia(dia, idioma)` para las opciones.
