// Temporizador basado en requestAnimationFrame y performance.now().

export function fraccionRestante(transcurridoMs, duracionMs) {
  return Math.max(0, Math.min(1, 1 - transcurridoMs / duracionMs));
}

export function nivelTemporizador(fraccion) {
  return fraccion <= 0.3 ? 'critico' : 'normal';
}

export function segundosRestantes(restanteMs) {
  return Math.max(0, Math.ceil(restanteMs / 1000));
}

export function crearTemporizador({
  duracionMs,
  alTick = () => {},
  alAgotar = () => {},
  reloj = () => performance.now(),
  pedirFrame = (f) => requestAnimationFrame(f),
  cancelarFrame = (id) => cancelAnimationFrame(id)
}) {
  let t0 = 0;
  let idFrame = null;
  let activo = false;
  let transcurridoFinal = 0;

  function frame() {
    idFrame = null;
    if (!activo) return;
    const transcurrido = reloj() - t0;
    if (transcurrido >= duracionMs) {
      activo = false;
      transcurridoFinal = transcurrido;
      alTick(0, 0);
      alAgotar();
      return;
    }
    alTick(duracionMs - transcurrido, fraccionRestante(transcurrido, duracionMs));
    if (activo) idFrame = pedirFrame(frame);
  }

  return {
    iniciar() {
      if (activo) return;
      t0 = reloj();
      transcurridoFinal = 0;
      activo = true;
      idFrame = pedirFrame(frame);
    },
    detener() {
      if (activo) {
        transcurridoFinal = reloj() - t0;
        activo = false;
      }
      if (idFrame !== null) {
        cancelarFrame(idFrame);
        idFrame = null;
      }
      return transcurridoFinal;
    },
    activo() {
      return activo;
    }
  };
}

// Resuelve en el segundo frame tras la llamada (en el primero se pinta la imagen).
export function esperarPintado(pedirFrame = (f) => requestAnimationFrame(f)) {
  return new Promise((resolver) => {
    pedirFrame(() => pedirFrame(() => resolver()));
  });
}
