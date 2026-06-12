import { Component, Input } from '@angular/core';

import type { UiPlayer } from '../../models/quiniela-view.model';
import { AvatarComponent } from './avatar.component';

@Component({
  selector: 'app-mini-avatar-stack',
  standalone: true,
  imports: [AvatarComponent],
  template: `
    <div style="display: flex; align-items: center; gap: 6px">
      <div style="display: flex">
        @for (id of shownIds; track id; let i = $index) {
          @if (playerFor(id); as player) {
            <div
              [style.margin-left.px]="i > 0 ? -7 : 0"
              [style.z-index]="shownIds.length - i"
              [style.position]="'relative'"
            >
              <app-avatar [player]="player" [size]="22" />
            </div>
          }
        }
      </div>
      <span style="color: var(--text-secondary); font-size: 11px">
        @if (rest > 0) {
          +{{ rest }}
        }
        {{ playerIds.length === 1 ? 'pronosticó' : 'pronosticaron' }}
      </span>
    </div>
  `
})
export class MiniAvatarStackComponent {
  @Input() playerIds: readonly string[] = [];
  @Input() players: readonly UiPlayer[] = [];

  get shownIds(): readonly string[] {
    return this.playerIds.slice(0, 5);
  }

  get rest(): number {
    return this.playerIds.length - this.shownIds.length;
  }

  protected playerFor(id: string): UiPlayer | undefined {
    return this.players.find((player) => player.id === id);
  }
}
