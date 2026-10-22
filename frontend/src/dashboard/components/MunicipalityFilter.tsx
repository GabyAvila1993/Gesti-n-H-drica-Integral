import { appConfig, type Municipality } from '../../app.config';
import type { Severity } from '../../shared/domain/risk-level';
import { Select, type SelectOption } from '../../shared/ui/Select/Select';
import type { IncidentSource } from '../types';
import styles from './MunicipalityFilter.module.css';

const MUNICIPALITY_OPTIONS: readonly SelectOption[] = [
  { value: 'ALL', label: 'Todos los municipios (Gran Mendoza)' },
  ...appConfig.municipalities.map((m) => ({ value: m, label: m })),
];

const SOURCE_OPTIONS: readonly SelectOption[] = [
  { value: 'ALL', label: 'Todos los orígenes (Satélite + Urbano)' },
  { value: 'SATELLITE', label: '🛰️ Solo fugas satelitales' },
  { value: 'URBAN', label: '🏙️ Solo acequias urbanas' },
];

const SEVERITY_OPTIONS: readonly SelectOption[] = [
  { value: 'ALL', label: 'Todos los niveles de riesgo' },
  { value: 'CRITICO', label: 'Crítico' },
  { value: 'MEDIO', label: 'Medio' },
  { value: 'BAJO', label: 'Bajo' },
];

interface MunicipalityFilterProps {
  municipality: Municipality | 'ALL';
  source: IncidentSource | 'ALL';
  severity: Severity | 'ALL';
  onMunicipalityChange: (value: Municipality | 'ALL') => void;
  onSourceChange: (value: IncidentSource | 'ALL') => void;
  onSeverityChange: (value: Severity | 'ALL') => void;
}

export function MunicipalityFilter({
  municipality,
  source,
  severity,
  onMunicipalityChange,
  onSourceChange,
  onSeverityChange,
}: MunicipalityFilterProps) {
  return (
    <section className={styles.filterBar} aria-label="Filtros del panel central">
      <Select
        label="Municipio / Zona"
        options={MUNICIPALITY_OPTIONS}
        value={municipality}
        onChange={(e) => onMunicipalityChange(e.target.value as Municipality | 'ALL')}
      />
      <Select
        label="Origen del incidente"
        options={SOURCE_OPTIONS}
        value={source}
        onChange={(e) => onSourceChange(e.target.value as IncidentSource | 'ALL')}
      />
      <Select
        label="Severidad"
        options={SEVERITY_OPTIONS}
        value={severity}
        onChange={(e) => onSeverityChange(e.target.value as Severity | 'ALL')}
      />
    </section>
  );
}
