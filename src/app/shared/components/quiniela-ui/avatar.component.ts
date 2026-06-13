import { Component, Input, OnChanges } from '@angular/core';

import type { UiPlayer } from '../../models/quiniela-view.model';

@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `
    <div style="position: relative; display: inline-flex; flex-shrink: 0">
      @if (showPhoto) {
        <img
          [src]="player.photoUrl"
          [alt]="player.name"
          referrerpolicy="no-referrer"
          [style.width.px]="size"
          [style.height.px]="size"
          style="border-radius: 50%; object-fit: cover; flex-shrink: 0; display: block"
          [style.border]="border"
          (error)="onPhotoError()"
        >
      } @else {
        <div
          [style.width.px]="size"
          [style.height.px]="size"
          [style.background]="background"
          [style.border]="border"
          [style.font-size.px]="size * 0.33"
          style="border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-family: var(--font-ui); flex-shrink: 0; letter-spacing: -0.01em; user-select: none"
        >
          {{ player.initials }}
        </div>
      }
      @if (showFlag && player.fav) {
        <span
          [style.width.px]="flagSize"
          [style.height.px]="flagSize"
          style="position: absolute; bottom: -2px; right: -4px; border: 1.5px solid var(--bg-surface); border-radius: 50%; background: var(--bg-elevated); overflow: hidden; display: flex; align-items: center; justify-content: center; line-height: 0"
        >
          <img
            [src]="player.fav"
            alt=""
            [style.width.px]="flagSize - 2"
            [style.height.px]="flagSize - 2"
            style="object-fit: contain; display: block"
            loading="lazy"
            decoding="async"
          />
        </span>
      }
    </div>
  `
})
export class AvatarComponent implements OnChanges {
  @Input({ required: true }) player!: UiPlayer;
  @Input() size = 36;
  @Input() showFlag = false;

  protected showPhoto = false;

  ngOnChanges(): void {
    this.showPhoto = this.hasPhotoUrl();
  }

  protected onPhotoError(): void {
    this.showPhoto = false;
  }

  get background(): string {
    return `hsl(${this.player.hue}, 58%, 32%)`;
  }

  get border(): string {
    return `1.5px solid hsl(${this.player.hue}, 58%, 45%)`;
  }

  get flagSize(): number {
    return Math.min(22, Math.max(10, Math.round(this.size * 0.38)));
  }

  private hasPhotoUrl(): boolean {
    const photoUrl = this.player.photoUrl?.trim();
    return photoUrl !== undefined && photoUrl !== '';
  }
}
