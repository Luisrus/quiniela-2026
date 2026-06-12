import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UsuariosService } from '../../core/services/usuarios.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})
export class LoginPage {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly usuariosService = inject(UsuariosService);

  protected readonly auth = inject(AuthService);
  protected readonly isSigningIn = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        void this.router.navigateByUrl('/partidos');
      }
    });
  }

  protected async signInWithGoogle(): Promise<void> {
    this.isSigningIn.set(true);
    this.errorMessage.set(null);

    try {
      const user = await this.auth.signInWithGoogle();
      const status = await this.usuariosService.ensureOwnUsuario(user);
      
      if (status === 'nuevo') {
        this.toast.info('¡Bienvenido! Por favor, elige tu equipo del corazón y tus predicciones especiales.');
        await this.router.navigateByUrl('/perfil');
      } else {
        await this.router.navigateByUrl('/partidos');
      }
    } catch (error: unknown) {
      console.error(error);
      this.errorMessage.set('No se pudo iniciar sesion. Intenta de nuevo.');
    } finally {
      this.isSigningIn.set(false);
    }
  }
}
