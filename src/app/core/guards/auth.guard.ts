import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { from, map, of, switchMap, take } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { UsuariosService } from '../services/usuarios.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const usuariosService = inject(UsuariosService);
  const router = inject(Router);

  return authService.user$.pipe(
    take(1),
    switchMap((user) => {
      if (user === null) {
        return of(router.createUrlTree(['/login']));
      }

      return from(usuariosService.ensureOwnUsuario(user)).pipe(map((result) => result !== 'error'));
    })
  );
};
