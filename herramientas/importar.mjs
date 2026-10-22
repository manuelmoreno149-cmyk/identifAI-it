// Importador por temas (spec 4.4.2 y 4.4.4). Node 20+, dependencia: sharp.
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync, copyFileSync, unlinkSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import sharp from 'sharp';
import { ofuscar, sumarDias, fechaLocal, desofuscar, temaValido, validarCalendario } from '../js/diario.js';
import {
  analizarCarpeta,
  analizarArgumentos,
  analizarLote,
  comprobarReimportacion,
  mensajeReimportacion,
  planificar,
  barajar,
  nuevoId,
  distanciaHamming,
  analizarPesos,
  mensajePeso,
  avisosMezcla,
  POSICIONES_RECORTE,
  EXT_IMAGEN
} from './temas.mjs';
import { escribirCreditos } from './creditos.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUTA_TEMAS = join(RAIZ, 'entrada', 'temas');
const RUTA_CASOS = join(RAIZ, 'casos');
const RUTA_BANCO = join(RAIZ, 'herramientas', 'banco.json');
const RUTA_BANCO_ANTERIOR = join(RAIZ, 'herramientas', 'banco.anterior.json');
const RUTA_LOTE = join(RAIZ, 'herramientas', 'lote.json');
const RUTA_CALENDARIO = join(RAIZ, 'data', 'calendario.json');
const LANZAMIENTO = '2026-11-01';

const IGNORADOS = new Set(['thumbs.db', 'desktop.ini']);
const aleatorio = () => randomInt(2 ** 32) / 2 ** 32;
const json = (o) => JSON.stringify(o, null, 2) + '\n';
const dos = (n) => String(n).padStart(2, '0');

function salir(mensajes, codigo = 1) {
  for (const m of [].concat(mensajes)) console.error(m);
  process.exit(codigo);
}

const ignorable = (nombre) => nombre.startsWith('.') || IGNORADOS.has(nombre.toLowerCase());

async function dhash(ruta) {
  const { data } = await sharp(ruta).rotate().greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  let bits = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += data[y * 9 + x] < data[y * 9 + x + 1] ? '1' : '0';
  let hex = '';
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

// Lee todas las carpetas de entrada/temas/. De las omitidas solo interesan los nombres de archivo
// (para el aviso de lote.json); la estructura de esas carpetas no se valida.
function leerCarpetas() {
  if (!existsSync(RUTA_TEMAS)) return [];
  const carpetas = [];
  for (const entrada of readdirSync(RUTA_TEMAS, { withFileTypes: true })) {
    if (!entrada.isDirectory() || ignorable(entrada.name)) continue;
    const c = { nombre: entrada.name, subcarpetas: [], sueltos: [], ia: [], real: [] };
    const base = join(RUTA_TEMAS, entrada.name);
    for (const hijo of readdirSync(base, { withFileTypes: true })) {
      if (ignorable(hijo.name)) continue;
      if (hijo.isDirectory()) {
        c.subcarpetas.push(hijo.name);
        if (hijo.name !== 'ia' && hijo.name !== 'real') continue;
        for (const f of readdirSync(join(base, hijo.name), { withFileTypes: true })) {
          if (ignorable(f.name)) continue;
          if (f.isFile() && EXT_IMAGEN.test(f.name)) c[hijo.name].push(f.name);
          else c.sueltos.push(`${hijo.name}/${f.name}`);
        }
      } else {
        c.sueltos.push(hijo.name);
      }
    }
    c.ia.sort();
    c.real.sort();
    carpetas.push(c);
  }
  return carpetas;
}

async function dimensionesFinales(ruta) {
  const m = await sharp(ruta).metadata();
  const girada = m.orientation >= 5;
  return { ancho: girada ? m.height : m.width, alto: girada ? m.width : m.height };
}

async function comprobarArchivo(ruta) {
  const m = await sharp(ruta).metadata();
  if (m.format !== 'webp' || m.width !== 1080 || m.height !== 1350) {
    throw new Error(`${ruta} no es WebP de 1080 x 1350.`);
  }
  for (const campo of ['exif', 'xmp', 'icc', 'iptc']) {
    if (m[campo]) throw new Error(`${ruta} conserva metadatos (${campo}).`);
  }
}

function leerLote(errores) {
  if (!existsSync(RUTA_LOTE)) return null;
  try {
    return JSON.parse(readFileSync(RUTA_LOTE, 'utf8').replace(/^﻿/, ''));
  } catch (e) {
    errores.push(`herramientas/lote.json no es JSON válido: ${e.message}.`);
    return undefined;
  }
}

const rutasDe = (carpeta) => [...carpeta.ia.map((f) => `${carpeta.nombre}/ia/${f}`), ...carpeta.real.map((f) => `${carpeta.nombre}/real/${f}`)];

async function main() {
  const args = analizarArgumentos(process.argv.slice(2));
  if (args.errores.length > 0) salir(args.errores);
  const { simular, bancoNuevo, reimportar, confirmar } = args;
  const hoy = fechaLocal(new Date());

  const casosExistentes = existsSync(RUTA_CASOS) ? readdirSync(RUTA_CASOS).filter((f) => f.toLowerCase().endsWith('.webp')) : [];

  // 2. Banco
  let banco;
  if (existsSync(RUTA_BANCO)) {
    banco = JSON.parse(readFileSync(RUTA_BANCO, 'utf8'));
    if (banco.version !== 2) {
      salir(
        'herramientas/banco.json es de la versión 1 (anterior a los temas por día). Bórralo junto con casos/ y data/calendario.json y vuelve a importar.'
      );
    }
  }

  // 3. Calendario
  let calendario = { version: 2, lanzamiento: LANZAMIENTO, dias: [] };
  if (existsSync(RUTA_CALENDARIO)) {
    const c = JSON.parse(readFileSync(RUTA_CALENDARIO, 'utf8'));
    if (c.version !== 2 || c.lanzamiento !== LANZAMIENTO || !validarCalendario(c)) {
      salir(
        'data/calendario.json no es un calendario definitivo (¿datos de prueba de D-46?). Bórralo junto con las imágenes de casos/ antes de importar.'
      );
    }
    calendario = c;
  }

  // 4. Carpetas (y comprobaciones propias de la reimportación)
  const carpetas = leerCarpetas();
  const errores = [];
  const avisos = [];

  if (reimportar) {
    const previos = comprobarReimportacion({ calendario, nombresCarpetas: carpetas.map((c) => c.nombre), hoyISO: hoy });
    if (previos.length > 0) salir(previos);
    if (!banco) console.log('No hay herramientas/banco.json; la reimportación crea uno nuevo.');
    banco = { version: 2, imagenes: [] }; // el banco anterior se sustituye: sus dHash no cuentan
  } else if (!banco) {
    if (casosExistentes.length === 0 && calendario.dias.length === 0) {
      banco = { version: 2, imagenes: [] };
      console.log('No hay banco: se crea uno nuevo vacío.');
    } else if (bancoNuevo) {
      banco = { version: 2, imagenes: [] };
      console.log('Se crea un banco nuevo vacío (--banco-nuevo); los días publicados quedan fuera del banco.');
    } else {
      salir(
        'No se encuentra herramientas/banco.json, que es privado y no está en el repo. Restaura tu copia o usa --banco-nuevo si sabes lo que haces.'
      );
    }
  }

  if (carpetas.length === 0) {
    console.log('No hay temas por importar en entrada/temas/.');
    return;
  }

  // 5. Plan
  const ultimoDia = reimportar ? 0 : calendario.dias.length;
  const plan = planificar({ carpetas, ultimoDia, hoyISO: hoy, lanzamiento: calendario.lanzamiento, sumarDias, temaValido });
  errores.push(...plan.errores);
  avisos.push(...plan.avisos);

  const nombreDe = (n) =>
    carpetas.find((c) => {
      try {
        return analizarCarpeta(c.nombre).n === n;
      } catch {
        return false;
      }
    })?.nombre;

  for (const n of plan.omitidos) {
    const dia = calendario.dias[n - 1];
    const del = banco.imagenes.filter((i) => i.dia === n);
    if (!bancoNuevo && (del.length !== 5 || del.some((i) => i.tema !== dia.tema))) {
      errores.push(`${nombreDe(n)}: ya está en el calendario, pero el banco no tiene sus 5 imágenes con el tema "${dia.tema}".`);
    }
    console.log(`${nombreDe(n)}: ya importado, se omite`);
  }

  // 5 bis. Recortes manuales
  const rutasNuevas = plan.nuevos.flatMap((d) => d.imagenes.map((i) => i.ruta));
  const rutasOmitidas = plan.omitidos.flatMap((n) => {
    const c = carpetas.find((x) => x.nombre === nombreDe(n));
    return c ? rutasDe(c) : [];
  });
  const lote = leerLote(errores);
  let recortes = {};
  if (lote !== undefined) {
    const a = analizarLote(lote, rutasNuevas, rutasOmitidas);
    recortes = a.recortes;
    errores.push(...a.errores);
    avisos.push(...a.avisos);
  }

  // 6. Imágenes nuevas
  const hashes = banco.imagenes.map((i) => ({ ruta: i.original, dhash: i.dhash }));
  if (errores.length === 0) {
    for (const dia of plan.nuevos) {
      for (const img of dia.imagenes) {
        const abs = join(RUTA_TEMAS, img.ruta);
        try {
          const { ancho, alto } = await dimensionesFinales(abs);
          img.proporcion = `${ancho} x ${alto}`;
          if (Math.max(1080 / ancho, 1350 / alto) > 1) {
            avisos.push(`${img.ruta} mide ${ancho} x ${alto} y se ampliará; puede verse más blanda que el resto.`);
          }
          img.dhash = await dhash(abs);
        } catch (e) {
          errores.push(`No se puede decodificar ${img.ruta}: ${e.message}`);
          continue;
        }
        for (const h of hashes) {
          if (distanciaHamming(h.dhash, img.dhash) <= 5) {
            errores.push(`Imágenes duplicadas: ${h.ruta} y ${img.ruta}.`);
          }
        }
        hashes.push({ ruta: img.ruta, dhash: img.dhash });
      }
    }
  }

  if (errores.length > 0) {
    salir(['No se importa nada. Corrige lo siguiente y vuelve a ejecutar:', ...errores.map((e) => `  ERROR: ${e}`)]);
  }

  // Imágenes antiguas que borraría la reimportación: las del calendario y las del banco anteriores que estén en casos/.
  const antiguas = new Set();
  if (reimportar) {
    const idsViejos = new Set(calendario.dias.flatMap((d) => d.pruebas));
    if (existsSync(RUTA_BANCO)) for (const i of JSON.parse(readFileSync(RUTA_BANCO, 'utf8')).imagenes ?? []) idsViejos.add(i.id);
    for (const id of idsViejos) if (casosExistentes.includes(`${id}.webp`)) antiguas.add(`${id}.webp`);
  }

  // 7. Simulación
  const manuales = Object.keys(recortes);
  if (simular || (reimportar && !confirmar)) {
    console.log(simular ? 'Plan (simulación, no se escribe nada):' : 'Plan de reimportación (no se escribe nada):');
    for (const d of plan.nuevos) {
      const g = d.imagenes.filter((i) => i.tipo === 'generada').length;
      const fuentes = [...new Set(d.imagenes.map((i) => i.fuente))].join(', ');
      console.log(`  ${dos(d.n)} · ${d.fecha} · ${d.tema} · ia: ${g}, real: ${5 - g} · ${fuentes}`);
    }
    if (manuales.length > 0) {
      console.log('  Recortes manuales (lote.json):');
      for (const r of manuales) console.log(`    ${r}: ${recortes[r]}`);
    } else {
      console.log('  Todas las imágenes usan el recorte por atención.');
    }
    for (const a of avisos) console.log(`  AVISO: ${a}`);
    console.log('  Antes de importar, revisa a mano que ninguna imagen generada conserve la marca o el logo de Gemini.');
    if (reimportar) console.log(mensajeReimportacion({ dias: calendario.dias, borradas: antiguas.size }));
    return;
  }
  if (plan.nuevos.length === 0) {
    for (const a of avisos) console.log(`AVISO: ${a}`);
    console.log('No hay días nuevos que importar.');
    return;
  }

  // Fase B
  if (reimportar && existsSync(RUTA_BANCO)) copyFileSync(RUTA_BANCO, RUTA_BANCO_ANTERIOR);
  mkdirSync(RUTA_CASOS, { recursive: true });
  mkdirSync(dirname(RUTA_CALENDARIO), { recursive: true });
  const usados = new Set([...banco.imagenes.map((i) => i.id), ...casosExistentes.map((f) => f.replace(/\.webp$/i, ''))]);
  if (reimportar) for (const d of calendario.dias) for (const id of d.pruebas) usados.add(id);
  if (reimportar && existsSync(RUTA_BANCO_ANTERIOR)) {
    for (const i of JSON.parse(readFileSync(RUTA_BANCO_ANTERIOR, 'utf8')).imagenes ?? []) usados.add(i.id);
  }
  const diasNuevos = [];
  const entradasBanco = [];
  const trabajos = [];
  for (const d of plan.nuevos) {
    const orden = barajar(d.imagenes, aleatorio);
    const ids = orden.map(() => {
      const id = nuevoId(aleatorio, usados);
      usados.add(id);
      return id;
    });
    const verdades = orden.map((i) => (i.tipo === 'generada' ? 1 : 0));
    diasNuevos.push({ n: d.n, fecha: d.fecha, tema: d.tema, pruebas: ids, clave: ofuscar(verdades, d.n) });
    orden.forEach((img, i) => {
      const recorte = recortes[img.ruta] ?? 'atencion';
      trabajos.push({ id: ids[i], origen: join(RUTA_TEMAS, img.ruta), recorte });
      entradasBanco.push({
        id: ids[i],
        tipo: img.tipo,
        dia: d.n,
        fecha: d.fecha,
        tema: d.tema,
        fuente: img.fuente,
        licencia: img.licencia,
        original: img.ruta,
        dhash: img.dhash,
        recorte,
        alta: hoy
      });
    });
  }
  for (const t of barajar(trabajos, aleatorio)) {
    const destino = join(RUTA_CASOS, `${t.id}.webp`);
    const position = t.recorte === 'atencion' ? sharp.strategy.attention : POSICIONES_RECORTE[t.recorte];
    await sharp(t.origen)
      .rotate()
      .resize(1080, 1350, { fit: 'cover', position })
      .webp({ quality: 80, effort: 6 })
      .toFile(destino);
    await comprobarArchivo(destino);
  }

  const nuevoBanco = { version: 2, imagenes: [...banco.imagenes, ...entradasBanco] };
  const nuevoCalendario = { ...calendario, dias: reimportar ? diasNuevos : [...calendario.dias, ...diasNuevos] };
  if (!validarCalendario(nuevoCalendario)) salir('El calendario resultante no es válido; no se escribe.');
  writeFileSync(RUTA_BANCO, json(nuevoBanco), 'utf8');
  writeFileSync(RUTA_CALENDARIO, json(nuevoCalendario), 'utf8');
  escribirCreditos({ banco: nuevoBanco });

  let borradas = 0;
  if (reimportar) {
    const nuevosIds = new Set(diasNuevos.flatMap((d) => d.pruebas));
    for (const f of antiguas) {
      if (nuevosIds.has(f.replace(/\.webp$/, ''))) continue;
      unlinkSync(join(RUTA_CASOS, f));
      borradas++;
    }
  }

  // Informe
  console.log(reimportar ? 'Días reimportados:' : 'Días añadidos:');
  for (const d of diasNuevos) console.log(`  ${dos(d.n)} · ${d.fecha} · ${d.tema}`);
  console.log(`Recortes manuales (lote.json): ${manuales.length}. El resto usa el recorte por atención.`);
  for (const a of avisos) console.log(`AVISO: ${a}`);
  const gen = nuevoCalendario.dias.map((d) => d.pruebas.reduce((s, _, i) => s + desofuscar(d.clave, d.n, i), 0));
  for (const a of avisosMezcla(gen)) console.log(a);
  const tamanos = new Map();
  for (const d of nuevoCalendario.dias) for (const id of d.pruebas) tamanos.set(id, statSync(join(RUTA_CASOS, `${id}.webp`)).size);
  const peso = mensajePeso(analizarPesos({ dias: nuevoCalendario.dias, tamanos, desofuscar }));
  if (peso) console.log(peso);
  console.log('Los originales siguen en entrada/temas/; el importador no los mueve ni los borra. Puedes archivarlos a mano.');
  if (reimportar) {
    console.log(
      `Reimportados ${diasNuevos.length} días; borradas ${borradas} imágenes antiguas de casos/. Copia del banco anterior en herramientas/banco.anterior.json.`
    );
  }
  console.log('Guarda una copia privada de herramientas/banco.json fuera del repositorio.');
}

main().catch((e) => {
  console.error(e.stack ?? e.message);
  process.exit(1);
});
