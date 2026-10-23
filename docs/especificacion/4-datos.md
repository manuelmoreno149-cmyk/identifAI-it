# identifAI-it: especificación técnica, versión 1.3 · 4 a 7. Datos, algoritmo diario, almacenamiento y compartir

Parte de la especificación 1.3 (índice en `docs/ESPECIFICACION.md`) [D-91].

## 4. Datos

### 4.1 herramientas/banco.json (privado, solo en local) [D-21, D-57, D-65]

**Sin cambios en la versión 1.3.** El banco sigue en la versión 2 y **no** guarda prompts, fichas ni rutas de `.txt` [D-85]. Las fichas solo existen en claro en los `.txt` de `entrada/` (ignorada por git) y en la memoria del importador mientras se ejecuta.
- Está en `.gitignore`, nunca se sube y el juego no lo carga. Solo lo usan `importar.mjs`, `creditos.mjs` y `validar.mjs`.
- Contenido: `{"version": 2, "imagenes": [...]}`. Cada entrada tiene:
  - `id`: 10 caracteres `[a-z0-9]`, sin `ia`, `ai`, `real` ni `fake` como subcadena.
  - `tipo`: `autentica` o `generada`.
  - `dia`, `fecha` (`sumarDias(lanzamiento, dia - 1)`) y `tema` (igual que el del calendario).
  - `fuente` y `licencia`: valores de `FUENTES` [D-58].
  - `original`: ruta relativa a `entrada/temas/` con `/`.
  - `dhash`: 16 hexadecimales; se considera duplicado a distancia ≤ 5.
  - `recorte`: `atencion|izquierda|centro|derecha|arriba|abajo`.
  - `alta`.
- Se rechaza un banco de la versión 1.
- Si se pierde, el calendario sigue funcionando (incluidas las fichas, que van en el calendario); se pierden la fuente, la licencia, `original`, `dhash` y `recorte`.
- `herramientas/banco.anterior.json`: copia byte a byte del banco que deja `--reimportar --confirmar`.

### 4.2 data/calendario.json (público; lo carga el juego) · versión 3 [D-87]

```json
{
  "version": 3,
  "lanzamiento": "2026-11-01",
  "dias": [
    {
      "n": 1,
      "fecha": "2026-11-01",
      "tema": "Fuegos artificiales",
      "pruebas": ["k3x9q2m7ab", "p0w8e4r1tz", "m5n6b7v8c9", "z1x2c3v4b5", "q9w8e7r6t5"],
      "clave": "Mpb9Ycc=",
      "fichas": ["(684 caracteres base64)", "(684)", "(684)", "(684)", "(684)"]
    },
    {
      "n": 2,
      "fecha": "2026-11-02",
      "tema": "Perros",
      "pruebas": ["a1s2d3f4g5", "h6j7k8l9m0", "y5t4r3e2w1", "u7o8e9p0w1", "s2d3f4g5h6"],
      "clave": "Ax7Pq1E=",
      "fichas": ["(684)", "(684)", "(684)", "(684)", "(684)"]
    }
  ]
}
```

El ejemplo es ilustrativo: las fichas reales son cadenas de exactamente 684 caracteres `[A-Za-z0-9+/]` terminadas en un `=`. Los tests construyen sus calendarios de ejemplo con `ofuscar` y `ofuscarFicha`.

Reglas (`validarCalendario` comprueba la estructura y `validar.mjs` todo lo demás):
- `version` vale **3** y `lanzamiento` vale `"2026-11-01"` [D-20, D-50].
- `dias` ordenado por `n`, sin huecos, con `fecha === sumarDias(lanzamiento, n - 1)`.
- `tema`: como en la 1.2 (`temaDeCarpeta`, `temaValido`, sin palabras prohibidas por palabra completa) [D-53].
- `pruebas`: 5 ids distintos que existen en `casos/`. Ningún id se repite en el calendario [D-52]. El orden lo fija `importar.mjs` al azar [D-55].
- `clave`: 8 caracteres base64 (5 bytes, 4.3), entre 1 y 4 generadas [D-52, D-61].
- **`fichas`** [D-86, D-87]: 5 cadenas, una por prueba **en el mismo orden que `pruebas`**, cada una de 684 caracteres que codifican un bloque de 512 bytes (4.3.1). Todas tienen la misma longitud sea cual sea su contenido, así que ni su presencia ni su tamaño delatan qué pruebas son generadas.
- `importar.mjs` solo añade días posteriores a hoy; la única excepción es `--reimportar --confirmar`, mientras ningún día haya llegado [D-56, D-65].
- No hay ningún otro campo.
- El modo prueba lee este mismo archivo y solo usa `n`, `fecha` y `tema` [D-70].

### 4.3 Ofuscación de la respuesta [D-22]

Sin cambios. No es seguridad: solo evita la lectura a simple vista.

```
mascara(n, i) = (n * 37 + i * 101 + 13) mod 256
ofuscar(verdades, n, aleatorio):
  para i en 0..4:
    ruido_i = floor(aleatorio() * 128)
    byte_i  = ((ruido_i << 1) | verdades[i]) XOR mascara(n, i)
  clave = btoa(String.fromCharCode(byte_0, ..., byte_4))   // 8 caracteres
desofuscar(clave, n, i) = (atob(clave).charCodeAt(i) XOR mascara(n, i)) AND 1
```

Vector: `ofuscar([0, 1, 1, 0, 1], 1, () => 0) === 'Mpb9Ycc='`. La verdad solo se calcula en `transicion` al procesar `VOTO`, en main.js al abrir la ficha de una miniatura en `resultado`, y en `validar.mjs`. Nunca se escribe en el DOM antes de responder, ni en atributos, ni en `localStorage`.

### 4.3.1 Ofuscación y relleno de las fichas [D-86]

Igual que la clave, solo frena la inspección casual: el algoritmo es público (`js/diario.js`) y cualquiera puede descifrar las fichas, como ya ocurre con las respuestas (D-22). Lo que sí garantiza es que en `data/calendario.json` no aparece ningún prompt ni "Fotografía real" en claro, y que todas las fichas miden lo mismo.

**Flujo de bytes** (`flujoFicha(clave, n, indice)`):

```js
// FNV-1a de 32 bits sobre los códigos UTF-16 de la cadena (todos ASCII)
function fnv1a32(s) {
  let h = 0x811c9dc5
  for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 0x01000193) >>> 0 }
  return h
}
// mulberry32
function mulberry32(a) {
  return () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
flujoFicha(clave, n, indice):
  azar = mulberry32(fnv1a32(`${clave}|${n}|${indice}`))
  flujo[k] = Math.floor(azar() * 256)        para k = 0..511
```

Como `clave` lleva 35 bits de ruido aleatorio, dos días con el mismo `n` o las mismas verdades no comparten flujo.

**Cifrado** (`ofuscarFicha(texto, clave, n, indice, aleatorio)`):

```
bytes = new TextEncoder().encode(texto)                 // UTF-8, sin BOM
L = bytes.length;  si L > 510 → RangeError
bloque = Uint8Array(512)
bloque[0] = L >> 8;  bloque[1] = L & 0xFF               // longitud, big-endian
bloque[2 .. 2+L-1] = bytes
bloque[2+L .. 511] = floor(aleatorio() * 256)           // relleno aleatorio
cifrado[k] = bloque[k] XOR flujoFicha(clave, n, indice)[k]
ficha = btoa(String.fromCharCode(...cifrado))           // 684 caracteres, termina en un '='
```

**Descifrado** (`desofuscarFicha(ficha, clave, n, indice)`):
1. Si `ficha` no es una cadena que cumpla `/^[A-Za-z0-9+/]{683}=$/`, devuelve `null`.
2. Calcula `atob`, `bloque[k] = byte[k] XOR flujo[k]` y `L = bloque[0] << 8 | bloque[1]`. Si `L > 510`, devuelve `null`.
3. Devuelve `new TextDecoder('utf-8', {fatal: true}).decode(bloque.subarray(2, 2 + L))`. Si lanza, devuelve `null`. El relleno se descarta simplemente porque se lee solo `L` bytes.
- Nunca lanza.

**Límites**: bloque de 512 bytes, texto de 510 bytes UTF-8 como máximo (unos 500 caracteres en español; menos con emojis). El importador normaliza y recorta los prompts antes de cifrar (`normalizarFicha`, 4.6). Cada ficha ocupa 684 bytes en el calendario: unos 3,5 KB por día, 25 KB con 7 días y unos 1,25 MB con un año (DP-26).

**Texto de cada ficha** (lo decide el importador):
- Auténtica: `TEXTOS.fichas.autentica` ("Fotografía real").
- Generada con `.txt` no vacío: el prompt normalizado.
- Generada sin `.txt`, o con uno vacío: `TEXTOS.fichas.sin_prompt` [D-85].

**Vector de regresión**: el agente-de-campo calcula, al implementar, `flujoFicha('Mpb9Ycc=', 1, 0)` (los 8 primeros bytes) y `ofuscarFicha('Fotografía real', 'Mpb9Ycc=', 1, 0, () => 0)`, los fija en `tests/diario.test.mjs` y los copia en `docs/DECISIONES.md` como ajuste menor. A partir de ahí, cambiarlos exige una decisión nueva, porque invalidaría el calendario publicado.

### 4.4 Herramientas: flujo y ausencia de banco.json [D-21, D-34, D-56]

| Script | Lee | Escribe | Sin `banco.json` |
|---|---|---|---|
| `importar.mjs` (`npm run importar`, `-- --simular`, `-- --reimportar [--confirmar]`, `-- --banco-nuevo`) | `entrada/temas/*/{ia,real}/` (imágenes y [1.3] los `.txt` de `ia/`), `banco.json`, `lote.json`, `data/calendario.json`, `js/textos.js` | `casos/`, `banco.json`, `data/calendario.json` (versión 3), `creditos.html`; con `--reimportar --confirmar`, además `banco.anterior.json` y el borrado de las imágenes antiguas. Nunca mueve, borra ni modifica los originales, los `.txt` ni `lote.json`. **Nunca escribe un prompt** en disco, consola ni banco. | Igual que en 1.2: con `casos/` vacío y sin calendario crea un banco vacío; si no, se detiene (código 1) salvo `--banco-nuevo`; con `--reimportar` no es error. |
| `creditos.mjs` | `banco.json`, `js/textos.js` | `creditos.html` | Igual que en 1.2. |
| `validar.mjs` | `data/calendario.json`, `casos/`, lo publicado (también `js/main.js` como texto), `js/textos.js` y `banco.json` si existe | nada | Avisa y omite lo que depende del banco; código 0 si lo demás pasa; `--estricto` lo convierte en error. |

`package.json` (scripts `test`, `validar`, `importar`, `creditos`) y `.gitignore` (`entrada/`, `node_modules/`, `herramientas/banco.json`, `herramientas/banco.anterior.json`, `herramientas/lote.json`) no cambian. Los `.txt` están cubiertos por `entrada/`.

#### 4.4.1 Carpetas de entrada [D-52, D-85]

```
entrada/temas/
  01-fuegos-artificiales/
    ia/     Gemini_Generated_Image_abc.jpg
            Gemini_Generated_Image_abc.txt      ← prompt de esa imagen (UTF-8)
            …
    real/   ray-hennessy-…-unsplash.jpg
```

- Carpeta de día: `^(\d{2,})-([\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*)$` (bandera `u`, NFC); `NN` = número de caso. Dentro, exactamente `ia/` y `real/`.
- En `ia/` y `real/`: imágenes `.jpg`, `.jpeg`, `.png` o `.webp` (sin distinguir mayúsculas). Se ignoran los archivos que empiezan por `.`, `Thumbs.db` y `desktop.ini`.
- [1.3] **Fichas**: en `ia/`, cada imagen puede tener al lado un `.txt` (extensión sin distinguir mayúsculas) con **el mismo nombre base**, comparado exactamente tras NFC (`Gemini_x.jpg` ↔ `Gemini_x.txt`).
  - Imagen generada sin `.txt` → **aviso**, no error: "01-fuegos-artificiales/ia/Gemini_x.jpg no tiene ficha (Gemini_x.txt); su confesión será la de «sin confesión»."
  - `.txt` en `ia/` sin imagen con ese nombre base → aviso, y se ignora.
  - `.txt` en `real/` → aviso, y se ignora (las auténticas siempre llevan "Fotografía real").
  - Dos imágenes con el mismo nombre base en `ia/` (`x.jpg` y `x.png`) → error: el `.txt` sería ambiguo.
  - Cualquier otro archivo sigue siendo un error.
- Cada día, exactamente 5 imágenes, con entre 1 y 4 en `ia/`. Los `.txt` no cuentan.
- Revisión manual de marcas de agua de Gemini antes de importar [D-66, D-74].

#### 4.4.2 Flujo de importar.mjs [D-56, D-65, D-85, D-87]

Fase A: comprobaciones. No se escribe nada hasta que todas pasan; si falla alguna, se muestran todos los errores juntos y se termina con código 1.

1. Argumentos con `analizarArgumentos` (sin cambios).
2. Banco: reglas de "sin banco"; si existe y no es la versión 2, se detiene.
3. Calendario [1.3]:
   - Si no existe, se parte de `{version: 3, lanzamiento: "2026-11-01", dias: []}`.
   - Sin `--reimportar`, si `version === 2` y `lanzamiento === "2026-11-01"`, se detiene: "data/calendario.json es de la versión 2 (sin fichas). Regenera todos los días con npm run importar -- --reimportar --confirmar (solo antes del lanzamiento)."
   - Sin `--reimportar`, cualquier otro calendario que no sea definitivo (`version !== 3`, otro lanzamiento o `validarCalendario` falla) da el mensaje de D-63: "data/calendario.json no es un calendario definitivo (¿datos de prueba de D-46?). Bórralo junto con las imágenes de casos/ antes de importar."
   - Con `--reimportar`, el calendario anterior se valida con `calendarioAnteriorValido` (4.6), que acepta las versiones 2 y 3 (4.4.4).
4. Leer `entrada/temas/` (sin carpetas: "No hay temas por importar en entrada/temas." y código 0).
5. `planificar` (4.6): numeración, omitidos, 5 imágenes, de 1 a 4 en `ia/`, fechas posteriores a hoy, tema y fuentes, y [1.3] emparejamiento de las fichas `.txt` con sus avisos (4.4.1).
   - 5 bis. `lote.json` con `analizarLote` (sin cambios).
   - 5 ter. [1.3] **Lectura de fichas**, solo de los días nuevos:
     - Antes de nada, se comprueba que `TEXTOS.fichas.autentica` y `TEXTOS.fichas.sin_prompt` existen, no están vacías, son distintas y caben en `FICHA_MAX_BYTES`; si no, es un error.
     - Cada `.txt` emparejado se lee como bytes y se decodifica con `TextDecoder('utf-8', {fatal: true})`. Si no es UTF-8 válido, es un error: "01-fuegos-artificiales/ia/Gemini_x.txt no es UTF-8 válido; guárdalo como UTF-8."
     - Se aplica `normalizarFicha(texto, FICHA_MAX_BYTES)`. Si queda vacío, aviso "…Gemini_x.txt está vacío; se usará la ficha «sin confesión»."; si se recorta, aviso "…Gemini_x.txt ocupa 734 bytes; se recorta a 510 (máximo de una ficha)."
     - Si un prompt coincide exactamente con `fichas.autentica` o `fichas.sin_prompt`, es un error (rompería la comprobación de coherencia de `validar`).
     - Los textos quedan solo en memoria.
6. Imágenes con `sharp`: decodificación, dHash (duplicados a distancia ≤ 5) y aviso de ampliación [D-59].
7. `--simular`: plan por día (número, fecha, tema, imágenes de `ia/` y `real/`, fuentes, recortes manuales y [1.3] "fichas: 3 con prompt, 0 sin prompt, 1 recortada"), avisos y omitidas; código 0 sin escribir. **No muestra el texto de ningún prompt.** Recuerda revisar las marcas de Gemini [D-66].

Fase B: escritura.

8. Para cada día nuevo, en orden de `n`:
   - `barajar` con aleatorio criptográfico; ids con `nuevoId`; `clave = ofuscar(verdades, n)`.
   - [1.3] Para cada prueba `i` del orden barajado: `fichas[i] = ofuscarFicha(textoDeFicha, clave, n, i, aleatorioCripto)`, con `aleatorioCripto = () => crypto.randomInt(2 ** 32) / 2 ** 32` y `textoDeFicha` según 4.3.1.
9. Normalizar y escribir las imágenes en un orden aleatorio global (`rotate`, `resize(1080, 1350, {fit: 'cover', position})`, WebP `quality: 80`, `effort: 6`, sin metadatos, con comprobación posterior) [D-59, D-65].
10. Añadir al banco (versión 2, sin fichas) las entradas nuevas con `alta` y `recorte`.
11. Añadir los días nuevos (con `fichas`) al final de `dias` del calendario versión 3; `validarCalendario` antes de escribir; `JSON.stringify(obj, null, 2) + '\n'`, UTF-8 y LF.
12. Regenerar `creditos.html` (su contenido no cambia por las fichas).
13. Informe final: días añadidos y omitidos, recortes, avisos de mezcla y peso, [1.3] "Fichas: 16 con prompt, 0 sin prompt, 1 recortada.", recordatorio de que los originales y los `.txt` siguen en `entrada/temas/` y de la copia privada del banco.

Si la fase B falla a medias, no se escriben ni el banco ni el calendario; las imágenes ya escritas quedan huérfanas (`validar` avisa).

#### 4.4.3 Comprobaciones de validar.mjs

**Sin banco** (las de la 1.2, con los cambios [1.3]):
- Imágenes del calendario: WebP de 1080 x 1350 sin metadatos.
- [1.3] `version` es **3**, `lanzamiento` es `"2026-11-01"`, `validarCalendario` pasa, `n` y `fecha` cuadran, las claves dan entre 1 y 4 generadas. Con un calendario de la versión 2, el error es: "data/calendario.json es de la versión 2 (sin fichas): reimporta con npm run importar -- --reimportar --confirmar."
- [1.3] **Fichas**: cada una se descifra con `desofuscarFicha` (si da `null`, error "La ficha {i+1} del día {n} no se puede descifrar."). **Coherencia con la clave**:
  - auténtica (`desofuscar` = 0) cuya ficha no es exactamente `TEXTOS.fichas.autentica` → error;
  - generada cuya ficha es `TEXTOS.fichas.autentica` → error;
  - para no revelar qué pruebas son generadas, el mensaje solo nombra el día: "El día {n} tiene fichas que no cuadran con su clave."
- Temas sin palabras prohibidas; ids sin repetir; nada publicado con palabras prohibidas (ids, clases, nombres y valores `data-*` y `alt` de `index.html` y `creditos.html`, nombres y rutas).
- `banco.json`, `banco.anterior.json` y `lote.json` no rastreados y en `.gitignore`; `entrada/` en `.gitignore` y sin archivos rastreados (cubre los `.txt`). [1.3] Ningún archivo `.txt` rastreado fuera de `fonts/`.
- Sin URL externas; fuentes y licencias de `TIPOGRAFIAS`; `.nojekyll` y `creditos.html`; no existe `docs/muestras.html` [D-73]; todo `href`/`src` relativo existe; `creditos.html` cumple 2.7.
- Interruptor `PRUEBAS_ABIERTAS` (`analizarPruebasAbiertas`), sin cambios [D-71, DP-22].
- **Avisos** (no fallan), todos los de la 1.2 y uno nuevo:
  - menos de 7 días de calendario [D-62];
  - mezcla [D-61, D-67];
  - peso [D-60];
  - archivos de `casos/` fuera del calendario;
  - `PRUEBAS_ABIERTAS = true` antes del lanzamiento sin `--estricto`;
  - [1.3] generadas con la ficha `sin_prompt`, solo con días y recuento: "AVISO: 2 pruebas generadas no tienen prompt (días 3 y 5)."

**Con banco**: sin cambios (ids, `dia`, `fecha` y `tema` coherentes; 5 por día; tipos coherentes con la clave; `FUENTES`; dHash; `creditos.html` idéntico; `recorte` válido; avisos de imágenes fuera del banco y de entradas sin `recorte`).

`npm test` no lee `banco.json`, `lote.json`, `entrada/` ni `js/main.js`, y no depende de la fecha actual.

#### 4.4.4 Reimportación: `--reimportar` [D-65, D-87]

Igual que en la 1.2: sin `--confirmar` muestra el plan (`mensajeReimportacion`) y no escribe; con `--confirmar` regenera ids, orden, claves, `casos/`, banco y calendario, copia el banco anterior en `banco.anterior.json` y borra solo las imágenes antiguas del calendario y del banco anteriores. Es la confirmación explícita del usuario para borrar imágenes de `casos/`: el agente debe pedirle permiso antes (DP-18). Solo antes de que llegue el primer día.

Cambios de la 1.3:
- El calendario anterior puede ser de la **versión 2 o 3**: se valida con `calendarioAnteriorValido` (4.6) en lugar de `validarCalendario`. Sin calendario o sin días: "No hay nada que reimportar; usa npm run importar."
- Se leen y cifran las fichas de **todos** los días (paso 5 ter), y el calendario nuevo es de la **versión 3**.
- Es la **única forma de pasar el calendario actual (versión 2, 7 días) a la versión 3**, y solo se puede hacer **antes del 2026-11-01** (riesgo en 9.4).

Los enlaces `?prueba=1&dia={n}` siguen funcionando tras reimportar [D-70].

#### 4.4.5 herramientas/lote.json [D-65]

Sin cambios: objeto plano `{"NN-tema/ia|real/archivo": "izquierda|centro|derecha|arriba|abajo"}`, solo local, validado por `analizarLote` con los mensajes de la 1.2. Las claves solo pueden ser imágenes (una clave que apunte a un `.txt` no corresponde a ninguna imagen y es un error).

### 4.5 creditos.html y herramientas/creditos.mjs [D-39, D-40, D-58]

Sin cambios: `TIPOGRAFIAS`, `escaparHtml`, `parejasCreditos`, `generarCreditosHtml` y `escribirCreditos`, con la tabla `FUENTES` de Gemini, ChatGPT, Unsplash y Pexels. Los fotógrafos no se acreditan por su nombre (DP-15). Las fichas y los prompts no aparecen en los créditos.

### 4.6 herramientas/temas.mjs (archivero): funciones puras [D-56]

Siguen sin cambios: `PALABRAS_PROHIBIDAS`, `contienePalabraProhibida`, `analizarCarpeta`, `temaDeCarpeta`, `FUENTES`, `fuenteDeArchivo`, `POSICIONES_RECORTE`, `analizarLote`, `analizarArgumentos`, `comprobarReimportacion`, `mensajeReimportacion`, `analizarPruebasAbiertas`, `barajar`, `nuevoId`, `distanciaHamming`, `UMBRAL_PESO`, `compararPesos` y `avisosMezcla` (firmas y mensajes de la 1.2). Cambios y novedades [1.3]:

| Exportación | Tipo | Parámetros → retorno | Descripción |
|---|---|---|---|
| `planificar({carpetas, ultimoDia, hoyISO, lanzamiento})` | pura | → `{nuevos, omitidos, errores, avisos}` | La entrada no cambia: en `carpetas[].ia` y `carpetas[].real` llegan **todos** los nombres de archivo (ocultos ya filtrados), también los `.txt`. [1.3] Separa los `.txt` y aplica las reglas de fichas de 4.4.1 (avisos y error de nombre base ambiguo). Cada imagen de `nuevos[].imagenes` añade `ficha`: la ruta relativa del `.txt` emparejado (por ejemplo, `'01-fuegos-artificiales/ia/Gemini_x.txt'`) o `null` (siempre `null` en las auténticas). Nunca lanza. |
| `normalizarFicha(texto, maxBytes)` | pura | `string, number` → `{texto, vacia, truncada, bytesOriginales}` | [D-85] (1) Quita un BOM inicial. (2) `\r\n` y `\r` → `\n`. (3) NFC. (4) Cambia por un espacio cada carácter de control salvo `\n` (también `\t`). (5) Recorta los espacios de los extremos y reduce 3 o más `\n` seguidos a 2. (6) `bytesOriginales` = bytes UTF-8 del resultado, medidos con `new TextEncoder()`. (7) Si es `''`: `vacia: true`. (8) Si supera `maxBytes`: corta por puntos de código (nunca a medias) hasta que el texto más `…` (3 bytes) quepa en `maxBytes`, quita los espacios finales, añade `…` y marca `truncada: true`. No importa nada; `maxBytes` llega como parámetro (`importar.mjs` pasa `FICHA_MAX_BYTES` de `js/diario.js`). Nunca muta ni lanza. |
| `calendarioAnteriorValido(obj)` | pura | → `boolean` | [D-87] Para `--reimportar`. `true` si `obj.version` es 2 o 3, `obj.lanzamiento === '2026-11-01'` y `obj.dias` es un array en el que cada día tiene `n` entero ≥ 1, `fecha` con formato ISO y `pruebas` con 5 cadenas. No mira `tema`, `clave` ni `fichas`. Rechaza la versión 1, otro lanzamiento, `null` y los objetos sin `dias`. |

---

## 5. Algoritmo diario

Sin cambios respecto a la 1.2:
1. `hoy` = la fecha efectiva (`fechaLocal(new Date())`; en previsualización, `?fecha=`; en modo prueba, el día elegido) [D-68, D-70].
2. `n = numeroCaso(hoy, lanzamiento)`.
3. `caso = casoDelDia(calendario, hoy)`, que ahora incluye `fichas`.
4. Si es `null`, se ve `sin-casos` [D-24]: no se usa ninguna semilla sobre el banco (es privado, cada día tiene un tema elegido y reciclar días daría respuestas conocidas). `validar` avisa si quedan menos de 7 días.
5. El contenido de cada día lo decide el usuario: carpeta `NN`, reparto de 1 a 4 generadas y orden fijado al importar.
6. Todos los jugadores con la misma fecha local ven el mismo caso.
7. Un solo intento por fecha, en cualquiera de los tres modos [D-32, D-81].
8. Cambiar la hora del dispositivo permite adelantar días [D-18]. El modo prueba abre una vía mientras `PRUEBAS_ABIERTAS` sea `true` [D-70, D-71].
9. [1.3] Como el tiempo ya solo limita la **observación** y no la respuesta, y ocultar la pestaña no penaliza, el jugador puede consultar fuera del juego antes de votar. Es consecuencia directa de lo pedido (DP-24).

---

## 6. Almacenamiento [D-82]

Una sola clave versionada: **`identifaiit.v2`**.

```json
{
  "version": 2,
  "ajustes": { "modo": "perro" },
  "partidas": {
    "2026-11-01": { "n": 1, "modo": "normal", "estado": "terminada", "resultados": "AAFFA", "aciertos": 3, "sesion": "x8f2k1q9" },
    "2026-11-02": { "n": 2, "modo": "perro",  "estado": "en_curso",  "resultados": "AF---", "aciertos": 1, "sesion": "b7d0s3m2" }
  },
  "racha": 2,
  "mejorRacha": 5
}
```

- `ajustes` solo tiene `modo` (`investigador|normal|perro`; por defecto `normal`). Desaparece `vistoComoJugar` [D-83].
- `partidas` va por fecha ISO, sea cual sea el modo. `resultados` solo contiene `A`, `F` y `-`. Nunca se guardan la verdad, el voto, la ficha, `tapada` ni el tema.
- `racha` y `mejorRacha` se recalculan en `registrarFin`; la portada usa `calcularRacha`.
- Clave de disponibilidad: `identifaiit.prueba`.
- **Sin migración** [D-82, DP-28]: el juego aún no se ha lanzado, así que los datos de `identifaiit.v1` (de las pruebas) no se leen, no se migran y no se borran. Un jugador que ya hubiera probado empieza con datos limpios (sin racha ni partidas) y puede jugar cualquier día real. Versiones futuras: clave nueva (`identifaiit.v3`) con migración explícita si ya hay jugadores.
- La versión 3 del calendario no obliga a cambiar la del almacén.
- Si localStorage no está disponible, nada lanza: respaldo en sessionStorage o en memoria, con `#aviso-almacen` [D-11, D-51].
- No se usan cookies ni IndexedDB.
- **Previsualización y modo prueba** [D-68, D-70]: dos almacenes de `crearAlmacenMemoria()`; no se toca ninguna clave `identifaiit.*` del navegador.

---

## 7. Compartir [D-30, D-80]

Plantilla exacta de `TEXTOS.compartir.plantilla`, como literal de JS:

```js
plantilla: 'identifAI-it · Caso nº {caso}\nModo: {modo}\n{aciertos}/5 {cuadros}\nRacha: {racha}\n{url}'
```

- 5 líneas separadas por `\n` (LF), sin espacios ni saltos de línea al final. `·` es U+00B7 y `º` es U+00BA.
- Marcadores:
  - `{caso}`: `n`, sin ceros a la izquierda.
  - `{modo}`: `TEXTOS.portada.modo_*` del modo jugado ("Investigador", "Normal" o "Perro de presa").
  - `{aciertos}`: de 0 a 5.
  - `{cuadros}`: `cuadros(resultados)`, 5 emojis sin espacios, solo `🟩` y `🟥`.
  - `{racha}`: la racha tras la partida.
  - `{url}`: `urlDelJuego()`.
- No incluye el tema [D-54] ni ninguna ficha, y no revela qué pruebas eran IA: solo acierto o fallo por posición.
- En previsualización y en modo prueba funciona igual (URL sin parámetros).

Ejemplo literal completo: caso 12, modo `perro`, resultados `AAFAF`, racha 3, en `https://usuario.github.io/identifAI-it/`:

```
identifAI-it · Caso nº 12
Modo: Perro de presa
3/5 🟩🟩🟥🟩🟥
Racha: 3
https://usuario.github.io/identifAI-it/
```

`compartir(texto, nav)`, sin cambios:
1. `nav.share({text})` → `'compartido'`; `AbortError` → `'cancelado'`; otro error → paso 2.
2. `nav.clipboard.writeText` → `'copiado'` (aviso durante 2 s).
3. Si no → `'manual'` (`#compartir-manual` con el texto seleccionado).
