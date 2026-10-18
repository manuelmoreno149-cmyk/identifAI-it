# identifAI-it: especificación técnica

**Versión 1.0, cerrada el 2026-10-18.** Incluye los ajustes D-37 y D-38 de ese mismo día. Cualquier cambio posterior requiere una decisión nueva en `docs/DECISIONES.md` y subir la versión (1.1, 1.2...).

Esta es la fuente de verdad técnica del proyecto. Si algo no está aquí, no se inventa: se pregunta o se registra en `docs/DECISIONES.md`.
Las reglas de `CLAUDE.md` (juego, stack y anti-trampas) prevalecen sobre este documento.

Las marcas **[D-nn]** remiten a la decisión correspondiente de `docs/DECISIONES.md`.

## 0. Glosario, convenciones y estructura

| Término | Significado |
|---|---|
| Caso del día | Las 5 pruebas de una fecha. Tiene un número `n` (Caso nº n). |
| Prueba | Una imagen dentro del caso. Su índice `i` va de 0 a 4 (en pantalla, de 1 a 5). |
| Verdad | Respuesta correcta de una prueba: `0` = auténtica (foto real), `1` = generada (IA). En el juego solo existe en memoria y ofuscada en `data/calendario.json`. |
| Voto | Lo que elige el jugador: `"autentica"` (botón REAL, tecla R) o `"generada"` (botón IA, tecla I). |
| Código de resultado | Un carácter por prueba: `A` acierto, `F` fallo, `T` tiempo agotado, `O` pestaña oculta o partida abandonada, `-` pendiente. |
| Fecha ISO | Cadena `AAAA-MM-DD` con la fecha **local** del jugador. |
| Modo | `facil` (7000 ms), `medio` (3000 ms) o `dificil` (1000 ms). |

### 0.1 Convenciones obligatorias

- **Palabras prohibidas** (`real`, `ia`, `ai`, `fake`) en ids, clases, atributos `data-*`, nombres de archivo, rutas y `alt` de todo lo publicado. Se buscan **como palabra completa** y sin distinguir mayúsculas. Para ello el nombre se trocea por cualquier carácter no alfanumérico y por cada cambio de minúscula a mayúscula, y se compara cada trozo. Única excepción literal: el nombre del proyecto `identifAI-it` (ruta de GitHub Pages y textos) [D-23]. El contenido en prosa de `CREDITOS.md` no es un nombre ni una ruta, así que queda fuera de esta regla.
- Los ids aleatorios de imagen (10 caracteres) se comprueban además **por subcadena**: si contienen `ia`, `ai`, `real` o `fake`, se genera otro.
- Para nombrar la verdad o el voto en código y marcado se usa siempre `autentica`/`generada` (o `0`/`1`). Las palabras prohibidas solo pueden aparecer en el texto visible ("REAL", "IA").
- Las rutas son siempre relativas y sin `/` inicial: `data/calendario.json`, `casos/x.webp`, `./diario.js`, `../fonts/x.woff2`, `CREDITOS.md`.
- **Ninguna petición a dominios externos**: ni CDN (tampoco Google Fonts), ni analítica, ni fuentes remotas. Todo se sirve desde el propio sitio [D-29].
- Los textos visibles salen siempre de `js/textos.js`. En `index.html` no se escribe a mano ningún texto de interfaz, salvo el `<title>` y el contenido de `<noscript>`.

### 0.2 Estructura de carpetas

| Ruta | ¿Se publica? | Contenido |
|---|---|---|
| `index.html` | sí | Todas las pantallas. |
| `.nojekyll` | sí | Archivo vacío. Hace que GitHub Pages sirva todo tal cual, sin Jekyll, incluido `CREDITOS.md` como archivo [D-38]. |
| `CREDITOS.md` | sí | Tipografías, y fuentes y licencias de las imágenes de forma agregada, sin relación con imágenes concretas [D-35]. Formato en 4.5. |
| `css/variables.css`, `css/base.css`, `css/componentes.css` | sí | Los `@font-face` van en `base.css`. |
| `fonts/` | sí | `oswald-600.woff2`, `special-elite-400.woff2`, `OFL-oswald.txt`, `OFL-special-elite.txt` [D-29]. |
| `js/` | sí | `main.js`, `juego.js`, `temporizador.js`, `diario.js`, `almacen.js`, `compartir.js`, `textos.js`. |
| `img/ui/` | sí | `sello.svg`, `huella.svg`, `lupa.svg`, `papel.svg`, `icono-acierto.svg`, `icono-fallo.svg`, `icono-tiempo.svg`. |
| `casos/` | sí | `{id}.webp`, 1080 x 1350, sin metadatos. |
| `data/calendario.json` | sí | Casos de cada día (sección 4.2). |
| `herramientas/*.mjs` | sí (en el repo) | Scripts de Node. |
| `herramientas/banco.json` | **no** (`.gitignore`) | Banco de imágenes con la verdad. Solo existe en local [D-21]. |
| `entrada/reales/`, `entrada/ia/`, `entrada/procesadas/` | **no** (`.gitignore`) | Imágenes por importar. Los nombres los fija CLAUDE.md; como no se publican, no les afecta la regla de palabras prohibidas. |
| `tests/` | sí (en el repo) | `*.test.mjs`. No dependen de `banco.json`: usan datos de ejemplo propios. |
| `package.json` | sí | `"type": "module"`, scripts y `sharp` como `devDependency` [D-15]. |
| `docs/` | sí | Esta especificación y las decisiones. |

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
| `sin-casos` | No hay caso para hoy: antes del lanzamiento o con el calendario agotado [D-24]. |
| `error` | No se pudo cargar el calendario o alguna imagen. Botón Reintentar. |

El "veredicto de cada caso" no es una pantalla aparte: es la fase `veredicto` de la pantalla `caso`, para que la imagen siga visible bajo el sello [D-05].

### 1.2 Estado del juego

Un único objeto de estado, gestionado por la función pura `transicion(estado, evento)` de `js/juego.js`. Tiene esta forma:

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
  resultados: '-----',          // 5 códigos de resultado
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
| `iniciando` | `CARGADO` `{caso, partidaHoy}` | partida de hoy `terminada` | `ya-jugado` |
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
| `cuenta-atras` | `OCULTA` | | sigue en `cuenta-atras`; main.js detiene la cuenta y la reinicia desde 3 al volver a `VISIBLE` |
| `cuenta-atras` | `FIN_CUENTA` `{fecha}` | | `caso`, `fase: 'pregunta'`, `indice: 0`, `activo: false` y se fija `fecha`. **Aquí se consume el intento del día**: main.js guarda la partida `en_curso` antes de pintar la imagen [D-26] |
| `caso/pregunta` | `PINTADA` | | `activo: true`: arranca el temporizador y desde ese momento se aceptan votos |
| `caso/pregunta` | `VOTO` `{voto}` | `activo === true` | `fase: 'veredicto'`, código `A` o `F`, `revelada` = verdad, `activo: false` |
| `caso/pregunta` | `VOTO` | `activo === false` | se ignora (la imagen aún no está pintada o el voto es repetido) |
| `caso/pregunta` | `AGOTADO` | | `fase: 'veredicto'`, código `T`, `revelada` = verdad |
| `caso/pregunta` | `OCULTA` | (con el temporizador activo o no) | `fase: 'veredicto'`, código `O`, `revelada` = verdad |
| `caso/veredicto` | `SIGUIENTE` | `indice < 4` | `caso/pregunta`, `indice + 1`, `revelada: null`, `activo: false` |
| `caso/veredicto` | `SIGUIENTE` | `indice === 4` | `resultado` (main.js guarda la partida `terminada`, la racha y la mejor racha) |
| `caso/veredicto` | `OCULTA` | | sin cambios |
| `cuenta-atras`, `caso` | `OTRA_PESTANA` | otra pestaña ha empezado o terminado la partida de esa fecha | `ya-jugado` |
| `resultado`, `ya-jugado` | `COMPARTIR` | | sin cambio de estado (main.js se encarga del efecto) |
| `ya-jugado`, `sin-casos`, `portada` | `MEDIANOCHE` | la fecha local ha cambiado | `iniciando` (se recargan los datos) |
| cualquiera | evento no listado | | sin cambios (se devuelve el mismo objeto) |

Reglas adicionales:
- **Un único intento al día para los tres modos** [D-32]. La partida se guarda por fecha, no por modo. Quien haya jugado hoy en cualquier modo ve `ya-jugado` aunque elija otro modo o recargue. En `ya-jugado` no hay selector de modo.
- **Tiempo agotado = fallo**: código `T`, que cuenta como no acierto.
- **Pestaña oculta** (`document.visibilityState === 'hidden'`) durante `caso/pregunta` = fallo (código `O`), aunque el temporizador aún no hubiera arrancado. Al volver a la pestaña se ve directamente el veredicto. Ocultar la pestaña en `veredicto`, `resultado`, `portada` y las demás pantallas no tiene efecto, salvo en `cuenta-atras`, que se reinicia [D-06, D-07].
- **Medianoche durante la partida**: la partida pertenece a la `fecha` fijada en `FIN_CUENTA`; se termina y se guarda con esa fecha. El evento `MEDIANOCHE` solo se procesa en `portada`, `ya-jugado` y `sin-casos`.
- **Veredicto**: el avance es manual, con el botón Siguiente o con Enter [D-27]. Solo la primera cuenta atrás dura 3 s; las pruebas 2 a 5 arrancan en cuanto se pulsa Siguiente.
- `resultado` solo se ve una vez, al terminar. Si se recarga la página, se ve `ya-jugado`.
- El enlace Créditos de la portada abre `CREDITOS.md` en otra pestaña, así que no cambia el estado del juego [D-37].

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
```

---

## 2. Contrato HTML/CSS

El Perito Visual crea el marcado y los estilos; el Agente de Campo solo usa los ganchos de esta sección. Ningún otro id, clase ni atributo se considera estable.

### 2.1 Mecanismo de pantallas

- `<main id="app" data-pantalla="portada" data-modo="medio">`: main.js mantiene `data-pantalla` y `data-modo` actualizados, y CSS puede usarlos.
- Cada pantalla es una `<section class="pantalla" id="pantalla-{nombre}" hidden>`. **Solo una puede estar sin `hidden` en cada momento**, y main.js es el único que cambia `hidden`.
- Al cambiar de pantalla, main.js mueve el foco al elemento con `data-foco` si existe y, si no, al primer `h1`/`h2` de la sección (que lleva `tabindex="-1"`).
- La pantalla `iniciando` no tiene sección: mientras dura, todas las secciones están `hidden`.

### 2.2 Atributos genéricos

| Atributo | Dónde | Uso |
|---|---|---|
| `data-texto="grupo.clave"` | cualquier elemento con texto fijo | Al arrancar, main.js pone `textContent = TEXTOS.grupo.clave`. En `index.html` el contenido inicial es el marcador `[[grupo.clave]]`. |
| `data-accion="..."` | `<button>` | Delegación de eventos. Valores: `empezar`, `como-jugar`, `entendido`, `siguiente`, `compartir`, `reintentar`. Varios botones pueden compartir acción (por ejemplo, `compartir` en resultado y en ya jugado). |
| `data-voto="autentica"` / `data-voto="generada"` | los dos botones de respuesta | El voto. Son fijos y no dependen de la imagen. |
| `data-foco` | como máximo un elemento por pantalla | Recibe el foco al entrar en su pantalla. |
| `data-estado="acierto\|fallo\|tiempo\|oculta"` | `#veredicto` y cada `li` de la revisión | Resultado de una prueba. No aparece mientras no hay respuesta. |
| `data-fase="pregunta\|veredicto"` | `#pantalla-caso` | Fase actual. |
| `data-nivel="normal\|critico"` | `#temporizador` | Pasa a `critico` cuando queda el 30 % del tiempo o menos. |
| `--restante` (propiedad CSS) | `#temporizador` | Número de 1 a 0. CSS fija `#temporizador { --restante: 1; }` y la cinta usa `transform: scaleX(var(--restante))`. main.js lo actualiza con `style.setProperty('--restante', f)`. El atributo `style` no se usa en el HTML porque la CSP lo bloquearía. |
| `data-visible="si\|no"` | `#compartir-aviso` | Aviso de "copiado". |

Clase utilitaria: `.solo-lectores` (oculta a la vista, accesible para lectores de pantalla). No hay más clases de estado: los estados van siempre en atributos `data-*` [D-03].

### 2.3 Elementos por pantalla

Portada (`#pantalla-portada`):
- `h1` con `data-texto="portada.titulo"` y `p` con `data-texto="portada.lema"`.
- `#portada-caso`: "Caso nº n" (lo rellena main.js con `portada.etiqueta_caso`).
- `<fieldset id="portada-modos">` con `<legend data-texto="portada.elige_modo">` y tres `<input type="radio" name="modo" value="facil|medio|dificil">`, cada uno con su `label` (nombre `portada.modo_*` y descripción `portada.desc_*`). Se presentan como fichas.
- `#portada-racha`: "Racha: n" (con `hidden` si la racha es 0).
- `button[data-accion="empezar"]` (con `data-foco`) y `button[data-accion="como-jugar"]`.
- Pie de créditos [D-37]:
  ```html
  <footer id="portada-pie">
    <a id="portada-creditos" href="CREDITOS.md" target="_blank" rel="noopener">
      <span data-texto="portada.enlace_creditos">[[portada.enlace_creditos]]</span>
      <span class="solo-lectores" data-texto="portada.nueva_pestana">[[portada.nueva_pestana]]</span>
    </a>
  </footer>
  ```
  - `href` es exactamente `CREDITOS.md`: relativo, sin barra inicial, sin `./` y con mayúsculas y minúsculas idénticas al archivo (GitHub Pages las distingue).
  - Se abre en **otra pestaña** con `target="_blank"` y `rel="noopener"`: el jugador no pierde la portada y, si algún navegador muestra el `.md` como texto plano o lo descarga, el juego sigue abierto. El texto oculto "(se abre en otra pestaña)" lo anuncia a los lectores de pantalla.
  - Estilo discreto: al final de la portada, centrado, en `--fuente-cuerpo` a 14 px como mínimo, con color atenuado que mantenga un **contraste AA de 4,5:1** sobre el fondo, subrayado siempre visible (no se distingue solo por color) y foco visible igual que el resto de controles.
  - Área táctil de **44 x 44 px como mínimo** (con relleno; el texto puede ser más pequeño), sin solaparse con los botones.
  - No es un `button` ni lleva `data-accion`: main.js no lo gestiona.

Cómo jugar (`#pantalla-como-jugar`):
- `h2 data-texto="como_jugar.titulo"`, `<ol id="como-jugar-pasos">` (main.js crea 4 `li` a partir de `TEXTOS.como_jugar.pasos`) y `button[data-accion="entendido"]`.

Cargando (`#pantalla-cargando`): `p data-texto="cargando.texto"` con `role="status"`.

Cuenta atrás (`#pantalla-cuenta-atras`): `p data-texto="cuenta_atras.aviso"` y `#cuenta-atras-numero` (`aria-live="assertive"`, con el contenido "3", "2" o "1").

Caso (`#pantalla-caso`, con `data-fase`):
- `#caso-etiqueta`: "Prueba 2/5" (`partida.etiqueta_prueba`).
- `#caso-marcador`: aciertos hasta el momento, "Aciertos: 1" (`partida.marcador`). Siempre visible durante la partida [D-31].
- `<figure id="prueba-marco">`: vacío en el HTML. main.js inserta **una** `<img class="prueba-img" alt="Prueba 2 de 5" width="1080" height="1350">` ya decodificada y la sustituye en cada prueba. Proporción 4:5 con `object-fit: contain`.
- `#veredicto` (dentro o encima de `#prueba-marco`; `hidden` en fase pregunta; `role="status"` y `aria-live="polite"`) contiene:
  - `#veredicto-sello`: vacío hasta que hay respuesta. Después muestra `TEXTOS.partida.sello_autentica` ("REAL") o `sello_generada` ("IA").
  - `#veredicto-icono`: icono de acierto, fallo o tiempo (`img/ui/icono-*.svg`), que CSS elige según `data-estado` (`oculta` usa el de tiempo).
  - `#veredicto-texto`: una variante al azar de `TEXTOS.veredictos.{acierto|fallo|tiempo|oculta}`.
- `<div id="temporizador" data-nivel="normal" aria-hidden="true">` con `<div id="temporizador-cinta">` dentro.
- `#temporizador-anuncio` (`.solo-lectores`, `aria-live="polite"`): main.js escribe "Quedan N s" cada vez que cambia el segundo entero, solo en los modos `facil` y `medio`. En `dificil` no se anuncia nada durante la prueba [D-17].
- `button[data-voto="autentica"]` (texto `partida.boton_autentica`, con `<kbd>R</kbd>`) y `button[data-voto="generada"]` (texto `partida.boton_generada`, con `<kbd>I</kbd>`). Solo se ven en fase pregunta (lo controla CSS con `data-fase`) y van en la mitad inferior de la pantalla.
- `button[data-accion="siguiente"]`: solo se ve en fase veredicto. Su texto es `partida.boton_siguiente`, o `partida.boton_ver_resultado` en la prueba 5. Recibe el foco al entrar en veredicto.

Resultado (`#pantalla-resultado`):
- `#resultado-aciertos` ("4/5"), `#resultado-mensaje`, `#resultado-cuadros` (con un `aria-label` descriptivo, por ejemplo "4 aciertos de 5"), `#resultado-racha` y `#resultado-mejor-racha`.
- `<ol id="resultado-revision">`: main.js crea 5 `li`, cada uno con `data-estado`, una miniatura `<img alt="Prueba N">` (misma ruta `casos/…`) y el texto `final.era` ("Era: REAL"), ya revelado [D-19].
- `button[data-accion="compartir"]`.

Ya jugado (`#pantalla-ya-jugado`):
- `h2 data-texto="ya_jugado.titulo"`, `#ya-jugado-aciertos`, `#ya-jugado-modo`, `#ya-jugado-cuadros`, `#ya-jugado-racha` y `#ya-jugado-cuenta-atras` (HH:MM:SS, se actualiza cada segundo, con `aria-live="off"`).
- `button[data-accion="compartir"]`.

Elementos comunes, dentro de `#app` pero fuera de las secciones (los usan resultado y ya jugado):
- `#compartir-aviso` (`aria-live="polite"`, `data-visible="no"`).
- `<textarea id="compartir-manual" readonly hidden>`, la alternativa cuando no hay portapapeles.
- `#aviso-almacen` (con `hidden` salvo que localStorage no funcione), con `data-texto="avisos.sin_guardar"`.

Sin casos (`#pantalla-sin-casos`): `p data-texto="sin_casos.texto"`.

Error (`#pantalla-error`): `#error-texto` (main.js pone `errores.calendario` o `errores.imagenes`) y `button[data-accion="reintentar"]`.

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

- La CSP `default-src 'self'` hace que el navegador bloquee cualquier recurso externo y prohíbe los `<script>`/`<style>` en línea, el atributo `style` en el HTML y las URL `data:` en CSS [D-36]. Todos los SVG se cargan como archivos de `img/ui/`. La CSP no afecta a la navegación del enlace de créditos.
- No hay ningún `<link>` a `fonts.googleapis.com`, `fonts.gstatic.com` ni a ningún otro dominio.

### 2.5 Tipografías (alojadas en el repositorio) [D-29]

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
- Solo se incluyen woff2 del subconjunto latino, que cubre á, é, í, ó, ú, ñ, ü, ¿, ¡, º y ·. Objetivo: menos de 60 KB por archivo.
- Las licencias SIL Open Font License 1.1 van junto a los archivos, en `fonts/OFL-oswald.txt` y `fonts/OFL-special-elite.txt`, y se citan en `CREDITOS.md`.
- Si el perito visual prefiere Courier Prime o Bebas Neue (opciones permitidas por su agente), debe mantener el patrón `fonts/{familia}-{peso}.woff2`, cambiar los `@font-face`, los tokens y `CREDITOS.md`, y registrarlo en DECISIONES.

### 2.6 Reglas visuales que afectan a la lógica

- A 360 x 640 px, en la pantalla `caso`, la imagen ocupa el máximo espacio posible sin provocar scroll y los botones se ven sin desplazar.
- Acierto y fallo se distinguen por icono y texto, no solo por color.
- Con `prefers-reduced-motion: reduce` no se anima el sello ni hay sacudidas. La cinta del temporizador sigue reduciéndose porque es información, no decoración.

---

## 3. Módulos JS

Todos son módulos ES sin dependencias. Las funciones marcadas como **pura** no tocan el DOM, `window`, `localStorage`, `Date.now()` ni `Math.random()`: reciben lo que necesitan por parámetro y se prueban con `node --test`. Para que Node cargue `js/*.js` como módulos, `package.json` lleva `"type": "module"` [D-15].

Grafo de importaciones (sin ciclos): `main.js` importa todos los demás; `almacen.js` y `juego.js` importan `diario.js`; `compartir.js`, `temporizador.js`, `diario.js` y `textos.js` no importan nada.

### 3.1 js/textos.js (cronista)

```js
export const TEXTOS = { ... }
```

Claves exactas (las que llevan `{x}` son plantillas):

| Grupo | Claves |
|---|---|
| `portada` | `titulo`, `lema`, `elige_modo`, `modo_facil`, `modo_medio`, `modo_dificil` ("Fácil", "Medio", "Difícil"), `desc_facil`, `desc_medio`, `desc_dificil` (incluyen los segundos), `boton_empezar`, `boton_como_jugar`, `etiqueta_caso` ("Caso nº {n}"), `racha` ("Racha: {racha}"), `enlace_creditos` ("Créditos"), `nueva_pestana` ("(se abre en otra pestaña)") |
| `como_jugar` | `titulo`, `pasos` (array de exactamente 4 cadenas; una dice que hay un solo intento al día, sea cual sea el modo), `boton_entendido` |
| `cargando` | `texto` |
| `cuenta_atras` | `aviso` |
| `partida` | `etiqueta_prueba` ("Prueba {i}/5"), `marcador` ("Aciertos: {aciertos}"), `alt_prueba` ("Prueba {i} de 5"), `boton_autentica` ("REAL"), `boton_generada` ("IA"), `sello_autentica` ("REAL"), `sello_generada` ("IA"), `quedan` ("Quedan {s} s"), `boton_siguiente`, `boton_ver_resultado` |
| `veredictos` | `acierto` (≥ 4), `fallo` (≥ 4), `tiempo` (≥ 3), `oculta` (≥ 2): arrays de cadenas |
| `final` | `mensajes` (array de exactamente 6, cuyo índice es el número de aciertos, de 0 a 5), `aciertos` ("{aciertos}/5"), `racha` ("Racha: {racha}"), `mejor_racha` ("Mejor racha: {racha}"), `era` ("Era: {sello}") |
| `ya_jugado` | `titulo`, `texto`, `proximo` ("Próximo caso en {tiempo}"), `modo` ("Modo: {modo}") |
| `sin_casos` | `texto` |
| `errores` | `calendario`, `imagenes`, `boton_reintentar` |
| `avisos` | `sin_guardar` |
| `compartir` | `boton`, `copiado`, `manual` ("Copia este texto:"), `plantilla` (exactamente la de la sección 7, sin cambios) |

Ninguna cadena supera los 90 caracteres, salvo `como_jugar.pasos`. `enlace_creditos` y `nueva_pestana` tienen el valor exacto indicado (el cronista puede proponer otro al usuario, pero no lo cambia por su cuenta).

### 3.2 js/diario.js (agente-de-campo): fechas, calendario, clave e imágenes

| Función | Tipo | Parámetros → retorno | Efectos / notas |
|---|---|---|---|
| `fechaLocal(fecha)` | pura | `Date` → `'AAAA-MM-DD'` | Usa `getFullYear`/`getMonth`/`getDate` (hora local). |
| `sumarDias(fechaISO, dias)` | pura | `string, number` → `string` | Calcula con `Date.UTC`, así que el cambio de hora no le afecta. |
| `diasEntre(desdeISO, hastaISO)` | pura | → `number` entero (negativo si `hasta` es anterior) | `Date.UTC`, división entre 86 400 000 y `Math.round`. |
| `numeroCaso(fechaISO, lanzamientoISO)` | pura | → `number` | `diasEntre(lanzamiento, fecha) + 1`. El día del lanzamiento es el caso 1 [D-28]. Puede dar ≤ 0. |
| `msHastaMedianoche(fecha)` | pura | `Date` → `number` (ms) | `new Date(a, m, d + 1) - fecha`. |
| `formatearCuentaAtras(ms)` | pura | → `'HH:MM:SS'` | Redondea al segundo hacia arriba y nunca devuelve negativos. |
| `validarCalendario(obj)` | pura | → `boolean` | Comprueba la estructura de la sección 4.2. |
| `casoDelDia(calendario, fechaISO)` | pura | → `{n, fecha, pruebas, clave}` o `null` | `null` si `n < 1`, si el día `n` no existe o si su `fecha` no coincide. |
| `rutaPrueba(id)` | pura | → `'casos/{id}.webp'` | |
| `ofuscar(verdades, n, aleatorio = Math.random)` | pura (con `aleatorio` inyectado) | `number[5], number` → `string` (8 caracteres base64) | Sección 4.3. También la usa `herramientas/generar-calendario.mjs`. |
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
| `contarAciertos(resultados)` | pura | Número de `A` en una cadena como `'AFT-O'`. |
| `estadoDeCodigo(codigo)` | pura | `'A'`→`'acierto'`, `'F'`→`'fallo'`, `'T'`→`'tiempo'`, `'O'`→`'oculta'`, `'-'`→`null`. |
| `elegirVariante(lista, aleatorio = Math.random)` | pura (con `aleatorio` inyectado) | `lista[Math.floor(aleatorio() * lista.length)]`. |
| `mensajeFinal(aciertos, mensajes)` | pura | Devuelve `mensajes[aciertos]`; lanza un error si `aciertos` no está entre 0 y 5. |
| `estadoInicial({modo, vistoComoJugar})` | pura | Estado de 1.2 con `pantalla: 'iniciando'`. |
| `transicion(estado, evento)` | pura | Implementa la tabla 1.3. Nunca muta `estado`: devuelve uno nuevo, o el mismo objeto si el evento no aplica. Eventos: `{tipo: 'CARGADO', caso, partidaHoy}`, `ERROR_CALENDARIO`, `ELEGIR_MODO {modo}`, `VER_COMO_JUGAR`, `EMPEZAR`, `ENTENDIDO`, `PRECARGA_OK`, `PRECARGA_ERROR`, `REINTENTAR`, `FIN_CUENTA {fecha}`, `PINTADA`, `VOTO {voto}`, `AGOTADO`, `OCULTA`, `SIGUIENTE`, `OTRA_PESTANA`, `MEDIANOCHE`. `caso` es lo que devuelve `casoDelDia` (o `null`) y `partidaHoy` es el registro de hoy en el almacén (o `null`). |

En `VOTO`, `AGOTADO` y `OCULTA`, `transicion` obtiene la verdad con `desofuscar(estado.clave, estado.n, estado.indice)` y la guarda en `revelada`.

### 3.4 js/temporizador.js (agente-de-campo)

| Función | Tipo | Descripción |
|---|---|---|
| `crearTemporizador({duracionMs, alTick, alAgotar, reloj = () => performance.now(), pedirFrame = requestAnimationFrame, cancelarFrame = cancelAnimationFrame})` | fábrica | Devuelve `{iniciar(), detener(), activo()}`. |
| `.iniciar()` | efecto | Guarda `t0 = reloj()` y pide frames. En cada frame calcula `transcurrido = reloj() - t0` y llama a `alTick(restanteMs, fraccion)`. Si `transcurrido >= duracionMs`, llama a `alAgotar()` **una sola vez** y se para. Nunca usa `setInterval` ni `setTimeout`. |
| `.detener()` | efecto | Cancela el frame pendiente y devuelve los ms transcurridos. Después de `detener()` nunca se llama a `alAgotar`. Llamarla varias veces no cambia nada. |
| `.activo()` | | `true` entre `iniciar()` y el agotamiento o el `detener()`. |
| `esperarPintado(pedirFrame = requestAnimationFrame)` | async | Resuelve en el **segundo** frame después de la llamada (en el primero se pinta la imagen recién insertada) [D-08]. |
| `fraccionRestante(transcurridoMs, duracionMs)` | pura | `max(0, min(1, 1 - t/d))`. |
| `nivelTemporizador(fraccion)` | pura | `'critico'` si `fraccion <= 0.3`; si no, `'normal'`. |
| `segundosRestantes(restanteMs)` | pura | `Math.ceil(restanteMs / 1000)`, con 0 como mínimo. |

Secuencia de cada prueba en main.js: insertar la `<img>` precargada → `await esperarPintado()` → si seguimos en la misma prueba y en fase `pregunta`, despachar `PINTADA` → `temporizador.iniciar()`. La cuenta atrás inicial usa el mismo temporizador con `duracionMs: 3000` y muestra `segundosRestantes`.

### 3.5 js/almacen.js (agente-de-campo)

| Función | Tipo | Descripción |
|---|---|---|
| `CLAVE` | constante | `'identifaiit.v1'`. |
| `datosIniciales()` | pura | `{version: 1, ajustes: {modo: 'medio', vistoComoJugar: false}, partidas: {}, racha: 0, mejorRacha: 0}`. |
| `leer(almacen = globalThis.localStorage)` | efecto, nunca lanza | → `{datos, disponible}`. Prueba a escribir y borrar `'identifaiit.prueba'`; si falla, devuelve `disponible: false` con los datos iniciales. Si el JSON es inválido o `version !== 1`, devuelve los datos iniciales (y `disponible` según la prueba). |
| `guardar(datos, almacen = globalThis.localStorage)` | efecto, nunca lanza | → `boolean`. Hace `setItem(CLAVE, JSON.stringify(datos))` dentro de un `try/catch`. |
| `partidaDe(datos, fechaISO)` | pura | Devuelve el registro o `null`. Busca por fecha, sin importar el modo [D-32]. |
| `conAjustes(datos, cambios)` | pura | Devuelve los datos con `cambios` mezclados en `ajustes`. |
| `registrarInicio(datos, {fecha, n, modo, sesion})` | pura | Crea `partidas[fecha] = {n, modo, estado: 'en_curso', resultados: '-----', aciertos: 0, sesion}`. Si ya existe una partida para esa fecha, en cualquier modo, devuelve `datos` sin cambios. |
| `registrarPrueba(datos, fecha, indice, codigo)` | pura | Escribe el código en la posición `indice` y actualiza `aciertos`. |
| `registrarFin(datos, fecha, hoyISO)` | pura | Pone `estado: 'terminada'` y `aciertos`, recalcula `racha = calcularRacha(partidas, hoyISO)` y `mejorRacha = max(mejorRacha, racha)`. |
| `cerrarAbandonada(datos, fecha, hoyISO)` | pura | Cambia los `-` por `O` y aplica `registrarFin`. |
| `calcularRacha(partidas, hoyISO)` | pura | Número de días consecutivos con partida `terminada` (sea cual sea la puntuación) que acaban hoy, o ayer si hoy aún no se ha jugado. Si no hay partida terminada ni hoy ni ayer, devuelve 0. Un día sin casos también rompe la racha [D-25]. |

Si localStorage falla, el juego funciona igual con los datos en memoria (main.js guarda la copia en una variable) y se muestra `#aviso-almacen`. Al recargar se podría volver a jugar; se acepta, porque sin servidor no hay otra forma [D-11].

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
1. **Arranque**: `leer()` del almacén y `estadoInicial`; rellenar todos los `[data-texto]` (también los del enlace de créditos); crear los pasos de cómo jugar; marcar el radio del modo guardado; `cargarCalendario()`. Si la partida de hoy está `en_curso`, aplicar `cerrarAbandonada` y guardar. Después, despachar `CARGADO` (con `casoDelDia(cal, fechaLocal(new Date()))` y `partidaDe(datos, hoy)`) o `ERROR_CALENDARIO`.
2. **`despachar(evento)`**: `nuevo = transicion(estado, evento)`; si ha cambiado, ejecutar los efectos de la transición y `render(nuevo)`. Es el único sitio donde se asigna el estado.
3. **`render(estado)`**: `hidden` de las secciones; `data-pantalla`, `data-modo` y `data-fase`; etiquetas y marcador; `#veredicto` (`data-estado`, sello y texto solo en fase veredicto; en fase pregunta, `#veredicto-sello` vacío y sin `data-estado`); resultado; ya jugado.
4. **Efectos**: precarga al entrar en `cargando`; cuenta atrás. En `FIN_CUENTA`, crear una `sesion` (cadena aleatoria de 8 caracteres `[a-z0-9]`), llamar a `registrarInicio` y guardar **antes** de mostrar la primera imagen. Después: insertar la imagen, `esperarPintado`, `PINTADA` y temporizador; detener el temporizador al votar o al ocultarse la pestaña; `registrarPrueba` y guardar tras cada veredicto; `registrarFin` y guardar al entrar en `resultado`.
5. **Entrada**: clics en `[data-voto]` y `[data-accion]` (delegación en `#app`) y `change` en `input[name=modo]`. Teclado (`keydown` en `document`, ignorando `e.repeat` y las teclas con Ctrl, Alt o Meta): `r`/`R` → `VOTO autentica` e `i`/`I` → `VOTO generada`, solo en `caso/pregunta`; `Enter` → `SIGUIENTE`, solo en `caso/veredicto` y si el foco no está en un `button` ni en un enlace (para no duplicar la acción nativa).
6. **`visibilitychange`**: al ocultarse la pestaña → `OCULTA`. Al volver a estar visible: en `cuenta-atras`, reiniciarla; en `portada`, `ya-jugado` o `sin-casos`, si la fecha local ha cambiado, `MEDIANOCHE`. Abrir los créditos en otra pestaña oculta esta, pero en `portada` no tiene efecto.
7. **Medianoche**: en `ya-jugado`, la cuenta atrás se actualiza cada segundo con `setTimeout` encadenado (no es el temporizador de juego). Al llegar a 0, `MEDIANOCHE`.
8. **Otras pestañas**: escuchar el evento `storage`. Si durante `cuenta-atras` o `caso` el registro de la fecha actual aparece con otra `sesion`, o como `terminada` sin que esta pestaña lo haya terminado, `OTRA_PESTANA`. Justo antes de `FIN_CUENTA` se vuelve a leer el almacén: si ya hay partida de hoy (en cualquier modo), `OTRA_PESTANA`.
9. **Compartir**: construir el texto y llamar a `compartir()`. Según el resultado, mostrar `#compartir-aviso` durante 2 s (`copiado`) o `#compartir-manual` con el texto seleccionado (`manual`).
10. **Errores**: `try/catch` en el arranque; cualquier fallo de carga lleva a `error`. Nada de `console.log` en producción (sí `console.error` ante fallos reales).

---

## 4. Datos

### 4.1 herramientas/banco.json (privado, solo en local) [D-21]

- Está en `.gitignore` y **nunca se sube** al repositorio ni a GitHub Pages. Solo lo leen y escriben los scripts de `herramientas/` en el equipo del usuario. El juego no lo carga jamás.
- Es la única fuente de `tipo`, `categoria`, `fuente` y `licencia`. Conviene guardar una copia privada fuera del repositorio después de cada lote; el archivero lo recuerda en su resumen.
- Si se pierde, el calendario publicado sigue funcionando y el tipo de las imágenes ya usadas se puede recuperar con `desofuscar` sobre `data/calendario.json`. En cambio, se pierden categorías, fuentes y licencias, y no se pueden generar días nuevos con las imágenes antiguas (ver 4.4).

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
| `id` | string | 10 caracteres `[a-z0-9]`, único. El archivo es `casos/{id}.webp`. Si contiene la subcadena `ia`, `ai`, `real` o `fake`, se genera otro. |
| `tipo` | `"autentica" \| "generada"` | Verdad de la imagen. |
| `categoria` | string | En minúsculas y sin espacios (`retrato`, `calle`, `animal`, `comida`, `paisaje`, `objeto`, `interior`...). |
| `fuente`, `licencia` | string | Vienen del `lote.json` de importación. Sin licencia no se importa. Se publican solo de forma agregada en `CREDITOS.md` (4.5). |
| `dhash` | string | 16 caracteres hexadecimales (64 bits). Hay duplicado si la distancia de Hamming es ≤ 5. |
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
- `version` es 1 y `lanzamiento` es `"2026-11-01"` [D-20].
- `dias` está ordenado por `n` y sin huecos: `dias[k].n === k + 1` y `fecha === sumarDias(lanzamiento, n - 1)`.
- `pruebas`: exactamente 5 ids distintos que existen en `casos/`. Ningún id se repite en todo el calendario mientras queden imágenes sin usar en el banco.
- `clave`: 8 caracteres base64 que codifican 5 bytes (sección 4.3). Cada día tiene entre 1 y 4 verdades `1` (generada); se puede comprobar sin el banco, desofuscando.
- No hay más de 2 pruebas de la misma `categoria` por día (solo se puede comprobar con el banco). El orden de las 5 pruebas es aleatorio.
- `generar-calendario.mjs` solo añade días a partir de mañana; nunca modifica hoy ni días pasados.
- El archivo no contiene ningún otro campo (nada de `tipo`, `fuente` ni `categoria`).

Nota: la clave `"Ax7Pq1E="` del día 2 es ilustrativa; la del día 1 es el vector de prueba real de 4.3.

### 4.3 Ofuscación de la respuesta [D-22]

No es seguridad: solo evita que la respuesta se lea a simple vista con las herramientas del navegador.

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
- `btoa` y `atob` existen en el navegador y en Node 20, de modo que la misma función sirve en `js/diario.js` y en `herramientas/generar-calendario.mjs`, que la importa de `../js/diario.js` [D-14].
- Vector de prueba: `ofuscar([0, 1, 1, 0, 1], 1, () => 0) === 'Mpb9Ycc='` (bytes `32 96 FD 61 C7`), y `desofuscar('Mpb9Ycc=', 1, i)` devuelve `0, 1, 1, 0, 1` para `i = 0..4`.
- La verdad solo se calcula en `transicion`, al corregir, y en la revisión final. Nunca se escribe en el DOM, en atributos ni en `localStorage`.

### 4.4 Flujo de las herramientas y ausencia de banco.json [D-21, D-34]

| Script | Lee | Escribe | Si `herramientas/banco.json` no existe |
|---|---|---|---|
| `importar.mjs` (`npm run importar`) | `entrada/reales/`, `entrada/ia/`, `banco.json` | `casos/`, `banco.json` y `CREDITOS.md` (4.5); mueve los originales a `entrada/procesadas/` | Si `casos/` está vacío, crea un banco nuevo vacío y lo anuncia. Si `casos/` ya tiene imágenes, **se detiene** (código de salida 1) con el mensaje "No se encuentra herramientas/banco.json, que es privado y no está en el repo. Restaura tu copia o usa --banco-nuevo si sabes lo que haces." Con `--banco-nuevo` crea uno vacío; las imágenes antiguas de `casos/` quedan fuera del banco y no vuelven a usarse. |
| `importar-dataset.mjs` | carpeta del dataset | `entrada/` y luego llama a `importar.mjs` | Igual que `importar.mjs`. |
| `generar-calendario.mjs` (`npm run calendario`) | `banco.json`, `data/calendario.json` | `data/calendario.json` y el campo `usada` de `banco.json` | **Se detiene** (código de salida 1) con el mensaje "No se encuentra herramientas/banco.json (es privado y no se publica). Sin él no se pueden generar días nuevos. Restaura tu copia o importa imágenes con npm run importar." No toca el calendario. |
| `validar.mjs` (`npm run validar`) | `data/calendario.json`, `casos/`, todo lo publicado y `banco.json` si existe | nada | Ejecuta todas las comprobaciones de lo publicado y muestra un aviso bien visible: "AVISO: herramientas/banco.json no encontrado; se omiten las comprobaciones que dependen del banco (categorías, equilibrio, coherencia de tipos)." Termina con código 0 si lo demás pasa. Con `--estricto`, la falta del banco es un error (código 1). |

Comprobaciones de `validar.mjs`:
- **Sin banco** (funcionan en un clon limpio del repositorio):
  - Las imágenes del calendario existen, son WebP de 1080 x 1350 y no tienen metadatos (EXIF, XMP, ICC ni C2PA).
  - `n` y `fecha` son coherentes, y cada clave decodifica a 5 bytes con entre 1 y 4 generadas.
  - Ningún nombre, ruta, id, clase, `data-*` ni `alt` publicado contiene palabras prohibidas.
  - `herramientas/banco.json` **no** está rastreado por git (`git ls-files --error-unmatch herramientas/banco.json` debe fallar) y figura en `.gitignore`.
  - No hay URL externas (`http://`, `https://`, `//`) en `index.html`, `css/` ni `js/`.
  - Existen los `fonts/*.woff2` referenciados y sus `OFL-*.txt`.
  - Existen `.nojekyll` y `CREDITOS.md` en la raíz, todo `href` relativo de `index.html` apunta a un archivo existente (con las mismas mayúsculas) y `CREDITOS.md` no contiene ningún id de imagen de `casos/`.
  - Aviso si quedan menos de 30 días de calendario.
- **Con banco**:
  - Todos los ids del calendario están en el banco con `usada` igual a su fecha.
  - Los tipos del banco coinciden con `desofuscar` del calendario.
  - No hay más de 2 pruebas de la misma categoría por día.
  - `CREDITOS.md` incluye todas las parejas fuente-licencia de las imágenes publicadas.
  - Aviso si el banco tiene más de un 60 % de un tipo, o si hay imágenes en `casos/` que no están en el banco.

`npm test` no lee `banco.json` en ningún caso.

### 4.5 CREDITOS.md (público, raíz del repositorio) [D-35, D-37]

Lo regenera entero `importar.mjs` después de cada importación, a partir del banco. Hasta el primer lote existe una versión inicial que crea el archivero en la tarea 1, para que el enlace de la portada nunca dé 404. Formato exacto:

```markdown
# Créditos

identifAI-it es un proyecto personal. Este archivo se genera automáticamente.

## Tipografías

- Oswald: SIL Open Font License 1.1. Aviso de copyright y licencia en fonts/OFL-oswald.txt.
- Special Elite: SIL Open Font License 1.1. Aviso de copyright y licencia en fonts/OFL-special-elite.txt.

## Imágenes

Las pruebas proceden de las fuentes siguientes. La lista no indica qué imagen viene de cada fuente.

- {fuente} · {licencia}
```

- En `## Imágenes` hay una línea por pareja distinta `fuente` · `licencia` de las imágenes que aparecen en el calendario, ordenadas alfabéticamente y sin recuentos, ids, tipos, categorías ni fechas.
- En la versión inicial (antes del primer lote), la sección `## Imágenes` contiene solo la línea `Todavía no hay imágenes publicadas.`
- Con `.nojekyll`, GitHub Pages sirve el archivo tal cual en `CREDITOS.md`, sin convertirlo a HTML. Se lee como texto en otra pestaña [D-38].
- Si cambian las tipografías (2.5), se actualiza la sección `## Tipografías` del generador.

---

## 5. Algoritmo diario

1. `hoy = fechaLocal(new Date())`: el día cambia a medianoche, hora local, como pide CLAUDE.md.
2. `n = numeroCaso(hoy, calendario.lanzamiento) = diasEntre(lanzamiento, hoy) + 1`. Con lanzamiento el 2026-11-01, ese día es el caso 1; el 2026-11-02, el 2; y el 2027-03-28 (día del cambio de hora), el 148.
3. `caso = casoDelDia(calendario, hoy)`: busca `dias[n - 1]` y comprueba que `n` y `fecha` coinciden.
4. Si `caso === null` (antes del lanzamiento, `n < 1`, o con el calendario agotado), se muestra la pantalla `sin-casos` [D-24]. No se usa una semilla sobre el banco, porque el banco es privado y reciclar días daría respuestas ya conocidas. `validar.mjs` avisa cuando quedan menos de 30 días para que no se llegue a esta situación.
5. Todos los jugadores con la misma fecha local ven el mismo caso. En zonas horarias distintas, el cambio llega en momentos distintos (como en Wordle).
6. Un solo intento por fecha, sea cual sea el modo elegido [D-32].
7. Cambiar la hora del dispositivo permite adelantar días. Se acepta, porque sin servidor no se puede impedir [D-18].

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

- `partidas` va **por fecha ISO**: una por día, sea cual sea el modo. Cada partida guarda el número de caso, el modo jugado, el estado (`en_curso` | `terminada`), los códigos por prueba, los aciertos y la sesión (que identifica la pestaña). Nunca se guarda la verdad ni el voto.
- `racha` y `mejorRacha` se recalculan en `registrarFin`. La racha que muestra la portada se recalcula con `calcularRacha`, para que caduque si el jugador falta un día.
- Clave de prueba de disponibilidad: `identifaiit.prueba` (se escribe y se borra al arrancar).
- Versiones futuras: nueva clave `identifaiit.v2`. Al arrancar, si no existe y sí existe la `v1`, se migra y se borra la antigua. En v1 no hay migraciones.
- Si localStorage no está disponible (modo privado, bloqueado o cuota llena), ninguna función lanza: el juego funciona con datos en memoria y se muestra `#aviso-almacen`. En ese caso no se puede garantizar el intento único entre recargas.
- No se usan cookies, sessionStorage ni IndexedDB.

---

## 7. Compartir [D-30]

Plantilla exacta de `TEXTOS.compartir.plantilla`, como literal de JS:

```js
plantilla: 'identifAI-it · Caso nº {caso} · {modo}\n{aciertos}/5 {cuadros}\nRacha: {racha}\n{url}'
```

- 4 líneas separadas por `\n` (LF, sin `\r`).
- `·` es U+00B7 (punto medio), con un espacio normal a cada lado.
- `º` es U+00BA (indicador ordinal masculino), no el símbolo de grado `°`.
- Marcadores:
  - `{caso}`: `n` sin ceros a la izquierda.
  - `{modo}`: `TEXTOS.portada.modo_*` del modo jugado ("Fácil", "Medio" o "Difícil").
  - `{aciertos}`: número de 0 a 5.
  - `{cuadros}`: `cuadros(resultados)`, 5 emojis seguidos sin espacios, en el orden de las pruebas.
  - `{racha}`: racha tras terminar la partida.
  - `{url}`: `urlDelJuego()`.
- Sin espacios ni salto de línea al final.

Ejemplo literal completo para el caso 12, modo difícil, resultados `AAFAT`, racha 3 y juego publicado en `https://usuario.github.io/identifAI-it/`. El texto es exactamente:

```
identifAI-it · Caso nº 12 · Difícil
4/5 🟩🟩🟥🟩⬛
Racha: 3
https://usuario.github.io/identifAI-it/
```

- Solo indica acierto o fallo por posición: **no** revela qué pruebas eran IA. Tiempo agotado y pestaña oculta usan el mismo cuadro (`⬛`) [D-13].

`compartir(texto, nav)`:
1. Si existe `nav.share`, se llama a `await nav.share({ text: texto })` y se devuelve `'compartido'`. Si rechaza con `AbortError`, se devuelve `'cancelado'` (no se muestra nada). Si rechaza con otro error, se pasa al paso 2.
2. Si existe `nav.clipboard?.writeText`, se llama a `await nav.clipboard.writeText(texto)` y se devuelve `'copiado'`. main.js muestra `TEXTOS.compartir.copiado` durante 2 s en `#compartir-aviso`.
3. Si no hay portapapeles o falla, se devuelve `'manual'`: main.js muestra `#compartir-manual` con el texto seleccionado.

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
8. `casoDelDia` devuelve `null` antes del lanzamiento, en un día posterior al último y cuando la `fecha` del día no coincide.
9. `validarCalendario` rechaza: menos o más de 5 pruebas, `n` con huecos, una clave que no decodifica a 5 bytes y campos extra.
10. `precargar` rechaza si una imagen falla. Con 5 correctas, resuelve con 5 imágenes cuyo `decode()` ha terminado, sin tocar el DOM.

### 8.2 juego.js
11. `transicion` no muta el estado recibido (test con `Object.freeze` profundo).
12. `EMPEZAR` con `vistoComoJugar: false` lleva a `como-jugar`, y `ENTENDIDO`, a `cargando`. Con `true`, lleva directamente a `cargando`.
13. `VOTO` con `activo: false` devuelve el mismo objeto de estado.
14. `VOTO` correcto → código `A`; incorrecto → `F`; `AGOTADO` → `T`; `OCULTA` en `caso/pregunta` → `O`. En todos los casos queda `fase: 'veredicto'` y `revelada` = verdad.
15. Un segundo `VOTO` o un `AGOTADO` en fase `veredicto` no cambia el estado.
16. `SIGUIENTE` en la prueba 5 lleva a `resultado`; en las demás, a la siguiente prueba con `revelada: null`.
17. `CARGADO` con una partida de hoy `terminada`, en cualquier modo, lleva a `ya-jugado` aunque el modo de los ajustes sea otro. Con `caso: null`, lleva a `sin-casos`.
18. `contarAciertos('AFTOA')` → 2. `mensajeFinal(k, mensajes)` devuelve el mensaje de índice k para k de 0 a 5. `mensajeFinal(6, …)` lanza un error.
19. `OCULTA` en `cuenta-atras`, `veredicto`, `resultado` o `portada` no cambia los resultados.

### 8.3 temporizador.js
20. Con reloj y frames simulados cada 16,7 ms y `duracionMs: 1000`, `alAgotar` se llama una sola vez, en el primer frame con transcurrido ≥ 1000 (entre 1000 y 1017 ms).
21. Después de `detener()`, `alAgotar` no se llama nunca, aunque sigan llegando frames.
22. `fraccionRestante(1500, 3000)` → 0,5; `(4000, 3000)` → 0; `nivelTemporizador(0.3)` → `'critico'`; `(0.31)` → `'normal'`; `segundosRestantes(2001)` → 3.
23. El módulo no contiene `setInterval` ni `setTimeout`.
24. En el navegador, en modo difícil, el veredicto `tiempo` se muestra entre 1000 y 1050 ms después del frame en que se pinta la imagen (medido con `performance.now()` en `PINTADA` y en `AGOTADO`). En fácil, entre 7000 y 7050 ms; en medio, entre 3000 y 3050 ms.
25. Ningún voto (clic o tecla) hecho antes de `PINTADA` cuenta.

### 8.4 almacen.js
26. Con un almacén falso que lanza en `setItem`/`getItem`, `leer` devuelve `{datos: datosIniciales(), disponible: false}` y `guardar` devuelve `false`, sin lanzar.
27. Un JSON corrupto o `version: 2` en `identifaiit.v1` da los datos iniciales.
28. `registrarInicio` sobre una fecha que ya tiene partida, aunque sea en otro modo, no la modifica.
29. `cerrarAbandonada` convierte `'AF---'` en `'AFOOO'`, con estado `terminada` y 1 acierto.
30. `calcularRacha`: con terminadas el 01, el 02 y el 03, y hoy 03 → 3; hoy 04 sin jugar → 3; hoy 05 → 0. Con terminadas el 01 y el 03, y hoy 03 → 1. Una partida `en_curso` no cuenta.
31. `mejorRacha` nunca disminuye.
32. Ningún dato guardado contiene la verdad ni el voto de una prueba.

### 8.5 compartir.js
33. `cuadros('AAFAT')` → `'🟩🟩🟥🟩⬛'`; `cuadros('AOFAT')` → `'🟩⬛🟥🟩⬛'`.
34. `textoCompartir` con la plantilla de la sección 7, `n: 12`, `nombreModo: 'Difícil'`, `resultados: 'AAFAT'`, `racha: 3` y `url: 'https://usuario.github.io/identifAI-it/'` es estrictamente igual (`===`) al ejemplo literal de la sección 7.
35. El texto compartido no contiene "IA" como palabra suelta, ni "REAL", "autentica", "generada" o ids de imagen. La única excepción es el nombre del proyecto, "identifAI-it".
36. `compartir` devuelve `'compartido'` si `share` resuelve; `'cancelado'` si rechaza con `AbortError`; `'copiado'` si no hay `share` pero sí portapapeles; `'manual'` si no hay ninguno de los dos. Nunca lanza.
37. `urlDelJuego({origin: 'https://u.github.io', pathname: '/identifAI-it/index.html'})` → `'https://u.github.io/identifAI-it/'`.

### 8.6 textos.js
38. Están todas las claves de 3.1, incluidas `portada.enlace_creditos === 'Créditos'` y `portada.nueva_pestana`. Además, `final.mensajes.length === 6` y `como_jugar.pasos.length === 4`. `veredictos.acierto` y `veredictos.fallo` tienen 4 o más variantes, `tiempo` 3 o más y `oculta` 2 o más.
39. Ninguna cadena (salvo `como_jugar.pasos`) supera los 90 caracteres.
40. `compartir.plantilla` es exactamente igual a la cadena de la sección 7.

### 8.7 index.html, CSS, fuentes y créditos
41. Existen todos los ids y atributos de la sección 2, y ningún id ni clase contiene palabras prohibidas (por palabra completa, según 0.1).
42. En todo momento hay como máximo una sección `.pantalla` sin `hidden`. Antes de que cargue el JS no hay ninguna, y sin JS se ve el `<noscript>`.
43. A 360 x 640 px, en la pantalla `caso`, no hay scroll horizontal y la imagen y los dos botones se ven sin desplazar.
44. El texto y los botones cumplen el contraste AA (4,5:1 para texto normal; 3:1 para texto grande e iconos), y todos los controles tienen el foco visible.
45. Con `prefers-reduced-motion: reduce` no hay animación del sello ni sacudidas.
46. Todas las rutas (`css/`, `js/`, `fonts/`, `img/ui/`, `data/`, `casos/` y `CREDITOS.md`) son relativas, y el juego funciona servido bajo `/identifAI-it/`.
47. Antes de responder, el DOM no contiene la verdad: `#veredicto-sello` está vacío, `#veredicto` no tiene `data-estado`, y ningún atributo, `alt`, clase ni ruta de la imagen cambia según la verdad.
48. En la pestaña Red, al cargar y jugar una partida completa, **todas** las peticiones van al mismo origen; ninguna va a `fonts.googleapis.com`, `fonts.gstatic.com` ni a otro dominio. `index.html`, `css/` y `js/` no contienen `http://`, `https://` ni `//` como URL de recurso.
49. `index.html` lleva la CSP de 2.4, y la consola no muestra ninguna violación de CSP durante una partida completa.
50. Las dos fuentes se cargan desde `fonts/` (aparecen en Red con estado 200). Si se borran los woff2, el juego sigue siendo legible con las fuentes del sistema de respaldo.
51. Existen `fonts/OFL-oswald.txt` y `fonts/OFL-special-elite.txt` con el texto completo de la SIL OFL 1.1 y el aviso de copyright de cada familia.
52. La portada tiene `a#portada-creditos` dentro de `footer#portada-pie`, con `href="CREDITOS.md"` exacto (sin `/` inicial), `target="_blank"` y `rel="noopener"`. Su texto visible es `TEXTOS.portada.enlace_creditos` y lleva el texto `.solo-lectores` de otra pestaña. Ni sus ids ni su ruta contienen palabras prohibidas. Su área táctil mide al menos 44 x 44 px, el contraste con el fondo es de al menos 4,5:1, está subrayado y tiene el foco visible. Se alcanza con Tab después de los botones de la portada.
53. `CREDITOS.md` existe en la raíz desde la tarea 1. Con `npx serve` y en GitHub Pages, el enlace abre en otra pestaña el contenido de `CREDITOS.md` con estado 200, nunca un 404. Tras el primer despliegue se comprueba en Chrome para Android y en Firefox de escritorio que se muestra como texto.

### 8.8 main.js (pruebas manuales con `npx serve`)
54. Se juega una partida completa en cada modo con ratón, con teclado (R, I, Enter) y en un móvil de 360 px.
55. Recargar durante la prueba 3 lleva a `ya-jugado`, con las pruebas 3 a 5 contadas como `O`.
56. Recargar en `portada`, `como-jugar` o `cargando` permite jugar con normalidad (el intento no se ha consumido).
57. Tras terminar en modo fácil, recargar (o cambiar de modo, si se llegara a la portada) lleva a `ya-jugado`. Ese día no hay forma de jugar otra vez en ningún modo.
58. Cambiar de pestaña durante una prueba hace que, al volver, se vea el veredicto `oculta`, que cuenta como fallo.
59. Abrir una segunda pestaña después de terminar lleva a `ya-jugado`. Si se empieza en dos pestañas a la vez, la segunda que llegue a `FIN_CUENTA` pasa a `ya-jugado`.
60. Con localStorage bloqueado, el juego se puede jugar entero, aparece `#aviso-almacen` y no hay errores en la consola.
61. Con una imagen inexistente en el calendario se llega a la pantalla `error`. Reintentar vuelve a intentar la precarga y el intento no se consume.
62. Con la fecha del sistema fuera del calendario se ve `sin-casos`.
63. En `ya-jugado`, cuando la cuenta atrás llega a 0, se pasa a la `portada` del día siguiente sin recargar.
64. En la pestaña Red, las 5 imágenes se piden antes de la cuenta atrás, y ninguna petición contiene la verdad.
65. En un móvil, Compartir abre la hoja de compartir. En escritorio sin `share`, copia el texto y muestra el aviso.

### 8.9 Herramientas (archivero)
66. `npm run validar` falla en cualquiera de estos casos:
    - Una imagen del calendario no existe, no es WebP de 1080 x 1350 o tiene EXIF, XMP, ICC o C2PA.
    - Algún nombre, ruta o campo publicado contiene una palabra prohibida.
    - Un día tiene 0 o 5 generadas, o `fecha` y `n` no cuadran.
    - `herramientas/banco.json` está rastreado por git o falta en `.gitignore`.
    - Hay URL externas en `index.html`, `css/` o `js/`.
    - Faltan `.nojekyll` o `CREDITOS.md`, o un `href` relativo de `index.html` apunta a un archivo inexistente.
    - `CREDITOS.md` contiene un id de imagen.
    - Si hay banco, además: un día tiene más de 2 pruebas de la misma categoría, un tipo del banco no coincide con la clave o falta en `CREDITOS.md` alguna pareja fuente-licencia publicada.
67. En un clon limpio del repositorio (sin `banco.json`), `npm run validar` muestra el aviso de banco ausente, ejecuta el resto de comprobaciones y termina con código 0 si pasan. `npm run validar -- --estricto` termina con código 1.
68. `npm run validar` avisa, sin fallar, si quedan menos de 30 días de calendario o si el banco tiene más de un 60 % de un tipo.
69. `npm run calendario` sin `banco.json` termina con código 1, muestra el mensaje de 4.4 y no modifica `data/calendario.json`.
70. Ejecutar `npm run calendario` dos veces seguidas no cambia ningún día ya existente.
71. `npm run importar` sin `banco.json` y con imágenes en `casos/` se detiene con el mensaje de 4.4. Sin un `lote.json` con licencia, no importa nada y lo avisa. Una imagen duplicada (dHash ≤ 5) se descarta.
72. `npm test` pasa con Node 20 en un clon limpio, sin `banco.json` y sin más dependencias que `sharp`.
73. Después de un lote, `git status` nunca muestra `herramientas/banco.json`.
74. Tras `npm run importar`, `CREDITOS.md` sigue el formato de 4.5: mantiene la sección de tipografías y lista las parejas fuente · licencia ordenadas, sin ids, tipos ni recuentos.

---

## 9. Plan de tareas

Una tarea = un commit. El orden es el recomendado: ninguna tarea empieza hasta que sus dependencias están revisadas, y se delegan de una en una.

| # | Tarea | Agente | Depende de | Commit |
|---|---|---|---|---|
| 1 | `package.json` con `"type": "module"`, `engines.node >= 20`, los scripts `test` (`node --test tests/`), `validar`, `importar`, `importar-dataset` y `calendario`, y `sharp` como `devDependency`. Añadir `herramientas/banco.json` a `.gitignore`. Crear `.nojekyll` vacío y el `CREDITOS.md` inicial (4.5, con "Todavía no hay imágenes publicadas.") para que el enlace no dé 404 antes del primer lote. | archivero | — | `feat: package.json, scripts, banco privado y créditos iniciales` |
| 2 | Fuentes: descargar Oswald 600 y Special Elite 400 en woff2 (subconjunto latino) de una fuente oficial con licencia OFL, sin añadir dependencias. Por ejemplo: `npm pack @fontsource/oswald` y `npm pack @fontsource/special-elite` en una carpeta temporal, copiar el `.woff2` latino y el `LICENSE`, y borrar lo temporal. Guardarlas como `fonts/oswald-600.woff2`, `fonts/special-elite-400.woff2`, `fonts/OFL-oswald.txt` y `fonts/OFL-special-elite.txt`. Si no hay red, pedir los archivos al usuario. | archivero | 1 | `feat: fuentes locales con licencia OFL` |
| 3 | `js/textos.js` con todas las claves de 3.1 (incluidas `portada.enlace_creditos` y `portada.nueva_pestana`) y la plantilla exacta de la sección 7. Mostrar al usuario los 6 mensajes finales para que los apruebe. | cronista | — | `feat: textos del juego` |
| 4 | `css/variables.css` (tokens, incluidos los de fuente de 2.5) y `css/base.css` (`@font-face` de 2.5, reset, tipografía y layout móvil primero) | perito-visual | 2 | `estilo: tokens, fuentes y base` |
| 5 | `index.html` nuevo con la cabecera de 2.4 (CSP, sin enlaces externos), todas las secciones y los ganchos de la sección 2, incluido el pie `#portada-pie` con `#portada-creditos`. Sustituye por completo al prototipo actual [D-01]. | perito-visual | 4 | `feat: estructura de pantallas` |
| 6 | `css/componentes.css`: fichas de modo, botones, marco de prueba, temporizador, sello, veredicto, resultado, avisos y pie con el enlace de créditos (estilo discreto de 2.3: 44 x 44 px, contraste AA, subrayado y foco) | perito-visual | 5 | `estilo: componentes` |
| 7 | `img/ui/`: los SVG de 0.2 (sello, huella, lupa, papel e iconos de acierto, fallo y tiempo) | perito-visual | 6 | `estilo: iconos y texturas` |
| 8 | `js/diario.js` (funciones puras y de carga) + `tests/diario.test.mjs` (criterios 1–10) | agente-de-campo | 1 | `feat: fechas, calendario y clave` |
| 9 | `js/temporizador.js` + `tests/temporizador.test.mjs` (20–23) | agente-de-campo | 1 | `feat: temporizador` |
| 10 | `js/juego.js` + `tests/juego.test.mjs` (11–19) | agente-de-campo | 8 | `feat: máquina de estados` |
| 11 | `js/almacen.js` + `tests/almacen.test.mjs` (26–32) | agente-de-campo | 8 | `feat: almacenamiento` |
| 12 | `js/compartir.js` + `tests/compartir.test.mjs` (33–37) y `tests/textos.test.mjs` (38–40) | agente-de-campo | 3 | `feat: compartir` |
| 13 | `herramientas/importar.mjs` con el esquema de 4.1, el comportamiento sin banco de 4.4 (`--banco-nuevo`) y la regeneración de `CREDITOS.md` según 4.5 | archivero | 1 | `feat: importador de imágenes` |
| 14 | `herramientas/importar-dataset.mjs` | archivero | 13 | `feat: importador de datasets` |
| 15 | `herramientas/generar-calendario.mjs` (usa `ofuscar` de `js/diario.js`; se detiene si falta el banco) | archivero | 8, 13 | `feat: generador de calendario` |
| 16 | `herramientas/validar.mjs` con los dos niveles de 4.4 y `--estricto` (criterios 66–68 y 74) | archivero | 15 | `feat: validador` |
| 17 | Primer lote real de imágenes (el usuario las deja en `entrada/`), calendario de al menos 30 días desde el 2026-11-01, `CREDITOS.md` regenerado, validación y recordatorio de la copia privada de `banco.json`. El commit incluye `casos/`, `data/` y `CREDITOS.md`, **no** `banco.json`. | archivero | 16 | `datos: primer lote de imágenes` |
| 18 | `js/main.js`, parte 1: arranque, textos (incluidos los del pie de créditos), render de pantallas, portada, cómo jugar, error y sin casos | agente-de-campo | 5, 8–12 | `feat: arranque y pantallas` |
| 19 | `js/main.js`, parte 2: precarga, cuenta atrás, pruebas, temporizador, votos, teclado y visibilidad | agente-de-campo | 18 | `feat: partida` |
| 20 | `js/main.js`, parte 3: resultado, ya jugado, compartir, medianoche, otras pestañas y localStorage bloqueado | agente-de-campo | 19 | `feat: resultado y compartir` |
| 21 | Ajustes visuales con el juego funcionando: 360, 768 y 1280 px; reduced motion; contraste; sin peticiones externas; enlace de créditos | perito-visual | 20, 7 | `estilo: ajustes finales` |
| 22 | Revisión completa contra la sección 8 (informe BLOQUEANTE / IMPORTANTE / MENOR), con la comprobación del criterio 53 tras el primer despliegue | asuntos-internos | 17, 21 | — (no edita) |
| 23 | Corrección de los hallazgos, cada uno por su agente | según hallazgo | 22 | `fix: …` |

Las tareas 1, 3, 8, 9 y 13 no dependen unas de otras.

Fuera de docs/ y fuera del plan: el usuario actualiza CLAUDE.md, `.claude/agents/archivero.md` (dice que `banco.json` "se publica") y `.claude/commands/nuevo-lote.md` (incluye `herramientas/banco.json` en el commit; debe incluir `CREDITOS.md` en su lugar), para que reflejen D-21 y D-35.
