// Genera las imágenes Open Graph (10.11): img/og/portada-en.png y portada-es.png (1200 x 630, sin metadatos, <= 300 KB).
// Uso: npm run og (manual, nunca en la Action). Necesita Playwright, que se usa con npx y no está en package.json:
// la captura se hace con un script temporal que lanza `npx playwright`. Sin procesos en segundo plano: el servidor local se cierra al acabar.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import sharp from 'sharp';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IDIOMAS = ['en', 'es'];
const LIMITE = 300 * 1024;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.js': 'text/javascript' };

const servidor = createServer(async (req, res) => {
  try {
    const ruta = resolve(RAIZ, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!ruta.startsWith(RAIZ)) throw new Error('fuera');
    const datos = await readFile(ruta);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(ruta)] || 'application/octet-stream' });
    res.end(datos);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const puerto = servidor.address().port;
const tmp = await mkdtemp(join(tmpdir(), 'og-'));
let codigo = 0;
try {
  await mkdir(join(RAIZ, 'img', 'og'), { recursive: true });
  const guion = join(tmp, 'captura.cjs');
  await writeFile(guion, `
const path = require('path');
const fs = require('fs');
// npx -p deja el paquete en la caché y su .bin en el PATH; de ahí sale la ruta del módulo.
const bin = process.env.PATH.split(path.delimiter).find((d) => /node_modules[\\\\/]\\.bin$/.test(d) && fs.existsSync(path.join(d, '..', 'playwright')));
const { chromium } = require(path.join(bin, '..', 'playwright'));
(async () => {
  const b = await chromium.launch();
  try {
    for (const i of ${JSON.stringify(IDIOMAS)}) {
      const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
      await p.goto('http://127.0.0.1:${puerto}/herramientas/plantillas/og.html?idioma=' + i);
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(300);
      await p.screenshot({ path: ${JSON.stringify(tmp + sep)} + 'bruta-' + i + '.png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
      await p.close();
    }
  } finally { await b.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
`);
  // Playwright con npx (sin instalarlo en el proyecto).
  const estado = await new Promise((ok) => spawn('npx', ['--yes', '-p', 'playwright', 'node', guion], { stdio: 'inherit', shell: true, cwd: tmp }).on('close', ok));
  if (estado !== 0) throw new Error('Playwright falló. Prueba: npx playwright install chromium');
  for (const i of IDIOMAS) {
    const origen = join(tmp, `bruta-${i}.png`);
    if (!existsSync(origen)) throw new Error('Falta la captura ' + i);
    let salida = null;
    for (const colores of [256, 128, 64]) {
      const b = await sharp(origen).png({ compressionLevel: 9, palette: true, colours: colores, effort: 10 }).toBuffer();
      if (b.length <= LIMITE) { salida = b; break; }
      salida = b;
    }
    // sharp no copia metadatos por defecto
    if (salida.length > LIMITE) throw new Error(`portada-${i}.png pesa ${salida.length} bytes (> 300 KB)`);
    await writeFile(join(RAIZ, 'img', 'og', `portada-${i}.png`), salida);
    console.log(`img/og/portada-${i}.png  ${(salida.length / 1024).toFixed(0)} KB`);
  }
} catch (e) { console.error(e.message); codigo = 1; }
finally { servidor.close(); await rm(tmp, { recursive: true, force: true }); }
process.exit(codigo);
