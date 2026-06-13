import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';

import type { UiComment, UiPlayer } from '../../models/quiniela-view.model';
import { AvatarComponent } from '../quiniela-ui/avatar.component';

@Component({
  selector: 'app-comment-item',
  standalone: true,
  imports: [AvatarComponent, NgClass],
  template: `
    @if (player; as commentPlayer) {
      <div
        [ngClass]="{ 'comment-enter': isNew }"
        [style.display]="'flex'"
        [style.flex-direction]="isMe ? 'row-reverse' : 'row'"
        [style.gap.px]="8"
        [style.align-items]="'flex-end'"
        [style.margin-bottom.px]="12"
      >
        @if (!isMe) {
          <app-avatar [player]="commentPlayer" [size]="28" />
        }
        <div style="max-width: 74%">
          <p
            [style.font-size.px]="11"
            [style.color]="isMe ? 'var(--accent)' : 'var(--text-tertiary)'"
            [style.margin-bottom.px]="3"
            [style.margin-left.px]="isMe ? 0 : 4"
            [style.margin-right.px]="isMe ? 4 : 0"
            [style.text-align]="isMe ? 'right' : 'left'"
            [style.font-weight]="600"
          >
            {{ isMe ? 'Tú' : commentPlayer.name }}
          </p>
          <div
            [style.padding]="'9px 13px'"
            [style.background]="isMe ? 'var(--accent-muted)' : 'var(--bg-elevated)'"
            [style.border]="isMe ? '1px solid color-mix(in srgb, var(--accent) 22%, transparent)' : '1px solid rgba(255,255,255,0.04)'"
            [style.border-radius]="isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px'"
            [style.font-size.px]="13"
            [style.color]="'var(--text-primary)'"
            [style.line-height]="1.45"
          >
            {{ comment.text }}
          </div>
          <p
            [style.font-size.px]="10"
            [style.color]="'var(--text-tertiary)'"
            [style.margin-top.px]="3"
            [style.text-align]="isMe ? 'right' : 'left'"
            [style.padding-left.px]="isMe ? 0 : 4"
          >
            {{ elapsed }}
          </p>
        </div>
      </div>
    }
  `
})
export class CommentItemComponent {
  @Input({ required: true }) comment!: UiComment;
  @Input() players: readonly UiPlayer[] = [];
  @Input() userId = '';
  @Input() isNew = false;

  get player(): UiPlayer | undefined {
    return this.players.find((player) => player.id === this.comment.playerId);
  }

  get isMe(): boolean {
    return this.comment.playerId === this.userId;
  }

  get elapsed(): string {
    const delta = Date.now() - this.comment.ts;

    if (delta < 60000) {
      return 'ahora';
    }

    if (delta < 3600000) {
      return `${Math.floor(delta / 60000)}min`;
    }

    if (delta < 86400000) {
      return `${Math.floor(delta / 3600000)}h`;
    }

    return `${Math.floor(delta / 86400000)}d`;
  }
}
