# identifAI-it: especificación técnica, versión 2.0 · 4 a 7. Datos (Images y lanzamiento), algoritmo diario, almacenamiento y compartir

Parte de la especificación 2.0 (índice en `docs/ESPECIFICACION.md`) [D-91, D-114]. Los datos y herramientas de Headlines están en `4b-titulares.md` (4.7 a 4.14). Los cambios de la 2.0 van marcados con **[2.0]**; los ajustes D-116 (titulares por mes) y D-117 (el modo prueba carga todos los meses) ya están incorporados.

## 4. Datos

### 4.1 herramientas/banco.json (privado, solo en local) · [2.0] versión 3 [D-21, D-57, D-96]

- En `.gitignore`, nunca se sube, el juego no lo carga. Solo para imágenes; **no hay banco de noticias** [D-108].
- Contenido: `{"version": 3, "imagenes": [...]}`. Cada entrada: `id`, `tipo` (`autentica|generada`), `dia`, `tema`, `fuente`, `licencia`, `original`, `dhash`, `recorte` y `alta`, como en la 1.3. [2.0] **Sin `fecha`**: la fecha de un día se deriva de `lanzamiento` y `dia` (`fechaDelDia`), así que cambiar el lanzamiento no deja fechas desfasadas.
- `importar`, `creditos` y `validar` rechazan los bancos de las versiones 1 y 2; el de la versión 2 se convierte con `npm run lanzamiento` (4.2.1), que solo quita `fecha` de cada entrada.
- Sin cambios: no guarda prompts ni fichas; si se pierde, el juego sigue funcionando; `banco.anterior.json` es la copia de `--reimportar --confirmar`.

### 4.2 data/calendario.json (público) · [2.0] versión 4 [D-87, D-96]

```json
{
  "version": 4,
  "lanzamiento": null,
  "dias": [
    {
      "n": 1,
      "tema": "Fireworks",
      "pruebas": ["k3x9q2m7ab", "p0w8e4r1tz", "m5n6b7v8c9", "z1x2c3v4b5", "q9w8e7r6t5"],
      "clave": "Mpb9Ycc=",
      "fichas": ["(684 caracteres base64)", "(684)", "(684)", "(684)", "(684)"]
    }
  ]
}
```

Reglas (`validarCalendario` comprueba la estructura y `validar.mjs` lo demás):
- `version` vale **4**. [2.0] `lanzamiento` es `null` (sin fecha decidida) o una fecha ISO válida; ya no tiene un valor fijo [D-95].
- `dias` ordenado por `n`, sin huecos. [2.0] Los días **no** tienen `fecha`: la fecha del día `n` es `fechaDelDia(lanzamiento, n)` (`null` sin lanzamiento).
- `tema`, `pruebas`, `clave` y `fichas`: como en la 1.3 (5 ids distintos que existen en `casos/`, sin repetir en el calendario; clave de 5 bytes con entre 1 y 4 generadas; 5 fichas de 684 caracteres en el orden de `pruebas`).
- Ningún otro campo. Las ofuscaciones no dependen de la fecha (solo de `clave`, `n` e `indice`), así que mover el lanzamiento no obliga a recifrar nada.
- `data/calendario.json` es el **único** sitio donde vive la fecha de lanzamiento, común a los dos retos; los archivos `data/titulares/AAAA-MM.json` no la repiten, aunque su nombre dependa de ella (4.7) [D-95, D-116].
- El calendario de Images sigue siendo **un solo archivo** (unos 3,5 KB por día); partirlo por meses queda fuera de D-116 (riesgo R7, DP-26).

#### 4.2.1 Fecha de lanzamiento: dónde se configura y qué implica [2.0, D-95, D-96, D-97, D-116]

- **Dónde**: el campo `lanzamiento` de `data/calendario.json`. Nadie lo edita a mano: se cambia con `npm run lanzamiento` (`herramientas/lanzamiento.mjs`), que lo decide el usuario y ejecuta el archivero.
  - `npm run lanzamiento` sin argumentos: muestra el lanzamiento actual (o "sin fecha"), el número de días de cada reto, cuántos archivos mensuales tiene Headlines y, si hay fecha, la del último día de cada reto. No escribe nada.
  - `npm run lanzamiento -- AAAA-MM-DD`: fija la fecha.
  - `npm run lanzamiento -- --sin-fecha`: vuelve a `null`.
- **Comprobaciones** (`comprobarCambioLanzamiento`, 4.6), todas antes de escribir:
  - la fecha nueva es una fecha ISO válida **posterior a hoy** (como pronto, mañana);
  - si el lanzamiento actual no es `null` y ya ha llegado (`actual <= hoy`), se detiene: "El juego se lanzó el {actual}: cambiar la fecha renumeraría los casos ya jugados y rompería las rachas." (código 1);
  - un argumento desconocido o más de uno → error;
  - [D-116] los archivos de `data/titulares/` se leen con `leerTitularesMensuales` y se unen con `unirMeses(archivos, {comprobarMes: false})` (4.11): un archivo que no pasa `validarTitulares`, un nombre que no es `AAAA-MM.json`, días con huecos o un mismo `n` con contenido distinto en dos archivos → error, sin escribir nada.
- **Migración** (una sola vez, idempotente): si el calendario es de la versión 3, comprueba que cada `fecha` sea `sumarDias(lanzamiento anterior, n - 1)` (si no, error), la quita y escribe la versión 4; si `banco.json` existe y es de la versión 2, quita `fecha` de cada entrada y escribe la versión 3. Sin banco, solo avisa.
- **Reparto de los titulares por mes** [D-116]: como el mes de cada día depende del lanzamiento (`mesDeNumero`), cada vez que la herramienta escribe una fecha (o `--sin-fecha`) vuelve a repartir los días de Headlines: `repartirPorMes(dias, nuevo)` y `escribirTitularesMensuales(dir, archivos, {borrarSobrantes: true})`. El contenido de cada día (`n`, `tema`, `clave`, `textos`, `fichas`) no cambia; solo cambia en qué archivo está. Ejemplo: sin fecha, los días 1–31 están en `2000-01.json`; con `2026-12-15`, los días 1–17 pasan a `2026-12.json` y los 18–48 a `2027-01.json`, y `2000-01.json` se borra. Con el lanzamiento ya llegado la herramienta no escribe nada, así que el reparto queda fijo para siempre. No hay índice de meses que actualizar: el modo prueba descubre los archivos por sí mismo (4.7.2) [D-117].
- **Qué implica para los días ya generados**: nada que regenerar ni recifrar. Ids, orden, claves, fichas, imágenes y los bloques de titulares siguen idénticos; solo cambia qué fecha corresponde a cada `n` y el archivo mensual de cada día de Headlines.
- **Escritura**, en este orden, con `JSON.stringify(obj, null, 2) + '\n'`, UTF-8 y LF: (1) los archivos mensuales de titulares nuevos o cambiados; (2) el borrado de los que ya no corresponden a ningún mes; (3) el calendario; (4) el banco. Si algo falla a mitad, se vuelve a ejecutar la herramienta con el mismo argumento: es idempotente, porque la unión tolera un mismo día repetido con contenido idéntico (resto de una ejecución interrumpida) y el reparto se recalcula siempre desde cero.
- **Al terminar** recuerda: "Antes del {fecha}: PRUEBAS_ABIERTAS = false en js/main.js (tarea 44), npm run validar -- --estricto y publicar." y, si ha cambiado algún archivo de titulares, "Incluye data/titulares/ en el commit (archivos añadidos y borrados)."
- **Mientras `lanzamiento` es `null`**: el juego normal muestra `sin-casos` con `sin_casos.sin_lanzamiento`; `?fecha=` (previsualización local) también da `sin-casos`; solo funciona el modo prueba; `importar` y `titulares` consideran futuros todos los días, así que `--reimportar` siempre está permitido; los archivos de titulares se llaman `2000-01.json`, `2000-02.json`… (fechas ficticias de `FECHA_BASE_PRUEBA`, iguales a las del modo prueba).

### 4.3 Ofuscación de la respuesta [D-22]

Sin cambios (`mascara`, `ofuscar`, `desofuscar`; vector `ofuscar([0, 1, 1, 0, 1], 1, () => 0) === 'Mpb9Ycc='`). La usan los dos retos: cada día de cada reto tiene su `clave` con ruido aleatorio propio.

### 4.3.1 Ofuscación y relleno de las fichas de Images [D-86]

Sin cambios de formato ni de salida. [2.0] Se implementa sobre los bloques genéricos de 4.8 (`flujoBytes`, `ofuscarBloque`, `desofuscarBloque`) con semilla `` `${clave}|${n}|${indice}` `` y bloque de 512 bytes; el vector de D-92 sigue valiendo.

### 4.4 Herramientas: flujo y ausencia de banco.json

| Script | Lee | Escribe | Sin `banco.json` |
|---|---|---|---|
| `importar.mjs` (`npm run importar`) | Como en la 1.3 | `casos/`, `banco.json` (**v3**), `data/calendario.json` (**v4**), `creditos.html` | Como en la 1.3. |
| [2.0] `lanzamiento.mjs` (`npm run lanzamiento`) | `data/calendario.json`, `banco.json` si existe, [D-116] todos los `data/titulares/*.json` | `data/calendario.json`, `banco.json` y [D-116] los archivos de `data/titulares/` (reparto por mes, con borrado de los sobrantes) | Migra el calendario, reparte los titulares y avisa. |
| [2.0] `importar-titulares.mjs` (`npm run titulares`) | `entrada/titulares/`, [D-116] todos los `data/titulares/*.json`, `data/calendario.json` (solo `lanzamiento`) | [D-116] solo los archivos mensuales que reciben días nuevos (o todos con `--reimportar`) y, si hay banco, `creditos.html` | No lo necesita; sin banco avisa de que hay que regenerar los créditos con `npm run creditos` donde esté el banco. |
| `creditos.mjs` | `banco.json`, [D-116] todos los `data/titulares/*.json`, `js/textos.js` | `creditos.html` | Como en la 1.3. |
| `validar.mjs` | `data/calendario.json`, [2.0] todos los `data/titulares/*.json`, `casos/`, lo publicado, `js/main.js` como texto, `js/textos.js`, `banco.json` si existe | nada | Como en la 1.3. |

`package.json`: scripts nuevos `"lanzamiento": "node herramientas/lanzamiento.mjs"` y `"titulares": "node herramientas/importar-titulares.mjs"`. `.gitignore` no cambia (`entrada/` cubre `entrada/titulares/`; `data/titulares/` se publica). [D-117] Ninguna herramienta genera un índice de meses.

#### 4.4.1 Carpetas de entrada de imágenes

Sin cambios (D-52, D-85, D-93: `entrada/temas/NN-tema/{ia,real}/`, prompts `.txt` y `.en.txt`).

#### 4.4.2 Flujo de importar.mjs [2.0]

Como en la 1.3, con estos cambios:
- Desaparece la constante `LANZAMIENTO = '2026-11-01'` [D-95]. Sin calendario, se parte de `{version: 4, lanzamiento: null, dias: []}`.
- Paso 2: un banco de la versión 2 detiene el importador: "herramientas/banco.json es de la versión 2: conviértelo con npm run lanzamiento (no cambia la fecha si repites la actual o usas --sin-fecha)."
- Paso 3 (sin `--reimportar`): versión 2 → mensaje de la 1.3; **versión 3** → "data/calendario.json es de la versión 3 (con fechas): conviértelo con npm run lanzamiento."; cualquier otro calendario que no cumpla `validarCalendario` (versión 4) → mensaje de D-63.
- `planificar` recibe `lanzamiento` (puede ser `null`): con `null`, las fechas de los días nuevos son `null` y no se comprueba que sean posteriores a hoy; con fecha, solo se añaden días con `fechaDelDia(lanzamiento, n) > hoy`.
- `--simular` y el informe muestran "sin fecha de lanzamiento" en lugar de la fecha.
- El banco se escribe en la versión 3 (sin `fecha`) y el calendario en la versión 4.
- No lee ni escribe `data/titulares/`.

#### 4.4.3 Comprobaciones de validar.mjs (Images, lanzamiento y modo prueba) [2.0]

Las de la 1.3, con estos cambios (las de Headlines están en 4.12):
- `version` es **4** y `validarCalendario` pasa. Calendario de la versión 3: "data/calendario.json es de la versión 3: conviértelo con npm run lanzamiento." Versión 2: el mensaje de la 1.3.
- [D-95] `lanzamiento` es `null` o una fecha ISO válida; **ya no se exige ningún valor fijo**. Ni `validar.mjs` ni ningún archivo de `js/` o `herramientas/` contiene la fecha `2026-11-01`.
- Con banco: versión 3 (la 2 es error con el mensaje de `importar`); sin la comprobación de `fecha`.
- **Interruptor `PRUEBAS_ABIERTAS`** [D-71, D-97]: declaración única (error si no); con `true`:
  - si `lanzamiento` no es `null` y `lanzamiento <= hoy` → **error** (el juego ya está abierto al público);
  - con `--estricto` → error;
  - si no, aviso: "el modo prueba está abierto. Ciérralo antes del lanzamiento ({lanzamiento})" o, sin fecha, "…antes del lanzamiento (aún sin fecha)".
- **Aviso de calendario corto** [D-62, D-97], por reto: con fecha, "Images: quedan N días de calendario a partir de hoy" si `N < 7` (días con `fechaDelDia >= hoy`); sin fecha, "Images: el calendario tiene N días (sin fecha de lanzamiento)" si `N < 7`. Lo mismo para Headlines (con los días de todos sus archivos mensuales).
- Aviso si los dos retos tienen distinto número de días: "Headlines tiene 5 días e Images 7: los días 6 y 7 solo tendrán Images."

#### 4.4.4 Reimportación de imágenes [2.0]

Como en la 1.3. `comprobarReimportacion` usa `fechaDelDia(lanzamiento, n)`: sin lanzamiento, ningún día ha llegado y siempre se permite. `calendarioAnteriorValido` acepta las versiones 2, 3 y 4 (4.6). El calendario nuevo es la versión 4 y conserva `lanzamiento`.

#### 4.4.5 herramientas/lote.json

Sin cambios.

### 4.5 creditos.html y herramientas/creditos.mjs [D-39, D-111, D-116]

Como en la 1.3, más la sección de noticias de 2.7 [2.0]:
- `mediosDeTitulares(titulares)` (pura, en `creditos.mjs`): recibe `{dias}` con los días **de todos los meses** (la salida de `unirMeses`) o `null`. Para cada día y prueba con `desofuscar(...) === 0`, `desofuscarNoticia(...)`; si es de tipo `fuente` y `urlFuenteValida`, `medioDeUrl`; sin repetir, ordenados con `localeCompare('en')`. Con `null` o `dias: []`, `[]`. Nunca lanza (lo que no se descifra se omite; `validar` ya lo da como error).
- `generarCreditosHtml({parejas, medios})`: sección `creditos-noticias` con `ul#creditos-medios` o `creditos.sin_noticias`, y `p#creditos-ficcion` siempre.
- `escribirCreditos` lee además todos los `data/titulares/*.json` con `leerTitularesMensuales` y `unirMeses` (sin carpeta o sin archivos, `medios: []`; con errores de unión, se detiene con código 1 y remite a `npm run validar`).
- Determinista: mismos datos, mismo archivo byte a byte (no depende de cómo estén repartidos los meses).

### 4.6 herramientas/temas.mjs (archivero) [2.0]

Siguen sin cambios las de la 1.3 (incluidas `normalizarFicha`, `avisosMezcla`, `compararPesos`, `barajar` y `nuevoId`). Cambios y novedades:

| Exportación | Parámetros → retorno | Descripción |
|---|---|---|
| `planificar({carpetas, ultimoDia, hoyISO, lanzamiento, …})` | → `{nuevos, omitidos, errores, avisos}` | `lanzamiento` puede ser `null` (fechas `null`, sin comprobación de días pasados). Nunca lanza. |
| `comprobarReimportacion({calendario, nombresCarpetas, hoyISO, diasEntre})` | | Con `lanzamiento: null`, ningún día ha llegado. Con fecha, usa `fechaDelDia`. |
| `calendarioAnteriorValido(obj)` | → `boolean` | Acepta `version` 2, 3 o 4, con `lanzamiento` `null` (solo en la 4) o fecha ISO válida, y `dias` con `n` entero ≥ 1 y 5 `pruebas`. Rechaza la versión 1, `null` y los objetos sin `dias`. |
| `analizarArgumentosLanzamiento(argv)` | → `{accion: 'mostrar' \| 'fijar' \| 'quitar', fecha, errores}` | Sin argumentos, `mostrar`; una fecha ISO, `fijar`; `--sin-fecha`, `quitar`; cualquier otra cosa, error. |
| `comprobarCambioLanzamiento({actual, nuevo, hoyISO})` | → `string[]` (errores) | Reglas de 4.2.1. `nuevo` `null` equivale a `--sin-fecha`. |
| `migrarCalendario(obj)` | → `{calendario, errores}` | Versión 3 → 4 (quita `fecha` tras comprobarla); la 4 se devuelve igual; cualquier otra, error. No muta. |
| `migrarBanco(obj)` | → `{banco, errores}` | Versión 2 → 3 (quita `fecha`); la 3 igual; otra, error. No muta. |

Las funciones de los archivos mensuales de titulares (`unirMeses`, `repartirPorMes`, `leerTitularesMensuales`, `escribirTitularesMensuales`) están en `herramientas/titulares.mjs` (4.11) [D-116].

---

## 5. Algoritmo diario [2.0]

1. `hoy` = la fecha efectiva (glosario).
2. `n = numeroDelDia(hoy, lanzamiento)`; **sin lanzamiento, `null`** y los dos retos sin caso → `sin-casos` con `sin_casos.sin_lanzamiento` [D-95].
3. Images: `casoDelDia(calendario, hoy)`. Headlines: [D-116] se carga **solo** `data/titulares/{mesDeFecha(hoy)}.json` (`cargarTitulares(hoy)`) y `titularesDelDia(titulares, lanzamiento, hoy)`. En modo prueba, por número: se cargan **todos** los meses (`cargarTitularesPrueba(lanzamiento)`) y se usan `casoDeNumero` y `titularesDeNumero` con el archivo del día elegido, `titularesDelMes(meses, mesDeNumero(lanzamiento, n))` [D-110, D-117].
4. **El número `n` es el mismo para los dos retos** (Case #12 de Images y de Headlines es el mismo día) [D-99, DP-50], y es **global**: no se reinicia al cambiar de mes ni de archivo. El día 31 puede estar en `2000-01.json` y el 32 en `2000-02.json`; los dos son "Case #31" y "Case #32" [D-116].
5. Un reto sin día `n` no tiene caso hoy ("No case today" en su ficha de la portada); si ninguno tiene, `sin-casos` [D-24]. También no tiene caso Headlines si no existe el archivo del mes (404) o si el archivo existe pero no contiene `n`. No se usa ninguna semilla sobre el banco ni se reciclan días.
6. **Cambio de día y de mes**: `MEDIANOCHE` (en `portada`, `ya-jugado` y `sin-casos`) vuelve a `iniciando` y recarga el calendario y el archivo del mes de la nueva fecha; el día 1 de cada mes se pide el archivo nuevo. Una partida en curso a medianoche se termina con los datos ya cargados [D-116].
7. El contenido lo decide el usuario: carpetas `NN` de cada reto, reparto de 1 a 4 generadas y orden fijado al importar [D-55].
8. Todos los jugadores con la misma fecha local ven los mismos casos.
9. **Un intento por fecha y por reto** [D-99]; en Images, sea cual sea el modo [D-32].
10. Cambiar la hora del dispositivo permite adelantar días [D-18]; el modo prueba abre una vía mientras `PRUEBAS_ABIERTAS` sea `true` [D-70].
11. Images: el jugador puede consultar fuera del juego tras la observación (DP-24). Headlines: salir de la página **más de 3 s seguidos** antes de responder es fallo [D-101, D-115]; las ausencias más cortas, otra ventana u otro dispositivo no se detectan, y los titulares auténticos se pueden buscar en internet (riesgos R3 y R12 en 9.5).

---

## 6. Almacenamiento [2.0, D-109]

Una sola clave versionada: **`identifaiit.v3`**.

```json
{
  "version": 3,
  "ajustes": { "modo": "perro", "reto": "titulares" },
  "retos": {
    "imagenes": {
      "partidas": {
        "2026-12-01": { "n": 1, "modo": "normal", "estado": "terminada", "resultados": "AAFFA", "aciertos": 3, "sesion": "x8f2k1q9" }
      },
      "racha": 1,
      "mejorRacha": 1
    },
    "titulares": {
      "partidas": {
        "2026-12-01": { "n": 1, "modo": null, "estado": "en_curso", "resultados": "AF---", "aciertos": 1, "sesion": "b7d0s3m2" }
      },
      "racha": 0,
      "mejorRacha": 0
    }
  }
}
```

- `ajustes.modo`: `investigador|normal|perro` (por defecto `normal`); `ajustes.reto`: `imagenes|titulares` (por defecto `imagenes`). Los dos se validan al leer.
- `retos.{reto}.partidas` va por fecha ISO; `resultados` solo contiene `A`, `F` y `-`. En Headlines, `modo` es `null`.
- `racha` y `mejorRacha` son **por reto** y se recalculan en `registrarFin` del reto [D-25, D-99].
- Clave de disponibilidad: `identifaiit.prueba`.
- **Sin migración** [D-109]: el juego no se ha lanzado; `identifaiit.v2` y `identifaiit.v1` no se leen, no se migran y no se borran.
- Si localStorage falla: respaldo en sessionStorage o memoria y `#aviso-almacen` [D-11, D-51].
- **Varias pestañas** [D-51]: todo guardado relee y aplica solo su cambio; la `sesion` protege cada partida en curso de cada reto. El evento `storage` y la vuelta a visible comparan las partidas de hoy de cada reto y despachan `OTRA_PESTANA {reto}` por reto.
- **Ausencias** [D-115]: no se guarda nada al ocultar la pestaña; solo se guarda la `F` si la ausencia supera 3 s (al volver). Si la página no vuelve, la regla de partida abandonada da `F` a la prueba.
- **Previsualización y modo prueba**: almacenes en memoria; no se toca ninguna clave `identifaiit.*`.
- Ni el almacén ni ninguna caché propia guardan los datos de titulares (tampoco la lista de meses del modo prueba): no hay service worker; cada `iniciando` los vuelve a pedir con `cache: 'no-cache'` [D-116, D-117].

---

## 7. Compartir [D-30, D-80, D-112]

Plantillas exactas, como literales de JS:

```js
plantilla:           'identifAI-it Images #{caso}\nMode: {modo}\n{aciertos}/5 {cuadros}\nStreak: {racha}\n{url}'
plantilla_titulares: 'identifAI-it Headlines #{caso}\n{aciertos}/5 {cuadros}\nStreak: {racha}\n{url}'
```

- Images: 5 líneas; Headlines: 4 (sin modo). LF, sin espacios ni saltos al final.
- [2.0] La primera línea de Images pasa de "identifAI-it · Case #{caso}" a "identifAI-it Images #{caso}" para distinguir los dos retos con el mismo estilo (DP-38).
- `{caso}`: `n`, común a los dos retos [D-99]. `{modo}`: `TEXTOS.portada.modo_*` (solo Images). `{aciertos}`: 0 a 5. `{cuadros}`: `cuadros(resultados)`. `{racha}`: la **del reto** tras la partida. `{url}`: `urlDelJuego()`.
- No incluye tema, fichas, titulares, entradillas, dominios ni prompts, y no revela qué pruebas eran IA: solo acierto o fallo por posición. Un fallo por ausencia es un `🟥` como cualquier otro.

Ejemplos literales completos, en `https://usuario.github.io/identifAI-it/`:

Images, caso 12, modo `perro`, `AAFAF`, racha 3:
```
identifAI-it Images #12
Mode: Bloodhound
3/5 🟩🟩🟥🟩🟥
Streak: 3
https://usuario.github.io/identifAI-it/
```

Headlines, caso 12, `FAAAA`, racha 5:
```
identifAI-it Headlines #12
4/5 🟥🟩🟩🟩🟩
Streak: 5
https://usuario.github.io/identifAI-it/
```

`compartir(texto, nav)`: sin cambios (share → portapapeles → `#compartir-manual`).
