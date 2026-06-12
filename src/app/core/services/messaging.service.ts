import { inject, Injectable } from '@angular/core';
import { getToken, Messaging, onMessage } from '@angular/fire/messaging';

import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';
import { UsuariosService } from './usuarios.service';

export type MessagingEstado = 'activo' | 'denegado' | 'no_soportado' | 'pendiente';

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private readonly messaging = inject(Messaging);
  private readonly usuariosService = inject(UsuariosService);
  private readonly toasts = inject(ToastService);
  private escuchaIniciada = false;

  esSoportado(): boolean {
    return typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator;
  }

  estadoActual(): MessagingEstado {
    if (!this.esSoportado()) {
      return 'no_soportado';
    }

    if (Notification.permission === 'granted') {
      return 'activo';
    }

    if (Notification.permission === 'denied') {
      return 'denegado';
    }

    return 'pendiente';
  }

  iniciarEscuchaPrimerPlano(): void {
    if (this.escuchaIniciada || !this.esSoportado()) {
      return;
    }

    this.escuchaIniciada = true;

    onMessage(this.messaging, (payload) => {
      const body = payload.notification?.body ?? 'Tienes una notificación de la quiniela.';
      this.toasts.info(body);
    });
  }

  async solicitarPermisoYGuardarToken(): Promise<boolean> {
    if (!this.esSoportado()) {
      return false;
    }

    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(this.messaging, {
      vapidKey: environment.firebase.vapidKey,
      serviceWorkerRegistration: registration
    });

    if (token === '' || token === undefined) {
      return false;
    }

    await this.usuariosService.updateFcmToken(token);
    this.iniciarEscuchaPrimerPlano();
    return true;
  }

  async desactivarNotificaciones(): Promise<void> {
    await this.usuariosService.updateFcmToken(null);
  }
}
