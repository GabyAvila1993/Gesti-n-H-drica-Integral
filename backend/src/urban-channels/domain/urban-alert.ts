import type { GeoJsonPoint } from '../../core/geo/geo.types';
import type { DetectedObject } from './detection';
import type { UrbanMunicipality, UrbanRiskLevel } from './risk-level';

export interface UrbanAnalysisSummary {
  plasticCount: number;
  branchCount: number;
  debrisCount: number;
  recommendation: string;
}

/** Resultado devuelto tras analizar una fotografía de acequia. */
export interface UrbanAnalysisResult {
  analysisId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  provider: string;
  analyzedAt: string;
  obstructionPercentage: number;
  riskLevel: UrbanRiskLevel;
  detections: DetectedObject[];
  summary: UrbanAnalysisSummary;
}

/** Alerta registrada por un inspector o vecino a partir de un análisis. */
export interface UrbanAlert {
  id: string;
  analysisId: string;
  municipality: UrbanMunicipality;
  address: string;
  obstructionPercentage: number;
  riskLevel: UrbanRiskLevel;
  detectionsCount: number;
  detections: DetectedObject[];
  notes?: string;
  createdAt: string;
  location: GeoJsonPoint;
}
