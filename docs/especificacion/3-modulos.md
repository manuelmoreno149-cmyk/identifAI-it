# identifAI-it: especificación técnica, versión 2.1 · 3. Módulos JS

Parte de la especificación 2.1 (índice en `docs/ESPECIFICACION.md`) [D-120]. Los cambios de la 2.1 (Fact or Fake en lugar de Headlines) van marcados con **[2.1]**; lo marcado [2.0] sigue vigente con los nombres nuevos. Lo no marcado sigue como en la 1.3. Qué partes del código ya escrito hay que adaptar está en `9-tareas.md` (9.4.1).

## 3. Módulos JS

Módulos ES sin dependencias. Las funciones **puras** no tocan el DOM, `window`, `localStorage`, `Date.now()`, `performance.now()` ni `Math.random()` (salvo como valor por defecto de un `aleatorio` inyectable) y se prueban con `node --test`. `TextEncoder`, `TextDecoder`, `btoa`, `atob` y `URLSearchParams` son globales en el navegador y en Node 20.

Grafo de importaciones, sin ciclos:
- `main.js` importa todos. `almacen.js` y `juego.js` importan `diario.js`. `compartir.js`, `temporizador.js`, `diario.js` y `textos.js` no importan nada.
- Herramientas:
  - `temas.mjs` no importa nada.
  - [2.1] `afirmaciones.mjs` (antes `titulares.mjs`) importa `./temas.mjs` (`analizarCarpeta`, `contienePalabraProhibida`), `../js/diario.js` (`validarAfirmaciones`, `mesDeNumero`, `MES_PATRON`, `fechaDelDia`, `diasEntre`, `temaValido`, `DETALLES_MAX`, `AFIRMACION_MAX_BYTES`, `ACLARACION_MAX_BYTES`) y, solo para sus dos funciones de archivo, `node:fs` y `node:path`.
  - [2.1] `creditos.mjs` importa `../js/textos.js` y nada de Fact or Fake (la sección es fija, D-129).
  - `importar.mjs` como en la 1.3 (sin `LANZAMIENTO`) [D-95]; [2.1] ignora `facts.txt`, `facts.en.txt`, `datos.txt` y `datos.original.txt` (4.4.1) [D-139].
  - [2.1] `importar-afirmaciones.mjs` importa `../js/diario.js` (`ofuscar`, `desofuscar`, `ofuscarAfirmacion`, `ofuscarAclaracion`, `desofuscarAfirmacion`, `validarAfirmaciones`, `validarCalendario`, `fechaDelDia`, `mesDeNumero`), `./temas.mjs` (`barajar`, `avisosMezcla`) y `./afirmaciones.mjs`. No lee ni escribe ningún banco [D-131].
  - `lanzamiento.mjs` importa `../js/diario.js`, `./temas.mjs` y [2.1] `./afirmaciones.mjs` (lectura, unión, reparto y escritura de `data/facts/`).
  - `validar.mjs` importa además `./afirmaciones.mjs` y lee todos los archivos de `data/facts/` (sin banco de Fact or Fake, D-131).

### 3.1 js/textos.js (cronista)

`export const TEXTOS = {...}`, en inglés americano [D-93]. [2.1] Se eliminan el grupo `titulares` y las claves `portada.reto_titulares`, `portada.regla_titulares`, `como_jugar.pasos_titulares`, `compartir.plantilla_titulares`, `creditos.noticias`, `creditos.noticias_intro`, `creditos.sin_noticias` y `creditos.ficcion`. Los valores entre comillas marcados como **exactos** no se cambian sin permiso; el resto son propuestas que el cronista puede pulir y el usuario aprueba (tarea 82).

| Grupo | Claves |
|---|---|
| `portada` | Las de la 1.3 y la 2.0 (`elige_reto`, `reto_imagenes` **"Images"** exacto, `estado_pendiente`, `estado_jugado`, `estado_en_curso` **"In another tab"**, `estado_sin_caso`, `boton_ver_informe`) y [2.1] `reto_afirmaciones` (**"Fact or Fake"**, exacto) y `regla_afirmaciones` (mismo valor aprobado que la antigua `regla_titulares`: **"No timer. Leave for more than a few seconds and it's a miss."**). [2.1] `lema`, común a los dos retos: **"Two cases a day. Spot the fake."** (exacto; sustituye a "Five pieces of evidence. One shot. Real or AI?") [D-133]. |
| `como_jugar` | `titulo`, `pasos` (Images, exactamente 4) y [2.1] `pasos_afirmaciones` (exactamente 4): dos retos al día con un intento cada uno; leer la afirmación y decidir FACT o FAKE sin prisa; salir de la página **más de unos segundos** antes de responder cuenta como fallo; tras responder, la verdad y los detalles. Propuesta: "Two challenges a day, one try each. This one is Fact or Fake.", "Read the claim, then call it: FACT or FAKE. No timer.", "Leave the page for more than a few seconds and it counts as a miss.", "After you answer, you get the truth and the details." |
| `cargando`, `cuenta_atras` | Sin cambios. |
| `partida` | Sin cambios. Fact or Fake reutiliza `caso_del_dia`, `marcador`, `boton_siguiente` y `boton_ver_resultado` (los votos tienen sus propias claves). |
| `afirmaciones` | [2.1] `etiqueta_prueba` ("Claim {i}/5"); `boton_autentica` (**"FACT"**, exacto) y `boton_generada` (**"FAKE"**, exacto); `sello_autentica` (**"FACT"**, exacto) y `sello_generada` (**"FAKE"**, exacto); `marca` (**"identifAI-it · Fact or Fake?"**, exacto, U+00B7) [D-128]; `oculta` (array de 2 o más; pueden quedarse los tres valores aprobados de `titulares.oculta`, que no nombran el reto); `aviso_oculta` (**"Leaving the page for more than a few seconds counts as a miss."**, exacto) [D-115]; `no_disponible` (si una afirmación no se descifra; propuesta: "This file can't be read. Try reloading the page."); `aclaracion_no_disponible` (si la aclaración no se descifra; propuesta: "The record on this claim got lost in the paperwork."); `estado_prueba` ("Claim {i}: {estado}"). |
| `veredictos` | Sin cambios. |
| `confesion`, `ficha`, `fichas` | Sin cambios (solo Images, salvo `ficha.cerrar`, común). |
| `final` | Los de la 1.3 y la 2.0 (`reto`, `boton_volver`). [2.1] **Mensajes por reto** [D-134]: `mensajes` es **solo de Images** (6 cadenas, índice = aciertos de 0 a 5; valores actuales sin cambios) y `mensajes_afirmaciones` es **de Fact or Fake** (6 cadenas, índice = aciertos de 0 a 5, tono policíaco, sin hablar de IA ni de imágenes). `mensajes_afirmaciones` está **aprobado por el usuario y es exacto** [D-138], en este orden: (0) "The paperwork beat you. Not one call survived. The file goes in the drawer, face down.", (1) "One call held up. The other lies were sharper than you. Check the sources.", (2) "Two right calls. A fake in a good suit got past you. Check the source before you sign.", (3) "Three right calls. Solid instincts, but two lies still slipped past your desk.", (4) "Four right calls. One lie got away. Read every claim like a suspect's alibi.", (5) "Every fact confirmed, every fake exposed. No loose ends in this file." Cómo se elige el conjunto: `mensajesDelReto` (3.3). |
| `ya_jugado` | Sin cambios (`modo` solo en Images). |
| `sin_casos` | `texto` y `sin_lanzamiento` (2.0). |
| `errores` | Sin cambios. |
| `avisos` | Los de la 1.3 y `prueba` (2.0). |
| `prueba` | Sin cambios. |
| `compartir` | `boton`, `copiado`, `manual`, `plantilla` (Images) y [2.1] `plantilla_afirmaciones`, exactamente las de la sección 7 [D-128]. |
| `creditos` | Los de la 1.3 y [2.1] `afirmaciones` ("Fact or Fake") y `afirmaciones_texto`, **exacto**: "Claims are written for this game from public sources. The fakes are invented and always debunked after you answer." (114 caracteres) [D-129, D-132]. |

Reglas:
- [D-118] **Cómo se mide**: en puntos de código (`[...s].length`) sobre el texto **ya rellenado** con los valores de relleno de esta tabla. Los tests definen una constante con exactamente estos valores; un marcador que no esté aquí hace fallar el test.

  | Marcador | Valor de relleno |
  |---|---|
  | `{aciertos}`, `{i}` | `'5'` |
  | `{n}`, `{caso}`, `{racha}` | `'999'` |
  | `{s}` | `'9'` |
  | `{tiempo}` | `'00:00:00'` |
  | `{tema}` | 30 caracteres (`'x'.repeat(30)`) |
  | `{fecha}` | `'Nov 30, 2026'` |
  | `{modo}` | el más largo de `portada.modo_*` |
  | `{reto}` | el más largo de `portada.reto_*` |
  | `{estado}` | el más largo de `final.estados.*` |
  | `{sello}` | [2.1] el más largo de `partida.sello_*` y `afirmaciones.sello_*` |

  ([2.1] Desaparece `{medio}`.)
- **Límite general**: toda cadena de `TEXTOS`, rellenada, mide **90** como máximo (también cada `final.mensajes_afirmaciones`, y los 6 aprobados lo cumplen). Excepciones: `fichas.*` (510 bytes UTF-8); `como_jugar.pasos` y `como_jugar.pasos_afirmaciones` (80 cada uno); `compartir.plantilla` y `compartir.plantilla_afirmaciones` (exactas, no se miden); [2.1] `creditos.afirmaciones_texto` (120).
- Límites de la 1.3 que siguen: `portada.modo_*` 14; `portada.desc_*` 26; `partida.sobre_texto` 16; `confesion.titulo` 30; `confesion.leer_entera` 24; `ficha.cerrar` 16; `prueba.opcion` 50.
- Límites de la 2.0 que siguen: `portada.reto_*` 12; `portada.estado_*` 18; `portada.boton_ver_informe` y `final.boton_volver` 16; `avisos.prueba` 70. [2.1] `portada.regla_afirmaciones` 70; `afirmaciones.etiqueta_prueba` 16; `afirmaciones.boton_*` y `afirmaciones.sello_*` 12; `afirmaciones.marca` 40; cada `afirmaciones.oculta` 90; `afirmaciones.aviso_oculta` exacto (62).
- Valores exactos que el cronista no puede cambiar: `portada.reto_imagenes`, `portada.reto_afirmaciones`, [2.1] `portada.lema`, `afirmaciones.boton_*`, `afirmaciones.sello_*`, `afirmaciones.marca`, `afirmaciones.aviso_oculta`, `compartir.plantilla`, `compartir.plantilla_afirmaciones`, [2.1] `creditos.afirmaciones_texto`, [2.1] `final.mensajes_afirmaciones` (los 6, en su orden) [D-138], además de los de la 1.3.
- Los textos de Fact or Fake que hablan de salir de la página dicen "more than a few seconds" (o equivalente), nunca que cualquier salida es fallo [D-115].
- Ningún texto de Fact or Fake nombra una persona, una institución ni un medio, ni afirma nada sobre el contenido de un día.
- [2.1] `final.mensajes_afirmaciones` no habla de IA, imágenes ni fotos (y `final.mensajes` sigue siendo solo de Images) [D-134].

### 3.2 js/diario.js (agente-de-campo)

Siguen, sin cambios, `fechaLocal`, `sumarDias`, `diasEntre`, `formatearFecha`, `numeroCaso`, `msHastaMedianoche`, `formatearCuentaAtras`, `temaValido`, `rutaPrueba`, `ofuscar`, `desofuscar`, `HOSTS_LOCALES`, `fechaPrevisualizada`, `pruebaActiva`, `FICHA_BLOQUE`, `FICHA_MAX_BYTES`, `flujoFicha`, `ofuscarFicha`, `desofuscarFicha`, `cargarCalendario`, `precargar` y, de la 2.0, `FECHA_BASE_PRUEBA`, `numeroDelDia`, `fechaDelDia`, `validarCalendario` (versión 4), `casoDelDia`, `casoDeNumero`, `flujoBytes`, `ofuscarBloque`, `desofuscarBloque`, `MES_PATRON`, `mesDeFecha`, `mesDeNumero` y `diaDePrueba` (firmas y comportamiento de la 2.0; ver `git show` de la tarea 63).

**[2.1] Se retiran** (código de la tarea 62 que hay que borrar con sus tests): `TEXTO_BLOQUE`, `TEXTO_MAX_BYTES`, `NOTICIA_BLOQUE`, `NOTICIA_MAX_BYTES`, `ofuscarTexto`, `desofuscarTexto`, `ofuscarNoticia`, `desofuscarNoticia`, `urlFuenteValida` y `medioDeUrl`.

**Afirmaciones y aclaraciones** [2.1, D-124] (algoritmo en 4.8):

| Función | Tipo | Parámetros → retorno | Notas |
|---|---|---|---|
| `AFIRMACION_BLOQUE`, `AFIRMACION_MAX_BYTES` | constantes | | `512` y `510`. |
| `ACLARACION_BLOQUE`, `ACLARACION_MAX_BYTES` | constantes | | `512` y `510`. |
| `DETALLES_MAX` | constante | | `3`. |
| `ofuscarAfirmacion(texto, clave, n, indice, aleatorio = Math.random)` | pura | → 684 caracteres | Contenido UTF-8 de `texto`; semilla `` `${clave}|${n}|${indice}|afirmacion` ``. `TypeError` si `texto` no es una cadena no vacía o contiene `\n`; `RangeError` si pasa de 510 bytes. |
| `desofuscarAfirmacion(cadena, clave, n, indice)` | pura, nunca lanza | → `string \| null` | `null` si el bloque no se descifra, no es UTF-8 válido, está vacío o contiene `\n`. |
| `ofuscarAclaracion({aclaracion, detalles}, clave, n, indice, aleatorio = Math.random)` | pura | → 684 caracteres | Contenido UTF-8 de `[aclaracion, ...detalles].join('\n')`; semilla `` `${clave}|${n}|${indice}|aclaracion` ``. `detalles` es un array de 0 a 3 cadenas (por defecto `[]`). `TypeError` si `aclaracion` o algún detalle no es una cadena no vacía, contiene `\n`, o hay más de 3 detalles; `RangeError` si pasa de 510 bytes. |
| `desofuscarAclaracion(cadena, clave, n, indice)` | pura, nunca lanza | → `{aclaracion, detalles} \| null` | Parte por `\n`: la primera parte es la aclaración y el resto, los detalles (array, posiblemente vacío). `null` si no se descifra, no es UTF-8 válido, alguna parte está vacía o hay más de 4 partes. |

**Archivos mensuales de Fact or Fake** [2.1, D-116, D-117, D-124] (formato y reglas en 4.7; carga en 4.7.2). Son las funciones de la 2.0 renombradas; el comportamiento no cambia salvo la carpeta y `validarAfirmaciones`:

| Función | Antes (2.0) | Notas |
|---|---|---|
| `AFIRMACIONES_CARPETA` | `TITULARES_CARPETA` | `'data/facts/'`. |
| `rutaAfirmaciones(mes)` | `rutaTitulares` | `` `data/facts/${mes}.json` `` si `MES_PATRON` lo acepta; si no, `null`. |
| `afirmacionesVacias(mes)` | `titularesVacios` | `{version: 1, mes, dias: []}`. |
| `validarAfirmaciones(obj, mes)` | `validarTitulares` | Claves exactas `version` (=== 1), `mes`, `dias`; `MES_PATRON`; `obj.mes === mes` si se pasa; al menos un día; cada día con claves exactas `n`, `tema`, `clave`, `textos`, `fichas`; `n` entero ≥ 1 y consecutivo dentro del archivo; `temaValido`; clave de 5 bytes; **`textos` y `fichas`: 5 cadenas `/^[A-Za-z0-9+/]{683}=$/` cada uno** (en la 2.0, las fichas eran de 1368). No descifra nada. |
| `afirmacionesDelDia(datos, lanzamiento, fechaISO)` | `titularesDelDia` | → `{n, fecha, tema, clave, textos, fichas} \| null`. |
| `afirmacionesDeNumero(datos, lanzamiento, n)` | `titularesDeNumero` | Modo prueba. |
| `afirmacionesDelMes(meses, mes)` | `titularesDelMes` | |
| `cargarAfirmaciones(fechaISO, pedir = fetch)` | `cargarTitulares` | Pide solo `rutaAfirmaciones(mesDeFecha(fechaISO))`; 404 → `afirmacionesVacias(mes)`. |
| `cargarAfirmacionesPrueba(lanzamiento, pedir = fetch)` | `cargarTitularesPrueba` | Sondeo en serie de 4.7.2. |

**Modo prueba** [2.0, D-110, D-117]:

| Función | Tipo | Notas |
|---|---|---|
| `diasDePrueba(calendario, meses)` | pura | [2.1] → `[{n, temaImagenes, temaAfirmaciones}]` (antes `temaTitulares`), ordenado por `n`, con la unión de los `n` del calendario y de todos los meses; usa `validarAfirmaciones`. El resto, como en la 2.0. |
| `diaDePrueba(search, dias, nHoy)` | pura | Sin cambios. |

### 3.3 js/juego.js (agente-de-campo)

Siguen `MODOS`, `MODO_POR_DEFECTO`, `modoValido`, `VOTOS`, `corregir`, `contarAciertos`, `estadoDeCodigo`, `elegirVariante`, `mensajeFinal`, `recortarFicha`, `RETO_POR_DEFECTO`, `retoValido`, `retoDePrueba`, `OCULTA_MAX_MS`, `ocultacionEsFallo` y `medirOculta`. Cambios:

| Exportación | Tipo | Descripción |
|---|---|---|
| `RETOS` | constante | [2.1] `Object.freeze(['imagenes', 'afirmaciones'])` [D-121]. |
| `TECLAS` | constante | [2.1] `Object.freeze({imagenes: Object.freeze({r: 'autentica', i: 'generada'}), afirmaciones: Object.freeze({f: 'autentica', k: 'generada'})})` [D-122]. |
| `votoDeTecla(reto, tecla)` | pura | [2.1] El voto de `TECLAS[reto][tecla.toLowerCase()]`, o `null` si el reto no es válido, `tecla` no es una cadena de un carácter o no está en la tabla. main.js no la llama si hay Ctrl, Alt o Meta. |
| `teclaDeVoto(reto, voto)` | pura | [2.1] La tecla en mayúscula (`'R'`, `'I'`, `'F'`, `'K'`) para el `kbd` y `aria-keyshortcuts`; `null` si no hay. |
| `mensajesDelReto(reto, final)` | pura | [2.1, D-134] Devuelve el conjunto de mensajes finales del reto: `final.mensajes_afirmaciones` si `reto === 'afirmaciones'`, `final.mensajes` si `reto === 'imagenes'`, y `null` si el reto no es válido (`retoValido`) o `final` no es un objeto. No copia ni valida el array (lo comprueba el test de textos). Uso: `mensajeFinal(aciertos, mensajesDelReto(reto, TEXTOS.final))`. `mensajeFinal(aciertos, mensajes)` no cambia (lanza `RangeError` fuera de 0..5). |
| `estadoInicial({modo, reto})` | pura | Estado de 1.2 con `retos: {imagenes, afirmaciones}`. |
| `transicion(estado, evento)` | pura | Tabla 1.3. [2.1] Donde la 2.0 decía `'titulares'`, ahora `'afirmaciones'`. Eventos sin cambios (`VOLVIO {ocultoMs, indice}` incluido; `OCULTA` no existe). |

Detalles [2.1]:
- `VOTO` y `VOLVIO` (cuando es fallo) en Fact or Fake: `revelada = desofuscar(clave, n, indice)` y `ficha = desofuscarAclaracion(fichas[indice], clave, n, indice)`.
- `EMPEZAR` y `SIGUIENTE` en Fact or Fake: `texto = desofuscarAfirmacion(textos[indice], clave, n, indice)` (una cadena o `null`).
- `VOLVIO` devuelve el mismo objeto en Images, fuera de `caso/pregunta`, con `activo === false`, con `evento.indice !== estado.indice` o si `!ocultacionEsFallo(evento.ocultoMs)`.
- `CARGADO` recibe `retos` ya preparado por main.js: `{imagenes: {caso, jugado}, afirmaciones: {caso, jugado}}`.

### 3.4 js/temporizador.js

Sin cambios. Fact or Fake solo usa `esperarPintado` (para `PINTADA`).

### 3.5 js/almacen.js (agente-de-campo) [2.0, D-109]

Como en la 2.0, con [2.1] `afirmaciones` en lugar de `titulares` [D-121]:

| Función | Tipo | Descripción |
|---|---|---|
| `CLAVE`, `VERSION` | constantes | `'identifaiit.v3'` y `3` (sin cambio de versión: la v3 nunca se publicó). |
| `datosIniciales()` | pura | `{version: 3, ajustes: {modo: 'normal', reto: 'imagenes'}, retos: {imagenes: {partidas: {}, racha: 0, mejorRacha: 0}, afirmaciones: {partidas: {}, racha: 0, mejorRacha: 0}}}`. |
| `leer(almacen)` | efecto, nunca lanza | Lee solo `identifaiit.v3`; JSON inválido, `version !== 3` o estructura incompleta → datos iniciales (rellenando lo que falte; un `retos.titulares` que hubiera quedado de una prueba local se ignora y desaparece al guardar). |
| `guardar`, `leerConRespaldo`, `guardarConRespaldo`, `actualizar`, `crearAlmacenMemoria`, `conAjustes`, `partidaDe`, `registrarInicio`, `registrarPrueba`, `registrarFin`, `cerrarAbandonada`, `calcularRacha` | | Sin cambios de firma; `reto` es `imagenes` o `afirmaciones` (en Fact or Fake, `modo: null`). |

- Con un `reto` que no es `imagenes` ni `afirmaciones` (también `titulares`), las funciones devuelven `datos` sin cambios y `partidaDe` devuelve `null`; nunca lanzan.
- Nunca se guardan la verdad, el voto, la ficha, la afirmación, `tapada`, `motivo`, el tema, el mensaje final ni los instantes o duraciones de una ausencia.

### 3.6 js/compartir.js

Sin cambios de funciones. `textoCompartir({plantilla, n, nombreModo, resultados, racha, url})`: `nombreModo` es opcional (la plantilla de Fact or Fake no tiene `{modo}`). El mensaje final no entra en el texto compartido.

### 3.7 js/main.js (agente-de-campo)

Lo de la 1.3 y la 2.0, con [2.1] estos cambios (el `main.js` actual es aún el de la 1.3: la tarea 77 está pendiente):

1. **Arranque**: decidir previsualización y modo prueba; `leer()`; `estadoInicial({modo, reto})` con `ajustes` validados (en modo prueba, `reto = retoDePrueba(location.search) ?? RETO_POR_DEFECTO`); rellenar textos; marcar los radios; registrar los oyentes de bloqueo de copia en `#afirmacion`; cargar los datos:
   - **Juego normal y previsualización**: en paralelo, `cargarCalendario()` y `cargarAfirmaciones(hoy)` (fecha efectiva).
   - **Modo prueba**: primero `cargarCalendario()`; después `meses = await cargarAfirmacionesPrueba(lanzamiento)`; `dias = diasDePrueba(calendario, meses)`; `dia = diaDePrueba(location.search, dias, nHoy)`; archivo del día `afirmacionesDelMes(meses, mesDeNumero(lanzamiento, dia.n))`.
   - Si falla cualquier carga, `ERROR_CALENDARIO` (un 404 no es fallo).
2. **Caso de cada reto**: juego normal, `casoDelDia(calendario, hoy)` y `afirmacionesDelDia(datos, calendario.lanzamiento, hoy)`; modo prueba, `casoDeNumero` y `afirmacionesDeNumero(...)`. `cerrarAbandonada` de cada reto con partida `en_curso`; `jugado` = hay partida `terminada`. `CARGADO {retos, reto}`.
3. **`render`**: `data-reto` en `#app`; portada (lema común, estados, tema, modos o regla, racha, Start, pasos); en `caso`: textos y teclas de los votos según el reto (`teclaDeVoto`, 2.3); imagen y sobre, o `#afirmacion` (`estado.texto`) y `#caso-aviso` (solo en la pregunta de la prueba 1 de Fact or Fake); veredicto (sello, `data-verdad`, `afirmaciones.oculta` si `motivo === 'oculta'`, aclaración y detalles en Fact or Fake, confesión en Images); resultado (miniaturas o botones numerados, `#resultado-reto`, y `#resultado-mensaje` = `mensajeFinal(aciertos, mensajesDelReto(estado.reto, TEXTOS.final))` [D-134]); ya jugado (`#ya-jugado-reto`, modo oculto en Fact or Fake); `#sin-casos-texto`.
4. **Efectos**:
   - `ELEGIR_RETO` → `conAjustes({reto})` y guardar.
   - `EMPEZAR` en Fact or Fake → `sesion`, `registrarInicio(datos, 'afirmaciones', {fecha, n, modo: null, sesion})` y guardar **antes** de pintar la primera afirmación; comprobar la `sesion` (D-51).
   - Cada prueba de Fact or Fake: rellenar `#afirmacion-texto`, `await esperarPintado()` y, si sigue en la misma prueba y en `pregunta`, `PINTADA`. Tras `PINTADA` de la prueba 1, el anuncio de `afirmaciones.aviso_oculta`; se vacía en `SIGUIENTE`.
   - Tras cada veredicto (por `VOTO` o por `VOLVIO`) y al terminar, `registrarPrueba` y `registrarFin` con `estado.reto`.
   - `VOLVER_PORTADA` → recalcular los estados de la portada desde el almacén.
   - `MEDIANOCHE` → `iniciando` y repetir el punto 1 completo.
5. **Entrada**: delegación como en la 1.3, más `change` en `input[name=reto]` → `ELEGIR_RETO` y `volver-portada` → `VOLVER_PORTADA`. [2.1] Teclado: en `caso/pregunta`, si no hay Ctrl, Alt ni Meta, `voto = votoDeTecla(estado.reto, evento.key)` y, si no es `null`, `VOTO {voto}`; Enter como en la 1.3. Mientras `dialog#ficha` está abierto, ningún atajo del juego.
6. **`visibilitychange`** [D-115]: como en la 2.0 con `estado.reto === 'afirmaciones'` (variable de módulo `ausencia`, `medirOculta`, `VOLVIO {ocultoMs, indice}`, sin `setTimeout`, `blur`, `pagehide` ni `freeze`).
7. **Otras pestañas** [D-51]: por reto.
8. **Compartir**: `compartir.plantilla` con `nombreModo` (Images) o `compartir.plantilla_afirmaciones`, con la partida y la racha del reto mostrado.
9. **Previsualización** [D-68]: sin cambios; carga solo el mes de `?fecha=`.
10. **Modo prueba** [D-70, D-110, D-117]: `PRUEBAS_ABIERTAS` sin cambios; selector con `diasDePrueba(calendario, meses)` (opción con el tema del día; si los dos temas difieren, unidos por " / "); `abrir-prueba` navega a `?prueba=1&dia={n}&reto={estado.reto}`; almacenes en memoria.
11. **Ficha** [D-88, D-126]: `abrirFicha(i, {conImagen})` como en la 1.3 en Images; en Fact or Fake, solo desde `resultado`, rellena el diálogo según 2.3 descifrando en ese momento `desofuscarAfirmacion` y `desofuscarAclaracion`, sin guardarlos.
12. [2.1] **Sin enlaces**: Fact or Fake no tiene enlaces ni hace ninguna petición al responder.
