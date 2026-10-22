import { Inject, Injectable } from '@nestjs/common';
import { satelliteConfig, type SatelliteConfig } from '../../core/config/app.config';
import { toGeoJsonPosition } from '../../core/geo/geo.types';
import type { Canal, CanalSource, Municipality } from '../domain/canal';
import type { LeakAlert, MoistureReading } from '../domain/leak-alert';
import { classifyMndwi } from '../domain/mndwi-classifier';
import { maxSeverity } from '../domain/severity';
import type { AlertsQueryDto } from '../dto/alerts-query.dto';
import {
  SATELLITE_PROVIDER,
  type SatelliteProvider,
} from '../providers/satellite-provider.interface';

@Injectable()
export class SatelliteMonitoringService {
  constructor(
    @Inject(SATELLITE_PROVIDER) private readonly provider: SatelliteProvider,
    @Inject(satelliteConfig.KEY) private readonly config: SatelliteConfig,
  ) {}

  async getCanals(): Promise<Canal[]> {
    const [sources, alerts] = await Promise.all([this.provider.getCanals(), this.getAlerts()]);
    return sources.map((source) => this.toCanal(source, alerts));
  }

  async getAlerts(query: AlertsQueryDto = {}): Promise<LeakAlert[]> {
    const [sources, readings] = await Promise.all([
      this.provider.getCanals(),
      this.provider.getMoistureReadings(),
    ]);
    const canalNames = new Map(sources.map((c) => [c.id, c.name]));

    return readings
      .map((reading, index) => this.toAlert(reading, index, canalNames))
      .filter((alert): alert is LeakAlert => alert !== null)
      .filter((alert) => !query.canalId || alert.canalId === query.canalId)
      .filter((alert) => !query.severity || alert.severity === query.severity)
      .sort((a, b) => b.mndwi - a.mndwi);
  }

  private toAlert(
    reading: MoistureReading,
    index: number,
    canalNames: Map<string, string>,
  ): LeakAlert | null {
    const severity = classifyMndwi(reading.mndwi, this.config.thresholds);
    if (!severity) return null;

    return {
      id: `${reading.canalId}-${index}`,
      canalId: reading.canalId,
      canalName: canalNames.get(reading.canalId) ?? reading.canalId,
      municipality: reading.municipality,
      mndwi: reading.mndwi,
      severity,
      detectedAt: reading.capturedAt,
      sceneId: reading.sceneId,
      location: { type: 'Point', coordinates: toGeoJsonPosition(reading.position) },
    };
  }

  private toCanal(source: CanalSource, alerts: LeakAlert[]): Canal {
    const canalAlerts = alerts.filter((a) => a.canalId === source.id);
    const municipalities = [...new Set(source.vertices.map((v) => v.municipality))] as Municipality[];

    return {
      id: source.id,
      name: source.name,
      description: source.description,
      nominalFlowM3s: source.nominalFlowM3s,
      municipalities,
      status: maxSeverity(canalAlerts.map((a) => a.severity)) ?? 'NORMAL',
      activeAlerts: canalAlerts.length,
      geometry: {
        type: 'LineString',
        coordinates: source.vertices.map(toGeoJsonPosition),
      },
    };
  }
}
