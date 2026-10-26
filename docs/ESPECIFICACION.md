# identifAI-it: especificación técnica

**Versión 2.0, del 2026-10-25** [D-94], con los ajustes D-115, D-116 y D-117 del 2026-10-26 (decisiones del usuario sobre una 2.0 aún no implementada; no cambian el número de versión). Parte de la 1.3 (2026-10-23, con los ajustes D-92 y D-93) y añade un **segundo reto diario** a petición del usuario:
- **Dos retos**: **Images** (`imagenes`, el juego de siempre, con sus tres modos) y **Headlines** (`titulares`: 5 noticias, titular + entradilla, sin modos ni temporizador). Cada uno tiene sus 5 casos, su intento, su racha, su `ya-jugado` y su texto de compartir. La portada es el centro: el jugador elige reto y ve el estado de cada uno [D-98, D-99, D-100].
- **Lanzamiento aplazado y configurable**: `lanzamiento` de `data/calendario.json` puede valer `null` (sin fecha). Sin fecha, el juego normal muestra `sin-casos` y solo funciona el modo prueba. La fecha se cambia solo con `npm run lanzamiento` [D-95, D-97]. Los días ya no guardan `fecha` (se deriva de `n`): calendario **versión 4** y banco **versión 3** [D-96].
- **Headlines**: ocultar la pestaña antes de responder cuenta como fallo **solo si sigue oculta más de 3 segundos seguidos** (`OCULTA_MAX_MS`, medido al volver) [D-101, D-115]; el texto no se puede seleccionar ni copiar (freno casual) [D-102]; titulares, entradillas, respuestas, fuentes y prompts van ofuscados y rellenados en **un archivo por mes**, `data/titulares/AAAA-MM.json` versión 1; el juego normal solo carga el del mes de la fecha efectiva y el modo prueba los carga todos [D-103, D-116, D-117]; tras responder, enlace a la fuente original o sello "AI-GENERATED · NOT A REAL STORY" con la confesión [D-104].
- **Almacén `identifaiit.v3`** con el progreso de cada reto por separado [D-109]. **Modo prueba** ampliado a los dos retos [D-110] y con los días de Headlines de todos los meses [D-117]. **Créditos** con la lista agregada de medios [D-111].
- **Idioma** [D-93, sin cambios]: la interfaz está solo en inglés americano (en-US). Todo texto de interfaz que esta especificación cite en español es solo una referencia: el valor vigente es el de `js/textos.js`. Lo interno (spec, claves, ids, mensajes de las herramientas y commits) sigue en español.

La especificación se reparte en varios archivos de `docs/`, que forman un único documento con la misma versión [D-91, D-114]:

| Archivo | Secciones |
|---|---|
| `docs/ESPECIFICACION.md` (este) | 0. Glosario y estructura · 1. Pantallas y estados · 2. Contrato HTML/CSS |
| `docs/especificacion/3-modulos.md` | 3. Módulos JS |
| `docs/especificacion/4-datos.md` | 4.1–4.6 Datos y herramientas de Images y del lanzamiento · 5. Algoritmo diario · 6. Almacenamiento · 7. Compartir |
| `docs/especificacion/4b-titulares.md` | 4.7–4.14 Datos (archivos mensuales), carga, ofuscación, importador, validación, norma de contenido y créditos de Headlines |
| `docs/especificacion/8-criterios.md` | 8. Criterios de aceptación |
| `docs/especificacion/9-tareas.md` | 9. Plan de tareas, riesgos y cambios fuera de `docs/` |

Este documento es la fuente de verdad técnica. Si algo no está aquí, no se inventa: se pregunta o se registra en `docs/DECISIONES.md`. Las reglas de `CLAUDE.md` prevalecen. **Atención**: la 2.0 cambia reglas que hoy figuran en `CLAUDE.md` ("cada día se muestran 5 imágenes", "un solo intento al día", reglas de modos y pestaña de la 1.3, idioma). Hasta que el usuario actualice `CLAUDE.md` (lista en `9-tareas.md`, 9.6) y confirme la 2.0 en persona, nadie implementa las tareas 61 a 81 (DP-36, resuelta con su opción por defecto). La tarea 60 (aplazamiento provisional del juego publicado) es urgente y solo toca datos y una línea de `validar.mjs`.

Las marcas **[D-nn]** remiten a `docs/DECISIONES.md`. La versión solo sube cuando cambia el comportamiento del juego [D-44].

## 0. Glosario, convenciones y estructura

| Término | Significado |
|---|---|
| Reto | Juego diario independiente. Ids internos: `imagenes` (texto visible "Images") y `titulares` ("Headlines") [D-98]. |
| Caso del día | Las 5 pruebas de un reto en una fecha. Tiene un número `n` (Case #n), **común a los dos retos** (días desde el lanzamiento + 1) [D-99], y un tema propio de cada reto. |
| Lanzamiento | Fecha ISO del Caso #1 de los dos retos, o `null` mientras el usuario no la decide. Vive solo en `data/calendario.json` y solo se cambia con `npm run lanzamiento` [D-95]. |
| Tema | Asunto común de las 5 pruebas de un reto en un día, del nombre de su carpeta de entrada. No revela la verdad [D-52, D-53]. |
| Prueba | Cada uno de los 5 elementos del caso, índice `i` de 0 a 4. En Images es una imagen; en Headlines, una **noticia** (titular + entradilla). |
| Titular / entradilla | Texto de una noticia: titular de 1 a 110 caracteres y entradilla de 1 a 280 (1 o 2 frases), sin medio ni fecha [D-105]. |
| Fuente | URL `https` de la noticia original (solo noticias auténticas). Solo se muestra tras responder [D-104]. |
| Verdad | `0` = auténtica, `1` = generada (IA). Solo en memoria y ofuscada en los datos. |
| Voto | `"autentica"` (REAL, tecla R) o `"generada"` (AI, tecla I), igual en los dos retos. |
| Código de resultado | `A` acierto, `F` fallo, `-` pendiente. En Headlines, una ausencia de más de `OCULTA_MAX_MS` da `F` (no hay código nuevo) [D-101, D-115]. |
| Ausencia | Solo Headlines: tramo **seguido** en que `document.visibilityState` vale `'hidden'` empezado durante una pregunta con la noticia pintada y sin responder. Dura desde el `visibilitychange` a `hidden` hasta el siguiente a `visible`; se mide al volver con `medirOculta` y es fallo si `ocultacionEsFallo(ocultoMs)`, es decir, si supera `OCULTA_MAX_MS = 3000` ms. Las ausencias no se suman entre sí [D-115]. |
| Sellado | Solo Images (`normal` y `perro`): al agotarse la observación la imagen se tapa y se responde sin límite [D-77]. |
| Ficha | Lo que se revela tras responder. Images: prompt o "Real photograph" [D-85]. Headlines: `{tipo: 'fuente', texto: URL}` o `{tipo: 'prompt', texto}` [D-103]. Siempre ofuscada y rellenada. |
| Recorte | Tarjeta de prensa del DOM (`#recorte`) que muestra titular y entradilla [D-105]. |
| Fecha ISO | `AAAA-MM-DD` en hora **local**. |
| Mes de datos | `AAAA-MM`. El de un día `n` es `mesDeNumero(lanzamiento, n)` (los 7 primeros caracteres de `fechaDelDia(lanzamiento ?? FECHA_BASE_PRUEBA, n)`); el que carga el juego normal (y la previsualización) es `mesDeFecha(fecha efectiva)`, y el modo prueba carga todos [D-117]. Los datos de Headlines de ese mes están en `data/titulares/{mes}.json` [D-116]. |
| Modo | Solo Images: `investigador` (sin límite), `normal` (3000 ms), `perro` (1000 ms) [D-81]. |
| Previsualización | Solo en `localhost`, `127.0.0.1` o `[::1]`: `?fecha=` fija la fecha efectiva y no se guarda nada [D-68]. Con `lanzamiento: null` lleva a `sin-casos`. |
| Modo prueba | Con `?prueba=1` y `PRUEBAS_ABIERTAS = true`: selector de día (común a los dos retos), elección de reto, almacén en memoria [D-70, D-110]; carga todos los meses de titulares para que el selector los conozca [D-117]. Funciona aunque no haya lanzamiento. Se apaga antes del lanzamiento (tarea 44) [D-97]. |
| Fecha efectiva | La de la previsualización; si no, la del día elegido en modo prueba (`fechaDelDia(lanzamiento ?? FECHA_BASE_PRUEBA, n)`); si no, `fechaLocal(new Date())`. Fuera del modo prueba, su mes decide qué archivo de titulares se carga [D-116, D-117]. |

### 0.1 Convenciones obligatorias

- **Palabras prohibidas.** `real`, `ia`, `ai` y `fake` no pueden aparecer en ids, clases, atributos `data-*` (nombres ni valores), nombres de archivo, rutas ni `alt` de nada publicado, ni en el `tema` de ningún día de ningún reto [D-53].
  - Se comprueban **por palabra completa** sin distinguir mayúsculas (`contienePalabraProhibida` de `herramientas/temas.mjs`). Única excepción literal: `identifAI-it` [D-23].
  - Aunque "noticia" pasaría la regla, los ids nuevos de Headlines usan `recorte`, `titular`, `entradilla` y `fuente` para no acercarse a ella [D-105].
  - El texto visible ("REAL", "AI", "AI-GENERATED · NOT A REAL STORY", "Real photograph") no es un nombre ni una ruta. Fichas, titulares y entradillas nunca aparecen en claro en lo publicado.
  - En `entrada/` (no publicada) sí aparecen `ia/`, `real/` y los campos `type: real|ai` de `noticias.txt`.
- Los ids aleatorios de imagen (10 caracteres) se comprueban además por subcadena.
- La verdad y el voto se nombran siempre `autentica`/`generada` (o `0`/`1`).
- Rutas siempre relativas y sin `/` inicial (también `data/titulares/{mes}.json`).
- **Ninguna petición a dominios externos** [D-29]. El enlace a la fuente de una noticia es una navegación que el jugador inicia con un clic, no una petición del juego: no hay `prefetch`, `preconnect`, favicons ni imágenes del medio [D-104].
- Los textos visibles salen de `js/textos.js`. Temas, fichas, titulares y entradillas son datos; solo se insertan con `textContent` (y la URL de la fuente, solo como `href` validado).

### 0.2 Estructura de carpetas

| Ruta | Se publica | Contenido |
|---|---|---|
| `index.html` | sí | Todas las pantallas y el diálogo de ficha. |
| `creditos.html` | sí | Créditos estáticos, sin JS, generados por `herramientas/creditos.mjs` [D-39, D-111]. |
| `.nojekyll` | sí | Vacío. |
| `css/variables.css`, `css/base.css`, `css/componentes.css` | sí | |
| `fonts/` | sí | Sin cambios [D-29, D-40]. |
| `js/` | sí | `main.js`, `juego.js`, `temporizador.js`, `diario.js`, `almacen.js`, `compartir.js`, `textos.js`. Sin archivos nuevos. |
| `img/ui/` | sí | Los de la 1.3. Ningún SVG nuevo obligatorio (el sello de Headlines es texto con estilo). |
| `casos/` | sí | `{id}.webp`, solo Images. |
| `data/calendario.json` | sí | Images y fecha de lanzamiento: **versión 4** [D-96]. |
| `data/titulares/AAAA-MM.json` | sí | Headlines, todo ofuscado: **versión 1**, **un archivo por mes de datos** con los días de ese mes [D-103, D-116]. Sin noticias, la carpeta no tiene archivos (o no existe). No hay `data/titulares.json` ni índice de meses [D-117]. |
| `herramientas/*.mjs` | sí (repositorio) | `temas.mjs`, `importar.mjs`, `creditos.mjs`, `validar.mjs` y, nuevos, `lanzamiento.mjs`, `titulares.mjs` (puras, más dos funciones de lectura y escritura de los archivos mensuales) e `importar-titulares.mjs` [D-95, D-106, D-116]. |
| `herramientas/banco.json` | **no** | Banco de imágenes, **versión 3** (sin `fecha`) [D-96]. No hay banco de noticias [D-108]. |
| `herramientas/banco.anterior.json`, `herramientas/lote.json` | **no** | Sin cambios. |
| `entrada/temas/NN-tema/{ia,real}/` | **no** | Imágenes y prompts (sin cambios, D-85, D-93). |
| `entrada/titulares/NN-tema/noticias.txt` | **no** (`entrada/` en `.gitignore`) | Las 5 noticias de un día [D-106]. |
| `tests/` | sí (repositorio) | `*.test.mjs`. Nuevo: `tests/titulares.test.mjs`, `tests/lanzamiento.test.mjs`. |
| `package.json` | sí | Scripts `test`, `validar`, `importar`, `creditos` y, nuevos, `titulares` y `lanzamiento`. |
| `docs/` | sí | `ESPECIFICACION.md`, `especificacion/*.md` (con el nuevo `4b-titulares.md`) y `DECISIONES.md`. |

---

## 1. Pantallas y estados

### 1.1 Pantallas

| Pantalla (`data-pantalla`) | Contenido |
|---|---|
| `iniciando` | Transitorio mientras se cargan el almacén, `data/calendario.json` y el archivo de titulares del mes de la fecha efectiva (`data/titulares/{mes}.json`) [D-116] o, en modo prueba, todos los meses de titulares, en serie (4.7.2) [D-117]. Sin sección. |
| `portada` | Título, lema, Case #n, selector de día (modo prueba), **selector de reto** con el estado de cada uno, tema del reto elegido, selector de modo (**solo Images**) o regla de Headlines, racha del reto elegido, botón Start / View report, Cómo jugar (pasos del reto elegido) y pie con Credits [D-98]. |
| `cargando` | Solo Images: precarga de las 5 imágenes. |
| `cuenta-atras` | Solo Images: 3, 2, 1. |
| `caso` | Images: como en la 1.3. Headlines: tema, Story i/5, marcador, aviso de ausencia (solo en la pregunta de la prueba 1) [D-115], recorte (titular + entradilla + marca) y botones REAL / AI, sin temporizador. Fases `pregunta` y `veredicto`. |
| `resultado` | Reto y caso, aciertos x/5, mensaje, 5 miniaturas (imágenes) o 5 botones numerados (Headlines) que abren la ficha, rachas del reto, Share y Back [D-89, D-105]. |
| `ya-jugado` | Del reto elegido: reto y caso, aciertos, cuadros, modo (solo Images), racha, cuenta atrás a medianoche, Share y Back. |
| `sin-casos` | Ningún reto tiene caso hoy, o no hay fecha de lanzamiento (texto propio) [D-24, D-95]. |
| `error` | No se pudo cargar `data/calendario.json`, un archivo de titulares (salvo que no exista: un 404 deja Headlines sin caso o, en modo prueba, cierra la lista de meses; no es error [D-116, D-117]) o alguna imagen. Reintentar. |

- El veredicto es una fase de `caso` [D-05]. `dialog#ficha` es una ventana modal sobre `caso/veredicto` o `resultado`, sin cambio de estado [D-88].
- Headlines **reutiliza** las pantallas `caso`, `resultado` y `ya-jugado`; no hay pantallas nuevas. `#app[data-reto]` distingue el reto.

### 1.2 Estado del juego

Un único objeto de estado, gestionado por la función pura `transicion(estado, evento)` de `js/juego.js`:

```js
{
  pantalla: 'portada',
  fase: null,                   // 'pregunta' | 'veredicto' | null (solo en 'caso')
  reto: 'imagenes',             // 'imagenes' | 'titulares': elegido en portada / en juego [D-98]
  modo: 'normal',               // modo de Images; en titulares no se usa
  retos: {                      // resumen del día por reto [D-98]
    imagenes:  { caso: {n, fecha, tema, pruebas, clave, fichas} | null, jugado: false },
    titulares: { caso: {n, fecha, tema, clave, textos, fichas} | null, jugado: false }
  },
  // Copia del caso del reto elegido (CARGADO, ELEGIR_RETO, VOLVER_PORTADA):
  n: 3, tema: 'Fireworks',
  pruebas: ['k3x9q2m7ab', ...], // Images; null en titulares
  textos: null,                 // Headlines: 5 bloques ofuscados (684 car.); null en imagenes
  clave: 'Mpb9Ycc=',
  fichas: ['…', ...],           // Images: 5 × 684 car.; Headlines: 5 × 1368 car.
  fecha: null,                  // fecha de la partida: FIN_CUENTA (Images) o EMPEZAR (Headlines)
  indice: 0,
  resultados: '-----',
  activo: false,                // se aceptan votos (de PINTADA al voto)
  tapada: false,                // solo Images [D-77]
  texto: null,                  // Headlines: {titular, entradilla} de la prueba actual, solo en 'caso'
  revelada: null,               // verdad de la prueba actual, solo en 'veredicto'
  ficha: null,                  // solo en 'veredicto'. Images: string | null; Headlines: {tipo, texto} | null
  motivo: null,                 // Headlines: 'oculta' si el fallo vino de una ausencia de más de OCULTA_MAX_MS; si no, null [D-101, D-115]
  error: null                   // 'calendario' | 'imagenes' | null
}
```

- `jugado` significa "el intento de hoy de ese reto está gastado": partida `terminada` o `en_curso` en otra pestaña. El detalle (aciertos, en curso) lo lee main.js del almacén para la portada.
- `texto` solo contiene la noticia actual: el estado nunca guarda más de una noticia descifrada [D-103].
- **El estado no guarda instantes ni duraciones de ausencia**: el inicio de una ausencia lo apunta main.js en una variable propia y la duración llega ya medida en el evento `VOLVIO` [D-115]. Así `transicion` sigue siendo pura y no depende de ningún reloj.
- La previsualización y el modo prueba no añaden campos (la lista de meses del modo prueba vive solo en main.js, no en el estado) [D-117].

### 1.3 Eventos y transiciones

| Estado actual | Evento | Condición | Estado siguiente / efecto |
|---|---|---|---|
| `iniciando` | `CARGADO` `{retos, reto}` | `retos.imagenes.caso` y `retos.titulares.caso` son `null` | `sin-casos` |
| `iniciando` | `CARGADO` | en otro caso | `portada`. `reto` = el pedido si es válido y tiene caso; si no, el otro. Copia el caso de ese reto [D-98]. Antes, main.js cierra como abandonada (pendientes → `F`) cualquier partida `en_curso` de hoy de cada reto, así que `jugado` = hay partida `terminada` [D-79]. |
| `iniciando` | `ERROR_CALENDARIO` | falla `calendario.json` o un archivo de titulares (red, respuesta distinta de 2xx y de 404, JSON o estructura no válidos, `mes` que no cuadra) | `error` (`'calendario'`). Un 404 **no** es error: en el juego normal, `cargarTitulares` devuelve el mes sin días y Headlines queda sin caso [D-116]; en modo prueba, `cargarTitularesPrueba` da por terminada la lista de meses [D-117]. |
| `portada` | `ELEGIR_RETO` `{reto}` | `retoValido(reto)` y distinto del actual | `portada` con ese reto y su caso copiado (`n`, `tema`, `pruebas`, `textos`, `clave`, `fichas`; `null` si no tiene). main.js guarda `ajustes.reto`. Si no, el mismo objeto. |
| `portada` | `ELEGIR_MODO` `{modo}` | `modoValido(modo)` | como en la 1.3 (se acepta en cualquier reto; solo se ve en Images). |
| `portada` | `EMPEZAR` `{fecha}` | `retos[reto].caso === null` | el mismo objeto (el botón está `disabled`). |
| `portada` | `EMPEZAR` | `retos[reto].jugado` | `ya-jugado` (de ese reto) [D-99]. |
| `portada` | `EMPEZAR` | reto `imagenes` | `cargando` (main.js cierra Cómo jugar) [D-83]. |
| `portada` | `EMPEZAR` `{fecha}` | reto `titulares` | `caso`, `fase: 'pregunta'`, `indice: 0`, `resultados: '-----'`, `activo: false`, `fecha` = la del evento, `texto = desofuscarTexto(textos[0], clave, n, 0)`, `motivo: null`. **Se consume el intento**: main.js guarda la partida `en_curso` antes de pintar la primera noticia [D-100]. En la prueba 1 se ve el aviso de ausencia (2.3) [D-115]. |
| `cargando`, `error`, `cuenta-atras` | `PRECARGA_OK`, `PRECARGA_ERROR`, `REINTENTAR`, `FIN_CUENTA` | | Como en la 1.3 (solo se llega en Images). |
| `caso/pregunta` | `PINTADA` | `activo === false` | `activo: true`. En Images, main.js arranca el temporizador salvo en `investigador`; en Headlines no hay temporizador. |
| `caso/pregunta` | `VOTO` `{voto}` | `activo === true` | `veredicto`, código `A`/`F`, `revelada`, `activo: false`, `tapada: false`, `motivo: null`. `ficha`: Images, `desofuscarFicha(...)`; Headlines, `desofuscarNoticia(fichas[i], clave, n, i)`. |
| `caso/pregunta` | `VOTO` | `activo === false` | el mismo objeto |
| `caso/pregunta` | `AGOTADO` | Images, `activo`, no tapada, modo con límite | `tapada: true` [D-77] |
| `caso/pregunta` | `AGOTADO` | cualquier otra situación (también Headlines) | el mismo objeto |
| `caso/pregunta` | `VOLVIO` `{ocultoMs, indice}` | reto `titulares`, `activo === true`, `indice === estado.indice` y `ocultacionEsFallo(ocultoMs)` (más de 3000 ms) | `veredicto` con código **`F`**, `revelada`, `ficha` (como en `VOTO`), `activo: false`, `motivo: 'oculta'` [D-101, D-115] |
| `caso/pregunta` | `VOLVIO` | cualquier otra situación (Images; Headlines sin pintar; ausencia de 3000 ms o menos; `indice` distinto; `ocultoMs` no numérico) | el mismo objeto: la prueba sigue en pregunta con los votos activos |
| `caso/veredicto` | `SIGUIENTE` | `indice < 4` | `caso/pregunta`, `indice + 1`, `revelada`, `ficha` y `motivo` a `null`, `activo: false`, `tapada: false`; en Headlines, `texto` = el de la prueba siguiente. |
| `caso/veredicto` | `SIGUIENTE` | `indice === 4` | `resultado`, `fase: null`, `texto`, `revelada` y `ficha` a `null`, `retos[reto].jugado = true`. main.js guarda la partida `terminada` y las rachas del reto. |
| `resultado`, `ya-jugado` | `VOLVER_PORTADA` | | `portada` con el mismo `reto` y su caso copiado; `fase`, `fecha`, `texto`, `revelada`, `ficha`, `motivo` a `null`, `indice: 0`, `resultados: '-----'` [D-98]. |
| cualquiera salvo `iniciando`, `error`, `sin-casos` | `OTRA_PESTANA` `{reto}` | otra pestaña ha empezado o terminado ese reto hoy [D-51] | `retos[reto].jugado = true`. Además, si `reto === estado.reto` y la pantalla es `portada`, `cuenta-atras` o `caso` → `ya-jugado` (si sigue en curso en la otra, solo `avisos.otra_pestana`). Si el `reto` no es válido, el mismo objeto. |
| `resultado`, `ya-jugado` | `COMPARTIR` | | sin cambio de estado (efecto en main.js) |
| `ya-jugado`, `sin-casos`, `portada` | `MEDIANOCHE` | la fecha efectiva ha cambiado | `iniciando`: main.js vuelve a cargar `data/calendario.json` y el archivo de titulares del mes de la nueva fecha (el 1 de cada mes, el del mes nuevo) [D-116]. |
| cualquiera | evento no listado (incluidos `VER_COMO_JUGAR`, `ENTENDIDO` y el antiguo `OCULTA`) | | el mismo objeto |

Reglas adicionales:
- **Un intento al día por reto** [D-99]: se pueden jugar los dos el mismo día, en cualquier orden. Images sigue con un único intento para sus tres modos [D-32].
- **Portada como centro** [D-98, DP-42]: recargar con un reto jugado lleva a la portada, donde su ficha dice "Filed · 4/5" y el botón pasa a View report (`EMPEZAR` → `ya-jugado`). `resultado` solo se ve una vez.
- **Reto ya jugado y el otro no**: la portada muestra los dos estados; elegir el pendiente permite jugarlo con normalidad. Un reto sin caso hoy muestra "No case today" y deja Start `disabled`.
- **Pestaña oculta en Images** [D-78]: sin efecto, como en la 1.3. `VOLVIO` se ignora.
- **Pestaña oculta en Headlines** [D-101, D-115]:
  - **Cuándo empieza una ausencia**: en el `visibilitychange` con `document.visibilityState === 'hidden'`, si en ese instante `estado.reto === 'titulares'`, la pantalla es `caso`, la fase `pregunta` y `activo === true` (noticia pintada y sin responder). main.js apunta `{perf: performance.now(), fecha: Date.now()}` y el `indice`. En cualquier otra situación (portada, veredicto, resultado, `ya-jugado`, antes de `PINTADA`) no empieza ninguna ausencia.
  - **Cuándo termina**: en el siguiente `visibilitychange` a `visible` (también al restaurar la página desde la caché de avance y retroceso, que dispara ese evento). main.js calcula `ocultoMs = medirOculta(inicio, ahora)`, borra el inicio apuntado y despacha `VOLVIO {ocultoMs, indice}`.
  - **Umbral**: `OCULTA_MAX_MS = 3000`. Con 3000 ms o menos no pasa nada: la noticia sigue en pregunta, los votos siguen activos, no se guarda nada y el jugador no ve ningún aviso. Con más de 3000 ms, la prueba es `F` (`motivo: 'oculta'`), se guarda en el acto y el jugador ve, al volver, el veredicto de esa prueba (sello, respuesta, fuente o confesión) con el texto `titulares.oculta` y el foco en Next.
  - **Ausencias seguidas, no acumuladas**: cada ausencia se mide por separado; varias ausencias cortas (cada una de 3 s o menos) no suman (riesgo R12 de 9.5).
  - **Por qué se mide al volver y no con un temporizador mientras está oculta**: los navegadores estrangulan o congelan los temporizadores de las pestañas ocultas (`setTimeout` a 1 por segundo o por minuto; Safari en iOS y Chrome en Android suspenden la página entera al bloquear la pantalla o cambiar de app), así que un `setTimeout(3000)` puede disparar tarde o no disparar nunca; además, mientras la pestaña está oculta el jugador no ve nada, así que decidir antes no le aporta nada. Al volver, el resultado es siempre el mismo y la regla es determinista. No se usa ningún temporizador ni evento `OCULTA`.
  - **Reloj**: `medirOculta` toma el mayor de los dos intervalos, `performance.now()` (monótono, inmune a cambios de hora) y `Date.now()` (que sigue contando aunque el sistema se suspenda y `performance.now()` se detenga en algunas plataformas). Adelantar la hora del dispositivo solo puede perjudicar al jugador; atrasarla no acorta la medida de `performance.now()`.
  - **Si la página no vuelve** (el sistema la descarta mientras está oculta, o el jugador cierra la pestaña): al reabrir, la partida `en_curso` se cierra como abandonada y sus pendientes, incluida esa prueba, son `F` [D-79]. No hace falta guardar nada al ocultarse.
  - **Orden al volver**: primero `VOLVIO` (y su guardado), después lo de la 1.3 (relecturas de D-51, `OTRA_PESTANA`, `MEDIANOCHE`).
  - Bloquear la pantalla, una llamada o una notificación a pantalla completa de 3 s o menos ya no penalizan. Perder el foco sin ocultar la pestaña (otra ventana al lado, pantalla dividida) no se detecta.
- **Partida abandonada** (recarga o cierre a medias): pendientes → `F`, en los dos retos [D-79].
- **Medianoche durante la partida**: la partida pertenece a su `fecha` y usa los datos ya cargados (también si cruza de mes). `MEDIANOCHE` solo se procesa en `portada`, `ya-jugado` y `sin-casos`, y siempre recarga los dos archivos de datos [D-116].
- **Veredicto**: avance manual con Next o Enter [D-27].
- **Ficha y texto**: `texto` solo existe en `caso`; `ficha`, solo en `veredicto`. En `resultado`, main.js descifra lo de cada botón solo al abrirlo. Nada de eso se guarda [D-88, D-103].
- **Tema**: no se guarda ni se comparte [D-54].
- **Previsualización y modo prueba**: la tabla no cambia. En la previsualización se carga solo el mes de `?fecha=` [D-116]. En modo prueba, el día se elige por `n`, la URL lleva `&reto=` [D-110] y se cargan todos los archivos de titulares existentes (4.7.2) [D-117].

### 1.4 Diagrama

```
iniciando ──► portada (reto: imagenes | titulares) ──► sin-casos / error
               │ ELEGIR_RETO / ELEGIR_MODO (portada)
               │ EMPEZAR, reto jugado ─────────────────────────────► ya-jugado
               │ EMPEZAR, imagenes ──► cargando ──► cuenta-atras ──FIN_CUENTA──┐
               │ EMPEZAR, titulares ────────────────────────────────────────────┤
               ▼                                                                ▼
                     caso[i]/pregunta ──VOTO / VOLVIO >3000 ms (solo titulares)──► caso[i]/veredicto
                     (imagenes: AGOTADO → tapada; VOLVIO ≤3000 ms: sin cambio)     │ SIGUIENTE i<4 → caso[i+1]
                                                                                   ▼ i = 4
                                                                               resultado
resultado / ya-jugado ──VOLVER_PORTADA──► portada
portada / ya-jugado / sin-casos ──MEDIANOCHE──► iniciando (recarga calendario y mes de titulares)
portada (modo prueba) ──Open this day──► ?prueba=1&dia=n&reto=r (recarga) ──► iniciando (calendario y todos los meses)
```

---

## 2. Contrato HTML/CSS

El Perito Visual crea marcado y estilos; el Agente de Campo solo usa los ganchos de esta sección. Ningún otro id, clase o atributo es estable. Cualquier cambio pasa por el inspector-jefe y DECISIONES.

### 2.1 Mecanismo de pantallas

- `<main id="app" data-pantalla="portada" data-reto="imagenes" data-modo="normal">`: main.js mantiene al día `data-pantalla`, `data-reto` (`imagenes|titulares`) [D-98] y `data-modo`. CSS usa `data-reto` para la composición de cada reto (temporizador y sobre solo en Images, recorte solo en Headlines).
- Cada pantalla es `<section class="pantalla" id="pantalla-{nombre}" hidden>`; solo una sin `hidden`. Además de las secciones, main.js solo cambia `hidden` en los elementos que este contrato indica.
- Foco al cambiar de pantalla: `data-foco` o el primer `h1`/`h2` [D-41].

### 2.2 Atributos genéricos

| Atributo | Dónde | Uso |
|---|---|---|
| `data-texto="grupo.clave"` | elementos con texto fijo | Como en la 1.3. |
| `data-accion` | `<button>` | `empezar`, `siguiente`, `compartir`, `reintentar`, `leer-confesion`, `ver-ficha`, `cerrar-ficha`, **`volver-portada`** [D-98] y, en modo prueba, `abrir-prueba`. |
| `data-voto="autentica"` / `"generada"` | botones de respuesta | Fijos, comunes a los dos retos. |
| `data-foco` | uno por pantalla | |
| `data-estado="acierto\|fallo"` | `#veredicto` y cada `button.miniatura` | Resultado del jugador. Ausente antes de responder. |
| `data-verdad="autentica\|generada"` | `#veredicto` | [D-104] Solo en fase `veredicto` (para el estilo del sello, sobre todo el de IA en Headlines). Ausente en fase `pregunta`. |
| `data-fase`, `data-tapada` | `#pantalla-caso` | Como en la 1.3; en Headlines, `data-tapada` siempre `no`. |
| `data-nivel`, `--restante` | `#temporizador` | Solo Images. |
| `data-prueba="1".."5"` | `button.miniatura` | Posición. |
| `data-visible` | `#compartir-aviso` | |
| `data-pagina` | `<body>` | `juego` o `creditos`. |

Clases: `.solo-lectores`; estructurales `.pantalla`, `.prueba-img`, `.boton-texto`, `.miniatura` y, nueva, `.miniatura-numero` [D-105]. Los estados van en `data-*` [D-03].

Temas, titulares, entradillas y fichas solo como `textContent` en los elementos que se citan aquí; la URL de la fuente solo como `href` de `#veredicto-fuente-enlace` y `#ficha-fuente-enlace` tras `urlFuenteValida`, y su dominio (`medioDeUrl`) como `textContent`. Nada de eso va en ids, clases, otros atributos, `alt` ni rutas.

### 2.3 Elementos por pantalla

**Portada** (`#pantalla-portada`), en este orden del DOM:
- `h1 data-texto="portada.titulo"`, `p.portada-lema data-texto="portada.lema"` y `#portada-caso` ("Case #n"; `hidden` si `estado.n` es `null`).
- `#selector-prueba` (solo en modo prueba; lo crea main.js **justo después de `#portada-caso`**) con el marcado de D-70. Las `option` llevan `value = String(n)` y texto `rellenar(prueba.opcion, {n, tema})`, con `tema` = los temas de los dos retos de ese día unidos por " / " (o el del único reto que tenga ese día). En modo prueba se conocen los días de Headlines de todos los meses (4.7.2) [D-110, D-117].
- Selector de reto [D-98]:
  ```html
  <fieldset id="portada-retos">
    <legend data-texto="portada.elige_reto">[[portada.elige_reto]]</legend>
    <div class="retos">
      <div class="reto">
        <input type="radio" name="reto" id="reto-imagenes" value="imagenes">
        <label for="reto-imagenes">
          <span class="reto-nombre" data-texto="portada.reto_imagenes">[[portada.reto_imagenes]]</span>
          <span class="reto-estado" id="reto-imagenes-estado"></span>
        </label>
      </div>
      <div class="reto">
        <input type="radio" name="reto" id="reto-titulares" value="titulares">
        <label for="reto-titulares">
          <span class="reto-nombre" data-texto="portada.reto_titulares">[[portada.reto_titulares]]</span>
          <span class="reto-estado" id="reto-titulares-estado"></span>
        </label>
      </div>
    </div>
  </fieldset>
  ```
  - Dos fichas en **una fila** en todos los tamaños garantizados, mismo estilo que las de modo (radios nativos, foco visible, flechas del teclado entre ellas).
  - `.reto-estado` (main.js, `textContent`): `portada.estado_sin_caso` si el reto no tiene caso; `portada.estado_jugado` (`{aciertos}`) si su partida de hoy está terminada; `portada.estado_en_curso` si está en curso en otra pestaña; si no, `portada.estado_pendiente`.
- `<p id="portada-tema">`: `portada.tema` con el tema del reto elegido (vacío si no tiene caso) [D-54].
- `<fieldset id="portada-modos">` como en la 1.3. main.js le pone `hidden` cuando el reto es `titulares` (no solo oculto por CSS: no debe ser alcanzable con Tab) [D-98].
- `<p id="portada-regla" data-texto="portada.regla_titulares" hidden>`: regla breve de Headlines (sin temporizador; salir de la página **más de unos segundos** antes de responder es fallo). main.js le quita `hidden` solo con `titulares` [D-101, D-115].
- `#portada-racha`: racha del reto elegido (`hidden` si es 0).
- `button[data-accion="empezar"][data-foco]` con `<span class="boton-texto" id="portada-empezar-texto">` (sin `data-texto`): main.js pone `portada.boton_empezar`, o `portada.boton_ver_informe` si el reto está jugado. Con el reto sin caso, el botón lleva `disabled`.
- `details#como-jugar` como en la 1.3. main.js rellena `#como-jugar-pasos` con `como_jugar.pasos` (Images) o `como_jugar.pasos_titulares` según el reto elegido, al arrancar y en cada `ELEGIR_RETO` [D-113].
- `footer#portada-pie` con `a#portada-creditos`, sin cambios.

**Cargando** y **Cuenta atrás**: sin cambios (solo Images).

**Caso** (`#pantalla-caso`):
- `header#caso-cabecera`: `#caso-tema`, `#caso-etiqueta` (`partida.etiqueta_prueba` en Images, `titulares.etiqueta_prueba` en Headlines), `#caso-marcador` y, nuevo y último, el aviso de ausencia [D-115]:
  ```html
  <p id="caso-aviso" data-texto="titulares.aviso_oculta" hidden>[[titulares.aviso_oculta]]</p>
  ```
  - Texto exacto: "Leaving the page for more than a few seconds counts as a miss.".
  - main.js le quita `hidden` **solo** con `estado.reto === 'titulares'`, `pantalla === 'caso'`, `fase === 'pregunta'` e `indice === 0` (pregunta de la prueba 1), y se lo devuelve en el veredicto de la prueba 1 y en cualquier otro estado. Nunca se ve en Images.
  - Se elige la prueba 1 y no una pantalla intermedia porque Start lleva directamente a la primera noticia (DP-45, sin estados nuevos) y el aviso queda a la vista justo cuando la regla empieza a contar; en la portada ya lo anticipa `#portada-regla` (DP-52, resuelta con esta opción).
  - Lectores de pantalla: además de estar en el DOM antes del recorte, main.js escribe una vez `titulares.aviso_oculta` en `#temporizador-anuncio` (`aria-live="polite"`) tras `PINTADA` de la prueba 1 y lo vacía en `SIGUIENTE`. Es el único uso de `#temporizador-anuncio` en Headlines.
- `<div id="caso-escena">` con, en orden, `#prueba-marco`, `#prueba-sobre`, **`#recorte`** y `#veredicto`.
- `#prueba-marco` y `#prueba-sobre`: como en la 1.3. En Headlines, main.js pone `hidden` a `#prueba-marco` (y `#prueba-sobre` sigue con `hidden`).
- Recorte de prensa [D-102, D-105], vacío en el HTML:
  ```html
  <article id="recorte" hidden aria-labelledby="recorte-titular">
    <h2 id="recorte-titular"></h2>
    <p id="recorte-entradilla"></p>
    <p id="recorte-marca" aria-hidden="true" data-texto="titulares.marca">[[titulares.marca]]</p>
  </article>
  ```
  - main.js le quita `hidden` solo en Headlines (en las dos fases) y rellena titular y entradilla con `textContent` al empezar cada prueba; si `estado.texto` es `null`, el titular recibe `titulares.no_disponible` y la entradilla queda vacía.
  - `#recorte-marca` ("identifAI-it · Real or AI?" o similar) va siempre, igual en todas las pruebas, para que una captura de pantalla de una noticia generada nunca circule sin contexto (DP-44). Es decorativa para lectores de pantalla.
  - **Bloqueo de copia** (freno casual, no seguridad): CSS `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;` en `#recorte`, y main.js registra una vez, en `#recorte`, oyentes de `copy`, `cut`, `contextmenu`, `dragstart` y `selectstart` que llaman a `preventDefault()`. Nada fuera de `#recorte` se bloquea (ni atajos globales, ni el menú contextual del resto de la página, ni el diálogo del resultado).
  - **Accesibilidad**: el texto es texto real del DOM, sin `aria-hidden`, sin imágenes ni canvas, así que los lectores de pantalla lo leen (y pueden, con sus propias órdenes, copiarlo: se acepta). No se impide el zoom ni la ampliación del texto [D-102].
- `#veredicto` (`role="status"`, `aria-live="polite"`, `hidden` en pregunta), con `data-estado` y `data-verdad` solo en veredicto. Contiene, en orden:
  - `#veredicto-sello`: Images, `partida.sello_autentica|sello_generada`; Headlines, `titulares.sello_autentica` o **`titulares.sello_generada`** ("AI-GENERATED · NOT A REAL STORY").
  - `#veredicto-pie` (icono y `#veredicto-texto`): variante de `veredictos.acierto|fallo`, o de `titulares.oculta` si `motivo === 'oculta'`.
  - Fuente, nueva [D-104]:
    ```html
    <div id="veredicto-fuente" hidden>
      <p id="veredicto-fuente-titulo" data-texto="titulares.fuente_titulo">[[titulares.fuente_titulo]]</p>
      <a id="veredicto-fuente-enlace" target="_blank" rel="noopener noreferrer" hidden><span id="veredicto-fuente-texto"></span><span class="solo-lectores" data-texto="titulares.nueva_pestana">[[titulares.nueva_pestana]]</span></a>
      <p id="veredicto-fuente-sin" data-texto="titulares.fuente_no_disponible" hidden>[[titulares.fuente_no_disponible]]</p>
    </div>
    ```
    El `a` no lleva `href` en el HTML. Solo en Headlines, fase veredicto y `revelada === 0`, main.js quita `hidden` a `#veredicto-fuente`; si `ficha?.tipo === 'fuente'` y `urlFuenteValida(ficha.texto)`, pone `href = ficha.texto`, `#veredicto-fuente-texto` = `rellenar(titulares.fuente_enlace, {medio: medioDeUrl(url)})` y quita `hidden` al enlace; si no, muestra `#veredicto-fuente-sin`. Al salir del veredicto, quita `href`, vacía el texto y vuelve a ocultar los tres.
  - `#veredicto-confesion` (1.3). main.js le pone `hidden` en Headlines cuando `revelada === 0`; en Images y en las noticias generadas, visible, con `recortarFicha(texto)` del prompt (`ficha.texto` en Headlines) o `confesion.no_disponible` si la ficha es `null` o no es de tipo `prompt`.
- `#temporizador` y `#temporizador-anuncio`: solo Images (CSS oculta `#temporizador` con `#app[data-reto="titulares"]`; el anuncio queda vacío salvo el aviso de ausencia de la prueba 1).
- `#caso-botones`: sin cambios (votos y Next, comunes).

**Resultado** (`#pantalla-resultado`):
- Nuevo `<p id="resultado-reto">` antes de `#resultado-aciertos`: `rellenar(final.reto, {reto, n})` ("Headlines · Case #12").
- `#resultado-aciertos` (`data-foco`), `#resultado-mensaje`, `#resultado-rachas` (del reto) y `button[data-accion="compartir"]` como en la 1.3, más `button[data-accion="volver-portada"]` (`final.boton_volver`) en la misma `.acciones`.
- `#resultado-revision`: Images, las 5 miniaturas de la 1.3. Headlines [D-105]:
  ```html
  <li>
    <button type="button" class="miniatura" data-accion="ver-ficha" data-prueba="3" data-estado="acierto" aria-haspopup="dialog">
      <span class="miniatura-numero" aria-hidden="true">3</span>
      <span class="solo-lectores">Story 3: correct</span>
    </button>
  </li>
  ```
  El nombre accesible es `rellenar(titulares.estado_prueba, {i, estado: final.estados[estado]})`. El icono, por CSS (`::after`) según `data-estado`. Ni la verdad, ni el titular, ni la fuente están en el marcado.

**Ya jugado** (`#pantalla-ya-jugado`): como en la 1.3, más `<p id="ya-jugado-reto">` (`final.reto`) tras el `h2` y `button[data-accion="volver-portada"]` tras Compartir. `#ya-jugado-modo` lleva `hidden` en Headlines. Todo se refiere al reto de `estado.reto`.

**Sin casos**: `<p id="sin-casos-texto" tabindex="-1" data-foco>` sin `data-texto`: main.js pone `sin_casos.sin_lanzamiento` si `lanzamiento === null`, o `sin_casos.texto` si no [D-95]. **Error**: sin cambios.

**Comunes**: `#compartir-aviso`, `#compartir-manual` con su `label`, `#aviso-almacen` y `#aviso-previsualizacion` (texto `avisos.previsualizacion` con `?fecha=`, o `avisos.prueba` con `{n}` en modo prueba [D-110]).

**Diálogo `#ficha`** (1.3, ampliado [D-104, D-105]):
```html
<dialog id="ficha" aria-labelledby="ficha-titulo">
  <h2 id="ficha-titulo"></h2>
  <img id="ficha-img" alt="" width="1080" height="1350" hidden>
  <div id="ficha-recorte" hidden>
    <p id="ficha-titular"></p>
    <p id="ficha-entradilla"></p>
  </div>
  <p id="ficha-era"></p>
  <h3 id="ficha-confesion-titulo" data-texto="confesion.titulo">[[confesion.titulo]]</h3>
  <p id="ficha-texto"></p>
  <p id="ficha-fuente" hidden>
    <a id="ficha-fuente-enlace" target="_blank" rel="noopener noreferrer"><span id="ficha-fuente-texto"></span><span class="solo-lectores" data-texto="titulares.nueva_pestana">[[titulares.nueva_pestana]]</span></a>
  </p>
  <p id="ficha-fuente-sin" data-texto="titulares.fuente_no_disponible" hidden>[[titulares.fuente_no_disponible]]</p>
  <button type="button" id="ficha-cerrar" class="boton" data-accion="cerrar-ficha">
    <span class="boton-texto" data-texto="ficha.cerrar">[[ficha.cerrar]]</span>
  </button>
</dialog>
```
- Images: como en la 1.3 (`#ficha-recorte`, `#ficha-fuente` y `#ficha-fuente-sin` con `hidden`).
- Headlines, desde `ver-ficha` en `resultado`: `#ficha-titulo` = `titulares.estado_prueba`; `#ficha-recorte` visible con titular y entradilla completos (`desofuscarTexto`); `#ficha-era` = `rellenar(final.era, {sello})`; si es generada, título de confesión y `#ficha-texto` con el prompt completo, y la fuente oculta; si es auténtica, título de confesión y `#ficha-texto` con `hidden`, y la fuente como en el veredicto.
- Headlines, desde `leer-confesion` en el veredicto: solo título, era y prompt (sin recorte).
- Al cerrarse, main.js además vacía `#ficha-titular`, `#ficha-entradilla` y `#ficha-fuente-texto`, quita `href` al enlace y devuelve `hidden` a `#ficha-recorte`, `#ficha-fuente` y `#ficha-fuente-sin`, y quita `hidden` a `#ficha-confesion-titulo` y `#ficha-texto`.

### 2.4 Cabecera de index.html

Sin cambios: misma CSP `default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'` [D-36], `lang="en"`. **Confirmado** [D-104]: la CSP controla los recursos que carga la página (scripts, estilos, imágenes, `fetch`), no la navegación de nivel superior que provoca un clic en un enlace (`navigate-to` nunca llegó a los navegadores; `form-action` solo afecta a formularios). Los enlaces `target="_blank"` a la fuente funcionan sin tocar la CSP, y `rel="noopener noreferrer"` deja `window.opener` a `null` y no envía `Referer`. Los archivos `data/titulares/{mes}.json` son del mismo origen: `default-src 'self'` los permite.

### 2.5 Tipografías

Sin cambios [D-29, D-40]. El titular usa `--fuente-titulos`; la entradilla, `--fuente-cuerpo`; la marca, `--fuente-datos`; el aviso de ausencia, `--fuente-cuerpo`.

### 2.6 Composición sin deslizar [D-84]

Siguen R1 a R13 de la 1.3 con los mismos tamaños garantizados (360 x 640, 640 x 360, 1280 x 720, 390 x 844, 768 x 1024). Cambios y reglas nuevas:

- **R8. Portada** [D-98]:
  - En vertical: título, lema, Case #n, selector de prueba, **retos (una fila de 2)**, tema, modos (solo Images) o `#portada-regla` (solo Headlines), racha, Start, desplegable y pie.
  - En horizontal: a la izquierda, identidad (título, lema, Case #n, racha, desplegable y pie); a la derecha, acción (selector de prueba, retos, tema, modos o regla, Start).
  - Para que quepa también con selector de prueba y aviso a 360 x 640, el perito puede, en este orden: (1) ocultar el lema con `@media (max-height: 700px)` (es decorativo; el `h1` queda); (2) poner Case #n y la racha en la misma línea; (3) reducir la descripción de cada modo a una línea. Nunca por debajo de 16 px de cuerpo ni 44 x 44 px de control.
  - Cada ficha de reto mide al menos 44 px de alto, con el nombre en una línea y el estado (18 caracteres como máximo) en otra.
  - El desplegable abierto sigue en el flujo y es el único elemento que encoge (D-83).
- **R14. Caso de Headlines en vertical** [D-105, D-115]: filas `auto minmax(0, 1fr) auto` (cabecera, escena, botones). `#caso-escena` deja de ser una celda superpuesta: con `#app[data-reto="titulares"]` es una columna con `#recorte` y, en veredicto, `#veredicto`. Titular con `--fuente-titulos` y `clamp()` (20 px como mínimo); entradilla de 16 px como mínimo. Los votos, en una fila abajo, como en Images. **Aviso de ausencia**: `#caso-aviso` va en la cabecera, ocupa el hueco que en Images deja el temporizador, con 14 px como mínimo (como el pie de créditos, D-37), contraste AA y 2 líneas como máximo a 360 px; no se superpone al recorte. Si en la prueba 1 con el aviso y textos máximos no cupiera, el perito reduce primero el titular hacia su mínimo de 20 px y, si aún no cabe, se aplica R13.
- **R15. Caso de Headlines en horizontal**: como R7, con la escena (recorte y veredicto) a la izquierda y cabecera (con `#caso-aviso`) y botones a la derecha.
- **R16. Veredicto de Headlines**: la entradilla se oculta por CSS (`#pantalla-caso[data-fase="veredicto"] #recorte-entradilla`) para dejar sitio (DP-47; completa en el diálogo del resultado). El sello se superpone a la tarjeta del recorte (posición absoluta, no ocupa alto propio); el de IA, `#veredicto[data-verdad="generada"]`, es muy visible (banda o sello grande en rojo con contraste AA, también sin color gracias al texto). Debajo, en el flujo: pie, fuente o confesión (recortada a 90 caracteres) y Read full confession. `#caso-aviso` está oculto en el veredicto.
- **R17. Resultado de Headlines**: como R9, con los 5 `button.miniatura` numerados en una fila (44 x 44 px como mínimo cada uno, número grande e icono), y Share y Back en una fila.
- **R18. Textos largos**: con titular de 110 caracteres y entradilla de 280 (los máximos del importador), las dos fases caben sin scroll en los tamaños garantizados, **también la pregunta de la prueba 1 con `#caso-aviso`**. Si no cupieran (zoom, texto ampliado, pantallas menores), se aplica R13: la sección se desplaza por dentro; nunca se recorta ni se oculta texto.
- **R11. Diálogo**: igual; `#ficha-recorte` con el titular en `--fuente-titulos`.

### 2.7 creditos.html [D-39, D-111]

Como en la 1.3 y, tras `creditos-imagenes`, una sección nueva:
```html
<section id="creditos-noticias">
  <h2>{creditos.noticias}</h2>
  <p>{creditos.noticias_intro}</p>
  <ul id="creditos-medios"><li>{medio}</li>…</ul>      <!-- o <p>{creditos.sin_noticias}</p> sin intro -->
  <p id="creditos-ficcion">{creditos.ficcion}</p>
</section>
```
- `{medio}`: dominios (`medioDeUrl`) de las fuentes de todas las noticias auténticas de **todos** los archivos `data/titulares/*.json` [D-116], sin repetir y en orden alfabético, como texto (sin enlaces), sin relación con ningún titular, día ni mes.
- `creditos.ficcion` aclara que las noticias generadas son ficción creada para el juego.
- Ids nuevos: `creditos-noticias`, `creditos-medios`, `creditos-ficcion`. Sin script, sin `style`, sin recursos externos.
