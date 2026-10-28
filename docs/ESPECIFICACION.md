# identifAI-it: especificación técnica

**Versión 2.1, del 2026-10-26** [D-120], con los ajustes del 2026-10-27 (D-131 a D-140) y los del diseño de la tarea 78 (D-141 a D-146, 2026-10-28), todos sin subir versión (D-44). Parte de la 2.0 (2026-10-25, con los ajustes D-115 a D-119) y **sustituye el segundo reto, Headlines, por Fact or Fake**, por decisión del usuario:
- **Dos retos**: **Images** (`imagenes`, sin cambios, con sus tres modos) y **Fact or Fake** (`afirmaciones` [D-121]: 5 afirmaciones de una frase al día; el jugador decide FACT o FAKE, con las teclas F y K [D-122]; sin modos ni temporizador). Cada reto tiene sus 5 casos, su intento, su racha, su `ya-jugado`, su conjunto de mensajes finales [D-134, D-138] y su texto de compartir; la portada sigue siendo el centro, con un lema común [D-98, D-99, D-100, D-133].
- **Un solo tema por día**, común a los dos retos: las afirmaciones van en `entrada/temas/NN-tema/facts.txt` (o `facts.en.txt`), junto a las imágenes [D-123].
- **Datos**: afirmaciones y aclaraciones ofuscadas en bloques de longitud fija, en un archivo por mes, `data/facts/AAAA-MM.json` versión 1 (sustituye a `data/titulares/`); el juego normal solo carga el mes de la fecha efectiva y el modo prueba, todos [D-116, D-117, D-124]. **Sin fuentes**: Fact or Fake no tiene campo `source` ni banco privado; el usuario comprueba la veracidad él mismo [D-131].
- **Tras responder**: sello FACT o FAKE, la frase con la verdad (`truth`) y de 0 a 3 detalles; sin enlaces [D-126]. Marca fija en la tarjeta: "identifAI-it · Fact or Fake?" [D-128].
- **Se mantienen** de Headlines: la regla de la ausencia de más de 3 s seguidos (`OCULTA_MAX_MS`, medida al volver) y su aviso, el bloqueo de selección y copia, el intento que se gasta en Start y las 5 tarjetas del resultado que abren la ficha [D-101, D-102, D-115, D-145].
- **Se eliminan** titulares, entradillas, fuentes visibles y enlaces, medios, créditos de medios, el sello "AI-GENERATED · NOT A REAL STORY" y la confesión de Headlines.
- **Norma de contenido** nueva: nada falso sobre salud, seguridad, tragedias ni política; las falsas pueden alterar cifras o récords de personas y marcas famosas si no dañan su reputación (texto exacto y lista de revisión de 8 puntos en 4.13) [D-127, D-131, D-136, D-137].
- **Diseño de la tarea 78** [D-141 a D-146]: portada "dos expedientes", cabecera del caso con progreso, revelación según el boceto, resultado como tablón de pruebas. Cambia el marcado de 2.3, no las reglas del juego.
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

(`docs/especificacion/4b-titulares.md` está retirado y ya no existe en el repositorio.)

Este documento es la fuente de verdad técnica. Si algo no está aquí, no se inventa: se pregunta o se registra en `docs/DECISIONES.md`. Las reglas de `CLAUDE.md` prevalecen. `CLAUDE.md` y `.claude/` ya recogen D-131 (sin `source`, sin fuentes privadas ni `herramientas/banco-afirmaciones.json`) y la norma de contenido de D-136, y `CLAUDE.md` recoge además el DOM del resultado de D-145: el requisito P6 está cumplido (9.3) y las tareas 82 a 77 están hechas (9.4.2).

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
| `portada` | "Dos expedientes" [D-141]: cabecera con título, lema (común a los dos retos), Case #n · tema del día y botón de ayuda (abre Cómo jugar, un diálogo modal con los pasos del reto elegido); selector de día (modo prueba); dos tarjetas de reto con su estado, descripción, modos (**solo Images**) o regla (Fact or Fake) y su propio botón Start / View report; pie con la racha del reto elegido y Credits [D-98, D-133]. |
| `cargando` | Solo Images: precarga de las 5 imágenes. |
| `cuenta-atras` | Solo Images: 3, 2, 1. |
| `caso` | Cabecera común (reto, tema, 5 casillas de progreso, modo en Images y marcador) [D-141]. Images: vitrina con la foto y la ficha de revelación. Fact or Fake: aviso de ausencia (solo en la pregunta de la prueba 1) [D-115], tarjeta (afirmación + marca) y botones FACT / FAKE, sin temporizador. Fases `pregunta` y `veredicto`. |
| `resultado` | Tablón de pruebas [D-145, D-146]: aciertos x/5, etiqueta del reto y caso, mensaje **del conjunto del reto** [D-134], sello "CASE CLOSED", 5 tarjetas (fotos en Images, afirmaciones en Fact or Fake) con la verdad y lo que dijo el jugador, que abren la ficha; racha, mejor racha, cuenta atrás hasta el caso siguiente, Back y Share [D-89, D-126]. |
| `ya-jugado` | Del reto elegido: reto y caso, aciertos, cuadros, modo (solo Images), racha, cuenta atrás a medianoche, Share y Back. |
| `sin-casos` | Ningún reto tiene caso hoy, o no hay fecha de lanzamiento (texto propio) [D-24, D-95]. |
| `error` | No se pudo cargar `data/calendario.json`, un archivo de `data/facts/` (salvo que no exista: un 404 deja Fact or Fake sin caso o, en modo prueba, cierra la lista de meses; no es error) o alguna imagen. Reintentar. |

- El veredicto es una fase de `caso` [D-05]. `dialog#ficha` es una ventana modal sobre `resultado` y `dialog#como-jugar`, sobre `portada`; ninguno cambia el estado [D-88]. Desde D-141 la ficha ya no se abre desde el veredicto (el prompt entero cabe en la revelación).
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
- **Reto jugado y el otro no**: la portada muestra los dos estados. Un reto sin caso hoy muestra "No case today" y deja su botón Start `disabled`.
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
- **Medianoche durante la partida**: la partida usa los datos ya cargados (también si cruza de mes). `MEDIANOCHE` solo se procesa en `portada`, `ya-jugado` y `sin-casos`. En `resultado`, la cuenta atrás ofrece el caso nuevo y la vuelta a la portada recarga el día (2.3) [D-145].
- **Veredicto**: avance manual con Next o Enter [D-27].
- **Ficha y texto**: `texto` solo existe en `caso`; `ficha`, solo en `veredicto`. En `resultado`, main.js descifra al pintar el tablón la verdad y (en Fact or Fake) las 5 afirmaciones, ya contestadas [D-145]; la ficha (prompt o aclaración) de cada tarjeta, solo al abrirla. Nada de eso se guarda [D-88].
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

- `<main id="app" data-pantalla="portada" data-reto="imagenes" data-modo="normal">`: main.js mantiene al día `data-pantalla`, `data-reto` (`imagenes|afirmaciones`) y `data-modo`. CSS usa `data-reto` para la composición de cada reto (vitrina, temporizador y sobre solo en Images, tarjeta solo en Fact or Fake, nombres `[data-reto-nombre]`).
- Cada pantalla es `<section class="pantalla" id="pantalla-{nombre}" hidden>`; solo una sin `hidden`. Además de las secciones, main.js solo cambia `hidden` en los elementos que este contrato indica.
- Foco al cambiar de pantalla: `data-foco` o el primer `h1`/`h2` [D-41]. En `caso`, el foco va a `#caso-etiqueta` al empezar cada pregunta y a Next al entrar en el veredicto.

### 2.2 Atributos genéricos

| Atributo | Dónde | Uso |
|---|---|---|
| `data-texto="grupo.clave"` | elementos con texto fijo | Como en la 1.3: main.js los rellena al arrancar. |
| `data-accion` | `<button>` | `empezar`, `siguiente`, `compartir`, `reintentar`, `ver-ficha`, `cerrar-ficha`, `volver-portada`, `abrir-ayuda`, `cerrar-ayuda` y, en modo prueba, `abrir-prueba` [D-141]. Ya no existe `leer-confesion`. |
| `data-reto-boton="imagenes\|afirmaciones"` | los dos botones `empezar` de la portada | Reto de la tarjeta del botón [D-141]. |
| `data-reto-nombre="imagenes\|afirmaciones"` | `span` de `#caso-reto`, `#veredicto-titulo` y `#resultado-nota` | Texto fijo de cada reto; CSS solo muestra el que coincide con `#app[data-reto]`. |
| `data-voto="autentica"` / `"generada"` | botones de respuesta | Fijos, comunes a los dos retos [D-122]. |
| `data-foco` | uno por pantalla | |
| `data-estado="acierto\|fallo"` | `#veredicto` y cada `button.miniatura` | Resultado del jugador. Ausente antes de responder. |
| `data-estado="pendiente\|actual\|acierto\|fallo"` | cada `li` de `#caso-progreso` | Progreso de la partida [D-141]. |
| `data-verdad="autentica\|generada"` | `#veredicto` y cada `button.miniatura` | En `#veredicto`, solo en fase `veredicto` (ausente en `pregunta`). En las tarjetas del resultado, desde que se crean (las 5 pruebas ya están contestadas) [D-145]. Estilo del sello: FACT o FAKE, REAL o AI. |
| `data-fase`, `data-tapada` | `#pantalla-caso` | `pregunta\|veredicto` y `si\|no`; en Fact or Fake, `data-tapada` siempre `no`. |
| `data-nivel`, `--restante` | `#temporizador` | Solo Images. |
| `data-prueba="1".."5"` | `button.miniatura` | Posición. |
| `data-visible` | `#compartir-aviso` | `si\|no`. |
| `data-pagina` | `<body>` | `juego` o `creditos`. |

Clases: `.solo-lectores`; estructurales `.pantalla`, `.prueba-img`, `.boton-texto`, `.reto`, `.reto-radio`, `.reto-estado`, `.miniatura` y las piezas de las tarjetas del resultado (`.mini-foto`, `.mini-img`, `.mini-cabecera`, `.mini-numero`, `.mini-sello`, `.mini-texto`, `.mini-pie`, `.mini-voto`). Los estados van en `data-*` [D-03]. Las demás clases del HTML (`.cinta-peligro`, `.portada-cabecera`, `.boton-ayuda`, `.dato`…) son solo de estilo.

Temas, afirmaciones, aclaraciones, detalles y fichas solo como `textContent` en los elementos que se citan aquí. Nada de eso va en ids, clases, otros atributos, `alt` ni rutas.

### 2.3 Elementos por pantalla

Marcado actual de `index.html` y comportamiento de `js/main.js` tras la tarea 78 [D-141 a D-146]. `{r}` es `imagenes` o `afirmaciones`. En las plantillas de texto, la posición de una prueba (`{i}`, o `{n}` en `final.alt_prueba`) va de 1 a 5.

**Portada** (`#pantalla-portada`), "dos expedientes" [D-141], en este orden del DOM:
- `div.cinta-peligro` (decorativa, `aria-hidden`).
- `header.portada-cabecera`:
  - `div.portada-marca` con `h1[tabindex="-1"][data-foco] data-texto="portada.titulo"` (recibe el foco de la pantalla) y `p.portada-lema data-texto="portada.lema"` (texto exacto, común a los dos retos: "Two cases a day. Spot the fake." [D-133]; no cambia al elegir reto).
  - `p#portada-caso`: `rellenar(portada.etiqueta_caso, {n})` ("Case #n"); vacío y `hidden` si `estado.n` es `null`.
  - `#selector-prueba` (solo en modo prueba; lo crea main.js **justo después de `#portada-caso`**, dentro de la cabecera): `div#selector-prueba` con `label[for="selector-prueba-dia"]` (`prueba.etiqueta`), `select#selector-prueba-dia` y `button.boton[data-accion="abrir-prueba"]` (`prueba.boton`), que recarga con `?prueba=1&dia={n}&reto={reto}` [D-70]. Las `option` llevan `value = String(n)` y texto `rellenar(prueba.opcion, {n, tema})`, con `tema` = el tema del día (si los dos retos lo tienen y, por error, difiere, los dos unidos por " / ").
  - `p#portada-tema`: `rellenar(portada.tema, {tema})` con el tema del reto elegido (vacío si no tiene caso) [D-54]. CSS le antepone "· " cuando no está vacío.
  - `button.boton-ayuda[data-accion="abrir-ayuda"][aria-haspopup="dialog"]` con `span.icono-ayuda` (`aria-hidden`) y `span.boton-ayuda-texto data-texto="como_jugar.titulo"` (en móvil solo se ve el icono; el texto sigue ahí para lectores). Abre `dialog#como-jugar` con `showModal()`.
- `fieldset#portada-retos` con `legend data-texto="portada.elige_reto"` y `div.retos` con dos tarjetas iguales, primero Images y después Fact or Fake [D-98, D-121, D-141]:
  ```html
  <div class="reto">
    <input type="radio" name="reto" id="reto-{r}" class="reto-radio" value="{r}" aria-describedby="reto-{r}-desc reto-{r}-estado">
    <div class="reto-cabecera">
      <p class="reto-expediente" data-texto="portada.expediente_{r}">[[portada.expediente_{r}]]</p>
      <p class="reto-estado" id="reto-{r}-estado"></p>
    </div>
    <label class="reto-nombre" for="reto-{r}" data-texto="portada.reto_{r}">[[portada.reto_{r}]]</label>
    <p class="reto-desc" id="reto-{r}-desc" data-texto="portada.desc_reto_{r}">[[portada.desc_reto_{r}]]</p>
    <div class="reto-accion">
      <!-- Images: fieldset#portada-modos · Fact or Fake: p#portada-regla -->
      <button type="button" class="boton boton-primario" data-accion="empezar" data-reto-boton="{r}"><span class="boton-texto" id="portada-empezar-{r}-texto" data-texto="portada.empezar_{r}">[[portada.empezar_{r}]]</span></button>
    </div>
  </div>
  ```
  - `.reto-radio` cubre toda la tarjeta (posición absoluta, opacidad 0): pulsar la tarjeta o usar las flechas elige el reto (`change` → `ELEGIR_RETO`). La tarjeta elegida (`.reto:has(.reto-radio:checked)`) lleva fondo de papel, borde ámbar y una marca que no depende del color; el foco se ve en la tarjeta (`.reto:has(.reto-radio:focus-visible)`).
  - `.reto-expediente`: "CASE FILE · 01/02" y "CASE FILE · 02/02"; `.reto-desc`: `portada.desc_reto_{r}`.
  - `.reto-estado` (main.js, `textContent`): `portada.estado_sin_caso`, `portada.estado_jugado` (`{aciertos}`), `portada.estado_en_curso` o `portada.estado_pendiente`.
  - **Images**: `.reto-accion` contiene `fieldset#portada-modos` (`legend.solo-lectores` con `portada.elige_modo`; tres `div.modo` con `input[type=radio][name=modo]#modo-investigador|modo-normal|modo-perro` y su `label` con `span.modo-nombre` = `portada.modo_*` y `span.modo-desc` = `portada.tiempo_*`). Siempre visible: main.js ya no le pone `hidden`. Elegir un modo con Fact or Fake elegido despacha antes `ELEGIR_RETO {reto: 'imagenes'}` y después `ELEGIR_MODO`.
  - **Fact or Fake**: `.reto-accion` contiene `p#portada-regla data-texto="portada.regla_afirmaciones"` (regla breve: sin temporizador; salir de la página **más de unos segundos** antes de responder es fallo), siempre visible, sin `hidden`.
  - **Botón de empezar** de cada tarjeta: `#portada-empezar-{r}-texto` = `portada.empezar_{r}` ("Start · Images", "Start · Fact or Fake"), o `portada.informe_{r}` ("View report · …") si ese reto está jugado; `disabled` si ese reto no tiene caso. Al pulsarlo, si `data-reto-boton` no es el reto elegido, main.js despacha `ELEGIR_RETO` y después Start (`EMPEZAR`; si el reto está jugado, lleva a `ya-jugado`).
- `footer#portada-pie`: `p#portada-racha` (`rellenar(portada.racha, {racha})` del reto elegido; vacío y `hidden` si es 0) y `a#portada-creditos` (sin cambios).
- **Cómo jugar** es un diálogo modal, entre los elementos comunes de `#app`:
  ```html
  <dialog id="como-jugar" aria-labelledby="como-jugar-titulo">
    <h2 id="como-jugar-titulo" data-texto="como_jugar.titulo">[[como_jugar.titulo]]</h2>
    <ol id="como-jugar-pasos"></ol>
    <button type="button" id="como-jugar-cerrar" class="boton" data-accion="cerrar-ayuda" autofocus>
      <span class="boton-texto" data-texto="ficha.cerrar">[[ficha.cerrar]]</span>
    </button>
  </dialog>
  ```
  main.js rellena `#como-jugar-pasos` con un `li` por paso de `como_jugar.pasos` (Images) o `como_jugar.pasos_afirmaciones` según el reto elegido [D-113]. Al cerrarlo (botón o Escape) el foco vuelve al botón de ayuda; se cierra solo, sin devolver el foco, si cambia la pantalla.
- Ids retirados por D-141: `como-jugar-resumen`, `como-jugar-panel` (con el antiguo `details#como-jugar`) y `portada-empezar-texto`.

**Cargando** y **Cuenta atrás**: sin cambios (solo Images).

**Caso** (`#pantalla-caso`, con `data-fase` y `data-tapada`) [D-141, D-142, D-144]:
- `header#caso-cabecera`, en orden:
  - `div#caso-titulo`: `p#caso-reto` con dos `span[data-reto-nombre]` (`portada.reto_imagenes`, `portada.reto_afirmaciones`) y `p#caso-tema` = `rellenar(partida.caso_del_dia, {tema})` en los dos retos (vacío sin tema).
  - `p#caso-etiqueta.solo-lectores[tabindex="-1"][data-foco]`: `partida.etiqueta_prueba` ("Evidence i/5") en Images o `afirmaciones.etiqueta_prueba` ("Claim i/5") en Fact or Fake. Recibe el foco al empezar cada pregunta y da nombre a `#afirmacion`.
  - `ol#caso-progreso[aria-hidden="true"]` con 5 `li`: `data-estado` = `acierto` o `fallo` si la prueba ya tiene código, `actual` en la prueba `indice` sin responder y `pendiente` en las demás.
  - `div#caso-puntuacion`: `p#caso-modo` = `rellenar(partida.modo_etiqueta, {modo})` ("Normal mode") en Images y vacío en Fact or Fake (CSS lo oculta), y `p#caso-marcador` = `rellenar(partida.marcador, {aciertos})` en los dos.
  - Último, el aviso de ausencia [D-115]:
    ```html
    <p id="caso-aviso" data-texto="afirmaciones.aviso_oculta" hidden>[[afirmaciones.aviso_oculta]]</p>
    ```
    - Texto exacto: "Leaving the page for more than a few seconds counts as a miss.".
    - main.js le quita `hidden` **solo** con `estado.reto === 'afirmaciones'`, `pantalla === 'caso'`, `fase === 'pregunta'` e `indice === 0`, y se lo devuelve en cualquier otro estado. Nunca se ve en Images (CSS lo oculta además con `#app[data-reto="imagenes"]`).
    - Lectores de pantalla: main.js escribe una vez `afirmaciones.aviso_oculta` en `#temporizador-anuncio` tras `PINTADA` de la prueba 1 y lo vacía al empezar la prueba siguiente.
- `div#caso-escena` contiene, en este orden, la vitrina, la ficha de papel, el temporizador y los botones:
  - **Vitrina** (solo Images; CSS la oculta en Fact or Fake, y main.js pone `hidden` a `#prueba-marco`):
    ```html
    <div id="prueba-vitrina">
      <div id="prueba-caja">
        <figure id="prueba-marco"></figure>
        <div id="prueba-sobre" hidden aria-hidden="true">
          <p id="prueba-sobre-texto" data-texto="partida.sobre_texto">[[partida.sobre_texto]]</p>
        </div>
        <p id="prueba-etiqueta" aria-hidden="true"></p>
        <p id="prueba-sello" aria-hidden="true"></p>
      </div>
    </div>
    ```
    - `#prueba-marco` recibe la `img.prueba-img` precargada (`alt` = `partida.alt_prueba`, 1080 x 1350); `#prueba-sobre` como en la 1.3 (la imagen lleva `hidden` mientras está sellada y vuelve a verse en el veredicto). `#prueba-caja` es 4:5 con `object-fit: contain` y marco de papel: la foto se ve siempre completa [D-144].
    - `#prueba-etiqueta` y `#prueba-sello` están vacíos en la pregunta. En el veredicto de Images, `rellenar(revelacion.etiqueta_prueba, {i})` ("Exhibit i/5") y el mismo texto que `#veredicto-sello` (REAL o AI), sobre las esquinas de la foto. En Fact or Fake quedan vacíos.
  - **Ficha de papel** `div#caso-tarjeta`: la afirmación (Fact or Fake) y la revelación de los dos retos. Contiene, en orden:
    - Franja del veredicto (sustituye a `#veredicto-pie`):
      ```html
      <div id="veredicto-banda" role="status">
        <span id="veredicto-icono" aria-hidden="true"></span>
        <div id="veredicto-banda-cuerpo">
          <p id="veredicto-banda-texto"></p>
          <p id="veredicto-texto"></p>
        </div>
      </div>
      ```
      CSS la oculta mientras `#veredicto` tiene `hidden`; color e icono según `#veredicto[data-estado]`. `#veredicto-banda-texto` = `rellenar(revelacion.banda_acierto|banda_fallo, {voto})` ("Right call · you said Fake"), con `{voto}` = lo que dijo el jugador (`partida.voto_*` "Real"/"AI" o `afirmaciones.voto_*` "Fact"/"Fake"; en un acierto, la verdad; en un fallo, la contraria), o `revelacion.banda_oculta` ("Missed call · you left the page") si `motivo === 'oculta'`. `#veredicto-texto`: variante de `veredictos.acierto|fallo`, o de `afirmaciones.oculta` si `motivo === 'oculta'`.
    - Tarjeta de la afirmación [D-102, D-126], vacía en el HTML:
      ```html
      <article id="afirmacion" hidden aria-labelledby="caso-etiqueta">
        <p id="afirmacion-titulo" aria-hidden="true" data-texto="revelacion.titulo_afirmacion">[[revelacion.titulo_afirmacion]]</p>
        <p id="afirmacion-texto"></p>
        <p id="afirmacion-marca" aria-hidden="true" data-texto="afirmaciones.marca">[[afirmaciones.marca]]</p>
      </article>
      ```
      - main.js le quita `hidden` solo en Fact or Fake (en las dos fases) y rellena `#afirmacion-texto` con `textContent` al empezar cada prueba; si `estado.texto` es `null`, recibe `afirmaciones.no_disponible`. Fuera de `caso` (y en Images), `#afirmacion-texto` queda vacío.
      - `#afirmacion-titulo` ("The claim") solo se ve en el veredicto (CSS). En el veredicto el artículo pasa a `display: contents` para ordenar afirmación, aclaración y marca en la columna de la tarjeta; la afirmación sigue en `--fuente-titulos` y, si es FAKE, tachada en rojo.
      - `#afirmacion-marca` muestra siempre "identifAI-it · Fact or Fake?" (exacto), igual en todas las pruebas, para que una captura de una afirmación falsa nunca circule sin contexto [D-128]. Es decorativa para lectores de pantalla. Va en el flujo, al final de la tarjeta (no es absoluta) [D-142].
      - **Bloqueo de copia** (freno casual): CSS `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;` en `#afirmacion`, y main.js registra una vez, en `#afirmacion`, oyentes de `copy`, `cut`, `contextmenu`, `dragstart` y `selectstart` con `preventDefault()`. Fuera de `#afirmacion` solo se bloquea `#resultado-revision` (D-145, ver Resultado) [D-102].
      - **Accesibilidad**: texto real del DOM, sin `aria-hidden`, legible por lectores de pantalla y ampliable.
    - `#veredicto` (`role="status"`, `aria-live="polite"`, `hidden` en pregunta), con `data-estado` y `data-verdad` solo en veredicto:
      ```html
      <div id="veredicto" role="status" aria-live="polite" hidden>
        <p id="veredicto-sello"></p>
        <p id="veredicto-titulo">
          <span data-reto-nombre="imagenes" data-texto="revelacion.titulo_imagenes">[[revelacion.titulo_imagenes]]</span>
          <span data-reto-nombre="afirmaciones" data-texto="revelacion.titulo_afirmaciones">[[revelacion.titulo_afirmaciones]]</span>
        </p>
        <p id="veredicto-resumen"></p>
        <div id="veredicto-aclaracion" hidden>
          <p id="veredicto-aclaracion-texto"></p>
          <ul id="veredicto-detalles"></ul>
        </div>
        <div id="veredicto-confesion">
          <p id="veredicto-confesion-titulo" data-texto="confesion.titulo">[[confesion.titulo]]</p>
          <blockquote id="veredicto-confesion-texto"></blockquote>
          <p id="veredicto-confesion-nota" aria-hidden="true" data-texto="confesion.nota">[[confesion.nota]]</p>
        </div>
      </div>
      ```
      - `#veredicto-sello`: Images, `partida.sello_autentica|sello_generada`; Fact or Fake, `afirmaciones.sello_autentica` ("FACT") o `afirmaciones.sello_generada` ("FAKE").
      - `#veredicto-titulo`: "The verdict" (Images) o "The truth" (Fact or Fake), por `data-reto-nombre`.
      - `#veredicto-resumen`: Images, `revelacion.resumen_autentica|resumen_generada` ("This is a real photograph." / "This photo was generated by AI."); vacío y oculto en Fact or Fake.
      - `#veredicto-aclaracion` [D-126]: solo en Fact or Fake y fase veredicto, main.js quita `hidden` al contenedor, pone `ficha.aclaracion` en `#veredicto-aclaracion-texto` y crea un `<li>` sin atributos por detalle (`textContent`); con 0 detalles, el `ul` queda vacío y con `hidden`. Si `ficha` es `null`, el texto es `afirmaciones.aclaracion_no_disponible` y no hay detalles. En Images y al salir del veredicto, vacía los dos y vuelve a ocultar el contenedor.
      - `#veredicto-confesion`: solo Images [D-144]. `blockquote#veredicto-confesion-texto` = el prompt **entero** (`estado.ficha`) o `confesion.no_disponible`, con comillas “ ” por CSS; `#veredicto-confesion-nota` ("The prompt used to create this image.") solo se ve en horizontal. CSS oculta la confesión entera con `#veredicto[data-verdad="autentica"]` (en las fotos reales la ficha queda solo con el veredicto). En Fact or Fake, main.js le pone `hidden`. Ya no hay recorte ni botón `leer-confesion` (`recortarFicha` sigue en `juego.js` sin uso en main.js).
    - `p#veredicto-marca[aria-hidden="true"] data-texto="partida.marca"` ("identifAI-it · Real or AI?"): pie de la ficha, solo en Images y en horizontal (CSS).
  - `#temporizador` (`data-nivel`, `--restante`, `aria-hidden`, con `#temporizador-cinta`) y `p#temporizador-anuncio.solo-lectores[aria-live="polite"]`: solo Images (CSS oculta `#temporizador` con `#app[data-reto="afirmaciones"]`; el anuncio queda vacío salvo el aviso de ausencia de la prueba 1).
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
    <button type="button" class="boton boton-primario" data-accion="siguiente"><span class="boton-texto" data-texto="partida.boton_siguiente">[[partida.boton_siguiente]]</span></button>
    ```
    - Los `span` de voto no llevan `data-texto`: main.js pone, en cada render de `caso`, el texto (`partida.boton_autentica|boton_generada` en Images; `afirmaciones.boton_autentica|boton_generada` en Fact or Fake), el contenido de `kbd` y `aria-keyshortcuts` con `teclaDeVoto(reto, voto)` (R/I o F/K).
    - Texto de Next (main.js, en cada render): `partida.boton_ver_resultado` ("See result") en la prueba 5; si no, `afirmaciones.boton_siguiente` ("Next claim") o `partida.boton_siguiente` ("Next evidence").
    - CSS oculta Next en la pregunta y los votos en el veredicto. Next tiene siempre su propia fila y nunca queda tapado (`position: relative; z-index: 1`); si el texto desborda, la ficha o la tarjeta se desplazan por dentro, nunca el botón [D-142]. Images en vertical: Next ámbar, fuera de la ficha y a todo el ancho; Images en horizontal: barra oscura al pie de la ficha [D-144]; Fact or Fake: bajo la tarjeta, a la derecha (a todo el ancho en vertical).
- Al salir del veredicto, main.js pone `hidden` a `#veredicto`, le quita `data-estado` y `data-verdad` y vacía `#veredicto-sello`, `#veredicto-texto`, `#veredicto-banda-texto`, `#veredicto-resumen`, `#veredicto-confesion-texto`, `#prueba-etiqueta`, `#prueba-sello` y la aclaración. Fuera de `caso` vacía además `#afirmacion-texto`.
- Ids retirados por D-141 y D-144: `veredicto-pie` (lo sustituye `#veredicto-banda`), el botón `leer-confesion` y `veredicto-consejo*` (D-143, sin objeto).

**Resultado** (`#pantalla-resultado`), tablón de pruebas [D-145, D-146]:
- `div.cinta-peligro` (decorativa).
- `header#resultado-franja`:
  - `p#resultado-aciertos[tabindex="-1"][data-foco]`: `rellenar(final.aciertos, {aciertos})`.
  - `div#resultado-datos` con `p#resultado-reto` = `etiquetaResultado([nombre del reto, rellenar(portada.etiqueta_caso, {n}), tema, modo])` (las partes no vacías unidas por " · "; el modo solo en Images; mayúsculas por CSS: "IMAGES · CASE #3 · FIREWORKS · NORMAL", "FACT OR FAKE · CASE #3 · FIREWORKS") y `p#resultado-mensaje` [D-134]: `textContent` = `mensajeFinal(aciertos, mensajesDelReto(estado.reto, TEXTOS.final))`, es decir, `final.mensajes[aciertos]` en Images y `final.mensajes_afirmaciones[aciertos]` en Fact or Fake. Sin atributos que dependan del reto ni de los aciertos.
  - `p#resultado-sello[aria-hidden="true"] data-texto="resultado.sello_cerrado"` ("CASE CLOSED"): CSS solo lo muestra desde 640 px de ancho.
- `div#resultado-tablon` con `ol#resultado-revision` (vacío en el HTML) y `p#resultado-nota` con dos `span[data-reto-nombre]` (`resultado.nota_imagenes` "Tap a photo to see its file", `resultado.nota_afirmaciones` "Tap a claim to read the truth again").
- **Tarjetas** (main.js, al pintar `resultado`): 5 `li` en `#resultado-revision`, cada uno con un `button.miniatura`. Para cada prueba, main.js descifra la verdad (`desofuscar(clave, n, i)`) y calcula lo que dijo el jugador con `votoDicho(verdad, codigo)` de `juego.js` (acierto = la verdad; fallo, también por ausencia = la contraria):
  ```html
  <!-- Images -->
  <li>
    <button type="button" class="miniatura" data-accion="ver-ficha" data-prueba="3" data-estado="fallo" data-verdad="generada" aria-haspopup="dialog">
      <span class="solo-lectores">Evidence 3: wrong</span>
      <span class="mini-foto" aria-hidden="true"><img class="mini-img" src="casos/k3x9q2m7ab.webp" alt="" width="1080" height="1350"><span class="mini-sello">AI</span></span>
      <span class="mini-pie" aria-hidden="true"><span class="mini-numero">#3</span><span class="mini-voto">You said Real</span></span>
    </button>
  </li>
  <!-- Fact or Fake -->
  <li>
    <button type="button" class="miniatura" data-accion="ver-ficha" data-prueba="3" data-estado="acierto" data-verdad="autentica" aria-haspopup="dialog">
      <span class="solo-lectores">Claim 3: correct</span>
      <span class="mini-cabecera" aria-hidden="true"><span class="mini-numero">#3</span><span class="mini-sello">FACT</span></span>
      <span class="mini-texto" aria-hidden="true">(afirmación descifrada)</span>
      <span class="mini-pie" aria-hidden="true"><span class="mini-voto">You said Fact</span></span>
    </button>
  </li>
  ```
  - Nombre accesible: solo el `span.solo-lectores`, `rellenar(final.estado_prueba, …)` ("Evidence i: …") en Images o `rellenar(afirmaciones.estado_prueba, …)` ("Claim i: …") en Fact or Fake, con `{i, estado: final.estados[estado]}` ("correct" o "wrong"). Las demás piezas llevan `aria-hidden="true"`.
  - `.mini-sello` = el sello de la verdad (`partida.sello_*` o `afirmaciones.sello_*`); `.mini-voto` = `rellenar(resultado.dijiste, {voto})` con `partida.voto_*` o `afirmaciones.voto_*`; `.mini-img` = `rutaPrueba(id)`. `.mini-texto` = `desofuscarAfirmacion(textos[i], clave, n, i)` o `afirmaciones.no_disponible`. Si la verdad no se puede descifrar, no hay `data-verdad`, el sello queda vacío y no hay `.mini-voto`.
  - **Coexistencia en el DOM** [D-145]: solo en esta pantalla, y ya contestadas las cinco, están en el DOM a la vez las 5 verdades y (en Fact or Fake) las 5 afirmaciones. Las aclaraciones, los detalles y los prompts no: solo en el diálogo, al abrirlo. En cualquier render de otra pantalla, main.js vacía `#resultado-revision`.
  - **Bloqueo de copia del tablón** [D-145]: CSS `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;` en `#resultado-revision`, y main.js registra una vez, en `#resultado-revision`, los mismos oyentes que en `#afirmacion` (`copy`, `cut`, `contextmenu`, `dragstart`, `selectstart`, con `preventDefault()`).
  - Disposición (CSS, D-146): en horizontal o ancho, las 5 en una fila; en vertical, Images en 3 + 2 y Fact or Fake en 2 + 2 + 1. Tarjetas giradas entre -2 y 2 grados, con chincheta; las falladas con contorno rojo; `.mini-texto` recortado con `line-clamp` (`--lineas`, sin puntos suspensivos).
- `footer#resultado-pie`:
  ```html
  <div id="resultado-rachas">
    <p class="dato"><span class="dato-etiqueta" data-texto="resultado.etiqueta_racha">…</span><span class="dato-valor" id="resultado-racha"></span></p>
    <p class="dato"><span class="dato-etiqueta" data-texto="resultado.etiqueta_mejor_racha">…</span><span class="dato-valor" id="resultado-mejor-racha"></span></p>
    <p class="dato" id="resultado-proximo"><span class="dato-etiqueta" data-texto="resultado.siguiente_caso">…</span><span class="dato-valor dato-ambar" id="resultado-cuenta-atras" aria-live="off"></span></p>
    <div id="resultado-nuevo-caso" hidden>
      <p data-texto="resultado.nuevo_caso">…</p>
      <button type="button" class="boton boton-primario" data-accion="volver-portada"><span class="boton-texto" data-texto="resultado.boton_nuevo_caso">…</span></button>
    </div>
  </div>
  <div class="acciones">
    <button type="button" class="boton" data-accion="volver-portada"><span class="boton-texto" data-texto="final.boton_volver">…</span></button>
    <button type="button" class="boton boton-primario" data-accion="compartir"><span class="icono-compartir" aria-hidden="true"></span><span class="boton-texto" data-texto="compartir.boton">…</span></button>
  </div>
  ```
  - `#resultado-racha` y `#resultado-mejor-racha`: `racha` y `mejorRacha` del reto en el almacén.
  - `#resultado-cuenta-atras`: `formatearCuentaAtras(msHastaMedianoche(ahora))` (HH:MM:SS), cada segundo, con el mismo bucle que `ya-jugado`. Al pintar `resultado`, `#resultado-proximo` visible y `#resultado-nuevo-caso` con `hidden`.
  - **Medianoche en resultado** [D-145]: cuando la fecha local deja de ser la de la carga, el bucle se para, **no** se despacha `MEDIANOCHE` (la tabla no lo procesa aquí), se pone `hidden` a `#resultado-proximo` y se quita a `#resultado-nuevo-caso` ("New case available" y botón "Play"). Cualquier `volver-portada` desde `resultado` (Play o Back) despacha `VOLVER_PORTADA` y, si el día cambió, `MEDIANOCHE` (recarga del día nuevo).
  - Back (`final.boton_volver`) va antes que Share (`compartir.boton`, "Share result", con `span.icono-compartir`).

**Ya jugado** (`#pantalla-ya-jugado`): como en la 2.0 (`#ya-jugado-reto`, `#ya-jugado-aciertos`, `#ya-jugado-modo`, `#ya-jugado-cuadros`, `#ya-jugado-racha`, `#ya-jugado-cuenta-atras`, Share y Back); `#ya-jugado-modo` lleva `hidden` en Fact or Fake. No muestra mensaje final.

**Sin casos**: `<p id="sin-casos-texto" tabindex="-1" data-foco>`: `sin_casos.sin_lanzamiento` si `lanzamiento === null`, o `sin_casos.texto` [D-95]. **Error**: sin cambios.

**Comunes**: `#compartir-aviso`, `#compartir-manual` con su `label`, `#aviso-almacen`, `#aviso-previsualizacion` (`avisos.previsualizacion` o `avisos.prueba`), `dialog#como-jugar` (ver Portada) y `dialog#ficha`.

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
- Se abre solo desde una tarjeta `ver-ficha` del resultado, en los dos retos (desde D-141 no hay `leer-confesion`; `abrirFicha` aún admite `caso/veredicto` en Images, pero ningún botón la llama ahí). Lo que muestra se descifra al abrir y no se guarda.
- Images: `#ficha-titulo` = `rellenar(final.estado_prueba, {i, estado})`; `#ficha-img` visible con `rutaPrueba(id)` y `alt` = `rellenar(final.alt_prueba, {n})` ("Evidence 3"); `#ficha-era` = `rellenar(final.era, {sello})`; `#ficha-texto` = `desofuscarFicha(...)` (prompt o "Real photograph") o `confesion.no_disponible`; `#ficha-afirmacion` y `#ficha-aclaracion` con `hidden`.
- Fact or Fake: `#ficha-titulo` = `afirmaciones.estado_prueba`; `#ficha-img` con `hidden`; `#ficha-afirmacion` visible con la afirmación (`desofuscarAfirmacion`); `#ficha-era` = `rellenar(final.era, {sello})` con el sello FACT o FAKE; `#ficha-confesion-titulo` y `#ficha-texto` con `hidden`; `#ficha-aclaracion` visible con aclaración y detalles (`desofuscarAclaracion`; si es `null`, `afirmaciones.aclaracion_no_disponible`).
- Al cerrarse, main.js vacía `#ficha-titulo`, `#ficha-era`, `#ficha-texto`, `#ficha-afirmacion`, `#ficha-aclaracion-texto` y `#ficha-detalles`, devuelve `hidden` a `#ficha-afirmacion`, `#ficha-aclaracion` y `#ficha-img` (sin `src` ni `alt`), quita `hidden` a `#ficha-confesion-titulo` y `#ficha-texto` y devuelve el foco a la tarjeta que lo abrió. Si cambia la pantalla o la fase con la ficha abierta, se cierra sin devolver el foco.

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
- **R16. Veredicto de Fact or Fake** [D-148, cierra DP-63]: la afirmación **sigue visible en la revelación en todos los tamaños**, nunca se oculta. Va en `--fuente-titulos` (peso 600, de 20 a 30 px con `clamp(1.25rem, 5.4vw, 1.875rem)`; 18 px con `max-height: 420px`), alineada a la izquierda, tachada con el color del sello si es FAKE (`#caso-tarjeta:has(#veredicto[data-verdad="generada"]) #afirmacion-texto`). La franja `#veredicto-banda` (acierto o fallo, con el sello FACT o FAKE grande y distinto del otro también sin color gracias al texto, contraste AA) sustituye al pie. Debajo, la verdad (`#veredicto-aclaracion`) y los detalles (lista con viñetas, 16 px). `#caso-aviso` está oculto en la revelación. Si el contenido no cabe, la tarjeta se desplaza por dentro (D-142, R13); el botón siguiente nunca se desplaza.
- **R17. Resultado de Fact or Fake**: como R9, con los 5 `button.miniatura` del tablón (44 x 44 px como mínimo; disposición en 2.3) y Share y Back en una fila.
- **R18. Textos largos**: con afirmación de 140 caracteres, aclaración de 160 y 3 detalles de 80 (los máximos del importador), las dos fases caben sin scroll en los tamaños garantizados, **también la pregunta de la prueba 1 con `#caso-aviso`**. Si no cupieran (zoom, texto ampliado, pantallas menores), se aplica R13: la sección se desplaza por dentro; nunca se recorta ni se oculta texto (salvo la regla de R16 para `max-height: 420px`). Desde D-142, lo que se desplaza por dentro es la tarjeta o la ficha, nunca el botón Next.
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
- Ids nuevos: `creditos-afirmaciones`. Desaparecen `creditos-noticias`, `creditos-medios` y `creditos-ficcion` (nunca llegaron a generarse).
