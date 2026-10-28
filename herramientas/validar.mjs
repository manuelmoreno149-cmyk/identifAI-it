// Validador (spec 4.4.3 y 4.12). Código 1 si hay errores; los avisos no fallan (salvo lo que dice --estricto).
// Lógica en `validar({raiz, estricto, hoyISO, git})` para poder probarla con raíces temporales; no lee entrada/ [D-139].
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, posix } from 'node:path';
import sharp from 'sharp';
import {
  DETALLES_MAX,
  desofuscar,
  desofuscarAclaracion,
  desofuscarAfirmacion,
  desofuscarFicha,
  diasEntre,
  fechaDelDia,
  fechaLocal,
  sumarDias,
  validarCalendario
} from '../js/diario.js';
import { TEXTOS } from '../js/textos.js';
import {
  contienePalabraProhibida,
  contieneSubcadenaProhibida,
  analizarPesos,
  avisosPesoPorDia,
  avisosPesoMediana,
  mensajePeso,
  POSICIONES_RECORTE,
  avisosMezcla,
  analizarPruebasAbiertas,
  distanciaHamming,
  FUENTES
} from './temas.mjs';
import {
  ACLARACION_MAX,
  AFIRMACION_MAX,
  DETALLE_MAX,
  avisosLongitud,
  leerAfirmacionesMensuales,
  normalizarParaDuplicados,
  unirMeses
} from './afirmaciones.mjs';
import { TIPOGRAFIAS, creditosParaBanco } from './creditos.mjs';

const RAIZ_REAL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const puntos = (t) => Array.from(t).length;
// La fecha del antiguo lanzamiento fijo no puede aparecer en el código [D-95]; se arma por partes para que este archivo no la contenga.
const FECHA_FIJA_ANTIGUA = ['2026', '11', '01'].join('-');

function fechaIso(x) {
  return typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x)) && sumarDias(x, 0) === x;
}

// 0/1 (1 = generada o falsa) o null si la clave no se puede leer.
function generadaDe(d, i) {
  try {
    return desofuscar(d.clave, d.n, i);
  } catch {
    return null;
  }
}

const esTexto = (x) => typeof x === 'string';

function diaImagenesUtil(d) {
  return (
    d &&
    Number.isInteger(d.n) &&
    esTexto(d.clave) &&
    Array.isArray(d.pruebas) &&
    d.pruebas.length === 5 &&
    d.pruebas.every(esTexto)
  );
}

function listaDias(n) {
  if (n.length === 1) return `el día ${n[0]}`;
  const rango = n.length === 2 ? `${n[0]} y ${n[1]}` : `${n[0]} a ${n[n.length - 1]}`;
  return `los días ${rango}`;
}

export async function validar({ raiz = RAIZ_REAL, estricto = false, hoyISO = fechaLocal(new Date()), git = true } = {}) {
  const p = (...r) => join(raiz, ...r);
  const errores = [];
  const avisos = [];
  const error = (m) => errores.push(m);
  const aviso = (m) => avisos.push(m);
  const leer = (ruta) => readFileSync(p(ruta), 'utf8');
  const listar = (dir) => (existsSync(p(dir)) ? readdirSync(p(dir)) : []);
  const hoy = hoyISO;

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

  let lanzamiento = null; // solo si es válido
  const dias = [];
  if (calendario && typeof calendario === 'object') {
    if (calendario.version === 2) {
      error('data/calendario.json es de la versión 2 (sin fichas): reimporta con npm run importar -- --reimportar --confirmar.');
    } else if (calendario.version === 3) {
      error('data/calendario.json es de la versión 3: conviértelo con npm run lanzamiento.');
    } else if (calendario.version !== 4) {
      error(`data/calendario.json: version debe ser 4 (es ${calendario.version}).`);
    } else {
      if (calendario.lanzamiento === null) lanzamiento = null;
      else if (fechaIso(calendario.lanzamiento)) lanzamiento = calendario.lanzamiento;
      else error(`data/calendario.json: lanzamiento debe ser null o una fecha ISO válida (es ${JSON.stringify(calendario.lanzamiento)}).`);
      if (!validarCalendario(calendario)) {
        error('data/calendario.json no cumple la estructura de la versión 4 (campos, tema, 5 ids distintos, clave de 5 bytes, 5 fichas, sin fecha por día).');
      }
    }
    if (calendario.version === 4 && Array.isArray(calendario.dias)) dias.push(...calendario.dias.filter(diaImagenesUtil));
  }
  const version4 = calendario?.version === 4;

  const vistos = new Map();
  for (const d of dias) {
    const etiqueta = `Día ${d.n}`;
    const pal = contienePalabraProhibida(d.tema ?? '');
    if (pal) error(`${etiqueta}: el tema "${d.tema}" contiene la palabra prohibida "${pal}".`);
    let g = 0;
    d.pruebas.forEach((id, i) => {
      if (vistos.has(id)) error(`${etiqueta}: el id ${id} ya aparece en el día ${vistos.get(id)}.`);
      vistos.set(id, d.n);
      const sub = contieneSubcadenaProhibida(id);
      if (sub) error(`${etiqueta}: el id ${id} contiene "${sub}".`);
      g += generadaDe(d, i) ?? 0;
    });
    if (g < 1 || g > 4) error(`${etiqueta}: tiene ${g} generadas; debe tener entre 1 y 4.`);
  }

  // ---------- Fichas de Images [D-86, D-87] ----------

  const sinPromptPorDia = new Map();
  {
    const { autentica, sin_prompt: sinPrompt } = TEXTOS?.fichas ?? {};
    const textoOk = (t) => typeof t === 'string' && t.trim() !== '';
    if (!textoOk(autentica) || !textoOk(sinPrompt) || autentica === sinPrompt) {
      error('TEXTOS.fichas (js/textos.js) no es válido: autentica y sin_prompt deben existir, no estar vacías y ser distintas.');
    } else if (version4) {
      for (const d of dias) {
        if (!Array.isArray(d.fichas)) continue;
        let descifrables = true;
        let descuadre = false;
        d.pruebas.forEach((_, i) => {
          const texto = desofuscarFicha(d.fichas[i], d.clave, d.n, i);
          if (texto === null) {
            descifrables = false;
            error(`La ficha ${i + 1} del día ${d.n} no se puede descifrar.`);
            return;
          }
          const generada = generadaDe(d, i) === 1;
          if (generadaDe(d, i) === null) return;
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
      const m = await sharp(readFileSync(ruta)).metadata();
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

  // ---------- Fact or Fake: data/facts/ [4.12, D-131, D-139] ----------

  if (existsSync(p('data', 'titulares')) || existsSync(p('data', 'titulares.json'))) {
    error('Headlines ya no existe: borra data/titulares/.');
  }

  const temasImagenes = new Map(dias.map((d) => [d.n, d.tema]));
  const { dias: diasFact, errores: erroresFact } = unirMeses(leerAfirmacionesMensuales(p('data', 'facts')), {
    lanzamiento,
    comprobarMes: true
  });
  for (const e of erroresFact) error(e);

  const fakesPorDia = [];
  const longitudes = [];
  const vistasAfirmaciones = new Map();
  for (const d of diasFact) {
    const etiqueta = `Día ${d.n} de Fact or Fake`;
    const pal = contienePalabraProhibida(d.tema ?? '');
    if (pal) error(`${etiqueta}: el tema "${d.tema}" contiene la palabra prohibida "${pal}".`);
    if (temasImagenes.has(d.n) && temasImagenes.get(d.n) !== d.tema) {
      error(`El tema del día ${d.n} no coincide entre Images y Fact or Fake.`);
    }
    let falsas = 0;
    const afirmaciones = [];
    for (let i = 0; i < 5; i++) {
      const esFalsa = generadaDe(d, i) === 1;
      if (esFalsa) falsas++;
      const claim = desofuscarAfirmacion(d.textos[i], d.clave, d.n, i);
      if (claim === null) {
        error(`La afirmación ${i + 1} del día ${d.n} de Fact or Fake no se puede descifrar.`);
      } else {
        if (puntos(claim) > AFIRMACION_MAX) error(`La afirmación ${i + 1} del día ${d.n} de Fact or Fake supera ${AFIRMACION_MAX} caracteres.`);
        afirmaciones.push({ tipo: esFalsa ? 'generada' : 'autentica', afirmacion: claim });
        const clave = normalizarParaDuplicados(claim);
        const previa = vistasAfirmaciones.get(clave);
        if (previa) {
          error(`Afirmación repetida en Fact or Fake: la ${i + 1} del día ${d.n} es igual a la ${previa.i + 1} del día ${previa.n}.`);
        } else {
          vistasAfirmaciones.set(clave, { n: d.n, i });
        }
      }
      const ficha = desofuscarAclaracion(d.fichas[i], d.clave, d.n, i);
      if (ficha === null) {
        error(`La aclaración ${i + 1} del día ${d.n} de Fact or Fake no se puede descifrar.`);
      } else {
        if (puntos(ficha.aclaracion) > ACLARACION_MAX) error(`La aclaración ${i + 1} del día ${d.n} de Fact or Fake supera ${ACLARACION_MAX} caracteres.`);
        if (ficha.detalles.length > DETALLES_MAX) error(`La aclaración ${i + 1} del día ${d.n} de Fact or Fake tiene más de ${DETALLES_MAX} detalles.`);
        if (ficha.detalles.some((t) => puntos(t) > DETALLE_MAX)) {
          error(`La aclaración ${i + 1} del día ${d.n} de Fact or Fake tiene un detalle de más de ${DETALLE_MAX} caracteres.`);
        }
      }
    }
    if (falsas < 1 || falsas > 4) error(`${etiqueta}: tiene ${falsas} falsas; debe tener entre 1 y 4.`);
    fakesPorDia.push(falsas);
    longitudes.push({ n: d.n, afirmaciones });
  }
  // Solo avisos, nunca errores, tampoco con --estricto [D-140].
  for (const a of avisosLongitud(longitudes)) aviso(a.replace(/^AVISO: /, ''));
  for (const a of avisosMezcla(fakesPorDia)) {
    aviso(`Fact or Fake: ${a.replace(/^AVISO: /, '').replace(/generadas/g, 'falsas').replace(/auténticas/g, 'verdaderas')}`);
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

  const comprobarRuta = (origen, ruta, base) => {
    const destino = posix.normalize(posix.join(base, ruta));
    if (destino.startsWith('..') || destino.startsWith('/')) {
      error(`${origen}: la ruta ${ruta} sale del sitio o es absoluta.`);
      return;
    }
    let dir = raiz;
    for (const parte of destino.split('/')) {
      if (!existsSync(dir) || !statSync(dir).isDirectory() || !readdirSync(dir).includes(parte)) {
        error(`${origen}: ${ruta} no existe (se distingue entre mayúsculas y minúsculas).`);
        return;
      }
      dir = join(dir, parte);
    }
  };

  const revisarHtml = (nombre) => {
    if (!existsSync(p(nombre))) return;
    const html = leer(nombre);
    for (const tag of html.matchAll(/<[a-zA-Z][^>]*>/g)) {
      for (const [, attr, valor] of tag[0].matchAll(atributo)) {
        const a = attr.toLowerCase();
        if (a.startsWith('data-')) {
          const pn = contienePalabraProhibida(a);
          if (pn) error(`${nombre}: el atributo ${a} contiene "${pn}".`);
        }
        if (a === 'id' || a === 'class' || a === 'alt' || a.startsWith('data-')) {
          const pv = contienePalabraProhibida(valor);
          if (pv) error(`${nombre}: ${a}="${valor}" contiene la palabra prohibida "${pv}".`);
        } else if (a === 'href' || a === 'src') {
          const pv = contienePalabraProhibida(valor);
          if (pv) error(`${nombre}: ${a}="${valor}" contiene la palabra prohibida "${pv}".`);
          if (/^(https?:)?\/\//i.test(valor)) error(`${nombre}: ${a}="${valor}" es una URL externa.`);
          else if (!/^(#|mailto:|tel:|data:)/i.test(valor) && valor !== '') {
            comprobarRuta(nombre, valor.split(/[?#]/)[0], '');
          }
        }
      }
    }
  };

  revisarHtml('index.html');
  revisarHtml('creditos.html');

  // Nombres de archivos publicados.
  const recorrer = (dir) => {
    if (!existsSync(p(dir))) return [];
    const r = [];
    for (const e of readdirSync(p(dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) r.push(...recorrer(rel));
      else r.push(rel);
    }
    return r;
  };
  for (const f of [...recorrer('css'), ...recorrer('js'), ...recorrer('img'), ...recorrer('fonts'), ...recorrer('data')]) {
    const pn = contienePalabraProhibida(f.split('/').pop());
    if (pn) error(`${f}: el nombre de archivo contiene "${pn}".`);
  }

  // URL externas y fecha de lanzamiento fija.
  for (const f of ['index.html', 'creditos.html', ...recorrer('css'), ...recorrer('js')]) {
    if (!existsSync(p(f))) continue;
    const t = leer(f);
    if (/https?:\/\//i.test(t)) error(`${f}: contiene una URL externa (http:// o https://).`);
    if (/(?:href|src)\s*=\s*["']\/\//i.test(t) || /url\(\s*["']?\/\//i.test(t) || /@import/i.test(t)) {
      error(`${f}: referencia un recurso externo o importado.`);
    }
  }
  for (const f of [...recorrer('js'), ...recorrer('herramientas')].filter((x) => /\.m?js$/.test(x))) {
    if (leer(f).includes(FECHA_FIJA_ANTIGUA)) error(`${f}: contiene la fecha fija ${FECHA_FIJA_ANTIGUA}; el lanzamiento vive solo en data/calendario.json [D-95].`);
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

  // ---------- Git e ignorados (no se lee entrada/) ----------

  const PRIVADOS = ['herramientas/banco.json', 'herramientas/banco.anterior.json', 'herramientas/lote.json'];
  try {
    const gi = leer('.gitignore').split(/\r?\n/).map((l) => l.trim());
    for (const f of [...PRIVADOS, 'entrada/']) if (!gi.includes(f)) error(`.gitignore no incluye ${f}.`);
  } catch {
    error('No se puede leer .gitignore.');
  }
  if (git) {
    try {
      for (const f of PRIVADOS) {
        let rastreado = true;
        try {
          execFileSync('git', ['ls-files', '--error-unmatch', f], { cwd: raiz, stdio: 'pipe' });
        } catch {
          rastreado = false;
        }
        if (rastreado) error(`${f} está rastreado por git; debe quitarse del índice (sus rutas o tipos revelarían las respuestas).`);
      }
      const entrada = execFileSync('git', ['ls-files', 'entrada'], { cwd: raiz, stdio: 'pipe' }).toString().trim();
      if (entrada) error('Hay archivos de entrada/ rastreados por git.');
      const txt = execFileSync('git', ['ls-files', '*.txt'], { cwd: raiz, stdio: 'pipe' })
        .toString()
        .split(/\r?\n/)
        .map((x) => x.trim())
        .filter((x) => x && !x.startsWith('fonts/'));
      if (txt.length > 0) error(`Hay ${txt.length} archivo(s) .txt rastreados por git fuera de fonts/ (podrían ser prompts, afirmaciones o notas).`);
    } catch {
      aviso('No se pudo consultar git; se omiten las comprobaciones de archivos rastreados.');
    }
  }

  // ---------- Avisos de calendario (por reto) ----------

  const fechaDe = (n) => fechaDelDia(lanzamiento, n);
  const cuentaFutura = (lista) => (lanzamiento === null ? lista.length : lista.filter((d) => fechaDe(d.n) >= hoy).length);
  for (const [reto, lista] of [['Images', dias], ['Fact or Fake', diasFact]]) {
    const futuros = cuentaFutura(lista);
    if (futuros < 7) {
      aviso(
        lanzamiento === null
          ? `${reto} tiene menos de 7 días de calendario (${futuros}) y aún no hay fecha de lanzamiento.`
          : `Quedan menos de 7 días de calendario de ${reto} a partir de hoy (${futuros}).`
      );
    }
  }
  if (dias.length !== diasFact.length) {
    const [mas, menos, nMas, nMenos] =
      dias.length > diasFact.length ? ['Images', 'Fact or Fake', dias.length, diasFact.length] : ['Fact or Fake', 'Images', diasFact.length, dias.length];
    const extra = Array.from({ length: nMas - nMenos }, (_, k) => nMenos + k + 1);
    const plural = (n) => (n === 1 ? '1 día' : `${n} días`);
    aviso(`${menos} tiene ${plural(nMenos)} ${mas === 'Images' ? 'e' : 'y'} ${mas} ${nMas}: ${listaDias(extra)} solo ${extra.length === 1 ? 'tendrá' : 'tendrán'} ${mas}.`);
  }

  // Interruptor del modo prueba [D-71, D-97]
  {
    let abiertas = null;
    try {
      abiertas = analizarPruebasAbiertas(leer('js/main.js'));
    } catch {
      error('No se puede leer js/main.js para comprobar PRUEBAS_ABIERTAS.');
    }
    const lanzado = lanzamiento !== null && diasEntre(hoy, lanzamiento) <= 0;
    if (abiertas === null) {
      if (existsSync(p('js', 'main.js'))) error('js/main.js debe declarar una sola vez const PRUEBAS_ABIERTAS = true; o const PRUEBAS_ABIERTAS = false; (D-71).');
    } else if (abiertas && (estricto || lanzado)) {
      error('El modo prueba sigue abierto: pon const PRUEBAS_ABIERTAS = false; en js/main.js antes de publicar (D-71).');
    } else if (abiertas) {
      aviso(`el modo prueba está abierto (PRUEBAS_ABIERTAS = true en js/main.js). Ponlo a false antes del lanzamiento (${lanzamiento ?? 'aún sin fecha'}).`);
    }
  }

  if (sinPromptPorDia.size > 0) {
    const total = [...sinPromptPorDia.values()].reduce((a, b) => a + b, 0);
    const lista = [...sinPromptPorDia.keys()].map(String);
    const textoDias = lista.length === 1 ? `día ${lista[0]}` : `días ${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;
    aviso(`${total} ${total === 1 ? 'prueba generada no tiene prompt' : 'pruebas generadas no tienen prompt'} (${textoDias}).`);
  }

  const generadasPorDia = dias.map((d) => d.pruebas.reduce((s, _, i) => s + (generadaDe(d, i) ?? 0), 0));
  for (const a of avisosMezcla(generadasPorDia)) aviso(`Images: ${a.replace(/^AVISO: /, '')}`);

  // Peso por día (D-149): sustituye al aviso de más del doble de la media global, que queda cubierto por la mediana de cada día.
  const desofPeso = (c, n, i) => generadaDe({ clave: c, n }, i);
  for (const a of avisosPesoPorDia({ dias, tamanos, desofuscar: desofPeso })) aviso(a);
  for (const a of avisosPesoMediana({ dias, tamanos })) aviso(a);

  const resumenPeso = analizarPesos({ dias, tamanos, desofuscar: (c, n, i) => generadaDe({ clave: c, n }, i) });
  const msgPeso = mensajePeso(resumenPeso);
  if (msgPeso) aviso(msgPeso.replace(/^AVISO: /, ''));

  // ---------- Con banco de imágenes (versión 3) ----------

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
    if (banco.version === 2) {
      error('herramientas/banco.json es de la versión 2: conviértelo con npm run lanzamiento.');
    } else if (banco.version !== 3 || !Array.isArray(banco.imagenes)) {
      error('herramientas/banco.json no es de la versión 3.');
    } else {
      const porId = new Map(banco.imagenes.map((i) => [i.id, i]));
      const porDia = new Map();
      for (const i of banco.imagenes) porDia.set(i.dia, (porDia.get(i.dia) ?? 0) + 1);
      for (const d of dias) {
        if (porDia.get(d.n) !== 5) error(`Banco: el día ${d.n} tiene ${porDia.get(d.n) ?? 0} imágenes; debe tener 5.`);
        d.pruebas.forEach((id, i) => {
          const e = porId.get(id);
          if (!e) return error(`Banco: falta el id ${id} (día ${d.n}).`);
          if (e.dia !== d.n) error(`Banco: ${id} tiene un día distinto al del calendario.`);
          if (e.tema !== d.tema) error(`Banco: ${id} tiene el tema "${e.tema}" y el calendario "${d.tema}".`);
          const tipo = generadaDe(d, i) === 1 ? 'generada' : 'autentica';
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

  const informe = [];
  const ultimo = dias.length ? fechaDe(dias[dias.length - 1].n) : null;
  informe.push(
    `Días de Images: ${dias.length}${dias.length ? (ultimo ? ` (hasta ${ultimo})` : ' (sin fecha de lanzamiento)') : ''}.`
  );
  informe.push(`Días de Fact or Fake: ${diasFact.length}.`);
  if (resumenPeso.global) {
    const kb = (b) => (b / 1024).toFixed(0);
    informe.push(
      `Peso medio: ${kb(resumenPeso.global.mediaAutentica)} KB las auténticas, ${kb(resumenPeso.global.mediaGenerada)} KB las generadas (diferencia ${(resumenPeso.global.diferencia * 100).toFixed(1)} %).`
    );
  }
  return { codigo: errores.length > 0 ? 1 : 0, errores, avisos, informe };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = await validar({ estricto: process.argv.includes('--estricto') });
  for (const l of r.informe) console.log(l);
  for (const a of r.avisos) console.log(`AVISO: ${a}`);
  for (const e of r.errores) console.error(`ERROR: ${e}`);
  if (r.errores.length > 0) {
    console.error(`\nValidación fallida: ${r.errores.length} error(es).`);
    process.exit(1);
  }
  console.log(`\nValidación correcta${r.avisos.length ? ` (${r.avisos.length} aviso(s))` : ''}.`);
}
