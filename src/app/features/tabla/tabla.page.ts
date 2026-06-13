import { NgStyle, NgTemplateOutlet } from '@angular/common';
import { computed, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartConfiguration, ChartOptions } from 'chart.js';

import { AuthService } from '../../core/services/auth.service';
import { MedallasService } from '../../core/services/medallas.service';
import { PartidosService } from '../../core/services/partidos.service';
import { TorneosService } from '../../core/services/torneos.service';
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
  private readonly torneosService = inject(TorneosService);

  private readonly usuariosSource = toSignal(this.usuariosService.usuarios$(), {
    initialValue: undefined
  });
  private readonly hasLiveMatchSource = toSignal(this.partidosService.hayPartidoEnVivo$(), {
    initialValue: undefined
  });
  private readonly playedCountSource = toSignal(this.partidosService.conteoPorEstado$('finalizado'), {
    initialValue: undefined
  });
  private readonly medallasRecientesSource = toSignal(this.medallasService.medallasRecientes$(), {
    initialValue: [] as const
  });
  private readonly torneosSource = toSignal(this.torneosService.torneos$(), {
    initialValue: undefined
  });

  protected readonly skeletonRows: readonly number[] = [1, 2, 3];
  protected readonly invitadosExpanded = signal(false);
  protected readonly viewMode = signal<'tabla' | 'grafica'>('tabla');
  protected readonly chartFilter = signal<'todos' | 'mio'>('todos');
  protected readonly selectedTorneoId = signal<string>('global');

  protected readonly userId = computed(() => this.auth.userProfile()?.uid ?? '');
  protected readonly isLoading = computed(() =>
    this.usuariosSource() === undefined ||
    this.hasLiveMatchSource() === undefined ||
    this.playedCountSource() === undefined ||
    this.torneosSource() === undefined
  );

  protected readonly torneosDisponibles = computed(() => {
    const torneos = this.torneosSource() ?? [];
    return [...torneos].sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  protected readonly activeTorneo = computed(() => {
    const torneos = this.torneosSource() ?? [];
    return torneos.find(t => t.id === this.selectedTorneoId());
  });

  protected readonly hasLiveMatch = computed(() => this.hasLiveMatchSource() === true);

  protected readonly titularesPlayers = computed(() => {
    const active = this.activeTorneo();
    const users = (this.usuariosSource() ?? [])
      .filter((usuario) => esTitular(usuario.tipo))
      .filter((usuario) => active ? active.participantes.includes(usuario.uid) : true);
    return this.buildRankedPlayers(users, true, active?.id);
  });

  protected readonly invitadosPlayers = computed(() => {
    const active = this.activeTorneo();
    const users = (this.usuariosSource() ?? [])
      .filter((usuario) => usuario.tipo === 'invitado')
      .filter((usuario) => active ? active.participantes.includes(usuario.uid) : true);
    return this.buildRankedPlayers(users, false, active?.id);
  });

  protected readonly hasAnyPlayer = computed(() =>
    this.titularesPlayers().length > 0 || this.invitadosPlayers().length > 0
  );

  protected readonly playedCount = computed(() => this.playedCountSource() ?? 0);

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

    const labels = [
      ...new Set(topUsuarios.flatMap((player) =>
        player.historialPuntos.map((entry) => entry.jornadaKey)
      ))
    ].sort(compareJornadaKeys);

    // Mapear partidoId -> jornadaKey para partidos finalizados y válidos para el torneo
    if (labels.length === 0) return undefined;

    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#f97316', '#d946ef', '#84cc16', '#6366f1'
    ];

    let datasets = topUsuarios.map((p, index) => {
      const puntosPorJornada = new Map(
        p.historialPuntos.map((entry) => [entry.jornadaKey, entry.puntos])
      );

      let lastScore = 0;
      const data = labels.map(label => {
        lastScore = puntosPorJornada.get(label) ?? lastScore;
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
      rowBorder = '1px solid color-mix(in srgb, var(--accent) 25%, transparent)';
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

  private buildRankedPlayers(usuarios: readonly Usuario[], includeMedals: boolean, torneoId?: string): TablaPlayer[] {
    return [...usuarios]
      .map((usuario) => {
        let pts = usuario.puntos;
        let prov = usuario.puntosProvisionales;
        let delta = 0;

        if (torneoId) {
          pts = usuario.puntosPorTorneo?.[torneoId] ?? 0;
          prov = usuario.puntosProvisionalesPorTorneo?.[torneoId] ?? pts;
          delta = this.hasLiveMatch() ? Math.max(0, prov - pts) : 0;
        } else {
          delta = this.hasLiveMatch() ? Math.max(0, (prov ?? pts) - pts) : 0;
        }

        const liveTotal = this.hasLiveMatch() && prov !== undefined ? prov : pts;

        return {
          usuario,
          liveTotal,
          liveDelta: delta,
          puntosBase: pts
        };
      })
      .sort((left, right) =>
        right.liveTotal - left.liveTotal ||
        right.puntosBase - left.puntosBase ||
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
        historialPuntos: torneoId
          ? item.usuario.historialPuntosPorTorneo?.[torneoId] ?? []
          : item.usuario.historialPuntos || []
      }));
  }
}

function compareJornadaKeys(left: string, right: string): number {
  return jornadaSortValue(left) - jornadaSortValue(right) || left.localeCompare(right, 'es');
}

function jornadaSortValue(value: string): number {
  const match = /^J(\d+)$/.exec(value);

  if (match === null) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Number(match[1]);
}
