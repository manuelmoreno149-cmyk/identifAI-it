# identifAI-it: especificación técnica

**Versión 2.1, del 2026-10-26** [D-120], con los ajustes del 2026-10-27 (D-131 a D-140, sin subir versión: D-44). Parte de la 2.0 (2026-10-25, con los ajustes D-115 a D-119) y **sustituye el segundo reto, Headlines, por Fact or Fake**, por decisión del usuario:
- **Dos retos**: **Images** (`imagenes`, sin cambios, con sus tres modos) y **Fact or Fake** (`afirmaciones` [D-121]: 5 afirmaciones de una frase al día; el jugador decide FACT o FAKE, con las teclas F y K [D-122]; sin modos ni temporizador). Cada reto tiene sus 5 casos, su intento, su racha, su `ya-jugado`, su conjunto de mensajes finales [D-134, D-138] y su texto de compartir; la portada sigue siendo el centro, con un lema común [D-98, D-99, D-100, D-133].
- **Un solo tema por día**, común a los dos retos: las afirmaciones van en `entrada/temas/NN-tema/facts.txt` (o `facts.en.txt`), junto a las imágenes [D-123].
- **Datos**: afirmaciones y aclaraciones ofuscadas en bloques de longitud fija, en un archivo por mes, `data/facts/AAAA-MM.json` versión 1 (sustituye a `data/titulares/`); el juego normal solo carga el mes de la fecha efectiva y el modo prueba, todos [D-116, D-117, D-124]. **Sin fuentes**: Fact or Fake no tiene campo `source` ni banco privado; el usuario comprueba la veracidad él mismo [D-131].
- **Tras responder**: sello FACT o FAKE, la frase con la verdad (`truth`) y de 0 a 3 detalles; sin enlaces [D-126]. Marca fija en la tarjeta: "identifAI-it · Fact or Fake?" [D-128].
- **Se mantienen** de Headlines: la regla de la ausencia de más de 3 s seguidos (`OCULTA_MAX_MS`, medida al volver) y su aviso, el bloqueo de selección y copia, el intento que se gasta en Start y los 5 botones numerados del resultado [D-101, D-102, D-115].
- **Se eliminan** titulares, entradillas, fuentes visibles y enlaces, medios, créditos de medios, el sello "AI-GENERATED · NOT A REAL STORY" y la confesión de Headlines.
- **Norma de contenido** nueva: nada falso sobre salud, seguridad, tragedias ni política; las falsas pueden alterar cifras o récords de personas y marcas famosas si no dañan su reputación (texto exacto y lista de revisión de 8 puntos en 4.13) [D-127, D-131, D-136, D-137].
- Sin cambios: lanzamiento configurable y aplazado (`lanzamiento: null`), calendario versión 4, banco de imágenes versión 3, almacén `identifaiit.v3` (con `afirmaciones` en lugar de `titulares`), modo prueba e idioma (solo en-US en la interfaz) [D-93, D-95, D-96, D-109, D-110].

La especificación se reparte en varios archivos de `docs/`, que forman un único documento con la misma versión [D-91, D-114, D-130]:

| Archivo | Secciones |
|---|---|
| `docs/ESPECIFICACION.md` (este) | 0. Glosario y estructura · 1. Pantallas y estados · 2. Contrato HTML/CSS |
| `docs/especificacion/3-modulos.md` | 3. Módulos JS |
| `docs/especificacion/4-datos.md` | 4.1–4.6 Datos y herramientas de Images y del lanzamiento · 5. Algoritmo diario · 6. Almacenamiento · 7. Compartir |
| `docs/especificacion/4b-facts.md` | 4.7–4.14 Datos (archivos mensuales), carga, ofuscación, entrada (con convenciones de contenido), importador, validación, norma de contenido y créditos de Fact or Fake |
| `docs/especificacion/8-criterios.md` | 8. Criterios de aceptación |
| `docs/especificacion/9-tareas.md` | 9. Plan de tareas (con las tareas hechas que hay que adaptar), riesgos y cambios fuera de `docs/` |

(`docs/especificacion/4b-titulares.md` queda retirado y se borra en el commit de esta versión.)

Este documento es la fuente de verdad técnica. Si algo no está aquí, no se inventa: se pregunta o se registra en `docs/DECISIONES.md`. Las reglas de `CLAUDE.md` prevalecen. **Atención**: `CLAUDE.md` ya describe Fact or Fake, pero todavía cita el campo `source`, las fuentes privadas y `herramientas/banco-afirmaciones.json`, retirados por D-131, y la norma de contenido anterior a D-136 (que prohibía todo lo falso sobre personas reales) (cambios en `9-tareas.md`, 9.6). Hasta que el usuario actualice `CLAUDE.md` y `.claude/` y confirme (requisito P6, DP-60), nadie implementa las tareas 82 en adelante ni las pendientes que tocan el segundo reto.

Las marcas **[D-nn]** remiten a `docs/DECISIONES.md`. La versión solo sube cuando cambia el comportamiento del juego [D-44].

## 0. Glosario, convenciones y estructura

| Término | Significado |
|---|---|
| Reto | Juego diario independiente. Ids internos: `imagenes` (texto visible "Images") y `afirmaciones` ("Fact or Fake") [D-98, D-121]. |
| Caso del día | Las 5 pruebas de un reto en una fecha. Tiene un número `n` (Case #n), **común a los dos retos** (días desde el lanzamiento + 1) [D-99], y un **tema común** a los dos retos (el de la carpeta `entrada/temas/NN-tema/`) [D-123]. |
| Lanzamiento | Fecha ISO del Caso #1 de los dos retos, o `null` mientras el usuario no la decide. Vive solo en `data/calendario.json` y solo se cambia con `npm run lanzamiento` [D-95]. |
| Tema | Asunto común de las pruebas de un día, del nombre de su carpeta de entrada. No revela la verdad [D-52, D-53]. |
| Prueba | Cada uno de los 5 elementos del caso, índice `i` de 0 a 4. En Images es una imagen; en Fact or Fake, una **afirmación**. |
| Afirmación | Frase única que el jugador juzga (campo `claim`), de 1 a 140 caracteres [D-124]. |
| Aclaración | La frase con la verdad (campo `truth`, 1 a 160 caracteres) y sus **detalles** (campo `details`, de 0 a 3, de 1 a 80 caracteres cada uno). Solo se revela tras responder [D-126]. |
| Verdad | `0` = auténtica (foto real en Images, **FACT** en Fact or Fake), `1` = generada (IA en Images, **FAKE** en Fact or Fake). Solo en memoria y ofuscada en los datos [D-122]. |
| Voto | `"autentica"` o `"generada"`, igual en los dos retos. Botones y teclas: Images REAL (R) y AI (I); Fact or Fake FACT (F) y FAKE (K) [D-122]. |
| Código de resultado | `A` acierto, `F` fallo, `-` pendiente. En Fact or Fake, una ausencia de más de `OCULTA_MAX_MS` da `F` [D-101, D-115]. |
| Mensaje final | Frase policíaca del resultado según los aciertos (0 a 5). Cada reto tiene su conjunto: `final.mensajes` (Images) y `final.mensajes_afirmaciones` (Fact or Fake, valores exactos y aprobados en 3.1 [D-138]), elegido con `mensajesDelReto` [D-134]. |
| Ausencia | Solo Fact or Fake: tramo **seguido** en que `document.visibilityState` vale `'hidden'` empezado durante una pregunta con la afirmación pintada y sin responder. Se mide al volver con `medirOculta` y es fallo si `ocultacionEsFallo(ocultoMs)` (más de `OCULTA_MAX_MS = 3000` ms). Las ausencias no se suman [D-115]. |
| Sellado | Solo Images (`normal` y `perro`): al agotarse la observación la imagen se tapa y se responde sin límite [D-77]. |
| Ficha | Lo que se revela tras responder. Images: prompt o "Real photograph" [D-85]. Fact or Fake: `{aclaracion, detalles}` [D-124]. Siempre ofuscada y rellenada. |
| Tarjeta | `article#afirmacion` del DOM, con la afirmación y la marca fija [D-126]. |
| Fecha ISO | `AAAA-MM-DD` en hora **local**. |
| Mes de datos | `AAAA-MM`. El de un día `n` es `mesDeNumero(lanzamiento, n)`; el que carga el juego normal (y la previsualización) es `mesDeFecha(fecha efectiva)`, y el modo prueba carga todos [D-117]. Los datos de Fact or Fake de ese mes están en `data/facts/{mes}.json` [D-124]. |
| Modo | Solo Images: `investigador` (sin límite), `normal` (3000 ms), `perro` (1000 ms) [D-81]. |
| Previsualización | Solo en `localhost`, `127.0.0.1` o `[::1]`: `?fecha=` fija la fecha efectiva y no se guarda nada [D-68]. Con `lanzamiento: null` lleva a `sin-casos`. |
| Modo prueba | Con `?prueba=1` y `PRUEBAS_ABIERTAS = true`: selector de día (común a los dos retos), elección de reto, almacén en memoria [D-70, D-110]; carga todos los meses de `data/facts/` [D-117]. Funciona aunque no haya lanzamiento. Se apaga antes del lanzamiento (tarea 44) [D-97]. |
| Fecha efectiva | La de la previsualización; si no, la del día elegido en modo prueba (`fechaDelDia(lanzamiento ?? FECHA_BASE_PRUEBA, n)`); si no, `fechaLocal(new Date())`. Fuera del modo prueba, su mes decide qué archivo de `data/facts/` se carga. |

(Desaparece el término "Fuente" de la 2.1 original: Fact or Fake no registra fuentes, D-131.)

### 0.1 Convenciones obligatorias

- **Palabras prohibidas.** `real`, `ia`, `ai` y `fake` no pueden aparecer en ids, clases, atributos `data-*` (nombres ni valores), nombres de archivo, rutas ni `alt` de nada publicado, ni en el `tema` de ningún día [D-53].
  - Se comprueban **por palabra completa** sin distinguir mayúsculas (`contienePalabraProhibida` de `herramientas/temas.mjs`). Única excepción literal: `identifAI-it` [D-23].
  - `afirmaciones`, `afirmacion`, `aclaracion`, `detalles` y la carpeta `data/facts/` ("facts" no es "fake") cumplen la regla [D-121].
  - El texto visible ("REAL", "AI", "FACT", "FAKE", "Fact or Fake", "Real photograph", el lema "Two cases a day. Spot the fake.") no es un nombre ni una ruta. Fichas, afirmaciones y aclaraciones nunca aparecen en claro en lo publicado.
  - En `entrada/` (no publicada) sí aparecen `ia/`, `real/` y `answer: fact|fake` de `facts.txt`.
- Los ids aleatorios de imagen (10 caracteres) se comprueban además por subcadena.
- La verdad y el voto se nombran siempre `autentica`/`generada` (o `0`/`1`) en código, datos y marcado, también en Fact or Fake [D-02, D-122].
- Rutas siempre relativas y sin `/` inicial (también `data/facts/{mes}.json`).
- **Ninguna petición a dominios externos** [D-29]. Fact or Fake no tiene enlaces externos [D-126].
- Los textos visibles salen de `js/textos.js`. Temas, fichas, afirmaciones, aclaraciones y detalles son datos; solo se insertan con `textContent`.

### 0.2 Estructura de carpetas

| Ruta | Se publica | Contenido |
|---|---|---|
| `index.html` | sí | Todas las pantallas y el diálogo de ficha. |
| `creditos.html` | sí | Créditos estáticos, sin JS, generados por `herramientas/creditos.mjs` [D-39, D-129]. |
| `.nojekyll` | sí | Vacío. |
| `css/variables.css`, `css/base.css`, `css/componentes.css` | sí | |
| `fonts/` | sí | Sin cambios [D-29, D-40]. |
| `js/` | sí | `main.js`, `juego.js`, `temporizador.js`, `diario.js`, `almacen.js`, `compartir.js`, `textos.js`. Sin archivos nuevos. |
| `img/ui/` | sí | Los de la 1.3. Ningún SVG nuevo obligatorio (los sellos FACT y FAKE son texto con estilo). |
| `casos/` | sí | `{id}.webp`, solo Images. |
| `data/calendario.json` | sí | Images y fecha de lanzamiento: **versión 4** [D-96]. |
| `data/facts/AAAA-MM.json` | sí | Fact or Fake, todo ofuscado: **versión 1**, un archivo por mes de datos [D-124]. Sin afirmaciones, la carpeta no tiene archivos (o no existe). No hay índice de meses [D-117]. **No existe** `data/titulares/` [D-120]. |
| `herramientas/*.mjs` | sí (repositorio) | `temas.mjs`, `importar.mjs`, `creditos.mjs`, `validar.mjs`, `lanzamiento.mjs` y, renombrados o nuevos en la 2.1, `afirmaciones.mjs` (antes `titulares.mjs`) e `importar-afirmaciones.mjs` [D-123]. |
| `herramientas/banco.json` | **no** | Banco de imágenes, **versión 3** (sin `fecha`) [D-96]. |
| `herramientas/banco.anterior.json`, `herramientas/lote.json` | **no** | Sin cambios. |
| `entrada/temas/NN-tema/{ia,real}/` | **no** | Imágenes y prompts (sin cambios, D-85, D-93). |
| `entrada/temas/NN-tema/facts.txt` o `facts.en.txt` | **no** (`entrada/` en `.gitignore`) | Las 5 afirmaciones del día, con el mismo tema que las imágenes [D-123]. Ya no existe `entrada/titulares/`. |
| `entrada/temas/NN-tema/datos.txt` y `datos.original.txt` | **no** | Notas de trabajo del usuario en texto libre (`datos.original.txt`, opcional, es su copia sin tocar); el archivero convierte a mano `datos.txt` en `facts.en.txt`; ninguna herramienta los lee, modifica ni publica, y los dos importadores y `validar` los ignoran [D-139]. |
| `tests/` | sí (repositorio) | `*.test.mjs`. `tests/titulares.test.mjs` pasa a `tests/afirmaciones.test.mjs`; sigue `tests/lanzamiento.test.mjs`. |
| `package.json` | sí | Scripts `test`, `validar`, `importar`, `creditos`, `lanzamiento` y, nuevo, `afirmaciones` (no hay script `titulares`). |
| `docs/` | sí | `ESPECIFICACION.md`, `especificacion/*.md` (con `4b-facts.md`) y `DECISIONES.md`. |

No existe `herramientas/banco-afirmaciones.json` [D-131].

---

## 1. Pantallas y estados

### 1.1 Pantallas

| Pantalla (`data-pantalla`) | Contenido |
|---|---|
| `iniciando` | Transitorio mientras se cargan el almacén, `data/calendario.json` y el archivo de afirmaciones del mes de la fecha efectiva (`data/facts/{mes}.json`) o, en modo prueba, todos los meses, en serie (4.7.2). Sin sección. |
| `portada` | Título, lema (común a los dos retos), Case #n, selector de día (modo prueba), **selector de reto** con el estado de cada uno, tema del día, selector de modo (**solo Images**) o regla de Fact or Fake, racha del reto elegido, botón Start / View report, Cómo jugar (pasos del reto elegido) y pie con Credits [D-98, D-133]. |
| `cargando` | Solo Images: precarga de las 5 imágenes. |
| `cuenta-atras` | Solo Images: 3, 2, 1. |
| `caso` | Images: como en la 1.3. Fact or Fake: tema, Claim i/5, marcador, aviso de ausencia (solo en la pregunta de la prueba 1) [D-115], tarjeta (afirmación + marca) y botones FACT / FAKE, sin temporizador. Fases `pregunta` y `veredicto`. |
| `resultado` | Reto y caso, aciertos x/5, mensaje **del conjunto del reto** [D-134], 5 miniaturas (Images) o 5 botones numerados (Fact or Fake) que abren la ficha, rachas del reto, Share y Back [D-89, D-126]. |
| `ya-jugado` | Del reto elegido: reto y caso, aciertos, cuadros, modo (solo Images), racha, cuenta atrás a medianoche, Share y Back. |
| `sin-casos` | Ningún reto tiene caso hoy, o no hay fecha de lanzamiento (texto propio) [D-24, D-95]. |
| `error` | No se pudo cargar `data/calendario.json`, un archivo de `data/facts/` (salvo que no exista: un 404 deja Fact or Fake sin caso o, en modo prueba, cierra la lista de meses; no es error) o alguna imagen. Reintentar. |

- El veredicto es una fase de `caso` [D-05]. `dialog#ficha` es una ventana modal sobre `caso/veredicto` (solo Images, para la confesión) o `resultado`, sin cambio de estado [D-88].
- Fact or Fake **reutiliza** las pantallas `caso`, `resultado` y `ya-jugado`; no hay pantallas nuevas. `#app[data-reto]` distingue el reto.

### 1.2 Estado del juego

Un único objeto de estado, gestionado por la función pura `transicion(estado, evento)` de `js/juego.js`:

```js
{
  pantalla: 'portada',
  fase: null,                   // 'pregunta' | 'veredicto' | null (solo en 'caso')
  reto: 'imagenes',             // 'imagenes' | 'afirmaciones' [D-98, D-121]
  modo: 'normal',               // modo de Images; en afirmaciones no se usa
  retos: {                      // resumen del día por reto [D-98]
    imagenes:     { caso: {n, fecha, tema, pruebas, clave, fichas} | null, jugado: false },
    afirmaciones: { caso: {n, fecha, tema, clave, textos, fichas} | null, jugado: false }
  },
  // Copia del caso del reto elegido (CARGADO, ELEGIR_RETO, VOLVER_PORTADA):
  n: 3, tema: 'Fireworks',
  pruebas: ['k3x9q2m7ab', ...], // Images; null en afirmaciones
  textos: null,                 // Fact or Fake: 5 bloques ofuscados de afirmación (684 car.); null en imagenes
  clave: 'Mpb9Ycc=',
  fichas: ['…', ...],           // 5 × 684 car. en los dos retos
  fecha: null,                  // fecha de la partida: FIN_CUENTA (Images) o EMPEZAR (Fact or Fake)
  indice: 0,
  resultados: '-----',
  activo: false,                // se aceptan votos (de PINTADA al voto)
  tapada: false,                // solo Images [D-77]
  texto: null,                  // Fact or Fake: afirmación descifrada de la prueba actual (string | null), solo en 'caso'
  revelada: null,               // verdad de la prueba actual, solo en 'veredicto'
  ficha: null,                  // solo en 'veredicto'. Images: string | null; Fact or Fake: {aclaracion, detalles} | null
  motivo: null,                 // Fact or Fake: 'oculta' si el fallo vino de una ausencia de más de OCULTA_MAX_MS; si no, null
  error: null                   // 'calendario' | 'imagenes' | null
}
```

- `jugado` significa "el intento de hoy de ese reto está gastado": partida `terminada` o `en_curso` en otra pestaña.
- `texto` solo contiene la afirmación actual: el estado nunca guarda más de una afirmación descifrada.
- **El estado no guarda instantes ni duraciones de ausencia** [D-115], ni el mensaje final (se calcula al pintar el resultado).
- La previsualización y el modo prueba no añaden campos [D-117].

### 1.3 Eventos y transiciones

| Estado actual | Evento | Condición | Estado siguiente / efecto |
|---|---|---|---|
| `iniciando` | `CARGADO` `{retos, reto}` | `retos.imagenes.caso` y `retos.afirmaciones.caso` son `null` | `sin-casos` |
| `iniciando` | `CARGADO` | en otro caso | `portada`. `reto` = el pedido si es válido y tiene caso; si no, el otro. Copia el caso de ese reto [D-98]. Antes, main.js cierra como abandonada (pendientes → `F`) cualquier partida `en_curso` de hoy de cada reto [D-79]. |
| `iniciando` | `ERROR_CALENDARIO` | falla `calendario.json` o un archivo de `data/facts/` (red, respuesta distinta de 2xx y de 404, JSON o estructura no válidos, `mes` que no cuadra) | `error` (`'calendario'`). Un 404 **no** es error (4.7.2). |
| `portada` | `ELEGIR_RETO` `{reto}` | `retoValido(reto)` y distinto del actual | `portada` con ese reto y su caso copiado (`n`, `tema`, `pruebas`, `textos`, `clave`, `fichas`; `null` si no tiene). main.js guarda `ajustes.reto`. Si no, el mismo objeto. |
| `portada` | `ELEGIR_MODO` `{modo}` | `modoValido(modo)` | como en la 1.3 (solo se ve en Images). |
| `portada` | `EMPEZAR` `{fecha}` | `retos[reto].caso === null` | el mismo objeto (el botón está `disabled`). |
| `portada` | `EMPEZAR` | `retos[reto].jugado` | `ya-jugado` (de ese reto) [D-99]. |
| `portada` | `EMPEZAR` | reto `imagenes` | `cargando` (main.js cierra Cómo jugar) [D-83]. |
| `portada` | `EMPEZAR` `{fecha}` | reto `afirmaciones` | `caso`, `fase: 'pregunta'`, `indice: 0`, `resultados: '-----'`, `activo: false`, `fecha` = la del evento, `texto = desofuscarAfirmacion(textos[0], clave, n, 0)`, `motivo: null`. **Se consume el intento**: main.js guarda la partida `en_curso` antes de pintar la primera afirmación [D-100]. En la prueba 1 se ve el aviso de ausencia (2.3). |
| `cargando`, `error`, `cuenta-atras` | `PRECARGA_OK`, `PRECARGA_ERROR`, `REINTENTAR`, `FIN_CUENTA` | | Como en la 1.3 (solo se llega en Images). |
| `caso/pregunta` | `PINTADA` | `activo === false` | `activo: true`. En Images, main.js arranca el temporizador salvo en `investigador`; en Fact or Fake no hay temporizador. |
| `caso/pregunta` | `VOTO` `{voto}` | `activo === true` | `veredicto`, código `A`/`F`, `revelada`, `activo: false`, `tapada: false`, `motivo: null`. `ficha`: Images, `desofuscarFicha(...)`; Fact or Fake, `desofuscarAclaracion(fichas[i], clave, n, i)`. |
| `caso/pregunta` | `VOTO` | `activo === false` | el mismo objeto |
| `caso/pregunta` | `AGOTADO` | Images, `activo`, no tapada, modo con límite | `tapada: true` [D-77] |
| `caso/pregunta` | `AGOTADO` | cualquier otra situación (también Fact or Fake) | el mismo objeto |
| `caso/pregunta` | `VOLVIO` `{ocultoMs, indice}` | reto `afirmaciones`, `activo === true`, `indice === estado.indice` y `ocultacionEsFallo(ocultoMs)` | `veredicto` con código **`F`**, `revelada`, `ficha` (como en `VOTO`), `activo: false`, `motivo: 'oculta'` [D-101, D-115] |
| `caso/pregunta` | `VOLVIO` | cualquier otra situación | el mismo objeto |
| `caso/veredicto` | `SIGUIENTE` | `indice < 4` | `caso/pregunta`, `indice + 1`, `revelada`, `ficha` y `motivo` a `null`, `activo: false`, `tapada: false`; en Fact or Fake, `texto` = la afirmación siguiente. |
| `caso/veredicto` | `SIGUIENTE` | `indice === 4` | `resultado`, `fase: null`, `texto`, `revelada` y `ficha` a `null`, `retos[reto].jugado = true`. main.js guarda la partida `terminada` y las rachas del reto. |
| `resultado`, `ya-jugado` | `VOLVER_PORTADA` | | `portada` con el mismo `reto` y su caso copiado; `fase`, `fecha`, `texto`, `revelada`, `ficha`, `motivo` a `null`, `indice: 0`, `resultados: '-----'`. |
| cualquiera salvo `iniciando`, `error`, `sin-casos` | `OTRA_PESTANA` `{reto}` | otra pestaña ha empezado o terminado ese reto hoy [D-51] | `retos[reto].jugado = true`; si `reto === estado.reto` y la pantalla es `portada`, `cuenta-atras` o `caso` → `ya-jugado`. Reto inválido → el mismo objeto. |
| `resultado`, `ya-jugado` | `COMPARTIR` | | sin cambio de estado (efecto en main.js) |
| `ya-jugado`, `sin-casos`, `portada` | `MEDIANOCHE` | la fecha efectiva ha cambiado | `iniciando`: main.js vuelve a cargar `data/calendario.json` y el archivo de `data/facts/` del mes de la nueva fecha. |
| cualquiera | evento no listado (incluidos `VER_COMO_JUGAR`, `ENTENDIDO` y `OCULTA`) | | el mismo objeto |

Reglas adicionales:
- **Un intento al día por reto** [D-99]; Images, uno para sus tres modos [D-32].
- **Portada como centro** [D-98]: recargar con un reto jugado lleva a la portada ("Filed · 4/5", botón View report → `ya-jugado`). `resultado` solo se ve una vez.
- **Reto jugado y el otro no**: la portada muestra los dos estados. Un reto sin caso hoy muestra "No case today" y deja Start `disabled`.
- **Teclado** [D-122]: en `caso/pregunta`, `votoDeTecla(estado.reto, tecla)` decide el voto: R e I solo en Images; F y K solo en Fact or Fake (D-132, antes DP-58). Con Ctrl, Alt o Meta pulsadas no se trata ninguna tecla del juego (Ctrl+F y Ctrl+K son atajos del navegador). Enter sigue con Next en los dos.
- **Pestaña oculta en Images** [D-78]: sin efecto. `VOLVIO` se ignora.
- **Pestaña oculta en Fact or Fake** [D-101, D-115], igual que en la 2.0 con `afirmaciones` en lugar de `titulares`:
  - **Empieza** en el `visibilitychange` a `hidden` si `estado.reto === 'afirmaciones'`, pantalla `caso`, fase `pregunta` y `activo === true`. main.js apunta `{perf: performance.now(), fecha: Date.now()}` y el `indice`. En cualquier otra situación no empieza ninguna ausencia.
  - **Termina** en el siguiente `visibilitychange` a `visible`: `ocultoMs = medirOculta(inicio, ahora)`, se borra el inicio y se despacha `VOLVIO {ocultoMs, indice}`.
  - **Umbral** `OCULTA_MAX_MS = 3000`: con 3000 ms o menos no pasa nada (sigue en pregunta, sin aviso y sin guardar nada); con más, la prueba es `F` (`motivo: 'oculta'`), se guarda en el acto y al volver se ve su veredicto (sello, aclaración y detalles) con el texto `afirmaciones.oculta` y el foco en Next.
  - **Ausencias seguidas, no acumuladas** (riesgo R12).
  - **Se mide al volver** (los navegadores estrangulan o congelan los temporizadores de las pestañas ocultas); no hay temporizador ni evento `OCULTA`.
  - **Reloj**: el mayor de los intervalos de `performance.now()` y `Date.now()`.
  - **Si la página no vuelve**: al reabrir, la partida `en_curso` se cierra como abandonada [D-79].
  - **Orden al volver**: primero `VOLVIO` (y su guardado), después lo de la 1.3.
  - Perder el foco sin ocultar la pestaña no se detecta.
- **Partida abandonada**: pendientes → `F`, en los dos retos [D-79].
- **Medianoche durante la partida**: la partida usa los datos ya cargados (también si cruza de mes). `MEDIANOCHE` solo se procesa en `portada`, `ya-jugado` y `sin-casos`.
- **Veredicto**: avance manual con Next o Enter [D-27].
- **Ficha y texto**: `texto` solo existe en `caso`; `ficha`, solo en `veredicto`. En `resultado`, main.js descifra lo de cada botón solo al abrirlo. Nada de eso se guarda [D-88].
- **Tema**: no se guarda ni se comparte [D-54]. Es el mismo para los dos retos del día.
- **Previsualización y modo prueba**: la tabla no cambia. En modo prueba la URL lleva `&reto=` (`imagenes` o `afirmaciones`) [D-110].

### 1.4 Diagrama

```
iniciando ──► portada (reto: imagenes | afirmaciones) ──► sin-casos / error
               │ ELEGIR_RETO / ELEGIR_MODO (portada)
               │ EMPEZAR, reto jugado ─────────────────────────────► ya-jugado
               │ EMPEZAR, imagenes ──► cargando ──► cuenta-atras ──FIN_CUENTA──┐
               │ EMPEZAR, afirmaciones ─────────────────────────────────────────┤
               ▼                                                                ▼
                     caso[i]/pregunta ──VOTO / VOLVIO >3000 ms (solo afirmaciones)──► caso[i]/veredicto
                     (imagenes: AGOTADO → tapada; VOLVIO ≤3000 ms: sin cambio)        │ SIGUIENTE i<4 → caso[i+1]
                                                                                      ▼ i = 4
                                                                                  resultado
resultado / ya-jugado ──VOLVER_PORTADA──► portada
portada / ya-jugado / sin-casos ──MEDIANOCHE──► iniciando (recarga calendario y mes de data/facts/)
portada (modo prueba) ──Open this day──► ?prueba=1&dia=n&reto=r (recarga) ──► iniciando (calendario y todos los meses)
```

---

## 2. Contrato HTML/CSS

El Perito Visual crea marcado y estilos; el Agente de Campo solo usa los ganchos de esta sección. Ningún otro id, clase o atributo es estable. Cualquier cambio pasa por el inspector-jefe y DECISIONES.

### 2.1 Mecanismo de pantallas

- `<main id="app" data-pantalla="portada" data-reto="imagenes" data-modo="normal">`: main.js mantiene al día `data-pantalla`, `data-reto` (`imagenes|afirmaciones`) y `data-modo`. CSS usa `data-reto` para la composición de cada reto (temporizador y sobre solo en Images, tarjeta solo en Fact or Fake).
- Cada pantalla es `<section class="pantalla" id="pantalla-{nombre}" hidden>`; solo una sin `hidden`. Además de las secciones, main.js solo cambia `hidden` en los elementos que este contrato indica.
- Foco al cambiar de pantalla: `data-foco` o el primer `h1`/`h2` [D-41].

### 2.2 Atributos genéricos

| Atributo | Dónde | Uso |
|---|---|---|
| `data-texto="grupo.clave"` | elementos con texto fijo | Como en la 1.3. |
| `data-accion` | `<button>` | `empezar`, `siguiente`, `compartir`, `reintentar`, `leer-confesion` (solo Images), `ver-ficha`, `cerrar-ficha`, `volver-portada` y, en modo prueba, `abrir-prueba`. |
| `data-voto="autentica"` / `"generada"` | botones de respuesta | Fijos, comunes a los dos retos [D-122]. |
| `data-foco` | uno por pantalla | |
| `data-estado="acierto\|fallo"` | `#veredicto` y cada `button.miniatura` | Resultado del jugador. Ausente antes de responder. |
| `data-verdad="autentica\|generada"` | `#veredicto` | Solo en fase `veredicto` (estilo del sello: FACT o FAKE, REAL o AI). Ausente en `pregunta`. |
| `data-fase`, `data-tapada` | `#pantalla-caso` | Como en la 1.3; en Fact or Fake, `data-tapada` siempre `no`. |
| `data-nivel`, `--restante` | `#temporizador` | Solo Images. |
| `data-prueba="1".."5"` | `button.miniatura` | Posición. |
| `data-visible` | `#compartir-aviso` | |
| `data-pagina` | `<body>` | `juego` o `creditos`. |

Clases: `.solo-lectores`; estructurales `.pantalla`, `.prueba-img`, `.boton-texto`, `.miniatura` y `.miniatura-numero`. Los estados van en `data-*` [D-03].

Temas, afirmaciones, aclaraciones, detalles y fichas solo como `textContent` en los elementos que se citan aquí. Nada de eso va en ids, clases, otros atributos, `alt` ni rutas.

### 2.3 Elementos por pantalla

**Portada** (`#pantalla-portada`), en este orden del DOM:
- `h1 data-texto="portada.titulo"`, `p.portada-lema data-texto="portada.lema"` (texto exacto, común a los dos retos: "Two cases a day. Spot the fake." [D-133]; no cambia al elegir reto) y `#portada-caso` ("Case #n"; `hidden` si `estado.n` es `null`).
- `#selector-prueba` (solo en modo prueba; lo crea main.js **justo después de `#portada-caso`**) con el marcado de D-70. Las `option` llevan `value = String(n)` y texto `rellenar(prueba.opcion, {n, tema})`, con `tema` = el tema del día (si los dos retos lo tienen y, por error, difiere, los dos unidos por " / ").
- Selector de reto [D-98, D-121]:
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
        <input type="radio" name="reto" id="reto-afirmaciones" value="afirmaciones">
        <label for="reto-afirmaciones">
          <span class="reto-nombre" data-texto="portada.reto_afirmaciones">[[portada.reto_afirmaciones]]</span>
          <span class="reto-estado" id="reto-afirmaciones-estado"></span>
        </label>
      </div>
    </div>
  </fieldset>
  ```
  - Dos fichas en **una fila** en todos los tamaños garantizados (el nombre más largo, "Fact or Fake", cabe en una línea), radios nativos, foco visible, flechas entre ellas.
  - `.reto-estado` (main.js, `textContent`): `portada.estado_sin_caso`, `portada.estado_jugado` (`{aciertos}`), `portada.estado_en_curso` o `portada.estado_pendiente`.
- `<p id="portada-tema">`: `portada.tema` con el tema del día del reto elegido (vacío si no tiene caso) [D-54].
- `<fieldset id="portada-modos">` como en la 1.3. main.js le pone `hidden` cuando el reto es `afirmaciones`.
- `<p id="portada-regla" data-texto="portada.regla_afirmaciones" hidden>`: regla breve (sin temporizador; salir de la página **más de unos segundos** antes de responder es fallo). main.js le quita `hidden` solo con `afirmaciones`.
- `#portada-racha`: racha del reto elegido (`hidden` si es 0).
- `button[data-accion="empezar"][data-foco]` con `<span class="boton-texto" id="portada-empezar-texto">`: `portada.boton_empezar`, o `portada.boton_ver_informe` si el reto está jugado. Sin caso, `disabled`.
- `details#como-jugar` como en la 1.3. main.js rellena `#como-jugar-pasos` con `como_jugar.pasos` (Images) o `como_jugar.pasos_afirmaciones` según el reto elegido [D-113].
- `footer#portada-pie` con `a#portada-creditos`, sin cambios.

**Cargando** y **Cuenta atrás**: sin cambios (solo Images).

**Caso** (`#pantalla-caso`):
- `header#caso-cabecera`: `#caso-tema`, `#caso-etiqueta` (`partida.etiqueta_prueba` en Images, `afirmaciones.etiqueta_prueba` en Fact or Fake), `#caso-marcador` y, último, el aviso de ausencia [D-115]:
  ```html
  <p id="caso-aviso" data-texto="afirmaciones.aviso_oculta" hidden>[[afirmaciones.aviso_oculta]]</p>
  ```
  - Texto exacto: "Leaving the page for more than a few seconds counts as a miss.".
  - main.js le quita `hidden` **solo** con `estado.reto === 'afirmaciones'`, `pantalla === 'caso'`, `fase === 'pregunta'` e `indice === 0`, y se lo devuelve en cualquier otro estado. Nunca se ve en Images.
  - Lectores de pantalla: main.js escribe una vez `afirmaciones.aviso_oculta` en `#temporizador-anuncio` tras `PINTADA` de la prueba 1 y lo vacía en `SIGUIENTE`.
- `<div id="caso-escena">` con, en orden, `#prueba-marco`, `#prueba-sobre`, **`#afirmacion`** y `#veredicto`.
- `#prueba-marco` y `#prueba-sobre`: como en la 1.3. En Fact or Fake, main.js pone `hidden` a `#prueba-marco` (y `#prueba-sobre` sigue con `hidden`).
- Tarjeta de la afirmación [D-102, D-126], vacía en el HTML:
  ```html
  <article id="afirmacion" hidden aria-labelledby="caso-etiqueta">
    <p id="afirmacion-texto"></p>
    <p id="afirmacion-marca" aria-hidden="true" data-texto="afirmaciones.marca">[[afirmaciones.marca]]</p>
  </article>
  ```
  - main.js le quita `hidden` solo en Fact or Fake (en las dos fases) y rellena `#afirmacion-texto` con `textContent` al empezar cada prueba; si `estado.texto` es `null`, recibe `afirmaciones.no_disponible`.
  - `#afirmacion-marca` muestra siempre "identifAI-it · Fact or Fake?" (exacto), igual en todas las pruebas, para que una captura de una afirmación falsa nunca circule sin contexto [D-128]. Es decorativa para lectores de pantalla.
  - **Bloqueo de copia** (freno casual): CSS `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;` en `#afirmacion`, y main.js registra una vez, en `#afirmacion`, oyentes de `copy`, `cut`, `contextmenu`, `dragstart` y `selectstart` con `preventDefault()`. Nada fuera de `#afirmacion` se bloquea [D-102].
  - **Accesibilidad**: texto real del DOM, sin `aria-hidden`, legible por lectores de pantalla y ampliable.
- `#veredicto` (`role="status"`, `aria-live="polite"`, `hidden` en pregunta), con `data-estado` y `data-verdad` solo en veredicto. Contiene, en orden:
  - `#veredicto-sello`: Images, `partida.sello_autentica|sello_generada`; Fact or Fake, `afirmaciones.sello_autentica` ("FACT") o `afirmaciones.sello_generada` ("FAKE").
  - `#veredicto-pie` (icono y `#veredicto-texto`): variante de `veredictos.acierto|fallo`, o de `afirmaciones.oculta` si `motivo === 'oculta'`.
  - Aclaración, nueva [D-126]:
    ```html
    <div id="veredicto-aclaracion" hidden>
      <p id="veredicto-aclaracion-texto"></p>
      <ul id="veredicto-detalles"></ul>
    </div>
    ```
    Solo en Fact or Fake y fase veredicto, main.js quita `hidden` a `#veredicto-aclaracion`, pone `ficha.aclaracion` en `#veredicto-aclaracion-texto` y crea un `<li>` sin atributos por detalle (`textContent`); con 0 detalles, el `ul` queda vacío y con `hidden`. Si `ficha` es `null`, el texto es `afirmaciones.aclaracion_no_disponible` y no hay detalles. Al salir del veredicto, vacía los dos y vuelve a ocultar el contenedor.
  - `#veredicto-confesion` (1.3): solo Images; con `hidden` en Fact or Fake (y con él, `leer-confesion`).
- `#temporizador` y `#temporizador-anuncio`: solo Images (CSS oculta `#temporizador` con `#app[data-reto="afirmaciones"]`; el anuncio queda vacío salvo el aviso de ausencia de la prueba 1).
- `#caso-botones` [D-122]: los dos votos y Next, comunes. Cada voto lleva texto y tecla por reto:
  ```html
  <button type="button" class="boton boton-voto" data-voto="autentica" aria-keyshortcuts="R">
    <span class="boton-texto" id="voto-autentica-texto"></span>
    <kbd id="voto-autentica-tecla" aria-hidden="true"></kbd>
  </button>
  <button type="button" class="boton boton-voto" data-voto="generada" aria-keyshortcuts="I">
    <span class="boton-texto" id="voto-generada-texto"></span>
    <kbd id="voto-generada-tecla" aria-hidden="true"></kbd>
  </button>
  ```
  Los `span` ya no llevan `data-texto`: main.js pone, en cada render de `caso`, el texto (`partida.boton_autentica|boton_generada` en Images; `afirmaciones.boton_autentica|boton_generada` en Fact or Fake), el contenido de `kbd` y `aria-keyshortcuts` con `teclaDeVoto(reto, voto)` (R/I o F/K).

**Resultado** (`#pantalla-resultado`):
- `<p id="resultado-reto">` antes de `#resultado-aciertos`: `rellenar(final.reto, {reto, n})` ("Fact or Fake · Case #12").
- `#resultado-aciertos` (`data-foco`), `#resultado-mensaje`, `#resultado-rachas` (del reto), `button[data-accion="compartir"]` y `button[data-accion="volver-portada"]` (`final.boton_volver`) en la misma `.acciones`.
- `#resultado-mensaje` [D-134]: `textContent` = `mensajeFinal(aciertos, mensajesDelReto(estado.reto, TEXTOS.final))`, es decir, `final.mensajes[aciertos]` en Images y `final.mensajes_afirmaciones[aciertos]` en Fact or Fake. Sin atributos que dependan del reto ni de los aciertos.
- `#resultado-revision`: Images, las 5 miniaturas de la 1.3. Fact or Fake:
  ```html
  <li>
    <button type="button" class="miniatura" data-accion="ver-ficha" data-prueba="3" data-estado="acierto" aria-haspopup="dialog">
      <span class="miniatura-numero" aria-hidden="true">3</span>
      <span class="solo-lectores">Claim 3: correct</span>
    </button>
  </li>
  ```
  Nombre accesible: `rellenar(afirmaciones.estado_prueba, {i, estado: final.estados[estado]})`. El icono, por CSS según `data-estado`. Ni la verdad ni la afirmación están en el marcado.

**Ya jugado** (`#pantalla-ya-jugado`): como en la 2.0 (`#ya-jugado-reto`, Back); `#ya-jugado-modo` lleva `hidden` en Fact or Fake. No muestra mensaje final.

**Sin casos**: `<p id="sin-casos-texto" tabindex="-1" data-foco>`: `sin_casos.sin_lanzamiento` si `lanzamiento === null`, o `sin_casos.texto` [D-95]. **Error**: sin cambios.

**Comunes**: `#compartir-aviso`, `#compartir-manual` con su `label`, `#aviso-almacen` y `#aviso-previsualizacion` (`avisos.previsualizacion` o `avisos.prueba`).

**Diálogo `#ficha`** [D-88, D-126]:
```html
<dialog id="ficha" aria-labelledby="ficha-titulo">
  <h2 id="ficha-titulo"></h2>
  <img id="ficha-img" alt="" width="1080" height="1350" hidden>
  <p id="ficha-afirmacion" hidden></p>
  <p id="ficha-era"></p>
  <h3 id="ficha-confesion-titulo" data-texto="confesion.titulo">[[confesion.titulo]]</h3>
  <p id="ficha-texto"></p>
  <div id="ficha-aclaracion" hidden>
    <p id="ficha-aclaracion-texto"></p>
    <ul id="ficha-detalles"></ul>
  </div>
  <button type="button" id="ficha-cerrar" class="boton" data-accion="cerrar-ficha">
    <span class="boton-texto" data-texto="ficha.cerrar">[[ficha.cerrar]]</span>
  </button>
</dialog>
```
- Images: como en la 1.3 (`#ficha-afirmacion` y `#ficha-aclaracion` con `hidden`).
- Fact or Fake, solo desde `ver-ficha` en `resultado` (en el veredicto todo cabe y no hay `leer-confesion`): `#ficha-titulo` = `afirmaciones.estado_prueba`; `#ficha-afirmacion` visible con la afirmación (`desofuscarAfirmacion`); `#ficha-era` = `rellenar(final.era, {sello})` con el sello FACT o FAKE; `#ficha-confesion-titulo` y `#ficha-texto` con `hidden`; `#ficha-aclaracion` visible con aclaración y detalles (`desofuscarAclaracion`; si es `null`, `afirmaciones.aclaracion_no_disponible`).
- Al cerrarse, main.js vacía `#ficha-afirmacion`, `#ficha-aclaracion-texto` y `#ficha-detalles`, devuelve `hidden` a `#ficha-afirmacion` y `#ficha-aclaracion`, y quita `hidden` a `#ficha-confesion-titulo` y `#ficha-texto`.

Ids de la 2.0 que **desaparecen** (no se crean): `reto-titulares*`, `recorte*`, `veredicto-fuente*`, `ficha-recorte`, `ficha-titular`, `ficha-entradilla`, `ficha-fuente*`, `creditos-noticias`, `creditos-medios`, `creditos-ficcion`.

### 2.4 Cabecera de index.html

Sin cambios: CSP `default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'` [D-36], `lang="en"`. Fact or Fake no tiene enlaces externos. Los archivos `data/facts/{mes}.json` son del mismo origen.

### 2.5 Tipografías

Sin cambios [D-29, D-40]. La afirmación usa `--fuente-titulos` en la pregunta; la aclaración y los detalles, `--fuente-cuerpo`; la marca, `--fuente-datos`; el aviso de ausencia, `--fuente-cuerpo`.

### 2.6 Composición sin deslizar [D-84]

Siguen R1 a R13 de la 1.3 con los mismos tamaños garantizados (360 x 640, 640 x 360, 1280 x 720, 390 x 844, 768 x 1024). Reglas de la 2.0 adaptadas a Fact or Fake [D-126]:

- **R8. Portada** [D-98]: como en la 2.0 (retos en una fila de 2; modos o `#portada-regla`; orden de compresión: lema, Case #n y racha en una línea, descripción de modos en una línea). Cada ficha de reto mide al menos 44 px de alto, con el nombre en una línea y el estado (18 caracteres como máximo) en otra.
- **R14. Caso de Fact or Fake en vertical**: filas `auto minmax(0, 1fr) auto` (cabecera, escena, botones). Con `#app[data-reto="afirmaciones"]`, `#caso-escena` es una columna con `#afirmacion` y, en veredicto, `#veredicto`. En la pregunta, la afirmación con `--fuente-titulos` y `clamp()` (20 px como mínimo), centrada en la tarjeta; la marca, abajo, 14 px como mínimo. `#caso-aviso` en la cabecera, 14 px como mínimo, contraste AA, 2 líneas como máximo a 360 px.
- **R15. Caso de Fact or Fake en horizontal**: como R7, con la escena (tarjeta y veredicto) a la izquierda y cabecera (con `#caso-aviso`) y botones a la derecha.
- **R16. Veredicto de Fact or Fake**: la afirmación sigue visible pero baja a `--fuente-cuerpo` (16 px como mínimo). El sello se superpone a la tarjeta (posición absoluta, sin alto propio); el de FAKE (`#veredicto[data-verdad="generada"]`) es muy visible (banda o sello grande en rojo con contraste AA, también sin color gracias al texto); el de FACT, en el color de acierto o neutro, nunca igual. Debajo, en el flujo: pie, aclaración (16 px) y detalles (lista con viñetas, 16 px). **Solo con `@media (max-height: 420px)`** (móvil en horizontal), la afirmación se oculta por CSS en el veredicto (`#pantalla-caso[data-fase="veredicto"] #afirmacion-texto`) para dejar sitio a la aclaración; se ve completa en el diálogo del resultado [D-132, antes DP-53]. `#caso-aviso` está oculto en el veredicto.
- **R17. Resultado de Fact or Fake**: como R9, con los 5 `button.miniatura` numerados en una fila (44 x 44 px como mínimo), y Share y Back en una fila.
- **R18. Textos largos**: con afirmación de 140 caracteres, aclaración de 160 y 3 detalles de 80 (los máximos del importador), las dos fases caben sin scroll en los tamaños garantizados, **también la pregunta de la prueba 1 con `#caso-aviso`**. Si no cupieran (zoom, texto ampliado, pantallas menores), se aplica R13: la sección se desplaza por dentro; nunca se recorta ni se oculta texto (salvo la regla de R16 para `max-height: 420px`).
- **R11. Diálogo**: igual; `#ficha-afirmacion` en `--fuente-titulos`.

### 2.7 creditos.html [D-39, D-129]

Como en la 1.3 y, tras `creditos-imagenes`, una sección fija nueva:
```html
<section id="creditos-afirmaciones">
  <h2>{creditos.afirmaciones}</h2>
  <p>{creditos.afirmaciones_texto}</p>
</section>
```
- `creditos.afirmaciones_texto` es exacto: "Claims are written for this game from public sources. The fakes are invented and always debunked after you answer." [D-132].
- Sin lista de medios ni fuentes (Fact or Fake no registra fuentes, D-131). No depende de `data/facts/`.
- Ids nuevos: `creditos-afirmaciones`. Desaparecen `creditos-noticias`, `creditos-medios` y `creditos-ficcion` (nunca llegaron a generarse: la tarea 70 está pendiente). Sin script, sin `style`, sin recursos externos.
