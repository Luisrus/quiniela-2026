import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  OnDestroy,
  Output
} from '@angular/core';

@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  host: {
    class: 'bottom-sheet-root'
  },
  template: `
    <div
      class="bottom-sheet-backdrop"
      (click)="close.emit()"
    ></div>
    <div class="bottom-sheet-panel">
      <div style="display: flex; justify-content: center; padding: 12px 0 6px; flex-shrink: 0">
        <div style="width: 36px; height: 4px; border-radius: 2px; background: var(--bg-border)"></div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 2px 20px 14px; flex-shrink: 0">
        <div>
          <ng-content select="[sheet-title]"></ng-content>
        </div>
        <button
          type="button"
          (click)="close.emit()"
          style="width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; background: var(--bg-elevated); border: none; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; margin-top: 2px; transition: background var(--dur-fast)"
        >
          ×
        </button>
      </div>
      <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: `
    :host.bottom-sheet-root {
      position: fixed;
      inset: 0;
      z-index: 200;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      pointer-events: none;
    }

    .bottom-sheet-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      pointer-events: auto;
      animation: backdrop-in 220ms ease both;
    }

    .bottom-sheet-panel {
      position: relative;
      z-index: 1;
      pointer-events: auto;
      width: 100%;
      max-width: 430px;
      max-height: 88dvh;
      background: var(--bg-surface);
      border-radius: 20px 20px 0 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: sheet-up 320ms var(--ease-spring) both;
    }
  `
})
export class BottomSheetComponent implements OnDestroy {
  @Output() readonly close = new EventEmitter<void>();

  private readonly document = inject(DOCUMENT);
  private readonly host = inject(ElementRef<HTMLElement>);
  private movedToBody = false;

  constructor() {
    afterNextRender(() => {
      const element = this.host.nativeElement;

      if (element.parentElement === this.document.body) {
        return;
      }

      this.document.body.appendChild(element);
      this.movedToBody = true;
    });
  }

  ngOnDestroy(): void {
    if (!this.movedToBody) {
      return;
    }

    this.host.nativeElement.remove();
  }
}
