import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from './core/services/auth.service';
import { AppUpdateService } from './core/services/app-update.service';
import { UsuariosService } from './core/services/usuarios.service';
import { ToastHostComponent } from './shared/components/toast-host/toast-host.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastHostComponent],
  template: `
    <router-outlet />
    @if (appUpdate.updateAvailable()) {
      <div
        style="position: fixed; left: 50%; bottom: calc(var(--nav-height, 72px) + 12px); z-index: 1000; transform: translateX(-50%); width: min(430px, calc(100% - 24px)); padding: 10px 12px; border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent); border-radius: 10px; background: var(--bg-surface); box-shadow: var(--sh-card); display: flex; align-items: center; justify-content: space-between; gap: 10px"
        role="status"
      >
        <span style="color: var(--text-primary); font-size: 12px; font-weight: 700">
          Nueva versión disponible
        </span>
        <button
          type="button"
          (click)="appUpdate.reload()"
          style="min-height: 34px; padding: 0 12px; border: none; border-radius: 8px; background: var(--accent); color: var(--text-on-accent); font-family: var(--font-ui); font-size: 12px; font-weight: 800"
        >
          Actualizar app
        </button>
      </div>
    }
    <app-toast-host />
  `
})
export class AppComponent {
  private readonly auth = inject(AuthService);
  private readonly usuarios = inject(UsuariosService);
  protected readonly appUpdate = inject(AppUpdateService);
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
