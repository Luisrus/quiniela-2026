import { computed, Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import { resolveCrestUrl } from '../../core/config/equipos-crest.config';
import { EQUIPOS_MUNDIALISTAS, type EquipoMundialista } from '../../core/config/torneo.config';
import { AuthService } from '../../core/services/auth.service';
import { esTitular } from '../../core/utils/usuario-tipo.util';
import { PartidosService } from '../../core/services/partidos.service';
import { PronosticosService } from '../../core/services/pronosticos.service';
import { PronosticosEspecialesService } from '../../core/services/pronosticos-especiales.service';
import { MessagingService, type MessagingEstado } from '../../core/services/messaging.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import {
  PREMIOS_ESPECIALES,
  type PremioEspecialMeta,
  type PronosticoEspecialTipo
} from '../../core/models/pronostico-especial.model';
import type { Pronostico } from '../../core/models/pronostico.model';
import { AvatarComponent } from '../../shared/components/quiniela-ui/avatar.component';
import { EmptyStateComponent } from '../../shared/components/quiniela-ui/empty-state.component';
import { SkeletonCardComponent } from '../../shared/components/quiniela-ui/skeleton-card.component';
import { StatBlockComponent } from '../../shared/components/quiniela-ui/stat-block.component';
import { StreakCrownsComponent } from '../../shared/components/quiniela-ui/streak-crowns.component';
import { TeamFlagComponent } from '../../shared/components/quiniela-ui/team-flag.component';
import type { UiMatch } from '../../shared/models/quiniela-view.model';
import { toUiMatch, toUiPlayer } from '../../shared/utils/quiniela-view.mapper';

interface ProfileHistoryItem {
  readonly match: UiMatch;
  readonly pred: Pronostico;
}

/** Badge social de predicción especial — solo informativo, no da puntos. */
interface OracleBadge {
  readonly tipo: PronosticoEspecialTipo;
  readonly label: string;
  readonly pick: string;
  readonly acerto: boolean;
  readonly emoji: string;
}

@Component({
  selector: 'app-perfil-page',
  standalone: true,
  imports: [
    AvatarComponent,
    EmptyStateComponent,
    SkeletonCardComponent,
    StatBlockComponent,
    RouterLink,
    StreakCrownsComponent,
    TeamFlagComponent
  ],
  templateUrl: './perfil.page.html',
  styleUrl: './perfil.page.scss'
})
export class PerfilPage {
  private readonly auth = inject(AuthService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly partidosService = inject(PartidosService);
  private readonly pronosticosService = inject(PronosticosService);
  private readonly especialesService = inject(PronosticosEspecialesService);
  private readonly router = inject(Router);
  private readonly messagingService = inject(MessagingService);

  private readonly usuariosSource = toSignal(this.usuariosService.usuarios$(), {
    initialValue: undefined
  });
  private readonly partidosSource = toSignal(this.partidosService.partidos$(), {
    initialValue: undefined
  });
  private readonly pronosticosSource = toSignal(this.pronosticosService.pronosticos$(), {
    initialValue: undefined
  });
  private readonly especialesSource = toSignal(this.especialesService.misPronosticosEspeciales$(), {
    initialValue: undefined
  });
  private readonly configTorneoSource = toSignal(this.especialesService.configTorneo$(), {
    initialValue: undefined
  });

  protected readonly userId = computed(() => this.auth.userProfile()?.uid ?? '');
  protected readonly equipos: readonly EquipoMundialista[] = EQUIPOS_MUNDIALISTAS;
  protected readonly savingEquipo = signal(false);
  protected readonly guardandoNotificaciones = signal(false);
  protected readonly cerrandoSesion = signal(false);
  protected readonly notificacionesEstado = signal<MessagingEstado>('pendiente');
  protected readonly skeletonRows: readonly number[] = [1, 2, 3];

  constructor() {
    this.notificacionesEstado.set(this.messagingService.estadoActual());
    this.messagingService.iniciarEscuchaPrimerPlano();

    effect(() => {
      const uid = this.userId();
      const usuarios = this.usuariosSource();

      if (uid === '' || usuarios === undefined) {
        return;
      }

      const hasProfile = usuarios.some((usuario) => usuario.uid === uid);

      if (!hasProfile) {
        void this.usuariosService.ensureOwnUsuario();
      }
    });
  }

  protected readonly isLoading = computed(() => {
    if (
      this.usuariosSource() === undefined ||
      this.partidosSource() === undefined ||
      this.pronosticosSource() === undefined
    ) {
      return true;
    }

    const uid = this.userId();

    if (uid === '') {
      return true;
    }

    return this.player() === null;
  });

  protected readonly players = computed(() =>
    [...(this.usuariosSource() ?? [])]
      .sort((left, right) => right.puntos - left.puntos)
      .map((usuario, index) => toUiPlayer(usuario, index + 1))
  );

  protected readonly player = computed(() =>
    this.players().find((item) => item.id === this.userId()) ?? null
  );

  protected readonly equipoFavoritoActual = computed(() => {
    const usuario = (this.usuariosSource() ?? []).find((item) => item.uid === this.userId());
    return usuario?.equipoFavorito ?? null;
  });

  protected readonly esAdmin = computed(() => {
    const usuario = (this.usuariosSource() ?? []).find((item) => item.uid === this.userId());
    return usuario?.esAdmin === true;
  });

  protected readonly puedeVerWrapped = computed(() => {
    const usuario = (this.usuariosSource() ?? []).find((item) => item.uid === this.userId());
    return usuario !== undefined && esTitular(usuario.tipo);
  });

  protected readonly played = computed(() =>
    (this.partidosSource() ?? [])
      .filter((partido) => partido.estado === 'finalizado')
      .map((partido) => toUiMatch(partido))
  );

  protected readonly history = computed<readonly ProfileHistoryItem[]>(() => {
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
      .filter((item): item is ProfileHistoryItem => item !== null);
  });

  protected readonly exactCount = computed(() =>
    this.history().filter((item) => item.pred.puntosGanados === 3).length
  );

  protected readonly correctCount = computed(() =>
    this.history().filter((item) => item.pred.puntosGanados === 1).length
  );

  protected readonly premios: readonly PremioEspecialMeta[] = PREMIOS_ESPECIALES;

  /**
   * Picks especiales del usuario. Los badges de "acertó/erró" solo aparecen
   * cuando el admin haya cargado el resultado real en config/torneo.
   */
  protected readonly misEspeciales = computed(() => this.especialesSource() ?? []);

  protected pickEspecial(tipo: PronosticoEspecialTipo): string | null {
    return this.misEspeciales().find((e) => e.tipo === tipo)?.valor ?? null;
  }

  protected oracleBadgeFor(tipo: PronosticoEspecialTipo): OracleBadge | null {
    return this.oracleBadges().find((badge) => badge.tipo === tipo) ?? null;
  }

  /**
   * Badges del oráculo: solo visibles cuando el torneo terminó y el admin
   * cargó los ganadores reales en Firestore (config/torneo).
   */
  protected readonly oracleBadges = computed<readonly OracleBadge[]>(() => {
    const config = this.configTorneoSource();

    if (!config) {
      return [];
    }

    const comparaciones: ReadonlyArray<{
      tipo: PronosticoEspecialTipo;
      real: string | null | undefined;
      label: string;
    }> = [
      { tipo: 'campeon', real: config.campeonReal, label: 'Campeón' },
      { tipo: 'balon_oro', real: config.balonOroReal, label: 'Balón de Oro' },
      { tipo: 'goleador', real: config.goleadorReal, label: 'Bota de Oro' },
      { tipo: 'guante_oro', real: config.guanteOroReal, label: 'Guante de Oro' }
    ];

    return comparaciones.flatMap(({ tipo, real, label }) => {
      const pick = this.pickEspecial(tipo);

      if (real === null || real === undefined || pick === null) {
        return [];
      }

      const acerto = pick === real;

      return [{
        tipo,
        label,
        pick,
        acerto,
        emoji: acerto ? '🔮 Lo predijo' : '🔮 Le erró'
      }];
    });
  });

  protected ptColor(points: number | null): string {
    return points === 3
      ? 'var(--pt-exact)'
      : points === 1
        ? 'var(--pt-correct)'
        : 'var(--pt-miss)';
  }

  protected irAEspeciales(): void {
    this.router.navigate(['/especiales']);
  }

  protected irAWrapped(): void {
    void this.router.navigate(['/wrapped']);
  }

  protected banderaFor(nombreEquipo: string | null): string {
    return resolveCrestUrl(nombreEquipo ?? '');
  }

  protected notificacionesLabel(estado: MessagingEstado): string {
    const labels: Record<MessagingEstado, string> = {
      activo: 'Activadas',
      denegado: 'Bloqueadas en el navegador',
      no_soportado: 'No disponibles en este dispositivo',
      pendiente: 'Sin activar'
    };

    return labels[estado];
  }

  protected async activarNotificaciones(): Promise<void> {
    this.guardandoNotificaciones.set(true);

    try {
      const activado = await this.messagingService.solicitarPermisoYGuardarToken();
      this.notificacionesEstado.set(
        activado ? 'activo' : this.messagingService.estadoActual()
      );
    } finally {
      this.guardandoNotificaciones.set(false);
    }
  }

  protected async desactivarNotificaciones(): Promise<void> {
    this.guardandoNotificaciones.set(true);

    try {
      await this.messagingService.desactivarNotificaciones();
      this.notificacionesEstado.set(this.messagingService.estadoActual());
    } finally {
      this.guardandoNotificaciones.set(false);
    }
  }

  protected async cerrarSesion(): Promise<void> {
    this.cerrandoSesion.set(true);

    try {
      await this.auth.signOut();
      await this.router.navigateByUrl('/login');
    } finally {
      this.cerrandoSesion.set(false);
    }
  }

  protected async guardarEquipoFavorito(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const valor = select.value || null;

    this.savingEquipo.set(true);

    try {
      await this.usuariosService.updateEquipoFavorito(valor);
    } finally {
      this.savingEquipo.set(false);
    }
  }
}
