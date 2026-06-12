import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-team-flag',
  standalone: true,
  template: `
    @if (url) {
      <img
        [src]="url"
        [alt]="name"
        [style.width.px]="size"
        [style.height.px]="height"
        style="display: block; object-fit: contain; flex-shrink: 0"
        loading="lazy"
        decoding="async"
      />
    } @else {
      <span
        [style.width.px]="size"
        [style.height.px]="height"
        style="display: flex; align-items: center; justify-content: center; font-size: 18px; opacity: 0.35; flex-shrink: 0"
        aria-hidden="true"
      >
        🏳
      </span>
    }
  `
})
export class TeamFlagComponent {
  @Input({ required: true }) name!: string;
  @Input() url = '';
  @Input() size = 40;

  get height(): number {
    return Math.round(this.size * 0.72);
  }
}
