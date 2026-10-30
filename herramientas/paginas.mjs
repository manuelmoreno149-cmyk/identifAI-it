// Generador de las páginas (spec 10): raíz, juego en en/ y es/, páginas de contenido, archivo de casos,
// 404, redirecciones de créditos, robots.txt y sitemap.xml. Node 20+, sin dependencias.
// Determinista byte a byte: UTF-8 sin BOM, LF, sin fechas de generación y sin Intl [10.6.1].
// Nunca lee entrada/ ni herramientas/banco*.json.
import fs from 'node:fs';
import path from 'node:path';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXTOS, RUTAS } from '../js/textos.js';
import {
  IDIOMAS,
  sumarDias,
  fechaDelDia,
  desofuscar,
  desofuscarFicha,
  desofuscarAfirmacion,
  desofuscarAclaracion
} from '../js/diario.js';
import { contienePalabraProhibida } from './temas.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------- Constantes [10.1, 10.6.4] ----------

export const DOMINIO = 'https://identifaiit.com/';
export const CORREO = 'contacto@301juegodiario.es';
export const CSP = "default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'";

function congelar(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') congelar(v);
  return Object.freeze(o);
}

export const RUTAS_GUIAS = congelar({
  en: { guia_imagenes: 'how-to-spot-ai-images/', guia_desinformacion: 'how-to-spot-fake-news/' },
  es: { guia_imagenes: 'como-saber-si-una-imagen-es-ia/', guia_desinformacion: 'como-detectar-un-bulo/' }
});

export const DIRECCIONES_EXCEPTUADAS = Object.freeze([
  'en/how-to-spot-ai-images/',
  'en/how-to-spot-fake-news/',
  'es/como-saber-si-una-imagen-es-ia/',
  'es/como-detectar-un-bulo/'
]);

// Subcadenas que el juego (plantilla, en/index.html, es/index.html y js/) no puede contener [10.1.1].
export const SUBCADENAS_GUIAS = Object.freeze([
  'how-to-spot-ai-images',
  'how-to-spot-fake-news',
  'como-saber-si-una-imagen-es-ia',
  'como-detectar-un-bulo'
]);

// Claves publicadas en el orden del pie [10.6.4].
export const PAGINAS = Object.freeze([
  'sobre',
  'como_jugar',
  'metodo',
  'guia_imagenes',
  'guia_desinformacion',
  'archivo',
  'preguntas',
  'creditos',
  'privacidad',
  'cookies',
  'contacto'
]);

// Páginas cuyo cuerpo sale de herramientas/contenido/{idioma}/{clave}.html (créditos las escribe creditos.mjs).
export const CLAVES_CONTENIDO = Object.freeze(PAGINAS.filter((c) => c !== 'creditos'));
const GUIAS = Object.freeze(['guia_imagenes', 'guia_desinformacion']);
const PLANTILLAS = Object.freeze(['juego', 'raiz', 'pagina', 'archivo-dia', 'archivo-indice', '404']);
const NOMBRE_IDIOMA = Object.freeze({ en: 'English', es: 'Español' });
const LOCALE_OG = Object.freeze({ en: 'en_US', es: 'es_ES' });
const SUFIJO_TITULO = ' · identifAI-it';
export const ARCHIVOS_CREDITOS_REDIRECCION = Object.freeze({ en: 'creditos.html', es: 'creditos.es.html' });
export const ARCHIVOS_CREDITOS_PAGINA = Object.freeze({ en: 'en/credits/index.html', es: 'es/creditos/index.html' });

// Recursos que enlazan las páginas y que crean las fases 4 y 5 (perito-visual y agente-de-campo). Mientras no existan,
// comprobarSitio no los da por error y validar solo avisa (con --estricto, error). Vaciar esta lista al terminar la fase 5.
export const RECURSOS_PENDIENTES = Object.freeze([
  'js/raiz.js'
]);

// Texto del <noscript> del juego (no está en TEXTOS; el cronista puede moverlo allí más adelante).
const NOSCRIPT = Object.freeze({
  en: "identifAI-it needs JavaScript to run. Turn it on in your browser to examine today's evidence.",
  es: 'identifAI-it necesita JavaScript para funcionar. Actívalo en tu navegador para examinar las pruebas de hoy.'
});

export const ROBOTS = `User-agent: *
Disallow: /docs/
Disallow: /herramientas/
Disallow: /tests/

Sitemap: ${DOMINIO}sitemap.xml
`;

export const DESOFUSCADORES = Object.freeze({
  bit: desofuscar,
  ficha: desofuscarFicha,
  afirmacion: desofuscarAfirmacion,
  aclaracion: desofuscarAclaracion
});

// ---------- Rutas ----------

export function rutasDe(idioma) {
  return { ...RUTAS[idioma], ...RUTAS_GUIAS[idioma] };
}

export function rutaExceptuada(ruta) {
  if (typeof ruta !== 'string') return false;
  return DIRECCIONES_EXCEPTUADAS.some((d) => ruta === d || ruta === `${d}index.html`);
}

export function palabraProhibidaEnRuta(ruta) {
  if (typeof ruta !== 'string') return false;
  return contienePalabraProhibida(ruta) !== null && !rutaExceptuada(ruta);
}

// Ruta desde la raíz del sitio, sin / inicial: ruta('es', 'archivo_dia', 12) = 'es/archivo/caso-12/'.
export function ruta(idioma, clave, n) {
  const r = rutasDe(idioma)?.[clave];
  if (typeof r !== 'string') throw new RangeError(`Página desconocida: ${idioma}/${clave}`);
  if (r.includes('{n}')) {
    if (!Number.isInteger(n)) throw new RangeError(`La página ${clave} necesita el número de caso.`);
    return `${idioma}/${r.replace('{n}', String(n))}`;
  }
  return `${idioma}/${r}`;
}

export function prefijo(profundidad) {
  return '../'.repeat(profundidad);
}

// Href relativo entre dos carpetas del sitio: relativa('es/como-jugar/', 'es/archivo/') = '../archivo/'.
export function relativa(desde, hasta) {
  const a = desde.split('/').filter(Boolean);
  const b = hasta.split('/').filter(Boolean);
  let comun = 0;
  while (comun < a.length && comun < b.length && a[comun] === b[comun]) comun++;
  const subir = '../'.repeat(a.length - comun);
  const resto = b.slice(comun).join('/');
  const bajar = resto === '' ? '' : `${resto}${hasta.endsWith('/') ? '/' : ''}`;
  return `${subir}${bajar}` || './';
}

// ---------- Textos y HTML ----------

export function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function desescaparHtml(texto) {
  return texto.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

export function rellenar(plantilla, valores) {
  return String(plantilla).replace(/\{(\w+)\}/g, (marca, clave) => (Object.hasOwn(valores, clave) ? String(valores[clave]) : marca));
}

const lf = (t) => String(t).replace(/\r\n?/g, '\n');
const conSaltoFinal = (t) => `${t.replace(/\n+$/, '')}\n`;

function textoDe(idioma, clave) {
  let v = TEXTOS[idioma];
  for (const parte of clave.split('.')) v = v?.[parte];
  if (typeof v !== 'string') throw new Error(`Texto inexistente o no es una cadena: ${idioma}.${clave}`);
  return v;
}

// Solo para marcadores {{enlace:clave}}: las del juego no incluyen las guías.
const CLAVES_ENLACE = new Set(['juego', ...PAGINAS]);

/**
 * Sustituye en una pasada {{marca}} y [[texto]]:
 *  - {{enlace:clave}} y {{enlace:idioma:clave}}: href relativo desde `carpeta`.
 *  - {{pulsado:idioma}}: "true" si es el idioma de la página.
 *  - {{otra}}: valor de `valores`. Una marca desconocida lanza (nunca queda ninguna sin sustituir).
 *  - [[grupo.clave]], [[en:grupo.clave]], [[es:grupo.clave]]: TEXTOS escapado.
 * Lo insertado no se vuelve a analizar.
 */
function llenar(plantilla, { idioma, carpeta, valores = {}, soloJuego = false }) {
  return plantilla.replace(/\{\{([^{}]+)\}\}|\[\[([^[\]]+)\]\]/g, (_, marca, texto) => {
    if (texto !== undefined) {
      const m = /^(en|es):(.+)$/.exec(texto);
      return escaparHtml(m ? textoDe(m[1], m[2]) : textoDe(idioma, texto));
    }
    const partes = marca.split(':');
    if (partes[0] === 'enlace') {
      const lang = partes.length === 3 ? partes[1] : idioma;
      const clave = partes[partes.length - 1];
      if (!CLAVES_ENLACE.has(clave) || !IDIOMAS.includes(lang)) throw new Error(`Marcador de enlace no válido: {{${marca}}}`);
      if (soloJuego && Object.hasOwn(RUTAS_GUIAS[lang], clave)) {
        throw new Error(`El juego no puede enlazar a las guías: {{${marca}}}`);
      }
      return relativa(carpeta, ruta(lang, clave));
    }
    if (partes[0] === 'pulsado' && partes.length === 2) return String(idioma === partes[1]);
    if (Object.hasOwn(valores, marca)) return String(valores[marca]);
    throw new Error(`Marcador desconocido: {{${marca}}}`);
  });
}

// Cada etiqueta con data-texto-aria="g.c" recibe aria-label con su valor [10.4.1].
function ponerAriaLabels(html, idioma) {
  return html.replace(/(<[a-zA-Z][^<>]*?\sdata-texto-aria="([^"]+)")([^<>]*>)/g, (_, ini, clave, fin) => {
    return `${ini} aria-label="${escaparHtml(textoDe(idioma, clave))}"${fin}`;
  });
}

// ---------- Cabecera [10.7.1] ----------

function jsonLd(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

const ORGANIZACION = { '@type': 'Organization', name: 'identifAI-it', url: DOMINIO };

function jsonLdWebSite(inLanguage) {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: 'identifAI-it', url: DOMINIO, inLanguage };
}

export function cabecera({ idioma, titulo, descripcion, ruta: rutaCanonica, alternativas, xDefault, noindex = false, og = 'website', pref, css, jsonld = null }) {
  const e = escaparHtml;
  const otro = idioma === 'en' ? 'es' : 'en';
  const url = (r) => `${DOMINIO}${r}`;
  const lineas = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<meta http-equiv="Content-Security-Policy" content="${CSP}">`,
    `<title>${e(titulo)}</title>`,
    `<meta name="description" content="${e(descripcion)}">`
  ];
  if (noindex) lineas.push('<meta name="robots" content="noindex">');
  lineas.push(
    `<link rel="canonical" href="${url(rutaCanonica)}">`,
    `<link rel="alternate" hreflang="en" href="${url(alternativas.en)}">`,
    `<link rel="alternate" hreflang="es" href="${url(alternativas.es)}">`,
    `<link rel="alternate" hreflang="x-default" href="${url(xDefault)}">`,
    `<meta property="og:type" content="${og}">`,
    '<meta property="og:site_name" content="identifAI-it">',
    `<meta property="og:title" content="${e(titulo)}">`,
    `<meta property="og:description" content="${e(descripcion)}">`,
    `<meta property="og:url" content="${url(rutaCanonica)}">`,
    `<meta property="og:image" content="${url(`img/og/portada-${idioma}.png`)}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${e(TEXTOS[idioma].seo.og_alt)}">`,
    `<meta property="og:locale" content="${LOCALE_OG[idioma]}">`,
    `<meta property="og:locale:alternate" content="${LOCALE_OG[otro]}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<link rel="icon" href="${pref}img/ui/icono.svg" type="image/svg+xml">`
  );
  for (const c of css) lineas.push(`<link rel="stylesheet" href="${pref}css/${c}.css">`);
  if (jsonld) lineas.push(jsonLd(jsonld));
  return lineas.join('\n');
}

// ---------- Contenidos [10.6.3] ----------

const TAGS_CONTENIDO = new Set(['h2', 'h3', 'p', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'blockquote', 'dl', 'dt', 'dd']);
const CAMPOS_COMUNES = ['titulo', 'descripcion', 'h1', 'tipo'];
const CAMPOS_ARTICULO = ['publicado', 'modificado'];
const RE_ISO = /^\d{4}-\d{2}-\d{2}$/;
const largo = (s) => [...s].length;

export function analizarContenido(texto, rutaArchivo = 'contenido') {
  const errores = [];
  const err = (m) => errores.push(`${rutaArchivo}: ${m}`);
  try {
    if (typeof texto !== 'string') return { meta: {}, cuerpo: '', errores: [`${rutaArchivo}: el contenido no es un texto.`] };
    const t = lf(texto).replace(/^\uFEFF/, '');
    const m = /^<!--\n([\s\S]*?)\n-->\n?([\s\S]*)$/.exec(t);
    if (!m) return { meta: {}, cuerpo: '', errores: [`${rutaArchivo}: falta la cabecera de metadatos entre <!-- y -->.`] };
    const meta = {};
    for (const linea of m[1].split('\n')) {
      const campo = /^(\w+):[ \t]*(.*)$/.exec(linea);
      if (!campo) {
        err(`línea de cabecera no válida: "${linea}".`);
        continue;
      }
      if (Object.hasOwn(meta, campo[1])) err(`campo repetido: ${campo[1]}.`);
      meta[campo[1]] = campo[2].trim();
    }
    const cuerpo = m[2].trim();
    const base = path.basename(String(rutaArchivo)).replace(/\.html$/, '');
    if (meta.tipo !== undefined && meta.tipo !== 'articulo' && meta.tipo !== 'pagina') err(`tipo desconocido: "${meta.tipo}".`);
    const permitidos = [...CAMPOS_COMUNES, ...(meta.tipo === 'articulo' ? CAMPOS_ARTICULO : [])];
    for (const c of permitidos) if (meta[c] === undefined || meta[c] === '') err(`falta el campo ${c}.`);
    for (const c of Object.keys(meta)) if (!permitidos.includes(c)) err(`sobra el campo ${c}.`);
    if (CLAVES_CONTENIDO.includes(base) && (meta.tipo === 'articulo' || meta.tipo === 'pagina')) {
      const esperado = GUIAS.includes(base) ? 'articulo' : 'pagina';
      if (meta.tipo !== esperado) err(GUIAS.includes(base) ? 'las guías son de tipo articulo.' : 'solo las guías son de tipo articulo.');
    }
    if (meta.tipo === 'articulo') {
      for (const c of CAMPOS_ARTICULO) if (meta[c] && !RE_ISO.test(meta[c])) err(`${c} debe ser una fecha AAAA-MM-DD.`);
    }
    if (meta.titulo && largo(meta.titulo + SUFIJO_TITULO) > 60) err(`el título con el sufijo mide ${largo(meta.titulo + SUFIJO_TITULO)} caracteres (máximo 60).`);
    if (meta.descripcion && (largo(meta.descripcion) < 70 || largo(meta.descripcion) > 155)) {
      err(`la descripción mide ${largo(meta.descripcion)} caracteres (debe medir entre 70 y 155).`);
    }

    // Cuerpo: etiquetas, atributos y marcadores permitidos.
    if (/<!--/.test(cuerpo)) err('contiene un comentario HTML.');
    for (const tag of cuerpo.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g)) {
      const [, cierre, nombre, resto] = tag;
      const n = nombre.toLowerCase();
      if (!TAGS_CONTENIDO.has(n)) {
        err(`etiqueta no permitida: <${n}>.`);
        continue;
      }
      if (cierre) continue;
      const attrs = [...resto.matchAll(/([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)];
      const nombres = attrs.map((a) => a[1].toLowerCase());
      for (const a of nombres) {
        if (n === 'a' && (a === 'href' || a === 'rel')) continue;
        err(`atributo no permitido en <${n}>: ${a}.`);
      }
      if (n === 'a') {
        const href = attrs.find((a) => a[1].toLowerCase() === 'href');
        const rel = attrs.find((a) => a[1].toLowerCase() === 'rel');
        const valor = href ? (href[2] ?? href[3] ?? href[4] ?? '') : null;
        if (valor === null) err('un enlace no tiene href.');
        else if (valor === '{{correo}}') {
          /* correcto */
        } else if (/^\{\{enlace:\w+\}\}$/.test(valor)) {
          /* se comprueba abajo */
        } else if (/^https:\/\//i.test(valor)) {
          const relValor = rel ? (rel[2] ?? rel[3] ?? rel[4] ?? '') : '';
          if (!relValor.split(/\s+/).includes('noopener')) err(`el enlace externo ${valor} necesita rel="noopener".`);
        } else err(`enlace no permitido: "${valor}" (solo {{enlace:clave}}, {{correo}} o https://).`);
      }
    }
    for (const marca of cuerpo.matchAll(/\{\{([^{}]*)\}\}/g)) {
      const x = marca[1];
      const e = /^enlace:(\w+)$/.exec(x);
      if (e) {
        if (!CLAVES_ENLACE.has(e[1])) err(`{{${x}}} no existe.`);
      } else if (x === 'ejemplos') {
        if (base !== 'guia_imagenes') err('{{ejemplos}} solo vale en guia_imagenes.');
      } else if (x !== 'correo') err(`marcador desconocido {{${x}}}.`);
    }
    if (/\{\{[^{}]*$/.test(cuerpo) || /\[\[/.test(cuerpo)) err('marcador mal formado.');
    return { meta, cuerpo, errores };
  } catch (e) {
    return { meta: {}, cuerpo: '', errores: [...errores, `${rutaArchivo}: no se pudo analizar (${e.message}).`] };
  }
}

// ---------- Archivo: qué días y datos [10.8] ----------

export function ultimoDiaArchivable(ahoraMs) {
  const iso = new Date(ahoraMs - 12 * 3600 * 1000).toISOString().slice(0, 10);
  return sumarDias(iso, -1);
}

function diasDeMeses(meses) {
  return (meses ?? []).flatMap((m) => (Array.isArray(m?.dias) ? m.dias : []));
}

export function diasArchivables({ calendario, meses, ahoraMs }) {
  const lanzamiento = calendario?.lanzamiento ?? null;
  if (lanzamiento === null) return [];
  const ultimo = ultimoDiaArchivable(ahoraMs);
  const ns = new Set([...(calendario?.dias ?? []).map((d) => d.n), ...diasDeMeses(meses).map((d) => d.n)]);
  return [...ns]
    .sort((a, b) => a - b)
    .map((n) => ({ n, fecha: fechaDelDia(lanzamiento, n) }))
    .filter((d) => d.fecha !== null && d.fecha <= ultimo);
}

// Solo se llama con días de diasArchivables: es lo único que se descifra [10.8.2].
export function datosDelDia({ calendario, meses, n, desofuscadores = DESOFUSCADORES }) {
  const fecha = fechaDelDia(calendario?.lanzamiento ?? null, n);
  const dImg = (calendario?.dias ?? []).find((d) => d.n === n) ?? null;
  const dFact = diasDeMeses(meses).find((d) => d.n === n) ?? null;
  const falla = (que) => {
    throw new Error(`No se puede descifrar ${que} del día ${n}.`);
  };
  const tipo = (bit) => (bit === 1 ? 'generada' : 'autentica');
  let imagenes = null;
  if (dImg) {
    imagenes = dImg.pruebas.map((id, i) => {
      const ficha = {};
      for (const idioma of IDIOMAS) {
        ficha[idioma] = desofuscadores.ficha(dImg.fichas[idioma][i], dImg.clave, n, i, idioma);
        if (ficha[idioma] === null) falla(`la ficha ${i + 1} (${idioma})`);
      }
      return { id, verdad: tipo(desofuscadores.bit(dImg.clave, n, i)), ficha };
    });
  }
  let afirmaciones = null;
  if (dFact) {
    afirmaciones = [0, 1, 2, 3, 4].map((i) => {
      const texto = {};
      const aclaracion = {};
      for (const idioma of IDIOMAS) {
        texto[idioma] = desofuscadores.afirmacion(dFact.textos[idioma][i], dFact.clave, n, i, idioma);
        aclaracion[idioma] = desofuscadores.aclaracion(dFact.fichas[idioma][i], dFact.clave, n, i, idioma);
        if (texto[idioma] === null || aclaracion[idioma] === null) falla(`la afirmación ${i + 1} (${idioma})`);
      }
      return { verdad: tipo(desofuscadores.bit(dFact.clave, n, i)), texto, aclaracion };
    });
  }
  return { n, fecha, tema: (dImg ?? dFact)?.tema ?? null, imagenes, afirmaciones };
}

// ---------- Páginas ----------

function fechaVisible(fechaISO, idioma) {
  const [a, m, d] = fechaISO.split('-').map(Number);
  const T = TEXTOS[idioma].archivo;
  return rellenar(T.fecha, { d, mes: T.meses[m - 1], a });
}

function carpetaDeRuta(r) {
  return r;
}

function enlacesPie(idioma, carpeta, actual) {
  return PAGINAS.map((clave) => {
    const href = relativa(carpeta, ruta(idioma, clave));
    const cur = clave === actual ? ' aria-current="page"' : '';
    return `      <li><a href="${href}"${cur}>${escaparHtml(TEXTOS[idioma].pie[clave])}</a></li>`;
  }).join('\n');
}

/**
 * Página con la plantilla de contenido (cabecera, pie, enlace al otro idioma). La usan el contenido, el archivo y los créditos.
 * `cuerpo` ya lleva su h1. `clave`/`n` fijan la dirección y la pareja en el otro idioma.
 */
export function generarPagina({
  idioma,
  clave,
  n,
  titulo,
  descripcion,
  cuerpo,
  plantillas,
  contenedor = 'div',
  dataPagina = 'contenido',
  noindex = false,
  jsonld = null,
  conSufijo = true
}) {
  const otro = idioma === 'en' ? 'es' : 'en';
  const rutaPropia = ruta(idioma, clave, n);
  const carpeta = carpetaDeRuta(rutaPropia);
  const pref = prefijo(carpeta.split('/').filter(Boolean).length);
  const rutaEn = ruta('en', clave, n);
  const tituloFinal = conSufijo ? `${titulo}${SUFIJO_TITULO}` : titulo;
  const cab = cabecera({
    idioma,
    titulo: tituloFinal,
    descripcion,
    ruta: rutaPropia,
    alternativas: { en: rutaEn, es: ruta('es', clave, n) },
    xDefault: rutaEn,
    noindex,
    og: jsonld?.['@type'] === 'Article' ? 'article' : 'website',
    pref,
    css: ['variables', 'base', 'paginas'],
    jsonld
  });
  const html = llenar(plantillas.pagina, {
    idioma,
    carpeta,
    valores: {
      idioma,
      cabecera: cab,
      pagina: dataPagina,
      contenedor,
      cuerpo,
      pie: enlacesPie(idioma, carpeta, clave),
      enlace_otro: relativa(carpeta, ruta(otro, clave, n)),
      otro_idioma: otro,
      otro_nombre: NOMBRE_IDIOMA[otro],
      correo: `mailto:${CORREO}`,
      correo_texto: CORREO
    }
  });
  return conSaltoFinal(html);
}

function cuerpoDeContenido(cuerpo, { idioma, carpeta, ejemplos }) {
  return cuerpo
    .replace(/\{\{enlace:(\w+)\}\}/g, (_, clave) => relativa(carpeta, ruta(idioma, clave)))
    .replace(/\{\{correo\}\}/g, `mailto:${CORREO}`)
    .replace(/\{\{ejemplos\}\}\n?/g, () => (ejemplos ? `${ejemplos}\n` : ''));
}

function analizarOFalla(texto, rutaArchivo) {
  const a = analizarContenido(texto, rutaArchivo);
  if (a.errores.length > 0) throw new Error(a.errores.join('\n'));
  return a;
}

// Página de contenido (claves de CLAVES_CONTENIDO salvo el índice del archivo).
export function generarPaginaContenido({ idioma, clave, texto, plantillas, ejemplos = '' }) {
  const a = analizarOFalla(texto, `herramientas/contenido/${idioma}/${clave}.html`);
  const carpeta = ruta(idioma, clave);
  const articulo = a.meta.tipo === 'articulo';
  const cuerpo = `<h1>${escaparHtml(a.meta.h1)}</h1>\n${cuerpoDeContenido(a.cuerpo, { idioma, carpeta, ejemplos })}`;
  const jsonld = articulo
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: a.meta.h1,
        description: a.meta.descripcion,
        inLanguage: idioma,
        datePublished: a.meta.publicado,
        dateModified: a.meta.modificado,
        image: `${DOMINIO}img/og/portada-${idioma}.png`,
        author: ORGANIZACION,
        publisher: ORGANIZACION,
        mainEntityOfPage: `${DOMINIO}${ruta(idioma, clave)}`
      }
    : null;
  return generarPagina({
    idioma,
    clave,
    titulo: a.meta.titulo,
    descripcion: a.meta.descripcion,
    cuerpo,
    plantillas,
    contenedor: articulo ? 'article' : 'div',
    jsonld
  });
}

export function generarJuego({ idioma, plantillas }) {
  const T = TEXTOS[idioma];
  const otro = idioma === 'en' ? 'es' : 'en';
  const carpeta = ruta(idioma, 'juego');
  const cab = cabecera({
    idioma,
    titulo: T.seo.titulo_juego,
    descripcion: T.seo.descripcion_juego,
    ruta: carpeta,
    alternativas: { en: 'en/', es: 'es/' },
    xDefault: '',
    pref: prefijo(1),
    css: ['variables', 'base', 'componentes'],
    jsonld: jsonLdWebSite(idioma)
  });
  const html = llenar(plantillas.juego, {
    idioma,
    carpeta,
    soloJuego: true,
    valores: {
      idioma,
      cabecera: cab,
      raiz: prefijo(1),
      noscript: escaparHtml(NOSCRIPT[idioma]),
      enlace_otro: relativa(carpeta, ruta(otro, 'juego')),
      otro_idioma: otro,
      otro_nombre: NOMBRE_IDIOMA[otro]
    }
  });
  return conSaltoFinal(ponerAriaLabels(html, idioma));
}

export function generarRaiz({ plantillas }) {
  const T = TEXTOS.en;
  const cab = cabecera({
    idioma: 'en',
    titulo: T.seo.titulo_raiz,
    descripcion: T.seo.descripcion_raiz,
    ruta: '',
    alternativas: { en: 'en/', es: 'es/' },
    xDefault: '',
    pref: '',
    css: ['variables', 'base', 'paginas'],
    jsonld: jsonLdWebSite(['en', 'es'])
  });
  return conSaltoFinal(llenar(plantillas.raiz, { idioma: 'en', carpeta: '', valores: { cabecera: cab } }));
}

export function generarNoEncontrada({ plantillas }) {
  return conSaltoFinal(llenar(plantillas['404'], { idioma: 'en', carpeta: '', valores: { dominio: DOMINIO, csp: CSP } }));
}

// Redirección de créditos.html / creditos.es.html a sus nuevas direcciones [10.10].
export function generarRedireccion(idioma) {
  const e = escaparHtml;
  const destino = ruta(idioma, 'creditos');
  const nombre = TEXTOS[idioma].pie.creditos;
  return `<!doctype html>
<html lang="${idioma}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta http-equiv="refresh" content="0; url=${destino}">
<title>${e(nombre)}${SUFIJO_TITULO}</title>
<link rel="canonical" href="${DOMINIO}${destino}">
</head>
<body data-pagina="redireccion">
<p><a href="${destino}">${e(nombre)}</a></p>
</body>
</html>
`;
}

export function generarSitemap(rutas) {
  const filas = rutas.map((r) => `  <url><loc>${escaparHtml(`${DOMINIO}${r}`)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${filas}\n</urlset>\n`;
}

// ---------- Archivo: páginas ----------

const COMILLAS = Object.freeze({ en: ['“', '”'], es: ['«', '»'] });

function altPrueba(idioma, i, n) {
  return rellenar(TEXTOS[idioma].archivo.alt_prueba, { i: i + 1, n });
}

function parrafos(texto) {
  return texto
    .split(/\n+/)
    .filter((l) => l.trim() !== '')
    .map((l) => `<p>${escaparHtml(l)}</p>`)
    .join('');
}

function figuraPrueba({ idioma, n, i, prueba, prof, perezosa }) {
  const T = TEXTOS[idioma];
  const e = escaparHtml;
  const gen = prueba.verdad === 'generada';
  const carga = perezosa ? ' loading="lazy" decoding="async"' : '';
  const pie = gen
    ? `<p class="archivo-sello">${e(T.partida.sello_generada)}</p>\n<p class="archivo-confesion">${e(T.confesion.titulo)}</p>\n<blockquote>${parrafos(prueba.ficha[idioma])}</blockquote>`
    : `<p class="archivo-sello">${e(T.partida.sello_autentica)}</p>\n<p class="archivo-confesion">${e(T.fichas.autentica)}</p>`;
  return `<figure>\n<img src="${prefijo(prof)}casos/${prueba.id}.webp" alt="${e(altPrueba(idioma, i, n))}" width="1080" height="1350"${carga}>\n<figcaption>\n${pie}\n</figcaption>\n</figure>`;
}

function seccionImagenes(datos, idioma) {
  const T = TEXTOS[idioma];
  const e = escaparHtml;
  if (!datos.imagenes) {
    return `<section>\n<h2>${e(T.portada.reto_imagenes)}</h2>\n<p>${e(rellenar(T.archivo.sin_reto, { reto: T.portada.reto_imagenes }))}</p>\n</section>`;
  }
  const items = datos.imagenes
    .map((p, i) => `<li class="archivo-prueba">\n${figuraPrueba({ idioma, n: datos.n, i, prueba: p, prof: 3, perezosa: i > 0 })}\n</li>`)
    .join('\n');
  return `<section>\n<h2>${e(T.portada.reto_imagenes)}</h2>\n<ol class="archivo-pruebas">\n${items}\n</ol>\n</section>`;
}

function seccionAfirmaciones(datos, idioma) {
  const T = TEXTOS[idioma];
  const e = escaparHtml;
  if (!datos.afirmaciones) {
    return `<section>\n<h2>${e(T.portada.reto_afirmaciones)}</h2>\n<p>${e(rellenar(T.archivo.sin_reto, { reto: T.portada.reto_afirmaciones }))}</p>\n</section>`;
  }
  const [ab, cierre] = COMILLAS[idioma];
  const items = datos.afirmaciones
    .map((a) => {
      const sello = a.verdad === 'generada' ? T.afirmaciones.sello_generada : T.afirmaciones.sello_autentica;
      const ac = a.aclaracion[idioma];
      const detalles = ac.detalles.length > 0 ? `\n<ul class="archivo-detalles">\n${ac.detalles.map((d) => `<li>${e(d)}</li>`).join('\n')}\n</ul>` : '';
      return `<li class="archivo-prueba">\n<p class="archivo-afirmacion"><strong class="archivo-sello">${e(sello)}</strong> ${ab}${e(a.texto[idioma])}${cierre}</p>\n<p class="archivo-aclaracion">${e(ac.aclaracion)}</p>${detalles}\n</li>`;
    })
    .join('\n');
  return `<section>\n<h2>${e(T.portada.reto_afirmaciones)}</h2>\n<ol class="archivo-pruebas">\n${items}\n</ol>\n</section>`;
}

export function generarArchivoDia({ idioma, datos, anterior = null, siguiente = null, plantillas }) {
  const T = TEXTOS[idioma];
  const e = escaparHtml;
  const n = datos.n;
  const tema = datos.tema[idioma];
  const carpeta = ruta(idioma, 'archivo_dia', n);
  const enlace = (clave, num) => relativa(carpeta, ruta(idioma, clave, num));
  const nav = [];
  if (anterior !== null) nav.push(`  <a href="${enlace('archivo_dia', anterior)}">${e(T.archivo.anterior)}</a>`);
  if (siguiente !== null) nav.push(`  <a href="${enlace('archivo_dia', siguiente)}">${e(T.archivo.siguiente)}</a>`);
  nav.push(`  <a href="${enlace('archivo')}">${e(T.archivo.indice)}</a>`);
  nav.push(`  <a href="${enlace('juego')}">${e(T.archivo.jugar_hoy)}</a>`);
  const h1 = rellenar(T.archivo.titulo_dia, { n, tema });
  const cuerpo = llenar(plantillas['archivo-dia'], {
    idioma,
    carpeta,
    valores: {
      fecha_iso: datos.fecha,
      fecha: e(fechaVisible(datos.fecha, idioma)),
      h1: e(h1),
      secciones: `${seccionImagenes(datos, idioma)}\n${seccionAfirmaciones(datos, idioma)}`,
      navegacion: nav.join('\n')
    }
  });
  return generarPagina({
    idioma,
    clave: 'archivo_dia',
    n,
    titulo: rellenar(T.seo.titulo_dia, { n, tema }),
    descripcion: rellenar(T.seo.descripcion_dia, { n, tema }),
    cuerpo,
    plantillas,
    dataPagina: 'archivo'
  });
}

export function generarIndiceArchivo({ idioma, dias, texto, plantillas }) {
  const T = TEXTOS[idioma];
  const e = escaparHtml;
  const a = analizarOFalla(texto, `herramientas/contenido/${idioma}/archivo.html`);
  const carpeta = ruta(idioma, 'archivo');
  let lista;
  if (dias.length === 0) {
    lista = `<p class="archivo-vacio">${e(T.archivo.vacio)}</p>`;
  } else {
    const porMes = new Map();
    for (const d of [...dias].sort((x, y) => y.n - x.n)) {
      const mes = d.fecha.slice(0, 7);
      if (!porMes.has(mes)) porMes.set(mes, []);
      porMes.get(mes).push(d);
    }
    lista = [...porMes.keys()]
      .sort()
      .reverse()
      .map((mes) => {
        const [anio, m] = mes.split('-').map(Number);
        const items = porMes
          .get(mes)
          .map((d) => {
            const href = relativa(carpeta, ruta(idioma, 'archivo_dia', d.n));
            const titulo = rellenar(T.archivo.titulo_dia, { n: d.n, tema: d.tema[idioma] });
            return `<li><a href="${href}">${e(titulo)}</a> <time datetime="${d.fecha}">${e(fechaVisible(d.fecha, idioma))}</time></li>`;
          })
          .join('\n');
        return `<h2 class="archivo-mes">${e(rellenar(T.archivo.mes, { mes: T.archivo.meses[m - 1], a: anio }))}</h2>\n<ul>\n${items}\n</ul>`;
      })
      .join('\n');
  }
  const cuerpo = llenar(plantillas['archivo-indice'], {
    idioma,
    carpeta,
    valores: {
      h1: e(a.meta.h1),
      introduccion: cuerpoDeContenido(a.cuerpo, { idioma, carpeta, ejemplos: '' }),
      lista
    }
  });
  return generarPagina({
    idioma,
    clave: 'archivo',
    titulo: T.seo.titulo_archivo,
    descripcion: T.seo.descripcion_archivo,
    cuerpo,
    plantillas,
    dataPagina: 'archivo',
    noindex: dias.length === 0
  });
}

// Bloque {{ejemplos}} de la guía de imágenes [10.8.6]: hasta 3 imágenes generadas de los 3 últimos días con Images.
export function generarEjemplos({ idioma, ejemplos, carpeta }) {
  if (ejemplos.length === 0) return '';
  const T = TEXTOS[idioma];
  const e = escaparHtml;
  const items = ejemplos
    .map((x) => {
      const href = relativa(carpeta, ruta(idioma, 'archivo_dia', x.n));
      return `<li>\n<figure>\n<img src="${prefijo(carpeta.split('/').filter(Boolean).length)}casos/${x.id}.webp" alt="${e(altPrueba(idioma, x.i, x.n))}" width="1080" height="1350" loading="lazy" decoding="async">\n<figcaption>\n<p class="archivo-sello">${e(T.partida.sello_generada)}</p>\n<blockquote>${parrafos(x.prompt[idioma])}</blockquote>\n<p><a href="${href}">${e(rellenar(T.archivo.ver_dia, { n: x.n }))}</a></p>\n</figcaption>\n</figure>\n</li>`;
    })
    .join('\n');
  return `<section class="archivo-ejemplos">\n<h2>${e(T.archivo.ejemplos_titulo)}</h2>\n<ul>\n${items}\n</ul>\n</section>`;
}

// ---------- El sitio entero ----------

/**
 * Todo lo que escribe paginas.mjs: Map<ruta, contenido> en orden fijo.
 * entradas: {plantillas, contenido: {en: {clave: texto}, es: {...}}, calendario, meses}.
 * limiteN: solo se archivan días con n <= limiteN (lo usa validar para no fallar por un día que la Action aún no ha añadido).
 */
export function generarSitio({ entradas, ahoraMs, limiteN = Infinity, desofuscadores = DESOFUSCADORES }) {
  if (!Number.isFinite(ahoraMs)) throw new TypeError('generarSitio necesita ahoraMs.');
  const { plantillas, contenido, calendario, meses } = entradas;
  const archivados = diasArchivables({ calendario, meses, ahoraMs }).filter((d) => d.n <= limiteN);
  const cache = new Map();
  const datos = (n) => {
    if (!cache.has(n)) cache.set(n, datosDelDia({ calendario, meses, n, desofuscadores }));
    return cache.get(n);
  };
  const ns = archivados.map((d) => d.n);
  const vacio = archivados.length === 0;

  // Ejemplos de la guía: la primera generada de cada uno de los 3 últimos días con Images.
  const ejemplos = [];
  for (const n of [...ns].reverse()) {
    if (ejemplos.length >= 3) break;
    const img = datos(n).imagenes;
    const i = img ? img.findIndex((p) => p.verdad === 'generada') : -1;
    if (i >= 0) ejemplos.push({ n, i, id: img[i].id, prompt: img[i].ficha });
  }

  const mapa = new Map();
  mapa.set('index.html', generarRaiz({ plantillas }));
  mapa.set('404.html', generarNoEncontrada({ plantillas }));
  for (const idioma of IDIOMAS) mapa.set(ARCHIVOS_CREDITOS_REDIRECCION[idioma], generarRedireccion(idioma));
  for (const idioma of IDIOMAS) {
    mapa.set(`${ruta(idioma, 'juego')}index.html`, generarJuego({ idioma, plantillas }));
    for (const clave of CLAVES_CONTENIDO) {
      const texto = contenido[idioma]?.[clave];
      if (typeof texto !== 'string') throw new Error(`Falta herramientas/contenido/${idioma}/${clave}.html`);
      const destino = `${ruta(idioma, clave)}index.html`;
      if (clave === 'archivo') {
        const dias = archivados.map((d) => ({ n: d.n, fecha: d.fecha, tema: datos(d.n).tema }));
        mapa.set(destino, generarIndiceArchivo({ idioma, dias, texto, plantillas }));
      } else if (clave === 'guia_imagenes') {
        const carpeta = ruta(idioma, clave);
        mapa.set(destino, generarPaginaContenido({ idioma, clave, texto, plantillas, ejemplos: generarEjemplos({ idioma, ejemplos: vacio ? [] : ejemplos, carpeta }) }));
      } else {
        mapa.set(destino, generarPaginaContenido({ idioma, clave, texto, plantillas }));
      }
    }
    ns.forEach((n, k) => {
      mapa.set(
        `${ruta(idioma, 'archivo_dia', n)}index.html`,
        generarArchivoDia({ idioma, datos: datos(n), anterior: ns[k - 1] ?? null, siguiente: ns[k + 1] ?? null, plantillas })
      );
    });
  }
  mapa.set('robots.txt', ROBOTS);

  const urls = [''];
  for (const idioma of IDIOMAS) {
    urls.push(ruta(idioma, 'juego'));
    for (const clave of PAGINAS) if (!(clave === 'archivo' && vacio)) urls.push(ruta(idioma, clave));
  }
  for (const n of ns) for (const idioma of IDIOMAS) urls.push(ruta(idioma, 'archivo_dia', n));
  mapa.set('sitemap.xml', generarSitemap(urls));
  return mapa;
}

// ---------- Comprobación [10.6.4] ----------

function etiquetasDe(html) {
  const r = [];
  for (const m of html.matchAll(/<([a-zA-Z][a-zA-Z0-9]*)((?:\s[^<>]*)?)>/g)) {
    const attrs = [];
    for (const a of m[2].matchAll(/([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
      attrs.push([a[1].toLowerCase(), a[2] ?? a[3] ?? a[4] ?? '']);
    }
    r.push({ nombre: m[1].toLowerCase(), attrs, get: (k) => attrs.find((x) => x[0] === k)?.[1] });
  }
  return r;
}

const esJuego = (r) => r === 'en/index.html' || r === 'es/index.html';

/**
 * Errores de atributos de un HTML: manejadores en línea, palabras prohibidas en id, class, alt y data-* (nombre y valor),
 * clases que empiezan por dato y data-verdad fuera del juego [10.5.4]. La usan comprobarSitio y validar (plantilla del juego).
 */
export function comprobarAtributos(rutaPagina, html, { juego = false } = {}) {
  const errores = [];
  const err = (m) => errores.push(`${rutaPagina}: ${m}`);
  for (const t of etiquetasDe(html)) {
    for (const [nombre, valor] of t.attrs) {
      if (nombre.startsWith('on')) err(`atributo ${nombre} (manejador en línea).`);
      if (nombre.startsWith('data-')) {
        const pn = contienePalabraProhibida(nombre);
        if (pn) err(`el atributo ${nombre} contiene "${pn}".`);
        if (nombre === 'data-verdad' && !juego) err('data-verdad solo puede estar en el juego.');
      }
      if (nombre === 'id' || nombre === 'class' || nombre === 'alt' || nombre.startsWith('data-')) {
        const pv = contienePalabraProhibida(desescaparHtml(valor));
        if (pv) err(`${nombre}="${valor}" contiene la palabra prohibida "${pv}".`);
        if (nombre === 'class' && valor.split(/s+/).some((c) => /^dato/i.test(c))) {
          err(`class="${valor}" contiene una clase que empieza por dato.`);
        }
      }
    }
  }
  return errores;
}

/** Lista blanca exacta de direcciones de las guías y rutas del juego sin palabras prohibidas [10.1.1]. */
export function comprobarListaBlanca({ direcciones = DIRECCIONES_EXCEPTUADAS, guias = RUTAS_GUIAS, rutas = RUTAS } = {}) {
  const errores = [];
  const esperadas = [
    'en/how-to-spot-ai-images/',
    'en/how-to-spot-fake-news/',
    'es/como-saber-si-una-imagen-es-ia/',
    'es/como-detectar-un-bulo/'
  ];
  if (!Array.isArray(direcciones) || direcciones.length !== 4 || direcciones.some((d, i) => d !== esperadas[i])) {
    errores.push('DIRECCIONES_EXCEPTUADAS no son exactamente las cuatro direcciones de la spec (10.1.1); cambiarlas exige permiso del usuario y cambiar CLAUDE.md.');
  }
  const deGuias = IDIOMAS.flatMap((i) => ['guia_imagenes', 'guia_desinformacion'].map((c) => `${i}/${guias?.[i]?.[c]}`));
  if (!Array.isArray(direcciones) || deGuias.length !== direcciones.length || deGuias.some((d, i) => d !== direcciones[i])) {
    errores.push('DIRECCIONES_EXCEPTUADAS no coincide con RUTAS_GUIAS (idioma + valor).');
  }
  for (const idioma of IDIOMAS) {
    for (const [clave, valor] of Object.entries(rutas?.[idioma] ?? {})) {
      const p = contienePalabraProhibida(valor);
      if (p) errores.push(`RUTAS.${idioma}.${clave} ("${valor}") contiene la palabra prohibida "${p}".`);
    }
  }
  return errores;
}

/**
 * Errores de un conjunto de páginas generadas. `mapa`: Map<ruta, contenido>; `existentes`: rutas de archivos que existen fuera
 * del mapa (css/, js/, img/, fonts/, casos/, data/ y los créditos). `pendientes`: recursos que aún no existen y no se exigen.
 */
export function comprobarSitio(mapa, existentes = [], { pendientes = [] } = {}) {
  const errores = [];
  const err = (r, m) => errores.push(`${r}: ${m}`);
  const fuera = new Set(existentes);
  const aplazados = new Set(pendientes);
  const existe = (r) => mapa.has(r) || fuera.has(r) || aplazados.has(r);

  // Resuelve una URL interna (relativa a `carpeta` o absoluta de DOMINIO) a una ruta del sitio; null si no es interna.
  const resolver = (rutaPagina, carpeta, valor, etiqueta, contexto) => {
    let v = valor.split(/[?#]/)[0];
    let destino;
    if (v.startsWith(DOMINIO)) {
      destino = v.slice(DOMINIO.length);
    } else if (/^[a-z][a-z0-9+.-]*:/i.test(v) || v.startsWith('//')) {
      return null;
    } else if (v.startsWith('/')) {
      err(rutaPagina, `${etiqueta}="${valor}" empieza por /; las rutas deben ser relativas.`);
      return null;
    } else {
      destino = posix.normalize(posix.join(carpeta, v));
      if (destino === '.' || destino === './') destino = '';
      if (destino.startsWith('..')) {
        err(rutaPagina, `${etiqueta}="${valor}" sale del sitio.`);
        return null;
      }
      v = destino;
    }
    const archivo = destino === '' || destino.endsWith('/') ? `${destino}index.html` : destino;
    if (!existe(archivo)) {
      if (existe(`${destino}/index.html`)) err(rutaPagina, `${etiqueta}="${valor}" no acaba en / (todas las direcciones acaban en barra).`);
      else err(rutaPagina, `${etiqueta}="${valor}" no existe${contexto ? ` (${contexto})` : ''}.`);
    }
    if (palabraProhibidaEnRuta(destino)) {
      err(rutaPagina, `${etiqueta}="${valor}" lleva una palabra prohibida (${contienePalabraProhibida(destino)}) en la ruta.`);
    }
    return destino;
  };

  for (const [rutaPagina, texto] of mapa) {
    if (palabraProhibidaEnRuta(rutaPagina)) err(rutaPagina, `la ruta lleva una palabra prohibida (${contienePalabraProhibida(rutaPagina)}).`);
    if (rutaPagina === 'robots.txt') {
      if (texto !== ROBOTS) err(rutaPagina, 'no es el robots.txt de la spec.');
      continue;
    }
    if (rutaPagina === 'sitemap.xml') {
      for (const m of texto.matchAll(/<loc>([^<]*)<\/loc>/g)) {
        const loc = m[1];
        if (!loc.startsWith(DOMINIO)) {
          err(rutaPagina, `<loc>${loc}</loc> no es una URL de ${DOMINIO}`);
          continue;
        }
        const destino = loc.slice(DOMINIO.length);
        if (destino !== '' && !destino.endsWith('/')) err(rutaPagina, `<loc>${loc}</loc> no acaba en /.`);
        if (palabraProhibidaEnRuta(destino)) err(rutaPagina, `<loc>${loc}</loc> lleva una palabra prohibida en la ruta.`);
        const pagina = `${destino}index.html`;
        if (!existe(pagina)) err(rutaPagina, `<loc>${loc}</loc> no existe.`);
        const html = mapa.get(pagina);
        if (html !== undefined && /<meta name="robots" content="noindex">/.test(html)) err(rutaPagina, `<loc>${loc}</loc> es una página noindex.`);
        if (html !== undefined && /data-pagina="redireccion"/.test(html)) err(rutaPagina, `<loc>${loc}</loc> es una redirección.`);
      }
      continue;
    }
    if (!rutaPagina.endsWith('.html')) continue;

    const carpeta = posix.dirname(rutaPagina) === '.' ? '' : `${posix.dirname(rutaPagina)}/`;
    const es404 = rutaPagina === '404.html';
    const juego = esJuego(rutaPagina);
    const html = texto;

    if (/\{\{|\}\}|\[\[|\]\]/.test(html)) err(rutaPagina, 'quedan marcadores sin sustituir ({{…}} o [[…]]).');
    const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(html)?.[1];
    if (csp === undefined || csp !== CSP) err(rutaPagina, 'la CSP no es la de la spec.');
    if (juego) {
      for (const s of SUBCADENAS_GUIAS) if (html.includes(s)) err(rutaPagina, `el juego contiene la dirección de una guía (${s}).`);
    }
    if (rutaPagina === 'index.html' && /id="app"/.test(html)) err(rutaPagina, 'la raíz no puede contener id="app".');

    errores.push(...comprobarAtributos(rutaPagina, html, { juego }));
    for (const t of etiquetasDe(html)) {
      if (es404 && ['canonical', 'alternate'].includes(t.get('rel')) && t.nombre === 'link') err(rutaPagina, 'la 404 no lleva canonical ni hreflang.');
      for (const nombre of ['href', 'src']) {
        const valor = t.get(nombre);
        if (valor === undefined) continue;
        const v = desescaparHtml(valor);
        if (es404) {
          if (!v.startsWith(DOMINIO)) err(rutaPagina, `${nombre}="${valor}" debe empezar por ${DOMINIO} (la 404 usa URL absolutas).`);
          else resolver(rutaPagina, carpeta, v, nombre);
          continue;
        }
        if (v === '' || v.startsWith('#') || v.startsWith('mailto:')) continue;
        if (v.startsWith(DOMINIO)) {
          const rel = (t.get('rel') ?? '').split(/\s+/);
          if (t.nombre === 'link' && (rel.includes('canonical') || rel.includes('alternate'))) resolver(rutaPagina, carpeta, v, nombre);
          else err(rutaPagina, `${nombre}="${valor}" es una URL absoluta del dominio fuera de los metadatos (usa una ruta relativa).`);
        } else if (/^https:\/\//i.test(v)) {
          if (t.nombre !== 'a') err(rutaPagina, `${nombre}="${valor}" carga un recurso externo.`);
          else {
            if (!(t.get('rel') ?? '').split(/\s+/).includes('noopener')) err(rutaPagina, `el enlace externo ${valor} necesita rel="noopener".`);
            if (t.get('target') !== undefined) err(rutaPagina, `el enlace externo ${valor} no puede llevar target.`);
            if (juego) err(rutaPagina, `el juego no puede enlazar a sitios externos (${valor}).`);
          }
        } else if (/^[a-z][a-z0-9+.-]*:/i.test(v) || v.startsWith('//')) {
          err(rutaPagina, `${nombre}="${valor}" usa un esquema o un origen no permitido.`);
        } else {
          resolver(rutaPagina, carpeta, v, nombre);
        }
      }
      if (t.nombre === 'meta') {
        const prop = t.get('property');
        const contenido = t.get('content') ?? '';
        if (!es404 && (prop === 'og:url' || prop === 'og:image')) {
          if (!contenido.startsWith(DOMINIO)) err(rutaPagina, `${prop} debe ser una URL absoluta de ${DOMINIO}`);
          else resolver(rutaPagina, carpeta, contenido, prop);
        }
        if (t.get('http-equiv')?.toLowerCase() === 'refresh') {
          const u = /url=(.+)$/i.exec(contenido)?.[1];
          if (u) resolver(rutaPagina, carpeta, u.trim(), 'refresh');
        }
      }
    }

    // JSON-LD
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      if (es404) err(rutaPagina, 'la 404 no lleva JSON-LD.');
      try {
        const urls = [];
        const recorrer = (x) => {
          if (typeof x === 'string' && x.startsWith(DOMINIO)) urls.push(x);
          else if (x && typeof x === 'object') Object.values(x).forEach(recorrer);
        };
        recorrer(JSON.parse(m[1]));
        for (const u of urls) resolver(rutaPagina, carpeta, u, 'JSON-LD');
      } catch {
        err(rutaPagina, 'el JSON-LD no es JSON válido.');
      }
    }

    if (es404) {
      if (!/<meta name="robots" content="noindex">/.test(html)) err(rutaPagina, 'la 404 debe llevar noindex.');
      if (/<script/i.test(html)) err(rutaPagina, 'la 404 no puede llevar <script>.');
      if (/<meta name="description"|property="og:|rel="canonical"|hreflang="(en|es|x-default)" href/.test(html)) {
        err(rutaPagina, 'la 404 no lleva description, Open Graph, canonical ni hreflang de cabecera.');
      }
      if (!/<html lang="en">/.test(html) || !/lang="es"/.test(html) || !/data-pagina="no-encontrada"/.test(html)) {
        err(rutaPagina, 'la 404 debe ser <html lang="en"> con un bloque lang="es" y data-pagina="no-encontrada".');
      }
    }
  }
  return errores;
}

// Avisos (no errores): título > 60 o descripción fuera de 70-155, salvo la 404 [10.6.5].
export function avisosMeta(mapa) {
  const avisos = [];
  for (const [r, html] of mapa) {
    if (!r.endsWith('.html') || r === '404.html') continue;
    if (/data-pagina="redireccion"/.test(html)) continue;
    const titulo = /<title>([^<]*)<\/title>/.exec(html)?.[1];
    const desc = /<meta name="description" content="([^"]*)">/.exec(html)?.[1];
    if (titulo !== undefined && largo(desescaparHtml(titulo)) > 60) avisos.push(`${r}: el título mide ${largo(desescaparHtml(titulo))} caracteres (más de 60).`);
    if (desc !== undefined) {
      const l = largo(desescaparHtml(desc));
      if (l < 70 || l > 155) avisos.push(`${r}: la descripción mide ${l} caracteres (debe medir entre 70 y 155).`);
    }
  }
  return avisos;
}

// ---------- Lectura y escritura ----------

export function leerPlantillas(raiz = RAIZ) {
  const r = {};
  for (const nombre of PLANTILLAS) r[nombre] = lf(fs.readFileSync(path.join(raiz, 'herramientas', 'plantillas', `${nombre}.html`), 'utf8'));
  return r;
}

export function leerEntradas(raiz = RAIZ) {
  const contenido = {};
  for (const idioma of IDIOMAS) {
    contenido[idioma] = {};
    for (const clave of CLAVES_CONTENIDO) {
      const f = path.join(raiz, 'herramientas', 'contenido', idioma, `${clave}.html`);
      if (fs.existsSync(f)) contenido[idioma][clave] = lf(fs.readFileSync(f, 'utf8'));
    }
  }
  const calendario = JSON.parse(fs.readFileSync(path.join(raiz, 'data', 'calendario.json'), 'utf8'));
  const dirFacts = path.join(raiz, 'data', 'facts');
  const meses = fs.existsSync(dirFacts)
    ? fs
        .readdirSync(dirFacts)
        .filter((f) => /^\d{4}-\d{2}\.json$/.test(f))
        .sort()
        .map((f) => JSON.parse(fs.readFileSync(path.join(dirFacts, f), 'utf8')))
    : [];
  return { plantillas: leerPlantillas(raiz), contenido, calendario, meses };
}

// Mayor número de caso con página en disco (0 si no hay).
export function ultimoArchivadoEnDisco(raiz = RAIZ) {
  let max = 0;
  for (const [idioma, patron] of [['en', /^case-(\d+)$/], ['es', /^caso-(\d+)$/]]) {
    const dir = path.join(raiz, idioma, idioma === 'en' ? 'archive' : 'archivo');
    if (!fs.existsSync(dir)) continue;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const m = e.isDirectory() ? patron.exec(e.name) : null;
      if (m) max = Math.max(max, Number(m[1]));
    }
  }
  return max;
}

// Rutas de los archivos que existen fuera del mapa y que enlazan las páginas.
export function existentesDeDisco(raiz = RAIZ) {
  const r = [];
  const recorrer = (dir) => {
    const abs = path.join(raiz, dir);
    if (!fs.existsSync(abs)) return;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) recorrer(rel);
      else r.push(rel);
    }
  };
  for (const d of ['css', 'js', 'img', 'fonts', 'casos', 'data']) recorrer(d);
  for (const f of Object.values(ARCHIVOS_CREDITOS_PAGINA)) if (fs.existsSync(path.join(raiz, f))) r.push(f);
  return r;
}

const DIRS_DIAS = [['en', 'archive', /^case-\d+$/], ['es', 'archivo', /^caso-\d+$/]];

/**
 * Escribe el mapa bajo `raiz`. Solo toca lo que cambia (CRLF y LF cuentan como iguales) y borra las carpetas de días de archivo
 * que ya no correspondan (solo dentro de en/archive/ y es/archivo/). Devuelve {escritas, sinCambios, borradas}.
 */
export function escribirSitio(mapa, raiz = RAIZ, { simular = false } = {}) {
  const escritas = [];
  const sinCambios = [];
  for (const [r, contenido] of mapa) {
    const destino = path.join(raiz, ...r.split('/'));
    const actual = fs.existsSync(destino) ? lf(fs.readFileSync(destino, 'utf8')) : null;
    if (actual === contenido) {
      sinCambios.push(r);
      continue;
    }
    escritas.push(r);
    if (!simular) {
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, contenido, 'utf8');
    }
  }
  const borradas = [];
  for (const [idioma, carpeta, patron] of DIRS_DIAS) {
    const dir = path.join(raiz, idioma, carpeta);
    if (!fs.existsSync(dir)) continue;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory() || !patron.test(e.name)) continue;
      if (mapa.has(`${idioma}/${carpeta}/${e.name}/index.html`)) continue;
      borradas.push(`${idioma}/${carpeta}/${e.name}/`);
      if (!simular) fs.rmSync(path.join(dir, e.name), { recursive: true, force: true });
    }
  }
  return { escritas, sinCambios, borradas };
}

// ---------- CLI [10.6.2] ----------

export function analizarArgumentosPaginas(argv) {
  const r = { simular: false, ultimo: false, ahora: null, salida: null, errores: [] };
  for (const a of argv) {
    if (a === '--simular') r.simular = true;
    else if (a === '--ultimo') r.ultimo = true;
    else if (a.startsWith('--ahora=')) {
      const ms = Date.parse(a.slice('--ahora='.length));
      if (Number.isNaN(ms) || !a.includes('T')) r.errores.push(`--ahora no es una fecha y hora ISO válida: ${a.slice(8)}.`);
      else r.ahora = ms;
    } else if (a.startsWith('--salida=') && a.length > '--salida='.length) r.salida = a.slice('--salida='.length);
    else r.errores.push(`Argumento desconocido: ${a}.`);
  }
  if (r.ahora !== null && r.salida === null) {
    r.errores.push('--ahora exige --salida=<carpeta> (así no se escribe por error un archivo "del futuro" en lo publicado).');
  }
  return r;
}

// La carpeta de salida no puede estar dentro del repositorio salvo en capturas/ (en .gitignore).
export function salidaPermitida(salida, raiz = RAIZ) {
  const rel = path.relative(raiz, path.resolve(salida));
  const dentro = rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  if (!dentro) return true;
  const partes = rel.split(path.sep);
  return partes[0] === 'capturas' && partes.length > 1;
}

export function ejecutar(argv, { raiz = RAIZ, ahoraMs = Date.now(), log = console.log, error = console.error } = {}) {
  const args = analizarArgumentosPaginas(argv);
  if (args.errores.length > 0) {
    args.errores.forEach((e) => error(e));
    return 1;
  }
  if (args.salida !== null && !salidaPermitida(args.salida, raiz)) {
    error('--salida no puede estar dentro del repositorio (salvo en capturas/): contendría páginas que no son las publicadas.');
    return 1;
  }
  let mapa;
  let entradas;
  try {
    entradas = leerEntradas(raiz);
    mapa = generarSitio({ entradas, ahoraMs: args.ahora ?? ahoraMs });
  } catch (e) {
    error(`No se pueden generar las páginas: ${e.message}`);
    return 1;
  }
  const archivados = diasArchivables({ calendario: entradas.calendario, meses: entradas.meses, ahoraMs: args.ahora ?? ahoraMs });
  const ultimo = archivados.length ? archivados[archivados.length - 1].n : 0;
  if (args.ultimo) {
    log(String(ultimo));
    return 0;
  }
  const errores = comprobarSitio(mapa, [...existentesDeDisco(raiz), ...Object.values(ARCHIVOS_CREDITOS_PAGINA)], { pendientes: RECURSOS_PENDIENTES });
  if (errores.length > 0) {
    errores.forEach((e) => error(`ERROR: ${e}`));
    error('No se escribe nada.');
    return 1;
  }
  const destino = args.salida === null ? raiz : path.resolve(args.salida);
  const r = escribirSitio(mapa, destino, { simular: args.simular });
  if (args.simular) {
    log('Simulación (no se escribe nada):');
    r.escritas.forEach((f) => log(`  cambiaría ${f}`));
    r.borradas.forEach((f) => log(`  borraría ${f}`));
  }
  log(
    `${r.escritas.length} páginas ${args.simular ? 'cambiarían' : 'escritas'}, ${r.sinCambios.length} sin cambios, ${archivados.length} días archivados (hasta el caso n.º ${ultimo}).` +
      (r.borradas.length ? ` ${r.borradas.length} días borrados del archivo.` : '')
  );
  for (const a of avisosMeta(mapa)) log(`AVISO: ${a}`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = ejecutar(process.argv.slice(2));
}
