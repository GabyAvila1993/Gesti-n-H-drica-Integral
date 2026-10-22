import type { Severity } from './severity';

export interface MndwiThresholds {
  /** A partir de este valor se considera humedad anómala (fuga potencial). */
  leak: number;
  medium: number;
  critical: number;
}

/**
 * Clasifica un valor MNDWI según los umbrales configurados.
 * Devuelve `null` cuando la humedad es normal (sin alerta).
 */
export function classifyMndwi(mndwi: number, thresholds: MndwiThresholds): Severity | null {
  if (!(thresholds.leak <= thresholds.medium && thresholds.medium <= thresholds.critical)) {
    throw new Error('Umbrales MNDWI inválidos: deben cumplir leak <= medium <= critical');
  }
  if (mndwi >= thresholds.critical) return 'CRITICO';
  if (mndwi >= thresholds.medium) return 'MEDIO';
  if (mndwi >= thresholds.leak) return 'BAJO';
  return null;
}
