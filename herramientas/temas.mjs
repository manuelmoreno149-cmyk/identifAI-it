// Funciones puras del importador por temas (spec 4.6). No importa nada.

export const PALABRAS_PROHIBIDAS = ['real', 'ia', 'ai', 'fake'];

export const UMBRAL_PESO = 0.25;

const RE_CARPETA = /^(\d{2,})-([\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*)$/u;
const EXT_IMAGEN = /\.(jpe?g|png|webp)$/i;

// ---------- Fechas (Date.UTC, sin importar nada) ----------

function aUTC(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}

function sumarDiasISO(iso, dias) {
  return new Date(aUTC(iso) + dias * 86400000).toISOString().slice(0, 10);
}

function diasEntreISO(desde, hasta) {
  return Math.round((aUTC(hasta) - aUTC(desde)) / 86400000);
}

// ---------- Palabras prohibidas ----------

export function contienePalabraProhibida(texto, excepciones = ['identifAI-it']) {
  let t = String(texto);
  for (const e of excepciones) t = t.split(e).join(' ');
  const trozos = [];
  for (const parte of t.split(/[^\p{L}\p{N}]+/u)) {
    if (!parte) continue;
    for (const sub of parte.split(/(?<=\p{Ll})(?=\p{Lu})/u)) trozos.push(sub);
  }
  for (const trozo of trozos) {
    const bajo = trozo.toLowerCase();
    if (PALABRAS_PROHIBIDAS.includes(bajo)) return bajo;
  }
  return null;
}

export function contieneSubcadenaProhibida(texto) {
  const bajo = String(texto).toLowerCase();
  return PALABRAS_PROHIBIDAS.find((p) => bajo.includes(p)) ?? null;
}

// ---------- Carpetas y temas ----------

export function analizarCarpeta(nombre) {
  const nfc = String(nombre).normalize('NFC');
  const m = RE_CARPETA.exec(nfc);
  if (!m) {
    throw new Error(`El nombre de carpeta "${nombre}" no cumple el patrón NN-nombre-del-tema (por ejemplo, 02-perros).`);
  }
  const n = parseInt(m[1], 10);
  if (n < 1) throw new Error(`El número de la carpeta "${nombre}" debe ser 01 o mayor.`);
  const texto = m[2].replace(/-/g, ' ');
  const tema = texto.charAt(0).toLocaleUpperCase('es') + texto.slice(1);
  return { n, tema };
}

export function temaDeCarpeta(nombre) {
  return analizarCarpeta(nombre).tema;
}

// ---------- Fuentes ----------

export const FUENTES = [
  { tipo: 'generada', patron: /^gemini[_ -]/i, fuente: 'Creación propia (Gemini)', licencia: 'Términos de uso de Gemini' },
  { tipo: 'generada', patron: /^chatgpt[_ -]/i, fuente: 'Creación propia (ChatGPT)', licencia: 'Términos de uso de OpenAI' },
  { tipo: 'autentica', patron: /-unsplash\.[a-z]+$/i, fuente: 'Unsplash', licencia: 'Licencia de Unsplash' },
  { tipo: 'autentica', patron: /^pexels-/i, fuente: 'Pexels', licencia: 'Licencia de Pexels' }
];

export function fuenteDeArchivo(nombre, tipo) {
  const base = String(nombre).split('/').pop();
  const f = FUENTES.find((x) => x.patron.test(base));
  if (!f) {
    throw new Error(
      `No sé de dónde viene ${nombre}: renómbrala para que empiece por gemini-, chatgpt- o pexels-, o termine en -unsplash.`
    );
  }
  if (f.tipo !== tipo) {
    throw new Error(`${nombre} parece de la fuente ${f.fuente}, que no corresponde a una imagen de tipo ${tipo}.`);
  }
  return { fuente: f.fuente, licencia: f.licencia };
}

// ---------- Planificación ----------

export function planificar({ carpetas, ultimoDia, hoyISO, lanzamiento, sumarDias = sumarDiasISO, diasEntre = diasEntreISO, temaValido = () => true }) {
  const errores = [];
  const avisos = [];
  const nuevos = [];
  const omitidos = [];

  const analizadas = [];
  for (const c of carpetas) {
    try {
      analizadas.push({ ...analizarCarpeta(c.nombre), c });
    } catch (e) {
      errores.push(e.message);
    }
  }
  analizadas.sort((a, b) => a.n - b.n);

  // Numeración única y consecutiva.
  for (let i = 0; i < analizadas.length; i++) {
    const a = analizadas[i];
    if (i > 0 && a.n === analizadas[i - 1].n) {
      errores.push(`Hay dos carpetas con el número ${String(a.n).padStart(2, '0')}: ${analizadas[i - 1].c.nombre} y ${a.c.nombre}.`);
    } else if (i > 0 && a.n !== analizadas[i - 1].n + 1) {
      errores.push(
        `La numeración no es consecutiva: tras ${analizadas[i - 1].c.nombre} falta el día ${String(analizadas[i - 1].n + 1).padStart(2, '0')} antes de ${a.c.nombre}.`
      );
    }
  }

  const hijos = analizadas.filter((a) => a.n > ultimoDia);
  for (const a of analizadas) if (a.n <= ultimoDia) omitidos.push(a.n);
  if (hijos.length > 0 && hijos[0].n !== ultimoDia + 1) {
    errores.push(
      `La primera carpeta nueva (${hijos[0].c.nombre}) debe ser la del día ${String(ultimoDia + 1).padStart(2, '0')}, el siguiente al último del calendario.`
    );
  }

  for (const a of hijos) {
    const { c, n, tema } = a;
    const nom = c.nombre;
    const fecha = sumarDias(lanzamiento, n - 1);
    const ia = c.ia ?? [];
    const real = c.real ?? [];
    const subs = [...(c.subcarpetas ?? [])].sort();
    let estructuraOk = true;

    if (subs.length !== 2 || subs[0] !== 'ia' || subs[1] !== 'real') {
      estructuraOk = false;
      errores.push(`${nom} debe contener exactamente las subcarpetas ia/ y real/ (tiene: ${subs.join(', ') || 'ninguna'}).`);
    }
    if ((c.sueltos ?? []).length > 0) {
      errores.push(`${nom} contiene archivos o carpetas no admitidos: ${c.sueltos.join(', ')}.`);
    }
    if (ia.length + real.length !== 5) {
      errores.push(
        `${nom} tiene ${ia.length + real.length} imágenes (real: ${real.length}, ia: ${ia.length}). Cada día necesita exactamente 5; no se rellena ni se recorta. Retira o añade imágenes y vuelve a ejecutar.`
      );
    }
    if (estructuraOk && (ia.length < 1 || ia.length > 4)) {
      errores.push(`${nom} tiene ${ia.length} imágenes en ia/ y ${real.length} en real/. Cada día necesita entre 1 y 4 en ia/.`);
    }
    if (diasEntre(hoyISO, fecha) < 1) {
      errores.push(
        `El día ${String(n).padStart(2, '0')} (${fecha}) ya ha llegado o ha pasado; no se pueden añadir días de hoy ni del pasado.`
      );
    }
    if (!temaValido(tema)) {
      errores.push(`El tema de ${nom} ("${tema}") no es válido: debe tener entre 1 y 30 caracteres.`);
    }
    const prohibida = contienePalabraProhibida(tema);
    if (prohibida) {
      errores.push(`El tema de ${nom} ("${tema}") contiene la palabra prohibida "${prohibida}". Cambia el nombre de la carpeta.`);
    }

    const imagenes = [];
    for (const [tipo, dir, lista] of [['generada', 'ia', ia], ['autentica', 'real', real]]) {
      for (const archivo of lista) {
        const ruta = `${nom}/${dir}/${archivo}`;
        try {
          const { fuente, licencia } = fuenteDeArchivo(ruta, tipo);
          imagenes.push({ ruta, tipo, fuente, licencia });
        } catch (e) {
          errores.push(e.message);
        }
      }
    }
    nuevos.push({ n, fecha, tema, carpeta: nom, imagenes });
  }

  return { nuevos, omitidos, errores, avisos };
}

// ---------- Recortes manuales (lote.json, spec 4.4.5) [D-65] ----------

export const POSICIONES_RECORTE = {
  izquierda: 'left',
  centro: 'centre',
  derecha: 'right',
  arriba: 'top',
  abajo: 'bottom'
};

export function analizarLote(lote, rutasNuevas, rutasOmitidas = []) {
  const resultado = { recortes: {}, errores: [], avisos: [] };
  if (lote === null || lote === undefined) return resultado;
  if (typeof lote !== 'object' || Array.isArray(lote)) {
    resultado.errores.push('herramientas/lote.json debe ser un objeto JSON con rutas como claves.');
    return resultado;
  }
  const nfc = (r) => String(r).normalize('NFC');
  const nuevas = new Map(rutasNuevas.map((r) => [nfc(r), r]));
  const omitidas = new Set(rutasOmitidas.map(nfc));
  for (const clave of Object.keys(lote)) {
    const valor = lote[clave];
    const k = nfc(clave);
    if (nuevas.has(k)) {
      if (typeof valor === 'string' && Object.hasOwn(POSICIONES_RECORTE, valor)) {
        resultado.recortes[nuevas.get(k)] = valor;
      } else {
        resultado.errores.push(
          `lote.json: el recorte ${JSON.stringify(valor)} de "${clave}" no es válido; usa izquierda, centro, derecha, arriba o abajo.`
        );
      }
    } else if (omitidas.has(k)) {
      resultado.avisos.push(`lote.json: "${clave}" es de un día ya importado; su recorte solo se aplica con --reimportar.`);
    } else {
      resultado.errores.push(
        `lote.json: no existe la imagen "${clave}" en entrada/temas/ (usa la ruta relativa con /, por ejemplo "04-gente-bebiendo/real/foto.jpg").`
      );
    }
  }
  return resultado;
}

// ---------- Argumentos y reimportación (spec 4.4.2 paso 1 y 4.4.4) [D-65] ----------

export function analizarArgumentos(argv) {
  const conocidos = ['--simular', '--banco-nuevo', '--reimportar', '--confirmar'];
  const r = { simular: false, bancoNuevo: false, reimportar: false, confirmar: false, errores: [] };
  for (const a of argv) {
    if (!conocidos.includes(a)) {
      r.errores.push(`Argumento desconocido: ${a}.`);
      continue;
    }
    if (a === '--simular') r.simular = true;
    if (a === '--banco-nuevo') r.bancoNuevo = true;
    if (a === '--reimportar') r.reimportar = true;
    if (a === '--confirmar') r.confirmar = true;
  }
  if (r.confirmar && !r.reimportar) r.errores.push('--confirmar solo vale junto a --reimportar.');
  if (r.reimportar && r.bancoNuevo) {
    r.errores.push('--reimportar y --banco-nuevo no se pueden usar juntos: la reimportación ya crea un banco nuevo.');
  }
  return r;
}

// calendario: {dias: [{n, fecha}]}; nombresCarpetas: nombres de carpeta de entrada/temas/.
export function comprobarReimportacion({ calendario, nombresCarpetas, hoyISO, diasEntre = diasEntreISO }) {
  const errores = [];
  const dias = calendario?.dias ?? [];
  if (dias.length === 0) {
    errores.push('No hay nada que reimportar; usa npm run importar.');
    return errores;
  }
  const dosCifras = (n) => String(n).padStart(2, '0');
  const llegado = dias.find((d) => diasEntre(hoyISO, d.fecha) < 1);
  if (llegado) {
    errores.push(`El día ${dosCifras(llegado.n)} (${llegado.fecha}) ya ha llegado o ha pasado: después del lanzamiento no se reimporta ningún día.`);
  }
  const numeros = new Set();
  for (const nombre of nombresCarpetas) {
    try {
      numeros.add(analizarCarpeta(nombre).n);
    } catch {
      /* planificar informará del error */
    }
  }
  for (const d of dias) {
    if (!numeros.has(d.n)) errores.push(`Para reimportar falta la carpeta del día ${dosCifras(d.n)} en entrada/temas/.`);
  }
  return errores;
}

export function mensajeReimportacion({ dias, borradas }) {
  if (dias.length === 0) return '';
  return `Se regenerarían ${dias.length} días (${dias[0].fecha} a ${dias[dias.length - 1].fecha}) y se borrarían ${borradas} imágenes antiguas de casos/. Para hacerlo: npm run importar -- --reimportar --confirmar`;
}

// ---------- Aleatorio, ids y hashes ----------

export function barajar(lista, aleatorio) {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

const ALFABETO = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function nuevoId(aleatorio, usados) {
  for (;;) {
    let id = '';
    for (let i = 0; i < 10; i++) id += ALFABETO[Math.floor(aleatorio() * 36)];
    if (usados.has(id)) continue;
    if (contieneSubcadenaProhibida(id)) continue;
    return id;
  }
}

export function distanciaHamming(a, b) {
  let bits = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      bits += x & 1;
      x >>= 1;
    }
  }
  return bits;
}

// ---------- Pesos y mezcla ----------

const media = (l) => l.reduce((s, x) => s + x, 0) / l.length;

export function compararPesos(pesosAutenticas, pesosGeneradas) {
  if (!pesosAutenticas.length || !pesosGeneradas.length) return null;
  const mediaAutentica = media(pesosAutenticas);
  const mediaGenerada = media(pesosGeneradas);
  const menor = Math.min(mediaAutentica, mediaGenerada);
  const mayor = Math.max(mediaAutentica, mediaGenerada);
  const diferencia = (mayor - menor) / menor;
  return { mediaAutentica, mediaGenerada, diferencia, aviso: diferencia > UMBRAL_PESO };
}

// dias: [{n, pruebas, clave}], tamanos: Map|objeto id -> bytes, desofuscar(clave, n, i).
// Devuelve la comparación global y los días en los que también se supera el umbral.
export function analizarPesos({ dias, tamanos, desofuscar }) {
  const tam = (id) => (tamanos instanceof Map ? tamanos.get(id) : tamanos[id]);
  const aut = [];
  const gen = [];
  const diasAfectados = [];
  for (const d of dias) {
    const a = [];
    const g = [];
    d.pruebas.forEach((id, i) => {
      const bytes = tam(id);
      if (typeof bytes !== 'number') return;
      (desofuscar(d.clave, d.n, i) === 1 ? g : a).push(bytes);
    });
    aut.push(...a);
    gen.push(...g);
    const c = compararPesos(a, g);
    if (c?.aviso) diasAfectados.push(d.n);
  }
  return { global: compararPesos(aut, gen), diasAfectados };
}

export function mensajePeso({ global, diasAfectados }) {
  if (!global?.aviso) return null;
  const kb = (b) => `${Math.round(b / 1024)} KB`;
  const mayor = Math.max(global.mediaAutentica, global.mediaGenerada);
  const menor = Math.min(global.mediaAutentica, global.mediaGenerada);
  const pct = Math.round(global.diferencia * 100);
  const quien = global.mediaGenerada > global.mediaAutentica ? 'las generadas' : 'las auténticas';
  return (
    `AVISO: las imágenes de un tipo pesan de media un ${pct} % más que las del otro (${kb(mayor)} frente a ${kb(menor)}; pesan más ${quien}). ` +
    `El tamaño de archivo podría delatar la respuesta. Días afectados: ${diasAfectados.length ? diasAfectados.join(', ') : 'ninguno por separado'}.`
  );
}

export function avisosMezcla(generadasPorDia) {
  const avisos = [];
  const dias = generadasPorDia.length;
  if (dias === 0) return avisos;
  const total = dias * 5;
  const gen = generadasPorDia.reduce((s, x) => s + x, 0);
  const pGen = gen / total;
  if (pGen > 0.6) {
    avisos.push(`AVISO: ${Math.round(pGen * 100)} % de las pruebas son generadas (${gen} de ${total}); más del 60 % de un mismo tipo.`);
  } else if (1 - pGen > 0.6) {
    avisos.push(`AVISO: ${Math.round((1 - pGen) * 100)} % de las pruebas son auténticas (${total - gen} de ${total}); más del 60 % de un mismo tipo.`);
  }
  let i = 0;
  while (i < dias) {
    let j = i;
    while (j + 1 < dias && generadasPorDia[j + 1] === generadasPorDia[i]) j++;
    if (j - i + 1 >= 3) {
      avisos.push(
        `AVISO: ${j - i + 1} días seguidos (del ${i + 1} al ${j + 1}) con ${generadasPorDia[i]} generadas cada uno; el reparto se vuelve predecible.`
      );
    }
    i = j + 1;
  }
  return avisos;
}

// Interruptor del modo prueba en el texto de js/main.js [D-71]: true, false o null.
export function analizarPruebasAbiertas(codigo) {
  if (typeof codigo !== 'string') return null;
  const m = [...codigo.matchAll(/^const PRUEBAS_ABIERTAS = (true|false);/gm)];
  return m.length === 1 ? m[0][1] === 'true' : null;
}

export { EXT_IMAGEN };
