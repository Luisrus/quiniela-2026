import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { AppShellComponent } from './shared/components/app-shell/app-shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.page').then((module) => module.LoginPage),
    title: 'Login'
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'partidos'
      },
      {
        path: 'partidos',
        loadComponent: () =>
          import('./features/partidos/partidos.page').then((module) => module.PartidosPage),
        title: 'Partidos'
      },
      {
        path: 'tabla',
        loadComponent: () =>
          import('./features/tabla/tabla.page').then((module) => module.TablaPage),
        title: 'Tabla'
      },
      {
        path: 'feed',
        loadComponent: () =>
          import('./features/feed/feed.page').then((module) => module.FeedPage),
        title: 'Feed'
      },
      {
        path: 'resultados',
        loadComponent: () =>
          import('./features/resultados/resultados.page').then((module) => module.ResultadosPage),
        title: 'Resultados'
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/perfil/perfil.page').then((module) => module.PerfilPage),
        title: 'Perfil'
      },
      {
        path: 'especiales',
        loadComponent: () =>
          import('./features/especiales/especiales.page').then((module) => module.EspecialesPage),
        title: 'Mis Predicciones'
      },
      {
        path: 'wrapped',
        loadComponent: () =>
          import('./features/wrapped/wrapped.page').then((module) => module.WrappedPage),
        title: 'Season Wrapped'
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/admin.page').then((module) => module.AdminPage),
        title: 'Admin'
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
