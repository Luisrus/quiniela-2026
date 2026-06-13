import {
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  Output,
  signal
} from '@angular/core';

import { ApuestasDiaService } from '../../../core/services/apuestas-dia.service';
import type { UiMatch, UiPlayer } from '../../models/quiniela-view.model';
import { BottomSheetComponent } from './bottom-sheet.component';

@Component({
  selector: 'app-apuesta-jornada-sheet',
  standalone: true,
  imports: [BottomSheetComponent],
  template: `
    <app-bottom-sheet (close)="close.emit()">
      <div sheet-title>
        <p style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 4px">
          Apuesta social
        </p>
        <h2 style="font-size: 20px; font-weight: 800; margin: 0">Nueva apuesta</h2>
        <p style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; line-height: 1.4">
          Elige un partido y reta a otro jugador. Gana quien quede mas cerca del marcador.
        </p>
      </div>

      <div style="flex: 1; overflow-y: auto; padding: 4px 20px 24px; display: flex; flex-direction: column; gap: 14px">
        <div>
          <label for="select-partido-apuesta" style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em">
            Partido
          </label>
          <select
            id="select-partido-apuesta"
            style="width: 100%; min-height: 48px; padding: 0 14px; border: 1px solid var(--bg-border); border-radius: 10px; background: var(--bg-elevated); color: var(--text-primary); font-family: var(--font-ui); font-size: 15px; font-weight: 600; cursor: pointer; appearance: auto"
            [disabled]="saving()"
            (change)="onMatchSelect($event)"
          >
            <option value="" disabled [selected]="!selectedMatchId()">Elige partido...</option>
            @for (match of matches; track match.id) {
              <option [value]="match.id" [selected]="selectedMatchId() === match.id">
                {{ match.home.name }} vs {{ match.away.name }} · {{ match.date }}
              </option>
            }
          </select>
        </div>

        <div>
          <label for="select-retado" style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em">
            Rival
          </label>
          <select
            id="select-retado"
            style="width: 100%; min-height: 48px; padding: 0 14px; border: 1px solid var(--bg-border); border-radius: 10px; background: var(--bg-elevated); color: var(--text-primary); font-family: var(--font-ui); font-size: 15px; font-weight: 600; cursor: pointer; appearance: auto"
            [disabled]="saving()"
            (change)="onPlayerSelect($event)"
          >
            <option value="" disabled [selected]="!selectedUid()">Elige jugador...</option>
            @for (player of otrosJugadores(); track player.id) {
              <option [value]="player.id" [selected]="selectedUid() === player.id">
                {{ player.name }}
              </option>
            }
          </select>
        </div>

        <div style="width: 100%; margin-top: 4px">
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em">
            Que apuestas
          </label>
          <div style="display: flex; gap: 10px; margin-bottom: 10px">
            <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border: 1px solid var(--bg-border); border-radius: 8px; background: var(--bg-elevated); cursor: pointer" [style.border-color]="tipoApuesta() === 'punto' ? 'var(--accent)' : 'var(--bg-border)'">
              <input type="radio" name="tipoApuesta" value="punto" (change)="tipoApuesta.set('punto')" [checked]="tipoApuesta() === 'punto'" style="margin: 0">
              <span style="font-size: 13px; font-weight: 600">1 punto real</span>
            </label>
            <label style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border: 1px solid var(--bg-border); border-radius: 8px; background: var(--bg-elevated); cursor: pointer" [style.border-color]="tipoApuesta() === 'texto' ? 'var(--accent)' : 'var(--bg-border)'">
              <input type="radio" name="tipoApuesta" value="texto" (change)="tipoApuesta.set('texto')" [checked]="tipoApuesta() === 'texto'" style="margin: 0">
              <span style="font-size: 13px; font-weight: 600">Otra cosa</span>
            </label>
          </div>

          @if (tipoApuesta() === 'texto') {
            <input
              type="text"
              placeholder="Ej: una pizza, una chela, el orgullo..."
              style="width: 100%; min-height: 48px; padding: 0 14px; border: 1px solid var(--bg-border); border-radius: 10px; background: var(--bg-elevated); color: var(--text-primary); font-family: var(--font-ui); font-size: 15px; font-weight: 600"
              [disabled]="saving()"
              [value]="apuestaTexto()"
              (input)="onTextoChange($event)"
            />
          } @else {
            <div style="padding: 10px; background: color-mix(in srgb, var(--danger) 15%, transparent); border: 1px solid var(--danger); border-radius: 8px; font-size: 12px; color: var(--danger); font-weight: 600; text-align: center">
              Si ambos sacan 0 puntos en ese partido, nadie gana ni pierde el punto.
            </div>
          }
        </div>

        <button
          type="button"
          style="min-height: 48px; border: none; border-radius: 10px; background: var(--accent); color: var(--text-on-accent); font-family: var(--font-ui); font-size: 14px; font-weight: 800; cursor: pointer; transition: opacity var(--dur-fast), transform var(--dur-fast); letter-spacing: 0.01em; margin-top: 4px"
          [disabled]="!canSave()"
          [style.opacity]="canSave() ? 1 : 0.5"
          (click)="guardar()"
        >
          @if (saving()) { Enviando... } @else { Enviar apuesta }
        </button>
      </div>
    </app-bottom-sheet>
  `
})
export class ApuestaJornadaSheetComponent {
  private readonly service = inject(ApuestasDiaService);

  @Input({ required: true }) userId!: string;
  @Input({ required: true }) players!: readonly UiPlayer[];
  @Input({ required: true }) matches!: readonly UiMatch[];
  @Input({ required: true }) matchJornadaKeys!: Readonly<Record<string, string>>;
  @Output() readonly close = new EventEmitter<void>();

  protected readonly saving = signal(false);
  protected readonly selectedUid = signal('');
  protected readonly selectedMatchId = signal('');
  protected readonly tipoApuesta = signal<'punto' | 'texto'>('punto');
  protected readonly apuestaTexto = signal('');

  protected readonly otrosJugadores = computed(() =>
    this.players.filter((player) => player.id !== this.userId)
  );

  protected readonly canSave = computed(() => {
    const hasTextIfText = this.tipoApuesta() === 'punto' || this.apuestaTexto().trim().length > 0;

    return this.selectedUid() !== '' &&
      this.selectedMatchId() !== '' &&
      hasTextIfText &&
      !this.saving();
  });

  protected onMatchSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedMatchId.set(select.value);
  }

  protected onPlayerSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedUid.set(select.value);
  }

  protected onTextoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.apuestaTexto.set(input.value);
  }

  protected async guardar(): Promise<void> {
    const match = this.matches.find((item) => item.id === this.selectedMatchId());

    if (!this.canSave() || match === undefined) {
      return;
    }

    this.saving.set(true);

    try {
      await this.service.guardar({
        partidoId: match.id,
        jornadaKey: this.matchJornadaKeys[match.id] ?? jornadaKeyForMatch(match),
        retadoUid: this.selectedUid(),
        porUnPuntoReal: this.tipoApuesta() === 'punto',
        apuestaTexto: this.tipoApuesta() === 'punto' ? '' : this.apuestaTexto().trim()
      });
      this.close.emit();
    } finally {
      this.saving.set(false);
    }
  }
}

function jornadaKeyForMatch(match: UiMatch): string {
  return `${match.phase}_${match.date}`.replaceAll(/\s+/g, '_');
}
