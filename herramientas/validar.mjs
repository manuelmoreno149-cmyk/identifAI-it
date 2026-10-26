// Validador (spec 4.4.3). Termina con código 1 si hay errores; los avisos no fallan.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, posix } from 'node:path';
import sharp from 'sharp';
import { desofuscar, desofuscarFicha, diasEntre, fechaLocal, sumarDias, validarCalendario } from '../js/diario.js';
import { TEXTOS } from '../js/textos.js';
import {
  contienePalabraProhibida,
  contieneSubcadenaProhibida,
  analizarPesos,
  mensajePeso,
  POSICIONES_RECORTE,
  avisosMezcla,
  analizarPruebasAbiertas,
  distanciaHamming,
  FUENTES
} from './temas.mjs';
import { TIPOGRAFIAS, creditosParaBanco } from './creditos.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const p = (...r) => join(RAIZ, ...r);
const estricto = process.argv.includes('--estricto');

const errores = [];
const avisos = [];
const error = (m) => errores.push(m);
const aviso = (m) => avisos.push(m);
const leer = (ruta) => readFileSync(p(ruta), 'utf8');

function listar(dir, ext) {
  const d = p(dir);
  if (!existsSync(d)) return [];
  return readdirSync(d).filter((f) => !ext || f.toLowerCase().endsWith(ext));
}

// ---------- Calendario ----------

let calendario = null;
if (!existsSync(p('data', 'calendario.json'))) {
  error('No existe data/calendario.json.');
} else {
  try {
    calendario = JSON.parse(leer('data/calendario.json'));
  } catch (e) {
    error(`data/calendario.json no es JSON válido: ${e.message}`);
  }
}

const dias = [];
if (calendario) {
  if (calendario.version === 2) {
    error('data/calendario.json es de la versión 2 (sin fichas): reimporta con npm run importar -- --reimportar --confirmar.');
  } else if (calendario.version !== 3) {
    error(`data/calendario.json: version debe ser 3 (es ${calendario.version}).`);
  }
  if (typeof calendario.lanzamiento !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(calendario.lanzamiento) || Number.isNaN(Date.parse(calendario.lanzamiento))) error(`data/calendario.json: lanzamiento debe ser una fecha ISO válida (es "${calendario.lanzamiento}").`);
  if (calendario.version !== 2 && !validarCalendario(calendario)) {
    error('data/calendario.json no cumple la estructura de la versión 3 (campos, tema, 5 ids distintos, clave de 5 bytes, 5 fichas).');
  }
  if (Array.isArray(calendario.dias)) dias.push(...calendario.dias);
}

const vistos = new Map();
for (const d of dias) {
  const etiqueta = `Día ${d?.n}`;
  if (!d || !Array.isArray(d.pruebas)) continue;
  if (typeof calendario.lanzamiento === 'string' && d.fecha !== sumarDias(calendario.lanzamiento, d.n - 1)) {
    error(`${etiqueta}: la fecha ${d.fecha} no corresponde a n.`);
  }
  const pal = contienePalabraProhibida(d.tema ?? '');
  if (pal) error(`${etiqueta}: el tema "${d.tema}" contiene la palabra prohibida "${pal}".`);
  let g = 0;
  d.pruebas.forEach((id, i) => {
    if (vistos.has(id)) error(`${etiqueta}: el id ${id} ya aparece en el día ${vistos.get(id)}.`);
    vistos.set(id, d.n);
    const sub = contieneSubcadenaProhibida(id);
    if (sub) error(`${etiqueta}: el id ${id} contiene "${sub}".`);
    try {
      g += desofuscar(d.clave, d.n, i);
    } catch {
      /* clave inválida ya notificada */
    }
  });
  if (g < 1 || g > 4) error(`${etiqueta}: tiene ${g} generadas; debe tener entre 1 y 4.`);
}

// ---------- Fichas [D-86, D-87] ----------

const sinPromptPorDia = new Map();
{
  const { autentica, sin_prompt: sinPrompt } = TEXTOS?.fichas ?? {};
  const textoOk = (t) => typeof t === 'string' && t.trim() !== '';
  if (!textoOk(autentica) || !textoOk(sinPrompt) || autentica === sinPrompt) {
    error('TEXTOS.fichas (js/textos.js) no es válido: autentica y sin_prompt deben existir, no estar vacías y ser distintas.');
  } else if (calendario && calendario.version === 3) {
    for (const d of dias) {
      if (!d || !Array.isArray(d.pruebas) || !Array.isArray(d.fichas)) continue;
      let descifrables = true;
      let descuadre = false;
      d.pruebas.forEach((_, i) => {
        const texto = desofuscarFicha(d.fichas[i], d.clave, d.n, i);
        if (texto === null) {
          descifrables = false;
          error(`La ficha ${i + 1} del día ${d.n} no se puede descifrar.`);
          return;
        }
        let generada;
        try {
          generada = desofuscar(d.clave, d.n, i) === 1;
        } catch {
          return;
        }
        if (!generada && texto !== autentica) descuadre = true;
        if (generada && texto === autentica) descuadre = true;
        if (generada && texto === sinPrompt) sinPromptPorDia.set(d.n, (sinPromptPorDia.get(d.n) ?? 0) + 1);
      });
      if (descifrables && descuadre) error(`El día ${d.n} tiene fichas que no cuadran con su clave.`);
    }
  }
}

// ---------- Imágenes ----------

const tamanos = new Map();
for (const [id, n] of vistos) {
  const ruta = p('casos', `${id}.webp`);
  if (!existsSync(ruta)) {
    error(`Día ${n}: falta casos/${id}.webp.`);
    continue;
  }
  tamanos.set(id, statSync(ruta).size);
  try {
    const m = await sharp(ruta).metadata();
    if (m.format !== 'webp') error(`casos/${id}.webp no es WebP (es ${m.format}).`);
    if (m.width !== 1080 || m.height !== 1350) error(`casos/${id}.webp mide ${m.width} x ${m.height}; debe medir 1080 x 1350.`);
    for (const campo of ['exif', 'xmp', 'icc', 'iptc']) {
      if (m[campo]) error(`casos/${id}.webp conserva metadatos (${campo}).`);
    }
  } catch (e) {
    error(`casos/${id}.webp no se puede leer: ${e.message}`);
  }
}
const enCasos = listar('casos');
for (const f of enCasos) {
  const sub = contieneSubcadenaProhibida(f);
  if (sub) error(`casos/${f}: el nombre contiene "${sub}".`);
  if (!/^[a-z0-9]{10}\.webp$/.test(f)) error(`casos/${f}: el nombre no es un id de 10 caracteres [a-z0-9] con extensión .webp.`);
  if (!vistos.has(f.replace(/\.webp$/, ''))) aviso(`casos/${f} no aparece en el calendario.`);
}

// ---------- Archivos publicados ----------

for (const f of ['.nojekyll', 'creditos.html', 'index.html']) {
  if (!existsSync(p(f))) error(`Falta ${f} en la raíz.`);
}

for (const t of TIPOGRAFIAS) {
  if (!existsSync(p(t.archivo)) || statSync(p(t.archivo)).size === 0) error(`Falta el archivo de licencia ${t.archivo} o está vacío.`);
}
if (existsSync(p('css', 'base.css'))) {
  for (const m of leer('css/base.css').matchAll(/url\(\s*["']?\.\.\/(fonts\/[^"')]+\.woff2)/g)) {
    if (!existsSync(p(m[1]))) error(`css/base.css referencia ${m[1]}, que no existe.`);
  }
}

const atributo = /([a-zA-Z][\w:-]*)\s*=\s*"([^"]*)"/g;

function revisarHtml(nombre) {
  if (!existsSync(p(nombre))) return;
  const html = leer(nombre);
  for (const tag of html.matchAll(/<[a-zA-Z][^>]*>/g)) {
    for (const [, attr, valor] of tag[0].matchAll(atributo)) {
      const a = attr.toLowerCase();
      if (a.startsWith('data-')) {
        const pn = contienePalabraProhibida(a);
        if (pn) error(`${nombre}: el atributo ${a} contiene "${pn}".`);
      }
      if (a === 'id' || a === 'class' || a === 'alt' || a.startsWith('data-') || a === 'href' || a === 'src') {
        if (a === 'id' || a === 'class' || a === 'alt' || a.startsWith('data-')) {
          const pv = contienePalabraProhibida(valor);
          if (pv) error(`${nombre}: ${a}="${valor}" contiene la palabra prohibida "${pv}".`);
        } else {
          const pv = contienePalabraProhibida(valor);
          if (pv) error(`${nombre}: ${a}="${valor}" contiene la palabra prohibida "${pv}".`);
          if (/^(https?:)?\/\//i.test(valor)) error(`${nombre}: ${a}="${valor}" es una URL externa.`);
          else if (!/^(#|mailto:|tel:|data:)/i.test(valor) && valor !== '') {
            const limpio = valor.split(/[?#]/)[0];
            comprobarRuta(nombre, limpio, ``);
          }
        }
      }
    }
  }
}

function comprobarRuta(origen, ruta, base) {
  const destino = posix.normalize(posix.join(base, ruta));
  if (destino.startsWith('..') || destino.startsWith('/')) {
    error(`${origen}: la ruta ${ruta} sale del sitio o es absoluta.`);
    return;
  }
  const partes = destino.split('/');
  let dir = RAIZ;
  for (const parte of partes) {
    if (!existsSync(dir) || !statSync(dir).isDirectory() || !readdirSync(dir).includes(parte)) {
      error(`${origen}: ${ruta} no existe (se distingue entre mayúsculas y minúsculas).`);
      return;
    }
    dir = join(dir, parte);
  }
}

revisarHtml('index.html');
revisarHtml('creditos.html');

// Nombres de archivos publicados.
function recorrer(dir) {
  const d = p(dir);
  if (!existsSync(d)) return [];
  const r = [];
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) r.push(...recorrer(rel));
    else r.push(rel);
  }
  return r;
}
for (const f of [...recorrer('css'), ...recorrer('js'), ...recorrer('img'), ...recorrer('fonts'), ...recorrer('data')]) {
  const pn = contienePalabraProhibida(f.split('/').pop());
  if (pn) error(`${f}: el nombre de archivo contiene "${pn}".`);
}

// URL externas.
for (const f of ['index.html', 'creditos.html', ...recorrer('css'), ...recorrer('js')]) {
  if (!existsSync(p(f))) continue;
  const t = leer(f);
  if (/https?:\/\//i.test(t)) error(`${f}: contiene una URL externa (http:// o https://).`);
  if (/(?:href|src)\s*=\s*["']\/\//i.test(t) || /url\(\s*["']?\/\//i.test(t) || /@import/i.test(t)) {
    error(`${f}: referencia un recurso externo o importado.`);
  }
}

// creditos.html
if (existsSync(p('creditos.html')) && existsSync(p('index.html'))) {
  const c = leer('creditos.html');
  const cspIndex = leer('index.html').match(/<meta http-equiv="Content-Security-Policy"[^>]*>/)?.[0];
  if (!/<html lang="en">/.test(c)) error('creditos.html: falta <html lang="en">.');
  if (!/<title>[^<]+<\/title>/.test(c)) error('creditos.html: falta <title>.');
  if (!/<meta name="viewport"/.test(c)) error('creditos.html: falta el viewport.');
  if (!cspIndex || !c.includes(cspIndex)) error('creditos.html: la CSP no es idéntica a la de index.html.');
  if (!/<a id="creditos-volver" href="index\.html">/.test(c)) error('creditos.html: #creditos-volver debe apuntar a index.html.');
  if (/<script/i.test(c)) error('creditos.html: contiene <script>.');
  if (/\sstyle\s*=/i.test(c)) error('creditos.html: contiene atributo style.');
  for (const id of vistos.keys()) if (c.includes(id)) error(`creditos.html: contiene el id de imagen ${id}.`);
  if (!c.endsWith('\n') || c.endsWith('\n\n') || c.includes('\r')) error('creditos.html: debe usar LF y terminar con un único salto de línea.');
}

// ---------- Git e ignorados ----------

const PRIVADOS = ['herramientas/banco.json', 'herramientas/banco.anterior.json', 'herramientas/lote.json'];
try {
  const gi = leer('.gitignore').split(/\r?\n/).map((l) => l.trim());
  for (const f of [...PRIVADOS, 'entrada/']) if (!gi.includes(f)) error(`.gitignore no incluye ${f}.`);
} catch {
  error('No se puede leer .gitignore.');
}
try {
  for (const f of PRIVADOS) {
    let rastreado = true;
    try {
      execFileSync('git', ['ls-files', '--error-unmatch', f], { cwd: RAIZ, stdio: 'pipe' });
    } catch {
      rastreado = false;
    }
    if (rastreado) error(`${f} está rastreado por git; debe quitarse del índice (sus rutas o tipos revelarían las respuestas).`);
  }
  const entrada = execFileSync('git', ['ls-files', 'entrada'], { cwd: RAIZ, stdio: 'pipe' }).toString().trim();
  if (entrada) error('Hay archivos de entrada/ rastreados por git.');
  const txt = execFileSync('git', ['ls-files', '*.txt'], { cwd: RAIZ, stdio: 'pipe' })
    .toString()
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter((x) => x && !x.startsWith('fonts/'));
  if (txt.length > 0) error(`Hay ${txt.length} archivo(s) .txt rastreados por git fuera de fonts/ (podrían ser prompts o fichas).`);
} catch {
  aviso('No se pudo consultar git; se omiten las comprobaciones de archivos rastreados.');
}

// ---------- Avisos de calendario ----------

const hoy = fechaLocal(new Date());
const futuros = dias.filter((d) => d.fecha >= hoy).length;
if (futuros < 7) aviso(`Quedan menos de 7 días de calendario a partir de hoy (${futuros}).`);

// Interruptor del modo prueba [D-71]
{
  const abiertas = analizarPruebasAbiertas(leer('js/main.js'));
  const lanzado = typeof calendario?.lanzamiento === 'string' && diasEntre(hoy, calendario.lanzamiento) <= 0;
  if (abiertas === null) {
    error('js/main.js debe declarar una sola vez const PRUEBAS_ABIERTAS = true; o const PRUEBAS_ABIERTAS = false; (D-71).');
  } else if (abiertas && (estricto || lanzado)) {
    error('El modo prueba sigue abierto: pon const PRUEBAS_ABIERTAS = false; en js/main.js antes de publicar (D-71).');
  } else if (abiertas) {
    aviso(`el modo prueba está abierto (PRUEBAS_ABIERTAS = true en js/main.js). Ponlo a false antes del lanzamiento (${calendario?.lanzamiento ?? 'sin calendario'}).`);
  }
}

if (sinPromptPorDia.size > 0) {
  const total = [...sinPromptPorDia.values()].reduce((a, b) => a + b, 0);
  const lista = [...sinPromptPorDia.keys()].map(String);
  const textoDias = lista.length === 1 ? `día ${lista[0]}` : `días ${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;
  aviso(`${total} ${total === 1 ? 'prueba generada no tiene prompt' : 'pruebas generadas no tienen prompt'} (${textoDias}).`);
}

const generadasPorDia = dias.map((d) => d.pruebas.reduce((s, _, i) => s + desofuscar(d.clave, d.n, i), 0));
for (const a of avisosMezcla(generadasPorDia)) aviso(a.replace(/^AVISO: /, ''));

const resumenPeso = analizarPesos({ dias, tamanos, desofuscar });
const msgPeso = mensajePeso(resumenPeso);
if (msgPeso) aviso(msgPeso.replace(/^AVISO: /, ''));

// ---------- Con banco ----------

let banco = null;
if (existsSync(p('herramientas', 'banco.json'))) {
  try {
    banco = JSON.parse(leer('herramientas/banco.json'));
  } catch (e) {
    error(`herramientas/banco.json no es JSON válido: ${e.message}`);
  }
} else if (estricto) {
  error('herramientas/banco.json no encontrado (modo --estricto).');
} else {
  aviso(
    'herramientas/banco.json no encontrado; se omiten las comprobaciones que dependen del banco (coherencia de tipos, temas y fuentes, duplicados y créditos completos).'
  );
}

if (banco) {
  if (banco.version !== 2 || !Array.isArray(banco.imagenes)) {
    error('herramientas/banco.json no es de la versión 2.');
  } else {
    const porId = new Map(banco.imagenes.map((i) => [i.id, i]));
    const porDia = new Map();
    for (const i of banco.imagenes) porDia.set(i.dia, (porDia.get(i.dia) ?? 0) + 1);
    for (const d of dias) {
      if (porDia.get(d.n) !== 5) error(`Banco: el día ${d.n} tiene ${porDia.get(d.n) ?? 0} imágenes; debe tener 5.`);
      d.pruebas.forEach((id, i) => {
        const e = porId.get(id);
        if (!e) return error(`Banco: falta el id ${id} (día ${d.n}).`);
        if (e.dia !== d.n || e.fecha !== d.fecha) error(`Banco: ${id} tiene dia/fecha distintos a los del calendario.`);
        if (e.tema !== d.tema) error(`Banco: ${id} tiene el tema "${e.tema}" y el calendario "${d.tema}".`);
        const tipo = desofuscar(d.clave, d.n, i) === 1 ? 'generada' : 'autentica';
        if (e.tipo !== tipo) error(`Banco: ${id} es "${e.tipo}" pero la clave del día ${d.n} dice "${tipo}".`);
        if (!FUENTES.some((f) => f.fuente === e.fuente && f.licencia === e.licencia && f.tipo === e.tipo)) {
          error(`Banco: ${id} tiene una fuente/licencia no válida para su tipo (${e.fuente} · ${e.licencia}).`);
        }
      });
    }
    for (const n of porDia.keys()) if (!dias.some((d) => d.n === n)) error(`Banco: el día ${n} no está en el calendario.`);
    for (let a = 0; a < banco.imagenes.length; a++) {
      for (let b = a + 1; b < banco.imagenes.length; b++) {
        if (distanciaHamming(banco.imagenes[a].dhash, banco.imagenes[b].dhash) <= 5) {
          error(`Banco: ${banco.imagenes[a].id} y ${banco.imagenes[b].id} son casi duplicadas (dHash).`);
        }
      }
    }
    const sinRecorte = banco.imagenes.filter((i) => i.recorte === undefined).length;
    for (const i of banco.imagenes) {
      if (i.recorte !== undefined && i.recorte !== 'atencion' && !Object.hasOwn(POSICIONES_RECORTE, i.recorte)) {
        error(`Banco: ${i.id} tiene un recorte no válido (${JSON.stringify(i.recorte)}).`);
      }
    }
    if (sinRecorte > 0) {
      aviso(
        `${sinRecorte} imágenes del banco no tienen recorte registrado (importadas antes de D-65). Reimporta con --reimportar si quieres aplicar el recorte por atención.`
      );
    }
    for (const f of enCasos) if (!porId.has(f.replace(/\.webp$/, ''))) aviso(`casos/${f} no está en el banco.`);
    if (existsSync(p('creditos.html')) && leer('creditos.html') !== creditosParaBanco(banco)) {
      error('creditos.html no coincide con lo que generaría creditos.mjs con el banco actual (ejecuta npm run creditos).');
    }
  }
}

// ---------- Resultado ----------

console.log(`Días en el calendario: ${dias.length}${dias.length ? ` (hasta ${dias[dias.length - 1].fecha})` : ''}.`);
if (resumenPeso.global) {
  const kb = (b) => (b / 1024).toFixed(0);
  console.log(
    `Peso medio: ${kb(resumenPeso.global.mediaAutentica)} KB las auténticas, ${kb(resumenPeso.global.mediaGenerada)} KB las generadas (diferencia ${(resumenPeso.global.diferencia * 100).toFixed(1)} %).`
  );
}
for (const a of avisos) console.log(`AVISO: ${a}`);
for (const e of errores) console.error(`ERROR: ${e}`);
if (errores.length > 0) {
  console.error(`\nValidación fallida: ${errores.length} error(es).`);
  process.exit(1);
}
console.log(`\nValidación correcta${avisos.length ? ` (${avisos.length} aviso(s))` : ''}.`);
