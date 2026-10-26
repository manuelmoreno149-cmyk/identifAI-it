# identifAI-it: especificación técnica, versión 2.0 · 4 (segunda parte). Datos y herramientas de Headlines

Parte de la especificación 2.0 (índice en `docs/ESPECIFICACION.md`) [D-114]. Continúa la sección 4 de `4-datos.md`. Incluye los ajustes D-116 (un archivo por mes), D-117 (el modo prueba carga todos los meses) y D-118 (entradillas de las auténticas escritas por el usuario y texto de créditos, 4.13 y 4.14).

### 4.7 data/titulares/AAAA-MM.json (público; el juego normal carga solo el del mes, el modo prueba todos) · versión 1 [D-103, D-116, D-117]

**Por qué un archivo propio** y no un campo de `calendario.json`:
- cada reto tiene su importador, su número de días y su ritmo de preparación: con un archivo común, los dos importadores escribirían el mismo fichero y un día podría tener un reto y no el otro;
- `validarCalendario` y el calendario de imágenes no cambian por Headlines (solo pierden `fecha`, D-96);
- el coste es una petición más al arrancar (mismo origen).

**Por qué un archivo por mes** [D-116]: cada día de Headlines pesa unos 10,4 KB (4.7.3). En un solo archivo, cada visita descargaría todas las noticias publicadas y futuras (unos 3,7 MB al año, sin límite). Por meses, cada visita del juego normal descarga como mucho un mes (unos 320 KB), y el peso no crece con el tiempo. Además, el archivo de un mes no contiene las noticias de los meses siguientes. El modo prueba, que es temporal, descarga todos los meses publicados (4.7.2) [D-117].

La fecha de lanzamiento **no** se repite aquí: es la de `data/calendario.json` [D-95]. El día `n` de Headlines se juega en `fechaDelDia(lanzamiento, n)`, igual que el día `n` de Images.

**Nombre**: `data/titulares/{mes}.json`, con `mes` = `AAAA-MM` (`MES_PATRON`, `/^\d{4}-(0[1-9]|1[0-2])$/`). La carpeta solo contiene archivos con ese nombre. No existe `data/titulares.json` ni ningún índice de meses [D-117].

```json
{
  "version": 1,
  "mes": "2000-02",
  "dias": [
    {
      "n": 32,
      "tema": "Space",
      "clave": "Q7m1Xa0=",
      "textos": ["(684 caracteres base64)", "(684)", "(684)", "(684)", "(684)"],
      "fichas": ["(1368 caracteres base64)", "(1368)", "(1368)", "(1368)", "(1368)"]
    },
    {
      "n": 33,
      "tema": "Food",
      "clave": "b2Lx9Qc=",
      "textos": ["(684)", "(684)", "(684)", "(684)", "(684)"],
      "fichas": ["(1368)", "(1368)", "(1368)", "(1368)", "(1368)"]
    }
  ]
}
```
(Ejemplo sin lanzamiento: el día 32 es el 2000-02-01 ficticio.)

Reglas (`validarTitulares(obj, mes)` la estructura de un archivo; `unirMeses` y `validar.mjs` el conjunto, 4.11 y 4.12):
- `version` vale 1; `mes` es igual al nombre del archivo; `dias` tiene **al menos un** día, ordenado por `n` y consecutivo dentro del archivo; ningún otro campo, ni en el objeto ni en los días.
- `n`: el número de caso **global** (común con Images, D-99). No se renumera por mes.
- `tema`: como en Images (`temaDeCarpeta`, `temaValido`, sin palabras prohibidas) [D-53].
- `clave`: 8 caracteres base64 (`ofuscar`, 4.3), con entre 1 y 4 generadas.
- `textos[i]`: titular y entradilla de la prueba `i`, **ofuscados** en un bloque de 512 bytes (684 caracteres, `/^[A-Za-z0-9+/]{683}=$/`).
- `fichas[i]`: tipo + fuente (URL) o prompt, ofuscados en un bloque de 1024 bytes (1368 caracteres, `/^[A-Za-z0-9+/]{1366}==$/`).
- **Conjunto**: todos los archivos juntos forman los días 1..N sin huecos ni repetidos; cada día está en el archivo de su mes (`mesDeNumero(lanzamiento, n)`, 4.7.1) y cada archivo tiene todos los días de su mes que existan, así que los meses son consecutivos y ningún archivo está vacío. El modo prueba se apoya en esta regla para descubrir los meses sin listado de directorio (4.7.2) [D-117].
- Sin noticias, la carpeta no tiene archivos (o no existe): no hay un archivo "vacío" que publicar. El juego trata un mes sin archivo como mes sin casos (y el modo prueba, como el final de los meses).

**Qué va en claro y qué no**: en claro solo `mes`, `n` y `tema`. El titular y la entradilla también van ofuscados, aunque se muestren antes de responder, porque:
- en claro, cualquiera podría leer de un vistazo todas las noticias **futuras** del mes y buscarlas en internet antes de jugar (con las imágenes ya pasa, D-22, pero buscar un texto es mucho más fácil);
- el bloque fijo de 512 bytes hace que la longitud de cada texto en el JSON sea siempre la misma: el archivo no da más pistas que la pantalla;
- su coste es casi nulo (las mismas funciones que las fichas).
Es un freno casual, igual que D-22 y D-86: el algoritmo es público, y los archivos de meses futuros también se pueden pedir a mano.

#### 4.7.1 Mes de un día y días que cruzan de mes [D-116]

- **Regla única**: `mesDeNumero(lanzamiento, n) = mesDeFecha(fechaDelDia(lanzamiento ?? FECHA_BASE_PRUEBA, n))`. La usan el juego (modo prueba), el importador, `npm run lanzamiento` y `validar`.
- **Sin lanzamiento** (`null`): el mes se calcula con las fechas ficticias del modo prueba (`FECHA_BASE_PRUEBA = '2000-01-01'` es el día 1). Días 1–31 → `2000-01.json`; 32–60 → `2000-02.json` (2000 es bisiesto); 61–91 → `2000-03.json`; etc. Esos nombres nunca coinciden con un mes real del juego normal, que además muestra `sin-casos` sin lanzamiento.
- **Con lanzamiento**: el mes real. Con `2026-12-15`: días 1–17 → `2026-12.json`; 18–48 → `2027-01.json`; 49–76 → `2027-02.json`; etc.
- **Enlace entre meses**: el primer `n` de un archivo es el último `n` del archivo del mes anterior + 1. No hay solapes ni huecos, y "Case #n" es el mismo número en Images y en Headlines aunque el archivo cambie.
- **Al cambiar el lanzamiento** (solo antes de que llegue), `npm run lanzamiento` vuelve a repartir los días entre archivos sin tocar su contenido (4.2.1). Si alguien cambiara `lanzamiento` a mano sin repartir, `validar` lo detecta y el juego no muestra días de un archivo equivocado (`titularesDelDia` y `titularesDeNumero` exigen que el mes del archivo sea el del día, y `cargarTitularesPrueba` corta la cadena en el primer archivo que no enlaza).

#### 4.7.2 Carga en el juego [D-116, D-117]

- **Juego normal y previsualización: un solo archivo**. `cargarTitulares(fecha)` pide `data/titulares/{mesDeFecha(fecha)}.json`, y la `fecha` es siempre la **fecha efectiva** (glosario):
  - juego normal: la fecha local de hoy (en paralelo con el calendario);
  - previsualización (`?fecha=`): la de la URL.
- **Respuestas** (de cada archivo pedido, en los dos casos): 2xx con JSON válido y `validarTitulares(obj, mes)` → ese mes. **404** → mes sin archivo: en el juego normal, `titularesVacios(mes)`, Headlines sin caso ese día (no es error; el jugador ve "No case today" en su ficha o `sin-casos` si Images tampoco tiene); en el modo prueba, el final de los meses. Error de red, otro estado, JSON inválido o estructura o `mes` incorrectos → `ERROR_CALENDARIO` (pantalla `error`, con Reintentar).
- **Modo prueba: todos los meses** [D-117]. Primero se carga el calendario (hace falta `lanzamiento`) y después `cargarTitularesPrueba(lanzamiento)` descubre y carga, **en serie**, todos los archivos existentes:
  ```
  meses = []; siguiente = 1
  repetir:
    mes = mesDeNumero(lanzamiento, siguiente)          // null → rechaza sin pedir nada
    respuesta = pedir(rutaTitulares(mes), {cache: 'no-cache'})
    404                                     → fin
    otro no 2xx, red, JSON, !validarTitulares(obj, mes) → rechaza (ERROR_CALENDARIO)
    obj.dias[0].n !== siguiente, o algún día con mesDeNumero(lanzamiento, d.n) !== mes
                                            → fin, sin añadir obj (la cadena no enlaza)
    meses.push(obj); siguiente = último n de obj + 1
    si mesDeNumero(lanzamiento, siguiente) === mes → fin   // el archivo no llega a fin de mes: es el último
  devuelve meses                                         // ordenados por mes; [] si no hay ninguno
  ```
  - **Por qué un sondeo y no un índice**: el navegador no puede listar `data/titulares/`. Un índice publicado (`data/titulares/indice.json` con la lista de meses) sería una segunda fuente de verdad que el importador (también con `--reimportar`) y `npm run lanzamiento` tendrían que reescribir y `validar` comprobar; un índice desfasado (por ejemplo, un commit sin él) dejaría el modo prueba incoherente, y además rompería la regla de que la carpeta solo contiene `AAAA-MM.json`. El sondeo usa la regla del conjunto (4.7), que ya garantizan las herramientas y comprueba `validar`, así que no añade archivos ni cambia ninguna herramienta.
  - **Peticiones**: una por archivo existente, más como mucho un 404 (solo si el último mes está completo; si es parcial, el bucle se detiene sin pedir más). Sin archivos, una sola petición (404) y Headlines sin días. Nunca se pide dos veces el mismo archivo. Ese 404 aparece en la consola del navegador y es normal.
  - **Selector de día**: `diasDePrueba(calendario, meses)` une los días del calendario de imágenes con los de **todos** los meses cargados, así que cada `option` muestra los dos temas del día (o el del único reto que lo tenga), y un día que solo exista en Headlines también aparece.
  - **Día elegido**: `dia = diaDePrueba(location.search, dias, nHoy)` (`nHoy` es `null` sin lanzamiento); los titulares de ese día son `titularesDeNumero(titularesDelMes(meses, mesDeNumero(lanzamiento, dia.n)), lanzamiento, dia.n)`. Si `?dia=` no existe y `diaDePrueba` cae en otro día, ese día ya está cargado: no hay ninguna petición más.
  - **Open this day** sigue recargando la página con `?prueba=1&dia=n&reto=r` (sin estado en memoria entre cargas): la recarga vuelve a pedir el calendario y todos los meses.
- **Medianoche y cambio de mes**: `MEDIANOCHE` lleva a `iniciando`, que siempre vuelve a cargar el calendario y el archivo del mes de la nueva fecha: el día 1 de cada mes se pide el archivo nuevo. Una partida en curso a medianoche se termina con los datos ya cargados (la partida es de su `fecha`). En `ya-jugado`, la cuenta atrás lleva igual a la portada del día siguiente. En el modo prueba y en la previsualización la fecha efectiva es fija y `MEDIANOCHE` no llega (D-68).
- **Caché**: no hay service worker ni caché propia. `cargarTitulares` y `cargarTitularesPrueba` usan `{cache: 'no-cache'}` como `cargarCalendario` (revalida con el servidor; GitHub Pages responde 304 si no ha cambiado). Publicar un mes nuevo no exige invalidar nada.

#### 4.7.3 Tamaño [D-116, D-117]

- Por día: (684 + 1368) × 5 = 10 260 caracteres de bloques, unos **10,4 KB** con las claves y la sangría de `JSON.stringify(obj, null, 2)`.
- Por archivo mensual: 28 a 31 días → unos **290 a 325 KB** (unos 230 a 250 KB transferidos con la compresión de GitHub Pages, porque el base64 de datos aleatorios solo se comprime hasta un 75 % aproximadamente). Es lo máximo que descarga una visita del juego normal, en lugar de los 3,7 MB al año (y creciendo) de un archivo único.
- En el modo prueba, cada carga descarga la suma de los meses publicados (unos 320 KB por mes, en serie) [D-117]. Es aceptable porque el modo prueba es temporal y lo usan pocas personas (riesgos R7 y R14).
- El primer y el último mes de datos pueden ser parciales (más ligeros).
- El calendario de imágenes no cambia: unos 3,5 KB por día en un solo archivo (1,25 MB al año; riesgo R7).

### 4.8 Ofuscación de textos y fichas de Headlines [D-103]

**Bloques genéricos** (`js/diario.js`), que también usan las fichas de Images:

```
flujoBytes(semilla, largo):
  azar = mulberry32(fnv1a32(semilla))          // las mismas funciones de 4.3.1
  flujo[k] = floor(azar() * 256)    para k = 0..largo-1

ofuscarBloque(bytes, semilla, largoBloque, aleatorio):
  L = bytes.length;  si L > largoBloque - 2 → RangeError
  bloque[0] = L >> 8;  bloque[1] = L & 0xFF
  bloque[2 .. 2+L-1] = bytes
  bloque[2+L .. largoBloque-1] = floor(aleatorio() * 256)
  devuelve btoa(bloque XOR flujoBytes(semilla, largoBloque))

desofuscarBloque(cadena, semilla, largoBloque):          // nunca lanza
  formato base64 exacto de 4*ceil(largoBloque/3) caracteres; si no → null
  bloque = atob(cadena) XOR flujo;  L = bloque[0] << 8 | bloque[1]
  si L > largoBloque - 2 → null;  devuelve bloque[2 .. 2+L-1]
```

**Semillas** (con un sufijo de dominio para que el titular, la ficha de la noticia y una ficha de imagen nunca compartan flujo):

| Uso | Semilla | Bloque | Salida |
|---|---|---|---|
| Ficha de Images (D-86, sin cambios) | `` `${clave}|${n}|${i}` `` | 512 | 684 caracteres |
| Titular + entradilla | `` `${clave}|${n}|${i}|texto` `` | 512 | 684 caracteres |
| Ficha de Headlines | `` `${clave}|${n}|${i}|noticia` `` | 1024 | 1368 caracteres |

Las semillas usan el `n` global, no la posición en el archivo ni el mes: repartir los días en otros archivos no cambia ningún bloque [D-116].

**Texto** (`ofuscarTexto` / `desofuscarTexto`): contenido = UTF-8 de `titular + "\n" + entradilla` (el titular no puede contener `\n`), 510 bytes como máximo. Al descifrar se parte por el primer `\n`; si falta o alguna parte queda vacía, `null`.

**Ficha** (`ofuscarNoticia` / `desofuscarNoticia`): contenido = 1 byte de tipo (`0` = `fuente`, `1` = `prompt`) + UTF-8 del texto, que ocupa como máximo **1021 bytes** (`NOTICIA_MAX_BYTES`). Es un **bloque único** con el mismo tamaño para las auténticas (URL) y las generadas (prompt), así que ni su presencia ni su longitud delatan el tipo.
- **URL** (auténticas): nunca se recorta; si pasa de 1021 bytes, el importador da un error y pide acortarla (quitar parámetros de seguimiento o usar la URL canónica). Se guarda la forma normalizada `new URL(x).href`.
- **Prompt** (generadas): se normaliza con `normalizarFicha(texto, 1021)` y, si pasa, se recorta con `…` y aviso (como las fichas de Images).
- El tipo es redundante con la clave a propósito: `validar` comprueba la coherencia (auténtica ⇔ `fuente`) y main.js elige enlace o confesión sin depender de la clave.

**Vectores de regresión**: el agente-de-campo calcula al implementar `ofuscarTexto({titular: 'Test headline', entradilla: 'Test lede.'}, 'Mpb9Ycc=', 1, 0, () => 0)` y `ofuscarNoticia({tipo: 'fuente', texto: 'https://example.com/story'}, 'Mpb9Ycc=', 1, 0, () => 0)`, los fija en `tests/diario.test.mjs` y los copia en `docs/DECISIONES.md` como ajuste menor. Además, el vector de D-92 debe seguir pasando tras la refactorización.

### 4.9 Entrada: entrada/titulares/NN-tema/noticias.txt [D-106]

```
entrada/titulares/
  01-space/
    noticias.txt
  02-food/
    noticias.txt
```

- Carpeta de día: la misma regla que `entrada/temas/` (`^(\d{2,})-([\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*)$`, NFC, tema en inglés). `NN` = número de caso, común con Images (`01` es el Caso #1 de los dos retos). La entrada no se organiza por meses: el mes lo decide el importador.
- Dentro, **exactamente** `noticias.txt` (se ignoran los archivos que empiezan por `.`, `Thumbs.db` y `desktop.ini`; cualquier otro es un error).
- `entrada/` está en `.gitignore`: los textos en claro nunca se publican ni se suben. Solo se publica `data/titulares/`.

**Formato de `noticias.txt`** (UTF-8; se admite BOM y CRLF):

```
type: real
headline: City council approves four-day work week for municipal staff
lede: The pilot program will run for six months. Officials say services will not be affected.
source: https://www.example-news.com/local/four-day-week
---
type: ai
headline: Lighthouse keeper's cat named honorary harbor master
lede: The tabby has greeted every ferry for nine years, residents said.
prompt: Write a short, plausible local news headline and a one-sentence lede about a cat at a lighthouse. No real names.
```

- Bloques separados por una línea que, sin espacios en los extremos, es exactamente `---`. Las líneas en blanco se ignoran; los bloques vacíos (por ejemplo, un `---` final) también.
- Cada línea no vacía es `campo: valor`, con `campo` en minúsculas y uno de `type`, `headline`, `lede`, `source`, `prompt`. El valor va en **una sola línea** y se le quitan los espacios de los extremos; los espacios internos repetidos se reducen a uno.
- `type`: `real` o `ai`. Obligatorios: `type`, `headline`, `lede`; `source` obligatorio y solo en `real`; `prompt` obligatorio y solo en `ai`.
- Los prompts y las noticias se escriben en inglés (la interfaz es en-US, D-93); las auténticas, preferiblemente de medios en inglés.
- [D-118] En las auténticas, `headline` es el titular del medio, adaptado si hace falta (sin cambiar su sentido), y `lede` es un **resumen escrito por el usuario con sus palabras**, no la entradilla copiada del medio.

### 4.10 Flujo de importar-titulares.mjs (`npm run titulares`) [D-106, D-107, D-116]

Argumentos (`analizarArgumentosTitulares`): `--simular`, `--reimportar`, `--confirmar`, `--revisado`; cualquier otro es un error.

**Fase A** (no se escribe nada hasta que todo pasa; todos los errores juntos y código 1):
1. Leer `data/calendario.json` solo para `lanzamiento` (si no existe o no es válido, se trata como `null` con un aviso).
2. [D-116] Leer los archivos mensuales: `leerTitularesMensuales('data/titulares')` y `unirMeses(archivos, {lanzamiento, comprobarMes: true})`. Sin carpeta o sin archivos, no hay días. Cualquier error de la unión (nombre, estructura, huecos, repetidos, día en un mes que no le corresponde) detiene el importador: "Revisa data/titulares/ con npm run validar (o reparte los meses con npm run lanzamiento si cambiaste la fecha a mano)."
3. Leer `entrada/titulares/` (sin carpetas: "No hay titulares por importar en entrada/titulares." y código 0).
4. `planificarTitulares` (4.11): numeración consecutiva a partir del último día de la unión (sin `--reimportar`, las carpetas ya importadas se omiten), tema, contenido de cada carpeta y, con lanzamiento, que los días nuevos sean posteriores a hoy.
5. Leer cada `noticias.txt` como bytes y decodificarlo con `TextDecoder('utf-8', {fatal: true})` ("01-space/noticias.txt no es UTF-8 válido; guárdalo como UTF-8."), y `analizarNoticias` (4.11).
6. Duplicados: un titular igual (sin distinguir mayúsculas, tras normalizar espacios) a otro del mismo lote o de cualquier día ya publicado de **cualquier mes** (descifrando la unión) es un error, que nombra la carpeta y el número de bloque.
7. Avisos de longitud (`avisosLongitud`) y de mezcla (`avisosMezcla` sobre las generadas de todos los días de todos los meses).
8. `--simular`: plan por día (número, fecha o "sin fecha de lanzamiento", **archivo mensual de destino** —"día 32 → data/titulares/2000-02.json"—, tema, "5 noticias: 2 ai, 3 real", prompts recortados), la lista de archivos que se escribirían (y que no se tocan), avisos y la **lista de revisión** (4.13); código 0 sin escribir. No muestra ningún titular, entradilla, URL ni prompt.
9. Sin `--simular` y sin `--revisado`: muestra lo mismo que `--simular` y se detiene con código 1: "Revisa la lista de comprobación y vuelve a ejecutar con --revisado." [D-107]

**Fase B** (escritura):
10. Para cada día nuevo en orden de `n`: `barajar` con aleatorio criptográfico [D-55]; `clave = ofuscar(verdades, n, aleatorioCripto)`; `textos[i] = ofuscarTexto({titular, entradilla}, clave, n, i, aleatorioCripto)`; `fichas[i] = ofuscarNoticia({tipo: 'fuente', texto: url} | {tipo: 'prompt', texto: prompt}, clave, n, i, aleatorioCripto)`, con `aleatorioCripto = () => crypto.randomInt(2 ** 32) / 2 ** 32`.
11. [D-116] `todos = días existentes + días nuevos`; `archivos = repartirPorMes(todos, lanzamiento)`; se escriben **solo** los archivos de los meses que reciben algún día nuevo (el último mes existente, si se completa, y los meses nuevos). Los demás archivos **no se reescriben** (quedan idénticos byte a byte). Antes de escribir: `validarTitulares(a, a.mes)` de cada archivo que se escribe y `unirMeses` del conjunto resultante sin errores. Escritura con `escribirTitularesMensuales(dir, aEscribir, {borrarSobrantes: false})`: `JSON.stringify(obj, null, 2) + '\n'`, UTF-8 y LF; crea `data/titulares/` si no existe.
12. Si existe `banco.json`, regenerar `creditos.html` con `escribirCreditos`; si no, aviso: "Regenera creditos.html con npm run creditos donde tengas el banco."
13. Informe: días añadidos y omitidos, archivos escritos y archivos sin cambios, avisos, prompts recortados, la lista de revisión marcada como certificada, y el recordatorio de que los textos siguen en `entrada/titulares/`.

**`--reimportar`** (con `--confirmar` y `--revisado` para escribir): regenera desde cero orden, claves y bloques de **todos** los días a partir de sus carpetas (deben existir todas), reescribe todos los archivos mensuales y borra los de meses que se queden sin días (`borrarSobrantes: true`). Solo mientras ningún día haya llegado (sin lanzamiento, siempre). Sin `--confirmar`, muestra el plan. No toca imágenes ni el calendario.

El importador nunca mueve, borra ni modifica `entrada/`, nunca borra un archivo mensual fuera de `--reimportar`, y nunca escribe titulares, URL ni prompts en claro en disco ni en consola. No escribe ningún índice de meses: el modo prueba los descubre solo (4.7.2) [D-117].

**¿Hace falta un banco de noticias?** No [D-108]: todo lo que guardaría (tipo, fuente, prompt, tema) ya está en `data/titulares/`, descifrable por las herramientas; los duplicados se comprueban descifrando todos los meses, y los créditos salen de ellos. Si se pierde `entrada/titulares/`, el juego no pierde nada.

### 4.11 herramientas/titulares.mjs (archivero): funciones puras y de archivo

| Exportación | Parámetros → retorno | Descripción |
|---|---|---|
| `CAMPOS_NOTICIA` | constante | `['type', 'headline', 'lede', 'source', 'prompt']`. |
| `TITULAR_MAX`, `ENTRADILLA_MAX` | constantes | `110` y `280` (puntos de código) [D-105]. |
| `UMBRAL_LONGITUD` | constante | `0.25` [DP-48]. |
| `analizarNoticias(texto, ruta, {textoMaxBytes, fichaMaxBytes, urlValida})` | → `{noticias, errores, avisos}` | Lee el formato de 4.9. Cada noticia: `{tipo: 'autentica' \| 'generada', titular, entradilla, fuente, prompt, promptRecortado}`. Normaliza (BOM, saltos, NFC, espacios). **Errores** (con ruta y número de bloque): línea sin `campo:`; campo no previsto; campo repetido; falta un obligatorio; `type` distinto de `real`/`ai`; `source` en una `ai` o `prompt` en una `real`; `source` que no cumple `urlValida` (https, sin credenciales, 1021 bytes como máximo) tras normalizarla; titular o entradilla vacíos, con caracteres de control o con `{`/`}`; titular de más de 110 puntos de código o entradilla de más de 280; titular + `\n` + entradilla de más de `textoMaxBytes` bytes; prompt vacío; número de noticias distinto de 5; 0 o 5 de IA. **Avisos**: prompt recortado (con `normalizarFicha(prompt, fichaMaxBytes)`); entradilla con más de 2 frases (más de 2 signos `.`, `!` o `?` seguidos de espacio o fin). Nunca lanza. |
| `planificarTitulares({carpetas, ultimoDia, hoyISO, lanzamiento, reimportar})` | → `{nuevos, omitidos, errores, avisos}` | Como `planificar` de imágenes: nombre de carpeta, numeración consecutiva sin huecos ni repetidos, tema válido y sin palabras prohibidas, solo `noticias.txt` dentro, días posteriores a hoy si hay lanzamiento. Cada nuevo lleva además `mes: mesDeNumero(lanzamiento, n)` [D-116]. |
| `medias(noticias)` | → `{titular: {autentica, generada}, entradilla: {autentica, generada}}` | Medias de longitud en puntos de código. |
| `avisosLongitud(dias)` | `[{n, noticias}]` → `string[]` | Para titulares y para entradillas, por día y en el conjunto: si `(mayor − menor) / menor > UMBRAL_LONGITUD`, aviso "AVISO: día 3: los titulares de IA miden de media un 40 % más que los reales (52 frente a 37 caracteres)." y "AVISO: en todo Headlines, …". Son mensajes locales (no se publican). |
| `analizarArgumentosTitulares(argv)` | → `{simular, reimportar, confirmar, revisado, errores}` | |
| `LISTA_REVISION` | constante | Las líneas de 4.13. |
| [D-116] `ARCHIVO_MES` | constante | `/^(\d{4}-(?:0[1-9]\|1[0-2]))\.json$/`. |
| [D-116] `unirMeses(archivos, {lanzamiento, comprobarMes = true})` | `[{nombre, contenido}]` → `{dias, errores}` | Pura, nunca lanza. `contenido` es el objeto leído o `null` si no era JSON. Errores (mensajes que solo nombran archivo y día): nombre que no cumple `ARCHIVO_MES` ("data/titulares/{nombre}: el nombre debe ser AAAA-MM.json."); `contenido` `null` ("…no es JSON válido."); `!validarTitulares(contenido, mesDelNombre)` ("…no tiene la estructura de la versión 1 o su mes no coincide con el nombre."); días que no forman 1..N sin huecos; un mismo `n` en dos archivos (con `comprobarMes: false` se acepta una vez si el contenido es idéntico, por `JSON.stringify`, y es error si difiere); con `comprobarMes`, un día cuyo `mesDeNumero(lanzamiento, n)` no es el de su archivo ("El día {n} de Headlines está en {nombre} y le corresponde {mes}."). `dias` es la unión ordenada por `n` (vacía si hay errores o no hay archivos). |
| [D-116] `repartirPorMes(dias, lanzamiento)` | → `[{version: 1, mes, dias}]` | Pura. Agrupa `dias` (ordenados por `n`) por `mesDeNumero(lanzamiento, n)`; devuelve los archivos ordenados por `mes`, sin archivos vacíos. No muta. `repartirPorMes(unirMeses(x).dias, l)` aplicado a un conjunto ya repartido con `l` devuelve los mismos objetos. |
| [D-116] `leerTitularesMensuales(dir)` | efecto (lectura) → `[{nombre, contenido}]` | Lista **todas** las entradas de `dir` (también subcarpetas y archivos ocultos, para que `unirMeses` los dé como error); parsea cada `.json` y pone `contenido: null` si falla. Carpeta inexistente → `[]`. Nunca escribe. |
| [D-116] `escribirTitularesMensuales(dir, archivos, {borrarSobrantes})` | efecto → `{escritos, sinCambios, borrados}` | Crea `dir` si no existe; escribe cada archivo como `JSON.stringify(obj, null, 2) + '\n'` solo si su contenido cambia; con `borrarSobrantes`, borra los archivos de `dir` que cumplen `ARCHIVO_MES` y no están en `archivos` (nunca otros). Solo la llaman `lanzamiento.mjs` (siempre con `borrarSobrantes: true`) e `importar-titulares.mjs` (`true` solo con `--reimportar`). |

### 4.12 validar.mjs para Headlines (sin banco) [D-108, D-116]

Errores:
- Existe `data/titulares.json` ("data/titulares.json ya no se usa: los titulares van en data/titulares/AAAA-MM.json.").
- Cualquier error de `unirMeses(leerTitularesMensuales('data/titulares'), {lanzamiento, comprobarMes: true})`: nombre que no es `AAAA-MM.json` (o subcarpeta u otro archivo en la carpeta), JSON inválido, estructura de la versión 1 o `mes` que no coincide con el nombre, `n` que no empieza en 1 o tiene huecos, un `n` repetido en dos archivos, un día en un archivo que no es el de su mes, y archivo sin días. Son justo las condiciones que harían que el sondeo del modo prueba (4.7.2) se detuviera antes de tiempo [D-117].
- Temas con palabras prohibidas.
- Clave con 0 o 5 generadas.
- Un texto que no se descifra ("El texto {i+1} del día {n} de Headlines no se puede descifrar."), o cuyo titular o entradilla supera `TITULAR_MAX` o `ENTRADILLA_MAX`.
- Una ficha que no se descifra, o **incoherente con la clave** (auténtica sin tipo `fuente`, o generada sin tipo `prompt`); el mensaje solo nombra el día: "El día {n} de Headlines tiene fichas que no cuadran con su clave."
- Una fuente que no cumple `urlFuenteValida` ("El día {n} de Headlines tiene una fuente que no es https válida.").
- `creditos.html`: `ul#creditos-medios` no lista exactamente `mediosDeTitulares(unión de todos los meses)` (o falta la sección).
- Titulares repetidos entre días (de cualquier mes).
- Ningún archivo de `entrada/` rastreado (ya existía) y ningún `.txt` rastreado fuera de `fonts/` (ya existía; cubre `noticias.txt`).

Sin carpeta `data/titulares/` o sin archivos: no es error (Headlines sin días; se aplica el aviso de calendario corto).

Avisos: longitudes (`avisosLongitud`), mezcla (`avisosMezcla`), calendario corto y distinto número de días que Images (4.4.3). Ningún mensaje de `validar` muestra titulares, URL ni prompts.

### 4.13 Norma de contenido de Headlines [D-107]

Texto exacto de la norma (para `CLAUDE.md` y `.claude/agents/archivero.md`):

> **Norma de contenido de Headlines.** Las noticias generadas por IA son ficción: no pueden nombrar personas, empresas ni instituciones reales. El importador no puede comprobarlo; antes de cada importación, una persona revisa cada noticia de IA con la lista de comprobación y lo certifica con `--revisado`.

Lista de revisión (`LISTA_REVISION`, que el importador muestra en `--simular`, sin `--revisado` y en el informe final):
1. Ninguna noticia de IA nombra a una persona real (tampoco por su cargo único: "the current Pope").
2. Ninguna noticia de IA nombra una empresa, marca, producto, medio u organización real.
3. Ninguna noticia de IA nombra una institución real (gobiernos, ministerios, partidos, universidades, hospitales, equipos, cuerpos de policía).
4. Los prompts tampoco contienen nombres reales.
5. [D-118] Las noticias auténticas tienen su URL `https` original, el titular adaptado del medio sin cambiar su sentido y una entradilla resumida con palabras propias (no copiada) que no cambia el sentido de la noticia.
6. Ninguna noticia (auténtica o de IA) revela el medio ni la fecha en el texto.

(DP-49, resuelta con la opción recomendada: la norma se amplía y es obligatoria. Las noticias de IA tampoco atribuyen sucesos graves inventados —muertes, catástrofes, delitos, salud pública— a lugares reales; entra en la lista de comprobación de `--revisado`.)

### 4.14 Créditos de Headlines [D-111, D-118]

- Las noticias auténticas **se enlazan** a su fuente tras responder; además, `creditos.html` lista los dominios agregados de todos los meses (4.5, 2.7), con `creditos.noticias_intro` (exacto [D-118]: "Headlines adapted from the original publishers; summaries written for this game. Links go to the original stories.") y `creditos.ficcion` ("Stories marked AI are fiction written for this game.").
- La lista no relaciona ningún dominio con un titular, un día, un mes ni una posición.
- Citar titulares de terceros (DP-43, resuelta con la opción por defecto y su recomendación; ajustada por D-118): solo el titular, adaptado sin cambiar su sentido, y una entradilla breve **escrita por el usuario con sus palabras** (no se reproduce la del medio); enlace siempre a la fuente, retirar cualquier noticia si un medio lo pide y, si hay dudas, consultarlo antes del lanzamiento.
