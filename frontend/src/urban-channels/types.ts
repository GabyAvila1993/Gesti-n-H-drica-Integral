import type { Municipality } from '../app.config';
import type { Severity } from '../shared/domain/risk-level';

export type DebrisCategory = 'plastic' | 'branch' | 'debris';

export const CATEGORY_LABEL: Record<DebrisCategory, string> = {
  plastic: 'Plástico',
  branch: 'Rama / poda',
  debris: 'Escombro',
};

/** Geometría espacial expresada en porcentaje (0 a 100) respecto a la imagen. */
export interface BoundingBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface DetectedObject {
  id: string;
  label: string;
  category: DebrisCategory;
  confidence: number;
  bbox: BoundingBox;
}

export interface UrbanAnalysisSummary {
  plasticCount: number;
  branchCount: number;
  debrisCount: number;
  recommendation: string;
}

export interface UrbanAnalysisResult {
  analysisId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  provider: string;
  analyzedAt: string;
  obstructionPercentage: number;
  riskLevel: Severity;
  detections: DetectedObject[];
  summary: UrbanAnalysisSummary;
}

export interface UrbanAlert {
  id: string;
  analysisId: string;
  municipality: Municipality;
  address: string;
  obstructionPercentage: number;
  riskLevel: Severity;
  detectionsCount: number;
  detections: DetectedObject[];
  notes?: string;
  createdAt: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface CreateUrbanAlertPayload {
  analysisId: string;
  municipality: Municipality;
  address: string;
  obstructionPercentage: number;
  riskLevel: Severity;
  detections: DetectedObject[];
  notes?: string;
}
