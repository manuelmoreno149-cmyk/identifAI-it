// Validador (spec 4.4.3, 4.12 y 4.22). Código 1 si hay errores; los avisos no fallan (salvo lo que dice --estricto).
// Lógica en `validar({raiz, estricto, hoyISO, git})` para poder probarla con raíces temporales; no lee entrada/ [D-139].
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, posix } from 'node:path';
import sharp from 'sharp';
import {
  DETALLES_MAX,
  IDIOMAS,
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
  FUENTES,
  analizarAnunciosActivos,
  comprobarReutilizacion
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
import { TIPOGRAFIAS, ARCHIVOS_CREDITOS, creditosParaBanco } from './creditos.mjs';
import {
  ARCHIVOS_CREDITOS_REDIRECCION,
  CSP,
  RECURSOS_PENDIENTES,
  SUBCADENAS_GUIAS,
  avisosMeta,
  comprobarAtributos,
  comprobarListaBlanca,
  comprobarSitio,
  diasArchivables,
  existentesDeDisco,
  generarSitio,
  leerEntradas,
  palabraProhibidaEnRuta,
  ultimoArchivadoEnDisco
} from './paginas.mjs';

const RAIZ_REAL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const puntos = (t) => Array.from(t).length;
const NOMBRE_IDIOMA = { en: 'inglés', es: 'español' };
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

export async function validar({ raiz = RAIZ_REAL, estricto = false, hoyISO = fechaLocal(new Date()), ahoraMs = Date.now(), git = true } = {}) {
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
    } else if (calendario.version === 4) {
      error('data/calendario.json es de la versión 4: rehazlo con npm run importar -- --reimportar --confirmar.');
    } else if (calendario.version !== 5) {
      error(`data/calendario.json: version debe ser 5 (es ${calendario.version}).`);
    } else {
      if (calendario.lanzamiento === null) lanzamiento = null;
      else if (fechaIso(calendario.lanzamiento)) lanzamiento = calendario.lanzamiento;
      else error(`data/calendario.json: lanzamiento debe ser null o una fecha ISO válida (es ${JSON.stringify(calendario.lanzamiento)}).`);
      if (!validarCalendario(calendario)) {
        error('data/calendario.json no cumple la estructura de la versión 5 (campos, tema y fichas en inglés y español, 5 ids distintos, clave de 5 bytes, sin fecha por día).');
      }
    }
    if (calendario.version === 5 && Array.isArray(calendario.dias)) dias.push(...calendario.dias.filter(diaImagenesUtil));
  }
  const version5 = calendario?.version === 5;

  const vistos = new Map();
  for (const d of dias) {
    const etiqueta = `Día ${d.n}`;
    for (const idioma of IDIOMAS) {
      const pal = contienePalabraProhibida(d.tema?.[idioma] ?? '');
      if (pal) error(`${etiqueta}: el tema en ${NOMBRE_IDIOMA[idioma]} contiene la palabra prohibida "${pal}".`);
    }
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

  // ---------- Fichas de Images [D-86, D-87, 4.22] ----------

  {
    const autentica = Object.fromEntries(IDIOMAS.map((i) => [i, TEXTOS?.[i]?.fichas?.autentica]));
    const textoOk = (t) => typeof t === 'string' && t.trim() !== '';
    if (!IDIOMAS.every((i) => textoOk(autentica[i])) || autentica.en === autentica.es) {
      error('TEXTOS.{en,es}.fichas.autentica (js/textos.js) no es válido: debe existir en los dos idiomas, no estar vacío y ser distinto entre idiomas.');
    } else if (version5) {
      for (const d of dias) {
        if (!d.fichas || typeof d.fichas !== 'object') continue;
        for (const idioma of IDIOMAS) {
          if (!Array.isArray(d.fichas[idioma])) continue;
          let descifrables = true;
          let descuadre = false;
          d.pruebas.forEach((_, i) => {
            const texto = desofuscarFicha(d.fichas[idioma][i], d.clave, d.n, i, idioma);
            if (texto === null) {
              descifrables = false;
              error(`La ficha ${i + 1} del día ${d.n} (${NOMBRE_IDIOMA[idioma]}) no se puede descifrar.`);
              return;
            }
            const gen = generadaDe(d, i);
            if (gen === null) return;
            // Las auténticas son exactamente la ficha del idioma; las generadas no son la de ninguno de los dos.
            if (gen === 0 && texto !== autentica[idioma]) descuadre = true;
            if (gen === 1 && IDIOMAS.some((o) => texto === autentica[o])) descuadre = true;
          });
          if (descifrables && descuadre) error(`El día ${d.n} tiene fichas (${NOMBRE_IDIOMA[idioma]}) que no cuadran con su clave.`);
        }
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
  const vistasAfirmaciones = { en: new Map(), es: new Map() };
  for (const d of diasFact) {
    const etiqueta = `Día ${d.n} de Fact or Fake`;
    for (const idioma of IDIOMAS) {
      const pal = contienePalabraProhibida(d.tema?.[idioma] ?? '');
      if (pal) error(`${etiqueta}: el tema en ${NOMBRE_IDIOMA[idioma]} contiene la palabra prohibida "${pal}".`);
      if (temasImagenes.has(d.n) && temasImagenes.get(d.n)?.[idioma] !== d.tema?.[idioma]) {
        error(`El tema en ${NOMBRE_IDIOMA[idioma]} del día ${d.n} no coincide entre Images y Fact or Fake.`);
      }
    }
    let falsas = 0;
    for (let i = 0; i < 5; i++) if (generadaDe(d, i) === 1) falsas++;
    const porIdioma = {};
    const detalles = {};
    for (const idioma of IDIOMAS) {
      const afirmaciones = [];
      const de = NOMBRE_IDIOMA[idioma];
      for (let i = 0; i < 5; i++) {
        const esFalsa = generadaDe(d, i) === 1;
        const claim = desofuscarAfirmacion(d.textos[idioma][i], d.clave, d.n, i, idioma);
        if (claim === null) {
          error(`La afirmación ${i + 1} del día ${d.n} de Fact or Fake (${de}) no se puede descifrar.`);
        } else {
          if (puntos(claim) > AFIRMACION_MAX) error(`La afirmación ${i + 1} del día ${d.n} de Fact or Fake (${de}) supera ${AFIRMACION_MAX} caracteres.`);
          afirmaciones.push({ tipo: esFalsa ? 'generada' : 'autentica', afirmacion: claim });
          const clave = normalizarParaDuplicados(claim);
          const previa = vistasAfirmaciones[idioma].get(clave);
          if (previa) {
            error(`Afirmación repetida en Fact or Fake (${de}): la ${i + 1} del día ${d.n} es igual a la ${previa.i + 1} del día ${previa.n}.`);
          } else {
            vistasAfirmaciones[idioma].set(clave, { n: d.n, i });
          }
        }
        const ficha = desofuscarAclaracion(d.fichas[idioma][i], d.clave, d.n, i, idioma);
        if (ficha === null) {
          error(`La aclaración ${i + 1} del día ${d.n} de Fact or Fake (${de}) no se puede descifrar.`);
        } else {
          (detalles[i] ??= {})[idioma] = ficha.detalles.length;
          if (puntos(ficha.aclaracion) > ACLARACION_MAX) error(`La aclaración ${i + 1} del día ${d.n} de Fact or Fake (${de}) supera ${ACLARACION_MAX} caracteres.`);
          if (ficha.detalles.length > DETALLES_MAX) error(`La aclaración ${i + 1} del día ${d.n} de Fact or Fake (${de}) tiene más de ${DETALLES_MAX} detalles.`);
          if (ficha.detalles.some((t) => puntos(t) > DETALLE_MAX)) {
            error(`La aclaración ${i + 1} del día ${d.n} de Fact or Fake (${de}) tiene un detalle de más de ${DETALLE_MAX} caracteres.`);
          }
        }
      }
      porIdioma[idioma] = afirmaciones;
    }
    for (const [i, cuenta] of Object.entries(detalles)) {
      if (cuenta.en !== undefined && cuenta.es !== undefined && cuenta.en !== cuenta.es) {
        aviso(`La prueba ${Number(i) + 1} del día ${d.n} de Fact or Fake tiene distinto número de detalles en inglés y en español.`);
      }
    }
    if (falsas < 1 || falsas > 4) error(`${etiqueta}: tiene ${falsas} falsas; debe tener entre 1 y 4.`);
    fakesPorDia.push(falsas);
    longitudes.push({ n: d.n, afirmaciones: porIdioma });
  }
  // Solo avisos, nunca errores, tampoco con --estricto [D-140].
  for (const a of avisosLongitud(longitudes)) aviso(a.replace(/^AVISO: /, ''));
  for (const a of avisosMezcla(fakesPorDia)) {
    aviso(`Fact or Fake: ${a.replace(/^AVISO: /, '').replace(/generadas/g, 'falsas').replace(/auténticas/g, 'verdaderas')}`);
  }

  // ---------- Archivos publicados ----------

  const REQUERIDOS = ['.nojekyll', 'index.html', '404.html', 'robots.txt', 'sitemap.xml', ...Object.values(ARCHIVOS_CREDITOS_REDIRECCION), ...Object.values(ARCHIVOS_CREDITOS)];
  for (const f of REQUERIDOS) {
    if (!existsSync(p(f))) error(`Falta ${f}${f.includes('/') ? '' : ' en la raíz'}.`);
  }

  for (const t of TIPOGRAFIAS) {
    if (!existsSync(p(t.archivo)) || statSync(p(t.archivo)).size === 0) error(`Falta el archivo de licencia ${t.archivo} o está vacío.`);
  }
  if (existsSync(p('css', 'base.css'))) {
    for (const m of leer('css/base.css').matchAll(/url\(\s*["']?\.\.\/(fonts\/[^"')]+\.woff2)/g)) {
      if (!existsSync(p(m[1]))) error(`css/base.css referencia ${m[1]}, que no existe.`);
    }
  }

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
  for (const f of [...recorrer('css'), ...recorrer('js'), ...recorrer('img'), ...recorrer('fonts'), ...recorrer('data'), ...recorrer('casos')]) {
    if (palabraProhibidaEnRuta(f)) error(`${f}: la ruta contiene una palabra prohibida.`);
  }

  // URL externas (los HTML se comprueban en comprobarSitio) y fecha de lanzamiento fija.
  for (const f of [...recorrer('css'), ...recorrer('js')]) {
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

  // en/credits/ (lang en) y es/creditos/ (lang es): páginas de contenido que escribe creditos.mjs [10.10]
  for (const idioma of IDIOMAS) {
    const nombre = ARCHIVOS_CREDITOS[idioma];
    if (!existsSync(p(nombre))) continue;
    const c = leer(nombre);
    if (!c.includes('<html lang="' + idioma + '">')) error(nombre + ': falta <html lang="' + idioma + '">.');
    if (!/<title>[^<]+<\/title>/.test(c)) error(nombre + ': falta <title>.');
    if (!/<meta name="viewport"/.test(c)) error(nombre + ': falta el viewport.');
    if (!c.includes('<meta http-equiv="Content-Security-Policy" content="' + CSP + '">')) error(nombre + ': la CSP no es la de la spec.');
    if (!c.includes('data-pagina="creditos"')) error(nombre + ': falta data-pagina="creditos".');
    if (/<script/i.test(c)) error(nombre + ': contiene <script>.');
    if (/\sstyle\s*=/i.test(c)) error(nombre + ': contiene atributo style.');
    for (const id of vistos.keys()) if (c.includes(id)) error(nombre + ': contiene el id de imagen ' + id + '.');
    if (!c.endsWith('\n') || c.endsWith('\n\n') || c.includes('\r')) error(nombre + ': debe usar LF y terminar con un único salto de línea.');
  }

  // ---------- Páginas generadas por paginas.mjs [10.6.5] ----------

  const codigoMain = existsSync(p('js', 'main.js')) ? leer('js/main.js') : '';
  const anunciosActivos = analizarAnunciosActivos(codigoMain);
  if (existsSync(p('js', 'main.js'))) {
    if (anunciosActivos === null) error('js/main.js debe declarar una sola vez const ANUNCIOS_ACTIVOS = false; (10.13).');
    else if (anunciosActivos) error('ANUNCIOS_ACTIVOS vale true en js/main.js: activar anuncios exige una versión nueva de la spec (10.13).');
  }
  if (anunciosActivos === false && (existsSync(p('es', 'aviso-legal')) || existsSync(p('en', 'legal-notice')))) {
    error('Existe la página del aviso legal (es/aviso-legal/ o en/legal-notice/) con ANUNCIOS_ACTIVOS = false: no se publica hasta que haya anuncios (10.14).');
  }

  for (const e of comprobarListaBlanca()) error(e);
  for (const f of recorrer('js').filter((x) => /\.m?js$/.test(x))) {
    const codigo = leer(f);
    for (const s of SUBCADENAS_GUIAS) if (codigo.includes(s)) error(f + ': contiene la dirección de una guía (' + s + '); el juego no puede enlazarlas.');
  }
  const PLANTILLA_JUEGO = 'herramientas/plantillas/juego.html';
  if (existsSync(p(PLANTILLA_JUEGO))) {
    const plantilla = leer(PLANTILLA_JUEGO);
    for (const s of SUBCADENAS_GUIAS) if (plantilla.includes(s)) error(PLANTILLA_JUEGO + ': contiene la dirección de una guía (' + s + ').');
    for (const e of comprobarAtributos(PLANTILLA_JUEGO, plantilla, { juego: true })) error(e);
  } else {
    error('Falta ' + PLANTILLA_JUEGO + '.');
  }

  const normalizar = (s) => s.replace(/\r\n?/g, '\n');
  const DIRS_DIAS = [['en', 'archive', /^case-(\d+)$/], ['es', 'archivo', /^caso-(\d+)$/]];
  const publicado = new Map(); // lo que hay (o debería haber) publicado, para comprobarSitio
  let entradas = null;
  let mapa = null;
  if (version5 && calendario && validarCalendario(calendario)) {
    const enDisco = ultimoArchivadoEnDisco(raiz);
    try {
      entradas = leerEntradas(raiz);
      mapa = generarSitio({ entradas, ahoraMs, limiteN: enDisco });
    } catch (e) {
      error('No se pueden regenerar las páginas: ' + e.message);
    }
  }
  if (mapa && entradas) {
    // Días de archivo que no deberían existir todavía (o sin lanzamiento) [324].
    const archivables = new Set(diasArchivables({ calendario, meses: entradas.meses, ahoraMs }).map((d) => d.n));
    const diasFuera = new Set(); // carpetas de día de más
    for (const [idioma, carpeta, patron] of DIRS_DIAS) {
      for (const nombre of listar(idioma + '/' + carpeta)) {
        const m = patron.exec(nombre);
        if (!m || archivables.has(Number(m[1]))) continue;
        diasFuera.add(idioma + '/' + carpeta + '/' + nombre + '/');
        const fecha = fechaDelDia(lanzamiento, Number(m[1]));
        error(
          'El caso n.º ' + m[1] + ' (' + idioma + '/' + carpeta + '/' + nombre + '/) está archivado pero ' +
            (lanzamiento === null ? 'aún no hay fecha de lanzamiento' : 'su fecha (' + fecha + ') no ha terminado en todo el mundo') +
            ': nada de hoy ni del futuro puede estar en el archivo (10.8.2).'
        );
      }
    }
    // Páginas desactualizadas: se regenera en memoria y se compara con lo escrito (CRLF y LF son iguales).
    const desactualizadas = [];
    for (const [r, contenido] of mapa) {
      const abs = p(...r.split('/'));
      const actual = existsSync(abs) ? normalizar(readFileSync(abs, 'utf8')) : null;
      if (actual !== contenido) desactualizadas.push(r);
      publicado.set(r, actual ?? contenido);
    }
    if (desactualizadas.length > 0) {
      const muestra = desactualizadas.slice(0, 8).join(', ');
      error('Páginas desactualizadas: ejecuta npm run paginas. (' + desactualizadas.length + ': ' + muestra + (desactualizadas.length > 8 ? ', …' : '') + ')');
    }
    // Lo que sobra en en/ y es/.
    const propios = new Set(Object.values(ARCHIVOS_CREDITOS));
    for (const f of [...recorrer('en'), ...recorrer('es')]) {
      if (mapa.has(f) || propios.has(f) || [...diasFuera].some((d) => f.startsWith(d))) continue;
      error('Archivo inesperado en lo publicado: ' + f + ' (no lo genera paginas.mjs).');
      publicado.set(f, /\.(html|xml|txt)$/.test(f) ? leer(f) : '');
    }
    for (const nombre of propios) if (existsSync(p(nombre))) publicado.set(nombre, leer(nombre));
    const existentes = existentesDeDisco(raiz);
    for (const e of comprobarSitio(publicado, existentes, { pendientes: RECURSOS_PENDIENTES })) error(e);
    const faltan = RECURSOS_PENDIENTES.filter((r) => !existsSync(p(r)));
    if (faltan.length > 0) {
      const msg = 'Faltan recursos que enlazan las páginas y que crean las fases 4 y 5: ' + faltan.join(', ') + '.';
      if (estricto) error(msg);
      else aviso(msg);
    }
    for (const a of avisosMeta(publicado)) aviso(a);
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
        .filter((x) => x && !x.startsWith('fonts/') && x !== 'robots.txt');
      if (txt.length > 0) error(`Hay ${txt.length} archivo(s) .txt rastreados por git fuera de fonts/ y robots.txt (podrían ser prompts, afirmaciones o notas).`);
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
          if (e.tema !== d.tema?.en) error(`Banco: ${id} tiene el tema "${e.tema}" y el calendario "${d.tema?.en}".`);
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
      for (const idioma of IDIOMAS) {
        const nombre = ARCHIVOS_CREDITOS[idioma];
        if (existsSync(p(nombre)) && leer(nombre) !== creditosParaBanco(banco, idioma)) {
          error(`${nombre} no coincide con lo que generaría creditos.mjs con el banco actual (ejecuta npm run creditos).`);
        }
      }
    }
  }

  // Una imagen de un día ya llegado no vuelve en un día futuro [10.8.7]. Siempre, también sin banco.
  if (version5 && calendario && validarCalendario(calendario)) {
    const huellas = new Map();
    const dhashes = new Map((banco?.version === 3 && Array.isArray(banco.imagenes) ? banco.imagenes : []).map((i) => [i.id, i.dhash]));
    for (const d of dias) {
      for (const id of d.pruebas) {
        const ruta = p('casos', id + '.webp');
        if (!existsSync(ruta)) continue;
        huellas.set(id, { sha256: createHash('sha256').update(readFileSync(ruta)).digest('hex'), dhash: dhashes.get(id) ?? null });
      }
    }
    const diasFecha = dias.map((d) => ({ n: d.n, fecha: fechaDe(d.n), pruebas: d.pruebas }));
    for (const e of comprobarReutilizacion({ dias: diasFecha, huellas, hoyISO: hoy })) error(e);
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
