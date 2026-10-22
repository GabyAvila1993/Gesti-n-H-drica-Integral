import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { DataSource, EntityManager } from 'typeorm';
import { POSTGRES_DATA_SOURCE } from '../../core/database/database.module';
import {
  UrbanAlertEntity,
  UrbanAlertStatus,
} from '../../core/database/entities/urban-alert.entity';
import { toGeoJsonPosition, type LatLng } from '../../core/geo/geo.types';
import { StorageService } from '../../core/storage/storage.service';
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

  constructor(
    @Inject(VISION_PROVIDER) private readonly provider: VisionProvider,
    private readonly storageService: StorageService,
    @Inject(POSTGRES_DATA_SOURCE) private readonly dataSource: DataSource | null,
  ) {}

  /**
   * Inicializa los registros base y centros departamentales desde `mendoza-urban.mock.json`
   * y sincroniza con PostgreSQL + PostGIS (`urban_alerts`) cuando `DATABASE_URL` está activa.
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
    const seededAlerts: UrbanAlert[] = dataset.initialAlerts.map((seed) => {
      const detections = dataset.visionScenarios[seed.scenarioKey] ?? [];
      const status = seed.status ?? 'PENDING';
      const resolvedAt =
        status === 'RESOLVED' && seed.resolvedMinutesAgo !== undefined
          ? new Date(now - 1000 * 60 * seed.resolvedMinutesAgo).toISOString()
          : undefined;

      return {
        id: seed.id,
        analysisId: seed.analysisId,
        municipality: seed.municipality as UrbanMunicipality,
        address: seed.address,
        imageUrl: seed.imageUrl,
        obstructionPercentage: seed.obstructionPercentage,
        riskLevel: seed.riskLevel,
        detectionsCount: seed.detectionsCount,
        detections,
        notes: seed.notes,
        status,
        createdAt: new Date(now - 1000 * 60 * seed.minutesAgo).toISOString(),
        resolvedAt,
        location: {
          type: 'Point',
          coordinates: toGeoJsonPosition({ lat: seed.lat, lng: seed.lng }),
        },
      };
    });

    if (this.dataSource && this.dataSource.isInitialized) {
      const repo = this.dataSource.getRepository(UrbanAlertEntity);
      const count = await repo.count();
      if (count === 0) {
        for (const seed of seededAlerts) {
          const entity = repo.create({
            analysis_id: seed.analysisId,
            municipality: seed.municipality,
            address: seed.address,
            geom: seed.location,
            image_url: seed.imageUrl ?? null,
            risk_level: seed.riskLevel,
            obstruction_percentage: seed.obstructionPercentage,
            detections: seed.detections,
            notes: seed.notes ?? null,
            status:
              seed.status === 'RESOLVED'
                ? UrbanAlertStatus.RESOLVED
                : UrbanAlertStatus.PENDING,
            created_at: new Date(seed.createdAt),
            resolved_at: seed.resolvedAt ? new Date(seed.resolvedAt) : null,
          });
          const saved = await repo.save(entity);
          seed.id = saved.id;
        }
      } else {
        const dbEntities = await repo.find({ order: { created_at: 'DESC' } });
        this.alerts = dbEntities.map((row) => this.mapEntityToDomain(row));
        return { alerts: this.alerts, centers: this.municipalityCenters };
      }
    }

    this.alerts = seededAlerts;
    return { alerts: this.alerts, centers: this.municipalityCenters };
  }

  private mapEntityToDomain(entity: UrbanAlertEntity): UrbanAlert {
    return {
      id: entity.id,
      analysisId: entity.analysis_id ?? entity.id,
      municipality: entity.municipality,
      address: entity.address,
      imageUrl: entity.image_url ?? undefined,
      obstructionPercentage: entity.obstruction_percentage,
      riskLevel: entity.risk_level,
      detectionsCount: Array.isArray(entity.detections) ? entity.detections.length : 0,
      detections: Array.isArray(entity.detections) ? entity.detections : [],
      notes: entity.notes ?? undefined,
      status: entity.status,
      createdAt: entity.created_at.toISOString(),
      resolvedAt: entity.resolved_at ? entity.resolved_at.toISOString() : undefined,
      evidenceBeforeUrl: entity.evidence_before_url ?? undefined,
      evidenceAfterUrl: entity.evidence_after_url ?? undefined,
      location: entity.geom,
    };
  }

  async analyzeImage(image: VisionImageInput): Promise<UrbanAnalysisResult> {
    if (!image || !image.buffer || image.size === 0) {
      throw new BadRequestException('Debés adjuntar una fotografía válida de la acequia.');
    }

    const storedFilePromise = this.storageService.saveImage({
      buffer: image.buffer,
      originalname: image.originalname,
      mimetype: image.mimetype,
      folder: 'urban-alerts',
    });

    if (this.provider.analyzeImageFull) {
      const [fullResult, storedFile] = await Promise.all([
        this.provider.analyzeImageFull(image),
        storedFilePromise,
      ]);

      if (fullResult) {
        const baseCalc = calculateObstruction(fullResult.detections);
        return {
          analysisId: randomUUID(),
          fileName: image.originalname,
          fileSize: image.size,
          mimeType: image.mimetype,
          provider: fullResult.providerName,
          analyzedAt: new Date().toISOString(),
          imageUrl: storedFile.url,
          obstructionPercentage: fullResult.obstructionPercentage,
          riskLevel: fullResult.riskLevel,
          detections: fullResult.detections,
          summary: {
            ...baseCalc.summary,
            recommendation: fullResult.notes || baseCalc.summary.recommendation,
          },
        };
      }
    }

    const [detections, storedFile] = await Promise.all([
      this.provider.analyzeImage(image),
      storedFilePromise,
    ]);

    const assessment = calculateObstruction(detections);

    return {
      analysisId: randomUUID(),
      fileName: image.originalname,
      fileSize: image.size,
      mimeType: image.mimetype,
      provider: this.provider.name,
      analyzedAt: new Date().toISOString(),
      imageUrl: storedFile.url,
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

    const point = {
      type: 'Point' as const,
      coordinates: toGeoJsonPosition({
        lat: Number((base.lat + latOffset).toFixed(5)),
        lng: Number((base.lng + lngOffset).toFixed(5)),
      }),
    };

    if (this.dataSource && this.dataSource.isInitialized) {
      const repo = this.dataSource.getRepository(UrbanAlertEntity);
      const entity = repo.create({
        analysis_id: dto.analysisId,
        municipality: dto.municipality,
        address: dto.address.trim(),
        geom: point,
        image_url: dto.imageUrl ?? null,
        risk_level: dto.riskLevel,
        obstruction_percentage: dto.obstructionPercentage,
        detections: dto.detections,
        notes: dto.notes?.trim() || null,
        status: UrbanAlertStatus.PENDING,
        resolved_at: null,
      });
      const saved = await repo.save(entity);
      const domainAlert = this.mapEntityToDomain(saved);
      alerts.unshift(domainAlert);
      return domainAlert;
    }

    const alert: UrbanAlert = {
      id: `urb-${randomUUID().slice(0, 8)}`,
      analysisId: dto.analysisId,
      municipality: dto.municipality,
      address: dto.address.trim(),
      imageUrl: dto.imageUrl,
      obstructionPercentage: dto.obstructionPercentage,
      riskLevel: dto.riskLevel,
      detectionsCount: dto.detections.length,
      detections: dto.detections,
      notes: dto.notes?.trim() || undefined,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      location: point,
    };

    alerts.unshift(alert);
    return alert;
  }

  /**
   * Lista las alertas activas (`PENDING`) para el mapa público y el dashboard general.
   * Las alertas cerradas por las cuadrillas (`status = 'RESOLVED'`) quedan excluidas
   * del mapa público mediante Soft Delete lógico.
   */
  async getAlerts(query: UrbanAlertsQueryDto = {}): Promise<UrbanAlert[]> {
    const { alerts } = await this.ensureInitialized();
    return alerts
      .filter((alert) => alert.status === 'PENDING')
      .filter((alert) => !query.municipality || alert.municipality === query.municipality)
      .filter((alert) => !query.riskLevel || alert.riskLevel === query.riskLevel);
  }

  /**
   * Devuelve todas las alertas (incluyendo `RESOLVED`) para los paneles operativos y estadísticos.
   */
  async getAllAlertsIncludingResolved(municipality?: UrbanMunicipality): Promise<UrbanAlert[]> {
    const { alerts } = await this.ensureInitialized();
    return alerts.filter((alert) => !municipality || alert.municipality === municipality);
  }

  async findAlertById(alertId: string): Promise<UrbanAlert | undefined> {
    const { alerts } = await this.ensureInitialized();
    return alerts.find((a) => a.id === alertId);
  }

  /**
   * Soft Delete lógico: marca la alerta como `RESOLVED` cuando la cuadrilla finaliza la limpieza
   * adjuntando obligatoriamente las fotografías de evidencia "Antes" y "Después".
   */
  async markAlertResolved(
    alertId: string,
    payload: {
      resolutionNotes?: string;
      evidenceBeforeUrl: string;
      evidenceAfterUrl: string;
      resolvedAt?: string;
    },
    entityManager?: EntityManager,
  ): Promise<UrbanAlert> {
    const { alerts } = await this.ensureInitialized();
    const target = alerts.find((a) => a.id === alertId);
    if (!target) {
      throw new NotFoundException(`No se encontró la alerta urbana con ID ${alertId}.`);
    }

    const resolvedAtIso = payload.resolvedAt ?? new Date().toISOString();
    const resolutionNotes =
      payload.resolutionNotes && payload.resolutionNotes.trim().length > 0
        ? payload.resolutionNotes.trim()
        : target.notes ?? null;

    if (entityManager) {
      await entityManager.getRepository(UrbanAlertEntity).update(
        { id: alertId },
        {
          status: UrbanAlertStatus.RESOLVED,
          resolved_at: new Date(resolvedAtIso),
          notes: resolutionNotes,
          evidence_before_url: payload.evidenceBeforeUrl,
          evidence_after_url: payload.evidenceAfterUrl,
        },
      );
    } else if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.getRepository(UrbanAlertEntity).update(
        { id: alertId },
        {
          status: UrbanAlertStatus.RESOLVED,
          resolved_at: new Date(resolvedAtIso),
          notes: resolutionNotes,
          evidence_before_url: payload.evidenceBeforeUrl,
          evidence_after_url: payload.evidenceAfterUrl,
        },
      );
    }

    target.status = 'RESOLVED';
    target.resolvedAt = resolvedAtIso;
    target.evidenceBeforeUrl = payload.evidenceBeforeUrl;
    target.evidenceAfterUrl = payload.evidenceAfterUrl;
    target.notes = resolutionNotes ?? undefined;

    return target;
  }
}
