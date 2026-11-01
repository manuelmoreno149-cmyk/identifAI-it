# identifAI-it: especificación técnica, versión 3.1 · 11. Día común en hora de España

Parte de la especificación **3.1** (índice en `docs/ESPECIFICACION.md`) [D-205]. Recoge el **cambio de regla** que cerró el usuario el 2026-11-01, día del lanzamiento: el día del juego cambia **para todo el mundo a la vez a las 00:00 hora de España** (zona IANA `Europe/Madrid`, con su horario de verano e invierno), y ya no a la medianoche local de cada jugador.

**Manda sobre** (donde difieran): glosario de 0 ("Fecha ISO", "Fecha efectiva", "Modo prueba"), 1.3 (`MEDIANOCHE`: cuándo se detecta), 3.2 (`fechaLocal`, `msHastaMedianoche`), 3.7 (arranque, cuenta atrás), 4.2.1 y 4.4.3 (`hoy` de las herramientas), 5 (puntos 6, 8 y 10), 6 (fecha de las partidas), 10.6.1 (uso de `Intl`), 10.8.1, 10.8.2, 10.8.7 (`hoyISO`), 10.9 (Action), 10.12 (puntos 2, 6 y 7), 9.16 (archivero), la tarea 112, y los criterios 1, 4, 218, 312, 314, 320 y 322 (8.50). Lo marcado aquí con **[3.1]** sustituye a lo anterior.

Requisito previo **P9** (usuario): aplicar en `CLAUDE.md` el texto de 11.11 antes de delegar las tareas 131 a 139 (`CLAUDE.md` dice hoy "El día cambia a medianoche, hora local." y prevalece sobre la spec).

## 11.1 La regla y sus consecuencias

- **Un solo día para todos** [D-205]: la fecha del juego en cualquier instante es la fecha civil de Madrid en ese instante. Todos los jugadores ven el mismo Caso #n a la vez, estén donde estén.
- **Hora local a la que cambia el día** (informativa; los textos visibles no la listan, 11.6):

  | Zona del jugador | Con Madrid en invierno (CET, UTC+1) | Con Madrid en verano (CEST, UTC+2) | Ventanas de desfase |
  |---|---|---|---|
  | Madrid | 00:00 | 00:00 | — |
  | Ciudad de México (UTC−6 todo el año) | 17:00 | 16:00 | — |
  | Nueva York (EST/EDT) | 18:00 | 18:00 | **19:00** del 2.º domingo de marzo al último domingo de marzo, y del último domingo de octubre al 1.er domingo de noviembre (EE. UU. y la UE cambian la hora en fechas distintas; p. ej. del 2026-10-25 al 2026-10-31 y del 2027-03-14 al 2027-03-27) |
  | Tokio (UTC+9) | 08:00 del día siguiente | 07:00 del día siguiente | — |

- **Días de 23 y 25 horas**: el último domingo de marzo (2027-03-28) dura 23 h y el último domingo de octubre (2026-10-25, 2027-10-31) dura 25 h. La medianoche de Madrid nunca cae dentro de un cambio de hora (los cambios son a las 02:00 y 03:00), así que siempre existe y es única. **Nunca se suman 24 h** para pasar de un día a otro: todo se calcula con instantes (11.2).
- **No cambia**: un intento por reto y fecha, común a modos e idiomas; reglas de racha (D-25, D-99); medianoche durante la partida (la partida sigue con los datos cargados y se guarda con la fecha de su inicio, D-51, D-145); `?fecha=` en local; D-18 (cambiar la hora del dispositivo sigue adelantando días: el instante sale de `new Date()`).
- **Sin migración del almacén**: las partidas siguen guardadas por fecha ISO en `identifaiit.v3` (forma y versión iguales). Antes del lanzamiento no había partidas del juego normal (todo era `sin-casos` o almacén en memoria). Si se llega a publicar algún rato el juego con la medianoche local, las fechas ya guardadas siguen siendo válidas: cada fecha tiene el mismo caso con las dos reglas; solo cambia cuándo empieza cada fecha para cada jugador (como mucho, un jugador lejano juega un día más o lo encuentra ya jugado). Se acepta.

## 11.2 js/diario.js (agente-de-campo) [D-206]

| Exportación | Tipo | Parámetros → retorno | Descripción |
|---|---|---|---|
| `ZONA_JUEGO` | constante | | `'Europe/Madrid'`. Es el **único** literal `Europe/Madrid` de `js/` y `herramientas/`. |
| `fechaMadrid(instante)` | pura | `Date \| number` (ms desde la época) → `'AAAA-MM-DD'` | Fecha civil de `ZONA_JUEGO` en ese instante. Usa un único `Intl.DateTimeFormat('en-US', {timeZone: ZONA_JUEGO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'})`, creado de forma perezosa en la primera llamada y reutilizado, y lee sus `formatToParts` (nunca analiza la cadena de `format`). No usa `getFullYear`, `getMonth`, `getDate`, `getHours` ni `getTimezoneOffset`: la zona del sistema no influye. Con un `Date` inválido, un número no finito o cualquier otro tipo, lanza `TypeError`. **Sustituye a `fechaLocal`**, que se retira (tarea 137). |
| `medianocheMadrid(fechaISO)` | pura | `'AAAA-MM-DD'` → `number` (ms) | Instante de las 00:00:00.000 de esa fecha en Madrid. Prueba los dos candidatos `Date.UTC(a, m − 1, d) − 3 600 000` (CET) y `− 7 200 000` (CEST) y devuelve el único cuyas partes en Madrid son esa fecha y 00:00:00. Fecha que no cumpla `^\d{4}-\d{2}-\d{2}$` o `sumarDias(f, 0) === f` → `TypeError`. Si ningún candidato sirve (imposible con las reglas actuales de Madrid), lanza `Error`. |
| `msHastaMedianocheMadrid(instante)` | pura | `Date \| number` → `number` (ms) | `medianocheMadrid(sumarDias(fechaMadrid(instante), 1)) − ms(instante)`. Siempre en `(0, 90 000 000]`: 24 h un día normal, 23 h el último domingo de marzo, 25 h el último domingo de octubre; justo a medianoche devuelve el día entero, nunca 0. **Sustituye a `msHastaMedianoche`**, que se retira (tarea 137). |

- La función auxiliar de partes (año, mes, día, hora, minuto, segundo en Madrid) es interna, no se exporta.
- **Pureza**: `Intl.DateTimeFormat` con `timeZone` explícito da el mismo resultado para el mismo instante en cualquier sistema con datos IANA (Node 20 incluye ICU completo; todos los navegadores objetivo tienen la zona). Cumple la regla de 3: no lee `Date.now()`, `navigator` ni la zona del sistema. Si el entorno no conociera la zona, el constructor lanza `RangeError` en la primera llamada; main.js lo trata como un fallo de arranque y muestra `error` (`'calendario'`).
- **Sin cambios**: `sumarDias`, `diasEntre`, `numeroCaso`, `numeroDelDia`, `fechaDelDia`, `mesDeFecha`, `formatearFecha` (aritmética de fechas civiles en UTC, sin zona) y `formatearCuentaAtras`, que ya admite más de 24 h (`'24:59:59'` tras la medianoche del día de 25 h).
- `fechaLocal` y `msHastaMedianoche` siguen exportadas solo hasta la tarea 137 (para que cada commit intermedio pase `npm test`); nadie las usa desde la tarea 133.

## 11.3 Dónde se usa la fecha de Madrid [D-207]

**Juego** (`js/main.js`, agente-de-campo):
- `hoy()` = `fechaFija ?? fechaPrueba ?? fechaMadrid(new Date())` (fecha efectiva del glosario).
- Modo prueba (con `PRUEBAS_ABIERTAS = false` no se activa, pero el código sigue): `nHoy = numeroDelDia(fechaMadrid(new Date()), lanzamiento)`.
- Caso de cada reto, mes de `data/facts/` (`mesDeFecha(hoy())`), `estado.fecha` de `FIN_CUENTA` y `EMPEZAR`, clave de las partidas en `identifaiit.v3`, `registrarFin`/`calcularRacha` (con `estado.fecha`, D-51), `ya-jugado` y el texto compartido (`n` y racha): todo sale de `hoy()` o de `estado.fecha`, así que ya es la fecha de Madrid sin tocar `almacen.js`, `juego.js` ni `compartir.js`.
- Ningún otro sitio de `js/` decide nada con la hora local. `Date.now()` y `performance.now()` siguen solo para medir duraciones (ausencias, temporizador).

**Herramientas** (archivero): el valor por defecto de `hoyISO` pasa a `fechaMadrid(new Date())` en `validar.mjs`, `lanzamiento.mjs`, `importar.mjs` e `importar-afirmaciones.mjs` (llegada del lanzamiento, `PRUEBAS_ABIERTAS`, días que ya han llegado, "solo días posteriores a hoy", `comprobarReutilizacion`). Motivo: la Action corre en UTC, y a las 23:10 UTC de invierno ya es el día siguiente en Madrid. Los tests siguen inyectando `hoyISO`.

## 11.4 Cuenta atrás y cambio de día en vivo [D-208, D-209]

**Cuenta atrás** (sin marcado nuevo):
- **Dónde**: en `resultado` (`#resultado-cuenta-atras`, tras `resultado.siguiente_caso`, "Next case in" / "Próximo caso en") y en `ya-jugado` (`#ya-jugado-cuenta-atras` = `rellenar(ya_jugado.proximo, {tiempo})`, "Next case in 05:12:08"). No se añade a la portada (R8 va justa) ni a la partida.
- **Valor**: `formatearCuentaAtras(msHastaMedianocheMadrid(new Date()))`, `HH:MM:SS`, actualizado cada segundo por el bucle que ya existe; `aria-live="off"`, como ahora.
- **"En el reloj del jugador"**: es una duración, igual para todos en el mismo instante; llega a cero cuando el reloj de cada jugador marca la hora de 11.1 (17:00 en Ciudad de México en invierno, por ejemplo). No se muestra la hora local del cambio (DP-108).

**Cambio de día en vivo** (main.js):
- Se mantienen el bucle de 1 s de `resultado`/`ya-jugado` y la comprobación en `visibilitychange`, con `hoy()` de 11.3.
- **Vigía de medianoche** (nuevo): desde el arranque hay siempre un único temporizador `setTimeout(revisarDia, Math.min(msHastaMedianocheMadrid(new Date()) + 250, 60 000))`, que se vuelve a armar tras cada disparo (con `clearTimeout` del anterior). El tope de 60 s cubre equipos suspendidos, temporizadores retrasados por el navegador y cambios de hora del dispositivo.
- `revisarDia()`: si hay `fechaFija` o `fechaPrueba`, nada. Si `hoy() !== fechaCarga`: en `portada`, `instrucciones`, `ya-jugado` o `sin-casos` → `despachar({tipo: 'MEDIANOCHE'})` (la tabla de 1.3 no cambia; en `iniciando` el evento se ignora, así que un doble aviso del bucle y del vigía no hace nada); en `resultado` → mostrar `#resultado-nuevo-caso` y ocultar `#resultado-proximo`, como ya hace el bucle; en `cargando`, `cuenta-atras`, `caso` y `error` → nada (la partida termina con sus datos; `VOLVER_PORTADA` desde `resultado` ya despacha `MEDIANOCHE`).
- Con la pestaña oculta los temporizadores pueden pararse: al volver, `visibilitychange` y el siguiente disparo del vigía lo resuelven.

## 11.5 Archivo de casos y GitHub Action [D-210, D-211]

### 11.5.1 Qué día es archivable [3.1, sustituye la fórmula de 10.8.2]

```
ultimoDiaArchivable(ahoraMs) = sumarDias(fechaMadrid(ahoraMs), −1)
```
- Como el día es el mismo para todos, en cuanto pasa la medianoche de Madrid el día anterior ha terminado para todos los jugadores: hoy en Madrid es D → archivable hasta D−1. Desaparece el margen de UTC−12.
- `herramientas/paginas.mjs` importa `fechaMadrid` de `js/diario.js` y conserva el nombre `ultimoDiaArchivable(ahoraMs)`; `diasArchivables`, `validar` (días archivados con `fecha > ultimoDiaArchivable(ahora)` → error) y `--ultimo` la usan sin más cambios.
- **Excepción a 10.6.1**: el generador puede usar `Intl` **solo** a través de `fechaMadrid` (zona horaria), nunca para dar formato a fechas visibles. El resultado sigue siendo determinista: mismo instante, misma salida, con cualquier `TZ` (criterio 303 sin cambios).
- 10.8.1 se lee así: el archivo publica en claro solo días **ya terminados según la hora de España**, es decir, anteriores al día en curso en Madrid. 10.8.7: "llegado" = `fecha ≤ hoyISO` con `hoyISO = fechaMadrid(new Date())`; sigue siendo cierto que todo día archivado es llegado.
- **Riesgo aceptado (R38)**: quien empezó la partida de D antes de medianoche y sigue jugando cuando aparece el archivo de D (hacia las 00:10–00:20 de Madrid, tras el despliegue de Pages) podría consultarlo. Son minutos y solo afectan a esa partida.

### 11.5.2 Action `.github/workflows/archivo.yml` [3.1, sustituye el `on` y añade el primer paso de 10.9]

```yaml
name: Archivo de casos
on:
  schedule:
    - cron: '10 22 * * *'   # 00:10 en Madrid en verano (CEST); en invierno son las 23:10 y no hace nada
    - cron: '10 23 * * *'   # 00:10 en Madrid en invierno (CET); en verano son las 01:10 y no hace nada
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
      - name: Hora de Madrid
        id: hora
        run: |
          hora="$(TZ=Europe/Madrid date +%H)"
          if [ "$GITHUB_EVENT_NAME" = "schedule" ] && [ "$hora" != "00" ]; then
            echo "seguir=no" >> "$GITHUB_OUTPUT"
            echo "En Madrid son las ${hora}:xx: esta ejecución programada no toca."
          else
            echo "seguir=si" >> "$GITHUB_OUTPUT"
          fi
      - uses: actions/checkout@v4
        if: steps.hora.outputs.seguir == 'si'
      - uses: actions/setup-node@v4
        if: steps.hora.outputs.seguir == 'si'
        with:
          node-version: 20
      - run: npm ci
        if: steps.hora.outputs.seguir == 'si'
      - run: npm run paginas
        if: steps.hora.outputs.seguir == 'si'
      - run: npm run validar
        if: steps.hora.outputs.seguir == 'si'
      - name: Commit si hay cambios
        if: steps.hora.outputs.seguir == 'si'
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
- **Hora**: el `cron` de GitHub es UTC y no sigue el horario de verano; con las dos líneas, cada noche exactamente una cae a las 00:10 de Madrid (también los días de 23 y 25 h, criterio 353). La comprobación usa `GITHUB_EVENT_NAME` (variable del ejecutor, sin expresiones `${{ }}` dentro del guion) y la `tzdata` del ejecutor.
- **`workflow_dispatch`** corre siempre, a cualquier hora (útil para recuperar).
- **La seguridad no depende de la hora**: lo que impide publicar un día antes de tiempo es `ultimoDiaArchivable` calculado en el momento real de la ejecución. La comprobación de la hora solo evita la segunda ejecución de cada noche. Si GitHub retrasa una ejecución programada más allá de las 00:59 de Madrid, esa noche no se archiva nada y la noche siguiente se archivan los dos días (DP-110).
- Se mantienen las demás normas de 10.9: solo `main`, `permissions: {}` y `contents: write` en el trabajo, `concurrency` sin cancelar, Node 20, `npm ci`, `npm run paginas`, `npm run validar` sin `--estricto`, solo `en/`, `es/` y `sitemap.xml`, commit solo si hay cambios con el mensaje de siempre, sin secretos.
- Ya no vale el `cron: '15 12 * * *'` de D-189.

## 11.6 Textos (cronista) [D-212]

El cambio de día se nombra siempre así en los textos visibles: **"at midnight, Spanish time (CET)"** en inglés y **"a medianoche, hora de España"** en español (fragmentos exactos; DP-107 sobre CEST y Canarias). Ningún texto dice que el día cambia según la hora o la zona del jugador, ni lista equivalencias locales (cambian con el horario de verano).

**Claves de `js/textos.js` afectadas**:

| Clave | Hoy | Cambio |
|---|---|---|
| `portada.pie` (`en`) | "New cases every day at midnight." (exacto) | Debe contener "at midnight, Spanish time (CET)". Sigue el límite de **48** caracteres de 3.1; propuesta que cabe: "New cases daily at midnight, Spanish time (CET)." (48). Pasa a ser exacto cuando lo apruebe el usuario. |
| `portada.pie` (`es`) | "Casos nuevos cada día a medianoche." | Debe contener "a medianoche, hora de España". Propuesta: "Casos nuevos a medianoche, hora de España." (42). |

Revisadas y **sin cambios** (no hablan de la hora ni de la zona): `resultado.siguiente_caso`, `ya_jugado.proximo`, `ya_jugado.texto`, `sin_casos.texto`, `sin_casos.sin_lanzamiento`, `archivo.vacio`, `seo.descripcion_archivo`, `seo.descripcion_juego`. El cronista confirma al editarlas que siguen sin decir "hora local" ni nada equivalente.

**Contenido de `herramientas/contenido/`** (10.12, puntos 2, 6 y 7, se leen con esta regla):

| Archivo | Frase actual que cambia |
|---|---|
| `en/como_jugar.html` (línea 28) | "A new case opens at midnight, in your local time." |
| `es/como_jugar.html` (línea 28) | "El día cambia a medianoche, según la hora de tu dispositivo." |
| `en/preguntas.html` (línea 9, ¿Cuándo hay casos nuevos?) | "Every day at midnight, in your local time. …" |
| `es/preguntas.html` (línea 9) | "Cada día a medianoche, según la hora de tu dispositivo. …" |
| `en/sobre.html` (línea 15) | "… A new case opens at midnight, in your local time." |
| `es/sobre.html` (línea 15) | "… Un caso nuevo se abre a medianoche, según la hora de tu dispositivo." |
| `en/archivo.html` (línea 7) | "… closed everywhere in the world. A case joins the archive the day after it ends in the last time zone. …" → un caso entra en el archivo en cuanto termina, poco después de la medianoche, hora de España. |
| `es/archivo.html` (línea 7) | "… cerrado en todo el mundo. Un caso entra en el archivo el día siguiente a terminar en la última zona horaria. …" → igual en español. |

- La FAQ de "¿Cuándo hay casos nuevos?" dice que el caso es el mismo para todos y cambia a la vez en todo el mundo, a medianoche, hora de España.
- Tras editar: `npm run paginas` (tarea 136).

## 11.7 Lanzamiento (registro) [D-213]

- **Lanzamiento**: `2026-11-01` (Caso #1), con **7 casos** (del 2026-11-01 al 2026-11-07). El **2026-11-08** (hora de Madrid) no hay caso de ningún reto: `sin-casos` con `sin_casos.texto`; ese día rompe las rachas (D-25) y el juego lleva `noindex` dinámico (D-178; DP-111). `validar` avisa de calendario corto (4.4.3).
- **`PRUEBAS_ABIERTAS = false`** en `js/main.js` (tarea 44): `?prueba=1` y `?dia=` se ignoran. La previsualización con `?fecha=` en `localhost`, `127.0.0.1` o `[::1]` sigue (D-68).
- **Tareas hechas el día del lanzamiento** (comunicado por el usuario el 2026-11-01): 81 (fecha de lanzamiento), 44 (cerrar el modo prueba) y L1 a L6 de 9.17.
- **Nota del inspector** (DP-112): en el repositorio leído al escribir esto, `data/calendario.json` tenía `"lanzamiento": null` y `js/main.js` `PRUEBAS_ABIERTAS = true`; el registro de arriba es el que dio el usuario. Además, `comprobarCambioLanzamiento` exige una fecha **posterior** a hoy, así que `npm run lanzamiento -- 2026-11-01` falla el mismo 2026-11-01 (DP-109, tarea 141).

## 11.8 Criterios de aceptación (8.50)

**Criterios anteriores que cambian**: **1** → 338; **4** → 341; **218**: "a medianoche (hora de Madrid) del último día de un mes"; **312** → 350; **314** → 351; **320** → 352; **322**: igual, con la regla de 11.5.1 (354). Los demás siguen; 303 y 324 valen con la nueva `ultimoDiaArchivable`.

### diario.js (node --test)

338. `fechaMadrid`: `new Date('2026-11-01T22:59:59.999Z')` → `'2026-11-01'`; `'2026-11-01T23:00:00Z'` → `'2026-11-02'` (CET); `'2027-06-30T21:59:59Z'` → `'2027-06-30'`; `'2027-06-30T22:00:00Z'` → `'2027-07-01'` (CEST); `'2026-12-31T22:59:59Z'` → `'2026-12-31'`; `'2026-12-31T23:00:00Z'` → `'2027-01-01'`. Con número: `fechaMadrid(Date.parse('2026-11-01T23:00:00Z'))` → `'2026-11-02'`. `ZONA_JUEGO === 'Europe/Madrid'`.
339. Cambios de hora. Marzo (2027-03-28, 23 h): `'2027-03-27T22:59:59Z'` → `'2027-03-27'`; `'2027-03-27T23:00:00Z'` → `'2027-03-28'`; `'2027-03-28T00:59:59Z'` (01:59:59 CET) y `'2027-03-28T01:00:00Z'` (03:00 CEST) → `'2027-03-28'`; `'2027-03-28T21:59:59Z'` → `'2027-03-28'`; `'2027-03-28T22:00:00Z'` → `'2027-03-29'`. Octubre (2026-10-25, 25 h): `'2026-10-24T21:59:59Z'` → `'2026-10-24'`; `'2026-10-24T22:00:00Z'` → `'2026-10-25'`; `'2026-10-25T00:30:00Z'` (02:30 CEST) y `'2026-10-25T01:30:00Z'` (02:30 CET) → `'2026-10-25'`; `'2026-10-25T22:59:59Z'` → `'2026-10-25'`; `'2026-10-25T23:00:00Z'` → `'2026-10-26'`.
340. `medianocheMadrid`: `'2026-11-02'` → `Date.parse('2026-11-01T23:00:00Z')`; `'2027-07-01'` → `'2027-06-30T22:00:00Z'`; `'2027-03-28'` → `'2027-03-27T23:00:00Z'`; `'2027-03-29'` → `'2027-03-28T22:00:00Z'`; `'2026-10-25'` → `'2026-10-24T22:00:00Z'`; `'2026-10-26'` → `'2026-10-25T23:00:00Z'`; `'2026-03-30'` → `'2026-03-29T22:00:00Z'`; `'2027-11-01'` → `'2027-10-31T23:00:00Z'`. Para cada fecha `f` de 2026 y 2027: `fechaMadrid(medianocheMadrid(f)) === f` y `fechaMadrid(medianocheMadrid(f) − 1) === sumarDias(f, −1)`. `'2026-13-01'`, `'2026-02-30'`, `''`, `20261101` y `undefined` → `TypeError`.
341. `msHastaMedianocheMadrid`: `new Date('2026-11-01T22:59:00Z')` → `60000`; `'2026-11-01T23:00:00Z'` (medianoche exacta) → `86 400 000`; día de 23 h: `'2027-03-27T23:00:00Z'` → `82 800 000`, `'2027-03-28T00:59:59Z'` → `75 601 000`, `'2027-03-28T01:00:00Z'` → `75 600 000`; día de 25 h: `'2026-10-24T22:00:00Z'` → `90 000 000`, `'2026-10-25T00:30:00Z'` → `81 000 000`, `'2026-10-25T01:30:00Z'` → `77 400 000`. `formatearCuentaAtras(msHastaMedianocheMadrid(new Date('2026-10-24T22:00:01Z')))` → `'24:59:59'`. Para cada hora en punto de 2026 y 2027 (instante `t`, resultado `r`): `0 < r ≤ 90 000 000`, `fechaMadrid(t + r) === sumarDias(fechaMadrid(t), 1)` y `fechaMadrid(t + r − 1) === fechaMadrid(t)`.
342. **Zonas horarias**: un guion que imprime los resultados de 338 a 341 se ejecuta en procesos hijos con `TZ` = `Europe/Madrid`, `America/Mexico_City`, `America/New_York`, `Asia/Tokyo` y `UTC`, y las cinco salidas son idénticas byte a byte. Dentro de cada hijo, además: con `America/Mexico_City`, `new Date('2026-11-01T22:59:59Z')` es el día 1 a las 16 h locales y `fechaMadrid` da `'2026-11-01'`; `'2026-11-01T23:00:00Z'` sigue siendo el día 1 local (17:00) y da `'2026-11-02'`; con `America/New_York`, `'2026-11-01T23:00:00Z'` es el día 1 a las 18:00 EST y da `'2026-11-02'`; con `Asia/Tokyo`, `'2026-11-01T15:30:00Z'` ya es el día 2 local (00:30) y da `'2026-11-01'`. Ventanas de desfase de Nueva York (19:00 local): `'2026-10-28T22:59:59Z'` → `'2026-10-28'` y `msHastaMedianocheMadrid` → `1000`; `'2027-03-20T22:59:59Z'` → `'2027-03-20'` y `1000`.
343. Entradas no válidas y retiradas: `fechaMadrid(new Date(NaN))`, `fechaMadrid('2026-11-01')`, `fechaMadrid(undefined)` y `fechaMadrid(Infinity)` → `TypeError`. Tras la tarea 137: `js/diario.js` no exporta `fechaLocal` ni `msHastaMedianoche`; ningún archivo de `js/` ni `herramientas/` contiene `fechaLocal`, `msHastaMedianoche(`, `getFullYear`, `getMonth(`, `getDate(`, `getDay(`, `getHours(` ni `getTimezoneOffset`; el literal `Europe/Madrid` aparece en `js/` y `herramientas/` solo en la declaración de `ZONA_JUEGO` (test de búsqueda en `tests/`).

### Herramientas (node --test y revisión)

344. `validar.mjs`, `lanzamiento.mjs`, `importar.mjs` e `importar-afirmaciones.mjs` toman por defecto `hoyISO = fechaMadrid(new Date())` (revisión); sus tests siguen inyectando `hoyISO`. `paginas.mjs` importa `fechaMadrid` de `js/diario.js` y no declara otra función de fecha con zona.
350. `ultimoDiaArchivable` (sustituye a 312): `Date.parse('2026-12-01T22:59:59Z')` → `'2026-11-30'`; `'2026-12-01T23:00:00Z'` → `'2026-12-01'`; `'2026-12-01T23:10:00Z'` (Action, invierno) → `'2026-12-01'`; `'2027-06-30T21:59:59Z'` → `'2027-06-29'`; `'2027-06-30T22:10:00Z'` (Action, verano) → `'2027-06-30'`; `'2026-12-31T23:00:00Z'` → `'2026-12-31'`; cambios de hora: `'2026-10-24T22:10:00Z'` → `'2026-10-24'`, `'2026-10-25T23:10:00Z'` → `'2026-10-25'`, `'2027-03-27T23:10:00Z'` → `'2027-03-27'`, `'2027-03-28T22:10:00Z'` → `'2027-03-28'`. Igual en procesos hijos con `TZ` = `Europe/Madrid`, `America/Mexico_City`, `America/New_York`, `Asia/Tokyo`, `UTC`, `Pacific/Kiritimati` y `Pacific/Pago_Pago`.
351. `diasArchivables` (sustituye a 314): lanzamiento `2026-12-01`, 7 días en los datos; con `ahora = 2026-12-03T22:59:59Z` (23:59:59 del día 3 en Madrid, ya día 4 en Tokio) se archivan exactamente los días 1 y 2; con `2026-12-03T23:00:00Z` (aún día 3 en Nueva York), los días 1 a 3. Mismas comprobaciones de 314: ningún texto ni id de los días no archivados en todo el `Map`, y el espía no ve ninguna llamada a `desofuscarFicha`, `desofuscarAfirmacion` ni `desofuscarAclaracion` con un `n` no archivado.
352. `.github/workflows/archivo.yml` (sustituye a 320): `schedule` con **exactamente dos** líneas, `cron: '10 22 * * *'` y `cron: '10 23 * * *'` (ninguna `15 12`); `workflow_dispatch`; el primer paso es `id: hora`, antes del `checkout`, con `TZ=Europe/Madrid date +%H` y la condición sobre `GITHUB_EVENT_NAME = schedule`; todos los pasos siguientes llevan `if: steps.hora.outputs.seguir == 'si'`; el resto, como 320 (`permissions: {}`, `contents: write` solo en el trabajo, `if` de `main`, `concurrency` sin cancelar, Node 20, `npm ci`, `npm run paginas`, `npm run validar`, `git add -- en es sitemap.xml`, fallo con cambios fuera de esas rutas, commit solo con cambios y su mensaje, `git push`, sin secretos).
353. **Una ejecución por noche** (node --test, sin GitHub): para cada día UTC de 2026 y 2027, de los instantes `T22:10:00Z` y `T23:10:00Z` exactamente uno tiene hora `00` en Madrid (partes de `Intl` con `ZONA_JUEGO`), y para ese instante `ultimoDiaArchivable` es la fecha UTC de ese mismo día (el día que acaba de terminar en Madrid). Revisión en Linux: `TZ=Europe/Madrid date -d @{epoch de 2026-12-01T22:10Z} +%H` → `23` y de `2026-12-01T23:10Z` → `00`; de `2027-06-30T22:10Z` → `00` y de `2027-06-30T23:10Z` → `01`.
354. `node herramientas/paginas.mjs --ultimo` (322 con la regla nueva): imprime el `n` del último día con `fecha ≤ ultimoDiaArchivable(Date.now())` (`0` sin archivo) y no escribe nada; con el lanzamiento real, a partir del 2026-11-01T23:00:00Z imprime `1`.

### Textos y contenido (node --test y revisión)

355. `TEXTOS.en.portada.pie` contiene "at midnight, Spanish time (CET)" y `TEXTOS.es.portada.pie` contiene "a medianoche, hora de España"; las dos ≤ 48 caracteres. Ningún valor de `TEXTOS` (los dos idiomas), ningún archivo de `herramientas/contenido/` ni ninguna página generada contiene (sin distinguir mayúsculas) "local time", "your time zone", "last time zone", "everywhere in the world", "hora local", "hora de tu dispositivo", "última zona horaria" ni "en todo el mundo" referido al cierre de un caso.
356. Portada sin deslizar con el `portada.pie` nuevo en los 5 tamaños garantizados y los dos idiomas (R8 ampliada; repetición de 267 y 302, Playwright).
357. (Revisión de asuntos-internos) Cómo jugar, preguntas frecuentes, Sobre el juego y la introducción del archivo, en los dos idiomas, dicen que el día cambia a la vez para todos a medianoche, hora de España; ninguno promete la medianoche local ni lista horas locales equivalentes.

### Juego (Playwright con `timezoneId` del contexto y `page.clock`, sobre `npx serve`, con el lanzamiento 2026-11-01 de los datos o una copia de prueba)

345. En contextos con `timezoneId` `Europe/Madrid`, `America/Mexico_City`, `America/New_York` y `Asia/Tokyo` y el reloj fijado en `2026-11-01T22:59:00Z`, la portada muestra "Case #1" con el tema del día 1 (en Tokio son ya las 07:59 del día 2 local); con `2026-11-01T23:00:30Z`, "Case #2" con el tema del día 2 (en Ciudad de México son las 17:00 del día 1 local).
346. **Cambio en vivo**: con el reloj en `2026-11-01T22:59:55Z` y avanzándolo 10 s sin recargar: en `portada`, `instrucciones` y `ya-jugado` se acaba en la portada del día 2 como mucho 1,5 s después de `23:00:00Z` (una sola entrada de navegación); en `sin-casos` de un día sin caso, se pasa a la portada si el día nuevo lo tiene. Con una partida de Fact or Fake empezada a las `22:59:55Z`: sigue en `caso`, al terminar se guarda en `identifaiit.v3` con la fecha `2026-11-01` y `n: 1`, el resultado muestra `#resultado-nuevo-caso` y "Back" lleva a la portada del día 2. Con `?fecha=2026-11-03` en `localhost`, cruzar la medianoche no cambia nada.
347. **Cuenta atrás**: con el reloj en `2026-11-01T17:00:00Z` (18:00 en Madrid), `ya-jugado` muestra "Next case in 06:00:00" ("Próximo caso en 06:00:00" en `/es/`) y `#resultado-cuenta-atras` muestra `06:00:00`, igual en las cuatro zonas de 345; un segundo después, `05:59:59`.
348. **Intento, racha y compartir**: en `America/New_York`, Images jugado a las `2026-11-01T22:00:00Z` (17:00 local) y otra vez a las `2026-11-02T00:30:00Z` (19:30 del día 1 local): `identifaiit.v3` tiene las partidas `2026-11-01` (`n: 1`) y `2026-11-02` (`n: 2`), la racha de Images es 2 y el segundo texto compartido empieza por "identifAI-it Images #2" y lleva "Streak: 2". En `Asia/Tokyo`: a las `2026-11-01T15:30:00Z` (00:30 del día 2 local) el caso es el #1 y se guarda como `2026-11-01`; abrir Images a las `2026-11-01T22:00:00Z` (07:00 local) lleva a `ya-jugado`.
349. **Lanzamiento**: con el reloj en `2026-10-31T22:59:59Z` (23:59:59 del día 31 en Madrid) el juego muestra `sin-casos` con `sin_casos.texto`; en `2026-10-31T23:00:00Z`, la portada con "Case #1" (también en Ciudad de México, donde son las 17:00 del 31 local); en `2026-11-07T23:00:00Z` (día 8 en Madrid), `sin-casos` con `sin_casos.texto` y `noindex`. `npm run validar` pasa con `PRUEBAS_ABIERTAS = false` y falla con `true` (el lanzamiento ya ha llegado); `/en/?prueba=1` se comporta como `/en/`.

## 11.9 Plan de tareas (9.18)

Una tarea = un commit con mensaje en español, delegada de una en una y revisada antes de la siguiente.

| # | Tarea | Agente | Depende de | Commit |
|---|---|---|---|---|
| 141 | **Solo si `data/calendario.json` aún no tiene `lanzamiento: "2026-11-01"`** y el usuario acepta DP-109: `comprobarCambioLanzamiento` admite `nuevo === hoyISO` cuando `actual === null`; tests; después el usuario ejecuta `npm run lanzamiento -- 2026-11-01`. | archivero | P9 | `fix: permitir lanzar el mismo día sin fecha previa` |
| 131 | `js/diario.js`: `ZONA_JUEGO`, `fechaMadrid`, `medianocheMadrid`, `msHastaMedianocheMadrid` (11.2), sin retirar todavía `fechaLocal` ni `msHastaMedianoche`. Tests 338–342 y la parte de entradas no válidas de 343. | agente-de-campo | P9 | `feat: fecha del juego en hora de Madrid` |
| 133 | Herramientas: `hoyISO` por defecto con `fechaMadrid` en `validar`, `lanzamiento`, `importar` e `importar-afirmaciones`; `ultimoDiaArchivable` de 11.5.1 en `paginas.mjs`. Tests 350, 351 y 354; los de 312 y 314 se sustituyen. | archivero | 131 | `feat: archivo y herramientas con la fecha de Madrid` |
| 132 | `js/main.js`: `hoy()` y `nHoy` con `fechaMadrid`, cuenta atrás con `msHastaMedianocheMadrid`, vigía de medianoche (11.4). `npm test`. | agente-de-campo | 131 | `feat: el día cambia a medianoche de Madrid` |
| 135 | `js/textos.js` (`portada.pie` en `en` y `es`) y las 8 páginas de `herramientas/contenido/` de 11.6. Enseñarlo al usuario. Test 355 (parte de `TEXTOS` y contenido). | cronista | P9 | `docs: el día cambia a medianoche, hora de España` |
| 136 | `npm run paginas`, `npm test`, `npm run validar`; commit de lo generado (`en/`, `es/`). | archivero | 133, 135 | `datos: páginas con la hora de España` |
| 134 | `.github/workflows/archivo.yml` de 11.5.2. Test 353 y revisión 352. | archivero | 133 | `feat: Action del archivo a medianoche de Madrid` |
| 137 | Retirar `fechaLocal` y `msHastaMedianoche` de `js/diario.js` y sus tests (1 y 4 pasan a 338 y 341); test de búsqueda 343. | agente-de-campo | 132, 133 | `fix: retirar las fechas en hora local` |
| 138 | Playwright (Chromium y WebKit, con `npx`): 345–349 y 356. Informe al agente responsable. | agente-de-campo | 136, 137 | — (no edita el proyecto) |
| 139 | Revisión de 338–357 y anti-trampas: ningún día se archiva antes de la medianoche de Madrid, nada de hoy ni del futuro, la Action no puede publicar fuera de `en/`, `es/` y `sitemap.xml`. | asuntos-internos | 138 | — (no edita) |
| 140 | Usuario: publicar 131–137 **en un solo push** a `main`; la primera noche (2026-11-01 → 02), comprobar en Actions que la ejecución de las 22:10 UTC termina con "no toca" y la de las 23:10 UTC (00:10 CET) archiva el Caso #1, y que Pages se despliega (323). | usuario | 139 | — |

Orden: P9 → (141 si hace falta) → 131 → 133 → 132 → 135 → 136 → 134 → 137 → 138 → 139 → 140.

**Publicación conjunta (R39)**: `ultimoDiaArchivable` nuevo (133) con el juego viejo (medianoche local) publicaría el día D mientras en América aún se juega. Por eso nada de 133 ni 134 llega a `main` sin 132. Mientras tanto, la Action actual (`15 12 * * *`, regla de UTC−12) sigue siendo segura.

## 11.10 Riesgos nuevos

- **R38. Partida empezada antes de medianoche** (11.5.1): puede coincidir unos minutos con el archivo del mismo día. Aceptado.
- **R39. Orden de publicación** (11.9): el archivo con la regla nueva y el juego con la vieja revelarían respuestas a jugadores de América. Mitigación: un solo push.
- **R40. Retrasos de GitHub** (DP-110): una ejecución programada que empieza después de las 00:59 de Madrid no hace nada; el archivo llega un día tarde, nunca antes.
- **R41. Datos de zonas horarias**: si la UE suprime el cambio de hora, los navegadores, Node y el ejecutor de la Action lo recogen con sus actualizaciones de `tzdata`; los criterios 339–341, 350 y 353 con fechas posteriores al cambio habría que revisarlos entonces (decisión nueva). Un navegador sin datos IANA (muy antiguo) muestra la pantalla de error.
- **R42. Día sin casos** (DP-111): el 2026-11-08 el juego muestra `sin-casos`, rompe todas las rachas y lleva `noindex` dinámico, que un buscador podría ver ese día.

## 11.11 Cambios fuera de docs/ (requisito P9; los aplica el usuario)

**`CLAUDE.md`**, texto exacto propuesto:

1. "Reglas del juego", primera línea: sustituir "Los dos se lanzan juntos en una fecha que decide el usuario (configurable con `npm run lanzamiento`, todavía sin fijar) y el modo prueba (`?prueba=1`) sigue abierto hasta entonces." por **"Los dos se lanzaron juntos el 2026-11-01 (Caso #1; la fecha está en data/calendario.json y ya no se cambia). El modo prueba (`?prueba=1`) está cerrado (PRUEBAS_ABIERTAS = false); la previsualización local con ?fecha= sigue."**
2. "Reglas del juego", línea del intento: sustituir "El día cambia a medianoche, hora local." por **"El día cambia para todos a la vez a las 00:00 hora de España (zona Europe/Madrid, con su horario de verano e invierno), no a la medianoche de cada jugador: el caso del día, el intento, la racha y el texto compartido usan la fecha de Madrid. El resultado y la pantalla de ya jugado muestran la cuenta atrás hasta el próximo caso."**
3. "Reglas del juego", línea del archivo: sustituir "cada día ya terminado en todo el mundo tiene su página pública" por **"cada día ya terminado (pasada la medianoche, hora de España) tiene su página pública"**, y "Lo regenera cada día una GitHub Action que solo corre en main." por **"Lo regenera cada día, poco después de la medianoche de España, una GitHub Action que solo corre en main."**
4. "Estructura", línea de la Action: sustituir ".github/workflows/archivo.yml: la Action diaria del archivo." por **".github/workflows/archivo.yml: la Action diaria del archivo (dos cron en UTC, 22:10 y 23:10; solo trabaja la que cae a las 00:xx de Madrid)."**
5. "Anti-trampas", línea del DOM: sustituir "solo de días ya terminados en todas las zonas horarias (spec 10.8)" por **"solo de días ya terminados según la hora de España, es decir, anteriores al día en curso en Madrid (spec 10.8 y 11)"**.

**`.claude/`** (usuario o agente principal, antes de delegar la tarea de cada agente):
- `agents/archivero.md`: la Action pasa de `15 12 * * *` a los dos `cron` de 11.5.2 con la comprobación de la hora de Madrid; `hoyISO` de las herramientas con `fechaMadrid`; `ultimoDiaArchivable` de 11.5.1.
- `agents/agente-de-campo.md`: el día del juego sale siempre de `fechaMadrid` (nunca de la hora local); tests con varias zonas en procesos hijos y Playwright con `timezoneId`.
- `agents/asuntos-internos.md`: ningún día se archiva antes de la medianoche de Madrid; publicación conjunta de 131–137 (R39).
- `agents/cronista.md`: el cambio de día se nombra "at midnight, Spanish time (CET)" / "a medianoche, hora de España"; nunca "hora local".
