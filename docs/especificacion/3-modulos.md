# identifAI-it: especificación técnica, versión 1.3 · 3. Módulos JS

Parte de la especificación 1.3 (índice en `docs/ESPECIFICACION.md`) [D-91].

## 3. Módulos JS

Todos son módulos ES sin dependencias. Las funciones **puras** no tocan el DOM, `window`, `localStorage`, `Date.now()` ni `Math.random()` (salvo como valor por defecto de un parámetro `aleatorio` inyectable) y se prueban con `node --test`. `package.json` lleva `"type": "module"` [D-15]. `TextEncoder`, `TextDecoder`, `btoa` y `atob` son globales en el navegador y en Node 20, así que las funciones puras pueden usarlos.

Grafo de importaciones, sin ciclos:
- `main.js` importa todos los demás módulos. `almacen.js` y `juego.js` importan `diario.js`. `compartir.js`, `temporizador.js`, `diario.js` y `textos.js` no importan nada.
- Fuera del navegador:
  - `herramientas/temas.mjs` no importa nada.
  - `creditos.mjs` importa `../js/textos.js`.
  - `importar.mjs` importa `sharp`, `../js/diario.js` (`ofuscar`, `ofuscarFicha`, `FICHA_MAX_BYTES`, `sumarDias`, `fechaLocal`, `validarCalendario`), `../js/textos.js` (`TEXTOS.fichas`) [D-85], `./temas.mjs` y `./creditos.mjs`.
  - `validar.mjs` importa `sharp`, `../js/diario.js`, `../js/textos.js`, `./temas.mjs` y `./creditos.mjs`. Lee `js/main.js` como texto [D-71].

### 3.1 js/textos.js (cronista)

`export const TEXTOS = { ... }`. Claves exactas (las que llevan `{x}` son plantillas). Los cambios de la versión 1.3 van marcados con [1.3].

| Grupo | Claves |
|---|---|
| `portada` | `titulo`, `lema`, `elige_modo`. [1.3] `modo_investigador` ("Investigador"), `modo_normal` ("Normal"), `modo_perro` ("Perro de presa"), `desc_investigador` ("Sin límite de tiempo"), `desc_normal` ("3 segundos de observación"), `desc_perro` ("1 segundo de observación") [D-81]. También `boton_empezar`, `etiqueta_caso` ("Caso nº {n}"), `tema` ("Caso del día: {tema}"), `racha` ("Racha: {racha}") y `enlace_creditos` ("Créditos"). **Se eliminan** `modo_facil`, `modo_medio`, `modo_dificil`, `desc_facil`, `desc_medio`, `desc_dificil` y `boton_como_jugar`. |
| `como_jugar` | `titulo` (texto del `summary`, por ejemplo "Cómo jugar") y `pasos` (exactamente 4 cadenas de 80 caracteres como máximo; entre ellas: un solo intento al día sea cual sea el modo, y que al acabarse el tiempo de observación la prueba se sella pero se puede responder sin prisa). [1.3] **Se elimina** `boton_entendido` [D-83]. |
| `cargando` | `texto` |
| `cuenta_atras` | `aviso` |
| `partida` | `caso_del_dia`, `etiqueta_prueba` ("Prueba {i}/5"), `marcador` ("Aciertos: {aciertos}"), `alt_prueba` ("Prueba {i} de 5"), `boton_autentica` ("REAL"), `boton_generada` ("IA"), `sello_autentica` ("REAL"), `sello_generada` ("IA"), `quedan` ("Quedan {s} s"), `boton_siguiente`, `boton_ver_resultado`. [1.3] `sobre_texto` (rótulo del sobre, 16 caracteres como máximo, por ejemplo "PRUEBA SELLADA") y `sobre_anuncio` (para lectores de pantalla, por ejemplo "Tiempo de observación agotado. La prueba está sellada: responde cuando quieras.") [D-90]. |
| `veredictos` | `acierto` (≥ 4) y `fallo` (≥ 4), arrays. [1.3] **Se eliminan** `tiempo` y `oculta` [D-79]. |
| `confesion` | [1.3] `titulo` ("Confesión del sospechoso", exacto), `leer_entera` ("Leer entera"), `no_disponible` (si la ficha no se puede descifrar, por ejemplo "La confesión se ha traspapelado.") [D-88]. |
| `ficha` | [1.3] `cerrar` ("Cerrar") [D-88]. |
| `fichas` | [1.3] **No las usa main.js**: las lee `importar.mjs` para generar las fichas de datos [D-85]. `autentica` ("Fotografía real", exacto, pedido por el usuario) y `sin_prompt` (ficha de una generada sin `.txt`, por ejemplo "El sospechoso se niega a confesar.", DP-27). Cambiarlas no afecta al calendario ya publicado hasta que se reimporta. |
| `final` | `alt_prueba` ("Prueba {n}", ahora para `#ficha-img`), `mensajes` (exactamente 6), `aciertos` ("{aciertos}/5"), `racha` ("Racha: {racha}"), `mejor_racha` ("Mejor racha: {racha}"), `era` ("Era: {sello}", ahora en `#ficha-era`), `cuadros_etiqueta` ("{aciertos} aciertos de 5", solo en ya jugado), `estado_prueba` ("Prueba {i}: {estado}") y `estados`, [1.3] exactamente `{acierto: 'acierto', fallo: 'fallo'}` [D-89]. |
| `ya_jugado` | `titulo`, `texto`, `proximo` ("Próximo caso en {tiempo}"), `modo` ("Modo: {modo}") |
| `sin_casos` | `texto` |
| `errores` | `calendario`, `imagenes`, `boton_reintentar` |
| `avisos` | `sin_guardar`, `otra_pestana`, `previsualizacion` ("Previsualización del {fecha}: no se guarda nada.") |
| `prueba` | `etiqueta`, `opcion` ("Día {n}: {tema}"), `boton` [D-70] |
| `compartir` | `boton`, `copiado`, `manual`, `plantilla` (exactamente la nueva de la sección 7) [D-80] |
| `creditos` | sin cambios: `titulo_pagina`, `titulo`, `intro`, `tipografias`, `imagenes`, `imagenes_intro`, `sin_imagenes`, `ver_licencia`, `volver` |

Reglas:
- Ninguna cadena supera los 90 caracteres, salvo `fichas.*` y los 4 `como_jugar.pasos`, que tienen 80 como máximo cada uno.
- Para que quepan sin deslizar [D-84]: `portada.modo_*` 14 caracteres como máximo; `portada.desc_*` 26; `partida.sobre_texto` 16; `confesion.titulo` 30; `confesion.leer_entera` y `ficha.cerrar` 16; `final.mensajes` 90.
- Valores exactos que el cronista no puede cambiar por su cuenta: `portada.modo_investigador`, `modo_normal` y `modo_perro`; `confesion.titulo`; `fichas.autentica`; además de los ya fijados en 1.2 (`portada.enlace_creditos`, `creditos.titulo`, `creditos.volver`, `creditos.sin_imagenes`, `portada.tema`, `partida.caso_del_dia`, `avisos.previsualizacion` y `prueba.opcion`).
- `fichas.autentica` y `fichas.sin_prompt`: no vacías, sin espacios en los extremos y de `FICHA_MAX_BYTES` (510) bytes UTF-8 como máximo. Deben ser **distintas entre sí** y ninguna puede coincidir con un prompt real (`validar` las usa para comprobar la coherencia con la clave, 4.4.3).
- `final.estados` tiene las mismas claves que los valores de `estadoDeCodigo`.
- Ningún texto menciona "tiempo agotado = fallo", "pestaña oculta" ni los modos antiguos.

### 3.2 js/diario.js (agente-de-campo): fechas, calendario, clave, fichas e imágenes

Sin cambios respecto a la 1.2: `fechaLocal`, `sumarDias`, `diasEntre`, `numeroCaso`, `msHastaMedianoche`, `formatearCuentaAtras`, `temaValido`, `rutaPrueba`, `ofuscar`, `desofuscar`, `HOSTS_LOCALES`, `fechaPrevisualizada`, `pruebaActiva`, `cargarCalendario` y `precargar` (firmas y comportamiento de la 1.2). Cambios y novedades [D-86, D-87]:

| Función | Tipo | Parámetros → retorno | Notas |
|---|---|---|---|
| `validarCalendario(obj)` | pura | → `boolean` | Estructura de 4.2: `version === 3`; claves exactas del objeto (`version`, `lanzamiento`, `dias`) y de cada día (`n`, `fecha`, `tema`, `pruebas`, `clave`, `fichas`); `temaValido`; 5 ids distintos; clave de 5 bytes; `fichas` es un array de exactamente 5 cadenas que cumplen `/^[A-Za-z0-9+/]{683}=$/` (684 caracteres, 512 bytes). **Rechaza la versión 2 y la 1.** No descifra las fichas ni comprueba el lanzamiento [D-50]. |
| `casoDelDia(calendario, fechaISO)` | pura | → `{n, fecha, tema, pruebas, clave, fichas}` o `null` | Como en 1.2, con `fichas: dia.fichas` tal cual (sin descifrar). |
| `desofuscar(clave, n, indice)` | pura | → `0 \| 1` | Sin cambios. Solo se llama al corregir (`VOTO`) y al abrir la ficha de una miniatura en `resultado`. Ya no hay `AGOTADO` ni `OCULTA` que corrijan. |
| `FICHA_BLOQUE` | constante | | `512` (bytes del bloque de una ficha). |
| `FICHA_MAX_BYTES` | constante | | `510` (bytes UTF-8 máximos del texto: el bloque menos 2 de longitud). |
| `flujoFicha(clave, n, indice)` | pura | `string, number, number` → `Uint8Array(512)` | Flujo de bytes del 4.3.1. Determinista. |
| `ofuscarFicha(texto, clave, n, indice, aleatorio = Math.random)` | pura (con `aleatorio` inyectado) | → `string` de 684 caracteres base64 | 4.3.1. Lanza `RangeError` si `texto` ocupa más de `FICHA_MAX_BYTES` bytes UTF-8, y `TypeError` si no es una cadena. La usa `herramientas/importar.mjs` (el importador recorta antes con `normalizarFicha`). |
| `desofuscarFicha(ficha, clave, n, indice)` | pura, nunca lanza | → `string` o `null` | 4.3.1. `null` si `ficha` no cumple el patrón, si la longitud descifrada pasa de 510 o si los bytes no son UTF-8 válido. Solo se llama en `transicion` al procesar `VOTO`, en main.js al abrir la ficha de una miniatura de `resultado` y en `validar.mjs`. |
| `diasDePrueba(calendario)` | pura | → `[{n, fecha, tema}]` | Sin cambios: nunca copia `pruebas`, `clave` ni `fichas` [D-70]. |
| `diaDePrueba(search, dias, hoyISO)` | pura | | Sin cambios. |

### 3.3 js/juego.js (agente-de-campo): reglas y máquina de estados

| Exportación | Tipo | Descripción |
|---|---|---|
| `MODOS` | constante | `{ investigador: null, normal: 3000, perro: 1000 }` (ms de observación por prueba; `null` = sin límite) [D-81]. Se elige `null` y no `Infinity` porque se serializa igual en JSON, se comprueba con `=== null` sin aritmética y evita crear un temporizador que nunca acaba. Congelado con `Object.freeze`. |
| `MODO_POR_DEFECTO` | constante | `'normal'`. |
| `modoValido(modo)` | pura | `true` si `modo` es una clave propia de `MODOS` (`Object.hasOwn`). |
| `VOTOS` | constante | `{ autentica: 0, generada: 1 }`. |
| `corregir(voto, verdad)` | pura | → `'A' \| 'F'`. |
| `contarAciertos(resultados)` | pura | Número de `A`. |
| `estadoDeCodigo(codigo)` | pura | `'A'` → `'acierto'`, `'F'` → `'fallo'`; cualquier otro (`'-'`, `'T'`, `'O'`…) → `null`. |
| `elegirVariante(lista, aleatorio = Math.random)` | pura | Sin cambios. |
| `mensajeFinal(aciertos, mensajes)` | pura | Sin cambios. |
| `recortarFicha(texto, max = 90)` | pura | → `{texto, recortada}` [D-88]. (1) `t = texto.replace(/\s+/gu, ' ').trim()`. (2) Si `[...t].length <= max`: `{texto: t, recortada: false}`. (3) Si no: toma los primeros `max - 1` puntos de código; si contienen un espacio después de la primera posición, corta en el último espacio; quita los espacios finales y añade `…` (U+2026): `{texto, recortada: true}`. Nunca parte un punto de código, así que no rompe emojis. Con `null` o una cadena que no lo sea, devuelve `{texto: '', recortada: false}`. |
| `estadoInicial({modo})` | pura | Estado de 1.2 con `pantalla: 'iniciando'`, `tema: null`, `fichas: null`, `tapada: false`, `ficha: null` y `modo` si `modoValido(modo)`, o `MODO_POR_DEFECTO` si no. Ya no recibe `vistoComoJugar`. |
| `transicion(estado, evento)` | pura | Implementa la tabla 1.3. Nunca muta `estado`: devuelve uno nuevo, o el mismo objeto si el evento no aplica. Eventos: `CARGADO {caso, partidaHoy}`, `ERROR_CALENDARIO`, `ELEGIR_MODO {modo}`, `EMPEZAR`, `PRECARGA_OK`, `PRECARGA_ERROR`, `REINTENTAR`, `FIN_CUENTA {fecha}`, `PINTADA`, `VOTO {voto}`, `AGOTADO`, `SIGUIENTE`, `OTRA_PESTANA`, `MEDIANOCHE`. **Se eliminan** `VER_COMO_JUGAR`, `ENTENDIDO` y `OCULTA`: si llegan, se devuelve el mismo objeto. |

`VOTO` obtiene la verdad con `desofuscar(clave, n, indice)` y la ficha con `desofuscarFicha(fichas[indice], clave, n, indice)` (`null` si `fichas` es `null`), y las guarda en `revelada` y `ficha`. `AGOTADO` no descifra nada.

`juego.js` no cambia con la previsualización ni con el modo prueba.

### 3.4 js/temporizador.js (agente-de-campo)

| Función | Tipo | Descripción |
|---|---|---|
| `crearTemporizador({duracionMs, alTick, alAgotar, reloj = () => performance.now(), pedirFrame = requestAnimationFrame, cancelarFrame = cancelAnimationFrame})` | fábrica | Devuelve `{iniciar(), detener(), activo(), comprobar()}`. [1.3] Lanza `TypeError` si `duracionMs` no es un número finito mayor que 0 (con `null`, en modo `investigador`, main.js no crea temporizador) [D-81]. |
| `.iniciar()` | efecto | Guarda `t0 = reloj()` y pide frames. En cada frame, `transcurrido = reloj() - t0` y `alTick(restanteMs, fraccion)`. Si `transcurrido >= duracionMs`, llama a `alAgotar()` **una sola vez** y se para. Sin `setInterval` ni `setTimeout`. El tiempo es de reloj: si los frames se detienen (pestaña oculta), al reanudarse el primer frame ve todo el tiempo transcurrido y agota si toca [D-78]. |
| `.comprobar()` | efecto | [1.3] Hace en el acto lo mismo que un frame, sin esperar a `pedirFrame`: si está activo y `reloj() - t0 >= duracionMs`, llama a `alAgotar()` (una sola vez en total) y se para. main.js la llama al volver la pestaña a visible para sellar antes del primer pintado [D-78]. Sin efecto si no está activo. |
| `.detener()` | efecto | Cancela el frame pendiente y devuelve los ms transcurridos. Después nunca se llama a `alAgotar`. Idempotente. |
| `.activo()` | | `true` entre `iniciar()` y el agotamiento o `detener()`. |
| `esperarPintado(pedirFrame = requestAnimationFrame)` | async | Resuelve en el **segundo** frame [D-08]. Con la pestaña oculta los frames esperan, así que `PINTADA` llega cuando la imagen se pinta de verdad. |
| `fraccionRestante`, `nivelTemporizador`, `segundosRestantes` | puras | Sin cambios. |

Secuencia de una prueba en main.js:
1. Insertar la `<img>` precargada (sin `hidden`); `#prueba-sobre` con `hidden`.
2. `await esperarPintado()`.
3. Si sigue en la misma prueba y en fase `pregunta`, despachar `PINTADA`.
4. Si `MODOS[modo] !== null`, crear el temporizador con esa duración e iniciarlo.

La cuenta atrás inicial usa el mismo temporizador con `duracionMs: 3000`.

### 3.5 js/almacen.js (agente-de-campo) [D-82]

| Función | Tipo | Descripción |
|---|---|---|
| `CLAVE` | constante | `'identifaiit.v2'`. |
| `VERSION` | constante | `2`. |
| `datosIniciales()` | pura | `{version: 2, ajustes: {modo: 'normal'}, partidas: {}, racha: 0, mejorRacha: 0}`. Sin `vistoComoJugar`. |
| `leer(almacen = globalThis.localStorage)` | efecto, nunca lanza | → `{datos, disponible}`. Prueba a escribir y borrar `'identifaiit.prueba'`. Lee **solo** `identifaiit.v2`: si el JSON es inválido o `version !== 2`, devuelve los datos iniciales. **No** lee, no migra y no borra `identifaiit.v1` (DP-28). |
| `guardar`, `leerConRespaldo`, `guardarConRespaldo`, `actualizar`, `crearAlmacenMemoria`, `partidaDe`, `conAjustes` | | Sin cambios de firma ni de comportamiento (usan `CLAVE`). |
| `registrarInicio(datos, {fecha, n, modo, sesion})` | pura | Sin cambios (`resultados: '-----'`). |
| `registrarPrueba(datos, fecha, indice, codigo)` | pura | `codigo` es `'A'` o `'F'`. |
| `registrarFin(datos, fecha, hoyISO, sesion?)` | pura | Sin cambios. |
| `cerrarAbandonada(datos, fecha, hoyISO)` | pura | [1.3] Cambia los `-` por **`F`** y aplica `registrarFin` [D-79]. |
| `calcularRacha(partidas, hoyISO)` | pura | Sin cambios [D-25]. |

Todo guardado relee y aplica solo su cambio (`actualizar`); una partida `terminada` no se modifica nunca; sessionStorage solo como respaldo [D-51]. Nunca se guardan la verdad, el voto, la ficha ni `tapada`. main.js valida el modo de los ajustes con `modoValido` y, si no vale (por ejemplo, un `'medio'` escrito a mano), usa `MODO_POR_DEFECTO`.

### 3.6 js/compartir.js (agente-de-campo)

| Función | Tipo | Descripción |
|---|---|---|
| `CUADROS` | constante | `{A: '🟩', F: '🟥'}` [D-80]. |
| `rellenar(plantilla, valores)` | pura | Sin cambios. |
| `cuadros(resultados)` | pura | Un emoji por carácter: `🟩` para `A` y `🟥` para cualquier otro. `'AAFAF'` → `'🟩🟩🟥🟩🟥'`. |
| `textoCompartir({plantilla, n, nombreModo, resultados, racha, url})` | pura | Sección 7. Calcula los aciertos contando las `A` [D-47]. |
| `urlDelJuego(ubicacion = location)` | pura | Sin cambios (sin `search`). |
| `compartir(texto, nav = navigator)` | async, nunca lanza | Sin cambios (sección 7). |

### 3.7 js/main.js (agente-de-campo)

No exporta nada. Responsabilidades (cambios de la 1.3 marcados con [1.3]):

1. **Arranque**:
   - Decidir previsualización (punto 11) y modo prueba (punto 12).
   - `leer()` del almacén y `estadoInicial({modo})`, con el modo validado con `modoValido`.
   - Rellenar todos los `[data-texto]`.
   - [1.3] Crear los 4 `li` de `#como-jugar-pasos`.
   - Marcar el radio del modo.
   - `cargarCalendario()`. Si la partida de hoy está `en_curso`, `cerrarAbandonada` (pendientes → `F`) y guardar.
   - Despachar `CARGADO` o `ERROR_CALENDARIO`.
2. **`despachar(evento)`**: único sitio donde se asigna el estado; si cambió, efectos y `render`.
3. **`render(estado)`**:
   - `hidden` de las secciones; `data-pantalla`, `data-modo`, `data-fase` y [1.3] `data-tapada`; etiquetas, marcador y tema.
   - [1.3] Sellado: con `estado.tapada`, la `img.prueba-img` lleva `hidden` y `#prueba-sobre` no; en cualquier otro caso, al revés.
   - `#veredicto`: `data-estado`, sello, texto y [1.3] confesión solo en fase veredicto. En fase pregunta, `#veredicto-sello`, `#veredicto-texto` y `#veredicto-confesion-texto` vacíos, sin `data-estado` y botón `leer-confesion` con `hidden`.
   - Resultado: aciertos, mensaje, [1.3] 5 miniaturas (marcado de 2.3) y rachas.
   - Ya jugado.
4. **Efectos**:
   - Al entrar en `cargando`, precarga.
   - Cuenta atrás.
   - En `FIN_CUENTA`: `sesion`, `registrarInicio` y guardar **antes** de la primera imagen.
   - Cada prueba: secuencia de 3.4. [1.3] Vaciar `#temporizador-anuncio` y `--restante: 1`. En `investigador` no hay temporizador ni anuncios.
   - [1.3] `alAgotar` → despachar `AGOTADO`; si cambia el estado (`tapada`), escribir `partida.sobre_anuncio` en `#temporizador-anuncio` (en `normal` y `perro`).
   - `alTick`: cinta y `data-nivel`; "Quedan N s" **solo en `normal`** [D-17, D-81].
   - Al votar, detener el temporizador si existe.
   - Tras cada veredicto, `registrarPrueba` y guardar.
   - Al entrar en `resultado`, `registrarFin` y guardar.
   - [1.3] Al despachar `EMPEZAR`, `#como-jugar.open = false`.
5. **Entrada**:
   - Clic en `[data-voto]` y `[data-accion]` (delegación en `#app` con `closest`) y `change` en `input[name=modo]` → `ELEGIR_MODO`.
   - Teclado (`keydown` en `document`, ignorando `e.repeat` y Ctrl, Alt o Meta). [1.3] **Si `#ficha` está abierto, no se procesa ningún atajo.**
   - `r`/`R` → `VOTO autentica` e `i`/`I` → `VOTO generada`, solo en `caso/pregunta` (también tapada).
   - `Enter` → `SIGUIENTE`, solo en `caso/veredicto` y si el foco no está en un `button`, un enlace ni un `summary`.
   - [1.3] `leer-confesion` → abrir la ficha de la prueba actual (punto 13) sin imagen. `ver-ficha` → abrir la ficha de `data-prueba` con imagen. `cerrar-ficha` → `dialog.close()`.
6. **`visibilitychange`** [1.3, D-78]: **no se despacha ningún evento al ocultarse** y el temporizador de la prueba no se detiene.
   - Al volver a visible: si hay temporizador de prueba activo, `temporizador.comprobar()` (puede sellar en el acto).
   - En `cuenta-atras`, reiniciarla desde 3 (DP-29).
   - En `portada`, `ya-jugado` o `sin-casos`, si la fecha efectiva cambió, `MEDIANOCHE`.
   - Las relecturas del almacén de D-51 se hacen en `portada`, `ya-jugado`, `cuenta-atras` y `caso`.
7. **Medianoche**: sin cambios.
8. **Otras pestañas** [D-51]: sin cambios, salvo que ya no existe `como-jugar`.
9. **Compartir**: `textoCompartir` con `nombreModo = TEXTOS.portada['modo_' + modo]` de la partida mostrada; aviso o `#compartir-manual` como en 1.2.
10. **Errores**: sin cambios.
11. **Previsualización local** [D-68]: sin cambios. Los almacenes en memoria parten de `datosIniciales()` (modo `normal`). Nunca se toca `identifaiit.v2`, `identifaiit.v1` ni `identifaiit.prueba` del navegador.
12. **Modo prueba** [D-70, D-71]: sin cambios (interruptor `const PRUEBAS_ABIERTAS = true;` en la primera línea tras los `import`, selector, aviso y almacenes en memoria). El selector solo usa `n`, `fecha` y `tema`.
13. **Ficha** [1.3, D-88, D-89]: `abrirFicha(i, {conImagen})`, que solo puede ejecutarse en `caso/veredicto` (con `i = estado.indice`) o en `resultado`.
    - **Texto**: en veredicto, `estado.ficha`; en resultado, `desofuscarFicha(estado.fichas[i], estado.clave, estado.n, i)`, calculado en ese momento y no guardado.
    - **Verdad**: en veredicto, `estado.revelada`; en resultado, `desofuscar(...)`.
    - **Relleno**, todo con `textContent`:
      - `#ficha-titulo`: `rellenar(final.estado_prueba, {i: i + 1, estado: final.estados[estadoDeCodigo(resultados[i])]})`.
      - `#ficha-era`: `rellenar(final.era, {sello})`.
      - `#ficha-texto`: el texto completo, o `confesion.no_disponible` si es `null`.
      - Con imagen: `#ficha-img.src = rutaPrueba(pruebas[i])`, `alt = rellenar(final.alt_prueba, {n: i + 1})` y sin `hidden`.
    - Recordar el botón que la abrió, `showModal()` y foco en `#ficha-cerrar`.
    - En el evento `close`: vaciar el diálogo (2.3) y devolver el foco al botón.
    - Fuera de esas dos pantallas, el diálogo no se abre. Si cambia la pantalla con el diálogo abierto (por ejemplo, `OTRA_PESTANA`), main.js lo cierra antes de `render`.
