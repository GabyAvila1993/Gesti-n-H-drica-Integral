import { ServiceUnavailableException } from '@nestjs/common';
import type { DebrisCategory, DetectedObject } from '../domain/detection';
import { loadUrbanDataset, resolvePresetKey } from './mock-vision.provider';
import { analyzeImagePixels, extractImageDimensions } from './pixel-vision.analyzer';
import type { VisionImageInput, VisionProvider } from './vision-provider.interface';

export interface HuggingFaceCredentials {
  apiUrl: string;
  token: string;
}

const DEFAULT_HF_DETR_URL =
  'https://api-inference.huggingface.co/models/facebook/detr-resnet-50';

/**
 * Proveedor de detección de objetos mediante Hugging Face Inference API (DETR / YOLO).
 * - Si el usuario pulsa un botón de escena simulada, responde rápido con el JSON de prueba.
 * - Si sube una foto personalizada y falta el token, informa:
 *   "Configura tu API Key para análisis de fotos personalizadas".
 * - Cuando el token está configurado, consulta la API de Hugging Face y normaliza las
 *   coordenadas en píxeles usando las dimensiones reales de la foto subida.
 */
export class HuggingFaceVisionProvider implements VisionProvider {
  readonly name = 'huggingface';

  constructor(private readonly credentials: HuggingFaceCredentials) {}

  async analyzeImage(image: VisionImageInput): Promise<DetectedObject[]> {
    // 1. Ruteo rápido para botones de escena de prueba
    const presetKey = resolvePresetKey(image);
    if (presetKey) {
      const dataset = await loadUrbanDataset();
      return dataset.visionScenarios[presetKey];
    }

    // 2. Foto personalizada subida por Drag & Drop: validar API Key
    if (!this.credentials.token) {
      throw new ServiceUnavailableException(
        'Configura tu API Key para análisis de fotos personalizadas',
      );
    }

    const endpoint = this.credentials.apiUrl || DEFAULT_HF_DETR_URL;
    const dimensions = extractImageDimensions(image.buffer, image.mimetype) ?? {
      width: 800,
      height: 600,
    };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.credentials.token}`,
          'Content-Type': image.mimetype || 'application/octet-stream',
        },
        body: new Uint8Array(image.buffer),
      });
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo conectar con el servicio de análisis de imágenes. Verificá tu conexión.',
      );
    }

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

    const raw = (await response.json()) as Array<{
      label: string;
      score: number;
      box: { xmin: number; ymin: number; xmax: number; ymax: number };
    }>;

    if (!Array.isArray(raw) || raw.length === 0) {
      return analyzeImagePixels(image.buffer, image.mimetype);
    }

    const mapped = raw
      .filter((item) => item.score >= 0.45 && item.box)
      .slice(0, 6)
      .map((item, idx): DetectedObject => {
        const { category, label } = mapDetrLabelToOperational(item.label);
        const left = Math.max(8, Math.min(82, Math.round((item.box.xmin / dimensions.width) * 100)));
        const top = Math.max(12, Math.min(82, Math.round((item.box.ymin / dimensions.height) * 100)));
        const width = Math.max(
          10,
          Math.min(88 - left, Math.round(((item.box.xmax - item.box.xmin) / dimensions.width) * 100)),
        );
        const height = Math.max(
          10,
          Math.min(88 - top, Math.round(((item.box.ymax - item.box.ymin) / dimensions.height) * 100)),
        );

        return {
          id: `hf-${idx + 1}`,
          label,
          category,
          confidence: Math.round(item.score * 100),
          bbox: { top, left, width, height },
        };
      });

    return mapped.length > 0 ? mapped : analyzeImagePixels(image.buffer, image.mimetype);
  }
}

function mapDetrLabelToOperational(rawLabel: string): {
  category: DebrisCategory;
  label: string;
} {
  const lower = rawLabel.toLowerCase();
  if (lower.includes('bottle')) {
    return { category: 'plastic', label: 'Botellas de plástico' };
  }
  if (lower.includes('cup') || lower.includes('bowl') || lower.includes('wine glass')) {
    return { category: 'plastic', label: 'Vasos de telgopor' };
  }
  if (lower.includes('bag') || lower.includes('handbag') || lower.includes('backpack') || lower.includes('umbrella')) {
    return { category: 'plastic', label: 'Bolsas de nailon' };
  }
  if (lower.includes('plant') || lower.includes('branch') || lower.includes('tree') || lower.includes('broccoli')) {
    return { category: 'branch', label: 'Ramas y hojas' };
  }
  return { category: 'debris', label: 'Escombros / Hormigón' };
}
