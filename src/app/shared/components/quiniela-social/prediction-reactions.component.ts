import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-prediction-reactions',
  standalone: true,
  host: { style: 'display: block' },
  template: `
    <div style="display: flex; gap: 5px; flex-wrap: wrap">
      @for (emoji of emojis; track emoji) {
        @let count = reactionCounts[emoji] || 0;
        @let active = myReact === emoji;
        @let show = count > 0 || active;
        <button
          type="button"
          (click)="react.emit(emoji)"
          [style.padding]="'3px 8px'"
          [style.border-radius.px]="20"
          [style.border]="'none'"
          [style.background]="active ? 'var(--accent-muted)' : show ? 'var(--bg-elevated)' : 'rgba(255,255,255,0.03)'"
          [style.outline]="active ? '1.5px solid var(--accent)' : 'none'"
          [style.font-size.px]="13"
          [style.cursor]="'pointer'"
          [style.opacity]="show ? 1 : 0.4"
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
  `
})
export class PredictionReactionsComponent {
  @Input() emojis: readonly string[] = ['🔥', '🎯', '😂', '🤡', '😭', '👑'];
  @Input() reactionCounts: Readonly<Record<string, number>> = {};
  @Input() myReact: string | null = null;
  @Output() readonly react = new EventEmitter<string>();
}
