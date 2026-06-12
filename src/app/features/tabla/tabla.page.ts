import { NgStyle, NgTemplateOutlet } from '@angular/common';
import { computed, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartConfiguration, ChartOptions } from 'chart.js';

import { AuthService } from '../../core/services/auth.service';
import { MedallasService } from '../../core/services/medallas.service';
import { PartidosService } from '../../core/services/partidos.service';
import { PronosticosService } from '../../core/services/pronosticos.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { esTitular } from '../../core/utils/usuario-tipo.util';
import type { Usuario } from '../../core/models/usuario.model';
import { AvatarComponent } from '../../shared/components/quiniela-ui/avatar.component';
import { BadgeComponent } from '../../shared/components/quiniela-ui/badge.component';
import { StreakCrownsComponent } from '../../shared/components/quiniela-ui/streak-crowns.component';
import { TeamFlagComponent } from '../../shared/components/quiniela-ui/team-flag.component';
import { EmptyStateComponent } from '../../shared/components/quiniela-ui/empty-state.component';
import { SkeletonCardComponent } from '../../shared/components/quiniela-ui/skeleton-card.component';
import type { UiPlayer } from '../../shared/models/quiniela-view.model';
import type { StyleMap } from '../../shared/models/style-value.model';
import { toUiPlayer } from '../../shared/utils/quiniela-view.mapper';

interface TablaPlayer extends UiPlayer {
  readonly liveTotal: number;
  readonly liveDelta: number;
  readonly esInvitado: boolean;
  readonly historialPuntos: readonly { jornadaKey: string; puntos: number }[];
}

type TablaRowVariant = 'main' | 'guest';

interface TablaRowContext {
  readonly $implicit: TablaPlayer;
  readonly position: number;
  readonly variant: TablaRowVariant;
}

@Component({
  selector: 'app-tabla-page',
  standalone: true,
  imports: [
    AvatarComponent,
    BadgeComponent,
    EmptyStateComponent,
    NgStyle,
    NgTemplateOutlet,
    SkeletonCardComponent,
    StreakCrownsComponent,
    TeamFlagComponent,
    BaseChartDirective
  ],
  templateUrl: './tabla.page.html',
  styleUrl: './tabla.page.scss'
})
export class TablaPage {
  private readonly auth = inject(AuthService);
  private readonly medallasService = inject(MedallasService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly partidosService = inject(PartidosService);
  private readonly pronosticosService = inject(PronosticosService);

  private readonly usuariosSource = toSignal(this.usuariosService.usuarios$(), {
    initialValue: undefined
  });
  private readonly partidosSource = toSignal(this.partidosService.partidos$(), {
    initialValue: undefined
  });
  private readonly pronosticosSource = toSignal(this.pronosticosService.pronosticos$(), {
    initialValue: undefined
  });
  private readonly medallasRecientesSource = toSignal(this.medallasService.medallasRecientes$(), {
    initialValue: [] as const
  });

  protected readonly skeletonRows: readonly number[] = [1, 2, 3];
  protected readonly invitadosExpanded = signal(false);
  protected readonly viewMode = signal<'tabla' | 'grafica'>('tabla');
  protected readonly chartFilter = signal<'todos' | 'mio'>('todos');

  protected readonly userId = computed(() => this.auth.userProfile()?.uid ?? '');
  protected readonly isLoading = computed(() =>
    this.usuariosSource() === undefined || 
    this.partidosSource() === undefined ||
    this.pronosticosSource() === undefined
  );

  protected readonly hasLiveMatch = computed(() =>
    (this.partidosSource() ?? []).some((partido) => partido.estado === 'en_juego')
  );

  protected readonly titularesPlayers = computed(() =>
    this.buildRankedPlayers(
      (this.usuariosSource() ?? []).filter((usuario) => esTitular(usuario.tipo)),
      true
    )
  );

  protected readonly invitadosPlayers = computed(() =>
    this.buildRankedPlayers(
      (this.usuariosSource() ?? []).filter((usuario) => usuario.tipo === 'invitado'),
      false
    )
  );

  protected readonly hasAnyPlayer = computed(() =>
    this.titularesPlayers().length > 0 || this.invitadosPlayers().length > 0
  );

  protected readonly playedCount = computed(() =>
    (this.partidosSource() ?? []).filter((partido) => partido.estado === 'finalizado').length
  );

  protected readonly chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: 'var(--text-primary)', font: { family: 'var(--font-ui)', size: 12, weight: 'bold' } } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { ticks: { color: 'var(--text-secondary)', font: { family: 'var(--font-ui)' } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
      y: { beginAtZero: true, ticks: { color: 'var(--text-secondary)', font: { family: 'var(--font-ui)' } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
    }
  };

  protected readonly chartData = computed<ChartConfiguration<'line'>['data'] | undefined>(() => {
    const usuarios = this.titularesPlayers();
    const topUsuarios = usuarios.slice(0, 10);
    
    if (topUsuarios.length === 0) return undefined;

    const partidos = this.partidosSource() ?? [];
    const pronosticos = this.pronosticosSource() ?? [];

    const getJornadaKey = (partido: any) => {
      const j = partido.jornada == null ? partido.fase : partido.jornada;
      return `J${j}`;
    };

    // Mapear partidoId -> jornadaKey para partidos finalizados
    const partidoAJornada = new Map<string, string>();
    partidos.forEach(p => {
      if (p.estado === 'finalizado') {
        partidoAJornada.set(p.id, getJornadaKey(p));
      }
    });

    const jornadasSet = new Set<string>(Array.from(partidoAJornada.values()));
    const labels = Array.from(jornadasSet).sort();

    if (labels.length === 0) return undefined;

    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#f97316', '#d946ef', '#84cc16', '#6366f1'
    ];

    let datasets = topUsuarios.map((p, index) => {
      // Calcular los puntos dinamicamente agrupando por jornada
      const puntosPorJornada = new Map<string, number>();
      
      const misPronosticos = pronosticos.filter(pr => pr.uid === p.id && pr.puntosGanados != null);
      for (const pr of misPronosticos) {
        const jornada = partidoAJornada.get(pr.partidoId);
        if (jornada) {
          puntosPorJornada.set(jornada, (puntosPorJornada.get(jornada) || 0) + pr.puntosGanados!);
        }
      }

      let lastScore = 0;
      const data = labels.map(label => {
        const delta = puntosPorJornada.get(label) || 0;
        lastScore += delta;
        return lastScore;
      });

      const isMe = p.id === this.userId();

      return {
        data,
        label: p.name + (isMe ? ' (Tú)' : ''),
        isMe,
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        borderWidth: 3,
        pointBackgroundColor: colors[index % colors.length],
        tension: 0.4,
        fill: true,
      };
    });

    if (this.chartFilter() === 'mio') {
      datasets = datasets.filter(d => d.isMe);
    }

    return { labels, datasets };
  });

  protected toggleInvitadosSection(): void {
    this.invitadosExpanded.update((expanded) => !expanded);
  }

  protected rowContext(player: TablaPlayer, position: number, variant: TablaRowVariant): TablaRowContext {
    return { $implicit: player, position, variant };
  }

  protected rankLabel(position: number, variant: TablaRowVariant): string | number {
    if (variant === 'guest' && position > 3) {
      return position;
    }

    const rankIcons: Readonly<Record<number, string>> = {
      1: '👑',
      2: '🥈',
      3: '🥉'
    };

    return rankIcons[position] ?? position;
  }

  protected rowStyle(position: number, isMe: boolean, variant: TablaRowVariant): StyleMap {
    let rowBg = 'var(--bg-surface)';
    let rowBorder = '1px solid transparent';
    let rowShadow = 'var(--sh-card)';

    if (variant === 'guest') {
      rowBorder = '1px dashed color-mix(in srgb, var(--text-tertiary) 45%, transparent)';
    }

    if (isMe) {
      rowBg = 'var(--accent-muted)';
      rowBorder = '1px solid rgba(180,240,64,0.25)';
      rowShadow = 'var(--sh-accent)';
    } else if (position === 1) {
      rowBg = 'var(--bg-elevated)';
      rowShadow = variant === 'guest' ? 'var(--sh-card)' : 'var(--sh-gold)';
    } else if (position <= 3) {
      rowBg = 'var(--bg-elevated)';
    }

    return {
      padding: '12px 14px',
      background: rowBg,
      border: rowBorder,
      'box-shadow': rowShadow,
      display: 'flex',
      'align-items': 'center',
      gap: '12px'
    };
  }

  protected rankStyle(position: number, variant: TablaRowVariant): StyleMap {
    const isTop = position <= 3 && variant === 'main';

    return {
      width: '30px',
      'flex-shrink': 0,
      'text-align': 'center',
      'font-family': isTop ? 'var(--font-ui)' : 'var(--font-score)',
      'font-size': isTop ? '22px' : '18px',
      'font-weight': 800,
      color: position === 1 && variant === 'main'
        ? 'var(--gold)'
        : position <= 3 && variant === 'main'
          ? 'var(--text-secondary)'
          : 'var(--text-tertiary)'
    };
  }

  protected pointColor(position: number, isMe: boolean, variant: TablaRowVariant): string {
    if (position === 1 && variant === 'main') {
      return 'var(--gold)';
    }

    if (isMe) {
      return 'var(--accent)';
    }

    return 'var(--text-primary)';
  }

  private buildRankedPlayers(usuarios: readonly Usuario[], includeMedals: boolean): TablaPlayer[] {
    return [...usuarios]
      .map((usuario) => {
        const liveTotal = this.hasLiveMatch()
          ? usuario.puntosProvisionales ?? usuario.puntos
          : usuario.puntos;
        const liveDelta = this.hasLiveMatch()
          ? Math.max(0, liveTotal - usuario.puntos)
          : 0;

        return {
          usuario,
          liveTotal,
          liveDelta
        };
      })
      .sort((left, right) =>
        right.liveTotal - left.liveTotal ||
        right.usuario.puntos - left.usuario.puntos ||
        left.usuario.nombre.localeCompare(right.usuario.nombre)
      )
      .map<TablaPlayer>((item, index) => ({
        ...toUiPlayer(item.usuario, index + 1),
        medals: includeMedals
          ? this.medallasService.labelsForUid(
            this.medallasRecientesSource(),
            item.usuario.uid
          )
          : [],
        liveTotal: item.liveTotal,
        liveDelta: item.liveDelta,
        esInvitado: item.usuario.tipo === 'invitado',
        historialPuntos: item.usuario.historialPuntos || []
      }));
  }
}
