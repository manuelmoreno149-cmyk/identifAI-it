// Raíz del sitio: igual para todos. Redirige solo si ya hay un idioma guardado (o ?lang=); si no, el jugador elige [10.3].
import { destinoRaiz } from './diario.js';
import { leerIdioma, guardarIdioma } from './almacen.js';

function almacen() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const destino = destinoRaiz({
  search: location.search,
  hash: location.hash,
  guardado: almacen() ? leerIdioma(almacen()) : null
});
// replace evita dejar la raíz en el historial.
if (destino !== null) location.replace(destino);

// Elegir idioma con un botón lo recuerda para la próxima vez.
for (const enlace of document.querySelectorAll('a.raiz-jugar[hreflang]')) {
  enlace.addEventListener('click', () => {
    if (almacen()) guardarIdioma(almacen(), enlace.getAttribute('hreflang'));
  });
}
