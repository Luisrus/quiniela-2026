import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';

import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class FirestoreErrorService {
  private readonly toasts = inject(ToastService);

  handleStream<T>(source: Observable<T>, fallback: T, message: string): Observable<T> {
    return source.pipe(
      catchError((error: unknown) => {
        this.report(message, error);
        return of(fallback);
      })
    );
  }

  report(message: string, error: unknown): void {
    console.error(error);
    this.toasts.error(message);
  }
}
