# identifAI-it: especificación técnica, versión 3.0 · 4 (tercera parte). Datos y herramientas en dos idiomas; cambios de 5, 6 y 7

Parte de la especificación 3.0 (índice en `docs/ESPECIFICACION.md`) [D-151]. **Manda sobre `4-datos.md` y `4b-facts.md`** (que conservan el texto de la 2.1) en todo lo que se cita aquí; lo que aquí no se toca sigue como allí. Decisiones: D-154 a D-161.

### 4.15 Qué cambia y por qué

- El juego se muestra en inglés o en español, y **todo** el contenido se cambia con el idioma: tema, prompts y "Real photograph" (Images), afirmaciones, verdades y detalles (Fact or Fake) [D-154].
- **Una sola verdad por prueba**: la `clave` (y por tanto el reparto de IA o falsas, el orden y el resultado) es común a los dos idiomas. Solo se duplican los textos. Así el intento, la racha y el texto compartido son los mismos en los dos idiomas, y un jugador que cambia de idioma ve el mismo caso.
- **Los dos idiomas van en el mismo archivo** (calendario y cada mes de `data/facts/`), no en archivos por idioma [D-158]. Motivos: (1) el cambio de idioma en la portada es instantáneo y puro (`CAMBIAR_IDIOMA` solo cambia `estado.idioma`), sin peticiones nuevas ni estados de carga; (2) una sola escritura por importación: los dos idiomas de un día no pueden quedar desincronizados (uno publicado y otro no, o con claves distintas); (3) `validar` comprueba la coherencia en un solo archivo. Coste: el doble de bloques (riesgo R19 y DP-66).
- Los bloques siguen siendo de 512 bytes (684 caracteres) en los dos idiomas: **longitud fija por idioma e igual entre idiomas**, así que ni el tamaño ni la presencia de un bloque delatan nada [D-86, D-124].

### 4.16 data/calendario.json · versión 5 [D-157]

```json
{
  "version": 5,
  "lanzamiento": null,
  "dias": [
    {
      "n": 1,
      "tema": { "en": "Fireworks", "es": "Fuegos artificiales" },
      "pruebas": ["k3x9q2m7ab", "p0w8e4r1tz", "m5n6b7v8c9", "z1x2c3v4b5", "q9w8e7r6t5"],
      "clave": "Mpb9Ycc=",
      "fichas": {
        "en": ["(684 caracteres base64)", "(684)", "(684)", "(684)", "(684)"],
        "es": ["(684 caracteres base64)", "(684)", "(684)", "(684)", "(684)"]
      }
    }
  ]
}
```

Reglas (`validarCalendario` la estructura; `validar.mjs` lo demás):
- `version` vale **5**; `lanzamiento` como en la v4 (`null` o fecha ISO).
- `tema`: objeto con exactamente `en` y `es`; los dos `temaValido` (1–30 caracteres, sin espacios en los extremos, sin control ni llaves, mayúscula inicial) y sin palabras prohibidas (lista ampliada de 0.1). `en` sale del nombre de la carpeta (`temaDeCarpeta`, como siempre); `es`, de `tema.es.txt` (4.19).
- `pruebas` y `clave`: como en la v4, comunes a los dos idiomas.
- `fichas`: objeto con exactamente `en` y `es`, cada uno 5 bloques en el orden de `pruebas`. `fichas.en[i]`: el prompt en inglés (`.en.txt`) o "Real photograph"; `fichas.es[i]`: el prompt en español (`.txt`) o "Fotografía real" (`TEXTOS[idioma].fichas.autentica`).
- Ningún otro campo. Sin `fecha` por día (como en la v4).
- **Paso de la v4 a la v5**: no hay migración automática (faltan los textos en español). Se rehace con `npm run importar -- --reimportar --confirmar` (4.20), que acepta un calendario anterior de las versiones 2 a 5. Hasta entonces, el juego de la rama no carga (no publicar nada entre la tarea 89 y la 104).

### 4.17 Semillas por idioma [D-157, D-158]

| Uso | Idioma `en` (sin cambios) | Idioma `es` (nuevo) | Bloque |
|---|---|---|---|
| Ficha de Images | `` `${clave}|${n}|${i}` `` | `` `${clave}|${n}|${i}|es` `` | 512 → 684 car. |
| Afirmación | `` `${clave}|${n}|${i}|afirmacion` `` | `` `${clave}|${n}|${i}|afirmacion|es` `` | 512 → 684 car. |
| Aclaración + detalles | `` `${clave}|${n}|${i}|aclaracion` `` | `` `${clave}|${n}|${i}|aclaracion|es` `` | 512 → 684 car. |

- El sufijo `|es` hace que ningún flujo se comparta entre idiomas (si dos textos se cifraran con el mismo flujo, el XOR de los dos bloques daría el XOR de los textos).
- Los vectores de D-92 y de la tarea 83 siguen valiendo (son de `en`, con el `idioma` por defecto). El agente-de-campo fija en la tarea 89 los vectores nuevos de `es` (`ofuscarFicha('Fotografía real', 'Mpb9Ycc=', 1, 0, () => 0, 'es')`, `ofuscarAfirmacion('Afirmación de prueba.', 'Mpb9Ycc=', 1, 0, () => 0, 'es')` y `ofuscarAclaracion({aclaracion: 'Verdad de prueba.', detalles: ['Uno.', 'Dos.']}, 'Mpb9Ycc=', 1, 0, () => 0, 'es')`) en `tests/diario.test.mjs` y los copia en DECISIONES como ajuste menor.
- La `clave` (verdades) no tiene idioma: `ofuscar`/`desofuscar` sin cambios.

### 4.18 data/facts/AAAA-MM.json · versión 2 [D-158]

```json
{
  "version": 2,
  "mes": "2000-01",
  "dias": [
    {
      "n": 1,
      "tema": { "en": "Fireworks", "es": "Fuegos artificiales" },
      "clave": "Q7m1Xa0=",
      "textos": {
        "en": ["(684 caracteres base64)", "(684)", "(684)", "(684)", "(684)"],
        "es": ["(684)", "(684)", "(684)", "(684)", "(684)"]
      },
      "fichas": {
        "en": ["(684)", "(684)", "(684)", "(684)", "(684)"],
        "es": ["(684)", "(684)", "(684)", "(684)", "(684)"]
      }
    }
  ]
}
```

Reglas: las de la v1 (4.7: nombre, `mes`, días consecutivos, conjunto sin huecos, reparto por `mesDeNumero`, sondeo del modo prueba, 404 = mes sin casos), con:
- `version` vale **2**. Un archivo v1 es un error de estructura para el juego, `validar` y `unirMeses` (mensaje propio en las herramientas, 4.21).
- `tema` como en el calendario, e **igual** al `tema` (los dos idiomas) del mismo `n` en el calendario si existe.
- `textos.{en,es}[i]`: la afirmación de la prueba `i` en cada idioma; `fichas.{en,es}[i]`: su aclaración y detalles. Las dos versiones de la prueba `i` corresponden a la misma verdad (`clave`).
- **Tamaño**: por día, 20 bloques = 13 680 caracteres, unos **14,3 KB**; por mes, unos **430 KB** (unos 330 KB transferidos: base64 de bytes aleatorios apenas se comprime). Con `cache: 'no-cache'` y el `ETag` de GitHub Pages, las visitas siguientes del mismo mes reciben un 304 (riesgo R19).

### 4.19 Entrada en español [D-157, D-159]

```
entrada/temas/
  01-fireworks/
    tema.es.txt          ← NUEVO: "Fuegos artificiales" (una línea)
    ia/
      Gemini_xxx.png
      Gemini_xxx.txt     ← prompt en español (obligatorio)
      Gemini_xxx.en.txt  ← prompt en inglés (obligatorio)
    real/
    facts.en.txt         ← obligatorio
    facts.es.txt         ← NUEVO, obligatorio
    datos.txt            ← notas libres (ninguna herramienta lo lee) [D-139]
    datos.original.txt   ← ídem
```

- **`tema.es.txt`** [D-159, DP-65]: UTF-8 (con o sin BOM), una sola línea no vacía (se admite un salto final), con el tema en español: `temaValido` y sin palabras prohibidas. Obligatorio en toda carpeta que tenga imágenes o afirmaciones (las dos importaciones lo leen y deben coincidir con lo ya publicado para ese `n`). El tema en inglés sigue saliendo del nombre de la carpeta.
- **Prompts** [D-157]: junto a cada imagen de `ia/`, `{base}.txt` (español) y `{base}.en.txt` (inglés), **los dos obligatorios**: si falta cualquiera, error del importador (antes, aviso y `fichas.sin_prompt`). Cada uno se normaliza con `normalizarFicha` (recorte a 510 bytes con `…` y aviso). Un `.txt` o `.en.txt` huérfano, o en `real/`, sigue dando un aviso y se ignora.
- **Afirmaciones** [D-159]: `facts.en.txt` y `facts.es.txt`, mismo formato de 4.9 (campos `answer`, `claim`, `truth`, `details`, con los nombres de campo y los valores `fact|fake` en inglés también en el archivo español). Los dos son obligatorios para que el día tenga Fact or Fake:
  - Con los dos: el día tiene afirmaciones. Con ninguno: el día aún no tiene Fact or Fake (pendiente si es al final, hueco si está en medio; 4.10). Con solo uno: **error** ("02-dogs tiene facts.en.txt pero falta facts.es.txt.").
  - **Emparejamiento por posición**: el bloque `k` de `facts.es.txt` es la traducción del bloque `k` de `facts.en.txt`. Errores: distinto número de bloques, o distinto `answer` en un mismo bloque ("El bloque 3 de 02-dogs es fact en facts.en.txt y fake en facts.es.txt."). Aviso: distinto número de `details` en un mismo bloque. El barajado del importador aplica **la misma permutación** a los dos idiomas.
  - `facts.txt` ya no se usa: si existe, se ignora con un aviso ("01-fireworks/facts.txt ya no se usa: el inglés va en facts.en.txt y el español en facts.es.txt.").
  - Límites iguales en los dos idiomas (140 / 160 / 80 puntos de código, 3 detalles, 510 bytes) [DP-71].
- **Convenciones de contenido en español** [D-159, DP-67]: cifras con unidades **solo en sistema métrico** (sin equivalente imperial), con coma decimal y espacio de millares a partir de cinco cifras (norma de la RAE: "1080 m", "10 000 km", "2,5 kg", "100 °C"); comillas españolas « » si hacen falta; signos de apertura ¿ ¡. Verdaderas y falsas con el mismo estilo (riesgo R9). La norma de contenido (4.13) se aplica igual a los dos textos.
- **Conversión de `datos.txt`** (tarea 88 ampliada): el archivero escribe `facts.en.txt` **y** `facts.es.txt` a partir de las notas del usuario (si `datos.original.txt` está en español, sirve de base para el español), sin inventar contenido y señalando al usuario cualquier diferencia de sentido entre las dos versiones.

### 4.20 herramientas/importar.mjs y temas.mjs (Images) [D-157, D-160]

Cambios sobre 4.4.1 a 4.4.4:
- `PALABRAS_PROHIBIDAS = ['real', 'ia', 'ai', 'fake', 'dato', 'bulo', 'falso', 'falsa', 'verdadero', 'verdadera']` (por palabra completa en ids, clases, `data-*`, rutas, `alt` y temas; por subcadena en los ids aleatorios) [D-160]. `nuevoId` descarta los ids que contengan cualquiera de ellas.
- `ARCHIVOS_IGNORADOS_RAIZ` pasa a `['facts.txt', 'facts.en.txt', 'facts.es.txt', 'datos.txt', 'datos.original.txt']`; `tema.es.txt` es un archivo **conocido** de la raíz que `planificar` exige en toda carpeta con imágenes (error "01-fireworks: falta tema.es.txt.").
- `planificar` devuelve en cada día nuevo, además, `temaEs` (leído y validado por el importador en la fase A: UTF-8 válido, una línea, `temaValido`, sin palabras prohibidas) y, por imagen de `ia/`, las rutas de los dos prompts; la falta de cualquiera de los dos es un error de la fase A.
- Fase B: `fichas.en[i] = ofuscarFicha(textoEn, clave, n, i, aleatorioCripto, 'en')` y `fichas.es[i] = ofuscarFicha(textoEs, clave, n, i, aleatorioCripto, 'es')`, con `textoEn` = prompt `.en.txt` o `TEXTOS.en.fichas.autentica` y `textoEs` = prompt `.txt` o `TEXTOS.es.fichas.autentica`.
- Escribe el calendario **versión 5**. Sin `--reimportar`, un calendario v4 detiene el importador: "data/calendario.json es de la versión 4 (sin español): rehazlo con npm run importar -- --reimportar --confirmar." `calendarioAnteriorValido` acepta las versiones 2 a 5; `--reimportar` escribe siempre la 5 (y es el momento de sustituir las fotos de D-150).
- Si el día ya existe en `data/facts/` (v2), el `tema` (los dos idiomas) debe coincidir.
- El banco (`herramientas/banco.json`, v3) no cambia: no guarda el tema en español ni prompts.
- `--simular` y los mensajes nunca muestran prompts en ningún idioma.

### 4.21 herramientas/afirmaciones.mjs, importar-afirmaciones.mjs y lanzamiento.mjs [D-158, D-159]

`afirmaciones.mjs`:

| Exportación | Cambio |
|---|---|
| `ARCHIVOS_AFIRMACIONES` | `Object.freeze({en: 'facts.en.txt', es: 'facts.es.txt'})`. |
| `elegirArchivo` | **Se retira**; la sustituye `archivosDelDia(archivos)` → `{en: string \| null, es: string \| null, errores, avisos}` (error si solo hay uno de los dos; aviso si hay `facts.txt`; `datos.txt`, `datos.original.txt`, `tema.es.txt` y cualquier otro archivo se ignoran sin aviso). |
| `emparejarIdiomas(en, es, carpeta)` | **Nueva**, pura: recibe los dos resultados de `analizarAfirmaciones` y devuelve `{pares: [{tipo, en: {afirmacion, aclaracion, detalles}, es: {…}}], errores, avisos}` (reglas de 4.19). Nunca lanza. |
| `planificarAfirmaciones` | Cada nuevo lleva `archivos: {en, es}` y `temaEs`; tema `en` y `es` iguales a los del calendario para el mismo `n` si existe ("El tema en español de 03-x no coincide con el del día 3 de Images."). |
| `avisosLongitud(dias)` | Por idioma: el mismo cálculo (20 %, solo avisos, D-140) sobre las afirmaciones de cada idioma; los mensajes dicen el idioma ("AVISO: día 3 (español): …"). |
| `LISTA_REVISION` | **9 puntos**: los 8 de 4.13 y un 9.º: "La versión en español dice lo mismo que la inglesa (misma respuesta, mismas cifras con unidades equivalentes, mismo matiz en la `truth` y los detalles) y cumple igual la norma." [D-159]. |
| `unirMeses`, `repartirPorMes` | Con archivos **v2** (`repartirPorMes` escribe `{version: 2, mes, dias}`). Un archivo v1 da el error "data/facts/{nombre} es de la versión 1 (solo inglés): rehazlo con npm run afirmaciones -- --reimportar --confirmar --revisado." |

`importar-afirmaciones.mjs` (4.10) con estos cambios:
- Fase A: lee `tema.es.txt` y los dos archivos de cada carpeta nueva (UTF-8 estricto), `analizarAfirmaciones` de cada uno, `emparejarIdiomas`, duplicados **por idioma** (contra el lote y contra todo lo publicado de ese idioma), avisos de longitud y mezcla. `--simular` muestra por día "5 afirmaciones: 2 fake, 3 fact (en y es)", sin ningún texto.
- Fase B: una permutación por día (`barajar`), una `clave`, y `textos.{en,es}[i]` / `fichas.{en,es}[i]` con `ofuscarAfirmacion` / `ofuscarAclaracion` y el idioma de cada bloque.
- `--reimportar` (con `--confirmar` y `--revisado`): regenera todos los días desde `entrada/` (todas las carpetas deben tener los dos archivos y `tema.es.txt`), reescribe todos los meses en v2 y borra los sobrantes; acepta que los archivos existentes sean v1 (solo los reemplaza; no los descifra).

`lanzamiento.mjs`: lee y reescribe `data/facts/` en **v2** (el reparto no toca el contenido); acepta un calendario v4 o v5 sin cambiar su versión (solo migra 3 → 4, como antes); con archivos v1 se detiene con el mensaje de `unirMeses`.

### 4.22 validar.mjs [D-157, D-158, D-160, D-161]

Además de 4.4.3 y 4.12:
- Calendario **v5** (versión 4: "data/calendario.json es de la versión 4: rehazlo con npm run importar -- --reimportar --confirmar."). Archivos de `data/facts/` en **v2**.
- Temas: los dos idiomas válidos y sin palabras prohibidas; iguales entre calendario y `data/facts/` para el mismo `n` ("El tema en español del día {n} no coincide entre Images y Fact or Fake.").
- Fichas de Images, en cada idioma: todas se descifran; las auténticas son exactamente `TEXTOS[idioma].fichas.autentica` y las generadas no (ni son la del otro idioma). Mensajes que solo nombran el día y el idioma.
- Fact or Fake, en cada idioma: todo se descifra; longitudes; repetidos por idioma (entre días y meses). Aviso (no error) si una prueba tiene distinto número de detalles en los dos idiomas.
- Palabras prohibidas con la lista ampliada en `index.html` (ids, clases, `data-*`, `alt`), en las rutas publicadas, en `creditos.html` y `creditos.es.html`, y en los temas. Error si queda alguna clase `dato*`.
- Existen `creditos.html` (con `lang="en"`) y `creditos.es.html` (con `lang="es"`).
- Ningún `.txt` rastreado fuera de `fonts/` (cubre `tema.es.txt`, `facts.es.txt` y los prompts) ni nada de `entrada/`.
- Ningún mensaje de `validar` muestra prompts, afirmaciones, aclaraciones ni detalles en ningún idioma.

### 4.23 creditos.mjs [D-161]

`generarCreditosHtml({parejas, idioma})` → el HTML de un idioma con `TEXTOS[idioma]`, `lang` y el enlace a la otra página (`creditos.otro_idioma`, `hreflang`); `creditos.mjs` escribe `creditos.html` (`en`) y `creditos.es.html` (`es`) en la misma ejecución. Las fuentes y licencias (Unsplash, Pexels, "Creación propia (Gemini)"…) son nombres propios o textos de licencia y no se traducen, salvo las etiquetas que vienen de `TEXTOS`. Deterministas byte a byte. `importar.mjs` regenera los dos.

### 4.24 Cambios en las secciones 5, 6 y 7

**5. Algoritmo diario**: sin cambios. El idioma no interviene en `n`, en la fecha efectiva, en qué casos tocan ni en la carga (siempre se carga el archivo con los dos idiomas).

**6. Almacenamiento** [D-154]:
- `identifaiit.v3` **no cambia** (ni forma ni versión): partidas por fecha y reto, rachas por reto, `ajustes: {modo, reto}`. Nada de idioma.
- Clave nueva **`identifaiit.idioma`**: la cadena `en` o `es`. La escribe main.js al elegir en el selector y al llegar con `?lang=` válido; la lee al arrancar (`elegirIdioma`). Se usa en todos los modos (también previsualización y modo prueba, que siguen sin guardar progreso).
- Si `localStorage` falla: el idioma se decide cada vez (URL o navegador) y vive en memoria; no hay aviso propio (el de `#aviso-almacen` sigue saliendo por el progreso).
- La clave de disponibilidad `identifaiit.prueba`, el respaldo en `sessionStorage` y las otras pestañas no cambian. Cambiar de idioma en otra pestaña no se propaga (no hay oyente para esta clave): cada pestaña conserva el suyo hasta recargar.

**7. Compartir** [D-155]. Plantillas exactas por idioma (las inglesas no cambian):

```js
// TEXTOS.en.compartir
plantilla:              'identifAI-it Images #{caso}\nMode: {modo}\n{aciertos}/5 {cuadros}\nStreak: {racha}\n{url}'
plantilla_afirmaciones: 'identifAI-it Fact or Fake #{caso}\n{aciertos}/5 {cuadros}\nStreak: {racha}\n{url}'
// TEXTOS.es.compartir
plantilla:              'identifAI-it Imágenes #{caso}\nModo: {modo}\n{aciertos}/5 {cuadros}\nRacha: {racha}\n{url}'
plantilla_afirmaciones: 'identifAI-it ¿Dato o Bulo? #{caso}\n{aciertos}/5 {cuadros}\nRacha: {racha}\n{url}'
```

- El texto sale en el idioma activo al pulsar Share; `{modo}` = `TEXTOS[idioma].portada.modo_*`; el resto como en la 2.1 (mismo `n`, misma racha, mismos cuadros, sin tema ni contenido). `{url}` = `urlDelJuego()`, sin `?lang=`.
- No revela qué pruebas eran IA, FAKE o BULO. Excepciones de palabras: "identifAI-it" y el nombre del reto en la primera línea ("Fact or Fake" / "¿Dato o Bulo?"); "Fake", "Dato" y "Bulo" no aparecen en ninguna otra parte; "IA", "REAL" y "DATO" no aparecen como palabra suelta fuera de ese nombre.

Ejemplos en español, en `https://usuario.github.io/identifAI-it/`:

Imágenes, caso 12, modo `perro`, `AAFAF`, racha 3:
```
identifAI-it Imágenes #12
Modo: Sabueso
3/5 🟩🟩🟥🟩🟥
Racha: 3
https://usuario.github.io/identifAI-it/
```

¿Dato o Bulo?, caso 12, `FAAAA`, racha 5:
```
identifAI-it ¿Dato o Bulo? #12
4/5 🟥🟩🟩🟩🟩
Racha: 5
https://usuario.github.io/identifAI-it/
```
