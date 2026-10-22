import { useEffect, useState, type FormEvent } from 'react';
import { appConfig, type Municipality } from '../../app.config';
import type { Severity } from '../../shared/domain/risk-level';
import { Button } from '../../shared/ui/Button/Button';
import { Input } from '../../shared/ui/Input/Input';
import { RiskBadge } from '../../shared/ui/RiskBadge/RiskBadge';
import { Select, type SelectOption } from '../../shared/ui/Select/Select';
import { classNames } from '../../shared/ui/class-names';
import type { AlertRegistrationStatus } from '../hooks/useImageAnalysis';
import { CATEGORY_LABEL, type UrbanAnalysisResult } from '../types';
import styles from './RiskPanel.module.css';

const MUNICIPALITY_OPTIONS: readonly SelectOption[] = appConfig.municipalities.map((m) => ({
  value: m,
  label: m,
}));

const BAR_CLASS: Record<Severity, string> = {
  BAJO: styles.riskMeterBarLow,
  MEDIO: styles.riskMeterBarMedium,
  CRITICO: styles.riskMeterBarCritical,
};

interface RiskPanelProps {
  result: UrbanAnalysisResult;
  defaultMunicipality?: Municipality;
  defaultAddress?: string;
  activeDetectionId: string | null;
  onHoverDetection: (id: string | null) => void;
  registration: AlertRegistrationStatus;
  onRegisterAlert: (input: { municipality: Municipality; address: string; notes?: string }) => void;
  onNewAnalysis: () => void;
}

export function RiskPanel({
  result,
  defaultMunicipality = 'Capital',
  defaultAddress = '',
  activeDetectionId,
  onHoverDetection,
  registration,
  onRegisterAlert,
  onNewAnalysis,
}: RiskPanelProps) {
  const [municipality, setMunicipality] = useState<Municipality>(defaultMunicipality);
  const [address, setAddress] = useState<string>(defaultAddress);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    setMunicipality(defaultMunicipality);
    setAddress(defaultAddress || 'Av. San Martín y Las Heras');
    setNotes('');
  }, [result.analysisId, defaultMunicipality, defaultAddress]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!address.trim()) return;
    onRegisterAlert({ municipality, address, notes });
  };

  const canRegister =
    registration.kind !== 'saving' &&
    registration.kind !== 'saved' &&
    address.trim().length >= 4;

  return (
    <div className={styles.riskPanel}>
      <div className={styles.riskMeter}>
        <div className={styles.riskMeterHeader}>
          <div>
            <p className={styles.riskMeterTitle}>Obstrucción estimada del cauce</p>
            <p className={styles.riskMeterValue}>{result.obstructionPercentage}%</p>
          </div>
          <RiskBadge level={result.riskLevel} />
        </div>

        <progress
          className={classNames(styles.riskMeterBar, BAR_CLASS[result.riskLevel])}
          value={result.obstructionPercentage}
          max={100}
          aria-label={`Obstrucción del cauce: ${result.obstructionPercentage}%`}
        />

        <div className={styles.riskMeterScale}>
          <span>0% · Libre</span>
          <span>25% · Medio</span>
          <span>60%+ · Crítico</span>
        </div>
      </div>

      <p className={styles.riskPanelRecommendation}>{result.summary.recommendation}</p>

      <div className={styles.countsGrid}>
        <div className={styles.countBox}>
          <p className={styles.countBoxNum}>{result.summary.plasticCount}</p>
          <p className={styles.countBoxLabel}>Plásticos</p>
        </div>
        <div className={styles.countBox}>
          <p className={styles.countBoxNum}>{result.summary.branchCount}</p>
          <p className={styles.countBoxLabel}>Ramas / poda</p>
        </div>
        <div className={styles.countBox}>
          <p className={styles.countBoxNum}>{result.summary.debrisCount}</p>
          <p className={styles.countBoxLabel}>Escombros</p>
        </div>
      </div>

      <ul className={styles.detectionsList} aria-label="Objetos detectados en la imagen">
        {result.detections.map((det) => (
          <li
            key={det.id}
            className={classNames(
              styles.detectionsListItem,
              activeDetectionId === det.id && styles.detectionsListItemActive,
            )}
            onMouseEnter={() => onHoverDetection(det.id)}
            onMouseLeave={() => onHoverDetection(null)}
          >
            <span>
              <span className={styles.detectionsListTag}>{CATEGORY_LABEL[det.category]}:</span>{' '}
              {det.label}
            </span>
            <span className={styles.detectionsListConf}>{det.confidence}%</span>
          </li>
        ))}
      </ul>

      <form className={styles.alertForm} onSubmit={handleSubmit}>
        <p className={styles.alertFormTitle}>Registrar alerta de acequia</p>

        <Select
          label="Municipio"
          options={MUNICIPALITY_OPTIONS}
          value={municipality}
          onChange={(e) => setMunicipality(e.target.value as Municipality)}
          disabled={registration.kind === 'saving' || registration.kind === 'saved'}
        />

        <Input
          label="Dirección o intersección de la acequia"
          placeholder="Ej: Av. Emilio Civit y Belgrano"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          minLength={4}
          disabled={registration.kind === 'saving' || registration.kind === 'saved'}
        />

        <Input
          label="Observaciones para cuadrilla (opcional)"
          placeholder="Ej: Puente vehicular obstruido por ramas"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={registration.kind === 'saving' || registration.kind === 'saved'}
        />

        {registration.kind === 'saved' && (
          <p
            className={classNames(styles.alertFormFeedback, styles.alertFormFeedbackSuccess)}
            role="status"
          >
            ✔ Alerta #{registration.alert.id} registrada en {registration.alert.municipality}.
          </p>
        )}

        {registration.kind === 'error' && (
          <p
            className={classNames(styles.alertFormFeedback, styles.alertFormFeedbackError)}
            role="alert"
          >
            {registration.message}
          </p>
        )}

        <div className={styles.alertFormActions}>
          <Button type="submit" disabled={!canRegister}>
            {registration.kind === 'saving'
              ? 'Registrando…'
              : registration.kind === 'saved'
                ? 'Alerta registrada ✔'
                : 'Registrar alerta'}
          </Button>
          <Button variant="secondary" onClick={onNewAnalysis}>
            Analizar otra foto
          </Button>
        </div>
      </form>
    </div>
  );
}
