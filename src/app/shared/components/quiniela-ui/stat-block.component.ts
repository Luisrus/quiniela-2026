import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-block',
  standalone: true,
  template: `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 2px">
      <span
        [style.font-family]="'var(--font-score)'"
        [style.font-size.px]="32"
        [style.font-weight]="900"
        [style.line-height]="1"
        [style.color]="color || 'var(--text-primary)'"
      >
        {{ value }}
      </span>
      <span style="font-size: 11px; color: var(--text-tertiary); font-weight: 500">{{ label }}</span>
    </div>
  `
})
export class StatBlockComponent {
  @Input({ required: true }) value!: string | number;
  @Input({ required: true }) label!: string;
  @Input() color: string | null = null;
}
