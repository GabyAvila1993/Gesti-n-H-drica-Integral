import type { DetectedObject } from '../domain/detection';

export const VISION_PROVIDER = Symbol('VISION_PROVIDER');

export type PresetScenarioKey = 'critico' | 'medio' | 'bajo';

export interface VisionImageInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
  presetId?: PresetScenarioKey;
}

/**
 * Contrato para los proveedores de detección en imágenes de acequias.
 */
export interface VisionProvider {
  readonly name: string;
  analyzeImage(image: VisionImageInput): Promise<DetectedObject[]>;
}
