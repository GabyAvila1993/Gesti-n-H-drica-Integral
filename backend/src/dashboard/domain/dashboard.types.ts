import type { GeoJsonPoint } from '../../core/geo/geo.types';
import type { Canal, Municipality } from '../../satellite-monitoring/domain/canal';
import type { LeakAlert } from '../../satellite-monitoring/domain/leak-alert';
import type { Severity } from '../../satellite-monitoring/domain/severity';
import type { UrbanAlert } from '../../urban-channels/domain/urban-alert';

export const INCIDENT_SOURCES = ['SATELLITE', 'URBAN'] as const;
export type IncidentSource = (typeof INCIDENT_SOURCES)[number];

export interface DashboardMetrics {
  canalsMonitored: number;
  satelliteLeaksDetected: number;
  satelliteLeaksCritical: number;
  urbanAlertsTotal: number;
  urbanAlertsCritical: number;
  averageUrbanObstructionPct: number;
  criticalIncidentsTotal: number;
  updatedAt: string;
}

export interface UnifiedIncidentRecord {
  id: string;
  source: IncidentSource;
  sourceLabel: 'Fuga Satelital' | 'Acequia Urbana';
  title: string;
  municipality: Municipality;
  severity: Severity;
  metricLabel: string;
  metricValue: number;
  detectedAt: string;
  details: string;
  location: GeoJsonPoint;
}

export interface DashboardMapOverview {
  canals: Canal[];
  satelliteAlerts: LeakAlert[];
  urbanAlerts: UrbanAlert[];
}
