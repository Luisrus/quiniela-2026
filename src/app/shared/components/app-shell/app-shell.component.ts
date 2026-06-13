import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { of, switchMap } from 'rxjs';

import type { ApuestaDia } from '../../../core/models/apuesta-dia.model';
import { ApuestasDiaService } from '../../../core/services/apuestas-dia.service';
import { AuthService } from '../../../core/services/auth.service';
import { PartidosService } from '../../../core/services/partidos.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { uniqueStrings } from '../../../core/utils/partido-dia.util';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [BottomNavComponent, RouterOutlet],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly apuestasService = inject(ApuestasDiaService);
  private readonly partidosService = inject(PartidosService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly dismissedRetoIds = signal<ReadonlySet<string>>(new Set<string>());
  protected readonly accionApuestaId = signal<string | null>(null);

  private readonly userId = computed(() => this.auth.userProfile()?.uid ?? '');
  private readonly retosRecibidosSource = toSignal(
    toObservable(this.userId).pipe(
      switchMap((uid) =>
        uid === ''
          ? of([] as readonly ApuestaDia[])
          : this.apuestasService.retosRecibidosPorUid$(uid)
      )
    ),
    { initialValue: [] as readonly ApuestaDia[] }
  );
  private readonly apuestaPartidoIds = computed(() =>
    uniqueStrings(this.retosRecibidosSource().map((apuesta) => apuesta.partidoId))
  );
  private readonly apuestaPartidosSource = toSignal(
    toObservable(this.apuestaPartidoIds).pipe(
      switchMap((ids) =>
        ids.length === 0
          ? of([] as const)
          : this.partidosService.partidosPorIds$(ids)
      )
    ),
    { initialValue: [] as const }
  );
  private readonly usuariosSource = toSignal(this.usuariosService.usuarios$(), {
    initialValue: [] as const
  });

  protected readonly retoPopup = computed(() => {
    const dismissed = this.dismissedRetoIds();

    return this.retosRecibidosSource()
      .find((reto) => !dismissed.has(reto.id)) ?? null;
  });

  constructor() {
    inject(DOCUMENT).documentElement.setAttribute('data-theme', 'broadcast');
  }

  protected cerrarRetoPopup(retoId: string): void {
    this.dismissedRetoIds.update((ids) => new Set([...ids, retoId]));
  }

  protected async aceptarApuesta(retoId: string): Promise<void> {
    this.accionApuestaId.set(retoId);

    try {
      await this.apuestasService.aceptarApuesta(retoId);
      this.cerrarRetoPopup(retoId);
    } finally {
      this.accionApuestaId.set(null);
    }
  }

  protected async rechazarApuesta(retoId: string): Promise<void> {
    this.accionApuestaId.set(retoId);

    try {
      await this.apuestasService.rechazarApuesta(retoId);
      this.cerrarRetoPopup(retoId);
    } finally {
      this.accionApuestaId.set(null);
    }
  }

  protected playerName(uid: string): string {
    return this.usuariosSource().find((usuario) => usuario.uid === uid)?.nombre ?? uid;
  }

  protected matchName(partidoId: string): string {
    const partido = this.apuestaPartidosSource().find((item) => item.id === partidoId);

    if (partido === undefined) {
      return 'Partido pendiente';
    }

    return `${partido.equipoLocal} vs ${partido.equipoVisitante}`;
  }

  protected apuestaDetalle(apuesta: ApuestaDia): string {
    return apuesta.porUnPuntoReal ? '1 punto real' : apuesta.apuestaTexto ?? 'apuesta social';
  }
}
