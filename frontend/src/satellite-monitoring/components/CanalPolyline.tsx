import { Polyline, Tooltip } from 'react-leaflet';
import type { RiskLevel } from '../../shared/domain/risk-level';
import { classNames } from '../../shared/ui/class-names';
import { toLatLng, type Canal } from '../types';
import styles from './map-layers.module.css';

const STATUS_CLASS: Record<RiskLevel, string> = {
  NORMAL: styles.canalLineNormal,
  BAJO: styles.canalLineLow,
  MEDIO: styles.canalLineMedium,
  CRITICO: styles.canalLineCritical,
};

const RISK_STROKE_COLOR: Record<RiskLevel, string> = {
  CRITICO: '#ef4444',
  MEDIO: '#f59e0b',
  BAJO: '#eab308',
  NORMAL: '#0ea5e9',
};

const RISK_LABEL: Record<RiskLevel, string> = {
  CRITICO: 'Crítico · Desborde/Filtración',
  MEDIO: 'Advertencia · Vigilancia DGI',
  BAJO: 'Observación preventiva',
  NORMAL: 'Flujo nominal',
};

interface CanalPolylineProps {
  canal: Canal;
  dimmed?: boolean;
}

export function CanalPolyline({ canal, dimmed = false }: CanalPolylineProps) {
  const telemetry = canal.properties ?? canal.geometry.properties;
  const isCaciqueGuaymallen =
    canal.id === 'cacique-guaymallen' ||
    canal.name.toLowerCase().includes('cacique guaymallén') ||
    telemetry?.code === '102-C';

  const effectiveRisk: RiskLevel =
    isCaciqueGuaymallen || canal.status === 'CRITICO' || telemetry?.riskLevel === 'CRITICO'
      ? 'CRITICO'
      : (telemetry?.riskLevel ?? canal.status);

  const strokeColor = RISK_STROKE_COLOR[effectiveRisk];
  const strokeWeight = isCaciqueGuaymallen
    ? 6.5
    : effectiveRisk === 'CRITICO'
      ? 5.5
      : effectiveRisk === 'MEDIO'
        ? 4.5
        : effectiveRisk === 'BAJO'
          ? 4
          : 3.5;

  const className = classNames(
    styles.canalLine,
    STATUS_CLASS[effectiveRisk],
    dimmed && styles.canalLineDimmed,
  );

  const codeLabel = telemetry?.code ?? canal.code ?? canal.id.toUpperCase();
  const heightCm = telemetry?.heightCm ?? 95;
  const flowLs = telemetry?.flowLs ?? Math.round(canal.nominalFlowM3s * 20);

  return (
    <Polyline
      key={`${canal.id}-${effectiveRisk}-${dimmed ? 'dim' : 'full'}`}
      positions={canal.geometry.coordinates.map(toLatLng)}
      pathOptions={{
        color: strokeColor,
        weight: strokeWeight,
        opacity: dimmed ? 0.35 : 0.94,
        lineCap: 'round',
        lineJoin: 'round',
        className,
      }}
    >
      <Tooltip sticky className={styles.mapTooltip}>
        <strong>
          [{codeLabel}] {canal.name}
        </strong>
        <br />
        Estado: {RISK_LABEL[effectiveRisk]} · Nivel: {heightCm} cm · Caudal: {flowLs} L/s (
        {canal.nominalFlowM3s} m³/s máx.)
      </Tooltip>
    </Polyline>
  );
}
