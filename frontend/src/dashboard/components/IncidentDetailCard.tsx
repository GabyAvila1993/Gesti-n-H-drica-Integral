import { useEffect, useRef, type KeyboardEvent } from 'react';
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
  focusTrigger?: number;
  onClose: () => void;
}

export function IncidentDetailCard({
  record,
  focusTrigger = 0,
  onClose,
}: IncidentDetailCardProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [lng, lat] = record.location.coordinates;
  const moduleRoute = record.source === 'SATELLITE' ? ROUTES.satellite : ROUTES.urban;

  useEffect(() => {
    if (focusTrigger > 0) {
      panelRef.current?.focus();
    }
  }, [focusTrigger, record.id]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  };

  return (
    <div
      id="incident-detail-panel"
      ref={panelRef}
      role="region"
      aria-live="polite"
      aria-label={`Detalle del incidente: ${record.title}`}
      tabIndex={-1}
      className={styles.detailCard}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.detailCardTop}>
        <div>
          <p className={styles.detailCardSource}>
            <span aria-hidden="true">{record.source === 'SATELLITE' ? '🛰️ ' : '🏙️ '}</span>
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
        <Button
          variant="secondary"
          aria-label="Cerrar panel de detalle (Escape)"
          onClick={onClose}
        >
          Cerrar detalle
        </Button>
      </div>
    </div>
  );
}
