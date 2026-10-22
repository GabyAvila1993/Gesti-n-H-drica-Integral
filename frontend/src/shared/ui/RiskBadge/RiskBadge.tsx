import { classNames } from '../class-names';
import { RISK_LABEL, type RiskLevel } from '../../domain/risk-level';
import styles from './RiskBadge.module.css';

const LEVEL_CLASS: Record<RiskLevel, string> = {
  NORMAL: styles.riskBadgeNormal,
  BAJO: styles.riskBadgeLow,
  MEDIO: styles.riskBadgeMedium,
  CRITICO: styles.riskBadgeCritical,
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <span className={classNames(styles.riskBadge, LEVEL_CLASS[level])}>{RISK_LABEL[level]}</span>;
}
