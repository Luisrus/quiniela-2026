import { Component, Input, OnChanges } from '@angular/core';

import type { UiPlayer } from '../../models/quiniela-view.model';

@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `
    <div style="position: relative; display: inline-flex; flex-shrink: 0">
      @if (showFlagAvatar) {
        <img
          [src]="player.fav"
          [alt]="player.name"
          [style.width.px]="size"
          [style.height.px]="size"
          [style.border]="border"
          style="border-radius: 50%; object-fit: cover; flex-shrink: 0; display: block"
          loading="lazy"
          decoding="async"
          (error)="onFlagError()"
        >
      } @else if (showPhoto) {
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
    </div>
  `
})
export class AvatarComponent implements OnChanges {
  @Input({ required: true }) player!: UiPlayer;
  @Input() size = 36;

  protected flagLoadFailed = false;
  protected photoLoadFailed = false;

  ngOnChanges(): void {
    this.flagLoadFailed = false;
    this.photoLoadFailed = false;
  }

  protected onPhotoError(): void {
    this.photoLoadFailed = true;
  }

  protected onFlagError(): void {
    this.flagLoadFailed = true;
  }

  get showFlagAvatar(): boolean {
    return this.hasFavUrl() && !this.flagLoadFailed;
  }

  get showPhoto(): boolean {
    return this.hasPhotoUrl() && !this.photoLoadFailed;
  }

  get background(): string {
    return `hsl(${this.player.hue}, 58%, 32%)`;
  }

  get border(): string {
    return `1.5px solid hsl(${this.player.hue}, 58%, 45%)`;
  }

  private hasFavUrl(): boolean {
    const fav = this.player.fav?.trim();
    return fav !== undefined && fav !== '';
  }

  private hasPhotoUrl(): boolean {
    const photoUrl = this.player.photoUrl?.trim();
    return photoUrl !== undefined && photoUrl !== '';
  }
}
