import { NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { UiMatch, UiMatchScore, UiPrediction, UiScoreValue, UiPlayer } from '../../models/quiniela-view.model';
import { LiveDotComponent } from './live-dot.component';
import { MiniAvatarStackComponent } from './mini-avatar-stack.component';
import { ScoreInputComponent } from './score-input.component';
import { TeamFlagComponent } from './team-flag.component';

@Component({
  selector: 'app-match-card',
  standalone: true,
  imports: [LiveDotComponent, MiniAvatarStackComponent, NgClass, ScoreInputComponent, TeamFlagComponent],
  template: `
    <div
      class="card fade-up"
      [ngClass]="staggerClass"
      [style.padding]="'14px 16px'"
      [style.border]="cardBorder"
      [style.box-shadow]="cardShadow"
    >
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px">
        <div style="display: flex; align-items: center; gap: 6px">
          @if (isLive) {
            <app-live-dot />
            <span style="color: var(--live); font-size: 12px; font-weight: 700; letter-spacing: 0.06em">
              EN VIVO
              @if (match.minute !== null) {
                {{ match.minute }}'
              }
            </span>
          }
          @if (isPlayed) {
            <span style="font-size: 11px; color: var(--text-secondary)">🔒 {{ match.date }} · FINAL</span>
          }
          @if (isUpcoming) {
            <span style="font-size: 11px; color: var(--text-secondary)">{{ match.date }}</span>
          }
        </div>
        <span
          style="font-size: 11px; color: var(--text-tertiary); background: var(--bg-elevated); padding: 2px 9px; border-radius: 6px; font-weight: 500"
        >
          {{ match.phase }}
        </span>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 14px">
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px">
          <app-team-flag [name]="match.home.name" [url]="match.home.flag" [size]="40" />
          <span style="font-size: 12px; font-weight: 600; color: var(--text-secondary); text-align: center; line-height: 1.2">
            {{ match.home.name }}
          </span>
        </div>

        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0">
          @if (visibleScore; as score) {
            <span style="font-family: var(--font-score); font-size: 52px; font-weight: 900; color: var(--text-primary); line-height: 1">
              {{ score.home }}
            </span>
            <span style="font-family: var(--font-score); font-size: 30px; font-weight: 600; color: var(--text-tertiary); line-height: 1; margin-top: 2px">:</span>
            <span style="font-family: var(--font-score); font-size: 52px; font-weight: 900; color: var(--text-primary); line-height: 1">
              {{ score.away }}
            </span>
          } @else {
            <app-score-input
              [value]="currentPrediction.home"
              [disabled]="!predictionOpen"
              (valueChange)="changeHome($event)"
            />
            <span style="font-family: var(--font-score); font-size: 28px; font-weight: 600; color: var(--text-tertiary)">:</span>
            <app-score-input
              [value]="currentPrediction.away"
              [disabled]="!predictionOpen"
              (valueChange)="changeAway($event)"
            />
          }
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px">
          <app-team-flag [name]="match.away.name" [url]="match.away.flag" [size]="40" />
          <span style="font-size: 12px; font-weight: 600; color: var(--text-secondary); text-align: center; line-height: 1.2">
            {{ match.away.name }}
          </span>
        </div>
      </div>

      @if ((isLive || isPlayed) && predictedBy.length > 0) {
        <button
          type="button"
          (click)="viewPredictions.emit()"
          style="width: 100%; background: none; border: none; cursor: pointer; border-top: 1px solid var(--bg-border); padding-top: 10px; padding-left: 0; padding-right: 0; padding-bottom: 0; display: flex; align-items: center; justify-content: space-between"
        >
          <app-mini-avatar-stack [playerIds]="predictedBy" [players]="players" />
          <span style="font-size: 11px; color: var(--accent); font-weight: 700; letter-spacing: -0.01em">Ver →</span>
        </button>
      } @else if (isUpcoming) {
        @if (!predictionOpen) {
          <p style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-align: center; margin-top: 4px; padding: 8px 10px; background: var(--bg-elevated); border-radius: 8px">
            🔒 Pronósticos cerrados (5 min antes del pitido)
          </p>
        }
        <div style="margin-top: 4px">
          <input
            type="text"
            [value]="frase"
            [disabled]="!predictionOpen"
            (input)="onFraseInput($event)"
            maxlength="60"
            placeholder="¿Algo que decir antes del partido? (sale en el Feed)"
            style="width: 100%; padding: 8px 12px; background: var(--bg-elevated); border: 1px solid var(--bg-border); border-radius: var(--r-full); color: var(--text-primary); font-family: var(--font-ui); font-size: 12px; outline: none; box-sizing: border-box"
          >
          @if (frase.length > 0) {
            <div style="text-align: right; font-size: 10px; color: var(--text-tertiary); margin-top: 3px">{{ frase.length }}/60</div>
          }
        </div>
        @if (predictionOpen) {
        <button
          type="button"
          (click)="saveRequest.emit()"
          [disabled]="!canSave"
          style="width: 100%; margin-top: 10px; min-height: 44px; border: none; border-radius: 10px; font-family: var(--font-ui); font-size: 13px; font-weight: 800; cursor: pointer; transition: opacity var(--dur-fast), background var(--dur-fast)"
          [style.background]="saveButtonBackground"
          [style.color]="saveButtonColor"
          [style.opacity]="canSave || saving ? 1 : 0.55"
          [style.cursor]="canSave ? 'pointer' : 'default'"
        >
          @if (saving) {
            Guardando…
          } @else if (saved && !dirty) {
            ✓ Guardado
          } @else {
            Guardar pronóstico
          }
        </button>
        }
        @if (match.venue) {
          <div style="text-align: center; margin-top: 8px">
            <span style="font-size: 11px; color: var(--text-tertiary)">📍 {{ match.venue }}</span>
          </div>
        }
      }
    </div>
  `
})
export class MatchCardComponent {
  @Input({ required: true }) match!: UiMatch;
  @Input() prediction: UiPrediction | null = null;
  @Input() frase = '';
  @Input() players: readonly UiPlayer[] = [];
  @Input() predictedBy: readonly string[] = [];
  @Input() stagger = 1;
  @Input() saving = false;
  @Input() dirty = false;
  @Input() saved = false;
  @Input() canSave = false;
  @Input() predictionOpen = true;
  @Output() readonly predictionChange = new EventEmitter<UiPrediction>();
  @Output() readonly fraseChange = new EventEmitter<string>();
  @Output() readonly saveRequest = new EventEmitter<void>();
  @Output() readonly viewPredictions = new EventEmitter<void>();

  get currentPrediction(): UiPrediction {
    return this.prediction ?? { home: '', away: '' };
  }

  get visibleScore(): UiMatchScore | null {
    if (this.isLive || this.isPlayed) {
      return this.match.score ?? { home: 0, away: 0 };
    }
    return null;
  }

  get isLive(): boolean {
    return this.match.status === 'live';
  }

  get isPlayed(): boolean {
    return this.match.status === 'played';
  }

  get isUpcoming(): boolean {
    return this.match.status === 'upcoming';
  }

  get cardBorder(): string {
    return this.isLive
      ? '1px solid color-mix(in srgb, var(--live) 35%, transparent)'
      : '1px solid rgba(255,255,255,0.04)';
  }

  get cardShadow(): string {
    return this.isLive ? 'var(--sh-live)' : 'var(--sh-card)';
  }

  get staggerClass(): string {
    return `s${Math.min(Math.max(this.stagger, 1), 10)}`;
  }

  get saveButtonBackground(): string {
    if (this.saved && !this.dirty) {
      return 'var(--accent-muted)';
    }

    return 'var(--accent)';
  }

  get saveButtonColor(): string {
    if (this.saved && !this.dirty) {
      return 'var(--accent)';
    }

    return 'var(--text-on-accent)';
  }

  protected changeHome(value: UiScoreValue): void {
    this.predictionChange.emit({ ...this.currentPrediction, home: value });
  }

  protected changeAway(value: UiScoreValue): void {
    this.predictionChange.emit({ ...this.currentPrediction, away: value });
  }

  protected onFraseInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fraseChange.emit(input.value);
  }
}
