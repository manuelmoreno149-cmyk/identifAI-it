// Importador por temas (spec 4.4.2 y 4.4.4). Node 20+, dependencia: sharp.
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync, copyFileSync, unlinkSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import sharp from 'sharp';
import { ofuscar, sumarDias, fechaDelDia, fechaLocal, desofuscar, temaValido, validarCalendario, ofuscarFicha, FICHA_MAX_BYTES } from '../js/diario.js';
import { TEXTOS } from '../js/textos.js';
import {
  analizarCarpeta,
  analizarArgumentos,
  analizarLote,
  comprobarReimportacion,
  calendarioAnteriorValido,
  normalizarFicha,
  mensajeReimportacion,
  borrarAntiguas,
  planificar,
  barajar,
  nuevoId,
  distanciaHamming,
  analizarPesos,
  buscarCalidad,
  PESO_MIN_KB,
  PESO_MAX_KB,
  CALIDAD_MIN,
  CALIDAD_MAX,
  mensajePeso,
  avisosMezcla,
  POSICIONES_RECORTE,
  EXT_IMAGEN,
  EXT_FICHA
} from './temas.mjs';
import { escribirCreditos } from './creditos.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUTA_TEMAS = join(RAIZ, 'entrada', 'temas');
const RUTA_CASOS = join(RAIZ, 'casos');
const RUTA_BANCO = join(RAIZ, 'herramientas', 'banco.json');
const RUTA_BANCO_ANTERIOR = join(RAIZ, 'herramientas', 'banco.anterior.json');
const RUTA_LOTE = join(RAIZ, 'herramientas', 'lote.json');
const RUTA_CALENDARIO = join(RAIZ, 'data', 'calendario.json');

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
          if (f.isFile() && (EXT_IMAGEN.test(f.name) || EXT_FICHA.test(f.name))) c[hijo.name].push(f.name);
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

const rutasDe = (carpeta) => [
  ...carpeta.ia.filter((f) => EXT_IMAGEN.test(f)).map((f) => `${carpeta.nombre}/ia/${f}`),
  ...carpeta.real.filter((f) => EXT_IMAGEN.test(f)).map((f) => `${carpeta.nombre}/real/${f}`)
];

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
    if (banco.version === 2) {
      salir(
        'herramientas/banco.json es de la versión 2: conviértelo con npm run lanzamiento (no cambia la fecha si repites la actual o usas --sin-fecha).'
      );
    }
    if (banco.version !== 3) {
      salir(
        'herramientas/banco.json es de la versión 1 (anterior a los temas por día). Bórralo junto con casos/ y data/calendario.json y vuelve a importar.'
      );
    }
  }

  // 3. Calendario
  let calendario = { version: 4, lanzamiento: null, dias: [] };
  if (existsSync(RUTA_CALENDARIO)) {
    const c = JSON.parse(readFileSync(RUTA_CALENDARIO, 'utf8'));
    if (reimportar) {
      if (!calendarioAnteriorValido(c)) {
        salir(
          'data/calendario.json no es un calendario definitivo (¿datos de prueba de D-46?). Bórralo junto con las imágenes de casos/ antes de importar.'
        );
      }
    } else if (c?.version === 2) {
      salir(
        'data/calendario.json es de la versión 2 (sin fichas). Regenera todos los días con npm run importar -- --reimportar --confirmar (solo antes del lanzamiento).'
      );
    } else if (c?.version === 3) {
      salir('data/calendario.json es de la versión 3 (con fechas): conviértelo con npm run lanzamiento.');
    } else if (!validarCalendario(c)) {
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
    banco = { version: 3, imagenes: [] }; // el banco anterior se sustituye: sus dHash no cuentan
  } else if (!banco) {
    if (casosExistentes.length === 0 && calendario.dias.length === 0) {
      banco = { version: 3, imagenes: [] };
      console.log('No hay banco: se crea uno nuevo vacío.');
    } else if (bancoNuevo) {
      banco = { version: 3, imagenes: [] };
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
  const textoFecha = (f) => f ?? 'sin fecha de lanzamiento';
  const fechaDe = (n) => (calendario.lanzamiento ? fechaDelDia(calendario.lanzamiento, n) : null);
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

  // 5 ter. Fichas (solo en memoria: los prompts nunca se escriben ni se muestran)
  const textosFicha = new Map();
  const resumenFichas = new Map();
  {
    const { autentica, sin_prompt: sinPrompt } = TEXTOS?.fichas ?? {};
    const bytes = (t) => new TextEncoder().encode(t).length;
    const textoOk = (t) => typeof t === 'string' && t.trim() !== '' && bytes(t) <= FICHA_MAX_BYTES;
    if (!textoOk(autentica) || !textoOk(sinPrompt) || autentica === sinPrompt) {
      errores.push('TEXTOS.fichas (js/textos.js) no es válido: autentica y sin_prompt deben existir, no estar vacías, ser distintas y caber en 510 bytes.');
    } else {
      const decodificador = new TextDecoder('utf-8', { fatal: true });
      for (const dia of plan.nuevos) {
        const r = { con: 0, sin: 0, recortadas: 0, sinIngles: 0 };
        for (const img of dia.imagenes) {
          if (img.tipo === 'autentica') {
            textosFicha.set(img.ruta, autentica);
            continue;
          }
          if (!img.ficha) {
            textosFicha.set(img.ruta, sinPrompt);
            r.sin++;
            continue;
          }
          let texto;
          try {
            texto = decodificador.decode(readFileSync(join(RUTA_TEMAS, img.ficha)));
          } catch {
            errores.push(`${img.ficha} no es UTF-8 válido; guárdalo como UTF-8.`);
            continue;
          }
          const n = normalizarFicha(texto, FICHA_MAX_BYTES);
          if (n.vacia) {
            avisos.push(`${img.ficha} está vacío; se usará la ficha «sin confesión».`);
            textosFicha.set(img.ruta, sinPrompt);
            r.sin++;
            continue;
          }
          if (n.truncada) {
            avisos.push(`${img.ficha} ocupa ${n.bytesOriginales} bytes; se recorta a ${FICHA_MAX_BYTES} (máximo de una ficha).`);
            r.recortadas++;
          }
          if (n.texto === autentica || n.texto === sinPrompt) {
            errores.push(`${img.ficha} coincide exactamente con un texto reservado de las fichas; cámbialo.`);
            continue;
          }
          textosFicha.set(img.ruta, n.texto);
          r.con++;
          if (img.sinIngles) r.sinIngles++; // [D-93] se usó el .txt en español
        }
        resumenFichas.set(dia.n, r);
      }
    }
  }
  const sumaFichas = (campo) => [...resumenFichas.values()].reduce((s, r) => s + r[campo], 0);
  const frase = (r) =>
    `${r.con} con prompt, ${r.sin} sin prompt, ${r.sinIngles} sin versión en inglés, ${r.recortadas} recortada${r.recortadas === 1 ? '' : 's'}`;

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
      console.log(`  ${dos(d.n)} · ${textoFecha(d.fecha)} · ${d.tema} · ia: ${g}, real: ${5 - g} · ${fuentes} · fichas: ${frase(resumenFichas.get(d.n))}`);
    }
    if (manuales.length > 0) {
      console.log('  Recortes manuales (lote.json):');
      for (const r of manuales) console.log(`    ${r}: ${recortes[r]}`);
    } else {
      console.log('  Todas las imágenes usan el recorte por atención.');
    }
    for (const a of avisos) console.log(`  AVISO: ${a}`);
    console.log('  Antes de importar, revisa a mano que ninguna imagen generada conserve la marca o el logo de Gemini.');
    if (reimportar) console.log(mensajeReimportacion({ dias: calendario.dias.map((d) => ({ ...d, fecha: fechaDe(d.n) })), borradas: antiguas.size }));
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
    const clave = ofuscar(verdades, d.n);
    const fichas = orden.map((img, i) => ofuscarFicha(textosFicha.get(img.ruta), clave, d.n, i, aleatorio));
    diasNuevos.push({ n: d.n, tema: d.tema, pruebas: ids, clave, fichas });
    orden.forEach((img, i) => {
      const recorte = recortes[img.ruta] ?? 'atencion';
      trabajos.push({ id: ids[i], origen: join(RUTA_TEMAS, img.ruta), ruta: img.ruta, recorte });
      entradasBanco.push({
        id: ids[i],
        tipo: img.tipo,
        dia: d.n,
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
  // Calidad WebP variable (D-149): el recorte se calcula una sola vez y se busca la calidad que deja el peso en la franja común.
  const avisosPeso = [];
  const calidades = [];
  for (const t of barajar(trabajos, aleatorio)) {
    const destino = join(RUTA_CASOS, `${t.id}.webp`);
    const position = t.recorte === 'atencion' ? sharp.strategy.attention : POSICIONES_RECORTE[t.recorte];
    const { data, info } = await sharp(t.origen)
      .rotate()
      .resize(1080, 1350, { fit: 'cover', position })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const codificar = (quality) =>
      sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
        .webp({ quality, effort: 6 })
        .toBuffer();
    const r = await buscarCalidad(codificar);
    writeFileSync(destino, r.buffer);
    calidades.push(r.calidad);
    if (r.fuera) {
      avisosPeso.push(
        `${t.ruta} pesa ${(r.buffer.length / 1024).toFixed(0)} KB con calidad ${r.calidad}, ${r.fuera === 'alto' ? 'por encima' : 'por debajo'} de la franja de ${PESO_MIN_KB}-${PESO_MAX_KB} KB (calidad permitida ${CALIDAD_MIN}-${CALIDAD_MAX}); se usa el límite más cercano.`
      );
    }
    await comprobarArchivo(destino);
  }

  const nuevoBanco = { version: 3, imagenes: [...banco.imagenes, ...entradasBanco] };
  const nuevoCalendario = { version: 4, lanzamiento: calendario.lanzamiento, dias: reimportar ? diasNuevos : [...calendario.dias, ...diasNuevos] };
  if (!validarCalendario(nuevoCalendario)) salir('El calendario resultante no es válido; no se escribe.');
  writeFileSync(RUTA_BANCO, json(nuevoBanco), 'utf8');
  writeFileSync(RUTA_CALENDARIO, json(nuevoCalendario), 'utf8');
  escribirCreditos({ banco: nuevoBanco });

  let borradas = 0;
  let fallidas = [];
  if (reimportar) {
    const nuevosIds = new Set(diasNuevos.flatMap((d) => d.pruebas));
    const r = borrarAntiguas({
      antiguas,
      nuevosIds,
      borrar: (f) => unlinkSync(join(RUTA_CASOS, f)),
      existe: (f) => existsSync(join(RUTA_CASOS, f))
    });
    borradas = r.borradas;
    fallidas = r.fallidas;
  }

  // Informe
  console.log(reimportar ? 'Días reimportados:' : 'Días añadidos:');
  for (const d of diasNuevos) console.log(`  ${dos(d.n)} · ${textoFecha(fechaDe(d.n))} · ${d.tema}`);
  console.log(`Recortes manuales (lote.json): ${manuales.length}. El resto usa el recorte por atención.`);
  if (calidades.length > 0) console.log(`Calidad WebP usada: de ${Math.min(...calidades)} a ${Math.max(...calidades)} (franja ${PESO_MIN_KB}-${PESO_MAX_KB} KB).`);
  console.log(`Fichas: ${frase({ con: sumaFichas('con'), sin: sumaFichas('sin'), recortadas: sumaFichas('recortadas'), sinIngles: sumaFichas('sinIngles') })}.`);
  for (const a of [...avisos, ...avisosPeso]) console.log(`AVISO: ${a}`);
  const gen = nuevoCalendario.dias.map((d) => d.pruebas.reduce((s, _, i) => s + desofuscar(d.clave, d.n, i), 0));
  for (const a of avisosMezcla(gen)) console.log(a);
  const tamanos = new Map();
  for (const d of nuevoCalendario.dias) for (const id of d.pruebas) tamanos.set(id, statSync(join(RUTA_CASOS, `${id}.webp`)).size);
  const peso = mensajePeso(analizarPesos({ dias: nuevoCalendario.dias, tamanos, desofuscar }));
  if (peso) console.log(peso);
  console.log('Los originales y los .txt (y .en.txt) siguen en entrada/temas/; el importador no los mueve ni los borra. Puedes archivarlos a mano.');
  if (reimportar) {
    console.log(
      `Reimportados ${diasNuevos.length} días; borradas ${borradas} de ${antiguas.size} imágenes antiguas de casos/. Copia del banco anterior en herramientas/banco.anterior.json.`
    );
    for (const f of fallidas) console.log(`AVISO: no se pudo borrar ${f}`);
  }
  console.log('Guarda una copia privada de herramientas/banco.json fuera del repositorio.');
}

main().catch((e) => {
  console.error(e.stack ?? e.message);
  process.exit(1);
});
