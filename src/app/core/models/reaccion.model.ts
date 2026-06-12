export const reaccionTargetTipos = [
  'pronostico',
  'resultado'
] as const;

export type ReaccionTargetTipo = (typeof reaccionTargetTipos)[number];
export type ReaccionId = `${string}_${ReaccionTargetTipo}_${string}`;

export interface Reaccion {
  readonly id: ReaccionId;
  readonly uid: string;
  readonly targetTipo: ReaccionTargetTipo;
  readonly targetId: string;
  readonly emoji: string;
}

export interface ReaccionInput {
  readonly targetTipo: ReaccionTargetTipo;
  readonly targetId: string;
  readonly emoji: string;
}

export function buildReaccionId(
  uid: string,
  targetTipo: ReaccionTargetTipo,
  targetId: string
): ReaccionId {
  return `${uid}_${targetTipo}_${targetId}` as ReaccionId;
}
