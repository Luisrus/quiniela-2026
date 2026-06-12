import { Injectable, signal } from '@angular/core';

export type ToastTone = 'error' | 'info' | 'success';

export interface AppToast {
  readonly id: number;
  readonly message: string;
  readonly tone: ToastTone;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private nextId = 1;
  private readonly toastsSignal = signal<readonly AppToast[]>([]);

  readonly toasts = this.toastsSignal.asReadonly();

  error(message: string): void {
    this.show(message, 'error');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  dismiss(id: number): void {
    this.toastsSignal.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private show(message: string, tone: ToastTone): void {
    const toast: AppToast = {
      id: this.nextId,
      message,
      tone
    };
    this.nextId += 1;
    this.toastsSignal.update((toasts) => [...toasts, toast].slice(-3));

    window.setTimeout(() => this.dismiss(toast.id), 4600);
  }
}
