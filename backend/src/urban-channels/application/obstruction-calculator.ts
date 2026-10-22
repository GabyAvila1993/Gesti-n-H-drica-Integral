import type { DebrisCategory, DetectedObject } from '../domain/detection';
import type { UrbanRiskLevel } from '../domain/risk-level';
import type { UrbanAnalysisSummary } from '../domain/urban-alert';

/**
 * Factor de retención hidráulica según el tipo de residuo:
 * - escombros y ramas traban el paso del agua con mayor impacto que envases aislados.
 */
const CATEGORY_HYDRAULIC_WEIGHT: Record<DebrisCategory, number> = {
  plastic: 1.45,
  branch: 1.75,
  debris: 1.9,
};

export interface ObstructionAssessment {
  obstructionPercentage: number;
  riskLevel: UrbanRiskLevel;
  summary: UrbanAnalysisSummary;
}

/** Clasifica el porcentaje de obstrucción en BAJO (<25%), MEDIO (25–60%) o CRITICO (>60%). */
export function classifyObstructionRisk(obstructionPercentage: number): UrbanRiskLevel {
  if (obstructionPercentage > 60) return 'CRITICO';
  if (obstructionPercentage >= 25) return 'MEDIO';
  return 'BAJO';
}

/**
 * Calcula el porcentaje estimado de obstrucción del cauce a partir de la geometría
 * de los residuos detectados dentro del corredor útil de la acequia.
 */
export function calculateObstruction(detections: DetectedObject[]): ObstructionAssessment {
  let weightedAreaSum = 0;
  let plasticCount = 0;
  let branchCount = 0;
  let debrisCount = 0;

  for (const item of detections) {
    const widthClamped = Math.max(0, Math.min(100, item.bbox.width));
    const heightClamped = Math.max(0, Math.min(100, item.bbox.height));
    const boxAreaPct = (widthClamped * heightClamped) / 100;
    const confidenceFactor = Math.max(0.5, Math.min(1, item.confidence / 100));
    weightedAreaSum += boxAreaSumContribution(
      boxAreaPct,
      CATEGORY_HYDRAULIC_WEIGHT[item.category],
      confidenceFactor,
    );

    if (item.category === 'plastic') plasticCount++;
    else if (item.category === 'branch') branchCount++;
    else debrisCount++;
  }

  // Escala respecto al corredor interno del cauce en la foto (~36% del encuadre total,
  // descontando veredas, paredes laterales y puentes)
  const rawObstruction = (weightedAreaSum / 36) * 100;
  const obstructionPercentage = Math.min(98, Math.max(0, Math.round(rawObstruction)));
  const riskLevel = classifyObstructionRisk(obstructionPercentage);

  return {
    obstructionPercentage,
    riskLevel,
    summary: {
      plasticCount,
      branchCount,
      debrisCount,
      recommendation: buildRecommendation(riskLevel),
    },
  };
}

function boxAreaSumContribution(areaPct: number, weight: number, confidence: number): number {
  return areaPct * weight * confidence;
}

function buildRecommendation(riskLevel: UrbanRiskLevel): string {
  if (riskLevel === 'CRITICO') {
    return 'Acequia obstruida. Requiere limpieza inmediata por riesgo de desborde.';
  }
  if (riskLevel === 'MEDIO') {
    return 'Obstrucción parcial del cauce. Programar limpieza preventiva en el sector.';
  }
  return 'Cauce despejado con residuos aislados. Mantener limpieza habitual.';
}
