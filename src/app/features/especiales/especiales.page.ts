import { computed, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { resolveCrestUrl } from '../../core/config/equipos-crest.config';
import {
  CIERRE_ESPECIALES,
  EQUIPOS_MUNDIALISTAS,
  GOLEADORES_MUNDIALISTAS,
  PORTEROS_MUNDIALISTAS,
  type EquipoMundialista
} from '../../core/config/torneo.config';
import {
  PREMIOS_ESPECIALES,
  type PremioEspecialMeta,
  type PronosticoEspecialTipo
} from '../../core/models/pronostico-especial.model';
import { PronosticosEspecialesService } from '../../core/services/pronosticos-especiales.service';
import { SkeletonCardComponent } from '../../shared/components/quiniela-ui/skeleton-card.component';
import { TeamFlagComponent } from '../../shared/components/quiniela-ui/team-flag.component';

@Component({
  selector: 'app-especiales-page',
  standalone: true,
  imports: [SkeletonCardComponent, TeamFlagComponent],
  templateUrl: './especiales.page.html',
  styleUrl: './especiales.page.scss'
})
export class EspecialesPage {
  private readonly service = inject(PronosticosEspecialesService);
  private readonly router = inject(Router);

  private readonly especialesSource = toSignal(this.service.misPronosticosEspeciales$(), {
    initialValue: undefined
  });

  protected readonly premios: readonly PremioEspecialMeta[] = PREMIOS_ESPECIALES;
  protected readonly equipos: readonly EquipoMundialista[] = EQUIPOS_MUNDIALISTAS;
  protected readonly skeletonRows: readonly number[] = [1, 2, 3, 4];
  protected readonly saving = signal<PronosticoEspecialTipo | null>(null);

  protected readonly estaAbierto = computed(
    () => Date.now() < CIERRE_ESPECIALES.getTime()
  );

  protected readonly isLoading = computed(
    () => this.especialesSource() === undefined
  );

  protected readonly fechaCierreLabel = new Intl.DateTimeFormat('es-GT', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(CIERRE_ESPECIALES);

  protected pickActual(tipo: PronosticoEspecialTipo): string | null {
    return this.especialesSource()?.find((e) => e.tipo === tipo)?.valor ?? null;
  }

  protected opcionesFor(tipo: PronosticoEspecialTipo): readonly string[] {
    if (tipo === 'campeon') {
      return this.equipos.map((equipo) => equipo.nombre);
    }

    if (tipo === 'guante_oro') {
      return PORTEROS_MUNDIALISTAS;
    }

    return GOLEADORES_MUNDIALISTAS;
  }

  protected esEquipo(tipo: PronosticoEspecialTipo): boolean {
    return tipo === 'campeon';
  }

  protected banderaFor(nombreEquipo: string | null): string {
    return resolveCrestUrl(nombreEquipo ?? '');
  }

  protected async guardarPick(tipo: PronosticoEspecialTipo, event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const valor = select.value;

    if (!valor) {
      return;
    }

    this.saving.set(tipo);

    try {
      await this.service.guardar(tipo, valor);
    } finally {
      this.saving.set(null);
    }
  }

  protected volver(): void {
    this.router.navigate(['/perfil']);
  }
}
