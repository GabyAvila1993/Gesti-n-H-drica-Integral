import { Link } from 'react-router-dom';
import { ROUTES } from '../../app/routes';
import { Button } from '../../shared/ui/Button/Button';
import { RiskBadge } from '../../shared/ui/RiskBadge/RiskBadge';
import type { UnifiedIncidentRecord } from '../types';
import styles from './IncidentDetailCard.module.css';

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Mendoza',
});

interface IncidentDetailCardProps {
  record: UnifiedIncidentRecord;
  onClose: () => void;
}

export function IncidentDetailCard({ record, onClose }: IncidentDetailCardProps) {
  const [lng, lat] = record.location.coordinates;
  const moduleRoute = record.source === 'SATELLITE' ? ROUTES.satellite : ROUTES.urban;

  return (
    <div className={styles.detailCard}>
      <div className={styles.detailCardTop}>
        <div>
          <p className={styles.detailCardSource}>
            {record.source === 'SATELLITE' ? '🛰️ ' : '🏙️ '}
            {record.sourceLabel}
          </p>
          <p className={styles.detailCardTitle}>{record.title}</p>
          <p className={styles.detailCardMunicipality}>{record.municipality}, Mendoza</p>
        </div>
        <RiskBadge level={record.severity} />
      </div>

      <dl className={styles.detailCardGrid}>
        <div className={styles.detailCardBox}>
          <dt className={styles.detailCardLabel}>Indicador</dt>
          <dd className={styles.detailCardValue}>{record.metricLabel}</dd>
        </div>
        <div className={styles.detailCardBox}>
          <dt className={styles.detailCardLabel}>Fecha de detección</dt>
          <dd className={styles.detailCardValue}>
            {dateFormatter.format(new Date(record.detectedAt))}
          </dd>
        </div>
        <div className={styles.detailCardBox}>
          <dt className={styles.detailCardLabel}>Coordenadas WGS84</dt>
          <dd className={styles.detailCardValue}>
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </dd>
        </div>
        <div className={styles.detailCardBox}>
          <dt className={styles.detailCardLabel}>Código de registro</dt>
          <dd className={styles.detailCardValue}>{record.id}</dd>
        </div>
      </dl>

      <p className={styles.detailCardDescription}>{record.details}</p>

      <div className={styles.detailCardActions}>
        <Link to={moduleRoute}>
          <Button variant="primary">
            Ir al módulo {record.source === 'SATELLITE' ? 'Satelital' : 'de Acequias'}
          </Button>
        </Link>
        <Button variant="secondary" onClick={onClose}>
          Cerrar detalle
        </Button>
      </div>
    </div>
  );
}
