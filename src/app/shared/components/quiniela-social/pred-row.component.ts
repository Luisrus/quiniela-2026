import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { UiPredictionResult } from '../../models/quiniela-view.model';
import { AvatarComponent } from '../quiniela-ui/avatar.component';

export interface PredictionReactionEvent {
  readonly playerId: string;
  readonly emoji: string;
}

@Component({
  selector: 'app-pred-row',
  standalone: true,
  imports: [AvatarComponent],
  template: `
    <div style="padding: 11px 0; border-bottom: 1px solid var(--bg-border)">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 7px">
        <app-avatar [player]="result.player" [size]="34" />
        <span
          [style.flex]="1"
          [style.font-weight]="isMe ? 700 : 600"
          [style.font-size.px]="14"
          [style.color]="isMe ? 'var(--accent)' : 'var(--text-primary)'"
        >
          {{ result.player.name }}@if (isMe) { · tú }
        </span>
        <span style="font-family: var(--font-score); font-size: 22px; font-weight: 800; color: var(--text-secondary); letter-spacing: -0.01em">
          {{ result.pred.home }}–{{ result.pred.away }}
        </span>
        @if (isPlayed && result.pts !== null) {
          <div style="min-width: 32px; text-align: right">
            <div [style.font-family]="'var(--font-score)'" [style.font-size.px]="26" [style.font-weight]="900" [style.color]="ptColor" [style.line-height]="1">
              {{ result.pts }}
            </div>
            <div style="font-size: 9px; color: var(--text-tertiary); font-weight: 600">pts</div>
          </div>
        }
        @if (!isPlayed) {
          <span style="font-size: 10px; color: var(--text-tertiary); background: var(--bg-elevated); padding: 2px 7px; border-radius: 6px; font-weight: 500">
            ?
          </span>
        }
      </div>

      <div style="display: flex; gap: 5px; padding-left: 44px; flex-wrap: wrap">
        @for (emoji of emojis; track emoji) {
          @let count = reactionCount(emoji);
          @let active = myReact === emoji;
          @let show = count > 0 || active;
          <button
            type="button"
            (click)="react.emit({ playerId: result.player.id, emoji })"
            [style.padding]="'3px 8px'"
            [style.border-radius.px]="20"
            [style.border]="'none'"
            [style.background]="active ? 'var(--accent-muted)' : show ? 'var(--bg-elevated)' : 'rgba(255,255,255,0.03)'"
            [style.outline]="active ? '1.5px solid var(--accent)' : 'none'"
            [style.font-size.px]="13"
            [style.cursor]="'pointer'"
            [style.opacity]="show ? 1 : 0.6"
            [style.display]="'inline-flex'"
            [style.align-items]="'center'"
            [style.gap.px]="3"
            [style.color]="'var(--text-primary)'"
            [style.transition]="'all 140ms'"
          >
            {{ emoji }}
            @if (count > 0) {
              <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary)">{{ count }}</span>
            }
          </button>
        }
      </div>
    </div>
  `
})
export class PredRowComponent {
  @Input({ required: true }) result!: UiPredictionResult;
  @Input() isPlayed = false;
  @Input() userId = '';
  @Input() predRx: Readonly<Record<string, Readonly<Record<string, number>>>> = {};
  @Input() myReact: string | null = null;
  @Output() readonly react = new EventEmitter<PredictionReactionEvent>();

  protected readonly emojis: readonly string[] = ['🔥', '🎯', '😂', '🤡', '😭', '👑'];

  get isMe(): boolean {
    return this.result.player.id === this.userId;
  }

  get ptColor(): string {
    return this.result.pts === 3
      ? 'var(--pt-exact)'
      : this.result.pts === 1
        ? 'var(--pt-correct)'
        : 'var(--pt-miss)';
  }

  protected reactionCount(emoji: string): number {
    return this.predRx[this.result.player.id]?.[emoji] ?? 0;
  }
}
