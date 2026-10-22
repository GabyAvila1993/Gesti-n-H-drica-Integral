import { Button } from '../../shared/ui/Button/Button';
import { RiskBadge } from '../../shared/ui/RiskBadge/RiskBadge';
import { classNames } from '../../shared/ui/class-names';
import type { UnifiedIncidentRecord } from '../types';
import styles from './RecordsTable.module.css';

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Mendoza',
});

interface RecordsTableProps {
  records: UnifiedIncidentRecord[];
  selectedId: string | null;
  onSelectRecord: (record: UnifiedIncidentRecord) => void;
}

export function RecordsTable({ records, selectedId, onSelectRecord }: RecordsTableProps) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.recordsTable} aria-label="Tabla consolidada de incidentes hídricos">
        <thead>
          <tr>
            <th scope="col">Origen</th>
            <th scope="col">Canal / Ubicación</th>
            <th scope="col">Municipio</th>
            <th scope="col">Indicador</th>
            <th scope="col">Estado</th>
            <th scope="col">Fecha</th>
            <th scope="col">Acción</th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec) => {
            const isSelected = rec.id === selectedId;
            return (
              <tr
                key={rec.id}
                className={classNames(
                  styles.recordsTableRow,
                  isSelected && styles.recordsTableRowSelected,
                )}
              >
                <td data-label="Origen">
                  <span className={styles.recordsTableSource}>
                    <span aria-hidden="true">{rec.source === 'SATELLITE' ? '🛰️' : '🏙️'}</span>
                    {rec.sourceLabel}
                  </span>
                </td>
                <td data-label="Ubicación" className={styles.recordsTableTitle}>
                  {rec.title}
                </td>
                <td data-label="Municipio">{rec.municipality}</td>
                <td data-label="Indicador" className={styles.recordsTableMetric}>
                  {rec.metricLabel}
                </td>
                <td data-label="Estado">
                  <RiskBadge level={rec.severity} />
                </td>
                <td data-label="Fecha" className={styles.recordsTableDate}>
                  {dateFormatter.format(new Date(rec.detectedAt))}
                </td>
                <td data-label="Acción">
                  <Button
                    variant={isSelected ? 'primary' : 'secondary'}
                    aria-pressed={isSelected}
                    aria-controls="incident-detail-panel"
                    aria-label={`Ver detalle de ${rec.title} (${rec.municipality})`}
                    onClick={() => onSelectRecord(rec)}
                  >
                    Ver detalle
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
