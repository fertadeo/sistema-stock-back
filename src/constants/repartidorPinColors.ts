/** Misma paleta que el frontend (`REPARTIDOR_PIN_COLORS`). */
export const REPARTIDOR_PIN_COLORS = [
  '#2563EB',
  '#16A34A',
  '#DC2626',
  '#9333EA',
  '#EA580C',
  '#DB2777',
  '#0891B2',
  '#4F46E5',
] as const;

export type RepartidorPinColor = (typeof REPARTIDOR_PIN_COLORS)[number];
