// Punto de entrada: DOM, efectos y entrada del jugador. La lógica vive en los demás módulos.
import { TEXTOS } from './textos.js';
import {
  fechaLocal,
  msHastaMedianoche,
  formatearCuentaAtras,
  casoDelDia,
  rutaPrueba,
  desofuscar,
  cargarCalendario,
  precargar
} from './diario.js';
import {
  MODOS,
  estadoInicial,
  transicion,
  contarAciertos,
  estadoDeCodigo,
  elegirVariante,
  mensajeFinal
} from './juego.js';
import {
  CLAVE,
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
  const r = actualizar(cambio, datos);
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
  render(nuevo);
  despuesDeRender(previo, nuevo, evento);
}

// Efectos que deben ocurrir antes de pintar nada (guardar la partida, elegir textos).
function antesDeRender(previo, nuevo, evento) {
  if (evento.tipo === 'ELEGIR_MODO') {
    aplicar((d) => conAjustes(d, { modo: nuevo.modo }));
  }
  if (evento.tipo === 'ENTENDIDO') {
    aplicar((d) => conAjustes(d, { vistoComoJugar: true }));
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
    const lectura = leerConRespaldo();
    if (lectura.disponible || lectura.respaldo) datos = lectura.datos;
    marcarAlmacen(lectura.disponible);
    calendario = await cargarCalendario();
    const hoy = fechaLocal(new Date());
    fechaCarga = hoy;
    caso = casoDelDia(calendario, hoy);
    let partida = partidaDe(datos, hoy);
    if (partida && partida.estado === 'en_curso') {
      aplicar((d) => cerrarAbandonada(d, hoy, hoy));
      partida = partidaDe(datos, hoy);
    }
    despachar({ tipo: 'CARGADO', caso, partidaHoy: partida });
  } catch (e) {
    console.error(e);
    calendario = null;
    despachar({ tipo: 'ERROR_CALENDARIO' });
  }
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
  restablecerTemporizadorVisual();

  const img = imagenes[indice];
  img.className = 'prueba-img';
  img.alt = rellenar(TEXTOS.partida.alt_prueba, { i: indice + 1 });
  img.width = 1080;
  img.height = 1350;
  $('prueba-marco').replaceChildren(img);

  await esperarPintado();
  if (mio !== testigoPrueba) return;
  if (estado.pantalla !== 'caso' || estado.fase !== 'pregunta' || estado.indice !== indice) return;

  despachar({ tipo: 'PINTADA' });
  if (!estado.activo) return;

  const anunciar = estado.modo !== 'dificil';
  let ultimoSegundo = null;
  temporizador = crearTemporizador({
    duracionMs: MODOS[estado.modo],
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
    alAgotar: () => despachar({ tipo: 'AGOTADO' })
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
  for (const radio of app.querySelectorAll('input[name="modo"]')) radio.checked = radio.value === e.modo;
  const racha = calcularRacha(datos.partidas, fechaCarga ?? fechaLocal(new Date()));
  const elRacha = $('portada-racha');
  elRacha.hidden = racha === 0;
  elRacha.textContent = racha === 0 ? '' : rellenar(TEXTOS.portada.racha, { racha });
}

function renderCaso(e) {
  const seccion = $('pantalla-caso');
  seccion.dataset.fase = e.fase ?? 'pregunta';
  $('caso-etiqueta').textContent = rellenar(TEXTOS.partida.etiqueta_prueba, { i: e.indice + 1 });
  $('caso-marcador').textContent = rellenar(TEXTOS.partida.marcador, {
    aciertos: contarAciertos(e.resultados)
  });
  const veredicto = $('veredicto');
  const boton = app.querySelector('[data-accion="siguiente"]');
  boton.textContent = e.indice === 4 ? TEXTOS.partida.boton_ver_resultado : TEXTOS.partida.boton_siguiente;
  if (e.fase === 'veredicto') {
    const estadoPrueba = estadoDeCodigo(e.resultados[e.indice]);
    veredicto.hidden = false;
    veredicto.dataset.estado = estadoPrueba;
    $('veredicto-sello').textContent =
      e.revelada === 1 ? TEXTOS.partida.sello_generada : TEXTOS.partida.sello_autentica;
    $('veredicto-texto').textContent = textoVeredicto;
  } else {
    veredicto.hidden = true;
    veredicto.removeAttribute('data-estado');
    $('veredicto-sello').textContent = '';
    $('veredicto-texto').textContent = '';
  }
}

function crearRevision(e) {
  const lista = $('resultado-revision');
  lista.replaceChildren();
  for (let i = 0; i < 5; i++) {
    const estadoPrueba = estadoDeCodigo(e.resultados[i]);
    const li = document.createElement('li');
    li.dataset.estado = estadoPrueba;
    const img = document.createElement('img');
    img.src = rutaPrueba(e.pruebas[i]);
    img.alt = rellenar(TEXTOS.final.alt_prueba, { n: i + 1 });
    img.width = 1080;
    img.height = 1350;
    const lector = document.createElement('span');
    lector.className = 'solo-lectores';
    lector.textContent = rellenar(TEXTOS.final.estado_prueba, {
      i: i + 1,
      estado: TEXTOS.final.estados[estadoPrueba]
    });
    const era = document.createElement('span');
    era.className = 'revision-era';
    const sello =
      desofuscar(e.clave, e.n, i) === 1 ? TEXTOS.partida.sello_generada : TEXTOS.partida.sello_autentica;
    era.textContent = rellenar(TEXTOS.final.era, { sello });
    li.append(img, lector, era);
    lista.append(li);
  }
}

function renderResultado(e) {
  const aciertos = contarAciertos(e.resultados);
  $('resultado-aciertos').textContent = rellenar(TEXTOS.final.aciertos, { aciertos });
  $('resultado-mensaje').textContent = mensajeFinal(aciertos, TEXTOS.final.mensajes);
  renderCuadros($('resultado-cuadros'), e.resultados, aciertos);
  $('resultado-racha').textContent = rellenar(TEXTOS.final.racha, { racha: datos.racha });
  $('resultado-mejor-racha').textContent = rellenar(TEXTOS.final.mejor_racha, { racha: datos.mejorRacha });
  crearRevision(e);
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

// ---- Ya jugado: cuenta atrás hasta medianoche ----
function iniciarBucleMedianoche() {
  detenerBucleMedianoche();
  const tic = () => {
    const ahora = new Date();
    $('ya-jugado-cuenta-atras').textContent = rellenar(TEXTOS.ya_jugado.proximo, {
      tiempo: formatearCuentaAtras(msHastaMedianoche(ahora))
    });
    if (fechaLocal(ahora) !== fechaCarga) {
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
  'como-jugar': 'VER_COMO_JUGAR',
  entendido: 'ENTENDIDO',
  siguiente: 'SIGUIENTE',
  compartir: 'COMPARTIR',
  reintentar: 'REINTENTAR'
};

app.addEventListener('click', (e) => {
  const boton = e.target.closest('[data-voto], [data-accion]');
  if (!boton || !app.contains(boton)) return;
  if (boton.dataset.voto) {
    despachar({ tipo: 'VOTO', voto: boton.dataset.voto });
    return;
  }
  const tipo = EVENTOS_ACCION[boton.dataset.accion];
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
  const tecla = e.key.toLowerCase();
  if (estado.pantalla === 'caso' && estado.fase === 'pregunta') {
    if (tecla === 'r') despachar({ tipo: 'VOTO', voto: 'autentica' });
    else if (tecla === 'i') despachar({ tipo: 'VOTO', voto: 'generada' });
  } else if (estado.pantalla === 'caso' && estado.fase === 'veredicto' && e.key === 'Enter') {
    const foco = document.activeElement;
    if (foco && foco.closest('button, a')) return;
    e.preventDefault();
    despachar({ tipo: 'SIGUIENTE' });
  }
});

// Relee el almacén y reacciona a lo que haya hecho otra pestaña.
function sincronizar() {
  const lectura = leer();
  if (!lectura.disponible) return;
  datos = lectura.datos;
  const p = estado.pantalla;
  if (p === 'ya-jugado') {
    renderYaJugado();
    return;
  }
  if (!['cuenta-atras', 'caso', 'portada', 'como-jugar'].includes(p) || !caso) return;
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

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    if (estado.pantalla === 'cuenta-atras') detenerCuentaAtras();
    despachar({ tipo: 'OCULTA' });
    return;
  }
  if (['portada', 'ya-jugado', 'sin-casos'].includes(estado.pantalla) && fechaLocal(new Date()) !== fechaCarga) {
    despachar({ tipo: 'MEDIANOCHE' });
    return;
  }
  sincronizar();
  if (estado.pantalla === 'cuenta-atras') iniciarCuentaAtras();
});

window.addEventListener('storage', (e) => {
  if (e.key !== null && e.key !== CLAVE) return;
  sincronizar();
});

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
  const lectura = leerConRespaldo();
  datos = lectura.datos;
  marcarAlmacen(lectura.disponible);
  estado = estadoInicial({
    modo: datos.ajustes.modo,
    vistoComoJugar: datos.ajustes.vistoComoJugar
  });
  rellenarTextos();
  for (const radio of app.querySelectorAll('input[name="modo"]')) radio.checked = radio.value === estado.modo;
  app.dataset.modo = estado.modo;
  mostrarPantalla('iniciando');
  app.dataset.pantalla = 'iniciando';
  cargarDia();
}

arrancar();
