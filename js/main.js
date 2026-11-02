// Punto de entrada: DOM, efectos y entrada del jugador. La lógica vive en los demás módulos.
import { TEXTOS, RUTAS } from './textos.js';
import {
  fechaMadrid,
  formatearFecha,
  idiomaValido,
  urlDeIdioma,
  decidirLangEnPagina,
  debeNoIndexar,
  desdeRaiz,
  temaDelDia,
  msHastaMedianocheMadrid,
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
  diaDePrueba,
  casoPedido,
  listaDeCasos,
  urlConCaso
} from './diario.js';
import {
  MODOS,
  RETOS,
  estadoInicial,
  transicion,
  estadoEnLista,
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
  calcularRacha,
  leerArchivo,
  leerArchivoConRespaldo,
  actualizarArchivo,
  terminarSinRacha,
  cerrarAbandonadaArchivo,
  partidaDeCaso,
  CLAVE_ARCHIVO
} from './almacen.js';
import {
  crearTemporizador,
  esperarPintado,
  nivelTemporizador,
  segundosRestantes
} from './temporizador.js';
import { rellenar, cuadros, textoCompartir, urlDelJuego, urlDeCaso, compartir } from './compartir.js';

const PRUEBAS_ABIERTAS = false; // Modo prueba [D-71]: poner false antes de la fecha de lanzamiento.
const ANUNCIOS_ACTIVOS = false; // Anuncios [D-182, 10.13]: hoy solo hay un hueco vacío (hidden); validar falla si vale true. Con false main.js no toca los huecos de anuncio.

// Carpeta que contiene js/ (la raíz del sitio): data/, casos/ e img/ se resuelven desde aquí, sin etiqueta base [10.4.2].
const RAIZ = new URL('../', import.meta.url);
const deRaiz = (ruta) => desdeRaiz(ruta, RAIZ);

// Previsualización local [D-68]: fecha fija y almacenes en memoria (undefined = los del navegador).
const fechaFija = fechaPrevisualizada(location.search, location.hostname);
// Modo prueba [D-70]: manda ?fecha=, si es válido en un host local, sobre ?prueba=1.
const modoPrueba = fechaFija === null && pruebaActiva(location.search, PRUEBAS_ABIERTAS);
const enMemoria = fechaFija !== null || modoPrueba;
const almacenLocal = enMemoria ? crearAlmacenMemoria() : undefined;
const almacenSesion = enMemoria ? crearAlmacenMemoria() : undefined;
let fechaPrueba = null;

// Fecha efectiva: previsualización, día elegido en modo prueba o fecha de Madrid [11.3].
function hoy() {
  return fechaFija ?? fechaPrueba ?? fechaMadrid(new Date());
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
let datosArchivo = null; // identifaiit.archivo.v1: partidas de casos anteriores [12.7]
let nHoy = null; // número del caso de hoy (null sin lanzamiento)
let nPedido = null; // caso anterior abierto (null = hoy) [12.3]
let mesCargado = null; // archivo mensual de Fact or Fake cargado (para la lista)
let cargaId = 0; // descarta cargas antiguas si se pide otro caso mientras se carga
let historialListo = false;

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

// Aplica un cambio al almacén de los casos anteriores (nunca toca identifaiit.v3).
function aplicarArchivo(cambio) {
  const r = actualizarArchivo(cambio, datosArchivo, almacenLocal, almacenSesion);
  datosArchivo = r.datos;
  marcarAlmacen(r.guardado);
}

// Guarda en el almacén que toca: el del archivo en modo archivo, identifaiit.v3 si no.
function aplicarSegun(archivo, cambio) {
  if (archivo) aplicarArchivo(cambio);
  else aplicar(cambio);
}

// Partida guardada de un caso, según el modo (en modo archivo cuenta también la jugada en su día).
function partidaGuardada(archivo, reto, fecha) {
  if (archivo) return partidaDeCaso(datos, datosArchivo, reto, fecha)?.partida ?? null;
  return partidaDe(datos, reto, fecha);
}

// Partida para mostrar: una de identifaiit.v3 de un día pasado sin cerrar cuenta como jugada, con sus pendientes en fallo.
function partidaVista(reto, fecha) {
  if (!estado.archivo) return partidaDe(datos, reto, fecha);
  const pc = partidaDeCaso(datos, datosArchivo, reto, fecha);
  if (!pc) return null;
  const p = pc.partida;
  if (pc.origen === 'dia' && p.estado === 'en_curso') {
    return { ...p, estado: 'terminada', resultados: p.resultados.replaceAll('-', 'F') };
  }
  return p;
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
  // La lista de casos solo existe sobre la portada: cualquier otro contexto la cierra antes de pintar.
  if (casosAbiertos() && nuevo.pantalla !== 'portada') cerrarCasos(false);
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
    cambiarDireccion(nuevo.idioma);
    aplicarIdioma();
  }
  if (previo.fase !== 'veredicto' && nuevo.fase === 'veredicto') {
    const codigo = nuevo.resultados[nuevo.indice];
    aplicarSegun(nuevo.archivo, (d) => registrarPrueba(d, nuevo.reto, nuevo.fecha, nuevo.indice, codigo, sesion));
    textoVeredicto =
      nuevo.motivo === 'oculta'
        ? elegirVariante(t().afirmaciones.oculta)
        : elegirVariante(t().veredictos[estadoDeCodigo(codigo)]);
  }
  if (previo.pantalla === 'caso' && nuevo.pantalla === 'resultado') {
    // La partida cuenta para el día en que empezó, aunque acabe pasada la medianoche.
    if (nuevo.archivo) aplicarArchivo((d) => terminarSinRacha(d, nuevo.reto, nuevo.fecha, sesion));
    else aplicar((d) => registrarFin(d, nuevo.reto, nuevo.fecha, nuevo.fecha, sesion));
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
  const mio = ++cargaId;
  try {
    const lectura = leerConRespaldo(almacenLocal, almacenSesion);
    if (lectura.disponible || lectura.respaldo) datos = lectura.datos;
    marcarAlmacen(lectura.disponible);
    const lecturaArchivo = leerArchivoConRespaldo(almacenLocal, almacenSesion);
    datosArchivo = lecturaArchivo.disponible || lecturaArchivo.respaldo ? lecturaArchivo.datos : (datosArchivo ?? lecturaArchivo.datos);

    let casoImagenes = null;
    let casoAfirmaciones = null;
    let dia = null;
    let n = null; // caso anterior que se juega (null = hoy)
    if (modoPrueba) {
      calendario = await cargarCalendario(deRaiz('data/calendario.json'));
      const meses = await cargarAfirmacionesPrueba(calendario.lanzamiento, undefined, RAIZ);
      const dias = diasDePrueba(calendario, meses);
      const nHoyPrueba = numeroDelDia(fechaMadrid(new Date()), calendario.lanzamiento);
      const elegido = diaDePrueba(location.search, dias, nHoyPrueba);
      fechaPrueba = elegido ? fechaDelDia(calendario.lanzamiento ?? FECHA_BASE_PRUEBA, elegido.n) : null;
      dia = hoy();
      if (elegido) {
        casoImagenes = casoDeNumero(calendario, elegido.n);
        const mes = afirmacionesDelMes(meses, mesDeNumero(calendario.lanzamiento, elegido.n));
        casoAfirmaciones = afirmacionesDeNumero(mes, calendario.lanzamiento, elegido.n);
      }
      nHoy = null;
      mesCargado = null;
      prepararModoPrueba(dias, elegido);
    } else {
      dia = hoy();
      // Hoy: calendario y mes en paralelo. Caso anterior: primero el calendario, después el mes de ese caso [12.2.2].
      const peticionCal = cargarCalendario(deRaiz('data/calendario.json'));
      const peticionMes = nPedido === null ? cargarAfirmaciones(dia, undefined, RAIZ) : null;
      let cal;
      let mes = null;
      if (peticionMes) [cal, mes] = await Promise.all([peticionCal, peticionMes]);
      else cal = await peticionCal;
      if (mio !== cargaId) return;
      calendario = cal;
      nHoy = numeroDelDia(dia, cal.lanzamiento);
      // Solo se puede abrir un día ya terminado (n < nHoy); si no vale, se juega hoy [12.3].
      n = nPedido !== null && nHoy !== null && nPedido < nHoy ? nPedido : null;
      if (n !== null) {
        mes = await cargarAfirmaciones(fechaDelDia(cal.lanzamiento, n), undefined, RAIZ);
        if (mio !== cargaId) return;
        casoImagenes = casoDeNumero(cal, n);
        casoAfirmaciones = afirmacionesDeNumero(mes, cal.lanzamiento, n);
        if (!casoImagenes && !casoAfirmaciones) {
          n = null;
          casoImagenes = null;
          casoAfirmaciones = null;
          mes = null;
        }
      }
      if (n === null) {
        if (!mes) mes = await cargarAfirmaciones(dia, undefined, RAIZ);
        if (mio !== cargaId) return;
        casoImagenes = casoDelDia(cal, dia);
        casoAfirmaciones = afirmacionesDelDia(mes, cal.lanzamiento, dia);
      }
      mesCargado = mes;
      nPedido = n;
      prepararHistorial();
    }
    fechaCarga = dia;

    const archivo = n !== null;
    const casos = { imagenes: casoImagenes, afirmaciones: casoAfirmaciones };
    const retos = {};
    for (const reto of RETOS) {
      const caso = casos[reto];
      if (caso) {
        // Partida abandonada: las pruebas pendientes cuentan como fallo [D-79].
        if (archivo) {
          const pc = partidaDeCaso(datos, datosArchivo, reto, caso.fecha);
          // Una partida de identifaiit.v3 de un día pasado nunca se toca desde el modo archivo.
          if (pc?.origen === 'archivo' && pc.partida.estado === 'en_curso') {
            aplicarArchivo((d) => cerrarAbandonadaArchivo(d, reto, caso.fecha));
          }
        } else {
          const pendiente = partidaDe(datos, reto, caso.fecha);
          if (pendiente && pendiente.estado === 'en_curso') {
            aplicar((d) => cerrarAbandonada(d, reto, caso.fecha, caso.fecha));
          }
        }
      }
      retos[reto] = {
        caso,
        jugado: !caso
          ? false
          : archivo
            ? partidaDeCaso(datos, datosArchivo, reto, caso.fecha) !== null
            : partidaDe(datos, reto, caso.fecha)?.estado === 'terminada'
      };
    }
    despachar({ tipo: 'CARGADO', retos, reto: estado.reto, archivo });
  } catch (e) {
    if (mio !== cargaId) return;
    console.error(e);
    calendario = null;
    despachar({ tipo: 'ERROR_CALENDARIO' });
  }
}

// ---- Historial y dirección de los casos anteriores [12.9, D-232] ----
// Dirección del juego en el idioma activo, con ?caso=n (o sin él con null).
function direccion(n) {
  const base = urlDeIdioma(location.href, estado.idioma) ?? location.href;
  return urlConCaso(base, n) ?? base;
}

function historia(accion, n) {
  try {
    history[accion]({ caso: n }, '', direccion(n));
  } catch {
    // sin historial: no pasa nada
  }
}

// Una vez, tras la primera carga: deja el historial como [hoy, caso] si se entra con ?caso=N válido,
// y quita ?caso= de la dirección si no vale (también en cargas posteriores).
function prepararHistorial() {
  const traeCaso = new URLSearchParams(location.search).has('caso');
  if (!historialListo) {
    historialListo = true;
    if (nPedido !== null) {
      historia('replaceState', null);
      historia('pushState', nPedido);
    } else if (traeCaso) {
      historia('replaceState', null);
    } else {
      try {
        history.replaceState({ caso: null }, '', location.href);
      } catch {
        // sin historial
      }
    }
  } else if (nPedido === null && traeCaso) {
    historia('replaceState', null);
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
    const lista = await precargar(estado.pruebas, undefined, RAIZ);
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
  aplicarSegun(estado.archivo, (d) => registrarInicio(d, 'imagenes', { fecha, n: caso.n, modo: estado.modo, sesion: miSesion }));
  if (partidaGuardada(estado.archivo, 'imagenes', fecha)?.sesion !== miSesion) {
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
    aplicarSegun(estado.archivo, (d) => registrarInicio(d, 'afirmaciones', { fecha, n: caso.n, modo: null, sesion: miSesion }));
    if (partidaGuardada(estado.archivo, 'afirmaciones', fecha)?.sesion !== miSesion) {
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
  if (!caso) return e.archivo ? t().portada.estado_sin_caso_archivo : t().portada.estado_sin_caso;
  const partida = partidaVista(reto, caso.fecha);
  if (partida?.estado === 'terminada') {
    return rellenar(t().portada.estado_jugado, { aciertos: contarAciertos(partida.resultados) });
  }
  if (partida?.estado === 'en_curso' || jugado) return t().portada.estado_en_curso;
  return '';
}

// Tema del caso elegido en el idioma activo ('' sin caso).
function temaActual(e) {
  return e.tema?.[e.idioma] ?? '';
}

// Aviso de caso del archivo y "volver a hoy" [12.5.1]; solo en modo archivo.
function pintarAvisoArchivo(e) {
  const aviso = $('portada-archivo');
  if (!aviso) return;
  const fecha = e.archivo && calendario ? fechaDelDia(calendario.lanzamiento, e.n) : null;
  aviso.hidden = !(e.archivo && fecha);
  $('portada-archivo-texto').textContent = fecha
    ? rellenar(t().casos.aviso, { fecha: formatearFecha(fecha, e.idioma) })
    : '';
}

function renderPortada(e) {
  const caso = poner('portada-caso', e.n ? rellenar(t().portada.etiqueta_caso, { n: e.n }) : '');
  if (caso) caso.hidden = !e.n;
  const tema = poner('portada-tema', temaActual(e));
  if (tema) tema.hidden = modoPrueba || !e.n;
  $('portada-dia-boton').hidden = modoPrueba;
  pintarAvisoArchivo(e);
  for (const reto of RETOS) {
    poner(`reto-${reto}-estado`, estadoDeReto(e, reto));
    const tarjeta = app.querySelector(`#pantalla-portada [data-reto-boton="${reto}"]`);
    if (tarjeta) tarjeta.disabled = !e.retos[reto].caso;
  }
  pintarSelectorPrueba();
}

function renderInstrucciones(e) {
  const imagenes = e.reto === 'imagenes';
  const membrete = e.archivo ? t().instrucciones.membrete_archivo : t().instrucciones.membrete;
  poner('instrucciones-membrete', rellenar(membrete, { n: e.n ?? '', tema: temaActual(e) }));
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
  $('caso-tema').textContent = temaActual(e)
    ? rellenar(e.archivo ? t().partida.caso_archivo : t().partida.caso_del_dia, { tema: temaActual(e) })
    : '';
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
      img.src = deRaiz(rutaPrueba(e.pruebas[i]));
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
    rellenar(e.archivo ? t().casos.etiqueta_archivo : t().portada.etiqueta_caso, { n: e.n }),
    temaActual(e),
    afirmaciones ? '' : nombreModo(e.modo)
  ]);
  $('resultado-aciertos').textContent = rellenar(t().final.aciertos, { aciertos });
  $('resultado-mensaje').textContent = mensajeFinal(aciertos, mensajesDelReto(e.reto, t().final));
  $('resultado-racha').textContent = String(retoDatos.racha);
  $('resultado-mejor-racha').textContent = String(retoDatos.mejorRacha);
  // Modo archivo: sin racha, sin cuenta atrás y sin aviso de nuevo caso [12.5.4].
  $('resultado-racha').closest('.cifra').hidden = e.archivo;
  $('resultado-mejor-racha').closest('.cifra').hidden = e.archivo;
  $('resultado-archivo').hidden = !e.archivo;
  $('resultado-proximo').hidden = e.archivo;
  $('resultado-nuevo-caso').hidden = true;
  crearMiniaturas(e);
}

function renderYaJugado() {
  const reto = estado.reto;
  const fecha = estado.retos[reto].caso?.fecha ?? fechaCarga;
  const partida = partidaVista(reto, fecha);
  if (!partida) return;
  const archivo = estado.archivo;
  const enCurso = partida.estado !== 'terminada';
  $('ya-jugado-reto').textContent = archivo
    ? etiquetaResultado([nombreReto(reto), rellenar(t().casos.etiqueta_archivo, { n: partida.n })])
    : rellenar(t().final.reto, { reto: nombreReto(reto), n: partida.n });
  $('ya-jugado-texto').textContent = enCurso ? t().avisos.otra_pestana : archivo ? t().ya_jugado.texto_archivo : t().ya_jugado.texto;
  for (const id of ['ya-jugado-aciertos', 'ya-jugado-modo', 'ya-jugado-cuadros', 'ya-jugado-racha']) {
    $(id).hidden = enCurso || (archivo && id === 'ya-jugado-racha');
  }
  $('ya-jugado-archivo').hidden = !archivo || enCurso;
  $('ya-jugado-cuenta-atras').hidden = archivo;
  for (const b of $('pantalla-ya-jugado').querySelectorAll('[data-accion="compartir"]')) b.hidden = enCurso;
  if (enCurso) return;
  const aciertos = contarAciertos(partida.resultados);
  $('ya-jugado-aciertos').textContent = rellenar(t().final.aciertos, { aciertos });
  // El modo solo existe en Images.
  const modo = $('ya-jugado-modo');
  modo.hidden = reto === 'afirmaciones';
  modo.textContent = reto === 'afirmaciones' ? '' : rellenar(t().ya_jugado.modo, { modo: nombreModo(partida.modo) });
  renderCuadros($('ya-jugado-cuadros'), partida.resultados, aciertos);
  if (!archivo) {
    $('ya-jugado-racha').textContent = rellenar(t().final.racha, {
      racha: calcularRacha(datos.retos[reto].partidas, fecha)
    });
  }
}

function render(e) {
  actualizarRobots(e);
  mostrarPantalla(e.pantalla);
  app.dataset.pantalla = e.pantalla;
  app.dataset.reto = e.reto;
  app.dataset.modo = e.modo;
  app.dataset.archivo = e.archivo ? 'si' : 'no';
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
      img.src = deRaiz(rutaPrueba(estado.pruebas[i]));
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
  // Modo archivo: sin cuenta atrás [D-233]; el vigía se ocupa de la medianoche en ya-jugado.
  if (estado.archivo) return;
  const enResultado = estado.pantalla === 'resultado';
  const tic = () => {
    const ahora = new Date();
    const tiempo = formatearCuentaAtras(msHastaMedianocheMadrid(ahora));
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

// Vigía de medianoche [11.4]: un único temporizador que revisa el día aunque no haya cuenta atrás.
let vigia = null;

function revisarDia() {
  if (fechaFija === null && fechaPrueba === null && fechaCarga !== null && hoy() !== fechaCarga) {
    const p = estado.pantalla;
    if (['portada', 'instrucciones', 'ya-jugado', 'sin-casos'].includes(p)) {
      despachar({ tipo: 'MEDIANOCHE' });
    } else if (p === 'resultado' && !estado.archivo) {
      $('resultado-proximo').hidden = true;
      $('resultado-nuevo-caso').hidden = false;
    }
    // cargando, cuenta-atras, caso y error: la partida termina con sus datos.
  }
  armarVigia();
}

function armarVigia() {
  clearTimeout(vigia);
  vigia = setTimeout(revisarDia, Math.min(msHastaMedianocheMadrid(new Date()) + 250, 60000));
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
  const partida = partidaVista(reto, fecha);
  if (!partida) return null;
  const origen = estado.archivo ? (partidaDeCaso(datos, datosArchivo, reto, fecha)?.origen ?? 'archivo') : 'dia';
  return { ...partida, reto, fechaISO: fecha, origen };
}

function ocultarCompartirManual() {
  const area = $('compartir-manual');
  if (!area.hidden) area.hidden = true;
}

async function accionCompartir() {
  const partida = partidaActual();
  if (!partida || partida.estado !== 'terminada') return;
  const afirmaciones = partida.reto === 'afirmaciones';
  // Caso anterior jugado desde el archivo: plantilla "(archive)", sin racha y con ?caso=N [12.8].
  const deArchivo = partida.origen === 'archivo';
  const g = t().compartir;
  const plantilla = deArchivo
    ? afirmaciones
      ? g.plantilla_afirmaciones_archivo
      : g.plantilla_archivo
    : afirmaciones
      ? g.plantilla_afirmaciones
      : g.plantilla;
  const mensaje = textoCompartir({
    plantilla,
    n: partida.n,
    nombreModo: afirmaciones ? undefined : nombreModo(partida.modo),
    resultados: partida.resultados,
    racha: deArchivo ? 0 : calcularRacha(datos.retos[partida.reto].partidas, partida.fechaISO),
    // desde /es/ o /en/ da la dirección del idioma, sin ?lang= ni ?prueba= [DP-81]
    url: deArchivo ? urlDeCaso(urlDelJuego(), partida.n) : urlDelJuego()
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
  if (accion === 'abrir-casos') {
    abrirCasos();
    return;
  }
  if (accion === 'cerrar-casos') {
    cerrarCasos(true);
    return;
  }
  if (accion === 'elegir-caso') {
    elegirCaso(Number(boton.dataset.caso));
    return;
  }
  if (accion === 'volver-hoy') {
    elegirCaso(nHoy);
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
  if (fichaAbierta() || casosAbiertos()) return; // con un diálogo abierto no hay atajos (Escape lo cierra de forma nativa)
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
  const lecturaArchivo = leerArchivo(almacenLocal);
  if (lecturaArchivo.disponible) datosArchivo = lecturaArchivo.datos;
  const p = estado.pantalla;
  if (p === 'ya-jugado') {
    renderYaJugado();
    return;
  }
  if (!['cuenta-atras', 'caso', 'portada', 'instrucciones'].includes(p)) return;
  for (const reto of RETOS) {
    const actual = estado.retos[reto];
    if (!actual.caso) continue;
    const registro = partidaGuardada(estado.archivo, reto, actual.caso.fecha);
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
    if (e.key !== null && e.key !== CLAVE && e.key !== CLAVE_ARCHIVO) return;
    sincronizar();
  });
}

// ---- Lista de casos: dialog#casos [12.5.2] ----
let focoAlCerrarCasos = true;

function casosAbiertos() {
  return $('casos').open;
}

function textoEstadoLista(situacion, aciertos) {
  const c = t().casos;
  if (situacion === 'jugado') return rellenar(c.estado_jugado, { aciertos });
  if (situacion === 'curso') return c.estado_en_curso;
  if (situacion === 'sin-caso') return c.estado_sin_caso;
  return c.estado_sin_jugar;
}

// Estado de un reto en una fila: lo guardado manda; sin partida, depende de si ese día tiene caso.
function situacionDeFila(fila, reto) {
  const disponible = reto === 'imagenes' ? fila.imagenes : fila.afirmaciones;
  const dia = partidaDe(datos, reto, fila.fecha);
  const archivo = partidaDe(datosArchivo, reto, fila.fecha);
  const lista = estadoEnLista(dia, archivo);
  let situacion = lista.situacion;
  // Hoy en curso en identifaiit.v3 sigue en curso (solo los días pasados cuentan como jugados).
  if (fila.hoy && dia?.estado === 'en_curso') situacion = 'curso';
  if (situacion === 'pendiente' && disponible === false) situacion = 'sin-caso';
  return { situacion, aciertos: lista.aciertos };
}

function crearFila(fila) {
  const li = document.createElement('li');
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'caso-fila';
  boton.dataset.accion = 'elegir-caso';
  boton.dataset.caso = String(fila.n);
  if (fila.n === (nPedido ?? nHoy)) boton.setAttribute('aria-current', 'true');
  const cabecera = crearSpan('caso-fila-cabecera', undefined, false);
  cabecera.append(crearSpan('caso-fila-numero', rellenar(t().portada.etiqueta_caso, { n: fila.n }), false));
  if (fila.hoy) cabecera.append(crearSpan('caso-fila-hoy', t().casos.hoy, false));
  cabecera.append(crearSpan('caso-fila-fecha', formatearFecha(fila.fecha, estado.idioma), false));
  const tema = crearSpan('caso-fila-tema', fila.tema?.[estado.idioma] ?? '', false);
  if (!fila.tema) tema.hidden = true;
  const estados = crearSpan('caso-fila-estados', undefined, false);
  for (const reto of RETOS) {
    const { situacion, aciertos } = situacionDeFila(fila, reto);
    const span = crearSpan(
      'caso-fila-estado',
      rellenar(t().casos.estado_reto, { reto: nombreReto(reto), estado: textoEstadoLista(situacion, aciertos) }),
      false
    );
    span.dataset.retoFila = reto;
    span.dataset.situacion = situacion;
    estados.append(span);
  }
  boton.append(cabecera, tema, estados);
  li.append(boton);
  return li;
}

// Lista pequeña bajo el botón (ancho >= 600 y alto >= 500) u hoja inferior [12.5.3].
function posicionarCasos() {
  const dialogo = $('casos');
  if (window.innerWidth >= 600 && window.innerHeight >= 500) {
    const rect = $('portada-dia-boton').getBoundingClientRect();
    const ancho = Math.min(448, window.innerWidth - 32);
    const izquierda = Math.max(8, Math.min(rect.left, window.innerWidth - ancho - 16));
    dialogo.style.setProperty('--casos-arriba', `${Math.round(rect.bottom + 4)}px`);
    dialogo.style.setProperty('--casos-izquierda', `${Math.round(izquierda)}px`);
  } else {
    dialogo.style.removeProperty('--casos-arriba');
    dialogo.style.removeProperty('--casos-izquierda');
  }
}

function abrirCasos() {
  if (estado.pantalla !== 'portada' || modoPrueba || casosAbiertos() || !calendario) return;
  const filas = listaDeCasos({ calendario, afirmaciones: mesCargado, nHoy });
  $('casos-lista').replaceChildren(...filas.map(crearFila));
  $('casos-vacia').hidden = filas.length > 1;
  posicionarCasos();
  $('casos').showModal();
  $('portada-dia-boton').setAttribute('aria-expanded', 'true');
  ponerFoco($('casos-lista').querySelector('[aria-current]') ?? $('casos-lista').querySelector('.caso-fila'));
}

// conFoco: devolver el foco a la etiqueta; false cuando cambia el contexto (lo pone la pantalla nueva).
function cerrarCasos(conFoco = true) {
  focoAlCerrarCasos = conFoco;
  if (casosAbiertos()) $('casos').close();
}

$('casos').addEventListener('close', () => {
  $('portada-dia-boton').setAttribute('aria-expanded', 'false');
  $('casos-lista').replaceChildren();
  const conFoco = focoAlCerrarCasos;
  focoAlCerrarCasos = true;
  if (conFoco && estado.pantalla === 'portada') ponerFoco($('portada-dia-boton'));
});

// El diálogo no tiene relleno: solo el fondo da este target.
$('casos').addEventListener('click', (ev) => {
  if (ev.target === $('casos')) cerrarCasos(true);
});

$('casos').addEventListener('keydown', (ev) => {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(ev.key)) return;
  const filas = [...$('casos-lista').querySelectorAll('.caso-fila')];
  if (filas.length === 0) return;
  const i = filas.indexOf(document.activeElement);
  let destino;
  if (ev.key === 'Home') destino = 0;
  else if (ev.key === 'End') destino = filas.length - 1;
  else if (ev.key === 'ArrowDown') destino = i < 0 ? 0 : Math.min(filas.length - 1, i + 1);
  else destino = i < 0 ? 0 : Math.max(0, i - 1);
  ev.preventDefault();
  ponerFoco(filas[destino]);
});

window.addEventListener('resize', () => {
  if (casosAbiertos()) posicionarCasos();
});

// Elegir un caso de la lista o volver a hoy (n === nHoy) [12.4, 12.9].
function elegirCaso(n) {
  if (estado.pantalla !== 'portada' || !Number.isInteger(n) || n < 1) return;
  const destino = nHoy !== null && n >= nHoy ? null : n;
  if (destino === nPedido) {
    cerrarCasos(true); // ya es el caso cargado
    return;
  }
  cerrarCasos(false);
  if (destino === null) historia('replaceState', null);
  else historia(nPedido === null ? 'pushState' : 'replaceState', destino);
  nPedido = destino;
  despachar({ tipo: 'ELEGIR_CASO', n: destino });
}

// Atrás y Adelante [12.9]: vuelve a hoy o al caso de la entrada, sin recargar la página.
window.addEventListener('popstate', (ev) => {
  if (modoPrueba) return;
  const p = estado.pantalla;
  const enPartida = ['cuenta-atras', 'caso', 'cargando'].includes(p) || (p === 'error' && estado.error === 'imagenes');
  if (enPartida) {
    // La partida en curso no se abandona: se restaura la dirección del caso cargado.
    historia('pushState', nPedido);
    return;
  }
  const delEstado = ev.state?.caso;
  const valido = (n) => Number.isInteger(n) && n >= 1 && nHoy !== null && n < nHoy;
  const destino = valido(delEstado) ? delEstado : casoPedido(location.search, nHoy);
  // Deja la dirección en el idioma activo y sin ?caso= erróneo.
  const url = direccion(destino);
  if (url !== location.href) {
    try {
      history.replaceState({ caso: destino }, '', url);
    } catch {
      // sin historial
    }
  }
  if (destino === nPedido) return;
  cerrarCasos(false);
  nPedido = destino;
  if (p === 'portada') despachar({ tipo: 'ELEGIR_CASO', n: destino });
  else if (p === 'resultado' || p === 'instrucciones' || p === 'ya-jugado') {
    despachar({ tipo: 'VOLVER_PORTADA' });
    despachar({ tipo: 'ELEGIR_CASO', n: destino });
  } else if (p === 'error') despachar({ tipo: 'REINTENTAR' });
  else if (p === 'iniciando') cargarDia();
  else despachar({ tipo: 'MEDIANOCHE' });
});

// ---- Idioma [D-154, 10.4.3] ----
// La dirección manda: el selector cambia /en/ <-> /es/ sin recargar ni añadir entrada al historial.
function cambiarDireccion(idioma) {
  try {
    const url = urlDeIdioma(location.href, idioma);
    if (url !== null) history.replaceState(history.state, '', url);
  } catch {
    // sin historial: no pasa nada
  }
}

// title, meta description y href de los a[data-enlace] en el idioma activo (relativos a la carpeta del idioma).
function pintarCabeceraYEnlaces(idioma) {
  document.title = TEXTOS[idioma].seo.titulo_juego;
  const descripcion = document.querySelector('meta[name="description"]');
  if (descripcion) descripcion.setAttribute('content', TEXTOS[idioma].seo.descripcion_juego);
  for (const a of document.querySelectorAll('a[data-enlace]')) {
    const ruta = RUTAS[idioma][a.dataset.enlace];
    if (typeof ruta === 'string') a.setAttribute('href', ruta === '' ? './' : ruta);
  }
  // Enlace a la guía: una versión por idioma en el HTML generado (su dirección no está en js/); solo se ve la del idioma activo.
  for (const a of document.querySelectorAll('#portada-enlaces a[hreflang]')) a.hidden = a.lang !== idioma;
}

// noindex dinámico [10.7.5, DP-83]: lo pone o lo quita según el modo y la pantalla.
function actualizarRobots(e) {
  const quiere = debeNoIndexar({ modoPrueba, previsualizacion: fechaFija !== null, pantalla: e.pantalla });
  const actual = document.head.querySelector('meta[name="robots"]');
  if (quiere && !actual) {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.append(meta);
  } else if (!quiere && actual) {
    actual.remove();
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
  pintarCabeceraYEnlaces(estado.idioma);
  pintarAvisosFecha();
  pintarSelectorPrueba();
}

// ---- Arranque ----
function arrancar() {
  const lectura = leerConRespaldo(almacenLocal, almacenSesion);
  datos = lectura.datos;
  marcarAlmacen(lectura.disponible);
  datosArchivo = leerArchivoConRespaldo(almacenLocal, almacenSesion).datos;
  // Manda la dirección (<html lang> lo pone el generador) [10.3, 10.4.4]. Visitar una dirección no cambia la preferencia.
  const idiomaPagina = idiomaValido(document.documentElement.lang) ? document.documentElement.lang : 'en';
  const lang = decidirLangEnPagina({ idiomaPagina, search: location.search, href: location.href });
  if (lang.guardar !== null) guardarIdioma(almacenIdioma(), lang.guardar);
  if (lang.accion === 'redirigir') {
    location.replace(lang.url);
    return; // el arranque se detiene: la otra dirección arranca por su cuenta
  }
  if (lang.accion === 'quitar') {
    try {
      history.replaceState(history.state, '', lang.url);
    } catch {
      // sin historial: no pasa nada
    }
  }
  const idioma = idiomaPagina;
  // ?caso=N provisional: cargarDia lo valida contra el día de hoy [12.6.5]. En modo prueba se ignora.
  const pedido = new URLSearchParams(location.search).get('caso');
  nPedido = !modoPrueba && pedido !== null && /^[1-9]\d{0,5}$/.test(pedido) ? Number(pedido) : null;
  // estadoInicial valida modo, reto e idioma y usa los de por defecto si no valen.
  estado = estadoInicial({ modo: datos.ajustes.modo, reto: datos.ajustes.reto, idioma });
  // Los textos se pintan antes de mostrar ninguna pantalla: nunca se ven los del otro idioma.
  aplicarIdioma();
  app.dataset.modo = estado.modo;
  app.dataset.reto = estado.reto;
  actualizarRobots(estado);
  mostrarPantalla('iniciando');
  app.dataset.pantalla = 'iniciando';
  cargarDia();
  armarVigia();
}

arrancar();
