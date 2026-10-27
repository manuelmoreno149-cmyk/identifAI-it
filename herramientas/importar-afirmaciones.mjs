// Importador de Fact or Fake (spec 4.10) [D-123, D-127, D-131, D-139, D-140]. Node 20+, sin dependencias.
// npm run afirmaciones [-- --simular] [-- --revisado] [-- --reimportar [--confirmar]]
// No tiene banco: no lee ni escribe nada de herramientas/. Nunca abre datos.txt ni datos.original.txt,
// nunca modifica entrada/ y nunca muestra ni escribe afirmaciones, aclaraciones ni detalles en claro.

import fs from 'node:fs';
import path from 'node:path';
import { randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  fechaLocal, fechaDelDia, diasEntre, validarCalendario, validarAfirmaciones,
  ofuscar, desofuscar, ofuscarAfirmacion, ofuscarAclaracion, desofuscarAfirmacion
} from '../js/diario.js';
import { analizarCarpeta, barajar, avisosMezcla } from './temas.mjs';
import {
  LISTA_REVISION, analizarAfirmaciones, planificarAfirmaciones, avisosLongitud, normalizarParaDuplicados,
  analizarArgumentosAfirmaciones, unirMeses, repartirPorMes, leerAfirmacionesMensuales, escribirAfirmacionesMensuales
} from './afirmaciones.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dos = (n) => String(n).padStart(2, '0');
const aleatorioCripto = () => randomInt(2 ** 32) / 2 ** 32;
const IGNORADOS = new Set(['thumbs.db', 'desktop.ini']);
const ignorable = (nombre) => nombre.startsWith('.') || IGNORADOS.has(nombre.toLowerCase());

// Solo nombres de archivo de la raíz de cada carpeta; no se abre ningún archivo aquí [D-139].
function leerCarpetas(dirTemas) {
  if (!fs.existsSync(dirTemas)) return [];
  const carpetas = [];
  for (const e of fs.readdirSync(dirTemas, { withFileTypes: true })) {
    if (!e.isDirectory() || ignorable(e.name)) continue;
    const archivos = fs
      .readdirSync(path.join(dirTemas, e.name), { withFileTypes: true })
      .filter((h) => h.isFile() && !ignorable(h.name))
      .map((h) => h.name);
    carpetas.push({ nombre: e.name, archivos });
  }
  return carpetas;
}

// Ejecuta el importador sobre una raíz de proyecto. Devuelve {codigo, mensajes}; no llama a process.exit.
export function importarAfirmaciones({ raiz = RAIZ, argv = [], hoyISO = fechaLocal(new Date()), aleatorio = aleatorioCripto } = {}) {
  const mensajes = [];
  const decir = (t) => mensajes.push(t);
  const fallo = (errores, pie) => {
    decir('No se importa nada. Corrige lo siguiente y vuelve a ejecutar:');
    for (const e of errores) decir(`  ERROR: ${e}`);
    if (pie) decir(pie);
    return { codigo: 1, mensajes };
  };

  const args = analizarArgumentosAfirmaciones(argv);
  if (args.confirmar && !args.reimportar) args.errores.push('--confirmar solo se usa junto con --reimportar.');
  if (args.errores.length > 0) {
    return fallo(args.errores, 'Uso: npm run afirmaciones [-- --simular] [-- --revisado] [-- --reimportar [--confirmar]]');
  }
  const { simular, reimportar, confirmar, revisado } = args;

  const dirFacts = path.join(raiz, 'data', 'facts');
  const dirTemas = path.join(raiz, 'entrada', 'temas');
  const rutaCalendario = path.join(raiz, 'data', 'calendario.json');
  const errores = [];
  const avisos = [];

  // 1. Calendario de Images: lanzamiento y temas
  let lanzamiento = null;
  const temasImagenes = new Map();
  let calendarioOk = false;
  if (fs.existsSync(rutaCalendario)) {
    try {
      const c = JSON.parse(fs.readFileSync(rutaCalendario, 'utf8'));
      if (validarCalendario(c)) {
        lanzamiento = c.lanzamiento;
        for (const d of c.dias) temasImagenes.set(d.n, d.tema);
        calendarioOk = true;
      }
    } catch {
      /* se avisa abajo */
    }
  }
  if (!calendarioOk) {
    avisos.push('AVISO: data/calendario.json no existe o no es válido: se usa lanzamiento null y no se comprueban los temas de Images.');
  }

  // 2. Archivos mensuales existentes
  const archivos = leerAfirmacionesMensuales(dirFacts);
  const unidos = unirMeses(archivos, { lanzamiento, comprobarMes: true });
  if (unidos.errores.length > 0) {
    return fallo(unidos.errores, 'Revisa data/facts/ con npm run validar (o reparte los meses con npm run lanzamiento si cambiaste la fecha a mano).');
  }
  const existentes = unidos.dias;

  // 3. Carpetas
  const carpetas = leerCarpetas(dirTemas);
  if (carpetas.length === 0) {
    decir('No hay carpetas en entrada/temas.');
    return { codigo: 0, mensajes };
  }

  // 4. Plan
  const plan = planificarAfirmaciones({
    carpetas,
    ultimoDia: existentes.length,
    hoyISO,
    lanzamiento,
    reimportar,
    temasImagenes
  });
  errores.push(...plan.errores);
  avisos.push(...plan.avisos);

  // Regla de seguridad de --reimportar: solo antes del lanzamiento y con todas las carpetas.
  if (reimportar) {
    if (existentes.length === 0) {
      errores.push('No hay nada que reimportar; usa npm run afirmaciones.');
    }
    const nuevosN = new Set(plan.nuevos.map((d) => d.n));
    for (const d of existentes) {
      if (!nuevosN.has(d.n)) {
        errores.push(`Para reimportar falta la carpeta del día ${dos(d.n)} en entrada/temas/ con su archivo de afirmaciones.`);
      }
    }
    if (lanzamiento !== null) {
      for (const d of existentes) {
        const f = fechaDelDia(lanzamiento, d.n);
        if (f !== null && diasEntre(hoyISO, f) < 1) {
          errores.push(`El día ${dos(d.n)} (${f}) ya ha llegado o ha pasado: después del lanzamiento no se reimporta ningún día.`);
          break;
        }
      }
    }
  }

  if (errores.length > 0) return fallo(errores);

  if (plan.nuevos.length === 0) {
    for (const a of avisos) decir(a);
    decir('No hay afirmaciones nuevas por importar.');
    return { codigo: 0, mensajes };
  }

  // 5. Lectura y análisis (solo el archivo elegido de cada día)
  const decodificador = new TextDecoder('utf-8', { fatal: true });
  const analizados = new Map();
  for (const d of plan.nuevos) {
    const ruta = `${d.carpeta}/${d.archivo}`;
    let texto;
    try {
      texto = decodificador.decode(fs.readFileSync(path.join(dirTemas, d.carpeta, d.archivo)));
    } catch {
      errores.push(`${ruta} no es UTF-8 válido; guárdalo como UTF-8.`);
      continue;
    }
    const r = analizarAfirmaciones(texto, ruta);
    errores.push(...r.errores);
    avisos.push(...r.avisos);
    if (r.errores.length === 0) analizados.set(d.n, r.afirmaciones);
  }

  // 6. Duplicados (el mensaje nombra carpeta y bloque, nunca el texto)
  const vistos = new Map();
  if (!reimportar) {
    for (const d of existentes) {
      for (let i = 0; i < 5; i++) {
        const t = desofuscarAfirmacion(d.textos[i], d.clave, d.n, i);
        if (t !== null) vistos.set(normalizarParaDuplicados(t), `el día ${d.n} ya publicado`);
      }
    }
  }
  for (const d of plan.nuevos) {
    const afs = analizados.get(d.n);
    if (!afs) continue;
    afs.forEach((a, i) => {
      const clave = normalizarParaDuplicados(a.afirmacion);
      const donde = `${d.carpeta}, bloque ${i + 1}`;
      if (vistos.has(clave)) errores.push(`${donde}: la afirmación está repetida (ya aparece en ${vistos.get(clave)}).`);
      else vistos.set(clave, `${donde}`);
    });
  }
  if (errores.length > 0) return fallo(errores);

  // 7. Avisos de longitud y de mezcla (solo avisos [D-140])
  const diasLongitud = [];
  const generadasPorDia = [];
  if (!reimportar) {
    for (const d of existentes) {
      const afs = [0, 1, 2, 3, 4].map((i) => ({
        tipo: desofuscar(d.clave, d.n, i) === 1 ? 'generada' : 'autentica',
        afirmacion: desofuscarAfirmacion(d.textos[i], d.clave, d.n, i) ?? ''
      }));
      diasLongitud.push({ n: d.n, afirmaciones: afs });
      generadasPorDia.push(afs.filter((a) => a.tipo === 'generada').length);
    }
  }
  for (const d of plan.nuevos) {
    const afs = analizados.get(d.n);
    diasLongitud.push({ n: d.n, afirmaciones: afs });
    generadasPorDia.push(afs.filter((a) => a.tipo === 'generada').length);
  }
  avisos.push(...avisosLongitud(diasLongitud), ...avisosMezcla(generadasPorDia));

  // Archivos mensuales afectados
  const mesesAfectados = new Set(plan.nuevos.map((d) => d.mes));
  const nombresDestino = [...mesesAfectados].sort().map((m) => `${m}.json`);

  const mostrarPlan = (titulo) => {
    decir(titulo);
    for (const n of plan.omitidos) {
      const c = carpetas.find((x) => {
        try {
          return analizarCarpeta(x.nombre).n === n;
        } catch {
          return false;
        }
      });
      decir(`  ${c?.nombre ?? dos(n)}: ya importado, se omite`);
    }
    for (const d of plan.nuevos) {
      const falsas = analizados.get(d.n).filter((a) => a.tipo === 'generada').length;
      decir(
        `  ${dos(d.n)} · ${d.fecha ?? 'sin fecha de lanzamiento'} · ${d.mes} · ${d.tema} · ${d.archivo} · 5 afirmaciones: ${falsas} fake, ${5 - falsas} fact`
      );
    }
    for (const n of plan.pendientes) decir(`  ${dos(n)}: pendiente (sin archivo de afirmaciones)`);
    decir(`  Archivos que se escribirían en data/facts/: ${nombresDestino.join(', ')}${reimportar ? ' (y se borrarían los de meses sin días)' : ''}`);
    for (const a of avisos) decir(`  ${a}`);
    decir('Lista de revisión (norma de contenido de Fact or Fake):');
    LISTA_REVISION.forEach((p, i) => decir(`  ${i + 1}. ${p}`));
  };

  // 8. Simulación y reimportación sin confirmar
  if (simular || (reimportar && !confirmar)) {
    mostrarPlan(simular ? 'Plan (simulación, no se escribe nada):' : 'Plan de reimportación (no se escribe nada):');
    if (reimportar) {
      decir(
        `Se regenerarían ${plan.nuevos.length} días desde cero (ids, orden y claves). Para hacerlo: npm run afirmaciones -- --reimportar --confirmar --revisado`
      );
    }
    return { codigo: 0, mensajes };
  }

  // 9. Sin certificación humana no se escribe
  if (!revisado) {
    mostrarPlan('Plan (no se escribe nada):');
    decir('Revisa la lista de comprobación y vuelve a ejecutar con --revisado.');
    return { codigo: 1, mensajes };
  }

  // Fase B
  const diasNuevos = plan.nuevos.map((d) => {
    const orden = barajar(analizados.get(d.n), aleatorio);
    const clave = ofuscar(orden.map((a) => (a.tipo === 'generada' ? 1 : 0)), d.n, aleatorio);
    return {
      n: d.n,
      tema: d.tema,
      clave,
      textos: orden.map((a, i) => ofuscarAfirmacion(a.afirmacion, clave, d.n, i, aleatorio)),
      fichas: orden.map((a, i) => ofuscarAclaracion({ aclaracion: a.aclaracion, detalles: a.detalles }, clave, d.n, i, aleatorio))
    };
  });
  const todos = reimportar ? diasNuevos : [...existentes, ...diasNuevos];
  const reparto = repartirPorMes(todos, lanzamiento);
  const problemas = [];
  for (const a of reparto) {
    if (!validarAfirmaciones(a, a.mes)) problemas.push(`El archivo de ${a.mes} no es válido.`);
  }
  const comprobacion = unirMeses(
    reparto.map((a) => ({ nombre: `${a.mes}.json`, contenido: a })),
    { lanzamiento, comprobarMes: true }
  );
  problemas.push(...comprobacion.errores);
  if (problemas.length > 0) return fallo(problemas, 'No se ha escrito nada.');

  const aEscribir = reimportar ? reparto : reparto.filter((a) => mesesAfectados.has(a.mes));
  const r = escribirAfirmacionesMensuales(dirFacts, aEscribir, { borrarSobrantes: reimportar });

  // 12. Informe
  decir(reimportar ? 'Días reimportados:' : 'Días añadidos:');
  for (const d of plan.nuevos) decir(`  ${dos(d.n)} · ${d.fecha ?? 'sin fecha de lanzamiento'} · ${d.mes} · ${d.tema}`);
  if (plan.omitidos.length > 0) decir(`Omitidos (ya importados): ${plan.omitidos.map(dos).join(', ')}.`);
  if (plan.pendientes.length > 0) decir(`Pendientes (sin archivo de afirmaciones): ${plan.pendientes.map(dos).join(', ')}.`);
  decir(`Archivos escritos: ${r.escritos.join(', ') || 'ninguno'}. Sin cambios: ${r.sinCambios.join(', ') || 'ninguno'}.`);
  if (r.borrados.length > 0) decir(`Archivos borrados (meses sin días): ${r.borrados.join(', ')}.`);
  for (const a of avisos) decir(a);
  decir('Lista de revisión certificada con --revisado:');
  LISTA_REVISION.forEach((p, i) => decir(`  ${i + 1}. ${p}`));
  decir('Los textos originales siguen en entrada/temas/ (no se mueven ni se borran). No se ha tocado creditos.html.');
  return { codigo: 0, mensajes };
}

const esPrincipal = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (esPrincipal) {
  try {
    const { codigo, mensajes } = importarAfirmaciones({ argv: process.argv.slice(2) });
    for (const m of mensajes) (codigo === 0 ? console.log : console.error)(m);
    process.exit(codigo);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
