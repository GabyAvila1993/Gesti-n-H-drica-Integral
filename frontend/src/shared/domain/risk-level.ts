/** Niveles de riesgo compartidos por todos los dominios (semáforo). */
export type Severity = 'BAJO' | 'MEDIO' | 'CRITICO';
export type RiskLevel = 'NORMAL' | Severity;

export const RISK_LABEL: Record<RiskLevel, string> = {
  NORMAL: 'Normal',
  BAJO: 'Bajo',
  MEDIO: 'Medio',
  CRITICO: 'Crítico',
};
