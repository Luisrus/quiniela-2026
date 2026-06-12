export function calcularPuntosPronostico(pronostico, resultado) {
  if (
    !isMarcadorCompleto(pronostico) ||
    !isMarcadorCompleto(resultado)
  ) {
    return 0;
  }

  if (
    pronostico.golesLocal === resultado.golesLocal &&
    pronostico.golesVisitante === resultado.golesVisitante
  ) {
    return 3;
  }

  return ganador(pronostico.golesLocal, pronostico.golesVisitante) ===
    ganador(resultado.golesLocal, resultado.golesVisitante)
    ? 1
    : 0;
}

function isMarcadorCompleto(marcador) {
  return Number.isFinite(marcador.golesLocal) && Number.isFinite(marcador.golesVisitante);
}

function ganador(local, visitante) {
  if (local > visitante) {
    return 'local';
  }

  if (local < visitante) {
    return 'visitante';
  }

  return 'empate';
}
