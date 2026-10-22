import { ServiceUnavailableException } from '@nestjs/common';
import type { DetectedObject } from '../domain/detection';
import type { VisionImageInput, VisionProvider } from './vision-provider.interface';

export interface HuggingFaceCredentials {
  apiUrl: string;
  token: string;
}

/**
 * Adaptador preparado para HuggingFace Inference API (ej. facebook/detr-resnet-50).
 * Todas las credenciales provienen del archivo .env.
 */
export class HuggingFaceVisionProvider implements VisionProvider {
  readonly name = 'huggingface';

  constructor(private readonly credentials: HuggingFaceCredentials) {}

  async analyzeImage(image: VisionImageInput): Promise<DetectedObject[]> {
    if (!this.credentials.apiUrl || !this.credentials.token) {
      throw new ServiceUnavailableException(
        'Faltan HUGGINGFACE_API_URL o HUGGINGFACE_TOKEN en el archivo .env. Usá AI_VISION_PROVIDER=mock para el prototipo.',
      );
    }

    const response = await fetch(this.credentials.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.credentials.token}`,
        'Content-Type': image.mimetype || 'application/octet-stream',
      },
      body: new Uint8Array(image.buffer),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `HuggingFace API respondió con estado ${response.status}`,
      );
    }

    const raw = (await response.json()) as Array<{
      label: string;
      score: number;
      box: { xmin: number; ymin: number; xmax: number; ymax: number };
    }>;

    return raw.slice(0, 8).map((item, idx) => ({
      id: `hf-${idx}`,
      label: item.label,
      category: item.label.toLowerCase().includes('bottle') ? 'plastic' : 'debris',
      confidence: Math.round(item.score * 100),
      bbox: {
        top: Math.max(5, Math.min(85, Math.round(item.box.ymin / 5))),
        left: Math.max(5, Math.min(85, Math.round(item.box.xmin / 5))),
        width: Math.max(10, Math.min(60, Math.round((item.box.xmax - item.box.xmin) / 5))),
        height: Math.max(10, Math.min(60, Math.round((item.box.ymax - item.box.ymin) / 5))),
      },
    }));
  }
}
