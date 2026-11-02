# identifAI-it: especificación técnica, versión 3.2 · 12. Jugar casos anteriores desde el juego

Parte de la especificación **3.2** (índice en `docs/ESPECIFICACION.md`) [D-220]. Recoge la función pedida por el usuario el 2026-11-02 (rama `feature/casos-anteriores`): **jugar desde el juego los casos de días ya terminados**, eligiéndolos en un desplegable que sale de la etiqueta "Case #N · tema" de la portada. Los datos **no cambian de formato**: el calendario y `data/facts/` siguen como están. El **tema no es secreto** (D-231): sigue en claro en los datos; lo que no puede filtrarse de hoy ni de días futuros son las respuestas, los prompts, las verdades y las afirmaciones, que ya van ofuscados.

**Manda sobre** (donde difieran): 0 (glosario: "Caso del día", "Mes de datos"), 1.1 (`portada`), 1.2 (estado), 1.3 (`CARGADO`, `EMPEZAR`, `MEDIANOCHE`, eventos nuevos), 2.2 (`data-accion`, atributos nuevos), 2.3 (`#portada-dia`, `#ya-jugado-texto`, `#resultado-rachas`, diálogo nuevo), 2.6 (R8 y regla nueva R22), 3.2, 3.3, 3.5, 3.6, 3.7, 4.7.2 (qué mes se carga), 5 (puntos 3 y 9), 6, 7 y 4.24 (compartir), 10.3 (parámetros que se conservan) y 10.12 (privacidad, cookies y preguntas frecuentes). Lo que aquí no se cita sigue igual. La sección 11 (hora de España) sigue mandando en todo lo que sea "qué día es hoy".

Requisito previo **P10** (usuario): aplicar en `CLAUDE.md` el texto de 12.15 antes de delegar las tareas 142 a 146 (aplicado el 2026-11-02, D-231). `CLAUDE.md` decía "el juego solo carga el del mes en curso", "Un solo intento al día por reto" y que la portada muestra "Case #N con el tema", y prevalece sobre la spec.

## 12.1 Reglas [D-221]

- **Qué se puede jugar**: cualquier día `n` con `1 ≤ n < nHoy`, siendo `nHoy = numeroDelDia(hoy(), lanzamiento)` y `hoy()` la fecha efectiva de 11.3 (Madrid). Es decir, solo días **ya terminados según la hora de España**, la misma regla que el archivo publicado (11.5.1). Hoy (`n = nHoy`) se juega como siempre; los días futuros no se pueden abrir de ninguna forma.
- **Una vez por reto y caso**: cada reto de cada día anterior admite un solo intento, común a los tres modos de Images y a los dos idiomas. Si ese reto ya se jugó **en su día** (hay partida en `identifaiit.v3` con esa fecha, `terminada` o `en_curso`), cuenta como jugado y abre `ya-jugado` con ese resultado. El intento se gasta igual que hoy: Images al terminar la cuenta atrás (`FIN_CUENTA`), Fact or Fake al pulsar "Open the case" (`EMPEZAR`).
- **No cuentan**: una partida de un caso anterior **no modifica** `racha`, `mejorRacha` ni `partidas` de `identifaiit.v3`; se guarda en una clave aparte (12.7). La racha que muestran el resultado y `ya-jugado` del día de hoy no cambia por jugar casos anteriores.
- **Mismas reglas de juego**: modos (Investigator, Normal 3 s, Bloodhound 1 s), precarga, temporizador desde que la imagen está pintada, sobre sellado sin fallo, ausencia de más de 3 s en Fact or Fake (fallo), bloqueo de copia, fichas, tablón de resultado y diálogo de ficha. Nada de esto cambia por estar en un caso anterior.
- **Modo archivo**: así se llama, en esta spec, a tener abierto en el juego un caso anterior (`estado.archivo === true`). El nombre visible es "archive" / "archivo"; no confundir con las **páginas** del archivo (`/en/archive/`, `/es/archivo/`), que no cambian (12.5.6).
- **Previsualización** (`?fecha=` en local): funciona igual, con `nHoy` de la fecha fija y almacenes en memoria. **Modo prueba** (cerrado, `PRUEBAS_ABIERTAS = false`): si se reabriera, el desplegable de casos no se muestra (lo sustituye el `select` de prueba) y `?caso=` se ignora.

## 12.2 Datos: de dónde salen y qué llega al cliente [D-223, D-231]

### 12.2.1 Situación actual y regla

- El juego **ya descarga el calendario entero** (`data/calendario.json`, todos los días importados, también los futuros) y el archivo de `data/facts/` del mes en curso (todos los días de ese mes, también los futuros). Respuestas, prompts, fichas, afirmaciones y aclaraciones de esos días van ofuscados (freno casual aceptado en D-22). **El tema de cada día va en claro** en los dos archivos y **seguirá así** (D-231): el tema no es secreto, se anuncia cada día en la portada y en el archivo.
- Para jugar un caso anterior **no hace falta ningún archivo nuevo ni ningún cambio de formato**: Images sale del calendario que ya se carga, y Fact or Fake del archivo mensual del mes de ese caso (`data/facts/{mesDeNumero(lanzamiento, n)}.json`), que ya existe y ya es público. `data/calendario.json` y `data/facts/` siguen en sus versiones actuales; no hay migración.
- **Regla**: lo que no puede filtrarse de hoy ni de días futuros son **respuestas, prompts, verdades y afirmaciones** (y fichas y aclaraciones). Para casos anteriores, el contenido ofuscado solo se descifra **del caso que se está jugando** y **solo si `n < nHoy`**; la lista y la portada no descifran nada, solo leen temas en claro y solo de días `n ≤ nHoy`.

### 12.2.2 Qué se carga en cada caso

| Situación | Peticiones (con `{cache: 'no-cache'}`, como siempre) |
|---|---|
| Hoy (como hasta ahora) | `data/calendario.json` y `data/facts/{mesDeFecha(hoy())}.json`, en paralelo. |
| Caso anterior `n` | Primero `data/calendario.json` (hace falta `lanzamiento` para saber el mes); después `data/facts/{mesDeNumero(lanzamiento, n)}.json`. En serie. 404 del mes = Fact or Fake sin caso ese día (no es error), como en 4.7.2. |
| Abrir la lista | **Ninguna** petición: se construye con el calendario y el mes ya cargados y con los almacenes. |
| Imágenes de un caso anterior | Las 5 de `casos/` de ese día, precargadas al empezar Images (como hoy). |

- El juego nunca carga más de un mes de `data/facts/` a la vez (fuera del modo prueba). Si el caso anterior es del mes en curso, el archivo es el mismo que el de hoy.

## 12.3 Algoritmo: número pedido y lista [D-223, D-225, D-232]

1. `hoy()` y `nHoy` como en 11.3: `nHoy = numeroDelDia(hoy(), lanzamiento)` (sin lanzamiento, `null`).
2. **Número pedido** (`nPedido`): al arrancar, `casoPedido(location.search, nHoy)` (12.6.1); después, el que elija el jugador en la lista (`ELEGIR_CASO`). Si es `null` → hoy.
3. Con `nPedido` válido: `fechaCaso = fechaDelDia(lanzamiento, nPedido)`; Images = `casoDeNumero(calendario, nPedido)`; Fact or Fake = `afirmacionesDeNumero(mes, lanzamiento, nPedido)`. Si **los dos** son `null` (día sin datos), se trata como pedido no válido: se quita `caso` de la dirección y se carga hoy.
4. **`?caso=` inválido, hoy o futuro → hoy**: `casoPedido` devuelve `null` y main.js quita el parámetro con `history.replaceState` (para que recargar o compartir la dirección no lo arrastre). No hay pantalla de error ni aviso.
5. **Lista**: `listaDeCasos({calendario, afirmaciones: mesCargado, nHoy})` (12.6.1) devuelve las filas de `nHoy` a `1` (hoy arriba). Para cada fila main.js añade el estado de cada reto con `estadoEnLista` (12.6.2) leyendo los dos almacenes. La lista solo contiene días `n ≤ nHoy` y **no descifra nada** (el tema va en claro; no se leen claves, fichas, textos ni pruebas). Del caso elegido solo se descifra, al jugarlo, lo de ese caso y solo si `n < nHoy` (o es el de hoy, como siempre).
6. Hoy sin caso (`sin-casos`): no hay portada ni lista (D-233). Un `?caso=n` válido sí abre ese caso anterior aunque hoy no haya caso.

## 12.4 Estados y eventos (cambios en 1.2 y 1.3) [D-221, D-225, D-228]

**Estado** (1.2): un campo nuevo, `archivo: false` (`true` cuando el caso cargado es anterior a hoy). `n`, `tema`, `pruebas`, `textos`, `clave`, `fichas` y `retos[r].caso` son los del caso cargado, sea de hoy o anterior. `jugado` significa "el intento de ese reto **para ese caso** está gastado". `nHoy`, `nPedido` y el estado de la lista (abierta o no) viven en main.js, fuera del estado (como `dialog#ficha`, D-88).

**Transiciones** (filas nuevas o cambiadas de la tabla de 1.3):

| Estado actual | Evento | Condición | Estado siguiente / efecto |
|---|---|---|---|
| `iniciando` | `CARGADO` `{retos, reto, archivo}` | | Como en 1.3; además `archivo = (archivo === true)`. |
| `portada` | `ELEGIR_CASO` `{n}` | `n` entero ≥ 1, o `null` | `iniciando` (mismo reinicio que `MEDIANOCHE`; `idioma` y `modo` se conservan). main.js cierra la lista, fija `nPedido` (`null` si `n === nHoy`), actualiza la dirección y el historial (12.9) y vuelve a cargar (12.2.2). Si `n` es el caso ya cargado, main.js no despacha nada y solo cierra la lista. |
| `portada` | `ELEGIR_CASO` | `n` no válido | el mismo objeto. |
| `instrucciones` | `EMPEZAR` `{fecha}` | | Igual que en 1.3. main.js pasa `fecha = retos[reto].caso.fecha` en modo archivo y `hoy()` si no. |
| `cuenta-atras` | `FIN_CUENTA` `{fecha}` | | Igual; misma regla para `fecha`. |
| `portada`, `instrucciones`, `ya-jugado`, `sin-casos` | `MEDIANOCHE` | | Igual que en 1.3 (`iniciando`). main.js conserva `nPedido`: un caso anterior sigue siéndolo al cambiar el día. |
| cualquiera salvo `portada` | `ELEGIR_CASO` | | el mismo objeto. |

- `VOLVER_PORTADA` desde `resultado` o `ya-jugado` en modo archivo vuelve a la portada **del caso anterior** (para jugar el otro reto); se vuelve a hoy con "Back to today" o eligiendo la fila "Today" de la lista.
- `CAMBIAR_IDIOMA` no cambia `archivo` ni el caso cargado.
- `OTRA_PESTANA` funciona igual en modo archivo, con la partida del caso cargado (12.7).
- La función pura `transicion` no conoce `nHoy`: main.js solo despacha `ELEGIR_CASO` con números que vienen de la lista (todos `≤ nHoy`).

**Diagrama** (añadido a 1.4):
```
portada ──ELEGIR_CASO {n} (lista o "Back to today")──► iniciando ──CARGADO {archivo}──► portada (del caso n)
portada (modo archivo) ──ABRIR_RETO──► instrucciones / ya-jugado ── … igual que hoy … ──► resultado ──VOLVER_PORTADA──► portada (del caso n)
```

## 12.5 Contrato HTML/CSS [D-226]

Todo lo que no se cita aquí sigue como en 2.3 y 10.5. Las clases, ids y `data-*` nuevos no contienen palabras prohibidas (0.1). Los textos salen de `TEXTOS[idioma]` (12.11).

### 12.5.1 Etiqueta de la portada como desplegable (sustituye a `div#portada-dia` de 2.3)

```html
<div id="portada-dia">
  <button type="button" id="portada-dia-boton" data-accion="abrir-casos"
          aria-haspopup="dialog" aria-expanded="false" aria-controls="casos">
    <span id="portada-caso"></span><span id="portada-tema"></span>
    <span class="solo-lectores" data-texto="casos.elegir">[[casos.elegir]]</span>
    <span class="portada-dia-flecha" aria-hidden="true"></span>
  </button>
  <p id="portada-archivo" hidden>
    <span id="portada-archivo-texto"></span>
    <button type="button" class="boton-hoy" data-accion="volver-hoy"><span class="boton-texto" data-texto="casos.volver_hoy">[[casos.volver_hoy]]</span></button>
  </p>
</div>
```
- `#portada-caso` y `#portada-tema` pasan de `p` a `span` dentro del botón, con el mismo contenido (`rellenar(portada.etiqueta_caso, {n})` y el tema; CSS sigue anteponiendo "· " al tema). Se ve "CASE #3 · DOGS ▾" (mayúsculas como hoy).
- `.portada-dia-flecha`: flecha hacia abajo (▾) **dibujada con CSS** (bordes o `clip-path`), no con el carácter, para no depender de los glifos de las fuentes alojadas (D-165). Gira 180° con `#portada-dia-boton[aria-expanded="true"]`.
- El botón mide al menos 44 px de alto y tiene foco visible. `aria-expanded` lo mantiene main.js (`true` con la lista abierta). Su nombre accesible es su texto: "Case #3 · Dogs Choose a case" (o el español).
- **`#portada-archivo`** (solo en modo archivo; `hidden` en los demás): aviso discreto `#portada-archivo-texto` = `rellenar(casos.aviso, {fecha: formatearFecha(fechaCaso, idioma)})` ("Archive case · Nov 3, 2026") y el botón "Back to today" (`volver-hoy` → `ELEGIR_CASO {n: nHoy}`), con área táctil de 44 x 44 px como mínimo. Letra pequeña y color secundario (contraste AA), sin cinta ni recuadro llamativo.
- **El selector de idioma no cambia** de sitio, tamaño ni contenido, y **no se pone nada nuevo debajo de él**: el aviso va en `#portada-dia`, en la columna de la etiqueta.
- `#app` lleva `data-archivo="si|no"` (main.js), solo para ajustes de estilo; nunca para mostrar u ocultar contenido con respuesta.
- Modo prueba (si se reabriera): `#portada-dia-boton` lleva `hidden` y el `select#selector-prueba-dia` se inserta en `#portada-dia`.

### 12.5.2 Lista de casos: `dialog#casos` (nuevo; al final de `<body>`, junto a `dialog#ficha`)

```html
<dialog id="casos" aria-labelledby="casos-titulo">
  <div class="casos-caja">
    <div class="casos-cabecera">
      <h2 id="casos-titulo" data-texto="casos.titulo">[[casos.titulo]]</h2>
      <button type="button" id="casos-cerrar" data-accion="cerrar-casos" data-texto-aria="casos.cerrar"><span class="casos-cerrar-aspa" aria-hidden="true"></span></button>
    </div>
    <ol id="casos-lista"></ol>
    <p id="casos-vacia" data-texto="casos.vacia" hidden>[[casos.vacia]]</p>
  </div>
</dialog>
```

**Filas** (las crea main.js al abrir, una por elemento de `listaDeCasos`, en ese orden; solo `textContent`):
```html
<li>
  <button type="button" class="caso-fila" data-accion="elegir-caso" data-caso="3" aria-current="true">
    <span class="caso-fila-cabecera">
      <span class="caso-fila-numero">Case #3</span>
      <span class="caso-fila-hoy">Today</span>          <!-- solo en la fila de hoy -->
      <span class="caso-fila-fecha">Nov 3, 2026</span>
    </span>
    <span class="caso-fila-tema">Dogs</span>            <!-- vacío y hidden si el tema es null -->
    <span class="caso-fila-estados">
      <span class="caso-fila-estado" data-reto-fila="imagenes" data-situacion="jugado">Images: ✓ 4/5</span>
      <span class="caso-fila-estado" data-reto-fila="afirmaciones" data-situacion="pendiente">Fact or Fake: Not played</span>
    </span>
  </button>
</li>
```
- `data-caso`: el número `n` en decimal. `aria-current="true"` solo en la fila del caso que muestra la portada.
- `.caso-fila-numero` = `rellenar(portada.etiqueta_caso, {n})`; `.caso-fila-hoy` = `casos.hoy` ("Today" / "Hoy"); `.caso-fila-fecha` = `formatearFecha(fecha, idioma)`; `.caso-fila-tema` = el tema en el idioma activo.
- `.caso-fila-estado` = `rellenar(casos.estado_reto, {reto: portada.reto_{r}, estado})` con `estado` = `casos.estado_jugado` (`{aciertos}`, "✓ 4/5"), `casos.estado_en_curso`, `casos.estado_sin_jugar` o `casos.estado_sin_caso`, según `estadoEnLista` y la disponibilidad del reto (12.3). `data-situacion` = `jugado | curso | pendiente | sin-caso` (solo estilo). Los textos de las filas usan `--fuente-cuerpo` (la del sistema, que tiene "✓").
- Sin `data-verdad`, sin `data-estado` y sin nada que dependa de la respuesta de ninguna prueba. Las filas solo contienen número, fecha, tema y estado del jugador.
- Con una sola fila (día 1), `#casos-vacia` visible ("No earlier cases yet.").

**Comportamiento** (main.js):
- **Abrir**: clic en `#portada-dia-boton` (o Enter / Espacio) → construir filas → `showModal()` → `aria-expanded="true"` → foco en la fila con `aria-current` (si no, la primera). Solo en `portada`.
- **Foco atrapado**: lo da `showModal()` (el resto de la página queda inerte). Tab y Mayús+Tab recorren cerrar y filas sin salir. Flechas arriba y abajo mueven el foco entre filas; Inicio y Fin, a la primera y a la última.
- **Cerrar**: Escape (evento `cancel`), botón `#casos-cerrar`, o clic/toque **fuera** (evento `click` con `target === dialog#casos`: el `dialog` no tiene relleno y todo su contenido va dentro de `.casos-caja`, así que solo el fondo da ese `target`). Al cerrar: `close()`, `aria-expanded="false"`, vaciar `#casos-lista` y foco a `#portada-dia-boton`.
- **Elegir**: clic en una fila → si es el caso cargado, solo cerrar; si no, `ELEGIR_CASO {n}` (cierra antes de despachar).
- **Cambio de contexto con la lista abierta** (`MEDIANOCHE`, `OTRA_PESTANA` que cambie de pantalla, cualquier render que no sea `portada`): se cierra antes de pintar, como `dialog#ficha`, sin devolver el foco al botón (lo pone la pantalla nueva, D-41).
- **Nunca** hay anuncios ni huecos de anuncio dentro de `dialog#casos`.

### 12.5.3 Composición de la lista: regla R22 (nueva, 2.6)

- **Lista pequeña** (ordenador): con ancho ≥ 600 px **y** alto ≥ 500 px. El diálogo se coloca justo **debajo** del botón, alineado a su borde izquierdo: main.js pone en `dialog#casos` las propiedades CSS `--casos-arriba` (`rect.bottom + 4px`) y `--casos-izquierda` (`rect.left`, recortado para que el diálogo quepa con 16 px de margen) al abrir y en cada `resize`. Ancho `min(28rem, 100vw − 32px)`; alto máximo `min(60dvh, 100dvh − var(--casos-arriba) − 16px)`. `::backdrop` transparente. Filas compactas, pero de 44 px de alto como mínimo.
- **Hoja inferior** (móvil, pantallas estrechas o bajas): con ancho < 600 px **o** alto < 500 px (360 x 640, 390 x 844, 640 x 360). El diálogo ocupa **todo el ancho**, pegado abajo (`inset: auto 0 0 0`, `margin: 0`, `max-width: none`), esquinas superiores redondeadas, alto máximo `85dvh`, `::backdrop` oscurecido. Sube desde abajo (transformación de unos 200 ms); con `prefers-reduced-motion: reduce`, sin animación. Filas y botón cerrar de **44 px como mínimo** (alto y ancho del cerrar), letra ≥ 16 px. `padding-bottom` con `env(safe-area-inset-bottom)`.
- **Desplazamiento**: solo `#casos-lista` se desplaza (`overflow-y: auto`, `overscroll-behavior: contain`); la cabecera de la lista queda fija. **La página nunca hace scroll** (ni con la lista abierta ni con cientos de filas).
- **R8 ampliada** (portada): la etiqueta-botón con su flecha y, en modo archivo, `#portada-archivo` caben sin deslizar en los cinco tamaños garantizados, en los dos idiomas. Orden de compresión permitido: el aviso puede ir en la misma fila que la etiqueta (ancho ≥ 600 px) o en una línea propia debajo (más estrecho), con letra no menor de 14 px; si aun así no cabe, se aplica la compresión de R8 (ilustración de las tarjetas hasta 56 px). Nunca se recorta la etiqueta ni el tema (si el tema no cabe en una línea, puede ir en dos).

### 12.5.4 Otras pantallas en modo archivo

| Pantalla | Cambio |
|---|---|
| `portada` | Tarjetas: `.reto-estado` con los estados de siempre leyendo la partida del caso cargado (12.7); sin caso, `portada.estado_sin_caso_archivo` ("No case that day") en vez de `estado_sin_caso`. |
| `instrucciones` | `#instrucciones-membrete` = `rellenar(instrucciones.membrete_archivo, {n, tema})` ("Archive · Case #3 · Dogs"). La firma no cambia (D-233). |
| `caso` | `#caso-tema` = `rellenar(partida.caso_archivo, {tema})` ("Archive case: Dogs") en vez de `partida.caso_del_dia`. Nada más cambia. |
| `resultado` | `#resultado-reto`: la parte del número es `rellenar(casos.etiqueta_archivo, {n})` ("Case #3 (archive)"). En `#resultado-rachas`, `hidden` en las dos `p.cifra` de racha, en `#resultado-proximo` y en `#resultado-nuevo-caso`; visible el nuevo `<p id="resultado-archivo" data-texto="resultado.nota_archivo" hidden>` (primer hijo de `#resultado-rachas`): "Archive cases don't count toward your streak." |
| `ya-jugado` | `#ya-jugado-texto` **pierde `data-texto`** y lo pone main.js en cada render: `ya_jugado.texto` hoy, `ya_jugado.texto_archivo` en modo archivo ("You've already filed this case."). `#ya-jugado-reto` con `casos.etiqueta_archivo` como en el resultado. `#ya-jugado-racha` y `#ya-jugado-cuenta-atras` con `hidden`; visible el nuevo `<p id="ya-jugado-archivo" data-texto="resultado.nota_archivo" hidden>` (justo antes de `#ya-jugado-racha`). |
| `dialog#ficha` | Sin cambios. |

- El hueco `#anuncio-resultado` sigue igual (vacío y `hidden`).
- **Ids, clases y atributos nuevos** (2.2 y 10.5.4): `#portada-dia-boton`, `.portada-dia-flecha`, `#portada-archivo`, `#portada-archivo-texto`, `.boton-hoy`, `dialog#casos`, `.casos-caja`, `.casos-cabecera`, `#casos-titulo`, `#casos-cerrar`, `.casos-cerrar-aspa`, `#casos-lista`, `#casos-vacia`, `.caso-fila`, `.caso-fila-cabecera`, `.caso-fila-numero`, `.caso-fila-hoy`, `.caso-fila-fecha`, `.caso-fila-tema`, `.caso-fila-estados`, `.caso-fila-estado`, `#resultado-archivo`, `#ya-jugado-archivo`; `data-accion` = `abrir-casos`, `cerrar-casos`, `elegir-caso`, `volver-hoy`; `data-caso` (número), `data-reto-fila` (`imagenes|afirmaciones`), `data-situacion` (`jugado|curso|pendiente|sin-caso`), `data-archivo` en `#app` (`si|no`).

### 12.5.5 Páginas del archivo

`/en/archive/`, `/es/archivo/`, sus páginas `case-N/` / `caso-N/` y el enlace "Archive" / "Archivo" del pie de la portada **no cambian** (ni contenido, ni direcciones, ni plantillas). `npm run paginas` debe producir exactamente los mismos archivos del archivo de casos (criterio 385).

## 12.6 Módulos JS [D-223 a D-227, D-232]

Ningún archivo nuevo en `js/`. Las funciones puras cumplen la regla de 3 (sin DOM, `location`, `Date.now()`…).

### 12.6.1 js/diario.js (agente-de-campo)

| Exportación | Tipo | Parámetros → retorno | Descripción |
|---|---|---|---|
| `casoPedido(search, nHoy)` | pura | `string, number \| null` → `number \| null` | `URLSearchParams(search).get('caso')` (el primero si hay varios). Devuelve el número si cumple `/^[1-9]\d{0,5}$/` y `n < nHoy`, con `nHoy` entero; si no, `null` (también falta de parámetro, `0`, `03`, `-1`, `3.0`, `1e2`, `''`, hoy, futuro, `nHoy` `null` o < 2). |
| `listaDeCasos({calendario, afirmaciones, nHoy})` | pura | → `Array<{n, fecha, hoy, tema, imagenes, afirmaciones}>` | De `nHoy` a 1 (vacío si `nHoy` no es entero ≥ 1 o no hay lanzamiento). `fecha = fechaDelDia(lanzamiento, n)`; `hoy = (n === nHoy)`; `tema` = `{en, es}` en claro del calendario o, si el calendario no tiene ese día, del mes `afirmaciones` si lo tiene; si no, `null`. `imagenes`: el calendario tiene ese `n`. `afirmaciones`: `true` si el mes cargado lo tiene, `false` si el mes cargado es el de ese día y no lo tiene, `null` si es de otro mes (desconocido). **Nunca incluye un día `n > nHoy`**, no descifra nada y no devuelve claves, fichas, textos ni pruebas. |
| `urlConCaso(href, n)` | pura, nunca lanza | `string, number \| null` → `string \| null` | La misma URL con `caso=n` (sustituido o añadido al final) o, con `n === null`, sin `caso`; conserva los demás parámetros en su orden y el `hash`. `null` si `href` no es una URL. |

### 12.6.2 js/juego.js (agente-de-campo)

| Exportación | Cambio |
|---|---|
| `estadoInicial(...)` | Añade `archivo: false`. |
| `transicion(estado, evento)` | `CARGADO {archivo}` y `ELEGIR_CASO {n}` de 12.4. |
| `estadoEnLista(partidaDia, partidaArchivo)` | **Nueva**, pura. `→ {situacion, aciertos}`: con `partidaDia` (de `identifaiit.v3`) manda ella; si no, `partidaArchivo`. `terminada` → `{situacion: 'jugado', aciertos}`; `en_curso` → `'curso'` (en `identifaiit.v3` de una fecha pasada, también cuenta como jugado: `{situacion: 'jugado', aciertos}` con sus `-` como fallos); ninguna → `{situacion: 'pendiente', aciertos: null}`. Entradas no válidas → `'pendiente'`. |

### 12.6.3 js/almacen.js (agente-de-campo)

Clave nueva **`identifaiit.archivo.v1`** (12.7). Exportaciones nuevas:

| Exportación | Tipo | Descripción |
|---|---|---|
| `CLAVE_ARCHIVO`, `VERSION_ARCHIVO` | constantes | `'identifaiit.archivo.v1'`, `1`. |
| `archivoInicial()` | pura | `{version: 1, retos: {imagenes: {partidas: {}}, afirmaciones: {partidas: {}}}}`. |
| `leerArchivo(almacen)`, `leerArchivoConRespaldo(local, sesion)`, `guardarArchivoConRespaldo(datos, local, sesion)`, `actualizarArchivo(cambio, enMemoria, local, sesion)` | efecto, nunca lanzan | Como `leer`, `leerConRespaldo`, `guardarConRespaldo` y `actualizar`, con `CLAVE_ARCHIVO` en `localStorage` y en `sessionStorage`. Datos de otra versión o mal formados → `archivoInicial()`; partidas que no tengan la forma de 6 se descartan una a una. |
| `terminarSinRacha(datos, reto, fecha, sesion)` | pura | Marca la partida `terminada` y recalcula `aciertos`; **no** escribe `racha` ni `mejorRacha`. Misma regla de `editable` que `registrarFin`. |
| `cerrarAbandonadaArchivo(datos, reto, fecha)` | pura | Pendientes → `F` y `terminarSinRacha`. |
| `partidaDeCaso(datosDia, datosArchivo, reto, fecha)` | pura | `{partida, origen: 'dia'}` si `identifaiit.v3` tiene esa fecha; si no, `{partida, origen: 'archivo'}` si la tiene el archivo; si no, `null`. |

- `registrarInicio` y `registrarPrueba` sirven tal cual sobre los datos del archivo (misma forma `retos[r].partidas`).
- **Nada de lo anterior escribe en `identifaiit.v3`.** `normalizar`, `calcularRacha`, `registrarFin` y `cerrarAbandonada` no cambian.

### 12.6.4 js/compartir.js (agente-de-campo)

- `textoCompartir` no cambia (las plantillas de archivo no tienen `{racha}`).
- **Nueva** `urlDeCaso(base, n)`, pura: `` `${base}?caso=${n}` `` (con `base` = `urlDelJuego()`, que ya no lleva `search`). `n` entero ≥ 1; si no, devuelve `base`.

### 12.6.5 js/main.js (agente-de-campo)

1. **Arranque**: tras decidir idioma (10.3/10.4.4), lee `nPedido` provisional de la URL; carga (12.2.2); calcula `nHoy` y `casoPedido(location.search, nHoy)`; si la URL lleva `caso` y el resultado es `null` (o el día no tiene datos), `history.replaceState({caso: null}, '', urlConCaso(location.href, null))`; si es un número válido, inserta la entrada de hoy antes (`replaceState` a la dirección sin `caso` y `pushState` a `?caso=N`, 12.9). Registra el oyente `popstate` (12.9).
2. **`cargarDia()`** generalizada: con `nPedido`, casos por número y mes del caso; `fechaCarga = hoy()` siempre (para detectar la medianoche); `jugado` y partidas abandonadas: en modo archivo, `partidaDeCaso`; si la partida es del archivo y está `en_curso`, `cerrarAbandonadaArchivo` (TP-01 vale igual); una partida de `identifaiit.v3` de fecha pasada **nunca** se cierra ni se modifica desde el modo archivo. Despacha `CARGADO {retos, reto, archivo: nPedido !== null}`.
3. **Guardado** en modo archivo: `registrarInicio` (en `FIN_CUENTA` / `EMPEZAR`), `registrarPrueba` y `terminarSinRacha` sobre el almacén del archivo con `actualizarArchivo`. Hoy, como siempre. `ajustes.modo` y `ajustes.reto` se siguen guardando en `identifaiit.v3` (son preferencias, no progreso).
4. **Render**: `data-archivo` en `#app`; portada (12.5.1, estados de tarjeta con `partidaDeCaso`); lista (12.5.2); `instrucciones`, `caso`, `resultado` y `ya-jugado` (12.5.4). En modo archivo, el bucle de 1 s no pinta cuenta atrás.
5. **Entrada**: `abrir-casos`, `cerrar-casos`, `elegir-caso` (`ELEGIR_CASO {n: Number(data-caso)}`), `volver-hoy` (`ELEGIR_CASO {n: nHoy}`); `cancel` y `click` de `dialog#casos`; flechas, Inicio y Fin dentro de la lista. Al despachar `ELEGIR_CASO`, el historial se actualiza según 12.9 (D-232): `pushState` al pasar de hoy a un caso anterior; `replaceState` entre anteriores y al volver a hoy.
6. **Otras pestañas**: el oyente `storage` atiende también `CLAVE_ARCHIVO`; `sincronizar()` relee los dos almacenes y compara la partida del caso cargado con `partidaDeCaso`.
7. **Compartir** (12.8) con `partidaDeCaso` del caso cargado.
8. **Medianoche** (12.9).

### 12.6.6 Herramientas (archivero)

- Los datos no cambian de formato, así que `importar.mjs`, `importar-afirmaciones.mjs`, `lanzamiento.mjs`, `temas.mjs`, `afirmaciones.mjs` y `paginas.mjs` **no cambian** (el calendario y `data/facts/` siguen en sus versiones actuales, con el tema en claro).
- `validar.mjs`: revisa que la plantilla `juego.html` y las páginas generadas con las partes nuevas (12.5) no contienen palabras prohibidas en ids, clases ni `data-*` (0.1, 12.10); lo demás sigue igual.
- `paginas.mjs` genera la plantilla y los textos nuevos (tarea 146); las páginas del archivo salen idénticas.

## 12.7 Almacenamiento [D-224]

Clave nueva **`identifaiit.archivo.v1`** (el progreso de hoy sigue en `identifaiit.v3`, que **no cambia** ni de forma ni de versión):

```json
{
  "version": 1,
  "retos": {
    "imagenes": {
      "partidas": {
        "2026-11-03": { "n": 3, "modo": "perro", "estado": "terminada", "resultados": "AAFAA", "aciertos": 4, "sesion": "q2w8e4r1" }
      }
    },
    "afirmaciones": { "partidas": {} }
  }
}
```

- **Clave de la partida**: la fecha ISO del caso (`fechaDelDia(lanzamiento, n)`), no la del día en que se juega. Forma de cada partida: la de 6.
- **Por qué una clave aparte** y no un campo dentro de `identifaiit.v3`: (1) `calcularRacha` recorre `partidas` por fecha y contaría los días jugados desde el archivo; (2) el `normalizar` actual descarta campos desconocidos, así que una pestaña con el JS anterior borraría el progreso del archivo al guardar; (3) así es imposible, por construcción, tocar la racha o el historial del día.
- **Una vez por reto**: un reto de un caso anterior está jugado si `partidaDeCaso` devuelve algo (de cualquiera de los dos almacenes).
- **Si `localStorage` falla**: el mismo respaldo que `identifaiit.v3` (copia en `sessionStorage` con la misma clave, si no memoria) y el mismo `#aviso-almacen`; sin aviso propio.
- **Previsualización** (y modo prueba): almacén en memoria, como `identifaiit.v3`.
- Sin migración (clave nueva). Ni este almacén ni ninguna caché guardan datos de `data/`.
- La privacidad y las cookies pasan a listar cuatro claves (12.11).

## 12.8 Compartir [D-227]

Plantillas **exactas** nuevas (`TEXTOS[idioma].compartir`):

```js
// en
plantilla_archivo:              'identifAI-it Images #{caso} (archive)\nMode: {modo}\n{aciertos}/5 {cuadros}\n{url}'
plantilla_afirmaciones_archivo: 'identifAI-it Fact or Fake #{caso} (archive)\n{aciertos}/5 {cuadros}\n{url}'
// es
plantilla_archivo:              'identifAI-it Imágenes #{caso} (archivo)\nModo: {modo}\n{aciertos}/5 {cuadros}\n{url}'
plantilla_afirmaciones_archivo: 'identifAI-it ¿Dato o Bulo? #{caso} (archivo)\n{aciertos}/5 {cuadros}\n{url}'
```

- **Sin línea de racha** (no cuenta para ella). `{url}` = `urlDeCaso(urlDelJuego(), n)`, p. ej. `https://identifaiit.com/es/?caso=1`, para que quien lo reciba abra el mismo caso (D-233). LF, sin espacios ni saltos al final. No revela qué pruebas eran IA, falsas o bulos (mismas reglas de 7 y 4.24).
- **Qué plantilla se usa**: si la partida del caso cargado es `origen: 'archivo'`, las de arriba; si es `origen: 'dia'` (se jugó en su día y se ve desde el archivo), las de siempre, con `racha = calcularRacha(partidas de identifaiit.v3, fecha de esa partida)` y la URL sin `caso` (D-233).
- `navigator.share` → portapapeles → `#compartir-manual`, sin cambios.

Ejemplos (`AAFAF`, caso 1, modo `perro`):
```
identifAI-it Images #1 (archive)
Mode: Bloodhound
3/5 🟩🟩🟥🟩🟥
https://identifaiit.com/en/?caso=1
```
```
identifAI-it ¿Dato o Bulo? #1 (archivo)
3/5 🟩🟩🟥🟩🟥
https://identifaiit.com/es/?caso=1
```

## 12.9 Dirección, idioma y cambio de día [D-225, D-228]

- **`?caso=N`**: abre el caso `N` si `1 ≤ N < nHoy` (12.3). Inválido, hoy o futuro → hoy y el parámetro se quita. La dirección y el historial siguen la decisión D-232 (antes DP-113, resuelta): **estando en un caso anterior (`?caso=N`), Atrás vuelve al caso de hoy; solo sale del juego si ya se está en el de hoy.**
  - `history.state` es `{caso: n | null}` (`null` = hoy).
  - **Elegir un caso anterior desde hoy** → `history.pushState({caso: n}, '', urlConCaso(location.href, n))` (entrada nueva, la de hoy queda debajo). **Elegir otro anterior estando ya en uno** → `history.replaceState` (no apila: el historial se queda en [hoy, caso], y Atrás siempre lleva a hoy). **"Back to today" o la fila "Today"** → `history.replaceState({caso: null}, '', urlConCaso(location.href, null))`, sin acumular entradas (la entrada de hoy que queda debajo lleva al mismo caso: `popstate` no hace nada).
  - **Entrada directa con `?caso=N` válido** (enlace compartido, recarga): main.js inserta antes la entrada de hoy: `history.replaceState({caso: null}, '', urlConCaso(location.href, null))` seguido de `history.pushState({caso: n}, '', urlConCaso(location.href, n))`, para que Atrás lleve a hoy. Con `?caso=` no válido solo se hace el `replaceState` que quita el parámetro (12.3).
  - **`popstate`**: main.js toma `n = event.state?.caso ?? casoPedido(location.search, nHoy)`; si ya es el caso cargado, no hace nada; si no, reinicia la carga de ese caso sin recargar la página, conservando `idioma` y `modo` (mismo reinicio que `MEDIANOCHE`), y cierra la lista si estaba abierta. Con una partida en curso (`cuenta-atras` o `caso`), `popstate` no abandona la partida: main.js restaura la dirección con `history.pushState` del caso cargado.
- **Raíz** (`/?caso=3`): `destinoRaiz` ya conserva `search` → `es/?caso=3` o `en/?caso=3`. 10.3 añade `?caso=` a los parámetros que se conservan en todas las redirecciones.
- **`?lang=`**: `urlDeIdioma` ya conserva los demás parámetros: `/en/?lang=es&caso=3` → `location.replace('/es/?caso=3')`; `/es/?lang=es&caso=3` → `replaceState` a `/es/?caso=3`.
- **Selector EN | ES sin recargar** (10.4.3): en modo archivo cambia a `/es/?caso=3` (o `/en/…`) con `replaceState` (no añade entrada; si `popstate` vuelve después a una entrada con la dirección del otro idioma, main.js la reescribe con `replaceState` a la del idioma activo), conserva el caso, `archivo`, la pantalla (`portada` o `instrucciones`) y el modo, y repinta etiqueta, tema, aviso (fecha en el formato del idioma), tarjetas y membrete. Con la lista abierta el selector no es alcanzable (página inerte); la lista se pinta en el idioma vigente cada vez que se abre.
- **Cambio de día** (11.4, sin cambios en el vigía): `revisarDia()` sigue comparando `hoy()` con `fechaCarga`.
  - En `portada`, `instrucciones`, `ya-jugado` o `sin-casos` → `MEDIANOCHE`: si la lista está abierta, se cierra; se recarga **conservando `nPedido`**. En modo hoy, la portada pasa al caso nuevo; en modo archivo, sigue en el mismo caso anterior. En los dos, `nHoy` sube y la lista gana una fila: el día que acaba de terminar pasa a jugable (si no se jugó en su día).
  - En `resultado` **de hoy**, como en 11.4 (`#resultado-nuevo-caso`). En `resultado` **de un caso anterior**, nada (no hay cuenta atrás ni aviso; "Back" ya despacha `MEDIANOCHE` si cambió el día).
  - En `cargando`, `cuenta-atras`, `caso` y `error`, nada, como siempre.
  - Una partida de **hoy** que cruza la medianoche se guarda en `identifaiit.v3` con la fecha de su inicio (D-51); al acabar, ese día ya aparece en la lista con su resultado y no se puede volver a jugar desde el archivo.
- **Cuenta atrás**: solo en `resultado` y `ya-jugado` **de hoy** (11.4). En modo archivo, oculta (D-233).
- **Hora del dispositivo** (D-18): adelantar el reloj adelanta `nHoy` y deja abrir como "anteriores" días que aún no han terminado en Madrid; es la misma vía que ya existía para jugar días futuros como "hoy" (riesgo R43, aceptado).
- **Buscadores**: `/en/?caso=N` y `/es/?caso=N` llevan el mismo `canonical` (`/en/`, `/es/`) que la carga normal; no hace falta `noindex`.

## 12.10 Anti-trampas [D-223, D-226, D-231]

- Ningún id, clase, `data-*` (nombre o valor), `alt` ni texto de ruta nuevo contiene palabras prohibidas (lista de 12.5.4; `validar` revisa la plantilla y el test de 12.12 el DOM creado por main.js).
- `data-verdad` sigue limitado a `#veredicto` y las miniaturas del resultado, tras responder; la lista y la portada no lo usan.
- En modo archivo, igual que hoy: la respuesta, la ficha y el prompt no existen en el DOM hasta responder; durante la partida solo está en el DOM la afirmación actual; el tablón vacía las pruebas al salir.
- **Nada de hoy en adelante se filtra**: el cliente solo descifra verdades, fichas, prompts, afirmaciones y aclaraciones **del caso que se está jugando**, prueba a prueba, como hoy, y en un caso anterior solo si `n < nHoy`. La lista y la portada no descifran nada: la lista solo muestra días `n ≤ nHoy` con su tema en claro. El tema no es secreto (D-231): sigue en claro en `data/` y no se ofusca.
- La lista no lleva respuestas ni resultados de nadie más que el jugador; el texto compartido no lleva el tema.
- Un caso anterior puede consultarse en las páginas del archivo antes de jugarlo (las respuestas son públicas): por eso no cuenta para la racha (riesgo R44).

## 12.11 Textos (cronista) [D-229]

Grupo nuevo **`casos`** y claves nuevas, en `en` y `es` con el mismo árbol (3.1). Propuestas (las aprueba el usuario), salvo las marcadas **exactas**:

| Clave | `en` | `es` | Límite |
|---|---|---|---|
| `casos.elegir` | Choose a case | Elegir caso | 30 |
| `casos.titulo` | Case files | Casos | 30 |
| `casos.cerrar` | Close | Cerrar | 20 |
| `casos.hoy` | Today | Hoy | 12 |
| `casos.estado_reto` | {reto}: {estado} | {reto}: {estado} | 40 rellenado |
| `casos.estado_jugado` | **✓ {aciertos}/5** (exacto) | **✓ {aciertos}/5** (exacto) | 12 |
| `casos.estado_sin_jugar` | Not played | Sin jugar | 16 |
| `casos.estado_en_curso` | In progress | En curso | 16 |
| `casos.estado_sin_caso` | No case | Sin caso | 16 |
| `casos.aviso` | Archive case · {fecha} | Caso del archivo · {fecha} | 40 rellenado |
| `casos.volver_hoy` | Back to today | Volver a hoy | 20 |
| `casos.vacia` | No earlier cases yet. | Aún no hay casos anteriores. | 60 |
| `casos.etiqueta_archivo` | Case #{n} (archive) | Caso n.º {n} (archivo) | 30 |
| `portada.estado_sin_caso_archivo` | No case that day | Sin caso ese día | el de `portada.estado_sin_caso` |
| `instrucciones.membrete_archivo` | Archive · Case #{n} · {tema} | Archivo · Caso n.º {n} · {tema} | 70 |
| `partida.caso_archivo` | Archive case: {tema} | Caso del archivo: {tema} | el de `partida.caso_del_dia` |
| `resultado.nota_archivo` | Archive cases don't count toward your streak. | Los casos del archivo no cuentan para la racha. | 60 |
| `ya_jugado.texto_archivo` | You've already filed this case. | Ya cerraste este caso. | 90 |
| `compartir.plantilla_archivo`, `compartir.plantilla_afirmaciones_archivo` | **exactas** (12.8) | **exactas** (12.8) | excepción de las plantillas |

- `{reto}` en `casos.estado_reto` = `portada.reto_imagenes` / `portada.reto_afirmaciones`; `{estado}`, el más largo de los cuatro estados (relleno de 3.1).
- Ningún texto nuevo dice que el caso anterior "cuenta" para nada ni promete que se pueda repetir.
- **Contenido** (`herramientas/contenido/{en,es}/`): `privacidad.html` y `cookies.html` añaden `identifaiit.archivo.v1` ("tus intentos y resultados de casos anteriores jugados desde el juego" / "your tries and results for earlier cases played in the game"); `preguntas.html` añade la pregunta "¿Puedo jugar casos anteriores?" (sí, desde la etiqueta del caso en la portada, una vez por reto, sin contar para la racha; en el archivo están las respuestas). Las demás páginas y el archivo no cambian. Tras editar: `npm run paginas`.

## 12.12 Criterios de aceptación (8.51)

### diario.js (node --test)

358. `casoPedido`: `('?caso=3', 5)` → `3`; `('?caso=1', 2)` → `1`; `('?caso=5', 5)` (hoy) → `null`; `('?caso=6', 5)` y `('?caso=999999', 5)` → `null`; `'?caso=0'`, `'?caso=-1'`, `'?caso=03'`, `'?caso=3.0'`, `'?caso=1e2'`, `'?caso=abc'`, `'?caso='`, `'?CASO=3'`, `''` → `null`; `('?caso=3&caso=4', 5)` → `3`; `('?lang=es&caso=2', 5)` → `2`; `nHoy` `null`, `1`, `NaN` → `null`; `'?caso=1234567'` → `null`.
359. `listaDeCasos` con un calendario de prueba de 14 días (temas conocidos) y un mes de `data/facts/` con los días 1–14: con `nHoy = 5` devuelve exactamente 5 filas, `n` = 5, 4, 3, 2, 1, la primera con `hoy: true` y las demás `false`, `fecha` = `2026-11-05` … `2026-11-01` (lanzamiento `2026-11-01`), temas en claro en los dos idiomas; `JSON.stringify` del resultado **no contiene** el tema (en ningún idioma) de los días 6 a 14 ni ninguna `clave`, ficha o texto. Con `nHoy = 20` (más allá del calendario) hay 20 filas y las 15–20 llevan `tema: null`, `imagenes: false`; con el mes de noviembre cargado y el día 7 ausente, `afirmaciones: false` en la 7; con un mes de otro mes, `afirmaciones: null`. `nHoy` `0`, `-3`, `null` o sin lanzamiento → `[]`.
360. `urlConCaso`: `('https://identifaiit.com/es/?lang=es#x', 3)` → `'https://identifaiit.com/es/?lang=es&caso=3#x'`; `('https://identifaiit.com/en/?caso=2&fecha=2026-11-04', 5)` → `…/en/?caso=5&fecha=2026-11-04`; `('https://identifaiit.com/en/?caso=2', null)` → `'https://identifaiit.com/en/'`; `('no es url', 3)` → `null`.

### juego.js (node --test)

361. `estadoInicial().archivo === false`; `CARGADO {…, archivo: true}` → `archivo: true`; sin `archivo` → `false`. `ELEGIR_CASO {n: 3}` en `portada` → `pantalla: 'iniciando'` con `idioma` y `modo` conservados; `ELEGIR_CASO {n: 0}`, `{n: 'x'}` → el mismo objeto; `ELEGIR_CASO` en `instrucciones`, `caso`, `resultado`, `ya-jugado` → el mismo objeto. `CAMBIAR_IDIOMA` en `portada` con `archivo: true` conserva `archivo`, `n` y `tema`.
362. `estadoEnLista`: (terminada `AAFAA`, —) → `{situacion: 'jugado', aciertos: 4}`; (—, terminada `FFFFF`) → `jugado`, 0; (en_curso `AF---` de v3, —) → `jugado`, 1; (—, en_curso) → `curso`; (—, —) → `pendiente`; (terminada v3, terminada archivo) → la de v3.

### almacen.js y compartir.js (node --test)

363. Almacén del archivo con almacenes falsos: `archivoInicial()` exacto; `leerArchivo` con basura, otra versión o JSON inválido → `archivoInicial()`; `registrarInicio` → `registrarPrueba` ×5 → `terminarSinRacha` sobre los datos del archivo deja la partida `terminada` con sus `aciertos` y sin campos `racha` ni `mejorRacha` en ningún nivel; `cerrarAbandonadaArchivo` convierte `AF---` en `AFFFF` terminada. `partidaDeCaso` devuelve `origen: 'dia'` cuando están los dos.
364. **Aislamiento**: con un `identifaiit.v3` con racha 4 (partidas del 2026-11-01 al 04) en el almacén falso, una partida completa del caso 2 en el archivo (todas las funciones de 12.6.3 vía `actualizarArchivo`) deja la cadena de `identifaiit.v3` **idéntica byte a byte**, y `calcularRacha` y `mejorRacha` iguales. Con `localStorage` que lanza, el progreso del archivo va a `sessionStorage` con `CLAVE_ARCHIVO`.
365. `urlDeCaso('https://identifaiit.com/es/', 1)` → `'https://identifaiit.com/es/?caso=1'`; con `0`, `'1'` o `null` → la base. `textoCompartir` con las cuatro plantillas de archivo de 12.8 da exactamente los ejemplos de 12.8 (y los dos que faltan); ninguno contiene "Streak", "Racha", el tema ni `{racha}` sin rellenar; terminan sin salto de línea.

### textos.js (node --test)

366. `TEXTOS.en` y `TEXTOS.es` tienen el grupo `casos` y las claves de 12.11 con los mismos marcadores; las plantillas de archivo son exactas; `casos.estado_jugado` es exactamente `'✓ {aciertos}/5'` en los dos; límites de 12.11 medidos con los rellenos de 3.1 (`{fecha}` `'Nov 30, 2026'` / `'30 nov 2026'`).

### Plantilla, CSS y composición (Playwright, Chromium y WebKit, en los dos idiomas)

367. Portada en 360 x 640, 390 x 844, 640 x 360, 1280 x 720 y 1920 x 1080, en modo hoy y en modo archivo (`?caso=2` con un caso de tema largo en español): sin scroll de página (`scrollHeight ≤ innerHeight`), `#portada-dia-boton` ≥ 44 px de alto con la flecha visible, `#portada-archivo` visible solo en modo archivo con "Back to today" ≥ 44 x 44 px; el selector de idioma está en el mismo sitio y con el mismo tamaño que en la rama `main` (diferencia ≤ 1 px) y no hay ningún elemento nuevo debajo de él.
368. **Lista pequeña** en 1280 x 720, 1920 x 1080 y 768 x 1024: al abrir, el borde superior del diálogo está entre 0 y 16 px por debajo del botón y su borde izquierdo a ≤ 8 px del del botón (o recortado para caber); ancho ≤ 448 px; filas ≥ 44 px. **Hoja** en 360 x 640, 390 x 844 y 640 x 360: borde inferior del diálogo = alto de la ventana (± 1 px), ancho = ancho de la ventana, cada fila y el botón cerrar ≥ 44 px de alto (cerrar también de ancho).
369. **Desplazamiento**: con un calendario de prueba de 60 días (`?fecha=` en local, día 60), la lista se desplaza por dentro hasta la fila 1; durante y después, `document.scrollingElement.scrollTop === 0` y `window.scrollY === 0`; la cabecera de la lista sigue visible.
370. **Cerrar y foco**: Escape, clic en el fondo (fuera de `.casos-caja`) y `#casos-cerrar` cierran la lista; tras cada uno `aria-expanded="false"`, `#casos-lista` vacío y el foco en `#portada-dia-boton`. Con la lista abierta, Tab y Mayús+Tab se quedan en `dialog#casos` y la página sigue inerte; se acepta el comportamiento nativo de `showModal()` (algún Tab pasa por la interfaz del navegador y vuelve al diálogo, sin llegar nunca a contenido de la página) [D-234]; flecha abajo/arriba e Inicio/Fin mueven el foco entre filas. Al abrir, el foco está en la fila con `aria-current`.
371. **Filas**: con el reloj en `2026-11-05T10:00:00Z`, la lista tiene las filas 5, 4, 3, 2, 1; la primera lleva "Today" / "Hoy"; cada fila muestra "Case #n" / "Caso n.º n", la fecha con `formatearFecha` del idioma, el tema del idioma y los dos estados ("Images: Not played", y "Images: ✓ 4/5" tras jugarlo); la fila del caso mostrado lleva `aria-current="true"`.
372. Con `prefers-reduced-motion: reduce`, la hoja aparece sin transición (`getAnimations()` vacío y `transition-duration` 0).
373. **Anti-trampas del DOM**: con la lista abierta, en modo hoy y en modo archivo y en los dos idiomas, ningún id, clase, nombre o valor de `data-*` de todo el documento contiene una palabra prohibida (con `contienePalabraProhibida`), ningún elemento de la lista ni de la portada lleva `data-verdad`, y `document.body.innerHTML` no contiene el tema (en ningún idioma) de ningún día posterior al de hoy (temas conocidos de los datos de prueba).

### main.js (Playwright con `page.clock`, `timezoneId` y datos de prueba con lanzamiento 2026-11-01 y 14 días)

374. **Elegir y volver**: reloj en `2026-11-05T10:00:00Z`; abrir la lista y elegir el caso 3 → la dirección pasa a `…/en/?caso=3` sin recarga (`performance.getEntriesByType('navigation').length` igual y `history.length` sube exactamente 1), la portada muestra "CASE #3 · {tema 3}", `#portada-archivo` con "Archive case · Nov 3, 2026"; las únicas peticiones nuevas son `data/calendario.json` y `data/facts/2026-11.json`. "Back to today" → dirección sin `caso`, "CASE #5", sin aviso y `history.length` igual. **Historial (D-232)**: desde `?caso=3`, Atrás (`page.goBack()`) vuelve al caso de hoy sin recarga y otro Atrás sale del juego; elegir otro caso anterior (el 2) estando en el 3 no añade entrada y Atrás lleva a hoy; entrando directamente por `/en/?caso=3`, Atrás lleva a hoy (y no a la página anterior); con una partida en `cuenta-atras` o `caso`, Atrás no abandona la partida.
375. **`?caso=` no válido**: `?caso=0`, `?caso=5` (hoy), `?caso=6`, `?caso=99`, `?caso=abc`, `?caso=-2` → portada del caso 5, `#portada-archivo` oculto y dirección sin `caso` (los demás parámetros se conservan). `?caso=3` en un día con datos solo de Images → portada del caso 3 con Fact or Fake "No case that day" (`disabled`).
376. **Idioma**: `/es/?caso=3` abre el caso 3 en español; `/?caso=3` (raíz) acaba en `/es/?caso=3` o `/en/?caso=3` según la preferencia; `/en/?lang=es&caso=3` acaba en `/es/?caso=3`. En modo archivo, pulsar ES en la portada y en `instrucciones`: dirección `/es/?caso=3`, sin recarga, misma pantalla, mismo caso y modo, textos, tema, fecha del aviso y membrete en español.
377. **Images en modo archivo**: caso 3, modo Bloodhound: el caso termina entre 1000 y 1050 ms después de pintarse cada imagen y se sella con el sobre (sin fallo); al terminar, `identifaiit.archivo.v1` tiene `2026-11-03` con `n: 3`, `modo: 'perro'`, `terminada`; `localStorage['identifaiit.v3']` es idéntico al de antes de empezar salvo `ajustes`. El resultado muestra "Case #3 (archive)", `#resultado-archivo` visible y sin racha, mejor racha ni cuenta atrás. Compartir copia exactamente la plantilla de archivo con `?caso=3`. Volver a abrir Images del caso 3 (también tras recargar, cambiar de modo o de idioma) → `ya-jugado` con `ya_jugado.texto_archivo`, sin racha ni cuenta atrás; la fila 3 de la lista muestra "✓ n/5".
378. **Fact or Fake en modo archivo**: aviso de ausencia visible en la prueba 1; ocultar la pestaña 3,5 s antes de responder → fallo con `revelacion.banda_oculta`; 2 s → nada; el texto no se puede seleccionar; el intento se gasta al pulsar "Open the case" (recargar en la prueba 2 → al volver, la partida está cerrada con pendientes `F` en `identifaiit.archivo.v1` y `identifaiit.v3` intacto).
379. **Jugado en su día**: con `identifaiit.v3` que ya tiene Images del `2026-11-03` (`AAFAA`), la fila 3 muestra "Images: ✓ 4/5"; abrir Images del caso 3 → `ya-jugado` con ese resultado; Compartir usa la plantilla normal con "Streak:" calculada a esa fecha y URL sin `caso`; nada se escribe en `identifaiit.archivo.v1`.
380. **Otra pestaña**: dos pestañas en `?caso=3`; empezar Fact or Fake en la A → la tarjeta de la B pasa a "In another tab"; terminar en la A → la B, si estaba en `instrucciones` de ese reto, pasa a `ya-jugado`.
381. **Medianoche con la lista abierta**: reloj en `2026-11-05T22:59:55Z` (23:59:55 en Madrid), portada de hoy y lista abierta; avanzar 10 s → como mucho 1,5 s después de `23:00:00Z` la lista está cerrada, la portada muestra "CASE #6" y, al reabrir la lista, hay 6 filas con la 5 como anterior (jugable). Lo mismo en modo archivo (`?caso=3`): sigue en el caso 3, `?caso=3` en la dirección, y la lista gana la fila 6. En el `resultado` de un caso anterior, cruzar la medianoche no cambia nada visible.
382. **Partida de hoy que cruza la medianoche**: Fact or Fake del caso 5 empezado a las `22:59:55Z` y terminado después: se guarda en `identifaiit.v3` con `2026-11-05`; la lista del día 6 muestra la fila 5 con su resultado y abrirla lleva a `ya-jugado`.
383. **Racha intacta**: con racha 4 en Images (días 1–4 jugados en su día) y el reloj en el día 5, jugar los casos 1 a 4 de Fact or Fake desde el archivo no cambia la racha de Fact or Fake (0) ni la de Images (4); jugar después el caso 5 de Fact or Fake hoy da racha 1.
384. **Nada del futuro en la red ni en el DOM**: en todas las comprobaciones de 374 a 383, el juego no pide ningún archivo de `data/facts/` de un mes posterior al del día de hoy ni ninguna imagen de `casos/` de un día distinto del caso que se juega; con el reloj en el día 5, tras abrir la lista y recorrer los casos 1 a 4, `document.body.innerHTML` no contiene ningún prompt, afirmación, aclaración ni verdad de los días 6 a 14 (textos conocidos de los datos de prueba).

### Herramientas (node --test, archivero)


### Contenido y revisión

385. (Revisión) `privacidad` y `cookies` en los dos idiomas listan `identifaiit.archivo.v1` con una descripción cierta; `preguntas` responde "¿Puedo jugar casos anteriores?" sin prometer que cuentan para la racha. Ninguna página del archivo publicado ha cambiado: `npm run paginas` (mismo instante con `--ahora`, `--salida` temporal) produce árboles idénticos byte a byte a los de la rama `main` en `en/archive/`, `es/archivo/` y sus casos.
386. (Revisión de asuntos-internos) Ninguna ruta nueva del cliente descifra algo de `n > nHoy` ni de un caso anterior que no se juega; los datos no han cambiado de formato; el almacén del archivo no puede alterar `identifaiit.v3.retos`; las reglas de juego son las mismas en modo archivo; ningún id, clase o `data-*` nuevo infringe 0.1.

## 12.13 Plan de tareas (9.19)

Una tarea = un commit con mensaje en español, delegada de una en una y revisada antes de la siguiente.

| # | Tarea | Agente | Depende de | Commit |
|---|---|---|---|---|
| 142 | Lógica pura: `casoPedido`, `listaDeCasos`, `urlConCaso` (diario); `archivo`, `ELEGIR_CASO`, `estadoEnLista` (juego); almacén del archivo (almacen); `urlDeCaso` (compartir). Tests 358–365. | agente-de-campo | P10 | `feat: lógica de casos anteriores` |
| 143 | `js/textos.js` (grupo `casos` y claves de 12.11 en `en` y `es`, plantillas exactas) y contenido (`privacidad`, `cookies`, `preguntas`). Enseñar al usuario. Test 366. | cronista | P10 | `docs: textos de casos anteriores` |
| 144 | `herramientas/plantillas/juego.html` (12.5.1, 12.5.2, `#resultado-archivo`, `#ya-jugado-archivo`, `#ya-jugado-texto` sin `data-texto`) y CSS de `css/componentes.css` (botón con flecha CSS, aviso, R22 lista y hoja, `data-situacion`). Comprobar en el navegador con filas de muestra puestas a mano en las herramientas de desarrollo. | perito-visual | 143 | `estilo: desplegable de casos anteriores` |
| 145 | `js/main.js` (12.6.5): carga por número, `?caso=`, historial (`pushState`, `replaceState` y `popstate`, 12.9), lista y su accesibilidad, modo archivo en todas las pantallas, guardado aparte, compartir, otras pestañas, medianoche. `npm test`, `npm run validar`, prueba con `npx serve`. | agente-de-campo | 142, 144 | `feat: jugar casos anteriores desde la portada` |
| 146 | `npm run paginas` (plantilla y textos nuevos), `npm test`, `npm run validar`; commit de lo generado (`en/`, `es/`). | archivero | 143, 144, 145 | `datos: páginas con casos anteriores` |
| 147 | Playwright (Chromium y WebKit, con `npx`): 367–384. Informe al agente responsable de cada fallo. | agente-de-campo | 146 | — (no edita el proyecto) |
| 148 | Revisión de 358–386 y anti-trampas (12.10). | asuntos-internos | 147 | — (no edita) |
| 149 | Usuario: publicar 142–146 en `main` y comprobar en `identifaiit.com` un `?caso=1`, Atrás y la lista en móvil. | usuario | 148 | — |

Orden: P10 → 142 → 143 → 144 → 145 → 146 → 147 → 148 → 149. No hay migración de datos ni cambio de formato: las tareas se pueden publicar juntas sin coordinar datos y código.

## 12.14 Riesgos nuevos

- **R43. Reloj del dispositivo** (D-18): adelantarlo deja abrir como "anteriores" días aún no terminados. Misma vía que ya existía; aceptado.
- **R44. Respuestas públicas**: los casos anteriores tienen sus respuestas en el archivo publicado; jugarlos después de consultarlo no tiene mérito. Por eso no cuentan para la racha.
- **R45. Peso**: abrir un caso de otro mes descarga su archivo de `data/facts/` (unos 330 KB transferidos). Aceptado (una petición, solo al elegir ese caso).
- **R46. Glifo "✓"**: si las fuentes del sistema de algún dispositivo no lo tuvieran, se vería un recuadro; la fila sigue siendo comprensible por "4/5". La tarea 144 comprueba que las filas usan `--fuente-cuerpo`.
- **R47. Historial**: el `popstate` de 12.9 es lógica nueva y fácil de romper (doble entrada de hoy tras "Back to today", partida en curso, cambio de idioma). La tarea 147 lo prueba en Chromium y WebKit.

## 12.15 Cambios fuera de docs/ (requisito P10; aplicados el 2026-11-02, D-231)

**`CLAUDE.md`**, texto aplicado:

1. "Reglas del juego", línea del intento: tras "Un solo intento al día por reto (en Images, igual para los tres modos)." se añadió **"Los casos de días ya terminados (hora de España) se pueden jugar desde el juego, eligiéndolos en el desplegable de la etiqueta del caso de la portada o con ?caso=N: una vez por reto y caso, con las mismas reglas, sin contar para la racha y con su resultado guardado aparte (identifaiit.archivo.v1); nunca hoy ni días futuros."**
2. "Reglas del juego", línea de la portada: **""Case #N" con el tema, que es un botón desplegable (▾) con la lista de casos: hoy y los días anteriores;"** en lugar de **""Case #N" con el tema;"**.
3. "Reglas del juego", línea del texto compartido: se añadió al final **"Los casos anteriores se comparten con "(archive)" / "(archivo)" tras el número, sin racha y con ?caso=N en el enlace."**
4. "Estructura", línea de `data/facts/`: **"y el juego solo carga el del mes del caso abierto (el de hoy o el de un caso anterior)"** en lugar de **"y el juego solo carga el del mes en curso"**. El calendario y su tema no cambian (el tema va en claro y no es secreto).
5. "Anti-trampas", línea del DOM: se añadió que, en un caso anterior, el contenido ofuscado solo se descifra del caso que se juega y solo si es anterior a hoy. No se habla de temas ocultos.

**`.claude/`** (usuario o agente principal, antes de delegar la tarea de cada agente):
- `agents/agente-de-campo.md`: modo archivo (12.6.5); almacén `identifaiit.archivo.v1` aparte; historial de 12.9; nunca descifrar nada de `n > nHoy`.
- `agents/perito-visual.md`: R22 (lista y hoja) y R8 ampliada.
- `agents/cronista.md`: grupo `casos`; plantillas de compartir de archivo exactas.
- `agents/asuntos-internos.md`: comprobaciones de 386.
