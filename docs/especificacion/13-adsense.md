# identifAI-it: especificación técnica, versión 3.2 · 13. Preparación de Google AdSense (anexo sin subir versión)

Parte de la especificación **3.2** (índice en `docs/ESPECIFICACION.md`) [D-237]. Rama `feature/adsense`. Deja el sitio **preparado** para pedir el alta en Google AdSense, **sin mostrar ningún anuncio, sin cargar nada de Google y con `ANUNCIOS_ACTIVOS = false`**: metaetiqueta de verificación y `ads.txt` que solo aparecen cuando el usuario ponga su código de editor, privacidad y cookies que anuncian AdSense en futuro, aviso legal listo pero sin publicar, enlace de consentimiento inactivo y una comprobación de que el mensaje de consentimiento de Google no rompe la regla de no scroll.

**Por qué es un anexo sin subir versión** (como la sección 10, D-171): la versión solo sube cuando cambia el comportamiento del juego (D-44). Aquí no cambian las reglas de ningún reto, la máquina de estados (1.3), los datos (calendario v5, `data/facts/` v2), el almacén (`identifaiit.v3`, `identifaiit.archivo.v1`), el compartir ni lo que el jugador ve en el juego (el único elemento nuevo del juego nace con `hidden` y nada lo muestra). Cambian páginas de contenido (texto), el generador, `validar` y un archivo de configuración. **Activar** los anuncios sigue siendo una versión nueva de la spec (D-195, DP-87): se describe lo que quedará para ella en 13.15, pero no se especifica aquí.

**Manda sobre** (donde difieran): 10.2 (estructura: `ads.txt`, `herramientas/adsense.json`, `aviso_legal.html`), 10.5.3 (pie completo), 10.6.1 a 10.6.5 (lectura, exportaciones y `validar`), 10.7.1 (cabecera), 10.7.4 (sitemap), 10.12 puntos 9, 10 y 12 (privacidad, cookies, aviso legal), 10.13, 10.14 y 10.18 (cabecera de `404.html`). Lo que no se cita sigue igual; en particular, 0.1 "Ninguna petición a dominios externos" **sigue vigente** y la CSP de 2.4 **no cambia**.

Requisito previo **P11** (usuario): aplicar en `CLAUDE.md` el texto de 13.16 antes de delegar las tareas 151 a 155. `CLAUDE.md` dice hoy "Anuncios: todavía no. Solo un hueco vacío…" y sitúa el borrador del aviso legal en `docs/aviso-legal.md`, y prevalece sobre la spec.

---

## 13.1 Fases

| Fase | Qué hay publicado | `ANUNCIOS_ACTIVOS` | `editor` (13.3) | Peticiones a Google desde el navegador |
|---|---|---|---|---|
| 0. Antes de esta spec | Huecos vacíos (10.5.2) | `false` | — | ninguna |
| **1. Preparado** (esta spec, con `editor: null`) | Lo de la fase 0 + privacidad y cookies en futuro (13.6) + botón de consentimiento oculto (13.8) | `false` | `null` | **ninguna** |
| **2. Verificación** (esta spec, el usuario pone su código) | Lo de la fase 1 + `<meta name="google-adsense-account">` en el `<head>` de todas las páginas + `ads.txt` | `false` | `ca-pub-…` | **ninguna** (la metaetiqueta y `ads.txt` no hacen que el navegador pida nada) |
| 3. Activación (versión nueva, **fuera de esta spec**) | Script de AdSense, mensaje de consentimiento de Google, anuncios en los huecos, aviso legal publicado, CSP ampliada | `true` | `ca-pub-…` | sí, con el consentimiento que gestione la CMP de Google |

La fase 2 es la que permite a Google revisar el sitio: el usuario elige en la consola de AdSense el método "Metaetiqueta" (o "Fragmento de ads.txt") para conectar el sitio [DP-120].

## 13.2 Reglas [D-237 a D-241]

1. Mientras `ANUNCIOS_ACTIVOS = false` (toda esta spec): ningún archivo publicado contiene `adsbygoogle`, `googlesyndication`, `googletagservices`, `doubleclick` ni `fundingchoices`; ninguna página carga ni enlaza un script, hoja, imagen, `iframe` o fuente de otro origen; la CSP de 2.4 no cambia; el navegador no hace ninguna petición fuera del propio sitio.
2. El código de editor vive en **un solo lugar**: `herramientas/adsense.json` (13.3). Con `null` no se emite nada (ni metaetiqueta ni `ads.txt`) y lo generado es **idéntico byte a byte** a lo de hoy, salvo el botón oculto del juego (13.8). Con un código válido se emiten la metaetiqueta en **todas** las páginas HTML generadas y `ads.txt` en la raíz.
3. **Verificación por metaetiqueta, nunca por script** en esta spec [DP-120]: el script `adsbygoogle.js` solo podrá cargarse en la fase 3 (13.4.2).
4. **Consentimiento solo con la CMP de Google** (mensaje de "Privacidad y mensajes" de AdSense), sin banner propio [D-238]. En las fases 1 y 2 no hace falta pedir consentimiento: no se lee ni se guarda nada en el dispositivo más allá de las claves del juego (exentas, art. 22.2 LSSI) y no se envía nada a Google.
5. **Aviso legal**: contenido listo en `herramientas/contenido/{en,es}/aviso_legal.html`, con huecos; **solo se genera, se enlaza y entra en el sitemap si `ANUNCIOS_ACTIVOS === true` y no queda ningún hueco** en ninguno de los dos idiomas [D-239]. Los datos personales los escribe el usuario **solo** en esos dos archivos, **nunca** en `docs/` ni en ningún otro sitio.
6. **Ninguna página publicada contiene un hueco sin rellenar** (`[NIF]`, `[DOMICILIO]`…): `validar` falla [D-240].
7. Los textos de privacidad y cookies son **ciertos en cada fase**: hablan de AdSense en futuro ("tenemos previsto", "podrán") y dicen que hoy no hay anuncios ni nada de Google [D-242].
8. Los huecos de anuncio (10.5.2), los lugares prohibidos para anuncios y `ANUNCIOS_ACTIVOS` no cambian. `validar` sigue fallando si `ANUNCIOS_ACTIVOS` vale `true` (10.6.5), hasta la versión de activación.

## 13.3 Configuración: `herramientas/adsense.json` [D-241, DP-121]

Archivo **versionado y publicado** (no va en `.gitignore`; el código de editor es público por naturaleza: aparece en `ads.txt` y en el HTML). Lo crea el archivero con este contenido exacto (UTF-8, LF final):

```json
{
  "version": 1,
  "editor": null
}
```

- `editor`: `null` o una cadena `ca-pub-` seguida de **16 dígitos** (`/^ca-pub-\d{16}$/`), por ejemplo `"ca-pub-1234567890123456"`. Es el valor del atributo `content` de la metaetiqueta y del `client` del script. Para `ads.txt` se usa sin el prefijo `ca-` (`pub-1234567890123456`).
- Si el código que da Google no encaja en el patrón (otra longitud), el usuario avisa y se ajusta el patrón con una decisión nueva; no se relaja por anticipado.
- No hay más campos: el método (metaetiqueta) lo fija la spec, no la configuración.
- Lo leen `paginas.mjs` (y a través de él `creditos.mjs`) y `validar.mjs`. **No lo lee el navegador**: `js/` no cambia.
- Cambiarlo exige `npm run paginas` **y** `npm run creditos` (los créditos también llevan la cabecera); `validar` falla si se olvida.

Exportaciones nuevas de `herramientas/paginas.mjs` (puras salvo la marcada):

| Exportación | Descripción |
|---|---|
| `RE_EDITOR` | `/^ca-pub-\d{16}$/`. |
| `analizarAdsense(texto)` | `{editor, errores}`. `editor` = `null` o la cadena válida. Error (y `editor: null`) si el JSON no es válido, no es un objeto, `version !== 1`, falta `editor`, sobra algún campo o `editor` no es `null` ni cumple `RE_EDITOR`. Nunca lanza. |
| `leerAdsense(raiz)` *(efecto)* | Lee `herramientas/adsense.json`; si no existe, `{editor: null, errores: ['Falta herramientas/adsense.json.']}`. |
| `metaAdsense(editor)` | `''` con `null`; si no, `'<meta name="google-adsense-account" content="' + editor + '">'`. |
| `contenidoAdsTxt(editor)` | `null` con `null`; si no, `` `google.com, ${editor.slice(3)}, DIRECT, f08c47fec0942fa0\n` ``. |

`leerEntradas` añade `adsense: {editor}` y `anunciosActivos` (13.7.3) a las entradas; `generarSitio` los recibe y los pasa a cada generador. `paginas.mjs` aborta con código 1 (sin escribir nada) si `analizarAdsense` da errores.

## 13.4 Cabecera de las páginas [D-241, DP-120]

### 13.4.1 Metaetiqueta (fases 2 y 3)

Con `editor` válido, **una** línea `metaAdsense(editor)` en el `<head>` de cada HTML que genera `paginas.mjs` o `creditos.mjs`, en esta posición exacta:

| Página | Generador | Posición |
|---|---|---|
| Juego (`en/index.html`, `es/index.html`), raíz, páginas de contenido, índice y días del archivo, créditos | `cabecera()` (10.7.1) | Justo después de `<meta name="description">` y, si existe, de `<meta name="robots" content="noindex">`; antes de `<link rel="canonical">`. |
| `404.html` | `generarNoEncontrada` | Justo después de `<meta name="robots" content="noindex">` (la inserta el generador; la plantilla `404.html` **no cambia**). |
| `creditos.html`, `creditos.es.html` (redirecciones) | `generarRedireccion` | Justo después de `<title>`. |

- Con `editor: null` no se emite ninguna línea (ni vacía): la salida es la de hoy.
- Ejemplo de cabecera de una página de contenido con editor:
  ```html
  <title>Política de privacidad · identifAI-it</title>
  <meta name="description" content="…">
  <meta name="google-adsense-account" content="ca-pub-1234567890123456">
  <link rel="canonical" href="https://identifaiit.com/es/privacidad/">
  ```
- La metaetiqueta **no carga nada**, no ejecuta nada, no cambia la CSP ni choca con `comprobarSitio` (no tiene `href` ni `src`) ni con las palabras prohibidas (`google`, `adsense`, `account`, `ca`, `pub` no están en la lista). Por eso puede publicarse en la fase 2 sin consentimiento ni cambio de privacidad más allá del anuncio en futuro.
- `main.js` no toca la metaetiqueta (como el resto del `<head>`, salvo `title`, `description` y `robots`, 10.4.3 y 10.4.4).

### 13.4.2 Script de AdSense: solo en la fase 3 (análisis)

El usuario citó `https://pagead2.googleadsbygoogle.com/pagead/js/adsbygoogle.js`: **esa dirección no es la de Google**. La correcta es:

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456" crossorigin="anonymous"></script>
```

No se emite en esta spec porque choca con:

| Regla | Choque |
|---|---|
| CSP de 2.4 (`default-src 'self'`) | El navegador lo bloquearía. AdSense carga además scripts, marcos e imágenes de varios dominios de Google; con una CSP en `<meta>` (GitHub Pages no permite cabeceras) no hay *nonce* por petición, así que habría que abrir la CSP con listas de orígenes amplias. |
| `CLAUDE.md`: "sin dependencias en el navegador"; 0.1 y D-29: "ninguna petición a dominios externos" | Es una dependencia externa y hace peticiones a Google en cada visita. |
| Consentimiento (RGPD, art. 22.2 LSSI, política de consentimiento de usuarios de la UE de Google) | Cargado sin la CMP, en el EEE envía a Google la IP y datos del navegador y puede acceder al dispositivo sin consentimiento: hay que pedirlo **antes**, y la CMP de Google solo funciona cuando el script ya está. Las fases 1 y 2 no tienen CMP. |
| Anuncios automáticos (*Auto ads*) | Si el usuario activa en la consola los anuncios automáticos, el mismo script coloca anuncios donde Google decide, **también durante la partida y en las revelaciones**, que `CLAUDE.md` prohíbe (R49). |
| Privacidad y cookies | Dirían algo falso ("hoy no se carga nada de Google"). |
| `validar` y tests | `comprobarSitio` da error por `src` externo ("carga un recurso externo") y por CSP distinta; los créditos dan error por contener `<script>`; `validar` da error por `https://` en `js/` si se cargara desde un módulo. |

Por eso la verificación va por **metaetiqueta** (Google la acepta como método de "conectar el sitio", junto al fragmento de código y al fragmento de `ads.txt`) y el script queda para la versión de activación, con CSP ampliada, CMP configurada, anuncios automáticos desactivados y unidades manuales solo en los huecos. **No puedo comprobar la consola de AdSense del usuario**: si en su cuenta no aparece el método "Metaetiqueta", usar "Fragmento de ads.txt"; solo si Google exige el script, ver las alternativas de DP-120.

## 13.5 `ads.txt`, `robots.txt` y `sitemap.xml` [D-241]

- `ads.txt` en la raíz del sitio, generado por `paginas.mjs` **solo** con `editor` válido, con el contenido exacto de `contenidoAdsTxt` (una línea, LF final, sin BOM):
  ```
  google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0
  ```
  `f08c47fec0942fa0` es el identificador fijo de Google en el estándar `ads.txt` de IAB.
- Con `editor: null`, `generarSitio` no incluye `ads.txt` y `escribirSitio` **borra** `ads.txt` de la raíz si existe (es el único archivo que borra fuera de los días del archivo y del aviso legal, 13.7.3). Así quitar el código deja el sitio como hoy.
- Solo vale en la raíz del dominio (`https://identifaiit.com/ads.txt`); en una subcarpeta de `github.io` no tiene efecto (aceptado: el sitio vive en el dominio propio).
- `robots.txt` **no cambia** (10.7.4): no bloquea `ads.txt` ni las páginas; el rastreador de AdSense (`Mediapartners-Google`) sigue las reglas de `User-agent: *`, y `/docs/`, `/herramientas/` y `/tests/` no tienen que ver con anuncios.
- `sitemap.xml` **no incluye** `ads.txt` (no es una página). Sí incluye el aviso legal cuando se publica (13.7.4).
- La GitHub Action (10.9) no cambia: como `ads.txt` solo cambia al cambiar `adsense.json`, la ejecución diaria no lo toca; si alguien cambia `adsense.json` sin regenerar, la Action falla porque `paginas` modifica archivos fuera de `en/`, `es/` y `sitemap.xml` (red de seguridad deseada).

## 13.6 Privacidad y cookies (cronista; lo aprueba el usuario) [D-242]

Normas: solo afirmaciones **ciertas hoy** (fases 1 y 2); lo futuro, en futuro. Se mantienen intactas las listas de claves del almacén (las cuatro: `identifaiit.v3`, `identifaiit.archivo.v1`, `identifaiit.idioma`, `identifaiit.prueba`) y la copia de sesión. **No se listan** cookies de Google (`__gads`, `__gpi`, `FCCDCF`…): hoy no existen y su lista real se hará en la fase 3 a partir de lo que declare la CMP. Enlaces externos con las reglas de 10.6.3 (solo `https://`, `rel="noopener"`, sin `target`). Fecha "Última actualización" = la del commit. Tras editar: `npm run paginas`.

Enlace obligatorio, igual en los dos idiomas (Google sirve la página en el idioma del navegador): `https://policies.google.com/technologies/partner-sites`.

### 13.6.1 `herramientas/contenido/es/privacidad.html`

- La sección "Sin analítica ni contenido de terceros" pasa a ser (texto exacto):
  ```html
  <h2>Hoy, sin analítica, publicidad ni terceros</h2>
  <p>Hoy no hay analítica, publicidad, píxeles de seguimiento ni contenido de terceros, y el sitio no carga ningún script de Google ni de nadie más. Las fuentes, las imágenes y los datos se sirven desde nuestro propio dominio.</p>
  ```
- Sección nueva, justo después (texto exacto):
  ```html
  <h2>Publicidad con Google AdSense (próximamente)</h2>
  <p>Tenemos previsto mostrar anuncios con Google AdSense, un servicio de Google. Todavía no hay anuncios. Cuando los activemos:</p>
  <ul>
  <li>Los anuncios solo aparecerán en la portada del juego y en la pantalla de resultado, nunca durante la partida ni junto a las respuestas.</li>
  <li>Al cargar los anuncios, tu navegador se conectará con servidores de Google, que recibirán datos técnicos como tu dirección IP y el tipo de navegador.</li>
  <li>Si lo permites, Google y sus socios usarán cookies y otros identificadores para mostrar anuncios, medir su rendimiento y evitar el fraude.</li>
  <li>Los anuncios personalizados, basados en tus intereses, solo se mostrarán si das tu consentimiento. Si no lo das, Google podrá mostrar anuncios no personalizados o limitados, que usan menos datos.</li>
  <li>Te pediremos tu elección con el mensaje de consentimiento de Google antes de usar cookies publicitarias, y actualizaremos esta página y la de cookies con el detalle.</li>
  <li>Podrás cambiar o retirar tu consentimiento cuando quieras con el enlace «Gestionar consentimiento» del pie de página, o borrando los datos de este sitio en tu navegador.</li>
  </ul>
  <p>Puedes leer cómo usa Google estos datos en <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">Cómo utiliza Google la información de sitios web o aplicaciones que utilizan sus servicios</a>.</p>
  ```
- "Cambios" pasa a: `<p>Actualizaremos esta página antes de activar los anuncios o de añadir cualquier otro servicio de un tercero.</p>`
- La `descripcion` no cambia (sigue siendo cierta).

### 13.6.2 `herramientas/contenido/es/cookies.html`

- Primer párrafo: "identifAI-it no usa cookies…" pasa a **"Hoy, identifAI-it no usa cookies, ni propias ni de terceros."** seguido del resto igual.
- El último párrafo ("Si algún día hay anuncios…") se sustituye por (texto exacto):
  ```html
  <h2>Publicidad (próximamente)</h2>
  <p>Hoy no hay anuncios ni cookies publicitarias. Tenemos previsto mostrar anuncios con Google AdSense. Cuando lo hagamos, Google y sus socios podrán usar cookies para mostrar anuncios (personalizados solo si das tu consentimiento), medirlos y evitar el fraude. Te pediremos permiso antes con el mensaje de consentimiento de Google, y esta página listará entonces esas cookies.</p>
  <h2>Cómo cambiar tu consentimiento</h2>
  <p>Cuando haya anuncios, podrás cambiar o retirar tu consentimiento cuando quieras con el enlace «Gestionar consentimiento» del pie de página. También puedes borrar los datos de este sitio en tu navegador. Más información en <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">Cómo utiliza Google la información de sitios web o aplicaciones que utilizan sus servicios</a>.</p>
  ```
- La `descripcion` no cambia.

### 13.6.3 Inglés (`herramientas/contenido/en/`)

Mismo sentido y estructura; propuesta (el cronista la ajusta al estilo de las páginas):
- privacy: `<h2>Today: no analytics, ads or third parties</h2>` · "Today there is no analytics, no advertising, no tracking pixels and no third-party content, and the site doesn't load any script from Google or anyone else. …" · `<h2>Advertising with Google AdSense (coming later)</h2>` · "We plan to show ads with Google AdSense, a Google service. There are no ads yet. When we turn them on:" · las seis viñetas ("Ads will only appear on the game's home screen and on the result screen, never during a game or next to the answers." · "To load ads, your browser will connect to Google's servers, which will receive technical data such as your IP address and browser type." · "If you allow it, Google and its partners will use cookies and other identifiers to show ads, measure them and prevent fraud." · "Personalized ads, based on your interests, will only be shown if you consent. If you don't, Google may show non-personalized or limited ads, which use less data." · "We will ask for your choice through Google's consent message before any advertising cookie is used, and we will update this page and the cookies page with the details." · "You will be able to change or withdraw your consent at any time with the "Manage consent" link in the footer, or by clearing this site's data in your browser.") · "Read how Google uses this data in <a …>How Google uses information from sites or apps that use our services</a>." · Changes: "We will update this page before turning on ads or adding any other third-party service."
- cookies: "Today, identifAI-it doesn't use cookies, …" · `<h2>Advertising (coming later)</h2>` · `<h2>How to change your consent</h2>` con el mismo sentido que en español.

## 13.7 Aviso legal [D-239, D-240, D-244]

### 13.7.1 Archivos

- **Fuente** (sustituye a `docs/aviso-legal.md` como texto del aviso): `herramientas/contenido/es/aviso_legal.html` (referencia) y `herramientas/contenido/en/aviso_legal.html` (traducción, aprobada por el usuario). Mismo formato que las demás páginas de contenido (10.6.3), clave `aviso_legal` (ya en `RUTAS`: `aviso-legal/` y `legal-notice/`).
- `docs/aviso-legal.md` se reduce a un aviso de que el texto vive en esos archivos y a la lista de comprobación antes de publicar (tarea 152). Así no hay dos textos que se desincronicen y `docs/` no tiene nada que rellenar.
- **Plantilla**: la de todas las páginas de contenido (`pagina.html`), sin cambios. No hay plantilla nueva.

### 13.7.2 Contenido (`es`, texto de referencia)

Cabecera:
```html
<!--
titulo: Aviso legal
descripcion: Datos del titular de identifAI-it, condiciones de uso, propiedad intelectual, publicidad y legislación aplicable al juego diario.
h1: Aviso legal
tipo: pagina
-->
```
Cuerpo: el de `docs/aviso-legal.md` (secciones 1 a 10, sin la nota HTML para el usuario, sin el bloque de borrador del principio y sin la lista de comprobación), pasado a las etiquetas permitidas (`h2`, `p`, `ul`, `li`, `strong`, `em`, `a`), con estos cambios:
- Primera línea: `<p>Última actualización: [FECHA].</p>`
- Sección 1: `Titular: [NOMBRE Y APELLIDOS]`, `NIF: [NIF]`, `Domicilio: [DOMICILIO]`, correo como `<a href="{{correo}}">contacto@301juegodiario.es</a>` y sitio web como **texto** `https://identifaiit.com` (sin enlace: `comprobarSitio` prohíbe `href` absolutos del dominio fuera de los metadatos).
- Sección 5: "El detalle está en la <a href="{{enlace:creditos}}">página de créditos</a>."
- **Sección 8 Publicidad** (texto exacto):
  ```html
  <h2>8. Publicidad</h2>
  <ul>
  <li>El sitio muestra publicidad de Google AdSense, un servicio de Google Ireland Limited (Gordon House, Barrow Street, Dublín 4, Irlanda), identificada como tal con el rótulo «Publicidad» (art. 20 LSSI).</li>
  <li>Los anuncios solo aparecen en la portada del juego y en la pantalla de resultado, nunca durante la partida, junto a las respuestas ni en el archivo de casos.</li>
  <li>Google y sus socios pueden usar cookies e identificadores para mostrar los anuncios, medirlos y evitar el fraude. Los anuncios personalizados solo se muestran si lo consientes en el mensaje de consentimiento de Google, y puedes cambiar tu elección en cualquier momento con el enlace «Gestionar consentimiento» del pie de página. Más información en la <a href="{{enlace:cookies}}">Política de cookies</a> y en <a href="https://policies.google.com/technologies/partner-sites" rel="noopener">Cómo utiliza Google la información de sitios web o aplicaciones que utilizan sus servicios</a>.</li>
  <li>El titular no elige el contenido concreto de cada anuncio, que selecciona Google. Si ves un anuncio inapropiado, escríbenos a <a href="{{correo}}">contacto@301juegodiario.es</a>.</li>
  </ul>
  ```
  (Está en presente porque la página solo se publica con los anuncios activos.)
- **Sección 9**: "…se explica en la <a href="{{enlace:privacidad}}">Política de privacidad</a>, y el uso de almacenamiento local y cookies, en la <a href="{{enlace:cookies}}">Política de cookies</a>." (sin el hueco `[ENLACES…]`).
- Inglés: misma estructura, **con los mismos marcadores en español** (`[NOMBRE Y APELLIDOS]`, `[NIF]`, `[DOMICILIO]`, `[FECHA]`) para que el usuario los encuentre con una sola búsqueda, y al final: "This is a translation; in case of discrepancy, the Spanish version prevails." Cabecera: `titulo: Legal notice`, `descripcion: Owner details for identifAI-it, terms of use, intellectual property, advertising and governing law for the daily game.`, `h1: Legal notice`.
- Sin comentarios HTML en el cuerpo (solo la cabecera).

### 13.7.3 Preparado frente a publicado: condición exacta

**Hueco** = coincidencia de `RE_HUECO = /(?<!\[)\[[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ0-9 ,.;:'’()\/_-]*\](?!\])/gu` (corchete simple con texto en mayúsculas). Detecta `[NOMBRE Y APELLIDOS]`, `[NIF]`, `[DOMICILIO]`, `[FECHA]`, `[COMPLETAR AL ACTIVAR…]`; no detecta `[[grupo.clave]]`, `["en", "es"]` del JSON-LD, `[1]` ni texto en minúsculas.

Funciones nuevas de `paginas.mjs` (puras):

| Función | Descripción |
|---|---|
| `huecosSinRellenar(texto)` | Lista de huecos encontrados (cadenas, en orden, sin repetir). `[]` si no es cadena. Nunca lanza. |
| `avisoLegalPublicable({anunciosActivos, contenido})` | `true` **solo** si `anunciosActivos === true`, existen `contenido.en.aviso_legal` y `contenido.es.aviso_legal`, y `huecosSinRellenar` da `[]` en los dos. En cualquier otro caso, `false`. |
| `paginasPublicadas(publicable)` | `PAGINAS` (sin cambios, 11 claves) o, si `publicable`, `[...PAGINAS, 'aviso_legal']`. Es lo que usan el pie completo, el sitemap y la generación. |

`anunciosActivos` lo obtiene `leerEntradas` con `analizarAnunciosActivos(js/main.js)` (la misma función de `temas.mjs` que usa `validar`; `null` cuenta como `false`). `leerEntradas` lee siempre `aviso_legal.html` de los dos idiomas, aunque no se publique.

| Estado | Condición | `paginas.mjs` | `validar` |
|---|---|---|---|
| **Preparado** (hoy) | `ANUNCIOS_ACTIVOS = false` (con o sin huecos) | Analiza los dos `aviso_legal.html` con `analizarContenido` (sus errores son errores) pero **no** genera `es/aviso-legal/` ni `en/legal-notice/`, no los enlaza, no los pone en el sitemap; `escribirSitio` borra esas dos carpetas si existen. | Error si existe `es/aviso-legal/` o `en/legal-notice/` ("El aviso legal solo se publica con ANUNCIOS_ACTIVOS = true y sin huecos (13.7.3)."). Error si falta alguno de los dos `aviso_legal.html`. **Aviso** (no error) si ya no tienen huecos: "El aviso legal ya no tiene huecos pero no se publica hasta activar los anuncios; esos datos ya están en el repositorio público si los has subido." |
| Activo con huecos | `ANUNCIOS_ACTIVOS = true` y algún hueco | No genera el aviso legal. | Error "No se pueden activar los anuncios sin aviso legal: quedan huecos {lista} en herramientas/contenido/{idioma}/aviso_legal.html." (además del error actual por `true`, mientras dure esta versión). |
| **Publicado** (fase 3) | `avisoLegalPublicable` | Genera las dos páginas, las añade al final del pie completo (13.7.4), a la raíz y al sitemap. | Las compara como el resto ("Páginas desactualizadas"). |

Esto **sustituye** la regla de 10.6.5 "error si existe el aviso legal con `ANUNCIOS_ACTIVOS = false`" (que pasa a ser el primer error de la tabla) y la de 10.14 "no se genera ninguna página".

**Huecos en lo publicado** (regla 6): `validar` aplica `huecosSinRellenar` a **todo archivo que se publica como página**: cada entrada `.html` del mapa de `generarSitio`, `en/credits/index.html`, `es/creditos/index.html` y `404.html`. Error: "{ruta}: hueco sin rellenar {hueco}." No se aplica a las fuentes (`herramientas/contenido/`, `docs/`), donde los huecos son legítimos. También lo comprueba `comprobarSitio`.

**Cómo se activa** (en la versión de activación, nunca en esta): (1) spec nueva que retire el error por `ANUNCIOS_ACTIVOS = true`; (2) el usuario rellena los huecos en los dos `aviso_legal.html`, **en el mismo commit** que activa los anuncios [DP-124]; (3) `ANUNCIOS_ACTIVOS = true`; (4) `npm run paginas` y `npm run creditos`; (5) `npm test` y `npm run validar`.

### 13.7.4 Enlaces al aviso legal (solo publicado)

- **Pie completo** (10.5.3): 12.º enlace, último, después de Contacto, con `[[pie.aviso_legal]]` y `aria-current` en su propia página.
- **Raíz** (10.3): tras los tres enlaces de cada idioma, `aviso_legal` en inglés y en español. Para que sea posible, la plantilla `raiz.html` sustituye las seis `<li>` fijas por `{{pie_raiz}}`, que el generador rellena con **exactamente** las mismas seis líneas de hoy (salida idéntica byte a byte) más las dos del aviso legal (y las del consentimiento, 13.8) cuando toque.
- **Sitemap**: tras `contacto` en el bloque de cada idioma.
- **Juego**: no en esta spec; la fila de la portada no tiene sitio (R8, ≤ 48 caracteres) [DP-122].
- `404.html`: sin cambios (no tiene pie).

## 13.8 Consentimiento: solo la CMP de Google [D-238, D-243, DP-123]

- En la fase 3, el mensaje de consentimiento será el de "Privacidad y mensajes" de AdSense (*Funding Choices*), certificado por Google para el EEE y el Reino Unido. **No hay banner propio**, ni ahora ni entonces: nada en el sitio imita, tapa o duplica ese mensaje.
- El sitio queda listo con un enlace discreto para reabrir el mensaje ("Manage consent" / "Gestionar consentimiento"), **inactivo** en las fases 1 y 2:
  - **Juego** (`herramientas/plantillas/juego.html`): último hijo de `nav#portada-enlaces`:
    ```html
    <button type="button" id="portada-consentimiento" class="pie-boton" data-texto="pie.consentimiento" hidden>[[pie.consentimiento]]</button>
    ```
    Con `hidden` siempre en esta spec; **ninguna regla de CSS puede darle `display`** (como a `.anuncio`, 10.5.2); `main.js` no lo menciona (solo repinta su texto como cualquier `[data-texto]`). Al ser el último y estar oculto, no altera la fila de enlaces ni sus separadores. No lleva `data-accion` hasta la fase 3.
  - **Páginas de contenido y raíz**: el generador **no emite nada** mientras `ANUNCIOS_ACTIVOS = false`. Con `true` (fase 3, probado ya con la bandera inyectada en los tests) añade al final del pie completo `<li><a href="{ruta relativa a cookies}" data-consentimiento="">[[pie.consentimiento]]</a></li>` (sin JS lleva a la sección "Cómo cambiar tu consentimiento" de cookies; en la fase 3 un módulo lo interceptará para reabrir el mensaje de Google) y lo mismo en `{{pie_raiz}}` en los dos idiomas.
- Ni `consentimiento` ni `data-consentimiento` contienen palabras prohibidas.
- **Lo que no puedo verificar**: el aspecto, tamaño, posición, estilos, comportamiento de foco y desplazamiento reales del mensaje de Google, si bloquea el desplazamiento del `body`, si muestra por defecto un botón flotante de "Privacidad y cookies" y cómo convive con nuestros `dialog` modales. Dependen de la configuración que el usuario elija en la consola y de cambios de Google. La comprobación de 13.9 usa un mensaje **simulado**; la versión de activación debe repetirla con el mensaje real en el sitio publicado.

## 13.9 Comprobación de superposición del mensaje de consentimiento (Playwright) [D-243]

Objetivo: demostrar que un mensaje de terceros superpuesto (`position: fixed`) **no hace que la página gane scroll** ni mueve el juego, en 360 x 640, 640 x 360 y 1280 x 720. El desplazamiento **dentro** del mensaje es del tercero y no se exige nada sobre él.

**Cómo** (agente-de-campo; no cambia el proyecto): guion en `capturas/cmp-simulado.mjs` (en `.gitignore`), con Playwright por `npx` (como `og.mjs`), Chromium y WebKit, sobre `npx serve` en la raíz del repositorio, con `?fecha=` (previsualización local: no guarda nada) y en los dos idiomas. **Sin tocar producción**: el mensaje simulado se inyecta en la página ya cargada con `page.evaluate`, creando elementos con `document.createElement` y estilos por CSSOM (`el.style.setProperty`), que la CSP no bloquea; nunca con `addStyleTag`, atributos `style` en HTML ni `bypassCSP`.

**Mensajes simulados** (raíz común: `div#cmp-simulado` añadido como último hijo de `body`, `z-index: 2147483647`, fuente del sistema; contenido: párrafos de texto y tres botones):

| Variante | Geometría | Contenido |
|---|---|---|
| V1 Modal centrado | Fondo `position: fixed; inset: 0; background: rgba(0,0,0,.6)`; caja `position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(92vw, 640px); max-height: min(90vh, 640px); overflow: auto` | 1400 px de alto (obliga a desplazar dentro de la caja) |
| V2 Hoja inferior | `position: fixed; left: 0; right: 0; bottom: 0; max-height: 70vh; overflow: auto` | 900 px de alto |
| V3 Barra inferior | `position: fixed; left: 0; right: 0; bottom: 0` | 160 px de alto, sin desplazamiento propio |
| V4 Botón flotante de revocación | `position: fixed; left: 16px; bottom: 16px; width: 200px; height: 40px` | un botón |
| V5 V1 + bloqueo | V1 y además `document.body.style.overflow = 'hidden'` (lo hacen algunos mensajes); al quitarlo se restaura el valor anterior | — |

**Pantallas**: portada (hoy), lista `dialog#casos` cerrada, instrucciones de los dos retos, `caso/pregunta` de Images (modo Investigator, sin temporizador) y de Fact or Fake, `caso/veredicto`, `resultado`, `ya-jugado`; y, como páginas que pueden deslizar, la raíz, `privacidad/`, un día del archivo y `404.html` (esta última solo en el sitio publicado, 10.18).

**Exigencias** (para cada pantalla × tamaño × idioma × navegador × variante):
1. **Juego**: `document.scrollingElement.scrollHeight ≤ innerHeight` y `scrollWidth ≤ innerWidth` con el mensaje puesto; tras `page.mouse.wheel(0, 600)` sobre el mensaje y sobre una zona del juego fuera de él, `window.scrollY === 0` y `scrollX === 0`.
2. **Juego**: las cajas (`getBoundingClientRect`) de la pantalla visible y de todos sus botones y enlaces son iguales (± 1 px) antes y después de inyectar el mensaje: el mensaje no mueve ni redimensiona nada.
3. **Páginas de contenido**: `scrollHeight` igual antes y después (± 1 px) y `scrollWidth ≤ innerWidth`.
4. Al quitar el mensaje: todo vuelve a medir lo de antes (incluido `overflow` del `body` en V5) y el juego responde al teclado (un voto con R o F/D).
5. **V4 (informativo, no falla)**: lista de controles del juego que el botón flotante tapa en cada tamaño (por ejemplo, el botón REAL o los enlaces del pie a 360 x 640). Alimenta DP-123.
6. **Diálogos modales (informativo)**: con `dialog#casos` y `dialog#ficha` abiertos con `showModal()`, el mensaje simulado queda **debajo** (la capa superior del navegador gana a cualquier `z-index`) y no recibe clics. Se anota para la fase 3 (R52); no es un fallo de esta spec.

## 13.10 Contrato y cambios por archivo

| Archivo | Cambio | Agente |
|---|---|---|
| `herramientas/adsense.json` | Nuevo (13.3), `editor: null`. | archivero |
| `herramientas/paginas.mjs` | `RE_EDITOR`, `analizarAdsense`, `leerAdsense`, `metaAdsense`, `contenidoAdsTxt`, `RE_HUECO`, `huecosSinRellenar`, `avisoLegalPublicable`, `paginasPublicadas`; `cabecera({…, editor})`; `generarNoEncontrada` y `generarRedireccion` con `editor`; `generarSitio` con `ads.txt`, aviso legal y `{{pie_raiz}}`; `leerEntradas` con `adsense`, `anunciosActivos` y `aviso_legal`; `escribirSitio` borra `ads.txt` y las carpetas del aviso legal cuando no tocan (solo esas tres rutas); `comprobarSitio` con huecos y con las subcadenas prohibidas de 13.2.1. `CSP`, `PAGINAS` y `ROBOTS` **no cambian**. | archivero |
| `herramientas/creditos.mjs` | Pasa `editor` (de `leerAdsense`) a `generarPagina`. | archivero |
| `herramientas/validar.mjs` | `adsense.json` válido; `ads.txt` coherente con `editor` (existe con el contenido exacto si hay editor; no existe si es `null`); créditos con la metaetiqueta si y solo si hay editor; tabla de 13.7.3; huecos en lo publicado; subcadenas de Google prohibidas en todo lo publicado y en `js/` (13.2.1). | archivero |
| `herramientas/plantillas/raiz.html` | Las seis `<li>` del pie pasan a `{{pie_raiz}}`. | perito-visual |
| `herramientas/plantillas/juego.html` | `button#portada-consentimiento` oculto (13.8). | perito-visual |
| `css/componentes.css` | `.pie-boton`: aspecto de enlace del pie (para la fase 3), sin ninguna regla que le dé `display`. | perito-visual |
| `js/textos.js` | `pie.aviso_legal`, `pie.consentimiento` (13.11). | cronista |
| `herramientas/contenido/{en,es}/privacidad.html`, `cookies.html` | 13.6. | cronista |
| `herramientas/contenido/{en,es}/aviso_legal.html` | Nuevos (13.7.2), con huecos. | cronista |
| `docs/aviso-legal.md` | Puntero y lista de comprobación (13.7.1). | inspector-jefe |
| `js/main.js` y demás de `js/` | **Sin cambios.** | — |
| `tests/` | 13.12. | según el criterio |

## 13.11 Textos nuevos en `js/textos.js` (cronista)

| Clave | en | es | Límite |
|---|---|---|---|
| `pie.aviso_legal` | "Legal notice" | "Aviso legal" | 40 |
| `pie.consentimiento` | "Manage consent" | "Gestionar consentimiento" | 40 |

Los dos árboles iguales (3.1); el test de claves de `pie` se actualiza. No se añaden textos de anuncios (`anuncios.etiqueta` ya existe).

## 13.12 Criterios de aceptación (8.52)

### Configuración y cabecera (node --test, archivero)

387. `analizarAdsense`: `{"version":1,"editor":null}` → `{editor: null, errores: []}`; `{"version":1,"editor":"ca-pub-1234567890123456"}` → ese editor sin errores. Con `editor` `"pub-1234567890123456"`, `"ca-pub-123"`, `"ca-pub-12345678901234567"`, `"CA-PUB-1234567890123456"`, `1234`, `""`, sin `editor`, con un campo de más, con `version: 2` o con JSON no válido → `editor: null` y al menos un error. Nunca lanza.
388. **Sin editor, nada cambia**: `generarSitio` con `editor: null` produce un mapa sin `ads.txt` y en el que ningún archivo contiene `google-adsense-account`, `adsbygoogle`, `googlesyndication`, `fundingchoices` ni `aviso-legal`/`legal-notice`; todos los archivos son idénticos byte a byte a los de la rama `main` (mismo `ahoraMs`) salvo `en/index.html` y `es/index.html`, cuya única diferencia es el `button#portada-consentimiento` oculto.
389. **Con editor** `ca-pub-1234567890123456`: cada `.html` del mapa (raíz, `404.html`, las dos redirecciones, los dos juegos, todas las páginas de contenido, índice y días del archivo) contiene **exactamente una** `<meta name="google-adsense-account" content="ca-pub-1234567890123456">`, dentro de `<head>` y en la posición de 13.4.1; ninguno contiene `<script` con `src` de otro origen ni las subcadenas de Google de 13.2.1; la CSP es la de 2.4 en todos; `ads.txt` es exactamente `google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n`; `robots.txt` y `sitemap.xml` son idénticos a los de `editor: null`; `comprobarSitio` no da errores.
390. Ida y vuelta: `null` → editor → `null` vuelve a un mapa idéntico al primero; `escribirSitio` con `editor: null` borra un `ads.txt` existente y no borra nada fuera de `ads.txt`, `es/aviso-legal/`, `en/legal-notice/` y los días sobrantes del archivo.
391. Créditos: `generarPagina` de `creditos.mjs` con editor lleva la metaetiqueta en la misma posición; sin editor, idéntica a hoy; ninguno de los dos lleva `<script`.

### Aviso legal (node --test, archivero)

392. `huecosSinRellenar`: con el contenido de 13.7.2 devuelve `['[FECHA]', '[NOMBRE Y APELLIDOS]', '[NIF]', '[DOMICILIO]']`; con `'[[pie.sobre]]'`, `'["en", "es"]'`, `'[1]'`, `'[nota]'`, `''`, `null` → `[]`; `'[COMPLETAR AL ACTIVAR LOS ANUNCIOS: PROVEEDOR]'` → una coincidencia.
393. `avisoLegalPublicable`: (`false`, sin huecos) → `false`; (`true`, huecos solo en `es`) → `false`; (`true`, huecos solo en `en`) → `false`; (`true`, falta `en`) → `false`; (`null`, sin huecos) → `false`; (`true`, sin huecos) → `true`.
394. Con `anunciosActivos: false` (y con `true` pero huecos): ningún archivo del mapa contiene `aviso-legal` ni `legal-notice` (el test 309 sigue pasando sin cambios) y el pie completo tiene 11 enlaces. Con `true` y sin huecos (inyectado): el mapa tiene `es/aviso-legal/index.html` (`lang="es"`, `h1` "Aviso legal") y `en/legal-notice/index.html` (`lang="en"`), con `canonical` y `hreflang` cruzados; el pie completo de **todas** las páginas de contenido y del archivo tiene 12 enlaces con el aviso legal el último; la raíz, dos enlaces más; el sitemap, las dos URL tras las de contacto; `en/index.html` y `es/index.html` no lo enlazan.
395. `analizarContenido` acepta los dos `aviso_legal.html`, `privacidad.html` y `cookies.html` sin errores (enlaces externos con `rel="noopener"` y sin `target`, sin `id`, `class` ni comentarios en el cuerpo).
396. `{{pie_raiz}}`: con las banderas apagadas, `index.html` es idéntico byte a byte al de `main`. Con `anunciosActivos: true` (inyectado), el pie completo y el de la raíz terminan con el enlace `data-consentimiento=""` a la página de cookies del idioma, con el texto `pie.consentimiento`; con `false`, ningún archivo del mapa contiene `data-consentimiento` ni el texto de `pie.consentimiento` salvo el botón oculto del juego.

### validar (node --test, archivero)

397. Proyecto mínimo con `adsense.json` `null`, los cuatro archivos de contenido nuevos y sin `ads.txt`: código 0. Error si falta `adsense.json` o no es válido; si `editor` es `null` y existe `ads.txt`; si hay editor y `ads.txt` falta o difiere; si un crédito no lleva la metaetiqueta con editor o la lleva sin él; si falta `herramientas/contenido/{en,es}/aviso_legal.html`.
398. Error con el mensaje de 13.7.3 si existe `es/aviso-legal/` o `en/legal-notice/` y no es publicable (sustituye al test actual "el aviso legal no puede existir con false"); aviso (no error) si los dos `aviso_legal.html` ya no tienen huecos con `ANUNCIOS_ACTIVOS = false`; `ANUNCIOS_ACTIVOS = true` sigue siendo error, y con huecos añade el error de "quedan huecos".
399. Un `[NIF]` metido a mano en `es/privacidad/index.html` (o en `404.html`, o en un crédito) da "hueco sin rellenar"; el mismo texto en `herramientas/contenido/es/aviso_legal.html` no da error.
400. Cualquiera de `adsbygoogle`, `googlesyndication`, `googletagservices`, `doubleclick`, `fundingchoices` en un HTML publicado, en `ads.txt`, `robots.txt`, `sitemap.xml` o en `js/` da error; la CSP distinta de 2.4 sigue dando error.

### textos.js (node --test, cronista)

401. `pie.aviso_legal` y `pie.consentimiento` existen en `en` y `es` con los textos de 13.11, ≤ 40 caracteres; los árboles siguen iguales.

### Juego (node --test y Playwright, agente-de-campo)

402. `en/index.html` y `es/index.html` tienen un único `button#portada-consentimiento`, último hijo de `#portada-enlaces`, con `hidden` y `type="button"`, sin `data-accion`. `js/main.js` no contiene `portada-consentimiento` ni `data-consentimiento` (test junto al de 10.5.2 en `tests/direcciones.test.mjs`). Ninguna regla de `css/` selecciona `#portada-consentimiento` o `.pie-boton` con `display`.
403. Playwright, portada en 360 x 640, 390 x 844, 640 x 360, 1280 x 720 y 1920 x 1080, en los dos idiomas: el botón no es visible ni recibe el foco con Tab; la fila de enlaces y su posición son iguales (± 1 px) que en `main`; sin scroll de página.
404. **Superposición** (13.9): se cumplen las exigencias 1 a 4 en todas las combinaciones; se adjunta el informe de 5 y 6.
405. **Red**: con `adsense.json` con un editor de prueba, `npm run paginas -- --salida=capturas/adsense` (o la copia generada en `capturas/` con el mismo mapa) servido con `npx serve`: al abrir la raíz, `/en/`, `/es/`, una página de contenido, un día del archivo y jugar un caso completo, **todas** las peticiones (`page.on('request')`) son del propio origen; `document.querySelector('meta[name="google-adsense-account"]')` existe y no hay ningún `script` con `src` externo.

### Contenido y revisión

406. (Revisión del usuario) Privacidad y cookies en los dos idiomas con el texto de 13.6: nada afirma que hoy haya anuncios, cookies publicitarias o peticiones a Google; el enlace `https://policies.google.com/technologies/partner-sites` está en las dos páginas de cada idioma; las cuatro claves del almacén siguen listadas tal cual; no se lista ninguna cookie de Google. Aviso legal en inglés aprobado.
407. (Revisión de asuntos-internos) Ningún archivo del repositorio (incluidos `docs/`, `herramientas/` y el historial de esta rama) contiene un nombre, NIF o domicilio del usuario; los cuatro marcadores siguen en los dos `aviso_legal.html`; nada de 13.2.1 aparece en lo publicado; `ANUNCIOS_ACTIVOS = false`; ningún id, clase o `data-*` nuevo infringe 0.1.

### 13.2.1 Subcadenas de Google prohibidas en esta versión

`adsbygoogle`, `googlesyndication`, `googletagservices`, `doubleclick`, `fundingchoices` (sin distinguir mayúsculas). No incluye `google.com` (está en `ads.txt`), `policies.google.com` (enlace de privacidad) ni `google-adsense-account` (metaetiqueta).

## 13.13 Plan de tareas (9.20)

Una tarea = un commit en español, delegada de una en una y revisada antes de la siguiente. Todo en la rama `feature/adsense`.

| # | Tarea | Agente | Depende de | Commit |
|---|---|---|---|---|
| 150 | Usuario: aplicar en `CLAUDE.md` el texto de 13.16 (P11) y los cambios de `.claude/`; decidir DP-120 a DP-124. | usuario | — | — |
| 151 | `js/textos.js` (13.11) y su test (401); `herramientas/contenido/{en,es}/privacidad.html` y `cookies.html` (13.6); `herramientas/contenido/{en,es}/aviso_legal.html` (13.7.2) **con los huecos**. Enseñar al usuario los textos. | cronista | 150 | `docs: privacidad, cookies y aviso legal preparados para AdSense` |
| 152 | `docs/aviso-legal.md` reducido a puntero y lista de comprobación (13.7.1). | inspector-jefe | 151 | `docs: el aviso legal vive en herramientas/contenido` |
| 153 | `raiz.html` con `{{pie_raiz}}`; `juego.html` con `button#portada-consentimiento` oculto; `.pie-boton` en `css/componentes.css`. Comprobar en el navegador que la portada no cambia. | perito-visual | 151 | `estilo: enlace de consentimiento oculto y pie de la raíz generado` |
| 154 | `herramientas/adsense.json`; `paginas.mjs`, `creditos.mjs` y `validar.mjs` (13.3, 13.4.1, 13.5, 13.7.3, 13.7.4, 13.8, 13.10); tests 387–400; `npm run paginas`, `npm run creditos`, `npm test`, `npm run validar`; commit de lo generado (solo cambian `en/index.html`, `es/index.html` y las páginas de privacidad y cookies). | archivero | 152, 153 | `feat: preparación de AdSense en el generador (sin editor)` |
| 155 | Test 402 en `tests/direcciones.test.mjs`. Playwright (Chromium y WebKit, por `npx`): 403, 404 y 405, con el guion de 13.9 en `capturas/`. Informe al responsable de cada fallo. | agente-de-campo | 154 | `test: el juego no toca el enlace de consentimiento` (solo el test; Playwright no edita) |
| 156 | Revisión de 387–407 y de 13.2. | asuntos-internos | 155 | — (no edita) |
| 157 | Usuario: publicar en `main`. Cuando tenga el código de editor: ponerlo en `herramientas/adsense.json`, `npm run paginas`, `npm run creditos`, `npm run validar`, commit `datos: código de editor de AdSense`, publicar y comprobar `https://identifaiit.com/ads.txt` y la metaetiqueta (ver código fuente); en la consola de AdSense, conectar el sitio con "Metaetiqueta". **No** rellenar los huecos del aviso legal ni activar mensajes de consentimiento ni anuncios automáticos. | usuario | 156 | — |

Orden: 150 → 151 → 152 → 153 → 154 → 155 → 156 → 157. No hay cambio de datos ni de `js/`: se publica todo junto.

## 13.14 Riesgos nuevos

- **R48. Script sin consentimiento**: cargar `adsbygoogle.js` antes de la fase 3 (alternativas de DP-120) enviaría la IP a Google y permitiría acceder al dispositivo sin consentimiento en el EEE (RGPD, art. 22.2 LSSI, guía de cookies de la AEPD) y haría falsas privacidad y cookies. Mitigación: metaetiqueta; `validar` prohíbe las subcadenas de 13.2.1.
- **R49. Anuncios automáticos**: con el script cargado y *Auto ads* activado en la consola, Google pondría anuncios en la partida y en las revelaciones. Mitigación: sin script en esta spec; en la fase 3, *Auto ads* desactivado y unidades manuales solo en los huecos.
- **R50. Datos personales en el repositorio público**: `herramientas/contenido/` se publica (todo el repositorio se sirve en GitHub Pages) y queda en el historial de git. Si el usuario rellena los huecos antes de activar los anuncios y lo sube, sus datos serán públicos aunque la página no se genere. Mitigación: rellenar en el mismo commit que activa (DP-124); aviso de `validar` (13.7.3); revisión 407.
- **R51. Google no acepta la metaetiqueta o rechaza el sitio**: los métodos de verificación pueden cambiar, y la revisión puede considerar escaso el contenido de un juego que se pinta con JS. Mitigación: `ads.txt` como segundo método; páginas de contenido y archivo con texto indexable; DP-120 para el caso extremo. No puedo comprobar la consola del usuario.
- **R52. Mensaje de Google debajo de los diálogos modales**: `dialog#casos` y `dialog#ficha` abiertos con `showModal()` están en la capa superior y vuelven inerte el resto, incluido el mensaje de Google. Normalmente el mensaje sale al cargar, antes de abrirlos; en la fase 3 hay que comprobarlo con el mensaje real (13.9, exigencia 6).
- **R53. Nuestro CSS sobre el mensaje de Google**: las reglas generales de `css/base.css` (`button`, `a`, `p`, fuentes) pueden heredarse en el mensaje y cambiar su aspecto o contraste. No se puede comprobar sin el mensaje real; queda para la fase 3.
- **R54. Botón flotante de Google**: si la CMP muestra su botón flotante de revocación, a 360 x 640 puede tapar botones de voto o el pie (13.9, exigencia 5). Por eso se prefiere el enlace propio (DP-123).
- **R55. Configuración olvidada**: cambiar `adsense.json` sin `npm run paginas` y `npm run creditos` deja `ads.txt` y la metaetiqueta desfasados. Mitigación: `validar` (397) y la Action, que falla si el generador toca archivos fuera de `en/`, `es/` y `sitemap.xml`.
- **R56. Texto en futuro que envejece**: si los anuncios no llegan a activarse, privacidad y cookies seguirán diciendo "próximamente". Mitigación: revisar la fecha de actualización al cerrar la fase 2; si se abandona AdSense, quitar las secciones y el editor.

## 13.15 Lo que queda para la versión de activación (no se especifica aquí)

Spec nueva (sube versión) con cambios de `CLAUDE.md`: CSP ampliada con los orígenes de Google (lista exacta a fijar con la documentación vigente); script de AdSense solo en el juego (los huecos están en `/en/` y `/es/`), con *Auto ads* desactivado; mensaje de consentimiento de Google (EEE, Reino Unido y Suiza) y cómo se muestra en las páginas sin script (el enlace "Gestionar consentimiento" de las páginas de contenido necesita el código de Google o un módulo propio); `ANUNCIOS_ACTIVOS = true` y retirada del error de `validar`; unidades en `#anuncio-portada` y `#anuncio-resultado` con el rótulo "Publicidad" y nueva regla de composición sin scroll con el hueco ocupado; activar `button#portada-consentimiento`; aviso legal en el juego (DP-122); privacidad y cookies en presente, con base jurídica, transferencias internacionales y la lista real de cookies; repetir 13.9 con el mensaje real; revisión del aviso legal por un profesional.

## 13.16 Cambios fuera de docs/ (requisito P11)

**`CLAUDE.md`**, texto exacto para que lo apruebe el usuario:

1. "Anti-trampas", línea de anuncios. Sustituir:
   > - Anuncios: todavía no. Solo un hueco vacío en la portada (bajo las tarjetas) y en el resultado, que no ocupa espacio, con ANUNCIOS_ACTIVOS = false en js/main.js. Nunca anuncios durante la partida ni en las revelaciones. Activarlos exige una versión nueva de la spec y publicar el aviso legal (borrador en docs/aviso-legal.md, sin datos personales).

   por:
   > - Anuncios: todavía no se muestran. Solo un hueco vacío en la portada (bajo las tarjetas) y en el resultado, que no ocupa espacio, con ANUNCIOS_ACTIVOS = false en js/main.js. Nunca anuncios durante la partida ni en las revelaciones. Preparación de Google AdSense (spec 13): con el código de editor en herramientas/adsense.json (null hasta tenerlo) se publican la metaetiqueta google-adsense-account en el <head> de todas las páginas y ads.txt en la raíz; ningún script de Google ni petición a sus dominios hasta activar los anuncios. El consentimiento será solo el mensaje de Google (CMP de AdSense), sin banner propio. Activarlos exige una versión nueva de la spec y publicar el aviso legal, cuyo texto está en herramientas/contenido/{en,es}/aviso_legal.html: se genera solo con ANUNCIOS_ACTIVOS = true y sin huecos [..]; los datos personales se escriben solo en esos dos archivos y solo al activar, nunca en docs/.

2. "Estructura", línea de la raíz. Sustituir **"robots.txt y sitemap.xml, generados."** por **"robots.txt, sitemap.xml y, con código de editor de AdSense, ads.txt, generados."**
3. "Estructura", línea de `index.html`. Tras **"Páginas de contenido en en/ y es/ con direcciones limpias (spec 10)."** añadir **"El aviso legal (es/aviso-legal/, en/legal-notice/) solo se genera al activar los anuncios (spec 13)."**
4. "Estructura", línea de `herramientas/`. Tras **"contenido/ (textos de las páginas, en inglés y en español)."** añadir **"adsense.json (código de editor de AdSense o null) se versiona y se publica."**
5. "Forma de trabajar". Sustituir **"Tras cambiar una plantilla, js/textos.js, herramientas/contenido/ o los datos: npm run paginas (y npm run creditos si cambia el diseño de las páginas)."** por **"Tras cambiar una plantilla, js/textos.js, herramientas/contenido/ o los datos: npm run paginas (y npm run creditos si cambia el diseño de las páginas o herramientas/adsense.json)."**

Sin cambios en "Stack y restricciones": "sin dependencias en el navegador" sigue siendo cierto en esta spec; lo cambiará la versión de activación.

**`.claude/`** (usuario o agente principal, antes de delegar la tarea de cada agente):
- `agents/archivero.md`: `herramientas/adsense.json` como único lugar del código de editor; `ads.txt` y metaetiqueta solo con editor; estados del aviso legal (13.7.3); huecos prohibidos en lo publicado; subcadenas de 13.2.1 prohibidas; `npm run creditos` al cambiar el editor.
- `agents/cronista.md`: privacidad y cookies solo con lo cierto en cada fase (13.6); aviso legal en inglés con los marcadores en español; **nunca** rellenar los huecos ni escribir datos personales.
- `agents/perito-visual.md`: `#portada-consentimiento` siempre oculto, sin reglas de `display`; `{{pie_raiz}}`.
- `agents/agente-de-campo.md`: `main.js` no toca el botón de consentimiento; comprobación de 13.9 sin tocar producción (CSSOM, sin `bypassCSP`).
- `agents/asuntos-internos.md`: comprobaciones de 407 (datos personales, scripts de Google).
