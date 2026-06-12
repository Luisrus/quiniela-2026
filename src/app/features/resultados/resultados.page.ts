import { computed, Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';

import { clasificarPronostico } from '../../core/utils/clasificar-pronostico';

import { AuthService } from '../../core/services/auth.service';
import { ApuestasDiaService } from '../../core/services/apuestas-dia.service';
import { MedallasService } from '../../core/services/medallas.service';
import { ComentariosService } from '../../core/services/comentarios.service';
import { PartidosService } from '../../core/services/partidos.service';
import { PronosticosService } from '../../core/services/pronosticos.service';
import { ReaccionesService } from '../../core/services/reacciones.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { esTitular } from '../../core/utils/usuario-tipo.util';
import type { ApuestaDia } from '../../core/models/apuesta-dia.model';
import type { Partido } from '../../core/models/partido.model';
import type { MedallaTipo } from '../../core/models/medalla.model';
import { CommentItemComponent } from '../../shared/components/quiniela-social/comment-item.component';
import { MatchDetailSheetComponent } from '../../shared/components/quiniela-social/match-detail-sheet.component';
import { AvatarComponent } from '../../shared/components/quiniela-ui/avatar.component';
import { BadgeComponent } from '../../shared/components/quiniela-ui/badge.component';
import type { BadgeVariant } from '../../shared/components/quiniela-ui/badge.component';
import { EmptyStateComponent } from '../../shared/components/quiniela-ui/empty-state.component';
import { SkeletonCardComponent } from '../../shared/components/quiniela-ui/skeleton-card.component';
import { TeamFlagComponent } from '../../shared/components/quiniela-ui/team-flag.component';
import type {
  UiComment,
  UiMatch,
  UiPredictionResult,
  UiReactionCount,
  UiSheetTab
} from '../../shared/models/quiniela-view.model';
import {
  countReactions,
  currentReaction,
  playerMap,
  toPredictionResult,
  toUiMatch,
  toUiPlayer
} from '../../shared/utils/quiniela-view.mapper';

interface ResultTag {
  readonly label: string;
  readonly accent: 'danger' | 'gold';
}

interface DayOption {
  readonly value: string;
  readonly label: string;
}

interface MedallaFeedItem {
  readonly label: string;
  readonly playerName: string;
  readonly variant: BadgeVariant;
}

@Component({
  selector: 'app-resultados-page',
  standalone: true,
  imports: [
    AvatarComponent,
    BadgeComponent,
    CommentItemComponent,
    EmptyStateComponent,
    MatchDetailSheetComponent,
    SkeletonCardComponent,
    TeamFlagComponent
  ],
  templateUrl: './resultados.page.html',
  styleUrl: './resultados.page.scss'
})
export class ResultadosPage {
  private readonly auth = inject(AuthService);
  private readonly apuestasDiaService = inject(ApuestasDiaService);
  private readonly medallasService = inject(MedallasService);
  private readonly comentariosService = inject(ComentariosService);
  private readonly partidosService = inject(PartidosService);
  private readonly pronosticosService = inject(PronosticosService);
  private readonly reaccionesService = inject(ReaccionesService);
  private readonly usuariosService = inject(UsuariosService);

  private readonly partidosSource = toSignal(this.partidosService.partidos$(), {
    initialValue: undefined
  });
  private readonly pronosticosSource = toSignal(this.pronosticosService.pronosticos$(), {
    initialValue: undefined
  });
  private readonly reaccionesSource = toSignal(this.reaccionesService.reacciones$(), {
    initialValue: undefined
  });
  private readonly usuariosSource = toSignal(this.usuariosService.usuarios$(), {
    initialValue: undefined
  });
  private readonly allComentariosSource = toSignal(this.comentariosService.comentarios$(), {
    initialValue: undefined
  });

  protected readonly selectedMatchId = signal<string | null>(null);
  protected readonly selectedDayKey = signal('');
  protected readonly sheetTab = signal<UiSheetTab | null>(null);
  protected readonly commentInput = signal('');
  protected readonly commentFocused = signal(false);
  private readonly newCommentIds = signal<ReadonlySet<string>>(new Set<string>());
  protected readonly emojiSet: readonly string[] = ['🔥', '😱', '🎯', '😭', '👑', '😂', '🤡', '😤'];
  protected readonly skeletonRows: readonly number[] = [1, 2, 3];
  protected readonly userId = computed(() => this.auth.userProfile()?.uid ?? '');

  /**
   * Clave de jornada del partido activo. Solo grupos con jornada numérica.
   * Se usa para cargar las apuestas del feed.
   */
  private readonly jornadaKeyActiva = computed<string | null>(() => {
    const match = this.activeMatch();

    if (match === null) {
      return null;
    }

    const partido = (this.partidosSource() ?? []).find((p) => p.id === match.id);

    if (
      partido?.fase === 'grupos' &&
      typeof partido.jornada === 'number'
    ) {
      return `J${partido.jornada}`;
    }

    return null;
  });

  /** Apuestas de la jornada del partido activo (feed social). */
  private readonly apuestasSource = toSignal(
    toObservable(this.jornadaKeyActiva).pipe(
      switchMap((key) =>
        key
          ? this.apuestasDiaService.apuestasPorJornada$(key)
          : of([])
      )
    ),
    { initialValue: [] as readonly ApuestaDia[] }
  );

  private readonly medallasJornadaSource = toSignal(
    toObservable(this.jornadaKeyActiva).pipe(
      switchMap((key) =>
        key
          ? this.medallasService.medallasPorJornada$(key)
          : of([])
      )
    ),
    { initialValue: [] as const }
  );

  protected readonly isLoading = computed(() =>
    this.partidosSource() === undefined ||
    this.pronosticosSource() === undefined ||
    this.reaccionesSource() === undefined ||
    this.usuariosSource() === undefined ||
    this.allComentariosSource() === undefined
  );

  protected readonly players = computed(() =>
    (this.usuariosSource() ?? []).map((usuario, index) => toUiPlayer(usuario, index + 1))
  );

  private readonly titularesUidSet = computed(() =>
    new Set(
      (this.usuariosSource() ?? [])
        .filter((usuario) => esTitular(usuario.tipo))
        .map((usuario) => usuario.uid)
    )
  );

  protected readonly playedByDay = computed(() => {
    const groups = new Map<string, UiMatch[]>();

    for (const partido of finalizados(this.partidosSource())) {
      const dayKey = dayKeyFromPartido(partido);
      const match = toUiMatch(partido);
      const current = groups.get(dayKey) ?? [];
      groups.set(dayKey, [...current, match]);
    }

    return groups;
  });

  protected readonly dayOptions = computed<readonly DayOption[]>(() =>
    [...this.playedByDay().keys()]
      .sort((left, right) => right.localeCompare(left))
      .map((value) => ({
        value,
        label: dayLabel(value)
      }))
  );

  protected readonly effectiveDayKey = computed(() =>
    resolveDayKey(this.selectedDayKey(), this.dayOptions())
  );

  protected readonly swiperMatches = computed(() =>
    this.playedByDay().get(this.effectiveDayKey()) ?? []
  );

  protected readonly hasPlayedMatches = computed(() => this.playedByDay().size > 0);

  protected readonly activeMatch = computed<UiMatch | null>(() => {
    const matches = this.swiperMatches();

    if (matches.length === 0) {
      return null;
    }

    const matchId = resolveMatchId(this.selectedMatchId(), matches);

    return matches.find((match) => match.id === matchId) ?? matches[0] ?? null;
  });

  protected readonly matchResults = computed<readonly UiPredictionResult[]>(() => {
    const activeMatch = this.activeMatch();

    if (activeMatch === null) {
      return [];
    }

    const playersById = playerMap(this.players());

    return (this.pronosticosSource() ?? [])
      .filter((pronostico) => pronostico.partidoId === activeMatch.id)
      .map((pronostico) => {
        const player = playersById.get(pronostico.uid);

        if (player === undefined) {
          return null;
        }

        return toPredictionResult(pronostico, player);
      })
      .filter((result): result is UiPredictionResult => result !== null)
      .sort((left, right) => (right.pts ?? -1) - (left.pts ?? -1));
  });

  protected readonly maxPts = computed(() => {
    const points = this.matchResults()
      .map((result) => result.pts)
      .filter((value): value is number => value !== null);

    return points.length === 0 ? 0 : Math.max(...points);
  });

  protected readonly medallasFeed = computed<readonly MedallaFeedItem[]>(() => {
    const medallas = this.medallasJornadaSource();
    const titularesUids = this.titularesUidSet();
    const playersById = new Map(this.players().map((player) => [player.id, player]));

    return medallas
      .filter((medalla) => titularesUids.has(medalla.uid))
      .map((medalla) => {
        const player = playersById.get(medalla.uid);

        if (player === undefined) {
          return null;
        }

        return {
          label: this.medallasService.labelFor(medalla.tipo),
          playerName: player.name,
          variant: medallaVariant(medalla.tipo)
        };
      })
      .filter((item): item is MedallaFeedItem => item !== null);
  });

  /** Feed social de apuestas de la jornada del partido activo. */
  protected readonly apuestasFeed = computed<readonly ApuestaFeedItem[]>(() => {
    const apuestas = this.apuestasSource();
    const titularesUids = this.titularesUidSet();
    const playersById = new Map(this.players().map((p) => [p.id, p]));

    return apuestas.map((apuesta) => {
      const retadorEsTitular = titularesUids.has(apuesta.retador);
      const retadoEsTitular = titularesUids.has(apuesta.retado);

      if (!retadorEsTitular || !retadoEsTitular) {
        return null;
      }

      const retador = playersById.get(apuesta.retador);
      const retado = playersById.get(apuesta.retado);

      if (!retador || !retado) {
        return null;
      }

      const { texto, isMe } = apuestaMensaje(
        apuesta,
        retador.name,
        retado.name,
        this.userId()
      );

      return { id: apuesta.id, texto, isMe, resultado: apuesta.resultado };
    }).filter((item): item is ApuestaFeedItem => item !== null);
  });

  protected readonly reactionCounts = computed<readonly UiReactionCount[]>(() => {
    const activeMatch = this.activeMatch();

    if (activeMatch === null) {
      return [];
    }

    return countReactions(
      this.reaccionesSource() ?? [],
      'resultado',
      activeMatch.id,
      this.userId(),
      this.emojiSet
    );
  });

  protected readonly matchComments = computed<readonly UiComment[]>(() => {
    const matchId = this.activeMatch()?.id;

    if (matchId === undefined) {
      return [];
    }

    return (this.allComentariosSource() ?? [])
      .filter((comment) => comment.partidoId === matchId)
      .map((comment) => ({
        id: comment.id,
        playerId: comment.uid,
        text: comment.texto,
        ts: comment.creadoEn.toMillis()
      }));
  });

  protected playedCountForDay(dayKey: string): number {
    return this.playedByDay().get(dayKey)?.length ?? 0;
  }

  protected seleccionarDia(dayKey: string): void {
    this.selectedDayKey.set(dayKey);
    this.selectedMatchId.set(null);
    this.resetComentarioDraft();
  }

  protected seleccionarPartido(matchId: string): void {
    if (this.selectedMatchId() === matchId) {
      return;
    }

    this.selectedMatchId.set(matchId);
    this.sheetTab.set(null);
    this.resetComentarioDraft();
  }

  protected matchChipStyle(match: UiMatch, active: boolean): string {
    return [
      'flex-shrink: 0',
      'padding: 6px 14px',
      'border-radius: var(--r-full)',
      'border: none',
      `background: ${active ? 'var(--accent)' : 'var(--bg-elevated)'}`,
      `color: ${active ? 'var(--text-on-accent)' : 'var(--text-secondary)'}`,
      'font-family: var(--font-ui)',
      'font-size: 12px',
      `font-weight: ${active ? 700 : 500}`,
      'cursor: pointer',
      'white-space: nowrap',
      'transition: all var(--dur-normal)'
    ].join('; ');
  }

  protected medalLabelsFor(uid: string): readonly string[] {
    return this.medallasService.labelsForUid(this.medallasJornadaSource(), uid);
  }

  protected getTag(result: UiPredictionResult): ResultTag | null {
    const score = this.activeMatch()?.score;

    if (score === null || score === undefined) {
      return null;
    }

    const pred = result.pred;

    if (typeof pred.home !== 'number' || typeof pred.away !== 'number') {
      return null;
    }

    const clasificacion = clasificarPronostico(
      { golesLocal: pred.home, golesVisitante: pred.away },
      { golesLocal: score.home, golesVisitante: score.away }
    );

    if (clasificacion === 'exacto') {
      return { label: '🎯 Exacto', accent: 'gold' };
    }

    if (clasificacion === 'fail') {
      return { label: '🤡 Fail del día', accent: 'danger' };
    }

    return null;
  }

  protected ptColor(points: number | null): string {
    return points === 3
      ? 'var(--pt-exact)'
      : points === 1
        ? 'var(--pt-correct)'
        : 'var(--pt-miss)';
  }

  protected onCommentInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.commentInput.set(input.value);
  }

  protected async submitComment(): Promise<void> {
    const activeMatch = this.activeMatch();
    const text = this.commentInput().trim();

    if (activeMatch === null || !text) {
      return;
    }

    const id = await this.comentariosService.crearComentario({
      partidoId: activeMatch.id,
      texto: text
    });

    if (id) {
      this.newCommentIds.update((ids) => new Set([...ids, id]));
    }

    this.commentInput.set('');
  }

  protected isNewComment(id: string): boolean {
    return this.newCommentIds().has(id);
  }

  private resetComentarioDraft(): void {
    this.commentInput.set('');
    this.commentFocused.set(false);
    this.newCommentIds.set(new Set<string>());
  }

  protected async handleReact(emoji: string): Promise<void> {
    const activeMatch = this.activeMatch();

    if (activeMatch === null) {
      return;
    }

    const current = currentReaction(
      this.reaccionesSource() ?? [],
      'resultado',
      activeMatch.id,
      this.userId()
    );

    if (current === emoji) {
      await this.reaccionesService.borrarMiReaccion('resultado', activeMatch.id);
      return;
    }

    if (current !== null) {
      await this.reaccionesService.borrarMiReaccion('resultado', activeMatch.id);
    }

    await this.reaccionesService.crearMiReaccion({
      targetTipo: 'resultado',
      targetId: activeMatch.id,
      emoji
    });
  }
}

interface ApuestaFeedItem {
  readonly id: string;
  readonly texto: string;
  readonly isMe: boolean;
  readonly resultado: ApuestaDia['resultado'];
}

function medallaVariant(tipo: MedallaTipo): BadgeVariant {
  if (tipo === 'mas_exacto') {
    return 'gold';
  }

  if (tipo === 'mas_arriesgado') {
    return 'accent';
  }

  return 'muted';
}

function finalizados(partidos: readonly Partido[] | undefined): readonly Partido[] {
  return (partidos ?? []).filter((partido) => partido.estado === 'finalizado');
}

function dayKeyFromPartido(partido: Partido): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala'
  }).format(partido.fechaInicio.toDate());
}

function todayDayKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala'
  }).format(new Date());
}

function dayLabel(dayKey: string): string {
  const today = todayDayKey();

  if (dayKey === today) {
    return 'Hoy';
  }

  const date = parseDayKey(dayKey);

  return new Intl.DateTimeFormat('es-GT', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Guatemala'
  }).format(date);
}

function parseDayKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function resolveDayKey(selectedDay: string, options: readonly DayOption[]): string {
  const isValid = options.some((option) => option.value === selectedDay);

  if (isValid) {
    return selectedDay;
  }

  const today = todayDayKey();
  const todayOption = options.find((option) => option.value === today);

  return todayOption?.value ?? options[0]?.value ?? '';
}

function resolveMatchId(
  selectedMatchId: string | null,
  matches: readonly UiMatch[]
): string | null {
  if (matches.length === 0) {
    return null;
  }

  const isValid = matches.some((match) => match.id === selectedMatchId);

  if (isValid) {
    return selectedMatchId;
  }

  return matches[0]?.id ?? null;
}

function apuestaMensaje(
  apuesta: ApuestaDia,
  retadorNombre: string,
  retadoNombre: string,
  currentUid: string
): { texto: string; isMe: boolean } {
  const isMe = apuesta.retador === currentUid;
  const yo = isMe ? 'Tú' : retadorNombre;

  const sufijo = apuesta.resultado === 'ganada'
    ? `... ¡y le ganó! 😂`
    : apuesta.resultado === 'perdida'
      ? `... ¡y perdió! 💀`
      : '... (jornada en curso) ⏳';

  return {
    texto: `🎲 ${yo} le apostó a ${retadoNombre} esta jornada${sufijo}`,
    isMe
  };
}
