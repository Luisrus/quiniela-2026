import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';

import { ComentariosService } from '../../../core/services/comentarios.service';
import { PronosticosService } from '../../../core/services/pronosticos.service';
import { ReaccionesService } from '../../../core/services/reacciones.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { buildPronosticoId } from '../../../core/models/pronostico.model';
import {
  currentReaction,
  playerMap,
  toPredictionResult,
  toUiPlayer
} from '../../utils/quiniela-view.mapper';
import type {
  UiComment,
  UiMatch,
  UiPlayer,
  UiPredictionResult,
  UiSheetTab
} from '../../models/quiniela-view.model';
import { AvatarComponent } from '../quiniela-ui/avatar.component';
import { EmptyStateComponent } from '../quiniela-ui/empty-state.component';
import { LiveDotComponent } from '../quiniela-ui/live-dot.component';
import { TeamFlagComponent } from '../quiniela-ui/team-flag.component';
import { BottomSheetComponent } from './bottom-sheet.component';
import { CommentItemComponent } from './comment-item.component';
import { PredRowComponent, type PredictionReactionEvent } from './pred-row.component';

@Component({
  selector: 'app-match-detail-sheet',
  standalone: true,
  imports: [
    AvatarComponent,
    BottomSheetComponent,
    CommentItemComponent,
    EmptyStateComponent,
    LiveDotComponent,
    PredRowComponent,
    TeamFlagComponent
  ],
  template: `
    <app-bottom-sheet (close)="close.emit()">
      <div sheet-title>
        <div style="display: flex; align-items: center; gap: 8px">
          <app-team-flag [name]="match.home.name" [url]="match.home.flag" [size]="24" />
          <span style="font-family: var(--font-score); font-size: 26px; font-weight: 900; letter-spacing: -0.01em">
            {{ sheetScore }}
          </span>
          <app-team-flag [name]="match.away.name" [url]="match.away.flag" [size]="24" />
          @if (isLive) {
            <span style="display: flex; align-items: center; gap: 5px; background: color-mix(in srgb, var(--live) 14%, transparent); padding: 3px 8px; border-radius: 10px">
              <app-live-dot [size]="6" />
              @if (match.minute !== null) {
                <span style="font-size: 11px; color: var(--live); font-weight: 700">{{ match.minute }}'</span>
              }
            </span>
          }
        </div>
        <p style="font-size: 11px; color: var(--text-tertiary); margin-top: 3px">
          {{ match.phase }} · {{ isPlayed ? '🔒 FINAL' : match.date }}
        </p>
      </div>

      <div style="display: flex; padding: 0 20px; flex-shrink: 0; border-bottom: 1px solid var(--bg-border)">
        <button type="button" (click)="tab.set('preds')" [attr.style]="tabStyle('preds')">
          Pronósticos
          <span [attr.style]="tabCountStyle('preds')">{{ matchPreds.length }}</span>
        </button>
        <button type="button" (click)="tab.set('comments')" [attr.style]="tabStyle('comments')">
          Comentarios
          <span [attr.style]="tabCountStyle('comments')">{{ comments.length }}</span>
        </button>
      </div>

      @if (tab() === 'preds') {
        <div style="flex: 1; overflow-y: auto; padding: 4px 20px 24px">
          @if (matchPreds.length === 0) {
            <app-empty-state emoji="🦗" title="Nadie ha pronosticado aún" sub="Sé el primero en la pestaña A pronosticar" />
          } @else {
            @for (result of matchPreds; track result.player.id) {
              <app-pred-row
                [result]="result"
                [isPlayed]="isPlayed"
                [userId]="userId"
                [predRx]="predRx"
                [myReact]="myPredReact(result.player.id)"
                (react)="handlePredReact($event)"
              />
            }
          }
        </div>
      }

      @if (tab() === 'comments') {
        <div style="flex: 1; overflow-y: auto; padding: 14px 20px 8px">
          @if (comments.length === 0) {
            <app-empty-state emoji="🤫" title="Silencio total" sub="Rompe el hielo, di algo" />
          } @else {
            @for (comment of comments; track comment.id) {
              <app-comment-item
                [comment]="comment"
                [players]="players"
                [userId]="userId"
                [isNew]="isNewComment(comment.id)"
              />
            }
          }
        </div>

        <div style="padding: 10px 16px; padding-bottom: max(10px, env(safe-area-inset-bottom, 10px)); border-top: 1px solid var(--bg-border); display: flex; gap: 8px; align-items: center; background: var(--bg-surface); flex-shrink: 0">
          @if (me; as currentUser) {
            <app-avatar [player]="currentUser" [size]="30" />
          }
          <input
            [value]="commentInput()"
            (input)="onCommentInput($event)"
            (keydown.enter)="submitComment()"
            (focus)="commentFocused.set(true)"
            (blur)="commentFocused.set(false)"
            maxlength="120"
            placeholder="Escribe algo..."
            [style.flex]="1"
            [style.padding]="'9px 14px'"
            [style.background]="'var(--bg-elevated)'"
            [style.border]="commentFocused() ? '1px solid var(--accent)' : '1px solid var(--bg-border)'"
            [style.border-radius]="'var(--r-full)'"
            [style.color]="'var(--text-primary)'"
            [style.font-family]="'var(--font-ui)'"
            [style.font-size.px]="13"
            [style.outline]="'none'"
            [style.transition]="'border-color var(--dur-fast)'"
          >
          <button
            type="button"
            (click)="submitComment()"
            [disabled]="!commentInput().trim()"
            [style.width.px]="36"
            [style.height.px]="36"
            [style.border-radius]="'50%'"
            [style.border]="'none'"
            [style.background]="commentInput().trim() ? 'var(--accent)' : 'var(--bg-elevated)'"
            [style.color]="commentInput().trim() ? 'var(--text-on-accent)' : 'var(--text-tertiary)'"
            [style.cursor]="commentInput().trim() ? 'pointer' : 'default'"
            [style.display]="'flex'"
            [style.align-items]="'center'"
            [style.justify-content]="'center'"
            [style.font-size.px]="18"
            [style.flex-shrink]="0"
            [style.transition]="'all 150ms var(--ease-smooth)'"
            [style.transform]="commentInput().trim() ? 'scale(1)' : 'scale(0.9)'"
          >
            ↑
          </button>
        </div>
      }
    </app-bottom-sheet>
  `
})
export class MatchDetailSheetComponent {
  private readonly usuariosService = inject(UsuariosService);
  private readonly pronosticosService = inject(PronosticosService);
  private readonly reaccionesService = inject(ReaccionesService);
  private readonly comentariosService = inject(ComentariosService);

  private readonly usuarios = toSignal(this.usuariosService.usuarios$(), {
    initialValue: [] as const
  });
  private readonly matchSource = signal<UiMatch | null>(null);
  private readonly pronosticos = toSignal(
    toObservable(this.matchSource).pipe(
      switchMap((match) =>
        match === null
          ? of([] as const)
          : this.pronosticosService.pronosticosPorPartido$(match.id)
      )
    ),
    {
      initialValue: [] as const
    }
  );
  private readonly reacciones = toSignal(
    toObservable(this.matchSource).pipe(
      switchMap((match) =>
        match === null
          ? of([] as const)
          : this.pronosticosService.pronosticosPorPartido$(match.id).pipe(
            switchMap((pronosticos) =>
              this.reaccionesService.reaccionesPorTargets$(
                'pronostico',
                pronosticos.map((pronostico) => pronostico.id)
              )
            )
          )
      )
    ),
    {
      initialValue: [] as const
    }
  );
  private readonly comentarios = toSignal(
    toObservable(this.matchSource).pipe(
      switchMap((match) =>
        match === null
          ? of([] as const)
          : this.comentariosService.comentariosPorPartido$(match.id)
      )
    ),
    {
      initialValue: [] as const
    }
  );

  @Input({ required: true }) set match(value: UiMatch) {
    this.matchSource.set(value);
  }

  get match(): UiMatch {
    const match = this.matchSource();

    if (match === null) {
      throw new Error('MatchDetailSheetComponent requiere match.');
    }

    return match;
  }
  @Input({ required: true }) userId!: string;
  @Input() set initialTab(value: UiSheetTab | null) {
    if (value !== null) {
      this.tab.set(value);
    }
  }
  @Output() readonly close = new EventEmitter<void>();

  protected readonly tab = signal<UiSheetTab>('preds');
  protected readonly commentInput = signal('');
  protected readonly commentFocused = signal(false);
  private readonly newCommentIds = signal<ReadonlySet<string>>(new Set<string>());

  get isPlayed(): boolean {
    return this.match.status === 'played';
  }

  get isLive(): boolean {
    return this.match.status === 'live';
  }

  get sheetScore(): string {
    return (this.isLive || this.isPlayed) && this.match.score !== null
      ? `${this.match.score.home} : ${this.match.score.away}`
      : 'vs';
  }

  get players(): readonly UiPlayer[] {
    return this.usuarios().map((usuario, index) => toUiPlayer(usuario, index + 1));
  }

  get me(): UiPlayer | undefined {
    return this.players.find((player) => player.id === this.userId);
  }

  get matchPreds(): readonly UiPredictionResult[] {
    const playersById = playerMap(this.players);

    return this.pronosticos()
      .filter((pronostico) => pronostico.partidoId === this.match.id)
      .map((pronostico) => {
        const player = playersById.get(pronostico.uid);

        if (player === undefined) {
          return null;
        }

        return toPredictionResult(pronostico, player);
      })
      .filter((result): result is UiPredictionResult => result !== null)
      .sort((left, right) => {
        if (this.isPlayed) {
          return (right.pts ?? -1) - (left.pts ?? -1);
        }

        return left.player.position - right.player.position;
      });
  }

  get comments(): readonly UiComment[] {
    return this.comentarios()
      .filter((comment) => comment.partidoId === this.match.id)
      .map((comment) => ({
        id: comment.id,
        playerId: comment.uid,
        text: comment.texto,
        ts: comment.creadoEn.toMillis()
      }));
  }

  get predRx(): Readonly<Record<string, Readonly<Record<string, number>>>> {
    const result: Record<string, Record<string, number>> = {};

    for (const reaction of this.reacciones()) {
      if (reaction.targetTipo !== 'pronostico') {
        continue;
      }

      const targetPrediction = this.matchPreds.find((prediction) => prediction.targetId === reaction.targetId);

      if (targetPrediction === undefined) {
        continue;
      }

      const playerId = targetPrediction.player.id;
      result[playerId] = result[playerId] ?? {};
      result[playerId][reaction.emoji] = (result[playerId][reaction.emoji] ?? 0) + 1;
    }

    return result;
  }

  protected tabStyle(tab: UiSheetTab): string {
    const active = this.tab() === tab;

    return [
      'flex: 1',
      'padding: 10px 4px',
      'background: none',
      'border: none',
      `border-bottom: ${active ? '2px solid var(--accent)' : '2px solid transparent'}`,
      `color: ${active ? 'var(--accent)' : 'var(--text-secondary)'}`,
      'font-family: var(--font-ui)',
      'font-size: 13px',
      `font-weight: ${active ? 700 : 500}`,
      'cursor: pointer',
      'display: flex',
      'align-items: center',
      'justify-content: center',
      'gap: 6px',
      'margin-bottom: -1px',
      'transition: all 200ms'
    ].join('; ');
  }

  protected tabCountStyle(tab: UiSheetTab): string {
    const active = this.tab() === tab;

    return [
      `background: ${active ? 'var(--accent-muted)' : 'var(--bg-elevated)'}`,
      `color: ${active ? 'var(--accent)' : 'var(--text-tertiary)'}`,
      'padding: 1px 6px',
      'border-radius: 10px',
      'font-size: 11px',
      'font-weight: 700'
    ].join('; ');
  }

  protected myPredReact(playerId: string): string | null {
    const targetId = buildPronosticoId(playerId, this.match.id);

    return currentReaction(this.reacciones(), 'pronostico', targetId, this.userId);
  }

  protected async handlePredReact(event: PredictionReactionEvent): Promise<void> {
    const targetId = buildPronosticoId(event.playerId, this.match.id);
    const current = this.myPredReact(event.playerId);

    if (current === event.emoji) {
      await this.reaccionesService.borrarMiReaccion('pronostico', targetId);
      return;
    }

    if (current !== null) {
      await this.reaccionesService.borrarMiReaccion('pronostico', targetId);
    }

    await this.reaccionesService.crearMiReaccion({
      targetTipo: 'pronostico',
      targetId,
      emoji: event.emoji
    });
  }

  protected onCommentInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.commentInput.set(input.value);
  }

  protected async submitComment(): Promise<void> {
    const text = this.commentInput().trim();

    if (!text) {
      return;
    }

    const id = await this.comentariosService.crearComentario({
      partidoId: this.match.id,
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
}
