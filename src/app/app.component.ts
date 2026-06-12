import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from './core/services/auth.service';
import { UsuariosService } from './core/services/usuarios.service';
import { ToastHostComponent } from './shared/components/toast-host/toast-host.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastHostComponent],
  template: `
    <router-outlet />
    <app-toast-host />
  `
})
export class AppComponent {
  private readonly auth = inject(AuthService);
  private readonly usuarios = inject(UsuariosService);
  private ensuredUid: string | null = null;

  constructor() {
    effect(() => {
      const profile = this.auth.userProfile();

      if (profile === undefined || profile === null) {
        this.ensuredUid = null;
        return;
      }

      if (this.ensuredUid === profile.uid) {
        return;
      }

      void this.usuarios.ensureOwnUsuario().then((result) => {
        if (result !== 'error') {
          this.ensuredUid = profile.uid;
        }
      });
    });
  }
}
