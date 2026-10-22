# identifAI-it: especificación técnica

**Versión 1.2, del 2026-10-21.** Parte de la versión 1.1 (2026-10-19, con los ajustes D-40 a D-51) e incorpora el cambio de comportamiento de los **temas por día** [D-52 a D-63]: cada día tiene un tema y exactamente 5 imágenes elegidas por el usuario en `entrada/temas/`, el tema se muestra en la partida ("Caso del día: Perros"), `data/calendario.json` pasa a la versión 2 con el campo `tema`, desaparecen la regla de categorías y la selección aleatoria del banco, y `herramientas/importar.mjs` genera directamente el calendario [D-64]. Incluye además, sin cambiar el número de versión [D-69, D-75], los ajustes del 2026-10-22: recorte por atención con `herramientas/lote.json` y reimportación [D-65], criterio de marcas de agua [D-66], corrección del criterio 90 [D-67], previsualización local de un día [D-68], **modo prueba para amigos hasta el lanzamiento** con su tarea de apagado [D-70, D-71], las funciones de reimportación en 4.6 [D-72], la eliminación de `docs/muestras.html` [D-73] y la revisión de las imágenes por el usuario [D-74]. Cualquier cambio posterior necesita una decisión nueva en `docs/DECISIONES.md`. La versión solo sube (1.3, 1.4...) cuando cambia el comportamiento del juego; los ajustes pequeños se apuntan en DECISIONES.md y se reflejan aquí sin cambiar el número de versión [D-44].

Este documento es la fuente de verdad técnica del proyecto. Si algo no está aquí, no se inventa: se pregunta o se registra en `docs/DECISIONES.md`.
Las reglas de `CLAUDE.md` (juego, stack, anti-trampas) prevalecen sobre este documento.

Las marcas **[D-nn]** remiten a la decisión correspondiente de `docs/DECISIONES.md`.

## 0. Glosario, convenciones y estructura

| Término | Significado |
|---|---|
| Caso del día | Las 5 pruebas de una fecha. Tiene un número `n` (Caso nº n) y un tema. |
| Tema | Asunto común de las 5 pruebas de un día, elegido por el usuario (por ejemplo, "Perros"). Sale del nombre de la carpeta del día en `entrada/temas/` y se publica en `data/calendario.json` ya como texto final. No revela la verdad de ninguna prueba [D-52, D-53]. |
| Prueba | Una imagen dentro del caso, con índice `i` de 0 a 4 (en pantalla, de 1 a 5). |
| Verdad | Respuesta correcta de una prueba: `0` = auténtica (foto real), `1` = generada (IA). En el juego solo existe en memoria y ofuscada en `data/calendario.json`. |
| Voto | Lo que elige el jugador: `"autentica"` (botón REAL, tecla R) o `"generada"` (botón IA, tecla I). |
| Código de resultado | Un carácter por prueba: `A` acierto, `F` fallo, `T` tiempo agotado, `O` pestaña oculta o partida abandonada, `-` pendiente. |
| Fecha ISO | Cadena `AAAA-MM-DD` con la fecha **local** del jugador. |
| Modo | `facil` (7000 ms), `medio` (3000 ms), `dificil` (1000 ms). |
| Previsualización | Modo de desarrollo, solo en `localhost`, `127.0.0.1` o `[::1]`, en el que `?fecha=AAAA-MM-DD` fija la fecha efectiva y no se guarda nada [D-68]. |
| Modo prueba | Variante temporal de la previsualización para que amigos prueben el juego antes del lanzamiento: en cualquier host, con `?prueba=1` y la constante `PRUEBAS_ABIERTAS` de `js/main.js` en `true`, la portada muestra un selector de día y no se guarda nada [D-70]. Se apaga antes del 2026-11-01 [D-71]. |
| Fecha efectiva | La fecha con la que main.js trabaja: la de la previsualización si la hay; si no, la del día elegido en modo prueba; si no, `fechaLocal(new Date())`. |

### 0.1 Convenciones obligatorias

- **Palabras prohibidas.** `real`, `ia`, `ai` y `fake` no pueden aparecer en ids, clases, atributos `data-*`, nombres de archivo, rutas ni `alt` de nada publicado, ni en el `tema` de ningún día [D-53].
  - Se comprueban **por palabra completa** y sin distinguir mayúsculas. El nombre se trocea por cualquier carácter que no sea letra ni número (en Unicode, así que `á` o `ñ` cuentan como letras) y por los cambios de minúscula a mayúscula, y se compara cada trozo. La función común es `contienePalabraProhibida` de `herramientas/temas.mjs` (4.6).
  - Única excepción literal: el nombre del proyecto, `identifAI-it`, que aparece en la ruta de GitHub Pages y en textos [D-23].
  - El texto visible de `creditos.html` (nombres de fuentes y licencias) no es un nombre ni una ruta, así que la regla no se le aplica. Sus ids y clases sí la cumplen.
- Los ids aleatorios de imagen (10 caracteres) se comprueban además **por subcadena**: si contienen `ia`, `ai`, `real` o `fake`, se genera otro.
- Para nombrar la verdad o el voto en código y marcado se usa siempre `autentica`/`generada` (o `0`/`1`). Las palabras prohibidas solo pueden salir en el texto visible ("REAL", "IA").
- Las rutas son siempre relativas y sin `/` inicial: `data/calendario.json`, `casos/x.webp`, `./diario.js`, `../fonts/x.woff2`, `creditos.html`, `index.html`.
- **Ninguna petición a dominios externos**: nada de CDN (tampoco Google Fonts), analítica ni fuentes remotas. Todo se sirve desde el propio sitio [D-29].
- Los textos visibles salen siempre de `js/textos.js`:
  - En `index.html`, `main.js` los inserta al arrancar. No se escribe a mano ningún texto de interfaz, salvo el `<title>` y el contenido de `<noscript>`. El tema del día es un dato de `data/calendario.json` que se inserta dentro de una plantilla de `textos.js` (3.1).
  - En `creditos.html`, el generador (`herramientas/creditos.mjs`) los inserta al crear la página. Los únicos valores que no vienen de `textos.js` son datos, no textos de interfaz: las familias, licencias y rutas de la constante `TIPOGRAFIAS` de `creditos.mjs` y las parejas fuente · licencia del banco (4.5). La única excepción temporal es la página inicial provisional de la tarea 1, escrita a mano con esos mismos valores.

### 0.2 Estructura de carpetas

| Ruta | Se publica | Contenido |
|---|---|---|
| `index.html` | sí | Todas las pantallas del juego. |
| `creditos.html` | sí | Página estática de créditos, sin JS: tipografías y fuentes y licencias de las imágenes de forma agregada, sin relación con imágenes concretas [D-39]. La genera `herramientas/creditos.mjs` (sección 4.5), que toma las tipografías de su constante `TIPOGRAFIAS`. |
| `.nojekyll` | sí | Archivo vacío. Se mantiene para que GitHub Pages publique los archivos tal cual, sin pasar Jekyll, coherente con "sin build" [D-39]. |
| `css/variables.css`, `css/base.css`, `css/componentes.css` | sí | Los `@font-face` van en `base.css`. Las dos páginas usan los mismos tres archivos. |
| `fonts/` | sí | `oswald-600.woff2`, `special-elite-400.woff2`, `OFL-oswald.txt` (SIL OFL 1.1) y `LICENSE-special-elite.txt` (Apache License 2.0) [D-29, D-40]. |
| `js/` | sí | `main.js`, `juego.js`, `temporizador.js`, `diario.js`, `almacen.js`, `compartir.js`, `textos.js`. |
| `img/ui/` | sí | `sello.svg`, `huella.svg`, `lupa.svg`, `papel.svg`, `icono-acierto.svg`, `icono-fallo.svg`, `icono-tiempo.svg`. |
| `casos/` | sí | `{id}.webp`, 1080 x 1350, sin metadatos. Solo las generadas por `importar.mjs` [D-63]. |
| `data/calendario.json` | sí | Casos de cada día, con su tema (sección 4.2). |
| `herramientas/*.mjs` | sí (en el repositorio) | Scripts de Node: `temas.mjs` (funciones puras, 4.6), `importar.mjs`, `creditos.mjs` y `validar.mjs` [D-56]. Ya no existen `importar-dataset.mjs` ni `generar-calendario.mjs`. |
| `herramientas/banco.json` | **no** (`.gitignore`) | Banco de imágenes con la verdad, el tema, la fuente y el recorte. Solo existe en local [D-21, D-57, D-65]. |
| `herramientas/banco.anterior.json` | **no** (`.gitignore`) | Copia del banco que `importar.mjs --reimportar --confirmar` deja antes de regenerarlo (4.4.4). Solo existe en local [D-65]. |
| `herramientas/lote.json` | **no** (`.gitignore`) | Opcional. Recortes manuales por imagen (4.4.5). Sus claves son rutas con `ia/` y `real/`, así que revelarían las respuestas: solo existe en local [D-65]. |
| `entrada/temas/NN-nombre-del-tema/ia/`, `entrada/temas/NN-nombre-del-tema/real/` | **no** (`.gitignore`, porque `entrada/` entera lo está) | Imágenes originales elegidas por el usuario, una carpeta por día (`01` = 2026-11-01). Como no se publican, a estos nombres no les afecta la regla de palabras prohibidas; el tema que se deriva de ellos, sí [D-52]. El importador nunca las mueve ni las borra [D-56]. Sustituyen a `entrada/reales/`, `entrada/ia/` y `entrada/procesadas/`, que ya no se usan. |
| `tests/` | sí (en el repositorio) | `*.test.mjs`. No dependen de `banco.json`, `lote.json` ni `entrada/`: usan datos de ejemplo propios. |
| `package.json` | sí | `"type": "module"`, scripts (`test`, `validar`, `importar`, `creditos`) y `sharp` como `devDependency` [D-15, D-56]. |
| `docs/` | sí | Esta especificación y el registro de decisiones. `docs/muestras.html` ya no existe: se elimina del repositorio [D-73]. |

---

## 1. Pantallas y estados

### 1.1 Pantallas

| Pantalla (`data-pantalla`) | Contenido |
|---|---|
| `iniciando` | Estado transitorio mientras se cargan el almacén y el calendario. No tiene interfaz propia (se ve el fondo). |
| `portada` | Título, lema, Caso nº n, tema del día ("Caso del día: Perros") [D-54], selector de día (solo en modo prueba) [D-70], selector de modo (3 fichas), racha actual, botones Empezar y Cómo jugar, y pie con el enlace Créditos. |
| `como-jugar` | 4 pasos y botón Entendido. |
| `cargando` | Aviso de que se están preparando las pruebas (precarga de las 5 imágenes). |
| `cuenta-atras` | 3, 2, 1 (un número por segundo). |
| `caso` | Tema del día ("Caso del día: Perros") [D-54], Prueba i/5, marcador de aciertos, imagen, temporizador y botones REAL e IA. Tiene dos fases: `pregunta` y `veredicto`. |
| `resultado` | Aciertos x/5, mensaje final (0 a 5), cuadros, racha, mejor racha, revisión de las 5 pruebas y botón Compartir. |
| `ya-jugado` | Resultado de hoy (aciertos, cuadros y modo), racha, Compartir y cuenta atrás hasta medianoche. |
| `sin-casos` | No hay caso para hoy, porque aún no ha llegado el lanzamiento o porque el calendario se ha agotado [D-24]. |
| `error` | No se pudo cargar el calendario o alguna imagen. Botón Reintentar. |

El "veredicto de cada caso" no es una pantalla aparte: es la fase `veredicto` de la pantalla `caso`, para que la imagen siga visible bajo el sello [D-05].

`creditos.html` no forma parte de la máquina de estados: es otra página, sin JS.

### 1.2 Estado del juego

Hay un único objeto de estado, gestionado por la función pura `transicion(estado, evento)` de `js/juego.js`. Su forma es esta:

```js
{
  pantalla: 'portada',          // una de las de 1.1
  fase: null,                   // 'pregunta' | 'veredicto' | null (solo en 'caso')
  modo: 'medio',                // 'facil' | 'medio' | 'dificil'
  fecha: '2026-11-03',          // fecha ISO de la partida (se fija al empezar la prueba 1)
  n: 3,                         // número de caso
  tema: 'Gente comiendo',       // tema del día (texto final, de calendario.json) o null [D-53]
  pruebas: ['k3x9q2m7ab', ...], // 5 ids de imagen
  clave: 'Mpb9Ycc=',            // respuestas ofuscadas (sección 4.3)
  indice: 0,                    // prueba actual, de 0 a 4
  resultados: '-----',          // 5 códigos
  activo: false,                // true solo mientras corre el temporizador de la prueba
  revelada: null,               // verdad de la prueba actual (0|1), solo en fase 'veredicto'
  volverA: 'portada',           // adónde vuelve 'como-jugar': 'portada' | 'cargando'
  vistoComoJugar: false,
  error: null                   // 'calendario' | 'imagenes' | null
}
```

`estadoInicial` pone `tema: null`. `CARGADO` copia `n`, `tema`, `pruebas` y `clave` del caso recibido; con `caso === null`, `tema` sigue en `null` [D-53].

La previsualización [D-68] y el modo prueba [D-70] no añaden ningún campo al estado ni ningún evento: solo cambian la fecha que main.js pasa a `casoDelDia` y a `FIN_CUENTA` y el almacén que usa (3.7, puntos 11 y 12). Cambiar de día en modo prueba recarga la página; no hay evento para ello.

### 1.3 Eventos y transiciones

| Estado actual | Evento | Condición | Estado siguiente / efecto |
|---|---|---|---|
| `iniciando` | `CARGADO` `{caso, partidaHoy}` | hay partida de hoy `terminada` | `ya-jugado` |
| `iniciando` | `CARGADO` | la partida de hoy estaba `en_curso` (recarga o cierre a medias) | main.js la cierra antes como abandonada (las pruebas pendientes pasan a `O`), así que llega `terminada` → `ya-jugado` [D-26] |
| `iniciando` | `CARGADO` | `caso === null` | `sin-casos` |
| `iniciando` | `CARGADO` | en cualquier otro caso | `portada` (con `n`, `tema`, `pruebas` y `clave` del caso) |
| `iniciando` | `ERROR_CALENDARIO` | | `error` (`error: 'calendario'`) |
| `portada` | `ELEGIR_MODO` `{modo}` | | `portada` con el nuevo modo (main.js lo guarda en los ajustes) |
| `portada` | `VER_COMO_JUGAR` | | `como-jugar`, `volverA: 'portada'` |
| `portada` | `EMPEZAR` | `vistoComoJugar === false` | `como-jugar`, `volverA: 'cargando'` |
| `portada` | `EMPEZAR` | `vistoComoJugar === true` | `cargando` |
| `como-jugar` | `ENTENDIDO` | | `volverA` (`portada` o `cargando`), `vistoComoJugar: true` |
| `cargando` | `PRECARGA_OK` | | `cuenta-atras` |
| `cargando` | `PRECARGA_ERROR` | | `error` (`error: 'imagenes'`). El intento **no** se consume. |
| `error` | `REINTENTAR` | `error === 'imagenes'` | `cargando` |
| `error` | `REINTENTAR` | `error === 'calendario'` | `iniciando` |
| `cuenta-atras` | `OCULTA` | | sigue en `cuenta-atras`; main.js detiene la cuenta y la reinicia desde 3 al volver `VISIBLE` |
| `cuenta-atras` | `FIN_CUENTA` `{fecha}` | | `caso`, `fase: 'pregunta'`, `indice: 0`, `activo: false`, y se fija `fecha`. **Aquí se consume el intento del día**: main.js guarda la partida `en_curso` antes de pintar la imagen [D-26] |
| `caso/pregunta` | `PINTADA` | | `activo: true`: arranca el temporizador y desde ese momento se aceptan votos |
| `caso/pregunta` | `VOTO` `{voto}` | `activo === true` | `fase: 'veredicto'`, código `A` o `F`, `revelada` = verdad, `activo: false` |
| `caso/pregunta` | `VOTO` | `activo === false` | se ignora (la imagen aún no está pintada o el voto se ha repetido) |
| `caso/pregunta` | `AGOTADO` | | `fase: 'veredicto'`, código `T`, `revelada` = verdad |
| `caso/pregunta` | `OCULTA` | (con el temporizador activo o no) | `fase: 'veredicto'`, código `O`, `revelada` = verdad |
| `caso/veredicto` | `SIGUIENTE` | `indice < 4` | `caso/pregunta`, `indice + 1`, `revelada: null`, `activo: false` |
| `caso/veredicto` | `SIGUIENTE` | `indice === 4` | `resultado` (main.js guarda la partida `terminada`, la racha y la mejor racha) |
| `caso/veredicto` | `OCULTA` | | sin cambios |
| `portada`, `como-jugar`, `cuenta-atras`, `caso` | `OTRA_PESTANA` | otra pestaña ha empezado o terminado la partida de esa fecha [D-51] | `ya-jugado` (si la partida sigue `en_curso` en la otra pestaña, solo se muestra `avisos.otra_pestana`) |
| `resultado`, `ya-jugado` | `COMPARTIR` | | sin cambio de estado (main.js hace el efecto) |
| `ya-jugado`, `sin-casos`, `portada` | `MEDIANOCHE` | la fecha local ha cambiado | `iniciando` (se recargan los datos) |
| cualquiera | evento no listado | | sin cambios (se devuelve el mismo objeto) |

Reglas adicionales:
- **Un único intento al día para los tres modos** [D-32]. La partida se guarda por fecha, no por modo. Quien ya ha jugado hoy, en cualquier modo, ve `ya-jugado` aunque elija otro modo o recargue. En `ya-jugado` no hay selector de modo.
- **Tiempo agotado = fallo**: el código es `T` y cuenta como no acierto.
- **Pestaña oculta** (`document.visibilityState === 'hidden'`) durante `caso/pregunta` = fallo (código `O`), aunque el temporizador aún no hubiera arrancado. Al volver a la pestaña se ve directamente el veredicto. En `veredicto`, `resultado`, `portada` y las demás pantallas, ocultar la pestaña no tiene efecto, salvo en `cuenta-atras`, que se reinicia [D-06, D-07].
- **Medianoche durante la partida**: la partida pertenece a la `fecha` fijada en `FIN_CUENTA`; se termina y se guarda con esa fecha. El evento `MEDIANOCHE` solo se procesa en `portada`, `ya-jugado` y `sin-casos`.
- **Veredicto**: el avance es manual, con el botón Siguiente o con Enter [D-27]. Solo la primera cuenta atrás es de 3 s; las pruebas 2 a 5 arrancan en cuanto se pulsa Siguiente.
- `resultado` solo se ve una vez, al terminar. Si se recarga, se ve `ya-jugado`.
- **Tema**: es el mismo durante las 5 pruebas y no cambia en ningún evento posterior a `CARGADO`. No se guarda en el almacén (6) ni entra en el texto compartido (7) [D-54].
- **Créditos**: el enlace del pie de la portada navega a `creditos.html` en la **misma pestaña**. Al volver (enlace "Volver a la portada" o botón Atrás), la aplicación arranca de nuevo desde `iniciando`. No tiene consecuencias, porque desde la portada el intento aún no se ha consumido [D-39].
- **Previsualización local** [D-68]: la tabla no cambia. Con la fecha efectiva fija, las comprobaciones de "la fecha local ha cambiado" nunca se cumplen, así que `MEDIANOCHE` no llega por cambio de día; como el almacén en memoria parte vacío y no se escuchan otras pestañas, `OTRA_PESTANA` no se produce y recargar la página vuelve a `portada` con el intento sin gastar. Fuera de `localhost`, `127.0.0.1` y `[::1]`, el parámetro `?fecha=` no tiene ningún efecto.
- **Modo prueba** [D-70, D-71]: la tabla tampoco cambia, y vale todo lo dicho para la previsualización (fecha fija, almacén en memoria, sin `MEDIANOCHE` por cambio de día ni `OTRA_PESTANA`, recargar permite rejugar). La fecha efectiva es la del día elegido en `#selector-prueba`. El botón del selector no despacha ningún evento: navega a `?prueba=1&dia={n}`, que recarga la página y vuelve a `iniciando` con el día nuevo. Sin `?prueba=1`, o con `PRUEBAS_ABIERTAS = false`, el juego se comporta exactamente como sin este modo, también la regla de un único intento al día.

### 1.4 Diagrama

```
iniciando ──► portada ──EMPEZAR──► (como-jugar si es la 1ª vez) ──► cargando ──► cuenta-atras
   │  │          ▲  └──VER_COMO_JUGAR──► como-jugar ──ENTENDIDO──┘      │ fallo de precarga
   │  │          │                                                    ▼
   │  └──► sin-casos / ya-jugado / error ◄──────────────────────── error (Reintentar)
   │
cuenta-atras ──FIN_CUENTA──► caso[i]/pregunta ──VOTO|AGOTADO|OCULTA──► caso[i]/veredicto
                                   ▲                                         │ SIGUIENTE
                                   └────────────── i < 4 ◄───────────────────┤
                                                                     i = 4   ▼
                                                                         resultado ──(recarga)──► ya-jugado

portada ──enlace Créditos──► creditos.html ──Volver a la portada──► index.html (iniciando)
portada (modo prueba) ──Abrir este día──► ?prueba=1&dia=n (recarga) ──► iniciando
```

---

## 2. Contrato HTML/CSS

El Perito Visual crea el marcado y los estilos; el Agente de Campo solo usa los ganchos de esta sección. El marcado de `creditos.html` lo produce el generador del archivero siguiendo el apartado 2.7, y el Perito Visual le da estilo. Ningún otro id, clase o atributo se considera estable.

### 2.1 Mecanismo de pantallas

- `<main id="app" data-pantalla="portada" data-modo="medio">`: main.js mantiene `data-pantalla` y `data-modo` al día, y CSS puede usarlos.
- Cada pantalla es una `<section class="pantalla" id="pantalla-{nombre}" hidden>`. **Solo una puede estar sin `hidden` en cada momento**, y main.js es el único que cambia `hidden`.
- Al cambiar de pantalla, main.js mueve el foco al elemento con `data-foco` si existe y, si no, al primer `h1` o `h2` de la sección (que lleva `tabindex="-1"`). Todo elemento con `data-foco` que no sea enfocable de forma nativa (por ejemplo, un `p`) lleva `tabindex="-1"` [D-41].
- La pantalla `iniciando` no tiene sección: mientras dura, todas las secciones están `hidden`.

### 2.2 Atributos genéricos

| Atributo | Dónde | Uso |
|---|---|---|
| `data-texto="grupo.clave"` | cualquier elemento con texto fijo de `index.html` | main.js pone `textContent = TEXTOS.grupo.clave` al arrancar. En `index.html`, el contenido inicial es el marcador `[[grupo.clave]]`. Como `textContent` sustituye todo el contenido, `data-texto` va siempre en un elemento que solo contiene ese texto (por eso los botones de voto lo llevan en un `span.boton-texto` y no en el `button`). |
| `data-accion="..."` | `<button>` | Delegación de eventos. Valores: `empezar`, `como-jugar`, `entendido`, `siguiente`, `compartir`, `reintentar` y, solo en modo prueba, `abrir-prueba` [D-70]. Puede haber varios botones con la misma acción (por ejemplo, `compartir` en resultado y en ya jugado). |
| `data-voto="autentica"` / `data-voto="generada"` | los dos botones de respuesta | Voto. Son fijos y no dependen de la imagen. |
| `data-foco` | un elemento por pantalla como máximo | Recibe el foco al entrar en su pantalla. |
| `data-estado="acierto\|fallo\|tiempo\|oculta"` | `#veredicto` y cada `li` de `#resultado-revision` | Resultado de una prueba. No está presente mientras no hay respuesta. |
| `data-fase="pregunta\|veredicto"` | `#pantalla-caso` | Fase actual. |
| `data-nivel="normal\|critico"` | `#temporizador` | Vale `critico` cuando queda el 30 % del tiempo o menos. |
| `--restante` (propiedad CSS) | `#temporizador` | Número de 1 a 0. CSS fija `#temporizador { --restante: 1; }` y la cinta usa `transform: scaleX(var(--restante))`. main.js lo cambia con `style.setProperty('--restante', f)`. No se usa el atributo `style` en el HTML, porque la CSP lo bloquearía. |
| `data-visible="si\|no"` | `#compartir-aviso` | Aviso de "copiado". |
| `data-pagina="juego\|creditos"` | `<body>` | Permite a CSS distinguir las dos páginas. `index.html` lleva `juego` y `creditos.html`, `creditos`. |

Clase utilitaria: `.solo-lectores` (visualmente oculta, pero accesible para lectores de pantalla). No hay más clases de estado: los estados van siempre en atributos `data-*` [D-03]. Las únicas clases estructurales que forman parte del contrato con main.js son `.pantalla`, `.prueba-img`, `.boton-texto` y `.revision-era` (2.3); las demás clases del HTML son solo de estilo y main.js no las usa.

El tema del día solo se inserta como texto (`textContent`) en `#portada-tema`, `#caso-tema` y, en modo prueba, en las `option` de `#selector-prueba-dia`. Nunca va en ids, clases, atributos `data-*`, `alt` ni rutas [D-54, D-70].

### 2.3 Elementos por pantalla

Portada (`#pantalla-portada`):
- `h1` con `data-texto="portada.titulo"` y `p` con `data-texto="portada.lema"`.
- `#portada-caso`: "Caso nº n" (lo rellena main.js con `portada.etiqueta_caso`).
- `<p id="portada-tema">`, justo después de `#portada-caso` y dentro de la misma cabecera: "Caso del día: Perros" (lo rellena main.js con `rellenar(TEXTOS.portada.tema, {tema})`) [D-54]. Vacío en el HTML. Una sola línea a 360 px (CSS: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`), en `--fuente-datos`.
- Selector de día del modo prueba [D-70, D-71]. **No está en `index.html`**: main.js lo crea solo en modo prueba (3.7, punto 12) y lo inserta como hermano inmediato siguiente de `#portada-tema`. Con `PRUEBAS_ABIERTAS = false`, o sin `?prueba=1`, no existe en el DOM. Marcado exacto (textos con `textContent`, nunca `innerHTML`):
  ```html
  <div id="selector-prueba">
    <label for="selector-prueba-dia">{prueba.etiqueta}</label>
    <select id="selector-prueba-dia">
      <option value="1">Día 1: Fuegos artificiales</option>
      <option value="2" selected>Día 2: Perros</option>
      …
    </select>
    <button type="button" class="boton" data-accion="abrir-prueba">{prueba.boton}</button>
  </div>
  ```
  - Una `option` por elemento de `diasDePrueba(calendario)`, en orden: `value` = `String(n)` y texto = `rellenar(TEXTOS.prueba.opcion, {n, tema})`. Lleva `selected` la del día que se está jugando. Las `option` no llevan ningún otro atributo: ni fecha, ni ids de imagen, ni clave, ni nada que dependa de la verdad.
  - Elegir en la lista no hace nada por sí solo; el botón `abrir-prueba` navega a `?prueba=1&dia={valor}` (DP-21).
  - Ids estables: `selector-prueba` y `selector-prueba-dia`. La clase `boton` es solo de estilo.
  - Estilo (perito visual, en `componentes.css`): discreto, con aspecto de ficha de archivo, en `--fuente-datos`; `select` y botón con área táctil de 44 x 44 px como mínimo, foco visible y contraste AA; una o dos líneas a 360 px, sin scroll horizontal. Como el marcado lo crea main.js, el perito lo prueba con `?prueba=1`.
- `<fieldset id="portada-modos">` con `<legend data-texto="portada.elige_modo">` y tres `<input type="radio" name="modo" value="facil|medio|dificil">`, cada uno con su `label` (nombre `portada.modo_*` y descripción `portada.desc_*`). Se presentan como fichas.
- `#portada-racha`: "Racha: n" (con `hidden` si la racha es 0).
- `button[data-accion="empezar"]` (con `data-foco`) y `button[data-accion="como-jugar"]`.
- Pie de créditos [D-37, modificado por D-39]:
  ```html
  <footer id="portada-pie">
    <a id="portada-creditos" href="creditos.html" data-texto="portada.enlace_creditos">[[portada.enlace_creditos]]</a>
  </footer>
  ```
  - El `href` es exactamente `creditos.html`: relativo, sin barra inicial ni `./`, en minúsculas como el archivo.
  - Se abre en la **misma pestaña**: sin `target` ni `rel`. No hace falta texto oculto de "otra pestaña".
  - Estilo discreto: al final de la portada, centrado, en `--fuente-cuerpo` a 14 px como mínimo. Color atenuado con **contraste AA de 4,5:1** sobre el fondo y subrayado siempre visible (no se distingue solo por el color). Foco visible igual que el resto de controles.
  - Área táctil de **44 x 44 px como mínimo** (con relleno), sin solaparse con los botones.
  - No es un `button` ni lleva `data-accion`: main.js solo rellena su texto.

Cómo jugar (`#pantalla-como-jugar`):
- `h2 data-texto="como_jugar.titulo"` (con `tabindex="-1"`), `<ol id="como-jugar-pasos">` (main.js crea 4 `li` a partir de `TEXTOS.como_jugar.pasos`) y `button[data-accion="entendido"]`.

Cargando (`#pantalla-cargando`): `<p role="status" tabindex="-1" data-foco data-texto="cargando.texto">`.

Cuenta atrás (`#pantalla-cuenta-atras`): `<p tabindex="-1" data-foco data-texto="cuenta_atras.aviso">` y `#cuenta-atras-numero` (`aria-live="assertive"`, con el contenido "3", "2" o "1").

Caso (`#pantalla-caso`, con `data-fase`):
- `<header id="caso-cabecera">` agrupa, en este orden, `#caso-tema`, `#caso-etiqueta` y `#caso-marcador`.
- `<p id="caso-tema">`: "Caso del día: Perros" (`rellenar(TEXTOS.partida.caso_del_dia, {tema})`) [D-54]. Vacío en el HTML; main.js lo rellena al entrar en `caso` y no cambia en las 5 pruebas. Visible en las dos fases. Sin `aria-live` ni `data-foco`. Una sola línea a 360 px (mismo CSS que `#portada-tema`), sin provocar scroll (criterio 43).
- `<p id="caso-etiqueta" tabindex="-1" data-foco>`: "Prueba 2/5" (`partida.etiqueta_prueba`).
- `#caso-marcador`: aciertos hasta el momento, "Aciertos: 1" (`partida.marcador`). Siempre visible durante la partida [D-31].
- `<div id="caso-escena">`: envuelve `#prueba-marco` y `#veredicto` para que el veredicto se superponga a la imagen [D-41]. main.js no lo toca.
- `<figure id="prueba-marco">`: vacío en el HTML. main.js inserta **una** `<img class="prueba-img" alt="Prueba 2 de 5" width="1080" height="1350">` ya decodificada y la sustituye en cada prueba. Proporción 4:5 con `object-fit: contain`.
- `<div id="veredicto" role="status" aria-live="polite" hidden>`, dentro de `#caso-escena` y después de `#prueba-marco`, con `hidden` en fase pregunta. Contiene, en este orden:
  - `<p id="veredicto-sello">`: vacío hasta que hay respuesta. Después, `TEXTOS.partida.sello_autentica` ("REAL") o `sello_generada` ("IA").
  - `<div id="veredicto-pie">`, que agrupa:
    - `<span id="veredicto-icono" aria-hidden="true">`: vacío. CSS le pone como `background-image` el icono de `img/ui/icono-*.svg` según el `data-estado` de `#veredicto` (acierto, fallo; `tiempo` y `oculta` usan el de tiempo) [D-41]. main.js no le pone contenido ni atributos.
    - `<p id="veredicto-texto">`: una variante al azar de `TEXTOS.veredictos.{acierto|fallo|tiempo|oculta}`.
- `<div id="temporizador" data-nivel="normal" aria-hidden="true">` con `<div id="temporizador-cinta">` dentro.
- `#temporizador-anuncio` (`.solo-lectores`, `aria-live="polite"`): main.js escribe "Quedan N s" cada vez que cambia el segundo entero, solo en los modos `facil` y `medio`. En `dificil` no se anuncia nada durante la prueba [D-17].
- `#caso-botones` agrupa los tres botones. Los dos de voto tienen esta forma exacta [D-41]:
  ```html
  <button type="button" class="boton boton-voto" data-voto="autentica" aria-keyshortcuts="R">
    <span class="boton-texto" data-texto="partida.boton_autentica">[[partida.boton_autentica]]</span>
    <kbd aria-hidden="true">R</kbd>
  </button>
  <button type="button" class="boton boton-voto" data-voto="generada" aria-keyshortcuts="I">
    <span class="boton-texto" data-texto="partida.boton_generada">[[partida.boton_generada]]</span>
    <kbd aria-hidden="true">I</kbd>
  </button>
  ```
  El `data-texto` va en el `span.boton-texto`, nunca en el `button`, para que rellenar el texto no borre el `<kbd>`. Solo se ven en fase pregunta (CSS con `data-fase`) y van en la mitad inferior de la pantalla.
- `button[data-accion="siguiente"]` (con `data-texto="partida.boton_siguiente"`): solo se ve en fase veredicto. Su texto es `partida.boton_siguiente`, o `partida.boton_ver_resultado` en la prueba 5. Recibe el foco al entrar en veredicto.

Resultado (`#pantalla-resultado`):
- `<p id="resultado-aciertos" tabindex="-1" data-foco>` ("4/5"), `#resultado-mensaje`, `<p id="resultado-cuadros" role="img">` (main.js le pone los cuadros como texto y un `aria-label` con `rellenar(TEXTOS.final.cuadros_etiqueta, {aciertos})`, por ejemplo "4 aciertos de 5" [D-43]; con `role="img"` el lector anuncia la etiqueta y no los emojis uno a uno) [D-41], `#resultado-racha` y `#resultado-mejor-racha`.
- `<ol id="resultado-revision">`: vacío en el HTML. Al entrar en `resultado`, main.js crea 5 `li` (ya revelados [D-19]), uno por prueba en orden, con este marcado exacto [D-41]:
  ```html
  <li data-estado="acierto|fallo|tiempo|oculta">
    <img src="casos/{id}.webp" alt="Prueba N" width="1080" height="1350">
    <span class="solo-lectores">{final.estado_prueba}</span>
    <span class="revision-era">{final.era}</span>
  </li>
  ```
  - `data-estado` = `estadoDeCodigo(resultados[i])`.
  - `src` = `rutaPrueba(id)`; `alt` = `rellenar(TEXTOS.final.alt_prueba, {n: N})`, es decir "Prueba N" con N de 1 a 5 (nunca la verdad) [D-49].
  - `span.solo-lectores` = `rellenar(TEXTOS.final.estado_prueba, {i: N, estado: TEXTOS.final.estados[estado]})`, por ejemplo "Prueba 3: tiempo agotado".
  - `span.revision-era` = `rellenar(TEXTOS.final.era, {sello})`, con `sello` = `partida.sello_autentica` o `sello_generada` según `desofuscar(clave, n, i)`, por ejemplo "Era: IA".
  - El icono de acierto, fallo o tiempo lo pone CSS con `li::after` según `data-estado` (`oculta` usa el de tiempo). main.js no inserta iconos.
  - Los textos se ponen con `textContent` (nunca con `innerHTML`).
- `button[data-accion="compartir"]`.

Ya jugado (`#pantalla-ya-jugado`):
- `h2 data-texto="ya_jugado.titulo"` (con `tabindex="-1"`), `p#ya-jugado-texto` (`data-texto="ya_jugado.texto"`, justo después del `h2`) [D-48], `#ya-jugado-aciertos`, `#ya-jugado-modo`, `#ya-jugado-cuadros` (con `role="img"` y el mismo `aria-label` que `#resultado-cuadros` [D-43]), `#ya-jugado-racha` y `#ya-jugado-cuenta-atras` (HH:MM:SS, se actualiza cada segundo, `aria-live="off"`).
- `button[data-accion="compartir"]`.

Elementos comunes, dentro de `#app` pero fuera de las secciones (los usan resultado y ya jugado):
- `#compartir-aviso` (`aria-live="polite"`, `data-visible="no"`).
- `<textarea id="compartir-manual" rows="5" readonly hidden>`: alternativa cuando no hay portapapeles. Justo detrás, como hermano inmediato, va `<label for="compartir-manual" class="solo-lectores" data-texto="compartir.manual">` [D-41]. CSS depende de ese orden (`#compartir-manual[hidden] + label`), así que main.js **no mueve ni recrea** ni el `textarea` ni el `label`: solo cambia `hidden` y `value` del `textarea`.
- `<p id="aviso-almacen" role="status" hidden data-texto="avisos.sin_guardar">` (con `hidden` salvo que localStorage no funcione). En previsualización y en modo prueba nunca se muestra, porque el almacén en memoria siempre funciona [D-68, D-70].
- `<p id="aviso-previsualizacion" role="status" hidden></p>` [D-68]: vacío en el HTML y **sin** `data-texto` (es una plantilla con `{fecha}`, así que el relleno genérico de `data-texto` no sirve). Va justo después de `#aviso-almacen`. Solo en previsualización o en modo prueba [D-70], main.js le pone `textContent = rellenar(TEXTOS.avisos.previsualizacion, {fecha})` (con la fecha efectiva) y le quita `hidden` antes de `CARGADO` (en previsualización, al arrancar; en modo prueba, en cuanto se conoce el día elegido, tras cargar el calendario); después no vuelve a cambiar. Fuera de esos modos queda siempre vacío y con `hidden`. Estilo (perito visual): discreto pero visible en todas las pantallas, por ejemplo una franja fija de una línea en el borde superior, en `--fuente-datos` a 14 px como mínimo y con contraste AA; no debe tapar la imagen ni los botones de voto, tampoco en un móvil de 360 px (los amigos lo verán en GitHub Pages). No cuenta para el criterio 43.

Sin casos (`#pantalla-sin-casos`): `<p tabindex="-1" data-foco data-texto="sin_casos.texto">`.

Error (`#pantalla-error`): `<p id="error-texto" role="alert" tabindex="-1" data-foco>` (main.js pone `errores.calendario` o `errores.imagenes`) y `button[data-accion="reintentar"]`.

Fuera de JS: un `<noscript>` con un aviso breve en español.

### 2.4 Cabecera de index.html

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'">
<title>identifAI-it</title>
<link rel="stylesheet" href="css/variables.css">
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/componentes.css">
<script type="module" src="js/main.js"></script>
```

- La CSP `default-src 'self'` hace que el navegador bloquee cualquier recurso externo. También prohíbe `<script>`/`<style>` en línea, el atributo `style` en el HTML y las URL `data:` en CSS [D-36]. Todos los SVG se cargan como archivos de `img/ui/`.
- No hay ningún `<link>` a `fonts.googleapis.com`, `fonts.gstatic.com` ni a otro dominio.
- `<html lang="es">` y `<body data-pagina="juego">`.

### 2.5 Tipografías (alojadas en el repositorio) [D-29, D-40]

En `css/base.css`, al principio:

```css
@font-face {
  font-family: "Oswald";
  src: url("../fonts/oswald-600.woff2") format("woff2");
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Special Elite";
  src: url("../fonts/special-elite-400.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

Tokens en `css/variables.css`:

```css
--fuente-titulos: "Oswald", "Arial Narrow", "Roboto Condensed", sans-serif;
--fuente-datos: "Special Elite", "Courier New", Courier, monospace;
--fuente-cuerpo: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
```

- Títulos: Oswald 600. Datos de expediente (etiquetas, "PRUEBA Nº", tema del día, marcador, cuenta atrás): Special Elite 400. Cuerpo: fuentes del sistema, a 16 px como mínimo (el enlace de créditos y el aviso de previsualización pueden bajar a 14 px).
- Solo se incluye el woff2 del subconjunto latino, que cubre á, é, í, ó, ú, ñ, ü, ¿, ¡, º y ·. Se busca que cada archivo pese menos de 60 KB.
- Licencias, junto a las fuentes [D-40]:

  | Familia | Licencia | Archivo |
  |---|---|---|
  | Oswald | SIL Open Font License 1.1 | `fonts/OFL-oswald.txt` (texto completo de la OFL 1.1 con el aviso de copyright de la familia) |
  | Special Elite | Apache License 2.0 | `fonts/LICENSE-special-elite.txt` (texto completo de la Apache License 2.0) |

  `creditos.html` las enlaza a partir de la constante `TIPOGRAFIAS` de `herramientas/creditos.mjs` (4.5), que debe coincidir con esta tabla. No existe `fonts/OFL-special-elite.txt`.
- Si el perito visual prefiere Courier Prime o Bebas Neue (opciones que permite su agente), debe mantener el patrón `fonts/{familia}-{peso}.woff2`, comprobar la licencia real de la familia en su paquete oficial y guardar su texto completo como `fonts/OFL-{familia}.txt` (SIL OFL) o `fonts/LICENSE-{familia}.txt` (otras licencias), cambiar los `@font-face`, los tokens, la tabla anterior y la constante `TIPOGRAFIAS`, y registrarlo en DECISIONES.

### 2.6 Reglas visuales que afectan a la lógica

- A 360 x 640 px, la imagen ocupa el máximo espacio posible sin provocar scroll y los botones se ven sin desplazar, también con `#caso-tema` visible y el tema más largo permitido (30 caracteres) [D-53].
- Acierto y fallo se distinguen por icono y texto, no solo por color.
- Con `prefers-reduced-motion: reduce` no se anima el sello ni hay sacudidas. La cinta del temporizador sigue reduciéndose, porque es información y no decoración.

### 2.7 creditos.html [D-39]

Es una página estática sin JS. La escribe entera `generarCreditosHtml` (sección 4.5) con esta estructura exacta. Los valores entre `{}` se sustituyen ya escapados. La lista de tipografías se genera a partir de `TIPOGRAFIAS` (un `li` por elemento, con la forma `<li>{familia} · {licencia} (<a href="{archivo}">{creditos.ver_licencia}</a>)</li>`); con los valores actuales [D-40] queda así:

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'">
<title>{creditos.titulo_pagina}</title>
<link rel="stylesheet" href="css/variables.css">
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/componentes.css">
</head>
<body data-pagina="creditos">
<main id="creditos">
  <h1>{creditos.titulo}</h1>
  <p>{creditos.intro}</p>
  <section aria-labelledby="creditos-tipografias">
    <h2 id="creditos-tipografias">{creditos.tipografias}</h2>
    <ul>
      <li>Oswald · SIL Open Font License 1.1 (<a href="fonts/OFL-oswald.txt">{creditos.ver_licencia}</a>)</li>
      <li>Special Elite · Apache License 2.0 (<a href="fonts/LICENSE-special-elite.txt">{creditos.ver_licencia}</a>)</li>
    </ul>
  </section>
  <section aria-labelledby="creditos-imagenes">
    <h2 id="creditos-imagenes">{creditos.imagenes}</h2>
    <p>{creditos.imagenes_intro}</p>
    <ul id="creditos-lista">
      <li>{fuente} · {licencia}</li>
    </ul>
  </section>
</main>
<footer id="creditos-pie">
  <a id="creditos-volver" href="index.html">{creditos.volver}</a>
</footer>
</body>
</html>
```

- Sin imágenes, `#creditos-lista` no se genera y en su lugar va `<p>{creditos.sin_imagenes}</p>`. `imagenes_intro` también se omite.
- Ids: `creditos`, `creditos-tipografias`, `creditos-imagenes`, `creditos-lista`, `creditos-pie`, `creditos-volver`. La página no tiene más ids ni clases propias.
- Landmarks: un `<main>` y un `<footer>` (contentinfo); un solo `h1` y un `h2` por sección.
- La CSP es idéntica a la de `index.html`. No hay `<script>`, ni atributo `style`, ni recursos externos.
- `creditos-volver` apunta exactamente a `index.html`, con ruta relativa y en la misma pestaña.
- El perito visual da estilo a la página en `css/componentes.css` con selectores bajo `body[data-pagina="creditos"]`. Usa los mismos tokens y fuentes, contraste AA, foco visible, enlaces subrayados, área táctil de 44 x 44 px en `#creditos-volver` y lectura cómoda a 360 px (ancho máximo de unos 65 caracteres en escritorio).
- El archivo termina en un único salto de línea final, y cada salto de línea es LF.

---

## 3. Módulos JS

Todos son módulos ES sin dependencias. Las funciones marcadas como **pura** no tocan el DOM, `window`, `localStorage`, `Date.now()` ni `Math.random()`: reciben lo que necesitan por parámetro y se prueban con `node --test`. Para que Node cargue `js/*.js` como módulos, `package.json` lleva `"type": "module"` [D-15].

Grafo de importaciones (sin ciclos):
- `main.js` importa todos los demás módulos.
- `almacen.js` y `juego.js` importan `diario.js`.
- `compartir.js`, `temporizador.js`, `diario.js` y `textos.js` no importan nada.
- Fuera del navegador [D-56]:
  - `herramientas/temas.mjs` no importa nada (ni siquiera `sharp`), para que los tests lo carguen sin efectos.
  - `herramientas/creditos.mjs` importa `../js/textos.js`.
  - `herramientas/importar.mjs` importa `sharp`, `../js/diario.js` (`ofuscar`, `sumarDias`, `fechaLocal`, `validarCalendario`), `./temas.mjs` y `./creditos.mjs`.
  - `herramientas/validar.mjs` importa `sharp`, `../js/diario.js`, `./temas.mjs` y `./creditos.mjs`. No importa `js/main.js` (que tiene efectos en el navegador): para la comprobación de `PRUEBAS_ABIERTAS` lo lee como texto [D-71].

### 3.1 js/textos.js (cronista)

```js
export const TEXTOS = { ... }
```

Claves exactas (las que llevan `{x}` son plantillas):

| Grupo | Claves |
|---|---|
| `portada` | `titulo`, `lema`, `elige_modo`, `modo_facil`, `modo_medio`, `modo_dificil` ("Fácil", "Medio", "Difícil"), `desc_facil`, `desc_medio`, `desc_dificil` (incluyen los segundos), `boton_empezar`, `boton_como_jugar`, `etiqueta_caso` ("Caso nº {n}"), `tema` ("Caso del día: {tema}") [D-54], `racha` ("Racha: {racha}"), `enlace_creditos` ("Créditos") |
| `como_jugar` | `titulo`, `pasos` (array de exactamente 4 cadenas; una dice que hay un solo intento al día, sea cual sea el modo), `boton_entendido` |
| `cargando` | `texto` |
| `cuenta_atras` | `aviso` |
| `partida` | `caso_del_dia` ("Caso del día: {tema}") [D-54], `etiqueta_prueba` ("Prueba {i}/5"), `marcador` ("Aciertos: {aciertos}"), `alt_prueba` ("Prueba {i} de 5"), `boton_autentica` ("REAL"), `boton_generada` ("IA"), `sello_autentica` ("REAL"), `sello_generada` ("IA"), `quedan` ("Quedan {s} s"), `boton_siguiente`, `boton_ver_resultado` |
| `veredictos` | `acierto` (≥ 4), `fallo` (≥ 4), `tiempo` (≥ 3), `oculta` (≥ 2): arrays de cadenas |
| `final` | `alt_prueba` ("Prueba {n}") [D-49], `mensajes` (array de exactamente 6, con índice = aciertos de 0 a 5), `aciertos` ("{aciertos}/5"), `racha` ("Racha: {racha}"), `mejor_racha` ("Mejor racha: {racha}"), `era` ("Era: {sello}"), `cuadros_etiqueta` ("{aciertos} aciertos de 5") [D-43], `estado_prueba` ("Prueba {i}: {estado}"), `estados` (objeto con exactamente `acierto: 'acierto'`, `fallo: 'fallo'`, `tiempo: 'tiempo agotado'`, `oculta: 'pestaña oculta'`) [D-41] |
| `ya_jugado` | `titulo`, `texto`, `proximo` ("Próximo caso en {tiempo}"), `modo` ("Modo: {modo}") |
| `sin_casos` | `texto` |
| `errores` | `calendario`, `imagenes`, `boton_reintentar` |
| `avisos` | `sin_guardar`, `otra_pestana` [D-51], `previsualizacion` ("Previsualización del {fecha}: no se guarda nada.") [D-68] |
| `prueba` | `etiqueta` ("Día de prueba"), `opcion` ("Día {n}: {tema}"), `boton` ("Abrir este día") [D-70] |
| `compartir` | `boton`, `copiado`, `manual` ("Copia este texto:"), `plantilla` (exactamente la de la sección 7, sin cambios) |
| `creditos` | `titulo_pagina` ("Créditos · identifAI-it"), `titulo` ("Créditos"), `intro`, `tipografias` ("Tipografías"), `imagenes` ("Imágenes"), `imagenes_intro` ("Las pruebas proceden de estas fuentes. La lista no indica qué imagen viene de cada una."), `sin_imagenes` ("Todavía no hay imágenes publicadas."), `ver_licencia` ("licencia"), `volver` ("Volver a la portada") |

- Ninguna cadena supera los 90 caracteres, salvo `como_jugar.pasos`.
- Los valores entre comillas de `portada.enlace_creditos`, `creditos.titulo`, `creditos.volver` y `creditos.sin_imagenes` son exactos: el cronista puede proponer otros al usuario, pero no cambiarlos por su cuenta.
- `portada.tema` y `partida.caso_del_dia` contienen exactamente un marcador, `{tema}`, y ninguno más. Sus valores por defecto ("Caso del día: {tema}") son los que pidió el usuario; el cronista puede proponer otros, pero no cambiarlos por su cuenta. Con el tema más largo (30 caracteres) la cadena rellenada no supera los 50 caracteres [D-54].
- `avisos.previsualizacion` [D-68]: valor exacto `'Previsualización del {fecha}: no se guarda nada.'`, pedido por el usuario (el cronista puede proponer otro, pero no cambiarlo por su cuenta). Contiene exactamente un marcador, `{fecha}`, que se rellena con la fecha efectiva en ISO (la de la URL o la del día elegido en modo prueba; DECISIÓN PENDIENTE DP-19). Mide 47 caracteres como plantilla y 51 rellenada, por debajo del límite de 90. No contiene ninguna palabra prohibida por palabra completa (`contienePalabraProhibida` devuelve `null`), aunque la regla solo obliga en nombres, rutas y atributos. El modo prueba usa esta misma clave; no hay un aviso propio [D-70].
- Grupo `prueba` [D-70]: lo usa solo el selector del modo prueba (2.3). `opcion` tiene el valor exacto `'Día {n}: {tema}'`, pedido por el usuario, con exactamente los marcadores `{n}` y `{tema}`; rellenado con `n: 99` y un tema de 30 caracteres no supera los 50 caracteres. `etiqueta` ("Día de prueba") y `boton` ("Abrir este día") son valores por defecto que el cronista puede mejorar (cortos, sin marcadores, sin palabras prohibidas por palabra completa y sin mencionar respuestas). Cuando se apague el modo prueba [D-71], las claves pueden quedarse: no se usan.
- `final.estado_prueba` y `final.estados` solo se usan en el `span.solo-lectores` de cada `li` de `#resultado-revision` (2.3). Las claves de `final.estados` coinciden con los valores de `estadoDeCodigo` (3.3); no forman parte del DOM, solo sus valores (texto visible para lectores de pantalla).
- El grupo `creditos` no lo usa `main.js`; lo lee `herramientas/creditos.mjs` al generar la página.

### 3.2 js/diario.js (agente-de-campo): fechas, calendario, clave e imágenes

| Función | Tipo | Parámetros → retorno | Efectos / notas |
|---|---|---|---|
| `fechaLocal(fecha)` | pura | `Date` → `'AAAA-MM-DD'` | Usa `getFullYear`/`getMonth`/`getDate` (hora local). |
| `sumarDias(fechaISO, dias)` | pura | `string, number` → `string` | Calcula con `Date.UTC`, así que el cambio de hora no le afecta. |
| `diasEntre(desdeISO, hastaISO)` | pura | → `number` entero (negativo si `hasta` es anterior) | `Date.UTC`, división entre 86 400 000 y `Math.round`. |
| `numeroCaso(fechaISO, lanzamientoISO)` | pura | → `number` | `diasEntre(lanzamiento, fecha) + 1`. El día de lanzamiento es el caso 1 [D-28]. Puede ser ≤ 0. |
| `msHastaMedianoche(fecha)` | pura | `Date` → `number` (ms) | `new Date(a, m, d + 1) - fecha`. |
| `formatearCuentaAtras(ms)` | pura | → `'HH:MM:SS'` | Redondea al segundo hacia arriba y nunca devuelve un valor negativo. |
| `temaValido(tema)` | pura | → `boolean` | Reglas estructurales del tema de 4.2: cadena de 1 a 30 caracteres, igual a `tema.trim()`, sin caracteres de control (`\u0000`–`\u001f`, `\u007f`), sin `{` ni `}`, y con la primera letra en mayúscula (`tema[0] === tema[0].toLocaleUpperCase('es')`) [D-53]. No comprueba palabras prohibidas (eso lo hacen `importar.mjs` y `validar.mjs`, 4.6). |
| `validarCalendario(obj)` | pura | → `boolean` | Comprueba la estructura de la sección 4.2: `version === 2`, claves exactas del objeto (`version`, `lanzamiento`, `dias`) y de cada día (`n`, `fecha`, `tema`, `pruebas`, `clave`), `temaValido(dia.tema)`, 5 ids distintos y clave de 5 bytes. Rechaza la versión 1 [D-53]. Igual que antes, no comprueba que `lanzamiento` sea `"2026-11-01"` [D-50]. |
| `casoDelDia(calendario, fechaISO)` | pura | → `{n, fecha, tema, pruebas, clave}` o `null` | `null` si `n < 1`, si no existe el día `n` o si su `fecha` no coincide. `tema` es `dia.tema` tal cual [D-53]. |
| `rutaPrueba(id)` | pura | → `'casos/{id}.webp'` | |
| `ofuscar(verdades, n, aleatorio = Math.random)` | pura (con `aleatorio` inyectado) | `number[5], number` → `string` (8 caracteres base64) | Sección 4.3. La usa también `herramientas/importar.mjs`. |
| `desofuscar(clave, n, indice)` | pura | → `0 \| 1` | Sección 4.3. Solo se llama al corregir (eventos `VOTO`, `AGOTADO` y `OCULTA`) y en la revisión final. También la usa `validar.mjs` (sin banco). |
| `HOSTS_LOCALES` | constante | | `['localhost', '127.0.0.1', '[::1]']` [D-68]. Son los valores exactos de `location.hostname` en los que se permite la previsualización (en los navegadores, el `hostname` de `http://[::1]:3000/` incluye los corchetes). |
| `fechaPrevisualizada(search, hostname)` | pura | `string, string` → fecha ISO o `null` | [D-68] Devuelve `null` si `hostname` no es exactamente uno de `HOSTS_LOCALES` (sin pasar a minúsculas ni recortar: `'LOCALHOST'`, `'localhost.'`, `'::1'`, `'0.0.0.0'` o una IP de la red local dan `null`). Si lo es, toma el **primer** valor del parámetro `fecha` con `new URLSearchParams(search).get('fecha')` (acepta `search` con o sin `?` inicial) y lo devuelve tal cual si cumple `/^\d{4}-\d{2}-\d{2}$/` y es una fecha real del calendario gregoriano (`sumarDias(valor, 0) === valor`, que descarta `2026-02-30` o `2026-13-01`). En cualquier otro caso (parámetro ausente, vacío, con espacios, con hora o mal formado), `null`. No mira la fecha actual ni el calendario: una fecha anterior al lanzamiento o posterior al último día es válida y lleva a `sin-casos`. No cambia con el modo prueba. |
| `pruebaActiva(search, abiertas)` | pura | `string, boolean` → `boolean` | [D-70, D-71] Devuelve `true` solo si `abiertas === true` (estrictamente; `1`, `'true'` o `undefined` dan `false`) y el **primer** valor de `new URLSearchParams(search).get('prueba')` es exactamente `'1'` (acepta `search` con o sin `?`). `'?prueba=true'`, `'?prueba=01'`, `'?prueba= 1'`, `'?prueba='`, `'?Prueba=1'` o la ausencia del parámetro dan `false`. No mira el host: vale en cualquiera. |
| `diasDePrueba(calendario)` | pura | → `[{n, fecha, tema}]` | [D-70] Un objeto **nuevo** por cada elemento de `calendario.dias`, en el mismo orden, con **solo** las propiedades `n`, `fecha` y `tema` copiadas tal cual. Nunca incluye `pruebas` ni `clave`. No muta el calendario. Con `null`, `undefined` o sin `dias`, devuelve `[]`. Se le pasa un calendario ya validado. |
| `diaDePrueba(search, dias, hoyISO)` | pura | `string, [{n, fecha, tema}], string` → un elemento de `dias` o `null` | [D-70] Elige el día que se juega en modo prueba: (1) si el primer valor del parámetro `dia` cumple `/^[1-9]\d{0,3}$/` y hay un elemento con `n === Number(valor)`, ese; (2) si no, el elemento cuya `fecha === hoyISO`, si existe; (3) si no, `dias[0]`; (4) con `dias` vacío, `null`. Un `dia` inválido o inexistente (`'0'`, `'08'`, `'x'`, `'99'` sin ese día) no es un error: se aplica (2) o (3). Devuelve el mismo objeto de la lista, sin copiarlo. |
| `cargarCalendario(url = 'data/calendario.json', pedir = fetch)` | async | → `Promise<calendario>` | Llama a `pedir(url, {cache: 'no-cache'})`. Rechaza si la respuesta no es `ok`, si no es JSON o si `validarCalendario` falla. |
| `precargar(ids, crearImagen = () => new Image())` | async | `string[]` → `Promise<HTMLImageElement[]>` | Crea las 5 imágenes en paralelo (`decoding = 'async'`, `src = rutaPrueba(id)`) y espera al `img.decode()` de todas. Rechaza si falla cualquiera. No inserta nada en el DOM. |

### 3.3 js/juego.js (agente-de-campo): reglas y máquina de estados

| Exportación | Tipo | Descripción |
|---|---|---|
| `MODOS` | constante | `{ facil: 7000, medio: 3000, dificil: 1000 }` (ms por prueba). |
| `MODO_POR_DEFECTO` | constante | `'medio'`. |
| `VOTOS` | constante | `{ autentica: 0, generada: 1 }`. |
| `corregir(voto, verdad)` | pura | `'autentica'\|'generada', 0\|1` → `'A' \| 'F'`. |
| `contarAciertos(resultados)` | pura | `'AFT-O'` → número de `A`. |
| `estadoDeCodigo(codigo)` | pura | `'A'`→`'acierto'`, `'F'`→`'fallo'`, `'T'`→`'tiempo'`, `'O'`→`'oculta'`, `'-'`→`null`. |
| `elegirVariante(lista, aleatorio = Math.random)` | pura (con `aleatorio` inyectado) | `lista[Math.floor(aleatorio() * lista.length)]`. |
| `mensajeFinal(aciertos, mensajes)` | pura | Devuelve `mensajes[aciertos]`; lanza un error si `aciertos` no está entre 0 y 5. |
| `estadoInicial({modo, vistoComoJugar})` | pura | Estado de 1.2 con `pantalla: 'iniciando'` y `tema: null`. |
| `transicion(estado, evento)` | pura | Implementa la tabla 1.3. Nunca muta `estado`: devuelve uno nuevo, o el mismo objeto si el evento no aplica. Eventos: `{tipo: 'CARGADO', caso, partidaHoy}`, `ERROR_CALENDARIO`, `ELEGIR_MODO {modo}`, `VER_COMO_JUGAR`, `EMPEZAR`, `ENTENDIDO`, `PRECARGA_OK`, `PRECARGA_ERROR`, `REINTENTAR`, `FIN_CUENTA {fecha}`, `PINTADA`, `VOTO {voto}`, `AGOTADO`, `OCULTA`, `SIGUIENTE`, `OTRA_PESTANA`, `MEDIANOCHE`. `caso` es lo que devuelve `casoDelDia` (o `null`); `partidaHoy` es el registro de hoy en el almacén (o `null`). `CARGADO` copia `caso.tema` en `estado.tema` [D-53]. |

`VOTO`, `AGOTADO` y `OCULTA` obtienen la verdad con `desofuscar(estado.clave, estado.n, estado.indice)` dentro de `transicion` y la guardan en `revelada`.

`js/juego.js` no cambia con la previsualización [D-68] ni con el modo prueba [D-70].

### 3.4 js/temporizador.js (agente-de-campo)

| Función | Tipo | Descripción |
|---|---|---|
| `crearTemporizador({duracionMs, alTick, alAgotar, reloj = () => performance.now(), pedirFrame = requestAnimationFrame, cancelarFrame = cancelAnimationFrame})` | fábrica | Devuelve `{iniciar(), detener(), activo()}`. |
| `.iniciar()` | efecto | Guarda `t0 = reloj()` y pide frames. En cada frame calcula `transcurrido = reloj() - t0` y llama a `alTick(restanteMs, fraccion)`. Si `transcurrido >= duracionMs`, llama a `alAgotar()` **una sola vez** y se para. Nunca usa `setInterval` ni `setTimeout`. |
| `.detener()` | efecto | Cancela el frame pendiente y devuelve los ms transcurridos. Después de `detener()` nunca se llama a `alAgotar`. Se puede llamar varias veces con el mismo resultado. |
| `.activo()` | | `true` entre `iniciar()` y el agotamiento o `detener()`. |
| `esperarPintado(pedirFrame = requestAnimationFrame)` | async | Resuelve en el **segundo** frame tras la llamada (en el primero se pinta la imagen recién insertada) [D-08]. |
| `fraccionRestante(transcurridoMs, duracionMs)` | pura | `max(0, min(1, 1 - t/d))`. |
| `nivelTemporizador(fraccion)` | pura | `'critico'` si `fraccion <= 0.3`; si no, `'normal'`. |
| `segundosRestantes(restanteMs)` | pura | `Math.ceil(restanteMs / 1000)`, con un mínimo de 0. |

Secuencia de una prueba en main.js:
1. Insertar la `<img>` precargada.
2. `await esperarPintado()`.
3. Si sigue en la misma prueba y en fase `pregunta`, despachar `PINTADA`.
4. `temporizador.iniciar()`.

La cuenta atrás inicial usa el mismo temporizador con `duracionMs: 3000` y muestra `segundosRestantes`.

### 3.5 js/almacen.js (agente-de-campo)

| Función | Tipo | Descripción |
|---|---|---|
| `CLAVE` | constante | `'identifaiit.v1'`. |
| `datosIniciales()` | pura | `{version: 1, ajustes: {modo: 'medio', vistoComoJugar: false}, partidas: {}, racha: 0, mejorRacha: 0}`. |
| `leer(almacen = globalThis.localStorage)` | efecto, nunca lanza | → `{datos, disponible}`. Prueba a escribir y borrar `'identifaiit.prueba'`; si falla, devuelve `disponible: false` y los datos iniciales. Si el JSON es inválido o `version !== 1`, devuelve los datos iniciales (y `disponible` según la prueba). |
| `guardar(datos, almacen = globalThis.localStorage)` | efecto, nunca lanza | → `boolean`. Hace `setItem(CLAVE, JSON.stringify(datos))` dentro de un `try/catch`. |
| `leerConRespaldo(local = localStorage, sesion = sessionStorage)` | efecto, nunca lanza | → `{datos, disponible, respaldo}`. Como `leer`, pero si `local` no funciona recupera la copia de `sesion` [D-51]. |
| `guardarConRespaldo(datos, local = localStorage, sesion = sessionStorage)` | efecto, nunca lanza | → `{guardado, respaldo}`. Guarda en los dos. |
| `actualizar(cambio, enMemoria, local = localStorage, sesion = sessionStorage)` | efecto, nunca lanza | → `{datos, guardado}`. Relee, aplica `cambio(datos)` y guarda [D-51]. |
| `crearAlmacenMemoria()` | fábrica, sin efectos globales | → objeto con la interfaz mínima de `Storage` que usan las funciones anteriores: `getItem(clave)` (devuelve la cadena guardada o `null`), `setItem(clave, valor)` (guarda `String(valor)`) y `removeItem(clave)`. Los datos viven en un `Map` propio de cada objeto: dos llamadas dan almacenes independientes y vacíos, y nunca tocan `localStorage`, `sessionStorage` ni `globalThis`. Nunca lanza. Lo usa main.js en previsualización [D-68] y en modo prueba [D-70]. |
| `partidaDe(datos, fechaISO)` | pura | Devuelve el registro o `null`. Busca por fecha, sin importar el modo [D-32]. |
| `conAjustes(datos, cambios)` | pura | Devuelve los datos con `ajustes` mezclados con `cambios`. |
| `registrarInicio(datos, {fecha, n, modo, sesion})` | pura | Crea `partidas[fecha] = {n, modo, estado: 'en_curso', resultados: '-----', aciertos: 0, sesion}`. Si ya existe una partida para esa fecha, en cualquier modo, devuelve `datos` sin cambios. |
| `registrarPrueba(datos, fecha, indice, codigo)` | pura | Escribe el código en la posición `indice` y actualiza `aciertos`. |
| `registrarFin(datos, fecha, hoyISO, sesion?)` | pura | Pone `estado: 'terminada'` y `aciertos`, recalcula `racha = calcularRacha(partidas, hoyISO)` y `mejorRacha = max(mejorRacha, racha)`. |
| `cerrarAbandonada(datos, fecha, hoyISO)` | pura | Cambia los `-` por `O` y aplica `registrarFin`. |
| `calcularRacha(partidas, hoyISO)` | pura | Cuenta los días consecutivos con partida `terminada` (sea cual sea la puntuación) que acaban hoy, o ayer si hoy aún no se ha jugado. Si no hay partida terminada ni hoy ni ayer, devuelve 0. Un día sin casos también rompe la racha [D-25]. |

Todo guardado relee el almacén y aplica solo su cambio (`actualizar`); una partida `terminada` no se modifica nunca; `leerConRespaldo`/`guardarConRespaldo` usan sessionStorage como copia si localStorage falla [D-51]. Si localStorage falla, el juego funciona igual con los datos en memoria (main.js guarda la copia en una variable) y se muestra `#aviso-almacen`. Al recargar se podría volver a jugar; se acepta porque no hay otra forma sin servidor [D-11].

El almacén no cambia en la versión 1.2: el tema no se guarda, porque se puede leer del calendario [D-54]. La previsualización y el modo prueba tampoco cambian la clave, el formato ni las funciones existentes: solo les pasan almacenes de `crearAlmacenMemoria()` en lugar de los del navegador [D-68, D-70].

### 3.6 js/compartir.js (agente-de-campo)

| Función | Tipo | Descripción |
|---|---|---|
| `CUADROS` | constante | `{A: '🟩', F: '🟥', T: '⬛', O: '⬛'}`. |
| `rellenar(plantilla, valores)` | pura | Sustituye cada `{clave}` por `valores[clave]` y deja tal cual los marcadores sin valor. main.js la usa también para todas las plantillas de textos. |
| `cuadros(resultados)` | pura | `'AAFAT'` → `'🟩🟩🟥🟩⬛'`. |
| `textoCompartir({plantilla, n, nombreModo, resultados, racha, url})` | pura | Sección 7. |
| `urlDelJuego(ubicacion = location)` | pura (con parámetro) | `ubicacion.origin + ubicacion.pathname`, quitando un `index.html` final. No incluye `search`, así que el texto compartido nunca lleva `?prueba=1`, `?dia=` ni `?fecha=` [D-70]. |
| `compartir(texto, nav = navigator)` | async, nunca lanza | → `'compartido' \| 'copiado' \| 'cancelado' \| 'manual'`. Sección 7. |

### 3.7 js/main.js (agente-de-campo)

No exporta nada. Responsabilidades:
1. **Arranque**: decidir el modo de previsualización (punto 11) y el modo prueba (punto 12), `leer()` del almacén y `estadoInicial`. Rellenar todos los `[data-texto]` (también el del enlace de créditos, los `span.boton-texto` de los votos y el `label` de `#compartir-manual`), crear los pasos de cómo jugar y marcar el radio del modo guardado. Después, `cargarCalendario()`. Si la partida de hoy está `en_curso`, aplicar `cerrarAbandonada` y guardar. Por último, despachar `CARGADO` (con `casoDelDia(cal, hoy)` y `partidaDe(datos, hoy)`, donde `hoy` es la fecha efectiva) o `ERROR_CALENDARIO`.
2. **`despachar(evento)`**: `nuevo = transicion(estado, evento)`. Si cambió, ejecutar los efectos de la transición y `render(nuevo)`. Es el único sitio donde se asigna el estado.
3. **`render(estado)`**: `hidden` de las secciones; `data-pantalla`, `data-modo` y `data-fase`; etiquetas y marcador; tema (`#portada-tema` con `portada.tema` y `#caso-tema` con `partida.caso_del_dia`, ambos con `rellenar(…, {tema: estado.tema})` y `textContent`; si `estado.tema` es `null`, quedan vacíos) [D-54]; `#veredicto` (`data-estado`, sello y texto solo en fase veredicto; en fase pregunta, `#veredicto-sello` vacío y sin `data-estado`); resultado (incluidos el `aria-label` de `#resultado-cuadros` y los 5 `li` de `#resultado-revision` con el marcado de 2.3); ya jugado.
4. **Efectos**:
   - Al entrar en `cargando`, precarga.
   - Cuenta atrás.
   - En `FIN_CUENTA`: crear una `sesion` (cadena aleatoria de 8 caracteres `[a-z0-9]`), `registrarInicio` y guardar, todo **antes** de mostrar la primera imagen. La `fecha` del evento es la fecha efectiva.
   - En cada prueba: insertar la imagen, `esperarPintado`, `PINTADA` y temporizador.
   - Detener el temporizador al votar u ocultarse la pestaña.
   - Tras cada veredicto, `registrarPrueba` y guardar.
   - Al entrar en `resultado`, `registrarFin` y guardar.
5. **Entrada**:
   - Clic en `[data-voto]` y `[data-accion]` (delegación en `#app`, buscando el botón con `closest`, porque el clic puede caer en el `span` o el `kbd` interiores) y `change` en `input[name=modo]`.
   - Teclado: `keydown` en `document`, ignorando `e.repeat` y las teclas pulsadas con Ctrl, Alt o Meta.
   - `r`/`R` → `VOTO autentica` e `i`/`I` → `VOTO generada`, solo en `caso/pregunta`.
   - `Enter` → `SIGUIENTE`, solo en `caso/veredicto` y si el foco no está en un `button` ni en un enlace (para no duplicar la acción nativa).
6. **`visibilitychange`**: al ocultarse la pestaña → `OCULTA`. Al volver a estar visible: en `cuenta-atras`, reiniciarla; en `portada`, `ya-jugado` o `sin-casos`, si la fecha efectiva cambió, `MEDIANOCHE`.
7. **Medianoche**: en `ya-jugado`, la cuenta atrás se actualiza cada segundo con `setTimeout` encadenado (no es el temporizador de juego). Al llegar a 0, `MEDIANOCHE`. Toda comprobación de "la fecha cambió" compara la fecha efectiva.
8. **Otras pestañas**: escuchar `storage`. Si durante `cuenta-atras` o `caso` el registro de la fecha actual aparece con otra `sesion`, o como `terminada` sin que lo haya terminado esta pestaña, `OTRA_PESTANA`. Antes de `FIN_CUENTA` se vuelve a leer el almacén: si ya hay partida de hoy (en cualquier modo), `OTRA_PESTANA`.
9. **Compartir**: construir el texto y llamar a `compartir()`. Según lo que devuelva, mostrar `#compartir-aviso` 2 s (`copiado`) o `#compartir-manual` con el texto seleccionado (`manual`), sin mover el `textarea` ni su `label` (2.3).
10. **Errores**: `try/catch` en el arranque; cualquier fallo de carga lleva a `error`. Nada de `console.log` en producción (sí `console.error` en fallos reales).
11. **Previsualización local** [D-68]:
    - Al cargar el módulo, una sola vez: `fechaFija = fechaPrevisualizada(location.search, location.hostname)`. Si es `null`, todo funciona exactamente como en los puntos 1 a 10 (también en `localhost` sin parámetro o con una fecha inválida), salvo lo que añade el punto 12.
    - **Fecha efectiva**: una única función interna (por ejemplo, `hoy()`) devuelve `fechaFija ?? fechaPrueba ?? fechaLocal(new Date())` (`fechaPrueba` es la del punto 12), y todos los usos de la fecha de hoy de main.js pasan por ella: `casoDelDia`, `partidaDe`, `cerrarAbandonada`, la `fecha` de `FIN_CUENTA`, la racha de la portada y las comprobaciones de cambio de día de los puntos 6 y 7. Con `fechaFija`, esas comprobaciones nunca detectan un cambio. La cuenta atrás de `ya-jugado` sigue usando `msHastaMedianoche(new Date())`.
    - **Almacén**: con `fechaFija`, main.js crea al arrancar dos almacenes con `crearAlmacenMemoria()` (uno hace de local y otro de respaldo) y los pasa **explícitamente** a todas las llamadas de `leer`, `leerConRespaldo`, `guardar`, `guardarConRespaldo` y `actualizar`; sin `fechaFija` (ni modo prueba) no pasa nada y se usan los valores por defecto. En previsualización no se accede nunca a `localStorage` ni a `sessionStorage`, ni siquiera para escribir la clave de prueba `identifaiit.prueba`. Los almacenes parten vacíos, así que los ajustes empiezan en `datosIniciales()` (modo `medio`, `vistoComoJugar: false`), no hay partida previa ni racha, y al recargar la página se pierde todo y se puede volver a jugar.
    - **Otras pestañas**: con `fechaFija` no se registra el oyente de `storage` (punto 8) y las relecturas al volver a visible o antes de `FIN_CUENTA` leen el almacén en memoria, así que nunca se despacha `OTRA_PESTANA`.
    - **Avisos**: `#aviso-previsualizacion` se rellena y se muestra al arrancar (2.3). `#aviso-almacen` queda con `hidden`.
    - **Anti-trampas**: el parámetro solo cambia el día. No hay ningún otro parámetro de URL (salvo los del modo prueba, punto 12), ni modo que muestre la verdad, la clave desofuscada o la revisión antes de responder; no se escribe nada en la consola; el DOM, `transicion` y la precarga son los de siempre. Compartir funciona igual (con la URL local).
12. **Modo prueba** [D-70, D-71]:
    - **Interruptor**: la primera línea de código tras los `import` es exactamente `const PRUEBAS_ABIERTAS = true;` (puede llevar un comentario al final de la línea que recuerde D-71 y la fecha 2026-11-01). Es la única fuente del interruptor: no se lee de la URL, del almacén ni de ningún otro archivo, y no se exporta. Para apagar el modo se cambia solo esa línea a `const PRUEBAS_ABIERTAS = false;` (tarea 44); el resto del código del modo puede quedarse, porque con `false` nunca se ejecuta.
    - **Activación**, al cargar el módulo, una sola vez y después de calcular `fechaFija`: `modoPrueba = fechaFija === null && pruebaActiva(location.search, PRUEBAS_ABIERTAS)`. Vale en cualquier host. Si `fechaFija` no es `null` (previsualización local con `?fecha=` válido), manda el punto 11 y no hay selector, aunque la URL lleve `?prueba=1` (DP-20). En hosts no locales `?fecha=` se sigue ignorando, así que `?prueba=1&fecha=…` en GitHub Pages es modo prueba normal. Con `PRUEBAS_ABIERTAS = false`, `modoPrueba` es siempre `false`: `?prueba=1` y `?dia=` no tienen ningún efecto y nada de este punto ocurre.
    - **Almacén y otras pestañas**: con `modoPrueba` se aplica exactamente lo del punto 11 (dos almacenes de `crearAlmacenMemoria()` pasados a todas las llamadas, ningún acceso a `localStorage` ni `sessionStorage`, sin oyente de `storage`, nunca `OTRA_PESTANA`). Es decir, los almacenes en memoria se usan si `fechaFija !== null || modoPrueba`.
    - **Fecha efectiva**: en el arranque (punto 1), tras `cargarCalendario()` y **antes** de calcular el caso, la partida de hoy o `cerrarAbandonada`: `dias = diasDePrueba(calendario)`, `elegido = diaDePrueba(location.search, dias, fechaLocal(new Date()))` y `fechaPrueba = elegido?.fecha ?? null`. Desde ese momento `hoy()` devuelve `fechaPrueba` y no cambia mientras la página esté abierta, así que nunca se detecta cambio de día (no hay `MEDIANOCHE`). Si el calendario no tiene días (`elegido === null`), `fechaPrueba` queda en `null`, la fecha efectiva es la local y se ve `sin-casos`. Si la carga del calendario falla, se va a `error` como siempre y `REINTENTAR` repite este cálculo.
    - **Aviso**: en ese mismo momento, antes de despachar `CARGADO`, `#aviso-previsualizacion` recibe `rellenar(TEXTOS.avisos.previsualizacion, {fecha: hoy()})` y pierde `hidden` (2.3). `#aviso-almacen` queda con `hidden`.
    - **Selector**: si `dias.length > 0`, main.js crea `#selector-prueba` con el marcado exacto de 2.3 (textos con `textContent` y `rellenar`, `selected` en la `option` de `elegido.n`) y lo inserta justo después de `#portada-tema`. Se crea **una sola vez** por carga de página (si se repite el arranque por `REINTENTAR`, no se duplica). El clic en `button[data-accion="abrir-prueba"]` (por la misma delegación del punto 5) hace `location.assign('?prueba=1&dia=' + select.value)`: es una URL relativa que conserva la ruta (`/identifAI-it/`), descarta cualquier otro parámetro y recarga la página con el día nuevo. No se despacha ningún evento de `transicion`. Las teclas R, I y Enter siguen las reglas del punto 5 (el selector solo está en `portada`, donde no actúan).
    - **Anti-trampas**: el selector y la URL solo contienen `n` y `tema` (y la fecha, en el aviso); nunca `pruebas`, `clave`, la verdad, ni cuántas generadas tiene un día. No se añade nada a la consola. El DOM de la partida, `transicion`, la precarga, el temporizador y la revisión final son los de siempre: la verdad solo aparece al responder y en `resultado`, como en el juego normal. Compartir funciona igual; `urlDelJuego()` no incluye los parámetros, así que el texto compartido no lleva `?prueba=1`.
    - **Riesgo conocido, aceptado por el usuario hasta el lanzamiento** [D-70]: mientras `PRUEBAS_ABIERTAS` sea `true`, cualquiera que conozca `?prueba=1` (en GitHub Pages) puede jugar todos los días del calendario antes de su fecha y ver en `resultado` qué pruebas eran IA. Las 35 imágenes de `casos/` y las claves de `data/calendario.json` ya eran públicas y desofuscables [D-22], pero este modo lo pone al alcance de cualquiera sin herramientas. Quien haya jugado un día en modo prueba conocerá sus respuestas también después del lanzamiento; apagar el modo no lo deshace.

---

## 4. Datos

### 4.1 herramientas/banco.json (privado, solo en local) [D-21, D-57]

- Está en `.gitignore` y **nunca se sube** ni al repositorio ni a GitHub Pages. Solo lo leen y escriben `importar.mjs`, `creditos.mjs` y `validar.mjs` en el equipo del usuario. El juego no lo carga jamás.
- Es la única fuente de `tipo` (además de la clave ofuscada), `fuente`, `licencia`, `original`, `dhash` y `recorte`. Conviene guardar una copia privada fuera del repositorio después de cada importación; el importador lo recuerda al terminar.
- Cada imagen del banco pertenece a un único día: no hay reserva de imágenes sin usar ni selección aleatoria [D-52].
- Si se pierde, el calendario publicado sigue funcionando: el tipo se recupera con `desofuscar` sobre `data/calendario.json` y el tema está en el calendario. Se pierden `fuente`, `licencia`, `original`, `dhash` (la detección de duplicados con días antiguos) y `recorte`. `creditos.html` conserva la lista agregada de fuentes y licencias.
- Versión 2. El importador rechaza un banco de la versión 1 (con `categoria` y `usada`) con el mensaje "herramientas/banco.json es de la versión 1 (anterior a los temas por día). Bórralo junto con casos/ y data/calendario.json y vuelve a importar." y código 1. El campo `recorte` [D-65] se añade sin cambiar la versión: las entradas importadas antes de D-65 pueden no tenerlo (4.4.3).
- `herramientas/banco.anterior.json` tiene el mismo formato: es la copia byte a byte del banco que deja `--reimportar --confirmar` antes de regenerarlo (4.4.4). Ningún script lo lee.

```json
{
  "version": 2,
  "imagenes": [
    {
      "id": "k3x9q2m7ab",
      "tipo": "generada",
      "dia": 1,
      "fecha": "2026-11-01",
      "tema": "Fuegos artificiales",
      "fuente": "Creación propia (Gemini)",
      "licencia": "Términos de uso de Gemini",
      "original": "01-fuegos-artificiales/ia/Gemini_Generated_Image_lwfc7alwfc7alwfc.jpg",
      "dhash": "f0e1d2c3b4a59687",
      "recorte": "atencion",
      "alta": "2026-10-21"
    },
    {
      "id": "p0w8e4r1tz",
      "tipo": "autentica",
      "dia": 1,
      "fecha": "2026-11-01",
      "tema": "Fuegos artificiales",
      "fuente": "Unsplash",
      "licencia": "Licencia de Unsplash",
      "original": "01-fuegos-artificiales/real/ray-hennessy-gdTxVSAE5sk-unsplash.jpg",
      "dhash": "0f1e2d3c4b5a6978",
      "recorte": "izquierda",
      "alta": "2026-10-21"
    }
  ]
}
```

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string | 10 caracteres `[a-z0-9]`, único. El archivo es `casos/{id}.webp`. Se genera otro si contiene como subcadena `ia`, `ai`, `real` o `fake`, o si ya existe en el banco o en `casos/`. |
| `tipo` | `"autentica" \| "generada"` | Verdad de la imagen: `generada` si viene de la subcarpeta `ia/`, `autentica` si viene de `real/`. |
| `dia` | número | Número de caso `n` (el `NN` de la carpeta). Exactamente 5 imágenes por `dia`. |
| `fecha` | fecha ISO | `sumarDias(lanzamiento, dia - 1)`. Sustituye al antiguo `usada`. |
| `tema` | string | El mismo texto que `dias[dia - 1].tema` del calendario. |
| `fuente`, `licencia` | string | Valores exactos de la tabla `FUENTES` (4.6), deducidos del nombre del archivo original [D-58]. Se escapan al escribirlos en `creditos.html` (4.5). |
| `original` | string | Ruta del original relativa a `entrada/temas/`, con `/`. Solo sirve para localizarlo; es privada, así que puede contener cualquier palabra. Tiene el mismo formato que las claves de `lote.json` (4.4.5). |
| `dhash` | string | 16 caracteres hexadecimales (64 bits). Se considera duplicado si la distancia de Hamming es ≤ 5. |
| `recorte` | `"atencion" \| "izquierda" \| "centro" \| "derecha" \| "arriba" \| "abajo"` | [D-65] Recorte usado al normalizar la imagen: `atencion` si se usó `sharp.strategy.attention`, o el valor de `lote.json` si había uno para su `original`. Lo escribe `importar.mjs` en cada entrada nueva. |
| `alta` | fecha ISO | Día de importación. |

No hay campo `categoria`: la regla de categorías desaparece [D-52].

### 4.2 data/calendario.json (público; lo carga el juego)

```json
{
  "version": 2,
  "lanzamiento": "2026-11-01",
  "dias": [
    { "n": 1, "fecha": "2026-11-01", "tema": "Fuegos artificiales", "pruebas": ["k3x9q2m7ab", "p0w8e4r1tz", "m5n6b7v8c9", "z1x2c3v4b5", "q9w8e7r6t5"], "clave": "Mpb9Ycc=" },
    { "n": 2, "fecha": "2026-11-02", "tema": "Perros", "pruebas": ["a1s2d3f4g5", "h6j7k8l9m0", "y5t4r3e2w1", "u7o8e9p0w1", "s2d3f4g5h6"], "clave": "Ax7Pq1E=" }
  ]
}
```

Reglas (`validarCalendario` comprueba la estructura y `validar.mjs` todo lo demás):
- `version` vale **2** [D-53] y `lanzamiento` vale `"2026-11-01"` [D-20, D-50].
- `dias` está ordenado por `n` y sin huecos: `dias[k].n === k + 1` y `fecha === sumarDias(lanzamiento, n - 1)`.
- `tema` [D-53]:
  - Es el texto final que se muestra, derivado del nombre de la carpeta del día con `temaDeCarpeta` (4.6): sin el número, guiones cambiados por espacios y la primera letra en mayúscula. Por ejemplo, `02-perros` → `"Perros"` y `05-mesa-con-comida` → `"Mesa con comida"`.
  - Estructura (`temaValido`, dentro de `validarCalendario`): cadena de 1 a 30 caracteres, sin espacios al principio ni al final, sin caracteres de control, sin `{` ni `}` (para que no interfiera con `rellenar`) y con la primera letra en mayúscula.
  - Palabras prohibidas (`contienePalabraProhibida`, en `importar.mjs` y `validar.mjs`): ningún tema contiene `real`, `ia`, `ai` ni `fake` **por palabra completa** (0.1). "Gente peleando" o "Tiarras" pasan; "Real Madrid" o "Arte IA" no.
  - Puede repetirse en días distintos.
- `pruebas` tiene exactamente 5 ids distintos que existen en `casos/`. Ningún id se repite en todo el calendario [D-52].
- El orden de las 5 pruebas lo decide `importar.mjs` al azar (con `crypto`) al crear el día, y es el mismo para todos los jugadores; el navegador no reordena nada [D-55].
- `clave` tiene 8 caracteres base64 que codifican 5 bytes (sección 4.3). Cada día tiene entre 1 y 4 verdades `1` (generada), en el reparto exacto que haya puesto el usuario en las carpetas `ia/` y `real/` del día; se puede comprobar sin el banco, desofuscando. Un día con 0 o 5 generadas es un error [D-52, D-61].
- `importar.mjs` solo añade días posteriores a hoy; nunca modifica hoy, días pasados ni ningún día ya existente [D-56]. La única excepción es `--reimportar --confirmar`, que regenera todos los días y solo se permite mientras ninguno haya llegado (4.4.4) [D-65].
- No hay ningún otro campo (nada de `tipo`, `fuente`, `categoria`, `original` ni `recorte`).
- El modo prueba [D-70] lee este mismo archivo: no hay un calendario aparte ni campos nuevos. El selector solo usa `n`, `fecha` y `tema` (`diasDePrueba`).

Nota: la clave `"Ax7Pq1E="` del día 2 es ilustrativa; la del día 1 es el vector de prueba real de 4.3 (3 generadas), aunque el día 1 real tenga otro reparto.

### 4.3 Ofuscación de la respuesta [D-22]

No es seguridad: solo evita que la respuesta se lea a simple vista en las herramientas del navegador.

```
mascara(n, i) = (n * 37 + i * 101 + 13) mod 256
ofuscar(verdades, n, aleatorio):
  para i en 0..4:
    ruido_i = floor(aleatorio() * 128)                  // 0..127
    byte_i  = ((ruido_i << 1) | verdades[i]) XOR mascara(n, i)
  clave = btoa(String.fromCharCode(byte_0, ..., byte_4))   // 8 caracteres
desofuscar(clave, n, i) = (atob(clave).charCodeAt(i) XOR mascara(n, i)) AND 1
```

- El bit 0 es la verdad (`0` auténtica, `1` generada) y los 7 bits altos son ruido, así que dos días con la misma combinación no producen la misma clave.
- `btoa` y `atob` existen en el navegador y en Node 20, así que la misma función sirve en `js/diario.js` y en `herramientas/importar.mjs`, que la importa de `../js/diario.js` [D-14, D-56].
- Vector de prueba: `ofuscar([0, 1, 1, 0, 1], 1, () => 0) === 'Mpb9Ycc='` (bytes `32 96 FD 61 C7`), y `desofuscar('Mpb9Ycc=', 1, i)` devuelve `0, 1, 1, 0, 1` para `i = 0..4`.
- La verdad solo se calcula en `transicion`, al corregir, y en la revisión final. Nunca se escribe en el DOM, en atributos ni en `localStorage`.
- El peso de los archivos también podría delatar la verdad: por eso todas las imágenes pasan por la misma normalización (4.4.2) y `validar.mjs` avisa si los pesos medios difieren mucho [D-60].

### 4.4 Herramientas: flujo y ausencia de banco.json [D-21, D-34, D-56]

| Script | Lee | Escribe | Si `herramientas/banco.json` no existe |
|---|---|---|---|
| `importar.mjs` (`npm run importar`; `npm run importar -- --simular` no escribe nada; `npm run importar -- --reimportar [--confirmar]`, 4.4.4) | `entrada/temas/*/{ia,real}/`, `banco.json`, `lote.json` (si existe), `data/calendario.json` | `casos/`, `banco.json`, `data/calendario.json` y `creditos.html` (con `creditos.mjs`); con `--reimportar --confirmar`, además `banco.anterior.json` y el borrado de las imágenes antiguas de `casos/`. **No** mueve ni borra los originales ni modifica `lote.json`. | Si `casos/` está vacío y no existe `data/calendario.json`, crea un banco nuevo vacío y lo anuncia. Si `casos/` ya tiene imágenes o el calendario tiene días, **se detiene** (código de salida 1) con el mensaje "No se encuentra herramientas/banco.json, que es privado y no está en el repo. Restaura tu copia o usa --banco-nuevo si sabes lo que haces." Con `--banco-nuevo` crea uno vacío: los días ya publicados se respetan, pero sus imágenes quedan fuera del banco (sin fuente ni dHash). Con `--reimportar` la falta del banco no es un error (4.4.4). |
| `creditos.mjs` (`npm run creditos`) | `banco.json`, `js/textos.js` | `creditos.html` | Si `casos/` está vacío, genera la página sin imágenes. Si `casos/` tiene imágenes, **se detiene** (código 1) con el mensaje "No se encuentra herramientas/banco.json; no se regenera creditos.html para no borrar los créditos publicados." y no toca el archivo. |
| `validar.mjs` (`npm run validar`) | `data/calendario.json`, `casos/`, todo lo publicado (también `js/main.js` como texto, para `PRUEBAS_ABIERTAS`) y `banco.json` si existe | nada | Ejecuta todas las comprobaciones de lo publicado y muestra un aviso bien visible: "AVISO: herramientas/banco.json no encontrado; se omiten las comprobaciones que dependen del banco (coherencia de tipos, temas y fuentes, duplicados y créditos completos)." Termina con código 0 si lo demás pasa. Con `--estricto`, la falta del banco es un error (código 1). |

Ya no existen `importar-dataset.mjs` ni `generar-calendario.mjs`, ni los scripts `importar-dataset` y `calendario` de `package.json`, ni las carpetas `entrada/reales/`, `entrada/ia/` y `entrada/procesadas/`: el calendario lo genera `importar.mjs` a partir de los temas [D-56]. El antiguo `lote.json` de la importación por lotes tampoco existe; el `herramientas/lote.json` actual es otro archivo, con los recortes manuales (4.4.5) [D-65]. Los scripts de `package.json` quedan así (los argumentos nuevos se pasan tras `--`, sin scripts nuevos):

```json
"scripts": {
  "test": "node --test tests/",
  "validar": "node herramientas/validar.mjs",
  "importar": "node herramientas/importar.mjs",
  "creditos": "node herramientas/creditos.mjs"
}
```

`.gitignore` contiene, como mínimo, estas líneas: `entrada/`, `node_modules/`, `herramientas/banco.json`, `herramientas/banco.anterior.json` y `herramientas/lote.json` [D-65].

#### 4.4.1 Carpetas de entrada [D-52]

```
entrada/temas/
  01-fuegos-artificiales/
    ia/     Gemini_Generated_Image_….jpg (x4)
    real/   ray-hennessy-…-unsplash.jpg (x1)
  02-perros/
    ia/ …
    real/ …
  …
  07-gente-peleando/
```

- Nombre de la carpeta de día: `NN-nombre-del-tema`, con `NN` de 2 o más dígitos (`01`, `02`… `99`, `100`), un guion, y el nombre en trozos de letras o números (Unicode, en NFC) separados por un guion. Expresión: `^(\d{2,})-([\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*)$` (con la bandera `u`). `NN` es el número de caso: `01` = `2026-11-01`, `02` = `2026-11-02`, etc.
- Dentro de cada carpeta de día hay exactamente dos subcarpetas, `ia/` y `real/` (en minúsculas). Cualquier otra subcarpeta o archivo suelto es un error.
- Dentro de `ia/` y `real/` solo puede haber imágenes `.jpg`, `.jpeg`, `.png` o `.webp` (sin distinguir mayúsculas). Se ignoran los archivos que empiezan por `.`, `Thumbs.db` y `desktop.ini`; cualquier otro archivo es un error.
- Todo lo que no sea una carpeta en `entrada/temas/` se ignora con las mismas excepciones; una carpeta con un nombre que no cumple el patrón es un error.
- Cada día necesita **exactamente 5** imágenes en total, con entre 1 y 4 en `ia/`. El importador no rellena ni recorta: un día con otro número, o con 0 o 5 generadas, es un error.
- Una generada con la marca o el logo de Gemini visible no se importa: el usuario la revisa a mano, la regenera y la sustituye en su carpeta antes de importar. No hay detección automática [D-66]. El usuario ha hecho esa revisión sobre las imágenes actuales (comunicado el 2026-10-22) [D-74]; se repite tras cualquier cambio de imágenes o reimportación.

#### 4.4.2 Flujo de importar.mjs [D-56]

Fase A: comprobaciones. No se escribe nada hasta que todas pasan; si falla alguna, se muestran **todos** los errores juntos, se termina con código 1 y no se modifica ningún archivo.

1. Leer los argumentos con `analizarArgumentos(process.argv.slice(2))` (4.6): `--simular`, `--banco-nuevo`, `--reimportar` y `--confirmar` [D-65, D-72]. Son errores: un argumento desconocido ("Argumento desconocido: {arg}."); `--confirmar` sin `--reimportar` ("--confirmar solo vale junto a --reimportar."); y `--reimportar` con `--banco-nuevo` ("--reimportar y --banco-nuevo no se pueden usar juntos: la reimportación ya crea un banco nuevo."). Con `--reimportar`, el resto del flujo cambia según 4.4.4.
2. Banco: aplicar las reglas de "sin banco" de la tabla 4.4. Si existe y no es la versión 2, se detiene (4.1).
3. Calendario:
   - Si no existe `data/calendario.json`, se parte de `{version: 2, lanzamiento: "2026-11-01", dias: []}`.
   - Si existe pero no es definitivo (`version !== 2`, `lanzamiento !== "2026-11-01"` o `validarCalendario` falla), se detiene con "data/calendario.json no es un calendario definitivo (¿datos de prueba de D-46?). Bórralo junto con las imágenes de casos/ antes de importar." [D-63].
4. Leer `entrada/temas/`. Si no existe o no tiene carpetas de día, muestra "No hay temas por importar en entrada/temas/." y termina con código 0.
5. `planificar` (4.6), con el listado de carpetas, el número del último día del calendario, `hoy = fechaLocal(new Date())` y el lanzamiento:
   - Los números de las carpetas son únicos y consecutivos.
   - Las carpetas cuyo número ya está en el calendario se **omiten** ("01-fuegos-artificiales: ya importado, se omite"). Si hay banco, se comprueba que tiene 5 imágenes de ese `dia` con el mismo `tema`; si no, es un error. Las imágenes de las carpetas omitidas no se vuelven a leer (solo se listan sus nombres, para el paso 5 bis).
   - La primera carpeta nueva es la del día siguiente al último del calendario (`01` si está vacío).
   - Cada carpeta nueva cumple 4.4.1. Mensaje para un día con un número de imágenes distinto de 5, por ejemplo: "06-discoteca tiene 6 imágenes (real: 3, ia: 3). Cada día necesita exactamente 5; no se rellena ni se recorta. Retira o añade imágenes y vuelve a ejecutar." Mensaje para 0 o 5 generadas: "03-gente-comiendo tiene 5 imágenes en ia/ y 0 en real/. Cada día necesita entre 1 y 4 en ia/."
   - La fecha de cada día nuevo (`sumarDias(lanzamiento, n - 1)`) es posterior a hoy. Si no: "El día 08 (2026-11-08) ya ha llegado o ha pasado; no se pueden añadir días de hoy ni del pasado."
   - Tema: `temaDeCarpeta(nombre)`; es un error si `temaValido` falla (por ejemplo, más de 30 caracteres) o si `contienePalabraProhibida` devuelve una palabra: "El tema de 09-arte-ia ("Arte ia") contiene la palabra prohibida "ia". Cambia el nombre de la carpeta."
   - Fuente: `fuenteDeArchivo(nombre, tipo)` para cada imagen (4.6). Es un error si el nombre no corresponde a ninguna fuente conocida o si corresponde a una fuente del otro tipo (por ejemplo, un `-unsplash.jpg` dentro de `ia/`).
   - 5 bis. Recortes manuales [D-65]: si existe `herramientas/lote.json`, leerlo (UTF-8; se ignora un BOM inicial) y aplicar `analizarLote` (4.6) con las rutas de las imágenes de los días nuevos y las de los días omitidos. Si no es JSON válido, es un error ("herramientas/lote.json no es JSON válido: {detalle del error}."). Los errores y avisos de `analizarLote` se suman a los del paso 5. Si no existe, todas las imágenes usan `attention`.
6. Leer cada imagen nueva con `sharp`:
   - Error si no se puede decodificar.
   - Calcular el dHash. Error si dos imágenes, nuevas o del banco, están a distancia ≤ 5: "Imágenes duplicadas: 02-perros/real/x.jpg y 05-mesa-con-comida/ia/y.jpg."
   - Aviso (no error) si hay que ampliarla para llegar a 1080 x 1350, es decir, si `max(1080 / ancho, 1350 / alto) > 1` tras aplicar la orientación EXIF: "02-perros/ia/x.jpg mide 1024 x 1024 y se ampliará; puede verse más blanda que el resto." [D-59].
7. Con `--simular`: mostrar el plan (por día nuevo: número, fecha, tema, número de imágenes de `ia/` y `real/`, fuentes, recortes manuales de `lote.json` con su ruta y valor, y avisos, más las carpetas omitidas) y terminar con código 0 sin escribir nada. El plan recuerda revisar a mano que ninguna generada conserve la marca de Gemini [D-66].

Fase B: escritura.

8. Para cada día nuevo, en orden de `n`:
   - `barajar` las 5 imágenes con un aleatorio criptográfico (`() => crypto.randomInt(2 ** 32) / 2 ** 32`). Ese orden es el definitivo de `pruebas` [D-55].
   - Asignar a cada imagen un id con `nuevoId` (4.6), distinto de todos los del banco, de los de `casos/` y de los ya asignados.
   - `verdades[i] = tipo === 'generada' ? 1 : 0` en el orden barajado, y `clave = ofuscar(verdades, n)`.
9. Normalizar y escribir las imágenes de todos los días nuevos **en un orden aleatorio global** (otro `barajar`), para que ni el orden de escritura ni las fechas de los archivos agrupen las imágenes por tipo [D-55, D-59, D-65]:
   ```js
   const recorte = recortes[ruta] ?? 'atencion'                 // recortes: resultado de analizarLote
   const position = recorte === 'atencion'
     ? sharp.strategy.attention                                 // zona más llamativa (por defecto)
     : POSICIONES_RECORTE[recorte]                              // manual: 'left', 'centre', 'right', 'top' o 'bottom'
   sharp(original)
     .rotate()                                                  // aplica la orientación EXIF
     .resize(1080, 1350, { fit: 'cover', position })            // recorte 4:5
     .webp({ quality: 80, effort: 6 })                          // calidad fija, igual para todas
     .toFile(`casos/${id}.webp`)                                // sin withMetadata: sin EXIF, XMP, ICC ni C2PA
   ```
   El valor de `lote.json` tiene siempre precedencia sobre `attention`. Después de escribir cada archivo, se comprueba con `sharp(...).metadata()` que es WebP de 1080 x 1350 y que no tiene `exif`, `xmp`, `icc` ni `iptc`. Si el archivo ya existiera, se genera otro id.
10. Añadir al banco (versión 2) las 5 entradas de cada día nuevo, con `alta = hoy` y `recorte` = el valor usado en el paso 9 (`atencion` o el de `lote.json`).
11. Añadir los días nuevos al final de `dias`, sin tocar los existentes; comprobar `validarCalendario` antes de escribir. Formato de escritura de los dos JSON: `JSON.stringify(obj, null, 2) + '\n'`, UTF-8 y LF.
12. Regenerar `creditos.html` con `escribirCreditos` (4.5).
13. Informe final:
    - Días añadidos (número, fecha y tema) y carpetas omitidas.
    - Recortes: "Recortes manuales (lote.json): 3. El resto usa el recorte por atención." y los avisos de `analizarLote`.
    - Avisos de mezcla (`avisosMezcla`, 4.6) y de peso (`compararPesos` sobre todo `casos/`, 4.4.3).
    - "Los originales siguen en entrada/temas/; el importador no los mueve ni los borra. Puedes archivarlos a mano." [D-56]
    - "Guarda una copia privada de herramientas/banco.json fuera del repositorio."

Si la fase B falla a medias (por ejemplo, disco lleno), el importador termina con código 1 y no escribe `banco.json` ni `data/calendario.json`; las imágenes ya escritas en `casos/` quedan huérfanas y `validar.mjs` las señala (aviso de imágenes no referenciadas). Antes del lanzamiento, rehacer los días ya importados (por ejemplo, para aplicar recortes nuevos) se hace con `--reimportar --confirmar` (4.4.4); después del lanzamiento, los días existentes no se modifican [D-65].

#### 4.4.3 Comprobaciones de validar.mjs

- **Sin banco** (funcionan en un clon limpio del repositorio):
  - Las imágenes del calendario existen, son WebP de 1080 x 1350 y no tienen metadatos (EXIF, XMP, ICC ni C2PA).
  - `version` es 2, `lanzamiento` es `"2026-11-01"`, `validarCalendario` pasa, `n` y `fecha` son coherentes, y las claves decodifican a 5 bytes con entre 1 y 4 generadas.
  - Ningún `tema` contiene palabras prohibidas por palabra completa (`contienePalabraProhibida`) [D-53].
  - Ningún id se repite en todo el calendario.
  - No hay palabras prohibidas en nada de lo publicado (ids, clases, `data-*` y `alt` de `index.html` y de `creditos.html`, nombres y rutas).
  - `herramientas/banco.json`, `herramientas/banco.anterior.json` y `herramientas/lote.json` **no** están rastreados por git (`git ls-files --error-unmatch {ruta}` debe fallar para cada uno) y los tres están en `.gitignore` [D-65]. `entrada/` también está en `.gitignore` y no hay ningún archivo de `entrada/` rastreado.
  - No hay URL externas (`http://`, `https://`, `//`) en `index.html`, `creditos.html`, `css/` ni `js/`.
  - Existen los `fonts/*.woff2` referenciados y el archivo de licencia de cada tipografía: los `archivo` de `TIPOGRAFIAS` (importada de `herramientas/creditos.mjs`), hoy `fonts/OFL-oswald.txt` y `fonts/LICENSE-special-elite.txt` [D-40]. Ninguno puede estar vacío.
  - Existen `.nojekyll` y `creditos.html` en la raíz.
  - **No** existe `docs/muestras.html` [D-45, D-73]. Si existe, es un error: "docs/muestras.html debe eliminarse (D-73)."
  - Todo `href` y `src` relativo de `index.html` y de `creditos.html` apunta a un archivo existente, con las mismas mayúsculas.
  - `creditos.html` cumple la estructura de 2.7: `lang="es"`, `<title>`, viewport, CSP idéntica a la de `index.html`, `#creditos-volver` con `href="index.html"`, sin `<script>` ni atributo `style`, y sin ningún id de imagen de `casos/`.
  - **Interruptor del modo prueba** [D-71]: se lee `js/main.js` como texto (UTF-8) y se aplica `analizarPruebasAbiertas` (4.6), con `hoy = fechaLocal(new Date())`:
    - Si devuelve `null` (la declaración no aparece o aparece más de una vez): error "js/main.js debe declarar una sola vez const PRUEBAS_ABIERTAS = true; o const PRUEBAS_ABIERTAS = false; (D-71)."
    - Si devuelve `true` y hoy es anterior al lanzamiento (`diasEntre(hoy, lanzamiento) > 0`) y no se ha pasado `--estricto`: aviso "AVISO: el modo prueba está abierto (PRUEBAS_ABIERTAS = true en js/main.js). Ponlo a false antes del lanzamiento (2026-11-01)."
    - Si devuelve `true` y se ha pasado `--estricto`, o hoy es el lanzamiento o posterior: error "El modo prueba sigue abierto: pon const PRUEBAS_ABIERTAS = false; en js/main.js antes de publicar (D-71)." (DP-22).
    - Si devuelve `false`: nada.
  - Avisos (no fallan):
    - Quedan menos de 7 días de calendario a partir de hoy [D-62].
    - Mezcla (`avisosMezcla` sobre las generadas de cada día, obtenidas con `desofuscar`): más de un 60 % de un tipo (generadas o auténticas) en todo el calendario, o 3 o más días seguidos con el mismo número de generadas [D-61, D-67].
    - Peso (`compararPesos`, con el tipo obtenido con `desofuscar`): la media de bytes de los WebP de un tipo supera a la del otro en más de un 25 % en todo el calendario; y lista de días en los que pasa lo mismo [D-60]. Mensaje: "AVISO: las imágenes de un tipo pesan de media un 31 % más que las del otro (412 KB frente a 315 KB). El tamaño de archivo podría delatar la respuesta. Días afectados: 1, 4."
    - Hay archivos en `casos/` que no aparecen en el calendario.
- **Con banco**:
  - Todos los ids del calendario están en el banco, con `dia` y `fecha` iguales a los de su día, y `tema` igual al `tema` del día.
  - Cada `dia` del banco tiene exactamente 5 imágenes, y todos los días del calendario están en el banco.
  - Los tipos del banco coinciden con lo que da `desofuscar` sobre el calendario.
  - Cada `fuente`/`licencia` del banco es una pareja de `FUENTES` coherente con su `tipo`.
  - No hay dos imágenes del banco con dHash a distancia ≤ 5.
  - `creditos.html` es idéntico byte a byte a lo que generaría `creditos.mjs` con el banco actual.
  - Si una entrada tiene `recorte`, su valor es `atencion` o una clave de `POSICIONES_RECORTE`; si no, es un error [D-65].
  - Aviso si hay imágenes en `casos/` que no están en el banco.
  - Aviso si hay entradas sin `recorte` (importadas antes de D-65): "AVISO: 35 imágenes del banco no tienen recorte registrado (importadas antes de D-65). Reimporta con --reimportar si quieres aplicar el recorte por atención."

Ya no se comprueba ninguna regla de categorías ni de "máximo 2 por categoría" [D-52].

`npm test` no lee `banco.json`, `lote.json` ni `entrada/` en ningún caso. Tampoco lee `js/main.js` ni depende de la fecha actual: la comprobación de `PRUEBAS_ABIERTAS` contra la fecha solo la hace `validar.mjs` [D-71].

#### 4.4.4 Reimportación: `--reimportar` [D-65]

Sirve para rehacer desde cero los días ya importados (por ejemplo, para aplicar el recorte por atención o los recortes de `lote.json` a los 7 días del primer calendario, que la importación normal omite). Solo es posible **antes de que llegue el primer día del calendario**; después, los días publicados no se modifican.

- `npm run importar -- --reimportar`: ejecuta la fase A completa en modo reimportación y muestra el plan (como `--simular`), más lo que se borraría (`mensajeReimportacion`, 4.6): "Se regenerarían 7 días (2026-11-01 a 2026-11-07) y se borrarían 35 imágenes antiguas de casos/. Para hacerlo: npm run importar -- --reimportar --confirmar". Termina con código 0 sin escribir nada.
- `npm run importar -- --reimportar --confirmar`: hace la reimportación. Es la confirmación explícita del usuario para borrar imágenes de `casos/` (CLAUDE.md); el agente que la ejecute debe pedir permiso al usuario antes (DECISIÓN PENDIENTE DP-18 sobre la forma de confirmar).
- `--reimportar --confirmar --simular`: `--simular` manda; no escribe nada.

Fase A en modo reimportación (además de los pasos 1 y 2 de 4.4.2; las tres primeras comprobaciones son las de `comprobarReimportacion`, 4.6):
- Debe existir un `data/calendario.json` definitivo (paso 3) con al menos un día; si no existe o no tiene días: "No hay nada que reimportar; usa npm run importar." (código 1).
- Ningún día del calendario actual puede haber llegado: todas sus fechas son posteriores a hoy. Si no: "El día 01 (2026-11-01) ya ha llegado o ha pasado: después del lanzamiento no se reimporta ningún día." (código 1).
- Para cada día `n` del calendario actual existe en `entrada/temas/` su carpeta con ese número; si falta: "Para reimportar falta la carpeta del día 03 en entrada/temas/." Puede haber carpetas nuevas después del último día: se importan a la vez.
- Si el banco no existe, no es un error (se anuncia: "No hay herramientas/banco.json; la reimportación crea uno nuevo."). Si existe, debe ser de la versión 2.
- `planificar` se llama con `ultimoDia: 0`, como si el calendario estuviera vacío, así que todas las carpetas son nuevas y se aplican todas las reglas de 4.4.1 y del paso 5 (también la de que cada fecha sea posterior a hoy). `analizarLote` recibe todas las rutas como nuevas (ninguna omitida).
- dHash: los duplicados se buscan solo entre las imágenes que se reimportan; las entradas del banco anterior no cuentan, porque se sustituyen.

Fase B en modo reimportación, en este orden:
1. Si existe `herramientas/banco.json`, copiarlo byte a byte en `herramientas/banco.anterior.json` (sustituye una copia anterior).
2. Pasos 8 y 9 de 4.4.2 para todos los días: orden nuevo, ids nuevos y claves nuevas. Los ids nuevos son distintos de todos los del banco anterior, del calendario anterior y de `casos/`, así que ninguna imagen nueva sobrescribe una antigua.
3. Escribir un banco nuevo (versión 2) solo con las entradas nuevas (`alta = hoy`, `recorte` según el paso 9) y un calendario nuevo `{version: 2, lanzamiento: "2026-11-01", dias}` con todos los días (comprobado con `validarCalendario`), con el formato del paso 11.
4. Regenerar `creditos.html`.
5. Borrar de `casos/` exactamente los archivos `{id}.webp` cuyo id estaba en el calendario anterior o en el banco anterior. Ningún otro archivo de `casos/` se toca (los huérfanos que hubiera siguen ahí y `validar` avisa de ellos).
6. Informe: el del paso 13 de 4.4.2 más "Reimportados 7 días; borradas 35 imágenes antiguas de casos/. Copia del banco anterior en herramientas/banco.anterior.json."

Qué se conserva: el lanzamiento, los originales de `entrada/temas/` (no se mueven ni se borran), `lote.json` (no se modifica) y la copia del banco anterior. Qué no se conserva: ids, orden de las pruebas, claves y fechas de `alta`. Los temas, números y fechas de los días salen otra vez de las carpetas, así que coinciden con los anteriores si las carpetas no han cambiado.

Si falla antes del punto 3, el banco y el calendario anteriores siguen intactos y las imágenes nuevas ya escritas quedan huérfanas (`validar` avisa). Si falla en el punto 5, el estado nuevo ya es coherente y las imágenes antiguas que queden son huérfanas.

Nota sobre el modo prueba [D-70]: reimportar cambia ids y claves, pero no la forma de elegir el día (`n`, `fecha` y `tema` salen de las carpetas), así que los enlaces `?prueba=1&dia={n}` ya repartidos siguen funcionando.

#### 4.4.5 herramientas/lote.json: recortes manuales [D-65]

Archivo opcional, solo local (en `.gitignore`), que escribe el usuario a mano. No depende de `banco.json` ni lo lee ningún otro script. Es un objeto JSON plano: cada clave es la ruta de un original relativa a `entrada/temas/` (con `/`, igual que el campo `original` del banco) y cada valor, la posición del recorte:

```json
{
  "04-gente-bebiendo/real/kelsey-chance-ZrhtQyGFG6s-unsplash.jpg": "izquierda",
  "06-discoteca/ia/Gemini_Generated_Image_3k9x2m.jpg": "arriba"
}
```

| Valor | Posición de sharp | Uso típico |
|---|---|---|
| `izquierda` | `left` | El motivo está a la izquierda de una foto apaisada. |
| `centro` | `centre` | El recorte centrado de antes. |
| `derecha` | `right` | El motivo está a la derecha. |
| `arriba` | `top` | El motivo está arriba de una foto más alta que 4:5. |
| `abajo` | `bottom` | El motivo está abajo. |

Reglas de `analizarLote` (4.6), aplicadas en la fase A:
- El archivo debe ser un objeto (no `null`, ni array, ni otro tipo); si no, error: "herramientas/lote.json debe ser un objeto JSON con rutas como claves." Un objeto vacío `{}` es válido.
- Cada clave debe coincidir exactamente (mayúsculas incluidas, tras normalizar a NFC las dos partes) con la ruta de una imagen listada en `entrada/temas/`. Si no, error: `lote.json: no existe la imagen "{clave}" en entrada/temas/ (usa la ruta relativa con /, por ejemplo "04-gente-bebiendo/real/foto.jpg").` Una ruta con `\` o con `entrada/temas/` delante no coincide y da este error.
- Cada valor debe ser exactamente una de las cadenas `izquierda`, `centro`, `derecha`, `arriba` o `abajo` (en minúsculas). Si no, error: `lote.json: el recorte {JSON.stringify(valor)} de "{clave}" no es válido; usa izquierda, centro, derecha, arriba o abajo.` (`'Izquierda'`, `'left'`, `''` o `3` son errores).
- Una clave de una imagen de un día ya importado y omitido no es un error, pero no se aplica: aviso `lote.json: "{clave}" es de un día ya importado; su recorte solo se aplica con --reimportar.`
- Precedencia: si una imagen tiene entrada válida en `lote.json`, se usa esa posición; si no, `sharp.strategy.attention`. No hay otra fuente de recortes.
- `lote.json` no se modifica al importar ni se borra al terminar: sigue sirviendo para una reimportación posterior.

### 4.5 creditos.html y herramientas/creditos.mjs [D-39, D-40, D-58; sustituye a CREDITOS.md]

`herramientas/creditos.mjs` es un módulo sin dependencias que importa `../js/textos.js`. Es la única fuente de la lista de tipografías de `creditos.html` y de la lista de archivos de licencia que comprueba `validar.mjs`. Exporta:

| Exportación | Tipo | Descripción |
|---|---|---|
| `TIPOGRAFIAS` | constante | `[{familia: 'Oswald', licencia: 'SIL Open Font License 1.1', archivo: 'fonts/OFL-oswald.txt'}, {familia: 'Special Elite', licencia: 'Apache License 2.0', archivo: 'fonts/LICENSE-special-elite.txt'}]` [D-40]. Debe coincidir con la tabla de licencias de 2.5. |
| `escaparHtml(texto)` | pura | Sustituye `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;` y `'` → `&#39;` (en ese orden, `&` primero). Convierte a cadena lo que no lo sea. |
| `parejasCreditos(banco)` | pura | Devuelve las parejas `{fuente, licencia}` distintas de **todas** las imágenes del banco (todas están publicadas en `casos/`), sin espacios sobrantes y ordenadas con `localeCompare(…, 'es')` por fuente y luego por licencia. No devuelve ids, tipos, temas, días, fechas, recortes ni recuentos. |
| `generarCreditosHtml({textos, tipografias, parejas})` | pura | Devuelve el HTML completo de 2.7 como cadena, con un `li` de tipografía por elemento de `tipografias`, en su orden. Escapa con `escaparHtml` **todos** los valores insertados: textos, familias, licencias, fuentes y rutas. Si se llama dos veces con los mismos datos, devuelve el mismo resultado. |
| `escribirCreditos({banco, ruta = 'creditos.html'})` | efecto | Escribe el archivo en UTF-8 con saltos LF, usando `TIPOGRAFIAS`. Lo usan `importar.mjs` y el script `npm run creditos`. |

Fuentes y licencias de las imágenes [D-58]. Son los únicos valores posibles de `fuente` y `licencia` en el banco y salen de la tabla `FUENTES` de `herramientas/temas.mjs` (4.6):

| Tipo | Origen | `fuente` | `licencia` |
|---|---|---|---|
| generada | Creación propia con Gemini | `Creación propia (Gemini)` | `Términos de uso de Gemini` |
| generada | Creación propia con ChatGPT | `Creación propia (ChatGPT)` | `Términos de uso de OpenAI` |
| autentica | Unsplash | `Unsplash` | `Licencia de Unsplash` |
| autentica | Pexels | `Pexels` | `Licencia de Pexels` |

- No se acredita a cada fotógrafo por su nombre: las licencias de Unsplash y Pexels no lo exigen, y una lista de autores no debe relacionarse con imágenes concretas (DECISIÓN PENDIENTE DP-15).
- `creditos.html` solo muestra las parejas que aparecen en el banco: si nunca se usa ChatGPT o Pexels, no salen.

Formato de cada línea de imágenes: `{fuente} · {licencia}`, con `·` (U+00B7) entre espacios normales. Ejemplo de la lista generada con el banco de 4.1:

```html
<ul id="creditos-lista">
  <li>Creación propia (Gemini) · Términos de uso de Gemini</li>
  <li>Unsplash · Licencia de Unsplash</li>
</ul>
```

Página inicial provisional (tarea 1): el archivero la escribe a mano con la estructura de 2.7, sin imágenes, con los textos por defecto de 3.1 y con las dos líneas de tipografías exactamente como en el ejemplo de 2.7 (Special Elite con Apache License 2.0 y `fonts/LICENSE-special-elite.txt`). Sirve para que el enlace de la portada nunca dé 404. En la tarea 13 se sustituye por la versión generada con `npm run creditos`.

### 4.6 herramientas/temas.mjs (archivero): funciones puras del importador [D-56]

Módulo sin dependencias (ni `sharp`, ni `fs`, ni `crypto`): todo lo que necesita lo recibe por parámetro, para probarlo con `node --test`. Lo importan `importar.mjs` y `validar.mjs`.

| Exportación | Tipo | Parámetros → retorno | Descripción |
|---|---|---|---|
| `PALABRAS_PROHIBIDAS` | constante | | `['real', 'ia', 'ai', 'fake']`. |
| `contienePalabraProhibida(texto, excepciones = ['identifAI-it'])` | pura | `string` → `string \| null` | Quita del texto las excepciones literales, lo trocea por `/[^\p{L}\p{N}]+/u` y por los cambios de minúscula a mayúscula, y devuelve la primera palabra prohibida encontrada (en minúsculas), comparando sin distinguir mayúsculas, o `null`. |
| `analizarCarpeta(nombre)` | pura | `'05-mesa-con-comida'` → `{n: 5, tema: 'Mesa con comida'}` | Normaliza a NFC y aplica el patrón de 4.4.1. `n = parseInt(NN, 10)`, que debe ser ≥ 1. Lanza `Error` con un mensaje en español que incluye el nombre si no cumple el patrón. |
| `temaDeCarpeta(nombre)` | pura | → `string` | `analizarCarpeta(nombre).tema`: quita `NN-`, cambia los guiones por espacios y pone en mayúscula **solo** la primera letra (`toLocaleUpperCase('es')`), sin tocar el resto. |
| `FUENTES` | constante | | Lista de `{tipo, patron, fuente, licencia}` con la tabla de 4.5. Patrones (sobre el nombre del archivo, sin distinguir mayúsculas): Gemini `^gemini[_ -]`; ChatGPT `^chatgpt[_ -]`; Unsplash `-unsplash\.[a-z]+$`; Pexels `^pexels-`. |
| `fuenteDeArchivo(nombre, tipo)` | pura | `('ray-…-unsplash.jpg', 'autentica')` → `{fuente: 'Unsplash', licencia: 'Licencia de Unsplash'}` | Busca el primer patrón de `FUENTES` que encaja. Lanza `Error` si ninguno encaja ("No sé de dónde viene 02-perros/real/foto.jpg: renómbrala para que empiece por gemini-, chatgpt- o pexels-, o termine en -unsplash") o si la fuente es de otro tipo. |
| `planificar({carpetas, ultimoDia, hoyISO, lanzamiento})` | pura | → `{nuevos, omitidos, errores, avisos}` | `carpetas`: `[{nombre, subcarpetas: string[], sueltos: string[], ia: string[], real: string[]}]` (nombres de archivo ya filtrados de ocultos). Aplica las reglas de los pasos 5 de 4.4.2 salvo las que necesitan el banco o `sharp`. `nuevos`: `[{n, fecha, tema, carpeta, imagenes: [{ruta, tipo, fuente, licencia}]}]` ordenados por `n`; `omitidos`: números de día; `errores` y `avisos`: arrays de cadenas en español. Nunca lanza: los errores de `analizarCarpeta` y `fuenteDeArchivo` van a `errores`. Necesita `sumarDias` y `diasEntre`, que recibe como parámetros opcionales (`{sumarDias, diasEntre}`) o reimplementa con `Date.UTC`. En modo reimportación se llama con `ultimoDia: 0` (4.4.4). |
| `POSICIONES_RECORTE` | constante | | `{izquierda: 'left', centro: 'centre', derecha: 'right', arriba: 'top', abajo: 'bottom'}` [D-65]. Son los únicos valores válidos de `lote.json`; `importar.mjs` traduce con ella al valor de `position` de sharp. No incluye `atencion`, que no se puede pedir en `lote.json` (es el valor por defecto). |
| `analizarLote(lote, rutasNuevas, rutasOmitidas = [])` | pura | `unknown, string[], string[]` → `{recortes, errores, avisos}` | [D-65] `lote` es el valor ya parseado de `lote.json`, o `null`/`undefined` si el archivo no existe (entonces devuelve `{recortes: {}, errores: [], avisos: []}`). `rutasNuevas` y `rutasOmitidas` son rutas relativas a `entrada/temas/` con `/` de las imágenes de los días que se van a importar y de los omitidos. Aplica las reglas de 4.4.5 con sus mensajes exactos y normaliza a NFC claves y rutas antes de comparar. `recortes` es un objeto `{ruta: valor}` (valor en español, por ejemplo `'izquierda'`) solo con las entradas válidas de `rutasNuevas`. Nunca lanza ni muta sus argumentos. |
| `analizarArgumentos(argv)` | pura | `string[]` → `{simular, bancoNuevo, reimportar, confirmar, errores}` | [D-65, D-72] `argv` son los argumentos sin `node` ni el script (`process.argv.slice(2)`). Los cuatro booleanos empiezan en `false` y pasan a `true` si aparece `--simular`, `--banco-nuevo`, `--reimportar` o `--confirmar` (comparación exacta, sensible a mayúsculas; repetir uno no es error). `errores` es un array de cadenas, en este orden: por cada argumento que no sea uno de esos cuatro, `` `Argumento desconocido: ${arg}.` `` (en el orden en que aparecen; ese argumento no activa nada); después, si `confirmar && !reimportar`, "--confirmar solo vale junto a --reimportar."; y si `reimportar && bancoNuevo`, "--reimportar y --banco-nuevo no se pueden usar juntos: la reimportación ya crea un banco nuevo.". `--simular` se combina con todo sin error. Nunca lanza ni muta `argv`. |
| `comprobarReimportacion({calendario, nombresCarpetas, hoyISO, diasEntre})` | pura | → `string[]` (errores) | [D-65, D-72] Comprobaciones previas de 4.4.4. `calendario` es el calendario actual (solo usa `dias[].n` y `dias[].fecha`; `null` o sin `dias` cuenta como vacío); `nombresCarpetas`, los nombres de las carpetas de `entrada/temas/`; `diasEntre` es opcional (por defecto, una reimplementación con `Date.UTC`). (1) Sin días, devuelve solo `['No hay nada que reimportar; usa npm run importar.']` y no comprueba más. (2) Si algún día cumple `diasEntre(hoyISO, fecha) < 1`, añade **un único** error con el primero en el orden del calendario: `` `El día ${NN} (${fecha}) ya ha llegado o ha pasado: después del lanzamiento no se reimporta ningún día.` `` (`NN` con dos cifras como mínimo). (3) Obtiene el número de cada carpeta con `analizarCarpeta`, ignorando en silencio las que no cumplen el patrón (de ellas informa `planificar`), y por cada día del calendario sin carpeta con su número añade `` `Para reimportar falta la carpeta del día ${NN} en entrada/temas/.` ``, en el orden del calendario. Las carpetas de números posteriores al último día no son error. Sin errores devuelve `[]`. Nunca lanza. |
| `mensajeReimportacion({dias, borradas})` | pura | `[{fecha, …}], number` → `string` | [D-65, D-72] Texto del plan de `--reimportar` sin `--confirmar`. Con `dias` vacío devuelve `''`. Si no, exactamente `` `Se regenerarían ${dias.length} días (${dias[0].fecha} a ${dias[dias.length - 1].fecha}) y se borrarían ${borradas} imágenes antiguas de casos/. Para hacerlo: npm run importar -- --reimportar --confirmar` `` (siempre "días" e "imágenes" en plural; usa la primera y la última fecha de la lista tal como vienen, sin ordenar). |
| `analizarPruebasAbiertas(codigo)` | pura | `string` → `true \| false \| null` | [D-71] Busca en el texto de `js/main.js` las líneas que empiezan exactamente por `const PRUEBAS_ABIERTAS = true;` o `const PRUEBAS_ABIERTAS = false;` (expresión `/^const PRUEBAS_ABIERTAS = (true\|false);/gm`, sin espacios delante ni variantes; lo que siga en la línea, como un comentario, se ignora). Si hay exactamente una coincidencia, devuelve su valor como booleano; si hay cero o más de una, `null`. Una línea comentada (`// const PRUEBAS_ABIERTAS = true;`) o con otro formato (`let`, `export const`, `=true`) no cuenta. Nunca lanza. La usa `validar.mjs` (4.4.3). |
| `barajar(lista, aleatorio)` | pura (con `aleatorio` inyectado) | → array nuevo | Fisher-Yates con `aleatorio()` en [0, 1). No muta `lista`. |
| `nuevoId(aleatorio, usados)` | pura (con `aleatorio` inyectado) | `() => number, Set<string>` → `string` | 10 caracteres de `abcdefghijklmnopqrstuvwxyz0123456789` (índice `Math.floor(aleatorio() * 36)`). Repite mientras el id esté en `usados` o contenga como subcadena `ia`, `ai`, `real` o `fake`. |
| `distanciaHamming(a, b)` | pura | dos dHash de 16 hex → `number` | Bits distintos. |
| `UMBRAL_PESO` | constante | | `0.25` [D-60]. |
| `compararPesos(pesosAutenticas, pesosGeneradas)` | pura | `number[], number[]` (bytes) → `{mediaAutentica, mediaGenerada, diferencia, aviso}` o `null` | `null` si alguna lista está vacía. `diferencia = (max(medias) - min(medias)) / min(medias)`; `aviso = diferencia > UMBRAL_PESO`. |
| `avisosMezcla(generadasPorDia)` | pura | `number[]` (generadas de cada día, en orden) → `string[]` | [D-61, D-67] Con `total = días × 5` y `gen` = suma de generadas, el resultado tiene, en este orden: (1) como mucho un aviso de porcentaje: si `gen / total > 0.6`, `` `AVISO: ${p} % de las pruebas son generadas (${gen} de ${total}); más del 60 % de un mismo tipo.` `` con `p = Math.round(gen / total * 100)`; si no, y si `1 - gen / total > 0.6`, el mismo texto con "auténticas", `total - gen` y `p = Math.round((1 - gen / total) * 100)`; (2) un aviso por cada racha máxima de 3 o más días seguidos con el mismo número de generadas, en orden de aparición: `` `AVISO: ${largo} días seguidos (del ${desde} al ${hasta}) con ${k} generadas cada uno; el reparto se vuelve predecible.` `` (días numerados desde 1). Con una lista vacía devuelve `[]`. Los valores 0 y 5 no se avisan aquí: son errores que detectan `planificar` y `validar.mjs`. |

---

## 5. Algoritmo diario

1. `hoy = fechaLocal(new Date())`: medianoche local, como pide CLAUDE.md. En previsualización local, `hoy` es la fecha de `fechaPrevisualizada` (3.2, 3.7 punto 11) [D-68]; en modo prueba, la `fecha` del día que devuelve `diaDePrueba` (3.7 punto 12) [D-70]; en el juego publicado sin `?prueba=1` (o con `PRUEBAS_ABIERTAS = false`), siempre `fechaLocal(new Date())`.
2. `n = numeroCaso(hoy, calendario.lanzamiento) = diasEntre(lanzamiento, hoy) + 1`. Con el lanzamiento el 2026-11-01, ese día es el caso 1; el 2026-11-02, el 2; y el 2027-03-28 (día del cambio de hora), el 148.
3. `caso = casoDelDia(calendario, hoy)`: busca `dias[n - 1]`, comprueba que `n` y `fecha` coinciden y devuelve también su `tema`.
4. Si `caso === null` (antes del lanzamiento, `n < 1`, o calendario agotado) → pantalla `sin-casos` [D-24]. No se usa una semilla sobre el banco: el banco es privado, cada día tiene un tema elegido por el usuario y reciclar días daría respuestas ya conocidas. `validar.mjs` avisa cuando quedan menos de 7 días para que esto no ocurra [D-62]. En modo prueba, el día elegido siempre existe en el calendario, así que solo se ve `sin-casos` si el calendario no tiene días.
5. El contenido de cada día lo decide el usuario: el tema y las 5 imágenes de la carpeta `entrada/temas/NN-…` del día `n = NN`, con el reparto auténtica/generada que haya puesto (de 1 a 4 generadas) y en el orden fijado al importar [D-52, D-55]. El primer calendario tiene 7 días, del 2026-11-01 (`01-fuegos-artificiales`) al 2026-11-07 (`07-gente-peleando`).
6. Todos los jugadores con la misma fecha local ven el mismo caso, con el mismo tema y en el mismo orden. En zonas horarias distintas, el cambio llega en momentos distintos (como en Wordle).
7. Hay un solo intento por fecha, sea cual sea el modo elegido [D-32].
8. Cambiar la hora del dispositivo permite adelantar días. Se acepta porque no se puede impedir sin servidor [D-18]. La previsualización no abre ninguna vía nueva en el juego publicado: fuera de `localhost`, `127.0.0.1` y `[::1]` el parámetro `?fecha=` se ignora, y en local solo muestra lo que ya está en el `data/calendario.json` público [D-22, D-68]. El modo prueba **sí** abre una vía en el juego publicado mientras `PRUEBAS_ABIERTAS` sea `true`: con `?prueba=1` cualquiera juega cualquier día del calendario y ve sus respuestas en `resultado`. Es un riesgo aceptado por el usuario hasta el lanzamiento y se cierra con la tarea 44 [D-70, D-71].

---

## 6. Almacenamiento

Una sola clave versionada: **`identifaiit.v1`**. Su valor es un JSON como este:

```json
{
  "version": 1,
  "ajustes": { "modo": "dificil", "vistoComoJugar": true },
  "partidas": {
    "2026-11-01": { "n": 1, "modo": "medio",   "estado": "terminada", "resultados": "AAFTA", "aciertos": 3, "sesion": "x8f2k1q9" },
    "2026-11-02": { "n": 2, "modo": "dificil", "estado": "en_curso",  "resultados": "AF---", "aciertos": 1, "sesion": "b7d0s3m2" }
  },
  "racha": 2,
  "mejorRacha": 5
}
```

- `partidas` va **por fecha ISO**: una partida por día, sea cual sea el modo. Cada una guarda el número de caso, el modo jugado, el estado (`en_curso` o `terminada`), los códigos por prueba, los aciertos y la sesión (que identifica la pestaña). Nunca se guarda la verdad ni el voto. Tampoco el tema, que está en el calendario [D-54].
- `racha` y `mejorRacha` se recalculan en `registrarFin`. La racha que muestra la portada se recalcula con `calcularRacha` para que caduque si el jugador falta un día.
- La clave de prueba de disponibilidad es `identifaiit.prueba` (se escribe y se borra al arrancar).
- Versiones futuras: se usará una clave nueva, `identifaiit.v2`. Al arrancar, si no existe esa clave pero sí la `v1`, se migran los datos y se borra la antigua. En v1 no hay migraciones. La versión 2 de `data/calendario.json` no obliga a cambiar la del almacén.
- Si localStorage no está disponible (modo privado, bloqueado o cuota llena), ninguna función lanza: el juego funciona con datos en memoria y se muestra `#aviso-almacen`. En ese caso no se puede garantizar el intento único entre recargas.
- No se usan cookies ni IndexedDB. sessionStorage solo como copia de respaldo cuando localStorage falla [D-51].
- **Previsualización local** [D-68]: no se lee ni se escribe nada en localStorage ni en sessionStorage (ni `identifaiit.v1` ni `identifaiit.prueba`). Se usan dos almacenes de `crearAlmacenMemoria()` con el mismo formato, que parten vacíos y desaparecen al recargar. Así, previsualizar un día no gasta el intento real de ese día, no altera la racha ni los ajustes y se puede repetir tantas veces como se quiera.
- **Modo prueba** [D-70]: exactamente igual que la previsualización. Un amigo que pruebe el juego en GitHub Pages con `?prueba=1` no deja nada guardado, así que, cuando el día llegue, podrá jugarlo de verdad sin el parámetro (aunque ya conozca sus respuestas). El día elegido no se guarda en ningún almacén: vive en la URL (`?dia=n`).

---

## 7. Compartir [D-30]

Plantilla exacta de `TEXTOS.compartir.plantilla`, como literal de JS:

```js
plantilla: 'identifAI-it · Caso nº {caso} · {modo}\n{aciertos}/5 {cuadros}\nRacha: {racha}\n{url}'
```

- Son 4 líneas separadas por `\n` (LF, sin `\r`).
- `·` es U+00B7 (punto medio), con un espacio normal a cada lado.
- `º` es U+00BA (indicador ordinal masculino), no el símbolo de grado `°`.
- Marcadores:
  - `{caso}`: `n`, sin ceros a la izquierda.
  - `{modo}`: `TEXTOS.portada.modo_*` del modo jugado ("Fácil", "Medio" o "Difícil").
  - `{aciertos}`: número de 0 a 5.
  - `{cuadros}`: `cuadros(resultados)`, 5 emojis seguidos sin espacios, en el orden de las pruebas.
  - `{racha}`: la racha después de terminar la partida.
  - `{url}`: `urlDelJuego()`.
- No hay espacios ni saltos de línea al final.
- El tema del día **no** forma parte del texto compartido: la plantilla de D-30 no cambia [D-54].
- En previsualización y en modo prueba, Compartir funciona igual; la URL no lleva parámetros y la racha es la del almacén en memoria (normalmente 1) [D-68, D-70].

Ejemplo literal completo: caso 12, modo difícil, resultados `AAFAT`, racha 3 y juego publicado en `https://usuario.github.io/identifAI-it/`. El texto es exactamente este:

```
identifAI-it · Caso nº 12 · Difícil
3/5 🟩🟩🟥🟩⬛
Racha: 3
https://usuario.github.io/identifAI-it/
```

Solo indica acierto o fallo por posición: **no** revela qué pruebas eran IA. Tiempo agotado y pestaña oculta usan el mismo cuadro (`⬛`) [D-13].

`compartir(texto, nav)`:
1. Si existe `nav.share`: `await nav.share({ text: texto })` → `'compartido'`. Si rechaza con `AbortError` → `'cancelado'` (no se muestra nada). Si rechaza con otro error, se pasa al paso 2.
2. Si existe `nav.clipboard?.writeText`: `await nav.clipboard.writeText(texto)` → `'copiado'`. main.js muestra `TEXTOS.compartir.copiado` durante 2 s en `#compartir-aviso`.
3. Si no hay portapapeles o falla → `'manual'`. main.js muestra `#compartir-manual` con el texto y lo selecciona.

---

## 8. Criterios de aceptación

### 8.1 diario.js
1. `fechaLocal(new Date(2026, 10, 1, 23, 59, 59))` → `'2026-11-01'`; `fechaLocal(new Date(2026, 10, 2, 0, 0, 0))` → `'2026-11-02'`.
2. `numeroCaso('2026-11-01', '2026-11-01')` → 1; `('2026-11-02', …)` → 2; `('2026-10-31', …)` → 0; `('2027-03-28', '2026-11-01')` → 148.
3. `sumarDias('2026-12-31', 1)` → `'2027-01-01'`; `sumarDias('2027-03-27', 2)` → `'2027-03-29'`.
4. `msHastaMedianoche(new Date(2026, 10, 1, 23, 59, 0))` → 60000.
5. `formatearCuentaAtras(3_661_000)` → `'01:01:01'`; `formatearCuentaAtras(-5)` → `'00:00:00'`.
6. `ofuscar([0,1,1,0,1], 1, () => 0)` → `'Mpb9Ycc='`; `desofuscar('Mpb9Ycc=', 1, i)` → `0,1,1,0,1`.
7. Con 200 combinaciones aleatorias de verdades y `n` entre 1 y 1000, `desofuscar(ofuscar(v, n), n, i) === v[i]`.
8. `casoDelDia` devuelve `null` antes del lanzamiento, en un día posterior al último y si la `fecha` del día no coincide. Con el calendario de ejemplo de 4.2, `casoDelDia(cal, '2026-11-02')` devuelve exactamente `{n: 2, fecha: '2026-11-02', tema: 'Perros', pruebas: [...], clave: 'Ax7Pq1E='}`.
9. `validarCalendario` acepta el ejemplo de 4.2 y rechaza: menos o más de 5 pruebas, `n` con huecos, una clave que no decodifica a 5 bytes, campos extra, `version: 1`, un día sin `tema`, y un `tema` vacío, de 31 caracteres, con espacios al principio o al final, con salto de línea, con `{` o `}`, o que empieza en minúscula (`'perros'`). `temaValido('Mesa con comida')` → `true`.
10. `precargar` rechaza la promesa si una imagen falla. Con 5 correctas, resuelve con 5 imágenes cuyo `decode()` ha terminado, sin tocar el DOM.

### 8.2 juego.js
11. `transicion` no muta el estado recibido (test con `Object.freeze` profundo).
12. `EMPEZAR` con `vistoComoJugar: false` lleva a `como-jugar`, y después `ENTENDIDO` lleva a `cargando`. Con `vistoComoJugar: true`, `EMPEZAR` lleva directamente a `cargando`.
13. `VOTO` con `activo: false` devuelve el mismo objeto de estado.
14. `VOTO` correcto → código `A`; incorrecto → `F`; `AGOTADO` → `T`; `OCULTA` en `caso/pregunta` → `O`. En todos los casos queda `fase: 'veredicto'` y `revelada` = verdad.
15. Un segundo `VOTO` o un `AGOTADO` en fase `veredicto` no cambia el estado.
16. `SIGUIENTE` en la prueba 5 lleva a `resultado`; en las demás, a la siguiente prueba con `revelada: null`.
17. `CARGADO` con una partida de hoy `terminada` en cualquier modo lleva a `ya-jugado`, aunque el modo de los ajustes sea otro. Con `caso: null` lleva a `sin-casos` con `tema: null`. Con un caso de tema "Perros", lleva a `portada` con `tema: 'Perros'`, y el tema sigue igual tras `FIN_CUENTA`, cada `VOTO` y cada `SIGUIENTE`. `estadoInicial(...)` tiene `tema: null`.
18. `contarAciertos('AFTOA')` → 2. `mensajeFinal(k, mensajes)` devuelve el mensaje de índice k para k de 0 a 5, y `mensajeFinal(6, …)` lanza un error.
19. `OCULTA` en `cuenta-atras`, `veredicto`, `resultado` o `portada` no cambia los resultados.

### 8.3 temporizador.js
20. Con reloj y frames simulados cada 16,7 ms y `duracionMs: 1000`, `alAgotar` se llama una sola vez, en el primer frame con transcurrido ≥ 1000 (entre 1000 y 1017 ms).
21. Tras `detener()`, `alAgotar` no se llama nunca, aunque sigan llegando frames.
22. `fraccionRestante(1500, 3000)` → 0,5; `(4000, 3000)` → 0; `nivelTemporizador(0.3)` → `'critico'`; `(0.31)` → `'normal'`; `segundosRestantes(2001)` → 3.
23. El módulo no contiene `setInterval` ni `setTimeout`.
24. En navegador, modo difícil: el veredicto `tiempo` se muestra entre 1000 y 1050 ms después del frame en que se pinta la imagen (medido con `performance.now()` en `PINTADA` y en `AGOTADO`). En fácil, entre 7000 y 7050 ms; en medio, entre 3000 y 3050 ms.
25. Ningún voto (clic o tecla) hecho antes de `PINTADA` cuenta.

### 8.4 almacen.js
26. Con un almacén falso que lanza en `setItem`/`getItem`, `leer` devuelve `{datos: datosIniciales(), disponible: false}` y `guardar` devuelve `false`, sin lanzar.
27. Un JSON corrupto o `version: 2` en `identifaiit.v1` → datos iniciales.
28. `registrarInicio` sobre una fecha que ya tiene partida, aunque sea en otro modo, no la modifica.
29. `cerrarAbandonada` convierte `'AF---'` en `'AFOOO'`, con estado `terminada` y 1 acierto.
30. `calcularRacha`:
    - Terminadas el 01, el 02 y el 03, con hoy = 03 → 3.
    - Hoy = 04 sin jugar → 3.
    - Hoy = 05 → 0.
    - Terminadas el 01 y el 03, con hoy = 03 → 1.
    - Una partida `en_curso` no cuenta.
31. `mejorRacha` nunca disminuye.
32. Ningún dato guardado contiene la verdad ni el voto de una prueba.

### 8.5 compartir.js
33. `cuadros('AAFAT')` → `'🟩🟩🟥🟩⬛'`; `cuadros('AOFAT')` → `'🟩⬛🟥🟩⬛'`.
34. `textoCompartir` con la plantilla de la sección 7, `n: 12`, `nombreModo: 'Difícil'`, `resultados: 'AAFAT'`, `racha: 3` y `url: 'https://usuario.github.io/identifAI-it/'` es estrictamente igual (`===`) al ejemplo literal de la sección 7.
35. El texto compartido no contiene "IA" como palabra suelta, ni "REAL", "autentica", "generada", ids de imagen ni el tema del día. La única excepción es el nombre "identifAI-it".
36. `compartir` devuelve `'compartido'` si `share` resuelve; `'cancelado'` si rechaza con `AbortError`; `'copiado'` si no hay `share` pero sí portapapeles; y `'manual'` si no hay ninguno de los dos. Nunca lanza.
37. `urlDelJuego({origin: 'https://u.github.io', pathname: '/identifAI-it/index.html'})` → `'https://u.github.io/identifAI-it/'`. Con `search: '?prueba=1&dia=3'` en el objeto, el resultado es el mismo [D-70].

### 8.6 textos.js
38. Están todas las claves de 3.1, incluidos `portada.enlace_creditos === 'Créditos'`, `portada.tema` y `partida.caso_del_dia` (cada una con exactamente un marcador, `{tema}`, y ninguno más; por defecto, `'Caso del día: {tema}'`) [D-54], `avisos.previsualizacion` [D-68] y el grupo `creditos` completo (con `volver === 'Volver a la portada'`). `final.mensajes.length === 6` y `como_jugar.pasos.length === 4`. `final.estado_prueba === 'Prueba {i}: {estado}'` y `final.estados` es exactamente `{ acierto: 'acierto', fallo: 'fallo', tiempo: 'tiempo agotado', oculta: 'pestaña oculta' }` (las mismas cuatro claves que devuelve `estadoDeCodigo`, ni una más). `veredictos.acierto` y `veredictos.fallo` tienen 4 o más variantes, `tiempo` 3 o más y `oculta` 2 o más. No existe `portada.nueva_pestana`. El grupo `avisos` tiene exactamente las claves `sin_guardar`, `otra_pestana` y `previsualizacion`. El grupo `prueba` tiene exactamente las claves `etiqueta`, `opcion` y `boton`, con `opcion === 'Día {n}: {tema}'` [D-70].
39. Ninguna cadena (salvo `como_jugar.pasos`) supera los 90 caracteres. `rellenar(portada.tema, {tema: 'x'.repeat(30)})` y lo mismo con `partida.caso_del_dia` no superan los 50. `rellenar(avisos.previsualizacion, {fecha: '2026-11-03'})` no supera los 90 (con el valor por defecto mide 51). `rellenar(prueba.opcion, {n: 99, tema: 'x'.repeat(30)})` no supera los 50, y `contienePalabraProhibida` devuelve `null` para `prueba.etiqueta`, `prueba.opcion` y `prueba.boton`.
40. `compartir.plantilla` es exactamente igual a la cadena de la sección 7.

### 8.7 index.html, CSS y fuentes
41. Existen todos los ids y atributos de la sección 2, y ningún id ni clase contiene palabras prohibidas (por palabra completa, según 0.1). En particular: `#caso-escena` envuelve `#prueba-marco` y `#veredicto`; `#caso-cabecera` contiene, en orden, `#caso-tema`, `#caso-etiqueta` y `#caso-marcador`; `#portada-tema` va justo después de `#portada-caso`; los botones de voto llevan `data-texto` en un `span.boton-texto` junto a su `<kbd>`; el `label[for="compartir-manual"]` es el hermano inmediato siguiente del `textarea`; `#resultado-cuadros` tiene `role="img"`; todo elemento con `data-foco` que no sea un control lleva `tabindex="-1"`; y `#aviso-previsualizacion` existe dentro de `#app`, fuera de las secciones, justo después de `#aviso-almacen`, vacío, con `hidden`, con `role="status"` y sin `data-texto` [D-68]. `index.html` **no** contiene `#selector-prueba`, `#selector-prueba-dia` ni `data-accion="abrir-prueba"`: los crea main.js [D-70].
42. En todo momento hay como mucho una sección `.pantalla` sin `hidden`. Antes de que cargue el JS no hay ninguna, y sin JS se ve el `<noscript>`.
43. A 360 x 640 px, en la pantalla `caso`, no hay scroll horizontal y la imagen y los dos botones se ven sin desplazar, con `#caso-tema` rellenado con un tema de 30 caracteres (en una sola línea, recortado con puntos suspensivos si no cabe).
44. El texto y los botones cumplen el contraste AA (4,5:1 para texto normal; 3:1 para texto grande e iconos), y todos los controles tienen foco visible.
45. Con `prefers-reduced-motion: reduce` no hay animación del sello ni sacudidas.
46. Todas las rutas (`css/`, `js/`, `fonts/`, `img/ui/`, `data/`, `casos/`, `creditos.html` e `index.html`) son relativas, y el sitio funciona servido bajo `/identifAI-it/`.
47. Antes de responder, el DOM no contiene la verdad: `#veredicto-sello` está vacío, `#veredicto` no tiene `data-estado`, y ningún atributo, `alt`, clase ni ruta de la imagen cambia según la verdad. `#resultado-revision` está vacío hasta entrar en `resultado`; entonces cada `li` tiene el marcado de 2.3, con `alt="Prueba N"`, el icono puesto solo por CSS (`li::after`) y ninguna clase ni atributo que dependa de la verdad (solo `data-estado`, que indica el resultado del jugador).
48. En la pestaña Red, al cargar el juego, jugar una partida completa y abrir los créditos, **todas** las peticiones van al mismo origen; ninguna va a `fonts.googleapis.com`, `fonts.gstatic.com` ni a otro dominio. `index.html`, `creditos.html`, `css/` y `js/` no contienen `http://`, `https://` ni `//` como URL de recurso.
49. `index.html` lleva la CSP de 2.4, y la consola no muestra violaciones de CSP durante una partida completa.
50. Las dos fuentes se cargan desde `fonts/` (aparecen en Red con estado 200). Si se borran los woff2, el juego sigue siendo legible con las fuentes del sistema de respaldo.
51. Existen `fonts/OFL-oswald.txt`, con el texto completo de la SIL OFL 1.1 y el aviso de copyright de Oswald, y `fonts/LICENSE-special-elite.txt`, con el texto completo de la Apache License 2.0 [D-40]. No existe `fonts/OFL-special-elite.txt`.
52. La portada tiene `a#portada-creditos` dentro de `footer#portada-pie`:
    - con `href="creditos.html"` exacto, sin `/` inicial, y sin `target` ni `rel`;
    - con el texto visible de `TEXTOS.portada.enlace_creditos`;
    - sin palabras prohibidas en sus ids ni en su ruta;
    - con un área táctil de al menos 44 x 44 px, contraste de 4,5:1 o más, subrayado y foco visible;
    - accesible con Tab después de los botones de la portada.
53. `creditos.html` existe en la raíz desde la tarea 1. Con `npx serve` y en GitHub Pages, el enlace abre en la misma pestaña con estado 200, nunca 404. Al volver con el botón Atrás o con "Volver a la portada", el juego arranca con normalidad y el intento del día sigue intacto.

### 8.8 main.js (pruebas manuales con `npx serve`)
54. Se puede jugar una partida completa en cada modo con ratón, con teclado (R, I, Enter) y en un móvil de 360 px.
55. Recargar durante la prueba 3 lleva a `ya-jugado`, con las pruebas 3 a 5 contadas como `O`.
56. Recargar en `portada`, `como-jugar` o `cargando` permite jugar con normalidad, porque el intento no se ha consumido.
57. Tras terminar en modo fácil, recargar (o elegir otro modo, si se llegara a la portada) lleva a `ya-jugado`. No hay forma de volver a jugar ese día en ningún modo.
58. Cambiar a otra pestaña durante una prueba hace que, al volver, se vea el veredicto `oculta`, que cuenta como fallo.
59. Abrir una segunda pestaña después de terminar lleva a `ya-jugado`. Si se empieza en dos pestañas a la vez, la segunda que llegue a `FIN_CUENTA` pasa a `ya-jugado`.
60. Con localStorage bloqueado, el juego se puede jugar entero, aparece `#aviso-almacen` y no hay errores en la consola.
61. Con una imagen inexistente en el calendario se llega a la pantalla `error`. Reintentar vuelve a intentar la precarga, y el intento no se consume.
62. Con la fecha del sistema fuera del calendario se ve `sin-casos`.
63. En `ya-jugado`, cuando la cuenta atrás llega a 0, se pasa a la `portada` del día siguiente sin recargar, con el tema del día nuevo.
64. En la pestaña Red, las 5 imágenes se piden antes de la cuenta atrás y ninguna petición contiene la verdad.
65. En un móvil, Compartir abre la hoja de compartir. En escritorio sin `share`, copia el texto y muestra el aviso.

### 8.9 Herramientas (archivero)
66. `npm run validar` falla en cualquiera de estos casos:
    - Una imagen del calendario no existe, no es WebP de 1080 x 1350 o tiene EXIF, XMP, ICC o C2PA.
    - Algún nombre, ruta o campo publicado contiene una palabra prohibida, o algún `tema` la contiene por palabra completa.
    - El calendario no es la versión 2, `validarCalendario` falla, un día tiene 0 o 5 generadas, `fecha` y `n` no cuadran o un id se repite.
    - `herramientas/banco.json`, `herramientas/banco.anterior.json` o `herramientas/lote.json` están rastreados por git o faltan en `.gitignore`, o hay algún archivo de `entrada/` rastreado [D-65].
    - Hay URL externas.
    - Faltan `.nojekyll` o `creditos.html`, o un `href`/`src` relativo de `index.html` o `creditos.html` apunta a un archivo inexistente.
    - Existe `docs/muestras.html` [D-73].
    - `js/main.js` no declara exactamente una vez `PRUEBAS_ABIERTAS`, o la declara con `true` y se ha pasado `--estricto` o hoy es el 2026-11-01 o posterior [D-71].
    - Falta (o está vacío) un woff2 referenciado o alguno de los archivos de licencia de `TIPOGRAFIAS` (`fonts/OFL-oswald.txt`, `fonts/LICENSE-special-elite.txt`).
    - `creditos.html` no cumple 2.7 o contiene un id de imagen.
    - Si hay banco, además: un id del calendario no está en el banco o su `dia`, `fecha` o `tema` no coinciden; un día del banco no tiene exactamente 5 imágenes; un tipo del banco no coincide con la clave; una fuente o licencia no está en `FUENTES` o no corresponde a su tipo; hay duplicados por dHash; `creditos.html` no coincide con lo que generaría `creditos.mjs`; o una entrada tiene un `recorte` que no es `atencion` ni una clave de `POSICIONES_RECORTE` [D-65].
    - Ya no falla por categorías: esa regla no existe [D-52].
67. En un clon limpio del repositorio (sin `banco.json`), `npm run validar` muestra el aviso de banco ausente, ejecuta el resto de comprobaciones y termina con código 0 si pasan. `npm run validar -- --estricto` termina con código 1.
68. `npm run validar` avisa, sin fallar, si quedan menos de 7 días de calendario [D-62]; si hay más de un 60 % de un tipo o 3 o más días seguidos con el mismo número de generadas [D-61]; si la media de peso de un tipo supera a la del otro en más de un 25 % (con el porcentaje, las dos medias y los días afectados) [D-60]; si hay archivos en `casos/` fuera del calendario; con banco, si hay entradas sin `recorte` [D-65]; o, antes del lanzamiento y sin `--estricto`, si `PRUEBAS_ABIERTAS` vale `true` [D-71].
69. `npm run importar` sin `banco.json` y con imágenes en `casos/` (o días en el calendario) se detiene con el mensaje de 4.4 y no modifica nada. Con el `data/calendario.json` provisional de D-46 (`version: 1` o `lanzamiento` distinto de `2026-11-01`) se detiene con el mensaje del paso 3 de 4.4.2 y no modifica nada.
70. Ejecutar `npm run importar` dos veces seguidas con las mismas carpetas: la segunda vez omite todos los días ("ya importado"), no añade ni cambia nada y `casos/`, `banco.json`, `data/calendario.json` y `creditos.html` quedan idénticos byte a byte. Lo mismo ocurre si entre las dos ejecuciones se añade a `lote.json` una entrada de un día ya importado: solo aparece el aviso de 4.4.5.
71. `npm run importar` termina con código 1, muestra todos los errores juntos y no modifica `casos/`, `banco.json`, `data/calendario.json` ni `creditos.html` si: una carpeta de día tiene un número de imágenes distinto de 5 (con un mensaje que nombra la carpeta y el recuento, como el de `06-discoteca` en 4.4.2); un día tiene 0 o 5 en `ia/`; la numeración tiene huecos o repetidos, o no continúa el calendario; una carpeta no cumple el patrón; falta `ia/` o `real/` o hay otros archivos o carpetas; el tema tiene más de 30 caracteres o una palabra prohibida; una imagen no tiene fuente reconocible o está en la subcarpeta del otro tipo; una imagen no se puede decodificar; hay duplicados por dHash; un día nuevo cae hoy o en el pasado; o `lote.json` no es JSON válido, no es un objeto, tiene una clave que no corresponde a ninguna imagen o un valor que no es `izquierda`, `centro`, `derecha`, `arriba` ni `abajo` [D-65].
72. `npm test` pasa con Node 20 en un clon limpio, sin `banco.json`, sin `lote.json`, sin `entrada/` y sin más dependencias que `sharp`.
73. Después de una importación (normal o reimportación), `git status` nunca muestra `herramientas/banco.json`, `herramientas/banco.anterior.json`, `herramientas/lote.json` ni nada de `entrada/`.
74. Después de `npm run importar`, `creditos.html` está regenerado: la lista contiene exactamente las parejas fuente · licencia del banco, ordenadas y sin ids, tipos, temas, días, fechas ni recuentos. `npm run creditos` sin banco y con imágenes en `casos/` termina con código 1 y no toca el archivo.

### 8.10 creditos.html y creditos.mjs
75. `creditos.html` empieza por `<!doctype html>` y tiene `<html lang="es">`, viewport, una CSP idéntica a la de `index.html` y `<title>` igual a `TEXTOS.creditos.titulo_pagina`. Solo carga `css/variables.css`, `css/base.css` y `css/componentes.css` con rutas relativas. No tiene `<script>` ni atributo `style`.
76. Tiene un único `<main id="creditos">`, un `<footer id="creditos-pie">`, un `h1` y un `h2` por sección (con `aria-labelledby`). `a#creditos-volver` tiene `href="index.html"`; al seguirlo, se llega a la portada con estado 200, tanto con `npx serve` como bajo `/identifAI-it/`.
77. `TIPOGRAFIAS` es exactamente la constante de 4.5. La sección de tipografías tiene exactamente estas dos líneas, que coinciden con el ejemplo de 2.7: "Oswald · SIL Open Font License 1.1" con enlace a `fonts/OFL-oswald.txt` y "Special Elite · Apache License 2.0" con enlace a `fonts/LICENSE-special-elite.txt`; ambos archivos existen. Ninguna línea menciona la OFL para Special Elite ni enlaza `fonts/OFL-special-elite.txt` [D-40]. Sin imágenes en el banco, en lugar de la lista aparece `TEXTOS.creditos.sin_imagenes`.
78. `escaparHtml('<b>Fotos & "Co"</b> \'x\'')` → `'&lt;b&gt;Fotos &amp; &quot;Co&quot;&lt;/b&gt; &#39;x&#39;'`. `generarCreditosHtml` con esa fuente produce un `li` sin ninguna etiqueta inyectada.
79. `parejasCreditos` elimina duplicados, ordena con `localeCompare(…, 'es')` y devuelve objetos con solo `fuente` y `licencia`. Con el banco de ejemplo de 4.1, la lista es exactamente la del ejemplo de 4.5 ("Creación propia (Gemini) · Términos de uso de Gemini" y "Unsplash · Licencia de Unsplash", en ese orden).
80. Generar dos veces con el mismo banco produce archivos idénticos byte a byte (UTF-8, LF y un único salto de línea final).
81. Los ids de `creditos.html` (`creditos`, `creditos-tipografias`, `creditos-imagenes`, `creditos-lista`, `creditos-pie`, `creditos-volver`) y su atributo `data-pagina` no contienen palabras prohibidas.
82. A 360 px no hay scroll horizontal. Hay contraste AA, foco visible en los enlaces y área táctil de al menos 44 x 44 px en `#creditos-volver`. Las fuentes cargan desde `fonts/` sin peticiones externas.

### 8.11 Temas por día (versión 1.2) [D-52 a D-61]
83. `temaDeCarpeta('01-fuegos-artificiales')` → `'Fuegos artificiales'`; `('02-perros')` → `'Perros'`; `('05-mesa-con-comida')` → `'Mesa con comida'`; `('08-perros-de-Madrid')` → `'Perros de Madrid'`. `analizarCarpeta('07-gente-peleando')` → `{n: 7, tema: 'Gente peleando'}`. Lanzan un error: `'2-perros'`, `'00-perros'`, `'02_perros'`, `'02-perros-'`, `'02--perros'`, `'02-'` y `'perros'`.
84. `contienePalabraProhibida`: `'Gente peleando'`, `'Fotos reales'`, `'Tiarras'`, `'Aire libre'` e `'identifAI-it'` → `null`; `'Real Madrid'` → `'real'`; `'Arte IA'` → `'ia'`; `'fakeNews'` → `'fake'`; `'Retrato-AI'` → `'ai'`.
85. `fuenteDeArchivo('Gemini_Generated_Image_lwfc7alwfc7alwfc.jpg', 'generada')` → `{fuente: 'Creación propia (Gemini)', licencia: 'Términos de uso de Gemini'}`; `('ChatGPT Image 21 oct 2026.png', 'generada')` → ChatGPT; `('ray-hennessy-gdTxVSAE5sk-unsplash.jpg', 'autentica')` → Unsplash; `('pexels-ana-123.jpg', 'autentica')` → Pexels. Lanzan un error: `('foto.jpg', 'autentica')`, `('x-unsplash.jpg', 'generada')` y `('Gemini_Generated_Image_x.jpg', 'autentica')`.
86. `planificar` con las 7 carpetas `01-fuegos-artificiales` … `07-gente-peleando` (5 imágenes cada una, entre 1 y 4 en `ia`), calendario vacío y `hoyISO: '2026-10-21'` devuelve 7 `nuevos`, con `n` de 1 a 7, fechas de `2026-11-01` a `2026-11-07`, el tema de cada carpeta y 5 imágenes cada uno, sin errores. Con el calendario con 7 días, devuelve `omitidos: [1..7]` y ningún nuevo. Devuelve un error (y nunca lanza) si una carpeta tiene 6 imágenes (el mensaje contiene `06-discoteca` y `6`), si tiene 0 o 5 en `ia`, si falta `real`, si hay huecos (`01`, `03`) o números repetidos, si la primera carpeta nueva no continúa el calendario, si el tema contiene una palabra prohibida, o si un día nuevo es hoy o anterior.
87. `barajar` devuelve una permutación de la lista, no la muta y, con el mismo `aleatorio` simulado, da siempre el mismo orden.
88. `nuevoId`, en 10 000 llamadas con `Math.random`, siempre da 10 caracteres `[a-z0-9]`, nunca contiene `ia`, `ai`, `real` ni `fake` y nunca devuelve un id de `usados`.
89. `compararPesos([100, 100], [130, 130])` → `aviso: true` (diferencia 0,3); `([100], [125])` → `aviso: false` (0,25 no supera el umbral); `([125], [100])` → `aviso: false`; `([], [100])` → `null`.
90. `avisosMezcla` devuelve exactamente (`assert.deepEqual`) estos arrays [D-67]:
    - `avisosMezcla([4, 2, 2, 1, 3, 3, 1])` → `[]` (16 de 35 generadas, un 46 %; ninguna racha de 3).
    - `avisosMezcla([2, 2, 2, 1])` → dos avisos, en este orden (7 de 20 generadas, así que el 65 % son auténticas, y una racha de 3 días con 2):
      ```js
      [
        'AVISO: 65 % de las pruebas son auténticas (13 de 20); más del 60 % de un mismo tipo.',
        'AVISO: 3 días seguidos (del 1 al 3) con 2 generadas cada uno; el reparto se vuelve predecible.'
      ]
      ```
    - `avisosMezcla([4, 4, 3, 4])` → `['AVISO: 75 % de las pruebas son generadas (15 de 20); más del 60 % de un mismo tipo.']` (solo el de porcentaje: la racha de 4 es de 2 días).
    - `avisosMezcla([])` → `[]`.
91. Con `06-discoteca` con 6 imágenes, `npm run importar` termina con código 1, muestra el mensaje de 4.4.2 y no crea ni modifica nada; `npm run importar -- --simular` muestra el mismo error.
92. Con las 7 carpetas correctas, `npm run importar -- --simular` muestra el plan y no escribe nada. Sin `--simular`, crea 35 WebP de 1080 x 1350 sin metadatos en `casos/`, un `data/calendario.json` versión 2 con 7 días (2026-11-01 a 2026-11-07), cada uno con el `tema` de su carpeta y tantas generadas (según `desofuscar`) como archivos tenía su `ia/`, 35 entradas en `banco.json` y `creditos.html` regenerado. `npm run validar` pasa después.
93. Los originales de `entrada/temas/` siguen en su sitio, sin cambios, después de importar.
94. En el juego, `#portada-tema` y `#caso-tema` muestran "Caso del día: {tema}" con el tema del día (por ejemplo, "Caso del día: Perros" el 2026-11-02), igual en las 5 pruebas y en las dos fases. Ningún id, clase, atributo `data-*`, `alt` ni ruta contiene el tema.

### 8.12 Recorte y reimportación [D-65, D-66]
95. `POSICIONES_RECORTE` es exactamente `{izquierda: 'left', centro: 'centre', derecha: 'right', arriba: 'top', abajo: 'bottom'}`.
96. `analizarLote` (tests en `tests/temas.test.mjs`, con rutas inventadas):
    - `analizarLote(null, rutas)` y `analizarLote(undefined, rutas)` → `{recortes: {}, errores: [], avisos: []}`; `analizarLote({}, rutas)` → lo mismo.
    - Con `rutas = ['04-gente-bebiendo/real/a.jpg', '04-gente-bebiendo/ia/b.png']`, `analizarLote({'04-gente-bebiendo/real/a.jpg': 'izquierda'}, rutas)` → `{recortes: {'04-gente-bebiendo/real/a.jpg': 'izquierda'}, errores: [], avisos: []}`. Lo mismo con cada uno de los cinco valores válidos.
    - Una clave que no está en ninguna lista (`'04-gente-bebiendo/real/x.jpg'`, `'04-gente-bebiendo\\real\\a.jpg'`, `'entrada/temas/04-gente-bebiendo/real/a.jpg'` o `'04-gente-bebiendo/REAL/a.jpg'`) da un error que contiene la clave, y esa clave no aparece en `recortes`.
    - Los valores `'Izquierda'`, `'left'`, `'atencion'`, `''`, `3` y `null` dan un error que contiene la clave y la lista "izquierda, centro, derecha, arriba o abajo".
    - `[]`, `'izquierda'`, `3` y `true` como `lote` dan el error "herramientas/lote.json debe ser un objeto JSON con rutas como claves." y `recortes: {}`.
    - Una clave de `rutasOmitidas` da un aviso que contiene la clave y `--reimportar`, ningún error, y no aparece en `recortes`.
    - Una clave en NFD que en NFC coincide con una ruta (por ejemplo, con `ñ` descompuesta) se acepta.
    - Varios errores a la vez se devuelven todos; la función nunca lanza ni muta `lote` ni las listas.
97. Sin `lote.json`, `npm run importar` recorta todas las imágenes nuevas con `sharp.strategy.attention` y todas sus entradas del banco tienen `recorte: 'atencion'`. Con una entrada válida en `lote.json` para una imagen nueva, esa imagen se recorta con la posición de sharp correspondiente (comprobable: con una imagen de prueba apaisada con una mitad negra y otra blanca, `izquierda` y `derecha` dan WebP distintos y cada uno conserva su mitad) y su entrada del banco tiene ese `recorte`; el resto sigue con `atencion`.
98. `npm run importar -- --simular` lista los recortes manuales con su ruta y su valor, y muestra los errores de `lote.json` igual que sin `--simular`.
99. `npm run importar -- --reimportar` (con o sin `--simular`) y `npm run importar -- --reimportar --confirmar --simular` muestran el plan con el número de días que se regenerarían y de imágenes que se borrarían, terminan con código 0 y dejan `casos/`, `banco.json`, `data/calendario.json`, `creditos.html` y `lote.json` idénticos byte a byte.
100. Con los 7 días importados, todas sus fechas posteriores a hoy y las 7 carpetas en `entrada/temas/`, `npm run importar -- --reimportar --confirmar`:
    - deja en `casos/` exactamente 35 WebP del calendario, ninguno con un id del calendario anterior (más los huérfanos que ya hubiera, que no toca);
    - escribe un `data/calendario.json` versión 2 con los mismos 7 días, fechas y temas, y en cada día tantas generadas (según `desofuscar`) como archivos tiene su `ia/`;
    - escribe un `banco.json` con exactamente 35 entradas, todas con `recorte`, y un `banco.anterior.json` idéntico byte a byte al banco anterior;
    - regenera `creditos.html`, no modifica `lote.json` ni nada de `entrada/temas/`;
    - y después `npm run validar` pasa sin el aviso de entradas sin `recorte`.
101. `npm run importar -- --reimportar --confirmar` termina con código 1, muestra el mensaje de 4.4.4 o 4.4.2 y no modifica ningún archivo si: algún día del calendario actual es hoy o anterior; falta la carpeta de algún día del calendario; no hay calendario o no tiene días; se combina con `--banco-nuevo`; o falla cualquier comprobación de la fase A (incluidas las de `lote.json`). `npm run importar -- --confirmar` sin `--reimportar` también termina con código 1 sin escribir nada.
102. `.gitignore` contiene `herramientas/banco.anterior.json` y `herramientas/lote.json`, y `npm run validar` falla si cualquiera de los dos está rastreado por git (criterio 66).
103. Marcas de agua [D-66, D-74]: antes de `--confirmar` (o de la importación normal), el usuario revisa a mano las generadas del plan y ninguna imagen publicada en `casos/` muestra el logo o la marca de Gemini. Es una comprobación manual; no hay test automático. El usuario ha comunicado (2026-10-22) que ha revisado las imágenes actuales; la comprobación se repite tras cada reimportación o cambio de imágenes.

### 8.13 Previsualización local [D-68]
104. `fechaPrevisualizada` (tests en `tests/diario.test.mjs`; no dependen de la fecha actual):
    - `('?fecha=2026-11-03', 'localhost')`, `('?fecha=2026-11-03', '127.0.0.1')` y `('?fecha=2026-11-03', '[::1]')` → `'2026-11-03'`.
    - `('fecha=2026-11-03', 'localhost')` (sin `?`) → `'2026-11-03'`; `('?modo=x&fecha=2026-11-03', 'localhost')` → `'2026-11-03'`; `('?fecha=2026-11-03&fecha=2026-11-04', 'localhost')` → `'2026-11-03'`.
    - `('?fecha=2028-02-29', 'localhost')` → `'2028-02-29'`; `('?fecha=2025-01-01', 'localhost')` (antes del lanzamiento) → `'2025-01-01'`.
    - Devuelven `null` con `hostname` `'usuario.github.io'`, `'192.168.1.10'`, `'0.0.0.0'`, `'::1'`, `'LOCALHOST'`, `'localhost.'`, `'mi-localhost.com'` y `''`, aunque la fecha sea válida.
    - Devuelven `null` en `localhost` con `search` `''`, `'?'`, `'?fecha='`, `'?fecha=2026-02-30'`, `'?fecha=2027-02-29'`, `'?fecha=2026-13-01'`, `'?fecha=2026-00-10'`, `'?fecha=2026-11-3'`, `'?fecha=26-11-03'`, `'?fecha=2026/11/03'`, `'?fecha=2026-11-03x'`, `'?fecha=%202026-11-03'`, `'?fecha=2026-11-03T00:00'` y `'?Fecha=2026-11-03'`.
    - `HOSTS_LOCALES` es exactamente `['localhost', '127.0.0.1', '[::1]']`.
105. `crearAlmacenMemoria` (tests en `tests/almacen.test.mjs`): `leer(crearAlmacenMemoria())` → `{datos: datosIniciales(), disponible: true}`; tras `guardar(d, m)`, `leer(m).datos` es igual a `d`; dos almacenes creados por separado no comparten datos; `getItem` de una clave inexistente devuelve `null`; `setItem('x', 5)` y después `getItem('x')` devuelve `'5'`; tras `removeItem`, `null`. `actualizar(cambio, null, m1, m2)` con dos almacenes en memoria aplica el cambio y devuelve `guardado: true`. Durante todos estos tests, `globalThis.localStorage` y `globalThis.sessionStorage` (simulados con un objeto que lanza al usarse) no se tocan.
106. Con `npx serve` en `http://localhost:3000/?fecha=2026-11-03` (con el calendario definitivo): la portada muestra "Caso nº 3" y el tema del 2026-11-03; `#aviso-previsualizacion` está visible con el texto "Previsualización del 2026-11-03: no se guarda nada."; `#aviso-almacen` sigue oculto; aparece Cómo jugar al pulsar Empezar y el modo marcado es Medio, aunque en el almacén real estén guardados otros ajustes.
107. En esa previsualización se puede jugar el caso completo; al recargar la página se vuelve a la portada y se puede jugar otra vez. Antes y después de jugar, `localStorage` y `sessionStorage` (vistos en las herramientas del navegador) son idénticos: no aparece, no cambia y no desaparece ninguna clave `identifaiit.*`. La partida real de hoy, la racha y los ajustes siguen como estaban.
108. Con una pestaña en previsualización y otra jugando normalmente en `http://localhost:3000/`, ninguna de las dos pasa a `ya-jugado` por la otra, y la normal guarda su partida como siempre.
109. `http://localhost:3000/?fecha=2026-02-30` y `http://localhost:3000/?fecha=hoy` se comportan exactamente igual que `http://localhost:3000/`: sin aviso, con el almacén real y con la fecha local.
110. Con `?fecha=2026-10-01` (antes del lanzamiento) o con una fecha posterior al último día del calendario se ve `sin-casos`, con el aviso de previsualización visible.
111. En GitHub Pages (`https://usuario.github.io/identifAI-it/?fecha=2026-11-05`, sin `?prueba=1`) y con `npx serve` abierto desde otro equipo por la IP de la red local, el parámetro no tiene ningún efecto: el juego usa la fecha local y el almacén real, `#aviso-previsualizacion` queda vacío y oculto, y el intento del día se consume y se respeta como sin el parámetro.
112. En previsualización se cumplen igual los criterios 24, 25 y 47: el temporizador, los votos y el DOM son los de siempre, la verdad no aparece en el DOM antes de responder y la consola no muestra nada. Ningún otro parámetro de URL cambia el comportamiento del juego, salvo `prueba` y `dia` del modo prueba (8.14), que solo actúan con `PRUEBAS_ABIERTAS = true`.
113. En previsualización, dejar la pestaña en `portada` y volver a ella (o hacerlo pasada la medianoche real) no despacha `MEDIANOCHE`: la fecha efectiva sigue siendo la de la URL.

### 8.14 Modo prueba [D-70, D-71]
114. `pruebaActiva` (tests en `tests/diario.test.mjs`; no dependen del host ni de la fecha): `('?prueba=1', true)`, `('prueba=1', true)`, `('?dia=3&prueba=1', true)` y `('?prueba=1&prueba=0', true)` → `true`. → `false`: `('?prueba=1', false)`, `('?prueba=1', 1)`, `('?prueba=1', 'true')`, `('?prueba=1', undefined)`, y con `abiertas: true` los `search` `''`, `'?'`, `'?prueba='`, `'?prueba=0'`, `'?prueba=true'`, `'?prueba=01'`, `'?prueba=%201'`, `'?Prueba=1'` y `'?prueba=0&prueba=1'`.
115. `diasDePrueba` (tests en `tests/diario.test.mjs`): con el calendario de ejemplo de 4.2 devuelve exactamente (`assert.deepStrictEqual`) `[{n: 1, fecha: '2026-11-01', tema: 'Fuegos artificiales'}, {n: 2, fecha: '2026-11-02', tema: 'Perros'}]`; ningún objeto tiene las propiedades `pruebas` ni `clave`; el calendario no se modifica (test con `Object.freeze` profundo); `diasDePrueba(null)`, `(undefined)` y `({})` → `[]`.
116. `diaDePrueba` (tests en `tests/diario.test.mjs`), con `dias` = 7 días del 2026-11-01 al 2026-11-07:
    - `('?prueba=1&dia=3', dias, '2026-10-22')` → el día 3 (el mismo objeto de la lista).
    - `('?prueba=1', dias, '2026-10-22')`, `('?prueba=1&dia=0', …)`, `('?prueba=1&dia=08', …)`, `('?prueba=1&dia=x', …)`, `('?prueba=1&dia=9', …)` y `('?prueba=1&dia=', …)`, con hoy 2026-10-22 → el día 1.
    - `('?prueba=1', dias, '2026-11-04')` → el día 4; `('?prueba=1&dia=2', dias, '2026-11-04')` → el día 2; `('?prueba=1&dia=99', dias, '2026-11-04')` → el día 4.
    - `('?prueba=1&dia=1', [], '2026-10-22')` → `null`.
117. `analizarPruebasAbiertas` (tests en `tests/temas.test.mjs`, con textos de ejemplo, sin leer `js/main.js`): `"import x from './x.js';\nconst PRUEBAS_ABIERTAS = true; // D-71\n"` → `true`; lo mismo con `false` → `false`; `''`, `'const PRUEBAS_ABIERTAS=true;'`, `'  const PRUEBAS_ABIERTAS = true;'`, `'let PRUEBAS_ABIERTAS = true;'`, `'export const PRUEBAS_ABIERTAS = true;'`, `'// const PRUEBAS_ABIERTAS = true;'` y un texto con dos declaraciones válidas → `null`.
118. `npm run validar` (manual, con el calendario definitivo y antes del 2026-11-01): con `const PRUEBAS_ABIERTAS = true;` muestra el aviso de 4.4.3 y termina con código 0 si lo demás pasa; con `npm run validar -- --estricto`, termina con código 1 con el error de 4.4.3; con `const PRUEBAS_ABIERTAS = false;`, ni aviso ni error. Si se borra la declaración o se duplica, falla siempre.
119. Con `PRUEBAS_ABIERTAS = true`, en GitHub Pages (`https://usuario.github.io/identifAI-it/?prueba=1`) y con `npx serve` en `http://localhost:3000/?prueba=1`, antes del lanzamiento:
    - la portada muestra "Caso nº 1", el tema del día 1 y, justo después de `#portada-tema`, `#selector-prueba` con su `label`, un `select#selector-prueba-dia` con 7 opciones "Día 1: {tema}" … "Día 7: {tema}" (la 1 seleccionada) y el botón "Abrir este día";
    - `#aviso-previsualizacion` está visible con "Previsualización del 2026-11-01: no se guarda nada." y `#aviso-almacen` sigue oculto; en un móvil de 360 px el aviso no tapa la imagen ni los botones de voto durante la partida;
    - elegir "Día 5" y pulsar el botón navega a `…/identifAI-it/?prueba=1&dia=5` (misma carpeta), y la portada muestra "Caso nº 5", su tema y el aviso con 2026-11-05; elegir en la lista sin pulsar el botón no navega;
    - se puede jugar el día completo, con el temporizador, los votos y el resultado de siempre; al recargar se vuelve a la portada de ese mismo día y se puede jugar otra vez;
    - antes y después, `localStorage` y `sessionStorage` son idénticos (ninguna clave `identifaiit.*` aparece, cambia ni desaparece), y una pestaña normal sin parámetros no se ve afectada (como en el criterio 108).
120. Anti-trampas en modo prueba: las `option` del selector solo tienen `value` (el número de día) y el texto "Día {n}: {tema}"; ni el selector ni la URL contienen ids de imagen, la clave, la verdad ni el número de generadas de un día. Se cumplen los criterios 24, 25, 47 y 64. El texto compartido tiene la URL sin `?prueba=1` ni `?dia=` y no cambia de formato (criterios 34 y 35). La consola no muestra nada. Los ids `selector-prueba` y `selector-prueba-dia` y la acción `abrir-prueba` no contienen palabras prohibidas.
121. Con `PRUEBAS_ABIERTAS = false`, `…/?prueba=1` y `…/?prueba=1&dia=3` (en GitHub Pages y en `localhost`) se comportan exactamente igual que sin parámetros: no existe `#selector-prueba` en el DOM, `#aviso-previsualizacion` queda vacío y oculto, se usan la fecha local y el almacén real, y el intento del día se consume y se respeta. Se repiten los criterios 54 a 60 sin parámetros y siguen pasando.
122. Convivencia con `?fecha=` [D-68, DP-20]: en `http://localhost:3000/?prueba=1&fecha=2026-11-03` se ve la previsualización del 2026-11-03 **sin** selector (manda `?fecha=`); en `http://localhost:3000/?prueba=1&fecha=2026-02-30` (fecha inválida) se ve el modo prueba con selector. En GitHub Pages, `?prueba=1&fecha=2026-11-03` es el modo prueba normal (día 1 por defecto antes del lanzamiento): `?fecha=` se sigue ignorando fuera de los hosts locales.
123. En modo prueba, volver a la pestaña en `portada` o dejar pasar la medianoche real no despacha `MEDIANOCHE` ni cambia de día: la fecha efectiva es la del día elegido.
124. **Antes del lanzamiento** (tarea 44): `js/main.js` contiene exactamente una línea `const PRUEBAS_ABIERTAS = false;`, `npm test` pasa, `npm run validar -- --estricto` pasa sin el aviso ni el error de `PRUEBAS_ABIERTAS`, se cumple el criterio 121 con `npx serve`, y tras publicar se cumple también en GitHub Pages (abrir `…/identifAI-it/?prueba=1` muestra el juego normal del día, sin selector ni aviso).

### 8.15 Argumentos y reimportación en temas.mjs [D-72]
125. Tests en `tests/temas.test.mjs`:
    - `analizarArgumentos([])` → `{simular: false, bancoNuevo: false, reimportar: false, confirmar: false, errores: []}`; `(['--simular'])` → `simular: true`, sin errores; `(['--reimportar', '--confirmar'])` → los dos `true`, sin errores; `(['--reimportar', '--confirmar', '--simular'])` → los tres `true`, sin errores; `(['--simular', '--simular'])` → sin errores.
    - `analizarArgumentos(['--confirmar'])` → `errores: ['--confirmar solo vale junto a --reimportar.']`; `(['--reimportar', '--banco-nuevo'])` → `errores: ['--reimportar y --banco-nuevo no se pueden usar juntos: la reimportación ya crea un banco nuevo.']`; `(['--x', '--Simular'])` → `errores: ['Argumento desconocido: --x.', 'Argumento desconocido: --Simular.']` y `simular: false`.
    - `comprobarReimportacion({calendario: {dias: []}, nombresCarpetas: [], hoyISO: '2026-10-22'})` y con `calendario: null` → `['No hay nada que reimportar; usa npm run importar.']`.
    - Con un calendario de 3 días (2026-11-01 a 2026-11-03), carpetas `01-a`, `02-b`, `03-c` y `hoyISO: '2026-10-22'` → `[]`; con `hoyISO: '2026-11-01'` → `['El día 01 (2026-11-01) ya ha llegado o ha pasado: después del lanzamiento no se reimporta ningún día.']` (un solo error aunque haya más días pasados, por ejemplo con `hoyISO: '2026-11-02'`); sin la carpeta `02-b` y con una carpeta `mal-nombre` → `['Para reimportar falta la carpeta del día 02 en entrada/temas/.']` (la carpeta mal nombrada no da error aquí); con una carpeta `04-d` de más → `[]`.
    - `mensajeReimportacion({dias: [], borradas: 0})` → `''`; con 7 días del 2026-11-01 al 2026-11-07 y `borradas: 35` → exactamente el texto de 4.4.4.

---

## 9. Plan de tareas

Una tarea = un commit. El orden es el recomendado: ninguna tarea empieza hasta que sus dependencias estén revisadas, y se delegan de una en una.

| # | Tarea | Agente | Depende de | Commit |
|---|---|---|---|---|
| 1 | Crear `package.json` con `"type": "module"`, `engines.node >= 20`, los scripts `test` (`node --test tests/`), `validar`, `importar` y `creditos` (4.4), y `sharp` como `devDependency`. Añadir `herramientas/banco.json` a `.gitignore`. Crear `.nojekyll` vacío y un `creditos.html` inicial provisional, escrito a mano según 2.7 (con Special Elite bajo Apache License 2.0 y el enlace a `fonts/LICENSE-special-elite.txt`), sin imágenes y con los textos por defecto de 3.1, para que el enlace no dé 404 antes del primer lote. | archivero | — | `feat: package.json, scripts, banco privado y créditos iniciales` |
| 2 | Fuentes: descargar Oswald 600 y Special Elite 400 en woff2 (subconjunto latino) de una fuente oficial, sin añadir dependencias. Por ejemplo: `npm pack @fontsource/oswald` y `@fontsource/special-elite` en una carpeta temporal, copiar el `.woff2` latino y el `LICENSE` de cada paquete, y borrar lo temporal. Guardarlas como `fonts/oswald-600.woff2`, `fonts/special-elite-400.woff2`, `fonts/OFL-oswald.txt` (SIL OFL 1.1) y `fonts/LICENSE-special-elite.txt` (Apache License 2.0) [D-40]. Si no hay red, pedir los archivos al usuario. Estado a 2026-10-19: los cuatro archivos ya están en `fonts/`, pendientes de commit; no se tocan. | archivero | 1 | `feat: fuentes locales con sus licencias` |
| 3 | Escribir `js/textos.js` con todas las claves de 3.1, incluidos `portada.enlace_creditos`, `final.estado_prueba`, `final.estados` y el grupo `creditos`, y con la plantilla exacta de la sección 7. Mostrar al usuario los 6 mensajes finales y los textos de créditos para que los apruebe. | cronista | — | `feat: textos del juego` |
| 4 | `css/variables.css` (tokens, incluidos los de fuente de 2.5) y `css/base.css` (`@font-face` de 2.5, reset, tipografía, layout móvil primero) | perito-visual | 2 | `estilo: tokens, fuentes y base` |
| 5 | Nuevo `index.html` con la cabecera de 2.4 (CSP, sin enlaces externos), `body[data-pagina="juego"]`, todas las secciones y los ganchos de la sección 2, incluidos el pie `#portada-pie` con `#portada-creditos` (`href="creditos.html"`), `#caso-escena`, `span.boton-texto` en los votos, el `label` de `#compartir-manual` y los `data-foco` con `tabindex="-1"`. Sustituye por completo al prototipo actual [D-01]. | perito-visual | 4 | `feat: estructura de pantallas` |
| 6 | `css/componentes.css`: fichas de modo, botones, marco de prueba, temporizador, sello, veredicto (con `#veredicto-icono` por `background-image`), resultado (revisión con icono en `li::after`), avisos, pie con el enlace de créditos y estilos de la página de créditos bajo `body[data-pagina="creditos"]` (2.7) | perito-visual | 5 | `estilo: componentes y página de créditos` |
| 7 | `img/ui/`: los SVG de 0.2 (sello, huella, lupa, papel e iconos de acierto, fallo y tiempo) | perito-visual | 6 | `estilo: iconos y texturas` |
| 8 | `js/diario.js` (funciones puras y de carga) + `tests/diario.test.mjs` (criterios 1–10) | agente-de-campo | 1 | `feat: fechas, calendario y clave` |
| 9 | `js/temporizador.js` + `tests/temporizador.test.mjs` (20–23) | agente-de-campo | 1 | `feat: temporizador` |
| 10 | `js/juego.js` + `tests/juego.test.mjs` (11–19) | agente-de-campo | 8 | `feat: máquina de estados` |
| 11 | `js/almacen.js` + `tests/almacen.test.mjs` (26–32) | agente-de-campo | 8 | `feat: almacenamiento` |
| 12 | `js/compartir.js` + `tests/compartir.test.mjs` (33–37) y `tests/textos.test.mjs` (38–40) | agente-de-campo | 3 | `feat: compartir` |
| 13 | `herramientas/creditos.mjs` (4.5, con `TIPOGRAFIAS` según D-40) + `tests/creditos.test.mjs` (77–81, con bancos de ejemplo de la versión 2). Regenerar `creditos.html` con `npm run creditos` (todavía sin imágenes) para sustituir la página provisional. | archivero | 1, 3 | `feat: generador de créditos` |
| 14 | `herramientas/temas.mjs` (4.6: palabras prohibidas, carpetas y temas, `FUENTES`, `planificar`, `barajar`, `nuevoId`, `distanciaHamming`, `compararPesos`, `avisosMezcla`) + `tests/temas.test.mjs` (criterios 83–90, con listados de carpetas inventados; no lee `entrada/`) | archivero | 1 | `feat: funciones puras del importador por temas` |
| 15 | `herramientas/importar.mjs` con el flujo de 4.4.2 (fases A y B, `--simular`, `--banco-nuevo`, banco versión 2 de 4.1, calendario versión 2, normalización de D-59 y regeneración de `creditos.html`) | archivero | 13, 14, 25 | `feat: importador por temas` |
| 16 | Quitar de `package.json` los scripts `importar-dataset` y `calendario` (deja `test`, `validar`, `importar` y `creditos`, según 4.4). No se crean `importar-dataset.mjs` ni `generar-calendario.mjs` [D-56]. | archivero | 15 | `chore: scripts del importador por temas` |
| 17 | `herramientas/validar.mjs` con las comprobaciones de 4.4.3 (incluidos los archivos de licencia de `TIPOGRAFIAS`, los temas, los avisos de mezcla y de peso) y `--estricto` (criterios 51, 66–68, 74, 75–76 y 81) | archivero | 14, 25 | `feat: validador` |
| 18 | Primer calendario real (7 días, 2026-11-01 a 2026-11-07): (1) con permiso del usuario, borrar los datos temporales de D-46 (las 5 imágenes de `casos/` y `data/calendario.json`) [D-63]; (2) `npm run importar -- --simular` y pedir al usuario que corrija lo que falle (por ejemplo, que `06-discoteca` tenga 5 imágenes), que revise los avisos de ampliación y que regenere las generadas con la marca de Gemini visible [D-66]; (3) `npm run importar`; (4) `npm run validar` y revisar el aviso de peso; (5) recordar la copia privada de `banco.json`. El commit incluye `casos/`, `data/` y `creditos.html`, **no** `banco.json` ni nada de `entrada/`. Si ya está hecha, los recortes se rehacen en la tarea 33. | archivero | 15–17, 26 | `datos: primer calendario por temas` |
| 19 | `js/main.js`, parte 1: arranque, textos (incluido el del enlace de créditos), render de pantallas, portada, cómo jugar, error y sin casos | agente-de-campo | 5, 8–12 | `feat: arranque y pantallas` |
| 20 | `js/main.js`, parte 2: precarga, cuenta atrás, pruebas, temporizador, votos, teclado y visibilidad | agente-de-campo | 19 | `feat: partida` |
| 21 | `js/main.js`, parte 3: resultado (con la revisión de 2.3 y `final.estado_prueba`), ya jugado, compartir, medianoche, otras pestañas y localStorage bloqueado | agente-de-campo | 20 | `feat: resultado y compartir` |
| 22 | Ajustes visuales con el juego funcionando: 360, 768 y 1280 px (también con un tema de 30 caracteres); reduced motion; contraste; sin peticiones externas; página de créditos (criterio 82) | perito-visual | 21, 7, 13, 29 | `estilo: ajustes finales` |
| 23 | Revisión completa contra la sección 8 (informe BLOQUEANTE / IMPORTANTE / MENOR), con el criterio 53 en GitHub Pages tras el primer despliegue | asuntos-internos | 18, 22, 33, 37, 42 | — (no edita) |
| 24 | Corrección de los hallazgos, cada uno por su agente | según hallazgo | 23 | `fix: …` |

Las tareas 1, 3, 8 y 9 no dependen unas de otras.

### 9.1 Tareas de la versión 1.2 (temas por día)

Cambian código que ya existe (tareas 3, 5, 6, 8, 10, 12 y 19–21). Van antes de la 15 en lo que esta depende de ellas.

| # | Tarea | Agente | Depende de | Commit |
|---|---|---|---|---|
| 25 | `js/diario.js`: `temaValido`, `validarCalendario` para la versión 2 con `tema` (rechaza la versión 1) y `casoDelDia` con `tema` (3.2) + `tests/diario.test.mjs` (criterios 8 y 9 ampliados). Actualizar los calendarios de ejemplo de los demás tests. | agente-de-campo | 8 | `feat: tema del día en el calendario` |
| 26 | `js/juego.js`: `tema` en el estado (1.2), `estadoInicial` con `tema: null` y `CARGADO` copiando `caso.tema` + `tests/juego.test.mjs` (criterio 17 ampliado) | agente-de-campo | 25 | `feat: tema del día en el estado` |
| 27 | `js/textos.js`: claves `portada.tema` y `partida.caso_del_dia` ("Caso del día: {tema}") + `tests/textos.test.mjs` (criterios 38 y 39 ampliados; 35 en `tests/compartir.test.mjs`) | cronista (textos) y agente-de-campo (tests) | 3 | `feat: textos del tema del día` |
| 28 | `index.html`: `<p id="portada-tema">` tras `#portada-caso` y `<p id="caso-tema">` como primer hijo de `#caso-cabecera` (2.3), y su CSS en `componentes.css` (una línea, `--fuente-datos`, puntos suspensivos) | perito-visual | 5, 6 | `estilo: tema del día en portada y partida` |
| 29 | `js/main.js`: rellenar `#portada-tema` y `#caso-tema` en `render` (3.7) con `rellenar` y `textContent` | agente-de-campo | 26, 27, 28 | `feat: mostrar el tema del día` |

Orden recomendado: 25 → 26 → 27 → 28 → 29, y en paralelo, cuando 25 esté revisada, 13 → 14 → 15 → 16 → 17 → 18.

### 9.2 Tareas de los ajustes del 2026-10-22 (sin cambio de versión) [D-65 a D-68]

Cambian código que ya existe (tareas 5, 6, 8, 11, 14, 15, 17, 18 y 19–21). Ninguna cambia `js/juego.js`.

| # | Tarea | Agente | Depende de | Commit |
|---|---|---|---|---|
| 30 | `herramientas/temas.mjs`: `POSICIONES_RECORTE` y `analizarLote` (4.4.5, 4.6) + `tests/temas.test.mjs` (criterios 95 y 96), y reescribir el test del criterio 90 con los arrays exactos de D-67 (`assert.deepEqual`). | archivero | 14 | `feat: recortes manuales y avisos de mezcla exactos` |
| 31 | `herramientas/importar.mjs`: recorte con `sharp.strategy.attention` y precedencia de `lote.json` (paso 5 bis y 9 de 4.4.2), campo `recorte` en el banco, recortes en `--simular` y en el informe, y `--reimportar`/`--confirmar` según 4.4.4. Añadir `herramientas/banco.anterior.json` y `herramientas/lote.json` a `.gitignore`. Criterios 70, 71 y 97–101. | archivero | 30, 15 | `feat: recorte por atención, lote de recortes y reimportación` |
| 32 | `herramientas/validar.mjs`: `banco.anterior.json` y `lote.json` no rastreados y en `.gitignore`; con banco, `recorte` válido y aviso de entradas sin `recorte` (4.4.3; criterios 66, 68 y 102). | archivero | 30, 17 | `feat: validar recortes y archivos privados` |
| 33 | Reimportar los 7 días con permiso explícito del usuario: (1) el usuario revisa las generadas y regenera las que tengan la marca de Gemini [D-66]; (2) `npm run importar -- --reimportar` y revisar el plan con el usuario; (3) `npm run importar -- --reimportar --confirmar`; (4) revisar los recortes con el usuario, apuntar en `herramientas/lote.json` los que sigan mal y repetir 2–3 hasta que estén bien; (5) `npm run validar` y revisar el aviso de peso; (6) recordar la copia privada de `banco.json`. Solo antes del 2026-11-01. El commit incluye `casos/`, `data/` y `creditos.html`, **no** `banco.json`, `banco.anterior.json`, `lote.json` ni nada de `entrada/`. Criterios 100 y 103. | archivero | 18, 31, 32 | `datos: primer calendario con recorte por atención` |
| 34 | `js/diario.js`: `HOSTS_LOCALES` y `fechaPrevisualizada` (3.2) + `tests/diario.test.mjs` (criterio 104). `js/almacen.js`: `crearAlmacenMemoria` (3.5) + `tests/almacen.test.mjs` (criterio 105). | agente-de-campo | 25, 11 | `feat: fecha de previsualización y almacén en memoria` |
| 35 | `js/textos.js`: clave `avisos.previsualizacion` con el valor exacto de 3.1 (cronista) + `tests/textos.test.mjs` (criterios 38 y 39 ampliados; agente-de-campo). | cronista (texto) y agente-de-campo (tests) | 27 | `feat: texto del aviso de previsualización` |
| 36 | `index.html`: `<p id="aviso-previsualizacion" role="status" hidden></p>` justo después de `#aviso-almacen` (2.3) y su estilo discreto en `componentes.css` (franja de una línea, 14 px como mínimo, contraste AA, sin tapar la imagen ni los votos). Criterio 41. | perito-visual | 28 | `estilo: aviso de previsualización` |
| 37 | `js/main.js`: previsualización local según 3.7, punto 11 (fecha efectiva única, almacenes en memoria pasados a todas las llamadas del almacén, sin oyente de `storage`, aviso visible). Probar con `npx serve` los criterios 106–113 y repetir 54–60 sin parámetro para comprobar que nada cambia. | agente-de-campo | 29, 34, 35, 36 | `feat: previsualización local de un día` |

Orden recomendado: 30 → 31 → 32 → 33 (con el usuario), y en paralelo 34 → 35 → 36 → 37. La tarea 23 (revisión) incluye las secciones 8.12 y 8.13.

### 9.3 Tareas del modo prueba y del apagado (sin cambio de versión) [D-70 a D-74]

Cambian código que ya existe (tareas 34–37 y 32). Ninguna cambia `js/juego.js`, `index.html` ni el formato de los datos.

| # | Tarea | Agente | Depende de | Commit |
|---|---|---|---|---|
| 38 | `js/diario.js`: `pruebaActiva`, `diasDePrueba` y `diaDePrueba` (3.2) + `tests/diario.test.mjs` (criterios 114–116). `tests/compartir.test.mjs`: ampliar el criterio 37 con `search`. | agente-de-campo | 34 | `feat: funciones puras del modo prueba` |
| 39 | `herramientas/temas.mjs`: `analizarPruebasAbiertas` (4.6) + `tests/temas.test.mjs` (criterio 117) y tests de `analizarArgumentos`, `comprobarReimportacion` y `mensajeReimportacion` (criterio 125) si aún no los hay. `herramientas/validar.mjs`: comprobación del interruptor y de que no existe `docs/muestras.html` (4.4.3; criterios 66, 68 y 118). | archivero | 32, 43 | `feat: validar el interruptor del modo prueba` |
| 40 | `js/textos.js`: grupo `prueba` (`etiqueta`, `opcion` = "Día {n}: {tema}", `boton`) (cronista) + `tests/textos.test.mjs` (criterios 38 y 39 ampliados; agente-de-campo). | cronista (textos) y agente-de-campo (tests) | 35 | `feat: textos del selector de prueba` |
| 41 | `css/componentes.css`: estilo de `#selector-prueba`, `label`, `#selector-prueba-dia` y su botón según 2.3 (discreto, 44 x 44 px, foco visible, contraste AA, sin scroll a 360 px), comprobado con `?prueba=1` cuando exista la tarea 42 (se puede maquetar antes copiando a mano el marcado de 2.3 en una página de trabajo fuera del repositorio). Revisar que `#aviso-previsualizacion` no tapa nada en un móvil de 360 px. | perito-visual | 36 | `estilo: selector del modo prueba` |
| 42 | `js/main.js`: modo prueba según 3.7, punto 12 (`const PRUEBAS_ABIERTAS = true;` como primera línea tras los `import`, `modoPrueba`, almacenes en memoria, `fechaPrueba` tras cargar el calendario, aviso, selector creado una sola vez y acción `abrir-prueba`). Probar con `npx serve` los criterios 119–123, repetir 106–113 (previsualización) y 54–60 sin parámetros. Después de publicar, comprobar 119 en GitHub Pages. | agente-de-campo | 37, 38, 40, 41 | `feat: modo prueba para amigos` |
| 43 | Eliminar `docs/muestras.html` del repositorio [D-73], con permiso del usuario. No toca ningún otro archivo de `docs/`. | usuario (o el agente principal con su permiso) | — | `docs: eliminar muestras.html` |
| 44 | **Apagado del modo prueba. Antes del lanzamiento (2026-11-01): poner `PRUEBAS_ABIERTAS = false` en `js/main.js` (una línea), probar y publicar** [D-71]. Pasos: (1) cambiar solo esa línea a `const PRUEBAS_ABIERTAS = false;`; (2) `npm test`; (3) `npm run validar -- --estricto` (debe pasar sin aviso ni error del interruptor); (4) con `npx serve`, criterio 121 y criterios 54–60; (5) commit y publicación en GitHub Pages; (6) en Pages, criterio 124 (con `?prueba=1` se ve el juego normal). Hacerlo con margen (por ejemplo, el 2026-10-31), porque desde el 2026-11-01 `npm run validar` falla mientras siga en `true`. | agente-de-campo (cambio y pruebas) y usuario (publicación) | 42 (y después de las pruebas con amigos) | `feat: cerrar el modo prueba para el lanzamiento` |

Orden recomendado: 43 → 38 → 39 → 40 → 41 → 42 → (pruebas con amigos) → 44. La tarea 23 (revisión) incluye las secciones 8.14 y 8.15, y la 44 es la última antes del lanzamiento.

Quedan fuera de docs/ y del plan algunos cambios que hace el usuario para reflejar D-21, D-39, D-52 a D-63, D-65 a D-68 y D-70 a D-71:
- CLAUDE.md (estructura de `entrada/`, temas por día, fuentes de las imágenes y, en la sección de estructura, que `herramientas/lote.json` y `herramientas/banco.anterior.json` también van en `.gitignore` y nunca se suben, igual que `banco.json`). Opcional: una línea que recuerde que, hasta el 2026-11-01, `?prueba=1` abre el modo prueba (D-70) y que la regla de un intento al día se aplica al juego sin ese parámetro.
- `.claude/agents/archivero.md`, que dice que `banco.json` "se publica" y describe el importador por lotes, las categorías y el generador de calendario; debería describir también `lote.json`, el recorte por atención y `--reimportar --confirmar` (con permiso del usuario).
- `.claude/commands/nuevo-lote.md`: debe describir el flujo de 4.4.2 (carpetas de `entrada/temas/`, revisión manual de marcas de agua, `--simular`, `importar`, `validar`) y en el commit incluir `creditos.html` en lugar de `herramientas/banco.json`.
