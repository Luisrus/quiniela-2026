import {
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  signal
} from '@angular/core';

import { ApuestasDiaService } from '../../../core/services/apuestas-dia.service';
import type { ApuestaDia } from '../../../core/models/apuesta-dia.model';
import type { UiPlayer } from '../../models/quiniela-view.model';
import { BottomSheetComponent } from './bottom-sheet.component';

@Component({
  selector: 'app-apuesta-jornada-sheet',
  standalone: true,
  imports: [BottomSheetComponent],
  template: `
    <app-bottom-sheet (close)="close.emit()">
      <div sheet-title>
        <p style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 4px">
          Apuesta social · {{ jornadaLabel }}
        </p>
        <h2 style="font-size: 20px; font-weight: 800; margin: 0">🎲 ¿A quién le apuestas?</h2>
        <p style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; line-height: 1.4">
          Solo por diversión — reta a un primo por puntos
        </p>
      </div>

      <div style="flex: 1; overflow-y: auto; padding: 4px 20px 24px; display: flex; flex-direction: column; gap: 14px">

        <!-- Retos recibidos -->
        @if (retosRecibidosData().length > 0) {
          <div style="padding: 14px; border-radius: var(--r-card); background: var(--bg-elevated); border: 1px solid var(--accent)">
            <p style="font-size: 12px; color: var(--accent); font-weight: 600; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em">Retos Recibidos</p>
            
            <div style="display: flex; flex-direction: column; gap: 10px">
              @for (reto of retosRecibidosData(); track reto.id) {
                <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-body); padding: 10px; border-radius: 8px">
                  <div>
                    <p style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0">
                      {{ retadoName(reto.retador) }}
                    </p>
                    <p style="font-size: 12px; color: var(--text-secondary); margin: 2px 0 0">
                      Te reta por {{ reto.porUnPuntoReal ? '1 Punto Real' : reto.apuestaTexto }}
                    </p>
                  </div>
                  <div style="display: flex; gap: 8px">
                    <button style="border: none; background: var(--success); color: white; border-radius: 6px; padding: 6px 10px; font-weight: 700; cursor: pointer; font-size: 12px" (click)="aceptarReto(reto.id)" [disabled]="actionLoading()">
                      ✓
                    </button>
                    <button style="border: none; background: var(--danger); color: white; border-radius: 6px; padding: 6px 10px; font-weight: 700; cursor: pointer; font-size: 12px" (click)="rechazarReto(reto.id)" [disabled]="actionLoading()">
                      ✕
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        @if (miApuesta(); as apuesta) {
          <!-- Ya apostaste: mostrar a quién -->
          <div style="padding: 14px; border-radius: var(--r-card); background: var(--bg-elevated); border: 1px solid var(--bg-border)">
            <p style="font-size: 12px; color: var(--text-tertiary); font-weight: 600; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em">Tu pick actual</p>
            <div style="display: flex; align-items: center; gap: 10px">
              <span style="font-size: 28px">🎯</span>
              <div>
                <p style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0">
                  {{ retadoName(apuesta.retado) }}
                </p>
                <p style="font-size: 12px; color: resultadoColor(apuesta.resultado); margin: 2px 0 0; font-weight: 600">
                  {{ resultadoLabel(apuesta.resultado) }} ({{ apuesta.porUnPuntoReal ? '1 Pto Real' : apuesta.apuestaTexto }})
                </p>
              </div>
            </div>
          </div>
        }

        <!-- Selector de primo y apuesta -->
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div>
            <label
              for="select-retado"
              style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em"
            >
              @if (miApuesta()) { Cambiar pick } @else { Elegir primo }
            </label>
            <select
              id="select-retado"
              style="width: 100%; min-height: 48px; padding: 0 14px; border: 1px solid var(--bg-border); border-radius: 10px; background: var(--bg-elevated); color: var(--text-primary); font-family: var(--font-ui); font-size: 15px; font-weight: 600; cursor: pointer; appearance: auto; transition: border-color var(--dur-fast)"
              [disabled]="saving()"
              (change)="onSelect($event)"
            >
              <option value="" disabled [selected]="!selectedUid()">Elige un primo…</option>
              @for (primo of otrosPrimos(); track primo.id) {
                <option [value]="primo.id" [selected]="selectedUid() === primo.id">
                  {{ primo.name }}
                </option>
              }
            </select>
          </div>
          
          <div style="width: 100%; margin-top: 4px;">
            <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em">
              ¿Qué apuestas?
            </label>
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
              <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border: 1px solid var(--bg-border); border-radius: 8px; background: var(--bg-elevated); cursor: pointer" [style.border-color]="tipoApuesta() === 'punto' ? 'var(--accent)' : 'var(--bg-border)'">
                <input type="radio" name="tipoApuesta" value="punto" (change)="tipoApuesta.set('punto')" [checked]="tipoApuesta() === 'punto'" style="margin: 0">
                <span style="font-size: 13px; font-weight: 600">1 Punto Real</span>
              </label>
              <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border: 1px solid var(--bg-border); border-radius: 8px; background: var(--bg-elevated); cursor: pointer" [style.border-color]="tipoApuesta() === 'texto' ? 'var(--accent)' : 'var(--bg-border)'">
                <input type="radio" name="tipoApuesta" value="texto" (change)="tipoApuesta.set('texto')" [checked]="tipoApuesta() === 'texto'" style="margin: 0">
                <span style="font-size: 13px; font-weight: 600">Otra cosa</span>
              </label>
            </div>

            @if (tipoApuesta() === 'texto') {
              <input
                type="text"
                placeholder="Ej: Una pizza, el orgullo..."
                style="width: 100%; min-height: 48px; padding: 0 14px; border: 1px solid var(--bg-border); border-radius: 10px; background: var(--bg-elevated); color: var(--text-primary); font-family: var(--font-ui); font-size: 15px; font-weight: 600;"
                [disabled]="saving()"
                [value]="apuestaTexto()"
                (input)="onTextoChange($event)"
              />
            } @else {
              <div style="padding: 10px; background: color-mix(in srgb, var(--danger) 15%, transparent); border: 1px solid var(--danger); border-radius: 8px; font-size: 12px; color: var(--danger); font-weight: 600; text-align: center">
                ¡Atención! El perdedor de esta apuesta restará 1 punto de su clasificación.
              </div>
            }
          </div>
        </div>

        <button
          type="button"
          style="min-height: 48px; border: none; border-radius: 10px; background: var(--accent); color: var(--text-on-accent); font-family: var(--font-ui); font-size: 14px; font-weight: 800; cursor: pointer; transition: opacity var(--dur-fast), transform var(--dur-fast); letter-spacing: 0.01em; margin-top: 4px"
          [disabled]="!canSave()"
          [style.opacity]="canSave() ? 1 : 0.5"
          (click)="guardar()"
        >
          @if (saving()) { Guardando… } @else { 🎲 Apostar }
        </button>
      </div>
    </app-bottom-sheet>
  `
})
export class ApuestaJornadaSheetComponent implements OnChanges {
  private readonly service = inject(ApuestasDiaService);

  @Input({ required: true }) jornadaKey!: string;
  @Input({ required: true }) jornadaLabel!: string;
  @Input({ required: true }) userId!: string;
  @Input({ required: true }) players!: readonly UiPlayer[];
  @Output() readonly close = new EventEmitter<void>();

  protected readonly saving = signal(false);
  protected readonly actionLoading = signal(false);
  protected readonly selectedUid = signal<string>('');
  protected readonly tipoApuesta = signal<'punto' | 'texto'>('punto');
  protected readonly apuestaTexto = signal<string>('');
  
  protected readonly miApuestaData = signal<ApuestaDia | undefined>(undefined);
  protected readonly retosRecibidosData = signal<readonly ApuestaDia[]>([]);

  private apuestaSub: (() => void) | null = null;
  private retosSub: (() => void) | null = null;

  protected readonly miApuesta = this.miApuestaData.asReadonly();

  protected readonly otrosPrimos = computed(() =>
    this.players.filter((p) => p.id !== this.userId)
  );

  protected canSave = computed(() => {
    const hasUid = this.selectedUid().length > 0;
    const hasTextIfText = this.tipoApuesta() === 'punto' || this.apuestaTexto().trim().length > 0;
    return hasUid && hasTextIfText && !this.saving();
  });

  ngOnChanges(): void {
    const subApuesta = this.service.miApuesta$(this.jornadaKey).subscribe((apuesta) => {
      this.miApuestaData.set(apuesta);
      if (apuesta && !this.selectedUid()) {
        this.selectedUid.set(apuesta.retado);
        if (apuesta.porUnPuntoReal) {
          this.tipoApuesta.set('punto');
        } else {
          this.tipoApuesta.set('texto');
          this.apuestaTexto.set(apuesta.apuestaTexto || '');
        }
      }
    });

    const subRetos = this.service.misRetosRecibidos$(this.jornadaKey).subscribe((retos) => {
      this.retosRecibidosData.set(retos);
    });

    this.apuestaSub?.();
    this.apuestaSub = () => subApuesta.unsubscribe();

    this.retosSub?.();
    this.retosSub = () => subRetos.unsubscribe();
  }

  protected onSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedUid.set(select.value);
  }

  protected onTextoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.apuestaTexto.set(input.value);
  }

  protected async guardar(): Promise<void> {
    const uid = this.selectedUid();
    const esPunto = this.tipoApuesta() === 'punto';
    const texto = this.apuestaTexto().trim();

    if (!this.canSave()) {
      return;
    }

    this.saving.set(true);
    try {
      await this.service.guardar(this.jornadaKey, uid, esPunto, esPunto ? '' : texto);
      this.close.emit();
    } finally {
      this.saving.set(false);
    }
  }

  protected async aceptarReto(id: string): Promise<void> {
    this.actionLoading.set(true);
    try {
      await this.service.aceptarApuesta(id);
    } finally {
      this.actionLoading.set(false);
    }
  }

  protected async rechazarReto(id: string): Promise<void> {
    this.actionLoading.set(true);
    try {
      await this.service.rechazarApuesta(id);
    } finally {
      this.actionLoading.set(false);
    }
  }

  protected retadoName(uid: string): string {
    return this.players.find((p) => p.id === uid)?.name ?? uid;
  }

  protected resultadoLabel(resultado: string): string {
    const labels: Record<string, string> = {
      esperando_aceptacion: '⏱ Esperando que acepte',
      rechazada: '❌ Rechazó tu reto',
      pendiente: '⏳ Aceptado (Pendiente)',
      ganada: '😂 ¡Le ganaste!',
      perdida: '💀 Te ganó',
      empatada: '🤝 Empate'
    };

    return labels[resultado] ?? resultado;
  }

  protected resultadoColor(resultado: string): string {
    if (resultado === 'ganada') {
      return 'var(--accent)';
    }

    if (resultado === 'perdida' || resultado === 'rechazada') {
      return 'var(--danger, var(--live))';
    }
    
    if (resultado === 'esperando_aceptacion') {
      return 'var(--warning, #eab308)';
    }

    return 'var(--text-tertiary)';
  }
}
