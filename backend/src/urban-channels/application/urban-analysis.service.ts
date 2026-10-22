import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { toGeoJsonPosition, type LatLng } from '../../core/geo/geo.types';
import type { UrbanMunicipality } from '../domain/risk-level';
import type { UrbanAlert, UrbanAnalysisResult } from '../domain/urban-alert';
import type { CreateUrbanAlertDto } from '../dto/create-urban-alert.dto';
import type { UrbanAlertsQueryDto } from '../dto/urban-alerts-query.dto';
import { loadUrbanDataset } from '../providers/mock-vision.provider';
import {
  VISION_PROVIDER,
  type VisionImageInput,
  type VisionProvider,
} from '../providers/vision-provider.interface';
import { calculateObstruction } from './obstruction-calculator';

@Injectable()
export class UrbanAnalysisService {
  private alerts: UrbanAlert[] | null = null;
  private municipalityCenters: Record<string, LatLng> | null = null;

  constructor(@Inject(VISION_PROVIDER) private readonly provider: VisionProvider) {}

  /**
   * Inicializa en memoria los registros base y centros departamentales leyendo de forma
   * asíncrona el archivo `mendoza-urban.mock.json`. El código fuente no contiene
   * ninguna coordenada ni dato de negocio hardcodeado.
   */
  private async ensureInitialized(): Promise<{
    alerts: UrbanAlert[];
    centers: Record<string, LatLng>;
  }> {
    if (this.alerts && this.municipalityCenters) {
      return { alerts: this.alerts, centers: this.municipalityCenters };
    }

    const dataset = await loadUrbanDataset();
    this.municipalityCenters = dataset.municipalityCenters;

    const now = Date.now();
    this.alerts = dataset.initialAlerts.map((seed) => {
      const detections = dataset.visionScenarios[seed.scenarioKey] ?? [];
      return {
        id: seed.id,
        analysisId: seed.analysisId,
        municipality: seed.municipality as UrbanMunicipality,
        address: seed.address,
        obstructionPercentage: seed.obstructionPercentage,
        riskLevel: seed.riskLevel,
        detectionsCount: seed.detectionsCount,
        detections,
        notes: seed.notes,
        createdAt: new Date(now - 1000 * 60 * seed.minutesAgo).toISOString(),
        location: {
          type: 'Point',
          coordinates: toGeoJsonPosition({ lat: seed.lat, lng: seed.lng }),
        },
      };
    });

    return { alerts: this.alerts, centers: this.municipalityCenters };
  }

  async analyzeImage(image: VisionImageInput): Promise<UrbanAnalysisResult> {
    if (!image || !image.buffer || image.size === 0) {
      throw new BadRequestException('Debés adjuntar una fotografía válida de la acequia.');
    }

    const detections = await this.provider.analyzeImage(image);
    const assessment = calculateObstruction(detections);

    return {
      analysisId: randomUUID(),
      fileName: image.originalname,
      fileSize: image.size,
      mimeType: image.mimetype,
      provider: this.provider.name,
      analyzedAt: new Date().toISOString(),
      obstructionPercentage: assessment.obstructionPercentage,
      riskLevel: assessment.riskLevel,
      detections,
      summary: assessment.summary,
    };
  }

  async createAlert(dto: CreateUrbanAlertDto): Promise<UrbanAlert> {
    const { alerts, centers } = await this.ensureInitialized();
    const base = centers[dto.municipality];
    if (!base) {
      throw new BadRequestException(`Municipio no registrado en dataset: ${dto.municipality}`);
    }

    // Desplazamiento determinístico leve según la dirección para ubicar el marcador en el municipio
    const offsetSeed = Array.from(dto.address).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const latOffset = ((offsetSeed % 17) - 8) * 0.0012;
    const lngOffset = (((offsetSeed * 7) % 19) - 9) * 0.0012;

    const alert: UrbanAlert = {
      id: `urb-${randomUUID().slice(0, 8)}`,
      analysisId: dto.analysisId,
      municipality: dto.municipality,
      address: dto.address.trim(),
      obstructionPercentage: dto.obstructionPercentage,
      riskLevel: dto.riskLevel,
      detectionsCount: dto.detections.length,
      detections: dto.detections,
      notes: dto.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      location: {
        type: 'Point',
        coordinates: toGeoJsonPosition({
          lat: Number((base.lat + latOffset).toFixed(5)),
          lng: Number((base.lng + lngOffset).toFixed(5)),
        }),
      },
    };

    alerts.unshift(alert);
    return alert;
  }

  async getAlerts(query: UrbanAlertsQueryDto = {}): Promise<UrbanAlert[]> {
    const { alerts } = await this.ensureInitialized();
    return alerts
      .filter((alert) => !query.municipality || alert.municipality === query.municipality)
      .filter((alert) => !query.riskLevel || alert.riskLevel === query.riskLevel);
  }
}
