import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  doc,
  docData,
  Firestore,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentReference,
  type FieldValue
} from '@angular/fire/firestore';
import { of, type Observable } from 'rxjs';

import { AuthService } from './auth.service';
import { FirestoreErrorService } from './firestore-error.service';
import { ToastService } from './toast.service';

interface AppUpdateNotice {
  readonly updatedAt?: Timestamp;
  readonly requestedBy?: string | null;
}

interface StoredAppUpdateNotice {
  readonly updatedAt: FieldValue;
  readonly requestedBy: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AppUpdateService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly errors = inject(FirestoreErrorService);
  private readonly toasts = inject(ToastService);
  private readonly bootedAtMs = Date.now();
  private readonly notice = toSignal(this.notice$(), { initialValue: undefined });

  readonly updateAvailable = computed(() => {
    const updatedAt = this.notice()?.updatedAt;

    if (updatedAt === undefined) {
      return false;
    }

    return updatedAt.toMillis() > this.bootedAtMs;
  });

  async requestUserRefresh(): Promise<void> {
    const uid = this.auth.userProfile()?.uid ?? null;
    const notice: StoredAppUpdateNotice = {
      updatedAt: serverTimestamp(),
      requestedBy: uid
    };

    try {
      await setDoc(this.noticeRef(), notice, { merge: true });
      this.toasts.success('Aviso de actualización enviado.');
    } catch (error: unknown) {
      this.errors.report('No se pudo enviar el aviso de actualización.', error);
      throw error;
    }
  }

  reload(): void {
    window.location.reload();
  }

  private notice$(): Observable<AppUpdateNotice | undefined> {
    if (typeof window === 'undefined') {
      return of(undefined);
    }

    return this.errors.handleStream(
      docData(this.noticeRef()) as Observable<AppUpdateNotice | undefined>,
      undefined,
      'No se pudo revisar si hay una actualización disponible.'
    );
  }

  private noticeRef(): DocumentReference<AppUpdateNotice | StoredAppUpdateNotice> {
    return doc(
      this.firestore,
      'config',
      'appUpdate'
    ) as DocumentReference<AppUpdateNotice | StoredAppUpdateNotice>;
  }
}
