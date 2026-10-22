/** Niveles de riesgo compartidos en todo el sistema (semáforo). */
export const SEVERITIES = ['BAJO', 'MEDIO', 'CRITICO'] as const;
export type Severity = (typeof SEVERITIES)[number];

const SEVERITY_RANK: Record<Severity, number> = { BAJO: 1, MEDIO: 2, CRITICO: 3 };

export const maxSeverity = (severities: Severity[]): Severity | null =>
  severities.reduce<Severity | null>(
    (worst, current) =>
      worst === null || SEVERITY_RANK[current] > SEVERITY_RANK[worst] ? current : worst,
    null,
  );
