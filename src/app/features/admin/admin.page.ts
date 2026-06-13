import { computed, Component, effect, inject, signal, untracked } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, filter, of, switchMap } from 'rxjs';
import { UpperCasePipe } from '@angular/common';

import type { AdminJugadorUpdate } from '../../core/models/admin.model';
import {
  partidoEstados,
  type Partido,
  type PartidoEstado
} from '../../core/models/partido.model';
import type { Pronostico } from '../../core/models/pronostico.model';
import type { Usuario, UsuarioTipo } from '../../core/models/usuario.model';
import { AdminService } from '../../core/services/admin.service';
import { PartidosService } from '../../core/services/partidos.service';
import { PronosticosService } from '../../core/services/pronosticos.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { resolveCrestUrl } from '../../core/config/equipos-crest.config';
import { EmptyStateComponent } from '../../shared/components/quiniela-ui/empty-state.component';
import {
  SegmentedControlComponent,
  type SegmentedControlOption
} from '../../shared/components/quiniela-ui/segmented-control.component';
import { SkeletonCardComponent } from '../../shared/components/quiniela-ui/skeleton-card.component';
import { TeamFlagComponent } from '../../shared/components/quiniela-ui/team-flag.component';
import { TorneosService } from '../../core/services/torneos.service';
import type { Torneo } from '../../core/models/torneo.model';
import { partidoFases } from '../../core/models/partido.model';

type AdminTab = 'resultados' | 'pronosticos' | 'jugadores' | 'torneos';
type DraftsPartidos = Readonly<Record<string, PartidoDraft>>;
type JugadorDrafts = Readonly<Record<string, JugadorDraft>>;
type ScoreSide = 'local' | 'visitante';

interface HistorialPronosticoItem {
  readonly pronostico: Pronostico;
  readonly partido: Partido;
  readonly esSeleccionActual: boolean;
}

interface PartidoDraft {
  readonly golesLocal: number | null;
  readonly golesVisitante: number | null;
  readonly estado: PartidoEstado;
}

interface PronosticoDraft {
  readonly golesLocal: string;
  readonly golesVisitante: string;
}

interface JugadorDraft {
  readonly nombre: string;
  readonly tipo: UsuarioTipo;
}

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [
    EmptyStateComponent,
    SegmentedControlComponent,
    SkeletonCardComponent,
    TeamFlagComponent,
    UpperCasePipe
  ],
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.scss'
})
export class AdminPage {
  private readonly partidosService = inject(PartidosService);
  private readonly pronosticosService = inject(PronosticosService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly adminService = inject(AdminService);
  private readonly torneosService = inject(TorneosService);

  protected readonly estados = partidoEstados;
  protected readonly fases = partidoFases;
  protected readonly activeTab = signal<AdminTab>('resultados');
  protected readonly selectedPartidoId = signal('');
  protected readonly selectedJugadorUid = signal('');
  
  private readonly activeTab$ = toObservable(this.activeTab);

  private readonly partidosSource = toSignal(
    this.activeTab$.pipe(
      filter((tab) => tab === 'resultados' || tab === 'pronosticos'),
      switchMap(() => this.partidosService.partidos$())
    ),
    { initialValue: undefined }
  );

  private readonly usuariosSource = toSignal(
    this.activeTab$.pipe(
      filter((tab) => tab === 'jugadores' || tab === 'pronosticos' || tab === 'torneos'),
      switchMap(() => this.usuariosService.usuarios$())
    ),
    { initialValue: undefined }
  );

  private readonly torneosSource = toSignal(
    this.activeTab$.pipe(
      filter((tab) => tab === 'torneos'),
      switchMap(() => this.torneosService.torneos$())
    ),
    { initialValue: undefined }
  );

  private readonly pronosticoSeleccionado$ = combineLatest([
    this.activeTab$,
    toObservable(this.selectedJugadorUid),
    toObservable(this.selectedPartidoId)
  ]).pipe(
    switchMap(([tab, uid, partidoId]) => {
      if (tab === 'pronosticos' && uid !== '' && partidoId !== '') {
        return this.pronosticosService.pronostico$(uid, partidoId);
      }
      return of(undefined);
    })
  );

  private readonly pronosticoGuardadoSource = toSignal(this.pronosticoSeleccionado$, {
    initialValue: undefined
  });

  protected readonly drafts = signal<DraftsPartidos>({});
  protected readonly pronosticoDraft = signal<PronosticoDraft>(emptyPronosticoDraft());
  protected readonly jugadorDrafts = signal<JugadorDrafts>({});
  protected readonly nuevoInvitado = signal('');
  protected readonly savingId = signal<string | null>(null);
  protected readonly guardandoPronostico = signal(false);
  protected readonly savingJugadorUid = signal<string | null>(null);
  protected readonly creandoInvitado = signal(false);
  protected readonly skeletonRows: readonly number[] = [1, 2, 3, 4];
  
  protected readonly nuevoTorneoNombre = signal('');
  protected readonly nuevoTorneoFase = signal<string>('octavos');
  protected readonly creandoTorneo = signal(false);

  protected readonly tabOptions: readonly SegmentedControlOption[] = [
    { value: 'resultados', label: 'Resultados' },
    { value: 'pronosticos', label: 'Pronósticos' },
    { value: 'jugadores', label: 'Jugadores' },
    { value: 'torneos', label: 'Torneos' }
  ];

  protected readonly isLoading = computed(() => {
    const tab = this.activeTab();
    if (tab === 'resultados') return this.partidosSource() === undefined;
    if (tab === 'pronosticos') return this.partidosSource() === undefined || this.usuariosSource() === undefined;
    if (tab === 'jugadores') return this.usuariosSource() === undefined;
    if (tab === 'torneos') return this.torneosSource() === undefined || this.usuariosSource() === undefined;
    return false;
  });

  protected readonly partidos = computed(() =>
    [...(this.partidosSource() ?? [])].sort((left, right) =>
      statusWeight(left.estado) - statusWeight(right.estado) ||
      fechaPartidoMillis(left) - fechaPartidoMillis(right)
    )
  );

  /** Todos los partidos en orden del calendario (incluye finalizados). */
  protected readonly partidosCalendario = computed(() =>
    [...(this.partidosSource() ?? [])].sort(
      (left, right) => fechaPartidoMillis(left) - fechaPartidoMillis(right)
    )
  );

  protected readonly partidosFinalizados = computed(() =>
    this.partidosCalendario().filter((partido) => partido.estado === 'finalizado').length
  );

  protected readonly jugadores = computed(() =>
    [...(this.usuariosSource() ?? [])].sort((left, right) =>
      tipoWeight(left.tipo) - tipoWeight(right.tipo) ||
      left.nombre.localeCompare(right.nombre, 'es')
    )
  );

  protected readonly selectedPartido = computed(() =>
    (this.partidosSource() ?? []).find((partido) => partido.id === this.selectedPartidoId()) ?? null
  );

  protected readonly selectedJugador = computed(() =>
    this.jugadores().find((jugador) => jugador.uid === this.selectedJugadorUid()) ?? null
  );

  protected readonly torneos = computed(() =>
    [...(this.torneosSource() ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre))
  );

  constructor() {
    effect(() => {
      const tab = this.activeTab();
      const partidos = this.partidosCalendario();
      const jugadores = this.jugadores();

      if (tab === 'pronosticos' && partidos.length > 0 && jugadores.length > 0) {
        if (this.selectedPartidoId() === '') {
          this.selectedPartidoId.set(partidos[0]!.id);
        }
        if (this.selectedJugadorUid() === '') {
          this.selectedJugadorUid.set(jugadores[0]!.uid);
        }
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const tab = this.activeTab();
      const jugadores = this.jugadores();

      if (tab === 'jugadores' && jugadores.length > 0) {
        untracked(() => {
          this.jugadorDrafts.update((drafts) => {
            const newDrafts = { ...drafts };
            for (const jugador of jugadores) {
              if (!newDrafts[jugador.uid]) {
                newDrafts[jugador.uid] = jugadorDraftFromUsuario(jugador);
              }
            }
            return newDrafts;
          });
        });
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const guardado = this.pronosticoGuardadoSource();
      untracked(() => {
        this.pronosticoDraft.set(pronosticoDraftFromPronostico(guardado));
      });
    }, { allowSignalWrites: true });
  }

  protected readonly pronosticoGuardado = computed(() => this.pronosticoGuardadoSource() ?? undefined);

  protected readonly puedeGuardarPronostico = computed(() => {
    const draft = this.pronosticoDraft();
    return (
      this.selectedPartidoId() !== '' &&
      this.selectedJugadorUid() !== '' &&
      parsePronosticoScore(draft.golesLocal) !== null &&
      parsePronosticoScore(draft.golesVisitante) !== null
    );
  });

  protected readonly enRevision = computed(() =>
    this.partidos().filter((partido) => partido.estado !== 'finalizado').length
  );

  protected cambiarTab(tab: string): void {
    if (!isAdminTab(tab)) {
      return;
    }

    this.activeTab.set(tab);
  }

  protected seleccionarPartido(partidoId: string): void {
    this.selectedPartidoId.set(partidoId);
  }

  protected seleccionarJugador(uid: string): void {
    this.selectedJugadorUid.set(uid);
  }

  protected draftFor(partido: Partido): PartidoDraft {
    return this.drafts()[partido.id] ?? draftFromPartido(partido);
  }

  protected jugadorDraftFor(usuario: Usuario): JugadorDraft {
    return this.jugadorDrafts()[usuario.uid] ?? jugadorDraftFromUsuario(usuario);
  }

  protected tipoLabel(tipo: UsuarioTipo | undefined): string {
    return tipo === 'invitado' ? 'Invitado' : 'Titular';
  }

  protected updateScore(partido: Partido, side: ScoreSide, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseScoreInput(input.value);

    this.patchDraft(partido, side === 'local'
      ? { golesLocal: value }
      : { golesVisitante: value }
    );
  }

  protected updateEstado(partido: Partido, event: Event): void {
    const select = event.target as HTMLSelectElement;

    if (!isPartidoEstado(select.value)) {
      return;
    }

    this.patchDraft(partido, { estado: select.value });
  }

  protected updatePronosticoScore(side: ScoreSide, event: Event): void {
    const input = event.target as HTMLInputElement;
    const patch = side === 'local'
      ? { golesLocal: input.value }
      : { golesVisitante: input.value };

    this.pronosticoDraft.update((draft) => ({ ...draft, ...patch }));
  }

  protected updateJugadorNombre(usuario: Usuario, event: Event): void {
    const input = event.target as HTMLInputElement;
    const current = this.jugadorDraftFor(usuario);

    this.patchJugadorDraft(usuario.uid, {
      ...current,
      nombre: input.value
    });
  }

  protected toggleJugadorTipo(usuario: Usuario): void {
    const current = this.jugadorDraftFor(usuario);
    const nextTipo: UsuarioTipo = current.tipo === 'invitado' ? 'titular' : 'invitado';

    this.patchJugadorDraft(usuario.uid, {
      ...current,
      tipo: nextTipo
    });
  }

  protected async guardar(partido: Partido): Promise<void> {
    const draft = this.draftFor(partido);
    this.savingId.set(partido.id);

    try {
      await this.adminService.guardarResultadoYCalcularPuntos({
        partidoId: partido.id,
        golesLocal: draft.golesLocal,
        golesVisitante: draft.golesVisitante,
        estado: draft.estado
      });
    } finally {
      if (this.savingId() === partido.id) {
        this.savingId.set(null);
      }
    }
  }

  protected async guardarPronostico(): Promise<void> {
    const partidoId = this.selectedPartidoId();
    const uid = this.selectedJugadorUid();
    const draft = this.pronosticoDraft();
    const golesLocal = parsePronosticoScore(draft.golesLocal);
    const golesVisitante = parsePronosticoScore(draft.golesVisitante);

    if (partidoId === '' || uid === '' || golesLocal === null || golesVisitante === null) {
      return;
    }

    this.guardandoPronostico.set(true);

    try {
      await this.adminService.guardarPronostico({
        uid,
        partidoId,
        golesLocal,
        golesVisitante
      });
    } finally {
      this.guardandoPronostico.set(false);
    }
  }

  protected async guardarPronosticoSinDatos(): Promise<void> {
    const partidoId = this.selectedPartidoId();
    const uid = this.selectedJugadorUid();

    if (partidoId === '' || uid === '') {
      return;
    }

    this.guardandoPronostico.set(true);

    try {
      await this.adminService.guardarPronostico({
        uid,
        partidoId,
        golesLocal: 0,
        golesVisitante: 0,
        sinDatos: true
      });
    } finally {
      this.guardandoPronostico.set(false);
    }
  }

  protected async guardarJugador(usuario: Usuario): Promise<void> {
    const draft = this.jugadorDraftFor(usuario);
    this.savingJugadorUid.set(usuario.uid);

    try {
      await this.adminService.actualizarJugador({
        uid: usuario.uid,
        nombre: draft.nombre,
        tipo: draft.tipo
      } satisfies AdminJugadorUpdate);
    } finally {
      if (this.savingJugadorUid() === usuario.uid) {
        this.savingJugadorUid.set(null);
      }
    }
  }

  protected async crearInvitado(): Promise<void> {
    const nombre = this.nuevoInvitado().trim();

    if (nombre === '') {
      return;
    }

    this.creandoInvitado.set(true);

    try {
      await this.adminService.crearInvitado(nombre);
      this.nuevoInvitado.set('');
    } finally {
      this.creandoInvitado.set(false);
    }
  }

  protected async crearTorneo(): Promise<void> {
    const nombre = this.nuevoTorneoNombre().trim();
    const faseInicio = this.nuevoTorneoFase() as any;

    if (nombre === '') return;

    this.creandoTorneo.set(true);
    try {
      await this.torneosService.crearTorneo({
        nombre,
        faseInicio,
        estado: 'abierto',
        participantes: []
      });
      this.nuevoTorneoNombre.set('');
    } finally {
      this.creandoTorneo.set(false);
    }
  }

  protected async toggleTorneoEstado(torneo: Torneo): Promise<void> {
    const nextEstado = torneo.estado === 'abierto' ? 'cerrado' : 'abierto';
    await this.torneosService.actualizarTorneo(torneo.id, { estado: nextEstado });
  }

  protected async toggleParticipante(torneo: Torneo, uid: string): Promise<void> {
    const participantes = new Set(torneo.participantes);
    if (participantes.has(uid)) {
      participantes.delete(uid);
    } else {
      participantes.add(uid);
    }
    await this.torneosService.actualizarTorneo(torneo.id, { participantes: Array.from(participantes) });
  }

  protected crestFor(nombre: string, almacenada: string): string {
    return resolveCrestUrl(nombre, almacenada);
  }

  protected estadoLabel(estado: PartidoEstado): string {
    const labels: Readonly<Record<PartidoEstado, string>> = {
      programado: 'Programado',
      en_juego: 'En juego',
      finalizado: 'Finalizado'
    };

    return labels[estado];
  }

  protected fechaLabel(partido: Partido): string {
    const fecha = fechaPartidoDate(partido);

    if (fecha === null) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-GT', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(fecha);
  }

  protected partidoOptionLabel(partido: Partido): string {
    return `${this.estadoLabel(partido.estado)} · ${partido.equipoLocal} vs ${partido.equipoVisitante} · ${this.fechaLabel(partido)}`;
  }



  private patchDraft(partido: Partido, patch: Partial<PartidoDraft>): void {
    this.drafts.update((drafts) => ({
      ...drafts,
      [partido.id]: {
        ...draftFromPartido(partido),
        ...drafts[partido.id],
        ...patch
      }
    }));
  }

  private patchJugadorDraft(uid: string, patch: Partial<JugadorDraft>): void {
    const usuario = this.jugadores().find((item) => item.uid === uid);

    if (usuario === undefined) {
      return;
    }

    this.jugadorDrafts.update((drafts) => ({
      ...drafts,
      [uid]: {
        ...this.jugadorDraftFor(usuario),
        ...patch
      }
    }));
  }
}

function emptyPronosticoDraft(): PronosticoDraft {
  return { golesLocal: '', golesVisitante: '' };
}

function pronosticoDraftFromPronostico(pronostico: Pronostico | undefined): PronosticoDraft {
  if (pronostico === undefined) {
    return emptyPronosticoDraft();
  }

  return {
    golesLocal: String(pronostico.golesLocal),
    golesVisitante: String(pronostico.golesVisitante)
  };
}

function jugadorDraftFromUsuario(usuario: Usuario): JugadorDraft {
  return {
    nombre: usuario.nombre,
    tipo: usuario.tipo ?? 'titular'
  };
}

function draftFromPartido(partido: Partido): PartidoDraft {
  return {
    golesLocal: partido.golesLocal,
    golesVisitante: partido.golesVisitante,
    estado: partido.estado
  };
}

function parseScoreInput(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return Math.min(parsed, 99);
}

function parsePronosticoScore(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }

  return parseScoreInput(value);
}

function isPartidoEstado(value: string): value is PartidoEstado {
  return (partidoEstados as readonly string[]).includes(value);
}

function isAdminTab(value: string): value is AdminTab {
  return value === 'resultados' || value === 'pronosticos' || value === 'jugadores' || value === 'torneos';
}

function fechaPartidoMillis(partido: Partido): number {
  const fecha = fechaPartidoDate(partido);
  return fecha?.getTime() ?? 0;
}

function fechaPartidoDate(partido: Partido): Date | null {
  const fecha = partido.fechaInicio;

  if (fecha && typeof fecha.toDate === 'function') {
    return fecha.toDate();
  }

  return null;
}

function statusWeight(estado: PartidoEstado): number {
  const weights: Readonly<Record<PartidoEstado, number>> = {
    en_juego: 0,
    programado: 1,
    finalizado: 2
  };

  return weights[estado];
}

function tipoWeight(tipo: UsuarioTipo | undefined): number {
  return tipo === 'invitado' ? 1 : 0;
}
