export type MedallaTipo = 'mas_exacto' | 'mas_arriesgado' | 'mas_tibio';

export interface Medalla {
  readonly id: string;
  readonly jornada: string;
  readonly tipo: MedallaTipo;
  readonly uid: string;
}

export const MEDALLA_LABELS: Readonly<Record<MedallaTipo, string>> = {
  mas_exacto: '🎯 Más exacto',
  mas_arriesgado: '🎲 Más arriesgado',
  mas_tibio: '😴 Más tibio'
};
