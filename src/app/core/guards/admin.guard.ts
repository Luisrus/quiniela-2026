import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { firstValueFrom, take } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { UsuariosService } from '../services/usuarios.service';

export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const usuariosService = inject(UsuariosService);
  const router = inject(Router);
  const toasts = inject(ToastService);

  const user = await firstValueFrom(authService.user$.pipe(take(1)));

  if (user === null) {
    return router.createUrlTree(['/login']);
  }

  const esAdmin = await usuariosService.esAdmin(user.uid);

  if (esAdmin) {
    return true;
  }

  toasts.error('No tienes permisos de admin.');
  return router.createUrlTree(['/partidos']);
};
