# AGENTS.md

## Proyecto

Quiniela del Mundial 2026 para aproximadamente 10 usuarios.

Aplicacion web con:

- Angular 18+.
- Standalone components.
- Signals para estado local y compartido.
- AngularFire para Firestore y Auth.
- Firebase Hosting.

El producto es mobile-first: se espera que alrededor del 90% del uso sea desde celular.

## Principios de trabajo

- Haz cambios pequenos e incrementales.
- No generes mas de un feature por iteracion.
- Manten el alcance de cada cambio ajustado a la solicitud actual.
- No instales dependencias sin proponerlo primero y explicar por que son necesarias.
- Antes de cambiar una arquitectura existente, revisa los patrones actuales del proyecto y sigue el estilo local.

## Angular

- Usa TypeScript estricto.
- No uses `any`. Define tipos explicitos, interfaces, aliases o generics adecuados.
- Usa standalone components exclusivamente.
- No agregues `NgModule` ni nuevas dependencias basadas en `NgModule`.
- Prefiere APIs modernas de Angular 18+.
- Usa signals para estado de UI, estado derivado y coordinacion simple entre vistas.
- No introduzcas NgRx; el proyecto es pequeno y no lo necesita.
- Manten los componentes enfocados en presentacion, eventos de UI y composicion.

## Estado y servicios

- Centraliza la logica de negocio en servicios.
- Toda interaccion con Firestore debe vivir en servicios, nunca directamente en componentes.
- Toda interaccion con Auth debe vivir en servicios o facades dedicadas.
- Los componentes deben consumir datos mediante metodos, signals, observables adaptados o APIs publicas de servicios.
- Evita duplicar transformaciones de datos entre componentes; extraelas a servicios o helpers tipados cuando se reutilicen.

## Firestore y Auth

- Usa AngularFire para Firestore/Auth.
- Define tipos para los documentos y DTOs de Firestore.
- Aisla nombres de colecciones, queries y conversiones de datos en servicios.
- Maneja estados de carga, vacio y error de forma explicita.
- No expongas detalles internos de Firestore a la capa visual si no son necesarios.

## Reglas de puntaje

- Los puntos de la quiniela nunca se calculan en el cliente.
- El cliente solo debe leer puntos ya calculados desde el backend o Firestore.
- No agregues funciones, pipes, computed signals ni helpers de UI que calculen puntos finales.
- Si una vista necesita mostrar puntos, consume el valor persistido correspondiente.
- Si falta un valor de puntos, muestra un estado adecuado en vez de recalcularlo localmente.

## Mobile-first

- Disena primero para pantallas pequenas.
- Prioriza flujos rapidos, controles tactiles claros y contenido escaneable.
- Evita layouts que dependan de hover o de mucho espacio horizontal.
- Verifica que textos, tablas, formularios y botones funcionen correctamente en celular.
- Usa breakpoints solo para mejorar la experiencia en pantallas mas grandes.

## Calidad

- Manten tipos estrictos y contratos claros entre servicios y componentes.
- Evita efectos secundarios escondidos en componentes.
- Escribe pruebas cuando el cambio toque logica compartida, reglas de negocio, servicios o flujos criticos.
- No mezcles refactors grandes con features.
- No cambies configuraciones globales sin una razon concreta ligada a la tarea.

## Git

- Trabaja en commits pequenos e incrementales.
- Un commit debe representar una unidad coherente de cambio.
- No incluyas mas de un feature por iteracion.
- No reviertas cambios del usuario sin autorizacion explicita.
- Manten fuera del commit cambios no relacionados con la tarea actual.
