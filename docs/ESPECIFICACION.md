# identifAI-it: especificación técnica

**Versión 1.3, del 2026-10-23** [D-76]. Parte de la versión 1.2 (2026-10-21, con los ajustes D-65 a D-75) e incorpora los cambios de comportamiento que pidió el usuario tras probar el juego:
- **Sin deslizar**: todas las pantallas caben en la ventana (100dvh) desde 360 x 640 y 640 x 360 [D-84].
- **Cómo jugar** pasa a ser un desplegable de la portada; desaparece la pantalla `como-jugar` [D-83].
- **Tiempo agotado ya no es fallo**: la imagen se tapa con un sobre de pruebas sellado y se responde sin límite [D-77, D-90].
- **Pestaña oculta ya no penaliza**: el temporizador sigue con el reloj [D-78]. Desaparecen los códigos `T` y `O` [D-79].
- **Modos nuevos**: `investigador` (sin límite), `normal` (3 s) y `perro` (Perro de presa, 1 s) [D-81]. Almacén `identifaiit.v2` [D-82].
- **Fichas**: cada prueba tiene una ficha (el prompt en las generadas, "Fotografía real" en las auténticas), ofuscada y rellenada en `data/calendario.json` versión 3, que se muestra solo después de responder [D-85 a D-88].
- **Resultado compacto** con miniaturas que abren la ficha en un `<dialog>` [D-89].
- Nuevo texto de compartir con el modo [D-80].

Por su tamaño, la especificación se reparte en varios archivos de `docs/`, que forman un único documento [D-91]:

| Archivo | Secciones |
|---|---|
| `docs/ESPECIFICACION.md` (este) | 0. Glosario y estructura · 1. Pantallas y estados · 2. Contrato HTML/CSS |
| `docs/especificacion/3-modulos.md` | 3. Módulos JS |
| `docs/especificacion/4-datos.md` | 4. Datos y herramientas · 5. Algoritmo diario · 6. Almacenamiento · 7. Compartir |
| `docs/especificacion/8-criterios.md` | 8. Criterios de aceptación |
| `docs/especificacion/9-tareas.md` | 9. Plan de tareas y cambios pendientes fuera de `docs/` |

Este documento es la fuente de verdad técnica del proyecto. Si algo no está aquí, no se inventa: se pregunta o se registra en `docs/DECISIONES.md`. Las reglas de `CLAUDE.md` (juego, stack, anti-trampas) prevalecen sobre este documento. **Atención**: la versión 1.3 cambia reglas de juego que hoy figuran en `CLAUDE.md` (tiempo agotado, pestaña oculta y modos). Hasta que el usuario actualice `CLAUDE.md` (lista en `docs/especificacion/9-tareas.md`, 9.5) y confirme los cambios, ningún agente debe implementar las tareas 45 a 59 (DP-33).

Las marcas **[D-nn]** remiten a `docs/DECISIONES.md`. La versión solo sube cuando cambia el comportamiento del juego; los ajustes pequeños se apuntan en DECISIONES.md sin cambiar el número [D-44].

## 0. Glosario, convenciones y estructura

| Término | Significado |
|---|---|
| Caso del día | Las 5 pruebas de una fecha. Tiene un número `n` (Caso nº n) y un tema. |
| Tema | Asunto común de las 5 pruebas de un día, elegido por el usuario (por ejemplo, "Perros"). Sale del nombre de la carpeta del día en `entrada/temas/` y se publica en `data/calendario.json` como texto final. No revela la verdad de ninguna prueba [D-52, D-53]. |
| Prueba | Una imagen del caso, con índice `i` de 0 a 4 (en pantalla, de 1 a 5). |
| Verdad | Respuesta correcta: `0` = auténtica (foto real), `1` = generada (IA). En el juego solo existe en memoria y ofuscada en `data/calendario.json`. |
| Voto | Lo que elige el jugador: `"autentica"` (botón REAL, tecla R) o `"generada"` (botón IA, tecla I). |
| Código de resultado | Un carácter por prueba: `A` acierto, `F` fallo, `-` pendiente. No existen `T` ni `O` [D-79]. |
| Sellado (prueba tapada) | Al agotarse el tiempo de observación (modos `normal` y `perro`), la imagen se oculta tras un sobre de pruebas sellado y el jugador sigue pudiendo votar sin límite [D-77, D-90]. |
| Ficha | Texto asociado a cada prueba: el prompt en las generadas, "Fotografía real" en las auténticas, o el texto de "sin confesión" si falta el prompt. Va ofuscado y rellenado en el calendario y solo se descifra al responder o al revisar [D-85, D-86]. En pantalla se titula "Confesión del sospechoso". |
| Fecha ISO | Cadena `AAAA-MM-DD` con la fecha **local** del jugador. |
| Modo | `investigador` (sin límite, `null`), `normal` (3000 ms), `perro` (Perro de presa, 1000 ms) [D-81]. |
| Previsualización | Modo de desarrollo, solo en `localhost`, `127.0.0.1` o `[::1]`: `?fecha=AAAA-MM-DD` fija la fecha efectiva y no se guarda nada [D-68]. |
| Modo prueba | Variante temporal de la previsualización para amigos: en cualquier host, con `?prueba=1` y `PRUEBAS_ABIERTAS = true` en `js/main.js`, la portada muestra un selector de día y no se guarda nada [D-70]. Se apaga antes del 2026-11-01 [D-71]. |
| Fecha efectiva | La de la previsualización si la hay; si no, la del día elegido en modo prueba; si no, `fechaLocal(new Date())`. |

### 0.1 Convenciones obligatorias

- **Palabras prohibidas.** `real`, `ia`, `ai` y `fake` no pueden aparecer en ids, clases, atributos `data-*` (nombres ni valores), nombres de archivo, rutas ni `alt` de nada publicado, ni en el `tema` de ningún día [D-53].
  - Se comprueban **por palabra completa** y sin distinguir mayúsculas: el nombre se trocea por cualquier carácter que no sea letra ni número (Unicode) y por los cambios de minúscula a mayúscula. Función común: `contienePalabraProhibida` de `herramientas/temas.mjs`.
  - Única excepción literal: `identifAI-it` [D-23].
  - El texto visible (botones "REAL"/"IA", `creditos.html`, el contenido de las fichas como "Fotografía real") no es un nombre ni una ruta: la regla no se le aplica. Las fichas, además, nunca aparecen en claro en lo publicado: van ofuscadas en el calendario [D-85].
- Los ids aleatorios de imagen (10 caracteres) se comprueban además **por subcadena** (`ia`, `ai`, `real`, `fake`).
- La verdad y el voto se nombran siempre `autentica`/`generada` (o `0`/`1`) en código y marcado.
- Rutas siempre relativas y sin `/` inicial.
- **Ninguna petición a dominios externos** [D-29].
- Los textos visibles salen de `js/textos.js`. En `index.html`, `main.js` los inserta al arrancar (salvo `<title>` y `<noscript>`). El tema y las fichas son datos de `data/calendario.json`; las fichas de las auténticas y las de "sin confesión" se generan al importar a partir de `TEXTOS.fichas` [D-85]. En `creditos.html` los inserta `herramientas/creditos.mjs`.

### 0.2 Estructura de carpetas

| Ruta | Se publica | Contenido |
|---|---|---|
| `index.html` | sí | Todas las pantallas del juego y el diálogo de ficha. |
| `creditos.html` | sí | Página estática de créditos, sin JS, generada por `herramientas/creditos.mjs` [D-39]. |
| `.nojekyll` | sí | Archivo vacío [D-39]. |
| `css/variables.css`, `css/base.css`, `css/componentes.css` | sí | Los `@font-face` van en `base.css`. |
| `fonts/` | sí | `oswald-600.woff2`, `special-elite-400.woff2`, `OFL-oswald.txt`, `LICENSE-special-elite.txt` [D-29, D-40]. |
| `js/` | sí | `main.js`, `juego.js`, `temporizador.js`, `diario.js`, `almacen.js`, `compartir.js`, `textos.js`. |
| `img/ui/` | sí | `sello.svg`, `huella.svg`, `lupa.svg`, `papel.svg`, `icono-acierto.svg`, `icono-fallo.svg` y **`sobre.svg`** (sobre de pruebas sellado) [D-90]. `icono-tiempo.svg` se elimina: ya no hay veredicto de tiempo. |
| `casos/` | sí | `{id}.webp`, 1080 x 1350, sin metadatos. Solo las generadas por `importar.mjs`. |
| `data/calendario.json` | sí | Casos de cada día, con tema y fichas ofuscadas: **versión 3** [D-87]. |
| `herramientas/*.mjs` | sí (repositorio) | `temas.mjs`, `importar.mjs`, `creditos.mjs`, `validar.mjs`. |
| `herramientas/banco.json` | **no** | Banco privado (versión 2, sin cambios en 1.3: **no** guarda prompts ni fichas) [D-21, D-57, D-85]. |
| `herramientas/banco.anterior.json`, `herramientas/lote.json` | **no** | Copia previa del banco y recortes manuales [D-65]. |
| `entrada/temas/NN-nombre-del-tema/ia/`, `…/real/` | **no** (`entrada/` en `.gitignore`) | Originales elegidos por el usuario. En `ia/`, junto a cada imagen, un `.txt` con el mismo nombre base y su prompt en UTF-8 [D-85]. El importador nunca mueve ni borra nada. |
| `tests/` | sí (repositorio) | `*.test.mjs`. No dependen de `banco.json`, `lote.json` ni `entrada/`. |
| `package.json` | sí | `"type": "module"`, scripts `test`, `validar`, `importar`, `creditos`; `sharp` como `devDependency`. |
| `docs/` | sí | `ESPECIFICACION.md`, `especificacion/*.md` y `DECISIONES.md` [D-91]. |

---

## 1. Pantallas y estados

### 1.1 Pantallas

| Pantalla (`data-pantalla`) | Contenido |
|---|---|
| `iniciando` | Transitorio mientras se cargan el almacén y el calendario. Sin interfaz propia. |
| `portada` | Título, lema, Caso nº n, tema del día [D-54], selector de día (solo en modo prueba) [D-70], selector de modo (3 fichas), racha, botón Empezar, desplegable **Cómo jugar** (cerrado por defecto) [D-83] y pie con Créditos. |
| `cargando` | Aviso de precarga de las 5 imágenes. |
| `cuenta-atras` | 3, 2, 1. |
| `caso` | Tema, Prueba i/5, marcador, imagen (o sobre sellado), temporizador (salvo en `investigador`) y botones REAL e IA. Fases: `pregunta` (con `tapada` falso o verdadero) y `veredicto` (sello, texto y confesión). |
| `resultado` | Aciertos x/5, mensaje final, 5 miniaturas que abren su ficha, racha y mejor racha, y Compartir [D-89]. |
| `ya-jugado` | Resultado de hoy (aciertos, cuadros y modo), racha, Compartir y cuenta atrás hasta medianoche. Sin miniaturas ni fichas [D-19]. |
| `sin-casos` | No hay caso para hoy [D-24]. |
| `error` | No se pudo cargar el calendario o alguna imagen. Botón Reintentar. |

- La pantalla `como-jugar` **ya no existe** [D-83].
- El veredicto es una fase de `caso`, no una pantalla [D-05].
- El diálogo `#ficha` no es una pantalla: es una ventana modal que se abre sobre `caso/veredicto` o `resultado` y no cambia el estado [D-88, D-89].
- `creditos.html` es otra página, sin JS.

### 1.2 Estado del juego

Un único objeto de estado, gestionado por la función pura `transicion(estado, evento)` de `js/juego.js`:

```js
{
  pantalla: 'portada',          // una de las de 1.1
  fase: null,                   // 'pregunta' | 'veredicto' | null (solo en 'caso')
  modo: 'normal',               // 'investigador' | 'normal' | 'perro'
  fecha: '2026-11-03',          // fecha ISO de la partida (se fija en FIN_CUENTA)
  n: 3,
  tema: 'Gente comiendo',       // o null [D-53]
  pruebas: ['k3x9q2m7ab', ...], // 5 ids
  clave: 'Mpb9Ycc=',            // verdades ofuscadas (4.3)
  fichas: ['…684 car.…', ...],  // 5 fichas ofuscadas (4.3.1) o null [D-87]
  indice: 0,
  resultados: '-----',          // 5 códigos: 'A' | 'F' | '-'
  activo: false,                // true desde PINTADA hasta el voto: se aceptan votos
  tapada: false,                // true en fase 'pregunta' cuando el tiempo de observación se ha agotado [D-77]
  revelada: null,               // verdad de la prueba actual (0|1), solo en 'veredicto'
  ficha: null,                  // texto descifrado de la ficha actual (string) o null, solo en 'veredicto' [D-88]
  error: null                   // 'calendario' | 'imagenes' | null
}
```

- Desaparecen `volverA` y `vistoComoJugar` [D-83].
- `activo` ya no significa "el temporizador corre": significa "se aceptan votos". El temporizador es cosa de main.js; en `investigador` no existe [D-81].
- `estadoInicial` pone `tema: null`, `fichas: null`, `tapada: false`, `ficha: null`. `CARGADO` copia `n`, `tema`, `pruebas`, `clave` y `fichas` del caso.
- La previsualización [D-68] y el modo prueba [D-70] no añaden campos ni eventos.

### 1.3 Eventos y transiciones

| Estado actual | Evento | Condición | Estado siguiente / efecto |
|---|---|---|---|
| `iniciando` | `CARGADO` `{caso, partidaHoy}` | hay partida de hoy `terminada` | `ya-jugado` |
| `iniciando` | `CARGADO` | la partida de hoy estaba `en_curso` | main.js la cierra antes como abandonada (pendientes → `F`), así que llega `terminada` → `ya-jugado` [D-26, D-79] |
| `iniciando` | `CARGADO` | `caso === null` | `sin-casos` |
| `iniciando` | `CARGADO` | en otro caso | `portada` (con `n`, `tema`, `pruebas`, `clave`, `fichas`) |
| `iniciando` | `ERROR_CALENDARIO` | | `error` (`'calendario'`) |
| `portada` | `ELEGIR_MODO` `{modo}` | `modo` es clave propia de `MODOS` | `portada` con el nuevo modo (main.js lo guarda en los ajustes). Con un modo desconocido, sin cambios. |
| `portada` | `EMPEZAR` | | `cargando` (siempre; main.js cierra el desplegable Cómo jugar) [D-83] |
| `cargando` | `PRECARGA_OK` | | `cuenta-atras` |
| `cargando` | `PRECARGA_ERROR` | | `error` (`'imagenes'`). El intento **no** se consume. |
| `error` | `REINTENTAR` | `error === 'imagenes'` | `cargando` |
| `error` | `REINTENTAR` | `error === 'calendario'` | `iniciando` |
| `cuenta-atras` | `FIN_CUENTA` `{fecha}` | | `caso`, `fase: 'pregunta'`, `indice: 0`, `activo: false`, `tapada: false`, se fija `fecha`. **Se consume el intento**: main.js guarda la partida `en_curso` antes de pintar la imagen [D-26] |
| `caso/pregunta` | `PINTADA` | `activo === false` | `activo: true`. main.js arranca el temporizador salvo en `investigador` |
| `caso/pregunta` | `VOTO` `{voto}` | `activo === true` (tapada o no) | `fase: 'veredicto'`, código `A` o `F` según el voto, `revelada` = verdad, `ficha = desofuscarFicha(fichas[indice], clave, n, indice)`, `activo: false`, `tapada: false` |
| `caso/pregunta` | `VOTO` | `activo === false` | se ignora (mismo objeto) |
| `caso/pregunta` | `AGOTADO` | `activo === true`, `tapada === false` y `MODOS[modo] !== null` | `tapada: true`. La fase sigue en `pregunta`, `activo` sigue en `true` y `resultados` no cambia [D-77] |
| `caso/pregunta` | `AGOTADO` | cualquier otra situación (ya tapada, sin pintar, modo `investigador`) | sin cambios |
| `caso/veredicto` | `SIGUIENTE` | `indice < 4` | `caso/pregunta`, `indice + 1`, `revelada: null`, `ficha: null`, `activo: false`, `tapada: false` |
| `caso/veredicto` | `SIGUIENTE` | `indice === 4` | `resultado`, `fase: null`, `revelada: null`, `ficha: null` (main.js guarda la partida `terminada`, la racha y la mejor racha) |
| `portada`, `cuenta-atras`, `caso` | `OTRA_PESTANA` | otra pestaña ha empezado o terminado la partida de esa fecha [D-51] | `ya-jugado` (si sigue `en_curso` en la otra, solo `avisos.otra_pestana`) |
| `resultado`, `ya-jugado` | `COMPARTIR` | | sin cambio de estado (efecto en main.js) |
| `ya-jugado`, `sin-casos`, `portada` | `MEDIANOCHE` | la fecha efectiva ha cambiado | `iniciando` |
| cualquiera | evento no listado (incluidos los antiguos `VER_COMO_JUGAR`, `ENTENDIDO` y `OCULTA`) | | sin cambios (mismo objeto) |

Reglas adicionales:
- **Un único intento al día para los tres modos** [D-32, D-81]. La partida se guarda por fecha. En `ya-jugado` no hay selector de modo.
- **Tiempo agotado** [D-77]: en `normal` y `perro`, al agotarse el tiempo la imagen se oculta tras el sobre sellado y se anuncia por `aria-live`; los botones y las teclas R/I siguen activos y no hay ningún límite para responder. No cuenta como fallo: el resultado depende solo del voto. En `investigador` no hay temporizador y la imagen nunca se tapa.
- **Pestaña oculta** [D-78]: no tiene efecto en el estado en ninguna pantalla ni modo. Si se oculta con la imagen visible, el tiempo de observación sigue corriendo (reloj `performance.now()`); al volver, si ya se agotó, la prueba aparece sellada y se puede responder. Si se oculta antes de `PINTADA`, el temporizador arranca cuando la imagen se pinta de verdad al volver (los frames están parados mientras la pestaña está oculta). **Cuenta atrás**: al volver a visible, main.js la reinicia desde 3, sin evento de `transicion` (se mantiene esa parte de D-07, DP-29).
- **Partida abandonada** (recarga o cierre a medias): las pruebas pendientes cuentan como `F` [D-79, DP-25].
- **Medianoche durante la partida**: la partida pertenece a la `fecha` de `FIN_CUENTA`. `MEDIANOCHE` solo se procesa en `portada`, `ya-jugado` y `sin-casos`.
- **Veredicto**: avance manual con Siguiente o Enter [D-27]. Solo la primera cuenta atrás es de 3 s.
- **Ficha**: solo existe en el estado (`ficha`) en fase `veredicto`; en `resultado`, main.js descifra la de cada miniatura solo al abrirla (3.7). Nunca se guarda en el almacén [D-88].
- `resultado` solo se ve una vez; al recargar, `ya-jugado`.
- **Tema**: no cambia tras `CARGADO`, no se guarda ni se comparte [D-54].
- **Créditos**: navega a `creditos.html` en la misma pestaña; al volver se arranca desde `iniciando` [D-39].
- **Previsualización local** [D-68] y **modo prueba** [D-70, D-71]: la tabla no cambia. Fecha efectiva fija, almacén en memoria, sin `MEDIANOCHE` por cambio de día ni `OTRA_PESTANA`, recargar permite rejugar. En modo prueba, el botón del selector navega a `?prueba=1&dia={n}` (recarga). Sin `?prueba=1`, o con `PRUEBAS_ABIERTAS = false`, el juego es el normal.

### 1.4 Diagrama

```
iniciando ──► portada ──EMPEZAR──► cargando ──PRECARGA_OK──► cuenta-atras
   │  │       (Cómo jugar: desplegable, sin estado)   │ PRECARGA_ERROR
   │  └──► sin-casos / ya-jugado / error ◄────────────┘ (Reintentar)
   │
cuenta-atras ──FIN_CUENTA──► caso[i]/pregunta ──AGOTADO──► caso[i]/pregunta (tapada)
                                  │  ▲                              │
                                  │  │ VOTO                    VOTO │
                                  ▼  │                              ▼
                             caso[i]/veredicto ◄────────────────────┘
                                  │ SIGUIENTE: i < 4 → caso[i+1]/pregunta
                                  ▼ i = 4
                              resultado ──(recarga)──► ya-jugado
                              (miniatura → dialog#ficha, sin cambio de estado)

portada ──enlace Créditos──► creditos.html ──Volver──► index.html (iniciando)
portada (modo prueba) ──Abrir este día──► ?prueba=1&dia=n (recarga) ──► iniciando
```

---

## 2. Contrato HTML/CSS

El Perito Visual crea el marcado y los estilos; el Agente de Campo solo usa los ganchos de esta sección. Ningún otro id, clase o atributo se considera estable. Este contrato permite que los dos trabajen en paralelo: main.js se escribe contra él aunque el HTML aún no esté hecho, y el HTML se maqueta contra él aunque main.js aún no lo use (9.4).

### 2.1 Mecanismo de pantallas

- `<main id="app" data-pantalla="portada" data-modo="normal">`: main.js mantiene `data-pantalla` y `data-modo` (`investigador|normal|perro`) al día; CSS los usa (por ejemplo, para ocultar el temporizador en `investigador`).
- Cada pantalla es una `<section class="pantalla" id="pantalla-{nombre}" hidden>`. Solo una sin `hidden` a la vez; main.js es el único que cambia `hidden` de las secciones.
- Al cambiar de pantalla, main.js mueve el foco al elemento con `data-foco` o, si no hay, al primer `h1`/`h2` (con `tabindex="-1"`). Todo `data-foco` no enfocable de forma nativa lleva `tabindex="-1"` [D-41].
- `iniciando` no tiene sección.

### 2.2 Atributos genéricos

| Atributo | Dónde | Uso |
|---|---|---|
| `data-texto="grupo.clave"` | elementos con texto fijo | main.js pone `textContent = TEXTOS.grupo.clave`. Contenido inicial `[[grupo.clave]]`. Va siempre en un elemento que solo contiene ese texto (en botones, en un `span.boton-texto`). |
| `data-accion="..."` | `<button>` | Delegación. Valores: `empezar`, `siguiente`, `compartir`, `reintentar`, `leer-confesion`, `ver-ficha`, `cerrar-ficha` y, solo en modo prueba, `abrir-prueba`. Desaparecen `como-jugar` y `entendido` [D-83]. |
| `data-voto="autentica"` / `"generada"` | botones de respuesta | Fijos, no dependen de la imagen. |
| `data-foco` | uno por pantalla como máximo | Recibe el foco al entrar. |
| `data-estado="acierto\|fallo"` | `#veredicto` y cada `button.miniatura` de `#resultado-revision` | Resultado del jugador. Ausente mientras no hay respuesta. Desaparecen `tiempo` y `oculta` [D-79]. |
| `data-fase="pregunta\|veredicto"` | `#pantalla-caso` | Fase actual. |
| `data-tapada="si\|no"` | `#pantalla-caso` | `si` cuando `estado.tapada`; CSS oculta el temporizador. Siempre `no` en veredicto [D-90]. |
| `data-nivel="normal\|critico"` | `#temporizador` | `critico` con el 30 % del tiempo o menos. |
| `--restante` (propiedad CSS) | `#temporizador` | De 1 a 0, con `style.setProperty`. Vuelve a 1 en cada prueba. |
| `data-prueba="1".."5"` | cada `button.miniatura` | Número de prueba (posición), nunca la verdad [D-89]. |
| `data-visible="si\|no"` | `#compartir-aviso` | Aviso de copiado. |
| `data-pagina="juego\|creditos"` | `<body>` | Distingue las dos páginas. |

Clase utilitaria: `.solo-lectores`. Los estados van en atributos `data-*`, nunca en clases [D-03]. Clases estructurales del contrato con main.js: `.pantalla`, `.prueba-img`, `.boton-texto` y `.miniatura` (desaparece `.revision-era`) [D-89].

El tema solo se inserta como `textContent` en `#portada-tema`, `#caso-tema` y las `option` de `#selector-prueba-dia`. Las fichas solo como `textContent` en `#veredicto-confesion-texto` y `#ficha-texto`. Ni el tema ni las fichas van nunca en ids, clases, atributos, `alt` ni rutas.

### 2.3 Elementos por pantalla

**Portada** (`#pantalla-portada`):
- `h1 data-texto="portada.titulo"` y `p data-texto="portada.lema"`.
- `#portada-caso` ("Caso nº n") y, justo después, `<p id="portada-tema">` (una línea, puntos suspensivos, `--fuente-datos`) [D-54].
- `#selector-prueba` (solo en modo prueba, lo crea main.js justo después de `#portada-tema`; no está en `index.html`), con el marcado exacto de D-70:
  ```html
  <div id="selector-prueba">
    <label for="selector-prueba-dia">{prueba.etiqueta}</label>
    <select id="selector-prueba-dia"><option value="1">Día 1: Fuegos artificiales</option>…</select>
    <button type="button" class="boton" data-accion="abrir-prueba">{prueba.boton}</button>
  </div>
  ```
  Las `option` solo llevan `value` = `String(n)` (y `selected` en la del día jugado). Estilo discreto, 44 x 44 px, una o dos líneas a 360 px, y debe caber sin scroll (2.6).
- `<fieldset id="portada-modos">` con `<legend data-texto="portada.elige_modo">` y tres `<input type="radio" name="modo" value="investigador|normal|perro">`, en ese orden, cada uno con su `label` (nombre `portada.modo_*` y descripción `portada.desc_*`), presentados como 3 fichas en una sola fila [D-81].
- `#portada-racha` ("Racha: n", `hidden` si es 0).
- `button[data-accion="empezar"]` con `data-foco`.
- Desplegable Cómo jugar [D-83], **después** de Empezar y antes del pie:
  ```html
  <details id="como-jugar">
    <summary id="como-jugar-resumen"><span data-texto="como_jugar.titulo">[[como_jugar.titulo]]</span></summary>
    <div id="como-jugar-panel" tabindex="0" role="region" aria-labelledby="como-jugar-resumen">
      <ol id="como-jugar-pasos"></ol>
    </div>
  </details>
  ```
  - Sin el atributo `open` en el HTML: cerrado por defecto. El `data-texto` va en un `span` para no borrar el marcador del `summary`.
  - main.js crea 4 `li` en `#como-jugar-pasos` con `TEXTOS.como_jugar.pasos` al arrancar.
  - Accesibilidad nativa: `summary` enfocable, se abre y cierra con Enter y Espacio, y el lector anuncia expandido/contraído. **No** se añade `aria-expanded` ni JS de apertura.
  - `#como-jugar-panel` lleva `tabindex="0"` para poder desplazarlo con el teclado si tuviera scroll interno de reserva (2.6, R8). Solo es alcanzable con Tab cuando el desplegable está abierto.
  - Al despachar `EMPEZAR`, main.js pone `open = false`, así que al volver a la portada (por ejemplo, tras `MEDIANOCHE`) aparece cerrado.
- Pie: `<footer id="portada-pie"><a id="portada-creditos" href="creditos.html" data-texto="portada.enlace_creditos">…</a></footer>` [D-37, D-39]: misma pestaña, sin `target` ni `rel`, 14 px como mínimo, AA, subrayado, 44 x 44 px.

**Cargando** (`#pantalla-cargando`): `<p role="status" tabindex="-1" data-foco data-texto="cargando.texto">`.

**Cuenta atrás** (`#pantalla-cuenta-atras`): `<p tabindex="-1" data-foco data-texto="cuenta_atras.aviso">` y `#cuenta-atras-numero` (`aria-live="assertive"`).

**Caso** (`#pantalla-caso`, con `data-fase` y `data-tapada`):
- `<header id="caso-cabecera">` con, en orden, `#caso-tema`, `<p id="caso-etiqueta" tabindex="-1" data-foco>` ("Prueba 2/5") y `#caso-marcador` ("Aciertos: 1") [D-31, D-54].
- `<div id="caso-escena">`: envuelve, en este orden, `#prueba-marco`, `#prueba-sobre` y `#veredicto`, superpuestos en la misma celda [D-41, D-90]. main.js no lo toca.
- `<figure id="prueba-marco">`: vacío en el HTML. main.js inserta **una** `<img class="prueba-img" alt="Prueba 2 de 5" width="1080" height="1350">` ya decodificada y la sustituye en cada prueba. Al sellar, main.js le pone `hidden`; al pasar a veredicto se lo quita (la imagen se vuelve a ver bajo el sello) [D-90].
- Sobre sellado [D-90]:
  ```html
  <div id="prueba-sobre" hidden aria-hidden="true">
    <p id="prueba-sobre-texto" data-texto="partida.sobre_texto">[[partida.sobre_texto]]</p>
  </div>
  ```
  - main.js le quita `hidden` cuando `estado.tapada` y se lo pone en cualquier otro caso.
  - CSS le pone `img/ui/sobre.svg` como `background-image` y le da exactamente la caja de `#prueba-marco` (proporción 4:5). El SVG no lleva texto: el rótulo visible es `#prueba-sobre-texto`.
  - Con `aria-hidden="true"`: para lectores de pantalla, el sellado se anuncia en `#temporizador-anuncio`.
  - Animación de aparición de 200 ms como máximo, ninguna con `prefers-reduced-motion: reduce`.
- `<div id="veredicto" role="status" aria-live="polite" hidden>`, con `hidden` en fase pregunta. Contiene, en orden:
  - `<p id="veredicto-sello">`: vacío hasta responder; después `partida.sello_autentica` ("REAL") o `sello_generada` ("IA").
  - `<div id="veredicto-pie">` con `<span id="veredicto-icono" aria-hidden="true">` (icono por CSS según `data-estado`: `icono-acierto.svg` o `icono-fallo.svg`) y `<p id="veredicto-texto">` (variante al azar de `TEXTOS.veredictos.acierto|fallo`).
  - Confesión [D-88]:
    ```html
    <div id="veredicto-confesion">
      <p id="veredicto-confesion-titulo" data-texto="confesion.titulo">[[confesion.titulo]]</p>
      <p id="veredicto-confesion-texto"></p>
      <button type="button" class="boton" data-accion="leer-confesion" aria-haspopup="dialog" hidden>
        <span class="boton-texto" data-texto="confesion.leer_entera">[[confesion.leer_entera]]</span>
      </button>
    </div>
    ```
    `#veredicto-confesion-texto` está vacío en fase pregunta; en veredicto recibe `recortarFicha(estado.ficha).texto` (90 caracteres como máximo) o `confesion.no_disponible` si `estado.ficha` es `null`. El botón `leer-confesion` solo pierde `hidden` si `recortada` es `true`.
- `<div id="temporizador" data-nivel="normal" aria-hidden="true">` con `<div id="temporizador-cinta">`. CSS lo oculta con `#app[data-modo="investigador"]` y con `#pantalla-caso[data-tapada="si"]`.
- `#temporizador-anuncio` (`.solo-lectores`, `aria-live="polite"`) [D-17, D-81]:
  - `normal`: "Quedan N s" (`partida.quedan`) cada vez que cambia el segundo entero y, al sellar, `partida.sobre_anuncio`.
  - `perro`: nada durante la observación; al sellar, `partida.sobre_anuncio`.
  - `investigador`: nada.
  - Se vacía al empezar cada prueba.
- `#caso-botones` con los dos botones de voto (forma exacta de D-41, con `span.boton-texto` y `<kbd aria-hidden="true">R</kbd>`/`I` y `aria-keyshortcuts`) y `button[data-accion="siguiente"]` (`partida.boton_siguiente` o `boton_ver_resultado` en la prueba 5). Los votos solo se ven en fase pregunta, **también con la prueba tapada**; Siguiente solo en veredicto y recibe el foco al entrar.

**Resultado** (`#pantalla-resultado`) [D-89]:
- `<p id="resultado-aciertos" tabindex="-1" data-foco>` ("4/5") y `#resultado-mensaje`.
- `<ol id="resultado-revision">`: vacío en el HTML. Al entrar en `resultado`, main.js crea 5 `li`, en orden, con este marcado exacto (textos con `textContent`):
  ```html
  <li>
    <button type="button" class="miniatura" data-accion="ver-ficha" data-prueba="3" data-estado="acierto" aria-haspopup="dialog">
      <img src="casos/{id}.webp" alt="" width="1080" height="1350">
      <span class="solo-lectores">Prueba 3: acierto</span>
    </button>
  </li>
  ```
  - `data-estado` = `estadoDeCodigo(resultados[i])`; `data-prueba` = `i + 1`.
  - El `span.solo-lectores` (`rellenar(final.estado_prueba, {i: N, estado: final.estados[estado]})`) da el nombre accesible del botón. La `img` lleva `alt=""` porque es decorativa dentro del botón (nunca la verdad).
  - El icono de acierto o fallo lo pone CSS con `.miniatura::after` según `data-estado`.
  - La verdad y la ficha **no** están en el marcado de la miniatura: se calculan al abrir el diálogo.
- `<p id="resultado-rachas">` con `<span id="resultado-racha">` y `<span id="resultado-mejor-racha">` en una sola línea.
- `button[data-accion="compartir"]`.
- Desaparece `#resultado-cuadros`: las miniaturas lo sustituyen (DP-30).

**Ya jugado** (`#pantalla-ya-jugado`): sin cambios. `h2 data-texto="ya_jugado.titulo"` (`tabindex="-1"`), `p#ya-jugado-texto`, `#ya-jugado-aciertos`, `#ya-jugado-modo`, `#ya-jugado-cuadros` (`role="img"`, `aria-label` con `final.cuadros_etiqueta`), `#ya-jugado-racha`, `#ya-jugado-cuenta-atras` y `button[data-accion="compartir"]`.

**Sin casos**: `<p tabindex="-1" data-foco data-texto="sin_casos.texto">`. **Error**: `<p id="error-texto" role="alert" tabindex="-1" data-foco>` y `button[data-accion="reintentar"]`.

**Elementos comunes**, dentro de `#app` y fuera de las secciones:
- `#compartir-aviso` (`aria-live="polite"`, `data-visible="no"`).
- `<textarea id="compartir-manual" rows="5" readonly hidden>` seguido, como hermano inmediato, de `<label for="compartir-manual" class="solo-lectores" data-texto="compartir.manual">`. main.js solo cambia `hidden` y `value`.
- `<p id="aviso-almacen" role="status" hidden data-texto="avisos.sin_guardar">`.
- `<p id="aviso-previsualizacion" role="status" hidden></p>` justo después de `#aviso-almacen`, sin `data-texto` [D-68, D-70].
- Diálogo de ficha [D-88, D-89], vacío en el HTML:
  ```html
  <dialog id="ficha" aria-labelledby="ficha-titulo">
    <h2 id="ficha-titulo"></h2>
    <img id="ficha-img" alt="" width="1080" height="1350" hidden>
    <p id="ficha-era"></p>
    <h3 id="ficha-confesion-titulo" data-texto="confesion.titulo">[[confesion.titulo]]</h3>
    <p id="ficha-texto"></p>
    <button type="button" id="ficha-cerrar" class="boton" data-accion="cerrar-ficha">
      <span class="boton-texto" data-texto="ficha.cerrar">[[ficha.cerrar]]</span>
    </button>
  </dialog>
  ```
  - La `img` no lleva `src` en el HTML.
  - Uso desde el veredicto (`leer-confesion`) y desde el resultado (`ver-ficha`), en 3.7.
  - Se abre siempre con `showModal()`. El foco va a `#ficha-cerrar`. Escape cierra (evento `cancel` nativo). Al cerrarse (evento `close`), main.js vacía `#ficha-titulo`, `#ficha-era` y `#ficha-texto`, quita `src` y pone `hidden` a `#ficha-img`, y devuelve el foco al botón que lo abrió. No se cierra al pulsar fuera.
  - `#ficha-texto` con `white-space: pre-line` (respeta los saltos de línea del prompt).

Fuera de JS: `<noscript>` con un aviso breve.

### 2.4 Cabecera de index.html

Sin cambios respecto a 1.2: `meta charset`, `viewport` (`width=device-width, initial-scale=1, viewport-fit=cover`, sin `user-scalable=no`), la CSP `default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'` [D-36], `<title>identifAI-it</title>`, los tres CSS y `<script type="module" src="js/main.js">`. `<html lang="es">` y `<body data-pagina="juego">`. Ni `<style>`, ni atributo `style`, ni `data:` en CSS. `<dialog>` no necesita nada de la CSP.

### 2.5 Tipografías [D-29, D-40]

Sin cambios. `@font-face` de Oswald 600 (`../fonts/oswald-600.woff2`) y Special Elite 400 (`../fonts/special-elite-400.woff2`) al principio de `css/base.css`, con `font-display: swap`. Tokens: `--fuente-titulos: "Oswald", "Arial Narrow", "Roboto Condensed", sans-serif;`, `--fuente-datos: "Special Elite", "Courier New", Courier, monospace;`, `--fuente-cuerpo: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;`. Cuerpo a 16 px como mínimo (enlace de créditos y avisos, 14 px). Subconjunto latino, menos de 60 KB por archivo. Licencias: Oswald, SIL OFL 1.1 (`fonts/OFL-oswald.txt`); Special Elite, Apache License 2.0 (`fonts/LICENSE-special-elite.txt`), según `TIPOGRAFIAS` de `creditos.mjs`. Cambiar de familia exige mantener el patrón de archivos, comprobar la licencia y registrarlo en DECISIONES.

### 2.6 Composición sin deslizar [D-84]

Objetivo: en los **tamaños garantizados** (360 x 640, 640 x 360, 1280 x 720, y también 390 x 844 y 768 x 1024), ninguna pantalla ni estado tiene scroll vertical ni horizontal, y todos los controles se ven enteros sin desplazar. Reglas:

- **R1. Alto de la ventana.** `html, body { margin: 0; height: 100%; }` sin `overflow: hidden` en `html` ni `body`. `#app { box-sizing: border-box; height: 100vh; height: 100dvh; display: flex; flex-direction: column; }`, con relleno que incluye `env(safe-area-inset-*)`.
- **R2. Avisos en el flujo.**
  - `#aviso-previsualizacion` y `#aviso-almacen` van arriba (`order: -1`, `flex: none`) y ocupan sitio, así que nunca tapan nada. Como mucho 2 líneas a 360 px, sin cortar el texto, en `--fuente-datos` a 14 px.
  - `#compartir-aviso` es un aviso flotante (`position: fixed`, abajo) que no ocupa sitio.
  - `#compartir-manual`, cuando se muestra, se superpone (`position: fixed`, arriba, ancho completo, 5 filas como máximo) y no cuenta para el cálculo de scroll.
- **R3. Pantalla visible.** `.pantalla:not([hidden]) { flex: 1 1 auto; min-height: 0; overflow: auto; }`. El `overflow: auto` es solo una **reserva** (R13): en los tamaños garantizados nunca debe activarse.
- **R4. Tamaños flexibles.** Tipografía y espacios con `clamp()` y unidades `vw`/`dvh` (por ejemplo, `gap: clamp(4px, 1.5dvh, 16px)`). Mínimos: cuerpo 16 px (avisos y créditos 14 px), controles de 44 x 44 px.
- **R5. Imagen 4:5 que se adapta al alto.**
  - `#caso-escena { container-type: size; display: grid; place-items: center; min-height: 0; }`, y sus tres hijos en la misma celda (`grid-area: 1 / 1`).
  - `#prueba-marco`, `#prueba-sobre` y `#veredicto` con `width: min(100cqw, 80cqh); aspect-ratio: 4 / 5;`.
  - `.prueba-img { width: 100%; height: 100%; object-fit: contain; }`.
  - Así la imagen ocupa el máximo alto disponible sin deformarse ni desbordar.
- **R6. Caso en vertical** (`orientation: portrait`). Rejilla de filas `auto minmax(0, 1fr) auto auto`: cabecera, escena, temporizador (de 6 a 8 px de alto) y botones. Los dos votos van en una fila, en la mitad inferior. Siguiente ocupa la fila de los botones en veredicto. El tema de 30 caracteres va en una línea con puntos suspensivos.
- **R7. Caso en horizontal** (`orientation: landscape`, también en escritorio). Dos columnas: `minmax(0, 1fr)` para la escena (todas las filas) y `clamp(12rem, 35vw, 22rem)` para cabecera, temporizador y botones apilados (votos uno debajo del otro).
- **R8. Portada.**
  - En vertical: columna con cabecera (título, lema, caso, tema), selector de prueba, modos (`grid-template-columns: repeat(3, 1fr)`; nombre en una línea, descripción en 2 como máximo), racha, Empezar, desplegable y pie.
  - En horizontal: dos columnas. A la izquierda, identidad: título, lema, caso, tema, racha, desplegable y pie. A la derecha, acción: selector de prueba, modos y Empezar.
  - El desplegable abierto se queda **en el flujo** (no se superpone): `#como-jugar { min-height: 0; }` y `#como-jugar-panel { overflow-y: auto; min-height: 0; }` es el único elemento que puede encogerse, así que abrirlo nunca empuja Empezar fuera de la ventana ni provoca scroll de la página.
  - A 360 x 640 sin modo prueba, el panel abierto cabe entero (pasos de 80 caracteres como máximo). En 640 x 360, o con el selector de prueba, puede tener scroll interno de reserva [D-83, DP-31].
- **R9. Resultado.**
  - En vertical: aciertos (grande), mensaje, `#resultado-revision` en una fila de 5 (`grid-template-columns: repeat(5, 1fr)`, separación de 4 px como mínimo), rachas en una línea y Compartir.
  - En horizontal: a la izquierda, aciertos, mensaje, rachas y Compartir; a la derecha, las 5 miniaturas en una fila.
  - Cada `button.miniatura` muestra la imagen en 4:5 con un ancho **visible** de 44 px como mínimo (y, por tanto, 55 px de alto). El objetivo táctil es la propia miniatura: no se amplía el área con relleno invisible ni hay áreas solapadas [D-89].
- **R10. Ya jugado, cargando, cuenta atrás, sin casos y error**: columna centrada.
- **R11. Diálogo `#ficha`**:
  - `max-width: min(36rem, calc(100vw - 2rem)); max-height: calc(100dvh - 2rem); overflow-y: auto;`. Solo el diálogo puede desplazarse; la página no.
  - `#ficha-img`: `max-height: 40dvh` en vertical y `55dvh` en horizontal, con `width: auto` y `aspect-ratio: 4 / 5`.
  - `::backdrop` oscuro.
- **R12.** Acierto y fallo se distinguen por icono y texto, no solo por color. Con `prefers-reduced-motion: reduce`, sin animación del sello, del sobre ni sacudidas; la cinta del temporizador sigue reduciéndose.
- **R13. Reserva de accesibilidad.** Por debajo de los tamaños garantizados (por ejemplo, 320 x 568 o 640 x 300) o con el texto ampliado (zoom del 200 %, WCAG 1.4.4 y 1.4.10), la sección visible se desplaza por dentro (R3) en lugar de recortar contenido: nunca se oculta nada sin forma de alcanzarlo (DP-32).

### 2.7 creditos.html [D-39]

Sin cambios respecto a la versión 1.2: página estática sin JS que genera `generarCreditosHtml` (4.5) con la estructura exacta de siempre:
- `<!doctype html>`, `lang="es"`, viewport, la CSP de `index.html`, `<title>{creditos.titulo_pagina}</title>` y los tres CSS.
- `body data-pagina="creditos"`, `main#creditos` con `h1`, intro, la sección `creditos-tipografias` (un `li` por elemento de `TIPOGRAFIAS`: `{familia} · {licencia} (<a href="{archivo}">{creditos.ver_licencia}</a>)`) y la sección `creditos-imagenes` con `ul#creditos-lista` (`{fuente} · {licencia}`) o, sin imágenes, `<p>{creditos.sin_imagenes}</p>` sin `imagenes_intro`.
- `footer#creditos-pie` con `a#creditos-volver href="index.html"`.
- Ids exactos: `creditos`, `creditos-tipografias`, `creditos-imagenes`, `creditos-lista`, `creditos-pie`, `creditos-volver`. Sin `<script>`, sin `style` y sin recursos externos.
- UTF-8, LF y un único salto de línea final. Estilo bajo `body[data-pagina="creditos"]`.
- Las fichas **no** aparecen en los créditos.
