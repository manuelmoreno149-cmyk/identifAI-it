// Raíz del sitio: elige el idioma y redirige a /en/ o /es/ [10.3]. No guarda nada: lo guarda el juego.
import { destinoRaiz } from './diario.js';
import { leerIdioma } from './almacen.js';

function guardado() {
  try {
    return leerIdioma(window.localStorage);
  } catch {
    return null;
  }
}

// Destino relativo ('es/?prueba=1#x'); replace evita dejar la raíz en el historial.
location.replace(
  destinoRaiz({
    search: location.search,
    hash: location.hash,
    guardado: guardado(),
    lenguas: navigator.languages ?? [navigator.language]
  })
);
