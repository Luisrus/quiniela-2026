import { Component, Input } from '@angular/core';

import type { UiPlayer } from '../../models/quiniela-view.model';

@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `
    <div
      [style.width.px]="size"
      [style.height.px]="size"
      [style.border-radius]="'50%'"
      [style.background]="background"
      [style.border]="border"
      [style.display]="'flex'"
      [style.align-items]="'center'"
      [style.justify-content]="'center'"
      [style.color]="'#fff'"
      [style.font-size.px]="size * 0.33"
      [style.font-weight]="700"
      [style.font-family]="'var(--font-ui)'"
      [style.flex-shrink]="0"
      [style.letter-spacing]="'-0.01em'"
      [style.user-select]="'none'"
    >
      {{ player.initials }}
    </div>
  `
})
export class AvatarComponent {
  @Input({ required: true }) player!: UiPlayer;
  @Input() size = 36;

  get background(): string {
    return `hsl(${this.player.hue}, 58%, 32%)`;
  }

  get border(): string {
    return `1.5px solid hsl(${this.player.hue}, 58%, 45%)`;
  }
}
