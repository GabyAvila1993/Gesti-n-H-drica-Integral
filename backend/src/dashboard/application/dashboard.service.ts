import { Injectable } from '@nestjs/common';
import { SatelliteMonitoringService } from '../../satellite-monitoring/application/satellite-monitoring.service';
import type { LeakAlert } from '../../satellite-monitoring/domain/leak-alert';
import type { Severity } from '../../satellite-monitoring/domain/severity';
import { UrbanAnalysisService } from '../../urban-channels/application/urban-analysis.service';
import type { UrbanMunicipality } from '../../urban-channels/domain/risk-level';
import type { UrbanAlert } from '../../urban-channels/domain/urban-alert';
import type {
  DashboardMapOverview,
  DashboardMetrics,
  UnifiedIncidentRecord,
} from '../domain/dashboard.types';
import type { DashboardQueryDto } from '../dto/dashboard-query.dto';

const SEVERITY_WEIGHT: Record<Severity, number> = {
  CRITICO: 3,
  MEDIO: 2,
  BAJO: 1,
};

@Injectable()
export class DashboardService {
  constructor(
    private readonly satelliteService: SatelliteMonitoringService,
    private readonly urbanService: UrbanAnalysisService,
  ) {}

  async getMetrics(municipality?: UrbanMunicipality): Promise<DashboardMetrics> {
    const [canals, allLeaks, allUrbanAlerts] = await Promise.all([
      this.satelliteService.getCanals(),
      this.satelliteService.getAlerts(),
      this.urbanService.getAlerts(municipality ? { municipality } : {}),
    ]);

    const filteredCanals = municipality
      ? canals.filter((c) => c.municipalities.includes(municipality))
      : canals;

    const filteredLeaks = municipality
      ? allLeaks.filter((a) => a.municipality === municipality)
      : allLeaks;

    const satelliteLeaksCritical = filteredLeaks.filter((a) => a.severity === 'CRITICO').length;
    const urbanAlertsCritical = allUrbanAlerts.filter((a) => a.riskLevel === 'CRITICO').length;

    const averageUrbanObstructionPct =
      allUrbanAlerts.length > 0
        ? Math.round(
            allUrbanAlerts.reduce((acc, a) => acc + a.obstructionPercentage, 0) /
              allUrbanAlerts.length,
          )
        : 0;

    return {
      canalsMonitored: filteredCanals.length,
      satelliteLeaksDetected: filteredLeaks.length,
      satelliteLeaksCritical,
      urbanAlertsTotal: allUrbanAlerts.length,
      urbanAlertsCritical,
      averageUrbanObstructionPct,
      criticalIncidentsTotal: satelliteLeaksCritical + urbanAlertsCritical,
      updatedAt: new Date().toISOString(),
    };
  }

  async getRecords(query: DashboardQueryDto = {}): Promise<UnifiedIncidentRecord[]> {
    const [satelliteAlerts, urbanAlerts] = await Promise.all([
      this.satelliteService.getAlerts(),
      this.urbanService.getAlerts(),
    ]);

    const fromSatellite = satelliteAlerts.map((leak) => this.mapLeakToRecord(leak));
    const fromUrban = urbanAlerts.map((alert) => this.mapUrbanToRecord(alert));

    return [...fromSatellite, ...fromUrban]
      .filter((rec) => !query.municipality || rec.municipality === query.municipality)
      .filter((rec) => !query.source || rec.source === query.source)
      .filter((rec) => !query.severity || rec.severity === query.severity)
      .sort((a, b) => {
        const diffSeverity = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
        if (diffSeverity !== 0) return diffSeverity;
        return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
      });
  }

  async getMapOverview(municipality?: UrbanMunicipality): Promise<DashboardMapOverview> {
    const [canals, satelliteAlerts, urbanAlerts] = await Promise.all([
      this.satelliteService.getCanals(),
      this.satelliteService.getAlerts(),
      this.urbanService.getAlerts(municipality ? { municipality } : {}),
    ]);

    return {
      canals: municipality
        ? canals.filter((c) => c.municipalities.includes(municipality))
        : canals,
      satelliteAlerts: municipality
        ? satelliteAlerts.filter((a) => a.municipality === municipality)
        : satelliteAlerts,
      urbanAlerts,
    };
  }

  private mapLeakToRecord(leak: LeakAlert): UnifiedIncidentRecord {
    return {
      id: `sat-${leak.id}`,
      source: 'SATELLITE',
      sourceLabel: 'Fuga Satelital',
      title: leak.canalName,
      municipality: leak.municipality,
      severity: leak.severity,
      metricLabel: `Humedad ${leak.mndwi.toFixed(2)}`,
      metricValue: leak.mndwi,
      detectedAt: leak.detectedAt,
      details: 'Humedad fuera del cauce detectada por satélite. Revisar posibles pérdidas o roturas en los márgenes del canal.',
      location: leak.location,
    };
  }

  private mapUrbanToRecord(alert: UrbanAlert): UnifiedIncidentRecord {
    const materials = Array.from(new Set(alert.detections.map((d) => d.label))).join(', ');
    return {
      id: alert.id,
      source: 'URBAN',
      sourceLabel: 'Acequia Urbana',
      title: alert.address,
      municipality: alert.municipality,
      severity: alert.riskLevel,
      metricLabel: `Obstrucción ${alert.obstructionPercentage}%`,
      metricValue: alert.obstructionPercentage,
      detectedAt: alert.createdAt,
      details: alert.notes
        ? `${alert.notes} Materiales: ${materials}.`
        : `Acequia con residuos acumulados (${materials}).`,
      location: alert.location,
    };
  }
}
