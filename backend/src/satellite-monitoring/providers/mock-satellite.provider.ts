import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { interpolate } from '../../core/geo/geo.types';
import type { CanalSource } from '../domain/canal';
import type { MoistureReading } from '../domain/leak-alert';
import type { SatelliteProvider } from './satellite-provider.interface';

interface ForcedAnomalySeed {
  readonly canalId: string;
  readonly segment: number;
  readonly t: number;
  readonly mndwi: number;
}

interface MendozaCanalsDataset {
  readonly canals: CanalSource[];
  readonly anomalies: ForcedAnomalySeed[];
}

/** Generador pseudoaleatorio determinístico (mulberry32) para demos reproducibles. */
function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SAMPLES_PER_SEGMENT = 4;

/**
 * Resuelve la ruta del archivo JSON puro de datos geográficos tanto en ejecución
 * compilada (`dist/`) como en entorno de desarrollo o tests (`src/`).
 */
function resolveDatasetPath(): string {
  const adjacentPath = join(__dirname, '..', 'data', 'mendoza-canals.mock.json');
  if (existsSync(adjacentPath)) {
    return adjacentPath;
  }
  return join(process.cwd(), 'src', 'satellite-monitoring', 'data', 'mendoza-canals.mock.json');
}

/**
 * Emula la respuesta de una pasada de Sentinel-2 sobre el Gran Mendoza:
 * lee de forma asíncrona el dataset JSON puro (`mendoza-canals.mock.json`) sin
 * coordenadas ni datos de negocio hardcodeados en el código fuente.
 */
export class MockSatelliteProvider implements SatelliteProvider {
  readonly name = 'mock';
  private readonly sceneId: string;
  private readonly capturedAt: string;
  private datasetCache: MendozaCanalsDataset | null = null;

  constructor(private readonly seed: number) {
    const capture = new Date();
    capture.setUTCHours(14, 10, 0, 0); // hora típica de paso de Sentinel-2 sobre Mendoza
    this.capturedAt = capture.toISOString();
    this.sceneId = `MOCK_S2_MSIL2A_${capture.toISOString().slice(0, 10).replace(/-/g, '')}_T19HDB`;
  }

  private async loadDataset(): Promise<MendozaCanalsDataset> {
    if (this.datasetCache) {
      return this.datasetCache;
    }
    const rawJson = await readFile(resolveDatasetPath(), 'utf-8');
    const parsed = JSON.parse(rawJson) as MendozaCanalsDataset;
    this.datasetCache = parsed;
    return parsed;
  }

  async getCanals(): Promise<CanalSource[]> {
    const dataset = await this.loadDataset();
    return dataset.canals;
  }

  async getMoistureReadings(): Promise<MoistureReading[]> {
    const dataset = await this.loadDataset();
    const random = createRandom(this.seed);
    const readings: MoistureReading[] = [];

    for (const canal of dataset.canals) {
      for (let segment = 0; segment < canal.vertices.length - 1; segment++) {
        const from = canal.vertices[segment];
        const to = canal.vertices[segment + 1];

        for (let sample = 0; sample < SAMPLES_PER_SEGMENT; sample++) {
          const t = sample / SAMPLES_PER_SEGMENT;
          // Suelo seco del piedemonte mendocino: MNDWI entre -0.45 y 0.05
          const baseline = -0.45 + random() * 0.5;
          readings.push(this.buildReading(canal, segment, interpolate(from, to, t), baseline));
        }
      }
    }

    for (const anomaly of dataset.anomalies) {
      const canal = dataset.canals.find((c) => c.id === anomaly.canalId);
      if (!canal) continue;
      const position = interpolate(
        canal.vertices[anomaly.segment],
        canal.vertices[anomaly.segment + 1],
        anomaly.t,
      );
      readings.push(this.buildReading(canal, anomaly.segment, position, anomaly.mndwi));
    }

    return readings;
  }

  private buildReading(
    canal: CanalSource,
    segment: number,
    position: { lat: number; lng: number },
    mndwi: number,
  ): MoistureReading {
    return {
      canalId: canal.id,
      municipality: canal.vertices[segment].municipality,
      position,
      mndwi: Math.round(mndwi * 1000) / 1000,
      capturedAt: this.capturedAt,
      sceneId: this.sceneId,
    };
  }
}
