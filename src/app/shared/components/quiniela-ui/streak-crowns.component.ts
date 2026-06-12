import { Component, Input, computed, signal } from '@angular/core';

import { coronasPorRacha } from '../../utils/racha-coronas';

export type StreakCrownsVariant = 'normal' | 'gold';

@Component({
  selector: 'app-streak-crowns',
  standalone: true,
  template: `
    @if (cantidad() > 0) {
      <span [class]="wrapperClass()" [attr.aria-label]="ariaLabel()">
        @for (corona of coronas(); track $index) {
          <span>👑</span>
        }
      </span>
    }
  `,
  styles: [`
    .streak-crowns {
      display: inline-flex;
      gap: 1px;
      font-size: 12px;
      line-height: 1;
    }

    .streak-crowns--gold {
      filter: drop-shadow(0 0 4px rgba(245, 197, 66, 0.55));
      color: var(--gold);
    }
  `]
})
export class StreakCrownsComponent {
  private readonly rachaValue = signal(0);
  private readonly variantValue = signal<StreakCrownsVariant>('normal');

  @Input({ required: true })
  set racha(value: number) {
    this.rachaValue.set(value);
  }

  @Input()
  set variant(value: StreakCrownsVariant) {
    this.variantValue.set(value);
  }

  protected readonly cantidad = computed(() => coronasPorRacha(this.rachaValue()));
  protected readonly coronas = computed(() =>
    Array.from({ length: this.cantidad() }, (_, index) => index)
  );
  protected readonly wrapperClass = computed(() =>
    this.variantValue() === 'gold'
      ? 'streak-crowns streak-crowns--gold'
      : 'streak-crowns'
  );
  protected readonly ariaLabel = computed(() => {
    const tipo = this.variantValue() === 'gold' ? 'exactos' : 'aciertos';
    return `Racha de ${tipo}: ${this.rachaValue()}`;
  });
}
