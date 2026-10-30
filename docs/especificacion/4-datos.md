# identifAI-it: especificación técnica, versión 2.1 · 4 a 7. Datos (Images y lanzamiento), algoritmo diario, almacenamiento y compartir

Parte de la especificación 2.1 (índice en `docs/ESPECIFICACION.md`) [D-120]. Los datos y herramientas de Fact or Fake están en `4b-facts.md` (4.7 a 4.14). Los cambios de la 2.0 van marcados con **[2.0]** y los de la 2.1 (Fact or Fake en lugar de Headlines), con **[2.1]**.

## 4. Datos

### 4.1 herramientas/banco.json (privado, solo en local) · [2.0] versión 3 [D-21, D-57, D-96]

- En `.gitignore`, nunca se sube, el juego no lo carga. Solo para imágenes. [2.1] Fact or Fake no tiene banco ni fuentes [D-131].
- Contenido: `{"version": 3, "imagenes": [...]}`. Cada entrada: `id`, `tipo` (`autentica|generada`), `dia`, `tema`, `fuente`, `licencia`, `original`, `dhash`, `recorte` y `alta`, como en la 1.3. [2.0] **Sin `fecha`**: la fecha de un día se deriva de `lanzamiento` y `dia` (`fechaDelDia`).
- `importar`, `creditos` y `validar` rechazan los bancos de las versiones 1 y 2; el de la versión 2 se convierte con `npm run lanzamiento` (4.2.1).
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
- `version` vale **4**. `lanzamiento` es `null` (sin fecha decidida) o una fecha ISO válida [D-95].
- `dias` ordenado por `n`, sin huecos. Los días **no** tienen `fecha`: la del día `n` es `fechaDelDia(lanzamiento, n)` (`null` sin lanzamiento).
- `tema`, `pruebas`, `clave` y `fichas`: como en la 1.3. [2.1] El `tema` del día `n` es el mismo que el de Fact or Fake si ese día existe en `data/facts/` (misma carpeta, D-123; lo comprueba `validar`).
- Ningún otro campo. Las ofuscaciones no dependen de la fecha, así que mover el lanzamiento no obliga a recifrar nada.
- `data/calendario.json` es el **único** sitio donde vive la fecha de lanzamiento, común a los dos retos; los archivos `data/facts/AAAA-MM.json` no la repiten, aunque su nombre dependa de ella [D-95, D-116].
- El calendario de Images sigue siendo **un solo archivo** (riesgo R7, DP-26).

#### 4.2.1 Fecha de lanzamiento: dónde se configura y qué implica [2.0, D-95, D-96, D-97, D-116]

- **Dónde**: el campo `lanzamiento` de `data/calendario.json`. Nadie lo edita a mano: se cambia con `npm run lanzamiento` (`herramientas/lanzamiento.mjs`).
  - Sin argumentos: muestra el lanzamiento actual (o "sin fecha"), el número de días de cada reto (Images y Fact or Fake), cuántos archivos mensuales tiene `data/facts/` y, si hay fecha, la del último día de cada reto. No escribe nada.
  - `npm run lanzamiento -- AAAA-MM-DD`: fija la fecha.
  - `npm run lanzamiento -- --sin-fecha`: vuelve a `null`.
- **Comprobaciones** (`comprobarCambioLanzamiento`, 4.6), todas antes de escribir:
  - la fecha nueva es una fecha ISO válida **posterior a hoy**;
  - si el lanzamiento actual no es `null` y ya ha llegado, se detiene: "El juego se lanzó el {actual}: cambiar la fecha renumeraría los casos ya jugados y rompería las rachas." (código 1);
  - un argumento desconocido o más de uno → error;
  - [2.1] los archivos de `data/facts/` se leen con `leerAfirmacionesMensuales` y se unen con `unirMeses(archivos, {comprobarMes: false})` (4.11): cualquier error → no se escribe nada.
- **Migración** (una sola vez, idempotente): calendario 3 → 4 y banco 2 → 3, como en la 2.0. Fact or Fake no tiene banco [D-131].
- **Reparto por mes** [D-116]: cada vez que la herramienta escribe una fecha (o `--sin-fecha`) vuelve a repartir los días de Fact or Fake: `repartirPorMes(dias, nuevo)` y `escribirAfirmacionesMensuales('data/facts', archivos, {borrarSobrantes: true})`. El contenido de cada día no cambia; solo su archivo.
- **Qué implica para los días ya generados**: nada que regenerar ni recifrar.
- **Escritura**, en este orden: (1) los archivos mensuales de `data/facts/` nuevos o cambiados; (2) el borrado de los sobrantes; (3) el calendario; (4) el banco de imágenes. Idempotente.
- **Al terminar** recuerda: "Antes del {fecha}: PRUEBAS_ABIERTAS = false en js/main.js (tarea 44), npm run validar -- --estricto y publicar." y, si ha cambiado algún archivo, "Incluye data/facts/ en el commit (archivos añadidos y borrados)."
- **Mientras `lanzamiento` es `null`**: el juego normal muestra `sin-casos` con `sin_casos.sin_lanzamiento`; `?fecha=` también da `sin-casos`; solo funciona el modo prueba; `importar` y `afirmaciones` consideran futuros todos los días; los archivos se llaman `2000-01.json`, `2000-02.json`…

### 4.3 Ofuscación de la respuesta [D-22]

Sin cambios (`mascara`, `ofuscar`, `desofuscar`; vector `ofuscar([0, 1, 1, 0, 1], 1, () => 0) === 'Mpb9Ycc='`). La usan los dos retos: cada día de cada reto tiene su `clave` con ruido aleatorio propio.

### 4.3.1 Ofuscación y relleno de las fichas de Images [D-86]

Sin cambios de formato ni de salida. Se implementa sobre los bloques genéricos de 4.8 con semilla `` `${clave}|${n}|${indice}` `` y bloque de 512 bytes; el vector de D-92 sigue valiendo.

### 4.4 Herramientas: flujo y ausencia de bancos

| Script | Lee | Escribe | Sin su banco |
|---|---|---|---|
| `importar.mjs` (`npm run importar`) | Como en la 1.3 ([2.1] ignora `facts.txt`, `facts.en.txt`, `datos.txt` y `datos.original.txt`, que no abre) | `casos/`, `banco.json` (**v3**), `data/calendario.json` (**v4**), `creditos.html` | Como en la 1.3. |
| `lanzamiento.mjs` (`npm run lanzamiento`) | `data/calendario.json`, `banco.json` si existe, [2.1] todos los `data/facts/*.json` | `data/calendario.json`, `banco.json` y los archivos de `data/facts/` (reparto por mes) | Migra el calendario, reparte y avisa. |
| [2.1] `importar-afirmaciones.mjs` (`npm run afirmaciones`) | `entrada/temas/*/facts(.en).txt` (nunca `datos.txt` ni `datos.original.txt`), todos los `data/facts/*.json`, `data/calendario.json` (`lanzamiento` y temas) | Solo los archivos mensuales que reciben días nuevos (o todos con `--reimportar`) | No tiene banco [D-131], 4.10. |
| `creditos.mjs` | `banco.json`, `js/textos.js` ([2.1] ya no lee datos de Fact or Fake) | `creditos.html` | Como en la 1.3. |
| `validar.mjs` | `data/calendario.json`, [2.1] todos los `data/facts/*.json`, `casos/`, lo publicado, `js/main.js` como texto, `js/textos.js` y `banco.json` si existe (no lee `entrada/`) | nada | Avisos; con `--estricto`, error. |

`package.json`: scripts `"lanzamiento": "node herramientas/lanzamiento.mjs"` y [2.1] `"afirmaciones": "node herramientas/importar-afirmaciones.mjs"` (no hay script `titulares`). `.gitignore`: [2.1] sin cambios por Fact or Fake (`entrada/` ya cubre `facts.txt`, `facts.en.txt`, `datos.txt` y `datos.original.txt`; `data/facts/` se publica; no hay banco de afirmaciones, D-131).

#### 4.4.1 Carpetas de entrada de imágenes [2.1]

Sin cambios en `ia/` y `real/` (D-52, D-85, D-93). [2.1] La carpeta del día comparte tema con Fact or Fake y puede contener además `facts.txt`, `facts.en.txt` (4.9) [D-123], `datos.txt` y `datos.original.txt` (notas de trabajo del usuario en texto libre, que nunca se leen ni se publican) [D-139, antes DP-61]:
- `planificar` (en `temas.mjs`) admite esos cuatro archivos en la raíz de la carpeta y los ignora (solo esos nombres exactos, en minúsculas); cualquier otro archivo suelto sigue siendo un error. `importar.mjs` no los abre en ningún paso.
- Una carpeta **sin** `ia/` ni `real/` (solo con afirmaciones o solo con notas) es un día que aún no tiene Images: si es la última (o todas las siguientes tampoco tienen imágenes), queda pendiente con un aviso ("05-cats y siguientes no tienen imágenes: Images se queda en el día 4."); si una carpeta posterior sí tiene imágenes, es un error (hueco). Una carpeta con solo una de las dos subcarpetas sigue siendo un error.

#### 4.4.2 Flujo de importar.mjs [2.0]

Como en la 1.3, con estos cambios:
- Desaparece la constante `LANZAMIENTO = '2026-11-01'` [D-95]. Sin calendario, se parte de `{version: 4, lanzamiento: null, dias: []}`.
- Paso 2: un banco de la versión 2 detiene el importador: "herramientas/banco.json es de la versión 2: conviértelo con npm run lanzamiento (no cambia la fecha si repites la actual o usas --sin-fecha)."
- Paso 3 (sin `--reimportar`): versión 2 → mensaje de la 1.3; **versión 3** → "data/calendario.json es de la versión 3 (con fechas): conviértelo con npm run lanzamiento."; cualquier otro calendario que no cumpla `validarCalendario` (versión 4) → mensaje de D-63.
- `planificar` recibe `lanzamiento` (puede ser `null`) y [2.1] aplica 4.4.1 (incluidos `datos.txt` y `datos.original.txt`, ignorados sin errores ni avisos) [D-139].
- `--simular` y el informe muestran "sin fecha de lanzamiento" en lugar de la fecha.
- El banco se escribe en la versión 3 y el calendario en la versión 4.
- No lee ni escribe `data/facts/`. Nunca modifica ni borra nada de `entrada/` (tampoco `datos.txt` ni `datos.original.txt`).

#### 4.4.3 Comprobaciones de validar.mjs (Images, lanzamiento y modo prueba) [2.0]

Las de la 1.3, con estos cambios (las de Fact or Fake están en 4.12):
- `version` es **4** y `validarCalendario` pasa. Versión 3: "data/calendario.json es de la versión 3: conviértelo con npm run lanzamiento." Versión 2: el mensaje de la 1.3.
- `lanzamiento` es `null` o una fecha ISO válida; ningún archivo de `js/` o `herramientas/` contiene `2026-11-01`.
- Con banco: versión 3; sin la comprobación de `fecha`.
- **Interruptor `PRUEBAS_ABIERTAS`** [D-71, D-97]: declaración única; con `true`: error si el lanzamiento ya ha llegado o con `--estricto`; si no, aviso con la fecha o "aún sin fecha".
- **Aviso de calendario corto** por reto (Images y Fact or Fake): con fecha, si quedan menos de 7 días; sin fecha, si el reto tiene menos de 7.
- Aviso si los dos retos tienen distinto número de días: "Fact or Fake tiene 5 días e Images 7: los días 6 y 7 solo tendrán Images."
- [2.1] `validar` no lee `entrada/` (tampoco `datos.txt` ni `datos.original.txt`); la comprobación de que ningún archivo de `entrada/` ni ningún `.txt` fuera de `fonts/` está rastreado por git los cubre [D-139].

#### 4.4.4 Reimportación de imágenes [2.0]

Como en la 1.3. `comprobarReimportacion` usa `fechaDelDia(lanzamiento, n)`; `calendarioAnteriorValido` acepta las versiones 2, 3 y 4. [2.1] Las carpetas con solo afirmaciones (o solo notas) no cuentan como días de Images (4.4.1).

#### 4.4.5 herramientas/lote.json

Sin cambios.

### 4.5 creditos.html y herramientas/creditos.mjs [D-39, D-129]

Como en la 1.3, más [2.1] la sección fija `#creditos-afirmaciones` de 2.7, con `TEXTOS.creditos.afirmaciones` y `afirmaciones_texto` (valor exacto en 3.1 y 4.14, D-132). `generarCreditosHtml({parejas})` la escribe siempre; no hay `mediosDeTitulares` ni lectura de `data/facts/`. Determinista: mismos datos, mismo archivo byte a byte.

### 4.6 herramientas/temas.mjs (archivero) [2.0]

Siguen sin cambios las de la 1.3 (incluidas `normalizarFicha`, `avisosMezcla`, `compararPesos`, `barajar` y `nuevoId`) y las de la 2.0:

| Exportación | Parámetros → retorno | Descripción |
|---|---|---|
| `planificar({carpetas, ultimoDia, hoyISO, lanzamiento, …})` | → `{nuevos, omitidos, pendientes, errores, avisos}` | `lanzamiento` puede ser `null`. [2.1] Ignora `facts.txt`, `facts.en.txt`, `datos.txt` y `datos.original.txt` en la raíz de la carpeta [D-139] y aplica la regla de carpetas sin imágenes de 4.4.1 (`pendientes`: números de las carpetas finales sin `ia/` ni `real/`). Nunca lanza. |
| `comprobarReimportacion({calendario, nombresCarpetas, hoyISO, diasEntre})` | | Con `lanzamiento: null`, ningún día ha llegado. |
| `calendarioAnteriorValido(obj)` | → `boolean` | Acepta `version` 2, 3 o 4. |
| `analizarArgumentosLanzamiento(argv)` | → `{accion, fecha, errores}` | Sin cambios. |
| `comprobarCambioLanzamiento({actual, nuevo, hoyISO})` | → `string[]` | Sin cambios. |
| `migrarCalendario(obj)`, `migrarBanco(obj)` | | Sin cambios. |

Las funciones de los archivos mensuales de Fact or Fake están en `herramientas/afirmaciones.mjs` (4.11).

---

## 5. Algoritmo diario

1. `hoy` = la fecha efectiva (glosario).
2. `n = numeroDelDia(hoy, lanzamiento)`; **sin lanzamiento, `null`** y los dos retos sin caso → `sin-casos` con `sin_casos.sin_lanzamiento` [D-95].
3. Images: `casoDelDia(calendario, hoy)`. Fact or Fake: se carga **solo** `data/facts/{mesDeFecha(hoy)}.json` (`cargarAfirmaciones(hoy)`) y `afirmacionesDelDia(datos, lanzamiento, hoy)`. En modo prueba, por número: se cargan **todos** los meses (`cargarAfirmacionesPrueba(lanzamiento)`) y se usan `casoDeNumero` y `afirmacionesDeNumero` con el archivo del día elegido [D-110, D-117].
4. **El número `n` es el mismo para los dos retos** [D-99], es **global** (no se reinicia al cambiar de mes) y [2.1] el día `n` tiene **el mismo tema** en los dos [D-123].
5. Un reto sin día `n` no tiene caso hoy ("No case today" en su ficha de la portada); si ninguno tiene, `sin-casos` [D-24]. No se usa ninguna semilla sobre el banco ni se reciclan días.
6. **Cambio de día y de mes**: `MEDIANOCHE` (en `portada`, `ya-jugado` y `sin-casos`) recarga el calendario y el archivo del mes de la nueva fecha. Una partida en curso a medianoche se termina con los datos ya cargados.
7. El contenido lo decide el usuario: carpetas `NN-tema` con imágenes y afirmaciones, reparto de 1 a 4 generadas (Images) o falsas (Fact or Fake), y orden fijado al importar [D-55].
8. Todos los jugadores con la misma fecha local ven los mismos casos.
9. **Un intento por fecha y por reto** [D-99]; en Images, sea cual sea el modo [D-32].
10. Cambiar la hora del dispositivo permite adelantar días [D-18]; el modo prueba abre una vía mientras `PRUEBAS_ABIERTAS` sea `true` [D-70].
11. Images: el jugador puede consultar fuera del juego tras la observación (DP-24). Fact or Fake: salir de la página **más de 3 s seguidos** antes de responder es fallo [D-101, D-115]; las ausencias más cortas, otra ventana u otro dispositivo no se detectan, y las afirmaciones se pueden buscar en internet (riesgos R3 y R12 en 9.5).

---

## 6. Almacenamiento [2.0, D-109]

Una sola clave versionada: **`identifaiit.v3`** (sin subir versión en la 2.1: la v3 nunca se publicó) [D-121].

```json
{
  "version": 3,
  "ajustes": { "modo": "perro", "reto": "afirmaciones" },
  "retos": {
    "imagenes": {
      "partidas": {
        "2026-12-01": { "n": 1, "modo": "normal", "estado": "terminada", "resultados": "AAFFA", "aciertos": 3, "sesion": "x8f2k1q9" }
      },
      "racha": 1,
      "mejorRacha": 1
    },
    "afirmaciones": {
      "partidas": {
        "2026-12-01": { "n": 1, "modo": null, "estado": "en_curso", "resultados": "AF---", "aciertos": 1, "sesion": "b7d0s3m2" }
      },
      "racha": 0,
      "mejorRacha": 0
    }
  }
}
```

- `ajustes.modo`: `investigador|normal|perro` (por defecto `normal`); `ajustes.reto`: `imagenes|afirmaciones` (por defecto `imagenes`; un `titulares` guardado en pruebas locales se trata como inválido). Los dos se validan al leer.
- `retos.{reto}.partidas` va por fecha ISO; `resultados` solo contiene `A`, `F` y `-`. En Fact or Fake, `modo` es `null`.
- `racha` y `mejorRacha` son **por reto** [D-25, D-99].
- Clave de disponibilidad: `identifaiit.prueba`.
- **Sin migración** [D-109]: `identifaiit.v2` y `identifaiit.v1` no se leen, no se migran y no se borran.
- Si localStorage falla: respaldo en sessionStorage o memoria y `#aviso-almacen` [D-11, D-51].
- **Varias pestañas** [D-51]: por reto, con `OTRA_PESTANA {reto}`.
- **Ausencias** [D-115]: no se guarda nada al ocultar la pestaña; solo se guarda la `F` si la ausencia supera 3 s (al volver).
- **Previsualización y modo prueba**: almacenes en memoria.
- Ni el almacén ni ninguna caché propia guardan los datos de `data/facts/`.

---

## 7. Compartir [D-30, D-80, D-112, D-128]

Plantillas exactas, como literales de JS:

```js
plantilla:              'identifAI-it Images #{caso}\nMode: {modo}\n{aciertos}/5 {cuadros}\nStreak: {racha}\n{url}'
plantilla_afirmaciones: 'identifAI-it Fact or Fake #{caso}\n{aciertos}/5 {cuadros}\nStreak: {racha}\n{url}'
```

- Images: 5 líneas; Fact or Fake: 4 (sin modo). LF, sin espacios ni saltos al final.
- `{caso}`: `n`, común a los dos retos [D-99]. `{modo}`: `TEXTOS.portada.modo_*` (solo Images). `{aciertos}`: 0 a 5. `{cuadros}`: `cuadros(resultados)`. `{racha}`: la **del reto** tras la partida. `{url}`: `urlDelJuego()`.
- No incluye tema, fichas, afirmaciones, aclaraciones, detalles, prompts ni el mensaje final, y no revela qué pruebas eran IA o FAKE: solo acierto o fallo por posición. Un fallo por ausencia es un `🟥` como cualquier otro. [2.1] La palabra "Fake" solo aparece en el nombre del reto.
- **Mensaje final del resultado** [D-134]: no se comparte, pero se elige con el mismo criterio de reto que la plantilla: `#resultado-mensaje` = `mensajeFinal(aciertos, mensajesDelReto(estado.reto, TEXTOS.final))`, es decir, `final.mensajes` en Images y `final.mensajes_afirmaciones` en Fact or Fake (3.1, 3.3). `ya-jugado` no muestra mensaje.

Ejemplos literales completos, en `https://identifaiit.com/`:

Images, caso 12, modo `perro`, `AAFAF`, racha 3:
```
identifAI-it Images #12
Mode: Bloodhound
3/5 🟩🟩🟥🟩🟥
Streak: 3
https://identifaiit.com/
```

Fact or Fake, caso 12, `FAAAA`, racha 5:
```
identifAI-it Fact or Fake #12
4/5 🟥🟩🟩🟩🟩
Streak: 5
https://identifaiit.com/
```

`compartir(texto, nav)`: sin cambios (share → portapapeles → `#compartir-manual`).
