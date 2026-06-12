import { NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';

import type { StyleMap } from '../../models/style-value.model';

export type BadgeVariant = 'accent' | 'danger' | 'gold' | 'live' | 'muted';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [NgStyle],
  template: '<span [class]="badgeClass" [ngStyle]="extraStyle"><ng-content /></span>'
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'muted';
  @Input() extraStyle: StyleMap | null = null;

  get badgeClass(): string {
    return `badge badge-${this.variant}`;
  }
}
