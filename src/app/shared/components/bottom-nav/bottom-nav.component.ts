import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface BottomNavItem {
  readonly id: string;
  readonly label: string;
  readonly route: string;
  readonly icon: 'partidos' | 'tabla' | 'feed' | 'resultados' | 'perfil';
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav
      style="height: var(--nav-height); background: var(--bg-surface); display: flex; align-items: center; padding-bottom: env(safe-area-inset-bottom, 0px); flex-shrink: 0"
    >
      @for (tab of tabs; track tab.id) {
        <a
          [routerLink]="tab.route"
          routerLinkActive="is-active"
          #activeLink="routerLinkActive"
          [routerLinkActiveOptions]="{ exact: true }"
          style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 4px 6px; background: none; border: none; cursor: pointer; color: var(--text-tertiary); transition: color var(--dur-fast) var(--ease-smooth); position: relative; text-decoration: none"
          [style.color]="activeLink.isActive ? 'var(--accent)' : 'var(--text-tertiary)'"
        >
          @if (activeLink.isActive) {
            <span style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 28px; height: 3px; border-radius: 0 0 3px 3px; background: var(--accent)"></span>
          }

          @switch (tab.icon) {
            @case ('partidos') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
                <path d="M2 12h20" />
              </svg>
            }
            @case ('tabla') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
              </svg>
            }
            @case ('feed') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            }
            @case ('resultados') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            }
            @case ('perfil') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 1 0-16 0" />
              </svg>
            }
          }

          <span
            [style.font-size.px]="10"
            [style.font-family]="'var(--font-ui)'"
            [style.font-weight]="activeLink.isActive ? 700 : 500"
            [style.letter-spacing]="'0.01em'"
          >
            {{ tab.label }}
          </span>
        </a>
      }
    </nav>
  `
})
export class BottomNavComponent {
  protected readonly tabs: readonly BottomNavItem[] = [
    { id: 'partidos', label: 'Pronósticos', route: '/partidos', icon: 'partidos' },
    { id: 'tabla', label: 'Tabla', route: '/tabla', icon: 'tabla' },
    { id: 'feed', label: 'Feed', route: '/feed', icon: 'feed' },
    { id: 'resultados', label: 'Resultados', route: '/resultados', icon: 'resultados' },
    { id: 'perfil', label: 'Perfil', route: '/perfil', icon: 'perfil' }
  ];
}
