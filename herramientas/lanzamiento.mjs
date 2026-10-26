// npm run lanzamiento [-- AAAA-MM-DD | -- --sin-fecha]
// Muestra o cambia la fecha de lanzamiento (spec 4.2.1) [D-95, D-96, D-116].
// Migra una sola vez el calendario 3 -> 4 y el banco 2 -> 3, y reparte data/titulares/ por mes.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fechaLocal, fechaDelDia, validarCalendario } from '../js/diario.js';
import {
  analizarArgumentosLanzamiento,
  comprobarCambioLanzamiento,
  migrarCalendario,
  migrarBanco
} from './temas.mjs';
import { unirMeses, repartirPorMes, leerTitularesMensuales, escribirTitularesMensuales } from './titulares.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (obj) => JSON.stringify(obj, null, 2) + '\n';
const leerJson = (ruta) => JSON.parse(fs.readFileSync(ruta, 'utf8'));

// Ejecuta la herramienta sobre una raíz de proyecto. Devuelve {codigo, mensajes}; no llama a process.exit.
export function lanzar({ raiz = RAIZ, argv = [], hoyISO = fechaLocal(new Date()) } = {}) {
  const mensajes = [];
  const decir = (t) => mensajes.push(t);
  const fallo = (errores) => {
    for (const e of [].concat(errores)) decir(`ERROR: ${e}`);
    return { codigo: 1, mensajes };
  };

  const rutaCalendario = path.join(raiz, 'data', 'calendario.json');
  const rutaBanco = path.join(raiz, 'herramientas', 'banco.json');
  const dirTitulares = path.join(raiz, 'data', 'titulares');

  const args = analizarArgumentosLanzamiento(argv);
  if (args.errores.length > 0) {
    return fallo([...args.errores, 'Uso: npm run lanzamiento [-- AAAA-MM-DD | -- --sin-fecha]']);
  }

  // Calendario
  if (!fs.existsSync(rutaCalendario)) return fallo('No existe data/calendario.json.');
  let bruto;
  try {
    bruto = leerJson(rutaCalendario);
  } catch (e) {
    return fallo(`data/calendario.json no es JSON válido (${e.message}).`);
  }

  // Titulares (todos los meses), sin comprobar el mes: el reparto actual puede ser el antiguo [D-116].
  const archivos = leerTitularesMensuales(dirTitulares);
  const unidos = unirMeses(archivos, { comprobarMes: false });
  if (unidos.errores.length > 0) return fallo([...unidos.errores, 'No se ha escrito nada. Revisa data/titulares/ con npm run validar.']);
  const diasTitulares = unidos.dias;

  if (args.accion === 'mostrar') {
    const lanz = bruto?.lanzamiento ?? null;
    const nImg = Array.isArray(bruto?.dias) ? bruto.dias.length : 0;
    decir(`Lanzamiento: ${lanz ?? 'sin fecha'}${bruto?.version === 4 ? '' : ` (calendario de la versión ${bruto?.version}: conviértelo con npm run lanzamiento -- ${lanz ?? '--sin-fecha'})`}`);
    const ultimo = (n) => (lanz && n > 0 ? ` (último día: ${fechaDelDia(lanz, n)})` : '');
    decir(`Images: ${nImg} días${ultimo(nImg)}`);
    decir(`Headlines: ${diasTitulares.length} días en ${archivos.length} archivos mensuales${ultimo(diasTitulares.length)}`);
    return { codigo: 0, mensajes };
  }

  // Migración 3 -> 4 y comprobación del calendario resultante.
  const migrado = migrarCalendario(bruto);
  if (migrado.errores.length > 0) return fallo(migrado.errores);
  const calendarioActual = migrado.calendario;
  if (!validarCalendario(calendarioActual)) {
    return fallo('data/calendario.json no cumple la estructura de la versión 4 (ejecuta npm run validar).');
  }

  const nuevo = args.accion === 'quitar' ? null : args.fecha;
  const errores = comprobarCambioLanzamiento({ actual: calendarioActual.lanzamiento, nuevo, hoyISO });
  if (errores.length > 0) return fallo(errores);

  // Banco, si existe.
  let bancoNuevo = null;
  let bancoTexto = null;
  if (fs.existsSync(rutaBanco)) {
    let banco;
    try {
      banco = leerJson(rutaBanco);
    } catch (e) {
      return fallo(`herramientas/banco.json no es JSON válido (${e.message}).`);
    }
    const mb = migrarBanco(banco);
    if (mb.errores.length > 0) return fallo(mb.errores);
    bancoNuevo = mb.banco;
    bancoTexto = json(bancoNuevo);
  } else {
    decir('AVISO: no hay herramientas/banco.json; solo se migra el calendario.');
  }

  // Reparto de titulares por mes (puede lanzar si algún mes no se calcula: antes de escribir).
  let reparto;
  try {
    reparto = repartirPorMes(diasTitulares, nuevo);
  } catch (e) {
    return fallo(`No se pudo repartir Headlines por meses (${e.message}).`);
  }

  // Escritura, en orden: titulares (nuevos y borrado de sobrantes), calendario, banco.
  const r = escribirTitularesMensuales(dirTitulares, reparto, { borrarSobrantes: true });
  const calendario = { ...calendarioActual, lanzamiento: nuevo };
  const textoCalendario = json(calendario);
  const calendarioCambia = !fs.existsSync(rutaCalendario) || fs.readFileSync(rutaCalendario, 'utf8') !== textoCalendario;
  if (calendarioCambia) fs.writeFileSync(rutaCalendario, textoCalendario, 'utf8');
  let bancoCambia = false;
  if (bancoTexto !== null) {
    bancoCambia = fs.readFileSync(rutaBanco, 'utf8') !== bancoTexto;
    if (bancoCambia) fs.writeFileSync(rutaBanco, bancoTexto, 'utf8');
  }

  decir(`Lanzamiento: ${nuevo ?? 'sin fecha'}${calendarioCambia ? '' : ' (sin cambios)'}`);
  if (migrado.calendario !== bruto) decir('Calendario migrado de la versión 3 a la 4 (sin fecha en los días).');
  if (bancoCambia) decir('Banco migrado a la versión 3 (sin fecha en las imágenes).');
  if (r.escritos.length) decir(`data/titulares/: escritos ${r.escritos.join(', ')}.`);
  if (r.borrados.length) decir(`data/titulares/: borrados ${r.borrados.join(', ')}.`);
  if (!r.escritos.length && !r.borrados.length && diasTitulares.length > 0) decir('data/titulares/: sin cambios.');
  if (nuevo !== null) decir(`Antes del ${nuevo}: PRUEBAS_ABIERTAS = false en js/main.js (tarea 44), npm run validar -- --estricto y publicar.`);
  if (r.escritos.length || r.borrados.length) decir('Incluye data/titulares/ en el commit (archivos añadidos y borrados).');
  return { codigo: 0, mensajes };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { codigo, mensajes } = lanzar({ argv: process.argv.slice(2) });
  for (const m of mensajes) (m.startsWith('ERROR') ? console.error : console.log)(m);
  process.exit(codigo);
}
