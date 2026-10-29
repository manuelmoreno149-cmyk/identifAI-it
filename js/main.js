// Punto de entrada: DOM, efectos y entrada del jugador. La lógica vive en los demás módulos.
import { TEXTOS } from './textos.js';
import {
  fechaLocal,
  formatearFecha,
  elegirIdioma,
  temaDelDia,
  msHastaMedianoche,
  formatearCuentaAtras,
  casoDelDia,
  casoDeNumero,
  rutaPrueba,
  desofuscar,
  desofuscarFicha,
  desofuscarAfirmacion,
  desofuscarAclaracion,
  cargarCalendario,
  cargarAfirmaciones,
  cargarAfirmacionesPrueba,
  afirmacionesDelDia,
  afirmacionesDeNumero,
  afirmacionesDelMes,
  mesDeNumero,
  numeroDelDia,
  fechaDelDia,
  FECHA_BASE_PRUEBA,
  precargar,
  fechaPrevisualizada,
  pruebaActiva,
  diasDePrueba,
  diaDePrueba
} from './diario.js';
import {
  MODOS,
  RETOS,
  estadoInicial,
  transicion,
  contarAciertos,
  estadoDeCodigo,
  votoDicho,
  etiquetaResultado,
  elegirVariante,
  mensajeFinal,
  mensajesDelReto,
  votoDeTecla,
  teclaDeVoto,
  medirOculta
} from './juego.js';
import {
  CLAVE,
  leerIdioma,
  guardarIdioma,
  crearAlmacenMemoria,
  leer,
  leerConRespaldo,
  actualizar,
  partidaDe,
  conAjustes,
  registrarInicio,
  registrarPrueba,
  registrarFin,
  cerrarAbandonada,
  calcularRacha
} from './almacen.js';
import {
  crearTemporizador,
  esperarPintado,
  nivelTemporizador,
  segundosRestantes
} from './temporizador.js';
import { rellenar, cuadros, textoCompartir, urlDelJuego, compartir } from './compartir.js';

const PRUEBAS_ABIERTAS = true; // Modo prueba [D-71]: poner false antes de la fecha de lanzamiento.

// Previsualización local [D-68]: fecha fija y almacenes en memoria (undefined = los del navegador).
const fechaFija = fechaPrevisualizada(location.search, location.hostname);
// Modo prueba [D-70]: manda ?fecha=, si es válido en un host local, sobre ?prueba=1.
const modoPrueba = fechaFija === null && pruebaActiva(location.search, PRUEBAS_ABIERTAS);
const enMemoria = fechaFija !== null || modoPrueba;
const almacenLocal = enMemoria ? crearAlmacenMemoria() : undefined;
const almacenSesion = enMemoria ? crearAlmacenMemoria() : undefined;
let fechaPrueba = null;

// Fecha efectiva: previsualización, día elegido en modo prueba o fecha local.
function hoy() {
  return fechaFija ?? fechaPrueba ?? fechaLocal(new Date());
}

const $ = (id) => document.getElementById(id);
const app = $('app');

// ---- Estado y datos en memoria ----
let estado = estadoInicial({});
let datos = null;
let disponible = true;
let calendario = null;
let fechaCarga = null; // fecha efectiva con la que se cargaron los casos
let imagenes = [];
let sesion = null;
let terminadaAqui = false;
let textoVeredicto = '';
let temporizador = null;
let cuentaAtras = null;
let bucleMedianoche = null;
let avisoCopiado = null;
let testigoPrueba = 0;
let botonDeFicha = null; // botón que abrió el diálogo, para devolverle el foco
let ausencia = null; // Fact or Fake [D-115]: {perf, fecha, indice} desde que se oculta la pestaña
let diasPrueba = null; // días del desplegable del modo prueba
let diaPrueba = null; // día abierto en el modo prueba

// Para el foco al cambiar de pantalla, fase o prueba.
let ultima = { pantalla: null, fase: null, indice: -1 };

// Árbol de textos del idioma activo [D-155]. Todo lo que ve el jugador sale de aquí.
function t() {
  return TEXTOS[estado.idioma];
}

function texto(ruta) {
  return ruta.split('.').reduce((o, k) => o?.[k], t());
}

// La preferencia de idioma vive siempre en el localStorage real, también en previsualización y prueba [D-154].
function almacenIdioma() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

// Pone el texto de un elemento si existe (el marcado de la 3.0 lo crea otro agente).
function poner(id, valor) {
  const el = $(id);
  if (el) el.textContent = valor;
  return el;
}

function sesionAleatoria() {
  const letras = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((b) => letras[b % letras.length]).join('');
}

function marcarAlmacen(ok) {
  disponible = ok;
  $('aviso-almacen').hidden = ok;
}

// Relee lo último guardado, aplica solo el cambio y guarda (varias pestañas pueden escribir).
function aplicar(cambio) {
  const r = actualizar(cambio, datos, almacenLocal, almacenSesion);
  datos = r.datos;
  marcarAlmacen(r.guardado);
}

function nombreReto(reto) {
  return t().portada[`reto_${reto}`];
}

function selloDe(reto, verdad) {
  const grupo = reto === 'afirmaciones' ? t().afirmaciones : t().partida;
  return verdad === 1 ? grupo.sello_generada : grupo.sello_autentica;
}

// ---- Despacho ----
function despachar(evento) {
  const previo = estado;
  const nuevo = transicion(previo, evento);
  if (nuevo === previo) return;
  estado = nuevo;
  antesDeRender(previo, nuevo, evento);
  // Si cambia el contexto con la ficha abierta (p. ej. OTRA_PESTANA), se cierra antes de pintar.
  if (fichaAbierta() && !(nuevo.pantalla === previo.pantalla && nuevo.fase === previo.fase)) {
    cerrarFicha(false);
  }
  render(nuevo);
  despuesDeRender(previo, nuevo, evento);
  // Una ausencia solo puede estar abierta durante una pregunta.
  if (!(nuevo.pantalla === 'caso' && nuevo.fase === 'pregunta')) ausencia = null;
}

// Efectos que deben ocurrir antes de pintar nada (guardar la partida, elegir textos).
function antesDeRender(previo, nuevo, evento) {
  if (evento.tipo === 'ELEGIR_MODO') {
    aplicar((d) => conAjustes(d, { modo: nuevo.modo }));
  }
  if (evento.tipo === 'ABRIR_RETO') {
    aplicar((d) => conAjustes(d, { reto: nuevo.reto }));
  }
  if (evento.tipo === 'CAMBIAR_IDIOMA') {
    // Solo cambia lo que se muestra: no toca el progreso ni las partidas [D-154].
    guardarIdioma(almacenIdioma(), nuevo.idioma);
    ponerIdiomaEnUrl(nuevo.idioma);
    aplicarIdioma();
  }
  if (previo.fase !== 'veredicto' && nuevo.fase === 'veredicto') {
    const codigo = nuevo.resultados[nuevo.indice];
    aplicar((d) => registrarPrueba(d, nuevo.reto, nuevo.fecha, nuevo.indice, codigo, sesion));
    textoVeredicto =
      nuevo.motivo === 'oculta'
        ? elegirVariante(t().afirmaciones.oculta)
        : elegirVariante(t().veredictos[estadoDeCodigo(codigo)]);
  }
  if (previo.pantalla === 'caso' && nuevo.pantalla === 'resultado') {
    // La partida cuenta para el día en que empezó, aunque acabe pasada la medianoche.
    aplicar((d) => registrarFin(d, nuevo.reto, nuevo.fecha, nuevo.fecha, sesion));
    terminadaAqui = true;
  }
}

// Efectos asíncronos o que dependen de que la pantalla ya esté pintada.
function despuesDeRender(previo, nuevo) {
  if (previo.pantalla === 'cuenta-atras' && nuevo.pantalla !== 'cuenta-atras') detenerCuentaAtras();
  if (esConCuentaAtras(previo.pantalla) && !esConCuentaAtras(nuevo.pantalla)) detenerBucleMedianoche();
  if (nuevo.pantalla !== 'resultado' && nuevo.pantalla !== 'ya-jugado') ocultarCompartirManual();

  if (nuevo.pantalla === 'iniciando' && previo.pantalla !== 'iniciando') cargarDia();
  if (nuevo.pantalla === 'cargando' && previo.pantalla !== 'cargando') hacerPrecarga();
  if (nuevo.pantalla === 'cuenta-atras' && previo.pantalla !== 'cuenta-atras') iniciarCuentaAtras();
  if (esConCuentaAtras(nuevo.pantalla) && previo.pantalla !== nuevo.pantalla) iniciarBucleMedianoche();

  if (nuevo.fase === 'veredicto' && previo.fase !== 'veredicto') {
    if (temporizador) temporizador.detener();
  }
  if (previo.pantalla === 'caso' && nuevo.pantalla !== 'caso') {
    if (temporizador) temporizador.detener();
    restablecerTemporizadorVisual();
  }

  if (nuevo.pantalla === 'caso' && nuevo.fase === 'pregunta') {
    const nuevaPrueba =
      previo.pantalla !== 'caso' || previo.fase !== 'pregunta' || previo.indice !== nuevo.indice;
    if (nuevaPrueba) {
      if (nuevo.reto === 'afirmaciones') iniciarAfirmacion();
      else iniciarPrueba();
    }
  }
}

// ---- Carga del día ----
// Juego normal y previsualización: calendario y mes de la fecha efectiva, en paralelo.
// Modo prueba: calendario y después todos los meses, en serie [D-117].
async function cargarDia() {
  try {
    const lectura = leerConRespaldo(almacenLocal, almacenSesion);
    if (lectura.disponible || lectura.respaldo) datos = lectura.datos;
    marcarAlmacen(lectura.disponible);

    let casoImagenes = null;
    let casoAfirmaciones = null;
    let dia = null;
    if (modoPrueba) {
      calendario = await cargarCalendario();
      const meses = await cargarAfirmacionesPrueba(calendario.lanzamiento);
      const dias = diasDePrueba(calendario, meses);
      const nHoy = numeroDelDia(fechaLocal(new Date()), calendario.lanzamiento);
      const elegido = diaDePrueba(location.search, dias, nHoy);
      fechaPrueba = elegido ? fechaDelDia(calendario.lanzamiento ?? FECHA_BASE_PRUEBA, elegido.n) : null;
      dia = hoy();
      if (elegido) {
        casoImagenes = casoDeNumero(calendario, elegido.n);
        const mes = afirmacionesDelMes(meses, mesDeNumero(calendario.lanzamiento, elegido.n));
        casoAfirmaciones = afirmacionesDeNumero(mes, calendario.lanzamiento, elegido.n);
      }
      prepararModoPrueba(dias, elegido);
    } else {
      dia = hoy();
      const [cal, mes] = await Promise.all([cargarCalendario(), cargarAfirmaciones(dia)]);
      calendario = cal;
      casoImagenes = casoDelDia(calendario, dia);
      casoAfirmaciones = afirmacionesDelDia(mes, calendario.lanzamiento, dia);
    }
    fechaCarga = dia;

    const casos = { imagenes: casoImagenes, afirmaciones: casoAfirmaciones };
    const retos = {};
    for (const reto of RETOS) {
      const caso = casos[reto];
      if (caso) {
        // Partida abandonada: las pruebas pendientes cuentan como fallo [D-79].
        const pendiente = partidaDe(datos, reto, caso.fecha);
        if (pendiente && pendiente.estado === 'en_curso') {
          aplicar((d) => cerrarAbandonada(d, reto, caso.fecha, caso.fecha));
        }
      }
      retos[reto] = {
        caso,
        jugado: caso ? partidaDe(datos, reto, caso.fecha)?.estado === 'terminada' : false
      };
    }
    despachar({ tipo: 'CARGADO', retos, reto: estado.reto });
  } catch (e) {
    console.error(e);
    calendario = null;
    despachar({ tipo: 'ERROR_CALENDARIO' });
  }
}

// ---- Modo prueba [D-70, D-110, D-152] ----
function prepararModoPrueba(dias, elegido) {
  diasPrueba = dias;
  diaPrueba = elegido;
  $('selector-prueba-dia')?.remove();
  if (elegido) crearSelectorPrueba(dias, elegido);
  pintarAvisosFecha();
}

// Desplegable de día, justo después de #portada-tema. Al cambiar, recarga el día elegido (DP-68).
function crearSelectorPrueba(dias, elegido) {
  const select = document.createElement('select');
  select.id = 'selector-prueba-dia';
  for (const d of dias) {
    const opcion = document.createElement('option');
    opcion.value = String(d.n);
    if (d.n === elegido.n) opcion.selected = true;
    select.append(opcion);
  }
  const tema = $('portada-tema');
  if (tema) tema.after(select);
  pintarSelectorPrueba();
}

// Etiqueta y texto de las opciones en el idioma activo.
function pintarSelectorPrueba() {
  const select = $('selector-prueba-dia');
  if (!select || !diasPrueba) return;
  select.setAttribute('aria-label', t().prueba.etiqueta);
  for (const opcion of select.options) {
    const d = diasPrueba.find((x) => String(x.n) === opcion.value);
    opcion.textContent = rellenar(t().prueba.opcion, { n: opcion.value, tema: d ? temaDelDia(d, estado.idioma) : '' });
  }
}

// Avisos de previsualización o de modo prueba, en el idioma activo.
function pintarAvisosFecha() {
  const aviso = $('aviso-previsualizacion');
  if (!aviso) return;
  if (fechaFija) {
    aviso.textContent = rellenar(t().avisos.previsualizacion, { fecha: formatearFecha(fechaFija, estado.idioma) });
    aviso.hidden = false;
  } else if (modoPrueba && diasPrueba) {
    aviso.textContent = rellenar(t().avisos.prueba, { n: diaPrueba?.n ?? '-' });
    aviso.hidden = false;
  }
}

// ---- Precarga (solo Images) ----
async function hacerPrecarga() {
  try {
    const lista = await precargar(estado.pruebas);
    if (estado.pantalla !== 'cargando') return;
    imagenes = lista;
    despachar({ tipo: 'PRECARGA_OK' });
  } catch (e) {
    console.error(e);
    if (estado.pantalla === 'cargando') despachar({ tipo: 'PRECARGA_ERROR' });
  }
}

// ---- Cuenta atrás inicial (solo Images) ----
function iniciarCuentaAtras() {
  detenerCuentaAtras();
  const numero = $('cuenta-atras-numero');
  numero.textContent = '3';
  cuentaAtras = crearTemporizador({
    duracionMs: 3000,
    alTick: (restante) => {
      const s = String(segundosRestantes(restante));
      if (s !== '0' && numero.textContent !== s) numero.textContent = s;
    },
    alAgotar: finCuenta
  });
  cuentaAtras.iniciar();
}

function detenerCuentaAtras() {
  if (cuentaAtras) {
    cuentaAtras.detener();
    cuentaAtras = null;
  }
}

function finCuenta() {
  cuentaAtras = null;
  if (estado.pantalla !== 'cuenta-atras') return;
  const caso = estado.retos.imagenes.caso;
  const fecha = caso.fecha;
  // El intento se consume aquí, releyendo el almacén: si otra pestaña ya había
  // empezado la partida, registrarInicio no cambia nada y la sesión no coincide.
  const miSesion = sesionAleatoria();
  aplicar((d) => registrarInicio(d, 'imagenes', { fecha, n: caso.n, modo: estado.modo, sesion: miSesion }));
  if (partidaDe(datos, 'imagenes', fecha)?.sesion !== miSesion) {
    despachar({ tipo: 'OTRA_PESTANA', reto: 'imagenes' });
    return;
  }
  sesion = miSesion;
  terminadaAqui = false;
  despachar({ tipo: 'FIN_CUENTA', fecha });
}

// ---- Empezar (solo desde instrucciones) ----
function empezar() {
  if (estado.pantalla !== 'instrucciones') return;
  const { caso, jugado } = estado.retos[estado.reto];
  if (!caso) return;
  if (estado.reto === 'afirmaciones' && !jugado) {
    // Fact or Fake: el intento se gasta ya, antes de pintar la primera afirmación [D-100].
    const fecha = caso.fecha;
    const miSesion = sesionAleatoria();
    aplicar((d) => registrarInicio(d, 'afirmaciones', { fecha, n: caso.n, modo: null, sesion: miSesion }));
    if (partidaDe(datos, 'afirmaciones', fecha)?.sesion !== miSesion) {
      despachar({ tipo: 'OTRA_PESTANA', reto: 'afirmaciones' });
      return;
    }
    sesion = miSesion;
    terminadaAqui = false;
    despachar({ tipo: 'EMPEZAR', fecha });
    return;
  }
  despachar({ tipo: 'EMPEZAR', fecha: caso.fecha });
}

// ---- Una prueba de Images ----
async function iniciarPrueba() {
  const mio = ++testigoPrueba;
  const indice = estado.indice;
  if (temporizador) temporizador.detener();
  temporizador = null;
  restablecerTemporizadorVisual();

  const img = imagenes[indice];
  img.className = 'prueba-img';
  img.alt = rellenar(t().partida.alt_prueba, { i: indice + 1 });
  img.width = 1080;
  img.height = 1350;
  img.hidden = false;
  $('prueba-marco').replaceChildren(img);

  await esperarPintado();
  if (mio !== testigoPrueba) return;
  if (estado.pantalla !== 'caso' || estado.fase !== 'pregunta' || estado.indice !== indice) return;

  despachar({ tipo: 'PINTADA' });
  if (!estado.activo) return;

  // Investigador: sin temporizador, sin cinta y sin anuncios.
  const duracion = MODOS[estado.modo];
  if (duracion === null) return;

  const anunciar = estado.modo === 'normal'; // en perro no se anuncia nada durante la observación
  let ultimoSegundo = null;
  temporizador = crearTemporizador({
    duracionMs: duracion,
    alTick: (restante, fraccion) => {
      const cinta = $('temporizador');
      cinta.style.setProperty('--restante', String(fraccion));
      const nivel = nivelTemporizador(fraccion);
      if (cinta.dataset.nivel !== nivel) cinta.dataset.nivel = nivel;
      if (anunciar) {
        const s = segundosRestantes(restante);
        if (s !== ultimoSegundo && s > 0) {
          ultimoSegundo = s;
          $('temporizador-anuncio').textContent = rellenar(t().partida.quedan, { s });
        }
      }
    },
    alAgotar: () => {
      despachar({ tipo: 'AGOTADO' });
      // Sellado: se anuncia en normal y perro (en investigador no hay temporizador).
      if (estado.tapada && estado.pantalla === 'caso' && estado.indice === indice) {
        $('temporizador-anuncio').textContent = t().partida.sobre_anuncio;
      }
    }
  });
  temporizador.iniciar();
}

// ---- Una prueba de Fact or Fake: sin temporizador, solo PINTADA ----
async function iniciarAfirmacion() {
  const mio = ++testigoPrueba;
  const indice = estado.indice;
  // Vacía el anuncio de la prueba anterior (el aviso de ausencia suena una vez por partida).
  restablecerTemporizadorVisual();

  await esperarPintado();
  if (mio !== testigoPrueba) return;
  if (estado.reto !== 'afirmaciones' || estado.pantalla !== 'caso') return;
  if (estado.fase !== 'pregunta' || estado.indice !== indice) return;

  despachar({ tipo: 'PINTADA' });
  if (indice === 0 && estado.activo) {
    $('temporizador-anuncio').textContent = t().afirmaciones.aviso_oculta;
  }
}

function restablecerTemporizadorVisual() {
  const cinta = $('temporizador');
  cinta.style.setProperty('--restante', '1');
  cinta.dataset.nivel = 'normal';
  $('temporizador-anuncio').textContent = '';
}

// ---- Render ----
function mostrarPantalla(nombre) {
  for (const seccion of app.querySelectorAll('.pantalla')) {
    seccion.hidden = seccion.id !== `pantalla-${nombre}`;
  }
}

function ponerFoco(elemento) {
  if (elemento) elemento.focus({ preventScroll: true });
}

function focoDeSeccion(nombre) {
  const seccion = $(`pantalla-${nombre}`);
  if (!seccion) return;
  ponerFoco(seccion.querySelector('[data-foco]') ?? seccion.querySelector('h1, h2'));
}

function nombreModo(modo) {
  return t().portada[`modo_${modo}`];
}

function renderCuadros(elemento, resultados, aciertos) {
  elemento.textContent = cuadros(resultados);
  elemento.setAttribute('aria-label', rellenar(t().final.cuadros_etiqueta, { aciertos }));
}

// Pasos del briefing: un li sin atributos por paso, en el idioma activo.
function ponerPasos(reto) {
  const lista = $('instrucciones-pasos');
  if (!lista) return;
  const pasos = reto === 'afirmaciones' ? t().instrucciones.pasos_afirmaciones : t().instrucciones.pasos_imagenes;
  lista.replaceChildren(
    ...pasos.map((paso) => {
      const li = document.createElement('li');
      li.textContent = paso;
      return li;
    })
  );
}

// Estado de un reto en la portada [D-98].
function estadoDeReto(e, reto) {
  const { caso, jugado } = e.retos[reto];
  if (!caso) return t().portada.estado_sin_caso;
  const partida = partidaDe(datos, reto, caso.fecha);
  if (partida?.estado === 'terminada') {
    return rellenar(t().portada.estado_jugado, { aciertos: contarAciertos(partida.resultados) });
  }
  if (partida?.estado === 'en_curso' || jugado) return t().portada.estado_en_curso;
  return t().portada.estado_pendiente;
}

// Tema del caso elegido en el idioma activo ('' sin caso).
function temaActual(e) {
  return e.tema?.[e.idioma] ?? '';
}

function renderPortada(e) {
  const caso = poner('portada-caso', e.n ? rellenar(t().portada.etiqueta_caso, { n: e.n }) : '');
  if (caso) caso.hidden = !e.n;
  const tema = poner('portada-tema', temaActual(e));
  if (tema) tema.hidden = modoPrueba || !e.n;
  for (const reto of RETOS) {
    poner(`reto-${reto}-estado`, estadoDeReto(e, reto));
    const tarjeta = app.querySelector(`#pantalla-portada [data-reto-boton="${reto}"]`);
    if (tarjeta) tarjeta.disabled = !e.retos[reto].caso;
  }
  const creditos = $('portada-creditos');
  if (creditos) creditos.setAttribute('href', e.idioma === 'es' ? 'creditos.es.html' : 'creditos.html');
  pintarSelectorPrueba();
}

function renderInstrucciones(e) {
  const imagenes = e.reto === 'imagenes';
  poner('instrucciones-membrete', rellenar(t().instrucciones.membrete, { n: e.n ?? '', tema: temaActual(e) }));
  ponerPasos(e.reto);
  const modos = $('instrucciones-modos');
  if (modos) modos.hidden = !imagenes;
  const reglas = $('instrucciones-reglas');
  if (reglas) reglas.hidden = imagenes;
  for (const radio of app.querySelectorAll('input[name="modo"]')) radio.checked = radio.value === e.modo;
}

// Detalles de una aclaración como <li> sin atributos; sin detalles, la lista queda vacía y oculta.
function pintarAclaracion(contenedor, elTexto, lista, ficha) {
  const valida = ficha !== null && typeof ficha === 'object';
  elTexto.textContent = valida ? ficha.aclaracion : t().afirmaciones.aclaracion_no_disponible;
  const detalles = valida ? ficha.detalles : [];
  lista.replaceChildren(
    ...detalles.map((d) => {
      const li = document.createElement('li');
      li.textContent = d;
      return li;
    })
  );
  lista.hidden = detalles.length === 0;
  contenedor.hidden = false;
}

function vaciarAclaracion(contenedor, elTexto, lista) {
  elTexto.textContent = '';
  lista.replaceChildren();
  lista.hidden = true;
  contenedor.hidden = true;
}

function renderCaso(e) {
  const afirmaciones = e.reto === 'afirmaciones';
  const seccion = $('pantalla-caso');
  const sellada = !afirmaciones && e.fase === 'pregunta' && e.tapada;
  seccion.dataset.fase = e.fase ?? 'pregunta';
  seccion.dataset.tapada = sellada ? 'si' : 'no';

  // Imagen y sobre solo en Images; la tarjeta solo en Fact or Fake.
  $('prueba-marco').hidden = afirmaciones;
  const img = $('prueba-marco').querySelector('.prueba-img');
  if (img) img.hidden = sellada; // sellado [D-90]: tras el sobre; en el veredicto vuelve a verse
  $('prueba-sobre').hidden = !sellada;
  $('afirmacion').hidden = !afirmaciones;
  if (afirmaciones) {
    const valor = typeof e.texto === 'string' ? e.texto : t().afirmaciones.no_disponible;
    const el = $('afirmacion-texto');
    if (el.textContent !== valor) el.textContent = valor;
  } else {
    $('afirmacion-texto').textContent = '';
  }

  // Aviso de ausencia: solo en la pregunta de la prueba 1 de Fact or Fake [D-115].
  $('caso-aviso').hidden = !(afirmaciones && e.fase === 'pregunta' && e.indice === 0);

  // Votos: texto y tecla según el reto [D-122].
  const grupo = afirmaciones ? t().afirmaciones : t().partida;
  for (const voto of ['autentica', 'generada']) {
    const tecla = teclaDeVoto(e.reto, voto, e.idioma);
    $(`voto-${voto}-texto`).textContent = grupo[`boton_${voto}`];
    $(`voto-${voto}-tecla`).textContent = tecla ?? '';
    const boton = app.querySelector(`#caso-botones [data-voto="${voto}"]`);
    if (tecla) boton.setAttribute('aria-keyshortcuts', tecla);
    else boton.removeAttribute('aria-keyshortcuts');
  }

  const casillas = $('caso-progreso').children;
  for (let i = 0; i < casillas.length; i++) {
    casillas[i].dataset.estado = estadoDeCodigo(e.resultados[i]) ?? (i === e.indice ? 'actual' : 'pendiente');
  }
  $('caso-modo').textContent = afirmaciones
    ? ''
    : rellenar(t().partida.modo_etiqueta, { modo: nombreModo(e.modo) });
  $('caso-tema').textContent = temaActual(e) ? rellenar(t().partida.caso_del_dia, { tema: temaActual(e) }) : '';
  $('caso-etiqueta').textContent = rellenar(grupo.etiqueta_prueba, { i: e.indice + 1 });
  $('caso-marcador').textContent = rellenar(t().partida.marcador, {
    aciertos: contarAciertos(e.resultados)
  });
  const veredicto = $('veredicto');
  const textoBoton = app.querySelector('[data-accion="siguiente"] .boton-texto');
  textoBoton.textContent =
    e.indice === 4
      ? t().partida.boton_ver_resultado
      : afirmaciones
        ? t().afirmaciones.boton_siguiente
        : t().partida.boton_siguiente;
  const confesion = $('veredicto-confesion-texto');
  $('veredicto-confesion').hidden = afirmaciones;
  const aclaracion = $('veredicto-aclaracion');
  const aclaracionTexto = $('veredicto-aclaracion-texto');
  const detalles = $('veredicto-detalles');

  if (e.fase === 'veredicto') {
    veredicto.hidden = false;
    veredicto.dataset.estado = estadoDeCodigo(e.resultados[e.indice]);
    veredicto.dataset.verdad = e.revelada === 1 ? 'generada' : 'autentica';
    $('veredicto-sello').textContent = selloDe(e.reto, e.revelada);
    $('veredicto-texto').textContent = textoVeredicto;
    const acierto = estadoDeCodigo(e.resultados[e.indice]) === 'acierto';
    const dijo = acierto ? e.revelada : 1 - e.revelada;
    const claveBanda = e.motivo === 'oculta' ? 'banda_oculta' : acierto ? 'banda_acierto' : 'banda_fallo';
    $('veredicto-banda-texto').textContent = rellenar(t().revelacion[claveBanda], {
      voto: grupo[dijo === 1 ? 'voto_generada' : 'voto_autentica']
    });
    if (afirmaciones) {
      $('veredicto-resumen').textContent = '';
      $('prueba-etiqueta').textContent = '';
      $('prueba-sello').textContent = '';
    } else {
      $('veredicto-resumen').textContent =
        t().revelacion[`resumen_${e.revelada === 1 ? 'generada' : 'autentica'}`];
      $('prueba-etiqueta').textContent = rellenar(t().revelacion.etiqueta_prueba, { i: e.indice + 1 });
      $('prueba-sello').textContent = $('veredicto-sello').textContent;
    }
    // La ficha, la aclaración y los detalles solo existen en el DOM a partir de aquí (ya respondida).
    if (afirmaciones) {
      pintarAclaracion(aclaracion, aclaracionTexto, detalles, e.ficha);
      confesion.textContent = '';
    } else {
      vaciarAclaracion(aclaracion, aclaracionTexto, detalles);
      confesion.textContent = typeof e.ficha === 'string' ? e.ficha : t().confesion.no_disponible;
    }
  } else {
    vaciarVeredicto();
  }
}

// Deja el veredicto sin respuesta, sin ficha, sin aclaración y sin detalles.
function vaciarVeredicto() {
  $('veredicto').hidden = true;
  $('veredicto').removeAttribute('data-estado');
  $('veredicto').removeAttribute('data-verdad');
  $('veredicto-sello').textContent = '';
  $('veredicto-texto').textContent = '';
  $('veredicto-confesion-texto').textContent = '';
  $('veredicto-banda-texto').textContent = '';
  $('veredicto-resumen').textContent = '';
  $('prueba-etiqueta').textContent = '';
  $('prueba-sello').textContent = '';
  vaciarAclaracion($('veredicto-aclaracion'), $('veredicto-aclaracion-texto'), $('veredicto-detalles'));
}

// Fuera de `caso` no queda ninguna afirmación, ficha ni aclaración en el DOM.
function limpiarCaso() {
  $('afirmacion-texto').textContent = '';
  vaciarVeredicto();
}

function crearSpan(clase, contenido, oculto = true) {
  const span = document.createElement('span');
  span.className = clase;
  if (contenido !== undefined) span.textContent = contenido;
  if (oculto) span.setAttribute('aria-hidden', 'true');
  return span;
}

// Cinco tarjetas del tablón: fotos (Images) o afirmaciones (Fact or Fake) que abren la ficha.
// Se crean solo al llegar a resultado [D-89, D-126]; la verdad se descifra aquí, ya contestadas las cinco.
function crearMiniaturas(e) {
  const lista = $('resultado-revision');
  lista.replaceChildren();
  const afirmaciones = e.reto === 'afirmaciones';
  const grupoReto = afirmaciones ? t().afirmaciones : t().partida;
  for (let i = 0; i < 5; i++) {
    const codigo = e.resultados[i];
    const estadoPrueba = estadoDeCodigo(codigo);
    let verdad = null;
    try {
      verdad = desofuscar(e.clave, e.n, i);
    } catch {
      verdad = null;
    }
    const dijo = votoDicho(verdad, codigo);
    const li = document.createElement('li');
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'miniatura';
    boton.dataset.accion = 'ver-ficha';
    boton.dataset.prueba = String(i + 1);
    boton.dataset.estado = estadoPrueba;
    if (verdad !== null) boton.dataset.verdad = verdad === 1 ? 'generada' : 'autentica';
    boton.setAttribute('aria-haspopup', 'dialog');
    const lector = document.createElement('span');
    lector.className = 'solo-lectores';
    const grupoEstado = afirmaciones ? t().afirmaciones.estado_prueba : t().final.estado_prueba;
    lector.textContent = rellenar(grupoEstado, { i: i + 1, estado: t().final.estados[estadoPrueba] });
    const sello = verdad === null ? '' : selloDe(e.reto, verdad);
    const pie = crearSpan('mini-pie');
    if (dijo !== null) {
      const voto = grupoReto[dijo === 1 ? 'voto_generada' : 'voto_autentica'];
      pie.append(crearSpan('mini-voto', rellenar(t().resultado.dijiste, { voto }), false));
    }
    if (afirmaciones) {
      const cabecera = crearSpan('mini-cabecera');
      cabecera.append(crearSpan('mini-numero', `#${i + 1}`, false), crearSpan('mini-sello', sello, false));
      const afirmacion = desofuscarAfirmacion(e.textos?.[e.idioma]?.[i], e.clave, e.n, i, e.idioma);
      const cuerpo = crearSpan('mini-texto', afirmacion ?? t().afirmaciones.no_disponible);
      boton.append(lector, cabecera, cuerpo, pie);
    } else {
      const foto = crearSpan('mini-foto');
      const img = document.createElement('img');
      img.className = 'mini-img';
      img.src = rutaPrueba(e.pruebas[i]);
      img.alt = '';
      img.width = 1080;
      img.height = 1350;
      foto.append(img, crearSpan('mini-sello', sello, false));
      pie.prepend(crearSpan('mini-numero', `#${i + 1}`, false));
      boton.append(lector, foto, pie);
    }
    // Todo menos el nombre accesible queda fuera del árbol de accesibilidad.
    for (const hijo of boton.querySelectorAll('.mini-foto, .mini-cabecera, .mini-texto, .mini-pie')) {
      hijo.setAttribute('aria-hidden', 'true');
    }
    li.append(boton);
    lista.append(li);
  }
}

function renderResultado(e) {
  const aciertos = contarAciertos(e.resultados);
  const retoDatos = datos.retos[e.reto];
  const afirmaciones = e.reto === 'afirmaciones';
  $('resultado-reto').textContent = etiquetaResultado([
    nombreReto(e.reto),
    rellenar(t().portada.etiqueta_caso, { n: e.n }),
    temaActual(e),
    afirmaciones ? '' : nombreModo(e.modo)
  ]);
  $('resultado-aciertos').textContent = rellenar(t().final.aciertos, { aciertos });
  $('resultado-mensaje').textContent = mensajeFinal(aciertos, mensajesDelReto(e.reto, t().final));
  $('resultado-racha').textContent = String(retoDatos.racha);
  $('resultado-mejor-racha').textContent = String(retoDatos.mejorRacha);
  $('resultado-proximo').hidden = false;
  $('resultado-nuevo-caso').hidden = true;
  crearMiniaturas(e);
}

function renderYaJugado() {
  const reto = estado.reto;
  const fecha = estado.retos[reto].caso?.fecha ?? fechaCarga;
  const partida = partidaDe(datos, reto, fecha);
  if (!partida) return;
  const enCurso = partida.estado !== 'terminada';
  $('ya-jugado-reto').textContent = rellenar(t().final.reto, { reto: nombreReto(reto), n: partida.n });
  $('ya-jugado-texto').textContent = enCurso ? t().avisos.otra_pestana : t().ya_jugado.texto;
  for (const id of ['ya-jugado-aciertos', 'ya-jugado-modo', 'ya-jugado-cuadros', 'ya-jugado-racha']) {
    $(id).hidden = enCurso;
  }
  for (const b of $('pantalla-ya-jugado').querySelectorAll('[data-accion="compartir"]')) b.hidden = enCurso;
  if (enCurso) return;
  const aciertos = contarAciertos(partida.resultados);
  $('ya-jugado-aciertos').textContent = rellenar(t().final.aciertos, { aciertos });
  // El modo solo existe en Images.
  const modo = $('ya-jugado-modo');
  modo.hidden = reto === 'afirmaciones';
  modo.textContent = reto === 'afirmaciones' ? '' : rellenar(t().ya_jugado.modo, { modo: nombreModo(partida.modo) });
  renderCuadros($('ya-jugado-cuadros'), partida.resultados, aciertos);
  $('ya-jugado-racha').textContent = rellenar(t().final.racha, {
    racha: calcularRacha(datos.retos[reto].partidas, fecha)
  });
}

function render(e) {
  mostrarPantalla(e.pantalla);
  app.dataset.pantalla = e.pantalla;
  app.dataset.reto = e.reto;
  app.dataset.modo = e.modo;
  actualizarSelectorIdioma(e.idioma);

  if (e.pantalla !== 'caso') limpiarCaso();
  if (e.pantalla !== 'resultado') $('resultado-revision').replaceChildren();
  if (e.pantalla === 'portada') renderPortada(e);
  if (e.pantalla === 'instrucciones') renderInstrucciones(e);
  if (e.pantalla === 'caso') renderCaso(e);
  if (e.pantalla === 'resultado') renderResultado(e);
  if (e.pantalla === 'ya-jugado') renderYaJugado();
  if (e.pantalla === 'sin-casos') {
    $('sin-casos-texto').textContent =
      calendario?.lanzamiento === null ? t().sin_casos.sin_lanzamiento : t().sin_casos.texto;
  }
  if (e.pantalla === 'error') $('error-texto').textContent = t().errores[e.error];

  // Foco
  const cambioPantalla = e.pantalla !== ultima.pantalla;
  if (e.pantalla === 'caso') {
    if (e.fase === 'veredicto' && ultima.fase !== 'veredicto') {
      ponerFoco(app.querySelector('[data-accion="siguiente"]'));
    } else if (e.fase === 'pregunta' && (cambioPantalla || ultima.fase !== 'pregunta' || ultima.indice !== e.indice)) {
      ponerFoco($('caso-etiqueta'));
    }
  } else if (cambioPantalla) {
    focoDeSeccion(e.pantalla);
  }
  ultima = { pantalla: e.pantalla, fase: e.fase, indice: e.indice };
}

// ---- Ficha (diálogo modal) [D-88, D-89, D-126] ----
function fichaAbierta() {
  return $('ficha').open;
}

// i: índice 0..4. Images: en caso/veredicto (prueba actual) o en resultado.
// Fact or Fake: solo desde resultado (en el veredicto todo cabe).
function abrirFicha(i, conImagen, opener) {
  const enVeredicto = estado.pantalla === 'caso' && estado.fase === 'veredicto';
  const enResultado = estado.pantalla === 'resultado';
  const afirmaciones = estado.reto === 'afirmaciones';
  if (!enVeredicto && !enResultado) return;
  if (afirmaciones && !enResultado) return;
  if (fichaAbierta()) return;
  if (enVeredicto) i = estado.indice;
  if (!Number.isInteger(i) || i < 0 || i > 4) return;

  // Se descifra ahora y no se guarda en ningún sitio.
  const verdad = enVeredicto ? estado.revelada : desofuscar(estado.clave, estado.n, i);
  const sello = selloDe(estado.reto, verdad);
  const estadoPrueba = t().final.estados[estadoDeCodigo(estado.resultados[i])];

  if (afirmaciones) {
    const idioma = estado.idioma;
    const afirmacion = desofuscarAfirmacion(estado.textos?.[idioma]?.[i], estado.clave, estado.n, i, idioma);
    const ficha = desofuscarAclaracion(estado.fichas?.[idioma]?.[i], estado.clave, estado.n, i, idioma);
    $('ficha-titulo').textContent = rellenar(t().afirmaciones.estado_prueba, { i: i + 1, estado: estadoPrueba });
    $('ficha-img').hidden = true;
    $('ficha-afirmacion').textContent = afirmacion ?? t().afirmaciones.no_disponible;
    $('ficha-afirmacion').hidden = false;
    $('ficha-era').textContent = rellenar(t().final.era, { sello });
    $('ficha-confesion-titulo').hidden = true;
    $('ficha-texto').hidden = true;
    pintarAclaracion($('ficha-aclaracion'), $('ficha-aclaracion-texto'), $('ficha-detalles'), ficha);
  } else {
    let textoFicha;
    if (enVeredicto) {
      textoFicha = estado.ficha;
    } else {
      textoFicha = desofuscarFicha(estado.fichas?.[estado.idioma]?.[i], estado.clave, estado.n, i, estado.idioma);
    }
    $('ficha-titulo').textContent = rellenar(t().final.estado_prueba, { i: i + 1, estado: estadoPrueba });
    $('ficha-era').textContent = rellenar(t().final.era, { sello });
    $('ficha-texto').textContent = typeof textoFicha === 'string' ? textoFicha : t().confesion.no_disponible;
    const img = $('ficha-img');
    if (conImagen) {
      img.alt = rellenar(t().final.alt_prueba, { n: i + 1 });
      img.src = rutaPrueba(estado.pruebas[i]);
      img.hidden = false;
    } else {
      img.hidden = true;
    }
  }
  botonDeFicha = opener ?? null;
  $('ficha').showModal();
  ponerFoco($('ficha-cerrar'));
}

// conFoco: devolver el foco al botón que lo abrió.
function cerrarFicha(conFoco = true) {
  if (!conFoco) botonDeFicha = null;
  if (fichaAbierta()) $('ficha').close();
}

$('ficha').addEventListener('close', () => {
  $('ficha-titulo').textContent = '';
  $('ficha-era').textContent = '';
  $('ficha-texto').textContent = '';
  $('ficha-texto').hidden = false;
  $('ficha-confesion-titulo').hidden = false;
  $('ficha-afirmacion').textContent = '';
  $('ficha-afirmacion').hidden = true;
  vaciarAclaracion($('ficha-aclaracion'), $('ficha-aclaracion-texto'), $('ficha-detalles'));
  const img = $('ficha-img');
  img.removeAttribute('src');
  img.alt = '';
  img.hidden = true;
  const boton = botonDeFicha;
  botonDeFicha = null;
  if (boton && boton.isConnected && !boton.closest('[hidden]')) ponerFoco(boton);
});

// ---- Bloqueo de copia en la afirmación (freno casual) [D-102] ----
for (const tipo of ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart']) {
  $('afirmacion').addEventListener(tipo, (ev) => ev.preventDefault());
}

// Bloqueo de copia también en el tablón de resultado (las 5 afirmaciones conviven ahí, ya contestadas).
for (const tipo of ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart']) {
  $('resultado-revision').addEventListener(tipo, (ev) => ev.preventDefault());
}

// ---- Resultado y ya jugado: cuenta atrás hasta medianoche ----
const esConCuentaAtras = (pantalla) => pantalla === 'ya-jugado' || pantalla === 'resultado';

function iniciarBucleMedianoche() {
  detenerBucleMedianoche();
  const enResultado = estado.pantalla === 'resultado';
  const tic = () => {
    const ahora = new Date();
    const tiempo = formatearCuentaAtras(msHastaMedianoche(ahora));
    if (enResultado) $('resultado-cuenta-atras').textContent = tiempo;
    else $('ya-jugado-cuenta-atras').textContent = rellenar(t().ya_jugado.proximo, { tiempo });
    if (hoy() !== fechaCarga) {
      bucleMedianoche = null;
      if (enResultado) {
        // La tabla de transiciones no procesa MEDIANOCHE en resultado: solo se ofrece el nuevo caso.
        $('resultado-proximo').hidden = true;
        $('resultado-nuevo-caso').hidden = false;
      } else {
        despachar({ tipo: 'MEDIANOCHE' });
      }
      return;
    }
    bucleMedianoche = setTimeout(tic, 1000);
  };
  tic();
}

function detenerBucleMedianoche() {
  if (bucleMedianoche !== null) {
    clearTimeout(bucleMedianoche);
    bucleMedianoche = null;
  }
}

// ---- Compartir ----
// La partida del reto mostrado; en resultado, la de la fecha en que empezó.
function partidaActual() {
  const reto = estado.reto;
  const fecha = estado.pantalla === 'resultado' ? estado.fecha : (estado.retos[reto].caso?.fecha ?? fechaCarga);
  const partida = partidaDe(datos, reto, fecha);
  return partida ? { ...partida, reto, fechaISO: fecha } : null;
}

function ocultarCompartirManual() {
  const area = $('compartir-manual');
  if (!area.hidden) area.hidden = true;
}

async function accionCompartir() {
  const partida = partidaActual();
  if (!partida || partida.estado !== 'terminada') return;
  const afirmaciones = partida.reto === 'afirmaciones';
  const mensaje = textoCompartir({
    plantilla: afirmaciones ? t().compartir.plantilla_afirmaciones : t().compartir.plantilla,
    n: partida.n,
    nombreModo: afirmaciones ? undefined : nombreModo(partida.modo),
    resultados: partida.resultados,
    racha: calcularRacha(datos.retos[partida.reto].partidas, partida.fechaISO),
    url: urlDelJuego()
  });
  const resultado = await compartir(mensaje);
  if (resultado === 'copiado') {
    const aviso = $('compartir-aviso');
    aviso.textContent = t().compartir.copiado;
    aviso.dataset.visible = 'si';
    clearTimeout(avisoCopiado);
    avisoCopiado = setTimeout(() => {
      aviso.dataset.visible = 'no';
      aviso.textContent = '';
    }, 2000);
  } else if (resultado === 'manual') {
    const area = $('compartir-manual');
    area.value = mensaje;
    area.hidden = false;
    area.focus();
    area.select();
  }
}

// ---- Entrada ----
const EVENTOS_ACCION = {
  siguiente: 'SIGUIENTE',
  reintentar: 'REINTENTAR',
  'volver-portada': 'VOLVER_PORTADA'
};

app.addEventListener('click', (e) => {
  const boton = e.target.closest('[data-voto], [data-accion]');
  if (!boton || !app.contains(boton)) return;
  const accion = boton.dataset.accion;
  if (accion === 'abrir-reto') {
    despachar({ tipo: 'ABRIR_RETO', reto: boton.dataset.retoBoton });
    return;
  }
  if (accion === 'idioma') {
    despachar({ tipo: 'CAMBIAR_IDIOMA', idioma: boton.dataset.idioma });
    return;
  }
  if (accion === 'empezar') {
    empezar();
    return;
  }
  if (accion === 'compartir') {
    if (estado.pantalla === 'resultado' || estado.pantalla === 'ya-jugado') accionCompartir();
    return;
  }
  if (accion === 'ver-ficha') {
    abrirFicha(Number(boton.dataset.prueba) - 1, true, boton);
    return;
  }
  if (accion === 'cerrar-ficha') {
    cerrarFicha(true);
    return;
  }
  if (boton.dataset.voto) {
    despachar({ tipo: 'VOTO', voto: boton.dataset.voto });
    return;
  }
  const tipo = EVENTOS_ACCION[accion];
  if (tipo) {
    const desde = estado.pantalla;
    despachar({ tipo });
    // Pasada la medianoche con el resultado o las instrucciones abiertos, la portada recarga el día nuevo [D-145].
    if (tipo === 'VOLVER_PORTADA' && (desde === 'resultado' || desde === 'instrucciones') && hoy() !== fechaCarga) {
      despachar({ tipo: 'MEDIANOCHE' });
    }
  }
});

app.addEventListener('change', (e) => {
  if (e.target.matches('input[name="modo"]')) {
    despachar({ tipo: 'ELEGIR_MODO', modo: e.target.value });
  } else if (modoPrueba && e.target.id === 'selector-prueba-dia') {
    location.assign('?prueba=1&dia=' + e.target.value);
  }
});

document.addEventListener('keydown', (e) => {
  // Con Ctrl, Alt o Meta no se trata ninguna tecla del juego (Ctrl+F y Ctrl+K son del navegador).
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
  if (fichaAbierta()) return; // con el diálogo abierto no hay atajos (Escape lo cierra de forma nativa)
  if (estado.pantalla === 'caso' && estado.fase === 'pregunta') {
    const voto = votoDeTecla(estado.reto, e.key, estado.idioma);
    if (voto !== null) despachar({ tipo: 'VOTO', voto });
  } else if (estado.pantalla === 'caso' && estado.fase === 'veredicto' && e.key === 'Enter') {
    const foco = document.activeElement;
    if (foco && foco.closest('button, a, summary')) return;
    e.preventDefault();
    despachar({ tipo: 'SIGUIENTE' });
  }
});

// Relee el almacén y reacciona, por reto, a lo que haya hecho otra pestaña [D-51, D-99].
function sincronizar() {
  const lectura = leer(almacenLocal);
  if (!lectura.disponible) return;
  datos = lectura.datos;
  const p = estado.pantalla;
  if (p === 'ya-jugado') {
    renderYaJugado();
    return;
  }
  if (!['cuenta-atras', 'caso', 'portada', 'instrucciones'].includes(p)) return;
  for (const reto of RETOS) {
    const actual = estado.retos[reto];
    if (!actual.caso) continue;
    const registro = partidaDe(datos, reto, actual.caso.fecha);
    if (!registro) continue;
    if (p === 'caso' && reto === estado.reto) {
      // Mi partida: solo cambia si otra pestaña la ha tomado o cerrado.
      if (registro.sesion !== sesion || (registro.estado === 'terminada' && !terminadaAqui)) {
        despachar({ tipo: 'OTRA_PESTANA', reto });
      }
    } else if (!actual.jugado) {
      despachar({ tipo: 'OTRA_PESTANA', reto });
    }
  }
  if (estado.pantalla === 'portada') renderPortada(estado);
}

// Pestaña oculta [D-78, D-115]. Images: sin efecto, el temporizador sigue por reloj.
// Fact or Fake: se apunta el inicio de la ausencia y se mide al volver, sin temporizadores.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    if (estado.pantalla === 'cuenta-atras') detenerCuentaAtras();
    if (
      ausencia === null &&
      estado.reto === 'afirmaciones' &&
      estado.pantalla === 'caso' &&
      estado.fase === 'pregunta' &&
      estado.activo
    ) {
      ausencia = { perf: performance.now(), fecha: Date.now(), indice: estado.indice };
    }
    return;
  }
  // Primero la ausencia (y su guardado); después, lo demás.
  if (ausencia !== null) {
    const inicio = ausencia;
    ausencia = null;
    const ocultoMs = medirOculta(inicio, { perf: performance.now(), fecha: Date.now() });
    despachar({ tipo: 'VOLVIO', ocultoMs, indice: inicio.indice });
  }
  if (['portada', 'instrucciones', 'ya-jugado', 'sin-casos'].includes(estado.pantalla) && hoy() !== fechaCarga) {
    despachar({ tipo: 'MEDIANOCHE' });
    return;
  }
  sincronizar();
  if (estado.pantalla === 'cuenta-atras') {
    iniciarCuentaAtras(); // se reinicia desde 3 [D-07, DP-29]
  } else if (temporizador && temporizador.activo()) {
    temporizador.comprobar(); // si el tiempo ya se agotó, sella en el acto
  }
});

if (!enMemoria) {
  window.addEventListener('storage', (e) => {
    if (e.key !== null && e.key !== CLAVE) return;
    sincronizar();
  });
}

// ---- Idioma [D-154] ----
// Si la URL lleva ?lang=, se actualiza para que recargar no deshaga la elección.
function ponerIdiomaEnUrl(idioma) {
  try {
    const url = new URL(location.href);
    if (!url.searchParams.has('lang')) return;
    url.searchParams.set('lang', idioma);
    history.replaceState(history.state, '', url);
  } catch {
    // sin historial: no pasa nada
  }
}

function rellenarTextos() {
  for (const el of document.querySelectorAll('[data-texto]')) {
    const valor = texto(el.dataset.texto);
    if (typeof valor === 'string') el.textContent = valor;
  }
  for (const el of document.querySelectorAll('[data-texto-aria]')) {
    const valor = texto(el.dataset.textoAria);
    if (typeof valor === 'string') el.setAttribute('aria-label', valor);
  }
}

// aria-pressed de las dos instancias del selector (portada e instrucciones).
function actualizarSelectorIdioma(idioma) {
  for (const boton of document.querySelectorAll('[data-accion="idioma"]')) {
    boton.setAttribute('aria-pressed', boton.dataset.idioma === idioma ? 'true' : 'false');
  }
}

// Todo lo que depende del idioma y no se repinta con la pantalla (la pantalla la repinta render).
function aplicarIdioma() {
  document.documentElement.lang = estado.idioma;
  rellenarTextos();
  actualizarSelectorIdioma(estado.idioma);
  pintarAvisosFecha();
  pintarSelectorPrueba();
}

// ---- Arranque ----
function arrancar() {
  const lectura = leerConRespaldo(almacenLocal, almacenSesion);
  datos = lectura.datos;
  marcarAlmacen(lectura.disponible);
  const { idioma, origen } = elegirIdioma({
    search: location.search,
    guardado: leerIdioma(almacenIdioma()),
    lenguas: navigator.languages ?? [navigator.language]
  });
  if (origen === 'url') guardarIdioma(almacenIdioma(), idioma);
  // estadoInicial valida modo, reto e idioma y usa los de por defecto si no valen.
  estado = estadoInicial({ modo: datos.ajustes.modo, reto: datos.ajustes.reto, idioma });
  // Los textos se pintan antes de mostrar ninguna pantalla: nunca se ven los del otro idioma.
  aplicarIdioma();
  app.dataset.modo = estado.modo;
  app.dataset.reto = estado.reto;
  mostrarPantalla('iniciando');
  app.dataset.pantalla = 'iniciando';
  cargarDia();
}

arrancar();
