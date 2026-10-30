// Generador de las páginas de créditos en/credits/ y es/creditos/ (spec 4.5, 2.7, 4.23 y 10.10).
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ARCHIVOS_CREDITOS_PAGINA, escaparHtml as escaparHtmlPagina, generarPagina, leerPlantillas, prefijo } from './paginas.mjs';
import { TEXTOS } from '../js/textos.js';
import { IDIOMAS } from '../js/diario.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const TIPOGRAFIAS = [
  { familia: 'Oswald', licencia: 'SIL Open Font License 1.1', archivo: 'fonts/OFL-oswald.txt' },
  { familia: 'Special Elite', licencia: 'Apache License 2.0', archivo: 'fonts/LICENSE-special-elite.txt' }
];

// Página de créditos de cada idioma [10.10]: creditos.html y creditos.es.html ya solo redirigen (los escribe paginas.mjs).
export const ARCHIVOS_CREDITOS = ARCHIVOS_CREDITOS_PAGINA;

export const escaparHtml = escaparHtmlPagina;

export function parejasCreditos(banco) {
  const vistas = new Map();
  for (const img of banco?.imagenes ?? []) {
    const fuente = String(img.fuente).trim();
    const licencia = String(img.licencia).trim();
    vistas.set(`${fuente}\u0000${licencia}`, { fuente, licencia });
  }
  return [...vistas.values()].sort(
    (a, b) => a.fuente.localeCompare(b.fuente, 'en-US') || a.licencia.localeCompare(b.licencia, 'en-US')
  );
}

export function generarCreditosHtml({ parejas, idioma = 'en', textos = TEXTOS[idioma], tipografias = TIPOGRAFIAS, plantillas = leerPlantillas() }) {
  if (!IDIOMAS.includes(idioma)) throw new TypeError(`Idioma no válido: ${String(idioma)}`);
  const c = textos.creditos;
  const e = escaparHtml;
  const tipos = tipografias
    .map((t) => `      <li>${e(t.familia)} · ${e(t.licencia)} (<a href="${prefijo(2)}${e(t.archivo)}">${e(c.ver_licencia)}</a>)</li>`)
    .join('\n');
  const imagenes =
    parejas.length > 0
      ? `    <p>${e(c.imagenes_intro)}</p>
    <ul id="creditos-lista">
${parejas.map((p) => `      <li>${e(p.fuente)} · ${e(p.licencia)}</li>`).join('\n')}
    </ul>`
      : `    <p>${e(c.sin_imagenes)}</p>`;
  const cuerpo = `<h1>${e(c.titulo)}</h1>
<p>${e(c.intro)}</p>
<section aria-labelledby="creditos-tipografias">
    <h2 id="creditos-tipografias">${e(c.tipografias)}</h2>
    <ul>
${tipos}
    </ul>
  </section>
  <section aria-labelledby="creditos-imagenes">
    <h2 id="creditos-imagenes">${e(c.imagenes)}</h2>
${imagenes}
  </section>
  <section id="creditos-afirmaciones">
    <h2>${e(c.afirmaciones)}</h2>
    <p>${e(c.afirmaciones_texto)}</p>
  </section>`;
  return generarPagina({
    idioma,
    clave: 'creditos',
    titulo: c.titulo,
    descripcion: `${c.intro} ${c.imagenes_intro}`,
    cuerpo,
    plantillas,
    dataPagina: 'creditos'
  });
}

export function creditosParaBanco(banco, idioma = 'en', plantillas = leerPlantillas()) {
  return generarCreditosHtml({ idioma, parejas: parejasCreditos(banco), plantillas });
}

// Escribe las dos páginas (creditos.html y creditos.es.html). `raiz` permite probarlo en una carpeta temporal.
export function escribirCreditos({ banco, raiz = RAIZ }) {
  const plantillas = leerPlantillas();
  for (const idioma of IDIOMAS) {
    const destino = resolve(raiz, ...ARCHIVOS_CREDITOS[idioma].split('/'));
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, creditosParaBanco(banco, idioma, plantillas), { encoding: 'utf8' });
  }
}

// ---------- CLI ----------

function hayImagenes() {
  const dir = resolve(RAIZ, 'casos');
  return existsSync(dir) && readdirSync(dir).some((f) => f.toLowerCase().endsWith('.webp'));
}

function principal() {
  const rutaBanco = resolve(RAIZ, 'herramientas', 'banco.json');
  if (!existsSync(rutaBanco)) {
    if (hayImagenes()) {
      console.error(
        'No se encuentra herramientas/banco.json; no se regeneran en/credits/ ni es/creditos/ para no borrar los créditos publicados.'
      );
      process.exit(1);
    }
    escribirCreditos({ banco: { version: 2, imagenes: [] } });
    console.log('en/credits/ y es/creditos/ generados sin imágenes.');
    return;
  }
  const banco = JSON.parse(readFileSync(rutaBanco, 'utf8'));
  escribirCreditos({ banco });
  console.log(`en/credits/ y es/creditos/ generados con ${parejasCreditos(banco).length} fuente(s).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal();
