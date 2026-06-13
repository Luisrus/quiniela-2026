import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-prediction-reactions',
  standalone: true,
  host: { style: 'display: block' },
  template: `
    <div class="prediction-reactions">
      @for (emoji of emojis; track emoji) {
        @let count = reactionCounts[emoji] || 0;
        @let active = myReact === emoji;
        @let show = count > 0 || active;
        <button
          type="button"
          class="reaction-btn"
          (click)="react.emit(emoji)"
          [class.active]="active"
          [class.is-empty]="!show"
        >
          <span class="reaction-emoji">{{ emoji }}</span>
          @if (count > 0) {
            <span class="reaction-count">{{ count }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    .prediction-reactions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 2px;
    }

    .prediction-reactions .reaction-btn {
      min-height: 36px;
      padding: 4px 10px;
      -webkit-appearance: none;
      appearance: none;
    }

    .prediction-reactions .reaction-btn.is-empty {
      opacity: 0.72;
      background: rgba(255, 255, 255, 0.05);
    }

    .prediction-reactions .reaction-emoji {
      font-size: 16px;
      line-height: 1;
    }

    .prediction-reactions .reaction-count {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-secondary);
    }
  `
})
export class PredictionReactionsComponent {
  @Input() emojis: readonly string[] = ['🔥', '🎯', '😂', '🤡', '😭', '👑'];
  @Input() reactionCounts: Readonly<Record<string, number>> = {};
  @Input() myReact: string | null = null;
  @Output() readonly react = new EventEmitter<string>();
}
