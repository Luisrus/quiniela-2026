import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 48px 24px; text-align: center">
      <span style="font-size: 44px">{{ emoji }}</span>
      <p style="font-size: 15px; font-weight: 700; color: var(--text-secondary)">{{ title }}</p>
      @if (sub) {
        <p style="font-size: 13px; color: var(--text-tertiary)">{{ sub }}</p>
      }
    </div>
  `
})
export class EmptyStateComponent {
  @Input() emoji = '🦗';
  @Input({ required: true }) title!: string;
  @Input() sub: string | null = null;
}
