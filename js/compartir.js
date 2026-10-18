// Texto para compartir y envío (share, portapapeles o manual).

export const CUADROS = { A: '🟩', F: '🟥', T: '⬛', O: '⬛' };

export function rellenar(plantilla, valores) {
  return plantilla.replace(/\{(\w+)\}/g, (marca, clave) =>
    Object.hasOwn(valores, clave) ? String(valores[clave]) : marca
  );
}

export function cuadros(resultados) {
  return [...resultados].map((c) => CUADROS[c] ?? '⬛').join('');
}

// Los aciertos se calculan siempre a partir de `resultados`.
export function textoCompartir({ plantilla, n, nombreModo, resultados, racha, url }) {
  const total = [...resultados].filter((c) => c === 'A').length;
  return rellenar(plantilla, {
    caso: n,
    modo: nombreModo,
    aciertos: total,
    cuadros: cuadros(resultados),
    racha,
    url
  });
}

export function urlDelJuego(ubicacion = location) {
  return ubicacion.origin + ubicacion.pathname.replace(/index\.html$/, '');
}

export async function compartir(texto, nav = globalThis.navigator) {
  try {
    if (nav && typeof nav.share === 'function') {
      try {
        await nav.share({ text: texto });
        return 'compartido';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'cancelado';
      }
    }
    if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
      try {
        await nav.clipboard.writeText(texto);
        return 'copiado';
      } catch {
        // pasa al modo manual
      }
    }
  } catch {
    // pasa al modo manual
  }
  return 'manual';
}
