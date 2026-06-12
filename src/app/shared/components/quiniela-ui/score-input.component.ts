import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { UiScoreValue } from '../../models/quiniela-view.model';

@Component({
  selector: 'app-score-input',
  standalone: true,
  template: `
    <input
      class="score-input"
      type="number"
      min="0"
      max="20"
      [value]="value"
      [disabled]="disabled"
      (input)="onInput($event)"
      placeholder="–"
    >
  `
})
export class ScoreInputComponent {
  @Input() value: UiScoreValue = '';
  @Input() disabled = false;
  @Output() readonly valueChange = new EventEmitter<UiScoreValue>();

  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.valueChange.emit(input.value === '' ? '' : Math.trunc(Number(input.value)));
  }
}
