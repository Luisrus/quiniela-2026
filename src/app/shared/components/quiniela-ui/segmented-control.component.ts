import { NgStyle } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import type { StyleMap } from '../../models/style-value.model';
import { LiveDotComponent } from './live-dot.component';

export interface SegmentedControlOption {
  readonly value: string;
  readonly label: string;
  readonly live?: boolean;
  readonly count?: number;
}

@Component({
  selector: 'app-segmented-control',
  standalone: true,
  imports: [LiveDotComponent, NgStyle],
  template: `
    <div
      [style.display]="'flex'"
      [style.background]="'var(--bg-elevated)'"
      [style.border-radius]="'var(--r-full)'"
      [style.padding.px]="3"
      [style.gap.px]="2"
    >
      @for (option of options; track option.value) {
        @let active = option.value === value;
        <button type="button" (click)="valueChange.emit(option.value)" [ngStyle]="buttonStyle(active)">
          @if (option.live) {
            <app-live-dot [size]="6" />
          }
          {{ option.label }}
          @if (option.count !== undefined) {
            <span [ngStyle]="countStyle(active)">{{ option.count }}</span>
          }
        </button>
      }
    </div>
  `
})
export class SegmentedControlComponent {
  @Input() options: readonly SegmentedControlOption[] = [];
  @Input() value = '';
  @Output() readonly valueChange = new EventEmitter<string>();

  protected buttonStyle(active: boolean): StyleMap {
    return {
      flex: 1,
      padding: '7px 10px',
      'border-radius': 'var(--r-full)',
      border: 'none',
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
      'font-family': 'var(--font-ui)',
      'font-size': '13px',
      'font-weight': active ? 700 : 500,
      cursor: 'pointer',
      transition: 'all var(--dur-normal) var(--ease-smooth)',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      gap: '5px',
      'white-space': 'nowrap'
    };
  }

  protected countStyle(active: boolean): StyleMap {
    return {
      background: active ? 'rgba(0,0,0,0.18)' : 'var(--bg-border)',
      padding: '1px 6px',
      'border-radius': '10px',
      'font-size': '11px',
      color: active ? 'var(--text-on-accent)' : 'var(--text-tertiary)',
      'font-weight': 600
    };
  }
}
