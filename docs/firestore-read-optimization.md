# Firestore read optimization

## Diagnostico

Lecturas principales detectadas:

- `PronosticosService.pronosticos$()` escucha toda la coleccion `pronosticos`.
- `ReaccionesService.reacciones$()` escucha toda la coleccion `reacciones`.
- `ComentariosService.comentarios$()` escucha toda la coleccion `comentarios`.
- `AdminPage` mantiene `pronosticos$()` completo por ser vista administrativa.
- `PartidosPage`, `FeedPage`, `TablaPage`, `Perfil`, `Wrapped`, `Resultados` y `match-detail-sheet` ya no dependen de `pronosticos$()` completo.
- `FeedPage` ya no depende de `reacciones$()` completo.
- `TablaPage` ya no reconstruye la grafica historica desde `pronosticos`; usa `historialPuntos` persistido en usuarios.

## Fase 1 aplicada

- Cache compartido con `shareReplay` en `partidos$()`, `usuarios$()`, `pronosticos$()`, `pronosticosPorUsuario$()`, `pronosticosPorPartido$()`, `comentarios$()`, `comentariosPorPartido$()`, `reacciones$()`, `reaccionesPorTarget$()` y `reaccionesPorUsuario$()`.
- `Perfil` y `Wrapped` leen solo `pronosticosPorUsuario$(uid)`.
- `match-detail-sheet` lee solo pronosticos y comentarios del partido abierto.
- `match-detail-sheet` lee reacciones solo de los pronosticos de ese partido.
- `Resultados` lee pronosticos, comentarios y reacciones solo del partido activo.

Impacto esperado:

- Navegar entre tabs ya no crea listeners nuevos para `partidos` y `usuarios`.
- Perfil/Wrapped dejan de pagar la coleccion completa de pronosticos.
- Abrir detalle de partido deja de pagar comentarios/reacciones/pronosticos globales.
- Resultados deja de pagar comentarios/reacciones/pronosticos globales para cada carga de pantalla.

## Fase 2 aplicada

- `PartidosPage` ya no usa `pronosticos$()` completo; carga pronosticos solo para los partidos visibles en la pestana actual.
- `TablaPage` ya no usa `pronosticos$()` completo; la grafica usa `usuarios.historialPuntos` o `historialPuntosPorTorneo`.
- `FeedPage` ya no usa `pronosticos$()` ni `reacciones$()` completos; carga pronosticos con frase y reacciones de los items visibles.

## Pendiente

- Separar datos de admin: mantener `pronosticos$()` completo solo en vistas admin o scripts de mantenimiento.
- Evaluar una denormalizacion futura `predictoresUids` o `pronosticosCount` en `partidos` si la pestana de Pronosticar necesita bajar de una query por partido visible a una sola lectura de partido.
- Optimizar `FeedPage` con paginacion si el numero de frases crece mucho.
- Revisar `recordar-pronosticos.mjs`: hoy lista colecciones completas; conviene pasarlo a queries por ventana/partidos pendientes si se vuelve a desplegar.
