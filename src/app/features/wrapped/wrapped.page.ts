import { computed, Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { of, switchMap } from 'rxjs';

import { resolveCrestUrl } from '../../core/config/equipos-crest.config';
import {
  PREMIOS_ESPECIALES,
  type PremioEspecialMeta,
  type PronosticoEspecialTipo
} from '../../core/models/pronostico-especial.model';
import { AuthService } from '../../core/services/auth.service';
import { PartidosService } from '../../core/services/partidos.service';
import { PronosticosService } from '../../core/services/pronosticos.service';
import { PronosticosEspecialesService } from '../../core/services/pronosticos-especiales.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { uniqueStrings } from '../../core/utils/partido-dia.util';
import { esTitular } from '../../core/utils/usuario-tipo.util';
import type { Pronostico } from '../../core/models/pronostico.model';
import { AvatarComponent } from '../../shared/components/quiniela-ui/avatar.component';
import { EmptyStateComponent } from '../../shared/components/quiniela-ui/empty-state.component';
import { SkeletonCardComponent } from '../../shared/components/quiniela-ui/skeleton-card.component';
import { StatBlockComponent } from '../../shared/components/quiniela-ui/stat-block.component';
import { StreakCrownsComponent } from '../../shared/components/quiniela-ui/streak-crowns.component';
import { TeamFlagComponent } from '../../shared/components/quiniela-ui/team-flag.component';
import type { UiMatch } from '../../shared/models/quiniela-view.model';
import { toUiMatch, toUiPlayer } from '../../shared/utils/quiniela-view.mapper';

interface WrappedHistoryItem {
  readonly match: UiMatch;
  readonly pred: Pronostico;
}

@Component({
  selector: 'app-wrapped-page',
  standalone: true,
  imports: [
    AvatarComponent,
    EmptyStateComponent,
    SkeletonCardComponent,
    StatBlockComponent,
    StreakCrownsComponent,
    TeamFlagComponent
  ],
  templateUrl: './wrapped.page.html',
  styleUrl: './wrapped.page.scss'
})
export class WrappedPage {
  private readonly auth = inject(AuthService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly partidosService = inject(PartidosService);
  private readonly pronosticosService = inject(PronosticosService);
  private readonly especialesService = inject(PronosticosEspecialesService);
  private readonly router = inject(Router);

  private readonly usuariosSource = toSignal(this.usuariosService.usuarios$(), {
    initialValue: undefined
  });
  private readonly especialesSource = toSignal(this.especialesService.misPronosticosEspeciales$(), {
    initialValue: undefined
  });

  protected readonly slideIndex = signal(0);
  protected readonly skeletonRows: readonly number[] = [1, 2, 3];

  protected readonly userId = computed(() => this.auth.userProfile()?.uid ?? '');
  private readonly pronosticosSource = toSignal(
    toObservable(this.userId).pipe(
      switchMap((uid) =>
        uid === ''
          ? of(undefined)
          : this.pronosticosService.pronosticosPorUsuario$(uid)
      )
    ),
    { initialValue: undefined }
  );
  private readonly partidoIds = computed(() =>
    uniqueStrings((this.pronosticosSource() ?? []).map((pronostico) => pronostico.partidoId))
  );
  private readonly partidosLoadKey = computed(() => {
    if (this.pronosticosSource() === undefined) {
      return undefined;
    }

    return this.partidoIds().join('|');
  });
  private readonly partidosSource = toSignal(
    toObservable(this.partidosLoadKey).pipe(
      switchMap((loadKey) => {
        if (loadKey === undefined) {
          return of(undefined);
        }

        if (loadKey === '') {
          return of([] as const);
        }

        return this.partidosService.partidosPorIds$(loadKey.split('|'));
      })
    ),
    { initialValue: undefined }
  );

  protected readonly isLoading = computed(() =>
    this.usuariosSource() === undefined ||
    this.partidosSource() === undefined ||
    this.pronosticosSource() === undefined
  );

  protected readonly esInvitado = computed(() => {
    const usuario = (this.usuariosSource() ?? []).find((item) => item.uid === this.userId());
    return usuario !== undefined && !esTitular(usuario.tipo);
  });

  protected readonly titularesPlayers = computed(() =>
    [...(this.usuariosSource() ?? [])]
      .filter((usuario) => esTitular(usuario.tipo))
      .sort((left, right) => right.puntos - left.puntos)
      .map((usuario, index) => toUiPlayer(usuario, index + 1))
  );

  protected readonly jugadorTitular = computed(() =>
    this.titularesPlayers().find((item) => item.id === this.userId()) ?? null
  );

  protected readonly played = computed(() =>
    (this.partidosSource() ?? [])
      .filter((partido) => partido.estado === 'finalizado')
      .map((partido) => toUiMatch(partido))
  );

  protected readonly history = computed<readonly WrappedHistoryItem[]>(() => {
    const userId = this.userId();
    const playedIds = new Set(this.played().map((match) => match.id));
    const matchesById = new Map(this.played().map((match) => [match.id, match]));

    return (this.pronosticosSource() ?? [])
      .filter((pronostico) => pronostico.uid === userId && playedIds.has(pronostico.partidoId))
      .map((pronostico) => {
        const match = matchesById.get(pronostico.partidoId);

        if (match === undefined) {
          return null;
        }

        return { match, pred: pronostico };
      })
      .filter((item): item is WrappedHistoryItem => item !== null);
  });

  protected readonly exactCount = computed(() =>
    this.history().filter((item) => item.pred.puntosGanados === 3).length
  );

  protected readonly correctCount = computed(() =>
    this.history().filter((item) => item.pred.puntosGanados === 1).length
  );

  protected readonly missCount = computed(() =>
    this.history().filter((item) => item.pred.puntosGanados === 0).length
  );

  protected readonly mejorPartido = computed(() => {
    const exactos = this.history().filter((item) => item.pred.puntosGanados === 3);
    return exactos[0] ?? null;
  });

  protected readonly premios: readonly PremioEspecialMeta[] = PREMIOS_ESPECIALES;

  protected readonly picksOraculo = computed(() =>
    PREMIOS_ESPECIALES.flatMap((premio) => {
      const valor = this.especialesSource()?.find((e) => e.tipo === premio.tipo)?.valor ?? null;

      if (valor === null) {
        return [];
      }

      return [{ premio, valor }];
    })
  );

  protected readonly tieneOraculo = computed(() => this.picksOraculo().length > 0);

  protected esEquipo(tipo: PronosticoEspecialTipo): boolean {
    return tipo === 'campeon';
  }

  protected readonly totalSlides = computed(() => {
    let total = 5;

    if (this.mejorPartido() !== null) {
      total += 1;
    }

    if (this.tieneOraculo()) {
      total += 1;
    }

    return total;
  });

  protected readonly slideLabels = computed(() => {
    const labels = ['intro', 'ranking', 'precision', 'rachas', 'cierre'];

    if (this.mejorPartido() !== null) {
      labels.splice(4, 0, 'mejor');
    }

    if (this.tieneOraculo()) {
      const insertAt = this.mejorPartido() !== null ? 5 : 4;
      labels.splice(insertAt, 0, 'oraculo');
    }

    return labels;
  });

  protected readonly slideActual = computed(() => this.slideLabels()[this.slideIndex()] ?? 'intro');

  protected readonly usuarioRaw = computed(() =>
    (this.usuariosSource() ?? []).find((item) => item.uid === this.userId())
  );

  protected readonly rachaMaxima = computed(() => this.usuarioRaw()?.rachaAciertosMaxima ?? 0);
  protected readonly rachaExactosMaxima = computed(() => this.usuarioRaw()?.rachaExactosMaxima ?? 0);

  protected banderaFor(nombreEquipo: string | null): string {
    return resolveCrestUrl(nombreEquipo ?? '');
  }

  protected avanzar(): void {
    const next = this.slideIndex() + 1;

    if (next >= this.totalSlides()) {
      return;
    }

    this.slideIndex.set(next);
  }

  protected retroceder(): void {
    const prev = this.slideIndex() - 1;

    if (prev < 0) {
      return;
    }

    this.slideIndex.set(prev);
  }

  protected volver(): void {
    void this.router.navigate(['/perfil']);
  }
}
