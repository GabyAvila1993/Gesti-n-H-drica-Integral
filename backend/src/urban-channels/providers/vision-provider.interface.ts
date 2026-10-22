import type { DetectedObject } from '../domain/detection';

export const VISION_PROVIDER = Symbol('VISION_PROVIDER');

export interface VisionImageInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Contrato que debe cumplir cualquier proveedor de visión por computadora
 * (mock local, HuggingFace Inference API, Roboflow Hosted API, etc.).
 */
export interface VisionProvider {
  readonly name: string;
  analyzeImage(image: VisionImageInput): Promise<DetectedObject[]>;
}
