import { ServiceUnavailableException } from '@nestjs/common';
import type { DetectedObject } from '../domain/detection';
import type { VisionImageInput, VisionProvider } from './vision-provider.interface';

export interface RoboflowCredentials {
  apiUrl: string;
  apiKey: string;
}

/**
 * Adaptador preparado para Roboflow Hosted Inference API.
 * Todas las credenciales provienen del archivo .env.
 */
export class RoboflowVisionProvider implements VisionProvider {
  readonly name = 'roboflow';

  constructor(private readonly credentials: RoboflowCredentials) {}

  async analyzeImage(image: VisionImageInput): Promise<DetectedObject[]> {
    if (!this.credentials.apiUrl || !this.credentials.apiKey) {
      throw new ServiceUnavailableException(
        'Faltan ROBOFLOW_API_URL o ROBOFLOW_API_KEY en el archivo .env. Usá AI_VISION_PROVIDER=mock para el prototipo.',
      );
    }

    const url = `${this.credentials.apiUrl}?api_key=${encodeURIComponent(this.credentials.apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: image.buffer.toString('base64'),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`Roboflow API respondió con estado ${response.status}`);
    }

    const data = (await response.json()) as {
      image?: { width: number; height: number };
      predictions?: Array<{
        class: string;
        confidence: number;
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
    };

    const imgW = data.image?.width || 1000;
    const imgH = data.image?.height || 1000;

    return (data.predictions ?? []).map((pred, idx) => ({
      id: `rf-${idx}`,
      label: pred.class,
      category: pred.class.toLowerCase().includes('plast')
        ? 'plastic'
        : pred.class.toLowerCase().includes('branch')
          ? 'branch'
          : 'debris',
      confidence: Math.round(pred.confidence * 100),
      bbox: {
        top: Math.max(0, Math.round(((pred.y - pred.height / 2) / imgH) * 100)),
        left: Math.max(0, Math.round(((pred.x - pred.width / 2) / imgW) * 100)),
        width: Math.min(100, Math.round((pred.width / imgW) * 100)),
        height: Math.min(100, Math.round((pred.height / imgH) * 100)),
      },
    }));
  }
}
