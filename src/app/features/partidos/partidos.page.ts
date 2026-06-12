import { computed, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { PRONOSTICO_CIERRE_AVISO, partidoPronosticoAbierto } from '../../core/config/pronostico.config';
import { AuthService } from '../../core/services/auth.service';
import { PartidosService } from '../../core/services/partidos.service';
import { PronosticosService } from '../../core/services/pronosticos.service';
import { ToastService } from '../../core/services/toast.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { esTitular } from '../../core/utils/usuario-tipo.util';
import type { Partido } from '../../core/models/partido.model';
import type { UiMatch, UiPrediction } from '../../shared/models/quiniela-view.model';
import {
  groupPredictedBy,
  toUiMatch,
  toUiPlayer,
  toUiPrediction
} from '../../shared/utils/quiniela-view.mapper';
import { ApuestaJornadaSheetComponent } from '../../shared/components/quiniela-social/apuesta-jornada-sheet.component';
import { MatchDetailSheetComponent } from '../../shared/components/quiniela-social/match-detail-sheet.component';
import { EmptyStateComponent } from '../../shared/components/quiniela-ui/empty-state.component';
import { LiveDotComponent } from '../../shared/components/quiniela-ui/live-dot.component';
import { MatchCardComponent } from '../../shared/components/quiniela-ui/match-card.component';
import {
  SegmentedControlComponent,
  type SegmentedControlOption
} from '../../shared/components/quiniela-ui/segmented-control.component';
import { SkeletonCardComponent } from '../../shared/components/quiniela-ui/skeleton-card.component';

type MatchTab = 'live' | 'upcoming' | 'played';

@Component({
  selector: 'app-partidos-page',
  standalone: true,
  imports: [
    ApuestaJornadaSheetComponent,
    EmptyStateComponent,
    LiveDotComponent,
    MatchCardComponent,
    MatchDetailSheetComponent,
    SegmentedControlComponent,
    SkeletonCardComponent
  ],
  templateUrl: './partidos.page.html',
  styleUrl: './partidos.page.scss'
})
export class PartidosPage {
  private readonly auth = inject(AuthService);
  private readonly partidosService = inject(PartidosService);
  private readonly pronosticosService = inject(PronosticosService);
  private readonly toasts = inject(ToastService);
  private readonly usuariosService = inject(UsuariosService);

  private readonly partidosSource = toSignal(this.partidosService.partidos$(), {
    initialValue: undefined
  });
  private readonly pronosticosSource = toSignal(this.pronosticosService.pronosticos$(), {
    initialValue: undefined
  });
  private readonly usuariosSource = toSignal(this.usuariosService.usuarios$(), {
    initialValue: undefined
  });

  protected readonly tab = signal<MatchTab>('upcoming');
  protected readonly selectedMatch = signal<UiMatch | null>(null);
  protected readonly apuestaSheetOpen = signal(false);
  private readonly draftPredictions = signal<Record<string, UiPrediction>>({});
  private readonly draftFrases = signal<Record<string, string>>({});
  private readonly dirtyMatches = signal<ReadonlySet<string>>(new Set());
  protected readonly savingMatchId = signal<string | null>(null);
  protected readonly skeletonRows: readonly number[] = [1, 2, 3];
  protected readonly pronosticoCierreAviso = PRONOSTICO_CIERRE_AVISO;

  protected readonly userId = computed(() => this.auth.userProfile()?.uid ?? '');

  protected readonly players = computed(() =>
    (this.usuariosSource() ?? []).map((usuario, index) => toUiPlayer(usuario, index + 1))
  );

  protected readonly playersApuesta = computed(() =>
    (this.usuariosSource() ?? [])
      .filter((usuario) => esTitular(usuario.tipo))
      .map((usuario, index) => toUiPlayer(usuario, index + 1))
  );

  protected readonly matches = computed(() =>
    (this.partidosSource() ?? []).map((partido) => toUiMatch(partido))
  );

  protected readonly live = computed(() =>
    this.matches().filter((match) => match.status === 'live')
  );

  protected readonly upcoming = computed(() =>
    this.matches().filter((match) => match.status === 'upcoming')
  );

  protected readonly played = computed(() =>
    this.matches().filter((match) => match.status === 'played')
  );

  protected readonly filteredMatches = computed(() => {
    const tab = this.tab();

    if (tab === 'live') {
      return this.live();
    }

    if (tab === 'upcoming') {
      return this.upcoming();
    }

    return this.played();
  });

  protected readonly segmentedOptions = computed<readonly SegmentedControlOption[]>(() => [
    { value: 'upcoming', label: 'A pronosticar', count: this.upcoming().length },
    { value: 'live', label: 'En Vivo', live: true, count: this.live().length },
    { value: 'played', label: 'Jugados', count: this.played().length }
  ]);

  protected readonly predictedBy = computed(() =>
    groupPredictedBy(this.pronosticosSource() ?? [])
  );

  protected readonly isLoading = computed(() =>
    this.partidosSource() === undefined ||
    this.pronosticosSource() === undefined ||
    this.usuariosSource() === undefined
  );

  protected setTab(value: string): void {
    this.tab.set(value as MatchTab);
  }

  /**
   * Jornada activa: la primera jornada de grupos con al menos un partido
   * aún programado. Solo aplica a fase de grupos con jornada numérica.
   */
  protected readonly jornadaActiva = computed(() => {
    const programados = (this.partidosSource() ?? [])
      .filter((p): p is Partido & { jornada: number } =>
        p.fase === 'grupos' &&
        typeof p.jornada === 'number' &&
        p.estado === 'programado'
      );

    if (programados.length === 0) {
      return null;
    }

    const minJornada = Math.min(...programados.map((p) => p.jornada));
    const jornadaKey = `J${minJornada}`;

    return { key: jornadaKey, label: `Jornada ${minJornada}` };
  });

  protected predictionFor(matchId: string): UiPrediction {
    const draft = this.draftPredictions()[matchId];

    if (draft !== undefined) {
      return draft;
    }

    const ownPrediction = (this.pronosticosSource() ?? []).find((pronostico) =>
      pronostico.uid === this.userId() && pronostico.partidoId === matchId
    );

    return toUiPrediction(ownPrediction);
  }

  protected predictedByFor(matchId: string): readonly string[] {
    return this.predictedBy()[matchId] ?? [];
  }

  protected fraseFor(matchId: string): string {
    const draft = this.draftFrases()[matchId];

    if (draft !== undefined) {
      return draft;
    }

    const ownPrediction = (this.pronosticosSource() ?? []).find((pronostico) =>
      pronostico.uid === this.userId() && pronostico.partidoId === matchId
    );

    return ownPrediction?.frase ?? '';
  }

  protected isDirty(matchId: string): boolean {
    return this.dirtyMatches().has(matchId);
  }

  protected isSaving(matchId: string): boolean {
    return this.savingMatchId() === matchId;
  }

  protected hasSavedPrediction(matchId: string): boolean {
    return (this.pronosticosSource() ?? []).some((pronostico) =>
      pronostico.uid === this.userId() && pronostico.partidoId === matchId
    );
  }

  protected predictionOpenFor(matchId: string): boolean {
    const partido = (this.partidosSource() ?? []).find((item) => item.id === matchId);

    if (partido === undefined) {
      return false;
    }

    return partidoPronosticoAbierto(partido.fechaInicio, partido.estado);
  }

  protected canSavePrediction(matchId: string): boolean {
    const prediction = this.predictionFor(matchId);
    const hasScores =
      typeof prediction.home === 'number' &&
      typeof prediction.away === 'number';

    return (
      hasScores &&
      this.isDirty(matchId) &&
      !this.isSaving(matchId) &&
      this.predictionOpenFor(matchId)
    );
  }

  protected onPredictionChange(matchId: string, prediction: UiPrediction): void {
    this.draftPredictions.update((drafts) => ({
      ...drafts,
      [matchId]: prediction
    }));
    this.markDirty(matchId);
  }

  protected onFraseChange(matchId: string, frase: string): void {
    this.draftFrases.update((drafts) => ({
      ...drafts,
      [matchId]: frase
    }));
    this.markDirty(matchId);
  }

  protected async savePrediction(matchId: string): Promise<void> {
    const prediction = this.predictionFor(matchId);
    const hasScores =
      typeof prediction.home === 'number' &&
      typeof prediction.away === 'number';

    if (!hasScores) {
      this.toasts.info('Pon marcador local y visitante antes de guardar.');
      return;
    }

    if (!this.isDirty(matchId)) {
      return;
    }

    this.savingMatchId.set(matchId);

    const saved = await this.pronosticosService.guardarMiPronostico({
      partidoId: matchId,
      golesLocal: prediction.home,
      golesVisitante: prediction.away,
      frase: this.fraseFor(matchId)
    });

    this.savingMatchId.set(null);

    if (!saved) {
      return;
    }

    this.clearDraft(matchId);
    this.toasts.success('Pronóstico guardado.');
  }

  private markDirty(matchId: string): void {
    this.dirtyMatches.update((matches) => {
      const next = new Set(matches);
      next.add(matchId);
      return next;
    });
  }

  private clearDraft(matchId: string): void {
    this.draftPredictions.update((drafts) => {
      const { [matchId]: _removed, ...rest } = drafts;
      return rest;
    });
    this.draftFrases.update((drafts) => {
      const { [matchId]: _removed, ...rest } = drafts;
      return rest;
    });
    this.dirtyMatches.update((matches) => {
      const next = new Set(matches);
      next.delete(matchId);
      return next;
    });
  }
}
