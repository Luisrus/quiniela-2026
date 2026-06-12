import { computed, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { buildPronosticoId } from '../../core/models/pronostico.model';
import { AuthService } from '../../core/services/auth.service';
import { PartidosService } from '../../core/services/partidos.service';
import { PronosticosService } from '../../core/services/pronosticos.service';
import { ReaccionesService } from '../../core/services/reacciones.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { PredictionReactionsComponent } from '../../shared/components/quiniela-social/prediction-reactions.component';
import { AvatarComponent } from '../../shared/components/quiniela-ui/avatar.component';
import { EmptyStateComponent } from '../../shared/components/quiniela-ui/empty-state.component';
import { SkeletonCardComponent } from '../../shared/components/quiniela-ui/skeleton-card.component';
import { TeamFlagComponent } from '../../shared/components/quiniela-ui/team-flag.component';
import type { UiFeedItem } from '../../shared/models/quiniela-view.model';
import {
  currentReaction,
  playerMap,
  toPredictionResult,
  toUiMatch,
  toUiPlayer
} from '../../shared/utils/quiniela-view.mapper';

@Component({
  selector: 'app-feed-page',
  standalone: true,
  imports: [
    AvatarComponent,
    EmptyStateComponent,
    PredictionReactionsComponent,
    SkeletonCardComponent,
    TeamFlagComponent
  ],
  templateUrl: './feed.page.html'
})
export class FeedPage {
  private readonly auth = inject(AuthService);
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

  protected readonly emojiSet: readonly string[] = ['🔥', '🎯', '😂', '🤡', '😭', '👑'];
  protected readonly skeletonRows: readonly number[] = [1, 2, 3, 4];
  protected readonly userId = computed(() => this.auth.userProfile()?.uid ?? '');

  protected readonly isLoading = computed(() =>
    this.partidosSource() === undefined ||
    this.pronosticosSource() === undefined ||
    this.usuariosSource() === undefined
  );

  protected readonly players = computed(() =>
    (this.usuariosSource() ?? []).map((usuario, index) => toUiPlayer(usuario, index + 1))
  );

  protected readonly feedItems = computed<readonly UiFeedItem[]>(() => {
    const partidos = this.partidosSource() ?? [];
    const partidosById = new Map(partidos.map((partido) => [partido.id, partido]));
    const playersById = playerMap(this.players());

    return (this.pronosticosSource() ?? [])
      .filter((pronostico) => (pronostico.frase?.trim().length ?? 0) > 0)
      .map((pronostico) => {
        const partido = partidosById.get(pronostico.partidoId);
        const player = playersById.get(pronostico.uid);

        if (partido === undefined || player === undefined) {
          return null;
        }

        return {
          result: toPredictionResult(pronostico, player),
          match: toUiMatch(partido)
        };
      })
      .filter((item): item is UiFeedItem => item !== null)
      .sort((left, right) => {
        const leftPartido = partidosById.get(left.match.id);
        const rightPartido = partidosById.get(right.match.id);
        const leftTime = leftPartido?.fechaInicio.toMillis() ?? 0;
        const rightTime = rightPartido?.fechaInicio.toMillis() ?? 0;

        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }

        return left.result.player.name.localeCompare(right.result.player.name, 'es');
      });
  });

  protected reactionCountsFor(item: UiFeedItem): Readonly<Record<string, number>> {
    const targetId = item.result.targetId ?? '';
    const counts: Record<string, number> = {};

    for (const reaction of this.reaccionesSource() ?? []) {
      if (reaction.targetTipo !== 'pronostico' || reaction.targetId !== targetId) {
        continue;
      }

      counts[reaction.emoji] = (counts[reaction.emoji] ?? 0) + 1;
    }

    return counts;
  }

  protected myReactionFor(item: UiFeedItem): string | null {
    const targetId = item.result.targetId ?? '';

    return currentReaction(
      this.reaccionesSource() ?? [],
      'pronostico',
      targetId,
      this.userId()
    );
  }

  protected async handleReact(item: UiFeedItem, emoji: string): Promise<void> {
    const targetId = buildPronosticoId(item.result.player.id, item.match.id);
    const current = this.myReactionFor(item);

    if (current === emoji) {
      await this.reaccionesService.borrarMiReaccion('pronostico', targetId);
      return;
    }

    if (current !== null) {
      await this.reaccionesService.borrarMiReaccion('pronostico', targetId);
    }

    await this.reaccionesService.crearMiReaccion({
      targetTipo: 'pronostico',
      targetId,
      emoji
    });
  }
}
