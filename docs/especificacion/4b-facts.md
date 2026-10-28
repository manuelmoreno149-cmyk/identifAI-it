# identifAI-it: especificación técnica, versión 2.1 · 4 (segunda parte). Datos y herramientas de Fact or Fake

Parte de la especificación 2.1 (índice en `docs/ESPECIFICACION.md`) [D-120]. Continúa la sección 4 de `4-datos.md`. Sustituye a `4b-titulares.md` de la 2.0 (Headlines), que desaparece [D-130]. Se conservan de la 2.0, con otros nombres, el reparto por meses (D-116), el sondeo del modo prueba (D-117) y los bloques genéricos de ofuscación (D-103). Desde D-131, Fact or Fake **no tiene fuentes ni banco privado**: no existe el campo `source` ni `herramientas/banco-afirmaciones.json`.

### 4.7 data/facts/AAAA-MM.json (público; el juego normal carga solo el del mes, el modo prueba todos) · versión 1 [D-124]

**Por qué un archivo propio** y no un campo de `calendario.json`: cada reto tiene su importador y su ritmo (un día puede tener ya imágenes y aún no afirmaciones, o al revés); `validarCalendario` y el calendario de imágenes no cambian; el coste es una petición más al arrancar (mismo origen).

**Por qué un archivo por mes** [D-116, sin cambios]: el peso de cada visita del juego normal no crece con el tiempo y el archivo de un mes no contiene los días de los meses siguientes. El modo prueba, que es temporal, descarga todos los meses (4.7.2) [D-117].

La fecha de lanzamiento **no** se repite aquí: es la de `data/calendario.json` [D-95]. El día `n` de Fact or Fake se juega en `fechaDelDia(lanzamiento, n)`, igual que el día `n` de Images, y tiene **el mismo tema** (la misma carpeta de `entrada/temas/`) [D-123].

**Nombre**: `data/facts/{mes}.json`, con `mes` = `AAAA-MM` (`MES_PATRON`). La carpeta solo contiene archivos con ese nombre. No hay índice de meses [D-117]. ("facts" no es una palabra prohibida; "fake" sí, y no aparece en ninguna ruta.)

```json
{
  "version": 1,
  "mes": "2000-01",
  "dias": [
    {
      "n": 1,
      "tema": "Fireworks",
      "clave": "Q7m1Xa0=",
      "textos": ["(684 caracteres base64)", "(684)", "(684)", "(684)", "(684)"],
      "fichas": ["(684 caracteres base64)", "(684)", "(684)", "(684)", "(684)"]
    },
    {
      "n": 2,
      "tema": "Dogs",
      "clave": "b2Lx9Qc=",
      "textos": ["(684)", "(684)", "(684)", "(684)", "(684)"],
      "fichas": ["(684)", "(684)", "(684)", "(684)", "(684)"]
    }
  ]
}
```
(Ejemplo sin lanzamiento: los días 1 a 31 van en `2000-01.json`.)

Reglas (`validarAfirmaciones(obj, mes)` la estructura de un archivo; `unirMeses` y `validar.mjs` el conjunto, 4.11 y 4.12):
- `version` vale 1; `mes` es igual al nombre del archivo; `dias` tiene **al menos un** día, ordenado por `n` y consecutivo dentro del archivo; ningún otro campo, ni en el objeto ni en los días.
- `n`: el número de caso **global** (común con Images, D-99). No se renumera por mes.
- `tema`: el de la carpeta del día (`temaDeCarpeta`, `temaValido`, sin palabras prohibidas) [D-53]. Si Images tiene el mismo `n`, el tema es idéntico (lo comprueban el importador y `validar`) [D-123].
- `clave`: 8 caracteres base64 (`ofuscar`, 4.3), con entre 1 y 4 falsas (`generada`).
- `textos[i]`: la **afirmación** de la prueba `i`, ofuscada en un bloque de 512 bytes (684 caracteres, `/^[A-Za-z0-9+/]{683}=$/`).
- `fichas[i]`: la **aclaración** (`truth`) y sus **detalles**, ofuscados en un bloque de 512 bytes (684 caracteres, mismo patrón).
- **Conjunto**: todos los archivos juntos forman los días 1..N sin huecos ni repetidos; cada día está en el archivo de su mes (`mesDeNumero(lanzamiento, n)`) y cada archivo tiene todos los días de su mes que existan, así que los meses son consecutivos y ningún archivo está vacío. El modo prueba se apoya en esta regla (4.7.2) [D-117].
- Sin afirmaciones, la carpeta no tiene archivos (o no existe). El juego trata un mes sin archivo como mes sin casos (y el modo prueba, como el final de los meses).

**Qué va en claro y qué no**: en claro solo `mes`, `n` y `tema`. La afirmación también va ofuscada, aunque se muestre antes de responder, para que no se puedan leer de un vistazo (ni buscar) las afirmaciones futuras del mes y para que su longitud en el JSON no dé pistas. Es un freno casual (D-22): el algoritmo es público.

#### 4.7.1 Mes de un día y días que cruzan de mes [D-116]

Sin cambios respecto a la 2.0, con la carpeta `data/facts/`:
- **Regla única**: `mesDeNumero(lanzamiento, n) = mesDeFecha(fechaDelDia(lanzamiento ?? FECHA_BASE_PRUEBA, n))`.
- **Sin lanzamiento**: días 1–31 → `2000-01.json`; 32–60 → `2000-02.json`; 61–91 → `2000-03.json`; etc.
- **Con lanzamiento** `2026-12-15`: días 1–17 → `2026-12.json`; 18–48 → `2027-01.json`; 49–76 → `2027-02.json`.
- **Enlace entre meses**: el primer `n` de un archivo es el último del mes anterior + 1.
- **Al cambiar el lanzamiento**, `npm run lanzamiento` vuelve a repartir los días entre archivos sin tocar su contenido (4.2.1). Si alguien cambiara `lanzamiento` a mano, `validar` lo detecta y el juego no muestra días de un archivo equivocado.

#### 4.7.2 Carga en el juego [D-116, D-117]

Igual que en la 2.0, con estos nombres:
- **Juego normal y previsualización: un solo archivo**. `cargarAfirmaciones(fecha)` pide `data/facts/{mesDeFecha(fecha)}.json` con `{cache: 'no-cache'}`, con `fecha` = la fecha efectiva.
- **Respuestas**: 2xx con JSON válido y `validarAfirmaciones(obj, mes)` → ese mes. **404** → mes sin archivo: `afirmacionesVacias(mes)` (Fact or Fake sin caso ese día; no es error). Red, otro estado, JSON inválido, estructura o `mes` incorrectos → `ERROR_CALENDARIO`.
- **Modo prueba: todos los meses**. Primero el calendario y después `cargarAfirmacionesPrueba(lanzamiento)`, el sondeo encadenado en serie de la 2.0:
  ```
  meses = []; siguiente = 1
  repetir:
    mes = mesDeNumero(lanzamiento, siguiente)          // null → rechaza sin pedir nada
    respuesta = pedir(rutaAfirmaciones(mes), {cache: 'no-cache'})
    404                                     → fin
    otro no 2xx, red, JSON, !validarAfirmaciones(obj, mes) → rechaza (ERROR_CALENDARIO)
    obj.dias[0].n !== siguiente, o algún día con mesDeNumero(lanzamiento, d.n) !== mes
                                            → fin, sin añadir obj
    meses.push(obj); siguiente = último n de obj + 1
    si mesDeNumero(lanzamiento, siguiente) === mes → fin
  devuelve meses
  ```
  - Selector de día: `diasDePrueba(calendario, meses)`; día elegido: `diaDePrueba(location.search, dias, nHoy)`; afirmaciones del día: `afirmacionesDeNumero(afirmacionesDelMes(meses, mesDeNumero(lanzamiento, dia.n)), lanzamiento, dia.n)`.
  - Open this day recarga con `?prueba=1&dia=n&reto=r`.
- **Medianoche y cambio de mes**: `MEDIANOCHE` recarga el calendario y el archivo del mes de la nueva fecha. Una partida en curso a medianoche se termina con los datos ya cargados.
- **Caché**: sin service worker; `{cache: 'no-cache'}`.

#### 4.7.3 Tamaño

- Por día: 684 × 10 = 6 840 caracteres de bloques, unos **7,1 KB** con las claves y la sangría.
- Por archivo mensual: 28 a 31 días → unos **200 a 220 KB** (unos 160 a 170 KB transferidos con compresión). Es lo máximo que descarga una visita del juego normal.
- Modo prueba: la suma de los meses publicados (unos 220 KB por mes, en serie); aceptable porque es temporal (riesgos R7 y R14).

### 4.8 Ofuscación de afirmaciones y aclaraciones [D-124]

Se usan los **bloques genéricos** de la 2.0 (`flujoBytes`, `ofuscarBloque`, `desofuscarBloque`, en `js/diario.js`), sin cambios:

```
flujoBytes(semilla, largo):
  azar = mulberry32(fnv1a32(semilla))
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

**Semillas** (sufijo de dominio para que afirmación, aclaración y ficha de imagen nunca compartan flujo):

| Uso | Semilla | Bloque | Salida |
|---|---|---|---|
| Ficha de Images (D-86, sin cambios) | `` `${clave}|${n}|${i}` `` | 512 | 684 caracteres |
| Afirmación | `` `${clave}|${n}|${i}|afirmacion` `` | 512 | 684 caracteres |
| Aclaración + detalles | `` `${clave}|${n}|${i}|aclaracion` `` | 512 | 684 caracteres |

Las semillas usan el `n` global: repartir los días en otros archivos no cambia ningún bloque.

**Afirmación** (`ofuscarAfirmacion` / `desofuscarAfirmacion`): contenido = UTF-8 de la afirmación, sin `\n`, de 510 bytes como máximo (`AFIRMACION_MAX_BYTES`). Al descifrar, `null` si está vacía, contiene `\n` o no es UTF-8 válido.

**Aclaración** (`ofuscarAclaracion` / `desofuscarAclaracion`): contenido = UTF-8 de `[aclaracion, ...detalles].join('\n')`, de 510 bytes como máximo (`ACLARACION_MAX_BYTES`), con 0 a 3 detalles (`DETALLES_MAX`). Al descifrar se parte por `\n`: la primera parte es la aclaración y las demás, los detalles; `null` si alguna parte está vacía, si hay más de 4 partes o si no es UTF-8 válido. El bloque es igual de largo con 0 que con 3 detalles, para una verdadera que para una falsa: ni su longitud ni su presencia delatan la respuesta.

**Límites de contenido** (en puntos de código; los aplica el importador, 4.11, y `validar`, 4.12): afirmación de 1 a **140**; aclaración de 1 a **160**; cada detalle de 1 a **80**; como mucho 3 detalles. Con ellos, el contenido en inglés cabe de sobra en 510 bytes y las dos fases caben en pantalla sin deslizar (R14–R18). Si algún texto con muchos caracteres no ASCII pasara de 510 bytes, el importador da un error (nunca recorta).

**Vectores de regresión**: el agente-de-campo calcula al implementar `ofuscarAfirmacion('Test claim.', 'Mpb9Ycc=', 1, 0, () => 0)` y `ofuscarAclaracion({aclaracion: 'Test truth.', detalles: ['One.', 'Two.']}, 'Mpb9Ycc=', 1, 0, () => 0)`, los fija en `tests/diario.test.mjs` y los copia en `docs/DECISIONES.md` como ajuste menor (sustituyen a los de D-119). El vector de D-92 sigue valiendo.

### 4.9 Entrada: entrada/temas/NN-tema/facts.txt [D-123, D-131]

Un solo tema por día, común a los dos retos: las afirmaciones van en la **misma carpeta** que las imágenes del día.

```
entrada/temas/
  01-fireworks/
    ia/                  ← Images (sin cambios)
    real/                ← Images (sin cambios)
    datos.txt            ← notas de trabajo del usuario, texto libre (ninguna herramienta lo lee) [D-139]
    datos.original.txt   ← copia original de esas notas (ninguna herramienta lo lee) [D-139]
    facts.en.txt         ← Fact or Fake (o facts.txt)
  02-dogs/
    ia/
    real/
    facts.en.txt
```

- Archivo: si existe `facts.en.txt` se usa ese; si no, `facts.txt`. Si no existe ninguno, ese día no tiene Fact or Fake todavía (4.10). El contenido que se usa siempre está en **inglés** (la interfaz es en-US, D-93); `facts.txt` puede ser la versión en español de trabajo si existe el `.en.txt`.
- **`datos.txt` y `datos.original.txt`** [D-139, antes DP-61]: el usuario puede dejar en la raíz de la carpeta uno o los dos, en texto libre, con el material del día. El archivero convierte a mano `datos.txt` en `facts.en.txt` con el formato de abajo (tarea 88) y nunca modifica ni borra ninguno de los dos. **Ninguna herramienta los lee ni los publica** (ni siquiera comprueba su codificación): `planificar` (Images, 4.4.1) y `planificarAfirmaciones` (4.11) los admiten en la raíz de la carpeta y los ignoran, igual que `importar.mjs` (4.4.2), `importar-afirmaciones.mjs` (4.10) y `validar` (4.12). Solo esos dos nombres exactos (en minúsculas) se admiten; cualquier otro archivo suelto sigue la regla de cada importador.
- `entrada/` está en `.gitignore`: nada de esto se publica ni se sube.
- Cada importador solo mira su parte: `importar.mjs` ignora `facts.txt`, `facts.en.txt`, `datos.txt` y `datos.original.txt`, y `importar-afirmaciones.mjs` ignora `ia/`, `real/`, `datos.txt`, `datos.original.txt` y cualquier otro archivo (4.4.1 y 4.10).

**Formato** (UTF-8; se admite BOM y CRLF):

```
answer: fact
claim: The first fireworks were made by packing gunpowder into bamboo stalks.
truth: Early firecrackers were bamboo tubes filled with black powder.
details: Before that, plain bamboo was thrown on fires so it would pop.
details: The bang was meant to scare off evil spirits.
---
answer: fake
claim: Fireworks get their colors from the dye in their paper wrapping.
truth: The colors come from metal salts in the stars, not from the paper.
details: Strontium gives red, barium green and copper blue.
details: A large shell can climb about 300 m (1,000 ft) before it bursts.
```

- Bloques separados por una línea que, sin espacios en los extremos, es exactamente `---`. Las líneas en blanco se ignoran; los bloques vacíos también.
- Cada línea no vacía es `campo: valor`, con `campo` en minúsculas y uno de `answer`, `claim`, `truth`, `details`. El valor va en **una sola línea**, sin espacios en los extremos y con los espacios internos repetidos reducidos a uno. Cualquier otro campo (también un `source:` que quedara de la versión anterior) es un error de campo no previsto [D-131].
- `answer`: `fact` o `fake` (obligatorio). En `entrada/` se admite la palabra "fake" porque no se publica.
- `claim` (obligatorio): la afirmación, **una frase en una sola línea `claim:`**, de 1 a 140 caracteres.
- `truth` (obligatorio): **una frase en una sola línea `truth:`** con la verdad, de 1 a 160 caracteres. En una `fact` confirma o matiza la afirmación; en una `fake`, la corrige. Debe entenderse sola, sin citar fuentes (punto 6 de la lista de 4.13) [D-137].
- `details` (opcional): de 0 a 3 puntos breves, **una línea `details:` por punto** (es el único campo que se puede repetir), de 1 a 80 caracteres cada uno [D-132].
- Exactamente **5** bloques por día, con **1 a 4** `fake`.
- No hay campo de fuente: el usuario comprueba la veracidad él mismo antes de certificar con `--revisado` [D-131].

**Convenciones de contenido** (no las comprueba el importador; las aplica quien escribe `facts.en.txt` y se revisan con la lista de 4.13):
- **Unidades** [D-135]: en `claim`, `truth` y `details`, siempre **sistema métrico con el equivalente imperial entre paréntesis**, redondeado con sensatez y con números en formato en-US: "about 330 m (1,080 ft)", "40 km/h (25 mph)", "2 kg (4.4 lb)", "100 °C (212 °F)", "5 L (1.3 gal)". El paréntesis cuenta para los límites de longitud. Si una cifra de la `claim` lleva unidades, la `truth` usa la misma convención.
- Las verdaderas y las falsas usan la misma convención (si solo unas llevaran el paréntesis, el estilo delataría la respuesta; riesgo R9).

### 4.10 Flujo de importar-afirmaciones.mjs (`npm run afirmaciones`) [D-123, D-131]

Argumentos (`analizarArgumentosAfirmaciones`): `--simular`, `--reimportar`, `--confirmar`, `--revisado`; cualquier otro es un error.

**Fase A** (no se escribe nada hasta que todo pasa; todos los errores juntos y código 1):
1. Leer `data/calendario.json` para `lanzamiento` y los temas de Images por `n` (si no existe o no es válido, `lanzamiento: null` y sin temas, con un aviso).
2. Leer los archivos mensuales: `leerAfirmacionesMensuales('data/facts')` y `unirMeses(archivos, {lanzamiento, comprobarMes: true})`. Cualquier error detiene el importador: "Revisa data/facts/ con npm run validar (o reparte los meses con npm run lanzamiento si cambiaste la fecha a mano)."
3. Leer `entrada/temas/` (sin carpetas: "No hay carpetas en entrada/temas." y código 0). De cada carpeta solo interesa la lista de nombres de archivo de su raíz; no se abre ningún archivo salvo el elegido en el paso 4 (nunca `datos.txt` ni `datos.original.txt`) [D-139].
4. `planificarAfirmaciones` (4.11): numeración a partir del último día de la unión (sin `--reimportar`, las ya importadas se omiten), archivo elegido (`facts.en.txt` o `facts.txt`), tema válido e igual al de Images si el día existe en el calendario, y, con lanzamiento, que los días nuevos sean posteriores a hoy. Las carpetas **sin** archivo de afirmaciones **al final** quedan pendientes con un aviso ("02-dogs y siguientes no tienen facts.txt: Fact or Fake se queda en el día 1."); una carpeta sin archivo seguida de otra con archivo es un error (hueco). Una carpeta con solo `datos.txt` y/o `datos.original.txt` cuenta como carpeta sin archivo de afirmaciones. Sin ninguna carpeta nueva con archivo: "No hay afirmaciones nuevas por importar." y código 0.
5. Leer cada archivo como bytes y decodificarlo con `TextDecoder('utf-8', {fatal: true})` ("01-fireworks/facts.txt no es UTF-8 válido; guárdalo como UTF-8."), y `analizarAfirmaciones` (4.11).
6. Duplicados: una afirmación igual (tras `normalizarParaDuplicados`) a otra del mismo lote o de cualquier día publicado de cualquier mes (descifrando la unión) es un error, que nombra la carpeta y el número de bloque.
7. Avisos de longitud (`avisosLongitud`, 4.11) y de mezcla (`avisosMezcla` de `temas.mjs`, sobre las verdades de todos los días). **Son avisos, nunca errores** [D-140]: se muestran y no detienen el importador ni cambian su código de salida; la revisión humana (punto 8 de la lista de 4.13) decide si se reescribe algo.
8. `--simular`: plan por día (número, fecha o "sin fecha de lanzamiento", archivo mensual de destino, tema, archivo leído, "5 afirmaciones: 2 fake, 3 fact"), archivos que se escribirían, avisos y la **lista de revisión** (4.13); código 0 sin escribir. **No muestra** ninguna afirmación, aclaración ni detalle.
9. Sin `--simular` y sin `--revisado`: muestra lo mismo y se detiene con código 1: "Revisa la lista de comprobación y vuelve a ejecutar con --revisado." [D-127]

**Fase B** (escritura):
10. Para cada día nuevo en orden de `n`: `barajar` con aleatorio criptográfico [D-55]; `clave = ofuscar(verdades, n, aleatorioCripto)`; `textos[i] = ofuscarAfirmacion(afirmacion, clave, n, i, aleatorioCripto)`; `fichas[i] = ofuscarAclaracion({aclaracion, detalles}, clave, n, i, aleatorioCripto)`. `aleatorioCripto = () => crypto.randomInt(2 ** 32) / 2 ** 32`.
11. `todos = días existentes + días nuevos`; `archivos = repartirPorMes(todos, lanzamiento)`; se escriben **solo** los archivos de los meses que reciben días nuevos (los demás quedan idénticos byte a byte). Antes: `validarAfirmaciones(a, a.mes)` de cada archivo y `unirMeses` del conjunto sin errores. Escritura con `escribirAfirmacionesMensuales(dir, aEscribir, {borrarSobrantes: false})`.
12. Informe: días añadidos, omitidos y pendientes, archivos escritos y sin cambios, avisos, la lista de revisión marcada como certificada y el recordatorio de que los textos siguen en `entrada/temas/`. No toca `creditos.html` (no depende de las afirmaciones, 4.14).

**`--reimportar`** (con `--confirmar` y `--revisado` para escribir): regenera desde cero orden, claves y bloques de **todos** los días a partir de sus carpetas (deben tener todas su archivo de afirmaciones), reescribe todos los archivos mensuales y borra los de meses sin días (`borrarSobrantes: true`). Solo mientras ningún día haya llegado (sin lanzamiento, siempre). Sin `--confirmar`, muestra el plan. No toca imágenes ni el calendario.

El importador no tiene banco: no lee ni escribe ningún archivo de `herramientas/` [D-131]. Nunca mueve, borra ni modifica `entrada/` (tampoco `datos.txt` ni `datos.original.txt`, que ni siquiera abre) [D-139], nunca borra un archivo mensual fuera de `--reimportar`, y nunca escribe afirmaciones, aclaraciones ni detalles en claro en `data/` ni en consola.

### 4.11 herramientas/afirmaciones.mjs (archivero): funciones puras y de archivo

Sustituye a `herramientas/titulares.mjs` (se renombra con `git mv` y se adapta; tarea 86).

| Exportación | Parámetros → retorno | Descripción |
|---|---|---|
| `CAMPOS_AFIRMACION` | constante | `['answer', 'claim', 'truth', 'details']` [D-131]. |
| `AFIRMACION_MAX`, `ACLARACION_MAX`, `DETALLE_MAX` | constantes | `140`, `160` y `80` (puntos de código). `DETALLES_MAX` (3) se importa de `js/diario.js`. |
| `ARCHIVOS_AFIRMACIONES` | constante | `['facts.en.txt', 'facts.txt']`, en orden de preferencia. |
| `UMBRAL_LONGITUD` | constante | `0.2` [D-127, D-132, D-140]. |
| `LISTA_REVISION` | constante | Las **8** líneas de 4.13, en orden [D-136, D-137]. |
| `elegirArchivo(archivos)` | `string[]` → `string \| null` | El primero de `ARCHIVOS_AFIRMACIONES` que esté en la lista; `null` si ninguno (`datos.txt`, `datos.original.txt` y cualquier otro archivo se ignoran) [D-139]. |
| `analizarAfirmaciones(texto, ruta, {maxBytes = 510})` | → `{afirmaciones, errores, avisos}` | Lee el formato de 4.9. Cada elemento: `{tipo: 'autentica' \| 'generada', afirmacion, aclaracion, detalles}`. Normaliza (BOM, saltos, NFC, espacios). **Errores** (con ruta y número de bloque): línea sin `campo:`; campo no previsto (también `source`); campo repetido (salvo `details`); más de 3 `details`; falta `answer`, `claim` o `truth`; `answer` distinto de `fact`/`fake`; cualquier valor vacío, con caracteres de control o con `{`/`}`; afirmación de más de 140, aclaración de más de 160 o detalle de más de 80 puntos de código; afirmación de más de `maxBytes` bytes; aclaración + detalles unidos por `\n` de más de `maxBytes` bytes; número de bloques distinto de 5; 0 o 5 `fake`. **Avisos**: afirmación o aclaración con más de una frase (más de un `.`, `!` o `?` seguido de espacio o fin); afirmación sin punto final. Nunca lanza. |
| `planificarAfirmaciones({carpetas, ultimoDia, hoyISO, lanzamiento, reimportar, temasImagenes})` | → `{nuevos, omitidos, pendientes, errores, avisos}` | `carpetas`: `[{nombre, archivos}]` (archivos de la raíz; las subcarpetas no se miran). Nombre de carpeta (`analizarCarpeta`), numeración consecutiva sin repetidos, tema válido y sin palabras prohibidas, tema igual a `temasImagenes.get(n)` si existe ("El tema de 03-x no coincide con el del día 3 de Images."), días posteriores a hoy si hay lanzamiento, y la regla de carpetas sin archivo de 4.10 (paso 4). `datos.txt` y `datos.original.txt` no generan errores ni avisos [D-139]. Cada nuevo: `{n, fecha, tema, carpeta, archivo, mes}`. `pendientes`: números de las carpetas finales sin archivo. |
| `medias(afirmaciones)` | → `{autentica, generada}` | Media de longitud de las afirmaciones de cada tipo en puntos de código (`null` si no hay de ese tipo). |
| `avisosLongitud(dias)` | `[{n, afirmaciones}]` → `string[]` | Por día y en el conjunto: si `(mayor − menor) / menor > UMBRAL_LONGITUD`, "AVISO: día 3: las afirmaciones falsas miden de media un 35 % más que las verdaderas (81 frente a 60 caracteres)." y "AVISO: en todo Fact or Fake, …". Mensajes locales. Devuelve **solo avisos**: ni el importador ni `validar` los convierten en errores, tampoco con `--estricto` [D-140]. |
| `normalizarParaDuplicados(texto)` | → `string` | NFC, minúsculas, espacios reducidos y sin puntuación final. |
| `analizarArgumentosAfirmaciones(argv)` | → `{simular, reimportar, confirmar, revisado, errores}` | |
| `ARCHIVO_MES` | constante | `/^(\d{4}-(?:0[1-9]\|1[0-2]))\.json$/`. |
| `unirMeses(archivos, {lanzamiento, comprobarMes = true})` | `[{nombre, contenido}]` → `{dias, errores}` | Como en la 2.0, con `validarAfirmaciones` y mensajes con `data/facts/{nombre}` y "Fact or Fake" ("El día {n} de Fact or Fake está en {nombre} y le corresponde {mes}."). Pura, nunca lanza. |
| `repartirPorMes(dias, lanzamiento)` | → `[{version: 1, mes, dias}]` | Sin cambios. |
| `leerAfirmacionesMensuales(dir)` | efecto (lectura) → `[{nombre, contenido}]` | Antes `leerTitularesMensuales`; sin cambios de comportamiento. |
| `escribirAfirmacionesMensuales(dir, archivos, {borrarSobrantes})` | efecto → `{escritos, sinCambios, borrados}` | Antes `escribirTitularesMensuales`; sin cambios de comportamiento. |

No existen `FUENTE_MAX`, `BANCO_AFIRMACIONES_VERSION` ni `validarBancoAfirmaciones` [D-131].

Importaciones: `../js/diario.js` (`validarAfirmaciones`, `mesDeNumero`, `MES_PATRON`, `fechaDelDia`, `diasEntre`, `temaValido`, `DETALLES_MAX`, `AFIRMACION_MAX_BYTES`, `ACLARACION_MAX_BYTES`), `./temas.mjs` (`analizarCarpeta`, `contienePalabraProhibida`) y, solo en las dos funciones de archivo, `node:fs` y `node:path`.

### 4.12 validar.mjs para Fact or Fake [D-124, D-131]

Errores:
- Existe `data/titulares/` o `data/titulares.json` ("Headlines ya no existe: borra data/titulares/.").
- Cualquier error de `unirMeses(leerAfirmacionesMensuales('data/facts'), {lanzamiento, comprobarMes: true})`.
- Temas con palabras prohibidas, o distintos del tema de Images para el mismo `n` ("El tema del día {n} no coincide entre Images y Fact or Fake.").
- Clave con 0 o 5 falsas.
- Una afirmación que no se descifra ("La afirmación {i+1} del día {n} de Fact or Fake no se puede descifrar.") o que supera 140 caracteres.
- Una aclaración que no se descifra, o con aclaración de más de 160, más de 3 detalles o un detalle de más de 80.
- Afirmaciones repetidas entre días (de cualquier mes).
- Ningún archivo de `entrada/` rastreado y ningún `.txt` rastreado fuera de `fonts/` (ya existían; cubren `facts.txt`, `facts.en.txt`, `datos.txt` y `datos.original.txt`) [D-139].

Sin carpeta `data/facts/` o sin archivos: no es error (Fact or Fake sin días; aviso de calendario corto).

`validar` no lee ningún banco de Fact or Fake ni comprueba fuentes (no existen, D-131), y no lee `entrada/` (tampoco `datos.txt` ni `datos.original.txt`) [D-139].

Avisos: longitudes (`avisosLongitud`, umbral del 20 % por día y en todo el reto; **aviso, nunca error, también con `--estricto`** [D-140]), mezcla (`avisosMezcla`), calendario corto y distinto número de días que Images (4.4.3). Ningún mensaje de `validar` muestra afirmaciones, aclaraciones ni detalles.

### 4.13 Norma de contenido de Fact or Fake [D-127, D-131, D-136]

Texto exacto de la norma (para `CLAUDE.md` y `.claude/agents/archivero.md`):

> **Norma de contenido de Fact or Fake.** Nada falso sobre salud, seguridad, tragedias ni política. Las afirmaciones falsas pueden alterar cifras o récords de personas y marcas famosas si no dañan su reputación. Cada afirmación lleva su verdad, que se muestra siempre tras responder. El importador no puede comprobarlo; antes de cada importación, una persona revisa cada afirmación con la lista de comprobación y lo certifica con `--revisado`.

Lista de revisión (`LISTA_REVISION`, que el importador muestra en `--simular`, sin `--revisado` y en el informe final), **8 puntos** [D-136, D-137]:
1. Ninguna afirmación falsa daña la reputación de la persona o marca de la que habla: con personas y marcas famosas solo altera una cifra o un récord (una estatura, unas ventas, una marca deportiva), sin atribuirles hechos, dichos ni conductas [D-136, DP-62].
2. Ninguna afirmación falsa trata de salud, medicina, nutrición, fármacos ni remedios.
3. Ninguna afirmación falsa trata de seguridad (electricidad, química, conducción, primeros auxilios, animales peligrosos…) ni podría causar daño si alguien se la creyera.
4. Ninguna afirmación falsa trata de tragedias (muertes, catástrofes, crímenes, accidentes, guerras).
5. Ninguna afirmación falsa trata de política, elecciones, gobiernos, partidos ni conflictos.
6. Cada `truth` es correcta, se entiende sola y corrige (o confirma) la afirmación sin ambigüedad, sin referirse a fuentes [D-137].
7. Ninguna afirmación verdadera es engañosa por omisión; si hace falta, su `truth` la matiza.
8. Verdaderas y falsas tienen el mismo estilo (tono, cifras, unidades, longitud). Ojo: si solo las verdaderas tratan de los temas de los puntos 2 a 5, el tema delata la respuesta (riesgo R15). Este punto solo advierte: la norma no prohíbe verdaderas sobre esos temas [D-132]. El aviso de longitud media del importador y de `validar` (20 %) es solo una ayuda para este punto [D-140].

(Respecto a D-131: el punto 1 deja de prohibir toda falsa sobre personas reales [D-136]; el punto 6 recupera la comprobación de la `truth`, sin la fuente [D-137]; los antiguos puntos 6 y 7 pasan a ser el 7 y el 8.)

### 4.14 Créditos de Fact or Fake [D-129, D-131, D-132]

No hay banco privado de Fact or Fake ni fuentes registradas [D-131]: `herramientas/banco-afirmaciones.json` no existe, no se crea y no va en `.gitignore`.

**Créditos**: `creditos.html` no lista medios ni fuentes. Lleva una sección fija `#creditos-afirmaciones` con `creditos.afirmaciones` (título, "Fact or Fake") y `creditos.afirmaciones_texto`, con el valor **exacto** [D-132]:

> Claims are written for this game from public sources. The fakes are invented and always debunked after you answer.

(113 puntos de código; dentro de su límite de 120, 3.1.) `creditos.mjs` no lee `data/facts/`.
