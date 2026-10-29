// Generador de creditos.html y creditos.es.html (spec 4.5, 2.7 y 4.23).
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { TEXTOS } from '../js/textos.js';
import { IDIOMAS } from '../js/diario.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const TIPOGRAFIAS = [
  { familia: 'Oswald', licencia: 'SIL Open Font License 1.1', archivo: 'fonts/OFL-oswald.txt' },
  { familia: 'Special Elite', licencia: 'Apache License 2.0', archivo: 'fonts/LICENSE-special-elite.txt' }
];

// Página de créditos de cada idioma [4.23].
export const ARCHIVOS_CREDITOS = Object.freeze({ en: 'creditos.html', es: 'creditos.es.html' });

export function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

export function generarCreditosHtml({ parejas, idioma = 'en', textos = TEXTOS[idioma], tipografias = TIPOGRAFIAS }) {
  if (!IDIOMAS.includes(idioma)) throw new TypeError(`Idioma no válido: ${String(idioma)}`);
  const otro = IDIOMAS.find((i) => i !== idioma);
  const c = textos.creditos;
  const e = escaparHtml;
  const tipos = tipografias
    .map((t) => `      <li>${e(t.familia)} · ${e(t.licencia)} (<a href="${e(t.archivo)}">${e(c.ver_licencia)}</a>)</li>`)
    .join('\n');
  const imagenes =
    parejas.length > 0
      ? `    <p>${e(c.imagenes_intro)}</p>
    <ul id="creditos-lista">
${parejas.map((p) => `      <li>${e(p.fuente)} · ${e(p.licencia)}</li>`).join('\n')}
    </ul>`
      : `    <p>${e(c.sin_imagenes)}</p>`;

  return `<!doctype html>
<html lang="${idioma}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'">
<title>${e(c.titulo_pagina)}</title>
<link rel="stylesheet" href="css/variables.css">
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/componentes.css">
</head>
<body data-pagina="creditos">
<main id="creditos">
  <h1>${e(c.titulo)}</h1>
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
  </section>
</main>
<footer id="creditos-pie">
  <a id="creditos-volver" href="index.html">${e(c.volver)}</a>
  <a id="creditos-idioma" href="${ARCHIVOS_CREDITOS[otro]}" hreflang="${otro}" lang="${otro}">${e(c.otro_idioma)}</a>
</footer>
</body>
</html>
`;
}

export function creditosParaBanco(banco, idioma = 'en') {
  return generarCreditosHtml({ idioma, parejas: parejasCreditos(banco) });
}

// Escribe las dos páginas (creditos.html y creditos.es.html). `raiz` permite probarlo en una carpeta temporal.
export function escribirCreditos({ banco, raiz = RAIZ }) {
  for (const idioma of IDIOMAS) {
    writeFileSync(resolve(raiz, ARCHIVOS_CREDITOS[idioma]), creditosParaBanco(banco, idioma), { encoding: 'utf8' });
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
        'No se encuentra herramientas/banco.json; no se regeneran creditos.html ni creditos.es.html para no borrar los créditos publicados.'
      );
      process.exit(1);
    }
    escribirCreditos({ banco: { version: 2, imagenes: [] } });
    console.log('creditos.html y creditos.es.html generados sin imágenes.');
    return;
  }
  const banco = JSON.parse(readFileSync(rutaBanco, 'utf8'));
  escribirCreditos({ banco });
  console.log(`creditos.html y creditos.es.html generados con ${parejasCreditos(banco).length} fuente(s).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal();
