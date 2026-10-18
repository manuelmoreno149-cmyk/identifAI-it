# identifAI-it: especificación técnica

**Versión 1.1, del 2026-10-19.** Parte de la versión 1.0 (cerrada el 2026-10-18, con los ajustes D-37, D-38 y D-39) e incorpora los ajustes D-40 (licencia Apache 2.0 de Special Elite y archivo `fonts/LICENSE-special-elite.txt`) y D-41 (claves `final.estado_prueba` y `final.estados`, marcado de la revisión de resultado y ajustes de `index.html` en 2.3). Cualquier cambio posterior necesita una decisión nueva en `docs/DECISIONES.md`. La versión solo sube (1.2, 1.3...) cuando cambia el comportamiento del juego; los ajustes pequeños se apuntan en DECISIONES.md y se reflejan aquí sin cambiar el número de versión [D-44].

Este documento es la fuente de verdad técnica del proyecto. Si algo no está aquí, no se inventa: se pregunta o se registra en `docs/DECISIONES.md`.
Las reglas de `CLAUDE.md` (juego, stack, anti-trampas) prevalecen sobre este documento.

Las marcas **[D-nn]** remiten a la decisión correspondiente de `docs/DECISIONES.md`.

## 0. Glosario, convenciones y estructura

| Término | Significado |
|---|---|
| Caso del día | Las 5 pruebas de una fecha. Tiene un número `n` (Caso nº n). |
| Prueba | Una imagen dentro del caso, con índice `i` de 0 a 4 (en pantalla, de 1 a 5). |
| Verdad | Respuesta correcta de una prueba: `0` = auténtica (foto real), `1` = generada (IA). En el juego solo existe en memoria y ofuscada en `data/calendario.json`. |
| Voto | Lo que elige el jugador: `"autentica"` (botón REAL, tecla R) o `"generada"` (botón IA, tecla I). |
| Código de resultado | Un carácter por prueba: `A` acierto, `F` fallo, `T` tiempo agotado, `O` pestaña oculta o partida abandonada, `-` pendiente. |
| Fecha ISO | Cadena `AAAA-MM-DD` con la fecha **local** del jugador. |
| Modo | `facil` (7000 ms), `medio` (3000 ms), `dificil` (1000 ms). |

### 0.1 Convenciones obligatorias

- **Palabras prohibidas.** `real`, `ia`, `ai` y `fake` no pueden aparecer en ids, clases, atributos `data-*`, nombres de archivo, rutas ni `alt` de nada publicado.
  - Se comprueban **por palabra completa** y sin distinguir mayúsculas. El nombre se trocea por cualquier carácter no alfanumérico y por los cambios de minúscula a mayúscula, y se compara cada trozo.
  - Única excepción literal: el nombre del proyecto, `identifAI-it`, que aparece en la ruta de GitHub Pages y en textos [D-23].
  - El texto visible de `creditos.html` (nombres de fuentes y licencias) no es un nombre ni una ruta, así que la regla no se le aplica. Sus ids y clases sí la cumplen.
- Los ids aleatorios de imagen (10 caracteres) se comprueban además **por subcadena**: si contienen `ia`, `ai`, `real` o `fake`, se genera otro.
- Para nombrar la verdad o el voto en código y marcado se usa siempre `autentica`/`generada` (o `0`/`1`). Las palabras prohibidas solo pueden salir en el texto visible ("REAL", "IA").
- Las rutas son siempre relativas y sin `/` inicial: `data/calendario.json`, `casos/x.webp`, `./diario.js`, `../fonts/x.woff2`, `creditos.html`, `index.html`.
- **Ninguna petición a dominios externos**: nada de CDN (tampoco Google Fonts), analítica ni fuentes remotas. Todo se sirve desde el propio sitio [D-29].
- Los textos visibles salen siempre de `js/textos.js`:
  - En `index.html`, `main.js` los inserta al arrancar. No se escribe a mano ningún texto de interfaz, salvo el `<title>` y el contenido de `<noscript>`.
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
| `casos/` | sí | `{id}.webp`, 1080 x 1350, sin metadatos. |
| `data/calendario.json` | sí | Casos de cada día (sección 4.2). |
| `herramientas/*.mjs` | sí (en el repositorio) | Scripts de Node, incluido `creditos.mjs`. |
| `herramientas/banco.json` | **no** (`.gitignore`) | Banco de imágenes con la verdad. Solo existe en local [D-21]. |
| `entrada/reales/`, `entrada/ia/`, `entrada/procesadas/` | **no** (`.gitignore`) | Imágenes por importar. CLAUDE.md fija estos nombres; como no se publican, no les afecta la regla de palabras prohibidas. |
| `tests/` | sí (en el repositorio) | `*.test.mjs`. No dependen de `banco.json`: usan datos de ejemplo propios. |
| `package.json` | sí | `"type": "module"`, scripts y `sharp` como `devDependency` [D-15]. |
| `docs/` | sí | Esta especificación y el registro de decisiones. |

---

## 1. Pantallas y estados

### 1.1 Pantallas

| Pantalla (`data-pantalla`) | Contenido |
|---|---|
| `iniciando` | Estado transitorio mientras se cargan el almacén y el calendario. No tiene interfaz propia (se ve el fondo). |
| `portada` | Título, lema, Caso nº n, selector de modo (3 fichas), racha actual, botones Empezar y Cómo jugar, y pie con el enlace Créditos. |
| `como-jugar` | 4 pasos y botón Entendido. |
| `cargando` | Aviso de que se están preparando las pruebas (precarga de las 5 imágenes). |
| `cuenta-atras` | 3, 2, 1 (un número por segundo). |
| `caso` | Prueba i/5, marcador de aciertos, imagen, temporizador y botones REAL e IA. Tiene dos fases: `pregunta` y `veredicto`. |
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

### 1.3 Eventos y transiciones

| Estado actual | Evento | Condición | Estado siguiente / efecto |
|---|---|---|---|
| `iniciando` | `CARGADO` `{caso, partidaHoy}` | hay partida de hoy `terminada` | `ya-jugado` |
| `iniciando` | `CARGADO` | la partida de hoy estaba `en_curso` (recarga o cierre a medias) | main.js la cierra antes como abandonada (las pruebas pendientes pasan a `O`), así que llega `terminada` → `ya-jugado` [D-26] |
| `iniciando` | `CARGADO` | `caso === null` | `sin-casos` |
| `iniciando` | `CARGADO` | en cualquier otro caso | `portada` |
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
| `cuenta-atras`, `caso` | `OTRA_PESTANA` | otra pestaña ha empezado o terminado la partida de esa fecha | `ya-jugado` |
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
- **Créditos**: el enlace del pie de la portada navega a `creditos.html` en la **misma pestaña**. Al volver (enlace "Volver a la portada" o botón Atrás), la aplicación arranca de nuevo desde `iniciando`. No tiene consecuencias, porque desde la portada el intento aún no se ha consumido [D-39].

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
| `data-accion="..."` | `<button>` | Delegación de eventos. Valores: `empezar`, `como-jugar`, `entendido`, `siguiente`, `compartir`, `reintentar`. Puede haber varios botones con la misma acción (por ejemplo, `compartir` en resultado y en ya jugado). |
| `data-voto="autentica"` / `data-voto="generada"` | los dos botones de respuesta | Voto. Son fijos y no dependen de la imagen. |
| `data-foco` | un elemento por pantalla como máximo | Recibe el foco al entrar en su pantalla. |
| `data-estado="acierto\|fallo\|tiempo\|oculta"` | `#veredicto` y cada `li` de `#resultado-revision` | Resultado de una prueba. No está presente mientras no hay respuesta. |
| `data-fase="pregunta\|veredicto"` | `#pantalla-caso` | Fase actual. |
| `data-nivel="normal\|critico"` | `#temporizador` | Vale `critico` cuando queda el 30 % del tiempo o menos. |
| `--restante` (propiedad CSS) | `#temporizador` | Número de 1 a 0. CSS fija `#temporizador { --restante: 1; }` y la cinta usa `transform: scaleX(var(--restante))`. main.js lo cambia con `style.setProperty('--restante', f)`. No se usa el atributo `style` en el HTML, porque la CSP lo bloquearía. |
| `data-visible="si\|no"` | `#compartir-aviso` | Aviso de "copiado". |
| `data-pagina="juego\|creditos"` | `<body>` | Permite a CSS distinguir las dos páginas. `index.html` lleva `juego` y `creditos.html`, `creditos`. |

Clase utilitaria: `.solo-lectores` (visualmente oculta, pero accesible para lectores de pantalla). No hay más clases de estado: los estados van siempre en atributos `data-*` [D-03]. Las únicas clases estructurales que forman parte del contrato con main.js son `.pantalla`, `.prueba-img`, `.boton-texto` y `.revision-era` (2.3); las demás clases del HTML son solo de estilo y main.js no las usa.

### 2.3 Elementos por pantalla

Portada (`#pantalla-portada`):
- `h1` con `data-texto="portada.titulo"` y `p` con `data-texto="portada.lema"`.
- `#portada-caso`: "Caso nº n" (lo rellena main.js con `portada.etiqueta_caso`).
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
- `<p id="aviso-almacen" role="status" hidden data-texto="avisos.sin_guardar">` (con `hidden` salvo que localStorage no funcione).

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

- Títulos: Oswald 600. Datos de expediente (etiquetas, "PRUEBA Nº", marcador, cuenta atrás): Special Elite 400. Cuerpo: fuentes del sistema, a 16 px como mínimo (el enlace de créditos puede bajar a 14 px).
- Solo se incluye el woff2 del subconjunto latino, que cubre á, é, í, ó, ú, ñ, ü, ¿, ¡, º y ·. Se busca que cada archivo pese menos de 60 KB.
- Licencias, junto a las fuentes [D-40]:

  | Familia | Licencia | Archivo |
  |---|---|---|
  | Oswald | SIL Open Font License 1.1 | `fonts/OFL-oswald.txt` (texto completo de la OFL 1.1 con el aviso de copyright de la familia) |
  | Special Elite | Apache License 2.0 | `fonts/LICENSE-special-elite.txt` (texto completo de la Apache License 2.0) |

  `creditos.html` las enlaza a partir de la constante `TIPOGRAFIAS` de `herramientas/creditos.mjs` (4.5), que debe coincidir con esta tabla. No existe `fonts/OFL-special-elite.txt`.
- Si el perito visual prefiere Courier Prime o Bebas Neue (opciones que permite su agente), debe mantener el patrón `fonts/{familia}-{peso}.woff2`, comprobar la licencia real de la familia en su paquete oficial y guardar su texto completo como `fonts/OFL-{familia}.txt` (SIL OFL) o `fonts/LICENSE-{familia}.txt` (otras licencias), cambiar los `@font-face`, los tokens, la tabla anterior y la constante `TIPOGRAFIAS`, y registrarlo en DECISIONES.

### 2.6 Reglas visuales que afectan a la lógica

- A 360 x 640 px, la imagen ocupa el máximo espacio posible sin provocar scroll y los botones se ven sin desplazar.
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
- Fuera del navegador, `herramientas/creditos.mjs` importa `../js/textos.js` y `herramientas/generar-calendario.mjs` importa `../js/diario.js`.

### 3.1 js/textos.js (cronista)

```js
export const TEXTOS = { ... }
```

Claves exactas (las que llevan `{x}` son plantillas):

| Grupo | Claves |
|---|---|
| `portada` | `titulo`, `lema`, `elige_modo`, `modo_facil`, `modo_medio`, `modo_dificil` ("Fácil", "Medio", "Difícil"), `desc_facil`, `desc_medio`, `desc_dificil` (incluyen los segundos), `boton_empezar`, `boton_como_jugar`, `etiqueta_caso` ("Caso nº {n}"), `racha` ("Racha: {racha}"), `enlace_creditos` ("Créditos") |
| `como_jugar` | `titulo`, `pasos` (array de exactamente 4 cadenas; una dice que hay un solo intento al día, sea cual sea el modo), `boton_entendido` |
| `cargando` | `texto` |
| `cuenta_atras` | `aviso` |
| `partida` | `etiqueta_prueba` ("Prueba {i}/5"), `marcador` ("Aciertos: {aciertos}"), `alt_prueba` ("Prueba {i} de 5"), `boton_autentica` ("REAL"), `boton_generada` ("IA"), `sello_autentica` ("REAL"), `sello_generada` ("IA"), `quedan` ("Quedan {s} s"), `boton_siguiente`, `boton_ver_resultado` |
| `veredictos` | `acierto` (≥ 4), `fallo` (≥ 4), `tiempo` (≥ 3), `oculta` (≥ 2): arrays de cadenas |
| `final` | `alt_prueba` ("Prueba {n}") [D-49], `mensajes` (array de exactamente 6, con índice = aciertos de 0 a 5), `aciertos` ("{aciertos}/5"), `racha` ("Racha: {racha}"), `mejor_racha` ("Mejor racha: {racha}"), `era` ("Era: {sello}"), `cuadros_etiqueta` ("{aciertos} aciertos de 5") [D-43], `estado_prueba` ("Prueba {i}: {estado}"), `estados` (objeto con exactamente `acierto: 'acierto'`, `fallo: 'fallo'`, `tiempo: 'tiempo agotado'`, `oculta: 'pestaña oculta'`) [D-41] |
| `ya_jugado` | `titulo`, `texto`, `proximo` ("Próximo caso en {tiempo}"), `modo` ("Modo: {modo}") |
| `sin_casos` | `texto` |
| `errores` | `calendario`, `imagenes`, `boton_reintentar` |
| `avisos` | `sin_guardar` |
| `compartir` | `boton`, `copiado`, `manual` ("Copia este texto:"), `plantilla` (exactamente la de la sección 7, sin cambios) |
| `creditos` | `titulo_pagina` ("Créditos · identifAI-it"), `titulo` ("Créditos"), `intro`, `tipografias` ("Tipografías"), `imagenes` ("Imágenes"), `imagenes_intro` ("Las pruebas proceden de estas fuentes. La lista no indica qué imagen viene de cada una."), `sin_imagenes` ("Todavía no hay imágenes publicadas."), `ver_licencia` ("licencia"), `volver` ("Volver a la portada") |

- Ninguna cadena supera los 90 caracteres, salvo `como_jugar.pasos`.
- Los valores entre comillas de `portada.enlace_creditos`, `creditos.titulo`, `creditos.volver` y `creditos.sin_imagenes` son exactos: el cronista puede proponer otros al usuario, pero no cambiarlos por su cuenta.
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
| `validarCalendario(obj)` | pura | → `boolean` | Comprueba la estructura de la sección 4.2. |
| `casoDelDia(calendario, fechaISO)` | pura | → `{n, fecha, pruebas, clave}` o `null` | `null` si `n < 1`, si no existe el día `n` o si su `fecha` no coincide. |
| `rutaPrueba(id)` | pura | → `'casos/{id}.webp'` | |
| `ofuscar(verdades, n, aleatorio = Math.random)` | pura (con `aleatorio` inyectado) | `number[5], number` → `string` (8 caracteres base64) | Sección 4.3. La usa también `herramientas/generar-calendario.mjs`. |
| `desofuscar(clave, n, indice)` | pura | → `0 \| 1` | Sección 4.3. Solo se llama al corregir (eventos `VOTO`, `AGOTADO` y `OCULTA`) y en la revisión final. |
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
| `estadoInicial({modo, vistoComoJugar})` | pura | Estado de 1.2 con `pantalla: 'iniciando'`. |
| `transicion(estado, evento)` | pura | Implementa la tabla 1.3. Nunca muta `estado`: devuelve uno nuevo, o el mismo objeto si el evento no aplica. Eventos: `{tipo: 'CARGADO', caso, partidaHoy}`, `ERROR_CALENDARIO`, `ELEGIR_MODO {modo}`, `VER_COMO_JUGAR`, `EMPEZAR`, `ENTENDIDO`, `PRECARGA_OK`, `PRECARGA_ERROR`, `REINTENTAR`, `FIN_CUENTA {fecha}`, `PINTADA`, `VOTO {voto}`, `AGOTADO`, `OCULTA`, `SIGUIENTE`, `OTRA_PESTANA`, `MEDIANOCHE`. `caso` es lo que devuelve `casoDelDia` (o `null`); `partidaHoy` es el registro de hoy en el almacén (o `null`). |

`VOTO`, `AGOTADO` y `OCULTA` obtienen la verdad con `desofuscar(estado.clave, estado.n, estado.indice)` dentro de `transicion` y la guardan en `revelada`.

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
| `partidaDe(datos, fechaISO)` | pura | Devuelve el registro o `null`. Busca por fecha, sin importar el modo [D-32]. |
| `conAjustes(datos, cambios)` | pura | Devuelve los datos con `ajustes` mezclados con `cambios`. |
| `registrarInicio(datos, {fecha, n, modo, sesion})` | pura | Crea `partidas[fecha] = {n, modo, estado: 'en_curso', resultados: '-----', aciertos: 0, sesion}`. Si ya existe una partida para esa fecha, en cualquier modo, devuelve `datos` sin cambios. |
| `registrarPrueba(datos, fecha, indice, codigo)` | pura | Escribe el código en la posición `indice` y actualiza `aciertos`. |
| `registrarFin(datos, fecha, hoyISO)` | pura | Pone `estado: 'terminada'` y `aciertos`, recalcula `racha = calcularRacha(partidas, hoyISO)` y `mejorRacha = max(mejorRacha, racha)`. |
| `cerrarAbandonada(datos, fecha, hoyISO)` | pura | Cambia los `-` por `O` y aplica `registrarFin`. |
| `calcularRacha(partidas, hoyISO)` | pura | Cuenta los días consecutivos con partida `terminada` (sea cual sea la puntuación) que acaban hoy, o ayer si hoy aún no se ha jugado. Si no hay partida terminada ni hoy ni ayer, devuelve 0. Un día sin casos también rompe la racha [D-25]. |

Si localStorage falla, el juego funciona igual con los datos en memoria (main.js guarda la copia en una variable) y se muestra `#aviso-almacen`. Al recargar se podría volver a jugar; se acepta porque no hay otra forma sin servidor [D-11].

### 3.6 js/compartir.js (agente-de-campo)

| Función | Tipo | Descripción |
|---|---|---|
| `CUADROS` | constante | `{A: '🟩', F: '🟥', T: '⬛', O: '⬛'}`. |
| `rellenar(plantilla, valores)` | pura | Sustituye cada `{clave}` por `valores[clave]` y deja tal cual los marcadores sin valor. main.js la usa también para todas las plantillas de textos. |
| `cuadros(resultados)` | pura | `'AAFAT'` → `'🟩🟩🟥🟩⬛'`. |
| `textoCompartir({plantilla, n, nombreModo, resultados, racha, url})` | pura | Sección 7. |
| `urlDelJuego(ubicacion = location)` | pura (con parámetro) | `ubicacion.origin + ubicacion.pathname`, quitando un `index.html` final. |
| `compartir(texto, nav = navigator)` | async, nunca lanza | → `'compartido' \| 'copiado' \| 'cancelado' \| 'manual'`. Sección 7. |

### 3.7 js/main.js (agente-de-campo)

No exporta nada. Responsabilidades:
1. **Arranque**: `leer()` del almacén y `estadoInicial`. Rellenar todos los `[data-texto]` (también el del enlace de créditos, los `span.boton-texto` de los votos y el `label` de `#compartir-manual`), crear los pasos de cómo jugar y marcar el radio del modo guardado. Después, `cargarCalendario()`. Si la partida de hoy está `en_curso`, aplicar `cerrarAbandonada` y guardar. Por último, despachar `CARGADO` (con `casoDelDia(cal, fechaLocal(new Date()))` y `partidaDe(datos, hoy)`) o `ERROR_CALENDARIO`.
2. **`despachar(evento)`**: `nuevo = transicion(estado, evento)`. Si cambió, ejecutar los efectos de la transición y `render(nuevo)`. Es el único sitio donde se asigna el estado.
3. **`render(estado)`**: `hidden` de las secciones; `data-pantalla`, `data-modo` y `data-fase`; etiquetas y marcador; `#veredicto` (`data-estado`, sello y texto solo en fase veredicto; en fase pregunta, `#veredicto-sello` vacío y sin `data-estado`); resultado (incluidos el `aria-label` de `#resultado-cuadros` y los 5 `li` de `#resultado-revision` con el marcado de 2.3); ya jugado.
4. **Efectos**:
   - Al entrar en `cargando`, precarga.
   - Cuenta atrás.
   - En `FIN_CUENTA`: crear una `sesion` (cadena aleatoria de 8 caracteres `[a-z0-9]`), `registrarInicio` y guardar, todo **antes** de mostrar la primera imagen.
   - En cada prueba: insertar la imagen, `esperarPintado`, `PINTADA` y temporizador.
   - Detener el temporizador al votar u ocultarse la pestaña.
   - Tras cada veredicto, `registrarPrueba` y guardar.
   - Al entrar en `resultado`, `registrarFin` y guardar.
5. **Entrada**:
   - Clic en `[data-voto]` y `[data-accion]` (delegación en `#app`, buscando el botón con `closest`, porque el clic puede caer en el `span` o el `kbd` interiores) y `change` en `input[name=modo]`.
   - Teclado: `keydown` en `document`, ignorando `e.repeat` y las teclas pulsadas con Ctrl, Alt o Meta.
   - `r`/`R` → `VOTO autentica` e `i`/`I` → `VOTO generada`, solo en `caso/pregunta`.
   - `Enter` → `SIGUIENTE`, solo en `caso/veredicto` y si el foco no está en un `button` ni en un enlace (para no duplicar la acción nativa).
6. **`visibilitychange`**: al ocultarse la pestaña → `OCULTA`. Al volver a estar visible: en `cuenta-atras`, reiniciarla; en `portada`, `ya-jugado` o `sin-casos`, si la fecha local cambió, `MEDIANOCHE`.
7. **Medianoche**: en `ya-jugado`, la cuenta atrás se actualiza cada segundo con `setTimeout` encadenado (no es el temporizador de juego). Al llegar a 0, `MEDIANOCHE`.
8. **Otras pestañas**: escuchar `storage`. Si durante `cuenta-atras` o `caso` el registro de la fecha actual aparece con otra `sesion`, o como `terminada` sin que lo haya terminado esta pestaña, `OTRA_PESTANA`. Antes de `FIN_CUENTA` se vuelve a leer el almacén: si ya hay partida de hoy (en cualquier modo), `OTRA_PESTANA`.
9. **Compartir**: construir el texto y llamar a `compartir()`. Según lo que devuelva, mostrar `#compartir-aviso` 2 s (`copiado`) o `#compartir-manual` con el texto seleccionado (`manual`), sin mover el `textarea` ni su `label` (2.3).
10. **Errores**: `try/catch` en el arranque; cualquier fallo de carga lleva a `error`. Nada de `console.log` en producción (sí `console.error` en fallos reales).

---

## 4. Datos

### 4.1 herramientas/banco.json (privado, solo en local) [D-21]

- Está en `.gitignore` y **nunca se sube** ni al repositorio ni a GitHub Pages. Solo lo leen y escriben los scripts de `herramientas/` en el equipo del usuario. El juego no lo carga jamás.
- Es la única fuente de `tipo`, `categoria`, `fuente` y `licencia`. Conviene guardar una copia privada fuera del repositorio después de cada lote; el archivero lo recuerda en su resumen.
- Si se pierde, el calendario publicado sigue funcionando y el tipo de las imágenes ya usadas se puede recuperar con `desofuscar` sobre `data/calendario.json`. En cambio, se pierden las categorías, fuentes y licencias, y no se pueden generar días nuevos con imágenes antiguas (ver 4.4). `creditos.html` conserva la lista agregada de fuentes y licencias.

```json
{
  "version": 1,
  "imagenes": [
    {
      "id": "k3x9q2m7ab",
      "tipo": "generada",
      "categoria": "retrato",
      "fuente": "lote propio 2026-10",
      "licencia": "CC0",
      "dhash": "f0e1d2c3b4a59687",
      "alta": "2026-10-18",
      "usada": "2026-11-03"
    },
    {
      "id": "p0w8e4r1tz",
      "tipo": "autentica",
      "categoria": "calle",
      "fuente": "fotos de Manuel",
      "licencia": "propia",
      "dhash": "0f1e2d3c4b5a6978",
      "alta": "2026-10-18",
      "usada": null
    }
  ]
}
```

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string | 10 caracteres `[a-z0-9]`, único. El archivo es `casos/{id}.webp`. Se genera otro si contiene como subcadena `ia`, `ai`, `real` o `fake`. |
| `tipo` | `"autentica" \| "generada"` | Verdad de la imagen. |
| `categoria` | string | En minúsculas y sin espacios (`retrato`, `calle`, `animal`, `comida`, `paisaje`, `objeto`, `interior`...). |
| `fuente`, `licencia` | string | Vienen del `lote.json` de importación; sin licencia no se importa. Son texto libre del usuario: se escapan al escribirlos en `creditos.html` (4.5). |
| `dhash` | string | 16 caracteres hexadecimales (64 bits). Se considera duplicado si la distancia de Hamming es ≤ 5. |
| `alta` | fecha ISO | Día de importación. |
| `usada` | fecha ISO o `null` | Fecha del calendario en que aparece. `null` = disponible. |

### 4.2 data/calendario.json (público; lo carga el juego)

```json
{
  "version": 1,
  "lanzamiento": "2026-11-01",
  "dias": [
    { "n": 1, "fecha": "2026-11-01", "pruebas": ["k3x9q2m7ab", "p0w8e4r1tz", "m5n6b7v8c9", "z1x2c3v4b5", "q9w8e7r6t5"], "clave": "Mpb9Ycc=" },
    { "n": 2, "fecha": "2026-11-02", "pruebas": ["a1s2d3f4g5", "h6j7k8l9m0", "y5t4r3e2w1", "u7o8e9p0w1", "s2d3f4g5h6"], "clave": "Ax7Pq1E=" }
  ]
}
```

Reglas (`validarCalendario` comprueba la estructura y `validar.mjs` todo lo demás):
- `version` vale 1 y `lanzamiento` vale `"2026-11-01"` [D-20].
- `dias` está ordenado por `n` y sin huecos: `dias[k].n === k + 1` y `fecha === sumarDias(lanzamiento, n - 1)`.
- `pruebas` tiene exactamente 5 ids distintos que existen en `casos/`. Ningún id se repite en todo el calendario mientras el banco tenga imágenes sin usar.
- `clave` tiene 8 caracteres base64 que codifican 5 bytes (sección 4.3). Cada día tiene entre 1 y 4 verdades `1` (generada); se puede comprobar sin el banco, desofuscando.
- No hay más de 2 pruebas de la misma `categoria` por día (solo se puede comprobar con el banco). El orden de las 5 pruebas es aleatorio.
- `generar-calendario.mjs` solo añade días a partir de mañana; nunca modifica hoy ni días pasados.
- No hay ningún otro campo (nada de `tipo`, `fuente` ni `categoria`).

Nota: la clave `"Ax7Pq1E="` del día 2 es ilustrativa; la del día 1 es el vector de prueba real de 4.3.

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
- `btoa` y `atob` existen en el navegador y en Node 20, así que la misma función sirve en `js/diario.js` y en `herramientas/generar-calendario.mjs`, que la importa de `../js/diario.js` [D-14].
- Vector de prueba: `ofuscar([0, 1, 1, 0, 1], 1, () => 0) === 'Mpb9Ycc='` (bytes `32 96 FD 61 C7`), y `desofuscar('Mpb9Ycc=', 1, i)` devuelve `0, 1, 1, 0, 1` para `i = 0..4`.
- La verdad solo se calcula en `transicion`, al corregir, y en la revisión final. Nunca se escribe en el DOM, en atributos ni en `localStorage`.

### 4.4 Flujo de las herramientas y ausencia de banco.json [D-21, D-34]

| Script | Lee | Escribe | Si `herramientas/banco.json` no existe |
|---|---|---|---|
| `importar.mjs` (`npm run importar`) | `entrada/reales/`, `entrada/ia/`, `banco.json` | `casos/`, `banco.json` y `creditos.html` (con `creditos.mjs`); mueve los originales a `entrada/procesadas/` | Si `casos/` está vacío, crea un banco nuevo vacío y lo anuncia. Si `casos/` ya tiene imágenes, **se detiene** (código de salida 1) con el mensaje "No se encuentra herramientas/banco.json, que es privado y no está en el repo. Restaura tu copia o usa --banco-nuevo si sabes lo que haces." Con `--banco-nuevo` crea uno vacío: las imágenes antiguas de `casos/` quedan fuera del banco y no se vuelven a usar. |
| `importar-dataset.mjs` | carpeta del dataset | `entrada/` y luego llama a `importar.mjs` | Igual que `importar.mjs`. |
| `creditos.mjs` (`npm run creditos`) | `banco.json`, `js/textos.js` | `creditos.html` | Si `casos/` está vacío, genera la página sin imágenes. Si `casos/` tiene imágenes, **se detiene** (código 1) con el mensaje "No se encuentra herramientas/banco.json; no se regenera creditos.html para no borrar los créditos publicados." y no toca el archivo. |
| `generar-calendario.mjs` (`npm run calendario`) | `banco.json`, `data/calendario.json` | `data/calendario.json` y el campo `usada` de `banco.json` | **Se detiene** (código 1) con el mensaje "No se encuentra herramientas/banco.json (es privado y no se publica). Sin él no se pueden generar días nuevos. Restaura tu copia o importa imágenes con npm run importar." y no toca el calendario. |
| `validar.mjs` (`npm run validar`) | `data/calendario.json`, `casos/`, todo lo publicado y `banco.json` si existe | nada | Ejecuta todas las comprobaciones de lo publicado y muestra un aviso bien visible: "AVISO: herramientas/banco.json no encontrado; se omiten las comprobaciones que dependen del banco (categorías, equilibrio, coherencia de tipos y créditos completos)." Termina con código 0 si lo demás pasa. Con `--estricto`, la falta del banco es un error (código 1). |

Comprobaciones de `validar.mjs`:
- **Sin banco** (funcionan en un clon limpio del repositorio):
  - Las imágenes del calendario existen, son WebP de 1080 x 1350 y no tienen metadatos (EXIF, XMP, ICC ni C2PA).
  - `n` y `fecha` son coherentes, y las claves decodifican a 5 bytes con entre 1 y 4 generadas.
  - No hay palabras prohibidas en nada de lo publicado (ids, clases, `data-*` y `alt` de `index.html` y de `creditos.html`, nombres y rutas).
  - `herramientas/banco.json` **no** está rastreado por git (`git ls-files --error-unmatch herramientas/banco.json` debe fallar) y está en `.gitignore`.
  - No hay URL externas (`http://`, `https://`, `//`) en `index.html`, `creditos.html`, `css/` ni `js/`.
  - Existen los `fonts/*.woff2` referenciados y el archivo de licencia de cada tipografía: los `archivo` de `TIPOGRAFIAS` (importada de `herramientas/creditos.mjs`), hoy `fonts/OFL-oswald.txt` y `fonts/LICENSE-special-elite.txt` [D-40]. Ninguno puede estar vacío.
  - Existen `.nojekyll` y `creditos.html` en la raíz.
  - Todo `href` y `src` relativo de `index.html` y de `creditos.html` apunta a un archivo existente, con las mismas mayúsculas.
  - `creditos.html` cumple la estructura de 2.7: `lang="es"`, `<title>`, viewport, CSP idéntica a la de `index.html`, `#creditos-volver` con `href="index.html"`, sin `<script>` ni atributo `style`, y sin ningún id de imagen de `casos/`.
  - Aviso si quedan menos de 30 días de calendario.
- **Con banco**:
  - Todos los ids del calendario están en el banco, con `usada` igual a su fecha.
  - Los tipos del banco coinciden con lo que da `desofuscar` sobre el calendario.
  - No hay más de 2 pruebas de la misma categoría por día.
  - `creditos.html` es idéntico byte a byte a lo que generaría `creditos.mjs` con el banco actual.
  - Aviso si el banco tiene más de un 60 % de un tipo o si hay imágenes en `casos/` que no están en el banco.

`npm test` no lee `banco.json` en ningún caso.

### 4.5 creditos.html y herramientas/creditos.mjs [D-39, D-40; sustituye a CREDITOS.md]

`herramientas/creditos.mjs` es un módulo sin dependencias que importa `../js/textos.js`. Es la única fuente de la lista de tipografías de `creditos.html` y de la lista de archivos de licencia que comprueba `validar.mjs`. Exporta:

| Exportación | Tipo | Descripción |
|---|---|---|
| `TIPOGRAFIAS` | constante | `[{familia: 'Oswald', licencia: 'SIL Open Font License 1.1', archivo: 'fonts/OFL-oswald.txt'}, {familia: 'Special Elite', licencia: 'Apache License 2.0', archivo: 'fonts/LICENSE-special-elite.txt'}]` [D-40]. Debe coincidir con la tabla de licencias de 2.5. |
| `escaparHtml(texto)` | pura | Sustituye `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;` y `'` → `&#39;` (en ese orden, `&` primero). Convierte a cadena lo que no lo sea. |
| `parejasCreditos(banco)` | pura | Devuelve las parejas `{fuente, licencia}` distintas de **todas** las imágenes del banco (todas están publicadas en `casos/`), sin espacios sobrantes y ordenadas con `localeCompare(…, 'es')` por fuente y luego por licencia. No devuelve ids, tipos, categorías, fechas ni recuentos. |
| `generarCreditosHtml({textos, tipografias, parejas})` | pura | Devuelve el HTML completo de 2.7 como cadena, con un `li` de tipografía por elemento de `tipografias`, en su orden. Escapa con `escaparHtml` **todos** los valores insertados: textos, familias, licencias, fuentes y rutas. Si se llama dos veces con los mismos datos, devuelve el mismo resultado. |
| `escribirCreditos({banco, ruta = 'creditos.html'})` | efecto | Escribe el archivo en UTF-8 con saltos LF, usando `TIPOGRAFIAS`. Lo usan `importar.mjs` y el script `npm run creditos`. |

Formato de cada línea de imágenes: `{fuente} · {licencia}`, con `·` (U+00B7) entre espacios normales. Ejemplo de la lista generada con el banco de 4.1:

```html
<ul id="creditos-lista">
  <li>fotos de Manuel · propia</li>
  <li>lote propio 2026-10 · CC0</li>
</ul>
```

Página inicial provisional (tarea 1): el archivero la escribe a mano con la estructura de 2.7, sin imágenes, con los textos por defecto de 3.1 y con las dos líneas de tipografías exactamente como en el ejemplo de 2.7 (Special Elite con Apache License 2.0 y `fonts/LICENSE-special-elite.txt`). Sirve para que el enlace de la portada nunca dé 404. En la tarea 13 se sustituye por la versión generada con `npm run creditos`.

---

## 5. Algoritmo diario

1. `hoy = fechaLocal(new Date())`: medianoche local, como pide CLAUDE.md.
2. `n = numeroCaso(hoy, calendario.lanzamiento) = diasEntre(lanzamiento, hoy) + 1`. Con el lanzamiento el 2026-11-01, ese día es el caso 1; el 2026-11-02, el 2; y el 2027-03-28 (día del cambio de hora), el 148.
3. `caso = casoDelDia(calendario, hoy)`: busca `dias[n - 1]` y comprueba que `n` y `fecha` coinciden.
4. Si `caso === null` (antes del lanzamiento, `n < 1`, o calendario agotado) → pantalla `sin-casos` [D-24]. No se usa una semilla sobre el banco: el banco es privado, y reciclar días daría respuestas ya conocidas. `validar.mjs` avisa cuando quedan menos de 30 días para que esto no ocurra.
5. Todos los jugadores con la misma fecha local ven el mismo caso. En zonas horarias distintas, el cambio llega en momentos distintos (como en Wordle).
6. Hay un solo intento por fecha, sea cual sea el modo elegido [D-32].
7. Cambiar la hora del dispositivo permite adelantar días. Se acepta porque no se puede impedir sin servidor [D-18].

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

- `partidas` va **por fecha ISO**: una partida por día, sea cual sea el modo. Cada una guarda el número de caso, el modo jugado, el estado (`en_curso` o `terminada`), los códigos por prueba, los aciertos y la sesión (que identifica la pestaña). Nunca se guarda la verdad ni el voto.
- `racha` y `mejorRacha` se recalculan en `registrarFin`. La racha que muestra la portada se recalcula con `calcularRacha` para que caduque si el jugador falta un día.
- La clave de prueba de disponibilidad es `identifaiit.prueba` (se escribe y se borra al arrancar).
- Versiones futuras: se usará una clave nueva, `identifaiit.v2`. Al arrancar, si no existe esa clave pero sí la `v1`, se migran los datos y se borra la antigua. En v1 no hay migraciones.
- Si localStorage no está disponible (modo privado, bloqueado o cuota llena), ninguna función lanza: el juego funciona con datos en memoria y se muestra `#aviso-almacen`. En ese caso no se puede garantizar el intento único entre recargas.
- No se usan cookies, sessionStorage ni IndexedDB.

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
8. `casoDelDia` devuelve `null` antes del lanzamiento, en un día posterior al último y si la `fecha` del día no coincide.
9. `validarCalendario` rechaza: menos o más de 5 pruebas, `n` con huecos, una clave que no decodifica a 5 bytes y campos extra.
10. `precargar` rechaza la promesa si una imagen falla. Con 5 correctas, resuelve con 5 imágenes cuyo `decode()` ha terminado, sin tocar el DOM.

### 8.2 juego.js
11. `transicion` no muta el estado recibido (test con `Object.freeze` profundo).
12. `EMPEZAR` con `vistoComoJugar: false` lleva a `como-jugar`, y después `ENTENDIDO` lleva a `cargando`. Con `vistoComoJugar: true`, `EMPEZAR` lleva directamente a `cargando`.
13. `VOTO` con `activo: false` devuelve el mismo objeto de estado.
14. `VOTO` correcto → código `A`; incorrecto → `F`; `AGOTADO` → `T`; `OCULTA` en `caso/pregunta` → `O`. En todos los casos queda `fase: 'veredicto'` y `revelada` = verdad.
15. Un segundo `VOTO` o un `AGOTADO` en fase `veredicto` no cambia el estado.
16. `SIGUIENTE` en la prueba 5 lleva a `resultado`; en las demás, a la siguiente prueba con `revelada: null`.
17. `CARGADO` con una partida de hoy `terminada` en cualquier modo lleva a `ya-jugado`, aunque el modo de los ajustes sea otro. Con `caso: null` lleva a `sin-casos`.
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
35. El texto compartido no contiene "IA" como palabra suelta, ni "REAL", "autentica", "generada" o ids de imagen. La única excepción es el nombre "identifAI-it".
36. `compartir` devuelve `'compartido'` si `share` resuelve; `'cancelado'` si rechaza con `AbortError`; `'copiado'` si no hay `share` pero sí portapapeles; y `'manual'` si no hay ninguno de los dos. Nunca lanza.
37. `urlDelJuego({origin: 'https://u.github.io', pathname: '/identifAI-it/index.html'})` → `'https://u.github.io/identifAI-it/'`.

### 8.6 textos.js
38. Están todas las claves de 3.1, incluidos `portada.enlace_creditos === 'Créditos'` y el grupo `creditos` completo (con `volver === 'Volver a la portada'`). `final.mensajes.length === 6` y `como_jugar.pasos.length === 4`. `final.estado_prueba === 'Prueba {i}: {estado}'` y `final.estados` es exactamente `{ acierto: 'acierto', fallo: 'fallo', tiempo: 'tiempo agotado', oculta: 'pestaña oculta' }` (las mismas cuatro claves que devuelve `estadoDeCodigo`, ni una más). `veredictos.acierto` y `veredictos.fallo` tienen 4 o más variantes, `tiempo` 3 o más y `oculta` 2 o más. No existe `portada.nueva_pestana`.
39. Ninguna cadena (salvo `como_jugar.pasos`) supera los 90 caracteres.
40. `compartir.plantilla` es exactamente igual a la cadena de la sección 7.

### 8.7 index.html, CSS y fuentes
41. Existen todos los ids y atributos de la sección 2, y ningún id ni clase contiene palabras prohibidas (por palabra completa, según 0.1). En particular: `#caso-escena` envuelve `#prueba-marco` y `#veredicto`; los botones de voto llevan `data-texto` en un `span.boton-texto` junto a su `<kbd>`; el `label[for="compartir-manual"]` es el hermano inmediato siguiente del `textarea`; `#resultado-cuadros` tiene `role="img"`; y todo elemento con `data-foco` que no sea un control lleva `tabindex="-1"`.
42. En todo momento hay como mucho una sección `.pantalla` sin `hidden`. Antes de que cargue el JS no hay ninguna, y sin JS se ve el `<noscript>`.
43. A 360 x 640 px, en la pantalla `caso`, no hay scroll horizontal y la imagen y los dos botones se ven sin desplazar.
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
63. En `ya-jugado`, cuando la cuenta atrás llega a 0, se pasa a la `portada` del día siguiente sin recargar.
64. En la pestaña Red, las 5 imágenes se piden antes de la cuenta atrás y ninguna petición contiene la verdad.
65. En un móvil, Compartir abre la hoja de compartir. En escritorio sin `share`, copia el texto y muestra el aviso.

### 8.9 Herramientas (archivero)
66. `npm run validar` falla en cualquiera de estos casos:
    - Una imagen del calendario no existe, no es WebP de 1080 x 1350 o tiene EXIF, XMP, ICC o C2PA.
    - Algún nombre, ruta o campo publicado contiene una palabra prohibida.
    - Un día tiene 0 o 5 generadas, o `fecha` y `n` no cuadran.
    - `herramientas/banco.json` está rastreado por git o falta en `.gitignore`.
    - Hay URL externas.
    - Faltan `.nojekyll` o `creditos.html`, o un `href`/`src` relativo de `index.html` o `creditos.html` apunta a un archivo inexistente.
    - Falta (o está vacío) un woff2 referenciado o alguno de los archivos de licencia de `TIPOGRAFIAS` (`fonts/OFL-oswald.txt`, `fonts/LICENSE-special-elite.txt`).
    - `creditos.html` no cumple 2.7 o contiene un id de imagen.
    - Si hay banco, además: un día tiene más de 2 pruebas de la misma categoría, un tipo del banco no coincide con la clave, o `creditos.html` no coincide con lo que generaría `creditos.mjs`.
67. En un clon limpio del repositorio (sin `banco.json`), `npm run validar` muestra el aviso de banco ausente, ejecuta el resto de comprobaciones y termina con código 0 si pasan. `npm run validar -- --estricto` termina con código 1.
68. `npm run validar` avisa, sin fallar, si quedan menos de 30 días de calendario o si el banco tiene más de un 60 % de un tipo.
69. `npm run calendario` sin `banco.json` termina con código 1, muestra el mensaje de 4.4 y no modifica `data/calendario.json`.
70. Ejecutar `npm run calendario` dos veces seguidas no cambia ningún día ya existente.
71. `npm run importar` sin `banco.json` y con imágenes en `casos/` se detiene con el mensaje de 4.4. Sin un `lote.json` con licencia, no importa nada y lo avisa. Una imagen duplicada (dHash ≤ 5) se descarta.
72. `npm test` pasa con Node 20 en un clon limpio, sin `banco.json` y sin más dependencias que `sharp`.
73. Después de un lote, `git status` nunca muestra `herramientas/banco.json`.
74. Después de `npm run importar`, `creditos.html` está regenerado: la lista contiene exactamente las parejas fuente · licencia del banco, ordenadas y sin ids, tipos, categorías, fechas ni recuentos. `npm run creditos` sin banco y con imágenes en `casos/` termina con código 1 y no toca el archivo.

### 8.10 creditos.html y creditos.mjs
75. `creditos.html` empieza por `<!doctype html>` y tiene `<html lang="es">`, viewport, una CSP idéntica a la de `index.html` y `<title>` igual a `TEXTOS.creditos.titulo_pagina`. Solo carga `css/variables.css`, `css/base.css` y `css/componentes.css` con rutas relativas. No tiene `<script>` ni atributo `style`.
76. Tiene un único `<main id="creditos">`, un `<footer id="creditos-pie">`, un `h1` y un `h2` por sección (con `aria-labelledby`). `a#creditos-volver` tiene `href="index.html"`; al seguirlo, se llega a la portada con estado 200, tanto con `npx serve` como bajo `/identifAI-it/`.
77. `TIPOGRAFIAS` es exactamente la constante de 4.5. La sección de tipografías tiene exactamente estas dos líneas, que coinciden con el ejemplo de 2.7: "Oswald · SIL Open Font License 1.1" con enlace a `fonts/OFL-oswald.txt` y "Special Elite · Apache License 2.0" con enlace a `fonts/LICENSE-special-elite.txt`; ambos archivos existen. Ninguna línea menciona la OFL para Special Elite ni enlaza `fonts/OFL-special-elite.txt` [D-40]. Sin imágenes en el banco, en lugar de la lista aparece `TEXTOS.creditos.sin_imagenes`.
78. `escaparHtml('<b>Fotos & "Co"</b> \'x\'')` → `'&lt;b&gt;Fotos &amp; &quot;Co&quot;&lt;/b&gt; &#39;x&#39;'`. `generarCreditosHtml` con esa fuente produce un `li` sin ninguna etiqueta inyectada.
79. `parejasCreditos` elimina duplicados, ordena con `localeCompare(…, 'es')` y devuelve objetos con solo `fuente` y `licencia`. Con el banco de ejemplo de 4.1, la lista es exactamente la del ejemplo de 4.5.
80. Generar dos veces con el mismo banco produce archivos idénticos byte a byte (UTF-8, LF y un único salto de línea final).
81. Los ids de `creditos.html` (`creditos`, `creditos-tipografias`, `creditos-imagenes`, `creditos-lista`, `creditos-pie`, `creditos-volver`) y su atributo `data-pagina` no contienen palabras prohibidas.
82. A 360 px no hay scroll horizontal. Hay contraste AA, foco visible en los enlaces y área táctil de al menos 44 x 44 px en `#creditos-volver`. Las fuentes cargan desde `fonts/` sin peticiones externas.

---

## 9. Plan de tareas

Una tarea = un commit. El orden es el recomendado: ninguna tarea empieza hasta que sus dependencias estén revisadas, y se delegan de una en una.

| # | Tarea | Agente | Depende de | Commit |
|---|---|---|---|---|
| 1 | Crear `package.json` con `"type": "module"`, `engines.node >= 20`, los scripts `test` (`node --test tests/`), `validar`, `importar`, `importar-dataset`, `calendario` y `creditos`, y `sharp` como `devDependency`. Añadir `herramientas/banco.json` a `.gitignore`. Crear `.nojekyll` vacío y un `creditos.html` inicial provisional, escrito a mano según 2.7 (con Special Elite bajo Apache License 2.0 y el enlace a `fonts/LICENSE-special-elite.txt`), sin imágenes y con los textos por defecto de 3.1, para que el enlace no dé 404 antes del primer lote. | archivero | — | `feat: package.json, scripts, banco privado y créditos iniciales` |
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
| 13 | `herramientas/creditos.mjs` (4.5, con `TIPOGRAFIAS` según D-40) + `tests/creditos.test.mjs` (77–81, con bancos de ejemplo). Regenerar `creditos.html` con `npm run creditos` (todavía sin imágenes) para sustituir la página provisional. | archivero | 1, 3 | `feat: generador de créditos` |
| 14 | `herramientas/importar.mjs` con el esquema de 4.1, el comportamiento sin banco de 4.4 (`--banco-nuevo`) y la regeneración de `creditos.html` | archivero | 13 | `feat: importador de imágenes` |
| 15 | `herramientas/importar-dataset.mjs` | archivero | 14 | `feat: importador de datasets` |
| 16 | `herramientas/generar-calendario.mjs` (usa `ofuscar` de `js/diario.js`; se detiene si falta el banco) | archivero | 8, 14 | `feat: generador de calendario` |
| 17 | `herramientas/validar.mjs` con los dos niveles de 4.4 (incluidos los archivos de licencia de `TIPOGRAFIAS`) y `--estricto` (criterios 51, 66–68, 74, 75–76 y 81) | archivero | 16 | `feat: validador` |
| 18 | Primer lote real de imágenes (el usuario las deja en `entrada/`): calendario de al menos 30 días desde el 2026-11-01, `creditos.html` regenerado, validación y recordatorio de la copia privada de `banco.json`. El commit incluye `casos/`, `data/` y `creditos.html`, **no** `banco.json`. | archivero | 17 | `datos: primer lote de imágenes` |
| 19 | `js/main.js`, parte 1: arranque, textos (incluido el del enlace de créditos), render de pantallas, portada, cómo jugar, error y sin casos | agente-de-campo | 5, 8–12 | `feat: arranque y pantallas` |
| 20 | `js/main.js`, parte 2: precarga, cuenta atrás, pruebas, temporizador, votos, teclado y visibilidad | agente-de-campo | 19 | `feat: partida` |
| 21 | `js/main.js`, parte 3: resultado (con la revisión de 2.3 y `final.estado_prueba`), ya jugado, compartir, medianoche, otras pestañas y localStorage bloqueado | agente-de-campo | 20 | `feat: resultado y compartir` |
| 22 | Ajustes visuales con el juego funcionando: 360, 768 y 1280 px; reduced motion; contraste; sin peticiones externas; página de créditos (criterio 82) | perito-visual | 21, 7, 13 | `estilo: ajustes finales` |
| 23 | Revisión completa contra la sección 8 (informe BLOQUEANTE / IMPORTANTE / MENOR), con el criterio 53 en GitHub Pages tras el primer despliegue | asuntos-internos | 18, 22 | — (no edita) |
| 24 | Corrección de los hallazgos, cada uno por su agente | según hallazgo | 23 | `fix: …` |

Las tareas 1, 3, 8 y 9 no dependen unas de otras.

Quedan fuera de docs/ y del plan algunos cambios que hace el usuario para reflejar D-21 y D-39:
- CLAUDE.md.
- `.claude/agents/archivero.md`, que dice que `banco.json` "se publica".
- `.claude/commands/nuevo-lote.md`: en el commit tiene que incluir `creditos.html` en lugar de `herramientas/banco.json`.
