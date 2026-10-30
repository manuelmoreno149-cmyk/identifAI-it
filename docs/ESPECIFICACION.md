# identifAI-it: especificación técnica

**Versión 3.0, del 2026-10-29** [D-151]. Parte de la 2.1 (con los ajustes D-131 a D-150, todos sin subir versión) y añade, por decisión cerrada del usuario, una portada nueva, una pantalla de instrucciones por reto y el juego en dos idiomas:
- **Portada nueva** [D-152]: logo y lema arriba, selector de idioma EN | ES a la derecha; "Case #N" con el tema (en modo prueba, el tema es un desplegable que elige el día); "Choose your case file" y dos tarjetas grandes (Images y Fact or Fake) que son botones enteros, con ilustración CSS, expediente, nombre, frase, estado y "Open file" + icono de flecha; pie con "New cases every day at midnight." y Credits. Sin modos, sin reglas, sin racha y **sin Cómo jugar** en la portada.
- **Pantalla `instrucciones`** [D-153]: carpeta de cartón abierta con dos páginas (briefing con 4 pasos a máquina; a la derecha, los modos de Images como casillas o las normas de Fact or Fake con una ficha de ejemplo) y el botón "Open the case". El modo se elige aquí. El intento se sigue gastando al empezar (Images, al terminar la cuenta atrás; Fact or Fake, al pulsar "Open the case"), nunca al ver las instrucciones.
- **Dos idiomas** [D-154 a D-161]: inglés americano y español de España. Primera visita según el navegador, después la elección guardada (`identifaiit.idioma`), y `?lang=es|en` la fuerza. Cambian textos, temas, afirmaciones, verdades, detalles, prompts, créditos y texto de compartir. **El intento, la racha y el progreso son comunes a los dos idiomas.** Nombres en español: Imágenes (REAL / IA, teclas R e I), ¿Dato o Bulo? (DATO / BULO, teclas D y B) y modos Investigador, Normal y Sabueso.
- **Datos**: `data/calendario.json` **versión 5** (tema y fichas por idioma) y `data/facts/AAAA-MM.json` **versión 2** (tema, afirmaciones y aclaraciones por idioma, en el mismo archivo) [D-157, D-158]. El almacén `identifaiit.v3` no cambia de forma [D-154].
- **Anti-trampas**: las palabras prohibidas incluyen ahora `dato`, `bulo`, `falso`, `falsa`, `verdadero` y `verdadera` [D-160].
- **Sin cambios**: reglas de cada reto, ausencia de más de 3 s, ofuscación (algoritmo), lanzamiento, almacén, rachas, tablón de resultado, revelación y `ya-jugado`.

La especificación se reparte en varios archivos de `docs/`, que forman un único documento con la misma versión [D-91, D-114, D-130, D-163]:

| Archivo | Secciones |
|---|---|
| `docs/ESPECIFICACION.md` (este) | 0. Glosario y estructura · 1. Pantallas y estados · 2. Contrato HTML/CSS (ya en la 3.0) |
| `docs/especificacion/3-modulos.md` | 3. Módulos JS (ya en la 3.0) |
| `docs/especificacion/4-datos.md` | 4.1–4.6 Datos y herramientas de Images y del lanzamiento · 5 · 6 · 7, **tal como en la 2.1** |
| `docs/especificacion/4b-facts.md` | 4.7–4.14 Datos y herramientas de Fact or Fake, **tal como en la 2.1** |
| `docs/especificacion/4c-idiomas.md` | **[3.0]** 4.15–4.24: datos bilingües (calendario v5, `data/facts/` v2, semillas por idioma), entrada en español, importadores, `validar`, créditos bilingües y cambios de 5, 6 y 7. **Manda sobre `4-datos.md` y `4b-facts.md` donde difieran.** |
| `docs/especificacion/8-criterios.md` y `8b-criterios-3.0.md` | 8. Criterios de aceptación (los de la 3.0, cambiados y nuevos 241–290, en 8b) |
| `docs/especificacion/9-tareas.md` y `9b-tareas-3.0.md` | 9. Plan de tareas (las fases 2 a 6 de la 3.0, tareas 89–104, en 9b), riesgos y cambios fuera de `docs/` |

Este documento es la fuente de verdad técnica. Si algo no está aquí, no se inventa: se pregunta o se registra en `docs/DECISIONES.md`. Las reglas de `CLAUDE.md` prevalecen: **la 3.0 contradice varias** (interfaz solo en inglés, Cómo jugar desplegable, teclas, palabras prohibidas, `facts.txt`, prompt `.en.txt` como único usado). Hasta que el usuario actualice `CLAUDE.md` con el texto de 9.6 (requisito **P7**, DP-64), nadie implementa las tareas que cambian lo que ve el jugador (fases 3 a 5).

Las marcas **[D-nn]** remiten a `docs/DECISIONES.md`. La versión solo sube cuando cambia el comportamiento del juego [D-44].

## 0. Glosario, convenciones y estructura

| Término | Significado |
|---|---|
| Reto | Juego diario independiente. Ids internos: `imagenes` ("Images" / "Imágenes") y `afirmaciones` ("Fact or Fake" / "¿Dato o Bulo?") [D-98, D-121, D-155]. |
| Idioma | `en` (inglés americano, `en-US`) o `es` (español de España, `es-ES`) [D-154]. `IDIOMAS = ['en', 'es']`, por defecto `en`. Solo cambia lo que se muestra: nunca entra en la clave de partida, en el almacén de progreso ni en `n`. |
| Caso del día | Las 5 pruebas de un reto en una fecha. Tiene un número `n` (Case #n), **común a los dos retos** (días desde el lanzamiento + 1) [D-99], y un **tema común** a los dos retos [D-123], con un texto por idioma [D-157]. |
| Lanzamiento | Fecha ISO del Caso #1 de los dos retos, o `null`. Vive solo en `data/calendario.json` y solo se cambia con `npm run lanzamiento` [D-95]. |
| Tema | Asunto común de las pruebas de un día: `{en, es}`. En inglés sale del nombre de la carpeta de entrada; en español, de `tema.es.txt` [D-159]. No revela la verdad [D-52, D-53]. |
| Prueba | Cada uno de los 5 elementos del caso, índice `i` de 0 a 4. En Images es una imagen; en Fact or Fake, una **afirmación**. |
| Afirmación | Frase única que el jugador juzga (campo `claim`), de 1 a 140 caracteres, en cada idioma [D-124, D-159]. |
| Aclaración | La frase con la verdad (`truth`, 1 a 160) y sus **detalles** (`details`, 0 a 3, de 1 a 80). Solo se revela tras responder [D-126]. |
| Verdad | `0` = auténtica (foto real; FACT / DATO), `1` = generada (IA; FAKE / BULO). Una sola por prueba, común a los dos idiomas. Solo en memoria y ofuscada en los datos [D-122]. |
| Voto | `"autentica"` o `"generada"`, igual en los dos retos y los dos idiomas. Teclas [D-156]: Images R e I (los dos idiomas); Fact or Fake F y K en inglés, D y B en español. |
| Código de resultado | `A` acierto, `F` fallo, `-` pendiente. En Fact or Fake, una ausencia de más de `OCULTA_MAX_MS` da `F` [D-101, D-115]. |
| Mensaje final | Frase del resultado según los aciertos (0 a 5), por reto y por idioma: `TEXTOS[idioma].final.mensajes` (Images) y `.mensajes_afirmaciones` [D-134, D-138]. |
| Ausencia | Solo Fact or Fake: tramo seguido con la pestaña oculta durante una pregunta pintada y sin responder; fallo si dura más de `OCULTA_MAX_MS = 3000` ms, medido al volver [D-115]. |
| Sellado | Solo Images (`normal` y `perro`): al agotarse la observación la imagen se tapa y se responde sin límite [D-77]. |
| Ficha | Lo que se revela tras responder, en el idioma del jugador. Images: prompt o "Real photograph" / "Fotografía real" [D-85, D-157]. Fact or Fake: `{aclaracion, detalles}`. Siempre ofuscada y rellenada. |
| Instrucciones | Pantalla intermedia de cada reto entre la portada y la partida [D-153]. Verla no gasta el intento. |
| Tarjeta | `article#afirmacion` de la partida de Fact or Fake [D-126]. No confundir con las tarjetas de reto de la portada (`button.reto`). |
| Fecha ISO | `AAAA-MM-DD` en hora **local**. |
| Mes de datos | `AAAA-MM`: el de un día `n` es `mesDeNumero(lanzamiento, n)`; el juego normal carga `data/facts/{mesDeFecha(fecha efectiva)}.json` y el modo prueba, todos [D-117]. |
| Modo | Solo Images: `investigador` (sin límite), `normal` (3000 ms), `perro` (1000 ms) [D-81]. Nombres visibles: Investigator / Investigador, Normal, Bloodhound / Sabueso. Se elige en `instrucciones` [D-153]. |
| Previsualización | Solo en `localhost`, `127.0.0.1` o `[::1]`: `?fecha=` fija la fecha efectiva y no se guarda nada (salvo el idioma, D-154) [D-68]. |
| Modo prueba | Con `?prueba=1` y `PRUEBAS_ABIERTAS = true`: desplegable de día en la portada, almacén en memoria (salvo el idioma), todos los meses de `data/facts/` [D-70, D-110, D-117, D-152]. |
| Fecha efectiva | La de la previsualización; si no, la del día elegido en modo prueba (`fechaDelDia(lanzamiento ?? FECHA_BASE_PRUEBA, n)`); si no, `fechaLocal(new Date())`. |

### 0.1 Convenciones obligatorias

- **Palabras prohibidas** [D-53, D-160]: `real`, `ia`, `ai`, `fake`, `dato`, `bulo`, `falso`, `falsa`, `verdadero` y `verdadera` no pueden aparecer en ids, clases, atributos `data-*` (nombres ni valores), nombres de archivo, rutas ni `alt` de nada publicado, ni en el `tema` de ningún día **en ningún idioma**.
  - Se comprueban **por palabra completa** sin distinguir mayúsculas (`contienePalabraProhibida` de `herramientas/temas.mjs`). Única excepción literal: `identifAI-it` [D-23]. `datos`, `data`, `facts`, `verdad` (de `data-verdad`, excepción de `CLAUDE.md`), `afirmaciones`, `aclaracion` y `detalles` no son palabras prohibidas (no son palabra completa de la lista).
  - Por esta regla, las clases `.dato`, `.dato-etiqueta`, `.dato-valor` y `.dato-ambar` del resultado pasan a `.cifra`, `.cifra-etiqueta`, `.cifra-valor` y `.cifra-ambar` [D-160].
  - El texto visible ("REAL", "AI", "IA", "FACT", "FAKE", "DATO", "BULO", "Fact or Fake", "¿Dato o Bulo?", "Real photograph", "Fotografía real", los lemas) no es un nombre ni una ruta. Fichas, afirmaciones y aclaraciones nunca aparecen en claro en lo publicado, en ningún idioma.
  - En `entrada/` (no publicada) sí aparecen `ia/`, `real/` y `answer: fact|fake`.
- Los ids aleatorios de imagen (10 caracteres) se comprueban además por subcadena (con la lista ampliada).
- La verdad y el voto se nombran siempre `autentica`/`generada` (o `0`/`1`) en código, datos y marcado, en los dos retos [D-02, D-122].
- Rutas siempre relativas y sin `/` inicial.
- **Ninguna petición a dominios externos** [D-29]. Fact or Fake no tiene enlaces externos [D-126].
- Los textos visibles salen de `js/textos.js`, del idioma activo (`TEXTOS[idioma]`) [D-155]. Únicas excepciones fijas en el HTML: los rótulos "EN" y "ES" del selector y sus nombres accesibles "English" y "Español" (endónimos, iguales en los dos idiomas) [D-154]. Temas, fichas, afirmaciones, aclaraciones y detalles son datos; solo se insertan con `textContent`.

### 0.2 Estructura de carpetas

| Ruta | Se publica | Contenido |
|---|---|---|
| `index.html` | sí | Todas las pantallas (también `instrucciones`) y el diálogo de ficha. Ya no hay `dialog#como-jugar` [D-152]. |
| `creditos.html`, **`creditos.es.html`** | sí | Créditos estáticos, sin JS, en inglés y en español, generados por `herramientas/creditos.mjs` [D-39, D-129, D-161]. |
| `.nojekyll` | sí | Vacío. |
| `css/variables.css`, `css/base.css`, `css/componentes.css` | sí | |
| `fonts/` | sí | Sin cambios (las dos fuentes cubren los caracteres del español: á é í ó ú ü ñ ¿ ¡; lo comprueba la tarea 100) [D-29, D-40]. |
| `js/` | sí | `main.js`, `juego.js`, `temporizador.js`, `diario.js`, `almacen.js`, `compartir.js`, `textos.js`. Sin archivos nuevos. |
| `img/ui/` | sí | Sin SVG nuevos: las ilustraciones de las tarjetas de reto son CSS [D-152]. |
| `casos/` | sí | `{id}.webp`, solo Images. |
| `data/calendario.json` | sí | Images y fecha de lanzamiento: **versión 5** (tema y fichas por idioma) [D-157]. |
| `data/facts/AAAA-MM.json` | sí | Fact or Fake: **versión 2**, los dos idiomas en el mismo archivo [D-158]. |
| `herramientas/*.mjs` | sí (repositorio) | Los de la 2.1, adaptados a los dos idiomas (4c-idiomas.md). |
| `herramientas/banco.json`, `banco.anterior.json`, `lote.json` | **no** | Sin cambios (banco **versión 3**: no guarda temas en español ni prompts). |
| `entrada/temas/NN-tema/{ia,real}/` | **no** | Imágenes y, junto a cada imagen de `ia/`, `{base}.txt` (prompt en español) y `{base}.en.txt` (prompt en inglés), **los dos obligatorios** [D-157]. |
| `entrada/temas/NN-tema/tema.es.txt` | **no** | **Nuevo**: el tema del día en español, una línea [D-159]. |
| `entrada/temas/NN-tema/facts.en.txt` y **`facts.es.txt`** | **no** | Las 5 afirmaciones del día en cada idioma, **las dos obligatorias** y emparejadas por posición [D-159]. `facts.txt` deja de usarse (se ignora con un aviso). |
| `entrada/temas/NN-tema/datos.txt` y `datos.original.txt` | **no** | Notas del usuario; ninguna herramienta las lee [D-139]. |
| `tests/` | sí (repositorio) | `*.test.mjs`. |
| `package.json` | sí | Sin scripts nuevos. |
| `docs/` | sí | `ESPECIFICACION.md`, `especificacion/*.md` (con `4c-idiomas.md`) y `DECISIONES.md`. |

---

## 1. Pantallas y estados

### 1.1 Pantallas

| Pantalla (`data-pantalla`) | Contenido |
|---|---|
| `iniciando` | Transitorio mientras se cargan el almacén, `data/calendario.json` y el archivo de afirmaciones del mes de la fecha efectiva (o, en modo prueba, todos los meses, en serie). Sin sección. |
| `portada` | [3.0, D-152] Cabecera con logo, lema y selector de idioma; "Case #n" y el tema (en modo prueba, desplegable de día); "Choose your case file"; dos tarjetas-botón (Images y Fact or Fake) con ilustración CSS, expediente, nombre, frase, estado y "Open file" + icono de flecha; pie con "New cases every day at midnight." y Credits. |
| `instrucciones` | [3.0, D-153] Del reto elegido: "All case files", logo y selector de idioma; carpeta con la página del briefing (membrete, nombre, frase, 4 pasos, firma) y la página de acción (Images: método de investigación con los 3 modos; Fact or Fake: normas con el aviso de ausencia y una ficha de ejemplo) con "Open the case". |
| `cargando` | Solo Images: precarga de las 5 imágenes. |
| `cuenta-atras` | Solo Images: 3, 2, 1. |
| `caso` | Sin cambios de la 2.1 (cabecera con progreso, vitrina o tarjeta, revelación) [D-141 a D-144]. Textos y teclas del idioma activo. |
| `resultado` | Sin cambios de la 2.1 (tablón de pruebas) [D-145, D-146], en el idioma activo. |
| `ya-jugado` | Sin cambios, en el idioma activo. |
| `sin-casos` | Ningún reto tiene caso hoy, o no hay fecha de lanzamiento [D-24, D-95]. |
| `error` | Sin cambios. |

- El veredicto es una fase de `caso` [D-05]. `dialog#ficha` es una ventana modal sobre `resultado`; no cambia el estado [D-88]. **`dialog#como-jugar` desaparece**: su contenido pasa a `instrucciones` [D-152, D-153].
- El selector de idioma solo está en `portada` e `instrucciones` [D-154]. En las demás pantallas el idioma no se puede cambiar (no hay selector).

### 1.2 Estado del juego

Un único objeto de estado, gestionado por la función pura `transicion(estado, evento)` de `js/juego.js`:

```js
{
  pantalla: 'portada',
  fase: null,                   // 'pregunta' | 'veredicto' | null (solo en 'caso')
  reto: 'imagenes',             // 'imagenes' | 'afirmaciones' [D-98, D-121]
  modo: 'normal',               // modo de Images; en afirmaciones no se usa
  idioma: 'en',                 // [3.0] 'en' | 'es' [D-154]
  retos: {
    imagenes:     { caso: {n, fecha, tema, pruebas, clave, fichas} | null, jugado: false },
    afirmaciones: { caso: {n, fecha, tema, clave, textos, fichas} | null, jugado: false }
  },
  // Copia del caso del reto elegido (CARGADO, ABRIR_RETO, VOLVER_PORTADA):
  n: 3,
  tema: { en: 'Fireworks', es: 'Fuegos artificiales' },      // [3.0] por idioma; null sin caso
  pruebas: ['k3x9q2m7ab', ...], // Images; null en afirmaciones
  textos: null,                 // [3.0] Fact or Fake: {en: [5 bloques], es: [5 bloques]}; null en imagenes
  clave: 'Mpb9Ycc=',
  fichas: { en: ['…', ...], es: ['…', ...] },               // [3.0] 5 × 684 car. por idioma, en los dos retos
  fecha: null,                  // fecha de la partida: FIN_CUENTA (Images) o EMPEZAR (Fact or Fake)
  indice: 0,
  resultados: '-----',
  activo: false,
  tapada: false,                // solo Images [D-77]
  texto: null,                  // Fact or Fake: afirmación actual descifrada en el idioma de la partida
  revelada: null,               // verdad de la prueba actual, solo en 'veredicto'
  ficha: null,                  // solo en 'veredicto', en el idioma de la partida
  motivo: null,                 // Fact or Fake: 'oculta' | null
  error: null                   // 'calendario' | 'imagenes' | null
}
```

- `jugado` significa "el intento de hoy de ese reto está gastado": partida `terminada` o `en_curso` (en otra pestaña o abandonada).
- [3.0] `idioma` decide qué bloque se descifra (`fichas[idioma][i]`, `textos[idioma][i]`, con la semilla de ese idioma, 4c-idiomas.md 4.17). Solo cambia con `CAMBIAR_IDIOMA` en `portada` e `instrucciones`, así que una partida, de la primera prueba al resultado, se juega entera en un idioma. `ya-jugado` y el tablón se pintan con el idioma vigente al mostrarlos.
- `texto` solo contiene la afirmación actual: el estado nunca guarda más de una afirmación descifrada.
- El estado no guarda instantes ni duraciones de ausencia [D-115] ni el mensaje final.

### 1.3 Eventos y transiciones

| Estado actual | Evento | Condición | Estado siguiente / efecto |
|---|---|---|---|
| `iniciando` | `CARGADO` `{retos, reto}` | `retos.imagenes.caso` y `retos.afirmaciones.caso` son `null` | `sin-casos` |
| `iniciando` | `CARGADO` | en otro caso | `portada`. `reto` = el pedido (`ajustes.reto`) si es válido y tiene caso; si no, el otro. Copia el caso de ese reto. **`idioma` se conserva** [3.0]. Antes, main.js cierra como abandonada cualquier partida `en_curso` de hoy de cada reto [D-79]. |
| `iniciando` | `ERROR_CALENDARIO` | falla `calendario.json` o un archivo de `data/facts/` (404 no es error) | `error` (`'calendario'`). |
| `portada` | `ABRIR_RETO` `{reto}` | [3.0] reto no válido o `retos[reto].caso === null` | el mismo objeto (la tarjeta está `disabled`). |
| `portada` | `ABRIR_RETO` | [3.0] `retos[reto].jugado` | `ya-jugado` de ese reto, con su caso copiado (`n`, `tema`, `pruebas`, `textos`, `clave`, `fichas`). |
| `portada` | `ABRIR_RETO` | [3.0] en otro caso | **`instrucciones`** con ese reto y su caso copiado; `fase`, `fecha`, `texto`, `revelada`, `ficha` y `motivo` a `null`. main.js guarda `ajustes.reto`. **No gasta el intento** [D-153]. |
| `portada`, `instrucciones` | `CAMBIAR_IDIOMA` `{idioma}` | [3.0] `idiomaValido(idioma)` y distinto del actual | la misma pantalla con `idioma`. main.js guarda la preferencia (6, 4c-idiomas.md) y vuelve a pintar todos los textos. Si no, el mismo objeto. |
| `instrucciones` | `ELEGIR_MODO` `{modo}` | [3.0] `reto === 'imagenes'` y `modoValido(modo)` | `modo`. main.js guarda `ajustes.modo`. Si no, el mismo objeto. |
| `instrucciones` | `EMPEZAR` `{fecha}` | `retos[reto].jugado` | `ya-jugado` [D-99] (solo por una carrera con otra pestaña). |
| `instrucciones` | `EMPEZAR` | reto `imagenes` | `cargando` [D-16]. El intento se gastará en `FIN_CUENTA`, como en la 2.1. |
| `instrucciones` | `EMPEZAR` `{fecha}` | reto `afirmaciones` | `caso`, `fase: 'pregunta'`, `indice: 0`, `resultados: '-----'`, `activo: false`, `fecha`, `texto = desofuscarAfirmacion(textos[idioma][0], clave, n, 0, idioma)`, `motivo: null`. **Se consume el intento**: main.js guarda la partida `en_curso` antes de pintar la primera afirmación [D-100]. |
| `instrucciones`, `resultado`, `ya-jugado` | `VOLVER_PORTADA` | | `portada` con el mismo `reto` y su caso copiado; `fase`, `fecha`, `texto`, `revelada`, `ficha`, `motivo` a `null`, `indice: 0`, `resultados: '-----'`. |
| `cargando`, `error`, `cuenta-atras` | `PRECARGA_OK`, `PRECARGA_ERROR`, `REINTENTAR`, `FIN_CUENTA` | | Como en la 2.1 (solo Images). |
| `caso/pregunta` | `PINTADA` | `activo === false` | `activo: true`. En Images, main.js arranca el temporizador salvo en `investigador`. |
| `caso/pregunta` | `VOTO` `{voto}` | `activo === true` | `veredicto`, código `A`/`F`, `revelada`, `activo: false`, `tapada: false`, `motivo: null`. `ficha`: Images, `desofuscarFicha(fichas[idioma][i], clave, n, i, idioma)`; Fact or Fake, `desofuscarAclaracion(fichas[idioma][i], clave, n, i, idioma)`. |
| `caso/pregunta` | `VOTO` | `activo === false` | el mismo objeto |
| `caso/pregunta` | `AGOTADO` | Images, `activo`, no tapada, modo con límite | `tapada: true` [D-77] |
| `caso/pregunta` | `AGOTADO` | cualquier otra situación | el mismo objeto |
| `caso/pregunta` | `VOLVIO` `{ocultoMs, indice}` | reto `afirmaciones`, `activo`, mismo `indice` y `ocultacionEsFallo(ocultoMs)` | `veredicto` con **`F`**, `revelada`, `ficha` (como en `VOTO`), `activo: false`, `motivo: 'oculta'` [D-115] |
| `caso/pregunta` | `VOLVIO` | cualquier otra situación | el mismo objeto |
| `caso/veredicto` | `SIGUIENTE` | `indice < 4` | `caso/pregunta`, `indice + 1`, `revelada`, `ficha` y `motivo` a `null`, `activo: false`, `tapada: false`; en Fact or Fake, `texto` = la afirmación siguiente en `idioma`. |
| `caso/veredicto` | `SIGUIENTE` | `indice === 4` | `resultado`, `fase: null`, `texto`, `revelada` y `ficha` a `null`, `retos[reto].jugado = true`. main.js guarda la partida `terminada` y las rachas. |
| `portada` | `OTRA_PESTANA` `{reto}` | [3.0] reto válido | `retos[reto].jugado = true`; sigue en `portada` (la tarjeta muestra el estado nuevo). |
| `instrucciones`, `cuenta-atras`, `caso` | `OTRA_PESTANA` `{reto}` | reto válido | `retos[reto].jugado = true`; si `reto === estado.reto` → `ya-jugado` [D-51]. |
| `cargando`, `resultado`, `ya-jugado` | `OTRA_PESTANA` `{reto}` | reto válido | `retos[reto].jugado = true`, sin cambiar de pantalla. |
| `resultado`, `ya-jugado` | `COMPARTIR` | | sin cambio de estado (efecto en main.js, en el idioma activo). |
| `portada`, `instrucciones`, `ya-jugado`, `sin-casos` | `MEDIANOCHE` | la fecha efectiva ha cambiado | `iniciando`: main.js vuelve a cargar el calendario y el mes de `data/facts/` de la nueva fecha; `idioma` se conserva. |
| cualquiera | evento no listado (incluidos `ELEGIR_RETO`, `VER_COMO_JUGAR`, `ENTENDIDO`, `OCULTA`, `EMPEZAR` y `ELEGIR_MODO` en `portada`, y `CAMBIAR_IDIOMA` fuera de `portada` e `instrucciones`) | | el mismo objeto |

Reglas adicionales:
- **Un intento al día por reto** [D-99], común a los tres modos [D-32] y **a los dos idiomas** [D-154]: la partida se guarda por fecha y por reto, sin idioma. Cambiar de idioma tras jugar muestra el mismo "Filed · n/5" (o "Archivado · n/5") y lleva al mismo `ya-jugado`.
- **Portada como centro** [D-98, D-152]: recargar en cualquier pantalla lleva a la portada (las instrucciones no se guardan). Una tarjeta de reto jugado abre directamente `ya-jugado`. `resultado` solo se ve una vez.
- **Reto sin caso**: su tarjeta muestra "No case today" y lleva `disabled`.
- **Teclado** [D-156]: en `caso/pregunta`, `votoDeTecla(estado.reto, tecla, estado.idioma)` decide el voto: R e I en Images (los dos idiomas); F y K en Fact or Fake en inglés; D y B en ¿Dato o Bulo? en español. Con Ctrl, Alt o Meta no se trata ninguna tecla del juego. Enter sigue con Next.
- **Pestaña oculta**: Images, sin efecto [D-78]; Fact or Fake, regla de los 3 s de la 2.1 sin cambios (empieza con `estado.reto === 'afirmaciones'`, `caso/pregunta` y `activo`; se mide al volver; `VOLVIO`) [D-101, D-115].
- **Partida abandonada**: pendientes → `F` [D-79].
- **Medianoche durante la partida**: la partida usa los datos ya cargados. En `resultado`, como en la 2.1 (D-145).
- **Veredicto**: avance manual con Next o Enter [D-27].
- **Ficha y texto**: `texto` solo existe en `caso`; `ficha`, solo en `veredicto`. En `resultado`, main.js descifra al pintar el tablón (con `estado.idioma`) la verdad y las afirmaciones ya contestadas; la ficha de cada tarjeta, solo al abrirla [D-145].
- **Tema**: no se guarda ni se comparte [D-54].
- **Previsualización y modo prueba**: la tabla no cambia. [3.0] El modo prueba ya no usa `&reto=` (`retoDePrueba` se retira) [D-152].

### 1.4 Diagrama

```
iniciando ──► portada ──► sin-casos / error
               │ CAMBIAR_IDIOMA (portada, instrucciones)
               │ ABRIR_RETO, reto jugado ──────────────────────────────────► ya-jugado
               │ ABRIR_RETO ──► instrucciones ──VOLVER_PORTADA──► portada
               │                 │ ELEGIR_MODO (solo Images)
               │                 │ EMPEZAR, imagenes ──► cargando ──► cuenta-atras ──FIN_CUENTA──┐
               │                 │ EMPEZAR, afirmaciones (gasta el intento) ─────────────────────┤
               ▼                                                                                 ▼
                     caso[i]/pregunta ──VOTO / VOLVIO >3000 ms (solo afirmaciones)──► caso[i]/veredicto
                     (imagenes: AGOTADO → tapada)                                      │ SIGUIENTE i<4 → caso[i+1]
                                                                                       ▼ i = 4
                                                                                   resultado
resultado / ya-jugado ──VOLVER_PORTADA──► portada
portada / instrucciones / ya-jugado / sin-casos ──MEDIANOCHE──► iniciando
portada (modo prueba) ──change del desplegable de día──► ?prueba=1&dia=n (recarga) ──► iniciando
```

---

## 2. Contrato HTML/CSS

El Perito Visual crea marcado y estilos; el Agente de Campo solo usa los ganchos de esta sección. Ningún otro id, clase o atributo es estable. Cualquier cambio pasa por el inspector-jefe y DECISIONES.

### 2.1 Mecanismo de pantallas e idioma

- `<main id="app" data-pantalla="portada" data-reto="imagenes" data-modo="normal">`: main.js mantiene al día `data-pantalla`, `data-reto` (`imagenes|afirmaciones`) y `data-modo`.
- [3.0] `<html lang>`: main.js pone `document.documentElement.lang` = `'en'` o `'es'` al arrancar y en cada `CAMBIAR_IDIOMA` [D-154]. CSS puede usar `:lang(es)` para ajustes de composición (textos más largos, R20); nunca para mostrar u ocultar contenido.
- Cada pantalla es `<section class="pantalla" id="pantalla-{nombre}" hidden>`; solo una sin `hidden`.
- Foco al cambiar de pantalla: `data-foco` o el primer `h1`/`h2` [D-41]. `CAMBIAR_IDIOMA` no mueve el foco (se queda en el botón del selector pulsado, que no se recrea).
- [3.0] **Repintado de textos**: al arrancar y en cada `CAMBIAR_IDIOMA`, main.js recorre todos los `[data-texto]` y `[data-texto-aria]` del documento con `TEXTOS[idioma]` y vuelve a pintar la pantalla actual (que rellena los textos dinámicos).

### 2.2 Atributos genéricos

| Atributo | Dónde | Uso |
|---|---|---|
| `data-texto="grupo.clave"` | elementos con texto fijo | main.js pone `textContent` con `TEXTOS[idioma]`. |
| `data-texto-aria="grupo.clave"` | [3.0] elementos con nombre accesible fijo | main.js pone `aria-label` con `TEXTOS[idioma]` [D-154]. |
| `data-accion` | `<button>` | [3.0] `abrir-reto`, `idioma`, `empezar` (solo en `instrucciones`), `siguiente`, `compartir`, `reintentar`, `ver-ficha`, `cerrar-ficha` y `volver-portada`. **Retiradas**: `abrir-ayuda`, `cerrar-ayuda`, `abrir-prueba` [D-152]. |
| `data-reto-boton="imagenes\|afirmaciones"` | [3.0] los dos `button.reto` de la portada | Reto de la tarjeta. |
| `data-idioma="en\|es"` | [3.0] los botones del selector de idioma | Idioma del botón; con `aria-pressed="true\|false"` según `estado.idioma` [D-154]. |
| `data-reto-nombre="imagenes\|afirmaciones"` | `span` de `#caso-reto`, `#veredicto-titulo`, `#resultado-nota` y [3.0] `#instrucciones-titulo` y `#instrucciones-frase` | Texto de cada reto; CSS solo muestra el que coincide con `#app[data-reto]`. |
| `data-voto="autentica"` / `"generada"` | botones de respuesta | Fijos, comunes a los dos retos e idiomas [D-122]. |
| `data-foco` | uno por pantalla | |
| `data-estado="acierto\|fallo"` | `#veredicto` y cada `button.miniatura` | Resultado del jugador. Ausente antes de responder. |
| `data-estado="pendiente\|actual\|acierto\|fallo"` | cada `li` de `#caso-progreso` | Progreso [D-141]. |
| `data-verdad="autentica\|generada"` | `#veredicto` (solo en veredicto) y cada `button.miniatura` del resultado | [D-145]. |
| `data-fase`, `data-tapada` | `#pantalla-caso` | `pregunta\|veredicto` y `si\|no`. |
| `data-nivel`, `--restante` | `#temporizador` | Solo Images. |
| `data-prueba="1".."5"` | `button.miniatura` | Posición. |
| `data-visible` | `#compartir-aviso` | `si\|no`. |
| `data-pagina` | `<body>` | `juego` o `creditos`. |

Clases estructurales: `.solo-lectores`, `.pantalla`, `.prueba-img`, `.boton-texto`, `.reto`, `.reto-estado`, [3.0] `.selector-idioma`, `.modo`, `.miniatura` y las piezas de las tarjetas del resultado (`.mini-foto`, `.mini-img`, `.mini-cabecera`, `.mini-numero`, `.mini-sello`, `.mini-texto`, `.mini-pie`, `.mini-voto`). **Retirada**: `.reto-radio`. Los estados van en `data-*` [D-03]. Las demás clases son solo de estilo; [3.0] `.dato*` pasa a `.cifra*` [D-160], y ninguna clase nueva (ilustraciones, carpeta, páginas) puede contener palabras prohibidas.

Temas, afirmaciones, aclaraciones, detalles y fichas solo como `textContent` en los elementos que se citan aquí. Nada de eso va en ids, clases, otros atributos, `alt` ni rutas.

### 2.3 Elementos por pantalla

`{r}` es `imagenes` o `afirmaciones`. Todos los textos son de `TEXTOS[estado.idioma]`. En las plantillas, la posición de una prueba (`{i}`, o `{n}` en `final.alt_prueba`) va de 1 a 5.

**Selector de idioma** [3.0, D-154], idéntico en `portada` e `instrucciones` (dos instancias, sin ids):
```html
<div class="selector-idioma" role="group" data-texto-aria="portada.idioma">
  <button type="button" data-accion="idioma" data-idioma="en" lang="en" aria-label="English" aria-pressed="true">EN</button>
  <span class="selector-idioma-barra" aria-hidden="true">|</span>
  <button type="button" data-accion="idioma" data-idioma="es" lang="es" aria-label="Español" aria-pressed="false">ES</button>
</div>
```
- Al pulsar un botón: `CAMBIAR_IDIOMA {idioma}`; main.js guarda la preferencia, actualiza `aria-pressed` en las dos instancias y, si la URL lleva `lang`, lo sustituye con `history.replaceState` (para que recargar no lo deshaga).
- Área táctil de 44 x 44 px por botón; el idioma activo se distingue sin depender del color (subrayado o peso).

**Portada** (`#pantalla-portada`) [3.0, D-152], en este orden del DOM:
- `header.portada-cabecera`:
  - `div.portada-marca` con `h1[tabindex="-1"][data-foco] data-texto="portada.titulo"` y `p.portada-lema data-texto="portada.lema"` (común a los dos retos).
  - el selector de idioma (a la derecha).
- `div#portada-dia`:
  - `p#portada-caso`: `rellenar(portada.etiqueta_caso, {n})` ("Case #3" / "Caso n.º 3"); vacío y `hidden` si `estado.n` es `null`.
  - `p#portada-tema`: `estado.tema[idioma]` (el tema solo, sin plantilla; CSS le antepone "· "); vacío y `hidden` sin caso. En modo prueba lleva `hidden` siempre.
  - **Modo prueba** (solo con `pruebaActiva`): main.js crea, justo después de `#portada-tema`, `select#selector-prueba-dia` con `aria-label` = `prueba.etiqueta`, una `option` por día de `diasDePrueba` (`value = String(n)`, texto `rellenar(prueba.opcion, {n, tema})` con el tema del día en el idioma activo; si los dos retos tienen tema y difieren, unidos por " / ") y la del día abierto `selected`. Al cambiar (`change`), navega a `?prueba=1&dia={n}` (recarga) [D-152, DP-68]. Al cambiar de idioma, main.js reescribe el texto de las opciones. Ya no hay `#selector-prueba` ni botón "Open this day".
- `h2#portada-elige data-texto="portada.elige_reto"` ("Choose your case file").
- `div.retos` con dos tarjetas-botón, primero Images y después Fact or Fake:
  ```html
  <button type="button" class="reto" data-accion="abrir-reto" data-reto-boton="{r}"
          aria-labelledby="reto-{r}-nombre" aria-describedby="reto-{r}-desc reto-{r}-estado">
    <span class="reto-ilustracion" aria-hidden="true">
      <!-- Images: tres span.polaroid y span.ilustracion-sello data-texto="portada.sello_ilustracion" ("AI?" / "¿IA?") -->
      <!-- Fact or Fake: dos span.ficha-muestra, cada una con span.ilustracion-sello:
           data-texto="afirmaciones.sello_autentica" y data-texto="afirmaciones.sello_generada" -->
    </span>
    <span class="reto-expediente" data-texto="portada.expediente_{r}">[[portada.expediente_{r}]]</span>
    <span class="reto-nombre" id="reto-{r}-nombre" data-texto="portada.reto_{r}">[[portada.reto_{r}]]</span>
    <span class="reto-desc" id="reto-{r}-desc" data-texto="portada.desc_reto_{r}">[[portada.desc_reto_{r}]]</span>
    <span class="reto-estado" id="reto-{r}-estado"></span>
    <span class="reto-abrir" aria-hidden="true" data-texto="portada.abrir">[[portada.abrir]]</span>
  </button>
  ```
  - Toda la tarjeta es el botón: pulsarla (o Enter / Espacio con el foco en ella) despacha `ABRIR_RETO {reto: data-reto-boton}`.
  - `.reto-ilustracion`: dibujo hecho solo con CSS (sin imágenes ni `data:`; CSP): Images, tres polaroids superpuestas con un sello "AI?"; Fact or Fake, dos fichas con los sellos FACT y FAKE. Los textos de los sellos son `span` con `data-texto` dentro del contenedor `aria-hidden`. Con `prefers-reduced-motion`, sin animación.
  - `.reto-estado` (main.js, `textContent`): `portada.estado_sin_caso`, `portada.estado_jugado` (`{aciertos}`), `portada.estado_en_curso` o `portada.estado_pendiente`.
  - `disabled` si ese reto no tiene caso hoy. Una tarjeta de reto jugado o en curso en otra pestaña no lleva `disabled`: abre `ya-jugado`.
  - No hay reto "elegido" en la portada: las dos tarjetas tienen el mismo aspecto salvo por su estado.
- `footer#portada-pie`: `p#portada-aviso-dia data-texto="portada.pie"` ("New cases every day at midnight.") y `a#portada-creditos data-texto="portada.enlace_creditos"`, cuyo `href` pone main.js: `creditos.html` en inglés y `creditos.es.html` en español [D-161].
- **Retirados** [D-152]: `fieldset#portada-retos`, los radios `#reto-{r}` y `.reto-radio`, `.reto-cabecera`, `.reto-accion`, `fieldset#portada-modos` (los radios de modo pasan a `instrucciones`), `#portada-regla`, `#portada-empezar-{r}-texto`, `#portada-racha`, `button.boton-ayuda`, `dialog#como-jugar` (con `#como-jugar-titulo`, `#como-jugar-pasos`, `#como-jugar-cerrar`), `div#selector-prueba` y el botón `abrir-prueba`. La racha ya no se ve en la portada (resultado y `ya-jugado` la muestran) [DP-69].

**Instrucciones** (`#pantalla-instrucciones`) [3.0, D-153]:
```html
<section class="pantalla" id="pantalla-instrucciones" hidden>
  <header class="instrucciones-cabecera">
    <button type="button" class="boton-volver" data-accion="volver-portada">
      <span aria-hidden="true">←</span><span class="boton-texto" data-texto="instrucciones.volver">[[instrucciones.volver]]</span>
    </button>
    <p class="instrucciones-logo" data-texto="portada.titulo">[[portada.titulo]]</p>
    <!-- selector de idioma -->
  </header>
  <div class="carpeta">
    <article class="pagina" id="instrucciones-briefing" aria-labelledby="instrucciones-titulo">
      <p id="instrucciones-membrete"></p>
      <h2 id="instrucciones-titulo" tabindex="-1" data-foco>
        <span data-reto-nombre="imagenes" data-texto="portada.reto_imagenes">[[portada.reto_imagenes]]</span>
        <span data-reto-nombre="afirmaciones" data-texto="portada.reto_afirmaciones">[[portada.reto_afirmaciones]]</span>
      </h2>
      <p id="instrucciones-frase">
        <span data-reto-nombre="imagenes" data-texto="instrucciones.frase_imagenes">[[instrucciones.frase_imagenes]]</span>
        <span data-reto-nombre="afirmaciones" data-texto="instrucciones.frase_afirmaciones">[[instrucciones.frase_afirmaciones]]</span>
      </p>
      <ol id="instrucciones-pasos"></ol>
      <p id="instrucciones-firma" data-texto="instrucciones.firma">[[instrucciones.firma]]</p>
    </article>
    <div class="pagina" id="instrucciones-accion">
      <fieldset id="instrucciones-modos">
        <legend data-texto="instrucciones.metodo">[[instrucciones.metodo]]</legend>
        <div class="modo">
          <input type="radio" name="modo" id="modo-investigador" value="investigador">
          <label for="modo-investigador"><span class="modo-nombre" data-texto="portada.modo_investigador"></span><span class="modo-desc" data-texto="portada.desc_investigador"></span></label>
        </div>
        <!-- igual con modo-normal (portada.modo_normal, portada.desc_normal) y modo-perro (portada.modo_perro, portada.desc_perro) -->
      </fieldset>
      <div id="instrucciones-reglas">
        <h3 data-texto="instrucciones.reglas">[[instrucciones.reglas]]</h3>
        <p id="instrucciones-aviso" data-texto="afirmaciones.aviso_oculta">[[afirmaciones.aviso_oculta]]</p>
        <div id="instrucciones-ejemplo" aria-hidden="true">
          <p class="ejemplo-etiqueta" data-texto="instrucciones.ejemplo_etiqueta"></p>
          <p class="ejemplo-texto" data-texto="instrucciones.ejemplo"></p>
          <p class="ejemplo-marca" data-texto="afirmaciones.marca"></p>
          <span class="ejemplo-boton" data-texto="afirmaciones.boton_autentica"></span>
          <span class="ejemplo-boton" data-texto="afirmaciones.boton_generada"></span>
        </div>
      </div>
      <button type="button" class="boton boton-primario" data-accion="empezar">
        <span class="boton-texto" data-texto="instrucciones.boton_empezar">[[instrucciones.boton_empezar]]</span>
      </button>
    </div>
  </div>
</section>
```
- **Cabecera**: "All case files" (`volver-portada` → `VOLVER_PORTADA`), el logo (texto, no `h1`) y el selector de idioma.
- **Página izquierda** (briefing, papel mecanografiado, `--fuente-cuerpo` Special Elite):
  - `#instrucciones-membrete`: `rellenar(instrucciones.membrete, {n, tema: estado.tema[idioma]})` ("Briefing · Case #3 · Dogs"); mayúsculas por CSS.
  - `#instrucciones-titulo`: nombre del reto (recibe el foco al entrar); `#instrucciones-frase`: una frase del reto.
  - `#instrucciones-pasos`: main.js pone un `li` sin atributos por paso de `instrucciones.pasos_imagenes` o `instrucciones.pasos_afirmaciones` (exactamente 4), al entrar y al cambiar de idioma. CSS los numera.
  - `#instrucciones-firma`: "One try per day. — The Chief" (exacto).
- **Página derecha** (acción):
  - **Images**: `#instrucciones-modos` visible y `#instrucciones-reglas` con `hidden` (lo pone main.js según `estado.reto`). Los tres modos son casillas de formulario: el `input` real (visualmente oculto pero enfocable, flechas del teclado como radio nativo) y una casilla dibujada por CSS; la elegida lleva un aspa roja (`input:checked + label`). main.js marca el radio de `estado.modo`; `change` → `ELEGIR_MODO {modo}`. Foco visible en la casilla.
  - **Fact or Fake**: `#instrucciones-reglas` visible y `#instrucciones-modos` con `hidden`. `#instrucciones-aviso` = el aviso de ausencia exacto, en un recuadro rojo de aviso (contraste AA). `#instrucciones-ejemplo`: ficha de muestra con una afirmación **inventada y fija** (`instrucciones.ejemplo`, no es ninguna afirmación de los datos y no lleva respuesta), la marca y los botones FACT y FAKE en gris como `span` (no son botones, no reciben foco ni hacen nada).
  - Botón rojo "Open the case" (`empezar` → `EMPEZAR {fecha}`).
- **Composición**: en ancho (≥ 600 px de ancho y horizontal) la carpeta abierta con dos páginas; en móvil vertical, **una sola página** con todo en el orden del DOM (briefing y después acción), sin deslizar (R19).
- `#instrucciones-ejemplo` no lleva el bloqueo de copia (no es un dato del juego) y no contiene la respuesta de nada.

**Cargando** y **Cuenta atrás**: sin cambios (solo Images).

**Caso** (`#pantalla-caso`, con `data-fase` y `data-tapada`) [D-141, D-142, D-144], **sin cambios de marcado** respecto a la 2.1; todos los textos del idioma activo:
- `header#caso-cabecera`, en orden:
  - `div#caso-titulo`: `p#caso-reto` con dos `span[data-reto-nombre]` (`portada.reto_imagenes`, `portada.reto_afirmaciones`) y `p#caso-tema` = `rellenar(partida.caso_del_dia, {tema: estado.tema[idioma]})` (vacío sin tema).
  - `p#caso-etiqueta.solo-lectores[tabindex="-1"][data-foco]`: `partida.etiqueta_prueba` en Images o `afirmaciones.etiqueta_prueba` en Fact or Fake. Recibe el foco al empezar cada pregunta y da nombre a `#afirmacion`.
  - `ol#caso-progreso[aria-hidden="true"]` con 5 `li` (`data-estado`).
  - `div#caso-puntuacion`: `p#caso-modo` = `rellenar(partida.modo_etiqueta, {modo})` en Images (vacío en Fact or Fake) y `p#caso-marcador` = `rellenar(partida.marcador, {aciertos})`.
  - Último, `<p id="caso-aviso" data-texto="afirmaciones.aviso_oculta" hidden>`: visible **solo** con `afirmaciones`, `caso`, `pregunta` e `indice === 0`; anunciado una vez por `#temporizador-anuncio` tras `PINTADA` de la prueba 1 [D-115].
- `div#caso-escena` contiene, en este orden, la vitrina, la ficha de papel, el temporizador y los botones:
  - **Vitrina** (solo Images):
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
    - `#prueba-marco` recibe la `img.prueba-img` precargada (`alt` = `partida.alt_prueba` del idioma activo, 1080 x 1350). `#prueba-caja` 4:5 con `object-fit: contain` [D-144].
    - En el veredicto de Images, `#prueba-etiqueta` = `rellenar(revelacion.etiqueta_prueba, {i})` y `#prueba-sello` = el texto de `#veredicto-sello` (REAL o AI / IA). En Fact or Fake quedan vacíos.
  - **Ficha de papel** `div#caso-tarjeta`, en orden:
    - Franja del veredicto:
      ```html
      <div id="veredicto-banda" role="status">
        <span id="veredicto-icono" aria-hidden="true"></span>
        <div id="veredicto-banda-cuerpo">
          <p id="veredicto-banda-texto"></p>
          <p id="veredicto-texto"></p>
        </div>
      </div>
      ```
      `#veredicto-banda-texto` = `rellenar(revelacion.banda_acierto|banda_fallo, {voto})` con `{voto}` = lo que dijo el jugador (`partida.voto_*` o `afirmaciones.voto_*`), o `revelacion.banda_oculta` si `motivo === 'oculta'`. `#veredicto-texto`: variante de `veredictos.acierto|fallo`, o de `afirmaciones.oculta`.
    - Tarjeta de la afirmación [D-102, D-126]:
      ```html
      <article id="afirmacion" hidden aria-labelledby="caso-etiqueta">
        <p id="afirmacion-titulo" aria-hidden="true" data-texto="revelacion.titulo_afirmacion">[[revelacion.titulo_afirmacion]]</p>
        <p id="afirmacion-texto"></p>
        <p id="afirmacion-marca" aria-hidden="true" data-texto="afirmaciones.marca">[[afirmaciones.marca]]</p>
      </article>
      ```
      - main.js le quita `hidden` solo en Fact or Fake y rellena `#afirmacion-texto` con `estado.texto` (o `afirmaciones.no_disponible`).
      - `#afirmacion-marca`: "identifAI-it · Fact or Fake?" en inglés y "identifAI-it · ¿Dato o Bulo?" en español (exactos), en todas las pruebas [D-128, D-155].
      - **Bloqueo de copia** (freno casual): CSS `user-select: none` (y prefijos) en `#afirmacion` y oyentes de `copy`, `cut`, `contextmenu`, `dragstart` y `selectstart` con `preventDefault()` [D-102].
      - Texto real del DOM, sin `aria-hidden`, legible por lectores de pantalla.
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
      - `#veredicto-sello`: Images `partida.sello_*` (REAL / AI, o REAL / IA); Fact or Fake `afirmaciones.sello_*` (FACT / FAKE, o DATO / BULO).
      - `#veredicto-resumen`: Images `revelacion.resumen_*`; vacío y oculto en Fact or Fake.
      - `#veredicto-aclaracion`: solo Fact or Fake en veredicto; `ficha.aclaracion` y un `<li>` sin atributos por detalle; con 0 detalles, `ul` vacío y con `hidden`; si `ficha` es `null`, `afirmaciones.aclaracion_no_disponible`.
      - `#veredicto-confesion`: solo Images; el prompt **entero** en el idioma activo (`estado.ficha`) o `confesion.no_disponible`; CSS la oculta con `#veredicto[data-verdad="autentica"]`.
    - `p#veredicto-marca[aria-hidden="true"] data-texto="partida.marca"`: pie de la ficha, solo Images y en horizontal.
  - `#temporizador` (con `#temporizador-cinta`) y `p#temporizador-anuncio.solo-lectores[aria-live="polite"]`: solo Images (salvo el aviso de ausencia de la prueba 1).
  - `#caso-botones` [D-122, D-156]:
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
    - main.js pone, en cada render de `caso`, el texto (`partida.boton_*` o `afirmaciones.boton_*`), el contenido de `kbd` y `aria-keyshortcuts` con **`teclaDeVoto(reto, voto, idioma)`**: R/I (Images, los dos idiomas), F/K (Fact or Fake en inglés), D/B (en español).
    - Texto de Next: `partida.boton_ver_resultado` en la prueba 5; si no, `afirmaciones.boton_siguiente` o `partida.boton_siguiente`.
    - CSS oculta Next en la pregunta y los votos en el veredicto; Next nunca queda tapado [D-142, D-144].
- Al salir del veredicto, main.js limpia `#veredicto` y sus hijos, `#prueba-etiqueta`, `#prueba-sello` y la aclaración, como en la 2.1. Fuera de `caso` vacía además `#afirmacion-texto`.

**Resultado** (`#pantalla-resultado`), tablón de pruebas [D-145, D-146], sin cambios de la 2.1 salvo las clases `.cifra*` [D-160] y el idioma:
- `div.cinta-peligro`; `header#resultado-franja` con `p#resultado-aciertos[tabindex="-1"][data-foco]` (`final.aciertos`), `div#resultado-datos` (`p#resultado-reto` = `etiquetaResultado([nombre del reto, rellenar(portada.etiqueta_caso, {n}), estado.tema[idioma], nombre del modo])`, mayúsculas por CSS; `p#resultado-mensaje` = `mensajeFinal(aciertos, mensajesDelReto(estado.reto, TEXTOS[idioma].final))`) y `p#resultado-sello[aria-hidden="true"] data-texto="resultado.sello_cerrado"`.
- `div#resultado-tablon` con `ol#resultado-revision` y `p#resultado-nota` (dos `span[data-reto-nombre]`).
- **Tarjetas**: 5 `li` con `button.miniatura[data-accion="ver-ficha"][data-prueba][data-estado][data-verdad][aria-haspopup="dialog"]`, como en la 2.1 (`.mini-foto`/`.mini-img`/`.mini-sello` en Images; `.mini-cabecera`/`.mini-numero`/`.mini-sello`/`.mini-texto` en Fact or Fake; `.mini-pie`/`.mini-voto` en los dos). `.mini-texto` = `desofuscarAfirmacion(textos[idioma][i], clave, n, i, idioma)`. Coexistencia en el DOM y bloqueo de copia del tablón como en la 2.1 [D-145]. En cualquier render de otra pantalla, main.js vacía `#resultado-revision`.
- `footer#resultado-pie`:
  ```html
  <div id="resultado-rachas">
    <p class="cifra"><span class="cifra-etiqueta" data-texto="resultado.etiqueta_racha">…</span><span class="cifra-valor" id="resultado-racha"></span></p>
    <p class="cifra"><span class="cifra-etiqueta" data-texto="resultado.etiqueta_mejor_racha">…</span><span class="cifra-valor" id="resultado-mejor-racha"></span></p>
    <p class="cifra" id="resultado-proximo"><span class="cifra-etiqueta" data-texto="resultado.siguiente_caso">…</span><span class="cifra-valor cifra-ambar" id="resultado-cuenta-atras" aria-live="off"></span></p>
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
  Rachas, cuenta atrás y medianoche en resultado como en la 2.1 [D-145].

**Ya jugado** (`#pantalla-ya-jugado`): sin cambios (`#ya-jugado-reto`, `#ya-jugado-aciertos`, `#ya-jugado-modo` con `hidden` en Fact or Fake, `#ya-jugado-cuadros` con `aria-label` = `final.cuadros_etiqueta`, `#ya-jugado-racha`, `#ya-jugado-cuenta-atras`, Share y Back). No tiene selector de idioma: se pinta en el idioma vigente.

**Sin casos**: `<p id="sin-casos-texto" tabindex="-1" data-foco>`: `sin_casos.sin_lanzamiento` si `lanzamiento === null`, o `sin_casos.texto` [D-95]. **Error**: sin cambios.

**Comunes**: `#compartir-aviso`, `#compartir-manual` con su `label`, `#aviso-almacen`, `#aviso-previsualizacion` (`avisos.previsualizacion`, con `formatearFecha(fecha, idioma)`, o `avisos.prueba`) y `dialog#ficha`.

**Diálogo `#ficha`** [D-88, D-126], sin cambios de marcado:
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
- Se abre solo desde una tarjeta `ver-ficha` del resultado. Lo que muestra se descifra al abrir, con `estado.idioma`, y no se guarda. Contenido por reto, vaciado al cerrar y foco devuelto como en la 2.1.

Ids que **desaparecen** en la 3.0 (no se crean): `portada-retos`, `reto-imagenes`, `reto-afirmaciones` (los radios; los ids `reto-{r}-nombre`, `reto-{r}-desc` y `reto-{r}-estado` siguen o son nuevos), `portada-modos` (pasa a `instrucciones-modos`), `portada-regla`, `portada-empezar-imagenes-texto`, `portada-empezar-afirmaciones-texto`, `portada-racha`, `como-jugar`, `como-jugar-titulo`, `como-jugar-pasos`, `como-jugar-cerrar`, `selector-prueba`. Siguen sin existir los de la 2.0 retirados (`reto-titulares*`, `recorte*`, `veredicto-fuente*`, `ficha-recorte`, `ficha-titular`, `ficha-entradilla`, `ficha-fuente*`, `creditos-noticias`, `creditos-medios`, `creditos-ficcion`).

### 2.4 Cabecera de index.html

CSP sin cambios: `default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'` [D-36]. `<html lang="en">` en el archivo; main.js lo cambia a `es` si hace falta antes de mostrar la portada [D-154]. `<title>` "identifAI-it" (igual en los dos idiomas). `meta description` en inglés (estática; los buscadores no ejecutan el cambio de idioma). El `<noscript>` lleva el aviso en los dos idiomas, cada frase en un `span` con su `lang`.

### 2.5 Tipografías

Sin cambios [D-29, D-40]. El briefing de `instrucciones` usa `--fuente-cuerpo` (Special Elite, "a máquina"); los nombres de reto, `--fuente-titulos`. La tarea 100 comprueba que los `woff2` incluyen los glifos del español (á é í ó ú ü ñ ¿ ¡ « » —); si faltara alguno, se avisa al usuario antes de cambiar nada (D-29).

### 2.6 Composición sin deslizar [D-84]

Siguen R1 a R18 de la 2.1 con los mismos tamaños garantizados (360 x 640, 640 x 360, 1280 x 720, 390 x 844, 768 x 1024), salvo R8, que se sustituye, y con las reglas nuevas R19 y R20:

- **R8. Portada** [3.0, D-152]: cabecera en una fila (logo y lema a la izquierda, selector a la derecha); "Case #n · tema" en una línea; "Choose your case file"; las dos tarjetas (en horizontal o ≥ 600 px de ancho, en una fila; en vertical estrecho, el perito-visual elige fila o columna mientras quepan sin deslizar a 360 x 640 con los textos en español); pie en una línea. Orden de compresión: primero la ilustración se reduce (hasta 56 px de alto) después el lema puede ocupar dos líneas si cabe, nunca se recorta; si no cabe, R13. Cada tarjeta mide al menos 44 px de alto y muestra entero el nombre (también "¿Dato o Bulo?") y el estado. En modo prueba, el desplegable de día ocupa el sitio del tema y `#aviso-previsualizacion` cabe sin deslizar.
- **R19. Instrucciones** [3.0, D-153]: en horizontal y ≥ 600 px de ancho, carpeta abierta con dos páginas de papel de igual alto (lomo central); en vertical, una sola página con todo en orden del DOM. A 360 x 640, en los dos idiomas, cabe sin deslizar: cabecera, membrete, nombre, frase (2 líneas como máximo), 4 pasos de 80 caracteres como máximo (14 px como mínimo), firma, y después los tres modos en una fila (Images) o el aviso (2 líneas como máximo) y la ficha de ejemplo compacta (afirmación de 1 o 2 líneas, botones grises de 32 px) (Fact or Fake), y el botón "Open the case" (44 px como mínimo, siempre visible). Si no cupiera (zoom, texto ampliado), R13: la página se desplaza por dentro; el botón nunca.
- **R20. Español** [3.0]: todas las pantallas y estados de R1–R19 se comprueban también con `lang="es"` y los textos en español más largos de `js/textos.js` (y afirmaciones de 140, aclaraciones de 160 y 3 detalles de 80 caracteres en español). Si un texto en español no cabe, se acorta el texto (cronista), no se encoge la letra por debajo de los mínimos.
- **R11. Diálogo**: igual.

### 2.7 creditos.html y creditos.es.html [D-39, D-129, D-161]

- Dos páginas estáticas con la misma estructura de la 2.1 (`#creditos-imagenes`, `#creditos-afirmaciones`, tipografías, enlace de vuelta), generadas por `herramientas/creditos.mjs` en la misma ejecución: `creditos.html` con `TEXTOS.en` y `lang="en"`, `creditos.es.html` con `TEXTOS.es` y `lang="es"`. Mismas fuentes, licencias y CSP; deterministas byte a byte.
- El enlace de vuelta apunta a `index.html` en las dos (el idioma lo recuerda la preferencia guardada).
- Cada página enlaza a la otra con un enlace discreto ("Español" en la inglesa, "English" en la española, con `hreflang` y `lang`), para que el idioma de los créditos se pueda cambiar sin JS.
- `creditos.afirmaciones_texto` en inglés sigue siendo exacto (D-132); en español lo propone el cronista y lo aprueba el usuario.
