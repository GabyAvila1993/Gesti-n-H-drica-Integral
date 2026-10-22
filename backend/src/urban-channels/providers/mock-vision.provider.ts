import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DetectedObject } from '../domain/detection';
import type { VisionImageInput, VisionProvider } from './vision-provider.interface';

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
    readonly scenarioKey: 'critico' | 'medio' | 'bajo';
    readonly notes?: string;
    readonly minutesAgo: number;
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
 * Proveedor simulado de visión por computadora que lee los escenarios de detección
 * de forma asíncrona desde `mendoza-urban.mock.json`, manteniendo el código 100% agnóstico a los datos.
 */
export class MockVisionProvider implements VisionProvider {
  readonly name = 'mock';
  private scenariosCache: DetectedObject[][] | null = null;

  private async getScenarios(): Promise<DetectedObject[][]> {
    if (this.scenariosCache) {
      return this.scenariosCache;
    }
    const dataset = await loadUrbanDataset();
    this.scenariosCache = [
      dataset.visionScenarios.critico,
      dataset.visionScenarios.medio,
      dataset.visionScenarios.bajo,
    ];
    return this.scenariosCache;
  }

  async analyzeImage(image: VisionImageInput): Promise<DetectedObject[]> {
    const scenarios = await this.getScenarios();
    const normalizedName = image.originalname.toLowerCase();

    if (normalizedName.includes('crit') || normalizedName.includes('sever')) {
      return scenarios[0];
    }
    if (normalizedName.includes('med') || normalizedName.includes('moder')) {
      return scenarios[1];
    }
    if (normalizedName.includes('baj') || normalizedName.includes('lev')) {
      return scenarios[2];
    }

    // Selección determinística según el nombre y tamaño del archivo subido
    const hash = Array.from(image.originalname).reduce(
      (acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0,
      image.size >>> 0,
    );
    const index = hash % scenarios.length;
    return scenarios[index];
  }
}
