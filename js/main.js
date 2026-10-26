// Punto de entrada: DOM, efectos y entrada del jugador. La lógica vive en los demás módulos.
import { TEXTOS } from './textos.js';
import {
  fechaLocal,
  formatearFecha,
  msHastaMedianoche,
  formatearCuentaAtras,
  casoDelDia,
  rutaPrueba,
  desofuscar,
  desofuscarFicha,
  cargarCalendario,
  precargar,
  fechaPrevisualizada,
  pruebaActiva,
  diasDePrueba,
  diaDePrueba
} from './diario.js';
import {
  MODOS,
  estadoInicial,
  transicion,
  contarAciertos,
  estadoDeCodigo,
  elegirVariante,
  mensajeFinal,
  recortarFicha
} from './juego.js';
import {
  CLAVE,
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

const PRUEBAS_ABIERTAS = true; // Modo prueba [D-71]: poner false antes del 2026-11-01.

// Previsualización local [D-68]: fecha fija y almacenes en memoria (undefined = los del navegador).
const fechaFija = fechaPrevisualizada(location.search, location.hostname);
// Modo prueba [D-70]: manda ?fecha= si es válido en un host local.
const modoPrueba = fechaFija === null && pruebaActiva(location.search, PRUEBAS_ABIERTAS);
const enMemoria = fechaFija !== null || modoPrueba;
const almacenLocal = enMemoria ? crearAlmacenMemoria() : undefined;
const almacenSesion = enMemoria ? crearAlmacenMemoria() : undefined;
let fechaPrueba = null;

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
let caso = null;
let fechaCarga = null; // fecha local con la que se cargó el caso
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

// Para el foco al cambiar de pantalla, fase o prueba.
let ultima = { pantalla: null, fase: null, indice: -1 };

function texto(ruta) {
  return ruta.split('.').reduce((o, k) => o?.[k], TEXTOS);
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
}

// Efectos que deben ocurrir antes de pintar nada (guardar la partida, elegir textos).
function antesDeRender(previo, nuevo, evento) {
  if (evento.tipo === 'ELEGIR_MODO') {
    aplicar((d) => conAjustes(d, { modo: nuevo.modo }));
  }
  if (evento.tipo === 'EMPEZAR') {
    $('como-jugar').open = false;
  }
  if (previo.fase !== 'veredicto' && nuevo.fase === 'veredicto') {
    const codigo = nuevo.resultados[nuevo.indice];
    aplicar((d) => registrarPrueba(d, nuevo.fecha, nuevo.indice, codigo, sesion));
    textoVeredicto = elegirVariante(TEXTOS.veredictos[estadoDeCodigo(codigo)]);
  }
  if (previo.pantalla === 'caso' && nuevo.pantalla === 'resultado') {
    // La partida cuenta para el día en que empezó, aunque acabe pasada la medianoche.
    aplicar((d) => registrarFin(d, nuevo.fecha, nuevo.fecha, sesion));
    terminadaAqui = true;
  }
}

// Efectos asíncronos o que dependen de que la pantalla ya esté pintada.
function despuesDeRender(previo, nuevo) {
  if (previo.pantalla === 'cuenta-atras' && nuevo.pantalla !== 'cuenta-atras') detenerCuentaAtras();
  if (previo.pantalla === 'ya-jugado' && nuevo.pantalla !== 'ya-jugado') detenerBucleMedianoche();
  if (nuevo.pantalla !== 'resultado' && nuevo.pantalla !== 'ya-jugado') ocultarCompartirManual();

  if (nuevo.pantalla === 'iniciando' && previo.pantalla !== 'iniciando') cargarDia();
  if (nuevo.pantalla === 'cargando' && previo.pantalla !== 'cargando') hacerPrecarga();
  if (nuevo.pantalla === 'cuenta-atras' && previo.pantalla !== 'cuenta-atras') iniciarCuentaAtras();
  if (nuevo.pantalla === 'ya-jugado' && previo.pantalla !== 'ya-jugado') iniciarBucleMedianoche();

  if (nuevo.fase === 'veredicto' && previo.fase !== 'veredicto') {
    if (temporizador) temporizador.detener();
  }
  if (previo.pantalla === 'caso' && nuevo.pantalla !== 'caso' && temporizador) temporizador.detener();

  if (nuevo.pantalla === 'caso' && nuevo.fase === 'pregunta') {
    const nuevaPrueba =
      previo.pantalla !== 'caso' || previo.fase !== 'pregunta' || previo.indice !== nuevo.indice;
    if (nuevaPrueba) iniciarPrueba();
  }
}

// ---- Carga del día ----
async function cargarDia() {
  try {
    const lectura = leerConRespaldo(almacenLocal, almacenSesion);
    if (lectura.disponible || lectura.respaldo) datos = lectura.datos;
    marcarAlmacen(lectura.disponible);
    calendario = await cargarCalendario();
    if (modoPrueba) prepararModoPrueba();
    const dia = hoy();
    fechaCarga = dia;
    caso = casoDelDia(calendario, dia);
    let partida = partidaDe(datos, dia);
    if (partida && partida.estado === 'en_curso') {
      aplicar((d) => cerrarAbandonada(d, dia, dia));
      partida = partidaDe(datos, dia);
    }
    despachar({ tipo: 'CARGADO', caso, partidaHoy: partida });
  } catch (e) {
    console.error(e);
    calendario = null;
    despachar({ tipo: 'ERROR_CALENDARIO' });
  }
}

// ---- Modo prueba [D-70] ----
function prepararModoPrueba() {
  const dias = diasDePrueba(calendario);
  const elegido = diaDePrueba(location.search, dias, fechaLocal(new Date()));
  fechaPrueba = elegido?.fecha ?? null;
  const aviso = $('aviso-previsualizacion');
  aviso.textContent = rellenar(TEXTOS.avisos.previsualizacion, { fecha: formatearFecha(hoy()) });
  aviso.hidden = false;
  if (elegido && !$('selector-prueba')) crearSelectorPrueba(dias, elegido);
}

function crearSelectorPrueba(dias, elegido) {
  const caja = document.createElement('div');
  caja.id = 'selector-prueba';
  const etiqueta = document.createElement('label');
  etiqueta.htmlFor = 'selector-prueba-dia';
  etiqueta.textContent = TEXTOS.prueba.etiqueta;
  const select = document.createElement('select');
  select.id = 'selector-prueba-dia';
  for (const d of dias) {
    const opcion = document.createElement('option');
    opcion.value = String(d.n);
    opcion.textContent = rellenar(TEXTOS.prueba.opcion, { n: d.n, tema: d.tema });
    if (d.n === elegido.n) opcion.selected = true;
    select.append(opcion);
  }
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'boton';
  boton.dataset.accion = 'abrir-prueba';
  boton.textContent = TEXTOS.prueba.boton;
  caja.append(etiqueta, select, boton);
  // Dentro de .portada-cabecera, justo después de #portada-tema.
  $('portada-tema').after(caja);
}

// ---- Precarga ----
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

// ---- Cuenta atrás inicial ----
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
  const fecha = caso.fecha;
  // El intento se consume aquí, releyendo el almacén: si otra pestaña ya había
  // empezado la partida, registrarInicio no cambia nada y la sesión no coincide.
  const miSesion = sesionAleatoria();
  aplicar((d) => registrarInicio(d, { fecha, n: caso.n, modo: estado.modo, sesion: miSesion }));
  if (partidaDe(datos, fecha)?.sesion !== miSesion) {
    despachar({ tipo: 'OTRA_PESTANA' });
    return;
  }
  sesion = miSesion;
  terminadaAqui = false;
  despachar({ tipo: 'FIN_CUENTA', fecha });
}

// ---- Una prueba ----
async function iniciarPrueba() {
  const mio = ++testigoPrueba;
  const indice = estado.indice;
  if (temporizador) temporizador.detener();
  temporizador = null;
  restablecerTemporizadorVisual();

  const img = imagenes[indice];
  img.className = 'prueba-img';
  img.alt = rellenar(TEXTOS.partida.alt_prueba, { i: indice + 1 });
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
          $('temporizador-anuncio').textContent = rellenar(TEXTOS.partida.quedan, { s });
        }
      }
    },
    alAgotar: () => {
      despachar({ tipo: 'AGOTADO' });
      // Sellado: se anuncia en normal y perro (en investigador no hay temporizador).
      if (estado.tapada && estado.pantalla === 'caso' && estado.indice === indice) {
        $('temporizador-anuncio').textContent = TEXTOS.partida.sobre_anuncio;
      }
    }
  });
  temporizador.iniciar();
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
  return TEXTOS.portada[`modo_${modo}`];
}

function renderCuadros(elemento, resultados, aciertos) {
  elemento.textContent = cuadros(resultados);
  elemento.setAttribute('aria-label', rellenar(TEXTOS.final.cuadros_etiqueta, { aciertos }));
}

function renderPortada(e) {
  $('portada-caso').textContent = e.n ? rellenar(TEXTOS.portada.etiqueta_caso, { n: e.n }) : '';
  $('portada-tema').textContent = e.tema ? rellenar(TEXTOS.portada.tema, { tema: e.tema }) : '';
  for (const radio of app.querySelectorAll('input[name="modo"]')) radio.checked = radio.value === e.modo;
  const racha = calcularRacha(datos.partidas, fechaCarga ?? hoy());
  const elRacha = $('portada-racha');
  elRacha.hidden = racha === 0;
  elRacha.textContent = racha === 0 ? '' : rellenar(TEXTOS.portada.racha, { racha });
}

function renderCaso(e) {
  const seccion = $('pantalla-caso');
  const sellada = e.fase === 'pregunta' && e.tapada;
  seccion.dataset.fase = e.fase ?? 'pregunta';
  seccion.dataset.tapada = sellada ? 'si' : 'no';
  // Sellado [D-90]: la imagen se oculta tras el sobre; en el veredicto vuelve a verse.
  const img = $('prueba-marco').querySelector('.prueba-img');
  if (img) img.hidden = sellada;
  $('prueba-sobre').hidden = !sellada;

  $('caso-tema').textContent = e.tema ? rellenar(TEXTOS.partida.caso_del_dia, { tema: e.tema }) : '';
  $('caso-etiqueta').textContent = rellenar(TEXTOS.partida.etiqueta_prueba, { i: e.indice + 1 });
  $('caso-marcador').textContent = rellenar(TEXTOS.partida.marcador, {
    aciertos: contarAciertos(e.resultados)
  });
  const veredicto = $('veredicto');
  const textoBoton = app.querySelector('[data-accion="siguiente"] .boton-texto');
  textoBoton.textContent = e.indice === 4 ? TEXTOS.partida.boton_ver_resultado : TEXTOS.partida.boton_siguiente;
  const confesion = $('veredicto-confesion-texto');
  const leerEntera = app.querySelector('[data-accion="leer-confesion"]');
  if (e.fase === 'veredicto') {
    const estadoPrueba = estadoDeCodigo(e.resultados[e.indice]);
    veredicto.hidden = false;
    veredicto.dataset.estado = estadoPrueba;
    $('veredicto-sello').textContent =
      e.revelada === 1 ? TEXTOS.partida.sello_generada : TEXTOS.partida.sello_autentica;
    $('veredicto-texto').textContent = textoVeredicto;
    // La ficha solo existe en el DOM a partir de aquí (ya respondida).
    if (typeof e.ficha === 'string') {
      const corte = recortarFicha(e.ficha);
      confesion.textContent = corte.texto;
      leerEntera.hidden = !corte.recortada;
    } else {
      confesion.textContent = TEXTOS.confesion.no_disponible;
      leerEntera.hidden = true;
    }
  } else {
    veredicto.hidden = true;
    veredicto.removeAttribute('data-estado');
    $('veredicto-sello').textContent = '';
    $('veredicto-texto').textContent = '';
    confesion.textContent = '';
    leerEntera.hidden = true;
  }
}

// Cinco miniaturas que abren la ficha. Se crean solo al llegar a resultado [D-89].
function crearMiniaturas(e) {
  const lista = $('resultado-revision');
  lista.replaceChildren();
  for (let i = 0; i < 5; i++) {
    const estadoPrueba = estadoDeCodigo(e.resultados[i]);
    const li = document.createElement('li');
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'miniatura';
    boton.dataset.accion = 'ver-ficha';
    boton.dataset.prueba = String(i + 1);
    boton.dataset.estado = estadoPrueba;
    boton.setAttribute('aria-haspopup', 'dialog');
    const img = document.createElement('img');
    img.src = rutaPrueba(e.pruebas[i]);
    img.alt = '';
    img.width = 1080;
    img.height = 1350;
    const lector = document.createElement('span');
    lector.className = 'solo-lectores';
    lector.textContent = rellenar(TEXTOS.final.estado_prueba, {
      i: i + 1,
      estado: TEXTOS.final.estados[estadoPrueba]
    });
    boton.append(img, lector);
    li.append(boton);
    lista.append(li);
  }
}

function renderResultado(e) {
  const aciertos = contarAciertos(e.resultados);
  $('resultado-aciertos').textContent = rellenar(TEXTOS.final.aciertos, { aciertos });
  $('resultado-mensaje').textContent = mensajeFinal(aciertos, TEXTOS.final.mensajes);
  $('resultado-racha').textContent = rellenar(TEXTOS.final.racha, { racha: datos.racha });
  $('resultado-mejor-racha').textContent = rellenar(TEXTOS.final.mejor_racha, { racha: datos.mejorRacha });
  crearMiniaturas(e);
}

function renderYaJugado() {
  const partida = partidaDe(datos, fechaCarga);
  if (!partida) return;
  const enCurso = partida.estado !== 'terminada';
  $('ya-jugado-texto').textContent = enCurso ? TEXTOS.avisos.otra_pestana : TEXTOS.ya_jugado.texto;
  for (const id of ['ya-jugado-aciertos', 'ya-jugado-modo', 'ya-jugado-cuadros', 'ya-jugado-racha']) {
    $(id).hidden = enCurso;
  }
  for (const b of $('pantalla-ya-jugado').querySelectorAll('[data-accion="compartir"]')) b.hidden = enCurso;
  if (enCurso) return;
  const aciertos = contarAciertos(partida.resultados);
  $('ya-jugado-aciertos').textContent = rellenar(TEXTOS.final.aciertos, { aciertos });
  $('ya-jugado-modo').textContent = rellenar(TEXTOS.ya_jugado.modo, { modo: nombreModo(partida.modo) });
  renderCuadros($('ya-jugado-cuadros'), partida.resultados, aciertos);
  $('ya-jugado-racha').textContent = rellenar(TEXTOS.final.racha, {
    racha: calcularRacha(datos.partidas, fechaCarga)
  });
}

function render(e) {
  mostrarPantalla(e.pantalla);
  app.dataset.pantalla = e.pantalla;
  app.dataset.modo = e.modo;

  if (e.pantalla === 'portada') renderPortada(e);
  if (e.pantalla === 'caso') renderCaso(e);
  if (e.pantalla === 'resultado') renderResultado(e);
  if (e.pantalla === 'ya-jugado') renderYaJugado();
  if (e.pantalla === 'error') $('error-texto').textContent = TEXTOS.errores[e.error];

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

// ---- Ficha (diálogo modal) [D-88, D-89] ----
function fichaAbierta() {
  return $('ficha').open;
}

// i: índice 0..4. Solo en caso/veredicto (prueba actual) o en resultado.
function abrirFicha(i, conImagen, opener) {
  const enVeredicto = estado.pantalla === 'caso' && estado.fase === 'veredicto';
  const enResultado = estado.pantalla === 'resultado';
  if (!enVeredicto && !enResultado) return;
  if (fichaAbierta()) return;
  if (enVeredicto) i = estado.indice;
  if (!Number.isInteger(i) || i < 0 || i > 4) return;

  let textoFicha;
  let verdad;
  if (enVeredicto) {
    textoFicha = estado.ficha;
    verdad = estado.revelada;
  } else {
    // Se descifra ahora y no se guarda en ningún sitio.
    textoFicha = Array.isArray(estado.fichas)
      ? desofuscarFicha(estado.fichas[i], estado.clave, estado.n, i)
      : null;
    verdad = desofuscar(estado.clave, estado.n, i);
  }
  const sello = verdad === 1 ? TEXTOS.partida.sello_generada : TEXTOS.partida.sello_autentica;
  $('ficha-titulo').textContent = rellenar(TEXTOS.final.estado_prueba, {
    i: i + 1,
    estado: TEXTOS.final.estados[estadoDeCodigo(estado.resultados[i])]
  });
  $('ficha-era').textContent = rellenar(TEXTOS.final.era, { sello });
  $('ficha-texto').textContent = typeof textoFicha === 'string' ? textoFicha : TEXTOS.confesion.no_disponible;
  const img = $('ficha-img');
  if (conImagen) {
    img.alt = rellenar(TEXTOS.final.alt_prueba, { n: i + 1 });
    img.src = rutaPrueba(estado.pruebas[i]);
    img.hidden = false;
  } else {
    img.hidden = true;
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
  const img = $('ficha-img');
  img.removeAttribute('src');
  img.alt = '';
  img.hidden = true;
  const boton = botonDeFicha;
  botonDeFicha = null;
  if (boton && boton.isConnected && !boton.closest('[hidden]')) ponerFoco(boton);
});

// ---- Ya jugado: cuenta atrás hasta medianoche ----
function iniciarBucleMedianoche() {
  detenerBucleMedianoche();
  const tic = () => {
    const ahora = new Date();
    $('ya-jugado-cuenta-atras').textContent = rellenar(TEXTOS.ya_jugado.proximo, {
      tiempo: formatearCuentaAtras(msHastaMedianoche(ahora))
    });
    if (hoy() !== fechaCarga) {
      bucleMedianoche = null;
      despachar({ tipo: 'MEDIANOCHE' });
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
function partidaActual() {
  const fecha = estado.pantalla === 'resultado' ? estado.fecha : fechaCarga;
  const partida = partidaDe(datos, fecha);
  return partida ? { ...partida, fechaISO: fecha } : null;
}

function ocultarCompartirManual() {
  const area = $('compartir-manual');
  if (!area.hidden) area.hidden = true;
}

async function accionCompartir() {
  const partida = partidaActual();
  if (!partida || partida.estado !== 'terminada') return;
  const mensaje = textoCompartir({
    plantilla: TEXTOS.compartir.plantilla,
    n: partida.n,
    nombreModo: nombreModo(partida.modo),
    resultados: partida.resultados,
    racha: calcularRacha(datos.partidas, partida.fechaISO),
    url: urlDelJuego()
  });
  const resultado = await compartir(mensaje);
  if (resultado === 'copiado') {
    const aviso = $('compartir-aviso');
    aviso.textContent = TEXTOS.compartir.copiado;
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
  empezar: 'EMPEZAR',
  siguiente: 'SIGUIENTE',
  compartir: 'COMPARTIR',
  reintentar: 'REINTENTAR'
};

app.addEventListener('click', (e) => {
  const boton = e.target.closest('[data-voto], [data-accion]');
  if (!boton || !app.contains(boton)) return;
  const accion = boton.dataset.accion;
  if (accion === 'abrir-prueba') {
    const select = $('selector-prueba-dia');
    if (modoPrueba && select) location.assign(`?prueba=1&dia=${select.value}`);
    return;
  }
  if (accion === 'leer-confesion') {
    abrirFicha(estado.indice, false, boton);
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
  if (!tipo) return;
  despachar({ tipo });
  if (tipo === 'COMPARTIR' && (estado.pantalla === 'resultado' || estado.pantalla === 'ya-jugado')) {
    accionCompartir();
  }
});

app.addEventListener('change', (e) => {
  if (e.target.matches('input[name="modo"]')) despachar({ tipo: 'ELEGIR_MODO', modo: e.target.value });
});

document.addEventListener('keydown', (e) => {
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
  if (fichaAbierta()) return; // con el diálogo abierto no hay atajos (Escape lo cierra de forma nativa)
  const tecla = e.key.toLowerCase();
  if (estado.pantalla === 'caso' && estado.fase === 'pregunta') {
    if (tecla === 'r') despachar({ tipo: 'VOTO', voto: 'autentica' });
    else if (tecla === 'i') despachar({ tipo: 'VOTO', voto: 'generada' });
  } else if (estado.pantalla === 'caso' && estado.fase === 'veredicto' && e.key === 'Enter') {
    const foco = document.activeElement;
    if (foco && foco.closest('button, a, summary')) return;
    e.preventDefault();
    despachar({ tipo: 'SIGUIENTE' });
  }
});

// Relee el almacén y reacciona a lo que haya hecho otra pestaña.
function sincronizar() {
  const lectura = leer(almacenLocal);
  if (!lectura.disponible) return;
  datos = lectura.datos;
  const p = estado.pantalla;
  if (p === 'ya-jugado') {
    renderYaJugado();
    return;
  }
  if (!['cuenta-atras', 'caso', 'portada'].includes(p) || !caso) return;
  const registro = partidaDe(datos, p === 'caso' ? estado.fecha : caso.fecha);
  if (!registro) return;
  if (p === 'caso') {
    if (registro.sesion !== sesion || (registro.estado === 'terminada' && !terminadaAqui)) {
      despachar({ tipo: 'OTRA_PESTANA' });
    }
  } else {
    despachar({ tipo: 'OTRA_PESTANA' });
  }
}

// Ocultar la pestaña no penaliza [D-78]: no se despacha nada y el temporizador sigue por reloj.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    if (estado.pantalla === 'cuenta-atras') detenerCuentaAtras();
    return;
  }
  if (['portada', 'ya-jugado', 'sin-casos'].includes(estado.pantalla) && hoy() !== fechaCarga) {
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

// ---- Arranque ----
function rellenarTextos() {
  for (const el of document.querySelectorAll('[data-texto]')) {
    const valor = texto(el.dataset.texto);
    if (typeof valor === 'string') el.textContent = valor;
  }
  const pasos = $('como-jugar-pasos');
  pasos.replaceChildren(
    ...TEXTOS.como_jugar.pasos.map((paso) => {
      const li = document.createElement('li');
      li.textContent = paso;
      return li;
    })
  );
}

function arrancar() {
  const lectura = leerConRespaldo(almacenLocal, almacenSesion);
  datos = lectura.datos;
  marcarAlmacen(lectura.disponible);
  // estadoInicial valida el modo (modoValido) y usa el de por defecto si no vale.
  estado = estadoInicial({ modo: datos.ajustes.modo });
  rellenarTextos();
  if (fechaFija) {
    const aviso = $('aviso-previsualizacion');
    aviso.textContent = rellenar(TEXTOS.avisos.previsualizacion, { fecha: formatearFecha(fechaFija) });
    aviso.hidden = false;
  }
  for (const radio of app.querySelectorAll('input[name="modo"]')) radio.checked = radio.value === estado.modo;
  app.dataset.modo = estado.modo;
  mostrarPantalla('iniciando');
  app.dataset.pantalla = 'iniciando';
  cargarDia();
}

arrancar();
