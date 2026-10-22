import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DetectedObject } from '../domain/detection';
import { analyzeImagePixels } from './pixel-vision.analyzer';
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
 * Ruteo inteligente:
 * - Si la petición proviene de una escena de prueba (`presetId` o SVG de muestra), devuelve
 *   las coordenadas del dataset estático `mendoza-urban.mock.json`.
 * - Si el usuario sube una foto real por Drag & Drop (JPG/PNG), analiza la imagen píxel por píxel
 *   para ubicar dinámicamente los cúmulos de residuos reales en la foto.
 */
export class MockVisionProvider implements VisionProvider {
  readonly name = 'pixel-analyzer';

  async analyzeImage(image: VisionImageInput): Promise<DetectedObject[]> {
    const presetKey = resolvePresetKey(image);
    if (presetKey) {
      const dataset = await loadUrbanDataset();
      return dataset.visionScenarios[presetKey];
    }

    // Análisis dinámico píxel por píxel sobre la imagen real subida por el usuario
    return analyzeImagePixels(image.buffer, image.mimetype);
  }
}
