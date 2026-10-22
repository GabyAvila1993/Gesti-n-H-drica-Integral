import { ServiceUnavailableException } from '@nestjs/common';
import type { DetectedObject } from '../domain/detection';
import { loadUrbanDataset, resolvePresetKey } from './mock-vision.provider';
import { extractImageDimensions } from './pixel-vision.analyzer';
import type { VisionImageInput, VisionProvider } from './vision-provider.interface';

export interface RoboflowCredentials {
  apiUrl: string;
  apiKey: string;
}

/**
 * Adaptador para Roboflow Hosted Inference API.
 * Soporta ruteo rápido para escenas de prueba y validación de API Key para fotos personalizadas.
 */
export class RoboflowVisionProvider implements VisionProvider {
  readonly name = 'roboflow';

  constructor(private readonly credentials: RoboflowCredentials) {}

  async analyzeImage(image: VisionImageInput): Promise<DetectedObject[]> {
    const presetKey = resolvePresetKey(image);
    if (presetKey) {
      const dataset = await loadUrbanDataset();
      return dataset.visionScenarios[presetKey];
    }

    if (!this.credentials.apiUrl || !this.credentials.apiKey) {
      throw new ServiceUnavailableException(
        'Configura tu API Key para análisis de fotos personalizadas',
      );
    }

    const url = `${this.credentials.apiUrl}?api_key=${encodeURIComponent(this.credentials.apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: image.buffer.toString('base64'),
    });

    if (response.status === 401 || response.status === 403) {
      throw new ServiceUnavailableException(
        'Configura tu API Key para análisis de fotos personalizadas',
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `El servicio de análisis devolvió el código HTTP ${response.status}.`,
      );
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

    const fallbackDims = extractImageDimensions(image.buffer, image.mimetype);
    const imgW = data.image?.width || fallbackDims?.width || 800;
    const imgH = data.image?.height || fallbackDims?.height || 600;

    return (data.predictions ?? []).map((pred, idx) => {
      const lower = pred.class.toLowerCase();
      const category = lower.includes('plast') || lower.includes('bot') || lower.includes('bag')
        ? 'plastic'
        : lower.includes('branch') || lower.includes('ram')
          ? 'branch'
          : 'debris';
      const label =
        category === 'plastic'
          ? 'Botellas de plástico'
          : category === 'branch'
            ? 'Ramas y hojas'
            : 'Escombros / Hormigón';

      return {
        id: `rf-${idx + 1}`,
        label,
        category,
        confidence: Math.round(pred.confidence * 100),
        bbox: {
          top: Math.max(0, Math.round(((pred.y - pred.height / 2) / imgH) * 100)),
          left: Math.max(0, Math.round(((pred.x - pred.width / 2) / imgW) * 100)),
          width: Math.min(100, Math.round((pred.width / imgW) * 100)),
          height: Math.min(100, Math.round((pred.height / imgH) * 100)),
        },
      };
    });
  }
}
