import { test } from 'node:test';
import assert from 'node:assert/strict';
import { casoPedido, listaDeCasos, urlConCaso } from '../js/diario.js';
import { estadoInicial, transicion, estadoEnLista } from '../js/juego.js';
import {
  archivoInicial,
  leerArchivo,
  leerArchivoConRespaldo,
  actualizarArchivo,
  registrarInicio,
  registrarPrueba,
  terminarSinRacha,
  cerrarAbandonadaArchivo,
  partidaDeCaso,
  CLAVE_ARCHIVO,
  VERSION_ARCHIVO,
  CLAVE,
  crearAlmacenMemoria,
  datosIniciales,
  calcularRacha,
  registrarFin,
  guardar
} from '../js/almacen.js';
import { urlDeCaso, textoCompartir } from '../js/compartir.js';
import { TEXTOS } from '../js/textos.js';

// ---- 358. casoPedido ----
test('358. casoPedido: válidos, hoy, futuro y basura', () => {
  assert.equal(casoPedido('?caso=3', 5), 3);
  assert.equal(casoPedido('?caso=1', 2), 1);
  assert.equal(casoPedido('?caso=5', 5), null);
  assert.equal(casoPedido('?caso=6', 5), null);
  assert.equal(casoPedido('?caso=999999', 5), null);
  for (const q of ['?caso=0', '?caso=-1', '?caso=03', '?caso=3.0', '?caso=1e2', '?caso=abc', '?caso=', '?CASO=3', '', '?caso=1234567']) {
    assert.equal(casoPedido(q, 5), null, q);
  }
  assert.equal(casoPedido('?caso=3&caso=4', 5), 3);
  assert.equal(casoPedido('?lang=es&caso=2', 5), 2);
  for (const nHoy of [null, 1, NaN, undefined]) assert.equal(casoPedido('?caso=1', nHoy), null);
});

// ---- 359. listaDeCasos ----
function calendarioDePrueba(dias = 14) {
  return {
    version: 5,
    lanzamiento: '2026-11-01',
    dias: Array.from({ length: dias }, (_, i) => ({
      n: i + 1,
      tema: { en: `Theme${i + 1}`, es: `Tema${i + 1}` },
      pruebas: ['a', 'b', 'c', 'd', 'e'],
      clave: 'CLAVESECRETA',
      fichas: { en: ['ficha-secreta'], es: ['ficha-secreta'] }
    }))
  };
}
const mesDePrueba = (dias = 14, mes = '2026-11') => ({
  version: 2,
  mes,
  dias: Array.from({ length: dias }, (_, i) => ({
    n: i + 1,
    tema: { en: `Theme${i + 1}`, es: `Tema${i + 1}` },
    clave: 'CLAVEMES',
    textos: { en: ['texto-secreto'], es: ['texto-secreto'] },
    fichas: { en: ['aclaracion-secreta'], es: ['aclaracion-secreta'] }
  }))
});

test('359. listaDeCasos: de hoy a 1, sin nada de días posteriores', () => {
  const lista = listaDeCasos({ calendario: calendarioDePrueba(), afirmaciones: mesDePrueba(), nHoy: 5 });
  assert.deepEqual(lista.map((f) => f.n), [5, 4, 3, 2, 1]);
  assert.equal(lista[0].hoy, true);
  assert.ok(lista.slice(1).every((f) => f.hoy === false));
  assert.deepEqual(lista.map((f) => f.fecha), ['2026-11-05', '2026-11-04', '2026-11-03', '2026-11-02', '2026-11-01']);
  assert.deepEqual(lista[2].tema, { en: 'Theme3', es: 'Tema3' });
  assert.ok(lista.every((f) => f.imagenes === true && f.afirmaciones === true));
  const texto = JSON.stringify(lista);
  for (let n = 6; n <= 14; n++) {
    assert.equal(texto.includes(`Theme${n}"`), false);
    assert.equal(texto.includes(`Tema${n}"`), false);
  }
  for (const secreto of ['CLAVESECRETA', 'CLAVEMES', 'ficha-secreta', 'texto-secreto', 'aclaracion-secreta']) {
    assert.equal(texto.includes(secreto), false, secreto);
  }
});

test('359. listaDeCasos: más allá del calendario, huecos y otro mes', () => {
  const cal = calendarioDePrueba();
  const veinte = listaDeCasos({ calendario: cal, afirmaciones: mesDePrueba(), nHoy: 20 });
  assert.equal(veinte.length, 20);
  for (const f of veinte.filter((x) => x.n >= 15)) {
    assert.equal(f.tema, null);
    assert.equal(f.imagenes, false);
  }
  const mes = mesDePrueba();
  mes.dias = mes.dias.filter((d) => d.n !== 7);
  const hueco = listaDeCasos({ calendario: cal, afirmaciones: mes, nHoy: 10 });
  assert.equal(hueco.find((f) => f.n === 7).afirmaciones, false);
  assert.equal(hueco.find((f) => f.n === 6).afirmaciones, true);
  const otroMes = listaDeCasos({ calendario: cal, afirmaciones: mesDePrueba(14, '2026-12'), nHoy: 5 });
  assert.ok(otroMes.every((f) => f.afirmaciones === null));
  for (const nHoy of [0, -3, null]) assert.deepEqual(listaDeCasos({ calendario: cal, afirmaciones: mes, nHoy }), []);
  assert.deepEqual(listaDeCasos({ calendario: { ...cal, lanzamiento: null }, afirmaciones: mes, nHoy: 3 }), []);
});

test('359. listaDeCasos: el tema sale del mes si el calendario no tiene el día', () => {
  const lista = listaDeCasos({ calendario: calendarioDePrueba(2), afirmaciones: mesDePrueba(4), nHoy: 4 });
  assert.deepEqual(lista[0].tema, { en: 'Theme4', es: 'Tema4' });
  assert.equal(lista[0].imagenes, false);
  assert.equal(lista[0].afirmaciones, true);
});

// ---- 360. urlConCaso ----
test('360. urlConCaso', () => {
  assert.equal(urlConCaso('https://identifaiit.com/es/?lang=es#x', 3), 'https://identifaiit.com/es/?lang=es&caso=3#x');
  assert.equal(urlConCaso('https://identifaiit.com/en/?caso=2&fecha=2026-11-04', 5), 'https://identifaiit.com/en/?caso=5&fecha=2026-11-04');
  assert.equal(urlConCaso('https://identifaiit.com/en/?caso=2', null), 'https://identifaiit.com/en/');
  assert.equal(urlConCaso('no es url', 3), null);
});

// ---- 361. juego.js ----
test('361. archivo y ELEGIR_CASO', () => {
  assert.equal(estadoInicial().archivo, false);
  const retos = { imagenes: { caso: { n: 3, tema: { en: 'x', es: 'y' }, pruebas: [], clave: 'k', fichas: null }, jugado: false } };
  const base = { ...estadoInicial({ modo: 'perro', idioma: 'es' }) };
  assert.equal(transicion(base, { tipo: 'CARGADO', retos, reto: 'imagenes', archivo: true }).archivo, true);
  const sin = transicion(base, { tipo: 'CARGADO', retos, reto: 'imagenes' });
  assert.equal(sin.archivo, false);
  const conArchivo = transicion(base, { tipo: 'CARGADO', retos, reto: 'imagenes', archivo: true });
  const siguiente = transicion(conArchivo, { tipo: 'ELEGIR_CASO', n: 3 });
  assert.equal(siguiente.pantalla, 'iniciando');
  assert.equal(siguiente.idioma, 'es');
  assert.equal(siguiente.modo, 'perro');
  assert.equal(transicion(conArchivo, { tipo: 'ELEGIR_CASO', n: null }).pantalla, 'iniciando');
  assert.equal(transicion(conArchivo, { tipo: 'ELEGIR_CASO', n: 0 }), conArchivo);
  assert.equal(transicion(conArchivo, { tipo: 'ELEGIR_CASO', n: 'x' }), conArchivo);
  for (const pantalla of ['instrucciones', 'caso', 'resultado', 'ya-jugado']) {
    const e = { ...conArchivo, pantalla };
    assert.equal(transicion(e, { tipo: 'ELEGIR_CASO', n: 2 }), e, pantalla);
  }
  const idioma = transicion(conArchivo, { tipo: 'CAMBIAR_IDIOMA', idioma: 'en' });
  assert.equal(idioma.archivo, true);
  assert.equal(idioma.n, 3);
  assert.deepEqual(idioma.tema, { en: 'x', es: 'y' });
});

// ---- 362. estadoEnLista ----
test('362. estadoEnLista', () => {
  const p = (estado, resultados) => ({ n: 1, modo: null, estado, resultados, aciertos: 0, sesion: 's' });
  assert.deepEqual(estadoEnLista(p('terminada', 'AAFAA'), null), { situacion: 'jugado', aciertos: 4 });
  assert.deepEqual(estadoEnLista(null, p('terminada', 'FFFFF')), { situacion: 'jugado', aciertos: 0 });
  assert.deepEqual(estadoEnLista(p('en_curso', 'AF---'), null), { situacion: 'jugado', aciertos: 1 });
  assert.equal(estadoEnLista(null, p('en_curso', 'AF---')).situacion, 'curso');
  assert.deepEqual(estadoEnLista(null, null), { situacion: 'pendiente', aciertos: null });
  assert.deepEqual(estadoEnLista(undefined, 'basura'), { situacion: 'pendiente', aciertos: null });
  assert.deepEqual(estadoEnLista(p('terminada', 'AAAAA'), p('terminada', 'FFFFF')), { situacion: 'jugado', aciertos: 5 });
});

// ---- 363. almacén del archivo ----
test('363. almacén del archivo: forma inicial, basura y ciclo completo sin racha', () => {
  assert.deepEqual(archivoInicial(), {
    version: 1,
    retos: { imagenes: { partidas: {} }, afirmaciones: { partidas: {} } }
  });
  assert.equal(CLAVE_ARCHIVO, 'identifaiit.archivo.v1');
  assert.equal(VERSION_ARCHIVO, 1);
  for (const crudo of ['basura{', '{"version":2,"retos":{}}', '[]', '"x"']) {
    const a = crearAlmacenMemoria();
    a.setItem(CLAVE_ARCHIVO, crudo);
    assert.deepEqual(leerArchivo(a).datos, archivoInicial(), crudo);
  }
  // Partidas mal formadas se descartan una a una.
  const a = crearAlmacenMemoria();
  a.setItem(
    CLAVE_ARCHIVO,
    JSON.stringify({
      version: 1,
      retos: {
        imagenes: {
          partidas: {
            '2026-11-02': { n: 2, modo: 'perro', estado: 'terminada', resultados: 'AAFAA', aciertos: 4, sesion: 's' },
            '2026-11-03': { n: 3, estado: 'rara' },
            malafecha: { n: 1, modo: null, estado: 'terminada', resultados: 'AAAAA', aciertos: 5, sesion: 's' }
          }
        }
      }
    })
  );
  const leido = leerArchivo(a).datos;
  assert.deepEqual(Object.keys(leido.retos.imagenes.partidas), ['2026-11-02']);

  let d = archivoInicial();
  d = registrarInicio(d, 'imagenes', { fecha: '2026-11-03', n: 3, modo: 'perro', sesion: 'q2w8e4r1' });
  'AAFAA'.split('').forEach((c, i) => {
    d = registrarPrueba(d, 'imagenes', '2026-11-03', i, c, 'q2w8e4r1');
  });
  d = terminarSinRacha(d, 'imagenes', '2026-11-03', 'q2w8e4r1');
  const partida = d.retos.imagenes.partidas['2026-11-03'];
  assert.deepEqual(partida, { n: 3, modo: 'perro', estado: 'terminada', resultados: 'AAFAA', aciertos: 4, sesion: 'q2w8e4r1' });
  assert.equal(JSON.stringify(d).includes('racha'), false);
  assert.equal(JSON.stringify(d).includes('mejorRacha'), false);
  // Otra sesión no puede tocar una partida en curso.
  let e = registrarInicio(archivoInicial(), 'afirmaciones', { fecha: '2026-11-02', n: 2, modo: null, sesion: 'a' });
  assert.equal(registrarPrueba(e, 'afirmaciones', '2026-11-02', 0, 'A', 'otra'), e);
  assert.equal(terminarSinRacha(e, 'afirmaciones', '2026-11-02', 'otra'), e);
});

test('363. cerrarAbandonadaArchivo y partidaDeCaso', () => {
  let d = registrarInicio(archivoInicial(), 'imagenes', { fecha: '2026-11-02', n: 2, modo: 'normal', sesion: 's' });
  d = registrarPrueba(d, 'imagenes', '2026-11-02', 0, 'A', 's');
  d = registrarPrueba(d, 'imagenes', '2026-11-02', 1, 'F', 's');
  const cerrada = cerrarAbandonadaArchivo(d, 'imagenes', '2026-11-02');
  const p = cerrada.retos.imagenes.partidas['2026-11-02'];
  assert.equal(p.resultados, 'AFFFF');
  assert.equal(p.estado, 'terminada');
  assert.equal(p.aciertos, 1);
  assert.equal(cerrarAbandonadaArchivo(cerrada, 'imagenes', '2026-11-02'), cerrada);

  const dia = registrarInicio(datosIniciales(), 'imagenes', { fecha: '2026-11-02', n: 2, modo: 'normal', sesion: 'x' });
  assert.equal(partidaDeCaso(dia, cerrada, 'imagenes', '2026-11-02').origen, 'dia');
  assert.equal(partidaDeCaso(datosIniciales(), cerrada, 'imagenes', '2026-11-02').origen, 'archivo');
  assert.equal(partidaDeCaso(datosIniciales(), archivoInicial(), 'imagenes', '2026-11-02'), null);
  assert.equal(partidaDeCaso(dia, cerrada, 'otro', '2026-11-02'), null);
});

// ---- 364. aislamiento ----
test('364. una partida del archivo no toca identifaiit.v3 ni la racha', () => {
  const local = crearAlmacenMemoria();
  const sesionAlm = crearAlmacenMemoria();
  let v3 = datosIniciales();
  for (const fecha of ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']) {
    v3 = registrarInicio(v3, 'imagenes', { fecha, n: 1, modo: 'normal', sesion: 's' });
    for (let i = 0; i < 5; i++) v3 = registrarPrueba(v3, 'imagenes', fecha, i, 'A', 's');
    v3 = registrarFin(v3, 'imagenes', fecha, fecha, 's');
  }
  assert.equal(v3.retos.imagenes.racha, 4);
  guardar(v3, local);
  const antes = local.getItem(CLAVE);

  let memoria = archivoInicial();
  const paso = (cambio) => {
    memoria = actualizarArchivo(cambio, memoria, local, sesionAlm).datos;
  };
  paso((d) => registrarInicio(d, 'afirmaciones', { fecha: '2026-11-02', n: 2, modo: null, sesion: 'z' }));
  for (let i = 0; i < 5; i++) paso((d) => registrarPrueba(d, 'afirmaciones', '2026-11-02', i, i % 2 ? 'F' : 'A', 'z'));
  paso((d) => terminarSinRacha(d, 'afirmaciones', '2026-11-02', 'z'));

  assert.equal(local.getItem(CLAVE), antes);
  assert.equal(calcularRacha(v3.retos.imagenes.partidas, '2026-11-04'), 4);
  assert.equal(calcularRacha(v3.retos.afirmaciones.partidas, '2026-11-04'), 0);
  assert.equal(leerArchivo(local).datos.retos.afirmaciones.partidas['2026-11-02'].estado, 'terminada');
});

test('364. con localStorage roto, el archivo va a sessionStorage', () => {
  const roto = {
    getItem() {
      throw new Error('no');
    },
    setItem() {
      throw new Error('no');
    },
    removeItem() {
      throw new Error('no');
    }
  };
  const sesion = crearAlmacenMemoria();
  const r = actualizarArchivo(
    (d) => registrarInicio(d, 'imagenes', { fecha: '2026-11-02', n: 2, modo: 'normal', sesion: 's' }),
    archivoInicial(),
    roto,
    sesion
  );
  assert.equal(r.guardado, false);
  assert.ok(sesion.getItem(CLAVE_ARCHIVO));
  const l = leerArchivoConRespaldo(roto, sesion);
  assert.equal(l.disponible, false);
  assert.equal(l.respaldo, true);
  assert.ok(l.datos.retos.imagenes.partidas['2026-11-02']);
});

// ---- 365. compartir ----
test('365. urlDeCaso y plantillas de archivo', () => {
  assert.equal(urlDeCaso('https://identifaiit.com/es/', 1), 'https://identifaiit.com/es/?caso=1');
  for (const n of [0, '1', null, 1.5, -2]) assert.equal(urlDeCaso('https://identifaiit.com/es/', n), 'https://identifaiit.com/es/');

  const imagenesEn = textoCompartir({
    plantilla: TEXTOS.en.compartir.plantilla_archivo,
    n: 1,
    nombreModo: 'Bloodhound',
    resultados: 'AAFAF',
    racha: 0,
    url: urlDeCaso('https://identifaiit.com/en/', 1)
  });
  assert.equal(imagenesEn, 'identifAI-it Images #1 (archive)\nMode: Bloodhound\n3/5 🟩🟩🟥🟩🟥\nhttps://identifaiit.com/en/?caso=1');
  const factEs = textoCompartir({
    plantilla: TEXTOS.es.compartir.plantilla_afirmaciones_archivo,
    n: 1,
    resultados: 'AAFAF',
    racha: 0,
    url: urlDeCaso('https://identifaiit.com/es/', 1)
  });
  assert.equal(factEs, 'identifAI-it ¿Dato o Bulo? #1 (archivo)\n3/5 🟩🟩🟥🟩🟥\nhttps://identifaiit.com/es/?caso=1');
  const imagenesEs = textoCompartir({
    plantilla: TEXTOS.es.compartir.plantilla_archivo,
    n: 1,
    nombreModo: 'Sabueso',
    resultados: 'AAFAF',
    racha: 0,
    url: urlDeCaso('https://identifaiit.com/es/', 1)
  });
  assert.equal(imagenesEs, 'identifAI-it Imágenes #1 (archivo)\nModo: Sabueso\n3/5 🟩🟩🟥🟩🟥\nhttps://identifaiit.com/es/?caso=1');
  const factEn = textoCompartir({
    plantilla: TEXTOS.en.compartir.plantilla_afirmaciones_archivo,
    n: 1,
    resultados: 'AAFAF',
    racha: 0,
    url: urlDeCaso('https://identifaiit.com/en/', 1)
  });
  assert.equal(factEn, 'identifAI-it Fact or Fake #1 (archive)\n3/5 🟩🟩🟥🟩🟥\nhttps://identifaiit.com/en/?caso=1');
  for (const texto of [imagenesEn, imagenesEs, factEn, factEs]) {
    assert.doesNotMatch(texto, /Streak|Racha|\{racha\}/);
    assert.equal(texto, texto.trimEnd());
  }
});
