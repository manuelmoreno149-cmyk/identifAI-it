# identifAI-it: especificación técnica, versión 3.0 · 10. Páginas para buscadores, archivo de casos y hueco de anuncios

Parte de la especificación 3.0 (índice en `docs/ESPECIFICACION.md`) [D-171]. **Anexo sin subir versión**: no cambia las reglas de ningún reto, la tabla de estados y eventos (1.3), los formatos de datos (calendario v5, `data/facts/` v2), el almacén `identifaiit.v3`, las plantillas de compartir ni la ofuscación. Añade páginas estáticas, cambia la dirección del juego (`/en/` y `/es/`) y los efectos de `CAMBIAR_IDIOMA` en main.js, y reserva un hueco vacío para anuncios. Criterios en `8c-criterios-paginas.md` (291–330) y tareas en `9c-tareas-paginas.md` (105–126). Decisiones D-171 a D-185; pendientes DP-72 a DP-95.

**Manda sobre** 0.2 (estructura), 2.1 (efecto del selector), 2.3 (pie de la portada, huecos), 2.4 (cabecera de `index.html`), 2.7 (créditos), 3.7 (arranque y efectos de main.js), 4.5/4.23 (`creditos.mjs`) y los ejemplos de URL de 7 y 4.24, donde difieran. Varias cosas contradicen `CLAUDE.md` (rutas absolutas en metadatos, archivo publicado en claro, estructura, scroll en páginas de contenido): **hasta que el usuario apruebe el texto de 9.15 (requisito P8, DP-72) nadie implementa las fases 3 a 6.**

---

## 10.1 Mapa del sitio y direcciones [D-172, D-176]

Dominio: `https://identifaiit.com/` (constante `DOMINIO`, D-170). Todas las direcciones acaban en `/` (carpeta con `index.html`): GitHub Pages redirige `/es` a `/es/`, y las rutas relativas solo funcionan con la barra final.

Las rutas viven en **`RUTAS`**, exportada por `js/textos.js` (la usan main.js y `herramientas/paginas.mjs`), relativas a la carpeta del idioma. Valores **exactos**:

| Clave (`data-enlace`) | Página | `en/` | `es/` | Indexable |
|---|---|---|---|---|
| `juego` | El juego | `` (la carpeta) | `` | sí (salvo modo prueba y `sin-casos`, 10.7.5) |
| `sobre` | 1. Sobre el juego | `about/` | `sobre-el-juego/` | sí |
| `como_jugar` | 2. Cómo jugar | `how-to-play/` | `como-jugar/` | sí |
| `metodo` | 3. Cómo elegimos los casos | `how-we-pick-cases/` | `como-elegimos-los-casos/` | sí |
| `guia_imagenes` | 4. Guía: imágenes generadas | `spot-generated-images/` | `detectar-imagenes-generadas/` | sí (Article) |
| `guia_desinformacion` | 5. Guía: detectar un bulo | `spot-misinformation/` | `detectar-desinformacion/` | sí (Article) |
| `archivo` | 6. Archivo de casos (índice) | `archive/` | `archivo/` | sí, salvo vacío (noindex) |
| — | 6. Día archivado | `archive/case-{n}/` | `archivo/caso-{n}/` | sí |
| `preguntas` | 7. Preguntas frecuentes | `faq/` | `preguntas-frecuentes/` | sí |
| `creditos` | 8. Créditos y fuentes | `credits/` | `creditos/` | sí |
| `privacidad` | 9. Privacidad | `privacy/` | `privacidad/` | sí |
| `cookies` | 10. Cookies | `cookies/` | `cookies/` | sí |
| `contacto` | 11. Contacto | `contact/` | `contacto/` | sí |
| `aviso_legal` | 12. Aviso legal | `legal-notice/` | `aviso-legal/` | **no se genera** (borrador en `docs/aviso-legal.md`, 10.14) |

```js
// js/textos.js (exacto; Object.freeze en profundidad)
export const RUTAS = {
  en: { juego: '', sobre: 'about/', como_jugar: 'how-to-play/', metodo: 'how-we-pick-cases/',
        guia_imagenes: 'spot-generated-images/', guia_desinformacion: 'spot-misinformation/',
        archivo: 'archive/', archivo_dia: 'archive/case-{n}/', preguntas: 'faq/', creditos: 'credits/',
        privacidad: 'privacy/', cookies: 'cookies/', contacto: 'contact/', aviso_legal: 'legal-notice/' },
  es: { juego: '', sobre: 'sobre-el-juego/', como_jugar: 'como-jugar/', metodo: 'como-elegimos-los-casos/',
        guia_imagenes: 'detectar-imagenes-generadas/', guia_desinformacion: 'detectar-desinformacion/',
        archivo: 'archivo/', archivo_dia: 'archivo/caso-{n}/', preguntas: 'preguntas-frecuentes/', creditos: 'creditos/',
        privacidad: 'privacidad/', cookies: 'cookies/', contacto: 'contacto/', aviso_legal: 'aviso-legal/' }
};
```

- **Anti-trampas en las direcciones** [D-176, DP-73]: ningún segmento contiene, como palabra completa (`contienePalabraProhibida`, separadores `-`, `/`, `.`, `_`), `real`, `ia`, `ai`, `fake`, `dato`, `bulo`, `falso`, `falsa`, `verdadero` ni `verdadera`. Por eso las guías no se llaman `guia-ia`, `imagen-ia`, `guia-bulos`, `fake-news` ni `como-saber-si-una-imagen-es-ia`: la palabra clave va en el `title`, el `h1` y la descripción, que son texto, no rutas. Lo comprueban un test de `RUTAS` y `validar` sobre todo el árbol publicado.
- `n` en `case-{n}` / `caso-{n}` es el número del caso (Case #n), estable desde el lanzamiento (no se puede cambiar una vez llegado, 4.2.1).
- Cada página tiene su pareja en el otro idioma con la misma clave (y el mismo `n` en el archivo); `hreflang` las une (10.7.2).

## 10.2 Estructura de carpetas publicada [D-172, D-173]

Sustituye a las filas correspondientes de 0.2; lo no citado sigue igual.

| Ruta | Se publica | Qué es | Quién la escribe |
|---|---|---|---|
| `index.html` | sí | **Raíz**: página bilingüe mínima con dos enlaces visibles (English / Español) que redirige con JS (10.3). Ya **no** es el juego. | `paginas.mjs` desde `herramientas/plantillas/raiz.html` |
| `en/index.html`, `es/index.html` | sí | **El juego**, con todo el HTML ya en su idioma (10.4). | `paginas.mjs` desde `herramientas/plantillas/juego.html` |
| `en/{ruta}/index.html`, `es/{ruta}/index.html` | sí | Páginas de contenido 1–5, 7, 9–11 y el índice del archivo. | `paginas.mjs` desde `plantillas/pagina.html` y `herramientas/contenido/{en,es}/*.html` |
| `en/archive/case-{n}/index.html`, `es/archivo/caso-{n}/index.html` | sí | Días archivados (10.8). | `paginas.mjs` (también la Action) |
| `en/credits/index.html`, `es/creditos/index.html` | sí | Créditos (10.10). | `creditos.mjs` (necesita `banco.json`, solo en local) |
| `creditos.html`, `creditos.es.html` | sí | **Redirecciones** a las nuevas direcciones (10.10). | `paginas.mjs` |
| `robots.txt`, `sitemap.xml` | sí | 10.7.4. | `paginas.mjs` |
| `img/og/portada-en.png`, `img/og/portada-es.png` | sí | Imagen Open Graph 1200 x 630 (10.11). | `herramientas/og.mjs` (manual) |
| `img/ui/icono.svg` | sí | Favicon (10.11). | perito-visual |
| `css/paginas.css` | sí | **Nuevo**: estilos de las páginas de contenido, del archivo, de la raíz y de los créditos. El juego no lo carga. | perito-visual |
| `js/raiz.js` | sí | **Nuevo**: redirección de la raíz (10.3). Único archivo nuevo en `js/` [DP-80]. | agente-de-campo |
| `herramientas/paginas.mjs`, `herramientas/og.mjs` | sí (repositorio) | Generadores (10.6, 10.11). | archivero |
| `herramientas/plantillas/` | sí (repositorio) | `juego.html` (lo que hoy es `index.html`), `raiz.html`, `pagina.html`, `archivo-dia.html`, `archivo-indice.html`, `og.html`. Las edita el perito-visual. | perito-visual |
| `herramientas/contenido/{en,es}/{clave}.html` | sí (repositorio) | Cuerpo de cada página de contenido con su cabecera de metadatos (10.6.3). | cronista |
| `.github/workflows/archivo.yml` | sí (repositorio) | Action diaria del archivo (10.9). | archivero |
| `CNAME`, `.nojekyll` | sí | Sin cambios (D-170). Con `.nojekyll`, GitHub Pages sirve las carpetas tal cual. | — |
| `docs/` | **sí** (el repositorio entero se sirve) | Incluye `docs/aviso-legal.md`, accesible por URL aunque no se enlace: **nunca** se escriben en él datos personales (DP-86). `robots.txt` lo excluye. | — |
| `entrada/`, `herramientas/banco*.json`, `lote.json`, `capturas/` | **no** | Sin cambios en `.gitignore`. Ningún generador nuevo lee `entrada/` ni el banco (salvo `creditos.mjs`, como hoy). | — |

- `package.json`: scripts nuevos `"paginas": "node herramientas/paginas.mjs"` y `"og": "node herramientas/og.mjs"`. Sin dependencias nuevas (solo `sharp`).
- **Profundidad**: raíz 0, juego 1 (`es/`), contenido 2 (`es/como-jugar/`), día archivado 3 (`es/archivo/caso-12/`). El prefijo hasta la raíz es `'../'.repeat(profundidad)`.
- GitHub Pages con dominio propio: el sitio vive en la raíz del dominio; con todo relativo, también funciona en una subcarpeta (`https://usuario.github.io/identifAI-it/`), salvo los metadatos absolutos de 10.7, que siempre apuntan a `DOMINIO`.

## 10.3 Raíz y elección de idioma [D-172, DP-78, DP-80]

**Raíz** (`index.html`, `data-pagina="raiz"`, `lang="en"`, con cada frase en su `lang`):
- Contenido visible sin JS: logo (`h1` "identifAI-it"), una línea en inglés y otra en español (`TEXTOS.en.raiz.lema`, `TEXTOS.es.raiz.lema`), y dos enlaces grandes: `<a href="en/" hreflang="en" lang="en">` (`TEXTOS.en.raiz.jugar`) y `<a href="es/" hreflang="es" lang="es">` (`TEXTOS.es.raiz.jugar`). Pie con los enlaces de privacidad, cookies y contacto en los dos idiomas.
- `<script type="module" src="js/raiz.js">`: calcula `destino = destinoRaiz({search, hash, guardado: leerIdioma(localStorage), lenguas})` y llama a `location.replace(destino)` (sin entrada nueva en el historial). Puede verse la raíz un instante antes de redirigir (aceptado, DP-80).
- Cabecera: título bilingüe (`TEXTOS.en.seo.titulo_raiz`), descripción bilingüe, canonical a `DOMINIO`, `hreflang` `en` → `/en/`, `es` → `/es/`, `x-default` → `/`, Open Graph con `portada-en.png`, JSON-LD `WebSite`.

**Orden de elección del idioma**:
1. En la raíz: `?lang=` válido; si no, la preferencia guardada (`identifaiit.idioma`); si no, el navegador (`es` si el primer idioma empieza por `es`; si no, `en`) = `elegirIdioma` actual (D-154), sin cambios. La raíz **no guarda nada**: pasa `search` intacto (también `lang`) al juego, que es quien guarda.
2. En el juego (`/en/` o `/es/`): **manda la dirección** (`document.documentElement.lang`, que pone el generador). Si llega `?lang=` válido: se guarda como preferencia (DP-70 sin cambios); si es el de la página, se quita de la URL con `history.replaceState`; si es el otro, `location.replace(urlDeIdioma(location.href, lang))` y el arranque se detiene. Un `?lang=` no válido se ignora y se deja.
3. **Visitar una dirección no cambia la preferencia** [DP-78]: solo la cambian el selector y `?lang=`. Así, quien abre un enlace `/en/` que le pasaron sigue yendo a `/es/` desde la raíz.
- `?prueba=1&dia=n`, `?fecha=` (local) y el `#hash` se conservan en todas las redirecciones. Los enlaces antiguos `https://identifaiit.com/?prueba=1` siguen funcionando (la raíz los lleva a `/es/?prueba=1` o `/en/?prueba=1`).

**Funciones puras nuevas en `js/diario.js`** (agente-de-campo; las usan main.js y raiz.js):

| Función | Parámetros → retorno | Descripción |
|---|---|---|
| `urlDeIdioma(href, idioma)` | `string, string` → `string \| null` | URL absoluta de la misma página del juego en `idioma`: sustituye el **último** segmento de carpeta `en`/`es` de la ruta (la ruta debe acabar en `/en/`, `/es/`, `/en/index.html` o `/es/index.html`; `index.html` se quita), quita el parámetro `lang` y conserva los demás parámetros (en su orden) y el `hash`. `null` si `idioma` no es válido, si `href` no es una URL o si la ruta no acaba así (también para páginas de contenido). Nunca lanza. |
| `destinoRaiz({search, hash, guardado, lenguas})` | → `string` | `` `${idioma}/${search}${hash}` `` con `idioma = elegirIdioma({search, guardado, lenguas}).idioma`; `search` se conserva tal cual (con `lang`). Relativa, sin `/` inicial. |

`elegirIdioma`, `idiomaDeUrl` e `idiomaDelNavegador` no cambian.

## 10.4 El juego en `/en/` y `/es/` [D-173, D-174, D-175]

### 10.4.1 Plantilla y HTML ya traducido

- `index.html` actual pasa a `herramientas/plantillas/juego.html` (mismo marcado de 2.3) con estos marcadores:
  - `<html lang="{{idioma}}">`, `{{cabecera}}` (bloque de 10.7.1), `{{raiz}}` delante de cada ruta de recurso (`{{raiz}}css/variables.css`, `{{raiz}}js/main.js`…). En el juego, `{{raiz}}` = `../`.
  - `[[grupo.clave]]` (ya existen): el generador los sustituye por `TEXTOS[idioma]` escapado. Todo elemento con `data-texto-aria="g.c"` recibe `aria-label` con su valor. Los botones del selector reciben `aria-pressed="true"` el del idioma de la página y `"false"` el otro.
  - `{{enlace:clave}}`: `href` relativo a una página (`RUTAS[idioma][clave]`, desde la carpeta del idioma).
  - Las partes dinámicas (`#portada-caso`, `#portada-tema`, estados de las tarjetas, pasos…) quedan vacías: las rellena main.js.
- main.js sigue repintando `[data-texto]` y `[data-texto-aria]` al arrancar (el resultado es idéntico) y al cambiar de idioma.
- `<noscript>` en el idioma de la página (ya no bilingüe), con el aviso, el enlace a la otra versión y la lista de enlaces del pie, para que se puedan seguir sin JS.

### 10.4.2 Recursos desde una subcarpeta [D-174]

- **HTML**: rutas con el prefijo `{{raiz}}` (`../css/base.css`). CSS: las `url()` son relativas a la hoja y no cambian.
- **JS**: main.js define `const RAIZ = new URL('../', import.meta.url)` (la carpeta que contiene `js/`) y resuelve **toda** ruta de datos e imágenes con `new URL(ruta, RAIZ).href`: `cargarCalendario(new URL('data/calendario.json', RAIZ).href)`, la carpeta de `data/facts/`, `rutaPrueba(id)` al poner `src` y al precargar. Las funciones puras de `diario.js` siguen devolviendo rutas relativas a la raíz (`casos/{id}.webp`, `data/facts/…`), así que sus tests no cambian. No se usa `<base>` (la CSP lleva `base-uri 'none'` y rompería los enlaces relativos).
- Así el juego funciona igual desde `/en/`, `/es/`, y en una subcarpeta del dominio, y sigue funcionando tras `history.replaceState` a la otra carpeta (misma profundidad).

### 10.4.3 Selector EN | ES: cambia de dirección sin perder el estado [D-175, DP-79]

Sin cambios en la máquina de estados (`CAMBIAR_IDIOMA` solo en `portada` e `instrucciones`, misma pantalla con otro `idioma`). Efectos nuevos en main.js, en este orden:
1. `guardarIdioma(localStorage, idioma)`.
2. `const url = urlDeIdioma(location.href, idioma)`; si no es `null`, `history.replaceState(history.state, '', url)` (sin recargar, sin entrada nueva en el historial; atrás no vuelve al otro idioma).
3. `document.documentElement.lang = idioma`; `document.title = TEXTOS[idioma].seo.titulo_juego`; `meta[name=description]` = `TEXTOS[idioma].seo.descripcion_juego`.
4. Repintar `[data-texto]`, `[data-texto-aria]` y **todos los `a[data-enlace]`**: `href = RUTAS[idioma][data-enlace]` (relativo a la carpeta del idioma; tras el paso 2 la carpeta ya es la nueva). Sin este paso, `credits/` resolvería a `/es/credits/`, que no existe.
5. Volver a pintar la pantalla (como hoy).

Como `instrucciones`, el modo elegido y el reto abierto están en memoria, cambiar de idioma en `instrucciones` **sigue en `instrucciones`**; recargar después abre `/es/` (la nueva dirección) en la portada, como ya pasaba. Las partidas, rachas e intento no se tocan (son comunes a los dos idiomas). `canonical`, `hreflang` y Open Graph de la cabecera quedan los de la carga (solo importan a los buscadores, que cargan cada dirección por separado).

### 10.4.4 Otros cambios en main.js

- **Arranque** (sustituye al punto 1 de 3.7): `idioma = document.documentElement.lang` si `idiomaValido`, si no `'en'`; tratamiento de `?lang=` de 10.3; el resto igual. `elegirIdioma` ya no se usa en main.js (sí en raiz.js).
- **Enlace de créditos**: desaparece el `setAttribute('href', 'creditos.html' | 'creditos.es.html')`; `#portada-creditos` es un `a[data-enlace="creditos"]` más.
- **noindex dinámico** (10.7.5): `actualizarRobots(estado)` crea o quita `<meta name="robots" content="noindex">` en `head`: presente si `modoPrueba`, si hay previsualización (`?fecha=`) o si `estado.pantalla === 'sin-casos'`; ausente en otro caso.
- **Hueco de anuncios** (10.13): constante `const ANUNCIOS_ACTIVOS = false;` declarada una sola vez junto a `PRUEBAS_ABIERTAS`. Con `false`, main.js no toca los huecos.
- **Compartir**: `urlDelJuego()` sin cambios; desde `/es/` da `https://identifaiit.com/es/` [DP-81].

## 10.5 Contrato HTML/CSS nuevo [D-177, D-182]

### 10.5.1 Pie de la portada (sustituye a `footer#portada-pie` de 2.3)

```html
<footer id="portada-pie">
  <p id="portada-aviso-dia" data-texto="portada.pie">[[portada.pie]]</p>
  <nav id="portada-enlaces" data-texto-aria="pie.etiqueta">
    <a data-enlace="sobre" href="{{enlace:sobre}}" data-texto="pie.corto_sobre">[[pie.corto_sobre]]</a>
    <a data-enlace="como_jugar" href="{{enlace:como_jugar}}" data-texto="pie.corto_como_jugar">[[pie.corto_como_jugar]]</a>
    <a data-enlace="archivo" href="{{enlace:archivo}}" data-texto="pie.corto_archivo">[[pie.corto_archivo]]</a>
    <a data-enlace="privacidad" href="{{enlace:privacidad}}" data-texto="pie.corto_privacidad">[[pie.corto_privacidad]]</a>
    <a id="portada-creditos" data-enlace="creditos" href="{{enlace:creditos}}" data-texto="pie.corto_creditos">[[pie.corto_creditos]]</a>
  </nav>
</footer>
```
- Cinco enlaces [DP-82]; los separadores " · " los pone CSS (`a + a::before`, `aria-hidden` implícito por ser contenido generado). El resto de páginas se alcanza desde cualquiera de ellas (pie completo, 10.5.3).
- Solo en `portada`. Las demás pantallas del juego no llevan pie de enlaces (sí la raíz y todas las páginas de contenido).
- `a#portada-creditos` cambia de forma (antes `data-texto="portada.enlace_creditos"`); `portada.enlace_creditos` se retira a favor de `pie.corto_creditos`.

### 10.5.2 Huecos de anuncio

```html
<!-- en #pantalla-portada, justo después de div.retos -->
<aside id="anuncio-portada" class="anuncio" data-texto-aria="anuncios.etiqueta" hidden></aside>
<!-- en #pantalla-resultado, último hijo de la sección, después de footer#resultado-pie -->
<aside id="anuncio-resultado" class="anuncio" data-texto-aria="anuncios.etiqueta" hidden></aside>
```
- Vacíos y con `hidden`: no ocupan espacio. **Ninguna regla de CSS** puede dar `display` a `.anuncio` ni a `[hidden]` dentro del juego.
- Prohibidos en `cargando`, `cuenta-atras`, `caso` (pregunta y veredicto), `instrucciones`, `ya-jugado`, `sin-casos`, `error`, dentro de `#resultado-tablon`, en `dialog#ficha` y en todas las páginas del archivo (son revelaciones).

### 10.5.3 Páginas de contenido (`herramientas/plantillas/pagina.html`)

```html
<body data-pagina="contenido">          <!-- "archivo" en el archivo, "creditos" en créditos -->
<a class="saltar" href="#contenido" data-texto="paginas.saltar">…</a>
<header class="pagina-cabecera">
  <a class="pagina-logo" href="{{enlace:juego}}">identifAI-it</a>          <!-- vuelve al juego del idioma -->
  <a class="pagina-jugar" href="{{enlace:juego}}">[[paginas.jugar]]</a>
  <a class="pagina-idioma" href="(la misma página en el otro idioma)" hreflang="es" lang="es">Español</a>  <!-- "English" en es -->
</header>
<main id="contenido" tabindex="-1">
  <article>                              <!-- en las guías; <div> en las demás -->
    <h1>…</h1>
    (cuerpo de herramientas/contenido/{idioma}/{clave}.html)
  </article>
</main>
<footer class="pagina-pie">
  <nav data-texto-aria="pie.etiqueta">   <!-- aria-label ya escrito por el generador -->
    <ul>
      <li><a href="…">[[pie.sobre]]</a></li> … las 11 páginas publicadas, en el orden de 10.1, con aria-current="page" en la actual
    </ul>
  </nav>
  <p class="pagina-pie-correo"><a href="mailto:contacto@301juegodiario.es">contacto@301juegodiario.es</a></p>
</footer>
```
- Sin JS. Los textos fijos (`paginas.*`, `pie.*`) salen de `TEXTOS[idioma]` al generar; los `data-texto` no hacen falta (no hay repintado) y no se escriben.
- "English" y "Español" son endónimos fijos (como en el selector, 0.1).
- Enlaces del pie "inspirados en 301juegodiario.com": Sobre el juego (≈ Quiénes somos), Cómo jugar, Cómo elegimos los casos (≈ Fuentes), las dos guías (≈ Estrategias), Archivo (≈ Categorías), Preguntas frecuentes, Créditos, Privacidad, Cookies, Contacto. El aviso legal **no** aparece hasta que exista (10.14).

### 10.5.4 Atributos, ids y clases nuevos

| Gancho | Valores | Notas |
|---|---|---|
| `data-pagina` en `<body>` | `juego`, `raiz`, `contenido`, `archivo`, `creditos`, `redireccion` | `juego` y `creditos` ya existían. |
| `data-enlace` en `<a>` del juego | las claves de `RUTAS` | main.js repinta su `href` (10.4.3). Sin palabras prohibidas en ningún valor. |
| `#portada-enlaces`, `#anuncio-portada`, `#anuncio-resultado`, `.anuncio` | — | 10.5.1, 10.5.2. |
| `#contenido`, `.saltar`, `.pagina-cabecera`, `.pagina-logo`, `.pagina-jugar`, `.pagina-idioma`, `.pagina-pie`, `.pagina-pie-correo` | — | Contenido. |
| `.archivo-*` | `archivo-dia`, `archivo-fecha`, `archivo-pruebas`, `archivo-prueba`, `archivo-sello`, `archivo-confesion`, `archivo-afirmacion`, `archivo-aclaracion`, `archivo-detalles`, `archivo-navegacion`, `archivo-mes`, `archivo-vacio`, `archivo-ejemplos` | Archivo (10.8.4). |

- **Sin `data-verdad` ni ninguna clase o atributo que dependa de la respuesta en el archivo** [DP-76]: los sellos del archivo (REAL/AI, FACT/FAKE, DATO/BULO) son texto visible con un estilo **neutro e igual** para los dos valores. Así la excepción de `CLAUDE.md` sobre `data-verdad` no se amplía.
- Ningún id, clase, `data-*` (nombre o valor), `alt`, nombre de archivo ni ruta de lo publicado contiene palabras prohibidas; lo comprueba `validar` en **todos** los HTML del árbol (10.6.5).

## 10.6 Generador `herramientas/paginas.mjs` (archivero) [D-173]

### 10.6.1 Qué lee y qué escribe

- **Lee**: `herramientas/plantillas/*.html`, `herramientas/contenido/{en,es}/*.html`, `js/textos.js` (`TEXTOS`, `RUTAS`), `js/diario.js` (fechas y desofuscado), `data/calendario.json`, todos los `data/facts/*.json`, la lista de `casos/` (solo para comprobar que existen las imágenes del archivo). **Nunca** lee `entrada/` ni `herramientas/banco*.json`.
- **Escribe**: `index.html`, `en/` y `es/` (salvo `credits/` y `creditos/`, que son de `creditos.mjs`), `creditos.html`, `creditos.es.html`, `robots.txt` y `sitemap.xml`. Borra las páginas de días de archivo que ya no correspondan (solo dentro de `en/archive/` y `es/archivo/`).
- **Determinista** byte a byte para las mismas entradas y el mismo `ultimoDiaArchivable`: UTF-8 sin BOM, saltos LF, orden fijo, sin fechas de generación. **Las fechas visibles no usan `Intl`** (cambia entre versiones de Node y daría diferencias entre el equipo del usuario y la Action): usa `TEXTOS[idioma].archivo.meses` (12 nombres) y `TEXTOS[idioma].archivo.fecha` (`'{mes} {d}, {a}'` / `'{d} de {mes} de {a}'`).

### 10.6.2 Uso

- `npm run paginas`: regenera y escribe; informa "N páginas escritas, M sin cambios, K días archivados (hasta el caso n.º X)".
- `npm run paginas -- --simular`: lista lo que cambiaría, no escribe.
- `npm run paginas -- --ahora=2027-01-10T13:00:00Z --salida=<carpeta>`: solo para probar el archivo antes del lanzamiento; `--ahora` **exige** `--salida`, y `--salida` no puede estar dentro del repositorio salvo en `capturas/` (que está en `.gitignore`). Así no se puede escribir por error un archivo "del futuro" en lo publicado.
- Tras cambiar una plantilla, `js/textos.js`, un contenido o los datos: `npm run paginas` (y `npm run creditos` si cambió el pie o el diseño de las páginas). `validar` falla si se olvida (10.6.5).

### 10.6.3 Contenidos (`herramientas/contenido/{en,es}/{clave}.html`)

Un archivo por página e idioma (claves `sobre`, `como_jugar`, `metodo`, `guia_imagenes`, `guia_desinformacion`, `archivo` (introducción del índice), `preguntas`, `privacidad`, `cookies`, `contacto`). Empiezan con una cabecera en un comentario:

```html
<!--
titulo: Cómo saber si una imagen está hecha con IA: guía práctica
descripcion: Pistas para detectar imágenes generadas por IA: manos, texto, luces, fondos y contexto. Sin trucos infalibles: practica cada día con identifAI-it.
h1: Cómo saber si una imagen está hecha con IA
tipo: articulo
publicado: 2026-11-15
modificado: 2026-11-15
-->
<p>…</p>
<h2>…</h2>
```
- Campos: `titulo` (sin el sufijo " · identifAI-it", que añade el generador), `descripcion`, `h1`, `tipo` (`articulo` solo en las dos guías; `pagina` en las demás), `publicado` y `modificado` (fechas ISO, solo en artículos).
- Cuerpo: solo `h2`, `h3`, `p`, `ul`, `ol`, `li`, `a`, `strong`, `em`, `blockquote`, `dl`, `dt`, `dd`. Sin `script`, `style`, atributos `on*`, `style=`, `id`/`class` (los pone la plantilla) ni imágenes (salvo las del bloque de ejemplos).
- Marcadores: `{{enlace:clave}}` (href relativo a otra página del mismo idioma), `{{correo}}` (el `mailto:` de `CORREO`), `{{ejemplos}}` (solo en `guia_imagenes`, 10.8.6).
- Enlaces externos: solo `https://`, a sitios reconocidos (verificadores, licencias de Unsplash y Pexels), con `rel="noopener"` y sin `target` [DP-90]. Nunca en el juego (Fact or Fake sigue sin enlaces, D-126).
- `analizarContenido(texto, ruta)` → `{meta, cuerpo, errores}`: error si falta un campo, si sobra uno, si hay una etiqueta o atributo no permitido, si un `{{enlace:x}}` no existe, si el `titulo` con sufijo supera 60 caracteres o la `descripcion` no mide entre 70 y 155 (contados con `[...s].length`). Nunca lanza.

### 10.6.4 Exportaciones (puras salvo las marcadas)

| Exportación | Descripción |
|---|---|
| `DOMINIO`, `CORREO`, `CSP` | `'https://identifaiit.com/'`, `'contacto@301juegodiario.es'`, la CSP de 2.4 (idéntica en todas las páginas). |
| `PAGINAS` | Claves publicadas en el orden del pie: `['sobre', 'como_jugar', 'metodo', 'guia_imagenes', 'guia_desinformacion', 'archivo', 'preguntas', 'creditos', 'privacidad', 'cookies', 'contacto']`. |
| `ruta(idioma, clave, n)` | Ruta desde la raíz (`'es/archivo/caso-12/'`, `'en/'`). |
| `prefijo(profundidad)` | `'../'.repeat(profundidad)`. |
| `relativa(desde, hasta)` | Href relativo entre dos rutas de carpeta del sitio (`'es/como-jugar/'` → `'es/archivo/'` = `'../archivo/'`). |
| `ultimoDiaArchivable(ahoraMs)` | 10.8.2. |
| `diasArchivables({calendario, meses, ahoraMs})` | `[{n, fecha}]` ascendente: días con `fecha ≤ ultimoDiaArchivable(ahoraMs)` que existen en Images o en Fact or Fake; `[]` sin lanzamiento. |
| `datosDelDia({calendario, meses, n})` | `{n, fecha, tema, imagenes: [{id, verdad, ficha: {en, es}}] \| null, afirmaciones: [{verdad, texto: {en, es}, aclaracion: {en, es}}] \| null}`, descifrado con las funciones de `diario.js`. **Solo se llama con días de `diasArchivables`.** |
| `analizarContenido(texto, ruta)` | 10.6.3. |
| `cabecera({...})` | Bloque de 10.7.1. |
| `generarJuego`, `generarRaiz`, `generarPagina`, `generarArchivoDia`, `generarIndiceArchivo`, `generarRedireccion`, `generarSitemap`, `ROBOTS` | Una página (cadena) cada una. |
| `generarSitio({entradas, ahoraMs})` | `Map<ruta, contenido>` con todo lo que escribe `paginas.mjs`. |
| `comprobarSitio(mapa, existentes)` | Errores: enlaces internos o recursos relativos que no existen, rutas que empiezan por `/`, palabras prohibidas, `data-verdad` fuera del juego, CSP distinta. La usa `validar`. |
| `escribirSitio(mapa, raiz)` *(efecto)* | Escribe, informa y borra los días sobrantes del archivo. |
| `ejecutar(argv)` *(efecto)* | CLI de 10.6.2. |

### 10.6.5 `validar.mjs` (además de 4.22)

- Regenera el sitio en memoria con `ultimo = el mayor n archivado que ya está en disco` y lo compara con lo escrito (normalizando CRLF a LF): error "Páginas desactualizadas: ejecuta npm run paginas." con la lista de archivos. (Usar lo que hay en disco evita que falle solo porque hoy ya toque archivar un día que la Action aún no ha añadido.)
- Error si algún día archivado tiene `fecha > ultimoDiaArchivable(ahora)`; si existe `es/aviso-legal/` o `en/legal-notice/` (10.14) con `ANUNCIOS_ACTIVOS = false`; si `ANUNCIOS_ACTIVOS` no está declarada una sola vez en `js/main.js` o vale `true` (hasta que exista una versión de la spec con anuncios, DP-87); si la raíz contiene `id="app"`; si falla `comprobarSitio`.
- Palabras prohibidas en todo HTML publicado (raíz, `en/`, `es/`, redirecciones, créditos) y en todas las rutas.
- Avisos (no errores): `title` > 60 o `description` fuera de 70–155 en alguna página.
- Las comprobaciones de `index.html` de la 3.0 (CSP, clases `dato*`, ids) pasan a `herramientas/plantillas/juego.html` y a `en/index.html` y `es/index.html`.
- Créditos: comprueba `en/credits/index.html` (`lang="en"`) y `es/creditos/index.html` (`lang="es"`) en lugar de `creditos.html` y `creditos.es.html`, que ahora son redirecciones.

## 10.7 SEO [D-178]

### 10.7.1 Cabecera de cada página (orden fijo)

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'">
<title>{titulo}</title>
<meta name="description" content="{descripcion}">
<meta name="robots" content="noindex">                     <!-- solo en las páginas no indexables estáticas (10.7.5) -->
<link rel="canonical" href="{DOMINIO}{ruta}">
<link rel="alternate" hreflang="en" href="{DOMINIO}{ruta en}">
<link rel="alternate" hreflang="es" href="{DOMINIO}{ruta es}">
<link rel="alternate" hreflang="x-default" href="{x-default}">
<meta property="og:type" content="website">               <!-- "article" en las guías -->
<meta property="og:site_name" content="identifAI-it">
<meta property="og:title" content="{titulo}">
<meta property="og:description" content="{descripcion}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{DOMINIO}img/og/portada-{idioma}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{TEXTOS[idioma].seo.og_alt}">
<meta property="og:locale" content="es_ES">                 <!-- en_US en inglés -->
<meta property="og:locale:alternate" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{prefijo}img/ui/icono.svg" type="image/svg+xml">
<link rel="stylesheet" href="{prefijo}css/…">
<script type="application/ld+json">{…}</script>             <!-- solo donde toque (10.7.3) -->
```
- `x-default`: la raíz (`DOMINIO`) para el juego y la raíz; la versión inglesa para el resto.
- URL absolutas **solo** en `canonical`, `hreflang`, `og:url`, `og:image`, JSON-LD, `sitemap.xml` y `robots.txt` (excepción a "rutas relativas" de `CLAUDE.md`, DP-72). Todo lo demás, relativo.
- El bloque JSON-LD es un bloque de datos: la CSP no lo bloquea porque no se ejecuta.
- WhatsApp y redes usan `og:title`, `og:description` y `og:image` (absoluta, https, ≤ 300 KB).

### 10.7.2 Títulos, descripciones y búsquedas

- Cada página e idioma tiene su `title` (≤ 60 caracteres con el sufijo " · identifAI-it", salvo el juego y la raíz, que no lo llevan) y su `description` (70–155). Los del juego, la raíz y el archivo están en `TEXTOS[idioma].seo`; los de las páginas de contenido, en su cabecera (10.6.3). Los escribe el cronista y los aprueba el usuario.
- Búsquedas que deben aparecer (cada una en el `title`, `h1` o `description` de alguna página, de forma natural, sin repetir):
  - es: "cómo saber si una imagen es IA", "detectar imágenes generadas por IA", "juego para detectar imágenes de IA", "¿real o IA?", "juego diario de bulos", "cómo detectar un bulo", "comprobar si un dato es verdad", "juego diario tipo Wordle".
  - en: "how to tell if an image is AI generated", "spot the AI image game", "real or AI game", "daily fact or fake game", "how to spot fake news", "how to fact-check a claim", "Wordle-style daily game".
- Propuestas (las fija el cronista): juego es "identifAI-it: juego diario para cazar imágenes de IA y bulos"; juego en "identifAI-it: daily game to spot AI images and fake facts"; guía es "Cómo saber si una imagen está hecha con IA: guía práctica"; guía en "How to tell if an image is AI-generated: a practical guide"; guía es "Cómo detectar un bulo y comprobar un dato"; guía en "How to spot fake news and check a claim"; día "Caso n.º {n} · {tema}: soluciones" / "Case #{n} · {tema}: answers".
- Las descripciones del archivo **nunca citan una afirmación** (tampoco las falsas): "Las 5 imágenes y las 5 afirmaciones del caso n.º {n} ({tema}), con sus respuestas, confesiones y verdades." [riesgo R31].

### 10.7.3 Datos estructurados

- **`WebSite`** en la raíz y en las dos páginas del juego: `{"@context": "https://schema.org", "@type": "WebSite", "name": "identifAI-it", "url": "https://identifaiit.com/", "inLanguage": "es"}` (`"en"` en inglés; en la raíz, `["en", "es"]`).
- **`Article`** en las dos guías: `@type`, `headline` (= `h1`), `description`, `inLanguage`, `datePublished` y `dateModified` (de la cabecera), `image` (la OG del idioma), `author` y `publisher` `{"@type": "Organization", "name": "identifAI-it", "url": "https://identifaiit.com/"}`, `mainEntityOfPage` (canonical).
- Nada más (ni `FAQPage`, ni `ClaimReview`, ni migas de pan): simple y sin riesgo de datos incorrectos.

### 10.7.4 `robots.txt` y `sitemap.xml`

`robots.txt` (exacto, LF final):
```
User-agent: *
Disallow: /docs/
Disallow: /herramientas/
Disallow: /tests/

Sitemap: https://identifaiit.com/sitemap.xml
```
- No se bloquean `data/`, `casos/`, `css/`, `js/`, `fonts/` ni `img/`: Google los necesita para pintar el juego. Tampoco `?prueba=1`: un bloqueo le impediría ver el `noindex`.
- Las barras iniciales de `robots.txt` son sintaxis de ese archivo (siempre en la raíz del dominio), no rutas del sitio.

`sitemap.xml`: `urlset` del protocolo 0.9, solo `<loc>` (sin `lastmod`, `changefreq` ni `priority`, para que sea determinista), URL absolutas, en este orden: raíz; `en/` y las páginas indexables en el orden de `PAGINAS`; lo mismo en `es/`; los días archivados ascendentes (`en` y `es` de cada `n`). Excluye: redirecciones, páginas con `noindex` (índice del archivo vacío) y el aviso legal. Unos 730 URL nuevos al año: el límite de 50 000 tardaría décadas (DP-89).

### 10.7.5 `noindex`

- **Estático** (lo escribe el generador): índice del archivo mientras está vacío; las dos redirecciones de créditos no lo llevan (usan `canonical` a su destino).
- **Dinámico** (main.js, 10.4.4): el juego con `?prueba=1`, con previsualización `?fecha=` y en `sin-casos` [DP-83]. Mientras no haya fecha de lanzamiento, el juego normal está en `sin-casos`, así que `/en/` y `/es/` no se indexarán hasta el lanzamiento; al lanzar, el usuario pide la indexación en Search Console (tarea 126).

## 10.8 Archivo de casos [D-179]

### 10.8.1 Excepción a "nunca se publican en claro" (texto para `CLAUDE.md` en 9.15, DP-74)

> Única excepción: el archivo de casos (`/en/archive/`, `/es/archivo/`) publica en claro, en páginas aparte del juego, la respuesta, el prompt de las imágenes generadas y la afirmación con su verdad y sus detalles **solo de los días que ya han terminado en todas las zonas horarias** (10.8.2). Lo genera `herramientas/paginas.mjs` a partir de los datos ofuscados ya publicados. Nunca hay en el archivo nada de hoy ni de días futuros, en ningún idioma.

Lo que **no** cambia: en el juego (`/en/`, `/es/`) la respuesta, la ficha y el prompt de un caso siguen sin existir en el DOM hasta que el jugador responde; los datos (`calendario.json`, `data/facts/`) siguen ofuscados y con longitud fija; el juego no enlaza a días concretos del archivo (solo al índice), ni lo carga.

### 10.8.2 Qué es "ya pasado": regla de las zonas horarias

El juego usa la medianoche **local** de cada jugador. El día D se juega en algún lugar del mundo desde D 00:00 en UTC+14 (D−1 10:00 UTC) hasta D 23:59:59 en UTC−12 (D+1 11:59:59 UTC). Por eso:

```
ultimoDiaArchivable(ahoraMs) = sumarDias(fechaUTC(ahoraMs − 12 h), −1)
```
- Ejemplos: `2026-12-02T11:59:59Z` → `2026-11-30`; `2026-12-02T12:00:00Z` → `2026-12-01`.
- Usa solo UTC (`getUTC*`), nunca la hora local de la máquina ni `TZ`: da lo mismo en el equipo del usuario (Madrid) y en la Action (UTC).
- Con la hora de Madrid que pidió el usuario para la Action (≈ 00:15), en ese momento **todavía se está jugando el día anterior en América** (00:15 en Madrid = 18:15 del día anterior en Nueva York). Por eso no vale "días anteriores a hoy en Madrid": ese día se archiva en la ejecución siguiente (DP-75).
- **Modo prueba y previsualización**: no influyen. Sin `lanzamiento` (`null`) no hay ningún día archivable y el archivo está vacío; los días de prueba anteriores al lanzamiento nunca se archivan. Cambiar la hora del dispositivo (D-18) no afecta: el archivo se genera en el servidor.
- `diasArchivables` solo considera días que existen en los datos y cuya `fechaDelDia(lanzamiento, n) ≤ ultimoDiaArchivable`. El generador **no descifra** ningún otro día (ni para comprobarlo).

### 10.8.3 Imágenes del archivo [DP-77]

- Se reutilizan los archivos publicados `casos/{id}.webp` (nombre aleatorio, sin metadatos, 1080 x 1350): `src` relativo (`../../../casos/{id}.webp`), `width="1080" height="1350"`, `loading="lazy"` y `decoding="async"` (salvo la primera).
- `alt` neutro, del idioma: `rellenar(TEXTOS[idioma].archivo.alt_prueba, {i, n})` ("Prueba 1 del caso n.º 12" / "Exhibit 1, case #12"), sin palabras prohibidas ni la respuesta. La respuesta va en el texto visible junto a la imagen, que los lectores de pantalla leen después.
- No se copian ni se renombran imágenes (el archivo no añade peso al sitio). Consecuencia aceptada: los archivos de días pasados quedan asociados públicamente a su tipo (riesgo R25).

### 10.8.4 Página de un día (`archivo-dia.html`, profundidad 3, `data-pagina="archivo"`)

Cabecera y pie de 10.5.3. Cuerpo, en este orden:
- `p.archivo-fecha` con `<time datetime="AAAA-MM-DD">` (fecha formateada sin `Intl`, 10.6.1) y `h1` = `rellenar(archivo.titulo_dia, {n, tema})` ("Caso n.º 12 · Perros").
- `section` de Images (si el día lo tiene), `h2` = nombre del reto (`portada.reto_imagenes`); `ol.archivo-pruebas` con 5 `li.archivo-prueba`: `figure` con la `img`, y `figcaption` con `p.archivo-sello` (`partida.sello_autentica` / `sello_generada`: REAL / AI, REAL / IA) y `p.archivo-confesion`: en las generadas, `confesion.titulo` y el prompt entero del idioma en un `blockquote`; en las auténticas, `fichas.autentica` ("Real photograph" / "Fotografía real").
- `section` de Fact or Fake (si el día lo tiene), `h2` = `portada.reto_afirmaciones`; `ol.archivo-pruebas` con 5 `li.archivo-prueba`: `p.archivo-afirmacion` = `<strong class="archivo-sello">FAKE</strong>` y la afirmación entre comillas, **en el mismo párrafo y con el sello delante** (para que ningún fragmento citado por un buscador muestre una falsa sin su sello); `p.archivo-aclaracion` (la verdad) y `ul.archivo-detalles` (0 a 3 `li`; sin `ul` si no hay).
- `nav.archivo-navegacion`: caso anterior y siguiente **solo si están archivados**; enlace al índice; enlace "Juega el caso de hoy" (`archivo.jugar_hoy`) al juego del idioma.
- Sin bloqueo de copia: es material de consulta.
- Un día con un solo reto muestra solo esa sección (y una línea `archivo.sin_reto` para el otro).

### 10.8.5 Índice (`archivo-indice.html`, profundidad 2)

- `h1` y la introducción de `herramientas/contenido/{idioma}/archivo.html`.
- Días agrupados por mes, del más reciente al más antiguo: `h2.archivo-mes` ("diciembre de 2026" / "December 2026", de `archivo.meses`) y una `ul` con un `li` por día: `<a href="caso-12/">Caso n.º 12 · Perros</a>` y la fecha.
- Vacío (sin lanzamiento o sin días archivables): `p.archivo-vacio` = `archivo.vacio` ("Todavía no hay casos cerrados. Vuelve cuando termine el primero."), `noindex`, fuera del sitemap.
- Escala [DP-89]: una sola página (unos 365 enlaces al año, ≈ 40 KB). Al pasar de un año de archivo se divide por años (`archivo/2027/`), con una decisión nueva.

### 10.8.6 Ejemplos en la guía de imágenes [DP-92]

`{{ejemplos}}` en `guia_imagenes` se sustituye por `section.archivo-ejemplos` con hasta 3 imágenes **generadas** de los días archivados más recientes (la más reciente de cada uno de los 3 últimos días que tengan Images), cada una con su sello, su prompt y un enlace a su día. Sin días archivados, el marcador desaparece sin dejar rastro. Por tanto, la guía cambia cuando cambia el archivo (la Action la incluye en su commit).

## 10.9 GitHub Action `.github/workflows/archivo.yml` (archivero) [D-180]

Esquema (el archivero escribe el archivo; los valores marcados son obligatorios):

```yaml
name: Archivo de casos
on:
  schedule:
    - cron: '15 22 * * *'   # 00:15 en Madrid en horario de verano (CEST, UTC+2)
    - cron: '15 23 * * *'   # 00:15 en Madrid en horario de invierno (CET, UTC+1)
  workflow_dispatch:
permissions: {}
concurrency:
  group: archivo
  cancel-in-progress: false
jobs:
  archivo:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run paginas
      - run: npm run validar
      - name: Commit si hay cambios
        run: |
          git add -- en es sitemap.xml
          if [ -n "$(git status --porcelain --untracked-files=all -- . ':!en' ':!es' ':!sitemap.xml')" ]; then
            echo "Cambios inesperados fuera de en/, es/ y sitemap.xml"; git status --porcelain; exit 1
          fi
          if git diff --cached --quiet; then echo "Sin cambios"; exit 0; fi
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git commit -m "datos: archivo de casos hasta el n.º $(node herramientas/paginas.mjs --ultimo)"
          git push
```
- **Zona horaria**: el `cron` de GitHub es siempre UTC y no sigue el horario de verano; por eso hay dos líneas. La que no cae a las 00:15 cae a las 23:15 o a la 01:15 de Madrid y no hace daño: el generador es idempotente y la regla de 10.8.2 es segura a cualquier hora. GitHub puede retrasar las ejecuciones programadas (a veces más de una hora) o saltarse alguna: con la regla de 10.8.2 un retraso solo publica más tarde, nunca antes. **Recomendación** [DP-75]: sustituirlas (o completarlas) por `'15 12 * * *'` (12:15 UTC, sin horario de verano), que archiva el día D el D+1 a las 13:15/14:15 de Madrid en lugar del D+2 a las 00:15.
- **Solo `main`**: las ejecuciones programadas solo corren en la rama por defecto; el `if` evita además que un `workflow_dispatch` lanzado sobre otra rama (por ejemplo `paginas-seo`) escriba nada.
- **Permisos**: ninguno por defecto y `contents: write` solo en el trabajo. Sin secretos ni tokens personales. Si `main` tiene protección de rama que impida el push del bot, el trabajo falla (riesgo R34).
- **Seguridad del commit**: solo se añaden `en/`, `es/` y `sitemap.xml`; cualquier otro cambio hace fallar el trabajo sin commit (no puede publicar `entrada/` ni nada privado, que además no está en el checkout).
- `npm run validar` sin `--estricto` (con `PRUEBAS_ABIERTAS = true` antes del lanzamiento, `--estricto` fallaría). No se ejecuta `npm test` (lento y con el test intermitente de TP-02); los tests corren en local antes de cada commit del usuario.
- `node herramientas/paginas.mjs --ultimo` imprime el número del último caso archivado (o `0`) y no escribe nada.
- Antes del lanzamiento la Action corre a diario sin commit (archivo vacío). Tras publicar, comprobar que el push del bot dispara el despliegue de GitHub Pages (riesgo R27, tarea 126).

## 10.10 Créditos [D-181]

- `creditos.mjs` escribe `en/credits/index.html` y `es/creditos/index.html` con el diseño de las páginas de contenido (cabecera, pie, `css/paginas.css`), usando `generarPagina` de `paginas.mjs`; el contenido (tipografías, lista agregada de fuentes, sección de Fact or Fake) no cambia. El enlace de vuelta pasa a `{{enlace:juego}}` (`../`), y el de idioma, a la otra página de créditos. Sigue necesitando `banco.json` (solo en local), así que la Action no los regenera.
- `creditos.html` y `creditos.es.html` pasan a ser redirecciones (`data-pagina="redireccion"`), generadas por `paginas.mjs`:
  ```html
  <meta http-equiv="refresh" content="0; url=en/credits/">
  <link rel="canonical" href="https://identifaiit.com/en/credits/">
  …<p><a href="en/credits/">Credits</a></p>
  ```
  (la española, a `es/creditos/` con "Créditos"). La CSP no bloquea `meta refresh`.
- `ARCHIVOS_CREDITOS` pasa a `{en: 'en/credits/index.html', es: 'es/creditos/index.html'}`; `importar.mjs` sigue llamando a `creditos.mjs`.

## 10.11 Imagen Open Graph y favicon [D-183, DP-88]

- **Diseño**: `herramientas/plantillas/og.html` (perito-visual), 1200 x 630, con el estilo del juego (fondo oscuro, cinta de peligro, polaroids con el sello "AI?" / "¿IA?" y fichas FACT/FAKE de la portada, logo y lema del idioma), con `../../fonts/*.woff2` y `../../css/variables.css`. Ninguna imagen de `casos/` (ni de días pasados).
- **Generación** (`npm run og`, manual, nunca en la Action): `og.mjs` abre `og.html?idioma=en|es` en Chromium con Playwright **lanzado con `npx`** (como las capturas de R19; no se añade a `package.json`, DP-93) y hace una captura de 1200 x 630; después `sharp` la convierte a PNG optimizado sin metadatos (`img/og/portada-en.png`, `img/og/portada-es.png`, ≤ 300 KB cada una). Así se usan las fuentes reales del juego. Alternativa sin Playwright: `og.html` como SVG rasterizado por `sharp`, con fuentes del sistema (no ve los `woff2`; la letra no sería la del juego).
- Las imágenes se suben al repositorio; solo se regeneran si cambia el diseño o el lema.
- **Favicon**: `img/ui/icono.svg` (lupa o huella del juego, legible a 16 px; Google pide un múltiplo de 48 px: el SVG vale), enlazado en todas las páginas.

## 10.12 Contenido de cada página (cronista; lo aprueba el usuario) [D-184]

Normas comunes: tono del juego (detective, novela negra suave) pero claro; frases cortas; en inglés americano y en español de España; mismo sentido en los dos idiomas; **las reglas, teclas, tiempos y textos exactos tienen que coincidir con `CLAUDE.md` y la spec**. Prohibido en todo el sitio: decir cuántas imágenes de IA o afirmaciones falsas puede haber en un día (el rango "de 1 a 4" permite deducir la última respuesta, DP-91), prometer detección infalible, revelar algo de hoy o de días futuros, enlazar a días concretos del archivo desde fuera del archivo y la guía.

1. **Sobre el juego**: qué es identifAI-it (dos retos diarios, cinco casos cada uno, un intento al día, el mismo para todos), el tema del día, que es un proyecto personal sin cuentas ni anuncios (de momento), y enlaces a Cómo jugar, al archivo y a las guías.
2. **Cómo jugar**: Images (REAL / AI, teclas R e I; modos Investigator sin límite, Normal 3 s, Bloodhound 1 s; al acabarse el tiempo la imagen se tapa con un sobre y se responde sin límite, no es fallo; el temporizador empieza cuando la imagen está pintada; ocultar la pestaña no penaliza) y Fact or Fake (FACT / FAKE con F y K; DATO / BULO con D y B en español; sin tiempo; salir de la página más de unos segundos antes de responder cuenta como fallo; el texto no se puede copiar). Tras cada respuesta, la ficha. Un intento al día por reto, común a modos e idiomas; día nuevo a medianoche local; racha; compartir sin revelar respuestas.
3. **Cómo elegimos los casos**: fotos reales de bancos con licencia libre (Unsplash, Pexels); imágenes generadas con Gemini o ChatGPT a partir de prompts propios, que se muestran tras responder; todas reprocesadas al mismo tamaño y calidad y sin metadatos para que el archivo no delate nada; las afirmaciones las escribe y comprueba una persona; las falsas nunca tratan de salud, seguridad, tragedias ni política ni dañan la reputación de nadie (solo pueden alterar cifras o récords inocuos de personas o marcas famosas), y siempre se desmienten tras responder.
4. **Guía: imágenes generadas**: pistas prácticas (manos y dedos, texto y letreros, reflejos y sombras incoherentes, fondos que se deshacen, simetrías raras, piel y texturas demasiado lisas, detalles repetidos, iluminación de estudio imposible), comprobaciones fuera de la imagen (búsqueda inversa, origen, metadatos y credenciales de contenido como C2PA cuando existen, marcas de agua invisibles como SynthID) y sus límites ("ninguna pista es definitiva; los generadores mejoran cada mes"). `{{ejemplos}}` con casos ya jugados (10.8.6). Practicar con el juego.
5. **Guía: detectar un bulo**: cómo comprobar un dato (buscar la fuente original, fecha, unidades y contexto, cifras redondas o récords sospechosos), fuentes fiables (organismos oficiales, enciclopedias con referencias, verificadores reconocidos: en España Maldita.es, Newtral, EFE Verifica, AFP Factual; en inglés Snopes, PolitiFact, Reuters Fact Check, AP Fact Check, Full Fact [DP-90]), señales de alerta (urgencia, emoción, "lo que no te cuentan", sin fuente, capturas sin contexto), y sus límites.
6. **Archivo**: introducción del índice (qué contiene y que un día entra cuando ha terminado en todo el mundo, al día siguiente).
7. **Preguntas frecuentes** (`dl`): ¿Cuándo hay casos nuevos? ¿Puedo repetir? ¿Por qué cambiar de idioma no me deja volver a jugar? ¿Qué pasa si se acaba el tiempo? ¿Por qué salir de la página cuenta como fallo en Fact or Fake? ¿Cómo funciona la racha? ¿Dónde veo las soluciones de días anteriores? ¿Se guardan mis datos? ¿Funciona sin conexión? (no: necesita cargar los casos del día) ¿Quién hace el juego? ¿Cómo os escribo?
8. **Créditos y fuentes**: como hoy (10.10).
9. **Privacidad** — solo afirmaciones **ciertas hoy** [D-184]:
   - No hay cuentas, registro, formularios ni datos personales que el juego pida o envíe.
   - El progreso (partidas, aciertos, rachas, modo, reto) y la preferencia de idioma se guardan **solo en el dispositivo**, en el almacenamiento local del navegador (`localStorage`; si no está disponible, `sessionStorage` o memoria): claves `identifaiit.v3`, `identifaiit.idioma` y `identifaiit.prueba` (comprobación de disponibilidad). Nunca se envían a ningún servidor. Se borran borrando los datos del sitio en el navegador.
   - Sin analítica, sin publicidad, sin píxeles, sin contenido de terceros: fuentes, imágenes y datos se sirven desde el propio dominio.
   - El sitio está alojado en **GitHub Pages** (GitHub, Inc.), que registra la dirección IP de los visitantes por motivos de seguridad, como cualquier servidor web; enlace a la declaración de privacidad de GitHub.
   - Compartir usa la función del propio dispositivo (o el portapapeles); el juego no ve a quién ni qué se comparte.
   - Si escribes al correo de contacto, tu dirección y tu mensaje se usan solo para responderte.
   - Responsable y contacto: `{{correo}}` (y el nombre del responsable si el usuario lo decide, DP-85). Derechos (acceso, supresión…) por correo; reclamación ante la AEPD.
   - Fecha de actualización. Se actualizará antes de añadir anuncios o cualquier servicio de terceros.
   - **No** se puede afirmar (y no se escribe): "no se registra nada" (GitHub registra IP), "cumplimos el RGPD al 100 %" ni nada sobre anuncios.
10. **Cookies**: el sitio no usa cookies propias ni de terceros; solo el almacenamiento local necesario para el servicio que pides (progreso e idioma), que no requiere consentimiento (art. 22.2 LSSI); tabla con las tres claves, finalidad y duración (hasta que las borres). "Si algún día hay anuncios, esta página cambiará y te pediremos permiso antes."
11. **Contacto**: `{{correo}}` como enlace `mailto:` (contacto@301juegodiario.es, DP-84), para errores, sugerencias, propuestas de temas o para pedir una corrección o retirada; sin formulario (nada que enviar a un servidor).
12. **Aviso legal**: 10.14.

## 10.13 Anuncios futuros: solo el hueco [D-182, DP-87]

- Hoy: los dos `aside` vacíos con `hidden` (10.5.2) y `ANUNCIOS_ACTIVOS = false`. Ningún script, dominio, `ads.txt` ni texto de anuncios. La CSP no cambia.
- Nunca anuncios en `cargando`, `cuenta-atras`, `caso`, `instrucciones`, el veredicto, el tablón del resultado, `dialog#ficha` ni el archivo; solo en la portada (bajo las tarjetas) y en el resultado (debajo de las acciones).
- Activarlos **no** es un ajuste: chocará con la CSP (`default-src 'self'`), con "ninguna petición a dominios externos" (D-29), con "sin dependencias en el navegador" y con "todas las pantallas caben sin scroll" (el hueco necesitará espacio), y exigirá una plataforma de consentimiento (CMP) certificada para el Espacio Económico Europeo, `ads.txt`, publicar el aviso legal (LSSI art. 10), rehacer privacidad y cookies e identificar la publicidad como tal (LSSI art. 20). Será una versión nueva de la spec, con cambios de `CLAUDE.md` aprobados por el usuario.

## 10.14 Aviso legal (borrador, no publicado) [D-184, DP-86]

- Borrador en `docs/aviso-legal.md` con huecos (`[NOMBRE Y APELLIDOS]`, `[NIF]`, `[DOMICILIO]`), según el art. 10 de la LSSI. **No se genera ninguna página**, no se enlaza desde ninguna parte, no entra en el sitemap; `validar` falla si aparece `es/aviso-legal/` o `en/legal-notice/` con `ANUNCIOS_ACTIVOS = false`.
- `docs/` se publica (el repositorio entero se sirve en GitHub Pages y es público): **los datos personales no se escriben nunca en `docs/aviso-legal.md`** ni en ningún archivo del repositorio hasta el momento de publicar la página, y entonces quedarán en el historial de git para siempre (DP-86).
- Por qué no se publica hoy: el art. 10 obliga a quien presta un servicio de la sociedad de la información que constituye una actividad económica (los ingresos por publicidad lo son). Sin anuncios ni ingresos, el usuario puede elegir publicarlo antes; la recomendación es revisarlo con un profesional antes de activar anuncios.

## 10.15 Accesibilidad y composición [D-185]

- **R21. Páginas de contenido** (regla de composición; no confundir con el riesgo R21): pueden deslizar (son artículos). Una columna de 70 caracteres como máximo, cuerpo ≥ 16 px, interlineado ≥ 1,5, sin desplazamiento horizontal a 360 px ni con zoom del 200 % (reflujo, WCAG 1.4.10). Imágenes del archivo a todo el ancho de la columna en móvil (una por fila) y en rejilla desde 600 px, siempre con su sello y su texto debajo.
- **R8 (ampliada). Pie de la portada**: `#portada-aviso-dia` y `#portada-enlaces` caben sin deslizar en los 5 tamaños garantizados y en los dos idiomas; `#portada-enlaces` en **una fila** (con los rótulos cortos `pie.corto_*`, ≤ 48 caracteres en total con los separadores en cada idioma); desde 600 px de ancho, aviso y enlaces pueden compartir línea. Orden de compresión de R8 sin cambios (primero la ilustración), y los enlaces nunca se ocultan. Las demás pantallas del juego siguen exactamente como estaban.
- **Accesibilidad** (raíz, contenido, archivo, créditos y pie de la portada): enlace "Saltar al contenido" visible al recibir el foco; `header`, `nav` con nombre, `main`, `footer`; un solo `h1` y jerarquía sin saltos; `lang` correcto en la página y en "English"/"Español"; `aria-current="page"` en el pie; foco visible; contraste AA (texto ≥ 4,5:1; el pie es **discreto por tamaño y posición, no por bajo contraste**: los enlaces del pie también ≥ 4,5:1 sobre su fondo); área de pulsación ≥ 24 x 24 px CSS en los enlaces del pie (WCAG 2.5.8) y 44 x 44 en los botones; enlaces distinguibles sin depender del color dentro del texto (subrayado); `prefers-reduced-motion`; imágenes del archivo con `alt` neutro y la respuesta en el texto adyacente.

## 10.16 Textos nuevos en `js/textos.js` (cronista) [D-184]

Mismas reglas de 3.1 (dos árboles iguales, límites medidos con relleno). Grupos y claves nuevos en `en` y `es`:

| Grupo | Claves | Límite |
|---|---|---|
| `pie` | `etiqueta` (nombre del `nav`: "Site" / "Sitio"), `sobre`, `como_jugar`, `metodo`, `guia_imagenes`, `guia_desinformacion`, `archivo`, `preguntas`, `creditos`, `privacidad`, `cookies`, `contacto` (rótulos del pie completo) y `corto_sobre`, `corto_como_jugar`, `corto_archivo`, `corto_privacidad`, `corto_creditos` (fila de la portada) | 40; `corto_*` juntos ≤ 48 con " · " |
| `raiz` | `lema`, `jugar` ("Play in English" / "Jugar en español") | 90 / 30 |
| `paginas` | `saltar`, `jugar` | 30 |
| `seo` | `titulo_raiz`, `descripcion_raiz`, `titulo_juego`, `descripcion_juego`, `titulo_archivo`, `descripcion_archivo`, `titulo_dia` (`{n}`, `{tema}`), `descripcion_dia` (`{n}`, `{tema}`), `og_alt` | títulos 60; descripciones 70–155 |
| `archivo` | `titulo_dia` (`{n}`, `{tema}`), `alt_prueba` (`{i}`, `{n}`), `vacio`, `sin_reto` (`{reto}`), `anterior`, `siguiente`, `indice`, `jugar_hoy`, `ejemplos_titulo`, `ver_dia`, `meses` (array de 12), `fecha` (`{d}`, `{mes}`, `{a}`), `mes` (`{mes}`, `{a}`) | 90 |
| `anuncios` | `etiqueta` ("Advertisement" / "Publicidad") | 20 |

- **Se retira** `portada.enlace_creditos` (lo sustituye `pie.corto_creditos`). `creditos.volver` y `creditos.otro_idioma` siguen.
- `archivo.alt_prueba` no puede contener palabras prohibidas en ningún idioma (test).
- `RUTAS` (10.1) es exacta y la escribe el cronista tal cual.

## 10.17 Resumen de lo que cambia en secciones anteriores

| Sección | Cambio |
|---|---|
| 0.2 | Filas de `index.html`, créditos, `js/`, `css/`, `img/`, `package.json` y las nuevas de 10.2. |
| 0.1 | Excepción de rutas absolutas en metadatos (10.7.1). "Ninguna petición a dominios externos" sigue (enlaces externos en las guías no son peticiones). |
| 2.1 | Efectos de `CAMBIAR_IDIOMA` (10.4.3). |
| 2.2 | `data-pagina` con valores nuevos; `data-enlace` nuevo. |
| 2.3 | Pie de la portada (10.5.1) y huecos de anuncio (10.5.2). |
| 2.4 | La cabecera del juego la genera `paginas.mjs` (10.7.1); `<html lang>` y `<title>` ya en el idioma de la dirección; `noscript` en un idioma. |
| 2.6 | R8 ampliada y R21 nueva (10.15). |
| 2.7, 4.5, 4.23 | Créditos en `en/credits/` y `es/creditos/` (10.10). |
| 3.2 | `urlDeIdioma`, `destinoRaiz` (10.3). |
| 3.7 | Arranque, selector, enlaces, noindex, `RAIZ`, `ANUNCIOS_ACTIVOS` (10.4). |
| 4.22 | 10.6.5. |
| 7, 4.24 | El `{url}` de los ejemplos pasa a `https://identifaiit.com/en/` y `https://identifaiit.com/es/` (DP-81); las plantillas no cambian. |
