import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DetectedObject } from '../domain/detection';
import {
  analyzeImagePixels,
  analyzeImageWithGemini,
  analyzeImageWithGroq,
  type FullVisionAnalysis,
} from './pixel-vision.analyzer';
import type {
  PresetScenarioKey,
  VisionImageInput,
  VisionProvider,
} from './vision-provider.interface';

export interface UrbanDatasetJson {
  readonly municipalityCenters: Record<string, { lat: number; lng: number }>;
  readonly visionScenarios: {
    readonly critico: DetectedObject[];
    readonly medio: DetectedObject[];
    readonly bajo: DetectedObject[];
  };
  readonly initialAlerts: Array<{
    readonly id: string;
    readonly analysisId: string;
    readonly municipality: string;
    readonly address: string;
    readonly obstructionPercentage: number;
    readonly riskLevel: 'BAJO' | 'MEDIO' | 'CRITICO';
    readonly detectionsCount: number;
    readonly scenarioKey: PresetScenarioKey;
    readonly notes?: string;
    readonly imageUrl?: string;
    readonly status?: 'PENDING' | 'RESOLVED';
    readonly minutesAgo: number;
    readonly resolvedMinutesAgo?: number;
    readonly lat: number;
    readonly lng: number;
  }>;
}

export function resolveUrbanDatasetPath(): string {
  const adjacentPath = join(__dirname, '..', 'data', 'mendoza-urban.mock.json');
  if (existsSync(adjacentPath)) {
    return adjacentPath;
  }
  return join(process.cwd(), 'src', 'urban-channels', 'data', 'mendoza-urban.mock.json');
}

export async function loadUrbanDataset(): Promise<UrbanDatasetJson> {
  const raw = await readFile(resolveUrbanDatasetPath(), 'utf-8');
  return JSON.parse(raw) as UrbanDatasetJson;
}

/**
 * Resuelve si la imagen corresponde a uno de los botones de escena de prueba (demo rápida)
 * y devuelve su clave en `mendoza-urban.mock.json`, o `null` si es una foto real subida por el usuario.
 */
export function resolvePresetKey(image: VisionImageInput): PresetScenarioKey | null {
  if (image.presetId === 'critico' || image.presetId === 'medio' || image.presetId === 'bajo') {
    return image.presetId;
  }

  const normalizedName = image.originalname.toLowerCase();
  if (image.mimetype === 'image/svg+xml' && normalizedName.startsWith('acequia-obstruccion-')) {
    if (normalizedName.includes('crit')) return 'critico';
    if (normalizedName.includes('med')) return 'medio';
    return 'bajo';
  }

  return null;
}

/**
 * Ruteo inteligente con integración de Groq LPU (Meta Llama 3.2 Vision) y fallback local:
 * - Si la petición proviene de una escena de prueba (`presetId` o SVG de muestra), devuelve
 *   las coordenadas del dataset estático `mendoza-urban.mock.json`.
 * - Si el usuario sube una foto real por Drag & Drop (JPG/PNG/WebP), envía el buffer a
 *   `llama-3.2-11b-vision-preview` en Groq con fallback determinista automático en caso de error/cuota.
 */
export class MockVisionProvider implements VisionProvider {
  readonly name: string;

  constructor(
    private readonly groqApiKey?: string,
    private readonly groqModel?: string,
    private readonly geminiApiKey?: string,
  ) {
    this.name = groqModel ? `groq-${groqModel}` : 'groq-llama-3.2-vision';
  }

  async analyzeImage(image: VisionImageInput): Promise<DetectedObject[]> {
    const presetKey = resolvePresetKey(image);
    if (presetKey) {
      const dataset = await loadUrbanDataset();
      return dataset.visionScenarios[presetKey];
    }

    const groqKey = (this.groqApiKey ?? process.env.GROQ_API_KEY ?? '').trim();
    if (groqKey.length > 0) {
      const full = await analyzeImageWithGroq(
        image.buffer,
        image.mimetype,
        groqKey,
        this.groqModel,
      );
      return full.detections;
    }

    const geminiKey = (this.geminiApiKey ?? process.env.GEMINI_API_KEY ?? '').trim();
    if (geminiKey.length > 0) {
      const full = await analyzeImageWithGemini(image.buffer, image.mimetype, geminiKey);
      return full.detections;
    }

    return analyzeImagePixels(image.buffer, image.mimetype);
  }

  async analyzeImageFull(image: VisionImageInput): Promise<FullVisionAnalysis | null> {
    const presetKey = resolvePresetKey(image);
    if (presetKey) {
      return null;
    }

    const groqKey = (this.groqApiKey ?? process.env.GROQ_API_KEY ?? '').trim();
    if (groqKey.length > 0) {
      return analyzeImageWithGroq(image.buffer, image.mimetype, groqKey, this.groqModel);
    }

    return analyzeImageWithGemini(image.buffer, image.mimetype, this.geminiApiKey);
  }
}
